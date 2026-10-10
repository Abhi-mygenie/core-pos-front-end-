# BUG-427 — Implementation Plan (Gate 3)

**ID:** BUG-427  
**Date:** 2026-09-16  
**Risk:** CRITICAL (Total Balance Due wrong by ₹256)  
**Gate 4 GO required before coding**

---

## Scope Lock

**Files WILL change:**
1. `src/api/transforms/folioTransform.js`
2. `src/pages/pms/GuestFolioPage.jsx`

**Files will NOT touch:**
- `pmsService.js` (BUG-426 scope)
- `CheckInPage.jsx`, `RoomCheckInModal.jsx`
- `PmsCheckoutDrawer.jsx`
- `CollectPaymentPanel.jsx` (BUG-428 scope, R5 hotspot)

---

## Edit 1 — `src/api/transforms/folioTransform.js`

### 1a. Add `totalAmount` field to each roomOrder item (after L124 `gstAmount`)

**Current (L122-128):**
```js
const gstPct = parseFloat(fd.tax)  || 0;
const gstAmt = Math.round(amt * gstPct / 100 * 100) / 100;
return {
  name:       fd.name   || 'Item',
  qty,
  unitPrice:  unit,
  amount:     amt,
  gstPercent: gstPct,
  gstAmount:  gstAmt,
```

**New (add `totalAmount` after `gstAmount`):**
```js
const gstPct = parseFloat(fd.tax)  || 0;
const gstAmt = Math.round(amt * gstPct / 100 * 100) / 100;
return {
  name:       fd.name   || 'Item',
  qty,
  unitPrice:  unit,
  amount:     amt,
  gstPercent: gstPct,
  gstAmount:  gstAmt,
  totalAmount: Math.round((amt + gstAmt) * 100) / 100, // BUG-427: post-GST total per item
```

---

## Edit 2 — `src/pages/pms/GuestFolioPage.jsx`

### 2a. Add `useRestaurant` import (line 6, after existing imports)

```js
import { useRestaurant } from '../../contexts'; // BUG-427: roomGstApplicable flag
```

### 2b. Add restaurant context read inside `GuestFolioPage()` (after L110 `const navigate`)

```js
const { restaurant } = useRestaurant(); // BUG-427
const roomGstApplicable = restaurant?.checkInFlags?.roomGstApplicable ?? false; // BUG-427 OD-427-06
```

### 2c. Add `roomOrdersTotal` computed value (after L133 `fnbTotal` line)

**Current (L133):**
```js
const fnbTotal = folio?.associatedOrders?.reduce((s, a) => s + a.amount, 0) ?? 0;
```

**New (add after L133):**
```js
const fnbTotal = folio?.associatedOrders?.reduce((s, a) => s + a.amount, 0) ?? 0;
// BUG-427 OD-427-01/05: room-native orders post-GST total (conditional on roomGstApplicable flag)
const roomOrdersTotal = (folio?.roomOrders ?? []).reduce(
  (s, r) => s + (roomGstApplicable ? (r.totalAmount ?? r.amount + r.gstAmount) : r.amount), 0
);
```

### 2d. Fix Room Orders section total (L350)

**Current:**
```js
Room Orders Total: {fmtINR(folio.roomOrders.reduce((s, r) => s + r.amount, 0))}
```

**New:**
```js
Room Orders Total: {fmtINR(folio.roomOrders.reduce((s, r) => s + (roomGstApplicable ? (r.totalAmount ?? r.amount + r.gstAmount) : r.amount), 0))}{/* BUG-427 OD-427-02 */}
```

### 2e. Replace single F&B Posted tile with 2 separate tiles (L372-386)

**Current (grid-cols-2):**
```jsx
<div className="grid grid-cols-2 gap-2 mb-2">
  <div className="bg-[#FFF4F0] ...">
    <div ... >Room Balance</div>
    <div ... data-testid="room-balance-display">{fmtINR(roomBalance)}</div>
  </div>
  <div className="bg-[#FFFBEB] ...">
    <div ...>F&B Posted</div>
    <div ... data-testid="fb-balance-display">{fmtINR(fnbTotal)}</div>
  </div>
</div>
```

**New (grid-cols-3, 3 tiles — OD-427-04 "2 different"):**
```jsx
<div className="grid grid-cols-3 gap-2 mb-2">{/* BUG-427 OD-427-04: 2 separate tiles */}
  <div className="bg-[#FFF4F0] border border-[#F26B33]/20 rounded-lg p-3 text-center">
    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-1">Room Balance</div>
    <div className="text-[14px] font-bold text-[#EF4444]" data-testid="room-balance-display">
      {fmtINR(roomBalance)}
    </div>
  </div>
  <div className="bg-[#FFFBEB] border border-[#F4A11A]/25 rounded-lg p-3 text-center">
    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-1">Transferred F&B</div>
    <div className={`text-[14px] font-bold ${fnbTotal > 0 ? 'text-[#D97706]' : 'text-[#ccc]'}`}
      data-testid="fb-balance-display">
      {fmtINR(fnbTotal)}
    </div>
  </div>
  <div className="bg-[#F0F9FF] border border-[#3B82F6]/20 rounded-lg p-3 text-center">{/* BUG-427 */}
    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888] mb-1">Room Orders</div>
    <div className={`text-[14px] font-bold ${roomOrdersTotal > 0 ? 'text-[#2563EB]' : 'text-[#ccc]'}`}
      data-testid="room-orders-balance-display">
      {fmtINR(roomOrdersTotal)}
    </div>
  </div>
</div>
```

### 2f. Fix Total Balance Due (L390)

**Current:**
```js
{fmtINR(roomBalance + fnbTotal)}
```

**New:**
```js
{fmtINR(roomBalance + fnbTotal + roomOrdersTotal)}{/* BUG-427 OD-427-01 */}
```

---

## Verification Matrix

| # | Edit | File | How to Verify | Manual/Auto |
|---|------|------|---------------|:---:|
| V1 | `totalAmount` field exists per roomOrder | `folioTransform.js` | Read L122-128 area | Manual |
| V2 | `totalAmount = amt + gstAmt` | Same | Read | Manual |
| V3 | useRestaurant imported | `GuestFolioPage.jsx` | Read imports | Manual |
| V4 | roomGstApplicable read from checkInFlags | Component body | Read | Manual |
| V5 | roomOrdersTotal computed conditionally | After fnbTotal line | Read | Manual |
| V6 | Room Orders section total uses conditional post-GST | L350 area | Read | Manual |
| V7 | 3-tile grid layout present | JSX | Read | Manual |
| V8 | Tile 1 = Room Balance | JSX | Read | Manual |
| V9 | Tile 2 = Transferred F&B (renamed, data-testid fb-balance-display) | JSX | Read | Manual |
| V10 | Tile 3 = Room Orders (new, data-testid room-orders-balance-display) | JSX | Read | Manual |
| V11 | Total Balance Due = roomBalance + fnbTotal + roomOrdersTotal | JSX L390 area | Read | Manual |
| V12 | Browser: folio for "test gst" — Room Orders tile shows ₹256, Total Balance Due shows ₹1,624 | Browser | Navigate to /pms/folio/orderId | Manual |
| V13 | Browser: roomGstApplicable=false — Room Orders tile shows ₹228 (no GST), Total Balance Due adjusts | Browser | Toggle flag | Manual |
| V14 | Webpack 0 new warnings | Terminal | yarn start log | Manual |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-427 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
- [ ] BUG_TRACKER.md: BUG-427 row updated
- [ ] FILE_OWNERSHIP.md: folioTransform.js + GuestFolioPage.jsx listed under BUG-427
- [ ] Code markers: // BUG-427 in every modified section
- [ ] Compile: webpack 0 new warnings
```

---

## Execution Sequence

1. Edit `folioTransform.js` (Edit 1a)
2. Edit `GuestFolioPage.jsx` (Edits 2a → 2f in order)
3. Verify webpack compiles
4. Self-test V1–V14
5. EXIT GATE
6. Write QA Handover

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `r.totalAmount` undefined if folioTransform not updated | LOW | Edit 1 runs before Edit 2; fallback `r.amount + r.gstAmount` in plan |
| `roomGstApplicable` undefined before restaurant loads | LOW | `?? false` default |
| 3-tile grid too narrow on small screens | LOW | `grid-cols-3` with `p-3` padding — 3 tiles at ~33% width each, content short (number only) |
| BUG-424 ↔ BUG-427 interaction: BUG-424 roomOrders section display (pre-tax rows) untouched | NONE | Per-row display uses `r.amount` (pre-tax) unchanged; only section total and tiles change |
| Total Balance Due over-counts if BUG-426 is not yet deployed | NOTE | BUG-426 is pmsService/InHouse; BUG-427 is GuestFolioPage — independent calculation paths, no conflict |
