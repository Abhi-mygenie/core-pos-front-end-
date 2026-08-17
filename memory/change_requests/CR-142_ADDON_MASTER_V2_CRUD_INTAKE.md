# CR-142 — Addon Master V2: Full CRUD Upgrade + Standalone Management UI

**ID:** CR-142
**Type:** Change Request (V2 API migration + new feature)
**Date:** 2026-08-14
**Sprint:** pos_5_1
**Status:** INTAKE COMPLETE
**Gate:** 1 ✅

---

## Classification

| Field | Value |
|---|---|
| Priority | **P1** |
| Risk | **HIGH** |
| Blast Radius | **LARGE** — 128 references to addon in components; 4 existing files change + 1 new panel |
| Fast Lane Eligible | NO — multi-file, touches menu write path |
| Duplicate Check | **DISTINCT** — BUG-166/214 touch addon math/recipes not CRUD. No existing item covers V2 fields. |
| Related | BUG-166 (addon_amount), BUG-214 (addon recipe dropdown), INV-ADDON-AGG |
| Code Reality | **NONE** — all gaps confirmed absent via grep |
| Source | OWNER-PROVIDED (add_on_master.md) + probe evidence |

---

## Problem Statement

The backend upgraded the addon API to V2. The frontend was **never updated** to match. Four concrete breakages exist:

1. **`fromAPI.addonList()` silently drops 7 new response fields** — `weight`, `veg`, `has_inventory`, `recipe_id`, `has_recipe`, `status`, `is_pushed_managed` all returned by API but never mapped → UI can never display or use them
2. **`addAddon()` sends only name+price** — V2 accepts `weight`, `veg`, `status`, `has_inventory`; the UI creates incomplete addons
3. **`updateAddon()` uses POST instead of PUT** — V2 contract specifies `PUT /addon-update/{id}`; current code silently fails on some backends that enforce HTTP method
4. **No addon status-toggle** — `POST /status-change/{id}` with `{status: 0|1}` is entirely absent; addons cannot be activated/deactivated

Additionally, **no standalone Addon Management UI** exists — users can only create addons inline in ProductForm (name+price only). There is no screen to view weight, veg type, status, inventory flag, or edit existing addons with full fields.

---

## Gaps Covered

| Gap | Description | Severity |
|-----|-------------|----------|
| GAP-A | `fromAPI.addonList()` missing 7 fields | P1 |
| GAP-B | `addAddon()` incomplete payload (missing weight/veg/status/has_inventory) | P1 |
| GAP-C | `updateAddon()` wrong HTTP method (POST→PUT) + incomplete payload | P1 |
| GAP-D | No `toggleAddonStatus()` service function | P1 |
| GAP-E | No standalone Addon Management panel (full CRUD with all V2 fields) | P1 |

---

## API Contracts (from add_on_master.md)

### Response shape (addon-list and add-addon response)
```json
{
  "id": 12,
  "name": "Extra Cheese",
  "price": 40,
  "status": 1,
  "weight": 50,
  "veg": 1,
  "has_inventory": "No",
  "recipe_id": null,
  "has_recipe": false,
  "is_pushed_managed": false
}
```

### Create: POST /product/add-addon
```json
{ "name": "Extra Cheese", "price": 40, "weight": 50, "veg": 1, "status": 1, "has_inventory": "No" }
```
**Rule:** `has_inventory: "Yes"` on create always returns 422 (`cannot_enable_inventory_without_recipe`).

### Update: PUT /product/addon-update/{id}
```json
{ "name": "Extra Cheese", "price": 45, "weight": 55, "veg": 1, "status": "active", "has_inventory": "No" }
```

### Status toggle: POST /product/status-change/{id}
```json
{ "status": 0 }   // 0=disable, 1=enable
```

### Delete: DELETE /product/delete-addon/{id}

### Veg field values
| value | meaning |
|-------|---------|
| 1 | Veg |
| 2 | Non-Veg |
| 3 | Egg |
| 4 | Others |
| null | Not set |

### Inventory rule
- Create: `has_inventory: "Yes"` → always 422. Default "No".
- Update with "Yes": only if `has_recipe: true`. UI must enforce: inventory toggle **disabled** when `has_recipe: false`.
- Attach recipe first via `POST /product/store-addon-recipe` (not in scope here).

---

## UI Changes Required

### 1. ProductForm.jsx — "Food Addons" section

**Current:** Checkbox list showing name + price. Quick-create: name + price.

**After:**
- Each addon row: veg color dot (green/red/amber/gray by veg value) + name + price + weight badge + "Inactive" dimming if `status=0`
- Quick-create inline: add veg selector (default veg=1)
- Inventory badge: show `INV` badge if `has_inventory=Yes`

### 2. New: Standalone Addon Management Panel

Accessible from Menu Management toolbar (new button "Manage Add-ons"):
```
[+ Add Addon]  [Search...]

┌───────┬───────────────┬──────┬────────┬──────┬──────────┬───────────┐
│  Type │ Name          │ Price│ Weight │ Stock│ Inventory │ Actions   │
├───────┼───────────────┼──────┼────────┼──────┼──────────┼───────────┤
│  ● Veg│ Extra Cheese  │ ₹40  │  50g   │  On  │    No     │ Edit Del  │
│  ● N-V│ Chicken Sauce │ ₹25  │   0g   │  Off │    No     │ Edit Del  │
└───────┴───────────────┴──────┴────────┴──────┴──────────┴───────────┘
```

Edit row (inline): name, price, weight, veg selector, inventory toggle (disabled if no recipe).

---

## Files WILL Change

| # | File | Action | Change |
|---|------|--------|--------|
| 1 | `api/transforms/menuManagementTransform.js` | EDIT | `fromAPI.addonList()` +7 fields |
| 2 | `api/services/menuManagementService.js` | EDIT | `addAddon()` +fields; `updateAddon()` POST→PUT +fields; +`toggleAddonStatus()` |
| 3 | `components/panels/menu/ProductForm.jsx` | EDIT | Addon row: veg dot + weight + inactive dim; quick-create: +veg |
| 4 | `components/panels/MenuManagementPanel.jsx` | EDIT | +Manage Add-ons button + panel state |
| 5 | `components/panels/menu/AddonManagementPanel.jsx` | NEW | Full CRUD panel with V2 fields |

## Files WILL NOT Touch
`orderTransform.js`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx`,
`ItemCustomizationModal.jsx` (uses addons for ordering, not management)

---

## Evidence
- Investigation: `/app/memory/investigation/INV-ADDON-AGG_INVESTIGATION_REPORT.md`
- Probe: `/app/memory/evidence/INV-ADDON-AGG/probe1_addon_list.txt`
- Source: OWNER-PROVIDED (add_on_master.md)
- Confidence: HIGH

---

## Open Questions
| # | Question | Impact |
|---|----------|--------|
| OQ-1 | Where exactly should Addon Management panel live? A) New tab in MenuManagementPanel alongside BulkEditor; B) New sidebar route (like `/addons`) | Scope of MenuManagementPanel changes |
| OQ-2 | Inline edit for addons: A) inline row edit (like BulkEditor pattern); B) modal/slide-over | AddonManagementPanel design |
| OQ-3 | Should backend backend brief for SQL `weight` column error be filed as separate BUG? | Separate BUG-ADDON-SQL filing |
