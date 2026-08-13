# CR-114 — Smart Purchase: Default All Items Unselected (Opt-In)

**ID:** CR-114
**Type:** CR
**Severity:** P2
**Risk:** MEDIUM
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT (RELATED to CR-103 bulk remove, CR-105 show all — different scope)
**Related:** CR-103 (bulk remove), CR-105 (show all toggle), CR-078 (Smart Purchase)

## Description
Smart Purchase currently shows ALL planner-computed items by default. Owner wants items to start UNSELECTED — user explicitly opts in to what they want to buy. With 100+ items, showing everything overwhelms the user.

## Evidence
- `SmartPurchasePanel.jsx:54-66`: `computePlan()` returns all items, all rendered
- `activeRows` filter (line 107) only applies to submission (`rate > 0`), not visibility
- User expectation: items start unchecked, user picks what to buy

## Blast Radius
- 2 files (`SmartPurchasePanel.jsx`, `AutoShoppingList.jsx`), ~30-40 lines
- Scope: MEDIUM

## Fix Recommendation
Add opt-in checkbox per row. Only checked items visible in working list. Unchecked items in a collapsed "Available" section. Needs planning.

## Next
Planning Gate 2
