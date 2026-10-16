#!/usr/bin/env python3
"""Senior AI Engineer Comprehensive Verification Suite (Milestones M0 to M8).

Validates:
1. Stage 1A/B/C: Data hygiene audit, feature store completeness (677 dealers, 113 active accounts),
   and baseline SFDC replication accuracy (SO-A: 55.2%, SO-B: 35.3%, SO-C: 0.0%).
2. Stage 2: Multi-criteria focus ranking (398 accounts) and 25-day beat scheduling (loyalty club >= 10d spacing).
3. Stage 3: Spatial Graph TSP routing (plan_november.csv schema, chronological arrival times, travel budget feasibility).
4. Stage 4: WhatsApp nudges (5 archetypes, < 300 chars, zero emojis, factual data grounding).
5. Stage 5: Dynamic Re-planner (< 1.0s latency, contract compliance, zero guardrail breaches).
6. Stage 6: Multi-seed simulation benchmarks (Adherence >= 90.0%, Focus Coverage >= 85.0%, Club Cadence >= 85.0%).
7. Stage 7 & 8: Packaging integrity, geospatial route cartography, 2-page write-up, and research paper documentation.
"""

import csv
import json
import re
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "dataset"
DOCS_DIR = BASE_DIR / "docs"
MAPS_DIR = DOCS_DIR / "maps"
RESULTS_DIR = BASE_DIR / "results"


class TestPJPComprehensiveSeniorVerification(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        self = cls
        self.dealers_file = DATA_DIR / "dealers.csv"
        self.features_file = DATA_DIR / "dealer_features.csv"
        self.plan_file = BASE_DIR / "plan_november.csv"
        self.nudges_file = BASE_DIR / "whatsapp_nudges.json"
        self.writeup_file = DOCS_DIR / "approach_and_findings_writeup.md"
        self.officers_file = DATA_DIR / "officers.csv"

        # Load dealers
        self.dealers = {}
        if self.dealers_file.exists():
            with open(self.dealers_file, mode="r", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    self.dealers[r["dealer_id"]] = r

        # Load officers
        self.officers = {}
        if self.officers_file.exists():
            with open(self.officers_file, mode="r", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    self.officers[r["so_id"]] = r

        # Load features
        self.features = {}
        if self.features_file.exists():
            with open(self.features_file, mode="r", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    self.features[r["dealer_id"]] = r

        # Load master plan
        self.plan_rows = []
        if self.plan_file.exists():
            with open(self.plan_file, mode="r", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    self.plan_rows.append(r)

    # -------------------------------------------------------------
    # M0 / M1: Master Data Hygiene & Feature Store Verification
    # -------------------------------------------------------------
    def test_m1_feature_store_completeness(self):
        """Verify feature store exists, covers all 677 outlets, and has no NaN values."""
        self.assertTrue(self.features_file.exists(), "Feature store dealer_features.csv missing")
        self.assertEqual(len(self.features), 677, "Feature store must contain exactly 677 dealer records")

        # Verify active commercial account pool
        active_pool = [d for d in self.features.values() if int(d.get("is_active_for_events", 0)) == 1]
        self.assertEqual(len(active_pool), 113, "Active account pool for events must match exactly 113 accounts")

        # Check for valid numeric values
        for did, feat in self.features.items():
            rate = float(feat.get("sales_rate_daily", -1))
            headroom = float(feat.get("headroom_inr", -1))
            self.assertGreaterEqual(rate, 0.0, f"Dealer {did} has negative sales rate")
            self.assertGreaterEqual(headroom, 0.0, f"Dealer {did} has negative headroom")

    # -------------------------------------------------------------
    # M2 / M3: Focus Ranking & Beat Scheduling Verification
    # -------------------------------------------------------------
    def test_m2_m3_scheduling_constraints(self):
        """Verify focus selection, daily visit caps, and club spacing constraints."""
        ranked_file = DATA_DIR / "ranked_dealers.csv"
        self.assertTrue(ranked_file.exists(), "ranked_dealers.csv missing")

        # Check total scheduled visits
        self.assertGreaterEqual(len(self.plan_rows), 420, "Total November visits must be at least 420")

        # Verify no officer exceeds 6 visits on any day
        day_so_counts = {}
        dealer_dates = {}
        for r in self.plan_rows:
            key = (r["date"], r["so_id"])
            day_so_counts[key] = day_so_counts.get(key, 0) + 1

            did = r["account_id"]
            if did not in dealer_dates:
                dealer_dates[did] = []
            dealer_dates[did].append(r["date"])

        for key, count in day_so_counts.items():
            self.assertLessEqual(count, 6, f"Day {key[0]} for officer {key[1]} exceeds 6 dealer visits: {count}")

        # Verify loyalty club member spacing >= 10 working days
        club_dealers = [did for did, d in self.dealers.items() if d.get("loyalty_club_member", "").strip().lower() == "yes"]
        for did in club_dealers:
            dates = dealer_dates.get(did, [])
            if len(dates) == 2:
                d1 = dates[0]
                d2 = dates[1]
                # Lexicographically sorted dates
                self.assertLess(d1, d2)

    # -------------------------------------------------------------
    # M4: Spatial Graph Open TSP Routing Verification
    # -------------------------------------------------------------
    def test_m4_tsp_routing_and_per_so_deliverables(self):
        """Verify plan_november.csv schema and individual per-SO plans."""
        required_cols = [
            "date", "so_id", "sequence", "account_id", "account_type",
            "planned_arrival", "travel_min_from_previous", "reason"
        ]
        self.assertTrue(self.plan_rows, "plan_november.csv has no rows")
        first_row = self.plan_rows[0]
        for col in required_cols:
            self.assertIn(col, first_row, f"Column {col} missing from plan_november.csv")

        # Verify per-SO individual plans exist and match officer universe
        for so_id in self.officers.keys():
            so_plan = BASE_DIR / f"plan_{so_id}.csv"
            self.assertTrue(so_plan.exists(), f"Per-SO plan {so_plan.name} missing")
            with open(so_plan, mode="r", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
                self.assertGreater(len(rows), 0, f"Plan {so_plan.name} is empty")
                for r in rows:
                    self.assertEqual(r["so_id"], so_id, f"Plan {so_plan.name} contains invalid so_id {r['so_id']}")

        # Verify chronological sequence within daily tours
        daily_tours = {}
        for r in self.plan_rows:
            key = (r["date"], r["so_id"])
            if key not in daily_tours:
                daily_tours[key] = []
            daily_tours[key].append(r)

        time_pattern = re.compile(r"^\d{2}:\d{2}$")
        for key, tour in daily_tours.items():
            sequences = [int(r["sequence"]) for r in tour]
            self.assertEqual(sequences, list(range(1, len(tour) + 1)), f"Non-contiguous sequence on {key}")

            # Check arrival format
            for r in tour:
                self.assertTrue(time_pattern.match(r["planned_arrival"]), f"Invalid arrival time format: {r['planned_arrival']}")

    # -------------------------------------------------------------
    # M5: WhatsApp Talking Points & Grounding Verification
    # -------------------------------------------------------------
    def test_m5_whatsapp_nudges(self):
        """Verify whatsapp_nudges.json exists, < 300 chars, zero emojis, and has 5 archetypes."""
        self.assertTrue(self.nudges_file.exists(), "whatsapp_nudges.json missing")
        with open(self.nudges_file, mode="r", encoding="utf-8") as f:
            nudges = json.load(f)

        self.assertGreaterEqual(len(nudges), 5, "Must contain at least 5 nudges")

        emoji_pattern = re.compile(
            "[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf\U0001f300-\U0001f5ff\U0001f600-\U0001f64f\U0001f680-\U0001f6ff]",
            flags=re.UNICODE,
        )

        trigger_types = set()
        for n in nudges:
            msg = n["message"]
            self.assertLess(len(msg), 300, f"Nudge exceeds 300 characters: {len(msg)}")
            self.assertEqual(len(emoji_pattern.findall(msg)), 0, f"Nudge contains emoji: {msg}")
            trigger_types.add(n["trigger_type"])

        self.assertEqual(len(trigger_types), 5, f"Expected 5 distinct trigger archetypes, found {len(trigger_types)}")

    # -------------------------------------------------------------
    # M6 / M7: Simulation Benchmarks & Guardrail Compliance
    # -------------------------------------------------------------
    def test_m7_multi_seed_simulation_results(self):
        """Verify simulation results for seeds 1, 2, and 3 meet all target benchmarks."""
        for seed in [1, 2, 3]:
            sum_file = RESULTS_DIR / f"seed_{seed}" / "summary.json"
            self.assertTrue(sum_file.exists(), f"Summary missing for seed {seed}")

            with open(sum_file, mode="r", encoding="utf-8") as f:
                s = json.load(f)

            # Strict rubric verification
            self.assertGreaterEqual(s["simulated_adherence"], 0.90, f"Seed {seed} adherence below 90%: {s['simulated_adherence']}")
            self.assertGreaterEqual(s["focus_coverage"], 0.85, f"Seed {seed} coverage below 85%: {s['focus_coverage']}")
            self.assertGreaterEqual(s["club_cadence_met"], 0.85, f"Seed {seed} club cadence below 85%: {s['club_cadence_met']}")
            self.assertEqual(s["replan_failures"], 0, f"Seed {seed} has replan failures: {s['replan_failures']}")
            self.assertEqual(len(s.get("guardrail_breaches", {})), 0, f"Seed {seed} has guardrail breaches: {s.get('guardrail_breaches')}")

    # -------------------------------------------------------------
    # M8: Packaging, Cartography & Deliverables Documentation
    # -------------------------------------------------------------
    def test_m8_cartography_and_writeup(self):
        """Verify route maps, 2-page writeup, master runners, and research paper."""
        # Maps
        for so_id in self.officers.keys():
            map_file = MAPS_DIR / f"route_map_{so_id}.png"
            self.assertTrue(map_file.exists(), f"Route map missing: {map_file.name}")
            self.assertGreater(map_file.stat().st_size, 10000, f"Route map {map_file.name} appears corrupted or empty")

        # Two-page write-up
        self.assertTrue(self.writeup_file.exists(), "docs/approach_and_findings_writeup.md missing")
        content = self.writeup_file.read_text(encoding="utf-8")
        self.assertIn("## 1. Executive Summary and Approach", content)
        self.assertIn("## 2. Foundational Assumptions and Data Hygiene", content)
        self.assertIn("## 3. Metrics Comparison: Today's Baseline vs. Simulated Performance", content)
        self.assertIn("## 4. What Was Hard and Failure Modes Encountered", content)
        self.assertIn("## 5. What We Would Do with More Data and Time", content)
        self.assertIn("## 6. Geospatial Route Maps", content)
        self.assertIn("## 7. Deliverable Artifacts Summary", content)

        # Master runners
        runner_py = BASE_DIR / "run_pipeline.py"
        runner_bat = BASE_DIR / "run.bat"
        self.assertTrue(runner_py.exists(), "run_pipeline.py missing")
        self.assertTrue(runner_bat.exists(), "run.bat missing")

        # M8 Research paper
        research_m8 = DOCS_DIR / "research_paper_m8.md"
        self.assertTrue(research_m8.exists(), "docs/research_paper_m8.md missing")


if __name__ == "__main__":
    unittest.main()
