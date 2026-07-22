# CR-072 — Impact Analysis (Gate 2)

**ID:** CR-072
**Title:** Inventory Management — Migration from Old POS to New POS
**Date:** 2026-07-15
**Code Reality:** NONE
**Conflict Pre-Check:** No conflicts — no inventory module files exist yet
**Risk:** HIGH (complex module, 5 sub-modules, 37 API endpoints, unit-conversion logic, purchase financials)

---

## 1. Executive Summary

The old POS inventory module spans **5 distinct sub-modules** with **37 API endpoints** (all verified live on `manage.mygenie.online`). The system manages raw material ingredients, stock levels with low-stock alerts, purchase entries, recipes (food→ingredient BOM), sub-recipes (reusable prep components that become trackable inventory), and addon recipes.

**Key architectural insight:** Sub-recipes are dual-natured — they are both recipe definitions AND inventory stock items. When a sub-recipe is created, the backend automatically creates a corresponding inventory entry (type="SubRecipe") with its own stock level and alerts.

---

## 2. API Surface Map (37 Endpoints, All Probed)

### Module A: Ingredients Master (8 endpoints)

| # | Label | Method | Endpoint | Purpose | Probed |
|---|-------|--------|----------|---------|:---:|
| A1 | get-inventory-master | GET | `/inventory/get-inventory-master` | List all ingredients (10 items) | ✅ |
| A2 | add-inventory | POST | `/inventory/add-inventory` | Add ingredient(s) — **accepts array** | ✅ contract |
| A3 | stock-item-categories | GET | `/inventory/stock-item-categories` | List categories (5 items) | ✅ |
| A4 | store-category | POST | `/inventory/stock-item-categories/store` | Add category | ✅ contract |
| A5 | export-inventory-master | GET | `/inventory/export-inventory-master` | Export ingredients as Excel | ✅ contract |
| A6 | import-inventory | POST | `/inventory/import-inventory` | Import ingredients Excel (multipart) | ✅ contract |
| A7 | delete-ingredient | DELETE | `/inventory/ingredient/{id}` | Delete ingredient | ✅ contract |
| A8 | get-unit | GET | `/expense/get-unit` | Units list (13 units) — **shared with Expense module** | ✅ |

### Module B: Stock Management (10 endpoints)

| # | Label | Method | Endpoint | Purpose | Probed |
|---|-------|--------|----------|---------|:---:|
| B1 | stock-inventory | GET | `/inventory/stock-inventory` | Current stock levels with low-stock flags | ✅ |
| B2 | unit-inventory | GET | `/inventory/unit-inventory/{id}` | Units for specific ingredient | ✅ |
| B3 | update-stock | POST | `/inventory/update-stock/{id}` | Update stock level + min alert | ✅ contract |
| B4 | add-stock | POST | `/inventory/add-stock/{id}` | Add stock / physical count adjustment | ✅ contract |
| B5 | add-purchase | POST | `/inventory/add-purchase` | Purchase entry — **multi-line items** | ✅ contract |
| B6 | export-stock | GET | `/inventory/export-stock` | Export stock as Excel | ✅ contract |
| B7 | upload-stock-excel | POST | `/inventory/upload-stock-excel` | Import stock Excel (multipart) | ✅ contract |
| B8 | vendor-type | GET | `/inventory/vendor-type` | Vendor types (5 types) | ✅ |
| B9 | payment-method | GET | `/expense/payment-method` | Payment methods (9 options) — **shared with Expense** | ✅ |
| B10 | wastage-reasons | GET | `/inventory/wastage-reasons` | Wastage reasons (4 reasons) | ✅ |

### Module C: Recipes / BOM (7 endpoints)

| # | Label | Method | Endpoint | Purpose | Probed |
|---|-------|--------|----------|---------|:---:|
| C1 | get-recipe | GET | `/recipe/get-recipe` | List recipes (1 recipe) | ✅ |
| C2 | store-recipe | POST | `/recipe/store-recipe` | Add recipe | ✅ contract |
| C3 | update-recipe | POST | `/recipe/update-recipe/{id}` | Update recipe | ✅ contract |
| C4 | delete-recipe | DELETE | `/recipe/delete-recipe/{id}` | Delete recipe | ✅ contract |
| C5 | export-sample-recipe | GET | `/recipe/export-sample-recipe` | Blank template Excel | ✅ contract |
| C6 | export-recipe | GET | `/recipe/export-recipe` | Export with data | ✅ contract |
| C7 | import-recipe | POST | `/recipe/import-recipe` | Import Excel (multipart) | ✅ contract |

### Module D: Sub-Recipes (7 endpoints)

| # | Label | Method | Endpoint | Purpose | Probed |
|---|-------|--------|----------|---------|:---:|
| D1 | sub-recipes | GET | `/recipe/sub-recipes` | List sub-recipes (1 item) | ✅ |
| D2 | store-sub-recipe | POST | `/recipe/store-sub-recipe` | Add sub-recipe | ✅ contract |
| D3 | update-sub-recipe | POST | `/recipe/update-sub-recipe/{id}` | Update | ✅ contract |
| D4 | delete-sub-recipe | DELETE | `/recipe/delete-sub-recipe/{id}` | Delete | ✅ contract |
| D5 | export-sample-sub-recipe | GET | `/recipe/export-sample-sub-recipe` | Blank template | ✅ contract |
| D6 | export-sub-recipes | GET | `/recipe/export-sub-recipes` | Export with data | ✅ contract |
| D7 | import-sub-recipes | POST | `/recipe/import-sub-recipes` | Import Excel (multipart) | ✅ contract |

### Module E: Addon Recipes (4 endpoints — NO bulk import/export)

| # | Label | Method | Endpoint | Purpose | Probed |
|---|-------|--------|----------|---------|:---:|
| E1 | addon-recipe-list | GET | `/product/addon-recipe-list` | List addon recipes (1 item) | ✅ |
| E2 | store-addon-recipe | POST | `/product/store-addon-recipe` | Add | ✅ contract |
| E3 | update-addon-recipe | POST | `/product/update-addon-recipe/{id}` | Update | ✅ contract |
| E4 | delete-addon-recipe | DELETE | `/product/delete-addon-recipe/{id}` | Delete | ✅ contract |

### Supporting APIs

| # | Label | Method | Endpoint | Purpose | Probed |
|---|-------|--------|----------|---------|:---:|
| S1 | active-foods-list | GET | `/product/active-foods-list` | Food items for recipe linking | ✅ |

---

## 3. Data Models (From Live API Responses)

### Ingredient (from `get-inventory-master`)
```json
{
  "id": 7593,
  "category_id": { "id": 798, "name": "Powder" },  // nested object (empty = uncategorized)
  "stock_title": "Coffee Powder",
  "type": "inventory",
  "unit": "pkt",                    // primary/big unit
  "small_unit": "pkt",             // small unit (same when no conversion)
  "cal_quantity": "3.00",          // quantity in SMALL units
  "quantity": "3.00",              // quantity in BIG units (derived)
  "display_unit": "pkt",
  "display_qty": "3.00",
  "min_qty_alert": "20.00",       // low-stock threshold
  "min_unit_alert": "pkt"         // threshold unit
}
```

**Unit conversion note:** When `unit` ≠ `small_unit` (e.g., kg/gm, ltr/ml), `cal_quantity` stores in small units. Example: 54kg = `cal_quantity: "54000.00"` (grams). When `unit` == `small_unit`, they're identical.

### Stock Item (from `stock-inventory` — enriched view)
```json
{
  "id": 8734,
  "category_id": 798,              // flat integer (differs from inventory-master!)
  "stock_title": "Chili Powder",
  "unit": "pkt",
  "small_unit": "pkt",
  "type": "inventory",             // or "SubRecipe"
  "recipe_id": null,               // non-null for sub-recipe items
  "subrecipe_id": null,
  "is_sub_recipe": false,
  "is_low_stock": true,            // pre-computed boolean
  "cal_quantity": "0.00",
  "quantity": "0.000",
  "display_unit": "pkt",
  "display_qty": "0.00",
  "min_qty_alert": "5.00",
  "min_unit_alert": "pkt",
  "status": "1",
  "physical_qty": "",
  "category_name": "Powder",       // denormalized
  "vendor_id": null,
  "vendor_name": ""
}
```

### Recipe (from `get-recipe`)
```json
{
  "recipe_id": 6185,
  "name": "Organic Espresso",       // = food_name
  "food_name": "Organic Espresso",
  "category_name": "COFFEE",        // food category, NOT ingredient category
  "preparation_time": "1",
  "serve_time": "1",
  "unit": "bottle",
  "serve_people": 1,
  "qty": "0",
  "type": "recipe",
  "ingredients": [
    { "ingredient_id": 7596, "ingredient_name": "Milk", "ingredient_unit": "ltr", "ingredient_qty": 2 }
  ]
}
```

**Recipe → Food link:** In the CREATE payload, `"name": 107840` is the `food_id` (not a string name). The API resolves this to the food item.

### Sub-Recipe (from `sub-recipes`)
```json
{
  "recipe_id": 168,
  "name": "Coffee paste",
  "food_name": "Coffee paste",      // NOT linked to a food item — standalone name
  "unit": "plates",
  "serve_people": 1,
  "qty": "1.00",
  "type": "sub_recipe",
  "inventory_id": 13801,            // linked inventory stock item
  "current_stock": "-27.00",        // current stock level
  "stock_unit": "plates",
  "min_qty_alert": "2.00",
  "min_unit_alert": "plates",
  "cal_quantity": "-27.00",
  "ingredients": [
    { "ingredient_id": 7594, "ingredient_name": "Water", "ingredient_unit": "ltr", "ingredient_qty": "1" }
  ]
}
```

**Dual nature:** Sub-recipes auto-create inventory entries (type="SubRecipe"). They appear in `stock-inventory` alongside raw ingredients.

### Addon Recipe (from `addon-recipe-list`)
```json
{
  "recipe_id": 6186,
  "addon_id": 11511,                // linked addon item
  "name": "Brown Sugar",
  "addon_name": "Brown Sugar",
  "addon_price": "10.00",           // addon selling price (informational)
  "preparation_time": "1",
  "serve_time": "1",
  "unit": "kg",
  "serve_people": 1,
  "qty": "1",
  "type": "addon_recipe",
  "ingredients": [...]
}
```

### Category
```json
{ "id": 798, "category_name": "Powder", "restaurant_id": 618, "type": "inventory", "p_catid": 0 }
```

### Reference Data
- **Units:** `["kg", "ltr", "bundle", "pkt", "piece", "bottle", "tank", "tin", "plates", "pieces", "Db", "gm", "ml"]`
- **Vendor Types:** 5 (Restaurant, Grocery Store, Wholesale Supplier, Retail Store, Online Vendor)
- **Payment Methods:** `["UPI", "Cash", "Card", "Unpaid", "Store", "UPI Drawer", "Cash Draw", "Bank Transfer", "Others"]`
- **Wastage Reasons:** 4 (Others, Expired, Pilferage, Spillage)

### Purchase Payload (most complex)
```json
{
  "tot_amount": 0, "item_total": 0, "tot_fair": "", "tot_tax": null,
  "purchase_date": "15-07-2026",    // DD-MM-YYYY format
  "payment_type": null, "vendor_id": null, "invoice": "",
  "physicalqty_master": true,
  "purchase_items": [{
    "Ingredient": 18142,             // ingredient id
    "quantity": 0, "Unit": "bottle", "Amount": 0,
    "physical_qty": "", "batch": "", "brand": "",
    "expiry": "", "expiry_date": "",
    "consumption_unit": "", "converion_factor": "",  // typo: "converion" (R9!)
    "waste_reason": "Physical stock count adjustment"
  }]
}
```

---

## 4. Critical Observations

### O1: API Host — RESOLVED
All inventory APIs will use `preprod.mygenie.online` as per `.env` (`REACT_APP_API_BASE_URL`). The curls shared by owner used `manage.mygenie.online` (older environment) but API contracts/response shapes are identical. No special host config needed — standard `api` axios instance handles it.

### O2: Shared APIs with Expense Module (CR-059)
- `get-unit` → already used by `expenseService.js`
- `payment-method` → already used by `expenseService.js`
- **Reuse:** Service functions + transforms already exist. Import, don't duplicate.

### O3: Unit Conversion Complexity
Ingredients have big-unit / small-unit pairs (kg/gm, ltr/ml). `cal_quantity` stores in small units. The FE must handle display conversion. Some ingredients have same big/small (pkt/pkt) — no conversion needed.

### O4: Negative Stock Quantities
Multiple items have negative quantities (Milk: -64, Jaggery: -33, Coffee paste: -27). This is valid — means consumption (via recipe deductions) exceeds purchases. The UI should surface this clearly (red/warning indicators).

### O5: Sub-Recipe Dual Nature
Sub-recipes create automatic inventory entries. The stock-inventory list includes both raw ingredients (type="inventory") AND sub-recipe outputs (type="SubRecipe"). The UI needs to distinguish these visually.

### O6: Recipe→Food Linking via ID (not name)
The store-recipe payload uses `"name": 107840` (food_id), not a string name. The `active-foods-list` API provides the dropdown source.

### O7: Purchase Entry Complexity
Purchase is the most complex mutation — multi-line items with batch tracking, brand, expiry dates, conversion factors, vendor, payment, tax, invoice. This is where UX ease matters most.

### O8: R9 Backend Typos
`"converion_factor"` (missing 's') in purchase payload. Must be sent as-is per Rule R9.

### O9: `category_id` Shape Inconsistency
`get-inventory-master` returns `category_id` as `{ "id": 798, "name": "Powder" }` (nested object).
`stock-inventory` returns `category_id` as `798` (flat integer) + separate `category_name` field.
The transform layer must normalize this.

### O10: Wastage Reason URL
Owner's curl had incomplete URL (`/api/v2/...`). Probed and found working endpoint: `/inventory/wastage-reasons` (not `get-wastage-reason`).

---

## 5. Existing Code Touchpoints

| File | Current State | Impact |
|------|--------------|--------|
| `api/constants.js` | Has EXPENSE_* endpoints | Add INVENTORY_*, RECIPE_*, VENDOR_* endpoint groups |
| `api/services/expenseService.js` | Has `getUnits()`, `getPaymentMethods()` | **Reuse** — import into inventory service |
| `api/transforms/expenseTransform.js` | Has unit/payment transforms | **Reuse** shared transforms |
| `components/layout/Sidebar.jsx` | Has Expense entry + settings entries | Add Inventory section (likely under same parent group) |
| `App.js` | Has routes for Expense pages | Add inventory routes |
| `components/panels/menu/ProductForm.jsx` | Has `is_inventory`, `stock_out` fields | **Link point** — recipe may reference menu items |
| `api/socket/socketHandlers.js` | Has `food_update` handler | May need `inventory_update` socket handler (TBD) |

---

## 6. Proposed Phase Structure

Given 37 endpoints and UX-ease priority, recommend **3 phases:**

### Phase 1: Ingredients Master + Stock Dashboard (16 endpoints)
- Ingredients CRUD (add/edit/delete)
- Category CRUD
- Stock levels dashboard (with low-stock indicators)
- Physical stock adjustment
- Excel import/export for ingredients & stock
- **Surfaces:** 2 routes — `/inventory` (stock dashboard) + `/inventory-setup` (ingredient master)

### Phase 2: Purchase Entry + Vendor (5 endpoints)
- Purchase entry form (multi-line items)
- Vendor type selection
- Payment method selection
- Invoice reference
- **Surfaces:** Purchase entry within stock dashboard or as dialog/panel

### Phase 3: Recipes — Food BOM + Sub-Recipes + Addon Recipes (16 endpoints)
- Recipe CRUD (link food → ingredients)
- Sub-recipe CRUD (reusable prep components)
- Addon recipe CRUD
- Recipe Excel import/export
- Sub-recipe Excel import/export
- **Surfaces:** `/recipes` route with tabs (Recipes / Sub-Recipes / Addon Recipes)

---

## 7. Open Questions (Updated from Intake)

| # | Question | Status | Answer |
|---|----------|--------|--------|
| OQ-1 | What sub-modules does old POS inventory cover? | **ANSWERED** | 5 modules: Ingredients, Stock, Purchase, Recipes (food BOM), Sub-Recipes, Addon Recipes |
| OQ-2 | Which backend APIs exist? | **ANSWERED** | 37 endpoints mapped (see §2) |
| OQ-3 | Phase plan — single or multi-phase? | **PROPOSED** | 3 phases recommended (see §6) — **owner to confirm** |
| OQ-4 | Does inventory interact with order flow? | **PARTIALLY ANSWERED** | `is_inventory` + `stock_out` on menu items exist. Recipe links food→ingredients. Stock deduction on order appears to be backend-driven. **No FE order-flow changes expected.** |
| OQ-5 | Relationship to CR-059 Expense module? | **ANSWERED** | Shared `get-unit` + `payment-method` APIs. Same pattern (setup + daily entry). Separate module but reuse service functions. |
| OQ-6 | Role/permission gating? | **DEFERRED** | CR-071 (permission wiring) is deferred. Inventory will ship ungated initially. |
| OQ-7 | API host: preprod or manage? | **RESOLVED** | `preprod.mygenie.online` always, as per `.env`. |
| **OQ-8 (NEW)** | **Old POS design screenshots?** | **PENDING** | Owner mentioned sharing — needed for UX design phase. |

---

## 8. Risk Register

| Risk | Level | Mitigation |
|------|-------|-----------|
| Unit conversion math errors (kg↔gm, ltr↔ml) | HIGH | Transform layer with explicit conversion map + unit tests |
| Purchase payload complexity (multi-line, tax, vendor) | HIGH | Start with simple single-item purchase, iterate to multi-line |
| API host uncertainty (preprod vs manage) | MEDIUM | Confirm with owner before implementation |
| Negative stock display confusing users | MEDIUM | Clear visual design (red badges, "-27 ltr" with warning icon) |
| `category_id` shape inconsistency across endpoints | LOW | Normalize in transform layer (always extract to flat id + name) |
| R9 typo (`converion_factor`) | LOW | Verbatim in code, commented per R9 |

---

## 9. Next Steps

1. **OWNER DECISION:** Confirm phase structure (§6) or propose alternative
2. **OWNER DECISION:** Confirm API host — preprod or manage? (OQ-7)
3. **OWNER:** Share old POS design screenshots for UX reference (OQ-8)
4. **DESIGN PHASE:** After owner confirms above, design UX for Phase 1 (ingredients + stock dashboard) — UX ease is #1 priority
5. **IMPLEMENTATION PLAN (Gate 3):** After design approval

---

## Evidence Artifacts

All saved to `/app/memory/evidence/CR-072/`:
- `get_unit.json` — 13 units
- `stock_item_categories.json` — 5 categories
- `get_inventory_master.json` — 10 ingredients
- `stock_inventory.json` — 10 stock items
- `get_recipe.json` — 1 recipe
- `sub_recipes.json` — 1 sub-recipe
- `addon_recipe_list.json` — 1 addon recipe
- `vendor_type.json` — 5 vendor types
- `payment_method.json` — 9 payment methods
- `active_foods_list.json` — food items for recipe linking
