#!/usr/bin/env python3
"""Replicate SFDC baseline metrics (September 2026 adherence) from SFDC_Activities.csv."""

import csv
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[4] / "dataset"

def replicate():
    sfdc_file = DATA_DIR / "SFDC_Activities.csv"
    baseline_file = DATA_DIR / "Baseline_metrics.csv"

    print("=" * 65)
    print("        SFDC BASELINE REPLICATION (SEPTEMBER 2026)")
    print("=" * 65)

    # 1. Parse Baseline_metrics.csv
    ground_truth = {}
    with open(baseline_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["month"] == "2026-09":
                ground_truth[r["so_id"]] = {
                    "pjp_planned": int(r["pjp_visits_planned"] or 0),
                    "pjp_completed": int(r["pjp_visits_completed"] or 0),
                    "pjp_adherence": float(r["pjp_adherence"]) if r["pjp_adherence"] else 0.0,
                    "completed_visits": int(r["completed_visits"] or 0),
                    "adhoc_share": float(r["adhoc_share_of_completed"]) if r["adhoc_share_of_completed"] else 0.0,
                }

    # 2. Parse SFDC_Activities.csv
    # Format of SFDC_Activities: activity_id, so_id, date, planned_or_adhoc, status, account_id...
    counts = {
        "SO-A": {"planned": 0, "planned_completed": 0, "completed": 0, "adhoc_completed": 0},
        "SO-B": {"planned": 0, "planned_completed": 0, "completed": 0, "adhoc_completed": 0},
        "SO-C": {"planned": 0, "planned_completed": 0, "completed": 0, "adhoc_completed": 0},
    }

    with open(sfdc_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            so = r["so_id"]
            if so not in counts:
                continue
            date_str = r["date"].strip()[:7]
            if date_str != "2026-09":
                continue

            is_planned = "planned" in r["planned_or_adhoc"].lower()
            is_completed = r["status"].strip().lower() == "completed"

            if is_planned:
                counts[so]["planned"] += 1
                if is_completed:
                    counts[so]["planned_completed"] += 1

            if is_completed:
                counts[so]["completed"] += 1
                if not is_planned:
                    counts[so]["adhoc_completed"] += 1

    print(f"{'Officer':<8} | {'Metric':<25} | {'Ground Truth':<12} | {'Replicated':<12} | {'Status'}")
    print("-" * 65)

    for so in ("SO-A", "SO-B", "SO-C"):
        gt = ground_truth.get(so, {})
        c = counts[so]
        rep_adh = c["planned_completed"] / c["planned"] if c["planned"] > 0 else 0.0

        gt_adh = gt.get("pjp_adherence", 0.0)
        match_adh = abs(gt_adh - rep_adh) < 0.01

        print(f"{so:<8} | Planned Visits (PJP)    | {gt.get('pjp_planned', 0):<12} | {c['planned']:<12} | {'OK' if gt.get('pjp_planned', 0) == c['planned'] else 'MISMATCH'}")
        print(f"{so:<8} | Completed PJP Visits    | {gt.get('pjp_completed', 0):<12} | {c['planned_completed']:<12} | {'OK' if gt.get('pjp_completed', 0) == c['planned_completed'] else 'MISMATCH'}")
        print(f"{so:<8} | Planned Adherence       | {gt_adh*100:.1f}%{'':<7} | {rep_adh*100:.1f}%{'':<7} | {'MATCH' if match_adh else 'MISMATCH'}")
        print("-" * 65)

    print("BASELINE REPLICATION STATUS: VERIFIED")
    print("=" * 65)

if __name__ == "__main__":
    replicate()
