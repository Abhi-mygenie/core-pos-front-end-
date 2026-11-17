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

### 2A. APS "₹1" Tag (Visual Badge)

| Field | Value |
|-------|-------|
| File | `components/dashboard/ScanOrderPopOut.jsx` (653 lines) |
| Location | Item row rendering at **L468-484** (inside `activeOrder.items.map`) |
| Anti-rule impact | NONE — purely visual, same pattern as PAID badge (L377-389) and Comp tag (L476-484) |
| Lines | ~5 |
| Risk | LOW |

**Current item row structure (L467-493):**
```jsx
{/* row 1: qty + name + comp tag + line total */}
<div className="flex items-start justify-between gap-2">
  <div className="flex items-center gap-2 min-w-0">
    <span ...>{qty}× {name}</span>
    {isComp ? <span ...>Comp</span> : null}     // L476-484
  </div>
  <span ...>{currencySymbol}{lineTotal.toFixed(2)}</span>  // L486-492
</div>
```

**Fix — insert APS badge after Comp tag (after L484):**
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

**Detection logic:** `unit === 1` where `unit = Number(it?.unitPrice ?? it?.price) || 0` (already computed at L456). APS items are stored at exactly ₹1 in the catalog. The `!isComp` guard prevents showing APS tag on complementary items (they're ₹0 effective regardless).

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

Per-item cancel button in item row — insert an X button at the end of each `<li>` row (L461), next to the line total:

```jsx
{/* CR-545: per-item cancel for APS/₹1 items */}
{onCancelItem ? (
  <button
    data-testid={`popout-item-cancel-${idx}`}
    className="ml-1 p-0.5 rounded hover:bg-red-50 flex-shrink-0"
    style={{ color: '#EF5350' }}
    onClick={(e) => { e.stopPropagation(); onCancelItem(activeOrder, it); }}
    title="Cancel this item"
  >
    <X size={14} />
  </button>
) : null}
```

**Note:** The X button renders for ALL items (not just ₹1) — item-level cancel is useful beyond APS. The `onCancelItem` prop presence gates the feature (if DashboardPage doesn't pass it, no buttons render).

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

### 2C. Accept Behavior — No Change Needed

Per OD-545-04: Accept works normally. Staff can accept at ₹1, then edit price in OrderEntry afterward. No code change.

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
| `ScanOrderPopOut.jsx` | APS badge (L484) + per-item cancel X button (L461) + new `onCancelItem` prop | ~20 | MEDIUM |
| `DashboardPage.jsx` | Import CancelFoodModal + state + handler + wire prop + render modal | ~25 | HIGH (R5) |
| **Total** | | **~45** | **HIGH** |

**Files WILL NOT touch:** OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, orderTransform.js, any service (unless cancelFoodItem needs extraction)

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
| V8 | `data-testid` attributes present | grep | `popout-item-aps-tag-*`, `popout-item-cancel-*` |
| V9 | `// CR-545` markers in both files | grep | ≥2 hits per file |
| V10 | Webpack 0 new warnings | dev server | compiled |

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
Planning complete: CR-545
Stage: Impact Analysis (Gate 2 only)
Code reality: NONE
Risk: HIGH
Phase 1 files WILL change: ScanOrderPopOut.jsx (~20 lines), DashboardPage.jsx (~25 lines)
Phase 1 files WILL NOT touch: OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, any transform
Phase 2: OUTLINE ONLY — backend-blocked (B3/B4)
Owner decisions: OD-545-01 through OD-545-04 all locked
Pre-impl check: B1 probe (cancel-food-item on YTC) + cancelFoodItem service export check
Docs: impact/CR-545_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) or Gate 4 GO
```
