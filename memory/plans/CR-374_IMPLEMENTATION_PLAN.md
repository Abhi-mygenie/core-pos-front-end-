# Gate 3 — Implementation Plan: CR-374
## BulkEditor Filter Panel (Status / Type / Category)

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 3)
**Protocol:** AGENT_PROMPT_ALPHA v0.7
**IA verified:** All line refs confirmed live. No drift.
**Batch:** A — item 4. Implement AFTER BUG-392 (both touch BulkEditor, different sections).

---

## Entry Verification ✅

| Plan says | Live code | Match? |
|---|---|---|
| Line 242: `const [search, setSearch]` | confirmed | ✅ |
| Line 244: `const [sortDir, setSortDir]` | confirmed | ✅ |
| Line 425: `const groupedRows = useMemo` | confirmed | ✅ |
| Line 471: `}, [rows, search, sortCol, sortDir]);` | confirmed | ✅ |
| Line 959: column chips `<div>` | confirmed | ✅ |
| Line 275: menuType useEffect `}, [menuType]);` | confirmed | ✅ |
| Filter state (filterStatus/Type/CategoryId): 0 results | confirmed | ✅ |

---

## Edits

### E1 — After line 244: Add 3 filter state fields
**File:** `src/components/panels/menu/BulkEditor.jsx`

```js
// After: const [sortDir, setSortDir] = useState("asc");
// Add:
const [filterStatus,     setFilterStatus]     = useState('all');  // CR-374: 'all'|'active'|'inactive'
const [filterType,       setFilterType]       = useState('all');  // CR-374: 'all'|'veg'|'nonveg'|'egg'|'jain'
const [filterCategoryId, setFilterCategoryId] = useState(null);   // CR-374: null | categoryId number
```

---

### E2 — Lines 425–471: Add filter passes to groupedRows useMemo
**File:** `src/components/panels/menu/BulkEditor.jsx`

**Current line 426–427:**
```js
  const groupedRows = useMemo(() => {
    let result = rows;
    if (search) {
```

**Replace the opening of groupedRows to add filters BEFORE search:**
```js
  const groupedRows = useMemo(() => {
    let result = rows;
    // CR-374: status / type / category filter passes (new rows always pass)
    if (filterStatus !== 'all') {
      const want = filterStatus === 'active' ? 1 : 0;
      result = result.filter(r => r._isNew || r.status === want);
    }
    if (filterType !== 'all') {
      const typeMap = { veg: 1, nonveg: 0, egg: 2, jain: 3 };
      result = result.filter(r => r._isNew || r.itemType === typeMap[filterType]);
    }
    if (filterCategoryId !== null) {
      result = result.filter(r => r._isNew || r.categoryId === filterCategoryId);
    }
    if (search) {
```

**Also update useMemo deps (line 471):**
```js
FROM:  }, [rows, search, sortCol, sortDir]);
TO:    }, [rows, search, sortCol, sortDir, filterStatus, filterType, filterCategoryId]); // CR-374
```

---

### E3 — After line 958 (before line 959 column chips): Insert filter strip JSX
**File:** `src/components/panels/menu/BulkEditor.jsx`

Insert between toolbar `</div>` and column chips `<div>`:

```jsx
      {/* CR-374: Always-visible filter strip (OD-374-01: always visible, OD-374-02: category dropdown) */}
      {(() => {
        const hasFilters = filterStatus !== 'all' || filterType !== 'all' || filterCategoryId !== null;
        const pill = (label, active, onClick, testId) => (
          <button onClick={onClick}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${active ? 'text-white border-transparent' : 'border-gray-200 hover:bg-orange-50'}`}
            style={active ? { background: COLORS.primaryOrange } : { color: COLORS.grayText }}
            data-testid={testId}>
            {label}
          </button>
        );
        return (
          <div className="flex items-center gap-4 px-5 py-2 border-b flex-shrink-0 flex-wrap"
            style={{ background: COLORS.sectionBg, borderColor: COLORS.borderGray }}
            data-testid="bulk-filter-strip">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Status:</span>
              {pill('All',      filterStatus === 'all',      () => setFilterStatus('all'),      'filter-status-all')}
              {pill('Active',   filterStatus === 'active',   () => setFilterStatus('active'),   'filter-status-active')}
              {pill('Inactive', filterStatus === 'inactive', () => setFilterStatus('inactive'), 'filter-status-inactive')}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Type:</span>
              {pill('All',     filterType === 'all',    () => setFilterType('all'),    'filter-type-all')}
              {pill('Veg',     filterType === 'veg',    () => setFilterType('veg'),    'filter-type-veg')}
              {pill('Non-Veg', filterType === 'nonveg', () => setFilterType('nonveg'), 'filter-type-nonveg')}
              {pill('Egg',     filterType === 'egg',    () => setFilterType('egg'),    'filter-type-egg')}
              {pill('Jain',    filterType === 'jain',   () => setFilterType('jain'),   'filter-type-jain')}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Category:</span>
              <select value={filterCategoryId ?? ''}
                onChange={e => setFilterCategoryId(e.target.value === '' ? null : Number(e.target.value))}
                className="text-xs rounded-lg border px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-orange-200"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                data-testid="filter-category-select">
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={() => { setFilterStatus('all'); setFilterType('all'); setFilterCategoryId(null); }}
                className="text-xs underline ml-auto"
                style={{ color: COLORS.primaryOrange }}
                data-testid="filter-clear-btn">
                Clear Filters
              </button>
            )}
          </div>
        );
      })()}
```

---

### E4 — After line 275 (menuType useEffect): Add filter reset useEffect
**File:** `src/components/panels/menu/BulkEditor.jsx`

```js
// After: }, [menuType]); // CR-140
// Add:
  useEffect(() => { // CR-374: OD-374-03 — reset filters on menu type switch
    setFilterStatus('all');
    setFilterType('all');
    setFilterCategoryId(null);
  }, [menuType]);
```

---

## Summary

| Edit | Location | Lines added | Risk |
|---|---|---|---|
| E1 | Line 244 (after) | +4 | NONE |
| E2 | Lines 425–471 | +12 | LOW |
| E3 | Line 958 (after) | +52 | LOW |
| E4 | Line 275 (after) | +5 | NONE |
| **Total** | `BulkEditor.jsx` only | **~73 lines** | **MEDIUM** |

> Note: E3 is slightly larger than IA estimated (52 vs 45) due to data-testid props added for QA. Still 1 file only.

---

## Verification Matrix

| # | Test | Expected | testid |
|---|---|---|---|
| V1 | Active filter | Only active rows shown | `filter-status-active` |
| V2 | Inactive filter | Only inactive rows shown | `filter-status-inactive` |
| V3 | Veg type filter | Only Veg itemType rows | `filter-type-veg` |
| V4 | Category dropdown | Only selected category rows | `filter-category-select` |
| V5 | Combined (Active + Veg) | Intersection shown | — |
| V6 | Select All on filtered | Only visible rows selected | — |
| V7 | New rows always visible | `_isNew` rows pass all filters | — |
| V8 | Clear Filters | All rows visible, strip resets | `filter-clear-btn` |
| V9 | Search + filter combined | Both applied | — |
| V10 | menuType switch | Filters reset to All | — |
| V11 | Save / Delete unaffected | Existing ops work | — |
| V12 | Compile 0 warnings | Webpack | Automated |

---

## Post-Code Registry Checklist

```
□ registry.json: CR-374 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
□ CR_REGISTRY.md: row → IMPLEMENTED
□ FILE_OWNERSHIP.md: BulkEditor.jsx → CR-374 E1–E4 (date)
□ Code markers: // CR-374 on all 4 edits
□ Do NOT touch line 682 (OG-AUDIT-003 — pre-release marker concern)
□ Compile: 0 new warnings
```

---

*Gate 3 complete. 1 file, ~73 lines, 4 edits. Implement AFTER BUG-392 in Batch A.*
