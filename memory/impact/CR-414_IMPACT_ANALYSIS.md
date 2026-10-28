# BUG-537 + CR-414 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Items:** BUG-537 (problem report) + CR-414 (implementation — Dashboard Tablet Responsive Redesign)
**Risk:** HIGH
**Sprint:** oct_cr_batch
**Intake docs:** `change_requests/BUG-537_DASHBOARD_LAYOUT_BROKEN_ANDROID_TABLETS_INTAKE.md` · `change_requests/CR-414_DASHBOARD_TABLET_RESPONSIVE_REDESIGN_INTAKE.md`
**Evidence:** `evidence/BUG-537/INV-TABLET-001_INVESTIGATION_REPORT.md` · `evidence/BUG-537/INV-TABLET-001_layout_metrics.json`

---

## Header

**Code Reality:** FULL — all three broken patterns confirmed at HEAD (grep + sed verified 2026-10-12).
**Conflict Pre-Check:** CLEAN — no other open item touches `Header.jsx`, `ChannelColumn.jsx`, or `ChannelColumnsLayout.jsx`.
**Open Owner Decisions:** **OD-414-01** (dropdown position) and **OD-414-02** (localStorage on tablet) are open. Both must be answered before Gate 3.
**Gate 2 Status:** COMPLETE. Gate 3 blocked on OD-414-01 + OD-414-02.

---

## 1. Problem Summary (BUG-537)

The POS Dashboard was built for desktop (1000px+) with no viewport awareness. On Android tablets at 600–960px:

| Symptom | Root cause |
|---------|-----------|
| Header overflows — Search + Add button pushed off-screen | `Header.jsx`: single non-wrapping `flex` row, zero responsive breakpoints |
| Channel grid uses fixed 160px card widths regardless of viewport | `ChannelColumn.jsx` L284: inline style `repeat(${actualColumns}, 160px)` — pixel-fixed |
| Channel columns always render side-by-side even on narrow screens | `ChannelColumnsLayout.jsx`: main container `flex h-full gap-0` with no flex-direction breakpoint |

**Measured overflow at HEAD (from INV-TABLET-001):**

| Viewport | Header scroll width | Status |
|----------|-------------------|--------|
| 600px portrait | 1,008px (1.68× viewport) | Add button unreachable |
| 768px portrait | 1,008px (1.26× viewport) | Add button partially cut |
| 960px landscape | 1,008px (1.05× viewport) | Marginally off |
| 1,280px desktop | 1,008px (0.79× viewport) | ✓ No overflow |

---

## 2. Design Decisions — All Locked (OD-537-01/02/03)

| Decision | Choice | What it means |
|----------|--------|--------------|
| OD-537-01 | Support **both** 600px + 768px | Two breakpoints: `sm` (640px) and `md` (768px) |
| OD-537-02 | **Single-row header on tablet** | Remove Web/POS counters + collapse channel pills into compact multiselect dropdown |
| OD-537-03 | **Channels stack vertically <768px** · Auto card count · Desktop unchanged | `flex-col` below `md:`, `minmax(140px,1fr)` grid on tablet, 160px fixed on desktop |

---

## 3. Code Reality — Exact Patterns at HEAD

### File A — `Header.jsx` (693 lines)

**Web/POS counter chip (L337):**
```jsx
<PlatformCounterChip webCount={webCount} posCount={posCount} />
```
Currently always rendered. OD-537-02: hide on tablet (`hidden md:flex` or `md:block`).

**Channel / Status filter pills nav:**
```jsx
<nav className="flex items-center gap-1 ml-4">
  {dashboardView === 'status'
    ? visibleChannelFilters.map(…)   // channel pills
    : visibleStatusFilters.map(…)    // status pills
  }
</nav>
```
No `sm:`/`md:` guards. OD-537-02: hide on tablet, show new compact dropdown instead.

**Main flex wrapper:**
```jsx
<header data-testid="pos-header" className="px-3 py-2" …>
  <div className="flex items-center">   ← zero flex-wrap, zero breakpoints
    {/* Left: Logo + pills */}
    {/* Right: search + counter + Add */}
  </div>
</header>
```

**Confirmed:** `grep -c "sm:\|md:\|flex-wrap" Header.jsx → 0`

---

### File B — `ChannelColumn.jsx`

**Grid declaration (L283–285):**
```jsx
style={{
  gridTemplateColumns: viewType === 'table'
    ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)`   // L284 — 160px pixel-fixed
    : `repeat(${actualColumns}, 1fr)`,
}}
```
`TABLE_CARD_WIDTH = 160` (L9). Inline style — cannot be overridden by Tailwind breakpoints.
OD-537-03: on tablet, use `repeat(auto-fill, minmax(140px, 1fr))` instead.
**Mechanism:** Since this is an inline style, viewport detection needs a runtime check (e.g. `window.innerWidth < 768` or a `useWindowSize` / `matchMedia` hook passed down as prop or computed locally).

---

### File C — `ChannelColumnsLayout.jsx`

**Main return container (last ~15 lines, confirmed):**
```jsx
return (
  <div
    ref={containerRef}
    data-testid="channel-columns-layout"
    className="flex h-full gap-0 overflow-x-auto"
    style={{ minHeight: '500px', backgroundColor: COLORS.sectionBg }}
  >
    {renderColumns()}
  </div>
);
```
`flex` = `flex-row` by default → channels render side-by-side.
OD-537-03: on tablet, channels must stack vertically → add `flex-col md:flex-row` to className.

---

## 4. Fix Design

### E-CR414-1 — `Header.jsx`: tablet-safe single-row layout

Three changes inside `Header.jsx`:

**1a — Hide Web/POS counter on tablet:**
```jsx
// Current:
<PlatformCounterChip webCount={webCount} posCount={posCount} />

// After:
<span className="hidden md:inline-flex">
  <PlatformCounterChip webCount={webCount} posCount={posCount} />
</span>
```

**1b — Hide existing channel/status pills on tablet:**
```jsx
// Current:
<nav className="flex items-center gap-1 ml-4">

// After:
<nav className="hidden md:flex items-center gap-1 ml-4">
```

**1c — Add tablet channel multiselect dropdown (new sub-component or inline, shown on tablet only):**
```jsx
{/* Tablet only — compact channel multiselect dropdown (OD-537-02) */}
<div className="md:hidden ml-2">
  <TabletChannelDropdown
    visibleChannels={visibleChannels}
    activeChannels={activeChannels}
    onToggle={handleChannelToggle}
  />
</div>
```

`TabletChannelDropdown`: a new small component (inline in Header.jsx or separate file) — a button showing "≡ Channels ▼" with a popover/dropdown listing channels as checkboxes. All selected by default (driven by existing `activeChannels` state). Same `handleChannelToggle` used by existing pills. Position per **OD-414-01** (open, see §6).

**Scope:** ~20–30 lines added to `Header.jsx` (1b replaces class, 1c inserts new JSX block). No new imports unless dropdown is extracted to its own file.

---

### E-CR414-2 — `ChannelColumn.jsx`: responsive grid

Since the grid uses inline style (not Tailwind), viewport must be detected at runtime.

**Approach:** Add a local `isTablet` boolean derived from `window.innerWidth` with a resize listener (or accept it as a prop from `ChannelColumnsLayout`). The prop approach is cleaner — parent already knows the viewport and can pass it down.

**At `ChannelColumnsLayout.jsx` (E-CR414-3a, see below):** Compute `isTablet` once, pass to each `<ChannelColumn>`.

**At `ChannelColumn.jsx` (E-CR414-2):**
```jsx
// Prop addition:
isTablet = false,

// Grid inline style change (L283-285):
gridTemplateColumns: isTablet
  ? 'repeat(auto-fill, minmax(140px, 1fr))'   // ← tablet: fluid
  : viewType === 'table'
    ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)`  // ← desktop: pixel-fixed unchanged
    : `repeat(${actualColumns}, 1fr)`,
```

**Scope:** ~5 lines changed in `ChannelColumn.jsx`.

---

### E-CR414-3 — `ChannelColumnsLayout.jsx`: vertical stacking + isTablet propagation

**3a — Compute `isTablet` + pass to `ChannelColumn`:**
```jsx
// Near the top of the component, add:
const [isTablet, setIsTablet] = useState(() => window.innerWidth < 768);

useEffect(() => {
  const handler = () => setIsTablet(window.innerWidth < 768);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

Pass `isTablet` to each `<ChannelColumn>` in `renderColumns()`:
```jsx
<ChannelColumn
  ...existing props...
  isTablet={isTablet}        // CR-414
/>
```

**3b — Flex direction for vertical stacking:**
```jsx
// Current className:
className="flex h-full gap-0 overflow-x-auto"

// After (add flex-col md:flex-row):
className="flex flex-col md:flex-row h-full gap-0 overflow-x-auto md:overflow-x-auto overflow-y-auto"
```

**Scope:** ~10 lines added/changed in `ChannelColumnsLayout.jsx`.

**`< >` arrows and localStorage (per OD-414-02, open, see §6):** Current `maxColumns` state from localStorage drives `actualColumns` in `ChannelColumn`. On tablet with `isTablet=true`, the fluid grid ignores `actualColumns` — arrows may visually increment the column number but the grid won't render them as fixed-width columns. OD-414-02 decides whether to suppress `< >` on tablet or keep them as a hint for when the user switches to desktop.

---

## 5. Conflict Pre-Check

| Item | Status | Files | Assessment |
|------|--------|-------|-----------|
| `DashboardPage.jsx` (R5) | NOT touched | Imports Header + ChannelColumnsLayout | OK — no DashboardPage edits; only the components it imports change |
| Any other open item | NONE | Header/ChannelColumn/ChannelColumnsLayout | Clean — no registry items open on these files |

---

## 6. Open Owner Decisions — MUST resolve before Gate 3

### OD-414-01 — Tablet channel dropdown position

When the user taps "≡ Channels ▼" on a tablet, where does the dropdown open?

| Option | Description | Recommendation |
|--------|-------------|---------------|
| **(A) Downward overlay** | Dropdown panel opens below the header bar, overlaying the order grid | **AGENT REC — A.** More tap-friendly on tablet; standard mobile dropdown UX; does not compress the header row |
| **(B) Inline within header row** | Dropdown expands inline, pushing content down | Not recommended — complicates single-row constraint |

**→ Owner must choose A or B before Gate 3.**

---

### OD-414-02 — `< >` column-count arrows on tablet

The `< >` arrows increment/decrement `maxColumns[channelId]` which is saved to localStorage. On tablet with a fluid grid, the column count no longer has the same meaning. Should the saved value be respected on tablet?

| Option | Description | Recommendation |
|--------|-------------|---------------|
| **(A) Persist — YES** | `maxColumns` from localStorage still drives `actualColumns`; arrows still work on tablet as a hint | **AGENT REC — A.** Consistent cross-device UX; when user rotates to landscape, the saved count applies naturally |
| **(B) Tablet auto-only** | On tablet, always use `minmax(140px,1fr)` auto-fill ignoring `maxColumns`; arrows hidden via `isTablet && md:hidden` | Simpler but removes user control |

**→ Owner must choose A or B before Gate 3.**

---

## 7. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **HIGH** |
| R5 hotspots directly changed | NO — `DashboardPage.jsx` is NOT changed; only the 3 component files it renders |
| R6 financial | NO — layout/CSS only |
| Planning-skip eligible | NO — 3 files + HIGH risk |
| Fast Lane eligible | NO — 3 files |
| Files WILL change | `src/components/layout/Header.jsx` · `src/components/dashboard/ChannelColumn.jsx` · `src/components/dashboard/ChannelColumnsLayout.jsx` |
| Files WILL NOT touch | `DashboardPage.jsx` (R5) · `OrderEntry.jsx` (R5) · `CollectPaymentPanel.jsx` · any transform/service |

---

## 8. Edit Summary

| # | File | Change | Net Δ |
|---|------|--------|-------|
| E-CR414-1a | `Header.jsx` | Wrap `PlatformCounterChip` with `hidden md:inline-flex` | ~3 lines |
| E-CR414-1b | `Header.jsx` | `<nav>` className: add `hidden md:flex` | 1 line |
| E-CR414-1c | `Header.jsx` | Insert `<TabletChannelDropdown>` block (new JSX + new sub-component) | ~25 lines |
| E-CR414-2 | `ChannelColumn.jsx` | Add `isTablet` prop; conditional grid template | ~5 lines |
| E-CR414-3a | `ChannelColumnsLayout.jsx` | Add `isTablet` state + resize listener + pass to ChannelColumn | ~10 lines |
| E-CR414-3b | `ChannelColumnsLayout.jsx` | `className` on main container: add `flex-col md:flex-row` | 1 line |

**Total: 3 files · ~45 lines added/changed · 0 deleted**

---

## 9. Verification Matrix (seeds Gate 3 + QA)

| # | What to verify | Method | Automated? |
|---|---|---|:---:|
| V-1 | Desktop 1280px — layout completely unchanged | Screenshot 1280px — side-by-side channels, 160px cards, header unchanged | NO |
| V-2 | Tablet 600px — single-row header, no overflow | Screenshot 600px — Add button visible, no overflow | NO |
| V-3 | Tablet 600px — Web/POS counters hidden | `hidden md:inline-flex` visible check | NO |
| V-4 | Tablet 600px — channel pills hidden, dropdown shown | Existing pills nav `hidden`, dropdown `md:hidden` visible | NO |
| V-5 | Dropdown toggle — all channels selectable | Tap dropdown → all 4 channels checked, toggle works | NO |
| V-6 | Channel filtering still works from tablet dropdown | Uncheck Walk-In → Walk-In column disappears | NO |
| V-7 | Channels stack vertically at 600px | Screenshot — Dine-In above Walk-In above Delivery | NO |
| V-8 | Card auto-fill at 600px (3-4 cards per row) | Each channel row shows cards filling viewport | NO |
| V-9 | `< >` arrows work on tablet (OD-414-02=A) | Tap `>` on Dine-In → more cards; value saves to localStorage | NO |
| V-10 | webpack 0 new warnings | `yarn build` exit 0 | YES |

---

## 10. Post-Code Registry Checklist (for Implementation agent)

```
□ 1. registry.json: CR-414 → GATE_5A_IMPLEMENTED · BUG-537 → GATE_5A_IMPLEMENTED
□ 2. CR_REGISTRY.md + BUG_TRACKER.md: rows updated
□ 3. FILE_OWNERSHIP.md: 3 files listed with CR-414 IMPL + date
□ 4. Code markers: // CR-414 on all added/changed lines
□ 5. yarn build exit 0, 0 new warnings
```

---

## 11. Summary

- **3 files · ~45 lines · pure layout/CSS — no logic, no financial, no API change**
- Header: hide counters + pills on tablet, show compact channel dropdown
- ChannelColumn: fluid `minmax(140px,1fr)` grid on tablet, pixel-fixed 160px on desktop
- ChannelColumnsLayout: `flex-col md:flex-row` stacking + `isTablet` propagation
- Desktop 1280px+: **completely unchanged** (OD-537-03)
- **Gate 3 BLOCKED** on OD-414-01 (dropdown position) + OD-414-02 (localStorage on tablet)

**Next:** Owner answers OD-414-01 + OD-414-02 → "Gate 3 GO" → Implementation Plan.

---

## 12. Gate 3 Revalidation Addendum (2026-10-13) — IA corrections

Owner asked for a revalidation before Gate 4. Full re-trace of HEAD found the following inaccuracies in this IA; the authoritative design is now `plans/CR-414_IMPLEMENTATION_PLAN.md` **v2 §0**.

| IA section | Was | Corrected to |
|---|---|---|
| §2 / §4 breakpoint | `md` = 768px; "<768px" tablet | **`lg` = 1024px** (OD-414-03=A). Evidence: header scrollWidth 1008 > clientWidth at 768 (698), 800 (730), 960 (890). `md` would leave all 10" tablets broken. |
| §3 File B / §4 E-CR414-2 | Only `gridTemplateColumns` needs to change | **Also** `ChannelColumn.jsx` L191-202: root `width`/`minWidth` are inline px (`actualColumns×160+gap+16`) with `flex-shrink-0`. Must become `100%`/`0` on tablet or the grid still fills only 344px (the `empty_right_px:170` symptom). |
| §4 E-CR414-3 | `flex-col md:flex-row` sufficient | ChannelColumn root `h-full` makes every stacked channel screen-tall. Tablet uses `h-auto` (OD-414-04=A) + `gap-2` separator. |
| §4 E-CR414-1c | "compact channel multiselect dropdown" via `handleChannelToggle` | Pills nav is dual-mode (`Header.jsx` L255-317): **status pills + Schedule in channel view (default)**, channel pills in status view. `handleChannelToggle` is unused exclusive-select code. Dropdown must **mirror the nav** with the pills' own handlers (OD-414-05=A). |
| §3 File A | Overflow attributed to pills + counters only | Search box `w-48`/`w-64` (L342-344) and results panel `w-96 left-1/2 -translate-x-1/2` (L381) also overflow at 600. Tablet: search `flex-1 w-full`, panel `right-0 w-80`. |
| §4 E-CR414-3a | `window.innerWidth < 768` resize listener | `window.matchMedia('(max-width: 1023px)')` so JS and Tailwind `lg` never disagree. |
| §8 totals | 6 edits · ~45 lines | **15 edits · ~120 lines**, same 3 files, scope lock unchanged. |
| §9 V-9 (arrows) | "Tap `>` → more cards" | On tablet auto-fill ignores `actualColumns`; arrows change localStorage only (OD-414-02=A). Verify via console/localStorage, not visible columns. |

Pre-existing, out of scope (documented, not changed): expanded sidebar (280px, `Sidebar.jsx` L493) already makes the desktop header overflow at 1280 today; 1024-1078 narrow desktop remains marginal.

**Gate 2 status after addendum:** COMPLETE + CORRECTED. **Gate 3:** v2 plan complete, all ODs locked. **Next: Gate 4 GO.**
