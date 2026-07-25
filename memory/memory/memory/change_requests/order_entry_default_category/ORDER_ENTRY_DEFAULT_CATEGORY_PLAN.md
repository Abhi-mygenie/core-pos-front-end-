# Order Entry — Default Category "All" Instead of "Popular"

> **Mode:** Investigation + plan only. **No code changes.** No commits.
> **Branch:** `15-may` HEAD.

---

## 1. Problem

In the Order Entry screen's left rail (`CategoryPanel`), the **Popular**
category is selected by default when the screen opens. The owner wants
**All** to be the default selection instead. See the user-attached
screenshot (Popular row highlighted green).

The two specials in the rail (`All`, `Popular`) and all real categories
(Pepsi, rum, chiken, aalu, …) are correctly listed; only the initial
selection should change.

---

## 2. Where the default lives — exact location

There is exactly **one** place where the default is set, and **one**
filter branch that consumes the value. Both are in
`frontend/src/components/order-entry/OrderEntry.jsx`.

| File | Line | Code |
|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | **82** | `const [activeCategory, setActiveCategory] = useState("popular");` |
| `frontend/src/components/order-entry/OrderEntry.jsx` | 434–443 | `getFilteredItems()` branch — already handles `activeCategory === "all"` (line 434–435) and `activeCategory === "popular"` (line 436–438) |
| `frontend/src/components/order-entry/CategoryPanel.jsx` | 8–14 | Renders the rail starting with `[{id:"all"}, {id:"popular"}, ...real]` |
| `frontend/src/components/order-entry/OrderEntry.jsx` | 1056–1057 | `<CategoryPanel activeCategory={activeCategory} onCategoryChange={(id)=>setActiveCategory(id)} … />` |

`CategoryPanel` is a controlled, presentation-only component. It does
not own the default. The default is owned entirely by line 82.

### Behaviour of `getFilteredItems()` (lines 434–443)

```js
if (activeCategory === "all") {
  items = products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
} else if (activeCategory === "popular") {
  const source = popularFood.length > 0 ? popularFood : products.slice(0, 20);
  items = source.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
} else {
  items = products
    .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
    .map(adaptProduct);
}
```

- `"all"` already returns the full active-product list. No additional
  helper needed.
- `"popular"` falls back to `products.slice(0, 20)` if `popularFood` is
  empty. After the change the "popular" branch is still reachable when
  cashier explicitly clicks the Popular row in the rail — its semantics
  do not need to change.

---

## 3. Root cause

Line 82 hard-codes `"popular"` as the initial value of `activeCategory`.
This was an early product decision that the owner now wants reversed.

There is no dynamic logic, no settings flag, no profile field driving
this — it's a literal string in the `useState` initialiser.

---

## 4. Impact analysis

### Direct impact
- `OrderEntry.jsx:82` — the only state-initialiser change.
- Initial render of OrderEntry will show the full menu (filtered by
  `isActive && !isDisabled`) instead of the Popular subset.
- `CategoryPanel` will highlight the **All** row in green (with the
  right-chevron) instead of **Popular**.
- The Popular row remains clickable; clicking it still loads the
  popular subset.

### Performance impact
- `products` is the full menu (typically 50–300 items per tenant). The
  preprod tenant in QA has ~144 products. Rendering all items on initial
  open vs. ~20 popular items is a small but measurable diff.
- Current `getFilteredItems()` is called inside the render path, but the
  results render through the existing menu list (already paginated /
  virtualised? — verify in `MenuPanel` or equivalent). The list rendering
  is unchanged, so any existing virtualisation continues to apply.
- Risk: visibly slower first paint on a very large menu. Mitigation: if
  tenants with >500 items report sluggishness, follow-up CR can lazy-
  paginate the "All" view. Not needed for typical menu sizes.

### Functional impact on related flows
- **Search** (`searchQuery`) — searches within the currently-filtered
  list. With `"all"` as default the search will now search across the
  full menu by default, which is the intuitive behaviour cashiers expect.
- **Dietary filters** (`primaryFilter`, `secondaryFilters`) — composed
  AFTER the category filter (lines 448–460). Behaviour unchanged: with
  `"all"` as default these filters now narrow the full menu rather than
  the popular subset.
- **Walk-in / Dine-in / Takeaway / Delivery / Room** flows — all open
  through the same `OrderEntry` component. The change applies uniformly
  to every entry path.
- **OrderEntryResetNonce** (DashboardPage L1338) — used to force
  `OrderEntry` re-mount. After the change, every fresh mount re-seeds
  `activeCategory = "all"`.

### Components that DO NOT need changes
- `CategoryPanel.jsx` — controlled component; no logic edit needed. The
  `"All"` entry already exists in the rail (line 9). Its rendering
  branch for the active row (lines 53–60) reads from
  `activeCategory === category.id`, which becomes `"all"` automatically.
- `MenuContext.jsx` / `categoryService.js` / `categoryTransform.js` —
  data layer unchanged.
- `data/mockMenu.js` — fixture file; not consumed by production runtime.
- All tests — no existing tests reference `activeCategory`, `"popular"`,
  `category-all`, or `category-popular` (verified via grep across
  `__tests__/`).

### Things NOT impacted
- VAT, service charge, tip, delivery charge — orthogonal.
- Channel view stability fix (just shipped) — orthogonal; different
  surface.
- Socket handlers, payload builders, transforms — orthogonal.
- Status view / channel view dashboard — orthogonal.
- Settings, profile, restaurant config — no settings field exists for
  this default today; not adding one in this CR.

---

## 5. Proposed change (minimal, one-line)

**File:** `frontend/src/components/order-entry/OrderEntry.jsx`

**Line 82:**

```diff
- const [activeCategory, setActiveCategory] = useState("popular");
+ const [activeCategory, setActiveCategory] = useState("all");
```

That is the entire code diff. **One line in one file.**

### Why not "make it configurable"?
- Owner brief is binary: "all selected by default". No mention of a
  per-tenant setting or per-cashier preference.
- Keeping it a literal preserves YAGNI and matches the existing pattern.
- If owner later wants tenant-config, that's a follow-up CR that adds a
  `defaultMenuCategory` field to restaurant settings and reads it here.

---

## 6. Optional polish (defer; not part of this CR)

1. **Remove `popular` fallback to `products.slice(0, 20)`** (line 437).
   If `popularFood` is empty, "Popular" currently silently shows "first
   20 products" — a leftover from before the Popular API was wired. With
   `All` as default this fallback is less likely to be hit, but it's
   still a foot-gun. Recommend cleaning up in a tidy-up CR.

2. **Settings-driven default.** If the owner later wants to make this
   configurable per-tenant, add `restaurant.settings.defaultMenuCategory`
   and read it in the `useState` initialiser. Out of scope here.

3. **Reset to default on re-open.** Current behaviour: `OrderEntry`
   re-mounts on table click (via `orderEntryResetNonce`), so the
   default re-applies on every fresh entry — correct out of the box.
   No effort needed.

---

## 7. Files allowed to touch (if owner approves implementation)

Just one:

- `frontend/src/components/order-entry/OrderEntry.jsx` — line 82 only.

**Strictly do not touch:**

- `CategoryPanel.jsx` (no logic change needed).
- `MenuContext.jsx`, `MenuPanel.jsx`, any menu service / transform.
- VAT / service charge / tip / delivery charge surfaces.
- Channel-view / status-view dashboard code.
- Socket handlers, action handlers, payload builders.
- Tests (no existing tests reference the default; adding one is a nice-
  to-have but not required).

---

## 8. Regression risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| First paint slower on tenants with very large menus | Low; ~144 items renders fine in current QA tenant | Existing list virtualisation (if any) continues to apply; lazy pagination is a future opt-in |
| Cashier muscle-memory expects Popular default | Low–medium — change is exactly what owner asked for | Release-note callout |
| Search results "feel different" because they search a larger pool by default | Negative? — actually the desired behaviour ("see everything until you narrow") | None |
| Test regression | None | No test asserts `"popular"` default |
| Lint / typecheck | None | One literal string change |
| Hot-reload / dev experience | None | useState initialiser change is a clean re-mount |

---

## 9. QA checklist (post-implementation)

1. Open OrderEntry from a fresh dine-in table click → `All` row in the
   left rail is highlighted green, `Popular` is not.
2. The menu pane on the right lists the full active-product set
   (filtered by `isActive && !isDisabled`).
3. Click **Popular** in the rail → it highlights, menu pane switches to
   popular subset. Click **All** → it highlights, menu pane returns to
   full list.
4. Click any real category (e.g. **Pepsi**, **chiken**) → that category
   highlights, menu pane filters to that category's items.
5. Type into the menu search box while default `All` is selected →
   search narrows across the entire active menu (no "Popular" gating).
6. Apply a primary dietary filter (Veg / Non-Veg) → composes correctly
   with `All` (filters all active products by `type`).
7. Reopen OrderEntry on a different channel (delivery / takeaway / room /
   walk-in) → default is `All` in every channel.
8. Close OrderEntry and reopen → resets to `All` (not the last-clicked
   category) — already the case because `useState` re-initialises on
   re-mount.
9. Existing unit suite (`yarn test`) — 492/492 green expected (no test
   touches this state).
10. No regression in cart, payment, delivery-lock, channel-view
    stability, VAT/SC/tip math (all orthogonal).

---

## 10. Final answers to the canonical questions

1. **Report path:** this file —
   `/app/memory/change_requests/order_entry_default_category/ORDER_ENTRY_DEFAULT_CATEGORY_PLAN.md`
2. **Where the default is set:** `OrderEntry.jsx:82`,
   `useState("popular")`.
3. **What to change:** Replace `"popular"` with `"all"` on that line.
   One file, one line. No other edits.
4. **Why "All" works out of the box:** the existing
   `getFilteredItems()` already has an `activeCategory === "all"`
   branch (line 434–435), and `CategoryPanel.jsx:9` already renders an
   `{id:"all", name:"All"}` entry at the top of the rail.
5. **Regression risk:** Minimal — no test references this default; no
   other code path depends on `"popular"` being the initial value;
   `CategoryPanel` is a controlled component that simply reflects the
   prop.
6. **Owner approval needed:** trivial change, owner already explicitly
   requested it — implementation can proceed when owner gives the green
   light.

— End of investigation/plan.
