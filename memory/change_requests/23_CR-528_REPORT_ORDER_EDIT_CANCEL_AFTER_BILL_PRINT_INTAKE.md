# CR-528 — Report: Order Edit and Cancel Operations After Bill Print

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants a dedicated **audit report** that shows all orders that were **edited** or **cancelled** after a bill was printed. This is a fraud/audit control feature — once a bill is printed, any changes to the order should be tracked and reportable.

**Current behaviour:** No dedicated report exists for post-bill-print edits or cancellations. Such actions may be tracked in activity logs but are not surfaced as a report.

**Expected behaviour:** A report page (or section within an existing report) showing:
- Orders where items were added/removed **after bill was printed**
- Orders cancelled after bill print
- Columns: Order ID, Table/Type, Original amount, Modified amount, Editor name, Edit time, Original print time

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — High (audit/compliance gap; fraudulent edits after print cannot be tracked)
- **Risk:** HIGH — new report, touches reporting layer, requires backend data
- **Area:** Reports / Analytics
- **Fast Lane:** NOT eligible (new report, backend dependency)

---

## 3. Duplicate Check

- BUG-579 (cancellation report values — GATE_1_INTAKE_COMPLETE): related, different
- CR-490 (Report permission split — GATE_5B_QA_PASS): different scope
- **Result: DISTINCT** — no post-bill-print edit/cancel audit report registered

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- New report page (e.g. `EditCancelAuditPage.jsx`) — or section in existing reports
- `reportService.js` — new API fetch
- Backend: needs endpoint returning post-print edit/cancel events (significant dependency)
- **Estimated scope:** MEDIUM-LARGE (2–3 FE files, backend dependency)

---

## 6. Open Questions

- OD-528-01: Does the backend track/store edit/cancel events after bill print, or does this need to be built from scratch?
- OD-528-02: Should this be a standalone report page or a tab within Order Beta / All Orders report?
- OD-528-03: Date range, restaurant filter, and export (PDF/Excel) needed?

---

## 7. Code Reality

- **Status:** NONE — no post-bill-print audit report

---

## 8. Related

- CR-489 (Edit After Bill Print — GATE_5A_IMPLEMENTED)
- CR-512 (Print Confirmation Flow — GATE_5A_IMPLEMENTED)
