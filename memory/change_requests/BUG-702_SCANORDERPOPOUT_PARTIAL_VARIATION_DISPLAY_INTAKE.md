# BUG-702 — Confirmation popup (ScanOrderPopOut) shows partial variation (group name only, no option/price)

**Type:** BUG · **Priority:** P0 · **Risk:** LOW
**Status:** GATE_1_INTAKE_COMPLETE
**Registered:** 2026-11-18 · **Target release:** 2026-11-17 (owner-specified)
**Sprint:** nov_cr_batch · **Area:** Dashboard / Order display
**Client:** ALL (discovered on `macha`, restaurant_id 69) · **Assignee:** Abhishek
**Source:** INVESTIGATION (INV-POS-3BUGS, 2026-11-18) · **Confidence:** CONFIRMED (code-traced against backend contract)

---

## Summary
The edit-confirm / scan confirmation popup (`ScanOrderPopOut`) renders only the variation **group name** and a non-existent `v.price`. The selected option label and its price (what the customer actually chose, e.g. "Oat milk" +₹X) are never shown.

## Root cause (HIGH confidence)
Backend nests selected options under `v.values = [{ label, optionPrice }]` (contract documented in `orderTransform.js` L705-737; display transform stores it raw at L136). `ScanOrderPopOut` renders the **wrong fields**:
- L475-482 (collapsed summary): `variations.map(v => v.name).join(', ')` — group name only.
- L609-631 (expanded list): prints `v?.name || v?.label` and `Number(v?.price)` — never reads `v.values[].label` / `v.values[].optionPrice`.

**Correct reference renderer** (same data, rendered right): `CartPanel.jsx` L111-124 (`v.values.map(val => val.label)`) and L213-216 / L417-419 (sum `v.values[].optionPrice`). The popup should mirror CartPanel.

## Evidence
- Code contract: `src/api/transforms/orderTransform.js` L705-737, L136.
- Wrong render sites: `src/components/dashboard/ScanOrderPopOut.jsx` L475-482, L609-631.
- Correct reference: `src/components/order-entry/CartPanel.jsx` L111-124, L213-216, L417-419.
- Note: live variation shape could not be dumped (recent probed orders were closed/empty) — shape taken from in-code contract + cross-checked against CartPanel. Evidence dir: `/app/memory/evidence/INV-POS-3BUGS/`.
- Source report: `memory/investigations/INV-POS-3BUGS_INVESTIGATION_REPORT.md` (Issue 2).

## Steps to reproduce
1. Create/scan an order with an item that has a variation group (e.g. "Choice of milk" → "Oat milk").
2. Open `ScanOrderPopOut` for that order.
3. Observe the variation shows only the group name (or blank) and no option price.

## Blast radius
- File: `src/components/dashboard/ScanOrderPopOut.jsx` (display-only). Reference `CartPanel.jsx` (read-only).
- Scope: **SMALL** (1 file). Hotspot: ScanOrderPopOut (display path only).

## Risk & process
- **Risk: LOW** (display-only, single component).
- Planning-skip: candidate (≤ small, 1 file) — **owner to approve** via Planning; otherwise standard Gate 2-3 (fast).

## Classification / routing
- Duplicate check: **RELATED to BUG-573** (same root data shape `values[].label/optionPrice`), but **DISTINCT**: BUG-573 fixed the **OrderCard** variant parser (CLOSED, GATE_5B_QA_PASS); this is the **ScanOrderPopOut** popup, a different component never patched.
- Assignee routing: frontend display work → **Abhishek**.

## Open questions
- OD-702-01: Join multiple selected option labels with ", " and sum optionPrice (mirror CartPanel) — confirm display format with owner.
