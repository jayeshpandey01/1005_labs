#!/usr/bin/env python3
"""PJP-Graphify: CLI Interface.

Allows users to query the PJP Knowledge Graph, view edge-explained trees,
and generate the interactive Cytoscape dashboard.
"""

import argparse
import sys
from pathlib import Path

from .graph_builder import build_pjp_knowledge_graph, load_pjp_knowledge_graph
from .query_engine import PJPGraphQueryEngine
from .cytoscape_export import export_cytoscape_html

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="PJP-Graphify Knowledge Graph & Tree Query CLI")
    parser.add_argument("--query", "-q", type=str, default=None, help="Natural language or entity query (e.g. 'Show dealer A-D004', 'SO-A itinerary 2026-11-02')")
    parser.add_argument("--dealer", "-d", type=str, default=None, help="Directly query dealer 360 tree for specific ID (e.g. A-D004)")
    parser.add_argument("--itinerary", "-i", nargs=2, metavar=("SO_ID", "DATE"), help="Query daily itinerary tree (e.g. --itinerary SO-A 2026-11-02)")
    parser.add_argument("--build", "-b", action="store_true", help="Force rebuild the knowledge graph from raw files")
    parser.add_argument("--dashboard", action="store_true", help="Export standalone Cytoscape.js dark dashboard HTML")
    parser.add_argument("--out", type=str, default=None, help="Path for exported dashboard HTML")
    args = parser.parse_args()

    # Rebuild graph if requested
    if args.build:
        print("-" * 65)
        print("Rebuilding PJP-Graphify Knowledge Graph from multi-table files ...")
        print("-" * 65)
        g = build_pjp_knowledge_graph()
        print(f"Graph Construction Complete: {g.number_of_nodes()} Nodes, {g.number_of_edges()} Edges")
        print("-" * 65)
        return

    # Export dashboard if requested
    if args.dashboard:
        out_p = Path(args.out) if args.out else None
        res_file = export_cytoscape_html(out_path=out_p)
        print("-" * 65)
        print("PJP-Graphify Dashboard Exported Successfully")
        print(f"File Location: {res_file.resolve()}")
        print("-" * 65)
        return

    # Load graph
    engine = PJPGraphQueryEngine()

    # Direct Dealer Query
    if args.dealer:
        did = args.dealer.strip().upper()
        res = engine.query(f"Show dealer {did}")
        print("\n" + res["tree_text"] + "\n")
        return

    # Direct Itinerary Query
    if args.itinerary:
        so_id, date_str = args.itinerary[0].strip().upper(), args.itinerary[1].strip()
        res = engine.query(f"Show itinerary for {so_id} on {date_str}")
        print("\n" + res["tree_text"] + "\n")
        return

    # General Query
    if args.query:
        res = engine.query(args.query)
        print("\n" + res["tree_text"] + "\n")
        return

    # Default: Show System Overview Tree
    res = engine.query("System Overview")
    print("\n" + res["tree_text"] + "\n")


if __name__ == "__main__":
    main()
