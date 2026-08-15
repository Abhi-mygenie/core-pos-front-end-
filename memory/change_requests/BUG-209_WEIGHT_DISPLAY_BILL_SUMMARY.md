# BUG-209: Weight Item Quantity Display — Bill Summary Missing Unit Labels + Receipt Decimal Display

**ID:** BUG-209
**Type:** BUG (Display)
**Priority:** P2 (MEDIUM — display-only, math is correct)
**Risk:** MEDIUM (touches CollectPaymentPanel — hotspot file R5)
**Sprint:** POS 5.0
**Reported by:** Owner (2026-07-20 — Aura restaurant, order #000911)
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Date:** 2026-07-20

---

## Description

Weight-based items display quantity without unit labels in Bill Summary, and receipt shows decimal Kg instead of human-readable grams.

---

## Evidence — Order #000911 (Aura, rid=788)

**Payload probed with owner@aura.com / Qplazm@10**

### Item 1: ANGAARA DRUMSTICKS (250GM)
- `item_unit: "gm"`, `item_unit_price: 10` (₹10/gm)
- Order: `quantity: 100, price: 1000` (100gm × ₹10 = ₹1,000)
- Cart: "100gm ₹1,000" ✅
- Bill Summary: "x100 ₹1,000" ❌ — missing "gm" label

### Item 2: ANGAARA DRUMSTICKS (1000GM)
- `item_unit: "Kg"`, `item_unit_price: 830` (₹830/Kg)
- Order: `quantity: 0.5, price: 415` (0.5Kg × ₹830 = ₹415)
- Cart: "500gm ₹415" ✅
- Bill Summary: "x0.5 ₹415" ❌ — should be "500gm" or "0.5Kg"

---

## 3 Gaps

### Gap 1 — FE: Bill Summary missing unit labels (P2)
**File:** `CollectPaymentPanel.jsx` — lines ~1860 and ~2220
**Current:** `<span>x{item.qty}</span>` — raw number, no unit
**Fix:** Use same logic as CartPanel line 170:
```js
item.isWeightItem
  ? (item.qty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
      ? `${Math.round(item.qty * 1000)}${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
      : `${parseFloat((item.qty || 0).toFixed(2))}${item.itemUnit}`)
  : `x${item.qty}`
```
**Scope:** ~5 lines, 2 locations in same file

### Gap 2 — Owner Config: Mixed unit configuration
**Not a code bug.** DRUMSTICKS (250GM) is configured as `gm` with ₹10/gm. DRUMSTICKS (1000GM) is configured as `Kg` with ₹830/Kg. Recommend standardizing to one unit per item family.

### Gap 3 — Backend: Receipt printer shows "0.5Kg" instead of "500gm"
**Backend-owned.** Receipt printer uses raw `quantity + item_unit`. Needs smart conversion: if `qty < 1 && item_unit == "Kg"` → display as `qty*1000 gm`. See backend brief.

---

## Duplicate Check: DISTINCT
No existing CR/BUG covers weight display in Bill Summary.

## Blast Radius: SMALL (1 file, 2 locations)
## Code Reality: NONE (no fix code exists)
