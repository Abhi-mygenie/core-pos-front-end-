#!/usr/bin/env python3
"""Fetch raw report data from preprod for palmhouse audit (Mar 1 - Jun 10, 2026)."""
import json, os, sys, time
import requests

BASE = "https://preprod.mygenie.online"
EMAIL = "owner@palmhouse.com"
PASSWORD = "Qplazm@10"
OUT = os.path.dirname(os.path.abspath(__file__))

s = requests.Session()
s.headers.update({"Content-Type": "application/json", "Accept": "application/json"})

# 1. Login
r = s.post(f"{BASE}/api/v1/auth/vendoremployee/login", json={"email": EMAIL, "password": PASSWORD}, timeout=60)
r.raise_for_status()
token = r.json()["token"]
s.headers["Authorization"] = f"Bearer {token}"
print("login OK")

# 2. Profile (restaurant id, name, schedules)
r = s.get(f"{BASE}/api/v1/vendoremployee/profile", timeout=60)
r.raise_for_status()
profile = r.json()
with open(f"{OUT}/profile.json", "w") as f:
    json.dump(profile, f)
print("profile saved")

# 3. order-logs-report per month, both sort modes
RANGES = [
    ("mar", "2026-03-01", "2026-03-31"),
    ("apr", "2026-04-01", "2026-04-30"),
    ("may", "2026-05-01", "2026-05-31"),
    ("jun", "2026-06-01", "2026-06-10"),
]
for name, fd, td in RANGES:
    for sort_by in ("created_at", "collect_bill"):
        fn = f"{OUT}/orders_{name}_{sort_by}.json"
        if os.path.exists(fn):
            print(f"skip {fn}")
            continue
        t0 = time.time()
        r = s.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report",
                   json={"sort_by": sort_by, "from_date": fd, "to_date": td}, timeout=300)
        r.raise_for_status()
        data = r.json()
        with open(fn, "w") as f:
            json.dump(data, f)
        n = len(data.get("order", []))
        print(f"{name} {sort_by}: {n} orders, {len(r.content)/1e6:.1f} MB, {time.time()-t0:.0f}s")

# 4. Backend daily-sales-revenue-report for Jun 1-10 + spot days
DAYS = [f"2026-06-{d:02d}" for d in range(1, 11)] + ["2026-03-15", "2026-04-15", "2026-05-15"]
daily = {}
for d in DAYS:
    r = s.post(f"{BASE}/api/v2/vendoremployee/daily-sales-revenue-report", json={"from": d}, timeout=120)
    if r.status_code == 200:
        daily[d] = r.json()
        print(f"daily-sales {d} OK")
    else:
        print(f"daily-sales {d} FAILED {r.status_code}")
with open(f"{OUT}/daily_sales.json", "w") as f:
    json.dump(daily, f)

# 5. Settlement report per month (DD-MM-YYYY)
SETTLE = [
    ("mar", "01-03-2026", "31-03-2026"),
    ("apr", "01-04-2026", "30-04-2026"),
    ("may", "01-05-2026", "31-05-2026"),
    ("jun", "01-06-2026", "10-06-2026"),
]
settle = {}
for name, fd, td in SETTLE:
    r = s.post(f"{BASE}/api/v1/vendoremployee/waiter/get-settlement-report",
               json={"date_from": fd, "date_to": td}, timeout=120)
    if r.status_code == 200:
        settle[name] = r.json()
        print(f"settlement {name} OK")
    else:
        print(f"settlement {name} FAILED {r.status_code}: {r.text[:200]}")
with open(f"{OUT}/settlement.json", "w") as f:
    json.dump(settle, f)

print("DONE")
