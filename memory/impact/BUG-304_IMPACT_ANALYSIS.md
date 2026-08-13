# BUG-304 Impact Analysis — Item-Level Discount: GST/VAT discountRatio Wrong Denominator
**Gate:** 2 — Impact Analysis
**Date:** 2026-08-11
**Planning Agent:** Role 2
**Based on:** Intake `change_requests/BUG-304_ITEM_DISCOUNT_GST_DISCOUNTRATIO_WRONG_DENOMINATOR_INTAKE.md`
**Code Reality:** FULL — bug confirmed in code at all stated locations
**Conflict Pre-Check:** No open items touching same lines. CPP last modified by CR-021 (2026-06-10). CartPanel last modified by BUG-122 post (2026-06-10). No parallel work conflicts.

---

## 1. Summary

When an order contains a **mix of discountable and non-discountable items** (`give_discount = 'No'` set on some items), the GST and VAT post-discount computation uses the wrong denominator for `discountRatio`. The result is that **non-discountable items' GST is incorrectly reduced** and **discountable items' GST is under-reduced**, causing an incorrect bill total for the cashier and customer.

**Risk:** HIGH — R5 (hotspot files) + R6 (financial computation — GST amount on bill)

---

## 2. Code Reality Check

**Status: FULL** — confirmed present in current codebase.

```bash
CollectPaymentPanel.jsx:605   const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
CartPanel.jsx:425             const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
orderTransform.js:823         const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
orderTransform.js:1896        const discountRatio = overrideDiscount / computedSubtotal;
```

---

## 3. Full Site Inventory (user's instruction: "check if there is no such other cases")

| # | File | Line | Context | In-scope BUG-304? |
|---|---|---|---|---|
| S1 | `CollectPaymentPanel.jsx` | 605, 609, 650 | UI collect-bill GST + VAT display | **YES — primary** |
| S2 | `CartPanel.jsx` | 425, 426, 433 | QSR cart GST + VAT display | **YES — primary** |
| S3 | `orderTransform.js` | 823, 837, 841 | `calcOrderTotals` — backend payload builder | **NO — scope BUG-304-B (separate concern)** |
| S4 | `orderTransform.js` | 1896, 1899 | `buildBillPrintPayload` print path | **NO — scope BUG-304-B** |

### Why S3 and S4 are separate scope

`calcOrderTotals` and `buildBillPrintPayload` receive **already-built item payloads** (from `buildItemPayload`). These built items don't carry a `giveDiscount` flag. Fixing them would require changes to function signatures. They are flagged as **BUG-304-B** for a separate planning cycle.

---

## 4. Data Flow Trace (S1 — primary)

```
Menu item config:  give_discount = 'No'  → productTransform → giveDiscount: false
                   give_discount = 'Yes' → giveDiscount: true (default)

CartPanel / CPP at order-time:
  billableItems = all cart items (discountable + non-discountable)
  
  taxTotals = useMemo(() => {
    billableItems.forEach(item => {          ← ALL items (incl. giveDiscount=false)
      sgst += taxAmt/2; cgst += taxAmt/2;   ← total GST includes non-discountable
    })
  })
  
  discountableTotal = billableItems.filter(i => giveDiscount !== false)...  ← correct
  totalDiscount = computed on discountableTotal  ← correct
  
  discountRatio = totalDiscount / itemTotal    ← BUG: itemTotal = ALL items
                                               ← should be: discountableTotal
  
  itemGstPostDiscount = total_gst * (1 - discountRatio)  ← BUG: applied to ALL
                                                          ← should be: only discountable portion
  
  vat = taxTotals.vat * (1 - discountRatio)  ← same VAT bug

→ BREAK POINT: non-discountable items' GST incorrectly reduced; discountable items' GST under-reduced
→ Bill total shown to cashier is wrong
→ Same pattern in CartPanel (QSR path)
```

---

## 5. Mathematical Proof (why simple denominator change is insufficient)

**Scenario:** Item A (discountable, ₹100 @ 18% GST), Item B (non-discountable, ₹50 @ 12% GST), 20% discount applied on discountable items.

| Approach | discountRatio | Post-discount GST | Correct? |
|---|---|---|---|
| **Current (itemTotal denominator)** | 20/150=13.3% | (18+6)×0.867=**₹20.80** | ❌ |
| **Option A: just change denominator** | 20/100=20% | (18+6)×0.80=**₹19.20** | ❌ over-reduces Item B |
| **Option B: split buckets** | 20/100=20% | 18×0.80 + 6×1.0=**₹20.40** | ✅ |

**Conclusion: changing only the denominator is NOT sufficient. The fix MUST split taxTotals into discountable vs non-discountable buckets.**

---

## 6. Affected Flows

| Flow | Impact |
|---|---|
| Collect Bill (dine-in, takeaway, delivery) — mixed cart with giveDiscount=false items | GST/VAT on bill is wrong |
| QSR cart display — same scenario | GST display wrong before final payment |
| Walk-in orders with non-discountable items | Same |
| Room orders with non-discountable items | Same |
| **Orders with ALL items discountable (giveDiscount=true for all)** | **NO BUG** — denominator = discountableTotal = itemTotal, same result |
| **Orders with NO discount applied** | **NO BUG** — discount=0, discountRatio=0, same result |

---

## 7. Fix Design

### S1 Fix — `CollectPaymentPanel.jsx`

**Edit 1 — Extend `taxTotals` useMemo to split by discountability (line ~247)**

```javascript
// BEFORE
const taxTotals = useMemo(() => {
  let sgst = 0, cgst = 0, vat = 0;
  billableItems.forEach(item => {
    // ... (all items accumulated together)
    sgst += taxAmt / 2; cgst += taxAmt / 2;
  });
  return { sgst, cgst, vat };
}, [billableItems]);

// AFTER — BUG-304: split discountable vs non-discountable GST/VAT
const taxTotals = useMemo(() => {
  let sgst = 0, cgst = 0, vat = 0;
  let discountableSgst = 0, discountableCgst = 0, discountableVat = 0;
  billableItems.forEach(item => {
    const isDiscountable = item.giveDiscount !== false;
    // ... (same taxAmt computation)
    if (taxType === 'GST') {
      sgst += taxAmt / 2; cgst += taxAmt / 2;
      if (isDiscountable) { discountableSgst += taxAmt / 2; discountableCgst += taxAmt / 2; }
    } else if (taxType === 'VAT') {
      vat += taxAmt;
      if (isDiscountable) { discountableVat += taxAmt; }
    }
  });
  return {
    sgst: Math.round(sgst * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    vat:  Math.round(vat  * 100) / 100,
    discountableSgst: Math.round(discountableSgst * 100) / 100,
    discountableCgst: Math.round(discountableCgst * 100) / 100,
    discountableVat:  Math.round(discountableVat  * 100) / 100,
  };
}, [billableItems]);
```

**Edit 2 — Fix `discountRatio` and `itemGstPostDiscount` (line ~605-650)**

```javascript
// BEFORE
const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
const vat = taxTotals.vat * (1 - discountRatio);

// AFTER — BUG-304: use discountableTotal as denominator; only reduce discountable portion
const discountableRatio = discountableTotal > 0 ? totalDiscount / discountableTotal : 0; // BUG-304
const nonDiscountableSgst = taxTotals.sgst - taxTotals.discountableSgst;
const nonDiscountableCgst = taxTotals.cgst - taxTotals.discountableCgst;
const nonDiscountableVat  = taxTotals.vat  - taxTotals.discountableVat;
const itemGstPostDiscount =
  (taxTotals.discountableSgst + taxTotals.discountableCgst) * (1 - discountableRatio)
  + nonDiscountableSgst + nonDiscountableCgst; // BUG-304
const vat = taxTotals.discountableVat * (1 - discountableRatio) + nonDiscountableVat; // BUG-304
```

### S2 Fix — `CartPanel.jsx`

**Identical fix pattern** (same useMemo split + same ratio/GST computation change).
CartPanel `taxTotals` is at line ~400; `discountRatio` is at line ~425.

---

## 8. Verification Matrix

| # | Verification | Method |
|---|---|---|
| V1 | `taxTotals` returns 6 keys (sgst, cgst, vat + 3 discountable variants) | Code inspection |
| V2 | Mixed cart: Item A (discountable), Item B (non-discountable), 20% discount → GST matches Option B formula | Browser DevTools console: inspect `itemGstPostDiscount` |
| V3 | All-discountable cart: result unchanged vs pre-fix | Browser: apply discount to all-discountable cart |
| V4 | No-discount cart: result unchanged (discountRatio=0 path) | Browser: no discount applied |
| V5 | VAT items: same fix applies to `vatAmount` / `vat` in CartPanel | Code inspection + browser |
| V6 | Webpack compiles 0 new warnings | `tail -5 frontend.out.log` |

---

## 9. Post-Code Registry Checklist (for Implementation Agent)

```
- [ ] registry.json: BUG-304 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx + CartPanel.jsx entries added for BUG-304
- [ ] Code markers: // BUG-304 comments in every modified section
- [ ] Compile: webpack 0 new warnings
```

---

## 10. Scope Lock

**WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` — `taxTotals` useMemo + discountRatio + itemGstPostDiscount + vat lines
- `src/components/order-entry/CartPanel.jsx` — same pattern

**WILL NOT touch:**
- `src/api/transforms/orderTransform.js` — S3 and S4 (`calcOrderTotals`, `buildBillPrintPayload`) are filed as **BUG-304-B** (separate scope, requires function signature changes + own planning cycle)
- Any other files — no route changes, no context changes, no API changes

---

## 11. BUG-304-B — Flagged for Separate Registration

`orderTransform.js` has the same `discountRatio` bug at:
- Line 823 — `calcOrderTotals` (backend payload builder)
- Line 1896 — `buildBillPrintPayload` (print path)

These affect what GST is **sent to the backend** and **printed on the bill**. Separate planning needed because:
1. Built item payloads don't carry `giveDiscount` — requires function signature changes
2. `orderTransform.js` is a hotspot file (R5) with higher risk than CPP/CartPanel
3. Owner decision needed: does the backend-stored GST need correcting, or only UI display?

→ **Register BUG-304-B at Gate 1 before proceeding.**

---

## 12. Owner Decisions — LOCKED 2026-08-11

| OD | Question | Owner Answer |
|---|---|---|
| **OD-1 ✅** | Fix approach: split taxTotals buckets (Option B) | **CONFIRMED** |
| **OD-2 ✅** | Apply same fix to VAT in both CPP and CartPanel? | **YES — owner confirmed** |
| **OD-3 ✅** | CartPanel (QSR) — apply same fix? | **YES — owner confirmed** |
| **OD-4 ✅** | Fix `orderTransform.js` (BUG-304-B) now or later? | **LATER — park as BUG-304-B, separate sprint** |

---

## 13. Risk Classification

| Item | Risk |
|---|---|
| **Overall** | **HIGH** — R5 (both files are hotspot) + R6 (financial computation, GST amount on bill) |
| CPP edit (taxTotals + ratio) | HIGH — 3050-line hotspot, final settlement logic |
| CartPanel edit | MEDIUM-HIGH — hotspot, but simpler QSR display logic |
| Regression risk | LOW to MEDIUM — fix only activates when `giveDiscount=false` items are in cart |
| All-discountable carts | Zero regression risk — math is identical when all items are discountable |

---

**Gate 2 COMPLETE — All owner decisions LOCKED (2026-08-11).**
Ready for Gate 3 Implementation Plan.

**Scope confirmed:**
- `CollectPaymentPanel.jsx` — taxTotals split + discountRatio fix (GST + VAT) ✅
- `CartPanel.jsx` — same fix ✅
- `orderTransform.js` — **OUT OF SCOPE** → BUG-304-B, separate sprint
