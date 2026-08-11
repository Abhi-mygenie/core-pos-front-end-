# BACKEND BRIEF — Complete Financial Field Gap on Order Read Endpoints

**ID:** BACKEND_BRIEF_BUG168_COMPLETE
**Date:** 2026-07-08
**Classification:** CONTRACT_MISMATCH
**Priority:** P1 / HIGH
**Frontend impact:** Manual print receipts show wrong GST/VAT/CGST/SGST amounts

---

## Summary

FE sends a complete set of financial fields to backend on every order mutation (place, edit, collect bill). Backend stores all of them. But backend does NOT return several critical tax fields on read endpoints (socket, list API, single-order API). This forces FE to locally recompute tax for manual print — which produces incorrect values.

**Ask:** Return all stored financial fields on all read endpoints so FE can do pure passthrough with zero computation.

---

## VISUAL FLOW 1 — PLACE ORDER

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLACE ORDER                                      │
│                 POST /api/v2/.../place-order                             │
│                                                                          │
│  Applies to: Dine-In, Walk-In, Takeaway, Delivery, Room                 │
│  FE computes all financials from cart items at order time                │
│                                                                          │
│  ┌────────────────────────── FE SENDS ─────────────────────────────┐     │
│  │                                                                  │     │
│  │  ITEM TOTALS                                                     │     │
│  │    order_sub_total_amount       ₹ (items only, pre-everything)   │     │
│  │    order_sub_total_without_tax  ₹ (items-discount+SC+tip+del)    │     │
│  │    order_amount                 ₹ (final total including tax)    │     │
│  │                                                                  │     │
│  │  TAX BREAKDOWN                                                   │     │
│  │    gst_tax                      ₹ (GST on items+SC+tip+del)     │     │
│  │    vat_tax                      ₹ (VAT on items, post-discount)  │     │
│  │    tax_amount                   ₹ (total tax = gst + vat)        │     │
│  │                                                                  │     │
│  │  SERVICE CHARGE                                                  │     │
│  │    service_tax                  ₹ (SC amount)                    │     │
│  │    service_gst_tax_amount       ₹ (GST on SC)                   │     │
│  │                                                                  │     │
│  │  TIP                                                             │     │
│  │    tip_amount                   ₹ (tip)                          │     │
│  │    tip_tax_amount               ₹ (GST on tip)                  │     │
│  │                                                                  │     │
│  │  DELIVERY (only when orderType = delivery)                       │     │
│  │    delivery_charge              ₹                                │     │
│  │    delivery_charge_gst_amount   ₹ (GST on delivery charge)      │     │
│  │                                                                  │     │
│  │  OTHER                                                           │     │
│  │    round_up                     ₹ (round-off)                    │     │
│  │    self_discount                ₹                                │     │
│  │    order_discount               ₹                                │     │
│  │                                                                  │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│                          │                                               │
│                  Backend stores ALL ✅                                    │
│                          │                                               │
│                          ▼                                               │
│              Socket: new-order event                                     │
│                                                                          │
│  ┌──────────────────── BACKEND RETURNS ────────────────────────────┐     │
│  │                                                                  │     │
│  │  ✅ order_sub_total_amount        292                            │     │
│  │  ✅ order_sub_total_without_tax   321.2                          │     │
│  │  ✅ order_amount                  333                            │     │
│  │  ✅ total_service_tax_amount      29.20  (= service_tax)        │     │
│  │  ✅ tip_amount                    0.00                           │     │
│  │  ✅ tip_tax_amount                0.00                           │     │
│  │  ✅ delivery_charge               0                              │     │
│  │  ✅ delivery_charge_gst           0.00  (socket only)            │     │
│  │                                                                  │     │
│  │  ❌ gst_tax                       NOT RETURNED                   │     │
│  │  ❌ vat_tax                       NOT RETURNED                   │     │
│  │  ❌ tax_amount                    NOT RETURNED                   │     │
│  │  ❌ service_gst_tax_amount        NOT RETURNED                   │     │
│  │  ❌ delivery_charge_gst_amount    NOT RETURNED                   │     │
│  │  ❌ round_up                      NOT RETURNED                   │     │
│  │                                                                  │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## VISUAL FLOW 2 — EDIT ORDER (Add Items)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EDIT ORDER                                       │
│                 PUT /api/v1/.../update-place-order                        │
│                                                                          │
│  Triggered when: cashier adds more items to an existing placed order     │
│  FE recalculates ALL financials (placed items + new items combined)      │
│                                                                          │
│  ┌────────────────────────── FE SENDS ─────────────────────────────┐     │
│  │                                                                  │     │
│  │  Same complete financial set as Place Order:                     │     │
│  │    order_sub_total_amount       ₹ (recalculated for ALL items)   │     │
│  │    order_sub_total_without_tax  ₹ (recalculated)                 │     │
│  │    order_amount                 ₹ (recalculated)                 │     │
│  │    gst_tax                      ₹ (recalculated)       ◄─ SENT  │     │
│  │    vat_tax                      ₹ (recalculated)       ◄─ SENT  │     │
│  │    tax_amount                   ₹ (recalculated)       ◄─ SENT  │     │
│  │    service_tax                  ₹ (recalculated)                 │     │
│  │    service_gst_tax_amount       ₹ (recalculated)       ◄─ SENT  │     │
│  │    tip_tax_amount               0                                │     │
│  │    delivery_charge              ₹                                │     │
│  │    delivery_charge_gst_amount   ₹ (conditional)        ◄─ SENT  │     │
│  │    round_up                     ₹ (recalculated)                 │     │
│  │                                                                  │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│                  Backend re-stores updated values ✅                      │
│                          │                                               │
│                          ▼                                               │
│              Socket: update-order event                                   │
│                                                                          │
│              SAME GAP: gst_tax, vat_tax, tax_amount,                     │
│              service_gst_tax_amount, delivery_charge_gst_amount          │
│              ALL NOT RETURNED ❌                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## VISUAL FLOW 3 — COLLECT BILL (Payment)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COLLECT BILL                                      │
│                POST /api/v2/.../order-bill-payment                       │
│                                                                          │
│  Triggered when: cashier collects payment (discount/coupon/tip applied)  │
│  FE sends final bill values from live Collect Bill UI                    │
│                                                                          │
│  ┌────────────────────────── FE SENDS ─────────────────────────────┐     │
│  │                                                                  │     │
│  │    order_sub_total_amount       ₹                                │     │
│  │    order_sub_total_without_tax  ₹                                │     │
│  │    grant_amount                 ₹ (final payable)                │     │
│  │    gst_tax                      ₹                       ◄─ SENT │     │
│  │    vat_tax                      ₹                       ◄─ SENT │     │
│  │    total_gst_tax_amount         ₹                       ◄─ SENT │     │
│  │    service_tax                  ₹                                │     │
│  │    service_gst_tax_amount       ₹                       ◄─ SENT │     │
│  │    tip_amount                   ₹                                │     │
│  │    tip_tax_amount               ₹                       ◄─ SENT │     │
│  │    delivery_charge              ₹                                │     │
│  │    delivery_charge_gst_amount   ₹ (conditional)         ◄─ SENT │     │
│  │    round_up                     ₹                                │     │
│  │    self_discount                ₹                                │     │
│  │    coupon_code / coupon_discount ₹                               │     │
│  │                                                                  │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  NOTE: After Collect Bill, order is PAID and removed from dashboard.     │
│  Socket: update-order-paid → order removed from context.                 │
│  No manual print happens AFTER collect bill (auto-print uses overrides). │
│  So the gap doesn't affect Collect Bill flow directly.                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## VISUAL FLOW 4 — MANUAL PRINT (THE BUG)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       MANUAL PRINT BILL                                  │
│               POST /api/v1/.../order-temp-store                          │
│                                                                          │
│  Triggered when: cashier clicks Print on OrderCard / TableCard /         │
│  RePrintButton / Order Screen — BEFORE collecting bill                   │
│                                                                          │
│  FE reads order from OrderContext (populated by socket / list API)        │
│                                                                          │
│  ┌───────────── AVAILABLE from context ──────────────────────────┐       │
│  │  ✅ order.subtotalAmount        292  (order_sub_total_amount)  │       │
│  │  ✅ order.subtotalBeforeTax     321.2 (order_sub_total_w/o_tax)│       │
│  │  ✅ order.serviceTax            29.2  (total_service_tax_amt)  │       │
│  │  ✅ order.amount                333   (order_amount)           │       │
│  │  ✅ order.tipAmount             0     (tip_amount)             │       │
│  │  ✅ order.deliveryCharge        0     (delivery_charge)        │       │
│  │  ✅ order.discount              0     (restaurant_discount_amt)│       │
│  └────────────────────────────────────────────────────────────────┘       │
│                                                                          │
│  ┌───────────── NOT AVAILABLE (backend doesn't return) ──────────┐       │
│  │  ❌ order.gstTax               ← gst_tax NOT in API response  │       │
│  │  ❌ order.vatTax               ← vat_tax NOT in API response  │       │
│  │  ❌ order.serviceGstTax        ← service_gst_tax_amount NOT   │       │
│  │  ❌ order.deliveryChargeGst    ← delivery_charge_gst_amount   │       │
│  │  ❌ order.roundOff             ← round_up NOT in API response │       │
│  └────────────────────────────────────────────────────────────────┘       │
│                                                                          │
│  ┌────────────── PRINT PAYLOAD (what FE sends) ──────────────────┐       │
│  │                                                                │       │
│  │  order_item_total:    292    ✅ from order.subtotalAmount       │       │
│  │  order_subtotal:      321.2  ✅ from order.subtotalBeforeTax    │       │
│  │  serviceChargeAmount: 29.2   ✅ from order.serviceTax           │       │
│  │  payment_amount:      333    ✅ from order.amount               │       │
│  │  Tip:                 0      ✅ from order.tipAmount             │       │
│  │  delivery_charge:     0      ✅ from order.deliveryCharge        │       │
│  │  discount_amount:     0      ✅ from order.discount              │       │
│  │                                                                │       │
│  │  gst_tax:             3.68   ❌ WRONG — FE computes locally     │       │
│  │  vat_tax:             3.68   ❌ WRONG — should be 11.68         │       │
│  │  cgst_amount:         1.84   ❌ WRONG — derived from wrong gst  │       │
│  │  sgst_amount:         1.84   ❌ WRONG — derived from wrong gst  │       │
│  │                                                                │       │
│  └────────────────────────────────────────────────────────────────┘       │
│                                                                          │
│  WHY WRONG: FE tax loop computes tax on base price (92) instead of       │
│  full item total with addons (292). Backend knows correct value (11.68)  │
│  but doesn't return it.                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## COMPLETE FIELD GAP TABLE — ALL FLOWS

```
┌──────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│         FIELD                │ FE→BE    │ FE→BE    │ Socket   │ List API │ Single   │
│                              │ Place/   │ Collect  │ new-order│ employee │ Order    │
│                              │ Edit     │ Bill     │ update-* │ -orders  │ -new     │
├──────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ order_sub_total_amount       │  ✅ SEND │  ✅ SEND │    ✅    │  ✅ NEW  │    ✅    │
│ order_sub_total_without_tax  │  ✅ SEND │  ✅ SEND │    ✅    │  ✅ NEW  │    ✅    │
│ order_amount                 │  ✅ SEND │  ✅ SEND │    ✅    │    ✅    │    ✅    │
│ total_service_tax_amount     │  ✅ SEND │  ✅ SEND │    ✅    │    ✅    │    ✅    │
│ tip_amount                   │  ✅ SEND │  ✅ SEND │    ✅    │    ✅    │    ✅    │
│ tip_tax_amount               │  ✅ SEND │  ✅ SEND │    ✅    │    ✅    │    ✅    │
│ delivery_charge              │  ✅ SEND │  ✅ SEND │    ✅    │    ✅    │    ✅    │
│ delivery_charge_gst          │  ✅ SEND │  ✅ SEND │    ✅    │    ❌    │    ❌    │
│ restaurant_discount_amount   │   ─      │  ✅ SEND │    ❌    │  ✅ NEW  │    ❌    │
│ round_up                     │  ✅ SEND │  ✅ SEND │    ❌    │    ❌    │    ❌    │
├──────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ gst_tax                      │  ✅ SEND │  ✅ SEND │    ❌    │    ❌    │    ❌    │
│ vat_tax                      │  ✅ SEND │  ✅ SEND │    ❌    │    ❌    │    ❌    │
│ tax_amount                   │  ✅ SEND │  ✅ SEND │    ❌    │    ❌    │    ❌    │
│ service_gst_tax_amount       │  ✅ SEND │  ✅ SEND │    ❌    │    ❌    │    ❌    │
│ delivery_charge_gst_amount   │  ✅ SEND │  ✅ SEND │    ❌    │    ❌    │    ❌    │
└──────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

  ✅ = Present/Sent    ❌ = Missing    ✅ NEW = Recently added this sprint
  ─  = Not applicable for this flow
```

---

## ORDER TYPE CASES

Each order type has different financial components. All share the same gap:

```
┌────────────────────┬───────────┬───────────┬───────────┬───────────┐
│ Financial Component│  Dine-In  │  Walk-In  │ Takeaway  │ Delivery  │
│                    │  + Room   │           │           │           │
├────────────────────┼───────────┼───────────┼───────────┼───────────┤
│ Item Total         │     ✅    │     ✅    │     ✅    │     ✅    │
│ Service Charge     │   ✅ Yes  │   ✅ Yes  │  ₹0 (N/A) │  ₹0 (N/A) │
│ SC GST             │   ✅ Yes  │   ✅ Yes  │  ₹0 (N/A) │  ₹0 (N/A) │
│ Tip                │  Optional │  Optional │  Optional │  Optional │
│ Tip Tax (GST)      │  Optional │  Optional │  Optional │  Optional │
│ Delivery Charge    │  ₹0 (N/A) │  ₹0 (N/A) │  ₹0 (N/A) │   ✅ Yes  │
│ Delivery GST       │  ₹0 (N/A) │  ₹0 (N/A) │  ₹0 (N/A) │   ✅ Yes  │
│ Discount           │  Optional │  Optional │  Optional │  Optional │
│ GST (on food)      │  Per item │  Per item │  Per item │  Per item │
│ VAT (on food)      │  Per item │  Per item │  Per item │  Per item │
│ Round-off          │  Optional │  Optional │  Optional │  Optional │
├────────────────────┼───────────┼───────────┼───────────┼───────────┤
│ GAP: gst_tax       │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │
│ GAP: vat_tax       │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │
│ GAP: tax_amount    │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │
│ GAP: sc_gst_tax    │  ❌ MISS  │  ❌ MISS  │    ─      │    ─      │
│ GAP: del_gst_amt   │    ─      │    ─      │    ─      │  ❌ MISS  │
│ GAP: round_up      │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │  ❌ MISS  │
└────────────────────┴───────────┴───────────┴───────────┴───────────┘
```

---

## EDGE CASES

### 1. Order with Addons (e.g., Order #002388)
```
Item: sahi paneer x4 + extra cheese slice addon
FE sent:     gst_tax=0, vat_tax=11.68
BE returns:  gst_tax=❌, vat_tax=❌
FE computes: vat_tax=3.68 (WRONG — tax on base 92 instead of full 292)
```

### 2. Order with Variations
```
Item with variation upcharge (e.g., +₹20 for "large")
Same gap — FE would compute tax on base price without variation upcharge
```

### 3. Mixed GST + VAT items
```
Item A: GST 18%    → gst_tax = ₹X
Item B: VAT 5%     → vat_tax = ₹Y
FE sent both separately. Backend should return both separately.
Without backend fields, FE cannot split correctly.
```

### 4. Order with Discount
```
Place order → discount applied at Collect Bill
But manual print happens BEFORE collect bill (no discount yet)
gst_tax/vat_tax at place-order time = pre-discount values
Backend stores pre-discount tax values → should return them
```

### 5. Order after Edit (items added)
```
Place order with 2 items → gst_tax=₹10
Edit: add 1 more item → FE recalculates → gst_tax=₹15
PUT update-place-order sends gst_tax=₹15
Socket update-order returns: gst_tax=❌
FE loses the updated tax value after edit
```

### 6. Delivery Order
```
delivery_charge = ₹50
delivery_charge_gst_amount = ₹9 (18% GST on delivery)
FE sends both. Backend returns delivery_charge ✅ but NOT delivery_charge_gst_amount ❌
Print payload needs delivery GST for correct total
```

### 7. Room Order with Associated Orders
```
Room order with table orders transferred
Associated order amounts shown on print
Tax gap same as dine-in — gst_tax/vat_tax missing
```

---

## BACKEND ASK — COMPLETE LIST

### Priority 1 (Blocks print fix):

| Field | Add to | Source (already stored from FE writes) |
|-------|--------|---------------------------------------|
| `gst_tax` | Socket + List API + Single Order | Stored from place-order / update-order / bill-payment |
| `vat_tax` | Socket + List API + Single Order | Stored from place-order / update-order / bill-payment |

### Priority 2 (Enables full backend passthrough — zero FE computation):

| Field | Add to | Source |
|-------|--------|--------|
| `tax_amount` | Socket + List API + Single Order | Stored from place-order (= gst_tax + vat_tax) |
| `service_gst_tax_amount` | Socket + List API + Single Order | Stored from place-order / update-order / bill-payment |
| `delivery_charge_gst_amount` | List API + Single Order | Stored (socket already has `delivery_charge_gst`) |
| `round_up` | Socket + List API + Single Order | Stored from place-order / update-order / bill-payment |

### Precedent:
`order_sub_total_amount` and `order_sub_total_without_tax` were in the same situation — FE sent them, backend stored them, but didn't return them. Backend added them to `employee-orders-list` this sprint and it's working perfectly. This is the identical pattern.

---

## FE CHANGE AFTER BACKEND FIX

### Step 1: Map new fields in `fromAPI.order` (add 4-6 lines):
```js
// Add to fromAPI.order (after existing financial mappings at L222):
gstTax: parseFloat(api.gst_tax) || 0,
vatTax: parseFloat(api.vat_tax) || 0,
taxAmount: parseFloat(api.tax_amount) || 0,                          // P2
serviceGstTax: parseFloat(api.service_gst_tax_amount) || 0,          // P2
deliveryChargeGst: parseFloat(api.delivery_charge_gst_amount) || 0,  // P2
roundOff: parseFloat(api.round_up) || 0,                             // P2
```

### Step 2: Replace tax loop in `buildBillPrintPayload` else branch (replace ~20 lines with 2):
```js
// Replace entire tax loop in else branch with:
gst_tax = order.gstTax || 0;
vat_tax = order.vatTax || 0;
```

### Result: Print payload becomes 100% backend passthrough:
```
order_item_total    → order.subtotalAmount       (backend)
order_subtotal      → order.subtotalBeforeTax    (backend)
serviceChargeAmount → order.serviceTax           (backend)
payment_amount      → order.amount               (backend)
gst_tax             → order.gstTax               (backend)  ← NEW
vat_tax             → order.vatTax               (backend)  ← NEW
cgst_amount         → order.gstTax / 2           (derived)
sgst_amount         → order.gstTax / 2           (derived)
Tip                 → order.tipAmount             (backend)
delivery_charge     → order.deliveryCharge        (backend)
discount_amount     → order.discount              (backend)

ZERO local computation. ZERO item-level loops. Pure passthrough.
```

---

## SPECIFIC EXAMPLE — Order #002388 (sahi paneer x4 + addon)

```
What FE sent on place-order:          What FE needs for print:
  order_sub_total_amount:  292   ──►    order_item_total:    292  ✅ (working)
  order_sub_total_w/o_tax: 321.2 ──►    order_subtotal:      321.2 ✅ (working)
  order_amount:            333   ──►    payment_amount:      333  ✅ (working)
  service_tax:             29.2  ──►    serviceChargeAmount: 29.2 ✅ (working)
  gst_tax:                 0     ──►    gst_tax:             0    ❌ (currently 0→3.68 wrong)
  vat_tax:                 11.68 ──►    vat_tax:             11.68 ❌ (currently 11.68→3.68 wrong)

  BACKEND HAS 11.68 → JUST RETURN IT → FE PASSES IT THROUGH → DONE
```
