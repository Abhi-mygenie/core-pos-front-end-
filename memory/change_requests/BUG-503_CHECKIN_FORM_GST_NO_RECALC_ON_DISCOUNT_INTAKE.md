# BUG-503 — Intake Document

**ID:** BUG-503
**Date:** 2026-10-07
**Phase:** Check-In · Front Desk (Beta) only
**Area:** PMS → Check-In → GST Slab Recalculation (CheckInForm mirror)
**Priority:** P1
**Severity:** MAJOR (financial display wrong — shows 18% GST when 5% applies after discount)
**Risk:** HIGH
**Sprint:** oct_bug_batch
**Status:** GATE_1_INTAKE
**Source:** OWNER-REPORTED (via investigation INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07)
**Confidence:** HIGH (code-traced)
**Duplicate check:** RELATED BUG-500 — BUG-500 F2 only fixed CheckInPage.jsx; CheckInForm.jsx (mirror) was explicitly out of scope. This is the mirror gap.
**Blast radius:** SMALL — 1 file primary (CheckInForm.jsx), possibly 1 supporting file if props chosen over hook
**Fast Lane eligible:** NO (HIGH risk, financial display, new imports + logic)

---

## 1. Symptom

On the **Front Desk (Beta)** page (`/pms/front-desk-v2`), in the expand-in-place check-in panel (CheckInForm.jsx):

- When a room discount is applied that reduces the effective room rent to **below ₹7,500** per night, the GST displayed in the bill summary **does not change**.
- The SGST and CGST lines continue to show the booking-time values (18% on ₹9,000 = ₹810 each) even though the discounted rent should fall into the **5% GST slab** (≤ ₹7,500/night).
- The "Balance due" shown (`c.balance_due − roomDiscountRs`) is semantically wrong because it embeds the original 18% GST, not the recalculated 5% GST.

**Example (owner's scenario):**
| Field | Booking-time (shown) | After 88% discount (should show) |
|-------|---------------------|----------------------------------|
| Room rent | ₹9,000 | ₹1,080 |
| SGST | ₹810 (18%) | ₹27 (5%) |
| CGST | ₹810 (18%) | ₹27 (5%) |
| Total incl. GST | ₹10,620 | ₹1,134 |

---

## 2. Root Cause (from investigation)

BUG-500 was implemented on **CheckInPage.jsx ONLY** (per the BUG-500 plan: "File WILL change: CheckInPage.jsx ONLY"). The mirror component `CheckInForm.jsx` was explicitly out of scope.

**CheckInForm.jsx current state:**
```javascript
// No import of computeRoomGst
// No import/use of useRestaurant
// No roomGstSlabs / roomGstApplicable

// Static display — never updates:
<span>SGST</span><span>{fmtINR(c.sgst)}</span>   // c.sgst = 810 always
<span>CGST</span><span>{fmtINR(c.cgst)}</span>   // c.cgst = 810 always
```

**CheckInPage.jsx (CORRECT — reference):**
```javascript
const gstBase = Math.max(0, amt - roomDiscountRs);    // discounted price
const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, nights, 1);
const rate = roomGstSlabs?.slabs?.find(s => (gstBase/nights) >= s.min && ...)?.gst_percent ?? 0;
// → shows "5% Slab" / "18% Slab" live as discount changes
```

CheckInForm.jsx also lacks the required infrastructure: no `computeRoomGst` import, no `useRestaurant()` context, no `formNights` derived from `row.checkin`/`row.checkout`.

---

## 3. Fix Scope

```
Files WILL change:  CheckInForm.jsx (primary — all changes)
Files WILL NOT touch: CheckInPage.jsx · FolioCheckoutPanel.jsx · pmsService.js
```

Changes required in CheckInForm.jsx:
1. Import `computeRoomGst` from `@/utils/roomGstCalculator`
2. Add `useRestaurant` hook (from `@/contexts`) — OR receive `roomGstApplicable`/`roomGstSlabs` as props (see OD-503-01)
3. Derive `formNights` from `row.checkin` / `row.checkout` (1 useMemo, same as CheckInPage.jsx L248-251)
4. Replace static `c.sgst`/`c.cgst` lines with dynamic values computed on `roomDiscountRs`
5. Add live GST strip (mirroring CheckInPage.jsx L927-970): shows CGST/SGST/slab badge/total, updates as discount changes

**Estimated:** ~30 lines in CheckInForm.jsx.

---

## 4. Owner Decisions

**OD-503-01 (OPEN):** Source of GST slab config in CheckInForm.jsx

- **Option A — `useRestaurant()` hook inside CheckInForm** (RECOMMENDED): Add `const { restaurant } = useRestaurant()` inside the component, derive `roomGstApplicable` and `roomGstSlabs` from `restaurant.checkInFlags`. Simpler. Matches how CheckInPage.jsx handles it. No prop changes.
- **Option B — Props from parent (FrontDeskPage)**: Pass `roomGstApplicable` and `roomGstSlabs` down from the parent component that renders CheckInForm. More explicit but adds 2 props to signature.

**OD-503-02 (OPEN):** Static SGST/CGST lines in the existing bill summary (from booking)

- **Option A — Replace** with dynamic values based on discounted room rent. Cleaner, always shows correct current GST.
- **Option B — Keep static + add strip below**: Keep `c.sgst`/`c.cgst` as "from the booking" and show a separate "after discount" GST strip below (like CheckInPage.jsx). Both displayed simultaneously.

Owner recommendation: Option A for both (simpler, mirrors CheckInPage.jsx).

---

## 5. Evidence

- Code trace: `CheckInForm.jsx` full file — zero `computeRoomGst` / `roomGstSlabs` references
- BUG-500 plan: `plans/BUG-500_IMPLEMENTATION_PLAN.md` — "File WILL change: CheckInPage.jsx ONLY"
- Reference implementation: `CheckInPage.jsx:927-970` (working GST strip)
- Investigation: `investigations/INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07.md` § F2

---

## 6. Execution constraint

**BUG-503 must be implemented BEFORE BUG-504** for CheckInForm.jsx, because BUG-504's cap formula fix requires `computeRoomGst` + `roomGstSlabs` in CheckInForm.jsx — which BUG-503 brings in.

BUG-504 on CheckInPage.jsx is independent (already has the infrastructure).
