# BUG-505 — Intake Document (REVISED 2026-10-07)

**ID:** BUG-505
**Date:** 2026-10-07
**Phase:** Check-In · Front Desk (Beta)
**Area:** PMS → Check-In → CheckInForm.jsx bill grid display
**Priority:** P1
**Severity:** MAJOR (financial display inconsistent + balance due formula wrong)
**Risk:** HIGH
**Sprint:** oct_bug_batch
**Status:** GATE_1_INTAKE
**Source:** OWNER-REPORTED (screenshot + verbal formula confirmation 2026-10-07)
**Confidence:** HIGH (code-traced, formula confirmed by owner)
**Duplicate check:** DISTINCT — introduced by BUG-503 E4 (OD-503-02 Option A wrong choice)
**Blast radius:** SMALL — 1 file (CheckInForm.jsx), ~6 lines
**Fast Lane eligible:** NO — two-part fix: Part A revert + Part B add GST strip

---

## 1. Symptom

On the **Front Desk (Beta)** page, when a room discount is entered that changes the GST slab, the bill grid ("Room bill · from the booking") shows a hybrid of booking-time and post-discount values:

```
Booking charge     ₹9,000   ← STATIC from booking
SGST               ₹26.25   ← DYNAMIC (5% on discounted ₹1,050) — WRONG context
CGST               ₹26.25   ← DYNAMIC
5% Slab            badge
Total (incl. GST)  ₹1,102.50 ← DYNAMIC — doesn't add up with ₹9,000 above
Already paid       ₹1,000
Balance due        ₹102.50  ← WRONG — should be ₹50
```

**Numbers don't add up:** `₹9,000 + ₹26.25 + ₹26.25 = ₹9,052.50 ≠ ₹1,102.50`

The discount (-₹7,950) is **invisible** in the bill grid.

**Owner confirmation (2026-10-07):**
> "check the gst coming twice — 1000 already paid — how 5% slab can have SGST₹26.25 CGST₹26.25 and Total (incl. GST)₹1,102.50"
> "we need to save 50 — right? not 102.50?"

---

## 2. Root Cause

BUG-503 E4 replaced static booking-time SGST/CGST/Total with DYNAMIC post-discount values, while leaving `c.booking_charge` (₹9,000) STATIC. This is the hybrid.

BUG-503 E5 also introduced a wrong balance due formula.

**Files:** `src/components/pms/frontdesk/CheckInForm.jsx` L196-202

---

## 3. Formula Confirmation (owner-verified 2026-10-07)

### Why ₹1,050 (discounted room) is CORRECT
```
discounted_room = bc − maxFlat = 9,000 − 7,950 = 1,050
                = advance + gst_on_advance = 1,000 + 50 = 1,050  ✓
```
The max-discount formula is designed to leave `advance + gst_on_advance` as the remaining room rent. **₹1,050 is not a bug.**

### Why balance due should be ₹50, NOT ₹102.50

| Formula | Value | Correct? |
|---------|-------|---------|
| `bc − discount − advance` (owner + backend) | 9000−7950−1000 = **₹50** | ✅ |
| `(bc−discount) + displayGstTotal − advance` (BUG-503 E5) | 1050+52.50−1000 = **₹102.50** | ❌ |
| `c.balance_due − roomDiscountRs` (original BUG-491) | 9620−7950 = **₹1,670** | ❌ |

### Why ₹52.50 ≠ ₹50 — compound GST effect
```
gst_on_advance  = 5% × advance(1,000) = 50        ← what we preserved
displayGstTotal = 5% × discounted_room(1,050)
                = 5% × (advance + gst_on_advance)
                = 5% × (1,000 + 50) = 52.50        ← includes 5% × 50 = GST on the GST
error           = 52.50 added to balance → 102.50 instead of 50
```

**Correct balance formula (LOCKED):**
```
max(0, bc − roomDiscountRs − advance)
= max(0, Number(c.booking_charge||0) − roomDiscountRs − Number(c.advance_payment||0))
At max discount: max(0, 9000−7950−1000) = ₹50   ✓
At zero discount: max(0, 9000−0−1000)  = ₹8,000 ✓
```

---

## 4. Fix Scope

**OD-505-01 LOCKED = keep bill grid static + separate GST strip + backend balance formula**

### Part A — Revert bill grid + correct balance (6 edits, CheckInForm.jsx only)
```
L196: displaySgst  → c.sgst                                  (₹810, 18%, from booking)
L197: displayCgst  → c.cgst                                  (₹810, 18%, from booking)
L198: Remove slab badge row entirely
L199: Total        → c.total_with_gst                        (₹10,620, from booking)
L201: Update comment
L202: Balance due  → max(0, bc − roomDiscountRs − advance)    ← BACKEND FORMULA ✓
```

`displayGst` + `displayGstRate` useMemos (L91-102) — **KEEP** — used by Part B strip.

### Part B — Add separate live GST strip below discount section
- Insert AFTER discount section closing `</div>` (around L244)
- Mirrors CheckInPage.jsx L927-970 exactly
- Uses existing `displayGst`/`displayGstRate` useMemos
- Only visible when `roomGstApplicable && roomGstSlabs && roomDiscountRs > 0`
- INFORMATIONAL ONLY — does not affect balance due

### After fix — bill display at max discount ₹7,950:
```
Room bill · from the booking:     ← ALL STATIC
  Booking charge:    ₹9,000
  SGST:              ₹810    (18%, booking-time)
  CGST:              ₹810
  Total (incl. GST): ₹10,620
  Already paid:      ₹1,000
  Balance due:       ₹50     ← bc−discount−advance = ₹50 ✓ (no GST added)

[Room Discount ₹7,950]

GST after discount (informational):   ← SEPARATE STRIP
  5% Slab
  CGST (2.5%): ₹26.25
  SGST (2.5%): ₹26.25
  Total GST: ₹52.50
  Total incl. GST: ₹1,102.50
```

---

## 5. Evidence

- Screenshot: owner-provided (chat 2026-10-07)
- Formula confirmation: owner verbal 2026-10-07 ("50 - right? not 102.50?")
- Code trace: CheckInForm.jsx L65-202
- Investigation: `investigations/INV-BUG503-DISPLAY-2026_10_07.md`

---

## 6. Related

| Item | Relation |
|------|---------|
| BUG-503 | Parent — introduced by BUG-503 E4 wrong OD choice |
| BUG-500 | Related — backend no-GST formula confirmed |
| CheckInPage.jsx GST strip | Reference for Part B (L927-970) |
