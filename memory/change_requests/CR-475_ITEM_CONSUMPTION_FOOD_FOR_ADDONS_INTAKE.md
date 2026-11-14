# CR-475 — Intake: Item Consumption Report — Add `food_for` Column + `addons[]` Drill-down

**Date:** 2026-10-28  
**Source:** OWNER-PROVIDED (backend API doc: `salesconsumtion (1).md`)  
**Duplicate check:** DISTINCT — CR-472 built the original page but did not include `food_for` or `addons[]`. These are backend additions to the same endpoint.  
**Related:** CR-472 (GATE_5B_QA_PASS) — this CR extends it.  
**Code Reality:** NONE — neither field exists in `ItemConsumptionReportPage.jsx` (407 lines, confirmed grep).

---

## Description

The backend has updated the `POST /api/v2/vendoremployee/report/item-consumption-report` response to include two new pieces of data per item row. The existing page (CR-472) must be enhanced to display them.

### Change A — `food_for` field on each item

Every item in `items[]` now includes a `food_for` field indicating which menu the dish belongs to: `Normal`, `Premium`, `Party`, etc.

**Why it matters:** Two dishes can share the exact same name and same recipe but belong to different menus. Without `food_for`, they look like duplicates in the table. With it, the owner can tell them apart (e.g., "Burger — Normal" vs "Burger — Premium").

**Current state:** `food_for` is not read or displayed anywhere in the page.

**What needs to change:** Add a "Menu" column or label to the table. Recommend a small inline badge/chip on the Item Name cell rather than a full separate column, so the table doesn't become too wide.

---

### Change B — `addons[]` breakdown in the expandable row

Every item in `items[]` now has an `addons[]` array. Each entry represents a recipe add-on that was ordered on that dish. Each addon object has:

- `addon_id`, `addon_name`
- `sold_qty`, `canceled_qty`, `returned_qty`, `wastage_qty`, `consumed_qty`
- `consumed_ingredients[]`, `returned_ingredients[]`, `wastage_ingredients[]`
- No `revenue_loss` field (add-on ingredients are included in the dish's ingredient lists; showing them separately would double-count)

**Why it matters:** When a dish is cancelled, the owner may want to know if an add-on (like "Extra Shot") was on it and how much of its ingredient was consumed or wasted. The current expandable row shows the dish's own ingredient sub-tables (3 tables: Consumed / Returned / Wastage) but gives no visibility into add-on level detail.

**Current state:** The expandable row shows 3 ingredient sub-tables for the dish. `addons[]` is not read or rendered.

**What needs to change:** Add a 4th section inside the expandable row titled "Add-ons" that, for each addon with a non-empty array, shows the addon name, its qty breakdown, and its own 3 ingredient sub-tables. Only show add-ons where the response includes them (`addons.length > 0`).

**Important constraint from backend doc:** The add-on ingredients are ALREADY included inside the dish's `consumed_ingredients`, `returned_ingredients`, and `wastage_ingredients`. The `addons[]` section just explains how much of those totals came from each add-on. Display as supplementary/explanatory info — do not add quantities to the dish totals.

---

## Severity & Risk

- **Severity:** P2 — MEDIUM (useful enhancement; missing data; workaround = full page refresh won't help)
- **Risk:** LOW — 1 file only (`ItemConsumptionReportPage.jsx`); no API change needed; no financial logic
- **Fast Lane eligible:** NO — 2 sub-changes, expanded row layout change, own ODs
- **SLA:** Next sprint

---

## Open Questions (Owner Decisions)

| OD | Question | Recommendation |
|---|---|---|
| **OD-475-01** | How should `food_for` be shown — as a new column, or as a small badge below the item name? | Badge/chip below item name (e.g. `Normal` in a grey pill) — avoids making the table too wide |
| **OD-475-02** | Should `addons[]` only show when `addons.length > 0`, hidden when empty? | YES — only expand add-on section when the dish has recipe add-ons |
| **OD-475-03** | Should each addon show its own 3 ingredient sub-tables, or just the qty row? | Full 3 sub-tables (same pattern as dish) for consistency — but only show the ingredient sub-table if it has entries |

---

## Evidence

- **Source file:** `salesconsumtion (1).md` (backend API contract doc)
- **API endpoint:** `POST /api/v2/vendoremployee/report/item-consumption-report`
- **Code confirmed absent:** `grep -n "food_for\|addons" ItemConsumptionReportPage.jsx` returns 0 hits
- **Confidence:** CONFIRMED (backend doc is detailed, example JSON provided)

---

## Blast Radius

- **Primary file:** `src/pages/reports-module/ItemConsumptionReportPage.jsx` (407 lines, 1 file)
- **No other files need changing** — no new API endpoint, no service change, no route/sidebar change. The existing `getItemConsumptionReport` service call already returns the full response including the new fields.
- **Scope:** SMALL (1 file)
- **Hotspot files touched:** NO

---

## Proposed Approach (Gate 3 detail)

**For `food_for` (Change A):**
- Read `item.food_for` from the API response (already returned, just not used)
- In the item name cell, add a small grey chip below the name: `{item.food_for}` (only when not `Normal` or always? — OD-475-01 drives this)
- Add `food_for` to the CSV export headers + PDF print

**For `addons[]` (Change B):**
- After the existing 3 ingredient sub-tables in the expandable row, add a new section
- For each addon in `item.addons` (skip if empty array):
  - Show addon name + qty row (`sold_qty`, `canceled_qty`, `returned_qty`, `wastage_qty`, `consumed_qty`)
  - Show 3 ingredient sub-tables (consumed, returned, wastage) if non-empty
  - Add a note: "Add-on ingredients are included in the dish totals above"

---

## Gate Status

- Gate 0 (Intake): **COMPLETE** (this document)
- Gate 2 (Impact Analysis): Not started
- Gate 3 (Implementation Plan): Not started
- Gate 4 GO: Pending owner OD-475-01..03 answers + GO
