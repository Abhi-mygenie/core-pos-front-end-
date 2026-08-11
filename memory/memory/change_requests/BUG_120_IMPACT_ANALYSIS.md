# BUG-120 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-09

---

## BUG-120-A — Input Fields Lose Focus After Every Keystroke

### Root Cause: CONFIRMED

**File:** `ProductForm.jsx` lines 61-73, 75-87, 89-100

The `InputField`, `SelectField`, and `ToggleField` sub-components are **defined INSIDE the render body** of `ProductForm`. React treats inline component definitions as new component types on every render. When `setForm()` updates state → parent re-renders → React sees "new" InputField type → unmounts old + mounts new → **focus is lost**.

```jsx
// LINE 61 — THIS IS THE BUG
const InputField = ({ label, value, onChange, type = "text", ...props }) => (
  <div className="py-2">
    ...
  </div>
);
```

Every keystroke calls `update()` → `setForm()` → re-render → `InputField` is redefined → React unmounts/remounts the input → focus lost.

### Fix

Move `InputField`, `SelectField`, and `ToggleField` **OUTSIDE** the `ProductForm` component (above it, at module scope). They have no dependency on `ProductForm` closure — they receive all data via props.

### Risk: LOW — pure refactor, no logic change.

---

## BUG-120-B — Image Upload Destination

### Investigation Complete

**Flow traced:**

1. `ProductForm.jsx` L141-151: `<input type="file">` → stores file in `form.imageFile`
2. `ProductForm.jsx` L370-372: On save, calls `menuService.addFood(foodInfo, form.imageFile)` or `menuService.editFood(id, foodInfo, form.imageFile)`
3. `menuManagementService.js` L26-33 (`addFood`): Creates `FormData` with `food_info` JSON + `image` file field → `POST /api/v2/vendoremployee/product/add-food`
4. `menuManagementService.js` L36-43 (`editFood`): Same pattern → `POST /api/v2/vendoremployee/product/foods/{id}`

**Destination:** The image is uploaded to **preprod.mygenie.online** backend. From the live API response:
```
image: "https://preprod.mygenie.online/storage/restaurant_panel/aggregater_img/2026-06-0..."
```

**Storage path:** `preprod.mygenie.online/storage/restaurant_panel/aggregater_img/` (server-side storage, likely Laravel storage).

**Status:** Image upload IS working — the backend handles multipart/form-data and stores the image. The image URL is returned in the `foods-list` response.

### Action: Document for owner. No code fix needed.

---

## BUG-120-C — Variation Creation UI Missing + Form UX Redesign

### Current State

- `ProductForm.jsx` L263-278: Variations shown as **read-only chips** with note "Read-only — full CRUD coming later"
- No UI to create/edit/delete variation groups (e.g., Size: S/M/L) or individual options
- Form is a flat scroll of fields with no section headers

### API Shape (verified from live response)

```json
"variation": [
  {
    "name": "Size",
    "type": "multi",
    "required": "on",
    "min": 1,
    "max": 1,
    "values": [
      { "label": "Small", "optionPrice": "50" },
      { "label": "Medium", "optionPrice": "100" },
      { "label": "Large", "optionPrice": "150" }
    ]
  }
]
```

The `food_info` payload for add/edit already supports `variations` (see `toAPI.foodInfo` L238: `...(form.variations ? { variations: form.variations } : {})`). So the **backend accepts variations** — we just need the UI.

### Scope

**Two sub-tasks:**

1. **Form UX Redesign:** Group fields into collapsible sections:
   - Basic Info (Name, Description, Image)
   - Pricing & Tax (Price, Tax%, Tax Type, Discount, Discount Type, Give Discount)
   - Classification (Category, Item Code, Food Type, Allergens, Kcal)
   - Availability (Dine-in, Delivery, Takeaway, Live Web, Times)
   - Variations (NEW — full CRUD)
   - Add-ons (existing addon selector)
   - Operations (Prep Time, Serve Time, Charges)
   - Status & Flags (Complementary, Inventory, Packaged Item)

2. **Variation CRUD UI:**
   - Add variation group (Name, Type: single/multi, Required, Min/Max)
   - Add options within group (Label, Price)
   - Edit/Delete variation groups and options
   - Send `variations` array in `food_info` payload on save

### Risk: MEDIUM — significant UI change to ProductForm.jsx. No backend change needed.

---

## BUG-120-D — `is_inventory` & `packed_food` + Full API Field Audit

### Live API Audit (2026-06-09, cafe103 rid=644)

**API now returns 63 fields** (was 30 when CR-014 was built). Backend has added ALL previously-missing fields:

| Field | Status | Value (sample) | Action |
|-------|--------|----------------|--------|
| `is_inventory` | ✅ NOW PRESENT | `"Yes"` | **Enable in UI + transform** |
| `packed_food` | ✅ NOW PRESENT | `"No"` | **Enable in UI + transform** |
| `egg` | ✅ NOW PRESENT | `0` (int) | Already mapped via `item_type`. Redundant field — no change needed |
| `jain` | ✅ NOW PRESENT | `0` (int) | Already mapped via `item_type`. Redundant field — no change needed |
| `stock_out` | ✅ NOW PRESENT | `"N"` | **Wire into transform + UI** (Out of Stock badge) |
| `is_disable` | ✅ NOW PRESENT | `"N"` | **Wire into transform + UI** (Hidden from POS badge) |
| `station_name` | ❌ STILL MISSING | — | Not at food level — managed at category level. No action. |
| `tax_calc` | ✅ NOW PRESENT | `"Inclusive"` | **Wire into transform + UI** (Tax Inclusive/Exclusive toggle) |
| `veg` | ✅ NOW PRESENT | `0` (int) | Redundant with `item_type`. No change needed. |

**Additional new fields detected (not in original 30):**
- `slug`, `food_status`, `food_stock`, `order_count`, `avg_rating`, `rating_count`, `recommended`, `restaurant_id`, `recipe_id`, `is_recipe`, `category_ids`, `attributes`, `choice_options`, `source_table`, `created_at`, `updated_at`, `web_available_time_starts/ends`

Most are read-only metadata. Key ones to consider:
- `is_recipe` / `recipe_id`: Could show recipe badge. Defer.
- `web_available_time_starts/ends`: Online-specific times. Defer.

### Files to Change

1. **`menuManagementTransform.js` (`fromAPI.food`):** Add `isInventory`, `packedFood`, `isOutOfStock`, `isDisabled`, `taxCalc` mappings
2. **`menuManagementTransform.js` (`toAPI.foodInfo`):** Add `is_inventory`, `packed_food`, `stock_out`, `is_disable`, `tax_calc` in write payload
3. **`menuManagementTransform.js` (`toAPI.bulkFoodInfo`):** Uncomment `packed_food`, `is_inventory`; add `stock_out`, `is_disable`, `tax_calc`
4. **`ProductForm.jsx`:** Add Inventory toggle, Packaged Item toggle, Tax Calc toggle, Stock Out toggle, Disabled toggle (part of BUG-120-C section redesign)
5. **`ProductCard.jsx`:** Add badges for Inventory, Packaged, Out of Stock, Disabled
6. **`BulkEditor.jsx`:** Enable `packedFood`, `isInventory` columns; add `stockOut`, `isDisabled`, `taxCalc` columns

### Risk: LOW — additive changes to existing transform + UI.

---

## BUG-120-E — Menu Writes Not Updating MenuContext via Socket

### Investigation

**Current socket architecture for food updates:**

1. **Channel:** `food_update_${restaurantId}` (e.g., `food_update_644`)
2. **Handler:** `handleFoodUpdate` in `socketHandlers.js` L878-898
3. **Flow:** Socket envelope `{ type: 'update-food', food_id, restaurant_id, food_details }` → `productFromAPI.product(food_details)` → `addOrUpdateProduct()` in MenuContext

**The handler EXISTS and works for "Add Custom Item" (add-single-product API).** The question is: **does the Menu Management API (`/product/add-food`, `/product/foods/{id}`, etc.) emit the same `food_update_${rid}` socket event?**

### Findings

The socket handler at L885 checks `type === SOCKET_EVENTS.UPDATE_FOOD` (which is `'update-food'`). If the Menu Management APIs emit the same `food_update_${rid}` channel with `type: 'update-food'`, the handler should work.

**Possible issues:**
1. Menu Management APIs may emit a **different type** string (e.g., `'menu-update'` instead of `'update-food'`)
2. Menu Management APIs may emit to a **different channel** entirely
3. The `food_details` payload shape from Menu Management may differ from `add-single-product`
4. **Category CRUD** likely does NOT emit `food_update` — it would need a category-specific handler or a products-refresh trigger
5. The `productFromAPI.product()` transform (from `productTransform.js`, the OLD transform) is used — this may not map all the new 63 fields correctly

### Recommended Investigation Steps (at implementation)
1. Trigger a food edit via Menu Management UI while monitoring the `food_update_644` socket channel in browser console
2. Check if the event fires and what the `type` and `food_details` shape is
3. If it fires with correct shape → the handler should work (verify)
4. If it doesn't fire → backend issue (not FE)
5. For category CRUD → after category add/edit/delete, trigger a full MenuContext refresh (re-fetch products list) since categories affect product grouping

### Risk: MEDIUM — depends on backend socket behavior. FE fix may be a full products re-fetch after menu management writes.

---

## Summary — All 5 Sub-Bugs

| Sub-Bug | Root Cause | Fix Complexity | Risk |
|---------|-----------|---------------|------|
| **A** | InputField/SelectField/ToggleField defined inside render → remount on every keystroke | LOW — move outside component | LOW |
| **B** | Image uploads to `preprod.mygenie.online/storage/restaurant_panel/aggregater_img/` via multipart FormData | NONE — working correctly, just needs documentation | ZERO |
| **C** | Variation CRUD UI never built (was "read-only coming later") + form needs section layout | HIGH — new Variation UI + form restructure | MEDIUM |
| **D** | 8 fields now available in API (was 0 when CR-014 built). Transform + UI not wired. | MEDIUM — transform + UI additive changes | LOW |
| **E** | Socket handler exists but needs verification that Menu Management APIs emit same event. Category ops likely need separate handling. | MEDIUM — investigation at impl time + possible fallback refresh | MEDIUM |

---

*End of Impact Analysis — Gate 2 Complete. Next: Gate 3 (Implementation Plan).*
