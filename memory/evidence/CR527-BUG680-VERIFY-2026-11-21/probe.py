# CR-527 + BUG-680 backend verification probe (INVESTIGATION role, 2026-11-21).
# Token read from /tmp/tok, never printed. Writes are reversible and cleaned up.
import json, sys, time, requests

B = "https://preprod.mygenie.online"
T = open('/tmp/tok').read().strip()
H = {"Authorization": f"Bearer {T}", "Accept": "application/json", "X-localization": "en"}
OUT = "/app/memory/evidence/CR527-BUG680-VERIFY-2026-11-21/"
step = sys.argv[1]


def save(name, r):
    try:
        body = r.json()
    except Exception:
        body = r.text[:3000]
    json.dump({"status": r.status_code, "body": body}, open(OUT + name, "w"), indent=1)
    return body


def orders_of(body):
    o = body.get("orders") if isinstance(body, dict) else body
    return o or []


if step == "ctx":
    # profile -> restaurant_id
    r = requests.get(B + "/api/v1/vendoremployee/profile", headers=H, timeout=90)
    p = save("ctx_profile.json", r)
    print("profile status", r.status_code)
    # products -> a valid food_id
    r2 = requests.get(B + "/api/v1/vendoremployee/get-products-list", headers=H, timeout=90)
    save("ctx_products.json", r2)
    print("products status", r2.status_code)
    # v2 owner list ids
    r3 = requests.get(B + "/api/v2/vendoremployee/pos/employee-orders-list?role_name=Owner", headers=H, timeout=90)
    ords = orders_of(r3.json())
    json.dump([{"id": o.get("id"), "rid": o.get("restaurant_order_id"), "status": o.get("order_status"),
                "amt": o.get("order_amount"), "diner": o.get("diner_name")} for o in ords],
              open(OUT + "ctx_v2_owner_ids.json", "w"), indent=1)
    print("v2 owner ids:", [(o.get("id"), o.get("restaurant_order_id"), o.get("order_status")) for o in ords[:12]])

elif step == "get_single":
    oid = sys.argv[2]
    r = requests.post(B + "/api/v2/vendoremployee/get-single-order-new", headers=H,
                      json={"order_id": int(oid)}, timeout=90)
    body = save("get_single_%s.json" % oid, r)
    arr = body.get("orders") if isinstance(body, dict) else None
    print("get-single-order-new status", r.status_code, "orders_len", len(arr or []))
    if arr:
        o = arr[0]
        print("SCHEMA diner_name present:", "diner_name" in o, "diner_mobile present:", "diner_mobile" in o)
        print("values diner_name=", o.get("diner_name"), "diner_mobile=", o.get("diner_mobile"),
              "user_name=", o.get("user_name"), "order_amount=", o.get("order_amount"))

elif step == "read_credit_list":
    cid = sys.argv[2]
    r = requests.get(B + f"/api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={cid}", headers=H, timeout=90)
    body = save("read_credit_list_%s.json" % cid, r)
    rows = body
    if isinstance(body, dict):
        rows = body.get("data") or body.get("records") or body.get("orders") or []
        if isinstance(rows, dict):
            rows = rows.get("records") or rows.get("orders") or []
    rows = rows or []
    print("tap-customer-record-list status", r.status_code, "rows", len(rows))
    if rows:
        o = rows[0]
        print("SCHEMA diner_name present:", "diner_name" in o, "diner_mobile present:", "diner_mobile" in o)

# ---------- reversible write test ----------
elif step == "place":
    rid = int(sys.argv[2]); food_id = int(sys.argv[3]); price = float(sys.argv[4])
    gst = round(price * 0.05, 2)
    cart = [{"food_id": food_id, "quantity": 1, "price": price, "variant": "", "add_on_ids": [], "add_on_qtys": [],
             "variations": [], "add_ons": [], "station": "KDS", "food_amount": price, "variation_amount": 0,
             "addon_amount": 0, "gst_amount": "%.2f" % gst, "vat_amount": "0.00", "discount_amount": "0.00",
             "complementary_price": 0.0, "is_complementary": "No", "complementary_reason": "",
             "food_level_notes": "CR527-BUG680 VERIFY PROBE"}]
    payload = {"user_id": "", "restaurant_id": rid, "table_id": "0", "order_type": "takeaway",
               "cust_name": "VERIFY_HOLDER", "cust_mobile": "", "cust_country_code": "+91", "cust_email": "",
               "cust_dob": "", "cust_anniversary": "", "cust_membership_id": "",
               "diner_name": "VERIFY_DINER", "diner_mobile": "9800000002",
               "order_note": "CR527-BUG680 VERIFY PROBE",
               "payment_method": "pending", "payment_status": "unpaid", "payment_type": "postpaid", "transaction_id": "",
               "print_kot": "No", "auto_dispatch": "No", "scheduled": 0, "schedule_at": None,
               "order_amount": price + gst, "order_sub_total_amount": price, "order_sub_total_without_tax": price,
               "tax_amount": gst, "total_gst_tax_amount": gst, "total_vat_tax_amount": 0, "round_up": 0,
               "service_tax": 0, "service_gst_tax_amount": 0, "tip_tax_amount": 0, "tip_amount": 0, "delivery_charge": 0,
               "discount_type": None, "self_discount": 0, "discount_for": None, "coupon_code": "", "coupon_discount": 0,
               "coupon_title": None, "coupon_type": None, "order_discount": 0, "used_loyalty_point": 0,
               "loyalty_points_used": 0, "loyalty_discount": 0, "use_wallet_balance": 0, "paid_room": None,
               "room_id": None, "address_id": None, "discount_member_category_id": 0,
               "discount_member_category_name": None, "usage_id": None, "cart": cart, "printer_agent": [],
               "delivery_address": None}
    r = requests.post(B + "/api/v2/vendoremployee/order/place-order", headers=H,
                      files={"data": (None, json.dumps(payload))}, timeout=120)
    save("w1_place.json", r)
    print("place status", r.status_code, json.dumps(save.__self__ if False else {})[:0] or str(r.json())[:400] if r.headers.get("content-type","").startswith("application/json") else r.text[:400])

elif step == "find":
    r = requests.get(B + "/api/v2/vendoremployee/pos/employee-orders-list?role_name=Owner", headers=H, timeout=90)
    mine = [o for o in orders_of(r.json()) if "VERIFY PROBE" in str(o.get("order_note", ""))
            or o.get("diner_name") == "VERIFY_DINER"]
    json.dump(mine, open(OUT + "w2_find.json", "w"), indent=1)
    for o in mine:
        print("FOUND id=", o.get("id"), "rid=", o.get("restaurant_order_id"), "status=", o.get("order_status"),
              "amt=", o.get("order_amount"), "diner=", o.get("diner_name"), "/", o.get("diner_mobile"),
              "holder=", o.get("user_name"))

elif step == "discount_apply":
    oid = int(sys.argv[2]); dtype = sys.argv[3]; amt = float(sys.argv[4])
    r = requests.post(B + "/api/v2/vendoremployee/order/order-discount-manage", headers=H,
                      json={"order_id": oid, "discount_amount": amt, "discount_type": dtype}, timeout=90)
    save("w3_discount_apply.json", r)
    print("discount_apply status", r.status_code, str(r.text)[:300])

elif step == "discount_remove":
    oid = int(sys.argv[2]); dtype = sys.argv[3]
    r = requests.post(B + "/api/v2/vendoremployee/order/order-discount-manage", headers=H,
                      json={"order_id": oid, "discount_amount": 0, "discount_type": dtype}, timeout=90)
    save("w4_discount_remove.json", r)
    print("discount_remove status", r.status_code, str(r.text)[:300])

elif step == "cancel":
    oid = int(sys.argv[2])
    r = requests.put(B + "/api/v2/vendoremployee/order/order-status-update", headers=H,
                     json={"order_id": oid, "role_name": "Owner", "order_status": "cancelled",
                           "cancellation_reason": "Test order", "cancellation_note": "CR527-BUG680 verify cleanup",
                           "printer_agent": []}, timeout=90)
    save("w5_cancel.json", r)
    print("cancel status", r.status_code, str(r.text)[:300])

else:
    print("unknown step", step)
