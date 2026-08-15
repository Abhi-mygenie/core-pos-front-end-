# BUG-305 Intake — orderTransform: discountRatio uses full subtotal in calcOrderTotals + buildBillPrintPayload, causing wrong GST in backend payload and bill print
**ID:** BUG-305
**Type:** Bug
**Registered:** 2026-08-11
**Registered by:** INTAKE Agent (Role 1)
**Sprint:** POS 5.1 backlog (parked from BUG-304)
**Source:** AGENT-DISCOVERED during BUG-304 Gate 2 Impact Analysis (2026-08-11)

---

## Duplicate Check

- **BUG-304** (IMPLEMENTED — QA PASS) — **RELATED** (parent bug; BUG-304 fixed the UI display in CollectPaymentPanel + CartPanel. This is the explicitly parked continuation — OD-4 = "LATER")
- **CR-028** (CLOSED 2026-06-15) — **RELATED** (original item-level discount gap; CR-028 fixed payload distribution but not the GST ratio denominator in these functions)
- **Result: DISTINCT — continuation of BUG-304 into the backend payload + print path**

---

## Description

`orderTransform.js` contains two functions that compute GST for backend payloads and bill printing. Both use `discountRatio = totalDiscount / fullSubtotal` — the same wrong-denominator pattern fixed in BUG-304 for the UI — causing incorrect GST to be:

1. **Sent to the backend server** when an order is placed or settled (`calcOrderTotals`)
2. **Printed on the customer's bill** (`buildBillPrintPayload`)

The GST displayed to the cashier is now correct (BUG-304 fix). But the GST stored in the backend database and printed on receipts still uses the wrong calculation.

---

## Two Affected Sites

### Site 1 — `calcOrderTotals` (line 823) — backend payload builder

```javascript
// orderTransform.js:823
const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
//                                    ^^^^^^^^^^^^^^ ALL items' total
//                                    should be: discountableSubtotal

const itemGstPostDiscount = gstTax * (1 - discountRatio);   // ALL items' GST reduced
const vatTaxPostDiscount  = vatTax * (1 - discountRatio);   // ALL items' VAT reduced
```

**Called from (all inside orderTransform.js):**
- Line ~1003 — `placeOrder` path (new order placement)
- Line ~1136 — `collectBill` path (order settlement)
- Line ~1264 — third call site

**Impact:** Every `POST /place-order` and `POST /collect-bill` request sends wrong `gst_tax` to the backend when non-discountable items are in a mixed cart with a discount applied.

### Site 2 — `buildBillPrintPayload` (line 1896) — print payload builder

```javascript
// orderTransform.js:1896
const discountRatio = overrideDiscount / computedSubtotal;
//                                       ^^^^^^^^^^^^^^^^ ALL items' total
gst_tax = gst_tax * (1 - discountRatio) + ...  // ALL items' GST reduced
```

**Called from:**
- `OrderEntry.jsx` — auto-print after collect bill
- `orderService.js` — service layer for bill print
- `RePrintButton.jsx` — re-print from dashboard
- `OrderCard.jsx` — print from order card
- `TableCard.jsx` — print from table card
- `AllOrdersReportPage.jsx` — print from reports

**Impact:** Every bill printed for orders with non-discountable items + discount shows wrong GST amounts.

---

## Why This Is Harder Than BUG-304

BUG-304 (UI fix) only needed to split `taxTotals` within the component — all data (giveDiscount per item) was already available in the same scope.

BUG-305 is harder because:

1. **`calcOrderTotals` doesn't receive `giveDiscount` per item.** Cart items passed to it are already-built payloads from `buildItemPayload` which strips `giveDiscount`. Fix requires:
   - Add `discountableSubtotal` to the `extras` parameter of `calcOrderTotals`
   - All internal callers (lines 1003, 1136, 1264) must pass it
   - Those callers' own callers (CollectPaymentPanel, CartPanel) must provide it (already have `discountableTotal` from BUG-304)

2. **`buildBillPrintPayload` uses backend-stored order items.** The `billFoodList` items come from the backend and may not carry `give_discount` in an accessible form. Fix path needs investigation during Gate 2.

---

## Severity & Risk

| Field | Value |
|---|---|
| **Severity** | **P1** — incorrect GST stored in backend DB for every affected order; wrong GST on printed customer receipts |
| **Risk** | **CRITICAL** — R5 (`orderTransform.js` is an explicitly listed hotspot, 1916 lines) + R6 (financial logic — GST in the backend payload and on printed bills) |
| **Area** | Order Entry → Backend Payload (place/settle) + Bill Print |
| **Fast Lane eligible** | **NO** — CRITICAL risk, hotspot file, multi-file changes |
| **Full Gate 2-3 required** | **YES** |

---

## Blast Radius

| File | Role | Change type |
|---|---|---|
| `src/api/transforms/orderTransform.js` | Primary — both bug sites | Add `discountableSubtotal` to `extras` + fix ratio in both functions |
| `src/components/order-entry/CollectPaymentPanel.jsx` | Caller — already has `discountableTotal` | Pass `discountableTotal` into transform call |
| `src/components/order-entry/CartPanel.jsx` | Caller (QSR) — already has `discountableTotal` | Same |
| `src/components/order-entry/OrderEntry.jsx` | Caller of `buildBillPrintPayload` via service | May need to pass discountableSubtotal |
| `src/api/services/orderService.js` | Service layer caller | May need signature change |

- **Scope:** LARGE (5 files, including 3 hotspot files: orderTransform.js + CollectPaymentPanel.jsx + OrderEntry.jsx)
- **Unit tests exist** for `calcOrderTotals` and `buildBillPrintPayload` — must be updated

---

## Code Reality Check

**Status: FULL** — bug present at exact lines in current codebase:

```
orderTransform.js:823   const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
orderTransform.js:1896  const discountRatio = overrideDiscount / computedSubtotal;
```

`discountableTotal` is NOT passed to these functions anywhere. No `discountableSubtotal` variable exists in this file.

---

## Evidence

- **Investigation report:** `/app/memory/investigation/INVESTIGATION_REPORT_THREE_BUGS_2026_08_11.md`
- **BUG-304 Impact Analysis (§3 Site Inventory):** `/app/memory/impact/BUG-304_IMPACT_ANALYSIS.md`
- **BUG-304 Intent (OD-4):** Owner decision: "LATER — park as BUG-304-B, separate sprint"
- **Confidence:** HIGH — code confirmed, same mathematical bug as BUG-304

---

## Open Questions for Gate 2 Planning

| OQ | Question |
|---|---|
| OQ-1 | Does `buildBillPrintPayload` have access to `give_discount` per item from backend order data? If not, what is the best way to pass `discountableSubtotal` through? |
| OQ-2 | Should `calcOrderTotals` extras receive `discountableSubtotal` explicitly, or should the cart items carry a `_isDiscountable` flag? |
| OQ-3 | What is the fix strategy for `buildBillPrintPayload`'s collect-bill path (line 1896) where `overrides.discountableSubtotal` could be passed from CollectPaymentPanel? |
| OQ-4 | Unit tests for `calcOrderTotals` (round001, cr029, qa_subtotal) need updating — scope of test changes? |

---

## Next Step

Full Gate 2 (Impact Analysis) — owner Gate 4 GO before any code.
**Do NOT proceed until Gate 2 OQs resolved** — fix path for `buildBillPrintPayload` needs curl investigation to determine if `give_discount` is available on backend order items.
Area: Order Entry → Backend Payload + Print | Priority: P1 | Risk: CRITICAL | Sprint: POS 5.1
Related: BUG-304 (IMPLEMENTED), CR-028 (CLOSED)
