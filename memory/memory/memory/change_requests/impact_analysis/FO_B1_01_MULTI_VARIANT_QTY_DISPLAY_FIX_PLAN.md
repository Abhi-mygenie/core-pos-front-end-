# FO-B1-01 — Multi-Select Variant Price Drops on Cart Qty +/- — Implementation Plan

**Issue ID:** FO-B1-01
**Severity:** Minor (display-only)
**Priority:** Backlog (non-blocking; sprint already accepted)
**Source:** CR-006 P3 QA report (`/app/memory/change_requests/qa_reports/CR_006_A1_B1_QA_REPORT.md`) — sole non-blocking finding
**Sprint context:** `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 row 1
**Plan author:** Implementation Planning Agent
**Plan date:** 2026-05-04
**Branch:** `may4`
**Status:** **Awaiting owner approval — no code changes applied yet**

---

## 1. Issue summary

When the user customises an item with **multi-select variations** (e.g. two Spice levels picked together), then increments / decrements the cart-line quantity using the +/- buttons, the cart-line total drops the multi-select variant price contribution.

The user-visible symptom: cart row total reverts to `(basePrice + addonsPrice) × newQty`, omitting the variant contribution. On a cart with multiple lines, the cart subtotal/total displayed in the Cart panel and (downstream) the Collect Bill panel will also show the reduced figure.

The **outbound payload, KOT, bill, and backend-charged total remain correct** — the bug is confined to display state on the in-memory cart item.

---

## 2. Files inspected

| # | File | Lines | Role |
|---|---|---|---|
| 1 | `/app/frontend/src/components/order-entry/OrderEntry.jsx` | 608-628 (qty +/- recompute), 615-617 (broken calc) | **Source of bug** |
| 2 | `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` | 7-14 (shape contract), 100-105 (correct calc), 117-120 (selection toggle) | Reference for correct shape-aware sum |
| 3 | `/app/frontend/src/api/transforms/orderTransform.js` | 378-445 (variation_amount math), 493-499 (`_fullUnitPrice`), 512-568 (`calcOrderTotals`) | Confirms payload path is independent of `item.totalPrice` |
| 4 | `/app/frontend/src/components/order-entry/CartPanel.jsx` | 159, 235 | Cart-line display reads `item.totalPrice` |
| 5 | `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 162-174 (`getItemLinePrice`) | Reads `item.totalPrice` first; falls back to recomputation from `item.variation` (response-shape) |

### 2.1 All places where `selectedVariants` price is calculated

| Location | Handles single object? | Handles multi-select array? | Status |
|---|---|---|---|
| `OrderEntry.jsx:615-617` (qty +/- recompute) | Yes | **No** — treats every entry as single object | **BROKEN** — sole cause of FO-B1-01 |
| `ItemCustomizationModal.jsx:100-105` (modal preview total) | Yes | Yes — explicit `Array.isArray(sel)` branch | Correct |
| `orderTransform.js:390-403` (outbound `variation_amount`) | Yes | Yes — `Array.isArray(sel) ? sel : [sel]` normalisation | Correct |

### 2.2 Whether a reusable helper already exists

**No reusable helper exists today.** Two correct implementations live inline (modal + transform); one broken implementation lives inline (OrderEntry). The task brief explicitly suggests creating one — see §4.

### 2.3 Whether qty +/- is the only broken path

**Yes.** `OrderEntry.jsx:615-617` is the only place in the frontend that sums `selectedVariants` without handling the multi-select array shape. Every other consumer either uses the modal's correct calc (during initial add-to-cart) or the transform's correct calc (for outbound payload + financial totals).

### 2.4 Possible shapes of `item.selectedVariants`

Established by:
- `ItemCustomizationModal.jsx:7-14` (shape contract docstring)
- `orderTransform.js:381-403` (consumer behaviour)
- `ItemCustomizationModal.jsx:117-130` (selection toggle for multi vs single)

| Top-level | Per-group entry | Source |
|---|---|---|
| `undefined` / `null` | n/a | Non-customised items (skips qty +/- recompute branch via `totalPrice` guard at OrderEntry.jsx:613) |
| `{}` (empty object) | n/a | Customised item with NO variants chosen (e.g. only addons selected) |
| `{ groupId: option }` | single option **object** `{ id, name, price, ... }` | single-select group |
| `{ groupId: [option1, option2, ...] }` | option **array** | multi-select group |
| `{ groupId: [] }` | empty array | optional multi group with zero selections |
| `{ groupId: null }` | null | edge / re-edit hydration race |
| `{ groupId: { ... } }` (no `price` field) | malformed object | defensive only |

The shape per group is determined by `group.type` (`'single'` vs `'multi'`); shapes are never mixed within a single group entry.

---

## 3. Impact analysis

### 3.1 Why the issue is display-only

The wire payload's **`variation_amount`** and per-line **`_fullUnitPrice`** are computed inside `orderTransform.buildCartItem` at L381-403 directly from `item.selectedVariants` using the correct shape-aware reduction (`Array.isArray(sel) ? sel : [sel]`). They are **independent** of the broken `item.totalPrice` field that OrderEntry's qty +/- corrupts.

`calcOrderTotals` (orderTransform.js:512-568) sums `_fullUnitPrice * quantity` (L524) for every cart line — never reads `item.totalPrice`. Therefore:

| Backend-bound surface | Reads `item.totalPrice`? | Correct today? |
|---|---|---|
| Place-order payload `variation_amount` per item | No | ✅ |
| Place-order payload `order_sub_total_amount`, `order_amount`, `tax_amount`, `gst_tax`, `vat_tax`, `round_up`, `service_tax` | No | ✅ |
| Update-order payload | No | ✅ |
| Collect-Bill payload (D1-Cap delivery-charge fold preserved) | No | ✅ |
| KOT print payload | No | ✅ |
| Bill print payload | No | ✅ |
| Backend-computed final billed total | No (backend-derived) | ✅ |

### 3.2 Display surfaces that DO read `item.totalPrice`

| Display surface | File | Line(s) | Effect of bug |
|---|---|---|---|
| Cart-line per-line price column | `CartPanel.jsx` | 159 | Drops variant contribution after qty +/- |
| Cart-line total (rightmost ₹) | `CartPanel.jsx` | 235 | Same — display drops variant contribution |
| Cart subtotal / total displayed in panel | aggregated from line totals | — | Same propagation |
| Collect Bill per-item display | `CollectPaymentPanel.jsx` | 163 (`getItemLinePrice`) | If user opens Collect Bill from a cart that's been qty +/-'d, the displayed line total here is also incorrect — falls through `if (item.totalPrice) return item.totalPrice;`. Backend payload remains correct. |

**Net visible impact:** the cashier sees a lower line/subtotal/total figure on screen than what is actually charged via the backend. This can cause confusion at the till but does NOT change what the customer pays.

### 3.3 Which file and function should change

**Single file change:** `/app/frontend/src/components/order-entry/OrderEntry.jsx` lines 615-617 (qty +/- recompute branch).

**Single helper addition:** `/app/frontend/src/api/transforms/orderTransform.js` — add a small exported pure function `calculateSelectedVariantsPrice(selectedVariants)` near the existing `buildCartItem` (around line 376, before the variation handling block).

### 3.4 Files / surfaces that must NOT change

- ❌ `ItemCustomizationModal.jsx` — its inline calc at L100-105 is already correct; refactor would expand scope
- ❌ `orderTransform.buildCartItem` variation handling at L381-403 — already correct; do not touch
- ❌ `orderTransform.calcOrderTotals` at L512-568 — order-level financial math; do not touch
- ❌ `CartPanel.jsx` render — only consumes `item.totalPrice`; fix at the writer side, not the reader
- ❌ `CollectPaymentPanel.getItemLinePrice` — same; fix upstream
- ❌ Any modal selection behaviour
- ❌ Any KOT, bill, print, or socket flow
- ❌ Outbound payload shape (`variation_amount`, `selectedVariants`, `variation`)
- ❌ Backend
- ❌ Any other `OrderEntry.jsx` flow (place-order, place+pay, collect-bill-on-existing, cancel, transfer, merge, shift, complimentary toggle, dynamic-price)
- ❌ CR-007 / A2 surfaces (chip, Print Bill button)
- ❌ CR-008 #4 / D1 stay-on-order-entry branches
- ❌ CR-008 Sub-CR #1 delivery-charge / override-gate
- ❌ A0a / A0b surfaces

### 3.5 Risk level

**LOW.**

- Change footprint: ~10 lines added (helper) + 1-line site replacement (OrderEntry qty path).
- No payload, transform, or financial-math change.
- No new state, no new dep, no new socket, no new endpoint, no new localStorage key.
- The replaced calc converges with the two existing correct calcs (modal + transform), reducing inconsistency.
- Pure function helper is trivially testable.

### 3.6 Regression surfaces

| Surface | Why safe |
|---|---|
| Plain item (no variation) qty +/- | Fix lives **inside** the existing `if (item.totalPrice !== undefined && item.totalPrice !== null)` guard at L613; plain items skip this branch entirely |
| Single-variant item qty +/- | Helper handles single object case identically to current code |
| Multi-select variant item qty +/- | **Bug fixed** — helper handles array case |
| Optional skipped variant qty +/- | Helper returns 0 for empty / null entries |
| Re-edit item from cart | Modal's own calc untouched; cart-side recompute uses helper |
| Outbound payload after qty +/- | Transform's own variation calc untouched; helper is NOT called from transform |
| Collect Bill totals | Payload-derived; unaffected by helper |
| KOT / bill print | Payload-derived; unaffected |
| CR-006 A1 (optional variation) | Helper returns 0 when no variant chosen — same as current behaviour for that case |
| CR-006 B1 (multi-select variation) | **Display now matches payload** |
| CR-007 A2 (chip + Print Bill) | Different render path; untouched |
| CR-008 D1 (stay-on-order) | Different code path (Pay-success branches); untouched |

---

## 4. Implementation plan

### 4.1 Step 1 — Add helper to `orderTransform.js`

**File:** `/app/frontend/src/api/transforms/orderTransform.js`
**Location:** Just above `buildCartItem`'s variation handling block (around line 376), or in the file's small-helper section if one exists. The helper must be `export const`.

**Proposed helper:**

```javascript
/**
 * FO-B1-01 (May-2026): Sum prices across selectedVariants regardless of shape.
 *
 * Each entry in selectedVariants[groupId] is either:
 *   - a single option object       (single-select group): { price, ... }
 *   - an array of option objects   (multi-select group):  [{ price, ... }, ...]
 * Plus defensive cases:            null / undefined / empty array / malformed object.
 *
 * Returns 0 for any null/undefined/empty/malformed input.
 *
 * Mirrors the shape-aware logic already in:
 *   - ItemCustomizationModal.jsx:100-105 (modal preview)
 *   - this file's buildCartItem at L390-403 (outbound variation_amount)
 *
 * Display-only consumer: OrderEntry.jsx qty +/- recompute (cart-line totalPrice).
 * Outbound payload paths must continue to use buildCartItem's own calc — DO NOT
 * route them through this helper; payload contract is already correct.
 *
 * @param {Object|null|undefined} selectedVariants - { [groupId]: option | option[] }
 * @returns {number} sum of option.price across all groups; 0 if no input
 */
export const calculateSelectedVariantsPrice = (selectedVariants) => {
  if (!selectedVariants || typeof selectedVariants !== 'object') return 0;
  return Object.values(selectedVariants).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) {
      return sum + sel.reduce((s, opt) => s + (parseFloat(opt?.price) || 0), 0);
    }
    return sum + (parseFloat(sel?.price) || 0);
  }, 0);
};
```

**Notes:**
- `parseFloat(...) || 0` mirrors the **OrderEntry.jsx:616** safety net (the modal currently uses `opt?.price || 0` without `parseFloat` — using `parseFloat` here is strictly safer and matches the existing OrderEntry behaviour).
- Top-level guard `!selectedVariants || typeof !== 'object'` handles `null`, `undefined`, primitive accidental input.
- Per-entry guard `!sel` handles `null` / `undefined` group entries.
- Empty array `[]` reduces to 0 (sum identity).
- Object without `price` field reduces to 0 (NaN → `|| 0`).

### 4.2 Step 2 — Use helper in `OrderEntry.jsx`

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`

**Edit 1 (top of file, alongside existing transform import — verify existing import line first):**

```javascript
// At the top, near other transform imports
import { calculateSelectedVariantsPrice } from "../../api/transforms/orderTransform";
```

(If `orderTransform` is already imported under a different alias such as `orderToAPI`, prefer extending that import to add `calculateSelectedVariantsPrice` as a named export — keeps imports minimal.)

**Edit 2 (qty +/- recompute branch, lines 615-617):**

Replace:
```javascript
const variantsPrice = item.selectedVariants
  ? Object.values(item.selectedVariants).reduce((s, opt) => s + (parseFloat(opt?.price) || 0), 0)
  : 0;
```

With:
```javascript
// FO-B1-01 (May-2026): Use shape-aware helper. Multi-select groups store
// selectedVariants[groupId] as an option array; the prior inline reduce treated
// every entry as a single object and silently dropped multi-select prices.
// Helper mirrors ItemCustomizationModal.jsx:100-105 + orderTransform.js:390-403.
const variantsPrice = calculateSelectedVariantsPrice(item.selectedVariants);
```

### 4.3 Step 3 — Lint + smoke

- `mcp_lint_javascript` on the two touched files: must report 0 issues.
- Webpack must remain at the pre-fix baseline (1 pre-existing `LoadingPage.jsx:111` warning only).
- Preview URL must remain HTTP 200.

### 4.4 Step 4 — Optional (DEFER, do NOT include in initial fix)

The modal at `ItemCustomizationModal.jsx:100-105` and the transform at `orderTransform.js:390-403` could in principle be migrated to use the new helper for DRY. **Do not include this in the FO-B1-01 fix.** Per scope rules ("Do not refactor"), leave both untouched. A future cleanup ticket can DRY the three call-sites in one focused pass.

### 4.5 Files changed (summary)

| File | Lines added | Lines changed | Net |
|---|---|---|---|
| `orderTransform.js` | ~25 (helper + JSDoc) | 0 | +25 |
| `OrderEntry.jsx` | 1 (import) + 3 (comment) | 3 (replaced inline calc with helper call) | +1 |

**Total: ~26 net lines, zero deletions of existing logic.**

---

## 5. Manual validation checklist

For Implementation Agent + QA Agent. Run through every step before declaring fixed.

### 5.1 Functional happy-path

| # | Scenario | Expected behaviour | Pass criterion |
|---|---|---|---|
| 1 | **Plain item — no variation, no addon.** Add to cart → click + → click − | Cart-line total = `item.price × qty` exactly. | Cart-line ₹ matches `price × qty`; no console errors |
| 2 | **Single-variation item.** Add to cart with one variant chosen → click + → click − | Cart-line total = `(basePrice + variantPrice) × qty`. | Cart-line ₹ matches at every qty step |
| 3 | **Multi-select variation item.** Add to cart with **2+ variants** picked (e.g. Spice = Mild + Medium) → click + → click − | Cart-line total = `(basePrice + sum-of-multi-variant-prices) × qty`. **This is the FO-B1-01 fix.** | Cart-line ₹ no longer drops the multi-variant contribution at any qty step |
| 4 | **Optional variation skipped.** Use a category whose variation is optional (CR-006 A1); add to cart with NO variant picked → click + → click − | Cart-line total = `basePrice × qty` exactly. | No console errors; cart-line ₹ stable |
| 5 | **Re-edit from cart.** From scenario 3, click the cart row to reopen the modal → confirm the multi-variant selections persist → close modal | Selections persist. Modal preview total continues to use the modal's own calc (untouched) | Modal preview ₹ unchanged from before the fix |
| 6 | **Mixed cart.** Add 1 plain + 1 single-variation + 1 multi-select item → vary all qtys | Each cart-line ₹ correct independently; cart subtotal = sum of correct line totals | Subtotal matches |

### 5.2 Payload integrity (regression — must NOT change)

| # | Scenario | Expected | Pass criterion |
|---|---|---|---|
| 7 | **Place + Pay (Pay button)** with the multi-select cart from step 3 | Outbound payload `variation_amount`, `order_amount`, `order_sub_total_amount` are computed from `selectedVariants` directly via transform — match the corrected display | DevTools Network → place-order: `variation_amount` per item is sum of multi-variant prices; `order_amount` matches the Cart panel's displayed total |
| 8 | **Collect Bill on existing order** with multi-select item | Same | DevTools Network → order-temp-store: same payload integrity |
| 9 | **KOT print** payload | `variation` array contains all multi-select labels | If preprod printer is reachable: KOT shows all variants; otherwise verify in DevTools Network on `printOrder('kot', ...)` |
| 10 | **Bill print** payload | Same — `variation` complete | Same as 9 for `printOrder('bill', ...)` |
| 11 | **CollectPaymentPanel display** with multi-select cart | Per-line ₹ matches Cart-panel ₹ exactly; subtotal matches | No discrepancy between cart and payment panel |

### 5.3 Existing flow regression

| # | Scenario | Pass criterion |
|---|---|---|
| 12 | CR-007 A2 — Order ID chip + Print Bill button | Render unchanged; click works |
| 13 | CR-008 #4 / D1 — stay-on-order-entry toggle ON, Place+Pay | Stay-branch fires; cart cleared via remount; chip + Print Bill resurface on next order |
| 14 | CR-008 Sub-CR #1 — delivery-charge capture | Delivery-charge field still captures; payload still folds into `order_amount` / `tax` / `round_up` |
| 15 | A0a — `cash_on_delivery` audit-table mask | Unchanged (separate file) |
| 16 | A0b — `role_name` wire canonicalisation | Unchanged; 6/6 unit tests still pass |
| 17 | Place Order without Pay → Pay later | Same multi-variant integrity once order is engaged |
| 18 | Cancel item / Cancel order with multi-variant line | Cancellation flow unchanged |
| 19 | Transfer / Merge / Shift | Unchanged |
| 20 | Complimentary toggle on multi-variant line | Toggling complimentary still drives `is_complementary='Yes'` in payload; cart-line ₹ goes to 0 on toggle as before |

### 5.4 Build + lint

| # | Check | Pass criterion |
|---|---|---|
| 21 | `mcp_lint_javascript` on `orderTransform.js` | 0 issues |
| 22 | `mcp_lint_javascript` on `OrderEntry.jsx` | 0 issues |
| 23 | Webpack dev-server | `compiled with 1 warning` (pre-existing `LoadingPage.jsx:111` only) |
| 24 | Preview URL | HTTP 200 |

### 5.5 Optional unit-test addition (LOW priority — TEST-INFRA-001 still parked)

Per backlog item TEST-INFRA-001, `@testing-library/react` is not wired on this branch. A pure-Jest unit test for `calculateSelectedVariantsPrice` *can* be added without that dep — the helper is pure/no-React. Recommended file: `frontend/src/__tests__/api/transforms/calculateSelectedVariantsPrice.test.js` with cases:

| Test | Input | Expected output |
|---|---|---|
| null | `null` | `0` |
| undefined | `undefined` | `0` |
| empty object | `{}` | `0` |
| single-select | `{ g1: { price: 10 } }` | `10` |
| multi-select | `{ g1: [{ price: 10 }, { price: 5 }] }` | `15` |
| empty array group | `{ g1: [] }` | `0` |
| null group entry | `{ g1: null }` | `0` |
| mixed shapes | `{ g1: { price: 10 }, g2: [{ price: 5 }, { price: 3 }] }` | `18` |
| string price | `{ g1: { price: '10.50' } }` | `10.5` |
| malformed (no price) | `{ g1: { name: 'X' } }` | `0` |

This is **optional** — the runtime behaviour is already covered by validation steps 1-6.

---

## 6. Approval gate

**STOP. Do NOT implement until the owner explicitly approves this plan.**

### 6.1 Required owner confirmations before implementation begins

1. ✅/❌ — **Approve helper location:** `orderTransform.js` (recommended) vs alternatives (e.g. new `frontend/src/utils/variantsPrice.js`)?
2. ✅/❌ — **Approve helper name:** `calculateSelectedVariantsPrice` (recommended)?
3. ✅/❌ — **Approve "do not refactor"** rule — leave `ItemCustomizationModal.jsx:100-105` and `orderTransform.js:390-403` inline calcs untouched?
4. ✅/❌ — **Approve adding optional pure-Jest unit test** (per §5.5) or skip?
5. ✅/❌ — **Approve plan scope** — single-file display fix, no payload change, no backend touch?

### 6.2 Once approved

The Implementation Agent should:
1. Apply the two edits described in §4.
2. Run lint + webpack smoke (steps 21-24).
3. Run a small static + unit verification pass.
4. Hand off to QA Agent for §5 manual validation when preprod is reachable, OR document conditional pass with static + lint verification per the established P0–P8 conditional-pass pattern.

### 6.3 Out-of-scope confirmation

This plan **does NOT** address, and the implementer must **not** include in the same PR:
- CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01 (A0a sibling tickets)
- DOC-B2-01 (handover field-name doc drift)
- TEST-INFRA-001 (general test-infra wiring)
- CR-010-RP-03, CR-010-RP-05, D-A0b-3 (CR-010 deferrals)
- Any backend ask (BE-1..BE-W2, BE-A, BE-F)
- Any other parked CR/bucket (A3, A4, B3, B4, CR-002, CR-009, CR-010, CR-011..CR-013, CR-008 Sub-CR #3, CR-008 #4 Phase B, B2 Phase 2)
- Any `/app/memory/final/` baseline doc edit (FE-01..FE-03 require separate owner approval per Final Acceptance §11)

---

**End of plan. Awaiting owner approval to proceed.**
