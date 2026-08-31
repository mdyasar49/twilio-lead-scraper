import requests

sheets = [
    ("Web Leads", "https://docs.google.com/spreadsheets/d/1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw/export?format=csv&gid=1144923842", "STANDARD_10"),
    ("Social Leads", "https://docs.google.com/spreadsheets/d/1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw/export?format=csv&gid=1029677902", "STANDARD_10"),
    ("Multi-Facebook", "https://docs.google.com/spreadsheets/d/1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM/export?format=csv&gid=0", "EXTENDED_28"),
    ("Multi-Freelancer", "https://docs.google.com/spreadsheets/d/1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM/export?format=csv&gid=835700405", "EXTENDED_28"),
    ("Multi-LinkedIn", "https://docs.google.com/spreadsheets/d/1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM/export?format=csv&gid=93563620", "EXTENDED_28"),
    ("Odoo Master", "https://docs.google.com/spreadsheets/d/1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4/export?format=csv&gid=1537325223", "ODOO_ZOHO_21"),
    ("Zoho Master", "https://docs.google.com/spreadsheets/d/1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE/export?format=csv&gid=1736864648", "ODOO_ZOHO_21"),
]

for label, url, stype in sheets:
    res = requests.get(url)
    text = res.text[:200000] # Deluge 200KB chunk simulation
    lines = [l for l in text.replace('\r','').split('\n') if l.strip()]
    
    parsed = 0
    valid_email = 0
    
    for row in lines[1:]:
        clean_row = row.replace('"', '')
        cols = clean_row.split(',')
        if len(cols) >= 5:
            parsed += 1
            if stype == "STANDARD_10":
                email = cols[3] if len(cols) > 3 else ""
                phone = cols[4] if len(cols) > 4 else ""
            elif stype == "EXTENDED_28":
                email = cols[9] if len(cols) > 9 else ""
                phone = cols[10] if len(cols) > 10 else ""
            elif stype == "ODOO_ZOHO_21":
                email = cols[5] if len(cols) > 5 else ""
                phone = cols[6] if len(cols) > 6 else ""
                
            if "@" in email:
                valid_email += 1
                
    print(f"[{stype:<12}] {label:<18} | Total Lines: {len(lines):<5} | Parsed >= 5: {parsed:<5} | Valid Email: {valid_email:<5}")
