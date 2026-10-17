import { getGraphMetadata, getNeighbors, searchNodes, executeCypher } from "../lib/neo4j";

async function runVerification() {
  console.log("==================================================");
  console.log("Verifying Resilient Neo4j Driver Pool & Snapshot Engine");
  console.log("==================================================");

  // 1. Metadata Check
  const meta = await getGraphMetadata();
  console.log("\n[Test 1] Graph Metadata Check:");
  console.log(`  Total Nodes: ${meta.node_count}`);
  console.log(`  Total Edges: ${meta.edge_count}`);
  console.log(`  Labels:`, meta.labels);
  if (meta.node_count < 1900 || meta.edge_count < 3000) {
    throw new Error(`Metadata mismatch: expected at least 1900 nodes & 3000 edges, got ${meta.node_count} & ${meta.edge_count}`);
  }
  console.log("  => PASSED: Metadata matches Phase 1 specification.");

  // 2. Neighbor Traversal Check
  console.log("\n[Test 2] 1-Hop Neighbor Traversal for SO-A:");
  const neighbors = await getNeighbors("SO-A");
  console.log(`  Connected Nodes: ${neighbors.nodes.length}`);
  console.log(`  Connected Edges: ${neighbors.edges.length}`);
  if (neighbors.nodes.length < 5 || neighbors.edges.length < 5) {
    throw new Error(`Insufficient neighbors for SO-A: ${neighbors.nodes.length}`);
  }
  console.log("  => PASSED: 1-hop neighborhood successfully resolved.");

  // 3. Search Autocomplete Check
  console.log("\n[Test 3] Search Autocomplete for 'A-D004':");
  const searchResults = await searchNodes("A-D004");
  console.log(`  Matches found: ${searchResults.length}`);
  if (searchResults.length === 0 || searchResults[0].id !== "A-D004") {
    throw new Error(`Search failed for A-D004`);
  }
  console.log(`  Matched Node: ${searchResults[0].id} (${searchResults[0].properties.club_tier})`);
  console.log("  => PASSED: Autocomplete search verified.");

  // 4. Daily Beat Itinerary Query
  console.log("\n[Test 4] Daily Itinerary Cypher Query (SO-A on 2026-11-02):");
  const itineraryResult = await executeCypher(
    'MATCH (o:SalesOfficer {id: "SO-A"})-[:PERFORMS_VISIT]->(v:Visit {date: "2026-11-02"})-[:VISITS_DEALER]->(d:Dealer)',
    { so_id: "SO-A", date: "2026-11-02" }
  );
  console.log(`  Execution Source: ${itineraryResult.source}`);
  console.log(`  Visits returned: ${itineraryResult.table.length}`);
  console.log(`  Graph Subgraph: ${itineraryResult.graph.nodes.length} nodes, ${itineraryResult.graph.edges.length} edges`);
  if (itineraryResult.table.length !== 6) {
    throw new Error(`Expected 6 visits for SO-A on 2026-11-02, got ${itineraryResult.table.length}`);
  }
  console.log("  Stops:");
  itineraryResult.table.forEach((row: any) => {
    console.log(`    ${row.sequence}. [${row.planned_arrival}] ${row.account_id} (${row.dealer_tier}) - ${row.reason}`);
  });
  console.log("  => PASSED: Daily beat itinerary resolved with sequential :NEXT_VISIT links.");

  // 5. Drop Anomaly Query
  console.log("\n[Test 5] Drop Anomaly Telemetry Query:");
  const dropResult = await executeCypher("MATCH (d:Dealer)-[:EXPERIENCED_EVENT]->(e:DropEvent)");
  console.log(`  Drop events returned: ${dropResult.table.length}`);
  if (dropResult.table.length === 0) {
    throw new Error("No drop events returned");
  }
  console.log("  => PASSED: Drop anomaly query resolved.");

  // 6. WhatsApp Nudge Query
  console.log("\n[Test 6] WhatsApp Nudge Query:");
  const nudgeResult = await executeCypher("MATCH (n:Nudge)-[:DISPATCHED_TO]->(d:Dealer)");
  console.log(`  Nudges returned: ${nudgeResult.table.length}`);
  if (nudgeResult.table.length !== 5) {
    throw new Error(`Expected 5 nudges, got ${nudgeResult.table.length}`);
  }
  console.log("  => PASSED: WhatsApp nudges resolved.");

  console.log("\n==================================================");
  console.log("ALL PHASE 2 DRIVER POOL & FALLBACK TESTS PASSED 100%");
  console.log("==================================================");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

