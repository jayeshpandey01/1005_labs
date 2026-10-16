# Automated Journey Plan (PJP) Proof of Concept

This repository builds an automated end-to-end Permanent Journey Plan (PJP) pipeline for November 2026 across three Sales Officers (SO-A, SO-B, SO-C) in laminate distribution, solving focus account ranking, 25-day beat scheduling, 2-opt TSP spatial graph routing, WhatsApp nudge generation, and online dynamic re-planning.

## One-Command Quickstart

To run the complete pipeline and simulation benchmark from scratch:

```powershell
py -3.11 run_pipeline.py
```

Alternatively on Windows, double-click `run.bat`.

## Single Simulation Execution

To simulate November 2026 day-by-day across practice seeds (1, 2, or 3):

```powershell
py -3.11 simulate.py --workbook PJP_Assignment_Sample_Data.xlsx --plan plan_november.csv --replan-cmd "py -3.11 -m mypjp.replan" --seed 1 --out results/seed_1
```

## Deliverables Index
* **Master November Plan:** `plan_november.csv`
* **Individual SO Plans:** `plan_SO-A.csv`, `plan_SO-B.csv`, `plan_SO-C.csv`
* **Dynamic Re-planner:** `mypjp/replan.py` (`py -3.11 -m mypjp.replan`)
* **WhatsApp Nudges:** `whatsapp_nudges.json`
* **Route Map Visuals:** `docs/maps/route_map_SO-*.png`
* **2-Page Findings Write-Up:** `docs/approach_and_findings_writeup.md`
* **Academic Research Papers:**
  * Milestone M1 (Data Quality & Baseline Replication): `docs/research_paper_m1.md`
  * Milestone M2 (Ranking & Focus Selection): `docs/research_paper_m2.md`
  * Milestone M3 (Scheduling & Spatial Clustering): `docs/research_paper_m3.md`
  * Milestone M4 (Routing & TSP Sequencing): `docs/research_paper_m4.md`
  * Milestone M5 (WhatsApp Nudges): `docs/research_paper_m5.md`
  * Milestone M6 (Dynamic Online Re-planner): `docs/research_paper_m6.md`
  * Milestone M7 (Simulation & Tuning): `docs/research_paper_m7.md`
* **Antigravity Skills:** `.agents/skills/pjp-data-engineer/` and `.agents/skills/pjp-ai-developer/`

---

# PJP November Simulator Specifications

Your plan is scored by playing November 2026 out day by day. This folder lets you run the same simulation yourself.

Practice seeds are **1, 2 and 3**. We score on other, unpublished seeds with the same rules and event rates, so tune your logic, not your plan to a seed. Omit `--replan-cmd` to see how your static plan holds up.

## What happens each working day

1. **Execution.** Each SO starts at their day-start point and visits that day's dealers in your `sequence` order.
   Travel time is straight-line distance × 1.35 at 18 km/h (Bengaluru) or 30 km/h (upcountry); a dealer with no
   location costs 25 / 45 minutes of travel. Each call takes 25 minutes. The working day is 09:30–18:30 and
   80 minutes are always held back for the 2 demand-generation calls. A visit that does not fit is **missed (out of time)**.
2. **Weather.** On a rain or traffic day the SO completes at most **5** dealer visits (not 6) and travel is slower
   (×1.5 rain, ×1.3 traffic). Visits beyond the fifth are **missed (weather)**: put the important ones first.
   You get a forecast for the next working day each evening; it is right about 80% of the time.
3. **Dealers.** About 3% of visits fail because the dealer is unavailable.
4. **Sales.** Every dealer's daily sales are simulated from its own history. Some dealers suffer a hidden **sales drop**
   (to about a quarter of normal); a visit recovers them, and it counts as a response if it happens within 7 days of
   the drop starting. Others have a temporary **sales hike**; a planned visit to them can be cancelled. A completed
   visit also lifts a dealer's sales slightly for two weeks.
5. **Re-plan.** In the evening the simulator calls your command and replaces the rest of the month with what it returns.

## Re-plan contract

```
<replan-cmd> --state STATE.json --plan CURRENT_PLAN.csv --out NEXT_PLAN.csv
```

* `CURRENT_PLAN.csv`: the plan for every SO from tomorrow to 30 Nov, as currently held.
* `NEXT_PLAN.csv` (you write it): the full plan from the next working day to 30 Nov. Columns
  `date, so_id, sequence, account_id, account_type`; extra columns are ignored. Rows on or before today are ignored.
* Must finish within 120 seconds. On error, timeout or no file, the current plan is kept and a failure is counted.
* The command is called once per working day. Keep any memory you need (for example sales seen so far) in your own files.

`STATE.json` fields:

| field | meaning |
|---|---|
| `today`, `next_working_day` | ISO dates |
| `weather_today` | per SO: `clear`, `rain` or `traffic` |
| `weather_forecast_next_working_day` | per SO, ~80% accurate |
| `visits_today` | every planned visit today: `so_id, sequence, account_id, status, travel_min, weather` (status `completed`, `missed_weather`, `missed_out_of_time`, `missed_dealer_unavailable`, `missed_over_daily_limit`) |
| `sales_today` | per dealer with sales today: `dealer_id, sheets, points` |
| `completed_visits_month_to_date` | `date, account_id` for every completed visit so far |
| `rules` | daily visit limits, max visits per dealer, minimum club gap |

## What is scored

| metric | definition |
|---|---|
| **Simulated adherence** | visits completed ÷ visits in the plan on the morning of each day |
| Initial-plan adherence | visits completed that were in your original plan ÷ original plan visits |
| **Focus coverage** | dealers in your original plan that received their required visits (club 2, others 1) |
| Club cadence | club dealers visited twice, at least 10 days apart |
| **Drop response** | sales-drop events visited within 7 days of onset |
| Hike handling | visits cancelled vs made while a dealer's sales were spiking |
| Guardrails | more than 6 dealer visits planned in a day, more than 2 completed visits to a dealer, visits to another SO's dealer |
| Reliability | re-plan failures |
| Context | travel minutes and completed visits per SO-day, simulated points |

`summary.json` holds the scores; `visits.csv`, `daily.csv` and `cancellations.csv` show what happened;
`events_revealed.csv` lists the hidden drops and hikes after the run so you can debug.

`example_replan_passthrough.py` is the smallest valid re-plan command (it changes nothing). Use it to check your
plan file before writing real logic.
