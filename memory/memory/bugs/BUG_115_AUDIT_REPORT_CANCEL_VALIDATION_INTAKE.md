# BUG-115 — Audit Report: Cancelled Order Edge Case + Production Validation

**Status:** DISCOVERY COMPLETE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** AllOrdersReportPage.jsx, reportTransform.js

---

## 1. Problem Statement (Owner Verbatim)

> If the item is canceled or the order is canceled, sometimes for one of the cases it is not coming right in the audit report. Validate the audit report and freeze for production.

---

## 2. Root Cause Found — TAB_FILTERS.cancelled Misses Pre-Billing Cancellations

### File: `AllOrdersReportPage.jsx` L84

```js
cancelled: (o) => o.paymentMethod === 'Cancel',
```

This filter ONLY checks for the exact string `'Cancel'` in `paymentMethod`. But there are cancelled orders where this doesn't match:

| Scenario | paymentMethod | fOrderStatus | Matches Filter? | Visible in Cancelled tab? |
|---|---|---|---|---|
| Normal cancel (post-billing) | `'Cancel'` | 3 | ✅ YES | ✅ YES |
| Cancel before billing | `'pending'` or `'cash'` | 3 | ❌ NO | ❌ MISSING |
| Cancel with lowercase | `'cancelled'` | 3 | ❌ NO | ❌ MISSING |
| All items cancelled, order not | varies | varies (not 3) | ❌ NO | ❌ MISSING |

### The transform DOES identify these correctly (`reportTransform.js` L972):
```js
const isCancelled = paymentMethod === 'Cancel' || paymentMethodLower === 'cancelled' || fStatus === 3;
```

But the **tab filter** at L84 is narrower than the transform's `isCancelled` flag. The row gets `isCancelled: true` but the tab filter doesn't match it → the order falls through all tabs into "All" but is invisible in "Cancelled".

### Already identified as OG-FE-01 in OPEN_GAPS_REGISTER.md:
> **OG-FE-01 — Cancelled tab classifier misses pre-billing cancellations.** 12 orders in May. `paymentMethod = 'pending'` + `fOrderStatus = 3` → fall through all filters → "Unmatched". Waiting owner decision: existing Cancelled tab or new "Voided" tab?

---

## 3. Fix

### Change `TAB_FILTERS.cancelled` (L84):

**BEFORE:**
```js
cancelled: (o) => o.paymentMethod === 'Cancel',
```

**AFTER:**
```js
cancelled: (o) => o.paymentMethod === 'Cancel' || o.isCancelled,
```

The `isCancelled` flag is already computed by the transform (L972) and includes all 3 cases: `payment_method === 'Cancel'`, lowercase `'cancelled'`, and `fOrderStatus === 3`.

### Also update exclusions in other tabs (L70, L107):

Other tab filters exclude `paymentMethod === 'Cancel'` but don't exclude `isCancelled` orders:
- `paid` L70: `if (o.paymentMethod === 'Cancel') return false;` → add `|| o.isCancelled`
- `running` L107: same pattern

---

## 4. Affected Files

| File | Lines | Change |
|---|---|---|
| `AllOrdersReportPage.jsx` | L84 | Expand cancelled filter to use `isCancelled` flag |
| `AllOrdersReportPage.jsx` | L70, L107 | Update exclusions in paid + running tabs |

---

## 5. Part B — Production Validation Scope

Full validation checklist before freezing the Audit Report for production:

| # | Check | Status |
|---|---|---|
| 1 | All order statuses render in correct tab | TBD |
| 2 | Pre-billing cancelled orders appear in Cancelled tab | TBD |
| 3 | Merged orders appear in Merged tab (not Cancelled) | TBD |
| 4 | Financial totals match (subtotal, tax, discount, total) | TBD |
| 5 | Date filters work correctly | TBD |
| 6 | Payment type/status filters work | TBD |
| 7 | Side-sheet drill shows correct data | TBD |
| 8 | Export Excel/PDF matches on-screen data | TBD |
| 9 | Edge cases: partial cancellations, comp items, room orders, split orders | TBD |

---

## 6. Open Questions

| # | Question |
|---|---|
| Q-115-1 | Should pre-billing cancellations go in the existing Cancelled tab, or a new "Voided" tab? (OG-FE-01 from gaps register) |
