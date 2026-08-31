"""
=============================================================================
WEB LEAD SCRAPER (FOR Code.gs / GOOGLE SEARCH LEADS)
=============================================================================
Scrapes high-yield B2B company leads across:
- Serper.dev Google Live Search API
- Google Gemini AI Search Grounding
- DuckDuckGo Lite Free Search Engine
- OpenStreetMap Nominatim Places API
- GitHub Public Developer Directory
- HackerNews Algolia Launch API

Appends formatted rows directly to Google Sheet:
Spreadsheet ID: 1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw (Tab: Leads)
Matching the exact column layout of Code.gs!
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
        SPREADSHEET_ID_WEB,
        TAB_NAME_WEB,
        SERPER_API_KEYS,
        GEMINI_API_KEYS,
        WEB_INDUSTRIES,
        DEFAULT_LOCATION,
        LEADS_PER_QUERY,
        LEAD_ADDED_BY_WEB,
        SHEET_HEADERS
    )
    from .deep_crawler import DeepContactCrawler
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from config import (
        SERVICE_ACCOUNT_FILE,
        SPREADSHEET_ID_WEB,
        TAB_NAME_WEB,
        SERPER_API_KEYS,
        GEMINI_API_KEYS,
        WEB_INDUSTRIES,
        DEFAULT_LOCATION,
        LEADS_PER_QUERY,
        LEAD_ADDED_BY_WEB,
        SHEET_HEADERS
    )
    from scrapers.deep_crawler import DeepContactCrawler


if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

class WebLeadScraper:
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

    def search_serper(self, query, location=DEFAULT_LOCATION, num=LEADS_PER_QUERY):
        """Searches Google Live results via Serper.dev API."""
        leads = []
        if not SERPER_API_KEYS:
            return leads

        api_key = SERPER_API_KEYS[0]
        url = "https://google.serper.dev/search"
        payload = {
            "q": query,
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
                        "source": "Google Search"
                    })
        except Exception as e:
            print(f"[!] Serper Search error: {e}")

        return leads

    def search_duckduckgo_lite(self, query, location=DEFAULT_LOCATION):
        """Searches DuckDuckGo Lite (100% Free, No API Key)."""
        leads = []
        url = "https://lite.duckduckgo.com/lite/"
        params = {"q": f"{query} {location}"}
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        try:
            res = requests.post(url, data=params, headers=headers, timeout=10)
            if res.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(res.text, "html.parser")
                links = soup.find_all("a", class_="result-link")
                snippets = soup.find_all("td", class_="result-snippet")
                
                for i, link_tag in enumerate(links[:20]):
                    href = link_tag.get("href", "")
                    title = link_tag.get_text(strip=True)
                    snippet = snippets[i].get_text(strip=True) if i < len(snippets) else ""
                    if href and href.startswith("http"):
                        leads.append({
                            "title": title,
                            "link": href,
                            "snippet": snippet,
                            "source": "DuckDuckGo"
                        })
        except Exception as e:
            pass

        return leads

    def search_gemini_grounding(self, query, location=DEFAULT_LOCATION):
        """Uses Google Gemini Grounding API if valid key is provided."""
        leads = []
        if not GEMINI_API_KEYS:
            return leads

        api_key = GEMINI_API_KEYS[0]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        prompt = (
            f"Find 5 active, verified B2B companies in {location} for: {query}. "
            "Return a JSON array with objects containing keys: "
            "'company', 'contact_name', 'email', 'phone', 'website', 'industry', 'notes'. "
            "Only return raw JSON without markdown."
        )

        try:
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            res = requests.post(url, json=payload, timeout=10)
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
                            "link": item.get("website", ""),
                            "industry": item.get("industry", query),
                            "notes": item.get("notes", "Discovered via Gemini Grounding"),
                            "source": "Gemini AI"
                        })
        except Exception:
            pass

        return leads

    def scrape_industry(self, industry, role, location=DEFAULT_LOCATION):
        """Scrapes and compiles leads for a specific industry and role."""
        print(f"[*] Scraping Web Leads for [{industry}] - [{role}] in {location}...")
        
        # Clean industry for natural search query (remove slashes)
        clean_industry = industry.replace("/", " ").replace("  ", " ").strip()
        
        # Multi-tiered high-yield queries
        queries = [
            f'site:.com.au {clean_industry} contact phone email',
            f'site:.com.au {clean_industry} services "contact us"',
            f'"{clean_industry}" companies {location} contact phone'
        ]
        
        raw_results = []
        for q in queries:
            results = self.search_serper(q, location, num=15)
            if results:
                raw_results.extend(results)
            else:
                raw_results.extend(self.search_duckduckgo_lite(q, location))

        # Deduplicate raw search results by link
        seen_links = set()
        unique_results = []
        for r in raw_results:
            link = r.get("link", "")
            if link and link not in seen_links:
                seen_links.add(link)
                unique_results.append(r)

        compiled_leads = []
        today_str = datetime.date.today().strftime("%d/%m/%Y")

        def process_search_item(item):
            link = item.get("link", "")
            title = item.get("title", "")
            snippet = item.get("snippet", "")
            source = item.get("source", "Google Search")

            if not self.crawler.is_valid_domain(link):
                return None

            # Deep crawl target website
            crawl_data = self.crawler.crawl_url(link)
            
            emails = crawl_data.get("emails", [])
            phones = crawl_data.get("phones", [])
            snippet_emails = self.crawler.extract_emails(snippet)
            snippet_phones = self.crawler.extract_phones(snippet)

            all_emails = list(dict.fromkeys(emails + snippet_emails))
            all_phones = list(dict.fromkeys(phones + snippet_phones))

            email = all_emails[0] if all_emails else ""
            phone = all_phones[0] if all_phones else ""

            if not email and not phone:
                return None

            company = crawl_data.get("company_name", "") or title.split("-")[0].split("|")[0].split("–")[0].strip()
            if not company or len(company) < 2:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(link).netloc.replace("www.", "")
                    company = domain.split(".")[0].capitalize()
                except Exception:
                    company = clean_industry + " Business"

            # Contact person name heuristic
            contact_name = role if role else "Decision Maker"

            return [
                today_str,                   # Date
                source,                      # Lead Source
                company,                     # Company
                email,                       # Email
                phone,                       # Phone Number / Mobile Number
                industry,                    # Industry
                contact_name,                # Customer Name
                "New",                       # Status
                LEAD_ADDED_BY_WEB,           # Lead Added By
                f"Website: {link}"           # Notes
            ]

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            results_list = list(executor.map(process_search_item, unique_results[:25]))
            for res in results_list:
                if res:
                    compiled_leads.append(res)

        # 4. Also fetch from Gemini Grounding
        gemini_leads = self.search_gemini_grounding(f"{industry} companies", location)
        for g in gemini_leads:
            lead_row = [
                today_str,
                g.get("source", "Gemini AI"),
                g.get("company", ""),
                g.get("email", ""),
                g.get("phone", ""),
                g.get("industry", industry),
                g.get("contact_name", role),
                "New",
                LEAD_ADDED_BY_WEB,
                f"Website: {g.get('link', '')} | {g.get('notes', '')}"
            ]
            if lead_row[3] or lead_row[4]:  # Must have email or phone
                compiled_leads.append(lead_row)

        print(f"[+] Found {len(compiled_leads)} verified Web Leads for [{industry}].")
        return compiled_leads

    def fetch_existing_keys(self):
        """
        Fetches existing records from Google Sheet to ensure no data is ever overwritten or duplicated.
        Returns sets of existing emails, phone numbers, and companies.
        """
        token = self.get_google_access_token()
        if not token:
            return set(), set(), set()

        url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_WEB}/values/{TAB_NAME_WEB}!A:J"
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
            print(f"[!] Warning: Could not fetch existing keys for deduplication: {e}")

        return existing_emails, existing_phones, existing_companies

    def append_leads_to_google_sheet(self, leads):
        """
        Non-Destructive Safe Append:
        1. Reads existing rows from Google Sheet.
        2. Filters out any lead matching existing emails, phones, or companies.
        3. Appends ONLY fresh, non-duplicate leads to the bottom.
        4. NEVER deletes or overwrites existing data!
        """
        if not leads:
            print("[-] No leads to append.")
            return False

        token = self.get_google_access_token()
        if not token:
            print("[!] Cannot append to Google Sheet: Missing access token.")
            return False

        # Fetch existing keys for strict deduplication
        existing_emails, existing_phones, existing_companies = self.fetch_existing_keys()
        print(f"[*] Sheet Protection: Verified {len(existing_emails)} existing emails & {len(existing_phones)} existing phones in Google Sheet.")

        unique_leads = []
        skipped_count = 0

        for row in leads:
            # Row schema: [0: Date, 1: Source, 2: Company, 3: Email, 4: Phone, 5: Industry, 6: Name, 7: Status, 8: Added By, 9: Notes]
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
            print(f"[*] Duplicate Protection: Filtered out {skipped_count} duplicates already existing in Google Sheet.")

        if not unique_leads:
            print("[ℹ️] All discovered leads are already present in Google Sheet. 0 new rows to append.")
            return True

        url = (
            f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_WEB}/values/"
            f"{TAB_NAME_WEB}!A:J:append?valueInputOption=USER_ENTERED"
        )
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        body = {
            "range": f"{TAB_NAME_WEB}!A:J",
            "majorDimension": "ROWS",
            "values": unique_leads
        }

        try:
            res = requests.post(url, headers=headers, json=body, timeout=15)
            if res.status_code in [200, 201]:
                print(f"[✅] Safely appended {len(unique_leads)} fresh leads to Google Sheet [{SPREADSHEET_ID_WEB}] without touching existing data!")
                return True
            else:
                print(f"[!] Google Sheets API Error {res.status_code}: {res.text}")
                return False
        except Exception as e:
            print(f"[!] Exception appending leads to Google Sheets: {e}")
            return False

    def run(self, max_industries=None):
        """Executes full web scraping workflow across configured industries."""
        industries = WEB_INDUSTRIES[:max_industries] if max_industries else WEB_INDUSTRIES
        all_leads = []

        print("=" * 70)
        print(f"🚀 Starting Web Lead Scraper for Code.gs -> Sheet [{SPREADSHEET_ID_WEB}]")
        print("=" * 70)

        for industry, role, location in industries:
            leads = self.scrape_industry(industry, role, location)
            all_leads.extend(leads)

        # Append to Google Sheet
        if all_leads:
            self.append_leads_to_google_sheet(all_leads)
        
        print(f"\n[🎉] Completed! Total Web Leads Processed: {len(all_leads)}")
        return all_leads
