# BUG-430 — Impact Analysis (Gate 2)

**ID:** BUG-430  
**Date:** 2026-09-16  
**Risk:** CRITICAL (financial — GST calculation)  
**Code Reality:** PARTIAL (add-ons calculation missing, GST formula present from BUG-429)

---

## Code Reality Check

**Status: PARTIAL**

### What EXISTS (from BUG-429):
- ✅ `folioTransform.js` L117-124: 3-step GST logic (`gst_tax_amount || tax_amount` first, `inclusive` handling)
- ✅ `pmsService.js` L127-139: Same 3-step GST logic

### What is MISSING:
- ❌ `folioTransform.js` L115: `amt` calculation does NOT include add-ons
- ❌ `pmsService.js` L125: `amt` calculation does NOT include add-ons

### Reference (CORRECT implementation):
- ✅ `orderTransform.js` L1900-1904: Add-ons calculation BEFORE GST

---

## Conflict Pre-Check

### FILE_OWNERSHIP.md Review

**`folioTransform.js`:**
- **Last modified:** BUG-427 (2026-09-16) — Added room orders transform with 3-tile grid
- **Last modified:** BUG-429 (2026-09-16) — Added 3-step GST logic
- **Status:** Recently modified by related bugs, NO conflict

**`pmsService.js`:**
- **Last modified:** BUG-426 (2026-09-16) — Added transferredFnbBalance + roomOrdersBalance
- **Last modified:** BUG-429 (2026-09-16) — Added 3-step GST logic in roomOrdersTotal reduce
- **Status:** Recently modified by related bugs, NO conflict

### Registry Check

**Other items touching same files:**
- BUG-426: pmsService.js (Step 3 extension — IMPLEMENTED)
- BUG-427: folioTransform.js (room orders section — IMPLEMENTED)
- BUG-428: CollectPaymentPanel.jsx only (no conflict)
- BUG-429: Both files (GST formula — IMPLEMENTED)

**Execution order:** BUG-430 builds on top of BUG-426/427/429. All are in same sprint (pos_pms_1).

**Conflict Status:** NONE — BUG-430 is an additive fix to BUG-429's implementation

---

## Data Flow Trace

### Folio Page Flow

```
API: POST /api/v1/order/singleOrderNew
  ↓
Response: res.data.orders.order_details_order.orderDetails[]
  ↓
Transform: folioTransform.js fromAPI.folio()
  ↓ L111-137: .map(d => {...})
  ↓ L114: unit = d.unit_price || (d.price / qty)
  ↓ L115: amt = unit × qty  ← MISSING: + (addonPerUnit × qty)
  ↓ L118-124: gstAmt calculation (BUG-429 3-step logic)
  ↓
Component: GuestFolioPage.jsx
  ↓
Display: Room Orders tile shows sum(totalAmount)
```

**Break Point:** L115 — `amt` excludes add-ons → GST calculated on incomplete base

---

### In-House Page Flow

```
API: GET /api/v2/vendoremployee/aiosell/local-reservations
  ↓
Response: reservations[].rooms[].order_data.order_details[]
  ↓
Service: pmsService.js getInHouseGuests()
  ↓ L122-140: .reduce((s, d) => {...})
  ↓ L124: unit = d.unit_price || (d.price / qty)
  ↓ L125: amt = unit × qty  ← MISSING: + (addonPerUnit × qty)
  ↓ L129-138: gstAmt calculation (BUG-429 3-step logic)
  ↓
Component: InHouseGuestsPage.jsx
  ↓
Display: Balance column shows row.balance
```

**Break Point:** L125 — `amt` excludes add-ons → GST calculated on incomplete base

---

### Checkout Page Flow (CORRECT — Reference)

```
API: POST /api/v1/order/singleOrderNew (same as Folio)
  ↓
Transform: orderTransform.js roomPaymentSummary()
  ↓ L1895-1928: billFoodList.forEach(item => {...})
  ↓ L1900-1903: addonPerUnit = item.add_ons.reduce(...)
  ↓ L1904: lineTotal = (price × qty) + (addonPerUnit × qty)  ✅ Add-ons included!
  ↓ L1907-1916: taxAmt calculation (3-step GST logic)
  ↓
Component: CollectPaymentPanel.jsx / PmsCheckoutDrawer.jsx
  ↓
Display: GRAND TOTAL = ₹1,947 ✅ CORRECT
```

---

## Affected Files

### Edit 1 — `/app/frontend/src/api/transforms/folioTransform.js`

**Target:** L111-115 (inside `.map(d => {...})`)

**Current (L111-115):**
```javascript
.map(d => {
  const fd     = d.food_details || {};
  const qty    = Number(d.quantity)  || 1;
  const unit   = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
  const amt    = Math.round(unit * qty * 100) / 100;  // ← Missing add-ons
```

**Will Change To:**
```javascript
.map(d => {
  const fd     = d.food_details || {};
  const qty    = Number(d.quantity)  || 1;
  const unit   = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
  // BUG-430: include add-ons in GST base (match orderTransform L1900-1904)
  const addonPerUnit = (d.add_ons || []).reduce(
    (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
    0
  );
  const amt    = Math.round((unit * qty + addonPerUnit * qty) * 100) / 100;
```

**Lines Added:** 5 (add-ons reduction + comment)  
**Lines Modified:** 1 (amt calculation)  
**Risk:** LOW (additive only, no change to existing GST logic from BUG-429)

---

### Edit 2 — `/app/frontend/src/api/services/pmsService.js`

**Target:** L122-125 (inside `.reduce((s, d) => {...})`)

**Current (L122-125):**
```javascript
.reduce((s, d) => {
  const qty  = Number(d.quantity) || 1;
  const unit = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
  const amt  = Math.round(unit * qty * 100) / 100;  // ← Missing add-ons
```

**Will Change To:**
```javascript
.reduce((s, d) => {
  const qty  = Number(d.quantity) || 1;
  const unit = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
  // BUG-430: include add-ons in GST base (match orderTransform L1900-1904)
  const addonPerUnit = (d.add_ons || []).reduce(
    (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
    0
  );
  const amt  = Math.round((unit * qty + addonPerUnit * qty) * 100) / 100;
```

**Lines Added:** 5 (add-ons reduction + comment)  
**Lines Modified:** 1 (amt calculation)  
**Risk:** LOW (additive only, no change to existing GST logic from BUG-429)

---

## Downstream Consumers

### `folioTransform.js` Consumers:
1. **`GuestFolioPage.jsx`** — Reads `folio.roomOrders[]` for Room Orders tile
   - **Impact:** Auto-corrects (no code change needed)
   - **Result:** Room Orders will show ₹256 instead of ₹238 ✅

### `pmsService.js` Consumers:
1. **`InHouseGuestsPage.jsx`** — Reads `row.balance` for Balance column
   - **Impact:** Auto-corrects (no code change needed)
   - **Result:** Balance will show ₹1,947 instead of ₹1,930.40 ✅

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Add-ons array absent in API response** | LOW | Minor (falls back to 0 via `\|\| []`) | `.reduce()` on empty array returns 0 — same as before fix |
| **Add-on price/quantity non-numeric** | LOW | None (`parseFloat() \|\| 0` guards) | Already guarded in reduction function |
| **Variable name collision (`addonPerUnit`)** | NONE | None | Scoped inside `.map()` / `.reduce()` callback |
| **Rounding differences** | NONE | None | Uses same `Math.round(...*100)/100` pattern as orderTransform |
| **BUG-429 GST logic broken** | NONE | None | Zero changes to BUG-429 code (L117-124 / L127-139 untouched) |

---

## Testing Strategy

### Verification Checks

**V1 — Add-ons reduction present:**
- Read `folioTransform.js` L116-120 → `addonPerUnit` variable exists
- Read `pmsService.js` L126-130 → `addonPerUnit` variable exists

**V2 — amt includes add-ons:**
- `folioTransform.js` L121: `amt = Math.round((unit * qty + addonPerUnit * qty) * 100) / 100`
- `pmsService.js` L131: `amt = Math.round((unit * qty + addonPerUnit * qty) * 100) / 100`

**V3 — BUG-429 GST logic untouched:**
- `folioTransform.js` L122-129: 3-step GST pattern unchanged
- `pmsService.js` L132-139: 3-step GST pattern unchanged

**V4 — Folio Room Orders = ₹256 (was ₹238):**
- Navigate to Folio for "test gst" guest
- Room Orders tile → ₹256 ✅

**V5 — Folio Total Balance Due = ₹1,947 (was ₹1,929):**
- Same folio, Balance Breakdown section
- Total Balance Due → ₹1,947 (₹950 room + ₹741 F&B + ₹256 room orders) ✅

**V6 — In-House balance = ₹1,947 (was ₹1,930.40):**
- Navigate to In-House Guests page
- Balance for "test gst" → ₹1,947 ✅

**V7 — All three pages match:**
- Checkout Grand Total = ₹1,947
- Folio Total Balance Due = ₹1,947
- In-House Balance = ₹1,947
- **All identical** ✅

**V8 — No regression on orders without add-ons:**
- Test with plain item (no add-ons) → GST calculated correctly (no change from BUG-429)

---

## Owner Decisions (from Intake)

| ID | Question | Answer | Status |
|----|----------|--------|--------|
| OD-430-01 | Confirm add-ons should be included in GST base for room orders (matches checkout behavior)? | **Assumed YES** (checkout is authoritative) | LOCKED |
| OD-430-02 | Implement in same sprint (pos_pms_1) alongside BUG-426/427/428/429 QA? | Pending owner | OPEN |

**Rationale for OD-430-01 assumption:**
- Checkout page (orderTransform.js) is the final billing screen
- It correctly includes add-ons in GST base
- Folio and In-House should match checkout for consistency
- GST law: Tax applies to total invoice value (base + add-ons)

---

## Related Items

- **BUG-426** (GATE_5A_IMPLEMENTED): In-House balance missing transferred F&B + room orders
- **BUG-427** (GATE_5A_IMPLEMENTED): Folio Total Balance Due missing room orders
- **BUG-428** (GATE_5A_IMPLEMENTED): Checkout ROOM breakdown missing Lodging GST line
- **BUG-429** (GATE_5A_IMPLEMENTED): Room orders GST under-counted (3-step GST logic)
- **BUG-430** (THIS): Room orders GST missing add-ons in base amount

**Sequence:** BUG-426 → BUG-427 → BUG-428 → BUG-429 → **BUG-430** (cumulative fixes)

---

## Summary

**Scope:** 2 files, 12 lines added (6 per file), 2 lines modified  
**Risk:** LOW (additive only, BUG-429 GST logic unchanged)  
**Complexity:** SIMPLE (copy-paste from orderTransform.js)  
**Impact:** HIGH (fixes persistent ₹16-18 financial discrepancy)  
**Conflicts:** NONE (builds on BUG-429)  

**Ready for Gate 3 GO**
