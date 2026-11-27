# Investigation Report — BUG-756-B
## "Print failed: No order data" in OrderReportBetaPage.handlePrintBillFromBeta

**Date:** 2026-11-27
**Role:** INVESTIGATION (Role 6)
**Classification:** FE_BUG
**Confidence:** HIGH
**Steps used:** 10/10
**Triggered by:** BUG-756 fix removed 403 → underlying bugs now surface

---

## 1. Summary

`handlePrintBillFromBeta` in `OrderReportBetaPage.jsx` contains TWO independent bugs introduced together during CR-503. Bug A fires first (hence "No order data" toast). Bug B sits behind it — if Bug A were fixed alone, a second error would surface immediately. Both must be fixed in one pass.

No other caller is affected. All 14 other printOrder call sites use the correct pattern.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | API not returning data (backend problem) | Screenshot analysis + network tab | ELIMINATED — HTTP 200, full orders[0] present (id=1579197, ₹109) |
| H2 | Wrong response unwrap path in handler | Code trace resp.data?.data vs actual shape | CONFIRMED — resp.data?.data = undefined |
| H3 | printOrder called with wrong signature | Cross-check all 14 call sites vs function signature | CONFIRMED — unique wrong call in this one function |

---

## 3. Bug A — Wrong Response Unwrap (Break Point 1)

### Actual API Response (from screenshot)
```json
{
  "orders": [
    {
      "id": 1579197,
      "restaurant_order_id": "000105",
      "order_amount": 109,
      ...
    }
  ]
}
```

### Current Code (broken)
```javascript
const raw = resp.data?.data;   // resp.data = { orders: [...] } — no ".data" key
if (!raw) throw new Error('No order data');   // always throws
```

`resp.data?.data` = `undefined` because the response body has `orders`, not `data`.

### Why every other caller works
All other callers of SINGLE_ORDER_NEW use a multi-fallback unwrap:

| Caller | Unwrap |
|---|---|
| CollectBillPanelDrawer.jsx L143 | orders?.order_details_order OR order_details_order OR orders[0] OR orders OR data |
| AllOrdersReportPage.handlePrintBillFromAudit L843 | Same multi-fallback + BUG-368 length guard |
| OrderReportBetaPage.handleReprint L390 | Same multi-fallback |
| pmsService.getGuestFolio L583 | Same multi-fallback |
| orderService.fetchSingleOrderForSocket | response.data?.orders[0] |
| handlePrintBillFromBeta | resp.data?.data ← ONLY WRONG ONE |

---

## 4. Bug B — Wrong `printOrder` Signature (Break Point 2, hidden behind Bug A)

### Function signature (orderService.js L162)
```javascript
printOrder(orderId, printType, stationKot=null, orderData=null, serviceChargePercentage=0, overrides={}, printerAgents=[])
```

### handlePrintBillFromBeta call (broken)
```javascript
await printOrder(
  items,                                   // arg1=orderId ← receives items ARRAY
  printerAgents || [],                     // arg2=printType ← receives agents array (not 'bill')
  { orderType: ..., orderId: ... }         // arg3=stationKot ← receives options object
);
```

### Every other bill-print call (14 sites, all consistent)
```javascript
await printOrder(row.id, 'bill', null, order, 0, {}, printerAgents || []);
```

### Consequence if Bug A were fixed without Bug B
| Arg | Expected | Received | Effect |
|---|---|---|---|
| orderId | numeric ID | items array | Number([...]) → NaN → payload order_id: NaN |
| printType | 'bill' | agents array | hits KOT branch instead of bill branch |
| orderData | order object | undefined | bill payload builder gets no data |
| printerAgents | agents array | undefined | no printers resolved → job silently dropped |

---

## 5. Why ONLY This Function?

Same file, handleReprint (line 382) is correct. handlePrintBillFromBeta (line 432) is not:

| Handler | Unwrap | printOrder signature | Status |
|---|---|---|---|
| handleReprint (L382) | Multi-fallback | (row.order_id, 'bill', null, order, 0, {}, printerAgents) | Works |
| handlePrintBillFromBeta (L432) | resp.data?.data | (items, printerAgents, {orderType,orderId}) | Broken |

Both bugs were masked by the original 403 (BUG-756) — the function never ran past the first API call.

---

## 6. Impact Assessment

- Fix scope: handlePrintBillFromBeta only — private useCallback, not exported, not used anywhere else
- Zero impact on: AllOrdersReportPage, CollectBillPanelDrawer, pmsService, orderService, reportService
- Planning skip eligible: YES — 1 file, ~12 lines, non-hotspot, not financial-write path
- Requires: Gate 4 GO from owner

---

## 7. Fix Outline (not applied)

Replace handlePrintBillFromBeta body to mirror handleReprint pattern (same file):

Bug A fix: replace resp.data?.data with multi-fallback unwrap (same as handleReprint L390-400)
Bug B fix: replace printOrder(items, printerAgents, opts) with printOrder(row?.order_id || row?.id, 'bill', null, order, 0, {}, printerAgents || [])
Add guards: if (!raw || Array.isArray(raw)) and if (!order?.rawOrderDetails?.length) — same as handleReprint

---

## 8. Evidence

- Screenshot: Network tab shows HTTP 200, response body orders[0].id=1579197, order_amount=109
- 2 requests to get-single-order-new: Request 1 = CollectBillPanelDrawer mount (succeeds), Request 2 = Print Bill click (fails at unwrap)
- Axios client (axios.js): no response interceptor that wraps in .data — response.data IS the raw body
- printOrder cross-check: 14 call sites all use (orderId, 'bill', null, order, 0, {}, agents)

---

## Handover

Root cause: TWO bugs in handlePrintBillFromBeta (OrderReportBetaPage.jsx).
Bug A: resp.data?.data should be multi-fallback unwrap.
Bug B: printOrder(items, agents, opts) should be printOrder(orderId, 'bill', null, order, 0, {}, agents).
Both pre-existing since CR-503; masked by original 403 (BUG-756).
Confidence: HIGH. Steps: 10/10.
FE fix: YES — 1 file, ~12 lines.
Planning skip eligible: YES — owner Gate 4 GO required.
No other callers affected.
