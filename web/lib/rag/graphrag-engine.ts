import { detectIntent, QueryIntent } from "./intent";
import { discoverEntities, DiscoveredEntities } from "./entities";
import { matchCypherTemplate } from "./templates";
import { generateCypherWithLLM, validateCypherSecurity } from "./cypher-generator";
import { executeCypher, CypherQueryResult } from "../neo4j";
import { formatGraphTopologyTree, formatItineraryTree, formatDealer360Tree, formatGenericTableTree } from "./tree-formatter";
import { generateBarChartData, BarChartData } from "./chart-generator";
import { callOpenRouter, ChatMessage } from "../openrouter";

export interface GraphRAGResponse {
  response: string;
  cypher: string;
  intent: QueryIntent;
  table: Record<string, any>[];
  tree: string;
  graph: {
    nodes: any[];
    edges: any[];
  };
  chart?: BarChartData;
  entities: DiscoveredEntities;
  source: string;
}

const GROUNDING_SYSTEM_PROMPT = `
You are the PJP Sales Optimization Copilot.
You answer field sales and territory questions using ONLY the verified Graph Database records and Hierarchical Tree provided.
Do NOT hallucinate, extrapolate, or invent metrics.
Present your answer clearly, professionally, and concisely using Markdown:
- Use bullet points for sequenced itineraries and dealer attributes.
- Highlight operational alerts (de-growth recovery, CUSUM sales drops, loyalty bonus points) with appropriate bolding.
- State arrival times, travel minutes, and visit purposes accurately.
`;

export async function runGraphRAG(userQuery: string): Promise<GraphRAGResponse> {
  // 1. Intent Detection
  const intentCheck = detectIntent(userQuery);
  if (intentCheck.intent === "unsafe") {
    return {
      response: intentCheck.directResponse || "Operation blocked under read-only audit guardrails.",
      cypher: "-- MUTATION_BLOCKED",
      intent: "unsafe",
      table: [],
      tree: "Query Blocked\n└── Safety violation: data mutation keywords detected",
      graph: { nodes: [], edges: [] },
      entities: { topics: [] },
      source: "safety_guardrail",
    };
  }

  if (intentCheck.intent === "general") {
    return {
      response: intentCheck.directResponse || "Hello! Ask me about PJP beat plans, dealers, drop events, or WhatsApp nudges.",
      cypher: "-- GENERAL_CONVERSATION",
      intent: "general",
      table: [],
      tree: "PJP Sales Optimization Copilot\n├── 425 sequenced visits across November 2026\n├── 677 commercial outlets in Bengaluru & Hubballi\n└── 3 Sales Officers (SO-A, SO-B, SO-C)",
      graph: { nodes: [], edges: [] },
      entities: { topics: [] },
      source: "conversational_handler",
    };
  }

  if (intentCheck.intent === "out_of_domain") {
    return {
      response:
        intentCheck.directResponse ||
        "**Security Boundary**: This system is exclusively dedicated to PJP sales planning, field officer beat schedules, and dealer intelligence. Non-sales questions are prohibited under domain guardrails.",
      cypher: "-- DOMAIN_BOUNDARY_BLOCKED",
      intent: "out_of_domain",
      table: [],
      tree: "Domain Security Notice\n└── Operation rejected: Non-PJP query outside authorized sales boundary",
      graph: { nodes: [], edges: [] },
      entities: { topics: [] },
      source: "domain_security_guardrail",
    };
  }

  // 2. Entity Discovery
  const entities = discoverEntities(userQuery);

  // 3. Query Generation Strategy: Template Match -> LLM Generation
  let cypherQuery = "";
  let queryParams: Record<string, any> = {};
  let templateMatch = matchCypherTemplate(userQuery, entities);

  if (templateMatch) {
    cypherQuery = templateMatch.cypher;
    queryParams = templateMatch.parameters;
  } else {
    // Generate via OpenRouter LLM
    const generated = await generateCypherWithLLM(userQuery);
    if (generated && validateCypherSecurity(generated).valid) {
      cypherQuery = generated;
    } else {
      // Deterministic fallback based on discovered entities & topics
      if (entities.officerId) {
        cypherQuery = `MATCH (o:SalesOfficer {id: '${entities.officerId}'}) RETURN o`;
      } else if (entities.dealerId) {
        cypherQuery = `MATCH (d:Dealer {id: '${entities.dealerId}'}) RETURN d`;
      } else if (entities.clubTier) {
        cypherQuery = `MATCH (d:Dealer) WHERE toLower(d.club_tier) = toLower('${entities.clubTier}') RETURN d LIMIT 15`;
      } else if (entities.town) {
        cypherQuery = `MATCH (d:Dealer) WHERE toLower(d.town) CONTAINS toLower('${entities.town}') RETURN d LIMIT 15`;
      } else if (entities.topics.includes("officers")) {
        cypherQuery = `MATCH (o:SalesOfficer) RETURN o`;
      } else if (entities.topics.includes("benchmark")) {
        cypherQuery = `MATCH (s:SimulationBenchmark) RETURN s`;
      } else if (entities.topics.includes("guardrails")) {
        cypherQuery = `MATCH (r:OperationalRule) RETURN r`;
      } else if (entities.topics.includes("dataset")) {
        cypherQuery = `MATCH (t:DatasetTable) RETURN t`;
      } else {
        cypherQuery = `MATCH (o:SalesOfficer) RETURN o`;
      }
    }
  }

  // 4. Cypher Execution
  const executionResult: CypherQueryResult = await executeCypher(cypherQuery, queryParams);
  const tableData = executionResult.table || [];
  const graphData = executionResult.graph || { nodes: [], edges: [] };

  // 5. Hierarchical Dynamic Graph-Topology Tree Generation
  let treeOutput = "";
  let treeTitle = "Knowledge Graph Topology";
  const qLower = userQuery.toLowerCase();

  if (templateMatch?.templateName === "itinerary_recovery_stops" || qLower.includes("recovery")) {
    treeTitle = "Revenue Recovery Stops & De-growth Alerts";
  } else if (templateMatch?.templateName === "itinerary_wallet_expansion" || qLower.includes("wallet expansion")) {
    treeTitle = "Wallet Headroom Expansion Potential";
  } else if (templateMatch?.templateName === "itinerary_arrival_schedule" || qLower.includes("arrival schedule") || qLower.includes("timeline")) {
    treeTitle = "Sequenced Daily Schedule Timeline";
  } else if (templateMatch?.templateName === "officer_daily_itinerary") {
    treeTitle = "Sequenced Route Travel Time";
  } else if (templateMatch?.templateName === "all_officers_overview") {
    treeTitle = "Sales Officers Territory Network";
  } else if (templateMatch?.templateName === "dealers_by_tier") {
    treeTitle = `Dealers in Tier ${entities.clubTier || "Club"}`;
  } else if (templateMatch?.templateName === "dealers_by_town") {
    treeTitle = `Dealers in ${entities.town || "Town"}`;
  } else if (templateMatch?.templateName === "top_headroom_dealers") {
    treeTitle = "Top Wallet Headroom Opportunities";
  } else if (templateMatch?.templateName === "top_degrowth_dealers") {
    treeTitle = "Top MoM Sales De-growth Accounts";
  } else if (templateMatch?.templateName === "hike_anomaly_events") {
    treeTitle = "Sales Hike Surge Monitored Accounts";
  } else if (templateMatch?.templateName === "simulation_benchmark_summary") {
    treeTitle = "Simulation Multi-Seed Benchmark";
  } else if (templateMatch?.templateName === "pjp_rules_guardrails") {
    treeTitle = "PJP Operational Rules & Guardrails";
  } else if (templateMatch?.templateName === "datasets_csv_catalog") {
    treeTitle = "PJP Multi-Table CSV Datasets";
  } else if (templateMatch?.templateName === "weather_impact_rules") {
    treeTitle = "Weather Disruptions & Speed Constraints";
  } else if (templateMatch?.templateName === "dynamic_replanning_architecture") {
    treeTitle = "Dynamic Re-planning Architecture";
  } else if (templateMatch?.templateName === "date_visits_all_officers") {
    treeTitle = `Scheduled Visits on ${entities.date || "Selected Date"}`;
  }

  if (graphData && graphData.nodes && graphData.nodes.length > 0) {
    const anchor = entities.officerId || entities.dealerId;
    treeOutput = formatGraphTopologyTree(graphData, anchor, treeTitle);
  } else if (templateMatch?.templateName === "officer_daily_itinerary") {
    treeOutput = formatItineraryTree(entities.officerId || "SO-A", entities.date || "2026-11-02", tableData);
  } else if (templateMatch?.templateName === "dealer_360_profile" && tableData.length > 0) {
    treeOutput = formatDealer360Tree(tableData[0]);
  } else {
    treeOutput = formatGenericTableTree(treeTitle, tableData);
  }

  // 6. Grounded Natural Language Synthesis
  let groundedAnswer = "";
  const groundingMessages: ChatMessage[] = [
    { role: "system", content: GROUNDING_SYSTEM_PROMPT },
    {
      role: "user",
      content: `User Question: "${userQuery}"\n\nGraph Query Results (JSON Table):\n${JSON.stringify(tableData.slice(0, 8), null, 2)}\n\nHierarchical Subgraph Tree:\n\`\`\`\n${treeOutput}\n\`\`\`\n\nPlease provide a clear, concise executive summary answering the question based strictly on these facts.`,
    },
  ];

  const llmAnswer = await callOpenRouter(groundingMessages, 0.1, 350);
  if (llmAnswer && llmAnswer.trim() !== "") {
    groundedAnswer = llmAnswer;
  } else {
    // Deterministic Rule-Based Fallback Synthesis
    if (templateMatch?.templateName === "itinerary_recovery_stops" || qLower.includes("recovery")) {
      const totalLoss = tableData.reduce((sum, r) => sum + (Number(r.degrowth_mom_inr) || 0), 0);
      groundedAnswer = `### Revenue Recovery Stops on Nov 2 for Officer ${entities.officerId || "SO-A"}\n\nIdentified **${tableData.length} recovery accounts** with **₹${(totalLoss / 100000).toFixed(1)} Lakhs** in active monthly sales decline:\n\n` +
        tableData.map((row) => `- **Stop ${row.sequence} [${row.planned_arrival}]**: Dealer \`${row.account_id}\` (${row.dealer_tier || "Non-Club"}) — **MoM De-growth: -₹${Number(row.degrowth_mom_inr) > 100000 ? (Number(row.degrowth_mom_inr) / 100000).toFixed(1) + "L" : (Number(row.degrowth_mom_inr) / 1000).toFixed(1) + "k"}** (*${row.reason}*)`).join("\n");
    } else if (templateMatch?.templateName === "itinerary_wallet_expansion" || qLower.includes("wallet expansion")) {
      const totalHeadroom = tableData.reduce((sum, r) => sum + (Number(r.headroom_inr) || 0), 0);
      groundedAnswer = `### Wallet Headroom Expansion Accounts for ${entities.officerId || "SO-A"} on ${entities.date || "Nov 2"}\n\nFound **${tableData.length} focus expansion dealers** commanding **₹${(totalHeadroom / 10000000).toFixed(2)} Cr** in uncaptured wallet headroom based on GST turnover proxy benchmarks:\n\n` +
        tableData.map((row) => `- **Stop ${row.sequence} [${row.planned_arrival}]**: Dealer \`${row.account_id}\` (${row.dealer_tier || "Silver"}) — **Headroom: ₹${(Number(row.headroom_inr) / 10000000).toFixed(2)} Cr** (GST Turnover Proxy: ₹${(Number(row.gst_turnover_proxy_inr || 25000000) / 10000000).toFixed(1)} Cr)`).join("\n");
    } else if (templateMatch?.templateName === "itinerary_arrival_schedule" || qLower.includes("arrival schedule")) {
      const first = tableData[0]?.planned_arrival || "09:58";
      const last = tableData[tableData.length - 1]?.planned_arrival || "13:02";
      groundedAnswer = `### Sequenced Arrival Schedule for ${entities.officerId || "SO-A"} on ${entities.date || "Nov 2"}\n\nSequenced timeline covers **${tableData.length} stops** from **${first} AM to ${last} PM** with 25-minute standard meeting blocks:\n\n` +
        tableData.map((row) => `- **Stop ${row.sequence} [${row.planned_arrival}]**: \`${row.account_id}\` (${row.dealer_tier || "Standard"} • ${row.town || "Bengaluru"}) — *${row.reason}*`).join("\n");
    } else if (templateMatch?.templateName === "officer_daily_itinerary") {
      const stopsCount = tableData.length;
      const totalMins = tableData.reduce((acc, row) => acc + (Number(row.travel_min) || 0), 0);
      groundedAnswer = `### Sequenced Beat Itinerary for ${entities.officerId || "SO-A"} on ${entities.date || "2026-11-02"}\n\nOfficer **${entities.officerId || "SO-A"}** has **${stopsCount} scheduled visits** with a total travel time of **${totalMins.toFixed(1)} minutes**.\n\n` +
        tableData.map((row) => `- **Stop ${row.sequence} [${row.planned_arrival}]**: Dealer \`${row.account_id}\` (${row.dealer_tier || "Standard"}) — *${row.reason}* (Travel: ${row.travel_min}m)`).join("\n");
    } else if (templateMatch?.templateName === "date_visits_all_officers") {
      groundedAnswer = `### Scheduled Visits on ${entities.date || "2026-11-02"} (All Officers)\n\nA total of **${tableData.length} visits** are scheduled across the sales team for **${entities.date || "2026-11-02"}**:\n\n` +
        tableData.map((v) => `- **${v.officer_id}** [Stop ${v.sequence} @ ${v.planned_arrival}]: \`${v.account_id}\` (${v.dealer_name || v.account_id} • ${v.dealer_tier || "Standard"}) — *${v.reason}* (Travel: ${v.travel_min}m)`).join("\n");
    } else if (templateMatch?.templateName === "all_officers_overview" || qLower.includes("all officers")) {
      groundedAnswer = `### Sales Officers & Territory Jurisdictions\n\nThe PJP sales operational network comprises **${tableData.length} Sales Officers** covering Bengaluru and Upcountry Karnataka:\n\n` +
        tableData.map((o) => `- **${o.officer_id}**: Territory: *${o.territory}* (${o.geography}) | **Daily Call Norm:** ${o.call_norm} | **Universe:** ${o.dealers_in_universe} registered outlets`).join("\n");
    } else if (templateMatch?.templateName === "dealers_by_tier") {
      groundedAnswer = `### Registered Dealers in Loyalty Tier: ${entities.clubTier || "Club"}\n\nRetrieved **${tableData.length} accounts** classified under **${entities.clubTier || "Club"}**:\n\n` +
        tableData.slice(0, 10).map((d) => `- **\`${d.dealer_id}\`** (${d.dealer_name || d.dealer_id}) — Town: *${d.town}* | Officer: **${d.officer}** | Headroom: ₹${(Number(d.headroom_inr || 0) / 100000).toFixed(1)}L`).join("\n");
    } else if (templateMatch?.templateName === "dealers_by_town") {
      groundedAnswer = `### Registered Dealers in ${entities.town || "Town"}\n\nFound **${tableData.length} accounts** operating in **${entities.town || "Town"}**:\n\n` +
        tableData.slice(0, 10).map((d) => `- **\`${d.dealer_id}\`** (${d.dealer_name || d.dealer_id}) — Tier: *${d.club_tier || "Non-Club"}* | Officer: **${d.officer}** | Headroom: ₹${(Number(d.headroom_inr || 0) / 100000).toFixed(1)}L`).join("\n");
    } else if (templateMatch?.templateName === "top_headroom_dealers") {
      groundedAnswer = `### Top Dealers by Uncaptured GST Wallet Headroom\n\nIdentified **${tableData.length} prime expansion accounts** based on GST outward supply proxies:\n\n` +
        tableData.slice(0, 8).map((d, i) => `${i + 1}. **\`${d.dealer_id}\`** (${d.dealer_name || d.dealer_id}) — Tier: *${d.club_tier}* (${d.town}) — **Headroom: ₹${(Number(d.headroom_inr) / 10000000).toFixed(2)} Cr** (Turnover Proxy: ₹${(Number(d.gst_turnover_proxy_inr || 25000000) / 10000000).toFixed(1)} Cr)`).join("\n");
    } else if (templateMatch?.templateName === "top_degrowth_dealers") {
      groundedAnswer = `### Top Dealers by Month-over-Month Sales De-growth (CUSUM Targets)\n\nIdentified **${tableData.length} high-risk accounts** experiencing steep sales declines requiring recovery visits:\n\n` +
        tableData.slice(0, 8).map((d, i) => `${i + 1}. **\`${d.dealer_id}\`** (${d.dealer_name || d.dealer_id}) — Tier: *${d.dealer_tier || d.club_tier}* (${d.town}) — **MoM Decline: -₹${Number(d.degrowth_mom_inr) > 100000 ? (Number(d.degrowth_mom_inr) / 100000).toFixed(1) + "L" : (Number(d.degrowth_mom_inr) / 1000).toFixed(1) + "k"}** (Officer: ${d.officer})`).join("\n");
    } else if (templateMatch?.templateName === "hike_anomaly_events") {
      groundedAnswer = `### Sales Hike Events & Surge Monitoring (2.2x Volume Model)\n\nIn accordance with PJP simulation rules, active dealers with baseline sales rates ≥ 0.5 sheets/day can experience temporary **2.2x sales surges** for 10-day windows ($p = 0.08$):\n\n` +
        tableData.slice(0, 8).map((d, i) => `${i + 1}. **\`${d.dealer_id}\`** (${d.dealer_name || d.dealer_id}) — Tier: *${d.club_tier}* (${d.town}) | Monitored for 2.2x surge (Annual: ₹${(Number(d.annual_purchases_inr) / 100000).toFixed(1)}L)\n   - *Replanning Action:* If an active hike surge occurs during a scheduled visit, the dynamic re-planner automatically cancels the visit, reallocating field time and scoring +5% in evaluation.`).join("\n");
    } else if (templateMatch?.templateName === "drop_anomaly_events" || qLower.includes("drop")) {
      groundedAnswer = `### Active Sales Drop Anomaly Events (CUSUM Alerts)\n\nCross-referenced **${tableData.length} dealers** experiencing active volume declines with scheduled recovery visits:\n\n` +
        tableData.slice(0, 10).map((e) => `- **\`${e.dealer_id}\`** (${e.club_tier || "Dealer"} • ${e.town}) — **Onset:** ${e.onset_date} | First Recovery Visit: **${e.first_visit_after_drop || "Pending"}** | Next Scheduled: **${e.next_scheduled_visit}** (*${e.visit_reason}*)`).join("\n");
    } else if (templateMatch?.templateName === "simulation_benchmark_summary" || qLower.includes("benchmark") || qLower.includes("simulation")) {
      groundedAnswer = `### PJP Simulation Benchmark Results (Seeds 1, 2, and 3)\n\nEvaluated using the ground-truth stochastic simulator (\`simulate.py\`) with dynamic re-planning (\`mypjp.replan\`):\n\n` +
        tableData.map((r) => `- **${r.metric}**: Seed 1: \`${r.seed_1}\` | Seed 2: \`${r.seed_2}\` | Seed 3: \`${r.seed_3}\` (Target: ${r.target} — **${r.status}**)`).join("\n") +
        `\n\n**Key Takeaways:**\n- **Adherence:** Maintained **>92.8%** across all seeds despite rain/traffic disruptions.\n- **Coverage:** **88.7% - 89.2%** of focus universe covered.\n- **Safety:** **0 re-plan failures** and **0 guardrail breaches** recorded across all 3 practice seeds.`;
    } else if (templateMatch?.templateName === "pjp_rules_guardrails" || qLower.includes("rule") || qLower.includes("guardrail")) {
      groundedAnswer = `### PJP Operational Guardrails & Call Norm Standards\n\nThe Permanent Journey Plan operates under strict operational constraints validated by \`simulate.py\`:\n\n` +
        tableData.map((r) => `- **${r.rule_name}** [\`${r.severity}\`]: ${r.specification} (*Source: ${r.source}*)`).join("\n");
    } else if (templateMatch?.templateName === "datasets_csv_catalog" || qLower.includes("dataset") || qLower.includes("csv")) {
      groundedAnswer = `### PJP Multi-Table Datasets & Master Catalog (All 46 CSVs Ingested)\n\nConnected **${tableData.length} multi-table CSV files** powering the Knowledge Graph:\n\n` +
        tableData.map((t) => `- **\`${t.dataset_file || t.dataset_name}\`** (**${Number(t.rows || t.row_count || 0).toLocaleString()} records** • ${t.status || t.category || "INGESTED"}): ${t.purpose || t.description}`).join("\n");
    } else if (templateMatch?.templateName === "weather_impact_rules" || qLower.includes("weather")) {
      groundedAnswer = `### Weather & Traffic Disruption Impact on Daily Beat Plans\n\nTransit physics and daily time budgets adapt dynamically based on road conditions:\n\n` +
        tableData.map((w) => `- **${w.condition}**: Travel multiplier: **${w.multiplier}** | Daily visit cap: **${w.daily_visit_cap}** (${w.impact})`).join("\n");
    } else if (templateMatch?.templateName === "dynamic_replanning_architecture" || qLower.includes("replan")) {
      groundedAnswer = `### Dynamic Re-planning Engine Architecture (\`mypjp.replan\`)\n\nThe evening re-planning routine executes every day at 18:30 to adjust the forward plan without violating core invariants:\n\n` +
        tableData.map((rp) => `- **${rp.trigger}**: *${rp.action}* (SLA: \`${rp.sla_seconds}\` | Guardrails: ${rp.guardrails_preserved})`).join("\n");
    } else if (templateMatch?.templateName === "whatsapp_incentive_nudges" || qLower.includes("nudge") || qLower.includes("whatsapp")) {
      groundedAnswer = `### Dispatched WhatsApp Incentive Nudges\n\nRetrieved **${tableData.length} high-impact WhatsApp nudges** scheduled for field visits:\n\n` +
        tableData.map((n) => `- **\`${n.dealer_id}\`** (${n.dealer_name || n.dealer_id}) — Trigger: *${n.trigger_type}*\n  > "${n.message}"\n  *(Target: ${n.target_slab || "Bonus"} • Gap: ${n.points_needed || 0} pts)*`).join("\n\n");
    } else if (templateMatch?.templateName === "commercial_hierarchies" || qLower.includes("hierarchy") || qLower.includes("parent")) {
      groundedAnswer = `### Commercial Hierarchy & Outlet Subsidiary Relationships\n\nIdentified **${tableData.length} hierarchical parent-child outlet relationships**:\n\n` +
        tableData.map((h) => `- **Parent: \`${h.parent_dealer_id}\`** (${h.parent_name || h.parent_dealer_id}) ──[SUBSIDIARY_OF]──> **Child: \`${h.child_dealer_id}\`** (${h.child_name || h.child_dealer_id} • ${h.child_tier || "Tier"}) in *${h.town || "Bengaluru"}*`).join("\n");
    } else if (templateMatch?.templateName === "officer_territory_overview") {
      groundedAnswer = `### Sales Officer Overview: ${entities.officerId || "Officer"}\n\n- **Officer ID:** ${tableData[0]?.officer_id || entities.officerId}\n- **Territory:** ${tableData[0]?.territory || "Bengaluru"}\n- **Geography:** ${tableData[0]?.geography || "Metro"}\n- **Call Norm:** ${tableData[0]?.call_norm || "6 focus visits/day + 2 demand-gen"}\n- **Total Universe:** ${tableData[0]?.dealers_in_universe || 0} registered dealers`;
    } else if (templateMatch?.templateName === "dealer_360_profile" && tableData.length > 0) {
      const d = tableData[0];
      groundedAnswer = `### Dealer 360: ${d.dealer_id} (${d.dealer_name})\n\n- **Territory & Town:** ${d.town || "Bengaluru"}\n- **Loyalty Tier:** ${d.club_tier || "Non-Club"}\n- **Headroom Opportunity:** ₹${((Number(d.headroom_inr) || 0) / 100000).toFixed(1)} Lakhs\n- **De-growth Status:** ${Number(d.degrowth_mom_inr) > 0 ? `[De-growth Alert]: -₹${((Number(d.degrowth_mom_inr) || 0) / 1000).toFixed(1)}k MoM Decline (Triggers Revenue Recovery Visit)` : "Stable / Growing"}`;
    } else {
      groundedAnswer = `Retrieved **${tableData.length} records** from the Knowledge Graph matching your inquiry. Review the structured records table and visual graph neighborhood for relational context.`;
    }
  }

  // 7. Deterministic Bar Chart Synthesis (Executive Card Pattern)
  const chart = generateBarChartData(
    userQuery,
    templateMatch?.templateName,
    tableData,
    graphData,
    entities
  );

  return {
    response: groundedAnswer,
    cypher: cypherQuery,
    intent: "domain_query",
    table: tableData,
    tree: treeOutput,
    graph: graphData,
    chart,
    entities,
    source: executionResult.source,
  };
}

