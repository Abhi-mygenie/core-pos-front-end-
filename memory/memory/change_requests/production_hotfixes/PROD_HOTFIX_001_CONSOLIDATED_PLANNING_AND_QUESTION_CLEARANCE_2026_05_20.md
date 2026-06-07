# PROD-HOTFIX-001 — Consolidated Planning & Question Clearance — 2026-05-20

## 1. Combined Hotfix Summary

**Batch:** PROD-HOTFIX-001 — Prepaid Auto-Settle + Settle Print Guard + PayLater Table Clear

**Bug count:** 3

| Bug ID | Title | Severity | Frontend-Safe? | Backend-Blocked? |
|---|---|---|---|---|
| PROD-BUG-001 | Auto-settle for prepaid/paid orders | Medium | YES — fully frontend-implementable | No |
| PROD-BUG-002 | Settle should not trigger KOT/Bill print | Low (FE) / Unknown (BE) | NO — FE already clean; suspected BE issue | YES |
| PROD-BUG-003 | PayLater prepaid order served but table/order not cleared | High | PARTIAL — safety-net possible; proper fix needs BE answers | YES (proper fix) |

**Source doc:** `/app/memory/change_requests/production_hotfixes/PROD_HOTFIX_001_PREPAID_AUTO_SETTLE_PRINT_GUARD_IMPACT_ANALYSIS_2026_05_20.md`

---

## 2. Docs Read

### Baseline Docs
- `/app/memory/final/*` — ALL **NOT_FOUND** (7 files)

### Overlay / Sprint Docs
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` — **NOT_FOUND**
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` — **NOT_FOUND**

### Hotfix Docs Read
- `PROD_HOTFIX_001_PREPAID_AUTO_SETTLE_PRINT_GUARD_IMPACT_ANALYSIS_2026_05_20.md` — **READ IN FULL** (505 lines)

### Code Files Verified (targeted re-verification for this consolidation)
- `api/services/orderService.js` → `completePrepaidOrder` payload confirmed (PayLater='sucess', regular='paid')
- `api/socket/socketHandlers.js` → `handleOrderDataEvent` L308-330 (PayLater 4-condition guard) + `handleUpdateOrderStatus` L484-500 (defensive guard)
- `pages/DashboardPage.jsx` → `handleMarkServed` L1430-1453 (prepaid path) + `handlePrepaidSettleSuccess` L1392-1403 (selection clear only, NOT order removal)
- `components/cards/OrderCard.jsx` → `handleSettlePrepaid` L222-241 (confirmed: no printOrder call)
- `pages/StatusConfigPage.jsx` → QSR toggle pattern at L779+ (confirmed: localStorage pattern for new Auto Settle)

---

## 3. Per-Bug Root Cause Summary

### PROD-BUG-001 — Auto-settle for prepaid/paid orders
**Root cause:** Missing feature. No auto-settle configuration or logic exists anywhere in the codebase. The `completePrepaidOrder()` API and socket removal chain already work correctly for manual Settle clicks — the issue is purely that the cashier must manually click a button for orders that are already fully paid.

**Key fact:** `handleMarkServed` in DashboardPage (L1438-1440) already calls `completePrepaidOrder()` directly for ALL prepaid orders (including PayLater) at the Serve transition — proving the settle-on-status-change pattern is already established. Auto Settle just extends this to fOrderStatus=5 card render.

### PROD-BUG-002 — Settle should not trigger KOT/Bill print
**Root cause:** Frontend code is **already clean**. All three Settle paths (`handleSettlePrepaid` in OrderCard L225-241, TableCard L233-250, and `handleMarkServed` prepaid path in DashboardPage L1440-1443) call ONLY `completePrepaidOrder()` — no `printOrder()` call exists.

The `completePrepaidOrder` payload (`{order_id, payment_status, service_tax, tip_amount}`) does NOT contain `print_kot`, `billing_auto_bill_print`, or any print-related field. Compare to `placeOrder`/`collectBillExisting` payloads which explicitly include `print_kot: 'Yes'/'No'` and `billing_auto_bill_print: 'Yes'/'No'`.

**If the reported print-on-settle is real, it must be a backend-side trigger** — either the `paid-prepaid-order` endpoint fires a print as a side-effect, or the socket event chain triggers a downstream print on another connected client (e.g., KDS).

### PROD-BUG-003 — PayLater table/order not cleared
**Root cause:** Socket handler PayLater removal guards are fragile. The removal decision in `handleOrderDataEvent` (L314-317) requires ALL FOUR of these conditions to be true simultaneously:

```
isPayLaterComplete = (eventName === 'update-order-paid')       // 1. exact event type
  && (order.paymentType === 'prepaid')                          // 2. still marked prepaid
  && (order.paymentMethod?.toLowerCase() === 'paylater')        // 3. still marked paylater
  && (order.paymentStatus === 'sucess')                         // 4. exact typo match
```

If the backend socket response differs on ANY of these — particularly `payment_status` (the known typo 'sucess' vs normalized 'success'/'paid') or the socket event type (not `update-order-paid`) — the order is NOT removed from OrderContext and the table is NOT freed.

**Critical additional finding:** `handlePrepaidSettleSuccess` (DashboardPage L1392-1403) only clears the order-entry UI selection. It does NOT call `removeOrder()` or `updateTableStatus('available')`. Those operations happen ONLY through the socket handler chain. If the socket chain fails to match, there is zero fallback — the order is permanently stuck until page refresh.

---

## 4. Shared Affected Flows

### 4.1 Prepaid Settlement Flow
All three bugs intersect at `completePrepaidOrder()`:
- **BUG-001** wants to call it automatically instead of requiring a Settle click
- **BUG-002** confirms it does NOT trigger prints (frontend-side)
- **BUG-003** depends on the backend response to this call for order/table clearing

**Shared endpoint:** `POST /api/v2/vendoremployee/order/paid-prepaid-order`

**Payload fork:**
| Order Type | `payment_status` sent | Expected socket event | Expected removal guard |
|---|---|---|---|
| Regular prepaid | `'paid'` | `update-order-paid` with fOS=6 | `isTerminal` (status='paid') |
| PayLater prepaid | `'sucess'` (typo) | `update-order-paid` with fOS=9 or PayLater flags | `isPayLaterComplete` or `isPayLaterSettle` |

### 4.2 PayLater Flow
PayLater is the intersection of BUG-001 and BUG-003:
- **BUG-001:** Must EXCLUDE PayLater from auto-settle (PayLater = "pay later" intent; cashier must explicitly settle)
- **BUG-003:** PayLater's own explicit settle is broken because the socket removal guards fail to match

### 4.3 Table/Order Clearing Flow
Shared by BUG-001 and BUG-003:
- `removeOrder(orderId)` in OrderContext → removes from running orders list
- `syncTableStatus(order, updateTableStatus, 'available')` → frees the table
- Both happen ONLY inside socket handlers — never from the API call site itself
- `handlePrepaidSettleSuccess` clears UI selection only — NOT a substitute for socket-driven removal

### 4.4 KOT/Bill Print Flow
Exclusively BUG-002:
- Print triggers are isolated to explicit button handlers (`handlePrintKot`, `handlePrintBill`) and auto-print paths (`autoPrintNewOrderIfEnabled`, post-Collect-Bill auto-print)
- Settle path (`handleSettlePrepaid`, `handleMarkServed` prepaid) is completely isolated from all print paths
- No `printOrder()` call, no `print_kot`/`billing_auto_bill_print` payload field in settle path

### 4.5 Delivered/Handover Flow
BUG-001 and BUG-002 both touch the `fOrderStatus=5` (Served/Delivered) stage:
- BUG-001: Wants to auto-settle at this stage for truly-paid prepaid orders
- BUG-002: Confirms the Settle action at this stage does not print
- The "Handover" button for delivery at fOS=5 is actually the Bill button (non-prepaid path) — it DOES print by design; this is NOT the Settle button

---

## 5. Shared Risk Map

| Risk | Bugs Affected | Severity | Mitigation |
|---|---|---|---|
| Duplicate `completePrepaidOrder` calls (multi-tab/terminal race) | BUG-001 | Medium | Frontend in-flight `Set<orderId>` guard; confirm backend idempotency (BQ-001) |
| PayLater accidentally auto-settled | BUG-001 | High | Explicit `paymentMethod !== 'paylater'` exclusion in auto-settle condition |
| Backend socket doesn't match frontend PayLater guards | BUG-003 | High | Frontend safety-net (confirmed-only, time-limited); backend investigation (BQ-005/6/7) |
| `payment_status: 'sucess'` typo fragility | BUG-003 | High | Accept both `'sucess'` AND `'success'` in socket handler guards (pending OQ-006) |
| Backend `paid-prepaid-order` triggers print as side-effect | BUG-002 | Unknown | Backend investigation (BQ-003); frontend is already clean |
| Auto-settle fires before socket removes order → double removal | BUG-001 + BUG-003 | Low | Auto-settle checks `getOrderById()` before calling; removeOrder is idempotent (filter no-op) |
| Auto-settle + broken PayLater table clear compound | BUG-001 + BUG-003 | Medium | Auto-settle explicitly excludes PayLater; BUG-003 fix is independent path |

---

## 6. Owner Questions

| # | Bug | Question | Options | Recommendation | Blocks |
|---|---|---|---|---|---|
| OQ-01 | 001 | Should Auto Settle be a restaurant-level profile/backend setting or local browser/device setting? | A) Backend profile (persisted, all terminals) B) localStorage (per-device) | B — localStorage, matching QSR/OrderTaking/StayOnOrder pattern. Can migrate to backend later. | No |
| OQ-02 | 001 | Should Auto Settle be ON or OFF by default? | A) ON B) OFF | B — OFF by default. Safe opt-in, preserves today's behavior. | No |
| OQ-03 | 001 | Should Auto Settle apply to PayLater orders? PayLater is technically `paymentType='prepaid'` but intent is "pay later". | A) Yes — all prepaid B) No — exclude PayLater | B — Exclude PayLater. PayLater requires explicit cashier action. | No — but should be confirmed before shipping |
| OQ-04 | 002 | Can you confirm the Settle button specifically (NOT Bill or KOT icon) triggers an unwanted print? Reproduction steps + order type + card view? | Free text | N/A — determines if FE or BE issue | **YES — blocks BUG-002 fix** |
| OQ-05 | 002 | Should Settle EVER trigger Bill print when autoBill is ON? | A) Yes B) No | B — No. Settle is financial closure, not a print action. Auto-print belongs to Place/Collect only. | No |
| OQ-06 | 002 | Should Settle EVER trigger KOT print? | A) Yes B) No | B — No. KOT is kitchen instruction, unrelated to payment settlement. | No |
| OQ-07 | 003 | Should frontend accept BOTH `'sucess'` (known typo) AND `'success'` (correct spelling) as paid-status for PayLater cleanup? | A) Accept both B) Only 'sucess' C) Normalize backend | A — Accept both. Defensive, protects against backend normalization. | No |
| OQ-08 | 003 | If backend socket is delayed/missing, is a 3–5 sec frontend safety-net removal acceptable after successful `paid-prepaid-order` API response? | A) Yes — if API succeeded, safe to assume settled B) No — must wait for socket C) Yes, but only if confirmed via re-fetch | A with guard — only if `completePrepaidOrder` API returned 2xx AND order is still in context after timeout. Never blind force-remove. | No |
| OQ-09 | 003 | After a PayLater settle, does the table clear on a page refresh? | A) Yes (socket/frontend issue) B) No (stuck in backend too) | N/A — determines if issue is socket-only or also backend state | No — but narrows root cause significantly |

---

## 7. Backend/API Questions

| # | Bug | Question | Required Evidence | Blocks |
|---|---|---|---|---|
| BQ-01 | 001 | Is `POST /api/v2/vendoremployee/order/paid-prepaid-order` idempotent? What happens if called twice with the same `order_id`? | Call endpoint twice, observe response + DB state | No — frontend guard mitigates, but answer improves confidence |
| BQ-02 | 001 | Is there an existing backend/profile field for "auto settle" (e.g., `auto_settle`)? | Check restaurant profile API response | No — localStorage fallback exists |
| BQ-03 | 002 | Does `paid-prepaid-order` endpoint trigger any print call (`order-temp-store` / KOT / Bill) as a server-side side-effect? | Backend endpoint handler code inspection or test with print logging | **YES — blocks BUG-002** |
| BQ-04 | 002 | Can backend suppress any bill/KOT print on `paid-prepaid-order` if it currently fires one? | Backend code change feasibility | **YES if BQ-03 = yes** |
| BQ-05 | 003 | What exact socket event does backend emit after `paid-prepaid-order` with `payment_status: 'sucess'` (PayLater)? Is it `update-order-paid`, `update-order`, or `update-order-status`? | Log backend socket emission | **YES — blocks BUG-003 proper fix** |
| BQ-06 | 003 | What is the `payment_status` value in the socket payload after PayLater settle? Exactly `'sucess'` (the typo), `'success'`, `'paid'`, or other? | Check `orders[0].payment_status` in socket payload | **YES — blocks BUG-003 proper fix** |
| BQ-07 | 003 | What `f_order_status` does backend set after `paid-prepaid-order` for PayLater? Is it `6` (paid), `9` (pendingPayment), or other? | Check DB state | **YES — blocks BUG-003 proper fix** |
| BQ-08 | 003 | Is `update-order-paid` guaranteed to be emitted after prepaid PayLater settlement, or is it only guaranteed for regular `order-bill-payment`? | Backend socket emission mapping | **YES — blocks BUG-003 proper fix** |

---

## 8. What Can Be Implemented Frontend-Only Now

### Bucket C — Auto Settle Setting + Behavior (PROD-BUG-001)
**Status: READY — No blockers**

Scope:
1. New `autoSettlePrefs.js` utility (localStorage getter/setter, key `mygenie_auto_settle_enabled`, default `false`)
2. New toggle in `StatusConfigPage.jsx` → UI Elements section, after QSR Discount toggle (follows exact same pattern)
3. Auto-settle logic in `DashboardPage.jsx`:
   - `useEffect` watching orders list for `fOrderStatus === 5 && paymentType === 'prepaid' && paymentMethod !== 'paylater'` when auto-settle is ON
   - In-flight `Set<orderId>` guard prevents duplicate calls
   - Calls existing `completePrepaidOrder()` → socket handler chain handles removal (same path as manual Settle)
4. Settle button hidden on OrderCard/TableCard when auto-settle is ON + conditions match (visual consistency — auto-settled orders shouldn't flash a Settle button)

**PayLater exclusion:** Explicit `paymentMethod?.toLowerCase() !== 'paylater'` condition. PayLater orders still show manual Settle button regardless of auto-settle setting.

**Idempotency guard:** Frontend `Set<orderId>` tracks in-flight settle calls per session. Order is added to Set before `completePrepaidOrder()` call, removed on success/failure. Prevents multi-render/multi-tab duplicate calls within same browser session. Cross-terminal races need backend idempotency (BQ-01) — acceptable risk for hotfix.

### Bucket B — Payment-Status Normalization for PayLater Removal Guard (PROD-BUG-003 partial)
**Status: READY — No blockers (pending OQ-07 confirmation, safe default = accept both)**

Scope:
1. In `socketHandlers.js` `handleOrderDataEvent` (L317): widen `isPayLaterComplete` check from:
   ```
   order.paymentStatus === 'sucess'
   ```
   to:
   ```
   (order.paymentStatus === 'sucess' || order.paymentStatus === 'success')
   ```
2. Same widening in `handleUpdateOrderStatus` (L489)
3. No other file changes needed

**Rationale:** This is a strictly additive, zero-regression change. The existing `'sucess'` match still works. The additional `'success'` match protects against backend normalization — the single highest-likelihood root cause for PROD-BUG-003.

### Bucket A — Print Guard Documentation (PROD-BUG-002 partial — FE already clean)
**Status: READY — No code change needed, documentation + defensive comments only**

Scope:
1. Add explicit `// PROD-BUG-002: Settle is financial closure only — NO printOrder() here` comments at:
   - `OrderCard.handleSettlePrepaid` (L225)
   - `TableCard.handleSettlePrepaid` (L233)
   - `DashboardPage.handleMarkServed` prepaid branch (L1440)
2. Ensure no future developer accidentally adds a print call to the settle path

**No code behavior change.** This bucket exists only to codify the intent and prevent regression.

---

## 9. What Is Backend/Runtime-Blocked

### Bucket A proper — Print Guard Backend Investigation (PROD-BUG-002)
**Blocked on: BQ-03 (does backend trigger print on settle?)**

If BQ-03 answer = Yes → backend fix needed (suppress print in `paid-prepaid-order` endpoint)
If BQ-03 answer = No → BUG-002 is closed as "frontend already clean; reporter misidentification or aggregator-side print"

### Bucket D — PayLater Table/Order Clear Safety-Net (PROD-BUG-003)
**Blocked on: OQ-08 (is safety-net acceptable?) + BQ-05/06/07 for proper fix**

**IMPORTANT:** Do NOT blindly force-remove every PayLater served order. The safety-net must:
1. Wait for `completePrepaidOrder()` API to return successfully (2xx)
2. Start a timeout (3-5 seconds)
3. After timeout, check if order is still in OrderContext via `getOrderById(orderId)`
4. Only if order IS still present → call `removeOrder(orderId)` + `updateTableStatus(tableId, 'available')`
5. Log clearly: `[PROD-BUG-003 safety-net] Order ${orderId} still in context ${timeout}ms after successful settle API — force-removing`

**Why this guard matters:** If the socket handler DID remove the order within the timeout, the safety-net is a no-op (getOrderById returns null). If it didn't, the API success confirms the backend accepted the settle — the only reason the order is still in context is a socket delivery/matching failure.

**Bucket D should only be implemented AFTER Bucket B** (payment-status normalization), because Bucket B may fix the socket matching issue entirely, making Bucket D unnecessary.

### Bucket D proper — Backend Socket Fix (PROD-BUG-003)
**Blocked on: BQ-05/06/07/08**

If backend confirms it emits a different event type or different `payment_status` value than expected by frontend guards → backend fix needed to align socket emission with frontend expectations (or vice versa, coordinate).

---

## 10. Recommended Implementation Buckets — Sequenced

| Sequence | Bucket | Bug(s) | Type | Blocked? | Effort |
|---|---|---|---|---|---|
| **1** | **B** — Payment-status normalization | BUG-003 | Frontend fix | No | Small (2 lines in socketHandlers.js) |
| **2** | **C** — Auto Settle setting + behavior | BUG-001 | Frontend feature | No | Medium (new prefs util + StatusConfigPage toggle + DashboardPage useEffect + OrderCard/TableCard hide) |
| **3** | **A** — Print guard documentation | BUG-002 | Frontend comments only | No | Tiny (3 comments) |
| **4** | **D** (conditional) — PayLater safety-net | BUG-003 | Frontend safety-net | Yes (OQ-08) | Small (DashboardPage post-settle timeout) |
| **5** | **A proper** — Print guard backend investigation | BUG-002 | Backend investigation | Yes (BQ-03) | Unknown |
| **6** | **D proper** — Backend socket alignment | BUG-003 | Backend fix | Yes (BQ-05/06/07) | Unknown |

**Recommended implementation order:**
1. **Bucket B first** — smallest change, highest impact on BUG-003, zero risk
2. **Bucket C second** — independent feature, no dependency on B
3. **Bucket A third** — documentation-only, no risk
4. **Test BUG-003** after Bucket B ships — if PayLater table clear works with the widened guard, Bucket D is unnecessary
5. **Bucket D** only if BUG-003 persists after Bucket B
6. **Buckets A-proper and D-proper** after backend answers come back

---

## 11. Implementation Notes for Next Agent

### For Bucket B (Payment-Status Normalization):
- File: `api/socket/socketHandlers.js`
- Location 1: L317 — change `order.paymentStatus === 'sucess'` to `(order.paymentStatus === 'sucess' || order.paymentStatus === 'success')`
- Location 2: L489 — same widening
- Zero regression risk — existing `'sucess'` path unchanged; adds new `'success'` path

### For Bucket C (Auto Settle):
- New file: `utils/autoSettlePrefs.js` (follow `qsrModePrefs.js` pattern exactly)
- Key: `mygenie_auto_settle_enabled`, default: `false`
- StatusConfigPage: new toggle after QSR Discount block (~L866), same toggle pattern
- DashboardPage: new `useEffect` + `useRef(new Set())` for in-flight guard
- OrderCard/TableCard: when auto-settle ON + conditions met, hide Settle button (return null for that button block)
- **PayLater exclusion is mandatory** — `paymentMethod?.toLowerCase() !== 'paylater'`

### For Bucket D (Safety-Net — if needed):
- Location: `DashboardPage.handleMarkServed` prepaid path (after `completePrepaidOrder` succeeds) AND `OrderCard.handleSettlePrepaid` / `TableCard.handleSettlePrepaid`
- Pattern: `setTimeout(() => { if (getOrderById(orderId)) { removeOrder(orderId); updateTableStatus(tableId, 'available'); } }, 4000)`
- Must verify order is truly still stuck (getOrderById check) — NEVER blind force-remove

---

## 12. Final Status

**`prod_hotfix_001_ready_for_frontend_planning`**

- Bucket B (payment-status normalization): Ready for immediate implementation — zero blockers, zero regression risk
- Bucket C (auto-settle): Ready for immediate implementation — zero blockers, owner questions have safe defaults
- Bucket A (print guard comments): Ready — documentation only
- Bucket D (safety-net): Conditionally ready — pending OQ-08 confirmation, should only ship if Bucket B doesn't resolve BUG-003
- Buckets A-proper and D-proper: Blocked on backend answers (BQ-03, BQ-05/06/07)

**Owner questions:** 9 (OQ-01 through OQ-09)
**Backend questions:** 8 (BQ-01 through BQ-08)
**Frontend-safe immediate items:** 3 (Buckets B, C, A)
**Blocked items:** 3 (Bucket D conditional, A-proper, D-proper)
