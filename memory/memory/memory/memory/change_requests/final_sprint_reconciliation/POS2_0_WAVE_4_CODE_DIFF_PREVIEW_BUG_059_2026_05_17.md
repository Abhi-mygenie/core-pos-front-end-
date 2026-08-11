# POS2.0 Wave 4 Code Diff Preview — BUG-059 Bucket — 2026-05-17

## 1. Purpose

Exact code-change preview for **BUG-059 only** (Audit Report Print Bill on Paid tab — new row-action). Owner-approved options A + C + C from Phase 4 capture:

- Q-P4-PRINT-03a: **Paid orders only** (A)
- Q-P4-PRINT-03b: **Same as current order permissions** — `print_icon` (C)
- Q-P4-PRINT-03c: **No print on cancelled** (C)

**No source files have been modified yet.**

---

## 2. Touch Map

| # | File | Lines Touched | Net Change |
|---|------|---------------|------------|
| 1 | `frontend/src/components/reports/OrderTable.jsx` | L5 (import), L169 (column width), L273-286 (destructure), L329-330 (Paid early-return), inside Paid branch (new button) | +~25 / -2 |
| 2 | `frontend/src/pages/AllOrdersReportPage.jsx` | L11-12 (imports), L124 (useRestaurant adds `printerAgents`), L547-548 area (new `canPrintBill`), new handler `handlePrintBillFromAudit` (~30 lines), L750-765 (actionsConfig wires `canPrintBill` + `onPrintBill`) | +~50 |

Inherits BUG-050 parity fix: the new audit print path calls `printOrder(orderId, 'bill', null, order, ...)` exactly like the dashboard cards do — so the `discount_amount` cascade from BUG-050 applies automatically.

---

## 3. File 1 — `frontend/src/components/reports/OrderTable.jsx`

### Change 3.1 — Import `Printer` icon

**Current (L5):**
```javascript
import { ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw, Receipt } from 'lucide-react';
```

**Proposed (L5):**
```javascript
import { ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw, Receipt, Printer } from 'lucide-react';
```

### Change 3.2 — Widen Paid tab actions column

**Current (L165-170):**
```javascript
  if (tabId === 'paid') {
    return [
      ...columnsWithPayment,
      // CR-003 — Wider actions cell to fit the two text+icon pills
      // ("Change" + "Unpaid") without overlapping the Amount column.
      { id: 'actions', label: '', sortable: false, width: 'w-44', align: 'right' },
    ];
  }
```

**Proposed (L165-171):**
```javascript
  if (tabId === 'paid') {
    return [
      ...columnsWithPayment,
      // CR-003 — Wider actions cell to fit the two text+icon pills
      // ("Change" + "Unpaid") without overlapping the Amount column.
      // BUG-059 (Wave 4, May-2026): widened from w-44 to w-56 to fit the
      // third "Print" pill on Paid rows.
      { id: 'actions', label: '', sortable: false, width: 'w-56', align: 'right' },
    ];
  }
```

### Change 3.3 — Destructure `canPrintBill` + `onPrintBill` from `actionsConfig`

**Current (L273-286):**
```javascript
  const {
    isWithinMutationWindow = false,
    canChangeMethod = false,
    canMarkUnpaid = false,
    onCollectBill,
    onChangeMethod,
    onMarkUnpaid,
    // BUG-042-A (Feb-2026): when explicitly `false`, the Hold-tab Collect
    // button is rendered disabled with a tooltip explaining no eligible
    // primary payment method (Cash / Card / UPI) is configured. Defaults to
    // `undefined` for callers that don't surface the flag — preserves the
    // pre-BUG-042-A behaviour for any consumer that hasn't been updated.
    hasEligibleHoldPaymentMethod,
  } = actionsConfig;
```

**Proposed (L273-288):**
```javascript
  const {
    isWithinMutationWindow = false,
    canChangeMethod = false,
    canMarkUnpaid = false,
    // BUG-059 (Wave 4, May-2026): per-row Print Bill on Paid tab. Gated by
    // `print_icon` permission. NOT bound to the mutation window — printing
    // is not a financial mutation. Cancelled rows are excluded by the
    // tab-level branching below (no Print button in non-Paid branches).
    canPrintBill = false,
    onCollectBill,
    onChangeMethod,
    onMarkUnpaid,
    onPrintBill,
    // BUG-042-A (Feb-2026): when explicitly `false`, the Hold-tab Collect
    // button is rendered disabled with a tooltip explaining no eligible
    // primary payment method (Cash / Card / UPI) is configured. Defaults to
    // `undefined` for callers that don't surface the flag — preserves the
    // pre-BUG-042-A behaviour for any consumer that hasn't been updated.
    hasEligibleHoldPaymentMethod,
  } = actionsConfig;
```

### Change 3.4 — Paid branch: relax early-return + add Print Bill button

**Current (L328-369):**
```javascript
  // Paid tab → Change Method + Mark Unpaid.
  if (tabId === 'paid') {
    if (!canChangeMethod && !canMarkUnpaid) return null;
    const currentMethod = (order.paymentMethod || '').toLowerCase();
    const pendingChangeMethod = !!actionsConfig.pendingChangeMethodIds?.has?.(order.id);
    return (
      <div className="flex items-center justify-end gap-1.5">
        {canChangeMethod && (
          <PaymentMethodPicker
            order={order}
            currentMethod={currentMethod}
            disabled={!isWithinMutationWindow}
            isPending={pendingChangeMethod}
            disabledTitle={disabledTitle}
            onConfirm={(newMethod) => onChangeMethod?.(order, newMethod)}
          />
        )}
        {canMarkUnpaid && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              if (!isWithinMutationWindow) return;
              onMarkUnpaid?.(order);
            }}
            disabled={!isWithinMutationWindow}
            title={isWithinMutationWindow ? 'Mark as unpaid' : disabledTitle}
            data-testid={`row-action-mark-unpaid-${order.id}`}
            className={`
              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
              ${isWithinMutationWindow
                ? 'border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer'
                : 'border-zinc-200 text-zinc-400 cursor-not-allowed'}
            `}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Unpaid</span>
          </button>
        )}
      </div>
    );
  }
```

**Proposed (L328-379):**
```javascript
  // Paid tab → Change Method + Mark Unpaid + Print Bill (BUG-059).
  if (tabId === 'paid') {
    // BUG-059 (Wave 4, May-2026): also surface the action cell when the
    // user only has `print_icon`, so Print Bill stays reachable for
    // print-only roles.
    if (!canChangeMethod && !canMarkUnpaid && !canPrintBill) return null;
    const currentMethod = (order.paymentMethod || '').toLowerCase();
    const pendingChangeMethod = !!actionsConfig.pendingChangeMethodIds?.has?.(order.id);
    return (
      <div className="flex items-center justify-end gap-1.5">
        {canChangeMethod && (
          <PaymentMethodPicker
            order={order}
            currentMethod={currentMethod}
            disabled={!isWithinMutationWindow}
            isPending={pendingChangeMethod}
            disabledTitle={disabledTitle}
            onConfirm={(newMethod) => onChangeMethod?.(order, newMethod)}
          />
        )}
        {canMarkUnpaid && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              if (!isWithinMutationWindow) return;
              onMarkUnpaid?.(order);
            }}
            disabled={!isWithinMutationWindow}
            title={isWithinMutationWindow ? 'Mark as unpaid' : disabledTitle}
            data-testid={`row-action-mark-unpaid-${order.id}`}
            className={`
              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
              ${isWithinMutationWindow
                ? 'border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer'
                : 'border-zinc-200 text-zinc-400 cursor-not-allowed'}
            `}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Unpaid</span>
          </button>
        )}
        {canPrintBill && (
          // BUG-059 (Wave 4, May-2026): Print Bill row action on Paid tab.
          // Owner-approved gating (Phase 4): `print_icon` permission only;
          // NOT date-restricted (printing is read-only — not a financial
          // mutation). No print on Cancelled tab (handled by branch above).
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onPrintBill?.(order);
            }}
            title="Print bill"
            data-testid={`row-action-print-bill-${order.id}`}
            className="
              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
              border-orange-300 text-orange-700 hover:bg-orange-50 cursor-pointer
            "
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        )}
      </div>
    );
  }
```

---

## 4. File 2 — `frontend/src/pages/AllOrdersReportPage.jsx`

### Change 4.1 — Imports

**Current (L1-20):**
```javascript
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import DatePicker from "../components/reports/DatePicker";
import OrderTable from "../components/reports/OrderTable";
import FilterBar from "../components/reports/FilterBar";
import FilterTags from "../components/reports/FilterTags";
import OrderDetailSheet from "../components/reports/OrderDetailSheet";
import ExportButtons from "../components/reports/ExportButtons";
import { getOrderLogsReport, getActiveSrmIds } from "../api/services/reportService";
import { getRunningOrders } from "../api/services/orderService";
import { changeOrderPaymentMethod, makeOrderUnpaid } from "../api/services/paymentMutationService";
import { calculateSummary } from "../api/transforms/reportTransform";
import { useRestaurant } from "../contexts";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { getBusinessDayRange, isWithinBusinessDay, isMutationAllowedForSelectedDate } from "../utils/businessDay";
import MarkUnpaidConfirmDialog from "../components/reports/MarkUnpaidConfirmDialog";
import CollectBillPanelDrawer from "../components/reports/CollectBillPanelDrawer";
```

**Proposed:** add `getSingleOrderNew` to the `reportService` import and `printOrder` to the `orderService` import.

```javascript
import { getOrderLogsReport, getActiveSrmIds, getSingleOrderNew } from "../api/services/reportService";
import { getRunningOrders, printOrder } from "../api/services/orderService";
```

### Change 4.2 — Pull `printerAgents` from `useRestaurant`

**Current (L124):**
```javascript
  const { restaurant, paymentTypes: restaurantPaymentTypes } = useRestaurant();
```

**Proposed:**
```javascript
  const { restaurant, paymentTypes: restaurantPaymentTypes, printerAgents } = useRestaurant();
```

### Change 4.3 — Add `canPrintBill` permission flag

**Current (L546-548):**
```javascript
  const isWithinMutationWindow = isMutationAllowedForSelectedDate(selectedDate);
  const canChangeMethod = hasPermission?.('update_payment') ?? false;
  const canMarkUnpaid = hasPermission?.('order_unpaid') ?? false;
```

**Proposed:**
```javascript
  const isWithinMutationWindow = isMutationAllowedForSelectedDate(selectedDate);
  const canChangeMethod = hasPermission?.('update_payment') ?? false;
  const canMarkUnpaid = hasPermission?.('order_unpaid') ?? false;
  // BUG-059 (Wave 4, May-2026): print-bill row action on Audit Report Paid
  // tab uses the same `print_icon` permission as the dashboard print icons
  // (Q-P4-PRINT-03b: "same as current order permissions").
  const canPrintBill = hasPermission?.('print_icon') ?? false;
```

### Change 4.4 — Add `handlePrintBillFromAudit` handler

Insert just before `actionsConfig` (i.e., right after `handleCollectError` ends at L748):

```javascript
  // BUG-059 (Wave 4, May-2026): Print Bill from Audit Report (Paid tab).
  //
  // Flow:
  //   1. Fetch the full single-order detail via `getSingleOrderNew` (same
  //      endpoint OrderDetailSheet uses) so we have `rawOrderDetails` for
  //      the print payload.
  //   2. Call `printOrder` with the dashboard-style override shape: pass
  //      `serviceChargePercentage` (auto-aware) + SC/Delivery GST pct so
  //      the default branch of `buildBillPrintPayload` produces a bill
  //      that matches Collect Bill (BUG-050 cascades `order.discount`
  //      automatically when present).
  //   3. Toast success / failure; no optimistic state changes (print is
  //      read-only).
  //
  // Q-P4-PRINT-03b: `print_icon` permission only — no extra role gating.
  // Q-P4-PRINT-03c: cancelled rows are filtered out at the OrderTable
  // branch level (this handler is only reachable from Paid-tab buttons).
  const handlePrintBillFromAudit = useCallback(async (row) => {
    if (!row?.id) return;
    try {
      const order = await getSingleOrderNew(row.id);
      if (!order || !order.rawOrderDetails) {
        toast({
          title: 'Cannot print bill',
          description: 'Order details unavailable',
          variant: 'destructive',
        });
        return;
      }
      const scPctForPrint = restaurant?.autoServiceCharge
        ? (restaurant?.serviceChargePercentage || 0)
        : 0;
      await printOrder(
        row.id,
        'bill',
        null,
        order,
        scPctForPrint,
        {
          serviceChargeTaxPct: restaurant?.serviceChargeTaxPct || 0,
          deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
        },
        printerAgents || []
      );
      toast({
        title: 'Bill request sent',
        description: `Order #${row.orderId || row.id}`,
      });
    } catch (err) {
      console.error('[AuditPrintBill] error:', err);
      toast({
        title: 'Failed to send Bill request',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [restaurant, printerAgents, toast]);
```

### Change 4.5 — Wire `canPrintBill` + `onPrintBill` into `actionsConfig`

**Current (L750-765):**
```javascript
  const actionsConfig = (activeTab === 'paid' || activeTab === 'hold')
    ? {
        isWithinMutationWindow,
        canChangeMethod,
        canMarkUnpaid,
        pendingChangeMethodIds,
        onCollectBill: openCollectBillDrawer,
        onChangeMethod: handleChangeMethod,
        onMarkUnpaid: openMarkUnpaidDialog,
        // BUG-042-A (Feb-2026): Hold-tab Collect Bill must surface only
        // primary methods (Cash / Card / UPI). When none of those is
        // configured for the restaurant, the row-level Collect Bill button
        // is disabled with a clear tooltip (see OrderTable.renderActionsCell).
        hasEligibleHoldPaymentMethod,
      }
    : null;
```

**Proposed:**
```javascript
  const actionsConfig = (activeTab === 'paid' || activeTab === 'hold')
    ? {
        isWithinMutationWindow,
        canChangeMethod,
        canMarkUnpaid,
        // BUG-059 (Wave 4, May-2026): expose `print_icon` permission +
        // handler to OrderTable so the Paid tab renders a "Print" row
        // action. Hold-tab eligibility branch ignores both.
        canPrintBill,
        pendingChangeMethodIds,
        onCollectBill: openCollectBillDrawer,
        onChangeMethod: handleChangeMethod,
        onMarkUnpaid: openMarkUnpaidDialog,
        onPrintBill: handlePrintBillFromAudit,
        // BUG-042-A (Feb-2026): Hold-tab Collect Bill must surface only
        // primary methods (Cash / Card / UPI). When none of those is
        // configured for the restaurant, the row-level Collect Bill button
        // is disabled with a clear tooltip (see OrderTable.renderActionsCell).
        hasEligibleHoldPaymentMethod,
      }
    : null;
```

---

## 5. Files NOT Touched

- `components/reports/OrderDetailSheet.jsx` — Owner spec (Phase 4 Q-P4-PRINT-03 cluster) is **row action**, not sheet action. Not in scope.
- `components/reports/CollectBillPanelDrawer.jsx` — already passes `onPrintBill={null}` for the Hold settle flow; unchanged.
- All `api/transforms/orderTransform.js` from BUG-050 — print payload reuses the now-corrected default branch automatically.
- `OrderCard.jsx`, `TableCard.jsx`, `RePrintButton.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx` — no call-site changes.
- `paymentMutationService.js` — not used (this is a print, not a payment mutation).

---

## 6. Eligibility / Row Filtering (No New Logic Needed)

The existing `isOrderEligibleForRowActions` at OrderTable.jsx L245-262 already covers BUG-059's requirements:

| Owner Spec | Existing Filter | Status |
|---|---|---|
| No cancelled rows | Cancelled tab does not match `tabId === 'paid'` branch → no Print button | ✅ |
| No Room/SRM rows | `orderIn === 'RM' \|\| 'SRM'` → return false | ✅ |
| No aggregator rows | `['zomato','swiggy'].includes(...)` → return false | ✅ |
| No `transferToRoom` / TAB / online | PAID_ACTIONS_ALLOWED_METHODS = cash/card/upi only | ✅ |
| Missing/placeholder rows | `if (order._isMissing) return false` | ✅ |

No new exclusion logic required.

---

## 7. Tests Impact

| Test File | Will It Break? | Why |
|---|---|---|
| `OrderTable.holdDisable.test.jsx` (Hold tab Collect button) | **No** | Hold branch unchanged; Paid branch is independent. |
| Any test that snapshots Paid-tab actions cell | **Potentially** if a snapshot exists. | Will inspect when running `yarn test`; the only test in `__tests__/components/reports/` is `OrderTable.holdDisable.test.jsx` (Hold-only). No Paid-tab snapshot present. |
| All transform / service tests | **No** | Untouched files. |

I will run `yarn test` after applying.

---

## 8. Validation Plan (Post-Implementation)

1. ESLint on both files — clean.
2. `yarn test` — full suite pass.
3. Webpack compile — green.
4. Manual smoke (owner-driven):
   - Audit Report → Paid tab → row paid by Cash/Card/UPI → "Print" pill visible → click → bill prints → totals match Collect Bill (BUG-050 cascade).
   - Audit Report → Cancelled tab → no Print pill anywhere.
   - Audit Report → Hold tab → no Print pill (Collect remains).
   - Aggregator / Room row on Paid tab → no Print pill.
   - Permission OFF (`print_icon`) → Print pill hidden; other Paid actions still visible if those perms present.
   - Date outside 2-day window → Print pill **enabled** (not a mutation).

---

## 9. Approval Required

- **A.** Approve this exact diff → apply both file edits (Gate 8), `yarn test`, smoke, report back. This completes Wave 4.
- **B.** Modify (tell me what to change — e.g., also surface Print Bill in OrderDetailSheet header; reuse a different orange shade; change column width to w-52 instead; etc.).
- **C.** Stop / skip BUG-059.

Reply A / B / C.

---

*— End of Wave 4 Code Diff Preview — BUG-059 Bucket —*
