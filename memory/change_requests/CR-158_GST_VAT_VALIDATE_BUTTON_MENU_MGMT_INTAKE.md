# CR-158 — GST/VAT Validate Button in Menu Management (Pre-Submit Highlight)

**Type:** Change Request (UX Enhancement)
**ID:** CR-158
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Currently in Menu Management (Bulk Editor), GST/VAT validation runs only **at submit time** — when the user tries to save, invalid rows are flagged. Owner wants a dedicated **"Validate"** button that:
1. Runs the GST/VAT (and tax type) validation across all rows **without submitting**
2. **Highlights** the rows that fail validation so the user can fix them before saving

This gives staff a way to audit tax compliance across the menu proactively, without triggering a save.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Menu Management → Bulk Editor |
| Priority | P1 |
| Severity | HIGH — tax compliance is critical; proactive validation prevents incorrect GST/VAT data being saved |
| Risk | HIGH (tax validation logic; must not alter the save-time validation which is the financial safety net) |
| Fast Lane | NO — new button + row highlight state + validation pass; multi-line change |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Steps to reproduce: Open Menu Management → Bulk Editor — no standalone "Validate" button visible; validation only fires on Save
- Confidence: REPORTED

## Code Reality Check

```bash
# BulkEditor.jsx — validation logic already exists:
  line 211: const gstRequired = restaurant?.tax?.gstStatus === true;  // GST flag
  line 213: CR-036-FU-03 F3: if restaurant has GST enabled, items must declare GST or VAT with rate > 0
  line 492: const validateRow = (row) => { ... }                       // ← validation function EXISTS
  line 500-507: GST/VAT required check for non-packaged items
  line 93:  const TAX_TYPE_OPTIONS = [{ value: "GST" }, { value: "VAT" }]

# Currently: validateRow() is called only during save flow
# Missing: standalone "Validate All" button + row highlight state
```

- **Code reality: PARTIAL** — `validateRow()` function is fully implemented; missing is: (1) a trigger button, (2) a row-level highlight/error state that persists without saving
- Primary file: `src/components/panels/menu/BulkEditor.jsx`

## Blast Radius

- Core change: `BulkEditor.jsx` only
- Add: "Validate" button in toolbar + row highlight state (`_validationError` flag per row)
- No API calls needed — purely client-side validation pass
- Estimated scope: SMALL-MEDIUM (1 file, ~20-30 lines)

## Expected Behavior

- **"Validate" button** appears in the Bulk Editor toolbar (near Save / Import buttons)
- On click:
  1. Runs `validateRow()` against all rows
  2. Rows with GST/VAT issues are **visually highlighted** (e.g., red border or row background tint)
  3. A summary shows: "X rows have tax issues — please fix before saving"
  4. No API call, no data mutation
- Save-time validation is **preserved as-is** (this button is additive, not a replacement)
- Highlight clears when the row's tax fields are corrected or when Validate is re-run

## Owner Decisions Needed

1. Should the validation button check GST/VAT only, or also other required fields (name, price, category)?
2. Should highlighted rows auto-scroll into view, or just be marked?
3. Should the count badge appear on the button itself (e.g., "Validate (12 issues")?

## Duplicate Check

RELATED to CR-036-FU-03 F3 (the original GST validation rule in BulkEditor). This CR adds a UX layer on top of that existing rule — it is NOT a duplicate, it extends the feature.

---

**Next:** Planning Gate 2
