# BUG-539 — Impact Analysis (Gate 2, Addendum — "Half Page" width issue)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** BUG-539 addendum — Report pages content not filling available width (sticks to sidebar issue)
**Risk:** LOW
**Sprint:** oct_cr_batch

---

## Header

**Previous BUG-539 fix (GATE_5A_IMPLEMENTED):** Header flex-wrap + table overflow-x-auto (PLReportPage.jsx E1/E2 + ConsumptionReportPage.jsx E3) — already shipped, not re-done.
**New issue scope:** Both files also have `max-w-7xl mx-auto` wrapping the page content. At normal desktop widths this constrains and centres the content, leaving large white gaps on the right side. Content does not "fill from sidebar edge to screen edge".
**Code Reality:** FULL — `max-w-7xl mx-auto` confirmed at HEAD in both files.
**Conflict Pre-Check:** CLEAN — no open item touches these two files beyond BUG-539 (already GATE_5A).
**Gate 2 Status:** COMPLETE — zero open decisions.

---

## 1. Root Cause

Both report pages share this JSX structure:

```jsx
// PLReportPage.jsx L173 (current at HEAD)
<div className="max-w-7xl mx-auto px-6 py-6">

// ConsumptionReportPage.jsx L197 (current at HEAD)
<div className="max-w-7xl mx-auto px-6 py-6">
```

`max-w-7xl` = 80rem = **1280px maximum width**. `mx-auto` = **centres the content** within the available flex-1 area.

**Why this looks "odd" / "half page":**

| Screen | Sidebar | Available width | Content width (max-w-7xl) | Right gap |
|--------|---------|----------------|--------------------------|-----------|
| 1366px | expanded (256px) | 1110px | 1110px (fits) | 0px |
| 1440px | expanded | 1184px | 1184px (fits) | 0px |
| 1440px | collapsed (64px) | 1376px | 1280px | **48px each side** |
| 1920px | collapsed | 1856px | 1280px | **288px each side** |
| 1920px | expanded | 1664px | 1280px | **192px each side** |

On any screen wider than ~1344px with sidebar collapsed, or ~1536px with sidebar expanded, the content floats centred with visible empty space on the right. This makes the page look disconnected from the sidebar — it does not "stick to the sidebar edge".

**Expected behaviour:** Content fills the full flex-1 area from the sidebar to the right screen edge, with only the `px-6` padding as margin.

---

## 2. Code Reality — Exact Lines at HEAD

```
PLReportPage.jsx    L173:  <div className="max-w-7xl mx-auto px-6 py-6">
ConsumptionReportPage.jsx  L197:  <div className="max-w-7xl mx-auto px-6 py-6">
```

Verified at HEAD (after prior BUG-539 E1/E2/E3 changes which did not touch these lines).

---

## 3. Data Flow Trace

```
PLReportPage.jsx / ConsumptionReportPage.jsx
  └── <div className="flex min-h-screen bg-slate-50">
        ├── <Sidebar isExpanded={isSidebarExpanded} />   ← takes 64px or 256px
        └── <div className="flex-1 ... ml-64/ml-16">    ← fills remaining screen width
              └── <div className="max-w-7xl mx-auto px-6 py-6">  ← BREAK POINT
                    (constrains to 1280px max, centres with mx-auto)
                    Content floats in centre instead of filling flex-1 from left edge
```

**BREAK POINT:** The `flex-1` parent fills from sidebar to right edge correctly. But the child `max-w-7xl mx-auto` constrains content to 1280px and centres it — creates empty space on the right at wide viewports.

---

## 4. Fix

Remove `max-w-7xl mx-auto` — keep `px-6 py-6` for padding.

| Edit | File | Line | Current | New |
|------|------|------|---------|-----|
| E1 | `PLReportPage.jsx` | L173 | `<div className="max-w-7xl mx-auto px-6 py-6">` | `<div className="px-6 py-6">` |
| E2 | `ConsumptionReportPage.jsx` | L197 | `<div className="max-w-7xl mx-auto px-6 py-6">` | `<div className="px-6 py-6">` |

**Effect:** Content fills the full flex-1 width from sidebar right edge to screen right edge, with 24px (px-6) padding on each side. At all viewport widths the content is flush to the sidebar.

---

## 5. Downstream Consumer Audit

These two lines are the outermost content wrapper. Removing `max-w-7xl mx-auto` makes the inner content (KPI strip, charts, table) expand to fill the full available width.

| Component | Impact |
|-----------|--------|
| KPI strip (`grid-cols-2 lg:grid-cols-4`) | Expands to fill wider area — cards become wider. Expected. |
| Charts (`ResponsiveContainer width="100%"`) | Already `100%` — fills new wider parent. Expected. |
| Data table (`w-full`) | Already `w-full` — fills new wider parent. Expected. |
| Consumption tabs + filters | `flex flex-wrap` — fills wider. Expected. |
| `overflow-x-auto` wrapper (BUG-539 E2) | Still present — table can still scroll horizontally if needed. Unchanged. |

**No regression on existing BUG-539 E1/E2/E3 fixes** — they are at different lines (L176/L266/L313 PLReport, L200 ConsumptionReport) and are not affected by this change.

---

## 6. Conflict Pre-Check

| Item | Status | Overlap |
|------|--------|---------|
| BUG-539 (E1/E2/E3, GATE_5A_IMPLEMENTED) | Already shipped | Touches L176/L266/L313/L200 — different lines. **Parallel-safe.** |
| BUG-540 (GATE_5A_IMPLEMENTED) | Already shipped | Touches L91/L116/L225 PLReport — different lines. **No conflict.** |
| CR-415 | Gate 2 (this session) | Touches Sidebar.jsx — different file entirely. **No conflict.** |

---

## 7. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **LOW** |
| Trigger | Pure CSS class removal — no logic, no API, no financial change |
| R5 hotspot? | NO |
| R6 financial? | NO |
| Planning-skip eligible? | **NO** — 2 files (planning-skip requires 1 file only) |
| Files WILL change | `PLReportPage.jsx` · `ConsumptionReportPage.jsx` |
| Files WILL NOT touch | Any service, transform, App.js, other pages |

---

## 8. Verification Matrix

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | PLReportPage content fills full width at 1920px (no right gap) | Screenshot at 1920px — content reaches right edge | NO |
| V2 | PLReportPage content fills full width at 1440px collapsed sidebar | Screenshot | NO |
| V3 | ConsumptionReportPage same — fills full width | Screenshot | NO |
| V4 | `max-w-7xl` and `mx-auto` absent from both files | `grep "max-w-7xl" PLReportPage.jsx ConsumptionReportPage.jsx` → 0 hits | YES |
| V5 | BUG-539 previous fixes still present (flex-wrap, overflow-x-auto) | Grep / visual check | YES |
| V6 | BUG-540 KPI label "Total Expenses and Purchases" still present | Visual check | NO |
| V7 | webpack 0 new warnings | `yarn build` | YES |

---

## 9. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-539 → status: GATE_5A_IMPLEMENTED (addendum E4+E5)
- [ ] FILE_OWNERSHIP.md: PLReportPage.jsx + ConsumptionReportPage.jsx rows updated with BUG-539 addendum
- [ ] Code markers: {/* BUG-539-W */} (W = width fix) on both changed lines
- [ ] yarn build: exit 0
- [ ] testing_agent: screenshot at wide viewport to confirm fix
```

---

## 10. Summary

- **2 files, 2 line changes** (each: remove `max-w-7xl mx-auto`)
- **Risk:** LOW — CSS only, existing BUG-539 fixes (E1-E3) unaffected
- **No open decisions**
- **DashboardPage (R5): NOT touched**

**Next:** "Gate 3 GO" → Implementation Plan.
