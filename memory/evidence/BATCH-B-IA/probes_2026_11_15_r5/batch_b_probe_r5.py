# BATCH-B IA R5 probes (owner-approved 2026-11-15: READ-ONLY). Credentials from env, never printed. Output masked.
# Run: set -a; . /dev/shm/emergent/app.env; set +a; python3 batch_b_probe_r5.py
import json, os, time, datetime, requests

B = "https://preprod.mygenie.online"
OUT = os.path.dirname(os.path.abspath(__file__)) + "/"
SENS = ["token", "password", "email", "phone", "mobile", "contact", "gst_number", "upi", "address"]


def mask(o):
    if isinstance(o, dict):
        return {k: ("***" if any(s in k.lower() for s in SENS) and v not in (None, "", 0) else mask(v)) for k, v in o.items()}
    if isinstance(o, list):
        return [mask(x) for x in o]
    return o


r = requests.post(B + "/api/v1/auth/vendoremployee/common-login", timeout=60,
                  headers={"Accept": "application/json", "X-localization": "en"},
                  json={"email": os.environ["PROBE_POS_EMAIL"], "password": os.environ["PROBE_POS_PASSWORD"]})
H = {"Authorization": "Bearer " + r.json()["token"], "Accept": "application/json", "X-localization": "en"}


def call(method, path, name, **kw):
    t = time.time()
    try:
        r = requests.request(method, B + path, headers=H, timeout=150, **kw)
        try:
            body = r.json()
        except Exception:
            body = r.text[:3000]
        st = r.status_code
    except Exception as e:
        st, body = "ERR", str(e)[:300]
    json.dump({"status": st, "secs": round(time.time() - t, 1), "body": mask(body)}, open(OUT + name, "w"), indent=1)
    print(name, st, round(time.time() - t, 1), len(json.dumps(body)))
    return st, body


# P1 — CR-527: credit list + detail for top 3 balances
st, lst = call("POST", "/api/v1/vendoremployee/pos/tap-waiter-list", "30_credit_list.json", json={})
rows = (lst or {}).get("employee-tap-list", []) if isinstance(lst, dict) else []
top = sorted(rows, key=lambda x: -float(str(x.get("total_credit") or 0).replace(",", "")))[:3]
for i, c in enumerate(top):
    call("GET", "/api/v2/vendoremployee/pos/tap-customer-record-list", f"31_credit_detail_{i}.json",
         params={"customer_id": c["id"]})

# P2 — BUG-607: products tax fields (restaurant_gst=category)
call("GET", "/api/v1/vendoremployee/get-products-list", "32_products.json",
     params={"limit": 10000, "offset": 1, "type": "all"})
call("GET", "/api/v2/vendoremployee/restaurant-settings/settings-list", "33_settings_list.json")

# P3 — OD-526-B: settlement report last 7 days (look for any settled/lock signal)
today = datetime.date.today()
for d in range(0, 7):
    day = (today - datetime.timedelta(days=d)).strftime("%d-%m-%Y")
    call("POST", "/api/v1/vendoremployee/waiter/get-settlement-report", f"34_settlement_{d}.json",
         json={"date_from": day, "date_to": day})
