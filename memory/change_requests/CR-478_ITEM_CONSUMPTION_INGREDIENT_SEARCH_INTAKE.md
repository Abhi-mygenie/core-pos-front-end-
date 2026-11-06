# CR-478 — Item Consumption Report: Search by Ingredient Name

**ID:** CR-478  **Type:** CR  **Registered:** 2026-10-28  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (screenshot + verbal request)
**Related:** CR-472 (Item Consumption Report page)

## Description
Extend the existing search filter in the Item Consumption Report to match on **ingredient names** in addition to menu item names. Currently searching "Vanilla Protein Powder" returns 0 results because the filter only checks `item_name`. After this CR, it will return all menu items that consume/return/waste that ingredient (e.g. "Vanilla Berry Protein Shake", "Banana Date Energiser", "Cacao, Peanut, Banana, Date").

## Evidence
- Screenshot: owner searched "Vanilla Berry Protein Shake" by item name — got 1 result with drill-down showing ingredient "Vanilla Protein Powder (2.508 kg consumed, 33 gm returned)"
- API probe: 78 menu items, 45 unique ingredients. "Blue Tokai Attikan Coffee" appears in 17 items. Data already loaded client-side.
- Source: OWNER-REPORTED
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** CR-472 built the page. CR-475 added food_for filter + addons drill-down. Neither touches ingredient search.

## Code Reality
**NONE** — search at L98 only filters on `item_name`. Ingredient data (`consumed_ingredients`, `returned_ingredients`, `wastage_ingredients`) is loaded but not searched.

## Data Available (no API change needed)
Each item already has embedded ingredient arrays:
```json
{
  "item_name": "Americano",
  "consumed_ingredients": [{ "ingredient_name": "Blue Tokai Attikan Coffee", "quantity": 5.064, "unit": "kg" }],
  "returned_ingredients": [{ "ingredient_name": "Blue Tokai Attikan Coffee", "quantity": 112, "unit": "gm" }],
  "wastage_ingredients":  [{ "ingredient_name": "Blue Tokai Attikan Coffee", "quantity": 48, "unit": "gm" }]
}
```

## Blast Radius
**SMALL** — 1 file (`ItemConsumptionReportPage.jsx`), 2 edits (~7 lines total). Client-side filter only. No API, state, or provider changes.

## Fix Scope
| Edit | Line | Change |
|---|---|---|
| E1 | L98 | Extend `itemSearch` filter: match on `item_name` OR any `ingredient_name` in consumed/returned/wastage arrays |
| E2 | L276 | Update placeholder text: `"Search item name..."` → `"Search item or ingredient..."` |

## Open Decisions
None — approach is fully determined. Client-side filter extension using existing data.

## Fast Lane
**ELIGIBLE** — 1 file, <10 lines, LOW risk, no hotspot, no API change.
