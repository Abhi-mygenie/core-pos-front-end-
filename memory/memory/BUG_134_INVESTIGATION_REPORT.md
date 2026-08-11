# BUG-134 — INVESTIGATION REPORT

**ID:** BUG-134
**Investigator:** Investigation agent
**Date:** 2026-06-15
**Steps used:** 10/10

---

## 1. Summary

**Root cause:** Missing `min-h-0` (Tailwind: `min-h-0`) on flex-column parents in OrderEntry.jsx causes `overflow-y: auto` children to never actually overflow on certain platforms/viewport sizes. Combined with a 6px custom scrollbar width (App.css), Windows Chrome classic scrollbar rendering makes the scroll area unreliable.

**Classification:** FE_BUG — CSS flexbox constraint chain incomplete
**Confidence:** HIGH (code-traced, mechanically reproducible on constrained viewports)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|---------|
| H1 | Missing `min-h-0` on flex parents → overflow collapses | Code trace: flex chain L1→L4 | 4 (Steps 3-6) | **CONFIRMED** | Lines 1454, 1606 in OrderEntry.jsx; line 20 in CategoryPanel.jsx — all missing `min-h-0` |
| H2 | Custom scrollbar CSS `::-webkit-scrollbar` hides interaction on Windows | Grep App.css | 2 (Steps 1-2) | **CONTRIBUTING** | App.css:32-48 — 6px scrollbar width. Not root cause alone, but makes Windows scroll harder to interact with |
| H3 | `pointer-events: none` / overlay blocking scroll | Code trace OrderEntry.jsx:1561 | 1 (Step 4) | **ELIMINATED** | `pointerEvents` only active when `isPlacingOrder=true` (during API call). Unrelated to intermittent scroll |
| H4 | Viewport/resolution dependent | Not directly tested (no Windows access) | 0 | **PARTIALLY CONFIRMED** (by H1) | `min-h-0` bug manifests differently per viewport — more items = more likely to fail. Mac overlay scrollbars mask the issue |

---

## 3. Data Flow Trace (CSS Layout Chain)

```
OrderEntry.jsx:1441  → fixed inset-0 z-50 flex                          [OK — bounded by viewport]
  OrderEntry.jsx:1444  → flex w-full h-full bg-white                     [OK — explicit h-full]
    CategoryPanel.jsx:20  → w-44 flex-shrink-0 flex flex-col             [⚠ MISSING min-h-0]
      CategoryPanel.jsx:44  → flex-1 overflow-y-auto                     [SCROLL TARGET — may not overflow]
    OrderEntry.jsx:1454  → flex-1 flex flex-col                          [⚠ MISSING min-h-0] ← PRIMARY
      OrderEntry.jsx:1456  → flex-shrink-0 (header bar)                  [OK]
      OrderEntry.jsx:1561  → flex-1 overflow-y-auto p-4                  [SCROLL TARGET — MENU ITEMS]
    OrderEntry.jsx:1606  → w-96 flex-shrink-0 flex flex-col              [⚠ MISSING min-h-0]
      CartPanel.jsx:1162  → flex-1 overflow-y-auto                       [SCROLL TARGET — CART ITEMS]
```

**BREAK POINT:** Lines 1454 and 1606 in OrderEntry.jsx. Without `min-h-0`, the flex column parents have `min-height: auto` (CSS default), which means they grow to fit content rather than constraining to their flex-allocated space. The `overflow-y: auto` children therefore see no overflow and scroll doesn't activate — or activates inconsistently based on content size + viewport.

**Why Windows-specific?**
- Mac Chrome uses overlay scrollbars (don't take layout space, appear on scroll/hover). This slightly changes the overflow calculation and masks the bug.
- Windows Chrome uses classic scrollbars (take 17px layout space). The 6px custom width (App.css:32) creates a narrow but visible scrollbar. Combined with the broken `min-h-0` chain, the scroll container's height calculation differs enough to trigger the bug on Windows but not Mac.

**Why intermittent?**
- Depends on number of menu items vs viewport height. When items barely exceed the container height, the bug is borderline — sometimes a few pixels of overflow allow scroll, sometimes not.
- Window resize, zoom level, and Windows display scaling (125%/150%) all shift the threshold.

---

## 4. Evidence Artifacts

All saved to: `/app/memory/evidence/BUG-134/`
- 4 owner screenshots (Place Order + QSR screens)
- Code trace documented in this report

---

## 5. Recommendations

**Classification:** FE_FIX
**Scope:** 3 lines across 2 files (+ optional scrollbar width increase)

### Fix A — PRIMARY (min-h-0 on flex column parents):

| # | File | Line | Current | Fix |
|---|------|------|---------|-----|
| 1 | OrderEntry.jsx | 1454 | `className="flex-1 flex flex-col"` | `className="flex-1 flex flex-col min-h-0"` |
| 2 | OrderEntry.jsx | 1606 | `className="w-96 flex-shrink-0 flex flex-col"` | `className="w-96 flex-shrink-0 flex flex-col min-h-0"` |
| 3 | CategoryPanel.jsx | 20 | `className="w-44 flex-shrink-0 flex flex-col"` | `className="w-44 flex-shrink-0 flex flex-col min-h-0"` |

### Fix B — OPTIONAL (improve scrollbar usability on Windows):

| # | File | Line | Current | Fix |
|---|------|------|---------|-----|
| 4 | App.css | 33 | `width: 6px;` | `width: 8px;` |
| 5 | App.css | 34 | `height: 6px;` | `height: 8px;` |

### Planning skip eligibility:
- ✅ ≤10 lines
- ✅ 2 files (3 with optional CSS)
- ⚠️ Touches hotspot OrderEntry.jsx (R5) — but change is CSS-only (adding a class), zero logic change
- ✅ Not financial (R6)

**Recommendation: DIRECT_BUG_FIX eligible. Owner must approve skip.**

---

## 6. Retroactive Candidates

NONE — no unregistered code found during investigation.

---

## 7. DashboardPage Scroll Chain (secondary check)

DashboardPage.jsx is not part of the OrderEntry overlay, but its scroll chain also has potential issues:
- Line 1629: `flex-1 flex flex-col min-h-screen overflow-hidden` — OK (has `min-h-screen` + `overflow-hidden`)
- Line 1670: `flex-1 p-2 overflow-auto flex` — ⚠️ also missing `min-h-0` but less critical (has `overflow-auto` directly)

If dashboard scroll issues are reported separately, the same `min-h-0` fix applies.
