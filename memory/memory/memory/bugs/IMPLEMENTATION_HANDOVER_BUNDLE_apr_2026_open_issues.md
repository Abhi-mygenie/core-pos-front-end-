# Implementation Handover — Open Issues Bundle (Apr-2026)

**Status:** All issues investigated; **none implemented yet**. This doc is the source of truth for the next Implementation Agent.
**Branch:** `CR-28-april`
**Investigated by:** Quick Debug Agent (this session)
**Companion doc:** `/app/memory/bugs/QA_HANDOVER_BUNDLE_apr_2026_fixes.md` for things already shipped this session.

---

## Mandatory pre-reads (in order)

1. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
2. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
3. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
4. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
5. The bug-specific handover (already on disk):
   - `/app/memory/bugs/QUICK_DEBUG_HANDOVER_update_order_customised_item_variations_shape.md`

---

## Issue index

| # | Title | Owner | Approval status | Approx LOC |
|---|---|---|---|---|
| **1** | Dynamic-priced item + variants/addons skips price entry | FE | Awaiting product decision (Option B vs C) | 30–40 |
| **2** | Browser autofill leaks into Google Places address input | FE | Approved approach; pending implementation | ~5 |
| **3a** | Service Charge silently added at place time when `auto_service_charge=No` | FE | Approved approach; pending implementation | ~6 (× 3 sites) |
| **3b** | `printAllKOT` hardcoded `true` — ignores `settings.autoKot` | FE | Approved approach; pending implementation | ~8 |
| **3c** | `KotBillCheckboxes` checkbox is dead — state never published upward | FE | Approved approach; pending implementation | ~15 |
| **3d** | Auto-bill never fires after fixing 3b + 3c | FE | **Blocked — awaiting console follow-up logs from user** | TBD |
| **4** | KOT auto-prints on Mark Ready / Mark Served | **BE** | **Frontend cannot fix; requires backend coordination** | 0 (FE) |
| **5** | (already on disk) Customised item qty-increase → `update-place-order` 500 with `Undefined array key "label"` | FE | Approved approach; handover doc exists | ~15 |

---

# Issue 1 — Dynamic-priced item with variants/addons skips the price prompt

## Symptom
Items priced at exactly ₹1 are dynamic-priced (cashier-set at runtime). For **plain** dynamic items the cashier gets a price-entry modal. For dynamic items that ALSO have variants/addons, the customisation modal opens directly — the price-entry modal is bypassed and the item is added with `base ₹1 + variants + addons`.

## Confirmed from code
- `OrderEntry.jsx:1035` (menu-item card click): `onClick={() => item.customizable ? setCustomizationItem(item) : addToCart(item)}`
- The dynamic-price intercept lives only inside `addToCart` at `OrderEntry.jsx:427-434`.
- `addCustomizedItemToCart` (`OrderEntry.jsx:498-512`) has no dynamic-price check.
- `ItemCustomizationModal.calculateTotal` uses `item?.price || 0` and silently treats ₹1 as a real price.

## Open question for product
Pick the UX shape:

| Option | UX | Files | Effort |
|---|---|---|---|
| **B** — Two-modal sequence | Click item → dynamic-price modal → on confirm, open customisation modal with the entered price as base | `OrderEntry.jsx:1035` + `confirmDynamicPriceAndAdd` chain | ~10 LOC |
| **C (recommended)** — Inline price field in customisation modal | Click item → single customisation modal with a "Set Price" input rendered when `item.price === 1`. Total updates live as cashier types price + picks options. | `OrderEntry.jsx` + `ItemCustomizationModal.jsx` | ~30–40 LOC |

**Recommendation:** Option C. Single modal, smaller cognitive load on cashier, symmetric with how variants are picked.

## Implementation steps for Option C
1. In `ItemCustomizationModal.jsx` add local state `const [basePriceOverride, setBasePriceOverride] = useState('')` initialised when item is dynamic.
2. Render an extra block at the top of the modal body (before variant groups) when `Number(item?.price) === 1`:
   ```jsx
   {Number(item?.price) === 1 && (
     <div className="mb-4">
       <label className="block text-sm font-medium mb-1">Set Price *</label>
       <input
         type="number"
         placeholder="₹"
         value={basePriceOverride}
         onChange={(e) => setBasePriceOverride(e.target.value)}
         className="w-full px-3 py-2 rounded-lg border"
         data-testid="dynamic-price-modal-input"
       />
     </div>
   )}
   ```
3. Update `calculateTotal` to use `basePriceOverride` (if dynamic) or `item.price` else.
4. Update `handleAddToOrder` to pass `price: parseFloat(basePriceOverride || item.price)` and `_isDynamicPrice: true` flag onto the customised cart item.
5. Disable Add-to-Order button when `Number(item?.price) === 1 && !(parseFloat(basePriceOverride) > 0)`.
6. Verify `addCustomizedItemToCart` (`OrderEntry.jsx:498-512`) honours the over-ridden price (already passes `selectedItem.price` through).

## QA scenarios
- Add a customisable item priced ₹1 (with variants AND add-ons) → cashier sees Set Price field, picks variants + addons, sees correct total live, adds to cart at the typed price.
- Add a customisable item priced ₹250 (with variants) → no Set Price field; behaves as today.
- Add a plain dynamic item priced ₹1 → existing dynamic-price modal still fires (this path unchanged).
- Place order → backend payload `food_amount` reflects the typed price (not ₹1).
- Edit order → qty change works (combined with Issue 5 fix).

---

# Issue 2 — Browser autofill leaks into Google Places address input

## Symptom
Add/Edit Address modal: typing in the Address field shows TWO dropdowns simultaneously — Google Places suggestions (correct) AND browser-stored autofill suggestions (incorrect). Picking a browser entry doesn't trigger Google's `place_changed` listener, so lat/lng/city/pincode never populate.

## Confirmed from code
`AddressFormModal.jsx:197-209` — the input has no `autoComplete` attribute, no unique `name`, no `data-form-type="other"`, no `data-lpignore`. Chromium ignores Google's internal `autocomplete="off"` attempt because of address-field heuristics.

## Approved fix (multi-layered attribute set)
File: `frontend/src/components/order-entry/AddressFormModal.jsx` lines 197–209

```diff
   <input
     ref={inputRef}
     type="text"
+    name="address-search"
+    autoComplete="off"
+    data-form-type="other"
+    data-lpignore="true"
+    spellCheck={false}
     placeholder={mapsReady ? "Search address..." : "Loading Google Maps..."}
     value={searchText}
     onChange={(e) => {
       setSearchText(e.target.value);
       if (!mapsReady) updateField('address', e.target.value);
     }}
     className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
     style={{ borderColor: COLORS.borderGray }}
     data-testid="addr-address-input"
   />
```

## Defence-in-depth (only if Chrome still leaks on QA)
Swap `autoComplete="off"` for `autoComplete="new-password"`. Chrome respects `new-password` (because password autofill never fires on a "new password" input). Acceptable hack widely used with Google Places + React.

## QA scenarios
- Test on Chrome, Firefox, Safari, Edge. In each, type a partial street name in a fresh address modal.
- Expected: ONLY Google `.pac-container` dropdown appears.
- Pick a Google suggestion → city/state/pincode/lat/lng auto-populate (existing behaviour).
- Saved address book entries still appear in `AddressPickerModal` (separate component, unchanged).

---

# Issue 3a — Service Charge silently added at place time when `auto_service_charge=No`

## Symptom
Restaurant has SC % configured but `auto_service_charge` flag is OFF. Cards (table card, order card, dashboard, order entry "Collect Bill" button) show ₹419 (SC included). The Collect Payment screen shows ₹399 (SC excluded — checkbox correctly unticked). Two divergent totals on the same order.

## Confirmed from code

`OrderEntry.jsx:676`, `:726`, `:1284` — the place-order options builder ONLY checks order type, not the auto-SC flag:
```js
serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
  ? (restaurant?.serviceChargePercentage || 0)
  : 0,
```

The Collect Payment screen at `CollectPaymentPanel.jsx:219-223` correctly gates on `restaurant?.autoServiceCharge`. The place flow doesn't.

`profileTransform.js:82` — `autoServiceCharge: toBoolean(api.auto_service_charge)` is correctly mapped.

## Approved fix
Apply the same change to all three sites (`OrderEntry.jsx:676, 726, 1284`):

```diff
- serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
-   ? (restaurant?.serviceChargePercentage || 0)
-   : 0,
+ // BUG-SC-AUTO-GATE (Apr-2026): only accrue service charge into the
+ // place/update payload when the restaurant has BOTH a configured SC %
+ // AND `auto_service_charge` enabled. Otherwise the place flow stamps SC
+ // into order_amount and it leaks into all downstream views (table card,
+ // order card, order entry, dashboard) — only CollectPaymentPanel
+ // (BUG-028) honored the auto flag. Keeps behaviour symmetrical with the
+ // checkbox default at CollectPaymentPanel.jsx:219-223.
+ serviceChargePercentage: (
+   (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
+   && !!restaurant?.autoServiceCharge
+ ) ? (restaurant?.serviceChargePercentage || 0) : 0,
```

## QA scenarios
- Setup A: `auto_service_charge=No`, `service_charge_percentage=5%`. Place dine-in order with items totalling ₹380.
  - Expected: All cards show ₹399 (SC excluded). Collect Payment with checkbox unticked = ₹399.
  - Tick SC checkbox at Collect Payment = ₹419.
- Setup B: `auto_service_charge=Yes`, `service_charge_percentage=5%`. Same order.
  - Expected: All cards show ₹419 (SC included). Collect Payment with checkbox ticked = ₹419.
- Setup C: Order placed under Setup B → flag flipped to No → cashier edits order (qty+1).
  - Expected: Update payload omits SC delta for the new addition. Acceptable trade-off (config-change rippling to in-flight order).
- Verify all order types: dineIn, walkIn, room, takeaway, delivery, aggregator, scanOrder.

---

# Issue 3b — `printAllKOT` hardcoded to `true` in OrderEntry

## Symptom
KOT prints on every place-order, regardless of `settings.autoKot` setting OR any cashier override.

## Confirmed from code
`OrderEntry.jsx:79`:
```js
const [printAllKOT, setPrintAllKOT] = useState(true);
```

`setPrintAllKOT` is **never called anywhere** in the codebase. State is permanently `true`. Flows into place-order options at L674, L726, L1284 → `print_kot:'Yes'` (orderTransform.js:631, 706, 798).

## Approved fix
File: `OrderEntry.jsx:79`

```diff
-  const [printAllKOT, setPrintAllKOT] = useState(true);
+  // BUG-AUTO-KOT-GATE (Apr-2026): default the place-order print-KOT flag
+  // from settings.autoKot so the user's profile preference is honoured.
+  // Settings load asynchronously, so initialise lazily and re-sync via
+  // useEffect — same pattern as RePrintButton.jsx:96.
+  const [printAllKOT, setPrintAllKOT] = useState(() => settings?.autoKot ?? false);
+
+  useEffect(() => {
+    setPrintAllKOT(settings?.autoKot ?? false);
+  }, [settings?.autoKot]);
+
+  // Parallel state for bill auto-print, surfaced by KotBillCheckboxes
+  // override (Issue 3c). Default from settings.autoBill.
+  const [printAllBill, setPrintAllBill] = useState(() => settings?.autoBill ?? false);
+  useEffect(() => {
+    setPrintAllBill(settings?.autoBill ?? false);
+  }, [settings?.autoBill]);
```

## Open question (Backend confirmation needed)
`profileTransform.js:204-205` maps backend `aggregator_auto_kot` to BOTH `aggregatorAutoKot` AND `autoKot`. The prefix `aggregator_` suggests this flag is for aggregator orders only.

**Action:** Ask backend team:
- Is `aggregator_auto_kot` the universal "auto print KOT" flag, or is there a separate field for non-aggregator orders?
- If separate, what's the field name?

If a universal field exists with a different name, update `profileTransform.js:205` to read that. The fix above will then automatically pick up the right value.

## QA scenarios
- Profile: `aggregator_auto_kot=No`. Place new dine-in order. **Expected:** No KOT printed at place time. (Was firing today.)
- Profile: `aggregator_auto_kot=Yes`. Place new order. **Expected:** KOT prints (current behaviour preserved).
- Combine with Issue 3c — cashier toggles KOT checkbox → print honours the toggle.

---

# Issue 3c — `KotBillCheckboxes` is a dead checkbox

## Symptom
The KOT/Bill checkboxes in CartPanel let the cashier think they're overriding auto-print behaviour, but ticking/unticking has zero effect on the place-order flow.

## Confirmed from code
- `RePrintButton.jsx:87-127` — checkbox state is local `useState`. Updates only the local boolean.
- `CartPanel.jsx:686` — rendered as `<KotBillCheckboxes />` with NO props.
- No callback, no context emit, no parent state plumbing.

## Approved fix (Option 1 — controlled component)

### Step 1 — Convert `KotBillCheckboxes` to a controlled component
File: `frontend/src/components/order-entry/RePrintButton.jsx` lines 87-127

```diff
-export const KotBillCheckboxes = () => {
-  const { settings } = useRestaurant();
-  const [kotChecked,  setKotChecked]  = useState(false);
-  const [billChecked, setBillChecked] = useState(false);
-
-  useEffect(() => {
-    setKotChecked(settings?.autoKot  ?? false);
-    setBillChecked(settings?.autoBill ?? false);
-  }, [settings?.autoKot, settings?.autoBill]);
+export const KotBillCheckboxes = ({
+  printAllKOT,
+  setPrintAllKOT,
+  printAllBill,
+  setPrintAllBill,
+}) => {

   return (
     <div className="flex items-center gap-4">
       <label data-testid="auto-kot-checkbox">
         <input
           type="checkbox"
-          checked={kotChecked}
-          onChange={(e) => setKotChecked(e.target.checked)}
+          checked={!!printAllKOT}
+          onChange={(e) => setPrintAllKOT(e.target.checked)}
           ...
         />
         <span>KOT</span>
       </label>
       <label data-testid="auto-bill-checkbox">
         <input
           type="checkbox"
-          checked={billChecked}
-          onChange={(e) => setBillChecked(e.target.checked)}
+          checked={!!printAllBill}
+          onChange={(e) => setPrintAllBill(e.target.checked)}
           ...
         />
         <span>Bill</span>
       </label>
     </div>
   );
 };
```

### Step 2 — Plumb props from CartPanel
File: `frontend/src/components/order-entry/CartPanel.jsx`

`CartPanel` needs to receive `printAllKOT, setPrintAllKOT, printAllBill, setPrintAllBill` as props from `OrderEntry` and pass them down to `<KotBillCheckboxes />` at L686:

```diff
-  <KotBillCheckboxes />
+  <KotBillCheckboxes
+    printAllKOT={printAllKOT}
+    setPrintAllKOT={setPrintAllKOT}
+    printAllBill={printAllBill}
+    setPrintAllBill={setPrintAllBill}
+  />
```

### Step 3 — Wire `printAllBill` into the auto-bill conditional in `OrderEntry`
- `OrderEntry.jsx:1166` — gate becomes `if (!printAllBill)` instead of `if (!settings?.autoBill)`.
- `OrderEntry.jsx:1384` — postpaid auto-print path: `if (printAllBill && collectOrderId && !effectiveTable?.isRoom)`.
- `OrderEntry.jsx:674, 726, 1284` — already use `printAllKOT`. After Issue 3b's fix, this state now reflects `settings.autoKot` AND any cashier override.

## QA scenarios
- Profile `autoBill=Yes`. Cashier UNTICKS Bill checkbox before placing order → no auto-bill.
- Profile `autoBill=No`. Cashier TICKS Bill checkbox before placing order → auto-bill fires.
- Profile `autoKot=No`. Cashier TICKS KOT checkbox → KOT prints at place.
- Profile `autoKot=Yes`. Cashier UNTICKS KOT checkbox → KOT does NOT print.
- Refresh page mid-flow → checkbox state resets to profile defaults.

---

# Issue 3d — Auto-bill never fires (BLOCKED — awaiting logs)

## Status from this session

User confirmed `[AutoPrintBill] entry` log shows `settings.autoBill: true`, `newOrderId: 732049`, `restaurant.serviceChargePercentage: 10`. **The gate IS passing**. The chain breaks AFTER this log.

## Console logs needed from user

User to reproduce one prepaid Place+Pay flow and paste **all `[AutoPrintBill]` lines** following the entry log. Possible follow-up patterns:

1. `[AutoPrintBill] SKIPPED — isRoom (Req 3 / AD-302A)` → user is testing on a Room order; **by-design** suppression per `OrderEntry.jsx:1175` and `:1384`. Not a bug. Confirm with product if Room behaviour should change.

2. `[AutoPrintBill] waiting for order 732049 to settle in context (3000ms cap)...` followed by `[AutoPrintBill] waitForOrderReady(...) resolved: null` → socket settle timeout. Order placed but `update-order` socket didn't fire within 3 seconds. Possible fixes: increase timeout to 5s, or fall back to direct `getOrderById` API fetch.

3. `[AutoPrintBill] SKIPPED — order 732049 missing rawOrderDetails after settle` → socket settled but the payload didn't carry `order_details`. Backend coordination, OR fall back to `/get-order-detail` fetch.

4. `[AutoPrintBill] FIRING printOrder for order: 732049` followed by `[AutoPrintBill] THREW (non-blocking): {error:...}` → backend `/order-temp-store` rejected the print payload. Inspect the error.

5. `[AutoPrintBill] FIRING printOrder for order: 732049` followed by `[AutoPrintBill] printOrder COMPLETED for order: 732049` and yet no print → backend printer-driver issue. Out of frontend scope.

## Action for Implementation Agent
1. Wait for the user's follow-up logs.
2. Match against the table above.
3. Pick the targeted fix (most likely category 2 — timeout/fallback). Files affected:
   - `OrderEntry.jsx:1182-1187` — `waitForOrderReady` call site
   - `useOrderReady` (the hook implementing waitForOrderReady; locate via grep)

## DO NOT
- Increase the timeout speculatively without confirming category 2.
- Fall back to API fetch unconditionally (would mask socket regressions).
- Touch the backend.

---

# Issue 4 — KOT auto-prints on Mark Ready / Mark Served

## Frontend confirmed innocent

I traced every Ready/Served path:

| Path | Endpoint | `print_kot` field in payload? |
|---|---|---|
| Order-level Mark Ready/Served (`DashboardPage.jsx:1238/1251` → `updateOrderStatus`) | `PUT /order-status-update` | **No** |
| Item-level Ready/Served (`DashboardPage.jsx:1274` → direct PUT) | `PUT /food-status-update` | **No** |
| Prepaid Mark Served (`DashboardPage.jsx:1257-1262`) | `POST /paid-prepaid-order` | **No** |

`grep` of `printOrder('kot'` shows only THREE callers — all explicit user-initiated re-print buttons (`TableCard.jsx:129`, `OrderCard.jsx:109`, `RePrintButton.jsx:50`). None are wired to status changes.

## Conclusion
Backend's `/order-status-update` and/or `/food-status-update` endpoints fire a server-side KOT print as a side effect when status flips to `ready` or `serve`.

## Action — Backend coordination required

Ask backend team:
- F-1 (recommended): Remove the auto-print KOT side effect from `/order-status-update` and `/food-status-update`. KOT prints only when client sets `print_kot: 'Yes'` in `place-order`/`update-place-order` or via explicit `order-temp-store` POST.
- F-2 (alternative): Add an explicit `print_kot` field to the status-update endpoints (default `'No'`); frontend can opt in if/when product wants Ready KOTs in future.

**No frontend change required.** This issue is on backend's plate.

## Frontend QA scenario (post-backend-fix)
- Place new order → KOT prints (existing behaviour).
- Mark item Ready → no KOT print.
- Mark item Served → no KOT print.
- Mark order Ready → no KOT print.
- Mark order Served → no KOT print.
- Cancel item / cancel order → KOT print (per spec).
- Re-Print KOT button (manual) → KOT prints (always).

---

# Issue 5 — `update-place-order` 500 on customised item qty-increase

**Already documented:** `/app/memory/bugs/QUICK_DEBUG_HANDOVER_update_order_customised_item_variations_shape.md`

Single-file 15-LOC fix in `orderTransform.js:382-393`. Read that doc, apply diff, lint, run QA scenarios listed in its Section 7.

---

# Suggested implementation order (lowest-risk first)

| Order | Issue | Why first | Estimated time |
|---|---|---|---|
| 1 | **5** (variations bug) | Already fully documented; clear single-file fix; unblocks order-edit flow which is widely used | 15 min + QA |
| 2 | **2** (address autofill) | Tiny, isolated, no cross-cutting concerns | 10 min |
| 3 | **3a** (SC gate) | Self-contained 3-line fix at 3 sites; clear scope | 20 min + QA |
| 4 | **3b + 3c** (KOT/Bill gate + dead checkbox) | Bundle these — they share state plumbing; inseparable in practice | 45 min + QA |
| 5 | **1** (dynamic price + customisation) | Needs product confirmation on Option B vs C; 30-40 LOC across 2 files | 1.5 hr + QA |
| 6 | **3d** | Blocked on user logs; resolve when logs arrive | TBD |
| 7 | **4** | Blocked on backend; no FE work | 0 (FE) |

---

# Open questions summary

| Q | Owner |
|---|---|
| Issue 1: Option B (two-modal sequence) or Option C (inline price field)? | Product / user |
| Issue 3b: Is `aggregator_auto_kot` universal or aggregator-only? Field-name confirmation needed. | Backend |
| Issue 3d: Console logs from user reproducing prepaid Place+Pay. | User |
| Issue 4: F-1 (remove auto-print) or F-2 (add opt-in flag)? | Product + Backend |

---

# Files to NOT change

- ❌ `socketHandlers.js` (already patched in this session for prepaid-Settle bug; do not touch).
- ❌ `OrderContext.jsx` / `TableContext.jsx` — no logic change needed for any issue here.
- ❌ Backend payload contract (except where backend itself coordinates).
- ❌ `index.js` / React.StrictMode.
- ❌ Test fixtures unless the new behaviour requires it.

---

# Implementation Agent instruction (TL;DR)

1. Read this doc fully.
2. Re-read the mandatory pre-reads.
3. For each approved issue (2, 3a, 5), apply the diff exactly as documented.
4. For Issue 1, ask user for Option B/C confirmation before coding.
5. For Issues 3b + 3c, treat as a bundle.
6. For Issue 3d, wait for user logs and re-investigate based on the matched category.
7. For Issue 4, file a backend ticket; do not patch frontend.
8. Lint each modified file (`eslint frontend/src/...`).
9. Verify hot-reload compile (`webpack compiled with N warnings` should be unchanged).
10. Run the QA scenarios in each issue's section.
11. Hand off to QA with a single combined update note appended to the QA bundle doc.
