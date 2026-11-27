# PRD Deployment Record — 2026-11-08 (Emergent E1 Session)

## Session Date
2026-11-08

## What Was Shipped (Code Changes)

### BUG-659 — Bill Reprint Omits Discount/Roundoff
- **File:** `src/api/transforms/orderTransform.js`
- **E1 L234-237:** `discountValue`, `discountType`, `roundUp` mapped from `get-single-order-new` backend fields
- **E2 L2174-2183:** `buildBillPrintPayload` default branch — IIFE fallbacks for `discount_percentage` and `roundoff`
- **Status:** GATE_5A_IMPLEMENTED — awaiting QA
- **P6 paths fixed:** AllOrdersReportPage reprint, OrderReportBetaPage reprint
- **P5 paths:** Still need Option A (separate gate)

### BUG-645 — Payment Filter Wrong Amount for Split Payments
- **Files:** `OrderReportBetaPage.jsx`, `AllOrdersReportPage.jsx`, `OrderTable.jsx`
- **Batch A:** Beta payment dropdown now includes UPI/Card from split order legs
- **Batch B:** Beta filter includes partial orders; row/day/grand totals use leg amounts; "(of ₹X)" note
- **Batch C:** Audit page shows leg amounts for split orders under payment filter
- **Follow-up:** Comma-strip fix on `getDisplayAmount` legAmount (L87)
- **Status:** GATE_5B_QA_PASS — ready for owner smoke

## Registry State After Session

| ID | Gate | Sprint |
|----|------|--------|
| BUG-659 | GATE_5A_IMPLEMENTED | nov_cr_batch |
| BUG-645 | GATE_5B_QA_PASS | nov_cr_batch |
| CR-513 | GATE_5A_IMPLEMENTED | nov_cr_batch |
| BUG-592 | GATE_5A_IMPLEMENTED | nov_cr_batch |

## Open Backend Request
See `backend_briefs/BACKEND_BRIEF_BUG-659_2026-11-08.md` — requesting `discount_type` + `round_up` in `employee-orders-list` and `update-order-paid` socket.
