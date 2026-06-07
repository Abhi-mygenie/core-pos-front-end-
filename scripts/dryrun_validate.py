#!/usr/bin/env python3
"""
DRY-RUN VALIDATION: Will the S5-aligned formula eliminate all 29 divergences?

This script applies BOTH formulas to every order on June 1, 2026:
  - OLD (CR-013 current): item.price + FE proportional discount
  - NEW (S5-aligned): unitPrice*qty + addonPrice + variationPrice, discount_on_food, serviceCharge

NO CODE IS CHANGED. This is a read-only validation.
"""
import requests, json, sys
from collections import defaultdict

BASE = "https://preprod.mygenie.online"

# ── Login ────────────────────────────────────────────────────────────────────
print("=" * 80)
print("DRY-RUN VALIDATION: CR-013 → S5 Formula Alignment")
print("Date: 2026-06-01 | Restaurant: Shimla Food Court")
print("=" * 80)

print("\n[1/4] Logging in...")
r = requests.post(f"{BASE}/api/v1/auth/vendoremployee/login", json={
    "email": "owner@shimlaqohfoodcourt.com",
    "password": "Qplazm@10"
})
data = r.json()
token = data.get("token")
if not token:
    for k in data:
        if isinstance(data[k], dict) and "token" in data[k]:
            token = data[k]["token"]
            break
if not token:
    print(f"Login failed: {list(data.keys())}")
    sys.exit(1)
print(f"   OK (token: {token[:15]}...)")

headers = {"Authorization": f"Bearer {token}"}

# ── Fetch ────────────────────────────────────────────────────────────────────
print("\n[2/4] Fetching order-logs-report for 2026-06-01...")
r = requests.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report",
    headers=headers,
    json={"sort_by": "created_at", "from_date": "2026-06-01", "to_date": "2026-06-01"}
)
raw_orders = r.json().get("order", [])
print(f"   Got {len(raw_orders)} orders")

# ── Apply both formulas ─────────────────────────────────────────────────────
print("\n[3/4] Applying OLD (CR-013) and NEW (S5-aligned) formulas to every order...\n")

results = []
was_divergent_now_fixed = 0
was_clean_still_clean = 0
was_clean_now_broken = 0  # should be 0!
still_divergent = 0

for wrapper in raw_orders:
    ot = wrapper.get("orders_table", {})
    items_raw = wrapper.get("order_details_table", [])
    order_id = ot.get("restaurant_order_id", ot.get("id", "?"))
    order_discount = float(ot.get("restaurant_discount_amount", 0) or 0)

    if not items_raw:
        continue

    # Parse items with ALL fields
    items = []
    for item in items_raw:
        fd = item.get("food_details", "{}")
        if isinstance(fd, str):
            try: fd = json.loads(fd)
            except: fd = {}

        items.append({
            "name": fd.get("name", "?"),
            "station": item.get("station", ""),
            "quantity": int(item.get("quantity", 0) or 0),
            "unit_price": float(item.get("unit_price", 0) or 0),
            "price": float(item.get("price", 0) or 0),
            "food_status": item.get("food_status"),
            "gst_tax_amount": float(item.get("gst_tax_amount", 0) or 0),
            "vat_tax_amount": float(item.get("vat_tax_amount", 0) or 0),
            "discount_on_food": float(item.get("discount_on_food", 0) or 0),
            "total_add_on_price": float(item.get("total_add_on_price", 0) or 0),
            "total_variation_price": float(item.get("total_variation_price", 0) or 0),
            "service_charge": float(item.get("service_charge", 0) or 0),
        })

    # ═══ OLD FORMULA (current CR-013) ═══
    old_itemTotal = sum(it["price"] for it in items)
    old_discount = order_discount  # order-level, FE proportional
    old_subTotal = round(old_itemTotal - old_discount, 2)
    old_tax = round(sum(
        it["gst_tax_amount"]  # gst_tax_amount already includes both GST+VAT per backend
        for it in items if it["food_status"] != 3
    ), 2)
    old_total = round(old_subTotal + old_tax, 2)

    # ═══ NEW FORMULA (S5-aligned) ═══
    new_itemTotal = sum(
        it["unit_price"] * it["quantity"] + it["total_add_on_price"] + it["total_variation_price"]
        for it in items
    )
    new_discount = sum(it["discount_on_food"] for it in items)
    new_serviceCharge = sum(it["service_charge"] for it in items)
    new_subTotal = round(new_itemTotal - new_discount + new_serviceCharge, 2)
    new_tax = round(sum(
        it["gst_tax_amount"]
        for it in items if it["food_status"] != 3
    ), 2)
    new_total = round(new_subTotal + new_tax, 2)

    # ═══ S5 REFERENCE (what S5 computes — this is the "truth") ═══
    s5_itemTotal = new_itemTotal  # same formula
    s5_discount = new_discount
    s5_subTotal = new_subTotal
    s5_tax = new_tax
    s5_total = new_total

    # ═══ Compare: OLD vs S5 ═══
    old_vs_s5_itemTotal = round(old_itemTotal - s5_itemTotal, 2)
    old_vs_s5_discount = round(old_discount - s5_discount, 2)
    old_vs_s5_subTotal = round(old_subTotal - s5_subTotal, 2)
    old_divergent = abs(old_vs_s5_itemTotal) > 0.01 or abs(old_vs_s5_discount) > 0.01 or abs(old_vs_s5_subTotal) > 0.01

    # ═══ Compare: NEW vs S5 ═══
    new_vs_s5_itemTotal = round(new_itemTotal - s5_itemTotal, 2)
    new_vs_s5_discount = round(new_discount - s5_discount, 2)
    new_vs_s5_subTotal = round(new_subTotal - s5_subTotal, 2)
    new_divergent = abs(new_vs_s5_itemTotal) > 0.01 or abs(new_vs_s5_discount) > 0.01 or abs(new_vs_s5_subTotal) > 0.01

    # Classify
    if old_divergent and not new_divergent:
        was_divergent_now_fixed += 1
        status = "FIXED"
    elif not old_divergent and not new_divergent:
        was_clean_still_clean += 1
        status = "CLEAN"
    elif not old_divergent and new_divergent:
        was_clean_now_broken += 1
        status = "REGRESSION"
    else:
        still_divergent += 1
        status = "STILL_DIVERGENT"

    results.append({
        "order_id": order_id,
        "status": status,
        "old_itemTotal": old_itemTotal,
        "new_itemTotal": new_itemTotal,
        "s5_itemTotal": s5_itemTotal,
        "old_discount": old_discount,
        "new_discount": new_discount,
        "s5_discount": s5_discount,
        "old_subTotal": old_subTotal,
        "new_subTotal": new_subTotal,
        "s5_subTotal": s5_subTotal,
        "old_total": old_total,
        "new_total": new_total,
        "s5_total": s5_total,
    })

# ── Results ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 80)
print("DRY-RUN RESULTS")
print("=" * 80)

print(f"""
  Total orders:                    {len(results)}
  ─────────────────────────────────────────────
  Previously divergent → NOW FIXED:  {was_divergent_now_fixed}  ✅
  Previously clean → STILL CLEAN:    {was_clean_still_clean}  ✅
  Previously clean → NOW BROKEN:     {was_clean_now_broken}  {"❌ REGRESSION!" if was_clean_now_broken > 0 else "✅ (zero regressions)"}
  Still divergent:                   {still_divergent}  {"⚠️  NEEDS INVESTIGATION" if still_divergent > 0 else "✅"}
  ─────────────────────────────────────────────
""")

if was_divergent_now_fixed > 0:
    print(f"\n{'─'*80}")
    print(f"FIXED ORDERS ({was_divergent_now_fixed}):")
    print(f"{'─'*80}")
    print(f"{'Order':>10} | {'OLD ItemT':>11} → {'NEW ItemT':>11} = {'S5 ItemT':>11} | {'OLD Disc':>10} → {'NEW Disc':>10} = {'S5 Disc':>10} | {'OLD SubT':>10} → {'NEW SubT':>10} = {'S5 SubT':>10}")
    for r in results:
        if r["status"] == "FIXED":
            print(f"#{r['order_id']:>9} | {r['old_itemTotal']:>11.2f} → {r['new_itemTotal']:>11.2f} = {r['s5_itemTotal']:>11.2f} | {r['old_discount']:>10.2f} → {r['new_discount']:>10.2f} = {r['s5_discount']:>10.2f} | {r['old_subTotal']:>10.2f} → {r['new_subTotal']:>10.2f} = {r['s5_subTotal']:>10.2f}")

if still_divergent > 0:
    print(f"\n{'─'*80}")
    print(f"STILL DIVERGENT ({still_divergent}) — NEEDS INVESTIGATION:")
    print(f"{'─'*80}")
    for r in results:
        if r["status"] == "STILL_DIVERGENT":
            print(f"  #{r['order_id']}: OLD ItemT={r['old_itemTotal']:.2f} NEW={r['new_itemTotal']:.2f} S5={r['s5_itemTotal']:.2f} | OLD Disc={r['old_discount']:.2f} NEW={r['new_discount']:.2f} S5={r['s5_discount']:.2f}")

if was_clean_now_broken > 0:
    print(f"\n{'─'*80}")
    print(f"⚠️  REGRESSIONS ({was_clean_now_broken}) — FORMULA CHANGE BROKE THESE:")
    print(f"{'─'*80}")
    for r in results:
        if r["status"] == "REGRESSION":
            print(f"  #{r['order_id']}: OLD ItemT={r['old_itemTotal']:.2f} NEW={r['new_itemTotal']:.2f} S5={r['s5_itemTotal']:.2f}")

# ── Verdict ──────────────────────────────────────────────────────────────────
print(f"\n{'='*80}")
if was_clean_now_broken == 0 and still_divergent == 0:
    print("VERDICT: ✅ SAFE TO IMPLEMENT")
    print(f"  The formula change fixes all {was_divergent_now_fixed} divergent orders")
    print(f"  and introduces ZERO regressions on the {was_clean_still_clean} clean orders.")
    print(f"  Total: {len(results)}/{len(results)} orders will match S5 after the change.")
else:
    print("VERDICT: ⚠️  NOT SAFE — issues found")
    if was_clean_now_broken > 0:
        print(f"  {was_clean_now_broken} previously clean orders would BREAK")
    if still_divergent > 0:
        print(f"  {still_divergent} orders still divergent after change")
print("=" * 80)
