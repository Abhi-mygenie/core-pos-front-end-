# CR-141 — Aggregator Sync Operations: Category Timings + Sync/Clear Controls

**ID:** CR-141
**Type:** Change Request (New Feature)
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
| Blast Radius | **MEDIUM** — 3 new files + 2 existing edits (~18 references, isolated in AggregatorSetupView) |
| Fast Lane Eligible | NO — new feature, 5 files |
| Duplicate Check | **RELATED to CR-135** — CR-135 intake *listed* these endpoints but CR-135 implementation plan + QA cover ONLY Config/Operational tabs. Zero `/aggregator-sync/` endpoint code in codebase (confirmed: grep returns 0). These are unimplemented scope from CR-135 carried forward. |
| Related | CR-135 (parent module — adds new tabs to existing AggregatorSetupView), INV-AGG-MENU |
| Code Reality | **NONE** — all 4 gaps have zero existing code |

---

## Problem Statement

`AggregatorSetupView` (CR-135) has **Configuration** and **Operational Settings** tabs. The following operational sync controls — all under `/aggregator-sync/` prefix — were listed in the CR-135 intake but never implemented:

- **Category Timings** — define when categories are available on Swiggy/Zomato (breakfast hours, lunch only, etc.)
- **Sync Catalog** — push this brand's full menu to UrbanPiper
- **Clear Catalog** — clear store-only or full master catalog on UrbanPiper
- **Clear Modifiers** — clear option/modifier groups store-scoped

These are the **operational control actions** that restaurant owners use to manage their UrbanPiper store state. Without them, owners have no way to push menu updates to Swiggy/Zomato or define category availability schedules from the POS.

---

## Gaps Covered

| Gap | Description | Severity |
|-----|-------------|----------|
| GAP-8 | `sync-catalog` — entirely absent (no constant, no service, no UI) | P1 |
| GAP-9 | `clear-catalog` — entirely absent. `full_master_reset: true` is dangerous (wipes ALL brands) | P1 |
| GAP-10 | `clear-modifiers` — entirely absent | P2 |
| GAP-11 | `category-timings` GET/POST/push — entire feature absent (3 endpoints, 0 UI) | P1 |

---

## API Contracts (from developer's agg_menu.md, restaurant 69 / Goan Kitchen)

### Sync Catalog
```
POST /api/v2/vendoremployee/aggregator-sync/sync-catalog
Body: { [client_id: 109] }   // omit for main brand
Response: { data: { store_pending: true, store_id: "STORE_POS_ID_69" } }
Note: ASYNC — two-phase (master pass → store pass 6s later). UI must show pending state.
```

### Clear Catalog
```
POST /api/v2/vendoremployee/aggregator-sync/clear-catalog
Body: {
  full_master_reset: false,   // recommended: store-only (safe)
  [client_id: 109]
}
// OR full_master_reset: true → DANGEROUS: wipes ALL brands' shared master
```

### Clear Modifiers
```
POST /api/v2/vendoremployee/aggregator-sync/clear-modifiers
Body: { [client_id: 109] }   // omit for main brand
```

### Category Timings — GET
```
GET /api/v2/vendoremployee/aggregator-sync/category-timings
Query: [?client_id=109]  // ignored for local list — returns restaurant-wide rows
Response: { timing_groups: [{ title, category_ids[], day_slots: [{ day, slots: [{start_time, end_time}] }] }] }
```

### Category Timings — POST (upsert + push)
```
POST /api/v2/vendoremployee/aggregator-sync/category-timings
Body: {
  timing_groups: [{
    title: "Breakfast",
    category_ids: [1137, 8543],
    day_slots: [{ day: "all"|"monday"|…|"sunday", slots: [{ start_time: "07:00", end_time: "11:00" }] }]
  }],
  [client_id: 109]   // selects which store credentials to push with
}
// ⚠ Local save is RESTAURANT-WIDE (no per-brand separation). Last write wins for whole restaurant.
// client_id only selects which store credentials to use for the UrbanPiper push.
```

### Category Timings — Push Only
```
POST /api/v2/vendoremployee/aggregator-sync/category-timings/push
Body: { [client_id: 109] }   // push existing DB rows without upsert
```

---

## Critical Business Rules (from developer doc)

| Rule | Detail |
|------|--------|
| Category timings are shared | Timings table is `restaurant_id` only — no per-brand. Last POST wins for WHOLE restaurant. UI must warn: "These timings apply to all brands." |
| Category refs are shared | Push uses `C-{category_id}` regardless of brand |
| full_master_reset danger | `clear-catalog` with `full_master_reset: true` wipes shared master for ALL brands on same UrbanPiper biz. Show DANGER confirmation dialog. |
| Sync is async | `sync-catalog` returns `store_pending: true` — store pass happens after HTTP response. Show "Sync queued" state, not loading spinner. |
| Max stock toggle | 400 item_ids per stock-toggle call (CR-140 note) |
| client_id routing | Omit for main brand; send `client_id: <n>` for sub-brand |

---

## UI Changes Required

### New Tab 3 in AggregatorSetupView: "Sync & Catalog"

Per-brand (inherits brand selector from ConfigTab parent context):

```
┌─────────────────────────────────────────┐
│ Sync Menu to UrbanPiper                 │
│ Pushes [Brand] menu. Async — may take   │
│ a few seconds to complete.              │
│                     [Sync Catalog →]    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Clear Store Catalog                     │
│ Removes this store's items only.        │
│ Other brand unaffected.                 │
│                     [Clear Store →]     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Clear Modifiers                         │
│ Removes option groups for this store.   │
│                  [Clear Modifiers →]    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⛔ Full Master Reset                     │
│ DANGER: Wipes ALL brands' shared        │
│ catalog. Use only when told by support. │
│                   [Full Reset ⛔ →]      │
└─────────────────────────────────────────┘
```

### New Tab 4 in AggregatorSetupView: "Category Timings"

Restaurant-wide (brand selector still shown for push target, not for data):

```
⚠ Timings apply to all brands. Last save overwrites all stores.

[+ New Timing Group]   [Save & Push to: Main ▾]   [Push Only]

─────────────────────────────────────────────────────
Breakfast                              [Edit] [Delete]
  Categories: Dosa, Idli
  All days: 07:00 – 11:00
─────────────────────────────────────────────────────
Lunch                                  [Edit] [Delete]
  Categories: Rice, Curry
  Mon–Fri: 12:00 – 15:00
─────────────────────────────────────────────────────
```

**Add/Edit Timing Group inline form:**
```
Title: [____________]
Categories: Multi-select dropdown from categories list
Days: ● All days  ○ Custom (Mon ☐ Tue ☐ Wed ☐ Thu ☐ Fri ☐ Sat ☐ Sun ☐)
Slots: [07:00] – [11:00]  [+ Add Slot]  [- Remove]
[Cancel] [Save]
```

---

## Files WILL Change

| # | File | Action | Change |
|---|------|--------|--------|
| 1 | `api/constants.js` | EDIT | Add 6 entries to `AGGREGATOR_SYNC_ENDPOINTS` (or extend from CR-140) |
| 2 | `api/services/aggregatorConfigService.js` | EDIT | Add `syncCatalog()`, `clearCatalog()`, `clearModifiers()`, `getCategoryTimings()`, `saveCategoryTimings()`, `pushCategoryTimings()` |
| 3 | `components/settings/aggregatorSetup/AggregatorSetupView.jsx` | EDIT | Add 2 new tab buttons + conditional render |
| 4 | `components/settings/aggregatorSetup/SyncCatalogTab.jsx` | NEW | Sync + Clear controls UI (4 action cards per brand) |
| 5 | `components/settings/aggregatorSetup/CategoryTimingsTab.jsx` | NEW | Timing groups list + add/edit form |

## Files WILL NOT Touch

`ConfigTab.jsx`, `OperationalTab.jsx`, `aggregatorConfigTransform.js`, all R5 hotspots, `menuManagementService.js` (CR-140 scope).

---

## Dependency

**CR-140 must register `AGGREGATOR_SYNC_ENDPOINTS.STOCK_TOGGLE` in `constants.js`** — CR-141 may extend the same constant object with 6 more entries. If implemented in the same sprint, coordinate on `constants.js` edit to avoid conflict. No other dependency.

---

## Evidence
- Developer doc: `agg_menu.md` (public artifact, fetched 2026-08-14)
- Investigation: `/app/memory/investigation/INV-AGG-MENU_INVESTIGATION_REPORT_v2.md`
- Source: OWNER-PROVIDED (developer's agg_menu.md)
- Confidence: HIGH — all API contracts from backend developer doc

---

## Open Questions

| # | Question | Impact |
|---|----------|--------|
| OQ-1 | Category timings: should UI show a per-brand tab (push to main / push to mallu goan) or a single global view? | Affects CategoryTimingsTab layout |
| OQ-2 | Sync Catalog: show a progress indicator while `store_pending: true`? Or just toast "Sync queued"? | Affects SyncCatalogTab UX |
| OQ-3 | Clear Full Master Reset: require typing "RESET" to confirm? Or standard confirm dialog? | Affects danger confirmation UX |

---

## Risk Classification
- Risk: **MEDIUM** — new isolated tabs in AggregatorSetupView. No hotspot files. No financial logic.
- All changes additive — existing tabs (Configuration, Operational) untouched.
- Fast Lane: NO (5 files, new feature).
- Owner approval needed at Gate 4 before implementation.
