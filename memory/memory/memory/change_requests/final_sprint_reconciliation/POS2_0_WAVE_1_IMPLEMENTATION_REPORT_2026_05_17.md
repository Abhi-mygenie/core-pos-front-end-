# POS2.0 Wave 1 Implementation Report — 2026-05-17

## 1. Purpose

This report covers implementation of approved Wave 1 bugs only. No other bugs were touched.

---

## 2. Repo / Commit

| Field | Value |
|---|---|
| Repo URL | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `17-may-planner` |
| Commit before changes | `bc16bc3` |
| Working tree status | 7 files modified (see §7) |

---

## 3. Owner Approval

| Bug | Approved? | Notes |
|---|---|---|
| BUG-062 | Yes | Approved per owner message |
| BUG-073 | Yes | Approved per owner message |
| BUG-066 | Yes | Approved per owner message |
| BUG-067 | Yes | Approved per owner message |
| BUG-079 | Yes | Approved per owner message |
| BUG-078 | Yes | Approved per owner message |
| BUG-072 | Yes — no code change | Owner approved as already-implemented. QA verification only. |

---

## 4. Inputs Read

All documents listed in the Wave 1 Owner Approval Plan §3 were read prior to implementation. Additionally:
- `POS2_0_WAVE_1_CODE_DIFF_PREVIEW_2026_05_17.md` — the exact diff preview approved by owner before code changes.

---

## 5. Bugs Implemented

| Bug | Status | Files Changed | Summary | Notes |
|---|---|---|---|---|
| BUG-062 | implemented_ready_for_qa | `CollectPaymentPanel.jsx` | Added `(orderType === 'dineIn' \|\| orderType === 'walkIn')` to To Room render gate | 1 condition added |
| BUG-073 | implemented_ready_for_qa | `CartPanel.jsx` | Added content-presence check to 2 customization render gates | 2 lines changed |
| BUG-066 | implemented_ready_for_qa | `TransferFoodModal.jsx` | Added `!o.isRoom` to food transfer destination filter + comment | 3 lines changed |
| BUG-067 | implemented_ready_for_qa | `StatusConfigPage.jsx` | Added disabled/tooltip/label logic to station toggle when no stations | ~10 lines changed |
| BUG-079 | implemented_ready_for_qa | `useOrderPollingReconciliation.js` | Changed `REMOVAL_MISS_THRESHOLD` from 2 to 1 + updated 3 comments | 3 lines changed |
| BUG-078 | implemented_ready_for_qa | `customerService.js`, `CustomerModal.jsx` | Added timeout detection + typed throw + toast in caller | ~25 lines changed |
| BUG-072 | already_implemented_qa_verification_only | None | orderNote (L426-437) and item.notes (L526-530) already rendered on OrderCard. table_note/room_note don't exist in data model. No backend fields invented. | 0 lines changed |

---

## 6. Per-Bug Implementation Details

### BUG-062 — Hide To Room for Takeaway/Delivery

- **Issue summary:** To Room transfer button visible for takeaway/delivery orders on Collect Payment panel.
- **Business rule protected:** No frozen rule conflict. Room transfer is logically only for dine-in/walk-in.
- **Files changed:** `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- **Exact change:** Line 1953 render gate extended from `{!isRoom && hasRooms && hasPlacedItems && (` to `{!isRoom && hasRooms && hasPlacedItems && (orderType === 'dineIn' || orderType === 'walkIn') && (`. Comment updated.
- **Validation:** `yarn build` succeeded. `CollectPaymentPanel.deliveryLock.test.jsx` and `CollectPaymentPanel.holdMode.test.jsx` both PASS.
- **QA notes:** Test with takeaway, delivery, dine-in, walk-in, and room orders.
- **Known caveats:** None.

### BUG-073 — Empty Customization Wrapper Fix

- **Issue summary:** Empty green-tinted `<div>` renders in cart when item has `customizations` object but no size/variants/addons.
- **Business rule protected:** No frozen rule affected. Display-only fix.
- **Files changed:** `frontend/src/components/order-entry/CartPanel.jsx`
- **Exact change:** Two render gates modified:
  - Line 65 (PlacedItemRow): `{item.customizations && !isCancelled && (` → added `(item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) &&`
  - Line 192 (NewItemRow): `{item.customizations && (` → added same sub-check
- **Validation:** `yarn build` succeeded. No CartPanel-specific tests exist; visual QA required.
- **QA notes:** Test with items that have empty customizations, partial customizations, and full customizations.
- **Known caveats:** None.

### BUG-066 — Food Transfer Exclude Rooms

- **Issue summary:** Room orders (which have `orderType === 'dineIn'`) appeared as valid food transfer destinations.
- **Business rule protected:** Module 5 (Rooms) boundary preserved. Room orders are not valid food transfer targets.
- **Files changed:** `frontend/src/components/order-entry/TransferFoodModal.jsx`
- **Exact change:** Filter at line 19-20 extended with `&& !o.isRoom`. Comment added.
- **Validation:** `yarn build` succeeded. No TransferFoodModal-specific tests exist; visual QA required.
- **QA notes:** Test food transfer modal with rooms present — rooms should NOT appear in list.
- **Known caveats:** None.

### BUG-067 — Station Toggle Disabled When No Stations

- **Issue summary:** Station View toggle always clickable even when restaurant has no configured stations.
- **Business rule protected:** BOOT-002 (station progress visible) preserved. No frozen rule conflict.
- **Files changed:** `frontend/src/pages/StatusConfigPage.jsx`
- **Exact change:** Toggle button (lines 767-780) now checks `availableStations.length === 0` for: `disabled` prop, `onClick={undefined}`, `opacity-50 cursor-not-allowed` class, tooltip text, "No Stations" label, gray background.
- **Validation:** `yarn build` succeeded.
- **QA notes:** Test with a restaurant that has 0 stations (toggle disabled) and one with stations (toggle works).
- **Known caveats:** None.

### BUG-079 — Polling 1-Miss Removal

- **Issue summary:** Orders required 2 missed polls (~120s) to be removed from dashboard. Owner wants 1 miss (~60s).
- **Business rule protected:** Frozen POLL-001 (60s interval) and POLL-004 (open-order skip) preserved. Threshold was in pending-freeze POLL-002.
- **Files changed:** `frontend/src/hooks/useOrderPollingReconciliation.js`
- **Exact change:** `REMOVAL_MISS_THRESHOLD = 2` → `1`. Three comments updated to reflect "one miss" instead of "two".
- **Validation:** `yarn build` succeeded. The comparison logic at line 200 (`nextMisses >= REMOVAL_MISS_THRESHOLD`) is unchanged.
- **QA notes:** Remove an order server-side → should disappear after ~60s. Hold orders and engaged orders must still be protected.
- **Known caveats:** Owner accepted trade-off: faster removal means momentary false-positive if a single poll response is delayed. Socket re-add compensates immediately.

### BUG-078 — CRM Timeout Toast

- **Issue summary:** CRM timeout silently returned null — cashier got no feedback that CRM was unreachable.
- **Business rule protected:** No frozen rule conflict. Pending-freeze PAY-009 captures this direction.
- **Files changed:** `frontend/src/api/services/customerService.js`, `frontend/src/components/order-entry/CustomerModal.jsx`
- **Exact change:**
  - `customerService.js` (lookupCustomer): Added timeout detection (`err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK'`). Timeout → throws typed error with `.type = 'CRM_TIMEOUT'`. Non-timeout errors → still return null.
  - `CustomerModal.jsx`: Added `import { useToast }`. Added `const { toast } = useToast()` hook. Wrapped `lookupCustomer` call in inner try/catch. On `CRM_TIMEOUT` → shows destructive toast (5s auto-dismiss) + proceeds with create. On other errors → re-throws to outer catch.
- **Validation:** `yarn build` succeeded. `lookupCustomer` has exactly 1 caller (CustomerModal L74) — verified by grep.
- **QA notes:** Simulate CRM timeout (disconnect CRM or slow network) → toast should appear → cashier can still save customer.
- **Known caveats:** `lookupCustomer` now can throw (previously never threw). Single caller handles it. Future callers must also handle.

### BUG-072 — Notes on Order Card (No Code Change)

- **Issue summary:** Owner reported room/table/item notes not showing on order card.
- **Business rule protected:** No frozen rule affected.
- **Files changed:** None.
- **Exact finding:** `OrderCard.jsx` already renders `order.orderNote` (L426-437) and `item.notes` (L526-530). `table_note` and `room_note` do not exist in the frontend data model (`orderTransform.js` has zero matches for these fields). Per master plan audit correction: "Do not invent backend fields."
- **Validation:** Code inspection only — no change made.
- **QA notes:** QA should verify that orderNote and item notes are visible on the card. If owner still sees missing notes, it's a backend feature request.
- **Known caveats:** If backend later adds `table_note`/`room_note` fields, frontend will need a follow-up to map and display them.

---

## 7. Files Changed

| File | Change Summary | Bugs Covered |
|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | To Room render gate: added orderType condition | BUG-062 |
| `frontend/src/components/order-entry/CartPanel.jsx` | 2 customization render gates: added content-presence check | BUG-073 |
| `frontend/src/components/order-entry/TransferFoodModal.jsx` | Food transfer filter: added `!o.isRoom` + comment | BUG-066 |
| `frontend/src/pages/StatusConfigPage.jsx` | Station toggle: disabled when no stations | BUG-067 |
| `frontend/src/hooks/useOrderPollingReconciliation.js` | Threshold constant: 2 → 1 + 3 comment updates | BUG-079 |
| `frontend/src/api/services/customerService.js` | lookupCustomer: timeout detection + typed throw | BUG-078 |
| `frontend/src/components/order-entry/CustomerModal.jsx` | useToast import + inner try/catch + toast on CRM timeout | BUG-078 |

**Total: 7 files, +47 lines, -16 lines.**

---

## 8. Tests / Validation Run

| Command | Result | Notes |
|---|---|---|
| `yarn install --frozen-lockfile` | Success | Dependencies installed from lockfile |
| `CI=true yarn test --watchAll=false` | 28 pass / 6 fail (457 tests pass / 3 fail) | All 6 failures are **pre-existing** (missing `REACT_APP_API_BASE_URL` env var + socket test drift). Zero Wave 1 regressions. |
| `CI=true yarn build` | Success | Production build completed without errors |

**Wave 1-relevant test suites that PASSED:**
- `CollectPaymentPanel.deliveryLock.test.jsx` — PASS (BUG-062 file)
- `CollectPaymentPanel.holdMode.test.jsx` — PASS (BUG-062 file)
- `qa_subtotal_delivery_validation.test.js` — PASS (financial math)
- All orderTransform tests — PASS
- All integration tests — PASS

---

## 9. Regression Risks

| Area | Risk | Mitigation |
|---|---|---|
| Payment flow | None — no financial/payload changes | Build + existing tests pass |
| Print flow | None — no print-related changes | Not touched |
| Room flow | Low — BUG-066 excludes rooms from food transfer destinations only | Existing room order/payment/check-in flows untouched |
| Socket/polling | Low — BUG-079 constant change only | Hold/engaged protections verified unchanged |
| CRM integration | Low-Medium — BUG-078 adds throw path in lookupCustomer | Single caller handles it; non-timeout paths unchanged |
| Dashboard cards | None — BUG-072 no code change | Already renders available note fields |

---

## 10. Items Not Implemented

| Bug | Reason |
|---|---|
| BUG-072 | Already implemented in current code. No code change made. QA verification only. |
| All non-Wave-1 bugs | Not in scope per owner approval. |

---

## 11. Final Status

`wave_1_implementation_complete_ready_for_qa`

- 6 bugs implemented (BUG-062, BUG-073, BUG-066, BUG-067, BUG-079, BUG-078)
- 1 bug confirmed already-implemented (BUG-072) — QA verification only
- `yarn build` succeeded
- `yarn test` — 28/34 suites pass, all 6 failures pre-existing
- `/app/memory/final/` NOT updated
- Pending freeze docs NOT updated
- No bugs marked QA-passed or closed
- No deployment
