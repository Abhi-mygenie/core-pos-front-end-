# CR-545 — Impact Analysis (Gate 2)

**ID:** CR-545
**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-16
**Risk:** HIGH (order flow, pricing, R5 hotspot)
**Code Reality:** NONE
**Conflict Pre-Check:** CLEAN (see §4)

---

## 1. Scope (from OD-545-01)

- **Phase 1 (FE-only):** Full IA → Implementation Plan. APS tag + item-level cancel in ScanOrderPopOut.
- **Phase 2 (backend-blocked):** Outline only. Price edit requires new `update-food-price` endpoint (B3/B4). Backend brief filed.
- **Accept NOT gated** by ₹1 items (OD-545-04). Staff accepts at ₹1, edits price afterward.

---

## 2. Phase 1 — Full Impact Analysis

### 2A. APS "₹1" Tag (Visual Badge) + Sort to Top

| Field | Value |
|-------|-------|
| File | `components/dashboard/ScanOrderPopOut.jsx` (653 lines) |
| Location | Item row rendering at **L454-556** (inside `activeOrder.items.map`) |
| Anti-rule impact | NONE — purely visual + sort, same pattern as PAID badge (L377-389) and Comp tag (L476-484) |
| Lines | ~8 |
| Risk | LOW |

**2A-i: Sort ₹1 items to top of list (owner feedback 2026-11-17)**

Before the `.map()` at L454, sort items so `unitPrice === 1` come first:
```javascript
// CR-545: APS items float to top so staff sees them immediately
const sortedItems = [...(activeOrder.items || [])].sort((a, b) => {
  const aAps = Number(a?.unitPrice ?? a?.price) === 1 ? 0 : 1;
  const bAps = Number(b?.unitPrice ?? b?.price) === 1 ? 0 : 1;
  return aAps - bAps;
});
```
Then `sortedItems.map(...)` replaces `activeOrder.items.map(...)`.

**2A-ii: APS badge after Comp tag (L484)**

```jsx
{unit === 1 && !isComp ? (
  <span
    data-testid={`popout-item-aps-tag-${idx}`}
    className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
    style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
  >
    APS
  </span>
) : null}
```

Detection: `unit === 1` where `unit = Number(it?.unitPrice ?? it?.price) || 0` (L456). `!isComp` guard prevents APS tag on complementary items.

---

### 2B. Item-Level Cancel Button

| Field | Value |
|-------|-------|
| Files | `ScanOrderPopOut.jsx` + `DashboardPage.jsx` (R5) |
| Location — popup | Item row (L461-552), new X button per row |
| Location — dashboard | ScanOrderPopOut mount at L1829-1838, new prop + modal wiring |
| Anti-rule impact | PARTIAL — popup calls prop only, no direct API. DashboardPage wires the API path. |
| Lines | ~20 (popup) + ~20 (dashboard) |
| Risk | MEDIUM (popup), HIGH (dashboard — R5) |
| Backend dep | B1: `cancel-food-item` on YTC (fOS=7) orders — assume works per OD-545-03 |

**2B-i: ScanOrderPopOut changes**

New prop in signature (L159-168):
```
onCancelItem,  // CR-545: (order, item) => void — delegates to DashboardPage
```

Per-item cancel button in item row — matches **existing CartPanel PlacedItemRow pattern** (L87-89):

```jsx
{/* CR-545: per-item cancel — matches CartPanel PlacedItemRow style */}
{onCancelItem ? (
  <button
    data-testid={`popout-item-cancel-${idx}`}
    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-gray-100"
    style={{ backgroundColor: COLORS.sectionBg }}
    onClick={(e) => { e.stopPropagation(); onCancelItem(activeOrder, it); }}
    title="Cancel this item"
  >
    <XCircle className="w-4 h-4" style={{ color: COLORS.grayText }} />
  </button>
) : null}
```

**Icon/color matches existing:** `XCircle` in `COLORS.grayText` (#666666), `rounded-full`, bg `COLORS.sectionBg` (#F7F7F7) — identical to CartPanel PlacedItemRow cancel button. Import `XCircle` from lucide-react (already used in CartPanel).

**2B-ii: DashboardPage changes**

1. **Import CancelFoodModal** (currently only in OrderEntry.jsx):
```javascript
import CancelFoodModal from "../components/order-entry/CancelFoodModal";
```

2. **State for cancel-item modal:**
```javascript
const [scanCancelItem, setScanCancelItem] = useState(null); // CR-545: {order, item}
```

3. **Handler:**
```javascript
// CR-545: item-level cancel from ScanOrderPopOut
const handleScanCancelItem = useCallback((order, item) => {
  setScanCancelItem({ order, item });
}, []);
```

4. **Cancel execution (mirrors OrderEntry.handleCancelFood):**
```javascript
const executeScanItemCancel = useCallback(async ({ item, reason, cancelQuantity, note }) => {
  try {
    await orderService.cancelFoodItem({
      order_id: scanCancelItem.order.orderId,
      order_food_id: item.foodId || item.id,
      item_id: item.itemId || item.id,
      cancel_qty: cancelQuantity || 1,
      order_status: 'cancelled',
      reason_type: reason?.id || '',
      reason: reason?.reason || '',
      cancel_type: 'Pre-Serve',
      printer_agent: [],
      cancel_item_note: note || '',
    });
  } catch (err) {
    console.error('[DashboardPage] CR-545: cancel-food-item failed:', err?.message);
  } finally {
    setScanCancelItem(null);
  }
}, [scanCancelItem]);
```

5. **Wire prop to ScanOrderPopOut (L1829-1838):**
```jsx
<ScanOrderPopOut
  ...existing props...
  onCancelItem={handleScanCancelItem}  // CR-545
/>
```

6. **Render CancelFoodModal (near the other modals at bottom of JSX):**
```jsx
{/* CR-545: item-level cancel from ScanOrderPopOut */}
{scanCancelItem && (
  <CancelFoodModal
    item={scanCancelItem.item}
    reasons={getItemCancellationReasons?.() || []}
    onClose={() => setScanCancelItem(null)}
    onCancel={executeScanItemCancel}
    cancelNoteMandatory={cancellation?.cancelNoteMandatory || false}
  />
)}
```

**Dependency check:** `orderService.cancelFoodItem` — need to verify this function exists:

```
grep -n "cancelFoodItem\|cancel-food-item" /app/frontend/src/api/services/orderService.js
```

If it doesn't exist as a named export, extract the cancel logic from OrderEntry L1571-1610 into a reusable service call. The API endpoint is `PUT /api/v2/vendoremployee/order/cancel-food-item`.

---

### 2C. KOT Print Button in Popup (NEW — owner requirement 2026-11-17)

| Field | Value |
|-------|-------|
| Files | `ScanOrderPopOut.jsx` + `DashboardPage.jsx` (R5) |
| Anti-rule impact | PARTIAL — popup calls prop only, DashboardPage handles API |
| Lines | ~10 (popup) + ~25 (dashboard) |
| Risk | MEDIUM |
| Reuses | `printOrder` from `orderService.js`, `getStationsFromOrderItems` from `stationService.js` — exact same code path as OrderCard.jsx L202-239 |

**Current state:** No KOT print from ScanOrderPopOut. Staff must Accept → open OrderEntry → print KOT from there. Extra steps.

**Fix — ScanOrderPopOut:**

New prop: `onPrintKOT` in signature. Printer icon button in the popup footer (between Accept and Edit):

```jsx
{onPrintKOT ? (
  <button
    data-testid={`popout-print-kot-${idStr}`}
    className="mock-btn mock-btn-ghost"
    onClick={(e) => { e.stopPropagation(); onPrintKOT(activeOrder); }}
    title="Print KOT"
  >
    <Printer size={16} /> KOT
  </button>
) : null}
```

Import `Printer` from lucide-react (already used in OrderCard).

**Fix — DashboardPage:**

Reuse the exact KOT print pattern from OrderCard.jsx L202-239:

```javascript
// CR-545: KOT print from ScanOrderPopOut — reuses OrderCard pattern
import { printOrder } from '../api/services/orderService';           // NEW import
import { getStationsFromOrderItems } from '../api/services/stationService'; // NEW import

const handleScanPrintKOT = useCallback(async (order) => {
  const stations = getStationsFromOrderItems(order.items || [], getProductById);
  if (stations.length === 0) {
    toast({ title: 'No KOT stations', description: 'No items with stations found', variant: 'destructive' });
    return;
  }
  try {
    const stationKot = stations.map(s => s.station).join(',');
    await printOrder(order.orderId, 'kot', stationKot, order, 0, {}, printerAgents || []);
    toast({ title: 'KOT sent', description: `Order #${order.orderId}` });
  } catch (err) {
    toast({ title: 'KOT failed', description: err?.message || 'Print error', variant: 'destructive' });
  }
}, [getProductById, printerAgents, toast]);
```

Wire prop: `<ScanOrderPopOut ... onPrintKOT={handleScanPrintKOT} />`

**Dependencies in DashboardPage:**
- `printOrder` — new import from `orderService.js`
- `getStationsFromOrderItems` — new import from `stationService.js`
- `getProductById` — need to check if available in DashboardPage scope (from MenuContext or RestaurantContext)
- `printerAgents` — need to check if available (from RestaurantContext)
- `toast` — already available via `useToast`

**Station picker:** For Phase 1, auto-send to ALL stations (join all). Station picker modal can be a Phase 1.5 follow-up if multi-station selection is needed from the popup.

---

### 2D. Accept Behavior — No Change Needed

Per OD-545-04: Accept works normally. Staff can accept at ₹1, then edit price in OrderEntry afterward. No code change.

**Post-accept price edit flow (existing workaround — documented for design):**
1. Staff taps **Accept** → order confirmed at ₹1
2. Staff taps **Edit** (or opens order from dashboard) → OrderEntry opens with the placed ₹1 item in cart
3. Staff cancels the ₹1 item (CartPanel cancel button → CancelFoodModal)
4. Staff re-adds the same item from menu → **BUG-035 "Enter Price" modal** triggers (because the item is `dynamic_price` / APS in the catalog)
5. Staff enters actual price → item added at correct price → **Update Order**

This is 4 extra steps. Phase 2 eliminates this by allowing inline price edit.

---

### 2E. Phase 2 Design Preview — Inline Price Edit in Popup (Backend-Blocked)

**NOT for implementation in Phase 1.** Design shown for owner review and backend awareness.

When backend delivers `update-food-price` endpoint (B3/B4), the popup will show:
- Inline price input on each ₹1 item row (replaces the ₹1.00 amount display)
- Staff types actual price → stored locally until Accept
- On Accept click: `update-food-price` called per ₹1 item → then `confirmOrder`
- Single Accept flow — no cancel-and-re-add workaround

**Files (Phase 2 only):** ScanOrderPopOut.jsx (~30 lines for inline inputs + local state) + DashboardPage.jsx (~20 lines for price update handler) + orderService.js (~10 lines for new API call)

---

## 3. Phase 2 — Outline Only (Backend-Blocked)

### 3A. Price Edit in ScanOrderPopOut
- Inline price input per ₹1 item (local state for override)
- On Accept: call `update-food-price` for each overridden item → then confirm
- **Blocked on:** B3 (`update-food-price` endpoint) or B4 (extend confirm with `price_overrides`)

### 3B. Price Edit in CartPanel
- PlacedItemRow gets price edit mode for ₹1 items (mirrors qty edit pencil)
- `editingPriceItemId` state, pencil icon on price, input + confirm/cancel
- **Blocked on:** Same B3/B4 endpoint

### 3C. Backend Brief
Filed at `backend_briefs/BACKEND_BRIEF_APS_PRICE_EDIT_2026-11-16.md` with B1-B4 contract proposals.

**Phase 2 estimated scope:** ~135 lines across 7 files. NOT planned for this gate cycle.

---

## 4. Conflict Pre-Check

| Item | File | Conflict? |
|------|------|-----------|
| BUG-453 (IMPLEMENTED) | ScanOrderPopOut.jsx — soundManager comments | **NO** — different section (snooze handlers) |
| CR-411 (IMPLEMENTED) | DashboardPage.jsx — handleTableClick, cart clear | **NO** — different handlers |
| BUG-599 Rev2 (IMPLEMENTED) | DashboardPage.jsx — removed aggregator boot useEffect | **NO** — different section |
| CR-429 (IMPLEMENTED) | DashboardPage.jsx — active table toggle | **NO** — different feature area |
| BUG-674 (Batch 1) | OrderEntry.jsx — cancel note | **NO** — CR-545 Phase 1 doesn't touch OrderEntry |
| BUG-670 (Batch 1) | OrderEntry.jsx — cancel item note | **NO** — same as above |

**Result: CLEAN — no blocking conflicts.**

---

## 5. Files Changed Summary (Phase 1 only)

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `ScanOrderPopOut.jsx` | APS badge (L484) + per-item cancel X button (L461) + KOT print button (footer) + 3 new props (`onCancelItem`, `onPrintKOT`) | ~30 | MEDIUM |
| `DashboardPage.jsx` | Import CancelFoodModal + printOrder + getStationsFromOrderItems + state + 2 handlers (cancel + KOT) + wire props + render modal | ~50 | HIGH (R5) |
| **Total** | | **~80** | **HIGH** |

**Files WILL NOT touch:** OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, orderTransform.js, orderService.js (reused as-is), stationService.js (reused as-is)

---

## 6. Anti-Rules Assessment (Phase 1)

| Anti-Rule | Phase 1 APS Tag | Phase 1 Item Cancel |
|-----------|-----------------|---------------------|
| No direct service/API/socket call | ✅ Respected | ✅ Respected — delegates via `onCancelItem` prop |
| No NotificationContext import | ✅ Respected | ✅ Respected |
| No localStorage/backend writes | ✅ Respected | ✅ Respected — popup writes nothing |
| No mutation of order.status/OrderContext | ✅ Respected | ⚠️ PARTIAL — cancel changes order via socket (but popup doesn't mutate directly) |
| No new business workflow definition | ✅ Respected | ⚠️ PARTIAL — item cancel is a new action path, but reuses existing handlers |

**Owner approval status:** OD-545-02 approves prop-based cancel for now. Anti-rule lift is partial — popup remains prop-driven.

---

## 7. Owner Decisions

All locked (OD-545-01 through OD-545-04). No new decisions needed for Phase 1 IA.

---

## 8. Pre-Implementation Verification Needed

| # | Check | Priority | Method |
|---|-------|----------|--------|
| B1 | `cancel-food-item` works on YTC (fOS=7) orders | P0 (blocks item cancel) | curl probe on preprod |
| SVC | `orderService.cancelFoodItem` exists as named export | P0 (blocks DashboardPage handler) | grep orderService.js |

Per OD-545-03: Proceed with implementation assuming B1 works. Probe before QA. If probe fails → cancel button disabled for scanner orders, APS tag still ships.

---

## 9. Verification Matrix (seeds QA)

| # | Check | Method | Expected |
|---|-------|--------|----------|
| V1 | APS badge on ₹1 items in popup | Browser: web order with ₹1 item → popup shows "APS" tag | Orange APS badge visible |
| V2 | No APS badge on normal-price items | Browser: web order with normal item | No APS badge |
| V3 | No APS badge on complementary items | Browser: comp ₹1 item | "Comp" badge only, no APS |
| V4 | Cancel X button on each item row | Browser: popup with items → X buttons visible | X button per row |
| V5 | Cancel opens CancelFoodModal | Browser: click X → modal opens with reasons | Modal with reason dropdown |
| V6 | Cancel removes item from order | Browser: select reason → confirm → item removed | Socket updates popup, item gone |
| V7 | Accept works normally with ₹1 items | Browser: order with ₹1 items → Accept | Order confirmed at ₹1 |
| V8 | KOT button visible in popup footer | Browser: popup shows Printer/KOT button | Button between Accept and Edit |
| V9 | KOT print sends to printer | Browser: click KOT → toast "KOT sent" | Toast confirmation |
| V10 | `data-testid` attributes present | grep | `popout-item-aps-tag-*`, `popout-item-cancel-*`, `popout-print-kot-*` |
| V11 | `// CR-545` markers in both files | grep | ≥3 hits per file |
| V12 | Webpack 0 new warnings | dev server | compiled |

---

## 10. Artifacts

| Artifact | Path |
|----------|------|
| Intake | `change_requests/CR-545_APS_WEB_ORDER_PRICE_ENTRY_INTAKE.md` |
| Investigation | `investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md` |
| Owner decisions | `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md` |
| Backend brief | `backend_briefs/BACKEND_BRIEF_APS_PRICE_EDIT_2026-11-16.md` |
| Impact Analysis (this doc) | `impact/CR-545_IMPACT_ANALYSIS.md` |

---

```
Planning complete: CR-545 (Rev 2 — +KOT print)
Stage: Impact Analysis (Gate 2 only)
Code reality: NONE
Risk: HIGH
Phase 1 files WILL change: ScanOrderPopOut.jsx (~30 lines), DashboardPage.jsx (~50 lines)
Phase 1 files WILL NOT touch: OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, orderService.js, stationService.js
Phase 2: OUTLINE ONLY — backend-blocked (B3/B4)
Owner decisions: OD-545-01 through OD-545-04 locked + KOT print (owner verbal 2026-11-17)
Pre-impl check: B1 probe ✅ + cancelFoodItem export check needed + getProductById/printerAgents availability in DashboardPage
Docs: impact/CR-545_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) or Gate 4 GO
```
