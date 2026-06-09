# FINAL IMPLEMENTATION SUMMARY — Apr-2026 Open Issues

**Author:** Implementation Agent
**Date:** 2026-04-30
**Branch:** `CR-28-april`
**Source handover:** [`/app/memory/implementation_handover/FINAL_IMPLEMENTATION_HANDOVER_apr_2026_open_issues.md`](./FINAL_IMPLEMENTATION_HANDOVER_apr_2026_open_issues.md)
**Status:** Implemented — pending QA validation, **not deployed**

---

## 1. Approved scope

User approved the 5 ready issues in this exact locked order:

1. **Issue 5** — `update-place-order` 500 (`Undefined array key "label"`) on customised qty-increase
2. **Issue 2** — Browser autofill on Google Places keeps Save button disabled
3. **Issue 3a** — Service Charge silently added at place-time when `auto_service_charge=No`
4. **Issue 3b + 3c** — `printAllKOT` ignores `settings.autoKot` + `KotBillCheckboxes` dead checkbox (atomic bundle)
5. **Issue 1** — Dynamic-priced ₹1 item with variants/addons skips price-entry modal

**Not implemented:**
- **Issue 3d** — Auto-bill never fires → **PARKED** by user (frontend audit clean per logs; pending physical-printer recheck).
- **Issue 4** — KOT auto-prints on Mark Ready / Mark Served → **CLOSED BY BACKEND** (per user; no frontend work required).

---

## 2. Files changed (8 total)

```
frontend/src/api/transforms/orderTransform.js                        (+29 / -7)
frontend/src/components/cards/OrderCard.jsx                          (+6  / -2)
frontend/src/components/cards/TableCard.jsx                          (+6  / -2)
frontend/src/components/order-entry/AddressFormModal.jsx             (+7  / -2)
frontend/src/components/order-entry/CartPanel.jsx                    (+13 / -2)
frontend/src/components/order-entry/ItemCustomizationModal.jsx       (+77 / -4)
frontend/src/components/order-entry/OrderEntry.jsx                   (+36 / -8)
frontend/src/components/order-entry/RePrintButton.jsx                (+30 / -8)
─────────────────────────────────────────────────────────────────────────────────
8 files                                                              (+204 / -35)
```

`git status` confirms **no other tracked files modified.** The untracked `frontend/yarn.lock` is a pre-existing artifact from the earlier deploy `yarn install`, unrelated to these issues.

---

## 3. Implemented issues — before / after behaviour

### Issue 5 — `orderTransform.js` (`buildCartItem` fallback branch, L382-393)

| | Before | After |
|---|---|---|
| Behaviour on placed customised item qty +1 → Update Order | Backend PHP responds `500 — Undefined array key "label"`. Cashier sees error toast, qty does not update on backend. | Backend responds `200`. Qty updates correctly. |
| Frontend payload `variations` | Passed through `item.variation` unchanged (RESPONSE shape: `{name, type, min, max, required, values:[{label, optionPrice},...]}`). | Normalised via `.map` to REQUEST shape `{name, values:{label:[...]}}`. Accepts either input shape; always emits REQUEST shape. |
| `variation_amount` aggregation | shape-agnostic | **unchanged** |
| New customised item path (`selectedVariants` branch) | unchanged | **unchanged** |

### Issue 2 — `AddressFormModal.jsx` (Address input, L197-209)

| | Before | After |
|---|---|---|
| Save button after typing in Address (Maps loaded) | Disabled — `form.address` only synced when `!mapsReady`. | Enabled on first keystroke — `form.address` synced on every keystroke. |
| Save button after picking Google suggestion | Enabled (existing). | Enabled (unchanged; `place_changed` listener still authoritative). |
| Save button after browser autofill click | Disabled / inconsistent. | Enabled (autofill triggers React onChange; `form.address` updates). |
| Browser autofill / password-manager noise | Common (Chrome/LastPass overlap with Places dropdown). | Reduced — `name="address-search"`, `autoComplete="off"`, `data-form-type="other"`, `data-lpignore="true"`, `spellCheck={false}`. |
| `extractAddressComponents`, `place_changed`, `isValid`, all other inputs | unchanged | **unchanged** |

### Issue 3a — Service Charge guard (5 sites across 3 files)

`OrderEntry.jsx` L676 (update-order), L726 (place new order), L1284 (prepaid Place + Pay):

```diff
- serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
-   ? (restaurant?.serviceChargePercentage || 0) : 0,
+ serviceChargePercentage: (
+   (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
+   && !!restaurant?.autoServiceCharge
+ ) ? (restaurant?.serviceChargePercentage || 0) : 0,
```

`TableCard.jsx` L150 (manual Print Bill from dashboard table card) and `OrderCard.jsx` L126 (manual Print Bill from dashboard order card):

```diff
- await printOrder(orderId, 'bill', null, order, restaurant?.serviceChargePercentage || 0);
+ const scPctForPrint = restaurant?.autoServiceCharge ? (restaurant?.serviceChargePercentage || 0) : 0;
+ await printOrder(orderId, 'bill', null, order, scPctForPrint);
```

| Tenant | Before | After |
|---|---|---|
| `auto_service_charge=No`, dine-in food ₹380 | All cards / OrderEntry header / dashboard show ₹399 (SC=5% silently added). Collect Payment shows ₹380. **Two divergent totals.** | All surfaces show ₹380. Cashier opts in via Collect Payment SC checkbox → ₹399. |
| `auto_service_charge=Yes`, dine-in food ₹380 | All surfaces ₹399. | All surfaces ₹399. **Unchanged.** |
| Takeaway / delivery / aggregator / scanOrder | No SC. | No SC (gate already excludes via order type). **Unchanged.** |

`CollectPaymentPanel.jsx` Round-4 gate at L219-223 — **not touched.**

### Issues 3b + 3c — KOT/Bill checkbox bundle (atomic, 3 files)

**`OrderEntry.jsx`:**
- Replaced `useState(true)` for `printAllKOT` with lazy init from `settings.autoKot` + `useEffect` re-sync.
- Added new `printAllBill` state (lazy init from `settings.autoBill` + `useEffect` re-sync).
- L1166 (`autoPrintNewOrderIfEnabled` gate) — replaced `settings?.autoBill` with `printAllBill`.
- L1384 (postpaid Collect Bill auto-print gate) — replaced `settings?.autoBill` with `printAllBill`.
- Threaded 4 new props (`printAllKOT`, `setPrintAllKOT`, `printAllBill`, `setPrintAllBill`) into `<CartPanel>`.

**`RePrintButton.jsx`:** `KotBillCheckboxes` rewritten as a controlled component that reads/writes through props. Local `useState` / `useEffect` / `useRestaurant` removed inside the component (legacy `RePrintButton` default export below kept as-is — its imports are still needed).

**`CartPanel.jsx`:** Added 4 new destructured props at the function signature; passed them to `<KotBillCheckboxes ... />` at L686.

| Profile | Cashier action | Before | After |
|---|---|---|---|
| `aggregator_auto_kot=No` | (none) | KOT printed on every place-order regardless. | KOT checkbox unticked on mount; place-order does **not** print KOT. |
| `aggregator_auto_kot=No` | Tick KOT | (no effect — checkbox dead) | KOT prints on next place-order. |
| `aggregator_auto_kot=Yes` | Untick KOT | (no effect — checkbox dead) | KOT does **not** print on next place-order. |
| `billing_auto_bill_print=No` | (none) | Auto-print bill firing chain gated on `settings.autoBill` (false → skipped). | Same outcome via `printAllBill` (false → skipped). |
| `billing_auto_bill_print=Yes` | Untick Bill | (no effect — checkbox dead) | Auto-print **frontend gate** flips off → `[AutoPrintBill] SKIPPED — printAllBill is falsy`. |
| Refresh / re-mount | — | Checkboxes always reset to dead-init `false`. | Checkboxes re-sync to current profile defaults. |
| Manual Re-Print KOT / Bill buttons | — | Always work. | Always work — **unchanged.** |
| Room orders | — | Auto-bill suppressed by `effectiveTable?.isRoom` guard. | Same — **unchanged.** |

> ⚠️ **Known scope limitation (per handover, intentional):** Cashier checkbox publishes upward into the **frontend auto-print firing decision** only. The backend payload fields `print_kot` (L674, L726, L1284) and `billing_auto_bill_print` (L1284, L1356) still derive from `printAllKOT` / `settings.autoBill` (the new `printAllBill` is **not** plumbed into those payload values, matching the handover scope). If business wants the cashier checkbox to also flow into the backend payload, that's an additional change.

### Issue 1 — `ItemCustomizationModal.jsx` (₹1 customisable items)

| | Before | After |
|---|---|---|
| Customisable item with `price === 1` (e.g. UTTAPAM with CHOICE+ADDONS) | Modal opens at base ₹1; cashier can pick variants/addons; cart receives item at `1 + variants + addons` (e.g. ₹41 for ₹0 + ₹40 addons). No price-entry. | Inline **"Set Price *"** input row at the top of the modal. Total updates live as cashier types and picks variants/addons. Add-to-Order disabled until price > 0. Cart receives item at `(typed price) + variants + addons` × qty with `_isDynamicPrice: true`. |
| Customisable item with `price !== 1` | unchanged | **unchanged** (no Set Price field). |
| Customisable item with `sizes[]` (size locks base price) | unchanged | **unchanged** (no Set Price field — `selectedSize?.price` wins). |
| Plain ₹1 item (no variants, no addons, not customisable) | Routes through `addToCart` → existing standalone Enter-Price modal (BUG-035). | **unchanged.** Both flows coexist. |
| Re-edit a customised dynamic line from cart | `item.price` already > 1 → Set Price field doesn't render. | **unchanged.** |

Backend payload contract: identical to the plain-item BUG-035 path (`item.price` flows through `buildCartItem` → `food_amount`).

---

## 4. Validation performed

- ✅ `git status` / `git diff --stat` confirm **only the 8 planned files changed**.
- ✅ Hot-reload via supervisor → `tail /var/log/supervisor/frontend.out.log` shows `webpack compiled with 1 warning`.
- ✅ The single remaining warning is the **pre-existing** `src/pages/LoadingPage.jsx:111` `react-hooks/exhaustive-deps` warning (out of scope for this batch).
- ✅ **No new warnings, no errors** introduced by any of the 8 edits.
- ❌ **Not run:** testing agent (per scope), QA scenarios (handover §29 — owned by QA team), deployment.

---

## 5. Rollback notes

- All 5 issues are **per-file atomic**. Each can be reverted independently except 3b+3c which is a 3-file bundle (`OrderEntry.jsx` + `RePrintButton.jsx` + `CartPanel.jsx`).
- `git revert <commit>` cleanly reverts each issue. No state-shape migration required.
- Suggested commit boundary (one commit per issue, in implementation order):
  1. `fix(order-update): normalise variation REQUEST shape in buildCartItem fallback (Issue 5)`
  2. `fix(address-form): sync form.address on every keystroke + autofill suppression (Issue 2)`
  3. `fix(service-charge): honour auto_service_charge flag on place-flow + dashboard print (Issue 3a, BUG-028 R5)`
  4. `feat(kot-bill-checkboxes): make KotBillCheckboxes controlled, lazy-init from settings (Issues 3b+3c)`
  5. `feat(item-customization): inline Set Price for ₹1 dynamic-priced customisable items (Issue 1, BUG-035 ext.)`

---

## 6. QA checklist (lifted from handover §29 per issue — execute in any order)

### Issue 5 — `update-place-order` 500
- [ ] Existing dine-in order with customised item (variant + addons), qty+1 → 200 OK
- [ ] Same with variant only (no addons) → 200 OK
- [ ] Same with addons only (no variant) → 200 OK
- [ ] Multiple variant groups (e.g. Size + Choose) → REQUEST shape per group
- [ ] Plain (non-customised) item qty+1 → 200 OK (regression)
- [ ] New customised item to empty order → place-order 200 OK (regression)
- [ ] New customised item added to existing order (without touching placed qty) → 200 OK (regression)
- [ ] Prepaid customised order → 200 OK (regression)
- [ ] Cancel item / transfer / merge / split / shift → unaffected (regression)
- [ ] Variations on bill / order detail unchanged
- [ ] `variation_amount` per item unchanged

### Issue 2 — Address autofill / Save button
- [ ] Type 1 character in Address field → Save enables
- [ ] Type a real address, pick Google suggestion → city / state / pincode / lat / lng auto-populate (existing behaviour)
- [ ] Type free-form text without picking → Save enables, address saves without geo enrichment
- [ ] Browser autofill click → Save enables, no broken state
- [ ] Edit existing address → Save enables on modal open
- [ ] Chrome / Firefox / Safari / Edge — verify no autofill dropdown overlaps the Places dropdown (or, if it does, document for Phase 2 fallback `autoComplete="new-password"`)
- [ ] "Auto-mapped: city, pincode" hint still appears only after Google enrichment

### Issue 3a — Service Charge
- [ ] Tenant `auto=No`, SC=5%, dine-in food ₹380 → table card ₹380, Collect Payment ₹380, tick SC → ₹399, untick → ₹380
- [ ] Tenant `auto=Yes`, SC=5%, dine-in food ₹380 → all surfaces ₹399 (unchanged)
- [ ] Same for walk-in
- [ ] Same for room
- [ ] Takeaway / delivery — SC absent on all surfaces (unchanged)
- [ ] Manual Print Bill from TableCard with `auto=No` — printed bill no SC
- [ ] Manual Print Bill from OrderCard with `auto=No` — printed bill no SC
- [ ] Manual Print Bill from inside Collect Payment with checkbox ticked → SC printed (existing behaviour preserved)
- [ ] Aggregator orders — no SC anywhere
- [ ] Update-order (add items to running order) on `auto=No` → no SC delta
- [ ] Prepaid Place + Pay on `auto=No` → no SC

### Issues 3b + 3c — KOT/Bill checkboxes
- [ ] Profile `autoKot=No` → KOT checkbox unticked on mount → place order → no KOT print
- [ ] Profile `autoKot=No`, cashier ticks KOT → place order → KOT prints
- [ ] Profile `autoKot=Yes` → KOT checkbox ticked on mount → place order → KOT prints
- [ ] Profile `autoKot=Yes`, cashier unticks KOT → place order → no KOT
- [ ] Same 4 cases for Bill / `autoBill` (NB: cashier override gates **frontend** auto-print only; backend `billing_auto_bill_print` still derived from profile — see Section 3 limitation note)
- [ ] Refresh page mid-session → checkboxes reset to profile defaults
- [ ] Manual Re-Print KOT / Bill buttons → always work regardless of checkbox state
- [ ] Room orders → auto-bill still skipped (Bill checkbox state irrelevant for rooms)
- [ ] Profile reload (settings refetch) → checkboxes re-sync to new profile values

### Issue 1 — Dynamic-priced customisable item
- [ ] Customisable ₹1 item → "Set Price" field visible
- [ ] Type ₹250, pick variants/addons → Total = `(250 + variants + addons) × qty`
- [ ] Type 0 / blank / negative → Add-to-Order disabled, error shown
- [ ] Add to cart → cart line shows correct line total
- [ ] Place order → backend payload `food_amount` = typed price × qty
- [ ] Print bill → bill shows typed price
- [ ] Edit order, qty +1 on this customised dynamic line → no 500 error (combined with Issue 5 fix)
- [ ] Customisable non-₹1 item → no "Set Price" field, behaviour unchanged
- [ ] Plain ₹1 item → existing standalone modal still fires
- [ ] Re-edit a customised dynamic item from cart → `item.price` already > 1 → no "Set Price" field

---

## 7. Parked / closed items (no work in this batch)

### Issue 3d — Auto-bill never fires (PARKED)
- Frontend audit clean per user's 2026-04-30 console logs (`[AutoPrintBill] printOrder COMPLETED`, backend `status: true`).
- **No frontend code change at this time.**
- After this batch ships, the Bill firing gate (now `printAllBill`) and all `[AutoPrintBill]` / `[AutoPrintCollectBill]` diagnostic logs are preserved untouched.
- **Next step (owned by user / QA):** physical-printer recheck on next prepaid Pay-and-Place. If printer doesn't fire despite `printOrder COMPLETED`, file a backend ticket against printer-queue / driver / device pipeline.

### Issue 4 — KOT auto-prints on Mark Ready / Mark Served (CLOSED BY BACKEND)
- Backend has shipped the fix (per user, 2026-04-30).
- **No frontend code change required** — verified via grep: `printOrder('kot'` callers are only the 3 explicit re-print buttons (`RePrintButton.jsx:50`, `TableCard.jsx:129`, `OrderCard.jsx:109`). No frontend caller triggers KOT print on Mark Ready / Mark Served.

---

## 8. Documentation updates pending (post-implementation, per handover §31 / §Documentation update rule)

The handover recommends appending these notes to the long-lived design docs **after** QA passes. Not done in this batch — flag for the next agent or dev team:

- `MODULE_DECISIONS_FINAL.md` §4 Changelog:
  - `2026-04 (BUG-035 customisable variant): Dynamic-price (₹1) ordering now also supported for items with variants/addons via inline "Set Price" input in ItemCustomizationModal. Same _isDynamicPrice flag and frontend-only contract as plain path.`
  - `2026-04 (BUG-028 Round 5): Place-order, update-place-order, prepaid Place+Pay, and dashboard-card manual Print Bill now honour auto_service_charge flag, matching CollectPaymentPanel.`
  - `2026-04 (BUG-3B/3C): printAllKOT and new printAllBill state owned by OrderEntry, lazy-initialised from settings.autoKot / settings.autoBill. KotBillCheckboxes is now controlled. Cashier checkbox override per-bill is functional (frontend gate only — backend payload still profile-driven).`
- `ARCHITECTURE_DECISIONS_FINAL.md` Rule **API-07** — append the customisable-variant clause.
- `/app/memory/bugs/QA_HANDOVER_BUNDLE_apr_2026_fixes.md` (or successor) — append the 5 shipped issues with QA scenarios linked to §6 above.

---

# Post-Ship Addendum (same session, 2026-04-30 → 2026-05-01)

User-reported follow-ups observed after the 5 main issues shipped. Implemented in the same session; appended here so the next agent sees the full picture.

## Addendum A — Cash Received input auto-prefill (`CollectPaymentPanel.jsx`)

**User report:** "when user navigates to collect bill page default value of amount to be paid should be auto filled else is another click for user."

### Gap
- L234: `const [amountReceived, setAmountReceived] = useState("");` — Cash Received input starts empty.
- L2035: Pay button disabled while `parseFloat(amountReceived || 0) < effectiveTotal`.
- Net effect: on every cash bill the cashier had to click the ₹{grandTotal} quick-pill (or type) just to enable the already-primary Pay button — **one unnecessary click per cash payment**.

### Fix (single file, +24 / -2 LOC)
1. Added `const hasTouchedCashReceived = useRef(false);` next to the `amountReceived` state (~L235).
2. Added a `useEffect([effectiveTotal, paymentMethod, showSplit])` that auto-seeds `amountReceived = String(effectiveTotal)` when the cashier hasn't touched the field yet and the flow is `cash && !showSplit && effectiveTotal > 0`.
3. Input `onChange` (L1848) and quick-pill `onClick` (L1873) both flip `hasTouchedCashReceived.current = true` before setting state — field becomes sticky once the cashier interacts.

### Behaviour
| Scenario | Before | After |
|---|---|---|
| Land on Collect Payment, ₹185 cash bill | Field empty → click ₹185 → Pay enabled (2 clicks) | Field shows "185" → Pay enabled (1 click) |
| Apply a discount before tendering | Field stays empty | Field auto-updates to new grand total |
| Type a tender amount (e.g. ₹200) | Works | Works; ref flips → field becomes sticky |
| Click ₹500 quick-pill | Sets 500; change shown | Same; ref flips → field becomes sticky |
| Apply discount after typing ₹200 | Stays at 200 | Stays at 200 (no silent rewrite of cashier's tender) |
| UPI / Card / Credit / Split flows | Unaffected | Unaffected (guarded by `paymentMethod === 'cash' && !showSplit`) |

### Files changed
```
frontend/src/components/order-entry/CollectPaymentPanel.jsx   (+24 / -2)
```

### Rollback
Single-file, single-feature. `git revert` the commit.

---

## Addendum B — `autoKot` profile-mapping correction (`profileTransform.js:205`)

**User report:** "i am taking order in room my kot is not printing is there any restriction put in code." — followed by confirmation that the backend sends a camelCase `autoKot: false` as a **separate** top-level field in `settings`.

### Gap — pre-existing wrong alias, exposed by Issue 3b
```js
// BEFORE
autoKot: toBoolean(apiSettings.aggregator_auto_kot),  // WRONG source
```
`autoKot` was aliased to the aggregator-only flag `aggregator_auto_kot`. Before Issue 3b shipped, `printAllKOT` was hardcoded `true`, so the wrong alias was never observable. Issue 3b wired `printAllKOT` to `settings.autoKot`, which — via the wrong alias — resolved to the aggregator flag. Tenants with `aggregator_auto_kot=No` silently stopped auto-printing KOT for **all** in-house order types. User noticed it first on room orders, but it affected every order type equally.

**No room-specific restriction exists anywhere in the frontend** — grep-verified. `isRoom` guards in `OrderEntry.jsx` apply only to service-charge applicability (L686/L739/L1300) and auto-BILL suppression (L1190/L1402). None touch KOT.

### Fix (1 logical line)
```js
// AFTER
autoKot: toBoolean(apiSettings.autoKot),              // CORRECT source (camelCase top-level)
aggregatorAutoKot: toBoolean(apiSettings.aggregator_auto_kot),   // unchanged
```

### Behaviour
| Tenant profile | Before | After |
|---|---|---|
| Backend `autoKot=true` | KOT checkbox on mount reflects `aggregator_auto_kot` instead (often `false` → no auto-print) | Checkbox mounts ticked → KOT auto-prints on all in-house orders |
| Backend `autoKot=false` | Misleading — was driven by aggregator flag | Checkbox mounts unticked → KOT does NOT auto-print (by design, cashier can tick per-order) |
| Aggregator orders | Used `aggregatorAutoKot` alias | **Unchanged** — still reads `aggregator_auto_kot` |

### Files changed
```
frontend/src/api/transforms/profileTransform.js   (1 line functional change + 9 lines comment)
```

---

## Addendum C — `autoBill` profile-mapping correction (`profileTransform.js:206`)

**Same-day follow-up validation** after the `autoKot` fix: the analogous `autoBill` alias had the same class of bug.

### Gap
```js
// BEFORE
autoBill: toBoolean(apiSettings.billing_auto_bill_print),   // WRONG source
```
The backend serves a top-level camelCase `autoBill` inside `settings` (same object as `autoKot`). The frontend was aliasing to `billing_auto_bill_print` — a different / legacy flag. Auto-bill print firing gates (`OrderEntry.jsx:1166` for prepaid auto-print, `OrderEntry.jsx:1384` for postpaid auto-print) consume `settings.autoBill`, so the wrong alias could cause auto-bill-print gates to misfire on tenants where the two flags diverge.

### Fix (1 logical line)
```js
// AFTER
autoBill: toBoolean(apiSettings.autoBill),   // CORRECT source (camelCase top-level)
```

### Behaviour
- Tenants where `autoBill` and `billing_auto_bill_print` are both set the same → no observable change.
- Tenants where they diverge → gate now follows the intended `autoBill` flag.
- Room orders still suppressed by `effectiveTable?.isRoom` guard at L1190 and L1402 (AD-302A) — unchanged.
- `CollectBillPanelDrawer.jsx:177, 196` consumers → still read `settings.autoBill` (now correct).

### Files changed
```
frontend/src/api/transforms/profileTransform.js   (1 line functional change + 9 lines comment)
```

---

## Addendum D — In-app Settings UI gap (FLAGGED, NOT IMPLEMENTED)

### Observation
`src/components/panels/settings/ViewEditViews.jsx:283` renders the POS's "Settings → General" panel. It currently exposes only **one** KOT/Bill-related toggle:
```jsx
<ToggleSwitch label="Aggregator Auto KOT" checked={form.aggregatorAutoKot} ... />   // L283
```
No toggles for:
- **Auto KOT** (in-house — `autoKot`)
- **Auto Bill** (`autoBill`)

After Addenda B and C, owners can toggle these behaviours correctly **from the backend admin / CRM**, but there is no UI in the POS app itself to manage them.

### Proposed follow-up (scoped, not coded)
- `ViewEditViews.jsx` — add 2 sibling `<ToggleSwitch>` rows to the "General" section; extend the local `form` state and `useEffect` deps to include `autoKot` / `autoBill`.
- `profileTransform.toAPI` — add an update mutator for the two fields (currently the `toAPI` stub is empty — Phase 2 placeholder at L229-231).
- Backend endpoint — verify the restaurant-profile update endpoint accepts `autoKot` / `autoBill`.

Not scoped in this session. Owner decision pending.

---

## Combined post-ship file-change summary

```
frontend/src/api/transforms/profileTransform.js                    (+18 / -2 — Addenda B & C)
frontend/src/components/order-entry/CollectPaymentPanel.jsx        (+24 / -2 — Addendum A)
```

## Combined post-ship validation

- `git diff --stat` — 2 files modified (Addenda A + B + C), no others.
- Hot-reload: `webpack compiled successfully` after each edit. No new warnings, no errors.
- Not run: testing agent, QA scenarios, deployment.

## Combined post-ship QA checklist

### Addendum A — Cash Received pre-fill
- [ ] Land on Collect Payment with a cash bill → Cash Received shows grand total on mount; Pay button enabled with zero extra clicks.
- [ ] Type a different amount → typed value persists; subsequent discount changes do not rewrite it.
- [ ] Apply / remove discount before typing → field tracks live grand total.
- [ ] Switch to UPI / Card / Credit → Cash Received section hides; switching back to Cash → field still pre-fills (if never touched).
- [ ] Switch to Split Bill → split inputs unaffected.
- [ ] Short payment (type ₹100 on ₹185) → red border + "Need at least" warning still works (unchanged).

### Addendum B — `autoKot` mapping
- [ ] Tenant with backend `autoKot=true` → refresh POS → open Order Entry (any order type, incl. room) → KOT checkbox **ticked** on mount → place order → KOT prints.
- [ ] Tenant with backend `autoKot=false` → KOT checkbox **unticked** on mount → place order → KOT does NOT print. Cashier can tick the checkbox to override per-order.
- [ ] Tenant with backend `aggregator_auto_kot=Yes` + `autoKot=No` → in-house KOT does NOT auto-print (regression gate — proves the fix separates the two flags).
- [ ] Aggregator orders — behaviour unchanged (still driven by `aggregatorAutoKot`).

### Addendum C — `autoBill` mapping
- [ ] Tenant with backend `autoBill=true`, prepaid Place+Pay on a dine-in table → auto-bill-print fires (logs `[AutoPrintBill] FIRING printOrder …`).
- [ ] Tenant with backend `autoBill=false` → auto-bill-print skipped (logs `[AutoPrintBill] SKIPPED — printAllBill is falsy`).
- [ ] Room orders — auto-bill suppressed regardless of `autoBill` (isRoom guard preserved).
- [ ] Postpaid Collect Bill flow with `autoBill=true` → auto-print fires after successful bill-payment (L1384 gate).

---

## Session-end file-change roll-up

Combining the 5 main issues + post-ship addenda, the **total set of files changed in this session**:

```
frontend/src/api/transforms/orderTransform.js                      (Issue 5)
frontend/src/api/transforms/profileTransform.js                    (Addenda B + C — POST-SHIP)
frontend/src/components/cards/OrderCard.jsx                        (Issue 3a)
frontend/src/components/cards/TableCard.jsx                        (Issue 3a)
frontend/src/components/order-entry/AddressFormModal.jsx           (Issue 2)
frontend/src/components/order-entry/CartPanel.jsx                  (Issues 3b+3c)
frontend/src/components/order-entry/CollectPaymentPanel.jsx        (Addendum A — POST-SHIP)
frontend/src/components/order-entry/ItemCustomizationModal.jsx     (Issue 1)
frontend/src/components/order-entry/OrderEntry.jsx                 (Issues 3a + 3b+3c)
frontend/src/components/order-entry/RePrintButton.jsx              (Issues 3b+3c)
```

**10 files touched total.** All compile clean on hot-reload.

---

**End of summary.**
