# CR-008 Sub-CR #1 — Detailed QA Handover

**For:** Owner / QA team manual validation on preprod
**Covers:** All 3 rounds shipped 2026-05-03 — D1-Cap R1 + D1-Cap R2 + D1-Gate
**Login:** `owner@palmhouse.com` / `Qplazm@10` (Palm House, restaurant_id 541)
**Preview URL:** `https://insights-phase.preview.emergentagent.com/`
**Other available restaurants:** 364, 475, 478, 509, 510, 523, 595, 635, 669, 675, 687, 699, 709, 716 (use the keys configured in `/app/frontend/.env`)
**Rollback playbook (sister doc):** `/app/memory/change_requests/implementation_handover/CR_008_SUB_1_ROLLBACK_PLAYBOOK.md`

---

## 0. Summary — what shipped this session

| Round | Bucket | One-liner | Files |
|---|---|---|---|
| 1 | D1-Cap (UI capture) | Cashier can now enter delivery charge at Order Entry — inside the New Address modal AND inline in the right-panel cart row. | 4 |
| 2 | D1-Cap (totals fix) | The delivery charge is now folded into `order_amount` / `tax_amount` / `round_up` so dashboard tiles, audit reports, and bill prints all show the correct total. | 1 |
| 3 | D1-Gate (override rule) | Collect Bill's delivery-charge field readOnly rule changed from "value > 0" to "isPrepaid". Cashiers can now correct typos / add forgotten amounts on non-prepaid orders. Prepaid orders still locked. | 2 |

---

## 1. Pre-flight — make sure preprod is on the right code

Before testing, confirm in your browser DevTools (Console):

```js
// Should not produce errors. App should boot to login.
```

In the URL bar, the page should say "MyGenie POS" or similar after login.

Open `/app/frontend/.env` if you ever want to verify the right backend is wired:

```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
```

---

## 2. The 17-scenario walkthrough

Walk these in order. Each scenario has: **steps**, **expected**, **what to check in DevTools**, **fail criteria → which round to suspect**.

### SCENARIO 1 — POS delivery, fresh order, NEW address path

**Steps:**
1. Dashboard → New Order → Delivery → enter customer phone → if address picker opens with "Add New Address", click it (or click + to add a new one).
2. Fill the address form. Scroll to the bottom — confirm a new field is visible: **"Delivery Charge (₹) · per this order"**.
3. Type `50` in that field.
4. Click "Save Address".
5. The address modal closes. Look at the right-panel cart:
   - You should see the address strip (selected address) at the top.
   - Below items list (after you add a couple of items), a row labelled **"Delivery Charge ₹ 50"** with an editable input.
6. Click "Place Order".
7. Open DevTools Network tab BEFORE clicking, then inspect the POST `/place-order` payload (multipart, look at `data` field).

**Expected:**
- ✅ "Delivery Charge" field visible in modal (D1-Cap R1)
- ✅ Cart row labelled "Delivery Charge ₹50" appears below items, editable inline (D1-Cap R1)
- ✅ Collect Bill button at the bottom shows total **including ₹50** (D1-Cap R1)
- ✅ Network payload `data` has:
   - `delivery_charge: 50` (D1-Cap R1)
   - `order_amount` ≈ items + tax + 50 (D1-Cap R2)
   - `tax_amount` includes GST on delivery using avg item rate (D1-Cap R2)

**Fail → suspect:**
- Field missing in modal → D1-Cap R1 broken
- Cart row not appearing → D1-Cap R1 broken in CartPanel
- Payload `delivery_charge: 0` → D1-Cap R1 broken in OrderEntry/orderTransform
- Payload `delivery_charge: 50` but `order_amount` missing 50 → **D1-Cap R2 broken**
- Dashboard tile after place shows old amount missing delivery → D1-Cap R2 broken

---

### SCENARIO 2 — POS delivery, fresh order, SAVED address path

**Steps:**
1. New Order → Delivery → enter a customer phone that already has a saved address.
2. Address picker opens with the saved address; tap it. Modal closes.
3. Right-panel cart row shows "Delivery Charge ₹ 0" with an editable input.
4. Type `30` directly in the cart row input.
5. Add items, click Place Order.

**Expected:**
- ✅ Inline-edit on cart row works without re-opening the modal (D1-Cap R1 inline-edit)
- ✅ Collect Bill button total updates as you type (D1-Cap R1 button math)
- ✅ Payload `delivery_charge: 30`, `order_amount` includes 30 (R1 + R2)

**Fail → suspect:**
- Inline edit doesn't persist → D1-Cap R1
- Button total static while you type → D1-Cap R1 button-math regression

---

### SCENARIO 3 — POS delivery, forgot to enter charge

**Steps:**
1. New Order → Delivery → pick saved address, **don't type any delivery charge**.
2. Add items. Cart row shows "Delivery Charge ₹ 0" but you don't fill it.
3. Place Order.
4. Click into Collect Bill screen.

**Expected:**
- ✅ Collect Bill delivery field is **empty and editable** (D1-Gate, since `isPrepaid=false` and `initialDeliveryCharge=0`)
- ✅ Cashier can type ₹40 there → bill total recomputes
- ✅ Save → payment payload has `delivery_charge: 40`

**Fail → suspect:**
- Field locked → D1-Gate broken (lock condition wrong)
- Field accepts but bill total doesn't reflect → CollectPaymentPanel rawFinalTotal regression (NOT this session)

---

### SCENARIO 4 — POS delivery, typed wrong amount, correct on Collect Bill

**Steps:**
1. New Order → Delivery → AddressFormModal → type ₹50 → save.
2. Add items, Place Order.
3. Click Collect Bill.

**Expected:**
- ✅ Delivery field shows ₹50 and is **editable** (D1-Gate — because order is non-prepaid)
- ✅ Tooltip: "Enter or edit delivery charge"
- ✅ Cashier types ₹40 over the existing 50 → bill total recomputes
- ✅ Pay → payload `delivery_charge: 40`

**Fail → suspect:**
- Field locked at ₹50 → D1-Gate broken (this is the EXACT correction-gap that D1-Gate was built to close)

---

### SCENARIO 5 — Prepaid scan order, delivery > 0 (anti-tamper)

**Steps:**
1. From the customer-app side, place a scan order with delivery charge ₹20 (or wait for one to arrive).
2. On dashboard, the prepaid order arrives.
3. Open it → Collect Bill is auto-engaged (since prepaid).
4. Inspect the delivery field.

**Expected:**
- ✅ Field shows ₹20 and is **read-only** (D1-Gate preserves BUG-019 anti-tamper for prepaid)
- ✅ Tooltip: "Delivery charge already collected from customer — not editable"
- ✅ Lock-style background (light gray, cursor-not-allowed)

**Fail → suspect:**
- Field editable for prepaid → D1-Gate broken (BUG-019 regression, critical)

---

### SCENARIO 6 — Prepaid scan order, delivery = 0

**Steps:**
1. Find / create a scan prepaid order with no delivery charge.
2. Open it → Collect Bill.

**Expected:**
- ✅ Field empty and **read-only** (NEW under D1-Gate; was editable under BUG-019)
- ✅ Tooltip: "Order is prepaid — delivery charge cannot be modified"

**Note:** This scenario behaves slightly differently than before D1-Gate — that's intentional per Owner approval. Prepaid bills are settled, the field has no purpose.

**Fail → suspect:**
- Field editable → tooltip mismatch / D1-Gate not applying for `isPrepaid && delivery=0`

---

### SCENARIO 7 — Re-engage non-prepaid delivery order

**Steps:**
1. Pick any in-POS delivery order placed earlier today (delivery > 0).
2. Open Collect Bill (or Order Entry).
3. Confirm both surfaces show the persisted charge:
   - Right-panel cart row shows the value (editable)
   - Collect Bill field shows the value (editable per D1-Gate)

**Expected:**
- ✅ Cart row editable (D1-Cap R1 + state re-seeding from BUG-019 path)
- ✅ Collect Bill editable (D1-Gate)
- ✅ Both show same number

**Fail → suspect:**
- Mismatch between two surfaces → D1-Cap state seed broken (one of 4 sites: savedCart / re-engage / socket / split-bill)

---

### SCENARIO 8 — Update Order on a placed delivery order

**Steps:**
1. Re-engage a placed delivery order with delivery ₹50.
2. Add ₹40 of new items.
3. Click Update Order.
4. Inspect PUT `/update-place-order` payload (JSON).

**Expected:**
- ✅ `delivery_charge: 50` (preserved)
- ✅ `order_amount` ≈ all items + tax + 50 (D1-Cap R2)
- ✅ Dashboard tile updates to new total INCLUDING ₹50

**Fail → suspect:**
- `delivery_charge: 0` → D1-Cap R1 update-path broken
- Update succeeds but tile drops delivery → D1-Cap R2 update-path broken

---

### SCENARIO 9 — Dashboard / OrderCard / Audit Report totals

**Steps:**
1. Place a delivery order with ₹50 charge.
2. Return to dashboard. Note the tile amount.
3. Click into the order detail (drawer / modal). Note the amount shown.
4. Open Reports → Audit Report. Find the order. Note the Amount column.

**Expected:** All three numbers match and INCLUDE delivery (D1-Cap R2).

**Fail → suspect:**
- Tile amount missing delivery → D1-Cap R2 broken (most likely)
- Detail drawer different from tile → fromAPI.order() hydration anomaly (NOT this session)
- Audit Report different → reportTransform.js change needed (NOT this session, file uses backend's order_amount which is now correct)

---

### SCENARIO 10 — Bill print

**Steps:**
1. From a placed delivery order, click Print Bill.
2. Capture the print preview / printed bill.

**Expected:**
- Grand Total includes delivery (D1-Cap R2 — `buildBillPrintPayload` reads `order.amount` which now includes delivery)
- Subtotal / Tax / SC lines as before — print template not touched this session

**Fail → suspect:**
- Grand Total missing delivery → backend not echoing `order_amount` correctly OR D1-Cap R2 broken
- Print template missing a delivery line → out of scope this session (raise as separate ticket if business-critical)

---

### SCENARIO 11 — Collect Bill grand total parity with Order Entry button

**Steps:**
1. Place a ₹100 items + ₹50 delivery order on a 5%-GST menu.
2. Order Entry button shows "Collect Bill ₹X".
3. Click into Collect Bill, observe Grand Total.

**Expected:**
- Both within ±₹0.50 of each other (rounding paths differ — Owner accepted at Gap 2 / Option 2A).
- Both INCLUDE delivery + GST on delivery + GST on SC.

**Fail → suspect:**
- Order Entry button missing delivery → D1-Cap R1 button-math broken
- Numbers wildly differ (more than ₹0.50) → CollectPaymentPanel rawFinalTotal regression OR rounding rule diverged (NOT this session)

---

### SCENARIO 12 — Non-delivery order types (regression)

**Steps:**
1. New Order → Dine-in → add items → place.
2. New Order → Walk-in → add items → place.
3. New Order → Takeaway → add items → place.

**Expected (all 3):**
- ✅ No "Delivery Charge" row in cart
- ✅ No "Delivery Charge" field in any modal
- ✅ Network payload `delivery_charge: 0`
- ✅ Collect Bill has no delivery line
- ✅ Dashboard tile = items + tax (no delivery component)

**Fail → suspect:**
- Delivery row appears for non-delivery → CartPanel `orderType === 'delivery'` gate broken
- Payload non-zero → OrderEntry gate broken (`orderType === 'delivery' ? deliveryCharge : 0`)

---

### SCENARIO 13 — Inline edit interaction edge cases

**Steps:**
1. Cart row editable for a delivery order. Try:
   - Type a negative number
   - Type a very large number (e.g. 99999)
   - Type letters
   - Clear the field entirely
2. After each, observe button total + state.

**Expected:**
- HTML5 `min="0"` / `step="0.01"` blocks negatives (browser rejects)
- Large numbers accepted (no max constraint)
- Letters: input ignores non-numeric
- Empty field treated as 0 → button total drops

**Fail → suspect:**
- Negative accepted → `<input min="0">` removed
- NaN appears in button → `parseFloat` not guarded

---

### SCENARIO 14 — Cancel modal mid-entry

**Steps:**
1. Open AddressFormModal, type 75 in delivery charge, then click Cancel/Close (X).
2. Re-open AddressFormModal.

**Expected:**
- Previous attempted value NOT persisted (modal cancelled cleanly).
- Re-opened with whatever value was already in OrderEntry state (initial 0 or prior).

**Fail → suspect:**
- Stale value carried → AddressFormModal state-leak (D1-Cap R1 regression)

---

### SCENARIO 15 — Re-print bill (BUG-277)

**Steps:**
1. From a placed delivery order, click Re-Print Bill chip in CartPanel header.

**Expected:**
- Print payload uses `order.amount` which now includes delivery (R2-fixed).
- Grand Total on the reprinted bill includes delivery.

**Fail → suspect:** R2 broken or `buildBillPrintPayload` regression (NOT this session, file untouched).

---

### SCENARIO 16 — Cross-bucket regression (other shipped buckets)

**Steps:**
1. Confirm A2 — Order ID chip visible on dashboard cards.
2. Confirm B2-split — Audit Report PG columns under PG filter (Order ID, PG Amount).
3. Confirm B1 — Multi-select variations on Big Buddha Burger (Add to cart with multiple sizes).
4. Confirm D1 — "Stay on Order Entry After Collect Bill" toggle in Settings; place + collect → cashier stays on Order Entry.
5. Confirm Merge / Table-Shift buttons hidden on prepaid dashboard cards.
6. Confirm `mygenie_stay_on_order_after_bill` localStorage key still present (DevTools → Application → Local Storage).

**Expected:** All pass — no regressions in prior buckets.

**Fail → suspect:** Cross-bucket impact (rare; OrderEntry is shared, but D1-Cap/D1-Gate edits were narrowly scoped).

---

### SCENARIO 17 — Console / network sanity

**Steps:**
1. Throughout all scenarios above, keep DevTools Console + Network open.
2. Take note of:
   - Any red console errors (uncaught exceptions, prop warnings)
   - Any 4xx / 5xx network responses
   - Any new warnings post-this-session

**Expected:**
- No new red console errors specific to delivery-charge code
- No 4xx on `/place-order`, `/update-place-order`, `/place-order-payment`, `/get-order-detail`, `/get-customer-details`
- Webpack only emits the existing `LoadingPage.jsx` warning

**Fail → suspect:** Any new error → snapshot Console + offending request and reference the rollback playbook.

---

## 3. DevTools payload reference

When inspecting a delivery order's place-order payload, the relevant fields after this session should look like:

```json
{
  "order_type": "delivery",
  "delivery_charge": "50.00",
  "order_sub_total_amount": "100.00",
  "service_tax": "0.00",
  "tax_amount": "7.50",     // 5 (item GST) + 2.5 (delivery GST at avg rate)
  "gst_tax": "7.50",
  "service_gst_tax_amount": 0,
  "tip_amount": 0,
  "tip_tax_amount": 0,
  "round_up": "0.50",
  "order_amount": "158.00", // 100 items + 7.5 tax + 50 delivery + 0.5 round
  "address_id": 1234,
  "user_id": "...",
  "restaurant_id": "...",
  "table_id": "0",
  "cust_name": "...",
  "cust_mobile": "..."
}
```

For non-delivery orders the payload should have `delivery_charge: 0` and `order_amount` unchanged from pre-session shape.

---

## 4. What's a "blocker" vs "follow-up" finding

### Blocker (rollback recommended)
- Place-order fails / 5xx
- Dashboard cards crash on render
- Pre-existing scenarios broken (any of A2, B1, B2-split, D1)
- Prepaid scan order delivery field becomes editable (BUG-019 regression)

### Follow-up (log as next-bucket fix, do NOT rollback)
- Tooltip wording you don't like
- Cart row styling preferences
- GST on SC / delivery using avgGstRate instead of profile keys (already a known gap → CR-013)
- Postpaid scan orders becoming editable (rare, accepted at gate flip)

### Cosmetic (future polish)
- Spacing / alignment of the new cart row
- Helper text wording in AddressFormModal

---

## 5. Where to log a finding

| Severity | File path |
|---|---|
| Blocker | `/app/memory/change_requests/qa_reports/D1_PREPROD_BLOCKER_<DATE>.md` — include scenario # + screenshot + DevTools |
| Follow-up | `/app/memory/change_requests/qa_reports/D1_PREPROD_FOLLOWUP_<DATE>.md` |
| Cosmetic | Same as follow-up; tag as `[COSMETIC]` |

---

## 6. After QA — sign-off path

1. Run all 17 scenarios. Tick each as PASS / FAIL / SKIPPED.
2. Capture a single screenshot at the end of Group A (cart row visible) and Group B (Collect Bill field state).
3. Email / message Owner with summary: "X / 17 passed; failures: ...".
4. If all pass → message implementation agent "All scenarios pass; safe to clean up backups".
5. Implementation agent will then:
   - Remove `OrderEntry.jsx.bak.d1cap`
   - Remove `orderTransform.js.bak.d1cap`
   - Remove `CollectPaymentPanel.jsx.bak.d1gate`
   - Update PRD.md
   - Finish session

---

## 7. Reference docs

- D1-Cap R1 handover: `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md`
- D1-Cap R2 QA note: `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_ROUND2_QA_NOTE.md`
- D1-Gate handover: `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_GATE_OVERRIDE_RULE_HANDOVER.md`
- Rollback playbook: `/app/memory/change_requests/implementation_handover/CR_008_SUB_1_ROLLBACK_PLAYBOOK.md`
- Future GST work: `/app/memory/change_requests/CR_013_GST_CONFIG_CORRECTION.md`
- Parent CR doc: `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`

---

**End of QA handover. Validate at your pace; this session stays parked with backups in place until you give the green light.**
