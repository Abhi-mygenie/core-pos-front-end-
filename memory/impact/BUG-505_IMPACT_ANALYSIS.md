# BUG-505 — Impact Analysis (Gate 2)

**ID:** BUG-505
**Date:** 2026-10-07
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent
**Code Reality:** PARTIAL — BUG-503 E4/E5 introduced defect code at L196-202; Part B (GST strip) does NOT exist yet
**Conflict Pre-Check:** CLEAN — CheckInPage.jsx unaffected by BUG-505 (confirmed by prior session); no other open item touches CheckInForm.jsx L196-202
**Phase:** PMS → New Booking + Check-In → Front Desk (Beta) → CheckInForm (expand-in-place)

---

## 1. Summary

BUG-503 implementation used **OD-503-02 Option A** — which replaced static booking-time GST values (SGST, CGST, Total incl. GST) in the bill grid with live post-discount values, while leaving `Booking charge` (₹9,000) static. This created a hybrid bill grid where the line items do not add up.

Additionally, BUG-503 E5 introduced a wrong Balance Due formula that adds `displayGstTotal` to the balance — applying GST a second time on top of the GST already preserved in the max-discount cap.

**Owner-confirmed correct state:**
- Bill grid must remain 100% static (all values from `row.charge.*` / booking-time)
- Balance due = `bc − roomDiscountRs − advance` (no GST added)
- A **separate** live GST strip should appear below the discount section (informational, like CheckInPage.jsx) — this Part B is a new addition, not a revert

---

## 2. Phase Context

**Yes — this is part of the New Booking + Check-In phase.**

`CheckInForm.jsx` is the expand-in-place Check-In form introduced in CR-385 Phase 2 (M3) for the Front Desk (Beta) page (`/pms/front-desk-v2`). It mirrors `CheckInPage.jsx` per the D50 mirror rule, but has diverged in the BUG-503 E4/E5 changes.

The affected flow:
```
Front Desk (Beta) → Arrivals tab → expand row → CheckInForm (this file) → Confirm Check-In
```

`CheckInPage.jsx` (`/pms/check-in`) is the standalone Check-In page. It is **NOT affected** by BUG-505 — its bill grid was not changed by BUG-503.

---

## 3. Code Reality

### What BUG-503 E4/E5 introduced (the defect):

| Line | Current code | Problem |
|------|-------------|---------|
| L196 | `{fmtINR(displaySgst)}` | DYNAMIC — post-discount SGST (₹26.25); should be static `c.sgst` (₹810) |
| L197 | `{fmtINR(displayCgst)}` | DYNAMIC — post-discount CGST (₹26.25); should be static `c.cgst` (₹810) |
| L198 | `{roomGstApplicable && displayGstRate > 0 && <span>...{displayGstRate}% Slab</span>}` | DYNAMIC slab badge in bill grid — should not be here (belongs in the separate strip) |
| L199 | `{fmtINR(Math.max(0, Number(c.booking_charge\|\|0) - roomDiscountRs) + displayGstTotal)}` | DYNAMIC — deducts discount then adds post-discount GST; should be static `c.total_with_gst` (₹10,620) |
| L201 | Comment references wrong logic | Comment update needed |
| L202 | `{fmtINR(Math.max(0, Number(c.booking_charge\|\|0) - roomDiscountRs + displayGstTotal - Number(c.advance_payment\|\|0)))}` | Wrong formula — adds `displayGstTotal` which compounds GST; correct = `bc − discount − advance` |

### What does NOT exist yet (Part B — new addition):

The separate live GST strip (after the discount section, ~L247) does **not exist** in `CheckInForm.jsx`. It needs to be added. Reference implementation: `CheckInPage.jsx` L930-975 (the IIFE-based strip with `data-testid="ci-gst-strip"`).

However, the useMemos that Part B needs (`displayGstTotal`, `displayCgst`, `displaySgst` at L91-94; `displayGstRate` at L96-102) already exist and are correct — they must **not** be removed.

### Data contract confirmation

`c.sgst`, `c.cgst`, `c.total_with_gst` are confirmed present in `row.charge`:
- Used in `ExtendStayForm.jsx` (`rc?.sgst`, `c.total_with_gst`)
- Used in `FolioCheckoutPanel.jsx` (`c.total_with_gst`, `c.sgst`)
- Used in `ModifyBookingForm.jsx` (`cur.sgst`, `cur.total_with_gst`)
- Used in `ArrivalsPanel.jsx` (`c.total_with_gst`)
- `const c = row.charge ?? {}` confirmed at `CheckInForm.jsx:55`

These fields are populated by the backend at booking time and are static for the duration of the check-in flow.

---

## 4. Risk Classification

**Risk: HIGH**

Trigger: Financial display wrong — balance due shown is ₹102.50 instead of ₹50 (compound GST error). SGST/CGST/Total lines in the bill grid show post-discount values that don't reconcile with the static `Booking charge` line. This is a financial display issue visible to every Front Desk (Beta) user who enters a room discount on check-in.

**Not CRITICAL** because:
- Balance Due is display-only — the actual transaction amount sent to the backend uses `collectNow` from the `collect.amount` input, which is already capped correctly by `collectMax` (BUG-497)
- No money is debited incorrectly; only the displayed balance is wrong
- Affects only CheckInForm.jsx (Front Desk Beta expand-in-place), not CheckInPage.jsx (standalone page)

**Fast Lane eligible:** NO — two-part fix (Part A revert + Part B add), though both target the same file

---

## 5. Affected Files

### Files WILL change:
| File | Change Type | Lines affected |
|------|------------|---------------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | Part A: revert 6 lines; Part B: insert ~45-line GST strip | L196-202 (Part A) · ~L247 insert point (Part B) |

### Files will NOT touch:
| File | Reason |
|------|--------|
| `src/pages/pms/CheckInPage.jsx` | Clean — no BUG-505 contamination. Do not touch. |
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | Not in scope |
| `src/api/services/frontDeskService.js` | No API change needed |
| `src/api/services/pmsService.js` | No API change needed |
| `src/utils/roomGstCalculator.js` | No change — `computeRoomGst` is correct |

---

## 6. Downstream Impact Analysis

### What Part A reverts affect:

| Testid | Before fix | After fix |
|--------|-----------|-----------|
| `checkin-bill-sgst` | ₹26.25 (post-discount) | ₹810 (booking-time from `c.sgst`) |
| `checkin-bill-cgst` | ₹26.25 (post-discount) | ₹810 (booking-time from `c.cgst`) |
| `checkin-bill-total` | ₹1,102.50 (hybrid) | ₹10,620 (booking-time from `c.total_with_gst`) |
| `checkin-bill-balance` | ₹102.50 (compound GST) | ₹50 (bc − discount − advance) |
| Slab badge in bill grid | "5% Slab" visible | Removed from bill grid |

**No functional change to the Confirm Check-In button or API call** — `collectNow` remains driven by `collect.amount`, not by the balance display.

**No change to `displayGstTotal`, `displayCgst`, `displaySgst`, `displayGstRate` useMemos** — these are retained for Part B.

### What Part B adds:

A new GST strip section after the discount input block. It:
- Is **informational only** — same IIFE pattern as CheckInPage.jsx L930-975
- Uses `displayGstTotal`, `displayCgst`, `displaySgst`, `displayGstRate` (already computed at L91-102)
- Renders only when `roomGstApplicable && roomGstSlabs && roomDiscountRs > 0` (i.e., only when a discount that changes the slab is entered)
- Shows the correct post-discount GST values in a clearly labelled separate panel
- Does NOT affect Balance Due or any submitted value

### Balance Due formula trace (at max discount ₹7,950):

| Step | Value | Formula |
|------|-------|---------|
| `bc` | ₹9,000 | `c.booking_charge` |
| `roomDiscountRs` | ₹7,950 | `min(input, maxFlat)` — correct, unchanged |
| `advance` | ₹1,000 | `c.advance_payment` |
| **Balance Due (WRONG — current)** | **₹102.50** | `bc − discount + displayGstTotal − advance` = `9000 − 7950 + 52.50 − 1000` |
| **Balance Due (CORRECT — after fix)** | **₹50** | `bc − discount − advance` = `9000 − 7950 − 1000` |

At zero discount: `max(0, 9000 − 0 − 1000) = ₹8,000` ✅

### Interaction with collectMax (BUG-497):

`collectMax` at L88: `Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))`

This is **already correct** — same formula as the BUG-505 fix. The collect input max is right; only the display label is wrong. Part A makes the balance display consistent with `collectMax`.

---

## 7. Conflict Pre-Check

| File | Last modifier | Date | Open items on same file | Safe? |
|------|--------------|------|------------------------|-------|
| `CheckInForm.jsx` | BUG-502 + BUG-503 + BUG-504 IMPL | 2026-10-07 | None (BUG-505 is the continuation) | ✅ |
| `CheckInPage.jsx` | BUG-502 + BUG-504 IMPL | 2026-10-07 | None | ✅ Not touched |

No parallel items open on `CheckInForm.jsx`. BUG-505 is sequentially next. No execution-order constraint with other items.

---

## 8. Open Questions for Gate 3

None. **OD-505-01 is LOCKED** (owner confirmed 2026-10-07):
- Part A: static bill grid (`c.sgst`, `c.cgst`, `c.total_with_gst`, `bc − disc − advance`)
- Part B: separate live GST strip, informational, mirrors CheckInPage.jsx

No new owner decisions are needed before Gate 3.

---

## 9. Verification Approach (seeds Gate 3 matrix)

| # | Test | Area |
|---|------|------|
| V1 | Enter 90% discount → bill grid shows `c.sgst` (₹810), `c.cgst` (₹810), `c.total_with_gst` (₹10,620) | Part A |
| V2 | Enter 90% discount → Balance Due = ₹50 (bc−disc−adv), NOT ₹102.50 | Part A |
| V3 | Enter 90% discount → no slab badge inside bill grid | Part A |
| V4 | Enter 90% discount → GST strip appears below discount section with 5% Slab, CGST ₹26.25, SGST ₹26.25, Total ₹52.50, Total incl. GST ₹1,102.50 | Part B |
| V5 | Zero discount → GST strip NOT visible (condition: `roomDiscountRs > 0`) | Part B |
| V6 | Balance Due = collectMax when collect input is at max (consistency check) | Interaction |
| V7 | Confirm Check-In with discount — server call unaffected (no change to submit path) | Regression |
| V8 | `displayGstTotal`, `displayCgst`, `displaySgst`, `displayGstRate` useMemos still present at L91-102 (not removed) | No regression |

---

## 10. Registry Update

- BUG-505 status: `GATE_1_INTAKE` → `GATE_2_IMPACT_ANALYSIS`
- Sprint: `oct_bug_batch`
- Phase: Check-In (New Booking + Check-In)
- Artifact: `/app/memory/impact/BUG-505_IMPACT_ANALYSIS.md`

---

## 11. Self-Assessment

| Dimension | Result |
|-----------|--------|
| Code Reality checked? | ✅ PARTIAL — defect code confirmed at L196-202; Part B confirmed absent |
| Conflict pre-check? | ✅ CLEAN |
| Data contract verified? | ✅ `c.sgst`, `c.cgst`, `c.total_with_gst` confirmed from sibling components |
| ODs resolved? | ✅ OD-505-01 LOCKED — no open decisions |
| Risk classified? | ✅ HIGH (financial display, not transaction) |
| Files scoped? | ✅ 1 file WILL change, 4 files will NOT touch |
| Downstream impact? | ✅ No API change, no submit path change, no collectMax change |
| Part of New Booking + Check-In phase? | ✅ YES — CheckInForm.jsx is CR-385 M3 (expand-in-place) |
