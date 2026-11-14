# CR-438 — E-Invoice Upload to Govt GST Portal for B2B Customers

**Registered:** 2026-10-18
**Type:** CR
**Priority:** P1
**Risk:** HIGH
**Area:** Billing / GST / B2B
**Sprint:** backlog
**Status:** GATE_1_INTAKE

---

## Description

For B2B customers (with GSTIN), the generated invoice needs to be submitted/uploaded to the government GST portal (IRP — Invoice Registration Portal) to obtain an IRN (Invoice Reference Number) and QR code. This is a legal compliance requirement for B2B transactions above a certain threshold.

---

## Duplicate Check

**RELATED to CR-431** (e-Invoice download link in Orders Beta, `GATE_5B_QA_PASSED`) — CR-431 adds a download link for existing e-invoices. CR-438 is about the UPLOAD/SUBMISSION flow to the government portal, which is a different and broader scope.

**RELATED to CR-116** (B2B Customer GST & Name Capture) — CR-116 captures GSTIN at checkout. CR-438 uses that GSTIN to generate and submit the e-invoice.

---

## Evidence

- Source: OWNER-REPORTED
- Confidence: REPORTED
- Legal requirement: GST e-invoicing mandatory for businesses above turnover threshold

---

## Open Decisions

- **OD-438-01:** Does the backend handle the IRN generation and IRP API call, or does the FE need to trigger it?
- **OD-438-02:** At what point in the flow is e-invoice submitted? On collect bill? On bill print? On manual trigger?
- **OD-438-03:** What is shown to the user after successful submission (IRN number, QR code on bill)?
- **OD-438-04:** Error handling — what if IRP submission fails? Can cashier proceed without IRN?

---

## Blast Radius (estimate)

- `CollectPaymentPanel.jsx` (R5) — trigger submission on collect bill
- `orderTransform.js` (R5) — include IRN/QR in bill payload
- Possibly new API service for IRP call
- Estimated scope: LARGE (3–5 files, multiple R5)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: Blocked on OD-438-01 (backend/FE responsibility split)
