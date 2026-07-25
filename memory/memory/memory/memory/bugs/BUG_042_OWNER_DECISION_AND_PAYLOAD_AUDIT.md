# BUG-042 — Owner Decisions & Payload + Context Audit (v2)

> **Status:** Documentation-only — NO code changes performed.
> **Scope:** Settling Hold orders fails with "Order already paid" + Hold/PayLater context-clearing policy + Room/To-Room separation.
> **Stage:** Pre-implementation. Owner decisions finalised across 3 sub-buckets (BUG-042-A/B/C). Implementation gate readiness assessed per bucket below.

---

## 1. Owner Decisions Captured (consolidated through 2026-02 session)

### 1.1 First-round directives (audit groundwork)
1. **`grant_amount` is the actual backend key** (note: literal `grant`, with the typo). Audit current `grand_amount` usage across all payment methods/contexts before changing.
2. **`payment_status: 'success'`** is to be used **only** when an order is being put on **PayLater / Hold**. Do **not** change `payment_status` for normal Cash/Card/UPI settlement unless evidence requires it.
3. **No other payload field changes.** Keep `billing_auto_bill_print`, `total_gst_tax_amount`, `delivery_charge`, `food_detail`, Room fields, Split fields untouched unless separately approved.
4. Investigate the context-clearing business rule before assuming it is a bug.
5. **Room / To Room must be audited separately.** Do not group with PayLater unless payload and clearing behaviour are proven identical.

### 1.2 Second-round directives (policy finalised)
6. **`grant_amount`: send the BE-confirmed key only.** Do **not** dual-send `grand_amount`. Replace, do not duplicate.
7. **`f_order_status === 9` (PayLater / Hold) must be cleared from running OrderContext / running dashboard.**
8. **`f_order_status === 7` (Yet-to-Confirm) must NOT be cleared.**
9. **`f_order_status === 8` behaviour remains unchanged** under the existing Status-8 Hold/Audit rule (POS2-005). Out of BUG-042 scope.
10. **Room / To Room behaviour remains separate.** Must not be changed unless proven to use the same status-9 path.
11. **Do not force-clear by table id.**
12. **Do not invent backend status.** Apply the clear rule only when FE genuinely receives `f_order_status === 9` from the order/status socket or API payload.

### 1.3 Sub-bucket split (final)
- **BUG-042-A:** Hold-tab Collect drawer payment method rail cleanup → restrict to Cash/Card/UPI (intersected with restaurant's configured paymentTypes). **Fallback (owner-confirmed 2026-02): disable the Collect button at row level** when none of cash/card/upi are configured.
- **BUG-042-B:** `BILL_PAYMENT` payload fix in `collectBillExisting`:
  - Replace `grand_amount` → `grant_amount` (single key, no dual-send).
  - `payment_status: 'success'` only for PayLater/Hold context (no change for Cash/Card/UPI/Credit settlement on already-running orders).
  - No other payload changes.
- **BUG-042-C:** Add `f_order_status === 9` to running-dashboard / OrderContext removal logic (alongside existing 3 and 6). Keep 7 untouched. Keep 8 behaviour unchanged. **No initial-load filter (owner-confirmed 2026-02): backend `/get-running-order` does not return status-9 rows; FE filtering at orderService is not needed.**

---

## 2. Current Payload Audit — `collectBillExisting` Builder

**Source of truth:** `frontend/src/api/transforms/orderTransform.js` lines **1122–1284**.

**Consumers (both share the SAME builder):**
- **Dashboard** normal "Collect Bill" on an existing (postpaid) running order → `OrderEntry.jsx:1544` → `BILL_PAYMENT`.
- **Audit Report → Hold tab → Collect drawer** → `CollectBillPanelDrawer.jsx:171` → `BILL_PAYMENT`.

### 2.1 Universal keys (emitted for every method through `collectBillExisting`)

| Key | Value source / formula |
|---|---|
| `order_id` | `String(table.orderId)` |
| `payment_mode` | `paymentData.method` (passthrough) |
| `payment_amount` | `finalTotal \|\| 0` |
| `payment_status` | `isTab ? 'success' : 'paid'` |
| `transaction_id` | `transactionId \|\| ''` |
| `billing_auto_bill_print` | `autoBill ? 'Yes' : 'No'` |
| `food_detail` | Placed, non-cancelled, non-check-in items |
| `waiter_id` | `options.waiterId` |
| `restaurant_name` | `options.restaurantName` |
| `email` | `''` |
| `order_sub_total_amount` | `itemTotal \|\| 0` |
| `order_sub_total_without_tax` | `itemTotal \|\| 0` |
| `total_gst_tax_amount` | `gstTax` (rounded) |
| `gst_tax` | `gstTax` |
| `vat_tax` | `vatAmount \|\| 0` |
| **`grand_amount`** | `finalTotal \|\| 0` — ← **target of BUG-042-B replace** |
| `round_up` | `0` |
| `service_tax` | `serviceCharge \|\| 0` |
| `service_gst_tax_amount` | rounded SC GST ₹ |
| `tip_amount` | `tip \|\| 0` |
| `tip_tax_amount` | rounded Tip GST ₹ |
| `delivery_charge` | `deliveryCharge \|\| 0` |
| `self_discount` | `discounts.manual \|\| 0` |
| `coupon_discount` | `discounts.couponDiscount \|\| 0` |
| `coupon_title` | `discounts.couponTitle \|\| ''` |
| `coupon_type` | `discounts.couponType \|\| ''` |
| `comm_discount` | `discounts.preset \|\| 0` |
| `discount_type` | `discounts.discountType \|\| ''` |
| `order_discount_type` | `discounts.orderDiscountType \|\| 'Percent'` |
| `order_discount` | `discounts.orderDiscountPercent \|\| 0` |
| `discount_value` | `discounts.total \|\| 0` |
| `discount_member_category_id` | `0` |
| `discount_member_category_name` | `''` |
| `used_loyalty_point` | `discounts.loyaltyPoints \|\| 0` |
| `use_wallet_balance` | `discounts.walletBalance \|\| 0` |
| `paid_room` | `''` |
| `usage_id` | `''` |
| `name` | `tabContact?.name \|\| ''` |
| `mobile` | `tabContact?.phone \|\| ''` |

### 2.2 Method-conditional behaviour inside `collectBillExisting`

| Method | Branch | Behaviour |
|---|---|---|
| `cash` | none | Universal fields; `transaction_id` typically `''`. |
| `card` | none | Universal fields; `transaction_id` carries cardTxnId. |
| `upi` | none | Universal fields; `transaction_id` may be `''`. |
| `credit` / `tab` (TAB) | `isTab=true` → `payment_status: 'success'`; `name`/`mobile` carry tabContact. | Otherwise identical. |
| `partial` (Split) | Appends `partial_payments[]` array. | Universal fields still emitted. |
| `transferToRoom` | Does NOT go through this builder. | Uses separate `transferToRoom()` at L1293 → different endpoint. |
| `PayLater` (hypothetical) | No UI button exposes this as a `paymentMethod` in `CollectPaymentPanel` today. | N/A from this builder at present. |

### 2.3 Other adjacent builders (confirms isolation)

| Builder | Endpoint | Emits `grand_amount`? | `payment_status` |
|---|---|---|---|
| `placeOrderWithPayment` (prepaid Place+Pay, Scenario 2) | `/place-order` | NO (spreads `calcOrderTotals` keys: `order_amount`, `tax_amount`, etc.) | `'paid'` |
| `placeOrder` (postpaid Place Only — actual "put on hold/unpaid" via FE) | `/place-order` | NO | `'unpaid'` |
| `updateOrder` (cart append) | `/update-place-order` | NO | `'unpaid'` |
| `collectBillExisting` (Scenario 1 / Hold-tab settle) | `/order-bill-payment` | **YES — `grand_amount`** | `'paid'` (non-TAB) / `'success'` (TAB) |
| `transferToRoom` | `/order-shifted-room` | NO | `'paid'` |

**Conclusion:** `grand_amount` is **only** emitted by `collectBillExisting`. Replacing it with `grant_amount` therefore touches exactly **one builder + two consumers** (dashboard Collect Bill + Hold drawer). No other endpoint payload is affected.

---

## 3. BUG-042-A — Hold Payment Method Rail Cleanup

### Owner directive
Restrict the payment-method buttons rendered on the Audit Hold-tab Collect drawer to **Cash / Card / UPI only** (intersected with the restaurant's configured `paymentTypes`).

### Current behaviour
`CollectBillPanelDrawer` mounts the same `CollectPaymentPanel` used by the dashboard, which shows all configured methods: cash / card / upi / credit (TAB) / split / transferToRoom + dynamic dropdown entries.

### Proposed change (two-part)

**Part 1 — Collect drawer rail filter:**
Add an optional `allowedMethods` (or `isHoldContext`) prop on `CollectPaymentPanel`:
- Default (undefined) → existing behaviour preserved on dashboard.
- Hold drawer passes `['cash', 'card', 'upi']`; rendering intersects this list with `restaurantPaymentTypes` before laying out the rails.

**Part 2 — Row-level Collect button disable (owner-confirmed fallback):**
In `OrderTable.jsx` row-action eligibility (function `isOrderEligibleForRowActions` at L245 and/or button render at L288–311), when `tabId === 'hold'` AND the intersection of `['cash','card','upi']` with `restaurantPaymentTypes` is empty:
- **Disable** the row's Collect button (set `disabled={true}`).
- Tooltip: e.g. `"No eligible payment methods configured"`.
- Same visual treatment as the existing out-of-window disable styling.

### Files touched
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — gate the rail filtering (Part 1).
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx` — pass `allowedMethods={['cash','card','upi']}` (Part 1).
- `frontend/src/components/reports/OrderTable.jsx` — extend eligibility / disable on Collect button (Part 2).
- `frontend/src/pages/AllOrdersReportPage.jsx` — plumb the `restaurantPaymentTypes` (or pre-computed `hasEligibleHoldMethod` boolean) into `actionsConfig` so the table can compute the disable.

### Risk
- Low. Logic addition only. Dashboard path untouched. No payload changes.
- Edge case: restaurant ONLY has TAB / transferToRoom configured → all Collect buttons on Hold tab become disabled. This is the intentional behaviour per owner directive.

### Verdict
- **`ready_for_pre_implementation_gate`** (owner decision finalised — disable at row level).

---

## 4. BUG-042-B — `BILL_PAYMENT` Payload Fix

### Owner directives (final)
- Replace `grand_amount` → **`grant_amount`** (BE-confirmed key, single emit, NO dual-send).
- `payment_status: 'success'` **only** for PayLater/Hold context. Cash/Card/UPI/Credit settlement on a running order keeps current behaviour (`'paid'` for non-TAB, `'success'` for TAB).
- No other payload changes.

### 4.0 Codebase verification — `grand_amount` vs `grant_amount` occurrences

**Comprehensive grep performed across `/app/frontend/src/` (excluding `.bak` and test files for production-path analysis; tests reviewed separately).**

#### `grand_amount` occurrences (current "wrong" key)
| Location | Type | Notes |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js:1234` | **Code** (the bug) | `grand_amount: finalTotal \|\| 0,` — inside `collectBillExisting`. Single emission. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx:515` | Comment | Description of pre-existing semantics — not a runtime field. |

→ **Only one runtime emission of `grand_amount` exists in the codebase**, at `orderTransform.js:1234`.

#### `grand_total` occurrences (separate, semantically distinct field — DO NOT TOUCH)
| Location | Type | Notes |
|---|---|---|
| `CollectPaymentPanel.jsx:132, 516, 517, 527` | Comments | Describe ROOM_CHECKIN_GAP3 grand-total semantics. |
| `orderTransform.js:312, 313` | Comments | Same room collect-bill comments. |
| `orderTransform.js:1241` | Code (conditional) | Inside `collectBillExisting`: `...(roomBalance > 0 ? { order_amount: finalTotal \|\| 0 } : {})` — actual emitted key is `order_amount`, NOT `grand_total`. The comment text near this line is historical context (2026-04-25 owner-confirmed: `grand_total` was REPLACED by `order_amount`). |

→ `grand_total` is **not emitted as a runtime field** anywhere. Only mentioned in comments. **No change needed.**

#### `grant_amount` occurrences (existing CORRECT BE key already in use)
| Location | Type | Notes |
|---|---|---|
| `orderTransform.js:1023` | Code | Inside `placeOrderWithPayment` → `partial_payments[]` entry: `grant_amount: parseFloat(p.amount) \|\| 0`. Emitted via `/place-order` endpoint when split is active. |
| `orderTransform.js:1029` | Code | Same builder — padding row for missing modes: `payment_mode: mode, payment_amount: 0, grant_amount: 0, transaction_id: ''`. |
| `orderTransform.js:1037` | Code | Same builder — single-payment row: `grant_amount: mode === method ? finalTotal : 0`. |
| `orderTransform.js:1616` | Code | Inside `buildBillPrintPayload` (REQ3 room bill print): `grant_amount: roomFinalPaymentAmount`. Emitted via `/order-temp-store` endpoint for print. |
| `orderTransform.js:1568` | Comment | Documents that `grant_amount` is the room-bill-print payload field. |
| `__tests__/req3-room-bill-print.test.js:112` | Test assertion | `expect(payload.grant_amount).toBe(676);` — proves backend contract is already validated for `grant_amount`. |

→ **`grant_amount` is already a known, working backend key, used in 4 production-path emissions** (split partial_payments rows × 3 + room bill print × 1) and asserted by an existing unit test. The proposed rename in `collectBillExisting` brings BILL_PAYMENT into alignment with the established convention — **NOT a new key invention**.

#### Conclusion of codebase grep
- The `grand_amount` literal is a **single-site outlier** within `collectBillExisting`. Every other payload in the codebase that needs a "granted/payable amount" field uses `grant_amount`.
- Replacing `grand_amount` → `grant_amount` at `orderTransform.js:1234` is a **consistency fix**, not a contract guess.
- **Strong confidence** the rename is correct globally (not just for the Hold path). The dashboard normal Collect-Bill case, which today succeeds with `grand_amount`, is most likely succeeding because backend accepts either key, or because the value is computed server-side from `food_detail` + `service_tax` + `gst_tax` and the front-end key is ignored. Either way, sending `grant_amount` aligns with split-payment + room-print payloads that the same backend already processes.

### Where `grand_amount` lives (single line)
- `frontend/src/api/transforms/orderTransform.js:1234` — single emission inside `collectBillExisting`.

### Where `payment_status` lives in `collectBillExisting`
- `frontend/src/api/transforms/orderTransform.js:1219` — `payment_status: isTab ? 'success' : 'paid'`.

### Interpretation of "PayLater/Hold context" for `payment_status`

**Recommended interpretation:** Owner's "only for PayLater/Hold" means: don't introduce `'success'` for Cash/Card/UPI cases that today send `'paid'`. The existing TAB → `'success'` branch is preserved (TAB is a credit-extension flow, semantically similar to "pay later by the customer"). **No code change to the `payment_status` line.**

### Proposed change (final)
- **One-line replace** at `orderTransform.js:1234`:
  - **Before:** `grand_amount: finalTotal || 0,`
  - **After:** `grant_amount: finalTotal || 0,`
- **No change** to `payment_status` line (1219).

### Files touched
- `frontend/src/api/transforms/orderTransform.js` (one line).

### Risk
- **Low.** Codebase grep confirms `grant_amount` is the established convention; we are aligning one outlier emission, not inventing a contract.
- Dashboard Collect Bill (current working flow) cannot regress unless backend strictly validates the literal key — which contradicts the existence of multiple in-flight payloads (split + room-print) already using `grant_amount`.
- Hold-tab Collect (currently broken with "Order already paid") cannot regress — already broken.

### Verdict
- **`ready_for_pre_implementation_gate`** ✅

---

## 5. BUG-042-C — Add `f_order_status === 9` to Running-Context Removal

### Owner directive
- Add 9 (PayLater / Hold) as a terminal-clear status in running OrderContext / running dashboard.
- Keep 7 (Yet-to-Confirm) and 8 (Hold/Audit) untouched.
- Only apply when the FE actually receives `f_order_status === 9` in a real socket/API payload. Do **not** force-clear by table id; do **not** invent backend status.

### 5.1 Current terminal-removal rule — exact locations

The "terminal status → `removeOrder`" predicate is **inline** at two socket-handler call sites; it is **NOT** a shared constant. To extend it for status-9, both sites must be touched.

| File | Line | Predicate | Handler scope |
|---|---|---|---|
| `frontend/src/api/socket/socketHandlers.js` | **278** | `const isTerminal = (order.status === 'cancelled' \|\| order.status === 'paid');` | `handleOrderDataEvent` — services `update-order`, `update-order-target`, `update-order-source`, `update-order-paid` events |
| `frontend/src/api/socket/socketHandlers.js` | **409** | `if (order.status === 'cancelled' \|\| order.status === 'paid')` | `handleUpdateOrderStatus` — services `update-order-status` event |

Both branches call `removeOrder(orderId)` + `syncTableStatus(order, updateTableStatus, 'available')`.

### 5.2 Status-key derivation chain (status numbers → string keys)

`frontend/src/api/transforms/orderTransform.js:188` derives `order.status` via `mapOrderStatus(api.f_order_status)`, which reads from `F_ORDER_STATUS` map in `constants.js:133`:

```
1: 'preparing'        → non-terminal
2: 'ready'            → non-terminal
3: 'cancelled'        → TERMINAL (current)
5: 'served'           → non-terminal
6: 'paid'             → TERMINAL (current)
7: 'pending'          → non-terminal (Yet-to-Confirm — must STAY)
8: 'running'          → non-terminal but defensively skipped on insertion (POS2-005)
9: 'pendingPayment'   → non-terminal (CURRENT) → must become TERMINAL (NEW)
10: 'reserved'        → non-terminal
```

### 5.3 Defensive-insertion paths

`new-order` and `scan-new-order` handlers have an explicit guard skipping `fOrderStatus === 8` insertions (`socketHandlers.js:184–187` and `455–458`). To match the BUG-042-C intent end-to-end, **a mirror guard for `fOrderStatus === 9` is recommended at the same two sites** — otherwise a freshly-arrived status-9 order would still get inserted, then re-removed only on the next status update. Cleaner to never insert in the first place.

### 5.4 Initial-load path — NO FILTER NEEDED (owner-confirmed)

`getRunningOrders` (`orderService.js:13–18`) hits the `RUNNING_ORDERS` endpoint and returns the API list through `fromAPI.orderList`.

**Owner directive (2026-02):** Backend `/get-running-order` **does not return `f_order_status === 9`** rows. No client-side filtering at orderService is required.

→ **No change** to `orderService.js` or `fromAPI.orderList` under BUG-042-C. The only insertion paths that need handling are the socket events (5.7).

### 5.5 Audit → Hold tab — does removing status 9 from running context affect it?

**No.** The Audit Report's Hold tab is fed by a **completely independent API path**:
- `reportService.getHoldOrders` → endpoint `API_ENDPOINTS.REPORT_HOLD_ORDERS` → backend `/paid-paylater-order-list` (or equivalent).
- Transformed via `reportTransform.holdOrders` → `holdOrder` (`reportTransform.js:287`).

There is **zero shared state** between `OrderContext` (running orders) and the Audit Hold tab. Removing status-9 from `OrderContext` will NOT remove the order from Audit → Hold. Confirmed by file inspection:
- `OrderContext` is populated from `getRunningOrders` and socket events.
- Audit Hold tab is populated from `getHoldOrders` only.
- The Audit Hold list is paginated by date and re-fetched on tab change, not derived from `OrderContext`.

### 5.6 Table-status side effect — auto-free behaviour

Today: `syncTableStatus(order, updateTableStatus, 'available')` is called whenever an order is removed (`socketHandlers.js:282` and `:411`). If a status-9 order is removed, the same auto-free will fire → the table will be marked `available`.

**Owner directive:** "Do not force-clear by table id." Reading: the table-free side effect must only happen when the backend's own payload signals the order genuinely left running state. Since the cleanup is **triggered by a real status-9 payload from backend** (not by FE invention), this is consistent with the directive. **However**, there's a semantic mismatch: `pendingPayment` (status 9) historically maps the table to `'occupied'` (see `ORDER_TO_TABLE_STATUS` `pendingPayment: 'occupied'`). If we now treat 9 as terminal-on-dashboard but the customer hasn't physically left, the table should likely remain `occupied` until a separate `update-table` or `paid` event clears it.

**Recommendation:** When `fOrderStatus === 9` triggers removal, pass the original `order.tableStatus` to `syncTableStatus` (do NOT override to `'available'`). This decouples context-removal from table-availability — which is owner's "do not force-clear by table id" stance.

→ **Implementation detail to flag at code gate.**

### 5.7 Proposed change set (BUG-042-C) — FINAL

| File | Change |
|---|---|
| `socketHandlers.js:278–283` | Add `\|\| order.fOrderStatus === 9` (or equivalent: `\|\| order.status === 'pendingPayment'`). Branch: call `removeOrder(orderId)` but do **NOT** override `syncTableStatus` to `'available'` for the status-9 case (keep table state as `'occupied'` per current `ORDER_TO_TABLE_STATUS` mapping). |
| `socketHandlers.js:409–412` | Same extension as above on `handleUpdateOrderStatus`. |
| `socketHandlers.js:184–187` | Mirror guard: also skip insertion when `transformedOrder.fOrderStatus === 9` in `handleNewOrder`. |
| `socketHandlers.js:455–458` | Mirror guard for `handleScanNewOrder`. |
| ~~`orderService.js` / `fromAPI.orderList`~~ | **NOT CHANGED** — owner-confirmed backend never returns status-9 from `/get-running-order`. No FE filter needed. |

**NOTE on extracting a shared constant:** Owner directive does not require this, but factoring the two predicates at L278 / L409 into a single `TERMINAL_ORDER_STATUSES` constant (e.g., in `constants.js`) would prevent future drift. Recommended as a small refactor inside the same change. To be raised at the code gate.

### Verdict
- **`ready_for_pre_implementation_gate`** subject to one clarification: confirm whether the table should auto-free on status-9 removal (5.6 recommendation: NO — keep table `'occupied'`).

---

## 6. Room / To Room — Final Impact Assessment

- Uses a **separate builder** (`transferToRoom`) and a **separate endpoint** (`/order-shifted-room`). Does **not** emit `grand_amount` or `grant_amount`.
- The `transferToRoom` flow eventually returns a backend response that transitions the source order to `paid` (status 6), which is already terminal — current FE clears it correctly.
- **NOT affected** by BUG-042-A (Hold drawer rail only).
- **NOT affected** by BUG-042-B (payload change is `collectBillExisting`-only).
- **NOT affected** by BUG-042-C (status-9 path; transferToRoom emits status-6, which is already handled).
- **No code change planned** for Room/To-Room under BUG-042.

---

## 7. Relationship to BUG-044

- **BUG-044** is about backend NOT emitting a terminal payload (merge / room checkout drops the status flip).
- **BUG-042-C** is about FE NOT clearing status-9 even when backend DOES emit it.

These are independent. BUG-042-C does **not** subsume BUG-044, and BUG-044 does **not** subsume BUG-042-C. Both should remain open until each is independently fixed and validated.

---

## 8. Tests Required (per owner request)

### 8.1 BUG-042-A — Hold-tab payment method rail

| Scenario | Expected |
|---|---|
| Hold-tab → Collect drawer opens, restaurant has Cash + Card + UPI configured | Rails show only Cash/Card/UPI; no Credit/TAB/Split/ToRoom buttons. |
| Hold-tab → Collect drawer opens, restaurant has only Cash configured | Rails show only Cash. |
| Hold-tab → Collect drawer opens, restaurant has only TAB configured | Per owner decision (Section 3 open question): empty state OR fallback OR row-disable. |
| Dashboard → Collect drawer opens, restaurant has all methods | Rails unchanged — Cash/Card/UPI/Credit/Split/ToRoom all visible. (Regression guard) |

### 8.2 BUG-042-B — `grant_amount` payload fix

| Scenario | Expected |
|---|---|
| Hold-tab → Collect via Cash → submit `BILL_PAYMENT` | Payload has `grant_amount`, no `grand_amount`. Backend returns success (not "Order already paid"). |
| Hold-tab → Collect via UPI → submit `BILL_PAYMENT` | Same as above for UPI. |
| Hold-tab → Collect via Card → submit `BILL_PAYMENT` | Same as above for Card. |
| Dashboard → Collect Bill (Cash) on a running postpaid order | Payload has `grant_amount`, no `grand_amount`. Backend still settles correctly. (Regression guard.) |
| Dashboard → Collect Bill (TAB) | `payment_status: 'success'` preserved (Interpretation X). Backend accepts. |
| Dashboard → Collect Bill (Split partial) | `partial_payments[]` array unchanged. Key rename only on outer payload. |

### 8.3 BUG-042-C — Status-9 clear

| Scenario | Expected |
|---|---|
| Backend emits `update-order-status` with `f_order_status === 9` | Order removed from running `OrderContext`. Table NOT auto-freed (stays `occupied`). |
| Backend emits `update-order` with `f_order_status === 9` (via `handleOrderDataEvent`) | Same — order removed; table state preserved. |
| Backend emits `f_order_status === 7` (Yet-to-Confirm) | Order **stays** in `OrderContext`. **No removal.** (Critical regression guard.) |
| Backend emits `f_order_status === 8` | Behaviour unchanged from POS2-005 — order not added to dashboard on insertion; existing status-8 handling preserved. |
| Backend emits `f_order_status === 3` (cancelled) | Existing removal works. Table auto-freed to `'available'`. |
| Backend emits `f_order_status === 6` (paid) | Existing removal works. Table auto-freed. |
| Audit → Hold tab after a status-9 removal from running context | Status-9 order still appears in Audit Hold tab (independent data source). |
| `new-order` socket arrives with `fOrderStatus === 9` | Defensive skip; order not inserted to running context. |
| `scan-new-order` socket arrives with `fOrderStatus === 9` | Same defensive skip. |
| Status-9 order is later paid (backend flips to status 6) | Either: (a) backend sends `update-order` with the existing-order id and status 6 → since it's already removed from context, FE log-only no-op; OR (b) BE sends a fresh `new-order`/`scan-new-order` → standard insertion path. Both acceptable. |
| ~~Initial `/get-running-order` returns a status-9 row~~ | **NOT a tested scenario** — owner-confirmed backend never returns status-9 from this endpoint. |

### 8.4 Test surface
- **Unit:** Add cases to `__tests__/api/socket/updateOrderStatus.test.js` covering status 9 → removeOrder, 7 → not removed, 8 → preserved.
- **Integration / E2E:** Manual cashier walk-through on preprod: park a dine-in order via web/PayLater (or backend tooling) → status-9 socket arrives → verify dashboard clears, Audit Hold still shows it, table stays occupied.
- **Regression:** Run existing dashboard Collect-Bill flow (status-6 path) and cancel flow (status-3 path) to confirm no behavioural drift.

---

## 9. What NOT to Change

Hard-locked-out by owner directive:
- `billing_auto_bill_print`, `total_gst_tax_amount`, `delivery_charge`, `food_detail`, Room fields, Split fields — keep as-is in `collectBillExisting`.
- `payment_status` for Cash/Card/UPI/Credit on `collectBillExisting` — keep (`'paid'` for non-TAB, `'success'` for TAB).
- `transferToRoom` builder — keep entirely.
- `f_order_status === 7` removal — DO NOT add to terminal list.
- `f_order_status === 8` removal — DO NOT change current POS2-005 handling.
- Force-clear by table id — DO NOT introduce.
- BE status invention — DO NOT add synthetic statuses.

Hard-locked-out by repo directive:
- `/app/memory/final/` — read-only.
- `/app/memory/BUG_TEMPLATE.md` — read-only.

---

## 10. Final Verdict

| Sub-bucket | Verdict |
|---|---|
| **BUG-042-A** — Hold-tab payment rails restriction + row-level Collect disable | **`ready_for_pre_implementation_gate`** ✅ (owner-confirmed: disable Collect button at row level when none of cash/card/upi configured) |
| **BUG-042-B** — `grant_amount` single-key rename + `payment_status` policy | **`ready_for_pre_implementation_gate`** ✅ (codebase grep confirms `grant_amount` is established convention used in split partial_payments + room bill print + existing unit test assertion) |
| **BUG-042-C** — Add `f_order_status === 9` to terminal-clear list | **`ready_for_pre_implementation_gate`** ✅ (no initial-load filter; only socket-handler changes + mirror insertion guards; table stays `'occupied'` on status-9 removal) |
| Room / To Room (Section 6) | `no_action` (out of scope; audited untouched) |
| Strip extra fields (Section 9) | `no_action` (owner directive) |

### Overall stance
**All three sub-buckets (A, B, C) are ready for Pre-Implementation Code Gate.** No further owner decisions or backend confirmation pulls are blocking.

### Confirmation: No changes made
- ❌ No code modified.
- ❌ No socket / API / sound / print changes made.
- ❌ `/app/memory/final/` untouched.
- ❌ `BUG_TEMPLATE.md` untouched.
- ✅ This audit document (v2) updated at `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md`.

---

*End of audit v2.*
