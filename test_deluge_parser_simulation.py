import requests

sheets_to_test = [
    ("Web Leads", "1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw", "1144923842", "STANDARD_10"),
    ("Social Leads", "1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw", "1029677902", "STANDARD_10"),
    ("Multi-Facebook", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "0", "EXTENDED_28"),
    ("Multi-Freelancer", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "835700405", "EXTENDED_28"),
    ("Multi-LinkedIn", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "93563620", "EXTENDED_28"),
    ("Odoo Master", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4", "1537325223", "ODOO_ZOHO_21"),
    ("Zoho Master", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE", "1736864648", "ODOO_ZOHO_21"),
]

for label, sid, gid, stype in sheets_to_test:
    url = f"https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&gid={gid}"
    res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    
    # Deluge simulation
    csv_text = res.text
    rows = [r for r in csv_text.replace('\r', '').split('\n') if r.strip()]
    
    parsed_count = 0
    valid_count = 0
    
    for row in rows[1:]:
        # Simulate Deluge replaceAll + toList
        if '","' in row:
            cols = [c.strip('"') for c in row.split('","')]
        else:
            cols = [c.strip('"') for c in row.split(',')]
            
        if len(cols) >= 5:
            parsed_count += 1
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
                valid_count += 1

    print(f"[{stype:<12}] {label:<18} | Rows In Text: {len(rows):<5} | Parsed Cols >= 5: {parsed_count:<5} | Valid Email: {valid_count:<5}")
