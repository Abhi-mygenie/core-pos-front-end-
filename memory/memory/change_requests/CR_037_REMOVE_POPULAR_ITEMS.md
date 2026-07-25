# CR-037 — Remove Popular Items from Boot + Order Screen

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Loading / Order Entry / MenuContext
**Priority:** P2 (UX optimization — saves ~8.6s on boot; no money/data impact)
**Sprint:** POS 4.0

---

## 1. Symptom / Requirement

The boot (loading) screen makes a call to `GET /api/v2/vendoremployee/buffet/buffet-popular-food` with `{ limit: 50, offset: 1, type: 'all' }`. This returns 50 of 390 total "popular" products and takes **8.6 seconds** — the slowest step on the entire boot sequence.

The "Popular Items" data feeds a "Popular" category tab on the Order Entry screen (`OrderEntry.jsx:525`). **Owner directive: this feature is not used. Remove it entirely.**

---

## 2. What to Remove

### Boot / Loading (LoadingPage.jsx)
- `loadPopularFood` async function (L461–476)
- `popularFood` entry in `loaderMap` (L506)
- `popularFood` entry in `API_LOADING_ORDER` constant (constants.js L288)
- `if (data.popularFood) setPopularFood(data.popularFood)` dispatch (L569)
- The "Popular Items" row on the boot screen UI

### MenuContext (MenuContext.jsx)
- `popularFood` state (`useState`, L10)
- `setPopularFood` callback (L39–41)
- `popularFood` / `setPopularFood` from context value (L97, L104, L117, L122)
- Reset in `clearAll` / logout (L48)

### Order Entry (OrderEntry.jsx)
- `popularFood` destructured from `useMenu()` (L51)
- `activeCategory === "popular"` branch in `getFilteredItems()` (L525–527)
- Any "Popular" category tab/button in the category panel UI

### Product Service (productService.js)
- `getPopularFood` export (L37–46)
- `getPopularProducts` helper (L110+) if unused elsewhere

### Product Transform (productTransform.js)
- `popularFoodResponse` transform (L190)

### Constants (constants.js)
- `POPULAR_FOOD` endpoint (L16)
- `popularFood` entry in `API_LOADING_ORDER` (L288)

---

## 3. Impact

- **Boot time:** Saves ~8.6s (Popular Items was the slowest parallel loader)
- **Order Entry:** "Popular" category tab removed — cashiers use "All" or specific categories
- **Regression risk:** LOW — Popular was a read-only display feature with a fallback already in place (`products.slice(0, 20)`)
- **Money/payload impact:** NONE — Popular Items is display-only, never part of order/billing payloads
- **Files:** ~6 files touched, all additive removals

---

## 4. Owner Decisions

| # | Decision | Owner Directive |
|---|----------|-----------------|
| OD-1 | Skip popular API entirely on boot | YES — "we need to skip this" |
| OD-2 | Remove "Popular" from order screen | YES — "popular will be basically not there" |

---

## 5. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-037 Intake — 2026-06-12*
