# Dynamic Re-planner Protocol & Online State Reference

This document formalizes the execution contract, input schemas, and algorithmic state requirements for the dynamic re-planner CLI.

---

## 1. CLI Execution Contract

After each simulated working day, `simulate.py` invokes:
```bash
<replan-cmd> --state STATE.json --plan CURRENT_PLAN.csv --out NEXT_PLAN.csv
```
* **Execution Limit:** Must finish in **$< 120$ seconds** (target $< 10$ seconds).
* **Inputs:**
  * `--state STATE.json`: Current world state, weather forecast, today's sales, and month-to-date completions.
  * `--plan CURRENT_PLAN.csv`: Existing scheduled visits from tomorrow to 30 November.
* **Output:**
  * `--out NEXT_PLAN.csv`: Updated schedule from next working day to 30 November.
  * Must contain columns: `date, so_id, sequence, account_id, account_type`.

---

## 2. `STATE.json` Schema

| Key | Type | Description |
|---|---|---|
| `today` | string (ISO date) | Current simulated date (e.g. `"2026-11-02"`). |
| `next_working_day` | string (ISO date) | Next working day date (e.g. `"2026-11-03"`). |
| `weather_today` | dict | Per SO: `"clear"`, `"rain"`, or `"traffic"`. |
| `weather_forecast_next_working_day` | dict | Per SO, ~80% accurate prediction. |
| `visits_today` | list of dicts | Visited accounts today with status (`completed`, `missed_weather`, `missed_out_of_time`, `missed_dealer_unavailable`). |
| `sales_today` | list of dicts | Outlets with sales today: `dealer_id`, `sheets`, `points`. |
| `completed_visits_month_to_date` | list of dicts | Every completed visit so far (`date`, `account_id`). |
| `rules` | dict | `dealer_visits_per_day` (6), `disrupted_visits_per_day` (5), `max_visits_per_dealer_month` (2), `club_min_gap_days` (10). |

---

## 3. Algorithmic Response Logic

1. **Drop Detection & Recovery:**
   * Track cumulative daily sales per dealer against historical baseline rate $\mu$.
   * When cumulative sales over recent active window fall below threshold ($f \le 0.35$), flag as **Active Drop**.
   * Schedule a recovery visit within **7 days of onset**. Verify graph insertion delta $\Delta t$ does not breach daily budget.
2. **Sales Spike & Hike Cancellation:**
   * When daily sales surge $\ge 2.0\times$ normal rate, flag as **Sales Spike** (10-day window).
   * Proactively cancel planned visits during this window to score Hike Handling points.
3. **Weather Adaptation:**
   * If forecast for tomorrow is `rain` or `traffic`, reduce planned visits to **5** (defer 6th visit).
   * Ensure club visits are never dropped.
