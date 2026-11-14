# BUG-537 + CR-414 — Implementation Plan (Gate 3) — **v2 REVALIDATED**

**Date:** 2026-10-12 (v1) · **Revalidated:** 2026-10-13 (v2 — owner asked "has everything been covered, no desktop issue")
**Role:** PLANNING (Gate 3 — plan revalidation against HEAD, no code)
**Items:** BUG-537 (problem report) + CR-414 (Dashboard Tablet Responsive Redesign)
**Risk:** HIGH
**Sprint:** oct_cr_batch
**Gate 2 IA:** `impact/CR-414_IMPACT_ANALYSIS.md`
**v1 status:** SUPERSEDED — v1 had 2 compile errors, 1 wrong breakpoint and 4 functional gaps (see §0).

---

## 0. Revalidation Findings (v1 → v2)

Full code trace of `Header.jsx` (693 L), `ChannelColumn.jsx` (361 L), `ChannelColumnsLayout.jsx` (260 L), `DashboardPage.jsx` L1737-1800, `Sidebar.jsx` L488-497, evidence `INV-TABLET-001_layout_metrics.json`.

| # | Severity | Finding | v1 impact | v2 fix |
|---|---|---|---|---|
| F1 | **BLOCKER (compile)** | v1 E-3b and E-3c put `{/* CR-414 */}` **inside a JSX opening tag** (`isTablet={isTablet} {/*…*/}` and `className="…" {/*…*/}`). JSX-expression comments are illegal between attributes. | webpack FAIL | Use JS line comments `// CR-414` on their own line |
| F2 | **BLOCKER (wrong breakpoint)** | v1 uses `md:` (≥768 = desktop) and `innerWidth < 768`. Evidence: header needs **1008px**; at 768 portrait clientW = 698, at 800 = 730, at 960 landscape = 890 → **all still overflow**. OD-537-01 explicitly includes 768px+ 10" tablets — v1 leaves them broken. | Tablets ≥768 unchanged = still broken | Desktop threshold → `lg:` (1024) + `matchMedia('(max-width: 1023px)')` — **OD-414-03** |
| F3 | **BLOCKER (symptom not fixed)** | `ChannelColumn.jsx` L191-202 sets `width`/`minWidth` = `actualColumns×160+gap+16` **as inline px** with `flex-shrink-0`. v1 only changed the inner grid → stacked Dine-In would still be 344px wide in a 530px viewport (exactly the `empty_right_px: 170` in evidence); auto-fill would fill 344px → still 2 cards. | Grid symptom persists | Tablet: `width:'100%'`, `minWidth:0` |
| F4 | **BLOCKER (layout)** | `ChannelColumn` root has `h-full`; parent `flex-col` on tablet → each stacked channel = 100% container height → 3 channels = 3 screens, each with its own inner scroll. v1 silent on this. | Odd UX | Tablet: `h-auto` natural height, page scrolls — **OD-414-04** |
| F5 | **MAJOR (functional)** | Pills nav is **dual-mode**: `dashboardView==='status'` → channel pills (multi-select add/remove, L255-283); `dashboardView==='channel'` (**factory default**) → **status pills YTC/Preparing/Ready/Served/Pending Pay/Paid + Schedule** (L285-316). v1 dropdown only offers channels, and calls `handleChannelToggle` which is **exclusive-select dead code** (not used by any pill). Result on tablet in default view: status filters + Schedule vanish with no replacement; channel pick becomes single-select, contradicting OD-537-02 ("multiselect, same toggle behaviour as current pills"). v1 risk-register line "exclusive selection is correct" is wrong. | Status filtering lost on tablet | Dropdown mirrors the nav: status rows (+Schedule) in channel view, channel rows in status view; checkbox multi-select; reuse exact pill handlers — **OD-414-05** |
| F6 | **MAJOR (overflow)** | Search box is fixed `w-48` (`w-64` focused) + wrapper `px-4`. v1 left it. Estimated tablet row at 600 (clientW 530): logo ~120 + dropdown ~110 + search 192+32 + Add ~75 + dot 22 + gaps ≈ 580 → **still overflows**, worse when focused. OD-537-02 says `[Search flex-1]`. | Header may still overflow at 600 | Tablet: search `flex-1 min-w-0 w-full`, desktop `lg:w-48/lg:w-64` unchanged |
| F7 | **MAJOR (overflow)** | Search results dropdown is `w-96 left-1/2 -translate-x-1/2` (384px centred under the box). On a 600 tablet the box sits at the right edge → dropdown clips off-screen. | Search unusable on tablet | Tablet: `right-0 w-80`; desktop `lg:left-1/2 lg:-translate-x-1/2 lg:w-96 lg:right-auto` |
| F8 | MINOR | v1 Anchor H quoted L213-215; actual is L212-214 (string anchors unaffected). | none | Corrected |
| F9 | MINOR | `innerWidth` resize listener can drift from Tailwind media queries (scrollbar edge cases). | rare mismatch | `window.matchMedia` synced to the same `lg` query |
| F10 | NOTE | OD-414-02=A keeps `< >` arrows on tablet, but with `auto-fill` the arrows change `maxColumns`/localStorage **without any visible change**. v1 V-11 ("tap `>` → count changes") would FAIL as written. | QA false-fail | V-11 rewritten: verify localStorage/console, not visible columns |
| F11 | NOTE | Stacked channels with `gap-0` + `borderRight` only → no separator between vertically stacked channels. | cosmetic | `gap-2 lg:gap-0` |
| F12 | NOTE (out of scope, pre-existing) | Sidebar is 70px collapsed / **280px expanded** (`Sidebar.jsx` L493). Expanded sidebar at 1280 leaves 1000px < 1008px header → desktop overflow **already exists today** with expanded sidebar. Also 1024-1078 narrow desktop remains marginal after v2. Not touched by CR-414 (`DashboardPage.jsx`/`Sidebar.jsx` R5/out of scope). | none | Logged in Risk Register; candidate follow-up CR (auto-collapse sidebar <1024) |
| F13 | NOTE | `platform` is in-memory `useState(null)` (`DashboardPage.jsx` L466), not persisted → hiding PlatformDropdown on tablet cannot leave a stale invisible filter after reload. | none | — |
| F14 | NOTE | Status view (`dashboardView==='status'`) also renders through `ChannelColumnsLayout` (statusData as channels) → stacking applies there too. Consistent, intended. | none | Added V-14 |

**Desktop safety (≥1024px) — verified line by line:** every v2 change is either a Tailwind `lg:` variant that restores the exact current class on desktop, or an `isTablet ? … : <current expression>` ternary whose else-branch is the unchanged HEAD expression. No desktop-path class or value changes. See §6 Desktop Diff Table.

---

## 1. Decisions

### Locked
| OD | Choice | Owner |
|---|---|---|
| OD-414-01 | **A** — tablet dropdown opens as downward overlay below header | 2026-10-12 |
| OD-414-02 | **A** — `< >` arrows + localStorage persist on tablet | 2026-10-12 |
| OD-537-01 | Support 600px + 768px+ tablets | 2026-10-12 |
| OD-537-02 | Single-row tablet header: hide counters + pills → compact multiselect dropdown | 2026-10-12 |
| OD-537-03 | Channels stack vertically on tablet · auto-fill cards · desktop unchanged | 2026-10-12 |

### Locked by revalidation (2026-10-13)
| OD | Question | Options considered | **Locked** |
|---|---|---|---|
| **OD-414-03** | Desktop/tablet threshold. OD-537-01 named `md`=768 but the 768/800/960 tablets overflow at that breakpoint (F2). | (A) `lg` = 1024px · (B) keep `md`=768 · (C) custom `min-[1080px]` | **A — `lg` 1024px** (owner 2026-10-13). Supersedes the `md`=768 wording in OD-537-01/02/03; the *intent* (600 + 768+ tablets supported) is preserved. |
| **OD-414-04** | Height of each stacked channel on tablet (F4). | (A) natural height, dashboard scrolls · (B) `max-h-[60vh]` + inner scroll | **A — natural height** (owner 2026-10-13: "full dashboard scrolls, every card visible") |
| **OD-414-05** | What the tablet dropdown contains (F5). OD-537-02 said "channel pills" but the default view shows **status** pills. | (A) mirror the nav (status + Schedule in channel view, channels in status view, multi-select) · (B) channels only | **A — mirror nav** (agent recommendation accepted 2026-10-13 after owner confirmed row fit is identical for A/B; **owner may override before Gate 4 GO** — only E-1d changes) |

Plan below is written for **A / A / A**.

---

## 2. Entry Verification (MANDATORY — run before touching any code)

| Anchor | File:line | Command | Expected |
|---|---|---|---|
| A | `Header.jsx:70-72` | `sed -n '70,72p'` | `const [isSearchFocused, …]` / `const searchRef = useRef(null);` / `const dropdownRef = useRef(null);` |
| B | `Header.jsx:97-99` | `sed -n '97,99p'` | `document.addEventListener("mousedown", handleClickOutside);` … `}, []);` |
| C | `Header.jsx:254` | `sed -n '254p'` | `<nav className="flex items-center gap-1 ml-4">` |
| D | `Header.jsx:318-321` | `sed -n '318,321p'` | `</nav>` / `</div>` / blank / `{/* POS2-002 Phase 3 (May-2026): Platform filter` |
| E | `Header.jsx:326` | `sed -n '326p'` | `<div className="flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}>` |
| F | `Header.jsx:331` | `sed -n '331p'` | `<div className="flex-1 flex justify-end px-4">` |
| G | `Header.jsx:336-338` | `sed -n '336,338p'` | `<div className="flex items-center mr-3">` / `<PlatformCounterChip …/>` / `</div>` |
| H | `Header.jsx:339-344` | `sed -n '339,344p'` | `<div className="relative">` … `` className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${ `` / `isSearchFocused ? "w-64" : "w-48"` / `}`}` |
| I | `Header.jsx:381` | `sed -n '381p'` | `className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto"` |
| J | `ChannelColumn.jsx:65-66` | `sed -n '65,66p'` | `onHideColumn,      // Handler to hide this column` / `}) => {` |
| K | `ChannelColumn.jsx:195-202` | `sed -n '195,202p'` | `<div` / `data-testid={\`channel-column-${channel.id}\`}` / `className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden flex-shrink-0"` / `style={{` / `` width: `${columnWidth}px`, `` / `` minWidth: `${columnWidth}px`, `` |
| L | `ChannelColumn.jsx:283-285` | `sed -n '283,285p'` | `gridTemplateColumns: viewType === 'table'` / `` ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` `` / `` : `repeat(${actualColumns}, 1fr)`, `` |
| M | `ChannelColumnsLayout.jsx:101-103` | `sed -n '101,103p'` | `useEffect(() => {` / `try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}` / `}, []);` |
| N | `ChannelColumnsLayout.jsx:212-214` | `sed -n '212,214p'` | `onHideColumn={onHideColumn}` / `/>` / `);` |
| O | `ChannelColumnsLayout.jsx:248` | `sed -n '248p'` | `className="flex h-full gap-0 overflow-x-auto"` |

**Anchor verification at v2 write time (2026-10-13):** ✅ A–O all PASS against HEAD.
Also confirmed: `ChevronDown` + `Check` already imported in `Header.jsx` L2 (no new imports); `useState`/`useEffect` already imported in `ChannelColumnsLayout.jsx` L1.

---

## 3. Scope Lock (unchanged from v1)

**Files WILL change:** `src/components/layout/Header.jsx` · `src/components/dashboard/ChannelColumn.jsx` · `src/components/dashboard/ChannelColumnsLayout.jsx`
**Files WILL NOT touch:** `DashboardPage.jsx` (R5) · `Sidebar.jsx` · `OrderEntry.jsx` (R5) · `CollectPaymentPanel.jsx` (R5) · any service / transform / context / constants / tailwind config.

---

## 4. Edits (v2 — 15 edits, 3 files)

Breakpoint token used below: **`lg`** (1024px) per OD-414-03=A. If OD-414-03=B replace every `lg:` with `md:` and `1023px` with `767px`.

### Header.jsx

#### E-1a — state + ref
old:
```javascript
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
```
new:
```javascript
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [tabletDropdownOpen, setTabletDropdownOpen] = useState(false); // CR-414: tablet filter dropdown
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const tabletDropdownRef = useRef(null); // CR-414: tablet dropdown click-outside ref
```

#### E-1b — click-outside for tablet dropdown
old:
```javascript
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
```
new:
```javascript
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // CR-414: close tablet filter dropdown on outside tap/click
  useEffect(() => {
    const handler = (e) => {
      if (tabletDropdownRef.current && !tabletDropdownRef.current.contains(e.target)) {
        setTabletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);
```

#### E-1c — hide pills nav on tablet
old: `          <nav className="flex items-center gap-1 ml-4">`
new: `          <nav className="hidden lg:flex items-center gap-1 ml-4"> {/* CR-414: pills hidden <1024px */}`

#### E-1d — insert tablet filter dropdown (mirrors nav — OD-414-05=A; downward overlay — OD-414-01=A)
old:
```jsx
          </nav>
        </div>

        {/* POS2-002 Phase 3 (May-2026): Platform filter
```
new:
```jsx
          </nav>

          {/* CR-414: Tablet filter dropdown — mirrors the pills nav (status filters in channel view,
              channel filters in status view). Visible <1024px only (OD-537-02, OD-414-01=A, OD-414-05=A). */}
          <div className="relative lg:hidden ml-2" ref={tabletDropdownRef}>
            <button
              data-testid="tablet-filter-dropdown-btn"
              aria-expanded={tabletDropdownOpen}
              onClick={() => setTabletDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              style={{ backgroundColor: '#F5F5F5', color: COLORS.darkText }}
            >
              <span>{dashboardView === 'status' ? 'Channels' : 'Status'}</span>
              <span
                data-testid="tablet-filter-active-count"
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: COLORS.borderGray, color: COLORS.grayText }}
              >
                {dashboardView === 'status'
                  ? activeChannels.length
                  : activeStatuses.length + (tableFilter === 'schedule' ? 1 : 0)}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {tabletDropdownOpen && (
              <div
                data-testid="tablet-filter-dropdown-menu"
                className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border z-50 min-w-[180px] py-1"
                style={{ borderColor: COLORS.borderGray }}
              >
                {dashboardView === 'status' ? (
                  visibleChannelFilters.map((channel) => {
                    const Icon = channel.icon;
                    const isActive = activeChannels.includes(channel.id);
                    return (
                      <button
                        key={channel.id}
                        data-testid={`tablet-filter-channel-${channel.id}`}
                        onClick={() => {
                          if (isActive) {
                            const next = activeChannels.filter(c => c !== channel.id);
                            if (next.length > 0) setActiveChannels(next);
                          } else {
                            setActiveChannels([...activeChannels, channel.id]);
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                        style={{ color: isActive ? COLORS.darkText : COLORS.grayText }}
                      >
                        <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: isActive ? 'visible' : 'hidden', color: COLORS.primaryOrange }} />
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{channel.fullLabel}</span>
                      </button>
                    );
                  })
                ) : (
                  <>
                    {visibleStatusFilters.map((status) => {
                      const isActive = activeStatuses.includes(status.id);
                      return (
                        <button
                          key={status.id}
                          data-testid={`tablet-filter-status-${status.id}`}
                          onClick={() => handleStatusToggle(status.id)}
                          className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                          style={{ color: isActive ? COLORS.darkText : COLORS.grayText }}
                        >
                          <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: isActive ? 'visible' : 'hidden', color: COLORS.primaryOrange }} />
                          <span>{status.label}</span>
                        </button>
                      );
                    })}
                    <button
                      data-testid="tablet-filter-schedule"
                      onClick={() => setTableFilter(tableFilter === 'schedule' ? null : 'schedule')}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                      style={{ color: tableFilter === 'schedule' ? '#1565C0' : COLORS.grayText }}
                    >
                      <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: tableFilter === 'schedule' ? 'visible' : 'hidden', color: '#1565C0' }} />
                      <span>Schedule</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* POS2-002 Phase 3 (May-2026): Platform filter
```
Behaviour notes: menu stays open while toggling (multiselect), closes on outside tap. Channel rows reuse the **exact** inline pill logic (cannot deselect the last channel). Status rows reuse `handleStatusToggle` (cannot deselect the last status). Schedule reuses the pill's `setTableFilter` toggle.

#### E-1e — hide PlatformDropdown on tablet
old: `        <div className="flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}>`
new: `        <div className="hidden lg:flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}> {/* CR-414: hidden <1024px */}`

#### E-1f — search cluster padding on tablet
old: `        <div className="flex-1 flex justify-end px-4">`
new: `        <div className="flex-1 flex justify-end px-2 lg:px-4"> {/* CR-414: tighter padding <1024px */}`

#### E-1g — hide PlatformCounterChip on tablet
old:
```jsx
          <div className="flex items-center mr-3">
            <PlatformCounterChip webCount={webCount} posCount={posCount} />
          </div>
```
new:
```jsx
          <div className="hidden lg:flex items-center mr-3"> {/* CR-414: hidden <1024px */}
            <PlatformCounterChip webCount={webCount} posCount={posCount} />
          </div>
```

#### E-1h — search box fluid on tablet (F6)
old:
```jsx
          <div className="relative">
            <div 
              ref={searchRef}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isSearchFocused ? "w-64" : "w-48"
              }`}
```
new:
```jsx
          <div className="relative flex-1 lg:flex-initial min-w-0"> {/* CR-414: search takes remaining row width <1024px */}
            <div 
              ref={searchRef}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all w-full ${
                isSearchFocused ? "lg:w-64" : "lg:w-48"
              }`}
```
Desktop check: `lg:flex-initial` = `flex: 0 1 auto` = browser default (what `<div className="relative">` has today). `lg:w-64`/`lg:w-48` override `w-full` at ≥1024. Byte-identical desktop box.

#### E-1i — search results dropdown anchoring on tablet (F7)
old: `                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto"`
new: `                className="absolute top-full right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 mt-1 w-80 lg:w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto" /* CR-414: right-anchored, narrower <1024px */`
(Comment is inside the opening tag → must be a JS `/* */` comment, NOT `{/* */}`.)

### ChannelColumn.jsx

#### E-2a — `isTablet` prop
old:
```javascript
  onHideColumn,      // Handler to hide this column
}) => {
```
new:
```javascript
  onHideColumn,      // Handler to hide this column
  isTablet = false,  // CR-414: full-width stacked column + fluid grid <1024px (OD-537-03)
}) => {
```

#### E-2b — full-width, natural-height column on tablet (F3, F4 — OD-414-04=A)
old:
```jsx
      className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden flex-shrink-0"
      style={{ 
        width: `${columnWidth}px`,
        minWidth: `${columnWidth}px`,
```
new:
```jsx
      className={`flex flex-col ${isTablet ? 'h-auto' : 'h-full'} bg-white rounded-lg shadow-sm overflow-hidden flex-shrink-0`} // CR-414
      style={{ 
        width: isTablet ? '100%' : `${columnWidth}px`,       // CR-414: fill row on tablet
        minWidth: isTablet ? 0 : `${columnWidth}px`,         // CR-414
```
(If OD-414-04=B: use `'max-h-[60vh]'` instead of `'h-auto'`.)

#### E-2c — fluid grid on tablet
old:
```javascript
                    gridTemplateColumns: viewType === 'table' 
                      ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                      : `repeat(${actualColumns}, 1fr)`,
```
new:
```javascript
                    gridTemplateColumns: isTablet // CR-414: fluid auto-fill on tablet (OD-537-03)
                      ? (viewType === 'table' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))')
                      : viewType === 'table' 
                        ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                        : `repeat(${actualColumns}, 1fr)`,
```
Order view (300px cards) gets `minmax(280px,1fr)` so 1 card at 600 / 2 at 768+ — v1 would have squeezed order cards to 140px.

### ChannelColumnsLayout.jsx

#### E-3a — `isTablet` via matchMedia (F9), synced to Tailwind `lg`
old:
```javascript
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);
```
new:
```javascript
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);

  // CR-414: tablet = below Tailwind `lg` (1024px). matchMedia keeps JS and CSS breakpoints in lockstep.
  // OD-414-02=A: maxColumns/localStorage untouched on tablet.
  const [isTablet, setIsTablet] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e) => setIsTablet(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
```

#### E-3b — pass prop (JS comment, NOT `{/* */}` — fixes v1 compile error F1)
old:
```jsx
          onHideColumn={onHideColumn}
        />
      );
```
new:
```jsx
          onHideColumn={onHideColumn}
          // CR-414: fluid grid + full-width column on tablet
          isTablet={isTablet}
        />
      );
```

#### E-3c — vertical stacking on tablet (fixes v1 compile error F1; F11 gap)
old:
```jsx
      className="flex h-full gap-0 overflow-x-auto"
```
new:
```jsx
      // CR-414: stack channels vertically <1024px, side-by-side ≥1024px (OD-537-03)
      className="flex flex-col lg:flex-row h-full gap-2 lg:gap-0 overflow-x-auto"
```
Desktop check: `lg:flex-row` = current `flex` default direction; `lg:gap-0` = current. `overflow-x-auto` unchanged (its computed `overflow-y:auto` already gives vertical scroll on tablet — no extra class needed).

---

## 5. Execution Sequence
```
1. Entry Verification A–O — abort on ANY mismatch
2. Header.jsx E-1a…E-1i (9 edits) — one parallel search_replace block
3. ChannelColumn.jsx E-2a…E-2c (3 edits) — parallel
4. ChannelColumnsLayout.jsx E-3a…E-3c (3 edits) — parallel
5. Wait for "Compiled successfully" (0 new warnings)
6. Automated V-checks (grep)
7. Screenshots: 600×960, 768×1024, 960×600, 1024×768, 1280×800 (collapsed sidebar); 1280×800 expanded sidebar (pre-existing-state capture only)
8. EXIT GATE (5 boxes) → QA Handover + Session Handover
```

---

## 6. Desktop Diff Table (≥1024px must be byte-identical in rendered output)

| Edit | Desktop computed result | Same as HEAD? |
|---|---|---|
| E-1c `hidden lg:flex` | `display:flex` | ✅ |
| E-1d `lg:hidden` wrapper | `display:none` → not rendered visually; `tabletDropdownOpen` never true (button unreachable) | ✅ |
| E-1e / E-1g `hidden lg:flex` | `display:flex` | ✅ |
| E-1f `px-2 lg:px-4` | `padding-x:1rem` | ✅ |
| E-1h `flex-1 lg:flex-initial min-w-0` + `w-full lg:w-48/64` | `flex:0 1 auto` (default) · `width:12rem/16rem`; `min-width:0` on a non-flex-shrinking item with fixed-width child is a no-op | ✅ |
| E-1i `right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 w-80 lg:w-96` | `right:auto; left:50%; translateX(-50%); width:24rem` | ✅ |
| E-2b/E-2c `isTablet=false` branch | HEAD expressions verbatim | ✅ |
| E-3c `flex-col lg:flex-row gap-2 lg:gap-0` | `flex-direction:row; gap:0` | ✅ |
| E-3a matchMedia | `isTablet=false` at ≥1024 | ✅ |

---

## 7. Verification Matrix (seeds QA)

| # | Edit | What to verify | Method | Auto? |
|---|---|---|---|:---:|
| V-1 | 1c/1d/1e/1g/1h | **600×960**: single-row header, `pos-header` scrollWidth ≤ clientWidth, Add button visible | Screenshot + `el.scrollWidth<=el.clientWidth` | NO |
| V-2 | same | **768×1024** and **960×600**: same as V-1 (F2 regression) | Screenshot | NO |
| V-3 | 1d | Tap `tablet-filter-dropdown-btn` → menu opens **below** header (OD-414-01=A) | Browser | NO |
| V-4 | 1d | Channel view (default): menu lists YTC/Preparing/Ready/Served/Pending Pay/Paid + Schedule with check marks; toggling Preparing off removes Preparing cards; last status cannot be deselected | Browser | NO |
| V-5 | 1d | Status view: menu lists Delivery/TakeAway/Dine In/Room; untick Dine In → Dine-In cards disappear; last channel cannot be deselected | Browser | NO |
| V-6 | 1d | Menu stays open while toggling; closes on outside tap | Browser | NO |
| V-7 | 1e/1g | PlatformDropdown + Web/POS chip not visible <1024 | grep `hidden lg:flex` ×3 + screenshot | YES/NO |
| V-8 | 1h | Search focus at 600 does **not** overflow header; typing shows results dropdown fully inside viewport (1i) | Browser | NO |
| V-9 | 2b/2c | 600: each channel spans full width (`channel-column-dineIn` width ≈ layout width); cards auto-fill (3 per row at 530px) | Screenshot + DOM width | NO |
| V-10 | 3c | 600: Dine-In above Take-Away above Delivery, visible gap between | Screenshot | NO |
| V-11 | OD-414-02=A | Tap `>` on Dine-In at 600 → console `[Arrow] dineIn 2→3`, `mygenie_layout_table_view` localStorage updated; **visible grid unchanged (expected on tablet)**; rotate/resize to ≥1024 → 3 fixed columns shown | Browser | NO |
| V-12 | all | **1280×800 collapsed sidebar: pixel-identical to HEAD** (compare against `evidence/BUG-537/l1280.png`) | Screenshot diff | NO |
| V-13 | all | **1024×768**: desktop layout (side-by-side), header overflow ≤ HEAD behaviour | Screenshot | NO |
| V-14 | 3c | Status view at 600: status columns stack vertically too | Screenshot | NO |
| V-15 | 2c | Order view at 600: 1 order card per row (280px min), at 768: 2 per row | Screenshot | NO |
| V-16 | 2a/3b | `grep -c isTablet` ≥1 in each of the 3 files | grep | YES |
| V-17 | all | `yarn build` exit 0, 0 new warnings; `grep -n "{/\*" ` inside opening tags = 0 | build | YES |

---

## 8. Risk Register (v2)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Desktop layout regresses | LOW | §6 Desktop Diff Table — every change collapses to the HEAD value at ≥1024. V-12 pixel diff mandatory. |
| 1024-1078 narrow desktop still shows header overflow | PRE-EXISTING | Unchanged from HEAD; documented F12. Follow-up CR candidate. |
| Expanded sidebar (280px) at 1280 overflows header | PRE-EXISTING | Unchanged from HEAD (`Sidebar.jsx` out of scope). Documented F12. |
| `matchMedia` unsupported | NONE | All target Android WebView/Chrome ≥ 2016 support `addEventListener('change')`. |
| Tablet dropdown and search dropdown overlap | LOW | Different anchors (left vs right), both `z-50`; only one open at a time in practice. |
| `touchstart` outside-handler closes menu before option click registers | LOW | Handler checks `contains(e.target)` — taps inside the menu are ignored. |
| Status view `ChannelColumnsLayout` stacking surprises owner | LOW | Consistent with OD-537-03 wording ("channels stack"); V-14 captures it for owner smoke. |
| `h-auto` + very long Dine-In list → long scroll | MEDIUM (UX) | Owner choice OD-414-04; B offers capped height. |

---

## 9. Post-Code Registry Checklist (EXIT GATE prerequisite)
```
□ 1. registry.json: CR-414 + BUG-537 → GATE_5A_IMPLEMENTED, sprint_key oct_cr_batch
□ 2. CR_REGISTRY.md + BUG_TRACKER.md rows → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: CR-414 IMPL — Header.jsx · ChannelColumn.jsx · ChannelColumnsLayout.jsx (date)
□ 4. CODE MARKERS: grep -c "CR-414" Header.jsx ≥ 9 · ChannelColumn.jsx ≥ 4 · ChannelColumnsLayout.jsx ≥ 4
□ 5. COMPILE: yarn build exit 0, 0 new warnings
```

---

## 10. Summary

| Field | v1 | **v2** |
|---|---|---|
| Edits | 9 | **15** (1a–1i · 2a–2c · 3a–3c) |
| Files | 3 | 3 (unchanged scope lock) |
| Lines added | ~60 | ~120 |
| Breakpoint | `md` 768 ❌ | **`lg` 1024** (OD-414-03) |
| Compile errors | 2 | 0 |
| Desktop | claimed unchanged | **proven unchanged** (§6) |
| Open ODs | none | **none — OD-414-03/04/05 locked 2026-10-13** |
| Awaiting | Gate 4 GO | **Gate 4 GO** |
