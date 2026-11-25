"""CR-525 / CR-521 / CR-523 probes on a TEST takeaway order (cafe103). Cancels the order at the end.
Steps: place → read → mark bill printed → read → update with 1 item → read → customer-only update (empty cart) → read → cancel."""
import json, sys
from batch_d_probe import login, call

TAG = "TEST_BATCHD_IA_PROBE"
FOOD = {"food_id": 246734, "quantity": 1, "price": 200, "variant": "", "add_on_ids": [], "add_on_qtys": [],
        "variations": [], "add_ons": [], "station": "KDS", "food_amount": 200, "variation_amount": 0,
        "addon_amount": 0, "gst_amount": "10.00", "vat_amount": "0.00", "discount_amount": "0.00",
        "complementary_price": 0.0, "is_complementary": "No", "complementary_reason": "", "food_level_notes": TAG}


def totals(n):
    return {"order_amount": 210 * n, "order_sub_total_amount": 200 * n, "order_sub_total_without_tax": 200 * n,
            "tax_amount": 10 * n, "total_gst_tax_amount": 10 * n, "total_vat_tax_amount": 0, "round_up": 0,
            "service_tax": 0, "service_gst_tax_amount": 0, "tip_tax_amount": 0}


OID = 1578761  # test order placed by step 'place' (2026-11-15)


def find_order(label):
    st, body = call("GET", "/api/v1/vendoremployee/pos/employee-orders-list", params={"role_name": "Manager"})
    mine = [o for o in (body.get("orders") or []) if str(o.get("id")) == str(OID)]
    snap = [{k: o.get(k) for k in ["id", "order_status", "f_order_status", "bill_print", "kot_print", "print_bill_status",
                                    "user_name", "cust_name", "cust_mobile", "cust_membership_id", "order_amount", "updated_at"]}
            | {"lines": len(o.get("order_details") or [])} for o in mine]
    json.dump(snap, open(f"P_{label}_readback.json", "w"), indent=1)
    print(label, json.dumps(snap))
    return mine[0] if mine else None


def update_payload(oid, cart, n, cust_name="", cust_mobile=""):
    p = {"order_id": str(oid), "order_type": "takeaway", "cust_name": cust_name, "cust_mobile": cust_mobile,
         "cust_country_code": "+91", "cust_membership_id": "", "order_note": TAG, "payment_method": "pending",
         "payment_status": "unpaid", "payment_type": "postpaid", "print_kot": "No", "auto_dispatch": "No",
         "tip_amount": 0, "delivery_charge": 0, "discount_type": None, "self_discount": 0, "discount_for": None,
         "coupon_code": "", "coupon_discount": 0, "coupon_title": None, "coupon_type": None, "order_discount": 0,
         "order_discount_type": "", "used_loyalty_point": 0, "loyalty_points_used": 0, "loyalty_discount": 0,
         "use_wallet_balance": 0, "room_id": None, "address_id": None, "discount_member_category_id": 0,
         "discount_member_category_name": None, "usage_id": None, "cart-update": cart, "printer_agent": []}
    p.update(totals(n))
    return p


login()
step = sys.argv[1]
if step == "place":
    payload = {"user_id": "", "restaurant_id": 644, "table_id": "0", "order_type": "takeaway",
               "cust_name": "", "cust_mobile": "", "cust_country_code": "+91", "cust_email": "", "cust_dob": "",
               "cust_anniversary": "", "cust_membership_id": "", "order_note": TAG, "payment_method": "pending",
               "payment_status": "unpaid", "payment_type": "postpaid", "transaction_id": "", "print_kot": "No",
               "auto_dispatch": "No", "scheduled": 0, "schedule_at": None, "tip_amount": 0, "delivery_charge": 0,
               "discount_type": None, "self_discount": 0, "discount_for": None, "coupon_code": "", "coupon_discount": 0,
               "coupon_title": None, "coupon_type": None, "order_discount": 0, "used_loyalty_point": 0,
               "loyalty_points_used": 0, "loyalty_discount": 0, "use_wallet_balance": 0, "paid_room": None,
               "room_id": None, "address_id": None, "discount_member_category_id": 0,
               "discount_member_category_name": None, "usage_id": None, "cart": [FOOD], "printer_agent": [],
               "delivery_address": None} | totals(1)
    st, r = call("POST", "/api/v2/vendoremployee/order/place-order", "P2_01_place.json", files={"data": (None, json.dumps(payload))})
    print("place", st, json.dumps(r)[:300])
    find_order("P2_02_after_place")
elif step == "flow":
    find_order("P2_03_before_print")
    oid = OID
    st, r = call("POST", "/api/v2/vendoremployee/print/update-print-status", "P2_04_mark_bill_printed.json",
                 json={"order_id": oid, "bill_print": "Yes", "kot_print": "No"})
    print("mark printed", st, json.dumps(r)[:200])
    find_order("P2_05_after_print")
    st, r = call("PUT", "/api/v2/vendoremployee/order/update-place-order", "P2_06_update_add_item.json",
                 json=update_payload(oid, [FOOD], 2))
    print("update+item", st, json.dumps(r)[:300])
    find_order("P2_07_after_edit")
    # re-mark printed so the customer-only probe starts from a printed state (CR-523)
    call("POST", "/api/v2/vendoremployee/print/update-print-status", None, json={"order_id": oid, "bill_print": "Yes", "kot_print": "No"})
    find_order("P3_01_reprinted")
    st, r = call("PUT", "/api/v2/vendoremployee/order/update-place-order", "P3_02_customer_only_update.json",
                 json=update_payload(oid, [], 2, cust_name="TEST_BATCHD_CUST", cust_mobile="9999900001"))
    print("customer-only", st, json.dumps(r)[:400])
    find_order("P3_03_after_customer_only")
elif step == "cancel":
    find_order("P9_before_cancel")
    st, r = call("PUT", "/api/v2/vendoremployee/order/order-status-update", "P9_cancel.json",
                 json={"order_id": OID, "role_name": "Manager", "order_status": "cancelled",
                       "cancellation_reason": "Guest Changed the order", "cancellation_note": TAG, "printer_agent": []})
    print("cancel", st, json.dumps(r)[:200])
    find_order("P9_after_cancel")
