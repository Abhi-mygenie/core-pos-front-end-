# Session Handover — 2026-08-15 (Investigation: CR-140/141 Audit + Variation Display)

**Date:** 2026-08-15
**Role:** INVESTIGATION
**Steps used:** 7/10
**Report:** `/app/memory/investigation/CR140_CR141_GAP_AUDIT_AND_VARIATION_DISPLAY_INV.md`

## Findings (3 confirmed root causes)

| ID | Issue | Root Cause | Fix Required |
|---|---|---|---|
| BUG-A | Variations column not visible by default | `variations` is `tier: 2`; init logic only shows `tier === 1` | BulkEditor.jsx L57: `tier: 2` → `tier: 1` |
| BUG-B | Variation expand pills blank | VariationExpandPanel reads `val.label`/`val.optionPrice`; transform stores `val.name`/`val.price` | VariationExpandPanel.jsx L41: fix field names |
| STATUS | CR-140/141 completeness | Both code-complete. QA Gate 5b not executed for either. | Run QA (handover exists for CR-140, needs writing for CR-141) |

## Pending Owner Decisions
- Gate 4 GO for BUG-A + BUG-B (planning-skip eligible — both 1 file, ≤2 line changes, LOW risk)
- Gate 5b QA for CR-140 and CR-141
