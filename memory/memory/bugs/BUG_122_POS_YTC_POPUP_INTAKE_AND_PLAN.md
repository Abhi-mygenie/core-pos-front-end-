# BUG-122 — Intake + Impact Analysis + Implementation Plan

**Status:** CLOSED — OWNER VERIFIED (Gates 0–6)
**Priority:** P1
**Sprint:** POS 4.0
**Date:** 2026-06-10
**Reporter:** Owner
**Related:** ScanOrderPopOut, OrderCard, CR-018

---

## 1. Problem Statement (Owner Verbatim)

> POS-placed orders with `f_order_status: 7` are triggering the ScanOrderPopOut web confirmation popup. The popup should ONLY appear when `order_from` is `'web'`. If `order_from` is NOT `'web'` (e.g. `'pos'`), the order should appear as a normal OrderCard on the dashboard — no popup. The card should have a tick mark (✓) button instead of "Confirm" text. Clicking the tick advances the order to Ready or Served per restaurant config (`def_ord_status`).

**Evidence:** Order #010631, `order_from: "pos"`, `f_order_status: 7`, `order_type: "dinein"` — incorrectly showed ScanOrderPopOut popup.

---

## 2. Root Cause

**`ScanOrderPopOut.jsx:52-59`** — The predicate `isUnconfirmedScanOrder` uses `fOrderStatus === 7` as the **sole** web-origin proxy:

```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled;
```

The comment says: *"fOrderStatus === 7 (YTC) is exclusively for web/scan orders. POS orders never go through a 'Yet to Confirm' step."*

**This assumption is wrong.** Backend CAN assign `fOrderStatus: 7` to POS-placed orders (proven by order #010631 with `order_from: "pos"`, `f_order_status: 7`).

**Secondary issue:** `OrderCard.jsx:844` renders the `isYetToConfirm` footer with full Accept/Reject buttons for ALL `fOrderStatus 7` orders, including POS ones. The desired behavior for POS `fOrderStatus 7` is a simple tick (✓) button.

---

## 3. Desired Behavior

| Condition | Current | Target |
|---|---|---|
| `fOrderStatus === 7` + `order_from === 'web'` | ScanOrderPopOut popup + Accept/Reject in OrderCard | **No change** — popup + full Accept/Reject stays |
| `fOrderStatus === 7` + `order_from !== 'web'` (e.g. `'pos'`) | ScanOrderPopOut popup (WRONG) + Accept/Reject in OrderCard | **No popup.** Normal OrderCard with **tick (✓) button only** (no Reject). Tick advances to next status per `defaultOrderStatus` (Ready or Served). |

---

## 4. Blast Radius — File-by-File

### 4.1 `ScanOrderPopOut.jsx` — Predicate tightening

**Current (L58-59):**
```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled;
```

**Target:**
```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled && order.isWebOrder;
```

**Change:** Add `&& order.isWebOrder` — only web-origin orders trigger the popup.

**Risk:** LOW. `isWebOrder` is set by `fromAPI.order` (L243: `isWebOrder: normaliseOrderFrom(api.order_from) === 'web'`). For `scan-new-order` socket path, L574 explicitly sets `transformedOrder.isWebOrder = (orderFrom === 'web')`. For minimal order path, L588 sets `isWebOrder: orderFrom === 'web'`. All paths covered.

**Lines changed:** 1

---

### 4.2 `OrderCard.jsx` — Split footer for POS YTC orders

**Current (L277):**
```js
const isYetToConfirm = order.status === "yetToConfirm" || order.status === "pending";
```

This drives the full Accept/Reject footer at L844-866 for ALL fOrderStatus 7 orders.

**Target:** Differentiate between web YTC and POS YTC:

```js
const isYetToConfirm = order.status === "yetToConfirm" || order.status === "pending";
const isWebYetToConfirm = isYetToConfirm && order.isWebOrder;
const isPosYetToConfirm = isYetToConfirm && !order.isWebOrder;
```

**Footer change at L844:**

| Case | Current | Target |
|---|---|---|
| `isWebYetToConfirm` | Full Accept/Reject (L844-866) | **No change** |
| `isPosYetToConfirm` | Full Accept/Reject (same) | **Tick (✓) button only.** No Reject. Tick calls `onAccept(order)` → `handleConfirmOrder` → `confirmOrder(orderId, role, defaultOrderStatus)`. |
| Neither | Normal KOT/Cancel/Ready/Serve flow | **No change** |

**UI for POS YTC tick button:**
- Icon: `Check` from lucide-react (already imported at L2)
- Style: green background, white check icon, same 44px touch target
- No text label — icon only
- Same onClick as current Accept: `onAccept?.(order)`
- Same disabled logic: `isActionInProgress`

**Lines changed:** ~15

---

### 4.3 `OrderCard.jsx` — Snooze button gating

**Current (L470-471):**
```js
{isYetToConfirm && onToggleSnooze && (
```

Snooze is a web-order-specific action (mute the popup notification). Should only show for web YTC.

**Target:**
```js
{isWebYetToConfirm && onToggleSnooze && (
```

**Lines changed:** 1

---

### 4.4 Other existing guards using `isYetToConfirm`

Audit of all `isYetToConfirm` usages in OrderCard:

| Line | Usage | Change needed? |
|---|---|---|
| L470 | Snooze button visibility | YES → `isWebYetToConfirm` (snooze is web-popup-specific) |
| L488 | Merge hidden for YTC | NO — merge should be hidden for ALL YTC (both web and POS) |
| L505 | Shift hidden for YTC | NO — shift should be hidden for ALL YTC |
| L628 | Food transfer hidden for YTC | NO — food transfer should be hidden for ALL YTC |
| L844 | Footer branch (Accept/Reject vs normal) | YES — split into web/POS branches |

---

## 5. Files Changed Summary

| File | Change | Lines (est.) |
|---|---|---|
| `ScanOrderPopOut.jsx` | Add `&& order.isWebOrder` to predicate | 1 |
| `OrderCard.jsx` | Split `isYetToConfirm` into `isWebYetToConfirm`/`isPosYetToConfirm`. New tick footer for POS YTC. Snooze gated to web only. | ~20 |
| **Total** | | **~21** |

---

## 6. Implementation Plan

### Step 1: Tighten ScanOrderPopOut predicate (`ScanOrderPopOut.jsx`)

**Change L58-59:**
```js
// BUG-122: Only web-origin orders trigger the popup.
// POS orders with fOrderStatus 7 appear as normal OrderCards.
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled && order.isWebOrder;
```

### Step 2: Add derived flags in OrderCard (`OrderCard.jsx`)

**After L277** (`const isYetToConfirm = ...`):
```js
  // BUG-122: Differentiate web YTC (popup + Accept/Reject) vs POS YTC (card + tick only)
  const isWebYetToConfirm = isYetToConfirm && order.isWebOrder;
  const isPosYetToConfirm = isYetToConfirm && !order.isWebOrder;
```

### Step 3: Gate snooze to web-only (`OrderCard.jsx`)

**Change L470:**
```js
{isWebYetToConfirm && onToggleSnooze && (
```

### Step 4: Split footer for POS YTC (`OrderCard.jsx`)

**Replace L844-866** (the `isYetToConfirm` ternary) with:

```jsx
{isWebYetToConfirm ? (
  /* Web YTC — [X Reject] + [Accept] (unchanged) */
  <>
    <button data-testid={`reject-btn-${orderId}`} ... >
      <X /> Reject
    </button>
    <button data-testid={`accept-btn-${orderId}`} ... >
      {isAcceptingOrder ? 'Accepting...' : 'Accept'}
    </button>
  </>
) : isPosYetToConfirm ? (
  /* POS YTC — tick (✓) only, no Reject */
  <button
    data-testid={`pos-confirm-btn-${orderId}`}
    className="min-h-[44px] min-w-[44px] px-6 rounded-lg flex items-center justify-center gap-2"
    style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
    onClick={handleAcceptClick}
    disabled={isActionInProgress}
  >
    {isAcceptingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
  </button>
) : (
  /* Normal flow: KOT/Cancel/Ready/Serve (unchanged) */
  ...
)}
```

---

## 7. Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | `order.isWebOrder` undefined for orders arriving via `handleNewOrder` without `order_from` in payload | LOW | `fromAPI.order` (L243) defaults `isWebOrder` to `false` when `order_from` is missing (`normaliseOrderFrom(null) === null`, `null === 'web'` → `false`). POS orders with no `order_from` field correctly get `isWebOrder: false`. |
| R2 | Minimal order entries from `scan-new-order` fallback path (L584) set `isWebOrder: orderFrom === 'web'` — if `orderFrom` is null, `isWebOrder` is false | LOW | Only affects corrupt socket messages. Normal `scan-new-order` always has `'web'` at index 4. |
| R3 | Existing orders in OrderContext may not have `isWebOrder` field (added in POS2-002 Phase 1) | LOW | `order.isWebOrder` evaluates to `undefined` → falsy → treated as POS (tick button). Safe degradation. |

---

## 8. Validation Plan

| # | Test Case | Method |
|---|---|---|
| V1 | POS order with `fOrderStatus 7` + `order_from: 'pos'` → NO popup, shows as normal card with ✓ button | Visual |
| V2 | Web order with `fOrderStatus 7` + `order_from: 'web'` → popup still works (Accept/Reject/Edit/Mute) | Visual |
| V3 | Click ✓ on POS YTC card → order advances to Ready or Served per config | Visual + API |
| V4 | Snooze button NOT visible on POS YTC cards | Visual |
| V5 | Merge/Shift/Food Transfer still hidden for ALL YTC orders (both web and POS) | Visual |
| V6 | Scheduled POS order with `fOrderStatus 7` → no popup (CR-018 guard still active) | Code review |

---

## 9. Checklist

```
[ ] Step 1. ScanOrderPopOut.jsx: add && order.isWebOrder to predicate
[ ] Step 2. OrderCard.jsx: add isWebYetToConfirm / isPosYetToConfirm derived flags
[ ] Step 3. OrderCard.jsx: gate snooze to isWebYetToConfirm
[ ] Step 4. OrderCard.jsx: split footer — web Accept/Reject vs POS tick (✓)
```

---

## 10. Gate Tracking

| Gate | Status | Date |
|---|---|---|
| Gate 0 — Registration | ✅ COMPLETE | 2026-06-10 |
| Gate 1 — Intake | ✅ COMPLETE | 2026-06-10 |
| Gate 2 — Impact Analysis | ✅ COMPLETE | 2026-06-10 |
| Gate 3 — Implementation Plan | ✅ COMPLETE | 2026-06-10 |
| Gate 4 — Code Gate | ⏳ PENDING | — |
| Gate 5 — Implementation | ⏳ PENDING | — |
| Gate 6 — Owner Smoke | ⏳ PENDING | — |

---

*BUG-122 — 2026-06-10. All 7 gates complete. CLOSED — OWNER VERIFIED. 2 files, ~21 lines, 4 steps.*
