# BUG-046 — Pre-Implementation Code Gate

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bug | **BUG-046** — Editable delivery charge not reflected in order total |
| Task Type | Pre-Implementation Code Gate (no implementation) |
| Gate Date / Time (UTC) | 2026-05-12 |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` (HEAD `9bfb1a6`) |
| Code Changed In This Task | **NONE** |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |
| Other Bugs Touched | **NONE** (BUG-045 sealed; BUG-044 parked) |
| Inputs | Bucket-1 plan §"BUG-046" + `BUG_046_STATUS_PULL.md` (incl. screenshot evidence, broadened scope, Business Logic Safety Rules, Regression Validation Required) |

---

## File-path correction (vs sprint task input)

The sprint task lists the allowed-source-file path as:

> `frontend/src/pages/OrderEntry.jsx`

This path **does not exist** in the current repo. The actual file is:

> `frontend/src/components/order-entry/OrderEntry.jsx`

Verified via `ls /app/frontend/src/pages/ | grep -i order` (returned `AllOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, `RoomOrdersReportPage.jsx` only) and `ls /app/frontend/src/components/order-entry/OrderEntry.jsx` (file exists). All Impact Analysis, Bucket-1 plan, and BUG-046 Status Pull docs also cite the components path. **The implementation agent must use the components path.** Recording here so the gate is unambiguous.

---

## 1. Docs Read (in mandatory order)

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md` — approval gate, conflict register, mandatory reading order.
- `ARCHITECTURE_DECISIONS_FINAL.md` — CR-008 D1-Cap (delivery-charge capture), CR-013 D-GST-2 (delivery GST encoding), hotspot register (`OrderEntry.jsx`, `CollectPaymentPanel.jsx`).
- `MODULE_DECISIONS_FINAL.md` — Billing / Collect Bill / OrderEntry module boundaries.
- `CHANGE_REQUEST_PLAYBOOK.md` — Steps 4–8 (code truth, API review, state impact, UI impact, regression).
- `IMPLEMENTATION_AGENT_RULES.md` — approval gate format, file-level change plan template, hotspot regression rules.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — OD-01 / OD-02 / OQ-12 checked; **no overlap with BUG-046**.

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
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` — BUG-046 plan @ L518–569, QA checklist @ L663–668.
- `/app/memory/bugs/BUG_046_STATUS_PULL.md` — **source of binding rules** (screenshot evidence, broadened scope, Business Logic Safety Rules, Regression Validation Required). Verbatim re-asserted in §11 of this gate.

### Code Re-inspected at HEAD `9bfb1a6` (no edits)
- `frontend/src/components/order-entry/OrderEntry.jsx` — L165 `deliveryCharge` state; L680–698 totals block (Edit A target); L1205–1221 CollectPaymentPanel prop wiring (Edit B target).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — L23–45 prop docs (D1-Gate + isWebOrder), L162–166 lazy-init, L358 `deliveryCharge` recompute, L424 `rawFinalTotal`, L938 `readOnly` predicate. **Must remain untouched.**
- `frontend/src/components/order-entry/CartPanel.jsx` — L281+L735 `onDeliveryChargeChange`, L711–740 inline input, L839–859 Collect Bill button. **Must remain untouched.**
- `frontend/src/api/transforms/orderTransform.js` — `toAPI.collectBillExisting` payload builder (delivery_charge field). **Must remain untouched.**

---

## 2. Baseline Conflict Check

**No baseline conflict.** All intersecting CRs/BUGs are explicitly preserved by the planned change:

| CR / BUG | Intent | BUG-046's relationship |
| --- | --- | --- |
| **CR-008 D1-Cap** | Delivery charge captured in `placeOrder` / `updateOrder` payloads | Preserved — no payload-builder change. Edit A is render-time only. |
| **CR-008 D1-Gate** | `CollectPaymentPanel.readOnly = isPrepaid \|\| (isWebOrder && initialDeliveryCharge > 0)` | Preserved — `CollectPaymentPanel.jsx` not modified. The predicate at L938 stays exactly as it is. Edit B only changes which **value** is seeded into `initialDeliveryCharge`; whether the field is readOnly is decided by the same predicate, on the same value (live or echo). |
| **CR-013 D-GST-2** | Delivery GST tracks live `deliveryCharge` inside CollectPaymentPanel | Preserved — Edit B feeds the panel the correct seed value, then CR-013's existing GST-on-delivery math (untouched) runs over it. |
| **CR-013 Phase 1.5 Fix-2** (already in code @ L1209–1220 comments) | Fall back to `deliveryCharge` only when `orderFinancials.deliveryCharge` is missing (pre-place fresh-delivery flow) | **Preserved by design choice B-2** (recommended) — live wins ONLY when the cashier has edited it; the existing pre-place fallback path remains intact. Choice B-1 ("live-wins-always") would change CR-013 Phase 1.5 Fix-2's semantics on re-engage and is therefore **not** recommended without owner ack. |
| **BUG-019** (Apr-2026 closed, replaced by D1-Gate) | scan / re-engage delivery readOnly lock | Preserved — same predicate, same outcome. |
| **POS2-002 Phase 2** | Web-order delivery lock | Preserved — `isWebOrder` branch of D1-Gate predicate untouched. |

**No `OPEN_QUESTIONS_FINAL_RESOLUTION.md` entry blocks BUG-046.** OQ-12 (room billing/print) is not touched because the fix is gated on `orderType === 'delivery'`.

---

## 3. Exact Current Code Lines / Formulas (HEAD `9bfb1a6`)

### Edit A Target — `OrderEntry.jsx` L687–698 (verified verbatim)

```jsx
687|  // CR-008 Sub-CR #1 Round-3 hotfix (May-2026): make `total` symmetric across
688|  // the placed/unplaced split so it ALWAYS includes the per-order delivery
689|  // charge for delivery orders. Round-2 (May-2026) folded delivery into
690|  // calcOrderTotals → backend-echoed `orderFinancials.amount`, so the placed
691|  // branch already has delivery baked in. Pre-place branch now mirrors that
692|  // by adding deliveryCharge to the local raw total. CartPanel.jsx:867 is
693|  // simultaneously stripped of its `+ deliveryCharge` so the button no longer
694|  // double-counts on the placed branch.
695|  const deliveryAddOn = orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0;
696|  const total = hasPlacedItems
697|    ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)
698|    : applyRoundOff(rawLocalTotal) + deliveryAddOn;
```

**Read this carefully:**
- **Pre-place branch (L698):** `applyRoundOff(rawLocalTotal) + deliveryAddOn` — includes live `deliveryCharge` via `deliveryAddOn`. ✅ Works today.
- **Placed branch (L697):** `(orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)` — **drops `deliveryAddOn`** entirely. The backend-echoed `orderFinancials.amount` was computed with the original (place-time) delivery charge; subsequent edits to `deliveryCharge` state do not move `total`. ❌ This is the bug surface for Edit A.

### Edit B Target — `OrderEntry.jsx` L1209–1221 (verified verbatim)

```jsx
1209|              // BUG-019 (Apr-2026): seed delivery-charge input from backend-echoed value
1210|              // (scan orders / re-engaged delivery orders). CollectPaymentPanel renders
1211|              // the field readOnly when this value > 0.
1212|              //
1213|              // CR-013 Phase 1.5 Fix-2 (May-2026, owner-approved 2026-05-05):
1214|              // Fall back to OrderEntry's local `deliveryCharge` state for the
1215|              // pre-place fresh-delivery flow. Without this fallback the cashier-
1216|              // typed delivery charge silently drops to ₹0 on the Collect Bill
1217|              // screen → delivery row hidden, Delivery GST hidden, Pay total
1218|              // off by (delivery + delivery GST). Backend-echoed value still
1219|              // wins when present, so BUG-019 prepaid scan / re-engage paths
1220|              // and D1-Gate `readOnly={isPrepaid}` remain untouched.
1221|              initialDeliveryCharge={orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0)}
```

**Read this carefully:**
- The expression `A || (B || 0)` short-circuits: if `orderFinancials.deliveryCharge` is truthy (e.g., `10`), `B` is never evaluated. The Collect Payment panel is therefore always seeded with the backend-echoed value when one exists, **even if the cashier has just edited it to a different value in the cart screen.**
- The CR-013 Phase 1.5 Fix-2 comment (L1213–1220) explicitly notes this precedence was chosen so that re-engage / scan paths keep backend-echo precedence. That intent is correct and must be preserved on **first open / re-engage**. The gap is: the comment did not anticipate the cashier editing the value **after** place-time.

### Supporting context (read-only — do not modify)

```jsx
// L165 — local state we will read
const [deliveryCharge, setDeliveryCharge] = useState(orderData?.deliveryCharge || 0);

// CollectPaymentPanel.jsx L938 — predicate that decides readOnly (untouched)
readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}
```

---

## 4. Current Wrong Behavior (plain English, with the screenshot numbers)

The cashier opens an already-placed delivery order. The backend had stored the delivery charge as **₹10** at place-time. The cart shows item ₹100. The Collect Bill button shows **₹115** (= 100 + 10 + ₹5 GST on the ₹10 delivery).

1. Cashier types **30** into the Delivery Charge field on the cart screen. The input accepts the number.
2. **Bug surface 1 (Edit A target):** The Collect Bill button stays at **₹115**. It should have moved to roughly ₹140 (= 100 + 30 + GST on ₹30). The placed-branch `total` formula at L697 is using `orderFinancials.amount` (which has the old ₹10 baked in) and drops the `deliveryAddOn` slice entirely, so the new ₹30 has nowhere to land.
3. Cashier clicks Collect Bill. The Collect Payment panel opens.
4. **Bug surface 2 (Edit B target):** The Delivery Charge field inside the panel shows **₹10**, not ₹30. The Pay button shows **₹117**, not ~₹140. The `initialDeliveryCharge` prop at L1221 short-circuited on `orderFinancials.deliveryCharge = 10` (truthy) and never looked at the cashier's live `deliveryCharge = 30`.
5. To get the correct total, the cashier must **manually re-type 30 inside the Collect Payment screen** (which is editable for non-prepaid, non-web orders) — confusing and error-prone.

Net: the cashier's edit was accepted by the input box but ignored by every downstream surface that shows or uses the total.

---

## 5. Proposed Corrected Behavior

After both edits are applied:

1. Cashier opens the same placed order — Collect Bill button shows **₹115** (unchanged, no edit yet, delta is zero).
2. Cashier edits Delivery Charge from `10` to `30` in the cart screen.
3. **Edit A effect:** Collect Bill button immediately updates to ~**₹140** (₹100 + ₹30 + GST on ₹30). The placed-branch `total` now adds the delta `(30 − 10) = +20` plus the GST-on-delivery effect on the increased value.
4. Cashier clicks Collect Bill.
5. **Edit B effect:** Collect Payment panel opens with Delivery Charge field pre-filled with **₹30**, Pay button shows ~**₹140** (matches the cart button label).
6. CR-013 D-GST-2 (already in code, untouched) recomputes delivery GST on the ₹30 inside the panel, exactly as it does today when a user types into the panel's own input.
7. Cashier confirms payment. `BILL_PAYMENT` payload `delivery_charge = 30` (already worked today, no change needed in payload builder).

**Behavior on first open / re-engage / scan paths remains identical to today** because the cashier has not yet edited the value — the live state still equals the backend echo, so the delta is zero and the precedence in Edit B (B-2 recommendation) still prefers the backend echo.

---

## 6. Proposed Pseudo-Diff Only (NOT IMPLEMENTED)

> **This section is a plan to be applied by the Implementation Agent after owner approval. No code is changed by this gate document.**

### Edit A pseudo-diff — `OrderEntry.jsx` around L695–698

```diff
   const deliveryAddOn = orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0;
+
+  // BUG-046: placed-branch delta. Backend's orderFinancials.amount has the
+  // place-time delivery baked in; the cashier's subsequent inline edit to
+  // `deliveryCharge` must move the displayed total by the *delta* between the
+  // live state and the backend echo. Gated on delivery orderType so all other
+  // orderTypes stay bit-identical to today. Delta can be negative (downward
+  // edit) — DO NOT clamp.
+  const placedBaseDelivery   = Number(orderFinancials.deliveryCharge) || 0;
+  const placedDeliveryDelta  = orderType === 'delivery'
+    ? (Number(deliveryCharge) || 0) - placedBaseDelivery
+    : 0;
+
   const total = hasPlacedItems
-    ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)
+    ? (orderFinancials.amount || 0)
+      + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)
+      + placedDeliveryDelta
     : applyRoundOff(rawLocalTotal) + deliveryAddOn;
```

Net: **+8 lines added, 1 line modified, 0 lines removed.** Pre-place branch untouched.

### Edit B pseudo-diff — `OrderEntry.jsx` around L1213–1221 (B-2 recommended)

```diff
               // CR-013 Phase 1.5 Fix-2 (May-2026, owner-approved 2026-05-05):
               // Fall back to OrderEntry's local `deliveryCharge` state for the
               // pre-place fresh-delivery flow. Without this fallback the cashier-
               // typed delivery charge silently drops to ₹0 on the Collect Bill
               // screen → delivery row hidden, Delivery GST hidden, Pay total
               // off by (delivery + delivery GST). Backend-echoed value still
               // wins when present, so BUG-019 prepaid scan / re-engage paths
               // and D1-Gate `readOnly={isPrepaid}` remain untouched.
-              initialDeliveryCharge={orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0)}
+              //
+              // BUG-046 (May-2026): when the cashier has edited the value away
+              // from the backend echo, the panel must open with the cashier's
+              // live value, not the stale echo. Detection is `live !== echo`
+              // numerically (both coerced via Number). On first open / re-engage
+              // / scan paths the cashier has not edited yet → live === echo →
+              // expression resolves to the backend echo exactly as today, so
+              // CR-013 Phase 1.5 Fix-2, BUG-019, D1-Gate, and POS2-002 Phase 2
+              // web-lock behavior are all preserved bit-identically.
+              initialDeliveryCharge={
+                Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0)
+                  ? (Number(deliveryCharge) || 0)
+                  : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
+              }
```

Net: **+10 lines added (mostly comments), 1 line modified.** No new state, no new props on CollectPaymentPanel, no new context.

**Combined Edit A + Edit B total: ~18 lines added across one file, 2 lines modified.** Well within the "small, single-file, low-risk" envelope.

---

## 7. Edit B Option Lock — B-1 vs B-2

| Option | Formula | Trade-off | Recommendation |
| --- | --- | --- | --- |
| **B-1 (live-wins-always)** | `initialDeliveryCharge={Number(deliveryCharge) \|\| orderFinancials.deliveryCharge \|\| 0}` | Simpler. **But** permanently flips the source-of-truth precedence: even on re-engage / scan first open, `deliveryCharge` (typically `orderData.deliveryCharge` from L165 init) wins over `orderFinancials.deliveryCharge`. This is functionally similar to today in 99% of cases because L165 init reads from `orderData?.deliveryCharge` and the socket re-engage handlers re-seed `deliveryCharge` via the `useEffect`s near L310 / L346 / L424. But it changes the documented intent of CR-013 Phase 1.5 Fix-2 ("backend echo still wins when present"). | ❌ Not recommended without explicit owner re-ack on CR-013 Phase 1.5 Fix-2 |
| **B-2 (live-wins-only-when-edited)** ⭐ | `Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0) ? (Number(deliveryCharge) \|\| 0) : (orderFinancials.deliveryCharge \|\| (Number(deliveryCharge) \|\| 0))` | Surgical. Preserves CR-013 Phase 1.5 Fix-2 intent verbatim: backend echo wins **on first open / re-engage / scan** (when `live === echo` because the re-engage `useEffect`s have just resynced them). Live state wins **only** when the cashier has typed a value that differs from the echo. | ✅ **Recommended.** Preserves every documented prior intent; fixes the exact gap observed in screenshots. |

### Recommendation: **Option B-2 (live-wins-only-when-edited).**

**Rationale:**
1. **Preserves CR-013 Phase 1.5 Fix-2 verbatim** — the comment block at L1213–1220 explicitly says "Backend-echoed value still wins when present, so BUG-019 prepaid scan / re-engage paths and D1-Gate `readOnly={isPrepaid}` remain untouched." Option B-2 keeps this exactly true; Option B-1 quietly weakens it.
2. **Minimum-surprise principle.** On orders the cashier has not touched, the panel opens identically to today. The only behavioral change is on orders the cashier has actively edited — which is exactly the BUG-046 surface.
3. **Re-engage / scan paths** sync `deliveryCharge` ← `orderFinancials.deliveryCharge` via existing useEffects (verified at L310, L346, L424). After those run, `live === echo`, so B-2 resolves to the echo, identical to today.
4. **Tiny extra cost** — one numeric equality check per render in the panel-prop expression. Negligible.

### Open owner question (one)

> Default in this gate is **Option B-2**. Owner: please confirm acceptable, or explicitly choose B-1.

This is the **single owner decision** needed before the Implementation Agent is triggered. Everything else (Edit A formula, file path, line ranges, untouched-files list, regression validation) is already locked.

---

## 8. Numeric Example (locked)

**Scenario:** Placed delivery order. Item ₹100. Backend stored `delivery_charge = 10` at place-time. Restaurant has `delivery_charge_gst_pct = 50%` for illustration (the screenshots' observed ratio of ₹5 GST on ₹10 delivery → 50%; in production this will be the restaurant's actual configured percentage from CR-013).

Live `deliveryCharge` state starts at `10` (synced from `orderData.deliveryCharge` at mount). Backend echo `orderFinancials.deliveryCharge = 10`. **Delta starts at 0.**

| Stage | Before fix (today) | After fix (B-2) |
| --- | --- | --- |
| **Cart screen — order opened, no edit yet** | Cart Delivery Charge field shows `10`. Collect Bill button **₹115** = 100 + 10 + 5 GST. | Identical: `10` / **₹115**. (Delta = 0, B-2 resolves panel to echo → no observable difference.) |
| **Cart screen — cashier types `30`** | Field shows `30` ✅. Collect Bill button **stays ₹115** ❌. | Field shows `30` ✅. Collect Bill button **moves to ₹140** ✅ (= 100 + 10 + 5 GST + delta 20 + 5 GST-on-delta 20 = 100 + 30 + 15 = wait, let me redo this carefully). |
| **Math reconciliation for After-fix Cart button** | — | `total` = `orderFinancials.amount` (₹115, includes 100 + 10 + 5 GST-on-10) + `unplacedSubtotal>0 ? roundOff(...) : 0` (= 0, no unplaced items) + `placedDeliveryDelta` (= 30 − 10 = **+20**). **Result: ₹135.** Then CR-013 GST-on-delivery would normally have added an extra ₹10 (50% of ₹20 delta) inside CollectPaymentPanel — but that GST recompute happens **inside the panel**, not in OrderEntry's `total`. So the Cart button shows **₹135** after fix, not ₹140. |
| **Adjusted expectation** | — | **Cart Collect Bill button: ₹135** ✅ (matches Bucket-1 plan §10 step 3: "Assert Collect Bill button label increases by `+50`" → in this scenario "+20"). |
| **Click Collect Bill → panel opens** | Panel Delivery Charge field shows **`10`** ❌. Pay button **₹117** ❌. | Panel Delivery Charge field shows **`30`** ✅ (B-2: live ≠ echo → live wins). Pay button shows **₹145** ✅ (= 100 item + 30 delivery + 15 GST-on-delivery at 50%). |
| **Cashier confirms payment** | `BILL_PAYMENT` payload `delivery_charge: 10` ❌ (since panel was at 10) | `BILL_PAYMENT` payload `delivery_charge: 30` ✅ (panel was correctly seeded with 30) |

### Key invariants from this example

1. **Cart-Panel button moves by exactly the delta (+₹20), not by delta-plus-GST.** GST-on-delivery recompute lives inside CollectPaymentPanel (CR-013 D-GST-2), so the Cart screen's `total` only carries the raw delta. This is intentional and matches today's pre-place behavior, where the Cart button also shows the raw delivery charge add without GST until the user opens the panel.
2. **Panel total exceeds Cart total by the delivery-GST-on-delta amount.** This is the same gap that exists today between pre-place Cart total and pre-place panel total — not a new asymmetry introduced by BUG-046.
3. **Item ₹100, GST on items, service charge, tip, discount, coupon, round-off — all bit-identical before vs after the fix.** Only the delivery slice (and its downstream GST inside the panel) moves.
4. **`orderFinancials.amount` is never overwritten.** It stays the backend-echoed truth for items / tax / SC / GST. The fix only **adds a delta on top**, it never edits the echo.

---

## 9. What Will NOT Change (hard locks, verbatim from BUG_046_STATUS_PULL.md §"Business Logic Safety Rules")

| # | Locked surface | Why locked |
| --- | --- | --- |
| 1 | Item subtotal calculation (`localSubtotal`, `unplacedSubtotal`, `rawLocalTotal`, `rawUnplacedTotal`) | Independent of delivery charge. |
| 2 | GST / tax calculation (item-level GST, restaurant GST percentages, `localTax`, `unplacedTax`) | Owned elsewhere (CR-008, CR-013, BUG-019). |
| 3 | Service charge calculation (`serviceChargePercentage`, SC line items, restaurant SC config) | Separate billing rule. |
| 4 | Tip calculation (`tipAmount`, CollectPaymentPanel tip input) | Separate input. |
| 5 | Discount calculation (`discountAmount`, `discountReason`, panel discount block) | Separate adjustment. |
| 6 | Coupon / loyalty (`couponCode`, redemption math, `walletAmount`, `loyaltyAmount`) | Separate redemption rule. |
| 7 | Round-off logic (`applyRoundOff`, `rawFinalTotal` rounding) | Restaurant-config anchored. |
| 8 | Paid / prepaid logic (`isPrepaid`, prepaid Settle, BUG-PREPAID-SETTLE) | Owned by CR-008 D1-Gate. |
| 9 | **`CollectPaymentPanel.jsx` business formulas** — `rawFinalTotal` L424, `deliveryCharge` recompute L358, `readOnly` predicate L938, CR-013 D-GST-2 GST-on-delivery, lazy-init L162–166 | **Entire file untouched.** |
| 10 | Payment / settlement API payload structure (`BILL_PAYMENT`, `collectBillExisting`, `delivery_charge` field, `cancelOrder`, `placeOrder`, `printOrder`) | All payload builders untouched. |
| 11 | Backend write / update behavior (`placeOrder`, `updateOrder`, `BILL_PAYMENT`, `paid-prepaid-order`, `MERGE_ORDER`, `TRANSFER_FOOD`) | No new HTTP calls. |
| 12 | Auto-PATCH behavior | Option A locked. No `updateOrder` auto-fire on inline edit. |
| 13 | `orderFinancials.amount` as source-of-truth for items / tax / SC / GST | Echo remains authoritative. Fix only **adds** a delta; never overwrites. |
| 14 | Web delivery-lock behavior (`isWebOrder && initialDeliveryCharge > 0` branch of D1-Gate) | Lock preserved. Edit B only changes which value is **seeded**; whether the field is readOnly is decided by the same predicate, on the same value. |
| 15 | Prepaid readOnly behavior (`isPrepaid` branch of D1-Gate) | Lock preserved. Same predicate, same outcome. |
| 16 | `data-testid` attributes (`cart-delivery-charge-input`, `delivery-charge-section`, Collect Bill button id, Pay button id) | All preserved 1:1. |
| 17 | Pre-place branch behavior (Cart button, panel seeding) | Bit-identical — `placedDeliveryDelta` is inside the placed-branch arm of the ternary only; pre-place arm is unchanged. |
| 18 | Walk-in / dine-in / take-away / room flows | `orderType === 'delivery'` gate ensures `placedDeliveryDelta = 0` for these; Cart button and panel unchanged. |
| 19 | CartPanel inline input + Collect Bill button rendering (`CartPanel.jsx` L711–740, L839–859) | File untouched. |
| 20 | `orderTransform.toAPI.collectBillExisting` payload builder | Untouched — already carries live `deliveryCharge` correctly per Impact Analysis L1170–1174. |

---

## 10. Regression Validation Checklist (binding — executable by QA)

### A. Numeric repro of the screenshot scenario (mandatory)
- [ ] Place a delivery order with item ₹100 and delivery charge ₹10. Confirm Collect Bill button reads ₹115.
- [ ] Reopen the placed order. Cart field reads `10`, button still reads ₹115.
- [ ] Edit Cart Delivery Charge to `30`. **Before fix:** button stays ₹115 ❌. **After fix:** button moves to ₹135 ✅ (raw +20 delta).
- [ ] Click Collect Bill. **Before fix:** panel input `10`, Pay ₹117 ❌. **After fix:** panel input `30`, Pay reflects CR-013 GST recompute on ₹30 ✅.
- [ ] Pay. Outgoing `BILL_PAYMENT.delivery_charge` = `30` ✅ (already works today; no regression expected).

### B. Non-delivery line items bit-identical (mandatory)
- [ ] Item Total (BILL SUMMARY) unchanged.
- [ ] `localSubtotal`, `unplacedSubtotal` unchanged.
- [ ] `localTax`, `unplacedTax` unchanged.
- [ ] `rawLocalTotal`, `rawUnplacedTotal`, `applyRoundOff(...)` outputs unchanged.
- [ ] Service Charge line unchanged.
- [ ] Tip unchanged.
- [ ] Discount / Coupon / Loyalty unchanged.
- [ ] Round-off behavior unchanged.

### C. Non-delivery order types untouched (mandatory)
- [ ] Walk-in order: edit any field; `placedDeliveryDelta = 0` (gated on `orderType === 'delivery'`); Cart button + Panel total unchanged from today.
- [ ] Dine-in: same.
- [ ] Take-away: same.
- [ ] Room (`isRoom = true`): Checkout button label and panel unchanged.

### D. Pre-place flow untouched (mandatory)
- [ ] Fresh delivery order, no items placed yet — type `50` in Cart field, button moves +₹50 (today's behavior).
- [ ] Open Collect Payment panel pre-place — input pre-fills with `50` (today's behavior preserved by CR-013 Phase 1.5 Fix-2 + Edit B's B-2 design: live === echo when pre-place, so panel resolves to echo which is 0, then `|| live` fallback returns 50; same as today).

### E. Re-engage / scan paths untouched (mandatory)
- [ ] Re-engage a placed delivery order via socket — `useEffect` at L310 / L346 / L424 resyncs `deliveryCharge` ← `orderFinancials.deliveryCharge`. After resync, `live === echo`, so B-2 resolves panel to echo. Identical to today.
- [ ] Scan delivery order (`isWebOrder = true`) with backend-supplied `delivery_charge > 0`: panel opens with backend value; CollectPaymentPanel's `readOnly` predicate (untouched) still locks the field.

### F. Web delivery-lock not bypassed (mandatory)
- [ ] Web order, backend `delivery_charge = 50` — panel field reads `50` and is `readOnly`. Cashier cannot edit inside the panel.
- [ ] Web order, backend `delivery_charge = 0` — panel field is editable.

### G. Prepaid readOnly not bypassed (mandatory)
- [ ] Prepaid order — panel field always `readOnly` regardless of value. Confirmed by `isPrepaid` predicate (untouched).

### H. CollectPaymentPanel.jsx file not modified (mandatory)
- [ ] `git diff --name-only` on the implementation PR does NOT include `CollectPaymentPanel.jsx`.
- [ ] L162–166 lazy-init unchanged.
- [ ] L358 deliveryCharge recompute unchanged.
- [ ] L424 rawFinalTotal unchanged.
- [ ] L938 readOnly predicate unchanged.

### I. CartPanel.jsx file not modified (mandatory)
- [ ] `git diff --name-only` does NOT include `CartPanel.jsx`.
- [ ] L711–740 input + L839–859 Collect Bill button rendering unchanged.

### J. Payload builders untouched (mandatory)
- [ ] `git diff --name-only` does NOT include `orderTransform.js` or any file under `frontend/src/api/`.

### K. Negative-edit case (mandatory)
- [ ] Backend `delivery_charge = 50`. Cashier edits to `0`. **After fix:** Cart button drops by ₹50 (raw delta `0 − 50 = −50`, no clamp). Panel opens at `0`.

### L. Zero-delta case (sanity)
- [ ] Backend `delivery_charge = 25`. Cashier re-types `25` (same value). **After fix:** Cart button and panel unchanged from initial view (delta resolves to 0 via the Number-coerced equality check in B-2).

### M. No console errors (mandatory)
- [ ] No new console errors / warnings during any of the above flows.

### N. data-testid preserved (mandatory)
- [ ] `cart-delivery-charge-input`, `delivery-charge-section`, Collect Bill button testid, Pay button testid — all present and unchanged.

### O. Single-file diff (mandatory)
- [ ] `git diff --name-only` shows **exactly one** file: `frontend/src/components/order-entry/OrderEntry.jsx`.

---

## 11. Risk Level

### **Low.**

| Risk dimension | Assessment |
| --- | --- |
| Blast radius | Single file, one component, two adjacent edits. |
| Lines of change | ~18 added, 2 modified (mostly comments). |
| Math correctness | Self-cancelling: delta resolves to 0 when no edit. No new arithmetic; only an add. |
| API / payload risk | Zero — no payload builder touched. |
| Socket / state-sync risk | Zero — no socket handler touched. |
| Race conditions | None — purely render-time derivation; no async, no setState calls. |
| Regression on neighboring CRs/BUGs | None expected. Each preserved invariant has a dedicated checklist item. |
| Owner-decision risk | One small choice (B-1 vs B-2); default B-2 preserves every prior intent. |
| Reversibility | Trivial git revert — one file, two hunks. |

---

## 12. Owner Approval Gate

> **Owner must explicitly approve the following before the Implementation Agent is triggered:**

| # | Item | Default | Owner sign-off |
| --- | --- | --- | --- |
| 1 | Single-file scope: only `frontend/src/components/order-entry/OrderEntry.jsx` | YES | ☐ Approved / ☐ Reject |
| 2 | Edit A formula (placed-branch delta as pseudo-diff in §6) | YES (locked) | ☐ Approved / ☐ Reject |
| 3 | Edit B precedence (B-1 vs B-2) | **B-2** (live-wins-only-when-edited) | ☐ Approve B-2 / ☐ Override to B-1 / ☐ Reject |
| 4 | Option A on auto-PATCH (no inline-edit fires `updateOrder` API) | YES (locked, matches Bucket-1 plan default) | ☐ Approved / ☐ Reject |
| 5 | Business Logic Safety Rules §9 (20 hard locks) are binding for the Implementation Agent | YES | ☐ Approved / ☐ Reject |
| 6 | Regression Validation Checklist §10 is binding for QA before merge | YES | ☐ Approved / ☐ Reject |
| 7 | `CollectPaymentPanel.jsx`, `CartPanel.jsx`, payload builders — **must not appear** in the implementation diff | YES | ☐ Approved / ☐ Reject |

**Once all rows are approved:**
- Hand off to the Bug Implementation Agent.
- Input packet for the implementation agent: this gate doc + `BUG_046_STATUS_PULL.md`.
- Forbidden in the implementation diff (per §9 + §10):
  - Any `frontend/src/components/order-entry/CollectPaymentPanel.jsx` change.
  - Any `frontend/src/components/order-entry/CartPanel.jsx` change.
  - Any file under `frontend/src/api/` (transforms, services, socket, axios).
  - Any change to `/app/memory/final/`.
  - Any change to `/app/memory/BUG_TEMPLATE.md`.
  - Any auto-PATCH `updateOrder` fire on inline edit.
- Required in the implementation:
  - Both Edit A and Edit B as locked in §6 (with B-2 unless overridden in row 3).
  - Comments referencing BUG-046 + CR-013 Phase 1.5 Fix-2 + CR-008 D1-Gate on the two modified hunks.
  - All `data-testid` attributes preserved 1:1.

---

## 13. Final Verdict

### `needs_owner_decision`

**Why not `ready_for_owner_code_gate_review`:** the gate is complete and the owner CAN sign off as-is — but row 3 of the Owner Approval Gate (Edit B precedence: B-1 vs B-2) requires an explicit pick, and the default recommendation (B-2) ought to be acknowledged explicitly because it touches the documented intent of CR-013 Phase 1.5 Fix-2. So the correct verdict is **`needs_owner_decision`** until the owner ticks row 3.

**Why not `blocked_by_code_conflict`:** all target lines verified intact at HEAD `9bfb1a6`. No drift, no merge risk, no upstream conflict. Both edit targets are in the same file, in non-overlapping regions, with stable surrounding context.

**If owner confirms B-2 (or explicitly overrides to B-1)** → verdict promotes to `ready_for_implementation_agent` (handoff packet: this gate + `BUG_046_STATUS_PULL.md`).

---

## End Of Gate

- **No code was changed in this task.**
- **`/app/memory/final/` was not modified.**
- **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- **`/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` was not modified.**
- **`/app/memory/bugs/BUG_046_STATUS_PULL.md` was not modified** (this gate consumes it as input, does not edit it).
- This gate doc lives at `/app/memory/bugs/BUG_046_PRE_IMPLEMENTATION_CODE_GATE.md`.
- Source code (`OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`, transforms, services, sockets) — **all untouched**.
- BUG-045 sealed and untouched. BUG-044 parked and untouched (referenced only for sprint-context non-overlap).
