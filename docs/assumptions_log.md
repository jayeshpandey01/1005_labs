# Assumptions Log & Invariant Catalog: PJP Simulator POC

This document records the foundational assumptions, data interpretations, and invariant constants agreed upon in **Milestone M0 (Alignment & Setup)**. All downstream stages (Ranking, Scheduling, Routing, Nudges, Re-planning) inherit these rules.

---

## 1. Calendar & Working Hours Invariants

| Parameter | Value | Source / Ground Truth | Impact on Model |
|---|---|---|---|
| **Planning Horizon** | 1–30 November 2026 | `Planning_Calendar` sheet | Exactly 30 calendar days. |
| **Working Days** | 25 days (Mon–Sat) | `Planning_Calendar` sheet | Sundays (Nov 1, 8, 15, 22, 29) are strictly non-working. |
| **Total Daily Window** | 09:30 to 18:30 (540 min) | Assignment Brief §3 & `simulate.py` line 41 | Strict boundary for all field visits and travel. |
| **Demand-Gen Reservation** | 80 minutes / day | `simulate.py` line 42 | 2 calls $\times$ 40 min (25 min call + ~15 min travel) reserved every single day. No demand-gen data is provided; time is held back automatically. |
| **Net Focus Budget** | **460 minutes / day** | $540 - 80 = 460\text{ min}$ | Total time budget for focus dealer calls and transit. |

---

## 2. Visit Durations & Capacity Constraints

| Parameter | Value | Source / Ground Truth | Impact on Model |
|---|---|---|---|
| **Dealer Call Duration** | 25 minutes | `simulate.py` line 43 | Fixed duration per completed focus dealer visit. |
| **Unavailable Call Duration** | 10 minutes | `simulate.py` line 43 | Time spent if a dealer is unavailable ($p = 0.03$). |
| **Normal Day Visit Cap** | 6 dealer visits / day | Assignment Brief §3 | $6 \times 25\text{ min} = 150\text{ min}$ call time, leaving 310 min for travel. |
| **Monthly Capacity per SO** | 150 visit slots | $25\text{ days} \times 6\text{ visits/day}$ | Hard capacity ceiling per Sales Officer. |
| **Club Dealer Frequency** | Exactly 2 visits / month | Assignment Brief §3 & `simulate.py` | Consumes $2 \times N_{\text{club}}$ slots. |
| **Club Visit Separation** | $\ge 10$ working days | `simulate.py` line 54 | Target separation: $\approx 14$ calendar days (2 weeks). |
| **Non-Club Focus Frequency** | Exactly 1 visit / month | Assignment Brief §3 & `simulate.py` | Consumes 1 slot. |
| **Maximum Visit Guardrail** | $\le 2$ visits / dealer / month | `simulate.py` line 54 | Any 3rd visit triggers a guardrail violation! |

---

## 3. Road Physics, Travel Speed & Weather

| Parameter | Metro (SO-A, SO-B) | Upcountry (SO-C) | Source / Ground Truth |
|---|---|---|---|
| **Territory Geography** | Dense Metro (Bengaluru Urban) | Upcountry, multi-town (Hubballi-Dharwad-Belagavi) | `Officers` sheet |
| **Home Base (Start/End)** | SO-A: `(12.93957, 77.49507)`<br/>SO-B: `(12.95276, 77.54104)` | SO-C: `(15.4648, 74.99564)` | `Officers` sheet |
| **Transit Speed** | 18 km/h | 30 km/h | `simulate.py` line 45 |
| **Road Detour Factor** | 1.35 | 1.35 | Straight-line Haversine $\times 1.35$ |
| **Missing GPS Penalty** | **25 minutes** flat | **45 minutes** flat | `simulate.py` line 46 |
| **Rain Travel Penalty** | $\times 1.5$ travel time | $\times 1.5$ travel time | `simulate.py` line 47 |
| **Traffic Travel Penalty** | $\times 1.3$ travel time | $\times 1.3$ travel time | `simulate.py` line 47 |
| **Disrupted Day Cap** | Max 5 completed visits | Max 5 completed visits | On rain/traffic days, 6th visit is `missed_weather`. |
| **Weather Forecast** | 80% accurate | 80% accurate | Provided evening prior in `STATE.json`. |

---

## 4. Master Data Hygiene & Hierarchy Assumptions

### 4.1. Parent/Child Hierarchy (`G_entity`)
* **Ground Truth:** In the `Dealers` sheet (677 outlets), exactly **one** dealer has a populated `parent_dealer_id`:
  * Child: `A-D138` $\to$ Parent: `A-D019` (both under SO-A, both loyalty club members).
* **Scheme Targets Alignment:** In `Scheme_Targets`, club target thresholds are keyed by `parent_dealer_id`. `A-D019` exists in `Scheme_Targets`, while `A-D138` does not.
* **Operational Rule:**
  1. Secondary sales volume and loyalty points of child outlet `A-D138` are aggregated to parent entity `A-D019` for scheme milestone evaluation and ranking.
  2. Physical visits remain outlet-specific (SO visits physical locations), but ownership rollup ensures we do not over-allocate quota to a single business group.

### 4.2. Missing Geographic Coordinates
* **Ground Truth:** Out of 677 outlets, **395 have GPS coordinates** and **282 have NULL coordinates** (SO-A: 86 missing, SO-B: 15 missing, SO-C: 181 missing).
* **Operational Rule:**
  1. The simulator charges a flat 25-minute penalty (metro) or 45-minute penalty (upcountry) for unlocated dealers.
  2. To avoid day timeouts (`missed_out_of_time`), the scheduler must **distribute unlocated dealers evenly** (maximum 1 per day), grouping them with located dealers in the same town.

### 4.3. GST Filings & Headroom Interpretation
* **Ground Truth:** In `GST_Filings`, `aggregate_turnover_slab` is paywalled in the raw API, but `turnover_band_proxy` is populated for 577 dealers (512 dealers $\le$ ₹5 Cr regular, 47 quarterly, 18 composition $\le$ ₹1.5 Cr). 9 dealers have invalid GSTINs.
* **Operational Rule:**
  1. For dealers with `"Up to Rs 5 Cr"`, we adopt a conservative midpoint proxy of **₹2.5 Crores (₹25,000,000)** annual turnover.
  2. For composition scheme dealers (`"Up to Rs 1.5 Cr"`), we adopt **₹75 Lakhs (₹7,500,000)**.
  3. Headroom is defined as:
     $$\text{Headroom} = \max\left(0, \text{Turnover Proxy} - \text{Annual Purchases from Us}\right)$$
  4. For unlisted / invalid GSTINs, headroom defaults to the median headroom of that dealer's tier.

---

## 5. Sales Simulation, Drops & Hikes Invariants

* **Active Dealer Floor:** Only dealers with historical sales rate $\ge 0.5\text{ sheets/day}$ in the July 16 – October 15 window (exactly **113 dealers**) can experience drops ($p=0.10$) or hikes ($p=0.08$).
* **Drop Dynamics:** Sales collapse to $25\%$ of normal ($f = 0.25$). A visit triggers recovery, which takes 3 days to ramp back to 100%. A visit within **7 days of onset** counts as a successful drop response.
* **Hike Dynamics:** Sales surge to $220\%$ ($f = 2.2$) for 10 days. Planned visits can be cancelled during this window without penalizing coverage.
* **Visit Uplift:** Every completed visit boosts dealer sales by $+8\%$ ($f = 1.08$) for 14 days.

---

## 6. M0 Acceptance Sign-Off

- [x] Environment verified: Python 3.11 launcher (`py`), `openpyxl` 3.1.5, `networkx` 3.6.1, `matplotlib` 3.10.8.
- [x] Workbook loads cleanly without data loss.
- [x] Baseline simulation verified: `simulate.py` executes successfully on synthetic test plan with passthrough script (`example_replan_passthrough.py`) in $< 15$ seconds.
- [x] Assumptions logged and cross-referenced with assignment brief and simulation code.

---

## 7. Simulation Telemetry & Zero-Byte CSV Semantics

In `simulate.py` (lines 298–302), output CSVs are generated with the following logic:
```python
for name, rows in (('visits.csv', visits), ('daily.csv', daily), ('cancellations.csv', cancelled), ('replan_failures.csv', failures)):
    with open(out / name, 'w', newline='') as f:
        if rows:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
```
When `rows` is empty (`[]`), `simulate.py` creates a **0-byte file** without writing headers or data.

### Exact Meaning of 0-Byte CSVs:
1. **`replan_failures.csv` (0 Bytes):**
   * **Status:** **CLEAN / SUCCESS STATE**.
   * **Meaning:** The re-planner executed on every single working day without crashes, timeouts ($<120$s), or non-zero exit codes (`replan_failures == 0`).
   * **Target:** Must remain 0 bytes across all simulation runs to achieve 100% on the Reliability & Guardrails metric.
2. **`cancellations.csv` (0 Bytes):**
   * **Status:** **EXPECTED FOR M0 (PASSTHROUGH)**.
   * **Meaning:** `example_replan_passthrough.py` leaves the plan unchanged (`before - after == set()`), so 0 visits were cancelled.
   * **M6 Target:** In Milestone M6, our dynamic re-planner will detect sales hikes ($\ge 2.2\times$ surge) and proactively cancel scheduled visits during the spike window. Once implemented, this file will record `decided_on, date, account_id`, earning points in the **Hike Handling (5%)** evaluation metric.
