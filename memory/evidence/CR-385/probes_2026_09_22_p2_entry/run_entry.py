# CR-385 Phase 2 Entry Verification — READ-ONLY probes (no booking created, no settings written)
import json, os, sys, requests, datetime
H = os.environ["API_BASE"].rstrip("/")
OUT = os.path.dirname(os.path.abspath(__file__))
s = requests.Session()
r = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": os.environ["OWNER_EMAIL"], "password": os.environ["OWNER_PASS"]}, headers={"X-localization": "en"})
tok = r.json().get("token")
print("login", r.status_code, "token" if tok else r.text[:200])
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})

def save(name, resp):
    body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"raw": resp.text[:1500]}
    json.dump({"http": resp.status_code, "body": body}, open(f"{OUT}/{name}.json", "w"), indent=1)
    return body

# 1. settings-list → getFrontDeskRules shape + auto_print_checkin_receipt
b = save("s1_settings_list", s.get(f"{H}/api/v2/vendoremployee/restaurant-settings/settings-list"))
basic = (b.get("data") or {}).get("basic") or {}
keys = {k: basic.get(k) for k in ["allow_early_checkin", "extend_rate_mode", "auto_print_checkin_receipt", "pms.allow_early_checkin", "pms.extend_rate_mode", "pms.auto_print_checkin_receipt"] if k in basic}
print("settings basic.* rules:", json.dumps(keys))

# 2. LR → business date
b = save("s2_lr", s.get(f"{H}/api/v2/vendoremployee/aiosell/local-reservations", params={"start_date": "2026-08-23", "end_date": "2026-11-21", "view": "all"}))
meta = (b.get("data") or {}).get("meta") or {}
bd = meta.get("business_date")
counts = (b.get("data") or {}).get("counts")
print("business_date:", bd, "counts:", json.dumps(counts))
rows = (b.get("data") or {}).get("reservations") or []
pend = [{"id": x["id"], "checkin": x["checkin"], "room": (x.get("rooms") or [{}])[0].get("room_code"), "chan": x.get("channel")} for x in rows if x.get("operational_status") == "pending"]
inh = [{"id": x["id"], "table": (x.get("rooms") or [{}])[0].get("table_no")} for x in rows if x.get("operational_status") == "in_house"]
print("pending rows:", json.dumps(pend[:12]), "| in_house:", json.dumps(inh))

# 3. room-availability GET (read-only)
d0 = datetime.date.fromisoformat(bd); d1 = d0 + datetime.timedelta(days=1)
b = save("s3_room_availability", s.get(f"{H}/api/v2/vendoremployee/aiosell/room-availability", params={"checkin": d0.isoformat(), "checkout": d1.isoformat()}))
print("room-availability http", b.get("status"), json.dumps([(x["table_no"], x["aiosell_room_code"], x["available"], x.get("blocked_by")) for x in (b.get("data") or {}).get("rooms", [])]))

# 4. direct-reservation 422-shape probe — deliberately invalid body (no guest/dates) so nothing can be created
r = s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation", json={"rooms": []})
b = save("s4_direct_reservation_422", r)
print("direct-reservation invalid body →", r.status_code, json.dumps(b)[:400])

# 5. board meta
b = save("s5_board", s.get(f"{H}/api/v2/vendoremployee/aiosell/room-status-board"))
print("board rooms:", json.dumps([(x.get("table_no"), x.get("room_operational_status") or x.get("status"), x.get("is_occupied")) for x in (b.get("data") or {}).get("rooms", [])]))
