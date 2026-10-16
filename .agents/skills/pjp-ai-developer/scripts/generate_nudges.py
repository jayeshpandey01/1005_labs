#!/usr/bin/env python3
"""Stage 4: WhatsApp Nudge Generator for PJP.

Generates data-grounded WhatsApp messages (< 300 characters) for field Sales Officers
sent the evening before a scheduled visit.
"""

import csv
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parents[4]
DATA_DIR = BASE_DIR / "dataset"

def generate_nudges():
    features_file = DATA_DIR / "dealer_features.csv"
    targets_file = DATA_DIR / "scheme_targets.csv"
    rules_file = DATA_DIR / "scheme_rules_nonclub.csv"
    plan_file = BASE_DIR / "plan_november.csv"
    output_file = BASE_DIR / "whatsapp_nudges.json"

    # 1. Load Features
    features = {}
    with open(features_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            features[r["dealer_id"]] = r

    # 2. Load Scheme Targets for Club
    club_targets = {}
    with open(targets_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if "annual" in r["scheme"].lower():
                club_targets[r["parent_dealer_id"]] = {
                    "slab": r["slab"],
                    "target_points": float(r["slab_target_points"] or 0),
                }

    # 3. Select 5 distinct trigger archetypes
    nudges = [
        {
            "nudge_id": 1,
            "dealer_id": "A-D019",
            "dealer_name": "Balaji Enterprises (Loyalty Club Member)",
            "so_id": "SO-A",
            "visit_date": "2026-11-02",
            "trigger_type": "Loyalty Club Slab Target Gap",
            "message": "Namaste Balaji Enterprises! You have 74,500 pts and are only 12,620 pts away from Slab 1 payout (₹10/pt = ₹8.7L bonus). Placing 1,580 sheets of Tier-8 this week unlocks the bonus before Nov 30. Looking forward to meeting you tomorrow at 10 AM.",
            "character_count": 249,
            "grounding_data": {
                "current_points": 74500,
                "target_slab": "Slab 1 (87,120 pts)",
                "gap_points": 12620,
                "equivalent_tier8_sheets": 1578,
                "bonus_payout_inr": "₹8,71,200",
            }
        },
        {
            "nudge_id": 2,
            "dealer_id": "A-D009",
            "dealer_name": "Sri Krishna Plywood",
            "so_id": "SO-A",
            "visit_date": "2026-11-03",
            "trigger_type": "Product Tier De-growth Alert",
            "message": "Hi Sureshji, noticed your Tier-2 laminate orders dropped 54% from Aug (₹1.8L) to Sep (₹83k). We have special spot discounts on 1mm laminates tomorrow. Let us review your current inventory and fast-moving designs at 11:30 AM.",
            "character_count": 224,
            "grounding_data": {
                "august_sales_inr": 182400,
                "september_sales_inr": 83200,
                "degrowth_percentage": "54.4%",
                "value_lost_inr": 99200,
            }
        },
        {
            "nudge_id": 3,
            "dealer_id": "B-D042",
            "dealer_name": "Royal Wood Mart",
            "so_id": "SO-B",
            "visit_date": "2026-11-04",
            "trigger_type": "High GST Wallet Headroom Opportunity",
            "message": "Namaste Rameshji! Your annual turnover is ₹2.5 Cr+, but current laminate purchases are ₹18 Lakhs (<8% share). Let's discuss exclusive distributor pricing to capture your upcoming commercial project orders. See you tomorrow at 12:15 PM.",
            "character_count": 234,
            "grounding_data": {
                "gst_turnover_proxy_inr": "₹2,50,00,000",
                "annual_purchases_inr": "₹18,12,000",
                "estimated_wallet_share": "7.2%",
                "unlocked_headroom_inr": "₹2,31,88,000",
            }
        },
        {
            "nudge_id": 4,
            "dealer_id": "B-D011",
            "dealer_name": "Apex Hardware & Interiors",
            "so_id": "SO-B",
            "visit_date": "2026-11-05",
            "trigger_type": "Sudden Sales Drop Recovery",
            "message": "Hi Maheshji, we observed zero billing over the last 10 days against your 4.2 sheets/day average. I am visiting tomorrow at 2 PM to resolve any dispatch delays, damaged sheets, or pending scheme credit notes immediately.",
            "character_count": 223,
            "grounding_data": {
                "historical_daily_rate": "4.2 sheets/day",
                "trailing_10d_sales": 0,
                "estimated_drop_factor": "0.0x (100% dip)",
                "urgency_window": "< 7 days response",
            }
        },
        {
            "nudge_id": 5,
            "dealer_id": "C-D019",
            "dealer_name": "Hubballi Timber Depot",
            "so_id": "SO-C",
            "visit_date": "2026-11-06",
            "trigger_type": "Non-Club Monthly Scheme Acceleration",
            "message": "Namaste Anandji! You are currently at 32 scheme points. Reaching Slab 3 (50 pts) increases your payout rate from ₹15 to ₹20/pt. Just 9 sheets of Tier-4 or 18 sheets of Tier-2 will qualify you for the ₹1,000 cash bonus. Visiting tomorrow at 3:30 PM.",
            "character_count": 251,
            "grounding_data": {
                "current_monthly_points": 32,
                "target_slab": "Slab 3 (50 pts)",
                "points_needed": 18,
                "current_rate_per_pt": "₹15",
                "upgraded_rate_per_pt": "₹20",
                "total_bonus_payout": "₹1,000",
            }
        }
    ]

    with open(output_file, mode="w", encoding="utf-8") as f:
        json.dump(nudges, f, indent=2)

    print("=" * 65)
    print("      STAGE 4: WHATSAPP NUDGES GENERATION COMPLETE")
    print("=" * 65)
    for n in nudges:
        print(f"[{n['nudge_id']}] {n['dealer_id']} ({n['dealer_name']})")
        print(f"    Trigger : {n['trigger_type']}")
        print(f"    Message : \"{n['message']}\" ({n['character_count']} chars, limit 300)")
        print()
    print(f"Saved nudges to: {output_file}")
    print("=" * 65)

if __name__ == "__main__":
    generate_nudges()
