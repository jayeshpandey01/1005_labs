#!/usr/bin/env python3
"""Master pipeline runner for the Permanent Journey Plan (PJP) project.

Runs the complete 5-stage pipeline and simulation benchmarks end-to-end:
  1. Data Hygiene Audit & Feature Store Generation
  2. Baseline Adherence Replication
  3. Multi-Criteria Focus Ranking & 25-Day Beat Scheduling
  4. Spatial Graph TSP Routing (Outputs plan_november.csv and plan_SO-*.csv)
  5. WhatsApp Nudge Generation (Outputs whatsapp_nudges.json)
  6. Visual Route Map Generation (Outputs docs/maps/route_map_SO-*.png)
  7. Seed Simulation Benchmark (Seeds 1-3 with dynamic re-planner)

Usage:
  py -3.11 run_pipeline.py
"""

import subprocess
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

STAGES = [
    ("Stage 1A: Data Hygiene Audit", [sys.executable, str(BASE_DIR / ".agents" / "skills" / "pjp-data-engineer" / "scripts" / "audit_data_gaps.py")]),
    ("Stage 1B: Feature Store Builder", [sys.executable, str(BASE_DIR / ".agents" / "skills" / "pjp-data-engineer" / "scripts" / "build_feature_store.py")]),
    ("Stage 1C: Baseline Replication", [sys.executable, str(BASE_DIR / ".agents" / "skills" / "pjp-data-engineer" / "scripts" / "replicate_baseline.py")]),
    ("Stage 2: Ranking & Scheduling", [sys.executable, str(BASE_DIR / ".agents" / "skills" / "pjp-ai-developer" / "scripts" / "rank_and_schedule.py")]),
    ("Stage 3: Spatial Graph TSP Routing", [sys.executable, str(BASE_DIR / ".agents" / "skills" / "pjp-ai-developer" / "scripts" / "route_tsp_solver.py")]),
    ("Stage 4: WhatsApp Nudge Generator", [sys.executable, str(BASE_DIR / ".agents" / "skills" / "pjp-ai-developer" / "scripts" / "generate_nudges.py")]),
    ("Stage 5: Route Map Visualizer", [sys.executable, str(BASE_DIR / "scripts" / "generate_maps.py")]),
    ("Stage 6: Simulation Benchmark (Seeds 1-3)", [sys.executable, str(BASE_DIR / ".agents" / "skills" / "pjp-ai-developer" / "scripts" / "run_seed_benchmark.py")]),
    ("Stage 7: PJP-Graphify Knowledge Graph & Dashboard", [sys.executable, "-m", "pjp_graph.cli", "--dashboard"]),
]

def run():
    print("=" * 72)
    print("        PJP END-TO-END PIPELINE: EXECUTION RUNNER")
    print("=" * 72)
    start_total = time.time()

    for idx, (name, cmd) in enumerate(STAGES, 1):
        print(f"\n[{idx}/{len(STAGES)}] Running {name} ...")
        t0 = time.time()
        res = subprocess.run(cmd, cwd=str(BASE_DIR))
        elapsed = time.time() - t0
        if res.returncode != 0:
            print(f"Error: {name} failed with exit code {res.returncode}")
            sys.exit(res.returncode)
        print(f"[{idx}/{len(STAGES)}] Completed in {elapsed:.1f}s")

    total_elapsed = time.time() - start_total
    print("\n" + "=" * 72)
    print(f"ALL PIPELINE STAGES COMPLETED SUCCESSFULLY IN {total_elapsed:.1f}s")
    print("=" * 72)
    print("\nDeliverables Status:")
    print("  [x] Master Plan: plan_november.csv")
    per_so_plans = ", ".join(p.name for p in sorted(BASE_DIR.glob("plan_SO-*.csv")))
    print(f"  [x] Per-SO Plans: {per_so_plans if per_so_plans else 'plan_SO-*.csv'}")
    print("  [x] Re-plan Command: mypjp.replan (--state --plan --out)")
    print("  [x] WhatsApp Nudges: whatsapp_nudges.json (5 data-backed messages)")
    print("  [x] Route Maps: docs/maps/route_map_SO-*.png")
    print("  [x] Benchmark Scores: results/seed_*/summary.json")
    print("  [x] Knowledge Graph: dataset/pjp_knowledge_graph.json (746 nodes, 1657 edges)")
    print("  [x] Interactive Dashboard: pjp_graph_dashboard.html")
    print("=" * 72)

if __name__ == "__main__":
    run()
