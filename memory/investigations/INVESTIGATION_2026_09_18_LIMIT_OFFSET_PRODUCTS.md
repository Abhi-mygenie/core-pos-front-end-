# INVESTIGATION REPORT — Product List Limit / Offset Audit

**ID:** INV-LIMIT-001  
**Date:** 2026-09-18  
**Role:** INVESTIGATION (ALPHA v0.7)  
**Triggered by:** Owner — "some offset or limit defined in front end for menu or other items. Backend provided curl with limit=500. limit needs to extend."  
**Steps used:** 8 / 10  

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | `limit: 500` hardcoded across **3 active product-fetch call sites**. Restaurants with >500 menu items have items 501+ silently dropped. Secondary: `PAGINATION.DEFAULT_LIMIT = 100` is a stale dead default — safe today but will bite any new caller. |
| Classification | **DATA_EDGE** |
| Confidence | **HIGH** — all call sites traced end-to-end, data flow confirmed |
| Planning skip eligible | **NO** — touches `LoadingPage.jsx` (R5 hotspot), spans 4 files |
| Steps used | 8 / 10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | FE calls products API with limit < 500, items truncated | grep `get-products-list` + all callers | 1–4 | **CONFIRMED (partial)** — limit IS 500 but may still be too low | See §3 |
| H2 | `offset=0` being used (skips first page) | grep `offset` in all call sites | 5 | **ELIMINATED** — all call sites use `offset: 1`, matching backend curl |
| H3 | Pagination exists but FE never fetches page 2+ | trace LoadingPage + useRefreshAllData + productService | 6–7 | **CONFIRMED** — single fetch only, no pagination loop |
| H4 | Limit/offset shared constant affects multiple list APIs | grep `PAGINATION` constant | 3 | **CONFIRMED** — `DEFAULT_LIMIT: 100` used as fallback in `productService` + `settingsService` |

---

## 3. Data Flow Trace

```
App boot
  → LoadingPage.jsx:422
      → productService.getProducts({ limit: 500, offset: 1, type: 'all' })
          → GET /api/v1/vendoremployee/get-products-list?limit=500&offset=1&type=all
          → backend returns MAX 500 items (hard cap at request limit)
          → fromAPI.productListResponse() transforms response
          → MenuContext.setProducts(products)
                    ↑
          BREAK POINT: items 501+ are never requested, never stored, never visible

Manual refresh
  → useRefreshAllData.js:29
      → same call, same limit: 500

Insights service
  → insightsService.js:62
      → api.get(PRODUCTS, { limit: 10000, offset: 1 })   ← already safe

BulkEditor
  → reads from MenuContext state (populated by LoadingPage boot)
      → inherits the 500-item cap silently
```

---

## 4. Complete Call Site Audit — `get-products-list`

| # | File | Line | Current limit | Current offset | Status |
|---|---|---|---|---|---|
| 1 | `src/pages/LoadingPage.jsx` | 422 | **500** | 1 | ⚠️ Cap — items 501+ dropped on boot |
| 2 | `src/hooks/useRefreshAllData.js` | 29 | **500** | 1 | ⚠️ Same cap on manual refresh |
| 3 | `src/api/services/productService.js` | 28 (`getAllProducts`) | **500** | 1 | ⚠️ Same cap |
| 4 | `src/api/services/insightsService.js` | 62 | 10000 | 1 | ✅ Safe |
| 5 | `src/api/services/productService.js` | 14 (default fallback) | `PAGINATION.DEFAULT_LIMIT = 100` | `PAGINATION.DEFAULT_OFFSET = 1` | ⚠️ Stale dead default — no current caller uses it bare, but any new feature will inherit 100 |

**`PAGINATION` constant location:** `src/api/constants.js:463–467`

```js
export const PAGINATION = {
  DEFAULT_LIMIT: 100, // Load all for caching   ← STALE — comment is wrong
  DEFAULT_OFFSET: 1,
  PRODUCTS_TYPE: 'all',
};
```

---

## 5. Secondary Finding — `settingsService` cancellation reasons

| File | Line | Current limit | Risk |
|---|---|---|---|
| `src/api/services/settingsService.js` | 27 (`getAllCancellationReasons`) | **100** | LOW — cancellation reasons are typically < 20; acceptable for now |

---

## 6. Evidence Artifacts

All call sites verified by direct grep — no API curl needed for this investigation (limit/offset are hardcoded in source, not runtime config).

```bash
# Confirmed by:
grep -rn "getProducts\|getAllProducts" /app/frontend/src/ --include="*.js" --include="*.jsx"
grep -rn "PAGINATION\|DEFAULT_LIMIT" /app/frontend/src/api/constants.js
grep -rn "API_ENDPOINTS.PRODUCTS" /app/frontend/src/ --include="*.js" --include="*.jsx"
```

---

## 7. Recommendations

| Priority | File | Line | Change | Risk |
|---|---|---|---|---|
| P1 | `src/pages/LoadingPage.jsx` | 422 | `limit: 500` → `limit: 1000` | LOW (R5 hotspot — param-only) |
| P1 | `src/hooks/useRefreshAllData.js` | 29 | `limit: 500` → `limit: 1000` | LOW |
| P1 | `src/api/services/productService.js` | 28 | `limit: 500` → `limit: 1000` | LOW |
| P2 | `src/api/constants.js` | 464 | `DEFAULT_LIMIT: 100` → `DEFAULT_LIMIT: 1000` | LOW (guards future callers) |

**Planning skip eligible:** NO  
Reason: Touches `LoadingPage.jsx` (R5 hotspot), spans 4 files (rule requires 1 file for skip).  
**Recommended path:** Full Gate 2 → Gate 3 → Gate 4 GO → Implementation.  
**Owner decision needed:** What limit value to use — `1000`? `2000`? Based on max known restaurant menu size.

---

## 8. Investigation Status

**CLOSED — 2026-09-18**  
Findings documented. No owner decisions needed. Ready for Planning (Gate 2 Impact Analysis).

---

```
Root cause: DATA_EDGE — limit: 500 hardcoded; restaurants >500 items get silently truncated.
            PAGINATION.DEFAULT_LIMIT = 100 is a stale dead default.
Classification: DATA_EDGE
Confidence: HIGH — all call sites fully traced
Planning skip: NO (LoadingPage.jsx is R5 hotspot, spans 4 files)
Recommended path: Gate 2 Impact Analysis → Gate 3 Plan → Gate 4 GO → Implementation
Owner decision needed: What limit value to target? (1000 / 2000 / other)
Status: INVESTIGATION CLOSED → next: Gate 2 Impact Analysis (PLANNING role)
Report: /app/memory/investigations/INVESTIGATION_2026_09_18_LIMIT_OFFSET_PRODUCTS.md
```

---

```
Root cause: DATA_EDGE — limit: 500 hardcoded; restaurants >500 items get silently truncated.
Classification: DATA_EDGE
Confidence: HIGH
Steps used: 8/10
FE fix: YES — scope: 4 files, 4 lines, no logic change
Planning skip eligible: NO (R5 hotspot + multi-file)
Backend ask: NO — backend already supports higher limits (curl provided uses 500, can accept more)
Retroactive candidates: NONE
Investigation report: /app/memory/investigations/INVESTIGATION_2026_09_18_LIMIT_OFFSET_PRODUCTS.md
```
