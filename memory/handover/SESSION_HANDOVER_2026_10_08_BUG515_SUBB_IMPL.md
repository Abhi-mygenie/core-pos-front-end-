# Session Handover — BUG-515 Sub-B IMPLEMENTATION (2026-10-08)

**Role:** IMPLEMENTATION (Gate 5A)
**Status:** GATE_5A COMPLETE — awaiting QA Gate 5b

---

## Summary

BUG-515 Sub-B fully implemented. 3 edits / 3 files. Webpack clean (0 new warnings). EXIT GATE 5/5 PASS.

The expanded row for discounted in-house guests will now show the two-section layout (Booking rate + After check-in discount) as designed in OD-515-02=c.

---

## What Changed

### `src/api/services/frontDeskService.js`

**E-5** — `joinRowBalances` L141-153: expanded output object to include 5 discount fields:
```js
roomDiscountAmount:  g.roomDiscountAmount  ?? null, // BUG-515 Sub-B
effectiveTotal:      g.effectiveTotal      ?? null, // BUG-515 Sub-B
effectiveBalanceDue: g.effectiveBalanceDue ?? null, // BUG-515 Sub-B
effectiveSgst:       g.effectiveSgst       ?? null, // BUG-515 Sub-B
effectiveCgst:       g.effectiveCgst       ?? null, // BUG-515 Sub-B
```
All existing fields (display, raw, roundOff, room, fnb, transferred) unchanged.

### `src/components/pms/frontdesk/InHousePanel.jsx`

**E-6** — `renderExpansion` L23: converted from `() => (...)` to `() => { ... }` block.
RowExpansionStub path now merges `balances[row.orderId]` discount fields onto snap row when `roomDiscountAmount > 0`. `FolioCheckoutPanel` and `ExtendStayForm` paths: untouched.

### `src/components/pms/frontdesk/DeparturesPanel.jsx`

**E-7** — `renderExpansion` L42: identical merge pattern to E-6 (OD-515-04=a).

---

## EXIT GATE: 5/5 PASS

| Gate | Result |
|---|---|
| □1 registry.json: BUG-515 GATE_5A_IMPLEMENTED + Sub-B note | ✅ |
| □2 BUG_TRACKER.md: Sub-B GATE_5A row updated | ✅ |
| □3 FILE_OWNERSHIP.md: 3 files listed — BUG-515 Sub-B, 2026-10-08 | ✅ |
| □4 Code markers: // BUG-515 Sub-B ×12 across 3 files | ✅ |
| □5 Compile: webpack 0 new warnings (1 pre-existing) | ✅ |

---

## Checkpoint (for crash recovery)

```
✅ frontDeskService.js — E-5 joinRowBalances +5 discount fields
✅ InHousePanel.jsx   — E-6 renderExpansion merge
✅ DeparturesPanel.jsx — E-7 renderExpansion merge
✅ EXIT GATE 5/5
✅ QA Handover written
```

---

## Next Agent

**QA agent** → read `handover/QA_HANDOVER_BUG515_SUBB_2026_10_08.md` → execute 5 test cases + 3 regression checks on preprod.

Registry precondition check: `BUG-515` status = `GATE_5A_IMPLEMENTED` in `registry.json` ✅

Key test: TC-515B-1 — expand bonk booking on In-House tab → must show two-section layout with Section 2 "AFTER CHECK-IN DISCOUNT (−₹1,000)" showing ₹2,100 / ₹600 / ₹50 / ₹50.

---

## Open Items

- BUG-515 historical rack data shown to staff before this fix: no backfill needed (display-only bug)
- TC-515B-5 (Departures parity) may be NOT COVERABLE if no discounted guest is departing today
