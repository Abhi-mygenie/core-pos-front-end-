# Investigation Report — Addon Master V2 + Aggregator Leftover Menu
**ID:** INV-ADDON-AGG
**Date:** 2026-08-14
**Role:** INVESTIGATION (Alpha v0.7)
**Source docs:** add_on_master.md + agg_leftover_menu.md
**Steps used:** 5/10
**Confidence:** HIGH — all gaps confirmed via live probes + code trace

---

## 1. Summary

| # | Gap | Where in UI | Severity | Classification |
|---|-----|-------------|----------|----------------|
| GAP-A | `fromAPI.addonList()` maps only id/name/price — 7 new API fields silently dropped | menuManagementTransform.js | P1 | FE_BUG |
| GAP-B | `addAddon()` sends only name+price — misses weight/veg/status/has_inventory | menuManagementService.js + ProductForm | P1 | FE_BUG |
| GAP-C | `updateAddon()` wrong HTTP method (POST → PUT) + sends only name+price | menuManagementService.js | P1 | FE_BUG |
| GAP-D | No addon status-toggle function (`POST /status-change/{id}`) | menuManagementService.js | P1 | FE_BUG (missing) |
| GAP-E | No full Addon Management UI (weight/veg/status/inventory visible/editable) | MenuManagementPanel area | P1 | FE_BUG (missing) |
| GAP-F | SQL error: `weight` column missing from `add_ons` table for some restaurants | Backend DB migration | P0 | BACKEND_BUG |
| GAP-G | `force-swiggy-enable` entirely absent | SyncCatalogTab | P1 | FE_BUG (missing) |
| GAP-H | Aggregator Addon Stock Management absent (3 endpoints) | New tab in AggregatorSetupView | P1 | FE_BUG (missing) |
| GAP-I | Aggregator Variation Stock Management absent (2 endpoints) | New tab in AggregatorSetupView | P1 | FE_BUG (missing) |

---

## 2. Root Cause of SQL Error (GAP-F)

**Error:** `SQLSTATE[42S22]: Unknown column 'weight' in 'field list'`
**Probe 1 result for restaurant 69 (Goan Kitchen):** addon-list returns successfully with `weight` field ✅

The backend now selects `weight` in the addon-list query. For **some restaurants** the DB migration adding `weight` to the `add_ons` table has not run → SQL 500 on `GET /addon-list`. This blocks the entire addon UI for those users.

**This is NOT caused by CR-140 or CR-141.** `getAddonList()` was never touched.

**Backend fix:** Run `ALTER TABLE add_ons ADD COLUMN weight INT DEFAULT 0;` (or equivalent migration).

---

## 3. DATA FLOW TRACE — Addon CRUD (current broken state)

```
API returns: { id, name, price, status, weight, veg, has_inventory,
               recipe_id, has_recipe, is_pushed_managed }
              ↓
fromAPI.addonList() maps only: { id, name, price }
  GAP-A: status/weight/veg/has_inventory/recipe_id/has_recipe/is_pushed_managed
         all DROPPED silently
              ↓
ProductForm "Food Addons" section: shows checkbox list (name + price only)
  GAP-E: No veg dot, no weight, no status pill, no inventory indicator
              ↓
Quick-create "Add" in ProductForm: sends { name, price } only
  GAP-B: weight/veg/status/has_inventory never sent on create
              ↓
updateAddon(id, name, price): POST /addon-update/{id} { name, price }
  GAP-C: Should be PUT, missing weight/veg/status/has_inventory
              ↓
No status-toggle function exists
  GAP-D: POST /status-change/{id} never called
```

---

## 4. GAP-BY-GAP DETAIL

### GAP-A — `fromAPI.addonList()` missing 7 fields

**File:** `menuManagementTransform.js` L214-222

**Current maps:** `{ id, name, price }`

**API actually returns (confirmed probe 1):**
```json
{
  "id": 13193,
  "name": "Dark",
  "price": 10,
  "status": 1,
  "weight": 0,
  "veg": null,
  "has_inventory": "No",
  "recipe_id": null,
  "has_recipe": false,
  "is_pushed_managed": false
}
```

**Must add:**
```js
status:          a.status ?? 1,         // 0=inactive 1=active
weight:          a.weight || 0,          // grams
veg:             a.veg ?? null,          // 1=veg 2=nonveg 3=egg 4=other
hasInventory:    a.has_inventory === 'Yes',
recipeId:        a.recipe_id || null,
hasRecipe:       a.has_recipe === true,
isPushedManaged: a.is_pushed_managed === true,
```

---

### GAP-B — `addAddon()` incomplete payload

**File:** `menuManagementService.js` L153-154

**Current:** `api.post('/add-addon', { name, price })`

**Missing fields:** `weight` (grams, default 0), `veg` (1/2/3/4), `status` (1), `has_inventory` ("No")

**Inventory rule (from spec):**
- `has_inventory: "Yes"` on CREATE always returns 422 (`cannot_enable_inventory_without_recipe`)
- Must first create addon → then attach recipe via `POST /product/store-addon-recipe` → then update with `has_inventory: "Yes"`
- UI must enforce: inventory toggle disabled if `has_recipe: false`

---

### GAP-C — `updateAddon()` wrong method + incomplete payload

**File:** `menuManagementService.js` L157-158

**Current:** `api.post('/addon-update/${id}', { name, price })`

**Contract:** `PUT /addon-update/<id>` with `{ name, price, weight?, veg?, status?, has_inventory? }`

Two issues:
1. HTTP method: POST → must be PUT
2. Payload: only name+price → should include all optional fields

---

### GAP-D — No addon status toggle

**File:** `menuManagementService.js` (missing function)

**Required:** `POST /product/status-change/<id>` with `{ status: 0|1 }`

This is **catalog active/inactive** — different from `has_inventory`.
- status=1: addon available in catalog (can be added to orders)
- status=0: addon inactive/hidden

---

### GAP-E — No standalone Addon Management UI

**Current:** ProductForm's "Food Addons" section only:
- Checkbox list showing name + price
- Quick-create inline (name + price only)
- No edit, no full fields visible

**What's needed:**
A dedicated Addon Management panel (like existing Category/Product views) showing per-addon:
- Name (editable)
- Price (editable)
- Weight in grams (editable)
- Veg/Non-Veg/Egg/Other dot indicator (editable)
- Status toggle (active/inactive)
- Inventory badge (`has_inventory: Yes/No`) — editable only when `has_recipe: true`
- Recipe indicator (grayed out if `has_recipe: false`)
- Delete button

**Note on ProductForm quick-create:** The inline create in ProductForm needs at minimum: name, price, veg selector. Weight and inventory can stay as defaults.

---

### GAP-G — `force-swiggy-enable` absent

**File:** No constant, no service, no UI

**Contract:** `POST /aggregator-sync/force-swiggy-enable` `{ [client_id] }`

**What it does:** Enables ALL items where `swiggy=YES AND status=1` for that brand on UrbanPiper. Chunks 400 items, 3s between batches.

**Confirmed live (probe 2):**
```json
{
  "status": true,
  "message": "Swiggy force stock-in triggered for 3 items",
  "data": { "client_id": null, "store_id": "STORE_POS_ID_69", "total_items": 3, "total_batches": 1 }
}
```

**Where in UI:** Button in `SyncCatalogTab.jsx` — "Force Enable All on Swiggy" per brand.

---

### GAP-H — Aggregator Addon Stock Management absent

**Endpoints (all confirmed live):**
```
GET  /aggregator-sync/bulk-actions/addons?[client_id=N]
GET  /aggregator-sync/bulk-actions/items?addon_id=X&[client_id=N]
POST /aggregator-sync/bulk-actions/apply    { addon_id, action: "enable"|"out_of_stock", [client_id] }
POST /aggregator-sync/bulk-actions/toggle-addon { addon_id, action: "enable"|"disable", [client_id] }
```

**Response shape (probe 3):**
```json
{
  "addons": [
    { "id": 13193, "name": "Dark", "price": 10, "status": 1, "status_text": "Available" }
  ]
}
```

**Key rules:**
- `apply` (local status change) writes `add_ons.status` **restaurant-wide** regardless of client_id
- `toggle-addon` (UrbanPiper push) is **per-brand** — uses `OPT-ADDON-SHARED-{addon_id}` option ref
- `items` endpoint: shows which foods use a given addon (for context)

**Where in UI:** New "Addon Stock" tab in `AggregatorSetupView` (Tab 5)

---

### GAP-I — Aggregator Variation Stock Management absent

**Endpoints (both confirmed live):**
```
GET  /aggregator-sync/variations?[client_id=N]
POST /aggregator-sync/toggle-variation { food_id, variation_index, variation_value_index, action, [client_id] }
```

**Response shape (probe 4):**
```json
{
  "items": [{
    "id": 13303, "name": "69 special", "category_id": 8543, "category_name": "Special",
    "status": 1,
    "variations": [{
      "name": "choice of", "type": "single",
      "values": [{ "label": "salsa", "optionPrice": "0" }, { "label": "gogo", "optionPrice": "10" }]
    }]
  }]
}
```

**Toggle payload:** `{ food_id, variation_index, variation_value_index: 0/1/2..., action: "enable"|"disable", [client_id] }`
- Option ref: `OPT-VAR-{foodId}-{varIndex}-{valIndex}`

**Where in UI:** New "Variation Stock" tab in `AggregatorSetupView` (Tab 6)

---

## 5. UI Impact Summary

### A. Menu Management — Addon section changes (add_on_master.md)

**Two surfaces need changes:**

#### Surface 1: ProductForm "Food Addons" section (inline)
| Current | Needs |
|---------|-------|
| Checkbox + name + price | + veg dot color (1=green/2=red/3=amber/4=gray) |
| Quick-create: name + price | + veg selector in quick-create |
| No status indicator | + inactive addon shown dimmed/grayed |
| No inventory indicator | + `has_inventory: Yes` badge if set |

#### Surface 2: Dedicated Addon Management Panel (missing entirely)
Full CRUD screen accessible from Menu Management (button or separate route):
```
┌─────────────────────────────────────────────────────────┐
│  [+ Add Addon]                              [Search...]  │
├─────────────┬──────┬────────┬────────┬──────┬──────────┤
│  Name       │ Price│ Weight │ Type   │ Stock│ Actions   │
├─────────────┼──────┼────────┼────────┼──────┼──────────┤
│ ● Extra Chz │ ₹40  │ 50g    │ Veg    │  On  │ Edit Del  │
│ ○ Dark Sauce│ ₹10  │  0g    │  —     │  On  │ Edit Del  │
└─────────────┴──────┴────────┴────────┴──────┴──────────┘
```

### B. Aggregator Setup — new tabs (agg_leftover_menu.md)

**SyncCatalogTab.jsx** — add 1 new action card:
```
┌────────────────────────────────────────────────────────┐
│ Force Enable All Items on Swiggy                       │
│ Re-enables all active Swiggy items for this brand.     │
│                          [Force Enable Swiggy →]       │
└────────────────────────────────────────────────────────┘
```

**New Tab 5 — "Addon Stock"** (NEW `AddonStockTab.jsx`):
```
Brand: [Main ▾]

┌──────────┬───────┬────────────────────┬─────────────────────┐
│ Addon    │ Price │ Catalog Status     │ UrbanPiper Status   │
├──────────┼───────┼────────────────────┼─────────────────────┤
│ Dark     │ ₹10   │ ● Available   [↕]  │ [Enable] [Disable]  │
│ Ex. Flesh│ ₹35   │ ● Available   [↕]  │ [Enable] [Disable]  │
└──────────┴───────┴────────────────────┴─────────────────────┘
Note: Catalog status changes apply to ALL brands.
      UrbanPiper toggle is per-brand.
```

**New Tab 6 — "Variation Stock"** (NEW `VariationStockTab.jsx`):
```
Brand: [Main ▾]

69 special (Special)
  Variation: "choice of"
    ● salsa   ₹0    [Enable] [Disable]
    ● gogo    ₹10   [Enable] [Disable]
```

---

## 6. Recommendations

| Gap | Batch | Planning |
|-----|-------|---------|
| GAP-A, B, C, D + ProductForm inline | CR-142: Addon Master V2 | Full Gate 2-3 (HIGH — touches transform + service + form) |
| GAP-E (standalone Addon CRUD panel) | CR-142 or CR-143 (if large) | Full Gate 2-3 |
| GAP-F SQL error | Backend fix only | File backend brief |
| GAP-G (force-swiggy-enable) | CR-143: Aggregator Leftover | Medium — 1 new button in SyncCatalogTab |
| GAP-H (Addon Stock tab) | CR-143: Aggregator Leftover | New tab + 3 service fns |
| GAP-I (Variation Stock tab) | CR-143: Aggregator Leftover | New tab + 2 service fns |

---

## 7. Evidence
- `/app/memory/evidence/INV-ADDON-AGG/probe1_addon_list.txt` — addon-list full response shape
- `/app/memory/evidence/INV-ADDON-AGG/probe2_force_swiggy.txt` — force-swiggy-enable confirmed live
- `/app/memory/evidence/INV-ADDON-AGG/probe3b_bulk_addons_full.txt` — bulk addons response
- `/app/memory/evidence/INV-ADDON-AGG/probe4b_variations_full.txt` — variations response
- `/app/memory/evidence/INV-ADDON-AGG/probe5_status_toggle.txt` — status-change confirmed

## 8. Retroactive Candidates
None.
