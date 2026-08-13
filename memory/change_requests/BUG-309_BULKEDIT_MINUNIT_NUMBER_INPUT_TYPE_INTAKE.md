# BUG-309 — Ingredient Bulk Edit: Min Unit Input Type Wrong (number vs string — data loss)
**Registered:** 2026-08-13  
**Source:** OWNER-REPORTED (bulk edit investigation — Min Unit shows "—")  
**Sprint:** POS 5.0  
**Status:** INTAKE — GATE 1

---

## Classification
- **Type:** BUG  
- **Severity:** P1 — Data loss risk (existing minUnitAlert values invisible and overwritten on save)  
- **Risk:** HIGH (data corruption on save)  
- **Area:** Inventory → Ingredients → Bulk Edit  
- **Duplicate check:** DISTINCT from BUG-219 (card view fix) and BUG-269 (card view alert unit). Bulk editor is a separate component.

## Symptom
In the Ingredient Bulk Editor, the "Min Unit" column always shows "—" even for ingredients that have a minUnitAlert value (e.g., "gm"). The input never accepts or displays the value. On save, an empty value is submitted, overwriting the stored unit string.

## Root Cause
`IngredientBulkEditor.jsx:430-433` — Min Unit is rendered as `<input type="number">`. The backend stores `min_unit_alert` as a **unit string** (e.g., "gm", "bottle") per BUG-219 contract. Browsers silently discard non-numeric values in number inputs → value always displays as empty → placeholder "—" shown.

**Data flow (broken):**
```
Backend: min_unit_alert = "gm" → fromAPI: minUnitAlert = "gm" ✅
→ buildRow(): minUnitAlert = "gm" ✅
→ <input type="number" value="gm"> → browser drops → "" ❌
→ On save: min_unit_alert: "" sent → DATA OVERWRITTEN ❌
```

**Card view contrast:** `InventorySetupPanel.jsx` correctly renders minUnitAlert as a read-only `<span>` locked to smallUnit (per BUG-269-C). Bulk edit should match this behaviour.

## Blast Radius
- 1 file: `IngredientBulkEditor.jsx` lines 430-433
- Scope: SMALL (1 file, ~5 lines)
- Hotspot: NO (not on R5 list)
- Financial: NO

## Fix Approach (not implemented — awaiting Gate 4 GO)
Change `<input type="number">` → read-only `<span>` locked to `row.smallUnit || row.unit || '—'`, matching the card view pattern from BUG-269-C. This is consistent, safe, and prevents data loss.

## Evidence
Investigation report: `/app/memory/BUG-bulk-edit-conv-minunit_INVESTIGATION_REPORT.md` (Gap G2)  
Planning skip eligible: YES — 1 file, ≤5 lines, no hotspot, no financial. Owner approval required.
