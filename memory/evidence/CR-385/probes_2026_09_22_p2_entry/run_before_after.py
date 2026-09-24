# CR-385 P2 Entry — LR count before/after the direct-reservation "skipped" probe (READ-ONLY; nothing created)
import json, os, requests
H = os.environ["API_BASE"].rstrip("/"); OUT = os.path.dirname(os.path.abspath(__file__))
s = requests.Session()
r = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": os.environ["OWNER_EMAIL"], "password": os.environ["OWNER_PASS"]}, headers={"X-localization": "en"})
print("login http", r.status_code, "content-type", r.headers.get("content-type"))
tok = r.json()["token"]
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})
LR = f"{H}/api/v2/vendoremployee/aiosell/local-reservations"; P = {"start_date": "2026-08-23", "end_date": "2026-11-21", "view": "all"}
def lr(tag):
    b = s.get(LR, params=P).json(); rows = b["data"]["reservations"]
    json.dump({"count": len(rows), "max_id": max(x["id"] for x in rows), "counts": b["data"]["counts"]}, open(f"{OUT}/{tag}.json", "w"), indent=1)
    return len(rows), max(x["id"] for x in rows)
before = lr("s6_lr_before"); print("LR before:", before)
r = s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation", json={"rooms": []})
json.dump({"http": r.status_code, "body": r.json()}, open(f"{OUT}/s7_direct_reservation_skipped.json", "w"), indent=1)
print("direct-reservation {rooms:[]} →", r.status_code, r.json())
after = lr("s8_lr_after"); print("LR after:", after, "| unchanged:", before == after)
