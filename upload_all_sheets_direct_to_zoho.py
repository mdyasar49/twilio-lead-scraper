import os
import sys
import json
import time
import requests
import csv
import io

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

print("================================================================================")
print("🚀 DIRECT ZOHO CRM API LEAD UPLOADER - 100% ROBUST CSV READER")
print("================================================================================")

# 1. Zoho CRM OAuth Authentication
self_client_path = 'd:/infonix/infogenx-twilio-dialer/self_client.json'
with open(self_client_path) as f:
    creds = json.load(f)

token_url = 'https://accounts.zoho.in/oauth/v2/token'
params = {
    'refresh_token': creds['refresh_token'],
    'client_id': creds['client_id'],
    'client_secret': creds['client_secret'],
    'grant_type': 'refresh_token'
}

r = requests.post(token_url, params=params)
token_data = r.json()
if 'access_token' not in token_data:
    print('❌ Failed to get Zoho CRM access token:', token_data)
    sys.exit(1)

access_token = token_data['access_token']
crm_headers = {
    'Authorization': f'Zoho-oauthtoken {access_token}',
    'Content-Type': 'application/json'
}

print("✅ [Zoho CRM] OAuth Authentication Successful!")

total_processed = 0
total_imported = 0
total_skipped = 0
total_invalid = 0

# Helper function to upload batches of leads to Zoho CRM via API
def upload_batch(batch, tab_name):
    global total_imported, total_skipped
    if not batch:
        return
    payload = {"data": batch, "duplicate_check_fields": ["Email"]}
    res = requests.post('https://www.zohoapis.in/crm/v2/Leads/upsert', json=payload, headers=crm_headers)
    if res.status_code in [200, 201, 202]:
        res_data = res.json().get('data', [])
        success_count = 0
        dup_count = 0
        for item in res_data:
            if item.get('status') == 'success':
                success_count += 1
                total_imported += 1
            else:
                dup_count += 1
                total_skipped += 1
        print(f"  📤 [{tab_name}] Batch Upload Result: {success_count} Inserted/Updated | {dup_count} Duplicate Skipped")
    else:
        print(f"  ❌ [{tab_name}] Batch upload error ({res.status_code}): {res.text[:200]}")

# Master Target Configuration (All 5 Spreadsheets, All 21 Tabs)
targets = [
    # (Tab Name, Sheet ID, GID, Schema Type)
    ("Web Leads", "1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw", "1144923842", "STANDARD_10"),
    ("Social Leads", "1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw", "1029677902", "STANDARD_10"),
    ("Multi-Facebook", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "0", "EXTENDED_28"),
    ("Multi-Freelancer", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "835700405", "EXTENDED_28"),
    ("Multi-Upwork", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "597011379", "EXTENDED_28"),
    ("Multi-LinkedIn", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "93563620", "EXTENDED_28"),
    ("Multi-Instagram", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "1348388489", "EXTENDED_28"),
    ("Multi-Threads", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "511648997", "EXTENDED_28"),
    ("Multi-YellowPages", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "91912505", "EXTENDED_28"),
    ("Multi-ABR", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "455374992", "EXTENDED_28"),
    ("Multi-Yelp", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "1616379665", "EXTENDED_28"),
    ("Multi-Bing", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "2070637993", "EXTENDED_28"),
    ("Multi-Expert360", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "621089222", "EXTENDED_28"),
    ("Multi-99acres", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "596969109", "EXTENDED_28"),
    ("Multi-Odoo", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "1197306578", "EXTENDED_28"),
    ("Odoo Master", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4", "1537325223", "ODOO_ZOHO_21"),
    ("Odoo Australia", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4", "401758669", "ODOO_ZOHO_21"),
    ("Odoo India", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4", "771759972", "ODOO_ZOHO_21"),
    ("Zoho Master", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE", "1736864648", "ODOO_ZOHO_21"),
    ("Zoho Australia", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE", "1675502893", "ODOO_ZOHO_21"),
    ("Zoho India", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE", "1375363359", "ODOO_ZOHO_21"),
]

for tab_name, sheet_id, gid, stype in targets:
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    try:
        r = requests.get(url, timeout=15)
        if r.status_code != 200:
            print(f"⚠️ [{tab_name}] Failed to fetch CSV (HTTP {r.status_code})")
            continue
            
        reader = csv.reader(io.StringIO(r.text))
        rows = list(reader)
        if len(rows) <= 1:
            print(f"ℹ️ [{tab_name}] Header only (0 data rows).")
            continue

        print(f"\n📦 Processing [{tab_name}] - {len(rows)-1} rows...")
        batch = []
        
        for cols in rows[1:]:
            if len(cols) < 5:
                continue

            total_processed += 1
            scrap_date = ""
            lead_source = "Scraper Suite"
            company = ""
            name = ""
            email = ""
            phone = ""
            mobile = ""
            industry = "IT / Software"
            notes = ""

            if stype == "STANDARD_10":
                scrap_date = cols[0].strip() if len(cols) > 0 else ""
                lead_source = cols[1].strip() if len(cols) > 1 else "Google Search"
                company = cols[2].strip() if len(cols) > 2 else ""
                email = cols[3].strip().lower() if len(cols) > 3 else ""
                phone = cols[4].strip() if len(cols) > 4 else ""
                industry = cols[5].strip() if len(cols) > 5 else "IT / Software"
                name = cols[6].strip() if len(cols) > 6 else ""
                notes = cols[9].strip() if len(cols) > 9 else ""
            elif stype == "EXTENDED_28":
                scrap_date = cols[0].strip() if len(cols) > 0 else ""
                lead_source = cols[1].strip() if len(cols) > 1 else "Multi-Tab Scraper"
                company = cols[2].strip() if len(cols) > 2 else ""
                name = cols[7].strip() if len(cols) > 7 else ""
                if not name and len(cols) > 6:
                    name = f"{cols[5].strip()} {cols[6].strip()}".strip()
                email = cols[9].strip().lower() if len(cols) > 9 else ""
                phone = cols[10].strip() if len(cols) > 10 else ""
                mobile = cols[11].strip() if len(cols) > 11 else ""
                industry = cols[12].strip() if len(cols) > 12 else "IT / Software"
                notes = cols[22].strip() if len(cols) > 22 else ""
            elif stype == "ODOO_ZOHO_21":
                scrap_date = cols[0].strip() if len(cols) > 0 else ""
                company = cols[1].strip() if len(cols) > 1 else ""
                name = cols[3].strip() if len(cols) > 3 else ""
                email = cols[5].strip().lower() if len(cols) > 5 else ""
                phone = cols[6].strip() if len(cols) > 6 else ""
                industry = cols[13].strip() if len(cols) > 13 else "Enterprise Software"
                lead_source = "Odoo ERP Lead Generator" if "1iIcE" in sheet_id else "Zoho Ecosystem Lead Generator"
                notes = f"{cols[15].strip()} | {cols[19].strip()}" if len(cols) > 19 else ""

            # MANDATORY: Require Email AND (Phone or Mobile)
            if not email or '@' not in email or 'example.com' in email or email.endswith('.png') or email.endswith('.jpg'):
                total_invalid += 1
                continue
                
            clean_p = "".join([c for c in phone if c.isdigit() or c == '+'])
            clean_m = "".join([c for c in mobile if c.isdigit() or c == '+'])
            
            if not clean_p and not clean_m:
                total_invalid += 1
                continue

            last_name = name if name else "Executive"
            clean_company = company if company else "Australian Enterprise"
            
            lead_map = {
                "Last_Name": last_name,
                "Company": clean_company,
                "Email": email,
                "Industry": industry if industry else "IT / Software",
                "Lead_Source": lead_source,
                "Description": f"Direct API Import | Scraped: {scrap_date} | Notes: {notes}"
            }
            if clean_p:
                lead_map["Phone"] = clean_p
            if clean_m:
                lead_map["Mobile"] = clean_m

            batch.append(lead_map)

            if len(batch) >= 100:
                upload_batch(batch, tab_name)
                batch = []
                time.sleep(0.3)

        if batch:
            upload_batch(batch, tab_name)

    except Exception as e:
        print(f"❌ Error processing [{tab_name}]: {e}")

print("\n" + "="*80)
print(f"🎉 DIRECT ZOHO CRM API IMPORT COMPLETE!")
print(f"  - Total Rows Processed : {total_processed}")
print(f"  - New Fresh Uploaded   : {total_imported}")
print(f"  - Duplicates Skipped   : {total_skipped}")
print(f"  - Invalid (No Email/Ph): {total_invalid}")
print("="*80)
