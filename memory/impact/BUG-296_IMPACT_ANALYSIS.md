# BUG-296 — Impact Analysis (Gate 2)

**ID:** BUG-296
**Title:** Food Court Report vs Item-Wise Report — Revenue Mismatch
**Date:** 2026-08-06
**Author:** PLANNING agent
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** FULL — all target lines confirmed in existing file
**Conflict Pre-Check:** NONE — only open registry item touching `foodCourtService.js` is BUG-296 itself. Last modifier: CR-045 cleanup agent (2026-06-17, CLOSED).
**Baseline check:** PASS — `foodCourtService.js` is not in the frozen list; `OPEN_GAPS_REGISTER.md` `FE-PROPORTIONAL-001` documents that Food Court and Item Sales formulas are intentionally different for addon/variation pricing. This fix does NOT alter that intentional divergence.
**API Probe Log:** DONE — evidence at `/app/memory/evidence/BUG-296/live_validation_2026_08_06.json`. Confirmed gap = ₹0.00 per station after applying both fixes. Probe: `owner@shimlaqohfoodcourt.com`, rid=598, June 2026.
**Risk:** HIGH (reports revenue computation — R6 trigger: reports area)
**Fast Lane eligible:** NO (R6 area — full Gate 2-3 required)

---

## 1. Problem Statement

Food Court station revenue does not match Item Sales when filtered to the same station.
Two root causes identified and live-validated by Investigation agent (HIGH confidence):

| RC | Issue | Revenue impact (June 2026) |
|----|-------|---------------------------|
| RC2a | Food Court fetches with `sort_by: 'created_at'` → includes 18 cancelled orders (fos=3) | ₹1,783 |
| RC2b | Food Court's `itemTotal` in `toStationRow()` sums ALL item prices including cancelled items (foodStatus=3) | ₹3,041 |
| **Total gap** | | **₹4,824.29** |

After both fixes, all 4 stations match exactly — gap = **₹0.00**.

---

## 2. Data Flow Trace

```
User selects station + date range
  → FoodCourtMockup.jsx calls getFoodCourtForRange()   [foodCourtService.js:181]
      → splitDateRange() → N chunks of ≤30 days        [foodCourtService.js:54]
      → parallelMap() → fetchChunk() per chunk          [foodCourtService.js:78]
          → fetchOrReuse(
              buildCacheKey(rid, 'order-logs', 'created_at', from, to),  ← E1 TARGET
              api.post(ORDER_LOGS_REPORT, { sort_by: 'created_at' })     ← E2 TARGET
            )
          → reportListFromAPI.orderLogsReport(raw)       [reportTransform.js — NOT touched]
          → business-day filter on createdAt             [foodCourtService.js:119-123]
      → merge chunks → deduplicate by orderId
      → filter to selected station:
          items = o.items.filter(it => it.station === station)
          → toStationRow(o, items, station)              [foodCourtService.js:128]
              → itemTotal = stationItems.reduce(price)   ← E3 TARGET (line 129)
              → gstAmount = stationItems.filter(foodStatus !== 3).reduce(gst)  ← already correct (line 130)
              → vatAmount = stationItems.filter(foodStatus !== 3).reduce(vat)  ← already correct (line 131)
              → discount = proportional share of orderDiscount
              → subTotal = itemTotal − discount
              → total = subTotal + gstAmount + vatAmount
              → returns row with {itemTotal, subTotal, total, ...}
  → FoodCourtMockup.jsx renders row
  → KPI strip: kpis.total = sortedOrders.reduce(o.total)  [FoodCourtMockup.jsx — NOT touched]

BREAK POINTS:
  1. Line 105 + 108: 'created_at' sort → fetches 6,170 orders (includes 18 cancelled fos=3)
  2. Line 129: itemTotal includes cancelled item prices (foodStatus=3)
     (gst/vat on lines 130-131 already exclude foodStatus=3 — inconsistency)
```

---

## 3. Affected Lines — Exact Verification

All lines verified by grep against current file before writing this plan.

| Edit | File | Line | Current content | Expected after fix |
|------|------|------|-----------------|--------------------|
| **E1** | `foodCourtService.js` | 105 | `buildCacheKey(restaurantId, 'order-logs', 'created_at', chunk.from, chunk.to),` | `buildCacheKey(restaurantId, 'order-logs', 'collect_bill', chunk.from, chunk.to),` |
| **E2** | `foodCourtService.js` | 108 | `sort_by: 'created_at', from_date: chunk.from, to_date: chunk.to,` | `sort_by: 'collect_bill', from_date: chunk.from, to_date: chunk.to,` |
| **E3** | `foodCourtService.js` | 129 | `const itemTotal = stationItems.reduce((s, it) => s + (it.price \|\| 0), 0);` | `const itemTotal = stationItems.filter(it => it.foodStatus !== 3).reduce((s, it) => s + (it.price \|\| 0), 0);` |

**Total:** 1 file, 3 edits, 3 lines changed.

---

## 4. Why E1 (Cache Key) Must Change

`insightsCache.js:22` defines `buildCacheKey = (rid, endpoint, sortBy, from, to)`.
The `sortBy` parameter is part of the key.

If E2 changes the API call to `collect_bill` but E1 leaves the cache key as `'created_at'`:
- Any previously-cached `created_at` result (6,170 orders including cancelled) would be served
  for the new `collect_bill` call (which expects 6,152 paid orders only)
- The fix would appear to work in a fresh session but silently break on cache hit

**E1 and E2 are a single atomic change** — both must ship together.

**Bonus:** After E1, Food Court and Item Sales share cache entries for the same
date range (Item Sales uses `sort_by: serverSortBy` = `'collect_bill'` by default).
This reduces redundant API calls.

---

## 5. Risk Assessment

### Risk: HIGH (R6 — reports revenue computation)

| Area | Risk | Detail |
|------|------|--------|
| Revenue display | HIGH | `itemTotal`, `subTotal`, `total` all change for any order with cancelled items |
| Cache correctness | HIGH | E1 must ship with E2 — not independently |
| Discount share | LOW | After E3, `itemTotal` excludes cancelled items but `orderItemTotal` (L134) still includes them → slight change to discount proportional split. Impact negligible for Shimla (rare cancellations, no order-level discounts confirmed). Documented as known side-effect. |
| Other restaurants | MEDIUM | For restaurants where orders are created and collected on different days, the business-day filter on `createdAt` (L119-123) may exclude valid orders returned by `collect_bill` sort. This fix is scoped to Shimla QoH Food Court by owner direction. |
| Hotspot files | NONE | `foodCourtService.js` is NOT on the R5 hotspot list |
| Frozen files | NONE | File is not in `/app/memory/final/` |
| FE-PROPORTIONAL-001 | NONE | The addon/variation formula difference between Food Court and Item Sales is intentionally documented in `OPEN_GAPS_REGISTER.md`. This fix does NOT change addon/variation handling. |

---

## 6. Downstream Consumers of `itemTotal` / `total`

| Consumer | File | Impact of fix |
|----------|------|---------------|
| KPI strip `kpis.total` | `FoodCourtMockup.jsx:327` | Decreases by ₹4,824 for June — correct, matches Item Sales |
| Column totals `columnTotals.itemTotal/total` | `FoodCourtMockup.jsx:332-344` | Same — correct |
| Excel/PDF export payload | `FoodCourtMockup.jsx:364-400` | Revenue in export will be corrected — intended |
| Audit pivot `toStationRow.__source` | `FoodCourtMockup.jsx:183-231` | Audit uses `allOrders` (unfiltered), not `toStationRow` output — NOT affected |
| `orderDetails` text | `foodCourtService.js:154-156` | Still includes cancelled items in the order detail text string. Cosmetic only; not in scope for this fix. |
| `totalQty`, `itemCount` | `foodCourtService.js:152-153` | Still count cancelled items. Display-only; not in scope for this fix. |

---

## 7. Files NOT Touched

| File | Reason |
|------|--------|
| `FoodCourtMockup.jsx` | No changes needed — all revenue displayed from `toStationRow()` output |
| `ItemSalesHybridMockup.jsx` | Not involved in this fix |
| `insightsService.js` | Not involved in this fix |
| `insightsCache.js` | Cache key function unchanged — only how it is called changes |
| `orderTransform.js` | Not involved in this fix |
| `reportTransform.js` | Not involved in this fix |

---

## 8. Quantified Outcome (live-validated)

From `/app/memory/evidence/BUG-296/live_validation_2026_08_06.json`:

| Station | Before (CA + all items) | After (CB + no cancelled) | Change |
|---------|------------------------|--------------------------|--------|
| CREAMBELLPARLOUR | ₹2,43,361.63 | ₹2,42,458.34 | −₹903.29 |
| GUPTAJEE | ₹7,21,103.00 | ₹7,18,535.00 | −₹2,568.00 |
| MSB | ₹3,02,792.00 | ₹3,01,993.00 | −₹799.00 |
| ZORKO | ₹5,75,269.00 | ₹5,74,715.00 | −₹554.00 |
| **TOTAL** | **₹18,42,525.63** | **₹18,37,701.34** | **−₹4,824.29** |

Gap vs Item Sales logic (same data): **₹0.00 per station and total**.

---

## 9. Verification Matrix (seeds Gate 3 + QA)

| # | Edit | File | What to verify | Method |
|---|------|------|----------------|--------|
| V1 | E1 | foodCourtService.js | `grep -n "buildCacheKey.*collect_bill"` → 1 hit at line ~105 | grep |
| V2 | E2 | foodCourtService.js | `grep -n "sort_by.*collect_bill"` → 1 hit at line ~108 | grep |
| V3 | E3 | foodCourtService.js | `grep -n "foodStatus.*3.*reduce"` → 1 hit at line ~129 | grep |
| V4 | E3 consistency | foodCourtService.js | lines 129/130/131 all use same `foodStatus !== 3` filter | grep |
| V5 | compile | — | webpack compiles with 0 new warnings | `yarn start` logs |
| V6 | revenue | preprod, rid=598, June 2026 | ZORKO station revenue = ₹5,74,715.00 | curl probe + compare script |
| V7 | revenue | preprod, rid=598, June 2026 | Total all stations = ₹18,37,701.34 | curl probe |
| V8 | no cancelled orders | preprod | Food Court "All Orders" tab = 6,152 (not 6,170) | UI check |
| V9 | cache key | — | No stale data on second load (clear cache, reload, verify same numbers) | browser devtools |

---

## 10. Owner Decisions

None — owner has explicitly approved both fixes in the Investigation session (2026-08-06).
Recorded in `handover/SESSION_HANDOVER_2026_08_06_BUG296_DEEP_INVESTIGATION.md §Owner Decisions`.

---

## 11. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-296 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md: BUG-296 row → status IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add foodCourtService.js — BUG-296, 2026-08-06
- [ ] Code markers: // BUG-296 on all 3 modified lines
- [ ] Compile check: webpack 0 new warnings
```

---

## 12. Scope Lock

**Files WILL change:**
- `src/api/services/foodCourtService.js` — 3 edits (E1, E2, E3)

**Files WILL NOT touch:**
- `FoodCourtMockup.jsx`
- `ItemSalesHybridMockup.jsx`
- `insightsService.js`
- `insightsCache.js`
- `orderTransform.js`
- `reportTransform.js`
- Any file under `/app/memory/final/`
