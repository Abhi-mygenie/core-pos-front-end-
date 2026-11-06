# Implementation Plan — CR-376-FU-B
## CategoryPanel: Hide Empty Categories for Active Menu + `Name (count)` + Default "All" + Popular Scoped to Active Menu

**Date:** 2026-09-26
**Agent Role:** PLANNING (ALPHA v0.7 Role 2 — Gate 3 only, owner "Gate 3 GO" 2026-09-26)
**Sprint:** `sep_bug_closure`
**Parent CR:** CR-376 (GATE_5B partial PASS with QA_HYATT — Gate 4 precondition of intake MET)
**Impact Analysis:** `impact/CR-376-FU-B_IMPACT_ANALYSIS.md` (Gate 2 GO 2026-09-25)
**Risk:** MEDIUM (OrderEntry.jsx R5 hotspot — 3 additive edits, no cart/payment/tax path)
**Fast Lane:** NOT ELIGIBLE (2 files, 1 hotspot)
**Gate status:** GATE 3 COMPLETE. Awaiting owner **"CR-376-FU-B Gate 4 GO"**.

---

## Gate 3 Re-verification of Impact Analysis (done 2026-09-26)

| Anchor | Expected (IA) | Actual at HEAD | Status |
|---|---|---|---|
| `OrderEntry.jsx` L57 | destructures `categories, products, popularProducts, activeMenuProducts, …` from `useMenu()` | identical | ✅ |
| `OrderEntry.jsx` L102 | `useState(() => showPopularCategory ? "popular" : "all")` | identical | ✅ |
| `OrderEntry.jsx` L556 | `items = popularProducts.map(adaptProduct);` | identical | ✅ |
| `OrderEntry.jsx` L1670-1676 | `<CategoryPanel activeCategory onCategoryChange onBack categories showPopularCategory />` — no product props | identical | ✅ |
| `CategoryPanel.jsx` L6 / L8-14 / L57 | props line · `allCategories` useMemo · `<span className="truncate">{category.name}</span>` | identical (file = 81 lines) | ✅ |
| Code marker `CR-376-FU-B` in `src/` | 0 hits | 0 hits — **Code Reality: NONE** | ✅ |
| `popularProducts` shape | must carry `productId` | `LoadingPage.jsx` L461 `raw.map(p => productFromAPI.product(p))` → same transform as `products` → has `productId`, `categoryId`, `isActive`, `isDisabled` | ✅ |

Conflict pre-check unchanged: CLEAR (CR-376 / BUG-462 / BUG-464 edits on other lines; FILE_OWNERSHIP shows no open item on `CategoryPanel.jsx`).

---

## Pre-Entry Verification (IMPLEMENTATION agent MUST run before first edit)

```bash
cd /app/frontend/src/components/order-entry

# E1/E2/E3 anchors — CategoryPanel.jsx
grep -n 'const CategoryPanel = ({ activeCategory, onCategoryChange, onBack, categories = \[\], showPopularCategory = false })' CategoryPanel.jsx   # expect L6
grep -n 'const real = categories.map(c => ({ id: c.categoryId, name: c.categoryName }));' CategoryPanel.jsx                                          # expect L12
grep -n '<span className="truncate">{category.name}</span>' CategoryPanel.jsx                                                                          # expect L57

# E4/E5/E6 anchors — OrderEntry.jsx
grep -n 'useState(() => showPopularCategory ? "popular" : "all")' OrderEntry.jsx     # expect L102
grep -n 'items = popularProducts.map(adaptProduct);' OrderEntry.jsx                   # expect L556
grep -n 'showPopularCategory={showPopularCategory} // CR-148' OrderEntry.jsx         # expect L1675

# Code reality
grep -rn "CR-376-FU-B" /app/frontend/src | wc -l                                      # expect 0
```

If ANY anchor has drifted → STOP. Return to Planning (`"Plan stale — <file>:<line> …"`).

---

## Scope Lock (R14)

**Files WILL change (2):**
1. `src/components/order-entry/CategoryPanel.jsx` — E1, E2, E3 (non-hotspot, display-only)
2. `src/components/order-entry/OrderEntry.jsx` — E4, E5, E6 (**R5 hotspot**, additive only)

**File WILL be created (1, test-only, not shipped in bundle):**
3. `src/components/order-entry/__tests__/CategoryPanel.cr376fub.test.jsx` — E7 (unit test seeding V1–V6)

**Files will NOT touch:**
`MenuContext.jsx` · `productTransform.js` · `categoryTransform.js` · `activeMenuPrefs.js` · `LoadingPage.jsx` · `StatusConfigPage.jsx` · `CustomerModal.jsx` · `AddCustomItemModal` · `index.js` re-exports · any API / service / localStorage / provider file.

**Not changed by design:** `getFilteredItems` `all` and `<categoryId>` branches (L558/L560 — CR-376, already correct) · `showPopularCategory` setting gate · CartPanel / payment / print paths.

---

## Locked Rules being implemented (from IA)

| # | Rule | Edit(s) |
|---|---|---|
| B1 | Hide real category when 0 active, non-disabled items in `activeMenuProducts` by `categoryId` | E2 |
| B2 | Label every visible row `Name (count)` | E2, E3 |
| B3 | "All" always visible, **always default tab**, count = total visible active-menu items | E2, E4 |
| B4 | Popular = `popularProducts ∩ visible active-menu items` (by `productId`); hidden when 0; still gated by `showPopularCategory` | E2, E5 |
| B5 | Count predicate = `p.categoryId === cat.categoryId && p.isActive && !p.isDisabled` — **identical to grid L560-561** | E2 |

**Row order (unchanged from CR-148):** Popular (if shown) → All → real categories in API order. Only the *default selection* moves to All (B3). Owner may request "All first" as a follow-up; not in this scope.

---

## Execution Sequence

```
E1 → E2 → E3   (CategoryPanel.jsx — one compile check)
E4 → E5 → E6   (OrderEntry.jsx — one compile check)
E7             (test file — run once)
→ Self-test V1–V12 → EXIT GATE → QA handover
```

E1–E3 and E4–E6 are independent groups. E6 depends on E1 (prop names). No edit depends on backend.

---

## Edit-by-Edit Plan

---

### E1 — `CategoryPanel.jsx` L5-6 — accept 2 new props

**Current:**
```jsx
// CR-148: showPopularCategory prop — when true, Popular is first + default active tab
const CategoryPanel = ({ activeCategory, onCategoryChange, onBack, categories = [], showPopularCategory = false }) => {
```

**Replace with:**
```jsx
// CR-148: showPopularCategory prop — when true, Popular is first (default tab is "All" since CR-376-FU-B)
// CR-376-FU-B: activeMenuProducts + popularProducts — menu-aware counts, hide 0-count categories, Popular scoped to active menu
const CategoryPanel = ({ activeCategory, onCategoryChange, onBack, categories = [], showPopularCategory = false, activeMenuProducts = [], popularProducts = [] }) => {
```

**Verification:** `grep -n "activeMenuProducts = \[\], popularProducts = \[\]" CategoryPanel.jsx` → 1 hit.

---

### E2 — `CategoryPanel.jsx` L7-14 — rewrite `allCategories` useMemo

**Current:**
```jsx
  // Build full category list: (Popular?) + All + real categories from API
  const allCategories = useMemo(() => {
    const specials = [];
    if (showPopularCategory) specials.push({ id: "popular", name: "Popular" }); // CR-148: Popular first
    specials.push({ id: "all", name: "All" });
    const real = categories.map(c => ({ id: c.categoryId, name: c.categoryName }));
    return [...specials, ...real];
  }, [categories, showPopularCategory]);
```

**Replace with:**
```jsx
  // CR-376-FU-B: menu-aware list — count predicate is IDENTICAL to OrderEntry getFilteredItems() grid filter,
  // so "Name (n)" always equals the tiles shown on click. 0-count real cats hidden (B1); All always shown (B3);
  // Popular = popularProducts ∩ visible active-menu items, hidden when 0 (B4).
  const allCategories = useMemo(() => {
    const visible = activeMenuProducts.filter(p => p.isActive && !p.isDisabled);
    const list = [];
    if (showPopularCategory) { // CR-148: Popular first
      const visibleIds = new Set(visible.map(p => p.productId));
      const popularCount = popularProducts.filter(p => visibleIds.has(p.productId)).length;
      if (popularCount > 0) list.push({ id: "popular", name: "Popular", count: popularCount });
    }
    list.push({ id: "all", name: "All", count: visible.length });
    categories.forEach(c => {
      const count = visible.filter(p => p.categoryId === c.categoryId).length; // B5: categoryId only
      if (count > 0) list.push({ id: c.categoryId, name: c.categoryName, count });
    });
    return list;
  }, [categories, showPopularCategory, activeMenuProducts, popularProducts]);
```

**Why `count` as a separate field (not baked into `name`):** keeps `name` semantic for the existing `truncate` span and any future a11y label; render concatenation happens once in E3.

**Verification:** V1–V6 (unit test E7) + browser V8.

---

### E3 — `CategoryPanel.jsx` L57 — render `Name (count)`

**Current:**
```jsx
            <span className="truncate">{category.name}</span>
```

**Replace with:**
```jsx
            <span className="truncate">{category.name} ({category.count})</span>{/* CR-376-FU-B: B2 item count */}
```

**Note:** `w-44` panel + `truncate` — long names will ellipsise before the bracket (owner accepted truncation, OQ-B3). `data-testid={`category-${category.id}`}` unchanged → existing QA selectors still work.

**Verification:** Browser: every row reads `Starters (12)` style. `screen.getByTestId('category-all')` text matches `/^All \(\d+\)$/` (E7).

---

### E4 — `OrderEntry.jsx` L100-102 — default tab = All

**Current:**
```jsx
  // CR-148 / BUG-340: Popular category gate — default to popular if enabled, products read from MenuContext
  const showPopularCategory = !!restaurant?.settings?.showPopularCategory;
  const [activeCategory, setActiveCategory] = useState(() => showPopularCategory ? "popular" : "all");
```

**Replace with:**
```jsx
  // CR-148 / BUG-340: Popular category gate — products read from MenuContext
  const showPopularCategory = !!restaurant?.settings?.showPopularCategory;
  const [activeCategory, setActiveCategory] = useState("all"); // CR-376-FU-B: B3 — "All" is always the default tab (was popular when setting ON)
```

**Note:** `showPopularCategory` const is still used at L1675 (prop) — do NOT remove it.

**Verification:** Browser (setting ON restaurant): open Order Entry → "All (n)" row is green/active, grid shows all active-menu items. V7.

---

### E5 — `OrderEntry.jsx` L555-556 — scope Popular branch to active menu

**Current:**
```jsx
    if (activeCategory === "popular") { // CR-148 / BUG-340: popular tab — transform matches other branches
      items = popularProducts.map(adaptProduct);
```

**Replace with:**
```jsx
    if (activeCategory === "popular") { // CR-148 / BUG-340: popular tab — transform matches other branches
      // CR-376-FU-B: B4 — Popular scoped to active menu (same visible-set predicate as CategoryPanel count)
      const visibleIds = new Set(activeMenuProducts.filter(p => p.isActive && !p.isDisabled).map(p => p.productId));
      items = popularProducts.filter(p => visibleIds.has(p.productId)).map(adaptProduct);
```

**Why not `activeMenuProducts.filter(isPopular)`:** `popularProducts` is a separate boot list (BUG-340) with its own order (popularity rank). Filtering *it* by membership preserves rank order and keeps the 1-to-1 relationship with the panel count.

**Verification:** Browser: click "Popular (n)" → exactly n tiles, all belong to active menu (no cross-menu item; add-to-cart of each stays within menu). V9. Grep: `grep -n "visibleIds.has(p.productId)" OrderEntry.jsx` → 1 hit.

---

### E6 — `OrderEntry.jsx` L1670-1676 — pass the 2 new props

**Current:**
```jsx
        <CategoryPanel
          activeCategory={activeCategory}
          onCategoryChange={(id) => setActiveCategory(id)}
          onBack={onClose}
          categories={categories}
          showPopularCategory={showPopularCategory} // CR-148
        />
```

**Replace with:**
```jsx
        <CategoryPanel
          activeCategory={activeCategory}
          onCategoryChange={(id) => setActiveCategory(id)}
          onBack={onClose}
          categories={categories}
          showPopularCategory={showPopularCategory} // CR-148
          activeMenuProducts={activeMenuProducts} // CR-376-FU-B
          popularProducts={popularProducts} // CR-376-FU-B
        />
```

**Verification:** compile clean; React DevTools / test: CategoryPanel receives arrays. V8 (row count equals number of categories with ≥1 grid tile).

---

### E7 — NEW `src/components/order-entry/__tests__/CategoryPanel.cr376fub.test.jsx` — unit test (seeds V1–V6)

Pattern: mirror `components/pms/frontdesk/__tests__/GuestTable.cr385.test.jsx` (RTL `render/screen`).

```jsx
// CR-376-FU-B — CategoryPanel: menu-aware counts, hidden 0-count categories, All always shown, Popular scoped/hidden
import { render, screen } from '@testing-library/react';
import CategoryPanel from '../CategoryPanel';

const categories = [
  { categoryId: 'c1', categoryName: 'Starters' },
  { categoryId: 'c2', categoryName: 'Premium Only' },
  { categoryId: 'c3', categoryName: 'Disabled Only' },
];
const activeMenuProducts = [
  { productId: 'p1', categoryId: 'c1', isActive: true, isDisabled: false },
  { productId: 'p2', categoryId: 'c1', isActive: true, isDisabled: false },
  { productId: 'p3', categoryId: 'c3', isActive: true, isDisabled: true },   // disabled → not counted
  { productId: 'p4', categoryId: 'c1', isActive: false, isDisabled: false }, // inactive → not counted
];
const popularProducts = [
  { productId: 'p1', categoryId: 'c1', isActive: true, isDisabled: false },
  { productId: 'p9', categoryId: 'c2', isActive: true, isDisabled: false },  // off-menu → excluded
];
const base = { activeCategory: 'all', onCategoryChange: jest.fn(), onBack: jest.fn(), categories, activeMenuProducts };

test('V1 real category shows count by categoryId (active, non-disabled only)', () => {
  render(<CategoryPanel {...base} />);
  expect(screen.getByTestId('category-c1')).toHaveTextContent('Starters (2)');
});
test('V2 category with 0 active-menu items is hidden', () => {
  render(<CategoryPanel {...base} />);
  expect(screen.queryByTestId('category-c2')).toBeNull();
  expect(screen.queryByTestId('category-c3')).toBeNull(); // only a disabled item
});
test('V3 All always visible with total visible count', () => {
  render(<CategoryPanel {...base} activeMenuProducts={[]} />);
  expect(screen.getByTestId('category-all')).toHaveTextContent('All (0)');
});
test('V4 Popular scoped to active menu and hidden when setting OFF', () => {
  render(<CategoryPanel {...base} popularProducts={popularProducts} showPopularCategory />);
  expect(screen.getByTestId('category-popular')).toHaveTextContent('Popular (1)');
  render(<CategoryPanel {...base} popularProducts={popularProducts} showPopularCategory={false} />);
  expect(screen.queryAllByTestId('category-popular')).toHaveLength(1); // only from first render
});
test('V5 Popular hidden when intersection is empty', () => {
  render(<CategoryPanel {...base} popularProducts={[popularProducts[1]]} showPopularCategory />);
  expect(screen.queryByTestId('category-popular')).toBeNull();
});
test('V6 row order: Popular → All → real categories', () => {
  render(<CategoryPanel {...base} popularProducts={popularProducts} showPopularCategory />);
  const ids = screen.getAllByTestId(/^category-/).filter(b => b.tagName === 'BUTTON').map(b => b.dataset.testid);
  expect(ids).toEqual(['category-popular', 'category-all', 'category-c1']);
});
```

Run: `cd /app/frontend && CI=true npx craco test --watchAll=false --testPathPattern=CategoryPanel.cr376fub`
(Implementation agent may adjust selectors if `category-back-btn` testid matches the regex — filter above already excludes it via `tagName`/prefix; verify.)

---

## Checkpoints (Implementation agent scratch note)

```
☐ E1 — CategoryPanel.jsx — 2 new props with [] defaults
☐ E2 — CategoryPanel.jsx — allCategories useMemo: counts / hide 0 / All always / Popular ∩
☐ E3 — CategoryPanel.jsx — span renders "Name (count)"
☐ compile check #1
☐ E4 — OrderEntry.jsx L102 — useState("all")
☐ E5 — OrderEntry.jsx L556 — Popular branch scoped via visibleIds
☐ E6 — OrderEntry.jsx L1670-1676 — 2 props passed
☐ compile check #2 (0 new warnings; pre-existing `isScheduled` warning stays)
☐ E7 — test file created, 6/6 PASS
☐ Self-test V1–V12 recorded
☐ EXIT GATE 5/5
```

---

## Verification Matrix (inherited by IMPLEMENTATION self-test and QA Gate 5b)

| V# | Edit | File | How to verify | Mode |
|---|---|---|---|---|
| V1 | E2/E3 | CategoryPanel.jsx | Real cat count = active & non-disabled items with that `categoryId` | Unit (E7) |
| V2 | E2 | CategoryPanel.jsx | Category with 0 such items is not rendered (incl. "disabled-only" cat) | Unit (E7) |
| V3 | E2 | CategoryPanel.jsx | `All (0)` rendered when active menu empty | Unit (E7) |
| V4 | E2 | CategoryPanel.jsx | Popular count = popular ∩ visible by `productId`; absent when setting OFF | Unit (E7) |
| V5 | E2 | CategoryPanel.jsx | Popular hidden when intersection = 0 even with setting ON | Unit (E7) |
| V6 | E2 | CategoryPanel.jsx | Row order Popular → All → cats (CR-148 order preserved) | Unit (E7) |
| V7 | E4 | OrderEntry.jsx | Restaurant with `showPopularCategory` ON: Order Entry opens on **All (n)** active, not Popular | Browser |
| V8 | E2+E6 | both | **Equality check:** for every visible row, click it → grid tile count == bracket number; no row produces empty grid (BUG-462 empty state only when All (0)) | Browser |
| V9 | E5 | OrderEntry.jsx | Click Popular (n) → exactly n tiles, every tile's product is in the active menu (spot-check 3 via Menu Management `foodFor`) | Browser |
| V10 | E2 | CategoryPanel.jsx | Premium station (QA_OWNER): the 18 Normal-only cats absent; Normal station: the 25 Premium-only cats absent (matrix `evidence/CR-376/CR-376_category_menu_matrix_2026_09_25.json`) | Browser (needs QA_OWNER) |
| V11 | ALL | both | Regression: search box + dietary filters still narrow the grid within the selected category; add-to-cart, cart totals, place order unchanged (R5) | Browser |
| V12 | ALL | both | webpack: 0 new warnings; existing tests `npx craco test --watchAll=false` still green | Build log |

**Automated:** V1–V6 (6). **Manual:** V7–V12 (6). V10 requires `QA_OWNER` credentials (multi-menu restaurant); V7–V9, V11 runnable with `QA_HYATT`.

---

## Regression Checklist (R5 hotspot — OrderEntry.jsx)

| # | Flow | Why |
|---|---|---|
| R1 | Dine-in: open table → select category → add item → cart total → place order | `getFilteredItems` touched |
| R2 | QSR / TakeAway / Delivery: same as R1 | shared `OrderEntry` |
| R3 | Walk-in order (R13) | special flows in same component |
| R4 | Search while on Popular tab → results only from popular ∩ active menu | E5 interacts with search branch below L556 |
| R5 | `showPopularCategory` OFF restaurant → no Popular row, default All, no console errors | E2 gate path |
| R6 | BUG-462 empty state still shows when active menu has 0 items (All (0) only row) | adjacent CR-376 fix |
| R7 | BUG-464 chip text, CR-376 menu chip unchanged | adjacent lines L1722-1730 |
| R8 | Custom item add modal still lists all categories (uses raw `categories`, not panel list) | downstream consumer per IA |

---

## Post-Code Registry Checklist (EXIT GATE — IMPLEMENTATION agent MUST execute)

```
☐ 1. registry.json: CR-376-FU-B → status: "GATE_5A_IMPLEMENTED (<date>) …", sprint_key: sep_bug_closure,
       artifact_refs += QA handover, completeness 4/7, category IN_PROGRESS
☐ 2. CR_REGISTRY.md: CR-376-FU-B row → Gate 5a IMPLEMENTED, files + test path
☐ 3. FILE_OWNERSHIP.md: add rows —
       components/order-entry/CategoryPanel.jsx  | E1-E3 props/counts/label | CR-376-FU-B IMPL <date>
       components/order-entry/OrderEntry.jsx     | L102 default "all", L556-558 popular scoping, L1676-1677 props | CR-376-FU-B IMPL <date>
       components/order-entry/__tests__/CategoryPanel.cr376fub.test.jsx | NEW | CR-376-FU-B
☐ 4. Code markers: // CR-376-FU-B present in CategoryPanel.jsx (E1, E2, E3) and OrderEntry.jsx (E4, E5, E6) + test header
☐ 5. Compile: webpack 0 new warnings; E7 6/6 PASS
```

QA handover: `handover/QA_HANDOVER_CR376_FU_B_<DATE>.md` — inherit this Verification Matrix + Regression Checklist; §4 must state `Registry synced: YES · EXIT GATE: 5/5`.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Count predicate diverges from grid → row hidden while grid has items (or vice versa) | LOW | Predicate copied verbatim from L560-561 (`categoryId && isActive && !isDisabled`); V8 equality check per row |
| `activeCategory` left on "popular" while Popular row hidden | NONE | Default is now "all" (E4); Popular row cannot be clicked when hidden; `activeMenuProducts` static per mount (CR-376 design) |
| Popular order changes | NONE | E5 filters `popularProducts` (keeps rank order) rather than re-deriving from `activeMenuProducts` |
| `popularProducts` items lack `productId` | NONE | Verified: same `productFromAPI.product` transform as `products` (`LoadingPage.jsx` L461) |
| `useMemo` recomputes on every render | NONE | deps are context arrays (stable per mount) — recompute only on real changes |
| Long names truncate before "(n)" | ACCEPTED | Owner OQ-B3 accepted truncation; `w-44` panel unchanged |
| Hotspot regression in cart/payment | LOW | No edit below L556-558 except props at L1676; R1–R8 checklist |
| V10 unverifiable without multi-menu creds | MEDIUM | QA_HYATT covers V7–V9/V11; V10 pending `QA_OWNER` (already tracked blocker) |

---

## Owner Decisions

| # | Question | Status |
|---|---|---|
| OQ-B1…B4 | All always/default · count source · brackets · Popular scope | **LOCKED** (IA 2026-09-25) |
| OQ-B5 (new, non-blocking) | Row order: keep CR-148 "Popular → All → cats" (plan default) or move All to top? | **Default applied: keep CR-148 order.** Owner may flip at Gate 4 — 1-line change in E2 (`list.push` order). Not blocking. |

---

```
Planning complete: CR-376-FU-B
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: MEDIUM
Files WILL change: CategoryPanel.jsx (E1–E3) · OrderEntry.jsx (E4–E6, R5 hotspot additive) · NEW __tests__/CategoryPanel.cr376fub.test.jsx (E7)
Files WILL NOT touch: MenuContext.jsx · productTransform.js · categoryTransform.js · activeMenuPrefs.js · LoadingPage.jsx · StatusConfigPage.jsx · CustomerModal.jsx · any API/localStorage/provider
Owner decisions: none blocking (OQ-B5 row-order default = keep CR-148 order)
Verification matrix: 12 checks (6 automated, 6 manual; V10 needs QA_OWNER)
Docs: plans/CR-376-FU-B_IMPLEMENTATION_PLAN.md · registry.json · CR_REGISTRY.md · CONTROL_DASHBOARD.md
Next: Owner says "CR-376-FU-B Gate 4 GO" → IMPLEMENTATION agent
```
