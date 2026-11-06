# BUG-505 — Formula Trace Evidence
Date: 2026-10-07
Source: owner verbal confirmation + code trace

## Owner scenario
bc=9000, advance=1000, nights=1, maxFlat=7950 (from BUG-504)

## Step-by-step current code (WRONG)

gstBase (L92) = max(0, 9000-7950) = 1050
displayGstTotal (L93) = computeRoomGst(slabs, 1050, 1, 1).gstTotal
  nightlyUnit=1050 → 5% slab → gstTotal=52.50

Balance due (L202) = max(0, 9000-7950 + 52.50 - 1000) = 102.50  ← WRONG

## Owner-confirmed correct formula

Balance due = bc - roomDiscountRs - advance
           = 9000 - 7950 - 1000 = 50  ← CORRECT

## Why 52.50 ≠ 50 (compound GST)

gst_on_advance  = 5% × 1000 = 50         (what maxFlat preserves)
displayGstTotal = 5% × 1050              (5% on discounted room = advance+gst_on_advance)
                = 5% × (1000+50) = 52.50
                = 50 + 2.50              (2.50 = 5% × 50 = GST on the preserved GST)

My formula added displayGstTotal to balance → applied GST to the already-preserved GST

## Owner confirmation (chat 2026-10-07)
"we need to save 50 - right? not 102.50?"
→ LOCKED: balance = bc-discount-advance = ₹50

## Additional: discounted room = 1050 is CORRECT
bc - maxFlat = 9000 - 7950 = 1050
= advance + gst_on_advance = 1000 + 50 = 1050 ✓
(maxFlat formula designed to leave exactly advance+gst_on_advance)
