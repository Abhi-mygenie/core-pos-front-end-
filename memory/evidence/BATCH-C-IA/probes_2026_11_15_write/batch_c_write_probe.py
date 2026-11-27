# BATCH-C IA write probe (owner-approved 2026-11-15: test-order writes). Token never printed. Output masked.
import json, os, sys, time, requests

B = "https://preprod.mygenie.online"
OUT = "/app/memory/evidence/BATCH-C-IA/probes_2026_11_15_write/"
SENS = ["token", "password", "email", "phone", "mobile", "contact", "gst_number", "upi"]
FOOD = 246734


def _login():
    r = requests.post(B + "/api/v1/auth/vendoremployee/common-login", timeout=60,
                      headers={"Accept": "application/json", "X-localization": "en"},
                      json={"email": os.environ["PROBE_EMAIL"], "password": os.environ["PROBE_PASSWORD"]})
    return r.json()["token"]


H = {"Authorization": f"Bearer {_login()}", "Accept": "application/json", "X-localization": "en"}


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
    json.dump({"status": r.status_code, "at_utc": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime()), "body": mask(body)},
              open(OUT + name, "w"), indent=1)
    print(name, r.status_code, json.dumps(mask(body))[:300])
    return r.status_code, body


def cart(qty):
    return [{"food_id": FOOD, "quantity": qty, "price": 200, "variant": "", "add_on_ids": [], "add_on_qtys": [],
             "variations": [], "add_ons": [], "station": "KDS", "food_amount": 200 * qty, "variation_amount": 0,
             "addon_amount": 0, "gst_amount": f"{10 * qty:.2f}", "vat_amount": "0.00", "discount_amount": "0.00",
             "complementary_price": 0.0, "is_complementary": "No", "complementary_reason": "", "food_level_notes": ""}]


def totals(qty):
    return {"order_amount": 210 * qty, "order_sub_total_amount": 200 * qty, "order_sub_total_without_tax": 200 * qty,
            "tax_amount": 10 * qty, "total_gst_tax_amount": 10 * qty, "total_vat_tax_amount": 0, "round_up": 0,
            "service_tax": 0, "service_gst_tax_amount": 0, "tip_tax_amount": 0, "tip_amount": 0, "delivery_charge": 0}


def place(tag, qty=2, pm="pending", ps="unpaid", ptype="postpaid"):
    p = {"user_id": "", "restaurant_id": 644, "table_id": "0", "order_type": "takeaway",
         "cust_name": "TEST_BATCHC_PROBE", "cust_mobile": "", "cust_country_code": "+91", "cust_email": "",
         "cust_dob": "", "cust_anniversary": "", "cust_membership_id": "", "order_note": f"TEST BATCH-C IA PROBE {tag}",
         "payment_method": pm, "payment_status": ps, "payment_type": ptype, "transaction_id": "",
         "print_kot": "No", "auto_dispatch": "No", "scheduled": 0, "schedule_at": None, **totals(qty),
         "discount_type": None, "self_discount": 0, "discount_for": None, "coupon_code": "", "coupon_discount": 0,
         "coupon_title": None, "coupon_type": None, "order_discount": 0, "used_loyalty_point": 0,
         "loyalty_points_used": 0, "loyalty_discount": 0, "use_wallet_balance": 0, "paid_room": None,
         "room_id": None, "address_id": None, "discount_member_category_id": 0,
         "discount_member_category_name": None, "usage_id": None, "cart": cart(qty), "printer_agent": [],
         "delivery_address": None}
    return call("POST", "/api/v2/vendoremployee/order/place-order", f"10_place_{tag}.json",
                files={"data": (None, json.dumps(p))})


def update(oid, tag, total_qty):
    p = {"order_id": str(oid), "order_type": "takeaway", "cust_name": "TEST_BATCHC_PROBE", "cust_mobile": "",
         "cust_country_code": "+91", "cust_membership_id": "", "order_note": "TEST BATCH-C IA PROBE edit",
         "payment_method": "pending", "payment_status": "unpaid", "payment_type": "postpaid", "print_kot": "No",
         "auto_dispatch": "No", **totals(total_qty), "discount_type": None, "self_discount": 0, "discount_for": None,
         "coupon_code": "", "coupon_discount": 0, "coupon_title": None, "coupon_type": None, "order_discount": 0,
         "order_discount_type": "", "used_loyalty_point": 0, "loyalty_points_used": 0, "loyalty_discount": 0,
         "use_wallet_balance": 0, "cart-update": cart(1), "printer_agent": []}
    return call("PUT", "/api/v2/vendoremployee/order/update-place-order", f"30_update_{tag}.json", json=p)


def single(oid, tag):
    return call("POST", "/api/v2/vendoremployee/get-single-order-new", f"20_single_{tag}.json", json={"order_id": str(oid)})


def print_bill(oid, tag):
    call("POST", "/api/v1/vendoremployee/order-temp-store", f"40_print_{tag}.json",
         json={"order_id": int(oid), "print_type": "bill", "station_kot": "", "billFoodList": [], "printer_agent": []})
    return call("POST", "/api/v2/vendoremployee/print/update-print-status", f"41_printconfirm_{tag}.json",
                json={"order_id": int(oid), "bill_print": "Yes", "kot_print": "No"})


def cancel_item(oid, item_id, tag, qty=1):
    return call("PUT", "/api/v2/vendoremployee/order/cancel-food-item", f"50_cancelitem_{tag}.json",
                json={"order_id": int(oid), "order_food_id": FOOD, "item_id": int(item_id), "cancel_qty": qty,
                      "order_status": "cancelled", "reason_type": 1, "reason": "Guest Changed the order",
                      "cancel_type": "Pre-Serve", "printer_agent": []})


def pay(oid, mode, tag, amount, status):
    p = {"order_id": str(oid), "payment_mode": mode, "payment_amount": amount, "payment_status": status,
         "transaction_id": "", "billing_auto_bill_print": "No", "food_detail": [], "waiter_id": "",
         "restaurant_name": "CAFE 103", "email": "", "grant_amount": amount, "round_up": 0, "service_tax": 0,
         "service_gst_tax_amount": 0, "tip_amount": 0, "tip_tax_amount": 0, "delivery_charge": 0, "self_discount": 0,
         "discount_for": None, "coupon_code": "", "coupon_discount": 0, "coupon_title": "", "coupon_type": "",
         "comm_discount": 0, "discount_type": "", "order_discount_type": "Percent", "order_discount": 0,
         "discount_value": 0, "discount_member_category_id": 0, "discount_member_category_name": "",
         "used_loyalty_point": 0, "loyalty_points_used": 0, "loyalty_discount": 0, "loyalty_redemption_id": None,
         "use_wallet_balance": 0, "paid_room": "", "usage_id": "", "cust_name": "TEST_BATCHC_PROBE", "cust_mobile": "",
         "cust_country_code": "+91", "cust_membership_id": "", "name": "", "mobile": "", "crm_customer_id": "",
         "custGST": "", "custGSTName": ""}
    return call("POST", "/api/v2/vendoremployee/order/order-bill-payment", f"60_pay_{tag}.json", json=p)


def cancel_order(oid):
    return call("PUT", "/api/v2/vendoremployee/order/order-status-update", f"90_cancelorder_{oid}.json",
                json={"order_id": int(oid), "role_name": "Manager", "order_status": "cancelled",
                      "cancellation_reason": "Guest Changed the order", "cancellation_note": "BATCH-C IA probe",
                      "printer_agent": []})


def reads(tag):
    d = time.strftime("%Y-%m-%d")
    call("POST", "/api/v2/vendoremployee/report/order-logs-report", f"70_logs_{tag}.json",
         json={"sort_by": "created_at", "from_date": d, "to_date": d})
    call("POST", "/api/v2/vendoremployee/report/insights-cancellations", f"71_cancels_{tag}.json",
         json={"from_date": d, "to_date": d, "from": d, "to": d})
    call("POST", "/api/v1/vendoremployee/daily-order-report-details-combined", f"72_beta_{tag}.json",
         json={"from": d, "to": d})


if __name__ == "__main__":
    step, args = sys.argv[1], sys.argv[2:]
    if step == "place":
        place(args[0], int(args[1]) if len(args) > 1 else 2, *args[2:])
    elif step == "update":
        update(args[0], args[1], int(args[2]))
    elif step == "single":
        single(args[0], args[1])
    elif step == "print":
        print_bill(args[0], args[1])
    elif step == "cancelitem":
        cancel_item(args[0], args[1], args[2], int(args[3]) if len(args) > 3 else 1)
    elif step == "pay":
        pay(args[0], args[1], args[2], int(args[3]), args[4])
    elif step == "cancelorder":
        cancel_order(args[0])
    elif step == "reads":
        reads(args[0])
    elif step == "profile":
        call("GET", "/api/v1/vendoremployee/profile", "05_profile.json")
