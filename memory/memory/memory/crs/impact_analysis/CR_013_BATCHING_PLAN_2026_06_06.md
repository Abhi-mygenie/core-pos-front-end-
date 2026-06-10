# CR-013 Implementation Plan — Month-by-Month Batching (Addendum)

**Created:** 2026-06-06
**CR:** CR-013 — Food Court Report
**Scope:** Addendum to Gate ③ plan — large date range support via batched API calls

---

## 1. Problem

Backend `order-logs-report` crashes at ~90 days (512MB PHP memory limit). A 1-year report (40-50K orders) is impossible in a single call.

## 2. Solution

Split date ranges >30 days into monthly chunks. Each chunk is a separate API call within the safe 30-day limit. Results merged client-side.

## 3. File Changes

### MODIFIED (1 file):
| File | Change |
|---|---|
| `frontend/src/api/services/foodCourtService.js` | Add `splitDateRange()` helper + parallel batched fetch + merge logic |

### MODIFIED (1 file):
| File | Change |
|---|---|
| `frontend/src/pages/reports-module/FoodCourtMockup.jsx` | Remove 60-day MAX_RANGE_DAYS cap. Add progress callback for loading indicator ("Loading 3/12 months...") |

### NOT TOUCHED:
- All other screens (S5/S6/S7/S8/S9/S-ROOM) — pilot on Food Court only
- `reportTransform.js` — no change
- `reportExporter.js` — no change

---

## 4. Service Design

### splitDateRange(fromDate, toDate, maxDays = 30)

```
Input:  "2025-06-01", "2026-06-01"
Output: [
  { from: "2025-06-01", to: "2025-06-30" },
  { from: "2025-07-01", to: "2025-07-31" },
  { from: "2025-08-01", to: "2025-08-31" },
  ...
  { from: "2026-05-01", to: "2026-06-01" },
]
```

Each chunk ≤ 30 days. Last chunk's `to` = original `toDate`.

### Parallel execution (concurrency = 3)

```
chunks = splitDateRange(from, to)

Run 3 chunks at a time (Promise pool):
  Chunk 1-3 → parallel
  Chunk 4-6 → parallel
  ...

On each chunk complete:
  onProgress(completedCount, totalChunks)  → UI shows "Loading 4/12..."

On each chunk success:
  - Transform: reportListFromAPI.orderLogsReport(raw, null)
  - Business-day filter
  - Collect into allTransformed[]

On chunk failure:
  - Log error, skip chunk, continue (partial results > no results)
  - Track failedChunks[] for UI warning

After all chunks:
  - Merge allTransformed[] (concat + sort by orderId desc)
  - Deduplicate by order ID (edge case: order spans chunk boundary)
  - Extract station list from all items
  - Station filter + row building (existing logic)
  - Return { orders, stations, meta: { chunks, failed, totalRaw } }
```

### Estimated performance (Palm House ~57 orders/day)

| Range | Chunks | Parallel (3) | Est. time | Orders |
|---|---|---|---|---|
| 30 days | 1 | 11s | ~11s | ~1,700 |
| 90 days | 3 | 1 batch | ~16s | ~5,100 |
| 180 days | 6 | 2 batches | ~32s | ~10,200 |
| 365 days | 12 | 4 batches | ~48s | ~20,000 |

---

## 5. Page Changes

### Remove max range cap
```diff
- const MAX_RANGE_DAYS = 60;
+ // No max range — batching handles large ranges
```

### Add progress state
```
const [batchProgress, setBatchProgress] = useState(null);
// batchProgress = { completed: 4, total: 12 } or null

// Pass progress callback to service:
getFoodCourtForRange(from, to, schedules, station, (completed, total) => {
  setBatchProgress({ completed, total });
})
```

### Loading indicator
When batchProgress is set and isLoading:
```
"Loading month 4 of 12..." with a progress bar
```

Replaces the generic "Loading report..." splash for multi-month fetches.

### Partial failure warning
If any chunks failed:
```
"⚠ 2 of 12 months failed to load. Showing partial data."
```

---

## 6. Edge Cases

| Case | Handling |
|---|---|
| Order spans chunk boundary | Deduplicate by order ID after merge |
| Single chunk fails | Skip, show warning, continue with rest |
| All chunks fail | Show error via ReportLoadingShield |
| Range ≤ 30 days | Single call (no batching — same as today) |
| User changes dates while loading | AbortController cancels in-flight chunks |

---

## 7. Test Plan

| Test | Validates |
|---|---|
| 7-day range | Single call, no batching (same as today) |
| 60-day range | 2 chunks, both succeed |
| 90-day range | 3 chunks parallel — previously crashed, now works |
| 180-day range | 6 chunks, progress shows "Loading 3/6..." |
| Partial failure | Kill network mid-fetch → warning shown, partial data displayed |
| Station filter | Works correctly on merged dataset |
| Export | Excel/PDF contains full merged data |

---

## 8. Future Rollout

If Food Court pilot succeeds:
- Extract `splitDateRange` + parallel fetch into a shared utility
- Apply to S5/S6/S7/S8/S9 services
- All screens get unlimited date range support

---

*Addendum to CR-013 Gate ③. Ready for owner GO.*
