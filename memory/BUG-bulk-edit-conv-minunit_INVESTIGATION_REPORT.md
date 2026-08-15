# BUG-bulk-edit-conv-minunit — Investigation Report
**Date:** 2026-08-13  
**Role:** INVESTIGATION  
**Steps used:** 9/10  
**Confidence:** HIGH  
**Source:** Owner-reported (screenshot: bulk edit shows Conversion and Min Unit as "—"/black)

---

## 1. Summary
Two distinct root causes for the "black" (invisible/empty) appearance of Conversion and Min Unit in bulk edit:

1. **Conversion:** The input uses `border-transparent bg-transparent` styling when clean/unchanged — it's technically editable but looks like plain static text. Also, auto-units (kg/ltr) deliberately return empty `conversionFactor` from the backend (backend handles ×1000 internally). Both contribute to "—" appearance.
2. **Min Unit:** The `minUnitAlert` field stores a unit string (e.g., "gm") but the bulk edit renders it as `<input type="number">`. Browsers silently discard non-numeric string values — so any stored unit string is invisible, always showing placeholder "—". This is a **data-loss risk** on save.

**Classification:** FE_BUG — G2 is CODE_ERROR (wrong input type), G1 is UX_GAP (invisible styling)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result |
|---|---|---|---|---|
| H1 | conversionFactor is empty from API for all items | grep transform | 1 | PARTIAL — empty for auto-units (intended), but invisible because of transparent styling |
| H2 | minUnitAlert is stored as string but rendered as number input | grep + view component | 2 | CONFIRMED — `type="number"` drops string values |
| H3 | Styling makes inputs look non-editable | Read numCls function | 3 | CONFIRMED — `border-transparent bg-transparent` |
| H4 | Card view has different/smarter logic | Read InventorySetupPanel.jsx | 4 | CONFIRMED — card view locks minUnitAlert as read-only display |

---

## 3. Full Gap Register

### BULK EDIT GAPS (IngredientBulkEditor.jsx)

| ID | Gap | Severity | Line | Risk |
|----|-----|----------|------|------|
| G1 | `numCls(false)` = `border-transparent bg-transparent` → inputs look like plain text, not editable | VISUAL | 286–288 | LOW |
| **G2** | Min Unit `<input type="number">` — unit strings silently dropped; data loss on save | **FUNCTIONAL** | 430–433 | **HIGH** |
| G3 | No smart unit logic: kg/ltr conversion should show "Auto" not editable input | UX | 420–424 | MEDIUM |
| G4 | Conversion placeholder "—" not descriptive like "1 kg = ? gm" | UX | 423 | LOW |
| G5 | No validation: different base/small unit with no conversion factor is accepted silently | VALIDATION | handleSave | MEDIUM |

### CARD VIEW GAPS (InventorySetupPanel.jsx)

| ID | Gap | Severity | Line | Risk |
|----|-----|----------|------|------|
| G6 | Import button permanently disabled (`opacity-60 cursor-not-allowed`) but bulk edit has working import | FUNCTIONAL | 274–277 | MEDIUM |
| G7 | Category delete uses `window.confirm` — should use AlertDialog (BUG-276 pattern) | UX | 101 | LOW |
| G8 | Ingredient delete uses `window.confirm` — same issue | UX | 118 | LOW |
| G9 | Auto-unit rows show "—" for conversion when it could say "Auto ×1000" | UX | 438 | LOW |

---

## 4. Data Flow Trace (Min Unit — broken chain)

```
Backend: item.min_unit_alert = "gm"
↓ inventoryTransform.js:72
  minUnitAlert: item.min_unit_alert || ''   → "gm"   ✅ correct

↓ IngredientBulkEditor.jsx buildRow():36
  minUnitAlert: ing.minUnitAlert || ''      → "gm"   ✅ correct

↓ <input type="number" value="gm" />
  → browser silently rejects string         → ""     ❌ DATA LOST IN UI

↓ placeholder="—" shown                             ❌ Misleading to user

↓ On save: row.minUnitAlert = "" (from controlled input)
  → toAPI sends min_unit_alert: ""                  ❌ DATA LOSS ON SAVE
```

---

## 5. Priority Recommendations

| Priority | ID | Fix |
|----------|----|-----|
| **P1** | G2 | Change `<input type="number">` → text input or read-only display (locked to smallUnit, matching card view) |
| **P2** | G1 | Add visible border/background to number inputs in clean state, or use subtle bg-slate-50 |
| **P2** | G6 | Enable Import in card view (same handler as bulk edit) |
| **P3** | G3, G4 | Add smart unit logic (hide/lock conversion for auto-units) |
| **P3** | G7, G8 | Replace window.confirm with AlertDialog |

---

## 6. Planning Skip Eligibility (for G2 only)
- 1 file: `IngredientBulkEditor.jsx` line 430–433
- ≤ 5 changed lines
- Not a hotspot file (R5 list)
- Not financial logic (R6)
- **ELIGIBLE for direct fix with owner approval**
