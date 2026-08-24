# CR-158 — Gate 2: Impact Analysis

**ID:** CR-158
**Title:** GST/VAT Validate Button in Menu Management Bulk Editor
**Date:** 2026-08-20
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis only
**Risk:** HIGH (tax validation logic in R5-adjacent hotspot file)
**Intake doc:** `change_requests/CR-158_GST_VAT_VALIDATE_BUTTON_MENU_MGMT_INTAKE.md`

**Owner decisions locked (this session):**
- Q1: GST/VAT fields only (not name/category/price)
- Q2: Highlight in-place (no auto-scroll)
- Q3: Show issue count on button (`Validate (3 issues)`)

---

## Code Reality Check

```bash
grep -n "validateRow\|_validationErrors\|bg-red-50" BulkEditor.jsx
```

**Code Reality: PARTIAL**

| Component | Status | Location |
|---|---|---|
| `validateRow(row)` — full validation fn | ✅ EXISTS | L492–516 |
| GST/VAT check inside validateRow | ✅ EXISTS | L506–514 |
| `_validationErrors` row field (set/clear) | ✅ EXISTS | L439, L534–536 |
| Row red highlight on `_validationErrors` | ✅ EXISTS | L914 `bg-red-50/40 border-l-4 border-l-red-500` |
| Cell red tint on failing field | ✅ EXISTS | L934 `bg-red-100/60` |
| **`handleValidate` function** | ❌ MISSING | — |
| **`validateIssueCount` state** | ❌ MISSING | — |
| **"Validate" button in toolbar** | ❌ MISSING | — |

**Everything needed to display errors is already built.** Only the trigger + state + button are missing.

---

## Conflict Pre-Check

| File | Open items | Conflict with our target lines? |
|---|---|---|
| `BulkEditor.jsx` | None found | **CLEAN** |

---

## Gate 2 — Impact Analysis

### What `validateRow` already checks

```js
// L492–516
const validateRow = (row) => {
  errors.push name required          // field: "productName"
  errors.push category required      // field: "categoryId"
  errors.push price > 0 (new items)  // field: "basePrice"
  // CR-158 scope (owner Q1: tax only):
  if (gstRequired && !packedFood) {
    if (!hasValidTaxType || !hasPositiveRate) {
      errors.push { field: "taxType",    message: "GST or VAT required" }
      errors.push { field: "taxPercent", message: "Tax % must be > 0"  }
    }
  }
}
```

**CR-158 Validate button runs `validateRow` but keeps only tax errors** (`field === 'taxType'` or `field === 'taxPercent'`). Name/category/price validation is untouched — still runs at Save only.

### Data Flow

```
Staff opens Bulk Editor (200 items)
  → clicks [Validate] button
  → handleValidate() runs:
      rows.forEach(r => {
        allErrors = validateRow(r)
        taxErrors = allErrors.filter(e => e.field in ['taxType','taxPercent'])
        set r._validationErrors = taxErrors (or null if clean)
      })
      setValidateIssueCount(rows with taxErrors.length > 0)
  → Existing row highlight (L914) fires automatically → red rows visible
  → Existing cell tint (L934) fires automatically → taxType/taxPercent cells red
  → Button label updates: "Validate (3 issues)"

Staff edits a row (fixes tax)
  → field change handler clears _validationErrors for that row (L439 already does this)
  → setValidateIssueCount(null)  ← reset to "not run" so staff knows to re-validate
  → Row red goes away automatically

Staff re-clicks Validate
  → Fresh pass, updated count
```

### `gstRequired` gate matters

`validateRow`'s tax check is guarded by `const gstRequired = restaurant?.tax?.gstStatus === true` (L213). If the restaurant doesn't have GST enabled, **`validateRow` returns 0 tax errors regardless** — and Validate will always show "Validate (0 issues)". This is correct behaviour: no-GST restaurants don't need tax validation.

### Files Affected

| File | Change | Nature |
|---|---|---|
| `BulkEditor.jsx` | +`validateIssueCount` state, +`handleValidate`, +Validate button, +import `ShieldCheck`, +reset in field-change handler | 1 file, ~25 lines |

**Files WILL NOT touch:** `MenuManagementPanel.jsx`, `profileTransform.js`, `orderTransform.js`, any other file

### Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `validateRow` tax check (R6 logic) called from new path | LOW | Read-only — no rows mutated, no API call, no save triggered |
| Save-time validation broken by CR-158 | NONE | `handleSave` unchanged — calls `validateRow` independently |
| `_validationErrors` from Validate conflicts with Save-time errors | LOW | Save overrides `_validationErrors` with its own result — same field, safe |
| Stale count shown after editing | LOW | Reset `validateIssueCount → null` on any field edit |
| Icon not in current imports | MINOR | Add `ShieldCheck` to lucide import line |

### What Validate does NOT do

| Not included | Reason |
|---|---|
| Auto-scroll to first bad row | Owner Q2: no scroll |
| Validate name / category / price | Owner Q1: tax only |
| API call or save | Purely client-side |
| Block Save if issues found | Save remains independent |
| Mark rows that had issues but were fixed | Cleared on edit (L439) |

---

## Owner Decisions — All Locked ✅

| # | Question | Answer |
|---|---|---|
| Q1 | Validate scope | GST/VAT only |
| Q2 | Scroll on finding issues | No — highlight only |
| Q3 | Count on button | Yes: `Validate (3 issues)` |

---

## Verification Matrix (seeds Gate 3 plan)

| # | Test | Expected |
|---|---|---|
| 1 | Click Validate on a menu with 3 items missing GST | Button shows "Validate (3 issues)", 3 rows red |
| 2 | Click Validate on fully-configured menu | Button shows "Validate (0 issues)", no red rows |
| 3 | Edit a red row's tax → fix it | That row's red clears, button resets to "Validate" |
| 4 | Re-click Validate after fixing 1 of 3 | Button shows "Validate (2 issues)" |
| 5 | `gstRequired = false` restaurant | Button always shows "Validate (0 issues)" — no tax rule applies |
| 6 | Click Validate → then click Save | Save still runs own validation independently (unchanged) |
| 7 | taxType cell and taxPercent cell individually tinted | Both cells red on failing rows |
| 8 | PackedFood = "Yes" items not flagged | Exempt from tax check — no red |

---

## Summary

**Scope:** 1 file, ~25 lines, no API, no financial logic change, no new files.
**Risk:** HIGH (tax-adjacent) but **display/UX only** — no money computation changed.
**Pre-existing infrastructure reused:** `validateRow`, `_validationErrors`, row/cell highlights.

```
Planning complete: CR-158
Stage: Gate 2 — Impact Analysis only
Code reality: PARTIAL (validateRow + highlights exist; trigger + state + button missing)
Risk: HIGH
Files WILL change: BulkEditor.jsx only (~25 lines)
Files WILL NOT touch: MenuManagementPanel, profileTransform, orderTransform
Owner decisions: ALL LOCKED (Q1/Q2/Q3)
Conflict: CLEAN
Awaiting owner review → Gate 3
```
