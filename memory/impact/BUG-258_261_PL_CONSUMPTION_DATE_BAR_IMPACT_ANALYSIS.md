# Impact Analysis — BUG-258 + BUG-261 (P&L + Consumption Date Bar Rewrite)

**IDs:** BUG-258, BUG-261
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-27
**Code Reality:** PARTIAL (max dates already fixed by BUG-260 fast lane; presets + UI rewrite NOT done)
**Conflict Pre-Check:** No active items touch PLReportPage or ConsumptionReportPage. CLEAR.
**Risk:** MEDIUM

---

## Scope

Rewrite the date-range header bar in PLReportPage.jsx and ConsumptionReportPage.jsx to match the established ExpenseReportPage pattern:
- CalendarIcon + From/To date inputs with `max`
- Apply button (green when dirty, disabled when clean)
- Preset pill bar: `[Today, 7D, 30D, MTD]`, default = 7D
- Shared date state via InsightsCacheContext (optional — only if these reports are under Insights)

---

## Reference Implementation

**File:** `ExpenseReportPage.jsx` (lines 295-338)

**Pattern:**
```
<header>
  ← Back | Title + subtitle
  | CalendarIcon [From date] - [To date] | ✓ Apply | [Today][7D][30D][MTD] | Download ↓
</header>
```

**State pattern:**
```js
const [fromDate, setFromDate] = useState(sharedFrom || fmtISO(today));
const [toDate, setToDate] = useState(sharedTo || fmtISO(today));
const [appliedFrom, setAppliedFrom] = useState(...);
const [appliedTo, setAppliedTo] = useState(...);
const [activePreset, setActivePreset] = useState('Today');

const applyPreset = (preset) => { /* set dates based on preset */ };
const handleApply = () => { /* copy draft → applied, clear preset */ };
const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
```

---

## Data Flow Trace

### PLReportPage.jsx
- **Current:** `fromDate`/`toDate` → `fetchData()` → `getProfitLossReport(fromDate, toDate)` → `data`
- **After:** Add `appliedFrom`/`appliedTo` intermediate state + preset handler
- API call stays the same: `getProfitLossReport(appliedFrom, appliedTo)`
- No transform or API changes needed

### ConsumptionReportPage.jsx
- **Current:** `fromDate`/`toDate` → `fetchReport()` → `getDailyConsumptionReport({ from_date, to_date })`
- **After:** Same pattern — add applied state + preset handler
- API call unchanged

---

## Affected Files

| File | Change | Lines Est. |
|------|--------|:---:|
| `PLReportPage.jsx` | Rewrite header section (lines 139-165): replace simple date bar with ExpenseReport pattern. Add state: appliedFrom/To, activePreset, applyPreset(), handleApply(), draftDirty/Valid. Default preset = '7D'. | ~60 |
| `ConsumptionReportPage.jsx` | Rewrite filter bar (lines 138-238): replace simple date inputs with preset pill bar in header. Move category/search filters below. Add same state pattern as above. Default preset = '7D'. | ~70 |

## Files NOT Touched
- ExpenseReportPage.jsx (reference only)
- API services (no contract changes)
- Sidebar, App.js (routes unchanged)
- InsightsCacheContext (optional — not required for P&L/Consumption which are under Daily Reports, not Insights)

---

## Owner Decisions
- OD-1 (LOCKED): Preset pattern `[Today, 7D, 30D, MTD]` confirmed.
- OD-2 (NEW): **Default preset for P&L — '7D' or 'Today'?** Recommend '7D' to match ExpenseReport.
- OD-3 (NEW): **Default preset for Consumption — '7D' or 'MTD'?** Currently defaults to month start. Recommend keeping MTD since consumption typically reviewed monthly.

---

## Risk Register
- **LOW:** No API changes, no financial logic, no state management beyond local component
- **MEDIUM (mitigated):** UI rewrite could break existing date flow — mitigated by following proven ExpenseReport pattern exactly
