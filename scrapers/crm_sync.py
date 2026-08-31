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


try:
    from .lead_validator import LeadValidator
except ImportError:
    from scrapers.lead_validator import LeadValidator


class CrmSyncEngine:
    def __init__(self):
        self.google_access_token = None
        self.google_token_expiry = 0
        self.zoho_access_token = None
        self.zoho_token_expiry = 0
        self.validator = LeadValidator()

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

    def sync_leads_to_zoho_batch(self, leads_data):
        """
        Pushes a chunk of up to 100 leads to Zoho CRM.
        Returns a list of status strings corresponding 1-to-1 with leads_data.
        """
        zoho_token = self.get_zoho_token()
        if not zoho_token:
            print("[!] Cannot sync to Zoho: Missing token.")
            return [None] * len(leads_data)

        url = "https://www.zohoapis.in/crm/v2/Leads"
        headers = {
            "Authorization": f"Zoho-oauthtoken {zoho_token}",
            "Content-Type": "application/json"
        }

        records = []
        for item in leads_data:
            rec = {
                "Company": (item.get("company") or "Business Owner")[:100],
                "Last_Name": (item.get("name") or "Contact")[:100],
                "Lead_Source": item.get("source", "Lead Scraper Suite")[:100],
                "Industry": item.get("industry", "IT / Software")[:100],
                "Description": (item.get("notes", "Scraped via Twilio Lead Scraper"))[:250]
            }
            if item.get("email"):
                rec["Email"] = item["email"][:100]
            if item.get("phone"):
                rec["Phone"] = item["phone"][:50]
            if item.get("mobile"):
                rec["Mobile"] = item["mobile"][:50]

            records.append(rec)

        if not records:
            return []

        results = []
        try:
            res = requests.post(url, headers=headers, json={"data": records}, timeout=25)
            if res.status_code in [200, 201, 202]:
                data = res.json()
                items = data.get("data", [])
                for i, d in enumerate(items):
                    status = d.get("status")
                    code = d.get("code")
                    if status == "success" or code == "SUCCESS":
                        lead_id = d.get("details", {}).get("id", "")
                        results.append(f"✅ Synced ({lead_id})")
                    elif code == "DUPLICATE_DATA":
                        results.append("✅ In CRM (Duplicate)")
                    else:
                        msg = d.get("message", "error")
                        results.append(f"❌ Error: {msg}")
                        
                successful = sum(1 for r in results if r and r.startswith("✅"))
                print(f"[✅] Zoho CRM Batch: {successful}/{len(records)} records successfully synced.")
                return results
            else:
                print(f"[!] Zoho Push Error {res.status_code}: {res.text}")
                return [f"❌ HTTP {res.status_code}"] * len(records)
        except Exception as e:
            print(f"[!] Zoho Sync Exception: {e}")
            return [f"❌ {str(e)}"] * len(records)

    def sync_sheet(self, spreadsheet_id, tab_name):
        """
        Syncs un-synced leads in chunks of 100 to Zoho CRM after strict contact verification.
        """
        print(f"[*] Checking un-synced leads in Sheet [{spreadsheet_id}] Tab [{tab_name}]...")
        rows = self.fetch_sheet_rows(spreadsheet_id, tab_name)
        if not rows or len(rows) <= 1:
            print("[-] No rows found.")
            return

        leads_to_sync = []
        row_indices = []
        invalid_rows = []

        # Columns: [0: Date, 1: Lead Source, 2: Company, 3: Email, 4: Phone, 5: Industry, 6: Customer Name, 7: Status, 8: Added By, 9: Notes, 10: Sync Status]
        for idx, row in enumerate(rows[1:], start=2):
            raw_email = row[3] if len(row) > 3 else ""
            raw_phone = row[4] if len(row) > 4 else ""
            sync_col = row[10] if len(row) > 10 else ""

            # Skip if already marked synced
            if sync_col.startswith("✅"):
                continue

            # Strict Contact Verification & Sanitization
            contact_info = self.validator.verify_lead(raw_email, raw_phone)

            if not contact_info["is_valid"]:
                if not sync_col.startswith("⚠️"):
                    invalid_rows.append(idx)
                continue

            company = row[2] if len(row) > 2 else ""
            if not company or len(company) < 2:
                company = "Enterprise Contact"

            leads_to_sync.append({
                "company": company,
                "source": row[1] if len(row) > 1 else "Scraper Suite",
                "email": contact_info["email"],
                "phone": contact_info["phone"],
                "mobile": contact_info["mobile"],
                "industry": row[5] if len(row) > 5 else "IT / Software",
                "name": row[6] if len(row) > 6 else "Business Owner",
                "notes": row[9] if len(row) > 9 else ""
            })
            row_indices.append(idx)

        print(f"[+] Found {len(leads_to_sync)} verified valid leads ready for Zoho CRM sync.")
        if invalid_rows:
            print(f"[*] Filtered {len(invalid_rows)} invalid/dummy rows lacking workable email/phone.")

        token = self.get_google_access_token()
        today_str = datetime.date.today().strftime("%d/%m/%Y")

        # Mark invalid rows in Sheet
        if invalid_rows and token:
            invalid_updates = [
                {"range": f"{tab_name}!K{r}", "values": [[f"⚠️ Invalid Contact {today_str}"]]}
                for r in invalid_rows[:50]
            ]
            try:
                requests.post(
                    f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values:batchUpdate",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"valueInputOption": "USER_ENTERED", "data": invalid_updates},
                    timeout=15
                )
            except Exception:
                pass

        if not leads_to_sync:
            return

        # Process in batches of 100
        batch_size = 100
        total_batches = (len(leads_to_sync) + batch_size - 1) // batch_size

        for b in range(total_batches):
            chunk = leads_to_sync[b * batch_size : (b + 1) * batch_size]
            chunk_indices = row_indices[b * batch_size : (b + 1) * batch_size]

            sync_results = self.sync_leads_to_zoho_batch(chunk)
            
            if token and sync_results:
                batch_updates = []
                for r_idx, status_text in zip(chunk_indices, sync_results):
                    if status_text:
                        batch_updates.append({
                            "range": f"{tab_name}!K{r_idx}",
                            "values": [[f"{status_text} {today_str}"]]
                        })

                if batch_updates:
                    update_url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values:batchUpdate"
                    try:
                        requests.post(
                            update_url,
                            headers={"Authorization": f"Bearer {token}"},
                            json={"valueInputOption": "USER_ENTERED", "data": batch_updates},
                            timeout=15
                        )
                    except Exception as e:
                        print(f"[!] Error updating sheet sync status: {e}")

            time.sleep(0.5)

        print(f"[🎉] Completed sync for Sheet [{tab_name}].")

    def run_all(self):
        """Runs sync for both Web Leads and Social Leads sheets."""
        print("=" * 70)
        print("🔄 Running Zoho CRM & Google Sheets Sync with Contact Verification...")
        print("=" * 70)
        self.sync_sheet(SPREADSHEET_ID_WEB, TAB_NAME_WEB)
        self.sync_sheet(SPREADSHEET_ID_SOCIAL, TAB_NAME_SOCIAL)
        print("[🎉] CRM Sync Completed!")
