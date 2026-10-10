# BUG-489 — Impact Analysis

**ID:** BUG-489
**Gate:** 2 — IMPACT ANALYSIS
**Date:** 2026-10-05
**Risk:** MEDIUM
**Code Reality:** NONE
**Conflict Pre-check:** CLEAN — zero overlap with CR-407 files

---

## 1. Summary

CR-407 Sub-scope A added a room discount field to `CheckInPage.jsx` + `pmsService.js`.
Both carry an explicit **mirror rule** (FU-385-C) requiring they stay in sync with:
- `components/pms/frontdesk/CheckInForm.jsx` (used by `/pms/front-desk-v2`)
- `api/services/frontDeskService.js` (its FormData builder)

The mirror was not applied. Discount field is absent on the primary check-in flow.

**Root cause classification:** PLAN_GAP — CR-407 plan scope missed the mirror rule.

---

## 2. Data Flow Trace

```
User action: Opens check-in panel on front-desk-v2 (Arrivals tab)
  → FrontDeskWorkstationPage.jsx
  → ArrivalsPanel.jsx (kind='checkin')
  → CheckInForm.jsx                    ← TARGET FILE 1
      confirm() → checkIn(payload)
  → frontDeskService.buildCheckInFormData(p)  ← TARGET FILE 2
      fd.append(...)
  → POST LOCAL_CHECKIN (multipart/form-data)
  → Backend

BREAK POINT: CheckInForm.jsx has no discount state/UI/passthrough.
             frontDeskService.buildCheckInFormData() sends no room_discount fields.
```

---

## 3. Affected Files

| # | File | Change | Lines |
|---|------|--------|-------|
| F-1 | `components/pms/frontdesk/CheckInForm.jsx` | Add 2 state vars + roomDiscountRs useMemo + UI block + confirm() spread | ~40 lines added |
| F-2 | `api/services/frontDeskService.js` | Add conditional fd.append block for room_discount | ~6 lines added |

**Files NOT touched:** `CheckInPage.jsx` · `pmsService.js` · `FolioCheckoutPanel.jsx` · `orderTransform.js` · any other file

---

## 4. Exact Insert Points

### F-1: CheckInForm.jsx

| Edit | After line | Content |
|------|-----------|---------|
| State vars | **39** — after `const [error, setError] = useState(null);` | `ciRoomDiscountAmt` + `ciRoomDiscountType` state |
| useMemo | **52** — after `const ready = missing.length === 0;` | `roomDiscountRs` useMemo (OD-489-01 governs the percent base) |
| confirm() spread | **63** — after `upgradeReason: upgrade.reason,` inside `checkIn({...})` | `...(roomDiscountRs > 0 ? { roomDiscount, roomDiscountType, roomDiscountValue, roomDiscountReason } : {})` |
| UI block | **144** — before `<div className="mt-3 pt-3 border-t...">` (Collect now section) | Discount input (₹/% toggle + amount + −₹ badge) |

### F-2: frontDeskService.js

| Edit | After line | Content |
|------|-----------|---------|
| fd.append block | **106** — after `fd.append('firm_gst', p.firmGst ?? '');` | Conditional room_discount append block (mirrors A-E5 in pmsService.js) |

---

## 5. Key Difference from CheckInPage (mirror adaptation)

| CheckInPage | CheckInForm | Note |
|-------------|-------------|------|
| `form?.orderAmount` | `c.booking_charge` (OD-489-01) | Percent base — see Owner Decision below |
| State at line 57 | State after line 39 | Different state block position |
| useMemo after `formNights` | useMemo after `ready` (line 52) | Closest equivalent position |
| UI after advance method picker | UI before "Collect now" section (line 145) | Right-column bill panel placement |
| `pmsService.pmsCheckIn()` | `frontDeskService.buildCheckInFormData()` | Different service — same fd.append pattern |

---

## 6. Owner Decision

### OD-489-01 — Percent discount base in CheckInForm

In `CheckInPage`, the percent base is `form?.orderAmount` (the room rate, pre-GST).
In `CheckInForm`, there is no `form` — room billing comes from `row.charge` (aliased as `c`).

Available fields in `c` (row.charge):

| Field | What it is | Value example |
|-------|-----------|---------------|
| `c.booking_charge` | Room rate pre-GST | ₹5,700 |
| `c.total_with_gst` | Total incl. GST | ₹5,985 |
| `c.balance_due` | Outstanding balance at check-in | ₹5,985 |

**Recommendation — Option A: `c.booking_charge`**
- Mirrors `form.orderAmount` in CheckInPage most directly (both = room price pre-GST)
- Shown in the bill panel as "Booking charge" — owner can see the base they're discounting
- Consistent across both entry points

Option B (`c.total_with_gst`) inflates the base by GST.
Option C (`c.balance_due`) depends on advance already paid — could be 0 for fully-paid bookings.

**Owner must confirm OD-489-01 before Gate 3.**

---

## 7. Risk Assessment

| Risk | Rating | Mitigation |
|------|--------|-----------|
| Logic error in percent calc | LOW | Pattern already verified working in CheckInPage (CR-407 QA-pending) |
| Discount sent when 0 | LOW | Guard: `if (p.roomDiscount > 0)` — same as pmsService A-E5 |
| UI placement confusion | LOW | Before "Collect now" is intuitive — discount reduces what's collected |
| Non-hotspot file regression | LOW | CheckInForm + frontDeskService are not R5 hotspots |
| Mirror rule drift (future) | NOTE | FU-385-C will eventually merge these into one component — until then mirror manually |

---

## 8. Downstream Consumers

None beyond the two target files. The discount is sent as FormData to `LOCAL_CHECKIN` — backend handles it identically whether it arrives from pmsService or frontDeskService.

---

## 9. Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-489 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + frontDeskService.js — BUG-489 + date
- [ ] Code markers: // BUG-489 on all edited blocks
- [ ] Compile: 0 new warnings
```

---

## 10. Open Owner Decisions

| ID | Decision | Options | Recommendation |
|----|---------|---------|----------------|
| OD-489-01 | Percent discount base field in CheckInForm | A: `c.booking_charge` · B: `c.total_with_gst` · C: `c.balance_due` | **A — `c.booking_charge`** (mirrors CheckInPage pattern) |

**Gate 3 is blocked until OD-489-01 is answered.**
