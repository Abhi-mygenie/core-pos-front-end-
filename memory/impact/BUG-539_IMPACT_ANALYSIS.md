# BUG-539 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** BUG-539 — Report pages layout: header wraps + table clips
**Risk:** LOW
**Sprint:** oct_cr_batch

---

## Header

**Code Reality:** FULL — both layout bugs confirmed at HEAD in PLReportPage.jsx. ConsumptionReportPage.jsx has Bug A only (Bug B already handled).
**Conflict Pre-Check:** CLEAN — BUG-540 (GATE_5A_IMPLEMENTED, PLReportPage.jsx L91/116/225) is at different lines; ConsumptionReportPage.jsx last touched CR-093 (2026-07-23).
**OD-539-01:** B LOCKED — PLReportPage.jsx + ConsumptionReportPage.jsx only.
**Gate 2 Status:** COMPLETE — zero open owner decisions.

---

## 1. Scope (OD-539-01 = B)

| File | Bug A (header wrap) | Bug B (table clip) |
|------|-------------------|-------------------|
| `PLReportPage.jsx` | **NEEDS FIX** — L176 | **NEEDS FIX** — L265/266 |
| `ConsumptionReportPage.jsx` | **NEEDS FIX** — L200 | **NOT NEEDED** — all tables already have `overflow-x-auto` |

---

## 2. Code Reality Verification (HEAD)

### PLReportPage.jsx (319 lines post–BUG-540)

**Bug A — Header (L176, confirmed):**
```jsx
<div className="flex items-center justify-between mb-6">
```
Single `flex justify-between` row — title block left, ALL date/preset/PDF controls right. No `flex-wrap`. When sidebar is open (~1366px) or on tablet, controls compress the title, causing wrapping.

**Bug B — Table (L265–266, confirmed):**
```jsx
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" data-testid="pl-table">
  <table className="w-full text-left">
```
`overflow-hidden` outer div clips the 6-column table horizontally. No inner `overflow-x-auto` wrapper.

### ConsumptionReportPage.jsx (534 lines)

**Bug A — Header (L200, confirmed):**
```jsx
<div className="flex items-center justify-between mb-6">
```
Same `flex justify-between` pattern — title left, Excel+PDF buttons right. Less crowded than P&L but same structural gap.

**Bug B — Tables (ALREADY FIXED):**
- Main consumption table (L306 outer / L322 inner): L322 already has `<div className="overflow-x-auto">` ✅
- Wastage log table (L454 outer / L458 inner): L458 already has `<div className="overflow-x-auto">` ✅
- Top Items table (L493 outer / L497 inner): L497 already has `<div className="overflow-x-auto">` ✅
- Drill-down nested table (L373): narrow nested component — no fix needed.

---

## 3. Fix Design

### E1 — PLReportPage.jsx L176: header flex-wrap

**Change:** Add `flex-wrap gap-y-2` to className.

```jsx
// Before
<div className="flex items-center justify-between mb-6">

// After
<div className="flex items-center justify-between mb-6 flex-wrap gap-y-2">
```

**Effect:** When controls can't fit on one row, the right-side block wraps to a 2nd line with `gap-y-2` (8px) vertical gap.

---

### E2 — PLReportPage.jsx L265–266: table overflow-x wrapper

**Change:** Insert `<div className="overflow-x-auto">` after the outer container open tag (L265), and close it with `</div>` immediately before the outer container's closing `</div>`.

```jsx
// Before
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" data-testid="pl-table">
  <table className="w-full text-left">
    ...
  </table>
</div>

// After
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" data-testid="pl-table">
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      ...
    </table>
  </div>
</div>
```

**Pattern:** Mirrors ConsumptionReportPage.jsx L306/L322 which already uses this exact pattern — outer `overflow-hidden` (clips to rounded corners), inner `overflow-x-auto` (horizontal scroll).

---

### E3 — ConsumptionReportPage.jsx L200: header flex-wrap

**Change:** Same as E1.

```jsx
// Before
<div className="flex items-center justify-between mb-6">

// After
<div className="flex items-center justify-between mb-6 flex-wrap gap-y-2">
```

---

## 4. Why `overflow-hidden` + `overflow-x-auto` works

`overflow-hidden` on the outer container clips children to the rounded corners — standard Tailwind pattern for rounded cards with tables. The inner `overflow-x-auto` creates a scroll context **within** the outer container's bounds. The scrollbar renders inside the clipped area; horizontal scrolling works correctly. This is the existing pattern in ConsumptionReportPage and all other report pages that already have this fixed.

---

## 5. Conflict Pre-Check

| Item | Status | Overlap? |
|------|--------|---------|
| BUG-540 | GATE_5A_IMPLEMENTED | PLReportPage.jsx — touches L91/116/225 only. BUG-539 edits L176 + L265. Zero line overlap. **Parallel-safe.** |
| CR-093 | QA PASS (2026-07-24) | Last modifier of ConsumptionReportPage.jsx. No open items in conflict. **Clean.** |
| CR-153 | Implemented (via ConsumptionReportPage) | Same file — wastage tab. BUG-539 only touches L200 (header). Zero overlap with wastage section (L417+). **Parallel-safe.** |

---

## 6. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **LOW** |
| Trigger | Pure CSS className additions, no logic change |
| R5 hotspot? | NO — neither file is on the R5 list |
| R6 financial? | NO — layout only |
| Planning-skip eligible? | **NO** — 2 files (skip requires 1 file only) |
| Files WILL change | `PLReportPage.jsx` · `ConsumptionReportPage.jsx` |
| Files WILL NOT touch | Any service · transform · context · App.js · any other file |

---

## 7. Edit Summary

| # | File | Line | Change type | Lines changed |
|---|------|------|-------------|:---:|
| E1 | `PLReportPage.jsx` | L176 | className addition | 1 |
| E2 | `PLReportPage.jsx` | L265–266 | Wrap `<table>` in `<div className="overflow-x-auto">` | +2 |
| E3 | `ConsumptionReportPage.jsx` | L200 | className addition | 1 |

**Total:** 2 files, 4 lines (1 changed + 2 inserted + 1 changed), no logic change.

---

## 8. Verification Matrix (seeds Gate 3 + QA)

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | P&L header stays on 1 row at 1366px sidebar-open | Screenshot at 1366px | NO |
| V2 | P&L header controls wrap gracefully at 390px | Screenshot at 390px | NO |
| V3 | P&L table horizontal scroll at narrow width (no clipping) | Screenshot at 900px | NO |
| V4 | Consumption Report header stays on 1 row at 1366px | Screenshot | NO |
| V5 | No regression at 1920px — both pages look correct wide | Screenshot | NO |
| V6 | webpack compiles 0 new warnings | `yarn build` | YES |

---

## 9. Open Owner Decisions

**None.** OD-539-01 = B locked. Fix is fully scoped.

---

## 10. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-539 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: BUG-539 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: PLReportPage.jsx + ConsumptionReportPage.jsx rows added with BUG-539 + date
- [ ] Code markers: // BUG-539 on every modified line (E1, E2 ×2, E3)
- [ ] yarn build: exit 0, 0 new warnings
```

---

## 11. Summary

- **PLReportPage.jsx:** 2 edits (header flex-wrap + table overflow-x wrapper)
- **ConsumptionReportPage.jsx:** 1 edit (header flex-wrap only — table already correct)
- **Risk:** LOW — pure CSS, no logic/API/financial change
- **No open decisions**
- **Planning-skip:** NOT eligible (2 files)

**Next:** "Gate 3 GO" → Implementation Plan → Gate 4 GO → Implementation.
