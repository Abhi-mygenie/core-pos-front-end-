# INV-CHECKINFORM-FORMULA-2026_10_07 — Formula Trace Evidence

**Date:** 2026-10-07
**Source:** Code trace + owner screenshots + owner verbal

---

## Data constants (The Goan Kitchen, RID 69, test booking)

| Field | Value | Source |
|-------|-------|--------|
| `c.booking_charge` | ₹9,000 | `row.charge.booking_charge` (API) |
| `c.sgst` | ₹810 | `row.charge.sgst` (18% on ₹9,000) |
| `c.cgst` | ₹810 | `row.charge.cgst` |
| `c.total_with_gst` | ₹10,620 | `row.charge.total_with_gst` |
| `c.advance_payment` | ₹1,000 | `row.charge.advance_payment` |
| `maxFlat` | ₹7,950 | `bc − advance − gst_on_advance = 9000−1000−50` |
| `maxPct` | 88.33% | `maxFlat/bc × 100` |

---

## BUG-1: Balance formula trace

**L201 (current code):**
```
balance = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))
```

At 0 discount: `9,000 - 0 - 1,000 = **8,000**` ← shows in screenshot
Owner wants: `c.total_with_gst - advance = 10,620 - 1,000 = **9,620**`

Root cause: Formula uses `c.booking_charge` (pre-GST) instead of `c.total_with_gst`.

**collectMax (L88) — SAME formula, SAME bug:**
```
collectMax = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))
```
→ Collect Now max = ₹8,000 at zero discount. Should be ₹9,620. Also broken.

**Open Decision for fix:**
At discount ₹7,950, what should balance show?
- Option A: `c.total_with_gst - roomDiscountRs - advance = 10,620 - 7,950 - 1,000 = **1,670**`
  (treats discount as reducing total_with_gst directly)
- Option B: `discounted_total_with_gst - advance = (1,050 + 52.50) - 1,000 = **102.50**`
  (discount on room, GST recomputes at new slab)
- Previous BUG-505 confirmed ₹50 = `bc - disc - advance` — but this excluded GST entirely and was based on wrong display context

Owner must confirm which is correct for the discount case.

---

## BUG-2: Flat discount alert trace

**L86 (current code):**
```
discountOverMax = ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct
```

Condition is `ciRoomDiscountType === 'Percent'` ONLY.

When mode = 'Amount' and input ₹8,000 > maxFlat ₹7,950:
- `discountOverMax = false` (condition fails on first check)
- Alert at L241 does NOT render
- roomDiscountRs silently returns `Math.min(8000, 7950) = 7950`
- Display shows "−₹7,950" without any warning

SAME bug in CheckInPage.jsx L287:
```
const discountOverMax = ciRoomDiscountType === 'Percent' && Number(ciRoomDiscountAmt) > maxPct;
```

Fix: extend condition to cover Amount mode:
```
const discountOverMax = 
  (ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct) ||
  (ciRoomDiscountType === 'Amount' && parseFloat(ciRoomDiscountAmt) > maxFlat);
```
→ Same fix needed in CheckInPage.jsx L287

---

## BUG-3: Double GST display trace

When discount ₹7,950 entered:

**Bill grid (static, L196-198):**
- SGST = `c.sgst` = **₹810** (18% on ₹9,000 — booking-time)
- CGST = `c.cgst` = **₹810**
- Total = `c.total_with_gst` = **₹10,620**

**GST strip (Part B, L248-285 — added in BUG-505):**
- CGST (2.5%) = `displayCgst` = **₹26.25** (5% on ₹1,050 — post-discount)
- SGST (2.5%) = `displaySgst` = **₹26.25**
- Total GST = `displayGstTotal` = **₹52.50**
- Total incl. GST = **₹1,102.50**

Both panels visible simultaneously. User sees:
- SGST: ₹810 (in bill grid) + ₹26.25 (in strip) → looks like two SGST charges
- CGST: ₹810 (in bill grid) + ₹26.25 (in strip) → looks like two CGST charges

Owner statement: "when gave whole discount 7950 - the gst counted twice"

Fix options:
A. REMOVE Part B strip entirely — simplest, no double-GST confusion
B. UPDATE bill grid to show dynamic post-discount GST — single set of GST figures, but reverts BUG-505 Part A
C. Keep strip but ADD a label clarifying these are the "new effective" vs "original" values

OWNER DECISION NEEDED: A or B?
If B: balance formula also becomes `discounted_total_with_gst - advance = 102.50` at max discount.
