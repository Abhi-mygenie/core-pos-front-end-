# BUG-354 — Impact Analysis
## Order Report Status Column Shows Raw Value / Null

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Agent role:** PLANNING
**Code Reality:** PARTIAL — `getStatusBadge` function exists; 3 payment_type values not mapped
**Conflict Pre-Check:** `OrderReportBetaPage.jsx` last touched BUG-546 IMPL 2026-10-17 (L40 `getPaymentBadge`, L52 `getStatusBadge` Partial label). No conflict — BUG-546 touched a different function and different line. **Side finding:** FILE_OWNERSHIP records BUG-546 changed `Partial` label to `'Split Bill'` at L52, but code reads `'Partial'` — possible registry drift on BUG-546; flagged for owner awareness, not blocking BUG-354.

---

## 1. Root Cause (confirmed from code)

File: `src/pages/reports-module/OrderReportBetaPage.jsx`

`getStatusBadge(pt)` at **L47–55** maps `payment_type` → display label. Current map has exactly 4 entries:
```js
Cash    → { label: 'Paid',    cls: 'bg-blue-100 text-blue-800' }
Unpaid  → { label: 'Unpaid',  cls: 'bg-yellow-100 text-yellow-800' }
Cancel  → { label: 'Cancel',  cls: 'bg-red-100 text-red-800' }
Partial → { label: 'Partial', cls: 'bg-blue-100 text-blue-800' }
```
Fallback at L54: `map[pt] || { label: pt || '—', cls: 'bg-zinc-100 text-zinc-600' }`

Orders with `payment_type = TAB | prepaid | postpaid` fall through to the fallback — rendering the raw backend string or `'—'`.

`null` is already handled by the fallback (`pt || '—'`). No fix needed for null.

The separate `getPaymentBadge` function (L32–44) already has `tab` and other entries — it is not the issue. Only `getStatusBadge` needs updating.

`getStatusBadge` is called exactly once: **L557** — `const status = getStatusBadge(row.payment_type)`.

---

## 2. Data Flow Trace

```
Backend API → order row field `payment_type`
→ `getStatusBadge(row.payment_type)` at L557
→ `status.label` rendered as badge text in the Status column
BREAK POINT: TAB / prepaid / postpaid keys missing from map → raw string shown
```

---

## 3. Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO — display-only badge label |
| API contract change? | NO |
| State management? | NO |
| Hotspot file (R5)? | NO |
| Lines changed | ~3 added |
| Files touched | 1 |

**Risk: LOW**
**Fast Lane: ELIGIBLE** — 1 file, 3 lines, no logic, no hotspot, no API change.

---

## 4. Exact Fix (Gate 3 scope — for owner reference)

Add 3 entries to `getStatusBadge` map at L48–53:

```js
// In getStatusBadge, add after 'Partial' entry:
TAB:      { label: 'TAB',      cls: 'bg-amber-100 text-amber-800' },
prepaid:  { label: 'Prepaid',  cls: 'bg-green-100 text-green-800' },
postpaid: { label: 'Postpaid', cls: 'bg-zinc-100 text-zinc-600' },
```

No other files need changing. No new imports. No state changes.

---

## 5. Downstream Impact

- Only `OrderReportBetaPage.jsx` — no other page calls `getStatusBadge`
- No regression risk: existing 4 entries (`Cash`, `Unpaid`, `Cancel`, `Partial`) unchanged
- Null still handled by existing fallback

---

## 6. Owner Decisions Needed

None — fix is fully determined. Labels and colours confirmed by intake doc.

---

## 7. Verification Matrix (seeds QA)

| # | File | Change | How to Verify |
|---|------|--------|--------------|
| 1 | `OrderReportBetaPage.jsx` L48-53 | 3 entries added to getStatusBadge map | Open Order Report on a TAB/prepaid/postpaid order; confirm badge shows correct label with correct colour (not raw string) |
| REG | Same file | Existing Cash/Unpaid/Cancel/Partial entries untouched | Confirm existing badges still show correctly |

---

## 8. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-354 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add BUG-354 entry for OrderReportBetaPage.jsx
- [ ] Code marker: // BUG-354 comment on modified lines
```

---

Planning complete: BUG-354
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (function exists, 3 map entries missing)
Risk: LOW
Files WILL change: `src/pages/reports-module/OrderReportBetaPage.jsx`
Files WILL NOT touch: any other file
Owner decisions: NONE
Fast Lane: ELIGIBLE — awaiting owner GO
