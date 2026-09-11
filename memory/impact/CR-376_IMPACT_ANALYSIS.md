# Impact Analysis — CR-376
## POS Order Entry: Menu Switch (Normal / Party / Premium)

**Date:** 2026-09-11
**Agent Role:** PLANNING (Gate 2 — Impact Analysis)
**Sprint:** pos_7_0
**Intake doc:** `change_requests/CR-376_MENU_SWITCH_ORDER_ENTRY_INTAKE.md`
**Architecture revision:** `investigations/INV-CR376-ARCH-REVISION-2026-09-10.md`

---

## Header

| Field | Value |
|---|---|
| **Code Reality** | NONE — zero CR-376 code in `src/`. The `=== 'Normal'` filter at `productTransform.js:47` is untouched. No `selectedMenuType`, `activeMenuType`, `mygenie_active_menu_type`, or `activeProducts` found anywhere in the codebase. |
| **Conflict Pre-Check** | See §6 below. Summary: ZERO active conflicts. OrderEntry.jsx (BUG-374/372 changes) is parallel-safe — those changes are cart-key logic, not the item-display area (L553). |
| **Risk** | MEDIUM — expands product set in MenuContext (all non-Aggregator instead of Normal-only), touches 3 HOTSPOT files, but zero financial logic, zero API changes, zero order payload changes. |
| **Fast Lane eligible** | NO — 5 files, 2 new files (util + config), 3 hotspots. |

---

## 1. Root Cause (confirmed in code)

```js
// productTransform.js:47 — THE blocker
.filter(p => p.foodFor === 'Normal')   // only Normal items reach MenuContext
// Comment on L40: "Phase 3: will support multiple menus" — THIS IS PHASE 3
```

Backend already returns all `food_for` types. The frontend silently discards everything non-Normal. One character change unlocks all menu types.

---

## 2. Data Flow Trace

```
Backend API /pos/products (all food_for types)
  ↓
productTransform.productList()          [L47 — THE FILTER]
  → currently: keeps only foodFor === 'Normal'
  → after fix: keeps all except foodFor === 'Aggregator'
  ↓
LoadingPage.jsx L589
  → calculateItemCounts(categories, data.products)
  → ISSUE: after fix, products = Normal+Party+Premium mixed
  → FIX: filter to activeMenuType before calculateItemCounts
  ↓
MenuContext.jsx → setProducts(data.products)
  → currently: products[] = Normal items only
  → after fix: products[] = all non-Aggregator items
  → ADD: activeMenuType (read from localStorage)
  → ADD: activeProducts = products.filter(p => p.foodFor === activeMenuType)
  ↓
OrderEntry.jsx L56 → const { products } = useMenu()
  → currently: products = Normal only → displayed in item grid
  → after fix: products = all non-Aggregator
  → CHANGE: use activeProducts for item grid display (L553, L555)
  → ADD: passive chip indicator if activeMenuType !== 'Normal'
  ↓
StatusConfigPage.jsx
  → NEW: "Active Menu" section
  → reads availableMenuTypes from useMenu()
  → saves mygenie_active_menu_type to localStorage on Save
  ↓
useRefreshAllData.js L33
  → calculateItemCounts(catResult, prodResult.products)
  → ISSUE: same as LoadingPage — counts will include all menu types
  → FIX: filter prodResult.products to activeMenuType before calculateItemCounts
```

---

## 3. Files WILL Change

| # | File | Lines est. | Risk | Hotspot |
|---|---|:---:|---|:---:|
| E1 | `src/api/transforms/productTransform.js` | 1 | LOW | No |
| E2 | `src/utils/activeMenuPrefs.js` (**NEW**) | ~35 | LOW | No |
| E3 | `src/contexts/MenuContext.jsx` | ~12 | LOW | No |
| E4 | `src/components/order-entry/OrderEntry.jsx` | ~15 | MEDIUM | **YES** |
| E5 | `src/pages/StatusConfigPage.jsx` | ~25 | MEDIUM | **YES** |
| E6 | `src/pages/LoadingPage.jsx` | ~5 | MEDIUM | **YES** |
| E7 | `src/hooks/useRefreshAllData.js` | ~5 | LOW | No |
| **TOTAL** | | **~98** | **MEDIUM** | 3 hotspots |

**Files NOT touched:** `CategoryPanel.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, any service/API files, `AppProviders.jsx`, any report files.

---

## 4. Edit-by-Edit Detail

### E1 — `productTransform.js` L47 (1 line)

```js
// CURRENT
.filter(p => p.foodFor === 'Normal')
// AFTER
.filter(p => p.foodFor !== 'Aggregator')
```

Also update the comment on L40 from `"filters to Normal food_for only"` → `"filters out Aggregator — Normal/Party/Premium all pass through"`.

**Downstream impact:** LoadingPage and useRefreshAllData receive more products. MenuContext stores more products. See E6, E7 for the count fix.

---

### E2 — NEW `src/utils/activeMenuPrefs.js` (~35 lines)

Mirror of `qsrModePrefs.js`. Exact pattern:

```js
// CR-376: Active Menu Type preference — station-level local setting.
// Manager sets in StatusConfigPage; Order Entry reads on open.
// Write site: pages/StatusConfigPage.jsx
// Read sites: contexts/MenuContext.jsx, pages/LoadingPage.jsx,
//             hooks/useRefreshAllData.js

export const ACTIVE_MENU_TYPE_KEY = 'mygenie_active_menu_type';
export const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';

export const getActiveMenuType = () => {
  try {
    return localStorage.getItem(ACTIVE_MENU_TYPE_KEY) || ACTIVE_MENU_TYPE_DEFAULT;
  } catch (_) {
    return ACTIVE_MENU_TYPE_DEFAULT;
  }
};

export const setActiveMenuType = (value) => {
  try {
    localStorage.setItem(ACTIVE_MENU_TYPE_KEY, value || ACTIVE_MENU_TYPE_DEFAULT);
  } catch (_) {}
};
```

**Why new file:** Follows exact `qsrModePrefs.js` precedent. Keeps localStorage key management in one place. Zero risk.

---

### E3 — `MenuContext.jsx` (~12 lines)

Add two computed memos after the existing `useState` declarations:

```js
import { getActiveMenuType } from '../utils/activeMenuPrefs'; // new import

// CR-376: active menu type — read once on context init (station-level setting)
const activeMenuType = useMemo(() => getActiveMenuType(), []);

// CR-376: products filtered to active menu type (used by OrderEntry item grid)
const activeProducts = useMemo(
  () => products.filter(p => p.foodFor === activeMenuType),
  [products, activeMenuType]
);

// CR-376: distinct menu types with ≥1 active non-disabled item
const availableMenuTypes = useMemo(
  () => [...new Set(products.filter(p => p.isActive && !p.isDisabled).map(p => p.foodFor))],
  [products]
);
```

Export `activeProducts` and `availableMenuTypes` in the context value object.

**Note on `activeMenuType` dependency in `activeProducts`:** `activeMenuType` is read from localStorage once (useMemo with `[]`). Changes to localStorage from StatusConfigPage take effect on the NEXT MenuContext mount (next order open). This is correct per Design A.

**Downstream:** `getProductsByCategory`, `searchProducts`, `filterProducts` inside MenuContext remain using `products` (full set). They are internal helpers. The product grid in OrderEntry will switch to use `activeProducts` directly (E4).

---

### E4 — `OrderEntry.jsx` (~15 lines) — HOTSPOT

**E4a — Destructure activeProducts:**

```js
// CURRENT (L56)
const { categories, products, popularProducts } = useMenu();
// AFTER
const { categories, products, activeProducts, availableMenuTypes, activeMenuType } = useMenu();
```

Wait — `activeMenuType` isn't exported from MenuContext (it's internal). The chip just needs to know it's not Normal. Let's simplify:

```js
const { categories, products, activeProducts, availableMenuTypes } = useMenu();
// isNonNormalMenu derived:
const isNonNormalMenu = useMemo(
  () => activeProducts.length > 0 && activeProducts[0]?.foodFor !== 'Normal',
  [activeProducts]
);
```

Actually better to just export `activeMenuType` too from MenuContext to keep it clean. So:

```js
const { categories, products, activeProducts, availableMenuTypes, activeMenuType } = useMenu();
```

**E4b — Replace `products` with `activeProducts` in item grid (L553, L555):**

```js
// CURRENT (L551-L557)
} else if (activeCategory === "all") {
  items = products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
} else {
  items = products
    .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
    .map(adaptProduct);
}

// AFTER
} else if (activeCategory === "all") {
  items = activeProducts.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
} else {
  items = activeProducts
    .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
    .map(adaptProduct);
}
```

**E4c — Empty-state when active menu has 0 items (OD-376-06):**

After the `items` computation block, add:

```js
// CR-376: OD-376-06 — if active menu has no items at all, show empty state
const activeMenuHasNoItems = activeProducts.filter(p => p.isActive && !p.isDisabled).length === 0
  && activeMenuType !== 'Normal';
```

Then in the JSX item grid area, gate on `activeMenuHasNoItems`:

```jsx
{activeMenuHasNoItems ? (
  <div className="flex flex-col items-center justify-center h-full text-center px-6">
    <p className="text-sm font-medium" style={{ color: COLORS.primaryOrange }}>
      {activeMenuType} menu has no items configured.
    </p>
    <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
      Please update in Local Settings.
    </p>
  </div>
) : (
  // existing item grid JSX
)}
```

**E4d — Passive chip indicator:**

In the compact header row (around L1650 area — the search/action bar), add a small chip after the search input when active menu is not Normal:

```jsx
{activeMenuType !== 'Normal' && (
  <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
    style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>
    {activeMenuType} Menu
  </span>
)}
```

**E4e — AddCustomItemModal** (L2799): `products={products}` — **LEAVE AS IS.** AddCustomItemModal uses products to get the category list for manual item entry. It should show all available categories from ALL non-Aggregator products, not just the active menu. This is correct behavior — custom items aren't tied to a menu type.

---

### E5 — `StatusConfigPage.jsx` (~25 lines) — HOTSPOT

**E5a — New localStorage key constant (with existing constants block, L63 area):**

```js
// CR-376: Active Menu Type — station-level menu switch.
const ACTIVE_MENU_TYPE_KEY = 'mygenie_active_menu_type';
const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';
```

**E5b — Import activeMenuPrefs utility and useMenu:**

StatusConfigPage already imports `useMenu` (confirmed at L7: `import { useStations, useMenu, useRestaurant } from "../contexts";`). Just add the utility import:

```js
import { getActiveMenuType, setActiveMenuType } from '../utils/activeMenuPrefs';
```

**E5c — Add state (after existing state declarations):**

```js
// CR-376: Active Menu Type
const [activeMenuType, setActiveMenuTypeState] = useState(ACTIVE_MENU_TYPE_DEFAULT);
```

**E5d — Destructure availableMenuTypes from useMenu (L143 area):**

```js
// CURRENT
const { categories } = useMenu();
// AFTER
const { categories, availableMenuTypes } = useMenu();
```

**E5e — Hydrate in boot useEffect (after existing hydrations):**

```js
// CR-376: hydrate Active Menu Type
const storedMenuType = localStorage.getItem(ACTIVE_MENU_TYPE_KEY);
if (storedMenuType) setActiveMenuTypeState(storedMenuType);
```

**E5f — Save in handleSave (after QSR save lines ~L540):**

```js
// CR-376: save Active Menu Type
setActiveMenuType(activeMenuType);
```

**E5g — Reset in handleReset (after QSR reset):**

```js
setActiveMenuTypeState(ACTIVE_MENU_TYPE_DEFAULT);
```

**E5h — New UI section (after QSR section in JSX):**

Only render the section if `availableMenuTypes.length > 1` (hidden for Normal-only restaurants — zero UX change for them per OD-376-02).

```jsx
{/* CR-376: Active Menu */}
{availableMenuTypes.length > 1 && (
  <div className="...">
    <h3>Active Menu</h3>
    <p>Select which menu is active for order taking on this station.</p>
    {availableMenuTypes.map(type => (
      <label key={type}>
        <input
          type="radio"
          value={type}
          checked={activeMenuType === type}
          onChange={() => setActiveMenuTypeState(type)}
        />
        {type}
      </label>
    ))}
  </div>
)}
```

---

### E6 — `LoadingPage.jsx` L589 (~5 lines) — HOTSPOT

```js
// CURRENT (L589)
data.categories = categoryService.calculateItemCounts(data.categories, data.products);

// AFTER
// CR-376: scope category counts to active menu type
const _activeMenuType = localStorage.getItem('mygenie_active_menu_type') || 'Normal';
const _activeProds = data.products.filter(p => p.foodFor === _activeMenuType);
data.categories = categoryService.calculateItemCounts(data.categories, _activeProds);
```

**Why direct localStorage read here:** LoadingPage runs before any context is mounted; the utility import is available but the direct read is simpler at this call site.

---

### E7 — `useRefreshAllData.js` L33 (~5 lines)

```js
// CURRENT (L33)
const enrichedCategories = categoryService.calculateItemCounts(
  catResult,
  prodResult.products
);

// AFTER
// CR-376: scope category counts to active menu type
const _activeMenuType = localStorage.getItem('mygenie_active_menu_type') || 'Normal';
const _activeProds = prodResult.products.filter(p => p.foodFor === _activeMenuType);
const enrichedCategories = categoryService.calculateItemCounts(
  catResult,
  _activeProds
);
```

---

## 5. Owner Decisions — ALL LOCKED (no new decisions needed)

| OD | Decision | Impact on this IA |
|---|---|---|
| OD-376-01 | No mixing per order | No locking logic needed — Design A means one menu type at a time station-wide. No per-order lock needed. |
| OD-376-02 | Design A — pure local setting | Confirmed as architecture above |
| OD-376-03 | Moot under Design A | Confirmed: no reset category logic needed |
| OD-376-04 | Dynamic labels from DB | Confirmed: `availableMenuTypes` are derived directly from `products[].foodFor` values (whatever backend returns) |
| OD-376-05 | StatusConfigPage only | Confirmed: E5 above |
| OD-376-06 | No fallback — empty-state message | Confirmed: E4c above |

---

## 6. Conflict Pre-Check

| File | Recent modifier | Conflict? |
|---|---|---|
| `productTransform.js` L47 | None in pos_7_0 — BUG-391/392/394 touched other transforms | ✅ ZERO |
| `MenuContext.jsx` | BUG-116 (2026-06-08) — ancient | ✅ ZERO |
| `OrderEntry.jsx` | BUG-374/372 (2026-09-01) — cart key logic, not item-grid area | ✅ PARALLEL-SAFE (different sections) |
| `StatusConfigPage.jsx` | CR-051/052 (2026-06-18) — no pos_7_0 items touch it | ✅ ZERO |
| `LoadingPage.jsx` | CR-037/038 (2026-06-13) — old, no pos_7_0 items | ✅ ZERO |
| `useRefreshAllData.js` | CR-037 (2026-06-13) — old | ✅ ZERO |
| `activeMenuPrefs.js` (NEW) | N/A | ✅ NEW FILE — no conflict |

**QA queue check:** Current pos_7_0 QA pending items (BUG-390, CR-373, BUG-392, CR-374, BUG-391, BUG-395, BUG-394, CR-377, CR-378) — none touch productTransform.js L47, MenuContext, StatusConfigPage, or LoadingPage.

---

## 7. Downstream Consumer Verification

| If CR-376 ships, verify these still work |
|---|
| Normal-only restaurant: category panel item counts unchanged (E6 filter to 'Normal' = same as before) |
| Aggregator orders: still work — productTransform now explicitly excludes 'Aggregator' (was implicit before) |
| Popular tab in OrderEntry: uses `popularProducts` — unaffected (separate array, Normal items only, unchanged) |
| AddCustomItemModal: uses full `products` — unaffected (intentional, see E4e) |
| Menu Management (BulkEditor, ProductForm): use different transforms (menuManagementTransform) — unaffected |
| Socket `food_update` / `delete-food`: updates `products` in MenuContext → `activeProducts` memo recomputes automatically ✅ |
| useRefreshAllData: E7 fixes category counts on manual refresh |

---

## 8. Verification Matrix (seeds QA handover)

| # | Edit | File | How to Verify | Mode |
|---|---|---|---|---|
| V1 | E1 filter change | `productTransform.js` | Preprod login as cafe103 (Normal only) → product count in console unchanged. Login as multi-menu restaurant → products[] contains Party/Premium items. | Manual browser |
| V2 | E2+E5 localStorage | `StatusConfigPage.jsx` | Settings → Active Menu section visible only for multi-menu restaurants. Select Party → Save → `localStorage.getItem('mygenie_active_menu_type')` → `'Party'` | Manual browser |
| V3 | E3+E4 item grid | `OrderEntry.jsx` | After V2: open any order → item grid shows only Party items → passive "Party Menu" chip visible in header | Manual browser |
| V4 | E4c empty-state | `OrderEntry.jsx` | Set Active Menu to a type with 0 configured items → open order → empty-state message visible instead of item grid | Manual browser |
| V5 | E6+E7 counts | `LoadingPage.jsx` / `useRefreshAllData.js` | After switching to Party: left-panel category item counts reflect Party items only (not sum of all) | Manual browser |
| V6 | Normal-only regression | All files | cafe103 (Normal only): StatusConfigPage shows no Active Menu section. Order entry unchanged. | Manual browser |
| V7 | Aggregator exclusion | `productTransform.js` | If restaurant has Aggregator items: they do NOT appear in any POS menu regardless of active type | Manual browser |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-376 → status: IMPLEMENTED, sprint_key: pos_7_0
- [ ] CR_REGISTRY.md: CR-376 row → Gate 5a IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add E1-E7 entries
- [ ] Code markers: // CR-376 comment in every modified file
- [ ] webpack: compiles with 0 new warnings after changes
```

---

## 10. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Normal-only restaurants see behavior change | LOW — V6 guards it (section hidden if availableMenuTypes.length ≤ 1) | V6 regression test |
| Aggregator items appear in POS | LOW — explicit `!== 'Aggregator'` exclusion | V7 regression test |
| Category counts wrong after boot | LOW — E6 fix scopes counts to activeMenuType | V5 verification |
| OrderEntry hotspot regression | MEDIUM — 2493-line file. Changes isolated to L56 (destructure) + L553/L555 (filter) + header area (chip) | V6 full regression |
| StatusConfigPage hotspot regression | MEDIUM — follows exact QSR pattern. Changes are additive. | V6 smoke |

---

**Planning complete: CR-376**
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: MEDIUM
Files WILL change: `productTransform.js`, `activeMenuPrefs.js` (NEW), `MenuContext.jsx`, `OrderEntry.jsx`, `StatusConfigPage.jsx`, `LoadingPage.jsx`, `useRefreshAllData.js`
Files WILL NOT touch: `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `CategoryPanel.jsx`, any service/API files, `AppProviders.jsx`, report files
Owner decisions: NONE — all 6 ODs locked
Docs: `impact/CR-376_IMPACT_ANALYSIS.md`
Next: Gate 3 Implementation Plan (owner GO needed)
