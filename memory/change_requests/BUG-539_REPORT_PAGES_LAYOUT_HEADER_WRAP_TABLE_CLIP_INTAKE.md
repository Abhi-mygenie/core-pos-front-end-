# BUG-539 — P&L AND REPORT PAGES LAYOUT BROKEN: HEADER WRAPS + TABLE CLIPS ON WEB AND TABLET
**Registered:** 2026-10-12
**Type:** BUG
**Severity:** P1 — HIGH
**Risk:** LOW-MEDIUM
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

On the P&L report page (and other report pages with the same layout), two layout bugs are visible on both web (with sidebar open) and tablet:

1. **Header row wraps badly** — the "Profit & Loss Report" title wraps onto multiple lines because the date-range picker + preset pills + PDF button are all in a single `justify-between` row that doesn't flex-wrap at narrow widths.

2. **Table clips on narrow screens** — the 6-column data table is inside a container with `overflow-hidden` but NO `overflow-x-auto` wrapper. On narrow viewports (sidebar open ~900px effective), the table is clipped instead of scrolling.

**Screenshot evidence:** Owner provided screenshot showing "Profit & Loss Report" title wrapping across 4 lines with sidebar expanded on desktop browser.

---

## Root Cause

**Bug A — Header wrapping (PLReportPage.jsx L175):**
```jsx
<div className="flex items-center justify-between mb-6">
  <div>Profit & Loss Report + subtitle</div>  ← left: title block
  <div>[FROM][TO][Apply][Today][7D][30D][MTD][PDF]</div>  ← right: ALL controls, no wrap
```
Single non-wrapping flex row. When sidebar is open (256px), effective content width ≈ screen_width − 256 − 48px_padding. On a 1366px screen: ~1062px available, which fits. BUT the `max-w-7xl` container adds no minimum width guard and date controls together are ~700px — too wide when title also needs space.

**Bug B — Table overflow (PLReportPage.jsx L264):**
```jsx
<div className="overflow-hidden shadow-sm">   ← clips the table
  <table className="w-full">                  ← no inner overflow-x-auto
```

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG for report page layout.

---

## Evidence

- **Source:** OWNER (screenshot 2026-10-12 — desktop browser with sidebar)
- **Confidence:** CONFIRMED — code trace + screenshot
- **Code reality:** FULL (both layout issues at HEAD)
- **Scope:** Affects P&L page confirmed; likely same pattern in other report pages using same layout skeleton (Expense Report, Purchase Report, Settlement Report, etc.)

---

## Severity

**P1 — HIGH:** Core report page is broken on desktop when sidebar is open (the default state). Title wrapping makes the page look unprofessional and controls may be hard to reach.

---

## Risk

**LOW-MEDIUM** — pure layout/CSS changes. No logic, no API, no financial calculation. Potentially multiple files if other report pages need the same fix.

---

## Blast Radius

- **Primary:** `PLReportPage.jsx` — confirmed broken
- **Related (same layout pattern):** `ExpenseReportPage`, `PurchaseReportPage`, `SettlementReport`, other report pages — need audit at Gate 2
- **Files WILL NOT touch:** Any service, transform, or context file

---

## Fix Scope (for Gate 2 planning)

1. **Header:** Add `flex-wrap gap-y-2` to the header container so date controls drop to a 2nd line on narrow screens
2. **Table:** Wrap `<table>` in `<div className="overflow-x-auto">` inside the `overflow-hidden` container

---

## Open Questions

**OD-539-01:** Should the fix be applied to ALL report pages in one CR, or only PLReportPage first?
- **(A) All report pages** — one combined fix
- **(B) PLReportPage only first** — ship fast, others follow

---

## Next

→ Gate 2 GO → Impact Analysis (audit all report pages for same pattern)
