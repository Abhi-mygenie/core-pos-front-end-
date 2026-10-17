# BUG-426 — Implementation Plan (Gate 3)

**ID:** BUG-426  
**Date:** 2026-09-16  
**Risk:** HIGH (financial display)  
**Gate 4 GO required before coding**

---

## Scope Lock

**Files WILL change:**
1. `src/api/services/pmsService.js`
2. `src/pages/pms/InHouseGuestsPage.jsx`

**Files will NOT touch:**
- `GuestFolioPage.jsx` (BUG-427 scope)
- `folioTransform.js` (BUG-427 scope)
- `CheckInPage.jsx`
- `RoomCheckInModal.jsx`
- `PmsCheckoutDrawer.jsx`
- `CollectPaymentPanel.jsx` (R5 hotspot — not touched)

---

## Edit 1 — `src/api/services/pmsService.js`

### 1a. Function signature update (L38)

**Current:**
```js
export const getInHouseGuests = async () => {
```

**New:**
```js
export const getInHouseGuests = async ({ roomGstApplicable = false } = {}) => {
```

### 1b. Step 3 inner loop extension (after L108 `row.balance = Math.max(...)`)

**Current (L103-109):**
```js
const ri = raw.room_info ?? {};
const rp = Number(ri.room_price      ?? 0);
const gt = Number(ri.gst_tax         ?? 0);
const ap = Number(ri.advance_payment ?? 0);
const rb = Number(ri.receive_balance ?? 0);
row.balance = Math.max(0, rp + gt - ap - rb);
```

**New (replace those lines):**
```js
const ri = raw.room_info ?? {};
const rp = Number(ri.room_price      ?? 0);
const gt = Number(ri.gst_tax         ?? 0);
const ap = Number(ri.advance_payment ?? 0);
const rb = Number(ri.receive_balance ?? 0);
const roomBalance = Math.max(0, rp + gt - ap - rb);

// BUG-426 OD-426-03: transferred F&B (2 different from room orders)
const transferredFnb = (raw.associated_order_list ?? []).reduce(
  (s, a) => s + Number(a.order_amount ?? 0), 0
);

// BUG-426 OD-426-03: room-native food orders — conditional GST per OD-426-02
const roomOrdersTotal = (raw.orderDetails ?? [])
  .filter(d => {
    if ((d.food_details?.name ?? '').toLowerCase() === 'check in') return false;
    if (d.food_status === 'cancelled') return false;
    return true;
  })
  .reduce((s, d) => {
    const qty  = Number(d.quantity) || 1;
    const unit = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
    const amt  = Math.round(unit * qty * 100) / 100;
    if (!roomGstApplicable) return s + amt;
    const gstPct = parseFloat(d.food_details?.tax ?? 0);
    const gstAmt = Math.round(amt * gstPct / 100 * 100) / 100;
    return s + amt + gstAmt;
  }, 0);

// BUG-426: store sub-totals separately (OD-426-03 — 2 different) + total balance
row.transferredFnbBalance = Math.round(transferredFnb * 100) / 100;
row.roomOrdersBalance     = Math.round(roomOrdersTotal * 100) / 100;
row.balance               = Math.round((roomBalance + transferredFnb + roomOrdersTotal) * 100) / 100;
```

---

## Edit 2 — `src/pages/pms/InHouseGuestsPage.jsx`

### 2a. Add import (after existing imports, before line 10)

```js
import { useRestaurant } from '@/contexts'; // BUG-426: roomGstApplicable flag
```

### 2b. Read flag inside component (after line 20 `const navigate`)

```js
const { restaurant } = useRestaurant(); // BUG-426
const roomGstApplicable = restaurant?.checkInFlags?.roomGstApplicable ?? false; // BUG-426
```

### 2c. Pass flag to service (line 26)

**Current:**
```js
const data = await getInHouseGuests();
```

**New:**
```js
const data = await getInHouseGuests({ roomGstApplicable }); // BUG-426
```

### 2d. Add roomGstApplicable to useCallback deps (line 23)

**Current:**
```js
const load = useCallback(async () => {
  ...
}, []);
```

**New:**
```js
const load = useCallback(async () => {
  ...
}, [roomGstApplicable]); // BUG-426: re-load if GST flag changes
```

---

## Verification Matrix

| # | Edit | File | How to Verify | Manual/Auto |
|---|------|------|---------------|:---:|
| V1 | Function signature accepts options object | `pmsService.js` L38 | Read file — `{ roomGstApplicable = false } = {}` present | Manual |
| V2 | transferredFnb computed from associated_order_list | `pmsService.js` Step 3 | Read — reduce over array, accumulates order_amount | Manual |
| V3 | roomOrdersTotal computed with GST conditional | `pmsService.js` Step 3 | Read — filter check-in/cancelled, reduce with roomGstApplicable branch | Manual |
| V4 | row.transferredFnbBalance + row.roomOrdersBalance stored separately | `pmsService.js` | Read — 2 separate row fields assigned | Manual |
| V5 | row.balance = sum of all 3 components | `pmsService.js` | Read — roomBalance + transferredFnb + roomOrdersTotal | Manual |
| V6 | useRestaurant imported in InHouseGuestsPage | `InHouseGuestsPage.jsx` | Read imports | Manual |
| V7 | roomGstApplicable read from context | `InHouseGuestsPage.jsx` | Read component body | Manual |
| V8 | getInHouseGuests called with flag | `InHouseGuestsPage.jsx` | Read load() call | Manual |
| V9 | useCallback deps includes roomGstApplicable | `InHouseGuestsPage.jsx` | Read deps array | Manual |
| V10 | In-House page shows ₹1,624 for test gst (room ₹950 + F&B ₹418 + room orders ₹256) | Browser | Navigate to /pms/in-house, check Balance column | Manual |
| V11 | Outstanding Balance KPI updates correctly | Browser | Same page load | Manual |
| V12 | roomGstApplicable=false restaurant: balance = room + transferred + room orders (no item GST) | Browser/code | Toggle flag, re-verify | Manual |
| V13 | webpack compiles with 0 new warnings | Terminal | yarn start log | Manual |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-426 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
- [ ] BUG_TRACKER.md: BUG-426 row updated
- [ ] FILE_OWNERSHIP.md: pmsService.js + InHouseGuestsPage.jsx listed under BUG-426
- [ ] Code markers: // BUG-426 in every modified section
- [ ] Compile: webpack 0 new warnings
```

---

## Execution Sequence

1. Edit pmsService.js (Edit 1a → 1b)
2. Edit InHouseGuestsPage.jsx (Edit 2a → 2d)
3. Verify webpack compiles
4. Self-test V1–V13
5. Run EXIT GATE checklist
6. Write QA Handover

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| associated_order_list null/undefined | LOW | `?? []` guard already in plan |
| orderDetails null/undefined | LOW | `?? []` guard |
| unit_price missing (use price/qty fallback) | MEDIUM | Fallback `parseFloat(d.price) / qty` in plan |
| roomGstApplicable undefined before restaurant loads | LOW | `?? false` default in service + page |
| useCallback deps missing roomGstApplicable causes stale closure | MEDIUM | Deps array includes flag (Edit 2d) |
| foodGST double-counted vs folio display (BUG-427 interaction) | MEDIUM | BUG-426 is service layer; BUG-427 is folio display — different consumers, no conflict |
