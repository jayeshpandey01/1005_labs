#!/usr/bin/env python3
"""Generate one-day visual route maps for each Sales Officer for November 2, 2026.

Outputs:
  - docs/maps/route_map_SO-A.png
  - docs/maps/route_map_SO-B.png
  - docs/maps/route_map_SO-C.png
"""

import csv
import matplotlib.pyplot as plt
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "dataset"
MAPS_DIR = BASE_DIR / "docs" / "maps"
MAPS_DIR.mkdir(parents=True, exist_ok=True)

def generate_maps():
    officers_file = DATA_DIR / "officers.csv"
    dealers_file = DATA_DIR / "dealers.csv"
    plan_file = BASE_DIR / "plan_november.csv"

    # 1. Load Officers
    officers = {}
    with open(officers_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            officers[r["so_id"]] = {
                "territory": r["territory"],
                "geography": r["geography"],
                "start": (float(r["approx_day_start_lat"]), float(r["approx_day_start_lon"])),
            }

    # 2. Load Dealers
    dealers = {}
    with open(dealers_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            loc = (float(r["lat"]), float(r["lon"])) if r["lat"] and r["lon"] else None
            dealers[r["dealer_id"]] = {
                "dealer_id": r["dealer_id"],
                "loc": loc,
                "town": r.get("town", ""),
            }

    # 3. Load Plan for 2026-11-02 (Day 1)
    day1_visits = {so: [] for so in officers}
    with open(plan_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["date"] == "2026-11-02":
                so = r["so_id"]
                if so in day1_visits:
                    d_info = dealers.get(r["account_id"], {})
                    day1_visits[so].append({
                        "sequence": int(r["sequence"]),
                        "account_id": r["account_id"],
                        "planned_arrival": r.get("planned_arrival", ""),
                        "travel_min": float(r.get("travel_min_from_previous") or 0),
                        "loc": d_info.get("loc"),
                        "town": d_info.get("town", ""),
                    })

    # 4. Plot each SO map
    for so_id, visits in day1_visits.items():
        if not visits:
            continue

        officer = officers[so_id]
        start_lat, start_lon = officer["start"]

        fig, ax = plt.subplots(figsize=(10, 8), dpi=150)

        # Plot Start Point
        ax.scatter(start_lon, start_lat, color="#1E3A8A", s=180, marker="s", zorder=5, label="Home Base (09:30 AM)")
        ax.annotate(
            "Start: Base\n(09:30 AM)",
            (start_lon, start_lat),
            textcoords="offset points",
            xytext=(10, 10),
            fontsize=9,
            fontweight="bold",
            color="#1E3A8A",
            bbox=dict(boxstyle="round,pad=0.3", edgecolor="#1E3A8A", facecolor="#EFF6FF", alpha=0.9),
        )

        # Connect Route Points
        route_lons = [start_lon]
        route_lats = [start_lat]

        total_travel_min = 0.0

        for v in sorted(visits, key=lambda x: x["sequence"]):
            total_travel_min += v["travel_min"]
            if v["loc"] is not None:
                d_lat, d_lon = v["loc"]
                route_lons.append(d_lon)
                route_lats.append(d_lat)

                # Plot Dealer Stop
                ax.scatter(d_lon, d_lat, color="#059669", s=140, marker="o", zorder=4)
                label_text = f"Stop {v['sequence']}: {v['account_id']}\nArr: {v['planned_arrival']} (+{v['travel_min']}m)"
                ax.annotate(
                    label_text,
                    (d_lon, d_lat),
                    textcoords="offset points",
                    xytext=(10, -10 if v["sequence"] % 2 == 0 else 10),
                    fontsize=8,
                    bbox=dict(boxstyle="round,pad=0.2", edgecolor="#059669", facecolor="#ECFDF5", alpha=0.9),
                )
            else:
                # Unlocated Dealer
                pass

        # Draw Directed Path
        for i in range(len(route_lons) - 1):
            ax.annotate(
                "",
                xy=(route_lons[i + 1], route_lats[i + 1]),
                xytext=(route_lons[i], route_lats[i]),
                arrowprops=dict(
                    arrowstyle="-|>",
                    color="#4B5563",
                    lw=2,
                    ls="--",
                    mutation_scale=15,
                ),
                zorder=3,
            )

        # Style Plot
        ax.set_title(
            f"PJP Daily Route Map - {so_id} ({officer['territory']})\nDate: Monday, 2 November 2026",
            fontsize=12,
            fontweight="bold",
            pad=15,
        )
        ax.set_xlabel("Longitude", fontsize=10)
        ax.set_ylabel("Latitude", fontsize=10)
        ax.grid(True, linestyle=":", alpha=0.6)

        # Info Box
        info_text = (
            f"Officer: {so_id}\n"
            f"Geography: {officer['geography']}\n"
            f"Focus Stops: {len(visits)}\n"
            f"Est. Travel: {total_travel_min:.1f} min\n"
            f"Call Time: {len(visits) * 25} min\n"
            f"Total Day: {total_travel_min + len(visits) * 25:.1f} / 460 min"
        )
        ax.text(
            0.02,
            0.02,
            info_text,
            transform=ax.transAxes,
            fontsize=9,
            verticalalignment="bottom",
            bbox=dict(boxstyle="round,pad=0.5", edgecolor="#9CA3AF", facecolor="#F9FAFB", alpha=0.95),
        )

        ax.legend(loc="upper right", fontsize=9)
        plt.tight_layout()

        out_path = MAPS_DIR / f"route_map_{so_id}.png"
        plt.savefig(out_path)
        plt.close()
        print(f"Generated route map: {out_path}")

    print("Route map generation complete.")

if __name__ == "__main__":
    generate_maps()
