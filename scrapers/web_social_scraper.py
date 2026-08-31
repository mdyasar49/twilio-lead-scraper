"""
=============================================================================
UNIFIED WEB & SOCIAL LEAD SCRAPER (HIGH SPEED & 100% FREE ENGINES)
=============================================================================
Combines both Web Lead discovery (Code.gs) and Social Lead discovery (SocialScraper.gs)
using multi-tier search engines (DuckDuckGo, OSM, Gemini, GitHub, Serper).
Appends concurrently to both target Google Sheets!
=============================================================================
"""

import os
import sys
import json
import time
import datetime
import concurrent.futures
from urllib.parse import quote_plus

try:
    from ..config import (
        SPREADSHEET_ID_WEB,
        TAB_NAME_WEB,
        SPREADSHEET_ID_SOCIAL,
        TAB_NAME_SOCIAL
    )
    from .web_lead_scraper import WebLeadScraper
    from .social_scraper import SocialLeadScraper
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from config import (
        SPREADSHEET_ID_WEB,
        TAB_NAME_WEB,
        SPREADSHEET_ID_SOCIAL,
        TAB_NAME_SOCIAL
    )
    from scrapers.web_lead_scraper import WebLeadScraper
    from scrapers.social_scraper import SocialLeadScraper


class WebSocialScraper:
    def __init__(self):
        self.web_scraper = WebLeadScraper()
        self.social_scraper = SocialLeadScraper()

    def run_all(self, max_web_industries=None, max_social_targets=None):
        """Runs both Web and Social scraping pipelines concurrently."""
        print("=" * 80)
        print("🚀 INFOGENX UNIFIED LEAD SCRAPER (WEB & SOCIAL MEDIA SUITE)")
        print(f"📊 Target 1: Web Leads (Code.gs) -> {SPREADSHEET_ID_WEB} [{TAB_NAME_WEB}]")
        print(f"📱 Target 2: Social Leads (SocialScraper.gs) -> {SPREADSHEET_ID_SOCIAL} [{TAB_NAME_SOCIAL}]")
        print("=" * 80)

        results = {
            "web_leads": [],
            "social_leads": []
        }

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_web = executor.submit(self.web_scraper.run, max_web_industries)
            future_social = executor.submit(self.social_scraper.run, max_social_targets)

            results["web_leads"] = future_web.result()
            results["social_leads"] = future_social.result()

        total_leads = len(results["web_leads"]) + len(results["social_leads"])
        print("\n" + "=" * 80)
        print(f"🎉 EXECUTION SUMMARY:")
        print(f"  - Web Leads Generated: {len(results['web_leads'])}")
        print(f"  - Social Leads Generated: {len(results['social_leads'])}")
        print(f"  - Total Ingested to Google Sheets: {total_leads}")
        print("=" * 80)

        return results


if __name__ == "__main__":
    scraper = WebSocialScraper()
    scraper.run_all(max_web_industries=3, max_social_targets=3)
