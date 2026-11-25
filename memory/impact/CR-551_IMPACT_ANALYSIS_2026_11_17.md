# CR-551 — Impact Analysis (Gate 2)

**ID:** CR-551
**Title:** Edit Variations / Add-ons on Placed Order Items
**Type:** CR
**Date:** 2026-11-17
**Code Reality:** NONE (backend endpoint does not exist; FE has TBD placeholders only)
**Conflict Pre-Check:** See §1
**Risk:** HIGH (order flow, financial recalculation, 4 R5 hotspot files, backend dependency)
**Investigation:** `investigations/INV-CR-EDIT-VARIATIONS_AFTER_PLACE_2026_11_17.md` (10/10 steps, HIGH confidence)

---

## 0. Owner Decisions (all locked 2026-11-17)

| OD | Question | Answer |
|----|----------|--------|
| OD-551-01 | When should editing be allowed? | **Only before item is served** |
| OD-551-02 | Should kitchen get a modified KOT? | **No KOT on edit** — original KOT already sent at place time |
| OD-551-03 | Which permission gates the edit button? | **Existing `order_edit` permission** (profileTransform.js L429) |
| OD-551-04 | Recalculate tax + service charge on price change? | **Yes, recalculate everything** |
| OD-551-05 | Qty in same modal or keep separate? | **Combine in one modal** — single modal for qty + variations + add-ons. Replaces the pencil icon. |

---

## 1. Conflict Pre-Check (at HEAD 2026-11-17)

| File | Last touched by | Open conflict? |
|------|-----------------|----------------|
| `api/constants.js` | CR-405-B 2026-10-01 (L97) | NONE — different zone (L92-93 vs L97) |
| `api/transforms/orderTransform.js` | BUG-664 2026-11-10 (L313) | NONE — CR-551 adds new function, doesn't modify existing |
| `api/services/orderService.js` | BUG-538 2026-10-18 (applyOrderDiscount) | NONE — CR-551 adds new export |
| `components/order-entry/CartPanel.jsx` | CR-482 2026-11-05 (P10 kbd) | POTENTIAL — PlacedItemRow (L65) is in same area as CR-482 kbdRowProps. Changes are additive (new prop), parallel-safe. |
| `components/order-entry/OrderEntry.jsx` | BUG-662 2026-11-09 (L1679) | NONE — different zone (CR-551 adds handler near customization modal at L3026) |
| `components/order-entry/ItemCustomizationModal.jsx` | CR-482 2026-11-05 (P5 kbd) | POTENTIAL — CR-551 adds edit mode callback. CR-482 added Esc/Ctrl+Enter. Changes are additive, parallel-safe. |

**No blocking conflicts.**

---

## 2. Backend Dependency (BLOCKING)

### 2.1 Endpoint Status

**No backend endpoint exists.** All 5 probed endpoints returned HTTP 404:

| Endpoint | Version | Status |
|----------|---------|--------|
| `order/edit-food-item` | v2 | 404 |
| `order/update-food-item` | v2 | 404 |
| `order/edit-order-item` | v2 | 404 |
| `order/modify-food-item` | v2 | 404 |
| `order/edit-food-item` | v1 | 404 |

**FE constants.js L92-93:**
```javascript
EDIT_ORDER_ITEM:     'TBD',   // CHG-040: Edit placed item qty/notes
EDIT_ORDER_ITEM_QTY: 'TBD',   // CHG-040 future: Edit placed item qty only
```

### 2.2 Backend Brief Required

Backend brief at `backend_briefs/BACKEND_BRIEF_CR-551_2026_11_17.md` needed with the contract from the investigation report §6:

```
PUT /api/v2/vendoremployee/order/edit-food-item
{
  order_id:          <order ID>,
  item_id:           <orderDetails[].id — specific line to edit>,
  food_id:           <food catalog ID (unchanged)>,
  quantity:          <qty (can also change per OD-551-05 — but kept separate for now)>,
  variations:        [{ name, values: { label: [selected] } }],
  add_on_ids:        [ids],
  add_on_qtys:       [qtys],
  food_amount:       <base price>,
  variation_amount:  <new variation total>,
  addon_amount:      <new addon total>,
  food_level_notes:  <optional>
}
```

Backend must:
1. Find `orderDetails` row by `item_id`
2. Replace variation, add_ons, prices
3. Recalculate `order_amount`, tax, service charge (OD-551-04)
4. Emit `update-order` socket event
5. No KOT (OD-551-02)
6. Respect `order_edit_access` permission / CR-489 edit lock (OD-551-03)
7. Reject if item status = `served` or `cancelled` (OD-551-01)

### 2.3 Blocking Status

**CR-551 FE implementation is BLOCKED until backend delivers the endpoint.** This IA documents the full FE scope so that:
- Backend brief can be sent to Gyan immediately
- FE implementation can begin the moment backend delivers
- Gate 3 plan can be written now (pending endpoint URL)

---

## 3. Data Flow Trace

### 3.1 Current Flow (no edit capability)

```
Menu → click customizable item → ItemCustomizationModal
  → Select size, variations, add-ons, qty, notes
  → "Add to Order" → addCustomizedItemToCart()
  → Item goes to cart as NewItemRow (placed: false)
  → "Update Order" / "Place Order" → API
  → Item becomes PlacedItemRow (placed: true)
  → ❌ NO WAY BACK — cannot re-edit variations
```

### 3.2 Target Flow (after CR-551)

```
PlacedItemRow → "Edit" icon (gated: order_edit permission + item not served/cancelled + !isEditLocked)
  → Builds selection-shape item from placed item's API data
  → Opens ItemCustomizationModal in EDIT MODE (pre-populated)
  → User changes variations/add-ons/size
  → "Save" → editFoodItem() API call
  → Backend: updates orderDetails row, recalculates amounts
  → Socket: "update-order" → OrderContext updates → UI refreshes
  → No KOT emitted (OD-551-02)
```

### 3.3 Key Data Mapping Gap

Placed items from API carry variations in **response shape**:
```json
{
  "variation": [
    { "name": "1.Base", "type": "single", "values": [{ "label": "Whole Wheat Noodles", "optionPrice": "65" }] }
  ]
}
```

`ItemCustomizationModal` expects **selection shape**:
```javascript
{
  selectedVariants: { "group-id-1": { id: "...", label: "Whole Wheat Noodles", price: 65 } },
  selectedAddons: [{ id: 301, quantity: 1 }],
  selectedSize: { id: "...", label: "Regular", price: 365 }
}
```

**A mapping function is needed** to convert API response → selection format. This is the core FE complexity.

Additionally, the placed item needs access to the **full catalog data** (`variantGroups`, `addons`, `sizes`) for the modal to render all options (not just the selected ones). This data is available from `products` in `MenuContext` — matched by `food_id`.

---

## 4. Affected Files

| # | File | R5? | Change | Effort |
|---|------|-----|--------|--------|
| 1 | `api/constants.js` | NO | Replace `'TBD'` with actual endpoint URL (L92) | 1 line |
| 2 | `api/transforms/orderTransform.js` | **YES** | Add `editFoodItem(orderId, item, selections)` transform — builds API payload from modal selections | ~20 lines |
| 3 | `api/services/orderService.js` | NO | Add `editFoodItem()` API call (PUT to new endpoint) | ~8 lines |
| 4 | `components/order-entry/CartPanel.jsx` | **YES** | Add "Edit" button to `PlacedItemRow` (L65): gated by `order_edit` permission + `item.status !== 'served'` + `item.status !== 'cancelled'` + `!isEditLocked` + item has variations/addons | ~10 lines |
| 5 | `components/order-entry/OrderEntry.jsx` | **YES** | Wire edit click → build selection-shape item → open `ItemCustomizationModal` in edit mode → handle save callback → call `editFoodItem()` API | ~25 lines |
| 6 | `components/order-entry/ItemCustomizationModal.jsx` | NO | Add `editMode` prop + `onSaveEdit` callback. When `editMode=true`: button text → "Save Changes", callback → `onSaveEdit(selections)` instead of `onAddToOrder`. Pre-population already works (L28-65). | ~8 lines |
| 7 | `api/transforms/orderTransform.js` (fromAPI) | **YES** | Ensure `fromAPI.order` preserves raw `variation` and `add_ons` arrays on placed items so the mapping function has source data | ~5 lines (verify existing, may already be there) |

**NEW file needed:**
| 8 | `utils/variationSelectionMapper.js` | NO | Maps API response variation/addon shape → ItemCustomizationModal selection shape. Needs catalog lookup from `products` for full option lists. | ~40 lines |

**Total: 7 existing files + 1 new utility, ~117 lines. 4 R5 hotspot files.**

---

## 5. Detailed Edit Analysis

### 5.1 PlacedItemRow Edit Button (CartPanel.jsx L65)

Current `PlacedItemRow` props:
```javascript
{ item, displayQty, setCancelItem, setTransferItem, editingQtyItemId, setEditingQtyItemId,
  updateQuantity, canCancelItem, canFoodTransfer, isItemCancelAllowed, isEditLocked, kbdRowProps }
```

**New props needed:**
- `onEditItem` — callback: `(item) => void`
- `canEditVariations` — boolean (from permission + item state)

**OD-551-05 (revised): Combine qty + variations in one modal.** The existing qty pencil icon on PlacedItemRow is **replaced** by the new Edit button. The Edit button opens `ItemCustomizationModal` with qty stepper + variations + add-ons. The separate `editingQtyItemId` / `setEditingQtyItemId` / `updateQuantity` props remain for backward compat on items without variations (plain items still use the inline pencil for qty-only edits). For items WITH variations/addons, the pencil is hidden and the Edit button is the single entry point.

**Edit button placement:** After the cancel button (XCircle), before the item name. Same 9×9 circle style. Uses `Pencil` icon from lucide-react. Gated:
```javascript
const hasCustomizations = item.hasVariations || item.hasAddons;
const showEditBtn = !isCancelled
  && item.status !== 'served'
  && item.status !== 'ready'  // OD-551-01: only before served
  && !isEditLocked            // CR-489 lock
  && canEditVariations
  && hasCustomizations;

// OD-551-05: hide qty pencil for customizable items — edit modal handles qty
const showQtyPencil = !isCancelled && !isEditLocked && !hasCustomizations;
```

### 5.2 variationSelectionMapper (new utility)

```javascript
// Input: placed item from API (orderTransform.fromAPI.order shape)
//   item.variation = [{ name, type, values: [{ label, optionPrice }] }]
//   item.addOns = [{ id, name, quantity, price }]
//   item.sizeId / item.sizeName / item.sizePrice
//
// Catalog: product from MenuContext.products (matched by food_id)
//   product.variantGroups = [{ id, name, type, required, options: [{ id, label, price }] }]
//   product.addons = [{ id, name, price }]
//   product.sizes = [{ id, label, price }]
//
// Output: ItemCustomizationModal-compatible item
//   { ...product, selectedVariants, selectedAddons, selectedSize, qty, notes }
```

This is the key complexity. Must handle:
- Matching API `variation[].name` to catalog `variantGroups[].name`
- Multi-select groups (`values` array with multiple entries)
- Add-ons with quantities
- Size matching by name or ID

### 5.3 OrderEntry.jsx Edit Handler

```javascript
// Near L3026 (where ItemCustomizationModal is rendered):
const handleEditPlacedItem = useCallback(async (item) => {
  // 1. Find catalog product by food_id
  const product = products.find(p => p.id === item.foodId);
  if (!product) { toast({ title: 'Product not found', variant: 'destructive' }); return; }

  // 2. Map placed item → selection shape
  const editItem = mapPlacedItemToSelections(item, product);
  editItem._editMode = true;
  editItem._editItemId = item.id;  // orderDetails[].id for the API call
  editItem._editOrderId = orderData?.orderId;

  // 3. Open modal
  setCustomizationItem(editItem);
}, [products, orderData]);
```

The `ItemCustomizationModal` `onAddToOrder` callback needs a fork:
```javascript
// If item._editMode → call onSaveEdit instead of onAddToOrder
// onSaveEdit calls orderService.editFoodItem() with the new selections
```

---

## 6. Permission Gating

**Existing permission:** `order_edit` (profileTransform.js L429)
```javascript
orderEditAccess: toBoolean(apiSettings.settings?.order_edit_access ?? apiSettings.order_edit_access)
```

**Additional gate:** CR-489 / BUG-656 edit lock (`isEditLocked` prop already flows to PlacedItemRow).

**No new permission needed** (OD-551-03).

---

## 7. Socket Handling

Backend emits `update-order` after edit. The existing socket handler in `socketHandlers.js` → `handleUpdateOrder` → `OrderContext.updateOrder()` will process the updated order data automatically. **No socket handler changes needed.**

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Backend endpoint doesn't exist | **BLOCKING** | Backend brief to Gyan. FE implementation deferred until endpoint delivers. |
| Response→selection mapping incorrect for complex variations (Woko: 5 groups, multi-select) | HIGH | Build comprehensive mapper with unit tests covering: single-select required, multi-select, optional groups, priced options. Test with Woko order #002397 data. |
| Tax recalculation inconsistency between FE cart and backend | MEDIUM | FE sends raw amounts; backend recalculates authoritatively (OD-551-04). FE updates from socket response. |
| `orderTransform.fromAPI.order` doesn't preserve raw variation data | MEDIUM | Verify at implementation entry. If missing, add preservation (small change to existing transform). |
| CR-482 keyboard nav conflict on PlacedItemRow | LOW | CR-482 added `kbdRowProps` — new edit button is a standard child element, doesn't interfere with arrow nav. |
| `ItemCustomizationModal` edit mode may not handle all edge cases | MEDIUM | Test with: items with no variations (shouldn't show edit), items with only add-ons, items with size+variants+addons. |

---

## 9. Verification Matrix

| # | Test | Expected | Automated? |
|---|------|----------|:---:|
| V-1 | `constants.js` EDIT_ORDER_ITEM | Actual endpoint URL (not 'TBD') | NO (code) |
| V-2 | `editFoodItem(orderId, itemId, selections)` transform | Correct API payload shape matching §2.2 contract | YES (unit) |
| V-3 | `variationSelectionMapper(placedItem, catalogProduct)` | Correct selection shape for ItemCustomizationModal | YES (unit) |
| V-4 | Edit button visible for placed item with variations, before served | Button renders with `data-testid="edit-item-btn-{id}"` | NO (browser) |
| V-5 | Edit button hidden for served/cancelled items | No edit button | NO (browser) |
| V-6 | Edit button hidden when `isEditLocked=true` | No edit button | NO (browser) |
| V-7 | Edit button hidden for items without variations/addons | No edit button; qty pencil still shows for plain items | YES (unit) |
| V-8 | Click edit → modal opens pre-populated with current selections + qty | Correct size, variants, addons, qty shown; qty stepper functional | NO (browser) |
| V-9 | Change variation + qty → Save → API call with correct payload | PUT to edit-food-item with updated selections AND new qty | NO (browser) |
| V-10 | After edit → order amounts updated (socket) | UI shows new totals | NO (browser) |
| V-11 | Non-customizable item (no variations/addons) | No edit button, no regression | YES (code) |
| V-12 | `order_edit` permission OFF | Edit button hidden for all items | NO (browser) |
| VR-1 | Existing qty pencil still works for plain (non-customizable) items | BUG-237 delta pattern unchanged for items without variations/addons | NO (browser) |
| VR-2 | Cancel item still works | XCircle button unchanged | NO (browser) |
| VR-3 | Build | `yarn build` exit 0, 0 new warnings | YES |

---

## 10. Downstream Consumers

| Consumer | Impact |
|----------|--------|
| `CollectPaymentPanel.jsx` | None — receives order totals from context, not item details |
| `OrderCard.jsx` | None — displays items from order data, auto-updates via socket |
| Print (KOT/Bill) | None for edit (OD-551-02: no KOT). Bill recalculated by backend. |
| Reports | None — read from backend order data, which is updated by the edit endpoint |
| Kitchen Display (KDS) | None — no KOT emitted on edit (OD-551-02) |

---

## 11. Gate Status

```
Impact Analysis: CR-551
Code Reality: NONE — backend endpoint does not exist
Backend Dependency: BLOCKING — brief to Gyan required
Conflict Pre-Check: NONE (all additive)
ODs: ALL LOCKED (OD-551-01…05)
Files WILL change: 7 existing + 1 new utility (~117 lines)
Files will NOT touch: CollectPaymentPanel.jsx, socketHandlers.js, OrderContext.jsx, any report/print/settings
Hotspots: orderTransform.js (R5), CartPanel.jsx (R5), OrderEntry.jsx (R5), ItemCustomizationModal.jsx
Next step: Backend brief to Gyan → endpoint delivery → Gate 3 Implementation Plan → Gate 4 GO
```
