# BUG-640 + CR-481 — Impact Analysis + Implementation Plan

**Gate:** 2 (Impact Analysis) + 3 (Implementation Plan)
**Items:** BUG-640 (P1, fmtISO timezone off-by-1) + CR-481 (P2, standardize presets)
**Code Reality:** NONE for both
**Conflict Pre-Check:** 9 active items touch report pages but all are at QA/smoke stage — parallel-safe (our changes are in fmtISO + preset arrays, not report logic)

---

## IMPACT ANALYSIS (Gate 2)

### BUG-640: Scope

| Component | Occurrences | Bug? |
|---|---|---|
| `const fmtISO = (d) => d.toISOString().slice(0, 10)` | 37 files (each has own copy) | ✅ YES — all shifted by 1 day in IST |
| `InsightsCacheContext.jsx` L12: `new Date().toISOString().slice(0, 10)` | 1 file | ✅ YES — initial "today" wrong before 05:30 AM IST |
| Inline `toISOString().slice` for `maxToDate`/`minFromDate` | ~10 extra usages in 5 files | ✅ YES — date caps shifted |
| `DashboardMockup.jsx` L52: `const fmt = (d) => d.toISOString().slice(0, 10)` | 1 file (different name) | ✅ YES — same bug, named `fmt` not `fmtISO` |
| **Total affected lines** | **~48 occurrences across 38 files** | |

### CR-481: Scope

| Current Preset Set | Page Count | Target |
|---|---|---|
| `[Today, 7D, LM, MTD, FY]` | 2 | ✅ Already close — add `30D` |
| `[Today, 7D, LM, MTD]` | 5 | Add `30D, FY` |
| `[Today, 7D, 30D, MTD]` | 5 | Add `LM, FY` |
| `[Today, 7D, 30D, MTD, FY]` | 2 | Add `LM` |
| `[7D, 30D, MTD]` | 1 | Add `Today, LM, FY` |
| `[Today, Yesterday, 7D, LM, 90D, 365D, MTD, YTD]` | 1 (Settlement) | Keep as-is (superset) |
| Various other combos (28 pages with different render pattern) | 28 | Update preset array + ensure handler covers LM, 30D, FY |
| **Total pages to update** | **~37** (Settlement stays as-is) | |

### Combined fix approach

Since BUG-640 and CR-481 touch the **exact same code** (fmtISO definition + handlePreset function + preset array) in each file, they should be done in a single pass per file:

1. Fix `fmtISO` → local date (BUG-640)
2. Update preset array → `[Today, 7D, LM, 30D, MTD, FY]` (CR-481)
3. Ensure `handlePreset` covers `LM`, `30D`, `FY` if missing (CR-481)

---

## IMPLEMENTATION PLAN (Gate 3)

### Strategy: Shared utility + per-file update

**OD-481-02 locked: shared constant, no new component.**

**Step 1:** Create a shared utility file with:
- Fixed `fmtISO` (local timezone)
- Standard preset array constant
- Standard `computePresetRange(preset)` function returning `{ from, to }`

**Step 2:** In each of the 38 files:
- Replace inline `fmtISO` with import from shared utility
- Replace preset array with shared constant
- Replace/simplify `handlePreset` to use `computePresetRange`

### E0 — New shared utility: `src/utils/datePresets.js`

```js
// BUG-640 + CR-481: Shared date preset utility for all Insights report pages

// BUG-640 fix: local timezone date formatting (was toISOString which converts to UTC)
export const fmtISO = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// CR-481: Standard preset set for all Insights pages
export const DATE_PRESETS = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];

// CR-481: Compute FROM/TO for a given preset
export const computePresetRange = (preset) => {
  const now = new Date();
  const today = fmtISO(now);
  let f, t = today;

  switch (preset) {
    case 'Today':
      f = today;
      break;
    case '7D':
      f = fmtISO(new Date(now.getTime() - 6 * 86400000));
      break;
    case 'LM': {
      const lf = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lt = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmtISO(lf), to: fmtISO(lt) };
    }
    case '30D':
      f = fmtISO(new Date(now.getTime() - 29 * 86400000));
      break;
    case 'MTD':
      f = fmtISO(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
    case 'FY': {
      const fyEndYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: fmtISO(new Date(fyEndYear - 1, 3, 1)), to: fmtISO(new Date(fyEndYear, 2, 31)) };
    }
    default:
      return null;
  }
  return { from: f, to: t };
};
```

### E1 — InsightsCacheContext.jsx (1 edit)

**Current L12:**
```js
const today = new Date().toISOString().slice(0, 10);
```

**New:**
```js
import { fmtISO } from '../utils/datePresets'; // BUG-640
const today = fmtISO(new Date());
```

### E2 — Each of 37 report pages (mechanical per file)

For each file, 3 changes:

**a) Replace fmtISO definition with import:**
```js
// Remove: const fmtISO = (d) => d.toISOString().slice(0, 10);
// Add:
import { fmtISO, DATE_PRESETS, computePresetRange } from '../../utils/datePresets'; // BUG-640 + CR-481
```

**b) Replace preset array:**
```js
// Remove: {['Today', '7D', '30D', 'MTD'].map((p) => (
// Replace with:
{DATE_PRESETS.map((p) => (
```

**c) Simplify handlePreset to use computePresetRange:**
```js
const handlePreset = (p) => {
  const range = computePresetRange(p);
  if (!range) return;
  setFromDate(range.from); setToDate(range.to);
  setAppliedFrom(range.from); setAppliedTo(range.to);
  setActivePreset(p);
};
```

**d) Fix inline toISOString usages (maxToDate, minFromDate):**
```js
// Remove: .toISOString().slice(0, 10)
// Replace with: use fmtISO()
const maxToDate = fromDate ? fmtISO(new Date(new Date(fromDate).getTime() + MAX_RANGE_DAYS * 86400000)) : '';
```

### Settlement exception

`SettlementReportMockup.jsx` keeps its extended set `[Today, Yesterday, 7D, LM, 90D, 365D, MTD, YTD]` — only fix its `fmtISO` (BUG-640), don't change its preset array.

---

## Verification Matrix

| # | Change | How to Verify |
|---|--------|--------------|
| V1 | fmtISO returns local date | Unit: `fmtISO(new Date(2026, 9, 1))` → `"2026-10-01"` (not `"2026-09-30"`) |
| V2 | LM preset correct | Browser: click LM on any page → FROM shows 1st, TO shows last day of prev month |
| V3 | All 6 presets visible | Browser: check any page → `[Today, 7D, LM, 30D, MTD, FY]` |
| V4 | Settlement keeps extended set | Browser: Settlement → 8 presets still visible |
| V5 | Manual date picker unaffected | Browser: pick dates manually → correct range sent |
| V6 | Existing charts/tables unaffected | Browser: data renders same as before |

---

## File List

| # | File | Changes |
|---|------|---------|
| 0 | **`src/utils/datePresets.js`** (NEW) | fmtISO + DATE_PRESETS + computePresetRange |
| 1 | `InsightsCacheContext.jsx` | Import fmtISO, replace toISOString |
| 2-38 | 37 report pages | Import shared utils, replace fmtISO/preset array/handlePreset/inline toISOString |

**Total: 1 new file + 38 modified files**

## Scope Lock
- **Files WILL change:** `datePresets.js` (new), `InsightsCacheContext.jsx`, 37 × `pages/reports-module/*.jsx`
- **Files will NOT touch:** API services, transforms, any non-report component, `reportExporter.js`
