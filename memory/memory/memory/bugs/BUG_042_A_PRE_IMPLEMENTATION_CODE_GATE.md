# BUG-042-A — Pre-Implementation Code Gate

> **Sprint:** pos_final_1.0
> **Task type:** Pre-Implementation Code Gate
> **Scope:** BUG-042-A only — Audit Report → Hold tab → Collect Bill payment-method rail cleanup + row-level Collect disable.
> **Locked decision (per owner):**
> - Hold-mode Collect Bill must expose **only** the configured **primary** methods: **Cash / Card / UPI**.
> - Hide: Split, Credit/Tab, To Room, More (dynamic dropdown), any non-primary methods.
> - If none of Cash/Card/UPI are configured for the restaurant, the Hold-row Collect Bill action must be disabled or blocked with a clear message.
> **Status:** Documentation-only — no code changes performed.

---

## 1. Docs Read

### `/app/memory/final/` (baseline rules — read-only)
- `IMPLEMENTATION_AGENT_RULES.md` — High-risk list (L145–158) explicitly includes `CollectPaymentPanel.jsx`. Mandates explicit file-level plan + regression checklist (§§ "Approval gate format", "File-level change plan format", "Additional guardrails").
- `ARCHITECTURE_DECISIONS_FINAL.md` —
  - Rule **API-03**: `CollectPaymentPanel` owns final settlement & payment completion (L116–121). Any change must respect that boundary.
  - Rule **FA-03**: Hotspot files should prefer extraction over inline growth (`CollectPaymentPanel` is named on L72).
  - "Areas that must not be changed casually" lists `OrderEntry + CollectPaymentPanel` transactional/payment/print behavior (L329) and `orderTransform.js` financial payload builders (L330).
- `MODULE_DECISIONS_FINAL.md` — Module 4 (Order Entry / Cart / Payment Workflow): "Preserve the workflow split: `OrderEntry` for order composition/update; `CollectPaymentPanel` for final settlement/payment" (L206). Future change rules require identifying which sub-flow is affected (place-order / update-order / collect-bill / prepaid / split / room / print).
- `CHANGE_REQUEST_PLAYBOOK.md` — Process scaffold; flags **high regression risk** for any change touching `CollectPaymentPanel.jsx` (L168).
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — No open question on Hold-Collect payment-rail restriction.

### Audit + bug docs (BUG-042 family)
- `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md` (v3, Section 3) — Owner-locked rules for BUG-042-A.
- `/app/memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md` — BUG-042-B closed; payment payload not in BUG-042-A scope.
- `/app/memory/bugs/BUG_042_C_SMOKE_SIGNOFF.md` — BUG-042-C closed; socket-handler / status-9 logic not in BUG-042-A scope.
- `/app/memory/bugs/BUG_042_C_IMPLEMENTATION_SUMMARY.md` — Confirms `socketHandlers.js` baseline and no UI-rail intersection.

### Code surfaces inspected (read-only)
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx` (L1–299).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (focus: payment-method section L1674–1799, header imports L1–88, defaults L255).
- `frontend/src/components/reports/OrderTable.jsx` (focus: `isOrderEligibleForRowActions` L243–262, `renderActionsCell` L269–311 Hold branch).
- `frontend/src/pages/AllOrdersReportPage.jsx` (focus: `actionsConfig` builder L737–747, drawer mount L948–957, Hold filter L86–89).
- `frontend/src/config/paymentMethods.js` (PAYMENT_METHODS L36–104, DEFAULT_PAYMENT_LAYOUT L110–114, `filterLayoutByApiTypes` L188–217, `getDynamicPaymentTypes` L226–270).
- `frontend/src/contexts/RestaurantContext.jsx` (`paymentTypes` derivation L73–76, L94–128).

**No baseline conflict found.** No final-doc rule forbids restricting the payment rail by context.

---

## 2. Baseline Conflict Check

| Rule | Source | Compatibility with BUG-042-A |
|---|---|---|
| High-risk file — `CollectPaymentPanel.jsx` | `IMPLEMENTATION_AGENT_RULES.md:149` + `ARCHITECTURE_DECISIONS_FINAL.md:72,329` | ⚠️ Requires explicit file-level plan + regression checklist (provided §§5–6, §10). Change is **additive prop-gated**; default behaviour (no prop) preserved. |
| API-02 (preserve transform-mediated payload shaping) | `ARCHITECTURE_DECISIONS_FINAL.md:113` | ✅ COMPATIBLE — no payload change. BILL_PAYMENT payload still built by `orderTransform.collectBillExisting` unchanged. |
| API-03 (`CollectPaymentPanel` owns final settlement) | `ARCHITECTURE_DECISIONS_FINAL.md:116–121` | ✅ COMPATIBLE — settlement responsibility unchanged; only the *visible* rail is gated. |
| Module 4 — Preserve `OrderEntry` / `CollectPaymentPanel` split | `MODULE_DECISIONS_FINAL.md:206` | ✅ COMPATIBLE — `OrderEntry` flow untouched. |
| "Areas that must not be changed casually" — transactional/payment/print behavior in `OrderEntry + CollectPaymentPanel` | `ARCHITECTURE_DECISIONS_FINAL.md:329` | ✅ COMPATIBLE — selection / submission / totals / tax / SC / discount / split formulas unchanged. Only conditional render of rail buttons. |
| Owner directive — no payload changes (BUG-042-B closed) | Gate task | ✅ Honoured — `orderTransform.collectBillExisting` untouched. |
| Owner directive — no socket / status-9 changes (BUG-042-C closed) | Gate task | ✅ Honoured — `socketHandlers.js` untouched. |
| Owner directive — no Room / To Room normal-flow changes | Gate task | ✅ Honoured — To Room is hidden **only** in Hold-Collect mode; dashboard rail unchanged. |
| Owner directive — no `/app/memory/final/` / `BUG_TEMPLATE.md` updates | Gate task | ✅ Honoured. |
| Module 10 (Reports) — backend owns aggregation; FE owns presentation | `MODULE_DECISIONS_FINAL.md:451–462` | ✅ COMPATIBLE — no fetch/normalization change; only Hold tab UI render. |

**Verdict:** No baseline conflict.

---

## 3. Current Behaviour

### 3.1 Payment-method rail rendering — `CollectPaymentPanel.jsx`

The rail is composed of two visible rows + a dynamic dropdown + To-Room button:

| Region | File:Line | Render rule today | Hold-Collect visibility today |
|---|---|---|---|
| **Row 1** (Primary) | L1684–1719 | `enabledLayout.row1` ⊇ `['cash','upi','card']`, filtered through `filterLayoutByApiTypes` against `restaurantPaymentTypes` | Shows Cash / Card / UPI iff configured. **Already correct.** |
| **Row 2 — Split button** | L1722–1737 | Shown when `enabledLayout.row2.includes('split')` (i.e., `partial` API type present) | ❌ Visible in Hold today (should be hidden). |
| **Row 2 — First dynamic type button** | L1739–1754 | Shown when `dynamicPaymentTypes.length > 0` (e.g., `TAB/credit`, `dineout`, `zomato_gold`, `OTHER`) | ❌ Visible in Hold today (should be hidden). |
| **Row 2 — Dynamic dropdown ("More…")** | L1757–1782 | Shown when `dynamicPaymentTypes.length > 1` | ❌ Visible in Hold today (should be hidden). |
| **Row 2 — To Room button** | L1785–1798 | Shown when `!isRoom && hasRooms && hasPlacedItems` | ❌ Visible in Hold today (the drawer passes `hasPlacedItems={true}` at `CollectBillPanelDrawer.jsx:287`). Should be hidden in Hold-Collect mode. |

**Why too many methods show today:** `CollectBillPanelDrawer` (L264–291) mounts the same `CollectPaymentPanel` instance as the dashboard with **no Hold-context flag**, so every rail rendered by Row 2 / dropdown / To-Room is active subject only to the restaurant's `paymentTypes` configuration and `hasRooms`.

### 3.2 Default `paymentMethod` state — `CollectPaymentPanel.jsx:255`
`useState("cash")`. If Cash is NOT in `enabledLayout.row1`, the initial selection points at an unrendered button. Pre-existing condition (not introduced by BUG-042-A) — addressed only as a safe enrichment in §6 Bucket A1 (auto-select first allowed primary method on mount in Hold mode).

### 3.3 Row-level Collect-Bill button — `OrderTable.jsx`
- Eligibility: `isOrderEligibleForRowActions(order, tabId)` at L243–262. Today the Hold-tab branch (L260) already disables status-8 rows (POS2-005-FU).
- Render: `renderActionsCell(order, 'hold', actionsConfig)` at L287–311. Disable is controlled today by `actionsConfig.isWithinMutationWindow` only (2-day window guard).
- **There is no current branch that disables Collect when no eligible primary payment method is configured.** That is what BUG-042-A adds.

### 3.4 Restaurant payment configuration availability
- **`useRestaurant().paymentTypes`** — array shape `[{id, name, displayName}, ...]`, derived from `restaurant.paymentTypes` (`RestaurantContext.jsx:73–76`). Already wired through bootstrap → loading → restaurant profile. Reliable across the app.
- Already consumed by `CollectPaymentPanel` (L51) and could be consumed by `AllOrdersReportPage` (which already imports `useRestaurant` at L15–124 for currency/features; `paymentTypes` is simply another field of the same destructure).
- **Reliability:** Bootstrap (`Loading & Initial Data Bootstrap Module`, Module 2) seeds it; same source the dashboard uses. No new API needed.
- **Computing row-level eligibility safely:** With `paymentTypes` in `AllOrdersReportPage`, the page can derive a single boolean — `hasEligibleHoldPaymentMethod = restaurantPaymentTypes.some(pt => ['cash','card','upi'].includes(pt.name?.toLowerCase()))` — and pass it into `actionsConfig`. `OrderTable.jsx` is a presentational component and should NOT take a new context dependency; the boolean flows through props only.

---

## 4. Files / Functions Likely to Change

| File | Function / section | Why |
|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Header signature (L9–49); Row 2 render block (L1721–1799); initial `paymentMethod` state (L255) | Add `allowedMethods` prop; gate Split / dynamic-button / dropdown / To-Room render entirely in Hold mode; ensure initial selection respects the gate. |
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | `<CollectPaymentPanel … />` mount at L264–291 | Pass `allowedMethods={['cash','card','upi']}` (Hold-Collect context). No other change to drawer logic. |
| `frontend/src/components/reports/OrderTable.jsx` | `renderActionsCell` Hold branch (L287–311) | Add a disabled-with-tooltip rendering path when `actionsConfig.hasEligibleHoldPaymentMethod === false`. |
| `frontend/src/pages/AllOrdersReportPage.jsx` | Destructure of `useRestaurant` (L124); `actionsConfig` builder (L737–747) | Compute `hasEligibleHoldPaymentMethod` from `paymentTypes`; pass it through `actionsConfig`. |

### Files explicitly NOT touched
- `frontend/src/api/transforms/orderTransform.js` — payment payload (BUG-042-B closed).
- `frontend/src/api/socket/socketHandlers.js` — status-9 (BUG-042-C closed).
- `frontend/src/api/services/*` — no API calls altered.
- `frontend/src/components/order-entry/OrderEntry.jsx` — dashboard Collect-Bill consumer unchanged.
- `frontend/src/contexts/RestaurantContext.jsx` — paymentTypes source already exists.
- `frontend/src/config/paymentMethods.js` — config map unchanged.
- `frontend/src/components/order-entry/PaymentMethodButton.jsx` — unchanged.
- All other report tabs / handlers in `AllOrdersReportPage.jsx`.

---

## 5. Proposed Implementation Buckets

### Bucket A1 — Pass Hold-mode (allowed methods) into `CollectPaymentPanel`
- Add a new optional prop `allowedMethods` (string array). Semantics:
  - `undefined` (current default) → existing behaviour, no change.
  - Array of method ids (e.g., `['cash','card','upi']`) → restrict rendering to those primary methods only; **all Row 2 surfaces are hidden in their entirety**.
- The intersection with `restaurantPaymentTypes` is already performed by `filterLayoutByApiTypes` for Row 1 — Hold mode does NOT bypass that filter. Result: only `intersect(allowedMethods, configured primary methods)` renders.
- Adjust initial `paymentMethod` state default so it auto-picks the first allowed primary method if `cash` is not in the intersection (minor safety; behaviour-preserving for non-Hold callers because they pass no `allowedMethods`).

### Bucket A2 — Hide non-primary methods in Hold mode only
- Gate the **entire Row 2 block** (Split button, first dynamic-type button, dropdown, To-Room button) behind `!isHoldContext` where `isHoldContext = Array.isArray(allowedMethods) && allowedMethods.length > 0`.
- No change to Row 1 logic (Row 1 already filters to `cash/card/upi`).
- No change to existing fall-through behaviour for dashboard (no prop passed).
- `CollectBillPanelDrawer` passes `allowedMethods={['cash','card','upi']}` exactly once.

### Bucket A3 — Row-level Collect disable when no eligible primary method
- `AllOrdersReportPage`:
  - Add `paymentTypes` to the existing `useRestaurant` destructure (L124).
  - Compute `hasEligibleHoldPaymentMethod = (paymentTypes || []).some(pt => ['cash','card','upi'].includes((pt.name || '').toLowerCase()))`.
  - Append `hasEligibleHoldPaymentMethod` to `actionsConfig` for the Hold tab branch (L737–747).
- `OrderTable.jsx`:
  - In the Hold branch of `renderActionsCell` (L287–311), add a disabled fallback when `actionsConfig.hasEligibleHoldPaymentMethod === false` (and `actionsConfig.hasEligibleHoldPaymentMethod` is explicitly defined). Use the existing disabled styling pattern (zinc border / cursor-not-allowed / tooltip).
  - Tooltip message: `"No eligible payment methods configured"` (or owner-preferred phrasing).
  - When `hasEligibleHoldPaymentMethod === undefined` (e.g., other tabs), preserve current behavior.
- Eligibility helper `isOrderEligibleForRowActions` left UNCHANGED (it already handles status-8 / RM / SRM / ROOM / aggregator exclusions). The new disable is a *display* gate that still renders the button (disabled) — same UX pattern as the out-of-window disable.

### Bucket A4 — Tests
- **Unit:** new test file `frontend/src/__tests__/components/order-entry/CollectPaymentPanel.holdMode.test.jsx`.
  - Render with `allowedMethods={['cash','card','upi']}` and full restaurant config (cash + card + upi + TAB + partial + rooms) → Row 1 renders Cash/Card/UPI; Row 2 entirely absent (no Split, no Credit/TAB dynamic button, no More-dropdown, no To-Room).
  - Render with `allowedMethods={['cash','card','upi']}` and only `cash` configured → only Cash button renders; Row 2 still absent.
  - Render with NO `allowedMethods` prop and full config → Row 1 + Row 2 + dropdown + To-Room all render as today (**regression anchor**).
- **Unit:** new test file `frontend/src/__tests__/components/reports/OrderTable.holdDisable.test.jsx`.
  - Hold row + `actionsConfig.hasEligibleHoldPaymentMethod = true` + within window → Collect button renders enabled.
  - Hold row + `actionsConfig.hasEligibleHoldPaymentMethod = false` + within window → Collect button renders **disabled** with tooltip text.
  - Paid row + `actionsConfig.hasEligibleHoldPaymentMethod = false` → Paid row actions unaffected (regression anchor).
- **Integration / E2E (manual):** Audit → Hold → click Collect, verify rail shows Cash/Card/UPI only (per restaurant config); verify dashboard Collect Bill still shows full rail.

---

## 6. Pseudo-Diff (only — no real edits)

### 6.1 `CollectPaymentPanel.jsx` — add `allowedMethods` prop and gate rendering

```diff
 const CollectPaymentPanel = ({ 
   cartItems, 
   total, 
   onBack, 
   onPaymentComplete, 
   ...
   orderNumber = '',
+  // BUG-042-A: when provided, restricts the rail to the listed primary methods
+  // (e.g., ['cash','card','upi']) and hides Row 2 entirely (Split / Credit /
+  // To-Room / dynamic dropdown). When undefined → existing behaviour preserved.
+  allowedMethods,
 }) => {
   ...
-  const [paymentMethod, setPaymentMethod] = useState("cash");
+  // BUG-042-A: if a Hold-mode allowedMethods list is provided and 'cash' is
+  // not in the intersection with restaurantPaymentTypes, fall back to the
+  // first allowed method that IS configured. Dashboard callers (no
+  // allowedMethods prop) keep the existing 'cash' default verbatim.
+  const initialPaymentMethod = useMemo(() => {
+    if (!Array.isArray(allowedMethods) || allowedMethods.length === 0) return 'cash';
+    const configured = allowedMethods.filter(id =>
+      isMethodInApiTypes(id, restaurantPaymentTypes || [])
+    );
+    return configured.includes('cash') ? 'cash' : (configured[0] || 'cash');
+  }, [allowedMethods, restaurantPaymentTypes]);
+  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
   ...
+  // BUG-042-A: hold-mode flag derived from explicit prop only.
+  const isHoldContext = Array.isArray(allowedMethods) && allowedMethods.length > 0;
   ...
   {/* Row 1 — UNCHANGED */}
   ...
-  {/* Row 2: Split + First Dynamic Type + Dropdown */}
-  <div className="grid grid-cols-3 gap-2">
+  {/* Row 2: Split + First Dynamic Type + Dropdown + To Room.
+      BUG-042-A: hidden entirely in Hold-Collect context. */}
+  {!isHoldContext && (
+  <div className="grid grid-cols-3 gap-2">
     {/* Split / first dynamic / dropdown / To-Room sub-blocks UNCHANGED */}
     ...
   </div>
+  )}
```

(Also: ensure `enabledLayout.row1` rendering at L1684–1719 already honours `allowedMethods` ∩ `restaurantPaymentTypes`. Since Row 1 hardcodes `['cash','upi','card']` and intersects with `enabledLayout.row1`, no change is needed there — the existing intersection already satisfies the locked rule.)

### 6.2 `CollectBillPanelDrawer.jsx` — pass the new prop

```diff
       {!isLoading && !loadError && detail && (
         <CollectPaymentPanel
           cartItems={stampPlacedItems(detail.items)}
           total={detail.amount || 0}
           ...
           hasPlacedItems={true}
           isProcessingPayment={isPaying}
           orderType={detail.orderType || 'dineIn'}
           orderNumber={detail.orderNumber || ''}
+          // BUG-042-A: Audit → Hold Collect Bill must expose ONLY primary
+          // methods (Cash / Card / UPI), filtered against the restaurant's
+          // configured paymentTypes. Hides Split / Credit / To-Room / More.
+          allowedMethods={['cash', 'card', 'upi']}
         />
       )}
```

### 6.3 `AllOrdersReportPage.jsx` — surface restaurant configuration into `actionsConfig`

```diff
-  const { restaurant } = useRestaurant();
+  const { restaurant, paymentTypes: restaurantPaymentTypes } = useRestaurant();
   ...
+  // BUG-042-A: per owner directive, Hold Collect Bill exposes only Cash /
+  // Card / UPI. If the restaurant has none of those configured, the Hold-
+  // row Collect Bill action must be disabled at row level with a clear
+  // tooltip — operator can't proceed via Split/Credit/To-Room.
+  const hasEligibleHoldPaymentMethod = useMemo(() => {
+    const types = restaurantPaymentTypes || [];
+    return ['cash', 'card', 'upi'].some(id =>
+      types.some(pt => (pt.name || '').toLowerCase() === id)
+    );
+  }, [restaurantPaymentTypes]);
   ...
   const actionsConfig = (activeTab === 'paid' || activeTab === 'hold')
     ? {
         isWithinMutationWindow,
         canChangeMethod,
         canMarkUnpaid,
         pendingChangeMethodIds,
         onCollectBill: openCollectBillDrawer,
         onChangeMethod: handleChangeMethod,
         onMarkUnpaid: openMarkUnpaidDialog,
+        hasEligibleHoldPaymentMethod,
       }
     : null;
```

### 6.4 `OrderTable.jsx` — disabled-fallback rendering for Hold

```diff
   const {
     isWithinMutationWindow = false,
     canChangeMethod = false,
     canMarkUnpaid = false,
     onCollectBill,
     onChangeMethod,
     onMarkUnpaid,
+    hasEligibleHoldPaymentMethod, // BUG-042-A; undefined ⇒ ungated (no Hold caller)
   } = actionsConfig;
   ...
   if (tabId === 'hold') {
+    // BUG-042-A: when AllOrdersReportPage signals no eligible primary
+    // payment method is configured (Cash/Card/UPI all absent), disable the
+    // Collect Bill row action with a clear tooltip. Window check still
+    // applies as the higher-priority disabler.
+    const noEligibleMethod = hasEligibleHoldPaymentMethod === false;
+    const disabled = !isWithinMutationWindow || noEligibleMethod;
+    const title = !isWithinMutationWindow
+      ? disabledTitle
+      : (noEligibleMethod ? 'No eligible payment methods configured' : 'Collect bill');
     return (
       <button
         type="button"
         onClick={(e) => {
           stop(e);
-          if (!isWithinMutationWindow) return;
+          if (disabled) return;
           onCollectBill?.(order);
         }}
-        disabled={!isWithinMutationWindow}
-        title={isWithinMutationWindow ? 'Collect bill' : disabledTitle}
+        disabled={disabled}
+        title={title}
         data-testid={`row-action-collect-bill-${order.id}`}
         className={`
           inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
-          ${isWithinMutationWindow
+          ${!disabled
             ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer'
             : 'border-zinc-200 text-zinc-400 cursor-not-allowed'}
         `}
       >
         <Receipt className="w-3.5 h-3.5" />
         <span>Collect</span>
       </button>
     );
   }
```

(No change to the Paid branch — `hasEligibleHoldPaymentMethod` only affects Hold.)

---

## 7. What Will NOT Change

### 7.1 Inside `CollectPaymentPanel.jsx`
- ✋ Row 1 rendering logic (Primary methods).
- ✋ Bill summary, tax/SC/discount/round-up/tip math.
- ✋ Split-payment internal logic (still works when consumed without `allowedMethods`).
- ✋ Cash quick-pills, Card txn-id, TAB customer info, transferToRoom flow, dynamic dropdown logic.
- ✋ Pay button submission path.
- ✋ Auto-bill-print toggle / `onPrintBill` handling.
- ✋ Existing `useEffect` for room fresh-fetch.

### 7.2 Outside `CollectPaymentPanel.jsx`
- ✋ `OrderEntry.jsx` — dashboard Collect Bill consumer is unchanged.
- ✋ `orderTransform.collectBillExisting` — BUG-042-B closed; `grant_amount` payload preserved.
- ✋ `socketHandlers.js` — BUG-042-C closed; status-9 logic preserved.
- ✋ `reportService.getHoldOrders` / `reportTransform.holdOrder` — Audit Hold data fetch unchanged.
- ✋ `transferToRoom` builder / `/order-shifted-room` endpoint — Room flow unchanged outside Hold mode.
- ✋ `buildBillPrintPayload` / `/order-temp-store` — print payload unchanged.
- ✋ `RestaurantContext.jsx` — no changes; `paymentTypes` consumed via existing derivation.
- ✋ `paymentMethods.js` config — `PAYMENT_METHODS`, `DEFAULT_PAYMENT_LAYOUT`, `filterLayoutByApiTypes`, `getDynamicPaymentTypes` all preserved.
- ✋ `isOrderEligibleForRowActions` — POS2-005-FU status-8 disable preserved; aggregator/RM/SRM/ROOM exclusions preserved.
- ✋ Other report tabs (All / Paid / Cancelled / Credit / Merged / Running / Aggregator / Audit) — no behaviour change.

### 7.3 Other BUG-042 sub-buckets
- ✋ BUG-042-B (`grant_amount` rename) — closed; payload not touched.
- ✋ BUG-042-C (status-9 socket-handler clear) — closed; socket logic not touched.

### 7.4 Documentation
- ✋ `/app/memory/final/*` — read-only.
- ✋ `/app/memory/BUG_TEMPLATE.md` — read-only.

---

## 8. Risk Analysis

### 8.1 Dashboard Collect Bill regression
| Dimension | Assessment |
|---|---|
| **Probability** | Very Low |
| **Reason** | `allowedMethods` is an additive optional prop; dashboard caller (`OrderEntry.jsx`) does **not** pass it. The Row 2 gate predicate `isHoldContext` resolves to `false` when the prop is absent → unchanged render tree for the dashboard. |
| **Mitigation** | Dedicated regression unit test (Bucket A4 case 3). Manual smoke on dashboard Collect Bill (all methods: Cash/Card/UPI/Split/TAB/To-Room). |

### 8.2 Hold Collect Bill rail too restrictive (e.g., legitimate dynamic types missed)
| Dimension | Assessment |
|---|---|
| **Probability** | Owner-directive locked: Hold mode allows only primary Cash/Card/UPI |
| **Reason** | The owner explicitly enumerated the allowed methods (BUG-042 audit v3 §3). The disable-at-row-level fallback handles the "none configured" case explicitly. |
| **Mitigation** | Tooltip text + row-level disable communicate the restriction clearly. |

### 8.3 Row-level disable misfires on other tabs
| Dimension | Assessment |
|---|---|
| **Probability** | Very Low |
| **Reason** | The new `hasEligibleHoldPaymentMethod` flag is read **only** inside the Hold branch of `renderActionsCell`; Paid branch logic unchanged. Default `undefined` semantic keeps prior callers safe. |
| **Mitigation** | Unit test asserts Paid branch unaffected when the flag is false (Bucket A4). |

### 8.4 Mutation-window vs no-eligible-method priority
| Dimension | Assessment |
|---|---|
| **Probability** | Low — both can be true simultaneously |
| **Reason** | If the row is outside the mutation window AND no eligible method, both disable. Tooltip should still be clear. |
| **Mitigation** | Pseudo-diff prefers the window-message when both are true (matches existing precedence and clearer cashier guidance). Owner may flip ordering at code-review time. |

### 8.5 BUG-042-B `grant_amount` regression
| Dimension | Assessment |
|---|---|
| **Probability** | ZERO |
| **Reason** | `orderTransform.collectBillExisting` is not touched. The drawer still calls `orderToAPI.collectBillExisting(...)` exactly as today. |
| **Mitigation** | Cross-check via existing Jest suite (already green post-BUG-042-B). |

### 8.6 BUG-042-C status-9 regression
| Dimension | Assessment |
|---|---|
| **Probability** | ZERO |
| **Reason** | `socketHandlers.js` is not touched. |
| **Mitigation** | Existing `__tests__/api/socket/BUG_042_C_handlers.test.js` and `updateOrderStatus.test.js` remain green. |

### 8.7 Room / To-Room normal flow regression
| Dimension | Assessment |
|---|---|
| **Probability** | ZERO |
| **Reason** | To-Room button is hidden **only** in Hold-Collect context (via `isHoldContext`). Dashboard caller (no prop) renders the button under the existing `!isRoom && hasRooms && hasPlacedItems` rule. `transferToRoom` builder + endpoint + `RoomCheckInModal` all untouched. |
| **Mitigation** | Manual smoke: dashboard To-Room button still appears + transfers successfully. |

### 8.8 Initial payment-method default change in dashboard mode
| Dimension | Assessment |
|---|---|
| **Probability** | ZERO |
| **Reason** | `initialPaymentMethod` resolves to `'cash'` when `allowedMethods` is absent (dashboard) — bit-identical to the current `useState('cash')` literal. |
| **Mitigation** | Unit test asserts default is `'cash'` when no prop is passed. |

### 8.9 Overall regression risk
**LOW.** Additive prop-gated rendering on a high-risk file. Comprehensive unit-test coverage. Single rollback site per touched location. No payload / payment-formula / socket / API change.

---

## 9. Test Plan

### 9.1 Unit tests (Bucket A4)

| # | Scenario | File | Expected |
|---|---|---|---|
| U-1 | `CollectPaymentPanel` rendered with `allowedMethods={['cash','card','upi']}` + restaurant config = Cash + Card + UPI + TAB + partial + rooms | new `CollectPaymentPanel.holdMode.test.jsx` | Row 1 shows Cash / Card / UPI. Row 2 NOT in DOM (no Split / Credit / To-Room / More-dropdown). `data-testid="payment-split-btn"`, `data-testid="payment-transfer-room-btn"`, `data-testid="payment-dynamic-dropdown"` all absent. |
| U-2 | Same, restaurant config = only Cash | new file | Only Cash button renders. Row 2 absent. |
| U-3 | Same, restaurant config = Cash + UPI (no Card) | new file | Cash + UPI render. No Card. Row 2 absent. |
| U-4 | **Regression anchor** — `CollectPaymentPanel` rendered WITHOUT `allowedMethods` (dashboard) + full config | new file | Row 1 + Row 2 + dropdown + To-Room render as today. |
| U-5 | Initial `paymentMethod` state when `allowedMethods=['cash','card','upi']` and Cash NOT configured | new file | `paymentMethod === 'card'` (or first allowed-and-configured method). |
| U-6 | Initial `paymentMethod` state when no `allowedMethods` (dashboard) | new file | `paymentMethod === 'cash'` (regression anchor). |
| U-7 | `OrderTable` Hold row + `actionsConfig.hasEligibleHoldPaymentMethod = true` + within window | new `OrderTable.holdDisable.test.jsx` | Collect button renders enabled; tooltip = "Collect bill". |
| U-8 | `OrderTable` Hold row + `actionsConfig.hasEligibleHoldPaymentMethod = false` + within window | new file | Collect button disabled; tooltip = "No eligible payment methods configured". `onCollectBill` not invoked on click. |
| U-9 | `OrderTable` Hold row + window=false + `hasEligibleHoldPaymentMethod = false` | new file | Disabled; tooltip prefers window message (current precedence). |
| U-10 | **Regression** — `OrderTable` Paid row + `hasEligibleHoldPaymentMethod = false` | new file | Paid actions (Change Method, Mark Unpaid) unaffected. |
| U-11 | **Regression** — `OrderTable` Hold row + `hasEligibleHoldPaymentMethod = undefined` (e.g., a future call site that forgets to set it) | new file | Collect button renders enabled (window-only gate), matching current behaviour. |

### 9.2 Manual / preprod functional tests

| # | Scenario | Expected |
|---|---|---|
| F-1 | Restaurant configured with Cash + Card + UPI + TAB + Partial + Rooms. Open Audit → Hold → click Collect on a row. | Drawer opens. Rail shows Cash, Card, UPI only. No Split, no Credit, no To Room, no More-dropdown. |
| F-2 | Same restaurant: open dashboard, click Collect Bill on a running order. | Rail shows Cash / Card / UPI / Split / TAB (dynamic) / To-Room (when rooms exist) — as today. **Regression anchor.** |
| F-3 | Restaurant configured with only Cash. Open Audit → Hold → Collect. | Rail shows only Cash. |
| F-4 | Restaurant configured with TAB + Partial only (no Cash/Card/UPI). | Audit → Hold tab row: Collect button rendered **disabled** with tooltip "No eligible payment methods configured". Clicking does nothing. |
| F-5 | F-4 restaurant: dashboard Collect Bill on running order. | Rail unaffected — still shows TAB + Split as today. |
| F-6 | Hold-tab Collect → Cash → Pay successfully. | BUG-042-B `grant_amount` payload still emitted (verify via network panel). Order moves Hold → Paid on refetch. **BUG-042-B regression anchor.** |
| F-7 | Transfer-to-Room normal flow (dashboard → Collect Bill → To-Room → pick room → Pay). | Unchanged. **Room regression anchor.** |
| F-8 | Backend emits `f_order_status === 9` after Hold-tab Collect Bill completes (Status-9 → 6 transition via socket). | Order disappears from running dashboard as designed (BUG-042-C). Audit → Hold tab still reflects via independent fetch. **BUG-042-C regression anchor.** |
| F-9 | Hold-tab row outside the 2-day mutation window. | Collect button disabled with window tooltip (existing behaviour). |
| F-10 | Hold-tab row with `fOrderStatus === 8` (POS2-005-FU). | Action cell suppressed entirely via `isOrderEligibleForRowActions` (existing behaviour). |

### 9.3 Static / lint
- `yarn lint` clean on the 4 touched files.
- `grep "allowedMethods" CollectPaymentPanel.jsx` returns exactly the prop destructure + the `isHoldContext` derivation + (if present) the initial-state computation.
- `grep "hasEligibleHoldPaymentMethod" OrderTable.jsx AllOrdersReportPage.jsx` returns the expected sites only.

---

## 10. Owner Approval Gate

### Approval Gate (per `IMPLEMENTATION_AGENT_RULES.md §46`)
- **Request Summary:** Restrict the Audit Report → Hold tab's Collect Bill payment rail to configured Cash/Card/UPI only (hide Split, Credit/Tab, To Room, More-dropdown). When none of those are configured for the restaurant, disable the Hold-row Collect Bill action with a clear tooltip. Normal dashboard Collect Bill rail remains unchanged.
- **Change Type:** UI-only / payment-method availability gating. Additive props + presentational conditional rendering. No payload, no socket, no API, no formula, no backend.
- **Affected Module(s):**
  - Module 4 (Order Entry / Cart / Payment Workflow) — `CollectPaymentPanel.jsx` rail-render only.
  - Module 10 (Reports / Audit / Summary) — `AllOrdersReportPage.jsx` `actionsConfig` + `CollectBillPanelDrawer.jsx` prop pass + `OrderTable.jsx` row-action render only.
- **Primary Files to Change:**
  1. `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (3 small additive edits — prop, isHoldContext derivation, Row 2 gate; optional initial-state refinement).
  2. `frontend/src/components/reports/CollectBillPanelDrawer.jsx` (1 prop pass).
  3. `frontend/src/components/reports/OrderTable.jsx` (1 disabled-fallback branch in Hold actions cell).
  4. `frontend/src/pages/AllOrdersReportPage.jsx` (destructure `paymentTypes`, compute `hasEligibleHoldPaymentMethod`, surface in `actionsConfig`).
- **Related APIs:** None changed. Drawer still POSTs `BILL_PAYMENT` with `orderTransform.collectBillExisting` payload (BUG-042-B `grant_amount` preserved).
- **State Impact:** `CollectPaymentPanel` local state (`paymentMethod`) default unchanged for dashboard; in Hold mode, falls back to first allowed-AND-configured method if Cash is not configured. No context / localStorage / engage-lock changes.
- **UI Impact:** Hold-Collect drawer rail simplifies to Cash/Card/UPI only (subject to config). Hold-tab row Collect button gains a disabled state when no eligible primary method is configured.
- **Regression Risks:** LOW (see §8). High-risk file `CollectPaymentPanel.jsx` touched **only** via additive prop-gated rendering; dashboard caller passes no prop → behaviour identical.
- **Open Decision Dependencies:** None. Owner directives captured in audit v3 §3 (BUG-042-A) and this gate.
- **Safe to Implement Without Owner Clarification?** YES — pending this gate's approval signal.

### Confirmation: gate produces no code changes
- ❌ No code modified.
- ❌ No files created outside this gate doc.
- ❌ `/app/memory/final/` untouched.
- ❌ `BUG_TEMPLATE.md` untouched.
- ✅ Gate doc created at `/app/memory/bugs/BUG_042_A_PRE_IMPLEMENTATION_CODE_GATE.md`.

---

## Final Verdict

**`ready_for_owner_code_gate_review`** ✅

All preconditions met:
- Four primary edit sites identified with file + line precision.
- Source of restaurant payment configuration confirmed reliable (`useRestaurant().paymentTypes` already wired through bootstrap).
- Pseudo-diff drafted; risk analysis covers dashboard rail, Hold rail, row-level disable, Room flow, BUG-042-B payload, BUG-042-C socket logic.
- Baseline rules honoured (high-risk-file protocol for `CollectPaymentPanel.jsx`, Module 4 split, Module 10 presentation-only).
- Owner directives honoured: only Cash/Card/UPI in Hold mode; hide Split/Credit/ToRoom/More; row-level disable when none configured; no payment payload changes; no socket / status-9 changes; no Room normal-flow changes; no `/app/memory/final/` / `BUG_TEMPLATE.md` updates; no backend / API changes; no formula changes.
- 11-case unit-test matrix + 10-case preprod functional matrix specified.
- Rollback procedure trivial (one disable-branch per touched location, one prop default to drop).

Awaiting owner approval to proceed to implementation.

---

*End of BUG-042-A Pre-Implementation Code Gate.*
