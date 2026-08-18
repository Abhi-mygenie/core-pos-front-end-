# CR-143 — Aggregator Leftover: Force-Swiggy + Addon Stock + Variation Stock

**ID:** CR-143
**Type:** Change Request (new features)
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
| Blast Radius | **MEDIUM** — 22 references in existing aggregator files; 3 files edit + 2 new |
| Fast Lane Eligible | NO — multi-file, new tabs |
| Duplicate Check | **RELATED to CR-141** (same AggregatorSetupView, different endpoints). DISTINCT scope. |
| Related | CR-141 (adds Tabs 3-4 to AggregatorSetupView — this adds Tabs 5-6 + force-swiggy button) |
| Code Reality | **NONE** — confirmed via grep |
| Source | OWNER-PROVIDED (agg_leftover_menu.md) + probe evidence |

---

## Problem Statement

Three aggregator management features documented in `agg_leftover_menu.md` are entirely absent from the frontend:

1. **Force-Swiggy Enable** — Re-enables ALL active Swiggy items for a brand on UrbanPiper in bulk. Distinct from `sync-catalog` (which syncs the full menu structure). Confirmed live (probe 2: triggered 3 items).

2. **Aggregator Addon Stock Management** — View all addons with their aggregator status + toggle them on/off. Important caveat: local status change (`apply`) is **restaurant-wide**; UrbanPiper push (`toggle-addon`) is per-brand.

3. **Aggregator Variation Stock Management** — View food items with their variation option values + individually toggle variation options on/off per brand. Confirmed live (probe 4: shows "69 special" with "choice of" variation).

---

## Gaps Covered

| Gap | Description | Severity |
|-----|-------------|----------|
| GAP-G | `force-swiggy-enable` absent — bulk enable all Swiggy items | P1 |
| GAP-H | Addon Stock tab absent (3 endpoints: list, apply, toggle-addon) | P1 |
| GAP-I | Variation Stock tab absent (2 endpoints: variations list, toggle-variation) | P1 |

---

## API Contracts (from agg_leftover_menu.md + probes)

### GAP-G: Force Swiggy Enable
```
POST /aggregator-sync/force-swiggy-enable
Body: { [client_id: 109] }
Response: { status, message, data: { client_id, store_id, total_items, total_batches, batches[] } }
```
Confirmed response: `"Swiggy force stock-in triggered for 3 items"`

### GAP-H: Addon Stock Management
```
GET  /aggregator-sync/bulk-actions/addons?[client_id=N]
Response: { status, client_id, addons: [{ id, name, price, status, status_text }] }

GET  /aggregator-sync/bulk-actions/items?addon_id=X&[client_id=N]
Response: foods that use this addon on this brand

POST /aggregator-sync/bulk-actions/apply
Body: { addon_id, action: "enable"|"out_of_stock", [client_id] }
⚠ Writes add_ons.status RESTAURANT-WIDE (not per-brand). client_id = logging only.

POST /aggregator-sync/bulk-actions/toggle-addon
Body: { addon_id, action: "enable"|"disable", [client_id] }
→ Per-brand. Hits UrbanPiper OPT-ADDON-SHARED-{addon_id} for that store.
```

### GAP-I: Variation Stock Management
```
GET  /aggregator-sync/variations?[client_id=N]
Response: {
  items: [{
    id, name, category_id, category_name, status,
    variations: [{ name, type, values: [{ label, optionPrice }] }]
  }]
}

POST /aggregator-sync/toggle-variation
Body: { food_id, variation_index, variation_value_index, action: "enable"|"disable", [client_id] }
→ Per-brand. Option ref: OPT-VAR-{foodId}-{varIndex}-{valIndex}
```

---

## Critical Business Rules

| Rule | Detail |
|------|--------|
| `apply` is restaurant-wide | Changing addon catalog status affects ALL brands. Show warning in UI. |
| `toggle-addon` is per-brand | Pushes to that brand's UrbanPiper store only. |
| `toggle-variation` is per-brand | Same — use OPT-VAR-{foodId}-{varIndex}-{valIndex} ref. |
| force-swiggy: chunked | Backend chunks 400 items, 3s between batches. UI shows count of triggered items. |

---

## UI Changes Required

### 1. SyncCatalogTab.jsx — Add "Force Enable" card (GAP-G)

New action card between "Sync Catalog" and "Clear Store Catalog":
```
┌────────────────────────────────────────────────────────────┐
│  Force Enable All Items on Swiggy                          │
│  Re-enables all active Swiggy items for [Brand] on         │
│  UrbanPiper. Use after a store outage or reset.            │
│                     [Force Enable Swiggy →]                │
└────────────────────────────────────────────────────────────┘
```

### 2. New Tab 5 — "Addon Stock" (NEW AddonStockTab.jsx)

Brand selector (main / sub-brands). Two sections per addon row:

```
Brand: [Main ▾]

⚠ Catalog status (enable/out_of_stock) applies to ALL brands.
  UrbanPiper toggle is per-brand only.

┌──────────────┬──────┬──────────────────────┬───────────────────────┐
│ Addon        │ Price│ Catalog Status       │ UrbanPiper (this brand)│
├──────────────┼──────┼──────────────────────┼───────────────────────┤
│ Dark         │ ₹10  │ ● Available  [OOS]   │ [Enable] [Disable]    │
│ extra flesh  │ ₹35  │ ● Available  [OOS]   │ [Enable] [Disable]    │
└──────────────┴──────┴──────────────────────┴───────────────────────┘
```

"OOS" button = mark out_of_stock (restaurant-wide). Enable/Disable = UrbanPiper per-brand toggle.
Clicking addon row → expand to show which foods use it (from `/bulk-actions/items`).

### 3. New Tab 6 — "Variation Stock" (NEW VariationStockTab.jsx)

Brand selector. Item accordions with variation options:

```
Brand: [Main ▾]

▼ 69 special  (Special)
    Variation: "choice of"
      ● salsa    ₹0    [Enable] [Disable]
      ● gogo     ₹10   [Enable] [Disable]

▶ Cheese Dosa (Dosa)
```

Toggle fires `POST /aggregator-sync/toggle-variation` with `food_id`, `variation_index`, `variation_value_index`, `action`, `[client_id]`.

---

## Files WILL Change

| # | File | Action | Change |
|---|------|--------|--------|
| 1 | `api/constants.js` | EDIT | +3 entries to `AGGREGATOR_SYNC_ENDPOINTS` (FORCE_SWIGGY_ENABLE, BULK_ADDONS, TOGGLE_ADDON, VARIATIONS, TOGGLE_VARIATION, BULK_ITEMS) |
| 2 | `api/services/aggregatorConfigService.js` | EDIT | +6 new service fns (forceSwiggyEnable, getBulkAddons, getBulkAddonItems, applyBulkAddon, toggleAddonStock, getVariations, toggleVariation) |
| 3 | `components/settings/aggregatorSetup/AggregatorSetupView.jsx` | EDIT | +2 tab buttons + conditional renders (Tab 5 + Tab 6) |
| 4 | `components/settings/aggregatorSetup/SyncCatalogTab.jsx` | EDIT | +1 Force Enable action card |
| 5 | `components/settings/aggregatorSetup/AddonStockTab.jsx` | NEW | Addon stock list + catalog/UP toggles |
| 6 | `components/settings/aggregatorSetup/VariationStockTab.jsx` | NEW | Variation accordion + per-value toggles |

## Files WILL NOT Touch
`menuManagementService.js` (CR-142 scope), all R5 hotspots, `CategoryTimingsTab.jsx`, `ConfigTab.jsx`, `OperationalTab.jsx`

---

## Evidence
- Investigation: `/app/memory/investigation/INV-ADDON-AGG_INVESTIGATION_REPORT.md`
- Probe 2: `/app/memory/evidence/INV-ADDON-AGG/probe2_force_swiggy.txt`
- Probe 3: `/app/memory/evidence/INV-ADDON-AGG/probe3b_bulk_addons_full.txt`
- Probe 4: `/app/memory/evidence/INV-ADDON-AGG/probe4b_variations_full.txt`
- Source: OWNER-PROVIDED (agg_leftover_menu.md)
- Confidence: HIGH

---

## Open Questions
| # | Question | Impact |
|---|----------|--------|
| OQ-1 | Addon Stock tab: Should "Catalog Status" section show a warning modal before `apply` (restaurant-wide change)? A) Yes — confirm dialog; B) No — just a banner | AddonStockTab UX |
| OQ-2 | Variation Stock tab: Toggle all values in a variation group at once? A) Yes — group-level enable/disable button; B) Per-value only | VariationStockTab complexity |
| OQ-3 | Force Swiggy Enable: show count of triggered items in success toast? (API returns count) A) Yes; B) Generic "triggered" toast | SyncCatalogTab UX |
