# BUG-353 — Implementation Plan (Gate 3) — REVISED
## All Backend-Aggregated Report Pages: Date Range Caps + OrderReportBeta Chunking

**Date:** 2026-10-19 (revised — scope expanded to all backend-agg pages)
**Stage:** Gate 3 — Implementation Plan
**Author:** Planning Agent (AGENT_PROMPT_ALPHA v0.7 Role 2)
**IA reference:** `impact/BUG-353_IMPACT_ANALYSIS_V2_2026_10_19.md`
**Risk:** MEDIUM
**Sprint:** oct_cr_batch

---

## Decisions Locked

| OD | Value |
|----|-------|
| OD-353-01 | **730 days** — no practical limit for the cap pages; chunking handles any range for OrderReportBeta |
| OD-353-02 | **Text in existing spinner** — `"Loading data… (month X of N)"` |
| OD-353-03 | Excel export stays backend-capped — out of scope |

---

## Scope Lock

**Files WILL change (7 total):**
1. `src/pages/reports-module/SalesMockup.jsx`
2. `src/pages/reports-module/PaymentsMockup.jsx`
3. `src/pages/reports-module/DashboardMockup.jsx`
4. `src/pages/reports-module/ItemSalesHybridMockup.jsx`
5. `src/pages/reports-module/CancellationsMockup.jsx`
6. `src/api/services/reportService.js`
7. `src/pages/reports-module/OrderReportBetaPage.jsx`

**Files WILL NOT touch:** `constants.js` · `insightsService.js` · any transform · `orderTransform.js` ·
`CollectPaymentPanel.jsx` · any socket handler · any other report page · any financial logic

---

## Edits 1–5 — FE Cap Lift (1 line each, 5 files)

Each edit is a single constant value change. No logic, no new imports.

### E1 — `SalesMockup.jsx:138`
```js
// Before:
  const maxDays = 60;
// After:
  const maxDays = 730; // BUG-353: lifted from 60 — backend-agg endpoint has no cap
```

### E2 — `PaymentsMockup.jsx:183`
```js
// Before:
  const maxDays = 60;
// After:
  const maxDays = 730; // BUG-353: lifted from 60 — uses fetchInsightsSales (backend-agg)
```

### E3 — `DashboardMockup.jsx:74`
```js
// Before:
  const MAX_RANGE_DAYS = 365;
// After:
  const MAX_RANGE_DAYS = 730; // BUG-353: lifted from 365 — backend-agg endpoint has no cap
```

### E4 — `ItemSalesHybridMockup.jsx:169`
```js
// Before:
  // @audit:rule id="FE-25" name="MAX_RANGE_DAYS = 365" // INV-001: lifted from 62 to 365 (1-year range)
  const MAX_RANGE_DAYS = 365;
// After:
  // @audit:rule id="FE-25" name="MAX_RANGE_DAYS = 730" // BUG-353: lifted from 365 to 730 (2-year range)
  const MAX_RANGE_DAYS = 730; // BUG-353: lifted from 365 — backend-agg endpoint has no cap
```
*(Note: the `@audit:rule` comment line must also update the name value so the audit rule stays accurate.)*

### E5 — `CancellationsMockup.jsx:192`
```js
// Before:
  const MAX_RANGE_DAYS = 365; // INV-001: lifted from 62
// After:
  const MAX_RANGE_DAYS = 730; // BUG-353: lifted from 365 — backend-agg endpoint has no cap
```

---

## Edit 6 — `src/api/services/reportService.js` — Chunking helper + updated function

**Locate:** search for `export const getOrderReportBetaCombined` (currently L798–804).

**Replace** the blank line above + the full function with:
```js
// BUG-353: private helper — split a date range into ≤ chunkSize-day windows
// Returns [{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }, ...]
const _splitBetaDateRange = (fromDate, toDate, chunkSize = 31) => {
  const fmtD = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const start = new Date(fromDate + 'T00:00:00');
  const end   = new Date(toDate   + 'T00:00:00');
  if (Math.round((end - start) / 86400000) <= chunkSize) return [{ from: fromDate, to: toDate }];
  const chunks = [];
  let cur = new Date(start);
  while (cur <= end) {
    const chunkEnd  = new Date(cur.getTime() + (chunkSize - 1) * 86400000);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push({ from: fmtD(cur), to: fmtD(actualEnd) });
    cur = new Date(actualEnd.getTime() + 86400000);
  }
  return chunks;
};

// CR-117: Order Report Beta — combined backend-aggregated daily report
// BUG-353: transparently chunks wide ranges (> 31d) into sequential API calls.
//   onProgress(current, total) optional — page shows "month X of N" in spinner.
//   Single-chunk path (≤ 31d) is identical to original — no regression risk.
export const getOrderReportBetaCombined = async (fromDate, toDate, onProgress) => {
  const chunks = _splitBetaDateRange(fromDate, toDate);
  if (chunks.length === 1) {
    // fast path — single chunk, behaviour identical to pre-BUG-353
    const { data } = await api.post(API_ENDPOINTS.ORDER_REPORT_BETA_COMBINED, {
      from: fromDate,
      to: toDate,
    });
    return data;
  }
  // chunked path — fetch sequentially, merge daily_reports arrays
  const allDailyReports = [];
  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, chunks.length);
    const { data: chunkData } = await api.post(API_ENDPOINTS.ORDER_REPORT_BETA_COMBINED, {
      from: chunks[i].from,
      to: chunks[i].to,
    });
    allDailyReports.push(...(chunkData.daily_reports || []));
  }
  // sort descending by date — matches single-call sort order
  allDailyReports.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return { daily_reports: allDailyReports }; // BUG-353: same shape as single-call response
};
```

---

## Edit 7 — `src/pages/reports-module/OrderReportBetaPage.jsx` — Progress state + fetchData

**Part A — state (locate `const [error, setError] = useState(null);`, insert after it):**
```js
  const [fetchProgress, setFetchProgress] = useState(null); // BUG-353: { current, total } during chunked fetch
```

**Part B — fetchData (locate `const fetchData = useCallback`, replace entire function):**
```js
  // CR-117: Fetch data (declared first to avoid TDZ in downstream useCallback deps)
  // BUG-353: passes onProgress so chunked fetches show "month X of N" in spinner
  const fetchData = useCallback(async (from, to) => {
    setIsLoading(true);
    setError(null);
    setFetchProgress(null); // BUG-353: reset on each new fetch
    try {
      const result = await getOrderReportBetaCombined(from, to, (current, total) => {
        if (total > 1) setFetchProgress({ current, total }); // BUG-353: only show when > 1 chunk
      });
      setData(result);
      // Auto-expand all days
      const days = new Set((result.daily_reports || []).map(d => d.date));
      setExpandedDays(days);
    } catch (err) {
      console.error('[CR-117] Fetch failed:', err);
      setError(err?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
      setFetchProgress(null); // BUG-353: always clear on completion
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Part C — loading spinner (locate `data-testid="loading-state"`, replace span text):**
```jsx
          {isLoading && (
            <div className="flex items-center justify-center py-16" data-testid="loading-state">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-sm text-zinc-500" data-testid="loading-text">
                {fetchProgress
                  ? `Loading data… (month ${fetchProgress.current} of ${fetchProgress.total})` /* BUG-353 */
                  : 'Loading report...'}
              </span>
            </div>
          )}
```

---

## Verification Matrix

| # | Edit | File | Verify | How | Auto? |
|---|------|------|--------|-----|:---:|
| V1 | E1 | SalesMockup | `maxDays = 730` — "Max 60 days" error gone for 200-day range | Browser | NO |
| V2 | E2 | PaymentsMockup | `maxDays = 730` — same | Browser | NO |
| V3 | E3 | DashboardMockup | `MAX_RANGE_DAYS = 730` — no cap error for 400-day range | Browser | NO |
| V4 | E4 | ItemSalesHybridMockup | `MAX_RANGE_DAYS = 730` — same | Browser | NO |
| V5 | E5 | CancellationsMockup | `MAX_RANGE_DAYS = 730` — same | Browser | NO |
| V6 | E6 | reportService.js | ≤ 31d range: 1 API call, result unchanged | grep / unit | YES |
| V7 | E6 | reportService.js | 45d range: 2 API calls, results concatenated + sorted desc | Unit test | YES |
| V8 | E6 | reportService.js | `onProgress` missing: no crash | Unit test | YES |
| V9 | E7 | OrderReportBetaPage | 7d range: spinner text = "Loading report…" | Browser | NO |
| V10 | E7 | OrderReportBetaPage | 60d range: spinner shows "month 1 of 2" then "month 2 of 2" | Browser | NO |
| V11 | E7 | OrderReportBetaPage | 60d range: table shows orders from both months | Browser | NO |
| V12 | ALL | — | `yarn build` exits 0, 0 new warnings | Build | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-353 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: BUG-353 row updated
- [ ] BUG_TRACKER.md: BUG-598 Sub-batch A marked SUBSUMED_BUG353
- [ ] registry.json: BUG-598 notes updated (Sub-batch A subsumed)
- [ ] FILE_OWNERSHIP.md: all 7 files listed with BUG-353 + date
- [ ] Code markers: // BUG-353 in each modified file (included in plan above)
```

---

## Implementation Notes

1. **E4 audit rule:** `ItemSalesHybridMockup.jsx:169` has an `// @audit:rule` comment with
   the old 365 value in its name — update to 730 in the same edit.
2. **No new imports** on any of the 7 files.
3. **E1–E5 anchor:** search for the exact `const maxDays = 60` or `const MAX_RANGE_DAYS = 365`
   string — it's unique in each file.
4. **E6 anchor:** search for `export const getOrderReportBetaCombined` — unique in the codebase.
5. **E7 anchor:** `data-testid="loading-state"` — unique in the file.

---

Planning complete: BUG-353 (revised)
Files WILL change: 7
Lines changed: ~40
Owner decisions: ALL LOCKED
Next: Gate 4 GO → Implementation
