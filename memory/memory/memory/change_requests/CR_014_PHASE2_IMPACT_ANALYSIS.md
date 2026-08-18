# CR-014 Phase 2 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-08
**Author:** Agent (Gate 2)

---

## 1. Executive Summary

Replace the deferred Excel bulk-ops flow (APIs #8-10) with an in-browser spreadsheet-style bulk editor. The editor loads existing menu items from `foods-list`, lets the user pick which columns to edit, shows defaults for non-selected columns, highlights changed cells, and submits only dirty rows via the existing `editFood` API. New rows use `addFood`.

**Zero new backend APIs required.** Entirely reuses Phase 1 wiring.

---

## 2. API Field Inventory (Live Verification — 2026-06-08)

Verified via curl against `preprod.mygenie.online` for cafe103 (rid=644, 411 items) and Lafetta (rid=78, 231 items).

### foods-list Response: 36 fields per item

| # | Field | Type | Editable in Grid | Column Group |
|---|-------|------|-----------------|--------------|
| 1 | `id` | int | ❌ Read-only (PK) | — |
| 2 | `name` | string | ✅ **Tier 1** | Core |
| 3 | `category` | `{id, name}` | ✅ **Tier 1** (dropdown) | Core |
| 4 | `price` | int | ✅ **Tier 1** | Core |
| 5 | `item_type` | int (0-3) | ✅ **Tier 1** (dropdown: NV/Veg/Egg/Jain) | Core |
| 6 | `status` | int (0/1) | ✅ **Tier 1** (toggle) | Core |
| 7 | `tax` | string | ✅ **Tier 1** | Tax |
| 8 | `tax_type` | string | ✅ **Tier 1** (dropdown: GST/VAT) | Tax |
| 9 | `description` | string | ✅ **Tier 1** | Core |
| 10 | `image` | url | 🔒 Disabled (thumbnail only) | Display |
| 11 | `variation` | array | 🔒 Disabled (chip display) | Display |
| 12 | `addons` | array | 🔒 Disabled (chip display) | Display |
| 13 | `discount` | int | Future Tier 2 | Pricing |
| 14 | `discount_type` | string | Future Tier 2 | Pricing |
| 15 | `give_discount` | string | Future Tier 2 | Pricing |
| 16 | `live_web` | string | Future Tier 2 | Availability |
| 17 | `dinein` | string | Future Tier 2 | Availability |
| 18 | `delivery` | string | Future Tier 2 | Availability |
| 19 | `takeaway` | string | Future Tier 2 | Availability |
| 20 | `complementary` | string | Future Tier 2 | Pricing |
| 21 | `complementary_price` | string | Future Tier 2 | Pricing |
| 22 | `prepration_time_min` | int | Future Tier 3 | Ops |
| 23 | `serve_time_in_min` | int | Future Tier 3 | Ops |
| 24 | `pack_charges` | string | Future Tier 3 | Charges |
| 25 | `takeaway_charge` | string | Future Tier 3 | Charges |
| 26 | `delivery_charge` | string | Future Tier 3 | Charges |
| 27 | `available_time_starts` | string | Future Tier 3 | Ops |
| 28 | `available_time_ends` | string | Future Tier 3 | Ops |
| 29 | `item_code` | string | Future Tier 3 | Ops |
| 30 | `food_order` | int | Future Tier 3 | Ops |
| 31 | `allergens` | array | Future Tier 4 | Info |
| 32 | `kcal` | null/int | Future Tier 4 | Info |
| 33 | `portion_size` | null | Future Tier 4 | Info |
| 34 | `item_unit` | string | Future Tier 4 | Info |
| 35 | `item_unit_price` | string | Future Tier 4 | Info |
| 36 | `food_for` | string | Context (from menu-master selector) | — |

### Supporting APIs (all already wired)

| API | Used For |
|-----|----------|
| `getCategories()` | Category dropdown options (30 categories on cafe103) |
| `getMenuMaster()` | Menu type selector: Normal / Party / Premium |
| `editFood(id, foodInfo)` | Save changed row |
| `addFood(foodInfo)` | Save new row |
| `getFoodsList(foodFor)` | Load grid data |

---

## 3. Data Stats (live — cafe103 rid=644)

| Metric | Value |
|--------|-------|
| Total items | 411 |
| Active | 386 |
| Inactive | 25 |
| With variations | 8 |
| With addons | 23 |
| With kcal | 18 |
| With item_unit | 7 |
| Categories | 29 |
| Menu types | 3 (Normal, Party, Premium) |
| Tax types | GST only (Lafetta has GST + VAT) |
| Tax rates | 5% (cafe103), 0%/5%/22% (Lafetta) |

---

## 4. Component Architecture

### New Files

| File | Purpose | Est. Lines |
|------|---------|------------|
| `components/panels/menu/BulkEditor.jsx` | Main spreadsheet grid component | ~400-500 |

### Modified Files

| File | Change | Risk |
|------|--------|------|
| `MenuManagementPanel.jsx` | Add "Bulk Edit" toggle button + render BulkEditor when active | LOW |

### Files NOT Touched

| File | Reason |
|------|--------|
| `menuManagementService.js` | All APIs already wired — reuse as-is |
| `menuManagementTransform.js` | Transform already handles foods-list → UI shape |
| `ProductList.jsx` | Individual item view — untouched |
| `ProductCard.jsx` | Individual card — untouched |
| `ProductForm.jsx` | Full edit form — untouched |
| `CategoryList.jsx` | Category sidebar — untouched |
| ALL order-taking files | Zero touch — independent data flow |

---

## 5. UI Design Concept

```
┌─────────────────────────────────────────────────────────┐
│  Menu Management          [Normal ▼]  [Bulk Edit]  [×]  │
├─────────────────────────────────────────────────────────┤
│  Column Picker: ☑Name ☑Price ☑Category ☑Status          │
│                 ☑Type ☑Tax% ☑TaxType ☑Description        │
│  [Search...]                    12 items changed [Save]  │
├────┬──────────┬───────┬──────────┬────────┬─────┬───────┤
│ #  │ Name     │ Price │ Category │ Status │Tax% │ Type  │
├────┼──────────┼───────┼──────────┼────────┼─────┼───────┤
│  1 │ Butter…  │  400* │ Indian…▼ │  ●On   │5.00 │ NV ▼  │
│  2 │ Dal Ma…  │  250  │ Indian…▼ │  ●On   │5.00 │ Veg▼  │
│  3 │ Paneer…  │  350* │ Indian…▼ │  ○Off  │5.00 │ Veg▼  │
│ ...│          │       │          │        │     │       │
│ +  │ [Add new item row]                                  │
└─────────────────────────────────────────────────────────┘
  * = changed cell (highlighted)
```

### Key UX Elements

1. **Column Picker** — checkboxes at top to show/hide Tier 1 columns
2. **Sticky header** — column names stay visible while scrolling
3. **Cell types:**
   - Text input: Name, Description, Price, Tax%
   - Dropdown: Category, Item Type (Veg/NV/Egg/Jain), Tax Type (GST/VAT)
   - Toggle: Status (Active/Inactive)
4. **Dirty highlighting** — changed cells get accent background
5. **Save button** — shows count of changed items, submits only deltas
6. **Per-row feedback** — success ✓ / error ✗ after submit
7. **Read-only chips** — Variations count, Addons count displayed as badges
8. **Search** — filter rows by name
9. **Add row** — empty row at bottom for new items
10. **Virtual scroll** — needed for 400+ items (renders only visible rows)

---

## 6. Submit Strategy

**Option C (Hybrid — recommended):** Parallel batch of `editFood` calls (5 concurrent max) for changed rows. Already-proven API. Per-row success/fail tracking.

```
User clicks "Save 12 changes"
  → 5 concurrent editFood() calls
  → next 5 when first batch completes
  → last 2
  → Show: ✓ 11 saved, ✗ 1 failed (retry?)
```

New rows use `addFood()` in the same batch pipeline.

---

## 7. Regression Risk Assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Order-taking menu display | **ZERO** — no shared state | MenuContext untouched |
| Existing Menu Management (individual edit) | **ZERO** — additive component | ProductList/Card/Form untouched |
| Socket food_update | **ZERO** — untouched | — |
| Dashboard | **ZERO** — no shared state | — |
| Reports | **ZERO** — no shared state | — |

---

## 8. Open Decisions

| # | Question | Recommendation |
|---|----------|----------------|
| D-1 | Virtual scroll library or CSS-only? | CSS `overflow-y` with windowing if >200 rows visible. No heavy library. |
| D-2 | Max concurrent API calls on save? | 5 parallel — balanced between speed and not hammering backend |
| D-3 | "Add new row" — required fields validation? | Name + Price + Category required; rest gets defaults |
| D-4 | Undo capability? | Not in v1 — user can refresh to reload original data |

---

*End of Impact Analysis — Gate 2 Complete. Proceeding to Mock UI for owner review.*
