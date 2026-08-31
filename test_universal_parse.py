import requests, csv, io

targets = [
    # (Label, Sheet ID, GID, Type)
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

for label, sid, gid, stype in targets:
    url = f"https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&gid={gid}"
    res = requests.get(url)
    lines = res.text.replace('\r','').split('\n')
    
    total = 0
    valid = 0

    for row in lines[1:]:
        if not row.strip(): continue
        total += 1
        cols = [c.strip('"') for c in row.split('","')]

        if stype == "STANDARD_10":
            email = cols[3] if len(cols) > 3 else ""
            phone = cols[4] if len(cols) > 4 else ""
            comp = cols[2] if len(cols) > 2 else ""
        elif stype == "EXTENDED_28":
            email = cols[9] if len(cols) > 9 else ""
            phone = cols[10] if len(cols) > 10 else ""
            comp = cols[2] if len(cols) > 2 else ""
        elif stype == "ODOO_ZOHO_21":
            email = cols[5] if len(cols) > 5 else ""
            phone = cols[6] if len(cols) > 6 else ""
            comp = cols[1] if len(cols) > 1 else ""

        if email and "@" in email and phone:
            valid += 1

    print(f"[{stype:<12}] {label:<18} | Total Rows: {total:<5} | Valid Leads (Email+Phone): {valid:<5}")
