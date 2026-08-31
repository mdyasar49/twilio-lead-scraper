import os
import sys
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sa_file = 'd:/infonix/sheet-sync-504707-85df40232946.json'
scopes = ['https://www.googleapis.com/auth/spreadsheets']

creds = service_account.Credentials.from_service_account_file(sa_file, scopes=scopes)
sheets_service = build('sheets', 'v4', credentials=creds)

sheets_to_check = [
    ("Web Leads Sheet", "1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw"),
    ("Social Leads Sheet", "1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw"),
    ("Multi-Tab Scraper Sheet", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM"),
    ("Odoo ERP Leads Sheet", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4"),
    ("Zoho Ecosystem Leads Sheet", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE"),
]

print("================================================================================")
print("📊 DETAILED GOOGLE SHEETS METADATA & ROW COUNTS")
print("================================================================================")

for label, sid in sheets_to_check:
    print(f"\n📌 [{label}]")
    print(f"  - Sheet ID   : {sid}")
    print(f"  - Direct Link: https://docs.google.com/spreadsheets/d/{sid}/edit")
    try:
        meta = sheets_service.spreadsheets().get(spreadsheetId=sid).execute()
        title = meta.get("properties", {}).get("title", "Untitled")
        sheets_list = meta.get("sheets", [])
        print(f"  - Document Title: '{title}'")
        print(f"  - Status        : 🟢 ACTIVE & ACCESSIBLE (NOT Deleted!)")
        print(f"  - Total Tabs    : {len(sheets_list)}")
        for s in sheets_list:
            t_name = s["properties"]["title"]
            g_id = s["properties"]["sheetId"]
            r_count = s["properties"]["gridProperties"]["rowCount"]
            c_count = s["properties"]["gridProperties"]["columnCount"]
            print(f"    * Tab: '{t_name}' (gid: {g_id}) -> {r_count} rows, {c_count} cols")
    except Exception as e:
        print(f"  - Status Error  : {e}")

print("\n" + "="*80)
print("🔑 SERVICE ACCOUNT DETAILS:")
print(f"  - Service Account Email : sheet-sync@sheet-sync-504707.iam.gserviceaccount.com")
print(f"  - Google Cloud Project  : sheet-sync-504707")
print("="*80)
