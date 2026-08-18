# On Hold Payment Branch Validation

> SCOPE: Investigation/validation only. No code changes, no commits, no cherry-pick, no merge.
> SOURCE OF TRUTH: git refs `origin/main`, `origin/14-may`, `origin/13-may-bug` at the time of investigation.

---

## 1. Summary (TL;DR)

**The "On Hold Payment paid flow" fix is FULLY PRESENT in `14-may`.** The premise of the request ("the fix is in `13-may-bug` but may not be in `14-may`") is inverted by the actual git topology:

- `13-may-bug` is the **oldest** of the three branches.
- `14-may` is a strict superset of `13-may-bug` (every commit in `13-may-bug` is in `14-may`, plus 17 extra commits).
- `main` is a strict superset of `14-may` (only 1 extra commit, a `.gitignore` change).

Therefore any code-level fix that exists in `13-may-bug` mathematically also exists in `14-may` and `main` — **unless** later commits between `13-may-bug` and `14-may` actively reverted it. They did not: the only source-code differences are subtotal/delivery-tax accounting changes (BUG-281 / CR-013 phase 1.5 follow-up), none of which delete or revert the CR-003 "Collect Bill from Hold" implementation.

There IS a small **payload-shape change inside the same `collectBillExisting` builder** that is used by the Hold-tab Collect flow. That change is unrelated to the user's reported "On Hold Payment paid bug" but it does ride the same code path. Section 5 documents it precisely; Section 11 flags the regression check needed.

---

## 2. Branches Checked

| Branch | Resolved ref | Latest commit | Date (UTC) |
|---|---|---|---|
| `main`         | `origin/main`         | `9e0e382 Auto-generated changes` | 2026-05-13 17:05 |
| `14-may`       | `origin/14-may`       | `9388078 Auto-generated changes` | 2026-05-13 17:02 |
| `13-may-bug`   | `origin/13-may-bug`   | `f95d890 Auto-generated changes` | 2026-05-12 19:34 |

### Working tree status (`git status --short`)
```
?? frontend/yarn.lock
```
Only one untracked file (`frontend/yarn.lock`) — produced by an earlier `yarn install` in this pod. Not a tracked change. **No modifications to any committed source file. Safe to proceed with read-only inspection.**

Current branch at start of investigation: `main` (read-only inspection of all three remote refs).

### Git topology — established commands

```
git fetch --all --prune
git log --oneline origin/main..origin/14-may          # → 0 commits  (14-may has nothing main lacks)
git log --oneline origin/14-may..origin/main          # → 1 commit   (main = 14-may + .gitignore tweak)
git log --oneline origin/main..origin/13-may-bug      # → 0 commits  (13-may-bug has nothing main lacks)
git log --oneline origin/13-may-bug..origin/main      # → 17 commits (main = 13-may-bug + 17 commits)
git log --oneline origin/14-may..origin/13-may-bug    # → 0 commits  (13-may-bug has nothing 14-may lacks)
git log --oneline origin/13-may-bug..origin/14-may    # → 17 commits (14-may = 13-may-bug + 17 commits)
git merge-base origin/13-may-bug origin/14-may        # → HEAD of 13-may-bug  (linear ancestor)
git merge-base origin/14-may  origin/main             # → HEAD of 14-may      (linear ancestor)
```

Conclusion of topology: `13-may-bug ⊂ 14-may ⊂ main` (strict, linear).

---

## 3. Bug Fix Identified

The "On Hold Payment paid flow" is the **CR-003 Phase 3.6** implementation: "Collect Bill from Hold". This is the canonical feature that lets a cashier pay an On-Hold (paylater / `fOrderStatus === 9`) order directly from the Audit Report → Hold tab.

Evidence trail (memory + code):
- `memory/change_requests/CR_003_paid_hold_order_actions.md` — change-request doc, lines 9–14 ("On the On Hold tab, every held order must offer a Collect Bill option").
- `memory/change_requests/implementation_summaries/CR_003_IMPLEMENTATION_SUMMARY.md` — implementation summary, lines 21–23 + 117–121:
  > "Collect Bill payload: **identical to the dashboard's collect-bill payload** (built via `orderTransform.toAPI.collectBillExisting`). No parallel payload shape."
- `memory/change_requests/qa_handover/CR_003_QA_HANDOVER.md` — QA handover.
- `memory/change_requests/qa_reports/CR_003_QA_REPORT.md` — QA report.
- `memory/change_requests/implementation_summaries/CR_003_IMPLEMENTATION_SUMMARY.md` line 165:
  > "User end-to-end validation — Phase 3.6 Collect Bill | Passed | Order 002905 successfully moved Hold → Paid (cash) ₹289"

The "payload correction" the user is referring to is most likely one of these two CR-003 details (the docs explicitly call them "payload" decisions):
- Reusing `orderTransform.toAPI.collectBillExisting` (instead of inventing a parallel builder) so the BILL_PAYMENT payload sent for a Hold→Paid transition is byte-identical to a normal dashboard collect-bill payload. This is documented as deliberate design (CR_003_IMPLEMENTATION_SUMMARY.md lines 117–121).
- For the related Endpoint A (CR-003 Change Payment Method), the payload was tightened to numeric DB `order_id` + lowercase `payment_method` (`paymentMutationService.js` L25–L46, L77–L85) — explicit "Sometimes confused with display order_no" guard.

Both are **fully present in `13-may-bug` and in `14-may`** (see Section 5).

---

## 4. Files and Functions Involved

The complete surface area of the CR-003 / On-Hold-Payment fix:

| File | Function / Component | Role |
|---|---|---|
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | `CollectBillPanelDrawer` (default export), `handlePaymentComplete` (L160–L196) | Right-side drawer launched from the Hold-tab "Collect" pill. Internally `POST API_ENDPOINTS.SINGLE_ORDER_NEW` → `orderFromAPI.order(raw)` → render dashboard `CollectPaymentPanel`; on `onPaymentComplete(paymentData)` builds payload via `orderTransform.toAPI.collectBillExisting` and `POST API_ENDPOINTS.BILL_PAYMENT`. |
| `frontend/src/api/transforms/orderTransform.js` | `toAPI.collectBillExisting` (L1130–L1330+) | Canonical BILL_PAYMENT payload builder. Same builder used by dashboard + Hold drawer. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `handleConfirm` (~L549–L607), `paymentData` object | Emits the `paymentData` consumed by both dashboard collect-bill flow and the Hold drawer. |
| `frontend/src/pages/AllOrdersReportPage.jsx` | Hold-tab Collect-Bill state (L206 onwards, `hasEligibleHoldPaymentMethod` L556, `onCollectStart/Success/Error` wired to `CollectBillPanelDrawer`) | Owns optimistic Hold-tab row removal + refetch. |
| `frontend/src/api/services/paymentMutationService.js` | `changeOrderPaymentMethod`, `makeOrderUnpaid`, `normalizeOrderId`, `normalizePaymentMethod`, `ALLOWED_PAYMENT_METHODS` | CR-003 Endpoint A/B wrappers — input normalisation guards against the wrong payload shape (display vs DB id, casing). |
| `frontend/src/components/reports/OrderTable.jsx` | `hasEligibleHoldPaymentMethod`, Hold-tab Collect-pill rendering (L214 onwards, L285, L299) | Per-row UI for Hold tab. |
| `frontend/src/components/reports/PaymentMethodPicker.jsx` | Paid-tab "Change Payment Method" UI | CR-003 Endpoint A integration. |
| `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | "Mark as Unpaid" dialog | CR-003 Endpoint B integration. |
| `frontend/src/api/socket/socketHandlers.js` | L182 (`fOrderStatus === 8/9` guard), L284–L292 (`isPayLaterSettle`, `isHoldClear`), L429–L494 | Socket-side reconciliation that detects Hold→Paid transitions and updates table status correctly (POS2-005 + BUG-042-C). |
| `frontend/src/api/constants.js` | `PAY_LATER`, `CHANGE_ORDER_PAYMENT_METHOD`, `MAKE_ORDER_UNPAID`, `BILL_PAYMENT` endpoints | Endpoint definitions. |

### Endpoints touched (no backend modification)
- `BILL_PAYMENT` (POST `/api/v2/vendoremployee/order/order-bill-payment`) — used for Hold→Paid transitions, with payload built by `collectBillExisting`.
- `CHANGE_ORDER_PAYMENT_METHOD` (POST `/api/v2/vendoremployee/change-order-payment-method`) — CR-003 Endpoint A.
- `MAKE_ORDER_UNPAID` (POST `/api/v2/vendoremployee/make-order-unpaid`) — CR-003 Endpoint B.
- `SINGLE_ORDER_NEW` — used by `CollectBillPanelDrawer` to hydrate the held order detail.

---

## 5. Payload Correction Details

### 5.1 CR-003 Endpoint A — Change Payment Method
- Payload shape (locked, `paymentMutationService.js` L77–L85):
  ```json
  { "order_id": <numeric DB id>, "payment_method": "cash" | "card" | "upi" }
  ```
- Input normalisation: `normalizeOrderId` rejects non-positive-integer ids; `normalizePaymentMethod` lowercases and rejects unsupported methods.
- Constants: `ALLOWED_PAYMENT_METHODS = Object.freeze(['cash', 'card', 'upi'])` (L25).
- **Same in 13-may-bug and 14-may** — file diff is 0 lines.

### 5.2 CR-003 Endpoint B — Mark Paid as Unpaid
- Payload shape (locked, `paymentMutationService.js` L99–L106):
  ```json
  { "order_id": <numeric DB id> }
  ```
- **Same in 13-may-bug and 14-may** — file diff is 0 lines.

### 5.3 Hold → Collect Bill — BILL_PAYMENT payload (shared with dashboard)
- Builder: `orderTransform.toAPI.collectBillExisting(table, cartItems, customer, paymentData, options)` — `orderTransform.js` L1130.
- Caller (Hold tab): `CollectBillPanelDrawer.jsx` L160–L196 — file diff is 0 lines between branches.
- Caller (Dashboard): `OrderEntry.jsx` (postpaid Collect Bill path).

#### The ONE relevant payload-field shift between `13-may-bug` and `14-may`

In `collectBillExisting` (orderTransform.js around L1223–L1238) — relevant unified diff:

```diff
-      itemTotal = 0, serviceCharge = 0, deliveryCharge = 0,
+      itemTotal = 0, subtotal = 0, serviceCharge = 0, deliveryCharge = 0,
...
-      order_sub_total_amount:       itemTotal || 0,
-      order_sub_total_without_tax:  itemTotal || 0,
+      order_sub_total_amount:       itemTotal || 0,    // Item Total
+      order_sub_total_without_tax:  subtotal  || 0,    // Subtotal (incl. delivery when applicable)
```

| Field | `13-may-bug` value | `14-may` value |
|---|---|---|
| `order_sub_total_amount` | `itemTotal` | `itemTotal` (unchanged) |
| `order_sub_total_without_tax` | `itemTotal` | `subtotal` (new — `items − discount + SC + tip + delivery`, sourced from `CollectPaymentPanel.subtotal`) |

This is **NOT** the CR-003 "On Hold Payment" fix the user is asking about. It is the **CR-013 Phase 1.5 / BUG-281 follow-up "subtotal/delivery alignment"** (memory docs: `INVESTIGATION_order_sub_total_keys.md`, `PLAN_order_sub_total_keys_split.md`, `PLAN_subtotal_delivery_addendum.md`, `QA_REPORT_SUBTOTAL_DELIVERY_2026-05-13.md`).

But because `collectBillExisting` is the same builder the **Hold drawer** uses, this field-shift DOES affect the BILL_PAYMENT payload sent when paying an on-hold order with a delivery charge.

### 5.4 Companion change in `CollectPaymentPanel.jsx` (subtotal math)

Unified diff between branches at L441 (paymentData is built using this value):
```diff
-  // Subtotal = pre-tax total = postDiscountItems + SC + tip
-  const subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip) * 100) / 100;
+  // Subtotal = pre-tax complete = postDiscountItems + SC + tip + delivery
+  const subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip + deliveryCharge) * 100) / 100;
-  const rawFinalTotal = Math.round((subtotal + sgst + cgst + deliveryCharge) * 100) / 100;
+  const rawFinalTotal = Math.round((subtotal + sgst + cgst) * 100) / 100;
```
This is an algebraic rearrangement; `rawFinalTotal` (Grand Total) is byte-identical before and after. Only the intermediate `subtotal` is enriched. `paymentData.subtotal` is already emitted by both branches (L584), so the wiring is fully compatible.

---

## 6. Validation Result: Fix in `14-may`

**Status: FULLY PRESENT.**

### Evidence A — Topology
`14-may` is a strict, linear superset of `13-may-bug`: `git log --oneline origin/14-may..origin/13-may-bug` returns zero commits, and the merge-base is the HEAD of `13-may-bug`. No revert commit exists in the 17-commit range from `13-may-bug` HEAD → `14-may` HEAD.

### Evidence B — Byte-level file diffs of CR-003 surface
Per-file diff line counts (`git diff origin/13-may-bug origin/14-may -- <file>`):

| File | Diff lines |
|---|---|
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | **0** |
| `frontend/src/api/services/paymentMutationService.js` | **0** |
| `frontend/src/pages/AllOrdersReportPage.jsx` | **0** |
| `frontend/src/api/socket/socketHandlers.js` | **0** |
| `frontend/src/components/reports/OrderTable.jsx` | **0** |
| `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | **0** |
| `frontend/src/components/reports/PaymentMethodPicker.jsx` | **0** |
| `frontend/src/api/transforms/orderTransform.js` | 28 (subtotal/delivery — Section 5.3) |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 13 (subtotal/delivery — Section 5.4) |

All seven dedicated CR-003 files are **byte-identical** between the two branches. The two modified files are the shared payload builder + dashboard panel — modified for the unrelated subtotal/delivery alignment work — and their changes do NOT remove or alter any hold-payment logic. `paymentData.subtotal` was already being emitted on `13-may-bug` (`CollectPaymentPanel.jsx` L584 — confirmed via `git show origin/13-may-bug:...`), so the Hold drawer continues to function on both branches.

### Final verdict
- **Fully present**: YES
- **Partially present**: N/A
- **Missing**: NO
- **Present but different**: NO (CR-003 surface is byte-identical)
- **Present but possibly broken due to surrounding changes**: SLIGHT RISK — the `order_sub_total_without_tax` field of the BILL_PAYMENT payload sent for Hold→Paid orders changed from `itemTotal` to `subtotal` (delivery-inclusive). See Section 11.

---

## 7. Reference Working Branch: `13-may-bug`

`13-may-bug` contains the complete CR-003 implementation as of 2026-05-12 19:34 UTC:

- `CollectBillPanelDrawer.jsx` — present, full.
- `paymentMutationService.js` — present, full.
- `AllOrdersReportPage.jsx` — full Hold-tab Collect-Bill state machine, including optimistic row removal in `onCollectStart` / `onCollectSuccess` / `onCollectError`.
- `socketHandlers.js` — `isPayLaterSettle` / `isHoldClear` discrimination at L290–L292; `fOrderStatus === 8/9` guards at L185 + L494.
- `OrderTable.jsx` — Hold-tab "Collect" pill with `hasEligibleHoldPaymentMethod` gating.
- `PaymentMethodPicker.jsx`, `MarkUnpaidConfirmDialog.jsx` — Paid-tab actions.
- `orderTransform.js` — `collectBillExisting` builder, BUG-018, BUG-019, BUG-252, ROOM_CHECKIN_FIX_V2 (all locked).

The user's "this works on 13-may-bug" observation is consistent: the CR-003 plumbing was validated end-to-end on order 002905 (`CR_003_IMPLEMENTATION_SUMMARY.md` L165). The state on `13-may-bug` reflects exactly that validated point in history.

---

## 8. Difference Summary: `main` vs `14-may`

### Git command
```
git diff --name-status origin/14-may origin/main
git log --oneline origin/14-may..origin/main
```

### Result
- 1 commit ahead: `9e0e382 Auto-generated changes`.
- 1 file changed: `.gitignore` only.

### Modules affected
- Build/repo tooling only (`.gitignore`).

### Payment / order / hold changes
- **None.**

### Risk
- **Zero.** `main` and `14-may` are functionally identical for all application code, including the entire CR-003 surface.

---

## 9. Difference Summary: `main` vs `13-may-bug`

### Git command
```
git diff --name-status origin/13-may-bug origin/main
git log --oneline origin/13-may-bug..origin/main
```

### Result
- 17 commits ahead.
- Source-code files changed:
  - `frontend/src/api/transforms/orderTransform.js` (subtotal/delivery alignment — see Section 5.3)
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (subtotal math rearrangement — see Section 5.4)
  - `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` (NEW — covers the subtotal change)
- Non-code changes:
  - `.gitignore`, `DEPLOYMENT_HANDOVER.md`, `memory/PRD.md` (updated)
  - 7 new memory docs under `/memory/` for the subtotal/delivery alignment work (`BUCKETED_PLAN_subtotal_alignment.md`, `INVESTIGATION_order_sub_total_keys.md`, `PLAN_order_sub_total_keys_split.md`, `PLAN_subtotal_delivery_addendum.md`, `PRE_IMPLEMENTATION_SIGNOFF_subtotal.md`, `QA_REPORT_SUBTOTAL_DELIVERY_2026-05-13.md`, `QA_REPORT_authenticated_subtotal_delivery.md`)

### Notable commit messages
All 17 commits are auto-generated (`Auto-generated changes` or `auto-commit for <uuid>`) — no semantic information in the messages themselves. The semantic content lives in the new memory docs.

### Risk areas
- The `order_sub_total_without_tax` field value sent in BILL_PAYMENT has changed semantics (items → items + SC + tip + delivery). Backend must accept and persist the new value; see Section 11.

---

## 10. Focused Difference: `14-may` vs `13-may-bug` (payment / hold scope only)

### Files in the CR-003 / hold-payment surface that DIFFER between branches
**One file pair**, both due to subtotal/delivery alignment, not hold logic:

1. `frontend/src/api/transforms/orderTransform.js` — `collectBillExisting` builder gained a `subtotal` parameter; `order_sub_total_without_tax` now sources from it. (Section 5.3.)
2. `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — `subtotal` calculation now folds in `deliveryCharge`. (Section 5.4.)

Net effect on BILL_PAYMENT payload when paying a Hold order via `CollectBillPanelDrawer`:
- `order_sub_total_amount` — unchanged.
- `order_sub_total_without_tax` — changes from `itemTotal` to `itemTotal − discount + SC + tip + delivery`.
- All other fields (`food_detail`, `payment_amount`, `payment_status`, `grand_amount`, taxes, tip, delivery_charge, etc.) — unchanged.

### Files in the CR-003 / hold-payment surface that ARE IDENTICAL between branches
- `CollectBillPanelDrawer.jsx`, `paymentMutationService.js`, `AllOrdersReportPage.jsx`, `socketHandlers.js`, `OrderTable.jsx`, `PaymentMethodPicker.jsx`, `MarkUnpaidConfirmDialog.jsx`, `api/constants.js` (Hold-related entries).

### Answers to the prompt's specific questions
1. **Which exact fix code exists in `13-may-bug`?** The full CR-003 Phase 3.6 plumbing (drawer, mutation service, table actions, socket discrimination) plus the existing dashboard collect-bill payload builder.
2. **Is the same code present in `14-may`?** YES — byte-identical for all dedicated CR-003 files; the shared `collectBillExisting` builder is present and now ALSO contains a separate (subtotal/delivery) enhancement.
3. **If not, what is missing?** Nothing is missing.
4. **If different, what changed?** Only the `order_sub_total_without_tax` field source (Section 5.3). The hold-payment workflow itself is unchanged.
5. **Which branch has the correct working behavior?** Both branches contain the same CR-003 logic. If "correct working behavior" includes the new subtotal/delivery accounting, only `14-may`/`main` has it; `13-may-bug` predates it.
6. **What would need to be copied/merged later, if approved?** Nothing for the On Hold Payment paid flow — already in place. (If the team later finds the subtotal change is undesired for Hold orders specifically, the surgical revert would be the two diff hunks in Section 5.3 + 5.4, but that is a separate decision.)

---

## 11. Risk Assessment

### If `14-may` (or `main`) goes live without changes
- **Hold→Paid workflow:** Same behavior as `13-may-bug`. Cashier clicks "Collect" on a Hold-tab row → drawer opens → cashier selects method → BILL_PAYMENT posted → optimistic Hold-tab removal → refetch.
- **Payload field shift:** `order_sub_total_without_tax` now reflects the displayed Subtotal (items − discount + SC + tip + delivery) instead of being equal to `order_sub_total_amount` (items only).
  - Backward compatibility risk: **LOW–MEDIUM**, depending on backend usage of that field.
  - If the backend treats `order_sub_total_without_tax` as a UI-display mirror only, this is a no-op (the cashier intended this number anyway).
  - If the backend uses this field for tax-base reconciliation or for downstream computations, the new value may cause double-counting downstream (delivery would appear both in `order_sub_total_without_tax` and in the explicit `delivery_charge` field at L1258).
  - The memory doc `QA_REPORT_SUBTOTAL_DELIVERY_2026-05-13.md` reports the dashboard collect-bill case was QA-validated; the Hold-tab path uses the SAME builder but was NOT explicitly listed as a QA case in that report (verify with QA team).

### Other risks observed during inspection (out of scope but worth flagging)
- The `13-may-bug` branch is **behind** the deployed `main`. Any deployment from `13-may-bug` would regress the subtotal/delivery accounting and lose the new test file. Do not deploy `13-may-bug` as-is to roll back this fix.

---

## 12. Recommended Next Step

**No code change required for the On Hold Payment paid flow.** The fix is already in `14-may` and `main`.

Recommended action sequence (no implementation needed from this thread):

1. **Confirm with the original reporter** which exact scenario was failing ("when an order was on hold and then paid, the flow was not working correctly"). The CR-003 plumbing is present and validated; if a specific real-world test on `14-may` reproduces a regression, share repro steps and exact error so a targeted root-cause investigation can run.
2. **Run a focused QA pass on `14-may` for the Hold→Paid path** specifically with delivery charge > 0, to verify the new `order_sub_total_without_tax` value does not surprise the backend. Cases listed in Section 13.
3. **Do not cherry-pick from `13-may-bug` to `14-may`.** `14-may` already contains everything `13-may-bug` has; cherry-picking would be a no-op at best, and at worst would force-revert the subtotal alignment.
4. **No merge / no rebase / no commit** in this thread. Pure validation.

If, after step 1+2, a regression is reproduced and it is found to be caused by the subtotal/delivery payload field shift (Section 5.3), the surgical, scoped fix would be to make the `order_sub_total_without_tax` field conditional on order context (e.g. revert to `itemTotal` for Hold-paid flow, keep new value for dashboard collect-bill). That is a SEPARATE change request and must be owner-approved.

---

## 13. QA Checklist for Future Implementation

These QA cases should be run on `14-may`/`main` to confirm the On Hold Payment paid flow is intact:

### Functional — Hold tab → Collect Bill (cash)
1. Place an order in Hold (paylater) state. Confirm it appears under "On Hold" tab in Audit Report.
2. Click the green Collect pill on the Hold row → drawer opens; order detail loads; cart items shown; totals match the order's recorded amount.
3. Select Cash → click Pay → drawer closes; toast confirms success; row disappears from Hold tab; reappears on Paid tab with method = "cash".
4. Repeat with Card (with txn id) and UPI.

### Functional — payload sanity (network tab)
5. Inspect the BILL_PAYMENT request body. Expected fields:
   - `order_id` = numeric DB id (string-cast OK).
   - `payment_mode` = lowercase method.
   - `payment_status` = "paid" (or "success" for TAB).
   - `payment_amount` = grand total.
   - `order_sub_total_amount` = item total.
   - `order_sub_total_without_tax` = items − discount + SC + tip + delivery (Section 5.3).
   - `delivery_charge` = backend delivery principal.
   - `grand_amount` = grand total.
   - `food_detail` array present, one row per placed non-cancelled item.

### Functional — CR-003 Endpoint A (Change Payment Method on Paid tab)
6. On Paid tab, change payment method between Cash/Card/UPI → POST `/change-order-payment-method` with `{order_id: <int>, payment_method: "<lowercase>"}` (no other fields).
7. Row re-renders with new method after success.

### Functional — CR-003 Endpoint B (Mark Paid as Unpaid)
8. On Paid tab, click Mark Unpaid → confirm dialog → POST `/make-order-unpaid` with `{order_id: <int>}` only.
9. Row disappears from Paid tab; re-surfaces on Running/Unpaid on dashboard.

### Regression — subtotal/delivery alignment
10. Hold order with non-zero `delivery_charge`. Pay it. Verify backend persists Subtotal and Item Total separately (and that downstream invoices/reports do not double-count delivery).
11. Hold order with zero delivery. Verify `order_sub_total_without_tax` = `order_sub_total_amount` + SC + tip (unchanged math when delivery is absent).

### Negative / boundary
12. Tab (credit) payment on a Hold order — `payment_status` should be "success" (not "paid"); txn id should be empty.
13. Hold order with runtime-complimentary line items — `is_complementary: "Yes"`, `complementary_total` populated, food_amount/variation_amount/addon_amount carved to 0.
14. Hold order with Check-In marker line — marker MUST be excluded from `food_detail` (`isCheckInMarker` filter at L1156).

---

## 14. Open Questions

1. **What exact failure was observed on `14-may` that wasn't seen on `13-may-bug`?** Without repro steps, only the topology + diff analysis is possible. The data says the fix is present; if a real failure exists, it likely traces to (a) backend acceptance of the new `order_sub_total_without_tax` value, (b) build/deploy environment differences, or (c) misattribution to the wrong branch.
2. **Was the subtotal/delivery alignment QA pass run for the Hold-tab Collect Bill path specifically, or only the dashboard Collect Bill path?** Memory doc `QA_REPORT_SUBTOTAL_DELIVERY_2026-05-13.md` should be cross-checked with the QA owner.
3. **Is the backend authoritative parser for `order_sub_total_without_tax` tolerant of the delivery-inclusive value?** Out-of-scope for frontend investigation; needs backend owner confirmation.
4. **Does the team intend to keep `13-may-bug` as a release candidate, or use `main` (= `14-may` + 1 `.gitignore` commit) for the next release?** `13-may-bug` is functionally behind both other branches.
5. **The auto-generated commit messages obscure semantic intent.** Worth establishing a convention of conventional-commit messages so future "is this fix in branch X" investigations don't require this kind of forensic file-diff analysis.

---

## 15. Learning Summary

In plain English:

- **The original bug** was that on-hold (paylater) orders could not be paid cleanly from the Audit Report — operators had to navigate to the dashboard to collect the bill. CR-003 Phase 3.6 added a right-side drawer that reuses the SAME `CollectPaymentPanel` and the SAME `collectBillExisting` payload builder the dashboard uses. The "payload correction" the user remembers is the deliberate decision to reuse the dashboard builder verbatim (no parallel implementation), plus the strict input normalisation on the CR-003 Endpoint A / B payloads (numeric DB id, lowercase method).
- **How the fix works:** when the operator clicks the "Collect" pill on a Hold-tab row → `CollectBillPanelDrawer` opens → fetches the full order via `SINGLE_ORDER_NEW` → transforms via `orderTransform.fromAPI.order` → renders the dashboard `CollectPaymentPanel` → on payment, calls `orderTransform.toAPI.collectBillExisting(...)` to build the BILL_PAYMENT payload, POSTs it, and emits success/error callbacks to the report page which optimistically removes the row from the Hold tab and triggers a refetch. Socket-side, `isPayLaterSettle` discrimination ensures the table-status flow doesn't get confused by the Hold→Paid transition (POS2-005, BUG-042-C).
- **Which branch contains it:** `13-may-bug`, `14-may`, and `main` ALL contain it (linear ancestry). All seven dedicated CR-003 files are byte-identical across `13-may-bug` and `14-may`.
- **Does `14-may` have it:** YES, fully. The user's premise that the fix might be missing from `14-may` is not supported by the git history.
- **Which branch differences matter:** `main` and `14-may` differ only by `.gitignore`. `14-may` (and therefore `main`) carries 17 extra commits over `13-may-bug`, all of which implement a separate "subtotal/delivery alignment" change. Those commits modify the SAME payload builder that the Hold drawer uses, and they shift the value of one field (`order_sub_total_without_tax`) — this is the only meaningful difference in the Hold-payment payload, and it is a deliberate feature addition, not a regression of the CR-003 fix.
- **Where to focus future investigation:** if a real failure is reproducible on `14-may`, focus on (a) the new value of `order_sub_total_without_tax` (delivery-inclusive) and how the backend persists/echoes it, or (b) deployment/build issues that simulate "missing fix" symptoms without an actual code regression.

---

### Appendix — Reproducible commands

```bash
cd /app
git fetch --all --prune

# Topology
git log --oneline origin/main..origin/14-may
git log --oneline origin/14-may..origin/main
git log --oneline origin/main..origin/13-may-bug
git log --oneline origin/13-may-bug..origin/main
git log --oneline origin/14-may..origin/13-may-bug
git log --oneline origin/13-may-bug..origin/14-may

# Full source diff (concise file list)
git diff --name-status origin/14-may origin/main
git diff --name-status origin/13-may-bug origin/14-may

# Per-file confirmation for CR-003 surface
for f in \
  frontend/src/components/reports/CollectBillPanelDrawer.jsx \
  frontend/src/api/services/paymentMutationService.js \
  frontend/src/pages/AllOrdersReportPage.jsx \
  frontend/src/api/socket/socketHandlers.js \
  frontend/src/components/reports/OrderTable.jsx \
  frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx \
  frontend/src/components/reports/PaymentMethodPicker.jsx; do
  echo "$(git diff origin/13-may-bug origin/14-may -- "$f" | wc -l)  $f"
done

# Subtotal hunks (the only relevant code delta)
git diff origin/13-may-bug origin/14-may -- frontend/src/api/transforms/orderTransform.js
git diff origin/13-may-bug origin/14-may -- frontend/src/components/order-entry/CollectPaymentPanel.jsx
```

— End of report.
