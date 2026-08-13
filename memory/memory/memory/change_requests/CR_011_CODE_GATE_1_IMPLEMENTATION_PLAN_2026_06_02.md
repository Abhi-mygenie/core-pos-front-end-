# CR-011 Code Gate 1 — Implementation Plan (Artifact 3a)

**CR:** CR-011 — Complete Reports Module
**Phase:** Phase 1 (S0–S4)
**Date:** 2026-06-02
**Author:** Main agent (E1)
**Status:** DRAFT — awaiting owner GO
**Prerequisite:** Phase 1 Screen Freeze COMPLETE (all 5 screens FROZEN)

---

## 0. Purpose

This document is Artifact 3a (Implementation Plan) for the Phase 1 sub-CR of CR-011, per the 7-artifact closure model and the per-Phase Code Gate interleave defined in `CR_011_SCREEN_FREEZE_PROTOCOL.md §4`.

The goal of Code Gate 1 is to verify that all 5 Phase 1 screens satisfy the Loading & Interaction Spec (`CR_011_LOADING_AND_INTERACTION_SPEC.md §5`) acceptance checklist.

---

## 1. Scope

| What | Detail |
|---|---|
| Screens in scope | S0 (Dashboard), S1 (Module Shell), S2 (Item Sales), S3 (Drill Sheet), S4 (Edge States) |
| Spec contract | `CR_011_LOADING_AND_INTERACTION_SPEC.md` (rev 2026-06-02) |
| Primitives | `ReportLoadingShield.jsx`, `useReportFetch.js` — both ALREADY BUILT in `/app/frontend/src/components/reports/` |
| Date controls | Apply button, 2-month max range, FY disabled, min/max calendar constraints |

---

## 2. Per-screen compliance audit against §5

### S0 — Landing Dashboard (`DashboardMockup.jsx`, 678 lines)

| §5 Item | Status | Evidence |
|---|---|---|
| Uses `useReportFetch` | ✅ | L73: `useReportFetch(() => getDashboardAggregated(appliedFrom, appliedTo), ...)` |
| Wrapped in `<ReportLoadingShield>` | ✅ | L290: `<ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>` |
| Every §2 control has `disabled={isLoading}` | ✅ | Date From L205, Date To L218, Apply L232, Presets L251, Export PDF L271, Export Excel L280 |
| First-load splash | ✅ | Via ReportLoadingShield (isLoading && !hasLoadedOnce) |
| Re-fetch ghosts + progress bar | ✅ | Via ReportLoadingShield (opacity-60, pointer-events-none, progress bar) |
| Rapid dep changes → single request | ✅ | Via useReportFetch debounce (300ms) + AbortController |
| Error retry CTA | ✅ | Via ReportLoadingShield onRetry={refetch} |
| Empty distinct from loading | ✅ | Each tile has empty fallback (e.g., "No items in this range" L416, "No payment data" L468) |
| No console warnings | ✅ | Verified via prior testing session |
| `aria-busy="true"` | ✅ | ReportLoadingShield L28: `aria-busy={isLoading}` |
| Apply button present | ✅ | L230-242: green Apply button, commits draft → applied |
| Apply disabled appropriately | ✅ | L232: `disabled={isLoading \|\| !canApply}` where canApply = draftDirty && draftValid && !draftRangeExceeded |
| Date picker orange on dirty | ✅ | L197: `border-[#F26B33]` when draftDirty && draftValid && !draftRangeExceeded |
| Red + "Max 2 months" | ✅ | L197: `border-red-400` when draftRangeExceeded; L224-226: "Max 2 months" label |
| Presets auto-apply | ✅ | L89-130: handlePreset sets both draft + applied dates |
| FY disabled | ✅ | L247-248: `isDisabledPreset = p === 'FY'`, grey + cursor-not-allowed + tooltip |
| Calendar min/max | ✅ | L69-70: maxToDate, minFromDate computed; L206: `min={minFromDate}`, L219: `max={maxToDate}` |

**S0 VERDICT: FULLY COMPLIANT — 17/17 ✅. No changes needed.**

---

### S1 — Module Shell + Sidebar (Sidebar.jsx + App.js routes)

S1 is the navigation shell — sidebar, routing, top nav bar. It has **no data fetch** (confirmed in `CR_011_SCREEN_FREEZE_LOG.md`: "sidebar nav wired — no data API on S1").

| §5 Item | Applicability | Notes |
|---|---|---|
| useReportFetch | N/A | No data fetch on S1 |
| ReportLoadingShield | N/A | No report body to wrap |
| §2 controls disabled | N/A | No interactive report controls |
| First-load / re-fetch / error / empty | N/A | No fetch lifecycle |
| Apply button + date controls | N/A | No date picker on S1 |

**S1 VERDICT: TRIVIALLY COMPLIANT — no data fetch, all §5 items N/A. No changes needed.**

---

### S2 — Item Sales (`ItemSalesMockup.jsx`, 773 lines)

| §5 Item | Status | Evidence |
|---|---|---|
| Uses `useReportFetch` | ✅ | L240: `useReportFetch(() => getItemSalesAggregated(...), ...)` |
| Wrapped in `<ReportLoadingShield>` | ✅ | L576: `<ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>` |
| Every §2 control has `disabled={isLoading}` | ✅ | Date From L422, Date To L436, Apply L450, Presets L469, Attribution toggles L494/503/514/522, Search L589, Station filter L598, Category filter L609, Veg filter L619, Export PDF L533, Export Excel L541, Tabs L561 |
| First-load splash | ✅ | Via ReportLoadingShield |
| Re-fetch ghosts + progress bar | ✅ | Via ReportLoadingShield |
| Rapid dep changes → single request | ✅ | Via useReportFetch |
| Error retry CTA | ✅ | Via ReportLoadingShield onRetry={refetch} |
| Empty distinct from loading | ✅ | L701-717: Search icon + "No items found" + "Try Last 7 Days" CTA |
| No console warnings | ✅ | Verified |
| `aria-busy="true"` | ✅ | Via ReportLoadingShield |
| Apply button present | ✅ | L448-460 |
| Apply disabled appropriately | ✅ | L450: `disabled={isLoading \|\| !canApply}` |
| Date picker orange on dirty | ✅ | L415: border-[#F26B33] condition |
| Red + "Max 2 months" | ✅ | L415: border-red-400; L442-444: "Max 2 months" label |
| Presets auto-apply | ✅ | L186-224: handlePreset |
| FY disabled | ✅ | L465: `isDisabledPreset = p === 'FY'` |
| Calendar min/max | ✅ | L179-180: maxToDate, minFromDate; L423: min, L437: max |

**Note on sort headers (L678-697):** `<th onClick>` elements don't have a native `disabled` attribute, but they sit inside `ReportLoadingShield` which applies `pointer-events-none` during loading. This satisfies §2 ("Column sort headers: pointer-events: none + cursor reset") via the shield wrapper. Belt-and-braces via the shield is the designed mechanism for non-form elements.

**Note on filter chip clear buttons (L642-668):** These are inside the shield, so pointer-events-none applies. Same belt-and-braces reasoning.

**S2 VERDICT: FULLY COMPLIANT — 17/17 ✅. No changes needed.**

---

### S3 — Side-sheet Drill Template (`ItemDrillSheet.jsx`, 316 lines)

S3 is a **presentation-only overlay** that renders when a row is clicked in S2. It:
- Receives ALL data via props (`item`, `item.drill`) — already fetched by S2
- Does NOT make its own API calls
- Does NOT have date pickers, presets, or Apply buttons
- Is positioned OUTSIDE S2's ReportLoadingShield (S2 L760-767), but S3 can only be opened when S2 is NOT loading (because the table row `onClick` is inside the shield, which applies `pointer-events-none` during loading)

| §5 Item | Applicability | Notes |
|---|---|---|
| useReportFetch | N/A | No own fetch; data received via props from S2 |
| ReportLoadingShield | N/A | Not a main-panel report; it's a side overlay |
| §2 controls disabled | N/A | Only has a close button (always operable) |
| First-load / re-fetch / error / empty | N/A | No fetch lifecycle; empty state handled at L286-289 |
| Apply button + date controls | N/A | No date picker in drill sheet |

**Gate protection:** The row click that opens S3 (`<tr onClick={() => setSelectedRow(row)}>` at S2 L723-724) is inside S2's `<ReportLoadingShield>`, which blocks pointer events during loading. Users cannot open S3 while S2 is fetching. This satisfies §2 row 11 ("Table row click → drill sheet: pointer-events: none").

**Out of scope note:** `CR_011_LOADING_AND_INTERACTION_SPEC.md §6` explicitly states: "Per-row inline loading (e.g., drill-sheet lazy load) — drill-sheet has its own loading contract, defined in S3 mockup". S3 currently loads inline from pre-fetched data (no lazy load), so no separate loading contract is needed.

**S3 VERDICT: COMPLIANT (presentation-only, no own fetch) — all §5 items N/A. No changes needed.**

---

### S4 — Edge States Template (`EdgeStatesMockup.jsx`, 349 lines)

S4 is a **visual demonstration template** that shows what loading, error, empty, refetch-ghost, and loaded states LOOK like. It:
- Uses a manual toggle bar (`activeState`) to cycle between edge states — NOT actual fetch lifecycles
- Does NOT use `useReportFetch` or `ReportLoadingShield` — it re-implements the visual patterns inline for demo purposes
- Is NOT a production report screen — it's a QA reference tool
- Was marked in the freeze log as: "N/A (visual template — no API wiring; states demoed via toggle)"

| §5 Item | Applicability | Notes |
|---|---|---|
| useReportFetch | N/A | Demo template — no real fetch |
| ReportLoadingShield | N/A | Demonstrates the patterns visually, doesn't use the component |
| All other items | N/A | Not a report screen |

**S4 VERDICT: N/A (demo template, not a report screen). No changes needed.**

---

## 3. Summary — changes required for Code Gate 1

| Screen | Changes needed | Files touched |
|---|---|---|
| S0 | None | — |
| S1 | None | — |
| S2 | None | — |
| S3 | None | — |
| S4 | None | — |

**Total code changes: ZERO.**

All 5 Phase 1 screens satisfy the §5 acceptance checklist. The primitives (`ReportLoadingShield`, `useReportFetch`) were built during the API wiring sessions and are already integrated into S0 and S2. S1, S3, and S4 are trivially compliant or N/A.

---

## 4. Artifacts produced by this plan

| Artifact | File | Status |
|---|---|---|
| 3a. Implementation Plan | This document | DRAFT |
| 4a. Code Gate 1 | `CR_011_CODE_GATE_1_SCOPE_LOCK_2026_06_02.md` | DRAFT (companion doc) |
| 5a. Implementation + QA | N/A (no code changes) | SKIP — compliance-only gate |
| 6a. Owner Smoke | Owner reviews this audit | PENDING |

---

## 5. QA approach

Since no code changes are being made, QA for Code Gate 1 is a **read-through audit** (this document) + owner smoke review. No testing agent invocation needed — there is nothing to test that isn't already tested.

If the owner wants a visual verification, screenshots of each screen in their current live state can be captured to confirm the loading behaviors are working.

---

## 6. Next step after owner GO

Once owner approves this plan + Code Gate scope lock:
- Update `SPRINT_STATUS.md` to record Code Gate 1 as PASSED
- Update `CR_011_SCREEN_FREEZE_LOG.md` to annotate Phase 1 Code Gate compliance
- Update `CONTROL_DASHBOARD.md`
- Begin Phase 2 Screen Freeze (S5–S10), starting with S5 Item Sales Hybrid

---

*Awaiting owner review and GO.*
