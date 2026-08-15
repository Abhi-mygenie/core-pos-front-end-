# Handover — Mask `cash_on_delivery` in Payment Column (Audit Report)

**Prepared:** 2026-05-01
**Scope:** Frontend-only. Display-layer change, no classification / business-logic impact.
**Branch context:** `1-may` (Emergent deployment)
**Ticket tag:** UI-COD-MASK (May-2026)
**Risk:** Very low. See §7.

---

## 1. Problem Statement

The Audit Report shows `cash_on_delivery` as a raw text value inside the **Payment** column's pill badge (e.g. the earlier operator screenshot showed two rows: `cash_on_delivery ₹30` and `cash_on_delivery ₹120`). This raw enum string is a backend implementation detail and not intended for operator display.

**Product requirement:** wherever `cash_on_delivery` would otherwise appear literally in the UI, the cell must render **blank (dash `—`)** instead. All other payment methods are unaffected.

This is **purely a display fix.** Classification (which tab the row falls on), row-action eligibility (pill affordances), filter logic, and downstream mutation payloads are all unchanged.

## 2. Current Behaviour — Where `cash_on_delivery` Is Shown Literally

Traced across the entire reports tree:

| Surface | File:Line | Behaviour today | Needs fix? |
|---|---|---|---|
| OrderTable — Payment column on `all` tab | `components/reports/OrderTable.jsx:469‑478` | Already renders `—` (whitelist of `cash`/`card`/`upi` only — everything else dashed). | ❌ No — already correct. |
| **OrderTable — Payment column on every other tab** (Audit, Paid, Cancelled, Hold, Unpaid, Merged, Aggregator, Transferred, Credit) | **`components/reports/OrderTable.jsx:480‑484`** | **Renders the raw `paymentMethod` string literally inside a pill badge.** | ✅ **Yes — single fix site.** |
| OrderTable — running placeholder cell | `components/reports/OrderTable.jsx:368` | Renders `paymentStatus` (not `paymentMethod`). | ❌ No. |
| OrderDetailSheet — header / payment field / "Paid via …" | `components/reports/OrderDetailSheet.jsx:81‑104` | `formatPaymentMethod` already maps `cash_on_delivery → "CASH"`. | ❌ No — already masked as `CASH`. |
| PaymentMethodPicker popover (row-action) | `components/reports/PaymentMethodPicker.jsx` | Action affordance, not a display of the raw row value. | ❌ No. |
| Filter chips / dropdowns | `api/transforms/reportTransform.js:711‑712` | Aggregates the unique-methods set from data; not a row-level display. | See §8 follow-up. |

**One file, one `case` branch.**

## 3. Root Cause

`components/reports/OrderTable.jsx:467‑484` — `renderCell(… columnId === 'paymentMethod')`:

```js
case 'paymentMethod':
  // For All Orders tab, only show cash/card/upi, rest should be blank
  if (tabId === 'all') {
    const pm = (order.paymentMethod || '').toLowerCase();
    if (['cash', 'card', 'upi'].includes(pm)) {
      return (
        <span className={`inline-flex … ${getPaymentBadgeStyle(order.paymentMethod)}`}>
          {order.paymentMethod}
        </span>
      );
    }
    return <span className="text-sm text-zinc-400">—</span>;
  }
  // ⬇ The else branch — fires on Audit / Paid / Cancelled / Hold / Unpaid / etc.
  return (
    <span className={`inline-flex … ${getPaymentBadgeStyle(order.paymentMethod)}`}>
      {order.paymentMethod || '—'}
    </span>
  );
```

The `all`-tab branch has a whitelist that naturally masks `cash_on_delivery`. The else branch does not — it echoes whatever `order.paymentMethod` is.

## 4. Target Behaviour

> For **any tab**, if `(order.paymentMethod || '').toLowerCase() === 'cash_on_delivery'`, render `<span className="text-sm text-zinc-400">—</span>`.
>
> All other payment-method values render as today.

No change to classification, row actions, filters, transforms, or API payloads.

## 5. Exact Code Change

**File:** `/app/frontend/src/components/reports/OrderTable.jsx`
**Target:** the `case 'paymentMethod':` block (lines **467‑484**).

### 5.1 OLD (replace target)

```js
    case 'paymentMethod':
      // For All Orders tab, only show cash/card/upi, rest should be blank
      if (tabId === 'all') {
        const pm = (order.paymentMethod || '').toLowerCase();
        if (['cash', 'card', 'upi'].includes(pm)) {
          return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getPaymentBadgeStyle(order.paymentMethod)}`}>
              {order.paymentMethod}
            </span>
          );
        }
        return <span className="text-sm text-zinc-400">—</span>;
      }
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getPaymentBadgeStyle(order.paymentMethod)}`}>
          {order.paymentMethod || '—'}
        </span>
      );
```

### 5.2 NEW

```js
    case 'paymentMethod': {
      // UI-COD-MASK (May-2026): `cash_on_delivery` is a backend enum value
      // that should never be surfaced to an operator. It is masked as '—'
      // across every tab. Other payment methods render as today.
      const pmLower = (order.paymentMethod || '').toLowerCase();
      if (pmLower === 'cash_on_delivery') {
        return <span className="text-sm text-zinc-400">—</span>;
      }

      // For All Orders tab, only show cash/card/upi, rest should be blank
      if (tabId === 'all') {
        if (['cash', 'card', 'upi'].includes(pmLower)) {
          return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getPaymentBadgeStyle(order.paymentMethod)}`}>
              {order.paymentMethod}
            </span>
          );
        }
        return <span className="text-sm text-zinc-400">—</span>;
      }
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getPaymentBadgeStyle(order.paymentMethod)}`}>
          {order.paymentMethod || '—'}
        </span>
      );
    }
```

### 5.3 Diff summary

Three minor shape changes inside one `case`:

1. **Wrap the case body in a block `{ … }`** — required so we can declare `const pmLower` at the top of the case; JavaScript disallows `const` at the top of a non-block `case` body.
2. **Add a 4-line short-circuit** at the top: if `pmLower === 'cash_on_delivery'`, return the dash span and bail out. This fires for every tab (including `all` — consistent).
3. **Hoist `pmLower`** (renamed from `pm` for clarity) to the outer scope of the block so the existing `all`-tab branch reuses it instead of recomputing `.toLowerCase()`.

No other logic, styling, or payload changes.

## 6. Regression Test (new)

**File:** `/app/frontend/src/__tests__/components/reports/OrderTable-paymentCol.test.jsx` (new file; place under `__tests__/components` if that tree doesn't yet exist).

### 6.1 Minimum coverage

Use `@testing-library/react` (already in the repo — see existing component tests for pattern).

```jsx
/**
 * UI-COD-MASK (May-2026)
 *
 * The Payment column must render '—' for cash_on_delivery across every tab.
 * Other payment methods continue to render as-is (all tab: whitelist cash/card/upi;
 * other tabs: raw value pill).
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import OrderTable from '../../../components/reports/OrderTable';

const buildOrder = (overrides = {}) => ({
  id: 1,
  orderId: '002298',
  displayOrderId: 'R-002298',
  status: 'running',
  createdAt: '2026-05-01T10:00:00Z',
  customer: 'Guest',
  table: 'T-1',
  waiter: 'Owner',
  punchedBy: 'Owner',
  paymentMethod: 'cash_on_delivery',
  amount: 120,
  ...overrides,
});

describe('OrderTable — Payment column cash_on_delivery masking', () => {
  const tabs = ['all', 'audit', 'paid', 'cancelled', 'hold', 'unpaid', 'merged', 'aggregator'];

  test.each(tabs)('tabId=%s — cash_on_delivery renders as dash', (tabId) => {
    render(<OrderTable orders={[buildOrder({ paymentMethod: 'cash_on_delivery' })]} tabId={tabId} tabLabel={tabId} />);
    // The literal enum must never be visible to the operator
    expect(screen.queryByText('cash_on_delivery')).toBeNull();
    // At least one cell shows the dash placeholder
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  test.each(tabs)('tabId=%s — CASH_ON_DELIVERY (upper) also masked', (tabId) => {
    render(<OrderTable orders={[buildOrder({ paymentMethod: 'CASH_ON_DELIVERY' })]} tabId={tabId} tabLabel={tabId} />);
    expect(screen.queryByText(/cash_on_delivery/i)).toBeNull();
  });

  it('tabId=paid — cash still renders as pill', () => {
    render(<OrderTable orders={[buildOrder({ paymentMethod: 'cash' })]} tabId="paid" tabLabel="Paid" />);
    expect(screen.getByText('cash')).toBeInTheDocument();
  });

  it('tabId=all — card still renders as pill', () => {
    render(<OrderTable orders={[buildOrder({ paymentMethod: 'card' })]} tabId="all" tabLabel="All" />);
    expect(screen.getByText('card')).toBeInTheDocument();
  });

  it('tabId=cancelled — pending renders as pill (regression: not masked)', () => {
    render(<OrderTable orders={[buildOrder({ paymentMethod: 'pending' })]} tabId="cancelled" tabLabel="Cancelled" />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });
});
```

### 6.2 Notes
- The exact selectors (`screen.queryByText`, `getAllByText`) depend on whether there are other cells rendering `—` (Actioned-by column, for instance). Adjust to `within(row).queryByText` if the table is noisy in your test harness.
- If `@testing-library/react` isn't already wired, fall back to a pure-JSX snapshot test comparing the rendered HTML of the `paymentMethod` cell for each case. Avoid depending on `jest-dom` extensions that aren't in `package.json`.

## 7. Risk Assessment

**Very low.**

| Dimension | Assessment |
|---|---|
| Scope | Single `case` branch of `renderCell`. Other cells, other components, transforms, filters, row actions — all untouched. |
| Data semantics | **Unchanged.** `order.paymentMethod` retains its raw value. Only the visible pill is replaced with a dash. Row-action eligibility (`OrderTable.jsx:231, 289`) continues to inspect `order.paymentMethod` directly — e.g. an unpaid `cash_on_delivery` row still qualifies for Mark-as-Unpaid / Change-Payment-Method row actions as before. |
| Filters | **Unchanged.** The Payment method filter uses `filters.paymentMethod` against `order.paymentMethod`; the cooked value is untouched. Operators can still filter for `cash_on_delivery` if the filter is surfaced (see §8 follow-up for the cosmetic improvement). |
| Drill-down (OrderDetailSheet) | Already masks as `CASH` via `formatPaymentMethod`. No change here. |
| Accessibility / ARIA | Dash span is consistent with existing empty-cell rendering. No regression. |
| Reversibility | Trivial — single git revert. |

## 8. Out of Scope / Follow-up

1. **Filter dropdown cosmetic** — `api/transforms/reportTransform.js:711‑712` collects the set of `paymentMethod` values from visible rows to populate a filter dropdown. If this dropdown is ever shown to operators, `cash_on_delivery` will appear there as an option too. Recommend a sibling follow-up to either: (a) drop `cash_on_delivery` from the filter set, or (b) map it to `cash` in the filter-set builder. Not blocking — this ticket only targets the row-level display.
2. **OrderDetailSheet heuristic `formatPaymentMethod` maps `cash_on_delivery → "CASH"`.** Product may want this to also go blank for consistency with the table. Decision deferred; not in scope here.
3. **Export files (CSV / print receipts).** Any report export that includes `paymentMethod` will still contain `cash_on_delivery` in the exported string. Out of scope for this UI fix. Flag to product if they want symmetric masking on exports.

## 9. Rollback Plan

Single git revert on the commit. No data migration. No dependent consumers.

## 10. Touched Files Summary

| File | Edit | LOC delta |
|---|---|---|
| `/app/frontend/src/components/reports/OrderTable.jsx` | 1 case block (lines 467‑484) rewritten | +5 lines (short-circuit + block braces + comment) |
| `/app/frontend/src/__tests__/components/reports/OrderTable-paymentCol.test.jsx` | New file | +≈40 lines |

**Net production LOC: +5.**

## 11. Verification

### 11.1 Automated
```bash
cd /app/frontend
CI=true yarn test --testPathPattern=OrderTable-paymentCol --watchAll=false
```
All test cases must pass. Full suite must remain green.

```bash
tail -20 /var/log/supervisor/frontend.out.log
# Expect: `webpack compiled successfully` (or the pre-existing
# LoadingPage.jsx exhaustive-deps warning, unchanged).
```

### 11.2 Live preprod
Log in as `owner@18march.com` / `Qplazm@10`, navigate to `/reports/audit`, select a date that contained `cash_on_delivery` rows on any tab (e.g. the date that produced the earlier ₹30 / ₹120 screenshot; today's `cash_on_delivery` rows are on the **Running** tab — row 002290, amount ₹47).

On each tab verify:
- Rows previously showing `cash_on_delivery` in the Payment column now show `—`.
- Rows with other payment methods (`cash`, `card`, `pending`, `transferToRoom`, `Cancel`, etc.) are unchanged.
- Row click still opens the detail sheet (no regression in click handlers).
- Row-action pills (Mark-as-Unpaid / Change-Payment-Method) still appear on eligible `cash_on_delivery` rows — they inspect the raw `order.paymentMethod`, not the rendered cell.

### 11.3 Contract negative-check
Confirm the classification (the tab the row lands on) has **not** changed — same `cash_on_delivery` rows on the same tabs as before, just with a dash in the Payment column.

---

## 12. Contact / References

- Investigation trail: prior conversation thread on Emergent (2026-05-01). Related handovers in `/app/memory/`:
  - `ROLE_NAME_WIRE_FIX_HANDOVER.md` (separate concern — `role_name` wire value)
  - `BUG_CANCEL_DERIVATION_HANDOVER.md` (separate concern — `f_order_status === 3` classification)
  - `DEPLOYMENT_HANDOVER.md` (environment setup, not code)
- No overlap between this ticket and any of the above; all three can land independently in any order.

---

*End of handover.*
