# Deep Investigation Report: No Edit for Add-ons/Variations After Placing

**Date:** 2026-11-17 (DEEP INVESTIGATION v2)
**Investigator:** Agent (Investigation Role)
**Confidence:** HIGH (curl-probed, full API + FE traced)
**Steps used:** 10/10
**Test Account:** owner@woko.com / Order #002397 (order_id: 1578830)

---

## 1. Summary

**Root cause:** There is NO backend API endpoint for editing variations/add-ons on a placed item. The `update-place-order` API only accepts NEW items in `cart-update[]`. The frontend `EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY` endpoints are both `'TBD'` (placeholder, never implemented — see `constants.js:92-93`, tagged as `CHG-040`). All 5 probed edit endpoints returned HTTP 404 from backend.

**Classification:** BACKEND_GAP + FE_FEATURE_GAP — This is NOT a frontend-only issue. The backend has no route for it.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | Frontend hides an existing edit button | Code trace: PlacedItemRow | 1 | ELIMINATED | No onCustomize prop, no edit button for variations (only qty pencil) |
| H2 | update-place-order can modify existing items | Code trace: orderTransform.updateOrder | 2 | ELIMINATED | `cart-update` only contains newItems (line 1210). allCartItems used only for financial totals |
| H3 | A dedicated edit-item API exists on backend | Curl probe: 5 endpoints | 1 | ELIMINATED | All returned HTTP 404: edit-food-item, update-food-item, edit-order-item, modify-food-item (v1+v2) |
| H4 | Frontend has planned endpoints (TBD) | Code trace: constants.js | 1 | CONFIRMED | Lines 92-93: `EDIT_ORDER_ITEM: 'TBD'` and `EDIT_ORDER_ITEM_QTY: 'TBD'` — tagged CHG-040, never built |
| H5 | ItemCustomizationModal supports edit mode | Code trace | 1 | PARTIAL | Modal CAN pre-populate from `item.selectedVariants` / `item.selectedAddons` / `item.selectedSize` (lines 32-65) — but it's only wired for pre-placed items |
| H6 | Qty edit on placed items uses a different mechanism | Code trace: updateQuantity | 1 | CONFIRMED | Qty edit creates an unplaced DELTA item (BUG-237 pattern, line 999-1036) — doesn't modify the placed item |
| H7 | Cancel + re-add could be automated atomically | API trace: cancel-food-item + place-order | 1 | PARTIAL | Technically possible but requires 2 API calls + KOT implications |

---

## 3. API Probe Results

### 3a. Order #002397 Detail (curl: get-single-order-new)
```
order_id:              1578830
restaurant_order_id:   002397
f_order_status:        5 (Preparing)
order_amount:          474

Item:
  food_id:             225204
  food_name:           Your Wok. Your Way.
  unit_price:          365.00
  quantity:            1
  total_variation_price: 65.00
  total_add_on_price:  0
  food_status:         (served/preparing)

  Variations (5 groups):
    1.Base:            Whole Wheat Noodles (₹65)   [single, required]
    5.Flavour:         OG Street Style (₹0)        [single, required]
    8.Spice Level:     No Spice (₹0)               [single, required]
    2.Regular Veggies: Mushroom (₹0)               [multi 1-3, required]
    6.Toppings:        Crispy Onion (₹0)           [multi 0-2, optional]
  
  Add-ons: []
```

### 3b. Backend Edit Endpoint Probes
| Endpoint | Method | Status | Result |
|----------|--------|--------|--------|
| `/api/v2/vendoremployee/order/edit-food-item` | POST | **404** | Not Found |
| `/api/v2/vendoremployee/order/update-food-item` | POST | **404** | Not Found |
| `/api/v2/vendoremployee/order/edit-order-item` | POST | **404** | Not Found |
| `/api/v2/vendoremployee/order/modify-food-item` | POST | **404** | Not Found |
| `/api/v1/vendoremployee/order/edit-food-item` | POST | **404** | Not Found |

### 3c. Existing API Capabilities
| Endpoint | Purpose | Can Edit Variations? |
|----------|---------|---------------------|
| `place-order` | Create new order with items | YES (initial placement only) |
| `update-place-order` | Add NEW items to existing order | NO — `cart-update` = new items only |
| `cancel-food-item` | Cancel a placed item | N/A — removes item, doesn't edit |
| `food-status-update` | Change item status (preparing/ready/served) | NO |
| `order-bill-payment` | Collect payment / settle | NO |
| `order-discount-manage` | Apply discount config | NO |
| `EDIT_ORDER_ITEM` | Edit placed item | **TBD — NOT IMPLEMENTED** |

---

## 4. Data Flow Trace

### Current flow (no edit):
```
Menu → click customizable item → ItemCustomizationModal
  → Select size, variations, add-ons, qty, notes
  → "Add to Order" → addCustomizedItemToCart()
  → Item goes to cart as NewItemRow (placed: false)
  → "Update Order" / "Place Order" → API call
  → Item becomes PlacedItemRow (placed: true)
  → ❌ NO WAY BACK — cannot re-edit variations
```

### Qty edit flow (placed items) — BUG-237:
```
PlacedItemRow → Pencil icon → qty stepper
  → updateQuantity(itemId, newQty, isPlaced=true)
  → Creates UNPLACED delta item with same food_id + same variations
  → Delta qty = newQty - originalQty
  → "Update Order" sends delta as NEW item in cart-update[]
  → Backend adds delta as new line (same food, same variations)
```

### What would be needed for variation edit:
```
PlacedItemRow → Edit icon → ItemCustomizationModal (edit mode)
  → Pre-populate: existing size, variants, addons, qty
  → User changes variations/addons
  → "Save" → API call: edit-food-item (NEW ENDPOINT NEEDED)
  → Payload: { order_id, item_id, new_variations, new_add_ons, ... }
  → Backend: update orderDetails row, recalculate amounts
  → Socket: emit update-order with new item data
  → KOT: optionally fire new KOT for kitchen
```

---

## 5. What update-place-order Payload Contains

```json
{
  "order_id": "1578830",
  "order_type": "walk_in",
  "cust_name": "",
  "cust_mobile": "",
  "payment_method": "pending",
  "payment_status": "unpaid",
  
  // Financial — COMBINED totals (placed + new)
  "order_amount": 474,
  "tax_amount": "...",
  
  // ONLY NEW ITEMS — not existing placed items
  "cart-update": [
    {
      "food_id": 12345,
      "quantity": 1,
      "variations": [{"name": "Size", "values": {"label": ["Large"]}}],
      "add_on_ids": [101, 102],
      "add_on_qtys": [1, 2],
      "food_amount": 100,
      "variation_amount": 50,
      "addon_amount": 30,
      // ...
    }
  ]
}
```

**Key:** `cart-update` is ALWAYS new items. There is NO mechanism to modify an existing `orderDetails[].id` entry.

---

## 6. Backend Requirements (BACKEND_ASK)

### New Endpoint Needed: `edit-food-item` or `update-food-item`

**Proposed contract:**
```
PUT /api/v2/vendoremployee/order/edit-food-item
Content-Type: application/json
Authorization: Bearer <token>

{
  "order_id":       1578830,
  "item_id":        <orderDetails[].id>,     // The specific order line to edit
  "food_id":        225204,                   // Food catalog ID (unchanged)
  "quantity":       1,                        // Can also change qty
  "variations": [
    { "name": "1.Base", "values": { "label": ["Udon Noodles"] } },
    { "name": "5.Flavour", "values": { "label": ["Teriyaki"] } }
  ],
  "add_on_ids":     [301, 302],
  "add_on_qtys":    [1, 1],
  "food_amount":    365,
  "variation_amount": 95,                    // New variation price
  "addon_amount":    60,                     // New addon price
  "food_level_notes": "Extra sauce"
}

Response: {
  "success": true,
  "order": { ... updated order with recalculated amounts ... }
}

Socket emit: "update-order" with full order data
```

### Backend Must:
1. Find the `orderDetails` row by `item_id`
2. Replace `variation`, `add_ons`, `total_variation_price`, `total_add_on_price`
3. Recalculate `order_amount`, tax amounts, service charge
4. Emit `update-order` socket event
5. Optionally: emit KOT for kitchen with "MODIFIED" flag
6. Respect `order_edit_access` permission (CR-489 / BUG-656 lock)

### Business Rules to Decide:
- Should edit be allowed after any status? Or only before `ready`/`served`?
- Should a modified KOT be sent to kitchen?
- Should there be a separate permission (`edit_customization`) or use existing `order_edit`?
- Price changes from variation edits — recalculate tax? Service charge?

---

## 7. Frontend Implementation Requirements (after backend is ready)

### FE Changes Needed:
| File | Change |
|------|--------|
| `api/constants.js:92` | Replace `'TBD'` with actual endpoint URL |
| `api/transforms/orderTransform.js` | Add `editFoodItem()` transform (similar shape to `buildCartItem`) |
| `api/services/orderService.js` | Add `editFoodItem()` API call |
| `CartPanel.jsx` PlacedItemRow | Add edit icon button (gated by permission + item status) |
| `OrderEntry.jsx` | Wire edit click → open ItemCustomizationModal in edit mode |
| `ItemCustomizationModal.jsx` | Add edit mode: pre-populate from placed item's backend data, different callback |
| `orderTransform.js` fromAPI.order | Ensure placed items carry `variantGroups` + `addons` catalog data for re-edit |

### ItemCustomizationModal Already Supports Pre-population:
Lines 32-65 show it can pre-fill from:
- `item.selectedSize` → setSelectedSize
- `item.selectedVariants` → setSelectedVariants  
- `item.selectedAddons` → setSelectedAddons
- `item.qty` → setQuantity
- `item.notes` → setNotes

**Gap:** Placed items from API carry `variation` in RESPONSE shape (`[{name, type, values: [{label, optionPrice}]}]`), not the `selectedVariants` shape (`{groupId: optionObject}`). A mapping function is needed to convert response → selection format.

---

## 8. Evidence Artifacts

| Artifact | Path |
|----------|------|
| Order 002397 raw data | `memory/evidence/CR-EDIT-VARIATIONS/order_2397_raw.json` |
| Order 002397 detail | `memory/evidence/CR-EDIT-VARIATIONS/order_2397_detail.json` |
| Item detail (variations) | `memory/evidence/CR-EDIT-VARIATIONS/item_detail_2397.json` |

---

## 9. Recommendations

**Classification:** BACKEND_ASK + FE_FEATURE_IMPLEMENTATION

1. **File Backend Brief** for `edit-food-item` endpoint (see §6 contract)
2. **Register as new CR** — this is not a bug, it's a missing capability
3. After backend delivers endpoint:
   - FE implementation is ~7 files, MEDIUM-HIGH risk (financial recalc + kitchen flow)
   - ItemCustomizationModal already has 80% of the edit UI — needs response→selection data mapping
4. **Planning skip eligible:** NO — multi-file, backend dependency, financial area, kitchen impact

---

## 10. Retroactive Candidates

- `CHG-040` referenced in `constants.js:92-93` — a planned change that was never executed. Should be formally registered if proceeding.
