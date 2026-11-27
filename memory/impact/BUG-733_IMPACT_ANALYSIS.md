# Impact Analysis (Gate 2) — BUG-733 — 2026-11-20

**Role:** PLANNING (Gate 2) · **Sprint:** nov_cr_batch · **Client:** ALL · **Assignee:** Abhishek
**Item:** BUG-733 — Native browser `<input type="date">` on the **Credit sheet** and **Order Report Beta** instead of the shadcn-style `DatePicker`.
**Priority:** P0 (owner flat-override 2026-11-19; native QA severity MINOR) · **Risk:** LOW
**Owner scope decision referenced:** OD-P0-1 (2026-11-20) = **(a)** — migrate ONLY Credit + Order Beta now; reuse the EXISTING `components/reports/DatePicker.jsx` (no new component). Full ~65-screen standardisation is a SEPARATE effort, out of scope here.

---

## Header — mandatory checks

**Code Reality: FULL.** Both native date inputs exist in shipped code; this is a fix-forward control swap, not greenfield.

**Target files (2):**
- `src/pages/reports-module/OrderReportBetaPage.jsx` (935 lines) — 2 native inputs, L553/556.
- `src/components/credit/CreditCustomerDetailSheet.jsx` (789 lines) — 2 native inputs, L448/457. *(This is the "Credit sheet"; `pages/CreditManagementPage.jsx` has no date input.)*

**Reuse target:** `src/components/reports/DatePicker.jsx` — single-date shadcn-style control. Props: `value` (YYYY-MM-DD string), `onChange(YYYY-MM-DD string)`, optional `disabled`, `tooltip`. Renders its own prev-day / trigger / next-day cluster + dropdown calendar; **blocks future dates**; closes on outside click. Already consumed by `AllOrdersReportPage`, `RoomOrdersReportPage`, `OrderSummaryPage` (pattern: `<DatePicker value={selectedDate} onChange={handleDateChange} />`).

**Conflict Pre-Check**
- **`OrderReportBetaPage.jsx` is a shared-file hotspot** — also touched by BUG-711 (gated, done), BUG-671 (FE done/RETEST), BUG-735 (split-row gating), and all of Cluster C. Per the P0-unblock lock (`OWNER_DECISIONS_2026_11_20.md`): **one owner-session/PR at a time** on this file. BUG-733 edits L553-557 only (date inputs) — **disjoint** from BUG-735 (L754/764), BUG-726 (L745-749), BUG-727 (L704), BUG-728 (L605/678), BUG-724 (L308/438/628). Safe to land in the same PR as Cluster C provided it is the single active session.
- **`CreditCustomerDetailSheet.jsx`** — last modified by CR-526 (IMPLEMENTED 2026-11-19, make-unpaid / remove-from-credit). **No open item** currently holds this file. ⚠ **BUG-734** (Credit `[null]` item names + silent Remove failure, GATE_1_INTAKE) will touch the same file later → if BUG-734 starts, sequence it in the same Credit session. Line-ranges are disjoint (BUG-734 = item list / remove path, BUG-733 = date filter L442-471).
- No backend involvement. No transform/service involvement.

---

## Per-item impact (root cause verified in code)

| Facet | File:Line | Current | Fix direction |
|------|-----------|---------|---------------|
| Order Beta — From | `OrderReportBetaPage.jsx:553-554` | `<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} data-testid="from-date">` | Replace with `<DatePicker value={fromDate} onChange={setFromDate} />`, wrapped in a `<span data-testid="from-date">` to preserve the QA selector. |
| Order Beta — To | `OrderReportBetaPage.jsx:556-557` | `<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} data-testid="to-date">` | Same, wrapped in `<span data-testid="to-date">`. |
| Credit sheet — From | `CreditCustomerDetailSheet.jsx:446-453` | `<input type="date" value={dateFrom} onChange=... data-testid="credit-date-from">` | Replace with `<DatePicker value={dateFrom} onChange={setDateFrom} />`, wrapped in `<span data-testid="credit-date-from">`. |
| Credit sheet — To | `CreditCustomerDetailSheet.jsx:455-462` | `<input type="date" value={dateTo} onChange=... data-testid="credit-date-to">` | Same, wrapped in `<span data-testid="credit-date-to">`. |

**Data-format compatibility:** `DatePicker` emits/consumes `YYYY-MM-DD`, identical to the native input's `e.target.value`. Downstream consumers are unaffected:
- Order Beta: `fromDate/toDate` init `today()` = `fmtISO(new Date())` (YYYY-MM-DD) → feed `appliedFrom/appliedTo` on `handleApply` → `getOrderReportBetaCombined`. No change to Apply flow.
- Credit: `dateFrom/dateTo` feed client-side `filter` (L321-336: `day < dateFrom` / `day > dateTo` string compares) and the statement callbacks (L392/409). All string compares — format-identical.

---

## Behavioural deltas introduced by the swap (the real impact)

1. **Credit filter is OPTIONAL/clearable; `DatePicker` is not.**
   Credit inits `dateFrom/dateTo = ''` (empty = *unbounded* — "no lower/upper limit") with a **Clear** button (L463-471) that resets to `''`. `DatePicker` has **no empty state**: `formatDisplayDate('')` shows "Select date" (OK visually), but:
   - its **prev-day/next-day chevrons call `new Date(value)`** → `new Date('')` = *Invalid Date* → `onChange('NaN-NaN-NaN')` when clicked on an empty picker (L176/183).
   - `DatePicker` cannot *return to empty* — once a day is picked there is no in-control way to clear it.
   → The existing **Clear** button must be **kept** (it still sets `''`, which the picker renders as "Select date"), and the prev/next-day chevrons are unsafe while the value is empty. **See OD-733-01.**
   Order Beta does **not** have this problem (always seeded with `today()`), so the chevrons are always safe there.

2. **Duplicate internal `data-testid`s.** `DatePicker` hard-codes `date-picker-trigger` / `-prev-day` / `-next-day` / `-dropdown`. Two instances on one screen ⇒ the same testids appear twice (From and To). Mitigation: keep the outer wrapper testids (`from-date`/`to-date`/`credit-date-from`/`credit-date-to`) as the stable per-field selectors; QA targets those, then the inner trigger within.

3. **Future dates are now blocked** by `DatePicker` (native inputs allowed any date). For both report/credit contexts this is desirable, not a regression — but it is a behaviour change worth a QA note.

4. **Layout/width.** `DatePicker` is a 3-button cluster (~ wider than one native input) with a right-aligned dropdown (`absolute right-0`). Order Beta header row (`flex items-center gap-2`) and the Credit filter bar (`flex items-center gap-2 bg-zinc-50`) both accommodate it; verify no wrap/overflow at 1366px and 390px, and that the Credit dropdown (inside a Sheet) is not clipped by the sheet's overflow.

---

## Owner decisions (block Gate-2 sign-off)

**OD-733-01 — RESOLVED 2026-11-20 = (a)** (owner approved). *Rationale confirmed against code: the 3 existing `DatePicker` reports (`AllOrdersReportPage` L158, `RoomOrdersReportPage` L331, `OrderSummaryPage` L27) all use a single date seeded to `today()`, never empty, no Clear/range — so none hits the empty-value case. Order Beta already matches that (from/to seeded `today()`). The Credit sheet is the only screen with an optional/clearable range, so option (a) keeps that behaviour.* 
With `DatePicker` there is no empty state and the prev/next-day chevrons misbehave on an empty value. Choose:
- **(a) ✅ CHOSEN — keep Clear, neutralise chevrons while empty.** Keep the existing **Clear** button (sets `''` → picker shows "Select date"); on the Credit instances treat an empty value as "no bound". Simplest safe option: the chevrons only shift a concrete date — guard them so an empty value is a no-op (the plan's E-C3 guard), preserving today's "optional range" behaviour exactly.
- **(b)** Seed Credit `dateFrom/dateTo` with real defaults (e.g. first-of-month → today) so the picker is never empty, and drop the Clear button. Changes current UX (range is always bounded).
- **(c)** Leave Credit on the native input; migrate Order Beta only. (Partially satisfies the P0, defers the Credit facet.)

**OD-733-02 — Scope confirm.** Confirm BUG-733 is exactly these 2 screens / 4 inputs this round (OD-P0-1 already = a). The other ~63 native-date screens remain a separate UI-consistency effort. *(Recommend: confirm as-is.)*

---

## Scope lock
- **WILL change:** `OrderReportBetaPage.jsx` (L553-557 date inputs only), `CreditCustomerDetailSheet.jsx` (L442-471 date-filter block only). Import `DatePicker` in both.
- **WILL NOT touch:** `DatePicker.jsx` itself (reuse as-is, unless OD-733-01=a requires an internal empty-value guard — see plan note), any transform/service, the Apply/report-fetch flow, the Credit client-side filter logic, backend, and the other ~63 native-date screens.

## Risk register
- **R1 (LOW):** Credit empty-value chevron crash → mitigated by OD-733-01(a) guard. 
- **R2 (LOW):** duplicate testids → mitigated by wrapper testids.
- **R3 (LOW):** hotspot file `OrderReportBetaPage.jsx` → one-session/PR lock; edits disjoint from 711/671/735/Cluster C.
- **R4 (LOW):** dropdown clipping inside the Credit Sheet → QA at 1366 + 390.

**Next:** Gate 3 Implementation Plan → `plans/BUG-733_IMPLEMENTATION_PLAN.md` (written this session). Gate 4 GO required before code (owner must also answer OD-733-01).
