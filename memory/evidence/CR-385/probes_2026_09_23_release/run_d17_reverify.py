# CR-385 P5 Session A — D17 / BUG-412 re-verify (MUTATING; owner "Phase 5 GO" 2026-09-23). Legs A/B/C sequential on r4/r5; TAB settle + cancel in finally. Credentials from memory only.
import re, json, time, datetime, requests, traceback
sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
H = open('/app/frontend/.env').read().split('REACT_APP_API_BASE_URL=')[1].split('\n')[0].strip().rstrip('/')
OUT = '/app/memory/evidence/CR-385/probes_2026_09_23_release/d17_reverify.json'
FORBIDDEN = re.compile(r"rate_per_night|amount_after_tax|new_room_price")
R4, R5 = 8525, 8527

s = requests.Session()
tok = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": EMAIL, "password": PASSWORD}, headers={"X-localization": "en"}).json()["token"]
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})
res = {"ts": datetime.datetime.now(datetime.timezone.utc).isoformat(), "legs": {}, "cleanup": [], "forbidden_key_hits": []}
created = []  # (res_id, order_id)

def lr(res_id):
    b = s.get(f"{H}/api/v2/vendoremployee/aiosell/local-reservations", params={"start_date": "2026-09-01", "end_date": "2026-12-31", "view": "all"}).json()
    return next((r for r in b["data"]["reservations"] if r["id"] == res_id), None), b["data"]["meta"]["business_date"]

def folio(order_id):
    return s.post(f"{H}/api/v2/vendoremployee/get-single-order-new", json={"order_id": int(order_id)}).json()

def board():
    return {r["table_no"]: r["display_status"] for r in s.get(f"{H}/api/v2/vendoremployee/aiosell/room-status-board").json()["data"]["rooms"]}

def check_forbidden(tag, body):
    hits = [k for k in ("rate_per_night", "amount_after_tax", "new_room_price") if k in json.dumps(body)]
    if hits: res["forbidden_key_hits"].append({tag: hits})

def leg(tag, table, book_adv, ci_adv, ci_method):
    bd = board(); _, bdate = lr(0)
    cin = bdate; cout = (datetime.date.fromisoformat(bdate) + datetime.timedelta(days=1)).isoformat()
    phone = "98765" + str(int(time.time()))[-5:]
    body = {"guest": {"name": f"P5 QA D17 {tag}", "phone": phone}, "checkin": cin, "checkout": cout, "adults": 1, "children": 0,
            "rooms": [{"room_code": "suite", "rateplan_code": "suite-s-ep", "rooms_count": 1}]}
    if book_adv: body["advance"] = {"amount": book_adv, "method": "upi", "reference": f"P5D17{tag}"}
    check_forbidden(f"{tag}_direct_body", body)
    r = s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation", json=body); d = r.json()
    rv = d["data"]["reservation"]; rid, bid = rv["id"], rv["booking_id"]; created.append([rid, None])
    L = {"room": table, "board_before": bd, "direct_http": r.status_code, "res_id": rid, "booking_id": bid, "direct_charge": rv.get("charge")}
    form = {"booking_type": "Direct", "booking_id": bid, "aiosell_reservation_id": str(rid), "name": f"P5 QA D17 {tag}", "phone": phone, "email": "",
            "room_id[0]": str(table), "id_type": "Aadhaar", "total_adult": "1", "total_children": "0", "children_name": "",
            "name2": "", "id_type2": "", "name3": "", "id_type3": "", "name4": "", "id_type4": "", "checkin_date": cin, "checkout_date": cout,
            "booking_details": "", "booking_for": "Individual", "order_amount": "0", "room_price": "0", "advance_payment": str(ci_adv), "balance_payment": "0",
            "payment_method": ci_method if ci_adv > 0 else "", "order_note": "", "gst_tax": "0", "firm_name": "", "firm_gst": "", "upgrade_type": "none", "upgrade_amount": "0", "upgrade_reason": ""}
    check_forbidden(f"{tag}_checkin_form", form)
    r = s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in", files={k: (None, v) for k, v in form.items()}); d = r.json()
    ch = d.get("charge") or (d.get("data") or {}).get("charge") or {}
    oid = (d.get("data") or {}).get("order_id"); created[-1][1] = oid
    row, _ = lr(rid); f = folio(oid); ri = f["orders"][0]["room_info"]
    L.update({"checkin_http": r.status_code, "order_id": oid, "resp_charge": ch, "lr_charge": row.get("charge"), "lr_status": row.get("operational_status"),
              "folio_advance": ri.get("advance_payment"), "folio_mode": ri.get("payment_mode"),
              "ledger": [(x.get("amount"), x.get("payment_mode") or x.get("method"), x.get("type") or x.get("kind")) for x in ((ri.get("room_payment_summary") or {}).get("payments") or (ri.get("room_payment_summary") or {}).get("ledger") or [])] if isinstance(ri.get("room_payment_summary"), dict) else ri.get("room_payment_summary")})
    exp = book_adv + ci_adv
    L["expected_advance_cumulative"] = exp
    L["PASS"] = (r.status_code == 200 and ch.get("advance_payment") == exp and (row.get("charge") or {}).get("advance_payment") == exp
                 and ch.get("balance_due") == ch.get("total_with_gst") - exp)
    res["legs"][tag] = L; print(tag, "PASS" if L["PASS"] else "FAIL", json.dumps({k: L[k] for k in ["order_id", "resp_charge", "expected_advance_cumulative"]}))
    settle(rid, oid, f"P5 QA D17 {tag}", phone, ch.get("balance_due"))

def settle(rid, oid, name, phone, bal):
    body = {"order_id": str(oid), "payment_mode": "TAB", "payment_amount": bal, "payment_status": "success", "transaction_id": "", "billing_auto_bill_print": "No", "food_detail": [],
            "waiter_id": 5117, "restaurant_name": "The Goan Kitchen", "email": "", "order_sub_total_amount": 0, "order_sub_total_without_tax": 0, "total_gst_tax_amount": 0, "gst_tax": 0, "vat_tax": 0,
            "grant_amount": bal, "order_amount": bal, "round_up": 0, "service_tax": 0, "service_gst_tax_amount": 0, "tip_amount": 0, "tip_tax_amount": 0, "delivery_charge": 0, "self_discount": 0,
            "discount_for": None, "coupon_code": "", "coupon_discount": 0, "coupon_title": "", "coupon_type": "", "comm_discount": 0, "discount_type": "", "order_discount_type": "Percent",
            "discount_value": 0, "discount_member_category_id": 0, "discount_member_category_name": "", "used_loyalty_point": 0, "loyalty_points_used": 0, "loyalty_discount": 0,
            "loyalty_redemption_id": None, "use_wallet_balance": 0, "paid_room": "yes", "usage_id": "", "cust_name": name, "cust_mobile": phone, "cust_membership_id": "",
            "name": name, "mobile": phone, "crm_customer_id": "", "custGST": "", "custGSTName": ""}
    r = s.post(f"{H}/api/v2/vendoremployee/order/order-bill-payment", json=body)
    row, _ = lr(rid)
    res["cleanup"].append({"res_id": rid, "order_id": oid, "tab_http": r.status_code, "msg": str(r.json().get("message"))[:80], "lr_status_after": row.get("operational_status"), "balance_due_after": (row.get("charge") or {}).get("balance_due")})
    print("  settled", rid, oid, r.status_code, row.get("operational_status"))

try:
    res["settings_before"] = {k: s.get(f"{H}/api/v2/vendoremployee/restaurant-settings/settings-list").json()["data"]["basic"].get(k) for k in ["allow_early_checkin", "extend_rate_mode", "auto_print_checkin_receipt"]}
    leg("A", R4, 0, 500, "Card")
    leg("B", R5, 1000, 0, "")
    leg("C", R4, 1000, 500, "UPI")
except Exception:
    res["error"] = traceback.format_exc()[-1500:]; print(res["error"])
finally:
    for rid, oid in created:
        row, _ = lr(rid)
        if row and row.get("operational_status") == "pending":
            r = s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{rid}/cancel", json={"reason": "P5 QA cleanup"})
            res["cleanup"].append({"res_id": rid, "cancel_http": r.status_code})
        elif row and row.get("operational_status") == "in_house" and oid:
            settle(rid, oid, "P5 QA D17", "9876500000", (row.get("charge") or {}).get("balance_due"))
    res["board_after"] = board()
    res["settings_after"] = {k: s.get(f"{H}/api/v2/vendoremployee/restaurant-settings/settings-list").json()["data"]["basic"].get(k) for k in ["allow_early_checkin", "extend_rate_mode", "auto_print_checkin_receipt"]}
    res["ALL_PASS"] = all(L.get("PASS") for L in res["legs"].values()) and len(res["legs"]) == 3 and not res["forbidden_key_hits"]
    json.dump(res, open(OUT, "w"), indent=1, default=str)
    print("ALL_PASS", res["ALL_PASS"], "board_after", res["board_after"], "forbidden", res["forbidden_key_hits"])
