import requests

url = 'https://docs.google.com/spreadsheets/d/1iIcE_TI17N2hgva99ylF_RPyUZtllZHQu-SOUprSpB4/export?format=csv&gid=1537325223'
r = requests.get(url)
lines = [l for l in r.text.replace('\r', '').split('\n') if l.strip()]

for i, line in enumerate(lines[:5]):
    if '","' in line:
        cols = [c.strip('"') for c in line.split('","')]
    else:
        cols = [c.strip('"') for c in line.split(',')]
    em = cols[5] if len(cols)>5 else 'N/A'
    ph = cols[6] if len(cols)>6 else 'N/A'
    print(f'Line {i} (len {len(cols)}): Email={em} | Phone={ph}')
