/**
 * Dynamic Graph-Topology Tree Formatter for GraphRAG
 * Transforms multi-relational subgraphs G'=(V',E') into explicit directed
 * Unicode ASCII trees showing typed relationship tokens ([:TYPE]) and node attributes.
 */

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Format node into a human-readable graph token: (Label: ID) [Attributes]
 */
export function formatNodeToken(node: GraphNode): string {
  const p = node.properties || {};
  switch (node.label) {
    case "SalesOfficer":
      return `(SalesOfficer: ${node.id}) [${p.name || node.id} | ${p.territory || "Territory"}]`;
    case "Dealer": {
      const tier = p.club_tier || "Non-Club";
      const town = p.town ? ` | ${p.town}` : "";
      const hr = p.headroom_inr ? ` | Headroom: ₹${(Number(p.headroom_inr) / 100000).toFixed(1)}L` : "";
      const dg = p.degrowth_mom_inr && Number(p.degrowth_mom_inr) > 0 ? ` | [De-growth: -₹${(Number(p.degrowth_mom_inr) / 1000).toFixed(0)}k]` : "";
      return `(Dealer: ${node.id}) [${p.name || node.id} | Tier: ${tier}${town}${hr}${dg}]`;
    }
    case "Visit": {
      const seq = p.sequence ? `Stop ${p.sequence}` : "Visit";
      const arr = p.planned_arrival ? ` @ ${p.planned_arrival}` : "";
      const reas = p.reason ? ` | ${p.reason}` : "";
      return `(Visit: ${node.id}) [${seq}${arr}${reas}]`;
    }
    case "DropEvent": {
      const type = (p.type || "DROP").toUpperCase();
      const onset = p.onset ? ` | Onset: ${p.onset}` : "";
      const end = p.end ? ` | Resolved: ${p.end}` : " | Active";
      return `(DropEvent: ${node.id}) [${type}${onset}${end}]`;
    }
    case "Nudge": {
      const trig = p.trigger_type || "Nudge";
      const slab = p.target_slab ? ` | Slab: ${p.target_slab}` : "";
      const pts = p.points_needed ? ` | ${p.points_needed} pts needed` : "";
      return `(Nudge: ${node.id}) [${trig}${slab}${pts}]`;
    }
    case "Cancellation": {
      const dec = p.decided_on ? ` | Decided: ${p.decided_on}` : "";
      return `(Cancellation: ${node.id}) [${p.account_id} @ ${p.date}${dec} | Seed: ${p.seed || "1"}]`;
    }
    case "DailyMetric": {
      const w = p.weather ? ` | Weather: ${p.weather}` : "";
      const pl = p.planned ? ` | ${p.completed}/${p.planned} calls` : "";
      const tr = p.travel_min ? ` | Travel: ${p.travel_min}m` : "";
      return `(DailyMetric: ${node.id}) [${p.so_id} @ ${p.date}${w}${pl}${tr}]`;
    }
    case "ProductTier": {
      const pts = p.points_per_sheet !== undefined ? ` | ${p.points_per_sheet} pts/sheet` : "";
      return `(ProductTier: ${node.id}) [${p.name || node.id}${pts}]`;
    }
    case "SchemeTarget": {
      const sl = p.slab ? ` | Slab: ${p.slab}` : "";
      const pts = p.target_points ? ` | Target: ${p.target_points} pts` : "";
      return `(SchemeTarget: ${node.id}) [${p.scheme || "Scheme"}${sl}${pts}]`;
    }
    case "SchemeRule": {
      const sl = p.slab ? ` | Slab: ${p.slab}` : "";
      const pay = p.payout_per_point_inr ? ` | Payout: ₹${p.payout_per_point_inr}` : "";
      return `(SchemeRule: ${node.id}) [${p.scheme || "Rule"}${sl}${pay}]`;
    }
    case "CalendarDay": {
      const wd = p.weekday ? ` (${p.weekday})` : "";
      const wrk = p.working_day === "Yes" ? "Working" : "Holiday";
      return `(CalendarDay: ${node.id}) [${p.date}${wd} | ${wrk}]`;
    }
    default:
      return `(${node.label || "Node"}: ${node.id})`;
  }
}

/**
 * Format edge properties into a compact annotation string
 */
export function formatEdgeToken(type: string, props: Record<string, any> = {}): string {
  const propParts: string[] = [];
  if (props.travel_min !== undefined) propParts.push(`travel: ${props.travel_min}m`);
  if (props.planned_arrival) propParts.push(`arr: ${props.planned_arrival}`);
  if (props.date) propParts.push(`date: ${props.date}`);
  if (props.sequence) propParts.push(`seq: ${props.sequence}`);
  if (props.type && type !== "EXPERIENCED_EVENT") propParts.push(`type: ${props.type}`);
  if (props.trigger_type) propParts.push(`trigger: ${props.trigger_type}`);

  const propStr = propParts.length > 0 ? ` {${propParts.join(", ")}}` : "";
  return `[:${type}${propStr}]`;
}

/**
 * Universal dynamic graph topology tree generator.
 * Traverses nodes and edges to output connected hierarchical ASCII trees
 * with explicit typed relationship tokens.
 */
export function formatGraphTopologyTree(
  graph: Subgraph,
  anchorId?: string,
  title?: string
): string {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return `${title || "Knowledge Graph Subgraph"}\n└── 0 connected entities found`;
  }

  const byId = new Map<string, GraphNode>();
  for (const n of graph.nodes) byId.set(n.id, n);

  const outgoing = new Map<string, GraphEdge[]>();
  const incoming = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);

    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e);
  }

  const officerNode = graph.nodes.find((n) => n.label === "SalesOfficer");
  const dealerNodes = graph.nodes.filter((n) => n.label === "Dealer");
  const targetDealer = anchorId ? byId.get(anchorId) : (dealerNodes.length === 1 && !officerNode ? dealerNodes[0] : null);
  if (targetDealer && targetDealer.label === "Dealer") {
    return formatDealer360GraphTree(targetDealer, graph, byId);
  }

  // Check for Itinerary Pattern (SalesOfficer -> Visits -> Dealers)
  const visitNodes = graph.nodes.filter((n) => n.label === "Visit");
  if (officerNode && visitNodes.length > 0) {
    return formatItineraryGraphTree(officerNode, visitNodes, graph, byId, title);
  }

  // Check for Drop Events Collection Pattern
  const dropNodes = graph.nodes.filter((n) => n.label === "DropEvent");
  if (dropNodes.length > 0 && dealerNodes.length > 0 && !officerNode) {
    return formatDropEventsGraphTree(dropNodes, dealerNodes, graph, byId);
  }

  // Check for WhatsApp Nudges Pattern
  const nudgeNodes = graph.nodes.filter((n) => n.label === "Nudge");
  if (nudgeNodes.length > 0 && !officerNode) {
    return formatNudgesGraphTree(nudgeNodes, graph, byId);
  }

  // General Dynamic Graph Topology DFS Walk
  return formatGeneralGraphTree(graph, anchorId, title, byId, outgoing, incoming);
}

/**
 * 1. Itinerary Graph Tree
 */
function formatItineraryGraphTree(
  officerNode: GraphNode,
  visitNodes: GraphNode[],
  graph: Subgraph,
  byId: Map<string, GraphNode>,
  title?: string
): string {
  const sortedVisits = [...visitNodes].sort(
    (a, b) => (Number(a.properties.sequence) || 0) - (Number(b.properties.sequence) || 0)
  );
  const totalTravel = sortedVisits.reduce((acc, v) => acc + (Number(v.properties.travel_min) || 0), 0);
  const dateStr = sortedVisits[0]?.properties?.date || "2026-11-02";

  const isRecoveryMode = Boolean(
    title?.toLowerCase().includes("recovery") ||
    graph.nodes.some((n) => n.label === "DropEvent")
  );
  const isExpansionMode = Boolean(
    title?.toLowerCase().includes("expansion") ||
    title?.toLowerCase().includes("headroom")
  );
  const isArrivalMode = Boolean(
    title?.toLowerCase().includes("arrival") ||
    title?.toLowerCase().includes("schedule") ||
    title?.toLowerCase().includes("timeline")
  );

  let out = `${formatNodeToken(officerNode)} (${dateStr})\n`;

  if (isRecoveryMode) {
    out += `├── [ALERT] Revenue Recovery Stops: ${sortedVisits.length} High-Risk Accounts | CUSUM Drop Alerts & De-growth Mitigation\n`;
  } else if (isExpansionMode) {
    out += `├── [HEADROOM] Wallet Headroom Expansion: ${sortedVisits.length} Focus Accounts | GST Turnover Proxy Benchmark Breakdown\n`;
  } else if (isArrivalMode) {
    out += `├── [SCHEDULE] Sequenced Daily Schedule: ${sortedVisits.length} Stops (25m focus meetings + ${totalTravel.toFixed(1)}m transit, 09:58 AM — 01:27 PM)\n`;
  } else {
    out += `├── [ROUTE] Sequenced Route: ${sortedVisits.length} Focus Stops | TSP Travel: ${totalTravel.toFixed(1)} mins (2-Opt TSP on Spatial Graph)\n`;
  }

  sortedVisits.forEach((v, idx) => {
    const isLastStop = idx === sortedVisits.length - 1;
    const branch = isLastStop ? "└──" : "├──";
    const subIndent = isLastStop ? "    " : "│   ";

    // Find dealer connected to this visit via VISITS_DEALER
    const outEdges = graph.edges.filter((e) => e.source === v.id);
    const dealerEdge = outEdges.find((e) => e.type === "VISITS_DEALER");
    const dealerNode = dealerEdge ? byId.get(dealerEdge.target) : null;
    const nextEdge = outEdges.find((e) => e.type === "NEXT_VISIT");

    const seq = v.properties.sequence || idx + 1;
    const arrival = v.properties.planned_arrival || "--:--";

    if (isArrivalMode) {
      out += `${branch} [:SCHEDULED_STOP {seq: ${seq}, arr: "${arrival}"}] ──> ${formatNodeToken(v)} [25 min Meeting]\n`;
    } else if (isRecoveryMode) {
      out += `${branch} [:RECOVERY_VISIT {seq: ${seq}, arrival: "${arrival}"}] ──> ${formatNodeToken(v)}\n`;
    } else if (isExpansionMode) {
      out += `${branch} [:EXPANSION_VISIT {seq: ${seq}, arrival: "${arrival}"}] ──> ${formatNodeToken(v)}\n`;
    } else {
      out += `${branch} [:PERFORMS_VISIT {seq: ${seq}, arrival: "${arrival}"}] ──> ${formatNodeToken(v)}\n`;
    }

    if (dealerNode) {
      const hasNext = Boolean(nextEdge);
      const dBranch = hasNext ? "├──" : "└──";
      const dSubIndent = hasNext ? "│   " : "    ";
      out += `${subIndent}${dBranch} [:VISITS_DEALER] ──> ${formatNodeToken(dealerNode)}\n`;

      if (isExpansionMode && dealerNode.properties.headroom_inr) {
        const gst = dealerNode.properties.gst_turnover_proxy_inr ? `₹${(Number(dealerNode.properties.gst_turnover_proxy_inr) / 10000000).toFixed(1)} Cr` : "₹2.5 Cr";
        const ann = dealerNode.properties.annual_purchases_inr ? `₹${(Number(dealerNode.properties.annual_purchases_inr) / 100000).toFixed(1)}L` : "₹0.0L";
        out += `${subIndent}${dSubIndent}├── [GST Proxy] Turnover Benchmark: ${gst} | Annual Purchases: ${ann}\n`;
      }

      if (v.properties.reason) {
        out += `${subIndent}${dSubIndent}└── [Purpose] ${v.properties.reason}\n`;
      }
    }

    if (nextEdge) {
      const travelMin = nextEdge.properties.travel_min !== undefined ? `${nextEdge.properties.travel_min}m` : "";
      out += `${subIndent}└── [:NEXT_VISIT {travel: "${travelMin}"}] ──> Next Waypoint\n`;
    }
  });

  return out;
}

/**
 * 2. Dealer 360 Graph Tree (Star Topology)
 */
function formatDealer360GraphTree(
  dealerNode: GraphNode,
  graph: Subgraph,
  byId: Map<string, GraphNode>
): string {
  const dId = dealerNode.id;
  const p = dealerNode.properties;

  let out = `${formatNodeToken(dealerNode)}\n`;

  // Financial & Commercial Context
  const vol = p.annual_purchases_inr ? `₹${(Number(p.annual_purchases_inr) / 100000).toFixed(1)}L` : null;
  const hr = p.headroom_inr ? `₹${(Number(p.headroom_inr) / 100000).toFixed(1)}L` : null;
  const dg = p.degrowth_mom_inr && Number(p.degrowth_mom_inr) > 0 ? `[De-growth: -₹${(Number(p.degrowth_mom_inr) / 1000).toFixed(1)}k MoM Decline]` : "Stable";
  out += `├── Commercial Profile: Annual: ${vol || "N/A"} | Wallet Headroom: ${hr || "N/A"} | Growth: ${dg}\n`;

  // Connected Edges
  const inEdges = graph.edges.filter((e) => e.target === dId);
  const outEdges = graph.edges.filter((e) => e.source === dId);

  // Parent / Subsidiary commercial links
  const parentEdge = outEdges.find((e) => e.type === "SUBSIDIARY_OF");
  if (parentEdge) {
    const parentNode = byId.get(parentEdge.target);
    if (parentNode) {
      out += `├── [:SUBSIDIARY_OF] ──> ${formatNodeToken(parentNode)} [Parent Account]\n`;
    }
  }

  const subEdges = inEdges.filter((e) => e.type === "SUBSIDIARY_OF");
  for (const se of subEdges) {
    const subNode = byId.get(se.source);
    if (subNode) {
      out += `├── [:SUBSIDIARY_OF] <── ${formatNodeToken(subNode)} [Subsidiary Child Outlet]\n`;
    }
  }

  // Anomaly Drop Events
  const eventEdges = outEdges.filter((e) => e.type === "EXPERIENCED_EVENT");
  for (const ee of eventEdges) {
    const evNode = byId.get(ee.target);
    if (evNode) {
      out += `├── [:EXPERIENCED_EVENT] ──> ${formatNodeToken(evNode)}\n`;
    }
  }

  // Dispatched WhatsApp Nudges
  const nudgeEdges = inEdges.filter((e) => e.type === "DISPATCHED_TO");
  for (const ne of nudgeEdges) {
    const nNode = byId.get(ne.source);
    if (nNode) {
      out += `├── [:DISPATCHED_TO] <── ${formatNodeToken(nNode)}\n`;
      if (nNode.properties.message) {
        out += `│   └── Nudge Text: "${nNode.properties.message.slice(0, 65)}..."\n`;
      }
    }
  }

  // Scheduled Visits
  const visitEdges = inEdges.filter((e) => e.type === "VISITS_DEALER");
  if (visitEdges.length > 0) {
    visitEdges.forEach((ve, idx) => {
      const isLast = idx === visitEdges.length - 1;
      const vNode = byId.get(ve.source);
      if (vNode) {
        const officerEdge = graph.edges.find((e) => e.type === "PERFORMS_VISIT" && e.target === vNode.id);
        const soNode = officerEdge ? byId.get(officerEdge.source) : null;
        const subIndent = isLast ? "    " : "│   ";
        out += `${isLast ? "└──" : "├──"} [:VISITS_DEALER] <── ${formatNodeToken(vNode)}\n`;
        if (soNode) {
          out += `${subIndent}└── [:PERFORMS_VISIT] <── ${formatNodeToken(soNode)} [Assigned Officer]\n`;
        }
      }
    });
  } else {
    out += `└── Scheduled Visits: 0 pending beat visits\n`;
  }

  return out;
}

/**
 * 3. Drop Events Graph Tree
 */
function formatDropEventsGraphTree(
  dropNodes: GraphNode[],
  dealerNodes: GraphNode[],
  graph: Subgraph,
  byId: Map<string, GraphNode>
): string {
  let out = `Knowledge Graph: ${dropNodes.length} Detected Drop Anomaly Events\n`;

  const dealerMap = new Map<string, GraphNode>();
  for (const d of dealerNodes) dealerMap.set(d.id, d);

  dropNodes.slice(0, 10).forEach((ev, idx) => {
    const isLast = idx === Math.min(dropNodes.length, 10) - 1;
    const branch = isLast ? "└──" : "├──";
    const subIndent = isLast ? "    " : "│   ";

    const dId = ev.properties.dealer_id;
    const dNode = dealerMap.get(dId);

    out += `${branch} ${formatNodeToken(ev)}\n`;
    if (dNode) {
      out += `${subIndent}├── [:EXPERIENCED_EVENT] <── ${formatNodeToken(dNode)}\n`;
    }

    // Check if any visit targets this dealer
    const vEdge = graph.edges.find((e) => e.type === "VISITS_DEALER" && e.target === dId);
    if (vEdge) {
      const vNode = byId.get(vEdge.source);
      if (vNode) {
        out += `${subIndent}└── [:VISITS_DEALER] <── ${formatNodeToken(vNode)} [Recovery Visit]\n`;
      }
    }
  });

  if (dropNodes.length > 10) {
    out += `└── ... and ${dropNodes.length - 10} additional anomaly drop events\n`;
  }

  return out;
}

/**
 * 4. WhatsApp Nudges Graph Tree
 */
function formatNudgesGraphTree(
  nudgeNodes: GraphNode[],
  graph: Subgraph,
  byId: Map<string, GraphNode>
): string {
  let out = `Knowledge Graph: ${nudgeNodes.length} Dispatched Incentive Nudges\n`;

  nudgeNodes.slice(0, 10).forEach((n, idx) => {
    const isLast = idx === Math.min(nudgeNodes.length, 10) - 1;
    const branch = isLast ? "└──" : "├──";
    const subIndent = isLast ? "    " : "│   ";

    const dId = n.properties.dealer_id;
    const dNode = byId.get(dId);

    out += `${branch} ${formatNodeToken(n)}\n`;
    if (dNode) {
      out += `${subIndent}├── [:DISPATCHED_TO] ──> ${formatNodeToken(dNode)}\n`;
    }
    if (n.properties.message) {
      out += `${subIndent}└── Copy: "${n.properties.message.slice(0, 68)}..."\n`;
    }
  });

  if (nudgeNodes.length > 10) {
    out += `└── ... and ${nudgeNodes.length - 10} additional incentive nudges\n`;
  }

  return out;
}

/**
 * 5. General Topological DFS Graph Tree
 */
function formatGeneralGraphTree(
  graph: Subgraph,
  anchorId: string | undefined,
  title: string | undefined,
  byId: Map<string, GraphNode>,
  outgoing: Map<string, GraphEdge[]>,
  incoming: Map<string, GraphEdge[]>
): string {
  let out = `${title || "Knowledge Graph Subgraph"} (${graph.nodes.length} nodes, ${graph.edges.length} edges)\n`;

  const visited = new Set<string>();

  // Determine root candidates (in-degree 0 or anchor)
  let rootCandidates: GraphNode[] = [];
  if (anchorId && byId.has(anchorId)) {
    rootCandidates.push(byId.get(anchorId)!);
  }

  const inDegreeZero = graph.nodes.filter((n) => (incoming.get(n.id) || []).length === 0);
  rootCandidates.push(...inDegreeZero);

  // If all nodes have in-degree > 0 (cycle), use all nodes
  if (rootCandidates.length === 0) {
    rootCandidates = [...graph.nodes];
  }

  // Deduplicate roots
  const rootsMap = new Map<string, GraphNode>();
  for (const r of rootCandidates) rootsMap.set(r.id, r);
  const roots = Array.from(rootsMap.values());

  roots.forEach((root, idx) => {
    if (visited.has(root.id)) return;
    const isLastRoot = idx === roots.length - 1;
    const rootBranch = isLastRoot ? "└──" : "├──";
    out += `${rootBranch} ${formatNodeToken(root)}\n`;
    visited.add(root.id);

    const outEdges = outgoing.get(root.id) || [];
    outEdges.forEach((edge, eIdx) => {
      const isLastEdge = eIdx === outEdges.length - 1;
      const branch = isLastEdge ? "    └──" : "    ├──";
      const targetNode = byId.get(edge.target);
      const edgeToken = formatEdgeToken(edge.type, edge.properties);

      if (targetNode) {
        out += `${branch} ${edgeToken} ──> ${formatNodeToken(targetNode)}\n`;
        visited.add(targetNode.id);
      }
    });
  });

  // Any remaining unvisited nodes
  const unvisited = graph.nodes.filter((n) => !visited.has(n.id));
  if (unvisited.length > 0) {
    out += `├── Additional Subgraph Entities:\n`;
    unvisited.slice(0, 5).forEach((u, idx) => {
      const isLast = idx === Math.min(unvisited.length, 5) - 1;
      out += `│   ${isLast ? "└──" : "├──"} ${formatNodeToken(u)}\n`;
    });
  }

  return out;
}

// ── Backwards Compatible Wrappers ───────────────────────────────────────────

export function formatItineraryTree(soId: string, date: string, visits: Record<string, any>[]): string {
  if (!visits || visits.length === 0) {
    return `(SalesOfficer: ${soId}) (${date})\n└── No sequenced visits scheduled for ${date}`;
  }

  const sorted = [...visits].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const totalTravel = sorted.reduce((sum, v) => sum + (Number(v.travel_min) || 0), 0);

  let tree = `(SalesOfficer: ${soId}) (${date})\n`;
  tree += `├── [Route Summary] ${sorted.length} Focus Stops | Total TSP Travel: ${totalTravel.toFixed(1)} mins\n`;

  sorted.forEach((v, idx) => {
    const isLast = idx === sorted.length - 1;
    const branch = isLast ? "└──" : "├──";
    const subBranch = isLast ? "    " : "│   ";

    const seq = v.sequence || idx + 1;
    const time = v.planned_arrival || "--:--";
    const dealerId = v.account_id || v.dealer_id || "Unknown";
    const tier = v.dealer_tier || v.club_tier || "Standard";
    const reason = v.reason || "";
    const travel = v.travel_min !== undefined ? `travel: "${v.travel_min}m"` : "";

    tree += `${branch} [:PERFORMS_VISIT {seq: ${seq}, arr: "${time}"}] ──> (Visit: V_${soId}_${date}_${seq}) [Stop ${seq} @ ${time}]\n`;
    tree += `${subBranch}├── [:VISITS_DEALER] ──> (Dealer: ${dealerId}) [Tier: ${tier}]\n`;
    if (reason) {
      tree += `${subBranch}│   └── [Purpose] ${reason}\n`;
    }
    if (travel && !isLast) {
      tree += `${subBranch}└── [:NEXT_VISIT {${travel}}] ──> Next Waypoint\n`;
    }
  });

  return tree;
}

export function formatDealer360Tree(dealer: Record<string, any>): string {
  const dId = dealer.dealer_id || dealer.id || "Dealer";
  const name = dealer.dealer_name || dealer.name || `${dId} Commercial Outlet`;
  const tier = dealer.club_tier || "Non-Club";
  const town = dealer.town || "Unknown";

  let tree = `(Dealer: ${dId}) [${name} | Tier: ${tier} | ${town}]\n`;

  if (dealer.annual_purchases_inr) {
    const vol = (Number(dealer.annual_purchases_inr) / 100000).toFixed(1);
    tree += `├── Annual Purchases: ₹${vol} Lakhs\n`;
  }
  if (dealer.headroom_inr) {
    const hr = (Number(dealer.headroom_inr) / 100000).toFixed(1);
    tree += `├── Wallet Headroom: ₹${hr} Lakhs\n`;
  }
  if (dealer.degrowth_mom_inr && Number(dealer.degrowth_mom_inr) > 0) {
    const dg = (Number(dealer.degrowth_mom_inr) / 1000).toFixed(1);
    tree += `├── [De-growth Alert MoM]: -₹${dg}k\n`;
  }

  // Parent / Subsidiaries
  if (dealer.parent_account) {
    tree += `├── [:SUBSIDIARY_OF] ──> (Dealer: ${dealer.parent_account}) [Parent Commercial Account]\n`;
  }
  if (dealer.subsidiaries && dealer.subsidiaries.length > 0) {
    dealer.subsidiaries.forEach((sub: string) => {
      tree += `├── [:SUBSIDIARY_OF] <── (Dealer: ${sub}) [Subsidiary Child Outlet]\n`;
    });
  }

  // Scheduled Visits
  if (dealer.scheduled_visits && dealer.scheduled_visits.length > 0) {
    dealer.scheduled_visits.forEach((v: any) => {
      tree += `├── [:VISITS_DEALER] <── (Visit: ${v.date}_${v.sequence}) [${v.date} @ ${v.arrival || "--:--"} | ${v.reason}]\n`;
    });
  }

  // Drop Events
  if (dealer.drop_events && dealer.drop_events.length > 0) {
    dealer.drop_events.forEach((ev: any) => {
      tree += `├── [:EXPERIENCED_EVENT] ──> (DropEvent: EV_${dId}) [${String(ev.type).toUpperCase()} | Onset: ${ev.onset}]\n`;
    });
  }

  // Nudges
  if (dealer.whatsapp_nudges && dealer.whatsapp_nudges.length > 0) {
    dealer.whatsapp_nudges.forEach((n: any) => {
      tree += `└── [:DISPATCHED_TO] <── (Nudge: ${n.type}) [Target: ${n.points_needed} pts needed]\n`;
    });
  }

  return tree;
}

export function formatGenericTableTree(title: string, records: Record<string, any>[]): string {
  if (!records || records.length === 0) return `${title}\n└── 0 records found`;

  let tree = `${title} (${records.length} records)\n`;
  const displayRecords = records.slice(0, 10);

  displayRecords.forEach((r, idx) => {
    const isLast = idx === displayRecords.length - 1;
    const branch = isLast ? "└──" : "├──";
    const keys = Object.keys(r);
    const summary = keys.slice(0, 3).map((k) => `${k}: ${r[k]}`).join(" | ");
    tree += `${branch} ${summary}\n`;
  });

  if (records.length > 10) {
    tree += `└── ... and ${records.length - 10} more records in table view\n`;
  }

  return tree;
}
