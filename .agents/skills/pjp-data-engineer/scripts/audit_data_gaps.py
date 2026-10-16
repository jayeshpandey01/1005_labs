#!/usr/bin/env python3
"""Audit data hygiene, missing coordinates, invalid GSTINs, and parent-child relations."""

import csv
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[4] / "dataset"

def audit():
    dealers_file = DATA_DIR / "dealers.csv"
    gst_file = DATA_DIR / "GST_filings.csv"
    officers_file = DATA_DIR / "officers.csv"

    print("=" * 60)
    print("           PJP DATASET HYGIENE AUDIT REPORT")
    print("=" * 60)

    # 1. Dealers Audit
    dealers = []
    missing_gps = {"SO-A": 0, "SO-B": 0, "SO-C": 0}
    parent_child = []
    club_members = {"SO-A": 0, "SO-B": 0, "SO-C": 0}

    with open(dealers_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            dealers.append(r)
            so = r["so_id"]
            if not r["lat"] or not r["lon"]:
                missing_gps[so] = missing_gps.get(so, 0) + 1
            if r["parent_dealer_id"]:
                parent_child.append((r["dealer_id"], r["parent_dealer_id"], so))
            if r["loyalty_club_member"].strip().lower() == "yes":
                club_members[so] = club_members.get(so, 0) + 1

    total_dealers = len(dealers)
    total_missing = sum(missing_gps.values())
    located = total_dealers - total_missing

    print(f"Total Outlets in Universe : {total_dealers}")
    print(f"Located Outlets (GPS)     : {located} ({located/total_dealers*100:.1f}%)")
    print(f"Missing GPS Outlets       : {total_missing} ({total_missing/total_dealers*100:.1f}%)")
    for so, count in missing_gps.items():
        print(f"  - {so}: {count} unlocated")

    print(f"\nParent-Child Linkages Identified: {len(parent_child)}")
    for child, parent, so in parent_child:
        print(f"  - Child: {child} -> Parent: {parent} (Officer: {so})")

    print("\nLoyalty Club Members per Officer:")
    for so, count in club_members.items():
        print(f"  - {so}: {count} club dealers (require 2 visits/month)")

    # 2. GST Audit
    gst_rows = []
    invalid_gst = []
    with open(gst_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            gst_rows.append(r)
            status = r.get("lookup_status", "")
            if "invalid" in status.lower():
                invalid_gst.append((r["dealer_id"], status))

    print(f"\nTotal GST Records         : {len(gst_rows)}")
    print(f"Invalid GSTIN Checksums   : {len(invalid_gst)}")
    for did, stat in invalid_gst[:5]:
        print(f"  - {did}: {stat}")
    if len(invalid_gst) > 5:
        print(f"  ... and {len(invalid_gst) - 5} more")

    print("=" * 60)
    print("AUDIT STATUS: COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    audit()
