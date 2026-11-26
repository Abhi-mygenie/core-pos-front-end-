# Session Handover — BUG-515 Revised Investigation (2026-10-08)

**Role:** INVESTIGATION (revision — post-implementation failure analysis)
**Status:** COMPLETE — root cause identified with HIGH confidence

---

## Summary

BUG-515 implementation (GATE_5A) confirmed applied — all 9 verification checks PASS.
Sub-A (balance column ₹650→₹600) is FIXED.
Sub-B (expanded row rack values) is STILL BROKEN due to pipeline routing error in original design.

---

## Root Cause (one paragraph)

`getInHouseGuests` (pmsService.js) enriches internal row objects with `roomDiscountAmount`,
`effectiveTotal`, `effectiveSgst`, `effectiveCgst`, `effectiveBalanceDue` in Step 3.
`joinRowBalances` (frontDeskService.js L141-146) only extracts `balance`, `roomBalance`,
`roomOrdersBalance`, `transferredFnbBalance` — all discount enrichment fields are discarded.
`RowExpansionStub` receives its `row` from the snap pipeline (`fromReservation` in
frontDeskTransform.js) which never has these fields. `hasDiscount` evaluates to `false` always
→ Section 2 never renders, Section 1 shows rack values without "Booking rate" label.

---

## What Changed This Session

- No code changes (INVESTIGATION role — no coding)
- Created: `/app/memory/investigations/INV-BUG515-REVISED-2026-10-08.md`

---

## Sub-A / Sub-B Status

| Sub-issue | Status |
|---|---|
| Sub-A: balance column (₹650→₹600) | ✅ FIXED — `balances[orderId].display=600` |
| Sub-B: expanded row (rack→post-discount) | ❌ STILL BROKEN — pipeline mismatch |

---

## Recommended Next Steps

**Option A (recommended, planning skip eligible with owner approval):**
1. `frontDeskService.js` `joinRowBalances` L144: also capture discount fields into output map
2. `InHousePanel.jsx` `renderExpansion` L23: merge discount fields from `balances[row.orderId]` onto row before passing to `RowExpansionStub`

**Files:** `frontDeskService.js` + `InHousePanel.jsx`
**Lines:** ~10 total
**Planning skip:** YES if owner approves (CRITICAL risk, owner approval mandatory)

---

## Open Items

- BUG-515 Sub-B: needs planning → implementation (Option A above)
- GuestTable.jsx E-4a and E-4b are correctly written; no changes needed there
- pmsService.js E-1a/b/c and frontDeskService.js E-2 are correct; no changes needed

---

## Registry Note

BUG-515 remains at GATE_5A_IMPLEMENTED.
Sub-A is functionally CLOSED (OWNER VERIFIED at next smoke).
Sub-B regression should keep BUG-515 in GATE_5A until Sub-B is re-fixed.
