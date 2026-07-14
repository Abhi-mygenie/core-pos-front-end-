# BUG-049 — Implementation Summary

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-049
> **Title:** PayLater payment leaves "NA" on available table card
> **Date:** 2026-05-12 (current session)
> **Verdict:** `implementation_complete_ready_for_smoke` ✅
> **Plan:** `/app/memory/bugs/BUG_049_PAYLATER_NA_TABLE_CARD_IMPACT_ANALYSIS.md`

---

## 1. What Was Implemented

Refined the `fOrderStatus===9` predicate in `handleOrderDataEvent` so that:

- **PayLater bill-collect** (arrives on `update-order-paid` channel) → table is freed (`'available'`).
- **Hold/Park** (arrives on any other update-order* channel) → table stays `'occupied'` (BUG-042-C contract preserved 1:1).

Backend's `update-order-paid` channel was already the unambiguous PayLater bill-collect signal — confirmed in the owner's screenshot console trace (intake §7.2). The fix simply teaches the FE to read the channel name.

`handleUpdateOrderStatus` was left functionally unchanged with a clarifying comment: `update-order-paid` does not route through this handler, so any status-9 seen there is unambiguously a Hold/Park signal and the existing `'occupied'` write is correct.

---

## 2. Files Changed

| File | Lines | Nature |
|---|---|---|
| `frontend/src/api/socket/socketHandlers.js` | `handleOrderDataEvent` terminal-detection block (L283–301 region) | Refined predicate: added `isPayLaterSettle = (fOrderStatus===9) && (eventName==='update-order-paid')`, narrowed `isHoldClear` accordingly, expanded `shouldRemove` to include either. Settle-or-paid path now writes `'available'`; Hold path unchanged. Added BUG-049 comment block. |
| `frontend/src/api/socket/socketHandlers.js` | `handleUpdateOrderStatus` terminal-detection block (L420–425 comment region) | Code unchanged; added BUG-049 comment block explaining why the predicate refinement is intentionally scoped to `handleOrderDataEvent` only. |
| `frontend/src/__tests__/api/socket/BUG_042_C_handlers.test.js` | `BUG-042-C \| handleOrderDataEvent` describe block | (a) **Narrowed** the existing `test.each([...])` Hold-path assertion to exclude `'update-order-paid'` (its previous inclusion was the over-broad case that BUG-049 corrects). (b) **Added** explicit BUG-049 test: `update-order-paid` + fOrderStatus=9 → table forced `'available'`. (c) **Added** explicit BUG-049 regression: `update-order` + fOrderStatus=9 → table STILL `'occupied'` (Hold contract preserved). |

Three edits total. No other files touched.

---

## 3. Test Results

```
PASS src/__tests__/api/socket/BUG_042_C_handlers.test.js
  BUG-042-C | handleOrderDataEvent
    ✓ U-0 update-order + fOrderStatus=9 → removeOrder, table NOT forced available
    ✓ U-1 update-order-target + fOrderStatus=9 → removeOrder, table NOT forced available
    ✓ U-2 update-order-source + fOrderStatus=9 → removeOrder, table NOT forced available
    ✓ U-3 update-item-status + fOrderStatus=9 → removeOrder, table NOT forced available
    ✓ BUG-049: update-order-paid + fOrderStatus=9 (PayLater settle) → removeOrder AND table forced available
    ✓ BUG-049 regression: update-order + fOrderStatus=9 (Hold/Park on a non-paid channel) → table STILL occupied
    ✓ regression: update-order + fOrderStatus=6 (paid) → removeOrder, table forced available
    ✓ regression: update-order + fOrderStatus=3 (cancelled) → removeOrder, table forced available
    ✓ CRITICAL GUARD: update-order + fOrderStatus=7 (Yet-to-Confirm) → updateOrder, NOT removed
  BUG-042-C | handleNewOrder insertion guard
    ✓ U-10 status-9: does NOT call addOrder
    ✓ U-11 regression status-8: does NOT call addOrder (POS2-005)
    ✓ U-12 regression status-1 (preparing): calls addOrder normally
  BUG-042-C | handleScanNewOrder insertion guard
    ✓ U-13 status-9: does NOT call addOrder
    ✓ U-14 regression status-8: does NOT call addOrder (POS2-005)
    ✓ U-15 regression status-1 (preparing): calls addOrder normally

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Time:        3.482 s
```

**15/15 PASS.** Lint clean on both edited files (no issues).

---

## 4. Behaviour Change Summary

| Scenario | Before fix | After fix |
|---|---|---|
| **PayLater bill-collect on `update-order-paid`** | Order removed; table stuck `'occupied'`; card renders `🍴 N NA` | Order removed; table flipped to `'available'`; card renders the standard `🍴 N ➕ Available` chip ✅ |
| **Hold/Park action** (any non-paid channel) | Order removed; table stays `'occupied'` (BUG-042-C) | Same — unchanged ✅ |
| **Cash/UPI/Card settle** (`fOrderStatus===6`) | Order removed; table `'available'` | Same — unchanged ✅ |
| **Cancelled order** (`fOrderStatus===3`) | Order removed; table `'available'` | Same — unchanged ✅ |
| **Yet-to-Confirm** (`fOrderStatus===7`) | Order updated; table updated | Same — unchanged ✅ |
| **status-8 / status-9 new-order insertion guard** | Order not inserted | Same — unchanged ✅ |

---

## 5. What Was NOT Changed (Honoured Scope)

- `frontend/src/components/cards/TableCard.jsx` — `|| 'NA'` fallback correct in isolation; renders the Available branch once upstream table status is right.
- `frontend/src/contexts/TableContext.jsx` — reducer correct.
- `frontend/src/contexts/OrderContext.jsx` — `removeOrder` correct.
- `frontend/src/api/socket/useSocketEvents.js` — dispatcher routing correct.
- `frontend/src/utils/statusHelpers.js` — `TABLE_ACTIVE_STATES`, `ORDER_TO_TABLE_STATUS` mapping untouched (Hold path depends on it).
- `frontend/src/api/transforms/orderTransform.js` — no payload-shape change.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — PayLater write path untouched.
- Backend / any API / any socket emission — no change required.
- `/app/memory/final/*` — not modified.
- `BUG_TEMPLATE.md` — not modified.
- All non-Dine-In rendering paths (Rooms, TakeAway, Delivery) — benefit from the upstream fix without any per-branch change.

---

## 6. Owner Smoke Checklist

1. **PayLater settle (primary fix target)** — open a Dine-In table with a running order. Collect Bill → PayLater → confirm. Return to dashboard. **Expected:** card flips to the standard `🍴 N ➕ Available` chip. **Not expected:** `NA` text.
2. **Hold/Park (BUG-042-C regression)** — open another Dine-In table with a running order. Trigger Hold/Park (without collecting bill). **Expected:** card stays Occupied with the waiter name. **Not expected:** card flipping to Available.
3. **Cash/UPI/Card settle (regression)** — open another Dine-In table; Collect Bill → Cash. **Expected:** card flips to Available. **Not expected:** stuck Occupied or stale `NA`.
4. **Cancel order (regression)** — cancel a running order. **Expected:** card flips to Available.
5. **Yet-to-Confirm order (regression)** — push a scan-and-order through to status-7. **Expected:** card stays in Yet-to-Confirm state.
6. Run on **Rooms / TakeAway / Delivery** equivalents if applicable — Room cards use the same `|| 'NA'` pattern with `customer` fallback; benefit from the same upstream fix.

---

## 7. Verdict

**`implementation_complete_ready_for_smoke`** ✅

- One refined predicate in `handleOrderDataEvent`.
- BUG-042-C Hold contract preserved 1:1 (verified by 4 narrowed parametrized tests + 1 explicit regression).
- BUG-049 PayLater path validated by 1 explicit test.
- 15/15 tests passed; lint clean.
- No backend, no `/app/memory/final/`, no `BUG_TEMPLATE.md` updates.

QA report at `/app/memory/bugs/BUG_049_QA_REPORT.md`.
