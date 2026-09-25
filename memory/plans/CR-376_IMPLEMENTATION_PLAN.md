# Implementation Plan — CR-376
## POS Order Entry: Menu Switch (Normal / Party / Premium)

**Date:** 2026-09-11
**Revalidated:** 2026-09-25 (PLANNING — Gate 3 re-validation at HEAD; owner: "update docs and decision, don't jump gate")
**Agent Role:** PLANNING (Gate 3 — Implementation Plan)
**Sprint:** `sep_bug_closure` (moved from `pos_7_0` per owner 2026-09-25)
**Impact Analysis:** `impact/CR-376_IMPACT_ANALYSIS.md` (+ §11 Revalidation Addendum 2026-09-25)
**Risk:** MEDIUM
**Hotspot files touched:** `OrderEntry.jsx` · `StatusConfigPage.jsx` · `LoadingPage.jsx`
**Gate status:** GATE 3 REVALIDATED + R11 PROBE + MOCKUP (2026-09-25) — **Gate 4 NOT given.** No code written.
**Owner review script:** `handover/SESSION_HANDOVER_2026_09_25_CR376_GATE3_FINAL_OWNER_REVIEW.md` · mockup `frontend/public/cr376-menu-switch-mockup.html#findings`
**Conditional scope:** if OD-376-09 = (a) → E6/E7 removed (5 files, 2 hotspots). If OD-376-10 = (b) → re-plan (CategoryPanel.jsx). If OD-376-08 = (b) → E5h JSX becomes card-row. If OD-376-07 ≠ (a) → E4e removed.

---

## Revalidation Log — 2026-09-25

**Code Reality re-check:** `grep -rn "CR-376\|activeMenuType\|mygenie_active_menu_type\|activeMenuPrefs" src/` → **0 hits. Code Reality: NONE** (unchanged).

| Edit | Anchor (plan 2026-09-11) | Anchor at HEAD 2026-09-25 | Content drift? | Action |
|---|---|---|---|---|
| E1 | `productTransform.js:47` `.filter(p => p.foodFor === 'Normal')` | L47 — identical | NONE | — |
| E2 | new `utils/activeMenuPrefs.js` | still absent; `utils/qsrModePrefs.js` pattern still present | NONE | — |
| E3 | `MenuContext.jsx` L1 import · `getActiveProducts` ~L97 · value object ~L100-128 | L1 · L94-96 · L99-138 | NONE | — |
| E4a | `OrderEntry.jsx:56` useMenu destructure | **L57** | line shift only | plan updated |
| E4b | `OrderEntry.jsx:550-555` item grid branches | **L557-562** (`getFilteredItems` starts L553) | line shift only | plan updated |
| E4c | `OrderEntry.jsx:~1692` order-number chip → `{/* Action Icons */}` | **L1712-1722** | line shift only | plan updated |
| E4d | grid render `getFilteredItems().map` | **L1789** inside `<div className="flex flex-wrap gap-3">` (L1788) under `{/* Menu Items - Pill Layout */}` (L1786) | line located | plan updated with exact anchor |
| E4 (intentional no-touch) | AddCustomItemModal `products={products}` ~L2799 | **L2828** | line shift only | plan updated |
| **E4e (NEW)** | — | `OrderEntry.jsx:2844` `menuItems={products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct)}` → `CustomerModal` (CR-002 Favourites / Smart Suggestions add-to-cart path) | **PLAN GAP** — not covered by 2026-09-11 IA/plan | **OD-376-07 raised — awaiting owner** |
| E5a-h | `StatusConfigPage.jsx` L64-68 · L143 · L210 · L331-334 · L554 · L420 · `setHasChanges` · CR-051 JSX ~L993 | L64-68 · L143 · L210 · L331-334 · L554 · L420 · `setHasChanges` confirmed (L167) · **L997** | NONE (L997 shift only) | plan updated |
| E6 | `LoadingPage.jsx:589` calculateItemCounts | L589 — identical (BUG-451 touched L6 + L422 only) | NONE | — |
| E7 | `useRefreshAllData.js:33-37` | **L34-37** (BUG-451 added import at L14 + limit at L30) | line shift only | plan updated |

**Conflict pre-check refresh (vs IA §6):**

| File | New modifier since 2026-09-11 | Verdict |
|---|---|---|
| `LoadingPage.jsx` | BUG-451 (Wave 1, 2026-09-24) — `PAGINATION.DEFAULT_LIMIT` on `getProducts` (L6, L422) | PARALLEL-SAFE — E6 anchor L589 untouched |
| `useRefreshAllData.js` | BUG-451 (2026-09-24) — import L14 + limit L30 | PARALLEL-SAFE — E7 anchor L34-37 untouched |
| `OrderEntry.jsx` | BUG-398/399/452 (QA PASS, awaiting Gate 6) — room/move-items + toast areas | PARALLEL-SAFE — none touch L57, L553-562, L1712-1722, L1789, L2844 |
| `StatusConfigPage.jsx` | none since CR-350 | ZERO |
| `productTransform.js` · `MenuContext.jsx` | none | ZERO |

**Open items still awaiting Gate 6 that share `OrderEntry.jsx`:** CR-104, BUG-281, BUG-305, BUG-335, BUG-398, BUG-399, BUG-452. CR-376 must NOT be implemented until owner confirms sequencing (implement after their Gate 6, or parallel-safe as declared above).

**Fast Lane eligible:** NO (7 files, 3 hotspots).

---

## Pre-Entry Verification (implementation agent MUST run before first edit)

```bash
# Confirm all anchor lines still match before touching anything
grep -n "foodFor === 'Normal'" src/api/transforms/productTransform.js
# Expected: 47:      .filter(p => p.foodFor === 'Normal')

grep -n "const { categories, products, popularProducts } = useMenu" src/components/order-entry/OrderEntry.jsx
# Expected (revalidated 2026-09-25): 57:  const { categories, products, popularProducts } = useMenu();

grep -n "products.filter\|products={products}\|menuItems={products" src/components/order-entry/OrderEntry.jsx
# Expected (2026-09-25): 558 (all-branch) · 560 (category branch, `items = products`) · 2828 (AddCustomItemModal) · 2844 (CustomerModal menuItems)

grep -n "Action Icons: Plus\|Menu Items - Pill Layout\|getFilteredItems().map" src/components/order-entry/OrderEntry.jsx
# Expected (2026-09-25): 1722 · 1786 · 1789

grep -n "QSR_MODE_KEY" src/pages/StatusConfigPage.jsx | head -2
# Expected: 64:const QSR_MODE_KEY = 'mygenie_qsr_mode_enabled';

grep -n "calculateItemCounts" src/pages/LoadingPage.jsx
# Expected: 589:      data.categories = categoryService.calculateItemCounts(data.categories, data.products);

grep -n "calculateItemCounts" src/hooks/useRefreshAllData.js
# Expected (revalidated 2026-09-25): 34:    const enrichedCategories = categoryService.calculateItemCounts(

grep -n "CUSTOMER FIELD REQUIREMENTS" src/pages/StatusConfigPage.jsx
# Expected (2026-09-25): 997
```

If ANY anchor has drifted → **STOP. Return to Planning.** Do not improvise.

---

## Scope Lock

**Files WILL change:**
1. `src/api/transforms/productTransform.js`
2. `src/utils/activeMenuPrefs.js` ← **NEW FILE**
3. `src/contexts/MenuContext.jsx`
4. `src/components/order-entry/OrderEntry.jsx`
5. `src/pages/StatusConfigPage.jsx`
6. `src/pages/LoadingPage.jsx`
7. `src/hooks/useRefreshAllData.js`

**Files will NOT touch:**
`CartPanel.jsx` · `CollectPaymentPanel.jsx` · `CategoryPanel.jsx` · `orderTransform.js` · `AppProviders.jsx` · `App.js` · all service files · all report files · any other file not listed above.

Scope expansion → STOP, re-declare, get owner approval.

---

## Execution Sequence

Run edits in this order. Compile-check after E3. Compile-check after E5. Final compile after E7.

```
E1 → E2 → E3 → [compile check] → E4 → E5 → E6 → E7 → [final compile check]
```

---

## Edit-by-Edit Plan

---

### E1 — `src/api/transforms/productTransform.js`
**Line:** 47
**Risk:** LOW — 1 line, no hotspot

**Current (L47):**
```js
      .filter(p => p.foodFor === 'Normal')
```

**Replace with:**
```js
      .filter(p => p.foodFor !== 'Aggregator') // CR-376: Phase 3 — expose all non-Aggregator menus
```

**Also update comment on L40:**

**Current (L40):**
```
   * Transform products array — filters to Normal food_for only
```

**Replace with:**
```
   * Transform products array — filters out Aggregator menu only (CR-376: Phase 3 multi-menu)
```

**Verification:** After save, grep confirms `=== 'Normal'` is gone.

---

### E2 — NEW `src/utils/activeMenuPrefs.js`
**Risk:** LOW — new file, follows `qsrModePrefs.js` pattern exactly

**Create file with this exact content:**

```js
// CR-376: Active Menu Type preference — station-level local setting.
//
// Manager sets the active menu in StatusConfigPage (Local Settings).
// Order Entry reads it once on mount — no per-order switching.
// This is the Phase 3 multi-menu implementation; mirrors qsrModePrefs.js pattern.
//
// Storage scope: browser-local (per device/station).
// Default: 'Normal' — zero behaviour change for Normal-only restaurants.
//
// Write site: pages/StatusConfigPage.jsx (save + reset + hydrate)
// Read sites: contexts/MenuContext.jsx (activeProducts memo)
//             pages/LoadingPage.jsx (calculateItemCounts scoping)
//             hooks/useRefreshAllData.js (calculateItemCounts scoping)

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

**Verification:** File exists at path. `grep -n "ACTIVE_MENU_TYPE_KEY" src/utils/activeMenuPrefs.js` returns 2 hits.

---

### E3 — `src/contexts/MenuContext.jsx`
**Risk:** LOW — additive memos, no existing lines changed

**E3a — Add import** (end of import line L1):

**Current (L1):**
```js
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
```
*(No change needed — `useMemo` already imported.)*

**Add new import after L1** (insert at L2, before the blank line):
```js
import { getActiveMenuType, ACTIVE_MENU_TYPE_DEFAULT } from '../utils/activeMenuPrefs'; // CR-376
```

**E3b — Add three computed memos** after the existing `getActiveProducts` useCallback (which ends around L97). Insert AFTER the `getActiveProducts` block, BEFORE the `// Context value` comment:

```js
  // CR-376: Active menu type — read once from localStorage on context init.
  // Changes to localStorage (from StatusConfigPage save) take effect on next mount.
  const activeMenuType = useMemo(() => getActiveMenuType(), []);

  // CR-376: Products filtered to the active menu type — used by OrderEntry item grid.
  // Note: distinct from getActiveProducts() (which filters by isActive/isOutOfStock).
  const activeMenuProducts = useMemo(
    () => products.filter(p => p.foodFor === activeMenuType),
    [products, activeMenuType]
  );

  // CR-376: Distinct non-Aggregator menu types that have ≥1 active, non-disabled item.
  // Used by StatusConfigPage to render the Active Menu selector.
  const availableMenuTypes = useMemo(
    () => [...new Set(
      products
        .filter(p => p.isActive && !p.isDisabled && p.foodFor !== 'Aggregator')
        .map(p => p.foodFor)
    )],
    [products]
  );
```

**E3c — Add to context value object.**

**Current value object (around L100-L128):**
```js
  const value = useMemo(() => ({
    // State
    categories,
    products,
    popularProducts, // BUG-340
    isLoaded,
    
    // Actions
    setCategories,
    setProducts,
    setPopularProducts, // BUG-340
    addOrUpdateProduct,
    removeProduct,
    clearMenu,
    
    // Helpers
    getCategoryById,
    getProductById,
    getProductsByCategory,
    searchProducts,
    filterByFoodType,
    getActiveProducts,
  }), [
```

**Replace the `// State` block opening** to add CR-376 exports:

After `products,` in the value object, add:
```js
    activeMenuProducts, // CR-376
    availableMenuTypes, // CR-376
    activeMenuType,     // CR-376
```

Also add the same three to the **dependency array** of the `useMemo` (after `products,`):
```js
    activeMenuProducts, // CR-376
    availableMenuTypes, // CR-376
    activeMenuType,     // CR-376
```

**Verification after E3:**
```bash
grep -n "activeMenuProducts\|availableMenuTypes\|activeMenuType" src/contexts/MenuContext.jsx
# Expected: 5+ hits across import, memos, value object, deps array
yarn start → webpack compiled with 0 new errors
```

---

### E4 — `src/components/order-entry/OrderEntry.jsx` ← HOTSPOT
**Risk:** MEDIUM — 2966-line hotspot file (was 2493 at plan date). Changes isolated to 4 sites: L57, L557-562, L1712-1722 / L1789, and (pending OD-376-07) L2844.

**E4a — Destructure activeMenuProducts from useMenu (L57 — was L56)**

**Current (L57):**
```js
  const { categories, products, popularProducts } = useMenu(); // BUG-340: +popularProducts from boot
```

**Replace with:**
```js
  const { categories, products, popularProducts, activeMenuProducts, activeMenuType } = useMenu(); // BUG-340: +popularProducts from boot // CR-376: +activeMenuProducts, +activeMenuType
```

---

**E4b — Replace products with activeMenuProducts in item grid (L558, L560 — was L551, L553-555)**

**Current (L557-562):**
```js
    } else if (activeCategory === "all") {
      items = products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
    } else {
      items = products
        .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
        .map(adaptProduct);
    }
```

**Replace with:**
```js
    } else if (activeCategory === "all") {
      items = activeMenuProducts.filter(p => p.isActive && !p.isDisabled).map(adaptProduct); // CR-376
    } else {
      items = activeMenuProducts // CR-376
        .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
        .map(adaptProduct);
    }
```

**⚠ Do NOT change the `popularProducts` branch (L555-556) — it is unaffected.**
**⚠ Do NOT change `products={products}` at L2828 (AddCustomItemModal — was L2799) — intentional, category/GST lookup only, never adds a catalogue product to cart.**
**⚠ L2844 `menuItems={products...}` (CustomerModal) is governed by E4e / OD-376-07 below.**

---

**E4c — OD-376-06 passive chip (L1712-1722 area — was L1692-1693)**

Find this exact block (L1712-1722):
```jsx
            {effectiveTable?.orderNumber && (
              <span
                data-testid={`order-entry-order-id-chip-${effectiveTable?.orderId || placedOrderId}`}
                className="text-sm flex-shrink-0"
                style={{ color: COLORS.grayText }}
              >
                #{effectiveTable.orderNumber}
              </span>
            )}

            {/* Action Icons: Plus, Customer, Notes, Shift, Merge */}
```

**Insert BETWEEN the order-number chip closing `)}` and the `{/* Action Icons */}` comment:**
```jsx
            {/* CR-376: Active menu chip — visible only when non-Normal menu is active */}
            {activeMenuType && activeMenuType !== 'Normal' && (
              <span
                data-testid="active-menu-type-chip"
                className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
              >
                {activeMenuType} Menu
              </span>
            )}
```

**E4d — Empty-state guard in item grid render area (exact anchor located 2026-09-25: L1786-1789)**

**Current (L1786-1789):**
```jsx
          {/* Menu Items - Pill Layout */}
          <div className="flex-1 overflow-y-auto p-4" style={{ opacity: isPlacingOrder ? 0.5 : 1, pointerEvents: isPlacingOrder ? 'none' : 'auto' }}>
            <div className="flex flex-wrap gap-3">
              {getFilteredItems().map(item => {
```

**Replace with** (wrap ONLY the inner `<div className="flex flex-wrap gap-3">…</div>` — the outer scroll container at L1787 stays as-is so `isPlacingOrder` dimming still applies):
```jsx
          {/* Menu Items - Pill Layout */}
          <div className="flex-1 overflow-y-auto p-4" style={{ opacity: isPlacingOrder ? 0.5 : 1, pointerEvents: isPlacingOrder ? 'none' : 'auto' }}>
            {/* CR-376: OD-376-06 — empty-state when active menu has no configured items */}
            {activeMenuType !== 'Normal' && activeMenuProducts.filter(p => p.isActive && !p.isDisabled).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12" data-testid="active-menu-empty-state">
                <p className="text-sm font-semibold mb-1" style={{ color: COLORS.primaryOrange }}>
                  {activeMenuType} menu has no items configured.
                </p>
                <p className="text-xs" style={{ color: COLORS.grayText }}>
                  Please update in Local Settings.
                </p>
              </div>
            ) : (
            <div className="flex flex-wrap gap-3">
              {getFilteredItems().map(item => {
```
…and add the matching `)}` immediately after the closing `</div>` of the `flex flex-wrap gap-3` container (implementation agent: locate the `</div>` that closes L1788 — it is the first `</div>` at 12-space indent after the `.map(...)` block's `})}`).

**Note to implementation agent:** the outer container (L1787) must stay unwrapped. Only the pill grid is swapped for the empty-state.

---

**E4e — CustomerModal Smart Suggestions `menuItems` (L2844) — GOVERNED BY OD-376-07 (OPEN)**

**Current (L2844):**
```jsx
          menuItems={products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct)}
```

Path: `CustomerModal` (CR-002) → Favourites / Smart Suggestions rows → `handleIntelItemClick` (CustomerModal L228-237) → `menuItems.find(...)` → `onAddToCart(food)`. After E1, `products` contains ALL non-Aggregator menus, so this side-door could add a Normal-menu item to a Party/Premium order (contradicts OD-376-01 "no mixing").

| OD-376-07 option | Edit | Effect |
|---|---|---|
| **(a) Scope — agent recommended** | `menuItems={activeMenuProducts.filter(p => p.isActive && !p.isDisabled).map(adaptProduct)} // CR-376` | Off-menu suggestions become inert (existing L231 "item removed from menu — silently skip" guard). Row still renders (name from CRM payload). Zero change for Normal-only restaurants. 1 line, same file. Follow-up note: hiding inert rows needs `CustomerModal.jsx` (8th file) — out of CR-376 scope. |
| (b) Leave as-is | none | Documented exception to OD-376-01. |
| (c) Park as OD-376-07 | none in this CR | Decide later; CR-376 ships without it. |

**Implementation agent: do NOT touch L2844 until OD-376-07 is locked by owner in the intake doc.**

**Verification after E4:**
```bash
grep -n "activeMenuProducts\|activeMenuType" src/components/order-entry/OrderEntry.jsx
# Expected: 6+ hits (destructure, 2 grid branches, chip, empty-state ×2; +1 if OD-376-07 = a)
grep -n "products.filter\|products={products}\|menuItems={" src/components/order-entry/OrderEntry.jsx
# Expected: L558/L560 area now activeMenuProducts (not products)
# L2828 still products={products} (unchanged — AddCustomItemModal)
# L2844 menuItems= → activeMenuProducts if OD-376-07 = a, else unchanged
```

---

### E5 — `src/pages/StatusConfigPage.jsx` ← HOTSPOT
**Risk:** MEDIUM — hotspot, but all changes are additive (new constant, new state, new save/reset/hydrate, new UI section)

**E5a — Add constant after existing QSR constants block (after L67)**

**Current (L64-68):**
```js
const QSR_MODE_KEY = 'mygenie_qsr_mode_enabled';
const QSR_MODE_FACTORY = false;
const QSR_DISCOUNT_KEY = 'mygenie_qsr_discount_enabled';
const QSR_DISCOUNT_FACTORY = false;
// BUG-273: AUTO_SETTLE_KEY + AUTO_SETTLE_FACTORY + autoSettleEnabled state + localStorage read/write + toggle UI removed
```

**Insert AFTER L68** (after the BUG-273 comment):
```js
// CR-376: Active Menu Type — station-level menu switch. Default 'Normal' = no change for existing restaurants.
const ACTIVE_MENU_TYPE_KEY = 'mygenie_active_menu_type';
const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';
```

---

**E5b — Add import for activeMenuPrefs utility**

Find the imports block at the top of the file. Add after existing utils imports:
```js
import { setActiveMenuType } from '../utils/activeMenuPrefs'; // CR-376
```

---

**E5c — Extend useMenu destructure (L143)**

**Current (L143):**
```js
  const { categories } = useMenu();
```

**Replace with:**
```js
  const { categories, availableMenuTypes } = useMenu(); // CR-376: +availableMenuTypes for Active Menu selector
```

---

**E5d — Add state after CR-350 state (after L210)**

**Current (L209-210):**
```js
  // CR-350: Room check-in ID upload mandatory toggle
  const [roomIdUploadReq, setRoomIdUploadReq] = useState(false);
```

**Insert AFTER L210:**
```js
  // CR-376: Active Menu Type — station-level menu switch
  const [activeMenuTypeSetting, setActiveMenuTypeSetting] = useState(ACTIVE_MENU_TYPE_DEFAULT);
```

---

**E5e — Hydrate in boot useEffect, after QSR hydration block (after L332)**

The QSR hydration block ends at L332 (after the `catch` closing brace). Find:
```js
    } catch (e) {
      console.error('Failed to read QSR mode flags:', e);
    }

    // CR-010: hydrate Weight Entry Prompt toggle
```

**Insert BETWEEN the QSR catch block and the CR-010 comment:**
```js
    // CR-376: hydrate Active Menu Type
    try {
      const storedMenuType = localStorage.getItem(ACTIVE_MENU_TYPE_KEY);
      if (storedMenuType) setActiveMenuTypeSetting(storedMenuType);
    } catch (e) {
      console.error('Failed to read active menu type:', e);
    }
```

---

**E5f — Save in saveConfiguration, after CR-350 save line (after L554)**

**Current (L553-555):**
```js
    // CR-350: persist room ID upload requirement
    localStorage.setItem('mygenie_room_id_upload_required', roomIdUploadReq ? 'true' : 'false');
```

**Insert AFTER L554** (after the room ID line):
```js
    // CR-376: persist Active Menu Type
    setActiveMenuType(activeMenuTypeSetting);
```

---

**E5g — Reset in handleReset, after CR-350 reset (find `setRoomIdUploadReq(false)`)**

Find:
```js
    setRoomIdUploadReq(false);
```

**Insert AFTER that line:**
```js
    setActiveMenuTypeSetting(ACTIVE_MENU_TYPE_DEFAULT); // CR-376
```

---

**E5h — Active Menu UI section in JSX**

Find this exact closing sequence (L995-997 at HEAD 2026-09-25 — was ~L993-998):
```jsx
              </div>
            </div>

            {/* ============== CR-051: CUSTOMER FIELD REQUIREMENTS ============== */}
```

**Insert BETWEEN the `</div></div>` (end of CR-010 section) and the CR-051 comment:**

```jsx
            {/* ============== CR-376: ACTIVE MENU ============== */}
            {availableMenuTypes.length > 1 && (
              <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
                <h3 className="text-sm font-semibold mb-1" style={{ color: COLORS.darkText }}>
                  Active Menu
                </h3>
                <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>
                  Select which menu is active for order taking on this station.
                  Only menus with configured items are shown. Per-device setting.
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableMenuTypes.map(type => (
                    <button
                      key={type}
                      data-testid={`active-menu-option-${type.toLowerCase()}`}
                      onClick={() => { setActiveMenuTypeSetting(type); setHasChanges(true); }}
                      className="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors"
                      style={{
                        backgroundColor: activeMenuTypeSetting === type ? `${COLORS.primaryGreen}10` : COLORS.lightBg,
                        borderColor: activeMenuTypeSetting === type ? COLORS.primaryGreen : COLORS.borderGray,
                        color: activeMenuTypeSetting === type ? COLORS.primaryGreen : COLORS.grayText,
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
```

**Verification after E5:**
```bash
grep -n "activeMenuTypeSetting\|ACTIVE_MENU_TYPE\|availableMenuTypes" src/pages/StatusConfigPage.jsx
# Expected: 8+ hits across constant, state, hydrate, save, reset, JSX
grep -n "setHasChanges" src/pages/StatusConfigPage.jsx | head -3
# Confirm setHasChanges is the correct setter name in this file
```

---

### E6 — `src/pages/LoadingPage.jsx` ← HOTSPOT
**Risk:** LOW change on a HOTSPOT — 3 additive lines around L589. Does NOT change the `setProducts` call.

**Current (L588-594):**
```js
    if (data.categories && data.products) {
      data.categories = categoryService.calculateItemCounts(data.categories, data.products);
    }
```

**Replace with:**
```js
    if (data.categories && data.products) {
      // CR-376: scope category counts to active menu type (direct localStorage read — context not mounted yet)
      const _cr376MenuType = localStorage.getItem('mygenie_active_menu_type') || 'Normal';
      const _cr376ActiveProds = data.products.filter(p => p.foodFor === _cr376MenuType);
      data.categories = categoryService.calculateItemCounts(data.categories, _cr376ActiveProds);
    }
```

**⚠ Do NOT touch L594 `setProducts(data.products)` — the full products array goes to MenuContext unchanged. MenuContext's `activeMenuProducts` memo does the runtime filtering.**

**Verification:**
```bash
grep -n "_cr376\|calculateItemCounts" src/pages/LoadingPage.jsx
# Expected: 3 hits for _cr376, 1 for calculateItemCounts
```

---

### E7 — `src/hooks/useRefreshAllData.js`
**Risk:** LOW — non-hotspot, small change. BUG-451 (2026-09-24) added `PAGINATION` import (L14) + `limit` (L30) — anchor shifted by 1 line, content unchanged.

**Current (L34-37 — was L33-37):**
```js
    const enrichedCategories = categoryService.calculateItemCounts(
      catResult,
      prodResult.products
    );
```

**Replace with:**
```js
    // CR-376: scope category counts to active menu type on refresh
    const _cr376MenuType = localStorage.getItem('mygenie_active_menu_type') || 'Normal';
    const enrichedCategories = categoryService.calculateItemCounts(
      catResult,
      prodResult.products.filter(p => p.foodFor === _cr376MenuType)
    );
```

**Verification:**
```bash
grep -n "_cr376\|calculateItemCounts" src/hooks/useRefreshAllData.js
# Expected: 2 hits
```

---

## Checkpoints

After each file group, record before moving on:

```
☐ E1 — productTransform.js — filter line changed
☐ E2 — activeMenuPrefs.js — new file created
☐ E3 — MenuContext.jsx — 3 memos + 3 exports added, compile clean
☐ E4 — OrderEntry.jsx — destructure + item grid + chip + empty-state
☐ E5 — StatusConfigPage.jsx — constant + import + state + useMenu + hydrate + save + reset + UI section
☐ E6 — LoadingPage.jsx — calculateItemCounts scoped
☐ E7 — useRefreshAllData.js — calculateItemCounts scoped
☐ FINAL — webpack compiled with 0 new errors/warnings
```

---

## Verification Matrix

| # | Edit | File | What to verify | How |
|---|---|---|---|---|
| V1 | E1 | `productTransform.js` | `.filter(p => p.foodFor === 'Normal')` gone → `!== 'Aggregator'` present | grep |
| V2 | E2 | `activeMenuPrefs.js` | File exists, exports `getActiveMenuType`, `setActiveMenuType`, `ACTIVE_MENU_TYPE_KEY` | grep |
| V3 | E3 | `MenuContext.jsx` | `activeMenuProducts`, `availableMenuTypes`, `activeMenuType` all in value object and deps | grep |
| V4 | E4a | `OrderEntry.jsx` | L56 destructures `activeMenuProducts` and `activeMenuType` | grep |
| V5 | E4b | `OrderEntry.jsx` | Item grid "all" + category branches use `activeMenuProducts` (not `products`) | grep |
| V6 | E4b | `OrderEntry.jsx` | AddCustomItemModal at ~L2799 still uses `products={products}` (intentional — unchanged) | grep |
| V7 | E4c | `OrderEntry.jsx` | `data-testid="active-menu-type-chip"` present in JSX | grep |
| V8 | E5 | `StatusConfigPage.jsx` | `ACTIVE_MENU_TYPE_KEY` constant defined, state `activeMenuTypeSetting` exists, `setActiveMenuType()` called in save | grep |
| V9 | E5h | `StatusConfigPage.jsx` | `availableMenuTypes.length > 1 &&` gates the UI section | grep |
| V10 | E6 | `LoadingPage.jsx` | `_cr376ActiveProds` used in `calculateItemCounts` call | grep |
| V11 | E7 | `useRefreshAllData.js` | `prodResult.products.filter(p => p.foodFor === _cr376MenuType)` in calculateItemCounts call | grep |
| V12 | ALL | webpack | `yarn start` → `webpack compiled successfully` with 0 new warnings | build output |
| V13 | E4d | `OrderEntry.jsx` | `data-testid="active-menu-empty-state"` present; outer scroll container L1787 unwrapped | grep + browser (set `mygenie_active_menu_type` to a menu with 0 items) |
| V14 | E4e | `OrderEntry.jsx` | L2844 `menuItems=` uses `activeMenuProducts` **iff OD-376-07 = (a)**; otherwise unchanged | grep |
| V15 | E1+E4b | browser | Normal-only restaurant (default): item grid, category counts, popular tab identical to pre-CR behaviour | browser regression |
| V16 | E5h | browser | Normal-only restaurant: Active Menu section NOT rendered in Local Settings | browser |

---

## Post-Code Registry Checklist

Implementation agent MUST execute ALL before writing handover:

```
☐ 1. registry.json: CR-376 → status: "IMPLEMENTED", sprint_key: "sep_bug_closure" (moved from pos_7_0 — owner 2026-09-25)
     python3 -c "import json; d=json.load(open('/app/memory/control/registry.json')); 
     item=[i for i in d['items'] if i['id']=='CR-376'][0];
     print(item['status'], item.get('sprint_key'))"
     # Expected: IMPLEMENTED sep_bug_closure

☐ 2. CR_REGISTRY.md: CR-376 row updated to Gate 5a — IMPLEMENTED

☐ 3. FILE_OWNERSHIP.md: Add entries for all 7 files with CR-376 + date

☐ 4. Code markers: // CR-376 comment in every modified/created file
     grep -rn "CR-376" src/ --include="*.js" --include="*.jsx"
     # Expected: ≥1 hit in each of the 7 files

☐ 5. Compile: webpack compiled with 0 new warnings
     tail -3 /var/log/supervisor/frontend.out.log | grep -i "compiled"
```

---

## Risk Register

| Risk | Likelihood | Mitigation in this plan |
|---|---|---|
| `products` still used somewhere in item display | LOW | V5 grep check confirms only E4b sites use it for display |
| `activeMenuProducts` empty for Normal restaurants | NONE — default is 'Normal', all Normal products pass through | V12 regression test |
| `availableMenuTypes` empty → UI section hidden correctly | LOW | `availableMenuTypes.length > 1` gate in E5h |
| StatusConfigPage `setHasChanges` name mismatch | LOW | E5h uses `setHasChanges(true)` — confirm with grep before coding |
| LoadingPage boot order (localStorage not yet set on first boot) | NONE — defaults to 'Normal', same as current behaviour | `|| 'Normal'` fallback in E6 |
| OrderEntry `activeMenuType` falsy edge case | NONE — `activeMenuType` memo defaults to `'Normal'` via `ACTIVE_MENU_TYPE_DEFAULT` | E3b + E4c guard |
| **CustomerModal Favourites/Smart Suggestions add off-menu item (CR-002 path, L2844)** | **HIGH if OD-376-07 ≠ (a)** — CRM history is mostly Normal-menu, so on a Party/Premium station almost every suggestion would be off-menu | E4e (pending OD-376-07) |
| Empty-state wrap breaks `isPlacingOrder` dimming | LOW | E4d keeps outer L1787 container unwrapped; V13 |
| OrderEntry.jsx shared with 7 items awaiting Gate 6 (CR-104, BUG-281/305/335/398/399/452) | LOW — disjoint line ranges | Conflict pre-check refresh above; owner to confirm sequencing at Gate 4 |
| E6/E7 scope `itemCount` that no UI renders (probe 2026-09-25) | CERTAIN | OD-376-09 — recommend dropping E6/E7 (→ 5 files, 2 hotspots) |
| Empty Normal-only categories listed on Premium station (18) — pre-existing pattern (25 Premium-only shown today) | CERTAIN | OD-376-10 — accept + follow-up CR, or expand scope to CategoryPanel.jsx |
| Selector style mismatch with toggle-card neighbours | LOW | OD-376-08 |
| N menus (e.g. 4) → N pills in Local Settings; Order Entry still shows ONE chip, no tabs (Design A) | BY DESIGN | E3b `Set` derivation is N-ary; owner confirmed understanding 2026-09-25 |
| Pill order random (Set = first-seen order in products array) | MEDIUM | **Plan note for E3b:** append `.sort((a,b) => a === 'Normal' ? -1 : b === 'Normal' ? 1 : a.localeCompare(b))` — Normal first, rest alphabetical; same file, no scope change |
| Saved menu later has 0 items → pill disappears but localStorage keeps it → OD-376-06 empty-state | LOW | Expected; Gate 6 smoke step |
| `activeMenuType` read once on context mount — StatusConfigPage save does not live-update an already-open Order Entry | BY DESIGN (Design A: "takes effect on next mount") | Document in QA handover as expected behaviour; owner smoke step |

---

**Planning complete: CR-376** (revalidated 2026-09-25)
Stage: Implementation Plan (Gate 3) — re-validation at HEAD
Code reality: NONE (re-confirmed 2026-09-25)
Risk: MEDIUM
Files WILL change: `productTransform.js`, `activeMenuPrefs.js` (NEW), `MenuContext.jsx`, `OrderEntry.jsx`, `StatusConfigPage.jsx`, `LoadingPage.jsx`, `useRefreshAllData.js` (7 — unchanged)
Files WILL NOT touch: `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `CategoryPanel.jsx`, `CustomerModal.jsx`, `AddCustomItemModal.jsx`, `orderTransform.js`, `AppProviders.jsx`, all service/report files
Verification matrix: 16 checks (11 grep, 1 build, 4 browser)
Owner decisions: **OD-376-07 / 08 / 09 / 10 OPEN** (see intake OD table + `frontend/public/cr376-menu-switch-mockup.html` §4). OD-376-01…06 locked. R11 probe DONE 2026-09-25 (Normal 117 / Premium 141 / Party 0 / Aggregator 0 — no backend change).
Sprint: `sep_bug_closure`
Docs: `plans/CR-376_IMPLEMENTATION_PLAN.md` · `impact/CR-376_IMPACT_ANALYSIS.md` §11 · intake OD table
Next: **Owner locks OD-376-07 → owner verbatim "CR-376 Gate 4 GO" → IMPLEMENTATION agent.** Gate 4 has NOT been given.
