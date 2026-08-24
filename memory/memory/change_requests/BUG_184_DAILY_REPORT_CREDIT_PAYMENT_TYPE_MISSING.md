# BUG-184: Daily Report — CRE-Credit Payment Type Not Reflecting in Payment Column

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** MEDIUM
**Severity:** P1
**Classification:** BACKEND_DATA + possible FE_GAP

## Description
In Daily Report → "All Orders" tab, when payment is done via CRE-Credit, the PAYMENT column shows blank instead of showing the credit payment type.

## Investigation Findings

**Code trace:**
- `TAB_FILTERS.credit` (L86): matches `o.paymentMethod === 'TAB'`
- `reportTransform.js:266`: `paymentMethod: api.payment_method || 'TAB'`
- `OrderTable.jsx:546-567`: renders `order.paymentMethod` in the payment column
- `paymentClassifier.js` (CR-032): shared payment mapping — TAB returns null (credit never in paid mix)

**Root cause:** The backend returns empty/null `payment_method` for CRE-Credit settled orders. The FE has no mapping for the CRE-Credit payment type because it's not a recognized value in the payment classifier.

## Fix Required
- **BACKEND** — return a proper `payment_method` value (e.g., "CRE-Credit" or "Credit") for these orders
- **FE (maybe)** — if backend returns a new value, `paymentClassifier.js` may need to recognize it

## Files
- `reportTransform.js` (read), `paymentClassifier.js` (may need update), `OrderTable.jsx` (display)
