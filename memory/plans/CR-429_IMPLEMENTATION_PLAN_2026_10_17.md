# CR-429 — Implementation Plan (Gate 3)
## Active First toggle — Channel View

**ID:** CR-429
**Stage:** Gate 3 | **Date:** 2026-10-17
**Risk:** LOW | **Role:** PLANNING Agent
**IA doc:** `/app/memory/impact/CR-429_IMPACT_ANALYSIS_2026_10_17.md`

---

## IA Correction (requirement updated after Gate 2)
Original IA described "Active Only" (filter out available tables). Requirement confirmed as **"Active First"** — occupied tables sort to top, available tables push below; nothing is hidden.

**Impact on scope:**
- `ChannelColumnsLayout.jsx` no longer needs to filter items — only needs to pass the prop down
- `ChannelColumn.jsx` now requires a sort change in the `sortedGroups` useMemo (was not in original IA)

Updated file count: **4 files** (was 3)

---

## Code Reality: NONE
No `activeFirst` prop or `mygenie_channel_active_first` key exists anywhere.

## Conflict Pre-Check: NONE
No open item touches any of the 4 target files in the relevant sections.

---

## Scope Lock

**WILL change:**

| File | Section | Risk |
|---|---|---|
| `src/pages/DashboardPage.jsx` | Add state + 2 prop passes to Header + 1 prop to ChannelColumnsLayout | R5 hotspot — minimal touch (~6 lines) |
| `src/components/layout/Header.jsx` | Accept 2 props + add Active First pill | LOW (~14 lines) |
| `src/components/dashboard/ChannelColumnsLayout.jsx` | Accept `activeFirst` prop + pass to ChannelColumn | LOW (~4 lines) |
| `src/components/dashboard/ChannelColumn.jsx` | Accept `activeFirst` prop + sort branch in sortedGroups useMemo | LOW (~8 lines) |

**WILL NOT touch:**
`StatusConfigPage.jsx` · `orderTransform.js` · any API/financial file · `sortByActiveFirst` utility

---

## Exact Edits

---

### E-1 — State in DashboardPage.jsx
**After line 429** (`});` closing the dashboardView useState)

```javascript
  const [channelActiveFirst, setChannelActiveFirst] = useState(
    () => localStorage.getItem('mygenie_channel_active_first') === 'true'
  ); // CR-429
```

---

### E-2 — Props to Header in DashboardPage.jsx
**After line 1779** (`posCount={platformCounts.pos}`)

```javascript
          channelActiveFirst={channelActiveFirst}
          onChannelActiveFirstToggle={() => { // CR-429
            const next = !channelActiveFirst;
            setChannelActiveFirst(next);
            localStorage.setItem('mygenie_channel_active_first', String(next));
          }}
```

---

### E-3 — Prop to ChannelColumnsLayout in DashboardPage.jsx
**After line 1805** (`groupingMode={dashboardView}`)

```javascript
                activeFirst={dashboardView === 'channel' && channelActiveFirst} // CR-429
```

---

### E-4 — Header.jsx: accept props + add Active First pill
**Step A** — add to destructured props (near `dashboardView = 'channel'` at ~L46):
```javascript
  channelActiveFirst,         // CR-429
  onChannelActiveFirstToggle, // CR-429
```

**Step B** — add pill inside the Channel View branch, after the Schedule button (after the closing `</button>` of Schedule at ~L336, before `</>` at L337):
```jsx
              {/* CR-429: Active First toggle — Channel View only */}
              <div style={{ width: 1, height: 18, background: '#E5E5E5', margin: '0 4px' }} />
              <button
                data-testid="filter-active-first"
                onClick={onChannelActiveFirstToggle}
                className="py-2 px-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: channelActiveFirst ? 'rgba(242,107,51,0.08)' : 'transparent',
                  color: channelActiveFirst ? COLORS.primaryOrange : COLORS.grayText,
                  border: channelActiveFirst ? `1.5px solid ${COLORS.primaryOrange}` : '1.5px solid transparent',
                }}
              >
                Active First
              </button>
```

---

### E-5 — ChannelColumnsLayout.jsx: accept + pass prop
**Step A** — add to destructured props (after `onHideColumn` ~L87):
```javascript
  activeFirst = false,  // CR-429
```

**Step B** — pass to `<ChannelColumn>` inside `renderColumns` (after `isTablet={isTablet}` ~L224):
```javascript
          activeFirst={activeFirst}  // CR-429
```

---

### E-6 — ChannelColumn.jsx: accept prop + sort branch
**Step A** — add to destructured props (after `isTablet = false` at L66):
```javascript
  activeFirst = false,  // CR-429
```

**Step B** — in `sortedGroups` useMemo Step 3 (replace the `else` branch at L165-169):
```javascript
      } else if (activeFirst) {
        // CR-429: Active First — occupied tables before available, label-numeric within each group
        const isAvail = (it) => ['available', 'disabled', 'reserved'].includes(it.status);
        const occ   = bucket.items.filter(it => !isAvail(it)).sort(compare);
        const avail = bucket.items.filter(it =>  isAvail(it)).sort(compare);
        bucket.items = [...occ, ...avail];
      } else {
        // BUG-245: channel mode — stable label-numeric sort, no occupied-first bucketing
        bucket.items.sort(compare);
      }
```

**Step C** — add `activeFirst` to sortedGroups useMemo deps (L180):
```javascript
  }, [filteredItems, groupingMode, viewType, activeFirst]); // CR-429: add activeFirst dep
```

---

## Execution Sequence

```
E-1 → E-2 → E-3  (DashboardPage.jsx — all in one file, do together)
E-4              (Header.jsx)
E-5              (ChannelColumnsLayout.jsx)
E-6              (ChannelColumn.jsx)
Compile check after all edits
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| R5 DashboardPage.jsx edit | LOW | Only adds state + passes props; no existing logic modified |
| `activeFirst` not guarded for status view | ADDRESSED | Passed as `dashboardView === 'channel' && channelActiveFirst` — always false in status view |
| `activeFirst` dep missing from sortedGroups | ADDRESSED | E-6 Step C adds it explicitly |
| Stable sort broken for occupied cards | NONE | Only the `else` branch changed; occupied cards keep label-numeric sort via `occ.sort(compare)` |
| `reserved` status not covered | ADDRESSED | Included in `isAvail` check alongside `available` and `disabled` |

---

## Verification Matrix (seeds QA handover)

| # | Test | File exercised | How to verify |
|---|---|---|---|
| V1 | "Active First" pill visible in Channel View header | Header.jsx E-4 | Browser: Channel View → pill appears after Schedule |
| V2 | Pill not visible in Status View | Header.jsx E-4 | Switch to Status View → pill gone |
| V3 | Toggle ON → occupied tables at top | ChannelColumn.jsx E-6 | Toggle → Dine-In shows occupied first, available below |
| V4 | Toggle ON → available tables still visible | ChannelColumn.jsx E-6 | Available cards still render below occupied ones |
| V5 | Toggle OFF → label-numeric order restored | ChannelColumn.jsx E-6 | Toggle off → tables back to 1, C-1, 2, C-2 order |
| V6 | Persists after page reload | DashboardPage.jsx E-1 | Toggle ON → reload → still ON |
| V7 | Status View sort unaffected | ChannelColumn.jsx E-6 | Status View → cards sort as before |

---

## Post-Code Registry Checklist
```
□ registry.json: CR-429 → GATE_5A_IMPLEMENTED
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: 4 files + CR-429 + date
□ Code markers: // CR-429 on every new line
□ Compile: 0 new warnings
```

*Gate 3 complete — 2026-10-17. Awaiting Gate 4 GO.*
