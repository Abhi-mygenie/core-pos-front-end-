# CR-106 — Investigation Report: Design Mismatch + Order Disappearance

**Document:** `evidence/CR-106/INVESTIGATION_REPORT_DESIGN_MISMATCH_2026_07_26.md`
**Created:** 2026-07-26
**Role:** INVESTIGATION
**Status:** ROOT CAUSE FOUND — HIGH confidence (reproduced + traced)
**Steps used:** 8/10

---

## 1. Summary

Three issues investigated, all root causes confirmed:

| # | Issue | Root Cause | Classification | Confidence |
|---|-------|-----------|----------------|------------|
| I-1 | Table view cards don't match mockup (missing items, customer info, rider status) | TableCard is compact grid — doesn't render these fields for ANY order type. **Mockup Section 3 shows a richer card that requires TableCard enhancement.** | FE_BUG (scope gap) | HIGH |
| I-2 | Orders disappear after ~60 seconds | `useOrderPollingReconciliation` polls `getRunningOrders()` every 60s. This API does NOT include aggregator orders → reconciliation treats them as orphans → `removeOrder()` after 1 missed poll | FE_BUG (critical) | HIGH |
| I-3 | OrderCard (list view) shows Cancel(X) + WhatsApp buttons for aggregator | OrderCard "Normal flow" section (lines 946-996) shows KOT/Cancel/WhatsApp for ALL orders. `isAggregator` guard only applies to right-side Ready/Dispatch buttons. | FE_BUG (missing guard) | HIGH |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|------------|-------|--------|---------|
| H1 | Polling reconciliation removes aggregator orders | Code trace: useOrderPollingReconciliation.js | 2 | **CONFIRMED** | L182-226: local-only orders removed after REMOVAL_MISS_THRESHOLD=1. No `isAggregator` exemption exists (grep confirmed). |
| H2 | `getRunningOrders()` includes aggregator orders | Code trace: orderService.js | 1 | **ELIMINATED** | `getRunningOrders()` calls `employee-orders-list` API — separate from UrbanPiper `get-order-list`. Aggregator orders are NOT returned. |
| H3 | Socket reconnect also wipes aggregator orders | Code trace: useSocketEvents.js:95-101 | 1 | **CONFIRMED** | On reconnect, `mergeRunningOrders(freshOrders)` REPLACES entire orders state with regular orders only. |
| H4 | TableCard shows items/customer/rider for regular orders | Visual inspection | 1 | **ELIMINATED** | Regular delivery cards also DON'T show items/customer/rider in TableCard. TableCard is deliberately compact. Mockup designs richer cards. |
| H5 | OrderCard Cancel/WhatsApp buttons have aggregator guard | Code trace: OrderCard.jsx:946-996 | 1 | **ELIMINATED** | No `isAggregator` check on Cancel (L965-976) or WhatsApp (L978-992). Guard only on right-side action buttons (L999-1032). |

---

## 3. Data Flow Trace

### I-2: Order Disappearance Flow

```
BOOT:
  DashboardPage → getAggregatorOrderList() → addOrder(aggOrder1, aggOrder2, ...) → OrderContext.orders = [reg1, reg2, ..., agg1, agg2, agg3, agg4]

60 SECONDS LATER (polling tick):
  useOrderPollingReconciliation → pollOnce('interval')
    → getRunningOrders() → [reg1, reg2, ...] (NO aggregator orders)
    → reconcile(serverOrders, localOrders)
      → serverMap = {reg1, reg2}
      → localMap = {reg1, reg2, agg1, agg2, agg3, agg4}
      → REMOVE path: agg1, agg2, agg3, agg4 are "local-only"
        → missCount(agg1) = 0 → 0+1 = 1 >= REMOVAL_MISS_THRESHOLD(1)
        → removeOrder(agg1) ← ORDER DELETED!
        → removeOrder(agg2) ← ORDER DELETED!
        → removeOrder(agg3) ← ORDER DELETED!
        → removeOrder(agg4) ← ORDER DELETED!
    → Console: "[OrderPolling] ok (interval, Xms): +0/~0/-4 (pending-remove=0, server=N, local=N)"

RESULT: All 4 aggregator orders vanish after first poll cycle.
```

**BREAK POINT:** `useOrderPollingReconciliation.js:182-226` — removal loop has NO exemption for `isAggregator` orders.

### I-3: OrderCard Button Flow

```
OrderCard renders for aggregator order (fOrderStatus=1):
  → Enters "Normal flow" (line 945) because NOT isYetToConfirm
  → Left buttons (lines 948-993):
    → KOT button: shown (no isAggregator check) — ✅ CORRECT per OD-14
    → Cancel button (L965-976): shown if isOrderCancelAllowed — ❌ SHOULD BE HIDDEN per design
    → WhatsApp button (L978-992): shown if showWhatsAppPayment — ❌ SHOULD BE HIDDEN per design
  → Right buttons (lines 998-1032):
    → isAggregator && fOrderStatus===1 → "Ready" button ✅ CORRECT
    → !isAggregator && fOrderStatus===1 → regular Ready ✅ CORRECT
```

---

## 4. Design Comparison: Mockup vs Actual

### Table View (Grid) — SS1 vs Mockup Section 3

| Element | Mockup | Current | Gap? |
|---------|--------|---------|------|
| S/Z badge | Orange S / Red Z circle | ✅ Orange S circle | MATCH |
| Order number | #002327 | #... (truncated but correct) | MATCH |
| "Preparing" status | Orange text | ✅ Orange text | MATCH |
| Time | "3m" | "10d" | MATCH (different data) |
| **Items list** | "● 1× Paneer Butter Masala" | ❌ NOT SHOWN | **GAP — TableCard doesn't render items** |
| **Customer + phone** | "SWIGGY +919999999992" | ❌ Only shows "Vansh" (waiter field) | **GAP — No phone, name in waiter slot** |
| **Rider status** | "🧑 Awaiting Runner" | ❌ NOT SHOWN | **GAP — No rider section in TableCard** |
| KOT button | Present | ❌ NOT SHOWN in table view | **GAP — Only in OrderCard** |
| Ready button | Present | ✅ Present | MATCH |

### Order View (List) — SS3 vs Design

| Element | Mockup | Current | Gap? |
|---------|--------|---------|------|
| S/Z badge | ✅ | ✅ | MATCH |
| Order number + full ID | ✅ | ✅ "#002... #478/002361" | MATCH |
| Items | ✅ | ✅ "Double Chicken Keema Roll" | MATCH |
| Order note | ✅ | ✅ "order level note" | MATCH |
| Rider status | ✅ "Awaiting Runner" | ✅ "Awaiting Runner" | MATCH |
| KOT button | ✅ Present | ✅ Present | MATCH |
| **Cancel(X) button** | ❌ NOT in design | ❌ Shown in current | **BUG — should be hidden** |
| **WhatsApp button** | ❌ NOT in design | ❌ Shown in current | **BUG — should be hidden** |
| Ready/Mark Ready | ✅ | ✅ "Mark Ready" | MATCH |

---

## 5. Recommendations

### FIX 1 (P0 — CRITICAL): Polling exemption for aggregator orders
**File:** `hooks/useOrderPollingReconciliation.js`
**Change:** In the REMOVE path (line 182-226), skip orders where `l.isAggregator === true`:
```js
// After line 193 (Hold/Park retention):
if (l.isAggregator === true) {
  // CR-106: Aggregator orders come from a separate API (UrbanPiper),
  // not from getRunningOrders(). Do not treat as orphan.
  continue;
}
```
**Risk:** LOW — additive guard, no logic change for regular orders.
**Also required in:** `mergeRunningOrders` path in useSocketEvents.js (line 100) — need to preserve aggregator orders during reconnect rehydration.

### FIX 2 (P1 — HIGH): Hide Cancel + WhatsApp for aggregator orders in OrderCard
**File:** `components/cards/OrderCard.jsx`
**Change:** Add `!isAggregator &&` guard to Cancel button (L966) and WhatsApp button (L979):
```js
// Line 966: 
{!isAggregator && isOrderCancelAllowed && (
// Line 979:
{!isAggregator && showWhatsAppPayment && (
```
**Risk:** LOW — 2-line change, gated behind existing `isAggregator` boolean.

### FIX 3 (P2 — MEDIUM): TableCard items/customer/rider for aggregator orders
**File:** `components/cards/TableCard.jsx`
**Change:** For aggregator orders, render:
- Items list (first 2 items condensed, e.g., "● 1× Double Chicken Keema Roll")
- Customer name + phone
- Rider status ("Awaiting Runner" / rider name)
**Risk:** MEDIUM — requires TableCard body enhancement, but only for `isAggregator` cards. Non-aggregator rendering unchanged.
**Scope:** ~30-40 lines. Uses existing data from `table.order.items`, `table.order.customerName`, `table.order.riderInfo`.

### Planning Skip Eligibility
- FIX 1: ≤10 lines, 1 file, not financial — **eligible for DIRECT_BUG_FIX** (owner approval needed)
- FIX 2: ≤5 lines, 1 file, not financial — **eligible for DIRECT_BUG_FIX** (owner approval needed)
- FIX 3: ~40 lines, 1 file, UI change — **needs PLANNING (Gate 2-3)**

---

## 6. Evidence Artifacts

All saved to `/app/memory/evidence/CR-106/`:
- Investigation report: this document
- Design mockup: `cr105-design-flow.html` Section 3 (frozen)
- User screenshots: SS1 (table view), SS2 (delivery 4 — orders gone), SS3 (order view with Cancel/WhatsApp)

---

## Handover

```
Root cause: 3 issues found. Confidence: HIGH (all reproduced + traced). Steps: 8/10.
  I-2 (P0 CRITICAL): Polling reconciliation removes aggregator orders after 60s.
    File: useOrderPollingReconciliation.js:182. Fix: add isAggregator exemption.
  I-3 (P1 HIGH): OrderCard Cancel + WhatsApp buttons shown for aggregator.
    File: OrderCard.jsx:966,979. Fix: add !isAggregator guard.
  I-1 (P2 MEDIUM): TableCard doesn't show items/customer/rider per mockup.
    File: TableCard.jsx. Fix: enhance body section for aggregator cards.

FE fix: YES — 3 fixes across 3 files.
Backend ask: NO.
Planning skip eligible: FIX 1+2 = YES (owner approve). FIX 3 = NO (needs planning).
Escalated from Bug Fix: NO.
Retroactive candidates: NONE.
Investigation report at memory/evidence/CR-106/INVESTIGATION_REPORT_DESIGN_MISMATCH_2026_07_26.md.
```
