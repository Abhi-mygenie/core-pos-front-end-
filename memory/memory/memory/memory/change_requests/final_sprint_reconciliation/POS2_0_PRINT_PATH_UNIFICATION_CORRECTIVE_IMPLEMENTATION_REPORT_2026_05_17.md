# Print Path Unification Corrective Patch — Implementation Report — 2026-05-17

## 1. Status
**APPLIED** — exactly per `POS2_0_PRINT_PATH_UNIFICATION_CORRECTIVE_CODE_DIFF_PREVIEW_2026_05_17.md` (Owner approval: "A" + "finish this job Immediate Action").

---

## 2. Files modified

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/api/transforms/orderTransform.js` | Comment block + `finalGrantAmount` derivation + emit split | Change 2.1 was already present; 2.2 (new `finalGrantAmount` block) + 2.3 (emit `grant_amount: finalGrantAmount`) applied in this pass |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `handlePrintBill` override sends `paymentAmount: finalTotal` + `grantAmount: effectiveTotal` | Change 3.1 applied |
| `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js` | Re-baselined default-branch + override-branch tests; new non-room regression; docstring updated | Changes 4.1/4.2/4.3/4.4 applied |

---

## 3. Validation

| Gate | Result |
|------|--------|
| ESLint on all 3 files | ✅ No issues |
| `yarn test --watchAll=false` | ✅ **498/498 passed**, 34 suites, 10.658 s |
| Webpack hot-reload | ✅ Dev server compiles green |

Net delta: 497 → **498 tests** (new non-room regression added per Change 4.3).

---

## 4. Behavior change (PRINT-002 enforcement)

Room order print payload now emits two distinct money fields:

| Field | Source | Maps to receipt line |
|-------|--------|----------------------|
| `payment_amount` | `finalPaymentAmount` (food-only) | "Total" |
| `grant_amount` | `finalGrantAmount` = food + assoc + roomBalance (room) or = `payment_amount` (non-room) | "Grand Total" |

Both override branch (CollectPaymentPanel → Print Bill button) and default branch (dashboard re-print) now produce the correct split. Non-room orders remain bit-identical (both fields equal).

---

## 5. Out-of-scope / parked

Per owner directive 2026-05-17:
- `Item Total` / `Service Charge` / `Sub Total` / `CGST` / `SGST` divergence between override vs default branches — **DEFERRED** (pending separate proof + approval).
- `getItemLinePrice` consolidation — **NOT TOUCHED**.
- New `print-payload-parity.test.js` — **NOT CREATED**.

---

## 6. Owner smoke checklist (post-deploy)

Room order (e.g. #102 with food=2676, roomBalance ≈ 8834):
1. OrderEntry header pill → Print Bill: Network → `POST /order-temp-store` body:
   - `payment_amount: 2676`
   - `grant_amount: 11510`
   - `rtype: "RM"`, `payment_status: "unpaid"`, `payment_method: "pending"`
2. Dashboard OrderCard printer icon: same payload values.
3. CollectPaymentPanel → Print Bill: same payload values.
4. Printed receipts on all 3 surfaces: "Total" = 2,676; "Grand Total" = 11,510 (Item Total/SC drift still present — parked).

Non-room order: `grant_amount === payment_amount` (covered by new regression test).

---

*— End of Print Path Unification Corrective Patch — Implementation Report —*
