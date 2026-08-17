# Post-Action Navigation OrderEntry — Automated QA Report

> **CR:** POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026)
> **Date:** 2026-01-16
> **QA Type:** Static-trace + pure-function algorithm validation + working-tree integrity + lint
> **Scope:** Validate only OrderEntry-internal actions. Card-level / dashboard / popup actions explicitly out of scope (must remain unchanged).
> **No production source modified. No git writes. Harness lives in `/tmp/qa_oe_nav/`.**

---

## 1. Verdict

**PASS** — **48 / 48 automated checks green.**

| Layer | Checks | Result |
|---|---|---|
| Helper shape & isolation (definition, not-exported, import intact) | 3 | ✅ |
| Eight in-scope callsite conversions (Place / Update / TransferFood / Merge / Shift / Cancel Item / Cancel Order / Transfer-to-Room) | 9 | ✅ |
| Transfer-to-Room manual reset block deleted; payload builder + HTTP call intact | 2 | ✅ |
| Pre-existing Place+Pay / Collect Bill branches untouched; `onClose()` count = 3 | 3 | ✅ |
| Failure-path guards preserved per callsite | 8 | ✅ |
| Working-tree integrity — only OrderEntry.jsx changed | 1 | ✅ |
| 10 sibling files untouched (Dashboard / cards / popup / panel / utils / transforms) | 10 | ✅ |
| Payload builder exports preserved (`transferToRoom`, `cancelOrder`, `mergeTable`, `shiftTable`) | 4 | ✅ |
| Card-level handlers (`handleCancelOrder` / `handleMarkReady` / `handleMarkServed`) still no-nav; helper not referenced from DashboardPage | 4 | ✅ |
| Algorithm-port fixture cases (toggle ON/OFF × callback present/missing) | 4 | ✅ |
| ESLint on `OrderEntry.jsx` | 1 | ✅ clean |

Live wall-clock smoke against an actual POS test tenant (placing real orders × 8 actions × 2 toggle states) is **owner-required** — see §11.

---

## 2. Harness

Single file: `/tmp/qa_oe_nav/run.mjs`. Plain `node`; no Jest, no source mutation. Run:

```
node /tmp/qa_oe_nav/run.mjs
→ "--- 48/48 passed ---", exit 0
```

The harness reads `OrderEntry.jsx`, `DashboardPage.jsx`, both transform files, and sibling files via `fs`. It also queries `git diff HEAD~1 HEAD -- <path>` for each protected sibling to confirm no last-commit changes. (Platform auto-commits after each edit, so the most-recent commit's file list is the authoritative diff.)

---

## 3. Toggle OFF Results (default)

All eight in-scope actions, when invoked from inside OrderEntry, fall through `navigateAfterOrderAction()` → `onClose()` (today's redirect-to-Dashboard).

| # | Action | Static-trace evidence | Algorithm fixture | Result |
|---|---|---|---|---|
| OFF-1 | Place Order | `OrderEntry.jsx` line 907: `setIsPlacingOrder(false); navigateAfterOrderAction(); return; // Exit early` — sits inside post-engage success branch, downstream of HTTP `.catch` toast | Fixture `9.2`: toggle=false, callback present → `onClose` count=1, `stay` count=0 | ✅ |
| OFF-2 | Update Order | `OrderEntry.jsx` line 912: `// Redirect to dashboard (for Update Order path)\n      navigateAfterOrderAction();` — gated by `if (apiFailed) return;` at L809 | Same fixture | ✅ |
| OFF-3 | Transfer Food (item) | `OrderEntry.jsx` line 948: `console.log('[TransferFood] Socket engaged — redirecting to dashboard'); navigateAfterOrderAction();` — `.catch` shows `"Transfer Failed"` toast and does not navigate | Same fixture | ✅ |
| OFF-4 | Merge Tables | line 974: `console.log('[MergeTable] Socket engaged …'); navigateAfterOrderAction();` — `.catch` shows `"Merge Failed"` toast, no nav | Same fixture | ✅ |
| OFF-5 | Shift Table | line 997: `console.log('[ShiftTable] Socket engaged …'); navigateAfterOrderAction();` — `.catch` shows `"Shift Failed"` toast, no nav | Same fixture | ✅ |
| OFF-6 | Cancel Item | line 1027: `setCancelItem(null); navigateAfterOrderAction();` — `.catch` shows `"Cancel Failed"` toast and sets `setIsPlacingOrder(false)`, no nav | Same fixture | ✅ |
| OFF-7 | Cancel Order | line 1055: `toast({ title: "Order Cancelled", … }); navigateAfterOrderAction();` — `.catch` shows `"Cancel Failed"` toast, no nav | Same fixture | ✅ |
| OFF-8 | **Transfer to Room** | line 1468: after successful `await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)` + toast, `navigateAfterOrderAction();` — branch runs ONLY on resolved HTTP success | Same fixture | ✅ |

---

## 4. Toggle ON Results

When `localStorage.mygenie_stay_on_order_after_bill === 'true'` and the parent provides `onCollectBillStayOnOrder` (which it always does — `DashboardPage.jsx:1664` wires it unconditionally), the same 8 callsites route through `onCollectBillStayOnOrder()`. The parent handler (`DashboardPage.jsx:1313-1319`, unchanged by this CR) bumps `orderEntryResetNonce` → React remounts `<OrderEntry/>` via its `key` prop → every internal `useState` resets to constructor defaults (walk-in, empty cart, no table, no payment panel, no customer, no tip, no notes, etc.).

| # | Action | Algorithm fixture | Result |
|---|---|---|---|
| ON-1 | Place Order | Fixture `9.1`: toggle=true, callback present → `stay` count=1, `onClose` count=0 | ✅ |
| ON-2 | Update Order | Same | ✅ |
| ON-3 | Transfer Food (item) | Same | ✅ |
| ON-4 | Merge Tables | Same | ✅ |
| ON-5 | Shift Table | Same | ✅ |
| ON-6 | Cancel Item | Same | ✅ |
| ON-7 | Cancel Order | Same | ✅ |
| ON-8 | **Transfer to Room** | Same | ✅ |

### 4.1 Defensive fallback (toggle ON but callback missing)

Fixture `9.3` exercises the defensive path: toggle=true but `onCollectBillStayOnOrder` is `undefined`. Helper falls through to `onClose()` — matches the same `typeof === 'function'` guard pattern shipped under CR-008 D1 at L1556 and L1677.

| # | Scenario | Result |
|---|---|---|
| ON-Fallback | toggle=true, no callback → `onClose()` (1 call), `stay` (0 calls) | ✅ |
| OFF-Fallback | toggle=false, no callback → `onClose()` (1 call) | ✅ |

---

## 5. Transfer-to-Room Result

✅ **PASS** — three concurrent validations.

### 5.1 Manual reset block deleted

| Verification | Evidence |
|---|---|
| Old comment `"Prepaid cleanup — stay on order screen"` absent | grep returns 0 hits |
| Old `setDeliveryCharge(0)` inside Transfer-to-Room branch absent | regex `ORDER_SHIFTED_ROOM[\s\S]{0,500}setDeliveryCharge\(0\)` returns no match |
| Old 9-setter block (`setCartItems([])`, `setShowPaymentPanel(false)`, `setPlacedOrderId(null)`, `setOrderFinancials(...)`, `setDeliveryCharge(0)`, `setOrderNotes([])`, `setCustomer(...)`, `onSelectTable(null)`, `onOrderTypeChange('walkIn')`) inside the Transfer-to-Room branch | All deleted; replaced with explanatory CR comment + `navigateAfterOrderAction()` call |

### 5.2 Payload + HTTP call byte-intact

| Verification | Evidence |
|---|---|
| `orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId)` builder call | Present, unchanged |
| `api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload)` HTTP fire | Present, unchanged |
| `orderToAPI.transferToRoom` export in `orderTransform.js` | `transferToRoom:` definition present; file untouched in last commit (`git diff HEAD~1 HEAD -- frontend/src/api/transforms/orderTransform.js` empty) |

### 5.3 Reset semantics preserved across both nav paths

Both replacement paths reset a **strict superset** of the deleted manual block:

| Path | Reset mechanism | Coverage |
|---|---|---|
| Toggle OFF → `onClose()` | Parent's `handleOrderEntryClose` (DashboardPage.jsx) sets `orderEntryTable=null`, `orderEntryType=null`; conditional render at `DashboardPage.jsx:1664` unmounts OE subtree | All 9 manual fields + tip, discounts, walkInTableName, addresses, selectedAddress, splitBill modal state, all other internal `useState` |
| Toggle ON → `onCollectBillStayOnOrder()` | Parent bumps `orderEntryResetNonce` → `key` prop change → React unmounts + remounts → constructor defaults | Same superset |

The `deliveryCharge` constructor default is `0`, so Bucket D1-Cap behaviour (`setDeliveryCharge(0)`) is preserved by both paths.

---

## 6. Dashboard / Card Out-of-Scope Regression Result

✅ **PASS** — no card-level behaviour changed.

### 6.1 File-level diff integrity (last-commit)

Confirmed via `git diff HEAD~1 HEAD -- <path>`:

| File | Diff |
|---|---|
| `DashboardPage.jsx` | **empty** ✅ |
| `CollectPaymentPanel.jsx` | empty ✅ |
| `ScanOrderPopOut.jsx` | empty ✅ |
| `cards/OrderCard.jsx` | empty ✅ |
| `cards/TableCard.jsx` | empty ✅ |
| `dashboard/ChannelColumnsLayout.jsx` | empty ✅ |
| `dashboard/ChannelColumn.jsx` | empty ✅ |
| `utils/orderEntryPrefs.js` | empty ✅ |
| `api/transforms/orderTransform.js` | empty ✅ |
| `api/transforms/tableTransform.js` | empty ✅ |

### 6.2 Card-level handlers still have no nav step

| Handler | DashboardPage.jsx line | Verified | Result |
|---|---|---|---|
| `handleCancelOrder` (opens CancelOrderModal only) | 1206-1208 | Regex `useCallback\(\(tableEntry\) => \{ setCancelOrderEntry\(tableEntry\); \}, \[\]\)` matches | ✅ unchanged |
| `handleCancelOrderConfirm` (fires API, awaits removal, no nav) | 1211-1229 | Body retained verbatim; no `onClose()` / `navigate()` | ✅ unchanged |
| `handleMarkReady` (fires `updateOrderStatus('ready')`, no nav) | 1349-1359 | No `onClose()` / `navigate()` in body | ✅ unchanged |
| `handleMarkServed` (fires API or `completePrepaidOrder`, no nav) | 1362-1382 | No `onClose()` / `navigate()` in body | ✅ unchanged |
| `handleItemStatusChange` (per-item PUT, no nav) | 1385+ | Untouched in last commit | ✅ unchanged |
| `handleBillClick` (opens OE in Collect-Bill mode) | 1335-1338 | Entry path unchanged; OE-exit governed by Scenario 1 toggle branch, which was already wired under CR-008 D1 | ✅ unchanged |
| `handleFoodTransfer` (opens OE with transfer armed) | 1341-1346 | Entry path unchanged | ✅ unchanged |
| `handleConfirmOrder` (scan accept → opens OE) | 1190+ | Entry path unchanged | ✅ unchanged |
| `handleCancelOrderFromCard` (scan reject → opens CancelOrderModal) | 1403+ | Routes to `handleCancelOrder` modal flow; no nav step | ✅ unchanged |
| `ScanOrderPopOut.jsx` Accept / Reject / View handlers | — | File diff empty | ✅ unchanged |

### 6.3 Helper isolation proof

`navigateAfterOrderAction` is a local closure inside the `OrderEntry` functional component. Confirmed via:

- It is **not** exported (`grep -E "export.*navigateAfterOrderAction"` → 0 hits).
- It is **not** referenced from `DashboardPage.jsx` (`grep navigateAfterOrderAction DashboardPage.jsx` → 0 hits).
- It is **not** referenced anywhere outside `OrderEntry.jsx`.

Therefore card-level handlers, popup handlers, channel-column handlers, etc. cannot reach the helper. Their navigation behaviour (or lack thereof) is byte-identical to before this CR.

---

## 7. Payload / Calculation / Backend Regression Result

✅ **PASS** — no payload, calculation, backend, or env change.

| Surface | Verification | Result |
|---|---|---|
| Backend files | Out-of-scope; no edits | ✅ unchanged |
| `orderToAPI.placeOrder` builder | `api/transforms/orderTransform.js` diff empty | ✅ unchanged |
| `orderToAPI.updateOrder` builder | Same file untouched | ✅ unchanged |
| `orderToAPI.cancelItem` / `cancelOrder` builders | Same | ✅ unchanged |
| `orderToAPI.transferToRoom` builder | Same | ✅ unchanged |
| `orderToAPI.placeOrderWithPayment` (Scenario 2 builder) | Same | ✅ unchanged |
| `orderToAPI.buildBillPrintPayload` (auto-print bill) | Same | ✅ unchanged |
| `tableToAPI.transferFood` / `mergeTable` / `shiftTable` builders | `api/transforms/tableTransform.js` diff empty | ✅ unchanged |
| `CollectPaymentPanel.jsx` (room picker, "To Room" tile, `paymentData.isTransferToRoom` flag, button label) | Diff empty | ✅ unchanged |
| VAT / service charge / tip / delivery charge **calculation** | No edits to `calcOrderTotals`, `applyRoundOff`, or any `taxAmount` / `serviceTax` / `tipAmount` / `deliveryCharge` field site | ✅ unchanged |
| Room billing payload | `transferToRoom` builder untouched; `ORDER_SHIFTED_ROOM` endpoint untouched | ✅ unchanged |
| Printer / KOT payloads | `printOrder` / `printer_agent` logic untouched in `orderService.js`; auto-print block in OE untouched | ✅ unchanged |
| CRM | No CRM module touched | ✅ unchanged |
| Order polling (`useOrderPollingReconciliation`) | Untouched | ✅ unchanged |
| Socket handlers | Untouched | ✅ unchanged |
| localStorage key (`mygenie_stay_on_order_after_bill`) | Unchanged; same read helper in `orderEntryPrefs.js` | ✅ unchanged |
| `DashboardPage.jsx:handleCollectBillStayOnOrder` parent handler | Diff empty | ✅ unchanged |

---

## 8. Failure-Path Validation

Eight per-callsite regex assertions confirm each new helper invocation is downstream of an explicit failure short-circuit:

| Callsite | Failure guard | Result |
|---|---|---|
| Update Order | `if (apiFailed) return; // API failed — stay on screen, toast shown` above nav (line ~810) | ✅ |
| Place Order (Scenario 0) | Success branch isolates nav with `setIsPlacingOrder(false); navigateAfterOrderAction(); return; // Exit early`; failure branch in outer `catch` only sets state + shows toast | ✅ |
| Transfer Food | `.catch` shows `"Transfer Failed"` toast; no nav inside the `.catch` block | ✅ |
| Merge | `.catch` shows `"Merge Failed"` toast; no nav | ✅ |
| Shift | `.catch` shows `"Shift Failed"` toast; no nav | ✅ |
| Cancel Item | `.catch` shows `"Cancel Failed"` toast and sets `setIsPlacingOrder(false)`; no nav | ✅ |
| Cancel Order | `.catch` shows `"Cancel Failed"` toast; no nav | ✅ |
| Transfer to Room | Nav lives strictly **after** `const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);` — if the `await` throws, control jumps to the outer Scenario-3/2/1 try/catch which shows a `"Payment Failed"` toast (L1670) and **does not** navigate. | ✅ |

---

## 9. Issues Found

**None.**

After the two harness regex false-negatives were corrected to match the live source structure (auto-commit moved the working-tree diff into HEAD~1; one regex was over-strict on `handleMarkServed`'s closing arg list), all 48 assertions are green on the first re-run.

---

## 10. Strict-Rules Compliance

| Rule | Status |
|---|---|
| No code changes (this QA session) | ✅ Only `/tmp/qa_oe_nav/run.mjs` + this report created |
| No commits | ✅ (Platform auto-commits implementation, but no QA-driven commits) |
| No backend changes | ✅ |
| No payload changes | ✅ |
| No dashboard / card action changes | ✅ All 10 sibling diffs empty |
| No calculation changes | ✅ |
| No popup changes | ✅ `ScanOrderPopOut.jsx` diff empty |
| Test of card/popup actions confirms unchanged behaviour | ✅ Static + diff confirmation |

---

## 11. Owner Live Smoke Required

The deterministic harness exhausts the OrderEntry contract layer for all 8 actions × 2 toggle states + defensive fallback paths. The following wall-clock / multi-action live scenarios remain owner-driven against a real POS test tenant (these require placing actual orders and observing socket / engage timing end-to-end):

| # | Live scenario | Toggle | What to observe |
|---|---|---|---|
| L-1 | Place Order (no pay) from OrderEntry | OFF | Returns to Dashboard after engage socket arrives. |
| L-2 | Place Order (no pay) | ON | Stays on OE, walk-in fresh cart (remount visible). |
| L-3 | Update Order on existing order | ON / OFF | Same expectation pair. |
| L-4 | Transfer Food (item) from OE Transfer modal | ON / OFF | Same. |
| L-5 | Merge Tables from OE Merge modal | ON / OFF | Same. |
| L-6 | Shift Table from OE Shift modal | ON / OFF | Same. |
| L-7 | Cancel Item from OE Cancel-Item modal | ON / OFF | Same. |
| L-8 | Cancel Order from OE Cancel-Order modal | ON / OFF | Same. |
| L-9 | **Transfer to Room** with `paymentMethod='transferToRoom'` from CollectPaymentPanel | OFF | **Redirects to Dashboard** (new behaviour — was hardcoded stay). |
| L-10 | **Transfer to Room** | ON | **Stays on OE via remount** (replaces today's manual reset). |
| L-11 | Place + Pay (Scenario 2) | ON / OFF | **Unchanged** — must behave identically to today. |
| L-12 | Collect Bill on existing order (Scenario 1) | ON / OFF | **Unchanged** — must behave identically. |
| L-13 | API or payment failure for any action | any | Toast shown; cashier remains on OrderEntry's current sub-screen (helper not reached). |
| L-14 | Card-level Cancel Order from order/table card | ON / OFF | **Unchanged** — opens CancelOrderModal, fires API, no nav step. |
| L-15 | Card-level Mark Ready / Mark Served / per-item status | ON / OFF | **Unchanged** — no nav step. |
| L-16 | Scan/Web popup Accept / Reject / View | ON / OFF | **Unchanged** — entry paths only. |
| L-17 | Cross-tab toggle freshness | any | Tab 2 toggle change affects Tab 1's NEXT order action. |
| L-18 | Rapid-fire multi-action cycle (Place → Update → Cancel → Transfer-to-Room) | ON | Cashier stays on OE through every step; remount cleans state. |

In this QA environment the upstream POS test tenant is not available (`preprod.mygenie.online` renders the SaaS admin panel, and our deployed POS frontend's backend dependency is dormant). The deterministic layer is fully covered.

---

## 12. Final Summary

**Contract is functionally correct under deterministic verification:**
- Helper shape locked.
- Eight in-scope callsites converted.
- Transfer-to-Room manual reset block deleted; both nav paths reset a strict superset.
- Two pre-existing toggle-wired branches (Place+Pay, Collect Bill) untouched.
- All failure-path guards preserved.
- Card-level / dashboard / popup / payload / calculation / backend / localStorage-key surfaces all unchanged (10 sibling diffs empty).
- Algorithm-port fixtures exercise toggle ON/OFF × callback present/missing.
- ESLint clean on `OrderEntry.jsx`.

Owner live smoke matrix (§11, 18 scenarios) is the remaining gate before this CR can be marked `closed_after_smoke`.

— End of Automated QA Report —
