# CR-522 — Reconcile Amount Range Should Be Customizable

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The "Received Amount" panel (CR-483) allows a ±% variance on the payment amount (currently shows "±3% allowed (₹143.56 – ₹152.44)" based on a 3% default). The owner wants this reconciliation range to be **configurable per restaurant** rather than a fixed 3%.

**Current behaviour:** The reconcile/tolerance range is hardcoded at ±3% (or derived from a fixed restaurant setting). Restaurants cannot set their own acceptable variance range.

**Expected behaviour:** Restaurants can configure the reconciliation tolerance percentage (e.g. 1%, 2%, 3%, 5%) from the Settings page. The payment panel displays the range based on the configured value.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (enhancement; ±3% works as a default)
- **Risk:** HIGH — touches payment settings, CollectPaymentPanel (R5), settings transform
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (settings + payment panel, R5)

---

## 3. Duplicate Check

- CR-483 (Received Amount field — GATE_5A_IMPLEMENTED): implements the ±% feature
- **Result: RELATED CR-483** — CR-522 makes the range configurable rather than fixed

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — payment panel showing "±3% allowed (₹143.56 – ₹152.44)"
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `CollectPaymentPanel.jsx` (R5) — read configured % instead of hardcoded 3%
- Settings page — new input for reconcile tolerance %
- `profileTransform.js` or `restaurantSettingsTransform.js` — map new setting field
- Backend: needs to store + return the configured % (backend dependency)
- **Estimated scope:** MEDIUM (3–4 files, R5)

---

## 6. Open Questions

- OD-522-01: What is the input format? (a) A free-entry % field (b) A dropdown with preset options like 1%/2%/3%/5%/10%
- OD-522-02: Does the backend already support a `reconcile_tolerance_pct` setting, or is it hardcoded there too?

---

## 7. Code Reality

- **Status:** PARTIAL — reconcile range exists (CR-483 implemented); configurable setting not yet available

---

## 8. Related

- CR-483 (Received Amount field — GATE_5A_IMPLEMENTED)
