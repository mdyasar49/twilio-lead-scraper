"""
=============================================================================
INFOGENX TWILIO LEAD SCRAPER & CRM ENGINE - MAIN RUNNER
=============================================================================
CLI entrypoint to execute Web Scraping, Social Scraping, Multi-Engine Scraping,
Google Sheets Sync, and DIRECT ZOHO CRM API Upload.
=============================================================================
"""

import sys
import os
import time
import argparse
import subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from config import SPREADSHEET_ID_WEB, SPREADSHEET_ID_SOCIAL
from scrapers import (
    WebLeadScraper,
    SocialLeadScraper,
    WebSocialScraper,
    CrmSyncEngine
)

def run_direct_zoho_upload():
    """Executes direct Zoho CRM API batch upload for all 5 spreadsheets and 21 tabs."""
    print("\n" + "=" * 80)
    print("🚀 Triggering Direct Zoho CRM API Batch Upload...")
    print("=" * 80)
    uploader_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "upload_all_sheets_direct_to_zoho.py")
    if os.path.exists(uploader_script):
        try:
            subprocess.run([sys.executable, uploader_script], check=True)
        except Exception as e:
            print(f"[!] Direct Zoho API Upload exception: {e}")
    else:
        engine = CrmSyncEngine()
        engine.run_all()

def run_web(limit=None):
    scraper = WebLeadScraper()
    res = scraper.run(max_industries=limit)
    run_direct_zoho_upload()
    return res

def run_social(limit=None):
    scraper = SocialLeadScraper()
    res = scraper.run(max_targets=limit)
    run_direct_zoho_upload()
    return res

def run_all(limit=None, sync_crm=True):
    scraper = WebSocialScraper()
    res = scraper.run_all(max_web_industries=limit, max_social_targets=limit)
    if sync_crm:
        run_direct_zoho_upload()
    return res

def run_crm_sync():
    run_direct_zoho_upload()

def run_daemon(interval_minutes=60):
    print("=" * 80)
    print(f"⏰ Starting Daemon Mode - Execution Interval: {interval_minutes} minutes")
    print("=" * 80)
    while True:
        try:
            print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting scheduled scraping & sync cycle...")
            run_all()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Cycle finished. Sleeping for {interval_minutes} minutes.\n")
        except Exception as e:
            print(f"[!] Error during daemon cycle: {e}")

        time.sleep(interval_minutes * 60)

def main():
    parser = argparse.ArgumentParser(
        description="Infogenx Lead Scraper & CRM Suite CLI",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["web", "social", "all", "sync-crm", "daemon"],
        default="all",
        help=(
            "Execution mode:\n"
            "  web      : Scrapes Google & B2B Web Leads -> Google Sheets -> Zoho CRM\n"
            "  social   : Scrapes Social Media Leads -> Google Sheets -> Zoho CRM\n"
            "  all      : Runs Web & Social Scrapers concurrently -> Google Sheets -> Zoho CRM\n"
            "  sync-crm : Uploads all 5 spreadsheets (21 tabs) directly to Zoho CRM API\n"
            "  daemon   : Runs on scheduled timer in background"
        )
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of industries/platforms to scrape in test runs"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Interval in minutes for daemon mode (default: 60)"
    )

    args = parser.parse_args()

    if args.mode == "web":
        run_web(args.limit)
    elif args.mode == "social":
        run_social(args.limit)
    elif args.mode == "all":
        run_all(args.limit)
    elif args.mode == "sync-crm":
        run_crm_sync()
    elif args.mode == "daemon":
        run_daemon(args.interval)

if __name__ == "__main__":
    main()
