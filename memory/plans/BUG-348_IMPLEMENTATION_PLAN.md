# BUG-348 — Implementation Plan (Gate 3)
## Razorpay PG Paid Orders: Show Refund Only (suppress Change Method + Unpaid)

**Date:** 2026-08-24
**Based on intake:** `/app/memory/change_requests/BUG-348_PG_PAID_ORDER_WRONG_ACTIONS_INTAKE.md`
**Owner directive:** For `razorpayOrderId != null` rows on Paid tab: NO Change Method, NO Unpaid, ONLY Refund (+ Print unchanged)

---

## Pre-Implementation Entry Verification

```
1. OrderTable.jsx line 347 reads:
   {canChangeMethod && (
     <PaymentMethodPicker
   → confirm verbatim

2. OrderTable.jsx line 357 reads:
   {canMarkUnpaid && (
     <button
       type="button"
       onClick={(e) => {
         stop(e);
         if (!isWithinMutationWindow) return;
         onMarkUnpaid?.(order);
       }}
   → confirm verbatim

3. OrderTable.jsx — Print button ends with:
         <Printer className="w-3.5 h-3.5" />
         <span>Print</span>
       </button>
     </div>
   );
   → confirm verbatim (Refund button inserts before </div>)

4. AllOrdersReportPage.jsx actionsConfig — confirms:
   onPrintBill: handlePrintBillFromAudit,
   → confirm verbatim (onRefund inserts after this line)

5. AllOrdersReportPage.jsx — imports confirm:
   import { useRestaurant } from "../contexts";
   → confirm (useSettings added alongside)

6. AllOrdersReportPage.jsx — MarkUnpaidConfirmDialog block exists at bottom of JSX
   → confirm (CancelOrderModal rendered immediately after it)
```

---

## Scope Lock

**Files WILL change (2):**
1. `src/components/reports/OrderTable.jsx`
2. `src/pages/AllOrdersReportPage.jsx`

**Files will NOT touch:** `reportTransform.js`, `FilterBar.jsx`, `OrderDetailSheet.jsx`, `OrderTable column config`, `DashboardPage.jsx`, `OrderEntry.jsx`, `CancelOrderModal.jsx`, `razorpayRefundService.js`

---

## Edit 1 — `src/components/reports/OrderTable.jsx` (3 sub-edits)

### 1a — Suppress Change Method for PG orders (line 347)

**Search (verbatim):**
```
        {canChangeMethod && (
          <PaymentMethodPicker
```
**Replace with:**
```
        {/* BUG-348: suppress Change Method for Razorpay PG orders */}
        {canChangeMethod && !order.razorpayOrderId && (
          <PaymentMethodPicker
```

### 1b — Suppress Unpaid for PG orders (line 357)

**Search (verbatim):**
```
        {canMarkUnpaid && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              if (!isWithinMutationWindow) return;
              onMarkUnpaid?.(order);
            }}
```
**Replace with:**
```
        {/* BUG-348: suppress Mark Unpaid for Razorpay PG orders */}
        {canMarkUnpaid && !order.razorpayOrderId && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              if (!isWithinMutationWindow) return;
              onMarkUnpaid?.(order);
            }}
```

### 1c — Add Refund button after Print button

**Search (verbatim):**
```
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </div>
    );
```
**Replace with:**
```
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
        {/* BUG-348 / CR-165: Refund button — Razorpay PG paid orders only */}
        {actionsConfig.onRefund && order.razorpayOrderId && (
          <button
            type="button"
            onClick={(e) => { stop(e); actionsConfig.onRefund(order); }}
            title="Initiate Razorpay refund"
            data-testid={`row-action-refund-${order.id}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refund</span>
          </button>
        )}
      </div>
    );
```

---

## Edit 2 — `src/pages/AllOrdersReportPage.jsx` (4 sub-edits)

### 2a — Imports

**Search (verbatim):**
```
import { useRestaurant } from "../contexts";
```
**Replace with:**
```
import { useRestaurant, useSettings } from "../contexts"; // BUG-348: +useSettings for cancellation reasons
import { cancelAndRefund } from '../api/services/razorpayRefundService'; // BUG-348
import CancelOrderModal from '../components/order-entry/CancelOrderModal'; // BUG-348
```

### 2b — State + handler (after existing handlers, before actionsConfig)

**Search (verbatim):**
```
  const actionsConfig = (activeTab === 'paid' || activeTab === 'hold')
```
**Replace with:**
```
  // BUG-348: Razorpay refund from Paid tab
  const { getOrderCancellationReasons } = useSettings();
  const [refundOrder, setRefundOrder] = useState(null);
  const handleRefundConfirm = useCallback(async (reason, note) => {
    if (!refundOrder) return;
    try {
      await cancelAndRefund(refundOrder.id, reason?.reasonText || String(reason), note);
      toast({ title: 'Refund Initiated', description: 'Razorpay refund has been initiated.' });
    } catch (err) {
      toast({ title: 'Refund Failed', description: err?.readableMessage || 'Contact support.', variant: 'destructive' });
    } finally {
      setRefundOrder(null);
    }
  }, [refundOrder, toast]);

  const actionsConfig = (activeTab === 'paid' || activeTab === 'hold')
```

### 2c — Add onRefund to actionsConfig

**Search (verbatim):**
```
        onPrintBill: handlePrintBillFromAudit,
        // BUG-042-A (Feb-2026): Hold-tab Collect Bill must surface only
```
**Replace with:**
```
        onPrintBill: handlePrintBillFromAudit,
        onRefund: setRefundOrder, // BUG-348: Razorpay refund
        // BUG-042-A (Feb-2026): Hold-tab Collect Bill must surface only
```

### 2d — Render CancelOrderModal at bottom of JSX

**Search (verbatim):**
```
      {/* CR-003 Phase 3.5 — Mark as Unpaid confirmation */}
      <MarkUnpaidConfirmDialog
```
**Replace with:**
```
      {/* BUG-348 / CR-165: Razorpay refund modal */}
      {refundOrder && (
        <CancelOrderModal
          table={{ label: `Order #${refundOrder.orderNumber || refundOrder.id}` }}
          itemCount={1}
          reasons={getOrderCancellationReasons()}
          onClose={() => setRefundOrder(null)}
          onCancel={handleRefundConfirm}
          mode="refund"
        />
      )}

      {/* CR-003 Phase 3.5 — Mark as Unpaid confirmation */}
      <MarkUnpaidConfirmDialog
```

---

## Verification Matrix

| # | File | Change | Verify |
|---|---|---|---|
| 1a | `OrderTable.jsx` | Change Method hidden for PG rows | Paid tab: Razorpay row → no PaymentMethodPicker |
| 1b | `OrderTable.jsx` | Unpaid hidden for PG rows | Paid tab: Razorpay row → no Unpaid button |
| 1c | `OrderTable.jsx` | Refund button on PG rows | `data-testid="row-action-refund-{id}"` present for PG rows |
| — | `OrderTable.jsx` | Cash/UPI rows fully unchanged | Cash row: Change Method + Unpaid + Print still show |
| 2a | `AllOrdersReportPage.jsx` | Imports added | Compile 0 errors |
| 2b | `AllOrdersReportPage.jsx` | `handleRefundConfirm` + state | `grep handleRefundConfirm AllOrdersReportPage.jsx` → 2 hits |
| 2c | `AllOrdersReportPage.jsx` | `onRefund` in actionsConfig | `grep onRefund AllOrdersReportPage.jsx` → 1 hit |
| 2d | `AllOrdersReportPage.jsx` | Modal renders on Refund click | Click Refund on PG row → CancelOrderModal opens, mode="refund" |
| R1 | Regression | Cash paid row: Change Method + Unpaid + Print unchanged | Cash row on Paid tab: all 3 actions present |
| R2 | Regression | Hold tab: Collect unchanged | Hold tab rows: only Collect button, no Refund |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-348 → IMPLEMENTED, pos_6_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: both files with BUG-348 + date
- [ ] Code markers: // BUG-348 in every modified file
- [ ] Compile: webpack 0 new warnings
```

---

## Credentials
- Test: `owner@18march.com / ***` (restaurant 478, preprod)
- Preview: `https://core-pos-deploy-12.preview.emergentagent.com`
