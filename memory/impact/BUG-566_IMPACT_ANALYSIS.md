# Impact Analysis — BUG-566
## Last Status Filter Guard Not Firing — Dashboard Shows 0 Orders

**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Date:** 2026-10-16
**Agent:** E1
**Code Reality:** PARTIAL — handleStatusToggle guard exists but is incomplete
**Conflict Pre-Check:** BUG-565 (L433) — CLEAN, different lines. BUG-555 WP-C (lg→xl) — CLEAN, different code path. Both parallel-safe.

---

## 1. Summary

In the tablet filter dropdown (Channel view, <1024px), a user can deselect ALL visible status filters, leaving the dashboard showing **0 orders**. The guard `if (next.length === 0) return` at L244 does NOT prevent this.

**Root Cause (HIGH confidence):** The guard checks whether ALL items in `activeStatuses` (the full state array) would be empty — but `visibleStatusFilters` is a **subset** of all statuses, capped at 6 via `.slice(0, 6)` (L192) and optionally filtered by `enabledStatuses` (L191). If `activeStatuses` contains status IDs that are **not in `visibleStatusFilters`**, the user can remove every visible status via the dropdown without `next.length` ever hitting 0. The guard never fires, the last visible status is removed, and the dashboard renders 0 orders.

---

## 2. Data Flow Trace

```
DashboardPage
  └─ activeStatuses (prop, L40) — may contain ALL known status IDs
       └─ Header.jsx
            ├─ visibleStatusFilters (L190–192)
            │    = allStatusFilters
            │      .filter(by enabledStatuses, L191)   ← may reduce set
            │      .slice(0, 6)                         ← hard cap at 6
            │
            ├─ Tablet dropdown (L392–406)
            │    maps visibleStatusFilters → buttons
            │    each calls handleStatusToggle(status.id)
            │
            └─ handleStatusToggle (L241–249)
                 next = activeStatuses.filter(s => s !== statusId)
                 if (next.length === 0) return;   ← BREAK POINT
                 ↑ compares against FULL activeStatuses,
                   not just visibleStatusFilters
                 → if non-visible statuses exist in activeStatuses,
                   next.length is NEVER 0 → guard never fires
                 → setActiveStatuses(next) removes last visible filter
                 → dashboard renders 0 orders
```

**Break point:** L244 — guard compares `next.length` (all statuses) instead of `visibleNext.length` (visible statuses).

---

## 3. Scenario That Triggers the Bug

| Step | activeStatuses | visibleStatusFilters | Visible Active Count |
|---|---|---|---|
| Initial | [A, B, C, D, E, F, G, H] | [A, B, C, D, E, F] (slice 6) | 6 |
| Remove A | [B, C, D, E, F, G, H] | [A, B, C, D, E, F] | 5 |
| Remove B | [C, D, E, F, G, H] | [A, B, C, D, E, F] | 4 |
| Remove C | [D, E, F, G, H] | [A, B, C, D, E, F] | 3 |
| Remove D | [E, F, G, H] | [A, B, C, D, E, F] | 2 |
| Remove E | [F, G, H] | [A, B, C, D, E, F] | 1 |
| **Remove F** | **next=[G, H], length=2 → guard does NOT fire** | [A, B, C, D, E, F] | **0** |
| setActiveStatuses([G, H]) | [G, H] | — | **0 orders shown** |

G and H are active but not visible in the dropdown. Dashboard shows 0 orders. No way to recover without page reload.

---

## 4. Affected File

| File | Line | Current | Required change |
|---|---|---|---|
| `src/components/layout/Header.jsx` | **L241–249** | Guard checks `next.length === 0` | Add second guard: `visibleNext.length === 0` |

**Only 1 file, ~2 lines added.**

---

## 5. Proposed Fix (E-1)

```js
// CURRENT (L241–249):
const handleStatusToggle = (statusId) => {
  if (activeStatuses.includes(statusId)) {
    const next = activeStatuses.filter(s => s !== statusId);
    if (next.length === 0) return;
    setActiveStatuses(next);
  } else {
    setActiveStatuses([...activeStatuses, statusId]);
  }
};

// PROPOSED:
const handleStatusToggle = (statusId) => {
  if (activeStatuses.includes(statusId)) {
    const next = activeStatuses.filter(s => s !== statusId);
    if (next.length === 0) return;
    // BUG-566: guard if no VISIBLE filter would remain active
    const visibleNext = next.filter(s => visibleStatusFilters.some(f => f.id === s));
    if (visibleNext.length === 0) return;
    setActiveStatuses(next);
  } else {
    setActiveStatuses([...activeStatuses, statusId]);
  }
};
```

**Why `visibleStatusFilters` is accessible here:** `handleStatusToggle` is defined inside the component render function (not `useCallback`), so it closes over `visibleStatusFilters` which is also computed in the same render scope (L190–192). No additional hook or prop needed.

**Why keep the original guard:** `next.length === 0` is a safety net for the edge case where `activeStatuses` itself is sparse. Belt-and-suspenders approach.

---

## 6. Risk Classification

**Risk: MEDIUM**
- Trigger: component state + filter logic — non-financial validation
- Process: full intake → planning → implementation → QA
- Fast Lane: **NOT eligible** (state logic change; MEDIUM risk)

No financial, order, API, localStorage, socket, or auth change.

---

## 7. Impact on Pills Nav (Desktop)

`handleStatusToggle` is also called by the pills nav at L310. The fix improves correctness there too:
- On desktop (≥1024px), pills nav is visible; tablet dropdown is hidden
- Existing guard `next.length === 0` already works for desktop because `activeStatuses` and `visibleStatusFilters` are in sync (no hidden statuses in normal operation)
- The new `visibleNext` guard adds consistent protection at both breakpoints
- **No desktop regression risk**

---

## 8. Conflict Pre-Check

| Item | File | Lines | Status | Interaction |
|---|---|---|---|---|
| BUG-565 | `Header.jsx` | L433 | GATE_5A_IMPLEMENTED | Different line — **CLEAN** |
| BUG-555 WP-C | `Header.jsx` | C1–C11 (lg→xl breakpoints) | HELD | Different code path — **CLEAN** |
| CR-414 | `Header.jsx` | E-1a..E-1i | GATE_5A_IMPLEMENTED | Parent — this fix is within its QA scope |

Execution order: **BUG-566 → CR-414 QA re-test (V7 now PASS)**

---

## 9. Verification Matrix (seeds QA handover)

| # | Check | Viewport | Method | Expected |
|---|---|---|---|---|
| V7 | Last status filter cannot be deselected | 600×960 | Open dropdown, deselect all but last, click last | Last filter stays active; no deselection |
| V7b | Dashboard still shows orders after guard fires | 600×960 | After V7 guard fires, verify orders visible | Orders still shown — not 0 |
| V7c | Can still deselect down to 1 visible | 600×960 | Remove filters one by one; stop at 1 remaining | All removals above last work correctly |
| V7d | Desktop pill guard also works | 1280×800 | On pills nav, deselect all but last pill | Last pill stays active |
| V-reg | No other filter behavior changed | 600×960 | Add filter after guard fires; toggle normally | Filters add/remove normally |
| V-compile | Compile clean | — | webpack output | 1 pre-existing warning, 0 new |

---

## 10. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-566 → GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: prepend new Last Updated row
- [ ] FILE_OWNERSHIP.md: Header.jsx entry — append "BUG-566 IMPL 2026-10-16"
- [ ] Code marker: // BUG-566 adjacent to changed lines in handleStatusToggle
- [ ] Compile check: webpack 1 pre-existing warning, 0 new
```

---

## 11. Owner Decisions

**None.** The fix is unambiguous — the guard must check visible filters, not total filters. No business rule ambiguity.

---

## Artifacts
- IA: `/app/memory/impact/BUG-566_IMPACT_ANALYSIS.md` ← this file
- QA report (source): `/app/memory/test_reports/QA_REPORT_CR414_BUG537_2026_10_15.md`
- Evidence: QA V7 steps — deselect all visible → 0 orders shown
