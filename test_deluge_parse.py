import requests, csv, io

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

sheet_id = "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM"

for name, gid in gids:
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&gid={gid}&tq=limit%20100%20offset%200"
    res = requests.get(url)
    if res.status_code != 200:
        print(f"❌ {name} (GID: {gid}): HTTP {res.status_code}")
        continue
    
    reader = csv.reader(io.StringIO(res.text))
    rows = list(reader)
    if len(rows) <= 1:
        print(f"⚠️  {name} (GID: {gid}): 0 data rows (Only header or empty)")
        continue

    data_count = len(rows) - 1
    sample = rows[1]
    
    # Check email (index 9) and phone (index 10) / mobile (index 11)
    email = sample[9] if len(sample) > 9 else ""
    phone = sample[10] if len(sample) > 10 else ""
    mobile = sample[11] if len(sample) > 11 else ""
    company = sample[2] if len(sample) > 2 else ""

    print(f"✅ {name:<20} (GID: {gid:<10}): {data_count:<3} rows | Sample: Company='{company}' | Email='{email}' | Phone='{phone}' | Mobile='{mobile}'")
