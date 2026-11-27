"""CR-385 P5 §5.4 probe-pack shared header. Credentials read-by-pattern from memory/test_credentials.md (QA_TGK), never printed.
Every request body is appended to <RUN>_requests.jsonl for the forbidden-key grep. Rooms: r4=8525, r5=8527 only (r1 8528 = owner stay, r2/r3 never)."""
import json, os, re, sys, time, datetime, requests

D = os.path.dirname(os.path.abspath(__file__))
RUN = os.environ.get("PROBE_RUN", "probe")
sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
H = open('/app/frontend/.env').read().split('REACT_APP_API_BASE_URL=')[1].split('\n')[0].strip().rstrip('/')
FORBIDDEN = re.compile(r"rate_per_night|room_price|amount_after_tax|new_room_price")
REQ_LOG = f"{D}/{RUN}_requests.jsonl"
CREATED = []          # reservation ids created by this run (for finally-cleanup)

class LoggedSession(requests.Session):
    def request(self, method, url, **kw):
        if method.upper() in ("POST", "PUT", "PATCH") and "common-login" not in url:
            body = kw.get("json")
            if body is None and kw.get("files"): body = {k: (v[1] if isinstance(v, tuple) else str(v)) for k, v in kw["files"].items()}
            if body is None and kw.get("data") is not None: body = kw["data"]
            with open(REQ_LOG, "a") as f: f.write(json.dumps({"ts": time.time(), "method": method, "url": url.replace(H, ""), "body": body}, default=str) + "\n")
        return super().request(method, url, **kw)

s = LoggedSession()
_r = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": EMAIL, "password": PASSWORD}, headers={"X-localization": "en"})
tok = _r.json().get("token")
if not tok: print("LOGIN FAILED", _r.status_code, _r.text[:200]); sys.exit(2)
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})
print(f"[{RUN}] login OK · host {H}")

def save(name, r, show=600):
    try: body = r.json()
    except Exception: body = {"_raw": r.text[:2000]}
    json.dump({"http": r.status_code, "body": body}, open(f"{D}/{RUN}_{name}.json", "w"), indent=1, default=str)
    print(f"[{name}] HTTP {r.status_code} :: {json.dumps(body, default=str)[:show]}")
    return r.status_code, body

def board():
    b = s.get(f"{H}/api/v2/vendoremployee/aiosell/room-status-board").json()["data"]["rooms"]
    return {r["restaurant_table_id"]: (r["display_status"], r.get("manual_status"), r["is_occupied"], (r.get("guest") or {}).get("name")) for r in b}

def lr_all():
    b = s.get(f"{H}/api/v2/vendoremployee/aiosell/local-reservations", params={"start_date": "2026-09-01", "end_date": "2027-01-31", "view": "all"}).json()["data"]
    return b["reservations"], b["counts"], (b.get("meta") or {}).get("business_date")

def lr(res_id):
    rows, counts, _ = lr_all(); return next((r for r in rows if r["id"] == res_id), None), counts

def folio(order_id):
    return s.post(f"{H}/api/v2/vendoremployee/get-single-order-new", json={"order_id": int(order_id)}).json()

def settings_set(tag, d):
    c, b = save(f"{tag}_set", s.post(f"{H}/api/v2/vendoremployee/restaurant-settings/update-settings", files={"data": (None, json.dumps({"basic": d}))}), 0)
    basic = (b.get("data") or {}).get("basic") or {}
    print(f"  set {d} -> HTTP {c} :: {({k: basic.get(k) for k in ('allow_early_checkin', 'extend_rate_mode', 'auto_print_checkin_receipt')})}"); return c, b

def settings_get(tag):
    c, b = save(f"{tag}_settings_list", s.get(f"{H}/api/v2/vendoremployee/restaurant-settings/settings-list"), 0)
    basic = b["data"]["basic"]; KEYS = ("allow_early_checkin", "pms.allow_early_checkin", "extend_rate_mode", "pms.extend_rate_mode", "auto_print_checkin_receipt")
    print(f"  settings-list: {({k: basic.get(k) for k in KEYS})}")
    c, p = save(f"{tag}_profile", s.get(f"{H}/api/v1/vendoremployee/profile"), 0)
    st = p["restaurants"][0]["settings"]; print(f"  profile.settings: {({k: st.get(k) for k in KEYS[::2]})}")
    return basic, st

def tab_body(order_id, amount, name, phone, waiter_id=5117):
    return {"order_id": str(order_id), "payment_mode": "TAB", "payment_amount": amount, "payment_status": "success", "transaction_id": "", "billing_auto_bill_print": "No", "food_detail": [],
            "waiter_id": waiter_id, "restaurant_name": "The Goan Kitchen", "email": "", "order_sub_total_amount": 0, "order_sub_total_without_tax": 0, "total_gst_tax_amount": 0, "gst_tax": 0, "vat_tax": 0,
            "grant_amount": amount, "order_amount": amount, "round_up": 0, "service_tax": 0, "service_gst_tax_amount": 0, "tip_amount": 0, "tip_tax_amount": 0, "delivery_charge": 0, "self_discount": 0,
            "discount_for": None, "coupon_code": "", "coupon_discount": 0, "coupon_title": "", "coupon_type": "", "comm_discount": 0, "discount_type": "", "order_discount_type": "Percent", "discount_value": 0,
            "discount_member_category_id": 0, "discount_member_category_name": "", "used_loyalty_point": 0, "loyalty_points_used": 0, "loyalty_discount": 0, "loyalty_redemption_id": None, "use_wallet_balance": 0,
            "paid_room": "yes", "usage_id": "", "cust_name": name, "cust_mobile": phone, "cust_membership_id": "", "name": name, "mobile": phone, "crm_customer_id": "", "custGST": "", "custGSTName": ""}

def tab(tag, order_id, amount, name, phone):
    return save(f"{tag}_tab", s.post(f"{H}/api/v2/vendoremployee/order/order-bill-payment", json=tab_body(order_id, amount, name, phone)), 200)

def checkin_form(name, phone, res_id, booking_id, room, cin, cout, upgrade_reason):
    # mirrors frontDeskService.js checkIn() multipart (literal room_price/order_amount/balance_payment "0" = frozen FE zeros, D50)
    return {"email": "", "booking_details": "", "booking_for": "Individual", "room_price": "0", "order_note": "", "firm_name": "", "firm_gst": "", "children_name": "",
            "name2": "", "id_type2": "", "name3": "", "id_type3": "", "name4": "", "id_type4": "", "phone": phone, "name": name, "booking_type": "Direct",
            "booking_id": str(booking_id), "aiosell_reservation_id": str(res_id), "id_type": "Aadhaar", "room_id[]": str(room), "checkin_date": cin, "checkout_date": cout,
            "order_amount": "0", "advance_payment": "0", "balance_payment": "0", "gst_tax": "0", "total_adult": "2", "total_children": "0", "payment_method": "Cash",
            "upgrade_type": "paid", "upgrade_amount": "1500", "upgrade_reason": upgrade_reason}

def cleanup():
    """finally-block: settle any in-house QA stay by TAB at true balance, cancel any pending QA booking, restore settings."""
    print("== CLEANUP")
    try:
        rows, _, _ = lr_all()
        for r in rows:
            if r["id"] not in CREATED: continue
            st = r.get("operational_status")
            if st == "in_house":
                oid = (r.get("rooms") or [{}])[0].get("order_id"); bal = (r.get("charge") or {}).get("balance_due")
                name = r.get("guest_name") or (r.get("guest") or {}).get("name") or "P5 QA"; ph = (r.get("guest") or {}).get("phone") or r.get("guest_phone") or "9876500000"
                if oid and bal is not None:
                    c, _b = save(f"cleanup_tab_{r['id']}", s.post(f"{H}/api/v2/vendoremployee/order/order-bill-payment", json=tab_body(oid, float(bal), name, ph)), 150)
                    print(f"  settled res {r['id']} order {oid} bal {bal} -> HTTP {c}")
            elif st == "pending":
                c, _b = save(f"cleanup_cancel_{r['id']}", s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{r['id']}/cancel", json={"reason": "P5 QA probe cleanup", "cancelled_by": "probe", "notify_cm": True}), 150)
                print(f"  cancelled res {r['id']} -> HTTP {c}")
    except Exception as e: print("  cleanup error:", e)
    settings_set("cleanup_restore", {"allow_early_checkin": False, "extend_rate_mode": "calendar", "auto_print_checkin_receipt": False})
    bd = board(); print("  board after:", {k: v[0] for k, v in bd.items()})
    rows, counts, bdte = lr_all()
    left = [r["id"] for r in rows if r["id"] in CREATED and r.get("operational_status") in ("in_house", "pending")]
    print(f"  business_date {bdte} · counts {counts} · qa_rows_left {left}")
    return left
