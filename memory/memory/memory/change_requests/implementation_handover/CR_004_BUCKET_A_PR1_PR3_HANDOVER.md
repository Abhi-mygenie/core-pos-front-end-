# Bucket A — CR-004 Phase 2 PR-1 + PR-3 — Implementation Handover

**CR references:**
- `memory/change_requests/CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md` § 4 (PR-1) and § 5A (PR-3)

**Approved scope (Bucket A only):**
- PR-1 — Add a `Paid` column to the Room Orders Report row strip and a matching `Paid` stat to the SummaryBar.
- PR-3 — Rename `Rent` → `Total` in the expanded ROOM BILLING side card.

PR-2 (Remove from Room button) is NOT in this bucket.

## Files changed
| File | Edit |
|---|---|
| `frontend/src/components/reports/RoomRowCard.jsx` | (PR-3) `Rent` label → `Total` in `RoomBillingCard` (kept value = `roomInfo.roomPrice` unchanged). (PR-1) `numbers` memo extended with `paid: Math.max(0, total − outstanding)` plus `paid: null` in the empty-state branch. (PR-1) New Paid cell in the row strip between Total and Outstanding, neutral `text-zinc-900`, same skeleton/error/formatter as Total. |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | (PR-1) `RoomRowsHeader` — inserted `<div className="w-20 text-right">Paid</div>` between Total and Outstanding. (PR-1) `SummaryBar` — added `<SummaryStat label="Paid">` between Food and Outstanding (with divider). (PR-1) `summaryTotals` memo — added `paid` accumulator using the same per-row formula (`Math.max(0, rowTotal − rowOut)`); returned as `null` until any row resolves. (PR-1) `<SummaryBar>` instance threaded `paid={summaryTotals.paid}`. |

## Behavior changed
- New per-row `Paid` cell, derived as `max(0, total − outstanding)`. Clamped at 0 — never negative.
- New SummaryBar `Paid` stat = Σ row.paid across visible (post-filter) rows. Renders the existing transient inline spinner / "(N of M)" hint while detail fetches roll in, identical to Total/Food/Outstanding.
- Room billing side card (expanded view) labels the room-price line as `Total` instead of `Rent`. Numeric value, ordering, and styling unchanged.

## API / socket assumptions
- **No** new endpoints. **No** payload contract changes. **No** new socket subscriptions.
- Reads existing `detail.roomInfo.roomPrice`, `detail.roomInfo.balancePayment`, `detail.amount`, and `detail.associatedOrders[].amount` already wired in CR-004 Phase 1.

## Live validation (already done)
Verified on preprod (`https://14b10deb-...preview.emergentagent.com/reports/rooms`, Owner login):
- Header reads exactly `Room | Guest | Check-in | Transferred | Food | Total | Paid | Outstanding`.
- SummaryBar reads `Rooms 2 · Total ₹23,629 · Food ₹13,297 · Paid ₹810 · Outstanding ₹22,819`.
- Row math: r2 → `Total ₹333 − Outstanding ₹300 = Paid ₹33`; r1 → `Total ₹23,296 − Outstanding ₹22,519 = Paid ₹777`. Sum `₹33 + ₹777 = ₹810` matches SummaryBar Paid.
- Expanded ROOM BILLING card shows `Total ₹333 / Advance ₹33 / Balance ₹300 / Food ₹0` for r2 — `Rent` label is gone.
- ESLint clean on both files. Webpack compiled with only the pre-existing unrelated `LoadingPage.jsx` warning.

## QA — quick manual smoke (you do this)
1. Open `/reports/rooms` on preprod. Confirm a row with non-zero balance shows: **Total − Outstanding = Paid**, and the SummaryBar `Paid` stat equals the visible rows' Paid sum.
2. Click chevron on any room → expanded card's first label reads **`Total`** (not `Rent`); value unchanged from before.

## Known limitations
- The **Total** column header in the row strip is still `w-20` while the cell beneath it is `w-24` — pre-existing alignment quirk inherited from CR-004 Phase 1, intentionally NOT touched (out of scope; coding-guidelines DRY/no-refactor rule).
- The **Total** label in the expanded ROOM BILLING card means `room price only` (`roomInfo.roomPrice`); the **Total** column in the row strip means `room price + food`. Two definitions of the same word on the same screen, accepted per CR § 5A "Terminology check".

## Backend pending items
None for this bucket. Buckets B / C / D-1 / E remain queued (per the consolidated plan).

## Next agent
- Implementation Agent — pick up Bucket B (FE-1 Phase 2 single-shot: filter-pill-driven data source, removes the `[CR-004 P2 DIAG]` block, wires DatePicker `disabled`/`tooltip`).
- OR Bucket D-1 (CR-001 SRM-badge frontend workaround using `/get-room-list` cross-reference).
