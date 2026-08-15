# Bucket B — CR-004 Phase 2 (FE-1) — Implementation Handover

**CR reference:** `memory/change_requests/CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md`

**Approved scope (Bucket B only):** Filter-pill-driven data source for `/reports/rooms`. Single-shot (no Phase a / Phase b split — backend has shipped `order_id` on `/get-room-list` and the in-house-only filter is already server-side).

## Files changed
| File | Edit |
|---|---|
| `frontend/src/api/transforms/roomListTransform.js` (NEW) | Normalises a `/get-room-list` item into the page's `RoomRow` seed shape (`_source: 'live'`). Skips rooms without `order_id`. |
| `frontend/src/api/services/reportService.js` | (a) Imports `transformRoomListToRows` and `getRoomList`. (b) Adds `orderLogsRowToRoomRowSeed` to convert an `/order-logs-report` row to the same seed shape (`_source: 'logs'`). (c) Adds `getRoomsForReport(filter, selectedDate, schedules)` — internalises the source switch: `unpaid` → `/get-room-list` only; `paid` → `/order-logs-report` filtered to `orderIn==='RM' && status==='paid'`; `all` → both in parallel, deduped by `parentOrderId` (live wins). |
| `frontend/src/components/reports/DatePicker.jsx` | Accepts new `disabled` (boolean) and `tooltip` (string) props. When `disabled`, the trigger and prev/next-day buttons are inert + greyed; the dropdown will not open. `tooltip` is surfaced on the trigger button regardless of disabled state. |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | (a) Replaces the import of `getOrderLogsReport` with `getRoomsForReport`. (b) `fetchOrders` now delegates to `getRoomsForReport`; `statusFilter` added to deps so a pill change re-runs the fetch. (c) Removed the `[CR-004 P2 DIAG]` block (lines 400–429). (d) `roomRows` memo simplified to consume pre-shaped seeds, with a `getTableById` fallback for logs-source rows that lack `roomNumber`. (e) `visibleRows` is now identical to `roomRows` — the helper does the filtering at fetch time. (f) `<DatePicker>` wired with `disabled={statusFilter==='unpaid'}` and a per-filter `tooltip` per the locked matrix. (g) Removed the now-obsolete "Loading remaining room details…" hint. |

## Behavior changed
- **Unpaid pill:** lists every currently-checked-in room (regardless of date). Backend returns only in-house rooms; no defensive client-side filter. Date picker disabled with tooltip *"Currently checked-in rooms — date doesn't apply"*. Network: only `/get-room-list` + lazy per-row `/get-single-order-new`.
- **Paid pill:** unchanged behaviour — `/order-logs-report` filtered to RM rows with `status==='paid'`. Date picker active.
- **All pill:** union of (a) live in-house rooms + (b) settled rooms from selected business day. Each room appears at most once (live source wins on dedupe). Date picker active with tooltip *"Date affects settled rooms only"*. Network: both endpoints in parallel.
- Filter pill switching triggers a single fresh fetch (replaces detail cache, resets `resolvedTick`).

## API / socket assumptions
- **No** new endpoints. **No** payload contract changes. **No** new socket subscriptions.
- Reads `order_id` field on `/get-room-list` items (already shipped by backend, verified live preprod 2026-04-29).
- Backend's server-side filter excluding checked-out rooms is assumed (also verified live: only the currently-in-house r2 returned today; the settled r1 absent).

## Quick manual smoke (you do this — 2 steps)
1. Open `/reports/rooms`. Click **Unpaid** → date picker greys out and tooltip on hover reads "Currently checked-in rooms — date doesn't apply"; the list shows currently in-house rooms only. Click **Paid** → date picker active, list shows only settled-on-this-day RM rows. Click **All** → list = live + today's settled rows, deduped (no duplicate room).
2. Open browser network tab → on **Unpaid**: only `/get-room-list` + `/get-single-order-new` per row. On **Paid**: only `/order-logs-report` + per-row `/get-single-order-new`. On **All**: both endpoints fire in parallel on the initial load.

## Known limitations
- The CR's "defensive checked-out filter" (Rule 3) is intentionally NOT included because backend already filters server-side. If a stale checked-out room ever leaks through in the future, a defensive guard can be added in `transformRoomListToRows` then.
- The `[CR-004 P2 DIAG]` and `[CR-001 G5 DIAG]` / `[CR-001 P2 DIAG]` console diagnostics in `reportService.js` are unrelated to this CR and remain in place.
- Live-source rows have `restaurantOrderId: null` until the per-row detail fetch resolves — visible nowhere on the page today, but a downstream consumer that needs it pre-detail must fetch the detail first.

## Backend pending items (unchanged from prior plan)
- BE-1 G3 (refresh `associated_order_list[].payment_status` on RM parent's `/get-single-order-new` post-checkout) — partial; affects Outstanding accuracy on recently-settled rooms in **All**.
- BE-1 P1–P5 display fields on `/order-logs-report` — frontend follow-ups are 1-line resolver flips when delivered.
- CR-001 FE-3 SRM badge fix (Bucket D-1) — still queued. Live data refuted the CR's premise; frontend workaround using `/get-room-list` cross-reference is recommended.

## Next agent
- Implementation Agent — pick up Bucket D-1 (CR-001 FE-3 frontend workaround) or Bucket C (FE-2 PR-2 Remove from Room).
