# BUG-593 — CRM Sends "noname" as Customer Name for Newly Added Customer

**Registered:** 2026-10-18
**Type:** BUG
**Priority:** P2
**Risk:** MEDIUM
**Area:** CRM / Customer / Order
**Sprint:** backlog
**Status:** GATE_1_INTAKE

---

## Description

When a new customer is added via the POS (during order taking or collect bill), the CRM receives "noname" as the customer name instead of the actual name entered by the staff member. The customer is created in CRM but with incorrect/placeholder name data.

---

## Duplicate Check

**DISTINCT** — no prior BUG for CRM sending "noname".

---

## Evidence

- Source: OWNER-REPORTED
- Confidence: REPORTED — exact repro steps TBC

---

## Suspected Root Cause

The `createCustomer` API call in `customerService.js` or the customer payload builder may be sending an empty/null name field, and the CRM backend defaults it to "noname" when the name is absent.

Candidates to investigate:
- `src/api/services/customerService.js` — `createCustomer` payload
- `src/api/transforms/customerTransform.js` — `toAPI` customer shape
- The name input field in CollectPaymentPanel / CRM typeahead — is it properly wired to state?

---

## Open Decisions

- **OD-593-01:** Does "noname" appear only for brand-new customers (create path), or also when updating existing customers?
- **OD-593-02:** Is the customer name being entered by staff before "Add" is clicked, or is Add triggered without a name?

---

## Blast Radius

- `src/api/services/customerService.js` — 1–2 lines
- Possibly `src/api/transforms/customerTransform.js`
- Estimated scope: SMALL (1–2 files)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: Ready — needs code trace of createCustomer payload
