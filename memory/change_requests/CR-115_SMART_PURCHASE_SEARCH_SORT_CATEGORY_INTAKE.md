# CR-115 — Smart Purchase: Search Filter + Sort by Category

**ID:** CR-115
**Type:** CR
**Severity:** P1
**Risk:** MEDIUM
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT
**Related:** CR-114 (opt-in), CR-078 (Smart Purchase)

## Description
Smart Purchase list has no search bar to filter existing items and no category grouping/sort. With 100+ ingredients, finding a specific item is difficult. Other panels in the app (ConsumptionReport, ExpenseReport) have category filters and search bars.

## Evidence
- `AutoShoppingList.jsx`: Has ad-hoc typeahead for ADDING items, but NO search to FILTER existing list
- No category dropdown or grouping in the shopping list component
- Grep for "search|filter|category|sort" in AutoShoppingList: only ad-hoc typeahead results

## Blast Radius
- 1-2 files (`AutoShoppingList.jsx`, possibly `SmartPurchasePanel.jsx`), ~60 lines
- Scope: MEDIUM

## Fix Recommendation
Add filter bar above table: search input + category dropdown. Client-side filtering on existing rows. Needs planning.

## Next
Planning Gate 2
