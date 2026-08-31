"""
=============================================================================
INFOGENX TWILIO LEAD SCRAPER & CRM ENGINE - MAIN RUNNER
=============================================================================
CLI entrypoint to execute Web Scraping (Code.gs), Social Scraping (SocialScraper.gs),
Combined Multi-Engine Scraping, or Zoho CRM Synchronization.

Usage:
  python main.py --mode web          # Scrapes B2B Web Leads -> Leads tab (Code.gs)
  python main.py --mode social       # Scrapes Social Media Leads -> Social Leads tab (SocialScraper.gs)
  python main.py --mode all          # Runs both Web & Social Scrapers concurrently
  python main.py --mode sync-crm     # Syncs un-synced leads from Google Sheets to Zoho CRM
  python main.py --mode daemon --interval 60 # Continuous background execution every X minutes
=============================================================================
"""

import sys
import os
import time
import argparse

# Ensure local modules are found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Ensure UTF-8 output on Windows
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


def run_web(limit=None):
    scraper = WebLeadScraper()
    return scraper.run(max_industries=limit)


def run_social(limit=None):
    scraper = SocialLeadScraper()
    return scraper.run(max_targets=limit)


def run_all(limit=None, sync_crm=True):
    scraper = WebSocialScraper()
    res = scraper.run_all(max_web_industries=limit, max_social_targets=limit)
    if sync_crm:
        print("\n" + "=" * 80)
        print("🔄 Automatically syncing verified leads to Zoho CRM...")
        print("=" * 80)
        run_crm_sync()
    return res


def run_crm_sync():
    engine = CrmSyncEngine()
    engine.run_all()


def run_daemon(interval_minutes=60):
    print("=" * 80)
    print(f"⏰ Starting Daemon Mode - Execution Interval: {interval_minutes} minutes")
    print("=" * 80)
    while True:
        try:
            print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting scheduled scraping & sync cycle...")
            run_all()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Scraping complete. Running CRM Sync...")
            run_crm_sync()
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
            "  web      : Scrapes Google & B2B Web Leads (for Code.gs sheet)\n"
            "  social   : Scrapes Social Media Leads (for SocialScraper.gs sheet)\n"
            "  all      : Runs both Web & Social Scrapers concurrently\n"
            "  sync-crm : Syncs un-synced leads from Google Sheets to Zoho CRM\n"
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
