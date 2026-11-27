# CR-527 — Credit Management: Filter Orders by Same Phone Number with Different Names

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants to filter Credit Management orders where the **same phone number** appears under **different customer names**. This helps identify and reconcile cases where the same customer used multiple names during different visits, all under the same phone number.

**Current behaviour:** Credit Management has basic filters (by name, by date, etc.) but no specific filter to group/show orders where the same phone number has been used with different names.

**Expected behaviour:** A filter option in Credit Management that shows all credit orders with the same phone number grouped together, even if different names were provided, so the owner can identify and reconcile such cases.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (data quality / reconciliation enhancement)
- **Risk:** MEDIUM — filter/display only, no payment logic change
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible (data filter, requires careful implementation)

---

## 3. Duplicate Check

- **Result: DISTINCT** — no prior registration

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `CreditManagementPage.jsx` — add filter/group-by-phone view
- Credit service / data transform — group by phone
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

## 6. Open Questions

- OD-527-01: Should this be a (a) filter chip showing "same phone, multiple names" or (b) a grouped view by phone number?
- OD-527-02: Does the credit API return `phone` for all entries, or only for entries where a customer was explicitly linked?

---

## 7. Code Reality

- **Status:** NONE — no phone-based group filter in credit management

---

## 8. Related

- CR-526 (Remove unpaid order from credit — same page)
