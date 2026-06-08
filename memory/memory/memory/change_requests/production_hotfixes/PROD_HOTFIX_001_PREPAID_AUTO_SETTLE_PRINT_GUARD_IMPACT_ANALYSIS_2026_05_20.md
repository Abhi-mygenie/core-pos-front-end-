# PROD-HOTFIX-001 — Prepaid Auto-Settle + Settle Print Guard + PayLater Table Clear Impact Analysis — 2026-05-20

## 1. Purpose

This document is a **production hotfix intake + impact analysis ONLY**.

- No code was changed.
- No implementation was performed.
- No QA was executed.
- No `/app/memory/final/` docs were updated.
- No baseline docs were modified.

The purpose is to document findings from code inspection, identify affected files, flows, risks, and outstanding owner/backend questions for three production bugs before planning or implementing any fix.

---

## 2. Scope

### In Scope
- **PROD-BUG-001** — Auto-settle for prepaid/paid orders
- **PROD-BUG-002** — Settle should not trigger KOT/Bill print
- **PROD-BUG-003** — Pay Later prepaid order served but table/order not cleared

### Out of Scope
- Implementation / code edits
- QA / testing
- Deployment
- `/app/memory/final/` updates
- Baseline doc changes
- Any unrelated POS3.0 bug/CR
- Backend changes (documented as needed only)

---

## 3. Inputs Read

### Baseline Docs (all NOT_FOUND in this environment)
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — **NOT_FOUND**
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` — **NOT_FOUND**
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` — **NOT_FOUND**
- `/app/memory/final/FINAL_DOCS_SUMMARY.md` — **NOT_FOUND**
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` — **NOT_FOUND**
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` — **NOT_FOUND**
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` — **NOT_FOUND**

### Overlay / Sprint Docs (all NOT_FOUND in this environment)
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` — **NOT_FOUND**
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` — **NOT_FOUND**

### Code Files Inspected
1. `components/cards/OrderCard.jsx` — full read
2. `components/cards/TableCard.jsx` — full read
3. `components/cards/DeliveryCard.jsx` — full read
4. `components/cards/DineInCard.jsx` — full read
5. `components/order-entry/CartPanel.jsx` — full read (incl. QsrBillingSection)
6. `components/order-entry/CollectPaymentPanel.jsx` — full read (1400+ lines)
7. `components/order-entry/OrderEntry.jsx` — targeted grep + section reads (auto-print logic, onPaymentComplete handler, prepaid flows)
8. `pages/DashboardPage.jsx` — targeted grep + section reads (handlePrepaidSettleSuccess, handleMarkServed, completePrepaidOrder call sites)
9. `pages/StatusConfigPage.jsx` — full read (Visibility Settings, QSR section, UI Elements)
10. `api/services/orderService.js` — full read (printOrder, completePrepaidOrder)
11. `api/services/deliveryService.js` — full read
12. `api/services/paymentMutationService.js` — full read
13. `api/transforms/orderTransform.js` — targeted grep (collectBillExisting, print_kot, auto_bill, placeOrder payloads)
14. `api/transforms/profileTransform.js` — full read (autoKot, autoBill, feature flags, settings mapping)
15. `api/socket/socketHandlers.js` — targeted grep (no print/settle logic found in handlers)
16. `utils/statusHelpers.js` — full read
17. `utils/qsrModePrefs.js` — full read
18. `utils/orderEntryPrefs.js` — full read
19. `constants/featureFlags.js` — checked for auto-settle (not present)
20. `api/socket/socketHandlers.js` — full read of `handleOrderDataEvent` (L220-351), `handleUpdateFoodStatus` (L370-437), `handleUpdateOrderStatus` (L449-500) — PayLater-specific removal guards, table clear logic
21. `contexts/OrderContext.jsx` — `removeOrder` implementation (L155-170)
22. `contexts/TableContext.jsx` — `updateTableStatus` implementation (L94-136), 'available' clearing logic
23. `api/constants.js` — `ORDER_TO_TABLE_STATUS` map, `F_ORDER_STATUS` map, `PREPAID_ORDER` endpoint
24. `api/transforms/orderTransform.js` — `mapTableStatus`, `paymentStatus`/`paymentType`/`paymentMethod` mapping from API (L220-222)

---

## 4. Plain-English Bug Intake

### PROD-BUG-001 — Auto-settle for prepaid/paid orders

**Issue:** When an order is already prepaid/paid, the cashier still sees a "Settle" button on OrderCard (fOrderStatus 5) and TableCard (fOrderStatus 5) during the delivered/settlement stage. The cashier must manually click "Settle" even though payment is already complete. This adds unnecessary friction for high-volume operations.

**Expected Behavior:** A new "Auto Settle" ON/OFF toggle should be added to Visibility Settings (StatusConfigPage.jsx), near the QSR section. When Auto Settle is ON, already-paid/prepaid orders should auto-settle without requiring manual Settle button clicks. This should apply across all billing/order types where the order is already paid/prepaid and reaches the settlement stage (fOrderStatus 5).

**Impact:** High friction for QSR / counter / delivery workflows where most orders are prepaid. Every prepaid order requires an unnecessary extra click.

**Known Owner Requirement:** Setting location = Visibility Settings near QSR section. Type = ON/OFF toggle. Persistence source of truth needs investigation.

### PROD-BUG-002 — Settle should not trigger KOT/Bill print

**Issue:** Clicking "Settle" on a prepaid order should only close/settle the order. It should not trigger KOT print or Bill print again. Investigation is needed to confirm whether the current Settle flow triggers any print, and to ensure all settlement paths are guarded.

**Expected Behavior:** Settle must not print KOT. Settle must not print Bill. Print should happen only from explicit print buttons or configured auto-print behavior (autoKot/autoBill at Place Order / Collect Bill time).

**Impact:** Unnecessary duplicate prints waste paper, confuse kitchen staff, and slow down operations.

**Known Owner Requirement:** Settlement is a financial closure action, not a print trigger.

### PROD-BUG-003 — Pay Later prepaid order served but table/order not cleared

**Issue:** When a prepaid order uses PayLater and the order is subsequently served/settled, the table/order context is not cleared properly. The table card still appears occupied/unavailable and displays "NA" (no waiter/customer data), meaning the order/table state is stuck in the frontend. The table cannot be reused.

**Expected Behavior:** After a PayLater prepaid order is served and settled via the correct flow:
- Order card should be removed from the dashboard
- Table should become "available"
- Table should not remain blocked/occupied
- No stale "NA" card/state should remain

**Current Behavior:** Table still appears occupied with "NA" labels. The order was not removed from OrderContext and/or the table status was not updated to 'available' in TableContext after the PayLater settle.

**Impact:** Operationally serious — tables appear occupied when the order should be closed. Staff cannot reuse the table. Creates dashboard confusion in high-volume environments.

**Known Owner Requirement:** PayLater settle must free the table and remove the order from the running dashboard, identical to regular prepaid settle behavior.

---

## 5. Current Flow Findings

### Settle / Delivered / Handover / Collect Bill Buttons

| Button/Action | File | Condition | Handler | Prints KOT? | Prints Bill? | Notes |
|---|---|---|---|---|---|---|
| **Settle** (prepaid, fOrderStatus=5) | `OrderCard.jsx` L941-951 | `fOrderStatus === 5 && canBill && order.paymentType === 'prepaid'` | `handleSettlePrepaid` → `completePrepaidOrder()` | **No** | **No** | Clean — calls completePrepaidOrder only. No print call in handler. |
| **Settle** (prepaid, fOrderStatus=5) | `TableCard.jsx` L518-526 | `table.fOrderStatus === 5 && table.paymentType === 'prepaid'` | `handleSettlePrepaid` → `completePrepaidOrder()` | **No** | **No** | Clean — calls completePrepaidOrder only. No print call in handler. |
| **Bill** (non-prepaid, fOrderStatus=5) | `OrderCard.jsx` L953-964 | `fOrderStatus === 5 && canBill && paymentType !== 'prepaid'` | `handlePrintBill` → `printOrder(orderId, 'bill', ...)` | **No** | **Yes** | Intentional — Bill button explicitly prints bill. |
| **Handover** (delivery, fOrderStatus=5) | `OrderCard.jsx` L953-964 | Same as Bill, `isDelivery` label swap | `handlePrintBill` → `printOrder(orderId, 'bill', ...)` | **No** | **Yes** | Same handler as Bill, label changes to "Handover" for delivery. |
| **Bill** (non-prepaid, fOrderStatus=5) | `TableCard.jsx` L528-539 | `table.fOrderStatus === 5 && paymentType !== 'prepaid'` | `handlePrintBill` → `printOrder(table.orderId, 'bill', ...)` | **No** | **Yes** | Intentional — Bill button explicitly prints bill. |
| **Print KOT** (icon) | `OrderCard.jsx` L848-859 | `canPrintBill && !(isDelivery && (fOS=2\|5))` | `handlePrintKot` → `printOrder(orderId, 'kot', ...)` | **Yes** | **No** | Explicit KOT button. Hidden for delivery at fOS 2/5. |
| **Print KOT** (icon) | `TableCard.jsx` L405-448 | Per fOrderStatus block, hidden for delivery at fOS 2/5 | `handlePrintKot` → `printOrder(table.orderId, 'kot', ...)` | **Yes** | **No** | Explicit KOT button. |
| **Ready** (fOrderStatus=1) | `OrderCard.jsx` L879-889 | `fOrderStatus === 1` | `handleMarkReadyClick` → `onMarkReady(order)` | **No** | **No** | Status update only. |
| **Serve** (fOrderStatus=2) | `OrderCard.jsx` L929-939 | `fOrderStatus === 2 && !isDelivery` | `handleMarkServedClick` → `onMarkServed(order)` | **No** | **No** | Status update only. |
| **Dispatch** (delivery, fOS=2) | `OrderCard.jsx` L907-915 | `fOrderStatus === 2 && isDelivery && !hasRider && !deliveryAssign` | `handleDispatch` → `dispatchOrder()` | **No** | **No** | Delivery dispatch only. |
| **Collect Bill** (CollectPaymentPanel) | `CollectPaymentPanel.jsx` L668-754 | Pay button clicked | `handlePayment` → `onPaymentComplete(paymentData)` | **No** | **No** | Delegates to OrderEntry. |
| **QSR Collect Bill** | `CartPanel.jsx` QsrBillingSection L374-411 | QSR Pay button | `handleCollectBill` → `onQsrCollectBill(paymentData)` | **No** | **No** | Delegates to OrderEntry. |

### Print Trigger Map

| Print Trigger | File | Action Source | KOT/Bill | Intended? | Risk for PROD-BUG-002 |
|---|---|---|---|---|---|
| `handlePrintKot` | `OrderCard.jsx` L155-192 | Explicit KOT icon button click | KOT | Yes | None — explicit user action |
| `handlePrintKot` | `TableCard.jsx` L139-184 | Explicit KOT icon button click | KOT | Yes | None — explicit user action |
| `handlePrintBill` | `OrderCard.jsx` L195-220 | Explicit Bill/Handover button click (non-prepaid fOS=5) | Bill | Yes | None — explicit user action |
| `handlePrintBill` | `TableCard.jsx` L204-230 | Explicit Bill button click (non-prepaid fOS=5) | Bill | Yes | None — explicit user action |
| `handlePrintBill` | `CollectPaymentPanel.jsx` L761-803 | Explicit "Print Bill" button in payment panel | Bill | Yes | None — explicit user action |
| `autoPrintNewOrderIfEnabled` | `OrderEntry.jsx` L1560-1640 | After new Place+Pay (Scenario 2) if `printAllBill` ON | Bill | Yes (auto-print on place) | **Low** — only fires on fresh order place, not on settle. Gated by `printAllBill`. |
| Auto-print after Collect Bill (Scenario 1) | `OrderEntry.jsx` L1826-1875 | After successful `order-bill-payment` if `printAllBill` ON | Bill | Yes (auto-print on collect) | **Low** — fires on Collect Bill payment completion, not on Settle. Gated by `printAllBill`. |
| QSR auto-print | `OrderEntry.jsx` L1155-1180 | QSR fresh Place & Pay path | Bill | Yes (auto-print in QSR) | **Low** — QSR fresh order only. |
| `print_kot` payload field | `orderTransform.js` L877, L995, L1121 | Place/Update order API payloads | KOT (backend) | Yes | **Low** — backend prints KOT when `print_kot:'Yes'` in place/update payload, not in settle. |
| `billing_auto_bill_print` | `orderTransform.js` L1122, L1296 | Place/CollectBill payloads | Bill (backend) | Yes | **Low** — backend auto-bill only on place/collect, not on settle. |
| `handleSettlePrepaid` | `OrderCard.jsx` L225-241 | Settle button click | **NONE** | Correct | **None** — only calls `completePrepaidOrder()`, no print. |
| `handleSettlePrepaid` | `TableCard.jsx` L233-250 | Settle button click | **NONE** | Correct | **None** — only calls `completePrepaidOrder()`, no print. |
| `handleMarkServed` (prepaid path) | `DashboardPage.jsx` L1430-1452 | Mark Served on prepaid order | **NONE** | Correct | **None** — calls `completePrepaidOrder()`, no print. |

### Profile / Visibility Settings Map

| Setting | File | Source | Persistence | Current Use |
|---|---|---|---|---|
| `autoKot` (print_kot) | `profileTransform.js` L333 | Backend profile `restaurants[0].print_kot` | Backend/API | Controls KOT checkbox default in cart; sent in place-order payload `print_kot` field |
| `autoBill` (billing_auto_bill_print) | `profileTransform.js` L340 | Backend profile `restaurants[0].billing_auto_bill_print` | Backend/API | Controls Bill checkbox default in cart; drives auto-print after Place/Collect |
| QSR Mode | `StatusConfigPage.jsx` L64 | `localStorage` key `mygenie_qsr_mode_enabled` | localStorage | QSR quick billing toggle |
| QSR Discount | `StatusConfigPage.jsx` L66 | `localStorage` key `mygenie_qsr_discount_enabled` | localStorage | QSR discount field toggle |
| Order Taking | `StatusConfigPage.jsx` L61 | `localStorage` key `mygenie_order_taking_enabled` | localStorage | Enable/disable order creation |
| Stay on Order After Bill | `StatusConfigPage.jsx` / `orderEntryPrefs.js` | `localStorage` key `mygenie_stay_on_order_after_bill` | localStorage | Post-collect-bill redirect |
| View Mode (Table/Order) | `StatusConfigPage.jsx` L40 | `localStorage` key `mygenie_view_mode_table_order` | localStorage | Lock/unlock view mode |
| View Mode (Channel/Status) | `StatusConfigPage.jsx` L41 | `localStorage` key `mygenie_view_mode_channel_status` | localStorage | Lock/unlock dashboard grouping |
| Channel Visibility | `StatusConfigPage.jsx` L25 | `localStorage` key `mygenie_channel_visibility` | localStorage | Show/hide order channels |
| Status Filter | `StatusConfigPage.jsx` L19 | `localStorage` key `mygenie_enabled_statuses` | localStorage | Status pill visibility |
| **Auto Settle** | **NOT FOUND** | **DOES NOT EXIST** | **N/A** | **Needs creation** |

---

## 6. Impact Analysis — PROD-BUG-001 (Auto-Settle)

### Affected Files
1. **`StatusConfigPage.jsx`** — New toggle must be added to "UI Elements" section near QSR toggles (L779-866 area)
2. **`OrderCard.jsx`** — Auto-settle logic at fOrderStatus=5 + paymentType='prepaid' (L941-951)
3. **`TableCard.jsx`** — Auto-settle logic at fOrderStatus=5 + paymentType='prepaid' (L502-526)
4. **`DashboardPage.jsx`** — handleMarkServed already auto-settles prepaid at the Serve transition (L1430-1452). Auto-settle on card render/mount is a NEW path.
5. **New util file** (e.g., `autoSettlePrefs.js`) — localStorage getter/setter for toggle persistence (following `qsrModePrefs.js` / `orderEntryPrefs.js` pattern)

### Affected States
- `fOrderStatus === 5` + `paymentType === 'prepaid'` orders across ALL order types (dineIn, takeAway, delivery, room)
- PayLater (`paymentMethod === 'paylater'`) orders are also `paymentType === 'prepaid'` — **must be excluded** from auto-settle (PayLater requires explicit cashier settlement as it's "pay later" by design)

### Likely Implementation Options

**Option A — Frontend auto-settle on card render/mount:**
- When Auto Settle is ON, check if order is `fOrderStatus=5 && paymentType='prepaid' && paymentMethod !== 'paylater'`
- Call `completePrepaidOrder()` automatically when the card renders with this condition
- Hide Settle button entirely (no UI interaction needed)
- **Risk:** Multiple concurrent clients rendering the same order could fire duplicate settle calls

**Option B — Frontend auto-settle via useEffect on order state change:**
- In DashboardPage or a shared hook, watch for orders reaching fOrderStatus=5 with prepaid status
- Fire `completePrepaidOrder()` once per order
- Track already-settled order IDs in a `Set` to prevent duplicates
- **Risk:** Lower duplicate risk but requires careful Set management

**Option C — Backend auto-settle (preferred long-term):**
- Backend detects prepaid order reaching delivered/settlement stage and auto-completes
- Frontend just consumes socket removal
- **Risk:** Requires backend work

### Idempotency Risk
- **HIGH** — `completePrepaidOrder` calls `POST /api/v2/vendoremployee/order/paid-prepaid-order`. If called multiple times for the same order, backend behavior is unknown. Could cause:
  - Double financial entries
  - Error responses (409 or 400)
  - No-op (if backend is idempotent)
- **Mitigation needed:** Frontend-side guard (in-flight Set tracking settled orderIds) + backend idempotency confirmation

### Backend/Profile Dependency
- **No existing backend/profile field** for auto-settle was found (`auto_settle`, `autoSettle` search returned zero results across entire codebase)
- Current Visibility Settings toggles (QSR mode, Order Taking, Stay on Order, etc.) all use **localStorage** — no backend call
- Following the existing pattern, a **localStorage-only** implementation is feasible and consistent with the codebase architecture

### Frontend-Only Feasibility
- **YES** — fully feasible as a localStorage toggle with frontend auto-settle logic
- The `completePrepaidOrder()` API call is already wired and tested in OrderCard, TableCard, and DashboardPage
- The auto-settle action is the SAME API call the Settle button already makes
- No new backend endpoint needed

### Risk Level: **MEDIUM**
- Duplicate call risk requires idempotency guard
- PayLater exclusion must be explicit
- Multiple browser tabs / terminals on the same restaurant could race

---

## 7. Impact Analysis — PROD-BUG-002 (Settle Print Guard)

### Affected Files (inspection targets)
1. `OrderCard.jsx` — `handleSettlePrepaid` (L225-241)
2. `TableCard.jsx` — `handleSettlePrepaid` (L233-250)
3. `DashboardPage.jsx` — `handleMarkServed` prepaid path (L1430-1452)
4. `OrderEntry.jsx` — auto-print paths (L1560-1640, L1826-1875)
5. `orderService.js` — `completePrepaidOrder` (L84-94), `printOrder` (L134-173)
6. `orderTransform.js` — `collectBillExisting`, `placeOrder` payloads

### Print Paths Found

**FINDING: The current Settle button does NOT trigger any print — KOT or Bill.**

Detailed evidence:

1. **`OrderCard.handleSettlePrepaid` (L225-241):**
   ```
   await completePrepaidOrder(orderId, order?.serviceTax || 0, order?.tipAmount || 0, ...);
   onPostSettleSuccess?.(orderId);
   ```
   - Only calls `completePrepaidOrder()` + callback
   - **NO** `printOrder()` call anywhere in this handler
   - Comment at L224 explicitly states: "No bill print here."

2. **`TableCard.handleSettlePrepaid` (L233-250):**
   ```
   await completePrepaidOrder(table.orderId, order?.serviceTax || 0, order?.tipAmount || 0, ...);
   onPostSettleSuccess?.(table.orderId);
   ```
   - Identical pattern — **NO** print call

3. **`DashboardPage.handleMarkServed` prepaid path (L1440-1443):**
   ```
   await completePrepaidOrder(tableEntry.orderId, ...);
   handlePrepaidSettleSuccess(tableEntry.orderId);
   ```
   - Only calls `completePrepaidOrder()` + cleanup callback
   - **NO** print call

4. **`completePrepaidOrder` in `orderService.js` (L84-94):**
   ```
   POST /api/v2/vendoremployee/order/paid-prepaid-order
   body: { order_id, payment_status, service_tax, tip_amount }
   ```
   - Pure API call — **NO** `printOrder()` side-effect
   - No chained print call in the function

5. **Auto-print paths in `OrderEntry.jsx`:**
   - `autoPrintNewOrderIfEnabled` (L1560) — fires **only** after fresh Place+Pay (Scenario 2). NOT connected to Settle.
   - Auto-print after Collect Bill (L1826) — fires **only** after `order-bill-payment` API success. NOT connected to Settle.
   - QSR auto-print (L1155) — fires **only** after QSR fresh Place & Pay. NOT connected to Settle.

6. **Backend-side `billing_auto_bill_print`:**
   - Sent in `placeOrder` / `collectBillExisting` payloads **only** (orderTransform.js L1122, L1296)
   - NOT sent in `completePrepaidOrder` payload (confirmed: payload contains only `order_id`, `payment_status`, `service_tax`, `tip_amount`)
   - Backend auto-bill behavior is gated to place/collect paths, not settle

### Verdict: PROD-BUG-002 MAY NOT BE A BUG IN CURRENT CODE

**The Settle button currently does NOT trigger KOT or Bill print — neither directly nor indirectly.** Every Settle path (`handleSettlePrepaid` in OrderCard, TableCard, and `handleMarkServed` prepaid path in DashboardPage) calls only `completePrepaidOrder()` which is a pure financial closure API call with no print side-effect.

**Possible explanations for the reported behavior:**
1. **Backend-side print trigger:** The backend `paid-prepaid-order` endpoint might trigger a print (KOT or Bill) as a server-side side-effect. This would NOT be visible in frontend code. **Needs backend investigation.**
2. **Aggregator auto-KOT:** The `aggregator_auto_kot` profile setting could trigger backend-side KOT prints on status transitions. **Needs backend investigation.**
3. **Misidentified button:** The reporter may have clicked "Bill" (non-prepaid path) or the explicit "Print KOT" icon button instead of "Settle". The Bill button at fOrderStatus=5 for non-prepaid DOES print a bill — this is by design.
4. **Socket-triggered re-render:** After Settle, the order removal socket event could cause a brief UI state that looks like a print was fired (e.g., spinner, transition).

### Safest Print Guard Location (if confirmed needed)
If backend investigation confirms the backend fires a print on settle:
- **Backend fix preferred:** Remove the server-side print side-effect from the `paid-prepaid-order` endpoint
- **Frontend guard (fallback):** Not applicable since frontend already does NOT call `printOrder()` from Settle

If a frontend guard is needed for defense-in-depth:
- Add explicit `// PROD-BUG-002: NO printOrder() call here` comments at all three `handleSettlePrepaid` / `handleMarkServed prepaid` sites
- Add a unit test asserting `printOrder` is NOT called when `completePrepaidOrder` is invoked

### Risk Level: **LOW** (frontend) / **UNKNOWN** (backend)
- Frontend Settle path is already clean (no print trigger)
- Backend behavior needs investigation

---

## 7b. Impact Analysis — PROD-BUG-003 (PayLater Table Clear)

### Root Cause Analysis — Full Flow Trace

**PayLater Prepaid Settle Flow (current code):**

```
1. Order placed as prepaid + PayLater
   → paymentType = 'prepaid', paymentMethod = 'paylater'

2. Order progresses: preparing (fOS=1) → ready (fOS=2) → Serve clicked

3. DashboardPage.handleMarkServed detects paymentType='prepaid'
   → BUG-087: calls completePrepaidOrder() INSTEAD of updateOrderStatus()
   → Payload: { order_id, payment_status: 'sucess' (typo), service_tax, tip_amount }
   → POST /api/v2/vendoremployee/order/paid-prepaid-order

4. handlePrepaidSettleSuccess() clears orderEntryTable selection
   (but does NOT remove order from OrderContext or free table)

5. Backend processes → should emit socket event → frontend handler decides removal
```

**Critical Socket Handler Chain (handleOrderDataEvent, L237-351):**

The order removal decision depends on matching ANY of these conditions:
```
isTerminal       = (order.status === 'cancelled' || order.status === 'paid')
                   → requires fOrderStatus=3 or fOrderStatus=6 in response

isPayLaterSettle = (order.fOrderStatus === 9) && (eventName === 'update-order-paid')
                   → requires fOS=9 AND event on update-order-paid channel

isPayLaterComplete = (eventName === 'update-order-paid') &&
                     (order.paymentType === 'prepaid') &&
                     (order.paymentMethod === 'paylater') &&
                     (order.paymentStatus === 'sucess')
                     → requires ALL FOUR conditions to match exactly

isHoldClear      = (order.fOrderStatus === 9) && !isPayLaterSettle
                   → KEEPS table 'occupied' (does NOT free it!)
```

### Identified Failure Scenarios

**Scenario A — Backend emits wrong socket event type:**
- `isPayLaterComplete` REQUIRES `eventName === 'update-order-paid'`
- If backend emits `update-order` or `update-order-status` instead, the PayLater-specific guard in `handleOrderDataEvent` does NOT fire
- Defensive guard exists in `handleUpdateOrderStatus` (L487-490) but it checks `fOrderStatus >= 5` instead of event name — different criteria, might not match

**Scenario B — Backend `payment_status` mismatch:**
- `isPayLaterComplete` checks `order.paymentStatus === 'sucess'` (the intentional backend typo)
- If backend normalizes/corrects to `'success'` (double-s), `'paid'`, or any other value in the socket response → condition FAILS → order NOT removed
- This is the **MOST LIKELY root cause** — the 'sucess' typo is fragile and any backend-side normalization breaks the match

**Scenario C — Backend `payment_type` or `payment_method` change after settle:**
- If backend changes `payment_type` from `'prepaid'` to something else (e.g., `'postpaid'`, `''`) in the socket response after settle → `isPayLaterComplete` fails
- If backend normalizes `payment_method` to something other than `'paylater'` → condition fails

**Scenario D — Backend emits fOrderStatus=9 on a non-`update-order-paid` channel:**
- `isHoldClear` would match: `(fOrderStatus === 9) && !isPayLaterSettle`
- `isHoldClear` calls `syncTableStatus(order, updateTableStatus)` WITHOUT override
- This writes the table status from `order.tableStatus` which maps fOS=9 → `'occupied'`
- **Table stays occupied even though order is removed!**

**Scenario E — No socket event emitted at all:**
- If backend does not emit any socket event after `paid-prepaid-order` for PayLater → order stays in OrderContext indefinitely, table stays occupied
- Only a page refresh / order polling reconciliation would clear it

### Affected Files
1. **`api/socket/socketHandlers.js`** — `handleOrderDataEvent` (L308-318): PayLater removal guards; `handleUpdateOrderStatus` (L486-490): defensive PayLater guard
2. **`api/services/orderService.js`** — `completePrepaidOrder` (L84-94): sends `payment_status: 'sucess'` for PayLater
3. **`pages/DashboardPage.jsx`** — `handleMarkServed` (L1430-1452): prepaid Serve path calls `completePrepaidOrder` directly (skips normal serve flow)
4. **`contexts/OrderContext.jsx`** — `removeOrder` (L155-170): only called when socket handler decides to remove
5. **`contexts/TableContext.jsx`** — `updateTableStatus` (L94-136): only clears to 'available' when explicitly called with status='available'
6. **`api/transforms/orderTransform.js`** — `paymentStatus` mapping (L220): `api.payment_status || 'unpaid'`
7. **`api/constants.js`** — `ORDER_TO_TABLE_STATUS`: `pendingPayment: 'occupied'` (fOS=9 maps to occupied, not available)

### Likely Root Cause Priority

| Priority | Scenario | Likelihood | Evidence |
|---|---|---|---|
| **1 (HIGHEST)** | B — `payment_status` mismatch ('sucess' typo fragility) | **HIGH** | The entire PayLater removal chain depends on a known backend typo 'sucess'. Any backend-side normalization breaks the match. |
| **2** | A — Wrong socket event type | **MEDIUM** | BUG-049 comments explicitly state "PayLater settle ALWAYS arrives on `update-order-paid`" — but this is an assumption that may not hold for the `paid-prepaid-order` endpoint (which was originally designed for regular prepaid, not PayLater) |
| **3** | D — fOS=9 on wrong channel → table stays 'occupied' | **MEDIUM** | If backend sends fOS=9 on `update-order` (not `update-order-paid`), `isHoldClear` fires and table is kept occupied |
| **4** | E — No socket event | **LOW** | Backend typically emits socket events for all order mutations |
| **5** | C — Field value change | **LOW** | Backend rarely changes payment_type/method on settle |

### Frontend-Only Fix Feasibility
- **PARTIAL** — Frontend can add defensive fallback:
  1. After `completePrepaidOrder()` succeeds, start a timer (e.g., 3-5 seconds)
  2. If order is still in OrderContext after timeout, force-remove it and free the table
  3. This is a safety-net, not a proper fix — the socket handler chain should work correctly

- **PROPER FIX** requires backend investigation to confirm which socket event/payload is emitted after `paid-prepaid-order` with PayLater payment_status='sucess'

### Risk Level: **HIGH**
- Operationally blocks table reuse
- Fragile dependency on backend typo 'sucess'
- Multiple failure scenarios possible
- May require coordinated frontend + backend fix

---

## 8. Recommended Hotfix Strategy

**Recommendation: Split into three tracks**

### PROD-BUG-001 (Auto Settle):
**B. Frontend-only hotfix possible**
- Add localStorage toggle to StatusConfigPage (near QSR section)
- Add auto-settle logic with idempotency guard
- PayLater exclusion required
- No backend dependency for the toggle itself
- Backend idempotency of `paid-prepaid-order` should be confirmed but does NOT block implementation

### PROD-BUG-002 (Settle Print Guard):
**E. Blocked pending owner/backend answers**
- Frontend code is already clean — Settle does NOT trigger print
- If the reported print-on-settle is real, it's a **backend issue**
- Owner needs to confirm: (a) is the bug reproduced consistently? (b) which exact button was pressed? (c) does backend `paid-prepaid-order` trigger a print?

### PROD-BUG-003 (PayLater Table Clear):
**C. Backend/profile config investigation needed before implementation**
- Frontend socket handler logic has multiple PayLater-specific guards (BUG-087, BUG-049, BUG-042-C)
- All guards depend on exact backend socket event type + payload field values
- Root cause is most likely a backend socket response mismatch (payment_status 'sucess' typo fragility or wrong event channel)
- **Immediate frontend safety-net possible**: force-remove order from context after completePrepaidOrder succeeds + timeout
- **Proper fix requires**: backend team to confirm exact socket event + payload emitted after `paid-prepaid-order` with PayLater

### Recommended Sequence:
1. **Immediately:** Send owner questions (Section 9) for PROD-BUG-002 and PROD-BUG-003 clarification
2. **Parallel:** Implement PROD-BUG-001 (Auto Settle toggle + logic) — no blockers
3. **Parallel:** Implement PROD-BUG-003 frontend safety-net (force-remove after API success + timeout) as a quick defensive fix
4. **After owner/backend response:** If PROD-BUG-002 confirmed as backend issue, escalate. If PROD-BUG-003 backend socket is confirmed broken, file backend fix + keep frontend safety-net.

---

## 9. Owner Questions

| Question ID | Bug | Question | Options | Recommendation | Blocks |
|---|---|---|---|---|---|
| OQ-001 | BUG-001 | Should Auto Settle be a restaurant-level profile/backend setting or a local browser/device setting? | A) Backend profile setting (server-persisted, all terminals) B) localStorage (browser-local, per-device) | B — localStorage, matching QSR/OrderTaking pattern. Can migrate to backend later. | No — can proceed with localStorage |
| OQ-002 | BUG-001 | Should Auto Settle be ON or OFF by default? | A) ON by default B) OFF by default | B — OFF by default (safe, opt-in). Existing behavior preserved. | No |
| OQ-003 | BUG-001 | Should Auto Settle apply to PayLater orders? PayLater is technically paymentType='prepaid' but the intent is "pay later". | A) Yes — auto-settle all prepaid including PayLater B) No — exclude PayLater, only auto-settle truly-paid orders | B — Exclude PayLater. PayLater requires explicit cashier action. | No — but must be confirmed before implementation |
| OQ-004 | BUG-001 | When should auto-settle trigger? Options: (a) when order card renders with prepaid+fOS=5, (b) on socket event that moves order to fOS=5, (c) both | A) On card render B) On socket state change C) Both | A — On render/visibility, with duplicate guard. Simpler, covers socket-updated orders too. | No |
| OQ-005 | BUG-002 | Can you confirm the Settle button specifically (not Bill or KOT) triggers an unwanted print? Which order type and which card view? | Free text reproduction steps | N/A — needed to determine if this is a frontend or backend issue | **YES — blocks PROD-BUG-002 implementation** |
| OQ-006 | BUG-002 | Does the backend `paid-prepaid-order` endpoint trigger any print (KOT or Bill) as a server-side side-effect? | A) Yes B) No C) Unknown | If Yes → backend fix needed. If No → may be a misidentified reporter action. | **YES — blocks PROD-BUG-002 resolution** |
| OQ-007 | BUG-003 | Can you reproduce the PayLater table-stuck issue? Steps: (1) create prepaid PayLater order, (2) progress to served/ready, (3) click Serve/Settle. Does the table remain occupied with "NA"? | Free text with screenshot | N/A — confirms if this is consistent or intermittent | No — safety-net can proceed |
| OQ-008 | BUG-003 | After the PayLater order is settled, does the table clear on a page refresh? | A) Yes (socket issue) B) No (order stuck in backend too) | If A → socket event mismatch. If B → backend endpoint not completing correctly. | No — but narrows root cause |

---

## 10. Backend/API Questions

| Question ID | Bug | Backend/API Question | Required Evidence | Blocks |
|---|---|---|---|---|
| BQ-001 | BUG-001 | Is `POST /api/v2/vendoremployee/order/paid-prepaid-order` idempotent? What happens if called twice for the same order_id? | Test: call endpoint twice with same order_id, observe response + DB state | No — can implement with frontend guard, but idempotency confirmation improves confidence |
| BQ-002 | BUG-001 | Is there an existing backend/profile field for "auto settle" (e.g., `auto_settle`, `auto_paid_settle`)? | Check restaurant profile API response for any settle-related flag | No — localStorage is the fallback |
| BQ-003 | BUG-002 | Does the `paid-prepaid-order` endpoint trigger any print call (order-temp-store / KOT / Bill) as a backend side-effect? | Check endpoint handler code or test with print logging | **YES — blocks PROD-BUG-002 resolution** |
| BQ-004 | BUG-002 | Does the socket event emitted after `paid-prepaid-order` (update-order-paid) cause any downstream print trigger in any connected client? | Check socket event handlers on all clients + KDS | No — but useful for completeness |
| BQ-005 | BUG-003 | What exact socket event does the backend emit after `POST /api/v2/vendoremployee/order/paid-prepaid-order` with `payment_status: 'sucess'` (PayLater path)? Is it `update-order-paid`, `update-order`, or `update-order-status`? | Log backend socket emission after this endpoint call | **YES — blocks PROD-BUG-003 proper fix** |
| BQ-006 | BUG-003 | What is the `payment_status` value in the socket payload after PayLater settle? Is it exactly `'sucess'` (the known typo), `'success'`, `'paid'`, or something else? | Check socket payload `orders[0].payment_status` | **YES — blocks PROD-BUG-003 proper fix** |
| BQ-007 | BUG-003 | What `f_order_status` does the backend set after `paid-prepaid-order` for a PayLater order? Is it `6` (paid), `9` (pendingPayment), or something else? | Check DB state after endpoint call | **YES — blocks PROD-BUG-003 proper fix** |
| BQ-008 | BUG-003 | Does `paid-prepaid-order` endpoint handle `payment_status: 'sucess'` identically to `payment_status: 'paid'` in terms of socket emission and DB state? Or is there a different code path for each? | Backend code inspection of the endpoint handler | No — but explains potential asymmetry |

---

## 11. Proposed Next Agent

### For PROD-BUG-001 (Auto Settle):
→ **Implementation Agent** — no blockers. All affected files, logic, and patterns are documented. Owner questions OQ-001 through OQ-004 have recommended defaults that can be used if owner is unavailable.

### For PROD-BUG-002 (Settle Print Guard):
→ **Owner Question Clearance Agent** — blocked on OQ-005 and OQ-006/BQ-003. Frontend code is already clean. If backend confirms a server-side print trigger, escalation to **Backend Team** is needed.

### For PROD-BUG-003 (PayLater Table Clear):
→ **Implementation Agent** for frontend safety-net (force-remove after API success + timeout) — can proceed immediately
→ **Backend Investigation Agent** for proper root cause — blocked on BQ-005, BQ-006, BQ-007. Need to confirm exact socket event type and payload values.

---

## 12. Final Status

**`prod_hotfix_001_impact_analysis_complete_with_owner_questions`**

- PROD-BUG-001: Ready for implementation with recommended defaults. Owner questions are non-blocking (have safe defaults).
- PROD-BUG-002: Frontend code is already clean (no print on Settle). Blocked on owner/backend confirmation (OQ-005, OQ-006, BQ-003) to determine if the reported behavior is a backend issue or a reporter misidentification.
- PROD-BUG-003: Root cause identified as likely socket response mismatch — PayLater removal guards in socketHandlers.js depend on exact match of `payment_status: 'sucess'` (backend typo) + event type `update-order-paid`. Frontend safety-net (force-remove after API success) can proceed immediately. Proper fix blocked on backend investigation (BQ-005, BQ-006, BQ-007).
