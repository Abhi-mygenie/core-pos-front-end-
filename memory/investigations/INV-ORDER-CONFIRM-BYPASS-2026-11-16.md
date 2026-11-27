# INV-ORDER-CONFIRM-BYPASS — Why Edit/Update Orders Skip Confirmation

**Date:** 2026-11-16
**Role:** INVESTIGATION
**Classification:** HIGH risk (order flow, sockets)
**Steps Used:** 8/10
**Confidence:** HIGH — code-traced end-to-end, all paths documented

---

## 1. Summary

**Root Cause:** This is **BY DESIGN** — the confirmation requirement is gated on `fOrderStatus === 7` (YTC = Yet To Confirm), which is set **exclusively by the BACKEND** on the **first** order placement from a Web/Scan source. The POS frontend never sets fOrderStatus — the `placeOrder` payload does NOT include `f_order_status`; the backend decides based on order source (POS=1, Web=7, Aggregator=0/7). Once confirmed (status changes to 1/Preparing via `waiter-dinein-order-status-update`), all subsequent edits/updates arrive via `update-order` socket with the **current** (post-confirmation) status. The `ScanOrderPopOut` predicate (`fOrderStatus === 7 && isWebOrder`) correctly excludes these. **No code bug exists.** However, this creates a business risk: unreviewed items can be silently added to a confirmed order.

**Live Probe (Ruby ZAP, RID=672):** `def_ord_status=1` → confirmOrder sends `order_status:'cooking'` → backend transitions fOS 7→1. `show_scan_popup=1` (enabled). 23 running orders probed — all POS-originated, zero YTC orders at probe time.

**Classification:** NOT_A_BUG — deliberate backend/frontend design. Business risk acknowledged.

---

## 2. Order Lifecycle — Confirmation Gate

### The Two Paths:

```
PATH A — New Web/Scan Order (REQUIRES CONFIRMATION):
  Customer scans QR → places order via web
  → Backend sends: scan-new-order [orderId, rid, fOrderStatus=7, 'web']
  → FE: handleScanNewOrder() adds minimal order with fOrderStatus=7
  → ScanOrderPopOut predicate: fOrderStatus===7 && isWebOrder → SHOWS POPUP
  → Staff clicks Accept → confirmOrder() API → waiter-dinein-order-status-update
  → Backend changes fOrderStatus: 7 → 1 (Preparing) or profile default
  → Socket: update-order-paid/update-order with fOrderStatus=1
  → ScanOrderPopOut: fOrderStatus=1 ≠ 7 → POPUP DISMISSED

PATH B — Edit/Update to Existing Order (SKIPS CONFIRMATION):
  Customer (or staff) edits order (adds/removes items)
  → Backend sends: update-order [orderId, rid, fOrderStatus=1, {orders:[...]}]
  → FE: handleOrderDataEvent() → updateOrder() in OrderContext
  → ScanOrderPopOut: fOrderStatus=1 ≠ 7 → NO POPUP
  → Order card on dashboard updates silently ✅
```

### Why This Happens — The Status Gate:

The confirmation popup is triggered by a SINGLE condition in `ScanOrderPopOut.jsx:59`:

```javascript
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled && order.isWebOrder;
```

Once confirmed, `fOrderStatus` changes from 7 to 1/2/5. The backend DOES NOT re-set it to 7 for subsequent edits. This is the core mechanism.

---

## 3. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | Backend sends different socket event for first order vs edit | Code trace (socketEvents.js, socketHandlers.js) | 2 | **CONFIRMED** | First order: `scan-new-order` (fOS=7) or `new-order`; Edit: `update-order` (fOS=current) |
| H2 | FE confirmation gate is status-based, not order-history-based | Code trace (ScanOrderPopOut.jsx:59) | 1 | **CONFIRMED** | `isUnconfirmedScanOrder` checks `fOrderStatus===7` only — no history check |
| H3 | Backend re-sends fOrderStatus=7 for edits to web orders | API endpoint analysis | 1 | **ELIMINATED** | `update-place-order` endpoint preserves current fOrderStatus; no re-YTC logic |
| H4 | POS-placed orders (not web) ever trigger confirmation | Code trace | 1 | **ELIMINATED** | POS orders arrive via `new-order` (not `scan-new-order`) with fOS=1; `isWebOrder=false` blocks popup |
| H5 | Room orders have different confirmation behavior | Code trace | 1 | **CONFIRMED (same)** | Room orders follow same path — if placed via POS: no YTC; if via web (rare): same YTC gate |
| H6 | Aggregator edits bypass confirmation | Code trace | 2 | **CONFIRMED** | `aggrigator-order-update` calls `handleAggregatorOrderUpdate` which checks terminal status only (fOS=3/6); non-terminal updates go to `updateOrder()` — no re-confirmation |

---

## 4. Data Flow Trace — Full Order Lifecycle

### Step 1: First Order (Web/QR)

```
Customer → QR scan → web ordering page → submits order
  ↓
Backend (Laravel):
  → Creates order with f_order_status=7 (Yet To Confirm)
  → Emits socket: new_order_{rid} → ['scan-new-order', orderId, rid, 7, 'web']
  ↓
Frontend (socketHandlers.js:545-598):
  → handleScanNewOrder: checks fOS=7, not 8/9
  → If full payload: transforms via orderFromAPI.order(), sets isWebOrder=true
  → If minimal (old format): creates {orderId, fOrderStatus:7, isWebOrder:true, status:'pending', items:[], amount:0}
  → addOrder() → OrderContext
  ↓
ScanOrderPopOut (ScanOrderPopOut.jsx:170-179):
  → queue = orders.filter(isUnconfirmedScanOrder)
  → isUnconfirmedScanOrder: fOS===7 && !scheduled && isWebOrder → TRUE
  → POPUP SHOWN with Accept/Reject/Edit/Mute buttons
  ↓
Staff clicks Accept:
  → handleConfirmOrder (DashboardPage.jsx:1353-1366)
  → confirmOrder(orderId, role, defaultOrderStatus)
  → API: PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update
  → Backend changes fOrderStatus: 7 → 1 (or profile default)
  → Socket: update-order/update-order-paid with new fOrderStatus
  ↓
handleOrderDataEvent (socketHandlers.js:239-362):
  → Transforms order, now fOS=1
  → updateOrder() in OrderContext
  → ScanOrderPopOut: fOS=1 ≠ 7 → POPUP AUTO-DISMISSED
```

### Step 2: Edit to Confirmed Order (Web/QR or POS)

```
Customer adds item via QR / Staff edits via POS
  ↓
Backend:
  → Receives edit request (e.g., update-place-order)
  → Updates order items, keeps fOrderStatus=1 (UNCHANGED)
  → Emits socket: new_order_{rid} → ['update-order', orderId, rid, 1, {orders:[...]}]
  ↓
Frontend (socketHandlers.js:239):
  → handleOrderDataEvent with eventName='update-order'
  → Transforms order payload (fOS=1)
  → NOT terminal (status≠cancelled/paid) → updateOrder()
  → OrderContext updates the existing order
  ↓
ScanOrderPopOut:
  → queue recomputes: fOS=1 ≠ 7 → NOT in queue → NO POPUP
  → ✅ Edit applied silently — items appear on dashboard card
```

### Step 3: Table/Room Order (POS-placed)

```
Staff places order via POS UI → OrderEntry → handlePlaceOrder
  ↓
API: POST /api/v2/vendoremployee/order/place-order
  → Backend creates order with fOrderStatus=1 (directly Preparing)
  → Emits socket: new_order_{rid} → ['new-order', orderId, rid, 1, {orders:[...]}, {table_info:{...}}]
  ↓
handleNewOrder (socketHandlers.js:156-216):
  → Transforms order (fOS=1, isWebOrder=false)
  → Skips fOS=8/9 (Hold)
  → addOrder() + syncTableStatus()
  ↓
ScanOrderPopOut:
  → isUnconfirmedScanOrder: fOS=1 ≠ 7 → FALSE → NO POPUP
  → ✅ Order appears directly on dashboard — NO confirmation needed
```

---

## 5. Aggregator Order Confirmation Flow

Aggregator orders have their OWN confirmation mechanism via `AggregatorOrderPopOut`:

```
Swiggy/Zomato → UrbanPiper → Backend
  → Socket: aggregator_order_{rid} → ['aggrigator-order', orderId, rid, ?, payload]
  ↓
handleAggregatorNewOrder (socketHandlers.js:919-938):
  → Transforms payload via aggregatorTransform
  → addOrder() → OrderContext (with isAggregator=true)
  ↓
AggregatorOrderPopOut (AggregatorOrderPopOut.jsx:15-18):
  → Predicate: isAggregator && (fOrderStatus===0 || fOrderStatus===7)
  → POPUP SHOWN with Reject + Accept (prep time required)
  ↓
Staff accepts → updateAggregatorOrderStatus → 'Acknowledged'
  → Socket: aggrigator-order-update with new status
  ↓
handleAggregatorOrderUpdate (socketHandlers.js:945-1003):
  → fOS changed → popup auto-dismissed
  → Subsequent updates: fOS ≠ 0/7 → no popup → direct updateOrder()
```

**Same pattern:** First arrival needs confirmation, edits/updates after acceptance bypass it.

---

## 6. Why This Is By Design (Not a Bug)

### Business Logic:
1. **First web order needs review** because the customer ordered remotely — staff needs to verify availability, prep capacity, and legitimacy before committing kitchen resources
2. **Edits to confirmed orders don't need re-confirmation** because:
   - The order is already accepted and in the kitchen
   - Staff can see the updated items on the dashboard card in real-time
   - The kitchen display (KOT) receives updated items automatically
   - Re-confirming every edit would disrupt kitchen workflow

### Backend Contract:
- `place-order` API creates orders with `fOrderStatus` based on source:
  - Web/Scan: `fOrderStatus=7` (YTC) — needs confirmation
  - POS: `fOrderStatus=1` (Preparing) — direct start
  - Aggregator: `fOrderStatus=0` or `7` — needs confirmation
- `update-place-order` API preserves current `fOrderStatus` — never resets to 7

### Frontend Contract:
- `ScanOrderPopOut`: gate on `fOrderStatus===7 && isWebOrder`
- `AggregatorOrderPopOut`: gate on `isAggregator && (fOS===0 || fOS===7)`
- Both auto-dismiss when status changes (reactive to OrderContext)

---

## 7. Business Risk Assessment

While the current behavior is by design, there IS a business risk:

| Risk | Severity | Description |
|------|----------|-------------|
| Unreviewed item additions | MEDIUM | Customer can add expensive items via QR after initial confirmation; staff may not notice the dashboard card update |
| Kitchen surprise | LOW | New items appear on KOT without explicit staff acknowledgment |
| Billing accuracy | LOW | All items are correctly reflected in the order — no financial error |

### Existing Mitigations:
1. **Dashboard card updates in real-time** — staff sees changed amounts/items
2. **KOT print triggers** — kitchen receives updated ticket
3. **FCM notification** — "new order" / "confirm order" notifications (if configured)
4. **Sound alerts** — confirm-order tone plays for YTC notifications
5. **Polling reconciliation** — catches any missed updates within 60s

### Potential Enhancement (NOT a bug fix — feature request):
If owner wants staff to review ALL web edits (not just first order):
- Option A: Backend sends `scan-new-order` event for edits too (with fOS=7) — breaks current UX, very disruptive
- Option B: Add a separate "edit notification" visual indicator on the order card (non-blocking, informational)
- Option C: Add a config toggle per restaurant: "Require re-confirmation for web order edits"

---

## 8. Evidence Artifacts

### Live Probes (saved to persistent storage):
- `evidence/INV-ORDER-CONFIRM-BYPASS-2026-11-16/ruby_profile_probe.md` — Ruby ZAP profile: def_ord_status=1, show_scan_popup=1, 23 running orders (all POS, zero YTC)

### Code references:

| File | Lines | Finding |
|------|-------|---------|
| `socketHandlers.js` | 545-598 | handleScanNewOrder — adds with fOS=7, isWebOrder flag |
| `socketHandlers.js` | 239-362 | handleOrderDataEvent — updates existing orders, no confirmation gate |
| `ScanOrderPopOut.jsx` | 59 | `isUnconfirmedScanOrder` — the sole confirmation predicate |
| `AggregatorOrderPopOut.jsx` | 15-18 | `isUnconfirmedAggregatorOrder` — aggregator confirmation predicate |
| `DashboardPage.jsx` | 1353-1366 | `handleConfirmOrder` → calls `confirmOrder()` API |
| `orderService.js` | 70-73 | `confirmOrder` → `waiter-dinein-order-status-update` endpoint |
| `constants.js` | 43, 81, 83 | CONFIRM_ORDER, PLACE_ORDER, UPDATE_ORDER endpoint URLs |
| `OrderContext.jsx` | 107-127, 134-153 | addOrder (dedup) and updateOrder (upsert) |
| `orderTransform.js` | 204, 262-263 | fOrderStatus mapping, orderFrom/isWebOrder derivation |

---

## 9. Recommendations

**Classification:** NOT_A_BUG — this is designed behavior.

**If owner wants to change this behavior (future CR):**

| Option | Scope | Risk | Recommendation |
|--------|-------|------|----------------|
| A: Re-YTC on every web edit | Backend + FE | CRITICAL | NOT recommended — breaks kitchen workflow, staff fatigue |
| B: Visual "edited" badge on order card | FE only (1-2 files) | LOW | Recommended — non-blocking awareness |
| C: Per-restaurant toggle for edit re-confirmation | Backend + FE | HIGH | Possible but complex — configuration surface |

**No code change recommended at this time.** Owner decision needed on whether this is acceptable business behavior or requires a CR.

---

## 10. Retroactive Candidates

None identified.

---

## Report Footer

```
Root cause: BY DESIGN — confirmation gate is fOrderStatus===7 (set only on first
            web/scan placement). Edits arrive with post-confirmation status (1/2/5),
            bypassing the gate. Backend does not re-set status to 7 for edits.
Confidence: HIGH. Steps: 8/10.
Classification: NOT_A_BUG
FE fix: NO — behavior is correct per current design.
Backend ask: NO (unless owner wants to change the design).
Planning skip eligible: N/A — no fix needed.
Retroactive candidates: NONE.
Investigation report at: /app/memory/investigations/INV-ORDER-CONFIRM-BYPASS-2026-11-16.md
```
