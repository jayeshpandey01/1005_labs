# Data Hygiene & Invariant Reference

This document formalizes the mathematical and business rules that govern master data cleaning, imputation, and rollups.

---

## 1. Parent/Child Hierarchy Rollup (`G_entity`)

In `dealers.csv`, exactly one child outlet exists:
* **Child Outlet:** `A-D138` $\to$ **Parent Outlet:** `A-D019` (both under `SO-A`).
* **Rule:**
  1. Secondary sales volume and loyalty scheme points earned by `A-D138` roll up into `A-D019` for scheme milestone evaluation, ranking, and de-growth analysis.
  2. Physical visits remain outlet-specific (SOs visit physical storefronts), but both outlets cannot exceed total quota allocations.

---

## 2. Missing GPS Coordinates Imputation & Constraints

* **Outlets Missing Coordinates:** 282 out of 677 outlets have `lat = NULL` and `lon = NULL`.
  * `SO-A`: 86 missing
  * `SO-B`: 15 missing
  * `SO-C`: 181 missing
* **Simulator Penalties:**
  * Dense Metro (`SO-A`, `SO-B`): **25 minutes** flat travel penalty.
  * Upcountry (`SO-C`): **45 minutes** flat travel penalty.
* **Operational Constraint:**
  * To prevent daily timeouts (`missed_out_of_time`), the scheduler must **cap unlocated dealers to at most 1 per day per SO**.

---

## 3. GST Turnover Headroom Calculation

* **Turnover Band Proxies:**
  * `"Up to Rs 5 Cr"` $\implies$ Proxy value = **₹2,50,00,000 (₹2.5 Crores)**.
  * `"Up to Rs 1.5 Cr"` (Composition) $\implies$ Proxy value = **₹75,00,000 (₹75 Lakhs)**.
  * High-turnover brackets: Use the lower-bound midpoint of the bracket.
* **Headroom Formula:**
  $$\text{Headroom} = \max\left(0, \text{Turnover Proxy} - \text{Annual Purchases from Us}\right)$$
* **Invalid GSTINs:** 9 dealers have invalid checksums or blank filings. Their headroom is assigned the median headroom of their dealer tier.

---

## 4. Active Dealer Floor for Event Simulation

* **Threshold:** Only dealers with historical sales rate $\ge 0.5\text{ sheets/workday}$ over the July 16 – October 15 window (exactly **113 dealers**) can experience drops ($p=0.10$) or hikes ($p=0.08$).
* **Data Engineering Requirement:** The feature store must flag `is_active_for_events = (rate >= 0.5)` to focus anomaly detection solely on this subset.
