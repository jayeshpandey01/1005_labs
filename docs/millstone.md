# Research plan and milestones: PJP proof of concept

## Timing check first

Today is Friday 16 October. The email asks for the deliverables before the call on Sunday, while the brief allows five days. That leaves about two days, with a possible move to Monday or Tuesday. I would ask for **Tuesday 20 October**. The plan below assumes about 4.5 working days and marks what to cut if Sunday stays fixed.

---

## Strategic Evaluation: Graph Modeling vs. "Graphy" Tool

Before committing to code changes, we explicitly evaluated the role of **Graph Modeling** and the distinction regarding **"Graphy"**:

### 1. Disambiguation: "Graph Approach" vs. "Graphy"
* **Option A: Graph Modeling in Python (`networkx`)**: Represents entities and spatial networks as mathematical graphs in memory. Requires zero external servers, zero graph databases (no Neo4j), and keeps the project 100% reproducible via a single CLI command. **(Recommended & adopted for pipeline stages 2, 3, 5, and maps).**
* **Option B: "Graphy" as a Presentation Tool (`graphy.app`)**: An AI-assisted data storytelling and charting tool. Relevant strictly for the *last-mile deliverable* (generating executive charts for the 2-page write-up comparing baseline adherence 35–55% against simulated 90%+), but not part of the internal computational algorithm.

### 2. Where the Graph Approach Adds Value

| Pipeline Stage | Graph Model & Library | Concrete Operational Benefit |
|---|---|---|
| **Rank (Stage 1)** | **Entity Relationship Graph (`networkx.DiGraph`)** | Directed edges map parent/child links (e.g. child `A-D138` $\to$ parent `A-D019`) and shared GSTIN owners. Rolls up secondary sales and scheme target points to the billing parent entity so owners are not double-counted or double-visited. |
| **Schedule (Stage 2)** | **Spatial Travel-Time Graph (`networkx.Graph`)** | Undirected graph where nodes are dealer coordinates and edges are simulator-exact travel minutes ($\text{dist} \times 1.35 / \text{speed} \times 60$). Graph community clustering partitions the 130–150 focus accounts into 25 compact, localized daily beats. |
| **Route (Stage 3)** | **Daily Tour Subgraph (`G_tour`)** | A complete 7-node weighted graph for each day (SO home base + 6 daily focus dealers). Solves the Traveling Salesperson Problem (TSP) using 2-opt / Lin-Kernighan heuristics to guarantee routes fit the 460-minute daily budget. |
| **Re-plan (Stage 5)** | **Dynamic Graph Perturbation** | When an urgent sales drop triggers a recovery visit, the engine calculates the edge-weight delta ($\Delta t$) of inserting the node into existing daily tours, confirming feasibility before rewriting the plan. |
| **Deliverables (Maps)** | **Spatial Graph Visualization (`matplotlib` + `networkx`)** | Directly plots the optimal daily tour on coordinates for each SO, providing the 1-day visual route map requested in Section 6 of the assignment brief. |

### 3. Where a Graph Does NOT Help (And Must Not Be Used)
* **Ranking Formulas:** De-growth (value-lost MoM, QoQ, YoY) and GST turnover headroom are purely tabular sales/tax algebra, not graph properties.
* **Drop & Spike Anomaly Detection:** Sudden drops ($f \times 0.25$) and hikes ($f \times 2.2$) are statistical time-series change-point events (handled via CUSUM / Croston filters on daily sales), not graph traversals.
* **Scoring:** The simulator (`simulate.py`) evaluates adherence, coverage, and drop response externally.

---

## Part 1: Research plan

Each question below is answered from the data or the simulator, not from the web. The answer feeds a specific design decision.

| # | Research question | How to answer it | Decision it drives |
|---|---|---|---|
| R1 | Can I reproduce the baseline (adherence 55% / 35% / none, ad-hoc share, 180 calls, 33 visits to one dealer)? | Recompute from `SFDC_Activities` and compare with `Baseline_Metrics` | Confirms I read the data correctly; supplies the "today" column for the write-up |
| R2 | How much of the 677 dealers actually matters? | Count active dealers (at least 0.5 sheets a day, the simulator's threshold) per SO, and the share of value from the top 20% | Focus-set size and the number of dormant dealers to ignore |
| R3 | How do I turn a GST turnover slab into a rupee figure, and how far can I trust it? | Cross-check the slab against each dealer's own purchases from us. If we buy more than the slab implies, the slab is wrong or stale | Potential/headroom formula and confidence weighting |
| R4 | Which de-growth measure is most predictive, and what is the YoY limit? | Backtest: rank dealers at an earlier cut-off (say 1 July) and see which measure best predicts the later decline. YoY only has about 6 months of overlap | Weights for MoM, QoQ and YoY |
| R5 | Do parent/child outlets and duplicate owners distort ranking? | Build `G_entity` (`networkx.DiGraph`) on `parent_dealer_id` and inspect the link (`A-D138` $\to$ `A-D019`) against `Scheme_Targets` | Grouping and volume-rollup rule for parent-child outlets |
| R6 | What does a "sudden drop" look like in this data? | Measure the day-to-day noise of each dealer, then find historical drops that exceed it | Drop detector thresholds (CUSUM filter parameters) |
| R7 | How realistic are the simulator's travel and time assumptions against real SFDC days? | Compare simulated travel with check-in gaps in the SFDC log; check median call lengths (22–36 minutes) | Safety margins in routing and time-budget slack |
| R8 | How much slack does the plan need? | Run the simulator on static plans at 110, 125 and 140 visits per SO and compare coverage and adherence | Final focus-set size per SO |
| R9 | Where does club status matter? | Count club dealers per SO (8 in A, 18 in B, 1 in C), their slab targets and points to date | How many slots clubs consume (2 slots each); what the nudges say |
| R10 | How good is the 80% weather forecast as an input? | Compute the cost of trusting it for next-day planning versus ignoring it | Whether to plan 5 visits on forecast-bad days to prevent `missed_weather` |
| R11 | How to model and visualize daily routes using a spatial graph? | Construct `G_travel` using coordinates and road factors, sequence via TSP, and render 2D route plots with `matplotlib` | Route feasibility verification and the 1-day map deliverable per SO |

---

## Part 2: Milestones

Each milestone has an outcome, tasks, acceptance criteria and the check that proves it is done. A milestone isn't finished until its check passes.

### M0: Alignment and setup (Fri evening, about 2 hours)
- **Outcome:** The scope, dependencies, and timeline are agreed.
- **Tasks:** Confirm environment (`py -3.11` launcher, `openpyxl`, `networkx`, `matplotlib` verified), confirm assumptions on parent/child outlets and demand-generation reservation (80 min), test baseline simulator with passthrough script.
- **Acceptance:** The workbook loads cleanly, `simulate.py` runs on a passthrough plan, and the assumptions log is started.

### M1: Data understanding, baseline & entity graph (Fri night, about half a day)
- **Outcome:** A trusted view of the data, the baseline benchmark, and the entity graph.
- **Tasks:** 
  1. Solve R1, R2, and R5.
  2. Construct `G_entity` in `networkx` mapping `parent_dealer_id` (`A-D138` $\to$ `A-D019`) and verify that target points roll up to the parent.
  3. Compile the data-gaps log: 282 missing locations (assigned 25/45 min default penalties), 9 invalid GSTINs, dormant accounts (< 0.5 sheets/day).
- **Acceptance:** Baseline numbers match `Baseline_Metrics` (Sept adherence: 55.2% SO-A, 35.3% SO-B, 0% SO-C), and the entity graph correctly aggregates child volumes.

### M2: Ranking & focus selection (Sat morning, about half a day)
- **Outcome:** A ranked, explainable dealer list and the focus set per SO.
- **Tasks:** 
  1. Solve R3, R4, R6, and R9.
  2. Build composite score: Value-Lost De-growth (MoM/QoQ/YoY), GST Headroom, Drop vulnerability, and Club priority.
  3. Apply parent-child rollup via `G_entity`.
  4. Select focus accounts respecting capacity: 150 total visit slots per SO minus ($2 \times N_{\text{club}}$).
- **Acceptance:** Every dealer has an explainable score with separate component columns; spot check of top 10 per SO makes commercial sense; club dealers take exactly 2 visit allocations.

### M3: Scheduling & spatial clustering (Sat midday, about 3–4 hours)
- **Outcome:** A feasible November calendar for each SO.
- **Tasks:** 
  1. Solve R8.
  2. Construct `G_travel` (`networkx.Graph`) with edge weights equal to simulator travel times.
  3. Partition focus accounts into 25 daily geographic clusters using spatial proximity.
  4. Schedule high-value de-growing accounts into Working Days 1 to 10.
  5. Schedule Club dealers for exactly 2 visits with at least 10 working days separation (target $\approx 14$ calendar days).
- **Acceptance:** Automated checks show 0 days above 6 dealer visits, 0 dealers above 2 visits, clubs at exactly 2 visits with $\ge 10$ days gap, and 0 cross-SO assignments.

### M4: Routing & TSP sequencing (Sat afternoon, about 3 hours)
- **Outcome:** An ordered, timed route for every day.
- **Tasks:** 
  1. Solve R7 and R11.
  2. For each day, build the complete tour subgraph `G_tour` containing the SO home base and the 6 scheduled dealers.
  3. Sequence stops using TSP heuristics (2-opt) to minimize travel minutes.
  4. Add arrival times and verify the 460-minute budget with safety margins.
  5. Format output CSV matching simulator specification (`date, so_id, sequence, account_id, account_type, planned_arrival, travel_min_from_previous, reason`).
- **Acceptance:** All 25 days per SO fit the 460-minute budget; missing-location penalties (25/45 min) are distributed safely; CSV passes validation.

### M5: WhatsApp nudges (Sat evening, about 2 hours)
- **Outcome:** At least 5 data-grounded WhatsApp messages with underlying evidence.
- **Tasks:** Select visits displaying distinct triggers (loyalty slab target gap, tier-specific volume drop, high-headroom dormant account), and draft messages under 300 characters each.
- **Acceptance:** Every numerical value traces directly to a data row; each message concludes with a single, clear call-to-action.

### M6: Re-plan command (Sun, about a full day)
- **Outcome:** A production-grade CLI command meeting the simulator contract (`--state`, `--plan`, `--out`).
- **Tasks:** 
  1. Solve R10.
  2. Implement stateful memory with reset mechanism.
  3. Online CUSUM drop detector (monitoring the 113 active dealers with rate $\ge 0.5$).
  4. Sales hike cancellation optimizer.
  5. Weather forecast handler: if tomorrow is `rain` or `traffic`, plan only 5 visits, defer the 6th, and prioritize club/value-at-risk.
  6. Graph perturbation check: verify insertion delta $\Delta t$ on `G_tour` before committing changes.
  7. Hard guardrail enforcer ensuring zero rule violations.
- **Acceptance:** Zero failures across a full November simulation, runtime $< 15$ seconds per day (well under the 120s limit), and 0 guardrail breaches.

### M7: Simulation & tuning (Sun night to Mon, about half a day)
- **Outcome:** Validated results on practice seeds 1, 2, and 3.
- **Tasks:** Run `simulate.py` across static and re-planned modes, inspect `events_revealed.csv` to diagnose missed drops, and refine statistical thresholds rather than hardcoding seed values.
- **Acceptance:** Adherence $\ge 90\%$, Focus Coverage $\ge 95\%$, Drop Response $\ge 70\%$, Club Cadence $100\%$, and 0 guardrail violations across all 3 seeds.

### M8: Packaging, route maps & write-up (Mon, about 4–5 hours)
- **Outcome:** Complete submission package.
- **Tasks:** 
  1. Create single-command runner script (`python -m mypjp.run` or `run.bat`).
  2. Generate one-day route map visual per SO from `G_travel` using `matplotlib`/`networkx` (and optional executive charts via Graphy).
  3. Author the 2-page approach and findings write-up.
  4. Ensure repository README and unit tests are complete.
- **Acceptance:** Clean repository checkout runs end-to-end from the raw Excel workbook; write-up fits 2 pages; all evaluation criteria satisfied.

---

## Timeline at a glance

| Day | Milestones | Primary Deliverable |
|---|---|---|
| **Fri 16 Oct** | M0, M1 | Environment ready, data gaps log, baseline replicated, `G_entity` built |
| **Sat 17 Oct** | M2, M3, M4, M5 | Ranking scores, 25-day clustered schedule, TSP daily routes, WhatsApp nudges |
| **Sun 18 Oct** | M6 | Dynamic re-planner (`replan.py`) with drop recovery and weather adaptation |
| **Mon 19 Oct** | M7, M8 | Simulation results across seeds 1–3, route maps, 2-page write-up |
| **Tue 20 Oct** | Buffer | Final review and submission |

---

## Quality gates

Before submitting, verify that:
1. **Guardrails show 0 breaches:** No day with $> 6$ visits, no dealer with $> 2$ visits, no cross-SO visits, 0 re-plan timeouts.
2. **Coverage is measured on the original plan:** Preserved across dynamic re-planning operations.
3. **Graph computations are fully reproducible:** Pure Python in-memory `networkx`, running in milliseconds without external daemons.
4. **Honest documentation:** The write-up explicitly documents data gaps (missing GPS, invalid GSTINs) and what was hard or failed.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Weather Disruption Caps (5 visits)** | Use 80% accurate forecast to schedule exactly 5 visits on bad weather days, deferring the 6th to prevent `missed_weather`. |
| **False Drop Alarms from Sales Noise** | Restrict drop detector to the 113 active dealers ($\text{rate} \ge 0.5$); use multi-day CUSUM instead of single-day dips. |
| **Missing Coordinates Travel Penalty** | 282 dealers have null coordinates (25/45 min penalty). Distribute at most 1 unlocated dealer per day. |
| **Overfitting to Seeds 1–3** | Tune structural CUSUM thresholds and graph heuristics, never seed-specific lookup tables. |
| **Graph Computational Overhead** | All graphs operate strictly in-memory using lightweight adjacency lists; 7-node daily TSP runs in $< 1\text{ ms}$. |