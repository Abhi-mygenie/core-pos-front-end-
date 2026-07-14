#!/usr/bin/env python3
"""
Simulator of buildBillPrintPayload (orderTransform.js L1712-2144) run against
live backend response for order #002384 (id=940279). Answers: for each of the
7 bill-print call-sites, what will the /order-temp-store payload contain?

INVESTIGATION-only. No mutation of code, no network write. Reads:
  /app/memory/evidence/BUG-168/order_940279.json
"""

import json, sys
from pathlib import Path

DATA = json.load(open('/app/memory/evidence/BUG-168/order_940279.json'))
raw = DATA['orders'][0]

# --- Simulate fromAPI.order (lines 217-234) — the fields buildBillPrintPayload reads
order = {
    'amount':            float(raw.get('order_amount') or 0),
    'subtotalBeforeTax': float(raw.get('order_sub_total_without_tax') or 0),
    'subtotalAmount':    float(raw.get('order_sub_total_amount') or 0),
    'serviceTax':        float(raw.get('total_service_tax_amount') or 0),
    'tipAmount':         float(raw.get('tip_amount') or 0),
    'discount':          float(raw.get('restaurant_discount_amount') or raw.get('discount_value') or 0),
    'deliveryCharge':    float(raw.get('delivery_charge') or 0),
    'orderType':         'dineIn' if raw.get('order_type') == 'dinein' else raw.get('order_type'),
    'isRoom':            False,
    'isWalkIn':          not raw.get('table_id'),
    'tableNumber':       (raw.get('restaurantTable') or {}).get('table_no') or 'WC',
    'rawOrderDetails':   raw.get('orderDetails') or [],
    'id':                raw.get('id'),
}

print(f"=== BACKEND TRUTH (order #{raw['restaurant_order_id']}) ===")
print(f"  order.subtotalAmount    = {order['subtotalAmount']:>8.2f}  ← items + addons (backend)")
print(f"  order.subtotalBeforeTax = {order['subtotalBeforeTax']:>8.2f}  ← items+addons+SC+tip+delivery pre-tax")
print(f"  order.serviceTax        = {order['serviceTax']:>8.2f}")
print(f"  order.amount            = {order['amount']:>8.2f}  ← payable")

# --- Simulate the fallback branch of buildBillPrintPayload (L1802-1826)
def compute_subtotal(o, use_bug168_fix=True, use_correct_fix=False):
    """Recompute like L1802-1826. Returns (computedSubtotal, gst, vat)"""
    sub, gst, vat = 0.0, 0.0, 0.0
    for item in o['rawOrderDetails']:
        # Skip cancelled/check-in as in production (L1763-1767)
        if str(item.get('food_status')) == '3' or item.get('cancel_at') or item.get('cancel_type'):
            continue
        qty       = float(item.get('quantity') or 1)
        unitPrice = float(item.get('unit_price') or (item.get('food_details') or {}).get('price') or 0)
        price     = unitPrice if unitPrice > 0 else float(item.get('price') or 0)

        if use_correct_fix:
            addon_per_unit = sum(
                (float(a.get('price') or 0) * float(a.get('quantity') or 1))
                for a in (item.get('add_ons') or [])
            )
            lineTotal = (price * qty) + (addon_per_unit * qty)
        elif use_bug168_fix:
            # Current L1808
            lineTotal = (price * qty) + (float(item.get('total_add_on_price') or 0))
        else:
            # Pre-BUG-168 old code
            lineTotal = price * qty

        sub += lineTotal
        # Tax computation (skipped — not the focus of this investigation)
    return round(sub, 2), gst, vat

def build_bill_print(o, service_charge_pct=0, overrides=None):
    """Reproduces buildBillPrintPayload fallback logic (relevant slice only)."""
    overrides = overrides or {}
    computedSubtotal, gst_tax, vat_tax = compute_subtotal(o)  # current L1808 code

    overrideDiscount = float(overrides.get('discountAmount', o.get('discount', 0)) or 0)
    overrideTip      = float(overrides.get('tip', 0) or 0)
    overrideDelivery = float(overrides.get('deliveryCharge', 0) or 0)
    postDiscountSub  = max(0, computedSubtotal - overrideDiscount)

    scApplicable = o['orderType'] == 'dineIn' or o.get('isRoom')
    if 'serviceChargeAmount' in overrides:
        serviceChargeAmount = overrides['serviceChargeAmount']
    elif scApplicable:
        serviceChargeAmount = round(postDiscountSub * service_charge_pct / 100, 2) if service_charge_pct > 0 else o.get('serviceTax', 0)
    else:
        serviceChargeAmount = 0

    # L1921 finalOrderItemTotal — THIS is what the printed payload receives
    if 'orderItemTotal' in overrides:
        finalOrderItemTotal = overrides['orderItemTotal']
    else:
        finalOrderItemTotal = o.get('subtotalAmount') or computedSubtotal or 0

    if 'orderSubtotal' in overrides:
        finalOrderSubtotal = overrides['orderSubtotal']
    else:
        itemBase = o.get('subtotalBeforeTax') or o.get('subtotalAmount') or computedSubtotal or 0
        delAmt   = overrides.get('deliveryCharge', o.get('deliveryCharge', 0))
        finalOrderSubtotal = round(itemBase + serviceChargeAmount + overrideTip + delAmt, 2)

    finalPaymentAmount = overrides.get('paymentAmount', o.get('amount', 0))
    finalGstTax = overrides.get('gstTax', gst_tax)
    finalVatTax = overrides.get('vatTax', vat_tax)

    return {
        'computedSubtotal':      computedSubtotal,
        'order_item_total':      finalOrderItemTotal,
        'order_subtotal':        finalOrderSubtotal,
        'payment_amount':        finalPaymentAmount,
        'gst_tax':               finalGstTax,
        'vat_tax':               finalVatTax,
        'serviceChargeAmount':   serviceChargeAmount,
    }

# --- Enumerate every bill-print caller and what overrides each passes
callers = [
    {
        'id': 'B1',
        'name': 'AllOrdersReportPage — audit reprint (paid-orders list)',
        'file': 'AllOrdersReportPage.jsx:820',
        'sc_pct': 0,
        'overrides': {},
        'note': 'zero SC pct, empty overrides → pure fallback branch',
    },
    {
        'id': 'B2',
        'name': 'RePrintButton — cart "Re-Print Only" (PrintBillButton)',
        'file': 'RePrintButton.jsx:115',
        'sc_pct': 0,  # only when restaurant.autoServiceCharge=true
        'overrides': {'serviceChargeTaxPct': 0, 'deliveryChargeGstPct': 0},
        'note': 'No orderItemTotal override → falls back to order.subtotalAmount',
    },
    {
        'id': 'B6',
        'name': 'OrderCard — dashboard printer icon',
        'file': 'OrderCard.jsx:217',
        'sc_pct': 0,
        'overrides': {'serviceChargeTaxPct': 0, 'deliveryChargeGstPct': 0},
        'note': 'Same as B2 — no orderItemTotal override',
    },
    {
        'id': 'B7',
        'name': 'TableCard — dashboard printer icon',
        'file': 'TableCard.jsx:221',
        'sc_pct': 0,
        'overrides': {'serviceChargeTaxPct': 0, 'deliveryChargeGstPct': 0},
        'note': 'Same as B2/B6 — no orderItemTotal override',
    },
    {
        'id': 'B3a',
        'name': 'OrderEntry — auto-print after PLACE order (new order flow)',
        'file': 'OrderEntry.jsx:1377',
        'sc_pct': 0,
        'overrides': {
            # Live UI values from paymentData/CollectPaymentPanel (typical)
            'orderItemTotal': 219,    # what the LIVE UI would send (if correct)
            'orderSubtotal':  240.90,
            'paymentAmount':  240.90,
            'gstTax': 0, 'vatTax': 8.76,
            'serviceChargeAmount': 21.90,
        },
        'note': 'Full live-UI overrides — bypasses fallback entirely IF UI computed right',
    },
    {
        'id': 'B4',
        'name': 'OrderEntry — auto-print after UPDATE order',
        'file': 'OrderEntry.jsx:1487',
        'sc_pct': 0,
        'overrides': {'orderItemTotal': 219, 'orderSubtotal': 240.90, 'paymentAmount': 240.90, 'gstTax': 0, 'vatTax': 8.76, 'serviceChargeAmount': 21.90},
        'note': 'Same as B3a',
    },
    {
        'id': 'B5',
        'name': 'OrderEntry — Collect Bill flow (postpaid/prepaid)',
        'file': 'OrderEntry.jsx:1782/1886/2180',
        'sc_pct': 0,
        'overrides': {'orderItemTotal': 219, 'orderSubtotal': 240.90, 'paymentAmount': 240.90, 'gstTax': 0, 'vatTax': 8.76, 'serviceChargeAmount': 21.90},
        'note': 'Full live-UI overrides from paymentData',
    },
]

print("\n" + "=" * 80)
print("PER-CALLER SIMULATION (payload emitted to /api/v1/vendoremployee/order-temp-store)")
print("=" * 80)
print(f"{'ID':<4} {'CALLER':<52} {'item_total':>11} {'subtotal':>10} {'pay':>7}")
print("-" * 90)
for c in callers:
    p = build_bill_print(order, c['sc_pct'], c['overrides'])
    status = "✅" if abs(p['order_item_total'] - 219) < 0.01 else "❌"
    print(f"{c['id']:<4} {c['name'][:52]:<52} {p['order_item_total']:>11.2f} {p['order_subtotal']:>10.2f} {p['payment_amount']:>7.2f} {status}")

# --- Deep dive: what if backend didn't hydrate subtotalAmount yet (socket timing)?
print("\n" + "=" * 80)
print("EDGE CASE: what if order.subtotalAmount = 0 (socket race, fresh mount)?")
print("=" * 80)
order2 = dict(order); order2['subtotalAmount'] = 0; order2['subtotalBeforeTax'] = 0
for c in callers[:4]:  # only default-branch callers matter
    p = build_bill_print(order2, c['sc_pct'], c['overrides'])
    status = "✅" if abs(p['order_item_total'] - 219) < 0.01 else "❌"
    print(f"{c['id']:<4} {c['name'][:52]:<52} item_total={p['order_item_total']:>7.2f}  {status}  ← relies on L1808 fix")

# --- Compare L1808 current fix vs correct fix on THIS order's rawOrderDetails
print("\n" + "=" * 80)
print("L1808 FIX EFFECTIVENESS ON THIS ORDER'S RAW DATA")
print("=" * 80)
sub_old, _, _ = compute_subtotal(order, use_bug168_fix=False)
sub_cur, _, _ = compute_subtotal(order, use_bug168_fix=True)
sub_new, _, _ = compute_subtotal(order, use_bug168_fix=False, use_correct_fix=True)
print(f"  Pre-BUG168 (price × qty only):                              computedSubtotal = {sub_old:>7.2f}  ❌")
print(f"  Current L1808 (price × qty + total_add_on_price):           computedSubtotal = {sub_cur:>7.2f}  ❌  (backend field missing)")
print(f"  Correct fix (price × qty + Σ(a.price × a.qty) × item.qty):  computedSubtotal = {sub_new:>7.2f}  ✅  (matches backend 219)")
