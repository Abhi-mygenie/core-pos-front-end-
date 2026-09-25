# CR-385 P5 read-back (READ-ONLY: 3 GETs). Credentials read from memory, never printed. Usage: python run_readback.py t0_entry|t9
import re, json, sys, datetime, requests
sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
H = open('/app/frontend/.env').read().split('REACT_APP_API_BASE_URL=')[1].split('\n')[0].strip().rstrip('/')
name = sys.argv[1] if len(sys.argv) > 1 else 't0_entry'
OUT = f'/app/memory/evidence/CR-385/probes_2026_09_23_release/{name}_readback.json'

s = requests.Session()
r = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": EMAIL, "password": PASSWORD}, headers={"X-localization": "en"})
tok = r.json().get("token"); print("login", r.status_code, "token ok" if tok else r.text[:200])
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})

res = {"ts": datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'), "purpose": f"CR-385 P5 {name} read-back (OG-PMS-041 pattern)"}
b = s.get(f"{H}/api/v2/vendoremployee/restaurant-settings/settings-list").json()
basic = (b.get("data") or {}).get("basic") or {}
res["settings"] = {k: basic.get(k) for k in ["allow_early_checkin", "extend_rate_mode", "auto_print_checkin_receipt"]}

today = datetime.date.today()
lr = s.get(f"{H}/api/v2/vendoremployee/aiosell/local-reservations", params={"start_date": (today - datetime.timedelta(days=30)).isoformat(), "end_date": (today + datetime.timedelta(days=60)).isoformat(), "view": "all"})
res["lr_status"] = lr.status_code
d = lr.json().get("data") or {}
res["business_date"] = (d.get("meta") or {}).get("business_date")
res["counts"] = d.get("counts")
rows = d.get("reservations") or []
res["in_house"] = [[x["id"], (x.get("rooms") or [{}])[0].get("table_no"), (x.get("rooms") or [{}])[0].get("room_type") or x.get("room_type"), x.get("checkin"), x.get("checkout"), (x.get("rooms") or [{}])[0].get("order_id")] for x in rows if x.get("operational_status") == "in_house"]
res["pending"] = [[x["id"], x.get("guest_name") or (x.get("guest") or {}).get("name"), x.get("checkin"), x.get("checkout"), x.get("operational_status")] for x in rows if x.get("operational_status") == "pending"]
res["qa_rows_left"] = [x["id"] for x in rows if "P5 QA" in json.dumps(x)]

bd = s.get(f"{H}/api/v2/vendoremployee/aiosell/room-status-board").json()
res["board"] = [{"table_no": x.get("table_no"), "display_status": x.get("display_status"), "is_occupied": x.get("is_occupied"), "guest": ({"name": (x.get("guest") or {}).get("name"), "order_id": (x.get("guest") or {}).get("order_id")} if x.get("guest") else None)} for x in (bd.get("data") or {}).get("rooms", [])]

json.dump(res, open(OUT, 'w'), indent=1)
print(json.dumps({k: res[k] for k in ["business_date", "settings", "counts", "in_house", "pending", "qa_rows_left", "board"]}, indent=1))
