# BUG-502 — Intake Document

**ID:** BUG-502
**Date:** 2026-10-07
**Phase:** Check-In · Front Desk (Beta) / Check-In Page
**Area:** PMS → Check-In → Room Discount UI
**Priority:** P2
**Severity:** MINOR (layout-only; no data or financial impact)
**Risk:** LOW
**Sprint:** oct_bug_batch
**Status:** GATE_1_INTAKE
**Source:** OWNER-REPORTED (via investigation INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07)
**Confidence:** HIGH (code-traced)
**Duplicate check:** DISTINCT — no prior registration of this CSS layout bug
**Blast radius:** SMALL — 2 files, ~4 lines each (CSS/JSX structure only)
**Fast Lane eligible:** YES (≤10 lines, ≤2 files, CSS/JSX structure, no logic, no hotspot, no financial)

---

## 1. Symptom

When a user enters a percentage discount value that exceeds `maxPct` in the check-in discount input, a red alert box appears **alongside** the input field (in the same horizontal flex row). The alert text is wide and forces the discount input — which has `flex-1` — to compress to near-zero width. The input becomes virtually unusable until the alert disappears.

Visible in screenshots provided (all 3 viewports): the `₹` / `%` toggle + input + alert are all jammed into one flex row.

---

## 2. Root Cause (from investigation)

**CheckInForm.jsx L183-222:**
```jsx
<div className="flex items-center gap-2">   {/* FLEX CONTAINER */}
  <div>[type toggle]</div>
  <div className="relative flex-1"><input /></div>   {/* flex-1 — gets squeezed */}
  {roomDiscountRs > 0 && <span>-₹{...}</span>}
  {discountOverMax && (
    <div className="...rounded px-2 py-1 mt-1">   {/* ← SIBLING inside flex row */}
      Maximum discount: {maxPct}%...
    </div>
  )}
</div>
```

The `discountOverMax` alert `<div>` is the 4th sibling inside `flex items-center gap-2`. Flex distributes space; the alert's content (~35 chars) claims most of the row, collapsing the `flex-1` input.

**Same pattern in CheckInPage.jsx L886-923** — identical structure, identical bug.

---

## 3. Fix Scope

Move the `{discountOverMax && <div>...</div>}` block OUTSIDE the `flex items-center gap-2` container, into a new `<div>` immediately after the closing `</div>` of the flex row.

```
Files WILL change:  CheckInForm.jsx · CheckInPage.jsx
Files WILL NOT touch: any other file
Estimated: ~4 lines per file (move 3 JSX lines + add wrapper div)
```

---

## 4. Evidence

- Screenshots: attached in owner's chat message (3 viewports)
- Code trace: `CheckInForm.jsx:183-222` · `CheckInPage.jsx:886-923`
- Investigation: `investigations/INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07.md` § F1

---

## 5. Owner Decisions

None — fix is unambiguous CSS restructure. **Fast Lane APPROVED needed from owner before implementation.**

---

## 6. Verification

- Enter >88% discount in Amount mode → alert appears **below** the input row (not beside it)
- Input remains full-width when alert is visible
- Applies to both CheckInForm.jsx (Front Desk v2 inline) and CheckInPage.jsx (/pms/check-in)
