import requests, csv, io

sheets_to_test = [
    # (Sheet Name, Spreadsheet ID, GID)
    ("Web Leads", "1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw", "1144923842"),
    ("Social Leads", "1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw", "1029677902"),
    ("Multi-Facebook", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "0"),
    ("Multi-Freelancer", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "835700405"),
    ("Multi-Upwork", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "597011379"),
    ("Multi-LinkedIn", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "93563620"),
    ("Multi-Instagram", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "1348388489"),
    ("Multi-Threads", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "511648997"),
    ("Multi-YellowPages", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "91912505"),
    ("Multi-ABR", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "455374992"),
    ("Multi-Yelp", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "1616379665"),
    ("Multi-Bing", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "2070637993"),
    ("Multi-Expert360", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "621089222"),
    ("Multi-99acres", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "596969109"),
    ("Multi-Odoo", "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM", "1197306578"),
    ("Odoo Master", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4", "1537325223"),
    ("Odoo Australia", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4", "401758669"),
    ("Odoo India", "1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4", "771759972"),
    ("Zoho Master", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE", "1736864648"),
    ("Zoho Australia", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE", "1675502893"),
    ("Zoho India", "1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE", "1375363359"),
]

for label, sid, gid in sheets_to_test:
    url = f"https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&gid={gid}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code != 200:
            print(f"❌ {label:<18} | ID: {sid[:12]}... | GID: {gid:<10} | HTTP {res.status_code}")
            continue

        reader = csv.reader(io.StringIO(res.text))
        rows = list(reader)
        row_count = len(rows)
        if row_count <= 1:
            print(f"⚠️  {label:<18} | ID: {sid[:12]}... | GID: {gid:<10} | 0 Data Rows (Header Only)")
            continue

        header = rows[0]
        num_cols = len(header)
        sample = rows[1] if len(rows) > 1 else []
        print(f"✅ {label:<18} | ID: {sid[:12]}... | GID: {gid:<10} | Rows: {row_count-1:<4} | Cols: {num_cols:<2} | Header[0]: '{header[0]}'")
    except Exception as e:
        print(f"❌ {label:<18} | Error: {e}")
