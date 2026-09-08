# BUG-368 Implementation Plan — Split Bill Reprint Fix
**Date:** 2026-09-02
**Role:** PLANNING (Gate 3)
**Status:** READY FOR GATE 4 GO

---

## Preamble

**Impact Analysis verified:** `/app/memory/impact/BUG-368_IMPACT_ANALYSIS.md`
Starting state of both files confirmed against Impact Analysis — no drift.

**Root cause (from Gate 2):**
Two defects in the `SINGLE_ORDER_NEW` response unwrap chain used by both Reprint handlers:

1. **Path 4 empty-array bug** — `response.data.orders = []` (empty array) is truthy in JS, so it flows through as `raw = []`. This passes both `!raw` and `!rawOrderDetails` guards silently, then calls `printOrder` with a garbage order (0 items).
2. **Length guard bug** — `if (!order?.rawOrderDetails)` does not catch an empty array because `![]` = `false` in JS. Must check `.length`.

---

## Scope Lock

### Files WILL change
| File | Lines | Reason |
|---|---|---|
| `src/pages/reports-module/OrderReportBetaPage.jsx` | 304–317 | Primary fix — handleReprint |
| `src/pages/AllOrdersReportPage.jsx` | 830–852 | Parity fix — handlePrintBillFromAudit |

### Files WILL NOT touch
- `api/transforms/orderTransform.js`
- `api/services/orderService.js`
- `api/constants.js`
- Any other file

---

## Execution Sequence

Execute Edit 1 first (primary), then Edit 2 (parity). Verify compile after each.

---

## Edit 1 — `OrderReportBetaPage.jsx` (PRIMARY)

### Location
`src/pages/reports-module/OrderReportBetaPage.jsx`
Lines 303–317 (inside `handleReprint`, inside `try` block)

### Current code (lines 303–317)
```js
      const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row.order_id });
      const raw =
        response?.data?.orders?.order_details_order ||
        response?.data?.order_details_order ||
        (Array.isArray(response?.data?.orders) ? response.data.orders[0] : null) ||
        response?.data?.orders || response?.data || null;
      if (!raw) {
        toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
        return;
      }
      const order = orderFromAPI.order(raw);
      if (!order?.rawOrderDetails) {
        toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
        return;
      }
```

### New code
```js
      const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row.order_id });
      // BUG-368: extract raw order safely — empty array [] is truthy in JS so must guard explicitly
      const ordersArr = response?.data?.orders;
      const raw =
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr?.order_details_order : null) ||
        response?.data?.order_details_order ||
        (Array.isArray(ordersArr) && ordersArr.length > 0 ? ordersArr[0] : null) ||
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr : null) ||
        response?.data || null;
      if (!raw || Array.isArray(raw)) {
        toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
        return;
      }
      const order = orderFromAPI.order(raw);
      if (!order?.rawOrderDetails?.length) {
        toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' });
        return;
      }
```

### Change breakdown
| Sub-edit | Line(s) | What changes | Why |
|---|---|---|---|
| E1-a | 304–308 | Extract `ordersArr` first; guard Path 1/4 with `!Array.isArray()` | Prevents dict paths from running on an array |
| E1-b | 307 | `Array.isArray(ordersArr) && ordersArr.length > 0` | Only extract `[0]` when array is non-empty |
| E1-c | 308 | Path 4 now skips arrays entirely | Blocks empty `[]` from becoming `raw` |
| E1-d | 309 | `!raw \|\| Array.isArray(raw)` | Final safety net — reject if raw is still an array |
| E1-e | 314 | `rawOrderDetails?.length` | Catch empty items list (`[]`) — `![]` = false in JS |

---

## Edit 2 — `AllOrdersReportPage.jsx` (PARITY)

### Location
`src/pages/AllOrdersReportPage.jsx`
Lines 830–852 (inside `handlePrintBillFromAudit`, inside `try` block)

### Current code (lines 830–852)
```js
      const raw =
        response?.data?.orders?.order_details_order ||
        response?.data?.order_details_order ||
        (Array.isArray(response?.data?.orders) ? response.data.orders[0] : null) ||
        response?.data?.orders ||
        response?.data ||
        null;
      if (!raw) {
        toast({
          title: 'Cannot print bill',
          description: 'Order details unavailable',
          variant: 'destructive',
        });
        return;
      }
      const order = orderFromAPI.order(raw);
      if (!order || !order.rawOrderDetails) {
        toast({
          title: 'Cannot print bill',
          description: 'Order details unavailable',
          variant: 'destructive',
        });
        return;
      }
```

### New code
```js
      // BUG-368: extract raw order safely — empty array [] is truthy in JS so must guard explicitly
      const ordersArr = response?.data?.orders;
      const raw =
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr?.order_details_order : null) ||
        response?.data?.order_details_order ||
        (Array.isArray(ordersArr) && ordersArr.length > 0 ? ordersArr[0] : null) ||
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr : null) ||
        response?.data || null;
      if (!raw || Array.isArray(raw)) {
        toast({
          title: 'Cannot print bill',
          description: 'Order details unavailable',
          variant: 'destructive',
        });
        return;
      }
      const order = orderFromAPI.order(raw);
      if (!order || !order.rawOrderDetails?.length) {
        toast({
          title: 'Cannot print bill',
          description: 'Order details unavailable',
          variant: 'destructive',
        });
        return;
      }
```

### Change breakdown
| Sub-edit | Line(s) | What changes | Why |
|---|---|---|---|
| E2-a | 830–834 | Same `ordersArr` extraction pattern as Edit 1 | Parity fix — identical defect |
| E2-b | 833 | `ordersArr.length > 0` guard | Same as E1-b |
| E2-c | 834 | Path 4 skips arrays | Same as E1-c |
| E2-d | 837 | `!raw \|\| Array.isArray(raw)` | Same as E1-d |
| E2-e | 846 | `!order.rawOrderDetails?.length` | Same as E1-e |

---

## Verification Matrix

| Edit | File | How to self-test | Automated? |
|---|---|---|---|
| E1-a–e | `OrderReportBetaPage.jsx` | Login → Orders (Beta) → Reprint on order 000301 → bill request sent (no error toast) | NO — browser |
| E2-a–e | `AllOrdersReportPage.jsx` | Login → All Orders → Reprint on a partial-payment order → bill request sent | NO — browser |
| Guard: empty array | Both | Dev console: manually call handler with `{orders: []}` mock → "Order details unavailable" toast fires | NO — dev console |
| Guard: empty items | Both | Dev console: mock order with `orderDetails: []` → toast fires | NO — dev console |
| Compile | Both | `webpack compiled successfully` in supervisor log after save | YES — webpack |
| Regression | AllOrdersReportPage | Reprint on a normal (non-split) settled order still works | NO — browser |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Existing normal reprintflow broken by new Path logic | LOW | HIGH | Path 3 logic unchanged for non-empty arrays; path 1/2 unchanged for dict responses |
| Empty `ordersArr` (undefined) causes error in new code | VERY LOW | MEDIUM | `ordersArr && !Array.isArray(ordersArr)` guard handles undefined safely |
| AllOrdersReportPage uses `row.id` not `row.order_id` — different field | N/A | LOW | Confirmed — Edit 2 does not touch the `row.id` field; only the unwrap chain |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-368 → status: IMPLEMENTED, sprint_key: pos_5_1
□ 2. BUG_TRACKER.md: row → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: add:
       OrderReportBetaPage.jsx | BUG-368 path4+length fix | 2026-09-02
       AllOrdersReportPage.jsx | BUG-368 parity fix       | 2026-09-02
□ 4. Code markers: // BUG-368 comment present in BOTH modified files (added in new code above)
□ 5. Compile check: webpack 0 new errors/warnings
```

---

## QA Handover Seed (for QA agent after implementation)

### Test cases
| # | Steps | Expected | Blocker if fail? |
|---|---|---|---|
| T1 | Login as owner@ruby.com → Orders (Beta) → find order 000301 (Partial) → click Reprint | "Bill request sent" toast appears, no error | YES — BLOCKER |
| T2 | All Orders report → find a settled partial-payment order → click Reprint | "Bill request sent" toast, no error | YES — BLOCKER |
| T3 | Orders (Beta) → Reprint on a normal (non-split) settled order | Still works — "Bill request sent" | YES — BLOCKER (regression) |
| T4 | Orders (Beta) → Reprint on a cancelled order (f_order_status ≠ 6) | Button does not appear | MINOR |

### Environment
- URL: https://react-app-deploy-8.preview.emergentagent.com
- Account: owner@ruby.com / *** (see test_credentials.md)
- Restaurant: uat Ruby (id 672)
- Test order: restaurant_order_id 000301, internal order_id 1232186

---

## Awaiting Gate 4 GO

```
OWNER APPROVAL REQUIRED
Reason: Gate 4 GO before implementation (per approval matrix)
Risk: MEDIUM
Proposed next step: Implement Edit 1 + Edit 2, run compile check, write QA handover
I will not proceed until owner approves.
```
