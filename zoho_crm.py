"""
================================================================================
🚀 ZOHO CRM ENTERPRISE DIRECT API BATCH UPSERTER
================================================================================
Robust, zero-dependency module for direct batch upserting leads to Zoho CRM.
Handles token generation, duplicate checking, batch chunking (up to 100 leads per call),
field formatting, and comprehensive logging.
"""

import os
import sys
import json
import time
import requests
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

DEFAULT_ZOHO_CLIENT_ID = "1000.I8BXR1U9XEX0TGSSBBS969PUAQDDCO"
DEFAULT_ZOHO_CLIENT_SECRET = "f0b12ded0b82b34eca1aa52f3a4e688ac43603755b"
DEFAULT_ZOHO_REFRESH_TOKEN = "1000.fb5b161d68abd14ef17be0b078337e7d.b7d8d9d85d96eaa03498881c09a5f294"
DEFAULT_ZOHO_ACCOUNTS_URL = "https://accounts.zoho.in/oauth/v2/token"
DEFAULT_ZOHO_API_URL = "https://www.zohoapis.in/crm/v2/Leads/upsert"

_cached_token = None
_token_expiry = 0

def get_zoho_access_token() -> Optional[str]:
    """Generates a fresh Zoho CRM OAuth access token using refresh token."""
    global _cached_token, _token_expiry
    now = time.time()
    if _cached_token and now < _token_expiry:
        return _cached_token

    client_id = os.getenv("ZOHO_CLIENT_ID", DEFAULT_ZOHO_CLIENT_ID)
    client_secret = os.getenv("ZOHO_CLIENT_SECRET", DEFAULT_ZOHO_CLIENT_SECRET)
    refresh_token = os.getenv("ZOHO_REFRESH_TOKEN", DEFAULT_ZOHO_REFRESH_TOKEN)
    accounts_url = os.getenv("ZOHO_ACCOUNTS_URL", DEFAULT_ZOHO_ACCOUNTS_URL)

    # Check local self_client.json if exists
    for p in ["self_client.json", "../self_client.json", "credentials/self_client.json"]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    c = json.load(f)
                    client_id = c.get("client_id", client_id)
                    client_secret = c.get("client_secret", client_secret)
                    refresh_token = c.get("refresh_token", refresh_token)
                    accounts_url = c.get("accounts_url", accounts_url)
                break
            except Exception:
                pass

    try:
        params = {
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token"
        }
        res = requests.post(accounts_url, params=params, timeout=15)
        if res.status_code == 200:
            data = res.json()
            if "access_token" in data:
                _cached_token = data["access_token"]
                _token_expiry = now + 3300  # Token valid for ~1 hour
                return _cached_token
            else:
                print(f"[-] Zoho Token generation error: {data}")
        else:
            print(f"[-] Zoho Token HTTP error {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[-] Zoho OAuth Token Exception: {e}")
    return None

def format_lead_for_zoho(lead: Dict[str, Any], default_source: str = "Automated Scraper Engine") -> Dict[str, Any]:
    """Formats raw lead dict into Zoho CRM Lead module payload."""
    last_name = lead.get("Contact Person") or lead.get("Contact Name") or lead.get("Last_Name") or lead.get("Name") or "Business Executive"
    company = lead.get("Company Name") or lead.get("Company") or "Enterprise Client"
    email = lead.get("Email Address") or lead.get("Email") or lead.get("Work Email") or ""
    phone = lead.get("Phone Number") or lead.get("Phone") or lead.get("Telephone") or ""
    mobile = lead.get("Mobile Number") or lead.get("Mobile") or ""
    website = lead.get("Website URL") or lead.get("Website") or lead.get("Company Website") or ""
    city = lead.get("City") or lead.get("Location") or ""
    state = lead.get("State") or ""
    country = lead.get("Country") or "India"
    industry = lead.get("Industry Category") or lead.get("Industry") or "IT & Software Services"
    lead_source = lead.get("Lead Source") or lead.get("Lead_Source") or default_source
    designation = lead.get("Designation") or lead.get("Title") or ""
    description = lead.get("Lead Notes / Summary") or lead.get("Description") or lead.get("Notes") or ""

    # Clean email
    email = email.replace("mailto:", "").replace("<", "").replace(">", "").strip()

    record = {
        "Last_Name": str(last_name).strip() or "Executive",
        "Company": str(company).strip() or "Enterprise Organization",
        "Industry": str(industry).strip(),
        "Lead_Source": str(lead_source).strip()
    }

    if email and "@" in email and "." in email and not any(bad in email for bad in ["example.com", "domain.com", ".png", ".jpg"]):
        record["Email"] = email
    if phone:
        record["Phone"] = str(phone).strip()
    if mobile:
        record["Mobile"] = str(mobile).strip()
    if website:
        record["Website"] = str(website).strip()
    if city:
        record["City"] = str(city).strip()
    if state:
        record["State"] = str(state).strip()
    if country:
        record["Country"] = str(country).strip()
    if designation:
        record["Designation"] = str(designation).strip()
    if description:
        record["Description"] = str(description).strip()

    return record

def upsert_leads_to_zoho(leads: List[Dict[str, Any]], source_label: str = "Scraper Pipeline") -> Dict[str, int]:
    """
    Batch upserts leads to Zoho CRM with duplicate detection by Email.
    Chunks into batches of 100 leads per API request.
    """
    if not leads:
        return {"processed": 0, "inserted": 0, "updated": 0, "failed": 0}

    token = get_zoho_access_token()
    if not token:
        print("[-] Zoho CRM upload skipped: Unable to obtain access token.")
        return {"processed": len(leads), "inserted": 0, "updated": 0, "failed": len(leads)}

    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "Content-Type": "application/json"
    }

    formatted_leads = []
    for l in leads:
        fmt = format_lead_for_zoho(l, default_source=source_label)
        # Must have at least Email or Phone/Mobile
        if fmt.get("Email") or fmt.get("Phone") or fmt.get("Mobile"):
            formatted_leads.append(fmt)

    if not formatted_leads:
        print("[*] No valid leads with email/phone found for Zoho CRM upload.")
        return {"processed": len(leads), "inserted": 0, "updated": 0, "failed": 0}

    print(f"[*] Uploading {len(formatted_leads)} leads to Zoho CRM ({source_label})...")
    
    total_inserted = 0
    total_updated = 0
    total_failed = 0

    # Process in chunks of 100
    chunk_size = 100
    for i in range(0, len(formatted_leads), chunk_size):
        chunk = formatted_leads[i:i + chunk_size]
        payload = {
            "data": chunk,
            "duplicate_check_fields": ["Email"]
        }
        try:
            res = requests.post(DEFAULT_ZOHO_API_URL, json=payload, headers=headers, timeout=30)
            if res.status_code in [200, 201, 202]:
                res_data = res.json().get("data", [])
                for item in res_data:
                    status = item.get("status")
                    action = item.get("action")
                    if status == "success":
                        if action == "insert":
                            total_inserted += 1
                        else:
                            total_updated += 1
                    else:
                        total_failed += 1
            else:
                print(f"[-] Zoho CRM Batch API error {res.status_code}: {res.text[:300]}")
                total_failed += len(chunk)
        except Exception as e:
            print(f"[-] Exception uploading batch to Zoho CRM: {e}")
            total_failed += len(chunk)
        
        time.sleep(0.5)

    print(f"[✓] Zoho CRM Upload Summary [{source_label}]: {total_inserted} Inserted | {total_updated} Updated | {total_failed} Failed")
    return {
        "processed": len(formatted_leads),
        "inserted": total_inserted,
        "updated": total_updated,
        "failed": total_failed
    }

if __name__ == "__main__":
    test_leads = [
        {
            "Contact Person": "Zoho Partner Executive",
            "Company Name": "Zoho Cloud Partner India",
            "Email Address": "contact.partner@zohopartnercloud.in",
            "Phone Number": "+91 98400 12345",
            "City": "Chennai",
            "State": "Tamil Nadu",
            "Country": "India",
            "Industry Category": "Zoho Implementation Partner",
            "Lead Source": "Zoho Partner TN Scraper"
        }
    ]
    upsert_leads_to_zoho(test_leads, source_label="CLI Test")
