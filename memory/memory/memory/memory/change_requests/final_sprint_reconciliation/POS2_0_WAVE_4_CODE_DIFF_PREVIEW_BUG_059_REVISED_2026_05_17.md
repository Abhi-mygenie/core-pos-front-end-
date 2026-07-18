# POS2.0 Wave 4 Code Diff Preview — BUG-059 (Revised) — 2026-05-17

## 1. Purpose

Revised exact code-change preview for **BUG-059** (Audit Report Print Bill on Paid tab — new row-action), reflecting owner directives captured 2026-05-17:

- Add a **3rd pill** "Print" alongside existing "Change" + "Unpaid" on Paid-tab rows.
- **No permission gate** — Print pill renders on every Paid-tab row that passes the existing `isOrderEligibleForRowActions` filter.
- **Payload values come ONLY from the fetched single-order API record** — unlike the dashboard print path, the audit print does NOT pass any restaurant-context derivatives (no auto-SC %, no SC tax pct, no delivery GST pct).
- **Q1 default applied:** Paid branch always renders the action cell on eligible rows (so a print-only operator sees just the Print pill if they lack `update_payment` + `order_unpaid` perms). Tell me if you'd prefer to keep the original early-return gate.

**Supersedes** `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_2026_05_17.md` (initial revision).

**No source files modified yet.**

---

## 2. Touch Map

| # | File | Lines Touched | Net Change |
|---|------|---------------|------------|
| 1 | `frontend/src/components/reports/OrderTable.jsx` | L5 (import), L169 (column width), L329-330 (Paid branch early-return), L368 area (new Print pill) | +~17 / -2 |
| 2 | `frontend/src/pages/AllOrdersReportPage.jsx` | L11-12 (imports), L124 (useRestaurant adds `printerAgents`), new handler `handlePrintBillFromAudit` (~28 lines), L750-765 (actionsConfig wires `onPrintBill`) | +~32 |

Inherits BUG-050 + PRINT-002 fixes through the default branch of `buildBillPrintPayload` automatically.

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

#### Diff
```diff
-import { ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw, Receipt } from 'lucide-react';
+import { ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw, Receipt, Printer } from 'lucide-react';
```

### Change 3.2 — Widen Paid tab actions column

**Current (L164-171):**
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

**Proposed:**
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

#### Diff
```diff
     if (tabId === 'paid') {
     return [
       ...columnsWithPayment,
       // CR-003 — Wider actions cell to fit the two text+icon pills
       // ("Change" + "Unpaid") without overlapping the Amount column.
-      { id: 'actions', label: '', sortable: false, width: 'w-44', align: 'right' },
+      // BUG-059 (Wave 4, May-2026): widened from w-44 to w-56 to fit the
+      // third "Print" pill on Paid rows.
+      { id: 'actions', label: '', sortable: false, width: 'w-56', align: 'right' },
     ];
   }
```

### Change 3.3 — Destructure `onPrintBill` from `actionsConfig`

(No `canPrintBill` — owner directive: no permission gate.)

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

**Proposed:**
```javascript
  const {
    isWithinMutationWindow = false,
    canChangeMethod = false,
    canMarkUnpaid = false,
    onCollectBill,
    onChangeMethod,
    onMarkUnpaid,
    // BUG-059 (Wave 4, May-2026): per-row Print Bill on Paid tab.
    // Owner directive 2026-05-17: NO permission gate — rendered on every
    // row that passes `isOrderEligibleForRowActions`. Cancelled rows are
    // excluded by tab-level branching (no Print button in non-Paid branches).
    onPrintBill,
    // BUG-042-A (Feb-2026): when explicitly `false`, the Hold-tab Collect
    // button is rendered disabled with a tooltip explaining no eligible
    // primary payment method (Cash / Card / UPI) is configured. Defaults to
    // `undefined` for callers that don't surface the flag — preserves the
    // pre-BUG-042-A behaviour for any consumer that hasn't been updated.
    hasEligibleHoldPaymentMethod,
  } = actionsConfig;
```

#### Diff
```diff
   const {
     isWithinMutationWindow = false,
     canChangeMethod = false,
     canMarkUnpaid = false,
     onCollectBill,
     onChangeMethod,
     onMarkUnpaid,
+    // BUG-059 (Wave 4, May-2026): per-row Print Bill on Paid tab.
+    // Owner directive 2026-05-17: NO permission gate — rendered on every
+    // row that passes `isOrderEligibleForRowActions`. Cancelled rows are
+    // excluded by tab-level branching (no Print button in non-Paid branches).
+    onPrintBill,
     // BUG-042-A (Feb-2026): when explicitly `false`, the Hold-tab Collect
     // button is rendered disabled with a tooltip explaining no eligible
     // primary payment method (Cash / Card / UPI) is configured. Defaults to
     // `undefined` for callers that don't surface the flag — preserves the
     // pre-BUG-042-A behaviour for any consumer that hasn't been updated.
     hasEligibleHoldPaymentMethod,
   } = actionsConfig;
```

### Change 3.4 — Paid branch: drop early-return + add unconditional Print pill

**Q1 default applied** — print-only operators see just the Print pill.

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

**Proposed:**
```javascript
  // Paid tab → Change Method + Mark Unpaid + Print Bill (BUG-059).
  if (tabId === 'paid') {
    // BUG-059 (Wave 4, May-2026, Owner directive 2026-05-17):
    // Print Bill renders unconditionally on eligible Paid rows. Early-return
    // dropped so print-only operators (without `update_payment` /
    // `order_unpaid` perms) still see the Print pill alone.
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
        {/* BUG-059 (Wave 4, May-2026): Print Bill row action on Paid tab.
            Owner-approved gating (revised 2026-05-17): NO permission gate.
            NOT date-restricted (printing is read-only — not a financial
            mutation). No print on Cancelled tab (handled by branch above). */}
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
      </div>
    );
  }
```

#### Diff
```diff
-  // Paid tab → Change Method + Mark Unpaid.
+  // Paid tab → Change Method + Mark Unpaid + Print Bill (BUG-059).
   if (tabId === 'paid') {
-    if (!canChangeMethod && !canMarkUnpaid) return null;
+    // BUG-059 (Wave 4, May-2026, Owner directive 2026-05-17):
+    // Print Bill renders unconditionally on eligible Paid rows. Early-return
+    // dropped so print-only operators (without `update_payment` /
+    // `order_unpaid` perms) still see the Print pill alone.
     const currentMethod = (order.paymentMethod || '').toLowerCase();
     ...
         )}
+        {/* BUG-059 (Wave 4, May-2026): Print Bill row action on Paid tab.
+            Owner-approved gating (revised 2026-05-17): NO permission gate.
+            NOT date-restricted (printing is read-only — not a financial
+            mutation). No print on Cancelled tab (handled by branch above). */}
+        <button
+          type="button"
+          onClick={(e) => {
+            stop(e);
+            onPrintBill?.(order);
+          }}
+          title="Print bill"
+          data-testid={`row-action-print-bill-${order.id}`}
+          className="
+            inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
+            border-orange-300 text-orange-700 hover:bg-orange-50 cursor-pointer
+          "
+        >
+          <Printer className="w-3.5 h-3.5" />
+          <span>Print</span>
+        </button>
       </div>
     );
   }
```

---

## 4. File 2 — `frontend/src/pages/AllOrdersReportPage.jsx`

### Change 4.1 — Imports

**Current (L11-12):**
```javascript
import { getOrderLogsReport, getActiveSrmIds } from "../api/services/reportService";
import { getRunningOrders } from "../api/services/orderService";
```

**Proposed:**
```javascript
import { getOrderLogsReport, getActiveSrmIds, getSingleOrderNew } from "../api/services/reportService";
import { getRunningOrders, printOrder } from "../api/services/orderService";
```

#### Diff
```diff
-import { getOrderLogsReport, getActiveSrmIds } from "../api/services/reportService";
-import { getRunningOrders } from "../api/services/orderService";
+import { getOrderLogsReport, getActiveSrmIds, getSingleOrderNew } from "../api/services/reportService";
+import { getRunningOrders, printOrder } from "../api/services/orderService";
```

### Change 4.2 — Pull `printerAgents` from `useRestaurant`

`printerAgents` is the WebSocket routing list — NOT a payload money value. Required by `printOrder`'s 7th arg.

**Current (L124):**
```javascript
  const { restaurant, paymentTypes: restaurantPaymentTypes } = useRestaurant();
```

**Proposed:**
```javascript
  const { restaurant, paymentTypes: restaurantPaymentTypes, printerAgents } = useRestaurant();
```

#### Diff
```diff
-  const { restaurant, paymentTypes: restaurantPaymentTypes } = useRestaurant();
+  const { restaurant, paymentTypes: restaurantPaymentTypes, printerAgents } = useRestaurant();
```

### Change 4.3 — Add `handlePrintBillFromAudit` handler

Insert just before `actionsConfig` (i.e., right after `handleCollectError` ends at L748):

```javascript
  // BUG-059 (Wave 4, May-2026): Print Bill from Audit Report (Paid tab).
  //
  // Flow:
  //   1. Fetch the full single-order detail via `getSingleOrderNew` (same
  //      endpoint OrderDetailSheet uses) so we have `rawOrderDetails` for
  //      the print payload.
  //   2. Call `printOrder` with NO restaurant-context-derived overrides.
  //      Owner directive 2026-05-17: payload values come ONLY from the
  //      fetched single-order API record. Unlike the dashboard print path
  //      (which passes auto-SC %, SC tax pct, delivery GST pct from
  //      `restaurant`), the audit print trusts the persisted order — the
  //      default branch of `buildBillPrintPayload` reads `order.serviceTax`,
  //      `order.discount`, `order.amount`, etc. directly.
  //   3. Toast success / failure; no optimistic state changes (print is
  //      read-only).
  //
  // Owner directive 2026-05-17: NO permission gate.
  // Q-P4-PRINT-03c: cancelled rows excluded by OrderTable branch (this
  // handler is only reachable from Paid-tab buttons).
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
      // No restaurant-context overrides — order's persisted values flow
      // through the default branch unchanged.
      await printOrder(row.id, 'bill', null, order, 0, {}, printerAgents || []);
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
  }, [printerAgents, toast]);
```

### Change 4.4 — Wire `onPrintBill` into `actionsConfig`

(No `canPrintBill` — owner directive: no permission gate.)

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
        pendingChangeMethodIds,
        onCollectBill: openCollectBillDrawer,
        onChangeMethod: handleChangeMethod,
        onMarkUnpaid: openMarkUnpaidDialog,
        // BUG-059 (Wave 4, May-2026, Owner directive 2026-05-17):
        // expose Print Bill handler to OrderTable so the Paid tab renders
        // a "Print" row action. NO permission gate (owner directive).
        // Hold-tab eligibility branch ignores it.
        onPrintBill: handlePrintBillFromAudit,
        // BUG-042-A (Feb-2026): Hold-tab Collect Bill must surface only
        // primary methods (Cash / Card / UPI). When none of those is
        // configured for the restaurant, the row-level Collect Bill button
        // is disabled with a clear tooltip (see OrderTable.renderActionsCell).
        hasEligibleHoldPaymentMethod,
      }
    : null;
```

#### Diff
```diff
   const actionsConfig = (activeTab === 'paid' || activeTab === 'hold')
     ? {
         isWithinMutationWindow,
         canChangeMethod,
         canMarkUnpaid,
         pendingChangeMethodIds,
         onCollectBill: openCollectBillDrawer,
         onChangeMethod: handleChangeMethod,
         onMarkUnpaid: openMarkUnpaidDialog,
+        // BUG-059 (Wave 4, May-2026, Owner directive 2026-05-17):
+        // expose Print Bill handler to OrderTable so the Paid tab renders
+        // a "Print" row action. NO permission gate (owner directive).
+        // Hold-tab eligibility branch ignores it.
+        onPrintBill: handlePrintBillFromAudit,
         // BUG-042-A (Feb-2026): Hold-tab Collect Bill must surface only
         // primary methods (Cash / Card / UPI). When none of those is
         // configured for the restaurant, the row-level Collect Bill button
         // is disabled with a clear tooltip (see OrderTable.renderActionsCell).
         hasEligibleHoldPaymentMethod,
       }
     : null;
```

---

## 5. Net size

| File | Insertions | Deletions |
|------|-----------:|----------:|
| `OrderTable.jsx` | ~30 | ~3 |
| `AllOrdersReportPage.jsx` | ~38 | ~3 |
| **Total** | **~68** | **~6** |

---

## 6. Files NOT Touched

- `components/reports/OrderDetailSheet.jsx` — owner spec is row action, not sheet header.
- `components/reports/CollectBillPanelDrawer.jsx` — already passes `onPrintBill={null}` for Hold; unchanged.
- `api/transforms/orderTransform.js` — default branch reused as-is (BUG-050 + PRINT-002 fixes already landed).
- `OrderCard.jsx`, `TableCard.jsx`, `RePrintButton.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx` — no call-site changes.
- `paymentMutationService.js` — not used (print is not a payment mutation).

---

## 7. Eligibility / Row Filtering (No New Logic Needed)

The existing `isOrderEligibleForRowActions` at OrderTable.jsx L245-262 still covers all owner exclusions:

| Owner Spec | Existing Filter | Status |
|---|---|---|
| No cancelled rows | Cancelled tab does not match `tabId === 'paid'` branch → no Print button | ✅ |
| No Room / SRM rows | `orderIn === 'RM' \|\| 'SRM'` → return false | ✅ |
| No aggregator rows | `['zomato','swiggy'].includes(...)` → return false | ✅ |
| No `transferToRoom` / TAB / online | `PAID_ACTIONS_ALLOWED_METHODS = cash/card/upi only` | ✅ |
| Missing/placeholder rows | `if (order._isMissing) return false` | ✅ |

No new exclusion logic required.

---

## 8. Tests Impact

| Test File | Will It Break? | Why |
|---|---|---|
| `OrderTable.holdDisable.test.jsx` (Hold-tab Collect button) | **No** | Hold branch unchanged. |
| Paid-tab snapshots | **None exist** | No snapshot tests in `__tests__/components/reports/` cover Paid actions. |
| All transform / service tests | **No** | Untouched. |

Expected post-apply: **498/498 passed** (same count as the PRINT-002 corrective patch).

---

## 9. Validation Plan (Post-Implementation)

1. ESLint on both files — clean.
2. `yarn test --watchAll=false` — full suite passes (498/498).
3. Webpack hot-reload — green.
4. **Owner smoke**:
   - Audit Report → Paid tab → Cash/Card/UPI row → **orange "Print" pill visible on every row** → click → bill prints → totals match the persisted single-order record (BUG-050 + PRINT-002 cascades apply).
   - Audit Report → Cancelled tab → no Print pill anywhere.
   - Audit Report → Hold tab → no Print pill (Collect remains).
   - Aggregator / Room / `transferToRoom` rows on Paid tab → no Print pill (filtered).
   - Date outside 2-day window → Print pill **enabled** (not a mutation; Change / Unpaid pills remain disabled with their existing tooltip).
   - Operator with no `update_payment` / `order_unpaid` perms → sees just the Print pill on Paid rows (Q1 default).

---

## 10. Risks / Notes

- **Column width `w-44` → `w-56`** reduces Amount-column slack on Paid tab. Fits comfortably at desktop widths (≥1280 px). Tell me if you'd prefer `w-52` or an icon-only Print pill (no label) — easy single-line tweak.
- **`getSingleOrderNew` adds one extra API roundtrip per Print click.** Same pattern used by OrderDetailSheet — well-tested. No caching layer added (read-only, infrequent action).
- **No new Jest test** added for the new Paid-tab Print pill. Owner-driven smoke is the validation path. Tell me if you'd like a render-level test before applying.

---

## 11. Approval Required

- **A.** Approve this exact revised diff → apply both file edits (Gate 8), `yarn test`, smoke, report back. **Completes Wave 4.**
- **B.** Modify (e.g., flip Q1 to keep early-return / icon-only pill / `w-52` column / add a render test). Tell me what to change and I'll regen this preview.
- **C.** Stop / skip BUG-059.

Reply **A / B / C**.

---

*— End of Wave 4 Code Diff Preview — BUG-059 (Revised) —*
