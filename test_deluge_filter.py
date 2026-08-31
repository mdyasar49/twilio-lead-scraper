import requests, csv, io, re

def clean_company(raw):
    generic = {"contact us", "contact", "home", "about us", "about", "contact our office", "privacy policy", "help center", "terms of service", "terms & conditions", "customer support", "support", "services", "login", "register", "sign in", "double whammy", "overview", "faq", "faqs", "get in touch", "enquiry form", "enquiries", "referral form", "locations", "meet our team", "our team"}
    c = raw.strip()
    if not c or c.lower() in generic or len(c) < 2:
        return "Australian Enterprise"
    return c

def parse_tab(name, gid):
    url = f"https://docs.google.com/spreadsheets/d/1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM/gviz/tq?tqx=out:csv&gid={gid}"
    res = requests.get(url)
    lines = res.text.replace('\r','').split('\n')
    
    total = 0
    passed = 0
    failed_email = 0
    failed_phone = 0
    failed_both = 0

    for idx, row in enumerate(lines[1:], 1):
        if not row.trim() if hasattr(row, 'trim') else not row.strip(): continue
        total += 1
        
        # Simulate Deluge replaceAll('","', '###SPLIT###').toList('###SPLIT###')
        cols = [c.strip('"') for c in row.split('","')]
        if len(cols) < 10:
            failed_both += 1
            continue

        raw_email = cols[9].lower().strip() if len(cols) > 9 else ""
        raw_phone = cols[10].strip() if len(cols) > 10 else ""
        raw_mobile = cols[11].strip() if len(cols) > 11 else ""
        company = cols[2].strip() if len(cols) > 2 else ""

        # Email check
        clean_email = ""
        if "@" in raw_email and "." in raw_email and "example.com" not in raw_email and not raw_email.endswith(".png") and not raw_email.endsWith(".jpg") if hasattr(raw_email, 'endsWith') else not raw_email.endswith(".jpg"):
            clean_email = raw_email.replace("mailto:", "").replace("<", "").replace(">", "").strip()

        # Phone check
        phone_digits = re.sub(r'\D', '', raw_phone)
        mobile_digits = re.sub(r'\D', '', raw_mobile)

        has_phone = len(phone_digits) >= 6 or len(mobile_digits) >= 6

        if not clean_email and not has_phone:
            failed_both += 1
        elif not clean_email:
            failed_email += 1
        elif not has_phone:
            failed_phone += 1
        else:
            passed += 1

    print(f"Tab: {name:<20} | Total Rows: {total:<3} | ✅ Passed (Email+Phone): {passed:<3} | ❌ No Email: {failed_email:<3} | ❌ No Phone: {failed_phone:<3} | ❌ No Both: {failed_both:<3}")

gids = [
    ("Facebook", "0"),
    ("Freelancer", "835700405"),
    ("Upwork", "597011379"),
    ("LinkedIn", "93563620"),
    ("Instagram", "1348388489"),
    ("Threads", "511648997"),
    ("YellowPages", "91912505"),
    ("ABR Register", "455374992"),
    ("Yelp", "1616379665"),
    ("Bing Directory", "2070637993"),
    ("Expert360", "621089222"),
    ("99acres", "596969109"),
    ("Odoo ERP", "1197306578")
]

for name, gid in gids:
    parse_tab(name, gid)
