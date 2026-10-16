#!/usr/bin/env python3
"""Stage 1: Multi-Criteria Focus Ranking and Stage 2: Beat Scheduling.

Generates:
  - dataset/ranked_dealers.csv
  - dataset/initial_schedule_unsequenced.csv
"""

import csv
import datetime as DT
import math
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[4]
DATA_DIR = BASE_DIR / "dataset"

OFFICER_START_COORDS = {
    "SO-A": (12.93957, 77.49507),
    "SO-B": (12.95276, 77.54104),
    "SO-C": (15.46480, 74.99564),
}


def haversine_distance(coord1, coord2):
    """Compute haversine distance in kilometers between two coordinates."""
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2.0 * math.asin(math.sqrt(h))


def rank_and_schedule():
    features_file = DATA_DIR / "dealer_features.csv"
    calendar_file = DATA_DIR / "Planning_Calendar.csv"

    # 1. Load working days from Planning_Calendar.csv
    workdays = []
    with open(calendar_file, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["working_day"].strip().lower() == "yes":
                workdays.append(DT.date.fromisoformat(row["date"].strip()))

    assert len(workdays) == 25, f"Expected 25 working days, got {len(workdays)}"

    # 2. Load dealer features
    dealers_by_officer = defaultdict(list)
    with open(features_file, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            dealer = {
                "dealer_id": row["dealer_id"],
                "so_id": row["so_id"],
                "club": int(row["club"]) == 1,
                "has_gps": int(row["has_gps"]) == 1,
                "lat": float(row["lat"]) if row["lat"] else None,
                "lon": float(row["lon"]) if row["lon"] else None,
                "rate": float(row["sales_rate_daily"]),
                "headroom": float(row["headroom_inr"]),
                "degrowth_mom": float(row["degrowth_mom_inr"]),
                "degrowth_qoq": float(row["degrowth_qoq_inr"]),
                "is_active": int(row["is_active_for_events"]) == 1,
            }
            dealers_by_officer[row["so_id"]].append(dealer)

    # 3. Stage 1: Multi-criteria ranking per officer
    ranked_records = []
    focus_selection = {}

    for so_id, dealer_list in dealers_by_officer.items():
        max_degrowth = max((d["degrowth_mom"] + d["degrowth_qoq"] for d in dealer_list), default=1.0) or 1.0
        max_headroom = max((d["headroom"] for d in dealer_list), default=1.0) or 1.0
        max_rate = max((d["rate"] for d in dealer_list), default=1.0) or 1.0

        for dealer in dealer_list:
            degrowth_norm = (dealer["degrowth_mom"] + dealer["degrowth_qoq"]) / max_degrowth
            headroom_norm = dealer["headroom"] / max_headroom
            rate_norm = dealer["rate"] / max_rate
            club_bonus = 1.0 if dealer["club"] else 0.0

            # Composite ranking formula
            composite_score = (
                0.35 * degrowth_norm
                + 0.25 * headroom_norm
                + 0.20 * rate_norm
                + 0.20 * club_bonus
            )
            dealer["rank_score"] = round(composite_score, 6)
            ranked_records.append(dealer)

        dealer_list.sort(key=lambda item: item["rank_score"], reverse=True)

        club_dealers = [d for d in dealer_list if d["club"]]
        non_club_dealers = [d for d in dealer_list if not d["club"]]

        # Territory-specific slot allocations
        # Metro officers (SO-A, SO-B) utilize full 150 slots (6 visits/day)
        # Upcountry officer (SO-C) budgets realistic days (5 visits on distant beats)
        if so_id == "SO-C":
            # Target ~135 total visits across 25 days to prevent road exhaustion
            target_visits = 135
            non_club_slots = target_visits - (len(club_dealers) * 2)
        else:
            target_visits = 150
            non_club_slots = target_visits - (len(club_dealers) * 2)

        # Allocate located dealers first, then unlocated dealers for local beats
        located_pool = [d for d in non_club_dealers if d["has_gps"]]
        unlocated_pool = [d for d in non_club_dealers if not d["has_gps"]]

        selected_located = located_pool[:non_club_slots]
        remaining_slots = non_club_slots - len(selected_located)
        selected_unlocated = unlocated_pool[:remaining_slots]

        focus_selection[so_id] = {
            "club": club_dealers,
            "located": selected_located,
            "unlocated": selected_unlocated,
        }

    # Save ranked dealers audit log
    with open(DATA_DIR / "ranked_dealers.csv", mode="w", newline="", encoding="utf-8") as f:
        fieldnames = ["dealer_id", "so_id", "club", "has_gps", "rate", "headroom", "degrowth_mom", "rank_score"]
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(sorted(ranked_records, key=lambda d: (d["so_id"], -d["rank_score"])))

    # 4. Stage 2: Beat scheduling across 25 working days
    schedule_rows = []

    for so_id in sorted(focus_selection.keys()):
        selection = focus_selection[so_id]
        clubs = selection["club"]
        located = list(selection["located"])
        unlocated = list(selection["unlocated"])
        start_coord = OFFICER_START_COORDS[so_id]

        daily_buckets = [[] for _ in range(25)]

        # A. Schedule loyalty club dealers (2 visits separated by at least 10 working days)
        for i, club_dealer in enumerate(clubs):
            slot_one = i % 10
            slot_two = slot_one + 12
            if slot_two >= 25:
                slot_two = 24 - (i % 3)
            daily_buckets[slot_one].append(club_dealer["dealer_id"])
            daily_buckets[slot_two].append(club_dealer["dealer_id"])

        # B. Cluster located dealers into compact daily beats
        located.sort(key=lambda d: haversine_distance((d["lat"], d["lon"]), start_coord))

        for day_idx in range(25):
            # Target day cap: 6 visits for metro, 5-6 visits for upcountry
            max_day_cap = 5 if (so_id == "SO-C" and day_idx >= 15) else 6
            available_slots = max_day_cap - len(daily_buckets[day_idx])

            if available_slots <= 0 or not located:
                continue

            # Pick anchor dealer
            anchor = located.pop(0)
            daily_buckets[day_idx].append(anchor["dealer_id"])
            anchor_loc = (anchor["lat"], anchor["lon"])

            # Find geographically closest dealers to anchor
            take_count = min(available_slots - 1, len(located))
            if take_count > 0:
                located.sort(key=lambda d: haversine_distance((d["lat"], d["lon"]), anchor_loc))
                for _ in range(take_count):
                    daily_buckets[day_idx].append(located.pop(0)["dealer_id"])

        # C. Distribute unlocated dealers to local beats (under 50 km from home base)
        for unloc_dealer in unlocated:
            placed = False
            for day_idx in range(25):
                if len(daily_buckets[day_idx]) < 6:
                    daily_buckets[day_idx].append(unloc_dealer["dealer_id"])
                    placed = True
                    break

        # Output unsequenced visits
        for day_idx, workday in enumerate(workdays):
            dealers_for_day = daily_buckets[day_idx]
            for seq_num, dealer_id in enumerate(dealers_for_day, start=1):
                schedule_rows.append({
                    "date": workday.isoformat(),
                    "so_id": so_id,
                    "sequence": seq_num,
                    "account_id": dealer_id,
                    "account_type": "Dealer",
                })

    with open(DATA_DIR / "initial_schedule_unsequenced.csv", mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "so_id", "sequence", "account_id", "account_type"])
        writer.writeheader()
        writer.writerows(schedule_rows)

    print("-" * 65)
    print("Stage 1 and 2: Ranking and Beat Scheduling Complete")
    print("-" * 65)
    for so_id in sorted(focus_selection.keys()):
        n_club = len(focus_selection[so_id]["club"])
        n_loc = len(focus_selection[so_id]["located"])
        n_unloc = len(focus_selection[so_id]["unlocated"])
        total_visits = (n_club * 2) + n_loc + n_unloc
        print(f"Officer {so_id}: {n_club} Club (2x) + {n_loc + n_unloc} Non-Club Focus = {total_visits} Visits")
    print(f"Total Scheduled Visits: {len(schedule_rows)}")
    print("-" * 65)


if __name__ == "__main__":
    rank_and_schedule()
