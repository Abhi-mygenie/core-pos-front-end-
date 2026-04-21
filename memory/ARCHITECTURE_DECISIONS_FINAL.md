# ARCHITECTURE_DECISIONS_FINAL

> Validation note (2026-04-19): reviewed against current codebase at `main` / `b1ebb9e`.
> These entries are a mix of code-backed observations, decision records, and business/runtime clarifications.
> Unless explicitly tagged, they should **not** be assumed to be fully implemented in code.
>
> Label guide for implementation agents:
> - `[CONFIRMED FROM CODE]` = directly visible in current code
> - `[DECISION ONLY - NOT IMPLEMENTED]` = decision exists, code does not yet match
> - `[NEEDS BUSINESS CONFIRMATION]` = code shows behavior, but intent/rule is external
> - `[NOT VERIFIED]` = claim includes runtime/business evidence not provable from static code

## AD-101
- Topic: Service charge application point in billing
- Decision: Service charge must be calculated on the post-discount subtotal, after all order-level discounts are applied. Billing order is: item total → discounts → service charge → tip.
- Based on: Code review of `frontend/src/components/order-entry/CollectPaymentPanel.jsx`, where current logic calculates service charge from gross `itemTotal`, plus validated business clarification from runtime screenshots/user flow showing discounts are applied during billing.
- Impact: Prevents overcharging when both discount and service charge are present; aligns collect-bill UI, payment payloads, and bill printing with intended business behavior.
- Risk: Current frontend logic likely overstates totals in discount+service-charge scenarios until implementation is aligned; tax/service-charge dependent values may also need recalculation for consistency.
- Validation: [DECISION ONLY - NOT IMPLEMENTED] Current code still computes service charge from pre-discount `itemTotal` in `CollectPaymentPanel.jsx`.

## AD-102
- Topic: Socket event handling when `payload.orders` is missing
- Decision: Frontend must not use GET fallback when a socket order event arrives without `payload.orders`. It must fail fast and surface/log this as a backend contract issue.
- Based on: Code review of `frontend/src/api/socket/socketHandlers.js`, where current handlers require `payload.orders`, plus product/architecture direction that malformed socket payloads should be visible immediately in production rather than masked by recovery.
- Impact: Makes backend/socket contract failures immediately observable; avoids normalizing incomplete socket events as acceptable behavior.
- Risk: UI can remain stale after a malformed socket event until another valid update or refresh occurs; stronger operational monitoring is required.
- Validation: [CONFIRMED FROM CODE] for current fail-fast implementation. [NEEDS BUSINESS CONFIRMATION] whether this is the intended long-term contract.

## AD-002
- Topic: Remove vs update behavior for socket order events
- Decision: Remove vs update is governed by backend socket event semantics, not terminal status alone. `update-order` and `update-order-target` are non-terminal update-only channels. Order removal applies only on the relevant terminal/status channels where backend emits terminal states.
- Based on: Code review of `frontend/src/api/socket/socketHandlers.js` plus confirmed backend contract clarification that terminal statuses will not be emitted on `update-order` or `update-order-target`.
- Impact: Preserves current event-specific branching and aligns frontend behavior with intended backend channel semantics.
- Risk: If backend ever emits terminal states on non-terminal channels, frontend behavior will become incorrect.
- Validation: [CONFIRMED FROM CODE] for current branching behavior. [NEEDS BUSINESS CONFIRMATION] for the backend event-semantics contract.

## AD-107
- Topic: WebSocket authentication model
- Decision: WebSocket is intentionally unauthenticated. Backend trusts channel and event boundaries for access control, so the frontend socket connection does not require an explicit auth handshake.
- Based on: Code review of `frontend/src/api/socket/socketService.js`, which sends no explicit socket credential, plus confirmed architecture direction that backend channel/event boundaries are the intended trust boundary.
- Impact: Keeps current frontend socket connection flow unchanged and aligned with intended backend design.
- Risk: Security depends entirely on backend channel isolation and event-boundary enforcement; overly broad channel access would create a security gap.
- Validation: [CONFIRMED FROM CODE] only that the frontend passes no explicit auth/query/header handshake fields. [NEEDS BUSINESS CONFIRMATION] whether this is intentionally unauthenticated architecture.

## AD-108
- Topic: Engage-lock recovery after reload or reconnect
- Decision: Engage locks are ephemeral UI state only. On reload or reconnect, frontend must rebuild from fresh context/order-table data rather than recover locks independently.
- Based on: Code review showing in-memory engage state with no durable recovery path, plus confirmed product behavior that after reload all orders come from fresh context.
- Impact: Simplifies reconnect behavior and makes fresh context rehydration the only source of truth after reload.
- Risk: Temporary local lock hints are lost on reload, which is accepted because fresh context is authoritative.
- Validation: [CONFIRMED FROM CODE] for ephemeral in-memory engage state. [NEEDS BUSINESS CONFIRMATION] whether that loss on reload is intentionally accepted.

## AD-202
- Topic: `order_id` response-shape handling for place-order related flows
- Decision: Existing frontend code tolerates multiple `order_id` response shapes, and those shapes map to different clarified contexts: `res.data.order_id` is the single-order create response, `res.data.data.order_id` appears in reload/running-order-loaded context, and `res.data.new_order_ids[0]` is split-order specific.
- Based on: Code review of `frontend/src/components/order-entry/OrderEntry.jsx` showing multi-shape capture, plus validated behavioral clarification distinguishing single-order, reload/running-order, and split-order contexts.
- Impact: Clarifies why current tolerant capture exists and prevents misclassifying all three shapes as the same business response contract.
- Risk: Current capture logic still mixes multiple contexts in one place, so correctness depends on backend behavior remaining stable.
- Validation: [CONFIRMED FROM CODE] for tolerant multi-shape capture. [NEEDS BUSINESS CONFIRMATION] for the claimed semantic meaning of each shape.

## AD-009
- Topic: Permissions authority and frontend usage model
- Decision: Backend is authoritative for permissions. Frontend must keep a documented allowlist for UI usage, and all permissions used in UI flows must be explicitly checked and tested.
- Based on: Code review showing frontend consumes backend-provided permission strings without an authoritative frontend catalog, plus confirmed architecture direction for backend authority with frontend auditability.
- Impact: Makes permission usage in the UI auditable and testable while preserving backend as the source of truth.
- Risk: Any frontend permission usage outside the documented allowlist can create inconsistent behavior and coverage gaps.

## AD-105
- Topic: Tax consistency between collect-bill UI and printed bill
- Decision: The collect-bill UI values shown at settlement time are the authoritative billing values. Printed bill tax must match those same collect-bill UI values, and print-only tax recalculation that diverges from the collect-bill screen must not happen.
- Based on: Code review of `frontend/src/components/order-entry/CollectPaymentPanel.jsx` showing separate UI and print tax paths, plus confirmed runtime/business clarification that billing adjustments are done at collect-bill time and the UI shows the live final page values.
- Impact: Ensures cashier-visible billing values and printed bill values stay aligned at settlement time.
- Risk: Current code likely allows UI-vs-print tax divergence until implementation is aligned.
- Validation: [DECISION ONLY - PARTIALLY IMPLEMENTED] Code still contains separate UI tax and print-tax paths.

## AD-106
- Topic: `update-table` channel usage
- Decision: The `update-table` channel is active and used in production flow. For new table orders, backend emits events like `['update-table', tableId, restaurantId, 'engage']`. Any code comments claiming this channel was removed are stale and incorrect.
- Based on: Code review of active table-channel subscription in `frontend/src/api/socket/useSocketEvents.js`, plus runtime validation from a real socket event example showing `['update-table', '4751', 478, 'engage']` for a new order on a table.
- Impact: Confirms live dependency on the table channel and prevents incorrect cleanup or refactor decisions based on stale comments.
- Risk: Misleading comments can cause future regressions or accidental removal of active behavior.
- Validation: [CONFIRMED FROM CODE] for active subscription and stale comments. [NOT VERIFIED] for the quoted runtime example.

## AD-103
- Topic: `update-item-status` vs `update-food-status`
- Decision: Both `update-item-status` and `update-food-status` are valid and serve different purposes. They should not be treated as duplicate contracts or consolidated by assumption.
- Based on: Code review of distinct handlers in `frontend/src/api/socket/socketHandlers.js`, plus confirmed architecture clarification that both events are intentionally used for different purposes.
- Impact: Preserves both item-status event paths as intentional behavior and avoids accidental cleanup of a required flow.
- Risk: If the purpose boundary between the two events is not documented, future developers may incorrectly remove or merge one of them.
- Validation: [CONFIRMED FROM CODE] for distinct event paths. [NEEDS BUSINESS CONFIRMATION] for the intended purpose boundary.

## AD-007
- Topic: Terminal order statuses
- Decision: Only `paid` and `cancelled` are terminal order statuses as of now.
- Based on: Code review of current frontend terminal-state checks, plus confirmed architecture clarification that no other statuses are terminal at present.
- Impact: Keeps terminal-state handling simple and aligned with current remove-vs-update behavior.
- Risk: If backend introduces additional terminal statuses later, frontend logic and documentation will need to be updated.
- Validation: [CONFIRMED FROM CODE] only that current frontend terminal checks use `paid` and `cancelled`. [NEEDS BUSINESS CONFIRMATION] whether that is the authoritative backend contract.

## AD-003
- Topic: Walk-in order definition
- Decision: Walk-in means a dine-in order with `table_id = 0`.
- Based on: Code review showing frontend currently infers walk-in from `table_id`, plus clarified business rule that walk-in is specifically a dine-in order with no assigned table.
- Impact: Separates walk-in from other no-table order types such as takeaway or delivery.
- Risk: Current frontend transform logic may be too broad if it treats all `table_id = 0` cases as walk-in without also checking dine-in context.
- Validation: [CONFIRMED FROM CODE] only that current frontend uses `table_id = 0` in its walk-in inference. [NEEDS BUSINESS CONFIRMATION] for the exact business definition.

## AD-006
- Topic: `def_ord_status` / `defaultOrderStatus` usage
- Decision: `def_ord_status` / `defaultOrderStatus` is a restaurant-configured default status sourced from profile data. In current frontend code, it is used in dashboard confirm-order flow and is not scanner-only.
- Based on: Code review of `frontend/src/api/transforms/profileTransform.js`, `frontend/src/contexts/RestaurantContext.jsx`, `frontend/src/pages/DashboardPage.jsx`, and `frontend/src/api/services/orderService.js` showing profile mapping, context storage, and confirm-order usage.
- Impact: Clarifies that default order status affects active confirm-order behavior, not just scanner-originated orders.
- Risk: If business assumptions treat this as scanner-only, current confirm-order behavior may be misunderstood.

## AD-008
- Topic: Role values used for order API scoping
- Decision: For order API role scoping, frontend should use only two values: `Waiter` and `Manager`. `Manager` scope means all orders. `Waiter` scope means orders taken by that waiter and orders for tables assigned to that waiter.
- Based on: Code review of frontend role normalization plus confirmed backend visibility behavior for manager-vs-waiter order access.
- Impact: Confirms current frontend role normalization is aligned with intended backend order-visibility semantics.
- Risk: If backend later introduces distinct order-visibility behavior for additional roles, this two-value mapping will need revision.
- Validation: [CONFIRMED FROM CODE] for current frontend normalization to `Waiter` / `Manager`. [NEEDS BUSINESS CONFIRMATION] for the exact backend visibility semantics.

## AD-001
- Topic: Rounding rule for final totals
- Decision: Keep the current rounding rule: if the difference to the next integer is `>= 0.10`, round up; otherwise round down.
- Based on: Code review showing the same rounding rule duplicated across order and billing paths, plus confirmed business approval to preserve this behavior.
- Impact: Confirms existing frontend rounding behavior as intended business logic across current calculation paths.
- Risk: Because the rule exists in multiple places, future drift remains possible if one path changes independently.
- Validation: [CONFIRMED FROM CODE] for current duplicated rounding behavior. [NEEDS BUSINESS CONFIRMATION] that this remains the approved canonical rule.

## AD-111A
- Topic: Notification source-of-truth
- Decision: Notifications must originate only from socket-driven events. Local or manual notification generation outside the socket-driven flow should not exist.
- Based on: Confirmed architecture clarification that notification behavior should be driven only by socket events.
- Impact: Makes notifications event-driven and consistent with backend realtime flow.
- Risk: Any existing non-socket notification path would violate intended architecture and should be treated as drift.
- Validation: [DOCUMENTED BUT NOT FOUND IN CODE] Current implementation is FCM-driven in `NotificationContext` and also includes a local `NotificationTester` simulation path.

## AD-203
- Topic: CRM API key/config source of truth
- Decision: CRM API key/config coming from environment is temporary. The long-term architecture is for CRM config to come from the database, not environment variables.
- Based on: Current code behavior using env-loaded CRM configuration, plus confirmed architecture clarification that env-based setup is temporary and DB-backed configuration is the intended target.
- Impact: Prevents the current env-loading pattern from being mistaken as the final architecture and establishes DB-backed config as the target source of truth.
- Risk: Until DB-backed config exists, env-based CRM configuration remains operationally limiting and less dynamic.

## AD-204
- Topic: `mock*` data files
- Decision: All `mock*` data files should be removed. Only actively used real/reference data should remain.
- Based on: Code review showing a mix of active reference data and dead/mock artifacts, plus confirmed architecture direction that mock data should not remain in the codebase.
- Impact: Reduces confusion between runtime/reference data and placeholder mock content.
- Risk: Any still-referenced mock artifact must be replaced or removed carefully to avoid breaking runtime behavior.

## AD-201
- Topic: Notification and toast system ownership
- Decision: `NotificationContext` is the canonical realtime/header notification system. `useToast` with shadcn `components/ui/toaster.jsx` is the canonical action-toast system. Sonner is not the active notification path and should be treated as removable/dead code.
- Based on: Code review showing header/socket notifications are driven by `NotificationContext`, action/result toasts use `useToast` + `toaster.jsx`, and `components/ui/sonner.jsx` is not the active path.
- Impact: Clarifies the split between realtime notifications and action toasts and prevents multiple notification systems from being treated as equally canonical.
- Risk: If Sonner remains in the codebase, it may continue to create confusion about which system is intended.
- Validation: [CONFIRMED FROM CODE] except the phrase “header/socket notifications” should be read carefully: the realtime notification path is `NotificationContext`, but its actual inbound source is Firebase/FCM rather than socket events.

## AD-206
- Topic: Legacy `handleUpdateOrder` handler
- Decision: `handleUpdateOrder` is dead legacy wrapper code and a cleanup candidate.
- Based on: Code review showing active socket flow uses `handleOrderDataEvent(...)` while `handleUpdateOrder` remains only as a legacy wrapper/reference path.
- Impact: Clarifies the active socket handling path and reduces confusion around deprecated handler code.
- Risk: If any hidden external dependency still references the legacy wrapper, cleanup must verify that path first.

## AD-302
- Topic: Bill print consistency with collect-bill edits
- Decision: Bill print must remain consistent with the final values edited and settled on the collect-bill screen in the frontend. Frontend billing edits at collect-bill time are valid inputs to the printed bill.
- Based on: Code review showing bill-print payload depends on frontend-side billing data, plus confirmed business clarification that frontend can edit the bill at collect-bill time and print should reflect those settled values.
- Impact: Preserves operator expectation that the printed bill matches the final collect-bill screen values.
- Risk: Any independent print-time recomputation can cause printed totals to diverge from the settled frontend billing values.
- Validation: [DECISION ONLY - PARTIALLY IMPLEMENTED] Current code passes collect-bill overrides into print flow, but separate calculation paths still exist.

## AD-303
- Topic: Prepaid order bill-print availability on collect-bill page
- Decision: Prepaid orders should also have a print bill button on the collect-bill page. The current absence of that button is a gap/bug, not intended architecture.
- Based on: Runtime clarification from actual prepaid flow showing the print button is missing, plus confirmed business intent that prepaid collect-bill flow must still support bill printing.
- Impact: Establishes print-bill access parity requirement for prepaid orders on the collect-bill page.
- Risk: Current runtime behavior is inconsistent with intended billing/printing flow until UI/logic is aligned.
- Validation: [NEEDS RUNTIME VALIDATION] / [NEEDS BUSINESS CONFIRMATION] Current code was not runtime-validated in this audit.

## AD-203A
- Topic: CRM config behavior during active frontend sessions
- Decision: In the current env-based model, CRM config is used at runtime but the restaurant-to-CRM mapping will not change during an active session. Frontend can safely keep the loaded CRM config for the session; no mid-session config rotation handling is required.
- Based on: Current env-based CRM mapping behavior plus confirmed architecture clarification that the env mapping does not change during an active session.
- Impact: Confirms current session-loaded CRM behavior is acceptable in the temporary env-based model.
- Risk: This assumption is valid only while env mapping remains stable and non-rotating during session lifetime.

## AD-203B
- Topic: CRM restaurant selection during a session
- Decision: CRM restaurant selection is determined from the logged-in restaurant context and should not be user-switchable ad hoc during the session.
- Based on: Code flow tying CRM restaurant selection to login/profile-loaded restaurant context, plus confirmed architecture direction that CRM targeting should remain aligned with the authenticated restaurant session.
- Impact: Prevents CRM tenant mismatch inside an active session and keeps CRM routing aligned with restaurant context.
- Risk: If future business needs cross-restaurant CRM operations in one session, this rule would need revision.

## AD-203C
- Topic: Future CRM integration boundary
- Decision: In the long-term CRM architecture, backend will provide the CRM key to POS on or after login, and POS/frontend will use that key directly to retrieve CRM data. CRM key sourcing moves away from environment variables, but CRM API usage remains frontend-driven.
- Based on: Confirmed architecture clarification that future CRM users will receive the CRM key from backend login/bootstrap flow and POS will continue using the key directly for CRM data retrieval.
- Impact: Clarifies that the future change is in CRM key provisioning source, not in shifting CRM API usage behind backend mediation.
- Risk: Secure key provisioning and session handling remain important because frontend continues to use CRM credentials directly.

## AD-401
- Topic: Financial ownership across order placement and bill collection phases
- Decision: Financial ownership is phase-based. After order placement, backend-provided values are the base/final values. If billing edits happen after placement but before collect-bill settlement, frontend computes the updated values. Those frontend-updated values are valid for pre-settlement bill printing, and collect-bill settlement then uses those updated billing values.
- Based on: Confirmed business/runtime clarification that placed-order print values come from backend, while post-placement pre-settlement billing edits are computed in frontend and used for printing before actual bill collection.
- Impact: Clarifies exactly when backend values are authoritative and when frontend-edited billing values become the active printable values.
- Risk: If phase boundaries are not respected consistently in code, printed values and settled values can drift.

## AD-402
- Topic: Settlement ownership at collect-bill/payment commit
- Decision: At actual collect-bill/payment settlement, backend accepts and persists the frontend-computed settlement values as the active final values.
- Based on: Confirmed architecture clarification that settlement-time frontend billing values are submitted as the values backend persists for final payment settlement.
- Impact: Clarifies that settlement-time frontend billing values are not merely provisional UI values; they become the persisted final values once submitted.
- Risk: Trust boundary is higher on frontend settlement math, so any frontend calculation drift directly affects persisted financial records.

## AD-502
- Topic: Default state of `serviceChargeEnabled` on collect-bill panel open
- Decision: `serviceChargeEnabled` should reflect whether service charge is configured/applicable. If service charge is enabled/yes, the checkbox should be ON; otherwise it should be OFF. It should not blindly default to ON on every mount.
- Based on: Code review showing current `CollectPaymentPanel.jsx` behavior initializes the toggle to `true`, plus confirmed business clarification that the checkbox state should reflect actual service-charge applicability.
- Impact: Aligns the collect-bill service-charge toggle with configured billing behavior instead of a hardcoded UI default.
- Risk: Current code likely misrepresents service-charge applicability until implementation is aligned.
- Validation: [DECISION ONLY - NOT IMPLEMENTED] Current code still uses `useState(true)`.

## AD-503
- Topic: Mobile / touch / keyboard UX support
- Decision: The app must support desktop usage, touch interaction on desktop-class devices, and keyboard navigation.
- Based on: Confirmed product/architecture clarification of required interaction modes.
- Impact: Establishes touch and keyboard support as required capabilities rather than optional enhancements.
- Risk: Any mouse-only or non-keyboard-navigable flow would violate intended UX architecture.

## AD-603
- Topic: Test coverage for v2 socket event handlers
- Decision: Test coverage for v2 socket event handlers is partial, not comprehensive. `handleUpdateOrderStatus` is covered by tests, but the broader v2 handler set is not sufficiently covered based on the inspected files.
- Based on: Inspection of `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`, `socketEvents.test.js`, and `socketServiceGlobal.test.js`, showing direct handler coverage only for `handleUpdateOrderStatus` while the other inspected tests cover config/dev-guard behavior rather than handler logic.
- Impact: Confirms there is some regression protection for socket handling, but not enough to treat the v2 handler family as comprehensively tested.
- Risk: Uncovered handlers may regress without automated test detection.
- Validation: [CONFIRMED FROM CODE] for partial coverage presence. [NOT VERIFIED] for actual green/pass CI status, and one direct handler test appears stale versus current implementation.

## AD-701
- Topic: Environment variable example contract
- Decision: The repo should provide a `.env.example` enumerating required environment variables.
- Based on: Repository inspection showing no `.env.example` and incomplete env documentation.
- Impact: Reduces hidden setup ambiguity and makes required configuration visible and reproducible.
- Risk: Without it, environment-dependent behavior remains harder to set up and audit correctly.
- Validation: [DECISION ONLY - NOT IMPLEMENTED] No `.env.example` is present in the repo.

## AD-703
- Topic: `backend/server.py` presence in this frontend-focused repo
- Decision: The backend in this repo is a temporary scaffold and should be removed later.
- Based on: Confirmed architecture clarification about repo intent and backend ownership.
- Impact: Clarifies that the long-term repo intent is not to keep this backend as a permanent co-equal component.
- Risk: Until removed, the scaffold backend may continue to create confusion about repo boundaries and ownership.
- Validation: [CONFIRMED FROM CODE] only that a minimal backend scaffold exists. [NEEDS BUSINESS CONFIRMATION] that removal is the agreed repo direction.

## AD-801
- Topic: Repository history rewrite / force-push governance
- Decision: History rewrite / force-push on this repo should be avoided. If it is ever necessary, it must be clearly documented.
- Based on: Confirmed architecture/governance clarification in response to the missing historical reference commit concern.
- Impact: Preserves traceability and reduces confusion in architecture and code-review history.
- Risk: Undocumented history rewrites make prior findings and references harder to trust or trace.
- Validation: [NEEDS BUSINESS / REPO GOVERNANCE CONFIRMATION] Not answerable from static code alone.
- Status: Frozen

- Status: Frozen

- Status: Frozen

- Status: Frozen
