import requests

# Test with Zoho Deluge default headers
headers = {
    'User-Agent': 'Zoho-Deluge/1.0',
    'Accept': '*/*'
}

urls = [
    ("Web Leads Export", "https://docs.google.com/spreadsheets/d/1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw/export?format=csv&gid=1144923842"),
    ("Multi GID 0 Export", "https://docs.google.com/spreadsheets/d/1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM/export?format=csv&gid=0"),
    ("Odoo Master Export", "https://docs.google.com/spreadsheets/d/1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4/export?format=csv&gid=1537325223"),
    ("Zoho Master Export", "https://docs.google.com/spreadsheets/d/1CPAernDPLSFJSebo5hFNQWsazLmbLbCS9TY0Kfa22SE/export?format=csv&gid=1736864648"),
]

for name, url in urls:
    res = requests.get(url, headers=headers)
    print(f"=== {name} ===")
    print(f"Status: {res.status_code} | Content-Type: {res.headers.get('Content-Type')}")
    lines = res.text.split('\n')
    print(f"Total Raw Lines: {len(lines)}")
    if len(lines) > 0:
        print(f"Line 0 (Length {len(lines[0])}): {repr(lines[0][:100])}")
    if len(lines) > 1:
        print(f"Line 1 (Length {len(lines[1])}): {repr(lines[1][:100])}")
    print()
