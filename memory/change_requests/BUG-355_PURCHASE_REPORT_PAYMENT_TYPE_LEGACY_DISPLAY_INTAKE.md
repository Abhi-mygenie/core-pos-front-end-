# BUG-355 — PurchaseReportPage: Payment Type Cards Show ₹0 for Historical Records

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 6)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P1 |
| Risk | MEDIUM |
| Side | Frontend |
| Root cause | CODE_ERROR |
| Duplicate check | RELATED to today's fix (submit side fixed; display side open) |
| Code reality | NONE (fix not present) |
| Blast radius | SMALL (1 file, 1 function) |
| Fast Lane eligible | YES (1 file, <10 lines, no API change — needs owner GO) |

## Description

The Payment Method split cards (Cash / UPI / Bank Transfer) on `PurchaseReportPage` show ₹0 for records where `Payment_Type` is the legacy value `'paid'`.

**Note:** The *submit* side was fixed today (2026-08-26) — `SmartPurchasePanel.jsx` now sends the actual method name (`'Cash'`, `'UPI'` etc.) instead of hardcoded `'paid'`. However, historical records already stored with `Payment_Type: 'paid'` still render incorrectly.

## Root Cause

`PurchaseReportPage.jsx:197`:
```js
const p = r.Payment_Type || 'Cash';  // 'paid' falls through → payData['paid'] never mapped to a card
```

`PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer']` — `'paid'` is not in this list → all three cards show ₹0 for affected records.

## Proposed Fix

Map legacy `'paid'` values to a fallback display method, or make the payment split cards dynamic (render any key found in `payData`):

**Option A (Normalise):** Map `'paid' → 'Cash'` as the legacy default at line 197.
**Option B (Dynamic):** Build cards from actual `Object.keys(payData)` instead of the hardcoded `PAYMENT_METHODS` array.

## Evidence

- File: `src/pages/reports-module/PurchaseReportPage.jsx:197`
- Steps: View Purchase Report → Cash/UPI/Bank Transfer cards show ₹0 for older purchases
- Confidence: HIGH (code-verified)

## Owner Decisions Needed

OD-1: Option A (map 'paid'→Cash as default) or Option B (dynamic cards from actual data)?
