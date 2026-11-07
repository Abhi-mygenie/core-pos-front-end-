# CR-472 — Item Consumption Report (Sales Consumption)

**Registered:** 2026-10-26
**Type:** CR
**Priority:** P2
**Risk:** MEDIUM
**Area:** Reports / Analytics
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-PROVIDED (spec document `salesconsumtion.md`)
**Confidence:** CONFIRMED — API live on preprod, returning real data

---

## Description

New report showing **menu-item-level** consumption data: how many dishes were sold, cancelled, returned to stock, and wasted — with ingredient breakdowns per food item. This is distinct from the existing Consumption Report (CR-093, route `/reports-module/consumption-report`) which shows **ingredient-level** stock movements (opening/consumed/closing).

**API:** `POST /api/v2/vendoremployee/report/item-consumption-report`

**Key data per menu item:**
- `sold_qty` — total dishes ordered (including later cancelled)
- `canceled_qty` — total cancelled = `returned_qty` + `wastage_qty`
- `returned_qty` — cancelled dishes whose ingredients went back to stock
- `wastage_qty` — cancelled dishes whose ingredients were lost
- `consumed_qty` — dishes that stuck = `sold_qty` - `canceled_qty`
- Three ingredient arrays: `consumed_ingredients[]`, `returned_ingredients[]`, `wastage_ingredients[]`

**Filters:**
- `from_date` / `to_date` (optional, YYYY-MM-DD)
- `restaurant_ids` (optional, array of store IDs)
- `include_hierarchy` (optional, `true` = all stores this login can see)

**Multi-store:** When multiple stores included, each item also carries `restaurant_id`. Response always includes `hierarchy_scope[]` (stores this login can see — useful for populating a store picker).

---

## Probe Evidence (2026-10-26, preprod, owner@palmhouse.com, RID 541)

| Probe | Result |
|---|---|
| Single day (2026-10-25) | ✅ 7 items |
| 5-day range + `include_hierarchy: true` | ✅ 133 items |
| Cancellation data | ✅ Present — e.g. Americano: 16 sold, 3 cancelled, 2 returned, 1 wastage |
| `hierarchy_scope` | ✅ `[{id:541, name:"The Palm House", restaurant_type_flag:"franchise"}]` |
| Ingredient arrays | ✅ `consumed_ingredients` populated with id/name/quantity/unit |

Evidence saved: investigation probe inline (session context).

---

## Duplicate Check

**DISTINCT.**
- BUG-472 (converted item consumption wrong unit): RELATED but different scope — BUG-472 is about the *existing* ingredient-level daily consumption report. This CR is a brand-new item-level report.
- CR-093 (existing Consumption Report): RELATED — same page area but different API (`daily-consumption-report` vs `item-consumption-report`), different data shape (ingredients vs food items).
- No existing code for `item-consumption-report` endpoint anywhere in the codebase.

---

## Code Reality

**NONE.** No constants, service functions, transforms, pages, or routes exist for this endpoint. Entirely new:
- `constants.js` — new endpoint constant needed
- New service function in `inventoryService.js` or new `itemConsumptionService.js`
- New transform
- New page component + route in `App.js`
- Sidebar entry under Reports/Daily Report section

---

## Blast Radius

**MEDIUM — all new files, no existing code modified except additive entries:**
- `constants.js` — +1 endpoint (additive)
- `App.js` — +1 route (additive)
- `Sidebar.jsx` — +1 nav entry (additive)
- NEW `ItemConsumptionReportPage.jsx` (or `SalesConsumptionReportPage.jsx`)
- NEW service function
- NEW transform
- Estimated: ~3 modified files + 2-3 new files

---

## Open Decisions

- **OD-472-01:** Page name and route — "Item Consumption Report" or "Sales Consumption Report"? Where in sidebar — under Daily Report alongside existing Consumption Report, or separate?
- **OD-472-02:** Store picker UI — should the page include a multi-store selector dropdown (using `hierarchy_scope` data)? Only relevant for franchise/multi-outlet logins.
- **OD-472-03:** Export — Excel/CSV and/or PDF export of the table? (Existing consumption report has both.)
- **OD-472-04:** Ingredient drill-down — expandable rows showing consumed/returned/wastage ingredients per food item? Or flat table with ingredient counts as columns?
- **OD-472-05:** Permission gate — `consumption_report` permission or a new permission key? (Login probe shows `consumption_report` in role list.)

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Awaiting owner answers to OD-472-01…05 → Impact Analysis
