# CR-144 — Addon Master: Unified Management in Menu Management Panel (All Menu Types)

**ID:** CR-144
**Type:** Change Request (scope extension + route clarification of CR-142 GAP-E)
**Date:** 2026-08-14
**Sprint:** pos_5_1
**Status:** INTAKE COMPLETE
**Gate:** 1 ✅

---

## Classification

| Field | Value |
|---|---|
| Priority | **P1** |
| Risk | **MEDIUM** |
| Blast Radius | **MEDIUM** — MenuManagementPanel header + new AddonManagementPanel (~3 files) |
| Fast Lane Eligible | NO — new panel + state change |
| Duplicate Check | **EXTENDS CR-142** — CR-142 plans GAP-E (standalone addon panel). This CR explicitly locks the route, makes it menu-type-agnostic, and adds the in-panel tab structure (not a separate page). |
| Related | CR-142 (EXTENDS GAP-E), INV-ADDON-SCOPE (confirms addons are restaurant-wide) |
| Code Reality | **NONE** — AddonManagementPanel does not exist |
| Source | OWNER-DIRECTED + INV-ADDON-SCOPE investigation |

---

## Problem Statement

**Investigation INV-ADDON-SCOPE (2026-08-14) confirmed:**
- Addon API has **zero food_for scoping** — `addon-list` returns the same addons regardless of whether `food_for=Normal`, `food_for=Aggregator`, or no param is sent
- `add-addon`, `update-addon`, `delete-addon` operate on a **restaurant-wide** addon pool
- Normal foods already use addons (confirmed: `test1` Normal food has `extra flesh` addon)
- `fetchAddons()` in MenuManagementPanel already runs for ALL menu types on panel open

**What's missing:**
There is no dedicated UI for managing the addon master (CRUD: add/edit/delete/status-toggle) anywhere in the Menu Management flow. Users have only the inline quick-create (name+price) inside ProductForm. There is no way to:
- See all addons in a list with their full V2 details (weight, veg, status, inventory)
- Edit an existing addon's name, price, weight, veg type
- Toggle an addon's active/inactive status
- Delete an addon
- See which foods use a given addon

This management must live **inside the existing Menu Management panel** (same route/slide-over that opens when clicking the Menu icon in the sidebar), accessible from **all menu types** (Normal, Party, Premium, Aggregator). It must NOT be a separate page or a separate route.

---

## Route & Navigation Design

```
Menu Management Panel (slide-over, /menu sidebar icon)
├─ Header: [Menu Management] [Normal ▾] [Loading...]   [Add-ons] [Bulk Edit] [Card View] [✕]
│                                                         ↑ NEW BUTTON
├─ Mode: Card View (default)
│   ├─ Left: Category list
│   └─ Right: Product cards
│
├─ Mode: Bulk Edit (existing)
│   └─ BulkEditor spreadsheet
│
└─ Mode: Addon Master (NEW — activated by "Add-ons" button)
    └─ AddonManagementPanel
        ├─ [+ Add Addon]  [Search...]
        ├─ Table: Type | Name | Price | Weight | Stock | Inventory | Actions
        └─ Inline row edit (expand on Edit click)
```

**Key design rule:** "Add-ons" button in header is ALWAYS visible regardless of which menu type (Normal/Aggregator/etc.) is selected. Addons are restaurant-wide.

---

## API Contracts (confirmed via INV-ADDON-SCOPE probes)

### List: GET /product/addon-list
```
No food_for param needed. Returns restaurant-wide addon pool.
Response: { addons: [{ id, name, price, status, weight, veg, has_inventory, recipe_id, has_recipe, is_pushed_managed }] }
```

### Create: POST /product/add-addon
```json
{ "name": "Extra Cheese", "price": 40, "weight": 50, "veg": 1, "status": 1, "has_inventory": "No" }
```

### Update: PUT /product/addon-update/{id}  ← CRITICAL: PUT not POST
```
Probe 11 confirmed: POST → empty/404. Probe 11b: PUT → "Addon updated successfully"
```
```json
{ "name": "Extra Cheese", "price": 45, "weight": 55, "veg": 1, "status": "active" }
```

### Status toggle: POST /product/status-change/{id}
```json
{ "status": 0 }  // 0=inactive, 1=active
```

### Delete: DELETE /product/delete-addon/{id}

---

## UI Design (in-panel)

```
[Menu Management] [Normal ▾]  ···  [Add-ons ●] [Bulk Edit] [Card View] [✕]
                               ↑ "Add-ons" button — always visible, no menuType guard

─── Addon Master View ────────────────────────────────────────────────────────
[+ Add Addon]                                               [Search add-ons...]

┌─────┬────────────────┬──────┬────────┬──────────┬──────────┬───────────────┐
│ Typ │ Name           │ Price│ Weight │  Stock   │ Inventory│   Actions     │
├─────┼────────────────┼──────┼────────┼──────────┼──────────┼───────────────┤
│ ●Vg │ Extra Cheese   │ ₹40  │  50g   │ ● Active │   No     │ [Edit] [Del]  │
│ ●NV │ Garlic Sauce   │ ₹25  │   0g   │ ● Active │   No     │ [Edit] [Del]  │
│ ●── │ Dark Choco     │ ₹10  │   0g   │ ○ Inactive│  No     │ [Edit] [Del]  │
└─────┴────────────────┴──────┴────────┴──────────┴──────────┴───────────────┘

[Edit row expands inline]:
  Name: [Extra Cheese____] ₹[45] Weight:[55]g  Veg:[Veg ▾]  [Save] [Cancel]
  Inventory: [toggle — disabled if no recipe, tooltip "Attach a recipe first"]
```

---

## Files WILL Change

| # | File | Action | Change |
|---|------|--------|--------|
| 1 | `api/transforms/menuManagementTransform.js` | EDIT | `fromAPI.addonList()` +7 V2 fields (shared with CR-142 E1) |
| 2 | `api/services/menuManagementService.js` | EDIT | `updateAddon()` POST→PUT, `addAddon()` full payload, +`toggleAddonStatus()` (shared with CR-142 E2) |
| 3 | `components/panels/MenuManagementPanel.jsx` | EDIT | +`addonPanelMode` state, +"Add-ons" button in header (always visible), +panel branch |
| 4 | `components/panels/menu/AddonManagementPanel.jsx` | NEW | Full CRUD panel (list + inline edit + status + delete) |

**Note:** If CR-142 is implemented first, E1/E2 above are already done. CR-144 adds only E3+E4.

## Files WILL NOT Touch
`ProductForm.jsx` (quick-create unchanged), `BulkEditor.jsx`, `OrderEntry.jsx`, all R5 hotspots

---

## Coordination with CR-142

CR-142 covers: transform fix (E1) + service fix (E2) + ProductForm addon row improvements (E3) + AddonManagementPanel (E5) + MenuManagementPanel button (E4).

CR-144 is the **explicit route/scope confirmation** that:
1. The panel is always accessible for ALL menu types (no `menuType === 'Aggregator'` gate)
2. The "Add-ons" button in header is always visible regardless of menu type selected
3. The panel is inside the slide-over (not a separate page/route)

**Implementation path:** CR-142 can be merged with CR-144 for a single implementation batch, or CR-144 implements only E3+E4 if CR-142 has already landed E1+E2.

---

## Open Questions
| # | Question | Impact |
|---|----------|--------|
| OQ-1 | When in Addon Master view, should the menu type dropdown be hidden/disabled? | Minor UX clarity |
| OQ-2 | Should the "Add-ons" button show an item count badge (e.g., "Add-ons 12")? | Minor UX |
