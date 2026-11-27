# BUG-645 Impact Analysis — Payment Filter Wrong Amount for Split (Partial) Payments

**Date:** 2026-11-08
**Agent:** PLANNING (Gate 2)
**Risk:** HIGH (financial display, R6; 1 hotspot file AllOrdersReportPage.jsx)
**Code Reality:** PARTIAL — Audit page has BUG-272 partial-leg filter logic but uses full amount; Beta page has no leg handling at all.
**Conflict Pre-Check:** No active items touching same lines. BUG-626 (2026-11-07) touched L59-61 in OrderReportBetaPage — different section (getStatusBadge), no conflict. CR-505 (GATE_1_INTAKE) is RELATED but touches different scope (split display + totals widget). CR-483 (received_amount columns) added L663 — parallel, no overlap with amount logic.

---

## Batch Structure

| Batch | Page | Summary |
|-------|------|---------|
| **A** | Order Report Beta | UPI/Card missing from payment filter dropdown |
| **B** | Order Report Beta | No split-aware filtering + amount/totals use full order amount |
| **C** | Audit (Daily) Report | Amount/totals use full order amount for partial orders under payment filter |

---

## Batch A: Beta Dropdown Missing UPI/Card

### Data Flow Trace

```
API: POST /api/v1/vendoremployee/daily-order-report-details-combined
  → Each order has:
    - payment_method_raw: "cash" | "pending" | "partial" (NEVER "upi"/"card" standalone for split orders)
    - payment: { cash: "100.00", upi: "175.00", card: "0.00", ... }  ← breakdown EXISTS

→ OrderReportBetaPage.jsx L180-197 extractFilterOptions():
    L181: const all = dailyReports.flatMap(d => d.report || []);
    L182: const unique = (key) => [...new Set(all.map(r => r[key]).filter(Boolean))].sort();
    L191: payments: unique('payment_method_raw')
    
    Result: ["cash", "partial", "pending"]
    ❌ BREAK: "upi" and "card" never appear because split orders use "partial" as payment_method_raw
```

### Affected Code

| Site | File:Line | Current Code | Problem |
|------|-----------|-------------|---------|
| A-1 | `OrderReportBetaPage.jsx:191` | `payments: unique('payment_method_raw')` | Only extracts top-level payment method; misses split legs |

### Fix Scope

Modify `extractFilterOptions()` to also inspect `row.payment` breakdown object for each row. When `payment_method_raw === "partial"`, extract all keys from `payment` where `parseFloat(value) > 0` and add to the payments set.

**Downstream impact:** None — `extractFilterOptions` is local to this file and only feeds the filter dropdown.

---

## Batch B: Beta No Split-Aware Filtering + Wrong Amount

### Data Flow Trace

```
→ OrderReportBetaPage.jsx L160-177 applyFilters():
    L168: if (filters.payment) result = result.filter(r => r.payment_method_raw === filters.payment);
    
    When user selects "upi" filter:
    - Order #001424: payment_method_raw = "partial", payment.upi = "175.00"
    - L168: "partial" === "upi" → FALSE → ❌ ROW DROPPED
    
    Result: Split orders with UPI leg NEVER appear when filtering by "upi"

→ Row amount display (L662):
    {fmtINR(row.order_amount_raw)}    → always shows FULL order amount (₹275)
    
→ Day total (L589):
    dayAmount = dayOrders.reduce(... + parseFloat(row.order_amount_raw) ...)
    → sums FULL amount

→ Grand total (L464):
    totalFilteredAmount = filteredDays.reduce(... + parseFloat(r.order_amount_raw) ...)
    → sums FULL amount
```

### Affected Code

| Site | File:Line | Current Code | Problem |
|------|-----------|-------------|---------|
| B-1 | `OrderReportBetaPage.jsx:168` | `r.payment_method_raw === filters.payment` | Exact match drops partial rows entirely |
| B-2 | `OrderReportBetaPage.jsx:662` | `fmtINR(row.order_amount_raw)` | Shows full order amount when row is a partial match |
| B-3 | `OrderReportBetaPage.jsx:589` | `dayOrders.reduce(... parseFloat(row.order_amount_raw) ...)` | Day total sums full amount |
| B-4 | `OrderReportBetaPage.jsx:464` | `filteredDays.reduce(... parseFloat(r.order_amount_raw) ...)` | Grand total sums full amount |

### Fix Scope

1. **B-1 (filter):** Add BUG-272-style logic — when filter is "cash"/"upi"/"card" and `payment_method_raw` is "partial", check `parseFloat(row.payment?.[filterValue]) > 0`.

2. **B-2 (row amount):** When a payment filter is active AND row is partial-matched, display `fmtINR(row.payment?.[filter])` instead of `fmtINR(row.order_amount_raw)`. Add a small note "(of ₹{full})" per OD-645-01.

3. **B-3 + B-4 (totals):** When a payment filter is active, sum the matching leg amount for partial rows, not the full order_amount_raw.

### Implementation Strategy

Create a helper function `getDisplayAmount(row, paymentFilter)`:
- If no payment filter active → return `parseFloat(row.order_amount_raw)`
- If payment filter active AND `row.payment_method_raw === "partial"` → return `parseFloat(row.payment?.[paymentFilter] || 0)`
- Otherwise → return `parseFloat(row.order_amount_raw)`

Use this helper in B-2, B-3, B-4. This centralizes the leg-amount logic.

**Downstream impact:** Only affects `OrderReportBetaPage.jsx` display. No API, transform, or export changes.

---

## Batch C: Audit Report Shows Full Amount for Partial Orders

### Data Flow Trace

```
API: POST /api/v2/vendoremployee/report/order-logs-report
  → Each order wrapper has: partial_payments[] array

→ reportTransform.js L851-857 orderLogsReportRow():
    partialPayments = orderWrapper.partial_payments || []
    partialMap.cash = sum of cash legs
    partialMap.upi = sum of upi legs

→ reportTransform.js L1109-1111:
    cashAmount: partialMap.cash || (pm === 'cash' ? toNum(api.order_amount) : 0)
    cardAmount: partialMap.card || ...
    upiAmount: partialMap.upi || ...
    
    ✅ These fields EXIST on every row — split leg amounts already parsed

→ reportTransform.js L1030:
    amount: toNum(api.order_amount)    ← ALWAYS full order amount
    
→ AllOrdersReportPage.jsx L418-430 (BUG-272 filter):
    Cash filter: pm === 'cash' OR (pm === 'partial' && cashAmount > 0) → ✅ CORRECT inclusion

→ AllOrdersReportPage.jsx L486:
    calculateSummary(result) → sums o.amount → ❌ FULL order amount for partial rows

→ OrderTable.jsx L606:
    {formatCurrency(order.amount)} → ❌ FULL order amount displayed

→ Summary display:
    summary.totalAmount → ❌ includes full ₹275 for Cash+UPI split order when filtering Cash
```

### Affected Code

| Site | File:Line | Current Code | Problem |
|------|-----------|-------------|---------|
| C-1 | `AllOrdersReportPage.jsx:486` | `calculateSummary(result)` | Sums `o.amount` (full) not leg amount |
| C-2 | `OrderTable.jsx:606` | `formatCurrency(order.amount)` | Displays full order amount |
| C-3 | `OrderTable.jsx:459` | `rd.amount` (audit variant) | Audit-specific row also uses full amount |

### Fix Scope

**Strategy:** After filtering in `AllOrdersReportPage.jsx`, compute a `displayAmount` on each filtered row when a payment filter is active:

```
if (filters.paymentMethod && o.paymentMethod?.toLowerCase() === 'partial') {
  const fm = filters.paymentMethod.toLowerCase();
  o._displayAmount = fm === 'cash' ? o.cashAmount
                   : fm === 'card' ? o.cardAmount
                   : fm === 'upi'  ? o.upiAmount
                   : o.amount;
  o._isPartialLeg = true;
  o._fullAmount = o.amount;
} else {
  o._displayAmount = o.amount;
}
```

Then:
- **C-1:** Replace `calculateSummary(result)` with a custom sum using `o._displayAmount || o.amount`
- **C-2 + C-3:** `OrderTable` reads `order._displayAmount || order.amount` for the Amount column, and conditionally shows "(of ₹{full})" note when `order._isPartialLeg`

**Alternative (cleaner):** Add a `displayAmount` override in the filter pass itself (inside `AllOrdersReportPage.jsx L418-430`), setting it on the result array before passing to OrderTable. This avoids modifying OrderTable's core rendering for all consumers.

### Files that WILL change

| File | Change | Batch |
|------|--------|-------|
| `src/pages/reports-module/OrderReportBetaPage.jsx` | `extractFilterOptions` + `applyFilters` + amount display + totals | A + B |
| `src/pages/AllOrdersReportPage.jsx` | Filter pass adds `_displayAmount` for partial rows + custom summary | C |
| `src/components/reports/OrderTable.jsx` | Amount column reads `_displayAmount` fallback + "(of ₹X)" note | C |

### Files that WILL NOT change

| File | Reason |
|------|--------|
| `src/api/transforms/reportTransform.js` | `amount`, `cashAmount`, `upiAmount`, `cardAmount` already computed correctly; no transform-level change needed |
| `src/components/reports/FilterBar.jsx` | Hardcoded `PAYMENT_METHOD_OPTIONS` [Cash, Card, UPI, Partial] already includes all needed options |
| `src/components/reports/FilterTags.jsx` | No change — reads from FilterBar options |
| Backend / Excel export | No change (OD-645-02) |

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | Batch C touches `AllOrdersReportPage.jsx` (R5 hotspot) | MEDIUM | Changes are isolated to the filter effect + display override. No new state, no API change. |
| R-2 | `OrderTable.jsx` amount column change could affect non-filtered views | LOW | `_displayAmount` is only set when a payment filter is active. Fallback `order.amount` preserves all other views. |
| R-3 | Batch B totals might double-count if filter logic has edge case | MEDIUM | Use same `getDisplayAmount` helper for both row display and totals to ensure consistency. |
| R-4 | CR-505 (Partial Payment Split + Totals) overlap | LOW | CR-505 adds payment-wise total widgets (header KPIs). BUG-645 changes per-row amounts. Different scope. CR-505 can reference `_displayAmount` when implemented later. |
| R-5 | CR-483 (received_amount) — reconcile column may show full amount vs filtered leg | LOW | Recon column shows `received_amount` (actual bank settlement) which is always the full received. No need to filter this — it's the actual amount received, not a per-method split. |

---

## Owner Decisions (ALL previously CLOSED)

| OD | Decision | Applied to |
|---|---|---|
| OD-645-01 | Filtered row shows only matching leg amount with "(of ₹{full})" note; totals sum leg amounts only. Applies to BOTH pages. | All batches |
| OD-645-02 | Excel export (backend-generated) — NO change | — |
| OD-645-03 | Beta/Daily mismatch for #000249 — DO NOT investigate | — |
| Issue C Option C | Show only matching leg amounts (not full order amount) when payment filter active on Audit page | Batch C |

---

## Verification Matrix (seeds QA handover)

| # | Batch | Verification | How to Verify | Automated? |
|---|-------|-------------|---------------|:---:|
| V-1 | A | UPI appears in Beta payment dropdown when split orders with UPI leg exist | Browser: load Beta → check Payment dropdown | NO |
| V-2 | A | Card appears in Beta payment dropdown when split orders with Card leg exist | Browser: check Payment dropdown | NO |
| V-3 | B | Selecting "upi" filter shows split orders with UPI leg | Browser: select UPI → verify partial order appears | NO |
| V-4 | B | Filtered partial row shows leg amount (e.g. ₹175) not full (₹275) | Browser: check Amount column | NO |
| V-5 | B | Filtered partial row shows "(of ₹275)" note | Browser: visual check | NO |
| V-6 | B | Day total sums leg amounts only for partial rows | Browser: check day header Total | NO |
| V-7 | B | Grand total sums leg amounts only for partial rows | Browser: check header KPI | NO |
| V-8 | B | Non-partial rows still show full amount (no regression) | Browser: Cash filter → pure cash order shows full amount | NO |
| V-9 | C | Audit page Cash filter: partial order shows cash leg amount only | Browser: Payment Method = Cash → check Amount column | NO |
| V-10 | C | Audit page Cash filter: partial order shows "(of ₹{full})" note | Browser: visual check | NO |
| V-11 | C | Audit page summary totalAmount sums leg amounts for partial rows | Browser: check Summary stats | NO |
| V-12 | C | Audit page no filter: all rows show full amount (no regression) | Browser: clear filters → check Amount column | NO |
| V-13 | ALL | "Partial" filter still works (shows partial orders with full amount) | Browser: select Partial filter on both pages | NO |
| V-14 | ALL | `yarn build` compiles with 0 new warnings | `yarn build` exit 0 | YES |

---

## Planning Final Response

```
Impact Analysis complete: BUG-645 (Batch A/B/C)
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (Audit has BUG-272 legs parsed but unused for display; Beta has nothing)
Risk: HIGH (financial display R6, 1 hotspot file)
Files WILL change: OrderReportBetaPage.jsx, AllOrdersReportPage.jsx, OrderTable.jsx (3 files)
Files WILL NOT touch: reportTransform.js, FilterBar.jsx, FilterTags.jsx, backend, Excel export
Owner decisions: ALL CLOSED (OD-645-01/02/03 + Issue C Option C)
Docs: memory/impact/BUG-645_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) — owner approval to proceed
```
