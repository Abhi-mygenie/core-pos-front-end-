# BUG-537 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** BUG-537 — Dashboard layout broken on Android tablets (parent of CR-414)
**Risk:** HIGH
**Sprint:** oct_cr_batch

---

## Header

**Code Reality:** FULL — 0 responsive breakpoints in Header.jsx (confirmed), pixel-fixed grid in ChannelColumn.jsx, no stacking in ChannelColumnsLayout.jsx.
**Conflict Pre-Check:** CLEAN — only BUG-537 + CR-414 (companion CR, same files) touch these 3 files. No other open item.
**ODs locked:** OD-537-01 / OD-537-02 / OD-537-03 all locked.
**Open ODs (needed for Gate 3):** OD-414-01 (dropdown direction) · OD-414-02 (tablet localStorage persist).
**Gate 2 Status:** COMPLETE — 2 open ODs needed before Gate 3.

---

## 1. Data Flow Trace

```
DashboardPage.jsx (R5 — NOT touched)
  │
  ├── <Header
  │     activeChannels setActiveChannels
  │     webCount posCount
  │     onAddOrder ... >
  │   → src/components/layout/Header.jsx
  │         L240: <div className="flex items-center">  ← BREAK A
  │               (1 non-wrapping row, 0 breakpoints confirmed)
  │               Left:   Logo + filter pills (L254 nav)
  │               Center: PlatformDropdown (L326) + Counter (L336) + Search (L331)
  │               Right:  Add button (L663) — pushed off-screen at 600px
  │
  └── <ChannelColumnsLayout channels viewType ... >
      → src/components/dashboard/ChannelColumnsLayout.jsx
            L248: className="flex h-full gap-0 overflow-x-auto"  ← BREAK B
                  (always flex-row, channels always side-by-side)
            │
            └── <ChannelColumn channel actualColumns maxColumns ... >
                → src/components/dashboard/ChannelColumn.jsx
                      L197: className="... flex-shrink-0"
                      L199: style={{ width: `${columnWidth}px` }}     ← BREAK C
                      L200: style={{ minWidth: `${columnWidth}px` }}  ← BREAK C
                      L284: `repeat(${actualColumns}, 160px)`          ← BREAK D
                      (pixel-fixed, never minmax/fr, no breakpoints)
```

**BREAK POINTS:**
- **A** — Header: single `flex items-center` row, 0 breakpoints → at 600px, right cluster (Web/POS counter + Search + Add) is pushed 408px off-screen (header scrollWidth = 1008px, viewport = 600px).
- **B** — ChannelColumnsLayout: always `flex` (row), never stacks channels vertically → on tablet each channel takes its pixel width side-by-side.
- **C** — ChannelColumn: `flex-shrink-0` + `width: 344px` inline style → column never adapts to available width on tablet.
- **D** — ChannelColumn L284: `repeat(${actualColumns}, 160px)` grid — pixel-fixed, no fluid width → doesn't fill available space on tablet.

---

## 2. Code Reality — Exact Lines Confirmed at HEAD

### Header.jsx (694 lines, 0 breakpoints)

| Line | Current code | Problem |
|------|-------------|---------|
| L240 | `<div className="flex items-center">` | Single non-wrapping row — no `flex-wrap`, no breakpoints |
| L254 | `<nav className="flex items-center gap-1 ml-4">` | Filter pills — always shown, takes ~300px, no `hidden md:flex` |
| L326 | `<div className="flex items-center pl-3 ml-1 border-l">` | Platform dropdown — always shown |
| L336 | `<div className="flex items-center mr-3">` | PlatformCounterChip (Web N · POS M) — always shown, ~80px |
| L663 | `<div className="flex items-center gap-3">` | Add button — rightmost, first to overflow |

**Confirmed:** `grep -c "sm:\|md:\|lg:\|flex-wrap\|useWindowSize" Header.jsx = 0`

---

### ChannelColumnsLayout.jsx (260 lines)

| Line | Current code | Problem |
|------|-------------|---------|
| L248 | `className="flex h-full gap-0 overflow-x-auto"` | `flex` = row direction. Channels always side-by-side. No `flex-col` on tablet. |

---

### ChannelColumn.jsx (361 lines)

| Line | Current code | Problem |
|------|-------------|---------|
| L197 | `className="... flex-shrink-0"` | Never shrinks — always takes full pixel width |
| L199 | `style={{ width: \`${columnWidth}px\` }}` | Pixel-fixed: 344px (2 cols) or 512px (3 cols) — never adapts |
| L200 | `style={{ minWidth: \`${columnWidth}px\` }}` | Same — enforces minimum at pixel value |
| L284 | `` `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` `` | 160px fixed — never `minmax`, never `fr` units |

---

## 3. Required Changes per Locked OD

### OD-537-02 → Header.jsx changes

**Goal: single row fits in 600px: `[Logo] [≡ Channels ▼] [Search flex-1] [+ Add]`**

| Edit | Line(s) | Change | Guard |
|------|---------|--------|-------|
| H1 | L254 nav | Add `hidden md:flex` — hide filter pills on tablet | `md:flex` shows pills on desktop only |
| H2 | L336 div | Add `hidden md:flex` — hide PlatformCounterChip on tablet | Frees ~80px |
| H3 | NEW | Add `<ChannelTabletDropdown>` sub-component before search, guarded `md:hidden` | Shows on tablet only: compact `[≡ Channels ▼]` multiselect (all selected default, same toggle behaviour as current pills). Uses existing `activeChannels` / `setActiveChannels` props. |
| H4 | L326 div | Add `hidden md:flex` — hide PlatformDropdown on tablet (optional — confirm at Gate 3 based on OD-414-01) | Frees ~80px |

**`ChannelTabletDropdown` sub-component (new — inline in Header.jsx or separate file):**
- Button: `[≡ Channels ▼]` pill showing count of active channels
- Dropdown (OD-414-01 = downward overlay recommended): checklist of all 4 channels
- Each row: checkbox + channel name + icon
- All selected by default (mirrors existing behaviour)
- Toggle click: same `handleChannelToggle` contract as current pills
- Guarded: `md:hidden` so only renders on tablet

---

### OD-537-03 → ChannelColumnsLayout.jsx changes

**Goal: channels stack vertically on tablet; side-by-side on desktop**

| Edit | Line | Change |
|------|------|--------|
| CL1 | L248 | `"flex h-full gap-0 overflow-x-auto"` → `"flex flex-col md:flex-row h-full gap-0 overflow-x-auto"` |

*Simple className addition — channels stack when < `md` (768px), side-by-side at `md`+.*

---

### OD-537-03 → ChannelColumn.jsx changes

**Goal: cards fill row fluidly at tablet; 160px fixed at desktop**

| Edit | Line(s) | Change |
|------|---------|--------|
| CC1 | L197–200 | Add `isTablet` detection (via `useWindowWidth` hook or resize listener). On tablet: remove inline `width/minWidth` px (let channel take `100%` of stacked row). On desktop: keep pixel values. |
| CC2 | L284 | Conditional: tablet → `` `repeat(auto-fill, minmax(140px, 1fr))` ``, desktop → `` `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` `` |

**`useWindowWidth` approach (recommended):**
```javascript
const windowWidth = useWindowWidth(); // custom hook: useState(window.innerWidth) + resize listener
const isTablet = windowWidth < 768;
// then conditional inline styles + conditional gridTemplateColumns
```

*No CSS file changes needed — stays within existing inline-style + hook pattern.*

---

## 4. New Component Required

**`ChannelTabletDropdown` (inline sub-component or new file):**
- Input props: `activeChannels`, `setActiveChannels`, `visibleChannels`
- Uses existing `handleChannelToggle` logic from Header.jsx
- ~40-60 lines
- Needs `useState` for dropdown open/close
- OD-414-01 decides direction (downward overlay = A, inline = B)

---

## 5. Conflict Pre-Check

| Item | Status | Files | Overlap |
|------|--------|-------|---------|
| **CR-414** | GATE_1_INTAKE | Same 3 files | **COMPANION CR** — CR-414 is the implementation CR for BUG-537. Gate 3 plan will serve both. No conflict. |
| BUG-245 | CLOSED | ChannelColumn.jsx (sort logic) | Closed — no conflict |
| All others | CLOSED/QA_PASS | — | Clean |

**Last modifier of target files:**
- `Header.jsx`: no recent FILE_OWNERSHIP entry → original creation, clean
- `ChannelColumn.jsx`: BUG-245 (sort logic L160-179) — closed, different region
- `ChannelColumnsLayout.jsx`: no recent FILE_OWNERSHIP entry — clean

---

## 6. DashboardPage.jsx (R5) — Impact Assessment

**Must NOT be touched. Confirmed impact is zero code change:**

| DashboardPage usage | After fix | Risk |
|-------------------|-----------|------|
| `<Header activeChannels setActiveChannels webCount posCount ...>` | All existing props unchanged — no new props needed | None |
| `<ChannelColumnsLayout channels viewType ...>` | No new props — `flex-col` is internal CSS | None |
| `<ChannelColumn>` rendered inside ChannelColumnsLayout | ChannelColumnsLayout is the parent — DashboardPage unaffected | None |

---

## 7. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **HIGH** |
| Trigger | 3 files, new sub-component, grid behavior change, DashboardPage (R5) renders all 3 |
| R5 direct? | NO — DashboardPage.jsx NOT modified |
| R5 indirect? | YES — Header + ChannelColumnsLayout both rendered by R5 DashboardPage |
| R6 financial? | NO |
| Planning-skip | NOT eligible (HIGH risk, 3+ files, new component) |
| Desktop regression risk | HIGH — must verify `repeat(N, 160px)` unchanged at 1280px |
| Files WILL change | `Header.jsx` · `ChannelColumn.jsx` · `ChannelColumnsLayout.jsx` |
| Files WILL NOT touch | `DashboardPage.jsx` (R5) · `OrderEntry.jsx` (R5) · any transform/service |

---

## 8. Open Owner Decisions (needed before Gate 3)

| OD | Item | Question | Agent rec |
|----|------|---------|-----------|
| **OD-414-01** | CR-414 | Channel dropdown on tablet — **(A) downward overlay** below header bar OR **(B) inline dropdown** within header row | **A** — more tap-friendly on tablet |
| **OD-414-02** | CR-414 | `< >` column-count arrows on tablet — **(A) persist to localStorage** (same as desktop) OR **(B) tablet always uses auto-fill only** (localStorage ignored on tablet) | **A** — consistent behaviour |

---

## 9. Verification Matrix (seeds Gate 3)

| # | What to verify | How |
|---|---|---|
| V-1 | Desktop 1280px — layout completely unchanged | Screenshot 1280px: channels side-by-side, pills visible, 160px cards |
| V-2 | Tablet 600px portrait — header single row, no overflow | Screenshot 600px: `[Logo][≡ Channels ▼][Search][+ Add]` all visible |
| V-3 | Web/POS counters hidden on tablet | `hidden md:flex` class on container |
| V-4 | Channel dropdown opens all 4 channels with checkboxes | Tap `≡ Channels ▼` on tablet |
| V-5 | Channels stack vertically on tablet | Screenshot 600px: Dine-In above TakeAway above Delivery |
| V-6 | Cards auto-fill row at 600px (minmax 140px 1fr) | Cards fill available width |
| V-7 | `< >` arrows still work on tablet | Tap `>` on Dine-In → more cards per row |
| V-8 | Desktop channels side-by-side (flex-row, md breakpoint) | Screenshot 1280px: horizontal layout intact |
| V-9 | Tablet 768px — layout intact | Screenshot 768px |

---

## 10. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-537 + CR-414 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: rows updated
- [ ] FILE_OWNERSHIP.md: all 3 files + ChannelTabletDropdown (if new file) added
- [ ] Code markers: // BUG-537 / // CR-414 on every modified section
- [ ] yarn build: exit 0, 0 new warnings
- [ ] Regression check: desktop 1280px layout confirmed unchanged
```

---

## 11. Summary

- **Root cause confirmed:** Header.jsx has 0 responsive breakpoints; ChannelColumn.jsx uses pixel-fixed widths/grid; ChannelColumnsLayout.jsx never stacks channels vertically.
- **Fix scope:** 3 files + 1 new sub-component (`ChannelTabletDropdown`). Desktop untouched.
- **DashboardPage.jsx (R5): NOT touched.** All changes are internal to the 3 component files.
- **2 ODs need owner answer before Gate 3:** OD-414-01 (dropdown direction) + OD-414-02 (tablet localStorage).
- **Planning-skip:** NOT eligible.
- **CR-414 note:** CR-414 is the companion implementation CR. The Gate 3 Implementation Plan will serve both BUG-537 + CR-414.

**Next:** Owner answers OD-414-01 + OD-414-02 → "Gate 3 GO" → Implementation Plan.
