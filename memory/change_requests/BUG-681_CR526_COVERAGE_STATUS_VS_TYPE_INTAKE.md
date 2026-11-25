# BUG-681 — CR-526 Implementation Bug: coverage.status vs coverage.type

**Registered:** 2026-11-17
**Type:** BUG (QA failure on implemented CR)
**Sprint:** nov_cr_batch
**Priority:** P0
**Risk:** LOW (2 lines, 1 file, not hotspot)
**Status:** GATE_1_INTAKE_COMPLETE
**Client:** ALL
**Assignee:** Abhishek
**Routing reason:** FE-only, 2-line fix
**Parent:** CR-526 (Credit Management Remove/Void — GATE_5A_IMPLEMENTED)

---

## 1. Description

CR-526 was implemented and marked GATE_5A_IMPLEMENTED on 2026-11-16. However, the "Remove" / "Make Unpaid" button in Credit Management **still does not appear** despite the user having `order_unpaid` permission.

**Root cause:** `CreditCustomerDetailSheet.jsx` checks `coverage.status` (lines 156, 166) but `computeFifoCoverage()` returns objects with property `.type` (lines 65-68). `coverage.status` is always `undefined` → condition always `false` → button never renders.

---

## 2. Classification

- **Type:** BUG (CODE_ERROR in CR-526 implementation)
- **Severity:** P0 — Credit Management core action broken
- **Risk:** LOW — 2 lines, 1 file, not a hotspot
- **Fast Lane:** YES (eligible — 2 lines, 1 file, not hotspot, not financial logic change)
- **Planning skip eligible:** YES — owner approval required

---

## 3. Duplicate Check

- CR-526: PARENT — this is a bug IN the CR-526 implementation
- **Result: DISTINCT** — no existing bug covers this specific property mismatch

---

## 4. Evidence

- **Source:** AGENT-DISCOVERED (Investigation session 1, 2026-11-17)
- **Confidence:** HIGH (reproduced + traced)
- **Test account:** owner@mantri.com / Qplazm@10
- **Code:** `CreditCustomerDetailSheet.jsx` lines 156, 166 (bug) vs lines 65-68 (correct `.type`)

---

## 5. Fix

```
Line 156: coverage.status === 'open'    →  coverage.type === 'open'
Line 166: coverage.status === 'partial' →  coverage.type === 'partial'
```

**2 lines, 1 file: `CreditCustomerDetailSheet.jsx`**

---

## 6. Blast Radius

- 1 file, 2 lines, not a hotspot
- **SMALL**

---

```
Intake complete: BUG-681
Classification: BUG, Severity: P0, Risk: LOW
Duplicate check: DISTINCT (parent: CR-526)
Evidence: code-traced (investigation report)
Blast radius: SMALL (2 lines, 1 file)
Client: ALL
Assignee: Abhishek
Fast Lane: eligible (owner approval)
Next: Owner approves Fast Lane → Direct bug fix
```
