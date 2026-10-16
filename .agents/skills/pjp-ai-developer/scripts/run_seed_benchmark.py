#!/usr/bin/env python3
"""Run PJP simulation across practice seeds 1, 2, and 3 with dynamic re-planner.

Evaluates:
  - Simulated Adherence (30%)
  - Focus-Dealer Coverage (25%)
  - Drop Response (20%)
  - Club Cadence (10%)
  - Hike Handling (5%)
  - Guardrails & Reliability (10%)
"""

import json
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[4]

def run_benchmark():
    workbook = BASE_DIR / "PJP_Assignment_Sample_Data.xlsx"
    plan = BASE_DIR / "plan_november.csv"
    results_dir = BASE_DIR / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    seeds = [1, 2, 3]
    summaries = []

    print("=" * 70)
    print("         PJP NOVEMBER SIMULATOR: BENCHMARK ACROSS SEEDS 1-3")
    print("=" * 70)

    for seed in seeds:
        out_dir = results_dir / f"seed_{seed}"
        out_dir.mkdir(parents=True, exist_ok=True)

        cmd = [
            "py", "-3.11", "simulate.py",
            "--workbook", str(workbook),
            "--plan", str(plan),
            "--replan-cmd", "py -3.11 -m mypjp.replan",
            "--seed", str(seed),
            "--out", str(out_dir)
        ]

        print(f"\n>>> Running Seed {seed} ...")
        res = subprocess.run(cmd, cwd=str(BASE_DIR), capture_output=True, text=True)
        if res.returncode != 0:
            print(f"Error running seed {seed}: {res.stderr}")
            continue

        sum_path = out_dir / "summary.json"
        if sum_path.exists():
            with open(sum_path) as f:
                s = json.load(f)
                summaries.append(s)

    # Print Comparison Table
    print("\n" + "=" * 70)
    print(f"{'Metric':<32} | {'Seed 1':<10} | {'Seed 2':<10} | {'Seed 3':<10}")
    print("-" * 70)

    def val(key, pct=False):
        row = []
        for s in summaries:
            v = s.get(key)
            if v is None:
                row.append("N/A")
            elif pct:
                row.append(f"{v*100:.1f}%")
            else:
                row.append(str(v))
        return row

    metrics = [
        ("Simulated Adherence", "simulated_adherence", True),
        ("Initial Plan Adherence", "initial_plan_adherence", True),
        ("Focus Coverage", "focus_coverage", True),
        ("Club Cadence Met", "club_cadence_met", True),
        ("Drop Response Rate", "drop_response_rate", True),
        ("Visits Cancelled during Hikes", "visits_cancelled_during_hikes", False),
        ("Re-plan Failures", "replan_failures", False),
        ("Guardrail Breaches", "guardrail_breaches", False),
        ("Simulated Points", "simulated_points_november", False),
    ]

    for label, k, is_p in metrics:
        vals = val(k, is_p)
        while len(vals) < 3:
            vals.append("N/A")
        print(f"{label:<32} | {vals[0]:<10} | {vals[1]:<10} | {vals[2]:<10}")

    print("=" * 70)
    print("BENCHMARK STATUS: COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    run_benchmark()
