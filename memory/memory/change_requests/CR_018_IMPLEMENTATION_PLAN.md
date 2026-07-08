# CR-018 — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-09
**CR:** CR-018 — Schedule Order (Place orders for future date/time)
**Priority:** P1
**Sprint:** POS 4.0
**Depends on:** Gate 2 Impact Analysis (COMPLETE)

---

## 1. Phasing

| Phase | Description | Files | Blocked? |
|---|---|---|---|
| **Phase A** | Data layer — `fromAPI.order` parse + payload passthrough | `orderTransform.js` | NO |
| **Phase B** | State & plumbing — OrderEntry state + options threading | `OrderEntry.jsx` | NO |
| **Phase C** | UI — CartPanel schedule checkbox + date/time picker | `CartPanel.jsx` | NO |
| **Phase D** | Display — OrderCard badge + ScanOrderPopOut guard | `OrderCard.jsx`, `ScanOrderPopOut.jsx` | NO (renders when data available) |
| **Phase E** | Dashboard — filter predicate fix | `DashboardPage.jsx` | NO (activates when backend returns data) |

**Implementation order:** A → B → C → D → E (strict dependency chain: A is consumed by B+D+E; B feeds C).

---

## 2. Phase A — Data Layer (`orderTransform.js`)

### Step A1: Add `scheduled`/`scheduleAt` to `fromAPI.order` (L163)

**Location:** After `deliveryCharge` at L297.

**Insert after L297** (`deliveryCharge: parseFloat(api.delivery_charge) || 0,`):
```js
      // CR-018: Schedule Order (Jun-2026). Parse scheduling fields from backend.
      // `scheduled` is 0/1 integer from backend — coerce to boolean.
      // `schedule_at` is "YYYY-MM-DD HH:mm:ss" string or null.
      scheduled: api.scheduled === 1 || api.scheduled === '1',
      scheduleAt: api.schedule_at || null,
```

**Rationale:** Every downstream consumer (OrderCard, ScanOrderPopOut, DashboardPage, socket handlers) reads from this transform. Adding here propagates automatically.

**Risk:** None — additive fields, default `false`/`null` when backend omits them.

---

### Step A2: Modify `placeOrder` options destructuring (L859)

**Current (L859):**
```js
const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0, deliveryCharge = 0, serviceChargeTaxPct = 0, deliveryChargeGstPct = 0, printerAgents = [], roundOffEnabled = true } = options;
```

**New:**
```js
const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0, deliveryCharge = 0, serviceChargeTaxPct = 0, deliveryChargeGstPct = 0, printerAgents = [], roundOffEnabled = true, scheduled = false, scheduleAt = null } = options;
```

**Change:** Append `, scheduled = false, scheduleAt = null` to destructuring.

---

### Step A3: Modify `placeOrder` payload (L901-902)

**Current:**
```js
      scheduled:                  0,
      schedule_at:                null,
```

**New:**
```js
      // CR-018 (Jun-2026): schedule order — pass through from options.
      scheduled:                  scheduled ? 1 : 0,
      schedule_at:                scheduleAt || null,
```

---

### Step A4: Modify `placeOrderWithPayment` options destructuring (L1087)

**Current (L1087):**
```js
const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0, autoBill = false, serviceChargeTaxPct = 0, deliveryChargeGstPct = 0, printerAgents = [], roundOffEnabled = true } = options;
```

**New:**
```js
const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0, autoBill = false, serviceChargeTaxPct = 0, deliveryChargeGstPct = 0, printerAgents = [], roundOffEnabled = true, scheduled = false, scheduleAt = null } = options;
```

---

### Step A5: Modify `placeOrderWithPayment` payload (L1158-1159)

**Current:**
```js
      scheduled:                  0,
      schedule_at:                null,
```

**New:**
```js
      // CR-018 (Jun-2026): schedule order — pass through from options.
      scheduled:                  scheduled ? 1 : 0,
      schedule_at:                scheduleAt || null,
```

---

### Phase A Summary
- **Lines changed:** ~10
- **Files:** `orderTransform.js` only
- **Test:** `JSON.stringify(payload)` in console for placeOrder — verify `scheduled:1` + `schedule_at` when options provided, `scheduled:0` + `schedule_at:null` when not (backward compat).

---

## 3. Phase B — State & Plumbing (`OrderEntry.jsx`)

### Step B1: Add schedule state (after L148)

**Insert after L148** (`const [walkInTableName, setWalkInTableName] = useState("");`):
```js
  // CR-018: Schedule Order state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(null); // "YYYY-MM-DD HH:mm:ss" or null
```

---

### Step B2: Reset schedule state on order type change to delivery

**Location:** Find the `orderType` change effect or the `onOrderTypeChange` handler. Schedule is only for dineIn / takeAway / walkIn — if cashier switches to delivery, reset.

**Add effect (near existing orderType-dependent effects):**
```js
  // CR-018: Reset schedule when switching to order types that don't support it
  useEffect(() => {
    if (orderType === 'delivery') {
      setIsScheduled(false);
      setScheduleAt(null);
    }
  }, [orderType]);
```

---

### Step B3: Thread schedule options into `placeOrder` call — Scenario 2 unpaid (L968-984)

**Current options object (L971-983):**
```js
{ restaurantId: restaurant?.id, orderNotes, total, printAllKOT, addressId: ..., deliveryAddress: ..., serviceChargePercentage: ...,
  deliveryCharge: ...,
  serviceChargeTaxPct: ...,
  deliveryChargeGstPct: ...,
  printerAgents: ...,
  roundOffEnabled: ... }
```

**Add at end of options (before closing `}`):**
```js
            // CR-018: Schedule Order
            scheduled: isScheduled,
            scheduleAt,
```

---

### Step B4: Thread schedule options into `placeOrderWithPayment` — Scenario 2 prepaid (L1850-1862)

**Same pattern as B3.** Add to the options object at L1852-1862:
```js
            // CR-018: Schedule Order
            scheduled: isScheduled,
            scheduleAt,
```

---

### Step B5: Thread schedule options into `placeOrderWithPayment` — QSR Place+Pay (L1204-1218)

**Same pattern.** Add to options at L1206-1218:
```js
            // CR-018: Schedule Order
            scheduled: isScheduled,
            scheduleAt,
```

---

### Step B6: Thread schedule props to CartPanel (L2252-2320)

**Add to `<CartPanel ... />` JSX (after `placedOrderData` prop at L2319):**
```jsx
                // CR-018: Schedule Order
                isScheduled={isScheduled}
                setIsScheduled={setIsScheduled}
                scheduleAt={scheduleAt}
                setScheduleAt={setScheduleAt}
```

---

### Step B7: Pre-populate on re-engage (if orderData is a scheduled order)

**Add after state declarations (near L148):**
```js
  // CR-018: Pre-populate schedule state on re-engage of existing scheduled order
  useEffect(() => {
    if (orderData?.scheduled) {
      setIsScheduled(true);
      setScheduleAt(orderData.scheduleAt || null);
    }
  }, [orderData?.scheduled, orderData?.scheduleAt]);
```

---

### Phase B Summary
- **Lines changed:** ~25
- **Files:** `OrderEntry.jsx` only
- **Test:** Console log payload at all 3 call sites — verify schedule options appear.

---

## 4. Phase C — UI (`CartPanel.jsx`)

### Step C1: Add new props to CartPanel signature (L671-734)

**Add after `placedOrderData` prop (L733):**
```js
  // CR-018: Schedule Order
  isScheduled = false,
  setIsScheduled,
  scheduleAt = null,
  setScheduleAt,
```

---

### Step C2: Build schedule UI section

**Insert after the KotBillCheckboxes block (after L1193, before `</div>` at L1194).**

The schedule checkbox is INSIDE the same conditional as KOT/Bill: only visible when there are unplaced items, not in QSR mode, and only for allowed order types (not delivery, not room).

```jsx
        {/* CR-018: Schedule Order checkbox + date/time picker.
            Visible: unplaced items exist + not QSR + not delivery + not room. */}
        {!qsrMode && cartItems.some(i => !i.placed) && orderType !== 'delivery' && !isRoom && (
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
            <label className="flex items-center gap-2 cursor-pointer" data-testid="schedule-order-checkbox">
              <input
                type="checkbox"
                checked={!!isScheduled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsScheduled(checked);
                  if (!checked) setScheduleAt(null);
                }}
                disabled={hasPlacedItems}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                style={{ accentColor: '#1976D2' }}
              />
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Schedule Order</span>
            </label>

            {/* Expandable date/time picker — visible when checkbox is checked */}
            {isScheduled && (
              <div className="mt-2 flex items-center gap-2" data-testid="schedule-datetime-picker">
                <input
                  type="date"
                  data-testid="schedule-date-input"
                  value={scheduleAt ? scheduleAt.split(' ')[0] : ''}
                  min={new Date().toISOString().split('T')[0]}
                  max={(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; })()}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = scheduleAt ? scheduleAt.split(' ')[1] : '';
                    if (date && time) setScheduleAt(`${date} ${time}`);
                    else if (date) setScheduleAt(`${date} `);
                  }}
                  className="flex-1 px-2 py-1.5 text-sm border rounded"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                />
                <select
                  data-testid="schedule-time-select"
                  value={scheduleAt ? scheduleAt.split(' ')[1] || '' : ''}
                  onChange={(e) => {
                    const time = e.target.value;
                    const date = scheduleAt ? scheduleAt.split(' ')[0] : new Date().toISOString().split('T')[0];
                    if (date && time) setScheduleAt(`${date} ${time}`);
                  }}
                  className="px-2 py-1.5 text-sm border rounded"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                >
                  <option value="">Time</option>
                  {generateTimeSlots().map(slot => (
                    <option key={slot} value={slot}>{slot.slice(0, 5)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Read-only display for already-placed scheduled orders */}
            {hasPlacedItems && isScheduled && scheduleAt && (
              <p className="mt-1 text-xs" style={{ color: COLORS.grayText }}>
                Scheduled for: {scheduleAt}
              </p>
            )}
          </div>
        )}
```

---

### Step C3: Add `generateTimeSlots` utility

**Insert as a helper ABOVE the CartPanel component (near top of file, after imports, before any component):**

```js
// CR-018: Generate 15-minute interval time slots for schedule picker
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}:00`);
    }
  }
  return slots;
};
```

---

### Step C4: Disable Place Order when schedule is incomplete

**Location:** Place Order button disabled condition at L1354.

**Current:**
```js
disabled={newItemCount === 0 || isPlacingOrder || hasValidationErrors}
```

**New:**
```js
disabled={newItemCount === 0 || isPlacingOrder || hasValidationErrors || (isScheduled && !scheduleAt?.trim())}
```

This prevents placing an order with "Schedule" checked but no date/time selected.

---

### Phase C Summary
- **Lines changed:** ~65
- **Files:** `CartPanel.jsx` only
- **Test:** Visual — checkbox appears for dineIn/takeAway/walkIn, hidden for delivery/room/QSR. Picker appears on check. Place Order disabled when schedule checked but no time selected.

---

## 5. Phase D — Display (`OrderCard.jsx` + `ScanOrderPopOut.jsx`)

### Step D1: Add scheduled badge to OrderCard (after L451)

**Insert after the HOLD badge block (after L451):**
```jsx
        {/* CR-018: Scheduled badge — visible when order.scheduled is true.
            Displays schedule date/time. Distinct blue color. */}
        {order.scheduled && (
          <span
            data-testid={`scheduled-badge-${orderId}`}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}
            title={order.scheduleAt ? `Scheduled: ${order.scheduleAt}` : 'Scheduled Order'}
          >
            {order.scheduleAt
              ? `SCH ${new Date(order.scheduleAt.replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`
              : 'SCHEDULED'}
          </span>
        )}
```

---

### Step D2: Guard ScanOrderPopOut predicate (L56-57)

**Current:**
```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7;
```

**New:**
```js
// CR-018: Exclude scheduled POS orders — they share fOrderStatus 7 with web
// YTC orders but must NOT appear in the web-order pop-out.
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled;
```

---

### Phase D Summary
- **Lines changed:** ~15
- **Files:** `OrderCard.jsx`, `ScanOrderPopOut.jsx`
- **Test:** Badge renders when `order.scheduled === true`. ScanOrderPopOut excludes scheduled orders.

---

## 6. Phase E — Dashboard Filter (`DashboardPage.jsx`)

### Step E1: Fix filter predicate (L1109)

**Current:**
```js
if (tableFilter === 'schedule') return gridItems.filter(item => item.status === 'scheduled');
```

**New:**
```js
// CR-018: filter by `scheduled` boolean (not `status` which derives from fOrderStatus)
if (tableFilter === 'schedule') return gridItems.filter(item => item.scheduled === true || item.order?.scheduled === true);
```

**Rationale:** `item.status` is derived from `mapOrderStatus(fOrderStatus)` — there is no fOrderStatus that maps to `'scheduled'`. The correct field is the boolean `scheduled` from `fromAPI.order`.

---

### Phase E Summary
- **Lines changed:** 1
- **Files:** `DashboardPage.jsx`
- **Test:** Dormant until backend returns scheduled orders in running-orders API. When it does, the schedule tab filter will work automatically.

---

## 7. Deferred Items (Not in This Implementation)

| Item | Reason | Tracked |
|---|---|---|
| Status View "Scheduled" dedicated column | Architecture risk R10 — requires secondary filter in column grouping. Badge sufficient for Phase 1. | CR-018 Phase 2 |
| Header.jsx "Scheduled" tab button | Dormant until backend fix (B1). Can activate later with a count badge. | CR-018 Phase 2 |
| QSR mode scheduling | Out of scope per intake Decision. | CR-018 Phase 2 |
| Auto-notification on schedule time arrival | Out of scope per intake Decision #8. | Future CR |
| `updateOrder` carrying `scheduled` flag | Depends on backend behavior investigation (B3). | CR-018 Phase 2 |

---

## 8. Implementation Checklist

```
Phase A — Data Layer (orderTransform.js)
  [ ] A1. fromAPI.order: add scheduled + scheduleAt fields (after L297)
  [ ] A2. placeOrder: add scheduled/scheduleAt to options destructuring (L859)
  [ ] A3. placeOrder: replace hardcoded 0/null with options (L901-902)
  [ ] A4. placeOrderWithPayment: add scheduled/scheduleAt to options destructuring (L1087)
  [ ] A5. placeOrderWithPayment: replace hardcoded 0/null with options (L1158-1159)

Phase B — State & Plumbing (OrderEntry.jsx)
  [ ] B1. Add isScheduled + scheduleAt state (after L148)
  [ ] B2. Add orderType change effect to reset schedule on delivery
  [ ] B3. Thread schedule into placeOrder options — unpaid (L968)
  [ ] B4. Thread schedule into placeOrderWithPayment — prepaid (L1850)
  [ ] B5. Thread schedule into placeOrderWithPayment — QSR (L1204)
  [ ] B6. Thread schedule props to CartPanel JSX (L2252)
  [ ] B7. Pre-populate on re-engage from orderData

Phase C — UI (CartPanel.jsx)
  [ ] C1. Add new props to CartPanel signature (L733)
  [ ] C2. Schedule checkbox + date/time picker JSX (after L1193)
  [ ] C3. generateTimeSlots utility (top of file)
  [ ] C4. Place Order button disable when schedule incomplete (L1354)

Phase D — Display (OrderCard.jsx, ScanOrderPopOut.jsx)
  [ ] D1. Scheduled badge in OrderCard (after L451)
  [ ] D2. Guard ScanOrderPopOut predicate (L56-57)

Phase E — Dashboard (DashboardPage.jsx)
  [ ] E1. Fix filter predicate (L1109)
```

---

## 9. Estimated Effort

| Phase | Lines | Time |
|---|---|---|
| A | ~10 | 5 min |
| B | ~25 | 10 min |
| C | ~65 | 20 min |
| D | ~15 | 5 min |
| E | ~1 | 1 min |
| **Total** | **~116** | **~41 min** |

---

## 10. Validation Plan

| # | Test Case | Phase | Method |
|---|---|---|---|
| V1 | Place scheduled takeaway → payload has `scheduled:1` + `schedule_at` | A+B | Console log / curl |
| V2 | Place non-scheduled order → payload has `scheduled:0` + `schedule_at:null` | A | Console log |
| V3 | Schedule checkbox visible for dineIn/takeAway/walkIn | C | Visual |
| V4 | Schedule checkbox HIDDEN for delivery | C | Visual |
| V5 | Schedule checkbox HIDDEN for room orders | C | Visual |
| V6 | Schedule checkbox HIDDEN in QSR mode | C | Visual |
| V7 | Date picker enforces min (today) and max (today + 1 month) | C | Visual |
| V8 | Time picker shows 15-min intervals (00:00 through 23:45) | C | Visual |
| V9 | Place Order disabled when schedule checked but no time | C | Visual |
| V10 | Scheduled badge renders on OrderCard (when `scheduled: true`) | D | Visual (mock data or backend fix) |
| V11 | ScanOrderPopOut does NOT show scheduled orders with fOrderStatus 7 | D | Code review / unit test |
| V12 | Prepaid + scheduled order → payload correct | A+B | Console log |
| V13 | Re-engage scheduled order → checkbox pre-checked + read-only | B+C | Visual (requires backend fix) |
| V14 | Switch from dineIn (scheduled) to delivery → schedule resets | B | Console log |

---

## 11. Rollback Plan

Each phase is independently deployable and backward-compatible:
- **Phase A:** `fromAPI.order` adds optional fields (existing consumers ignore unknown fields). Payload changes are gated by `scheduled = false` default (emits `0`/`null` — identical to today).
- **Phase B:** New state initializes to `false`/`null` — no behavioral change unless user checks the box.
- **Phase C:** UI hidden unless checkbox is checked.
- **Phase D:** Badge hidden when `order.scheduled` is falsy. ScanOrderPopOut guard is additive.
- **Phase E:** Filter already dormant (no orders match).

**Zero-regression guarantee:** Unchecked checkbox = identical payload to today.

---

*CR-018 Implementation Plan — 2026-06-09. Gate 3 COMPLETE. 5 phases, 15 steps, ~116 lines across 5 files. Ready for Gate 4 (Code Gate / Scope Lock).*
