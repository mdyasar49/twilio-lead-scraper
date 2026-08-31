"""
Audit Google Sheets for leads missing email or phone/mobile.
Flags invalid data that should NOT be in CRM.
"""
import os, sys, re, json, time, jwt, requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config import SERVICE_ACCOUNT_FILE, SPREADSHEET_ID_WEB, TAB_NAME_WEB, SPREADSHEET_ID_SOCIAL, TAB_NAME_SOCIAL

# ── Google Sheets auth ──────────────────────────────────────────
def get_google_token():
    with open(SERVICE_ACCOUNT_FILE) as f:
        sa = json.load(f)
    now = int(time.time())
    payload = {
        "iss": sa["client_email"],
        "scope": "https://www.googleapis.com/auth/spreadsheets",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now, "exp": now + 3600
    }
    signed = jwt.encode(payload, sa["private_key"], algorithm="RS256")
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed
    }, timeout=30)
    return r.json()["access_token"]

def fetch_sheet(token, spreadsheet_id, tab_name):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{tab_name}"
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=45)
    data = r.json()
    return data.get("values", [])

# ── Australian phone validation ─────────────────────────────────
AU_PHONE_RE = re.compile(
    r'^(?:\+?61|0)[2-478]\d{8}$|'      # landline / mobile 04xx
    r'^1[38]00\d{6}$|'                   # 1300/1800
    r'^13\d{4}$'                         # 13xxxx
)

def is_valid_au_phone(raw):
    if not raw: return False
    digits = re.sub(r'\D', '', raw)
    if '.' in raw: return False       # float garbage
    if len(digits) < 6 or len(digits) > 12: return False
    if digits.startswith('61'): digits = '0' + digits[2:]
    return bool(AU_PHONE_RE.match(digits))

# ── Email validation ────────────────────────────────────────────
BAD_DOMAINS = {'example.com','domain.com','sentry.io','test.com'}
BAD_EXTS = {'.png','.jpg','.jpeg','.webp','.svg','.pdf','.gif'}

def is_valid_email(raw):
    if not raw or '@' not in raw or '.' not in raw: return False
    e = raw.strip().lower()
    if any(e.endswith(ext) for ext in BAD_EXTS): return False
    domain = e.split('@')[-1]
    if domain in BAD_DOMAINS: return False
    return True

# ── MAIN AUDIT ──────────────────────────────────────────────────
def audit_sheet(token, sheet_id, tab, sheet_label):
    rows = fetch_sheet(token, sheet_id, tab)
    if not rows:
        print(f"  ⚠️  {sheet_label}: No data found")
        return

    header = rows[0]
    data = rows[1:]
    total = len(data)
    
    # Find column indices
    email_col = None
    phone_col = None
    company_col = None
    for i, h in enumerate(header):
        hl = h.lower()
        if 'email' in hl: email_col = i
        if 'phone' in hl or 'mobile' in hl: phone_col = i
        if 'company' in hl: company_col = i

    if email_col is None or phone_col is None:
        print(f"  ❌ {sheet_label}: Cannot find Email/Phone columns in header: {header}")
        return

    no_email = []
    no_phone = []
    no_both = []
    invalid_email = []
    invalid_phone = []
    valid_count = 0

    for idx, row in enumerate(data, start=2):  # row 2 onwards in sheet
        email = row[email_col].strip() if len(row) > email_col else ""
        phone = row[phone_col].strip() if len(row) > phone_col else ""
        company = row[company_col].strip() if len(row) > company_col and company_col is not None else ""

        has_email = bool(email)
        has_phone = bool(phone)
        email_valid = is_valid_email(email) if has_email else False
        phone_valid = is_valid_au_phone(phone) if has_phone else False

        if not has_email and not has_phone:
            no_both.append({"row": idx, "company": company})
        elif not has_email:
            no_email.append({"row": idx, "company": company, "phone": phone})
        elif not has_phone:
            no_phone.append({"row": idx, "company": company, "email": email})
        
        if has_email and not email_valid:
            invalid_email.append({"row": idx, "company": company, "email": email})
        if has_phone and not phone_valid:
            invalid_phone.append({"row": idx, "company": company, "phone": phone})

        if email_valid and phone_valid:
            valid_count += 1

    print(f"\n{'='*70}")
    print(f"📊 {sheet_label} AUDIT REPORT")
    print(f"{'='*70}")
    print(f"  Total leads in sheet     : {total}")
    print(f"  ✅ Valid (email+phone)    : {valid_count}")
    print(f"  ❌ Missing BOTH          : {len(no_both)}")
    print(f"  ⚠️  Missing Email only   : {len(no_email)}")
    print(f"  ⚠️  Missing Phone only   : {len(no_phone)}")
    print(f"  🚫 Invalid Email format  : {len(invalid_email)}")
    print(f"  🚫 Invalid Phone format  : {len(invalid_phone)}")

    if no_both:
        print(f"\n  --- Leads Missing BOTH Email & Phone (first 10) ---")
        for l in no_both[:10]:
            print(f"    Row {l['row']}: {l['company']}")

    if no_email:
        print(f"\n  --- Leads Missing Email (first 10) ---")
        for l in no_email[:10]:
            print(f"    Row {l['row']}: {l['company']} | Phone: {l['phone']}")

    if no_phone:
        print(f"\n  --- Leads Missing Phone (first 10) ---")
        for l in no_phone[:10]:
            print(f"    Row {l['row']}: {l['company']} | Email: {l['email']}")

    if invalid_email:
        print(f"\n  --- Invalid Emails (first 10) ---")
        for l in invalid_email[:10]:
            print(f"    Row {l['row']}: {l['company']} | Email: {l['email']}")

    if invalid_phone:
        print(f"\n  --- Invalid Phones (first 10) ---")
        for l in invalid_phone[:10]:
            print(f"    Row {l['row']}: {l['company']} | Phone: {l['phone']}")

    return {
        "total": total, "valid": valid_count,
        "no_both": len(no_both), "no_email": len(no_email), "no_phone": len(no_phone),
        "invalid_email": len(invalid_email), "invalid_phone": len(invalid_phone)
    }


if __name__ == "__main__":
    print("🔍 Starting Google Sheets Lead Data Audit...")
    token = get_google_token()
    
    web_result = audit_sheet(token, SPREADSHEET_ID_WEB, TAB_NAME_WEB, "WEB LEADS SHEET")
    social_result = audit_sheet(token, SPREADSHEET_ID_SOCIAL, TAB_NAME_SOCIAL, "SOCIAL LEADS SHEET")
    
    print(f"\n{'='*70}")
    print("🏁 AUDIT COMPLETE")
    print(f"{'='*70}")
