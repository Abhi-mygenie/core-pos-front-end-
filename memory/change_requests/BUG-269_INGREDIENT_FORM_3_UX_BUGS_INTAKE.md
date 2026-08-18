# Intake — BUG-269: Ingredient Add/Edit Form — 3 UX Bugs

**ID:** BUG-269
**Type:** BUG
**Severity:** P1
**Risk:** MEDIUM
**Source:** OWNER-REPORTED (2026-07-28, screenshot + verbal description)
**Duplicate Check:** DISTINCT (no prior items cover these 3 specific behaviors)
**Related:** BUG-268 (edit 500 — backend audit_logs), CR-102 (conversion_unit alignment), BUG-219 (alert unit dropdown)

---

## Description

Three related bugs in the Inventory Setup → Ingredients Add/Edit inline form:

### Sub-Issue A — Conversion Sent When Unit = Small Unit (422 Error)
**Symptom:** User edits ingredient with unit=piece, smallUnit=piece, conversion=1 → backend returns 422 `CONVERSION_UNIT_SAME_AS_PURCHASE`.
**Root Cause:** `hasConversion` check in `inventoryTransform.js` evaluates to TRUE whenever smallUnit and conversionFactor are truthy, regardless of whether unit === smallUnit. The backend correctly rejects conversion when consumption_unit equals purchase unit.
**Confidence:** HIGH — reproduced via curl.

### Sub-Issue B — No Small Unit Auto-Select When Base Unit Changes
**Symptom:** User selects base unit "kg" → small unit dropdown stays empty. User must manually find and select "gm".
**Expected:** Standard mapping: kg→gm, ltr→ml. Other units → no auto-select (user picks manually).
**Root Cause:** No auto-mapping logic exists in the unit `onChange` handler. The two dropdowns are fully independent.

### Sub-Issue C — Alert Unit Should Be Read-Only (Always = Small Unit)
**Symptom:** Alert unit is a free dropdown where user can pick ANY unit. This conflicts with backend alert calculation which uses small unit.
**Expected:** Alert unit = smallUnit, displayed as read-only text. When smallUnit changes, alert unit follows.
**Root Cause:** BUG-219 implementation made alert unit a dropdown for flexibility, but owner now confirms it should always match smallUnit and be locked.

---

## Evidence
- **Screenshot (Issue A):** Owner-provided — DevTools shows 422 response: `{message: "The given data was invalid.", errors: {converion_factor: ["CONVERSION_UNIT_SAME_AS_PURCHASE"]}}`
- **Curl reproduction (Issue A):** PUT `/update-inventory/10741` with `converion_factor:"1", consumption_unit:"piece", unit:"piece"` → 422
- **Steps to reproduce (Issue B):** Inventory Setup → Ingredients → + Add Ingredient → select "kg" → observe small unit dropdown stays empty
- **Steps to reproduce (Issue C):** Inventory Setup → Ingredients → + Add Ingredient → observe alert unit is a free dropdown, not locked to small unit

---

## Blast Radius
- **Files:** 2 — `inventoryTransform.js` (transform layer), `InventorySetupPanel.jsx` (UI)
- **Hotspot:** NO (neither file is in R5 list)
- **Scope:** SMALL (~30 lines across 2 files)

## Code Reality
- **Sub-Issue A:** Bug in existing code (line 130 + 148 of inventoryTransform.js)
- **Sub-Issue B:** Missing feature (no auto-mapping logic exists)
- **Sub-Issue C:** Existing dropdown needs to become read-only

## Open Questions
None — all 3 sub-issues have clear owner-confirmed behavior.
