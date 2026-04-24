# Document Audit Status
- Source File: New v3 comparison summary
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Finalized
- Confidence: High for document/code comparison; Medium for backend/product-dependent implications
- Code Areas Reviewed: `v2/*`, `v1/AD_UPDATES_PENDING.md`, `memory/BUG_TEMPLATE.md`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/components/order-entry/*`, `frontend/src/components/modals/SplitBillModal.jsx`, `frontend/src/api/socket/*`, `frontend/src/contexts/*`, `frontend/craco.config.js`, `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`
- Notes: This document compares v2 documentation to v3 documentation and highlights the exact reconciliation changes driven by current code.

# COMPARISON_SUMMARY — v2 to v3

## Purpose
This file summarizes what changed between the v2 documentation baseline and the v3 code-verified baseline.

## Baseline Comparison

| Area | v2 Understanding | v3 Code-Verified Update | Status Change |
|---|---|---|---|
| Branch / commit | `Piyush_QA`, commit `19fc8ff...` | Current checkout is lowercase `piyush_QA`, commit `32d91748...` | Updated traceability |
| Build | Build succeeded with warning | Build still succeeds with same `LoadingPage.jsx` hook warning | Confirmed current |
| Run | Frontend running under supervisor/port | `yarn start` attempt found port 3000 already occupied | Updated run note |
| Health-check plugin | Plugin purpose resolved from files | Plugin folder absent; CRACO conditionally requires missing files | Downgraded / contradicted |
| Service charge | Post-discount SC verified | Still verified | No downgrade |
| Discount precision | Not explicitly finalized | 2-decimal percent discount precision verified | New decision |
| Rounding | Partial due `OrderEntry` helper | Still partial | No change; retained risk |
| Tax / print consistency | Partial | Still partial, but postpaid auto-print path improved | Refined |
| Postpaid collect-bill auto-print | Not captured as implemented in v2 | Implemented when `settings.autoBill` is enabled | Upgraded |
| Runtime complimentary print | Not captured in v2 | Manual and postpaid auto-print support override IDs; prepaid parity partial | New partial decision |
| Split bill | Not in v2 final docs | Uses collect-bill `grandTotal` and proportional allocation | New verified learning |
| Delivery address | Pending backend notes in v1 | Frontend emits object/null; backend persistence unconfirmed | Added risk/gap |
| Cancelled item display | Not in v2 final docs | Collect-bill item lists show cancelled rows struck-through/gray | New verified learning |
| Socket comments | Stale comments noted | Still stale | Retained |
| Socket tests | Stale test noted | Still stale | Retained |
| Mock data | Partial | Still partial | Retained |

---

## Major v3 Corrections

### 1. Health-check plugin is not present in current repo

**Previous Documented Understanding**
- v2 described `plugins/health-check/health-endpoints.js` and `webpack-health-plugin.js` as existing and resolved.

**What Code Actually Does**
- `frontend/plugins/health-check/*` is absent.
- `frontend/craco.config.js` still conditionally imports those files when `ENABLE_HEALTH_CHECK=true`.

**Status**
- Does Not Match / Contradicted by code tree

**Impact on Final Documentation**
- Health-check implementation cannot be trusted as documented in v2.

**Required V3 Update**
- Added risk and gap for missing plugin files behind enabled config.

---

### 2. Postpaid collect-bill auto-print is now code-visible

**Previous Documented Understanding**
- v2 focused on manual/collect-bill print overrides and did not finalize postpaid collect-bill auto-print as implemented.

**What Code Actually Does**
- Existing-order collect-bill path posts `order-bill-payment`, then calls `printOrder()` when `settings.autoBill` is ON.
- It passes live override values from `paymentData`.

**Status**
- Verified from frontend code

**Impact on Final Documentation**
- Older “new-order-only auto-print” wording is superseded.

**Required V3 Update**
- Mark postpaid collect-bill auto-print frontend path as implemented.

---

### 3. Discount precision is now an architecture-relevant rule

**Previous Documented Understanding**
- v2 covered final grand-total rounding, but not discount component precision.

**What Code Actually Does**
- Preset/manual/coupon percent discounts are computed to 2 decimal places.

**Status**
- Verified

**Impact on Final Documentation**
- Discount precision must be documented separately from final total round-off.

**Required V3 Update**
- Added AD-001A.

---

### 4. Runtime complimentary print support has exact incoming-field constraints

**Previous Documented Understanding**
- v2 did not include BUG-021.

**What Code Actually Does**
- `buildBillPrintPayload()` reads `overrides.runtimeComplimentaryFoodIds` and matches against `rawOrderDetails[].id` and `rawOrderDetails[].food_details.id`.
- Manual print and postpaid collect-bill auto-print forward IDs.
- Prepaid auto-print does not visibly forward runtime complimentary IDs.

**Status**
- Partially Verified

**Impact on Final Documentation**
- Field names are important to avoid regression; implementation is not universal across all print paths.

**Required V3 Update**
- Added partial decision/risk.

---

### 5. Delivery-address frontend contract is implemented but backend persistence remains external

**Previous Documented Understanding**
- v1 pending notes described frontend fix and backend gap.

**What Code Actually Does**
- `placeOrder` and `placeOrderWithPayment` emit `delivery_address` object for delivery orders and `null` otherwise.
- `fromAPI.order()` reads `api.delivery_address` into `deliveryAddress`.

**Status**
- Frontend verified / backend not confirmed

**Impact on Final Documentation**
- Docs must not imply persistence is fixed.

**Required V3 Update**
- Added backend clarification and risk.

---

## Items Retained From v2 Without Material Change

### Rounding inconsistency
- `CollectPaymentPanel` and `calcOrderTotals` use fractional `> 0.10`.
- `OrderEntry.applyRoundOff()` still uses old diff-to-ceiling logic.
- Status remains partial.

### Stale socket comments
- Comments still claim `update-table` channel was removed.
- Code still subscribes to and handles it.
- Status remains mismatch.

### Stale socket tests
- `updateOrderStatus.test.js` still expects API-fetch fallback.
- Handler requires socket payload.
- Status remains risk.

### Undefined `CLEAR_BILL`
- `paymentService.collectPayment()` still references missing endpoint key.
- Status remains critical risk.

### Service-charge default ON
- `serviceChargeEnabled` still initializes as `true`.
- Status remains partial/unresolved.

---

## v3 Document Set Created
- `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/v3/DOC_VS_CODE_GAP.md`
- `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md`
- `/app/v3/RISK_REGISTER.md`
- `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md`
- `/app/v3/COMPARISON_SUMMARY.md`

## Final Comparison Verdict
v3 is a stricter and more current baseline than v2 because it:
- uses the current commit and build result,
- corrects at least one v2 over-confirmation (`health-check` plugin),
- absorbs verified implementation changes after v2,
- preserves unresolved risks instead of over-closing them,
- and explicitly separates frontend facts from backend/product assumptions.