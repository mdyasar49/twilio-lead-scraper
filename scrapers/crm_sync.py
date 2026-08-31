"""
=============================================================================
ZOHO CRM & TWILIO DIALER AUTO-SYNC ENGINE
=============================================================================
Reads unsynced leads from Google Sheets (Web Leads & Social Leads),
pushes them into Zoho CRM via OAuth API, and marks them as synced in Google Sheets.
=============================================================================
"""

import os
import sys
import json
import time
import datetime
import requests
import jwt

try:
    from ..config import (
        SERVICE_ACCOUNT_FILE,
        SELF_CLIENT_FILE,
        SPREADSHEET_ID_WEB,
        TAB_NAME_WEB,
        SPREADSHEET_ID_SOCIAL,
        TAB_NAME_SOCIAL
    )
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from config import (
        SERVICE_ACCOUNT_FILE,
        SELF_CLIENT_FILE,
        SPREADSHEET_ID_WEB,
        TAB_NAME_WEB,
        SPREADSHEET_ID_SOCIAL,
        TAB_NAME_SOCIAL
    )


class CrmSyncEngine:
    def __init__(self):
        self.google_access_token = None
        self.google_token_expiry = 0
        self.zoho_access_token = None
        self.zoho_token_expiry = 0

    def get_google_access_token(self):
        """Generates Google OAuth2 Access Token."""
        now = int(time.time())
        if self.google_access_token and now < self.google_token_expiry - 60:
            return self.google_access_token

        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            print(f"[!] Service account not found at {SERVICE_ACCOUNT_FILE}")
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
                self.google_token_expiry = now + data.get("expires_in", 3600)
                return self.google_access_token
        except Exception as e:
            print(f"[!] Google Auth Exception: {e}")
        return None

    def get_zoho_token(self):
        """Fetches fresh Zoho CRM access token using refresh token in self_client.json."""
        now = int(time.time())
        if self.zoho_access_token and now < self.zoho_token_expiry - 60:
            return self.zoho_access_token

        if not os.path.exists(SELF_CLIENT_FILE):
            print(f"[!] Zoho self client credentials not found at {SELF_CLIENT_FILE}")
            return None

        try:
            with open(SELF_CLIENT_FILE, "r") as f:
                creds = json.load(f)

            url = "https://accounts.zoho.in/oauth/v2/token"
            params = {
                "refresh_token": creds["refresh_token"],
                "client_id": creds["client_id"],
                "client_secret": creds["client_secret"],
                "grant_type": "refresh_token"
            }

            res = requests.post(url, params=params, timeout=15)
            if res.status_code == 200:
                data = res.json()
                if "access_token" in data:
                    self.zoho_access_token = data["access_token"]
                    self.zoho_token_expiry = now + data.get("expires_in", 3600)
                    return self.zoho_access_token
                else:
                    print(f"[!] Zoho Token Refresh Error: {data}")
            else:
                print(f"[!] Zoho Request Failed {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[!] Zoho Token Exception: {e}")
        return None

    def fetch_sheet_rows(self, spreadsheet_id, tab_name):
        """Fetches all rows from a Google Sheet tab."""
        token = self.get_google_access_token()
        if not token:
            return []

        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{tab_name}!A:K"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            res = requests.get(url, headers=headers, timeout=15)
            if res.status_code == 200:
                data = res.json()
                return data.get("values", [])
        except Exception as e:
            print(f"[!] Error fetching sheet {spreadsheet_id}: {e}")
        return []

    def sync_leads_to_zoho(self, leads_data):
        """Pushes a batch of leads to Zoho CRM."""
        zoho_token = self.get_zoho_token()
        if not zoho_token:
            print("[!] Cannot sync to Zoho: Missing token.")
            return []

        url = "https://www.zohoapis.in/crm/v2/Leads"
        headers = {
            "Authorization": f"Zoho-oauthtoken {zoho_token}",
            "Content-Type": "application/json"
        }

        records = []
        for item in leads_data:
            records.append({
                "Company": item.get("company") or "Business Owner",
                "Last_Name": item.get("name") or "Contact",
                "Email": item.get("email", ""),
                "Phone": item.get("phone", ""),
                "Lead_Source": item.get("source", "Lead Scraper Suite"),
                "Industry": item.get("industry", "IT / Software"),
                "Description": item.get("notes", "Scraped via Twilio Lead Scraper")
            })

        if not records:
            return []

        try:
            res = requests.post(url, headers=headers, json={"data": records}, timeout=20)
            if res.status_code in [200, 201]:
                data = res.json()
                print(f"[✅] Zoho CRM Sync Response: {len(data.get('data', []))} records pushed.")
                return data.get("data", [])
            else:
                print(f"[!] Zoho Push Error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[!] Zoho Sync Exception: {e}")
        return []

    def sync_sheet(self, spreadsheet_id, tab_name):
        """Syncs all un-synced leads in a given Google Sheet to Zoho CRM."""
        print(f"[*] Checking un-synced leads in Sheet [{spreadsheet_id}] Tab [{tab_name}]...")
        rows = self.fetch_sheet_rows(spreadsheet_id, tab_name)
        if not rows or len(rows) <= 1:
            print("[-] No rows found.")
            return

        headers = rows[0]
        leads_to_sync = []
        row_indices = []

        # Columns: [0: Date, 1: Lead Source, 2: Company, 3: Email, 4: Phone, 5: Industry, 6: Customer Name, 7: Status, 8: Added By, 9: Notes, 10: Sync Status]
        for idx, row in enumerate(rows[1:], start=2):
            email = row[3] if len(row) > 3 else ""
            phone = row[4] if len(row) > 4 else ""
            sync_col = row[10] if len(row) > 10 else ""

            if (email or phone) and not sync_col.startswith("✅"):
                leads_to_sync.append({
                    "company": row[2] if len(row) > 2 else "",
                    "source": row[1] if len(row) > 1 else "Scraper",
                    "email": email,
                    "phone": phone,
                    "industry": row[5] if len(row) > 5 else "IT / Software",
                    "name": row[6] if len(row) > 6 else "Business Owner",
                    "notes": row[9] if len(row) > 9 else ""
                })
                row_indices.append(idx)

        print(f"[+] Found {len(leads_to_sync)} leads ready for Zoho CRM sync.")
        if leads_to_sync:
            # Batch sync to Zoho
            self.sync_leads_to_zoho(leads_to_sync)

            # Mark rows as Synced in Google Sheets
            token = self.get_google_access_token()
            if token:
                today_str = datetime.date.today().strftime("%d/%m/%Y")
                batch_updates = []
                for row_idx in row_indices:
                    batch_updates.append({
                        "range": f"{tab_name}!K{row_idx}",
                        "values": [[f"✅ Synced {today_str}"]]
                    })

                update_url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values:batchUpdate"
                requests.post(
                    update_url,
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "valueInputOption": "USER_ENTERED",
                        "data": batch_updates
                    },
                    timeout=15
                )
                print(f"[✅] Marked {len(row_indices)} rows as Synced in Sheet [{tab_name}].")

    def run_all(self):
        """Runs sync for both Web Leads and Social Leads sheets."""
        print("=" * 70)
        print("🔄 Running Zoho CRM & Google Sheets Sync...")
        print("=" * 70)
        self.sync_sheet(SPREADSHEET_ID_WEB, TAB_NAME_WEB)
        self.sync_sheet(SPREADSHEET_ID_SOCIAL, TAB_NAME_SOCIAL)
        print("[🎉] CRM Sync Completed!")
