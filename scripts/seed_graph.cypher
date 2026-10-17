// PJP-GraphRAG Neo4j Migration Script
// Generated automatically from all 46 PJP simulator datasets

// --- 1. Unique Constraints & Indexes ---
CREATE CONSTRAINT unique_officer IF NOT EXISTS FOR (o:SalesOfficer) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT unique_dealer IF NOT EXISTS FOR (d:Dealer) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT unique_visit IF NOT EXISTS FOR (v:Visit) REQUIRE v.id IS UNIQUE;
CREATE CONSTRAINT unique_event IF NOT EXISTS FOR (e:DropEvent) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT unique_nudge IF NOT EXISTS FOR (n:Nudge) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT unique_calendar IF NOT EXISTS FOR (c:CalendarDay) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT unique_tier IF NOT EXISTS FOR (t:ProductTier) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT unique_metric IF NOT EXISTS FOR (m:DailyMetric) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT unique_cancellation IF NOT EXISTS FOR (x:Cancellation) REQUIRE x.id IS UNIQUE;

// --- 2. SalesOfficer Nodes ---
MERGE (o:SalesOfficer {id: 'SO-A'}) SET o.territory = 'Bengaluru urban (west)', o.geography = 'Dense metro', o.call_norm = '6 focus dealers + 2 demand-gen calls (time reserved; no demand-gen data provided)';
MERGE (o:SalesOfficer {id: 'SO-B'}) SET o.territory = 'Bengaluru urban (west/south)', o.geography = 'Dense metro', o.call_norm = '6 focus dealers + 2 demand-gen calls (time reserved; no demand-gen data provided)';
MERGE (o:SalesOfficer {id: 'SO-C'}) SET o.territory = 'Hubballi-Dharwad-Belagavi', o.geography = 'Upcountry, multi-town', o.call_norm = '6 focus dealers + 2 demand-gen calls (time reserved; no demand-gen data provided)';
