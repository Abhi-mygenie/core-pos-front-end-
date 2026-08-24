# BUG-310 — Ingredient Bulk Edit: Conversion Field Invisible (Transparent Styling Looks Like Static Text)
**Registered:** 2026-08-13  
**Source:** OWNER-REPORTED (bulk edit screenshot — Conversion column shows "—" as black text)  
**Sprint:** POS 5.0  
**Status:** INTAKE — GATE 1

---

## Classification
- **Type:** BUG  
- **Severity:** P2 — UX gap (field is editable but looks non-editable)  
- **Risk:** LOW (no data loss, visual only)  
- **Area:** Inventory → Ingredients → Bulk Edit  
- **Duplicate check:** DISTINCT from BUG-265 (help text for card view) and BUG-275 (pre-fill logic). Different surface.

## Symptom
In the Ingredient Bulk Editor, the "Conversion" column shows "—" in what appears to be plain dark text. Users cannot tell the field is editable. There is no visible border, no background — the input is completely invisible until hovered.

## Root Cause
`IngredientBulkEditor.jsx:286-288` — `numCls(dirty=false)` returns:
```
'border-transparent bg-transparent hover:border-slate-200 focus:border-orange-400'
```
When the conversion factor is empty AND unchanged, `dirty=false` → fully transparent styling → the `"—"` placeholder text appears as floating plain text on the page. No affordance that the cell is editable.

**Secondary cause:** For auto-units (kg, ltr), `conversionFactor` is intentionally `''` (backend handles ×1000 internally). This is correct data but the invisible styling makes it look broken.

**Card view contrast:** `InventorySetupPanel.jsx` hides the conversion input entirely for auto-units (shows "—" as a `<span>`) and shows a descriptive placeholder `"1 kg = ? gm"` for custom units. The bulk editor has no such smart logic.

## Blast Radius
- 1 file: `IngredientBulkEditor.jsx` lines 286-288, 420-424
- Scope: SMALL (1 file, ~5 lines)
- Hotspot: NO
- Financial: NO

## Fix Approach (not implemented — awaiting Gate 4 GO)
Option A: Add a subtle `bg-slate-50/50 border-slate-100` to `numCls(false)` so empty inputs have a faint background — consistent with other bulk editors in the codebase.  
Option B: Add smart unit logic — for auto-units (kg/ltr), disable the field and show "Auto ×1000" label instead of editable input.

## Evidence
Investigation report: `/app/memory/BUG-bulk-edit-conv-minunit_INVESTIGATION_REPORT.md` (Gap G1)  
Planning skip eligible: YES — 1 file, ≤5 lines. Owner approval required.
