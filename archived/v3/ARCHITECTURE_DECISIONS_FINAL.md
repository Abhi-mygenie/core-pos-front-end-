# Document Audit Status
- Source File: v2/ARCHITECTURE_DECISIONS_FINAL.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Partially Finalized
- Confidence: High for frontend-observed behavior; Medium where backend/runtime intent is required
- Code Areas Reviewed: `frontend/src/api/transforms/orderTransform.js`, `frontend/src/components/order-entry/CollectPaymentPanel.jsx`, `frontend/src/components/order-entry/OrderEntry.jsx`, `frontend/src/components/modals/SplitBillModal.jsx`, `frontend/src/api/socket/*`, `frontend/src/contexts/*`, `frontend/src/config/firebase.js`, `frontend/public/firebase-messaging-sw.js`, `frontend/src/pages/LoadingPage.jsx`, `frontend/src/api/services/*`, `frontend/src/api/constants.js`, `frontend/craco.config.js`, `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`, `memory/BUG_TEMPLATE.md`, `v1/AD_UPDATES_PENDING.md`
- Notes: Re-audited current branch as checked out in `/app`: requested `Piyush_QA`; remote branch available/used is `piyush_QA` at commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179`. Production build succeeded with one `LoadingPage.jsx` hook dependency warning. App run was attempted; port 3000 was already occupied by an existing frontend process.

# ARCHITECTURE_DECISIONS_FINAL — v3

## Architecture Decision Summary

| S.No. | Decision ID | Description | Status | Next Step |
|---|---|---|---|---|
| 1 | AD-001 | Final total rounding rule | Partial Match | Canonical billing paths use fractional `> 0.10`; `OrderEntry` local helper still uses older diff-to-ceil logic. |
| 2 | AD-001A | Discount precision | Verified | Add as a new billing decision: percent discounts retain 2-decimal precision; final total rounding remains separate. |
| 3 | AD-002 | Remove vs update behavior for socket order events | Verified | Keep event-semantic rule. |
| 4 | AD-003 | Walk-in order definition | Verified in code / business definition not confirmed | Document inference only, not global POS policy. |
| 5 | AD-006 | `def_ord_status` / `defaultOrderStatus` usage | Verified | Keep confirm-order dependency. |
| 6 | AD-007 | Terminal order statuses in frontend logic | Verified | Keep frontend-specific wording. |
| 7 | AD-008 | Role values used for order API scoping | Verified | Keep `Waiter` vs `Manager`. |
| 8 | AD-009 | Permissions authority and frontend usage model | Verified | Keep decentralized frontend permission usage. |
| 9 | AD-013A | Service charge order-type gating | Verified, with room-branch caveat | Default collect-bill branch gates to dine-in/walk-in/room; room-with-associated-orders UI still shows SC toggle by percentage without the same visible `scApplicable` guard. |
| 10 | AD-101 | Service charge application point in billing | Verified | Post-discount SC and GST-on-SC/tip/delivery are implemented in main billing paths. |
| 11 | AD-105 | Tax consistency between collect-bill UI and printed bill | Partial Match | Collect-bill/manual/auto-print overrides align; fallback print recomputation remains. |
| 12 | AD-106 | `update-table` channel usage | Verified / stale comments contradicted | Keep active subscription; flag comments as legacy drift. |
| 13 | AD-107 | WebSocket authentication model | Implementation verified / intent not confirmed | Client sends no auth in socket handshake. |
| 14 | AD-108 | Engage-lock recovery | Partial Match | Locks are in-memory and can be released by handlers; no durable reconnect recovery exists. |
| 15 | AD-111A / AD-201 | Notification source and toast ownership | Superseded by implementation | Current ingress is Firebase Cloud Messaging/service worker; action toasts use shadcn toaster; Sonner unused. |
| 16 | AD-202 | `order_id` response-shape handling | Verified | Multiple response shapes are tolerated for prepaid place+pay. |
| 17 | AD-204 | Mock data files | Partial Match | Dead `mockOrderItems` import remains; `notePresets` are active runtime/reference data. |
| 18 | AD-206 | `handleUpdateOrder` handler | Superseded | Still wired through registry but delegates to `handleOrderDataEvent()`. |
| 19 | AD-302 | Bill print consistency with collect-bill edits | Partial Match / improved | Manual print and both auto-print flows pass live overrides; dashboard card print can still use fallback values. |
| 20 | AD-303 | Prepaid collect-bill print availability | Not confirmed as current runtime bug | Component shows Print Bill only when `hasPlacedItems`; fresh prepaid pre-place screen still cannot print manually. |
| 21 | AD-401 / AD-402 | Financial ownership by phase | Partially verified | Frontend constructs settlement/print values; backend persistence authority not confirmed. |
| 22 | AD-502 | Default state of `serviceChargeEnabled` | Partial Match | Toggle still defaults `true`. |
| 23 | AD-603 | Socket-handler test coverage | Partial / stale | `updateOrderStatus.test.js` still expects API-fetch behavior contradicted by handler. |
| 24 | AD-701 | `.env.example` contract | Not implemented | No `.env.example` found. |
| 25 | AD-703 | Backend scaffold in frontend repo | Partially verified | Backend folder exists; intent not provable. |
| 26 | AD-801 | History rewrite governance | Not confirmed from code | Governance note only. |
| 27 | AD-901 | Health-check plugin | Contradicted by current file tree | `craco.config.js` conditionally requires plugin files, but `frontend/plugins/health-check/*` is absent. |

---

## Audit Scope
This v3 file finalizes only what can be supported by the current frontend codebase and current documentation context. Backend persistence, business definitions, and production runtime reports are marked separately when not provable from static frontend code.

Status legend used below:
- **Verified** = directly supported by current code
- **Partial Match** = implemented in some paths but not globally
- **Does Not Match** = current code contradicts prior documentation
- **Superseded** = older decision text no longer describes implementation accurately
- **Not Confirmed** = not provable from frontend code alone

---

## Verified Decisions

### AD-002 — Remove vs update behavior for socket order events

**Previous Documented Understanding**
- Remove vs update is determined by event semantics, not terminal status alone.

**What Code Actually Does**
- `handleOrderDataEvent()` removes only when transformed status is `cancelled` or `paid` and event is `update-order-source` or `update-order-paid`.
- `update-order`, `update-order-target`, and `update-item-status` update in place.

**Status**
- Verified

**Impact on Final Documentation**
- This remains a code-backed frontend behavior.

**Required V3 Update**
- Keep the event-specific remove/update rule and avoid backend-global claims.

---

### AD-006 — `def_ord_status` / `defaultOrderStatus` usage

**Previous Documented Understanding**
- Default order status comes from profile data and is used in confirm-order flow.

**What Code Actually Does**
- `profileTransform.js` maps `api.def_ord_status` to `restaurant.defaultOrderStatus`.
- `RestaurantContext` defaults missing value to `'paid'`.
- `DashboardPage` passes `defaultOrderStatus` into `confirmOrder()`.

**Status**
- Verified

**Impact on Final Documentation**
- This is active behavior, but the `'paid'` fallback semantics remain risky.

**Required V3 Update**
- Keep verified usage and track fallback risk separately.

---

### AD-008 — Role values used for order API scoping

**Previous Documented Understanding**
- Frontend normalizes order role scope to `Waiter` or `Manager`.

**What Code Actually Does**
- `getOrderRoleParam()` returns `Waiter` only when `userRole.toLowerCase() === 'waiter'`; all other roles become `Manager`.
- Used by `LoadingPage` and `useRefreshAllData` before running-orders calls.

**Status**
- Verified

**Impact on Final Documentation**
- Frontend behavior is clear; backend interpretation is not expanded.

**Required V3 Update**
- Keep two-value mapping as frontend-specific.

---

### AD-101 — Service charge application point in billing

**Previous Documented Understanding**
- Service charge should apply after discount.

**What Code Actually Does**
- `CollectPaymentPanel.jsx` computes `serviceCharge` from `subtotalAfterDiscount`.
- `calcOrderTotals()` uses `postDiscount` for service charge.
- `buildBillPrintPayload()` fallback branch computes service charge from `computedSubtotal - overrides.discountAmount` when caller does not provide `serviceChargeAmount`.
- GST is extended over post-discount item GST plus service charge, tip, and delivery charge using average GST rate.

**Status**
- Verified

**Impact on Final Documentation**
- AD-101 is implemented in the main UI, place+pay transform, and bill-print fallback math.

**Required V3 Update**
- Keep verified. Include GST-on-SC/tip/delivery implementation learning.

---

### AD-001A — Discount precision is two-decimal before final total rounding

**Previous Documented Understanding**
- V2 did not separately capture BUG-020; AD-001 covered only final total round-off.

**What Code Actually Does**
- `CollectPaymentPanel.jsx` computes preset/manual percent/coupon percent discounts with 2-decimal precision using `Math.round(itemTotal * pct) / 100`.
- Final grand total rounding still happens later via AD-001 logic.

**Status**
- Verified

**Impact on Final Documentation**
- Discount precision is a separate billing invariant from final total round-off.

**Required V3 Update**
- Add AD-001A: discount components must not be integer-rounded; final round-off applies only at the end.

---

### AD-021 — Runtime complimentary print override

**Previous Documented Understanding**
- V2 did not include BUG-021 implementation learning.

**What Code Actually Does**
- `buildBillPrintPayload()` accepts `overrides.runtimeComplimentaryFoodIds`.
- The predicate matches against incoming `rawOrderDetails[].id` and `rawOrderDetails[].food_details.id`, plus catalog and raw runtime complimentary flags.
- `CollectPaymentPanel.handlePrintBill()` forwards this list for manual print.
- `OrderEntry` collect-bill auto-print forwards the same list for postpaid auto-print. Prepaid auto-print currently does not include this override list.

**Status**
- Partially Verified

**Impact on Final Documentation**
- Runtime complimentary print zeroing is frontend-authoritative for manual and postpaid collect-bill auto-print paths; prepaid path parity is not fully confirmed from code.

**Required V3 Update**
- Add as implementation learning with exact incoming-field names; mark prepaid auto-print override parity as partial.

---

## Verified but Needs Clarification for Intent

### AD-003 — Walk-in order definition

**Previous Documented Understanding**
- Walk-in means dine-in with `table_id = 0`.

**What Code Actually Does**
- `fromAPI.order()` sets `isWalkIn` when `!api.table_id || api.table_id === 0`.
- `normalizeOrderType()` maps POS/dinein/WalkIn into `dineIn`.
- Dashboard separates `walkInOrders` from `tableOrders` by `isWalkIn`.

**Status**
- Verified in code / Not Confirmed as business definition

**Impact on Final Documentation**
- Safe only as frontend inference logic.

**Required V3 Update**
- Do not state this as backend or product-wide canonical definition.

---

### AD-107 — WebSocket authentication model

**Previous Documented Understanding**
- Client socket handshake is unauthenticated.

**What Code Actually Does**
- `socketService.connect()` constructs Socket.IO options without `auth`, token, query, or extra headers.
- `SOCKET_CONFIG.URL` comes only from `REACT_APP_SOCKET_URL`.

**Status**
- Verified as implementation / Not Confirmed as intentional architecture

**Impact on Final Documentation**
- Security intent and backend-side protections cannot be proven from frontend code.

**Required V3 Update**
- Keep implementation fact and request backend/security clarification.

---

### AD-401 / AD-402 — Financial ownership across placement, print, and settlement phases

**Previous Documented Understanding**
- Frontend values become settlement/print values; backend authority was implied in older docs.

**What Code Actually Does**
- Frontend computes and submits totals for place-order, prepaid place+pay, existing collect-bill, room transfer, and bill print.
- `collectBillExisting()` sends frontend-provided final totals, discounts, tip, service charge, delivery charge, and item detail carve-outs.
- `buildBillPrintPayload()` consumes frontend overrides when available.

**Status**
- Partially Verified / Backend authority not confirmed

**Impact on Final Documentation**
- Frontend payload ownership is visible; backend persistence/validation authority is not.

**Required V3 Update**
- Document observed frontend construction only.

---

## Superseded or Corrected Decisions

### AD-001 — Final total rounding rule

**Previous Documented Understanding**
- V2 stated canonical rule: fractional part `> 0.10` rounds up, otherwise down; it also noted `OrderEntry` inconsistency.

**What Code Actually Does**
- `CollectPaymentPanel.jsx` and `calcOrderTotals()` use fractional-part logic.
- `OrderEntry.jsx` local `applyRoundOff()` still uses distance-to-ceiling: `diff >= 0.10 ? ceil : floor`.

**Status**
- Partial Match

**Impact on Final Documentation**
- Canonical billing/payment paths use the corrected rule, but pre-placement local display/add-on totals may drift.

**Required V3 Update**
- Keep AD-001 as partial until `OrderEntry.applyRoundOff()` is aligned.

---

### AD-105 — Tax consistency between collect-bill UI and printed bill

**Previous Documented Understanding**
- Collect-bill values should be reused in print/payment paths.

**What Code Actually Does**
- Manual Print Bill passes UI `gstTax`, service charge, discount, tip, delivery, and complimentary overrides.
- Prepaid auto-print passes live billing overrides but does not pass `runtimeComplimentaryFoodIds`.
- Postpaid collect-bill auto-print now exists and passes live overrides including `runtimeComplimentaryFoodIds`.
- Dashboard/table-card bill printing can still call `printOrder()` without collect-bill overrides.

**Status**
- Partial Match / improved since v2

**Impact on Final Documentation**
- Stronger than v2 for postpaid auto-print, but not universal.

**Required V3 Update**
- Mark collect-bill initiated paths as aligned; keep fallback/no-override paths partial.

---

### AD-111A / AD-201 — Notification source-of-truth and toast ownership

**Previous Documented Understanding**
- V2 corrected notification ingress to FCM and action toast ownership to shadcn toaster.

**What Code Actually Does**
- `NotificationContext` uses `onForegroundMessage()` from Firebase and service-worker `BACKGROUND_NOTIFICATION` messages.
- `NotificationTester` is mounted through `SettingsPanel` and calls `simulateNotification()`.
- `App.js` mounts shadcn `Toaster`; `components/ui/sonner.jsx` exists but is not used.

**Status**
- Superseded by implementation / Verified

**Impact on Final Documentation**
- Socket-only notification source is incorrect.

**Required V3 Update**
- Keep FCM/service-worker + manual simulation path.

---

### AD-206 — Legacy `handleUpdateOrder` handler

**Previous Documented Understanding**
- Legacy handler was described as dead.

**What Code Actually Does**
- `handleUpdateOrder()` still exists and delegates to `handleOrderDataEvent()`.
- `getHandler()` registry maps `SOCKET_EVENTS.UPDATE_ORDER` to `handleUpdateOrder`, while `useSocketEvents()` directly calls `handleOrderDataEvent()` for the same event.

**Status**
- Superseded

**Impact on Final Documentation**
- “Dead” is inaccurate; “legacy wrapper still wired in one registry path” is accurate.

**Required V3 Update**
- Preserve as legacy wrapper, not removable without registry audit.

---

### AD-901 — Health-check plugin

**Previous Documented Understanding**
- V2 said health-check plugin files existed and their purpose was resolved.

**What Code Actually Does**
- `frontend/plugins/health-check/*` was not found in current file tree.
- `craco.config.js` still conditionally requires `./plugins/health-check/webpack-health-plugin` and `./plugins/health-check/health-endpoints` when `ENABLE_HEALTH_CHECK === "true"`.
- Build succeeds only because the flag is not enabled in current environment.

**Status**
- Does Not Match / Contradicted by current file tree

**Impact on Final Documentation**
- Health-check plugin cannot be documented as present implementation.

**Required V3 Update**
- Mark as stale conditional config and setup risk if enabled.

---

## Decisions Not Confirmed From Code

### AD-303 — Prepaid order bill-print availability on collect-bill page

**Previous Documented Understanding**
- V2 said current component code does not exclude prepaid from print-bill visibility.

**What Code Actually Does**
- `CollectPaymentPanel` renders Print Bill only when `hasPlacedItems && onPrintBill`.
- For a fresh prepaid pre-place flow, `hasPlacedItems` is false before the place-order call.
- `memory/BUG_TEMPLATE.md` marks BUG-005 closed as not a business requirement, while older detailed notes still describe the static limitation.

**Status**
- Not confirmed as a current bug; code confirms a pre-place limitation

**Impact on Final Documentation**
- Do not call it a required gap unless product reopens it.

**Required V3 Update**
- Document current behavior: fresh prepaid pre-place manual print is not available; current business status says no AD change required.

---

### AD-701 — `.env.example` contract

**Previous Documented Understanding**
- Repo should provide `.env.example`.

**What Code Actually Does**
- No `.env.example` was found.
- Code requires several env variables: `REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`, Firebase variables, CRM variables, optional Google Maps key, and optional `ENABLE_HEALTH_CHECK`.

**Status**
- Not Implemented

**Impact on Final Documentation**
- Setup contract remains undocumented in repo files.

**Required V3 Update**
- Keep unresolved.

---

## Final Reconciled Summary

### Verified from code
- CRA/CRACO React frontend builds successfully at commit `32d91748...` with one `LoadingPage.jsx` hook warning.
- Main billing paths implement post-discount service charge, GST on service charge/tip/delivery, and fractional final rounding.
- Discount percent calculations now retain 2-decimal precision.
- Manual bill print and postpaid collect-bill auto-print pass live billing overrides; postpaid auto-print is now implemented.
- Runtime complimentary print zeroing uses incoming `rawOrderDetails[].id` and `food_details.id` override matching.
- Delivery `delivery_address` is always emitted as object for delivery and `null` for non-delivery on place-order paths.
- Notification ingress is FCM/service-worker based; shadcn toaster is active; Sonner is inactive.
- `update-table` channel remains active despite stale comments.

### Partially implemented / still mixed
- Final rounding is not unified because `OrderEntry.applyRoundOff()` still uses older logic.
- Tax/print consistency is strong in override paths, but fallback dashboard bill print can recompute.
- Runtime complimentary override is not included in prepaid auto-print override object.
- `serviceChargeEnabled` still defaults ON.
- Health-check config references missing plugin files when enabled.

### Not confirmed from frontend code alone
- WebSocket security intent and backend-side auth enforcement.
- Backend persistence/authority for settlement values and `delivery_address`.
- Product-wide business definitions for walk-in and default confirm status.
- Full mobile/touch/keyboard support.

## What Changed From v2
- Re-anchored audit from commit `19fc8ff...` to current commit `32d91748...`.
- Corrected health-check plugin status from “present/resolved” to “missing files with stale conditional config”.
- Absorbed newer implementation learnings from BUG-020, BUG-021, BUG-022, delivery charge mapping, split bill, and postpaid collect-bill auto-print.
- Preserved v2 partial statuses where code still contains mixed paths: rounding, fallback print recomputation, service-charge default, stale socket tests, stale comments.