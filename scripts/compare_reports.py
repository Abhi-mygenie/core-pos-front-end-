#!/usr/bin/env python3
"""
Cross-report comparison: CR-013 Food Court vs S5 Item Sales
for June 1 on Shimla Food Court.

Fetches order-logs-report via preprod API, then applies BOTH formulas
to every order and highlights where they diverge.
"""
import requests, json, sys
from collections import defaultdict

BASE = "https://preprod.mygenie.online"

# Step 1: Login
print("Logging in...")
r = requests.post(f"{BASE}/api/v1/auth/vendoremployee/login", json={
    "email": "owner@shimlaqohfoodcourt.com",
    "password": "Qplazm@10"
})
if r.status_code != 200:
    print(f"Login failed: {r.status_code} {r.text[:500]}")
    sys.exit(1)

data = r.json()
token = data.get("token") or data.get("data", {}).get("token") or data.get("access_token")
if not token:
    # Try nested
    for k in data:
        if isinstance(data[k], dict) and "token" in data[k]:
            token = data[k]["token"]
            break
if not token:
    print(f"No token found in response keys: {list(data.keys())}")
    print(json.dumps(data, indent=2)[:2000])
    sys.exit(1)

print(f"Got token: {token[:20]}...")

headers = {"Authorization": f"Bearer {token}"}

# Step 2: Fetch order-logs-report for June 1
print("\nFetching order-logs-report for 2025-06-01...")
r = requests.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report", 
    headers=headers,
    json={
        "sort_by": "created_at",
        "from_date": "2025-06-01",
        "to_date": "2025-06-01"
    }
)
if r.status_code != 200:
    print(f"API failed: {r.status_code} {r.text[:500]}")
    sys.exit(1)

orders_data = r.json()
raw_orders = orders_data.get("order", [])
print(f"Got {len(raw_orders)} orders")

if len(raw_orders) == 0:
    print("No orders found. Trying 2026-06-01...")
    r = requests.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report", 
        headers=headers,
        json={
            "sort_by": "created_at",
            "from_date": "2026-06-01",
            "to_date": "2026-06-01"
        }
    )
    raw_orders = r.json().get("order", [])
    print(f"Got {len(raw_orders)} orders for 2026-06-01")

# Step 3: Apply both formulas and compare
divergent_orders = []

for wrapper in raw_orders:
    ot = wrapper.get("orders_table", {})
    items = wrapper.get("order_details_table", [])
    
    order_id = ot.get("restaurant_order_id", ot.get("id", "?"))
    order_discount = float(ot.get("restaurant_discount_amount", 0) or 0)
    
    if not items:
        continue
    
    # Parse items
    parsed_items = []
    for item in items:
        food_details = item.get("food_details", "{}")
        if isinstance(food_details, str):
            try:
                food_details = json.loads(food_details)
            except:
                food_details = {}
        
        parsed = {
            "name": food_details.get("name", "?"),
            "station": item.get("station", ""),
            "quantity": int(item.get("quantity", 0) or 0),
            "unit_price": float(item.get("unit_price", 0) or 0),
            "price": float(item.get("price", 0) or 0),  # = unit_price * qty (base only)
            "food_status": item.get("food_status"),
            "gst_tax_amount": float(item.get("gst_tax_amount", 0) or 0),
            "vat_tax_amount": float(item.get("vat_tax_amount", 0) or 0),
            "discount_on_food": float(item.get("discount_on_food", 0) or 0),
            "total_add_on_price": float(item.get("total_add_on_price", 0) or 0),
            "total_variation_price": float(item.get("total_variation_price", 0) or 0),
            "service_charge": float(item.get("service_charge", 0) or 0),
            "discount_amount": float(item.get("discount_amount", 0) or 0),
        }
        parsed_items.append(parsed)
    
    # ── CR-013 Formula (current) ──
    # itemTotal = sum(item.price)  [base only, no addons]
    # discount = order_discount * (station_share)  [proportional by price]
    # subTotal = itemTotal - discount
    cr013_itemTotal = sum(it["price"] for it in parsed_items)
    cr013_discount = order_discount  # order-level (for whole order comparison)
    cr013_subTotal = round(cr013_itemTotal - cr013_discount, 2)
    
    # ── S5 Formula ──
    # itemTotal = unit_price * qty + total_add_on_price + total_variation_price
    # discount = sum(discount_on_food)
    # subTotal = itemTotal - discount + service_charge
    s5_itemTotal = sum(
        it["unit_price"] * it["quantity"] + it["total_add_on_price"] + it["total_variation_price"]
        for it in parsed_items
    )
    s5_discount = sum(it["discount_on_food"] for it in parsed_items)
    s5_serviceCharge = sum(it["service_charge"] for it in parsed_items)
    s5_subTotal = round(s5_itemTotal - s5_discount + s5_serviceCharge, 2)
    
    # Tax (both should be similar but CR-013 skips cancelled items)
    cr013_tax = sum(
        (it["gst_tax_amount"] - it["vat_tax_amount"]) + it["vat_tax_amount"]
        for it in parsed_items if it["food_status"] != 3
    )
    s5_tax = sum(
        (it["gst_tax_amount"] - it["vat_tax_amount"]) + it["vat_tax_amount"]
        for it in parsed_items  # S5 separates by bucket, but for sold items similar
    )
    
    # Check for divergence
    itemTotal_diff = round(s5_itemTotal - cr013_itemTotal, 2)
    discount_diff = round(s5_discount - cr013_discount, 2)
    subTotal_diff = round(s5_subTotal - cr013_subTotal, 2)
    
    has_addons = any(it["total_add_on_price"] > 0 for it in parsed_items)
    has_variations = any(it["total_variation_price"] > 0 for it in parsed_items)
    has_discount_diff = abs(discount_diff) > 0.01
    has_itemTotal_diff = abs(itemTotal_diff) > 0.01
    has_subTotal_diff = abs(subTotal_diff) > 0.01
    
    if has_itemTotal_diff or has_discount_diff or has_subTotal_diff:
        divergent_orders.append({
            "order_id": order_id,
            "items_count": len(parsed_items),
            "has_addons": has_addons,
            "has_variations": has_variations,
            "cr013_itemTotal": cr013_itemTotal,
            "s5_itemTotal": s5_itemTotal,
            "itemTotal_diff": itemTotal_diff,
            "cr013_discount": cr013_discount,
            "s5_discount": s5_discount,
            "discount_diff": discount_diff,
            "cr013_subTotal": cr013_subTotal,
            "s5_subTotal": s5_subTotal,
            "subTotal_diff": subTotal_diff,
            "s5_serviceCharge": s5_serviceCharge,
            "items": [
                {
                    "name": it["name"],
                    "station": it["station"],
                    "qty": it["quantity"],
                    "unit_price": it["unit_price"],
                    "price": it["price"],
                    "addon": it["total_add_on_price"],
                    "variation": it["total_variation_price"],
                    "discount_on_food": it["discount_on_food"],
                    "service_charge": it["service_charge"],
                    "food_status": it["food_status"],
                }
                for it in parsed_items
            ]
        })

# Step 4: Output results
print(f"\n{'='*80}")
print(f"CROSS-REPORT COMPARISON: CR-013 vs S5 — June 1 ({len(raw_orders)} total orders)")
print(f"{'='*80}")
print(f"\nDivergent orders: {len(divergent_orders)} / {len(raw_orders)}")

if divergent_orders:
    print(f"\n{'─'*80}")
    print(f"{'ORDER ID':>10} | {'CR-013 ItemT':>13} | {'S5 ItemT':>13} | {'Diff':>8} | {'CR-013 Disc':>12} | {'S5 Disc':>12} | {'Disc Diff':>10} | {'CR-013 SubT':>12} | {'S5 SubT':>12} | {'SubT Diff':>10} | Addons? | Variations?")
    print(f"{'─'*80}")
    
    for o in divergent_orders:
        print(f"#{o['order_id']:>9} | {o['cr013_itemTotal']:>13.2f} | {o['s5_itemTotal']:>13.2f} | {o['itemTotal_diff']:>+8.2f} | {o['cr013_discount']:>12.2f} | {o['s5_discount']:>12.2f} | {o['discount_diff']:>+10.2f} | {o['cr013_subTotal']:>12.2f} | {o['s5_subTotal']:>12.2f} | {o['subTotal_diff']:>+10.2f} | {'YES' if o['has_addons'] else 'no':>7} | {'YES' if o['has_variations'] else 'no'}")
    
    # Show item-level detail for first 10 divergent orders
    print(f"\n\n{'='*80}")
    print("ITEM-LEVEL DETAIL (divergent orders):")
    print(f"{'='*80}")
    
    for o in divergent_orders[:15]:
        print(f"\n  Order #{o['order_id']} ({o['items_count']} items)")
        print(f"  CR-013: ItemTotal={o['cr013_itemTotal']:.2f}  Discount={o['cr013_discount']:.2f}  SubTotal={o['cr013_subTotal']:.2f}")
        print(f"  S5:     ItemTotal={o['s5_itemTotal']:.2f}  Discount={o['s5_discount']:.2f}  SubTotal={o['s5_subTotal']:.2f}  SC={o['s5_serviceCharge']:.2f}")
        print(f"  DIFF:   ItemTotal={o['itemTotal_diff']:+.2f}  Discount={o['discount_diff']:+.2f}  SubTotal={o['subTotal_diff']:+.2f}")
        for it in o["items"]:
            flags = []
            if it["addon"] > 0: flags.append(f"addon={it['addon']}")
            if it["variation"] > 0: flags.append(f"var={it['variation']}")
            if it["discount_on_food"] > 0: flags.append(f"disc={it['discount_on_food']}")
            if it["service_charge"] > 0: flags.append(f"sc={it['service_charge']}")
            if it["food_status"] == 3: flags.append("CANCELLED")
            flag_str = f" [{', '.join(flags)}]" if flags else ""
            s5_it = it["unit_price"] * it["qty"] + it["addon"] + it["variation"]
            diff_marker = " <-- DIFF" if abs(s5_it - it["price"]) > 0.01 else ""
            print(f"    {it['name']:30s} | stn={it['station']:20s} | qty={it['qty']} | price(CR013)={it['price']:>8.2f} | itemTotal(S5)={s5_it:>8.2f}{diff_marker}{flag_str}")

# Summary
print(f"\n\n{'='*80}")
print("SUMMARY OF DIVERGENCE CAUSES:")
print(f"{'='*80}")
addon_orders = [o for o in divergent_orders if o["has_addons"]]
var_orders = [o for o in divergent_orders if o["has_variations"]]
disc_only = [o for o in divergent_orders if abs(o["discount_diff"]) > 0.01 and abs(o["itemTotal_diff"]) <= 0.01]
print(f"  Orders with addon price diff:       {len(addon_orders)}")
print(f"  Orders with variation price diff:    {len(var_orders)}")
print(f"  Orders with discount-only diff:      {len(disc_only)}")
print(f"  Total divergent orders:              {len(divergent_orders)}")
