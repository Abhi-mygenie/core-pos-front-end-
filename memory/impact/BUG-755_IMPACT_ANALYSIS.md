# BUG-755 — Gate 2 Impact Analysis
## Dashboard Room Tile Amount Differs Between Table View and Order View

**ID:** BUG-755
**Date:** 2026-11-27
**Role:** PLANNING — Gate 2 (Impact Analysis only)
**Code Reality:** NONE — no existing fix for this discrepancy in Order View
**Conflict pre-check:** CLEAN — no open items on `ChannelColumn.jsx`

---

## 1. Root Cause (from Investigation)

`USE_CHANNEL_LAYOUT = true` (featureFlags.js:20) → both Table View and Order View render via `ChannelColumnsLayout` → `ChannelColumn`.

**`ChannelColumn.jsx` line 349 — BREAK POINT:**
```javascript
// Order View rendering path
const order = item.order || item;   // ← extracts raw order, LOSES item.amount
<OrderCard order={order} .../>      // ← OrderCard renders order.amount = food only
```

**Table View rendering path (correct):**
```javascript
<TableCard table={item} .../>        // ← TableCard renders table.amount = item.amount = computeRoomCardAmount
```

Each room entry in `channelData.room.items` (sourced from `allRoomsList`) has:
- `item.amount` = `computeRoomCardAmount(order)` = food + serviceTax + transferredOrders + roomBalance ← **correct**
- `item.order` = raw order object where `order.amount` = food subtotal only ← **wrong when used directly**

**Data flow in Order View:**
```
allRoomsList (DashboardPage.jsx L729-764):
  item.amount = computeRoomCardAmount(order)      ← correct total (e.g. ₹473)
  item.order  = raw order { amount: 126 }         ← food only

channelData.room.items = allRoomsList.filter(...)

ChannelColumn.jsx Order View path (L349):
  const order = item.order || item                ← takes raw order
  <OrderCard order={order}/>                       ← shows order.amount = ₹126 ❌

ChannelColumn.jsx Table View path (L320):
  <TableCard table={item}/>                        ← shows item.amount = ₹473 ✅
```

---

## 2. Affected Files

| File | Change needed | Risk |
|------|--------------|------|
| `src/components/dashboard/ChannelColumn.jsx` | **WILL CHANGE** — 1-2 lines at L349: for room items override amount with enriched `item.amount` | LOW |
| `src/pages/DashboardPage.jsx` | **WILL NOT TOUCH** (R5 hotspot; `allRoomsList` already correctly sets `item.amount`) |  |
| `src/components/cards/OrderCard.jsx` | **WILL NOT TOUCH** (OrderCard correctly shows what it receives) |  |
| `src/pages/DashboardPage.jsx` → `computeRoomCardAmount` | **WILL NOT TOUCH** (function already correct) |  |

---

## 3. Fix Direction

**File:** `ChannelColumn.jsx` — **not an R5 hotspot**. Last touched: CR-432 (2026-10-16) column-count masonry.

**Edit at L349:** For room items, override `order.amount` with the enriched `item.amount` before passing to OrderCard:

```javascript
// Current (L349):
const order = item.order || item;

// Fix: for room items, use the computeRoomCardAmount value already computed in allRoomsList
const order = item.order || item;
const orderForCard = (item.isRoom && item.amount != null)
  ? { ...order, amount: item.amount }
  : order;
// Then use orderForCard in <OrderCard order={orderForCard} .../>
```

**Scope:** 1 file (`ChannelColumn.jsx`), ~2 lines, no API change, no context change, no transform change.

---

## 4. Owner Decisions

No open decisions — root cause and fix direction are clear.

---

## 5. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Non-room OrderCards accidentally receive wrong amount | LOW | Fix is guarded by `item.isRoom` — only room items are affected |
| DineIn/TakeAway/Delivery cards change | NONE | `item.isRoom` guard ensures only room channel items get the override |
| TableCard rendering in Table View | NONE | TableCard path not touched (L320 branch unchanged) |
| Regression on existing BUG-532 SC fix | NONE | `computeRoomCardAmount` already includes serviceTax (BUG-532 fix at DashboardPage L52) |

---

## 6. Verification Matrix (seeds Gate 3 plan)

| # | Verification | Method |
|---|-------------|--------|
| V1 | Room R1 shows same amount in Table View and Order View | Browser: compare side by side |
| V2 | Room with zero balance shows same amount in both views | Browser: R9 should show ₹420 in both |
| V3 | Dine-In amounts unchanged in both views | Browser: TB1 ₹368 unaffected |
| V4 | Room R2 (no food) shows room balance in Order View | Browser: should show ₹525, not ₹0 |
| V5 | Available rooms (no order) not shown in Order View | Code: `item.orderId` guard at L317 unchanged |

---

## 7. Downstream Consumers

No downstream consumers — this is a pure rendering change. The `CollectPaymentPanel` and billing flows read from their own order state, not from this display.

**Gate 2 IA complete. Awaiting Gate 3 GO.**
