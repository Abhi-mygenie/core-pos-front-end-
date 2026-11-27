# BUG-645 Implementation Plan — Payment Filter Wrong Amount for Split Payments

**Date:** 2026-11-08
**Agent:** PLANNING (Gate 3)
**Risk:** HIGH (financial display R6, AllOrdersReportPage is R5 hotspot)
**Impact Analysis:** `memory/impact/BUG-645_IMPACT_ANALYSIS.md`
**Code Reality:** PARTIAL
**Line anchors verified at HEAD:** 2026-11-08 — all match IA exactly, zero drift.

---

## Scope Lock

**Files WILL change:**

| # | File | Batches | Est. Lines |
|---|------|---------|-----------|
| 1 | `src/pages/reports-module/OrderReportBetaPage.jsx` | A + B | ~35 |
| 2 | `src/pages/AllOrdersReportPage.jsx` | C | ~20 |
| 3 | `src/components/reports/OrderTable.jsx` | C | ~10 |

**Files WILL NOT change:** `reportTransform.js`, `FilterBar.jsx`, `FilterTags.jsx`, backend, Excel export.

---

## Execution Sequence

Batch A → Batch B → Batch C (sequential within `OrderReportBetaPage.jsx`, then `AllOrdersReportPage.jsx` + `OrderTable.jsx`).

---

## Edit Specifications

### E-1: Add `getDisplayAmount` helper (OrderReportBetaPage.jsx)

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Location:** Insert AFTER L79 (end of `fmtDate` function), BEFORE L80 (blank line before `// CR-117: Tab filters`)
**Action:** INSERT new helper function

```jsx
// BUG-645: Get display amount — for partial orders under a payment filter, show only the matching leg
const getDisplayAmount = (row, paymentFilter) => {
  const raw = parseFloat(String(row.order_amount_raw).replace(/,/g, '')) || 0;
  if (!paymentFilter) return { amount: raw, isLeg: false };
  const fm = paymentFilter.toLowerCase();
  if (fm === 'partial' || row.payment_method_raw !== 'partial') return { amount: raw, isLeg: false };
  const legAmount = parseFloat(row.payment?.[fm] || 0);
  if (legAmount > 0) return { amount: legAmount, isLeg: true, fullAmount: raw };
  return { amount: raw, isLeg: false };
};
```

**Why:** Centralizes leg-amount logic for B-2, B-3, B-4. Keeps it pure (no side effects, no state).

**Verification:** Function exists after fmtDate. `yarn build` compiles.

---

### E-2: Fix `extractFilterOptions` dropdown — Batch A (OrderReportBetaPage.jsx)

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Location:** L187-196, inside `extractFilterOptions`
**Action:** REPLACE L191

**Current (L191):**
```js
    payments:    unique('payment_method_raw'),
```

**New:**
```js
    payments:    (() => { // BUG-645 Batch A: include split leg payment methods
      const methods = new Set(all.map(r => r.payment_method_raw).filter(Boolean));
      all.forEach(r => {
        if (r.payment_method_raw === 'partial' && r.payment) {
          Object.entries(r.payment).forEach(([key, val]) => {
            if (parseFloat(val) > 0 && key !== 'partial' && key !== 'partialpayment') methods.add(key);
          });
        }
      });
      return [...methods].sort();
    })(),
```

**Why:** When `payment_method_raw === "partial"`, inspects `row.payment` breakdown object and adds keys like "upi", "card", "cash" where value > 0. Excludes "partial" and "partialpayment" keys from the breakdown (these are zero for split orders and would duplicate the top-level "partial" entry).

**Verification (V-1, V-2):** Load Beta page with date range containing a split payment. Payment dropdown should now list "upi" and/or "card" alongside "cash", "partial", "pending".

---

### E-3: Fix `applyFilters` — Batch B filter logic (OrderReportBetaPage.jsx)

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Location:** L168
**Action:** REPLACE single line

**Current (L168):**
```js
  if (filters.payment) result = result.filter(r => r.payment_method_raw === filters.payment);
```

**New:**
```js
  // BUG-645 Batch B: split-payment-aware filtering (mirrors BUG-272 logic in AllOrdersReportPage)
  if (filters.payment) {
    const fm = filters.payment.toLowerCase();
    result = result.filter(r => {
      const pm = (r.payment_method_raw || '').toLowerCase();
      if (fm === 'partial') return pm === 'partial';
      if (pm === fm) return true;
      if (pm === 'partial' && r.payment) {
        return parseFloat(r.payment[fm] || 0) > 0;
      }
      return false;
    });
  }
```

**Why:** Mirrors the BUG-272 pattern from `AllOrdersReportPage.jsx:418-430`. When filter is "upi" and row is "partial" with `payment.upi > 0`, row is kept.

**Verification (V-3):** Select "upi" filter → split order with UPI leg appears in results.

---

### E-4: Fix grand total — Batch B totals (OrderReportBetaPage.jsx)

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Location:** L464
**Action:** REPLACE single line

**Current (L464):**
```js
  const totalFilteredAmount = filteredDays.reduce((s, d) => s + d.filteredReport.reduce((ss, r) => ss + (parseFloat(String(r.order_amount_raw).replace(/,/g, '')) || 0), 0), 0);
```

**New:**
```js
  const totalFilteredAmount = filteredDays.reduce((s, d) => s + d.filteredReport.reduce((ss, r) => ss + getDisplayAmount(r, filters.payment).amount, 0), 0); // BUG-645
```

**Verification (V-7):** Apply "upi" filter → grand total sums only UPI leg amounts for split orders.

---

### E-5: Fix day total — Batch B day header (OrderReportBetaPage.jsx)

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Location:** L589
**Action:** REPLACE single line

**Current (L589):**
```js
            const dayAmount = dayOrders.reduce((s, r) => s + (parseFloat(String(r.order_amount_raw).replace(/,/g, '')) || 0), 0);
```

**New:**
```js
            const dayAmount = dayOrders.reduce((s, r) => s + getDisplayAmount(r, filters.payment).amount, 0); // BUG-645
```

**Verification (V-6):** Day header total uses leg amounts only for split orders when filtered.

---

### E-6: Fix row amount display — Batch B row cell (OrderReportBetaPage.jsx)

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Location:** L662
**Action:** REPLACE single line

**Current (L662):**
```jsx
                              <td className="px-3 py-2 text-right font-medium text-zinc-800">{fmtINR(row.order_amount_raw)}</td>
```

**New:**
```jsx
                              <td className="px-3 py-2 text-right font-medium text-zinc-800">{/* BUG-645 */}
                                {(() => { const da = getDisplayAmount(row, filters.payment); return <>{fmtINR(da.amount)}{da.isLeg && <span className="text-[10px] text-zinc-400 ml-1">(of {fmtINR(da.fullAmount)})</span>}</>; })()}
                              </td>
```

**Why:** When payment filter active and row is partial-matched, shows leg amount with "(of ₹{full})" note per OD-645-01.

**Verification (V-4, V-5, V-8):** Filtered partial row shows leg amount + note. Non-partial rows unchanged.

---

### E-7: Add `_displayAmount` to filtered results — Batch C (AllOrdersReportPage.jsx)

**File:** `src/pages/AllOrdersReportPage.jsx`
**Location:** After L430 (end of BUG-272 payment filter block), BEFORE L432 (`// Apply status filter`)
**Action:** INSERT new block

```jsx
      // BUG-645 Batch C: set _displayAmount for partial rows under payment filter
      if (fm !== 'partial') {
        result = result.map(o => {
          const pm = (o.paymentMethod || '').toLowerCase();
          if (pm === 'partial') {
            const legAmt = fm === 'cash' ? o.cashAmount
                         : fm === 'card' ? o.cardAmount
                         : fm === 'upi'  ? o.upiAmount
                         : o.amount;
            return { ...o, _displayAmount: legAmt, _isPartialLeg: true, _fullAmount: o.amount };
          }
          return { ...o, _displayAmount: o.amount };
        });
      }
```

**Why:** Annotates each filtered row with `_displayAmount` — partial orders get leg amount, others keep full amount. Only runs when a specific method (not "partial") is selected. The spread `{ ...o, ... }` avoids mutating the original order objects.

**Verification (V-9, V-10, V-12):** Cash filter → partial order row has `_displayAmount = cashAmount`. No filter → no `_displayAmount` override (OrderTable falls back to `order.amount`).

---

### E-8: Fix summary to use `_displayAmount` — Batch C (AllOrdersReportPage.jsx)

**File:** `src/pages/AllOrdersReportPage.jsx`
**Location:** L486
**Action:** REPLACE single line

**Current (L486):**
```js
    const summaryData = calculateSummary(result);
```

**New:**
```js
    // BUG-645 Batch C: use _displayAmount for summary when payment filter is active
    const summaryData = filters.paymentMethod && filters.paymentMethod.toLowerCase() !== 'partial'
      ? (() => {
          const totalOrders = result.length;
          const totalAmount = result.reduce((sum, o) => sum + (o._displayAmount ?? o.amount ?? 0), 0);
          const avgOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;
          return { totalOrders, totalAmount, avgOrderValue };
        })()
      : calculateSummary(result);
```

**Why:** When a specific payment method filter is active (not "partial"), sums `_displayAmount` (which is the leg amount for partial orders). When no payment filter or "partial" filter → uses original `calculateSummary` unchanged.

**Verification (V-11):** Cash filter → summary totalAmount sums cash leg amounts for split orders, full amount for pure cash orders.

---

### E-9: OrderTable amount cell reads `_displayAmount` — Batch C (OrderTable.jsx)

**File:** `src/components/reports/OrderTable.jsx`
**Location:** L603-608 (the `case 'amount'` block)
**Action:** REPLACE block

**Current (L603-608):**
```jsx
    case 'amount':
      return (
        <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums truncate block"> {/* CR-485: truncate prevents overlap */}
          {formatCurrency(order.amount)}
        </span>
      );
```

**New:**
```jsx
    case 'amount':
      return (
        <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums truncate block"> {/* CR-485: truncate prevents overlap */}
          {formatCurrency(order._displayAmount ?? order.amount)}
          {order._isPartialLeg && ( // BUG-645: show "(of ₹X)" for filtered partial rows
            <span className="text-[10px] text-zinc-400 ml-1 font-normal">(of {formatCurrency(order._fullAmount)})</span>
          )}
        </span>
      );
```

**Why:** Reads `_displayAmount` when present (set by E-7), falls back to `order.amount` for all other views. The "(of ₹X)" note only appears when `_isPartialLeg` is true.

**Verification (V-9, V-10, V-12):** Filtered partial order shows leg amount + note. Unfiltered views show full amount as before.

---

### E-10: OrderTable audit-row amount reads `_displayAmount` — Batch C (OrderTable.jsx)

**File:** `src/components/reports/OrderTable.jsx`
**Location:** L459
**Action:** REPLACE single line

**Current (L459):**
```jsx
      if (columnId === 'amount') return <span className="font-mono text-sm font-medium text-yellow-700 tabular-nums">{rd.amount ? `₹${parseFloat(rd.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</span>;
```

**New:**
```jsx
      if (columnId === 'amount') return <span className="font-mono text-sm font-medium text-yellow-700 tabular-nums">{(rd._displayAmount ?? rd.amount) ? `₹${parseFloat(rd._displayAmount ?? rd.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}{rd._isPartialLeg && <span className="text-[10px] text-zinc-400 ml-1 font-normal">(of ₹{parseFloat(rd._fullAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })})</span>}</span>;
```

**Why:** Same `_displayAmount` fallback for the audit-variant row rendering path.

**Verification:** Audit tab rows with partial leg filter also show correct leg amount.

---

## Post-Code Registry Checklist

The Implementation agent MUST execute after coding:

- [ ] `registry.json`: BUG-645 → status: `GATE_5A_IMPLEMENTED`, sprint_key: `nov_cr_batch`
- [ ] `BUG_TRACKER.md`: row updated to `GATE_5A_IMPLEMENTED`
- [ ] `FILE_OWNERSHIP.md`: add `OrderReportBetaPage.jsx`, `AllOrdersReportPage.jsx`, `OrderTable.jsx` with `BUG-645` date
- [ ] Code markers: `// BUG-645` comment in every modified file (minimum 1 per file)

---

## Verification Matrix (seeds QA handover)

| # | Edit | Batch | Verification | How to Verify | Automated? |
|---|------|-------|-------------|---------------|:---:|
| V-1 | E-2 | A | UPI appears in Beta payment dropdown | Browser: load Beta with split-payment data | NO |
| V-2 | E-2 | A | Card appears in Beta payment dropdown | Browser: load Beta with split-payment data | NO |
| V-3 | E-3 | B | "upi" filter shows split orders with UPI leg | Browser: select UPI filter | NO |
| V-4 | E-6 | B | Filtered partial row shows leg amount | Browser: check Amount column | NO |
| V-5 | E-6 | B | Filtered partial row shows "(of ₹X)" note | Browser: visual check | NO |
| V-6 | E-5 | B | Day total sums leg amounts only | Browser: day header Total | NO |
| V-7 | E-4 | B | Grand total sums leg amounts only | Browser: header KPI | NO |
| V-8 | E-6 | B | Non-partial rows show full amount (regression) | Browser: Cash filter → pure cash order | NO |
| V-9 | E-7+E-9 | C | Audit Cash filter: partial shows cash leg | Browser: Payment Method = Cash | NO |
| V-10 | E-9 | C | Audit partial row shows "(of ₹X)" note | Browser: visual check | NO |
| V-11 | E-8 | C | Audit summary sums leg amounts | Browser: Summary stats | NO |
| V-12 | E-7+E-9 | C | Audit no filter: full amounts (regression) | Browser: clear filters | NO |
| V-13 | E-3 | ALL | "Partial" filter still works on both pages | Browser: select Partial filter | NO |
| V-14 | ALL | ALL | `yarn build` compiles 0 new warnings | `yarn build` exit 0 | YES |

---

## Implementation Plan Final Response

```
Planning complete: BUG-645 (Batch A/B/C)
Stage: Implementation Plan (Gate 3)
Code reality: PARTIAL
Risk: HIGH (financial display R6, 1 hotspot)
Files WILL change: OrderReportBetaPage.jsx (E-1..E-6), AllOrdersReportPage.jsx (E-7..E-8), OrderTable.jsx (E-9..E-10)
Files WILL NOT touch: reportTransform.js, FilterBar.jsx, FilterTags.jsx, backend, Excel
Owner decisions: ALL CLOSED
Docs: memory/plans/BUG-645_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → IMPLEMENTATION
```
