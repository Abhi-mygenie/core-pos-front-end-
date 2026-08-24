# BUG-340 Intake — Popular Tab Items Render as Empty Chips

**ID:** BUG-340
**Date:** 2026-08-22
**Sprint:** POS 6.0
**Source:** OWNER-REPORTED + AGENT-CONFIRMED
**Confidence:** CONFIRMED (code trace + API probe + owner screenshot)

---

## 1. Summary

**Title:** Popular tab items render as empty chips — `adaptProduct()` receives raw API format (id/name/price) instead of transformed MenuContext format (productId/productName/basePrice)

| Field | Value |
|---|---|
| Type | Bug — CR-148 post-delivery |
| Area | Order Entry → Popular tab |
| Priority | **P1** |
| Risk | **HIGH** |
| Duplicate check | **DISTINCT** — CR-148 (parent) is IMPLEMENTED; this is a new post-delivery defect |
| Code reality | **PARTIAL** — on-demand fetch approach exists (OrderEntry.jsx:99,550) but transform chain is broken |
| Blast radius | **LARGE** — 3 R5 hotspot files: LoadingPage.jsx, MenuContext.jsx, OrderEntry.jsx |
| Related | CR-148 (parent, IMPLEMENTED), CR-037 (removed old popular boot flow) |

---

## 2. Symptom

Popular tab is visible in Order Entry (CR-148 fix working: `showPopularCategory=true` now correctly read from profile). However, all item chips show as **blank outlined pills with no text and no price**. An orange "1" badge appears on every chip.

Owner screenshot confirms: Popular tab selected, ~8 empty pill shapes, no item names rendered.

---

## 3. Root Cause (CONFIRMED)

### Break point

```
getPopularFoods('all') called in OrderEntry.jsx useEffect (line 134)
  → res.data.products[] received (raw API format)
  → .map(adaptProduct)   ← BREAK POINT
        ↑ adaptProduct reads: product.productId, product.productName, product.basePrice
        ↑ raw API has:         product.id,        product.name,        product.price
  → popularProducts[] set: [{ id: undefined, name: undefined, price: undefined, ... }]

Item chip renders:
  <span>{item.itemCode ? ...}{item.name}</span>
  → item.name = undefined → empty chip
```

### Why the mismatch exists

`adaptProduct()` in `OrderEntry.jsx` was designed for the **already-transformed** MenuContext product shape (output of `productTransform.fromAPI()`). Regular categories work because `MenuContext.products[]` goes through `productTransform.fromAPI()` during boot:

```
LoadingPage → GET /products → productTransform.fromAPI() → MenuContext.products[]
                               ↑ transforms: id → productId, name → productName
```

But the on-demand popular food fetch in OrderEntry bypasses that transform:

```
OrderEntry useEffect → GET /popular-food → raw API response → adaptProduct()  ← BROKEN
                                            (id, name, price)   (expects productId, productName)
```

### Evidence

- `adaptProduct` definition: OrderEntry.jsx line 66 — reads `product.productId`, `product.productName`, `product.basePrice`
- `productTransform.fromAPI`: line 55-66 — maps `api.id → productId`, `api.name → productName`, `api.price → basePrice`
- Popular-food API evidence: `/app/memory/evidence/CR-148/popular_food_response.json` — confirms raw fields `id`, `name`, `price`

---

## 4. Owner-Proposed Fix (Architecture Change)

Load popular items during menu boot, not on-demand. Owner confirmed this is the right direction.

**Proposed change:**

```
LoadingPage.jsx (boot sequence) — gated by showPopularCategory:
  if (showPopularCategory) {
    GET /popular-food?type=all
    → productTransform.fromAPI() for each item   ← same path as all other products
    → store in MenuContext.popularProducts[]
  }

OrderEntry.jsx:
  - Remove getPopularFoods() useEffect
  - Remove popularProducts local state
  - Read from MenuContext.popularProducts instead

MenuContext.jsx:
  - Add popularProducts field (default [])
  - Expose via context value
```

**Why this is correct:**
1. Natural transform chain — `productTransform.fromAPI()` is already the standard for all menu products
2. No latency on Order Entry open — items in memory at boot
3. Consistent architecture — popular items live in MenuContext alongside all other menu data
4. No field mismatch bug possible — same transform, same shape

---

## 5. Evidence

- **Screenshot:** Owner-shared 2026-08-22 — Popular tab selected, all chips blank
- **Code trace:** `/app/memory/handover/SESSION_HANDOVER_2026_08_22_IMPL_CR148_CR150.md`
- **API probe:** `/app/memory/evidence/CR-148/popular_food_response.json`
- **Investigation session:** 2026-08-22 (this session — "investigation only" confirmed)

---

## 6. Blast Radius

| File | Change needed | R5 Hotspot? |
|---|---|---|
| `LoadingPage.jsx` | + popular food fetch in boot sequence (gated) | ✅ YES |
| `MenuContext.jsx` | + `popularProducts` field + context value | ✅ YES |
| `OrderEntry.jsx` | - remove on-demand fetch + useEffect; read from context | ✅ YES |
| `productTransform.js` | No change needed — already handles `fromAPI` correctly | — |

Estimated scope: **LARGE** — 3 R5 hotspot files. Full gate cycle required (Gate 2 Impact Analysis → Gate 3 Plan → Gate 4 GO → Implementation).

---

## 7. Owner Decisions (ALL RESOLVED — 2026-08-22)

| # | Question | Answer |
|---|---|---|
| OQ-1 | Load during menu boot, gated by `showPopularCategory`? | **YES — confirmed** |
| OQ-2 | Should popularProducts refresh on menu refresh? | **YES — refresh alongside menu refresh** |
| OQ-3 | If popular food API fails at boot, silent fail or block boot? | **BLOCK BOOT** |

---

## 8. Next Steps

All owner decisions resolved. Ready for Gate 2.

**→ Planning agent: Gate 2 Impact Analysis**

Key constraints for Impact Analysis:
- `LoadingPage.jsx` and `MenuContext.jsx` are R5 hotspots — additive only, no existing flow changes
- Popular fetch must be gated by `showPopularCategory` (skip entirely when off)
- API failure must **block boot** (owner decision OQ-3) — treat same as products/categories failure
- `popularProducts` must refresh alongside menu refresh (owner decision OQ-2)
- Remove on-demand fetch from `OrderEntry.jsx` (3 edits: import removal, state removal, useEffect removal)
- `OrderEntry.jsx` reads from `MenuContext.popularProducts` instead of local state
