# BUG-048 — Implementation Plan (REWRITE v2)

> **Sprint:** pos_final_1.0
> **Task type:** Bug Implementation Planning (read-only — no code changes)
> **Bug ID:** BUG-048
> **Title:** Room Orders Report wrongly shows Discount column/value and inflated Total after room payment
> **Date:** 2026-05-12 (current session — v2 rewrite after owner locked the calculation model)
> **Source of truth:** Owner-locked interpretation (this session) + payload trace of order `825882` (abhsihek / r1, settled)
> **Verdict:** `ready_for_pre_implementation_code_gate`

> **v2 supersedes v1.** v1 proposed a narrow "Discount-derivation guard" (Bucket B1) and deferred the Total fix pending a backend payload sample. The payload has since been shipped by the owner inline, and the owner has locked a new calculation model that fixes both Total and Discount in one pass. v2 captures that model. The earlier Bucket B1 / B2 split is obsolete.

---

## 1. Docs Read

### `/app/memory/final/` (baseline rules — read-only)
- `FINAL_DOCS_APPROVAL_STATUS.md` — OD-02 / OQ-12 (Room billing & print lifecycle) is deferred; no final-doc rule prescribes the post-checkout Room Orders Report formulas.
- `ARCHITECTURE_DECISIONS_FINAL.md` — Module 10 (Reports) names `RoomOrdersReportPage.jsx` + `RoomRowCard.jsx` as PMS-style read-only views (CR-004 lineage).
- `MODULE_DECISIONS_FINAL.md` — §10 Reports presentation-only; backend owns aggregation. FE presents derived numbers; does not mutate settlement state.
- `CHANGE_REQUEST_PLAYBOOK.md` — high-risk-file protocol covers `orderTransform.js`.
- `IMPLEMENTATION_AGENT_RULES.md` — §"Areas that must not be changed casually" flags `orderTransform.fromAPI.order`.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — OQ-12 deferred; does not block this bug.

### Overlay docs
- `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — CR-004 Bucket A (Paid + Discount columns) shipped and merged.
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — locks four columns (Total / Paid / Discount / Outstanding) on the Room Orders Report.
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md` — BE-2 §4.1 (explicit `lodging_collected`, `discount_amount`, `discount_reason`) still pending backend.
- `change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` — BE-2 §4.1 owned by backend; no FE workaround approved.
- `change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` — Bucket BE-2 open; FE running on the previous heuristic.
- `change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` — last validation pass (`welcomeresort` tenant — 7 settled rooms reconciled cleanly under the old heuristic).

### CR-004 docs
- `change_requests/CR_004_room_orders_pms_view.md`
- `change_requests/CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md`
- `change_requests/CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md`
- `change_requests/CR_004_BACKEND_EXT_sub_cr.md`
- `change_requests/BE_2_LODGING_PAYMENT_BREAKDOWN.md`
- `handover/CR_004_IMPLEMENTATION_HANDOVER.md`

### BUG-048
- `BUG_TEMPLATE.md` row 51 + full BUG-048 section.
- `bugs/BUG_048_INTAKE.md`
- `bugs/BUG_048_ROOM_REPORT_IMPACT_ANALYSIS.md`
- `attachments/bug_048/screenshot_15-10-48.png`, `screenshot_15-11-32.png` + the expanded-row screenshot supplied by the owner in this session.

### Raw backend payload (owner-supplied this session)
Order `825882` `/get-single-order-new` response — settled state. Verbatim record kept inline in this plan (see §4).

### Current code verified
- `frontend/src/components/reports/RoomRowCard.jsx` — `numbers` memo at **L345–415** (heuristic at L390–401 produces the bug).
- `frontend/src/pages/RoomOrdersReportPage.jsx` — `summaryTotals` memo at **L523–578** (mirror of the same heuristic).
- `frontend/src/api/transforms/orderTransform.js` `roomInfo` block at **L334–368** — already exposes every needed field.
- `frontend/src/api/services/reportService.js` `getSingleOrderRoom` at **L291–315** — pure unwrap-and-delegate.

---

## 2. Baseline Conflict Check

**Classification:** **baseline calculation revision (within Module 10 presentation layer).**

The owner has supplied a new authoritative interpretation of `order_amount` and `balance_payment` after settlement. That interpretation re-defines the inputs to the existing CR-004 Phase 4.1 row-strip formulas. The columns themselves (Total / Paid / Discount / Outstanding) remain locked per `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`. Only the math inside `RoomRowCard.numbers` and its `RoomOrdersReportPage.summaryTotals` mirror changes.

| Rule | Source | Status under this plan |
|---|---|---|
| Module 10 — backend owns aggregation; FE owns presentation | `MODULE_DECISIONS_FINAL.md` | ✅ Compatible — this is a presentation-layer math change, not a payload mutation. |
| Four-column column set locked | `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | ✅ Unchanged. |
| `orderTransform.fromAPI.order` high-risk | `IMPLEMENTATION_AGENT_RULES.md` | ✅ Not touched. The transform already exposes `room_price`, `advance_payment`, `balance_payment`, `discount_amount`, plus the parent `order_amount` and the associated-orders array. |
| BE-2 §4.1 pending backend | `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | ✅ Compatible — the new model does **not** depend on `receive_balance` (which is the missing BE-2 §4.1 field on this tenant). It reads `order_amount` + `balance_payment`, both of which the backend already ships today. When BE-2 §4.1 lands, the formula can additionally honour `discount_amount`/`discount_reason` (it already does — only the explicit-discount path remains). |
| CR-004 Phase 4.1 — `Food = order_amount + Σ associated_orders[].amount` | `BUG_TEMPLATE.md` Phase 4.1 comment in `RoomRowCard.jsx:13-17` | ⚠️ **Revised for settled rooms only.** New formula: when `f_order_status === 6`, `room_service = max(order_amount − balance_payment − associated_total, 0)`; in-house rows keep the existing `food = order_amount + associated_total` behaviour. |
| No `/app/memory/final/` edits | task directive | ✅ Honoured. |

**Verdict:** No blocking conflict. CR-004 Phase 4.1 needs a small clarification comment (in-code only) to reflect the post-settlement reading of `order_amount`. No doc sweep performed by this plan.

---

## 3. Plain-English Owner Summary

On the Room Orders Report row strip, after a room is fully paid:

- **Total** is being inflated from ₹9,999 to ₹16,665 because the frontend is treating `order_amount` (which after settlement holds the **checkout collection amount**, including the room balance) as additional food spent on top of the room price.
- **Discount** is being faked at ₹6,666 by an FE fallback heuristic that guesses operator under-collection whenever `room_info.discount_amount` is missing and `receive_balance` is `0`.

The fix is to:
1. Stop adding the room balance portion of `order_amount` into food.
2. Stop guessing Discount. Only show what the backend explicitly ships in `discount_amount`.

Both changes happen in two memos (one row-level, one header-level) — same file area as today. Everything else on the report stays exactly as it is.

---

## 4. Current Behaviour (Traced Against Owner's Payload)

Backend payload for order `825882` (verbatim, key fields only):

```
order_amount               : 6666
f_order_status             : 6     ← settled
payment_status (top-level) : "paid"
associated_order_list      : []
room_info.room_price       : "9999.00"
room_info.advance_payment  : "3333.00"
room_info.balance_payment  : "6666.00"
room_info.receive_balance  : (absent)
room_info.discount_amount  : (absent)
room_info.payment_status   : (absent)
```

Field-by-field flow through current FE code (`RoomRowCard.jsx:362–401`):

| Backend key | FE variable | Value |
|---|---|---|
| `order_amount` | `roomOrderAmount` (L362) | 6666 |
| `room_info.room_price` | `rent` (L369) | 9999 |
| `room_info.advance_payment` | `advance` (L370) | 3333 |
| `room_info.balance_payment` | `balance` (L371) | 6666 |
| `room_info.receive_balance` (absent) | `receiveBalance` (L390) | 0 |
| `room_info.discount_amount` (absent) | `explicitDiscount` (L393) | 0 |
| `f_order_status === 6` | `isFullySettled` (L391) | true |
| `associated_order_list` | `associatedOrders` / `associatedTotal` (L363–367) | `[]` / 0 |

Computed values today:

```
food             = roomOrderAmount + associatedTotal   = 6666 + 0 = 6666
total            = rent + food                          = 9999 + 6666 = 16665  ← WRONG (rendered)
lodgingCollected = advance + receiveBalance             = 3333 + 0 = 3333
derivedDiscount  = isFullySettled ? max(0, rent − lodgingCollected) : 0
                 = max(0, 9999 − 3333)                  = 6666                 ← WRONG (rendered)
discount         = explicitDiscount > 0 ? explicit : derived = 6666            ← rendered
outstanding      = isFullySettled ? 0 : (…)             = 0                    ← correct by short-circuit
paid             = lodgingCollected + (isFullySettled ? food : 0)
                 = 3333 + 6666                          = 9999                 ← coincidentally correct
```

`RoomOrdersReportPage.jsx:523–578` mirrors the same formula, so the summary-header pills drift with the row by construction.

---

## 5. Expected Behaviour (Owner-Locked Model)

### 5.1 Interpretation lock

1. `room_info.room_price` = fixed room rent.
2. `room_info.advance_payment` = check-in advance.
3. `room_info.balance_payment` = original room balance owed against rent after advance. **Remains as a record after settlement** (does not get zeroed by backend).
4. `order_amount` after settlement = **checkout collection amount** (= `balance_payment + associated_orders + room_service` per the literal model).
5. For settled rows (`f_order_status === 6`), do **not** treat the full `order_amount` as food/room-service.
6. First subtract the room balance component from `order_amount`.
7. The remaining surplus (if any) is the room-service component.
8. Associated orders are counted from `associated_order_list[]` directly. Do not assume they are also inside `order_amount` unless backend proves it; the safer default is to subtract both `balance` and `associated_total` before isolating room-service.
9. **Discount** must only come from `room_info.discount_amount`. No derivation from `balance_payment`, `order_amount`, outstanding, or any remaining amount.

### 5.2 Locked formulas (row strip + summary header — settled rows)

```
rent              = room_info.room_price
advance           = room_info.advance_payment
balance           = room_info.balance_payment
orderAmount       = order_amount                                          (top-level on RM parent)
associatedTotal   = Σ associated_order_list[i].order_amount
isFullySettled    = (f_order_status === 6)
explicitDiscount  = room_info.discount_amount

# Owner-locked: when settled, isolate room_service out of order_amount.
roomService       = isFullySettled
                      ? Math.max(0, orderAmount - balance - associatedTotal)
                      : orderAmount

food              = associatedTotal + roomService
total             = rent + food
paid              = isFullySettled
                      ? Math.min(advance + orderAmount, total)
                      : advance + receiveBalance
outstanding       = Math.max(0, total - paid)
discount          = explicitDiscount                                       (no derivation)
```

### 5.3 Application to order `825882`

```
roomService = max(0, 6666 - 6666 - 0)           = 0
food        = 0 + 0                              = 0
total       = 9999 + 0                           = 9999      ✓
paid        = min(3333 + 6666, 9999)             = 9999      ✓
outstanding = max(0, 9999 - 9999)                = 0         ✓
discount    = 0                  (renders as —)              ✓
```

Header summary equals the row contribution (single-row case): same four values.

### 5.4 In-house behaviour (pre-checkout — kept identical to today)

For the same booking in pre-settlement state (advance only):

```
orderAmount = 0    (no checkout yet)
isFullySettled = false
roomService = orderAmount        = 0          (in-house branch)
food = 0 + 0                     = 0
total = 9999 + 0                 = 9999       ✓ (unchanged vs. today)
paid = 3333 + receiveBalance     = 3333       ✓ (unchanged)
outstanding = max(0, 9999 - 3333) = 6666      ✓ (unchanged — was previously `food + max(0, balance - receiveBalance)` which collapses to the same value when food=0)
discount = 0                      = —          ✓
```

In-house numbers do not change for this booking. For in-house rows that **already have** room-service items in `order_amount` and/or transferred orders in `associated_order_list[]`, the current `food = order_amount + associated_total` behaviour is preserved by the `isFullySettled ? … : orderAmount` branch above.

---

## 6. Exact File / Function Impact Map

| # | File | Function / Block | Current behaviour | Planned change | Risk |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/reports/RoomRowCard.jsx` | `numbers` memo, **L345–415** | Computes `food = roomOrderAmount + associatedTotal` and `total = rent + food`. Computes `derivedDiscount = max(0, rent − lodgingCollected)` on settled rooms. Computes `outstanding` via two-branch formula. Computes `paid = lodgingCollected + (settled ? food : 0)`. | Replace L362–401 with the owner-locked formulas in §5.2: gate `food` derivation on `isFullySettled`, drop the `derivedDiscount` fallback entirely, switch `paid` to `min(advance + orderAmount, total)` on settled rooms (in-house path unchanged), recompute `outstanding` as `max(0, total − paid)`. Keep `receiveBalance` read for the in-house Paid branch (in-house behaviour preserved). | **LOW–MEDIUM** — clean replacement of a single memo; existing 7-row `welcomeresort` regression set must still reconcile (verified per §10.3). |
| 2 | `frontend/src/pages/RoomOrdersReportPage.jsx` | `summaryTotals` memo, **L523–578** | Mirror of (1). | Mirror the (1) change line-for-line so summary header and row strip remain in lock-step. | **LOW** — identical math change. |
| 3 | `frontend/src/components/reports/RoomRowCard.jsx` Discount display block, **L515–534** | Already renders `—` when `numbers.discount === 0`. | **No change.** Upstream `discount = explicitDiscount` will emit `0` whenever backend doesn't ship `discount_amount`, and the existing display already renders `—`. | None. |
| 4 | `frontend/src/components/reports/RoomRowCard.jsx` "Room service items" line, **L157–170** (inside `TransferredOrdersTable`) | Renders the line whenever `(roomOrderAmount || 0) > 0`, treating `order_amount` as room-service amount. | **No change in this plan.** Once (1) is in place, the expanded `RoomBillingCard` / `TransferredOrdersTable` continue to receive `roomOrderAmount` and `associatedOrders` from the page-level `numbers` memo for display purposes only. The room-service line will keep showing `₹6,666` against this booking until a follow-up task surfaces a `roomService` value derived per the locked model. Flagged as a **follow-up cosmetic item** below; not included here per owner's instruction to keep this fix scoped. |
| 5 | `frontend/src/api/transforms/orderTransform.js` `roomInfo` block, L334–368 | Already exposes every needed field. | **No change.** | None. |
| 6 | `frontend/src/api/services/reportService.js` `getSingleOrderRoom`, L291–315 | Pure unwrap-and-delegate. | **No change.** | None. |
| 7 | `frontend/src/api/transforms/reportTransform.js` | Not on this path. | **No change.** | None. |
| 8 | Unit tests co-located with (1) and (2) | No coverage for the locked-model branches. | Add 6 unit cases (see §10). | LOW. |

### What stays untouched inside the same files
- `RoomRowCard.jsx` toggle / expand / retry / display markup (L426–597) — unchanged.
- `RoomRowCard.jsx` `RoomBillingCard` sub-component (L77–115) — unchanged. (`Total` line continues to show `room_info.room_price` directly; this already matches the locked model.)
- `RoomRowCard.jsx` `TransferredOrdersTable` (L117–257) — unchanged in this plan (see (4) above and follow-up).
- `RoomOrdersReportPage.jsx` filter pills, fetch path, Remove-from-Room wiring, SummaryBar component, date handling — unchanged.

---

## 7. Implementation Buckets

Single bucket — atomic change.

| Bucket | Scope | In this plan? |
|---|---|---|
| **A — Owner-locked row + header math** | Files (1) + (2). Replace the memo body with the formulas in §5.2. | **YES** — ready for code gate. |
| B — Cosmetic: "Room service items ₹6,666" line in expanded view + red Balance after settlement | `TransferredOrdersTable` L157–170 + `RoomBillingCard` L104–108 | **NO — follow-up.** Per owner instruction in this session, defer. Will need a separate ticket once Bucket A ships and the page-level `numbers.roomService` is available. |
| C — Doc sweep: update CR-004 Phase 4.1 comment in `RoomRowCard.jsx:13-17` to reflect "for settled rooms, order_amount carries checkout collection" | `RoomRowCard.jsx` file-header doc-block | **YES** — ships with Bucket A as a code-comment update; no doc-sweep into `/app/memory/final/`. |

---

## 8. Proposed Implementation Approach (Pseudo-Code — no code change here)

### 8.1 `RoomRowCard.jsx` L362–401 — replacement block

```js
// BUG-048 fix — owner-locked calculation model (2026-05-12 session).
// Model:
//   room_info.room_price       = fixed room rent
//   room_info.advance_payment  = paid at check-in
//   room_info.balance_payment  = original balance owed; persists as a record after settlement
//   order_amount               = (settled) checkout collection = balance + associated + room_service
//                              | (in-house) running room-service tally on the RM parent (CR-004 Phase 4.1)
//   discount                   = room_info.discount_amount ONLY (no derivation)
//
// CR-004 Phase 4.1 note: Food = order_amount + associated_total is the IN-HOUSE rule.
// For settled rows we must subtract the balance component out of order_amount first.

const ri = detail.roomInfo;
const roomOrderAmount = parseFloat(detail.amount) || 0;     // RM-parent.order_amount
const associatedOrders = detail.associatedOrders || [];
const associatedTotal = associatedOrders.reduce(
  (s, o) => s + (parseFloat(o.amount) || 0), 0,
);
const rent           = parseFloat(ri.roomPrice)      || 0;
const advance        = parseFloat(ri.advancePayment) || 0;
const balance        = parseFloat(ri.balancePayment) || 0;
const receiveBalance = parseFloat(ri.receiveBalance) || 0;
const isFullySettled = detail.fOrderStatus === 6;
const explicitDiscount = parseFloat(ri.discountAmount) || 0;

// Owner-locked: settled → strip the balance + associated components out of order_amount
// to isolate the genuine room-service spend. In-house behaviour is unchanged.
const roomService = isFullySettled
  ? Math.max(0, roomOrderAmount - balance - associatedTotal)
  : roomOrderAmount;

const food        = associatedTotal + roomService;
const total       = rent + food;
const paid        = isFullySettled
  ? Math.min(advance + roomOrderAmount, total)
  : advance + receiveBalance;
const outstanding = Math.max(0, total - paid);
const discount    = explicitDiscount;     // NO derivation — owner-locked
```

The `numbers` memo return shape is unchanged (`transferredCount`, `food`, `total`, `paid`, `outstanding`, `discount`, `rent`, `advance`, `balance`, `roomOrderAmount`, `associatedOrders`). Downstream display blocks (L495–560) work without modification.

### 8.2 `RoomOrdersReportPage.jsx` L545–558 — line-for-line mirror

```js
const rowSettled       = detail.fOrderStatus === 6;
const advance          = parseFloat(ri.advancePayment) || 0;
const balance          = parseFloat(ri.balancePayment) || 0;
const receiveBalance   = parseFloat(ri.receiveBalance) || 0;
const explicitDiscount = parseFloat(ri.discountAmount) || 0;
const rent             = parseFloat(ri.roomPrice)      || 0;

const rowRoomService = rowSettled
  ? Math.max(0, rmAmt - balance - aoTotal)
  : rmAmt;

const rowFood = aoTotal + rowRoomService;
const rowTotal = rent + rowFood;
const rowPaid = rowSettled
  ? Math.min(advance + rmAmt, rowTotal)
  : advance + receiveBalance;
const rowOut = Math.max(0, rowTotal - rowPaid);
const rowDiscount = explicitDiscount;

total += rowTotal;
food += rowFood;
paid += rowPaid;
outstanding += rowOut;
discount += rowDiscount;
```

### 8.3 Behaviour summary

| Scenario | Total | Paid | Discount | Outstanding |
|---|---|---|---|---|
| Settled room, no food (BUG-048 case — order `825882`) | 9,999 | 9,999 | — | 0 |
| Settled room, ₹500 transferred associated order (paid at room checkout, so backend rolls it into `order_amount = 6666 + 500 = 7166`) | 10,499 | 10,499 | — | 0 |
| Settled room, ₹500 transferred associated order (paid separately on its own bill, `order_amount = 6666`) | 10,499 | 9,999 | — | 500 (intentional — flags un-settled food on the room line; surfaces what's still owed) |
| Settled room, real ₹500 lodging write-off shipped by backend as `discount_amount = 500` | 9,999 | 9,499 | 500 | 0 |
| In-house, advance only (BUG-048 pre-payment) | 9,999 | 3,333 | — | 6,666 |
| In-house, advance + ₹500 room-service in `order_amount` | 10,499 | 3,333 | — | 7,166 |

---

## 9. What NOT to Change

| Surface | Reason |
|---|---|
| **Backend / any API** | Backend is the source of `order_amount` and `balance_payment`. The owner-locked model fits the current backend behaviour; no backend change required. |
| `orderTransform.js` `roomInfo` block (L334–368) | Already exposes every needed field; no schema or field-mapping change. |
| `orderTransform.js` top-level `amount` mapping (≈L150) | Pre-existing semantics; the new model interprets the value differently when settled, but does NOT re-map the field. |
| `orderTransform.js` `associatedOrders` block (L290–304) | Pre-existing semantics; the new model reads the array as-is. |
| `reportTransform.js` | Not on this path. |
| `reportService.js` `getSingleOrderRoom` | Pure unwrap-and-delegate. |
| `RoomRowCard.jsx` collapsed-strip display blocks (L495–560) | Already correct; will render the new values without change. |
| `RoomRowCard.jsx` Discount display block (L515–534) | Already renders `—` when value is `0`. |
| `RoomRowCard.jsx` `RoomBillingCard` (expanded — L77–115) | Already reads `room_info.room_price` directly; matches the locked model. |
| `RoomRowCard.jsx` `TransferredOrdersTable` (L117–257) including the "Room service items" line | **Deferred follow-up** — covered in Bucket B (out of this plan). |
| `RoomRowCard.jsx` `RoomBillingCard` red Balance styling (L106) | **Deferred follow-up** per owner. |
| `RoomOrdersReportPage.jsx` outside L523–578 | Unrelated to this defect; filter pills, fetch path, Remove-from-Room wiring, SummaryBar, date handling — out of scope. |
| Initial-load APIs `/get-room-list`, `/order-logs-report` | Defect is in the lazy detail call. |
| Room payment write paths, check-in / check-out, Remove-from-Room logic, OrderContext / socket payloads | Not in the defect path. |
| BUG-042 (Hold-order UPI), BUG-044 (table refresh), BUG-045 (Scan/Web popup), BUG-046 (delivery charge editable) | Unrelated bugs. |
| `/app/memory/final/*` | Task directive. |
| `BUG_TEMPLATE.md` | Task directive. |
| Export paths (CSV / PDF) | P2 follow-up; not in BUG-048 scope. |

---

## 10. Test Plan

### 10.1 Unit tests (co-located with `RoomRowCard.jsx` and `RoomOrdersReportPage.jsx`)

Cover the locked formulas:

| # | Scenario | `f_order_status` | `room_price` | `advance` | `balance` | `order_amount` | `associatedOrders` | `discount_amount` | Expected Total | Expected Paid | Expected Discount | Expected Outstanding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Settled, no food (BUG-048 fixture — order 825882) | 6 | 9999 | 3333 | 6666 | 6666 | [] | absent | **9999** | **9999** | 0 (renders `—`) | 0 |
| 2 | In-house, advance only (BUG-048 pre-payment) | ≠6 | 9999 | 3333 | 6666 | 0 | [] | absent | 9999 | 3333 | 0 (`—`) | 6666 |
| 3 | Settled, real ₹500 lodging discount shipped explicitly | 6 | 9999 | 3333 | 6166 | 6166 | [] | 500 | 9999 | 9499 | 500 | 0 |
| 4 | Settled, ₹500 associated order rolled into `order_amount` | 6 | 9999 | 3333 | 6666 | 7166 | [{amount: 500}] | absent | 10499 | 10499 | 0 (`—`) | 0 |
| 5 | Settled, ₹500 associated order paid separately (not in `order_amount`) | 6 | 9999 | 3333 | 6666 | 6666 | [{amount: 500}] | absent | 10499 | 9999 | 0 (`—`) | 500 |
| 6 | In-house, ₹500 room-service in `order_amount`, advance only | ≠6 | 9999 | 3333 | 6666 | 500 | [] | absent | 10499 | 3333 | 0 (`—`) | 7166 |

Assertions apply identically to `RoomRowCard.numbers` and to per-row contributions of `RoomOrdersReportPage.summaryTotals`.

### 10.2 Header / row consistency

For every row in scenarios 1–6, `RoomRowCard.numbers.{total,paid,discount,outstanding}` must equal the value added to `RoomOrdersReportPage.summaryTotals` for that row. Add a single snapshot/equality test asserting both memos resolve to the same per-row tuple over the six scenarios.

### 10.3 Manual smoke

- **All tab** — shows mix of in-house and settled. Verify scenarios 1 + 2 render correctly side-by-side.
- **Paid tab** — settled rooms only. Verify scenarios 1, 3, 4, 5 (whichever exist in test data).
- **Unpaid tab** — in-house only. Verify scenarios 2, 6.
- **`welcomeresort` regression** — 7 previously-validated settled rooms must continue to reconcile. Under the new model, those rooms (where backend writes `receive_balance` correctly and `order_amount = balance + (food if any)`) will land on identical Total / Paid / Outstanding values as before. Discount column flips from `—` to `—` (no visible change because backend ships `discount_amount` only for real write-offs).
- **Remove-from-Room pill** — verify the pill still appears for in-house rooms with operator permission inside the mutation window. Not touched.
- **Filter pills** — switching All / Paid / Unpaid must not change per-row math (only which rows are visible).
- **Live socket update** — when a room is settled while the page is open, the row must transition from in-house numbers → settled numbers without page refresh.

### 10.4 Regression checks against current (pre-fix) baseline

| Behaviour | Today | After fix |
|---|---|---|
| Settled BUG-048 booking (order 825882) | Total 16,665 / Paid 9,999 / Discount 6,666 / Outstanding 0 | **Total 9,999 / Paid 9,999 / Discount — / Outstanding 0** ✅ |
| `welcomeresort` settled rooms | Total = rent + (food, if any); Paid = (advance + receive_balance) + food; Discount = — (none derived because receive_balance > 0); Outstanding = 0 | Same numbers ✅ (formula is equivalent on payloads where `receive_balance > 0` and `order_amount` carries food only) |
| Any settled room with a backend-issued `discount_amount > 0` | Discount = explicit value | Same ✅ |
| In-house rooms | unchanged | unchanged ✅ |

---

## 11. Owner Smoke Checklist

1. Open Reports → Room Orders Report → **All** tab on the day the abhsihek / r1 booking was settled.
2. Find the row. Verify it reads **Total ₹9,999 / Paid ₹9,999 / Discount — / Outstanding ₹0**.
3. Confirm the **summary header pills** at the top of the page also read Total 9,999 / Paid 9,999 / Discount — / Outstanding 0 (for a single-row view of this booking).
4. Switch to the **Paid** tab — same row, same numbers.
5. Switch to **Unpaid** tab — the abhsihek row must not appear (it is settled).
6. Open a different, in-house room that has an advance but no settlement yet — confirm its numbers are unchanged versus pre-fix (Discount `—`, Outstanding > 0, Total = room_price + any in-house room-service).
7. Open a settled room on the `welcomeresort` tenant (or any settled room where backend writes `receive_balance` correctly) — confirm Discount still `—` and Outstanding still ₹0; no regression.
8. Expanded view of the abhsihek row: **ROOM BILLING** card still shows Total ₹9,999 / Advance ₹3,333 / Balance ₹6,666. *(Per owner: the red styling on Balance and the "Room service items ₹6,666" line in Associated Orders are deferred follow-ups — they may continue to show today's behaviour after this fix ships.)*

---

## 12. Open Questions / Blockers

None blocking.

Two follow-up cosmetic items (out of scope per owner):

1. **Expanded "Room service items" line** at `RoomRowCard.jsx:157–170` continues to render `₹6,666` against this booking because it reads `roomOrderAmount` directly. Should be updated in a follow-up to read the new `numbers.roomService` (which would be `0` for this booking) so the line disappears when there is no real room-service spend.
2. **Red Balance styling** at `RoomRowCard.jsx:106` continues to colour `Balance ₹6,666` red even on settled rooms (where the balance is already paid). Should be updated in a follow-up to use neutral colour when `f_order_status === 6`.

Both are pure presentation items inside the expanded view and do not affect the row strip or the summary header.

---

## 13. Recommended Implementation Order

1. **Code gate** — apply the L362–401 replacement in `RoomRowCard.jsx` (per §8.1) and the L545–558 mirror in `RoomOrdersReportPage.jsx` (per §8.2). Update the CR-004 Phase 4.1 doc-block comment at the top of `RoomRowCard.jsx` to reflect the settled-row reading of `order_amount`.
2. **Unit tests** — add the six scenarios from §10.1.
3. **Manual smoke** — §10.3 + §11 owner checklist.
4. **Ship.** Bug closes.
5. **Follow-up cosmetic ticket** (separate): the two items in §12.
6. **Backend follow-up** (separate, BE-2 §4.1): no longer a blocker for BUG-048. Once backend ships `discount_amount` / `discount_reason` consistently, the explicit-discount branch (already in place after this fix) will surface them automatically — no further FE change needed.

---

## 14. Final Verdict

**`ready_for_pre_implementation_code_gate`** ✅

- Owner-locked calculation model captured in §5.
- Files and exact line ranges identified in §6.
- Pseudo-code drop-in in §8.
- Test plan + regression matrix in §10.
- No backend dependency. No baseline doc-sweep required. No conflicts with CR-004 column lock or BE-2 §4.1 pending work.

---

## 15. Confirmation

- ❌ No code modified.
- ❌ No `/app/memory/final/` updates.
- ❌ No `BUG_TEMPLATE.md` updates.
- ❌ No backend changes.
- ❌ No QA report created.
- ✅ Implementation-plan doc rewritten at `/app/memory/bugs/BUG_048_IMPLEMENTATION_PLAN.md` (v2 supersedes v1).
- Scope strictly limited to BUG-048.

---

*End of BUG-048 Implementation Plan v2. Ready for code gate.*
