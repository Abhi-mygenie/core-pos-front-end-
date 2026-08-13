# CR-118 — Implementation Plan (Gate 3)

**ID:** CR-118  
**Stage:** Implementation Plan  
**Impact Analysis:** `/app/memory/impact/CR-118_IMPACT_ANALYSIS.md` (v3)  
**Code Reality:** NONE  
**Risk:** MEDIUM  
**Date:** 2026-07-31  

---

## Scope Lock

### Files WILL change:
1. `api/transforms/aggregatorTransform.js`
2. `api/transforms/profileTransform.js`
3. `api/constants.js`
4. `api/services/aggregatorService.js`
5. `components/dashboard/AggregatorOrderPopOut.jsx`
6. `components/cards/OrderCard.jsx`
7. `components/cards/TableCard.jsx`

### Files will NOT touch:
- `orderTransform.js`, `printerAgentSelector.js`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `RePrintButton.jsx`, `AllOrdersReportPage.jsx`, `socketHandlers.js`, `DashboardPage.jsx`

---

## Execution Sequence

Edits must be applied in this order (dependency chain):

```
Edit 1 (aggregatorTransform.js) — new field
Edit 2 (profileTransform.js) — new setting
Edit 3 (constants.js) — new endpoint         ← can parallel with 1, 2
Edit 4 (aggregatorService.js) — new function  ← depends on 3
Edit 5 (AggregatorOrderPopOut.jsx) — checkboxes + print-on-accept  ← depends on 2, 4
Edit 6 (OrderCard.jsx) — fix KOT, add Bill, fix ID, rename label  ← depends on 1, 4
Edit 7 (TableCard.jsx) — add KOT+Bill, fix display, rename label  ← depends on 1, 4
```

Batch 1 (parallel): Edits 1, 2, 3  
Batch 2: Edit 4  
Batch 3 (parallel): Edits 5, 6, 7  
Compile check after each batch.

---

## Edit 1 — aggregatorTransform.js: Map `aggrigator_id` + fix display

**File:** `/app/frontend/src/api/transforms/aggregatorTransform.js`

### Edit 1a — Add `aggrId` field (after line 28)

**Current (lines 27-29):**
```javascript
      orderId: od.id,
      urbanOrderId: String(od.urban_order_id || ''),
      orderNumber: od.restaurant_order_id || '',
```

**New (lines 27-30):**
```javascript
      orderId: od.id,
      urbanOrderId: String(od.urban_order_id || ''),
      aggrId: String(od.aggrigator_id || ''), // CR-118: actual Swiggy/Zomato order ID for display + print
      orderNumber: od.restaurant_order_id || '',
```

### Edit 1b — Fix `customer` display label (line 70)

**Current (line 70):**
```javascript
      customer: od.restaurant_order_id ? `#${od.restaurant_order_id.split('/').pop()}` : (cust.name || od.user_name || 'DEL'), // CR-106: display label for TableCard (e.g. "#002327")
```

**New (line 70):**
```javascript
      customer: od.aggrigator_id ? `#${od.aggrigator_id}` : (cust.name || od.user_name || 'DEL'), // CR-118: display actual aggregator ID on TableCard
```

**Verify:** `grep 'aggrId' aggregatorTransform.js` returns the new line. `grep 'aggrigator_id' aggregatorTransform.js` returns 2 hits (aggrId mapping + customer label).

---

## Edit 2 — profileTransform.js: Map `aggregator_auto_bill` + `aggregator_auto_bill_stage`

**File:** `/app/frontend/src/api/transforms/profileTransform.js`

### Edit 2a — Add `aggregatorAutoBill` + `aggregatorAutoBillStage` (after line 335)

**Current (line 335):**
```javascript
      aggregatorAutoKot: toBoolean(apiSettings.aggregator_auto_kot),
```

**New (lines 335-339):**
```javascript
      aggregatorAutoKot: toBoolean(apiSettings.aggregator_auto_kot),
      // CR-118: aggregator auto bill print + stage (Acknowledged or Ready)
      aggregatorAutoBill: toBoolean(apiSettings.aggregator_auto_bill),
      aggregatorAutoBillStage: (apiSettings.aggregator_auto_bill_stage || 'Ready').toLowerCase(), // 'acknowledged' | 'ready'
```

**Verify:** `grep 'aggregatorAutoBill' profileTransform.js` returns 2 hits (bool + stage).

---

## Edit 3 — constants.js: Add `MANUALLY_PRINT` endpoint

**File:** `/app/frontend/src/api/constants.js`

### Edit 3a — Add to AGGREGATOR_ENDPOINTS (after line 465)

**Current (lines 463-466):**
```javascript
export const AGGREGATOR_ENDPOINTS = {
  ORDER_LIST: '/api/v1/vendoremployee/urbanpiper/get-order-list',
  ORDER_STATUS_UPDATE: '/api/v1/urbanpiper/orders-status-update',
};
```

**New:**
```javascript
export const AGGREGATOR_ENDPOINTS = {
  ORDER_LIST: '/api/v1/vendoremployee/urbanpiper/get-order-list',
  ORDER_STATUS_UPDATE: '/api/v1/urbanpiper/orders-status-update',
  MANUALLY_PRINT: '/api/v1/urbanpiper/manually-print-aggregator', // CR-118: manual KOT/bill print
};
```

**Verify:** `grep 'MANUALLY_PRINT' constants.js` returns the new line.

---

## Edit 4 — aggregatorService.js: Add `manuallyPrintAggregator` function

**File:** `/app/frontend/src/api/services/aggregatorService.js`

### Edit 4a — Append new function after existing code (after line 16)

**Append:**
```javascript

// CR-118: Manual KOT/Bill print for aggregator orders
export async function manuallyPrintAggregator(aggrOrderId, aggrOrderType) {
  const res = await api.post(AGGREGATOR_ENDPOINTS.MANUALLY_PRINT, {
    aggr_order_id: String(aggrOrderId),
    aggr_order_type: aggrOrderType, // 'aggr_kot' | 'aggr_bill'
  });
  return res.data;
}
```

**Verify:** `grep 'manuallyPrintAggregator' aggregatorService.js` returns 1 hit.

---

## Edit 5 — AggregatorOrderPopOut.jsx: KOT/Bill checkboxes + print on accept

**File:** `/app/frontend/src/components/dashboard/AggregatorOrderPopOut.jsx`

### Edit 5a — Add import for aggregator print service (after line 11)

**Current (line 11):**
```javascript
import { computeAggregatorPrepTime } from '../../utils/aggregatorPrepTime'; // CR-109
```

**New:**
```javascript
import { computeAggregatorPrepTime } from '../../utils/aggregatorPrepTime'; // CR-109
import { manuallyPrintAggregator } from '../../api/services/aggregatorService'; // CR-118
```

### Edit 5b — Add checkbox state after `selectedPrepTime`/`customPrepTime` state (after line 53)

**Current (lines 51-53):**
```javascript
  const [selectedPrepTime, setSelectedPrepTime] = useState(null);
  const [customPrepTime, setCustomPrepTime] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
```

**New:**
```javascript
  const [selectedPrepTime, setSelectedPrepTime] = useState(null);
  const [customPrepTime, setCustomPrepTime] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  // CR-118: KOT/Bill print checkboxes — defaults from aggregator auto settings
  // Bill checkbox ON only if auto-bill is enabled AND stage is 'acknowledged'
  // (if stage='ready', backend auto-prints bill at ready — not at accept time)
  const [printKot, setPrintKot] = useState(settings?.aggregatorAutoKot ?? false);
  const [printBill, setPrintBill] = useState(
    (settings?.aggregatorAutoBill && settings?.aggregatorAutoBillStage === 'acknowledged') ?? false
  );
```

### Edit 5c — Sync checkbox defaults when settings load (add useEffect after line 92)

After the existing `useEffect` that resets prep time when order changes (ending at line 92), add:
```javascript
  // CR-118: Sync checkbox defaults when settings load
  useEffect(() => {
    setPrintKot(settings?.aggregatorAutoKot ?? false);
    setPrintBill((settings?.aggregatorAutoBill && settings?.aggregatorAutoBillStage === 'acknowledged') ?? false);
  }, [settings?.aggregatorAutoKot, settings?.aggregatorAutoBill, settings?.aggregatorAutoBillStage]);
```

### Edit 5d — Modify `handleAccept` to fire print calls after accept (lines 96-108)

**Current (lines 96-108):**
```javascript
  const handleAccept = useCallback(async () => {
    const order = queue[currentIndex];
    if (!order || !effectivePrepTime || isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept(order, effectivePrepTime);
    } catch (err) {
      console.error('[AggregatorPopOut] Accept failed:', err?.message);
      setIsAccepting(false);
    }
    // Auto-dismiss via socket status change; safety reset after 8s
    setTimeout(() => setIsAccepting(false), 8000);
  }, [queue, currentIndex, effectivePrepTime, isAccepting, onAccept]);
```

**New:**
```javascript
  const handleAccept = useCallback(async () => {
    const order = queue[currentIndex];
    if (!order || !effectivePrepTime || isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept(order, effectivePrepTime);
      // CR-118: Fire manual print calls after successful accept
      const aggrId = order.aggrId || order.orderId;
      if (printKot) {
        manuallyPrintAggregator(aggrId, 'aggr_kot').catch(err =>
          console.warn('[AggregatorPopOut] CR-118: KOT print failed (non-blocking):', err?.message));
      }
      if (printBill) {
        manuallyPrintAggregator(aggrId, 'aggr_bill').catch(err =>
          console.warn('[AggregatorPopOut] CR-118: Bill print failed (non-blocking):', err?.message));
      }
    } catch (err) {
      console.error('[AggregatorPopOut] Accept failed:', err?.message);
      setIsAccepting(false);
    }
    // Auto-dismiss via socket status change; safety reset after 8s
    setTimeout(() => setIsAccepting(false), 8000);
  }, [queue, currentIndex, effectivePrepTime, isAccepting, onAccept, printKot, printBill]);
```

### Edit 5e — Add KOT/Bill checkbox UI above the prep time section (before line 283)

Insert before the `{/* Prep time picker — OD-4 */}` div (line 283):

```jsx
          {/* CR-118: KOT/Bill print checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer" data-testid="agg-print-kot-checkbox">
              <input
                type="checkbox"
                checked={printKot}
                onChange={(e) => setPrintKot(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-orange-500"
              />
              <span className="text-sm font-medium text-slate-700">Print KOT</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer" data-testid="agg-print-bill-checkbox">
              <input
                type="checkbox"
                checked={printBill}
                onChange={(e) => setPrintBill(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-green-500"
              />
              <span className="text-sm font-medium text-slate-700">Print Bill</span>
            </label>
          </div>
```

**Verify:** Screenshot PopOut → checkboxes visible above prep time pills. Accept with KOT checked → console log shows `manuallyPrintAggregator` call.

---

## Edit 6 — OrderCard.jsx: Fix KOT, add Bill, fix ID, rename Dispatch

**File:** `/app/frontend/src/components/cards/OrderCard.jsx`

### Edit 6a — Add import for aggregator service (after line 6)

**Current (line 6):**
```javascript
import { printOrder, completePrepaidOrder } from "../../api/services/orderService";
```

**New:**
```javascript
import { printOrder, completePrepaidOrder } from "../../api/services/orderService";
import { manuallyPrintAggregator } from "../../api/services/aggregatorService"; // CR-118
```

### Edit 6b — Add aggregator print handler (after `handlePrintBill` function, ~after line 255)

Insert after the closing `};` of `handlePrintBill` (line ~255):

```javascript
  // CR-118: Aggregator manual print (KOT or Bill) — uses dedicated endpoint
  const handleAggregatorPrint = async (e, printType) => {
    e?.stopPropagation?.();
    const aggrId = order.aggrId || order.orderId;
    if (!aggrId || isActionInProgress) return;
    const isPrintingKot_ = printType === 'aggr_kot';
    if (isPrintingKot_) setIsPrintingKot(true); else setIsPrintingBill(true);
    try {
      await manuallyPrintAggregator(aggrId, printType);
      toast({ title: isPrintingKot_ ? 'KOT sent' : 'Bill sent', description: `Aggregator order #${order.aggrId || orderId}` });
    } catch (error) {
      console.error(`[OrderCard] CR-118: Aggregator ${printType} print error:`, error);
      toast({ title: `Failed to send ${isPrintingKot_ ? 'KOT' : 'Bill'}`, description: error?.message, variant: 'destructive' });
    } finally {
      if (isPrintingKot_) setIsPrintingKot(false); else setIsPrintingBill(false);
    }
  };
```

### Edit 6c — Fix KOT button: route aggregator to new handler (line 992-1002)

**Current (line 992-1002):**
```javascript
              {canPrintBill && !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5)) && (
              <button
                data-testid={`print-kot-btn-${orderId}`}
                className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center ${isActionInProgress ? 'opacity-50' : ''}`}
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                title="Print KOT"
                onClick={handlePrintKot}
                disabled={isActionInProgress}
              >
                {isPrintingKot ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              </button>
              )}
```

**New:**
```javascript
              {/* CR-118: KOT button — aggregator uses dedicated print endpoint */}
              {canPrintBill && !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5)) && (
              <button
                data-testid={`print-kot-btn-${orderId}`}
                className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center ${isActionInProgress ? 'opacity-50' : ''}`}
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                title="Print KOT"
                onClick={isAggregator ? (e) => handleAggregatorPrint(e, 'aggr_kot') : handlePrintKot}
                disabled={isActionInProgress}
              >
                {isPrintingKot ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              </button>
              )}
```

### Edit 6d — Add aggregator Bill button at fOS=1 and fOS=2 (after aggregator action buttons, ~line 1060)

After the existing `{isAggregator && fOrderStatus === 2 && (...Dispatch...)}` block (~line 1060), insert:

```jsx
            {/* CR-118: Aggregator Bill print button (fOS 1+2) */}
            {isAggregator && (fOrderStatus === 1 || fOrderStatus === 2) && canPrintBill && (
              <button
                data-testid={`agg-bill-btn-${orderId}`}
                className={`min-h-[44px] px-4 text-sm font-bold rounded-lg flex items-center justify-center gap-1 ${isActionInProgress ? 'opacity-50' : ''}`}
                style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen, border: `1px solid ${COLORS.primaryGreen}` }}
                onClick={(e) => handleAggregatorPrint(e, 'aggr_bill')}
                disabled={isActionInProgress}
              >
                {isPrintingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                <span>Bill</span>
              </button>
            )}
```

### Edit 6e — Rename "Dispatch" → "Ready to Dispatch" (line ~1057)

**Current (~line 1057):**
```javascript
                Dispatch
```

**New:**
```javascript
                Ready to Dispatch
```

### Edit 6f — Fix ID chip display for aggregator (line ~461)

**Current (line ~461):**
```javascript
          {orderNumber && !isRoom && !isDineIn && (
            <span
              data-testid={`order-id-chip-${orderId}`}
              className="text-xs flex-shrink-0"
              style={{ color: COLORS.grayText }}
            >
              #{orderNumber}{useToken && dailyToken ? ` · T${dailyToken}` : ''}
            </span>
          )}
```

**New:**
```javascript
          {/* CR-118: Aggregator cards show aggrId; POS cards show orderNumber */}
          {(isAggregator ? order.aggrId : orderNumber) && !isRoom && !isDineIn && (
            <span
              data-testid={`order-id-chip-${orderId}`}
              className="text-xs flex-shrink-0"
              style={{ color: COLORS.grayText }}
            >
              #{isAggregator ? order.aggrId : orderNumber}{useToken && dailyToken ? ` · T${dailyToken}` : ''}
            </span>
          )}
```

**Verify:** Aggregator card shows `#1783932198` (aggrId). KOT click on aggregator → console shows `manuallyPrintAggregator` call. POS card KOT → still calls `printOrder`.

---

## Edit 7 — TableCard.jsx: Add KOT+Bill for aggregator, fix display, rename label

**File:** `/app/frontend/src/components/cards/TableCard.jsx`

### Edit 7a — Add import for aggregator service (after line 10)

**Current (line 10):**
```javascript
import { printOrder, completePrepaidOrder } from "../../api/services/orderService";
```

**New:**
```javascript
import { printOrder, completePrepaidOrder } from "../../api/services/orderService";
import { manuallyPrintAggregator } from "../../api/services/aggregatorService"; // CR-118
```

### Edit 7b — Add aggregator print handler (after existing `handlePrintBill`, ~after line 236)

```javascript
  // CR-118: Aggregator manual print (KOT or Bill)
  const handleAggregatorPrint = async (e, printType) => {
    e?.stopPropagation?.();
    const aggrId = table.order?.aggrId || table.aggrId || table.orderId;
    if (!aggrId || isActionInProgress) return;
    const isKot = printType === 'aggr_kot';
    if (isKot) setIsPrintingKot(true); else setIsPrintingBill(true);
    try {
      await manuallyPrintAggregator(aggrId, printType);
    } catch (error) {
      console.error(`[TableCard] CR-118: Aggregator ${printType} error:`, error);
    } finally {
      if (isKot) setIsPrintingKot(false); else setIsPrintingBill(false);
    }
  };
```

### Edit 7c — Add KOT + Bill buttons to aggregator fOS=1 block (lines 444-456)

**Current (lines 444-456):**
```javascript
                {isAggregator && table.fOrderStatus === 1 && (
                  <TextButton
                    onClick={(e) => { e?.stopPropagation?.(); onAggregatorReady?.(table.order || table); }}
                    ...
                  >
                    Ready
                  </TextButton>
                )}
```

**New:**
```javascript
                {isAggregator && table.fOrderStatus === 1 && (
                  <>
                    {/* CR-118: KOT print for aggregator */}
                    <IconButton
                      icon={Printer}
                      onClick={(e) => handleAggregatorPrint(e, 'aggr_kot')}
                      backgroundColor={COLORS.borderGray}
                      testId={`agg-kot-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print aggregator KOT`}
                      disabled={isActionInProgress}
                      isLoading={isPrintingKot}
                      LoadingIcon={Loader2}
                    />
                    <TextButton
                      onClick={(e) => { e?.stopPropagation?.(); onAggregatorReady?.(table.order || table); }}
                      backgroundColor="#FFF3E8"
                      textColor={COLORS.primaryOrange}
                      borderColor={COLORS.primaryOrange}
                      testId={`agg-ready-btn-${table.id}`}
                      ariaLabel={`Mark aggregator order ready`}
                      fullWidth={false}
                      className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                    >
                      Ready
                    </TextButton>
                  </>
                )}
```

### Edit 7d — Add KOT + Bill buttons to aggregator fOS=2 block + rename label (lines 458-470)

**Current (lines 458-470):**
```javascript
                {isAggregator && table.fOrderStatus === 2 && (
                  <TextButton
                    onClick={(e) => { e?.stopPropagation?.(); onAggregatorDispatch?.(table.order || table); }}
                    ...
                    testId={`agg-dispatch-btn-${table.id}`}
                    ariaLabel={`Dispatch aggregator order`}
                    ...
                  >
                    Dispatch
                  </TextButton>
                )}
```

**New:**
```javascript
                {isAggregator && table.fOrderStatus === 2 && (
                  <>
                    {/* CR-118: KOT reprint for aggregator at Ready */}
                    <IconButton
                      icon={Printer}
                      onClick={(e) => handleAggregatorPrint(e, 'aggr_kot')}
                      backgroundColor={COLORS.borderGray}
                      testId={`agg-kot-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print aggregator KOT`}
                      disabled={isActionInProgress}
                      isLoading={isPrintingKot}
                      LoadingIcon={Loader2}
                    />
                    <TextButton
                      onClick={(e) => { e?.stopPropagation?.(); onAggregatorDispatch?.(table.order || table); }}
                      backgroundColor="#FFF3E8"
                      textColor={COLORS.primaryOrange}
                      borderColor={COLORS.primaryOrange}
                      testId={`agg-dispatch-btn-${table.id}`}
                      ariaLabel={`Ready to dispatch aggregator order`}
                      fullWidth={false}
                      className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                    >
                      Ready to Dispatch
                    </TextButton>
                  </>
                )}
```

**Note on Bill button placement for TableCard:** The tile card has limited width. Adding a Bill icon alongside KOT + Ready/Dispatch may overflow. **Implementation decision:** Add Bill as a secondary action accessible via the KOT button long-press or as a dropdown. Alternatively, Bill is available via the expanded OrderCard view. **Recommend: skip Bill icon on TableCard tiles (space constraint); Bill is available in expanded OrderCard.** Owner can approve adding it in a follow-up if needed.

**Verify:** Aggregator tile at fOS=1 shows KOT icon + "Ready". At fOS=2 shows KOT icon + "Ready to Dispatch". POS tiles unchanged.

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1a | aggregatorTransform.js | `aggrId` field mapping | `grep 'aggrId' aggregatorTransform.js` → 1 hit | YES |
| 1b | aggregatorTransform.js | `customer` display uses `aggrigator_id` | `grep 'aggrigator_id' aggregatorTransform.js` → 2 hits | YES |
| 2a | profileTransform.js | `aggregatorAutoBill` + `aggregatorAutoBillStage` mapped | `grep 'aggregatorAutoBill' profileTransform.js` → 2 hits | YES |
| 3a | constants.js | `MANUALLY_PRINT` endpoint | `grep 'MANUALLY_PRINT' constants.js` → 1 hit | YES |
| 4a | aggregatorService.js | `manuallyPrintAggregator` function | `grep 'manuallyPrintAggregator' aggregatorService.js` → 1 hit | YES |
| 5a-5e | AggregatorOrderPopOut.jsx | Checkboxes + print-on-accept | Browser: open PopOut → see KOT/Bill checkboxes → accept → Network tab shows `/manually-print-aggregator` calls | NO |
| 6a-6f | OrderCard.jsx | KOT rewired, Bill added, ID fixed, label renamed | Browser: expand aggregator card → KOT click → Network tab shows correct endpoint; ID chip shows aggrId; Dispatch label reads "Ready to Dispatch" | NO |
| 7a-7d | TableCard.jsx | KOT added, label renamed | Browser: aggregator tile fOS=1 → KOT icon visible; fOS=2 → "Ready to Dispatch" label | NO |
| REGRESSION | OrderCard.jsx | POS KOT still works | Browser: expand POS card → KOT click → Network tab shows `order-temp-store` | NO |
| REGRESSION | TableCard.jsx | POS tiles unchanged | Browser: POS tile fOS=1 → KOT + Ready buttons present | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-118 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: CR-118 row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add all 7 files with CR-118 + date
- [ ] Code markers: // CR-118 comment in every modified file
```

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | OrderCard.jsx is a hotspot (R5) — conditional rendering changes could break POS cards | KOT button change is a single `onClick` ternary. Bill button is additive (new block). ID chip uses ternary. All guarded by `isAggregator`. |
| 2 | `aggrId` might be empty for some orders | Fallback: `order.aggrId \|\| order.orderId`. Print handler uses same fallback. |
| 3 | Print API might fail silently | Toast on error. Non-blocking `.catch()` on accept-print path (accept shouldn't fail because print failed). |
| 4 | TableCard tile width overflow with KOT + Ready/Dispatch | Recommend: skip Bill icon on tiles. Bill available in expanded OrderCard. |
| 5 | `aggregator_auto_bill` API key not yet confirmed | ~~Mapped as `toBoolean(apiSettings.aggregator_auto_bill)`. If key doesn't exist, defaults to `false` (checkbox OFF). No crash. Owner will confirm flag.~~ **RESOLVED:** Owner confirmed all 3 keys: `aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage`. |

---

```
Planning complete: CR-118
Stage: Implementation Plan
Code reality: NONE
Risk: MEDIUM
Files WILL change: aggregatorTransform.js, profileTransform.js, constants.js, aggregatorService.js, AggregatorOrderPopOut.jsx, OrderCard.jsx, TableCard.jsx
Files WILL NOT touch: orderTransform.js, printerAgentSelector.js, OrderEntry.jsx, CollectPaymentPanel.jsx, RePrintButton.jsx, AllOrdersReportPage.jsx, socketHandlers.js, DashboardPage.jsx
Owner decisions: All resolved (OD-1 through OD-5)
Docs: /app/memory/impact/CR-118_IMPACT_ANALYSIS.md, /app/memory/plans/CR-118_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO / Implementation
```
