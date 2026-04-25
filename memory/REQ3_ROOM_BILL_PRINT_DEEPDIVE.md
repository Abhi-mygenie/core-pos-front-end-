# Req 3 — Room Order Bill Print — Deep-Dive Analysis

- **Type:** Read-only deep-dive + plan + gap analysis. NO code changes.
- **Source of truth:** `roomv2` branch under `/app/frontend/src`.
- **Status:** STOP — Owner approval needed on Section §10 questions before drafting the implementation handover.
- **Companion docs:** `/app/memory/THREE_REQUIREMENTS_V3_VALIDATION_GAPS.md` §3 (earlier validation pass).
- **Related decisions in the codebase:** AD-013A (room SC nuance), AD-105 (tax/print parity), AD-302 (collect-bill ↔ print parity, postpaid auto-print). This requirement creates **direct conflict** with AD-302 and supplements AD-105.

---

## 0. Executive Summary

| Item | Today | After this requirement |
|---|---|---|
| Auto-bill print fires for room orders? | **YES** — both Scenario 1 (postpaid collect-bill) and Scenario 2 (prepaid place+pay) trigger `printOrder()` when `settings.autoBill=true`, with NO `isRoom` guard | **NO** — `isRoom` short-circuit at the top of both paths |
| Manual `Print Bill` button for rooms? | YES — works today, calls same `buildBillPrintPayload` | YES — kept enabled, but emits enriched payload |
| Room financial fields in print payload | `roomRemainingPay = 0`, `roomAdvancePay = 0`, `roomGst = 0` (HARDCODED). No `associatedOrders[]`, no `roomPrice`, no `associatedOrdersTotal`, no `finalPayable`, no `paid_room`, no `room_id`. | All listed fields populated from `order.roomInfo` and `order.associatedOrders` |
| Tax / SC / discount applicability | SC gated to `dineIn || isRoom` (line 1128); discount/SC/tip apply to food-subtotal only — room balance is pass-through. Already correct in `CollectPaymentPanel` UI but not propagated to print payload. | Same rule preserved + explicitly encoded in print payload |
| V3 docs | AD-302 says auto-print is unconditional when `settings.autoBill=true`. **Direct conflict with this requirement.** | Need new `AD-302A` (room exclusion) + new `AD-Room-Print-Payload` |
| Risk | n/a today | HIGH if backend printer template doesn't already understand new keys |

**Net effect:** biggest of the four requirements. Two distinct concerns (auto-bill suppression + payload enrichment), each requiring an owner decision on scope.

---

## 1. Current Code — Exact File / Line Anchors

### 1.1 Auto-bill suppression — DOES NOT EXIST today

**Path A — Scenario 2 (prepaid place+pay, fresh order):**
- File: `frontend/src/components/order-entry/OrderEntry.jsx`
- Function: `autoPrintNewOrderIfEnabled` (lines 1093-1165).
- Gate: `if (!settings?.autoBill) return;` (line 1103). NO `isRoom` check.
- Eventually calls `printOrder(...)` at line 1153 with `paymentData`-derived overrides.

**Path B — Scenario 1 (postpaid collect-bill on existing order):**
- File: `frontend/src/components/order-entry/OrderEntry.jsx`
- Lines 1307-1364. Gate: `if (settings?.autoBill && collectOrderId) { ... }` (line 1310). NO `isRoom` check.
- Calls `printOrder(...)` at line 1349 with `paymentData`-derived overrides.

**Path C — Manual `Print Bill` button:**
- File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- Function: `handlePrintBill` (lines 458-490).
- No autoBill setting here — direct user action.
- Builds an `overrides` object (lines 464-485) that does NOT include any room-specific fields.
- Calls `onPrintBill(overrides)` which propagates up to `OrderEntry.printOrder(...)`.

**Path D — Dashboard / Order-card printer icons:**
- Various card components (`OrderCard`, `TableCard`) call `printOrder` directly with NO overrides → `buildBillPrintPayload` runs in default branch.

### 1.2 `buildBillPrintPayload` — actual emitted shape

**File:** `frontend/src/api/transforms/orderTransform.js:1017-1246`.

```js
return {
  order_id, restaurant_order_id, print_type: 'bill',
  payment_amount, grant_amount, order_item_total, order_subtotal,
  discount_amount, coupon_code, loyalty_dicount_amount, wallet_used_amount,
  Date, waiterName, tablename, custName, custPhone, custGSTName, custGST,
  billFoodList,             // food items (zeroed for complimentary)
  orderNote, serviceChargeAmount,
  roomRemainingPay: 0,      // HARDCODED line 1219
  roomAdvancePay: 0,        // HARDCODED line 1220
  roomGst: 0,               // HARDCODED line 1221
  deliveryCustName, deliveryAddressType, deliveryCustAddress, deliveryCustPincode, deliveryCustPhone,
  Tip, station_kot, order_type, gst_tax, vat_tax, delivery_charge,
};
```

**MISSING for rooms:**
- `roomPrice` (room booking total amount)
- `associatedOrders[]` (transferred dine-in/walk-in bills)
- `associatedOrdersTotal` (sum of associated bill amounts)
- `finalPayable` (single grand total = food + transfers + roomBalance)
- `paid_room` (already in collect-bill payload at line 780-781, missing from print)
- `room_id` (same — present in collect-bill, missing in print)

The 3 hardcoded zeros (`roomRemainingPay`, `roomAdvancePay`, `roomGst`) are evidence the print contract was stubbed but never wired.

### 1.3 Source of room data — already in the `order` object

**File:** `frontend/src/api/transforms/orderTransform.js:248-277` (`fromAPI.order`).
- `associatedOrders` ← `api.associated_order_list[]` → `[{ orderId, orderNumber, amount, transferredAt }]`.
- `roomInfo` ← `api.room_info` → `{ roomPrice, advancePayment, balancePayment }`.

Both are available in the `order` argument passed to `buildBillPrintPayload`. **No backend change needed** to populate the print payload — purely a frontend pass-through.

### 1.4 `CollectPaymentPanel` — the UI source-of-truth for room financials

**File:** `frontend/src/components/order-entry/CollectPaymentPanel.jsx`.

| What | Lines | Value |
|---|---|---|
| `roomBalance` derivation | 110-113 | `Math.max(0, roomInfo.balancePayment \|\| 0)` when `isRoom` |
| `associatedTotal` | 147-148 | `associatedOrders.reduce((sum, o) => sum + (o.amount \|\| 0), 0)` |
| `scApplicable` | 320 | `orderType === 'dineIn' \|\| orderType === 'walkIn' \|\| isRoom` |
| `effectiveTotal` | 397-398 | `(isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance` |
| Room block UI | 828-867 | renders Room Price, Advance Payment, Balance |
| Associated orders UI | 874-908 | renders count + per-order amount + total |
| Final payable display | 543, 555, 1462, 1986 | repeated `(isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance` |

**Architectural rule (already enforced):** room balance is a flat pass-through — NO SC, NO GST, NO discount applies to it. Only the food-subtotal carries SC/GST/discount/tip.

### 1.5 `handlePrintBill` overrides — current shape

**File:** `frontend/src/components/order-entry/CollectPaymentPanel.jsx:458-490`.

Currently sends:
```js
{
  orderItemTotal, orderSubtotal, paymentAmount,
  discountAmount, couponCode, loyaltyAmount, walletAmount,
  serviceChargeAmount, deliveryCharge, gstTax, vatTax, tip,
  runtimeComplimentaryFoodIds,
}
```

**MISSING:** any room-specific override (`roomBalance`, `associatedOrders`, `roomPrice`, etc.). When `handlePrintBill` runs on a room order today, the print payload's `roomRemainingPay/roomAdvancePay/roomGst` stay at 0 and `associatedOrders` is absent — even though the cashier just saw a fully-itemized room bill on screen.

**This is the AD-105 spirit violation:** "Collect-bill UI must equal printed bill" — the UI shows room financials, the print does not.

### 1.6 Collect-bill API payload (for reference; NOT the print payload)

**File:** `frontend/src/api/transforms/orderTransform.js:780-781` (`orderToAPI.collectBillExisting`).
- Already sends `paid_room`, `room_id`, `grand_total` (full payable). Backend understands these on the `order-bill-payment` endpoint.
- `grand_total` here = food-grand + associatedTotal + roomBalance, computed in `CollectPaymentPanel:402-410`.

This proves the backend already accepts room-context fields on at least one API. Whether the printer template understands the same keys on `print` is the open question (Q-3C).

---

## 2. AD-302 Conflict (V3 Decision Conflict)

**AD-302** ("Collect-bill ↔ print parity, postpaid auto-print"): "Auto-print fires after a successful collect-bill when `settings.autoBill=true`. Override path is implemented via paymentData live values."

This requirement asks us to **EXEMPT** room orders from this. Direct conflict. Resolution options:

| Option | Effect on AD-302 |
|---|---|
| Add `AD-302A` "Room exclusion" | Supplements AD-302 — applies for non-room only |
| Amend AD-302 in place | Adds room-exclusion clause to existing AD |
| Implement without doc update | Code drifts from AD-302 silently — DO NOT RECOMMEND |

Owner choice in Q-3K.

---

## 3. Decision Surface — Two Independent Concerns

### Concern 1 — Auto-bill suppression
- **Scope:** Block `printOrder` invocation when `isRoom` is true.
- **Where to gate:** Top of `autoPrintNewOrderIfEnabled` (line 1103) and top of the Scenario-1 block (line 1310). Each gate is 2 lines.
- **Variant choices:** strict (both scenarios) / postpaid-only / balance-conditional.

### Concern 2 — Print payload enrichment
- **Scope:** Populate room-specific fields in `buildBillPrintPayload` AND propagate room-specific overrides from `handlePrintBill`.
- **Where to add:** `orderTransform.js:1219-1221` (replace hardcoded zeros) + new fields below; `CollectPaymentPanel.jsx:464-485` (extend overrides for manual print).
- **Variant choices:** which exact keys, naming, types — depends on backend printer template knowledge (Q-3C).

These two concerns are independent — owner could choose to do either alone or both together.

---

## 4. Files That Will Need Changes

| # | File | Change | Estimated lines |
|---|---|---|---|
| 1 | `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` — populate room fields from `order.roomInfo` + `order.associatedOrders`; keep existing keys, replace 3 hardcoded zeros with real values; add new fields per Q-3D | +30-50 |
| 2 | `frontend/src/components/order-entry/OrderEntry.jsx` | Add `isRoom` short-circuits at lines 1103 (Path A) and 1310 (Path B) per Q-3A scope | +6 |
| 3 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `handlePrintBill` overrides — append room-specific fields to forward to `buildBillPrintPayload` (manual print parity) | +15 |
| 4 | `/app/memory/V3_DOC_UPDATES_PENDING.md` | Append `AD-302A` + `AD-Room-Print-Payload` entries | +40 |

**Files I will NOT touch:** Sidebar.jsx, contexts, services, OrderCard, TableCard (they don't have isRoom data; they print via the default branch which we will populate from `order.roomInfo` automatically when present).

---

## 5. Gaps Found

### GAP-3A — Auto-bill suppression scope
Q-3A — strict vs postpaid-only vs balance-conditional vs other. Pre-existing acknowledgment in `/app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md:285` that auto-print fires inertly on ₹0 rooms today.

### GAP-3B — Manual Print Bill scope
Q-3B — keep enabled (gives cashier escape hatch) vs disable for rooms vs different payload.
Recommendation: keep enabled with enriched payload — gives cashier a print path even after auto-bill is suppressed.

### GAP-3C — Backend printer template knowledge
Q-3C — does the backend printer/`order-temp-store` already understand any of the new keys?
- Existing: `roomRemainingPay`, `roomAdvancePay`, `roomGst` (currently sent as 0). Suggests backend may already render these on room receipts.
- Unknown: `roomPrice`, `associatedOrders`, `associatedOrdersTotal`, `finalPayable`, `paid_room`, `room_id` for the print payload specifically.
- **HIGH risk** — if backend doesn't accept the new keys, they may be silently dropped OR cause printer parsing errors. Owner must verify with backend team OR provide a sample working print payload from a known-good test tenant.

### GAP-3D — Exact key contract
Q-3D — confirm/override the 8 mappings (room label, advance, balance, total, associated orders, room service items, associated total, final payable). Each cell may need a specific backend-defined key name.

### GAP-3E — `roomGst` semantics
Q-3E — stay 0 always (room balance has no GST per architectural rule) OR carry GST when `room_gst_applicable === 'Yes'`.
- Current architecture rule (`orderTransform.js:269-271` comment + line 1219) treats room balance as tax-free pass-through.
- However, `room_module_implementation_requirements.md` A6 mentions `room_gst_applicable` as a tenant feature flag.
- These two sources are inconsistent. Owner must reconcile.

### GAP-3F — Tax/SC/Tip applicability on the merged total
Q-3F — confirm SC/discount/tip apply ONLY to food-subtotal (not roomBalance, not associatedTotal). Currently enforced in `CollectPaymentPanel`. Must be encoded in print payload.

### GAP-3G — `paid_room` / `room_id` in print
Q-3G — already in collect-bill payload (line 780-781), missing from print payload. Some backend printer backends key off them.

### GAP-3H — Race condition on collect-bill auto-print
The Scenario-1 auto-print fires immediately after `order-bill-payment` returns, BEFORE socket re-engage. So `order.associatedOrders` and `order.roomInfo` are read from the IN-MEMORY snapshot at the moment of print.
- For postpaid room collect-bill: at print time, the order should have already had its associated orders attached (transfers happen earlier in the flow). Fine.
- For an edge case where transfers happen between place-order and collect-bill via socket: the socket may lag the HTTP collect-bill response. Cashier might print before the latest transfer landed in context.
- Mitigation options: (a) trust live `paymentData` overrides (current model — owner approves), or (b) force a fresh `GET /get-single-order-new` before print.

### GAP-3I — Scenario 3 (Transfer to Room)
Q-3I — when dine-in cashier picks "To Room", source order is transferred to the room. No bill printed today. Should this fire any print?
- Default: keep no-print — matches today's behavior + cashier still prints from the room order's own collect-bill.

### GAP-3J — Empty-room (₹0 marker-only) print
Q-3J — checked-in room with only "Check In" marker (no food, no transfers, no balance). Today, auto-print fires inertly on `billFoodList=[]`. After Q-3A=strict, this is automatically suppressed.
- Confirm acceptable, OR define a special "checkout receipt" with ₹0 balance.

### GAP-3K — V3 doc churn
Q-3K — confirm new ADs needed. Without them, code silently violates AD-302.

### GAP-3L — Feature flag / kill switch
Q-3L — feature flag (`restaurant.features.roomAutoBillEnabled`) for tenant opt-in vs hard-coded behavior.

### GAP-3M — Aggregator orders (out of scope confirmation)
Aggregator orders (Swiggy/Zomato → SCAN_NEW_ORDER) are never room orders. Confirm out-of-scope.

---

## 6. Proposed Plan (Pending §10 Answers)

### 6.1 Recommended baseline (all defaults)
- **Q-3A** (suppression scope): **(a) strict** — block auto-bill for ANY `isRoom` order, both scenarios. Cleanest; matches owner's literal language ("even if auto bill flag is passed").
- **Q-3B** (manual Print Bill): **(a) keep enabled** for rooms, with enriched payload. Provides escape hatch.
- **Q-3D** (key contract): proposed mapping (table in §10) — defaults to existing key names (`roomRemainingPay`, `roomAdvancePay`) populated with real values + new keys (`roomPrice`, `associatedOrders`, `associatedOrdersTotal`, `finalPayable`, `paid_room`, `room_id`). Owner must verify with backend.
- **Q-3E** (`roomGst`): **(a) stay 0** — matches existing architectural rule.
- **Q-3F** (tax/SC/tip applicability): confirm food-only.
- **Q-3G** (`paid_room`/`room_id`): **(a) include** in print payload.
- **Q-3H** (race): **(a) trust live overrides**.
- **Q-3I** (Scenario 3): **(a) keep no-print**.
- **Q-3J** (empty room): suppression covers it (Q-3A=a). No special receipt.
- **Q-3K** (V3 docs): **(a) YES** — append `AD-302A` + `AD-Room-Print-Payload` to `/app/memory/V3_DOC_UPDATES_PENDING.md`.
- **Q-3L** (feature flag): **(b) hard-coded** — no flag. Behavior is universal across tenants.

### 6.2 Pseudocode

**OrderEntry.jsx (Path A and Path B, same shape):**
```js
// Path A — Scenario 2 prepaid (around line 1103)
if (!settings?.autoBill) return;
if (effectiveTable?.isRoom) {                           // NEW
  console.log('[AutoPrintBill] SKIPPED — isRoom (Req 3 AD-302A)');
  return;
}
if (!newOrderId) return;

// Path B — Scenario 1 postpaid (around line 1310)
if (settings?.autoBill && collectOrderId && !effectiveTable?.isRoom) {  // NEW
  // existing block
}
```

**orderTransform.js — `buildBillPrintPayload` extension:**
```js
// after existing fields, before the return
const isRoomPrint = order.isRoom === true;
const roomPriceVal = isRoomPrint ? (order.roomInfo?.roomPrice || 0) : 0;
const advancePayVal = isRoomPrint ? (order.roomInfo?.advancePayment || 0) : 0;
const balancePayVal = isRoomPrint ? Math.max(0, order.roomInfo?.balancePayment || 0) : 0;
const associatedOrdersVal = isRoomPrint ? (order.associatedOrders || []).map(o => ({
  order_id: o.orderId,
  restaurant_order_id: o.orderNumber || '',
  amount: Number(o.amount) || 0,
  transferred_at: o.transferredAt || '',
})) : [];
const associatedOrdersTotalVal = associatedOrdersVal.reduce((s, o) => s + o.amount, 0);
const finalPayableVal = (isRoomPrint && associatedOrdersVal.length > 0)
  ? finalPaymentAmount + associatedOrdersTotalVal + balancePayVal
  : finalPaymentAmount + balancePayVal;

return {
  // ...existing fields...
  roomRemainingPay: balancePayVal,        // was 0
  roomAdvancePay: advancePayVal,          // was 0
  roomGst: 0,                             // unchanged per Q-3E
  roomPrice: roomPriceVal,                // NEW
  associatedOrders: associatedOrdersVal,  // NEW
  associatedOrdersTotal: associatedOrdersTotalVal,  // NEW
  finalPayable: finalPayableVal,          // NEW
  paid_room: isRoomPrint ? (order.tableNumber || '') : '',   // NEW
  room_id: isRoomPrint ? (order.tableId || 0) : 0,           // NEW (or order.roomId if available)
  // ...
};
```

**CollectPaymentPanel.jsx — `handlePrintBill` override extension:**
```js
const overrides = {
  // ...existing fields...
  ...(isRoom && roomInfo ? {
    roomPrice: roomInfo.roomPrice || 0,
    roomAdvancePay: roomInfo.advancePayment || 0,
    roomRemainingPay: roomBalance,
    associatedOrders, // forwards array
    associatedOrdersTotal: associatedTotal,
    finalPayable: (isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance,
  } : {}),
};
```

`buildBillPrintPayload` then prefers `overrides.*` when present (mirrors existing pattern for `serviceChargeAmount`, `gstTax`, etc.).

### 6.3 Test cases (draft)

| # | Setup | Expected |
|---|---|---|
| T-1 | Place fresh dine-in order with `settings.autoBill=true` | Auto-print fires (regression test — non-room path unchanged) |
| T-2 | Place fresh ROOM order with `settings.autoBill=true` (Path A) | Auto-print SKIPPED — console log "isRoom (Req 3 AD-302A)". No `printOrder` HTTP call. |
| T-3 | Collect-bill on existing room order with `settings.autoBill=true` (Path B) | Auto-print SKIPPED. No HTTP call. |
| T-4 | Click manual `Print Bill` on room with food + transfers + balance | `printOrder` HTTP fires. Payload contains `roomRemainingPay > 0`, `roomAdvancePay > 0`, `roomPrice > 0`, `associatedOrders[]` non-empty, `associatedOrdersTotal > 0`, `finalPayable = food + assoc + balance`. |
| T-5 | Click manual `Print Bill` on room with NO transfers, NO balance (food-only room order) | Payload `associatedOrders=[]`, `associatedOrdersTotal=0`, `roomRemainingPay=0`. `finalPayable = food`. |
| T-6 | Dashboard `OrderCard` printer icon click on a room order (default branch) | `printOrder` fires with default-branch payload that ALSO carries the room fields populated from `order.roomInfo`. Verifies `buildBillPrintPayload` populates room data even without overrides. |
| T-7 | Apply a discount on a room collect-bill, click manual Print | Discount applies to `discount_amount` (food-related) only; `roomRemainingPay` unchanged. |
| T-8 | Apply a tip on a room collect-bill | Tip applies to food-side `Tip` field only; `roomRemainingPay` unchanged. |
| T-9 | Empty room (`billFoodList=[]`, no transfers, ₹0 balance) place-order | Auto-print SKIPPED (Q-3A=strict). Manual Print Bill button optionally disabled if `!hasPlacedItems` (existing rule). |
| T-10 | Tenant where backend printer template doesn't understand new keys | Receipt prints WITHOUT new fields (graceful degradation if backend silently drops). Verify visually. |
| T-11 | Dine-in order at a table that's also a room (data-defect tenant) | Existing `isRoom` derivation drives behavior; verify `effectiveTable.isRoom` is the source of truth in OrderEntry. |
| T-12 | Transfer-to-Room (Scenario 3) | No print fires (Q-3I=a). |

---

## 7. Risk / Impact

- **HIGH** if backend printer template doesn't understand new keys (Q-3C). Mitigation: get a sample print payload from a known-good tenant before implementation.
- **MEDIUM** if Q-3A scope is partial — inconsistent UX between prepaid and postpaid rooms.
- **MEDIUM** if Q-3F semantics are wrong — discount or SC could be mis-billed on room.
- **LOW** for V3 doc churn.
- **LOW** for code complexity — surgery is contained to 3 files.

---

## 8. V3 Documentation Implication

Two new ADs to be queued in `/app/memory/V3_DOC_UPDATES_PENDING.md`:

1. **AD-302A — Room Auto-Print Suppression**
   - Decision: Auto-bill print is suppressed for any order where `isRoom === true`, regardless of `settings.autoBill`. Applies to Scenario 1 (postpaid collect-bill) and Scenario 2 (prepaid place+pay).
   - Manual `Print Bill` remains available.
   - Supersedes AD-302 for room orders.
   - Code anchors: `OrderEntry.jsx:1103`, `OrderEntry.jsx:1310`.

2. **AD-Room-Print-Payload**
   - Decision: Print payload for room orders carries the same financial breakdown the cashier sees in `CollectPaymentPanel`: `roomPrice`, `roomAdvancePay`, `roomRemainingPay`, `associatedOrders[]`, `associatedOrdersTotal`, `finalPayable`, `paid_room`, `room_id`.
   - SC / discount / tip / GST / VAT continue to apply to food subtotal only — room balance is a flat pass-through (architectural rule preserved).
   - Source: `order.roomInfo` and `order.associatedOrders`, both populated by `fromAPI.order` from `api.room_info` and `api.associated_order_list`.
   - Code anchors: `orderTransform.js:1219-1245` (replace hardcodes + extend), `CollectPaymentPanel.jsx:458-490` (extend manual-print overrides).

---

## 9. Out Of Scope (Don't Do)

- Backend changes (must be verified by Abhishek/backend team that printer template understands the new keys).
- New permission keys.
- Refactoring the existing `buildBillPrintPayload` discount/SC logic (BUG-006/BUG-018/BUG-021/BUG-023 territory).
- Changing aggregator (Swiggy/Zomato) order print behavior.

---

## 10. Questions That Need Owner Approval (Answer Each)

### Q-3A — Auto-bill suppression scope
- **(a)** Strict — block for ANY `isRoom` order, both Scenarios 1 and 2. **RECOMMENDED.**
- **(b)** Postpaid-only — block only Scenario 1.
- **(c)** Balance-conditional — block only when `roomInfo.balancePayment > 0`.
- **(d)** Other — describe.

> Your call: ___

### Q-3B — Manual Print Bill button for rooms
- **(a)** Keep enabled for rooms with enriched payload. **RECOMMENDED.**
- **(b)** Disable for rooms.
- **(c)** Keep enabled but emit a different payload than auto-bill.

> Your call: ___

### Q-3C — Backend printer template knowledge (BLOCKING)
Does the backend printer template / `order-temp-store` already understand the proposed new keys (`roomPrice`, `associatedOrders[]`, `associatedOrdersTotal`, `finalPayable`, `paid_room`, `room_id`)?
- **(a)** YES — keys understood; safe to send.
- **(b)** NO — keys unknown; will be dropped silently.
- **(c)** UNKNOWN — please check with backend team / provide a sample print payload from a tenant where room receipts already print correctly.

If (b) or (c), implementation is BLOCKED until owner confirms key names.

> Your call: ___

### Q-3D — Exact key contract
Confirm or override each row. Defaults are my proposals.

| Requirement field | Proposed key | Type | Source field |
|---|---|---|---|
| Room details / label | reuse existing `tablename` (room number string) | string | `order.tableNumber` |
| Advance payment | reuse `roomAdvancePay` (already in payload, currently 0) | number | `order.roomInfo.advancePayment` |
| Balance payment | reuse `roomRemainingPay` (already in payload, currently 0) | number | `order.roomInfo.balancePayment` |
| Total room amount | NEW `roomPrice` | number | `order.roomInfo.roomPrice` |
| Associated orders | NEW `associatedOrders[]` of `{ order_id, restaurant_order_id, amount, transferred_at }` | array | `order.associatedOrders` |
| Room service items | reuse existing `billFoodList` | array | `order.rawOrderDetails` (food in this room order) |
| Total associated order amount | NEW `associatedOrdersTotal` | number | sum of `associatedOrders[].amount` |
| Final payable amount | NEW `finalPayable` (and reuse `payment_amount`/`grant_amount`) | number | `food + associatedTotal + roomBalance` |

> Your call: confirm all defaults / override (specify) ___

### Q-3E — `roomGst` semantics
- **(a)** Stay `0` always (room balance has no GST). **RECOMMENDED.**
- **(b)** Carry GST when `restaurant.features.room_gst_applicable === 'Yes'`. Adds runtime check.

> Your call: ___

### Q-3F — Tax / SC / Tip / Discount applicability on the merged total
Confirm the rule:
- **(a)** SC, discount, tip, GST/VAT apply ONLY to the food-subtotal of THIS room order. NOT to `roomBalance`, NOT to `associatedTotal`. The print payload already enforces this via existing fields. **RECOMMENDED.**
- **(b)** Different rule — describe.

> Your call: ___

### Q-3G — `paid_room` / `room_id` in print payload
- **(a)** YES — add both to print payload (mirror collect-bill). **RECOMMENDED.**
- **(b)** NO — keep print focused on display fields only.

> Your call: ___

### Q-3H — Race / refresh before print
- **(a)** Trust live `CollectPaymentPanel` overrides for manual print + in-memory `order` snapshot for auto-print. Same as today's model. **RECOMMENDED.**
- **(b)** Force a fresh `GET /get-single-order-new` before any room print to refresh `associated_order_list` + `room_info`.

> Your call: ___

### Q-3I — Scenario 3 (Transfer to Room) print
- **(a)** No print (current behavior). **RECOMMENDED.**
- **(b)** Print transfer receipt for source order.
- **(c)** Print updated room bill including the new associated order.

> Your call: ___

### Q-3J — Empty-room (₹0 marker-only) print
- After Q-3A = strict, this is automatically suppressed.
- **(a)** Acceptable; no special receipt. **RECOMMENDED.**
- **(b)** Generate a "₹0 checkout receipt" anyway (special path).

> Your call: ___

### Q-3K — V3 doc updates
- **(a)** YES — append `AD-302A` + `AD-Room-Print-Payload` to `/app/memory/V3_DOC_UPDATES_PENDING.md`. **RECOMMENDED.**
- **(b)** NO — implementation only, no V3 doc update.

> Your call: ___

### Q-3L — Feature flag / kill switch
- **(a)** Hard-coded behavior. **RECOMMENDED** — universal across tenants.
- **(b)** Behind `restaurant.features.roomAutoBillEnabled` flag (default `false`) so tenant can opt back in.

> Your call: ___

---

## 11. Quick-answer cheat sheet (paste back if all defaults are fine + your Q-3C answer)

```
Q-3A: a   (strict suppression both scenarios)
Q-3B: a   (keep manual Print Bill, enriched payload)
Q-3C: ??? (REQUIRED — backend template knowledge)
Q-3D: confirm defaults
Q-3E: a   (roomGst stays 0)
Q-3F: a   (food-only tax/SC/tip/discount)
Q-3G: a   (include paid_room and room_id)
Q-3H: a   (trust live overrides, no extra refetch)
Q-3I: a   (no print on Transfer to Room)
Q-3J: a   (no special ₹0 receipt)
Q-3K: a   (add AD-302A + AD-Room-Print-Payload to V3 queue)
Q-3L: a   (hard-coded, no feature flag)
```

---

## 12. After Approval

I will roll Req 3 into a focused implementation handover (separate doc) with:
- Exact file ranges to edit.
- Per-key payload contract for backend handoff.
- 12-row test plan.
- Rollback plan.

---

_End of Req 3 deep-dive. No code or production docs modified._
