# CR-165 Post-Implementation Bug Investigation Report
## Three Gaps: Toast Crash + Cancelled Tab Miss + Refund on Cancelled Rows

**Date:** 2026-08-24
**Role:** INVESTIGATION
**Triggered by:** Owner-reported errors on order 000469 (owner@mygeniedev.com)
**Steps used:** 10/10

---

## 1. Summary

| Gap | Root Cause | Classification | Confidence | File |
|---|---|---|---|---|
| **G1** — React crash on cancel | `toast({title,desc})` passed to sonner (expects string) | CODE_ERROR | **HIGH** | `DashboardPage.jsx:1355` |
| **G2** — Cancelled Razorpay orders invisible in Cancelled tab | Filter checks `paymentMethod==='Cancel'` only; Razorpay-cancelled orders have `paymentMethod='razorpay'` + `fOrderStatus=3` | CODE_ERROR | **HIGH** | `AllOrdersReportPage.jsx:87` |
| **G3** — Refund button shows on already-cancelled rows | No status guard on button condition | CODE_ERROR | **HIGH** | `OrderReportBetaPage.jsx:490` |

All three are FE CODE_ERROR — plan implementation missed the library contract and status guards.

---

## 2. Hypotheses Tested

### G1 — React crash "Objects are not valid as a React child {title, de...}"

| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | `DashboardPage` uses sonner `toast` but CR-165 calls it with `{title,desc}` object | Read line 36 + CR-165 additions | ✅ CONFIRMED |
| H2 | Error from `CancelOrderModal` error state rendering | Read modal error path | ❌ ELIMINATED — modal renders string, not object |

**Confirmed at line 36:**
```js
import { toast } from 'sonner'; // BUG-254
```
Sonner's API: `toast("message string")` or `toast.success("msg")` — does NOT accept config objects.

**CR-165 added at lines 1355–1361:**
```js
toast({ title: "Refund Initiated", description: "..." });     // ← object passed to sonner
toast({ title: "Refund Failed", description: "...", variant: "destructive" }); // ← object
```

Sonner passes the object to React as a child → **"Objects are not valid as a React child (found: object with keys {title, de...})"** — exact match to screenshot error.

**All other files use the correct format for their library:**
- `OrderEntry.jsx`: `useToast()` hook → `toast({title, description})` ✅
- `AllOrdersReportPage.jsx`: `useToast()` hook → `toast({title, description})` ✅
- `DashboardPage.jsx`: sonner → should be `toast.success("msg")` / `toast.error("msg")` ← our code used the wrong format

---

### G2 — Cancelled Razorpay orders don't appear in Cancelled tab

| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | Filter checks `paymentMethod` string only — Razorpay-cancelled orders keep `paymentMethod='razorpay'` not `'Cancel'` | Read TAB_FILTERS.cancelled + compare paid filter | ✅ CONFIRMED |
| H2 | Separate cancel endpoint (REPORT_CANCELLED_ORDERS) handles them separately | Read reportService.js | ❌ ELIMINATED — AllOrdersReportPage uses `getOrderLogsReport` (combined), not separate cancel endpoint |

**TAB_FILTERS.cancelled (line 87):**
```js
cancelled: (o) => o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled',
```

**The gap:** A Razorpay order that was cancelled has:
- `fOrderStatus: 3` (cancel status code — same as any cancelled order)
- `paymentMethod: 'razorpay'` (original PG method, not overwritten to 'Cancel')

The filter checks `paymentMethod` only — not `fOrderStatus`. So `fOrderStatus: 3 + paymentMethod: 'razorpay'` → falls through ALL tab filters → appears in **no tab at all**.

Contrast with `paid` filter which correctly uses `fOrderStatus`:
```js
return o.fOrderStatus === 6;  // ← status-based, works correctly
```

**Fix needed:** `cancelled: (o) => o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled' || o.fOrderStatus === 3`

---

### G3 — Refund button shows on already-cancelled rows in OrderReportBetaPage

| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | Refund button condition has no status guard | Read button JSX | ✅ CONFIRMED |
| H2 | Cancelled Razorpay rows filtered to cancelled tab, Refund only shows on paid | Read tab filter | ❌ ELIMINATED — same G2 issue: cancelled Razorpay rows may appear in "All Orders" or "Paid" tab because they're NOT filtered to cancelled |

**Refund button (line 490):**
```jsx
{row.razorpay_order_id && (
  <button>Refund</button>
)}
```

No guard for:
- `row.f_order_status !== 3` (order not cancelled)
- `row.payment_type !== 'cancel'` / `!== 'cancelled'`

A cancelled Razorpay order retains `razorpay_order_id` non-null after cancellation. The button renders.

**Additionally:** OrderReportBetaPage has the same `payment_method`-only cancelled tab filter as AllOrdersReportPage → cancelled Razorpay orders appear in the **All Orders** or even **Paid** tabs (if `payment_type === 'paid'` in the report API). Refund button then shows there too.

---

## 3. Data Flow Trace (G1)

```
Dashboard cashier taps Cancel on Razorpay order
  → CancelOrderModal opens (mode="refund") — correct
  → cashier confirms → handleCancelOrderConfirm(reason, note) fires
      → api.put(ORDER_STATUS_UPDATE) — cancel fires — OK
      → waitForOrderRemoval — OK
      → order.razorpayOrderId is truthy → enters refund block
          → cancelAndRefund() — OK
          → toast({ title: "Refund Initiated", ... })
                         ↑
              SONNER RECEIVES OBJECT — tries to render as React child
              → React error boundary catches
              → "Something went wrong" screen
```

**Break point:** `toast()` at line 1355 — wrong call format for sonner library.

---

## 4. Evidence Artifacts

Saved to: `/app/memory/evidence/CR165-BUGS/code_evidence_2026_08_24.json`

---

## 5. Recommendations

| Gap | Classification | Fix | Scope |
|---|---|---|---|
| G1 | CODE_ERROR — library mismatch | In `DashboardPage.jsx` CR-165 toast calls: change `toast({title,desc})` → `toast.success("msg")` / `toast.error("msg")` (sonner format) | 2 lines |
| G2 | CODE_ERROR — incomplete filter | In `AllOrdersReportPage.jsx` TAB_FILTERS.cancelled: add `\|\| o.fOrderStatus === 3` | 1 line |
| G3 | CODE_ERROR — missing guard | In `OrderReportBetaPage.jsx` Refund button: add `&& row.f_order_status !== 3` condition | 1 line |

All three: FE_FIX, Planning skip eligible? **YES** — all ≤2 lines, 1 file each, not hotspot (R5), not financial logic (R6). **Owner approval needed for direct fix path.**

---

## 6. Retroactive Candidates

None — all gaps are new code from CR-165 implementation (2026-08-24).
