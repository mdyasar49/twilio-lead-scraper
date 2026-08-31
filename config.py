"""
=============================================================================
INFOGENX LEAD SCRAPER & ENRICHMENT SUITE - CONFIGURATION
=============================================================================
Central configuration module for Web & Social Lead Scrapers.
Provides credentials, Google Sheets targets, search parameters,
phone/email validators, and industry mappings for Code.gs and SocialScraper.gs.
=============================================================================
"""

import os
import re
from dotenv import load_dotenv

# Load .env file if present
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ---------------------------------------------------------------------------
# Credentials & Service Accounts
# ---------------------------------------------------------------------------
SERVICE_ACCOUNT_FILE = os.environ.get(
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    os.path.join(BASE_DIR, "sheet-sync-504707-85df40232946.json")
)

SELF_CLIENT_FILE = os.environ.get(
    "ZOHO_SELF_CLIENT_FILE",
    os.path.join(BASE_DIR, "self_client.json")
)

# ---------------------------------------------------------------------------
# Google Sheets Targets (Matching Code.gs and SocialScraper.gs)
# ---------------------------------------------------------------------------
# Web / Google Search Leads Sheet (Handled by Code.gs)
SPREADSHEET_ID_WEB = os.environ.get(
    "WEB_SPREADSHEET_ID",
    "1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw"
)
TAB_NAME_WEB = os.environ.get("WEB_TAB_NAME", "Leads")
SETTINGS_TAB_WEB = "Search Settings"

# Social Media Leads Sheet (Handled by SocialScraper.gs)
SPREADSHEET_ID_SOCIAL = os.environ.get(
    "SOCIAL_SPREADSHEET_ID",
    "1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw"
)
TAB_NAME_SOCIAL = os.environ.get("SOCIAL_TAB_NAME", "Social Leads")
SETTINGS_TAB_SOCIAL = "Social Settings"

# Common Headers used by both Code.gs and SocialScraper.gs
SHEET_HEADERS = [
    "Date",
    "Lead Source",
    "Company",
    "Email",
    "Phone Number / Mobile Number",
    "Industry",
    "Customer Name",
    "Status",
    "Lead Added By",
    "Notes"
]

# ---------------------------------------------------------------------------
# Search & AI API Keys
# ---------------------------------------------------------------------------
SERPER_API_KEYS = [
    key.strip()
    for key in os.environ.get(
        "SERPER_API_KEYS",
        ""
    ).split(",")
    if key.strip()
]

GEMINI_API_KEYS = [
    key.strip()
    for key in os.environ.get(
        "GEMINI_API_KEYS",
        ""
    ).split(",")
    if key.strip()
]

# ---------------------------------------------------------------------------
# Default Scraper Settings
# ---------------------------------------------------------------------------
DEFAULT_LOCATION = "Australia"
TARGET_LOCATIONS = ["Australia", "Brisbane", "Sydney", "Melbourne", "Perth", "Adelaide"]
LEADS_PER_QUERY = int(os.environ.get("LEADS_PER_QUERY", 30))
LEAD_ADDED_BY_WEB = "Automated Web Scraper"
LEAD_ADDED_BY_SOCIAL = "Automated Social Scraper"

# ---------------------------------------------------------------------------
# Web Industries & Roles
# ---------------------------------------------------------------------------
WEB_INDUSTRIES = [
    ("IT / Software", "Software Developer", "Australia"),
    ("Healthcare", "Hospital Administrator", "Australia"),
    ("Real Estate", "Property Manager", "Australia"),
    ("Consulting", "Managing Director", "Australia"),
    ("Education", "Principal", "Australia"),
    ("Retail / E-commerce", "Managing Director", "Australia"),
    ("Manufacturing", "Plant Manager", "Australia"),
    ("Accounting Firms", "Partner", "Australia"),
    ("Professional Services", "Managing Partner", "Australia"),
    ("Wholesale & Distribution", "Operations Manager", "Australia"),
    ("ICT", "Director of IT", "Australia"),
    ("ITES / BPO", "Operations Head", "Australia")
]

# ---------------------------------------------------------------------------
# Social Platforms, Triggers & Search Queries
# ---------------------------------------------------------------------------
SOCIAL_PLATFORMS = [
    ("LinkedIn", "Founder", "Australia", "IT / Software"),
    ("LinkedIn", "Managing Director", "Australia", "Real Estate"),
    ("LinkedIn", "CEO", "Australia", "Healthcare"),
    ("LinkedIn", "Director", "Australia", "Consulting"),
    ("LinkedIn", "Business Owner", "Australia", "Professional Services"),
    ("LinkedIn", "we are launching", "Australia", "IT / Software"),
    ("Facebook", "grand opening", "Australia", "Healthcare"),
    ("Instagram", "Founder", "Australia", "Retail / E-commerce"),
    ("X (Twitter)", "launching", "Australia", "IT / Software"),
    ("Reddit", "launching soon", "Australia", "Retail / E-commerce")
]

SOCIAL_LAUNCH_KEYWORDS = [
    "coming soon",
    "launching soon",
    "opening soon",
    "new launch",
    "pre-launch",
    "website launching",
    "getting ready to launch",
    "grand opening",
    "pre-register now",
    "beta launch",
    "early access",
    "launching this month",
    "we are launching"
]

# ---------------------------------------------------------------------------
# Junk Domains Blacklist (Prevents Junk Search Artifacts)
# ---------------------------------------------------------------------------
JUNK_DOMAINS = {
    "eufy.com", "cars.com", "autotrader.com", "toyota.com", "backstage.com",
    "allmovie.com", "classmates.com", "themoviedb.org", "flickchart.com",
    "mohurd.gov.cn", "sluurpy.it", "restaurantguru.it", "ristorantelascala.it",
    "tripadvisor.it", "thefork.it", "travelpander.com", "moneyinc.com",
    "tickingwithpurpose.com", "travelsafe-abroad.com", "southhillenterprise.com",
    "homesnacks.com", "mebaneenterprise.com", "tinhte.vn", "farmatodo.com",
    "farmatodo.com.co", "farmatodo.com.ve", "drogueriascolombia.com", "telefono10.com.co",
    "101-help.com", "wclock.com", "vclock.com", "theclocktime.com", "wasteremovalusa.com",
    "topdogtips.com", "puppytoob.com", "petandlife.com", "dogguidereviews.com", "petguide.com",
    "animalwised.com", "thesprucepets.com", "barklikemeow.com", "yellowpages.com.au",
    "truelocal.com.au", "womo.com.au", "hotfrog.com.au", "yelp.com.au", "whitepages.com.au"
}

# ---------------------------------------------------------------------------
# Regex Validators for Phone & Email
# ---------------------------------------------------------------------------
EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
)

# Australian Phone Patterns
AU_PHONE_PATTERNS = [
    re.compile(r"\(?0[2378]\)?[\s.-]?\d{4}[\s.-]?\d{4}"),
    re.compile(r"\+?61[\s.-]?\(?0?[2378]\)?[\s.-]?\d{4}[\s.-]?\d{4}"),
    re.compile(r"\+?61[\s.-]?4\d{2}[\s.-]?\d{3}[\s.-]?\d{3}"),
    re.compile(r"04\d{2}[\s.-]?\d{3}[\s.-]?\d{3}"),
    re.compile(r"1[38]00[\s.-]?\d{3}[\s.-]?\d{3}")
]

# Generic International Phone Pattern
INTL_PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"
)
