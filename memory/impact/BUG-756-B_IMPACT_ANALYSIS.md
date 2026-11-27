# Impact Analysis — BUG-756-B
## `handlePrintBillFromBeta`: Wrong Response Unwrap + Wrong `printOrder` Signature

**Date:** 2026-11-27
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Risk:** HIGH (printing path)
**Code Reality:** NONE — both bugs present at HEAD, fix not applied
**Conflict Pre-Check:** No active conflict. CR-504/506/507/508/509/511 all at GATE_1_INTAKE_COMPLETE (no implementation in-flight). Edit target L432–445 is line-disjoint from all open items.

---

## 1. What Is Being Fixed

Two bugs introduced together in CR-503, in the single private function `handlePrintBillFromBeta`
inside `OrderReportBetaPage.jsx`. Both bugs were masked by the original BUG-756 403 error.

| Bug | Line | Current (broken) | Correct |
|-----|------|-----------------|---------|
| A   | 436  | `const raw = resp.data?.data` — no `.data` key in response | Multi-fallback unwrap matching every other caller of SINGLE_ORDER_NEW |
| B   | 440  | `printOrder(items, printerAgents, {orderType, orderId})` — items as orderId, agents as printType | `printOrder(row?.order_id \|\| row?.id, 'bill', null, order, 0, {}, printerAgents)` |

---

## 2. Data Flow Trace

```
User clicks Print Bill in Collect Drawer
  → CollectBillPanelDrawer L940 fires onPrintBill (= handlePrintBillFromBeta)
  → handlePrintBillFromBeta(row = {id, order_id, ...overrides})
  → POST /api/v2/vendoremployee/get-single-order-new { order_id: row.id }
  → Backend: HTTP 200, body = { "orders": [{ id:1579197, order_amount:109, ... }] }
  → Bug A: resp.data?.data = undefined ← BREAK POINT 1 (always throws)
  → throw new Error('No order data')
  → catch → toast "Print failed · No order data"
  [Bug B never reached]

If Bug A fixed alone:
  → raw = { id:1579197, ... } ← correct
  → transformed = orderFromAPI.order(raw) ← correct
  → items = [...transformed.items] ← correct
  → printOrder(items, printerAgents, {...}) ← BREAK POINT 2
     arg1=ARRAY → Number(array)=NaN → order_id:NaN in payload
     arg2=ARRAY → printType≠'bill' → hits KOT branch, not bill
     arg4=undefined → bill payload builder gets nothing
     arg7=undefined → no printers resolved → silent drop
```

Both bugs must be fixed in a single pass.

---

## 3. Affected Files

**WILL change:**
- `src/pages/reports-module/OrderReportBetaPage.jsx` — lines 432–445 (handlePrintBillFromBeta body, ~12 lines)

**WILL NOT touch:**
- `CollectBillPanelDrawer.jsx` — passes onPrintBill correctly; BUG-756 fix already in place
- `AllOrdersReportPage.jsx` — handlePrintBillFromAudit already correct; used as reference only
- `orderService.js` / `printOrder` — function signature is correct; callers must match it
- Any transform, service, context, or API file

---

## 4. Risk Classification

Risk: HIGH (printing is explicitly non-fast-lane per R6)

| Factor | Assessment |
|--------|-----------|
| Blast radius | SMALL — 1 private useCallback, 0 exports, 0 external consumers |
| R5 hotspot? | NO — OrderReportBetaPage.jsx not in R5 list |
| Financial write? | NO — read-only fetch → print; no payment mutation |
| Print path? | YES → HIGH per R6 |
| Existing pattern available? | YES — handleReprint (same file L383–412) is identical and working |
| Other callers affected? | NONE — private useCallback, not exported |

---

## 5. Reference Template (handleReprint, same file L383–412)

handleReprint is functionally identical and already works. Fix is a direct adaptation:

| handleReprint (working) | handlePrintBillFromBeta (target) |
|------------------------|----------------------------------|
| const ordersArr = response?.data?.orders + multi-fallback | const raw = resp.data?.data ← Bug A |
| printOrder(row.order_id, 'bill', null, order, 0, {}, printerAgents) | printOrder(items, printerAgents, {...}) ← Bug B |
| Guard: if (!raw || Array.isArray(raw)) | Missing |
| Guard: if (!order?.rawOrderDetails?.length) | Missing |

The only adaptation: use row?.order_id || row?.id instead of row.order_id
(because row in this context comes from CollectBillPanelDrawer overrides where .id is the mapped field)

---

## 6. Owner Decisions Required

NONE. Fix pattern fully determined by existing handleReprint reference in the same file.
No business logic choice involved. No new behaviour introduced.

---

## 7. Planning Skip Eligibility

| Condition | Status |
|-----------|--------|
| ≤10 lines | borderline (~12 lines) |
| 1 file | YES |
| Not R5 hotspot | YES (OrderReportBetaPage.jsx not in R5 list) |
| Not print path | NO — print is explicitly excluded from Fast Lane |

Planning skip NOT eligible. Full Gate 3 Implementation Plan required.

---

## 8. Downstream Consumer Check

| Component | Uses handlePrintBillFromBeta? | Impact |
|-----------|------------------------------|--------|
| CollectBillPanelDrawer (L940) | YES — receives as onPrintBill prop | POSITIVE: print now works |
| AllOrdersReportPage | NO — has own handlePrintBillFromAudit | ZERO |
| orderService.printOrder | Receives corrected call | POSITIVE: valid orderId + 'bill' type |
| Dashboard collect-bill flow | Does NOT use CollectBillPanelDrawer | ZERO |
| Any other report page | Does NOT use handlePrintBillFromBeta | ZERO |

---

## 9. Registry Checklist (to be executed after Gate 3 + Gate 4 implementation)

```
[ ] registry.json: BUG-756-B → status: GATE_3_PLAN_COMPLETE (after Gate 3)
[ ] registry.json: BUG-756-B → status: GATE_5A_IMPLEMENTED (after implementation)
[ ] BUG_TRACKER.md: row added for BUG-756-B → GATE_5A_IMPLEMENTED
[ ] FILE_OWNERSHIP.md: OrderReportBetaPage.jsx entry → BUG-756-B + 2026-11-27
[ ] Code markers: // BUG-756-B E1 and // BUG-756-B E2 in OrderReportBetaPage.jsx
[ ] Webpack: 0 new warnings
```

---

## Handover

Plan ready pending Gate 3 GO.
1 file (OrderReportBetaPage.jsx), 2 edits (~12 lines total).
Code Reality: NONE. Conflict: NONE.
No owner decisions required — fix pattern established by handleReprint (same file L383–412).
Planning skip NOT eligible (print path).
Awaiting Gate 3 GO.
