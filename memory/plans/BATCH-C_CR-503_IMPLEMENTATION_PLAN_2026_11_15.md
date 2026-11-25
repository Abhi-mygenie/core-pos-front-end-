# BATCH-C · CR-503 (Order Beta: Pay Later / Hold — Collect + Print Bill pop-up) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: HIGH (payment mutation — BILL_PAYMENT endpoint invoked from report context)
> Conflicts: OrderReportBetaPage.jsx — BUG-645 code (L81-88, L120, L131, L144, L497, L622) must stay intact. CR-515 (Batch A) may add rights gating later — owner said **no right check for now** (OD-503-05). CR-526 (Batch B, backend-blocked) on same page — different feature, no line overlap.
> Scope: **Hold + Credit (TAB) rows** — Collect button for unpaid rows. Paid TAB rows get no Collect (already settled).

## 1. What changes
Add a "Collect" button on unpaid Hold and Credit rows in Order Beta. Clicking opens CollectBillPanelDrawer (same as Audit page), which includes Print Bill inside the pop-up. After collection, the row is optimistically hidden and the report refetched.

## 2. Files changed

| # | File | Line at HEAD | What changes |
|---|------|-------------|--------------|
| E1 | `src/pages/reports-module/OrderReportBetaPage.jsx` | ~L4-22 (imports) | Add imports: `CollectBillPanelDrawer`, `getSingleOrderNew`/`orderFromAPI`, `printOrder` |
| E2 | same | ~L275 (state area) | Add `collectBillTarget`, `collectBillPending`, `optimisticCollectedBetaIds` state |
| E3 | same | ~L280+ (handlers) | Add: `openCollectBillDrawer`, `closeCollectBillDrawer`, `handleCollectSuccess`, `handlePrintBillFromBeta` |
| E4 | same | ~L706 (Actions column `<td>`) | Add "Collect" button for Hold/Credit unpaid rows |
| E5 | same | ~L780 (after last component before closing) | Render `<CollectBillPanelDrawer>` with props |
| E6 | `src/components/reports/CollectBillPanelDrawer.jsx` | L92 (component props) + L275 (`onPrintBill={null}`) | Accept `onPrintBill` prop and pass through instead of hardcoded `null` |

## 3. Exact edits

### E1 — OrderReportBetaPage.jsx imports (~L4-22)

Add at the import section:
```js
import CollectBillPanelDrawer from "../../components/reports/CollectBillPanelDrawer"; // CR-503
```

Add the print helper import (same pattern as AllOrdersReportPage):
```js
import { getSingleOrderNew, orderFromAPI } from "../../api/transforms/orderTransform"; // CR-503: for print
```
**Implementation note:** Verify the exact import paths by checking AllOrdersReportPage.jsx L25 and L845 patterns.

### E2 — OrderReportBetaPage.jsx state (~after L275)

```js
  // CR-503: Collect Bill for Hold/Credit rows
  const [collectBillTarget, setCollectBillTarget]             = useState(null);
  const [collectBillPending, setCollectBillPending]           = useState(false);
  const [optimisticCollectedBetaIds, setOptimisticCollectedBetaIds] = useState(() => new Set());
```

### E3 — OrderReportBetaPage.jsx handlers (~after state declarations)

```js
  // CR-503: Collect Bill handlers (mirrors AllOrdersReportPage pattern)
  const openCollectBillDrawer = useCallback((row) => {
    setCollectBillTarget(row);
  }, []);

  const closeCollectBillDrawer = useCallback(() => {
    if (!collectBillPending) setCollectBillTarget(null);
  }, [collectBillPending]);

  const handleCollectSuccess = useCallback(() => {
    if (collectBillTarget?.order_id) {
      setOptimisticCollectedBetaIds(prev => new Set(prev).add(collectBillTarget.order_id));
    }
    setCollectBillTarget(null);
    setCollectBillPending(false);
    // Refetch report data
    if (typeof fetchData === 'function') fetchData();
  }, [collectBillTarget, fetchData]);

  const handlePrintBillFromBeta = useCallback(async (row) => {
    // Mirror AllOrdersReportPage.handlePrintBillFromAudit pattern
    // Fetch full order detail, then call printOrder
    try {
      // Use existing print flow — implementer: verify the exact function from AllOrdersReportPage L845-870
    } catch (err) {
      toast?.({ title: 'Print failed', description: err.message || 'Could not print bill', variant: 'destructive' });
    }
  }, [toast]);
```

**Implementation note:** The `handlePrintBillFromBeta` must mirror the exact logic from `AllOrdersReportPage.handlePrintBillFromAudit` (L845-870). Copy-adapt that pattern. The `fetchData` function reference — verify the existing data-fetch function name in OrderReportBetaPage.

### E4 — OrderReportBetaPage.jsx Actions column (~L706 area)

Inside the `<td>` actions block, after the existing Pay Link button (L759-768), add:

```jsx
                                  {/* CR-503: Collect — Hold/Credit unpaid rows */}
                                  {((row.payment_method || '').toLowerCase() === 'paylater' || (row.payment_method || '').toUpperCase() === 'TAB') &&
                                   (row.payment_status || '').toLowerCase() !== 'paid' &&
                                   !optimisticCollectedBetaIds.has(row.order_id) && (
                                    <button
                                      onClick={() => openCollectBillDrawer(row)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors border-green-300 text-green-700 hover:bg-green-50 cursor-pointer"
                                      data-testid={`collect-btn-${row.order_id}`}
                                    >
                                      Collect
                                    </button>
                                  )}
```

**Row filter rule:**
- **Hold:** `payment_method === 'paylater'` AND `payment_status !== 'paid'`
- **Credit (TAB):** `payment_method === 'TAB'` AND `payment_status !== 'paid'`
- Already-paid rows (fos 6, status paid) → no Collect button
- Optimistically collected rows → hidden

### E5 — OrderReportBetaPage.jsx drawer render (~after the last dialog/modal, before closing `</main>` or similar)

```jsx
      {/* CR-503: Collect Bill Drawer */}
      {collectBillTarget && (
        <CollectBillPanelDrawer
          open={!!collectBillTarget}
          order={collectBillTarget}
          onClose={closeCollectBillDrawer}
          onCollectStart={() => setCollectBillPending(true)}
          onCollectSuccess={handleCollectSuccess}
          onCollectError={() => setCollectBillPending(false)}
          onPrintBill={handlePrintBillFromBeta}
        />
      )}
```

### E6 — CollectBillPanelDrawer.jsx L92 + L275

**Before (L92, component signature):**
```jsx
const CollectBillPanelDrawer = ({
```
Find the props destructuring. Add `onPrintBill` to it.

**Before (L275):**
```jsx
              onPrintBill={null}
```
**After:**
```jsx
              onPrintBill={onPrintBill ?? null} // CR-503: accept external print handler
```

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Order Beta → Hold tab → unpaid paylater row | "Collect" button visible |
| V2 | Click Collect → drawer opens | CollectBillPanelDrawer with payment options |
| V3 | Print Bill button visible inside drawer | Yes (wired via onPrintBill) |
| V4 | Collect payment (cash) → confirm | Row disappears (optimistic), refetch shows row moved to Settled |
| V5 | Credit tab → unpaid TAB row | "Collect" button visible |
| V6 | Already-paid TAB rows (fos 6, paid) | No Collect button |
| V7 | Already-paid paylater rows (fos 6, paid) | No Collect button |
| V8 | Audit page → Hold tab → Collect still works | Unchanged (regression) |
| V9 | Webpack compile | 0 new warnings |

## 5. Rebase note
- **CR-515 (Batch A)** may later add `order_unpaid` rights gating to this button. For now: no gate (OD-503-05). When CR-515 lands, add `canCollectPayLater` check around the Collect button.
- **BUG-645** code (L81-88, L120, L131, L144) — partial payment filter logic. Must NOT be modified. CR-503 adds new buttons in the Actions column, not new filter logic.
- **CR-526 (Batch B)** — credit management. Different feature, no line overlap.

## 6. Scope lock
**WILL change:** OrderReportBetaPage.jsx (imports, state, handlers, Actions column, drawer render — ~50-60 lines), CollectBillPanelDrawer.jsx (props + L275 — ~3 lines)
**WILL NOT touch:** AllOrdersReportPage (has its own collect flow), CollectPaymentPanel, reportService, reportTransform, paymentMutationService
