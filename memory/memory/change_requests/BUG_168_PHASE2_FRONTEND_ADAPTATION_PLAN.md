# BUG-168 Phase 2 — Frontend Adaptation to New Backend Contract

**Date:** 2026-07-12
**Status:** INVESTIGATION COMPLETE — PENDING OWNER GO
**Related:** BUG-166, BUG-168, BUG-VQTY

---

## Context

Backend contract has changed. Backend now stores and returns **TOTAL** addon quantities (not per-unit). Frontend must adapt the **inbound/display** side to avoid double-multiplying.

**OUTBOUND (place-order)** — KEEP AS-IS:
- `orderTransform.js` L698: `add_on_qtys: addonQtys.map(q => q * (item.qty || 1))` — sends total ✅
- `orderTransform.js` L704: `addon_amount: addonAmount * (item.qty || 1)` — sends total ✅
- `orderTransform.js` L1493: `addon_amount: addonAmount * qty` — sends total ✅

---

## Two Data States for Cart Items

| State | Source | `a.quantity` | `item.price` |
|-------|--------|-------------|-------------|
| **UNPLACED** (new, from popup) | `item.selectedAddons` | **Per-unit** (e.g., 1) | Per-unit base (e.g., 120) |
| **PLACED** (from backend/socket) | `item.addOns` via `fromAPI.order` L135 | **TOTAL** (e.g., 5) | Per-unit (120, from unit_price) |

**Detection:** `item.placed === true` → placed item (backend data, total qty)

---

## Current Price Formula (BROKEN for placed items)

```js
addonSum = addons.reduce((s, a) => s + (a.price × a.quantity), 0)
lineTotal = base + (addonSum × item.qty)   // ← always multiplies
```

**For placed items with new contract:**
```
a.price = 10, a.quantity = 5 (TOTAL from backend)
addonSum = 10 × 5 = 50
lineTotal = 600 + (50 × 5) = ₹850  ❌  (should be ₹650)
```

---

## New Logic Required

```js
addonSum = addons.reduce((s, a) => s + (a.price × a.quantity), 0)

if (item.placed) {
  lineTotal = base + addonSum            // addonSum already total
} else {
  lineTotal = base + (addonSum × qty)    // addonSum per-unit, multiply
}
```

**For display:**
```js
if (item.placed) {
  text = `${a.name} x${a.quantity}`            // already total
} else {
  text = `${a.name} x${a.quantity × item.qty}` // per-unit × qty
}
```

---

## All 10 Locations to Fix

### Price Computation (5 locations)

| # | File | Line(s) | Current | Fix |
|---|------|---------|---------|-----|
| 1 | `CartPanel.jsx` | L204+212 | `addonSum × shownQty` | Skip `× shownQty` when `item.placed` |
| 2 | `CartPanel.jsx` | L365+372 | `addonSum × item.qty` | Skip `× item.qty` when `item.placed` |
| 3 | `CollectPaymentPanel.jsx` | L215+223 | `addonSum × item.qty` | Skip `× item.qty` — collect bill items always placed |
| 4 | `OrderEntry.jsx` | L752 | `a.price × a.quantity` | ✅ OK — unplaced items only |
| 5 | `OrderEntry.jsx` | L2704+2715 | `addonSum × qty` | Skip `× qty` — SplitBill uses placed items |

### Display (5 locations)

| # | File | Line(s) | Current | Fix |
|---|------|---------|---------|-----|
| 6 | `CartPanel.jsx` | L15 | `a.qty × itemQty` (getAddonText) | Skip `× itemQty` when `item.placed` |
| 7 | `CartPanel.jsx` | L124 | `a.qty × item.qty` (socket fallback) | Skip `× item.qty` when `item.placed` |
| 8 | `CollectPaymentPanel.jsx` | L1866 | `a.qty × item.qty` | Just `a.qty` — always placed |
| 9 | `CollectPaymentPanel.jsx` | L1878 | `totalQty × item.qty` | Just `a.qty` — always placed |
| 10 | `CollectPaymentPanel.jsx` | L2221 | `a.qty × item.qty` | Just `a.qty` — always placed |
| 11 | `CollectPaymentPanel.jsx` | L2233 | `totalQty × item.qty` | Just `a.qty` — always placed |

---

## Proof: Order #940260 (000318)

**Backend returned:**
```json
{
  "quantity": 5,
  "unit_price": "120.00",
  "price": 600,
  "add_ons": [{ "name": "Brown Sugar", "price": 10, "quantity": 5 }]
}
```

**Screen showed:** "Brown Sugar x25" and ₹850
**Correct:** "Brown Sugar x5" and ₹650

```
Double multiplication:
  addonSum = 10 × 5 = 50    (treats 5 as per-unit)
  lineTotal = 600 + (50 × 5) = ₹850   ❌

Correct (with fix):
  addonSum = 10 × 5 = 50    (5 is total, addonSum is total)
  lineTotal = 600 + 50 = ₹650          ✅
```

---

## What Does NOT Need Changing

| Component | Why |
|-----------|-----|
| `orderTransform.js` L698, L704, L1493 | Outbound — already sends total per new contract |
| `orderTransform.js` `calcOrderTotals` L771 | Uses `_fullUnitPrice × quantity` — unaffected |
| `orderTransform.js` `buildCartItem` L587-591 | Reads from unplaced items (per-unit) — correct |
| `ItemCustomizationModal.jsx` | Popup addon selector — always per-unit — correct |
| `orderTransform.js` `distributeItemDiscounts` L500-502 | Uses `food_amount + addon_amount` from buildCartItem (already total) — correct |
