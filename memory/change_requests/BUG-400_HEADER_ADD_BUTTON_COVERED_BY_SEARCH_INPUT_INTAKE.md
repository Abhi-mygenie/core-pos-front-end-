# BUG-400 INTAKE — Header "Add" Button Covered by Search Input

**ID:** BUG-400
**Date:** 2026-09-15
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** QA-FOUND — BATCH-10 Full Regression (2026-09-15), finding F-01
**Related:** Header.jsx POS2-002 search box
**Type:** BUG (CSS layout — hit-target overlap)
**Confidence:** CONFIRMED (Playwright captured: pointer click at Add button centre lands on `search-input` instead; JS `.click()` works fine)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** |
| Risk | **MEDIUM** — core UX entry point; workaround exists (JS click / tap table card) |
| Area | POS → Dashboard Header |
| Duplicate check | **DISTINCT** — no prior Add-button bug registered |
| Code reality | **CONFIRMED** — `Header.jsx:L343` search container `w-48` (192px); inner `<input className="flex-1">` can expand beyond parent bounds and overlay `add-table-btn` at `Header.jsx:L667` |
| Blast radius | **SMALL** — 1 file (`Header.jsx`), 1-2 lines |
| Fast Lane eligible | **YES** — LOW risk, ≤2 lines, 1 file, not financial, not hotspot |

---

## Description

On the POS dashboard header, the "Add" button (`data-testid="add-table-btn"`) is visually and functionally obscured by the search input box expanding beyond its container.

**Root cause:** The search container `div` is fixed-width `w-48` (192px) but does NOT have `overflow-hidden`. The `<input>` inside has `className="flex-1"` which lets the input's intrinsic min-width (browser default ~271px for type="text") overflow the container. This overflowed input element sits on top of the Add button's centre region.

**Playwright evidence:** `elementFromPoint` at Add button centre = `INPUT search-input` (not `add-table-btn`). 58 pointer retries — all intercepted by the input. JS `.click()` on the button DOES work → purely a hit-target/CSS issue, not a handler bug.

**Workaround:** Click the very top or bottom 10px edge of the Add button (outside the input overflow zone), or tap any table card to open OrderEntry.

---

## Evidence

- QA report: `test_reports/QA_REPORT_BATCH10_2026_09_15.md` §S2-01, finding F-01
- Screenshot: `s2_hdr` in QA report (search focused with "✕" overlapping "Add")
- Playwright log: `<input data-testid="search-input"> intercepts pointer events`

---

## Fix Path

**Option A (recommended — Fast Lane eligible):** Add `overflow-hidden` to the search container div (`Header.jsx:L342`)
```jsx
// BEFORE
<div className="relative">

// AFTER — add overflow constraint so input cannot bleed outside container
<div className="relative overflow-hidden">
```

**Option B:** Add `min-w-0` to the `<input>` element at `Header.jsx:L358` to suppress browser default min-width.

Either fix is ≤2 lines, 1 file, non-financial, not a hotspot — Fast Lane eligible with owner approval.

---

## Owner Decisions Needed

| OD | Question |
|---|---|
| OD-400-01 | Fast Lane approval — Option A (`overflow-hidden` on container) or Option B (`min-w-0` on input)? |
| OD-400-02 | **F-05 (from regression):** Room Orders Y-axis ticks show colliding values (e.g. "₹1k ₹1k ₹1k ₹0k") on low-value ranges. Fix the tick formatter precision, or ship as-is? |

---

*Intake: 2026-09-15 · QA-FOUND · Confidence: CONFIRMED · Blast: SMALL · Risk: MEDIUM · Fast Lane: YES (pending OD-400-01)*
