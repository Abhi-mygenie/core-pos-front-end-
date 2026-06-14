#!/usr/bin/env python3
"""Fetch raw preprod data for cafe103 (rid 644) GO-2/GO-3 reconciliation, Mar-May 2026.
Datasets:
  1. profile (schedules for business-day windows)
  2. order-logs-report sort_by=collect_bill, Mar 1 -> Jun 1 (to+1 tail), monthly chunks
  3. order-logs-report sort_by=created_at, Jan 15 (45d lookback) -> Jun 1, monthly chunks
  4. daily-sales-revenue-report per day Mar 1 -> May 31 (paid_revenue + tab settlements)
Checkpointed: re-run skips existing files.
"""
import json, os, time
import requests

BASE = "https://preprod.mygenie.online"
EMAIL = "owner@mantri.com"
PASSWORD = "Qplazm@10"
OUT = os.path.dirname(os.path.abspath(__file__))

s = requests.Session()
s.headers.update({"Content-Type": "application/json", "Accept": "application/json"})

r = s.post(f"{BASE}/api/v1/auth/vendoremployee/login", json={"email": EMAIL, "password": PASSWORD}, timeout=60)
r.raise_for_status()
s.headers["Authorization"] = f"Bearer {r.json()['token']}"
print("login OK", flush=True)

if not os.path.exists(f"{OUT}/profile.json"):
    r = s.get(f"{BASE}/api/v1/vendoremployee/profile", timeout=60)
    r.raise_for_status()
    json.dump(r.json(), open(f"{OUT}/profile.json", "w"))
    print("profile saved", flush=True)

# order-logs chunks: (label, sort_by, from_date, to_date)
CHUNKS = [
    ("cb_mar", "collect_bill", "2026-03-01", "2026-04-01"),
    ("cb_apr", "collect_bill", "2026-04-01", "2026-05-01"),
    ("cb_may", "collect_bill", "2026-05-01", "2026-06-01"),
    ("ca_jan", "created_at", "2026-01-15", "2026-02-01"),
    ("ca_feb", "created_at", "2026-02-01", "2026-03-01"),
    ("ca_mar", "created_at", "2026-03-01", "2026-04-01"),
    ("ca_apr", "created_at", "2026-04-01", "2026-05-01"),
    ("ca_may", "created_at", "2026-05-01", "2026-06-01"),
]
for label, sort_by, fd, td in CHUNKS:
    fn = f"{OUT}/orders_{label}.json"
    if os.path.exists(fn):
        print(f"skip {label}", flush=True)
        continue
    t0 = time.time()
    r = s.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report",
               json={"sort_by": sort_by, "from_date": fd, "to_date": td}, timeout=600)
    r.raise_for_status()
    data = r.json()
    json.dump(data, open(fn, "w"))
    print(f"{label}: {len(data.get('order', []))} orders, {len(r.content)/1e6:.1f} MB, {time.time()-t0:.0f}s", flush=True)

# daily-sales Mar 1 - May 31
import datetime
fn = f"{OUT}/daily_sales.json"
daily = json.load(open(fn)) if os.path.exists(fn) else {}
d = datetime.date(2026, 3, 1)
while d <= datetime.date(2026, 5, 31):
    ds = d.isoformat()
    if ds not in daily:
        try:
            r = s.post(f"{BASE}/api/v2/vendoremployee/daily-sales-revenue-report", json={"from": ds}, timeout=120)
            if r.status_code == 200:
                daily[ds] = r.json()
            else:
                print(f"daily-sales {ds} FAILED {r.status_code}", flush=True)
        except Exception as e:
            print(f"daily-sales {ds} ERROR {e}", flush=True)
        if len(daily) % 10 == 0:
            json.dump(daily, open(fn, "w"))
            print(f"daily-sales checkpoint {len(daily)}", flush=True)
    d += datetime.timedelta(days=1)
json.dump(daily, open(fn, "w"))
print(f"daily-sales done: {len(daily)} days", flush=True)
print("DONE", flush=True)

# settlement report per month (H31/CR-033: room folio behaviour)
fn = f"{OUT}/settlement.json"
if not os.path.exists(fn):
    settle = {}
    for name, fd, td in [("mar","01-03-2026","31-03-2026"),("apr","01-04-2026","30-04-2026"),("may","01-05-2026","31-05-2026")]:
        r = s.post(f"{BASE}/api/v1/vendoremployee/waiter/get-settlement-report",
                   json={"date_from": fd, "date_to": td}, timeout=120)
        if r.status_code == 200:
            settle[name] = r.json()
            print(f"settlement {name} OK", flush=True)
        else:
            print(f"settlement {name} FAILED {r.status_code}", flush=True)
    json.dump(settle, open(fn, "w"))
print("ALL DONE", flush=True)
