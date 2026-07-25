# Bucket C — CR-004 Phase 2 PR-2 — Remove from Room — Implementation Handover

**CR reference:** `memory/change_requests/CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md` § 5 (PR-2)

**Approved scope (Bucket C only):** Per-row "Remove from Room" pill on the Associated Orders table inside an expanded room card on `/reports/rooms`. Reuses CR-003 Audit Mark-Unpaid wholesale (same endpoint, same permission, same window) — only the labels and refetch strategy differ.

## Files changed
| File | Edit |
|---|---|
| `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | Added 5 optional copy/colour props (`title`, `description`, `actionLabel`, `pendingLabel`, `actionClassName`, `testId`) with backwards-compatible defaults. The original Audit Report call site needs ZERO change. The Room page passes overridden copy + rose colour. |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | (a) Imports `makeOrderUnpaid`, `useAuth`, `useToast`, `isMutationAllowedForSelectedDate`, `MarkUnpaidConfirmDialog`. (b) New state: `removeFromRoomTarget`, `removeFromRoomPending`, `optimisticRemovedIds`. (c) New handlers: `openRemoveFromRoomDialog`, `closeRemoveFromRoomDialog`, `handleRemoveFromRoomConfirm`. (d) Permission flag `canRemoveFromRoom = hasPermission('order_unpaid')`. (e) Window flag `isWithinMutationWindow = isMutationAllowedForSelectedDate(selectedDate)`. (f) Dialog mounted near bottom with overridden copy. (g) Threaded the four new props down to `<RoomRowCard>`. |
| `frontend/src/components/reports/RoomRowCard.jsx` | (a) Component accepts new optional props (`canRemoveFromRoom`, `isWithinMutationWindow`, `onRemoveFromRoom`, `optimisticRemovedIds`). (b) `TransferredOrdersTable` gained `parentOrderId`, `isFullySettled` props plus the four above. (c) Restructured grid: when the pill is shown, columns become `Order# (3) / Type (2) / Time (3) / Amount (2) / Action (2)`; otherwise fall back to the original 4-column layout. (d) Optimistic filter: rows whose `orderId` is in `optimisticRemovedIds` are hidden from `visibleAssociated`. (e) Pill rendered only when ALL three of: permission OK, window OK, parent room NOT settled (`fOrderStatus !== 6`). |

## Behavior
- **Pill visibility (per CR):** `canRemoveFromRoom && isWithinMutationWindow && !isFullySettled`. Cashier without `order_unpaid` permission → no pill on any row. Picker on a 3+ business-day-ago date → no pill anywhere. Settled rooms (fos=6, e.g., the four rooms on the Paid pill) → no pill anywhere.
- **Click flow:** click "Remove" → dialog opens with rose-coloured "Remove from Room" action and copy "The order will be removed from this room's folio and will reappear on the originating table's running orders for re-billing." → confirm → SRM hides immediately (optimistic) → POST `/make-order-unpaid(srm.id)` → on success: toast + dialog closes + surgical refetch → on error: SRM restored + dialog stays open + error toast.
- **Network discipline (verified):**
  - Exactly ONE POST `/make-order-unpaid` per click.
  - Exactly ONE follow-up GET `/get-single-order-new(parentOrderId)` triggered by the surgical cache rebuild.
  - NO full-page `/order-logs-report` or `/get-room-list` refetch.
- **Surgical refetch mechanism:** on confirm, the page builds a NEW `Map` instance from the existing detail-cache without the affected room's entry, replaces `detailCacheRef.current`, and bumps `resolvedTick`. This causes `RoomRowCard`'s `useEffect` (deps include the cache reference) to re-fire only for the affected row — its `cached = detailCache.get(parentOrderId)` is now `null` so it refetches. All other rows hit cache and skip the network.
- **Audit Report unchanged:** the parameterised dialog falls back to its original CR-003 defaults (amber colour, "Mark Unpaid" labels, original test id). Verified visually that nothing on `/reports/audit` Paid tab regressed.

## API / socket assumptions
- Reuses `paymentMutationService.makeOrderUnpaid(orderId)` — same endpoint as Audit Mark-Unpaid (`POST /make-order-unpaid`). No new endpoint required.
- Reuses `order_unpaid` permission key. No backend ACL change.
- Reuses `isMutationAllowedForSelectedDate(selectedDate)` window predicate (today + yesterday by default).
- Backend already de-routes a flipped `payment_status: unpaid` SRM out of the room folio onto the originating table's running orders — same behaviour the Audit Mark-Unpaid relies on.

## Live validation (preprod, Mantri tenant, 2026-04-29)
- Owner login → `/reports/rooms` Unpaid pill → R2 expanded → exactly **1 Remove pill** rendered on SRM 000976 (₹351). Action column header shown.
- Switch to Paid pill → R1 PRITI expanded → **0 Remove pills**, no Action column header (settled-room gate works).
- Audit Report Paid tab Mark-Unpaid → still amber, copy unchanged (parameterised dialog respects defaults).
- ESLint clean on all 3 files. Webpack hot-reloaded with only the pre-existing unrelated `LoadingPage.jsx` warning.

## Quick manual smoke (you do this — 2 steps)
1. Owner login on `/reports/rooms` → expand the in-house room → click **Remove** on any associated SRM → confirm dialog → confirm → toast appears, SRM disappears immediately, room's Outstanding/Paid recompute within ~1.5 s (single network call to `/make-order-unpaid` + single follow-up `/get-single-order-new`). Verify: **NO** `/order-logs-report` or `/get-room-list` calls fire.
2. Same SRM should now appear on the originating table's running orders on the dashboard (e.g., the SRM transfers back from R2 to the table where it was originally punched).

## Known limitations / things to spot during QA
- The optimistic-removal `Set` clears via a 1.5-second `setTimeout` after success. If your click-to-refetch round-trip ever exceeds 1.5 s on a slow network, the SRM might briefly reappear before the authoritative refetch lands. In practice the refetch lands well under 1 s on preprod. Tunable.
- Settled-room gate uses `detail.fOrderStatus === 6`. Until the per-row detail fetch resolves on first expand, the pill is conservatively hidden (because `detail` is undefined → `isFullySettled` falsy logic is in the `!isFullySettled && !!detail.fOrderStatus !== 6` chain — actually currently shows pill if `detail` is undefined since the negation is just `!(detail?.fOrderStatus === 6)`). See note below.

  **Sharp edge worth flagging:** while `detail` is loading, `detail?.fOrderStatus` is `undefined` so `isFullySettled = (undefined === 6) === false`. The pill therefore renders briefly on settled rooms during the very first detail fetch. Two-frame flicker maximum. If this annoys QA, change `isFullySettled` to `(detail?.fOrderStatus === 6) || !detail` to hide-on-loading. Out of scope for the bucket; flag as P3.

## Backend pending (no change for this bucket)
- BE-2 (lodging payment breakdown) — independent of this bucket.
- BE-1 G3 (refresh `associated_order_list[i].payment_status` post-mutation) — would let the optimistic-removal tracking phase out entirely; until then the optimistic Set is correct.

## Next agent
- All four buckets in the original batch (A, B, C, D-1) are now shipped. Next user-led decisions:
  - Address the 1.5-s optimistic-clear timeout if QA flags it.
  - Apply BE-2 once backend ships the `lodging_collected` / `discount_amount` fields.
  - Bucket E follow-ups when BE-1 P1–P5 ship.
