# CR-101 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/CR_101_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE — no employee filter in FilterBar or AllOrdersReportPage
**Risk:** LOW
**Scope Lock:** 2 files WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Auto? |
|--------|------|--------|---------------|:---:|
| 1 | `AllOrdersReportPage.jsx:174` | Add `punchedBy: null, collectedBy: null` to filters state | Code inspection | NO |
| 2 | `AllOrdersReportPage.jsx:~460` | Add filter logic for punchedBy + collectedBy | Browser: select employee → table filters | NO |
| 3 | `AllOrdersReportPage.jsx:~490` | Derive unique employee options from allOrders | Code inspection | NO |
| 4 | `AllOrdersReportPage.jsx:1004` | Pass options + props to FilterBar | Code inspection | NO |
| 5 | `FilterBar.jsx:199` | Add `punchedByOptions`, `collectedByOptions` props | Code inspection | NO |
| 6 | `FilterBar.jsx:~278` | Add 2 new Select dropdowns | Browser: dropdowns visible with employee names | NO |

---

## Edits (Execution Sequence)

### Edit 1: `AllOrdersReportPage.jsx` — Add filter keys to state

**Line:** L174-180
**Current:**
```js
  const [filters, setFilters] = useState({
    status: null,
    paymentMethod: null,
    channel: null,
    platform: null,
    paymentGateway: null,
  });
```
**New:**
```js
  const [filters, setFilters] = useState({
    status: null,
    paymentMethod: null,
    channel: null,
    platform: null,
    paymentGateway: null,
    punchedBy: null,     // CR-101: filter by who placed the order
    collectedBy: null,   // CR-101: filter by who collected payment
  });
```

### Edit 2: `AllOrdersReportPage.jsx` — Add filter logic in filter chain

**Line:** After the `paymentGateway` filter block (~L455, after `}`)
**New:** Add before the `return result;`:
```js
    // CR-101: Employee filters
    if (filters.punchedBy) {
      result = result.filter(o => o.punchedBy === filters.punchedBy);
    }
    if (filters.collectedBy) {
      result = result.filter(o => o.actionedBy === filters.collectedBy);
    }
```

### Edit 3: `AllOrdersReportPage.jsx` — Derive unique employee options

**Line:** After the filter chain useMemo (outside it), around L490 area
**New:**
```js
  // CR-101: Derive unique employee names for filter dropdowns
  const punchedByOptions = useMemo(() => {
    const names = [...new Set(allOrders.map(o => o.punchedBy).filter(Boolean).filter(n => n !== '—'))];
    return names.sort().map(n => ({ label: n, value: n }));
  }, [allOrders]);
  const collectedByOptions = useMemo(() => {
    const names = [...new Set(allOrders.map(o => o.actionedBy).filter(Boolean).filter(n => n !== '—'))];
    return names.sort().map(n => ({ label: n, value: n }));
  }, [allOrders]);
```

### Edit 4: `AllOrdersReportPage.jsx` — Pass to FilterBar

**Line:** L1004-1015 (FilterBar usage)
**Current:**
```jsx
            <FilterBar 
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearFilters}
              ...
              hasPlatformData={hasPlatformData}
            />
```
**New:** Add 2 props:
```jsx
            <FilterBar 
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearFilters}
              ...
              hasPlatformData={hasPlatformData}
              punchedByOptions={punchedByOptions}
              collectedByOptions={collectedByOptions}
            />
```

### Edit 5: `FilterBar.jsx` — Accept new props

**Line:** L199-209 (FilterBar props)
**Current:**
```js
const FilterBar = ({
  filters = {},
  onFilterChange,
  onClearAll,
  ...
  hasPlatformData = false,
}) => {
```
**New:** Add 2 props:
```js
const FilterBar = ({
  filters = {},
  onFilterChange,
  onClearAll,
  ...
  hasPlatformData = false,
  punchedByOptions = [],    // CR-101
  collectedByOptions = [],  // CR-101
}) => {
```

### Edit 6: `FilterBar.jsx` — Add 2 new Select dropdowns

**Line:** After the PG dropdown (after L277 `testId="filter-payment-gateway" />`), before the `{hasActiveFilters && (` block
**New:**
```jsx
          {/* CR-101: Punched By filter */}
          {punchedByOptions.length > 0 && (
            <Select
              value={filters.punchedBy}
              options={punchedByOptions}
              onChange={(val) => onFilterChange('punchedBy', val)}
              placeholder="Punched By"
              testId="filter-punched-by"
            />
          )}
          {/* CR-101: Collected By filter */}
          {collectedByOptions.length > 0 && (
            <Select
              value={filters.collectedBy}
              options={collectedByOptions}
              onChange={(val) => onFilterChange('collectedBy', val)}
              placeholder="Collected By"
              testId="filter-collected-by"
            />
          )}
```

---

## Design Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Options derived client-side | YES | Same pattern as other filters. No new API call. |
| 2 | Hidden when empty | YES | `{options.length > 0 && ...}` — no empty dropdown |
| 3 | Apply to all tabs | YES | punchedBy exists on all orders |
| 4 | "Collected By" maps to `actionedBy` | YES | `actionedBy` covers collected/cancelled/merged. Label "Collected By" matches settled tab. |

---

## Scope Lock

**Files WILL change:**
- `pages/AllOrdersReportPage.jsx` (4 edits: state + filter + options + props)
- `components/reports/FilterBar.jsx` (2 edits: props + dropdowns)

**Files WILL NOT touch:**
- reportTransform.js, reportService.js, OrderTable.jsx, FilterTags.jsx

## Post-Code Registry Checklist
- [ ] registry.json: CR-101 → IMPLEMENTED
- [ ] CR_REGISTRY.md row updated
- [ ] FILE_OWNERSHIP.md: add AllOrdersReportPage.jsx + FilterBar.jsx with CR-101
- [ ] Code markers: // CR-101

---

**Next:** Gate 4 GO → Implementation
