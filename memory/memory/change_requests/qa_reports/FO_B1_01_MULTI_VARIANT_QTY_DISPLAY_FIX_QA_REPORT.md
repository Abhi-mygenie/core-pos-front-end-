# FO-B1-01 — Multi-Select Variant Cart-Line Total Fix — QA Report

**Issue:** FO-B1-01 — Cart-line display total after qty +/- dropped multi-select variant price
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-04
**Branch:** `may4`
**Type:** Backlog follow-up; single-file display fix; zero backend dependency
**Plan reference:** `/app/memory/change_requests/impact_analysis/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_PLAN.md` (owner-approved 2026-05-04)
**Sprint context:** `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 row 1
**Original finding:** `/app/memory/change_requests/qa_reports/CR_006_A1_B1_QA_REPORT.md` §FO-B1-01

---

## 1. Final QA Status

**`qa_passed_with_runtime_addendum_pending`**

The fix matches the owner-approved plan byte-for-byte:
- New pure helper `calculateSelectedVariantsPrice` added at module scope of `orderTransform.js` (L379-388).
- The broken inline reduce in `OrderEntry.jsx:615-617` is replaced with a single call to the helper at L619.
- No other file touched; no payload, KOT, bill, print, modal, transform, or backend change.

Static + lint + helper-sanity (20/20 PASS) provide strong correctness evidence for an FE-only display fix. Manual runtime validation (preprod with a real menu item containing priced multi-select variants) is **runtime-blocked** — Mygenie preprod (`https://preprod.mygenie.online/`) is dormant in this environment. Static + lint + 20-case helper sanity is sufficient for a conditional pass; runtime addendum to be appended when preprod wakes.

**Implementation summary file missing:** `/app/memory/change_requests/implementation_summaries/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_SUMMARY.md` was not produced as part of the fix. The plan + this QA report + the verbatim code state cover the same content. Recommendation: either accept this report as the formal record, OR ask the implementation agent to produce the summary file as a separate trivial doc-only step.

**Backend dependency:** **None.** Confirmed — fix is display-only.

---

## 2. Files inspected

| # | File | What was checked | State |
|---|---|---|---|
| 1 | `/app/frontend/src/api/transforms/orderTransform.js` | Helper added at L358-388 (JSDoc + `export const calculateSelectedVariantsPrice`); `buildCartItem` variation handling at L413-442 untouched; `calcOrderTotals` at L544+ untouched | ✅ Matches plan |
| 2 | `/app/frontend/src/components/order-entry/OrderEntry.jsx` | L10 import extended with `calculateSelectedVariantsPrice` (no new import line); L613-619 qty-recompute branch replaces broken inline reduce with helper call (with FO-B1-01 explanatory comment) | ✅ Matches plan |
| 3 | `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` (negative — to confirm not touched) | L100-105 modal-preview shape-aware reduce verified verbatim — untouched | ✅ Untouched |

**Negative confirmations (other files NOT touched, per scope):**
- `CartPanel.jsx`, `CollectPaymentPanel.jsx` — display readers; reading `item.totalPrice` which is now correct upstream
- `printService.js`, `orderService.js`, `paymentMutationService.js` — payload/print services
- `RePrintButton.jsx`, `DashboardPage.jsx` — separate surfaces (CR-007 / CR-008 D1)
- Backend
- All `/app/memory/final/*` baseline docs

---

## 3. Checks run (this QA session)

| # | Check | Tool | Result |
|---|---|---|---|
| C-01 | Static read of `orderTransform.js:358-388` (helper JSDoc + body) | `mcp_view_file` | ✅ Matches plan |
| C-02 | Static read of `orderTransform.js:413-442` (`buildCartItem` variation handling — must be unchanged) | `mcp_view_file` | ✅ Untouched (logic identical to pre-fix L390-403; just shifted by helper insertion) |
| C-03 | Static read of `OrderEntry.jsx:10` (import extension) | `mcp_view_file` | ✅ Matches plan |
| C-04 | Static read of `OrderEntry.jsx:613-619` (qty +/- branch with helper call) | `mcp_view_file` | ✅ Matches plan |
| C-05 | Grep `selectedVariants` across `orderTransform.js` — no extra reductions introduced | `grep` | ✅ 4 hits all expected: L361/L376/L379 (helper docs/sig), L413/L422 (buildCartItem variation block) |
| C-06 | Grep `selectedVariants` / `calculateSelectedVariantsPrice` across `OrderEntry.jsx` | `grep` | ✅ 3 hits: L10 (import), L616 (comment), L619 (call). NO inline `Object.values(item.selectedVariants).reduce(...)` remaining |
| C-07 | `ItemCustomizationModal.jsx:100-105` modal preview unchanged | `sed` | ✅ Identical to pre-fix |
| C-08 | ESLint — `orderTransform.js` | `mcp_lint_javascript` | ✅ No issues |
| C-09 | ESLint — `OrderEntry.jsx` | `mcp_lint_javascript` | ✅ No issues |
| C-10 | Webpack dev-server compile state | tail of `/var/log/supervisor/frontend.out.log` | ✅ `compiled with 1 warning` (only pre-existing `LoadingPage.jsx:111` exhaustive-deps; same baseline as P0–P8) |
| C-11 | Preview URL HTTP status | `curl` | ✅ HTTP 200 |
| C-12 | Helper sanity — 20 edge cases via verbatim source extraction (no copy-paste) | `node -e` reading `orderTransform.js` and `eval`-ing the helper body | ✅ **20 / 20 PASS** (see §4) |

---

## 4. Helper edge cases verified (20 / 20 PASS)

Tests executed against the **verbatim helper source** extracted from `orderTransform.js` (not a re-typed copy — eliminates code-vs-test drift risk).

| ID | Input | Expected | Actual | Result |
|---|---|---|---|---|
| QA-01 | `null` | `0` | `0` | ✅ |
| QA-02 | `undefined` | `0` | `0` | ✅ |
| QA-03 | `{}` | `0` | `0` | ✅ |
| QA-04 | `{ g1: { price: 10 } }` (single-select) | `10` | `10` | ✅ |
| QA-05 | `{ g1: [{ price: 15 }, { price: 10 }] }` (multi-select 2 priced opts — **the bug case**) | `25` | `25` | ✅ |
| QA-06 | `{ g1: [{ price: 5 }, { price: 5 }, { price: 5 }] }` (multi-select 3 priced opts) | `15` | `15` | ✅ |
| QA-07 | `{ g1: [] }` (empty multi group) | `0` | `0` | ✅ |
| QA-08 | `{ g1: null }` (null group entry — re-edit hydration race) | `0` | `0` | ✅ |
| QA-09 | `{ g1: { price: 10 }, g2: [{ price: 5 }, { price: 3 }] }` (mixed single + multi) | `18` | `18` | ✅ |
| QA-10 | `{ g1: { price: '10.50' } }` (string price — defensive coercion) | `10.5` | `10.5` | ✅ |
| QA-11 | `{ g1: { name: 'X' } }` (object missing `price` field) | `0` | `0` | ✅ |
| QA-12 | `'foo'` (primitive string passed by mistake) | `0` | `0` | ✅ |
| QA-13 | `42` (primitive number passed by mistake) | `0` | `0` | ✅ |
| QA-14 | `true` (primitive boolean passed by mistake) | `0` | `0` | ✅ |
| QA-15 | `[{ price: 10 }]` (top-level array — defensive: arrays are objects in JS, helper sums them as if it were a flat group) | `10` | `10` | ✅ |
| QA-16 | `{ spice: [{ price: 15 }, { price: 10 }] }` — **literal FO-B1-01 reproduction case** | `25` | `25` | ✅ |
| QA-17 | `{ prefs: [{ price: 0 }, { price: 0 }] }` (free multi-select preferences — the case where the bug was previously invisible) | `0` | `0` | ✅ |
| QA-18 | `{ g1: { price: -5 } }` (negative price — defensive; allowed because `parseFloat` returns `-5`, not `NaN`) | `-5` | `-5` | ✅ |
| QA-19 | `{ g1: { price: NaN } }` (`NaN` price) | `0` | `0` | ✅ |
| QA-20 | `{ g1: [null, { price: 7 }, undefined, { price: 3 }] }` (multi array with mixed null/undefined entries) | `10` | `10` | ✅ |

Edge-case coverage matrix:
- ✅ Null / undefined / empty inputs (QA-01..QA-03, QA-07, QA-08)
- ✅ Single-select shape (QA-04)
- ✅ Multi-select array shape (QA-05, QA-06, QA-09, QA-16, QA-20)
- ✅ Primitive defensive inputs (QA-12..QA-14)
- ✅ Numeric coercion (QA-10 string, QA-19 NaN)
- ✅ Missing fields (QA-11)
- ✅ Edge / defensive (QA-15 top-level array, QA-18 negative)
- ✅ Mixed shapes (QA-09)
- ✅ Bug reproduction (QA-16)
- ✅ Bug-invisible-under-zero-prices (QA-17)

---

## 5. Expected vs actual — fix delivers what the plan promised

| Requirement (plan §1, §3, §4) | Expected | Actual | Result |
|---|---|---|---|
| Helper sums single-select object prices | `{g:{price:10}} → 10` | QA-04: `10` | ✅ |
| Helper sums multi-select array prices | `{g:[{price:15},{price:10}]} → 25` | QA-05: `25` | ✅ |
| Helper handles null safely | `null → 0` | QA-01: `0` | ✅ |
| Helper handles undefined safely | `undefined → 0` | QA-02: `0` | ✅ |
| Helper handles empty arrays | `{g:[]} → 0` | QA-07: `0` | ✅ |
| Helper handles missing price | `{g:{name:'X'}} → 0` | QA-11: `0` | ✅ |
| Helper handles string price | `{g:{price:'10.50'}} → 10.5` | QA-10: `10.5` | ✅ |
| Helper handles malformed (NaN, primitive, null entries) | `0` (no throws) | QA-12..QA-14, QA-19, QA-20: all `0` or correct sum | ✅ |
| OrderEntry qty +/- now uses helper | Single call site at L619 | Confirmed via grep — no other inline reduce remains | ✅ |
| Outbound payload `variation_amount` unchanged | `buildCartItem` L413-442 untouched | Verified — code byte-identical to pre-fix L390-403 logic | ✅ |
| Outbound payload shape unchanged | No transform contract change | `buildCartItem` returns same object shape; `calcOrderTotals` reads `_fullUnitPrice` (set inside `buildCartItem`, not from `item.totalPrice`) | ✅ |
| Modal selection behaviour unchanged | `ItemCustomizationModal.jsx:100-105` untouched | Verified verbatim | ✅ |
| KOT / bill / print untouched | `printService.js`, `orderService.js`, `RePrintButton.jsx` not in fix scope | Confirmed via grep | ✅ |
| Collect Bill totals math unchanged | `CollectPaymentPanel.jsx`, `calcOrderTotals` not in fix scope | Confirmed | ✅ |

---

## 6. Regression surfaces checked

### 6.1 Sprint surfaces (P0–P8)

| Surface | Why safe |
|---|---|
| CR-001 audit columns | OrderTable / reports surface — different file tree |
| CR-003 row actions | Payment mutation service untouched |
| CR-004 Phase 1 + Phase 2 A/B/C — Room Reports | Separate component tree (`RoomOrdersReportPage`, `RoomRowCard`) |
| CR-005 #1 / B2-split — PG columns | Different file (`OrderTable.jsx`); orthogonal |
| CR-006 A1 (variation optional) | Helper handles `{}` (no variants chosen) → 0 — same as previous behaviour |
| **CR-006 B1 (multi-select variation)** | Helper FIXES the previously-broken qty +/- display path; outbound payload still uses `buildCartItem`'s correct array-aware reduce — unchanged |
| CR-007 / A2 (chip + Print Bill) | OrderEntry edits are at L10 import + L613-619 qty branch; A2 edits are at L1025-1033 and L1691-1693 — physically distant, no overlap |
| CR-008 Sub-CR #1 (delivery-charge + override gate) | OrderEntry delivery-charge state at L165 + payload fold at orderTransform L735/789 — outside fix scope; payload contract preserved |
| CR-008 #4 Phase A / D1 (stay-on-order) | OrderEntry edits at L1426 / L1546 (Pay-success branches); fix is at L613-619 (qty branch) — disjoint |
| A0a UI-COD-MASK | Different file (`OrderTable.jsx`) |
| A0b ROLE-NAME-WIRE-FIX | Different concerns (wire `role_name`); 6/6 unit tests of A0b unaffected |

### 6.2 Sibling/parked items (must remain parked / untouched)

| Item | Status |
|---|---|
| B3 / BE-V item-level `cancel_by_name` | ✅ NOT touched; pre-existing `Employee #<cancel_by>` fallback at `reportTransform.js:625-626` unchanged |
| B2 Phase 2 / BE-W2 | ✅ NOT touched |
| CR-008 #4 Phase B / BE-F | ✅ NOT touched |
| All BE-1..BE-W2 backend asks | ✅ Still parked |
| `/app/memory/final/*` baseline docs | ✅ Untouched |

### 6.3 Existing OrderEntry flows (regression-clean by static inspection)

The fix is INSIDE the `if (item.totalPrice !== undefined && item.totalPrice !== null)` guard at L613. Plain items (no customisation) skip this branch entirely and continue to use the simple `{ ...item, qty: newQty }` return at L628 — display fallback `item.price * item.qty` (CartPanel) or transform path (payloads) handles them correctly. **No behaviour change for plain items, single-variant items, addon-only items, or addons-with-single-variant items.**

| Flow | Regression risk |
|---|---|
| Place order (without pay) | None — different code path |
| Place + Pay | None — different code path; `_fullUnitPrice` route unaffected |
| Update order (delta cart on placed item) | None — `buildCartItem` payload-side path unchanged |
| Cancel item / Cancel order | None — different code paths |
| Transfer / Merge / Shift | None |
| Complimentary toggle | None — different code path |
| Re-edit from cart (modal reopens) | None — modal reads `item.selectedVariants` which is unchanged; modal's own preview calc untouched |
| BUG-PREPAID-MERGE-SHIFT (CR-007 A2 fold) | None |
| BUG-270 (prepaid Merge/Shift gate) | None |

---

## 7. Runtime-blocked items (live preprod manual flows)

Mygenie preprod is dormant in this environment. The following items are **runtime-blocked**, NOT failed. Static + helper sanity (20 / 20) is sufficient for conditional pass — display-only single-line fix with no payload, no transform, no contract change.

| # | Scenario | Anchor (plan §5.1 / §5.2) | Status |
|---|---|---|---|
| RB-01 | Add plain item (no variation), `+/−` works → cart-line total = `price × qty` | Plan §5.1 #1 | runtime-blocked |
| RB-02 | Add single-variation item, `+/−` keeps correct cart-line total | Plan §5.1 #2 | runtime-blocked |
| RB-03 | **Add multi-select item with 2+ priced variants, `+/−` keeps correct cart-line total** (THE FIX) | Plan §5.1 #3 | runtime-blocked — covered statically by QA-05/QA-06/QA-16/QA-20 |
| RB-04 | Add optional skipped variation (CR-006 A1), `+/−` works | Plan §5.1 #4 | runtime-blocked |
| RB-05 | Re-edit item from cart, multi-select selections persist | Plan §5.1 #5 | runtime-blocked — modal untouched, behaviour unchanged |
| RB-06 | Mixed cart (plain + single + multi) — each line correct independently | Plan §5.1 #6 | runtime-blocked |
| RB-07 | Place + Pay with multi-select cart — DevTools Network → outbound `variation_amount` matches displayed total | Plan §5.2 #7 | runtime-blocked — payload integrity already verified statically (`buildCartItem` unchanged) |
| RB-08 | Collect Bill on existing order with multi-select item | Plan §5.2 #8 | runtime-blocked |
| RB-09 | KOT print payload contains all multi-select labels | Plan §5.2 #9 | runtime-blocked |
| RB-10 | Bill print payload | Plan §5.2 #10 | runtime-blocked |
| RB-11 | CollectPaymentPanel per-line ₹ matches Cart-panel ₹ | Plan §5.2 #11 | runtime-blocked — both surfaces read corrected `item.totalPrice` |

**Recommended runtime walk** (≤ 5 minutes when preprod wakes):
1. Pick a menu item with multi-select variation group containing **at least one priced variant** (≥ ₹1).
2. In the modal, tick **2+** priced variants. Note the modal preview total (e.g. ₹125 = base ₹100 + ₹15 + ₹10).
3. Add to cart at qty 1 → cart line should show ₹125.
4. Click `+` → cart line should show ₹250 (was ₹200 pre-fix).
5. Click `−` back to 1 → cart line should show ₹125 (was ₹100 pre-fix).
6. (Optional) Open DevTools Network, click Place Order → confirm `variation_amount = 25` per item, `order_amount` matches cart total.

---

## 8. Implementation summary file status

**MISSING:** `/app/memory/change_requests/implementation_summaries/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_SUMMARY.md`

The summaries folder currently contains only the original CR-001 / CR-003 / CR-004 summaries. The FO-B1-01 fix did not produce a paired summary file. Two valid resolutions:

1. **(Preferred)** Accept this QA report + the plan at `impact_analysis/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_PLAN.md` as the formal record. The plan documents intent, the QA report documents shipped state and verification.
2. Ask the implementation agent to produce the trivial summary doc (≈ 30 lines: files changed + diff stat + verification checklist).

This QA report does NOT block on the missing summary — it is a documentation-hygiene preference, not a correctness gate.

---

## 9. Final recommendation

1. **Accept FO-B1-01 fix as `qa_passed_with_runtime_addendum_pending`.** All 20 helper edge cases pass against the verbatim production source; both files lint clean; webpack at baseline; preview URL up; payload-side `buildCartItem` byte-identical; modal untouched.

2. **Move FO-B1-01 from BACKLOG to RESOLVED.** Backlog Register entry should be reclassified:
   - From: `backlog_follow_up` (in `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 row 1)
   - To: `accepted_with_runtime_addendum_pending`
   - Reason: Fix shipped, QA-validated statically, runtime sweep is additive.

3. **Append runtime addendum to this report when preprod wakes.** ~5-minute walk per §7. No further code change anticipated; if runtime walks reveal any unexpected display drift, escalate per the standard bug-template path.

4. **No regression** on:
   - CR-006 A1 (optional variation) — empty `{}` input still resolves to 0
   - **CR-006 B1 (multi-select variation)** — display now matches modal preview AND outbound payload (the original FO-B1-01 was internal display drift; both wire paths were already correct)
   - CR-007 / A2 — physically distant code in same file; no overlap
   - CR-008 Sub-CR #1 / D1 / A0a / A0b / CR-001..CR-005 — different files / different surfaces

5. **B3 / BE-V item-level `cancel_by_name` REMAINS PARKED.** Confirmed — fix did not touch `cancel_by_name`, did not introduce client-side synthesis, did not weaken the pre-existing `Employee #<cancel_by>` fallback. Same parking statement as A0b P8 §11.

6. **Optional missing-summary observation** — see §8. Non-blocking.

7. **STOP per task instructions.** Not proceeding to any other backlog item.

---

## 10. Artifacts / Log References

| Artifact | Path / Evidence |
|---|---|
| ESLint results | Inline §3 — clean on `orderTransform.js` and `OrderEntry.jsx` |
| Helper sanity output | Inline §4 — 20 / 20 PASS, eval'd against verbatim source |
| Webpack log | `/var/log/supervisor/frontend.out.log` → `compiled with 1 warning` (`LoadingPage.jsx:111` pre-existing baseline only) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → HTTP 200 |
| Preprod state | `https://preprod.mygenie.online/` — dormant; runtime walk classified `runtime-blocked` |
| Plan reference | `/app/memory/change_requests/impact_analysis/FO_B1_01_MULTI_VARIANT_QTY_DISPLAY_FIX_PLAN.md` |
| Files inspected (absolute paths) | `/app/frontend/src/api/transforms/orderTransform.js` (L353-388 helper, L413-442 buildCartItem variation block, L544+ calcOrderTotals); `/app/frontend/src/components/order-entry/OrderEntry.jsx` (L10 import, L613-619 qty +/- branch); `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` (L100-105 negative — untouched) |

— End of FO-B1-01 QA Report —
