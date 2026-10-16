#!/usr/bin/env python3
"""PJP-Graphify: Graph Builder Module.

Ingests multi-table dataset files, journey plans, nudges, and simulation telemetry
into a unified NetworkX MultiDiGraph where Every Edge is Explained.
"""

import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import networkx as nx

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "dataset"
RESULTS_DIR = BASE_DIR / "results" / "seed_1"
GRAPH_CACHE_FILE = DATA_DIR / "pjp_knowledge_graph.json"


def haversine_km(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Compute straight-line great-circle distance in kilometers."""
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
    return 6371.0 * 2.0 * math.asin(math.sqrt(h))


def build_pjp_knowledge_graph() -> nx.MultiDiGraph:
    """Construct unified PJP property graph with typed nodes and explained edges."""
    g = nx.MultiDiGraph()

    # -------------------------------------------------------------------------
    # 1. Ingest Officers
    # -------------------------------------------------------------------------
    officers_file = DATA_DIR / "officers.csv"
    officers: Dict[str, dict] = {}
    if officers_file.exists():
        with open(officers_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                so_id = r["so_id"]
                lat = float(r["approx_day_start_lat"])
                lon = float(r["approx_day_start_lon"])
                is_upcountry = "upcountry" in r.get("geography", "").lower()
                speed_kmh = 30.0 if is_upcountry else 18.0

                officers[so_id] = {
                    "so_id": so_id,
                    "territory": r.get("territory", ""),
                    "geography": r.get("geography", ""),
                    "is_upcountry": is_upcountry,
                    "speed_kmh": speed_kmh,
                    "base_coord": (lat, lon),
                }

                # Officer Node
                g.add_node(
                    f"OFFICER_{so_id}",
                    node_type="Officer",
                    label=so_id,
                    so_id=so_id,
                    territory=r.get("territory", ""),
                    geography=r.get("geography", ""),
                    speed_kmh=speed_kmh,
                    base_lat=lat,
                    base_lon=lon,
                )

                # Base Depot Node
                depot_id = f"BASE_{so_id}"
                g.add_node(
                    depot_id,
                    node_type="BaseDepot",
                    label=f"Base Depot ({so_id})",
                    so_id=so_id,
                    lat=lat,
                    lon=lon,
                    depot_time="09:30 AM",
                )

                g.add_edge(
                    f"OFFICER_{so_id}",
                    depot_id,
                    key="DEPARTS_FROM",
                    edge_type="DEPARTS_FROM",
                    explanation=f"Officer {so_id} departs daily at 09:30 AM from base coordinates ({lat:.4f}, {lon:.4f}).",
                )

    # -------------------------------------------------------------------------
    # 2. Ingest Features & GST Metadata
    # -------------------------------------------------------------------------
    features: Dict[str, dict] = {}
    features_file = DATA_DIR / "dealer_features.csv"
    if features_file.exists():
        with open(features_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                features[r["dealer_id"]] = r

    gst_data: Dict[str, dict] = {}
    gst_file = DATA_DIR / "GST_filings.csv"
    if gst_file.exists():
        with open(gst_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                gst_data[r["dealer_id"]] = r

    # -------------------------------------------------------------------------
    # 3. Ingest Dealers
    # -------------------------------------------------------------------------
    dealers_file = DATA_DIR / "dealers.csv"
    dealers: Dict[str, dict] = {}
    if dealers_file.exists():
        with open(dealers_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                did = r["dealer_id"]
                so_id = r["so_id"]
                lat = float(r["lat"]) if r.get("lat") else None
                lon = float(r["lon"]) if r.get("lon") else None
                is_club = r.get("loyalty_club_member", "").strip().lower() == "yes"
                parent_id = r.get("parent_dealer_id", "").strip()

                feat = features.get(did, {})
                gst = gst_data.get(did, {})

                dealers[did] = {
                    "dealer_id": did,
                    "so_id": so_id,
                    "parent_dealer_id": parent_id,
                    "is_club": is_club,
                    "club_tier": r.get("club_tier", ""),
                    "town": r.get("town", ""),
                    "coord": (lat, lon) if (lat and lon) else None,
                    "lat": lat,
                    "lon": lon,
                    "has_gps": lat is not None and lon is not None,
                }

                # Dealer Node
                g.add_node(
                    f"DEALER_{did}",
                    node_type="Dealer",
                    label=did,
                    dealer_id=did,
                    so_id=so_id,
                    parent_dealer_id=parent_id,
                    is_club=is_club,
                    club_tier=r.get("club_tier", ""),
                    town=r.get("town", ""),
                    lat=lat,
                    lon=lon,
                    has_gps=lat is not None,
                    sales_rate_daily=float(feat.get("sales_rate_daily") or 0.0),
                    points_per_sheet=float(feat.get("points_per_sheet") or 2.0),
                    is_active_for_events=int(feat.get("is_active_for_events") or 0) == 1,
                    annual_purchases_inr=float(feat.get("annual_purchases_inr") or 0.0),
                    headroom_inr=float(feat.get("headroom_inr") or 0.0),
                    degrowth_mom_inr=float(feat.get("degrowth_mom_inr") or 0.0),
                    degrowth_qoq_inr=float(feat.get("degrowth_qoq_inr") or 0.0),
                    gst_status=gst.get("gst_status", ""),
                    turnover_band=gst.get("turnover_band_proxy", ""),
                )

                # Edge: Dealer -> ASSIGNED_TO -> Officer
                if f"OFFICER_{so_id}" in g:
                    g.add_edge(
                        f"DEALER_{did}",
                        f"OFFICER_{so_id}",
                        key="ASSIGNED_TO",
                        edge_type="ASSIGNED_TO",
                        so_id=so_id,
                        explanation=f"Dealer {did} belongs to the designated sales territory of Officer {so_id}.",
                    )

                # Edge: Parent-Child Outlet Hierarchy
                if parent_id and parent_id != did:
                    g.add_edge(
                        f"DEALER_{did}",
                        f"DEALER_{parent_id}",
                        key="SUBSIDIARY_OF",
                        edge_type="SUBSIDIARY_OF",
                        child_id=did,
                        parent_id=parent_id,
                        explanation=f"Retail outlet {did} rolls up commercial sales volume to parent entity {parent_id}.",
                    )
                    g.add_edge(
                        f"DEALER_{parent_id}",
                        f"DEALER_{did}",
                        key="PARENT_OF",
                        edge_type="PARENT_OF",
                        child_id=did,
                        parent_id=parent_id,
                        explanation=f"Parent billing entity {parent_id} governs secondary branch outlet {did}.",
                    )

    # -------------------------------------------------------------------------
    # 4. Ingest Calendar Days
    # -------------------------------------------------------------------------
    calendar_file = DATA_DIR / "Planning_Calendar.csv"
    if calendar_file.exists():
        with open(calendar_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                d_str = r["date"].strip()
                is_work = r.get("working_day", "").strip().lower() == "yes"
                g.add_node(
                    f"DAY_{d_str}",
                    node_type="CalendarDay",
                    label=d_str,
                    date=d_str,
                    weekday=r.get("weekday", ""),
                    working_day=is_work,
                )

    # Ingest Daily Weather Logs from seed 1 simulation
    daily_sim_file = RESULTS_DIR / "daily.csv"
    if daily_sim_file.exists():
        with open(daily_sim_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                d_str = r["date"].strip()
                so_id = r["so_id"].strip()
                day_node = f"DAY_{d_str}"
                if day_node in g:
                    g.nodes[day_node][f"weather_{so_id}"] = r.get("weather", "clear")
                    g.nodes[day_node][f"planned_{so_id}"] = int(r.get("planned") or 0)
                    g.nodes[day_node][f"completed_{so_id}"] = int(r.get("completed") or 0)

    # -------------------------------------------------------------------------
    # 5. Ingest Scheme Targets & Slabs
    # -------------------------------------------------------------------------
    targets_file = DATA_DIR / "scheme_targets.csv"
    if targets_file.exists():
        with open(targets_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                pid = r.get("parent_dealer_id", "").strip()
                slab_name = r.get("slab", "").strip()
                target_pts = float(r.get("slab_target_points") or 0.0)
                if not pid or not slab_name:
                    continue

                slab_node_id = f"SLAB_CLUB_{slab_name}"
                if slab_node_id not in g:
                    g.add_node(
                        slab_node_id,
                        node_type="SchemeSlab",
                        label=f"Club {slab_name}",
                        slab=slab_name,
                        target_points=target_pts,
                        scheme_type="Club Annual",
                    )

                if f"DEALER_{pid}" in g:
                    g.add_edge(
                        f"DEALER_{pid}",
                        slab_node_id,
                        key=f"TARGETS_{slab_name}",
                        edge_type="TARGETS_SLAB",
                        target_points=target_pts,
                        explanation=f"Entity {pid} targets {slab_name} with threshold {target_pts:,.0f} points for annual bonus payout.",
                    )

    # -------------------------------------------------------------------------
    # 6. Ingest Journey Plan & Tour Edges
    # -------------------------------------------------------------------------
    plan_file = BASE_DIR / "plan_november.csv"
    if plan_file.exists():
        daily_tours: Dict[Tuple[str, str], List[dict]] = defaultdict(list)
        with open(plan_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                daily_tours[(r["date"], r["so_id"])].append(r)

        for (d_str, so_id), stops in daily_tours.items():
            stops.sort(key=lambda s: int(s["sequence"]))
            officer_info = officers.get(so_id, {})
            base_coord = officer_info.get("base_coord", (12.93957, 77.49507))
            speed = officer_info.get("speed_kmh", 18.0)

            prev_node = f"BASE_{so_id}"
            prev_coord = base_coord

            for stop in stops:
                did = stop["account_id"]
                seq = int(stop["sequence"])
                arr = stop.get("planned_arrival", "")
                t_min = float(stop.get("travel_min_from_previous") or 0.0)
                reason = stop.get("reason", "Focus Visit")
                dealer_node = f"DEALER_{did}"

                # Edge: Dealer -> SCHEDULED_ON -> Day
                day_node = f"DAY_{d_str}"
                if dealer_node in g and day_node in g:
                    g.add_edge(
                        dealer_node,
                        day_node,
                        key=f"SCHEDULED_{d_str}_{seq}",
                        edge_type="SCHEDULED_ON",
                        so_id=so_id,
                        sequence=seq,
                        planned_arrival=arr,
                        travel_min=t_min,
                        reason=reason,
                        explanation=f"Stop {seq}: {did} scheduled on {d_str} at {arr} (+{t_min:.1f}m travel). Rationale: {reason}.",
                    )

                # Edge: Spatial Tour Transition (Prev Stop -> Next Stop)
                curr_coord = dealers.get(did, {}).get("coord")
                dist_km = (
                    round(haversine_km(prev_coord, curr_coord) * 1.35, 2)
                    if (prev_coord and curr_coord)
                    else 0.0
                )

                if prev_node in g and dealer_node in g:
                    g.add_edge(
                        prev_node,
                        dealer_node,
                        key=f"TOUR_{d_str}_{seq}",
                        edge_type="TOUR_LEG",
                        date=d_str,
                        so_id=so_id,
                        sequence=seq,
                        distance_km=dist_km,
                        travel_min=t_min,
                        speed_kmh=speed,
                        arrival_time=arr,
                        explanation=f"Tour transition on {d_str} to Stop {seq} ({did}): {dist_km} km detour ({t_min:.1f} min @ {speed} km/h), arrival {arr}.",
                    )

                prev_node = dealer_node
                if curr_coord:
                    prev_coord = curr_coord

    # -------------------------------------------------------------------------
    # 7. Ingest WhatsApp Nudges
    # -------------------------------------------------------------------------
    nudges_file = BASE_DIR / "whatsapp_nudges.json"
    if nudges_file.exists():
        with open(nudges_file, mode="r", encoding="utf-8") as f:
            nudges = json.load(f)
            for n in nudges:
                n_id = n["nudge_id"]
                did = n["dealer_id"]
                nudge_node = f"NUDGE_{n_id}"

                g.add_node(
                    nudge_node,
                    node_type="WhatsAppNudge",
                    label=f"Nudge {n_id}",
                    nudge_id=n_id,
                    dealer_id=did,
                    so_id=n["so_id"],
                    visit_date=n["visit_date"],
                    trigger_type=n["trigger_type"],
                    message=n["message"],
                    character_count=n["character_count"],
                    grounding_data=n["grounding_data"],
                )

                if f"DEALER_{did}" in g:
                    g.add_edge(
                        f"DEALER_{did}",
                        nudge_node,
                        key="HAS_NUDGE",
                        edge_type="HAS_NUDGE",
                        trigger_type=n["trigger_type"],
                        visit_date=n["visit_date"],
                        explanation=f"Pre-visit intelligence sent evening before {n['visit_date']}: '{n['message']}'",
                    )

    # -------------------------------------------------------------------------
    # 8. Ingest Simulation Telemetry & Anomaly Events (Seed 1)
    # -------------------------------------------------------------------------
    events_file = RESULTS_DIR / "events_revealed.csv"
    if events_file.exists():
        with open(events_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                did = r["dealer_id"]
                etype = r["type"].upper()
                onset = r["onset"]
                end = r.get("end", "")
                first_visit = r.get("first_visit_after_onset", "")
                event_node = f"EVENT_{etype}_{did}"

                g.add_node(
                    event_node,
                    node_type="AnomalyEvent",
                    label=f"{etype}: {did}",
                    event_type=etype,
                    dealer_id=did,
                    onset=onset,
                    end=end,
                    first_visit_after_onset=first_visit,
                )

                if f"DEALER_{did}" in g:
                    g.add_edge(
                        f"DEALER_{did}",
                        event_node,
                        key=f"EVENT_{etype}",
                        edge_type="SUFFERED_EVENT",
                        event_type=etype,
                        onset=onset,
                        explanation=f"Dealer {did} experienced a hidden sales {etype} starting on {onset} (first recovered: {first_visit or 'None'}).",
                    )

    # Export graph cache as structured JSON
    export_graph_json(g, GRAPH_CACHE_FILE)
    return g


def export_graph_json(g: nx.MultiDiGraph, out_path: Path):
    """Serialize graph into JSON dictionary for caching and fast deserialization."""
    nodes_data = []
    for node_id, attrs in g.nodes(data=True):
        entry = {"id": node_id}
        entry.update(attrs)
        nodes_data.append(entry)

    edges_data = []
    for u, v, key, attrs in g.edges(keys=True, data=True):
        entry = {"source": u, "target": v, "key": key}
        entry.update(attrs)
        edges_data.append(entry)

    payload = {
        "metadata": {
            "node_count": g.number_of_nodes(),
            "edge_count": g.number_of_edges(),
            "description": "Permanent Journey Plan (PJP) Edge-Explained Knowledge Graph",
        },
        "nodes": nodes_data,
        "edges": edges_data,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, mode="w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def load_pjp_knowledge_graph() -> nx.MultiDiGraph:
    """Load cached knowledge graph or build fresh if missing."""
    if GRAPH_CACHE_FILE.exists():
        try:
            with open(GRAPH_CACHE_FILE, mode="r", encoding="utf-8") as f:
                data = json.load(f)
            g = nx.MultiDiGraph()
            for n in data.get("nodes", []):
                nid = n["id"]
                attrs = {k: v for k, v in n.items() if k != "id"}
                g.add_node(nid, **attrs)
            for e in data.get("edges", []):
                u = e["source"]
                v = e["target"]
                k = e.get("key", "edge")
                attrs = {k2: v2 for k2, v2 in e.items() if k2 not in ("source", "target", "key")}
                g.add_edge(u, v, key=k, **attrs)
            return g
        except Exception:
            pass
    return build_pjp_knowledge_graph()


if __name__ == "__main__":
    print("-" * 65)
    print("Building PJP-Graphify Knowledge Graph ...")
    print("-" * 65)
    graph = build_pjp_knowledge_graph()
    print(f"Total Nodes: {graph.number_of_nodes()}")
    print(f"Total Edges: {graph.number_of_edges()}")
    print(f"Exported To: {GRAPH_CACHE_FILE}")
    print("-" * 65)
