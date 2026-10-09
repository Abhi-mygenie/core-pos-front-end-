# Session Handover — BUG-484 Implementation (2026-10-01)

**Role:** IMPLEMENTATION
**Status:** GATE_5A COMPLETE — awaiting QA Gate 5b

---

## Summary

BUG-484 implemented. `orderTransform.collectBillExisting` now sends F&B-only values for `payment_amount`, `grant_amount`, `order_amount` on room stays. Fix: 4 edits in 1 file (`orderTransform.js`). 8/8 unit tests PASS. `yarn build` exit 0.

---

## What Changed

### `src/api/transforms/orderTransform.js`

**E1** — After L1503 (`gstTax` computation), inserted:
```javascript
// BUG-484: handover_5 §2 — F&B-only on room stays
const fbOnlyTotal = Math.max(0, (finalTotal || 0) - (roomBalance || 0));
```

**E2** L1637: `payment_amount: fbOnlyTotal` (was `finalTotal || 0`)
**E3** L1653: `grant_amount: fbOnlyTotal` (was `finalTotal || 0`)
**E4** L1660: `order_amount: fbOnlyTotal` (was `finalTotal || 0`)

Non-room orders: `roomBalance=0` → `fbOnlyTotal=finalTotal` — byte-identical.

### NEW: `src/__tests__/api/transforms/orderTransform.bug484.test.js`
8 unit tests (V5, V6/V9, V7, V10, V9b, REG-1/2/3) — all PASS.

---

## EXIT GATE: 5/5 PASS

| Gate | Result |
|---|---|
| □1 registry.json: GATE_5A_IMPLEMENTED | ✅ |
| □2 BUG_TRACKER.md updated | ✅ |
| □3 FILE_OWNERSHIP.md updated | ✅ |
| □4 Code markers // BUG-484 ×4 | ✅ |
| □5 yarn build exit 0 | ✅ |

---

## Next Agent

**QA agent** → read `handover/QA_HANDOVER_BUG484_2026_10_01.md` → execute 7 regression tests + preprod curl probe on a room order.

Registry precondition check: `BUG-484` status = `GATE_5A_IMPLEMENTED` in `registry.json` ✅

---

## Open Items

- BUG-484 historical DB data (pre-fix `orders.order_amount` inflated) — forward-only fix, no backfill planned
- CR-405 Implementation Plan not yet written (separate item, owner has not given Gate 4 GO)
