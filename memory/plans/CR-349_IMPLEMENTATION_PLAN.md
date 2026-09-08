# CR-349 — Implementation Plan: Wire Change / Unpaid / Reprint on Beta Report Settled Tab

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-26
**Impact Analysis:** `/app/memory/impact/CR-349_IMPACT_ANALYSIS.md`
**Code Reality:** NONE — clean implementation
**Risk:** MEDIUM — calls payment mutation APIs on existing tested services
**Files WILL change:** `OrderReportBetaPage.jsx` only
**Files will NOT touch:** Any other file

---

## Q1 Resolution (Change method picker)

**Using `PaymentMethodPicker` component directly** — it exists at
`/app/frontend/src/components/reports/PaymentMethodPicker.jsx`, is already exported from the
reports index, and accepts `{ order, currentMethod, disabled, isPending, onConfirm }`.
This is strictly additive (one more import, same UX pattern as AllOrdersReportPage).
No new component needed, no custom select.

---

## Entry Verification (MANDATORY before coding)

| # | File | Line | Expected current state |
|---|---|---|---|
| 1 | `OrderReportBetaPage.jsx:12` | 12 | `import { getOrderReportBetaCombined, exportOrderReportBetaExcel } from '../../api/services/reportService';` |
| 2 | `OrderReportBetaPage.jsx:214` | 214 | `const { currencySymbol } = useRestaurant();` |
| 3 | `OrderReportBetaPage.jsx:217` | 217 | `const [refundOrder, setRefundOrder] = useState(null); // CR-165` |
| 4 | `OrderReportBetaPage.jsx:238` | 238 | `const handleRefundConfirm = useCallback(async (reason, note) => {` |
| 5 | `OrderReportBetaPage.jsx:427` | 427 | `const dayOrders = day.filteredReport;` |
| 6 | `OrderReportBetaPage.jsx:488` | 488 | `{/* CR-165: Refund button — only for active (non-cancelled) Razorpay PG orders */}` |
| 7 | `OrderReportBetaPage.jsx:555` | 555 | `{/* CR-165: Refund modal — Trigger B */}` |

---

## Edits

### Edit 1 — 8 new imports (after line 12)

**Current (line 12):**
```js
import { getOrderReportBetaCombined, exportOrderReportBetaExcel } from '../../api/services/reportService';
```

**New:**
```js
import { getOrderReportBetaCombined, exportOrderReportBetaExcel } from '../../api/services/reportService';
import { changeOrderPaymentMethod, makeOrderUnpaid } from '../../api/services/paymentMutationService'; // CR-349
import MarkUnpaidConfirmDialog from '../../components/reports/MarkUnpaidConfirmDialog'; // CR-349
import PaymentMethodPicker from '../../components/reports/PaymentMethodPicker'; // CR-349
import { printOrder } from '../../api/services/orderService'; // CR-349
import { fromAPI as orderFromAPI } from '../../api/transforms/orderTransform'; // CR-349
import api from '../../api/axios'; // CR-349
import { API_ENDPOINTS } from '../../api/constants'; // CR-349
import { isMutationAllowedForSelectedDate } from '../../utils/businessDay'; // CR-349
```

---

### Edit 2 — Extend `useRestaurant()` destructure (line 214)

**Current:**
```js
  const { currencySymbol } = useRestaurant();
```

**New:**
```js
  const { currencySymbol, printerAgents, paymentTypes: restaurantPaymentTypes } = useRestaurant(); // CR-349: +printerAgents, +paymentTypes
```

---

### Edit 3 — 5 new state variables (after line 217)

**Current (line 217):**
```js
  const [refundOrder, setRefundOrder] = useState(null); // CR-165: order selected for refund
```

**New:**
```js
  const [refundOrder, setRefundOrder] = useState(null); // CR-165: order selected for refund
  // CR-349: action state
  const [pendingChangeMethodIds, setPendingChangeMethodIds] = useState(() => new Set());
  const [markUnpaidTarget, setMarkUnpaidTarget]             = useState(null);
  const [markUnpaidPending, setMarkUnpaidPending]           = useState(false);
  const [optimisticUnpaidIds, setOptimisticUnpaidIds]       = useState(() => new Set());
  const [printingIds, setPrintingIds]                       = useState(() => new Set());
```

---

### Edit 4 — 3 new handlers (after handleRefundConfirm, i.e. after line 248)

`handleRefundConfirm` ends at line 248: `}, [refundOrder]);`

**Insert after line 248:**
```js
  // CR-349: Change payment method
  const handleChange = useCallback(async (row, newMethod) => {
    setPendingChangeMethodIds(prev => new Set(prev).add(row.order_id));
    try {
      await changeOrderPaymentMethod(row.order_id, newMethod);
      toast({ title: 'Payment method updated', description: `Order #${row.restaurant_order_id} → ${newMethod.toUpperCase()}` });
      fetchData(appliedFrom, appliedTo);
    } catch (err) {
      toast({ title: 'Failed to change payment', description: err?.readableMessage || err?.message, variant: 'destructive' });
    } finally {
      setPendingChangeMethodIds(prev => { const n = new Set(prev); n.delete(row.order_id); return n; });
    }
  }, [appliedFrom, appliedTo, fetchData, toast]);

  // CR-349: Confirm mark-as-unpaid (called by MarkUnpaidConfirmDialog)
  const handleUnpaidConfirm = useCallback(async (row) => {
    setMarkUnpaidPending(true);
    setOptimisticUnpaidIds(prev => new Set(prev).add(row.order_id));
    try {
      await makeOrderUnpaid(row.order_id);
      toast({ title: 'Order marked unpaid', description: `Order #${row.restaurant_order_id}` });
      setMarkUnpaidTarget(null);
      fetchData(appliedFrom, appliedTo);
    } catch (err) {
      toast({ title: 'Failed to mark unpaid', description: err?.readableMessage || err?.message, variant: 'destructive' });
      setOptimisticUnpaidIds(prev => { const n = new Set(prev); n.delete(row.order_id); return n; });
    } finally {
      setMarkUnpaidPending(false);
    }
  }, [appliedFrom, appliedTo, fetchData, toast]);

  // CR-349: Reprint bill — mirrors AllOrdersReportPage handlePrintBillFromAudit (lines 818-865)
  const handleReprint = useCallback(async (row) => {
    if (!row?.order_id) return;
    setPrintingIds(prev => new Set(prev).add(row.order_id));
    try {
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
      await printOrder(row.order_id, 'bill', null, order, 0, {}, printerAgents || []);
      toast({ title: 'Bill request sent', description: `Order #${row.restaurant_order_id}` });
    } catch (err) {
      toast({ title: 'Failed to print bill', description: err?.readableMessage, variant: 'destructive' });
    } finally {
      setPrintingIds(prev => { const n = new Set(prev); n.delete(row.order_id); return n; });
    }
  }, [printerAgents, toast]);
```

---

### Edit 5 — Mutation window computed per day (after line 428)

**Current (line 427-428):**
```js
            const dayOrders = day.filteredReport;
            const dayAmount = dayOrders.reduce(...);
```

**New:**
```js
            const dayOrders = day.filteredReport;
            // CR-349: mutation window gate — same 2-day rule as AllOrdersReportPage
            const isWithinMutation = isMutationAllowedForSelectedDate(day.date);
            const dayAmount = dayOrders.reduce(...);
```

---

### Edit 6 — Replace actions `<td>` (lines 488-500)

**Current:**
```jsx
                              {/* CR-165: Refund button — only for active (non-cancelled) Razorpay PG orders */}
                              <td className="px-3 py-2">
                                {row.razorpay_order_id && row.f_order_status !== 3 && (
                                  <button
                                    onClick={() => setRefundOrder(row)}
                                    className="px-2 py-1 text-xs font-semibold rounded-lg border transition-colors hover:bg-red-50"
                                    style={{ color: '#ef4444', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                                    data-testid={`refund-order-btn-${row.order_id}`}
                                  >
                                    Refund
                                  </button>
                                )}
                              </td>
```

**New:**
```jsx
                              {/* CR-349: action buttons — Change / Unpaid / Reprint / Refund */}
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  {/* Change — settled non-PG, within mutation window */}
                                  {row.f_order_status === 6 && !row.razorpay_order_id && (
                                    <PaymentMethodPicker
                                      order={{ id: row.order_id }}
                                      currentMethod={(row.payment_method_raw || row.payment_method || '').toLowerCase()}
                                      disabled={!isWithinMutation}
                                      isPending={pendingChangeMethodIds.has(row.order_id)}
                                      onConfirm={(newMethod) => handleChange(row, newMethod)}
                                      data-testid={`change-btn-${row.order_id}`}
                                    />
                                  )}
                                  {/* Unpaid — settled non-PG, within mutation window, not optimistically hidden */}
                                  {row.f_order_status === 6 && !row.razorpay_order_id && !optimisticUnpaidIds.has(row.order_id) && (
                                    <button
                                      onClick={() => setMarkUnpaidTarget(row)}
                                      disabled={!isWithinMutation}
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors ${
                                        isWithinMutation
                                          ? 'border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer'
                                          : 'border-zinc-200 text-zinc-400 cursor-not-allowed'
                                      }`}
                                      title={isWithinMutation ? 'Mark as unpaid' : 'Only available for today and yesterday'}
                                      data-testid={`unpaid-btn-${row.order_id}`}
                                    >
                                      Unpaid
                                    </button>
                                  )}
                                  {/* Reprint — all settled rows, no mutation window restriction */}
                                  {row.f_order_status === 6 && (
                                    <button
                                      onClick={() => handleReprint(row)}
                                      disabled={printingIds.has(row.order_id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors border-orange-300 text-orange-700 hover:bg-orange-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Print bill"
                                      data-testid={`reprint-btn-${row.order_id}`}
                                    >
                                      {printingIds.has(row.order_id)
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : 'Reprint'}
                                    </button>
                                  )}
                                  {/* Refund — CR-165 unchanged: Razorpay PG non-cancelled only */}
                                  {row.razorpay_order_id && row.f_order_status !== 3 && (
                                    <button
                                      onClick={() => setRefundOrder(row)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
                                      style={{ backgroundColor: '#fef2f2' }}
                                      data-testid={`refund-order-btn-${row.order_id}`}
                                    >
                                      Refund
                                    </button>
                                  )}
                                </div>
                              </td>
```

---

### Edit 7 — `MarkUnpaidConfirmDialog` at page level (after line 565)

**Current (lines 555-565):**
```jsx
      {/* CR-165: Refund modal — Trigger B */}
      {refundOrder && (
        <CancelOrderModal ... />
      )}
    </div>
  );
}
```

**New:**
```jsx
      {/* CR-165: Refund modal — Trigger B */}
      {refundOrder && (
        <CancelOrderModal ... />
      )}
      {/* CR-349: Mark-as-Unpaid confirmation dialog */}
      {markUnpaidTarget && (
        <MarkUnpaidConfirmDialog
          order={{ id: markUnpaidTarget.order_id, orderNumber: markUnpaidTarget.restaurant_order_id }}
          isPending={markUnpaidPending}
          onConfirm={() => handleUnpaidConfirm(markUnpaidTarget)}
          onClose={() => setMarkUnpaidTarget(null)}
        />
      )}
    </div>
  );
}
```

---

## Execution Sequence

1. Edit 1 — imports (foundation, no dependencies)
2. Edit 2 — `useRestaurant()` destructure (`printerAgents` needed by handleReprint)
3. Edit 3 — state variables (needed by handlers)
4. Edit 4 — handlers (depend on state + imports)
5. Edit 5 — mutation window in day loop
6. Edit 6 — actions `<td>` (depends on state + handlers)
7. Edit 7 — `MarkUnpaidConfirmDialog` (depends on state)
8. Compile check → 0 new warnings

---

## Scope Lock

**Files WILL change:** `pages/reports-module/OrderReportBetaPage.jsx`
**Files will NOT touch:** `PaymentMethodPicker.jsx`, `MarkUnpaidConfirmDialog.jsx`,
`paymentMutationService.js`, `orderService.js`, `orderTransform.js`,
`businessDay.js`, `AllOrdersReportPage.jsx`, `OrderTable.jsx`, any other file

---

## Verification Matrix

| # | Edit | Test | Expected |
|---|---|---|---|
| T1 | E1–E4 | Change button renders on settled non-PG row (within window) | `PaymentMethodPicker` visible, `data-testid="row-action-change-method-{id}"` |
| T2 | E6 | Change button disabled on settled non-PG row outside mutation window | Button rendered but `disabled`, cursor-not-allowed tooltip |
| T3 | E6 | Change button absent on Razorpay PG settled row | No `PaymentMethodPicker` rendered |
| T4 | E4 | Pick new method from picker → Network tab | `PATCH payment-method` with `order_id` + `newMethod` |
| T5 | E6 | Unpaid button on settled non-PG row | `data-testid="unpaid-btn-{id}"` present |
| T6 | E6,E7 | Click Unpaid → dialog opens | `MarkUnpaidConfirmDialog` mounted with correct `orderNumber` |
| T7 | E4 | Confirm unpaid → Network tab | `makeOrderUnpaid` endpoint called with `order_id` |
| T8 | E6 | Unpaid button hidden after optimistic click | Row's Unpaid button gone before refresh |
| T9 | E6 | Reprint button on all settled rows (PG + non-PG) | `data-testid="reprint-btn-{id}"` present |
| T10 | E4 | Click Reprint → spinner shown → Network tab | POST `SINGLE_ORDER_NEW` then `printOrder` |
| T11 | E6 | Refund button unchanged — PG non-cancelled only | `data-testid="refund-order-btn-{id}"` present for PG rows, absent for non-PG |
| T12 | Regression | Non-settled rows (cancelled, running, credit) have no new buttons | Only Refund (if PG) |
| T13 | Regression | CR-165 Refund flow unchanged | CancelOrderModal opens, refund works |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: CR-349 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `CR_REGISTRY.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `OrderReportBetaPage.jsx` listed with CR-349
- [ ] Code markers: `// CR-349` on every added block
- [ ] Compile: 0 new warnings
