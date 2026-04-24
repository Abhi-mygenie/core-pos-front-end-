# Document Audit Status
- Source File: memory/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Finalized
- Confidence: High
- Code Areas Reviewed: `frontend/src/api/socket/*`, `frontend/src/components/order-entry/*`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/contexts/*`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/config/firebase.js`, `frontend/public/firebase-messaging-sw.js`, `frontend/plugins/health-check/*`, `frontend/src/setupTests.polyfills.js`, `frontend/src/__tests__/api/socket/*`
- Notes: This v2 summary reclassifies each major item using only current code evidence and removes older freeze-language that implied stronger certainty than the code supports.

# OPEN_QUESTIONS_DECISION_STATUS_SUMMARY — v2

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
| OQ-002 / AD-002 Remove vs update socket behavior | Matches code | Remove occurs only for terminal orders on `update-order-source` / `update-order-paid`; `update-order` and `update-order-target` update in place. |
| OQ-006 / AD-006 `defaultOrderStatus` usage | Matches code | Mapped from profile and used in `DashboardPage` confirm-order flow. |
| OQ-007 / AD-007 terminal statuses in frontend socket logic | Matches code | Current removal checks use only `paid` and `cancelled`. |
| OQ-008 / AD-008 order API role scoping | Matches code | Frontend normalizes to `Waiter` or `Manager`. |
| OQ-009 / AD-009 permission usage model | Matches code | Raw permission strings are used for UI gating via `hasPermission()`. |
| OQ-101 / AD-101 service charge application point | Matches code | Post-discount subtotal is now used in collect-bill and transform math. |
| OQ-102 / AD-102 missing `payload.orders` handling | Matches code | v2 payload-driven handlers fail fast without GET fallback. |
| OQ-103 / AD-103 `update-item-status` vs `update-food-status` | Matches code | Distinct handler paths remain. |
| OQ-106 / AD-106 `update-table` channel active? | Matches code | Subscribed and handled despite stale removal comments. |
| OQ-201 / AD-201 toast/notification ownership | Matches code | shadcn toaster handles action toasts; NotificationContext handles notification state; Sonner is inactive. |
| OQ-202 / AD-202 `order_id` response shapes | Matches code | Code tolerates multiple response shapes. |
| OQ-205 plugin purpose | Matches code | Health-check plugin exposes dev-server health/readiness/liveness and compilation health. |
| OQ-601 `setupTests.polyfills.js` purpose | Matches code | Polyfills `TextEncoder`/`TextDecoder` for tests. |

---

## Partially Matches Code

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-001 / AD-001 rounding rule | Partially matches code | New fractional-part rule exists in main billing transforms, but `OrderEntry` still has older local round-off logic. |
| OQ-003 / AD-003 walk-in definition | Partially matches code | Frontend infers walk-in from `table_id === 0`, but exact business definition is not proven from code alone. |
| OQ-105 / AD-105 bill tax consistency | Partially matches code | Collect-bill print/payment flows reuse UI tax values, but fallback print recomputation still exists in non-override paths. |
| OQ-108 / AD-108 engage-lock recovery | Partially matches code | Locks are ephemeral/in-memory, but reconnect cleanup risks still remain. |
| OQ-203 / AD-203 session CRM behavior | Partially matches code | Current env-based restaurant-bound CRM key behavior is clear; future sourcing/rotation rules are not. |
| OQ-204 / AD-204 `mock*` runtime usage | Partially matches code | Some mock remnants are dead (`mockOrderItems` in `TableCard`), but `notePresets` are active runtime data. |
| OQ-302 / AD-302 bill print consistency with collect-bill edits | Partially matches code | Collect-bill initiated prints use live overrides, but not every print path does. |
| OQ-401 / AD-401 financial ownership after placement | Partially matches code | Frontend phase behavior is visible; backend-side authority semantics are not fully provable. |
| OQ-402 / AD-402 settlement ownership | Partially matches code | Frontend submits settlement values, but backend persistence/authority remains external. |
| OQ-502 / AD-502 service charge toggle default | Partially matches code | Order-type gating exists, but toggle still defaults ON. |
| OQ-603 / AD-603 socket-handler test coverage | Partially matches code | Partial tests exist, but at least one handler test is stale against current implementation. |
| OQ-703 / AD-703 backend scaffold in repo | Partially matches code | Backend scaffold exists; “temporary and should be removed” is not provable from code. |

---

## Does Not Match Code

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-111A / AD-111A notification source-of-truth | Does not match code | Notifications are FCM/service-worker driven, not socket-driven; manual simulation path also exists. |

---

## Superseded by Implementation Learning

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-206 / AD-206 legacy `handleUpdateOrder` | Superseded by implementation learning | Not dead; now best described as a still-wired legacy wrapper delegating to `handleOrderDataEvent()`. |
| OQ-101 + OQ-105 pending notes from `AD_UPDATES_PENDING.md` | Superseded by implementation learning | Service-charge/tax behavior has materially changed since older doc snapshots and must be re-described with current code nuance. |
| OQ-013A service-charge applicability by order type | Superseded by implementation learning | Not well captured in older docs; current code clearly gates service charge to dine-in, walk-in, and room only. |

---

## Not Confirmed From Code

| Question / Decision | Current Status | Notes |
|---|---|---|
| OQ-107 / AD-107 websocket authentication intent | Not confirmed from code | Frontend sends no auth in handshake, but intentional security model is not provable from frontend. |
| OQ-303 / AD-303 prepaid collect-bill print availability as a bug statement | Not confirmed from code | Current component logic does not exclude prepaid from showing print bill. |
| OQ-503 / AD-503 mobile / touch / keyboard support completeness | Not confirmed from code | Static code is insufficient to certify full support. |
| OQ-701 / AD-701 `.env.example` decision intent | Not confirmed from code | Gap is visible, but this is documentation policy rather than implemented architecture. |
| OQ-801 / AD-801 repo history governance | Not confirmed from code | Governance, not a code-verifiable implementation topic. |

---

## Final Reconciled Notes

- Older “Frozen” labels often mixed business clarification with code observation. This v2 file intentionally separates them.
- The biggest status changes after code audit were:
  - notification architecture,
  - service-charge implementation status,
  - tax-consistency scope,
  - stale socket test interpretation,
  - service-charge order-type gating now visible in code.
- Questions still needing non-frontend clarification are mainly:
  - socket auth intent,
  - backend persistence/authority around settlement values,
  - any runtime-only prepaid print issues not visible in static code.
