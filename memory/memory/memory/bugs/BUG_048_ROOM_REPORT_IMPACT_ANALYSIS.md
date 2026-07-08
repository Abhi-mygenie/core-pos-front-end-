# BUG-048 — Room Orders Report Impact Analysis

> **Sprint:** pos_final_1.0
> **Task type:** Bug Impact Analysis (read-only)
> **Bug ID:** BUG-048
> **Title:** Room Orders Report wrongly shows Discount ₹6,666 and inflated Total ₹16,665 after final room payment
> **Date:** 2026-05-12 (current session)
> **Verdict:** `needs_backend_response_sample` + `frontend_fix_ready_for_planning` (defensive frontend hardening can ship independently)
> **Scope guard:** Pending-Payment / PayLater dashboard "NA" issue is out of scope for this analysis (filed separately).

---

## 1. Docs Read

### `/app/memory/final/` (baseline rules — read-only)
- `FINAL_DOCS_APPROVAL_STATUS.md` — confirms **OD-02 / OQ-12** (Room billing & print lifecycle ownership) is still **deferred**. No final-doc rule prescribes the post-checkout Room-Orders-Report discount / total formulas.
- `ARCHITECTURE_DECISIONS_FINAL.md` — Module 10 (Reports) section explicitly names `RoomOrdersReportPage.jsx` + `RoomRowCard.jsx` as PMS-style read-only view (CR-004 lineage). No payload mutation expected.
- `MODULE_DECISIONS_FINAL.md` — §10 Reports presentation-only; backend owns aggregation. Front-end MUST present derived numbers, but must NOT recompute settlement state.
- `CHANGE_REQUEST_PLAYBOOK.md` — high-risk-file protocol applies to `orderTransform.js` and `reportService.js` (both surfaced in this analysis as read-only candidates).
- `IMPLEMENTATION_AGENT_RULES.md` — §"Areas that must not be changed casually" pre-emptively flags any change to `orderTransform.fromAPI.order` and `reportTransform.singleOrderNew`.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — OQ-12 (Room billing lifecycle) deferred; no decision blocks this bug's frontend-side defence.

### Overlay docs (post-baseline)
- `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — confirms CR-004 Bucket A (Paid column + Discount column on Room Orders Report) is **shipped and merged**.
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — locks the four columns (Total / Paid / Discount / Outstanding) on the Room Orders Report.
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md` — lists **BE-2 §4.1** (`room_info` to ship explicit `lodging_collected`, `discount_amount`, `discount_reason`) as **still pending backend**.
- `change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` — confirms BE-2 §4.1 has been UNPARKED and is owned by backend; no FE workaround was approved.
- `change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` — Bucket BE-2 still open; FE is running on the "approximate / heuristic" formula until BE-2 §4.1 lands.
- `change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` — last validation pass (`welcomeresort` tenant — 7 settled rooms all reconcile to ₹0 outstanding cleanly). Demonstrates the **heuristic works when backend behaves**, which is the precise reverse-tell of this bug: on the abhsihek/r1 booking the backend is misbehaving.

### CR-004 docs
- `change_requests/CR_004_room_orders_pms_view.md` (Phase 1 PMS-style view, **read-only**, reuses `/get-single-order-new`).
- `change_requests/CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md` (filter-pill data-source split; not relevant to the discount/total bug).
- `change_requests/CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md` (Paid column formula `paid = max(0, total − outstanding)` is the **previous** formula; explicitly superseded by BE-2 §4.1 derived math wired 2026-05-01).
- `change_requests/CR_004_BACKEND_EXT_sub_cr.md` — ancestor backend ask; superseded by BE-2.
- `change_requests/BE_2_LODGING_PAYMENT_BREAKDOWN.md` — **the canonical reference for the contract this bug violates**. §4.1 prescribes three new `room_info` fields (`lodging_collected`, `discount_amount`, `discount_reason`) and an invariant: `lodging_collected + discount_amount + balance_payment === room_price`. The bug is the visible symptom of that backend ask not being delivered.
- `handover/CR_004_IMPLEMENTATION_HANDOVER.md` — implementation log.

### BUG-048 (this bug)
- `bugs/BUG_048_INTAKE.md` — intake doc.
- `attachments/bug_048/screenshot_15-10-48.png` + `screenshot_15-11-32.png` — owner-supplied evidence.
- `BUG_TEMPLATE.md` row 51 + full BUG-048 section at L3915.

---

## 2. Baseline Conflict Check

| Rule | Source | Compatibility with this fix |
|---|---|---|
| Module 10 (Reports) — backend owns aggregation; FE owns presentation | `MODULE_DECISIONS_FINAL.md` | ✅ COMPATIBLE — the proposed fix tightens *presentation* (defensive guards on a heuristic). The backend ask (BE-2 §4.1) is already on the backend's plate. |
| `orderTransform.fromAPI.order` is a high-risk file | `IMPLEMENTATION_AGENT_RULES.md` | ⚠️ Touch ONLY if the fix requires reading new `room_info.*` fields. Today's transform already exposes the right fields; no edit needed for a frontend defensive patch. |
| OD-02 / OQ-12 — Room billing lifecycle deferred | `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | ✅ COMPATIBLE — defensive guard does NOT prescribe lifecycle policy. |
| BE-2 §4.1 owner-decision is pending backend | `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | ✅ COMPATIBLE — fix is interim; once BE-2 lands, the heuristic can collapse to the exact formula from `BE_2_LODGING_PAYMENT_BREAKDOWN.md` §6 with no further owner approval. |
| No `/app/memory/final/` edits | task directive | ✅ Honoured — analysis-only. |

**Verdict:** No baseline conflict. A defensive frontend hardening + a backend follow-up (BE-2 §4.1) is the right shape.

---

## 3. BUG-043 vs BUG-048 — Relationship Decision

| Dimension | BUG-043 | BUG-048 |
|---|---|---|
| Title | "Room Orders Report — Wrongly Shows Discount Column / Value" | Same area + adds Total-inflation defect |
| Evidence | None — "Screenshot of the current Room Orders Report: NOT provided at intake time" | Two owner screenshots before/after settlement |
| Owner clarification on what's wrong | Pending ("hide column entirely vs correct values") | Explicit: discount is unused; ₹6,666 was outstanding, not discount; Total should remain ₹9,999 |
| Defects reported | 1 (Discount column / value misclassification) | **2** — (a) Discount mis-mapping AND (b) **Total inflates by ₹6,666** |
| State | Open / Intake Created | Open / Intake Created |

**Decision: `duplicate_or_supersedes_bug_043` → BUG-048 supersedes BUG-043.**

Rationale:
- BUG-048's evidence resolves the column-vs-value ambiguity BUG-043 was waiting on. The column must remain (per CR-004 Bucket A + BE-2 §4.1, which explicitly designed it to surface approved write-offs) but the populated value must be correct.
- BUG-048 carries a **strictly broader** defect set (Total inflation is a new finding absent from BUG-043).
- Recommendation: mark BUG-043 as **duplicate-of-BUG-048** in the tracker; migrate the BUG-043 entry's "Notes" line (`Unknown whether the same defect appears in the exported file (Excel / CSV / PDF) or only on-screen`) into BUG-048's Unknowns when the Implementation Planning agent picks this up (export path is a P2 follow-up).

The BUG_TEMPLATE.md edit for that supersedure is **not** performed here per directive ("Do not update BUG_TEMPLATE.md").

---

## 4. API Endpoint / Data Source

| # | Surface | Source | Notes |
|---|---|---|---|
| 1 | Room Orders Report page row list (initial) | `POST /api/v2/vendoremployee/get-room-list` (Unpaid pill) **OR** `POST /api/v2/vendoremployee/report/order-logs-report` (Paid pill) **OR** union of both (All pill) | Per `CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md` Rule 1, wired in `RoomOrdersReportPage.jsx` `fetchOrders`. |
| 2 | Per-row Total / Paid / Discount / Outstanding | `POST /api/v2/vendoremployee/get-single-order-new` (lazy, one call per visible row) → `getSingleOrderRoom(parentOrderId)` in `reportService.js:291–315` → transformed by **`orderTransform.fromAPI.order(raw)`** (`orderTransform.js:117` onwards) | The `room_info` block (`orderTransform.js:334–368`) is the field source under inspection. |
| 3 | Summary header pills (Rooms / Total / Paid / Discount / Outstanding) | Aggregates the same `getSingleOrderRoom` payloads cached in `detailCacheRef` — see `RoomOrdersReportPage.jsx:523–578`. **Same source as row cells; same formula; same defect.** | Owner-confirmed: row and summary drift together. |
| 4 | Backend room-payment write path | `POST /api/v1/vendoremployee/order-bill-payment` (when the cashier collects the outstanding via Collect Bill) or a room-payment endpoint (out of scope to confirm here). The relevant artefact is what *that* write does to `room_info.receive_balance`, `f_order_status`, and any `associated_order_list[]` entry. | **Suspected misbehaviour at this layer** — needs raw response sample. |

---

## 5. Current UI / Component Mapping

### 5.1 Page: `/app/frontend/src/pages/RoomOrdersReportPage.jsx`
- Mounts `<RoomRowCard>` per row (L600-ish).
- Builds `summaryTotals` memo (L523–578) — duplicates RoomRowCard's row formula across the cached detail of every visible row. **Same formula in both surfaces** — see §6.

### 5.2 Row: `/app/frontend/src/components/reports/RoomRowCard.jsx`
- Owns the per-row detail fetch (L301–340) via `getSingleOrderRoom(parentOrderId)`.
- Computes `numbers` (Total / Paid / Discount / Outstanding / Food / Rent / Advance / Balance / Associated) in a single memo at **L345–415**.
- Renders Total at **L495–503**, Paid at **L504–514**, Discount at **L515–534**, Outstanding at **L535–560**.

### 5.3 Service: `/app/frontend/src/api/services/reportService.js`
- `getSingleOrderRoom(orderId)` at L291–315. Unwraps response shape variants and returns `orderTransformFromAPI.order(raw)` — **uses the order-side transform, not the report-side `singleOrderNew` transform**. This is deliberate (per CR-004 Phase 1 decision) and explains why the FE sees the full `roomInfo` block.

### 5.4 Transform: `/app/frontend/src/api/transforms/orderTransform.js`
- `fromAPI.order` at L117 onwards.
- `roomInfo` block at L334–368, exposes:
  - `roomPrice` = `room_info.room_price`
  - `advancePayment` = `room_info.advance_payment`
  - `balancePayment` = `room_info.balance_payment` *(known stale on settled rooms per BE-2 §4.1)*
  - `receiveBalance` = `room_info.receive_balance` *(BE-2 §4.1 — present on backend today but value semantics are the suspected gap)*
  - `discountAmount` = `room_info.discount_amount` *(BE-2 §4.1 explicit field — still pending backend per `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`)*
  - `discountReason` = `room_info.discount_reason` *(same)*
- `associatedOrders` block at L290–304, maps `associated_order_list[]` items by `{orderId, orderNumber, amount, transferredAt, _raw}`.
- `amount` (top-level) at ~L150 = `parseFloat(api.order_amount) || 0` — the RM-parent's own `order_amount`.

---

## 6. Current Transform / Calculation

The owner-visible numbers are produced by **exactly one formula, mirrored in two places** (row and summary).

### 6.1 Per-row (`RoomRowCard.jsx:345–415`)

```js
const ri = detail.roomInfo;
const roomOrderAmount = parseFloat(detail.amount) || 0;          // RM-parent.order_amount
const associatedOrders = detail.associatedOrders || [];
const associatedTotal = associatedOrders.reduce(
  (s, o) => s + (parseFloat(o.amount) || 0), 0,
);
const food = roomOrderAmount + associatedTotal;                  // (1)
const rent = parseFloat(ri.roomPrice) || 0;
const advance = parseFloat(ri.advancePayment) || 0;
const balance = parseFloat(ri.balancePayment) || 0;
const total = rent + food;                                       // (2) ← Total formula
const receiveBalance = parseFloat(ri.receiveBalance) || 0;
const isFullySettled = detail.fOrderStatus === 6;
const lodgingCollected = advance + receiveBalance;               // (3) ← Paid base
const explicitDiscount = parseFloat(ri.discountAmount) || 0;
const derivedDiscount = isFullySettled
  ? Math.max(0, rent - lodgingCollected)                         // (4) ← Discount heuristic
  : 0;
const discount = explicitDiscount > 0 ? explicitDiscount : derivedDiscount;
const outstanding = isFullySettled
  ? 0
  : food + Math.max(0, balance - receiveBalance);                // (5)
const paid = lodgingCollected + (isFullySettled ? food : 0);     // (6)
```

### 6.2 Summary header (`RoomOrdersReportPage.jsx:523–578`)

Bit-identical formula iterated over the cache (`detailCacheRef`) of every visible row, then summed. **No drift between surfaces — both are produced by the same predicate set.**

### 6.3 Reconciliation with owner's evidence

For the after-payment state (`abhsihek` / `r1` / room price ₹9,999 / advance ₹3,333 / final settlement ₹6,666) the screen reads:

| Metric | Owner sees | What formula produces |
|---|---|---|
| Total | ₹16,665 | `rent + food = 9,999 + 6,666 = 16,665` → therefore **`food = 6,666`** |
| Paid | ₹9,999 | `lodgingCollected + (settled?food:0)`. With `food = 6,666`, only way to land on 9,999 is `lodgingCollected = 3,333` AND `settled = true` AND `paid = 3333 + 6666 = 9999` ✓ |
| Discount | ₹6,666 | `explicitDiscount > 0 ? explicit : derived`. `derivedDiscount` requires `settled = true` AND `rent - lodgingCollected = 9999 - 3333 = 6666` ✓ — OR `explicitDiscount = 6666` shipped by backend |
| Outstanding | ₹0 | `settled ? 0 : …` → `0` ✓ (settled) |

**The only configuration that reconciles every visible number is:**
1. `f_order_status === 6` (settled). ✓
2. `roomInfo.advance_payment = 3,333`. ✓
3. `roomInfo.receive_balance = 0` (NOT 6,666). ✗ ← **first backend defect candidate**
4. EITHER `detail.amount = 6,666` (the RM parent's `order_amount` is being written to 6,666 after settlement) OR there is one `associated_order_list[]` row with `order_amount = 6,666` AND no other associated rows. ✗ ← **second backend defect candidate**
5. `roomInfo.discount_amount` is EITHER `0` (in which case the FE heuristic `derivedDiscount = max(0, 9999-3333) = 6666` fires and explains the column) OR `6,666` (backend wrote it). ⚠️ — **third candidate; cannot disambiguate without a raw response sample**.

The defining diagnostic question:
> **Does `/get-single-order-new(<this room's order_id>)` return `room_info.receive_balance = 0` while `room_info.balance_payment = 0` and `f_order_status = 6`?**
>
> If yes → backend isn't writing `receive_balance` on the final-payment write → FE heuristic mis-fires AND food is unrelated to discount.
> If `receive_balance = 6666` → the FE math wouldn't render Discount as 6666 because `lodgingCollected = 9999`, `derivedDiscount = 0`. Therefore `discount_amount` itself must be the source.

---

## 7. Expected Business Calculation (per owner clarification)

For a room booking where **no discount is applied**, the room cycle is:

| State | Total | Paid | Discount | Outstanding |
|---|---|---|---|---|
| At check-in (advance only) | ₹9,999 | ₹3,333 | — / 0 / hidden | ₹6,666 |
| After full settlement | **₹9,999** | **₹9,999** | **— / 0 / hidden** | **₹0** |

Invariants (from `BE_2_LODGING_PAYMENT_BREAKDOWN.md` §4.1, owner-locked):
```
lodging_collected + discount_amount + balance_payment === room_price
discount_amount === 0   while the room is in-house OR when no discount was applied
balance_payment  === 0  when the room is cleanly checked out (no leftover)
```

In the abhsihek case (settled, no discount, no food):
```
lodging_collected = 9,999   (3,333 advance + 6,666 receive_balance)
discount_amount   = 0
balance_payment   = 0
9,999 + 0 + 0     === 9,999 = room_price  ✓
```

Frontend must render:
- `Total = room_price + food = 9,999 + 0 = 9,999`
- `Paid = lodging_collected + (settled ? food : 0) = 9,999 + 0 = 9,999`
- `Discount = discount_amount = 0` (column shows `—`)
- `Outstanding = settled ? 0 : … = 0`

---

## 8. Root-Cause Hypothesis

**Two backend defects + one frontend amplification, ranked by likelihood.**

### H1 (highest likelihood) — Backend: `receive_balance` not written on the final-payment write
- After the cashier collects the outstanding ₹6,666, the backend marks `f_order_status = 6` but **does not** increment `room_info.receive_balance` to reflect the collected amount.
- The frontend's `derivedDiscount` heuristic (L394–396) was specifically designed to flag operator under-collection. With `receive_balance = 0`, the heuristic interprets the ₹6,666 gap as an under-collection (i.e., a write-off) — and that's exactly what shows in the Discount column.
- **Evidence:** the FE was validated on `welcomeresort` (7 settled rooms reconciling cleanly per `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`). The math works when backend writes `receive_balance` correctly. The owner's tenant is presumably different, OR a recent backend regression broke this path on the abhsihek booking.

### H2 (also required to explain Total inflation) — Backend: a synthetic ledger entry of ₹6,666 is being attached to the room
- After settlement, the backend appears to be either (a) stamping `RM_parent.order_amount = 6,666` OR (b) injecting an `associated_order_list[]` entry of amount ₹6,666 representing the final payment as if it were a food order line.
- The frontend's `food = RM_parent.order_amount + Σ associated_order_amount` formula (CR-004 Phase 4.1 locked formula, verified against preprod 2026-04-29) is **correct for its contract** — it sums *items consumed*. A backend that mis-emits a payment as a food line will inflate this number.
- **Diagnostic confirmation needed:** raw `/get-single-order-new` response for this booking. Look at:
  - `order_amount` on the top-level RM order
  - `associated_order_list[]` entries (each entry's `order_amount`, `order_in`, `payment_status`, `collect_Bill`)
  - whether any new entry was created at the time of final settlement

### H3 (alternative to H1) — Backend: `discount_amount` written incorrectly
- Per `BE_2_LODGING_PAYMENT_BREAKDOWN.md` §4.1, backend was expected to ship `room_info.discount_amount` explicitly. If backend now ships it but writes the *outstanding remaining at checkout* into that field instead of leaving it `0`, the FE renders Discount = ₹6,666 from `explicitDiscount` (the `discountAmount > 0 ? explicit : derived` branch in `RoomRowCard.jsx:397`).
- **Disambiguation:** if `receive_balance = 6,666` AND `discount_amount = 6,666`, then `lodgingCollected = 9,999` AND `explicitDiscount = 6,666` → the heuristic branch is bypassed but the FE still shows ₹6,666 because backend wrote it. This still requires a backend fix (don't ship `discount_amount` when no discount was applied).
- **Raw response sample is decisive** between H1 and H3.

### Frontend amplification (the FE's role in this bug)
- The `derivedDiscount` heuristic (L394–396) and the bundled-food semantic of `paid = lodgingCollected + (settled ? food : 0)` (L401) were both designed under the assumption that backend ships either:
  - `receive_balance` correctly on every settlement, OR
  - an explicit `discount_amount` (BE-2 §4.1).
- When backend ships *neither*, the FE has no way to distinguish "operator under-collected" from "backend forgot to write receive_balance". The mis-fire is therefore **expected** under the current contract, but the visual impact (mis-labelled Discount + inflated Total) is unacceptable for ops.

---

## 9. Frontend vs Backend Classification

| Defect | Primary owner | Why |
|---|---|---|
| Discount column shows ₹6,666 after final payment | **Backend (root)** — either `receive_balance = 0` (H1) or `discount_amount = 6666` (H3). FE renders correctly per contract; the heuristic for "under-collection" mis-fires due to missing field. | Per BE-2 §4.1, this field set is the backend's contract obligation. The FE heuristic is a *defensive interim* per `orderTransform.js:349–353` comment ("BE-2 §4.1 (still pending backend) — keep null fallbacks until BE ships explicit discount fields"). |
| Total shows ₹16,665 after final payment | **Backend (root)** — synthetic ledger entry of ₹6,666 is leaking into `order_amount` or `associated_order_list[]`. FE's `food = roomOrderAmount + associatedTotal` is the locked CR-004 formula. | The owner explicitly states there is no food order. The FE cannot synthesize a ₹6,666 line; it can only sum what backend ships. |
| Summary header mirrors row drift | **Frontend (cosmetic)** — same formula iterated in `RoomOrdersReportPage.jsx:523–578`. Tracks the row, so no separate defect. | Both fix together. |
| Defensive frontend hardening (mitigation) | **Frontend (interim)** — possible to make the heuristic more conservative (e.g., do not display `derivedDiscount` when `receive_balance === 0` AND `balance_payment === 0`, since that pattern is more likely to indicate a backend gap than a real write-off). | This is an interim until BE-2 lands. Owner approval required. |

**Net classification: `MIXED` with primary ownership at backend.**

---

## 10. Exact Files / Functions Likely Affected (by surface)

### Backend (root cause — owner needs to file a backend ticket)
| Path | What to change |
|---|---|
| (Backend) `/get-single-order-new` response builder for RM orders | Honour `BE_2_LODGING_PAYMENT_BREAKDOWN.md` §4.1 invariant: on every room payment write, set `room_info.receive_balance` = (advance + checkout) and zero `balance_payment` after a clean settlement. Set `discount_amount` only when a real write-off occurred. |
| (Backend) Final-payment write path for room outstanding | Do NOT inject the final-payment amount as an entry into `associated_order_list[]` and do NOT increment `order_amount` on the RM parent. The collected amount belongs in `receive_balance`, not in the food / associated-order ledger. |

### Frontend (interim defence — independently shippable, owner-approval gated)
| Path | Surface | What to change |
|---|---|---|
| `frontend/src/components/reports/RoomRowCard.jsx:345–415` | `numbers` memo (Discount + Total derivation) | **Bucket B1 (Discount heuristic guard):** in the `derivedDiscount` branch, additionally require that the settlement carries a believable `lodging_collected` signal — i.e., gate the derivation on `receiveBalance > 0 OR balance === 0`. When both `receive_balance` and `balance_payment` are `0` on a settled room, suppress the derived value (render `—`) instead of flagging a phantom write-off. The path stays open for the real BE-2 §4.1 case (explicit `discountAmount > 0`). |
| same file | Same memo, `total` line | **Bucket B2 (Total guard):** when the room is settled AND there is exactly one associated-order entry whose amount equals the prior outstanding (`rent − advance`), and there are no other food signals (no other associated rows, no items in the raw payload), treat the entry as a payment ledger leak and exclude it from `food`. This is heuristic and should ship only if owner accepts a defensive FE patch. |
| `frontend/src/pages/RoomOrdersReportPage.jsx:523–578` | `summaryTotals` memo | Mirror whatever change ships in `RoomRowCard.numbers` so the summary stays in lock-step. |
| `frontend/src/api/transforms/orderTransform.js:334–368` | `roomInfo` block | **No change required** for either bucket. The transform already exposes every BE-2 §4.1 field. Touch ONLY if owner asks for a typed coercion change. |
| `frontend/src/api/services/reportService.js:291–315` | `getSingleOrderRoom` | **No change required.** Pure unwrap-and-delegate. |
| `frontend/src/api/transforms/reportTransform.js` | — | **No change required.** This path uses `orderTransform.fromAPI.order`, not `reportTransform.singleOrderNew`. |

### Files explicitly NOT to touch
- `/app/memory/final/*` (per task directive).
- `BUG_TEMPLATE.md` (per task directive).
- `socketHandlers.js` (BUG-042-C closed).
- `orderTransform.collectBillExisting` (BUG-042-B closed).
- `transferToRoom` builder / `/order-shifted-room` endpoint.
- `CollectPaymentPanel.jsx` payment rail (BUG-042-A closed).
- `OrderTable.jsx`, `AllOrdersReportPage.jsx` — unrelated to Room Orders Report.
- Initial-load API (`/get-room-list`, `/order-logs-report`) — not in the defect path.
- Export paths (CSV / PDF) — separate P2 follow-up; not in BUG-048 scope yet.

---

## 11. Required Backend / API Evidence

Implementation Planning agent MUST request the following before locking the frontend defensive patch:

### 11.1 Raw `/get-single-order-new` response for the abhsihek / r1 booking
Two captures — owner / preprod operator to provide:
- **Capture A — after advance only** (before the final ₹6,666 settlement).
- **Capture B — after full settlement** (the state shown in `screenshot_15-10-48.png`).

Diff the two payloads on the following fields:
- Top-level: `order_amount`, `f_order_status`, `restaurant_order_id`, `created_at`, `updated_at`.
- `room_info.room_price`, `room_info.advance_payment`, `room_info.balance_payment`, `room_info.receive_balance`, `room_info.discount_amount`, `room_info.discount_reason`, `room_info.payment_status`, `room_info.balance_payment_mode`.
- `associated_order_list[]` — count, each entry's `id`, `restaurant_order_id`, `order_amount`, `order_in`, `payment_status`, `collect_Bill`.

### 11.2 Owner clarification (one question)
> "When the cashier collects the outstanding ₹6,666, which UI flow is being used? Is it the room-side 'Collect Bill' / 'Settle' button, or the Audit Report 'Collect Bill' drawer, or a different endpoint?"

This tells us which backend write path to investigate.

### 11.3 Curl probes Implementation Planning can run on preprod (after the owner provides a token)

```bash
TOKEN="<from devtools>"
ORDER_ID=<r1 booking parent order id>

# Probe 1 — current backend view of room_info + associated list
curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/get-single-order-new" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"order_id\": $ORDER_ID}" \
  | python3 -c "
import sys, json
o = json.load(sys.stdin)
order = (o.get('orders') or {}).get('order_details_order') or (o.get('orders') or [None])[0] or o.get('order_details_order') or o
ri = order.get('room_info') or {}
print('f_order_status      :', order.get('f_order_status'))
print('order_amount (RM)   :', order.get('order_amount'))
print('room_info.room_price        :', ri.get('room_price'))
print('room_info.advance_payment   :', ri.get('advance_payment'))
print('room_info.balance_payment   :', ri.get('balance_payment'))
print('room_info.receive_balance   :', ri.get('receive_balance'))
print('room_info.discount_amount   :', ri.get('discount_amount'))
print('room_info.discount_reason   :', ri.get('discount_reason'))
print('room_info.payment_status    :', ri.get('payment_status'))
print('associated count            :', len(order.get('associated_order_list') or []))
for i, ao in enumerate(order.get('associated_order_list') or []):
    print(f'  ao[{i}].id={ao.get(\"id\")} amount={ao.get(\"order_amount\")} order_in={ao.get(\"order_in\")} payment_status={ao.get(\"payment_status\")} collect_Bill={ao.get(\"collect_Bill\")} restaurant_order_id={ao.get(\"restaurant_order_id\")}')
"
```

Output answers H1 vs H2 vs H3 in one shot.

---

## 12. Recommended Fix Options

### Option A — Wait for BE-2 §4.1 to land, no FE change (BEST CORRECTNESS, longest TIMELINE)
- **Pros:** Single fix at the source. `BE_2_LODGING_PAYMENT_BREAKDOWN.md` §6 already prescribes the exact FE collapse (one ~10-line replacement of the heuristic).
- **Cons:** Operator-visible defect persists on preprod until backend ships. Already pending per `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`; no committed date.
- **Recommendation:** owner-blocking unless preprod ops can tolerate the wrong display.

### Option B — Frontend defensive patch (interim, owner-approval gated)
- **Bucket B1 — Discount heuristic guard.** When `isFullySettled && receiveBalance === 0 && balance === 0 && explicitDiscount === 0`, render Discount as `—` (treat as backend ambiguity, do NOT infer a write-off). Roughly 3 lines + a test in `RoomRowCard.jsx:393–397`.
- **Bucket B2 — Total guard.** When `isFullySettled && associatedOrders.length === 1 && (associatedOrders[0].amount + advance === rent)`, exclude that single entry from `food` (interpret as a payment-ledger leak). ~8 lines + tests in `RoomRowCard.jsx:362–372`. **Higher risk — could mis-hide a real food order that happens to equal `(rent − advance)`.** Owner-approval-required.
- **Bucket B3 — Summary mirror.** Mirror B1/B2 in `RoomOrdersReportPage.jsx:540–558`.
- **Pros:** ships in ~½ day; gets the operator-visible defect off ops' radar while backend works on BE-2 §4.1.
- **Cons:** layered heuristic on top of heuristic; needs to be removed cleanly once BE-2 §4.1 lands.

### Option C — Hybrid (RECOMMENDED)
- File a backend ticket today (cite BE-2 §4.1 §4.1 plus the H1/H2/H3 diagnostic from §8).
- Ship Bucket B1 only (Discount guard) as the interim FE patch — low risk, narrow scope, easy to remove.
- Defer Bucket B2 (Total guard) until the raw `/get-single-order-new` response is captured. If the response confirms the synthetic-ledger-entry hypothesis, route the fix entirely to backend; do NOT ship the FE heuristic for Total.

---

## 13. What NOT to Change

| Surface | Reason |
|---|---|
| `orderTransform.fromAPI.order` `roomInfo` block | Already exposes every BE-2 §4.1 field; no API contract change needed. |
| `orderTransform.fromAPI.order` `amount` field | Pre-existing semantics; if backend mis-writes `order_amount`, that is the backend's defect (not the transform's). |
| `reportTransform.singleOrderNew` | Not on this path — the Room Orders Report uses `orderTransform.fromAPI.order` via `getSingleOrderRoom`. |
| `/get-room-list`, `/order-logs-report` initial-fetch path | Defect is in the lazy detail call, not the list call. |
| `transferToRoom` / `/order-shifted-room` (Room normal flow) | Unrelated. |
| `socketHandlers.js`, `OrderContext` (BUG-042-C) | Unrelated. |
| `orderTransform.collectBillExisting` (BUG-042-B) | Unrelated; not invoked from the room-payment path under inspection. |
| `CollectPaymentPanel.jsx` rail (BUG-042-A) | Unrelated. |
| Backend `/order-logs-report` schema | Not in defect path. |
| Export (CSV / PDF) | P2 follow-up; out of BUG-048 scope. |

---

## 14. Risk Assessment

### Of doing nothing (defect persists)
| Dimension | Severity |
|---|---|
| Operator confusion (Discount shows ₹6,666 against a real settled booking with no discount applied) | **HIGH** — finance reconciliation impacted; risk of accusing staff of unauthorized write-offs. |
| Report export inheriting the defect | **MEDIUM** — same fields go into CSV/PDF (not verified). |
| End-of-day cash reconciliation | **HIGH** — Total ₹16,665 contradicts the booking's actual ₹9,999 face value. |

### Of shipping Option B1 (Discount guard) without backend fix
| Risk | Level | Mitigation |
|---|---|---|
| Suppressing a legitimate operator-applied write-off (no discount displayed when one was real) | LOW | The guard only fires when `receiveBalance === 0 && balance === 0`. A real write-off path per BE-2 §4.1 invariant has either `discount_amount > 0` (explicit) OR `balance > 0` (residual). Both are passthroughs. |
| Heuristic becomes load-bearing and survives BE-2 §4.1 landing | LOW | The Bucket B1 branch is a 3-line conditional with a `// REMOVE WHEN BE-2 §4.1 SHIPS` marker; the BE-2 follow-up PR per `BE_2_LODGING_PAYMENT_BREAKDOWN.md` §6 will collapse it. |

### Of shipping Option B2 (Total guard) without backend fix
| Risk | Level | Mitigation |
|---|---|---|
| Mis-hiding a real food order where amount coincidentally equals `rent − advance` | **MEDIUM** | Recommend NOT shipping B2 without raw response sample confirming the synthetic-entry hypothesis. |

### Of relying solely on backend (Option A)
| Risk | Level | Mitigation |
|---|---|---|
| Backend timeline slips, defect persists on preprod | MEDIUM | File ticket today citing BE-2 §4.1; surface to owner for ops impact. |

---

## 15. Recommended Next Step

1. **Owner action:** File a backend ticket today citing this analysis, BE-2 §4.1 invariants, and the H1/H2/H3 hypothesis matrix. Required: backend captures a `/get-single-order-new` response for the abhsihek / r1 booking and confirms which field(s) are wrong.
2. **Implementation Planning agent (next step):** wait for either (a) backend response sample, or (b) owner go-ahead to ship Option C (hybrid — Bucket B1 only, narrow Discount guard) as an interim.
3. **BUG-043 housekeeping (when picked up):** mark BUG-043 as duplicate-of-BUG-048 in `BUG_TEMPLATE.md`. Not performed in this analysis (directive).
4. **Once BE-2 §4.1 ships:** apply the 10-line FE collapse per `BE_2_LODGING_PAYMENT_BREAKDOWN.md` §6 (replace heuristic with exact formula).

This analysis does NOT prescribe an implementation plan — that is the next agent's task.

---

## 16. Final Verdict

**Primary verdict: `needs_backend_response_sample`** ✅

**Secondary verdict: `frontend_fix_ready_for_planning`** ✅ — Bucket B1 (narrow Discount-guard) is small, low-risk, and can ship as an interim once owner approves; Bucket B2 (Total-guard) should NOT ship without first confirming H2 from the raw backend payload.

**Sibling decision: BUG-048 SUPERSEDES BUG-043** — BUG-043 should be marked duplicate-of-BUG-048 in the tracker. (Not performed in this analysis per directive.)

### Confirmation
- ❌ No code modified.
- ❌ No `/app/memory/final/` updates.
- ❌ No `BUG_TEMPLATE.md` updates.
- ❌ No backend changes.
- ✅ This impact-analysis doc created at `/app/memory/bugs/BUG_048_ROOM_REPORT_IMPACT_ANALYSIS.md`.

---

*End of BUG-048 Impact Analysis. Awaiting backend response sample + owner approval for interim FE patch.*
