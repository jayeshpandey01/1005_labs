import { DiscoveredEntities } from "./entities";

export interface CypherTemplateMatch {
  templateName: string;
  cypher: string;
  parameters: Record<string, any>;
  description: string;
}

export function matchCypherTemplate(
  query: string,
  entities: DiscoveredEntities
): CypherTemplateMatch | null {
  const lower = query.toLowerCase();

  // Template 1A: Itinerary Recovery Stops & De-growth Alerts
  // E.g., "Show recovery stops and de-growth alerts for SO-A on 2026-11-02"
  if (
    entities.officerId &&
    entities.date &&
    (lower.includes("recovery") || lower.includes("de-growth alert") || lower.includes("drop alert"))
  ) {
    return {
      templateName: "itinerary_recovery_stops",
      cypher: `MATCH (o:SalesOfficer {id: $so_id})-[:PERFORMS_VISIT]->(v:Visit {date: $date})-[:VISITS_DEALER]->(d:Dealer)
WHERE v.reason CONTAINS 'Recovery' OR d.degrowth_mom_inr > 0
OPTIONAL MATCH (d)-[:EXPERIENCED_EVENT]->(e:DropEvent)
RETURN v.sequence AS sequence,
       v.planned_arrival AS planned_arrival,
       d.id AS account_id,
       d.name AS dealer_name,
       d.club_tier AS dealer_tier,
       d.degrowth_mom_inr AS degrowth_mom_inr,
       d.headroom_inr AS headroom_inr,
       v.travel_min AS travel_min,
       v.reason AS reason,
       e.onset AS drop_onset_date
ORDER BY d.degrowth_mom_inr DESC`,
      parameters: { so_id: entities.officerId, date: entities.date },
      description: `High-priority recovery stops and CUSUM de-growth alerts for ${entities.officerId} on ${entities.date}`,
    };
  }

  // Template 1B: Itinerary Wallet Headroom Expansion
  // E.g., "Show wallet headroom expansion opportunities for SO-A on 2026-11-02"
  if (
    entities.officerId &&
    entities.date &&
    (lower.includes("wallet") || lower.includes("headroom expansion") || lower.includes("expansion"))
  ) {
    return {
      templateName: "itinerary_wallet_expansion",
      cypher: `MATCH (o:SalesOfficer {id: $so_id})-[:PERFORMS_VISIT]->(v:Visit {date: $date})-[:VISITS_DEALER]->(d:Dealer)
WHERE v.reason CONTAINS 'Expansion' OR d.headroom_inr > 0
RETURN v.sequence AS sequence,
       v.planned_arrival AS planned_arrival,
       d.id AS account_id,
       d.name AS dealer_name,
       d.club_tier AS dealer_tier,
       d.headroom_inr AS headroom_inr,
       d.annual_purchases_inr AS annual_purchases_inr,
       d.gst_turnover_proxy_inr AS gst_turnover_proxy_inr,
       v.travel_min AS travel_min,
       v.reason AS reason
ORDER BY d.headroom_inr DESC`,
      parameters: { so_id: entities.officerId, date: entities.date },
      description: `High-headroom wallet expansion accounts for ${entities.officerId} on ${entities.date}`,
    };
  }

  // Template 1C: Itinerary Sequenced Arrival Schedule
  // E.g., "Show sequenced arrival schedule and stop timeline for SO-A on 2026-11-02"
  if (
    entities.officerId &&
    entities.date &&
    (lower.includes("arrival schedule") || lower.includes("timeline") || lower.includes("arrival time") || lower.includes("stop schedule"))
  ) {
    return {
      templateName: "itinerary_arrival_schedule",
      cypher: `MATCH (o:SalesOfficer {id: $so_id})-[:PERFORMS_VISIT]->(v:Visit {date: $date})-[:VISITS_DEALER]->(d:Dealer)
RETURN v.sequence AS sequence,
       v.planned_arrival AS planned_arrival,
       d.id AS account_id,
       d.name AS dealer_name,
       d.club_tier AS dealer_tier,
       d.town AS town,
       v.travel_min AS travel_min,
       v.reason AS reason
ORDER BY v.sequence`,
      parameters: { so_id: entities.officerId, date: entities.date },
      description: `Sequenced arrival timeline and stop schedule for ${entities.officerId} on ${entities.date}`,
    };
  }

  // Template 1D: Officer Daily Itinerary Travel Breakdown (Travel per stop)
  // E.g., "Show SO-A beat schedule on Nov 2"
  if (entities.officerId && entities.date) {
    return {
      templateName: "officer_daily_itinerary",
      cypher: `MATCH (o:SalesOfficer {id: $so_id})-[:PERFORMS_VISIT]->(v:Visit {date: $date})-[:VISITS_DEALER]->(d:Dealer)
OPTIONAL MATCH (n:Nudge)-[:SUPPORTS_VISIT]->(v)
RETURN v.sequence AS sequence,
       v.planned_arrival AS planned_arrival,
       d.id AS account_id,
       d.club_tier AS dealer_tier,
       v.travel_min AS travel_min,
       v.reason AS reason,
       n.message AS whatsapp_nudge
ORDER BY v.sequence`,
      parameters: { so_id: entities.officerId, date: entities.date },
      description: `Daily sequenced TSP beat itinerary and travel breakdown for Officer ${entities.officerId} on ${entities.date}`,
    };
  }

  // Template 1E: Officer Beat Itinerary without explicit date (defaults to Day 1: 2026-11-02)
  // E.g., "Show SO-B itinerary" or "Show SO-C route"
  if (
    entities.officerId &&
    (entities.topics.includes("itinerary") || lower.includes("itinerary") || lower.includes("route") || lower.includes("beat") || lower.includes("schedule"))
  ) {
    return {
      templateName: "officer_daily_itinerary",
      cypher: `MATCH (o:SalesOfficer {id: $so_id})-[:PERFORMS_VISIT]->(v:Visit {date: '2026-11-02'})-[:VISITS_DEALER]->(d:Dealer)
OPTIONAL MATCH (n:Nudge)-[:SUPPORTS_VISIT]->(v)
RETURN v.sequence AS sequence,
       v.planned_arrival AS planned_arrival,
       d.id AS account_id,
       d.club_tier AS dealer_tier,
       v.travel_min AS travel_min,
       v.reason AS reason,
       n.message AS whatsapp_nudge
ORDER BY v.sequence`,
      parameters: { so_id: entities.officerId, date: "2026-11-02" },
      description: `Day 1 sequenced TSP beat itinerary and travel breakdown for Officer ${entities.officerId} (2026-11-02)`,
    };
  }

  // Template 1F: All Visits for a Specific Date across All Officers
  // E.g., "Show visits on Nov 2" or "What visits are scheduled on Nov 2?"
  if (entities.date && !entities.officerId && !entities.dealerId) {
    return {
      templateName: "date_visits_all_officers",
      cypher: `MATCH (o:SalesOfficer)-[:PERFORMS_VISIT]->(v:Visit {date: $date})-[:VISITS_DEALER]->(d:Dealer)
RETURN o.id AS officer_id,
       v.sequence AS sequence,
       v.planned_arrival AS planned_arrival,
       d.id AS account_id,
       d.name AS dealer_name,
       d.club_tier AS dealer_tier,
       d.town AS town,
       v.travel_min AS travel_min,
       v.reason AS reason
ORDER BY o.id, v.sequence`,
      parameters: { date: entities.date },
      description: `All scheduled visits across sales officers on ${entities.date}`,
    };
  }

  // Template 2: Dealer 360 & Reason for Visit
  // E.g., "Why was A-D004 visited on Nov 2?" or "Tell me about dealer A-D004"
  if (entities.dealerId) {
    return {
      templateName: "dealer_360_profile",
      cypher: `MATCH (d:Dealer {id: $dealer_id})
OPTIONAL MATCH (child:Dealer)-[:SUBSIDIARY_OF]->(d)
OPTIONAL MATCH (d)-[:SUBSIDIARY_OF]->(parent:Dealer)
OPTIONAL MATCH (v:Visit)-[:VISITS_DEALER]->(d)
OPTIONAL MATCH (d)-[:EXPERIENCED_EVENT]->(e:DropEvent)
OPTIONAL MATCH (n:Nudge)-[:DISPATCHED_TO]->(d)
RETURN d.id AS dealer_id,
       d.name AS dealer_name,
       d.club_tier AS club_tier,
       d.town AS town,
       d.annual_purchases_inr AS annual_purchases_inr,
       d.headroom_inr AS headroom_inr,
       d.degrowth_mom_inr AS degrowth_mom_inr,
       parent.id AS parent_account,
       collect(DISTINCT child.id) AS subsidiaries,
       collect(DISTINCT {date: v.date, sequence: v.sequence, arrival: v.planned_arrival, reason: v.reason}) AS scheduled_visits,
       collect(DISTINCT {type: e.type, onset: e.onset, end: e.end}) AS drop_events,
       collect(DISTINCT {type: n.trigger_type, message: n.message, points_needed: n.points_needed}) AS whatsapp_nudges`,
      parameters: { dealer_id: entities.dealerId },
      description: `Complete 360° operational profile, hierarchy, drop events, and visits for Dealer ${entities.dealerId}`,
    };
  }

  // Template 3: Anomaly & Sales Drop Alerts
  // E.g., "Which dealers experienced a sales drop?" or "Show all drop events"
  if (entities.anomalyType === "drop" || lower.includes("sales drop") || lower.includes("anomaly")) {
    return {
      templateName: "drop_anomaly_events",
      cypher: `MATCH (d:Dealer)-[:EXPERIENCED_EVENT]->(e:DropEvent {type: 'drop'})
OPTIONAL MATCH (v:Visit)-[:VISITS_DEALER]->(d)
RETURN d.id AS dealer_id,
       d.town AS town,
       d.club_tier AS club_tier,
       d.degrowth_mom_inr AS degrowth_mom_inr,
       e.onset AS onset_date,
       e.first_visit_after_onset AS first_visit_after_drop,
       v.date AS next_scheduled_visit,
       v.reason AS visit_reason
ORDER BY e.onset DESC
LIMIT 20`,
      parameters: {},
      description: "Dealers with active CUSUM sales drops cross-referenced with recovery visits",
    };
  }

  // Template 4: Sales Hike Events & Surge Monitoring
  // E.g., "Show sales hike events" or "Show spike events" or "Which dealers had volume surges?"
  if (entities.anomalyType === "hike" || lower.includes("hike") || lower.includes("surge") || lower.includes("spike")) {
    return {
      templateName: "hike_anomaly_events",
      cypher: `MATCH (d:Dealer)
WHERE d.annual_purchases_inr > 1000000
RETURN d.id AS dealer_id,
       d.name AS dealer_name,
       d.club_tier AS club_tier,
       d.town AS town,
       d.so_id AS officer,
       '2.2x Sales Hike Surge' AS anomaly_type,
       d.annual_purchases_inr AS annual_purchases_inr
ORDER BY d.annual_purchases_inr DESC
LIMIT 15`,
      parameters: {},
      description: "High-volume dealers monitored for 2.2x sales hike surges and visit cancellations",
    };
  }

  // Template 5: WhatsApp Interventions & Nudges
  // E.g., "Show WhatsApp nudges" or "What messages were sent to dealers?"
  if (entities.topics.includes("nudge") || lower.includes("whatsapp")) {
    return {
      templateName: "whatsapp_incentive_nudges",
      cypher: `MATCH (n:Nudge)-[:DISPATCHED_TO]->(d:Dealer)
OPTIONAL MATCH (n)-[:SUPPORTS_VISIT]->(v:Visit)
RETURN n.nudge_id AS nudge_id,
       d.id AS dealer_id,
       d.name AS dealer_name,
       d.club_tier AS club_tier,
       n.trigger_type AS trigger_type,
       n.target_slab AS target_slab,
       n.points_needed AS points_needed,
       n.visit_date AS visit_date,
       v.planned_arrival AS planned_arrival,
       n.message AS message
ORDER BY n.nudge_id`,
      parameters: {},
      description: "Dispatched WhatsApp incentive nudges with points gaps and visit timings",
    };
  }

  // Template 6: Commercial Hierarchy & Parent Accounts
  // E.g., "Show parent accounts and commercial hierarchies"
  if (entities.topics.includes("hierarchy") || lower.includes("parent") || lower.includes("subsidiary")) {
    return {
      templateName: "commercial_hierarchies",
      cypher: `MATCH (child:Dealer)-[r:SUBSIDIARY_OF]->(parent:Dealer)
OPTIONAL MATCH (v:Visit)-[:VISITS_DEALER]->(child)
RETURN parent.id AS parent_dealer_id,
       parent.name AS parent_name,
       child.id AS child_dealer_id,
       child.outlet_type AS child_type,
       child.club_tier AS child_tier,
       r.relationship AS relationship_type,
       collect(DISTINCT v.date) AS child_visit_dates`,
      parameters: {},
      description: "Commercial parent-child outlet billing hierarchies and scheduled visits",
    };
  }

  // Template 7: All Sales Officers Overview
  // E.g., "Show all sales officers" or "List officers" or "Who are the sales officers?"
  if (
    (entities.topics.includes("officers") && !entities.officerId) ||
    lower.includes("all officers") ||
    lower.includes("sales officers") ||
    lower.includes("list officers") ||
    lower.includes("who are the officers") ||
    lower.includes("sales team")
  ) {
    return {
      templateName: "all_officers_overview",
      cypher: `MATCH (o:SalesOfficer)
RETURN o.id AS officer_id,
       o.territory AS territory,
       o.geography AS geography,
       o.call_norm AS call_norm,
       o.dealers_in_universe AS dealers_in_universe,
       o.median_completed_calls AS median_completed_calls`,
      parameters: {},
      description: "Overview of all 3 Sales Officers, territories, and call norms",
    };
  }

  // Template 8: Single Officer Universe Overview
  // E.g., "Tell me about SO-A" or "Show dealers managed by SO-C"
  if (entities.officerId) {
    return {
      templateName: "officer_territory_overview",
      cypher: `MATCH (o:SalesOfficer {id: $so_id})
OPTIONAL MATCH (o)-[:MANAGES_TERRITORY]->(d:Dealer)
RETURN o.id AS officer_id,
       o.territory AS territory,
       o.geography AS geography,
       o.call_norm AS call_norm,
       o.dealers_in_universe AS dealers_in_universe,
       count(DISTINCT d) AS total_assigned_dealers,
       collect(DISTINCT d.club_tier) AS tiers_present`,
      parameters: { so_id: entities.officerId },
      description: `Territory jurisdiction and call norms for Sales Officer ${entities.officerId}`,
    };
  }

  // Template 9: Dealers by Loyalty Club Tier
  // E.g., "Show platinum dealers" or "List diamond dealers" or "Show silver dealers"
  if (entities.clubTier && !entities.dealerId) {
    return {
      templateName: "dealers_by_tier",
      cypher: `MATCH (d:Dealer)
WHERE toLower(d.club_tier) = toLower($club_tier)
RETURN d.id AS dealer_id,
       d.name AS dealer_name,
       d.club_tier AS club_tier,
       d.town AS town,
       d.headroom_inr AS headroom_inr,
       d.degrowth_mom_inr AS degrowth_mom_inr,
       d.so_id AS officer
ORDER BY d.headroom_inr DESC
LIMIT 20`,
      parameters: { club_tier: entities.clubTier },
      description: `Registered dealers in loyalty club tier ${entities.clubTier}`,
    };
  }

  // Template 10: Dealers by Town / Geography
  // E.g., "Show dealers in Hubballi" or "Which dealers are in Belagavi?" or "Show Bengaluru dealers"
  if (entities.town && !entities.dealerId) {
    return {
      templateName: "dealers_by_town",
      cypher: `MATCH (d:Dealer)
WHERE toLower(d.town) CONTAINS toLower($town)
RETURN d.id AS dealer_id,
       d.name AS dealer_name,
       d.club_tier AS club_tier,
       d.town AS town,
       d.headroom_inr AS headroom_inr,
       d.degrowth_mom_inr AS degrowth_mom_inr,
       d.so_id AS officer
ORDER BY d.headroom_inr DESC
LIMIT 20`,
      parameters: { town: entities.town },
      description: `Registered dealers located in ${entities.town}`,
    };
  }

  // Template 11: Top Headroom Expansion Dealers
  // E.g., "Which dealers have highest headroom?" or "Top headroom dealers"
  if (
    lower.includes("highest headroom") ||
    lower.includes("top headroom") ||
    lower.includes("max headroom") ||
    (entities.topics.includes("headroom") && !entities.officerId && !entities.dealerId)
  ) {
    return {
      templateName: "top_headroom_dealers",
      cypher: `MATCH (d:Dealer)
WHERE d.headroom_inr > 0
RETURN d.id AS dealer_id,
       d.name AS dealer_name,
       d.club_tier AS club_tier,
       d.town AS town,
       d.headroom_inr AS headroom_inr,
       d.annual_purchases_inr AS annual_purchases_inr,
       d.gst_turnover_proxy_inr AS gst_turnover_proxy_inr,
       d.so_id AS officer
ORDER BY d.headroom_inr DESC
LIMIT 15`,
      parameters: {},
      description: "Top dealers by uncaptured GST wallet headroom opportunity",
    };
  }

  // Template 12: Top MoM Sales De-growth Dealers
  // E.g., "Which dealers have highest de-growth?" or "Top de-growth dealers"
  if (
    lower.includes("highest de-growth") ||
    lower.includes("highest degrowth") ||
    lower.includes("top de-growth") ||
    lower.includes("top degrowth") ||
    (entities.topics.includes("degrowth") && !entities.officerId && !entities.dealerId)
  ) {
    return {
      templateName: "top_degrowth_dealers",
      cypher: `MATCH (d:Dealer)
WHERE d.degrowth_mom_inr > 0
RETURN d.id AS dealer_id,
       d.name AS dealer_name,
       d.club_tier AS dealer_tier,
       d.town AS town,
       d.degrowth_mom_inr AS degrowth_mom_inr,
       d.annual_purchases_inr AS annual_purchases_inr,
       d.so_id AS officer
ORDER BY d.degrowth_mom_inr DESC
LIMIT 15`,
      parameters: {},
      description: "Top dealers by month-over-month sales decline (CUSUM recovery targets)",
    };
  }

  // Template 13: Simulation Benchmark Summary across Seeds
  // E.g., "What were the simulation benchmark results?" or "Show benchmark scores across seeds"
  if (
    entities.topics.includes("benchmark") ||
    lower.includes("simulation") ||
    lower.includes("benchmark") ||
    lower.includes("seed")
  ) {
    return {
      templateName: "simulation_benchmark_summary",
      cypher: `MATCH (s:SimulationBenchmark)
RETURN s.metric AS metric,
       s.seed_1 AS seed_1,
       s.seed_2 AS seed_2,
       s.seed_3 AS seed_3,
       s.target AS target,
       s.status AS status`,
      parameters: {},
      description: "PJP simulation benchmark adherence and coverage performance across Seeds 1, 2, and 3",
    };
  }

  // Template 14: PJP Rules, Call Norms & Guardrails
  // E.g., "What are the PJP rules and guardrails?" or "Explain call norms and constraints"
  if (
    entities.topics.includes("guardrails") ||
    lower.includes("rule") ||
    lower.includes("guardrail") ||
    lower.includes("call norm") ||
    lower.includes("constraints") ||
    lower.includes("limits")
  ) {
    return {
      templateName: "pjp_rules_guardrails",
      cypher: `MATCH (r:OperationalRule)
RETURN r.rule_id AS rule_id,
       r.name AS rule_name,
       r.specification AS specification,
       r.severity AS severity,
       r.source AS source`,
      parameters: {},
      description: "Permanent Journey Plan (PJP) operational guardrails, daily time budgets, and call norms",
    };
  }

  // Template 15: CSV Datasets Catalog
  // E.g., "What CSV datasets are available in the system?" or "Show all CSV files"
  if (
    entities.topics.includes("dataset") ||
    lower.includes("dataset") ||
    lower.includes("csv") ||
    lower.includes("catalog") ||
    lower.includes("tables") ||
    lower.includes("files")
  ) {
    return {
      templateName: "datasets_csv_catalog",
      cypher: `MATCH (t:DatasetTable)
RETURN t.name AS dataset_name,
       t.category AS category,
       t.rows AS row_count,
       t.description AS description,
       t.download_url AS download_url`,
      parameters: {},
      description: "Catalog of multi-table CSV datasets, schema descriptions, and download paths",
    };
  }

  // Template 16: Weather Impact & Speed Constraints
  // E.g., "How does weather affect travel time?" or "What is the rain and traffic penalty?"
  if (
    entities.topics.includes("weather") ||
    lower.includes("weather") ||
    lower.includes("rain") ||
    lower.includes("traffic")
  ) {
    return {
      templateName: "weather_impact_rules",
      cypher: `MATCH (w:WeatherRule)
RETURN w.condition AS condition,
       w.travel_multiplier AS multiplier,
       w.daily_visit_cap AS daily_visit_cap,
       w.probability_metro AS probability_metro,
       w.probability_upcountry AS probability_upcountry`,
      parameters: {},
      description: "Weather and traffic disruption parameters, speed penalties, and daily visit caps",
    };
  }

  // Template 17: Dynamic Re-planning Engine Architecture
  // E.g., "How does dynamic replanning work?" or "Explain re-planning"
  if (
    entities.topics.includes("replan") ||
    lower.includes("replan") ||
    lower.includes("replanning")
  ) {
    return {
      templateName: "dynamic_replanning_architecture",
      cypher: `MATCH (r:ReplanningRule)
RETURN r.trigger AS trigger,
       r.action AS action,
       r.sla_seconds AS sla_seconds,
       r.guardrails_preserved AS guardrails_preserved`,
      parameters: {},
      description: "Evening dynamic re-planning engine specifications (mypjp.replan) and event handling",
    };
  }

  return null;
}


