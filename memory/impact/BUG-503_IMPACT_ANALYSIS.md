# BUG-503 — Impact Analysis (Gate 2)

**ID:** BUG-503
**Date:** 2026-10-07
**Author:** PLANNING agent
**Risk:** HIGH (financial display — wrong GST shown during check-in)
**Code Reality:** PARTIAL — BUG-500 fixed CheckInPage.jsx; CheckInForm.jsx is the gap
**Conflict Pre-Check:** CLEAN — BUG-500/496/492/495 all GATE_5A_IMPLEMENTED; no open item on CheckInForm.jsx
**Related:** BUG-500 (parent pattern), BUG-496 (same useMemo section)
**Depends on:** OD-503-01 and OD-503-02 owner answers before Gate 3

---

## 1. Current State

### CheckInPage.jsx (WORKING REFERENCE)

```javascript
// Already present (BUG-386 + BUG-500):
import { useRestaurant } from '@/contexts';
import { computeRoomGst } from '@/utils/roomGstCalculator';

const { restaurant } = useRestaurant();
const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};
const formNights = useMemo(() => ...);  // derived from form.checkin/form.checkout

// GST strip (L927-970):
const gstBase = Math.max(0, amt - roomDiscountRs);          // ← discounted price
const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, nights, 1);
const rate = roomGstSlabs?.slabs?.find(s => (gstBase/nights) >= s.min && ...) → 5 or 18
// Renders live slab badge ("5% Slab" / "18% Slab") + CGST/SGST/total
```

### CheckInForm.jsx (BROKEN — mirror gap)

```javascript
// ZERO of these exist in CheckInForm.jsx:
// import { useRestaurant }
// import { computeRoomGst }
// roomGstSlabs / roomGstApplicable

// Static display (L173-175):
<span>SGST</span><span>{fmtINR(c.sgst)}</span>    // c.sgst = 810 always (18% booking-time)
<span>CGST</span><span>{fmtINR(c.cgst)}</span>    // c.cgst = 810 always (18% booking-time)
<span className="font-semibold">Total (incl. GST)</span>
  <span>{fmtINR(c.total_with_gst)}</span>          // static from booking
```

The `c` object (`row.charge`) carries booking-time GST values. These are never updated when the discount changes.

---

## 2. Data Flow Trace

**Working path (CheckInPage.jsx):**
```
roomGstSlabs (from profile API via useRestaurant)
  → computeRoomGst(slabs, gstBase=amt-roomDiscountRs, nights, 1)
  → { gstTotal, cgst, sgst }
  → GST strip renders live slab + CGST/SGST/total
  BREAK POINT: NONE — working correctly
```

**Broken path (CheckInForm.jsx):**
```
row.charge.sgst / row.charge.cgst  (from LR booking data — booking-time values)
  → rendered directly as static text
  BREAK POINT: c.sgst/c.cgst are never recalculated; no computeRoomGst call exists
```

**Example (owner scenario: room=9000, 88% discount → gstBase=1080):**
| Field | Shown (wrong) | Should show |
|-------|--------------|-------------|
| SGST | ₹810 (18% on ₹9,000) | ₹27.00 (5% on ₹1,080 / 2) |
| CGST | ₹810 (18% on ₹9,000) | ₹27.00 (5% on ₹1,080 / 2) |
| Total (incl. GST) | ₹10,620 (static) | ₹1,134.00 (dynamic) |

---

## 3. Affected Files and Lines

| File | Lines | Change |
|------|-------|--------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L1-6 (imports) | Add `useRestaurant` import (OR use via props — see OD-503-01) |
| `src/components/pms/frontdesk/CheckInForm.jsx` | L1-6 (imports) | Add `computeRoomGst` import from `@/utils/roomGstCalculator` |
| `src/components/pms/frontdesk/CheckInForm.jsx` | Inside component body | Add `roomGstApplicable`/`roomGstSlabs` derivation (via hook or props) |
| `src/components/pms/frontdesk/CheckInForm.jsx` | After existing useMemos | Add `formNights` constant: `const formNights = row.nights ?? 1` (already available on `row`) |
| `src/components/pms/frontdesk/CheckInForm.jsx` | L173-178 (bill SGST/CGST section) | Replace static `c.sgst`/`c.cgst` with dynamic values — see OD-503-02 |
| `src/components/pms/frontdesk/CheckInForm.jsx` | After discount section (~L222) | Add live GST strip (mirrors CheckInPage.jsx L927-970) |

**Estimated total:** ~30 lines in CheckInForm.jsx only.
**Files WILL NOT touch:** CheckInPage.jsx · FolioCheckoutPanel.jsx · pmsService.js · any other file.

---

## 4. nights Source — Confirmed

`CheckInForm.jsx` receives `row` as a prop. The `row` object (from LR booking data) carries `row.nights` — already used at L113:
```javascript
plural(c.nights ?? row.nights ?? 0, 'night')
```
**`formNights` derivation: `const formNights = row.nights ?? 1;`** — no useMemo needed. Simple and correct.

This matches `computeRoomGst`'s `nights` parameter semantics (same as CheckInPage.jsx where formNights is also 1 for a 1-night stay).

---

## 5. Dependency on BUG-504

**BUG-503 MUST be implemented BEFORE BUG-504 for CheckInForm.jsx.** BUG-504 requires:
- `computeRoomGst` import ← provided by BUG-503
- `roomGstSlabs` / `roomGstApplicable` ← provided by BUG-503
- `formNights` ← provided by BUG-503

BUG-504 on CheckInPage.jsx is independent (already has all infrastructure).

---

## 6. Owner Decisions (OPEN — must be answered before Gate 3)

### OD-503-01 — Source of GST slab config in CheckInForm.jsx

**Option A — `useRestaurant()` hook inside CheckInForm (RECOMMENDED):**
```javascript
const { restaurant } = useRestaurant(); // import from '@/contexts'
const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};
```
- Simpler, self-contained, no prop changes
- Matches how CheckInPage.jsx handles it (BUG-386 pattern)
- Component signature unchanged: `({ row, meta, rooms, rules, onDone, onClose })`

**Option B — Props from parent (FrontDeskWorkstationPage):**
- Add `roomGstApplicable` and `roomGstSlabs` to CheckInForm's prop signature
- Parent (which renders CheckInForm) must source them from `useRestaurant`
- More explicit but adds prop drilling

**Agent recommendation: Option A** — follows the established BUG-386 pattern; 1 fewer component to change.

---

### OD-503-02 — Existing SGST/CGST bill lines (from booking)

**Context:** Currently L173-174 show `c.sgst`/`c.cgst` (booking-time, static). The section is labeled "Room bill · from the booking".

**Option A — Replace static lines with dynamic values (RECOMMENDED):**
- Remove `{fmtINR(c.sgst)}` / `{fmtINR(c.cgst)}` from bill summary
- Compute dynamic SGST/CGST using `computeRoomGst(slabs, gstBase, formNights, 1)` where `gstBase = Math.max(0, bc - roomDiscountRs)`
- Add a live slab indicator ("5% Slab" / "18% Slab") like CheckInPage.jsx
- Single source of truth; no duplicate/contradictory GST numbers
- "Room bill · from the booking" heading stays — we just update the numbers live

**Option B — Keep static + add "after discount" strip below:**
- Keep `c.sgst`/`c.cgst` lines as "from the booking" (always 18%)
- Add a separate "After discount" GST strip below the discount section (mirrors CheckInPage.jsx)
- Two sets of GST numbers on screen — potentially confusing for staff

**Agent recommendation: Option A** — cleaner UX, single authoritative GST number, matches CheckInPage.jsx behavior.

---

## 7. Risk Assessment

| Area | Risk | Notes |
|------|------|-------|
| Financial display | HIGH — wrong GST values shown during check-in | Off by 16× on 88% discount (₹1,620 shown vs ₹54 correct) |
| Scope creep | LOW — 1 file, well-bounded | Does not touch pmsService or backend payload |
| Regression risk | MEDIUM — modifying bill display section | Must verify static booking values still display correctly when discount=0 |
| Interaction with BUG-504 | MEDIUM — BUG-503 must come first | BUG-504 CheckInForm.jsx reuses this infrastructure |

---

## 8. Verification Matrix (seeds QA handover)

| # | Check | Expected | How |
|---|-------|----------|-----|
| V1 | No discount: SGST/CGST show booking-time values (or correctly computed at full price) | SGST=810, CGST=810 (18% on 9000) | Browser: open CheckInForm with 9000 booking, no discount |
| V2 | 88% discount (₹7,920): GST strip shows 5% slab | SGST≈27, CGST≈27 | Browser: enter 88% → strip updates |
| V3 | 0% discount → 18% slab; 89%+ discount → 5% slab (gstBase=1080 < 7500/night) | Slab badge toggles | Browser: type then clear |
| V4 | Live update on every keystroke | No stale values | Browser: type slowly, watch strip |
| V5 | Walk-in scenario (row.nights=null) falls back to 1 night | No crash | Browser: if walk-in has no nights |
| V6 | webpack 0 new warnings | — | tail frontend.out.log |

---

## Post-Code Registry Checklist (for Implementation agent)
```
- [ ] registry.json: BUG-503 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-503 row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx — BUG-503 2026-10-07
- [ ] Code markers: // BUG-503 at every changed block
- [ ] Compile: 0 new warnings
```
