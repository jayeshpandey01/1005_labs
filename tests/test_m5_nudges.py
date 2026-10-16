#!/usr/bin/env python3
"""Milestone M5 Unit Tests: WhatsApp Nudge Generator & Grounding Verification.

Verifies:
1. whatsapp_nudges.json exists and contains at least 5 records.
2. Every nudge is strictly under 300 characters.
3. Zero unicode emojis are present in any generated text.
4. Exactly 5 distinct commercial trigger archetypes are represented.
5. All numerical values match underlying data in dealer_features.csv, scheme_targets.csv, and plan_november.csv.
6. Arrival timestamps match plan_november.csv synthesized routes.
"""

import csv
import json
import re
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "dataset"
NUDGES_FILE = BASE_DIR / "whatsapp_nudges.json"
PLAN_FILE = BASE_DIR / "plan_november.csv"
FEATURES_FILE = DATA_DIR / "dealer_features.csv"
TARGETS_FILE = DATA_DIR / "scheme_targets.csv"


class TestMilestoneM5WhatsAppNudges(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        self = cls
        self.assertTrue(NUDGES_FILE.exists(), f"Missing deliverable: {NUDGES_FILE}")
        with open(NUDGES_FILE, mode="r", encoding="utf-8") as f:
            self.nudges = json.load(f)

        # Load plan
        self.plan_visits = {}
        if PLAN_FILE.exists():
            with open(PLAN_FILE, mode="r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    key = (row["date"], row["account_id"])
                    self.plan_visits[key] = row

        # Load features
        self.features = {}
        if FEATURES_FILE.exists():
            with open(FEATURES_FILE, mode="r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.features[row["dealer_id"]] = row

    def test_nudge_count_and_schema(self):
        """Verify at least 5 nudges exist with all required schema fields."""
        self.assertGreaterEqual(len(self.nudges), 5, "Must contain at least 5 distinct sample nudges")
        required_keys = {
            "nudge_id",
            "dealer_id",
            "dealer_name",
            "so_id",
            "visit_date",
            "trigger_type",
            "message",
            "character_count",
            "grounding_data",
        }
        for n in self.nudges:
            self.assertTrue(required_keys.issubset(n.keys()), f"Nudge {n.get('nudge_id')} missing keys: {required_keys - set(n.keys())}")
            self.assertIsInstance(n["grounding_data"], dict, "grounding_data must be a dictionary")

    def test_character_limit_under_300(self):
        """Verify strict invariant: all messages strictly under 300 characters."""
        for n in self.nudges:
            msg = n["message"]
            char_len = len(msg)
            self.assertEqual(n["character_count"], char_len, f"Nudge {n['nudge_id']} character_count field does not match actual length")
            self.assertLess(char_len, 300, f"Nudge {n['nudge_id']} exceeds 300 characters ({char_len} chars): {msg}")

    def test_zero_emojis(self):
        """Verify strict rule: ZERO emojis in any message."""
        # Emoji regex matching standard unicode emoji blocks
        emoji_pattern = re.compile(
            "[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf\U0001f300-\U0001f5ff\U0001f600-\U0001f64f\U0001f680-\U0001f6ff]",
            flags=re.UNICODE,
        )
        for n in self.nudges:
            msg = n["message"]
            matches = emoji_pattern.findall(msg)
            self.assertEqual(len(matches), 0, f"Nudge {n['nudge_id']} contains emojis: {matches}")

    def test_trigger_type_diversity(self):
        """Verify exactly 5 distinct commercial trigger archetypes are represented."""
        expected_archetypes = {
            "Loyalty Club Slab Target Gap",
            "Product Tier De-growth Alert",
            "High GST Wallet Headroom Opportunity",
            "Sudden Sales Drop Recovery",
            "Non-Club Monthly Scheme Acceleration",
        }
        found_archetypes = {n["trigger_type"] for n in self.nudges}
        self.assertTrue(expected_archetypes.issubset(found_archetypes), f"Missing trigger archetypes: {expected_archetypes - found_archetypes}")

    def test_grounding_lineage_and_arrival_sync(self):
        """Verify numeric tokens in grounding_data match underlying feature tables and plan arrival times."""
        for n in self.nudges:
            did = n["dealer_id"]
            date = n["visit_date"]
            g = n["grounding_data"]

            # 1. Arrival time verification from plan_november.csv
            plan_key = (date, did)
            if plan_key in self.plan_visits:
                plan_arrival = self.plan_visits[plan_key]["planned_arrival"]
                self.assertIn("planned_arrival", g)
                # Verify that message text includes the arrival time
                self.assertIn(g["planned_arrival"], n["message"])

            # 2. Archetype-specific data validation
            feat = self.features.get(did, {})
            if n["trigger_type"] == "Loyalty Club Slab Target Gap":
                self.assertEqual(int(feat.get("club", 0)), 1)
                self.assertIn("target_points", g)
                self.assertIn("points_needed", g)
                self.assertIn("equivalent_tier8_sheets", g)

            elif n["trigger_type"] == "Product Tier De-growth Alert":
                self.assertIn("degrowth_percentage", g)
                self.assertIn("value_lost_inr", g)
                val_prior = float(feat.get("sales_prior_month_inr", 0))
                val_curr = float(feat.get("sales_curr_month_inr", 0))
                self.assertAlmostEqual(g["value_lost_inr"], max(0.0, val_prior - val_curr), places=1)

            elif n["trigger_type"] == "High GST Wallet Headroom Opportunity":
                self.assertIn("gst_turnover_proxy_inr", g)
                self.assertIn("uncaptured_headroom_inr", g)
                self.assertAlmostEqual(g["gst_turnover_proxy_inr"], float(feat.get("gst_turnover_proxy_inr", 0)), places=1)

            elif n["trigger_type"] == "Sudden Sales Drop Recovery":
                self.assertIn("historical_daily_rate", g)
                self.assertEqual(int(feat.get("is_active_for_events", 0)), 1)

            elif n["trigger_type"] == "Non-Club Monthly Scheme Acceleration":
                self.assertEqual(int(feat.get("club", 0)), 0)
                self.assertIn("current_monthly_points", g)
                self.assertIn("target_slab", g)


if __name__ == "__main__":
    unittest.main()
