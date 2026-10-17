"""
Test suite for Phase 1: PJP Knowledge Graph Foundation & Ingestion Engine.
Validates node counts, relationship invariants, topological integrity,
and multi-hop graph traversals against the snapshot bundle.
Works seamlessly with both standard unittest and pytest.
"""

import os
import json
import unittest

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SNAPSHOT_PATH = os.path.join(WORKSPACE_ROOT, "web", "data", "pjp_graph_snapshot.json")


class TestPjpGraphFoundation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert os.path.exists(SNAPSHOT_PATH), f"Snapshot file not found at {SNAPSHOT_PATH}"
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            cls.graph_data = json.load(f)

    def test_metadata_and_structure(self):
        meta = self.graph_data.get("metadata", {})
        self.assertEqual(meta.get("version"), "1.0.0")
        self.assertEqual(meta.get("node_count"), 1134)
        self.assertEqual(meta.get("edge_count"), 1913)
        self.assertEqual(meta.get("next_visit_transitions"), 351)

        expected_labels = {"SalesOfficer", "Dealer", "Visit", "DropEvent", "Nudge"}
        self.assertEqual(set(meta.get("labels", {}).keys()), expected_labels)

    def test_sales_officers(self):
        officers = [n for n in self.graph_data["nodes"] if n["label"] == "SalesOfficer"]
        self.assertEqual(len(officers), 3)
        officer_ids = {o["id"] for o in officers}
        self.assertEqual(officer_ids, {"SO-A", "SO-B", "SO-C"})

        for o in officers:
            props = o["properties"]
            self.assertNotEqual(props["territory"], "")
            self.assertNotEqual(props["geography"], "")
            self.assertGreater(props["start_lat"], 0)
            self.assertGreater(props["start_lon"], 0)
            self.assertGreater(props["dealers_in_universe"], 0)

    def test_dealers_and_features(self):
        dealers = [n for n in self.graph_data["nodes"] if n["label"] == "Dealer"]
        self.assertEqual(len(dealers), 677)

        dealer_ids = set()
        for d in dealers:
            d_id = d["id"]
            self.assertNotIn(d_id, dealer_ids, f"Duplicate dealer ID: {d_id}")
            dealer_ids.add(d_id)

            props = d["properties"]
            self.assertIn(props["so_id"], {"SO-A", "SO-B", "SO-C"})
            self.assertIn(props["club_tier"], {"Platinum", "Gold", "Silver", "Elite", "Diamond", "Non-Club"})
            self.assertTrue(props["lat"] != 0.0 or props["lon"] != 0.0 or props["has_gps"] == 0)

        # Verify parent-child hierarchy link
        subsidiary_edges = [e for e in self.graph_data["edges"] if e["type"] == "SUBSIDIARY_OF"]
        self.assertGreaterEqual(len(subsidiary_edges), 1)
        sample_sub = next(e for e in subsidiary_edges if e["source"] == "A-D138")
        self.assertEqual(sample_sub["target"], "A-D019")

    def test_visits_and_sequences(self):
        visits = [n for n in self.graph_data["nodes"] if n["label"] == "Visit"]
        self.assertEqual(len(visits), 425)

        visit_ids = {v["id"] for v in visits}
        for v in visits:
            props = v["properties"]
            self.assertIn(props["so_id"], {"SO-A", "SO-B", "SO-C"})
            self.assertTrue(props["date"].startswith("2026-11-"))
            self.assertTrue(1 <= props["sequence"] <= 6)
            self.assertIn(":", props["planned_arrival"])
            self.assertGreaterEqual(props["travel_min"], 0)

        next_visit_edges = [e for e in self.graph_data["edges"] if e["type"] == "NEXT_VISIT"]
        self.assertEqual(len(next_visit_edges), 351)

        for e in next_visit_edges:
            self.assertIn(e["source"], visit_ids)
            self.assertIn(e["target"], visit_ids)
            self.assertGreaterEqual(e["properties"]["travel_min"], 0)

    def test_drop_events(self):
        events = [n for n in self.graph_data["nodes"] if n["label"] == "DropEvent"]
        self.assertEqual(len(events), 24)

        for ev in events:
            props = ev["properties"]
            self.assertIn(props["type"], {"drop", "hike"})
            self.assertTrue(props["onset"].startswith("2026-11-"))
            self.assertEqual(props["seed"], 1)

        event_edges = [e for e in self.graph_data["edges"] if e["type"] == "EXPERIENCED_EVENT"]
        self.assertEqual(len(event_edges), 24)

    def test_whatsapp_nudges(self):
        nudges = [n for n in self.graph_data["nodes"] if n["label"] == "Nudge"]
        self.assertEqual(len(nudges), 5)

        for nudge in nudges:
            props = nudge["properties"]
            self.assertIn(props["nudge_id"], {1, 2, 3, 4, 5})
            self.assertNotEqual(props["message"], "")
            self.assertGreater(props["character_count"], 0)
            self.assertNotEqual(props["trigger_type"], "")

        dispatched_edges = [e for e in self.graph_data["edges"] if e["type"] == "DISPATCHED_TO"]
        self.assertEqual(len(dispatched_edges), 5)

        supports_edges = [e for e in self.graph_data["edges"] if e["type"] == "SUPPORTS_VISIT"]
        self.assertEqual(len(supports_edges), 5)

    def test_graph_topological_integrity(self):
        by_id = self.graph_data["indexes"]["by_id"]
        for e in self.graph_data["edges"]:
            src = e["source"]
            tgt = e["target"]
            self.assertIn(src, by_id, f"Edge {e['id']} has dangling source {src}")
            self.assertIn(tgt, by_id, f"Edge {e['id']} has dangling target {tgt}")

    def test_daily_itinerary_traversal(self):
        visits_by_date = self.graph_data["indexes"]["visits_by_date_so"]
        key = "2026-11-02_SO-A"
        self.assertIn(key, visits_by_date)
        day_visits = visits_by_date[key]
        self.assertEqual(len(day_visits), 6)

        day_visits.sort(key=lambda x: x["sequence"])
        self.assertEqual(day_visits[0]["sequence"], 1)
        self.assertEqual(day_visits[0]["account_id"], "A-D056")
        self.assertEqual(day_visits[1]["sequence"], 2)
        self.assertEqual(day_visits[1]["account_id"], "A-D093")
        self.assertEqual(day_visits[2]["sequence"], 3)
        self.assertEqual(day_visits[2]["account_id"], "A-D131")
        self.assertEqual(day_visits[3]["sequence"], 4)
        self.assertEqual(day_visits[3]["account_id"], "A-D004")
        self.assertEqual(day_visits[4]["sequence"], 5)
        self.assertEqual(day_visits[4]["account_id"], "A-D019")
        self.assertEqual(day_visits[5]["sequence"], 6)
        self.assertEqual(day_visits[5]["account_id"], "A-D025")

    def test_degrowth_recovery_dealer_a_d004(self):
        by_id = self.graph_data["indexes"]["by_id"]
        dealer = by_id.get("A-D004")
        self.assertIsNotNone(dealer)
        props = dealer["properties"]
        self.assertEqual(props["club_tier"], "Silver")
        self.assertGreater(props["degrowth_mom_inr"], 0)
        self.assertGreater(props["headroom_inr"], 0)

        # Verify visit reason
        visit = by_id.get("VISIT_SO-A_2026-11-02_4")
        self.assertIsNotNone(visit)
        self.assertIn("Revenue Recovery", visit["properties"]["reason"])

    def test_parent_child_hierarchy_query(self):
        neighbors = self.graph_data["indexes"]["neighbors"]
        parent_neighbors = neighbors.get("A-D019", {})
        incoming = parent_neighbors.get("incoming", [])
        sub_edges = [e for e in incoming if e["type"] == "SUBSIDIARY_OF"]
        self.assertEqual(len(sub_edges), 1)
        self.assertEqual(sub_edges[0]["source"], "A-D138")


if __name__ == "__main__":
    unittest.main()
