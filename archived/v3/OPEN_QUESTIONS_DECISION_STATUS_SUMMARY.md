# Document Audit Status
- Source File: v2/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Partially Finalized
- Confidence: High for frontend implementation status; Medium for backend/product-intent items
- Code Areas Reviewed: `frontend/src/api/socket/*`, `frontend/src/components/order-entry/*`, `frontend/src/components/modals/SplitBillModal.jsx`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/contexts/*`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/config/firebase.js`, `frontend/public/firebase-messaging-sw.js`, `frontend/craco.config.js`, `frontend/src/setupTests.polyfills.js`, `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`, `memory/BUG_TEMPLATE.md`, `v1/AD_UPDATES_PENDING.md`
- Notes: This v3 summary updates v2 statuses against current commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179` and absorbs later implementation learnings where verified from code.

# OPEN_QUESTIONS_DECISION_STATUS_SUMMARY — v3

Status categories used:
- **Matches code**
- **Partially matches code**
- **Does not match code**
- **Superseded by implementation learning**
- **Not confirmed from code**

---

## Matches Code

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-002 / AD-002 Remove vs update socket behavior | Matches code | Remove occurs for terminal orders only on `update-order-source` / `update-order-paid`; other data events update. |
| OQ-006 / AD-006 `defaultOrderStatus` usage | Matches code | Profile value is mapped and used in `DashboardPage` confirm-order flow. |
| OQ-007 / AD-007 terminal statuses in frontend socket logic | Matches code | Frontend removal checks use `paid` and `cancelled`; backend-global terminal set is not asserted. |
| OQ-008 / AD-008 order API role scoping | Matches code | Frontend normalizes to `Waiter` or `Manager`. |
| OQ-009 / AD-009 permission usage model | Matches code | Raw permission strings gate UI actions directly. |
| OQ-101 / AD-101 service charge application point | Matches code | Post-discount subtotal is used in main collect-bill and transform paths. |
| OQ-102 / AD-102 missing `payload.orders` handling | Matches code | v2 payload-driven handlers fail fast without GET fallback. |
| OQ-103 / AD-103 `update-item-status` vs `update-food-status` | Matches code | `update-item-status` is payload-driven; `update-food-status` still fetches. |
| OQ-106 / AD-106 `update-table` channel active? | Matches code | Code subscribes and handles `update-table`; comments are stale. |
| OQ-201 / AD-201 toast/notification ownership | Matches code | FCM/service-worker notifications; shadcn action toaster; Sonner unused. |
| OQ-202 / AD-202 `order_id` response shapes | Matches code | Prepaid place+pay captures `res.data.order_id`, `res.data.data.order_id`, or `new_order_ids[0]`. |
| OQ-001A Discount precision | Matches code | Percent discounts retain two-decimal precision; final-total rounding remains separate. |
| OQ-302A Postpaid collect-bill auto-print | Matches code | Existing-order collect-bill can auto-print after payment when `settings.autoBill` is enabled. |
| OQ-004 Split bill final total display | Matches code | Split modal uses `grandTotal` from collect-bill and apportions totals proportionally. |
| OQ-022 Cancelled collect-bill item display | Matches code | Cancelled items render gray/struck-through and complimentary checkbox is disabled. |
| OQ-601 `setupTests.polyfills.js` purpose | Matches code | Polyfills `TextEncoder`/`TextDecoder` for tests. |

---

## Partially Matches Code

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-001 / AD-001 rounding rule | Partially matches code | Correct in `CollectPaymentPanel` and `calcOrderTotals`; old helper remains in `OrderEntry`. |
| OQ-003 / AD-003 walk-in definition | Partially matches code | `table_id` inference exists; business definition not proven. |
| OQ-013A service-charge order-type gating | Partially matches code | Normal branch gates dine-in/walk-in/room; room-with-associated-orders branch has separate SC UI path. |
| OQ-021 runtime complimentary print override | Partially matches code | Manual print and postpaid auto-print pass override IDs; prepaid auto-print does not visibly pass them. |
| OQ-105 / AD-105 bill tax consistency | Partially matches code | Override paths align; dashboard/default print fallback still recomputes. |
| OQ-108 / AD-108 engage-lock recovery | Partially matches code | In-memory lock/release paths exist; durable reconnect recovery does not. |
| OQ-203 / AD-203 CRM session behavior | Partially matches code | Env-based per-restaurant key map exists; future sourcing/rotation not proven. |
| OQ-204 / AD-204 `mock*` runtime usage | Partially matches code | Dead `mockOrderItems` import remains; `notePresets` are runtime/reference data. |
| OQ-302 / AD-302 bill print consistency | Partially matches code | Manual and auto collect-bill paths improved; non-override prints remain fallback-based. |
| OQ-401 / AD-401 financial ownership | Partially matches code | Frontend payload construction visible; backend authority not proven. |
| OQ-402 / AD-402 settlement ownership | Partially matches code | Frontend submits settlement values; backend persistence semantics external. |
| OQ-502 / AD-502 service charge toggle default | Partially matches code | Toggle still defaults ON. |
| OQ-603 / AD-603 socket-handler test coverage | Partially matches code | Tests exist but `updateOrderStatus.test.js` is stale. |
| OQ-703 / AD-703 backend scaffold in repo | Partially matches code | Backend folder exists; repo-boundary intent unknown. |

---

## Does Not Match Code

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-111A / AD-111A notification source-of-truth | Does not match older wording | Notifications are FCM/service-worker driven, not socket-only. |
| OQ-205 health-check plugin purpose | Does not match v2 | `frontend/plugins/health-check/*` is absent; `craco.config.js` still conditionally requires missing files. |

---

## Superseded by Implementation Learning

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-206 / AD-206 legacy `handleUpdateOrder` | Superseded | Best described as still-wired legacy wrapper delegating to `handleOrderDataEvent()`. |
| OQ-101 + OQ-105 pending BUG-006 notes | Superseded by current implementation learning | Service charge/tax behavior is implemented with override-path caveats. |
| OQ-013A service-charge applicability | Superseded older docs | Now an explicit implementation fact for dine-in/walk-in/room applicability. |
| OQ-020 discount precision | Superseded older billing assumptions | Discount precision is now 2-decimal in collect-bill UI. |
| OQ-021 runtime complimentary print | New implementation learning | Print payload can use frontend override IDs to zero runtime complimentary lines. |
| OQ-022 cancelled item display | New implementation learning | Display parity implemented; no payload/math change. |

---

## Not Confirmed From Code

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-107 / AD-107 websocket authentication intent | Not confirmed from code | Client sends no auth; intentional/security-approved design is external. |
| OQ-303 / AD-303 prepaid collect-bill print availability as a required bug | Not confirmed from code/product | Current code has pre-place limitation; memory marks BUG-005 closed as not a business requirement. |
| OQ-503 / AD-503 mobile / touch / keyboard support completeness | Not confirmed from code | Static code cannot certify full accessibility/touch support. |
| OQ-701 / AD-701 `.env.example` decision intent | Not confirmed as implemented | No `.env.example`; policy intent external. |
| OQ-801 / AD-801 repo history governance | Not confirmed from code | Governance, not implementation. |
| Backend delivery-address persistence | Needs backend clarification | Frontend emits `delivery_address`; persistence cannot be proven. |
| Backend settlement authority | Needs backend clarification | Frontend submits settlement values; backend validation/persistence external. |

---

## Final Reconciled Notes

- Biggest changes from v2:
  - health-check plugin status changed from resolved to contradicted/missing,
  - postpaid collect-bill auto-print is now code-visible,
  - discount precision and runtime complimentary print override are now architecture-relevant implementation learnings,
  - split bill display and cancelled item display are now resolved in code.
- Still not safe to treat as finalized without backend/product clarification:
  - socket authentication intent,
  - settlement authority,
  - delivery-address persistence,
  - prepaid pre-place manual print policy.

## What Changed From v2
- Re-anchored to commit `32d91748...`.
- Downgraded health-check plugin from “matches code” to “does not match current tree”.
- Added current BUG-020/021/022, postpaid auto-print, and split-bill implementation statuses.