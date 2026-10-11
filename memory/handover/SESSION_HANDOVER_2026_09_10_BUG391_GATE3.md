# Session Handover — 2026-09-10 — Planning Gate 3: BUG-391 Implementation Plan

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 3 — AGENT_PROMPT_ALPHA v0.7)
**Stage:** Implementation Plan complete. No code written.

---

## Entry Verification Result

All IA line references confirmed accurate against live code post-Batch A:
- ProductForm.jsx L231 (edit taxPercentage) ✅
- ProductForm.jsx L278 (new taxPercentage) ✅
- ProductForm.jsx L294 (useEffect deps) ✅
- ProductForm.jsx L431-435 (Tax Type + Tax % fields) ✅
- BulkEditor.jsx L553 (validateRow) ✅
- BulkEditor.jsx L567 (gstRequired block) ✅
- menuManagementTransform.js L268-269 (tax_type + tax) ✅

No drift. Plan is accurate against live code.

---

## Plan Summary

**5 edits, 3 files, ~25 lines**

| Edit | File | Change | Lines |
|------|------|--------|:-----:|
| E1 | ProductForm.jsx L231-232 | Edit mode: force taxPercentage=5 + taxType=GST for Aggregator | 2 |
| E2 | ProductForm.jsx L278 + L294 | New item default taxPercentage=5 for Aggregator + add menuType to deps | 2 |
| E3 | ProductForm.jsx L431-435 | Lock tax fields read-only for Aggregator (grey "GST (mandatory)" labels) | ~15 |
| E4 | BulkEditor.jsx L567 (insert before) | validateRow: unconditional Aggregator GST@5% block | ~7 |
| E5 | menuManagementTransform.js L268-269 | Safety net: override to GST/5 at transform for Aggregator | 2 |

**Execution order:** E5 → E1 → E2 → E3 → E4 (transform first, then form, then BulkEditor)

---

## Constraint (carry forward)

⚠️ Implementation MUST wait until Batch A (BUG-390 + CR-373 + BUG-392 + CR-374) QA passes. Same files in QA.

---

## Registry State

| ID | Gate | Status |
|----|:----:|--------|
| BUG-391 | 3 | GATE_3_IMPLEMENTATION_PLAN_COMPLETE — Awaiting Gate 4 GO |

---

## Artifacts

- `memory/plans/BUG-391_IMPLEMENTATION_PLAN.md` — created ✅
- `memory/control/registry.json` — BUG-391 updated to gate 3 ✅
- `memory/control/CONTROL_DASHBOARD.md` — updated ✅

---

## For Implementation Agent (when Gate 4 GO received)

1. Verify Batch A QA is complete before starting
2. Re-run entry verify on all 5 edit locations (line numbers may shift if Batch A QA required bug fixes)
3. Execute in order: E5 → E1 → E2 → E3 → E4
4. Compile check after each file
5. Run EXIT GATE 5-checkbox before writing QA handover
6. Credentials: owner@cafe103.com on preprod, route `/menu` → Menu Management

---

*Gate 3 complete. 3 files, 5 edits, ~25 lines, 11 verification checks + 5 regression tests. Awaiting Gate 4 GO.*
