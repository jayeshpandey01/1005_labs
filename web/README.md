# Permanent Journey Plan (PJP) Sales Optimization Copilot

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Neo4j](https://img.shields.io/badge/Neo4j-Graph_Database-008CC1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com/)
[![GraphRAG](https://img.shields.io/badge/GraphRAG-Claude_3.5_Sonnet-7C3AED?style=flat-square)](https://openrouter.ai/)
[![Cytoscape.js](https://img.shields.io/badge/Cytoscape.js-3.30-EA580C?style=flat-square)](https://js.cytoscape.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-36%2F36_Passed-brightgreen?style=flat-square)]()
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)]()
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Excalidraw-6965DB?style=flat-square&logo=excalidraw&logoColor=white)](https://excalidraw.com/#room=391d1052d4bbd9ac9409,aBrJo3ZKYg1Ere4rj7_Tsg)
[![Code Style](https://img.shields.io/badge/Code_Style-Prettier-261230?style=flat-square)]()

An interactive visual canvas and conversational GraphRAG copilot for **field sales optimization, multi-hop itinerary reasoning, and beat transit analytics**. Modeled after [`jayeshpandey01/Graph-Based-Query-System`](https://github.com/jayeshpandey01/Graph-Based-Query-System), the platform features hardware-accelerated Cytoscape.js network topologies, interactive per-stop transit breakdown bar charts with click-to-chat deep linking, natural language-to-Cypher retrieval, and dual-mode resilience between live Neo4j AuraDB and an in-memory graph snapshot (<5ms latency).

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Platform Visual Overview](#2-platform-visual-overview)
3. [Knowledge Graph Schema & Data Foundation](#3-knowledge-graph-schema--data-foundation)
4. [Key Functional Capabilities](#4-key-functional-capabilities)
5. [Architecture & File Layout](#5-architecture--file-layout)
6. [Quickstart & Installation](#6-quickstart--installation)
7. [Automated Test Suites & Verification](#7-automated-test-suites--verification)
8. [Vercel Cloud Deployment](#8-vercel-cloud-deployment)

---

## 1. System Overview

> **Interactive System Architecture Canvas:**  
> [View Complete PJP System Architecture on Excalidraw](https://excalidraw.com/#room=391d1052d4bbd9ac9409,aBrJo3ZKYg1Ere4rj7_Tsg)

The PJP Sales Optimization Copilot provides an interactive visual dashboard and conversational AI interface for managing field sales operations in laminate distribution. Designed to operate over November 2026 Permanent Journey Plans across three Sales Officers (SO-A, SO-B, and SO-C), the application bridges complex graph-structured data with actionable business insights.

The platform combines three core technologies:
1. **Interactive Cytoscape.js Canvas:** Renders force-directed graph topologies connecting officers, assigned dealers, scheduled daily visits, sequential transition times, and anomaly drop events.
2. **Beat Transit Analytics Engine:** Delivers per-stop transit duration breakdowns, identifies route bottlenecks, and links visual elements directly to the conversational copilot via click-to-chat.
3. **Graph-Based Retrieval-Augmented Generation (GraphRAG):** Synthesizes read-only Cypher queries from natural language questions using Claude 3.5 Sonnet / Gemini 2.0 Flash, backed by an in-memory graph snapshot fallback with sub-5ms response latency.

---

## 2. Platform Visual Overview

### Figure 1: Interactive Cytoscape.js Knowledge Graph & Sequenced Route Visualizer
Hardware-accelerated visual canvas depicting Sales Officer radial allocations, sequenced daily Visit waypoints with directional `:NEXT_VISIT` transit times, assigned Dealers color-coded by loyalty tier, and anomaly Drop Events.

![Interactive Cytoscape.js Knowledge Graph](public/images/tree_graph.png)

### Figure 2: Beat Transit Analytics Bar Chart & GraphRAG Chat Terminal
Dual-mode analytics visualizer showing per-stop transit time breakdowns, cumulative travel duration (87.6 minutes), route threshold warnings, and grounded natural language GraphRAG answers.

![Beat Transit Analytics Bar Chart & GraphRAG Chat Terminal](public/images/Bar_graph.png)

---

## 3. Knowledge Graph Schema & Data Foundation

The underlying knowledge graph models the operational universe across 1,134 entity nodes and 1,913 directed relationships:

### Node Schema
| Node Label | Count | Primary Attributes | Description |
|---|---|---|---|
| `SalesOfficer` | 3 | `id`, `name`, `territory`, `geography`, `start_lat`, `start_lon`, `dealers_in_universe` | Field sales officers (SO-A, SO-B, SO-C) managing designated geographic zones. |
| `Dealer` | 677 | `id`, `name`, `club_tier`, `lat`, `lon`, `has_gps`, `headroom_inr`, `degrowth_mom_inr`, `annual_purchases_inr` | Commercial outlets categorized across loyalty tiers (Platinum, Gold, Silver, Elite, Diamond, Non-Club). |
| `Visit` | 425 | `id`, `so_id`, `date`, `sequence`, `planned_arrival`, `travel_min`, `reason` | Scheduled beat visits with chronological arrival timestamps and transit estimates. |
| `DropEvent` | 24 | `id`, `dealer_id`, `onset`, `drop_pct`, `type`, `seed` | Simulated sales drops and hikes tracked by the CUSUM change-point engine. |
| `Nudge` | 5 | `id`, `nudge_id`, `dealer_id`, `trigger_type`, `message`, `character_count` | Personalized WhatsApp incentive nudges dispatched to close scheme targets. |

### Relationship Schema
| Relationship Type | Count | Connects | Semantic Description |
|---|---|---|---|
| `:PERFORMS_VISIT` | 425 | `SalesOfficer` -> `Visit` | Connects an officer to a planned daily visit stop. |
| `:VISITS_DEALER` | 425 | `Visit` -> `Dealer` | Directs a visit stop to its destination dealer account. |
| `:NEXT_VISIT` | 351 | `Visit` -> `Visit` | Sequenced waypoint trajectory with road travel minutes (`travel_min`). |
| `:EXPERIENCED_EVENT` | 24 | `Dealer` -> `DropEvent` | Associates volume anomalies and drop events with specific dealer accounts. |
| `:DISPATCHED_TO` | 5 | `Nudge` -> `Dealer` | Tracks WhatsApp incentive messages dispatched to target dealers. |
| `:SUPPORTS_VISIT` | 5 | `Nudge` -> `Visit` | Connects an incentive nudge to the corresponding field visit waypoint. |
| `:SUBSIDIARY_OF` | 1 | `Dealer` -> `Dealer` | Models parent-child commercial billing hierarchies (`A-D138` to `A-D019`). |

---

## 4. Key Functional Capabilities

### 1. Interactive Graph Visualizer (`GraphView.tsx`)
- **WebGL / Canvas Acceleration:** Powered by Cytoscape.js for smooth navigation across hundreds of interconnected nodes.
- **Dynamic Controls:** Toggleable force-directed physics layout, zoom in/out, fit-to-viewport, and reset canvas.
- **Radial Beat Route Traversal:** Visualizes the central officer node with radial connections to scheduled daily visits, linked sequentially by `:NEXT_VISIT` dashed arrows with travel times.
- **1-Hop Neighborhood Expansion:** Clicking any node triggers dynamic 1-hop neighbor queries to expand the immediate sub-network.
- **Node Inspector Drawer (`NodeInspectorModal.tsx`):** Slide-out drawer displaying dealer commercial profile, GST outward supplies, uncaptured wallet headroom, MoM de-growth telemetry, scheduled visits, and parent-child outlet affiliations.

### 2. Beat Transit Analytics Bar Chart (`BarChartCard.tsx`)
- **Per-Stop Travel Time Visualization:** Visual bar chart for daily beat routes showing transit duration per stop, cumulative travel time (e.g., 87.6 minutes), and bottleneck warnings (*"Stop 1 accounts for 33% of total itinerary travel (28.7 mins transit from base)"*).
- **Interactive Click-to-Chat:** Clicking any bar or dealer stop immediately populates the chat prompt to ask Copilot for detailed dealer 360 insights.
- **Itinerary Filter Pills:** Switch views instantly between:
  - `Travel per stop`
  - `Arrival schedule`
  - `Recovery stops`
  - `Wallet expansion`
- **Pin to My Board:** Save key charts, route summaries, and analytics cards to a personal session board for quick review.

### 3. Graph-Based RAG & NLP Engine (`lib/rag/`)
- **Safe Natural Language to Cypher:** Translates field queries (*"Show SO-A beat schedule on Nov 2"*, *"Why was A-D004 visited on Nov 2?"*, *"Which dealers have highest headroom?"*) into optimized, read-only Cypher queries.
- **Multi-Modal Payload Structure:** Each response includes:
  - **Narrative Explanation:** Natural language synthesis with highlighted metrics.
  - **Interactive Tabular Records (`ResultTable.tsx`):** Paginated, sortable records with instant CSV export.
  - **Hierarchical ASCII Tree:** Formatted execution tree illustrating multi-hop graph hops and relationships.
  - **Focused Subgraph:** Interactive Cytoscape subgraph visualizing only the nodes and edges relevant to the query.
- **Dual-Mode Zero-Downtime Resilience (`lib/neo4j.ts`):** Automatically detects if a live Neo4j AuraDB instance is configured. If unconfigured or offline, seamlessly switches to an optimized in-memory snapshot (`pjp_graph_snapshot.json`) with sub-5ms response times.
- **Security Guardrails:** Read-only Cypher AST parser strictly prohibits destructive mutations (`DROP`, `DELETE`, `MERGE`, `SET`) and filters out-of-domain requests.

### 4. Comprehensive Modal Tool Suite
- **Pinned Board Modal (`PinnedBoardModal.tsx`):** View and organize pinned itinerary cards and analytical summaries.
- **Territory Maps Modal (`RouteMapsModal.tsx`):** High-resolution spatial route maps for Bengaluru urban and Upcountry zones.
- **Achieved Results Modal (`AchievedMetricsModal.tsx`):** Complete simulation telemetry across seeds (93.54% simulated adherence, 89.2% focus coverage, 92.59% club cadence).
- **Raw DB & Results Modal (`DatasetViewerModal.tsx`):** Full in-browser viewer for all 10 synchronized CSV datasets with schema inspection.

---

## 5. Architecture & File Layout

```
web/
├── app/
│   ├── api/
│   │   ├── chat/route.ts                # Master GraphRAG POST endpoint
│   │   ├── datasets/route.ts            # CSV dataset explorer API
│   │   └── graph/
│   │       ├── metadata/route.ts        # Node & edge count statistics
│   │       ├── neighbors/[id]/route.ts  # 1-hop dynamic neighborhood expansion
│   │       └── search/route.ts          # Instant fuzzy entity search
│   ├── globals.css                      # Tailwind styles & theme variables
│   ├── layout.tsx                       # Root layout & page metadata
│   ├── not-found.tsx                    # Custom 404 page
│   └── page.tsx                         # Main split-panel visual dashboard
├── components/
│   ├── AchievedMetricsModal.tsx         # Simulation benchmark scores modal (93.5%)
│   ├── BarChartCard.tsx                 # Interactive travel time per stop bar chart
│   ├── ChatInterface.tsx                # GraphRAG chat terminal with suggestions
│   ├── DatasetViewerModal.tsx           # In-browser CSV dataset explorer & schema viewer
│   ├── GraphView.tsx                    # Interactive Cytoscape.js visual canvas
│   ├── MarkdownRenderer.tsx             # GitHub-flavored Markdown & syntax styling
│   ├── NodeInspectorModal.tsx           # Slide-out 360-degree entity inspection drawer
│   ├── PinnedBoardModal.tsx             # Pinned session cards & itinerary board
│   ├── ResultTable.tsx                  # Tabular data viewer with CSV export
│   └── RouteMapsModal.tsx               # Territory spatial route maps viewer
├── data/
│   ├── csv/                             # 10 synchronized operational datasets
│   ├── results/                         # Simulation runs (seeds 1, 2, 3)
│   └── pjp_graph_snapshot.json          # Pre-computed graph snapshot (1,134 nodes)
├── lib/
│   ├── neo4j.ts                         # Resilient Neo4j HTTP & snapshot client
│   ├── openrouter.ts                    # OpenRouter Claude 3.5 Sonnet API client
│   └── rag/
│       ├── chart-generator.ts           # Bar chart data structures & stats
│       ├── chart-types.ts               # Chart TypeScript definitions
│       ├── cypher-generator.ts          # Safe LLM NL-to-Cypher synthesis
│       ├── entities.ts                  # Entity extractor (officers, dealers, dates)
│       ├── graphrag-engine.ts           # Master RAG orchestrator
│       ├── intent.ts                    # Fast intent detection & guardrails
│       ├── templates.ts                 # High-frequency Cypher templates
│       └── tree-formatter.ts            # Hierarchical ASCII tree formatter
├── public/
│   ├── data/                            # Static asset mirrors for file tracing
│   ├── images/
│   │   ├── tree_graph.png               # Cytoscape Knowledge Graph screenshot
│   │   └── Bar_graph.png                # Travel Time Bar Chart screenshot
│   └── maps/                            # Route map visuals (SO-A, SO-B, SO-C)
├── scripts/
│   ├── test_25_queries.ts               # 25-question comprehensive chat test
│   ├── test_api_endpoints.ts            # Serverless API routes test
│   ├── test_e2e_scenarios.ts            # Multi-persona E2E test suite
│   ├── test_graphrag.ts                 # Core GraphRAG engine tests
│   └── test_neo4j_client.ts             # Database driver & fallback test
├── next.config.mjs                      # Next.js 15 config with serverless tracing
├── package.json                         # Next.js 15, React 19, Cytoscape.js
└── vercel.json                          # Vercel framework configuration
```

---

## 6. Quickstart & Installation

### Prerequisites
- Node.js 18.18+ or 20+
- npm 10+

### Step 1: Install Dependencies
```bash
cd web
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# OpenRouter API Key for Claude 3.5 Sonnet / Gemini NL-to-Cypher generation
# (Optional - falls back to deterministic template synthesis if omitted)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Neo4j Database Connection (Optional - falls back to snapshot if unconfigured)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
```

### Step 3: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Automated Test Suites & Verification

The web application includes six automated test suites verifying driver resilience, NLP intent extraction, serverless API routes, and end-to-end user personas:

```bash
# 1. Neo4j Client & Snapshot Fallback Test (6/6 tests passed)
npx tsx scripts/test_neo4j_client.ts

# 2. GraphRAG Engine & Multi-Hop Query Test (7/7 tests passed)
npx tsx scripts/test_graphrag.ts

# 3. Serverless API Routes Test (6/6 tests passed)
npx tsx scripts/test_api_endpoints.ts

# 4. Multi-Persona E2E Scenario Suite (7/7 tests passed)
npx tsx scripts/test_e2e_scenarios.ts

# 5. Comprehensive 25-Question Chat Benchmark (25/25 passed, 100%)
npx tsx scripts/test_25_queries.ts

# 6. Production Next.js Build Check (Compiled in ~850ms, 0 errors)
npm run build
```

---

## 8. Vercel Cloud Deployment

The application is pre-configured for deployment to Vercel:

### Option 1: Vercel CLI
```bash
cd web
npx vercel
```
For production deployment:
```bash
npx vercel --prod
```

### Option 2: GitHub Repository Integration
1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import the repository.
3. Set **Root Directory** to `web` (or leave as `./`, both are supported).
4. Under **Environment Variables**, optionally provide:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `OPENROUTER_MODEL`: `anthropic/claude-3.5-sonnet` or `google/gemini-2.0-flash-001`.
   - `NEO4J_URI`: *(Optional)* Your Neo4j AuraDB URI (`neo4j+s://...`).
   - `NEO4J_USER`: *(Optional)* `neo4j`.
   - `NEO4J_PASSWORD`: *(Optional)* AuraDB password.
5. Click **Deploy**.

> **Zero Configuration Guarantee:** If Neo4j environment variables are omitted on Vercel, the application automatically runs in high-performance snapshot mode with zero runtime errors.
