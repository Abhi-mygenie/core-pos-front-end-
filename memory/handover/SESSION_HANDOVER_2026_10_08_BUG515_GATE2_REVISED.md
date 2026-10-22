# Session Handover — BUG-515 Sub-B Gate 2 Impact Analysis (2026-10-08)

**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Status:** GATE_2_IMPACT_ANALYSIS COMPLETE — awaiting OD-515-04 → Gate 3 GO

---

## Summary

Gate 2 Impact Analysis written for BUG-515 Sub-B (expanded row pipeline bridging gap).
Zero code changes this session. Gate 3 NOT started.

---

## What Was Done

- Confirmed FULL code reality via grep: `pmsService.js` E-1a/b/c, `frontDeskService.js` E-2, `FrontDeskWorkstationPage.jsx` E-3, `GuestTable.jsx` E-4a/E-4b all present and correct.
- Confirmed root cause via line-level trace: `joinRowBalances` L144 drops discount fields; `InHousePanel` L23 passes raw snap row without merging.
- Confirmed `DeparturesPanel` has the same pattern — surfaced as OD-515-04.

IA doc: `/app/memory/impact/BUG-515_IMPACT_ANALYSIS_REVISED.md`

---

## Open Owner Decision

**OD-515-04 — Scope of fix:**
- **Option a (recommended):** InHousePanel + DeparturesPanel — 3 files, ~20 lines, full parity
- **Option b:** InHousePanel only — 2 files, ~14 lines

---

## Files for Gate 3 Plan

| Edit | File | Lines | Change |
|---|---|---|---|
| E-5 | `frontDeskService.js` | L141-146 | `joinRowBalances` output +5 discount fields |
| E-6 | `InHousePanel.jsx` | L23 | `renderExpansion` merge from `balances[row.orderId]` |
| E-7 (if OD=a) | `DeparturesPanel.jsx` | L42 | Same merge pattern as E-6 |

Files NOT touching: `pmsService.js` · `GuestTable.jsx` · `FrontDeskWorkstationPage.jsx` · all R5 hotspots

---

## Next

~~Owner answers OD-515-04 (a or b)~~ — **OD-515-04 = a LOCKED**
Gate 3 Implementation Plan written: `plans/BUG-515_SUBB_IMPLEMENTATION_PLAN.md`
**Awaiting owner Gate 4 GO → IMPLEMENTATION**
