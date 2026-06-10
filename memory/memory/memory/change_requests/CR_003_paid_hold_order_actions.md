# CR-003: Paid & Hold Order Actions — Collect Bill from Hold, Change Payment Method, Mark as Unpaid

## Status
- cr_approved_for_planning

## Approval
- Approved by user on 2026-04-28. Approval phrase: "approved / freeze all".

## Raw User Request
- On the **On Hold** tab, every held order must offer a **Collect Bill** option. Clicking it opens the collect-bill flow for that order.
- On the **Paid** tab, every paid order must offer:
  - An option to **change payment method** between Cash / Card / UPI (flip between these methods from the UI itself).
  - An option to **mark the order as Unpaid**. When flipped to Unpaid, the order re-surfaces on the dashboard (running/unpaid) and a backend API call is made.
- User has shared Endpoint A (change payment method) and Endpoint B (mark paid as unpaid). Collect-Bill-from-Hold endpoint source still to be confirmed.

## Request Type
- new feature + behavior change + API integration (financial-mutation flow)

## Business Context
- Operators today cannot correct a wrongly-captured payment method from the report screen — they must void or manually reconcile.
- Held (paylater) orders currently require navigating back to the dashboard/table to collect payment, slowing down cashiering.
- Allowing in-report method change and unpaid-flip streamlines end-of-day reconciliation directly from the Audit Report.

## Current Behavior
- **On Hold tab**: displays paylater orders read-only. No action available from the report row or side sheet to collect bill.
- **Paid tab**: displays paid orders read-only. No action to change the payment method or revert to unpaid.
- Collect-bill flow currently lives on the POS workspace (`CollectPaymentPanel.jsx`) and is triggered from the dashboard/order-entry path, not from the Audit Report.

## Expected Behavior (high-level, subject to clarification)
- **Hold → Collect Bill**: per-row action (exact placement TBD) that opens the existing collect-bill flow pre-loaded with the held order.
- **Paid → Change Payment Method**: per-row UI control that flips between Cash / Card / UPI (OQ-B1). On confirm, calls **Endpoint A** and refreshes the report row.
- **Paid → Mark as Unpaid**: per-row action (confirmation dialog expected, OQ-C1) that calls **Endpoint B**, removes the order from the Paid tab, re-surfaces it as running/unpaid on the dashboard, and re-routes it to the Unpaid tab of the report.

## Confirmed Endpoints

### Endpoint A — Change Payment Method
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/change-order-payment-method
Headers:
  Authorization: Bearer <vendoremployee_token>
  Accept: application/json
  Content-Type: application/json
Body:
  {
    "order_id": 12345,
    "payment_method": "cash"
  }
```
- Accepted `payment_method` values: assumed `"cash"` / `"card"` / `"upi"` (lowercase). **User to confirm — OQ-B1.**
- No `reason` / audit-trail field required by the endpoint → CR-003 does not collect a reason in the UI.
- No date / business-day restriction in payload → endpoint appears to support **retroactive** change. **User to confirm — OQ-B4.**
- Response shape / error codes: **not specified yet** — user to share or we must inspect during implementation.

### Endpoint B — Mark Paid as Unpaid
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/make-order-unpaid
Headers:
  Authorization: Bearer <vendoremployee_token>
  Accept: application/json
  Content-Type: application/json
Body:
  {
    "order_id": 12345
  }
```
- No `reason` field → CR-003 does not collect a reason.
- No date / business-day restriction → appears to support retroactive flip. **User to confirm — OQ-C6.**
- Response shape / error codes: **not specified yet**.
- Whether backend broadcasts a socket event after this call to update other terminals: **user to confirm — OQ-C3.**

### Endpoint C — Collect Bill from On Hold tab
- **TBD.** Candidate: reuse the existing collect-payment flow (same endpoint `CollectPaymentPanel.jsx` already calls from the dashboard path). User to confirm — OQ-C-endpoint.

### Auth / Frontend path
- Both endpoints use the standard `Authorization: Bearer <vendoremployee_token>` — handled by the existing axios interceptor in `frontend/src/api/axiosClient.js`. No new auth wiring needed.
- New service functions to add in `frontend/src/api/services/paymentService.js` (or an existing equivalent) — exact file TBD during implementation.
- Endpoint constants to add in `frontend/src/api/constants.js`:
  - `CHANGE_ORDER_PAYMENT_METHOD = '/api/v2/vendoremployee/change-order-payment-method'`
  - `MAKE_ORDER_UNPAID = '/api/v2/vendoremployee/make-order-unpaid'`

## Confirmed Scope (partial — endpoints locked in, UI still pending)
- CS-A1: Add endpoint constants and service wrappers for Endpoint A and Endpoint B.
- CS-A2: No `reason` / audit-trail collection in the UI (endpoints don't require it).
- CS-A3: On success of Endpoint A, refresh the affected row in place (optimistic update + background refetch) without full page reload.
- CS-A4: On success of Endpoint B, remove the row from Paid tab, fire a report refresh, and trigger whatever handler the dashboard uses to refresh running orders (so the order re-surfaces there). If backend emits a socket event (see OQ-C3), rely on that; otherwise explicit refresh.
- CS-A5: Both actions use the existing `Bearer` interceptor and global error-toast handling.
- **CS-A7 (Collect Bill from Hold — UI):** Per-row "Collect Bill" button on each On Hold tab row. Clicking opens the existing `CollectPaymentPanel` UI as a **modal overlay on the report page** (not a navigation to the dashboard). The panel pre-loads the selected held order. On successful payment, the modal closes and the Hold tab refreshes (row moves to Paid tab). Recommended because it avoids a context-switch/navigation away from the Audit Report.
- **CS-A8 (Change Payment Method — UI):** Per-row inline button on each Paid tab row (e.g., pencil icon next to the payment method badge). Clicking it opens a small popover / mini-modal offering the three allowed methods (Cash / Card / UPI). On selection, call Endpoint A; on success, update the row's Payment column in place. Button is disabled for orders older than the 2-day window (CS-A9).
- **CS-A9 (2-day window guardrail for mutations):** Both **Change Payment Method** and **Mark as Unpaid** controls are only active for orders from the current business day and the immediately previous business day. For older orders:
  - The control is **rendered but disabled** (greyed out, with a tooltip like "Only available for today and yesterday").
  - Backend endpoint (Endpoints A and B) accepts any order_id; the frontend guardrail is in addition to any backend restriction.
  - Business-day calculation reuses the existing `/utils/businessDay.js` logic.
- **CS-A10 (Mark-Unpaid confirmation):** Mark-Unpaid action shows a confirmation dialog before calling Endpoint B. Dialog text: something like "Mark this paid order as unpaid? The order will reappear on the dashboard as a running order."
- **CS-A11 (Socket-driven refresh after Mark-Unpaid):** On successful Endpoint B response, backend will emit a socket event on the existing order channel. Frontend subscribes to that event and re-fetches the report + dashboard running-orders list. Until backend emits the event, frontend falls back to an explicit refetch on success.
- **CS-A12 (Scope restrictions):**
  - Aggregator (Zomato/Swiggy) orders do NOT get Change Payment Method or Mark-Unpaid controls.
  - Room / SRM / `payment_method === 'ROOM'` orders are out of scope (removed from Audit Report by CR-001 anyway).
  - No change to KOT / print behavior as a result of either action.
  - No admin-level setting toggle.
  - No PIN prompt.
- **CS-A6 (Role-gated actions — CONFIRMED 2026-04-28):** Both **Change Payment Method** (Endpoint A) and **Mark as Unpaid** (Endpoint B) MUST be gated by user role permission. Specifically:
  - The UI controls for both actions must be hidden (not just disabled) when the current user's role lacks permission.
  - The frontend MUST check the role/permission of the logged-in user before rendering these controls, and MUST NOT rely on the backend as the sole guard (defense-in-depth).
  - **Permission keys (user-confirmed 2026-04-28):**
    - **Change Payment Method** → permission key: `update_payment`
    - **Mark as Unpaid** → permission key: `order_unpaid`
  - Frontend must read the logged-in user's permissions and check the presence of these keys before rendering each control.
  - Principle (apply across all future financial-mutation actions): Any action that mutates a paid/settled order MUST be role-gated at the frontend.

## Out of Scope
- CR-001 (status/filter/room-removal) — separate CR.
- CR-002 (unification refactor) — separate CR.
- CR-004 (Room Orders PMS view) — separate CR. Consequently, **Room-transferred (RM/SRM/ROOM) paid orders are OUT OF SCOPE for CR-003** — those flows belong to CR-004.
- Aggregator (Zomato/Swiggy) paid orders — scope TBD (OQ-6).
- Split payments (multi-method orders) — scope TBD (OQ-9).
- Reprint / print-invalidation behavior — TBD (OQ-Print).

## Affected User Roles
- Cashier, Owner, Restaurant Admin — role/PIN gating pending (OQ-A3, OQ-B5, OQ-C5).

## Affected Modules / Screens
- Reports / Audit / Summary Module (`/reports/audit`).
- Order Entry / Cart / Payment Workflow (`CollectPaymentPanel.jsx`).
- Dashboard / POS Workspace (`DashboardPage.jsx`) — because a marked-unpaid order re-surfaces here.
- Files likely touched:
  - `frontend/src/pages/AllOrdersReportPage.jsx`
  - `frontend/src/components/reports/OrderTable.jsx`
  - `frontend/src/components/reports/OrderDetailSheet.jsx`
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - `frontend/src/pages/DashboardPage.jsx`
  - `frontend/src/api/services/paymentService.js` (new wrappers for Endpoints A/B)
  - `frontend/src/api/constants.js` (new endpoint constants)

## Affected Order Types / Channels
- Dine-in: Yes
- Takeaway: Not confirmed
- Delivery: Not confirmed
- Room / SRM: **OUT** (handled by CR-004)
- Scan & Order: Not confirmed
- Aggregator (Zomato/Swiggy): TBD (OQ-6)

## Admin / Settings Impact
- Possibly requires a restaurant-level toggle ("Allow paid order edit") — pending OQ-11.

## API Impact
- Endpoint A and Endpoint B: user-provided (see specs above).
- Endpoint C (Collect Bill from Hold): TBD — expected to reuse existing collect-payment endpoint.
- High regression risk — touches financial mutation. `CollectPaymentPanel.jsx` is a hotspot per playbook.

## Socket Impact
- Possibly Yes — if backend broadcasts an event after Endpoint B so other terminals refresh. Pending OQ-C3.
- Client-side fallback: if no socket, force a refetch of running orders + report after success.

## Data / Payload Impact
- Request payloads documented above. Response shapes: TBD from backend.

## Printing / KOT / Bill Impact
- Not confirmed. Example: if an order was already printed, does changing method reprint, invalidate, or append an adjustment note? (OQ-Print.)

## Reporting / Analytics Impact
- Yes — changing a paid order to unpaid retroactively alters the day's revenue totals, cash/card/upi split, and Collected summary. Endpoint appears retroactive-friendly (no date field); confirm whether same-day-only guardrail should still be enforced in the UI (OQ-B4, OQ-C6).

## Backward Compatibility
- Historical paid orders: endpoint accepts any `order_id`. UI may still restrict to same-business-day or allow retroactive — pending OQ-B4, OQ-C6.

## Backend Socket Dependency (added 2026-04-28)
- **Dep-Socket:** Backend must emit a socket event on the existing order channel (`new_order_${restaurantId}` or equivalent) when Endpoint B (make-order-unpaid) is called, so other terminals see the order reappear as running. **This backend change is part of this CR's scope** — user has requested it of backend. Frontend subscribes to the event and refreshes on receipt. Until backend delivers the event, frontend falls back to an explicit refetch on Endpoint B success (so the feature is not blocked on backend).

## Edge Cases
- EC-1: Order already printed / KOT dispatched — method change or unpaid-flip still allowed? (OQ-Print / OQ-10)
- EC-2: Order with split payments (multiple methods in one order) — method-change behavior? (OQ-9)
- EC-3: Aggregator order — method change allowed? (OQ-6)
- EC-4: Room-transferred paid orders — OUT (CR-004).
- EC-5: Offline mode — action disabled or queued?
- EC-6: Concurrent edit — two terminals changing the same paid order simultaneously. Last-write-wins at backend; UI should refetch on error.
- EC-7: User lacks permission — action hidden, disabled with tooltip, or error on click? (Pending role gating OQs.)
- EC-8: Endpoint returns an error mid-flow — rollback optimistic UI update and show toast.

## Assumptions
- A-1: CR-003 implementation will happen after CR-001 is merged so the Hold and Paid tabs classify orders correctly.
- A-2: Collect-Bill-from-Hold action reuses the existing `CollectPaymentPanel` flow rather than building a new one.
- A-3: Change-payment-method action is a direct financial mutation on the existing order (no void + re-create).
- A-4: `payment_method` accepted values at Endpoint A are lowercase `"cash"`, `"card"`, `"upi"` consistent with the example payload.
- A-5: Retroactive changes are allowed at the backend (no date restriction in payload); UI-level guardrails (same-business-day only?) to be confirmed.

## Open Questions (trimmed — endpoint-derivable ones closed)
| Question | Why It Matters | Status |
| --- | --- | --- |
| OQ-C-endpoint: Confirm Collect-Bill-from-Hold reuses the existing collect-payment endpoint (no new endpoint needed), or share the dedicated endpoint spec. | **Answered (2026-04-28):** Yes — reuses the existing collect-payment endpoint. No new endpoint needed. | Answered |
| OQ-A1: Collect Bill trigger placement — per-row button, row-click action, side-sheet action, or all? | **Answered (2026-04-28):** Per-row button on each On Hold row (labelled e.g., "Collect Bill"). Clicking it opens the existing collect-bill UI — recommended as a modal on the report page that reuses `CollectPaymentPanel.jsx` content (see CS-A7 below). | Answered |
| OQ-A2: Collect Bill opens existing `CollectPaymentPanel` on the dashboard, or an inline modal on the report page? | **Answered (2026-04-28):** Open the existing collect-bill view; frontend engineer to present it as a modal on the report page (recommendation — user endorsed "may be modal there suggest"). Avoids navigation context switch. | Answered — modal on report page |
| OQ-A3: Which user roles are allowed to Collect Bill from Hold? Any PIN/password required? | **Answered (2026-04-28):** No PIN required. Same permission model as existing CollectPaymentPanel (no additional gating beyond what the dashboard flow already enforces). | Answered (assumes existing gating inherits) |
| OQ-B1: Exact allowed `payment_method` values at Endpoint A — only `"cash"`, `"card"`, `"upi"`, or additional values (e.g., TAB, ROOM, paylater, online)? Case-sensitive? | **Answered (2026-04-28):** Only `cash`, `card`, `upi` — the three available payment method types. No TAB / ROOM / paylater / online. Case sent lowercase per endpoint example. | Answered |
| OQ-B2: UI pattern for method change — inline dropdown in the row / modal / side-sheet action? | **Answered (2026-04-28):** Inline button per row on the Paid tab. Clicking it opens a small picker (mini modal / popover) that offers the three allowed methods (Cash / Card / UPI). On selection, call Endpoint A and update the row in place. | Answered |
| OQ-B3: Reason/audit trail | Answered: NOT required (endpoint doesn't accept it). | Closed |
| OQ-B4: Same-business-day only, or retroactive across dates? | **Answered (2026-04-28):** Allowed only for **current business day and previous business day** (2-day window). For orders older than that, the button is shown but **disabled** (visually indicates the action is not available). | Answered |
| OQ-B5: Role gating + PIN/password for method change? | **Answered (2026-04-28):** Role-gated via permission key `update_payment`. **No PIN required.** | Closed |
| OQ-C1: Confirmation dialog before Mark-Unpaid? | **Answered (2026-04-28):** Yes — confirmation dialog required before calling Endpoint B. | Answered |
| OQ-C2: On unpaid-flip — order reopens as running on dashboard, stays closed but appears in Unpaid tab, or both? | **Answered (2026-04-28):** Backend handles the reappearance. Order re-surfaces as a running order on the dashboard (emitted via socket — see OQ-C3). Frontend does not need to explicitly reopen the order state. | Answered |
| OQ-C3: Does backend emit a socket event after Endpoint B so other terminals refresh? If not, UI must explicitly refetch. | **Answered (2026-04-28):** Backend will emit a socket event as part of this CR (user has requested this of backend). Frontend subscribes to the existing `new_order_${restaurantId}` channel (or equivalent) and refreshes on receipt. Until backend emits, frontend falls back to an explicit refetch on success. | Answered (with fallback) |
| OQ-C4: Reason/comment for unpaid-flip | Answered: NOT required. | Closed |
| OQ-C5: Role + PIN/password gating for unpaid-flip? | **Answered (2026-04-28):** Role-gated via permission key `order_unpaid`. **No PIN required.** | Closed |
| OQ-C6: Retroactive impact on reports — same-day only or all dates? | **Answered (2026-04-28):** Same 2-day window as OQ-B4 (current + previous business day). Older orders → Mark-Unpaid button disabled. | Answered |
| OQ-Setting: Admin toggle "Allow paid order edit"? | **Answered (2026-04-28):** No admin setting. Role permission alone controls access. | Closed |
| OQ-Print: Post-KOT / post-print method change or unpaid-flip behavior — silent, reprint, or block? | **Answered (2026-04-28):** No change in behavior. Method change / unpaid-flip does NOT trigger reprint, invalidation, or any print-side effect. | Closed |
| OQ-6: Aggregator orders — in or out of scope? | **Answered (2026-04-28):** Out of scope. Aggregator (Zomato/Swiggy) paid orders do NOT get the Change Payment Method button. Mark-Unpaid also not available for aggregator orders. | Closed |
| OQ-9: Split-payment orders — in or out of scope? | **Answered (2026-04-28):** Already handled architecturally — your POS creates a NEW order for each split (no single order carries multiple methods). No special handling needed in this CR. | Closed |
| OQ-10: Allowed after KOT / print has happened? | **Answered (2026-04-28):** Yes — post-KOT / post-print method change is allowed. No print-side effect (per OQ-Print). | Closed |
| OQ-11: Restaurant-level setting toggle required? | **Answered (2026-04-28):** No. Same as OQ-Setting. | Closed |
| OQ-Response: Endpoint A and Endpoint B success/error response shapes. | Frontend error handling. Not blocking — frontend will handle generic success / error cases and refine during implementation based on observed responses. | Open — non-blocking |

## User Decisions
| Decision | User Answer | Date |
| --- | --- | --- |
| Track as separate CR (not merged into CR-001) | Confirmed | 2026-04-28 |
| Endpoint A (change payment method) spec provided | `POST /api/v2/vendoremployee/change-order-payment-method`, body `{ order_id, payment_method }` | 2026-04-28 |
| Endpoint B (make order unpaid) spec provided | `POST /api/v2/vendoremployee/make-order-unpaid`, body `{ order_id }` | 2026-04-28 |
| Reason/audit-trail fields NOT required (neither endpoint accepts them) | Confirmed by endpoint design | 2026-04-28 |
| Room/SRM/ROOM orders are OUT of scope (covered by CR-004) | Confirmed | 2026-04-28 |
| Change Payment Method + Mark as Unpaid are role-gated (frontend hides UI for unauthorized roles; backend is not the sole guard) | Confirmed | 2026-04-28 |
| Principle captured: any action that mutates a paid/settled order must be role-gated on the frontend | Confirmed as a learning | 2026-04-28 |
| Permission key for Change Payment Method | `update_payment` | 2026-04-28 |
| Permission key for Mark as Unpaid | `order_unpaid` | 2026-04-28 |
| No PIN prompt required (neither action) | Confirmed | 2026-04-28 |
| Collect-Bill-from-Hold reuses existing collect-payment endpoint (no new endpoint) | Confirmed | 2026-04-28 |
| Allowed `payment_method` values at Endpoint A = `cash` / `card` / `upi` only | Confirmed | 2026-04-28 |
| Confirmation dialog before Mark-Unpaid | Confirmed | 2026-04-28 |
| On Mark-Unpaid success, backend re-surfaces the order (emits a socket event on the order channel) | Confirmed — backend change requested as part of this CR | 2026-04-28 |
| No admin-setting toggle required | Confirmed | 2026-04-28 |
| No change in print / KOT behavior on method change or unpaid-flip | Confirmed | 2026-04-28 |
| "No its only for paid orders to update payment method" clarification | Confirmed: Change Payment Method scope is Paid tab only (obvious confirmation; Collect-Bill-from-Hold remains in scope) | 2026-04-28 |
| 2-day mutation window (current + previous business day); older = button disabled | Confirmed | 2026-04-28 |
| Split-payment orders = no special handling needed (POS architecturally creates new order per split) | Confirmed | 2026-04-28 |
| Aggregator orders are out of scope for Change Method and Mark-Unpaid | Confirmed | 2026-04-28 |
| Collect Bill from Hold: per-row button → opens existing CollectPaymentPanel as a modal on the report page | Confirmed (user endorsed modal suggestion) | 2026-04-28 |
| Change Payment Method UI: inline button per row with Cash/Card/UPI mini-picker | Confirmed | 2026-04-28 |

## Risks / Dependencies
- R-1: `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, and any new financial-mutation logic are high-regression-risk hotspots per CHANGE_REQUEST_PLAYBOOK.md step 8.
- R-2: Retroactive mutation of paid orders can alter historical reports; compliance/audit review may be required.
- R-3: Socket sync across terminals must be preserved if unpaid-flip changes dashboard state.
- R-4: Without response-shape specs, frontend error handling will be generic (toast) until we observe real responses.
- D-1: Depends on CR-001 (status derivation fix) being merged.
- D-2: Open question answers required before implementation handover.
- D-3: Confirmation of Endpoint C (or explicit reuse) required.

## Suggested Phase
- Phase 1: **Collect-Bill-from-Hold** (lowest risk — reuses existing collect-payment flow once OQ-C-endpoint is confirmed).
- Phase 2: **Change Payment Method on Paid tab** (Endpoint A — locked in).
- Phase 3: **Mark Paid → Unpaid** (Endpoint B — locked in; highest risk due to retroactive effect + dashboard re-surfacing + socket sync).

## Acceptance Criteria
| # | Acceptance Criteria |
| --- | --- |
| 1 | Hold tab rows expose a Collect Bill action (exact placement per OQ-A1). Clicking it opens the collect-payment flow with the held order pre-loaded, and a successful payment moves the order into the Paid tab. |
| 2 | Paid tab rows expose a Change Payment Method control (per OQ-B2). Selecting a new method (cash/card/upi per OQ-B1) calls Endpoint A; on success, the row's Payment column reflects the new method without page reload. |
| 3 | Paid tab rows expose a Mark-Unpaid action with confirmation (per OQ-C1). On confirm, Endpoint B is called; on success the row disappears from Paid tab, the Unpaid tab count increments, and the order re-surfaces on the dashboard as running/unpaid. |
| 4 | All three actions respect role-permission gating. Specifically: the Change Payment Method control and the Mark-Unpaid action are NOT rendered for users whose role lacks permission (exact role list per OQ-B5 / OQ-C5). |
| 5 | A user who has permission sees both controls; a user who lacks permission sees neither (no disabled-state leakage of the UI). |
| 6 | No regression on CR-001 classifications (Hold, Paid, Unpaid, Audit tabs). |
| 7 | No regression on dashboard, collect-payment, KOT / print, or socket sync flows. |
| 8 | Error responses from Endpoints A/B surface user-visible toast messages, optimistic UI updates roll back, and no partial state is left in the UI. |
| 9 | No new endpoint is invented; only the three confirmed endpoints (A, B, and Collect-Bill-from-Hold per OQ-C-endpoint) are used. |

## References Read
- /app/memory/final/CHANGE_REQUEST_PLAYBOOK.md
- /app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md
- /app/memory/final/MODULE_DECISIONS_FINAL.md (sections 4 — Order Entry / Payment, 10 — Reports)
- /app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md
- Related CR: /app/memory/change_requests/CR_001_all_orders_status_derivation.md
- Related CR: /app/memory/change_requests/CR_002_unify_status_and_tab_logic.md
- Related CR: /app/memory/change_requests/CR_004_room_orders_pms_view.md
- Source (read only, for context): /app/frontend/src/pages/AllOrdersReportPage.jsx
- Source (read only, for context): /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
- Source (read only, for context): /app/frontend/src/pages/DashboardPage.jsx
- Source (read only, for context): /app/frontend/src/api/constants.js
- Source (read only, for context): /app/frontend/src/api/services/paymentService.js

## Ready for Next Agent?
- Yes — CR is frozen. Ready for Change Request Impact Analysis Agent.

## Next Agent
- Change Request Impact Analysis Agent (after remaining OQs are answered and user approves)
