# Impact Analysis — BUG-555 WP-C (Revalidated)
## Header Breakpoints: lg → xl (1024px → 1280px tablet threshold)

**Role:** PLANNING (Gate 2 — Impact Analysis)
**Date:** 2026-10-16
**Based on:** Original IA `impact/BUG-555_IMPACT_ANALYSIS.md` (Gate 2 CLOSED 2026-10-15)
**Code Reality:** NONE — WP-C not yet implemented. All 8 `lg:` sites and C9–C11 unchanged at HEAD.
**Conflict Pre-Check:** BUG-566 (+4 lines at L241–253) → all C1–C11 anchors shifted +4. BUG-565 (L437 content change: +min-w-0) → C4 anchor content stale. Both conflicts resolved in updated anchor table below.

---

## 1. What WP-C Does (plain English)

CR-414 set the dashboard header's tablet/desktop switch at **1024px** (`lg:`).
Every other tablet-aware component in the sprint uses **1280px** (`xl:`).
WP-C moves the header's switch from 1024px → 1280px to match the rest of the app.

Additionally (C9–C11): the Add button gets a 44×44px touch target on phones and hides its text label below 640px to save space.

---

## 2. Step 0 — Code Reality Check

```bash
grep -rn "BUG-555.*WP-C\|WP-C" /app/frontend/src/components/layout/Header.jsx
```
→ **0 matches** — WP-C not implemented. Proceed with full plan.

---

## 3. Step 1 — Conflict Pre-Check

| Item | File | Lines | Status | Interaction |
|---|---|---|---|---|
| **BUG-566** | `Header.jsx` | L241–253 (+4 lines) | GATE_5B_QA_CONDITIONAL_PASS | Shifts all WP-C anchors by +4 — **RESOLVED in anchor table §4** |
| **BUG-565** | `Header.jsx` | L437 (+min-w-0) | GATE_5B_QA_CONDITIONAL_PASS | C4 content changed — **RESOLVED in anchor table §4** |
| **CR-414** | `Header.jsx` | C1–C8 are the CR-414 `lg:` lines | GATE_5B_QA_CONDITIONAL_PASS | WP-C changes exactly these lines. CR-414 QA is code-verified PASS — execution safe. Owner may proceed or wait for full browser QA. |
| **BUG-555 WP-A/B/D** | Other files | Not Header.jsx | GATE_5B_QA_PASSED | **CLEAN — no overlap** |

---

## 4. Updated Anchor Table — All 11 Edits (verified at HEAD 2026-10-16)

**Shift note:** Plan was written at HEAD 2026-10-15. BUG-566 later added 4 lines (L245–248) inside handleStatusToggle. All anchors below L244 shifted +4. BUG-565 modified C4 content. The table below reflects **current HEAD** (Header.jsx = 800 lines).

| # | Line (HEAD) | Current className / content | New className / content |
|---|---|---|---|
| **C1** | **275** | `hidden lg:flex items-center gap-1 ml-4` | `hidden xl:flex items-center gap-1 ml-4` |
| **C2** | **343** | `relative lg:hidden ml-2` | `relative xl:hidden ml-2` |
| **C3** | **432** | `hidden lg:flex items-center pl-3 ml-1 border-l` | `hidden xl:flex items-center pl-3 ml-1 border-l` |
| **C4** | **437** | `flex-1 min-w-0 flex justify-end px-2 lg:px-4` ← BUG-565 added min-w-0 | `flex-1 min-w-0 flex justify-end px-2 xl:px-4` |
| **C5** | **442** | `hidden lg:flex items-center mr-3` | `hidden xl:flex items-center mr-3` |
| **C6** | **445** | `relative flex-1 lg:flex-initial min-w-0` | `relative flex-1 xl:flex-initial min-w-0` |
| **C7** | **449** | `isSearchFocused ? "lg:w-64" : "lg:w-48"` | `isSearchFocused ? "xl:w-64" : "xl:w-48"` |
| **C8** | **487** | `right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 mt-1 w-80 lg:w-96` | `right-0 xl:right-auto xl:left-1/2 xl:-translate-x-1/2 mt-1 w-80 xl:w-96` |
| **C9** | **769** | `<div className="flex items-center gap-3">` | `<div className="flex items-center gap-3 flex-shrink-0"> {/* BUG-555 */}` |
| **C10** | **774** | `className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"` | `className="flex items-center justify-center gap-1.5 px-3 py-2.5 max-sm:min-w-[44px] max-sm:min-h-[44px] rounded-lg transition-colors hover:opacity-80"` + `aria-label="Add"` |
| **C11** | **779** | `<span className="text-sm font-medium">Add</span>` | `<span className="hidden sm:inline text-sm font-medium">Add</span>` |
| **comment** | **341–342** | `Visible <1024px only (OD-537-02, OD-414-01=A, OD-414-05=A).` | `Visible <1280px only (OD-537-02, OD-414-01=A, OD-414-05=A, BUG-555 OD-555-10).` |

**Total: 1 file, 12 targeted edits (11 + 1 comment). No new functions, states, imports, or components.**

---

## 5. What Each Change Does at Runtime

### C1–C8: Moving the switch from 1024px → 1280px

At 1025–1279px (tablet zone that was mismatched):

| Visible BEFORE (was desktop) | Visible AFTER (now tablet) |
|---|---|
| Full filter pills nav | Hidden → tablet dropdown button shown |
| Platform dropdown | Hidden |
| PlatformCounterChip | Hidden |
| Search: fixed w-48/w-64 | Search: fluid flex-1 (fills row) |
| Search results: centred, 96px wide | Search results: right-anchored, 80px wide |
| Search padding: px-4 | Search padding: px-2 |

At ≥1280px: **zero change** — all desktop classes still apply.
At <1024px: **zero change** — already tablet mode; `xl:` doesn't fire here either.

### C9–C11: Add button improvements

| | Before | After |
|---|---|---|
| Add group | can be squeezed | `flex-shrink-0` — never squashed |
| Add at <640px (phone) | shows "+ Add" text | icon only (44×44 touch target) |
| Add at ≥640px | shows "+ Add" text | unchanged |
| Add at desktop | 40px height (OD-555-17 locked) | `max-sm:` scoping preserves 40px height |

---

## 6. Data Flow Trace

```
DashboardPage.jsx
  └─ <Header ... />  (src/components/layout/Header.jsx)
       C1: nav pills — hidden xl:flex (was lg:flex)
       C2: tablet dropdown — xl:hidden (was lg:hidden)
       C3: PlatformDropdown — hidden xl:flex (was lg:flex)
       C4: center section — xl:px-4 (was lg:px-4) — min-w-0 preserved from BUG-565
       C5: PlatformCounterChip — hidden xl:flex (was lg:flex)
       C6: search — xl:flex-initial (was lg:flex-initial)
       C7: search box width — xl:w-64/xl:w-48 (was lg:)
       C8: search dropdown — xl:right-auto etc (was lg:)
       C9: Add group — + flex-shrink-0
       C10: Add button — max-sm touch target + aria-label
       C11: Add span — hidden sm:inline
```

No prop, state, hook, API, localStorage, or financial logic change.
DashboardPage.jsx: **no changes needed.**

---

## 7. Risk Classification

**Risk: MEDIUM**
- Pure CSS breakpoint and utility class changes
- No JS, state, API, localStorage, or auth change
- Header.jsx is NOT in the R5 hotspot list
- Not financial, not printing, not auth
- Affects header layout at 1025–1279px — all other widths unchanged

**Fast Lane:** NOT eligible — 12 edits (>10 lines). Full Gate 4 owner GO required.

---

## 8. Downstream Consumers

Only `DashboardPage.jsx` renders `<Header />`. This change is CSS-only — no prop, ref, or hook changes. **DashboardPage.jsx requires no changes.**

---

## 9. Regression Risk

| Scenario | Risk | Mitigation |
|---|---|---|
| Desktop (≥1280px) regressions | NONE | `xl:` classes only fire at ≥1280. At ≥1280 → desktop mode (same as before at ≥1024) |
| <1024px tablet regressions | NONE | `xl:` doesn't fire below 1280. Tablet already works at <1024px |
| 1025–1279px now shows tablet UI | INTENDED | This is the fix — the mismatched zone now shows correct tablet mode |
| C9 flex-shrink-0 side effects | NONE | Add group was already last in header — shrink prevention has no visual effect unless header overflows |
| C10 max-sm: phone touch target | LOW | Only fires below 640px. At ≥640px Add button is pixel-identical to today |
| C11 hidden sm:inline text | LOW | Only hides text below 640px. At ≥640px label is identical |

---

## 10. Verification Matrix (seeds QA handover)

| # | Edit | Viewport | Check | Method |
|---|---|---|---|---|
| V1 | C1–C8 | 1100×800 | Pills hidden, tablet dropdown visible | DOM: `hidden` on nav, `tablet-filter-dropdown-btn` visible |
| V2 | C1–C8 | 1280×800 | Pills visible, tablet dropdown hidden | DOM: `lg:flex` → `xl:flex` fires at 1280 |
| V3 | C1–C8 | 960×600 | Tablet dropdown visible (was already, unchanged) | Regression: still works |
| V4 | C9–C11 | 400×800 (phone) | Add shows icon only, 44×44px | `getBoundingClientRect()` on `add-table-btn` |
| V5 | C9–C11 | 640×800 | Add shows "+ Add" text | `<span>` not hidden |
| V6 | C9–C11 | 1280×800 | Add button 40px height (OD-555-17) | Height check — `max-sm:` doesn't fire |
| V7 | C4 | 1100×800 | Center section still has min-w-0 | BUG-565 regression check |
| V8 | comment | — | No `<1024px` comment in Header.jsx | `grep "<1024px" Header.jsx` = 0 |

---

## 11. Owner Decisions

**None.** All ODs were locked in the original Gate 2 (2026-10-15). The anchor corrections in §4 are internal planning updates — no new business decisions.

**Gate 4 phrasing:** `"BUG-555 WP-C Gate 4 GO"` → proceed to implementation.

---

## Artifacts
- This IA: `/app/memory/impact/BUG-555_WPC_IMPACT_ANALYSIS_2026_10_16.md`
- Original IA: `impact/BUG-555_IMPACT_ANALYSIS.md` (Gate 2 CLOSED, §WP-C section)
- Plan (still valid at Gate 3 level, line numbers stale — use §4 above): `plans/BUG-555_IMPLEMENTATION_PLAN.md §5`
