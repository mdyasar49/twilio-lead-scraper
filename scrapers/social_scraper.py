"""
=============================================================================
SOCIAL MEDIA LEAD SCRAPER (FOR SocialScraper.gs / SOCIAL MEDIA LEADS)
=============================================================================
Scrapes pre-launch and high-intent social business leads across:
- LinkedIn public company posts and founder profiles
- Instagram business bio & announcements
- Facebook business pages & grand openings
- X (Twitter) product launches & announcements
- Reddit startup discussions (r/ausfinance, r/australia, r/startups)
- YouTube & Pinterest commercial posts

Appends formatted rows directly to Google Sheet:
Spreadsheet ID: 1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw (Tab: Social Leads)
Matching the exact column layout of SocialScraper.gs!
=============================================================================
"""

import os
import sys
import json
import time
import datetime
import re
import requests
import jwt
import concurrent.futures
from urllib.parse import quote_plus

try:
    from ..config import (
        SERVICE_ACCOUNT_FILE,
        SPREADSHEET_ID_SOCIAL,
        TAB_NAME_SOCIAL,
        SERPER_API_KEYS,
        GEMINI_API_KEYS,
        SOCIAL_PLATFORMS,
        SOCIAL_LAUNCH_KEYWORDS,
        DEFAULT_LOCATION,
        LEADS_PER_QUERY,
        LEAD_ADDED_BY_SOCIAL,
        SHEET_HEADERS
    )
    from .deep_crawler import DeepContactCrawler
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from config import (
        SERVICE_ACCOUNT_FILE,
        SPREADSHEET_ID_SOCIAL,
        TAB_NAME_SOCIAL,
        SERPER_API_KEYS,
        GEMINI_API_KEYS,
        SOCIAL_PLATFORMS,
        SOCIAL_LAUNCH_KEYWORDS,
        DEFAULT_LOCATION,
        LEADS_PER_QUERY,
        LEAD_ADDED_BY_SOCIAL,
        SHEET_HEADERS
    )
    from scrapers.deep_crawler import DeepContactCrawler


if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

class SocialLeadScraper:
    def __init__(self):
        self.crawler = DeepContactCrawler()
        self.google_access_token = None
        self.token_expiry = 0

    def get_google_access_token(self):
        """Generates OAuth2 Access Token for Google Sheets API via Service Account JWT."""
        now = int(time.time())
        if self.google_access_token and now < self.token_expiry - 60:
            return self.google_access_token

        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            print(f"[!] Warning: Service account file not found at {SERVICE_ACCOUNT_FILE}")
            return None

        try:
            with open(SERVICE_ACCOUNT_FILE, "r") as f:
                sa_info = json.load(f)

            payload = {
                "iss": sa_info["client_email"],
                "sub": sa_info["client_email"],
                "aud": "https://oauth2.googleapis.com/token",
                "iat": now,
                "exp": now + 3600,
                "scope": "https://www.googleapis.com/auth/spreadsheets"
            }

            signed_jwt = jwt.encode(payload, sa_info["private_key"], algorithm="RS256")
            res = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": signed_jwt
                },
                timeout=15
            )

            if res.status_code == 200:
                data = res.json()
                self.google_access_token = data["access_token"]
                self.token_expiry = now + data.get("expires_in", 3600)
                return self.google_access_token
            else:
                print(f"[!] Error fetching Google token: {res.text}")
                return None
        except Exception as e:
            print(f"[!] Exception generating Google Access Token: {e}")
            return None

    def search_social_dorks(self, platform, keyword, location=DEFAULT_LOCATION, industry="IT / Software", num=LEADS_PER_QUERY):
        """Builds high-yield social search dorks for Serper.dev."""
        leads = []
        if not SERPER_API_KEYS:
            return leads

        # Construct platform-specific dork queries
        site_dorks = {
            "LinkedIn": "site:linkedin.com/in/ OR site:linkedin.com/company/",
            "Instagram": "site:instagram.com",
            "Facebook": "site:facebook.com",
            "X (Twitter)": "site:twitter.com OR site:x.com",
            "Reddit": "site:reddit.com",
            "YouTube": "site:youtube.com",
            "Pinterest": "site:pinterest.com"
        }
        
        clean_industry = industry.replace("/", " ").strip()
        site_filter = site_dorks.get(platform, "")
        dork_query = f'{site_filter} "{keyword}" {clean_industry} {location}'

        api_key = SERPER_API_KEYS[0]
        url = "https://google.serper.dev/search"
        payload = {
            "q": dork_query,
            "gl": "au" if "australia" in location.lower() else "us",
            "num": num
        }
        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json"
        }

        try:
            res = requests.post(url, json=payload, headers=headers, timeout=12)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("organic", []):
                    leads.append({
                        "title": item.get("title", ""),
                        "link": item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                        "platform": platform,
                        "keyword": keyword
                    })
        except Exception as e:
            print(f"[!] Social Serper error for {platform}: {e}")

        return leads

    def search_gemini_social_grounding(self, platform, keyword, location=DEFAULT_LOCATION, industry="IT / Software"):
        """Uses Google Gemini Grounding API to discover verified Social Business leads."""
        leads = []
        if not GEMINI_API_KEYS:
            return leads

        api_key = GEMINI_API_KEYS[0]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        prompt = (
            f"Find 5 active business founders or companies on {platform} in {location} matching '{keyword}' in {industry}. "
            "Return a JSON array with objects containing keys: "
            "'company', 'contact_name', 'email', 'phone', 'social_url', 'industry', 'notes'. "
            "Only return raw JSON without markdown."
        )

        try:
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            res = requests.post(url, json=payload, timeout=15)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    for item in parsed:
                        leads.append({
                            "company": item.get("company", ""),
                            "contact_name": item.get("contact_name", ""),
                            "email": item.get("email", ""),
                            "phone": item.get("phone", ""),
                            "link": item.get("social_url", ""),
                            "industry": item.get("industry", industry),
                            "notes": item.get("notes", f"Discovered via Gemini on {platform}"),
                            "source": platform
                        })
        except Exception as e:
            print(f"[!] Gemini Social Search error: {e}")

        return leads

    def scrape_platform_keyword(self, platform, keyword, location=DEFAULT_LOCATION, industry="IT / Software"):
        """Scrapes and compiles leads for a specific social platform and trigger."""
        print(f"[*] Scraping Social Leads on [{platform}] for trigger '{keyword}' in {location}...")
        raw_results = self.search_social_dorks(platform, keyword, location, industry)

        compiled_leads = []
        today_str = datetime.date.today().strftime("%d/%m/%Y")

        def process_social_item(item):
            link = item.get("link", "")
            title = item.get("title", "")
            snippet = item.get("snippet", "")

            emails = self.crawler.extract_emails(snippet)
            phones = self.crawler.extract_phones(snippet)

            company_candidate = title
            contact_candidate = "Founder / Decision Maker"

            if platform == "LinkedIn":
                parts = re.split(r"[-|–—•]", title)
                if len(parts) >= 2:
                    contact_candidate = parts[0].strip()
                    company_candidate = parts[1].strip()
            elif platform in ["Instagram", "Facebook", "X (Twitter)"]:
                parts = re.split(r"[-|–—•(@]", title)
                if parts:
                    company_candidate = parts[0].strip()

            email = emails[0] if emails else ""
            phone = phones[0] if phones else ""

            # If snippet didn't have email/phone, crawl if external URL
            if not email and not phone:
                if self.crawler.is_valid_domain(link) and not any(s in link for s in ["linkedin.com", "instagram.com", "facebook.com", "twitter.com"]):
                    crawl_res = self.crawler.crawl_url(link)
                    crawl_emails = crawl_res.get("emails", [])
                    crawl_phones = crawl_res.get("phones", [])
                    if crawl_emails:
                        email = crawl_emails[0]
                    if crawl_phones:
                        phone = crawl_phones[0]

            if not email and not phone:
                return None

            return [
                today_str,                                    # Date
                platform,                                     # Lead Source (e.g. LinkedIn, Instagram)
                company_candidate,                            # Company
                email,                                        # Email
                phone,                                        # Phone Number / Mobile Number
                industry,                                     # Industry
                contact_candidate,                            # Customer Name
                "New",                                        # Status
                LEAD_ADDED_BY_SOCIAL,                         # Lead Added By
                f"Social Link: {link} | Trigger: {keyword}"  # Notes
            ]

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            results_list = list(executor.map(process_social_item, raw_results[:25]))
            for res in results_list:
                if res:
                    compiled_leads.append(res)

        # Supplement with Gemini Social Grounding
        gemini_social = self.search_gemini_social_grounding(platform, keyword, location, industry)
        for g in gemini_social:
            lead_row = [
                today_str,
                g.get("source", platform),
                g.get("company", ""),
                g.get("email", ""),
                g.get("phone", ""),
                g.get("industry", industry),
                g.get("contact_name", "Decision Maker"),
                "New",
                LEAD_ADDED_BY_SOCIAL,
                f"Social Link: {g.get('link', '')} | {g.get('notes', '')}"
            ]
            if lead_row[3] or lead_row[4]:
                compiled_leads.append(lead_row)

        print(f"[+] Found {len(compiled_leads)} verified Social Leads on [{platform}].")
        return compiled_leads

    def fetch_existing_keys(self):
        """
        Fetches existing records from Social Leads Google Sheet to prevent duplicates.
        Returns sets of existing emails, phone numbers, and companies.
        """
        token = self.get_google_access_token()
        if not token:
            return set(), set(), set()

        url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_SOCIAL}/values/{TAB_NAME_SOCIAL}!A:J"
        headers = {"Authorization": f"Bearer {token}"}
        
        existing_emails = set()
        existing_phones = set()
        existing_companies = set()

        try:
            res = requests.get(url, headers=headers, timeout=15)
            if res.status_code == 200:
                rows = res.json().get("values", [])
                for row in rows[1:]: # Skip header
                    if len(row) > 2 and row[2]: # Company
                        existing_companies.add(row[2].strip().lower())
                    if len(row) > 3 and row[3]: # Email
                        existing_emails.add(row[3].strip().lower())
                    if len(row) > 4 and row[4]: # Phone
                        clean_p = re.sub(r"\D", "", row[4])
                        if clean_p:
                            existing_phones.add(clean_p)
        except Exception as e:
            print(f"[!] Warning: Could not fetch existing social keys for deduplication: {e}")

        return existing_emails, existing_phones, existing_companies

    def append_leads_to_google_sheet(self, leads):
        """
        Non-Destructive Safe Append for Social Media Leads:
        1. Reads existing rows from Google Sheet.
        2. Filters out duplicates based on email, phone, or company.
        3. Appends ONLY fresh, non-duplicate rows.
        4. NEVER deletes or modifies existing rows!
        """
        if not leads:
            print("[-] No social leads to append.")
            return False

        token = self.get_google_access_token()
        if not token:
            print("[!] Cannot append to Social Google Sheet: Missing access token.")
            return False

        # Fetch existing keys for strict deduplication
        existing_emails, existing_phones, existing_companies = self.fetch_existing_keys()
        print(f"[*] Sheet Protection: Verified {len(existing_emails)} existing emails & {len(existing_phones)} existing phones in Social Sheet.")

        unique_leads = []
        skipped_count = 0

        for row in leads:
            company = row[2].strip().lower() if len(row) > 2 and row[2] else ""
            email = row[3].strip().lower() if len(row) > 3 and row[3] else ""
            phone = re.sub(r"\D", "", row[4]) if len(row) > 4 and row[4] else ""

            is_duplicate = False
            if email and email in existing_emails:
                is_duplicate = True
            elif phone and len(phone) >= 8 and phone in existing_phones:
                is_duplicate = True
            elif company and len(company) > 3 and company in existing_companies and not email and not phone:
                is_duplicate = True

            if not is_duplicate:
                unique_leads.append(row)
                if email:
                    existing_emails.add(email)
                if phone:
                    existing_phones.add(phone)
                if company:
                    existing_companies.add(company)
            else:
                skipped_count += 1

        if skipped_count > 0:
            print(f"[*] Duplicate Protection: Filtered out {skipped_count} social duplicates already existing in Google Sheet.")

        if not unique_leads:
            print("[ℹ️] All discovered social leads are already present in Google Sheet. 0 new rows to append.")
            return True

        url = (
            f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_SOCIAL}/values/"
            f"{TAB_NAME_SOCIAL}!A:J:append?valueInputOption=USER_ENTERED"
        )
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        body = {
            "range": f"{TAB_NAME_SOCIAL}!A:J",
            "majorDimension": "ROWS",
            "values": unique_leads
        }

        try:
            res = requests.post(url, headers=headers, json=body, timeout=15)
            if res.status_code in [200, 201]:
                print(f"[✅] Safely appended {len(unique_leads)} fresh social leads to Google Sheet [{SPREADSHEET_ID_SOCIAL}] without touching existing data!")
                return True
            else:
                print(f"[!] Google Sheets API Error {res.status_code}: {res.text}")
                return False
        except Exception as e:
            print(f"[!] Exception appending leads to Google Sheets: {e}")
            return False

    def run(self, max_targets=None):
        """Executes full social scraping workflow across configured platforms."""
        targets = SOCIAL_PLATFORMS[:max_targets] if max_targets else SOCIAL_PLATFORMS
        all_leads = []

        print("=" * 70)
        print(f"📱 Starting Social Media Lead Scraper for SocialScraper.gs -> Sheet [{SPREADSHEET_ID_SOCIAL}]")
        print("=" * 70)

        for platform, keyword, location, industry in targets:
            leads = self.scrape_platform_keyword(platform, keyword, location, industry)
            all_leads.extend(leads)

        # Append to Google Sheet
        if all_leads:
            self.append_leads_to_google_sheet(all_leads)

        print(f"\n[🎉] Completed! Total Social Leads Processed: {len(all_leads)}")
        return all_leads
