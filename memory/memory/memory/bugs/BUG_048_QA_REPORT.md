# BUG-048 — QA Report

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-048
> **Title:** Room Orders Report wrongly shows Discount column/value and inflated Total after room payment
> **Date:** 2026-05-12 (current session)
> **QA verdict:** **PASS** — ready for owner smoke
> **Implementation summary:** `/app/memory/bugs/BUG_048_IMPLEMENTATION_SUMMARY.md`
> **Plan:** `/app/memory/bugs/BUG_048_IMPLEMENTATION_PLAN.md` v2
> **Code gate:** `/app/memory/bugs/BUG_048_PRE_IMPLEMENTATION_CODE_GATE.md`

---

## 1. Scope of QA

Verify that the fix:
- Produces the correct numbers for the BUG-048 fixture (order 825882: settled, no food, no real discount).
- Preserves in-house row behaviour.
- Preserves `welcomeresort` regression set (settled rooms with clean backend payloads).
- Honours the owner-locked discount rule (no derivation; explicit `discount_amount` only).
- Keeps row and summary-header pills in lock-step.
- Honours all "do not change" surfaces declared in the code gate.

---

## 2. Static QA

| Check | Tool | Result |
|---|---|---|
| ESLint on `RoomRowCard.jsx` | `mcp_lint_javascript` | ✅ No issues |
| ESLint on `RoomOrdersReportPage.jsx` | `mcp_lint_javascript` | ✅ No issues |
| Memo return shape preserved | manual diff vs. pre-change | ✅ Verified — all 11 keys present: `transferredCount`, `food`, `total`, `paid`, `outstanding`, `discount`, `rent`, `advance`, `balance`, `roomOrderAmount`, `associatedOrders` |
| No new external imports | manual diff | ✅ No new imports |
| No removed exports / interface changes | manual diff | ✅ None |
| No untouched-area drift (display blocks, sub-components, transforms, services, page wiring) | manual diff | ✅ None |

---

## 3. Formula Validation (Node.js six-scenario harness)

Harness reimplements the new `numbers` memo body verbatim and asserts on six scenarios that span the full state space (settled vs. in-house × food / no-food / real-discount).

| # | Scenario | `f_order_status` | `room_price` | `advance` | `balance` | `order_amount` | `associated[]` | `discount_amount` | Expected Total | Expected Paid | Expected Outstanding | Expected Discount | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **BUG-048 fixture (order 825882)** | 6 | 9999 | 3333 | 6666 | 6666 | `[]` | absent | **9999** | **9999** | **0** | **0** (renders `—`) | ✅ PASS |
| 2 | In-house, advance only (BUG-048 pre-payment) | ≠6 | 9999 | 3333 | 6666 | 0 | `[]` | absent | 9999 | 3333 | 6666 | 0 | ✅ PASS |
| 3 | Settled, real ₹500 lodging discount | 6 | 9999 | 3333 | 6166 | 6166 | `[]` | 500 | 9999 | 9499 | 500 | 500 | ✅ PASS (see §6 nuance) |
| 4 | Settled, ₹500 assoc rolled into `order_amount` | 6 | 9999 | 3333 | 6666 | 7166 | `[{amount: 500}]` | absent | 10499 | 10499 | 0 | 0 | ✅ PASS |
| 5 | Settled, ₹500 assoc paid separately | 6 | 9999 | 3333 | 6666 | 6666 | `[{amount: 500}]` | absent | 10499 | 9999 | 500 | 0 | ✅ PASS |
| 6 | In-house, ₹500 room-service in `order_amount` | ≠6 | 9999 | 3333 | 6666 | 500 | `[]` | absent | 10499 | 3333 | 7166 | 0 | ✅ PASS |

**Result: 6/6 passed.**

---

## 4. BUG-048 Fixture — Step-by-Step Trace

Backend payload for order `825882` (verbatim from owner):

```
order_amount               : 6666
f_order_status             : 6     (settled)
associated_order_list      : []
room_info.room_price       : "9999.00"
room_info.advance_payment  : "3333.00"
room_info.balance_payment  : "6666.00"
room_info.receive_balance  : (absent)
room_info.discount_amount  : (absent)
```

New FE computation:

```
roomOrderAmount  = 6666
associatedTotal  = 0
rent             = 9999
advance          = 3333
balance          = 6666
receiveBalance   = 0          (absent → 0)
isFullySettled   = true       (fOrderStatus === 6)
explicitDiscount = 0          (absent → 0)

roomService      = max(0, 6666 − 6666 − 0)        = 0       (settled branch)
food             = 0 + 0                           = 0
total            = 9999 + 0                        = 9999    ✅ (was 16,665)
paid             = min(3333 + 6666, 9999) = min(9999, 9999) = 9999    ✅
outstanding      = max(0, 9999 − 9999)             = 0       ✅
discount         = 0                              = renders `—`   ✅ (was ₹6,666)
```

Matches the owner's expected output exactly.

---

## 5. Regression Checks

### 5.1 In-house rows
- Scenario 2 (advance only): identical numbers as today (Total 9,999 / Paid 3,333 / Outstanding 6,666 / Discount —). ✅
- Scenario 6 (in-house + ₹500 room-service): Total 10,499 / Paid 3,333 / Outstanding 7,166. Equivalent to today's `food + max(0, balance − receiveBalance)` outstanding when `receiveBalance = 0` (i.e., before any checkout payment). ✅

### 5.2 `welcomeresort` settled rooms (clean backend payloads)
Backend invariants on this tenant: `advance + receive_balance + balance = room_price`; `order_amount = balance + food`.

Under the new formula:
- `roomService = max(0, order_amount − balance − associated_total) = max(0, food_in_checkout)` → if all food is in checkout, `roomService = food`; else 0.
- `food = associated_total + roomService` → unchanged net amount.
- `total = rent + food` → unchanged.
- `paid = min(advance + order_amount, total) = min(advance + balance + food_in_checkout, total) = min(rent + food_in_checkout, total)` → equals `total` when settled and no separately-paid associated. Outstanding 0.
- `discount = explicit_only` → 0 (welcomeresort doesn't ship `discount_amount`) → renders `—`. Was `—` before via the derived path (collapsed to 0 because `rent − lodgingCollected = 0`). **Same display, different code path.** ✅

### 5.3 Settled room with explicit backend-issued discount
- Scenario 3: Total 9,999 / Paid 9,499 / Outstanding 500 / Discount 500.
- Behaviour matches the literal owner-locked formula `Outstanding = max(0, Total − Paid)`. Discount column correctly displays the backend value. ✅

### 5.4 Row-summary lock-step
- Both memos use identical math. For every scenario above, the summary contribution equals the per-row tuple.
- Audit by code review: no field is computed only in one memo; mirror is line-for-line in spirit (variable names differ — `rowFood` / `rowTotal` vs. `food` / `total` — but the same expressions). ✅

---

## 6. Known Nuance (Out of BUG-048 Scope) — Flagged for Owner

**Scenario 3 nuance:** with an explicit ₹500 lodging discount, the row will render **Outstanding ₹500 alongside Discount ₹500**. The literal owner-locked formula (`Outstanding = max(0, Total − Paid)`) produces this. An accounting view would arguably render Outstanding = 0 when `Paid + Discount ≥ Total` (treating discount as a non-cash settlement).

**Two facts to lock the assessment:**
1. **BUG-048 is not affected.** The actual bug has no explicit discount (`discount_amount` is absent), so `discount = 0` and `Outstanding = max(0, Total − Paid) = 0`. Both interpretations land identically on the BUG-048 fixture.
2. **Owner has not given an explicit rule** for real-discount handling. Implementation followed the literal locked formula. If owner wants `Outstanding = max(0, Total − Paid − Discount)` for the real-discount case, that is a one-line tweak in a follow-up.

Recommendation: confirm with owner during smoke. No change required for BUG-048 sign-off.

---

## 7. Honoured "Do Not Change" Scope (Audit)

| Surface | Status |
|---|---|
| `frontend/src/api/transforms/orderTransform.js` | ✅ Not touched |
| `frontend/src/api/services/reportService.js` | ✅ Not touched |
| `frontend/src/api/transforms/reportTransform.js` | ✅ Not touched |
| `RoomRowCard.jsx` display blocks (L495–560) | ✅ Not touched (existing `—` rendering when `discount === 0` continues to work) |
| `RoomBillingCard` sub-component | ✅ Not touched (deferred follow-up: red Balance styling) |
| `TransferredOrdersTable` sub-component | ✅ Not touched (deferred follow-up: "Room service items ₹6,666" line) |
| `RoomOrdersReportPage.jsx` outside `summaryTotals` per-row body | ✅ Not touched (filters, fetch, SummaryBar, Remove-from-Room, date handling all preserved) |
| Initial-load APIs | ✅ Not touched |
| Room payment writes, check-in / check-out | ✅ Not touched |
| OrderContext / sockets | ✅ Not touched |
| Remove-from-Room logic | ✅ Not touched |
| Backend / any API | ✅ Not touched |
| `/app/memory/final/*` | ✅ Not touched |
| `BUG_TEMPLATE.md` | ✅ Not touched |
| Export paths (CSV / PDF) | ✅ Not touched |
| BUG-042 / 044 / 045 / 046 surfaces | ✅ Not touched |

---

## 8. Test Plan Coverage vs. Plan §10 / Code Gate §6

| Plan / Gate scenario | Covered? | Notes |
|---|---|---|
| Settled, no food (BUG-048 fixture) | ✅ S1 | Primary fix target |
| In-house, advance only | ✅ S2 | Preserves pre-payment screenshot |
| Settled with explicit discount | ✅ S3 | See §6 nuance |
| Settled with associated (rolled into `order_amount`) | ✅ S4 | |
| Settled with associated (paid separately) | ✅ S5 | Surfaces unsettled food as Outstanding |
| In-house with room-service in `order_amount` | ✅ S6 | |
| Header / row consistency | ✅ | Same formula in both memos; audited |
| All / Paid / Unpaid filter regression | ⏳ Owner smoke | Pure UI filter; not affected by math change |
| Live socket update on settlement | ⏳ Owner smoke | Path untouched |
| Remove-from-Room pill | ⏳ Owner smoke | Path untouched |
| `welcomeresort` regression | ✅ | Equivalence argued in §5.2 |

---

## 9. Risk Summary

- **Functional risk:** LOW — atomic memo replacement, six-scenario validation passed.
- **Regression risk:** LOW — equivalence proof for `welcomeresort` clean payloads; in-house path literally preserved by `isFullySettled ? … : roomOrderAmount` branch.
- **Reversibility:** Single-commit revert returns to pre-fix behaviour.
- **Backend coupling:** NONE — no API/payload change.
- **UI/UX risk:** LOW — display blocks unchanged; the only visible change is the Discount column now renders `—` instead of phantom ₹X for the broken case.
- **Deferred items:** "Room service items ₹6,666" expanded line + red Balance styling — both flagged and accepted as follow-ups.

---

## 10. QA Verdict

**PASS — ready for owner smoke.**

- ✅ BUG-048 fixture (order 825882) produces Total ₹9,999 / Paid ₹9,999 / Discount — / Outstanding ₹0.
- ✅ All six formula scenarios pass.
- ✅ Lint clean.
- ✅ Memo return shape preserved.
- ✅ No backend, no doc-sweep, no `BUG_TEMPLATE.md` updates.
- ✅ All "do not change" surfaces verified untouched.
- ⏳ Manual owner smoke (per §10 of implementation summary) is the next step before final sign-off.

---

*End of BUG-048 QA Report.*
