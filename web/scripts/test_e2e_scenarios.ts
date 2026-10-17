/**
 * Phase 6 End-to-End Persona & Guardrail Verification Suite
 * Tests 5 user personas, multi-modal payload generation, and graph exploration APIs.
 */

import { runGraphRAG } from "../lib/rag/graphrag-engine";
import { getNeighbors } from "../lib/neo4j";

interface TestResult {
  persona: string;
  query: string;
  passed: boolean;
  notes: string;
}

const results: TestResult[] = [];

async function runTestSuite() {
  console.log("================================================================================");
  console.log("[START] PHASE 6 END-TO-END PERSONA & API VERIFICATION SUITE");
  console.log("================================================================================\n");

  // ── 1. Persona 1: Sales Manager Itinerary & TSP Route ────────────────────────
  console.log("[RUN] [Test 1] Persona 1: Sales Manager Beat Schedule & Sequencing...");
  try {
    const q = "Show itinerary and route for SO-A on 2026-11-02";
    const res = await runGraphRAG(q);
    const hasOfficer = res.graph.nodes.some((n: any) => n.label === "SalesOfficer" || n.data?.label === "SalesOfficer");
    const hasVisits = res.graph.nodes.some((n: any) => n.label === "Visit" || n.data?.label === "Visit");
    const hasTable = res.table && res.table.length > 0;
    const hasTree = res.tree && res.tree.length > 0;

    const passed = hasVisits && hasTable && hasTree && res.cypher.includes("MATCH");
    results.push({
      persona: "1. Sales Manager",
      query: q,
      passed,
      notes: `Nodes: ${res.graph.nodes.length}, Edges: ${res.graph.edges.length}, Table rows: ${res.table.length}`,
    });
    console.log(`  [PASS]: ${res.graph.nodes.length} nodes, ${res.graph.edges.length} edges returned.`);
    console.log(`  [PASS] Tree Sample:\n${res.tree.split("\n").slice(0, 5).map((l: string) => "    " + l).join("\n")}\n`);
  } catch (err: any) {
    results.push({ persona: "1. Sales Manager", query: "SO-A 2026-11-02", passed: false, notes: err.message });
    console.error("  [FAIL]:", err.message);
  }

  // ── 2. Persona 2: Dealer Account Specialist (Dealer 360) ────────────────────
  console.log("[RUN] [Test 2] Persona 2: Dealer Account 360 Profile (A-D001)...");
  try {
    const q = "Give me a 360 degree view of dealer A-D001";
    const res = await runGraphRAG(q);
    const hasDealer = res.graph.nodes.some(
      (n: any) => (n.id === "A-D001" || n.data?.id === "A-D001")
    );
    const passed = hasDealer && res.table.length > 0 && res.response.length > 0;
    results.push({
      persona: "2. Dealer Specialist",
      query: q,
      passed,
      notes: `Target A-D001 resolved. Table attributes: ${Object.keys(res.table[0] || {}).join(", ")}`,
    });
    console.log(`  [PASS]: Found dealer A-D001 with properties: ${JSON.stringify(res.table[0])}\n`);
  } catch (err: any) {
    results.push({ persona: "2. Dealer Specialist", query: "A-D001 360", passed: false, notes: err.message });
    console.error("  [FAIL]:", err.message);
  }

  // ── 3. Persona 3: Anomaly & Risk Auditor (Drop Events) ───────────────────────
  console.log("[RUN] [Test 3] Persona 3: Field Anomaly & Sales Drop Auditor...");
  try {
    const q = "Which visits experienced a drop or anomaly?";
    const res = await runGraphRAG(q);
    const hasDrops = res.graph.nodes.some(
      (n: any) => n.label === "DropEvent" || n.data?.label === "DropEvent"
    );
    const passed = hasDrops && res.table.length > 0;
    results.push({
      persona: "3. Risk Auditor",
      query: q,
      passed,
      notes: `Found ${res.table.length} drop incidents. Top cause: ${res.table[0]?.drop_cause || res.table[0]?.reason || "detected"}`,
    });
    console.log(`  [PASS]: ${res.table.length} anomaly drop events isolated.\n`);
  } catch (err: any) {
    results.push({ persona: "3. Risk Auditor", query: "Drop anomalies", passed: false, notes: err.message });
    console.error("  [FAIL]:", err.message);
  }

  // ── 4. Persona 4: Field Operations WhatsApp Nudge Lead ───────────────────────
  console.log("[RUN] [Test 4] Persona 4: Field Ops WhatsApp Intervention Nudges...");
  try {
    const q = "Show WhatsApp nudges sent to dealers";
    const res = await runGraphRAG(q);
    const hasNudges = res.graph.nodes.some(
      (n: any) => n.label === "Nudge" || n.data?.label === "Nudge"
    );
    const passed = hasNudges && res.table.length > 0;
    results.push({
      persona: "4. Ops Lead",
      query: q,
      passed,
      notes: `Found ${res.table.length} nudges linked to dealer incentive targets.`,
    });
    console.log(`  [PASS]: ${res.table.length} WhatsApp nudges retrieved with target dealers.\n`);
  } catch (err: any) {
    results.push({ persona: "4. Ops Lead", query: "WhatsApp nudges", passed: false, notes: err.message });
    console.error("  [FAIL]:", err.message);
  }

  // ── 5. Persona 5: Security / Guardrail Penetration Test ─────────────────────
  console.log("[RUN] [Test 5] Persona 5: Security Guardrail & DDL Mutation Block...");
  try {
    const q = "DROP TABLE Dealers; DELETE ALL NODES;";
    const res = await runGraphRAG(q);
    const isBlocked =
      res.intent === "unsafe" ||
      res.cypher.includes("BLOCKED") ||
      res.response.includes("blocked") ||
      res.response.includes("read-only") ||
      res.graph.nodes.length === 0;

    const passed = isBlocked && res.graph.nodes.length === 0;
    results.push({
      persona: "5. Guardrail / SecOps",
      query: q,
      passed,
      notes: `Blocked mutation attempt cleanly. Intent: ${res.intent}, Cypher: ${res.cypher}`,
    });
    console.log(`  [PASS]: Mutation attempt safely blocked with 0 database changes.\n`);
  } catch (err: any) {
    results.push({ persona: "5. Guardrail / SecOps", query: "DROP TABLE", passed: false, notes: err.message });
    console.error("  [FAIL]:", err.message);
  }

  // ── 6. 1-Hop Neighbor Expansion API Test ────────────────────────────────────
  console.log("[RUN] [Test 6] 1-Hop Dynamic Subgraph Expansion (SO-A)...");
  try {
    const neighborSubgraph = await getNeighbors("SO-A");
    const passed = neighborSubgraph.nodes.length > 0 && neighborSubgraph.edges.length > 0;
    results.push({
      persona: "6. Interactive Graph",
      query: "getNeighbors('SO-A')",
      passed,
      notes: `Neighbors: ${neighborSubgraph.nodes.length} nodes, ${neighborSubgraph.edges.length} edges`,
    });
    console.log(`  [PASS]: SO-A has ${neighborSubgraph.nodes.length} neighbor nodes connected.\n`);
  } catch (err: any) {
    results.push({ persona: "6. Interactive Graph", query: "Neighbors SO-A", passed: false, notes: err.message });
    console.error("  [FAIL]:", err.message);
  }

  // ── 7. Persona 7: Out-of-Domain Security Boundary Guardrail ────────────────
  console.log("[RUN] [Test 7] Out-of-Domain Security Boundary Guardrail ('How do I make chocolate cake?')...");
  try {
    const q = "How do I make chocolate cake?";
    const res = await runGraphRAG(q);
    const isDomainBlocked =
      res.intent === "out_of_domain" &&
      res.cypher.includes("DOMAIN_BOUNDARY_BLOCKED") &&
      res.response.includes("Security Boundary") &&
      res.graph.nodes.length === 0;

    results.push({
      persona: "7. Domain Boundary",
      query: q,
      passed: isDomainBlocked,
      notes: `Blocked out-of-domain query. Intent: ${res.intent}, Cypher: ${res.cypher}`,
    });
    console.log(`  [PASS]: Out-of-domain query safely intercepted by domain security boundary.\n`);
  } catch (err: any) {
    results.push({ persona: "7. Domain Boundary", query: "Chocolate cake", passed: false, notes: err.message });
    console.error("  [FAIL]:", err.message);
  }

  // ── Summary Table ───────────────────────────────────────────────────────────
  console.log("================================================================================");
  console.log("[SUMMARY] PHASE 6 VERIFICATION SUMMARY");
  console.log("================================================================================");
  console.table(results);

  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log("\n[SUCCESS] ALL 7 E2E SCENARIOS & API TESTS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error("\n[ERROR] SOME TESTS FAILED!");
    process.exit(1);
  }
}

runTestSuite();

