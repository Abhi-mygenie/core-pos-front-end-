# QA Handover — BUG-505

**Date:** 2026-10-07
**Item:** BUG-505 — CheckInForm.jsx bill grid mixed static/dynamic GST + wrong balance formula
**File changed:** `src/components/pms/frontdesk/CheckInForm.jsx`
**Implemented by:** IMPLEMENTATION agent 2026-10-07
**Sprint:** oct_bug_batch
**Risk:** HIGH (financial display)

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Change | How to Verify | Self-Test |
|------|------|--------|---------------|-----------|
| E-A1 | CheckInForm.jsx:196 | `displaySgst` → `c.sgst` | Grep: `fmtINR(c.sgst)` at L196 | ✅ PASS — confirmed |
| E-A2 | CheckInForm.jsx:197 | `displayCgst` → `c.cgst` | Grep: `fmtINR(c.cgst)` at L197 | ✅ PASS — confirmed |
| E-A3 | CheckInForm.jsx:198 | Slab badge row removed | Grep: no `col-span-2.*Slab` in bill grid | ✅ PASS — line gone |
| E-A4 | CheckInForm.jsx:198 | Total → `c.total_with_gst` | Grep: `fmtINR(c.total_with_gst)` at L198 | ✅ PASS — confirmed |
| E-A5 | CheckInForm.jsx:200 | Comment updated | Grep: `BUG-491 Sub-B + BUG-503` absent | ✅ PASS — replaced |
| E-A6 | CheckInForm.jsx:201 | Balance: removed `+ displayGstTotal` | Grep: balance formula has no `displayGstTotal` | ✅ PASS — confirmed |
| E-B1 | CheckInForm.jsx:~247 | GST strip inserted | Grep: `ci-gst-strip` testid present | ✅ PASS — confirmed |
| Reg | CheckInForm.jsx:91-102 | `displayGst*` useMemos NOT removed | Grep: present at L91/96 | ✅ PASS — intact |
| Reg | CheckInForm.jsx:88 | `collectMax` formula unchanged | Grep: same formula as balance fix | ✅ PASS — consistent |
| Reg | — | webpack 0 new warnings | `compiled successfully` in log | ✅ PASS |

---

## 2. Test Cases for QA Agent

**Credentials:** `owner@thegoankitchen.com` / `Qplazm@10` — Front Desk (Beta) → Arrivals tab → expand a booking row with room discount entered
**URL:** https://pos-front-5oct.preview.emergentagent.com/pms/front-desk-v2 (or use preprod)
**Test restaurant:** RID 69 (The Goan Kitchen) — bc=₹9,000, advance=₹1,000, 18% GST (booking-time)

### TC-01 — Static bill grid at zero discount (P0 — baseline)
1. Open Front Desk (Beta) → Arrivals tab → expand any booking row
2. Leave Room Discount empty (₹0)
3. Observe bill grid ("Room bill · from the booking")

**Expected:**
- SGST = booking-time value from `c.sgst` (e.g. ₹810 for 18% on ₹9,000)
- CGST = booking-time value from `c.cgst` (e.g. ₹810)
- Total (incl. GST) = `c.total_with_gst` (e.g. ₹10,620)
- Balance due = `bc − 0 − advance` = e.g. ₹9,000 − 0 − ₹1,000 = ₹8,000
- No GST strip visible below discount section

**FAIL if:** Any dynamic value appears; slab badge visible inside bill grid; Balance ≠ bc−advance

---

### TC-02 — Bill grid stays static when discount entered (P0 — core fix)
1. Expand same booking row
2. Enter room discount e.g. 90% (or ₹7,950)
3. Observe bill grid

**Expected:**
- Booking charge: unchanged (e.g. ₹9,000) ← static
- SGST: **unchanged** from TC-01 (e.g. ₹810) ← static `c.sgst`
- CGST: **unchanged** from TC-01 (e.g. ₹810) ← static `c.cgst`
- Total (incl. GST): **unchanged** from TC-01 (e.g. ₹10,620) ← static `c.total_with_gst`
- No slab badge inside bill grid
- All bill grid numbers now add up: `booking_charge + sgst + cgst ≈ total_with_gst` ✅

**FAIL if:** SGST/CGST/Total change when discount is entered

---

### TC-03 — Balance due formula correct (P0 — owner formula)
1. Expand booking row (bc=₹9,000, advance=₹1,000)
2. Enter max discount (₹7,950 or 88%)
3. Observe Balance due field

**Expected:**
- Balance due = `max(0, 9000 − 7950 − 1000)` = **₹50** ← owner-confirmed formula
- NOT ₹102.50 (old compound-GST formula)
- NOT ₹1,670 (pre-BUG-491 formula)
- Balance due consistent with collectMax (Collect Now max input)

**FAIL if:** Balance ≠ ₹50 at max discount

---

### TC-04 — Balance due at zero discount
1. Expand booking row (bc=₹9,000, advance=₹1,000)
2. Leave discount empty (₹0)

**Expected:**
- Balance due = `9000 − 0 − 1000` = **₹8,000**

**FAIL if:** Balance ≠ bc−advance at zero discount

---

### TC-05 — GST strip appears when discount entered (Part B)
1. Expand booking row with `roomGstApplicable = true`
2. Enter any discount > ₹0 (e.g. ₹7,950)
3. Observe area below the discount input section

**Expected:**
- "GST AFTER DISCOUNT" strip appears (green panel, `data-testid="ci-gst-strip"`)
- Shows correct slab badge (e.g. "5% Slab" for discounted price ₹1,050)
- CGST (2.5%) = ₹26.25
- SGST (2.5%) = ₹26.25
- Total GST = ₹52.50
- Total incl. GST = ₹1,102.50

**FAIL if:** Strip not visible; wrong values; slab rate wrong for the discounted price

---

### TC-06 — GST strip NOT visible at zero discount (Part B condition guard)
1. Expand booking row
2. Leave discount empty

**Expected:** GST strip is NOT visible (`ci-gst-strip` element absent from DOM)

**FAIL if:** Strip shows when no discount entered

---

### TC-07 — Balance due consistent with Collect Now max
1. Expand booking row (bc=₹9,000, advance=₹1,000)
2. Enter ₹7,950 discount
3. Note Balance due (should be ₹50)
4. Observe Collect Now max input attribute

**Expected:** Collect Now input `max` attribute = ₹50 (same as Balance due, same formula)

**FAIL if:** Balance due ≠ Collect Now max (formula inconsistency)

---

### TC-08 — Confirm Check-In not affected (regression)
1. Enter valid discount, fill Collect Now, complete form
2. Click Confirm Check-In

**Expected:** Server call proceeds normally (same as pre-BUG-505). No change to submit path. Balance due display is cosmetic — server receives `collectNow` amount.

**FAIL if:** Confirm button broken or API call changes

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | maxPct/maxFlat useMemos still compute correctly (88%, ₹7,950) | Part A removed slab badge but did not touch L65-85 |
| R2 | discountOverMax alert still shows/hides correctly | BUG-502 fix — alert at ~L241-245 untouched |
| R3 | Collect Now input max = collectMax = ₹50 at max discount | BUG-497 fix — collectMax formula unchanged at L88 |
| R4 | CheckInPage.jsx (`/pms/check-in`) unaffected — its bill grid still shows booking-time values | File NOT touched |
| R5 | displayGst* useMemos (L91-102) still present and feeding Part B | These were preserved, not removed |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-505 → GATE_5A_IMPLEMENTED / oct_bug_batch
BUG_TRACKER.md: updated (GATE_5A_IMPLEMENTED row added)
FILE_OWNERSHIP.md: CheckInForm.jsx BUG-505 IMPL 2026-10-07 added
Code markers: 6 × // BUG-505 in CheckInForm.jsx
EXIT GATE: ALL 5 PASSED
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | https://pos-front-5oct.preview.emergentagent.com |
| Preprod API | https://preprod.mygenie.online/ |
| Login (owner) | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Front Desk Beta | `/pms/front-desk-v2` → Arrivals tab → expand booking row |
| Branch | `5oct-1` |

---

## 6. Note on BUG-502/503/504 QA

Per handover: **defer combined QA for BUG-502+503+504+505 until after BUG-505 owner smoke confirmed.** QA handover for those items is at `handover/QA_HANDOVER_BUG502_503_504_2026_10_07.md`. Run TC-01..TC-08 above first, then combine with that handover for the full regression pass.
