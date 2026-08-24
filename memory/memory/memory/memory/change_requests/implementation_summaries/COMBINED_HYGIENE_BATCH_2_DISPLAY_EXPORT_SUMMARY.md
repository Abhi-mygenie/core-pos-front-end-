# Combined Hygiene — Batch 2 Display / Export / Filter — Implementation Summary

**Agent:** Combined Hygiene Implementation Agent — Batch 2
**Date:** 2026-05-04
**Branch:** `may4`
**Scope:** Frontend display/export/filter parity for A0a siblings + CR-001 exports summary-row alignment. No backend, no payment semantics, no Collect Bill, no KOT/bill totals, no PG Status, no lifecycle derivation change. Batch 3 NOT touched.
**Predecessors:**
- Plan: `/app/memory/change_requests/impact_analysis/COMBINED_HYGIENE_9_ITEMS_IMPLEMENTATION_PLAN.md` §9.2
- Batch 1 closure: `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_1_DOC_CLEANUP_SUMMARY.md`
- Owner approvals: G-2 approved verbally (`ok go`) on 2026-05-04 with all 3 recommended defaults.

## Status
- **DETAIL-A0a-01:** ✅ RESOLVED 2026-05-04
- **FILTER-A0a-01:** ✅ RESOLVED 2026-05-04 (defensive hardening — zero current consumers)
- **CSV-A0a-01:** ✅ RESOLVED 2026-05-04 (CSV column + PDF cell both guarded)
- **CR-001 exports alignment:** ✅ RESOLVED 2026-05-04 (dynamic summary row, works on all 3 tab variants)

---

## 1. Exact changes landed

### 1.1 DETAIL-A0a-01 — `/app/frontend/src/components/reports/OrderDetailSheet.jsx`
**Before (L85):**
```js
'cash_on_delivery': 'CASH',
```
**After (L84-90):**
```js
// DETAIL-A0a-01 (2026-05-04): parity with audit-table A0a display short-circuit
// (OrderTable.jsx:486-510). Raw `cash_on_delivery` continues to flow through
// transforms/payloads/eligibility (PAID_ACTIONS_ALLOWED_METHODS unchanged); only
// the drill-down label surface is masked to `—`, matching the audit cell.
'cash_on_delivery': '—',
```
**Effect:** Drill-down card on OrderDetailSheet now renders `—` (or "Paid via —" via `formatPaymentDisplay`) for `cash_on_delivery` rows, matching the audit table's visible mask. `formatPaymentDisplay` (L98-104) already guards `base !== '—'` so the "→ Unpaid" suffix is correctly suppressed for COD rows.

### 1.2 FILTER-A0a-01 — `/app/frontend/src/api/transforms/reportTransform.js`
**Before (L708-716):**
```js
export const extractPaymentMethods = (orders = []) => {
  const methods = new Set();
  orders.forEach(o => {
    if (o.paymentMethod && o.paymentMethod !== '—') {
      methods.add(o.paymentMethod);
    }
  });
  return Array.from(methods).sort();
};
```
**After (L708-726):**
```js
export const extractPaymentMethods = (orders = []) => {
  const methods = new Set();
  orders.forEach(o => {
    // FILTER-A0a-01 (2026-05-04): defensive parity with audit-table A0a mask.
    // `cash_on_delivery` is excluded from the helper's output so any future
    // dynamic filter dropdown never surfaces a raw enum that the audit cell
    // masks to `—`. Zero runtime consumers today (FilterBar uses a hardcoded
    // PAYMENT_METHOD_OPTIONS list); guard hardens the exported helper against
    // future wiring. Raw enum remains preserved in reportTransform payloads.
    if (
      o.paymentMethod &&
      o.paymentMethod !== '—' &&
      o.paymentMethod.toLowerCase() !== 'cash_on_delivery'
    ) {
      methods.add(o.paymentMethod);
    }
  });
  return Array.from(methods).sort();
};
```
**Effect:** Exported helper now excludes `cash_on_delivery` from its returned Set. **Zero runtime impact today** (helper has no consumer — `FilterBar.jsx:101-105` uses hardcoded `PAYMENT_METHOD_OPTIONS = [cash, card, upi]`). Defensive against a future dynamic filter wiring.

### 1.3 CSV-A0a-01 — `/app/frontend/src/components/reports/ExportButtons.jsx`
**CSV column change (L58-61):**
```js
// Before:
{ key: 'paymentMethod', label: 'Payment Method' },

// After:
{ key: 'paymentMethod', label: 'Payment Method',
  // CSV-A0a-01 (2026-05-04): mask `cash_on_delivery` to `—` for CSV export
  // parity with audit-table A0a display. Raw enum preserved in payload.
  format: (v, _o) => (v && String(v).toLowerCase() === 'cash_on_delivery') ? '—' : (v || '—') },
```
**PDF cell change (L205):**
```js
// Before:
<td>${order.paymentMethod || '—'}</td>

// After:
<td>${(order.paymentMethod && String(order.paymentMethod).toLowerCase() === 'cash_on_delivery') ? '—' : (order.paymentMethod || '—')}</td>
```
**Effect:** Both export surfaces (CSV + printable PDF) now render `—` for `cash_on_delivery` rows. Parity with audit-table A0a mask + DETAIL-A0a-01 drill-down. Raw enum still preserved in `reportTransform` payload and in the A0a backend-aware short-circuit at `OrderTable.jsx:486-510`.

### 1.4 CR-001 exports alignment — `/app/frontend/src/components/reports/ExportButtons.jsx`
**Before (L92-94):**
```js
// Add summary row
const totalAmount = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
const summaryRow = `\n"Total","","","","","","","${formatCurrency(totalAmount)}"`;
```
**After (L92-104):**
```js
// Add summary row — CR-001 exports alignment (2026-05-04): generate the
// summary cells dynamically from `columns.length` so the footer always lines
// up with the header / body row widths, regardless of tab-specific splices
// (cancelled adds 2 cols, aggregator adds 2 cols). Previously hardcoded to
// 8 cells which was off-by-1 on base tabs and off-by-3 on cancelled/aggregator.
const totalAmount = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
const summaryCells = columns.map((col, idx) => {
  if (idx === 0) return '"Total"';
  if (col.key === 'amount') return `"${formatCurrency(totalAmount)}"`;
  return '""';
});
const summaryRow = '\n' + summaryCells.join(',');
```
**Effect:** Summary row cell count now equals `columns.length` on every tab:

| Tab | Columns | Summary cells | Pre-fix | Post-fix |
|---|---|---|---|---|
| base | 9 | 9 | 8 (off by 1) | 9 ✅ |
| cancelled | 11 | 11 | 8 (off by 3) | 11 ✅ |
| aggregator | 11 | 11 | 8 (off by 3) | 11 ✅ |

`paymentType` column retained per owner preference. No data lost; purely geometric correction.

---

## 2. Files changed (3 total)

| File | Lines changed | Nature |
|---|---|---|
| `/app/frontend/src/components/reports/OrderDetailSheet.jsx` | +5 / -1 at L85 | Single `methodMap` entry: `'CASH'` → `'—'` + inline comment |
| `/app/frontend/src/api/transforms/reportTransform.js` | +10 / -1 at L708-726 | `extractPaymentMethods` forEach callback gains COD guard + inline comment |
| `/app/frontend/src/components/reports/ExportButtons.jsx` | 3 localised edits: L58-61 (CSV format fn), L92-104 (dynamic summary row), L205 (PDF cell) | CSV+PDF COD mask + dynamic summary-row generation |

**Net diff:** ~28 lines added (mostly inline explanatory comments), 3 lines removed.
**Zero deletions of accepted CR logic.**

---

## 3. What was NOT touched (explicit negative scope)

### 3.1 Accepted sprint behaviour preserved
- ❌ `/app/frontend/src/components/reports/OrderTable.jsx:486-510` — A0a audit-table display short-circuit UNTOUCHED (still the single accepted source of truth for audit cell mask)
- ❌ `OrderTable.jsx:241` `PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi']` — eligibility predicate UNTOUCHED; reads raw `order.paymentMethod`, not the masked `—` rendering
- ❌ `FilterBar.jsx:101-105` hardcoded `PAYMENT_METHOD_OPTIONS` — UNTOUCHED (FILTER-A0a-01 is a helper-side defensive guard)
- ❌ `FilterTags.jsx` chip rendering — UNTOUCHED
- ❌ `reportTransform.fromAPI` at L179/214/266/301/338/405/544 — raw `payment_method` field preserved on every row
- ❌ `reportService.js:927` `pgAmount` derivation — UNTOUCHED (DOC-B2-01 scope only)
- ❌ CR-001 export column set (`orderId`, `createdAt`, `customer`, `tableNo`, `punchedBy`, `actionedBy`, `paymentMethod`, `paymentType`, `amount`) — UNCHANGED, including tab-specific splices for `cancellationReason` + `cancellationType` (L64-67) and `aggregatorPlatform` + `riderName` (L70-71)
- ❌ CR-001 `displayOrderId`, `displayLocationLabel`, `actionedBy` derivations — UNTOUCHED
- ❌ CR-003 row-action eligibility + payment-method mutation flows — UNTOUCHED
- ❌ CR-004 Phase 1 + Phase 2 A/B/C — UNTOUCHED
- ❌ CR-005 #1 / B2-split Phase 1 PG columns + scroll architecture — UNTOUCHED; B2 Phase 2 dormant placeholder preserved
- ❌ CR-006 A1 + B1 + FO-B1-01 multi-select cart-line helper — UNTOUCHED
- ❌ CR-007 A2 merge/shift/cancel/complimentary flows — UNTOUCHED
- ❌ CR-008 Sub-CR #1 (D1-Cap delivery charge), #4 Phase A (stay-on-order-entry) — UNTOUCHED
- ❌ CR-008 Sub-CR #3, #4 Phase B — remain parked
- ❌ A0a accepted cell-display short-circuit — UNTOUCHED
- ❌ A0b ROLE-NAME-WIRE-FIX — UNTOUCHED
- ❌ All 9 backend asks (BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F) — UNTOUCHED, still parked
- ❌ All 13 parked CR/bucket items (A3, A4, B3, B4, B2 Phase 2, CR-002, CR-008 Sub-CR #3 / Phase B, CR-009..CR-013) — UNTOUCHED
- ❌ Batch 3 items (LoadingPage.jsx ESLint, paymentService.js + constants.js + T-09 test, package.json testing-library deps) — UNTOUCHED
- ❌ `/app/memory/final/*` — UNTOUCHED
- ❌ `/app/backend/**` — UNTOUCHED

### 3.2 Payload / contract preserved
- CSV column headers unchanged; rows still ship all 9 (or 11 with tab splices) fields
- PDF template unchanged except the single `<td>` guard
- `reportTransform` payload shape unchanged; raw `payment_method` field preserved on every order
- No endpoint changed; no new env var; no localStorage key; no socket event

---

## 4. Validation performed

| Check | Result |
|---|---|
| `mcp_lint_javascript` on `OrderDetailSheet.jsx` | ✅ 0 issues |
| `mcp_lint_javascript` on `reportTransform.js` | ✅ 0 issues |
| `mcp_lint_javascript` on `ExportButtons.jsx` | ✅ 0 issues |
| Webpack build status | ✅ Compiled with 1 pre-existing warning (`LoadingPage.jsx:111` — Batch 3 scope, unchanged from baseline) |
| Supervisor `frontend` service | ✅ RUNNING |
| Preview URL HTTP status | ✅ 200 (`https://insights-phase.preview.emergentagent.com`) |
| Grep full-tree `cash_on_delivery` hit count | ✅ 4 code-site hits (unchanged) + inline comments: `OrderTable.jsx:491` (A0a short-circuit — untouched), `OrderDetailSheet.jsx:89` (DETAIL — now `—`), `reportTransform.js:720` (FILTER — now guarded), `ExportButtons.jsx:61 + 205` (CSV + PDF — now guarded) |
| Grep `extractPaymentMethods` consumers | ✅ 0 non-test consumers (exactly 2 hits, both in the helper's own file — definition + default export) |
| Grep `PAID_ACTIONS_ALLOWED_METHODS` | ✅ unchanged at `OrderTable.jsx:241` |
| CSV summary-row invariant (offline Node test) | ✅ `base: 9=9`, `cancelled: 11=11`, `aggregator: 11=11` |
| No runtime error on preview load | ✅ webpack hot-reload succeeded; no console errors reported |

### 4.1 QA delegation
Per plan §10.2, Batch 2 QA evidence is embedded in this summary (static + lint + build + invariant check). A preprod runtime addendum on the 4 items can be piggy-backed on the A0a runtime addendum already pending (covers audit-table, drill-down, CSV download, PDF print for a COD row). No separate QA report file created — `QA_REPORT_INDEX.md` row update handled below.

---

## 5. Tracker updates

### 5.1 Final Acceptance §7 backlog register
- Row 4 (CSV-A0a-01): marked RESOLVED 2026-05-04 ✅
- Row 5 (DETAIL-A0a-01): marked RESOLVED 2026-05-04 ✅
- Row 6 (FILTER-A0a-01): marked RESOLVED 2026-05-04 ✅
- Row 17 (CR-001 exports alignment): marked RESOLVED 2026-05-04 ✅

### 5.2 Final Acceptance §1.2 backlog count
- Decremented 17 → 13 (4 items resolved in this run).

### 5.3 QA index
- `QA_REPORT_INDEX.md` Observed Unrelated Issues block updated: 4 rows marked resolved with pointer to this summary.

---

## 6. Remaining pending items

### 6.1 Still in hygiene 9-item scope (Batch 3)
| Item | Status | Next trigger |
|---|---|---|
| LoadingPage ESLint | `backlog_follow_up` | Batch 3 kickoff (auto-approve G-3) |
| paymentService CLEAR_BILL | `backlog_follow_up` (`split_out_required`) | **G-4 owner gate** — delete vs repair vs alias vs leave (plan §12.1) |
| TEST-INFRA-001 wiring | `backlog_follow_up` | **G-5 owner gate** — sequence behind paymentService (Option A recommended) |

### 6.2 Wider backlog (untouched)
- 13 other backlog items (CR-010-RP-03/05, D-A0b-3, BUG-PREPAID-MERGE-SHIFT closed-fixed, TD-01..05 resolved, retained diagnostics, CR-004 visual badge, orphan-SRM, pre-existing ProtectedRoute test-infra) — all preserved
- 3 runtime addenda (A0a, A0b, FO-B1-01) — still pending preprod wake; the 4 items resolved in this run can piggyback on the A0a addendum
- 9 backend asks + 13 parked CR/bucket items + FE-01..FE-03 enrichments — all preserved parked/needs_owner_decision state

---

## 7. Confirmation of strict-rules compliance

| Rule | Status |
|---|---|
| No backend change | ✅ |
| No payment semantics change | ✅ |
| No Collect Bill change | ✅ |
| No KOT/bill totals change | ✅ |
| No PG Status logic change | ✅ |
| No order lifecycle/status derivation change | ✅ |
| A0a accepted behaviour preserved | ✅ (audit short-circuit untouched; siblings brought into parity) |
| CR-001 accepted behaviour preserved (export columns + tab splices + derivations) | ✅ |
| No `/app/memory/final/*` edit | ✅ |
| No Batch 3 item touched | ✅ |
| No parked item unparked | ✅ |
| No new CR opened | ✅ |

---

## 8. Recommended next step

### 8.1 Immediate option — Batch 3 kickoff
Proceed to Batch 3 (LoadingPage ESLint + paymentService CLEAR_BILL + TEST-INFRA-001 wiring) per plan §9.3. Requires:
- **G-3** (auto-approve) — LoadingPage `eslint-disable-next-line` pattern-matching existing L68 disable
- **G-4 owner gate** — paymentService CLEAR_BILL: pick delete (12.1.a, recommended) / repair / alias / leave
- **G-5 owner gate** — TEST-INFRA-001 sequencing: Option A (after paymentService, recommended) vs Option B (wire first, surface known T-09 failure)

### 8.2 Parallel option — Runtime QA addendum
If preprod (`https://preprod.mygenie.online/`) wakes before Batch 3 approval, a ~20-min Runtime QA Addendum session can close:
- A0a runtime addendum (covers DETAIL/FILTER/CSV-A0a-01 post-fix smoke)
- A0b runtime addendum
- FO-B1-01 runtime addendum

No file overlap with Batch 3; fully orthogonal.

— End of Batch 2 Implementation Summary —
