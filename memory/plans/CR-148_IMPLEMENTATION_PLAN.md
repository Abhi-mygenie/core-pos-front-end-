# CR-148 — Popular Food Category
## Gate 3: Implementation Plan

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Risk:** HIGH (OrderEntry.jsx is R5 hotspot)
**Sprint:** POS 6.0

---

## Owner Decisions — All Resolved

| # | Question | Answer |
|---|---|---|
| OQ-1 | Approve CR-037 reversal? | **YES — GO** (2026-08-22) |
| OQ-2 | Popular tab position | **Popular = position #1 AND default active tab. "All" moves to position #2.** |
| OQ-3 | Tab label | "Popular" |
| OQ-4 | `type` param for Aggregator | Use `type=all` for now; revisit if Aggregator-specific filtering needed |

---

## Scope Lock

**Files WILL change (4 files):**
- `src/api/constants.js`
- `src/api/services/menuManagementService.js`
- `src/components/order-entry/CategoryPanel.jsx`
- `src/components/order-entry/OrderEntry.jsx`

**Files WILL NOT touch:**
- `LoadingPage.jsx` (popular items NOT in boot/MenuContext — on-demand fetch only)
- `MenuContext.jsx`
- `productTransform.js`
- `useRefreshAllData.js`
- `CollectPaymentPanel.jsx`
- Any financial / settlement logic

---

## Edit-by-Edit Plan

### Edit 1 — `src/api/constants.js`
**Change:** Add `POPULAR_FOOD` endpoint constant in the Menu section.

**Location:** After line 16 (`PRODUCTS: '/api/v1/vendoremployee/get-products-list',`)

**Before:**
```js
  PRODUCTS: '/api/v1/vendoremployee/get-products-list',
  
  // Table Operations (Phase 1C)
```

**After:**
```js
  PRODUCTS: '/api/v1/vendoremployee/get-products-list',
  POPULAR_FOOD: '/api/v2/vendoremployee/popular-food',   // CR-148
  
  // Table Operations (Phase 1C)
```

**Risk:** LOW — additive constant only.

---

### Edit 2 — `src/api/services/menuManagementService.js`
**Change:** Add `getPopularFoods(type)` service function.

**Location:** After the `getMenuMaster` function (end of FOOD APIs section, ~line 20).

**Add:**
```js
/** CR-148 — Popular food items (ordered by order frequency) */
export const getPopularFoods = (type = 'all') =>
  api.get(API_ENDPOINTS.POPULAR_FOOD, { params: { type } });
```

**Also add import** (at top of file, alongside existing constants import):
```js
import { AGGREGATOR_SYNC_ENDPOINTS, API_ENDPOINTS } from '../constants'; // CR-148: API_ENDPOINTS added
```
*(Current import is `import { AGGREGATOR_SYNC_ENDPOINTS } from '../constants';` — extend it)*

**Risk:** LOW — additive function, no existing code touched.

---

### Edit 3 — `src/components/order-entry/CategoryPanel.jsx`
**Change:** Accept `showPopularCategory` prop; prepend "Popular" entry before "All" when true.

**Before (lines 5–13):**
```js
const CategoryPanel = ({ activeCategory, onCategoryChange, onBack, categories = [] }) => {
  // Build full category list: All + real categories from API
  const allCategories = useMemo(() => {
    const specials = [
      { id: "all", name: "All" },
    ];
    const real = categories.map(c => ({ id: c.categoryId, name: c.categoryName }));
    return [...specials, ...real];
  }, [categories]);
```

**After:**
```js
// CR-148: showPopularCategory prop — when true, Popular is first + default
const CategoryPanel = ({ activeCategory, onCategoryChange, onBack, categories = [], showPopularCategory = false }) => {
  // Build full category list: (Popular?) + All + real categories from API
  const allCategories = useMemo(() => {
    const specials = [];
    if (showPopularCategory) specials.push({ id: "popular", name: "Popular" }); // CR-148: Popular first
    specials.push({ id: "all", name: "All" });
    const real = categories.map(c => ({ id: c.categoryId, name: c.categoryName }));
    return [...specials, ...real];
  }, [categories, showPopularCategory]);
```

**Risk:** MEDIUM — additive prop + useMemo dep. No existing rendering logic changed.

---

### Edit 4a — `src/components/order-entry/OrderEntry.jsx` — State
**Change:** Add `showPopularCategory` gate, change default `activeCategory`, add `popularProducts` state.

**Location:** Lines 95–96 (current `activeCategory` state declaration).

**Before:**
```js
  const [activeCategory, setActiveCategory] = useState("all");
```

**After:**
```js
  // CR-148: Popular category gate + state
  const showPopularCategory = !!restaurant?.settings?.showPopularCategory;
  const [activeCategory, setActiveCategory] = useState(() => showPopularCategory ? "popular" : "all"); // CR-148: default to popular if enabled
  const [popularProducts, setPopularProducts] = useState([]); // CR-148
```

**Risk:** HIGH — changes default state in R5 hotspot. Additive only: `showPopularCategory=false` → `"all"` default (same as today). Only new behaviour when setting is true.

---

### Edit 4b — `src/components/order-entry/OrderEntry.jsx` — Fetch useEffect
**Change:** Add useEffect to fetch popular foods on mount when toggle is on.

**Location:** After the existing settings-init useEffect (around line 122 where `setPrintAllKOT`/`setPrintAllBill` are set).

**Add import at top of file:**
```js
import { getPopularFoods } from '../../api/services/menuManagementService'; // CR-148
```

**Add useEffect:**
```js
  // CR-148: Fetch popular foods on mount if showPopularCategory is enabled
  useEffect(() => {
    if (!showPopularCategory) return;
    getPopularFoods('all')
      .then(res => {
        const items = (res.data?.products || []).map(adaptProduct);
        setPopularProducts(items);
      })
      .catch(() => {}); // silent — if fetch fails, Popular tab shows empty (graceful)
  }, [showPopularCategory]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Risk:** HIGH (R5 hotspot) — additive useEffect. Guard: `if (!showPopularCategory) return` means zero new network calls for restaurants that don't have Popular toggle on.

---

### Edit 4c — `src/components/order-entry/OrderEntry.jsx` — getFilteredItems
**Change:** Add "popular" branch as first case in `getFilteredItems`.

**Location:** Line 532 (current `getFilteredItems` function).

**Before:**
```js
  const getFilteredItems = () => {
    let items;
    if (activeCategory === "all") {
      items = products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
    } else {
      items = products
        .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
        .map(adaptProduct);
    }
```

**After:**
```js
  const getFilteredItems = () => {
    let items;
    if (activeCategory === "popular") { // CR-148: popular tab — from on-demand API fetch
      items = popularProducts;
    } else if (activeCategory === "all") {
      items = products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
    } else {
      items = products
        .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
        .map(adaptProduct);
    }
```

**Risk:** HIGH (R5 hotspot) — additive branch. If `activeCategory !== "popular"` (which it never is when toggle is off), existing paths are completely untouched.

---

### Edit 4d — `src/components/order-entry/OrderEntry.jsx` — CategoryPanel prop
**Change:** Pass `showPopularCategory` to `<CategoryPanel>`.

**Location:** Line 1571 (CategoryPanel JSX call).

**Before:**
```jsx
          <CategoryPanel
            activeCategory={activeCategory}
            onCategoryChange={(id) => setActiveCategory(id)}
            onBack={onClose}
            categories={categories}
          />
```

**After:**
```jsx
          <CategoryPanel
            activeCategory={activeCategory}
            onCategoryChange={(id) => setActiveCategory(id)}
            onBack={onClose}
            categories={categories}
            showPopularCategory={showPopularCategory} // CR-148
          />
```

**Risk:** LOW — prop pass-through only.

---

## Execution Sequence

```
1. Edit 1 — constants.js           (no dependencies)
2. Edit 2 — menuManagementService  (depends on Edit 1 for API_ENDPOINTS import)
3. Edit 3 — CategoryPanel.jsx      (independent of 1+2)
4. Edit 4a — OrderEntry.jsx state  (depends on nothing yet)
5. Edit 4b — OrderEntry.jsx fetch  (depends on Edit 2 + Edit 4a)
6. Edit 4c — OrderEntry.jsx filter (depends on Edit 4a)
7. Edit 4d — OrderEntry.jsx prop   (depends on Edit 3)
```

Webpack compile check after Edit 4d (all OrderEntry edits done).

---

## Verification Matrix

| Edit | File | Change | How to Verify | Manual/Auto |
|---|---|---|---|---|
| 1 | constants.js | POPULAR_FOOD constant exists | `grep -n "POPULAR_FOOD" src/api/constants.js` | AUTO |
| 2 | menuManagementService.js | `getPopularFoods` exported | `grep -n "getPopularFoods" src/api/services/menuManagementService.js` | AUTO |
| 3 | CategoryPanel.jsx | Popular tab renders when `showPopularCategory=true` | Browser: enable toggle → Popular tab appears at position #1 | MANUAL |
| 3 | CategoryPanel.jsx | All tab still at position #2 | Browser: enable toggle → All is below Popular | MANUAL |
| 3 | CategoryPanel.jsx | No Popular tab when `showPopularCategory=false` | Browser: disable toggle → list starts with All | MANUAL |
| 4a | OrderEntry.jsx | Default tab = Popular when toggle on | Browser: open Order Entry → Popular highlighted by default | MANUAL |
| 4a | OrderEntry.jsx | Default tab = All when toggle off | Browser: disable toggle → All highlighted by default | MANUAL |
| 4b | OrderEntry.jsx | API called on mount when toggle on | Browser Network tab → GET /popular-food?type=all on mount | MANUAL |
| 4b | OrderEntry.jsx | No API call when toggle off | Browser Network tab → no /popular-food call | MANUAL |
| 4c | OrderEntry.jsx | Popular tab shows top-20 items | Click Popular → items load from API (not MenuContext) | MANUAL |
| 4d | OrderEntry.jsx | Regular categories still work | Click any regular category → correct items | MANUAL |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-148 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: CR-148 row → Gate 5 IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add constants.js, menuManagementService.js, CategoryPanel.jsx, OrderEntry.jsx (CR-148, 2026-08-22)
- [ ] Code markers: // CR-148 comment in every modified file (already included in plan)
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| OrderEntry.jsx R5 hotspot | HIGH | Additive only — new state + new branch in getFilteredItems. Existing paths untouched. `showPopularCategory=false` (default) is 100% same as today. |
| Popular API fetch fails | LOW | `catch(() => {})` — silent fail. Popular tab shows empty but app doesn't crash. |
| `showPopularCategory` undefined in settings | LOW | `!!restaurant?.settings?.showPopularCategory` — falsy-safe double-negation. |
| Type filter for Aggregator | LOW | OQ-4 deferred — `type=all` works for Normal. If Aggregator filtering needed, only Edit 4b needs updating (1 line). |

---

Planning complete: CR-148
Stage: Gate 3 — Implementation Plan
Code reality: NONE
Risk: HIGH
Files WILL change: constants.js, menuManagementService.js, CategoryPanel.jsx, OrderEntry.jsx (4 files)
Files WILL NOT touch: LoadingPage.jsx, MenuContext.jsx, productTransform.js, useRefreshAllData.js
Owner decisions: ALL RESOLVED
Docs: /app/memory/plans/CR-148_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
