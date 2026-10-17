/**
 * Entity Discovery & Disambiguation for PJP GraphRAG
 * Extracts operational entities (Officers, Dealers, Dates, Tiers, Topics)
 * using deterministic regex matching and fuzzy entity linking.
 */

export interface DiscoveredEntities {
  officerId?: string;
  dealerId?: string;
  date?: string;
  clubTier?: string;
  town?: string;
  anomalyType?: "drop" | "hike";
  topics: string[];
}

export function discoverEntities(query: string): DiscoveredEntities {
  const q = query.trim();
  const lower = q.toLowerCase();
  const result: DiscoveredEntities = {
    topics: [],
  };

  // 1. Officer ID (SO-A, SO-B, SO-C, SO A, Officer A)
  const officerMatch = q.match(/\b(?:SO-?|officer\s+)([A-C])\b/i);
  if (officerMatch) {
    result.officerId = `SO-${officerMatch[1].toUpperCase()}`;
  }

  // 2. Dealer ID ([A-C]-D\d{1,4})
  const dealerMatch = q.match(/\b([A-C]-D\d{1,4})\b/i);
  if (dealerMatch) {
    result.dealerId = dealerMatch[1].toUpperCase();
  }

  // 3. Date extraction
  // Handles: 2026-11-02, Nov 2, November 2, Nov 02, etc.
  const isoDateMatch = q.match(/\b(2026-11-\d{2})\b/);
  if (isoDateMatch) {
    result.date = isoDateMatch[1];
  } else {
    const textDateMatch = q.match(/\b(?:nov|november)\s+(\d{1,2})\b/i);
    if (textDateMatch) {
      const day = textDateMatch[1].padStart(2, "0");
      result.date = `2026-11-${day}`;
    }
  }

  // 4. Club Tier extraction
  const tiers = ["platinum", "gold", "silver", "elite", "diamond", "non-club"];
  for (const t of tiers) {
    if (lower.includes(t)) {
      result.clubTier = t.charAt(0).toUpperCase() + t.slice(1);
      break;
    }
  }

  // 5. Town extraction
  const towns = ["bengaluru", "belagavi", "belgaum", "hubballi", "hubli", "dharwad"];
  for (const tw of towns) {
    if (lower.includes(tw)) {
      result.town = (tw === "hubli" || tw === "hubballi") ? "Hubli" : (tw === "belgaum" || tw === "belagavi") ? "Belagavi" : tw.charAt(0).toUpperCase() + tw.slice(1);
      break;
    }
  }

  // 6. Anomaly type
  if (lower.includes("drop") || lower.includes("fall") || lower.includes("decline")) {
    result.anomalyType = "drop";
  } else if (lower.includes("hike") || lower.includes("surge") || lower.includes("spike")) {
    result.anomalyType = "hike";
  }

  // 7. Topic flags
  if (lower.includes("nudge") || lower.includes("whatsapp") || lower.includes("message")) {
    result.topics.push("nudge");
  }
  if (lower.includes("route") || lower.includes("beat") || lower.includes("itinerary") || lower.includes("schedule") || lower.includes("visit") || lower.includes("stop")) {
    result.topics.push("itinerary");
  }
  if (lower.includes("hierarchy") || lower.includes("parent") || lower.includes("subsidiary") || lower.includes("child")) {
    result.topics.push("hierarchy");
  }
  if (lower.includes("degrowth") || lower.includes("recovery") || lower.includes("loss")) {
    result.topics.push("degrowth");
  }
  if (lower.includes("headroom") || lower.includes("wallet share") || lower.includes("expansion")) {
    result.topics.push("headroom");
  }
  if (lower.includes("officer") || lower.includes("sales officer") || /\breps?\b/i.test(q) || /\b(?:sales\s+)?team\b/i.test(q)) {
    result.topics.push("officers");
  }
  if (lower.includes("benchmark") || lower.includes("simulation") || lower.includes("simulator") || lower.includes("seed") || lower.includes("score")) {
    result.topics.push("benchmark");
  }
  if (lower.includes("dataset") || lower.includes("datasets") || lower.includes("csv") || lower.includes("catalog") || lower.includes("table") || lower.includes("file")) {
    result.topics.push("dataset");
  }
  if (lower.includes("rule") || lower.includes("guardrail") || lower.includes("norm") || lower.includes("constraint") || lower.includes("limit")) {
    result.topics.push("guardrails");
  }
  if (lower.includes("weather") || lower.includes("rain") || lower.includes("traffic") || lower.includes("forecast")) {
    result.topics.push("weather");
  }
  if (lower.includes("replan") || lower.includes("replanning") || lower.includes("reschedule")) {
    result.topics.push("replan");
  }

  return result;
}

