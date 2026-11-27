# Implementation Plan — BUG-701: Room edit-confirm popup disappears on item-cancel

**Gate:** 3 — Implementation Plan · **Role:** PLANNING  
**Date:** 2026-11-19 · **Status:** GATE_3_PLAN_COMPLETE  
**Priority:** P0 · **Risk:** HIGH · **Assignee:** Abhishek  
**Sprint:** nov_cr_batch · **Release:** 2026-11-17  
**IA doc:** `impact/BUG-701_IMPACT_ANALYSIS.md`

---

## Code Reality Check (Step 0)

```bash
grep -n "BUG-701" /app/frontend/src/contexts/OrderContext.jsx
```
Result: **NONE** — no prior code for BUG-701 in target file. Proceed with full plan.

---

## Conflict Pre-Check (Step 1)

| File | Last modifier | Line conflict? | Status |
|---|---|---|---|
| `src/contexts/OrderContext.jsx` | BUG-595 (L342), BUG-250 (`mergeRunningOrders`) | Our edit is `updateOrder` L140-152 — no line overlap | **PARALLEL-SAFE** |
| Registered conflicts | CR-552 (ScanOrderPopOut+orderTransform+DashboardPage) | BUG-701 does NOT touch those files | **NO CONFLICT** |

---

## Gate 3: Implementation Plan

### Single Edit — E-1

**File:** `src/contexts/OrderContext.jsx`  
**Function:** `updateOrder` (lines 134–153)  
**Edit location:** Lines 140–152 (inside `setOrdersState`)

#### Current code (lines 140–152 — verified 2026-11-19):
```javascript
    setOrdersState(prev => {
      const exists = prev.some(o => o.orderId === orderId);
      let next;
      if (!exists) {
        console.log('[OrderContext] updateOrder: Order not found, adding', orderId);
        next = [...prev, updatedOrder];
      } else {
        console.log('[OrderContext] updateOrder: Updating order', orderId);
        next = prev.map(o => o.orderId === orderId ? updatedOrder : o);
      }
      ordersRef.current = next;
      return next;
    });
```

#### New code (after BUG-701 guard insertion):
```javascript
    setOrdersState(prev => {
      const exists = prev.some(o => o.orderId === orderId);
      let next;
      if (!exists) {
        console.log('[OrderContext] updateOrder: Order not found, adding', orderId);
        next = [...prev, updatedOrder];
      } else {
        // BUG-701: preserve web-origin across socket-driven re-transforms.
        // Room orders return order_from='pos'/null on every socket path and
        // get-single-order-new → isWebOrder recomputed false after each update,
        // even when the order was web-edited. Mirror the BUG-082 guard from
        // useOrderPollingReconciliation.js L174-177: carry prior orderFrom /
        // isWebOrder when the incoming update lacks web origin but the existing
        // stored order had it. Never upgrades non-web → web.
        const existing = prev.find(o => o.orderId === orderId);
        let merged = updatedOrder;
        if (existing && existing.isWebOrder && !updatedOrder.isWebOrder) {
          merged = { ...updatedOrder, orderFrom: existing.orderFrom, isWebOrder: true };
        }
        console.log('[OrderContext] updateOrder: Updating order', orderId);
        next = prev.map(o => o.orderId === orderId ? merged : o);
      }
      ordersRef.current = next;
      return next;
    });
```

#### Why this guard is correct (edge-case analysis):

| Scenario | existing.isWebOrder | updatedOrder.isWebOrder | Guard fires? | Result |
|---|---|---|---|---|
| Room web-edit order → cancel socket arrives (order_from='pos') | true | false | ✅ YES | isWebOrder preserved; popup stays |
| Room web-edit order → cancel socket arrives (order_from=null) | true | false | ✅ YES | isWebOrder preserved; popup stays |
| Non-web room order → socket update | false | false | ✅ NO | Full replace; no false promotion |
| Table web order → socket arrives (order_from='web') | true | true | ✅ NO | Full replace; already correct |
| Order paid/cancelled → goes through removeOrder | — | — | ✅ N/A | updateOrder never called |
| All web items confirmed → hasUnconfirmedWebEditItems=false | true (preserved) | — | ✅ SAFE | isWebOrder=true retained but `items.some(it.isNotConfirmed)` is false → popup hides correctly |
| New order via addOrder → handleScanNewOrder sets isWebOrder directly | — | — | ✅ N/A | addOrder bypasses updateOrder entirely |

---

## Transform Variable Audit

**`normaliseOrderFrom(raw)` — orderTransform.js L53-58:**
```javascript
const normaliseOrderFrom = (raw) => {
  if (typeof raw !== 'string') return null;   // null, undefined, numbers → null
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;                  // empty string → null
  return trimmed;                             // 'web' → 'web', 'pos' → 'pos', 'POS' → 'pos'
};
```
- API sends `order_from=null` → `normaliseOrderFrom(null)` → `typeof null !== 'string'` → returns `null` → `isWebOrder = null === 'web'` = **false** ✅
- API sends `order_from='pos'` → returns `'pos'` → `isWebOrder = 'pos' === 'web'` = **false** ✅
- API sends `order_from='web'` → returns `'web'` → `isWebOrder = 'web' === 'web'` = **true** ✅
- API sends `order_from=''` (empty) → returns `null` → `isWebOrder = false` ✅

**`isWebOrder` downstream gates checked:**
- `ScanOrderPopOut.jsx L60` — `isUnconfirmedScanOrder`: `order.fOrderStatus === 7 && order.isWebOrder` → fOS=7 is YTC web-new order; room edit has fOS=5, not triggered ✅
- `ScanOrderPopOut.jsx L63-66` — `hasUnconfirmedWebEditItems`: `order.isWebOrder && items.some(it.isNotConfirmed)` → after guard, isWebOrder=true; popup shows as long as unconfirmed items remain ✅
- `useOrderPollingReconciliation.js L174-177` — BUG-082 guard: `if (!s.orderFrom && l.orderFrom)` → operates on poll path, independent of this fix ✅

**Curl / API variable verification (from investigation evidence):**

| Probe | Endpoint | Field | Returned | Transform result |
|---|---|---|---|---|
| get-single-order-new (before cancel) | POST /api/v2/vendoremployee/get-single-order-new {order_id:1578881} | `order_from` | `null` | `isWebOrder=false` ← BREAK POINT |
| Socket frame (during cancel) | channel `new_order_69` | `order_from` | `"pos"` | `isWebOrder=false` ← BREAK POINT |
| get-single-order-new (after cancel) | POST /api/v2/vendoremployee/get-single-order-new {order_id:1578881} | `order_from` | `null` | `isWebOrder=false` ← BREAK POINT |
| handleScanNewOrder initial | socket `scan-new-order` message[4] | literal string | `"web"` | `isWebOrder=true` ✅ — sets initial state |

All three break-point paths go through `updateOrder` → all covered by the single guard in `updateOrder`.

---

## Verification Matrix (seeds QA handover)

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| E-1a | OrderContext.jsx:140-152 | Guard added | Code review: guard block present in updateOrder | Manual |
| E-1b | OrderContext.jsx | No other lines changed | Diff: only updateOrder block modified | Manual |
| E-1c | webpack compile | No new warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" | Manual |
| E-1d | Functional: popup stays on cancel | Log in as owner@cafe103.com (cafe103, RID varies), navigate to room order with web-edit items, cancel one item, verify popup remains | Preprod |
| E-1e | Regression: table web order popup unaffected | Same test with a table web-edit order → popup still stays (no regression) | Preprod |
| E-1f | Regression: non-web orders unaffected | POS-only room order → `isWebOrder` stays false, no false popup | Preprod |
| E-1g | Regression: order removal still works | Confirm that paid/cancelled room orders are still removed from dashboard | Preprod |
| E-1h | isWebOrder not upgraded non-web→web | In updateOrder: if existing.isWebOrder=false and updatedOrder.isWebOrder=false → guard does NOT fire | Code trace |

---

## Scope Lock

**Files WILL change:**
- `src/contexts/OrderContext.jsx` (updateOrder function only)

**Files will NOT touch:**
- `src/api/socket/socketHandlers.js` (no per-handler changes — centralised fix)
- `src/api/transforms/orderTransform.js` (transform correct per-spec; room orders correctly return pos/null from backend)
- `src/hooks/useOrderPollingReconciliation.js` (BUG-082 guard already correct for poll path)
- `src/components/dashboard/ScanOrderPopOut.jsx` (helper functions correct; fix is upstream)
- Any financial, payment, settlement, or print files

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-701 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: BUG-701 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add BUG-701 IMPL row for OrderContext.jsx
- [ ] Code marker: // BUG-701 comment in OrderContext.jsx
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `updateOrder` called with no existing order (new path) | LOW | SAFE — guard only fires in `else` (exists=true) branch | Code review: guard is inside else block |
| Stale isWebOrder=true persists after all items confirmed | LOW | SAFE — popup hides when `items.some(it.isNotConfirmed)` is false | Test case E-1d verifies correct popup closure |
| Non-web room order accidentally promoted to web | VERY LOW | SAFE — guard: `existing.isWebOrder && !updatedOrder.isWebOrder`; existing must be true first | Test case E-1f verifies no false popup for non-web room orders |
| addOrder path bypasses guard | N/A | N/A — addOrder is correct (handleScanNewOrder sets isWebOrder directly) | Code trace confirms separate path |

---

Planning complete: BUG-701  
Stage: Implementation Plan (Gate 3)  
Code reality: NONE  
Risk: HIGH  
Files WILL change: `src/contexts/OrderContext.jsx`  
Files WILL NOT touch: socketHandlers.js, orderTransform.js, useOrderPollingReconciliation.js, ScanOrderPopOut.jsx  
Owner decisions: ALL RESOLVED (OD-701-01, OD-701-02)  
Next: Gate 4 GO → IMPLEMENTATION
