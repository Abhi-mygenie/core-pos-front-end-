#!/usr/bin/env python3
"""CR-385 N7/N8 settings validation (backend reply n7_n8_2026_09_20.md) — saves every raw response next to this file."""
import json, os, sys, time, requests

H = "https://preprod.mygenie.online"
D = os.path.dirname(os.path.abspath(__file__))
CIN, COUT, COUT2, ROOM = "2026-10-10", "2026-10-11", "2026-10-12", 8525
PLAN = "executive-s-ep"

s = requests.Session()
tok = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": "owner@thegoankitchen.com", "password": "Qplazm@10"},
             headers={"X-localization": "en"}).json()["token"]
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})
KEYS = ("allow_early_checkin", "pms.allow_early_checkin", "extend_rate_mode", "pms.extend_rate_mode")

def save(name, r, show=600):
    try: body = r.json()
    except Exception: body = {"_raw": r.text[:2000]}
    json.dump({"http": r.status_code, "body": body}, open(f"{D}/{name}.json", "w"), indent=1, default=str)
    print(f"[{name}] HTTP {r.status_code} :: {json.dumps(body, default=str)[:show]}")
    return r.status_code, body

def settings_get(tag):
    c, b = save(f"{tag}_settings_list", s.get(f"{H}/api/v2/vendoremployee/restaurant-settings/settings-list"), 0)
    basic = b["data"]["basic"]; print(f"  settings-list: {({k: basic.get(k) for k in KEYS})}")
    c, p = save(f"{tag}_profile", s.get(f"{H}/api/v1/vendoremployee/profile"), 0)
    st = p["restaurants"][0]["settings"]; print(f"  profile.settings: {({k: st.get(k) for k in KEYS[::2]})}")
    return basic, st

def settings_set(tag, d):
    c, b = save(f"{tag}_set", s.post(f"{H}/api/v2/vendoremployee/restaurant-settings/update-settings", files={"data": (None, json.dumps({"basic": d}))}), 0)
    basic = (b.get("data") or {}).get("basic") or {}; print(f"  set {d} -> HTTP {c} :: {({k: basic.get(k) for k in KEYS[::2]})}"); return c, b

def board():
    b = s.get(f"{H}/api/v2/vendoremployee/aiosell/room-status-board").json()["data"]["rooms"]
    return {r["restaurant_table_id"]: (r["display_status"], (r.get("guest") or {}).get("name")) for r in b}

def create(tag, name, phone):
    c, b = save(f"{tag}_direct", s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation", json={
        "guest": {"name": name, "phone": phone}, "checkin": CIN, "checkout": COUT, "adults": 2, "children": 0,
        "rooms": [{"room_code": "executive", "rateplan_code": PLAN, "rooms_count": 1}], "advance": {"amount": 1000, "method": "upi", "reference": tag.upper()}}), 300)
    res = b["data"]["reservation"]; print(f"  RES {res['id']} BOOKING {res['booking_id']} charge {res.get('charge')}"); return res["id"], res["booking_id"]

def checkin(tag, name, phone, res_id, booking_id):
    form = {"email": "", "booking_details": "", "booking_for": "Individual", "room_price": "0", "firm_name": "", "firm_gst": "",
            "name2": "", "id_type2": "", "name3": "", "id_type3": "", "name4": "", "id_type4": "", "phone": phone, "name": name, "booking_type": "Direct",
            "booking_id": str(booking_id), "aiosell_reservation_id": str(res_id), "id_type": "Aadhaar", "room_id[]": str(ROOM), "checkin_date": CIN, "checkout_date": COUT,
            "order_amount": "0", "advance_payment": "0", "balance_payment": "0", "gst_tax": "0", "total_adult": "2", "total_children": "0", "payment_method": "Cash",
            "upgrade_type": "paid", "upgrade_amount": "1500", "upgrade_reason": f"{tag} suite upgrade"}
    return save(f"{tag}_checkin", s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in", files={k: (None, v) for k, v in form.items()}), 500)

def extend(tag, order_id, reason):
    c, b = save(f"{tag}_extend", s.post(f"{H}/api/v2/vendoremployee/pos/room-extend-stay", json={"order_id": int(order_id), "new_checkout_date": COUT2, "reason": reason, "payment": {"amount": 500, "method": "cash"}}), 0)
    ch = ((b.get("data") or {}).get("charge")) or {}
    print(f"  extend HTTP {c} top-level charge? {'charge' in b} data.charge: {({k: ch.get(k) for k in ('nights','rate_per_night','upgrade_amount','booking_charge','sgst','cgst','total_with_gst','advance_payment','balance_due')})}")
    return c, ch

def lr_charge(res_id):
    b = s.get(f"{H}/api/v2/vendoremployee/aiosell/local-reservations", params={"start_date": "2026-09-01", "end_date": "2026-12-31", "view": "all"}).json()
    r = next((r for r in b["data"]["reservations"] if r["id"] == res_id), None); return r and r.get("charge")

def tab(tag, order_id, amount, name, phone):
    body = {"order_id": str(order_id), "payment_mode": "TAB", "payment_amount": amount, "payment_status": "success", "transaction_id": "", "billing_auto_bill_print": "No", "food_detail": [],
            "waiter_id": 5117, "restaurant_name": "The Goan Kitchen", "email": "", "order_sub_total_amount": 0, "order_sub_total_without_tax": 0, "total_gst_tax_amount": 0, "gst_tax": 0, "vat_tax": 0,
            "grant_amount": amount, "order_amount": amount, "round_up": 0, "service_tax": 0, "service_gst_tax_amount": 0, "tip_amount": 0, "tip_tax_amount": 0, "delivery_charge": 0, "self_discount": 0,
            "discount_for": None, "coupon_code": "", "coupon_discount": 0, "coupon_title": "", "coupon_type": "", "comm_discount": 0, "discount_type": "", "order_discount_type": "Percent", "discount_value": 0,
            "discount_member_category_id": 0, "discount_member_category_name": "", "used_loyalty_point": 0, "loyalty_points_used": 0, "loyalty_discount": 0, "loyalty_redemption_id": None, "use_wallet_balance": 0,
            "paid_room": "yes", "usage_id": "", "cust_name": name, "cust_mobile": phone, "cust_membership_id": "", "name": name, "mobile": phone, "crm_customer_id": "", "custGST": "", "custGSTName": ""}
    return save(f"{tag}_tab", s.post(f"{H}/api/v2/vendoremployee/order/order-bill-payment", json=body), 200)

print("== 0 defaults"); settings_get("s0")
print("== 0b board (room %d must be free)" % ROOM); bd = board(); print("  ", bd.get(ROOM), "| in-house:", {k: v for k, v in bd.items() if v[0] and v[0].startswith("occupied")})
print("== 1 invalid mode -> 422"); settings_set("s1_bogus", {"extend_rate_mode": "bogus"})
print("== 1b raw JSON body (should be ignored per backend)"); save("s1b_rawjson", s.post(f"{H}/api/v2/vendoremployee/restaurant-settings/update-settings", json={"basic": {"allow_early_checkin": True}}), 0); settings_get("s1b")
print("== 2 CM rates"); c, b = save("s2_rates", s.post(f"{H}/api/v2/vendoremployee/aiosell/fetch-rates", json={"start_date": CIN, "end_date": COUT2}), 0)
for u in b["data"]["aiosell"]["body"]["updates"]:
    for r in u["rates"]:
        if r.get("rateplanCode") == PLAN: print("  ", u["startDate"], r["rate"])

stamp = time.strftime("%H%M%S")
print("== 3 N7 block (early OFF, calendar)"); settings_set("s3_defaults", {"allow_early_checkin": False, "extend_rate_mode": "calendar"})
P1 = "98765" + stamp; R1, B1 = create("s3", "N7 Guest", P1)
c, b = checkin("s3_block", "N7 Guest", P1, R1, B1); print("  N7 blocked:", c == 422, "| msg:", b.get("error") or b.get("message"))
print("  charge after failed check-in (must be untouched):", lr_charge(R1))
print("== 4 N7 allow -> 200, then N8 calendar extend -> 17500"); settings_set("s4_allow", {"allow_early_checkin": True})
c, b = checkin("s4_ok", "N7 Guest", P1, R1, B1); O1 = (b.get("data") or {}).get("order_id"); ch = (b.get("data") or {}).get("charge") or {}
print("  check-in 200:", c == 200, "| order", O1, "| booking_charge", ch.get("booking_charge"), "rate", ch.get("rate_per_night"), "upgrade", ch.get("upgrade_amount"))
c, ch = extend("s4_cal", O1, "N8 calendar"); print("  LR charge after extend:", lr_charge(R1))
tab("s4", O1, ch.get("balance_due"), "N7 Guest", P1); print("  board after TAB:", board().get(ROOM))

print("== 5 N8 held extend -> 18700"); settings_set("s5_held", {"allow_early_checkin": True, "extend_rate_mode": "held"})
P2 = "98772" + stamp; R2, B2 = create("s5", "N8 Held Guest", P2)
c, b = checkin("s5", "N8 Held Guest", P2, R2, B2); O2 = (b.get("data") or {}).get("order_id"); print("  check-in", c, "order", O2)
c, ch = extend("s5_held", O2, "N8 held"); print("  LR charge after extend:", lr_charge(R2))
tab("s5", O2, ch.get("balance_due"), "N8 Held Guest", P2); print("  board after TAB:", board().get(ROOM))

print("== 6 restore defaults"); settings_set("s6_restore", {"allow_early_checkin": False, "extend_rate_mode": "calendar", "auto_print_checkin_receipt": False}); settings_get("s6")
