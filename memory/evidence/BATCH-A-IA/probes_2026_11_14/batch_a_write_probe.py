# BATCH-A IA write probe (owner-approved 2026-11-14: changes allowed on test orders). Token read from /tmp/tok, never printed.
import json, sys, time, requests

B = "https://preprod.mygenie.online"
T = open('/tmp/tok').read().strip()
H = {"Authorization": f"Bearer {T}", "Accept": "application/json"}
OUT = "/app/memory/evidence/BATCH-A-IA/probes_2026_11_14/"
step = sys.argv[1]


def save(name, r):
    try:
        body = r.json()
    except Exception:
        body = r.text[:3000]
    json.dump({"status": r.status_code, "body": body}, open(OUT + name, "w"), indent=1)
    print(name, r.status_code, json.dumps(body)[:700])
    return body


if step == "place":
    cart = [{"food_id": 246734, "quantity": 2, "price": 200, "variant": "", "add_on_ids": [], "add_on_qtys": [],
             "variations": [], "add_ons": [], "station": "KDS", "food_amount": 400, "variation_amount": 0,
             "addon_amount": 0, "gst_amount": "20.00", "vat_amount": "0.00", "discount_amount": "0.00",
             "complementary_price": 0.0, "is_complementary": "No", "complementary_reason": "",
             "food_level_notes": "BATCH-A IA PROBE"}]
    payload = {"user_id": "", "restaurant_id": 644, "table_id": "0", "order_type": "takeaway",
               "cust_name": "TEST_BATCHA_PROBE", "cust_mobile": "", "cust_country_code": "+91", "cust_email": "",
               "cust_dob": "", "cust_anniversary": "", "cust_membership_id": "", "order_note": "TEST BATCH-A IA PROBE",
               "payment_method": "pending", "payment_status": "unpaid", "payment_type": "postpaid", "transaction_id": "",
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
    r = requests.post(B + "/api/v2/vendoremployee/order/place-order", headers=H,
                      files={"data": (None, json.dumps(payload))}, timeout=90)
    save("20_place_order.json", r)

elif step == "running":
    r = requests.get(B + "/api/v1/vendoremployee/pos/employee-orders-list", headers=H, timeout=90)
    body = r.json()
    orders = body.get("orders") if isinstance(body, dict) else body
    mine = [o for o in (orders or []) if "BATCH-A" in str(o.get("order_note", "")) or o.get("user_name") == "TEST_BATCHA_PROBE"]
    json.dump(mine, open(OUT + "21_running_mine.json", "w"), indent=1)
    for o in mine:
        print(o.get("id"), o.get("restaurant_order_id"), o.get("order_status"),
              [(d.get("id"), d.get("food_id"), d.get("quantity"), d.get("food_status")) for d in o.get("order_details", [])])

elif step == "cancel_item":
    order_id, item_id = int(sys.argv[2]), int(sys.argv[3])
    payload = {"order_id": order_id, "order_food_id": 246734, "item_id": item_id, "cancel_qty": 1,
               "order_status": "cancelled", "reason_type": 330, "reason": "Guest Changed the order",
               "cancel_type": "Pre-Serve", "printer_agent": [],
               "cancel_reason_text": "PROBE_NOTE_cancel_reason_text", "notes": "PROBE_NOTE_notes",
               "cancellation_note": "PROBE_NOTE_cancellation_note", "cancel_note": "PROBE_NOTE_cancel_note"}
    r = requests.put(B + "/api/v2/vendoremployee/order/cancel-food-item", headers=H, json=payload, timeout=90)
    save("22_cancel_item.json", r)

elif step == "cancel_order":
    order_id = int(sys.argv[2])
    payload = {"order_id": order_id, "role_name": "Manager", "order_status": "cancelled",
               "cancellation_reason": "Guest Changed the order", "cancellation_note": "PROBE_ORDER_NOTE_custom_text",
               "printer_agent": []}
    r = requests.put(B + "/api/v2/vendoremployee/order/order-status-update", headers=H, json=payload, timeout=90)
    save("23_cancel_order.json", r)

elif step == "readback":
    order_id = int(sys.argv[2])
    d = time.strftime("%Y-%m-%d")
    r = requests.get(B + f"/api/v2/vendoremployee/cancel-order-list?search_date={d}", headers=H, timeout=90)
    body = r.json()
    mine = [o for o in body.get("orders", []) if o.get("id") == order_id]
    json.dump(mine, open(OUT + "24_readback_cancel_order_list.json", "w"), indent=1)
    for o in mine:
        print("ORDER", {k: o.get(k) for k in ["cancellation_reason", "cancellation_note", "cancel_state", "order_note"]})
        for dd in o.get("order_details", []):
            print(" LINE", {k: dd.get(k) for k in ["id", "quantity", "food_status", "reason_type", "reason", "cancel_type", "food_level_notes"]})
            print("  note-like keys:", {k: v for k, v in dd.items() if "note" in k.lower() or "cancel" in k.lower()})
    r2 = requests.post(B + "/api/v2/vendoremployee/report/insights-cancellations", headers=H,
                       json={"from_date": d, "to_date": d}, timeout=90)
    items = [i for i in r2.json().get("data", {}).get("items", []) if str(i.get("order_id")).lstrip("0") == str(mine[0].get("restaurant_order_id", "x")).lstrip("0")] if mine else []
    json.dump(items, open(OUT + "25_readback_insights_items.json", "w"), indent=1)
    print("INSIGHTS", json.dumps(items)[:1500])
    r3 = requests.post(B + "/api/v1/vendoremployee/daily-order-report-details-combined", headers=H,
                       json={"from": d, "to": d}, timeout=90)
    rows = []
    for day in r3.json().get("daily_reports", []):
        rows += [x for x in day.get("report", []) if x.get("order_id") == order_id]
    json.dump(rows, open(OUT + "26_readback_order_beta.json", "w"), indent=1)
    print("BETA", json.dumps(rows)[:1200])
