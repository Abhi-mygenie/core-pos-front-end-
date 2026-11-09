# BUG-539 (Width Fix) — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** BUG-539 addendum — Report pages content width (remove max-w-7xl mx-auto)
**Risk:** LOW
**Sprint:** oct_cr_batch
**Gate 3 Status:** COMPLETE — awaiting Gate 4 GO

---

## Step 0 — Entry Verification (PASS)

| File | Line | Fragment | Match |
|------|------|---------|:---:|
| PLReportPage.jsx | L173 | `max-w-7xl mx-auto px-6 py-6` | ✅ |
| ConsumptionReportPage.jsx | L197 | `max-w-7xl mx-auto px-6 py-6` | ✅ |
| PLReportPage.jsx | L176 | `flex-wrap gap-y-2` (BUG-539 E1, preserved) | ✅ |
| PLReportPage.jsx | L266 | `overflow-x-auto` (BUG-539 E2, preserved) | ✅ |
| ConsumptionReportPage.jsx | L200 | `flex-wrap gap-y-2` (BUG-539 E3, preserved) | ✅ |

No drift. Plan valid at HEAD.

---

## Scope Lock

**Files WILL change:** `PLReportPage.jsx` · `ConsumptionReportPage.jsx`
**Files WILL NOT touch:** Any other file · App.js · any service

---

## Exact Edits — 2 search_replace calls (one per file)

### E4 — PLReportPage.jsx L173: remove `max-w-7xl mx-auto`

**File:** `src/pages/reports-module/PLReportPage.jsx`

**old_str:**
```jsx
        <div className="max-w-7xl mx-auto px-6 py-6">
```
**new_str:**
```jsx
        <div className="px-6 py-6"> {/* BUG-539-W: removed max-w-7xl mx-auto — content fills sidebar-to-edge */}
```

---

### E5 — ConsumptionReportPage.jsx L197: remove `max-w-7xl mx-auto`

**File:** `src/pages/reports-module/ConsumptionReportPage.jsx`

**old_str:**
```jsx
        <div className="max-w-7xl mx-auto px-6 py-6">
```
**new_str:**
```jsx
        <div className="px-6 py-6"> {/* BUG-539-W: removed max-w-7xl mx-auto — content fills sidebar-to-edge */}
```

**NOTE:** Both files have the identical `max-w-7xl mx-auto px-6 py-6` string but in separate files — apply each edit to its respective file. Do NOT use `replace_all`.

---

## Execution Sequence

1. Apply E4 to `PLReportPage.jsx`
2. Apply E5 to `ConsumptionReportPage.jsx`
3. `yarn build` → EXIT GATE

---

## Verification Matrix

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | PLReportPage fills full width at 1920px | Screenshot 1920px — content reaches right edge, no right gap | NO |
| V2 | PLReportPage fills full width at 1440px collapsed sidebar | Screenshot | NO |
| V3 | ConsumptionReportPage fills full width | Screenshot at wide viewport | NO |
| V4 | `max-w-7xl` absent from both files | `grep "max-w-7xl" PLReportPage.jsx ConsumptionReportPage.jsx` → 0 hits | YES |
| V5 | Previous BUG-539 fixes preserved | `grep "BUG-539" PLReportPage.jsx ConsumptionReportPage.jsx` — E1/E2/E3 markers still present | YES |
| V6 | KPI cards, charts, table expand to fill width | Screenshot — content uses full available space | NO |
| V7 | No regression at narrow (1366px expanded) | Screenshot — no overflow | NO |
| V8 | webpack 0 new warnings | `yarn build` | YES |

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | Content becomes too wide on very large screens | `px-6` (24px) padding on each side provides comfortable margins; charts use `ResponsiveContainer width="100%"` which adapts cleanly |
| R2 | BUG-540 KPI regression | KPI at L225 unchanged — different line, not affected |
| R3 | BUG-539 E1/E2/E3 regression | Those edits are at L176/L266/L200 — different lines, not affected |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-539 → status: GATE_5A_IMPLEMENTED (addendum, E4+E5 added)
- [ ] FILE_OWNERSHIP.md: PLReportPage.jsx + ConsumptionReportPage.jsx rows updated with BUG-539-W
- [ ] Code markers: {/* BUG-539-W */} on both changed lines
- [ ] yarn build: exit 0
- [ ] testing_agent: screenshot verification at wide viewport
```
