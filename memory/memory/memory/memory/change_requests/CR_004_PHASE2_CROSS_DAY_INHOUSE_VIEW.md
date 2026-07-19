# FE-1: Room Orders Report — Data Layer (Phase 2)

**Ticket type:** Frontend implementation, partial backend dependency
**Owner CR:** CR-004 (Room Orders Report)
**Drafted:** 2026-04-29 (rewritten from `CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md`)
**Status:** `ready_to_implement` (defensive G2 client-side fallback) / `optimal_after_BE-1` (drops fallback once backend G2 ships)
**Estimated effort:** ~½ day

---

## 1. Problem Statement

Today the Room Orders Report (`/reports/rooms`) drives its room list from `/order-logs-report`, which is **date-filtered**. A room checked in 3 days ago and still in-house but with no orders today is invisible on today's date.

Operators need to see, at all times, every currently checked-in room — and *separately* see the historical record of rooms that were settled on a given business day. The two needs are different and must not be conflated under one date picker.

The fix is a **filter-pill-driven data-source split** plus a small set of UX adjustments to the date picker so it doesn't lie to the operator.

---

## 2. Locked design — three rules

### Rule 1 — Filter pill drives the data source

| Filter pill | Source | Date picker effect | Meaning |
|---|---|---|---|
| **Unpaid** | `GET /api/v2/vendoremployee/get-room-list` | **Disabled** with tooltip "Currently checked-in rooms — date does not apply" | All currently in-house rooms, regardless of date |
| **Paid** | `POST /api/v2/vendoremployee/report/order-logs-report` (existing, with date filter) | **Active** — restaurant business-day logic (same as Audit Report) | Rooms whose stay was settled within the selected business day |
| **All** | **Union** of both sources, deduplicated by `parentOrderId` | **Active for the Paid portion only** — Unpaid portion ignores it | Currently in-house rooms + rooms settled within selected business day |

### Rule 2 — `/get-room-list` consumption requires `latest_order_id`

`/get-room-list` today returns only `table` + `user` blocks per room. To fetch the folio (`room_info` + `associated_order_list[]`) the frontend needs the active RM-parent order id. Backend ticket **BE-1** adds `latest_order_id` to each room object — that is the single new field this ticket depends on.

Until BE-1 ships, frontend uses the existing 3-call kludge (1 `/get-room-list` + 1 `/order-logs-report` lookback + N `/get-single-order-new`). Once BE-1 ships the lookback drops, leaving 1 + N.

### Rule 3 — Defensive client-side filter for checked-out rooms

`/get-room-list` may include checked-out rooms today (BE-1 G2 fixes this server-side). Until G2 ships, the frontend must drop any room where:
- `latest_order_id` is null/empty, **OR**
- the room's `/get-single-order-new` response has `room_info.checkout_date` populated AND in the past

Once G2 ships, this defensive filter is removed.

---

## 3. Date picker behavior matrix

| Filter | Date picker | Tooltip on date picker (when disabled) |
|---|---|---|
| Unpaid | disabled (greyed, not interactive) | *"Currently checked-in rooms — date doesn't apply"* |
| Paid | active | (none — normal date picker) |
| All | active (gates only the Paid portion of the union) | *"Date affects settled rooms only"* on hover of the date picker label |

---

## 4. Files to modify

| # | File | Change |
|---|---|---|
| 4.1 | `frontend/src/pages/RoomOrdersReportPage.jsx` | Replace `fetchOrders` (lines 343-394) with a filter-aware fetcher: switch on `statusFilter` to call `getRoomList()`, `getOrderLogsReport(date)`, or both-and-merge. |
| 4.2 | `frontend/src/pages/RoomOrdersReportPage.jsx` | Remove `[CR-004 P2 DIAG]` diagnostic block (lines 404-429) — was always meant to be temporary. |
| 4.3 | `frontend/src/pages/RoomOrdersReportPage.jsx` | Adjust `roomRows` memo (lines 435-470) to handle two row shapes (room-list shape + order-logs shape) and merge / dedupe by `parentOrderId`. |
| 4.4 | `frontend/src/pages/RoomOrdersReportPage.jsx` | Wire `disabled` + `tooltip` props on `<DatePicker />` per the matrix in §3. |
| 4.5 | `frontend/src/components/reports/DatePicker.jsx` | Accept and honour a `disabled` prop + a `tooltip` prop (use existing tooltip primitive). If component doesn't already support `disabled`, add it. |
| 4.6 | `frontend/src/api/services/reportService.js` | Add a thin helper `getRoomsForReport(filter, selectedDate, schedules)` that internalises the filter→source switch. Keep the page lean. |
| 4.7 | `frontend/src/api/transforms/roomListTransform.js` (NEW) | Normalise a `/get-room-list` item into the `RoomRow` shape the page expects. ~50 lines. Includes the defensive checked-out filter (Rule 3). |

---

## 5. The merge logic for "All"

```js
// Pseudocode — inside getRoomsForReport(filter='all', date, schedules):
const [roomList, orderLogs] = await Promise.all([
  getRoomList(),
  getOrderLogsReport(date, schedules),
]);

const inHouse = transformRoomList(roomList);                   // RoomRow[] from /get-room-list
const settled = orderLogs.orders
  .filter(o => o.orderIn === 'RM' && o.status !== 'cancelled' && o.status !== 'merged')
  .map(toRoomRow);                                             // RoomRow[] from /order-logs-report

// Dedupe — a room that's still in-house AND has activity on selected date
// would otherwise appear twice. In-house source wins (carries the live `latest_order_id`).
const seen = new Set(inHouse.map(r => r.parentOrderId));
const unique = [...inHouse, ...settled.filter(r => !seen.has(r.parentOrderId))];
return unique;
```

---

## 6. Acceptance Criteria

- AC-1.1 (Unpaid filter): On Unpaid pill, page lists every currently checked-in room regardless of date, including rooms checked in days ago with zero activity today. Date picker is **disabled** and shows the tooltip from §3.
- AC-1.2 (Paid filter): On Paid pill, page behaves exactly as today (Phase 1) — `/order-logs-report` rows filtered to `orderIn === 'RM'` and `status === 'paid'`, gated by selected business day. Date picker is **active**.
- AC-1.3 (All filter): On All pill, page lists union of (a) all currently in-house rooms + (b) settled rooms from selected business day. Each room appears at most once.
- AC-1.4 (defensive G2): When `/get-room-list` returns a checked-out room, the frontend filters it out. Removed entirely once BE-1 G2 ships.
- AC-1.5 (latest_order_id missing): If a `/get-room-list` item has no `latest_order_id`, the row is skipped silently (between-bookings edge case).
- AC-1.6 (network — Unpaid): Network panel shows ONLY `/get-room-list` + lazy `/get-single-order-new` per expanded row. No `/order-logs-report` call.
- AC-1.7 (network — Paid): No `/get-room-list` call.
- AC-1.8 (network — All): Both endpoints called once on initial load (parallelised).
- AC-1.9 (filter switching): Switching pills triggers a single new fetch, no spurious double-fetch.
- AC-1.10 (date picker tooltip): Hovering the disabled date picker shows the tooltip; clicking does nothing.
- AC-1.11 (regression): `/reports/all-orders` and `/reports/audit` are untouched.

---

## 7. Backend dependency (single field on existing endpoint — see BE-1)

`/get-room-list` must include `latest_order_id` on each room object. Without it, the frontend keeps the kludgy 3-call path and AC-1.6 cannot be met. Defensive room-list filter (Rule 3) plus G2 server-side filter (also in BE-1) together satisfy AC-1.4.

If BE-1 ships piece-by-piece, this ticket can ship in two phases:
- **Phase a (today, with kludge):** ship rules 1+2+3 with the `/order-logs-report` lookback retained for `latest_order_id` derivation. Defensive G2 filter active.
- **Phase b (after BE-1):** delete the lookback and the defensive filter in a 5-line cleanup PR.

---

## 8. Out of scope

- Issue #3 (Rent → Total relabel in side panel) — **lives in FE-2** (`CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md`).
- Issue #2 (Paid column + SummaryBar Paid stat) — **lives in FE-2**.
- Issue #1 (Remove from Room button) — **lives in FE-2**.
- Hotel-stay-based business-day boundary — *dissolved* by Rule 1: Unpaid uses `/get-room-list` (no date), Paid uses existing restaurant-day logic. No separate boundary needed.
- Real-time socket updates when a new order is shifted into a room — Future Phase.
- The G1 SRM-badge derivation issue on the *Audit* Report — separate ticket (`CR_001_AUDIT_SRM_BADGE_FIX.md`).

---

## 9. Risks

| Risk | Level | Mitigation |
|---|---|---|
| BE-1's `latest_order_id` ships with a different field name | Medium | Keep the diagnostic logger in place during the first preprod day; eyeball the response and adjust the transform key in one place. |
| BE-1 G2 delayed → checked-out rooms leak | Medium | Defensive client filter (Rule 3) — removed in cleanup PR after G2. |
| BE-1 G3 delayed → Outstanding stays inflated post-checkout | Medium | Document as known limitation. Operator-facing impact is small (only on the All filter for recently-checked-out rooms). |
| All filter doubles network volume | Low | `Promise.all` parallelises both calls. Total time ≈ slower of the two. |
| Two row shapes diverge (room-list vs order-logs) | Medium | The transform in step 4.7 normalises both to a single `RoomRow` shape; downstream code reads only `RoomRow`. |

---

## 10. Definition of Done

- [ ] All AC items in §6 pass on staging.
- [ ] Phase-a code merged and verified to behave like today's Phase-1 on the Paid filter (no regression).
- [ ] Once BE-1 ships, cleanup PR removes the lookback + defensive G2 filter.
- [ ] `[CR-004 P2 DIAG]` diagnostic block removed.
- [ ] Implementation summary appended to `memory/change_requests/implementation_summaries/CR_004_IMPLEMENTATION_SUMMARY.md`.
- [ ] QA handover appended to `memory/change_requests/qa_handover/CR_004_QA_HANDOVER.md`.

---

## 11. Quick TL;DR

> Filter pill drives the data source: **Unpaid** → `/get-room-list` (no date), **Paid** → `/order-logs-report` (existing date logic), **All** → both, deduped. Date picker disables itself with a tooltip when Unpaid is active. Backend dependency is a single new field `latest_order_id` on `/get-room-list` (tracked in BE-1). Until backend lands, ship with a defensive client-side checked-out filter and the existing `/order-logs-report` lookback for the order id; both come out in a 5-line cleanup PR after BE-1.
