# BUG-048 — Pre-Implementation Code Gate

> **Sprint:** pos_final_1.0
> **Task type:** Pre-Implementation Code Gate (read-only — no code changes)
> **Bug ID:** BUG-048
> **Title:** Room Orders Report — Discount/Total calculation fix (owner-locked model)
> **Date:** 2026-05-12 (current session)
> **Source of truth:** `/app/memory/bugs/BUG_048_IMPLEMENTATION_PLAN.md` v2
> **Verdict:** `ready_for_owner_code_gate_review`

---

## 0. Pathing Note (read first)

The originating task instruction listed the implementation file as `frontend/src/components/rooms/RoomRowCard.jsx`. **That directory does not exist.** The verified on-disk path is:

```
frontend/src/components/reports/RoomRowCard.jsx
```

`fd` / `glob` over `/app/frontend/src` returns exactly one match. Both `IMPLEMENTATION_PLAN.md` v2 and this code gate use the verified `components/reports/` path. No file move is involved — the task instruction had a one-word slip.

The second target file is correct as stated: `frontend/src/pages/RoomOrdersReportPage.jsx`.

---

## 1. Docs Read

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md` (Module 10 Reports section)
- `MODULE_DECISIONS_FINAL.md` (§10 — Reports presentation-only)
- `CHANGE_REQUEST_PLAYBOOK.md` (high-risk file protocol)
- `IMPLEMENTATION_AGENT_RULES.md` (areas not to be changed casually)
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-12 deferred)
- `FINAL_DOCS_SUMMARY.md`

### Overlay docs
- `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` (four-column lock: Total / Paid / Discount / Outstanding)
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` (`welcomeresort` 7-row regression set)

### CR-004
- `change_requests/CR_004_room_orders_pms_view.md`
- `change_requests/CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md`
- `change_requests/CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md`
- `change_requests/BE_2_LODGING_PAYMENT_BREAKDOWN.md` (§4.1 invariant)
- `handover/CR_004_IMPLEMENTATION_HANDOVER.md`

### BUG-048
- `BUG_TEMPLATE.md` row 51 + full BUG-048 section
- `bugs/BUG_048_INTAKE.md`
- `bugs/BUG_048_ROOM_REPORT_IMPACT_ANALYSIS.md`
- `bugs/BUG_048_IMPLEMENTATION_PLAN.md` (v2, owner-locked)
- `attachments/bug_048/screenshot_15-10-48.png`, `screenshot_15-11-32.png`, expanded-row screenshot
- Owner-supplied raw `/get-single-order-new` payload for order `825882` (verbatim in the plan)

### Current code (verified in this session)
- `frontend/src/components/reports/RoomRowCard.jsx` — `numbers` memo at **L345–415** (heuristic at L390–401 produces the bug). Display blocks at L495–560 (no change required).
- `frontend/src/pages/RoomOrdersReportPage.jsx` — `summaryTotals` memo at **L523–578** (mirror of the bug at L545–558).
- `frontend/src/api/transforms/orderTransform.js` `roomInfo` block at L334–368 — exposes every needed field; **no change**.
- `frontend/src/api/services/reportService.js` `getSingleOrderRoom` at L291–315 — pure passthrough; **no change**.

---

## 2. Baseline Conflict Check

| Rule | Source | Status |
|---|---|---|
| Module 10 — backend owns aggregation; FE owns presentation | `MODULE_DECISIONS_FINAL.md` | ✅ Compatible — change is presentation-layer math only, no payload mutation. |
| Four-column column set locked (Total / Paid / Discount / Outstanding) | `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | ✅ Unchanged — same four columns; only the values inside change. |
| `orderTransform.fromAPI.order` high-risk | `IMPLEMENTATION_AGENT_RULES.md` | ✅ Not touched. |
| BE-2 §4.1 pending backend | `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | ✅ Compatible — new model reads `order_amount` + `balance_payment` (already shipped by backend today) plus `discount_amount` when available. Does not depend on `receive_balance` for the settled branch. |
| CR-004 Phase 4.1 — `Food = order_amount + Σ associated_orders[].amount` | inline doc in `RoomRowCard.jsx:13-17` | ⚠️ **Revised for settled rows only.** New rule: settled → `roomService = max(0, order_amount − balance − associated_total)`. In-house path preserved. Code-comment update to the file-header doc-block is included in scope. |
| No `/app/memory/final/` edits | task directive | ✅ Honoured. |
| No `BUG_TEMPLATE.md` edits | task directive | ✅ Honoured. |

**Conclusion:** No blocking conflict. CR-004 Phase 4.1 doc-block needs an in-code clarification line. No `/app/memory/final/` sweep required.

---

## 3. Exact Current Code Sections to Change

### 3.1 `frontend/src/components/reports/RoomRowCard.jsx`

| Block | Lines | Action |
|---|---|---|
| File-header doc-block (CR-004 Phase 4.1 locked-formula note) | **L13–17** | **Comment update only** — add a one-line clarification that for settled rows, `order_amount` is the checkout collection and must have `balance_payment + associated_total` subtracted out before the residue is treated as room-service. |
| `numbers` memo body | **L362–401** | **Replace.** Drop in the owner-locked formulas from §8.1 of `BUG_048_IMPLEMENTATION_PLAN.md` v2. The memo's **return shape stays unchanged** (`transferredCount`, `food`, `total`, `paid`, `outstanding`, `discount`, `rent`, `advance`, `balance`, `roomOrderAmount`, `associatedOrders`) so all downstream consumers (collapsed strip L495–560, expanded card L572–594, header SummaryBar) work without modification. |

### 3.2 `frontend/src/pages/RoomOrdersReportPage.jsx`

| Block | Lines | Action |
|---|---|---|
| `summaryTotals` memo, per-row body | **L545–558** | **Replace.** Line-for-line mirror of (3.1)'s memo change so summary header pills stay in lock-step with the row cells. Surrounding scaffolding (declaration L523, accumulator reset L524–529, forEach scaffolding L530–540, accumulation L559–563, return L565–578) **untouched**. |

### 3.3 No other files touched

- `orderTransform.js` — no change. (Already exposes every needed field.)
- `reportService.js` — no change.
- `reportTransform.js` — no change.
- Any display blocks, sub-components (`RoomBillingCard`, `TransferredOrdersTable`), sub-pages, contexts, sockets — no change.

---

## 4. Pseudo-Diff (No Code Modification)

### 4.1 `RoomRowCard.jsx` — file-header doc-block (L13–17)

**Current:**
```
// Locked formulas (verified against live preprod 2026-04-29, see Phase 4.1):
//   Food        = RM-parent.order_amount + Σ associated_orders[].amount
//   Total       = roomInfo.roomPrice + Food
//   Outstanding = Food + max(0, roomInfo.balancePayment)
//                 (== what Collect Bill displays to the cashier)
```

**Proposed (after BUG-048):**
```
// Locked formulas (CR-004 Phase 4.1 + BUG-048 owner-locked model, 2026-05-12):
//   Food (in-house)  = RM-parent.order_amount + Σ associated_orders[].amount
//   Food (settled)   = Σ associated_orders[].amount
//                      + max(0, RM-parent.order_amount − room_info.balance_payment − Σ associated_orders[].amount)
//                      (∵ on settled rows, order_amount carries the checkout collection
//                         = balance_payment + associated + room_service; subtract balance
//                         and associated to isolate genuine room-service.)
//   Total            = roomInfo.roomPrice + Food
//   Paid (settled)   = min(advance + order_amount, Total)
//   Paid (in-house)  = advance + receive_balance
//   Outstanding      = max(0, Total − Paid)
//   Discount         = roomInfo.discountAmount only (no derived fallback)
```

### 4.2 `RoomRowCard.jsx` — `numbers` memo body (L362–401)

**Current shape (paraphrased):**
```js
const ri = detail.roomInfo;
const roomOrderAmount = parseFloat(detail.amount) || 0;
const associatedOrders = detail.associatedOrders || [];
const associatedTotal = associatedOrders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
const food = roomOrderAmount + associatedTotal;
const rent = parseFloat(ri.roomPrice) || 0;
const advance = parseFloat(ri.advancePayment) || 0;
const balance = parseFloat(ri.balancePayment) || 0;
const total = rent + food;
// BE-2 §4.1 derived math (wired 2026-05-01) …
const receiveBalance = parseFloat(ri.receiveBalance) || 0;
const isFullySettled = detail.fOrderStatus === 6;
const lodgingCollected = advance + receiveBalance;
const explicitDiscount = parseFloat(ri.discountAmount) || 0;
const derivedDiscount = isFullySettled
  ? Math.max(0, rent - lodgingCollected)
  : 0;
const discount = explicitDiscount > 0 ? explicitDiscount : derivedDiscount;
const outstanding = isFullySettled
  ? 0
  : food + Math.max(0, balance - receiveBalance);
const paid = lodgingCollected + (isFullySettled ? food : 0);
```

**Proposed shape (owner-locked model):**
```js
// BUG-048 — owner-locked calculation model (2026-05-12).
// Model:
//   room_info.room_price       = fixed room rent
//   room_info.advance_payment  = paid at check-in
//   room_info.balance_payment  = original balance owed; persists as a record after settlement
//   order_amount               = (settled) checkout collection = balance + associated + room_service
//                              | (in-house) running room-service tally on the RM parent (CR-004 Phase 4.1)
//   discount                   = room_info.discount_amount ONLY (no derivation)

const ri = detail.roomInfo;
const roomOrderAmount = parseFloat(detail.amount) || 0;       // RM-parent.order_amount
const associatedOrders = detail.associatedOrders || [];
const associatedTotal = associatedOrders.reduce(
  (s, o) => s + (parseFloat(o.amount) || 0), 0,
);
const rent             = parseFloat(ri.roomPrice)      || 0;
const advance          = parseFloat(ri.advancePayment) || 0;
const balance          = parseFloat(ri.balancePayment) || 0;
const receiveBalance   = parseFloat(ri.receiveBalance) || 0;
const isFullySettled   = detail.fOrderStatus === 6;
const explicitDiscount = parseFloat(ri.discountAmount) || 0;

// Settled → strip balance + associated out of order_amount to isolate room-service.
// In-house → existing CR-004 Phase 4.1 behaviour.
const roomService = isFullySettled
  ? Math.max(0, roomOrderAmount - balance - associatedTotal)
  : roomOrderAmount;

const food        = associatedTotal + roomService;
const total       = rent + food;
const paid        = isFullySettled
  ? Math.min(advance + roomOrderAmount, total)
  : advance + receiveBalance;
const outstanding = Math.max(0, total - paid);
const discount    = explicitDiscount;   // NO derivation — owner-locked
```

**Return shape (unchanged):**
```js
return {
  transferredCount: associatedOrders.length,
  food, total, paid, outstanding, discount,
  rent, advance, balance,
  roomOrderAmount,
  associatedOrders,
};
```

### 4.3 `RoomOrdersReportPage.jsx` — `summaryTotals` per-row body (L545–558)

**Current shape (paraphrased):**
```js
const rowSettled = detail.fOrderStatus === 6;
const advance = parseFloat(ri.advancePayment) || 0;
const balance = parseFloat(ri.balancePayment) || 0;
const receiveBalance = parseFloat(ri.receiveBalance) || 0;
const lodgingCollected = advance + receiveBalance;
const explicitDiscount = parseFloat(ri.discountAmount) || 0;
const derivedDiscount = rowSettled
  ? Math.max(0, (parseFloat(ri.roomPrice) || 0) - lodgingCollected)
  : 0;
const rowDiscount = explicitDiscount > 0 ? explicitDiscount : derivedDiscount;
const rowOut = rowSettled
  ? 0
  : rowFood + Math.max(0, balance - receiveBalance);
const rowPaid = lodgingCollected + (rowSettled ? rowFood : 0);
```

Note: in the current code, `rowFood` is computed *before* this block at L540 as `rmAmt + aoTotal`, and `rowTotal` at L541 as `rent + rowFood`. The proposed change shifts `rowFood`/`rowTotal` to be derived from the new `roomService` rule.

**Proposed shape (mirror of 4.2):**
```js
// BUG-048 — owner-locked model. Mirrors RoomRowCard.numbers line-for-line.
const rowSettled       = detail.fOrderStatus === 6;
const advance          = parseFloat(ri.advancePayment) || 0;
const balance          = parseFloat(ri.balancePayment) || 0;
const receiveBalance   = parseFloat(ri.receiveBalance) || 0;
const explicitDiscount = parseFloat(ri.discountAmount) || 0;
const rentVal          = parseFloat(ri.roomPrice)      || 0;

const rowRoomService = rowSettled
  ? Math.max(0, rmAmt - balance - aoTotal)
  : rmAmt;
const rowFoodVal     = aoTotal + rowRoomService;
const rowTotalVal    = rentVal + rowFoodVal;
const rowPaid        = rowSettled
  ? Math.min(advance + rmAmt, rowTotalVal)
  : advance + receiveBalance;
const rowOut         = Math.max(0, rowTotalVal - rowPaid);
const rowDiscount    = explicitDiscount;
```

Then the existing accumulator at L559–563 (`total += …; food += …; paid += …; outstanding += …; discount += …`) reads from these renamed locals. Variable names `rowFoodVal`/`rowTotalVal` are illustrative — final naming during implementation may keep `rowFood`/`rowTotal` if the existing names are easier to preserve diff-wise. The math is what matters.

---

## 5. Risk Analysis

### 5.1 Per-change risk

| Change | Risk | Rationale |
|---|---|---|
| `RoomRowCard.jsx:362–401` memo body replacement | **LOW–MEDIUM** | Atomic replacement of one memo. Memo return shape preserved; downstream display unchanged. Six unit scenarios (§6.1) cover settled/in-house, with/without food, with/without explicit discount. |
| `RoomOrdersReportPage.jsx:545–558` mirror replacement | **LOW** | Identical math change in a smaller block. Drives summary pills only. |
| `RoomRowCard.jsx:13–17` doc-block comment update | **NONE** | Comment only; no runtime impact. |

### 5.2 Cross-cutting risks

| Risk | Severity | Mitigation |
|---|---|---|
| `welcomeresort` settled rows regress | **LOW** | Under the new model, `welcomeresort` rows (where backend writes `order_amount = balance + food` and `receive_balance` correctly) produce the same Total / Paid / Outstanding because: `roomService = max(0, (balance + food) − balance − associated) = food` (when food = room-service), so `food = associated + room-service` ≡ today's `food = order_amount + associated`. Discount stays `—` (was `—` derived; now `—` because backend doesn't ship `discount_amount`). Verified by §6.3 scenario 1. |
| In-house rows regress | **LOW** | In-house branch literally preserves today's `food = order_amount + associated` formula (the `isFullySettled ? … : roomOrderAmount` ternary). Paid in-house path keeps `advance + receive_balance`. Outstanding switches from `food + max(0, balance − receive_balance)` to `max(0, total − paid)`. Both reduce to the same value when `food = 0`. For in-house rows with food, the new formula returns `total − (advance + receive_balance)` while the old returned `food + max(0, balance − receive_balance)`; with `food = order_amount + associated`, `total = rent + food`, and the invariant `rent − advance = balance`, both expressions agree as long as `receive_balance ≤ balance` (always true in-house). See §6.1 scenario 6. |
| Loss of "operator under-collection" flag | **LOW** | Per owner-locked rule, this was an FE invention. Under-collection now surfaces as a non-zero **Outstanding** (since `outstanding = max(0, total − paid)`); the Discount column no longer masks it. This is the owner's explicit intent. |
| Memo return-shape breakage | **NONE** | Return shape is preserved verbatim. |
| Header / row drift | **NONE** | Mirror is line-for-line; §6.2 asserts equality across six scenarios. |
| Cosmetic "Room service items ₹6,666" in expanded view | **KNOWN — deferred** | Still renders against this booking after fix (reads `roomOrderAmount` directly, not the new `roomService`). Owner approved deferral in v2 plan. |
| Red Balance styling after settlement | **KNOWN — deferred** | Same as above. Owner approved deferral. |

### 5.3 Reversibility

Single-commit reversion brings the system back to today's behaviour. No data migration, no payload change, no backend coupling.

---

## 6. Validation / Test Plan

### 6.1 Unit tests (co-located with `RoomRowCard.jsx` and `RoomOrdersReportPage.jsx`)

| # | Scenario | `f_order_status` | `room_price` | `advance` | `balance` | `order_amount` | `associated[]` | `discount_amount` | Total | Paid | Discount | Outstanding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Settled, no food (BUG-048 fixture — order 825882) | 6 | 9999 | 3333 | 6666 | 6666 | [] | absent | **9999** | **9999** | 0 (`—`) | 0 |
| 2 | In-house, advance only (BUG-048 pre-payment) | ≠6 | 9999 | 3333 | 6666 | 0 | [] | absent | 9999 | 3333 | 0 (`—`) | 6666 |
| 3 | Settled, real ₹500 lodging discount | 6 | 9999 | 3333 | 6166 | 6166 | [] | 500 | 9999 | 9499 | 500 | 0 |
| 4 | Settled, ₹500 transferred order rolled into `order_amount` | 6 | 9999 | 3333 | 6666 | 7166 | [{amount: 500}] | absent | 10499 | 10499 | 0 (`—`) | 0 |
| 5 | Settled, ₹500 transferred order paid separately | 6 | 9999 | 3333 | 6666 | 6666 | [{amount: 500}] | absent | 10499 | 9999 | 0 (`—`) | 500 |
| 6 | In-house, ₹500 room-service in `order_amount`, advance only | ≠6 | 9999 | 3333 | 6666 | 500 | [] | absent | 10499 | 3333 | 0 (`—`) | 7166 |

Tests run identically against `RoomRowCard.numbers` and against each per-row contribution of `RoomOrdersReportPage.summaryTotals`.

### 6.2 Header / row consistency

Add a snapshot equality test over scenarios 1–6: for every row, `RoomRowCard.numbers.{total,paid,discount,outstanding}` must equal the per-row tuple added to `RoomOrdersReportPage.summaryTotals`.

### 6.3 Regression matrix

| Behaviour | Today | After fix |
|---|---|---|
| BUG-048 booking (settled, no food, no real discount) | Total 16,665 / Paid 9,999 / Discount 6,666 / Outstanding 0 | **Total 9,999 / Paid 9,999 / Discount — / Outstanding 0** ✅ |
| `welcomeresort` settled rows (clean backend payloads) | Total / Paid / Discount — / Outstanding 0 | Identical ✅ |
| Settled room with backend-issued `discount_amount > 0` | Discount = explicit value | Identical ✅ |
| In-house rows (no food) | unchanged | unchanged ✅ |
| In-house rows (with room-service) | Total includes food | Total includes food ✅ |

### 6.4 Manual smoke (post-implementation, before owner sign-off)

- All / Paid / Unpaid tabs render the BUG-048 row correctly.
- Summary header pills equal row sums.
- Settling a room while the page is open updates the row in place (live socket path unchanged).
- Remove-from-Room pill still functional for in-house rooms with operator permission.
- `welcomeresort` regression set still reconciles.

### 6.5 Owner smoke checklist

Lifted directly from `BUG_048_IMPLEMENTATION_PLAN.md` v2 §11. Eight steps; standard pass.

---

## 7. What Will NOT Change

| Surface | Reason |
|---|---|
| Backend / any API endpoint | Backend behaviour matches the new model on this booking; no payload contract change required. |
| `frontend/src/api/transforms/orderTransform.js` (all blocks including `roomInfo` L334–368, `associatedOrders` L290–304, top-level `amount` ~L150) | Already exposes every needed field. |
| `frontend/src/api/services/reportService.js` `getSingleOrderRoom` (L291–315) | Pure unwrap-and-delegate. |
| `frontend/src/api/transforms/reportTransform.js` | Not on this path. |
| `RoomRowCard.jsx` collapsed-strip display blocks (L495–560) | Display reads `numbers.{total,paid,discount,outstanding}`; return shape unchanged. |
| `RoomRowCard.jsx` Discount display block (L515–534) | Already renders `—` when `numbers.discount === 0`. |
| `RoomRowCard.jsx` `RoomBillingCard` sub-component (L77–115) | Reads `room_info.room_price` directly; matches locked model. |
| `RoomRowCard.jsx` `TransferredOrdersTable` (L117–257) including "Room service items" line | Deferred follow-up per owner. |
| `RoomBillingCard` red Balance styling (L106) | Deferred follow-up per owner. |
| `RoomOrdersReportPage.jsx` outside L545–558 | Filter pills, fetch path, Remove-from-Room wiring, SummaryBar component, date handling — out of scope. |
| Initial-load APIs (`/get-room-list`, `/order-logs-report`) | Defect is in the lazy detail call. |
| Room payment write paths, check-in / check-out, OrderContext / socket payloads | Not in defect path. |
| Remove-from-Room logic (CR-004 Phase 2 PR-2) | Not in defect path. |
| BUG-042 / BUG-044 / BUG-045 / BUG-046 surfaces | Unrelated bugs. |
| `/app/memory/final/*` | Task directive. |
| `BUG_TEMPLATE.md` | Task directive. |
| Export paths (CSV / PDF) | P2 follow-up; out of BUG-048 scope. |

---

## 8. Owner Approval Gate

Before code is written, owner must explicitly approve **each** of the following:

| # | Item | Owner sign-off required |
|---|---|---|
| 8.1 | **Two files only** will be edited: `frontend/src/components/reports/RoomRowCard.jsx` (L13–17 comment + L362–401 memo body) and `frontend/src/pages/RoomOrdersReportPage.jsx` (L545–558 mirror). No other production file touched. | ☐ |
| 8.2 | **Owner-locked calculation model** in §4.2 / §4.3 is the canonical formula. Discount comes ONLY from `room_info.discount_amount`. No derived fallback. | ☐ |
| 8.3 | **Deferred follow-ups** (Room service items ₹6,666 line in expanded view; red Balance styling on settled rooms) are NOT in this fix. Filed as a separate cosmetic ticket. | ☐ |
| 8.4 | **In-house rows behaviour preserved** — same numbers as today, same code path (the `isFullySettled ? … : roomOrderAmount` branch). | ☐ |
| 8.5 | **`welcomeresort` regression set** must continue to reconcile. Per §5.2 / §6.3, the formula is provably equivalent on payloads where backend ships `receive_balance` cleanly. | ☐ |
| 8.6 | **Unit tests** for the six §6.1 scenarios will be added in the same PR. | ☐ |
| 8.7 | **No `/app/memory/final/` or `BUG_TEMPLATE.md` updates** in this PR. | ☐ |
| 8.8 | **Pathing note** (§0) — the on-disk path is `components/reports/RoomRowCard.jsx` (not `components/rooms/`). Owner acknowledges. | ☐ |

Until all eight rows are checked, no code is written.

---

## 9. Final Verdict

**`ready_for_owner_code_gate_review`** ✅

- Owner-locked model captured in source-of-truth plan v2.
- Two files; exact line ranges; pseudo-diffs in §4.
- No backend dependency; no baseline doc-sweep required.
- Single-commit reversible.
- Risk LOW–MEDIUM, bounded to one memo + its mirror.
- Test plan (6 unit scenarios + regression matrix + manual smoke) ready.
- Approval gate (§8) blocks code writing pending owner sign-off.

---

## 10. Confirmation

- ❌ No code modified.
- ❌ No `/app/memory/final/` updates.
- ❌ No `BUG_TEMPLATE.md` updates.
- ❌ No backend changes.
- ❌ No QA report.
- ✅ Pre-implementation code gate doc created at `/app/memory/bugs/BUG_048_PRE_IMPLEMENTATION_CODE_GATE.md`.
- ✅ Scope strictly limited to BUG-048.
- ✅ Pathing slip flagged transparently in §0.

---

*End of BUG-048 Pre-Implementation Code Gate. Awaiting owner sign-off on §8 before code is written.*
