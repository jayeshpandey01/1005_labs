# Data Dictionary & Schema Specification

This document details the schema, key identifiers, and interpretation of each table in the PJP Simulator dataset.

---

## 1. `officers.csv`
* `so_id` (string, PK): Unique Sales Officer code (`SO-A`, `SO-B`, `SO-C`).
* `territory` (string): Geographic descriptor (e.g. `Bengaluru urban (west)`).
* `geography` (string): Territory classification (`Dense metro` or `Upcountry, multi-town`).
* `daily_call_norm` (string): Daily call requirement: 6 focus dealers + 2 demand-gen calls (80 min reserved).
* `approx_day_start_lat`, `approx_day_start_lon` (float): Fixed daily departure base coordinate.
* `dealers_in_universe` (int): Total dealer universe count for the SO.
* `median_completed_calls_per_day` (int): Historical daily completed calls benchmark.

---

## 2. `dealers.csv`
* `dealer_id` (string, PK): Unique outlet code (e.g. `A-D001`, `B-D042`, `C-D115`).
* `so_id` (string, FK): Assigned Sales Officer.
* `parent_dealer_id` (string, nullable): Parent business entity for billing/targets.
* `outlet_type` (string): e.g. `Sub dealer`, `Direct dealer`, etc.
* `loyalty_club_member` (string): `'Yes'` or `'No'`.
* `club_tier` (string): Tier classification if club member.
* `lat`, `lon` (float, nullable): Latitude and longitude. 395 populated, 282 NULL.
* `in_customer_master` (string): `'Yes'` or `'No'`.
* `billed_since_apr_2026` (string): `'Yes'` or `'No'`.

---

## 3. `sales_daily.csv`
* `date` (date string, YYYY-MM-DD): Transaction date (2025-04-01 to 2026-10-15).
* `dealer_id` (string, FK): Purchasing outlet.
* `billed_by` (string): Sales Officer on invoice.
* `product_tier` (string): Category (e.g. `Tier-8 (super premium)`, `Tier-2 (core)`).
* `points_per_sheet` (int): Scheme point multiplier (0, 1, 2, 4, 8).
* `txn_type` (string): `'Sale'` or `'Return'`.
* `sheets` (int): Quantity sold. Returns are represented as negative sheets.
* `value_inr` (float): Invoice rupee value.

---

## 4. `GST_filings.csv`
* `dealer_id` (string, PK): Outlet identifier.
* `registration_type` (string): e.g. `Regular`, `Composition`.
* `turnover_band_proxy` (string): Public turnover proxy bracket (e.g. `Up to Rs 5 Cr`).
* `filing_frequency_latest` (string): `Monthly`, `Quarterly`.
* `compliance_category` (string): Compliance rating.
* `lookup_status` (string): Status note. 9 records have `GSTIN on record is invalid (checksum)`.

---

## 5. `SFDC_Activities.csv`
* `activity_id` (string, PK): Salesforce visit log ID (`V00001` ...).
* `so_id` (string): Sales Officer.
* `date` (date string): Visit date.
* `check_in`, `check_out` (string): Timestamp of check-in and check-out.
* `duration_min` (int): Call duration in minutes.
* `planned_or_adhoc` (string): `'Planned (PJP)'` or `'Ad hoc'`.
* `status` (string): `'Completed'`, etc.
* `account_id` (string): Target account. Demand-generation accounts end in `-G...`.
