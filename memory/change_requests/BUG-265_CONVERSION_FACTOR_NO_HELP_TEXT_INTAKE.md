# BUG-265 — Conversion Factor: No Help Text

**ID:** BUG-265
**Type:** BUG
**Severity:** P3
**Risk:** LOW
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT (RELATED to BUG-226 conversion factor save — different scope)
**Related:** BUG-226

## Description
Conversion Factor input field in Inventory Setup has `placeholder="e.g. 1000"` but no tooltip or help text explaining what it means or when it applies. Users don't understand the concept.

## Evidence
- `InventorySetupPanel.jsx:311`: Input field, placeholder only
- Line 410: Display shows `1 ${ing.unit} = ${ing.conversionFactor} ${ing.smallUnit}` but only after saving
- `purchasePlanner.js:154`: Conversion factor used for reorder threshold calculation
- No tooltip, info icon, or contextual help

## Blast Radius
- 1 file (`InventorySetupPanel.jsx`), ~10 lines
- Scope: SMALL

## Fix Recommendation
Add tooltip/help text: "How many small units in 1 large unit? Example: If unit=KG and small unit=GM, enter 1000 (1 KG = 1000 GM)." Planning skip eligible (LOW risk).

## Next
Planning Gate 2 (or FAST LANE if owner approves)
