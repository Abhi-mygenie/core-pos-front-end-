# INVESTIGATION REPORT — BUG-503 Display Inconsistency ("GST coming twice")
**ID:** INV-BUG503-DISPLAY-2026_10_07
**Role:** INVESTIGATION (Role 6)
**Date:** 2026-10-07
**Trigger:** Owner-reported — bill grid shows SGST ₹26.25 / CGST ₹26.25 / Total ₹1,102.50 alongside Booking charge ₹9,000 → numbers don't add up → appears as if GST is double-counted
**Steps used:** 4 / 10
**Sandbox:** ZERO mutations — code trace only. No code written.

---

## 1. Summary

**Root cause:** BUG-503 E4 (OD-503-02 Option A) replaced the STATIC booking-time SGST/CGST/Total in the bill grid with DYNAMIC post-discount values, while leaving the Booking charge STATIC. This creates a visually broken bill that looks internally inconsistent — and the "missing" discount is invisible inside the bill section.

**Classification:** CODE_ERROR (wrong OD choice — Option A instead of Option B)
**Confidence:** HIGH (code-traced, no ambiguity)
**Steps used:** 4 / 10

---

## 2. Data Flow Trace — What actually renders

**With 88.33% discount entered (roomDiscountRs = 7,950):**

```
gstBase        = max(0, 9000 − 7950) = 1,050
computeRoomGst(slabs, 1050, nights=1, rooms=1):
  nightlyUnit  = 1050 → slab 0–7500 → 5%
  gstTotal     = 52.50
  displaySgst  = 26.25
  displayCgst  = 26.25
  displayGstRate = 5
```

**Bill grid renders:**

| Row | Source | Value |
|-----|--------|-------|
| Booking charge | `c.booking_charge` ← STATIC (booking-time) | ₹9,000 |
| SGST | `displaySgst` ← DYNAMIC (on discounted price ₹1,050) | ₹26.25 |
| CGST | `displayCgst` ← DYNAMIC (on discounted price ₹1,050) | ₹26.25 |
| Slab badge | `displayGstRate` ← DYNAMIC | 5% Slab |
| Total (incl. GST) | `max(0, bc − roomDiscountRs) + displayGstTotal` ← DYNAMIC | ₹1,102.50 |
| Already paid | `c.advance_payment` ← STATIC | ₹1,000 |
| Balance due | `max(0, bc − roomDiscountRs + displayGstTotal − advance)` ← DYNAMIC | ₹102.50 |

**BREAK POINT:** The discount amount (-₹7,950) is **never shown anywhere inside the bill grid**. It only appears in the separate "ROOM DISCOUNT" input section below. So the bill appears to show:

```
Booking charge     ₹9,000
+ SGST             ₹26.25
+ CGST             ₹26.25
─────────────────────────
Expected sum:      ₹9,052.50
                   ≠
Total shown:       ₹1,102.50   ← based on discounted 1,050, not 9,000
```

The numbers **do not add up** in the bill grid. A staff member reading the bill sees ₹9,000 booking charge but a Total of ₹1,102.50 — a jump of -₹7,950 that has no explanation in the bill section itself.

---

## 3. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|-----------|------|--------|
| H1 | SGST/CGST/Total are mathematically wrong (5% on wrong base) | `computeRoomGst(slabs, 1050, 1, 1)` → gstTotal=52.50, sgst=26.25, cgst=26.25. Total = 1050+52.50=1102.50 | **ELIMINATED** — arithmetic is correct. 5% on 1,050 = 52.50 ✓ |
| H2 | Numbers are internally inconsistent (don't add up in the grid) | `9000 + 26.25 + 26.25 ≠ 1102.50` (differs by ₹7,950 = the hidden discount) | **CONFIRMED** — bill grid rows don't sum to the Total |
| H3 | GST is genuinely "double-counted" (collected twice) | Advance of ₹1,000 at booking-time included 18% GST proportionally (≈₹152). Now bill shows 5% GST (₹52.50) additionally in the balance. Balance due = ₹102.50 which includes ₹52.50 new GST. Backend formula: `bp = room − discount − advance = 50` (NO GST) | **PARTIALLY CONFIRMED** — from the owner's perspective: the advance included ₹152 GST (at 18%), but the new balance of ₹102.50 ALSO contains GST (₹52.50). Whether this is "double-counted" depends on accounting treatment. Backend stores bp=₹50 (no GST) which differs from display ₹102.50 |
| H4 | Root cause = OD-503-02 Option A was wrong choice | Code trace at L193 (Booking charge = static ₹9,000) vs L196-199 (SGST/CGST/Total = dynamic post-discount). Section header = "Room bill · from the booking" but shows mixed booking-time + post-discount values | **CONFIRMED** |

---

## 4. Root Cause Identified

**The bill grid mixes two different financial contexts:**

```
STATIC (from booking):        Booking charge = ₹9,000 (row.charge.booking_charge)
DYNAMIC (post-discount):      SGST = ₹26.25, CGST = ₹26.25, Total = ₹1,102.50
                              Balance due = ₹102.50
```

The discount of ₹7,950 bridges these two contexts but is INVISIBLE inside the bill grid. The user sees the subtraction but cannot understand why ₹9,000 leads to ₹1,102.50 total.

**Why Option A was wrong:** The bill section is titled "Room bill · from the booking". It was designed to show the authoritative booking-time figures (from LR `row.charge`). My BUG-503 E4 change made SGST/CGST/Total dynamic by applying the post-discount GST directly to the booking-charge row area — while leaving the Booking charge itself static. This hybrid approach produces internally inconsistent rows.

**Option B (not chosen) would have been correct:**
- Keep ALL bill grid rows static: `c.sgst`, `c.cgst`, `c.total_with_gst`, `c.balance_due - roomDiscountRs`
- Add a SEPARATE live "GST Recalculation" strip BELOW the discount input section
- The strip shows: "After discount: base ₹1,050 → 5% slab → SGST ₹26.25 / CGST ₹26.25 / New total ₹1,102.50"

This matches what CheckInPage.jsx does correctly (GST strip is separate from the main form, not embedded in the room-info display).

---

## 5. Why the Balance Due Also Changed (additional concern)

**Before BUG-503:**
```javascript
// L214 (original):
{fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))}
// = max(0, 9620 - 7950) = 1670
```

**After BUG-503:**
```javascript
// L202 (current):
{fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs + displayGstTotal - Number(c.advance_payment || 0)))}
// = max(0, 9000 - 7950 + 52.50 - 1000) = 102.50
```

This is a **₹1,567.50 change** in the displayed balance due (from 1670 to 102.50). While 102.50 is arithmetically correct for the discounted scenario, it's significantly different from what the original formula showed, and it includes GST in the balance — which the backend does NOT include in its `balance_payment` field (confirmed by probe 2026-10-06: `bp = room − discount − advance = 50`).

---

## 6. Recommendations

**FE_FIX — revert + restructure (PLANNING required):**

### CheckInForm.jsx bill grid — revert to static values:
- L196: `displaySgst` → back to `c.sgst`
- L197: `displayCgst` → back to `c.cgst`
- L198: remove slab badge row (was not there before)
- L199: Total back to `c.total_with_gst`
- L202: Balance due back to `c.balance_due - roomDiscountRs`
- Remove the `displayGst` and `displayGstRate` useMemos (no longer needed in bill grid)

### Add a SEPARATE live GST strip AFTER the discount section:
- Mirrors CheckInPage.jsx L927-970 exactly
- Shows: base after discount, new slab, new SGST/CGST/total
- Is CLEARLY labeled as "GST after discount" or similar
- Is ONLY rendered when a discount is entered
- Does NOT replace the "from the booking" bill values

This approach:
- Keeps the "Room bill · from the booking" grid internally consistent (static booking values)
- Shows the GST recalculation in a dedicated strip (as originally designed in CheckInPage.jsx)
- Eliminates the visual inconsistency
- Balance due formula reverts to `c.balance_due - roomDiscountRs` (uses backend-compatible balance)

**Planning skip eligible:** YES for the revert (≤10 lines, 1 file, reverting BUG-503 E4/E5 changes). Needs owner "Fast Lane APPROVED" since it's a revert of an implemented change.

---

## 7. Handover

"Root cause: BUG-503 OD-503-02 Option A placed DYNAMIC (post-discount) SGST/CGST/Total INSIDE the static 'Room bill · from the booking' grid, making the numbers not add up (₹9,000 + ₹52.50 ≠ ₹1,102.50). The discount is invisible in the bill grid. The 'GST coming twice' perception: advance collected 18% GST, display shows additional 5% GST in balance due, and the booking charge/GST rows don't reconcile. Confidence: HIGH. Steps: 4/10.

FE fix needed: revert bill grid to static values (c.sgst/cgst/total_with_gst/balance_due) and add separate live GST strip below the discount section (like CheckInPage.jsx does) instead of overwriting bill grid values. Fast Lane eligible for revert.

Planning skip: YES for revert (Fast Lane) — owner must approve. Full Gate 2-3 for the new separate strip.
Report: investigations/INV-BUG503-DISPLAY-2026_10_07.md"
