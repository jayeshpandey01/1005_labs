import { callOpenRouter, ChatMessage } from "../openrouter";

const PJP_SCHEMA_PROMPT = `
You are an expert Neo4j Cypher assistant for the PJP (Permanent Journey Plan) Sales Simulator.
Your role is to translate operational field sales questions into safe, read-only Cypher queries.

NEO4J PROPERTY GRAPH SCHEMA:
Node Labels & Properties:
- SalesOfficer {id: 'SO-A'|'SO-B'|'SO-C', territory, geography, call_norm: '6 focus + 2 demand-gen', start_lat, start_lon, dealers_in_universe: int, median_completed_calls: int}
- Dealer {id: 'A-D001'..'C-D299', name, parent_id, outlet_type: 'Dealer'|'Sub dealer'|'Prime dealer', club_tier: 'Platinum'|'Gold'|'Silver'|'Elite'|'Diamond'|'Non-Club', town, town_class, lat, lon, annual_purchases_inr, headroom_inr, degrowth_mom_inr, sales_rate_daily, is_valid_gst, is_active_for_events}
- Visit {id: 'VISIT_SO-A_2026-11-02_1', date: '2026-11-02', so_id: 'SO-A', sequence: 1..6, account_id, planned_arrival: '09:58', travel_min: 28.7, reason}
- DropEvent {id: 'EVENT_A-D012_drop_2026-11-23', dealer_id, type: 'drop'|'hike', onset: '2026-11-23', end, first_visit_after_onset, seed: 1}
- Nudge {id: 'NUDGE_1', nudge_id: 1..5, dealer_id, so_id, visit_date, trigger_type, message, points_needed, target_slab, planned_arrival}

Relationships:
- (:SalesOfficer)-[:MANAGES_TERRITORY]->(:Dealer)
- (:SalesOfficer)-[:PERFORMS_VISIT]->(:Visit)
- (:Visit)-[:VISITS_DEALER]->(:Dealer)
- (:Visit)-[:NEXT_VISIT {travel_min: float}]->(:Visit)
- (:Dealer)-[:SUBSIDIARY_OF {relationship}]->(:Dealer)
- (:Dealer)-[:EXPERIENCED_EVENT {type, onset}]->(:DropEvent)
- (:Nudge)-[:DISPATCHED_TO {trigger_type, visit_date}]->(:Dealer)
- (:Nudge)-[:SUPPORTS_VISIT {visit_date}]->(:Visit)

CRITICAL RULES:
1. ONLY generate read-only Cypher queries starting with MATCH. NEVER use SET, DELETE, CREATE, MERGE, DROP, or ALTER.
2. Return only the raw Cypher query string without markdown code fences (\`\`\`cypher), commentary, or explanations.
3. Dealer IDs are formatted as '[A-C]-D\\d{3}' (e.g. 'A-D004'). Officer IDs are 'SO-A', 'SO-B', or 'SO-C'.
4. To find scheduled visits on a date: MATCH (v:Visit {date: $date})-[:VISITS_DEALER]->(d:Dealer)
5. Keep queries concise and return relevant aliases for tabular display.
`;

export function validateCypherSecurity(cypher: string): { valid: boolean; error?: string } {
  const clean = cypher.trim();
  const lower = clean.toLowerCase();

  const unsafeTokens = ["delete", "drop", "create", "merge", "set ", "alter", "remove", "truncate"];
  for (const token of unsafeTokens) {
    if (lower.includes(token)) {
      return {
        valid: false,
        error: `Query contains forbidden mutation token: '${token.trim().toUpperCase()}'. Only read-only queries starting with MATCH are permitted.`,
      };
    }
  }

  if (!lower.startsWith("match") && !lower.startsWith("optional match") && !lower.startsWith("call")) {
    return {
      valid: false,
      error: "Query must begin with MATCH or OPTIONAL MATCH.",
    };
  }

  return { valid: true };
}

export async function generateCypherWithLLM(userQuery: string): Promise<string | null> {
  const messages: ChatMessage[] = [
    { role: "system", content: PJP_SCHEMA_PROMPT },
    { role: "user", content: `Translate this operational question into a read-only Cypher query:\nQuestion: "${userQuery}"` },
  ];

  let rawResponse = await callOpenRouter(messages, 0.0, 300);
  if (!rawResponse) return null;

  // Clean out any accidental markdown code fences
  let cypher = rawResponse.replace(/```(?:cypher)?/gi, "").replace(/```/g, "").trim();

  // Validate security & structure
  const validation = validateCypherSecurity(cypher);
  if (!validation.valid) {
    // Attempt 1 self-repair retry
    console.warn(`[Cypher Generator] Query validation failed: ${validation.error}. Attempting repair...`);
    const repairMessages: ChatMessage[] = [
      { role: "system", content: PJP_SCHEMA_PROMPT },
      { role: "user", content: `Your previous query failed validation with error: "${validation.error}".\nRegenerate a strictly read-only Cypher query starting with MATCH for question: "${userQuery}"` },
    ];
    const repairedResponse = await callOpenRouter(repairMessages, 0.0, 300);
    if (repairedResponse) {
      cypher = repairedResponse.replace(/```(?:cypher)?/gi, "").replace(/```/g, "").trim();
    }
  }

  return cypher;
}

