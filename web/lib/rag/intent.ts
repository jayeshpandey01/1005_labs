/**
 * Intent Classifier for GraphRAG Engine
 * Distinguishes between:
 * 1. Unsafe mutation attempts (DML/DDL injection guardrail)
 * 2. General conversational onboarding greetings
 * 3. Out-of-domain non-PJP queries (Security Domain Boundary Guardrail)
 * 4. Verified operational domain queries
 */

export type QueryIntent = "domain_query" | "unsafe" | "general" | "out_of_domain";

export interface IntentResult {
  intent: QueryIntent;
  reason?: string;
  directResponse?: string;
}

const UNSAFE_KEYWORDS = [
  "delete ",
  "delete (",
  "delete all",
  "remove node",
  "drop table",
  "drop database",
  "drop constraint",
  "drop index",
  "drop node",
  "drop graph",
  "truncate ",
  "alter table",
  "alter database",
  "merge (",
  "set ",
  "insert into",
  "create node",
  "destroy",
];

const GENERAL_GREETINGS = [
  "hello",
  "hi",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "how are you",
  "who are you",
  "what can you do",
  "help",
  "what is this",
  "features",
  "start",
];

const DOMAIN_TERMS = [
  "so-a", "so-b", "so-c", "so a", "so b", "so c", "officer", "officers", "sales officer", "sales officers", "rep", "reps", "salesperson", "sales team",
  "dealer", "dealers", "outlet", "outlets", "store", "stores", "shop", "shops", "account", "accounts",
  "customer", "customers", "parent", "subsidiary", "subsidiaries", "hierarchy", "hierarchies",
  "tier", "tiers", "club", "silver", "gold", "platinum", "diamond", "elite", "non-club",
  "bengaluru", "hubballi", "hubli", "belagavi", "dharwad", "town", "towns", "geography", "territory", "location", "lat", "lon", "gps",
  "headroom", "purchases", "degrowth", "de-growth", "growth", "wallet",
  "revenue", "target", "targets", "points", "bonus", "scheme", "schemes", "incentive", "incentives", "slab", "slabs", "payout",
  "itinerary", "itineraries", "route", "routes", "beat", "beats", "pjp", "journey", "plan", "plans", "schedule", "schedules",
  "visit", "visits", "tsp", "travel", "minutes", "stop", "stops", "sequence",
  "coverage", "adherence", "november", "nov", "calendar", "workday", "workdays", "holiday",
  "drop", "drops", "anomaly", "anomalies", "cusum", "cancel", "cancellation", "cancellations",
  "hike", "hikes", "surge", "spike", "spikes",
  "alert", "alerts", "risk", "risks", "nudge", "nudges", "whatsapp",
  "message", "messages", "dispatch", "gst", "sfdc", "salesforce",
  "benchmark", "benchmarks", "simulation", "simulator", "simulate", "seed", "seeds", "score", "scores", "scorecard", "kpi", "kpis",
  "replan", "replanning", "reschedule", "rescheduling",
  "rule", "rules", "guardrail", "guardrails", "norm", "norms", "call norm", "call norms", "constraint", "constraints", "limit", "limits", "gap",
  "weather", "rain", "traffic", "forecast", "speed", "detour",
  "graph", "node", "nodes", "edge", "edges", "cypher", "database", "table", "tables", "dataset", "datasets", "csv", "catalog", "schema", "file", "files"
];

function isDomainRelevant(q: string): boolean {
  // Regex check for dealer IDs (e.g., A-D001, B-D012, D001, etc.)
  if (/\b[a-c]-d\d+\b/i.test(q) || /\bd\d{3,4}\b/i.test(q)) return true;
  // Regex check for officer IDs (e.g., SO-A, SO-B, SO-C, SO A, Officer A, etc.)
  if (/\b(?:so-?[a-c]|officer\s+[a-c])\b/i.test(q)) return true;
  // Regex check for dates (e.g., 2026-11-02, Nov 2, etc.)
  if (/\b(nov|november)\b/i.test(q) || /\b2026-\d{2}-\d{2}\b/.test(q) || /\b2024-\d{2}-\d{2}\b/.test(q)) return true;
  // Regex check for coordinates
  if (/\b(?:lat(?:itude)?|lon(?:gitude)?|gps)\b/i.test(q)) return true;

  // Check against domain terms with whole word boundary or multi-word substring
  return DOMAIN_TERMS.some((term) => {
    if (term.includes(" ") || term.includes("-")) {
      return q.includes(term);
    }
    const regex = new RegExp(`\\b${term}\\b`, "i");
    return regex.test(q);
  });
}

export function detectIntent(query: string): IntentResult {
  const q = query.trim().toLowerCase();

  // 1. Safety Guardrail: Block data mutations
  for (const kw of UNSAFE_KEYWORDS) {
    if (q.includes(kw)) {
      return {
        intent: "unsafe",
        reason: `Mutation keyword '${kw.trim()}' detected. The PJP GraphRAG system is strictly read-only to preserve operational audit integrity.`,
        directResponse: `**Action Prohibited**: Modifying or altering the graph using \`${kw.trim().toUpperCase()}\` is blocked. All PJP itinerary and dealer datasets are protected under strict read-only audit guardrails.`,
      };
    }
  }

  // 2. General Conversation & Onboarding
  if (
    GENERAL_GREETINGS.some((g) => q === g || q.startsWith(g + " ") || q.startsWith(g + "?") || q.startsWith(g + "!"))
  ) {
    return {
      intent: "general",
      directResponse: `**Welcome to the PJP Sales Optimization Copilot**\n\nI am your Graph-Based Intelligence assistant for the November 2026 Permanent Journey Plan.\n\n**Here is what you can ask me:**\n- *"Show SO-A beat schedule on Nov 2"*\n- *"Why was A-D004 visited on Nov 2?"* (CUSUM de-growth recovery)\n- *"Show parent A-D019 commercial hierarchy and subsidiaries"*\n- *"Which dealers are currently experiencing a sales drop?"*\n- *"Show WhatsApp incentive nudges dispatched to dealers"*`,
    };
  }

  // 3. Security Boundary: Block out-of-domain questions (recipes, poems, coding tasks, general trivia)
  if (!isDomainRelevant(q)) {
    return {
      intent: "out_of_domain",
      reason: "Query does not relate to PJP sales planning, field officers, dealers, beat schedules, or telemetry.",
      directResponse: `**Security Boundary Notice**: I am dedicated exclusively to the **Permanent Journey Plan (PJP) Sales Optimization System**.\n\nI cannot answer general inquiries, creative prompts, or questions outside this field sales operational domain.\n\n**Please ask questions related to:**\n- **Officer Beat Plans**: *"Show itinerary and route for SO-A on Nov 2"*\n- **Dealer 360 Profiles**: *"Give me a 360 degree view of dealer A-D001"*\n- **Risk & Anomaly Telemetry**: *"Which visits experienced a sales drop or anomaly?"*\n- **WhatsApp Field Nudges**: *"Show all WhatsApp nudges sent to dealers"*\n- **Commercial Hierarchies**: *"Show parent account and subsidiaries for A-D019"*`,
    };
  }

  return { intent: "domain_query" };
}
