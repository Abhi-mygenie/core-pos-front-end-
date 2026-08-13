# QA Handover — BUG-296 (2026-08-06)

**ID:** BUG-296
**Title:** Food Court Report vs Item-Wise Report — Revenue Mismatch
**Date:** 2026-08-06
**Author:** IMPLEMENTATION agent
**File changed:** `src/api/services/foodCourtService.js`

---

## 1. Verification Matrix Results (self-test — all PASS)

| V# | Check | Result |
|----|-------|--------|
| V1 | cache key `collect_bill` at L105 | ✅ PASS — `grep "buildCacheKey.*collect_bill"` → 1 hit |
| V2 | `sort_by: 'collect_bill'` at L108 | ✅ PASS — `grep "sort_by.*collect_bill"` → 1 hit |
| V3 | `itemTotal` filter `foodStatus!==3` at L129 | ✅ PASS — `grep "foodStatus.*3.*reduce"` → 1 hit |
| V4 | L129/130/131 all use `foodStatus !== 3` | ✅ PASS — consistent |
| V5 | No `created_at` string in fetchChunk sort | ✅ PASS — grep returned 0 hits in fetchChunk block |
| V6 | `// BUG-296` markers × 3 | ✅ PASS — 3 hits at L105, L108, L129 |
| V7 | Webpack compiles, 0 new warnings | ✅ PASS — "compiled with 1 warning" (pre-existing: RoomOrdersMockup + SettlementReportMockup, unrelated) |
| V8 | ZORKO revenue = ₹5,74,715.00 | ✅ PASS — live API probe confirmed |
| V9 | All stations total = ₹18,37,701.34 | ✅ PASS — live API probe confirmed |
| V10 | Order count = 6,152 (not 6,170) | ✅ PASS — live API probe confirmed |

**Self-test: 10/10 PASS**

---

## 2. What was changed

**File:** `src/api/services/foodCourtService.js`

| Edit | Line | Before | After |
|------|------|--------|-------|
| E1 | 105 | `buildCacheKey(..., 'created_at', ...)` | `buildCacheKey(..., 'collect_bill', ...)` |
| E2 | 108 | `sort_by: 'created_at'` | `sort_by: 'collect_bill'` |
| E3 | 129 | `stationItems.reduce(price)` | `stationItems.filter(foodStatus!==3).reduce(price)` |

E1 + E2 shipped atomically in one `search_replace` call.

---

## 3. Revenue verification (live API — rid=598, June 2026)

| Station | Expected | Actual | Match |
|---------|----------|--------|-------|
| CREAMBELLPARLOUR | ₹2,42,458.34 | ₹2,42,458.34 | ✅ |
| GUPTAJEE | ₹7,18,535.00 | ₹7,18,535.00 | ✅ |
| MSB | ₹3,01,993.00 | ₹3,01,993.00 | ✅ |
| ZORKO | ₹5,74,715.00 | ₹5,74,715.00 | ✅ |
| TOTAL | ₹18,37,701.34 | ₹18,37,701.34 | ✅ |
| Order count | 6,152 | 6,152 | ✅ |

---

## 4. Regression tests (for QA agent)

| # | What to verify | Why | Expected |
|---|---------------|-----|---------|
| R1 | All 4 stations show correct revenue for June 2026 | Confirm fix applied across all stations | CREAMBELLPARLOUR=₹2,42,458 / GUPTAJEE=₹7,18,535 / MSB=₹3,01,993 / ZORKO=₹5,74,715 |
| R2 | Food Court "All Orders" tab shows 6,152 orders (not 6,170) | Confirms sort fix (E2) excluding 18 cancelled orders | 6,152 |
| R3 | Food Court Audit tab still loads — no JS errors | Audit uses `allOrders` path (unfiltered), must be unaffected | Audit pivot renders, no console errors |
| R4 | Change date range → navigate away → return → same numbers | Confirms cache key fix (E1) — no stale `created_at` data served | Numbers unchanged on reload |
| R5 | Item Sales filtered to ZORKO station shows same revenue as Food Court ZORKO tab | The original reported mismatch — should now be equal | Both = ₹5,74,715 |

---

## 5. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-296
Status: IMPLEMENTED — Gate 5a 2026-08-06
Sprint: pos_5_1
EXIT GATE: ALL 5 PASSED
```

---

## 6. Credentials + Environment

```
Account: owner@shimlaqohfoodcourt.com / Qplazm@10
Restaurant: Shimla QoH Food Court (rid=598)
Test period: June 2026
Preprod: https://preprod.mygenie.online
App URL: https://pos-react-preview-3.preview.emergentagent.com
```

---

## 7. Files NOT touched (scope lock verified)

- `FoodCourtMockup.jsx` — untouched ✅
- `ItemSalesHybridMockup.jsx` — untouched ✅
- `insightsService.js` — untouched ✅
- `insightsCache.js` — untouched ✅
- `orderTransform.js` — untouched ✅
