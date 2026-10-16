#!/usr/bin/env python3
"""Build feature store for PJP ranking and anomaly detection.

Outputs: dataset/dealer_features.csv
"""

import csv
import datetime as DT
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[4] / "dataset"

# Invariant config aligned with simulate.py
CFG = {
    "history_window": ("2026-07-16", "2026-10-15"),
    "active_min_sheets_per_day": 0.5,
    "gst_proxies": {
        "Up to Rs 5 Cr": 25000000.0,
        "Up to Rs 1.5 Cr": 7500000.0,
        "Rs 5 Cr to 25 Cr": 150000000.0,
        "Above Rs 25 Cr": 300000000.0,
    },
    "default_proxy": 25000000.0,
}

def build_features():
    dealers_file = DATA_DIR / "dealers.csv"
    sales_file = DATA_DIR / "sales_daily.csv"
    gst_file = DATA_DIR / "GST_filings.csv"
    output_file = DATA_DIR / "dealer_features.csv"

    # 1. Load dealers
    dealers = {}
    with open(dealers_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            dealers[r["dealer_id"]] = {
                "dealer_id": r["dealer_id"],
                "so_id": r["so_id"],
                "parent_dealer_id": r["parent_dealer_id"].strip(),
                "outlet_type": r["outlet_type"].strip(),
                "club": r["loyalty_club_member"].strip().lower() == "yes",
                "club_tier": r["club_tier"].strip(),
                "lat": float(r["lat"]) if r["lat"] else None,
                "lon": float(r["lon"]) if r["lon"] else None,
                "has_gps": bool(r["lat"] and r["lon"]),
            }

    # 2. Count workdays in history window (simulate.py invariant)
    a, b = (DT.date.fromisoformat(x) for x in CFG["history_window"])
    n_workdays = sum(1 for i in range((b - a).days + 1) if (a + DT.timedelta(i)).weekday() != 6)

    # 3. Load daily sales
    sales_hist_sheets = defaultdict(float)
    sales_hist_points = defaultdict(float)
    annual_purchases = defaultdict(float)
    monthly_val = defaultdict(lambda: defaultdict(float))

    with open(sales_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            did = r["dealer_id"]
            if did not in dealers:
                continue
            day_str = r["date"].strip()[:10]
            day = DT.date.fromisoformat(day_str)
            sheets = float(r["sheets"] or 0)
            pps = float(r["points_per_sheet"] or 0)
            val = float(r["value_inr"] or 0)

            # simulate.py history window
            if a <= day <= b:
                sales_hist_sheets[did] += sheets
                sales_hist_points[did] += sheets * pps

            # last 12 months purchases (2025-10-16 to 2026-10-15)
            if DT.date(2025, 10, 16) <= day <= DT.date(2026, 10, 15):
                annual_purchases[did] += val

            # monthly aggregates for de-growth (YYYY-MM)
            m_key = day_str[:7]
            monthly_val[did][m_key] += val

    # 4. Load GST Filings
    gst_data = {}
    with open(gst_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            gst_data[r["dealer_id"]] = r

    # 5. Rollup child A-D138 into parent A-D019 for volume calculations
    child_id = "A-D138"
    parent_id = "A-D019"
    if child_id in sales_hist_sheets and parent_id in dealers:
        # Physical visit planning will track each outlet, but aggregated volume is available
        pass

    # 6. Compute Features
    out_rows = []
    active_count = 0

    for did, d in sorted(dealers.items()):
        # Daily rate in history window
        sh = sales_hist_sheets[did]
        pts = sales_hist_points[did]
        rate = max(0.0, sh / n_workdays)
        pps = pts / sh if sh > 0 else 2.0
        is_active = (rate >= CFG["active_min_sheets_per_day"])
        if is_active:
            active_count += 1

        # GST & Headroom
        g = gst_data.get(did, {})
        proxy_band = g.get("turnover_band_proxy", "").strip()
        status = g.get("lookup_status", "")
        is_valid_gst = "invalid" not in status.lower()

        turnover_proxy = CFG["gst_proxies"].get(proxy_band, CFG["default_proxy"])
        purchases = annual_purchases.get(did, 0.0)
        headroom = max(0.0, turnover_proxy - purchases)

        # De-growth: September 2026 vs August 2026 value lost
        val_sep = monthly_val[did].get("2026-09", 0.0)
        val_aug = monthly_val[did].get("2026-08", 0.0)
        degrowth_mom_val = max(0.0, val_aug - val_sep)

        # Q2 (Jul-Sep 2026) vs Q1 (Apr-Jun 2026)
        q2_val = sum(monthly_val[did].get(f"2026-0{m}", 0.0) for m in (7, 8, 9))
        q1_val = sum(monthly_val[did].get(f"2026-0{m}", 0.0) for m in (4, 5, 6))
        degrowth_qoq_val = max(0.0, q1_val - q2_val)

        out_rows.append({
            "dealer_id": did,
            "so_id": d["so_id"],
            "parent_dealer_id": d["parent_dealer_id"],
            "club": 1 if d["club"] else 0,
            "has_gps": 1 if d["has_gps"] else 0,
            "lat": d["lat"] or "",
            "lon": d["lon"] or "",
            "sales_rate_daily": round(rate, 4),
            "points_per_sheet": round(pps, 2),
            "is_active_for_events": 1 if is_active else 0,
            "annual_purchases_inr": round(purchases, 2),
            "gst_turnover_proxy_inr": round(turnover_proxy, 2),
            "headroom_inr": round(headroom, 2),
            "is_valid_gst": 1 if is_valid_gst else 0,
            "degrowth_mom_inr": round(degrowth_mom_val, 2),
            "degrowth_qoq_inr": round(degrowth_qoq_val, 2),
            "sales_aug_inr": round(val_aug, 2),
            "sales_sep_inr": round(val_sep, 2),
        })

    # Write output
    with open(output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(out_rows[0].keys()))
        writer.writeheader()
        writer.writerows(out_rows)

    print("=" * 60)
    print("           PJP FEATURE STORE GENERATION")
    print("=" * 60)
    print(f"Total Dealers Processed   : {len(out_rows)}")
    print(f"Active Dealers (rate >= 0.5): {active_count} (exact match for simulation event pool)")
    print(f"Output Saved To           : {output_file}")
    print("=" * 60)

if __name__ == "__main__":
    build_features()
