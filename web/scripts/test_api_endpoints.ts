import { GET as getMetadata } from "../app/api/graph/metadata/route";
import { GET as getNeighbors } from "../app/api/graph/neighbors/[id]/route";
import { GET as searchNodes } from "../app/api/graph/search/route";
import { POST as chatHandler } from "../app/api/chat/route";

async function verifyAPIEndpoints() {
  console.log("==================================================");
  console.log("Verifying Phase 4: Next.js Serverless API Routes");
  console.log("==================================================");

  // 1. GET /api/graph/metadata
  console.log("\n[Test 1] GET /api/graph/metadata:");
  const metaRes = await getMetadata();
  const metaJson = await metaRes.json();
  console.log(`  Status: ${metaRes.status}`);
  console.log(`  Node Count: ${metaJson.node_count}, Edge Count: ${metaJson.edge_count}`);
  if (metaRes.status !== 200 || metaJson.node_count < 1900 || metaJson.edge_count < 3000) {
    throw new Error("Metadata API returned invalid counts!");
  }
  console.log("  => PASSED: Metadata API route verified.");

  // 2. GET /api/graph/neighbors/[id]
  console.log("\n[Test 2] GET /api/graph/neighbors/[id] (ID: SO-A):");
  const neighborRes = await getNeighbors(
    new Request("http://localhost:3000/api/graph/neighbors/SO-A"),
    { params: Promise.resolve({ id: "SO-A" }) }
  );
  const neighborJson = await neighborRes.json();
  console.log(`  Status: ${neighborRes.status}`);
  console.log(`  Connected Nodes: ${neighborJson.nodes?.length}, Edges: ${neighborJson.edges?.length}`);
  if (neighborRes.status !== 200 || !neighborJson.nodes || neighborJson.nodes.length === 0) {
    throw new Error("Neighbors API returned empty subgraph!");
  }
  console.log("  => PASSED: Neighbors API route verified with Next.js 15 async params.");

  // 3. GET /api/graph/search?q=A-D004
  console.log("\n[Test 3] GET /api/graph/search?q=A-D004:");
  const searchRes = await searchNodes(new Request("http://localhost:3000/api/graph/search?q=A-D004"));
  const searchJson = await searchRes.json();
  console.log(`  Status: ${searchRes.status}`);
  console.log(`  Matches found: ${searchJson.length}`);
  if (searchRes.status !== 200 || searchJson.length === 0 || searchJson[0].id !== "A-D004") {
    throw new Error("Search API failed to return matched dealer!");
  }
  console.log("  => PASSED: Search API route verified.");

  // 4. POST /api/chat - Valid Itinerary Query
  console.log("\n[Test 4] POST /api/chat (Itinerary Query):");
  const chatRes = await chatHandler(
    new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Show SO-A beat schedule on Nov 2" }),
    })
  );
  const chatJson = await chatRes.json();
  console.log(`  Status: ${chatRes.status}`);
  console.log(`  Intent: ${chatJson.intent}`);
  console.log(`  Table length: ${chatJson.table?.length}`);
  console.log(`  Graph Subgraph: ${chatJson.graph?.nodes?.length} nodes, ${chatJson.graph?.edges?.length} edges`);
  if (chatRes.status !== 200 || chatJson.table?.length !== 6) {
    throw new Error("Chat API failed on itinerary query!");
  }
  console.log("  => PASSED: Chat API route delivered multi-modal itinerary payload.");

  // 5. POST /api/chat - Safety Guardrail Mutation Blocking
  console.log("\n[Test 5] POST /api/chat (Safety Guardrail Mutation):");
  const unsafeRes = await chatHandler(
    new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "DELETE ALL DEALERS" }),
    })
  );
  const unsafeJson = await unsafeRes.json();
  console.log(`  Status: ${unsafeRes.status}`);
  console.log(`  Intent: ${unsafeJson.intent}`);
  if (unsafeRes.status !== 200 || unsafeJson.intent !== "unsafe") {
    throw new Error("Chat API failed to enforce safety guardrail!");
  }
  console.log("  => PASSED: Chat API successfully blocked mutation attempt.");

  // 6. POST /api/chat - Input Validation (Empty Query)
  console.log("\n[Test 6] POST /api/chat (Input Validation - Empty Query):");
  const emptyRes = await chatHandler(
    new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "   " }),
    })
  );
  console.log(`  Status: ${emptyRes.status} (Expected 400)`);
  if (emptyRes.status !== 400) {
    throw new Error("Chat API failed to reject empty query with 400 Bad Request!");
  }
  console.log("  => PASSED: Input validation properly rejected empty payload.");

  console.log("\n==================================================");
  console.log("ALL PHASE 4 API ROUTE TESTS PASSED 100%");
  console.log("==================================================");
}

verifyAPIEndpoints().catch((err) => {
  console.error("Phase 4 verification failed:", err);
  process.exit(1);
});

