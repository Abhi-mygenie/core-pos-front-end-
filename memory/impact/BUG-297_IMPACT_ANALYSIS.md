# BUG-297 — Impact Analysis (Gate 2)

**ID:** BUG-297  
**Title:** Category Created from Web POS — `restaurant_printer_id` NULL  
**Date:** 2026-08-05  
**Role:** PLANNING AGENT (Gate 2 — Impact Analysis only)  
**Risk:** HIGH (KOT printing broken silently)

---

## Code Reality

**PARTIAL** — `restaurant_printer_id` field EXISTS in `menuManagementService.addCategory()` and `editCategory()`, and the station printer list IS fetched and passed to `CategoryList.jsx` via `stations` prop. The gap is purely UI: `CategoryList.jsx` has no form field for printer ID — it's never collected from the user.

---

## Conflict Pre-Check

| File | Last Modified By | Risk |
|---|---|---|
| `CategoryList.jsx` | CR-014 P2 agent (2026-06-08) | LOW — last change was 2 months ago, unrelated (bulk editor) |
| `menuManagementService.js` | BUG-288 agent (2026-07-31) | LOW — last change added stationPrinterList parser, additive |
| `menuManagementTransform.js` | BUG-288 agent (2026-07-31) | NO CHANGE NEEDED |

**No active conflicts.** No other INTAKE/PLANNED item touches these files.

---

## Data Flow Trace

```
API: GET /api/v2/vendoremployee/product/station-printer-list
  → menuManagementService.getStationPrinterList()
  → fromAPI.stationPrinterList(data) → [{ id, name, printerId }]  ← BUG-288 confirmed shape
  → MenuManagementPanel.jsx L81: setStations(fromAPI.stationPrinterList(stationsData))
  → L199: stations={stations} passed as prop to CategoryList

CategoryList.jsx:
  → stationOptions = stations (available)
  → formStation: used in <select> ✅
  → formPrinterId: DOES NOT EXIST ❌
  → handleAdd() L47: menuService.addCategory({ name, stationName, catOrder }) — printerId omitted
  → handleSaveEdit() L72: menuService.editCategory(id, { name, stationName, catOrder }) — printerId omitted

menuManagementService.addCategory() L92:
  → formData.append('restaurant_printer_id', String('')) = ''
  → POST /api/v1/vendoremployee/product/add-categories
  → Backend stores NULL
  → Consequence: food items in this category have no printer → KOT silent failure
```

---

## Affected Files

| File | Change Type | Risk | Hotspot? |
|---|---|---|---|
| `components/panels/menu/CategoryList.jsx` | MODIFY — add `formPrinterId` state + printer dropdown in Add form + Edit form | MEDIUM | NO |
| `menuManagementService.js` | NO CHANGE — already sends the field correctly | — | — |
| `menuManagementTransform.js` | NO CHANGE — `stationPrinterList` already mapped | — | — |

**Files WILL change:** `CategoryList.jsx` only  
**Files will NOT touch:** `MenuManagementPanel.jsx`, `menuManagementService.js`, `menuManagementTransform.js`, any R5 hotspot

---

## Key Design Questions

**OD-1 (ANSWERED):** stationPrinterList shape is `{ id, name, printerId }` where `id` is the station/printer ID and `printerId` is `restaurant_printer_id`. The dropdown should bind `printerId` (not `id`) as the value sent to `addCategory()`.

**OD-2 (NEEDS OWNER CONFIRMATION):** When editing an existing category that already has a printer, should the Edit form pre-fill with the existing `printerId`? Currently `fromAPI.categoryList` maps `c.restaurant_printer_id || ''` as `printerId` on each category object. So the data is available — just needs to be used to seed `formPrinterId` state on `handleEdit(cat)` call.

**OD-3 (NEEDS OWNER CONFIRMATION):** What is the correct default printer when adding a new category? Options:
- (a) First printer in the station list (auto-select)
- (b) No default — mandatory selection
- (c) Default to the same printer as selected station

---

## Risk Classification

- **Risk: MEDIUM**
- Non-hotspot file, no financial logic
- API contract already correct — this is pure UI gap
- No regression risk on existing categories (they keep their current printer_id)
- Scope: SMALL (1 file, ~20-25 lines)

---

## Owner Decisions Required at Gate 3

| # | Decision | Default (agent recommendation) |
|---|---|---|
| OD-2 | Pre-fill printer on Edit form from existing `cat.printerId`? | YES — use `handleEdit(cat)` to seed `setFormPrinterId(cat.printerId || stationOptions[0]?.printerId || '')` |
| OD-3 | Default printer on Add form? | First option in `stationOptions` list |

---

## Downstream Impact

- Existing categories: NO change (their printer_id is already stored by backend)
- New categories after fix: will correctly store printer_id → KOT routing restored
- No change to order flow, payment, or any R5 hotspot file
