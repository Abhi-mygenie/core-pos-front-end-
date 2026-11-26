# BUG-540 — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** BUG-540 — P&L Report: Expenses column wrong value + KPI card wrong label/value
**Risk:** LOW
**Sprint:** oct_cr_batch
**Gate 3 status:** COMPLETE — awaiting Gate 4 GO

---

## Step 0 — Entry Verification (PASS)

All target lines verified at HEAD immediately before this plan was written:

| Plan says | Actual at HEAD | Match? |
|-----------|---------------|--------|
| L90: `totalExpenses: numStr(s.total_expenses),` | ✅ identical | PASS |
| L115: `expenses:    numStr(r.total_expenses),` | ✅ identical | PASS |
| L224: `<KpiCard label="Total Expenses" value={summary.totalExpenses} …/>` | ✅ identical | PASS |

No drift. Plan is valid at HEAD.

---

## Owner Decisions Locked

| OD | Decision |
|----|---------|
| OD-540-01 | **B — leave as-is.** `chartData` L102 `expenses: numStr(r.total_expenses)` remains unchanged. Bar chart "Expenses" bar continues to show the combined value. |

---

## Scope Lock

**Files WILL change:**
- `src/pages/reports-module/PLReportPage.jsx` — 3 edit sites

**Files WILL NOT touch:**
- L102 (`chartData` bar chart) — OD-540-01 = B
- L303 (tfoot Expenses total) — already correct (`summary.totalExpenses`)
- L140 (pieData) — already correct (pure expenses + purchase split)
- `src/api/services/reportService.js`
- `src/api/transforms/orderTransform.js`
- `src/App.js`
- Any other file

---

## Exact Edits

### Edit 1 — `summary` useMemo: add `totalExpensesCombined` field
**File:** `src/pages/reports-module/PLReportPage.jsx`
**Line:** 90 (add new line after it)

**Current (L89–91):**
```javascript
      totalExpenses: numStr(s.total_expenses),
      totalPurchase: numStr(s.total_purchase),
```

**New:**
```javascript
      totalExpenses:         numStr(s.total_expenses),
      totalExpensesCombined: numStr(s.total_expenses_combined), // BUG-540
      totalPurchase:         numStr(s.total_purchase),
```

**Why:** KPI card (Edit 3) needs `summary.totalExpensesCombined`. Without this, it would be `undefined`.

---

### Edit 2 — `tableRows` useMemo: fix expenses field
**File:** `src/pages/reports-module/PLReportPage.jsx`
**Line:** 115

**Current:**
```javascript
      expenses:    numStr(r.total_expenses),
```

**New:**
```javascript
      expenses:    numStr(r.expenses), // BUG-540
```

**Why:** `r.total_expenses` = combined (expenses + purchase = ₹200). `r.expenses` = pure expenses only (₹100). Table "EXPENSES" column must show pure expenses.

---

### Edit 3 — KPI strip: fix label + value
**File:** `src/pages/reports-module/PLReportPage.jsx`
**Line:** 224

**Current:**
```jsx
<KpiCard label="Total Expenses" value={summary.totalExpenses} icon={Receipt} color="#EF4444" />
```

**New:**
```jsx
<KpiCard label="Total Expenses and Purchases" value={summary.totalExpensesCombined} icon={Receipt} color="#EF4444" /> {/* BUG-540 */}
```

**Why:** KPI card must show the combined total (₹200) as "Total Expenses and Purchases", not the pure expenses (₹100) labelled "Total Expenses".

---

## Execution Sequence

1. Apply Edit 1 (add `totalExpensesCombined` to summary — must come BEFORE Edit 3 or JSX would reference undefined)
2. Apply Edit 2 (fix tableRows `r.total_expenses` → `r.expenses`)
3. Apply Edit 3 (fix KPI card label + value)
4. Verify compile: `yarn build` exit 0
5. Run EXIT GATE checklist

All three edits are in the same file — apply as one `search_replace` batch.

---

## Verification Matrix

| # | Edit | What to verify | How | Automated? |
|---|------|---------------|-----|:---:|
| V1 | E1 + E3 | KPI card label reads "Total Expenses and Purchases" | Screenshot P&L KPI strip | NO |
| V2 | E1 + E3 | KPI card value ≥ Expenses column values (combined ≥ pure) | Screenshot + compare | NO |
| V3 | E2 | Table "EXPENSES" column shows pure expenses < combined (i.e. < Purchase column + Expenses column together) | Screenshot table — Expenses ≠ total_expenses | NO |
| V4 | preserve | tfoot Expenses = sum of Expenses column (pure, not combined) | Manually verify footer total matches column sum | NO |
| V5 | preserve | Bar chart "Expenses" bar unchanged — still shows combined value (OD-540-01=B) | Screenshot bar chart | NO |
| V6 | compile | `yarn build` exit 0, 0 new warnings introduced by this change | `yarn build` | YES |

---

## Risk Register

| # | Risk | Likelihood | Mitigation |
|---|------|-----------|------------|
| R1 | `s.total_expenses_combined` absent in API response → `numStr(undefined)` | LOW — field confirmed in owner-provided API evidence | `numStr()` coerces `undefined ?? 0` → `0`; KPI shows ₹0.00, non-blocking |
| R2 | BUG-539 file overlap | LOW | BUG-539 edits L175 + L264; zero overlap with L90/L115/L224; parallel-safe |
| R3 | Regression on tfoot (L303 reads `summary.totalExpenses`) | NONE | Edit 1 adds a NEW key; does not modify `totalExpenses` value — L303 reads same field unchanged |
| R4 | Regression on pieData (L140 reads `summary.totalExpenses`) | NONE | Same as R3 — `totalExpenses` value is untouched |

---

## Post-Code Registry Checklist

Implementation agent MUST run before writing any handover:

```
□ 1. registry.json: BUG-540 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
□ 2. BUG_TRACKER.md: BUG-540 row → GATE_5A_IMPLEMENTED + files changed
□ 3. FILE_OWNERSHIP.md: PLReportPage.jsx row added — BUG-540, date, 3 edit sites
□ 4. Code markers: // BUG-540 comment present in every modified line/block (Edits 1–3)
□ 5. Compile: yarn build exit 0, 0 new warnings
```

---

## Summary

| Attribute | Value |
|-----------|-------|
| File | `PLReportPage.jsx` |
| Edits | 3 (1 line added, 1 line changed, 1 line changed) |
| R5 hotspot | NO |
| R6 financial | Partial (report display — owner approval at Gate 4 required) |
| Planning-skip | NOT eligible |
| Blocked on ODs | NONE (OD-540-01 = B locked) |
| Ready for Gate 4 GO | YES |
