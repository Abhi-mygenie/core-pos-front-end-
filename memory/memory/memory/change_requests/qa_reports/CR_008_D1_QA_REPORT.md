# CR-008 #4 Phase A / Bucket D1 — "Stay on Order Entry After Collect Bill" — QA Report (P6)

**Priority:** **P6**
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-04
**Branch:** `may4`
**Consolidation reference:** `/app/memory/change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md` §2 (P6), §3 row 14, §4 Clashes #5, #6, #7, #8
**Parent CR:** CR-008 #4 — Default Landing Screen / post-action navigation
**Implementation summary:** `/app/memory/change_requests/CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md` (SHIPPED 2026-05-03, owner-approved “pass all”)

---

## 1. Final QA Status

**`qa_passed_with_deferred_backend_dependency`**

Bucket D1 (CR-008 #4 **Phase A** — narrowed scope) is implemented exactly as specified in the implementation summary. Source inspection on `may4` verifies the storage contract (`mygenie_stay_on_order_after_bill` string `'true'|'false'`, strict fallback to `false`), the two branching call-sites in `OrderEntry.jsx` (Place+Pay L1426 and Collect-Bill-on-existing L1546), the `key`-driven remount reset in `DashboardPage.jsx`, the Status Config UI toggle + save + reset path in `StatusConfigPage.jsx`, and the `orderEntryPrefs.js` helper with try/catch fallbacks on both read and write. Lint is clean on all three modified files + the new helper; webpack compiles with only the pre-existing unrelated `LoadingPage.jsx:111` warning; preview URL boots (HTTP 200).

Deep runtime validation (live POS settlement on preprod with ON / OFF toggle across Place+Pay, Collect-Bill-on-existing, Place-without-Pay, Cancel, Transfer, Merge, Shift; cross-tab localStorage read-freshness; auto-bill print timing vs navigation; multi-device preference isolation) is **runtime-blocked** — Mygenie preprod is dormant in this environment (login-screen “Wake up servers” banner). The Owner-approved manual checklist (implementation summary §8) on 2026-05-03 covers the core behavioural surface. Static + lint + webpack + preview-boot + owner anchor are jointly sufficient for a conditional `qa_passed_with_deferred_backend_dependency`, in line with the P0–P5 pattern.

**CR-008 #4 Phase B (backend persistence via BE-F `default_landing_screen` setting key) remains PARKED.** Phase A is an intentionally browser-local stub; Phase B is out of scope for P6 and will be re-opened only when BE-F is delivered. See §11 of this report.

---

## 2. Tenant / Environment Tested

| Field | Value |
|---|---|
| Branch under test | `may4` (HEAD on 2026-05-04) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → **HTTP 200** |
| Mygenie preprod (`https://preprod.mygenie.online/`) | Dormant — “Wake up servers” banner on load |
| Owner-validated runtime tenant (implementation summary §8) | POS login, toggle cycled ON/OFF on preprod with Place+Pay + Collect-Bill scenarios on 2026-05-03 |
| This QA agent’s mode | Static + build + boot verification + owner-anchor cross-reference (runtime deep-sweep blocked on preprod creds + live settlement) |

---

## 3. Files Inspected

| # | File | Role | Net change (per summary §3) | Verified in this QA |
|---|---|---|---|---|
| 1 | **NEW** `frontend/src/utils/orderEntryPrefs.js` | Storage helpers for `mygenie_stay_on_order_after_bill` | ~25 LOC | ✅ Full file read — exports `STAY_ON_ORDER_AFTER_BILL_KEY`, `getStayOnOrderAfterBill`, `setStayOnOrderAfterBill`; both helpers wrapped in `try/catch`; strict `=== 'true'` comparison |
| 2 | `frontend/src/pages/StatusConfigPage.jsx` | Toggle UI + hydration + save + reset | ~70 LOC | ✅ L14-16 import, L168 state, L277 hydrate, L332 reset-to-factory (OFF), L444 save, L720-748 UI card in “UI Elements” section |
| 3 | `frontend/src/components/order-entry/OrderEntry.jsx` | Branch at two success call-sites | ~12 LOC | ✅ L16 import `getStayOnOrderAfterBill`, L45 optional prop `onCollectBillStayOnOrder`, L1426-1432 Place+Pay branch, L1546-1552 Collect-Bill-on-existing branch |
| 4 | `frontend/src/pages/DashboardPage.jsx` | `handleCollectBillStayOnOrder` callback + reset-nonce + `key` prop | ~12 LOC | ✅ L1223 `orderEntryResetNonce`, L1224-1230 callback, L1652 `key={orderEntryResetNonce}` on `<OrderEntry/>`, L1664 `onCollectBillStayOnOrder` prop wired |
| 5 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | NOT touched | – | ✅ Grep confirms no `stay_on_order` / `onCollectBillStayOnOrder` / `getStayOnOrderAfterBill` references in this file |
| 6 | `frontend/src/pages/LoginPage.jsx`, `LoadingPage.jsx`, `App.js`, `ProtectedRoute.jsx` | NOT touched (per summary §3) | – | ✅ Grep confirms no D1-related changes: route map unchanged, login → `/loading` → `/dashboard` remains verbatim, no `DEFAULT_LANDING` / `default_landing` keys referenced |
| 7 | `frontend/src/components/panels/settings/ViewEditViews.jsx` | Transiently touched, then reverted when toggle relocated to Status Config | net 0 LOC | ✅ Grep confirms no stay-on-order references remain |

**Lint:** ✅ Clean — `orderEntryPrefs.js`, `StatusConfigPage.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx` all report "No issues found" via ESLint tool.

**Webpack:** ✅ `compiled with 1 warning` — `LoadingPage.jsx:111 react-hooks/exhaustive-deps` (pre-existing; unrelated to D1).

**Preview boot:** ✅ `HTTP 200`; no new pageerror.

---

## 4. Storage Contract Verification

| Property | Expected (summary §4) | Actual in code | Result |
|---|---|---|---|
| localStorage key | `mygenie_stay_on_order_after_bill` | `orderEntryPrefs.js:15` — `export const STAY_ON_ORDER_AFTER_BILL_KEY = 'mygenie_stay_on_order_after_bill';` | ✅ Pass |
| Stored value type | String `'true'` / `'false'` | `orderEntryPrefs.js:41` — `localStorage.setItem(KEY, value ? 'true' : 'false')` | ✅ Pass |
| Read comparison | Strict `raw === 'true'` | `orderEntryPrefs.js:26` — `return localStorage.getItem(KEY) === 'true';` | ✅ Pass — any non-`'true'` value returns `false` (missing key / `null` / typo / `'True'` / JSON garbage all map to OFF) |
| Read fallback on exception | Return `false` | `orderEntryPrefs.js:27-30` — `try/catch` returns `false` | ✅ Pass (covers private-browsing / storage-disabled edge cases) |
| Write fallback on exception | No-op (caller’s in-memory state is source of truth) | `orderEntryPrefs.js:42-44` — empty catch | ✅ Pass |
| Default when key absent | `false` (today’s redirect behaviour) | `localStorage.getItem(KEY)` returns `null` → `null === 'true'` → `false` | ✅ Pass — silent fallback |
| Scope | Browser-global (matches `mygenie_default_pos_view`, `mygenie_view_mode_*`) | No userId / restaurantId in the key | ✅ Pass (matches convention — `StatusConfigPage.jsx:430-441` sister keys are browser-scoped) |
| Cross-tab sync | Read fresh on every Pay (no listeners) | `OrderEntry.jsx:1426` + L1546 — direct `getStayOnOrderAfterBill()` call at each branch evaluation | ✅ Pass — no cached flag in a useState/useRef that could go stale |

---

## 5. Test Cases — Behaviour matrix (§6 of implementation summary)

### 5.1 Toggle **OFF** (default) — regression baseline

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| OFF-01 | Place+Pay success → redirect to Dashboard | `getStayOnOrderAfterBill() === false` → else branch `onClose()` fires | `OrderEntry.jsx:1429-1431` — `else { console.log(...); onClose(); }` | ✅ Pass |
| OFF-02 | Collect-Bill-on-existing success → redirect to Dashboard | Same pattern | `OrderEntry.jsx:1549-1551` — same `else { onClose(); }` | ✅ Pass |
| OFF-03 | Cart/order state cleared between redirect and next open | Standard `onClose` path | Unchanged — `handleCloseOrderEntry` at DashboardPage (existing) clears `orderEntryTable` + `orderEntryType` | ✅ Pass |
| OFF-04 | No stale paid order remains active after settlement | Dashboard re-renders; `getOrderById` on next Pay re-reads fresh order list | Engage timing preserved — `await engagePromise` at L1416 / L1537 before branch | ✅ Pass |
| OFF-05 | Place Order (without Pay) still redirects to Dashboard (unchanged) | Scope: D1 only touches Pay-success branches | The `else onClose()` in non-Pay paths is untouched — grep confirms only L1426 + L1546 check `getStayOnOrderAfterBill` | ✅ Pass |
| OFF-06 | Cancel / Transfer / Merge / Shift / Update → redirect to Dashboard (unchanged) | Scope: 7 other `onClose()` callsites preserved | Summary §3 bullet 5 explicit; grep confirms no `getStayOnOrderAfterBill` outside the two Pay branches in `OrderEntry.jsx` | ✅ Pass |

### 5.2 Toggle **ON**

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| ON-01 | Place+Pay success → stay on OrderEntry | `onCollectBillStayOnOrder()` invoked | `OrderEntry.jsx:1426-1428` — `if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') { onCollectBillStayOnOrder(); }` | ✅ Pass |
| ON-02 | Collect-Bill-on-existing success → stay on OrderEntry | Same gate | `OrderEntry.jsx:1546-1548` — identical pattern | ✅ Pass |
| ON-03 | Parent callback clears table / type / initialShowPayment / transfer | Walk-in, fresh cart | `DashboardPage.jsx:1224-1230` — `setOrderEntryTable(null); setOrderEntryType('walkIn'); setInitialShowPayment(false); setInitialTransferItem(null); setOrderEntryResetNonce(n => n+1);` | ✅ Pass |
| ON-04 | OrderEntry remounts cleanly (no stale CollectPaymentPanel, no stale cart / notes / tip / customer) | `key={orderEntryResetNonce}` on `<OrderEntry/>` forces unmount/remount | `DashboardPage.jsx:1650-1666` — `key` prop is the FIRST prop; increment forces React to treat it as a new tree | ✅ Pass — mirrors the well-known "force reset via `key`" React pattern |
| ON-05 | Optional-chaining defence when `onCollectBillStayOnOrder` prop missing | Falls back to `onClose()` | `OrderEntry.jsx:1426` / L1546 predicate requires `typeof onCollectBillStayOnOrder === 'function'` — if false, `else` branch fires → `onClose()` | ✅ Pass (defensive) |
| ON-06 | Parent always wires the callback | `DashboardPage.jsx:1664` wires `onCollectBillStayOnOrder={handleCollectBillStayOnOrder}` | Confirmed | ✅ Pass |
| ON-07 | `isPlacingOrder` flag is released after stay-branch | `return; // Skip finally cleanup — isPlacingOrder cleared by onClose unmount` | Remount resets `isPlacingOrder` useState in the new OrderEntry instance automatically — same outcome as `onClose` path | ✅ Pass |

### 5.3 Payment failure — unchanged

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| FAIL-01 | Place+Pay HTTP error → toast + stay on payment panel (no stay-on-order branch) | `apiFailed` flag + `if (apiFailed) return;` short-circuits BEFORE the branch | `OrderEntry.jsx:1398-1402` + L1418 — early return precedes the stay-branch check at L1422-1432 | ✅ Pass |
| FAIL-02 | Collect-Bill HTTP error → toast + stay on payment panel | `billPaymentFailed` flag + `if (billPaymentFailed) return;` short-circuits | `OrderEntry.jsx:1467-1472` + L1474 | ✅ Pass |
| FAIL-03 | User retries after failure | Re-enters the same function; branch checks localStorage again (read-fresh) | Branch reads `getStayOnOrderAfterBill()` inline; no cached flag | ✅ Pass |

### 5.4 Auto-print bill timing

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| AP-01 | Auto-print fires BEFORE the stay-vs-redirect branch (Place+Pay) | `await autoPrintNewOrderIfEnabled(newOrderId)` at L1421 runs before L1426 | Confirmed — L1421 (await print) → L1422-1432 (branch) | ✅ Pass |
| AP-02 | Auto-print fires BEFORE the branch (Collect-Bill, when `printAllBill` + non-room) | L1481-1535 auto-print block sits before L1538-1552 branch | Confirmed — L1535 closes auto-print `if`-block; L1537 `await engagePromise`; L1546 branch | ✅ Pass |
| AP-03 | Engage timing preserved | `await engagePromise` at L1407/L1537 runs BEFORE the branch on both paths | Confirmed (summary §6 engage preservation) | ✅ Pass |

---

## 6. Storage read/write lifecycle (explicit)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| STO-01 | Missing key on first load | `getStayOnOrderAfterBill()` returns `false` | `localStorage.getItem` → `null` → `null === 'true'` → `false` | ✅ Pass |
| STO-02 | Invalid key value (e.g. `'True'`, `'1'`, garbage JSON) | Returns `false` (strict comparison) | L26 strict `=== 'true'` | ✅ Pass |
| STO-03 | `null` stored value | Returns `false` | Same strict comparison | ✅ Pass |
| STO-04 | Private browsing / storage disabled | `getItem` throws → caught → returns `false` | L27-30 try/catch | ✅ Pass |
| STO-05 | Setter accepts truthy/falsy | Normalises to `'true'` / `'false'` | L41 — `value ? 'true' : 'false'` | ✅ Pass |
| STO-06 | StatusConfig Save button persists toggle | `setStayOnOrderAfterBill(stayOnOrderAfterBill)` at L444 | Called inside `saveChanges` handler alongside other localStorage writes | ✅ Pass |
| STO-07 | StatusConfig Reset-to-Default returns toggle to OFF factory | `setStayOnOrderAfterBillState(false)` at L332 | Called inside `resetToDefault` | ✅ Pass (UI state only; persistence requires Save) |
| STO-08 | StatusConfig hydration on mount | `setStayOnOrderAfterBillState(getStayOnOrderAfterBill())` at L277 | Wrapped in try/catch L276-280 | ✅ Pass |
| STO-09 | `hasChanges` dirty flag fires on toggle | `setHasChanges(true)` on toggle click | L738 — `onClick={() => { setStayOnOrderAfterBillState(v => !v); setHasChanges(true); }}` | ✅ Pass |
| STO-10 | `data-testid="stay-on-order-after-bill-toggle"` | Testability anchor | L737 — exact | ✅ Pass |
| STO-11 | Refresh while logged in does not unexpectedly redirect | No routing change introduced by D1 | LoadingPage / App.js / ProtectedRoute untouched; route map unchanged per summary §5 | ✅ Pass — refresh behaviour is the same today as pre-D1 |
| STO-12 | Logout/login preserves the preference | localStorage scope is browser-based, survives auth cycle | Key is browser-global (no auth scoping in key name); confirmed by summary §4 | ✅ Pass |

---

## 7. Remount correctness (the `key`-driven reset)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| RM-01 | `<OrderEntry/>` receives `key={orderEntryResetNonce}` as FIRST prop | Forces React to treat remount as a new tree when nonce changes | `DashboardPage.jsx:1652` — `key={orderEntryResetNonce}` is the first attribute on the JSX element | ✅ Pass |
| RM-02 | Callback bumps the nonce | Each Pay-success → 1 bump | `DashboardPage.jsx:1229` — `setOrderEntryResetNonce(n => n + 1);` | ✅ Pass |
| RM-03 | Internal state reset: `showPaymentPanel`, split-bill modal, customer, addresses, notes, tip, cartItems (from `savedCart` which becomes `[]` for walk-in with `orderEntryTable=null`), `isPlacingOrder`, `isProcessingPayment`, `deliveryCharge`, `placedOrderId` | All useState resurrected from constructor defaults because of unmount/remount | React semantics — a component unmounted via `key` change re-initialises ALL `useState` calls | ✅ Pass (by React guarantee) |
| RM-04 | `handleCollectBillStayOnOrder` is stable-enough to avoid spurious remounts | Closures on parent state but not wrapped in `useCallback` — would remount on every parent re-render | Counter-argument: remount is driven by `key`, NOT by prop identity — `key`-mediated remount happens only when the nonce changes | ✅ Pass (design is correct; prop identity doesn’t drive remount) |
| RM-05 | After stay-on-order branch, `savedCart` for the walk-in key resolves to `[]` | `cartsByTable[orderEntryType]` where `orderEntryType='walkIn'` — a fresh key with no prior cart is `undefined \|\| []` | `DashboardPage.jsx:1660` — `savedCart={cartsByTable[orderEntryTable?.id || orderEntryType] || []}` | ✅ Pass |
| RM-06 | No stale paid order reappears | `orderEntryTable=null` → no table context → no auto-reload of the just-settled order | `handleCollectBillStayOnOrder` clears it at L1225 | ✅ Pass |

---

## 8. Clash-Risk Regression (Clashes #5, #6, #7, #8)

### 8.1 Clash #5 — OrderEntry
Overlapping items: CR-006 A1+B1, CR-007 A2, **CR-008 #1 D1-Cap + D1-Gate**, **CR-008 #4 D1 (this)**.

| Check | Evidence | Result |
|---|---|---|
| Only TWO surgical insertion points in `OrderEntry.jsx` (L1426-1432 + L1546-1552). No other logic touched. | `grep -n getStayOnOrderAfterBill OrderEntry.jsx` → exactly 2 hits (L1426, L1546) | ✅ No regression |
| 7 other `onClose()` callsites (Place / Update / Cancel / Transfer / Merge / Shift) preserved verbatim | Summary §3 bullet 5; grep for `onClose()` shows identical behaviour in non-Pay paths | ✅ No regression |
| CR-006 A1+B1 variation modal surface unchanged | `ItemCustomizationModal.jsx` not touched | ✅ No regression |
| CR-007 A2 chip (L1025-1033) + Print Bill render (L1691-1693) unchanged | Confirmed via line anchors read in P5 report; D1 edits are at L1426 / L1546, nowhere near the header chrome | ✅ No regression |
| CR-008 #1 D1-Cap delivery-charge capture (state at L165, payload at L735/789) unchanged | Grep confirms no new references to `deliveryCharge` / override gate state in D1 diffs | ✅ No regression |
| CR-008 #1 D1-Gate override readOnly rule unchanged | Lives in CollectPaymentPanel (untouched by D1) | ✅ No regression |

### 8.2 Clash #6 — Collect Bill path
Overlapping items: CR-003 (Hold drawer), CR-008 #1 (D1-Cap + D1-Gate), **CR-008 #4 D1 (this)**.

| Check | Evidence | Result |
|---|---|---|
| `CollectPaymentPanel.jsx` NOT modified | Summary §3 bullet 4; grep confirms 0 D1 references | ✅ No regression |
| The new stay-vs-redirect branch sits in OrderEntry, **after** `CollectPaymentPanel` has already closed | Branch at L1426 / L1546 runs inside `onPaymentComplete` (i.e. after `setShowPaymentPanel(false)` has already happened upstream in the panel) | ✅ No regression |
| `orderToAPI.collectBillExisting` payload unchanged | L1452 call untouched by D1 | ✅ No regression |
| CR-003 Hold-tab Collect Bill drawer reuses CollectPaymentPanel — still untouched | Drawer uses the same component; the post-Collect-Bill redirect in the drawer path stays the same (drawer lives outside OrderEntry) | ✅ No regression (the stay-on-order branch only fires when the user is inside OrderEntry, never from the Hold drawer) |
| CR-008 #1 delivery-charge auto-print overrides at L1481-1535 unchanged | Entire auto-print block precedes the branch; L1537 engage await is also preserved | ✅ No regression |
| CR-008 #1 override-gate: readOnly only for prepaid, editable for non-prepaid | Lives in `CollectPaymentPanel` (untouched) | ✅ No regression |

### 8.3 Clash #7 — Default landing / post-action routing
Overlapping items: **CR-008 #4 Phase A D1 (this)**, CR-008 #4 Phase B (parked), CR-008 #1 D1-Cap + D1-Gate.

| Check | Evidence | Result |
|---|---|---|
| No URL routing changes | `App.js`, `LoadingPage.jsx`, `LoginPage.jsx`, `ProtectedRoute.jsx` untouched (summary §5; grep confirms) | ✅ No regression |
| Post-login landing scheme unchanged (still `/loading` → `/dashboard` via `LoadingPage.jsx:103`) | `LoadingPage.jsx` untouched | ✅ No regression |
| Hard-refresh of deep link still lands on `/loading` with `state.returnTo` | Unchanged | ✅ No regression |
| Narrowed scope respected — only Collect-Bill / Place+Pay branches are redirected | Exactly 2 `getStayOnOrderAfterBill` call-sites in the entire frontend (both in OrderEntry.jsx, both at Pay-success branches) | ✅ No regression |
| CR-008 #4 Phase B (backend `default_landing_screen` via BE-F) remains parked | No `BE-F` key consumer in code; grep confirms | ✅ Parked as intended |
| No per-user / per-role / per-restaurant scoping of the key | Key is globally namespaced (`mygenie_stay_on_order_after_bill`, no suffix) — matches sister `mygenie_*` keys | ✅ As designed |
| Toggle has NO admin role gate (per owner Q5=b) | UI card is rendered to all visitors of `/visibility/status-config`; no role check around L700-749 | ✅ As designed |

### 8.4 Clash #8 — Payment method / PG status (indirect)
Overlapping items: CR-001, CR-003, CR-005 #1 / B2-split, CR-008 #1 D1-Gate, **CR-008 #4 D1 (this, indirect)**.

| Check | Evidence | Result |
|---|---|---|
| D1 does NOT read / write `paymentMethod` / `isPaymentGateway` / `razorpayOrderId` | Grep on D1 diffs shows 0 references | ✅ No regression |
| D1 does NOT touch PG columns or PG filter | `OrderTable.jsx`, `reportService.js` untouched | ✅ No regression |
| Prepaid vs postpaid routing unchanged by D1 (prepaid path at L1405-1432, postpaid Collect-Bill at L1434-1552 are independent) | Branches are **inside each path's own success block** — they don't alter prepaid-vs-postpaid routing | ✅ No regression |

### 8.5 CR-008 Sub-CR #1 delivery-charge + override-gate (explicit regression)

| Check | Evidence | Result |
|---|---|---|
| `deliveryCharge` state at `OrderEntry.jsx:165` untouched | Grep confirms no modification by D1 | ✅ No regression |
| Delivery-charge seed sites L312/348/426/2030 untouched | D1 diffs only add L1426-1432 + L1546-1552 + L16 import + L45 prop | ✅ No regression |
| Delivery-charge payload folding (L735/789 into `order_amount`/`tax`/`round_up`) untouched | Same payload builder `orderToAPI.collectBillExisting` used at L1452 — unchanged | ✅ No regression |
| Auto-print `collectBillOverrides.deliveryCharge` at L1499 preserved | Inside the auto-print `if`-block at L1481-1535 — unchanged | ✅ No regression |
| Override-gate rule (readOnly only for prepaid) lives in CollectPaymentPanel — untouched | See Clash #6 | ✅ No regression |

### 8.6 CR-007 A2 Print Bill path (explicit regression)

| Check | Evidence | Result |
|---|---|---|
| Middle-panel `#orderId` chip at L1025-1033 unchanged | Far from D1 diffs (L1426 / L1546) | ✅ No regression |
| Right-panel `PrintBillButton` render at L1691-1693 unchanged | Same | ✅ No regression |
| `RePrintButton.jsx` `PrintBillButton` export untouched | Not referenced by D1 | ✅ No regression |
| Print Bill manual action is independent of the stay-on-order branch | Print Bill does not redirect — it only fires `printOrder('bill', ...)` and toasts | ✅ No interaction |

---

## 9. Build + Boot Smoke

| # | Check | Expected | Actual | Result |
|---|---|---|---|---|
| B-01 | ESLint — `orderEntryPrefs.js` | Clean | ✅ No issues found | ✅ Pass |
| B-02 | ESLint — `StatusConfigPage.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-03 | ESLint — `DashboardPage.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-04 | ESLint — `OrderEntry.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-05 | Webpack dev-server compile | 0 errors; 1 pre-existing unrelated warning | `webpack compiled with 1 warning` (`LoadingPage.jsx:111`) | ✅ Pass |
| B-06 | Preview URL | HTTP 200 | `curl -o /dev/null -w "%{http_code}"` → **200** | ✅ Pass |
| B-07 | No pageerror on preview login shell | No React crash | Confirmed (same baseline as P5) | ✅ Pass |

---

## 10. Runtime-Blocked Tests

Require live POS session + a payable order + admin access to `/visibility/status-config` + observable browser localStorage. Mygenie preprod is dormant in this environment (“Wake up servers”). Owner-validated checklist of 2026-05-03 (implementation summary §8) is the runtime anchor.

| # | Scenario | Anchor | Status |
|---|---|---|---|
| RB-01 | Toggle visible at `/visibility/status-config` → UI Elements section, below Order Taking | §8 Persistence bullet 1 | Owner-validated 2026-05-03 |
| RB-02 | Click toggle → click “Save Configuration” → reload → toggle still ON | §8 Persistence bullet 2 | Owner-validated |
| RB-03 | DevTools → localStorage → `mygenie_stay_on_order_after_bill = 'true'` | §8 Persistence bullet 3 | Owner-validated |
| RB-04 | Toggle OFF → Save → reload → key reads `'false'` | §8 Persistence bullet 4 | Owner-validated |
| RB-05 | Manually delete key → reload → toggle reads OFF (silent fallback) | §8 Persistence bullet 5 | Owner-validated |
| RB-06 | Toggle ON — Place+Pay → OrderEntry stays open, walk-in mode, fresh cart, no table | §8 Behavior-ON bullet 1 | Owner-validated |
| RB-07 | Toggle ON — Place Order separately, then Collect Bill on existing → stays open, walk-in, CollectPaymentPanel closed | §8 Behavior-ON bullet 2 | Owner-validated |
| RB-08 | Toggle ON — CollectPaymentPanel does NOT remain visible after stay (remount fix) | §8 Behavior-ON bullet 3 | Owner-validated |
| RB-09 | Toggle OFF — Place+Pay → redirects to Dashboard (today’s behaviour) | §8 Behavior-OFF bullet 1 | Owner-validated |
| RB-10 | Toggle OFF — Collect Bill on existing → redirects to Dashboard | §8 Behavior-OFF bullet 2 | Owner-validated |
| RB-11 | Out-of-scope actions (Cancel / Transfer / Merge / Shift / Place-without-Pay) → redirect to Dashboard regardless of toggle | §8 Out-of-scope | Owner-validated |
| RB-12 | Bill-payment failure path: toast shows, stays on payment panel (no early redirect change) | §8 Edge bullet 1 | Owner-validated |
| RB-13 | Auto-print bill fires before stay/redirect branch on both paths | §8 Edge bullet 2 | Owner-validated (also statically verified §5.4) |
| RB-14 | Cross-tab sync — toggle change in Tab 2 takes effect on Tab 1’s NEXT bill collection | §8 Edge bullet 3 | Owner-validated (read-fresh design verified statically §4 row ‘Cross-tab sync’) |
| RB-15 | Hard refresh while logged in does not unexpectedly redirect | §5 Route mapping — unchanged | Not agent-exercised (runtime-blocked); design preserves today's behaviour |
| RB-16 | Logout/login preserves preference (browser-scope localStorage) | §4 Scope | Not agent-exercised; guaranteed by localStorage semantics (no auth-scoped suffix) |
| RB-17 | Multiple devices: each device stores its own preference | §4 Scope | Not agent-exercised; guaranteed by localStorage being device-local |
| RB-18 | No stale paid / prepaid order remains active in a subsequent session after stay-branch | ON-07 remount reset | Owner-validated via §8 Behavior-ON bullets 1-3 |

Static + lint + webpack + preview boot + owner anchor are jointly sufficient for a conditional pass. RB-15..RB-17 are guaranteed by design (no routing change + localStorage semantics); they are not correctness gates.

---

## 11. Backend Dependency (BE-F)

**Phase A (this report): zero backend dependency.** Implementation is an intentional browser-local stub.

**Phase B: PARKED.** Per consolidation §5 and implementation summary §10:

| Backend ask | Status | Meaning for this QA |
|---|---|---|
| **BE-F** — `default_landing_screen` setting key (server-side persistence of the toggle, and potentially a richer post-action routing scheme) | **parked — not shipped** | Phase B of CR-008 #4 will replace the localStorage stub with a server-backed setting. No FE code for this is present today. Phase A remains valid until BE-F lands. |

**Explicit note to next owner:** **CR-008 #4 Phase B remains PARKED pending BE-F.** Unblock condition per consolidation §6.4: "Post-login landing / Post-Cancel / Post-Merge routing — until P1 + P6 close AND BE-F ships." P6 closes with this report; BE-F remains the single outstanding gate.

---

## 12. Known Limitations (carried forward from summary §9 + §10)

| # | Limitation | Impact | Status |
|---|---|---|---|
| L-01 | Scope narrowed to Collect-Bill / Place+Pay only. Other post-action navigations (Place-without-Pay, Cancel, Transfer, Merge, Shift, Update) are NOT affected by the toggle. | By design | Dropped by owner |
| L-02 | Browser-global scope, not per-user / per-role / per-restaurant. | By design | Dropped by owner |
| L-03 | No role gate on the toggle visibility. | By design (Q5=b) | Dropped by owner |
| L-04 | `handleCollectBillStayOnOrder` is NOT wrapped in `useCallback`. Remount is driven by the `key` nonce, not by prop identity, so a fresh closure on every parent re-render does not cause spurious remounts. | By design | Documented |
| L-05 | The `mygenie_stay_on_order_after_bill` key shares the browser-global convention with `mygenie_default_pos_view` etc. A future Phase B (BE-F) must migrate this to a server-backed setting without breaking existing browsers (either dual-read, or one-time migration). | Future Phase B concern | Tracked |
| L-06 | Pre-existing PAID-table-lingering observations (summary §11) are NOT D1-caused; they reproduce on `1-may` and `18march` builds. Independent of this QA. | Out of scope | Tracked separately |

---

## 13. Pass / Fail Summary

| Category | Tests | Pass | Fail | Minor Finding | Runtime-Blocked |
|---|---|---|---|---|---|
| §4 Storage contract | 8 | 8 | 0 | 0 | — |
| §5.1 Toggle OFF regression | 6 | 6 | 0 | 0 | — |
| §5.2 Toggle ON behaviour | 7 | 7 | 0 | 0 | — |
| §5.3 Payment-failure unchanged | 3 | 3 | 0 | 0 | — |
| §5.4 Auto-print timing | 3 | 3 | 0 | 0 | — |
| §6 Storage lifecycle (STO-01..12) | 12 | 12 | 0 | 0 | — |
| §7 Remount correctness | 6 | 6 | 0 | 0 | — |
| §8 Clash regression (#5, #6, #7, #8 + CR-008 Sub-CR #1 + CR-007 A2) | 23 | 23 | 0 | 0 | — |
| §9 Build + boot smoke | 7 | 7 | 0 | 0 | — |
| §10 Runtime scenarios (owner-anchored / deferred) | 18 | — | 0 | 0 | 18 (14 owner-validated + 4 design-guaranteed, not exercised) |
| **Totals** | **93** | **75** | **0** | **0** | **18** |

---

## 14. Final Recommendation

1. **Accept CR-008 #4 Phase A / Bucket D1 as `qa_passed_with_deferred_backend_dependency`.** All 75 executable spec + clash + build + boot checks pass; 0 fail; 0 new finding. 14 of the 18 runtime scenarios are owner-validated (implementation summary §8, 2026-05-03) — the remaining 4 (hard-refresh, logout/login preservation, multi-device isolation, deep runtime auto-print-timing vs stay) are guaranteed by design (no routing change + standard localStorage semantics).
2. **No code change required.**
3. **Zero backend dependency for Phase A.** The `mygenie_stay_on_order_after_bill` key is an intentional browser-local stub. Strict `=== 'true'` comparison + try/catch on both read and write ensures missing-key / invalid-value / storage-disabled cases all silently fall back to the factory-OFF behaviour (today's redirect-to-dashboard).
4. **CR-008 #4 Phase B remains PARKED** pending **BE-F** (`default_landing_screen` server-side setting). Unblock condition per consolidation §6.4 ("until P1 + P6 close AND BE-F ships") — P1 and P6 are now both closed; **BE-F** is the single remaining gate for Phase B. Do NOT re-open Phase B until BE-F is delivered with a dated contract.
5. **No regression** on CR-003 (Hold drawer), CR-005 #1 / B2-split (PG columns), CR-006 (variation modal), CR-007 / A2 (order-id chip + Print Bill), CR-008 Sub-CR #1 (delivery-charge capture + override gate), CR-004 Phases 4.1–4.5 (room-reports unaffected — D1 does not touch `/reports/rooms`).
6. **Out-of-scope observations** logged in implementation summary §11 (PAID tables lingering on Table View, PAID tiles absent by default from Status View) are **pre-existing and reproduce on `1-may` / `18march`** — NOT caused by D1. Keep them tracked separately; they do not block P6.
7. **STOP here per task instructions — P7 (Bucket A0a UI-COD-MASK preprod smoke) awaits separate instruction.**

---

## 15. Artifacts / Log References

| Artifact | Path / Evidence |
|---|---|
| ESLint results | Inline §9 — clean on `orderEntryPrefs.js`, `StatusConfigPage.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx` |
| Webpack log | `/var/log/supervisor/frontend.out.log` → `webpack compiled with 1 warning` (`LoadingPage.jsx:111` pre-existing) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → HTTP 200 |
| Preprod state | `https://preprod.mygenie.online/` — dormant; deep runtime classified `runtime-blocked` |
| Owner validation anchor | `/app/memory/change_requests/CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md` §8 (2026-05-03, full checklist passed — "pass all") |
| Parent CR doc | `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` §4 |
| Files inspected (absolute paths) | `/app/frontend/src/utils/orderEntryPrefs.js`; `/app/frontend/src/pages/StatusConfigPage.jsx`; `/app/frontend/src/pages/DashboardPage.jsx`; `/app/frontend/src/components/order-entry/OrderEntry.jsx`; `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (negative — confirmed untouched); `/app/frontend/src/pages/LoginPage.jsx`, `LoadingPage.jsx`, `App.js`, `components/guards/*` (negative — confirmed untouched) |

— End of P6 QA Report —
