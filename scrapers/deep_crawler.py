"""
=============================================================================
DEEP CONTACT CRAWLER
=============================================================================
Crawls website URLs and landing pages to extract:
- Verified corporate business emails
- Australian / International phone numbers
- Decision maker names and company titles
- Sub-pages: /contact, /about, /team
=============================================================================
"""

import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

try:
    from ..config import JUNK_DOMAINS, EMAIL_REGEX, AU_PHONE_PATTERNS, INTL_PHONE_PATTERN
except ImportError:
    import sys
    import os
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from config import JUNK_DOMAINS, EMAIL_REGEX, AU_PHONE_PATTERNS, INTL_PHONE_PATTERN

try:
    from .lead_validator import LeadValidator
except ImportError:
    from scrapers.lead_validator import LeadValidator


class DeepContactCrawler:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en-US;q=0.9,en;q=0.8"
        }
        self.validator = LeadValidator()

    def is_valid_domain(self, url):
        """Filters out major search engines, junk domains, and file downloads."""
        if not url or not url.startswith("http"):
            return False
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        if not domain or domain in JUNK_DOMAINS:
            return False
        if any(url.lower().endswith(ext) for ext in [".pdf", ".png", ".jpg", ".zip", ".mp4", ".docx", ".xlsx"]):
            return False
        return True

    def extract_emails(self, text, html=""):
        """Extract valid email addresses from text and html."""
        emails = set()
        
        # 1. From mailto: links
        if html:
            mailto_matches = re.findall(r'href=[\'"]mailto:([^\s?\'"]+)', html, re.IGNORECASE)
            for m in mailto_matches:
                clean_email = self.validator.validate_and_clean_email(m)
                if clean_email:
                    emails.add(clean_email)
                    
        # 2. From plain text
        for match in EMAIL_REGEX.findall(text):
            clean_email = self.validator.validate_and_clean_email(match)
            if clean_email:
                emails.add(clean_email)
                    
        return list(emails)

    def extract_phones(self, text, html=""):
        """Extract Australian and International phone numbers."""
        phones = set()

        # 1. From tel: links
        if html:
            tel_matches = re.findall(r'href=[\'"]tel:([^\s?\'"]+)', html, re.IGNORECASE)
            for t in tel_matches:
                clean_p, _ = self.validator.validate_and_clean_phone(t)
                if clean_p:
                    phones.add(clean_p)

        # 2. Australian patterns
        for pattern in AU_PHONE_PATTERNS:
            for match in pattern.findall(text):
                clean_p, _ = self.validator.validate_and_clean_phone(match)
                if clean_p:
                    phones.add(clean_p)

        # 3. International fallback if no AU phones
        if not phones:
            for match in INTL_PHONE_PATTERN.findall(text):
                clean_p, _ = self.validator.validate_and_clean_phone(match)
                if clean_p:
                    phones.add(clean_p)

        return list(phones)

    def crawl_url(self, target_url):
        """
        Crawls the landing page and searches for contact info.
        Uses connect and read timeouts (2, 3) to prevent hanging.
        """
        if not target_url or not self.is_valid_domain(target_url):
            return {"emails": [], "phones": [], "company_name": "", "contact_name": ""}

        results = {
            "emails": [],
            "phones": [],
            "company_name": "",
            "contact_name": ""
        }

        try:
            resp = requests.get(target_url, headers=self.headers, timeout=(2, 3), allow_redirects=True)
            if resp.status_code == 200:
                html = resp.text[:150000] # Limit parsing to first 150KB for speed
                soup = BeautifulSoup(html, "html.parser")
                text = soup.get_text(" ", strip=True)

                # Extract emails and phones from landing page
                results["emails"].extend(self.extract_emails(text, html))
                results["phones"].extend(self.extract_phones(text, html))

                # Extract company name from title / meta
                if soup.title and soup.title.string:
                    raw_title = soup.title.string.strip()
                    company = re.split(r"[-|–—•:]", raw_title)[0].strip()
                    if company and len(company) < 50:
                        results["company_name"] = company

                # If no emails or phones found, look for at most 1 /contact or /about subpage
                if not results["emails"] or not results["phones"]:
                    for a_tag in soup.find_all("a", href=True):
                        href = a_tag["href"].lower()
                        if any(keyword in href for keyword in ["contact", "about"]):
                            full_url = urljoin(target_url, a_tag["href"])
                            if self.is_valid_domain(full_url) and full_url != target_url:
                                try:
                                    sub_resp = requests.get(full_url, headers=self.headers, timeout=(2, 2))
                                    if sub_resp.status_code == 200:
                                        sub_html = sub_resp.text[:150000]
                                        sub_soup = BeautifulSoup(sub_html, "html.parser")
                                        sub_text = sub_soup.get_text(" ", strip=True)
                                        results["emails"].extend(self.extract_emails(sub_text, sub_html))
                                        results["phones"].extend(self.extract_phones(sub_text, sub_html))
                                        break
                                except Exception:
                                    pass
        except Exception:
            pass

        # Deduplicate results
        results["emails"] = list(dict.fromkeys(results["emails"]))
        results["phones"] = list(dict.fromkeys(results["phones"]))

        return results
