# CR-349 — Impact Analysis: Wire Change / Unpaid / Reprint on Beta Report Settled Tab

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-26
**Code Reality:** NONE — no action buttons beyond Refund (CR-165) exist in `OrderReportBetaPage.jsx`
**Conflict Pre-Check:** NONE — no other active item in queue touches this file
**Risk:** MEDIUM — calls payment mutation APIs (Change/Unpaid) which are financial operations, but these are existing tested services called in a new context only
**OD-1 LOCKED:** Option B — wire directly, keep Beta page's own custom table layout unchanged
**OD-2 LOCKED:** All 3 actions applicable (Change / Unpaid / Reprint)

---

## Data Flow Trace

### Current state
```
OrderReportBetaPage.jsx
  row data: raw snake_case API fields
    row.order_id          ← numeric DB id (key for all 3 actions)
    row.restaurant_order_id ← display order #
    row.razorpay_order_id   ← suppresses Change + Unpaid on PG orders
    row.f_order_status      ← 6 = settled (gate for showing buttons)

  <td> at lines 488-500: Refund only (CR-165)
  No Change / No Unpaid / No Reprint
```

### After CR-349
```
handleChange(row, newMethod)
  → changeOrderPaymentMethod(row.order_id, newMethod)   [paymentMutationService]

handleUnpaid(row)
  → MarkUnpaidConfirmDialog opens
  → on confirm: makeOrderUnpaid(row.order_id)           [paymentMutationService]

handleReprint(row)
  → POST API_ENDPOINTS.SINGLE_ORDER_NEW { order_id: row.order_id }
  → orderFromAPI.order(raw)  ← transforms raw response to expected shape
  → printOrder(row.order_id, 'bill', null, order, 0, {}, printerAgents)
  [identical to AllOrdersReportPage handlePrintBillFromAudit, lines 818-865]
```

---

## What Changes — `OrderReportBetaPage.jsx` only

### A — New imports (6 lines)
```js
import { changeOrderPaymentMethod, makeOrderUnpaid } from '../../api/services/paymentMutationService'; // CR-349
import MarkUnpaidConfirmDialog from '../../components/reports/MarkUnpaidConfirmDialog'; // CR-349
import { printOrder } from '../../api/services/orderService'; // CR-349
import { fromAPI as orderFromAPI } from '../../api/transforms/orderTransform'; // CR-349
import api from '../../api/axios'; // CR-349
import { API_ENDPOINTS } from '../../api/constants'; // CR-349
```

### B — `useRestaurant()` destructure extension
Current: `const { currencySymbol } = useRestaurant();`
New: `const { currencySymbol, printerAgents } = useRestaurant();`

### C — 5 new state variables (after existing state)
```js
const [pendingChangeMethodIds, setPendingChangeMethodIds] = useState(() => new Set()); // CR-349
const [markUnpaidTarget, setMarkUnpaidTarget]             = useState(null);            // CR-349
const [markUnpaidPending, setMarkUnpaidPending]           = useState(false);           // CR-349
const [optimisticUnpaidIds, setOptimisticUnpaidIds]       = useState(() => new Set()); // CR-349
const [printingIds, setPrintingIds]                       = useState(() => new Set()); // CR-349
```

### D — 3 new handlers (after existing fetchData/handleExport handlers)

**handleChange** — identical to AllOrdersReportPage.handleChangeMethod but reads `row.order_id`:
```js
const handleChange = useCallback(async (row, newMethod) => { // CR-349
  setPendingChangeMethodIds(prev => new Set(prev).add(row.order_id));
  try {
    await changeOrderPaymentMethod(row.order_id, newMethod);
    toast({ title: 'Payment method updated', description: `Order #${row.restaurant_order_id} → ${newMethod.toUpperCase()}` });
    fetchData(appliedFrom, appliedTo); // refresh
  } catch (err) {
    toast({ title: 'Failed to change payment', description: err?.readableMessage || err?.message, variant: 'destructive' });
  } finally {
    setPendingChangeMethodIds(prev => { const n = new Set(prev); n.delete(row.order_id); return n; });
  }
}, [appliedFrom, appliedTo, fetchData, toast]);
```

**handleUnpaid** — opens dialog; confirm calls makeOrderUnpaid:
```js
const handleUnpaidConfirm = useCallback(async (row) => { // CR-349
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
```

**handleReprint** — exact pattern from AllOrdersReportPage:818-865:
```js
const handleReprint = useCallback(async (row) => { // CR-349
  if (!row?.order_id) return;
  setPrintingIds(prev => new Set(prev).add(row.order_id));
  try {
    const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row.order_id });
    const raw =
      response?.data?.orders?.order_details_order ||
      response?.data?.order_details_order ||
      (Array.isArray(response?.data?.orders) ? response.data.orders[0] : null) ||
      response?.data?.orders || response?.data || null;
    if (!raw) { toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' }); return; }
    const order = orderFromAPI.order(raw);
    if (!order?.rawOrderDetails) { toast({ title: 'Cannot print bill', description: 'Order details unavailable', variant: 'destructive' }); return; }
    await printOrder(row.order_id, 'bill', null, order, 0, {}, printerAgents || []);
    toast({ title: 'Bill request sent', description: `Order #${row.restaurant_order_id}` });
  } catch (err) {
    toast({ title: 'Failed to print bill', description: err?.readableMessage, variant: 'destructive' });
  } finally {
    setPrintingIds(prev => { const n = new Set(prev); n.delete(row.order_id); return n; });
  }
}, [printerAgents, toast]);
```

### E — Action buttons in the table row `<td>` (lines ~488-500)

**Gate:** `row.f_order_status === 6 && !row.razorpay_order_id` for Change + Unpaid; `row.f_order_status === 6` for Reprint.

The existing `<td>` at line 488 already holds the Refund button. Extend it with 3 new buttons for settled rows:
```jsx
<td className="px-3 py-2">
  <div className="flex items-center gap-1 flex-wrap">
    {/* CR-349: Change — settled non-PG only */}
    {row.f_order_status === 6 && !row.razorpay_order_id && (
      <button onClick={() => { /* open method picker or inline confirm */ handleChange(row, 'cash') }}
        disabled={pendingChangeMethodIds.has(row.order_id)}
        data-testid={`change-btn-${row.order_id}`}
        className="px-2 py-1 text-xs font-semibold rounded-lg border ...">
        Change
      </button>
    )}
    {/* CR-349: Unpaid — settled non-PG only */}
    {row.f_order_status === 6 && !row.razorpay_order_id && !optimisticUnpaidIds.has(row.order_id) && (
      <button onClick={() => setMarkUnpaidTarget(row)}
        data-testid={`unpaid-btn-${row.order_id}`}
        className="...">
        Unpaid
      </button>
    )}
    {/* CR-349: Reprint — all settled rows */}
    {row.f_order_status === 6 && (
      <button onClick={() => handleReprint(row)}
        disabled={printingIds.has(row.order_id)}
        data-testid={`reprint-btn-${row.order_id}`}
        className="...">
        {printingIds.has(row.order_id) ? <Loader2 /> : 'Reprint'}
      </button>
    )}
    {/* existing Refund (CR-165) — unchanged */}
    {row.razorpay_order_id && row.f_order_status !== 3 && (
      <button onClick={() => setRefundOrder(row)} ...>Refund</button>
    )}
  </div>
</td>
```

**Note on Change — payment method picker:** AllOrdersReportPage uses a `ChangeMethodButton` component that shows a dropdown picker of available payment methods. For CR-349, a simplified inline approach is acceptable: a dropdown `<select>` or small modal. Planning agent should confirm pattern with owner before Gate 3.

### F — MarkUnpaidConfirmDialog at page bottom (before closing `</div>`)
```jsx
{markUnpaidTarget && (
  <MarkUnpaidConfirmDialog
    order={markUnpaidTarget}
    isPending={markUnpaidPending}
    onConfirm={() => handleUnpaidConfirm(markUnpaidTarget)}
    onClose={() => setMarkUnpaidTarget(null)}
  />
)}
```

---

## Files WILL Change

| File | Change | Risk |
|---|---|---|
| `pages/reports-module/OrderReportBetaPage.jsx` | +6 imports, +1 destructure extension, +5 state vars, +3 handlers, +action buttons JSX, +MarkUnpaidConfirmDialog | MEDIUM |

## Files Will NOT Touch
All other files. Services (`paymentMutationService`, `orderService`) are called but not modified.

---

## One Open Question for Gate 3

**Q1 — Change payment method picker:** AllOrdersReportPage uses a `ChangeMethodButton` local component that shows a dropdown of available payment methods before confirming. Should CR-349 replicate that picker, or use a simpler inline approach (e.g. a select dropdown in the actions cell)? Impacts ~10 lines of JSX.

---

## Verification Matrix (seeds Gate 3 plan + QA)

| # | Test | File | Manual/Auto |
|---|---|---|---|
| T1 | Change button visible on settled non-PG row | OrderReportBetaPage | MANUAL |
| T2 | Change button hidden on Razorpay PG settled row | OrderReportBetaPage | MANUAL |
| T3 | Change fires `changeOrderPaymentMethod(order_id, method)` | Network tab | MANUAL |
| T4 | Unpaid button visible on settled non-PG row | OrderReportBetaPage | MANUAL |
| T5 | Unpaid button opens MarkUnpaidConfirmDialog | OrderReportBetaPage | MANUAL |
| T6 | Confirm unpaid fires `makeOrderUnpaid(order_id)` | Network tab | MANUAL |
| T7 | Reprint button visible on all settled rows | OrderReportBetaPage | MANUAL |
| T8 | Reprint fetches order then calls printOrder | Network tab | MANUAL |
| T9 | Refund (CR-165) still works as before | OrderReportBetaPage | MANUAL |
| T10 | No buttons show on non-settled rows (cancelled, running etc.) | OrderReportBetaPage | MANUAL |

---

## Post-Code Registry Checklist (for Implementation agent)

- [ ] `registry.json`: CR-349 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `CR_REGISTRY.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `OrderReportBetaPage.jsx` listed with CR-349
- [ ] Code markers: `// CR-349` on every added block
- [ ] Compile: 0 new warnings
