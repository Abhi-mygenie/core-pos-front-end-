# FINAL IMPLEMENTATION HANDOVER — Apr-2026 Open Issues

**Author:** Pre-Implementation Validation & Handover Agent
**Date:** 2026-04-30
**Branch:** `CR-28-april`
**Repo HEAD at validation:** `2a508d7` (after merging 9 remote commits into local)
**Status:** Ready for Implementation Agent (with notes per issue)

---

## 1. Title
Final Implementation Handover — bundle of 8 open frontend issues investigated by the Quick Debug Agent in the Apr-2026 session, validated against the live `/app` codebase, locked by user approval (issue-by-issue), and ready for the Implementation Agent.

## 2. Source issue bundle reviewed
- `/app/memory/bugs/IMPLEMENTATION_HANDOVER_BUNDLE_apr_2026_open_issues.md` (449 lines, 8 issues)
- Companion (already-shipped fixes, for context): `/app/memory/bugs/QA_HANDOVER_BUNDLE_apr_2026_fixes.md`
- Issue-5 deep-dive: `/app/memory/bugs/QUICK_DEBUG_HANDOVER_update_order_customised_item_variations_shape.md`

## 3. Issues identified from bundle

| # | Title | Final status |
|---|---|---|
| 1 | Dynamic-priced item with variants/addons skips price-entry modal | Locked — Option C |
| 2 | Browser autofill leaks into Google Places address input → Save button stays disabled | Locked — Part A + Part B |
| 3a | Service Charge silently added at place-time when `auto_service_charge=No` | Locked — wide scope (5 sites), BUG-028 Round 5 rework |
| 3b | `printAllKOT` hardcoded `true`, ignores `settings.autoKot` | Locked — atomic bundle with 3c |
| 3c | `KotBillCheckboxes` is a dead checkbox | Locked — atomic bundle with 3b |
| 3d | Auto-bill never fires | Parked — frontend chain verified clean per user logs; pending physical-printer recheck |
| 4 | KOT auto-prints on Mark Ready / Mark Served | Closed by backend (per user) |
| 5 | `update-place-order` 500 (`Undefined array key "label"`) on customised item qty-increase | Locked |

## 4. Related CR / Bug / Enhancement ID per issue

| Issue | Tracking |
|---|---|
| 1 | Extends **BUG-035** (dynamic-price ₹1 feature). Architecture Rule **API-07** and Module §4 changelog "2026-04 (BUG-035)" already document the ₹1 convention. Issue 1 is a **post-ship gap**: BUG-035's intercept is in `addToCart` (L427-434); the customisation path at L1035 / L498-512 bypasses it. |
| 2 | New fix. No existing BUG ID. Relates to Architecture Rule **EP-04** (Google Maps is a real delivery-form dependency). |
| 3a | **BUG-028 Round 5 rework** (user-approved tracking). Round 4 patched only `CollectPaymentPanel.jsx:219-223`. Place-order flow (3 sites) and dashboard-card Print Bill (2 sites) were missed → 3a-wide closes the loophole. |
| 3b | New fix. No existing BUG ID. Bundles with 3c. |
| 3c | New fix. No existing BUG ID. Bundles with 3b. |
| 3d | No CR. Frontend audit found chain clean. If backend ticket needed → file under `printer-queue/driver-pipeline` (backend-owned). |
| 4 | Closed by backend (no CR ID needed; user confirmed). |
| 5 | New fix. No existing BUG ID. Standalone QUICK_DEBUG_HANDOVER doc already on disk. |

## 5. Related QA report(s) reviewed per issue

| Issue | QA reports / handover docs reviewed |
|---|---|
| 1 | `/app/memory/bugs/BUG_QA_REPORT_035.md` (Passed Candidate) — confirms BUG-035 plain-item path shipped. Gap not caught because customisable variant of dynamic-priced items wasn't in BUG-035 QA scope. |
| 2 | None pre-existing. |
| 3a | `/app/memory/bugs/BUG_QA_REPORT_028.md` (Round 4 — qa_failed → later passed). Round-4 fix was scoped to checkbox initializer only; place-payload sites were not in the QA matrix, so the gap survived. |
| 3b / 3c | None pre-existing. Discovered during 3d investigation. |
| 3d | None pre-existing. Frontend audit performed against console logs supplied by user (2026-04-30, screenshot showing `[AutoPrintBill] printOrder COMPLETED` + backend `status: true`). |
| 4 | None pre-existing. Closed by backend per user. |
| 5 | None pre-existing. Documented in `/app/memory/bugs/QUICK_DEBUG_HANDOVER_update_order_customised_item_variations_shape.md`. |

Cross-CR QA reports reviewed for context (not directly tied to issues):
- `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md`
- `/app/memory/change_requests/qa_reports/CR_001_QA_REPORT.md`
- `/app/memory/change_requests/qa_reports/CR_003_QA_REPORT.md`
- `/app/memory/change_requests/qa_reports/CR_004_QA_REPORT.md`
- `/app/memory/change_requests/qa_reports/QA_NEXT_AGENT_HANDOVER.md`

## 6. Requirement / bug / CR summary per issue
See §13–§16 for full per-issue detail.

## 7. Confirmed scope (locked by user)

- **Issue 1** — Single-modal Option C (inline "Set Price" input inside `ItemCustomizationModal`).
- **Issue 2** — Part A (sync `form.address` on every keystroke) + Part B (5 autofill-suppression attributes).
- **Issue 3a** — Wide scope: 3 place-order sites + 2 dashboard Print Bill sites.
- **Issue 3b + 3c** — Atomic bundle: lazy init `printAllKOT`/`printAllBill` from `settings.autoKot`/`settings.autoBill`, controlled `KotBillCheckboxes`, props plumbed via `CartPanel`. `aggregator_auto_kot` treated as universal (aggregators not in scope per user).
- **Issue 5** — Normalise `item.variation` to REQUEST shape inside `buildCartItem` fallback branch.

## 8. Out of scope

- Backend changes for any issue (none required).
- Issue 4 — closed by backend.
- Issue 3d — no FE work unless physical-printer recheck reveals a frontend regression (currently audit-clean).
- Refactoring `OrderEntry.jsx` beyond the listed surgical edits.
- Refactoring `orderTransform.js` beyond the listed branch normalisation.
- Removing the historical `aggregatorAutoKot` alias from `profileTransform.js:204` (separate cleanup ticket if ever desired).
- Touching `socketHandlers.js` (recently patched for prepaid-Settle Fix A; explicitly do-not-touch).
- Add-on shape normalisation in `buildCartItem` (no reported bug; separate ticket if needed).
- Backend printer-driver / queue changes for 3d.

## 9. Final docs reviewed from `/app/memory/final/`

| Doc | Outcome |
|---|---|
| `ARCHITECTURE_DECISIONS_FINAL.md` | Reviewed. Rules **API-07** (₹1 dynamic price), **EP-04** (Google Maps), **FA-03** (don't expand hotspots), **LOG-03** (code wins over comments) all directly applicable. Dynamic-price rule §API-07 will need a small follow-up note after Issue 1 ships (added to "Documentation Update" section §31 below). |
| `MODULE_DECISIONS_FINAL.md` | Reviewed. Modules involved: §3 Dashboard, §4 Order Entry / Cart / Payment Workflow (Issues 1, 3a, 3b, 3c, 3d, 5), §6 Customer / CRM (Issue 2), §14 Printing/Bill/KOT (Issues 3a, 3b, 3c, 3d). Module §4 changelog ("2026-04 (BUG-035)") is the closest existing entry; will append BUG-028 Round 5 + BUG-035 customisable-variant note after implementation. |
| `IMPLEMENTATION_AGENT_RULES.md` | Reviewed. High-risk areas hit: `OrderEntry.jsx`, `orderTransform.js` (Issue 5). Mitigated by minimal-diff per-issue approach. |
| `CHANGE_REQUEST_PLAYBOOK.md` | Reviewed. Each issue mapped to module(s), API impact, state impact, UI impact, regression risk in §13–§26. |
| `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Reviewed. No open question blocks any locked issue. |
| `FINAL_DOCS_APPROVAL_STATUS.md` / `FINAL_DOCS_SUMMARY.md` | Reviewed for context. No conflict. |

**Missing docs noted (not blocking):**
- `/app/memory/final/API_DOCUMENT_V2.md` — does not exist on this branch.
- `/app/memory/final/SOCKET_V2_FEATURE.md` — does not exist on this branch.

The Pre-Implementation Validation Agent did not assume their content; rules used were sourced from `ARCHITECTURE_DECISIONS_FINAL` and code only.

## 10. QA reports reviewed from `/app/memory/change_requests/qa_reports/`

| File | Used for |
|---|---|
| `QA_REPORT_INDEX.md` | Cross-CR overall context. |
| `CR_001_QA_REPORT.md` | Cross-check that audit/report flows aren't impacted by the 8 issues. They aren't. |
| `CR_003_QA_REPORT.md` | Cross-check Mark-Unpaid path; no overlap with these 8 issues. |
| `CR_004_QA_REPORT.md` | Cross-check room order report; only `effectiveTable?.isRoom` guard at OrderEntry.jsx:1175/1384 is shared with Issue 3d (left untouched). |
| `QA_NEXT_AGENT_HANDOVER.md` | Process / sequencing reference. |

No QA report directly maps to Issues 1, 2, 3a, 3b, 3c, 3d, 4, 5. Closest in-bundle predecessors are bug-level QA reports under `/app/memory/bugs/` (BUG-028 / 035, listed in §5).

## 11. Code files reviewed

All references validated against live code at HEAD `2a508d7`:

- `/app/frontend/src/components/order-entry/OrderEntry.jsx` (L70-100, L420-520, L670-730, L1030-1050, L1140-1240, L1280-1290, L1330-1440, L1670-1750)
- `/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx` (L1-160)
- `/app/frontend/src/components/order-entry/AddressFormModal.jsx` (L1-389, full file)
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L200-240)
- `/app/frontend/src/components/order-entry/CartPanel.jsx` (line 686 + import at L5)
- `/app/frontend/src/components/order-entry/RePrintButton.jsx` (L85-135)
- `/app/frontend/src/components/cards/TableCard.jsx` (L129, L150 — print sites)
- `/app/frontend/src/components/cards/OrderCard.jsx` (L109, L126 — print sites)
- `/app/frontend/src/api/transforms/orderTransform.js` (L347-450, full `buildCartItem`)
- `/app/frontend/src/api/transforms/profileTransform.js` (L75-95, L195-218)
- `/app/frontend/src/api/socket/socketHandlers.js` (L255-285 — verified do-not-touch boundary)
- `/app/frontend/src/contexts/OrderContext.jsx` (L240 — `waitForOrderReady` confirmed)
- `/app/frontend/src/pages/DashboardPage.jsx` (L1230-1295 — Mark Ready/Served paths verified `print_kot`-free for Issue 4)
- `/app/frontend/src/api/services/orderService.js` (L144 — `printOrder` parameter shape)

**Bundle-vs-code mismatches: NONE.** Every line number, symbol name, and root-cause claim in the input bundle matches the live code.

---

# Per-Issue Detail (§12 – §31)

> Each issue includes: (12) current behaviour, (13) reported gap, (14) expected vs current, (15) root cause, (16) approach, (17) files, (18) instructions, (19-22) impacts, (23-24) edges & don't-change, (25) backend, (26) risks, (27) plan, (28) checkpoints, (29) QA, (30) rollback, (31) final status.

---

## ISSUE 1 — Dynamic-priced item with variants/addons skips price-entry modal

### 12. Current code behaviour
- **`OrderEntry.jsx:1035`** — menu-item card click: `onClick={() => item.customizable ? setCustomizationItem(item) : addToCart(item)}`. Customisable items go straight to `ItemCustomizationModal`, bypassing `addToCart`.
- **`OrderEntry.jsx:427-434`** — dynamic-price intercept lives **only** inside `addToCart` for plain ₹1 items.
- **`OrderEntry.jsx:498-512`** — `addCustomizedItemToCart` has no dynamic-price check. Item lands in cart at base ₹1 + variants + add-ons.
- **`ItemCustomizationModal.jsx:63-79`** — `calculateTotal` uses `selectedSize?.price || item?.price || 0` as base price. ₹1 is silently treated as a real price.

### 13. QA-reported / user-observed behaviour
- **SS1 (plain ₹1 item)** — Standalone "Enter Price" modal shows. Cashier types real price. **Works (BUG-035).**
- **SS2 (UTTAPAM, ₹1 base, has CHOICE + ADDONS)** — Customisation modal opens directly with Total `₹41` (= 1 + 40 for Podi Cheese). No price-entry step. Cart receives item at ₹41 instead of `(real base) + 40`.

### 14. Gap
For ₹1 items that are also customisable, the cashier never gets a chance to enter the real price. The order saves with the placeholder ₹1 baked into the line total.

### 15. Validated root cause
The dynamic-price intercept is in the wrong layer. It guards `addToCart` (the plain path) but not `addCustomizedItemToCart` (the customisation path). Two valid entry points to cart, one guard.

### 16. Final recommended approach — **Option C** (locked by user)
Add an inline **"Set Price"** input row at the top of `ItemCustomizationModal`, conditional on `Number(item?.price) === 1`. The modal's existing `calculateTotal` and `handleAddToOrder` consume the override. **No second modal.** Plain ₹1 items continue using the existing standalone "Enter Price" modal at `OrderEntry.jsx:1679-1738` — untouched.

### 17. Exact files likely to change
- `frontend/src/components/order-entry/ItemCustomizationModal.jsx` — only file.

### 18. File-by-file change instructions

#### `ItemCustomizationModal.jsx`

1. **Add local state** near existing `useState` declarations (around L6-11):
   ```jsx
   const [basePriceOverride, setBasePriceOverride] = useState('');
   const [basePriceError, setBasePriceError] = useState('');
   ```

2. **Initialise override on mount** inside the existing `useEffect(..., [item])` at L14-60. After line 47 (`setQuantity(...)`), add:
   ```jsx
   setBasePriceOverride('');
   setBasePriceError('');
   ```

3. **Update `calculateTotal` (L63-79)** — only line 65 changes:
   ```jsx
   // Before
   let basePrice = selectedSize?.price || item?.price || 0;

   // After
   const isDynamic = Number(item?.price) === 1 && !selectedSize;
   const overridden = parseFloat(basePriceOverride);
   let basePrice = isDynamic
     ? (Number.isFinite(overridden) && overridden > 0 ? overridden : 0)
     : (selectedSize?.price || item?.price || 0);
   ```

4. **Update `handleAddToOrder` (L123-150)** — extend the customised-item shape:
   ```jsx
   const customizedItem = {
     ...item,
     selectedSize,
     selectedVariants,
     quantity,
     selectedAddons: addonsArray,
     notes,
     totalPrice: calculateTotal(),
     // BUG-035 (Apr-2026, customisable variant): runtime price override flows
     // through cart, payment, print as the authoritative unit price. _isDynamicPrice
     // tag matches OrderEntry plain-item path (OrderEntry.jsx L477, L487).
     ...(Number(item?.price) === 1 && !selectedSize
       ? { price: parseFloat(basePriceOverride), _isDynamicPrice: true }
       : {}),
     customizations: { /* unchanged */ },
   };
   ```

5. **Add the price-entry block** in the render tree, BEFORE the variant groups section. Use existing `COLORS`, `data-testid` naming aligned with BUG-035 plain-item modal:
   ```jsx
   {Number(item?.price) === 1 && !selectedSize && (
     <div className="mb-4">
       <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
         Set Price <span style={{ color: COLORS.primaryOrange }}>*</span>
       </label>
       <div className="flex items-center gap-2">
         <span className="text-base font-medium" style={{ color: COLORS.darkText }}>₹</span>
         <input
           type="number"
           min="0.01"
           step="0.01"
           placeholder="0.00"
           value={basePriceOverride}
           onChange={(e) => { setBasePriceOverride(e.target.value); setBasePriceError(''); }}
           className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
           style={{ borderColor: basePriceError ? '#EF4444' : COLORS.borderGray, color: COLORS.darkText }}
           data-testid="custom-dynamic-price-input"
           autoFocus
         />
       </div>
       {basePriceError && (
         <p className="text-xs mt-1" style={{ color: '#EF4444' }} data-testid="custom-dynamic-price-error">
           {basePriceError}
         </p>
       )}
     </div>
   )}
   ```

6. **Disable Add-to-Order** when dynamic + price ≤ 0 (extend the existing `allRequiredSelected()` gate at the button site, around L460+):
   ```jsx
   const canSubmit = allRequiredSelected()
     && !(Number(item?.price) === 1 && !selectedSize && !(parseFloat(basePriceOverride) > 0));

   // ...
   <button
     disabled={!canSubmit}
     onClick={() => {
       if (Number(item?.price) === 1 && !selectedSize && !(parseFloat(basePriceOverride) > 0)) {
         setBasePriceError('Please enter a valid price greater than 0');
         return;
       }
       handleAddToOrder();
     }}
     ...
   ```

### 19. API impact
None. Cart-item price flows through `buildCartItem` (`orderTransform.js:396` reads `item.price`), payload contract identical to plain ₹1 path.

### 20. Socket impact
None.

### 21. State management impact
- **Local to `ItemCustomizationModal`.** Two new local `useState` slices: `basePriceOverride`, `basePriceError`.
- No context change. No `OrderEntry`-level state added. `addCustomizedItemToCart` (L498-512) consumes the customised item as-is — flag and price flow through naturally.

### 22. UI / UX impact
- New input row visible **only** when item base = ₹1 and no `selectedSize` (so size-driven items, e.g. Small/Medium/Large with set prices, never trigger this).
- Total updates live as cashier types and picks variants/addons.
- Add-to-Order disabled until valid price > 0.
- Plain ₹1 modal (BUG-035) untouched — both flows coexist.
- No design-token addition; reuses `COLORS` already imported.

### 23. Edge cases to preserve
| Case | Expected |
|---|---|
| ₹1 item, customisable, with `sizes[]` (selectedSize wins as base) | No "Set Price" field. `selectedSize?.price` is the authoritative base. Existing behaviour. |
| ₹1 item, customisable, no sizes | "Set Price" field shows. |
| Non-₹1 customisable item | No field. Unchanged. |
| Plain ₹1 item (no variants, no addons, no `customizable`) | Routes through `addToCart` → existing standalone modal. Unchanged. |
| Re-edit a placed customised dynamic item from cart | `item.price` is already the cashier-entered value (>1) → no field shows. Unchanged behaviour for re-edits. |
| Cashier types `0`, `-5`, `abc` | Add-to-Order disabled, inline error. |

### 24. What NOT to change
- `OrderEntry.jsx:1035` click handler — leave `item.customizable ? setCustomizationItem(item) : addToCart(item)` alone.
- `OrderEntry.jsx:427-434` — plain-item dynamic-price intercept stays.
- `OrderEntry.jsx:1679-1738` — standalone Enter-Price modal stays.
- `OrderEntry.jsx:498-512` — `addCustomizedItemToCart` stays. The override flows through `customizedItem.price`.
- `orderTransform.js`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`, print payload builders — all consume `item.price` — unchanged.

### 25. Backend confirmation needed
None.

### 26. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Cashier closes modal mid-entry → state lost | Acceptable. Same as cancelling any modal. |
| `selectedSize` populated AND `item.price === 1` (rare data) | Guard `&& !selectedSize` ensures size price wins. |
| `_isDynamicPrice` tag collision with plain path | Same flag, same intent. Downstream consumers are agnostic to which modal set it. |

### 27. Step-by-step plan (Implementation Agent)
1. Pull latest `CR-28-april`. Confirm `ItemCustomizationModal.jsx` line numbers match.
2. Apply the 6 edits above in order.
3. ESLint the file: `eslint frontend/src/components/order-entry/ItemCustomizationModal.jsx`.
4. Hot-reload compile check — must remain warning-clean (the only existing repo warning is `LoadingPage.jsx:111`).
5. Manual sanity: open POS preview, navigate to a ₹1 customisable item (e.g. UTTAPAM if available, or pick any ₹1 catalog item with addons in test tenant), verify the new field appears.
6. Run QA scenarios in §29.

### 28. Manual approval checkpoints for Implementation Agent
- After Edit 3 (`calculateTotal`): hot-reload, open modal on a non-₹1 customisable item — confirm Total identical to current behaviour.
- After Edit 5 (input render): visually confirm field appears only on ₹1 customisable items.
- After Edit 6 (disabled gate): confirm Add-to-Order is disabled with empty/invalid input.
- Before commit: full QA scenarios §29 must pass.

### 29. QA validation checklist
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

### 30. Rollback notes
Single file, atomic. `git revert` the commit reverts cleanly. No state-shape migration required.

### 31. Final status
**Ready for implementation.**

---

## ISSUE 2 — Browser autofill leaks into Google Places address input → Save button stays disabled

### 12. Current code behaviour (`AddressFormModal.jsx`)
- L73: `form.address` initialised from `initialData?.address || ''`.
- L89: `searchText` initialised from `initialData?.address || ''`.
- L94: `isValid = form.address.trim()` — **Save button disabled when this is falsy**.
- L201: input is controlled — `value={searchText}`.
- L202-205: `onChange` sets `searchText` always, but `form.address` ONLY when `!mapsReady`.
- L117-133: `place_changed` listener — overwrites `form.address` only when `place.geometry` is present AND `place.formatted_address` is non-empty.
- L374: Save button `disabled={!isValid || saving}`.

### 13. User-observed behaviour (corrected by user)
> "It did fire actually, still Add Address button was disabled."

User typed in the Address field, picked a suggestion (or browser autofill), input visually filled, but Save remained disabled.

### 14. Gap
Visual state (input shows text) drifts from validation state (`form.address` is empty). Save button gates on the wrong slice. Four failure modes possible (all currently reproducible):
1. Manual typing without picking a Google suggestion.
2. Browser autofill click.
3. Google returns a place with no `geometry` → `place_changed` early-returns.
4. Google returns a place with empty `formatted_address` → `extracted.address = ''` → `form.address = ''`.

### 15. Validated root cause
Dual-state (`searchText` for display, `form.address` for validation) without sync on every keystroke.

### 16. Final recommended approach — **Part A + Part B** (locked)
- **Part A (primary fix):** Always sync `form.address` to `searchText` in onChange. `place_changed` overwrite path stays as-is (it'll overwrite manual text with Google-authoritative string when user picks a suggestion).
- **Part B (polish):** 5 autofill-suppression attributes on the input.

### 17. Exact files likely to change
- `frontend/src/components/order-entry/AddressFormModal.jsx` — only file.

### 18. File-by-file change instructions

#### `AddressFormModal.jsx`

1. **L202-205** — remove `if (!mapsReady)` gate:
   ```jsx
   // Before
   onChange={(e) => {
     setSearchText(e.target.value);
     if (!mapsReady) updateField('address', e.target.value);
   }}

   // After
   onChange={(e) => {
     setSearchText(e.target.value);
     updateField('address', e.target.value);
   }}
   ```

2. **L197-209** — add 5 attributes on the input:
   ```jsx
   <input
     ref={inputRef}
     type="text"
     name="address-search"
     autoComplete="off"
     data-form-type="other"
     data-lpignore="true"
     spellCheck={false}
     placeholder={mapsReady ? "Search address..." : "Loading Google Maps..."}
     value={searchText}
     onChange={(e) => {
       setSearchText(e.target.value);
       updateField('address', e.target.value);
     }}
     className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
     style={{ borderColor: COLORS.borderGray }}
     data-testid="addr-address-input"
   />
   ```

### 19. API impact
None. Address payload shape unchanged.

### 20. Socket impact
None.

### 21. State management impact
- `form.address` now updates on every keystroke. `place_changed` still overwrites with Google-authoritative version.
- No new state.

### 22. UI / UX impact
- Save button enables as soon as user has any text in Address field (matching visual state).
- Reduced overlap of Google + browser autofill dropdowns.
- "Auto-mapped: city, pincode" hint at L214-218 still gates on `form.address && form.latitude` — only shows when Google enrichment succeeded. Preserved.

### 23. Edge cases to preserve
| Case | Expected |
|---|---|
| Cashier types and picks Google suggestion | Same as today: address + lat/lng/city/pincode all populated. Save enabled. |
| Cashier types free-form, doesn't pick | Save enabled (NEW); address saves without lat/lng/city. **This was already possible when `!mapsReady`; now consistent.** |
| Edit existing address | `initialData.address` populates both `form.address` and `searchText` — Save enabled on open, unchanged. |
| Browser autofill click | `searchText` and `form.address` both update; user can still pick Google suggestion to overwrite with enriched data. |
| Chrome ignores `autoComplete="off"` (known browser heuristic) | Fallback: switch to `autoComplete="new-password"`. Document in QA notes; ship as Phase 2 only if QA reports leak. |

### 24. What NOT to change
- `place_changed` listener (L117-133) — overwrites still authoritative for Google picks.
- `extractAddressComponents` (L36-68) — unchanged.
- `isValid` rule (L94) — unchanged. The fix makes the rule observable correctly, not the rule itself.
- All other input fields (House, Floor, City, Pincode, State, Road, Contact, Instructions) — unchanged.
- Google Maps Autocomplete config (`types`, `componentRestrictions`, `fields`) — unchanged.

### 25. Backend confirmation needed
None.

### 26. Risks and mitigations
| Risk | Mitigation |
|---|---|
| User saves free-form text address with no lat/lng/city — driver can't geo-route | This was already possible pre-Maps-load. If business wants to enforce Google-pick-only, that's a separate UX ticket — out of scope. |
| Chrome still leaks browser autofill despite `autoComplete="off"` | Phase 2 fallback documented: swap to `autoComplete="new-password"`. |

### 27. Step-by-step plan
1. Apply Edit 1 + Edit 2 above.
2. ESLint file.
3. Hot-reload. Open Add Address modal in delivery flow.
4. Run QA §29.

### 28. Manual approval checkpoints
- After Edit 1: type in input — Save enables on first character.
- After Edit 2: open dev tools elements panel — confirm 5 attributes present on input.

### 29. QA validation checklist
- [ ] Type 1 character in Address field → Save enables
- [ ] Type a real address, pick Google suggestion → city/state/pincode/lat/lng auto-populate (existing behaviour)
- [ ] Type free-form text without picking → Save enables, address saves without geo enrichment
- [ ] Browser autofill click → Save enables, no broken state
- [ ] Edit existing address → Save enables on modal open
- [ ] Chrome / Firefox / Safari / Edge — verify no autofill dropdown overlaps the Places dropdown (or, if it does, document for Phase 2 fallback)
- [ ] "Auto-mapped: city, pincode" hint still appears only after Google enrichment

### 30. Rollback notes
Single file, two adjacent edits, atomic. `git revert` cleanly reverts.

### 31. Final status
**Ready for implementation.**

---

## ISSUE 3a — Service Charge silently added at place-time when `auto_service_charge=No`

### 12. Current code behaviour
Three sites in `OrderEntry.jsx` and two in dashboard cards stamp SC into payloads gated **only on order type**:
- `OrderEntry.jsx:676` — place new order
- `OrderEntry.jsx:726` — prepaid Place + Pay
- `OrderEntry.jsx:1284` — update-place-order (add items to existing order)
- `TableCard.jsx:150` — manual Print Bill from dashboard table card
- `OrderCard.jsx:126` — manual Print Bill from dashboard order card

All five pass `restaurant?.serviceChargePercentage || 0` directly without consulting `restaurant?.autoServiceCharge`.

`CollectPaymentPanel.jsx:219-223` (BUG-028 Round 4) correctly gates on `!!restaurant?.autoServiceCharge` — only this surface is honoured today.

### 13. User-observed behaviour
For a restaurant with `auto_service_charge=No` and SC%=5%, dine-in order food=₹380:
- All cards / order entry header / dashboard show ₹399 (SC included) ❌
- Collect Payment screen shows ₹380, SC checkbox unticked ✅
- Two divergent totals on the same order; SC quietly enters `order_amount` server-side.

### 14. Gap
Asymmetry: Collect Payment honours `autoServiceCharge`, place flow does not. Manual Print Bill from cards also doesn't.

### 15. Validated root cause
BUG-028 Round 4 scope was the checkbox initializer only. Place-payload sites and card Print Bill sites were not in the QA matrix.

### 16. Final recommended approach — **3a-wide** (locked)
Apply the same gate `(orderType-applicable && !!restaurant?.autoServiceCharge)` at all 5 sites. Track as **BUG-028 Round 5 rework**.

### 17. Exact files likely to change
- `frontend/src/components/order-entry/OrderEntry.jsx`
- `frontend/src/components/cards/TableCard.jsx`
- `frontend/src/components/cards/OrderCard.jsx`

### 18. File-by-file change instructions

#### `OrderEntry.jsx`
At each of L676, L726, L1284, replace:
```js
serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
  ? (restaurant?.serviceChargePercentage || 0)
  : 0,
```
with:
```js
// BUG-028 Round 5 (Apr-2026): place-flow now honours auto_service_charge flag,
// matching CollectPaymentPanel.jsx:219-223. Owners with auto=No must opt in via
// the Collect Payment toggle; place flow no longer pre-stamps SC into order_amount.
serviceChargePercentage: (
  (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
  && !!restaurant?.autoServiceCharge
) ? (restaurant?.serviceChargePercentage || 0) : 0,
```

#### `TableCard.jsx` (L150)
Replace:
```js
await printOrder(table.orderId, 'bill', null, order, restaurant?.serviceChargePercentage || 0);
```
with:
```js
// BUG-028 Round 5 (Apr-2026): manual Print Bill from dashboard card honours
// auto_service_charge flag. Print Bill from inside Collect Payment is already
// auto-aware via paymentData.serviceCharge.
const scPctForPrint = restaurant?.autoServiceCharge ? (restaurant?.serviceChargePercentage || 0) : 0;
await printOrder(table.orderId, 'bill', null, order, scPctForPrint);
```

#### `OrderCard.jsx` (L126)
Same pattern as TableCard — extract `scPctForPrint`, pass to `printOrder`.

### 19. API impact
- Payload shape **unchanged** (same `service_charge_percentage` field). Value conditionally `0`.
- Backend `order_amount` computation will reflect the gated SC. No contract change.

### 20. Socket impact
None.

### 21. State management impact
None. Pure caller-layer gating, transforms unchanged.

### 22. UI / UX impact
- Restaurants with `auto=Yes` — no visible change. SC still appears in all surfaces.
- Restaurants with `auto=No` — table card / order card / dashboard / OrderEntry header / manual Print Bill all show food-only total. Cashier opts in via Collect Payment checkbox.

### 23. Edge cases to preserve
| Case | Expected |
|---|---|
| `auto=No`, SC%=5%, dine-in food ₹380 | All surfaces ₹380. Collect Payment unticked. Tick → ₹399. |
| `auto=Yes`, SC%=5%, dine-in food ₹380 | All surfaces ₹399. Unchanged. |
| Walk-in / room — `auto=No` | No SC at place time. Manual override available in Collect Payment. |
| Takeaway / delivery / aggregator / scanOrder | No SC anywhere — unchanged (gate already excludes these by order type). |
| `auto` flipped Yes → No mid-stay on a running room order | Existing placed lines keep their original SC. New qty-additions go without SC delta. **Acceptable policy** (matches how other config-change ripples work). Document for QA. |
| `serviceChargePercentage` is 0 (SC not configured) | All sites emit 0 — unchanged. |

### 24. What NOT to change
- `CollectPaymentPanel.jsx:219-223` Round 4 gate — leave it alone.
- `scApplicable` computation in `CollectPaymentPanel.jsx`.
- Any backend payload field name.
- `orderTransform.js` / `calcOrderTotals` — they take `serviceChargePercentage` as a parameter and don't know about `autoServiceCharge`. Correct layer separation.
- Manual Print Bill from inside Collect Payment (driven by `paymentData.serviceCharge`) — already correct.

### 25. Backend confirmation needed
None. Frontend-only payload value gating.

### 26. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Restaurants relying on the buggy auto-SC at place time will see SC drop on cards | This **is** the bug fix. Communicate via QA bundle. |
| Reports that aggregated phantom SC will see numbers correct downward | Intended. SC that wasn't actually collected shouldn't be in reports. |
| OrderEntry hotspot file change | Three identical 1-line edits, no logic refactor. Low risk. |

### 27. Step-by-step plan
1. Apply 3 edits in `OrderEntry.jsx`, then 1 each in `TableCard.jsx` / `OrderCard.jsx`.
2. ESLint all 3 files.
3. Hot-reload.
4. QA §29 against tenant with `auto_service_charge=No`.

### 28. Manual approval checkpoints
- After OrderEntry edits: place a dine-in order in a `auto=No` tenant — confirm card total is food-only.
- After card edits: click manual Print Bill from a card — printed bill shows no SC.
- Before commit: re-run regression on `auto=Yes` tenant — must show SC as today.

### 29. QA validation checklist
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

### 30. Rollback notes
Three files, five 1-line edits. Atomic per file. Revert per file or per commit.

### 31. Final status
**Ready for implementation. Tracked as BUG-028 Round 5 rework.**

---

## ISSUES 3b + 3c — `printAllKOT` hardcoded `true` + `KotBillCheckboxes` is a dead checkbox (atomic bundle)

### 12. Current code behaviour
- `OrderEntry.jsx:79` — `const [printAllKOT, setPrintAllKOT] = useState(true);` — `setPrintAllKOT` **never called anywhere** in the codebase (verified via grep).
- This `true` flows into payloads at L674, L726, L1284 → `print_kot:'Yes'` always sent.
- `RePrintButton.jsx:87-127` — `KotBillCheckboxes` has local-only `kotChecked`/`billChecked` state synced from `settings.autoKot`/`settings.autoBill`. **No props, no callbacks.**
- `CartPanel.jsx:686` — rendered as `<KotBillCheckboxes />` with **zero props**.
- `OrderEntry.jsx:1166` — auto-bill gate uses `settings?.autoBill` directly.
- `OrderEntry.jsx:1384` — postpaid auto-print gate uses `settings?.autoBill` directly.
- `profileTransform.js:204-205` — `aggregatorAutoKot` and `autoKot` both alias to backend `aggregator_auto_kot` (per user, aggregators are not in scope; this is the universal flag).
- `profileTransform.js:206` — `autoBill` aliases to backend `billing_auto_bill_print`.

### 13. User-observed behaviour
- KOT prints on every place-order regardless of profile setting.
- Cashier ticks/unticks KOT or Bill checkboxes — nothing happens.

### 14. Gap
- `printAllKOT` is permanently `true`.
- Checkboxes are decorative.

### 15. Validated root cause
- Initial state seeded with hardcoded literal, never bound to `settings`.
- Component is uncontrolled; parent never owns the values.

### 16. Final recommended approach — **atomic bundle** (locked)
Lazy-init `printAllKOT` AND new `printAllBill` from settings with `useEffect` re-sync. Convert `KotBillCheckboxes` to controlled component with 4 props. Plumb props through `CartPanel`. Replace `settings?.autoBill` gates at L1166 / L1384 with `printAllBill`.

### 17. Exact files likely to change
- `frontend/src/components/order-entry/OrderEntry.jsx`
- `frontend/src/components/order-entry/RePrintButton.jsx`
- `frontend/src/components/order-entry/CartPanel.jsx`

### 18. File-by-file change instructions

#### `OrderEntry.jsx`

1. **Replace L79** with lazy init + re-sync, and add `printAllBill`:
   ```jsx
   // BUG-3B/3C (Apr-2026): default printAllKOT from settings.autoKot (was hardcoded true).
   // settings loads asynchronously — lazy init + useEffect re-sync mirrors the pattern at
   // RePrintButton.jsx:91-98. New printAllBill enables KotBillCheckboxes to publish upward.
   const [printAllKOT, setPrintAllKOT] = useState(() => settings?.autoKot ?? false);
   useEffect(() => { setPrintAllKOT(settings?.autoKot ?? false); }, [settings?.autoKot]);

   const [printAllBill, setPrintAllBill] = useState(() => settings?.autoBill ?? false);
   useEffect(() => { setPrintAllBill(settings?.autoBill ?? false); }, [settings?.autoBill]);
   ```

2. **L1166** — replace `settings?.autoBill` with `printAllBill`:
   ```jsx
   // Before
   if (!settings?.autoBill) {
     console.warn('[AutoPrintBill] SKIPPED — settings.autoBill is falsy. Value:', settings?.autoBill, 'full settings:', settings);
     return;
   }

   // After
   if (!printAllBill) {
     console.warn('[AutoPrintBill] SKIPPED — printAllBill is falsy. Value:', printAllBill, 'settings.autoBill:', settings?.autoBill);
     return;
   }
   ```

3. **L1384** — replace `settings?.autoBill` with `printAllBill`:
   ```jsx
   // Before
   if (settings?.autoBill && collectOrderId && !effectiveTable?.isRoom) {

   // After
   if (printAllBill && collectOrderId && !effectiveTable?.isRoom) {
   ```

4. **Pass 4 new props to `<CartPanel ... />`** wherever CartPanel is rendered (search for `<CartPanel`):
   ```jsx
   <CartPanel
     /* ...existing props... */
     printAllKOT={printAllKOT}
     setPrintAllKOT={setPrintAllKOT}
     printAllBill={printAllBill}
     setPrintAllBill={setPrintAllBill}
   />
   ```

5. **L674, L726, L1284** — already use `printAllKOT` (variable name unchanged). **No edit needed.** The variable now reflects settings + cashier override.

#### `RePrintButton.jsx`

Replace L87-127 with controlled component:
```jsx
// BUG-3C (Apr-2026): controlled component. Parent (OrderEntry) owns state;
// component reads/writes via props. Local state and useEffect re-sync removed
// (parent owns both initialisation and runtime state).
export const KotBillCheckboxes = ({
  printAllKOT,
  setPrintAllKOT,
  printAllBill,
  setPrintAllBill,
}) => {
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 cursor-pointer" data-testid="auto-kot-checkbox">
        <input
          type="checkbox"
          checked={!!printAllKOT}
          onChange={(e) => setPrintAllKOT(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          style={{ accentColor: COLORS.primaryOrange }}
        />
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>KOT</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer" data-testid="auto-bill-checkbox">
        <input
          type="checkbox"
          checked={!!printAllBill}
          onChange={(e) => setPrintAllBill(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
          style={{ accentColor: COLORS.primaryGreen }}
        />
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Bill</span>
      </label>
    </div>
  );
};
```

Remove the now-unused `useState`/`useEffect`/`useRestaurant` calls inside this component (they were only used for the deleted local sync). Imports of `useState`/`useEffect`/`useRestaurant` may still be needed for `RePrintButton` legacy export below — leave imports, just delete the local logic block inside `KotBillCheckboxes`.

#### `CartPanel.jsx`

1. **L686** — pass props through:
   ```jsx
   <KotBillCheckboxes
     printAllKOT={printAllKOT}
     setPrintAllKOT={setPrintAllKOT}
     printAllBill={printAllBill}
     setPrintAllBill={setPrintAllBill}
   />
   ```

2. **Function signature** — receive 4 new props. Locate the `CartPanel` function definition (search for `export ... function CartPanel` or `const CartPanel = ({`) and add the 4 props to its destructured arguments.

### 19. API impact
- `print_kot` field still emitted in payload at L674, L726, L1284. Value now profile + override-driven instead of always `'Yes'`. Same field, same shape.

### 20. Socket impact
None.

### 21. State management impact
- `OrderEntry` becomes the owner of `printAllKOT` AND `printAllBill`.
- `KotBillCheckboxes` becomes a controlled component (no local state).
- `useEffect` re-sync ensures the override is reset when `settings` changes (e.g., owner edits profile mid-session and bootstrap reloads).

### 22. UI / UX impact
- Cashier can override per-bill (KOT or Bill) by ticking/unticking — actually works now.
- Refresh / re-mount → checkboxes reset to profile defaults.
- No visual change to checkbox styling.

### 23. Edge cases to preserve
| Case | Expected |
|---|---|
| Profile `autoKot=Yes` | KOT checkbox ticked on mount, KOT prints. Untick → KOT does not print on next place-order. |
| Profile `autoKot=No` | KOT checkbox unticked on mount, KOT does not print. Tick → KOT prints on next place-order. |
| Same matrix for Bill / `autoBill` | Same behaviour. |
| Settings load delay (first render is `false`) | After settings arrive, useEffect re-syncs to profile values. Cashier override after that point persists for the session. |
| Refresh / re-mount | Override lost; back to profile defaults. Same as today (no regression). |
| Manual Re-Print KOT / Re-Print Bill buttons | **Always work**, never gated by these flags. Existing behaviour preserved. |
| Room orders | Auto-bill always skipped via `effectiveTable?.isRoom` guard at L1175 / L1384. Untouched. |

### 24. What NOT to change
- `aggregatorAutoKot` alias at `profileTransform.js:204` — keep, even though unused now (separate cleanup ticket).
- Manual Re-Print buttons (`RePrintButton.jsx:50`, `TableCard.jsx:129`, `OrderCard.jsx:109`).
- `print_kot` / `print_bill` payload field names.
- `effectiveTable?.isRoom` guard.
- `RePrintButton` legacy export (the named function below `KotBillCheckboxes` in the same file) — out of scope.

### 25. Backend confirmation needed
None. `aggregator_auto_kot` confirmed as universal per user (aggregators not in scope).

### 26. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Restaurants with `aggregator_auto_kot=No` profile suddenly stop getting KOTs (had been getting them in error) | This **is** the bug fix. Owners who don't want auto-KOT have the setting at No expecting it to work. Document in QA bundle. |
| `printAllBill` newly observable — first runtime where Bill checkbox actually publishes | Auto-bill chain is currently audit-clean (Issue 3d). After this bundle, Bill override actually changes behaviour. Document. |
| OrderEntry hotspot file | Minimal-diff; 3 useState replacements, 2 gate edits, 1 props-pass. No logic refactor. |
| Settings shape changes later → lazy init breaks | `??` fallback to `false` means missing field never throws. |

### 27. Step-by-step plan
1. Edit `OrderEntry.jsx` (5 edits — L79 replace + 2 gate edits + props pass).
2. Edit `RePrintButton.jsx` (1 component rewrite of `KotBillCheckboxes`).
3. Edit `CartPanel.jsx` (1 props-receive + 1 props-pass).
4. ESLint all 3 files.
5. Hot-reload. Visit a tenant where `aggregator_auto_kot=No` and `billing_auto_bill_print=Yes` (or any opposite-of-default combo) to verify mount-time defaults match profile.
6. QA §29.

### 28. Manual approval checkpoints
- After step 1: open OrderEntry in a tenant with `autoKot=No` profile — KOT checkbox should be **unticked** on mount.
- After step 2: tick KOT → place order → KOT prints. Untick → place order → no KOT.
- After step 3: same matrix for Bill.
- Before commit: refresh page mid-flow — checkboxes reset to profile defaults.

### 29. QA validation checklist
- [ ] Profile `autoKot=No` → KOT checkbox unticked on mount → place order → no KOT print
- [ ] Profile `autoKot=No`, cashier ticks KOT → place order → KOT prints
- [ ] Profile `autoKot=Yes` → KOT checkbox ticked on mount → place order → KOT prints
- [ ] Profile `autoKot=Yes`, cashier unticks KOT → place order → no KOT
- [ ] Same 4 cases for Bill / `autoBill`
- [ ] Refresh page mid-session → checkboxes reset to profile defaults
- [ ] Manual Re-Print KOT / Bill buttons → always work regardless of checkbox state
- [ ] Room orders → auto-bill still skipped (Bill checkbox state irrelevant for rooms)
- [ ] Place order → backend payload `print_kot` field reflects checkbox state, not always `'Yes'`
- [ ] Profile reload (settings refetch) → checkboxes re-sync to new profile values

### 30. Rollback notes
Bundle of 3 files. Atomic. Revert as one commit. After revert, `printAllKOT=true` returns and checkboxes go back to dead — same as before.

### 31. Final status
**Ready for implementation. Atomic bundle — must ship together.**

---

## ISSUE 3d — Auto-bill never fires (PARKED)

### 12. Current code behaviour
Two firing paths in `OrderEntry.jsx`:
- **Scenario 2 (prepaid Place + Pay):** `autoPrintNewOrderIfEnabled` at L1156-1237. Logs prefixed `[AutoPrintBill]`.
- **Scenario 1 (postpaid Collect Bill):** inline at L1384-1438. Logs prefixed `[AutoPrintCollectBill]`.

Both gate on `settings?.autoBill` today (replaced by `printAllBill` after 3b+3c lands).

### 13. User-observed behaviour & log evidence (2026-04-30)
User shared console screenshot showing:
```
[CollectPaymentPanel] Payment Debug: ...
[PrintOrder] response: {status: true, message: 'Order inserted into temp table',
                        data: {order_id: 732098, print_type: 'bill',
                               restaurant_order_id: '002957', ...}}
[AutoPrintBill] printOrder COMPLETED for order: 732098
```

This proves: gate passed → `waitForOrderReady` resolved → `rawOrderDetails` present → `printOrder` HTTP call returned `status: true` → backend confirmed `Order inserted into temp table` → frontend post-call log fired.

### 14. Gap
**No frontend gap detected.** Frontend chain complete and successful for the captured scenario.

### 15. Validated root cause (provisional)
If physical printer didn't fire despite the above, root cause is downstream of frontend — backend printer queue / driver / device.

### 16. Final recommended approach — **PARKED**
- No frontend code change at this time.
- User to recheck physical printer on next prepaid Pay-and-Place flow.
- If printer still doesn't fire → file backend ticket against printer-queue/driver pipeline.
- If postpaid Collect Bill path (`[AutoPrintCollectBill]`) breaks but prepaid works → re-open as a different sub-fix focused on `OrderEntry.jsx:1384-1438` overrides builder.

### 17. Exact files likely to change
**None at this time.** If breakage proven in body chain after fix attempt: `OrderEntry.jsx` (`waitForOrderReady` timeout L1186, or override builder L1208-1223 / L1393-1421).

### 18. File-by-file change instructions
N/A — parked.

### 19. API impact
None.

### 20. Socket impact
None.

### 21. State management impact
None at this time. After 3b+3c lands, `printAllBill` is the gate variable.

### 22. UI / UX impact
None.

### 23. Edge cases to preserve
- Room orders: auto-bill always suppressed (`effectiveTable?.isRoom` guard at L1175 and L1384). Preserve.
- All `[AutoPrintBill]` and `[AutoPrintCollectBill]` diagnostic logs — keep until backend printer pipeline verified end-to-end.

### 24. What NOT to change
- The entire auto-bill firing block until logs prove a frontend regression.
- `waitForOrderReady` timeout (3000 ms) — don't increase speculatively.
- `printOrder` service.

### 25. Backend confirmation needed
**Yes if physical printer doesn't fire** — backend printer-queue / driver / device pipeline.

### 26. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Premature frontend "fix" masks real backend issue | Don't change frontend until logs prove it. |
| Physical printer issue confused for frontend bug | Recheck physical printer first. |

### 27. Step-by-step plan
1. **User action:** capture next prepaid Pay-and-Place — confirm physical printer fires or doesn't.
2. **If doesn't fire:** file backend ticket. No FE work.
3. **If fires:** declare 3d closed (frontend audit clean).
4. **Optional:** also test postpaid Collect Bill — if broken there with `[AutoPrintCollectBill]` logs showing different failure pattern → re-open as new sub-fix.

### 28. Manual approval checkpoints
N/A.

### 29. QA validation checklist (post-recheck)
- [ ] Prepaid Pay-and-Place dine-in → physical bill prints
- [ ] Postpaid Collect Bill dine-in → physical bill prints (uses `[AutoPrintCollectBill]` path)
- [ ] Walk-in / takeaway / delivery prepaid → physical bill prints
- [ ] Room order → auto-bill skipped (per AD-302A); manual Print Bill still works
- [ ] If any fails: capture logs prefixed `[AutoPrintBill]` or `[AutoPrintCollectBill]` and follow Pattern table in this doc Section "How to capture logs" below

### 30. Rollback notes
N/A (no change shipped).

### 31. Final status
**Parked — frontend audit clean per user logs. Pending physical-printer recheck. Backend ticket to be filed only if physical printer does not fire.**

### Console-log capture guide (for future repro if needed)

Chrome:
1. Open POS preview URL.
2. `F12` → Console tab.
3. Console gear ⚙ → tick **"Preserve log"**.
4. Filter input → type `AutoPrintBill` (or leave blank to see everything).
5. Reproduce: prepaid Place + Pay on dine-in table with `auto_bill=Yes` profile.
6. Copy all `[AutoPrintBill]`, `[AutoPrintCollectBill]`, `[PrintOrder]`, `[CollectBill]`, `[Prepaid]`, `[OrderContext]` lines.

Pattern → fix mapping (apply only after logs confirm):
| Pattern | Fix area |
|---|---|
| `SKIPPED — isRoom` | Test on non-room. By-design. |
| `waitForOrderReady(X) resolved: null` | Possibly extend timeout at L1186 or fall back to `getOrderById` REST fetch. |
| `SKIPPED — order X missing rawOrderDetails after settle` | `/get-order-detail` REST fallback or backend socket payload fix. |
| `THREW (non-blocking): {…}` | Inspect error — usually override builder L1208-1223 / L1393-1421. |
| `printOrder COMPLETED` + no physical print | **Backend ticket.** Frontend done. (Current state.) |

---

## ISSUE 4 — KOT auto-prints on Mark Ready / Mark Served (CLOSED BY BACKEND)

### 12. Current frontend behaviour
- `DashboardPage.jsx:1238-1271` — `handleMarkReady` / `handleMarkServed` → call `updateOrderStatus(orderId, role, status)` → `PUT /order-status-update`. **No `print_kot` field in payload.**
- `DashboardPage.jsx:1257-1262` — prepaid served path → `completePrepaidOrder(orderId, tax, tip)` → `POST /paid-prepaid-order`. **No `print_kot` field.**
- `DashboardPage.jsx:1274-1289` — `handleItemStatusChange` → `PUT /food-status-update`. **No `print_kot` field.**
- Grep of `printOrder('kot'` / `printOrder("kot"` in entire frontend: only 3 callers — `RePrintButton.jsx:50`, `TableCard.jsx:129`, `OrderCard.jsx:109`. All explicit user-initiated re-print buttons.

### 13. User-observed behaviour
KOT printed on Mark Ready / Mark Served events — unwanted.

### 14. Gap
None on frontend. Backend was firing KOT print as a server-side side effect.

### 15. Validated root cause
Backend side effect on `/order-status-update`, `/food-status-update`, `/paid-prepaid-order` endpoints.

### 16. Final approach — **CLOSED BY BACKEND** (per user, 2026-04-30)
Backend has shipped the fix. No frontend work required.

### 17–30
N/A — closed by backend.

### 31. Final status
**Closed by backend. No frontend work. Document only.**

---

## ISSUE 5 — `update-place-order` 500 (`Undefined array key "label"`) on customised qty-increase

### 12. Current code behaviour
- `OrderEntry.jsx:517-557` — `updateQuantity(itemId, newQty, isPlaced=true)` for placed items creates an unplaced delta cart item by spreading the placed item.
- The placed item was hydrated from socket / running-orders in **RESPONSE shape**: `{name, type, min, max, required, values: [{label, optionPrice}, ...]}`.
- Delta item carries `variation` field in RESPONSE shape.
- `orderTransform.js:347-448` `buildCartItem` runs in update-place-order payload assembly:
  - `selectedVariants` undefined on delta → first branch L364-381 skipped.
  - `item.variation?.length > 0` true → fallback branch L382-393 runs.
  - **Bug at L384:** `variations = item.variation;` passes RESPONSE shape unchanged.
- PUT `/api/v2/vendoremployee/order/update-place-order` body has `values: [{label, optionPrice}, ...]`.
- Backend PHP does `$variation['values']['label']` → throws `Undefined array key "label"` → HTTP 500.

### 13. User-observed behaviour
> "When I am editing order any item, just making quantity increase it throws error. Works fine with non customised items. Customised items are ones which have variance and add-ons."

Backend response: `{"error":"Undefined array key \"label\""}`.

### 14. Gap
Backend expects REQUEST shape `{name, values: { label: [...] }}`. Frontend emits RESPONSE shape on this code path.

### 15. Validated root cause
Two valid `variations` shapes exist (request vs response). Fallback branch in `buildCartItem` was a passthrough — assumes input is already in REQUEST shape. For placed-item qty-increase delta, input is in RESPONSE shape.

### 16. Final recommended approach (locked)
Inside `buildCartItem` fallback branch L382-393, normalise `item.variation` to REQUEST shape via `.map`. Accept either shape on input; always emit REQUEST shape. Aggregator math at L386-392 already handles both shapes — leave it untouched.

### 17. Exact files likely to change
- `frontend/src/api/transforms/orderTransform.js` — only file.

### 18. File-by-file change instructions

#### `orderTransform.js` — replace L382-393 fallback branch with:
```js
} else if (item.variation?.length > 0) {
  // BUG-VARIATION-RESHAPE (Apr-2026): placed items hydrated from the socket /
  // running-orders response carry `variation` in the BACKEND RESPONSE shape:
  //   [{name, type, min, max, required, values: [{label, optionPrice}, ...]}]
  // The place-order / update-place-order endpoints expect the REQUEST shape:
  //   [{name, values: {label: [...]}}]
  // When user increments qty on a placed customised item, OrderEntry creates
  // an unplaced delta cart item by spreading the placed item, so
  // `item.variation` arrives here in RESPONSE shape. Without normalisation,
  // the payload triggers PHP "Undefined array key 'label'".
  // Accept either shape on input; always emit the REQUEST shape.
  variations = item.variation.map(v => {
    // Already in REQUEST shape — pass through (defensive).
    if (v?.values && !Array.isArray(v.values) && Array.isArray(v.values.label)) {
      return { name: v.name, values: { label: v.values.label } };
    }
    // RESPONSE shape — extract option labels into the label-array.
    if (Array.isArray(v?.values)) {
      return {
        name: v.name,
        values: { label: v.values.map(opt => opt?.label).filter(Boolean) },
      };
    }
    // Defensive fallback for any other shape.
    return { name: v?.name || 'Variant', values: { label: [] } };
  });
  // variation_amount math below already handles BOTH shapes — unchanged.
  variationAmount = item.variation.reduce((sum, v) => {
    if (v.price) return sum + (parseFloat(v.price) || 0);
    const vals = Array.isArray(v.values) ? v.values : (v.values?.label ? [] : []);
    return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
  }, 0);
}
```

### 19. API impact
- Outbound payload now matches what `placeOrder` already sends successfully every day. **No contract change.**

### 20. Socket impact
None.

### 21. State management impact
None. Pure transform-layer fix.

### 22. UI / UX impact
None directly. Quantity update on placed customised items will now succeed instead of failing with a 500 error toast.

### 23. Edge cases to preserve
| Case | Expected |
|---|---|
| New customised item to fresh empty order → place-order | Works (first branch unchanged) |
| New customised item to existing order, no placed-line qty edit → update-place-order | Works |
| Placed customised item, qty+1 → update-place-order | **Fixed.** REQUEST shape emitted. Backend 200. |
| Placed customised item, qty-1 (back to 1) | Works |
| Plain non-customised placed item, qty+1 | Works (`variation` empty → fallback branch skipped → `variations: []`) |
| Cancel item / food transfer / table shift / merge / split | Untouched (separate code paths) |
| Prepaid customised items | Works (first branch) |
| `v.values` is `null` or `undefined` (defensive) | Third branch → emits `{name, values: {label: []}}` — no throw |
| Backend evolves to add metadata fields on `values[]` items | `.map(opt => opt?.label).filter(Boolean)` is robust to extra fields |

### 24. What NOT to change
- First branch L364-381 (new-customised-items path).
- `variation_amount` aggregator at L386-392.
- `OrderEntry.updateQuantity` delta-item creation (L517-557).
- Add-ons handling at L348-356 (separate ticket if a similar bug surfaces).
- `placeOrder` / `placeOrderWithPayment` builders.
- Backend payload contract.

### 25. Backend confirmation needed
None.

### 26. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Defensive third branch masks deeper data corruption | Worst case emits valid REQUEST shape with empty label array; backend won't 500. Logs at higher levels surface real corruption separately. |
| `variation_amount` math drift | Aggregator left untouched; already shape-agnostic. |
| New customised order regression | First branch unchanged. |
| Plain item regression | Empty `variation` skips fallback entirely. |
| Performance | One `.map` over 1-3 variant groups per cart item — negligible. |

### 27. Step-by-step plan
1. Apply diff in §18 to `orderTransform.js`.
2. ESLint the file.
3. Hot-reload. Open existing dine-in order with a customised item, +1 qty, Update Order.
4. Confirm 200 response in Network tab and `update-order` socket landing in dashboard.
5. QA §29.

### 28. Manual approval checkpoints
- After diff: console.log the `variations` payload before send (temporary) and confirm REQUEST shape.
- Remove the temp log before commit.

### 29. QA validation checklist
- [ ] Existing dine-in order with customised item (variant + addons), qty+1 → 200 OK
- [ ] Same with variant only (no addons) → 200 OK
- [ ] Same with addons only (no variant) → 200 OK (note: this case may not actually hit the fallback branch if `item.variation` is empty; verify)
- [ ] Multiple variant groups (e.g. Size + Choose) → REQUEST shape per group
- [ ] Plain (non-customised) item qty+1 → 200 OK (regression)
- [ ] New customised item to empty order → place-order 200 OK (regression)
- [ ] New customised item added to existing order (without touching placed qty) → 200 OK (regression)
- [ ] Prepaid customised order → 200 OK (regression)
- [ ] Cancel item / transfer / merge / split / shift → unaffected (regression)
- [ ] Variations on bill/order detail unchanged
- [ ] `variation_amount` per item unchanged
- [ ] If any "Undefined array key" surfaces on `add_ons` during QA → file separate ticket, do NOT bundle

### 30. Rollback notes
Single function, single branch. `git revert` cleanly. Backend continues to expect REQUEST shape; no contract change to roll back.

### 31. Final status
**Ready for implementation.**

---

# Cross-cutting Sections

## Implementation order (recommended — merge-safe)

| Round | Issue | Reason |
|---|---|---|
| 1 | **5** | Single function, fully documented, zero open questions, unblocks order-edit flow widely |
| 2 | **2** | Tiny isolated change, no cross-cutting concerns |
| 3 | **3a-wide** | 5 sites, same one-line pattern, BUG-028 Round 5 audit-clean |
| 4 | **3b + 3c** atomic bundle | Touches OrderEntry hotspot; bundles avoid intermediate broken state |
| 5 | **1** | Largest single-issue change (~20 LOC), isolated to one modal |
| 6 | **3d** | After user's physical-printer recheck. Backend ticket only if breakage confirmed. |
| 7 | **4** | Closed by backend. Document only. |

## Manual approval checkpoints — global

Per `IMPLEMENTATION_AGENT_RULES.md`:
- High-risk-area Approval Gate format **required** for: Issue 1 (`OrderEntry` adjacent), Issue 3a (`OrderEntry`), Issue 3b+3c (`OrderEntry` hotspot), Issue 5 (`orderTransform.js` hotspot).
- File-Level Change Plan format **required** for each file in §18 above.
- Testing Checklist format **required** after each issue ships — use the per-issue §29 checklists.

## Reuse policy (applies to every issue)
- No new component files.
- No new helper functions for one-time operations.
- No abstractions for hypothetical future requirements.
- Reuse existing tokens (`COLORS`), patterns (lazy init + `useEffect` re-sync from `RePrintButton.jsx:91-98`), flags (`_isDynamicPrice`), service entry points (`printOrder`, `updateField`, `setSearchText`).
- All edits surgical and minimal.

## Documentation update rule (post-implementation)

Per `IMPLEMENTATION_AGENT_RULES.md` §Documentation update rule:

After Issues 1, 3a, 3b+3c land, the Implementation Agent should:
- Append to `MODULE_DECISIONS_FINAL.md` §4 Changelog:
  - `2026-04 (BUG-035 customisable variant): Dynamic-price (₹1) ordering now also supported for items with variants/addons via inline "Set Price" input in ItemCustomizationModal. Same _isDynamicPrice flag and frontend-only contract as plain path.`
  - `2026-04 (BUG-028 Round 5): Place-order, update-place-order, prepaid Place+Pay, and dashboard-card manual Print Bill now honour auto_service_charge flag, matching CollectPaymentPanel.`
  - `2026-04 (BUG-3B/3C): printAllKOT and new printAllBill state owned by OrderEntry, lazy-initialised from settings.autoKot / settings.autoBill. KotBillCheckboxes is now controlled. Cashier checkbox override per-bill is functional.`
- Append to `ARCHITECTURE_DECISIONS_FINAL.md` Rule **API-07** the customisable-variant clause.
- Append to QA bundle: `/app/memory/bugs/QA_HANDOVER_BUNDLE_apr_2026_fixes.md` (or successor) — note shipped issues with QA scenarios linked to §29 checklists above.

## Companion already-shipped fixes (for context, do NOT re-implement)

Already in tree per `QA_HANDOVER_BUNDLE_apr_2026_fixes.md`:
- **Fix A — Prepaid served order persists on dashboard.** `socketHandlers.js:262-272`. Status-based `shouldRemove`. **DO NOT TOUCH socketHandlers.js.**
- **Fix B — Cash quick-pills + Change use food-only total instead of grand total on rooms.** `CollectPaymentPanel.jsx:373-388`. Already shipped.
- **Fix C — Cash Received underpayment block.** `CollectPaymentPanel.jsx` Layers A/B/C. Already shipped.

## Cross-issue dependencies

- 1, 2, 3a, 5 — independent; ship in any order.
- 3b + 3c — atomic; cannot split.
- 3d — depends on user physical-printer recheck. Implementation order recommendation puts it after 3b+3c only to reduce merge risk if 3d ever needs body changes; functionally independent.
- 4 — closed.

## Files touched (final count)

```
/app/frontend/src/components/order-entry/OrderEntry.jsx
  ← Issues 3a (3 sites), 3b+3c (state + 2 gate edits + 1 props pass)

/app/frontend/src/components/order-entry/ItemCustomizationModal.jsx
  ← Issue 1

/app/frontend/src/components/order-entry/AddressFormModal.jsx
  ← Issue 2

/app/frontend/src/components/order-entry/CartPanel.jsx
  ← Issue 3c (props plumbing, signature)

/app/frontend/src/components/order-entry/RePrintButton.jsx
  ← Issue 3c (controlled component)

/app/frontend/src/components/cards/TableCard.jsx
  ← Issue 3a (1 site)

/app/frontend/src/components/cards/OrderCard.jsx
  ← Issue 3a (1 site)

/app/frontend/src/api/transforms/orderTransform.js
  ← Issue 5
```

**8 files total. ~85 LOC net additions across 5 issues (1, 2, 3a, 3b+3c, 5).**

## Final status — global

| Issue | Status | Blocker |
|---|---|---|
| 1 | Ready for implementation | None |
| 2 | Ready for implementation | None |
| 3a | Ready for implementation (BUG-028 Round 5 rework) | None |
| 3b + 3c | Ready for implementation (atomic bundle) | None |
| 3d | Parked — frontend audit clean | User physical-printer recheck → if broken, backend ticket |
| 4 | Closed by backend | None |
| 5 | Ready for implementation | None |

**Overall: Ready for Implementation Agent. 5 issues to ship. 1 parked. 1 closed.**

---

## Appendix A — Mandatory pre-reads for the Implementation Agent

In this exact order:
1. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
2. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
3. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
4. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
5. This document.
6. `/app/memory/bugs/QUICK_DEBUG_HANDOVER_update_order_customised_item_variations_shape.md` (Issue 5 reference)
7. `/app/memory/bugs/QA_HANDOVER_BUNDLE_apr_2026_fixes.md` (already-shipped context)
8. `/app/memory/bugs/BUG_ANALYSIS_028.md` + `BUG_QA_REPORT_028.md` (BUG-028 history for Round 5 audit trail)
9. `/app/memory/bugs/BUG_ANALYSIS_035.md` + `BUG_QA_REPORT_035.md` (Issue 1 BUG-035 reference)

## Appendix B — Validation provenance

This handover was produced by a Pre-Implementation Validation Agent in a single session against repo HEAD `2a508d7` on `CR-28-april`. All line numbers, symbol names, and root-cause claims were validated against live code. User approved scope issue-by-issue:
- Issue 1 → "yes, proceed" (Option C)
- Issue 2 → "yes, proceed" (Part A + Part B, after user correction on root cause)
- Issue 3a → "wide"
- Issue 3b + 3c → confirmed via "lets look at 3d if any dependecy" + subsequent acceptance
- Issue 3d → "let me recheck physical print park and move to next" (parked)
- Issue 4 → "this is already handled and closed from backend"
- Issue 5 → "yes, proceed"
- Final → "approved, write the handover"

End of document.
