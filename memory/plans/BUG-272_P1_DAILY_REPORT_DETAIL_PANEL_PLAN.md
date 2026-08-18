# Implementation Plan — BUG-272 P1: Partial Payment Badges in Daily Report + Order Detail Panel

**ID:** BUG-272 (P1 scope — Daily Report + Detail Panel)
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** Immediate (extends existing BUG-272 fix)
**Risk:** LOW
**Files:** 2 | **Lines changed:** ~25

---

## Step 0 — Starting Code State

### File 1: `src/components/reports/OrderTable.jsx`
**L546-571:** `case 'paymentMethod'` — renders single badge `order.paymentMethod`. For partial orders, shows flat "partial" badge. For `tabId === 'all'`, only shows cash/card/upi, everything else is "—".

**L34-44:** `getPaymentBadgeStyle()` — returns style class per payment method. `partial` falls to default `bg-zinc-100`.

**Available on `order` object:** `cashAmount`, `upiAmount`, `cardAmount`, `partialPayment` (from reportTransform.js fix).

### File 2: `src/components/reports/OrderDetailSheet.jsx`
**L683-691:** "Mode of Payment" row — calls `formatPaymentDisplay()` which returns `'PARTIAL'` text.
**L618-621:** StatChip also uses `formatPaymentDisplay()`.

**Available on `displayData`:** `cashAmount`, `upiAmount`, `cardAmount`, `paymentMethod` (order row is passed directly via DATA MODE L498-502).

---

## Edits

### Edit 1 — OrderTable.jsx: Stacked badges for partial in paymentMethod case
**File:** `OrderTable.jsx`
**L546-571:** Replace the `case 'paymentMethod'` block. When `pmLower === 'partial'` AND order has leg amounts, show stacked badges matching Order Ledger style.

**BEFORE (L550-570):**
```jsx
const pmLower = (order.paymentMethod || '').toLowerCase();
if (pmLower === 'cash_on_delivery') { return ... }
if (tabId === 'all') {
  if (['cash', 'card', 'upi'].includes(pmLower)) { return <span>...</span> }
  return ...
}
return <span>{order.paymentMethod || '—'}</span>
```

**AFTER:**
```jsx
const pmLower = (order.paymentMethod || '').toLowerCase();
if (pmLower === 'cash_on_delivery') { return ... }

// BUG-272: Stacked badges for partial payment
if (pmLower === 'partial') {
  const legs = [];
  if (order.cashAmount > 0) legs.push({ mode: 'Cash', amt: order.cashAmount, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  if (order.cardAmount > 0) legs.push({ mode: 'Card', amt: order.cardAmount, cls: 'bg-blue-50 text-blue-700 border-blue-200' });
  if (order.upiAmount > 0) legs.push({ mode: 'UPI', amt: order.upiAmount, cls: 'bg-violet-50 text-violet-700 border-violet-200' });
  if (legs.length) {
    return <span className="flex flex-wrap gap-0.5">{legs.map((l, i) =>
      <span key={i} className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${l.cls}`}>{l.mode} ₹{l.amt.toLocaleString()}</span>
    )}</span>;
  }
  return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border bg-zinc-100 text-zinc-800 border-zinc-200">Partial</span>;
}

// tabId === 'all' filter (unchanged)
if (tabId === 'all') { ... }
return <span>...</span>
```

### Edit 2 — OrderDetailSheet.jsx: Partial leg breakdown below "Mode of Payment"
**File:** `OrderDetailSheet.jsx`
**After L691** (closing `</div>` of "Mode of Payment" row), add partial legs display:

```jsx
{/* BUG-272: Partial payment legs */}
{!displayData.isCancelled && displayData.paymentMethod?.toLowerCase() === 'partial' && (displayData.cashAmount > 0 || displayData.cardAmount > 0 || displayData.upiAmount > 0) && (
  <div className="flex items-center justify-end gap-1.5 -mt-1 mb-1">
    {displayData.cashAmount > 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">Cash ₹{displayData.cashAmount.toLocaleString()}</span>}
    {displayData.cardAmount > 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">Card ₹{displayData.cardAmount.toLocaleString()}</span>}
    {displayData.upiAmount > 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200">UPI ₹{displayData.upiAmount.toLocaleString()}</span>}
  </div>
)}
```

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Daily Report: partial order #002390 shows stacked badges [Cash ₹1,000][UPI ₹363] | Playwright | badges visible |
| V2 | Daily Report: cash order shows single green badge | Playwright | unchanged |
| V3 | Daily Report: `tabId=all` shows partial badges (not "—") | Playwright | badges visible on All tab |
| V4 | Order Detail Panel: click partial order → "Mode of Payment: PARTIAL" + leg badges below | Playwright | badges below PARTIAL text |
| V5 | Order Detail Panel: click cash order → "Mode of Payment: CASH" only, no extra badges | Playwright | no partial badges |
| V6 | Compile: webpack | log | compiled successfully |

## Rollback
Revert the 2 edits. Partial shows single "partial" badge / text again.
