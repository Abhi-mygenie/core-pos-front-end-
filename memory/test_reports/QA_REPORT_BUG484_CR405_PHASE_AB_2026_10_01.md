# QA Report — BUG-484 + CR-405 Phase A+B
**Date:** 2026-10-01
**QA agent:** Role 4
**Testing tool:** testing_agent iteration_1.json
**Scope:** BUG-484 + CR-405-A + CR-405-B
**Out of scope:** CR-405-D (check-in discount), CR-405-C (partial_payments_room) — not yet implemented

---

## Result: ALL PASS

```
Tests:   24/24 passed (3 suites × 8 tests)
Blockers: 0
Major:    0
Minor:    0
Notes:    0
```

---

## Test Evidence

| # | Test Case | Result | Severity | Evidence |
|---|---|---|---|---|
| UT-1 | `orderTransform.bug484.test.js` 8/8 | ✅ PASS | — | iteration_1.json |
| UT-2 | `FolioCheckoutPanel.cr405a.test.jsx` 8/8 | ✅ PASS | — | iteration_1.json |
| UT-3 | `orderTransform.cr405b.test.js` 8/8 | ✅ PASS | — | iteration_1.json |
| CV-1 | BUG-484: `fbOnlyTotal` at L1509 | ✅ PASS | — | Code verified |
| CV-2 | BUG-484: `payment_amount: fbOnlyTotal` L1637 | ✅ PASS | — | Code verified |
| CV-3 | BUG-484: `grant_amount: fbOnlyTotal` L1653 | ✅ PASS | — | Code verified |
| CV-4 | BUG-484: `order_amount: fbOnlyTotal` L1660 | ✅ PASS | — | Code verified |
| CV-5 | BUG-484: `paid_room = 'yes'` still present | ✅ PASS | — | Code verified |
| CV-6 | CR-405-A: `roomDiscount`/`roomDiscountReason` state L115-117 | ✅ PASS | — | Code verified |
| CV-7 | CR-405-A: `bill-room-discount-input` testid, NOT disabled | ✅ PASS | — | Code verified |
| CV-8 | CR-405-A: `bill-room-discount-reason` testid, NOT disabled | ✅ PASS | — | Code verified |
| CV-9 | CR-405-A: `bill-room-discount-applied` badge conditional | ✅ PASS | — | Code verified |
| CV-10 | CR-405-A: Old disabled button with `title='needs BQ-385-07'` GONE | ✅ PASS | — | Code verified |
| CV-11 | CR-405-A: `handlePaid` injection L145-152 | ✅ PASS | — | Code verified |
| CV-12 | CR-405-A: `handlePaid` deps includes `roomDiscount`/`roomDiscountReason` | ✅ PASS | — | Code verified |
| CV-13 | CR-405-B: `ORDER_SHIFTED_ROOM` = `/api/v1/…` | ✅ PASS | — | Code verified |
| CV-14 | CR-405-B: `CollectPaymentPanel` sets `paymentData.roomOrderId` | ✅ PASS | — | Code verified |
| CV-15 | CR-405-B: `transferToRoom` returns only `{source_order_id, target_order_id, transfer_note}` | ✅ PASS | — | Code verified |
| CV-16 | CR-405-B: `OrderEntry.jsx` 3-arg call compatible with `_roomId` ignored param | ✅ PASS | — | Code verified |
| BLD | `yarn build` exit 0, 0 new warnings | ✅ PASS | — | Build log |

---

## Coverage

| Item | Files changed | Files tested |
|---|---|---|
| BUG-484 | 1 (`orderTransform.js`) | 1/1 ✅ |
| CR-405-A | 1 (`FolioCheckoutPanel.jsx`) | 1/1 ✅ |
| CR-405-B | 3 (`constants.js`, `CollectPaymentPanel.jsx`, `orderTransform.js`) | 3/3 ✅ |
| **Total** | **5 files** | **5/5 ✅** |

---

## Registry Spot-Check

- BUG-484: `GATE_5B_QA_PASSED` ✅
- CR-405: `GATE_5B_QA_PASSED_PHASE_A_B` ✅
- Sprint: `oct_cr_batch` ✅

**REGISTRY: SYNCED**

---

## Findings

None. Zero BLOCKER, MAJOR, MINOR findings.

---

## Next Steps

- **BUG-484** → Ready for Gate 6 Owner Smoke on preprod (room order settle — verify `payment_amount` = F&B only in network tab)
- **CR-405 Phase A** → Ready for Gate 6 Owner Smoke (Front Desk Bill → enter room discount → settle)
- **CR-405 Phase B** → Ready for Gate 6 Owner Smoke (Collect Payment → To Room → Transfer)
- **CR-405 Phase D** → Not yet implemented (check-in bake). Awaiting Gate 4 GO.
- **CR-405 Phase C** → Not yet implemented (partial_payments_room). Awaiting Gate 4 GO.
