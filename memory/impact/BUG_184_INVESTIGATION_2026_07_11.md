# Investigation Report — BUG-184: CRE-Credit Payment Type Not Reflecting

**Date:** 2026-07-11
**Agent:** INVESTIGATION
**Steps used:** 7/10
**Confidence:** HIGH
**Restaurant:** CAFE 103 (id=644)

---

## 1. Summary

The Credit tab in the Daily Report **intentionally does NOT show a Payment column**. TAB orders in the API have `payment_method="TAB"` (correct). When TAB orders are settled via Credit Management, the settlement payment method (Cash/Card/UPI) is sent via `credit-payment-insert` as `payment_status` — but the original order's `payment_method` stays `"TAB"` in the order-logs-report.

**Classification:** DESIGN_GAP — not a bug in the current code. The Credit tab shows orders that were punched on credit. The settlement payment type (how credit was cleared) is a SEPARATE data point that the order-logs-report API does not surface on the order row.

---

## 2. API Evidence (curl-verified)

### All payment_method values from cafe103 (May-Jul 2026, 4590 orders):

| payment_method | payment_status | payment_type | Count |
|----------------|---------------|--------------|------:|
| `upi` | `paid` | `postpaid` | 2,439 |
| `cash` | `paid` | `postpaid` | 1,458 |
| `card` | `paid` | `postpaid` | 469 |
| **`TAB`** | **`paid`** | **`postpaid`** | **139** |
| `partial` | `paid` | `postpaid` | 61 |
| `zomato_gold` | `paid` | `postpaid` | 23 |
| `upi` | `paid` | `prepaid` | 1 |

### Key finding: TAB orders have `payment_method="TAB"`, `payment_status="paid"`

The `"paid"` status means the TAB was SETTLED (credit cleared). But the `payment_method` remains `"TAB"` — it does NOT change to the settlement method (cash/card/upi).

---

## 3. FE Data Flow Trace

```
API: orders_table.payment_method = "TAB"
  → reportTransform.js L266: paymentMethod = api.payment_method || 'TAB'
  → TAB_FILTERS.credit: o.paymentMethod === 'TAB' → TRUE → shown in Credit tab
  → OrderTable columns for credit tab: orderId, status, time, customer, waiter, channel, Phone, amount
  → ⚠️ NO "Payment" column in credit tab columns (L197-203)
  → paymentClassifier.js L31: pm === 'tab' → return null (excluded from paid mix)
```

### Why no Payment column on Credit tab:

`OrderTable.jsx:197-203` — Credit tab gets `baseColumns + customerPhone` but NOT the `paymentMethod` column. This is **by design** — at the time of credit punch, there IS no payment method (it's deferred). The payment method only exists when the credit is SETTLED, which is a separate transaction.

### Credit settlement flow:

```
Credit Management → Select customer → Select order → Pay
  → creditService.js L65: POST /tap-waiter-order-insert
  → payload: { payment_status: "cash" | "card" | "upi", order_id, debit_order_amount }
```

The settlement payment method goes to a DIFFERENT API (`tap-waiter-order-insert`), not back to the order's `payment_method` field. The order-logs-report still shows the original `payment_method="TAB"`.

---

## 4. The Real Question

**What does the owner expect to see?**

| Interpretation | Current Behavior | Fix |
|---------------|-----------------|-----|
| A) Show how credit was PUNCHED (TAB at order time) | ✅ Already correct — `payment_method="TAB"` | None |
| B) Show how credit was SETTLED (Cash/Card/UPI at clearance time) | ❌ Not shown — settlement method is in a different API | **BACKEND_ASK**: order-logs-report needs to include the settlement payment method from `tap-waiter-order-insert` |
| C) Show a "Payment" column on the Credit tab | ❌ Column hidden by design | **FE_FIX**: add `paymentMethod` column to credit tab in OrderTable. Would show "TAB" for all rows (useless without interpretation B) |

---

## 5. Recommendations

### If owner wants interpretation B (settlement payment type):

1. **BACKEND_ASK (P1):** The `order-logs-report` API needs to surface the settlement payment method. Either:
   - Add a `settlement_payment_method` field to `orders_table` in the response
   - Or join with the `tap-waiter-order-insert` records to include the clearance method

2. **FE_FIX (after backend):** Add `settlementPaymentMethod` column to Credit tab

### If owner wants interpretation C (just show the column):

**FE_FIX (trivial):** Add `paymentMethod` column to credit tab columns at `OrderTable.jsx:197-203`. All rows will show "TAB". ~2 lines, LOW risk.

### Unrelated to BUG-184 but found during investigation:

The `paymentClassifier.js` correctly returns `null` for `"TAB"` (L31) — TAB orders are excluded from the Payments report paid mix. This is correct because credit-at-punch is not revenue until settled. **No fix needed here.**

---

## 6. Open Questions for Owner

| # | Question |
|---|----------|
| OQ-1 | What should the Credit tab's "Payment" column show — the word "TAB" (how it was punched), or "Cash"/"Card"/"UPI" (how credit was cleared)? |
| OQ-2 | If answer is "how credit was cleared" — this is a backend change (order-logs-report needs settlement method). Approve backend ask? |

---

## Evidence
- Curl: 4,590 orders analyzed from cafe103 May-Jul 2026
- 139 TAB orders found — all with `payment_method="TAB"`, `payment_status="paid"`
- `paymentClassifier.js` correctly excludes TAB from paid revenue
- Credit tab columns verified — no Payment column by design
