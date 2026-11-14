# CR-514 — Payment: Optional Transaction ID / Reference Field per Payment Method

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner requests a configurable text field on the payment method panel that lets cashiers enter a transaction reference (e.g. UPI transaction ID, bank transfer reference, card approval code, cheque number). The field should be:
- Available per payment method (at minimum UPI, Card, Bank Transfer; optionally all)
- Configurable as **mandatory** or **optional** per method (restaurant setting)
- Stored and visible in Order Report / Order Beta detail view

**Current behaviour:** No free-text reference field exists in the payment panel. Cashiers cannot record a transaction reference at settlement time.

**Expected behaviour:** A labelled input (e.g. "Transaction ID" or "Reference") appears below the amount for selected payment methods. If configured mandatory, the Pay button is disabled until a value is entered.

---

## 2. Classification

- **Type:** CR (Change Request)
- **Severity:** P2 — Medium (workaround: add note elsewhere; not blocking but causes reconciliation gaps)
- **Risk:** HIGH — touches CollectPaymentPanel (R5 hotspot), payment payload to backend, Order Report transform
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (R5 hotspot, financial-adjacent payload change)

---

## 3. Duplicate Check

- Searched: "transaction id", "payment reference", "reference id", "payment note", "txn id" in registry.json
- **Result: DISTINCT** — no prior registration found

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — payment method panel (Cash/UPI/Card/Split/Credit/To Room visible)
- **Steps to reproduce:** Open any order → Collect Payment → select UPI — no reference field
- **Confidence:** CONFIRMED (owner described requirement clearly)

---

## 5. Blast Radius

- `CollectPaymentPanel.jsx` (R5) — primary UI changes (~20–30 lines new input + validation)
- `orderTransform.js` (R5) — extend payment payload with `transaction_ref` field
- `AllOrdersReportPage.jsx` or `OrderReportBetaPage.jsx` — show ref in order detail
- Backend: needs to store + return `transaction_ref` per payment method (backend dependency TBD)
- **Estimated scope:** MEDIUM (3–4 files, 2 R5 hotspots)
- **Hotspot files:** YES — CollectPaymentPanel.jsx, orderTransform.js

---

## 6. Open Questions

- OD-514-01: Which payment methods should show the field? (a) UPI + Card + Bank Transfer only (b) all methods including Cash (c) configurable per restaurant
- OD-514-02: Is mandatory/optional controlled per-restaurant in settings or hardcoded?
- OD-514-03: Backend confirmation needed — will `transaction_ref` be stored and returned in order APIs?

---

## 7. Code Reality

- **Status:** NONE — no reference/transaction ID field in CollectPaymentPanel.jsx

---

## 8. Related

- CR-483 (Received Amount field — same CPP panel, GATE_5A_IMPLEMENTED)
- BUG-583 (Print confirmation flow)
