#!/usr/bin/env python3
"""Unit and Integration Tests for PJP-Graphify.

Verifies:
1. Graph construction, node counts, and edge explanation completeness.
2. Hierarchical tree formatting across Dealer 360, Daily Itineraries, and Anomaly Lineages.
3. Deterministic query engine entity extraction and intent routing.
4. Standalone Cytoscape.js HTML dashboard generation.
"""

import unittest
from pathlib import Path

from pjp_graph.graph_builder import load_pjp_knowledge_graph, build_pjp_knowledge_graph
from pjp_graph.tree_formatter import PJPGraphTreeFormatter
from pjp_graph.query_engine import PJPGraphQueryEngine
from pjp_graph.cytoscape_export import export_cytoscape_html

BASE_DIR = Path(__file__).resolve().parents[1]


class TestPJPGraphify(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        self = cls
        self.graph = load_pjp_knowledge_graph()
        self.formatter = PJPGraphTreeFormatter()
        self.engine = PJPGraphQueryEngine(self.graph)

    def test_graph_node_and_edge_counts(self):
        """Verify knowledge graph contains expected entities and relationships."""
        self.assertGreater(self.graph.number_of_nodes(), 700, "Graph should have > 700 nodes")
        self.assertGreater(self.graph.number_of_edges(), 1500, "Graph should have > 1500 edges")

        # Verify Officer nodes
        for so in ["SO-A", "SO-B", "SO-C"]:
            self.assertIn(f"OFFICER_{so}", self.graph, f"Officer node OFFICER_{so} missing")
            self.assertIn(f"BASE_{so}", self.graph, f"Base depot node BASE_{so} missing")

        # Verify Dealer node
        self.assertIn("DEALER_A-D004", self.graph, "Dealer A-D004 missing")
        self.assertIn("DEALER_A-D019", self.graph, "Dealer A-D019 missing")

    def test_every_edge_explained(self):
        """Verify Graphify principle: every edge must have a plain-English explanation."""
        missing_explanation = 0
        total_edges = 0
        for u, v, key, data in self.graph.edges(keys=True, data=True):
            total_edges += 1
            expl = data.get("explanation", "").strip()
            if not expl:
                missing_explanation += 1

        self.assertEqual(missing_explanation, 0, f"Found {missing_explanation} edges missing explanations out of {total_edges}")

    def test_tree_formatter_dealer_360(self):
        """Verify hierarchical tree output for dealer 360 view."""
        tree = self.formatter.format_dealer_360(self.graph, "A-D004")
        self.assertIn("[DEALER 360 TREE] A-D004", tree)
        self.assertIn("Assigned Officer: SO-A", tree)
        self.assertIn("Commercial Financials & Risk:", tree)
        self.assertIn("November 2026 Journey Plan", tree)
        self.assertIn("WhatsApp Pre-Visit Intelligence:", tree)

    def test_tree_formatter_itinerary(self):
        """Verify hierarchical tree output for daily tour itinerary."""
        tree = self.formatter.format_itinerary_tree(self.graph, "SO-A", "2026-11-02")
        self.assertIn("[ITINERARY TOUR TREE] SO-A - 2026-11-02", tree)
        self.assertIn("Departure: Base Depot", tree)
        self.assertIn("Stop 1: A-D056", tree)
        self.assertIn("Stop 4: A-D004", tree)
        self.assertIn("Tour Feasibility Summary:", tree)

    def test_query_engine_intents(self):
        """Verify query engine resolves intents and returns trees."""
        # Dealer intent
        res_dealer = self.engine.query("Tell me about dealer A-D004")
        self.assertEqual(res_dealer["intent"], "Dealer360")
        self.assertIn("[DEALER 360 TREE] A-D004", res_dealer["tree_text"])

        # Itinerary intent
        res_itin = self.engine.query("Show route for SO-A on 2026-11-02")
        self.assertEqual(res_itin["intent"], "DailyItinerary")
        self.assertIn("[ITINERARY TOUR TREE] SO-A - 2026-11-02", res_itin["tree_text"])

        # Anomaly lineage intent
        res_anomaly = self.engine.query("Trace drop anomaly on A-D004")
        self.assertEqual(res_anomaly["intent"], "AnomalyLineage")
        self.assertIn("[ANOMALY & RECOVERY LINEAGE TREE] A-D004", res_anomaly["tree_text"])

    def test_cytoscape_dashboard_export(self):
        """Verify Cytoscape HTML dashboard generation."""
        out_html = BASE_DIR / "pjp_graph_dashboard.html"
        res_path = export_cytoscape_html(self.graph, out_html)
        self.assertTrue(res_path.exists(), "pjp_graph_dashboard.html missing")
        self.assertGreater(res_path.stat().st_size, 50000, "Dashboard HTML too small")
        content = res_path.read_text(encoding="utf-8")
        self.assertIn("PJP-Graphify Explorer", content)
        self.assertIn("cytoscape", content)


if __name__ == "__main__":
    unittest.main()
