#!/usr/bin/env python3
"""CR-385 re_block Gate-4 curl probe (backend plan reblock_fe.md) — saves every raw response next to this file."""
import json, os, sys, time, requests

H = "https://preprod.mygenie.online"
D = os.path.dirname(os.path.abspath(__file__))
CIN, COUT, COUT2 = sys.argv[1], sys.argv[2], sys.argv[3]          # stay window
TABLE_SUITE, TABLE_DEST = int(sys.argv[4]), int(sys.argv[5])      # physical suite tables
PHONE = "98765002" + time.strftime("%S")

s = requests.Session()
tok = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": "owner@thegoankitchen.com", "password": "Qplazm@10"},
             headers={"X-localization": "en"}).json()["token"]
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})

def save(name, r):
    try: body = r.json()
    except Exception: body = {"_raw": r.text[:2000]}
    json.dump({"http": r.status_code, "body": body}, open(f"{D}/{name}.json", "w"), indent=1, default=str)
    print(f"[{name}] HTTP {r.status_code} :: {json.dumps(body, default=str)[:700]}")
    return body

def lr(res_id):
    b = s.get(f"{H}/api/v2/vendoremployee/aiosell/local-reservations", params={"start_date": "2026-09-01", "end_date": "2026-12-31", "view": "all"}).json()
    return next((r for r in b["data"]["reservations"] if r["id"] == res_id), None), b["data"]["counts"]

def folio(order_id):
    return s.post(f"{H}/api/v2/vendoremployee/get-single-order-new", json={"order_id": int(order_id)}).json()

def board():
    b = s.get(f"{H}/api/v2/vendoremployee/aiosell/room-status-board").json()["data"]["rooms"]
    return {r["restaurant_table_id"]: (r["display_status"], r["manual_status"], r["is_occupied"], (r.get("guest") or {}).get("name")) for r in b}

RES = f"{H}/api/v2/vendoremployee/aiosell/direct-reservation"
step = sys.argv[6] if len(sys.argv) > 6 else "all"

if step in ("all", "1"):
    # §1 BQ-16 omit rate
    b = save("s1_bq16_omit_rate", s.post(RES, json={"guest": {"name": "BQ16 Guest", "phone": "9876500100"}, "checkin": CIN, "checkout": COUT2, "adults": 2, "children": 0,
                                               "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}]}))
    rid = (b.get("data") or {}).get("reservation", {}).get("id")
    if rid: save("s1_cancel", s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{rid}/cancel", json={"reason": "probe"}))
    # §1b no rates → 422
    b = save("s1b_bq16_no_rates", s.post(RES, json={"guest": {"name": "No Rate Guest", "phone": "9876500999"}, "checkin": "2027-01-01", "checkout": "2027-01-03",
                                               "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}]}))
    rid = ((b.get("data") or {}).get("reservation") or {}).get("id")
    if rid: save("s1b_cancel_unexpected", s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{rid}/cancel", json={"reason": "probe"}))

if step in ("all", "2"):
    # §2 lifecycle booking + advance
    b = save("s2_create_advance", s.post(RES, json={"guest": {"name": "Gate4 Guest", "phone": PHONE}, "checkin": CIN, "checkout": COUT, "adults": 2, "children": 0,
                                              "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}],
                                              "advance": {"amount": 1000, "method": "upi", "reference": "GATE4ADV"}}))
    res = b["data"]["reservation"]; RES_ID, BOOKING_ID = res["id"], res["booking_id"]
    print("RES_ID", RES_ID, "BOOKING_ID", BOOKING_ID, "charge", res.get("charge"))
    json.dump({"RES_ID": RES_ID, "BOOKING_ID": BOOKING_ID, "ORDER_ID": None, "PHONE": PHONE}, open(f"{D}/ids.json", "w"))

if step in ("all", "3"):
    ids = json.load(open(f"{D}/ids.json")); RES_ID, BOOKING_ID, PHONE = ids["RES_ID"], ids["BOOKING_ID"], ids["PHONE"]
    tag = sys.argv[7] if len(sys.argv) > 7 else ""
    # §3 check-in paid upgrade to suite table — real FE body (pmsService.pmsCheckIn) + backend upgrade fields
    form = {"email": "", "booking_details": "", "booking_for": "Individual", "room_price": "0", "order_note": "", "firm_name": "", "firm_gst": "", "children_name": "",
            "name2": "", "id_type2": "", "name3": "", "id_type3": "", "name4": "", "id_type4": "","phone": PHONE, "name": "Gate4 Guest", "booking_type": "Direct", "booking_id": BOOKING_ID, "aiosell_reservation_id": str(RES_ID), "id_type": "Aadhaar",
            "room_id[]": str(TABLE_SUITE), "checkin_date": CIN, "checkout_date": COUT, "order_amount": "0", "advance_payment": "0", "balance_payment": "0", "gst_tax": "0",
            "total_adult": "2", "total_children": "0", "payment_method": "Cash", "upgrade_type": "paid", "upgrade_amount": "1500", "upgrade_reason": "Suite upgrade probe"}
    b = save(f"s3_checkin_upgrade{tag}", s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in", files={k: (None, v) for k, v in form.items()}))
    r, counts = lr(RES_ID); json.dump(r, open(f"{D}/s3_lr{tag}.json", "w"), indent=1)
    ORDER_ID = (b.get("data") or {}).get("order_id") or (r["rooms"][0].get("order_id") if r else None)
    print("ORDER_ID", ORDER_ID, "\nLR after check-in:", json.dumps({k: r.get(k) for k in ["operational_status", "amount_before_tax", "amount_after_tax", "advance_payment", "balance_payment", "charge"]}), "\ncounts", counts)
    if ORDER_ID:
        f = folio(ORDER_ID); json.dump(f, open(f"{D}/s3_folio{tag}.json", "w"), indent=1)
        ri = f["orders"][0]["room_info"]
        print("FOLIO room_info:", json.dumps({k: ri.get(k) for k in ["room_price", "gst_tax", "advance_payment", "balance_payment", "order_amount", "payment_mode"]}), "\nsummary:", json.dumps(ri.get("room_payment_summary"))[:600])
    print("BOARD", board())
    json.dump({"RES_ID": RES_ID, "BOOKING_ID": BOOKING_ID, "ORDER_ID": ORDER_ID, "PHONE": PHONE}, open(f"{D}/ids.json", "w"))

if step in ("all", "4"):
    ids = json.load(open(f"{D}/ids.json")); ORDER_ID, RES_ID, PHONE = ids["ORDER_ID"], ids["RES_ID"], ids["PHONE"]
    EXT = f"{H}/api/v2/vendoremployee/pos/room-extend-stay"
    # §4 extend +1 night, payment 500 cash, no discount
    save("s4_extend", s.post(EXT, json={"order_id": int(ORDER_ID), "new_checkout_date": COUT2, "reason": "Gate4 extra night", "payment": {"amount": 500, "method": "cash"}}))
    r, _ = lr(RES_ID); print("LR after extend:", json.dumps(r.get("charge")))
    # §5 move
    save("s5_move", s.post(EXT, json={"order_id": int(ORDER_ID), "new_checkout_date": COUT2, "new_restaurant_table_id": TABLE_DEST, "reason": "Gate4 move"}))
    bd = board(); json.dump(bd, open(f"{D}/s5_board.json", "w")); print("BOARD after move", bd)
    r, _ = lr(RES_ID); json.dump(r, open(f"{D}/s5_lr.json", "w"), indent=1); print("LR after move:", json.dumps(r.get("charge")), r["rooms"][0].get("restaurant_table_id"))
    f = folio(ORDER_ID); json.dump(f, open(f"{D}/s5_folio.json", "w"), indent=1); ri = f["orders"][0]["room_info"]
    print("FOLIO after move:", json.dumps({k: ri.get(k) for k in ["room_price", "gst_tax", "advance_payment", "balance_payment"]}), json.dumps(ri.get("room_payment_summary"))[:700])
    json.dump({**ids, "BALANCE_DUE": r["charge"]["balance_due"]}, open(f"{D}/ids.json", "w"))

if step in ("all", "6"):
    ids = json.load(open(f"{D}/ids.json")); ORDER_ID, RES_ID, PHONE, BAL = ids["ORDER_ID"], ids["RES_ID"], ids["PHONE"], ids["BALANCE_DUE"]
    body = {"order_id": str(ORDER_ID), "payment_mode": "TAB", "payment_amount": BAL, "payment_status": "success", "transaction_id": "", "billing_auto_bill_print": "No", "food_detail": [],
            "waiter_id": 5117, "restaurant_name": "The Goan Kitchen", "email": "", "order_sub_total_amount": 0, "order_sub_total_without_tax": 0, "total_gst_tax_amount": 0, "gst_tax": 0, "vat_tax": 0,
            "grant_amount": BAL, "order_amount": BAL, "round_up": 0, "service_tax": 0, "service_gst_tax_amount": 0, "tip_amount": 0, "tip_tax_amount": 0, "delivery_charge": 0, "self_discount": 0,
            "discount_for": None, "coupon_code": "", "coupon_discount": 0, "coupon_title": "", "coupon_type": "", "comm_discount": 0, "discount_type": "", "order_discount_type": "Percent",
            "discount_value": 0, "discount_member_category_id": 0, "discount_member_category_name": "", "used_loyalty_point": 0, "loyalty_points_used": 0, "loyalty_discount": 0,
            "loyalty_redemption_id": None, "use_wallet_balance": 0, "paid_room": "yes", "usage_id": "", "cust_name": "Gate4 Guest", "cust_mobile": PHONE, "cust_membership_id": "",
            "name": "Gate4 Guest", "mobile": PHONE, "crm_customer_id": "", "custGST": "", "custGSTName": ""}   # NO order_discount key (§6)
    save("s6_tab_no_order_discount", s.post(f"{H}/api/v2/vendoremployee/order/order-bill-payment", json=body))
    r, counts = lr(RES_ID); json.dump(r, open(f"{D}/s6_lr.json", "w"), indent=1)
    print("LR after TAB:", r.get("operational_status"), json.dumps(r.get("charge")), json.dumps({k: r["rooms"][0].get(k) for k in ["line_status", "order_payment_status", "checked_out_at"]}), counts)
    f = folio(ORDER_ID); json.dump(f, open(f"{D}/s6_folio.json", "w"), indent=1); o = f["orders"][0]; ri = o["room_info"]
    print("ORDER:", json.dumps({k: o.get(k) for k in ["payment_status", "payment_method", "order_status", "order_amount", "collect_bill"]}))
    print("D8 ledger:", json.dumps(ri.get("room_payment_summary"))[:900])
    bd = board(); json.dump(bd, open(f"{D}/s6_board.json", "w")); print("BOARD after TAB", bd)
