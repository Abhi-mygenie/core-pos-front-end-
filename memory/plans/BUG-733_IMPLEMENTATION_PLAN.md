# Implementation Plan (Gate 3) — BUG-733 — 2026-11-20

**Role:** PLANNING (Gate 3) · **Sprint:** nov_cr_batch · **Risk:** LOW · **Code Reality:** FULL
**Depends on:** Gate 2 IA `impact/BUG-733_IMPACT_ANALYSIS.md` · **Owner gate:** needs Gate 4 GO. **OD-733-01 RESOLVED 2026-11-20 = (a)** (owner approved) — plan below is the (a) path; E-D1/E-D2 guard + Clear retained are now mandatory, not conditional.
**Reuse:** `src/components/reports/DatePicker.jsx` (single-date, `value`/`onChange` in `YYYY-MM-DD`). No new component (OD-P0-1=a).

Plan is written for **OD-733-01 = (a)** (keep Clear button; guard chevrons on empty). If owner picks (b) or (c), edits E-C* change — flagged inline.

---

## Scope lock
- **WILL change (3 files):**
  1. `src/pages/reports-module/OrderReportBetaPage.jsx` — import + 2 input swaps.
  2. `src/components/credit/CreditCustomerDetailSheet.jsx` — import + 2 input swaps (Clear button retained).
  3. `src/components/reports/DatePicker.jsx` — **only** a 2-line empty-value guard on the prev/next-day handlers (needed so the Credit instances don't emit `NaN-NaN-NaN`). Additive, backward-compatible (existing seeded consumers unaffected).
- **WILL NOT touch:** report fetch / `handleApply` / `appliedFrom`/`appliedTo`, Credit client-side filter logic (L321-336), statement callbacks, any transform/service, backend, other native-date screens.

---

## Edits — exact

### File 1 — `OrderReportBetaPage.jsx`

**E-O1 (import).** After L24 (`import { fmtISO, DATE_PRESETS, computePresetRange } ...`), add:
```jsx
import DatePicker from '../../components/reports/DatePicker'; // BUG-733
```

**E-O2 (From input, current L552-554).** Replace:
```jsx
            <label className="text-xs text-zinc-500">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-zinc-300 text-xs" data-testid="from-date" />
```
with:
```jsx
            <label className="text-xs text-zinc-500">From</label>
            {/* BUG-733: native date input → shadcn DatePicker */}
            <span data-testid="from-date"><DatePicker value={fromDate} onChange={setFromDate} /></span>
```

**E-O3 (To input, current L555-557).** Replace:
```jsx
            <label className="text-xs text-zinc-500">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-zinc-300 text-xs" data-testid="to-date" />
```
with:
```jsx
            <label className="text-xs text-zinc-500">To</label>
            {/* BUG-733 */}
            <span data-testid="to-date"><DatePicker value={toDate} onChange={setToDate} /></span>
```
*Note:* `fromDate`/`toDate` are already seeded with `today()` (L289-290) → never empty → chevrons always safe here. `onChange` receives the `YYYY-MM-DD` string directly (same shape as `e.target.value`).

### File 2 — `CreditCustomerDetailSheet.jsx`

**E-C1 (import).** `Calendar` is already imported (L13). After L25 (`import OrderDetailSheet ...`) add:
```jsx
import DatePicker from '../reports/DatePicker'; // BUG-733
```

**E-C2 (From input, current L446-453).** Replace the `<input ... data-testid="credit-date-from" .../>` block with:
```jsx
              {/* BUG-733: native date input → shadcn DatePicker */}
              <span data-testid="credit-date-from">
                <DatePicker value={dateFrom} onChange={setDateFrom} />
              </span>
```

**E-C3 (To input, current L455-462).** Replace the `<input ... data-testid="credit-date-to" .../>` block with:
```jsx
              {/* BUG-733 */}
              <span data-testid="credit-date-to">
                <DatePicker value={dateTo} onChange={setDateTo} />
              </span>
```
*Keep:* the `Calendar` icon (L444), the "Date Range:" label (L445), the "to" separator (L454), and the **Clear** button (L463-471) — Clear sets `dateFrom/dateTo=''`, which `DatePicker` renders as "Select date" (empty = unbounded, per OD-733-01=a). The client-side filter at L321-336 already treats empty as "no bound" — unchanged.

> If **OD-733-01 = (b)**: instead seed `useState` L210-211 with `firstOfMonth()`/`today()` and delete the Clear button (L463-471). If **(c)**: skip File 2 entirely (Order Beta only).

### File 3 — `DatePicker.jsx` (empty-value guard — only for OD-733-01=a)

**E-D1 (prev-day, current L175-179).** Replace:
```jsx
  const handlePrevDay = () => {
    const d = new Date(value);
    d.setDate(d.getDate() - 1);
    onChange(formatApiDate(d));
  };
```
with:
```jsx
  const handlePrevDay = () => {
    if (!value) return; // BUG-733: no-op while empty (Credit optional range)
    const d = new Date(value);
    d.setDate(d.getDate() - 1);
    onChange(formatApiDate(d));
  };
```

**E-D2 (next-day, current L181-186).** Add the same guard as the first line of `handleNextDay`:
```jsx
  const handleNextDay = () => {
    if (!value || isToday) return; // BUG-733: no-op while empty
    const d = new Date(value);
    d.setDate(d.getDate() + 1);
    onChange(formatApiDate(d));
  };
```
*Backward-compat:* existing consumers (`AllOrdersReportPage` etc.) always pass a concrete `value`, so `!value` is never true for them — zero behaviour change. (Optional polish: also set `disabled` styling when `!value`; not required.)

---

## Verification Matrix (seeds QA)

| # | File | Change | How to verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | OrderReportBetaPage.jsx | import DatePicker | webpack compiles, 0 new warnings | NO |
| 2 | OrderReportBetaPage.jsx:553 | From = DatePicker | Open Orders (Beta) → From shows "Today"; pick a past date → table re-queries on **Apply** with that date | NO (browser) |
| 3 | OrderReportBetaPage.jsx:556 | To = DatePicker | To picker works; future dates disabled; To ≥ From still allowed | NO (browser) |
| 4 | OrderReportBetaPage | testids | `from-date` / `to-date` wrappers still present & clickable | NO (browser) |
| 5 | CreditCustomerDetailSheet.jsx | import + From/To = DatePicker | Open a credit customer sheet → Date Range shows two pickers ("Select date" when empty) | NO (browser) |
| 6 | CreditCustomerDetailSheet.jsx | empty + Clear | With both empty, list shows all rows; pick From+To → rows filter client-side; **Clear** → back to "Select date" + all rows | NO (browser) |
| 7 | CreditCustomerDetailSheet.jsx | chevron-on-empty | With an empty picker, click ‹ / › → **no change, no `NaN-NaN-NaN`** (E-D1/E-D2 guard) | NO (browser) |
| 8 | DatePicker.jsx | empty guard | Unit: `handlePrev/NextDay` no-op when `value=''`; shift by 1 day when set | YES (jest) |
| 9 | Both screens | layout | No horizontal overflow / dropdown clipping at 1366×768 and 390×844 (Credit dropdown inside Sheet) | NO (browser) |
| 10 | Regression | report fetch | Order Beta Apply still calls `getOrderReportBetaCombined` with the picked range; Credit statement callbacks still receive `{dateFrom,dateTo}` | NO (browser) |

Suggested new unit test: `src/__tests__/components/reports/DatePicker.bug733.test.jsx` (covers #8).

---

## Post-Code Registry Checklist (Implementation agent runs after coding)
- [ ] `registry.json`: BUG-733 → `status: GATE_5A_IMPLEMENTED`, `sprint_key: nov_cr_batch`, `current_gate: 5`.
- [ ] `BUG_TRACKER.md`: BUG-733 row/CURRENT line updated to IMPLEMENTED.
- [ ] `FILE_OWNERSHIP.md`: add `OrderReportBetaPage.jsx`, `CreditCustomerDetailSheet.jsx`, `DatePicker.jsx` with `// BUG-733`.
- [ ] Code markers: `// BUG-733` in all 3 modified files (+ new test).
- [ ] Compile: webpack 0 new warnings.

## Execution sequence
E-D1/E-D2 (DatePicker guard) → E-C1..E-C3 (Credit) → E-O1..E-O3 (Order Beta). Do Order Beta in the single locked session for that hotspot file. Then self-test matrix → QA handover.

## Handover
Plan ready. 3 files, ~6 edit sites (+1 unit test). Code Reality FULL. Scope: date-control swap only, format-identical (`YYYY-MM-DD`), no fetch/filter-logic change. Blocked on **Gate 4 GO** + **OD-733-01** (default (a)).
