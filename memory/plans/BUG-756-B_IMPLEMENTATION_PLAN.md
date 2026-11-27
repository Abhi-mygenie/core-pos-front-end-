# Implementation Plan — BUG-756-B
## `handlePrintBillFromBeta`: Wrong Response Unwrap + Wrong `printOrder` Signature

**Date:** 2026-11-27
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Based on IA:** `impact/BUG-756-B_IMPACT_ANALYSIS.md`
**Risk:** HIGH (printing path)
**OD locked:** None required
**Awaiting:** Gate 4 GO

---

## 1. Entry Verification

Anchors verified at HEAD (2026-11-27):

| Edit | File | Line | Current content | Match? |
|------|------|------|-----------------|--------|
| E1 | `OrderReportBetaPage.jsx` | 436 | `const raw = resp.data?.data;` | ✅ |
| E2 | `OrderReportBetaPage.jsx` | 440 | `await printOrder(items, printerAgents \|\| [], { orderType: transformed.orderType, orderId: transformed.orderId });` | ✅ |
| (ref) | `OrderReportBetaPage.jsx` | 383 | `const handleReprint = useCallback(async (row) => {` (reference template) | ✅ |
| (consumer) | `OrderReportBetaPage.jsx` | 940 | `onPrintBill={handlePrintBillFromBeta}` | ✅ |

---

## 2. Scope Lock

**Files WILL change:**
- `src/pages/reports-module/OrderReportBetaPage.jsx` — 1 edit block (~14 lines replaced with ~19 lines)

**Files WILL NOT touch:**
- `src/components/reports/CollectBillPanelDrawer.jsx` — BUG-756 fix already in place; onPrintBill wired correctly
- `src/pages/AllOrdersReportPage.jsx` — handlePrintBillFromAudit is correct; used as reference only
- `src/api/services/orderService.js` — printOrder signature is correct; we align the caller
- Any transform, service, context, or provider file

---

## 3. The Single Edit

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Scope:** Replace the entire body of `handlePrintBillFromBeta` (lines 432–445)

### CURRENT (broken — 14 lines):
```javascript
  const handlePrintBillFromBeta = useCallback(async (row) => {
    // CR-503: Mirror AllOrdersReportPage.handlePrintBillFromAudit pattern
    try {
      const resp = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row?.order_id || row?.id });
      const raw = resp.data?.data;
      if (!raw) throw new Error('No order data');
      const transformed = orderFromAPI.order(raw);
      const items = (transformed.items || []).map(it => ({ ...it, placed: true }));
      await printOrder(items, printerAgents || [], { orderType: transformed.orderType, orderId: transformed.orderId });
      toast({ title: 'Bill request sent', description: `Order #${row.restaurant_order_id || row.order_id}` });
    } catch (err) {
      toast({ title: 'Print failed', description: err?.message || 'Could not print bill', variant: 'destructive' });
    }
  }, [printerAgents, toast]);
```

### NEW (correct — 19 lines):
```javascript
  const handlePrintBillFromBeta = useCallback(async (row) => {
    // CR-503: Mirror AllOrdersReportPage.handlePrintBillFromAudit pattern
    try {
      const resp = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row?.order_id || row?.id });
      // BUG-756-B E1: multi-fallback unwrap — endpoint returns { orders:[...] }, not { data:{} }
      // BUG-368: empty array [] is truthy in JS — guard length explicitly before using orders[0]
      const ordersArr = resp.data?.orders;
      const raw =
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr?.order_details_order : null) ||
        resp.data?.order_details_order ||
        (Array.isArray(ordersArr) && ordersArr.length > 0 ? ordersArr[0] : null) ||
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr : null) ||
        resp.data || null;
      if (!raw || Array.isArray(raw)) {
        toast({ title: 'Print failed', description: 'Order details unavailable', variant: 'destructive' });
        return;
      }
      const order = orderFromAPI.order(raw);
      if (!order?.rawOrderDetails?.length) {
        toast({ title: 'Print failed', description: 'Order details unavailable', variant: 'destructive' });
        return;
      }
      // BUG-756-B E2: correct printOrder signature — (orderId, 'bill', null, order, 0, {}, agents)
      await printOrder(row?.order_id || row?.id, 'bill', null, order, 0, {}, printerAgents || []);
      toast({ title: 'Bill request sent', description: `Order #${row.restaurant_order_id || row.order_id}` });
    } catch (err) {
      toast({ title: 'Print failed', description: err?.readableMessage || err?.message || 'Could not print bill', variant: 'destructive' });
    }
  }, [printerAgents, toast]);
```

### Line-by-line change explanation

| Line(s) | Change | Why |
|---------|--------|-----|
| 436: `const raw = resp.data?.data` | → multi-fallback unwrap (E1) | API returns `{ orders:[...] }` — no `.data` key; same 4-fallback chain used in handleReprint (L390-396), CollectBillPanelDrawer (L143), pmsService (L583) |
| 437: `if (!raw) throw` | → `if (!raw \|\| Array.isArray(raw)) { toast(); return; }` | BUG-368 guard: empty `[]` is truthy; must reject bare arrays; mirrors handleReprint L397 |
| 438: `const transformed = orderFromAPI.order(raw)` | renamed to `const order` | Aligns with every other bill-print caller; `order` is the standard variable name |
| 439: `const items = (transformed.items || []).map(...)` | **removed** | Was only needed to feed the wrong printOrder call; not needed with correct signature |
| 440: `await printOrder(items, printerAgents, {...})` | → `await printOrder(row?.order_id \|\| row?.id, 'bill', null, order, 0, {}, printerAgents \|\| [])` (E2) | Correct positional signature: arg1=orderId, arg2='bill', arg3=stationKot(null), arg4=orderData, arg5=scPct(0), arg6=overrides({}), arg7=agents |
| (new) guard before E2 | `if (!order?.rawOrderDetails?.length)` | Mirrors handleReprint L402; prevents sending empty bill to printer |
| catch: `err?.message` | → `err?.readableMessage \|\| err?.message` | Picks up axios interceptor-enriched error messages; mirrors handleReprint L408 |

### Order ID source — why `row?.order_id || row?.id`

`handlePrintBillFromBeta` is called by CPP's `handlePrintBill` via our BUG-756 wrapper:
```javascript
// CollectBillPanelDrawer.jsx L276 (BUG-756 fix):
(overrides) => onPrintBill({ ...overrides, id: order?.id, order_id: order?.id })
```
CPP's `overrides` has financial values only. Our BUG-756 fix injects `id` and `order_id`
(both set to `order.id = collectBillTarget.id = original row.order_id`).

So in `handlePrintBillFromBeta`:
- `row.order_id` = the injected `order_id` field ← primary
- `row.id` = the injected `id` field ← fallback

Both resolve to the correct numeric order ID. Same pattern as the SINGLE_ORDER_NEW API call
already in line 435: `{ order_id: row?.order_id || row?.id }`.

---

## 4. Verification Matrix

| # | Edit | Description | How to Verify | Manual/Auto |
|---|------|-------------|---------------|:-----------:|
| V1 | E1 | API data unwrapped from `orders[0]` | Open Order Beta → Collect on a PayLater row → click Print Bill → no "No order data" toast | Manual |
| V2 | E1 | Bill actually prints to printer | V1 continued → check printer receives job OR network tab shows POST `/print-bill` with `order_id: <number>` | Manual |
| V3 | E2 | `printOrder` receives correct orderId (not NaN) | Network tab → print-bill request payload → `order_id` field is a valid integer | Manual |
| V4 | E2 | `printOrder` receives `print_type: bill` (not KOT) | Network tab → print-bill request → `print_type: "bill"` present | Manual |
| V5 | guard | `rawOrderDetails` guard: order with no items shows graceful toast | Not easily reproducible in preprod — code review sufficient | Code review |
| V6 | regression | Reprint (handleReprint) still works unchanged | Order Beta → click Reprint on a Paid row → bill prints | Manual |
| V7 | regression | Collect payment flow (not print) unaffected | Order Beta → Collect on PayLater → pay via Cash → no regression | Manual |
| V8 | regression | AllOrders page print (handlePrintBillFromAudit) unaffected | AllOrders → Collect → Print Bill → prints | Manual |
| V9 | compile | Webpack 0 new warnings | `tail -n 5 /var/log/supervisor/frontend.out.log` → "webpack compiled with 1 warning" (pre-existing allDays only) | Auto |

---

## 5. Risk Register

| Risk | Level | Note |
|------|-------|------|
| `row?.order_id` and `row?.id` both undefined | LOW | Impossible: BUG-756 wrapper always injects both; same guard already in SINGLE_ORDER_NEW API call on L435 |
| Multi-fallback picks wrong order shape | LOW | Exact chain copied from handleReprint (same file) + CollectBillPanelDrawer; preprod-verified shapes |
| `rawOrderDetails` guard rejects valid order | LOW | Only rejects if `orderFromAPI.order(raw)` returns no items — means backend returned an order with no details; correct to block print |
| Regression on other callers | NONE | handlePrintBillFromBeta is a private useCallback; zero external consumers confirmed |
| Conflict with open CR-504/506/507/508/509/511 | NONE | All at GATE_1_INTAKE_COMPLETE; edit is at L432–445; all open CR edits are at different line ranges |

---

## 6. Execution Sequence

```
1. Read this plan + verify anchor lines still match (search_replace will fail fast if not)
2. Apply single search_replace: replace entire handlePrintBillFromBeta body
3. Wait for webpack hot-reload → check "webpack compiled with 1 warning" (pre-existing only)
4. Manual browser test: V1 → V4 (print flow) + V6 (reprint regression) using pms@macha.com
5. Execute Post-Code Registry Checklist (Step 7 below)
6. Push to new timestamp branch
```

One search_replace call. No staging, no partial edits.

---

## 7. Post-Code Registry Checklist

The Implementation agent MUST execute ALL of these after coding:

```
[ ] registry.json: BUG-756-B → status: GATE_5A_IMPLEMENTED, sprint_key: dec_sprint
[ ] BUG_TRACKER.md: add row for BUG-756-B → GATE_5A_IMPLEMENTED | HIGH | dec_sprint | OrderReportBetaPage.jsx
[ ] FILE_OWNERSHIP.md: OrderReportBetaPage.jsx entry → add BUG-756-B + 2026-11-27
[ ] Code markers: // BUG-756-B E1 present in unwrap block ✓ (included in new code above)
[ ] Code markers: // BUG-756-B E2 present in printOrder call ✓ (included in new code above)
[ ] Webpack: confirm "webpack compiled with 1 warning" (the pre-existing allDays warning only — 0 NEW warnings)
```

---

## 8. Handover to Implementation

```
Plan: BUG-756-B — 1 file, 1 search_replace, 14 lines → 19 lines.
File: src/pages/reports-module/OrderReportBetaPage.jsx
Edit: replace entire handlePrintBillFromBeta body (L432–445).
Code Reality: NONE — both bugs still present at HEAD.
Conflict: NONE.
OD: none required.
Verification: V1–V4 manual (print flow) + V6 regression (reprint) + V9 webpack auto.
Test account: pms@macha.com / Qplazm@10 on preprod.mygenie.online
Awaiting Gate 4 GO.
```
