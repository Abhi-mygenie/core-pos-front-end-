# CR-545 — Implementation Plan (Gate 3) — Phase 1

**ID:** CR-545
**Gate:** 3 — Implementation Plan
**Role:** PLANNING
**Date:** 2026-11-17
**Risk:** HIGH (R5 DashboardPage.jsx)
**IA:** `impact/CR-545_IMPACT_ANALYSIS.md` (Rev 3)
**All ODs locked:** OD-545-01 through OD-545-04

---

## Pre-Implementation Findings

| # | Check | Result |
|---|-------|--------|
| SVC-1 | `cancelFoodItem` named export in orderService.js | ❌ Does NOT exist — use `api.put(API_ENDPOINTS.CANCEL_ITEM, orderToAPI.cancelItem(...))` directly (same pattern as OrderEntry L1576-1582) |
| SVC-2 | `printOrder` export | ✅ `orderService.js:134` |
| SVC-3 | `getStationsFromOrderItems` export | ✅ `stationService.js:49` |
| SVC-4 | `getProductById` availability in DashboardPage | ❌ Not imported — add `useMenu` import, destructure `getProductById` |
| SVC-5 | `printerAgents` availability in DashboardPage | ❌ Not destructured — derive from `restaurant?.printerAgents` via useMemo |
| SVC-6 | `getItemCancellationReasons` in DashboardPage | ❌ Not destructured — add to existing `useSettings()` destructure at L191 |
| SVC-7 | `cancellation` from useRestaurant | ✅ Already at L178 |
| SVC-8 | `orderToAPI` in DashboardPage | ✅ Already imported at L26 as `toAPI as orderToAPI` |
| SVC-9 | `api` + `API_ENDPOINTS` in DashboardPage | ✅ Already imported at L22-23 |

---

## Execution Order

```
E1 → E2 → E3 → E4 → E5 → E6  (ScanOrderPopOut.jsx — popup changes)
E7 → E8 → E9 → E10 → E11 → E12 → E13 → E14  (DashboardPage.jsx — wiring)
```

Compile check after E6, then again after E14.

---

## File 1: ScanOrderPopOut.jsx (653 lines)

### E1 — Import XCircle, Printer (L47)

**Current (L47):**
```javascript
import { ChevronLeft, ChevronRight, X, Check, Eye, BellOff, Bell, Loader2 } from 'lucide-react';
```

**Replace with:**
```javascript
import { ChevronLeft, ChevronRight, X, Check, Eye, BellOff, Bell, Loader2, XCircle, Printer } from 'lucide-react'; // CR-545: +XCircle, Printer
```

**Verification:** grep for `XCircle.*Printer` in import line.

---

### E2 — Add props to component signature (L159-168)

**Current (L159-168):**
```javascript
const ScanOrderPopOut = ({
  orders = [],
  snoozedOrders,
  onToggleSnooze,
  onAccept,
  onReject,
  onEdit,
  currencySymbol = '₹',
  suppressed = false,
}) => {
```

**Replace with:**
```javascript
const ScanOrderPopOut = ({
  orders = [],
  snoozedOrders,
  onToggleSnooze,
  onAccept,
  onReject,
  onEdit,
  onCancelItem,   // CR-545: (order, item) => void — per-item cancel
  onPrintKOT,     // CR-545: (order) => void — KOT print from popup
  currencySymbol = '₹',
  suppressed = false,
}) => {
```

**Verification:** grep `onCancelItem.*onPrintKOT` in signature.

---

### E3 — Sort APS items to top (L453-454)

**Current (L453-454):**
```javascript
                <ul className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                  {activeOrder.items.map((it, idx) => {
```

**Replace with:**
```javascript
                <ul className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                  {/* CR-545: APS items (₹1) sort to top so staff sees them first */}
                  {[...(activeOrder.items || [])].sort((a, b) => {
                    const aAps = Number(a?.unitPrice ?? a?.price) === 1 ? 0 : 1;
                    const bAps = Number(b?.unitPrice ?? b?.price) === 1 ? 0 : 1;
                    return aAps - bAps;
                  }).map((it, idx) => {
```

**Verification:** ₹1 items appear before other items in the popup list.

---

### E4 — APS badge after Comp tag (after L484)

**Current (L476-485):**
```javascript
                            {isComp ? (
                              <span
                                data-testid={`popout-item-comp-tag-${idx}`}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ backgroundColor: '#F1F5F9', color: COLORS.darkText }}
                              >
                                Comp
                              </span>
                            ) : null}
                          </div>
```

**Replace with:**
```javascript
                            {isComp ? (
                              <span
                                data-testid={`popout-item-comp-tag-${idx}`}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ backgroundColor: '#F1F5F9', color: COLORS.darkText }}
                              >
                                Comp
                              </span>
                            ) : null}
                            {/* CR-545: APS badge for ₹1 items (not comp) */}
                            {unit === 1 && !isComp ? (
                              <span
                                data-testid={`popout-item-aps-tag-${idx}`}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
                              >
                                APS
                              </span>
                            ) : null}
                          </div>
```

**Verification:** Orange "APS" badge appears on ₹1 items, not on comp items.

---

### E5 — Per-item cancel X button (after line total span, before closing `</div>` of row 1)

**Current (L486-492):**
```javascript
                          <span
                            style={{ color: COLORS.grayText }}
                            className="font-mono flex-shrink-0"
                          >
                            {currencySymbol}
                            {lineTotal.toFixed(2)}
                          </span>
```

**Replace with:**
```javascript
                          <span
                            style={{ color: COLORS.grayText }}
                            className="font-mono flex-shrink-0"
                          >
                            {currencySymbol}
                            {lineTotal.toFixed(2)}
                          </span>
                          {/* CR-545: per-item cancel — matches CartPanel PlacedItemRow style */}
                          {onCancelItem ? (
                            <button
                              data-testid={`popout-item-cancel-${idx}`}
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-100"
                              style={{ backgroundColor: COLORS.sectionBg }}
                              onClick={(e) => { e.stopPropagation(); onCancelItem(activeOrder, it); }}
                              title="Cancel this item"
                            >
                              <XCircle className="w-4 h-4" style={{ color: COLORS.grayText }} />
                            </button>
                          ) : null}
```

**Verification:** X button visible per item row; click calls onCancelItem with order + item.

---

### E6 — KOT print button in action row (L590-593, insert before Reject button)

**Current (L622-633):**
```javascript
          <button
            type="button"
            data-testid={`popout-reject-btn-${idStr}`}
            onClick={() => handleRejectClick(activeOrder)}
            disabled={isAccepting}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
            title="Reject / Cancel order — opens cancel modal"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </button>
```

**Replace with:**
```javascript
          {/* CR-545: KOT print button */}
          {onPrintKOT ? (
            <button
              type="button"
              data-testid={`popout-print-kot-${idStr}`}
              onClick={() => onPrintKOT(activeOrder)}
              disabled={isAccepting}
              className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              title="Print KOT"
            >
              <Printer className="w-4 h-4" />
              <span>KOT</span>
            </button>
          ) : null}
          <button
            type="button"
            data-testid={`popout-reject-btn-${idStr}`}
            onClick={() => handleRejectClick(activeOrder)}
            disabled={isAccepting}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
            title="Reject / Cancel order — opens cancel modal"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </button>
```

**Grid update (L591):** Change `grid-cols-2 lg:grid-cols-4` to `grid-cols-2 lg:grid-cols-5` to fit the new button:

**Current (L591):**
```javascript
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4 py-3 lg:px-6 lg:py-4 border-t"
```

**Replace with:**
```javascript
          className="grid grid-cols-2 lg:grid-cols-5 gap-2 px-4 py-3 lg:px-6 lg:py-4 border-t"
```

**Verification:** KOT button visible between Edit and Reject in popup footer.

---

## File 2: DashboardPage.jsx (2287 lines)

### E7 — New imports (top of file, after existing imports)

**Insert after L34** (existing `import ScanOrderPopOut`):

```javascript
// CR-545: imports for item cancel + KOT print from ScanOrderPopOut
import CancelFoodModal from "../components/order-entry/CancelFoodModal";
import { useMenu } from "../contexts";
import { printOrder } from "../api/services/orderService";
import { getStationsFromOrderItems } from "../api/services/stationService";
```

**Verification:** No duplicate imports, webpack compiles.

---

### E8 — Destructure new hooks/values (near existing hook calls)

**E8a — Add `getItemCancellationReasons` to useSettings (L191):**

**Current (L191):**
```javascript
  const { getOrderCancellationReasons } = useSettings();
```

**Replace with:**
```javascript
  const { getOrderCancellationReasons, getItemCancellationReasons } = useSettings(); // CR-545: +item reasons
```

**E8b — Add useMenu after useSettings (insert after L191):**

```javascript
  const { getProductById } = useMenu(); // CR-545: needed for KOT station resolution
```

**E8c — Add printerAgents memo (insert after the new useMenu line):**

```javascript
  // CR-545: printer agents for KOT from popup
  const printerAgents = useMemo(() => restaurant?.printerAgents || [], [restaurant]);
```

**Note:** `restaurant` is already available from `useRestaurant()` at L178.

**Verification:** No TDZ errors, variables available in scope.

---

### E9 — State for scan cancel item (near existing state declarations, ~L471)

**Insert after L471** (existing `cancelOrderEntry` state):

```javascript
  const [scanCancelItem, setScanCancelItem] = useState(null); // CR-545: {order, item} for popup cancel
```

**Verification:** State initializes as null.

---

### E10 — handleScanCancelItem callback (after E9 state)

**Insert after scanCancelItem state:**

```javascript
  // CR-545: item-level cancel handler from ScanOrderPopOut
  const handleScanCancelItem = useCallback((order, item) => {
    setScanCancelItem({ order, item });
  }, []);
```

**Verification:** Callback sets state with order + item.

---

### E11 — executeScanItemCancel callback (after E10)

**Insert after handleScanCancelItem:**

```javascript
  // CR-545: execute item cancel from popup — mirrors OrderEntry.handleCancelFood
  const executeScanItemCancel = useCallback(async ({ item, reason, cancelQuantity, note = '' }) => {
    if (!scanCancelItem?.order) return;
    const order = scanCancelItem.order;
    const tableEntry = { orderId: order.orderId || order.id };
    const payload = orderToAPI.cancelItem(tableEntry, item, reason, cancelQuantity, {
      printerAgents: printerAgents || [],
      allCartItems: order.items || [],
      cancelItemNote: note,
    });
    try {
      await api.put(API_ENDPOINTS.CANCEL_ITEM, payload);
    } catch (err) {
      console.error('[DashboardPage] CR-545: cancel-food-item failed:', err?.message);
    } finally {
      setScanCancelItem(null);
    }
  }, [scanCancelItem, printerAgents]);
```

**Verification:** Cancel API called with correct payload shape; modal closes on success/failure.

---

### E12 — handleScanPrintKOT callback (after E11)

**Insert after executeScanItemCancel:**

```javascript
  // CR-545: KOT print from ScanOrderPopOut — reuses OrderCard pattern
  const handleScanPrintKOT = useCallback(async (order) => {
    const items = order?.items || [];
    const stations = getStationsFromOrderItems(items, getProductById);
    if (stations.length === 0) return;
    try {
      const stationKot = stations.map(s => s.station).join(',');
      await printOrder(order.orderId || order.id, 'kot', stationKot, order, 0, {}, printerAgents || []);
    } catch (err) {
      console.error('[DashboardPage] CR-545: KOT print failed:', err?.message);
    }
  }, [getProductById, printerAgents]);
```

**Verification:** KOT sent to printer stations; console error on failure.

---

### E13 — Wire new props to ScanOrderPopOut (L1829-1838)

**Current (L1829-1838):**
```jsx
        <ScanOrderPopOut
          orders={orders}
          snoozedOrders={snoozedOrders}
          onToggleSnooze={toggleSnooze}
          onAccept={handleConfirmOrder}
          onReject={handleCancelOrderFromCard}
          onEdit={handleTableClick}
          currencySymbol={currencySymbol}
          suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}
        />
```

**Replace with:**
```jsx
        <ScanOrderPopOut
          orders={orders}
          snoozedOrders={snoozedOrders}
          onToggleSnooze={toggleSnooze}
          onAccept={handleConfirmOrder}
          onReject={handleCancelOrderFromCard}
          onEdit={handleTableClick}
          onCancelItem={handleScanCancelItem}  // CR-545
          onPrintKOT={handleScanPrintKOT}      // CR-545
          currencySymbol={currencySymbol}
          suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}
        />
```

**Verification:** Props passed; no warnings in console.

---

### E14 — Render CancelFoodModal for scan cancel (near CancelOrderModal, ~L2270)

**Find the existing CancelOrderModal render** (~L2268-2277) and insert AFTER it:

```jsx
      {/* CR-545: item-level cancel from ScanOrderPopOut */}
      {scanCancelItem && (
        <CancelFoodModal
          item={scanCancelItem.item}
          reasons={getItemCancellationReasons()}
          onClose={() => setScanCancelItem(null)}
          onCancel={executeScanItemCancel}
          cancelNoteMandatory={cancellation?.cancelNoteMandatory || false}
        />
      )}
```

**Verification:** Cancel X in popup → CancelFoodModal opens with reasons → confirm → item cancelled.

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-545 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add ScanOrderPopOut.jsx + DashboardPage.jsx with CR-545 + date
- [ ] Code markers: // CR-545 comment in every modified section (≥3 per file)
```

---

## Verification Matrix (inherited from IA + refined)

| # | Check | Method | Expected |
|---|-------|--------|----------|
| V1 | APS badge on ₹1 items | Browser: popup with ₹1 item | Orange "APS" badge visible |
| V2 | ₹1 items sorted to top | Browser: order with mixed items | ₹1 items listed first |
| V3 | No APS badge on comp items | Browser: comp item at ₹1 | Only "Comp" badge, no "APS" |
| V4 | Cancel X button per item | Browser: popup items | X button on each row |
| V5 | Cancel opens CancelFoodModal | Browser: click X | Modal with reason dropdown |
| V6 | Cancel removes item | Browser: confirm cancel | Item removed via socket update |
| V7 | Accept works with ₹1 items | Browser: Accept button | Order confirmed at ₹1 |
| V8 | KOT button in footer | Browser: popup footer | KOT button between Edit and Reject |
| V9 | KOT sends to printer | Browser: click KOT | Console log / toast / no error |
| V10 | Grid layout correct (5 cols) | Browser: lg viewport | 5 buttons in footer row |
| V11 | `// CR-545` markers | `grep -rn "CR-545" src/` | ≥6 hits across 2 files |
| V12 | Webpack 0 new warnings | dev server | compiled successfully |

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | DashboardPage is R5 hotspot | All changes isolated: 2 handlers + 1 state + modal render. No existing code modified. |
| R2 | cancel-food-item may not work on YTC (fOS=7) orders | OD-545-03: proceed, probe before QA. If fails → cancel button disabled, APS tag still ships. |
| R3 | printerAgents might be empty for some restaurants | Handled: `stations.length === 0` early return in E12. |
| R4 | CancelFoodModal TDZ if placed before state | E14 is at end of JSX (after all state/callbacks declared). No TDZ risk. |

---

```
Planning complete: CR-545
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: HIGH (R5 DashboardPage)
14 edits across 2 files (~80 lines added, 0 lines modified)
Execution order: E1→E6 (ScanOrderPopOut) then E7→E14 (DashboardPage)
Verification matrix: 12 checks (0 automated, 12 manual/browser)
Owner decisions: ALL LOCKED (OD-545-01..04)
Docs: plans/CR-545_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
