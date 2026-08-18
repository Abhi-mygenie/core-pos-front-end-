# CR-140 — Aggregator Menu Management: Food Add/Edit/StockToggle Fix

**ID:** CR-140
**Type:** Change Request (Bug Fix + Feature)
**Date:** 2026-08-14
**Sprint:** pos_5_1
**Status:** INTAKE COMPLETE
**Gate:** 1 ✅

---

## Classification

| Field | Value |
|---|---|
| Priority | **P0** |
| Risk | **HIGH** |
| Blast Radius | **LARGE** — 8 files (5 edit + 3 new), ~77 references in existing code |
| Fast Lane Eligible | NO — multi-file, financial-adjacent (menu items with platform pricing) |
| Duplicate Check | **DISTINCT** — CR-135 covers Config/Operational tabs only (confirmed: zero `/aggregator-sync/` or swiggy/zomato in CR-135 plan) |
| Related | CR-135 (same module, non-overlapping scope) |
| Code Reality | **NONE** — all 7 gaps have zero existing code |

---

## Problem Statement

When a user selects the **Aggregator** menu type in Menu Management and adds or edits a food item, the FE is broken across every write path:

1. **Add food uses wrong endpoint** — `POST /add-food` (multipart) creates a "ghost" food with `food_for=Aggregator` that NEVER appears in the aggregator foods list and is NOT synced to Swiggy/Zomato. **Silent failure with false success toast.** (Confirmed: Goan Kitchen probe G11 — id=217622 created, absent from foods-list.)
2. **swiggy/zomato fields missing** — `toAPI.foodInfo()` has no `swiggy` or `zomato` fields. Even if the right endpoint were called, platform sync settings are never sent.
3. **Multi-brand (client_id) missing** — no brand selector in ProductForm, no `getRestaurantClients()` call, no `client` field in any payload. All items silently go to main brand only.
4. **Edit form can't pre-fill or change platform settings** — `fromAPI.food()` doesn't map `swiggy`, `zomato`, `client_id`, `food_stock`, `turn_on_at`. Edit form always starts with blanks/defaults for these fields.
5. **Stock Toggle absent** — `POST /aggregator-sync/stock-toggle` (enable/disable item on UrbanPiper with 4 timing modes) has zero FE presence: no constant, no service, no UI.
6. **BulkEditor also affected** — `buildPayload()` missing swiggy/zomato/client_id, no dynamic columns for aggregator.

---

## Gaps Covered

| Gap | Description | Severity |
|-----|-------------|----------|
| GAP-1 | `addFood()` → wrong endpoint. Need `addFoodAggregator()` → `POST /add-food-aggregator` (JSON) | P0 |
| GAP-2 | `toAPI.foodInfo()` + `BulkEditor.buildPayload()` missing `swiggy`, `zomato`, `client` | P0 |
| GAP-3 | No `getRestaurantClients()` service fn; no brand selector in ProductForm/BulkEditor | P1 |
| GAP-4 | `fromAPI.food()` missing `swiggy`, `zomato`, `client_id`, `food_stock`, `turn_on_at` | P1 |
| GAP-5 | Stock Toggle entirely absent (constant + service + UI per-food-row) | P0 |
| GAP-6 | `BulkEditor.buildPayload()` missing fields + no aggregator columns | P1 |
| GAP-7 | Edit form has no UI to change swiggy/zomato; client not pre-filled | P1 |

---

## API Contracts (confirmed via live probe)

### Add Aggregator Food
```
POST /api/v2/vendoremployee/product/add-food-aggregator
Content-Type: application/json
Body: {
  name, price, category_id,
  food_for: "Aggregator",
  swiggy: "YES"/"NO",
  zomato: "YES"/"NO",
  veg: 0|1,
  dinein, takeaway, delivery: "Yes"/"No",
  [client: 107]   // omit for main brand
}
```

### Edit Aggregator Food (same URL, both JSON and multipart accepted)
```
POST /api/v2/vendoremployee/product/foods/{id}
Content-Type: application/json   ← use JSON for aggregator
Body: {
  food_for: "Aggregator",
  name, price, category_id, swiggy, zomato, veg,
  dinein, takeaway, delivery, ...all standard fields...,
  client: 0   // main brand; 107 = sub-brand
}
```

### Restaurant Clients
```
GET /api/v2/vendoremployee/product/restaurant-clients
Response: { status, clients_found, clients: [{id, name, phone, email, address, status}] }
```

### Stock Toggle
```
POST /api/v2/vendoremployee/aggregator-sync/stock-toggle
Body: {
  action: "enable" | "disable",
  item_ids: [<aggregator_food_id>, ...],
  [client_id: 109],           // omit for main brand
  [turn_on_preset: "30m"|"1h"|"2h"|"6h"|"12h"|"1d"|"7d"],   // relative disable
  [turn_on_at: <epoch_ms>]    // custom disable (max 90 days)
}
Response: {
  status, message, action,
  turn_on_at: <epoch_ms>|null,
  turn_on_at_iso: "<ISO string>"|null,
  indefinite: bool,
  urbanpiper_status: "success"|"error"
}
```

**Stock toggle modes** (disable only; enable ignores timing fields):
- Indefinite: no `turn_on_*`
- Relative: `turn_on_preset` (max 7 days)
- Custom: `turn_on_at` epoch ms (max 90 days). Wins over preset if both sent.

---

## foods-list Fields Now Mapped (fromAPI.food fix)

API returns per aggregator food: `swiggy`, `zomato`, `client_id`, `turn_on_at`, `food_stock`
- `food_stock`: 0 = disabled on UrbanPiper, 1 = enabled
- `turn_on_at`: ISO string or null (when item auto-re-enables)

---

## UI Changes Required

### 1. ProductForm.jsx — Platform Sync section (new, aggregator-only)
When `menuType === 'Aggregator'`, show new section at top:
- Swiggy toggle YES/NO (default YES)
- Zomato toggle YES/NO (default YES)
- Brand dropdown: "Main Brand" + fetched clients

### 2. ProductCard.jsx — Aggregator row additions
When `menuType === 'Aggregator'`:
- Replace Dine-In/Delivery/Takeaway chips → **Swiggy** + **Zomato** platform pills
- New **Stock Toggle button** (separate from POS Power button):
  - food_stock=1: green "Live" pill → disable popover (4 timing modes)
  - food_stock=0: amber "Offline · Back at [time]" → Enable button
- `turn_on_at` display when disabled

### 3. QuickEditForm (in ProductCard) — Swiggy/Zomato row
When `menuType === 'Aggregator'`: compact swiggy/zomato toggles + brand selector.

### 4. BulkEditor.jsx — Dynamic aggregator columns
When `menuType === 'Aggregator'`: inject 3 tier-1 columns: swiggy (yesno), zomato (yesno), clientId (dropdown).

### 5. MenuManagementPanel.jsx — Fetch clients
When `menuType === 'Aggregator'`: fetch `/product/restaurant-clients`, pass clients to children.

### 6. NEW: AggregatorStockToggle.jsx
Stock toggle picker component with disable timing popover (Indefinitely / 30m / 1h / 2h / 6h / 12h / 1d / 7d / Custom datetime). Used by ProductCard.

---

## Files WILL Change

| # | File | Action | Change |
|---|------|--------|--------|
| 1 | `api/constants.js` | EDIT | Add `AGGREGATOR_SYNC_ENDPOINTS.STOCK_TOGGLE` |
| 2 | `api/services/menuManagementService.js` | EDIT | Add `addFoodAggregator()` + `getRestaurantClients()` |
| 3 | `api/transforms/menuManagementTransform.js` | EDIT | `fromAPI.food()` +5 fields; `toAPI.foodInfo()` +3 fields |
| 4 | `components/panels/menu/ProductForm.jsx` | EDIT | Platform Sync section (swiggy/zomato/brand), init, save path |
| 5 | `components/panels/menu/ProductCard.jsx` | EDIT | Platform chips, stock toggle button, turn_on_at badge |
| 6 | `components/panels/menu/BulkEditor.jsx` | EDIT | Dynamic columns, buildRow, buildPayload |
| 7 | `components/panels/MenuManagementPanel.jsx` | EDIT | Fetch clients, pass to children |
| 8 | `components/panels/menu/AggregatorStockToggle.jsx` | NEW | Stock toggle picker component |

## Files WILL NOT Touch

`aggregatorService.js`, `aggregatorTransform.js`, `AggregatorSetupView.jsx`, `ConfigTab.jsx`, `OperationalTab.jsx`, `orderTransform.js`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx` (R5 hotspots untouched).

---

## Evidence
- Investigation report: `/app/memory/investigation/INV-AGG-MENU_INVESTIGATION_REPORT_v2.md`
- Probe files: `/app/memory/evidence/INV-AGG-MENU/` (goan_g1 through goan_g17)
- Source: OWNER-PROVIDED (investigation + developer's agg_menu.md)
- Confidence: HIGH — all gaps confirmed via live curl probes on 2 restaurants

---

## Open Questions
None — all contracts confirmed via live probes.

---

## Risk Classification
- Risk: **HIGH** — touches menu management write path (product add/edit). Financial-adjacent (platform menu pricing).
- Hotspot files: `menuManagementTransform.js` (not R5, but critical), `ProductForm.jsx`, `ProductCard.jsx`
- Fast Lane: NO
- Owner approval needed at Gate 4 before implementation.
