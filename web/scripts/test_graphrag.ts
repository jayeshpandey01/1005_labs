import { runGraphRAG } from "../lib/rag/graphrag-engine";
import { detectIntent } from "../lib/rag/intent";
import { discoverEntities } from "../lib/rag/entities";

async function verifyGraphRAGEngine() {
  console.log("==================================================");
  console.log("Verifying Phase 3: Graph-Based RAG & NLP Engine");
  console.log("==================================================");

  // 1. Safety Guardrail Test
  console.log("\n[Test 1] Safety Guardrail Verification:");
  const unsafeQuery = "DROP TABLE dealers; DELETE ALL NODES";
  const unsafeResult = await runGraphRAG(unsafeQuery);
  console.log(`  Intent detected: ${unsafeResult.intent}`);
  console.log(`  Response: ${unsafeResult.response}`);
  if (unsafeResult.intent !== "unsafe" || !unsafeResult.response.includes("Prohibited")) {
    throw new Error("Safety guardrail failed to block destructive mutation query!");
  }
  console.log("  => PASSED: Destructive mutation safely blocked.");

  // 2. General Conversation Test
  console.log("\n[Test 2] Conversational Onboarding Test:");
  const generalResult = await runGraphRAG("hello who are you");
  console.log(`  Intent detected: ${generalResult.intent}`);
  if (generalResult.intent !== "general" || !generalResult.response.includes("PJP Sales Optimization Copilot")) {
    throw new Error("General conversational greeting failed!");
  }
  console.log("  => PASSED: Conversational onboarding verified.");

  // 3. Entity Extraction Test
  console.log("\n[Test 3] Entity Extraction Test:");
  const testEnt = discoverEntities("Show SO-A beat schedule on Nov 2 for dealer A-D004 with drop alerts");
  console.log("  Extracted Entities:", testEnt);
  if (testEnt.officerId !== "SO-A" || testEnt.date !== "2026-11-02" || testEnt.dealerId !== "A-D004" || testEnt.anomalyType !== "drop") {
    throw new Error("Entity discovery failed to extract canonical IDs!");
  }
  console.log("  => PASSED: Entity extractor accurately parsed SO, date, dealer, and anomaly.");

  // 4. Officer Daily Beat Itinerary Test
  console.log("\n[Test 4] Officer Daily Itinerary GraphRAG Test:");
  const itineraryResult = await runGraphRAG("Show SO-A beat schedule on Nov 2");
  console.log(`  Intent: ${itineraryResult.intent}`);
  console.log(`  Executed Cypher:\n${itineraryResult.cypher}`);
  console.log(`  Table records: ${itineraryResult.table.length}`);
  console.log(`  Tree Formatted Output:\n${itineraryResult.tree}`);
  console.log(`  Grounded Response:\n${itineraryResult.response}`);
  if (itineraryResult.table.length !== 6) {
    throw new Error(`Expected 6 visits in itinerary, got ${itineraryResult.table.length}`);
  }
  if (!itineraryResult.tree.includes("A-D056") || !itineraryResult.tree.includes("A-D004")) {
    throw new Error("Tree output missing expected dealer stops!");
  }
  console.log("  => PASSED: Itinerary query resolved with full multi-modal payload.");

  // 5. Dealer 360 & Reason for Visit Test
  console.log("\n[Test 5] Dealer 360 & De-growth Recovery Reason:");
  const dealer360Result = await runGraphRAG("Why was A-D004 visited on Nov 2?");
  console.log(`  Table records: ${dealer360Result.table.length}`);
  console.log(`  Grounded Response:\n${dealer360Result.response}`);
  if (dealer360Result.table.length === 0) {
    throw new Error("Failed to retrieve Dealer 360 records for A-D004");
  }
  console.log("  => PASSED: Dealer 360 resolved with de-growth and headroom telemetry.");

  // 6. Drop Anomaly Test
  console.log("\n[Test 6] Drop Anomaly Telemetry Test:");
  const dropResult = await runGraphRAG("Which dealers experienced a sales drop?");
  console.log(`  Active drop events found: ${dropResult.table.length}`);
  if (dropResult.table.length === 0) {
    throw new Error("Failed to retrieve drop anomaly records");
  }
  console.log("  => PASSED: Drop anomaly records retrieved.");

  // 7. WhatsApp Nudges Test
  console.log("\n[Test 7] WhatsApp Nudges Test:");
  const nudgeResult = await runGraphRAG("Show WhatsApp nudges sent to dealers");
  console.log(`  Nudges found: ${nudgeResult.table.length}`);
  if (nudgeResult.table.length !== 5) {
    throw new Error(`Expected 5 nudges, got ${nudgeResult.table.length}`);
  }
  console.log("  => PASSED: WhatsApp intervention nudges retrieved.");

  console.log("\n==================================================");
  console.log("ALL PHASE 3 GRAPHRAG ENGINE TESTS PASSED 100%");
  console.log("==================================================");
}

verifyGraphRAGEngine().catch((err) => {
  console.error("Phase 3 verification failed:", err);
  process.exit(1);
});

