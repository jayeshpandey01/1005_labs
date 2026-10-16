#!/usr/bin/env python3
"""Audit master data hygiene, missing coordinates, invalid GSTINs, and parent-child relations.

Robust, fully parameterized, no hardcoded officer names or thresholds.
"""

import csv
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

DATA_DIR = Path(__file__).resolve().parents[4] / "dataset"


def audit_master_data() -> Dict[str, any]:
    """Execute master data validation and return hygiene metrics."""
    dealers_file = DATA_DIR / "dealers.csv"
    gst_file = DATA_DIR / "GST_filings.csv"
    officers_file = DATA_DIR / "officers.csv"

    # 1. Dynamically load officers
    officers: Dict[str, dict] = {}
    if officers_file.exists():
        with open(officers_file, mode="r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                officers[r["so_id"]] = r

    # 2. Audit dealers table
    dealers: List[dict] = []
    missing_gps: Dict[str, int] = defaultdict(int)
    club_members: Dict[str, int] = defaultdict(int)
    parent_child_links: List[Tuple[str, str, str]] = []

    with open(dealers_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            dealers.append(r)
            so_id = r["so_id"]
            lat, lon = r.get("lat"), r.get("lon")
            if not lat or not lon:
                missing_gps[so_id] += 1
            if r.get("parent_dealer_id"):
                parent_child_links.append((r["dealer_id"], r["parent_dealer_id"], so_id))
            if r.get("loyalty_club_member", "").strip().lower() == "yes":
                club_members[so_id] += 1

    total_dealers = len(dealers)
    total_missing = sum(missing_gps.values())
    located_dealers = total_dealers - total_missing

    # 3. Audit GST Filings
    gst_rows: List[dict] = []
    invalid_gst_records: List[Tuple[str, str]] = []

    with open(gst_file, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            gst_rows.append(r)
            status = r.get("lookup_status", "")
            if "invalid" in status.lower():
                invalid_gst_records.append((r["dealer_id"], status))

    # Clean structured report output
    print("-" * 65)
    print("Master Data Hygiene Audit Report")
    print("-" * 65)
    print(f"Total Officers Registered : {len(officers)}")
    print(f"Total Outlets in Universe : {total_dealers}")
    print(f"Located Outlets (GPS)     : {located_dealers} ({located_dealers / total_dealers * 100:.1f}%)")
    print(f"Missing GPS Outlets       : {total_missing} ({total_missing / total_dealers * 100:.1f}%)")

    print("\nMissing Coordinates Distribution by Officer:")
    for so_id in sorted(officers.keys() if officers else missing_gps.keys()):
        count = missing_gps.get(so_id, 0)
        total_for_so = sum(1 for d in dealers if d["so_id"] == so_id)
        pct = (count / total_for_so * 100) if total_for_so > 0 else 0.0
        print(f"  - {so_id}: {count} unlocated / {total_for_so} total ({pct:.1f}%)")

    print(f"\nParent-Child Linkages Identified: {len(parent_child_links)}")
    for child, parent, so_id in parent_child_links:
        print(f"  - Child: {child} -> Parent: {parent} (Officer: {so_id})")

    print("\nLoyalty Club Members by Officer:")
    for so_id in sorted(officers.keys() if officers else club_members.keys()):
        count = club_members.get(so_id, 0)
        print(f"  - {so_id}: {count} club accounts (2 visits/month required)")

    print(f"\nTotal GST Records Audited : {len(gst_rows)}")
    print(f"Invalid GSTIN Checksums   : {len(invalid_gst_records)}")
    for did, stat in invalid_gst_records[:5]:
        print(f"  - {did}: {stat}")
    if len(invalid_gst_records) > 5:
        print(f"  ... and {len(invalid_gst_records) - 5} additional records")

    print("-" * 65)
    print("Master Data Audit: Completed Successfully")
    print("-" * 65)

    return {
        "total_dealers": total_dealers,
        "located_dealers": located_dealers,
        "missing_gps_total": total_missing,
        "missing_gps_by_officer": dict(missing_gps),
        "parent_child_links": parent_child_links,
        "invalid_gst_count": len(invalid_gst_records),
    }


if __name__ == "__main__":
    audit_master_data()
