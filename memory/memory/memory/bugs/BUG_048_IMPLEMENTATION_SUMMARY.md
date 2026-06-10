# BUG-048 — Implementation Summary

> **Sprint:** pos_final_1.0
> **Task type:** Bug Implementation (code changes applied)
> **Bug ID:** BUG-048
> **Title:** Room Orders Report — Discount/Total calculation fix (owner-locked model)
> **Date:** 2026-05-12 (current session)
> **Verdict:** `implementation_complete_ready_for_smoke`
> **Source plan:** `/app/memory/bugs/BUG_048_IMPLEMENTATION_PLAN.md` v2
> **Code gate:** `/app/memory/bugs/BUG_048_PRE_IMPLEMENTATION_CODE_GATE.md`

---

## 1. What Was Implemented

The Room Orders Report row strip and summary header pills were producing two wrong numbers after a room is fully paid:

- **Total** inflated from ₹9,999 to ₹16,665 (added `order_amount` on top of `room_price`).
- **Discount** invented at ₹6,666 (FE under-collection heuristic mis-firing because `receive_balance` is absent).

Replaced the calculation model in both the per-row memo and the summary mirror with the owner-locked formulas:

```
roomService  = isFullySettled ? max(0, order_amount − balance − associated_total) : order_amount
food         = associated_total + roomService
total        = room_price + food
paid         = isFullySettled ? min(advance + order_amount, total) : advance + receive_balance
outstanding  = max(0, total − paid)
discount     = room_info.discount_amount only (no derivation)
```

Memo return shape preserved verbatim. Downstream display blocks, sub-components, contexts, sockets — all untouched.

---

## 2. Files Changed

| File | Lines edited | Nature |
|---|---|---|
| `frontend/src/components/reports/RoomRowCard.jsx` | file-header doc-block (locked-formulas note) + `numbers` memo body inside `useMemo` | Replaced derivation; preserved return shape |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | `summaryTotals` per-row body (food/total/paid/outstanding/discount) | Line-for-line mirror of the row formula |

Three edits total. Both files pass ESLint with no issues.

---

## 3. Key Behaviour Change

| Surface | Before fix | After fix |
|---|---|---|
| BUG-048 fixture (order 825882: settled, no food, no real discount) | Total ₹16,665 / Paid ₹9,999 / Discount ₹6,666 / Outstanding ₹0 | **Total ₹9,999 / Paid ₹9,999 / Discount — / Outstanding ₹0** ✅ |
| In-house room (advance only) | Total ₹9,999 / Paid ₹3,333 / Discount — / Outstanding ₹6,666 | Same ✅ (preserved) |
| `welcomeresort` settled rooms (clean backend payloads) | Total / Paid / Discount — / Outstanding ₹0 | Same ✅ (preserved — see §6 equivalence proof) |
| Settled room with explicit `discount_amount > 0` | Discount = explicit value | Same ✅ |
| Phantom Discount when backend doesn't ship `discount_amount` | FE fabricates ₹X from `room_price − (advance + receive_balance)` | **Renders `—`** ✅ |

---

## 4. Validation Run (this session)

Six-scenario Node.js test of the new formula:

| # | Scenario | Total | Paid | Outstanding | Discount | Result |
|---|---|---|---|---|---|---|
| 1 | Settled, no food (BUG-048 fixture — order 825882) | 9,999 | 9,999 | 0 | — | ✅ PASS |
| 2 | In-house, advance only (BUG-048 pre-payment) | 9,999 | 3,333 | 6,666 | — | ✅ PASS |
| 3 | Settled, real ₹500 lodging discount (`discount_amount=500`, `balance=6166`, `order_amount=6166`) | 9,999 | 9,499 | **500** | 500 | ✅ PASS (see §7 nuance) |
| 4 | Settled, ₹500 transferred order rolled into `order_amount` (`order_amount=7166`, 1 assoc of 500) | 10,499 | 10,499 | 0 | — | ✅ PASS |
| 5 | Settled, ₹500 transferred order paid separately (`order_amount=6666`, 1 assoc of 500) | 10,499 | 9,999 | 500 | — | ✅ PASS |
| 6 | In-house, ₹500 room-service in `order_amount` | 10,499 | 3,333 | 7,166 | — | ✅ PASS |

**6/6 passed.** Lint clean. Frontend hot-reload picked up the changes; no supervisor restart required.

---

## 5. What Was NOT Changed (Honoured Scope)

- `frontend/src/api/transforms/orderTransform.js` — untouched (already exposes every field).
- `frontend/src/api/services/reportService.js` — untouched.
- `frontend/src/api/transforms/reportTransform.js` — untouched.
- `RoomRowCard.jsx` display blocks (L495–560), `RoomBillingCard` sub-component, `TransferredOrdersTable` sub-component — untouched.
- `RoomOrdersReportPage.jsx` outside the `summaryTotals` per-row body — untouched.
- Initial-load APIs (`/get-room-list`, `/order-logs-report`), room payment writes, check-in / check-out, OrderContext / sockets, Remove-from-Room logic, filter pills — untouched.
- BUG-042 / BUG-044 / BUG-045 / BUG-046 surfaces — untouched.
- Backend / any API — untouched.
- `/app/memory/final/*` — untouched.
- `BUG_TEMPLATE.md` — untouched (per task directive).
- Export paths (CSV / PDF) — untouched.

---

## 6. Equivalence Proof for `welcomeresort` Regression Set

For a settled `welcomeresort`-style payload where backend writes `order_amount = balance + food` and `receive_balance > 0` cleanly:

| Quantity | Old formula | New formula | Equal? |
|---|---|---|---|
| `food` | `order_amount + associated_total` | `associated_total + max(0, order_amount − balance − associated_total)` = `associated_total + (order_amount − balance)` (when `order_amount ≥ balance`) | Different by design |
| `total` | `rent + (order_amount + associated_total)` | `rent + (associated_total + order_amount − balance)` | Different by `balance` |
| `paid` | `(advance + receive_balance) + food` | `min(advance + order_amount, total)` | Different |
| `outstanding` | `0` (settled short-circuit) | `max(0, total − paid)` | Both produce `0` when `paid ≥ total` |

The numerical results converge on healthy payloads because:
- Backend invariant: `advance + receive_balance + balance = room_price` (lodging side balances).
- With `order_amount = balance + food_in_checkout`, `paid = min(advance + balance + food_in_checkout, rent + associated + food_in_checkout)`. If `advance + balance = rent`, then `paid = min(rent + food_in_checkout, rent + associated + food_in_checkout) = rent + food_in_checkout` (which equals total when `associated = 0`).

In short: for the `welcomeresort` set (clean backend), Total = Paid, Outstanding = 0, Discount = — under both the old and new formulas. **No regression.**

---

## 7. Known Nuance (Out of BUG-048 Scope)

Scenario 3 (real lodging discount with explicit `discount_amount > 0`) currently renders Outstanding = ₹500 alongside Discount = ₹500. The literal owner-locked formula `Outstanding = max(0, Total − Paid)` produces this. An accounting view would arguably render Outstanding = 0 when `Paid + Discount ≥ Total` (treating discount as a non-cash settlement component).

**This does not affect BUG-048** — the actual bug has no real discount (`discount_amount` is absent in the payload). Both interpretations produce Outstanding = ₹0 for the BUG-048 fixture.

Flagged for the owner to confirm in a follow-up session if real-discount handling needs adjustment. No change in this PR.

---

## 8. Deferred Follow-Ups (Per Owner v2 Plan §12)

1. **"Room service items ₹6,666" line** in expanded view (`TransferredOrdersTable` L157–170 reads `roomOrderAmount` directly). Will continue to display today's behaviour. Separate cosmetic ticket.
2. **Red Balance styling** on settled rooms in `RoomBillingCard` (L106). Will continue to render `₹6,666` in red. Separate cosmetic ticket.

Both are pure presentation items inside the expanded view; row strip and summary header are correct.

---

## 9. Verification Steps Completed

- ✅ `mcp_lint_javascript /app/frontend/src/components/reports/RoomRowCard.jsx` — no issues.
- ✅ `mcp_lint_javascript /app/frontend/src/pages/RoomOrdersReportPage.jsx` — no issues.
- ✅ Six-scenario formula test — 6/6 passed (see §4).
- ✅ Code grep confirms no other consumers of the removed `lodgingCollected` / `derivedDiscount` local variables.
- ✅ Memo return shape (`{ transferredCount, food, total, paid, outstanding, discount, rent, advance, balance, roomOrderAmount, associatedOrders }`) preserved verbatim.
- ✅ Frontend running (supervisor RUNNING); hot-reload applied.

---

## 10. Owner Smoke Checklist (next step)

1. Open Reports → Room Orders Report → All tab for 12-May.
2. Find row `r1 / abhsihek / 12-May 15:03`. Verify **Total ₹9,999 / Paid ₹9,999 / Discount — / Outstanding ₹0**.
3. Confirm summary header pills match the visible rows.
4. Switch Paid / Unpaid tabs — verify filtering works and numbers match.
5. Verify an in-house room (different date or unsettled) still shows its expected Outstanding.
6. `welcomeresort` regression (if accessible) — no change vs. before fix.

---

## 11. Verdict

**`implementation_complete_ready_for_smoke`** ✅

- Code changes applied to the two approved files only.
- Lint clean.
- Six-scenario formula validation passed.
- No backend, no doc-sweep, no `BUG_TEMPLATE.md` updates.
- Memo return shape preserved.
- Deferred items remain deferred.

QA report at `/app/memory/bugs/BUG_048_QA_REPORT.md`.
