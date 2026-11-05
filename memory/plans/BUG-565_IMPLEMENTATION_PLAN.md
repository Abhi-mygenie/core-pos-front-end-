# Implementation Plan — BUG-565
## Header Overflow 44px at 600×960 — Add Button Off-Screen

**Role:** PLANNING (Gate 3 — Implementation Plan)
**Date:** 2026-10-16
**Agent:** E1
**Based on:** `impact/BUG-565_IMPACT_ANALYSIS.md`
**Code Reality:** PARTIAL (CR-414 code exists; 1-line omission to fix)
**Conflict:** BUG-555 WP-C on same file — BUG-565 lands FIRST, WP-C after CR-414 QA passes

---

## Scope Lock

**Files WILL change:**
- `src/components/layout/Header.jsx` (L433 — 1 line)

**Files WILL NOT touch:**
- `DashboardPage.jsx`
- `OrderEntry.jsx`
- `Sidebar.jsx`
- Any report page
- Any transform, service, context, or API file

---

## Step 0 — Entry Verification (agent must run before coding)

```
Open Header.jsx and confirm L433 reads exactly:
  <div className="flex-1 flex justify-end px-2 lg:px-4"> {/* CR-414: tighter padding <1024px */}

If it does NOT match → STOP. IA is stale. Return to Planning.
If it matches → proceed.
```

Current confirmed state (2026-10-16): ✅ MATCHES

---

## Edit E-1 — Add `min-w-0` to center section wrapper

| Field | Value |
|---|---|
| **File** | `src/components/layout/Header.jsx` |
| **Line** | **433** |
| **Type** | CSS className string edit |
| **Risk** | LOW |

**Current (L433):**
```jsx
<div className="flex-1 flex justify-end px-2 lg:px-4"> {/* CR-414: tighter padding <1024px */}
```

**Replace with:**
```jsx
<div className="flex-1 min-w-0 flex justify-end px-2 lg:px-4"> {/* CR-414: tighter padding <1024px */ /* BUG-565 */}
```

**What changes:** `min-w-0` added between `flex-1` and `flex`.
**What does NOT change:** Every other class, the comment, all child elements, all JS/state.

**Why this works:** `min-w-0` sets `min-width: 0` on the flex item, overriding the browser's default `min-width: auto`. This allows the center section to shrink as far as needed so left + center + right all fit within 544px at 600×960.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Desktop layout regresses | Very Low | — | `min-w-0` has zero effect when `flex-1` has room to grow; desktop has ≥400px for center section |
| Search box becomes too narrow | Very Low | — | Center section still gets ~197px on 600px tablet — sufficient for search input |
| BUG-555 WP-C conflict | None | — | WP-C changes `lg:` → `xl:` breakpoints on 8 other sites; does NOT touch L433 |

---

## Execution Sequence

```
1. VIEW Header.jsx L433 — confirm anchor
2. SEARCH_REPLACE — apply E-1
3. CHECK webpack compiles (0 new warnings)
4. WRITE code marker // BUG-565 (already in E-1 above)
5. EXIT GATE (5 checkboxes)
6. WRITE QA handover
```

**Total edits:** 1
**Total files:** 1
**Estimated time:** < 5 minutes

---

## Fast Lane Summary (for owner approval)

```
FAST LANE SUMMARY
ID: BUG-565
Risk: LOW
Owner approval: PENDING — reply "BUG-565 Fast Lane GO"
File changed: src/components/layout/Header.jsx
Lines changed: 1 (L433)
Self-test: pending
Registry/file ownership/code marker: to be synced after implementation
Next: QA re-test V1 (overflow check at 600×960)
```

---

## Verification Matrix (Gate 4 → seeds QA handover)

| # | Edit | File | Verification | Method | Automated? |
|---|---|---|---|---|---|
| V1 | E-1 | Header.jsx:433 | `scrollWidth ≤ clientWidth` at 600×960 | Browser DevTools: `document.querySelector('[data-testid="pos-header"]').scrollWidth` | NO (browser) |
| V2 | E-1 | Header.jsx:433 | Add button fully visible | `document.querySelector('[data-testid="add-table-btn"]').getBoundingClientRect().right ≤ 600` | NO (browser) |
| V3 | E-1 | Header.jsx:433 | Search box usable at 600×960 | Type in search — no layout break | NO (browser) |
| V4 | E-1 | Header.jsx:433 | Desktop pixel-identical at 1280×800 | Visual — no layout change | NO (browser) |
| V5 | E-1 | Header.jsx:433 | 768×1024 still no overflow | `scrollWidth ≤ clientWidth` | NO (browser) |
| V6 | — | — | Compile: 0 new warnings | `webpack compiled with 1 warning` (pre-existing only) | YES (CLI) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-565 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: prepend new "Last Updated" row — BUG-565 GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: Header.jsx entry — append "BUG-565 IMPL 2026-10-16"
- [ ] Code marker: // BUG-565 in the changed line (already included in E-1)
- [ ] Compile check: webpack 1 pre-existing warning, 0 new
```
