---
name: pjp-data-engineer
description: >-
  Specialized data engineering runbook for the PJP Simulator project. Use this skill
  when ingesting multi-table datasets, auditing data quality (missing GPS, GST proxies,
  parent-child outlets), calculating de-growth and headroom features, replicating SFDC
  baselines, or validating simulation telemetry outputs.
---

# PJP Data Engineer Skill

This skill guides the ingestion, cleaning, transformation, and auditing of all data tables for the PJP (Permanent Journey Plan) November 2026 simulation.

## Environment & Python Execution
Always use the verified Python 3.11 environment launcher:
```powershell
py -3.11 <script_name>.py
```
Pre-installed packages: `pandas 2.3.3`, `openpyxl 3.1.5`, `networkx 3.6.1`, `numpy 2.2.6`, `matplotlib 3.10.8`.

---

## 1. Core Data Invariants & Master Entities

Refer to [Hygiene Invariants](./references/hygiene_invariants.md) and [Data Dictionary](./references/data_dictionary.md) for full field specs.

* **Parent/Child Entity Rollup:**
  * Child outlet `A-D138` rolls up to parent `A-D019` (both under SO-A, loyalty club members).
  * Secondary sales and scheme targets must be consolidated to the parent entity for ranking and bonus slab evaluation. Physical visits remain outlet-specific.
* **Missing Coordinates (282 outlets):**
  * Flat travel penalties charged by `simulate.py`: 25 min (Metro) / 45 min (Upcountry).
  * Never schedule more than 1 unlocated dealer per day.
* **GST Turnover Proxies & Headroom:**
  * Regular dealers ($\le$ ₹5 Cr band): ₹2.5 Cr (₹25,000,000) annual turnover midpoint.
  * Composition scheme dealers ($\le$ ₹1.5 Cr band): ₹75 Lakhs (₹7,500,000).
  * Headroom formula: $\text{Headroom} = \max(0, \text{Turnover Proxy} - \text{Annual Purchases})$.
  * Invalid GSTINs (9 accounts): impute tier median headroom.
* **Active Dealer Floor:**
  * Only dealers with historical sales rate $\ge 0.5\text{ sheets/day}$ over the July 16 – October 15 window (113 dealers) can trigger drops ($p=0.10$) or hikes ($p=0.08$).

---

## 2. Standard Procedures & Scripts

### Step 1: Audit Data Hygiene & Gaps
Run the audit script to check missing GPS counts, invalid GSTINs, and verify parent-child relations:
```powershell
py -3.11 .agents/skills/pjp-data-engineer/scripts/audit_data_gaps.py
```
* **Expected Output:**
  * 395 located dealers, 282 missing coordinates.
  * Exactly 1 parent-child hierarchy (`A-D138` $\to$ `A-D019`).
  * 9 invalid GSTIN records identified.

### Step 2: Build Feature Store
Run the feature extraction pipeline to produce `dataset/dealer_features.csv`:
```powershell
py -3.11 .agents/skills/pjp-data-engineer/scripts/build_feature_store.py
```
* **Calculates:**
  * Historical sales rate (sheets/workday) over July 16 – October 15.
  * Active dealer mask (`rate >= 0.5`).
  * Value-lost de-growth (MoM, QoQ, YoY).
  * Annual purchases and GST turnover headroom.
  * Club membership status and tier point multipliers (`pps`).

### Step 3: Replicate SFDC Baseline Metrics
Verify historical adherence against `dataset/Baseline_metrics.csv`:
```powershell
py -3.11 .agents/skills/pjp-data-engineer/scripts/replicate_baseline.py
```
* **Expected Match:**
  * September 2026 Adherence: SO-A $\approx 55.2\%$, SO-B $\approx 35.3\%$, SO-C $= 0.0\%$.
  * Confirms accurate SFDC activity log filtering.

---

## 3. Telemetry Validation (Post-Simulation)
When `simulate.py` runs, audit output files:
* `replan_failures.csv`: Must be **0 bytes** (zero replan crashes or timeouts).
* `cancellations.csv`: Must log visits proactively cancelled during 10-day spike windows.
* `summary.json`: Inspect adherence, coverage, and drop response rates.
