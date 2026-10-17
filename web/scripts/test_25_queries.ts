import { runGraphRAG } from "../lib/rag/graphrag-engine";

const QUERIES = [
  "Show all sales officers",
  "Show dealers in Hubballi",
  "Show platinum club dealers",
  "Which dealers have the highest headroom?",
  "Which dealers have highest de-growth?",
  "Show sales hike events",
  "What were the simulation benchmark results across seeds?",
  "What are the PJP call norms and guardrail rules?",
  "What CSV datasets are available in the system?",
  "Show SO-B itinerary",
  "Show visits on Nov 2",
  "Show all drop events",
  "Show WhatsApp incentive nudges",
  "Show commercial hierarchy for A-D019",
  "Why was A-D004 visited on Nov 2?",
  "Show wallet headroom expansion for SO-A on Nov 2",
  "Show recovery stops and de-growth alerts for SO-A on Nov 2",
  "Show sequenced arrival schedule for SO-A on Nov 2",
  "How does weather affect travel time?",
  "How does dynamic replanning work?",
  "Tell me about dealer A-D001",
  "Show dealers managed by SO-C",
  "Show gold club dealers",
  "Which dealers are in Belagavi?",
  "Show diamond dealers",
];

async function runTest() {
  console.log("================================================================================");
  console.log("TESTING 25 NATURAL USER QUESTIONS AGAINST PJP-GRAPHRAG ENGINE");
  console.log("================================================================================");

  let passed = 0;
  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    const res = await runGraphRAG(q);
    const ok = res.intent === "domain_query" && res.table.length > 0 && !res.response.includes("Security Boundary Notice");
    if (ok) passed++;

    console.log(`\n[${i + 1}/25] Query: "${q}"`);
    console.log(`  Status: ${ok ? "PASS" : "FAIL"}`);
    console.log(`  Intent: ${res.intent} | Table Rows: ${res.table.length} | Graph Nodes: ${res.graph.nodes.length}`);
    console.log(`  Summary: ${res.response.split("\n")[0]} (Preview: ${res.response.slice(0, 120).replace(/\n/g, " ")}...)`);
  }

  console.log("\n" + "=".repeat(80));
  console.log(`FINAL RESULT: ${passed}/25 PASSED (${((passed / 25) * 100).toFixed(1)}%)`);
  console.log("=".repeat(80));

  if (passed !== 25) {
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});

