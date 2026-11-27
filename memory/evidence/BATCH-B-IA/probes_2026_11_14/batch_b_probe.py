# BATCH-B IA probe (owner-approved 2026-11-14: read + test-order writes). Token in /tmp/tokb, never printed. Output masked.
import json, sys, time, requests

B = "https://preprod.mygenie.online"
import os


def _login():
    r = requests.post(B + "/api/v1/auth/vendoremployee/common-login", timeout=60,
                      headers={"Accept": "application/json", "X-localization": "en"},
                      json={"email": os.environ["PROBE_POS_EMAIL"], "password": os.environ["PROBE_POS_PASSWORD"]})
    return r.json()["token"]


T = _login()
H = {"Authorization": f"Bearer {T}", "Accept": "application/json", "X-localization": "en"}  # token from common-login
OUT = "/app/memory/evidence/BATCH-B-IA/probes_2026_11_14/"
SENS = ["token", "password", "email", "phone", "mobile", "contact", "gst_number", "upi"]


def mask(o):
    if isinstance(o, dict):
        return {k: ("***" if any(s in k.lower() for s in SENS) and v not in (None, "", 0) else mask(v)) for k, v in o.items()}
    if isinstance(o, list):
        return [mask(x) for x in o]
    return o


def call(method, path, name, **kw):
    r = requests.request(method, B + path, headers=H, timeout=120, **kw)
    try:
        body = r.json()
    except Exception:
        body = r.text[:3000]
    json.dump({"status": r.status_code, "body": mask(body)}, open(OUT + name, "w"), indent=1)
    print(name, r.status_code, len(json.dumps(body)))
    return r.status_code, body


if __name__ == "__main__":
    step = sys.argv[1]
    d = time.strftime("%Y-%m-%d")
    if step == "reads":
        call("GET", "/api/v1/vendoremployee/profile", "02_profile.json")
        call("GET", "/api/v2/vendoremployee/restaurant-settings/settings-list", "03_settings_list.json")
        call("POST", "/api/v1/vendoremployee/pos/tap-waiter-list", "04_credit_customer_list.json", json={})
        call("POST", "/api/v1/vendoremployee/daily-order-report-details-combined", "05_order_beta_combined.json",
             json={"from": "2026-11-01", "to": d})
        call("POST", "/api/v1/vendoremployee/waiter/get-settlement-report", "06_settlement_report.json",
             json={"date_from": time.strftime("%d-%m-%Y"), "date_to": time.strftime("%d-%m-%Y")})

    elif step == "place":  # place <payment_type> <tag> [payment_method payment_status]  (BUG-672 mirrors placeOrderWithPayment)
        ptype, tag = sys.argv[2], sys.argv[3]
        pm = sys.argv[4] if len(sys.argv) > 4 else "pending"
        ps = sys.argv[5] if len(sys.argv) > 5 else "unpaid"
        cart = [{"food_id": 246734, "quantity": 2, "price": 200, "variant": "", "add_on_ids": [], "add_on_qtys": [],
                 "variations": [], "add_ons": [], "station": "KDS", "food_amount": 400, "variation_amount": 0,
                 "addon_amount": 0, "gst_amount": "20.00", "vat_amount": "0.00", "discount_amount": "0.00",
                 "complementary_price": 0.0, "is_complementary": "No", "complementary_reason": "", "food_level_notes": ""}]
        payload = {"user_id": "", "restaurant_id": 644, "table_id": "0", "order_type": "takeaway",
                   "cust_name": "TEST_BATCHB_PROBE", "cust_mobile": "", "cust_country_code": "+91", "cust_email": "",
                   "cust_dob": "", "cust_anniversary": "", "cust_membership_id": "", "order_note": f"TEST BATCH-B IA PROBE {tag}",
                   "payment_method": pm, "payment_status": ps, "payment_type": ptype, "transaction_id": "",
                   "print_kot": "No", "auto_dispatch": "No", "scheduled": 0, "schedule_at": None,
                   "order_amount": 420, "order_sub_total_amount": 400, "order_sub_total_without_tax": 400,
                   "tax_amount": 20, "total_gst_tax_amount": 20, "total_vat_tax_amount": 0, "round_up": 0,
                   "service_tax": 0, "service_gst_tax_amount": 0, "tip_tax_amount": 0, "tip_amount": 0, "delivery_charge": 0,
                   "discount_type": None, "self_discount": 0, "discount_for": None, "coupon_code": "", "coupon_discount": 0,
                   "coupon_title": None, "coupon_type": None, "order_discount": 0, "used_loyalty_point": 0,
                   "loyalty_points_used": 0, "loyalty_discount": 0, "use_wallet_balance": 0, "paid_room": None,
                   "room_id": None, "address_id": None, "discount_member_category_id": 0,
                   "discount_member_category_name": None, "usage_id": None, "cart": cart, "printer_agent": [],
                   "delivery_address": None}
        call("POST", "/api/v2/vendoremployee/order/place-order", f"20_place_{tag}.json",
             files={"data": (None, json.dumps(payload))})

    elif step == "pay":  # pay <order_id> <mode> <tag> [txn] [payment_type]
        oid, mode, tag = sys.argv[2], sys.argv[3], sys.argv[4]
        txn = sys.argv[5] if len(sys.argv) > 5 else ""
        ptype = sys.argv[6] if len(sys.argv) > 6 else ""
        is_tab = mode.lower() in ("tab", "credit")
        p = {"order_id": str(oid), "payment_mode": mode, "payment_amount": 420,
             "payment_status": "success" if is_tab else "paid", "transaction_id": txn, "billing_auto_bill_print": "No",
             "food_detail": [], "waiter_id": "", "restaurant_name": "CAFE 103", "email": "",
             "order_sub_total_amount": 400, "order_sub_total_without_tax": 400, "total_gst_tax_amount": 20, "gst_tax": 20,
             "vat_tax": 0, "grant_amount": 420, "round_up": 0, "service_tax": 0, "service_gst_tax_amount": 0,
             "tip_amount": 0, "tip_tax_amount": 0, "delivery_charge": 0, "self_discount": 0, "discount_for": None,
             "coupon_code": "", "coupon_discount": 0, "coupon_title": "", "coupon_type": "", "comm_discount": 0,
             "discount_type": "", "order_discount_type": "Percent", "order_discount": 0, "discount_value": 0,
             "discount_member_category_id": 0, "discount_member_category_name": "", "used_loyalty_point": 0,
             "loyalty_points_used": 0, "loyalty_discount": 0, "loyalty_redemption_id": None, "use_wallet_balance": 0,
             "paid_room": "", "usage_id": "", "cust_name": "TEST_BATCHB_PROBE", "cust_mobile": "",
             "cust_country_code": "+91", "cust_membership_id": "",
             "name": "TEST_BATCHB_CREDIT" if is_tab else "", "mobile": "9000000001" if is_tab else "",
             "crm_customer_id": "", "custGST": "", "custGSTName": ""}
        if ptype:
            p["payment_type"] = ptype
        if mode == "partial":
            p["partial_payments"] = [{"payment_mode": "cash", "payment_amount": 220, "transaction_id": ""},
                                     {"payment_mode": "upi", "payment_amount": 200, "transaction_id": txn}]
        call("POST", "/api/v2/vendoremployee/order/order-bill-payment", f"21_pay_{tag}.json", json=p)

    elif step == "unpaid":  # unpaid <order_id> <tag>
        call("POST", "/api/v2/vendoremployee/make-order-unpaid", f"22_unpaid_{sys.argv[3]}.json",
             json={"order_id": int(sys.argv[2])})

    elif step == "single":  # single <order_id> <tag>
        call("POST", "/api/v2/vendoremployee/get-single-order-new", f"23_single_{sys.argv[3]}.json",
             json={"order_id": sys.argv[2]})

    elif step == "cancel":  # cancel <order_id>
        call("PUT", "/api/v2/vendoremployee/order/order-status-update", f"29_cancel_{sys.argv[2]}.json",
             json={"order_id": int(sys.argv[2]), "role_name": "Manager", "order_status": "cancelled",
                   "cancellation_reason": "Guest Changed the order", "cancellation_note": "BATCH-B IA probe cleanup",
                   "printer_agent": []})
