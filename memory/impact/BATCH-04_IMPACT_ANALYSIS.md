# BATCH-04 — Impact Analysis (Gate 2)

**Date:** 2026-08-19
**Agent Role:** PLANNING (Gate 2 — Impact Analysis only)
**Items:** BUG-334, BUG-335, BUG-170
**Status:** COMPLETE — awaiting owner review → Gate 3

---

## Code Reality Check

```bash
grep -n "cartKeyRef\|setCartItems\(\[\]\)" src/components/order-entry/OrderEntry.jsx
# BUG-334: CONFIRMED at lines 484-486 — explicit setCartItems([]) clears cart on table switch

grep -n "variationPerUnit\|optionPrice" src/api/transforms/orderTransform.js | grep 1950
# BUG-170: CONFIRMED at lines 1950-1975 — no variationPerUnit in manual print path

grep -n "onPgPaymentRequested\|pgPayment\|send.*link\|SendPaymentLink" src/components/order-entry/CollectPaymentPanel.jsx
# BUG-335: CONFIRMED — no PG intercept exists
```

**Code Reality: NONE** — no partial fix present for any of the three items.

---

## Conflict Pre-Check

| File | Recently Modified By | Conflict? |
|---|---|---|
| `OrderEntry.jsx` | BUG-330 (2026-08-19 BATCH-02) — `allowPostServeCancel` gate | SAFE — touches different lines (serve cancel, ~L1300 area) |
| `CollectPaymentPanel.jsx` | BUG-304 (2026-08-11) — taxTotals split; BUG-305 (2026-08-11) — discountableRatio | **CAUTION** — hotspot with recent changes; read those edits before touching |
| `orderTransform.js` | BUG-305 (2026-08-11) — BUG-271 (2026-07-30) — multiple hotspot edits | **CAUTION** — hotspot; verify lines 1950-1975 are still at expected positions |
| `WhatsAppPaymentModal.jsx` | CR-017 (2026-06-08) | SAFE — no changes since June |

**Rule R16 compliance:** All hotspot files checked. Execution order within batch: BUG-334 first (safe 1-file), then BUG-170 (orderTransform hotspot), then BUG-335 (CollectPaymentPanel hotspot — highest risk, last).

---

## BUG-334 — Pre-Place Table Switch Clears Food Cart

### Data Flow Trace
```
User changes table picker in OrderEntry
  → table?.id changes
  → useEffect [table?.id, orderType] fires (line 358)
    → oldKey = cartKeyRef.current (previous table id)
    → newKey = table?.id
    → if (oldKey !== newKey): onCartChange(oldKey, cartItems)  ← saves old cart
    → cartKeyRef.current = newKey
    → if (savedCart.length > 0): setCartItems(savedCart)      ← Table 2 has no saved cart
    → else if (orderData): setCartItems(existingItems)         ← Table 2 has no placed order
    → else: setCartItems([])                                   ← ← BUG IS HERE (line 485)
```

### Root Cause
`OrderEntry.jsx:485` — `setCartItems([])` fires in the `else` branch when switching to any table with no saved cart and no placed order, regardless of whether the CURRENT cart has items.

### Risk Classification
**MEDIUM** — cart state logic. Does NOT touch API, financial calculations, or settlement. Only affects in-hand (unplaced) cart items on table switch.

### Files Affected
| File | Lines | Change Nature |
|---|---|---|
| `src/components/order-entry/OrderEntry.jsx` | 484-486 | Guard: skip `setCartItems([])` on table switch if no `orderData` |

**Files WILL NOT touch:** CollectPaymentPanel, orderTransform, DashboardPage, CartPanel

### Exact Change

**Current (line 484-486):**
```js
    } else {
      setCartItems([]);
    }
```

**Proposed:**
```js
    } else if (oldKey !== null) {
      // BUG-334: Table switch with no saved cart and no placed order.
      // Preserve current cartItems — staff is mid-order-build.
      // Initial mount (oldKey === null) still starts with empty cart.
    } else {
      setCartItems([]);
    }
```

**Why `oldKey !== null` is the signal:** `oldKey` is `null` only on initial mount (first render). Any subsequent table change produces a non-null `oldKey`. This correctly distinguishes "first open" (clear) from "switch table mid-build" (preserve).

### Owner Decision
**OQ-334-A:** When switching to a table that already has a **prior saved cart** (staff was building an order for it earlier), should the carts **merge** or should the in-hand cart take priority?

- **Option A (Recommended):** In-hand cart takes priority — the `savedCart.length > 0` branch already fires first and loads Table 2's saved cart, replacing in-hand items. To carry in-hand items, we'd also need to modify that branch. **Simpler: just fix the empty-table case (line 485).**
- **Option B:** Merge — more complex, lower priority.

*Recommend Option A (fix empty-table case only) unless owner specifies merge.*

### Verification Matrix
| # | Change | How to Verify |
|---|---|---|
| 1 | `oldKey !== null` guard | Add items to cart → switch table → verify items persist |
| 2 | Initial open | Open OrderEntry fresh → verify cart starts empty |
| 3 | Switch to table with placed order | Verify placed order loads correctly (orderData branch unaffected) |
| 4 | Switch to table with saved cart | Verify saved cart still loads (savedCart.length > 0 branch unaffected) |

### Fast Lane Eligibility
**FAST LANE ELIGIBLE** — 1 file, ~4 lines, no API/financial/hotspot. Requires owner approval.

---

## BUG-335 — PG Payment Method Triggers Immediate OrderEntry Close

### Data Flow Trace
```
Staff selects "razorpay" in CollectPaymentPanel
  → setPaymentMethod("razorpay")
  → Staff clicks "Collect Bill" → handlePayment() (line 1032)
    → builds paymentData { payment_method: "razorpay", ... }
    → onPaymentComplete(paymentData)
      → OrderEntry receives → navigateAfterOrderAction()
        → onClose()                     ← ← BUG: closes before customer pays
```

**Missing:** No PG detection. No `WhatsAppPaymentModal` in OrderEntry. No "payment link sent" holding state.

### Risk Classification
**HIGH** — touches payment collection flow. Order marked as paid before customer completes payment. Financial data integrity risk. Full gate cycle required. **Owner approval mandatory at Gate 4.**

### Files Affected
| File | Lines | Change Nature |
|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` | ~101-103, ~1032, ~1150 | Detect PG method, intercept `handlePayment` → call new `onPgPayment` callback |
| `src/components/order-entry/OrderEntry.jsx` | ~50-55 (props), ~new state | Add `WhatsAppPaymentModal` + PG holding state |

**Files WILL NOT touch:** orderTransform, DashboardPage, paymentLinkService (already exists for OrderCard)

### Impact Breakdown

**A. CollectPaymentPanel.jsx changes:**
1. Detect PG type: `const isPgMethod = (paymentMethod || '').toLowerCase() === 'razorpay' || dynamicPaymentTypes.find(dt => dt.id === paymentMethod)?.type === 'pg'`
2. In `handlePayment()`: if `isPgMethod`, call `onPgPaymentRequested(order.phone)` instead of `onPaymentComplete(paymentData)`
3. Caller (OrderEntry) gets the intercept signal and shows the WhatsApp modal

**B. OrderEntry.jsx changes:**
1. Add `showPgPaymentModal` state
2. Add `pgPhone` state (pre-filled from current customer phone)
3. Mount `WhatsAppPaymentModal` when `showPgPaymentModal = true`
4. On modal close → show "Payment link sent — awaiting customer payment" toast
5. **Key:** Do NOT call `onClose()` after sending the link. OrderEntry stays open.

### Owner Decisions Required (GATE 3 BLOCKED until answered)

| # | Question | Options |
|---|---|---|
| **OQ-1** | Should "Collect Bill" button label change to "Send Payment Link" when PG is selected, or keep "Collect Bill" and show a modal? | A: Change button label to "Send Payment Link" (clearer UX) · B: Keep "Collect Bill" label, intercept with modal |
| **OQ-2** | After PG link is sent — should OrderEntry stay open (staff monitors) or return to Dashboard? | A: Stay open — order in "link sent" state · B: Return to Dashboard (order shows as "pending payment") |
| **OQ-3** | How is "payment confirmed" signalled? Via socket event / webhook callback? Or should staff manually close after customer pays? | A: Socket/webhook drives auto-close · B: Manual close button after staff confirms |

*Cannot write Gate 3 Implementation Plan until OQ-1, OQ-2, OQ-3 are answered.*

### Verification Matrix (indicative — final after Gate 3)
| # | Test | Steps | Expected |
|---|---|---|---|
| 1 | PG method intercept | Select razorpay → click Collect Bill | WhatsApp modal opens, NOT order close |
| 2 | Non-PG method unaffected | Select Cash → click Collect Bill | Normal collect bill flow unchanged |
| 3 | OrderEntry stays open | Send PG link → close modal | OrderEntry visible, no navigation |
| 4 | Toast notification | After sending link | "Payment link sent" toast shown |

---

## BUG-170 — Variation Upcharge Missing from Fallback Subtotal Loop

### Data Flow Trace
```
Staff opens OrderCard → clicks Bill Print (manual reprint)
  → buildBillPrintPayload(order) called
  → hasFinancialOverrides = false (no CollectBill context)
  → MANUAL PRINT PATH fires (lines 1939-1975)
    → billFoodList.forEach(item =>
        const addonPerUnit = item.add_ons.reduce(...)
        const lineTotal = (price × qty) + (addonPerUnit × qty)
        ← MISSING: variationPerUnit — item.variation[].values[].optionPrice
      )
  → computedSubtotal is WRONG (missing variation upcharge for each item)
  → order_item_total sent to printer = subtotal without variation
  → Receipt shows wrong item total
```

### Root Cause
`orderTransform.js:buildBillPrintPayload` — MANUAL PRINT PATH (else branch, ~line 1950-1975) computes `addonPerUnit` but has no `variationPerUnit` computation. Variation data IS available on `item.variation[].values[].optionPrice` (confirmed from `fromAPI.order` at line 135 which preserves `variation` array on order items).

Same pattern was already fixed for addons (BUG-168 v2, 2026-07-08). Variations were left out as a separate candidate (BUG-170).

### Risk Classification
**MEDIUM** — affects bill print payload (`order_item_total` field). This is a display/print accuracy issue, NOT a live transaction. The ACTUAL payment is already collected at this point (manual reprint is post-settlement). Still requires full gate.

### Files Affected
| File | Lines | Change Nature |
|---|---|---|
| `src/api/transforms/orderTransform.js` | ~1950-1960 (MANUAL PATH) and ~1864-1874 (COLLECT BILL PATH) | Add `variationPerUnit` computation + add to `lineTotal` |

**Files WILL NOT touch:** OrderEntry, CollectPaymentPanel, DashboardPage, CartPanel, reportTransform

### Exact Change

**In MANUAL PRINT PATH (lines ~1952-1959) — PRIMARY FIX:**

Current:
```js
const addonPerUnit = (item.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
  0
);
const lineTotal = (price * qty) + (addonPerUnit * qty);
```

Proposed:
```js
const addonPerUnit = (item.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
  0
);
// BUG-170: add variation upcharge (item.variation[].values[].optionPrice)
const variationPerUnit = (item.variation || []).reduce(
  (sum, v) => sum + (v.values || []).reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0), 0
);
const lineTotal = (price * qty) + (addonPerUnit * qty) + (variationPerUnit * qty);
```

**In COLLECT BILL PATH (lines ~1864-1874) — SECONDARY FIX (symmetry):**
Same addition. Collect Bill PATH `unit_price` may include variation in some code paths but not all. Adding `variationPerUnit` as a guard is safe because if `unit_price` already includes variation, `item.variation` will be present in the API shape and adds the correct amount.

**CAUTION**: Verify this does NOT double-count variation in CollectPaymentPanel's `getItemLinePrice`. If `unit_price` from placed-order API already includes variation, the Collect Bill PATH should NOT add it again. **Recommend MANUAL PATH fix only at Gate 4 unless testing confirms Collect Bill PATH also needs it.**

### Verification Matrix
| # | Change | How to Verify |
|---|---|---|
| 1 | MANUAL PATH fix | Order with variation item → reprint via Bill Print → `order_item_total` includes variation upcharge |
| 2 | No regression for non-variation items | Order with no variation → reprint → totals unchanged |
| 3 | Collect Bill PATH (if included) | Settle order with variation item → collected subtotal correct |

---

## Batch Execution Order

**MANDATORY SEQUENTIAL — gate 4 per item:**

1. **BUG-334** — 1 file, 4 lines, FAST LANE if owner approves. Safe to ship first.
2. **BUG-170** — 1 file (orderTransform hotspot), 5-7 lines. Ship before BUG-335 to keep CollectPaymentPanel stable.
3. **BUG-335** — 2 files (hotspots), HIGH risk. Last in batch. Needs OQ answers first.

---

## Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-334, BUG-335, BUG-170 → status: GATE_3_PLAN or GATE_4_GO
- [ ] BUG_TRACKER.md: rows updated to Gate 2 status
- [ ] FILE_OWNERSHIP.md: add after implementation
- [ ] Code markers: // BUG-334, // BUG-335, // BUG-170 in every modified file
```

---

## Summary

| ID | Risk | Files | Lines | Open Questions | Gate 3 Ready? |
|---|---|---|---|---|---|
| BUG-334 | MEDIUM | 1 | ~4 | OQ-334-A (merge vs replace — optional) | **YES — Fast Lane eligible** |
| BUG-335 | HIGH | 2 | ~30-50 | OQ-1, OQ-2, OQ-3 (all required) | **NO — awaiting owner answers** |
| BUG-170 | MEDIUM | 1 | ~7 | None | **YES** |

**Next: Owner to answer BUG-335 OQ-1, OQ-2, OQ-3 → then Gate 3 (Implementation Plan) → Gate 4 GO.**
