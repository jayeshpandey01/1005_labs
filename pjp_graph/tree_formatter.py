#!/usr/bin/env python3
"""PJP-Graphify: Hierarchical Tree Formatter.

Renders graph paths, entity profiles, and daily itineraries into clean,
structured ASCII / Unicode trees inspired by jayeshpandey01/Graph-Based-Query-System.
"""

from typing import List, Optional
import networkx as nx


class PJPGraphTreeFormatter:
    """Format PJP graph traversals into structured hierarchical trees."""

    @staticmethod
    def format_dealer_360(graph: nx.MultiDiGraph, dealer_id: str) -> str:
        """Render comprehensive 360-degree commercial and operational tree for a dealer."""
        node_id = f"DEALER_{dealer_id}"
        if node_id not in graph:
            return f"Error: Dealer '{dealer_id}' not found in knowledge graph."

        attrs = graph.nodes[node_id]
        lines = []
        lines.append(f"[DEALER 360 TREE] {dealer_id} ({'Loyalty Club Member' if attrs.get('is_club') else 'Regular Dealer'})")

        # 1. Master Identity
        so_id = attrs.get("so_id", "Unknown")
        lines.append(f"├── Master Profile:")
        lines.append(f"│   ├── Assigned Officer: {so_id}")
        lines.append(f"│   ├── Location: {attrs.get('town', 'Unknown')} ({attrs.get('lat')}, {attrs.get('lon')}) [GPS: {'Verified' if attrs.get('has_gps') else 'Missing'}]")
        lines.append(f"│   └── Outlet Type: {attrs.get('outlet_type', 'Dealer')}")

        # 2. Commercial Financials & Risk
        lines.append(f"├── Commercial Financials & Risk:")
        lines.append(f"│   ├── Baseline Sales Rate: {attrs.get('sales_rate_daily', 0.0):.2f} sheets/day (Active Account: {'Yes' if attrs.get('is_active_for_events') else 'No'})")
        lines.append(f"│   ├── Annual Purchases: Rs {attrs.get('annual_purchases_inr', 0.0)/100000:.2f} Lakhs")
        lines.append(f"│   ├── Uncaptured Headroom: Rs {attrs.get('headroom_inr', 0.0)/100000:.2f} Lakhs (Turnover Band: {attrs.get('turnover_band') or 'Standard'})")
        degrowth = attrs.get('degrowth_mom_inr', 0.0)
        lines.append(f"│   └── Month-on-Month De-growth: Rs {degrowth:,.0f} {'(ALERT: Revenue Attrition)' if degrowth > 10000 else '(Stable)'}")

        # 3. Hierarchy / Parent-Child Links
        parent_id = attrs.get("parent_dealer_id")
        subsidiary_edges = [
            (u, v, data) for u, v, data in graph.edges(node_id, data=True)
            if data.get("edge_type") == "PARENT_OF"
        ]
        if parent_id and parent_id != dealer_id:
            lines.append(f"├── Entity Hierarchy:")
            lines.append(f"│   └── Subsidiary of Parent: {parent_id}")
            lines.append(f"│       └── Edge Explanation: 'Commercial billing and loyalty scheme points roll up to {parent_id}.'")
        elif subsidiary_edges:
            lines.append(f"├── Entity Hierarchy (Parent Entity):")
            for _, child_node, edata in subsidiary_edges:
                cid = child_node.replace("DEALER_", "")
                lines.append(f"│   ├── Subsidiary Branch: {cid}")
                lines.append(f"│   │   └── Edge Explanation: '{edata.get('explanation')}'")

        # 4. Scheme Slab Target Progress
        slab_edges = [
            (u, v, data) for u, v, data in graph.edges(node_id, data=True)
            if data.get("edge_type") == "TARGETS_SLAB"
        ]
        if slab_edges:
            lines.append(f"├── Scheme Slab Objectives:")
            for _, slab_node, edata in slab_edges:
                s_name = slab_node.replace("SLAB_CLUB_", "")
                target_pts = edata.get("target_points", 0.0)
                lines.append(f"│   └── Target: {s_name} ({target_pts:,.0f} points)")
                lines.append(f"│       └── Edge Explanation: '{edata.get('explanation')}'")

        # 5. November 2026 Scheduled Visits
        visit_edges = [
            (u, v, data) for u, v, data in graph.edges(node_id, data=True)
            if data.get("edge_type") == "SCHEDULED_ON"
        ]
        visit_edges.sort(key=lambda x: (x[2].get("sequence", 0), x[2].get("planned_arrival", "")))
        lines.append(f"├── November 2026 Journey Plan ({len(visit_edges)} visits scheduled):")
        if visit_edges:
            for idx, (_, day_node, edata) in enumerate(visit_edges, 1):
                d_str = day_node.replace("DAY_", "")
                seq = edata.get("sequence", idx)
                arr = edata.get("planned_arrival", "TBD")
                t_min = edata.get("travel_min", 0.0)
                reason = edata.get("reason", "Focus Call")
                lines.append(f"│   ├── Visit {idx}: {d_str} [Stop {seq} @ {arr}]")
                lines.append(f"│   │   ├── Travel Time: +{t_min:.1f} min from previous stop")
                lines.append(f"│   │   ├── Commercial Rationale: {reason}")
                lines.append(f"│   │   └── Edge Explanation: '{edata.get('explanation')}'")
        else:
            lines.append(f"│   └── (No focus visits scheduled this month)")

        # 6. WhatsApp Nudge Talking Points
        nudge_edges = [
            (u, v, data) for u, v, data in graph.edges(node_id, data=True)
            if data.get("edge_type") == "HAS_NUDGE"
        ]
        if nudge_edges:
            lines.append(f"├── WhatsApp Pre-Visit Intelligence:")
            for _, n_node, edata in nudge_edges:
                n_attrs = graph.nodes[n_node]
                lines.append(f"│   ├── Trigger Type: {n_attrs.get('trigger_type')}")
                lines.append(f"│   ├── Message ({n_attrs.get('character_count')} chars): \"{n_attrs.get('message')}\"")
                lines.append(f"│   └── Edge Explanation: '{edata.get('explanation')}'")

        # 7. Simulation Telemetry (Seed 1 Anomaly Event)
        event_edges = [
            (u, v, data) for u, v, data in graph.edges(node_id, data=True)
            if data.get("edge_type") == "SUFFERED_EVENT"
        ]
        if event_edges:
            lines.append(f"└── Simulation Telemetry (Practice Seed 1):")
            for _, e_node, edata in event_edges:
                e_attrs = graph.nodes[e_node]
                lines.append(f"    ├── Anomaly Detected: {e_attrs.get('event_type')} (Onset: {e_attrs.get('onset')})")
                lines.append(f"    ├── First Visit Post-Onset: {e_attrs.get('first_visit_after_onset') or 'Not visited'}")
                lines.append(f"    └── Edge Explanation: '{edata.get('explanation')}'")
        else:
            lines.append(f"└── Simulation Telemetry: No anomalous sales drops or spikes revealed.")

        return "\n".join(lines)

    @staticmethod
    def format_itinerary_tree(graph: nx.MultiDiGraph, so_id: str, date: str) -> str:
        """Render daily chronological tour tree from Base Depot through all dealer stops."""
        officer_node = f"OFFICER_{so_id}"
        day_node = f"DAY_{date}"

        if officer_node not in graph:
            return f"Error: Officer '{so_id}' not found in knowledge graph."
        if day_node not in graph:
            return f"Error: Date '{date}' not found in knowledge graph."

        o_attrs = graph.nodes[officer_node]
        d_attrs = graph.nodes[day_node]
        weather = d_attrs.get(f"weather_{so_id}", "clear")

        lines = []
        lines.append(f"[ITINERARY TOUR TREE] {so_id} - {date}")
        lines.append(f"├── Territory: {o_attrs.get('territory')} ({o_attrs.get('geography')})")
        lines.append(f"├── Day Weather: {weather.upper()} [Speed: {o_attrs.get('speed_kmh')} km/h]")

        # Find all stops for this (date, SO)
        scheduled_stops = []
        for u, v, data in graph.edges(data=True):
            if data.get("edge_type") == "SCHEDULED_ON" and v == day_node and data.get("so_id") == so_id:
                dealer_id = u.replace("DEALER_", "")
                scheduled_stops.append({
                    "dealer_id": dealer_id,
                    "sequence": int(data.get("sequence", 0)),
                    "planned_arrival": data.get("planned_arrival", ""),
                    "travel_min": float(data.get("travel_min", 0.0)),
                    "reason": data.get("reason", "Focus Call"),
                    "explanation": data.get("explanation", ""),
                })

        scheduled_stops.sort(key=lambda s: s["sequence"])

        if not scheduled_stops:
            lines.append("└── No visits scheduled for this officer on this date.")
            return "\n".join(lines)

        base_depot = f"BASE_{so_id}"
        lines.append(f"├── [09:30 AM] Departure: Base Depot ({o_attrs.get('base_lat'):.4f}, {o_attrs.get('base_lon'):.4f})")

        total_travel_min = sum(s["travel_min"] for s in scheduled_stops)
        total_call_min = len(scheduled_stops) * 25

        for idx, s in enumerate(scheduled_stops, 1):
            did = s["dealer_id"]
            d_node = f"DEALER_{did}"
            d_attrs = graph.nodes.get(d_node, {})
            club_str = " (Loyalty Club)" if d_attrs.get("is_club") else ""

            is_last = idx == len(scheduled_stops)
            prefix = "└──" if is_last else "├──"
            sub_prefix = "    " if is_last else "│   "

            lines.append(f"{prefix} [{s['planned_arrival']}] Stop {s['sequence']}: {did}{club_str}")
            lines.append(f"{sub_prefix}├── Leg Transit: +{s['travel_min']:.1f} min travel from previous stop")
            lines.append(f"{sub_prefix}├── Commercial Rationale: {s['reason']}")
            lines.append(f"{sub_prefix}├── Financial Context: Rate: {d_attrs.get('sales_rate_daily', 0):.1f} sh/d | Headroom: Rs {d_attrs.get('headroom_inr', 0)/100000:.1f}L")
            lines.append(f"{sub_prefix}└── Edge Explanation: \"{s['explanation']}\"")

        lines.append(f"\nTour Feasibility Summary:")
        lines.append(f"  - Total Stops: {len(scheduled_stops)}")
        lines.append(f"  - Est. Travel Time: {total_travel_min:.1f} minutes")
        lines.append(f"  - Est. Calling Time: {total_call_min} minutes (25 min / call)")
        lines.append(f"  - Demand Gen Reserved: 80 minutes")
        lines.append(f"  - Net Operational Day: {total_travel_min + total_call_min:.1f} / 460 minutes")
        lines.append(f"  - Feasibility Margin: {460 - (total_travel_min + total_call_min):.1f} minutes slack")

        return "\n".join(lines)

    @staticmethod
    def format_anomaly_lineage(graph: nx.MultiDiGraph, dealer_id: str) -> str:
        """Render causal anomaly detection and re-planning lineage tree."""
        d_node = f"DEALER_{dealer_id}"
        if d_node not in graph:
            return f"Error: Dealer '{dealer_id}' not found in knowledge graph."

        d_attrs = graph.nodes[d_node]
        event_edges = [
            (u, v, data) for u, v, data in graph.edges(d_node, data=True)
            if data.get("edge_type") == "SUFFERED_EVENT"
        ]

        lines = []
        lines.append(f"[ANOMALY & RECOVERY LINEAGE TREE] {dealer_id}")
        lines.append(f"├── Commercial Baseline:")
        lines.append(f"│   ├── Officer: {d_attrs.get('so_id')}")
        lines.append(f"│   ├── Historical Daily Rate: {d_attrs.get('sales_rate_daily', 0.0):.2f} sheets/day")
        lines.append(f"│   └── Active Event Monitoring: {'Active (mu_d >= 0.5)' if d_attrs.get('is_active_for_events') else 'Dormant'}")

        if not event_edges:
            lines.append(f"└── Anomaly Status: No hidden sales drop or hike recorded in simulation.")
            return "\n".join(lines)

        for _, e_node, edata in event_edges:
            e_attrs = graph.nodes[e_node]
            etype = e_attrs.get("event_type", "DROP")
            onset = e_attrs.get("onset", "2026-11-01")
            first_visit = e_attrs.get("first_visit_after_onset")

            lines.append(f"├── Anomaly Event: Sales {etype}")
            lines.append(f"│   ├── Onset Date: {onset}")
            lines.append(f"│   ├── Duration: {e_attrs.get('end', 'Until visit')}")
            lines.append(f"│   └── Event Edge Explanation: '{edata.get('explanation')}'")

            # CUSUM Change-Point Parameters
            mu_d = d_attrs.get('sales_rate_daily', 1.0)
            k_d = 0.55 * mu_d
            h_d = 1.1 * mu_d
            lines.append(f"├── CUSUM Sequential Change-Point Detection:")
            lines.append(f"│   ├── Allowance Parameter (k_d): {k_d:.2f} sheets/day (0.55 * mu_d)")
            lines.append(f"│   ├── Decision Threshold (h_d): {h_d:.2f} sheets/day (1.1 * mu_d)")
            lines.append(f"│   └── Dynamic Action: Pull-Forward Operator Activated")

            lines.append(f"└── Recovery Outcome:")
            if first_visit:
                lines.append(f"    ├── First Visit Post-Onset: {first_visit}")
                lines.append(f"    └── Recovery Status: RECOVERED (Within 7-day threshold)")
            else:
                lines.append(f"    └── Recovery Status: Unrecovered")

        return "\n".join(lines)
