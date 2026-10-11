# BUG-502 — Impact Analysis (Gate 2)

**ID:** BUG-502
**Date:** 2026-10-07
**Author:** PLANNING agent
**Risk:** LOW
**Code Reality:** PARTIAL — defect exists in shipped code; no fix exists yet
**Conflict Pre-Check:** CLEAN — no other open item touches these layout lines
**Fast Lane eligible:** YES (≤10 lines, CSS/JSX structure only, 2 files, not hotspot, not financial)

---

## 1. Data Flow Trace

No data flow — this is a DOM structure defect.

**Render path:**
```
CheckInForm.jsx render
  └─ <div className="flex items-center gap-2">        ← flex container (L183)
       ├─ [type toggle: ₹ / %]
       ├─ <div className="relative flex-1"><input /></div>  ← gets squeezed
       ├─ {roomDiscountRs > 0 && <span>-₹...</span>}
       └─ {discountOverMax && <div class="...">alert</div>}  ← L217-221: INSIDE flex
```

When `discountOverMax` is true, the alert `<div>` is a 4th sibling in the flex row. Flex distributes available width across all children. The alert's text content (~40 chars) claims the majority of the row width. The `flex-1` input loses its exclusive claim and compresses to near zero.

**Same structure in CheckInPage.jsx:**
```
CheckInPage.jsx render (L886-923)
  └─ <div className="flex items-center gap-2">       ← flex container (L886)
       ├─ [type toggle]
       ├─ <div className="relative flex-1"><input /></div>
       ├─ {roomDiscountRs > 0 && <span>...</span>}
       └─ {discountOverMax && <div>alert</div>}       ← L918-922: INSIDE flex
```

**Break point:** Both files place the alert as a flex sibling. It must be moved BELOW the flex row as a block-level element.

---

## 2. Affected Files and Lines

| File | Lines | Current state | Change needed |
|------|-------|--------------|---------------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L183-222 | Alert `<div>` at L217-221 is a flex child inside `flex items-center gap-2` | Move alert outside the flex container, directly after its closing `</div>` |
| `src/pages/pms/CheckInPage.jsx` | L886-923 | Alert `<div>` at L918-922 is a flex child inside `flex items-center gap-2` | Same move |

**Lines changed per file: ~4** (remove 3 lines of alert JSX from inside, re-add 3 lines immediately below as a sibling block div).

---

## 3. Downstream Consumers / Risk

No downstream consumers affected. This change:
- Does NOT change `discountOverMax` logic
- Does NOT change `maxPct` calculation
- Does NOT change any state
- Does NOT affect the Confirm button's disabled state (it still uses `discountOverMax`)
- Purely restructures where the alert renders in the DOM

The alert will still appear, still show the same text, and still be visible. It will simply render below the input row instead of beside it.

---

## 4. Risk Classification

**LOW** — CSS/JSX structure change only. No logic, no state, no API, no financial fields.

---

## 5. Owner Decisions

**None** — fix is unambiguous. Alert goes below the flex row.

**Fast Lane APPROVED** is the only gate requirement before implementation.

---

## 6. Verification Matrix (seeds QA handover)

| # | Check | How |
|---|-------|-----|
| V1 | Enter >88% discount in CheckInForm — alert renders BELOW input, input remains full width | Browser DevTools: inspect `.flex.items-center.gap-2` — alert not a child |
| V2 | Enter >88% discount in CheckInPage — same behavior | Same |
| V3 | webpack 0 new warnings | tail frontend.out.log |

---

## Post-Code Registry Checklist (for Implementation agent)
```
- [ ] registry.json: BUG-502 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-502 row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-502 2026-10-07
- [ ] Code markers: // BUG-502 near moved alert blocks
- [ ] Compile: 0 new warnings
```
