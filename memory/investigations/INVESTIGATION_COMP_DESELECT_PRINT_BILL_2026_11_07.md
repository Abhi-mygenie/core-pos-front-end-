# INVESTIGATION REPORT — Complimentary Item Deselected After Print Bill

**ID:** BUG-NEW-COMP-DESELECT (pending intake registration)
**Date:** 2026-11-07
**Agent:** INVESTIGATION (Role 6)
**Source:** OWNER-REPORTED
**Confidence:** HIGH (root cause reproduced via code trace + owner payload evidence)
**Steps used:** 8/10

---

## 1. Summary

**Root Cause 1 (PRIMARY — HIGH confidence):**
Clicking "Print Bill" in CollectPaymentPanel triggers CR-512's `CONFIRM_PRINT_STATUS` API call, which causes the backend to emit an `update-order` socket event. OrderEntry's cart-sync `useEffect` (L566) immediately re-seeds `cartItems` from the backend-hydrated order — overwriting the locally-toggled `isComplementaryRuntime: true` with the backend's `isComplementaryRuntime: false` (backend has no record of the runtime comp because comp is never persisted before print). The UI deselects the comp checkbox.

**Root Cause 2 (SECONDARY — MEDIUM confidence):**
`buildBillPrintPayload` zeros `price`, `food_amount`, `gst_tax_amount`, etc. for comp items, but does **not** zero `line_total` (stays at ₹2,790 in the payload). The integer `complementary` field also stays `0` instead of being set. Depending on what fields the printer agent template reads, the printed receipt line may show the full price or the wrong comp state.

**Classification:** FE_BUG (Root Cause 1) + FE_BUG/PLAN_GAP (Root Cause 2)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Print Bill itself resets comp state in CPP | Read `handlePrintBill` (CPP L1308-1363) | 1 | **ELIMINATED** — no state reset in CPP handler |
| H2 | Socket re-seed after print clears runtime comp | Trace CR-512 → socket → OrderEntry L566 | 2 | **CONFIRMED** — socket re-seeds ALL placed items from backend |
| H3 | `is_complementary` persisted to backend before print | Search for API calls on comp toggle | 1 | **ELIMINATED** — `handleToggleComplementary` only does `setCartItems`, no API call |
| H4 | Printer payload sends wrong fields (`complementary: 0`, `line_total: 2790`) | Read `buildBillPrintPayload` L1869-1884 + owner JSON | 2 | **CONFIRMED** — `line_total` not zeroed; integer `complementary` not set |
| H5 | Backend reads `food_details.complementary` (BUG-641 fix) so print IS correct | Cross-ref BUG-641 fix at L1873 | 1 | **PARTIAL** — `food_details.complementary: 'Yes'` IS set; `line_total: 2790` still wrong |

---

## 3. Data Flow Trace — Root Cause 1 (Deselection)

```
User clicks "Print Bill" (CPP L1399)
  → handlePrintBill (CPP L1308)
      Builds overrides including:
        runtimeComplimentaryFoodIds: [3862837, 245370]  ← CORRECT: captures comp item IDs
      → await onPrintBill(overrides) (OrderEntry L2203)
          → printOrder(orderId=1537806, 'bill', null, order, ..., overrides, printerAgents)
              → buildBillPrintPayload(order, 0, overrides) (orderTransform.js L1813)
                  isDetailComplimentary(item_3862837) = TRUE (catalog + runtime + override match)
                  → price:0, food_amount:0, is_complementary:'Yes', food_details.complementary:'Yes'
                  → line_total: 2790  ← NOT ZEROED ← Root Cause 2
                  → complementary: 0  ← NOT UPDATED ← Root Cause 2
              → api.post('/order-temp-store', payload) ← PRINTER RECEIVES PAYLOAD (mostly correct)
              → CR-512: api.post('/api/v2/vendoremployee/print/update-print-status', {bill_print:'Yes'})
                                                              ↑ THIS IS THE TRIGGER
                  Backend updates bill_print='Yes' on order 1537806
                  Backend emits update-order socket event
                                                              ↓
      Socket fires in useOrders context
        → orders[] array updated with backend-hydrated order 1537806
                                                              ↓
      OrderEntry useEffect [placedOrderId, orders] fires (L551)
        orderFromContext = orders.find(o => o.orderId === 1537806)
        placed = orderFromContext.items.map(i => ({ ...i, placed: true }))
            fromAPI.orderItem for item 3862837:
              isComplementaryRuntime = (detail.is_complementary || '').toLowerCase() === 'yes'
              Backend still has is_complementary: 'No' (never updated — comp toggle = local state only)
              → isComplementaryRuntime = FALSE  ← ROOT CAUSE: local comp state LOST
        setCartItems(prev => [...placed, ...unplaced])  ← OVERWRITES runtime comp state
                                                              ↓
      UI re-renders
        Cream of Broccoli: isComplementaryRuntime = false → CHECKBOX DESELECTED
        bill total recalculates: ₹2,790 + ₹299 = ₹3,089
```

**Break point:** `setCartItems` at OrderEntry L566 — replaces ALL placed items from socket data WITHOUT preserving local `isComplementaryRuntime` state.

---

## 4. Data Flow Trace — Root Cause 2 (Payload Missing `line_total` zero + integer `complementary`)

```
buildBillPrintPayload for comp item 3862837 (orderTransform.js L1869-1884):

ZEROED correctly:    price:0, unit_price:0, food_amount:0, variation_amount:0,
                     addon_amount:0, gst_tax_amount:0, vat_tax_amount:0, tax_amount:0
SET correctly:       is_complementary:'Yes', food_details.complementary:'Yes'

MISSING:
  line_total: 2790  ← spread from ...d, NOT overridden → printer may print ₹2,790 on line item
  complementary: 0  ← integer field unchanged (backend may expect 1 for comp)

Owner payload confirms:
  "line_total": 2790     ← should be 0 for comp item
  "complementary": 0     ← integer field: 0 when is_complementary = "Yes" (inconsistent)
  "payment_amount": 299  ← financial totals correct (comp correctly excluded from totals)
  "grant_amount": 299    ← correct
```

**Note:** `food_details.complementary: 'Yes'` is set (BUG-641 fix working). If printer agent reads THIS field for comp detection, the receipt may still print correctly despite `line_total: 2790`. Confidence for Root Cause 2 impact on printed receipt is MEDIUM (depends on printer agent template, cannot verify frontend-side).

---

## 5. Evidence Artifacts

- Owner payload: `/app/memory/evidence/BUG-NEW-COMP-DESELECT/owner_payload_2026_11_07.json`
- Screenshots: 2 owner-provided screenshots (before/after print, shared in conversation)
- Code traces:
  - `orderTransform.js` L1813-1884: `buildBillPrintPayload`
  - `orderTransform.js` L154: `isComplementaryRuntime` hydration from socket
  - `CollectPaymentPanel.jsx` L1308-1363: `handlePrintBill`
  - `OrderEntry.jsx` L551-583: cart-sync useEffect (the deselection trigger)
  - `orderService.js` L189-202: CR-512 `CONFIRM_PRINT_STATUS`

---

## 6. Why Previous Fixes Didn't Catch This

| Fix | What it addressed | Why deselection still happens |
|---|---|---|
| BUG-021 | `runtimeComplimentaryFoodIds` override so buildBillPrintPayload uses FE comp state | Printer payload is correct. Doesn't affect socket re-seed |
| BUG-018 Part 2 | `isComplementaryRuntime` hydration from backend `is_complementary` | Only helps if backend STORES it. Print path doesn't persist comp to backend |
| BUG-641 | Override `food_details.complementary:'Yes'` for printer | Printer receives correct field. Doesn't affect socket re-seed |
| CR-512 (the cause) | Confirm `bill_print:'Yes'` after successful print | Unintended side-effect: triggers `update-order` socket → state clobber |

---

## 7. Recommendations

### Fix A — Preserve `isComplementaryRuntime` during socket re-seed (Root Cause 1)
In OrderEntry L566-570, when re-seeding `setCartItems`, merge the PREVIOUS local `isComplementaryRuntime` state for each item instead of blindly replacing it:
```
// Pseudocode — preserve runtime comp during socket re-seed
const placed = orderFromContext.items.map(i => {
  const prev = prevItems.find(p => p.id === i.id);
  return {
    ...i,
    placed: true,
    _originalQty: i.qty || 1,
    // Preserve local runtime comp if it was set (don't let socket clobber it)
    isComplementaryRuntime: prev?.isComplementaryRuntime || i.isComplementaryRuntime,
    compReason: prev?.isComplementaryRuntime ? (prev?.compReason || '') : (i.compReason || ''),
  };
});
```
**Risk:** MEDIUM — touches cart state management, an R5 hotspot. Full gate flow required.

### Fix B — Zero `line_total` for comp items in `buildBillPrintPayload` (Root Cause 2)
Add `line_total: 0` to the comp item override block at orderTransform.js L1869-1884.
**Risk:** LOW — 1 line, same file as existing comp zeroing. Fast Lane eligible with owner approval.

### Planning skip eligibility:
- Fix A: NO — OrderEntry is an R5 hotspot, state management change. Full gate cycle required.
- Fix B: YES — 1 file, 1 line, LOW risk, same function as existing fix. Owner approval needed for Fast Lane.

---

## 8. Retroactive Candidates

None — all referenced items (BUG-021, BUG-018, BUG-641, CR-512) are already registered.

---

**Handover to:** INTAKE agent to register both issues, then PLANNING for Fix A gate cycle.
Root cause: HIGH confidence for deselection (Fix A). MEDIUM confidence for `line_total` impact on printer (Fix B).
FE fix: YES (both are frontend changes). Backend ask: NO.
Steps: 8/10.
