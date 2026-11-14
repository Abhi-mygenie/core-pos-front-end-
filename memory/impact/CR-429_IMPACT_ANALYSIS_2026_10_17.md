# CR-429 — Impact Analysis (Gate 2)
## Active Only toggle in Channel View

**ID:** CR-429
**Stage:** Gate 2 | **Date:** 2026-10-17
**Risk:** LOW | **Priority:** P2

---

## Code Reality: NONE
No `activeOnly` toggle or filter exists in Channel View. `channelData` items always include available tables.

## Conflict Pre-Check: NONE
No open item touches `ChannelColumnsLayout.jsx` or the `channelActiveOnly` localStorage key.
`DashboardPage.jsx` (R5) — last modified by BUG-527 (2026-10-10). No active open item on R5 section being touched.

---

## Data Flow Trace

```
DashboardPage.jsx:773
  channelData = useMemo(...)   ← builds channels with ALL items (available + occupied)

DashboardPage.jsx:1790-1802
  <ChannelColumnsLayout
    channels={Object.values(channelData).filter(c => c.enabled && !hidden)}
    viewType={...}
    groupingMode={dashboardView}   ← 'channel' | 'status'
  />

ChannelColumnsLayout.jsx:116-118
  enabledChannels = channels.filter(c => c.enabled !== false)
  ← INSERTION POINT: filter each channel's items when activeOnly=true

ChannelColumnsLayout.jsx:162-164
  renderColumns: skip channel if actualCols === 0
  ← item count drives column count — must filter items BEFORE this step

ChannelColumn.jsx:69-73
  filteredItems = channel.items filtered by matchingIds (search)
  ← safe; activeOnly filter is upstream

ChannelColumn.jsx:135
  isAvailable = (it) => it?.status === 'available' || it?.status === 'disabled'
  ← already defined; no change needed
```

**Break point:** `enabledChannels` useMemo in `ChannelColumnsLayout.jsx` — items are never filtered by active status. Fix goes here.

---

## Exact Edits Required

### E-1 — localStorage constant (DashboardPage.jsx, near other localStorage constants)
```javascript
const CHANNEL_ACTIVE_ONLY_KEY = 'mygenie_channel_active_only'; // CR-429
```

### E-2 — State declaration (DashboardPage.jsx, near dashboardView state ~L419)
```javascript
const [channelActiveOnly, setChannelActiveOnly] = useState(
  () => localStorage.getItem(CHANNEL_ACTIVE_ONLY_KEY) === 'true'
); // CR-429
```

### E-3 — Handler (DashboardPage.jsx, near other toggle handlers)
```javascript
const handleChannelActiveOnlyToggle = () => { // CR-429
  const next = !channelActiveOnly;
  setChannelActiveOnly(next);
  localStorage.setItem(CHANNEL_ACTIVE_ONLY_KEY, String(next));
};
```

### E-4 — Pass props to Header (DashboardPage.jsx, <Header ...> props)
```javascript
channelActiveOnly={channelActiveOnly}
onChannelActiveOnlyToggle={handleChannelActiveOnlyToggle}
```

### E-5 — Pass prop to ChannelColumnsLayout (DashboardPage.jsx, ~L1790)
```javascript
activeOnly={dashboardView === 'channel' && channelActiveOnly}
```

### E-6 — Accept prop in Header.jsx (destructure + add toggle pill)
Accept `channelActiveOnly` + `onChannelActiveOnlyToggle` in Header props.
Add "Active Only" pill after the Schedule pill — visible only when `dashboardView === 'channel'`:
```jsx
{/* CR-429: Active Only toggle — Channel View only */}
{dashboardView === 'channel' && (
  <button
    data-testid="filter-active-only"
    onClick={onChannelActiveOnlyToggle}
    className="py-2 px-2.5 rounded-lg text-sm font-medium transition-colors"
    style={{
      backgroundColor: channelActiveOnly ? `${COLORS.primaryOrange}15` : 'transparent',
      color: channelActiveOnly ? COLORS.primaryOrange : COLORS.grayText,
      border: channelActiveOnly ? `1px solid ${COLORS.primaryOrange}` : '1px solid transparent',
    }}
  >
    Active Only
  </button>
)}
```

### E-7 — Filter items in ChannelColumnsLayout.jsx (enabledChannels useMemo)
```javascript
const enabledChannels = useMemo(() => {
  let chs = channels.filter(c => c.enabled !== false);
  if (activeOnly) { // CR-429
    chs = chs.map(c => ({
      ...c,
      items: (c.items || []).filter(
        it => !['available', 'disabled', 'reserved'].includes(it.status)
      ),
    }));
  }
  return chs;
}, [channels, activeOnly]); // CR-429: add activeOnly dep
```

---

## Scope Lock

**WILL change:**
| File | Edit | Risk |
|---|---|---|
| `src/pages/DashboardPage.jsx` | E-1–E-5: constant + state + handler + 2 prop passes | R5 hotspot — minimal touch (~8 lines) |
| `src/components/layout/Header.jsx` | E-6: accept 2 props + add 1 toggle pill (~12 lines) | LOW |
| `src/components/dashboard/ChannelColumnsLayout.jsx` | E-7: accept `activeOnly` prop + filter in useMemo (~8 lines) | LOW |

**WILL NOT touch:**
`ChannelColumn.jsx` · `StatusConfigPage.jsx` · `orderTransform.js` · any API/financial file

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Column count wrong when filtering | ADDRESSED | Filter at `enabledChannels` level — column count uses `c.items.length` AFTER filter |
| R5 DashboardPage.jsx edit | LOW | Only adds state + passes props; no existing logic touched |
| Channel with all-available tables disappears | EXPECTED | Correct behaviour — channel auto-hides via existing `actualCols === 0` check |
| Status View unaffected | CONFIRMED | `activeOnly` prop only passed as `true` when `dashboardView === 'channel'` |
| localStorage key clash | NO | `mygenie_channel_active_only` is a new unique key |

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Channel View → toggle OFF (default) | All tables visible including Available ones |
| V2 | Channel View → toggle ON | Only occupied/active tables visible; Available tables gone |
| V3 | Toggle ON → channel with all available tables | Entire channel column disappears |
| V4 | Toggle ON → refresh page | Toggle state remembered (localStorage) |
| V5 | Switch to Status View with toggle ON | Status View unaffected — still shows all active orders |
| V6 | Toggle ON → search a table | Search still works across visible active tables |

---

## Post-Code Registry Checklist
```
□ registry.json: CR-429 → GATE_5A_IMPLEMENTED
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: 3 files + CR-429 + date
□ Code markers: // CR-429 on every new line
□ Compile: 0 new warnings
```

*Gate 2 complete — 2026-10-17. Awaiting Gate 3 (Implementation Plan) on owner GO.*
