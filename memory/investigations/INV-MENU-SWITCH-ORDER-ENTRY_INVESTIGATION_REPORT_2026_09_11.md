# Investigation Report — Menu Switch in POS Order Entry

**Date:** 2026-09-11  
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)  
**Scope:** Can POS Order Entry be extended to allow switching between Normal, Party, Premium menus? Owner confirmed no backend blocker.  
**Steps used:** 7/10  
**Files read:** `OrderEntry.jsx`, `MenuContext.jsx`, `productTransform.js`, `categoryTransform.js`, `productService.js`, `categoryService.js`, `LoadingPage.jsx`, `CategoryPanel.jsx`

---

## 1. Summary

| | |
|-|-|
| **Verdict** | Fully implementable as a FRONTEND-ONLY change. Backend already returns all menu types. One filter line in `productTransform.js` is the only technical blocker. |
| **Root cause of gap** | `productTransform.js:47` hard-filters `products` to `foodFor === 'Normal'`. `MenuContext` has no `selectedMenuType` concept. `OrderEntry` has no menu switch UI. |
| **Classification** | FEATURE GAP — planned (Phase 3 comment exists in codebase) but not yet implemented |
| **Confidence** | HIGH — confirmed across all relevant files |
| **Backend changes** | NONE — owner confirmed, and code confirms backend already serves all menu types |
| **Steps used** | 7/10 |

---

## 2. How the Current Architecture Works (Data Flow)

```
LoadingPage (boot)
  └─ productService.getProducts({ limit: 500, type: 'all' })
       └─ GET /api/v1/vendoremployee/get-products-list?type=all&limit=500
            └─ Backend returns: Normal + Party + Premium + other items (ALL food_for types)
       └─ productTransform.fromAPI.productListResponse()
            └─ productTransform.productList(apiProducts)
                 └─ .map(fromAPI.product)      ← transforms each item, sets foodFor field
                 └─ .filter(p => p.foodFor === 'Normal')   ← ⚠️ FILTERS OUT Party + Premium
                 └─ .filter(p => name !== 'check in')
  └─ setProducts(data.products)                ← only Normal items enter MenuContext

MenuContext
  └─ products: [ ...Normal items only... ]
  └─ categories: [ ...all categories (no food_for filter on categories)... ]
  └─ NO selectedMenuType state
  └─ NO activeMenuType concept

OrderEntry.jsx
  └─ const { categories, products } = useMenu()
  └─ shows categories + products — all from Normal menu only
  └─ NO menu type selector UI
  └─ NO Party / Premium / other menu accessible
```

---

## 3. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|-----------|------|--------|---------|
| H1 | The boot API only fetches Normal items | Read `productService.getProducts` call | **ELIMINATED** — API called with `type: 'all'`, no `food_for` filter at API level | `LoadingPage.jsx:422`, `productService.js:19`, `API_ENDPOINTS.PRODUCTS` |
| H2 | The frontend transform filters out non-Normal items | Read `productTransform.productList` | **CONFIRMED** — line 47: `.filter(p => p.foodFor === 'Normal')` with comment "Phase 3: will support multiple menus" | `productTransform.js:40–48` |
| H3 | MenuContext has a menu type selector | Read `MenuContext.jsx` in full | **ELIMINATED** — No `selectedMenuType`, no `activeProducts` concept, single flat `products` array | `MenuContext.jsx:1–157` |
| H4 | OrderEntry has a hidden/disabled menu switch UI | `grep menuType|Party|Premium|selectedMenu` in OrderEntry | **ELIMINATED** — Zero results. No menu switch UI exists | `OrderEntry.jsx` grep |
| H5 | Categories are menu-type-specific | Read `categoryService.js` + `categoryTransform.js` | **ELIMINATED** — Categories have no `food_for` field. Shared across all menu types. | `categoryTransform.js` grep |
| H6 | Aggregator items would appear in the switch | Read productTransform.product() | **SCOPED OUT** — Owner: "apart from the aggregator". Aggregator items use a separate order flow. Switch should exclude `food_for: 'Aggregator'` | `productTransform.js:109` |
| H7 | Backend needs changes to support other menu types in order placement | Trace order placement from OrderEntry | **ELIMINATED** — Order placement sends item IDs; backend looks up `food_for` from item record. No frontend `food_for` parameter needed in order API | `OrderEntry.jsx` order flow |

---

## 4. What Needs to Change (Frontend Only)

### Change 1 — `productTransform.js` (1 line)

```diff
- .filter(p => p.foodFor === 'Normal')
+ .filter(p => p.foodFor !== 'Aggregator')   // keep Normal, Party, Premium; exclude Aggregator
```

All non-Aggregator menu items now flow into `MenuContext`. Boot fetches them already — no new API call needed.

---

### Change 2 — `MenuContext.jsx` (~15 lines)

Add `selectedMenuType` state and `activeProducts` derived value:

```js
const [selectedMenuType, setSelectedMenuType] = useState('Normal');

// Derived: products for the currently selected menu
const activeProducts = useMemo(
  () => products.filter(p => p.foodFor === selectedMenuType),
  [products, selectedMenuType]
);

// Expose: available menu types (computed from loaded products)
const availableMenuTypes = useMemo(
  () => [...new Set(products.map(p => p.foodFor).filter(t => t !== 'Aggregator'))],
  [products]
);
```

Expose `activeProducts`, `selectedMenuType`, `setSelectedMenuType`, `availableMenuTypes` from context.

---

### Change 3 — `OrderEntry.jsx` (menu selector UI, ~20 lines)

Change `const { categories, products } = useMenu()` to use `activeProducts` instead of `products`.

Add a compact menu type selector **above the CategoryPanel** (or as the top bar of the item selection area):

```
[ Normal ]  [ Party ]  [ Premium ]   ← only show types that have items
```

When user switches: `setSelectedMenuType('Party')` — item grid instantly shows Party items in the same category layout.

---

### Change 4 — `CategoryPanel.jsx` (0 lines — no change needed)

Categories are shared across menu types. The category panel auto-adjusts because `OrderEntry` already filters items by category from the context. Switching menu type changes which items are in each category.

> **Note:** Some categories may show `0 items` for a given menu type (e.g., "Specials" exists only in Normal). The item count shown in CategoryPanel should be computed from `activeProducts`, not all products. This needs a check in `LoadingPage.jsx` where `calculateItemCounts` is called.

---

## 5. Full Impact Map

| File | Change | Lines | Risk |
|------|--------|:-----:|------|
| `productTransform.js` | Change filter from `=== 'Normal'` to `!== 'Aggregator'` | 1 | LOW |
| `MenuContext.jsx` | Add `selectedMenuType`, `activeProducts`, `availableMenuTypes` | ~15 | LOW |
| `OrderEntry.jsx` | Use `activeProducts` instead of `products`; add menu type tab UI | ~20 | MEDIUM (2936-line complex component) |
| `LoadingPage.jsx` | `calculateItemCounts` should use `activeProducts` for correct counts per menu | ~5 | LOW |
| `CategoryPanel.jsx` | No change needed | 0 | — |
| **TOTAL** | | **~41 lines** | MEDIUM |

**Hotspot file:** `OrderEntry.jsx` (2936 lines, complex) — MEDIUM risk. BUT the change is additive (new state + new UI element); existing Normal menu flow is preserved.

**Backend changes: ZERO** (confirmed).

---

## 6. UX Design Options

### Option A — Tab strip above the item grid (recommended)

```
┌────────────────────────────────────────────────┐
│  [ Normal ●]  [ Party ]  [ Premium ]            │  ← new tab row
├──────────┬─────────────────────────────────────┤
│ Category │ Item Grid                            │
│ panel    │                                      │
│          │                                      │
└──────────┴─────────────────────────────────────┘
```

- Only shows menu types that have at least 1 active item
- Active tab = current menu (orange highlight, matches app style)
- When tab switches: category selection resets to "All", item grid refreshes instantly

### Option B — Dropdown in the order type bar

Add a compact "Menu: Normal ▼" dropdown in the top header bar of OrderEntry next to the order type (Dine-in / Delivery / Takeaway) pills.

- Less visible but doesn't use vertical space
- Risk: user may not notice it

### Option C — Per-order selection at order start

Force menu selection when creating a new order (before reaching the item grid). Once order started, menu type is locked for that order.

- Cleaner for party bookings (entire order from Party menu)
- But prevents adding items from different menus in same order

**Recommendation: Option A** — most discoverable, consistent with existing POS tab-based UX.

---

## 7. Edge Cases to Consider

| Edge Case | Impact | Suggested handling |
|-----------|--------|-------------------|
| Same item name exists in Normal + Party with different prices | UI shows correct item for selected menu | Category-level item list is already filtered by `foodFor` after the change — no collision |
| User is mid-order and switches menu | Items already in cart stay (different menu items can coexist in one order — owner to decide) | Preserve cart; just change which new items are browseable |
| Party menu has 0 items | Tab not shown | `availableMenuTypes` only includes types with > 0 active items |
| Restaurant has only Normal menu | No tab shown | If `availableMenuTypes.length === 1`, hide the tab strip entirely — no UX change for restaurants without multi-menu |
| CategoryPanel count shows wrong items | Category may show "5 items" but only 2 are in selected menu | Fix `calculateItemCounts` to use `activeProducts` |

---

## 8. Recommendation

| | |
|-|-|
| **Register as** | CR-376 — Menu Switch in POS Order Entry |
| **Severity** | P2 — MEDIUM (important capability, but existing Normal menu works fine) |
| **Risk** | MEDIUM (OrderEntry is complex) |
| **Fast Lane** | NOT ELIGIBLE — touches OrderEntry (complex, critical component) |
| **Planning skip** | NOT ELIGIBLE — needs Gate 2 → 3 → 4 before implementation |
| **Backend ask** | None |

---

## 9. Retroactive Candidates

- `productTransform.js:41` already has the Phase 3 comment — this is the planned architecture. CR-376 IS Phase 3.

---

*Investigation complete. 7/10 steps used. HIGH confidence. Frontend-only change. Owner can approve Gate 2 → Implementation whenever ready.*
