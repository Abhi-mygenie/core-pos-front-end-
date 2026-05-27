# Bucket D-1 — CR-001 FE-3 SRM Badge Frontend Workaround — Implementation Handover

**CR reference:** `memory/change_requests/CR_001_AUDIT_SRM_BADGE_FIX.md` (FE-3)

**Approved scope (Bucket D-1):** Frontend-only fix — bypasses the withdrawn BE-1 G1 backend ask. Live validation against preprod (2026-04-29) refuted the FE-3 doc's premise that backend flips `payment_method` post-checkout, so the doc's prescribed "narrow the override" was a no-op. This bucket implements the actual working fix using a `/get-room-list` cross-reference.

## Files changed
| File | Edit |
|---|---|
| `frontend/src/api/services/reportService.js` | (a) New exported helper `getActiveSrmIds()` — calls `getRoomList()`, then per in-house room calls `getSingleOrderRoom(order_id)` in parallel, collects every `associatedOrders[].orderId` into a `Set<number>`. Returns the set, OR `null` on partial failure (sentinel = "fall back to broad override"). (b) `getOrderLogsReport(date, schedules, sortBy?, activeSrmIds?)` — new optional 4th param. (c) The `transferToRoom → running` override (line ~516) now consults the set: forces `'running'` only when `activeSrmIds === null` OR `activeSrmIds.has(api.id)`. Otherwise falls through to the rest of the chain (`payment_status === 'unpaid'` then `fStatus === 6 → 'paid'`). |
| `frontend/src/pages/AllOrdersReportPage.jsx` | (a) Imports `getActiveSrmIds`. (b) `fetchOrders` now calls `getActiveSrmIds` + `getRunningOrders` in parallel, then `getOrderLogsReport(...)` with the set as the 4th arg. |

## Behavior changed
- **Audit Report (`/reports/audit`)**: SRM rows whose linked room has been checked out and settled now derive to `'paid'` (their `f_order_status === 6`) and route to the Paid tab. SRM rows whose linked room is still in-house remain on the Running tab — same as before.
- **Room Orders Report (`/reports/rooms`)**: unchanged — `activeSrmIds` is not passed, override stays broad. The page filters by `orderIn === 'RM'` so the override doesn't fire on its rows anyway.
- All other consumers of `getOrderLogsReport` (none in current codebase besides the two pages above) keep pre-Bucket-D-1 behaviour because `activeSrmIds` defaults to `null`.

## API / socket assumptions
- **No** new endpoints, **no** payload contract changes, **no** new sockets.
- Reads: `order_id` on each `/get-room-list` item (verified shipped); `associated_order_list[].id` on `/get-single-order-new(roomOrderId)` (verified shipped — though `payment_method` / `payment_status` / `f_order_status` on those children are degraded per BE-1 G3, the `id` is what we need).

## Live validation (preprod, 2026-04-29)
- `getRoomList()` → 1 in-house room (r2, `order_id=731925`).
- `getSingleOrderRoom(731925)` → `associated_order_list = []` (no SRMs currently transferred to r2).
- `activeSrmIds = Set()`.
- `/order-logs-report` row id=731922 (the SRM child of the SETTLED room r1) has `payment_method='transferToRoom', f_order_status=6, payment_status=null`.
- `activeSrmIds.has(731922)` is `false` → override skipped → `paymentStatus !== 'unpaid'` → `fStatus === 6` → `status='paid'` ✓ (correct: the SRM falls into the Paid tab now, was perpetually under Running before).

## Cost
- 1 `/get-room-list` call + N `/get-single-order-new` calls (N = currently in-house rooms; preprod today: 1) on every Audit Report fetch. Calls run in parallel inside `getActiveSrmIds`. Bounded latency ≈ 100–200 ms before `/order-logs-report` fires.
- Failure handling: if `/get-room-list` throws OR any folio fetch throws, `getActiveSrmIds` returns `null` so the override falls back to the conservative pre-Bucket-D-1 behaviour ("force running for every transferToRoom"). Audit Report continues to function — just shows the legacy bug for the duration of the failure.

## Quick manual smoke (you do this — 2 steps)
1. Open `/reports/audit`. The transferToRoom row whose parent room has been checked out today should now appear under the **Paid** tab (badge `Paid`), with the `transferToRoom` literal still in the Payment column. Pre-fix, this row was under Running.
2. While a room is currently in-house with a transferred-from-table SRM, that SRM should still appear under **Running** tab (badge `Running`). Same as before.

## Known limitations
- The redundancy with `/reports/rooms` (which also fetches per-room folios) is acknowledged. A future optimisation is to cache `/get-room-list` + per-room folios at the app level (e.g., a `useRoomList()` context) so both screens share one in-house snapshot. Out of scope for this CR.
- If BE-1 G3 ever ships and the embedded `associated_order_list[].payment_method` becomes accurate, we could optionally narrow the activeSrmIds set further to "only transferToRoom children" (today we collect every child id, which is fine because non-transferToRoom children won't be matched by the override anyway).

## Backend pending (now eligible for un-withdrawal)
- **BE-1 G1** — adding `is_room_settled` (or `room_settled_at`) to each `transferToRoom` row in `/order-logs-report` would let us drop `getActiveSrmIds` entirely and replace the override with a 1-line conditional. Not blocking — Bucket D-1 stands on its own.

## Next agent
- Implementation Agent — pick up Bucket C (FE-2 PR-2 Remove from Room button).
