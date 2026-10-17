# BUG-539 — Re-Investigation Report (Layout Double-Offset)

**Date:** 2026-10-12 (re-investigation session)
**Role:** INVESTIGATION
**Item:** BUG-539 — Report pages content not filling width ("half page" / gap between sidebar and content)
**Steps used:** 5/10
**Classification:** FE_BUG — CODE_ERROR
**Confidence:** HIGH (traced + confirmed by cross-page comparison)

---

## 1. Summary

**Root cause:** `PLReportPage.jsx` and `ConsumptionReportPage.jsx` apply `ml-64/ml-16` on the content div WHILE the Sidebar is already in the normal flex document flow (not `position: fixed`). This creates a **double-offset**: `flex-1` already positions the content after the sidebar, then `ml-64` (256px) pushes it an additional 256px to the right.

**Result at 1366px viewport, sidebar expanded:**
- Sidebar width: **280px** (inline style, L494 Sidebar.jsx)
- `flex-1` content starts at: 280px (after sidebar in flex flow)
- `ml-64` adds: +256px
- Content actually starts at: **536px from left edge**
- Content width: 1366 − 536 = **830px** (should be 1086px)
- **Gap between sidebar and content: 256px** — this is the "half page" area

**Classification:** CODE_ERROR — wrong layout pattern applied. `ml-64/ml-16` is for `position: fixed` sidebars (where the sidebar is out of the document flow and the content div needs a manual margin). The Sidebar in this app is in the **normal flex document flow** (`flex-shrink-0 relative`), so no `ml-*` is needed.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|-----------|------|--------|---------|
| H1 | Sidebar is `position: fixed` — `ml-64` needed as manual offset | Read Sidebar.jsx L490-498 | **ELIMINATED** — Sidebar uses `className="...flex-shrink-0 relative"` and `style={{width: isExpanded ? "280px" : "70px"}}` — NOT fixed, in normal flex flow | Sidebar.jsx L492-494 |
| H2 | `ml-64/ml-16` values don't match sidebar width | Compare values: ml-64=256px vs sidebar=280px, ml-16=64px vs sidebar=70px | **CONFIRMED** — Even if sidebar were fixed, the values are wrong (280≠256, 70≠64) | Sidebar.jsx L494 |
| H3 | `flex-1` + `ml-64` on the same div creates a double-offset | Code trace of flex layout | **CONFIRMED** — `flex-1` already positions content after sidebar; `ml-64` additionally shifts it 256px further right | PLReportPage.jsx L172, ConsumptionReportPage.jsx L196 |
| H4 | Other working report pages don't have `ml-64/ml-16` | Cross-page comparison | **CONFIRMED** — ExpenseReportPage, SettlementReportMockup, OrderReportBetaPage, OrderLedgerMockup all use `flex-1 flex overflow-hidden` with no `ml-*` offset | Pattern comparison below |

---

## 3. Data Flow Trace — Break Point

```
BROKEN (PLReportPage.jsx + ConsumptionReportPage.jsx):

  <div className="flex min-h-screen bg-slate-50">        ← flex container
    <aside style={{width: "280px"}}  flex-shrink-0>      ← Sidebar: in-flow, 280px
    </aside>
    <div className="flex-1  ml-64">                      ← BREAK POINT
      {/* flex-1 = takes remaining (1366-280=1086px) after sidebar ✓
          ml-64  = ALSO pushes 256px more to the right ✗
          ──────────────────────────────────────────
          Content actually starts at: 280+256 = 536px
          Content width: 1366-536 = 830px (240px LOST)
          Gap between sidebar and content: 256px ← "half page" */}
```

```
CORRECT (ExpenseReportPage, SettlementReportMockup, OrderReportBetaPage):

  <div className="flex min-h-screen">                    ← flex container
    <aside style={{width: "280px"}}  flex-shrink-0>      ← Sidebar: in-flow, 280px
    </aside>
    <div className="flex-1 flex overflow-hidden">        ← CORRECT
      {/* flex-1 = content starts right after sidebar ✓
          No ml-* = no artificial gap ✓
          Content width: 1366-280 = 1086px ✓ */}
```

---

## 4. Sidebar.jsx Confirmed Layout (L490-498, HEAD)

```jsx
<aside
  data-testid="sidebar"
  className="h-screen flex flex-col transition-all duration-300 flex-shrink-0 relative"
  style={{
    width: isExpanded ? "280px" : "70px",   // ← 280px / 70px (NOT 256px / 64px)
    backgroundColor: COLORS.lightBg,
    borderRight: `1px solid ${COLORS.borderGray}`,
  }}
>
```

Key confirmations:
- `className` contains `relative` (not `fixed` or `absolute`)
- `flex-shrink-0` = sidebar is in the flex flow, won't shrink
- Width: **280px expanded, 70px collapsed** — neither matches `ml-64` (256px) or `ml-16` (64px)

---

## 5. Cross-Page Pattern Comparison

| Page | Layout pattern | Gap issue? |
|------|---------------|-----------|
| `PLReportPage.jsx` L172 | `flex-1 ... ml-64/ml-16` | ✗ YES — 256px gap |
| `ConsumptionReportPage.jsx` L196 | `flex-1 ... ml-64/ml-16` | ✗ YES — 256px gap |
| `ExpenseReportPage.jsx` L301 | `flex-1 flex overflow-hidden` | ✓ NO gap |
| `SettlementReportMockup.jsx` L346 | `flex-1 flex overflow-hidden` | ✓ NO gap |
| `OrderReportBetaPage.jsx` L400 | `flex-1 flex flex-col overflow-hidden` | ✓ NO gap |
| `OrderLedgerMockup.jsx` | `flex-1 flex overflow-hidden` | ✓ NO gap |
| `ItemSalesHybridMockup.jsx` | `flex-1 flex overflow-hidden` | ✓ NO gap |

---

## 6. Previous Fix Assessment

**BUG-539-W (removed `max-w-7xl mx-auto`):** Correct direction but addressed the wrong layer. Even without `max-w-7xl`, the content is still only 830px wide (starting at 536px) rather than 1086px (starting at 280px). The `max-w-7xl` was a secondary constraint that would only have mattered if the content were already at full width (1086px > 1280px = no, so it was a no-op at most viewport sizes). The PRIMARY cause is `ml-64/ml-16`.

**BUG-539 E1 (flex-wrap):** Still valid — needed for narrow viewports.
**BUG-539 E2 (overflow-x-auto):** Still valid — needed for table horizontal scroll.

---

## 5. Recommendations

**Classification:** FE_FIX — remove `ml-64/ml-16` from both PLReportPage.jsx (L172) and ConsumptionReportPage.jsx (L196).

| File | Line | Current | Fix |
|------|------|---------|-----|
| `PLReportPage.jsx` | L172 | `flex-1 transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-16'}` | `flex-1 flex flex-col overflow-hidden` (match working pages) |
| `ConsumptionReportPage.jsx` | L196 | same | same |

**Why this works:** Sidebar is in the flex flow with `flex-shrink-0`. `flex-1` alone correctly fills the remaining space. No `ml-*` needed.

**Planning-skip eligible?** NO — 2 files (rule: 1 file required for skip). → Full gate cycle (Gate 2 → 3 → 4 GO → Implementation).

**Note on `max-w-7xl` (BUG-539-W already applied):** Keep the removal — it was a latent secondary constraint. Once `ml-64` is removed and content is 1086px, keeping `max-w-7xl` removed ensures no future centering at wider viewports.
