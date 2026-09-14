"""
================================================================================
🚀 MASTER MULTI-SOURCE DIRECT ZOHO CRM BATCH UPSERTER
================================================================================
Universal uploader that pulls from:
1. Google Sheets (via GViz CSV reader & GSpread fallback)
2. Scraped CSV files in output/ directories across all repos
3. Live Scraper in-memory data
And batch upserts all leads to Zoho CRM via Official OAuth 2.0 API with duplicate checking.
"""

import os
import sys
import json
import time
import csv
import io
import requests
from typing import List, Dict, Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from zoho_crm import upsert_leads_to_zoho, get_zoho_access_token

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)

TARGET_SPREADSHEETS = [
    {
        "id": "18oHqPuo6BhAgI5e_GLSSps5fSc_DpzYEYofgPKxBv9o",
        "name": "Zoho Partners & Sales Executives",
        "tabs": ["Sheet1", "Zoho Leads", "Direct Leads"],
        "source": "Zoho Partner TN Scraper"
    },
    {
        "id": "1X_8LbsHisyvoCfjSuTX5yRVsRgXPDEmu3W5RWXuAC1o",
        "name": "Odoo Partners & Sales Executives",
        "tabs": ["Sheet1", "Odoo Leads", "Direct Leads"],
        "source": "Odoo Partner TN Scraper"
    },
    {
        "id": "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM",
        "name": "Master Enterprise Business Leads",
        "tabs": [
            "Australia B2B Direct Leads",
            "India IT & Software Leads",
            "Freelance & Upwork Leads",
            "LinkedIn Executives",
            "Zoho Partners",
            "Odoo Partners",
            "Digital Marketing Leads"
        ],
        "source": "Enterprise Leads Hub"
    },
    {
        "id": "1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw",
        "name": "Web Leads Pipeline",
        "tabs": ["Leads", "Sheet1"],
        "source": "Web Scraper Pipeline"
    }
]

def fetch_sheet_csv(sheet_id: str, tab_name: str = None) -> List[Dict[str, Any]]:
    """Fetches sheet tab content as list of dicts using GViz CSV export."""
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv"
    if tab_name:
        url += f"&sheet={requests.utils.quote(tab_name)}"
    
    try:
        res = requests.get(url, timeout=15)
        if res.status_code == 200 and len(res.text.strip()) > 0:
            reader = csv.reader(io.StringIO(res.text))
            rows = list(reader)
            if len(rows) > 1:
                headers = [str(h).strip() for h in rows[0]]
                records = []
                for r in rows[1:]:
                    rec = {}
                    for idx, val in enumerate(r):
                        if idx < len(headers) and headers[idx]:
                            rec[headers[idx]] = val.strip()
                    if any(rec.values()):
                        records.append(rec)
                return records
    except Exception as e:
        print(f"[-] GViz read error for sheet {sheet_id} ({tab_name}): {e}")
    return []

def scan_local_scraped_csvs() -> List[Dict[str, Any]]:
    """Scans all local output directories for CSV lead files."""
    scraped_leads = []
    search_dirs = [
        BASE_DIR,
        os.path.join(BASE_DIR, "output"),
        PARENT_DIR,
        os.path.join(PARENT_DIR, "output"),
        os.path.join(PARENT_DIR, "digital-marketing-executive-lead-generator"),
        os.path.join(PARENT_DIR, "Facebook", "Output")
    ]
    
    for sdir in search_dirs:
        if not os.path.exists(sdir):
            continue
        for root, _, files in os.walk(sdir):
            for file in files:
                if file.endswith(".csv"):
                    fpath = os.path.join(root, file)
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                            reader = csv.DictReader(f)
                            for row in reader:
                                row["_source_file"] = file
                                scraped_leads.append(row)
                    except Exception:
                        pass
    return scraped_leads

def run_master_zoho_sync():
    print("=" * 80)
    print("🚀 EXECUTING MASTER DIRECT ZOHO CRM BATCH SYNC")
    print("=" * 80)

    token = get_zoho_access_token()
    if not token:
        print("❌ FATAL: Unable to authenticate with Zoho CRM OAuth API!")
        return False

    print("[✓] Zoho CRM OAuth Token successfully authenticated!")

    grand_total_scanned = 0
    grand_total_inserted = 0
    grand_total_updated = 0
    grand_total_failed = 0

    # 1. Sync from Google Sheets
    print("\n--- [Phase 1/2] Syncing All Google Sheets to Zoho CRM ---")
    for sheet in TARGET_SPREADSHEETS:
        sheet_id = sheet["id"]
        sheet_name = sheet["name"]
        default_source = sheet["source"]
        
        print(f"\n[*] Processing Google Sheet: '{sheet_name}'...")
        for tab in sheet["tabs"]:
            records = fetch_sheet_csv(sheet_id, tab)
            if records:
                print(f"  [+] Tab '{tab}': Found {len(records)} leads.")
                res = upsert_leads_to_zoho(records, source_label=f"{default_source} - {tab}")
                grand_total_scanned += len(records)
                grand_total_inserted += res.get("inserted", 0)
                grand_total_updated += res.get("updated", 0)
                grand_total_failed += res.get("failed", 0)
            time.sleep(0.3)

    # 2. Sync from Local Scraped CSVs
    print("\n--- [Phase 2/2] Syncing Local Scraped CSV Leads to Zoho CRM ---")
    local_leads = scan_local_scraped_csvs()
    if local_leads:
        print(f"[*] Found {len(local_leads)} leads across local CSV files.")
        res = upsert_leads_to_zoho(local_leads, source_label="Local Scraper Cache")
        grand_total_scanned += len(local_leads)
        grand_total_inserted += res.get("inserted", 0)
        grand_total_updated += res.get("updated", 0)
        grand_total_failed += res.get("failed", 0)

    print("\n" + "=" * 80)
    print(f"🎉 MASTER ZOHO CRM SYNC COMPLETE SUMMARY:")
    print(f"  - Total Scanned  : {grand_total_scanned}")
    print(f"  - New Inserted   : {grand_total_inserted}")
    print(f"  - Updated Existing: {grand_total_updated}")
    print(f"  - Failed/Skipped : {grand_total_failed}")
    print("=" * 80)
    return True

if __name__ == "__main__":
    run_master_zoho_sync()
