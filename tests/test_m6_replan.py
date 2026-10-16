#!/usr/bin/env python3
"""Milestone M6 Unit Tests: Dynamic Re-planner CLI Contract & Guardrail Verification.

Verifies:
1. CLI invocation contract (--state, --plan, --out) executes without errors.
2. Hard Guardrail 1: <= 6 dealer visits per day per officer.
3. Hard Guardrail 2: <= 2 completed + future visits per dealer across the month.
4. Hard Guardrail 3: Zero cross-SO dealer assignments.
5. Weather Adaptation: Disrupted days capped at <= 5 visits.
6. Club Protection: Loyalty club accounts are never dropped or deferred during weather throttling.
7. Execution Latency: Completes in < 1.0 second (well under the 120s timeout limit).
"""

import csv
import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
REPLAN_MODULE = "mypjp.replan"
PLAN_FILE = BASE_DIR / "plan_november.csv"
DATA_DIR = BASE_DIR / "dataset"
DEALERS_FILE = DATA_DIR / "dealers.csv"


class TestMilestoneM6DynamicReplan(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        self = cls
        self.dealers = {}
        with open(DEALERS_FILE, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                self.dealers[r["dealer_id"]] = {
                    "so_id": r["so_id"].strip(),
                    "club": r.get("loyalty_club_member", "").strip().lower() == "yes",
                }

    def test_replan_cli_execution_contract(self):
        """Verify CLI contract: py -3.11 -m mypjp.replan --state ... --plan ... --out ..."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            state_file = tmp / "state.json"
            plan_file = tmp / "plan.csv"
            out_file = tmp / "out.csv"

            # Create mock state
            state_data = {
                "today": "2026-11-02",
                "next_working_day": "2026-11-03",
                "weather_today": {"SO-A": "clear", "SO-B": "clear", "SO-C": "clear"},
                "weather_forecast_next_working_day": {"SO-A": "rain", "SO-B": "clear", "SO-C": "traffic"},
                "visits_today": [
                    {"so_id": "SO-A", "sequence": 1, "account_id": "A-D056", "status": "completed"}
                ],
                "sales_today": [
                    {"dealer_id": "A-D019", "sheets": 120, "points": 960.0},
                    {"dealer_id": "A-D004", "sheets": 0, "points": 0.0},
                ],
                "completed_visits_month_to_date": [
                    {"date": "2026-11-02", "account_id": "A-D056"}
                ],
                "rules": {
                    "dealer_visits_per_day": 6,
                    "disrupted_visits_per_day": 5,
                    "max_visits_per_dealer_month": 2,
                    "club_min_gap_days": 10,
                },
            }
            state_file.write_text(json.dumps(state_data), encoding="utf-8")

            # Extract forward plan from plan_november.csv
            forward_rows = []
            with open(PLAN_FILE, mode="r", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    if r["date"] > "2026-11-02":
                        forward_rows.append(r)

            with open(plan_file, mode="w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=["date", "so_id", "sequence", "account_id", "account_type"])
                w.writeheader()
                for r in forward_rows:
                    w.writerow({
                        "date": r["date"],
                        "so_id": r["so_id"],
                        "sequence": r["sequence"],
                        "account_id": r["account_id"],
                        "account_type": "Dealer",
                    })

            # Run CLI command
            t0 = time.time()
            cmd = [
                sys.executable,
                "-m",
                REPLAN_MODULE,
                "--state",
                str(state_file),
                "--plan",
                str(plan_file),
                "--out",
                str(out_file),
            ]
            res = subprocess.run(cmd, cwd=str(BASE_DIR), capture_output=True, text=True)
            elapsed = time.time() - t0

            # 1. Zero exit code
            self.assertEqual(res.returncode, 0, f"Re-plan CLI failed with exit code {res.returncode}: {res.stderr}")

            # 2. Latency check: < 1.0 second
            self.assertLess(elapsed, 1.0, f"Execution latency too high: {elapsed:.2f}s (must be < 1.0s)")

            # 3. Output file exists and is non-empty
            self.assertTrue(out_file.exists(), "NEXT_PLAN.csv was not created")
            self.assertGreater(out_file.stat().st_size, 0, "NEXT_PLAN.csv is 0 bytes")

            # Parse returned plan
            returned_rows = []
            with open(out_file, mode="r", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    returned_rows.append(r)

            # 4. Guardrail 1: Max 6 visits per day
            day_counts = {}
            for r in returned_rows:
                k = (r["date"], r["so_id"])
                day_counts[k] = day_counts.get(k, 0) + 1
                self.assertLessEqual(day_counts[k], 6, f"Day {k} exceeded 6 visits: {day_counts[k]}")

            # 5. Guardrail 2: Max 2 visits per dealer (1 completed + future <= 2)
            dealer_counts = {"A-D056": 1}  # completed
            for r in returned_rows:
                did = r["account_id"]
                dealer_counts[did] = dealer_counts.get(did, 0) + 1
                self.assertLessEqual(dealer_counts[did], 2, f"Dealer {did} visited more than twice: {dealer_counts[did]}")

            # 6. Guardrail 3: Zero cross-SO assignments
            for r in returned_rows:
                did = r["account_id"]
                so_id = r["so_id"]
                expected_so = self.dealers[did]["so_id"]
                self.assertEqual(so_id, expected_so, f"Cross-SO assignment: {did} assigned to {so_id}, expected {expected_so}")

            # 7. Weather Adaptation: SO-A has rain forecast on 2026-11-03, must have <= 5 visits
            so_a_nov3 = [r for r in returned_rows if r["date"] == "2026-11-03" and r["so_id"] == "SO-A"]
            self.assertLessEqual(len(so_a_nov3), 5, f"SO-A on rain day 2026-11-03 had {len(so_a_nov3)} visits (must be <= 5)")

            # 8. Club Protection: If A-D033 is club and scheduled on Nov 3, it must remain scheduled
            nov3_dealers = {r["account_id"] for r in so_a_nov3}
            # A-D033 is a club dealer on Nov 3 for SO-A
            self.assertIn("A-D033", nov3_dealers, "Loyalty Club dealer A-D033 was erroneously dropped on rain day")


if __name__ == "__main__":
    unittest.main()
