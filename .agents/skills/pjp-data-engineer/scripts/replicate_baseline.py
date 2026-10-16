#!/usr/bin/env python3
"""Replicate SFDC baseline metrics from SFDC_Activities.csv.

Compares against Baseline_metrics.csv dynamically across all officers.
No hardcoded officer names or static counts.
"""

import csv
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

DATA_DIR = Path(__file__).resolve().parents[4] / "dataset"


def replicate_baseline(target_month: str = "2026-09") -> bool:
    """Validate SFDC visit log aggregation against baseline metrics."""
    sfdc_file = DATA_DIR / "SFDC_Activities.csv"
    baseline_file = DATA_DIR / "Baseline_metrics.csv"
    officers_file = DATA_DIR / "officers.csv"

    # 1. Dynamically discover registered officers
    officer_ids: List[str] = []
    if officers_file.exists():
        with open(officers_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                officer_ids.append(r["so_id"])

    # 2. Parse ground truth from Baseline_metrics.csv
    ground_truth: Dict[str, dict] = {}
    with open(baseline_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["month"] == target_month:
                so_id = r["so_id"]
                ground_truth[so_id] = {
                    "pjp_planned": int(r["pjp_visits_planned"] or 0),
                    "pjp_completed": int(r["pjp_visits_completed"] or 0),
                    "pjp_adherence": float(r["pjp_adherence"]) if r["pjp_adherence"] else 0.0,
                    "completed_visits": int(r["completed_visits"] or 0),
                    "adhoc_share": float(r["adhoc_share_of_completed"]) if r["adhoc_share_of_completed"] else 0.0,
                }
                if so_id not in officer_ids:
                    officer_ids.append(so_id)

    # 3. Aggregate SFDC activities dynamically
    counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {
        "planned": 0,
        "planned_completed": 0,
        "completed": 0,
        "adhoc_completed": 0,
    })

    with open(sfdc_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            so_id = r["so_id"]
            date_prefix = r["date"].strip()[:7]
            if date_prefix != target_month:
                continue

            is_planned = "planned" in r.get("planned_or_adhoc", "").lower()
            is_completed = r.get("status", "").strip().lower() == "completed"

            if is_planned:
                counts[so_id]["planned"] += 1
                if is_completed:
                    counts[so_id]["planned_completed"] += 1

            if is_completed:
                counts[so_id]["completed"] += 1
                if not is_planned:
                    counts[so_id]["adhoc_completed"] += 1

    # Print verification table
    print("-" * 65)
    print(f"SFDC Baseline Adherence Replication ({target_month})")
    print("-" * 65)
    print(f"{'Officer':<8} | {'Metric':<25} | {'Ground Truth':<12} | {'Replicated':<12} | {'Status'}")
    print("-" * 65)

    all_matched = True
    for so_id in sorted(officer_ids):
        gt = ground_truth.get(so_id, {})
        c = counts[so_id]
        replicated_adherence = (
            c["planned_completed"] / c["planned"] if c["planned"] > 0 else 0.0
        )
        gt_adherence = gt.get("pjp_adherence", 0.0)

        match_planned = gt.get("pjp_planned", 0) == c["planned"]
        match_completed = gt.get("pjp_completed", 0) == c["planned_completed"]
        match_adherence = abs(gt_adherence - replicated_adherence) < 0.005

        if not (match_planned and match_completed and match_adherence):
            all_matched = False

        status_str = "MATCH" if (match_planned and match_completed and match_adherence) else "MISMATCH"
        print(f"{so_id:<8} | Planned Visits (PJP)    | {gt.get('pjp_planned', 0):<12} | {c['planned']:<12} | {'OK' if match_planned else 'FAIL'}")
        print(f"{so_id:<8} | Completed PJP Visits    | {gt.get('pjp_completed', 0):<12} | {c['planned_completed']:<12} | {'OK' if match_completed else 'FAIL'}")
        print(f"{so_id:<8} | Planned Adherence       | {gt_adherence * 100:.1f}%{'':<7} | {replicated_adherence * 100:.1f}%{'':<7} | {status_str}")
        print("-" * 65)

    print(f"Baseline Replication Status: {'VERIFIED' if all_matched else 'FAILED'}")
    print("-" * 65)

    return all_matched


if __name__ == "__main__":
    replicate_baseline()
