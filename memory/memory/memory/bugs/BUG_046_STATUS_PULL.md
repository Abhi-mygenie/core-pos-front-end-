# BUG-046 — Status Pull Report

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bug | **BUG-046** — Editable delivery charge not reflected in order total |
| Task Type | Status pull (no implementation) |
| Pull Date / Time (UTC) | 2026-05-11 (post BUG-045 sign-off, post BUG-044 runtime investigation) |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` (HEAD `3944a0a`) |
| Code Changed In This Task | **NONE** |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |
| Other Bugs Touched | **NONE** (BUG-045 sealed; BUG-044 parked pending runtime repro) |

---

# Plain-English Owner Summary

### 1. What is BUG-046?
On a delivery order, the cashier can type a delivery charge into the small box on the cart screen. The number is accepted, but the **"Collect Bill" button at the bottom of the cart does not update its rupee amount** to reflect that change once the order has already been placed (kitchen tickets printed, items locked).

### 2. What is currently going wrong?
- **Before placing the order:** the button updates correctly. ✅
- **After placing the order:** the cashier types a new delivery charge, the box accepts it, but the **button label stays at the old total**. ❌
- The actual payment **does** go through with the corrected value (so the customer pays correctly), but the cashier sees the old number on the button — which is confusing and looks like a money mismatch.
- Inside the next screen (Collect Bill panel), the total **does** show the new value correctly. ✅
- For scan / online / prepaid orders where the delivery charge came pre-set from the customer side, the field is intentionally locked — that is not a bug.

### 3. Why is it happening, based on code?
There is a small mathematical shortcut in the cart screen's total formula. Before the order is placed, the formula uses the cashier's live-typed delivery charge. After the order is placed, the formula switches to using the backend-saved total (which was calculated with the original delivery charge) and **forgets to add back the cashier's later edit**. So the button label is permanently stuck at the original delivery charge until the order is paid.

### 4. Is analysis already done?
**Yes — fully done.** The analysis is at `POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` lines 1120–1229. Hypothesis confidence is **high**.

### 5. Is implementation planning already done?
**Yes — fully done.** The plan is at `POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` lines 518–569.

> **Planning is complete. This gate is only refreshing current code evidence before implementation.**

### 6. What exact small fix is planned?
Two short, related edits inside one file — both about handing the cashier-edited delivery charge to the right place at the right time:

- **Edit A (cart screen total):** Add **one small calculation** to the cart screen's total formula. Take the difference between what the cashier just typed and what the backend originally saved, and add that difference to the displayed total. So:
  - If the cashier didn't change anything → difference is zero → nothing moves. ✅
  - If the cashier increased it by ₹20 → button moves up by ₹20. ✅
  - If the cashier decreased it by ₹10 → button moves down by ₹10. ✅
- **Edit B (Collect Payment panel initial value):** Adjust the one line that decides what number to seed into the Collect Payment screen when it opens. Today it always prefers the backend's saved value; the small change makes it prefer the cashier's live edit when the cashier has actually edited it.

The backend's saved total stays the trusted source for **everything else** (items, tax, service charge, GST, discount, tip, round-off). Only the delivery-charge slice gets the cashier's live correction added on top.

**No backend call is added.** Both edits are purely display / handoff corrections.

### 7. Which file will likely change?
**One file only:** `frontend/src/components/order-entry/OrderEntry.jsx`. Estimated total **~5–8 lines added** across two adjacent edits (the placed-branch total formula at L696–698 and the `initialDeliveryCharge` prop wiring at L1221). No lines removed.

### 8. Which files/modules will NOT be touched?
- The Collect Bill payment screen's own delivery-charge field — left exactly as it is. (Its lock for scan/prepaid orders stays in effect — that's intentional from a prior bug.)
- The payment payload sent to backend — already carries the correct value today.
- The order-placement and order-update APIs — unchanged.
- The GST recalculation on delivery — already tracks the cashier's edits correctly.
- The walk-in, dine-in, takeaway, and room-billing flows — completely untouched. The fix only activates on delivery orders.
- The pre-place behavior — unchanged (works correctly today).

### 9. What is the risk level?
**Low.** Reasoning:
- Single file, ~3–5 lines.
- Math is self-cancelling when the cashier doesn't edit anything → no visual jitter on existing flows.
- No new backend calls, no socket changes, no payload shape changes.
- All neighboring rules (prepaid lock, GST tracking, payment payload) keep working unchanged because the fix doesn't touch them.

### 10. What decision, if any, is needed from the owner before implementation?
**One small choice** (was already answered by the plan, but worth re-confirming):

> When the cashier edits the delivery charge **after the order is placed**, should the system:
> - **Option A (planned default):** Just update the cart screen's button label. The new value is sent to the backend only when the cashier clicks "Collect Bill" and pays. _(Lower risk, simpler, what the plan recommends.)_
> - **Option B:** Immediately fire an update-order call to the backend on every keystroke, so the backend's saved total also updates live.

The plan goes with **Option A**. Please confirm Option A is acceptable, or flag if you want Option B.

### 11. What is the recommended next step?
1. Confirm Option A above (or override).
2. Trigger the **BUG-046 pre-implementation code gate** agent — small, ~one-page document that locks in the exact formula, the exact file & line numbers as of today's code, and the list of files that must remain untouched. Mirrors what we did for BUG-045.
3. Then trigger the **BUG-046 implementation agent** to apply the ~3–5 line change.
4. Then QA verifies the cart button updates live on a placed delivery order.

Estimated total time from gate to QA-ready: minimal (single file, single localized change).

---

# Owner Checklist Before Implementation

| Check | Status | Notes |
| --- | --- | --- |
| Intake done | **Yes** | `/app/memory/BUG_TEMPLATE.md` L3781–3845. |
| Impact analysis done | **Yes** | `POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` L1120–1229. High-confidence hypothesis. |
| Implementation plan done | **Yes** | `POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` L518–569. |
| Current code checked | **Yes** | Verified today against HEAD `3944a0a`. Target lines (`OrderEntry.jsx` L695–698 ternary + L165 state + L1221 prop) all intact; no drift from plan. Two cosmetic annotation refreshes noted (line-range shift L687→L695; `readOnly`-predicate label updated from BUG-019 → CR-008 D1-Gate). |
| Exact file to change identified | **Yes** | `frontend/src/components/order-entry/OrderEntry.jsx` only. **Two surgical edits**: (a) placed-branch total ternary L696–698, (b) `initialDeliveryCharge` prop wiring L1221. Estimated total ~5–8 lines added. **No other file changes.** |
| Risk reviewed | **Yes** | **Low.** Single file, math self-cancelling on no-edit, no backend/socket/payload changes, BUG-019 lock preserved, CR-008 D1-Cap preserved, CR-013 D-GST-2 preserved, non-delivery flows gated out, **CollectPaymentPanel.jsx untouched**. |
| Owner decision needed | **Yes — minor** | Re-confirm **Option A** (local-only display correction, no auto-PATCH on every keystroke) is acceptable. The plan defaults to Option A. |
| Ready for implementation agent | **Yes — after pre-impl code gate** | Verdict: `ready_for_pre_implementation_gate`. Path is: Owner confirms Option A → Pre-Impl Code Gate doc → Implementation Agent → QA. |

---

# Screenshot Evidence & Broadened Fix Scope

## Owner-Captured Symptom (2026-05-12)

Owner shared two screenshots from the live preprod build showing a placed delivery order with backend-stored delivery charge = ₹10. Cashier edits the delivery-charge field on the cart screen to ₹30. Both downstream surfaces fail to reflect the edit.

### Numeric proof from screenshots

| Surface | Field | Value Shown | Expected | Defect |
| --- | --- | --- | --- | --- |
| Cart screen (placed order) | Delivery Charge input | **30** ✅ | 30 | Input accepts edit |
| Cart screen | **Collect Bill button** | **₹115** ❌ | ~₹135 | Uses old ₹10 + GST, ignores typed ₹30 |
| Collect Payment panel (after clicking Collect Bill) | Delivery Charge input | **10** ❌ | 30 | Re-seeded from backend echo, not from cashier's live edit |
| Collect Payment panel | Delivery Charge line item | **₹10.00** ❌ | ₹30.00 | Same root cause as above |
| Collect Payment panel | **Pay button** | **₹117** ❌ | ~₹135 | Follows the wrong seeded value |

### Math reconciliation
- **₹115** (cart) = ₹100 item + ₹10 old-delivery + ₹5 GST on old-delivery (uses `orderFinancials.amount` echo)
- **₹117** (panel) = ₹100 item + ₹10 old-delivery + ₹7 GST (slightly different rounding/SC composition inside the panel computation)
- **Neither matches the cashier's typed ₹30.** Both should be ~₹135 (₹100 + ₹30 + ₹5–7 GST on ₹30) once fixed.

## Scope Refinement (vs Bucket-1 plan as originally written)

The owner-shared screenshots prove the bug surface is **slightly broader** than the original Bucket-1 plan acknowledged. The original plan said _"the bug is only on the Cart-Panel side (Collect Bill button label)"_ — that is **partially incorrect**. The Collect Payment panel **also** opens pre-seeded with the stale backend value, not the cashier's live edit.

### Why (one-line code reason)
`OrderEntry.jsx` L1221 currently reads:
```
initialDeliveryCharge={orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0)}
```
When `orderFinancials.deliveryCharge` is truthy (e.g., `10`), JavaScript short-circuits and ignores the cashier's live `deliveryCharge` state (e.g., `30`). The Bucket-1 plan implicitly assumed the panel would pick up the live value; the code does the opposite.

### Updated fix scope (still single file, OrderEntry.jsx only)

| Edit | File | Line(s) | Change |
| --- | --- | --- | --- |
| **A** | `frontend/src/components/order-entry/OrderEntry.jsx` | L696–698 (placed-branch total ternary) | Add `placedDeliveryDelta` to placed-branch sum (per Bucket-1 plan). Fixes Cart-Panel Collect Bill button. |
| **B** | `frontend/src/components/order-entry/OrderEntry.jsx` | L1221 (`initialDeliveryCharge` prop) | Switch precedence so the cashier's live `deliveryCharge` wins when it has been edited away from `orderFinancials.deliveryCharge`. Fixes Collect Payment panel initial seeding. **NEW vs original plan.** |

**Estimated total diff: ~5–8 lines added across two adjacent edits inside the same file.** `CollectPaymentPanel.jsx`, `CartPanel.jsx`, payment service, transforms, payload builders — all untouched.

### One implementation note for edit B (to be locked in pre-impl gate)
There are two reasonable precedence formulas; the pre-impl code gate must lock one in writing before implementation:

- **Option B-1 (live-wins):** `initialDeliveryCharge={Number(deliveryCharge) || orderFinancials.deliveryCharge || 0}` — simpler, but flips the source-of-truth precedence permanently.
- **Option B-2 (live-wins-only-when-edited):** track an "is-edited" flag inside OrderEntry, and prefer `deliveryCharge` only when `Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge)`. Preserves backend-echo precedence on re-engage / first open, switches to live on cashier edit. **Recommended.**

Both options stay inside OrderEntry.jsx and do not touch CollectPaymentPanel.jsx.

---

# Business Logic Safety Rules (Strict, Locked)

## Scope Lock

> **BUG-046 is and remains a delivery-charge handoff / display correction inside `OrderEntry.jsx` only.**
>
> Its sole purpose is to ensure the cashier-edited `deliveryCharge` value flows consistently into:
> 1. **The Collect Bill button label / placed-branch `total`** (Edit A — L696–698).
> 2. **The `initialDeliveryCharge` prop passed into Collect Payment panel** (Edit B — L1221).
>
> **No other formula, behavior, payload, or business rule is permitted to change.**

## What MUST NOT Change (hard locks)

The following are **strictly off-limits** for the BUG-046 fix. If any implementation step requires changing any of these, the fix is out of scope — stop and escalate.

| # | Locked surface | Reason |
| --- | --- | --- |
| 1 | **Item subtotal calculation** (`localSubtotal`, `unplacedSubtotal`, `rawLocalTotal`, `rawUnplacedTotal`) | Item math is independent of delivery charge. |
| 2 | **GST / tax calculation** (`localTax`, `unplacedTax`, item-level GST, restaurant GST percentages) | Tax math owned elsewhere (CR-008, CR-013, BUG-019). Cannot be altered by a delivery-display fix. |
| 3 | **Service charge calculation** (`serviceChargePercentage`, SC line items, restaurant-level SC config) | Owned by separate billing rules. Out of scope. |
| 4 | **Tip calculation** (`tipAmount` field, CollectPaymentPanel tip input) | Separate input surface. Out of scope. |
| 5 | **Discount calculation** (discount adjustments, `discountAmount`, `discountReason`) | Separate adjustment block. Out of scope. |
| 6 | **Coupon calculation** (`couponCode`, coupon redemption math, loyalty `walletAmount`) | Owned by separate billing/loyalty rules. Out of scope. |
| 7 | **Round-off logic** (`applyRoundOff`, `rawFinalTotal` rounding) | Anchored to restaurant config. Out of scope. |
| 8 | **Paid / prepaid logic** (`isPrepaid` predicate, prepaid Settle flow, paid-order lifecycle) | Owned by CR-008 D1-Gate / BUG-PREPAID-SETTLE. Out of scope. |
| 9 | **CollectPaymentPanel business formulas** (`rawFinalTotal`, `finalTotal`, `deliveryCharge` recompute @ L358, GST-on-delivery @ CR-013 D-GST-2) | The whole `CollectPaymentPanel.jsx` file is **untouched** by BUG-046. |
| 10 | **Payment / settlement API payload structure** (`BILL_PAYMENT`, `collectBillExisting` payload, `delivery_charge` field shape, `cancelOrder` payload) | Payload shape is owned by `orderTransform.toAPI.*`. BUG-046 does not modify any payload builder. |
| 11 | **Backend write / update behavior** (`placeOrder`, `updateOrder`, `BILL_PAYMENT`, `paid-prepaid-order`, `MERGE_ORDER`, `TRANSFER_FOOD`) | No new HTTP calls, no extra round-trip, no payload mutation. |
| 12 | **Auto-PATCH behavior** (no inline-edit triggers `updateOrder` API call) | This is the explicit Option A decision. BUG-046 is purely render-time. If owner ever flips to Option B (auto-PATCH), it becomes a separate task. |
| 13 | **`orderFinancials.amount` as source-of-truth for items / tax / service charge / GST** | Backend echo remains authoritative for all non-delivery-charge components. BUG-046 only adds a **delta** for the delivery slice; the echo is never overwritten or recomputed. |
| 14 | **`data-testid` attributes** on any element touched or neighboring (`cart-delivery-charge-input`, `delivery-charge-section`, Collect Bill button, Pay button) | Test identifiers preserved 1:1. |

## What MAY Change (only these)

| # | Permitted surface | Permitted change |
| --- | --- | --- |
| 1 | `OrderEntry.jsx` L696–698 (placed-branch `total` ternary) | Add `placedDeliveryDelta = (Number(deliveryCharge) \|\| 0) - (Number(orderFinancials.deliveryCharge) \|\| 0)`, gated on `orderType === 'delivery'`; include it in placed-branch sum. |
| 2 | `OrderEntry.jsx` L1221 (`initialDeliveryCharge` prop wiring) | Switch precedence so live `deliveryCharge` wins when it differs from `orderFinancials.deliveryCharge`. Formula locked at pre-impl gate (Option B-1 vs B-2). |
| 3 | Local helper consts inside the same `OrderEntry.jsx` render scope (if pre-impl gate decides to introduce them) | Permitted only if they exist solely to compute the two values above. No new exports, no new context, no new state setters outside the existing `deliveryCharge` state. |

---

# Regression Validation Required

The BUG-046 implementation must be validated against the following before being accepted by QA. Each item produces a binary pass/fail — partial passes count as fail.

## A. Numeric before/after example (mandatory)

**Scenario:** Placed delivery order. Item ₹100. Backend stored `delivery_charge = 10` at place-time. Restaurant has `delivery_charge_gst_pct = 50%` (matches the screenshots' observed ratio of ₹5 GST on ₹10 delivery → 50% effective for illustration; substitute the actual restaurant value).

| Stage | Before fix | After fix |
| --- | --- | --- |
| Cashier opens placed order | Cart screen Delivery Charge field shows `10`, Collect Bill button shows ₹115 | Same on first open (₹115 — no edit yet, delta = 0) |
| Cashier edits Delivery Charge from `10` to `30` | Field accepts `30`, **Collect Bill button still ₹115** ❌ | Field accepts `30`, **Collect Bill button shows ₹140** ✅ (₹100 + ₹30 + ₹10 GST on ₹30) |
| Cashier clicks Collect Bill → panel opens | Panel Delivery Charge field shows **`10`** ❌, Pay button ₹117 | Panel Delivery Charge field shows **`30`** ✅, Pay button ~₹140 (matches Cart button within rounding) |
| Cashier confirms payment | `BILL_PAYMENT` payload `delivery_charge` = 10 ❌ | `BILL_PAYMENT` payload `delivery_charge` = 30 ✅ |

**The UI total must adjust only by +₹20 plus the applicable delivery-GST effect on that +₹20 delta.** No other line item moves.

> Note: the +₹20 delta itself is from the cashier's intent (30 − 10 = 20). The GST recomputation on the new ₹30 is handled by CR-013 D-GST-2 inside CollectPaymentPanel (which is **not** modified by BUG-046); the BUG-046 fix simply ensures CollectPaymentPanel opens with the right input value so its existing GST-on-delivery math runs on ₹30 instead of ₹10.

## B. Non-delivery parts must remain identical (mandatory)

For the same placed order (or any other), the following must be **bit-identical** before and after the fix:

- [ ] `localSubtotal`, `unplacedSubtotal` — unchanged.
- [ ] `localTax`, `unplacedTax` — unchanged.
- [ ] `rawLocalTotal`, `rawUnplacedTotal`, `applyRoundOff(...)` outputs — unchanged.
- [ ] Item total in BILL SUMMARY (₹100 in the screenshot) — unchanged.
- [ ] Service Charge line (if present) — unchanged.
- [ ] Tip — unchanged.
- [ ] Discount / Coupon / Loyalty — unchanged.
- [ ] Round-off behavior — unchanged.

## C. POS / manual order behavior must not be changed (mandatory)

- [ ] Walk-in flow — `placedDeliveryDelta = 0` (gated by `orderType === 'delivery'`); Collect Bill button label and Collect Payment panel both unchanged from current behavior.
- [ ] Dine-in flow — same, no delta applied; no panel re-seeding change visible.
- [ ] Take-away flow — same.
- [ ] Room flow (`isRoom = true`) — same; Checkout button label unchanged.
- [ ] Pre-place flow (any order type) — `total = applyRoundOff(rawLocalTotal) + deliveryAddOn` path runs unchanged; cashier edits already work today and must continue to work after the fix.

## D. Web delivery-lock behavior must not be changed (mandatory)

- [ ] Web / Scan-and-Order delivery with backend-supplied `delivery_charge > 0` — CollectPaymentPanel input remains `readOnly` per the existing `isWebOrder && initialDeliveryCharge > 0` predicate (L938). The fix to L1221 must NOT defeat this lock: even if the cashier somehow types into the Cart-Panel field (which today is editable for web orders too, by current CartPanel rules), the resulting seeded value flowing into Collect Payment must still be locked **read-only** by the existing predicate. This is enforced by CollectPaymentPanel itself, which BUG-046 does not modify.
- [ ] Web order with `delivery_charge = 0` — CollectPaymentPanel input remains editable per current rules; no regression.

## E. Prepaid readOnly behavior must not be changed (mandatory)

- [ ] Prepaid orders (`isPrepaid = true`, per CR-008 D1-Gate) — CollectPaymentPanel Delivery Charge input remains `readOnly`. Fix does not alter this.
- [ ] Re-engage of a prepaid order — `orderFinancials.deliveryCharge` from socket re-seeds correctly; lock stays in effect.

## F. CollectPaymentPanel.jsx must not be modified (mandatory)

- [ ] `git diff --name-only` on the implementation PR must NOT include `CollectPaymentPanel.jsx`.
- [ ] Lazy-init at L162–166 — unchanged.
- [ ] `readOnly` predicate at L938 — unchanged.
- [ ] `rawFinalTotal` math at L424 — unchanged.
- [ ] CR-013 D-GST-2 delivery-GST recomputation — unchanged.
- [ ] No new props added to CollectPaymentPanel.

## G. Payment / settlement API payload must remain the same shape (mandatory)

- [ ] `BILL_PAYMENT` payload built by `orderTransform.toAPI.collectBillExisting` — same shape, same fields, same types.
- [ ] The `delivery_charge` field already carries the cashier's live `deliveryCharge` value today (per Impact Analysis L1170–1174). The fix does **not** change the payload-build code path; it only ensures the right value reaches the right surface visually.
- [ ] No new endpoint calls. No `updateOrder` auto-fire. No new socket emissions.
- [ ] `cancelOrder` payload, `placeOrder` payload, `printOrder` payload — all unchanged.

## H. Regression checklist (executable by QA)

- [ ] **Fresh in-POS delivery order** with delivery charge ₹50 (place-time) → cart edits to ₹100 → Collect Bill button updates to reflect +₹50 delta + GST on delta.
- [ ] **Same order** → open Collect Payment panel → delivery-charge input pre-filled with `100`, not `50`.
- [ ] **Same order** → pay → BILL_PAYMENT payload carries `delivery_charge: 100`.
- [ ] **Walk-in / dine-in / take-away / room** orders — `total` unchanged at every step.
- [ ] **Pre-place fresh delivery** (no place yet) — Collect Bill button reflects live edits exactly as today.
- [ ] **Scan / web delivery** with backend-seeded ₹50 charge — CollectPaymentPanel input remains `readOnly`; lock not bypassed.
- [ ] **Prepaid order** — CollectPaymentPanel input remains `readOnly`.
- [ ] **Negative edit** (typing `0` over `10`) — Cart button drops by ₹10; panel opens at `0`; no clamp to non-negative.
- [ ] **No console errors** during any flow.
- [ ] **No file outside `OrderEntry.jsx` modified** (`git diff --name-only` shows exactly one file).

---

## 1. Docs Read (in mandatory order)

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md` — approval gate, conflict register.
- `ARCHITECTURE_DECISIONS_FINAL.md` — CR-008 D1-Cap (delivery-charge capture), CR-013 D-GST-2 (delivery GST encoding).
- `MODULE_DECISIONS_FINAL.md` — Billing / Collect Bill / OrderEntry boundaries.
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md` — hotspot register (`OrderEntry.jsx`, `CollectPaymentPanel.jsx`).
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — checked; **no overlap with BUG-046**.

### Accepted Overlay Docs (`/app/memory/change_requests/`)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### Bug-Specific Docs
- `/app/memory/BUG_TEMPLATE.md` — BUG-046 intake @ L3781–3845.
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` — BUG-046 analysis @ L1120–1229.
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` — BUG-046 plan @ L518–569, QA checklist @ L663–668, recommended order @ L674, verdict @ L688.
- `/app/memory/bugs/BUG_045_IMPLEMENTATION_SUMMARY.md` — confirms BUG-046 surfaces **NOT touched** during BUG-045 implementation ("Other Bugs Touched (BUG-037 / 044 / 046): NO").
- `/app/memory/bugs/BUG_045_SMOKE_SIGNOFF.md` — explicitly defers BUG-046 ("Approved plans exist in `POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md`, not yet implemented. Trigger separately if/when owner approves them.").
- `/app/memory/bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` — confirms BUG-046 cross-impact still nil.

### Code Re-inspected (for plan-fidelity — no edits)
- `frontend/src/components/order-entry/OrderEntry.jsx` — `total` derivation @ L695–698, `deliveryAddOn` @ L695, `deliveryCharge` state @ L165, `CollectPaymentPanel` wiring @ L1173–1221.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — `deliveryChargeInput` lazy-init @ L162–166, `deliveryCharge` recompute @ L358, `rawFinalTotal` @ L424, **updated** readOnly predicate @ L938.
- `frontend/src/components/order-entry/CartPanel.jsx` — inline delivery input @ L711–739, `onDeliveryChargeChange` callback @ L281+L735, Collect Bill button @ L839–859.

---

## 2. Baseline Conflict Check

**No baseline conflict.**

| Check | Result |
| --- | --- |
| Overlaps any `NEEDS_OWNER_DECISION` in `OPEN_QUESTIONS_FINAL_RESOLUTION.md`? | **No.** OD-01 (reporting) and OD-02 (room billing/print) checked; no overlap with delivery-charge total derivation. |
| Conflicts with any approved CR? | **No, but explicitly intersects three CRs surgically:** CR-008 D1-Cap (delivery-charge capture & persistence into `placeOrder` / `updateOrder` payload — unchanged by plan), CR-013 D-GST-2 (delivery GST tracks live delivery charge — already keyed off the same `deliveryCharge` state, so it stays in sync), and BUG-019/CR-008 D1-Gate (CollectPaymentPanel `readOnly` lock for prepaid + web-with-charge — unchanged). The plan is purely additive: a delta-add inside the OrderEntry placed-branch `total` ternary. |
| Touches deferred OQ-12 (room billing / print)? | **No.** Fix is gated on `orderType === 'delivery'` — non-delivery flows (room / dine-in / walk-in / takeAway) get `placedDeliveryDelta = 0` and total is unchanged. |
| Code vs plan drift? | **Minor cosmetic only.** See §5 below — plan line ranges still accurate, semantics unchanged. |

---

## 3. BUG-046 — Plain-English Summary

**User-facing problem:** On a delivery order with an editable delivery-charge field, the cashier types a new value in the Cart-Panel inline input. The number is accepted in the input, but:
- **Before the order is placed:** the Collect Bill button label updates correctly (works).
- **After the order is placed** (typing edits the value post-place): the Collect Bill button label **does not move** — it keeps showing the old total. The actual underlying calculation does carry the new value through to the BILL_PAYMENT payload (so payment is correct), but the **visible button label lags**, causing cashier confusion and apparent under/over-billing on screen.
- Inside the **Collect Bill panel itself** (CollectPaymentPanel): the grand-total recomputes live (works).
- For **scan / prepaid / web orders with a backend-seeded delivery charge**: the CollectPaymentPanel input is intentionally read-only (BUG-019 / CR-008 D1-Gate) — this is by design, not a bug.

**Suspected root cause (high-confidence hypothesis from Impact Analysis):**
In `OrderEntry.jsx`, the `total` derivation ternary at L696–698 has two branches:
- **Pre-place branch (L698):** `applyRoundOff(rawLocalTotal) + deliveryAddOn` — includes the live `deliveryCharge`. Works.
- **Placed branch (L697):** `(orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)` — uses the backend-echoed `orderFinancials.amount` only; **does NOT re-add `deliveryAddOn`**.

So once the order is placed, the visible total is anchored to the backend-echoed amount that was computed with the original delivery charge. Subsequent inline edits to `deliveryCharge` state don't move the visible total because no `updateOrder` is auto-fired and the placed-branch math drops `deliveryAddOn` entirely.

**Planned fix (FE-only, surgical):**
In the placed-branch of the ternary, **re-add the delta** between the live `deliveryCharge` and the backend-echoed `orderFinancials.deliveryCharge`. This keeps `orderFinancials.amount` authoritative for items/tax/SC/GST while letting delivery-charge edits move the visible total 1-for-1. When there's no edit, the delta is zero → no visual jitter. Gated on `orderType === 'delivery'` so non-delivery flows are untouched.

---

## 4. Current Implementation Status

| Stage | Status |
| --- | --- |
| Intake recorded in `BUG_TEMPLATE.md` | ✅ Done (L3781–3845) |
| Impact Analysis | ✅ Done (`POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` L1120–1229) |
| Module Mapping | ✅ Done — Billing / Order Entry / Collect Bill (primary); CR-008 D1-Cap + CR-013 D-GST-2 + BUG-019/D1-Gate (cross-impact, all preserved). |
| Implementation Plan | ✅ Done — Bucket-1 plan §"BUG-046" (L518–569) |
| Owner Approval | ✅ **Bucket-1 plan was approved at the bucket level** alongside BUG-044 + BUG-045. The BUG-045 Implementation Summary (header field "Owner Approval: Granted (all four buckets A + B + C + D approved by owner)") refers to BUG-045's internal sub-buckets, but the Bucket-1 plan itself sits behind a single bucket-level approval gate. **No explicit BUG-046-specific re-confirmation has happened post BUG-045 closure** — same status as BUG-044 had before this week's runtime investigation. |
| Pre-Implementation Code Gate | ❌ **Not created.** BUG-045 had one (`POS_FINAL_1_0_BUG_045_PRE_IMPL_CODE_GATE.md`); BUG-046 does not. |
| Implementation | ❌ **Not started.** |
| QA | ❌ N/A |
| Smoke / Sign-off | ❌ N/A |

**Net status: `planned, owner-approved at bucket level, awaiting implementation`.** Lower risk than BUG-044 (which is now parked); higher readiness than BUG-044 because the failing path is fully proven in code.

---

## 5. Code Surfaces Likely Affected (and code-truth verification @ HEAD `3944a0a`)

| File | Function / Region | Planned Change | Code Truth (verified 2026-05-11) |
| --- | --- | --- | --- |
| `frontend/src/components/order-entry/OrderEntry.jsx` | `total` ternary @ plan-cited L687–698 → **actually L695–698 in current code** | In placed branch, add `placedDeliveryDelta = (Number(deliveryCharge) \|\| 0) - (Number(orderFinancials.deliveryCharge) \|\| 0)` (gated on `orderType === 'delivery'`); include it in placed-branch sum. | ✅ Code matches plan. Verified live lines: <br>`695|  const deliveryAddOn = orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0;` <br>`696|  const total = hasPlacedItems` <br>`697|    ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)` <br>`698|    : applyRoundOff(rawLocalTotal) + deliveryAddOn;` <br>**Minor cosmetic drift:** plan cites "L687–698"; the literal `const total =` lines are now L696–698. Lines 680–694 have additional comment blocks (CR-008 / BUG-019 / D1-Gate annotations) but no logic change. **No semantic drift.** Plan can be applied verbatim. |
| `frontend/src/components/order-entry/OrderEntry.jsx` | `deliveryCharge` state @ plan-cited L165 | Read-only reference — no change planned. | ✅ Still at L165 exactly: `const [deliveryCharge, setDeliveryCharge] = useState(orderData?.deliveryCharge || 0);` |
| `frontend/src/components/order-entry/OrderEntry.jsx` | `CollectPaymentPanel` prop `initialDeliveryCharge` @ plan-cited L1221 | Read-only reference — no change planned. | ✅ Still at L1221 exactly: `initialDeliveryCharge={orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0)}` <br>(Plan's quoted snippet wrote `orderFinancials.deliveryCharge || Number(deliveryCharge) || 0` without inner parens; actual code parenthesizes the fallback. **Same semantics**, JS evaluates left-to-right anyway.) |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `readOnly` predicate @ plan-cited L938 | Read-only reference — must NOT regress. | ✅ Still at L938: `readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}` <br>**Annotation drift:** comments at L23–44 reveal the predicate was rewritten by **CR-008 / Bucket D1-Gate (May-2026)** — BUG-019's old `initialDeliveryCharge > 0` rule was replaced by `isPrepaid` (combined with the POS2-002 Phase 2 web-order lock). The plan's "What Not To Touch" note at L564 says _"CollectPaymentPanel `readOnly` predicate (BUG-019 + POS2-002 Phase 2 web-order lock) — preserved"_. **Recommendation:** the implementation agent should re-confirm the predicate is **(BUG-019 → CR-008 D1-Gate) + POS2-002 Phase 2** post-update, then preserve it. No functional change to the BUG-046 fix; just a labeling refresh. |
| `frontend/src/components/order-entry/CartPanel.jsx` | inline `cart-delivery-charge-input` + `Collect Bill` button label | Read-only reference — no change planned. | ✅ Input @ L711–740 with `data-testid="cart-delivery-charge-input"`; `onDeliveryChargeChange` callback @ L281/L735; Collect Bill button @ L839–859. Button label reads from OrderEntry's `total` prop (`isRoom ? 'Checkout' : 'Collect Bill'`). All as plan describes. |

**Diff size estimate:** ~3–5 lines added to `OrderEntry.jsx` (one new local `const placedDeliveryDelta` + addition in the ternary's placed branch). **Single file.** Smallest blast radius in Bucket 1.

---

## 6. Relationship to BUG-044 and BUG-045

### vs BUG-045 (closed)
- **No file overlap.** BUG-045 touched `ScanOrderPopOut.jsx` + `DashboardPage.jsx` only. BUG-046 touches `OrderEntry.jsx` only.
- BUG-045 Implementation Summary §2 confirms zero changes to any BUG-046 surface (forbidden-file grep returned empty; explicit "Other Bugs Touched (BUG-037 / 044 / 046): NO" in the header).
- **BUG-045 did NOT change anything that affects BUG-046's plan.** Line ranges and semantics in `OrderEntry.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx` are all intact.
- One conceptual overlap (Bucket-1 plan §9 L583): both bugs can be reproduced on the same end-to-end flow (scan delivery order → popup → Accept → placed → edit delivery charge). They do not collide because they live in different components.

### vs BUG-044 (parked)
- **No file overlap.** BUG-044's (now-parked) plan targeted `socketHandlers.js` + `OrderContext.jsx`. BUG-046 targets `OrderEntry.jsx`.
- **No cross-impact.** BUG-044's runtime-reproduction parking does NOT block BUG-046.
- BUG-046 can be shipped independently and in any order relative to BUG-044's eventual resolution.

### Net answer to "Did BUG-045 closure or BUG-044 parking change anything for BUG-046?"
**No.** BUG-046's plan is unchanged, its surfaces are pristine, its hypothesis is intact, and no owner clarification arose that affects BUG-046.

---

## 7. Open Blockers

| Blocker | Status |
| --- | --- |
| Owner clarification required? | **Possibly minor.** Impact Analysis §"Open Questions / Missing Information" (L1212–1214) flags one design choice: _"Whether owner expects the inline Cart Panel edit to auto-PATCH backend (`updateOrder`), or only to update the local UI total until Collect Bill is clicked."_ The Bucket-1 plan chose the **second** option (local-only re-add, no extra backend call) — which is the lower-risk path. **If the owner explicitly wants auto-PATCH on every inline edit, the plan needs revising.** Otherwise no blocker. |
| Backend confirmation required? | **No.** Fix is purely render-time correction. Backend payload via `BILL_PAYMENT` already carries the live edited value (per `orderTransform.toAPI.collectBillExisting`); the bug is only in the visible button label. |
| Open OQ / OD overlap? | **No.** OD-01 / OD-02 / OQ-12 checked. |
| Code conflict / merge risk? | **No.** All target lines unchanged since plan was written. No drift in `OrderEntry.jsx` total ternary. |
| Plan-vs-code drift requiring re-plan? | **No — but two cosmetic annotation refreshes recommended in the pre-impl gate:** (a) line ranges updated from "L687–698" to "L695–698"; (b) the `readOnly` predicate label updated from "BUG-019 + POS2-002 Phase 2 web-order lock" to "CR-008 D1-Gate (`isPrepaid`) + POS2-002 Phase 2 web-order lock" (the BUG-019 → CR-008 D1-Gate rewrite already shipped). Neither affects fix scope. |

---

## 8. Recommended Implementation Buckets

BUG-046 was originally assigned to **Bucket C — Billing / Payment Flow** (Impact Analysis §10 L1395, alongside BUG-038 + BUG-042). The Bucket-1 implementation plan re-grouped it with BUG-044 + BUG-045 for sprint-level batching, and the Bucket-1 plan §12 (L672–678) explicitly recommends BUG-046 as the **first** bug to implement in the bucket — _"single-line localized change in `OrderEntry.jsx`, lowest regression surface, P0."_

**Recommendation for this pickup:** Implement BUG-046 as a **single, standalone PR**. It is the smallest, lowest-risk, highest-confidence fix remaining in Bucket 1, and is fully independent of the BUG-044 runtime investigation.

---

## 9. Recommended Validation Plan (mirrors Bucket-1 plan §10 BUG-046 Test Plan)

### Happy path
1. Place a fresh in-POS delivery order with delivery charge `50` → backend echoes `orderFinancials.deliveryCharge = 50` and `orderFinancials.amount` includes it.
2. Inline-edit delivery charge in Cart Panel from `50` → `100`.
3. Assert Collect Bill button label increases by **`+50`** (the delta), not unchanged and not `+100`.
4. Open Collect Bill panel → `deliveryChargeInput` seeded with `100` (from OrderEntry's live `deliveryCharge` state via `initialDeliveryCharge` fallback).
5. Grand-total inside the panel includes `100` (+ recomputed delivery GST per CR-013 D-GST-2).
6. Pay (UPI or cash) → outgoing `BILL_PAYMENT` payload carries `100` as `delivery_charge`.
7. **Pre-place behavior:** before placing, type `50` → Collect Bill button label increases by `+50` (unchanged from today; assert no regression).

### Regression
- **BUG-019 / CR-008 D1-Gate readOnly path:** scan-order delivery (`isPrepaid = true`) — CollectPaymentPanel input remains `readOnly`. (Cart Panel inline field stays editable per current rules; if owner wants that locked too, it's a separate enhancement per plan §10 step 10.)
- **CR-008 D1-Cap:** `placeOrder` / `updateOrder` payload still carries `delivery_charge` field. No change in payload shape.
- **CR-013 D-GST-2:** delivery GST tracks the live delivery charge in CollectPaymentPanel.
- **Non-delivery flows** (walk-in / dine-in / takeAway / room): `placedDeliveryDelta = 0`; total unchanged. The `orderType === 'delivery'` gate already used by `deliveryAddOn` carries over.
- **Negative edit:** typing `0` over a seeded `50` → button label drops by `50`. Plan §10 step 9 explicitly says **do NOT clamp `placedDeliveryDelta` to ≥ 0** — the delta is intended to be negative for downward edits.

### Acceptance gates (from Bucket-1 §11 L663–666)
- [ ] **BUG-046** — Cart-Panel Collect Bill button label reflects inline delivery-charge edits on placed delivery orders.
- [ ] **BUG-046 Panel parity** — Collect Bill panel grand-total matches button label.
- [ ] **BUG-046 BUG-019 not regressed** — Scan / prepaid / web-with-charge readOnly lock still in effect inside CollectPaymentPanel.
- [ ] **No console errors** during the flow.
- [ ] **data-testid** preserved (`cart-delivery-charge-input`, `delivery-charge-section`, Collect Bill button id).
- [ ] **No file outside `OrderEntry.jsx`** modified.

---

## 10. Final Verdict

### `ready_for_pre_implementation_gate`

**Reasoning:**
- The plan, hypothesis, and module mapping are sound and unaffected by BUG-045 closure or BUG-044 parking.
- The failing code path is **fully proven from code alone** — `OrderEntry.jsx` L696–698 placed branch demonstrably drops `deliveryAddOn`. No runtime reproduction needed (contrast with BUG-044, which needed runtime evidence because its failing path was backend-side).
- No owner clarification required (the one open question — local-only vs auto-PATCH — was resolved in the plan in favor of the lower-risk option; pre-impl gate can re-confirm with owner if desired).
- No backend confirmation required; no baseline conflict; no file overlap with sealed/parked work.
- Two cosmetic annotation refreshes (line ranges and `readOnly`-predicate label) should be locked in the gate doc before implementation begins.

**Alternative verdict considered:** `ready_for_implementation`. This would be defensible because the diff is single-file, ~3–5 lines, and the Bucket-1 plan is approved. But following the same pattern that worked for BUG-045 (pre-impl code gate before implementation agent), a thin gate doc is the safer next step and matches the team's recent cadence.

**Explicitly NOT** `needs_owner_clarification` — the lone open question has a documented default in the plan.
**Explicitly NOT** `needs_backend_confirmation` — fix is render-time only; backend payload already correct.

---

## 11. Recommended Next Action

**Trigger a Pre-Implementation Code Gate agent for BUG-046** with these deliverables:
1. Output file: `/app/memory/bugs/POS_FINAL_1_0_BUG_046_PRE_IMPL_CODE_GATE.md` (mirrors the BUG-045 gate format).
2. Lock the **placed-branch delta formula** (Edit A) as:
   ```
   const placedBaseDelivery = Number(orderFinancials.deliveryCharge) || 0;
   const placedDeliveryDelta = orderType === 'delivery'
     ? (Number(deliveryCharge) || 0) - placedBaseDelivery
     : 0;
   const total = hasPlacedItems
     ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0) + placedDeliveryDelta
     : applyRoundOff(rawLocalTotal) + deliveryAddOn;
   ```
   (Implementation can choose inline-vs-named-locals; the math is what's locked.)
3. Lock the **`initialDeliveryCharge` precedence** (Edit B) — pick one in writing:
   - **B-1 (live-wins always):** `initialDeliveryCharge={Number(deliveryCharge) || orderFinancials.deliveryCharge || 0}`
   - **B-2 (live-wins only when edited, recommended):** introduce a small `hasUserEditedDelivery` flag inside OrderEntry and prefer `deliveryCharge` only when `Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge)`. Preserves backend-echo precedence on re-engage / first open.
4. Confirm with owner whether **auto-PATCH on inline edit** is desired vs the local-only re-add (default in plan = local-only / Option A).
5. Refresh the two annotation drifts in the gate doc (line ranges, `readOnly`-predicate label).
6. **Lock the Business Logic Safety Rules + Regression Validation Required sections verbatim into the gate doc** (they originate here in this status pull but must be re-asserted in the gate so the implementation agent reads them as binding rules).
7. Freeze the precise line ranges as of HEAD `3944a0a`:
   - `OrderEntry.jsx` L695–698 (ternary — **Edit A target**)
   - `OrderEntry.jsx` L1221 (`initialDeliveryCharge` prop — **Edit B target**)
   - `OrderEntry.jsx` L165 (`deliveryCharge` state — read-only reference)
   - `CollectPaymentPanel.jsx` L938 (`readOnly` predicate — **must remain untouched**)
   - `CollectPaymentPanel.jsx` L162–166 (lazy-init — must remain untouched)
   - `CartPanel.jsx` L711–740, L839–859 (input + button — must remain untouched).

After the gate passes, hand off to the Bug Implementation Agent with the gate doc + this status pull as the input packet.

---

## End Of Report

- **No code was changed in this task.**
- **`/app/memory/final/` was not modified.**
- **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- This report lives at `/app/memory/bugs/BUG_046_STATUS_PULL.md`.
- BUG-045 sealed and untouched.
- BUG-044 parked and untouched (only referenced for non-overlap confirmation).
