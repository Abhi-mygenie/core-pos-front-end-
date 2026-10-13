# BUG-537 + CR-414 — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Items:** BUG-537 (problem report) + CR-414 (Dashboard Tablet Responsive Redesign)
**Risk:** HIGH
**Sprint:** oct_cr_batch
**Gate 2 IA:** `impact/CR-414_IMPACT_ANALYSIS.md`

## Locked Decisions
| OD | Choice | Owner |
|---|---|---|
| OD-414-01 | **A** — Tablet channel dropdown opens as downward overlay below header | 2026-10-12 |
| OD-414-02 | **A** — `< >` arrows + localStorage persist on tablet | 2026-10-12 |
| OD-537-01 | Support 600px + 768px tablet breakpoints (`sm` / `md`) | 2026-10-12 |
| OD-537-02 | Single-row header on tablet: hide counters + pills → compact channel dropdown | 2026-10-12 |
| OD-537-03 | Channels stack vertically on tablet · auto-fill cards · desktop unchanged | 2026-10-12 |

---

## Entry Verification (MANDATORY — run before touching any code)

### Anchor A — `Header.jsx` pills nav (L254)
```bash
sed -n '254p' /app/frontend/src/components/layout/Header.jsx
```
**Expected:** `          <nav className="flex items-center gap-1 ml-4">`

### Anchor B — `Header.jsx` pills nav close + left-section close (L318-321)
```bash
sed -n '318,321p' /app/frontend/src/components/layout/Header.jsx
```
**Expected:**
```
          </nav>
        </div>

        {/* POS2-002 Phase 3 (May-2026): Platform filter
```

### Anchor C — `Header.jsx` PlatformDropdown wrapper (L326)
```bash
sed -n '326p' /app/frontend/src/components/layout/Header.jsx
```
**Expected:** `        <div className="flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}>`

### Anchor D — `Header.jsx` PlatformCounterChip wrapper (L336)
```bash
sed -n '336p' /app/frontend/src/components/layout/Header.jsx
```
**Expected:** `          <div className="flex items-center mr-3">`

### Anchor E — `ChannelColumn.jsx` grid template (L283-286)
```bash
sed -n '283,286p' /app/frontend/src/components/dashboard/ChannelColumn.jsx
```
**Expected:**
```
                  style={{ 
                    gridTemplateColumns: viewType === 'table' 
                      ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                      : `repeat(${actualColumns}, 1fr)`,
```

### Anchor F — `ChannelColumn.jsx` last prop + closing (L64-66)
```bash
sed -n '64,66p' /app/frontend/src/components/dashboard/ChannelColumn.jsx
```
**Expected:**
```
  onHideColumn,      // Handler to hide this column
}) => {
```

### Anchor G — `ChannelColumnsLayout.jsx` stale-cleanup useEffect (L101-104)
```bash
sed -n '101,104p' /app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx
```
**Expected:**
```
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);

```

### Anchor H — `ChannelColumnsLayout.jsx` ChannelColumn last prop + close (L213-215)
```bash
sed -n '213,215p' /app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx
```
**Expected:**
```
          onHideColumn={onHideColumn}
        />
      );
```

### Anchor I — `ChannelColumnsLayout.jsx` main return className (L248)
```bash
sed -n '248p' /app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx
```
**Expected:** `      className="flex h-full gap-0 overflow-x-auto"`

**Anchor verification confirmed at plan-write time (2026-10-12):** ✅ A–I all PASS

---

## Scope Lock

**Files WILL change:**
- `src/components/layout/Header.jsx`
- `src/components/dashboard/ChannelColumn.jsx`
- `src/components/dashboard/ChannelColumnsLayout.jsx`

**Files WILL NOT touch:**
- `DashboardPage.jsx` (R5 — must not touch)
- `OrderEntry.jsx` (R5)
- `CollectPaymentPanel.jsx` (R5)
- Any service / transform / context

---

## Edits

### E-CR414-1a — `Header.jsx`: add `tabletDropdownOpen` state + `tabletDropdownRef`

**Position:** After `const dropdownRef = useRef(null);` (~L72)

**`search_replace` old_str:**
```javascript
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
```
**`search_replace` new_str:**
```javascript
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [tabletDropdownOpen, setTabletDropdownOpen] = useState(false); // CR-414: tablet channel selector
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const tabletDropdownRef = useRef(null); // CR-414: tablet dropdown click-outside ref
```

---

### E-CR414-1b — `Header.jsx`: add click-outside handler for tablet dropdown

**Position:** After the existing click-outside `useEffect` (which closes on `mousedown` outside `dropdownRef`)

**`search_replace` old_str:**
```javascript
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
```
**`search_replace` new_str:**
```javascript
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // CR-414: close tablet channel dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (tabletDropdownRef.current && !tabletDropdownRef.current.contains(e.target)) {
        setTabletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
```

---

### E-CR414-1c — `Header.jsx`: hide filter pills nav on tablet

**`search_replace` old_str:**
```jsx
          <nav className="flex items-center gap-1 ml-4">
```
**`search_replace` new_str:**
```jsx
          <nav className="hidden md:flex items-center gap-1 ml-4"> {/* CR-414: hidden on tablet */}
```

---

### E-CR414-1d — `Header.jsx`: insert tablet channel dropdown

**Position:** After pills `</nav>`, inside left-section `</div>`, before POS2-002 comment

**`search_replace` old_str:**
```jsx
          </nav>
        </div>

        {/* POS2-002 Phase 3 (May-2026): Platform filter
```
**`search_replace` new_str:**
```jsx
          </nav>

          {/* CR-414: Tablet channel selector — visible tablet only (<768px), hidden desktop (OD-537-02, OD-414-01=A) */}
          <div className="relative md:hidden ml-2" ref={tabletDropdownRef}>
            <button
              data-testid="tablet-channel-dropdown-btn"
              onClick={() => setTabletDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#F5F5F5', color: COLORS.darkText }}
            >
              <span>≡</span>
              <span className="ml-1">
                {activeChannels.length === visibleChannels.length
                  ? 'All'
                  : (visibleChannels.find(c => c.id === activeChannels[0])?.label ?? 'Channels')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </button>
            {tabletDropdownOpen && (
              <div
                data-testid="tablet-channel-dropdown-menu"
                className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50 min-w-[160px] py-1"
              >
                <button
                  data-testid="tablet-channel-option-all"
                  onClick={() => { setActiveChannels(visibleChannels.map(c => c.id)); setTabletDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
                  style={{ color: activeChannels.length === visibleChannels.length ? COLORS.primaryOrange : COLORS.darkText }}
                >
                  All channels
                </button>
                {visibleChannels.map((ch) => {
                  const ChIcon = ch.icon;
                  const isActive = activeChannels.length === 1 && activeChannels[0] === ch.id;
                  return (
                    <button
                      key={ch.id}
                      data-testid={`tablet-channel-option-${ch.id}`}
                      onClick={() => { handleChannelToggle(ch.id); setTabletDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                      style={{ color: isActive ? COLORS.primaryOrange : COLORS.darkText, fontWeight: isActive ? 600 : 400 }}
                    >
                      <ChIcon className="w-4 h-4 flex-shrink-0" />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* POS2-002 Phase 3 (May-2026): Platform filter
```

---

### E-CR414-1e — `Header.jsx`: hide PlatformDropdown on tablet

**`search_replace` old_str:**
```jsx
        <div className="flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}>
```
**`search_replace` new_str:**
```jsx
        <div className="hidden md:flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}> {/* CR-414: hidden on tablet */}
```

---

### E-CR414-1f — `Header.jsx`: hide PlatformCounterChip on tablet

**`search_replace` old_str:**
```jsx
          <div className="flex items-center mr-3">
            <PlatformCounterChip webCount={webCount} posCount={posCount} />
          </div>
```
**`search_replace` new_str:**
```jsx
          <div className="hidden md:flex items-center mr-3"> {/* CR-414: hidden on tablet */}
            <PlatformCounterChip webCount={webCount} posCount={posCount} />
          </div>
```

---

### E-CR414-2a — `ChannelColumn.jsx`: add `isTablet` prop

**`search_replace` old_str:**
```javascript
  onHideColumn,      // Handler to hide this column
}) => {
```
**`search_replace` new_str:**
```javascript
  onHideColumn,      // Handler to hide this column
  isTablet = false,  // CR-414: fluid grid on tablet (OD-537-03)
}) => {
```

---

### E-CR414-2b — `ChannelColumn.jsx`: responsive grid template

**`search_replace` old_str:**
```javascript
                  style={{ 
                    gridTemplateColumns: viewType === 'table' 
                      ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                      : `repeat(${actualColumns}, 1fr)`,
                  }}
```
**`search_replace` new_str:**
```javascript
                  style={{ 
                    gridTemplateColumns: isTablet // CR-414: fluid grid on tablet (OD-537-03)
                      ? 'repeat(auto-fill, minmax(140px, 1fr))'
                      : viewType === 'table'
                        ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)`
                        : `repeat(${actualColumns}, 1fr)`,
                  }}
```

---

### E-CR414-3a — `ChannelColumnsLayout.jsx`: add `isTablet` state + resize listener

**`search_replace` old_str:**
```javascript
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);
```
**`search_replace` new_str:**
```javascript
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);

  // CR-414: detect tablet viewport (<768px) for fluid grid (OD-537-03, OD-414-02=A: localStorage persists)
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsTablet(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []); // CR-414: cleans up resize listener on unmount
```

---

### E-CR414-3b — `ChannelColumnsLayout.jsx`: pass `isTablet` to `ChannelColumn`

**`search_replace` old_str:**
```jsx
          onHideColumn={onHideColumn}
        />
      );
```
**`search_replace` new_str:**
```jsx
          onHideColumn={onHideColumn}
          isTablet={isTablet}          {/* CR-414: fluid grid on tablet */}
        />
      );
```

---

### E-CR414-3c — `ChannelColumnsLayout.jsx`: vertical stacking on tablet

**`search_replace` old_str:**
```jsx
      className="flex h-full gap-0 overflow-x-auto"
```
**`search_replace` new_str:**
```jsx
      className="flex flex-col md:flex-row h-full gap-0 overflow-x-auto" {/* CR-414: vertical on tablet */}
```

---

## Execution Sequence

```
1. Run Entry Verification (Anchors A–I) — abort on ANY mismatch
2. Apply Header.jsx edits (E-CR414-1a through 1f) — can all be issued in one parallel block
3. Apply ChannelColumn.jsx edits (E-CR414-2a + 2b) — parallel
4. Apply ChannelColumnsLayout.jsx edits (E-CR414-3a + 3b + 3c) — parallel
   → All 9 search_replace calls can be issued in ONE parallel tool-call block
5. Wait for webpack hot-reload: "Compiled successfully"
6. Run automated self-verification (V-grep checks)
7. Take screenshots at 600px, 768px, 1280px (V-1, V-2, V-9)
8. Run EXIT GATE (5 checkboxes)
9. Write QA Handover + Session Handover
```

---

## Verification Matrix (Step 4 — seeds QA)

| # | Edit | What to verify | Method | Automated? |
|---|------|---------------|--------|:---:|
| V-1 | E-CR414-1c/d | Tablet 600px — single-row header, no overflow | Screenshot 600px | NO |
| V-2 | E-CR414-1c/d | Channel dropdown button visible at 600px | Screenshot 600px | NO |
| V-3 | E-CR414-1d | Dropdown opens downward on tap (OD-414-01=A) | Browser interaction | NO |
| V-4 | E-CR414-1d | "All channels" option selects all channels | Tap "All" → all columns show | NO |
| V-5 | E-CR414-1d | Individual channel select works | Tap "Dine-In" → only Dine-In shows | NO |
| V-6 | E-CR414-1e/f | Web/POS counter + PlatformDropdown hidden at 600px | `hidden md:flex` grep | YES |
| V-7 | E-CR414-2b | Cards auto-fill at 600px (no fixed 160px) | Screenshot 600px — cards fill row | NO |
| V-8 | E-CR414-3c | Channels stack vertically at 600px | Screenshot — Dine-In above Walk-In | NO |
| V-9 | All | Desktop 1280px — layout completely unchanged | Screenshot 1280px | NO |
| V-10 | E-CR414-3b/2a | `isTablet` prop flows to ChannelColumn | grep `isTablet` in 3 files ≥ 1 each | YES |
| V-11 | OD-414-02=A | `< >` arrows visible + functional on tablet | Browser — tap `>` → count changes | NO |
| V-12 | All | webpack 0 new warnings | `yarn build` exit 0 | YES |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Desktop layout regresses | LOW | `md:flex` / `md:flex-row` / `md:hidden` classes only affect <768px. Desktop 1280px+ is pixel-identical. |
| `visibleChannels` undefined in dropdown | NONE | Already used by existing pills nav — same variable, same scope |
| `handleChannelToggle` exclusive selection on tablet | NONE | OD-537-02 says "same toggle behaviour as current pills" — exclusive selection is correct |
| `window.innerWidth` called during SSR | NONE | App is CSR-only (Create React App) |
| `tabletDropdownRef` click-outside conflicts with `dropdownRef` | NONE | Both listen independently on `document`; separate refs |
| `isTablet` state stale on orientation change | NONE | `resize` listener fires on orientation change; `setIsTablet` updates state |
| `onHideColumn` not passed to ChannelColumn JSX call | NONE | It already appears in the call (confirmed at HEAD L213-214); `isTablet` is appended |

---

## Post-Code Registry Checklist (Step 5 — EXIT GATE prerequisite)

```
□ 1. REGISTRY SYNC
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         d = json.load(f)
     items = {i['id']: i for i in d['items']}
     for cid in ['CR-414','BUG-537']:
         assert cid in items
         assert 'IMPLEMENTED' in items[cid].get('status','').upper()
         print(cid, '→', items[cid]['status'])
     "

□ 2. CR_REGISTRY.md + BUG_TRACKER.md: rows → GATE_5A_IMPLEMENTED

□ 3. FILE_OWNERSHIP.md: add CR-414 IMPL section for all 3 files

□ 4. CODE MARKERS
     grep -c "CR-414" src/components/layout/Header.jsx            → ≥ 6
     grep -c "CR-414" src/components/dashboard/ChannelColumn.jsx  → ≥ 2
     grep -c "CR-414" src/components/dashboard/ChannelColumnsLayout.jsx → ≥ 3

□ 5. COMPILE: yarn build exit 0, 0 new warnings
```

---

## Summary

| Field | Value |
|-------|-------|
| Edits | 9 (E-CR414-1a–1f · E-CR414-2a–2b · E-CR414-3a–3c) |
| Files | 3 (`Header.jsx` · `ChannelColumn.jsx` · `ChannelColumnsLayout.jsx`) |
| Lines added | ~60 (header dropdown ~40 + state/resize ~10 + grid/flex ~5 + markers) |
| Lines changed | ~6 (className additions) |
| Risk | HIGH |
| ODs | All locked |
| Desktop | **Completely unchanged** (all changes behind `md:` breakpoint) |
| Awaiting | Gate 4 GO |
