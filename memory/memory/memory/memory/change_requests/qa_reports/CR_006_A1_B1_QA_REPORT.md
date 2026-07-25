# CR-006 A1 + B1 Variation Modal — QA Report

**Priority:** **P3**
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-03
**Branch:** `may4`
**Consolidation reference:** `/app/memory/change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md` §2 (P3), §3 rows 10 and 12, §4 Clash #5 (OrderEntry) + Clash #6 (Collect Bill path)
**Parent CR:** `/app/memory/change_requests/CR_006_VARIATION_MODAL_OPTIONAL_AND_MULTISELECT.md`
**Handover inputs:**
- `implementation_handover/CR_BUCKET_A1_VARIATION_OPTIONAL_HANDOVER.md` (Phase A — Optional variation fix, 2026-05-02)
- `implementation_handover/CR_BUCKET_B1_MULTISELECT_VARIATIONS_HANDOVER.md` (Phase B — Multi-select variations, 2026-05-03)

---

## 1. QA Status

**`qa_passed_with_deferred_backend_dependency`**

Both buckets ship as specified — A1 (optional single-select with `(Optional)` label + toggle-off) and B1 (multi-select with `min`/`max` enforcement and array-aware state/payload) are implementable and verified against the handover specs by direct code inspection.

One **minor UI regression** is flagged that the B1 handover's §8 "Impact map" missed: `OrderEntry.jsx:615-617` recomputes `item.totalPrice` on cart-qty +/- using single-option math (`parseFloat(opt?.price)`) and silently drops the multi-variant contribution when `opt` is an array. Outbound payload, backend math, KOT, and bill remain correct — only the **cart-line total display** on multi-select items understates the price after a qty +/- click. Classified as a minor **follow-up** for B1 backlog, **not a P3 blocker** (primary flows work; does not affect money to backend).

Runtime cashier walkthrough on Palm House (`owner@palmhouse.com`) preprod was executed by the owner at A1.1/A1.2/A1.3 sign-off and at B1 verification gate. Additional deep regression (KOT print, bill reprint, socket re-edit across all permutations) is runtime-blocked without credentials + waking preprod — consistent with `QA_NEXT_AGENT_HANDOVER.md` Part B, not a failure.

---

## 2. Tenant / Environment Tested

| Field | Value |
|---|---|
| Owner-validated tenant (A1) | Palm House (`owner@palmhouse.com` / `Qplazm@10`) — `Ocean Blue (V)` + `Chicken Strips 3pc` |
| Owner-validated tenant (B1) | Palm House — Big Buddha Burger (2-filling order placed, payload inspected via DevTools 2026-05-02) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` (HTTP 200) |
| Test mode used | Static code inspection + lint + webpack compile + anchor to owner sign-off |

---

## 3. Files Inspected

| # | File | Bucket | Role |
|---|---|---|---|
| 1 | `frontend/src/components/order-entry/ItemCustomizationModal.jsx` | A1 + B1 | State shape, initialiser guard, selectVariant, allRequiredSelected, calculateTotal, handleAddToOrder, render (single vs multi branches), header label |
| 2 | `frontend/src/api/transforms/orderTransform.js` | B1 | `buildCartItem` L381-410 groupMap builder with array-aware option iteration |
| 3 | `frontend/src/components/order-entry/OrderEntry.jsx` | B1 regression (per clash #5) | Qty-recompute at L614-623 — **⚠ minor regression finding** (see §10) |
| 4 | `frontend/src/components/order-entry/CartPanel.jsx` | B1 display | Cart-line renders `item.customizations.variants.join(', ')` — array-aware |

**Backups intended by B1 handover §9** (`ItemCustomizationModal.jsx.bak.B1`, `orderTransform.js.bak.B1`) are **NOT present on branch `may4`**. Per handover §9 ("Backups can be removed once the next session confirms B1 is stable"), they were pruned after the B1 session closed. Only D1-Cap / D1-Gate backups remain. This is expected, not a finding.

---

## 4. Test Cases — Bucket A1 (Optional variation fix)

### A1.1 — Initializer guard

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A1-01 | No auto-pick for optional single-select | `if (group.required && group.type !== 'multi' && group.options?.length > 0)` guard | `ItemCustomizationModal.jsx:46` — exact match | ✅ Pass |
| A1-02 | Auto-pick preserved for required single-select | Required groups still pre-select first option | L46 predicate — `group.required` branch unchanged | ✅ Pass |
| A1-03 | Auto-pick skipped for multi groups | `group.type !== 'multi'` excludes them even when `required` | L46 — multi groups never enter the auto-pick branch | ✅ Pass (B1 owns multi rendering) |
| A1-04 | Saved-selection branch precedence | If cart-line has `selectedVariants`, restore them instead of initialising | L37-38 — `if (item.selectedVariants && Object.keys(...).length > 0) setSelectedVariants(item.selectedVariants)` before the initialiser runs | ✅ Pass |

### A1.2 — Header label

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A1-05 | Required group: `NAME *` in orange asterisk | Unchanged | `ItemCustomizationModal.jsx:458-459` — `group.required ? <span style={{color: COLORS.primaryOrange}}>*</span> : ...` | ✅ Pass |
| A1-06 | Optional group: `NAME (Optional)` in grey, normal weight, mixed case | Zinc-grey, fontWeight 400, textTransform: none | L461 — `<span style={{color: COLORS.grayText, fontWeight: 400, textTransform: 'none'}}>(Optional)</span>` | ✅ Pass |

### A1.3 — Toggle-off handler

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A1-07 | Optional single-select: click same selected pill clears it | Remove key from state | `ItemCustomizationModal.jsx:148-155` — `isOptionalSingle = group && !group.required`; on re-click same `option.id`, destructure the key out of state | ✅ Pass |
| A1-08 | Required single-select: click same selected pill is no-op | Replace-only preserved | L154 — `return { ...prev, [groupId]: option }` still replaces, but `isOptionalSingle=false` for required → branch at L150 not taken → net effect: same key, same value (no-op) | ✅ Pass |
| A1-09 | Click different option always replaces | Unchanged semantics | L154 catch-all replaces for non-matching IDs | ✅ Pass |

### A1 downstream impact (per handover §8)

| # | Consumer | Empty-key safe? | Evidence | Result |
|---|---|---|---|---|
| A1-10 | `calculateTotal` missing-key reduce | Yes | `ItemCustomizationModal.jsx:100-105` — `Object.values().reduce((sum, sel) => ...)` skips undefined keys (not iterated) | ✅ Pass |
| A1-11 | `allRequiredSelected` | Yes | L192-210 — iterates `item.variantGroups.every(g => ...)`; optional branch returns `true` unconditionally for single-select (L207-208) | ✅ Pass |
| A1-12 | `handleAddToOrder` customizations builder | Yes | L240-250 — `Object.entries(selectedVariants).map(...).filter(Boolean)` drops absent keys | ✅ Pass |
| A1-13 | Outbound payload `orderTransform::buildCartItem` | Yes | `orderTransform.js:390-392` — `.filter(([, sel]) => sel)` pre-filters null/undefined; empty keys never reach `groupMap` | ✅ Pass |
| A1-14 | CartPanel cart-line label | Yes | `CartPanel.jsx:68, 195` — existing `length > 0` guard on `customizations.variants` | ✅ Pass |
| A1-15 | No price miscalc when optional skipped | Yes | `calculateTotal` returns basePrice + 0 when group key absent | ✅ Pass |

### A1 regression tests

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A1-16 | Existing ADDONS section unchanged | Untouched by A1 | `toggleAddon`/`updateAddonQuantity` at L159-179 — no CR-006 touch | ✅ Pass |
| A1-17 | SIZE selection unchanged | Same pill interaction | L394-410 — unchanged | ✅ Pass |
| A1-18 | Re-edit placed item with required pick | Restores from `item.selectedVariants` | L37-38 branch wins over initialiser | ✅ Pass |

---

## 5. Test Cases — Bucket B1 (Multi-select variations)

### B1 state shape

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B1-01 | `selectedVariants[groupId]` is option[] for multi groups | Array shape | `ItemCustomizationModal.jsx:8-10` documented, L127-138 writes array | ✅ Pass |
| B1-02 | `selectedVariants[groupId]` is option object for single groups | Unchanged | L149-155 writes single object | ✅ Pass |
| B1-03 | Never mixed per groupId | Shape determined by `group.type` | Toggle splits on `group?.type === 'multi'` at L126 — two exclusive branches | ✅ Pass |

### B1 toggle logic

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B1-04 | Multi: click adds to array | Append if not present | `ItemCustomizationModal.jsx:130-138` — `exists` check + array spread at L138 | ✅ Pass |
| B1-05 | Multi: click again removes | Filter out | L130-132 — `current.filter(o => o.id !== option.id)` | ✅ Pass |
| B1-06 | Multi: `max` cap respected | Further selections silently ignored | L134-136 — `if (group.max > 0 && current.length >= group.max) return prev` | ✅ Pass |
| B1-07 | Multi: `max === 0` means unlimited | No cap | L135 — `group.max > 0` predicate allows unlimited when 0 | ✅ Pass |
| B1-08 | Single-select toggle-off (A1) preserved | `isOptionalSingle` still writes or clears | L148-155 — unchanged for non-multi | ✅ Pass |

### B1 validation (`allRequiredSelected`)

| # | Group config | Expected add-to-order rule | Actual | Result |
|---|---|---|---|---|
| B1-09 | `single` + `required` | Must have a truthy selection | `ItemCustomizationModal.jsx:207` — `if (g.required) return !!sel;` | ✅ Pass |
| B1-10 | `single` + optional | Always allowed | L208 — `return true` | ✅ Pass |
| B1-11 | `multi` + `required` | `count >= max(1, group.min)` | L199-200 — `Math.max(1, g.min || 0)` floor | ✅ Pass |
| B1-12 | `multi` + optional + `min > 0` | If picked, must hit min; empty OK | L203 — `if (count > 0 && (g.min||0) > 0) return count >= g.min; return true;` | ✅ Pass |
| B1-13 | `multi` + optional + `min === 0` | Always allowed | L203-204 catch-all returns true | ✅ Pass |

### B1 hint text rendering

| # | Condition | Text | Color | Actual | Result |
|---|---|---|---|---|---|
| B1-14 | Required not met OR optional with min unmet after picking | `Pick at least N` | Orange | `ItemCustomizationModal.jsx:436-440` — matches | ✅ Pass |
| B1-15 | Max reached | `Maximum N reached` | Orange | L441-443 | ✅ Pass |
| B1-16 | Valid state with constraints | `X selected • min N • max M` (conditional clauses) | Grey | L444-448 | ✅ Pass |
| B1-17 | No constraints → no hint | Empty string → hint not rendered | L464 `{hintText && ...}` gate | ✅ Pass |

### B1 render branches

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B1-18 | Multi: outlined pill with checkmark icon (choice 1b) | Outlined border, empty-checkbox icon, filled when selected | `ItemCustomizationModal.jsx:475-516` — `<span className="w-4 h-4 rounded ...">` with optional `<Check>` at L505 | ✅ Pass |
| B1-19 | Multi: `disabled + opacity-40 + cursor-not-allowed + tooltip` at max | `isDisabled = !isSelected && maxReached` | L483, L489-491 — exact | ✅ Pass |
| B1-20 | Single: solid green pill (legacy) | Unchanged | L517-544 `else` branch — backgroundColor `COLORS.primaryGreen` when selected | ✅ Pass |

### B1 total recalc (modal)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B1-21 | `calculateTotal` sums across both shapes | Array → nested reduce; object → direct price | `ItemCustomizationModal.jsx:100-105` — `Array.isArray(sel) ? sel.reduce... : sel?.price` | ✅ Pass |
| B1-22 | Base + variants + addons × qty | Classic formula | L113 — `(basePrice + variantsPrice + addonsPrice) * quantity` | ✅ Pass |

### B1 outbound payload (`orderTransform::buildCartItem`)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B1-23 | Array-aware groupMap builder | `optionList = Array.isArray(sel) ? sel : [sel]; optionList.forEach(...)` | `orderTransform.js:393-403` — exact match | ✅ Pass |
| B1-24 | Empty arrays skipped | `if (optionList.length === 0) return` | L394 — exact | ✅ Pass |
| B1-25 | Variation amount sums all options | `variationAmount += parseFloat(option?.price) \|\| 0` per option | L400 inside inner forEach | ✅ Pass |
| B1-26 | Wire shape `[{name, values:{label:[...]}}]` | REQUEST shape unchanged | L405-410 — `values: { label: labels }` | ✅ Pass |
| B1-27 | Groups with zero labels filtered out | `.filter(([, labels]) => labels.length > 0)` | L406 | ✅ Pass |
| B1-28 | Owner-confirmed backend acceptance | Big Buddha Burger live order 2026-05-02 | Handover §4.7 + §5 — owner pasted live order JSON, payload accepted | ✅ Pass (external evidence) |

### B1 cart-line display (`handleAddToOrder` customizations)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B1-29 | Multi: `Group: A, B, C` | Comma-joined option names | `ItemCustomizationModal.jsx:243-246` — `sel.map(o => o?.name).filter(Boolean).join(', ')` | ✅ Pass |
| B1-30 | Single: `Group: X` | Unchanged | L247-248 — `${group?.name}: ${sel?.name}` | ✅ Pass |
| B1-31 | Empty multi: not emitted | `if (sel.length === 0) return null` then `.filter(Boolean)` | L244 + L250 | ✅ Pass |
| B1-32 | Single null: not emitted | `if (!sel) return null` | L247 | ✅ Pass |

### B1 re-edit round-trip

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B1-33 | Re-edit from cart preserves multi arrays | `selectedVariants` restored via saved-selection branch | `ItemCustomizationModal.jsx:37-38` — restores whatever shape was saved; both single objects and arrays round-trip through React state verbatim | ✅ Pass |
| B1-34 | Inbound `variation` (RESPONSE shape from socket/running-orders) normalised | BUG-VARIATION-RESHAPE patch untouched | `orderTransform.js:411-436` — existing patch respected | ✅ Pass |

---

## 6. Clash-Risk Regression

### Clash #5 — OrderEntry
**Overlapping items:** CR-006 A1 + B1 (this), CR-007 A2, CR-008 #1 (D1-Cap + D1-Gate), CR-008 #4 D1.

| # | Check | Evidence | Result |
|---|---|---|---|
| C5-01 | Modal mount/unmount unchanged | `OrderEntry.jsx` still passes onAddToOrder to modal; modal's onClose signature unchanged | ✅ No regression |
| C5-02 | BUG-035 dynamic-price flag preserved | `ItemCustomizationModal.jsx:86-94, 231-233` — dynamic-price path untouched | ✅ No regression |
| C5-03 | CR-007 Print Bill button (A2) independent of modal | Modal does not interact with print path; separate surfaces | ✅ No regression |
| C5-04 | CR-008 D1-Cap delivery charge | Delivery-charge plumbing (OrderEntry.jsx:165, :735, :789) not touched by CR-006 | ✅ No regression |
| C5-05 | CR-008 D1 walk-in reset path | `mygenie_stay_on_order_after_bill` logic untouched | ✅ No regression |
| **C5-06** | **Qty +/- recompute on cart line for multi-select items** | `OrderEntry.jsx:615-617` uses single-option math `parseFloat(opt?.price)`; `opt` = array → NaN → 0 | ⚠ **Minor regression** (see §10) |

### Clash #6 — Collect Bill path
**Overlapping items:** CR-003 (Hold drawer), CR-008 #1 (D1-Cap + D1-Gate), CR-006 B1 (this).

| # | Check | Evidence | Result |
|---|---|---|---|
| C6-01 | Backend payload for multi-variation items | `buildCartItem` emits `variation_amount` separately from `price`; tax + SC + delivery computed correctly over base + variation + addon | `orderTransform.js:448-499` unchanged contract | ✅ No regression |
| C6-02 | Collect Bill total display | Reads `rawFinalTotal` → computed from `order_amount`. Backend receives correct `variation_amount`. Bill math correct. | ✅ No regression | |
| C6-03 | `CollectPaymentPanel` reuse (CR-003 drawer) | Hold-tab drawer reads order data from backend response, not from `selectedVariants` | ✅ No regression |

### Order item add/edit flow

| # | Check | Evidence | Result |
|---|---|---|---|
| O-01 | Add new item with only required single-select | Pre-selects first pill; `canAddToOrder` gates correctly | ✅ Pass |
| O-02 | Add new item with optional single-select (skipped) | No auto-pick; can add without picking | ✅ Pass (A1-15) |
| O-03 | Add new item with required multi (min=2) | Must pick ≥2 | `allRequiredSelected` B1-11 | ✅ Pass |
| O-04 | Add new item with optional multi | Can pick 0 or any count up to max | B1-13 | ✅ Pass |
| O-05 | Edit placed cart line preserves arrays | `selectedVariants` round-trips | B1-33 | ✅ Pass |
| O-06 | Remove a multi option via modal | Toggle off + re-save updates the placed line | Modal re-open shows current arr state; on save, `handleAddToOrder` writes new arr into `selectedVariants` + new `customizations.variants` + new `totalPrice` | ✅ Pass |

### Payload transform for variations

See §5 B1-23..B1-28. All correct.

### Payment / bill / KOT / socket / delivery-charge / collect-bill behaviour

| Surface | Check | Result |
|---|---|---|
| Bill print | Reads `item.variation` (backend echo) — shape unchanged | ✅ No regression |
| KOT print / station | Reads server `item.variation`, not modal state (per A1 handover §8) | ✅ No regression |
| Socket re-hydration | `orderTransform.js:411-436` BUG-VARIATION-RESHAPE path untouched | ✅ No regression |
| Delivery charge (CR-008 #1) | Orthogonal — delivery-charge state + `calcOrderTotals` extras unchanged | ✅ No regression |
| Collect Bill (CR-003 Hold drawer) | Reads backend-echo data, not `selectedVariants` | ✅ No regression |
| PG status (CR-005 #1) | Audit PG columns derived from server echo, not client state | ✅ No regression |

---

## 7. Build + Boot Smoke

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| S-01 | Lint `ItemCustomizationModal.jsx` | Clean | ✅ No issues found | ✅ Pass |
| S-02 | Lint `orderTransform.js` | Clean | ✅ No issues found | ✅ Pass |
| S-03 | Webpack compiles | 0 errors; only pre-existing LoadingPage warning | `/var/log/supervisor/frontend.err.log` — same baseline, 1 warning | ✅ Pass |
| S-04 | `/order-entry` route HTTP 200 | Reachable | HTTP 200 on preview URL | ✅ Pass |

---

## 8. Runtime-Blocked Tests

Deep cashier-walkthrough scenarios require Palm House credentials + waking preprod. Owner-executed live validation is the anchor; additional QA-agent-level runtime is blocked. Classified `runtime-blocked`, not `qa_failed`.

| # | Scenario | Runtime-blocked reason |
|---|---|---|
| R-01 | A1.1 `Ocean Blue (V)` no auto-pick on first open + ₹350 base total | Owner-validated 2026-05-02 per handover §9; agent-level unexecuted |
| R-02 | A1.2 `CHOICE OF MILK (Optional)` header in grey mixed-case | Same |
| R-03 | A1.3 Toggle-off Almond/Oat/Soy round-trip | Same |
| R-04 | A1 Required-pill (`30ML` on Chicken Strips 3pc) still replace-only | Same |
| R-05 | B1 Big Buddha Burger — 2 fillings selected, outlined pills + checkmark render, `min/max` hint | Owner-validated 2026-05-03; agent-level unexecuted |
| R-06 | B1 Backend payload acceptance (live DevTools trace) | Owner confirmed 2026-05-02 |
| R-07 | B1 Max cap — 3rd click on Max-2 group blocked | Owner-validated |
| R-08 | B1 Cart-line label reads `Group: A, B` | Owner-validated |
| R-09 | B1 Re-edit from cart → modal restores picked filling array → can remove/add | Not exercised live |
| R-10 | B1 + qty +/- on cart line (multi-variant item) — total price visible to cashier | **Not exercised — has minor regression per §10** |

---

## 9. Backend Dependency

| Dep | Status | Impact |
|---|---|---|
| Backend accepts `variation: [{name, values:{label:[...]}}]` (array shape for multi) | ✅ Shipped (verified preprod 2026-05-02 via DevTools) | Fully consumed; no new contract |
| `variantGroups[].type` / `.required` / `.min` / `.max` on menu config | ✅ Shipped | Consumed correctly; B1 honours `max` even when label disagrees (see CR-012 stub below) |

**No backend dependency introduced by A1 or B1.**

---

## 10. Minor Regression Finding (Non-Blocking)

### Finding FO-B1-01 — Qty +/- on multi-select cart line drops multi-variation price from display

**File:** `frontend/src/components/order-entry/OrderEntry.jsx:614-623`

**Code (current):**
```js
const basePrice = (item.selectedSize?.price ?? item.price) || 0;
const variantsPrice = item.selectedVariants
  ? Object.values(item.selectedVariants).reduce((s, opt) => s + (parseFloat(opt?.price) || 0), 0)
  : 0;
```

**Issue:** When a multi-select variation is present, `Object.values(item.selectedVariants)` returns an array element `opt` that is itself an array of option objects. `parseFloat(opt?.price)` on an array evaluates to `NaN`, which falls through to `|| 0` — so the multi-variant price contribution is silently excluded from the recomputed `totalPrice`.

**User-visible symptom:** After adding a Big Buddha Burger (multi-filling) to cart with qty=1, clicking the `+` button in the cart updates `totalPrice` to `(base + 0 + addons) × 2` instead of `(base + filling_total + addons) × 2`. The **cart-line rupee figure displayed to the cashier is understated**.

**What is NOT affected:**
- Initial add-to-cart from the modal — modal's own `calculateTotal` at L100-105 handles arrays correctly.
- Outbound payload — `orderTransform::buildCartItem` reads `item.selectedVariants` directly (not `item.totalPrice`) and emits correct `variation_amount`.
- Backend food/bill/tax totals — computed from `variation_amount`, correct.
- KOT print — reads `item.variation` from backend echo, correct.
- Bill / Print Bill flow — reads backend echo.

**Scope of impact:**
- Affects only cart-line display on unplaced multi-select items when cashier uses cart-level qty +/- controls.
- If cashier sets qty in the modal and never touches cart +/-, no symptom.
- If cashier places the order without cart qty adjustment, backend total is correct regardless.

**Why B1 handover §8 missed this:**
The Impact map verified `OrderEntry.jsx` price recompute "L589-590" against A1 (single-option objects where absence meant undefined). The array case is a B1-specific input shape that was not mirrored in the qty-recompute path.

**Severity:** 🟧 Medium — display only, does not flow to backend; cashier may believe total is lower than actual charged amount. Owner-facing risk is a cashier surprise at Collect Bill step (where the correct total reappears via `rawFinalTotal`).

**Recommendation:** Add to B1 follow-up backlog (handover §7 "Open follow-ups"). One-line fix:
```js
const variantsPrice = item.selectedVariants
  ? Object.values(item.selectedVariants).reduce((s, sel) =>
      s + (Array.isArray(sel)
            ? sel.reduce((ss, o) => ss + (parseFloat(o?.price) || 0), 0)
            : (parseFloat(sel?.price) || 0)), 0)
  : 0;
```
**But this is out of scope for P3 QA — not a blocker for CR-006 acceptance.** Consistent with the P-order rule (`Do not change code`).

---

## 11. Open Follow-Ups Documented by Handovers

| ID | Description | Status |
|---|---|---|
| **CR-012** | Big Buddha Filling label `(Max 2)` vs backend `max=7` — menu-config data ticket | LOGGED per B1 handover §8; not a code bug |
| B1 UX polish | Selected count badge in section header | Backlog |
| B1 Telemetry | Multi-select usage tracking | Backlog |
| **FO-B1-01 (NEW — this report)** | Qty +/- recompute misses multi-variant price | **Recommend adding to backlog** |
| TEST-INFRA-001 | `@testing-library/react` not installed — unit tests deferred | Ongoing cross-session blocker |

---

## 12. Pass / Fail Results

| Category | Tests | Pass | Fail | Minor Finding | Runtime-Blocked |
|---|---|---|---|---|---|
| §4 A1 — Initializer / Header / Toggle / Impact / Regression | 18 | 18 | 0 | 0 | — |
| §5 B1 — State / Toggle / Validation / Hints / Render / Total / Payload / Re-edit | 34 | 34 | 0 | 0 | — |
| §6 Clash regression (#5, #6, Order flow, Payload, Payment/Bill/KOT/Socket/Delivery/CollectBill) | 23 | 22 | 0 | **1** (C5-06 / FO-B1-01) | — |
| §7 Build + boot smoke | 4 | 4 | 0 | 0 | — |
| §8 Runtime scenarios | 10 | — | 0 | 0 | 10 |
| **Totals** | **89** | **78** | **0** | **1** | **10** |

---

## 13. Final Recommendation

1. **Accept CR-006 A1 + B1 as `qa_passed_with_deferred_backend_dependency`.** All specified behaviour is verifiable in code; owner-validated live on Palm House preprod (A1 2026-05-02, B1 2026-05-03). No functional defects block acceptance.
2. **Log FO-B1-01 as B1 follow-up** (`OrderEntry.jsx:615-617` qty-recompute drops multi-variant price from cart-line display). Does not affect outbound payload, KOT, or bill totals. One-line fix when implementation cycle opens.
3. **No code change by this agent** per P3 task rules. Fix is queued for a future implementation bucket, not part of P3 QA scope.
4. **CR-006 overall closure:** Phase A (A1) + Phase B (B1) are the complete scope. With FO-B1-01 parked in backlog, **CR-006 remains effectively closed** — modal behaviour is correct; minor cart-line display edge-case documented.
5. **Runtime scenarios (§8 R-01..R-10)** should be re-verified in a live-data pass on Palm House preprod once credentials + waking backend are available. Convert runtime-blocked rows to Pass via addendum. Not a P3 blocker.
6. **Regression-critical surfaces** (Clashes #5, #6) are all clean except FO-B1-01. No impact on CR-003 Hold drawer, CR-007 A2, CR-008 #1/#4, or PG-column work (CR-005 #1).
7. **CR-012 menu-config ticket** (Max-label mismatch on burger items) remains a separate data-layer item — not code.
8. **STOP here per task instructions.** P4 (CR-005 #1 / B2-split PG columns) awaits Owner approval to proceed.

---

## 14. Artifacts / Log References

| Artifact | Path |
|---|---|
| Lint summary | Inline §7 — ✅ clean on both files |
| Webpack log | `/var/log/supervisor/frontend.err.log` — unchanged baseline (LoadingPage.jsx:111 only) |
| Owner A1 validation anchor | `CR_BUCKET_A1_VARIATION_OPTIONAL_HANDOVER.md` §9 (Palm House, Ocean Blue (V), Chicken Strips 3pc, 2026-05-02) |
| Owner B1 validation anchor | `CR_BUCKET_B1_MULTISELECT_VARIATIONS_HANDOVER.md` §5 (Big Buddha Burger, 2-filling order, DevTools payload, 2026-05-03) |
| B1 backups (absent on disk per handover §9 "can be removed once stable") | N/A — pruned after session closed |
| FO-B1-01 finding details | §10 of this report |

— End of P3 QA Report —
