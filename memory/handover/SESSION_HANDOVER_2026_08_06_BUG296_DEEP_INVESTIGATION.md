# Session Handover — 2026-08-06 BUG-296 Deep Investigation (Session 2)

**Date:** 2026-08-06
**Role:** INVESTIGATION (Role 6)
**Items:** BUG-296
**Status:** INVESTIGATION COMPLETE — ready for Planning Gate 2

---

## Summary (1 line)
BUG-296 root cause fully confirmed by live API: Food Court revenue matches Item Sales exactly
after 2 fixes (sort_by collect_bill + exclude cancelled items from itemTotal); gap = ₹0.00.

---

## Session Scope

This was a deep-dive continuation of the BUG-296 investigation first opened 2026-08-05.
Session 1 was blocked (wrong password). This session obtained fresh token via `Qplazm@10`
and ran comprehensive live validation.

### What was investigated
1. Whether Food Court sort change (created_at → collect_bill) closes the revenue gap
2. Whether excluding cancelled items (foodStatus=3) from itemTotal closes the rest
3. Whether TAB/credit orders and service charges are factors for this restaurant
4. Whether station-filtered Item Sales revenue would match Food Court station revenue

### Findings
- **TAB/Credit:** 0 orders — payment methods: UPI, Cash, Card, Partial, Pending only
- **Service charge:** 0 lines, ₹0.00 across all 6,152 orders
- **Unassigned items:** 0 — every item maps to exactly one of 4 stations
- **Complementary items:** 0
- **After Fix 1 + Fix 2:** all 4 stations match Item Sales logic exactly, gap = ₹0.00 total

### Revenue baselines (post-fix, for regression reference)
| Station | Revenue (collect_bill, no cancelled) |
|---------|--------------------------------------|
| CREAMBELLPARLOUR | ₹2,42,458.34 |
| GUPTAJEE | ₹7,18,535.00 |
| MSB | ₹3,01,993.00 |
| ZORKO | ₹5,74,715.00 |
| **TOTAL** | **₹18,37,701.34** |

---

## Owner Decisions Made This Session
1. **RC1 (order count):** by design — food court model is station-level, not unique-order count. No fix.
2. **Fix 1 (sort):** approved — switch Food Court to collect_bill sort
3. **Fix 2 (cancelled items):** approved — exclude foodStatus=3 from itemTotal
4. **TAB/service charge:** confirmed absent for this restaurant

---

## Docs Updated
- `/app/memory/investigation/BUG-296_INVESTIGATION_REPORT.md` — FINAL, full session 2 findings
- `/app/memory/control/BUG_TRACKER.md` — BUG-296 section added + header updated
- `/app/memory/control/registry.json` — BUG-296 notes + status updated
- `/app/memory/evidence/BUG-296/` — orders_collect_bill_fresh.json, orders_created_at_fresh.json, pos_token_fresh.txt

---

## Next Steps for Next Agent (PLANNING)

**Item:** BUG-296
**Gate:** 2 (Impact Analysis) → 3 (Implementation Plan)
**Role needed:** PLANNING

### What to do
1. Write Impact Analysis at `/app/memory/impact/BUG-296_IMPACT_ANALYSIS.md`
2. Write Implementation Plan at `/app/memory/plans/BUG-296_IMPLEMENTATION_PLAN.md`
3. Get Gate 4 GO from owner (2-line fix, HIGH risk classification due to reports area)

### Exact fixes (from investigation)
**File:** `src/api/services/foodCourtService.js`

**Fix 1 — line ~106:** (inside `fetchChunk`, `fetchOrReuse` call)
```js
// BEFORE
sort_by: 'created_at', from_date: chunk.from, to_date: chunk.to,
// AFTER
sort_by: 'collect_bill', from_date: chunk.from, to_date: chunk.to,
```

**Fix 2 — line ~129:** (inside `toStationRow`)
```js
// BEFORE
const itemTotal = stationItems.reduce((s, it) => s + (it.price || 0), 0);
// AFTER
const itemTotal = stationItems.filter(it => it.foodStatus !== 3).reduce((s, it) => s + (it.price || 0), 0);
```

### Risk: HIGH (reports revenue computation — R6 area)
### Files WILL change: `src/api/services/foodCourtService.js` (1 file, 2 edits)
### Files WILL NOT touch: FoodCourtMockup.jsx, ItemSalesHybridMockup.jsx, insightsService.js, orderTransform.js

### Regression baseline
After implementation, verify June 2026 station revenues match:
- CREAMBELLPARLOUR: ₹2,42,458.34
- GUPTAJEE: ₹7,18,535.00
- MSB: ₹3,01,993.00
- ZORKO: ₹5,74,715.00

### Credentials for testing
- Email: `owner@shimlaqohfoodcourt.com`
- Password: `Qplazm@10`
- Fresh token: `/app/memory/evidence/BUG-296/pos_token_fresh.txt` (may expire — re-login with above)

---

## Investigation Final Format

```
Root cause: RC2 — foodCourtService.js uses created_at sort (includes cancelled orders) and
            includes cancelled item prices in itemTotal. 2 fixes in 1 file restore exact match.
Confidence: HIGH — live API validated, gap = ₹0.00 per station and total.
Steps: 6/10 (S1) + 8/10 (S2).
FE fix: YES — 1 file, 2 edits (~2 lines).
Backend ask: NO.
Planning skip eligible: NO (R6 reports revenue area — full Gate 2-3 required).
Escalated from Bug Fix: NO.
Retroactive candidates: NONE.
Investigation report: /app/memory/investigation/BUG-296_INVESTIGATION_REPORT.md
```
