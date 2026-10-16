#!/usr/bin/env python3
"""PJP-Graphify: Deterministic Query Engine.

Parses natural language and structured queries without external vector stores.
Traverses the PJP Knowledge Graph and returns edge-explained hierarchical trees.
"""

import re
from typing import Any, Dict, List, Optional, Tuple
import networkx as nx

from .graph_builder import load_pjp_knowledge_graph
from .tree_formatter import PJPGraphTreeFormatter


class PJPGraphQueryEngine:
    """Deterministic Query Engine for PJP Knowledge Graph."""

    def __init__(self, graph: Optional[nx.MultiDiGraph] = None):
        self.graph = graph if graph is not None else load_pjp_knowledge_graph()
        self.formatter = PJPGraphTreeFormatter()

    def extract_entities(self, query: str) -> Dict[str, Any]:
        """Extract dealer IDs, officer IDs, and dates from natural language query."""
        entities: Dict[str, Any] = {
            "dealers": [],
            "officers": [],
            "dates": [],
            "keywords": [],
        }

        # Dealer ID pattern (e.g., A-D004, B-D062, C-D119)
        dealers = re.findall(r"\b([A-C]-D\d{3})\b", query, flags=re.IGNORECASE)
        entities["dealers"] = [d.upper() for d in dealers]

        # Officer pattern (SO-A, SO-B, SO-C)
        officers = re.findall(r"\b(SO-[ABC])\b", query, flags=re.IGNORECASE)
        entities["officers"] = [o.upper() for o in officers]

        # ISO Date pattern (2026-11-XX)
        dates = re.findall(r"\b(2026-11-\d{2})\b", query)
        if not dates:
            # Fallback for "Nov 2", "November 2"
            day_matches = re.findall(r"\bNov(?:ember)?\s+(\d{1,2})\b", query, flags=re.IGNORECASE)
            for d in day_matches:
                day_num = int(d)
                dates.append(f"2026-11-{day_num:02d}")
        entities["dates"] = dates

        # Keywords for intent routing
        q_lower = query.lower()
        if any(w in q_lower for w in ["drop", "hike", "anomaly", "lineage", "recovery", "cusum"]):
            entities["keywords"].append("anomaly")
        if any(w in q_lower for w in ["itinerary", "route", "tour", "day", "stops", "schedule"]):
            entities["keywords"].append("itinerary")
        if any(w in q_lower for w in ["hierarchy", "parent", "child", "subsidiary", "outlet"]):
            entities["keywords"].append("hierarchy")
        if any(w in q_lower for w in ["slab", "scheme", "points", "bonus", "club"]):
            entities["keywords"].append("scheme")

        return entities

    def query(self, text: str) -> Dict[str, Any]:
        """Execute query and return intent, extracted entities, and hierarchical tree."""
        entities = self.extract_entities(text)
        dealers = entities["dealers"]
        officers = entities["officers"]
        dates = entities["dates"]
        keywords = entities["keywords"]

        # Route 1: Anomaly & Recovery Lineage
        if dealers and "anomaly" in keywords:
            dealer_id = dealers[0]
            tree_output = self.formatter.format_anomaly_lineage(self.graph, dealer_id)
            subgraph_nodes = [f"DEALER_{dealer_id}"]
            for u, v in self.graph.edges(f"DEALER_{dealer_id}"):
                subgraph_nodes.extend([u, v])
            return {
                "intent": "AnomalyLineage",
                "entities": entities,
                "tree_text": tree_output,
                "subgraph_nodes": list(set(subgraph_nodes)),
            }

        # Route 2: Daily Itinerary Tour Tree
        if officers and dates:
            so_id = officers[0]
            target_date = dates[0]
            tree_output = self.formatter.format_itinerary_tree(self.graph, so_id, target_date)
            subgraph_nodes = [f"OFFICER_{so_id}", f"BASE_{so_id}", f"DAY_{target_date}"]
            for u, v, data in self.graph.edges(data=True):
                if data.get("edge_type") == "SCHEDULED_ON" and v == f"DAY_{target_date}" and data.get("so_id") == so_id:
                    subgraph_nodes.append(u)
            return {
                "intent": "DailyItinerary",
                "entities": entities,
                "tree_text": tree_output,
                "subgraph_nodes": list(set(subgraph_nodes)),
            }

        # Route 3: Itinerary without explicit date (default to first working day 2026-11-02)
        if officers and "itinerary" in keywords:
            so_id = officers[0]
            target_date = dates[0] if dates else "2026-11-02"
            tree_output = self.formatter.format_itinerary_tree(self.graph, so_id, target_date)
            return {
                "intent": "DailyItineraryDefault",
                "entities": entities,
                "tree_text": tree_output,
                "subgraph_nodes": [f"OFFICER_{so_id}", f"DAY_{target_date}"],
            }

        # Route 4: Dealer 360 Tree (Primary Dealer Intelligence)
        if dealers:
            dealer_id = dealers[0]
            tree_output = self.formatter.format_dealer_360(self.graph, dealer_id)
            subgraph_nodes = [f"DEALER_{dealer_id}"]
            for u, v in self.graph.edges(f"DEALER_{dealer_id}"):
                subgraph_nodes.extend([u, v])
            for u, v in self.graph.in_edges(f"DEALER_{dealer_id}"):
                subgraph_nodes.extend([u, v])
            return {
                "intent": "Dealer360",
                "entities": entities,
                "tree_text": tree_output,
                "subgraph_nodes": list(set(subgraph_nodes)),
            }

        # Route 5: General System Overview
        return {
            "intent": "SystemOverview",
            "entities": entities,
            "tree_text": self._format_system_overview(),
            "subgraph_nodes": ["OFFICER_SO-A", "OFFICER_SO-B", "OFFICER_SO-C"],
        }

    def _format_system_overview(self) -> str:
        """Render high-level PJP Knowledge Graph summary tree."""
        lines = []
        lines.append("[PJP KNOWLEDGE GRAPH SYSTEM OVERVIEW]")
        lines.append(f"├── Total Graph Nodes: {self.graph.number_of_nodes()}")
        lines.append(f"├── Total Explained Edges: {self.graph.number_of_edges()}")
        lines.append(f"├── Registered Sales Officers:")
        for so_id in ["SO-A", "SO-B", "SO-C"]:
            n_id = f"OFFICER_{so_id}"
            if n_id in self.graph:
                attrs = self.graph.nodes[n_id]
                lines.append(f"│   ├── {so_id}: {attrs.get('territory')} [{attrs.get('geography')}]")
        lines.append(f"├── November 2026 Planning Horizon: 25 Working Days")
        lines.append(f"├── Focus Outlets Sequenced: 425 Visits across 398 Dealers")
        lines.append(f"└── Supported Query Formats:")
        lines.append(f"    ├── Dealer 360: \"Show dealer A-D004\" or \"Tell me about A-D019\"")
        lines.append(f"    ├── Itinerary Tree: \"Show route for SO-A on 2026-11-02\"")
        lines.append(f"    └── Anomaly Recovery: \"Trace drop on A-D004\" or \"CUSUM lineage A-D004\"")
        return "\n".join(lines)
