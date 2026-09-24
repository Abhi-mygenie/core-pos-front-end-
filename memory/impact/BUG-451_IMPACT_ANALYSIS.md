# BUG-451 — IMPACT ANALYSIS (Gate 2) — Product list capped at `limit: 500`

**Date:** 2026-09-23 · **Role:** PLANNING (ALPHA v0.7) — Stage: Impact Analysis ONLY · **Sprint:** `sep_bug_closure`
**Code Reality:** NONE — `limit: 500` at all 3 call sites; `PAGINATION.DEFAULT_LIMIT: 100` (HEAD `1be4055`, `evidence/BUG-451/BUG-451_code_grep_2026_09_23.txt`)
**Conflict Pre-Check:** `LoadingPage.jsx` — last BUG-340 (popular-food loader, Aug-2026) and CR pos_boot_api_parallelization (May-2026); `useRefreshAllData.js` — last CR-044/BUG-358 era; `productService.js` — no recent entry; `api/constants.js` — last CR-385 M1 (E16 `AIOSELL_ENDPOINTS.ROOM_AVAILABILITY`, 2026-09-22, additive; CR-385 P5 still open but does not touch `PAGINATION` L463–467). **Parallel-safe with CR-385** (different constant block). No other open item on these files. **No conflict.**
**Risk:** HIGH by classification (API request parameter + R5 `LoadingPage.jsx`); actual edit is 4 numeric literals — no sequencing, no transform, no state change.
**Intake:** `change_requests/BUG-451_PRODUCT_LIST_LIMIT_500_CAP_INTAKE.md` · ODs LOCKED: `limit: 2000`, fix `DEFAULT_LIMIT` too · **D1 constant + D2 delete dead fn LOCKED 2026-09-24**
**Gate 2 status:** **CLOSED 2026-09-24 (owner)** — R11 backend probe DONE (§4, BLOCKER cleared); D1/D2 locked (§5). Gate 3 NOT started (owner: "do not start gate 3").

---

## 1. Data flow trace

```
Boot   LoadingPage.loadProducts (LoadingPage.jsx:418–437)
         productService.getProducts({ limit: 500, offset: 1, type: 'all' })        :422
           → GET /api/v1/vendoremployee/get-products-list?limit=500&offset=1&type=all  (productService.js:12–21)
           → fromAPI.productListResponse(data) → { products[], total: api.total_size }  (productTransform.js)
         data.products = response.products; loadedCount = products.length; totalCount = response.total  :424–426
         updateStatus('products', SUCCESS, null, loadedCount, totalCount)                :432
           ► boot screen ALREADY shows "500 / <total_size>" when truncated — silent to cashier, visible on LoadingPage counter
         → MenuContext.setProducts(products) → OrderEntry grid, BulkEditor, category item-count enrichment
Refresh useRefreshAllData.js:29 — identical call; setCategories(enriched) + setProducts
Dead    productService.getAllProducts (:27–30) — limit 500 — NO CALLERS (grep) → dead code
Default productService.getProducts / settingsService.getCancellationReasons fall back to PAGINATION.DEFAULT_LIMIT (100) when caller passes no limit — no live caller does today
Safe    insightsService.js:62 — limit 10000 (own literal, untouched)
BREAK POINT: single request, limit literal; backend returns ≤ limit; items 501+ never requested.
```

## 2. Files affected

| # | File | Line | Current → New | Hotspot |
|---|---|---|---|---|
| 1 | `src/pages/LoadingPage.jsx` | 422 | `limit: 500` → `limit: PAGINATION.DEFAULT_LIMIT` **or** literal `2000` (see §5 D1) | **YES (R5)** — literal only |
| 2 | `src/hooks/useRefreshAllData.js` | 29 | same | NO |
| 3 | `src/api/services/productService.js` | 28 (`getAllProducts`, dead) | same, or delete function (see §5 D2) | NO |
| 4 | `src/api/constants.js` | 464 | `DEFAULT_LIMIT: 100, // Load all for caching` → `DEFAULT_LIMIT: 2000, // BUG-451: single-page full load; backend-verified max ≥ 2000` | NO |

**Files NOT touched:** `productTransform.js`, `MenuContext`, `insightsService.js`, `settingsService.js` (inherits new default only if a caller omits `limit` — none does), `LoadingPage` sequencing/tiers, any UI.

## 3. Downstream consumers

| Consumer | Impact of 500 → 2000 |
|---|---|
| Boot time (Tier-2 parallel batch) | Response size ×≤4 for large menus; for menus ≤ 500 items **identical payload** (backend returns what exists). Restaurants > 500 items: a few hundred KB more, once per boot |
| `categoryService.calculateItemCounts` | Now counts all items → category chips show true counts |
| BulkEditor / OrderEntry search | More items in memory; both already handle 500; no pagination UI exists |
| `settingsService.getCancellationReasons` default path | Would inherit 2000 **only** if called without `limit` — current callers pass 100 explicitly. Harmless |
| Insights (`limit: 10000`) | Unchanged |
| LoadingPage progress counter `loaded/total` | Now equal for menus ≤ 2000; for > 2000 the counter still exposes truncation (see §4) |

## 4. Risks

| Risk | L | Mitigation |
|---|---|---|
| **Backend rejects or silently caps `limit=2000`** (Laravel validation `max:` or server-side cap) | **CLEARED — probe DONE 2026-09-24** | R11 probe run against preprod with the owner-supplied yabyum owner alias (credential NOT stored, R20). Restaurant has **561 products → real repro of the 500 cap**. Results (`evidence/BUG-451/probe_limit_{500,1000,2000,5000}.json`, token masked): `limit=500` → HTTP 200, returned **500**, `total_size` 561 (bug) · `limit=1000` → 200, **561**/561 · **`limit=2000` → 200, 561/561, `limit` echoed `"2000"`** · `limit=5000` → 200, 561/561. No validation error, no server cap up to 5000. Payload 2000 = 921 KB vs 819 KB at 500 (+12 %) for this restaurant. |
| Menus > 2000 items in future | LOW | Option (not in scope, note for owner): LoadingPage already knows `total`; a follow-up CR could re-fetch with `limit: total` when `total > loaded` (self-healing, 3–4 lines) |
| Larger payload on slow links → boot timeout | LOW | Only affects restaurants that are truncated today; LoadingPage has per-station retry (CR-038) |
| R5 `LoadingPage.jsx` | LOW | Literal-only edit inside existing call; regression: boot completes, products station SUCCESS, count = total |
| Dead `getAllProducts` left at 500 | LOW | D2 below |

## 5. Owner decisions (Gate 2 — CLOSED 2026-09-24)

| # | Decision | Owner answer |
|---|---|---|
| **D1** | Use one constant (`PAGINATION.DEFAULT_LIMIT = 2000`) at all 3 call sites **vs** keep 3 literals `2000` | **LOCKED 2026-09-24 — Constant** (`LoadingPage`/`useRefreshAllData` +1 import each) |
| **D2** | `getAllProducts` (dead, 0 callers): delete or update literal | **LOCKED 2026-09-24 — Delete** (`productService.js` L23–30) |
| D3 (info) | Self-healing re-fetch when `total > loaded` — separate CR later? | Note only; not in BUG-451 scope (Q8 not asked — carry to a later intake) |

## 6. Verification approach (seeds Gate 3 matrix)
1. **Probe — DONE 2026-09-24** (see §4): `GET get-products-list?limit=2000&offset=1&type=all` → 200, `returned 561 == total_size 561` on a 561-product restaurant; `limit=500` returns 500 (bug reproduced server-side). Evidence `evidence/BUG-451/probe_limit_<N>.json` (token masked). Gate 3 re-run not needed unless HEAD of backend changes.
2. Grep: `grep -rn "limit: 500" src/` → 0 hits; `DEFAULT_LIMIT: 2000`
3. Boot on preprod: products station SUCCESS, `loaded == total`
4. Sidebar Refresh: products count unchanged after refresh
5. `yarn build` 0 new warnings; unit: none existing for productService → optional 1 test asserting `getProducts()` default params `{limit:2000, offset:1, type:'all'}`

## 7. Scope lock (for Gate 3)
WILL change: `LoadingPage.jsx` (L422), `useRefreshAllData.js` (L29), `productService.js` (L28 or delete L23–30), `api/constants.js` (L464).
WILL NOT touch: `productTransform.js`, `MenuContext`, `insightsService.js`, `settingsService.js`, LoadingPage tier/sequencing logic.

---
```
Impact Analysis complete: BUG-451
Code reality: NONE · Conflict: NONE (CR-385 touches constants.js elsewhere — parallel-safe) · Risk: HIGH (class) / LOW (edit)
Files WILL change: pages/LoadingPage.jsx (R5, literal), hooks/useRefreshAllData.js, api/services/productService.js, api/constants.js
Files WILL NOT touch: productTransform.js, MenuContext, insightsService.js, settingsService.js
Owner decisions: D1 constant LOCKED · D2 delete dead getAllProducts LOCKED (2026-09-24)
BLOCKER CLEARED 2026-09-24: backend accepts limit=2000 (200, 561/561 on a 561-product restaurant; 500 cap reproduced) — evidence/BUG-451/probe_limit_*.json
GATE 2: CLOSED 2026-09-24 (owner). Gate 3 NOT started (owner instruction).
Next: Gate 3 Implementation Plan — only on owner "Gate 3 GO"
```
