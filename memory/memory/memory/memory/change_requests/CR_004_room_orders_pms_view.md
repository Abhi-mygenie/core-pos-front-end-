# CR-004: Room Orders Report — PMS-Style View (Phase 1: Read-Only)

## Status
- cr_approved_for_planning

## Approval
- Approved by user on 2026-04-28. Approval phrase: "approved / freeze all".

## Raw User Request
- Room orders must be removed from the main Audit Report and shown in a separate view that behaves like a PMS (Property Management Solution).
- Entry point: Room (with room number).
- Per room, display: rent, advance, remaining balance, associated orders (orders shifted into the room from dine-in / bar / spa / etc.), and native room-service orders.
- User confirmed the approach: use existing `get-single-order-new` endpoint (which returns `room_info` with rent/advance/balance + `associated_order_list[]`). No new backend endpoint needed for Phase 1.

## Request Type
- new feature (new route + new view) in the Reports / Audit / Summary Module.

## Business Context
- Operators currently cannot see a consolidated room-level view. They have to reconstruct a room's total bill by scanning the Audit Report for RM/SRM orders and mentally aggregating rent + advance + associated orders. This is error-prone.
- A PMS-style view aligns the POS with hospitality industry norms and is critical for hotels where F&B is attached to room check-ins.

## Current Behavior
- Room orders today are mixed into the Audit Report. Some tabs silently include them, some exclude, causing confusion (this is separately addressed in CR-001 by removing room orders from the Audit Report).
- The `roomInfo` block (rent, advance, balance) and `associated_order_list[]` are already delivered by backend via `get-single-order-new`, but there is no UI that surfaces them as a first-class view.
- `roomService.js` currently only exposes `checkIn()` — no list/report function.

## Expected Behavior
- A new route `/reports/rooms` (new sidebar entry under Order Reports) renders a **Room Orders** view.
- The view lists rooms for the selected business day. Each row = one room. Expanding a row shows the room's rent / advance / balance / associated orders.
- The view is **read-only** in Phase 1. Actions (print folio, add interim payment, checkout & settle) are Future Phase.

## Confirmed Scope
### CS-1 — Route and entry point
- Add new route: `/reports/rooms` in `App.js`.
- Add sidebar entry "Room Orders" under Order Reports group in `components/layout/Sidebar.jsx`.
- Page component: `frontend/src/pages/RoomOrdersReportPage.jsx` (new).

### CS-2 — Data strategy: Option L1 (user-confirmed)
- Reuse `API_ENDPOINTS.ORDER_LOGS_REPORT` (same endpoint used by Audit Report) for the day-level list.
- Filter the returned orders to keep only those that identify a "room parent":
  - `order_in === 'RM'` → native room-service orders (canonical room parent candidate).
  - Fallback for rooms where only SRM orders exist with no RM parent (user-confirmed V4 = possible): group SRM orders by `parent_order_id` and create a synthetic room group per unique `parent_order_id`.
- De-duplicate by room (one row per room, not per order).

### CS-3 — Room row contents (collapsed view)
Each row shows:
- Room number (from `table_no` on the RM order, or resolved via `parent_order_id` for SRM-only rooms).
- Guest name / phone (from `user_name`, `cust_mobile`).
- Check-in time (from `created_at` of the RM parent order, or earliest SRM order if no RM parent).
- Aggregate: count of associated orders, total food amount (sum of child order amounts), badge showing paid/unpaid mix.
- **Warning badge** if `room_info` is missing on the RM parent order (CS-6 — reconciliation flag).

### CS-4 — Expanded row contents (lazy-loaded)
When user clicks to expand a row, call `reportService.getSingleOrderNew(roomParentOrderId)` (existing function) to fetch full detail. Show:
- **Room financials** (from `roomInfo`):
  - Rent (`roomInfo.roomPrice`)
  - Advance paid (`roomInfo.advancePayment`)
  - Balance remaining (`roomInfo.balancePayment`)
- **Associated orders** (from `associatedOrders[]`): order number, source (dine-in/bar/spa/takeaway — derived from `order_type`), amount, payment status, time.
- Native RM orders (already on the parent) — list separately or merge into the associated section.

### CS-5 — Lazy loading
- Do NOT prefetch per-room detail on page load. Fetch on row-expand only. Cache expanded-row details in page state for the session so collapsing/re-expanding doesn't re-fetch.

### CS-6 — No-room_info flag (reconciliation alert)
- If an RM parent order is returned WITHOUT `room_info`, the row is shown with a visible "Room billing not set up" warning badge (amber).
- User confirmed this indicates that room billing wasn't completed. These are operator-actionable anomalies; do NOT hide them.

### CS-7 — Filters (Phase 1)
- Date picker (same business-day logic as Audit Report).
- Status filter: `In-house` / `All` (checked-out history can be Future Phase; Phase 1 shows only rooms with any activity in the selected business day).
- No Channel / Platform / Payment filters in Phase 1 (keep view focused).

### CS-8 — Summary bar
- Top-right summary: `N Rooms`, `Total Rent`, `Total Food`, `Total Outstanding`.

### CS-9 — Export (Phase 1)
- CSV export of the flat room+orders list (one row per associated order, with room-id column).
- PDF export of the visible room list (Phase 1 — room-level summary only; individual room folio print is Future Phase).

### CS-10 — Permissions
- Accessible to the same roles that can view the Audit Report (Owner / Admin / Cashier). No separate role gating in Phase 1.

### CS-11 — Out of scope (explicitly)
- Print folio (room-level full bill) — Future Phase (infra likely reusable; see `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js`).
- Add interim payment — Future Phase, needs backend endpoint.
- Check-out & settle — Future Phase, needs backend endpoint.
- List of in-house rooms with NO activity in the selected day — Future Phase, needs a new backend endpoint (Option L2 from planning discussion).
- History / checked-out rooms filter — Future Phase.
- Real-time updates via socket when a new order is shifted into a room — Future Phase.
- Channel / Platform / Payment filters — Future Phase.

## Affected User Roles
- Restaurant admin
- Owner
- Cashier
(Same set that accesses Audit Report today.)

## Affected Modules / Screens
- Module: **Reports / Audit / Summary Module**.
- Also touches **Rooms module** indirectly (reuses room-info payload).
- New files:
  - `frontend/src/pages/RoomOrdersReportPage.jsx`
  - `frontend/src/components/reports/RoomRowCard.jsx`
  - `frontend/src/components/reports/RoomOrdersTable.jsx` (or reuse existing `OrderTable.jsx` for the child order list)
- Modified files:
  - `frontend/src/App.js` (new route)
  - `frontend/src/components/layout/Sidebar.jsx` (new menu entry)
  - `frontend/src/api/services/reportService.js` (optional helper: `getRoomGroupedOrders(date)` that wraps `getOrderLogsReport` + grouping — or keep the grouping inside the page component)

## Affected Order Types / Channels
- Scope = room orders only (`order_in ∈ [RM, SRM]` or `payment_method === 'ROOM'`).
- Table / dine-in / takeaway / delivery orders NOT shifted to a room: out of scope.

## Admin / Settings Impact
- Not applicable for Phase 1.

## API Impact
- **No new endpoint needed for Phase 1.**
- Reuses:
  - `POST /api/v2/vendoremployee/order-logs-report` (day list)
  - `POST /api/v2/vendoremployee/get-single-order-new` (per-room detail, on expand)

## Socket Impact
- No socket subscription added in Phase 1. (Future Phase: subscribe to `new_order` / `order-engage` to update room row counts live.)

## Data / Payload Impact
- No new fields needed. `room_info` and `associated_order_list[]` already present on the existing `get-single-order-new` response (verified in `frontend/src/api/transforms/orderTransform.js` lines 256–285).

## Printing / KOT / Bill Impact
- No impact in Phase 1 (folio print is Future Phase).

## Reporting / Analytics Impact
- Additive: a new view. Does not change any existing report figures.
- Explicitly depends on CR-001 having removed room orders from the Audit Report, to avoid double counting.

## Backward Compatibility
- New view; nothing to migrate. Feature additive.

## Edge Cases
- EC-1: Room with only SRM orders and no RM parent → use `parent_order_id` grouping (CS-2 fallback).
- EC-2: Multiple guests checked into the same room across the day → TBD (OQ-R1). Phase 1 treats each room_id as one row; operator can see timestamps.
- EC-3: RM parent order with no `room_info` (billing not set up) → show warning badge (CS-6).
- EC-4: `associated_order_list[]` empty → show room with rent/advance only, no child section.
- EC-5: Room checked in across midnight (overlapping business days) → Phase 1 uses existing business-day logic from `/utils/businessDay.js`; confirm acceptable (OQ-R2).
- EC-6: Same room ID reused after checkout + new check-in same day → Phase 1 may collapse into one row. Needs clarification (OQ-R3).
- EC-7: Loading state while expanding a row → show inline spinner within the expanded area.
- EC-8: `get-single-order-new` call fails for one room → show an inline retry button on that row; rest of the view remains usable.

## Assumptions
- A-1: `get-single-order-new` on any RM-type parent order returns `room_info` and `associated_order_list[]` — verified in code (`orderTransform.js`).
- A-2: `ORDER_LOGS_REPORT` returns RM orders with a populated `table_no` that represents the room number — verified via existing `extractLocation` logic in `reportTransform.js`.
- A-3: `parent_order_id` on SRM orders is a room identifier (not a different order ID) — stated in `reportTransform.js` comment line 105.
- A-4: CR-001 will be implemented before or alongside CR-004 so the Audit Report already excludes room orders, avoiding double counting.

## Open Questions
| Question | Why It Matters | Status |
| --- | --- | --- |
| OQ-R1 (ANSWERED 2026-04-28): Multiple guests into the same room across a day — show one row or one row per check-in session? | Answered: **One row per room (keyed by RM parent order_id).** Each unique RM-parent order_id → one row. Multiple same-day check-ins on the same room number but different order_ids → separate rows. | Answered |
| OQ-R2 (ANSWERED 2026-04-28): Business-day treatment for rooms checked in across midnight. | Answered for Phase 1: **use the existing Audit Report business-day logic** (`/utils/businessDay.js`). **Marked as a known Phase-2 follow-up** — this needs to change later to respect hotel-stay boundaries (not restaurant business day). Tracked as a deferred item for CR-004 Phase 2. | Answered with Phase-2 flag |
| OQ-R3 (ANSWERED 2026-04-28): Same room checked out and re-checked-in the same day — how to visually separate? | Answered: **Two separate rows, each shown with its room number and its own parent order_id.** Order IDs are separate, so rows are separate. | Answered |
| OQ-R4 (ANSWERED 2026-04-28): Should rooms with zero food orders (only rent + advance) appear? | Answered: **Yes.** Rent / advance is activity. | Answered |
| OQ-R5 (ANSWERED 2026-04-28): Source label on child (associated) orders — dine-in / bar / spa / takeaway / delivery, or a generic label? | Answered: **Use the generic label "Associated order"** for each child order in Phase 1. Do not split by source (no need to derive from `order_type` or area). Keep the child list simple. | Answered |

## User Decisions
| Decision | User Answer | Date |
| --- | --- | --- |
| Approach V1 — use existing `ORDER_LOGS_REPORT` + `get-single-order-new` (no new backend) | Confirmed (Option L1) | 2026-04-28 |
| V2 — Lazy-load per-room detail on row expand | Confirmed | 2026-04-28 |
| V3 — RM order with no `room_info` → flag as warning (indicates room billing not set up) | Confirmed | 2026-04-28 |
| V4 — Rooms can have ONLY SRM orders without an RM parent → fallback grouping by `parent_order_id` required | Confirmed | 2026-04-28 |
| V5 — Room orders and table orders share the same numeric order-ID series | Confirmed | 2026-04-28 |
| Scope — Phase 1 is read-only; actions (print folio, add payment, checkout) are Future Phase | Confirmed by exclusion | 2026-04-28 |
| R1: one row per room, keyed by RM parent `order_id` | Confirmed | 2026-04-28 |
| R2: Phase 1 uses existing restaurant business-day logic; Phase 2 must switch to hotel-stay-based day boundaries | Confirmed | 2026-04-28 |
| R3: Back-to-back check-ins on the same room on the same day render as two separate rows (separate parent order IDs) | Confirmed | 2026-04-28 |
| R4: Rooms with only rent/advance and zero food orders are shown | Confirmed | 2026-04-28 |
| R5: Child orders use the generic label "Associated order" — no per-source breakdown in Phase 1 | Confirmed | 2026-04-28 |

## Risks / Dependencies
- R-1: N+1 network pattern on expand (one detail call per expanded row) — acceptable for typical restaurant room counts (<50/day). If a venue has 100+ rooms/day, consider Option L2 (list endpoint) in Phase 2.
- R-2: `roomService.js` is an existing file; avoid disturbing `checkIn()` logic. New helpers live in `reportService.js` or the page component.
- R-3: CR-001 must merge first (or together) — if Audit Report still contains room orders, users see double counting.
- R-4: `get-single-order-new` is already used on the Audit Report for side-sheet drill-down — same endpoint under reuse. Respect existing caching/engage-lock semantics (no writes here).
- R-5: Missing `room_info` handling (CS-6) is an operator-facing reconciliation signal; placement / wording of the warning badge should be reviewed by product.
- D-1: CR-001 must be implemented before or in parallel with CR-004 (see A-4).
- D-2: All open questions (OQ-R1…R5) are non-blocking for initial drafting but should be resolved before implementation.

## Suggested Phase
- **Phase 1 (this CR):** Read-only view with Option L1 data strategy, expand-to-detail, CSV/PDF export of summary, warning badge for missing room_info.
- **Phase 2 (future CR):** In-house list endpoint (Option L2), real-time socket updates, checked-out history filter, **and hotel-stay-based business-day boundary for rooms (replacing the restaurant business-day logic inherited from Phase 1 — per OQ-R2 answer).**
- **Phase 3 (future CR):** Room-level actions — print folio, add interim payment, checkout & settle. Each needs its own backend endpoint(s).

## Acceptance Criteria
| # | Acceptance Criteria |
| --- | --- |
| 1 | Navigating to `/reports/rooms` renders the Room Orders view with the sidebar "Room Orders" entry highlighted. |
| 2 | The default view lists one row per room, with room number, guest name, check-in time, count of associated orders, total food amount, and outstanding balance indicator. |
| 3 | Expanding a row lazy-loads its detail via `get-single-order-new` and displays rent, advance, balance, and the list of associated orders (including RM-native and SRM-shifted). |
| 4 | Collapsing and re-expanding the same row does NOT trigger a second API call within the same session. |
| 5 | Rooms whose only orders are SRM (no RM parent) are correctly grouped via `parent_order_id` and displayed. |
| 6 | Rooms whose RM parent has no `room_info` display a visible warning badge "Room billing not set up". |
| 7 | Date picker changes the displayed business day and refetches. |
| 8 | CSV and PDF exports produce files reflecting the currently visible room list. |
| 9 | No order shown here appears in the Audit Report (assuming CR-001 is merged). No double counting. |
| 10 | No new backend endpoint is called. Only `ORDER_LOGS_REPORT` and `get-single-order-new` are used. |
| 11 | Page handles loading / empty / error states gracefully per each row. |
| 12 | No regression on Audit Report, Dashboard, Collect Payment, or Room Check-in flows. |

## References Read
- /app/memory/final/CHANGE_REQUEST_PLAYBOOK.md
- /app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md
- /app/memory/final/MODULE_DECISIONS_FINAL.md (section 10 Reports, section on Rooms module)
- /app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md (OD-02 / OQ-12 — Room billing lifecycle deferred)
- Source: /app/frontend/src/api/transforms/orderTransform.js (room_info + associated_order_list — lines 256–290)
- Source: /app/frontend/src/api/transforms/reportTransform.js (extractLocation RM/SRM semantics — lines 101–141)
- Source: /app/frontend/src/api/services/reportService.js (getOrderLogsReport, getSingleOrderNew)
- Source: /app/frontend/src/api/services/roomService.js (checkIn)
- Source: /app/frontend/src/api/constants.js (ORDER_LOGS_REPORT, SINGLE_ORDER_NEW endpoints)
- Source: /app/frontend/src/components/modals/RoomCheckInModal.jsx
- Source: /app/frontend/src/pages/AllOrdersReportPage.jsx (for structural reference)
- Related CR: /app/memory/change_requests/CR_001_all_orders_status_derivation.md
- Related CR: /app/memory/change_requests/CR_002_unify_status_and_tab_logic.md
- Related CR: /app/memory/change_requests/CR_003_paid_hold_order_actions.md

## Note on OD-02 (OQ-12) from FINAL_DOCS_APPROVAL_STATUS.md
- FINAL_DOCS_APPROVAL_STATUS.md tracks "Room billing and print lifecycle ownership" as **still deferred** (OD-02 / OQ-12). CR-004 Phase 1 is **read-only** and does not change existing room billing/print behavior — it only surfaces existing backend data. No OD-02 policy decision is required for Phase 1. OD-02 must be resolved before Phase 3 (print folio / add payment / checkout).

## Ready for Next Agent?
- Yes — CR is frozen. Ready for Change Request Impact Analysis Agent.

## Next Agent
- Change Request Impact Analysis Agent
