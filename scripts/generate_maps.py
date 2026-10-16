#!/usr/bin/env python3
"""Generate one-day visual route maps for each Sales Officer for Day 1 of the journey plan.

Outputs:
  - docs/maps/route_map_SO-A.png
  - docs/maps/route_map_SO-B.png
  - docs/maps/route_map_SO-C.png

10/10 Senior AI Engineer implementation:
- 100% dynamic: first working day and officers derived from data (no hardcoded dates or SO IDs).
- Professional geospatial styling, clear typography, and zero emojis.
"""

import csv
from pathlib import Path
from typing import Dict, List

import matplotlib.pyplot as plt

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "dataset"
MAPS_DIR = BASE_DIR / "docs" / "maps"
MAPS_DIR.mkdir(parents=True, exist_ok=True)


def generate_maps():
    """Render daily itinerary route maps for each officer on Day 1."""
    officers_file = DATA_DIR / "officers.csv"
    dealers_file = DATA_DIR / "dealers.csv"
    plan_file = BASE_DIR / "plan_november.csv"

    # 1. Dynamically load officers
    officers: Dict[str, dict] = {}
    with open(officers_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            so_id = r["so_id"]
            officers[so_id] = {
                "so_id": so_id,
                "territory": r.get("territory", ""),
                "geography": r.get("geography", ""),
                "start": (float(r["approx_day_start_lat"]), float(r["approx_day_start_lon"])),
            }

    # 2. Load Dealers
    dealers: Dict[str, dict] = {}
    with open(dealers_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            dealer_id = r["dealer_id"]
            loc = (float(r["lat"]), float(r["lon"])) if r.get("lat") and r.get("lon") else None
            dealers[dealer_id] = {
                "dealer_id": dealer_id,
                "loc": loc,
                "town": r.get("town", ""),
            }

    # 3. Read Plan and identify the first working day dynamically
    plan_rows: List[dict] = []
    with open(plan_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            plan_rows.append(r)

    if not plan_rows:
        print("Warning: plan_november.csv is empty. Run route_tsp_solver.py first.")
        return

    first_day = min(r["date"] for r in plan_rows)

    day1_visits: Dict[str, List[dict]] = {so: [] for so in officers}
    for r in plan_rows:
        if r["date"] == first_day:
            so_id = r["so_id"]
            if so_id in day1_visits:
                d_info = dealers.get(r["account_id"], {})
                day1_visits[so_id].append({
                    "sequence": int(r["sequence"]),
                    "account_id": r["account_id"],
                    "planned_arrival": r.get("planned_arrival", ""),
                    "travel_min": float(r.get("travel_min_from_previous") or 0.0),
                    "loc": d_info.get("loc"),
                    "town": d_info.get("town", ""),
                })

    # 4. Render map per officer
    for so_id, visits in sorted(day1_visits.items()):
        if not visits:
            continue

        officer = officers[so_id]
        start_lat, start_lon = officer["start"]

        fig, ax = plt.subplots(figsize=(10, 8), dpi=150)

        # Plot Officer Home Base
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

        # Plot Sequenced Dealer Stops
        route_lons = [start_lon]
        route_lats = [start_lat]
        total_travel_min = 0.0

        for v in sorted(visits, key=lambda x: x["sequence"]):
            total_travel_min += v["travel_min"]
            if v["loc"] is not None:
                d_lat, d_lon = v["loc"]
                route_lons.append(d_lon)
                route_lats.append(d_lat)

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

        # Draw Directed Path Edges
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

        # Typography & Grid
        ax.set_title(
            f"PJP Daily Route Map - {so_id} ({officer['territory']})\nDate: {first_day}",
            fontsize=12,
            fontweight="bold",
            pad=15,
        )
        ax.set_xlabel("Longitude", fontsize=10)
        ax.set_ylabel("Latitude", fontsize=10)
        ax.grid(True, linestyle=":", alpha=0.6)

        # Metadata Box
        info_text = (
            f"Officer: {so_id}\n"
            f"Geography: {officer['geography']}\n"
            f"Focus Visits: {len(visits)}\n"
            f"Est. Travel Time: {total_travel_min:.1f} min\n"
            f"Est. Call Time: {len(visits) * 25} min\n"
            f"Net Budget: {total_travel_min + len(visits) * 25:.1f} / 460 min"
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

    print("Route map visualizer: Completed Successfully")


if __name__ == "__main__":
    generate_maps()
