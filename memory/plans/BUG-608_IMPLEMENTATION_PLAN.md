# BUG-608 — Implementation Plan (Gate 3)

**ID:** BUG-608
**Date:** 2026-10-22
**IA:** `impact/BUG-608_IMPACT_ANALYSIS_REV2.md`
**Risk:** HIGH
**Scope:** 4 files, 10 edit locations

---

## Fix Pattern (applied to all 10 locations)

1. `onFocus` → `e.target.select()` (select all on click — works for zero AND non-zero)
2. `onChange` → allow empty string (don't reject NaN from empty)
3. `onBlur` → reset to 0 if empty (prevent leaving field blank)

---

## Edits

### File 1: BulkEditor.jsx — 1 location (L1403)
All 11 number columns share one CellRenderer.

### File 2: ProductForm.jsx — 4 locations
- L18-21: InputField onChange
- L23: InputField onFocus
- L104-107: VariationOptionRow price
- L178: Variation Min
- L183: Variation Max

### File 3: AddonManagementPanel.jsx — 4 locations
- L156: Add addon price
- L158: Add addon weight
- L237: Edit addon price
- L239: Edit addon weight

### File 4: VariationExpandPanel.jsx — 1 location
- L54-56: Variation option price
