# 🚀 Twilio Lead Scraper & Google Apps Script Suite

> **Description**: Automated Multi-Engine B2B Lead Scraping, Contact Extraction, Social Intelligence, and Google Sheets / Zoho CRM Auto-Sync Suite for **`Code.gs`** and **`SocialScraper.gs`**.

---

## 📌 Architecture Overview

This suite connects high-performance local/server Python scraping engines directly with Google Apps Script pipelines:

```
                               ┌────────────────────────────────────────┐
                               │       Multi-Engine Python Scraper      │
                               │  (DuckDuckGo, Serper, Gemini, OSM)     │
                               └──────────────────┬─────────────────────┘
                                                  │ (Service Account JWT)
                         ┌────────────────────────┴────────────────────────┐
                         ▼                                                 ▼
        ┌──────────────────────────────────┐             ┌──────────────────────────────────┐
        │        Google Search Leads       │             │        Social Media Leads        │
        │       Google Sheet Tab: Leads    │             │    Google Sheet Tab: Social Leads│
        │         (Handled by Code.gs)     │             │    (Handled by SocialScraper.gs) │
        └────────────────┬─────────────────┘             └────────────────┬─────────────────┘
                         │                                                 │
                         └────────────────────────┬────────────────────────┘
                                                  ▼
                               ┌────────────────────────────────────┐
                               │          Zoho CRM & Dialer         │
                               │       Auto-Sync Engine & DB        │
                               └────────────────────────────────────┘
```

---

## 📂 Project Directory Structure

```
twilio-lead-scraper/
├── apps-script/
│   ├── Code.gs                   # Google Search / B2B Web Scraper Apps Script
│   ├── SocialScraper.gs          # Social Media Scraper Apps Script (LinkedIn, Insta, FB, X)
│   ├── GeminiService.gs          # Gemini AI Lead Scoring & Entity Extraction
│   └── BrisbaneCrmPipeline.gs    # Regional AU CRM Pipeline & Normalization
├── scrapers/
│   ├── __init__.py               # Package initialization
│   ├── deep_crawler.py           # Website crawler (extracts mailto:, AU phones, names)
│   ├── web_lead_scraper.py       # Web Scraper (matching Code.gs sheet schema)
│   ├── social_scraper.py         # Social Scraper (matching SocialScraper.gs sheet schema)
│   ├── web_social_scraper.py     # Unified concurrent multi-engine live scraper
│   └── crm_sync.py               # Zoho CRM & Sheets sync engine
├── data/
│   └── scraped_leads.csv         # Cached scraped leads output
├── config.py                     # Centralized configurations and regex rules
├── main.py                       # CLI Runner entrypoint
├── requirements.txt              # Python dependencies
├── .env                          # Active environment variables
├── .env.example                  # Environment template
├── sheet-sync-504707-*.json      # Google Cloud Service Account credentials
└── self_client.json              # Zoho CRM Self-Client OAuth credentials
```

---

## ⚙️ Target Google Sheets Setup

| Type | Target Sheet ID | Tab Name | Apps Script File |
| :--- | :--- | :--- | :--- |
| **Web & Google Leads** | `1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw` | `Leads` | `apps-script/Code.gs` |
| **Social Media Leads** | `1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw` | `Social Leads` | `apps-script/SocialScraper.gs` |

### Column Layout (Exact match for both scripts):
1. **A - Date**: `dd/mm/yyyy`
2. **B - Lead Source**: `Google Search`, `LinkedIn`, `Instagram`, `Facebook`, etc.
3. **C - Company**: Target Company or Business Name
4. **D - Email**: Verified Business Email
5. **E - Phone Number / Mobile Number**: Formatted Australian (`+61...`) or International Phone
6. **F - Industry**: Target Industry (e.g. `IT / Software`, `Healthcare`, `Real Estate`)
7. **G - Customer Name**: Founder / Contact Person Name
8. **H - Status**: `New`, `Contacted`, `Follow-up`, `Interested`
9. **I - Lead Added By**: `Automated Web Scraper` / `Automated Social Scraper`
10. **J - Notes**: Website URL, trigger keyword, or search dork details
11. **K - CRM Sync Status**: Marked as `✅ Synced [Date]` upon Zoho CRM ingestion

---

## 🚀 Quick Start Guide (தமிழ் & English)

### 1. Install Dependencies
```powershell
cd d:\infonix\twilio-lead-scraper
pip install -r requirements.txt
```

### 2. Run Web Scraper (Feeds `Code.gs` Sheet)
```powershell
python main.py --mode web
```

### 3. Run Social Media Scraper (Feeds `SocialScraper.gs` Sheet)
```powershell
python main.py --mode social
```

### 4. Run Both Web & Social Scrapers Concurrently
```powershell
python main.py --mode all
```

### 5. Sync Fresh Leads to Zoho CRM
```powershell
python main.py --mode sync-crm
```

### 6. Run Continuously in Daemon Mode (Every 60 Minutes)
```powershell
python main.py --mode daemon --interval 60
```

---

## 📋 Google Apps Script Deployment

If you want to run scraping or menu controls directly inside Google Sheets:
1. Open your target Google Sheet.
2. Click **Extensions** > **Apps Script**.
3. Copy the contents of the files in `apps-script/`:
   - `Code.gs`
   - `SocialScraper.gs`
   - `GeminiService.gs`
   - `BrisbaneCrmPipeline.gs`
4. Under **Project Settings** > **Script Properties**, add:
   - `GEMINI_API_KEY`: Your Gemini API Key
   - `SERPER_API_KEY`: Your Serper.dev API Key
5. Save and reload the Google Sheet to see the custom **Infogenx Lead Suite** menu.

---

## 💡 Why use Python Scrapers alongside Apps Script?
Google Apps Script has a strict quota limit on `UrlFetchApp` (20,000 calls/day and max 6 minutes execution time per trigger). The Python scraper runs on your local machine or server without any quota limit, extracts high volumes of verified leads via Free Search Engines & APIs, and appends them directly into Google Sheets using Google Service Account JWT!
