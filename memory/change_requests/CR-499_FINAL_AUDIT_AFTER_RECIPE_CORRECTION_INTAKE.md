# CR-499 — Final Audit After Recipe Correction

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (inventory integrity: recipe corrections need verification before closing)
**Risk:** HIGH (touches stock audit, inventory reconciliation)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD
**DEPENDS ON:** CR-498 (Recipe Correction Workflow)

---

## Description

After a recipe correction (CR-498) is applied, a final audit step should be triggered to verify that:
1. The corrected recipe now produces accurate stock deductions
2. Current stock levels are reconciled against the corrected recipe quantities
3. Any discrepancies from the old (incorrect) recipe period are documented

This is a post-correction verification step — like a "closing audit" that confirms the correction was applied correctly and stock is now accurate.

**Expected behavior:**
- After CR-498 recipe correction is saved → system offers a "Run Audit" option
- Audit compares: current physical stock vs expected stock (based on corrected recipe + order history)
- Discrepancies highlighted with suggested adjustments
- Audit result saved for records

**Current behavior:** Stock Audit exists (`StockAuditPanel.jsx`) but is a general-purpose audit. No audit specifically tied to recipe corrections. No "post-correction verification" flow.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** N/A (new feature, dependent on CR-498)
- **Confidence:** N/A

---

## Code Reality Check

**Code reality: PARTIAL** — `StockAuditPanel.jsx` exists with physical qty vs system qty comparison. `inventoryTransform.js` handles stock calculations. But no recipe-correction-triggered audit flow.

---

## Duplicate Check

**RELATED** to:
- CR-498 (Recipe Correction Workflow — INTAKE): prerequisite — this is the audit AFTER correction
- BUG-459 (Stock Audit Physical Qty Mismatch — GATE_5A): related stock audit fix
- CR-472 (Item Consumption Report — INTAKE): consumption tracking, different scope

**Verdict: DISTINCT** — no existing item covers a post-recipe-correction audit.

---

## Blast Radius

- Stock audit: `StockAuditPanel.jsx`, `inventoryTransform.js`
- Recipe service: `recipeService.js` (trigger point)
- Possibly new audit summary component
- Estimated scope: LARGE (4+ files, ~80-120 lines)

---

## Open Questions

- **OD-499-01:** Should the audit be MANDATORY after every recipe correction, or optional (offered as a prompt)?
- **OD-499-02:** Should the audit compare against the corrected recipe only, or also show the impact of the old (incorrect) recipe?
- **OD-499-03:** Should discrepancies result in automatic stock adjustments, or require manual approval?
- **OD-499-04:** BACKEND DEPENDENCY — Can the backend provide order history with ingredient breakdown for a given period?
