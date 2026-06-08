# FO-B1-01 Implementation Summary — Multi-Select Variant Cart-Line Display Total After Qty +/−

## Status
- `qa_passed_with_runtime_addendum_pending`
- Resolved follow-up (originated as a non-blocking backlog item from CR-006 P3; fix shipped 2026-05-04).
- Runtime preprod walk pending — additive only; does not gate acceptance.

## Issue
- **ID:** FO-B1-01
- **Title:** Multi-select variant cart-line display total drops variant price after qty +/−
- **Severity:** Minor (display only; outbound payload / KOT / bill / backend totals remain correct)
- **Source:** `/app/memory/change_requests/qa_reports/CR_006_A1_B1_QA_REPORT.md` §FO-B1-01 (P3, 2026-05-03)
- **Sprint context pointer:** `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 row 1

## Source Documents
- Plan (owner-approved 2026-05-04): `/app/memory/change_requests/impact_analysis/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_PLAN.md`
- QA report (this fix): `/app/memory/change_requests/qa_reports/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_QA_REPORT.md`
- Originating finding: `/app/memory/change_requests/qa_reports/CR_006_A1_B1_QA_REPORT.md` §FO-B1-01
- QA index: `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md` (row added 2026-05-04)

## Original QA finding (verbatim scope)
On cart-line qty +/− for an item that used **multi-select** variant groups (e.g. Spice = Mild + Medium, both priced), the recomputed `item.totalPrice` silently dropped the multi-select variant contribution. Cart-panel and Collect-Bill per-line ₹ readers then showed a reduced figure. Outbound payload `variation_amount`, `order_amount`, KOT, bill, and backend-charged totals were already correct — bug was confined to the in-memory cart item's display `totalPrice`.

## Root cause
The inline reducer in the qty +/− recompute branch of `OrderEntry.jsx` (pre-fix L615-617) treated **every** entry of `item.selectedVariants` as a single option object:

```javascript
const variantsPrice = item.selectedVariants
  ? Object.values(item.selectedVariants).reduce((s, opt) => s + (parseFloat(opt?.price) || 0), 0)
  : 0;
```

For a multi-select group, `selectedVariants[groupId]` is an **array** of option objects (`[{price:15}, {price:10}]`). The reducer called `parseFloat(opt?.price)` on the array itself (which yields `NaN → 0`), and the array's prices were silently dropped. Two correct shape-aware implementations already existed in the codebase (`ItemCustomizationModal.jsx:100-105` modal preview, and `orderTransform.js:390-403` outbound `variation_amount` calc), but neither was reused on the OrderEntry qty +/− path.

## Files Modified
| File | Change Summary | Reason |
|---|---|---|
| `/app/frontend/src/api/transforms/orderTransform.js` | Added new exported pure helper `calculateSelectedVariantsPrice` at L358-388 (module scope, above `buildCartItem`). Helper is shape-aware: returns `0` for `null`/`undefined`/non-object/empty, sums single-object prices, sums multi-select array prices, defensively coerces string prices via `parseFloat`, and returns `0` for malformed entries (NaN, missing `price` field, null array entries). `buildCartItem` variation handling at L413-442 (post-insertion line numbers) is **byte-identical** to the pre-fix L390-403 logic — not routed through the helper. | Centralise shape-aware variant-price math as a reusable helper to eliminate the display/payload drift. Payload path intentionally left untouched per plan §4.4 (no refactor in FO-B1-01 scope). |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Extended the existing `orderTransform` named-import at L10 to add `calculateSelectedVariantsPrice` (no new import line). Replaced the broken inline reducer at L615-617 with a single helper call at L619, flanked by a 3-line explanatory comment (L615-618) citing FO-B1-01 and the two mirrored implementations. | Single call-site replacement — fix is confined to the qty +/− recompute branch guarded by `if (item.totalPrice !== undefined && item.totalPrice !== null)` at L613. Plain items (no customisation) still skip this branch entirely and continue to use the `{ ...item, qty: newQty }` return at L628. |

**Net diff:** ~26 lines added (helper + JSDoc + comment), 3 lines replaced (inline reducer → helper call), 0 lines deleted from prior correct logic.

## Exact behaviour — before fix
For a cart item customised with multi-select variants (e.g. base ₹100 + Spice = Mild ₹15 + Medium ₹10, modal-computed total ₹125):

| Action | Displayed cart-line ₹ | Expected | Backend-charged total |
|---|---|---|---|
| Add to cart at qty 1 (from modal) | ₹125 | ₹125 | ₹125 (correct; set by modal's own correct calc) |
| Click `+` → qty 2 | **₹200** (drops ₹15 + ₹10) | ₹250 | ₹250 (correct; payload uses transform's own calc) |
| Click `−` → qty 1 | **₹100** (drops ₹15 + ₹10) | ₹125 | ₹125 (correct) |

Cashier-visible screen figure diverged from what the customer was actually charged.

## Exact behaviour — after fix
| Action | Displayed cart-line ₹ | Backend-charged total |
|---|---|---|
| Add to cart at qty 1 | ₹125 | ₹125 |
| Click `+` → qty 2 | ₹250 | ₹250 |
| Click `−` → qty 1 | ₹125 | ₹125 |

Display now matches both the modal preview and the outbound payload. Covered statically by QA §4 (20 / 20 helper edge cases including QA-05 two-variant bug case, QA-06 three-variant case, QA-16 literal FO-B1-01 reproduction, QA-20 mixed null/undefined array entries).

## Helper added
**Name:** `calculateSelectedVariantsPrice(selectedVariants)`
**Location:** `/app/frontend/src/api/transforms/orderTransform.js:358-388` (module scope, exported, pure; above `buildCartItem` definition)
**Signature:** `(Object|null|undefined) → number`
**Contract:**
- `null` / `undefined` / non-object input → `0`
- `{}` (empty) → `0`
- `{ g1: null }` → `0`
- `{ g1: { price: 10 } }` (single-select) → `10`
- `{ g1: [{ price: 15 }, { price: 10 }] }` (multi-select) → `25`
- `{ g1: [] }` → `0`
- `{ g1: { price: '10.50' } }` (string coercion) → `10.5`
- `{ g1: { name: 'X' } }` (missing `price`) → `0`
- Mixed single + multi groups → correctly summed across both shapes

Helper mirrors the two pre-existing correct implementations (`ItemCustomizationModal.jsx:100-105` modal preview and `orderTransform.js` `buildCartItem` L413-442 outbound variation amount). The plan explicitly defers migrating those two sites to the helper (DRY cleanup) to a separate future ticket per plan §4.4 — FO-B1-01 scope is confined to the display-only fix.

## Why payload, KOT, bill, backend totals, Collect Bill, and modal behaviour are unaffected
- **Outbound payload `variation_amount` / `order_amount` / `order_sub_total_amount` / `tax_amount` / `gst_tax` / `vat_tax` / `round_up` / `service_tax`** → computed inside `orderTransform.buildCartItem` (L413-442) and `calcOrderTotals` (L544+) directly from `item.selectedVariants` with the correct shape-aware `Array.isArray(sel) ? sel : [sel]` normalisation. Payload paths never read the corrupted `item.totalPrice`. `buildCartItem` body is byte-identical to the pre-fix version (only shifted down by the helper insertion above it). Verified in QA §3 C-02 and §5 Requirement "Outbound payload `variation_amount` unchanged".
- **`_fullUnitPrice`** (used by `calcOrderTotals`) → set inside `buildCartItem`, not from `item.totalPrice`. Unchanged.
- **Update-order payload** → same transform path. Unchanged.
- **Collect-Bill payload** (CR-008 Sub-CR #1 D1-Cap delivery-charge fold preserved) → transform path. Unchanged.
- **KOT print payload** → built from `item.selectedVariants` directly by `printService` / `orderService`. Not in fix scope; not touched.
- **Bill print payload** → same. Not touched.
- **Backend-computed final billed total** → backend-derived from payload; unaffected.
- **Collect Bill on-screen per-line ₹** (`CollectPaymentPanel.getItemLinePrice` at L162-174) → reads `item.totalPrice` first; now that the writer (qty +/− branch in OrderEntry) produces the correct value, downstream display automatically picks up the fix with **zero code change**. No edits to `CollectPaymentPanel.jsx`.
- **Cart-panel display** (`CartPanel.jsx` L159 + L235) → same; reader of `item.totalPrice`; picks up fix automatically.
- **Modal preview total** (`ItemCustomizationModal.jsx:100-105`) → untouched. Modal's own shape-aware calc continues to operate as before.
- **Modal selection behaviour** (single toggle vs multi toggle at L117-130) → untouched.
- **Re-edit item from cart** → modal reopens with `item.selectedVariants` unchanged; modal's own preview uses its own untouched calc.

## QA report pointer
Full QA verification in `/app/memory/change_requests/qa_reports/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_QA_REPORT.md`.

Highlights:
- Static + lint + webpack baseline (C-01..C-11 in QA §3) all pass
- **20 / 20 helper edge cases PASS** (QA §4), eval'd against the verbatim production source (no copy-paste drift)
- Negative confirmation: modal, transform variation block, CartPanel, CollectPaymentPanel, printService, orderService all verified **untouched**
- Regression-clean against CR-006 A1/B1, CR-007 A2, CR-008 Sub-CR #1, CR-008 #4 Phase A / D1, CR-005 #1 / B2-split Phase 1, CR-001, CR-003, CR-004, A0a, A0b
- Zero backend dependency

## Final QA Status
**`qa_passed_with_runtime_addendum_pending`**

Static + lint + 20-case helper sanity is sufficient for a conditional pass per the established P0–P8 conditional-pass pattern. The fix is a single-call-site display-only correction on an FE-only path; no payload contract, no transform contract, no financial math, no new state, no new endpoint.

## Runtime addendum — pending
Mygenie preprod (`https://preprod.mygenie.online/`) was dormant at QA time. Eleven runtime items (RB-01..RB-11 in QA §7) are `runtime-blocked`, NOT failed. Recommended ~5-minute preprod walk when preprod wakes:
1. Pick a menu item with a multi-select variation group containing ≥ 1 priced variant (≥ ₹1).
2. In the modal, tick 2+ priced variants; note the modal preview total (e.g. ₹125 = ₹100 + ₹15 + ₹10).
3. Add to cart at qty 1 → cart line should show ₹125.
4. Click `+` → cart line should show ₹250 (was ₹200 pre-fix).
5. Click `−` back to 1 → cart line should show ₹125 (was ₹100 pre-fix).
6. Optional: DevTools Network → Place Order → confirm `variation_amount = 25` per item, `order_amount` matches cart total.

On successful walk, append a short runtime addendum to the QA report (§7 checklist). If an unexpected display drift surfaces, escalate per the standard bug-template path. No further code change anticipated.

## Risks / caveats
- **LOW risk.** ~26 net lines added, 3 lines replaced, zero deletion of prior correct logic. No payload, transform, or financial-math change. No new state, dep, socket, endpoint, localStorage key.
- Pure function helper is trivially testable.
- Fix converges OrderEntry's qty +/− path with the two existing correct implementations (modal + transform), reducing the number of variant-price-summing sites from 3 (2 correct + 1 broken) to 3 (3 correct, one being the new helper). Plan §4.4 explicitly defers the optional DRY migration of the other two inline sites — out of scope for FO-B1-01.
- Preprod-runtime walk still pending; classified `runtime-blocked`, not failed. No regression evidence expected given the static coverage.
- No unit test added in this ticket (TEST-INFRA-001 / `@testing-library/react` still parked); plan §5.5 noted that a pure-Jest test for the helper is feasible without that dep, but kept out of scope per the owner-approved plan.

## Anything NOT changed (explicit negative scope)
- ❌ `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` — modal preview calc L100-105 and selection toggle L117-130 untouched
- ❌ `orderTransform.buildCartItem` variation block (L413-442 post-insertion) — byte-identical to pre-fix L390-403 logic
- ❌ `orderTransform.calcOrderTotals` (L544+) — not touched
- ❌ `CartPanel.jsx` render — reads `item.totalPrice` only; fixed at writer side
- ❌ `CollectPaymentPanel.getItemLinePrice` — not touched
- ❌ `printService.js`, `orderService.js`, `paymentMutationService.js` — not touched
- ❌ `RePrintButton.jsx`, `DashboardPage.jsx` — unrelated surfaces (CR-007 / CR-008 D1)
- ❌ Backend (no endpoint change, no payload contract change, no field rename, no schema change)
- ❌ Any other OrderEntry flow — Place Order without Pay, Place + Pay, Update Order, Cancel item / Cancel order, Transfer / Merge / Shift, Complimentary toggle, Dynamic-price, Delivery-charge capture (CR-008 Sub-CR #1), Stay-on-Order-Entry (CR-008 #4 Phase A), Order ID chip + Print Bill (CR-007 A2)
- ❌ CR-006 A1 (optional variation) — empty `{}` input still resolves to `0` (QA-03)
- ❌ CR-006 B1 (multi-select variation) — modal preview + outbound payload already correct; fix only closes the display drift on the qty +/− path
- ❌ A0a UI-COD-MASK — different file tree
- ❌ A0b ROLE-NAME-WIRE-FIX — different concerns; 6/6 unit tests unaffected
- ❌ B3 / BE-V item-level `cancel_by_name` — **remains PARKED**; fix did not touch `cancel_by_name`, did not introduce client-side synthesis, did not weaken the pre-existing `Employee #<cancel_by>` fallback at `reportTransform.js:625-626`
- ❌ All parked backend asks (BE-1..BE-W2, BE-A, BE-F, BE-T, BE-V) — still parked
- ❌ All other parked CR/bucket items (A3, A4, B2 Phase 2, CR-002, CR-008 Sub-CR #3, CR-008 #4 Phase B, CR-009, CR-010, CR-011, CR-012, CR-013, B4) — still parked
- ❌ `/app/memory/final/*` baseline docs — UNCHANGED

## Sprint registry impact
- `QA_REPORT_INDEX.md` — FO-B1-01 row added 2026-05-04 (pointer to QA report + status)
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — FO-B1-01 reclassified from backlog → resolved follow-up (§7 row 1 updated; §1.2 backlog count decremented; §3.2 row 7 + §4.1 row 6 wording updated)
- No change to baseline docs or any unrelated backlog row

— End of FO-B1-01 Implementation Summary —
