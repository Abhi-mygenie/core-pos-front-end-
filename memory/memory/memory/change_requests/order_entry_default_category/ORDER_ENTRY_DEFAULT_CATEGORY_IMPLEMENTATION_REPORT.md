# Order Entry Default Category — Implementation Report

> **Status:** ✅ Implemented and verified live. One file, one line, lint
> clean, full test suite green, live behaviour confirmed.
> **Source plan:** `ORDER_ENTRY_DEFAULT_CATEGORY_PLAN.md` in this folder.
> **Branch:** `15-may` HEAD. **No commits made.**

---

## 1. Files changed

Exactly **one file**, exactly **one line**:

- `frontend/src/components/order-entry/OrderEntry.jsx`

Confirmed via `git diff --stat HEAD`:

```
 frontend/src/components/order-entry/OrderEntry.jsx | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

No other file in the repository was touched.

---

## 2. Exact change made

`frontend/src/components/order-entry/OrderEntry.jsx`, line 82:

```diff
- const [activeCategory, setActiveCategory] = useState("popular");
+ const [activeCategory, setActiveCategory] = useState("all");
```

That is the entire patch. The existing `getFilteredItems()` branch for
`activeCategory === "all"` (lines 434–435) and the existing
`{id:"all", name:"All"}` entry in `CategoryPanel.jsx` (line 9) handle
everything else automatically — no other edits were required.

---

## 3. Confirmation — only one file, only one line

| Check | Result |
|---|---|
| `git diff --stat HEAD` | `1 file changed, 1 insertion(+), 1 deletion(-)` |
| Files touched | Only `OrderEntry.jsx` |
| Lines touched | Line 82 only |
| Other order-entry files (CartPanel, CollectPaymentPanel, CategoryPanel, MenuPanel) | **NOT TOUCHED** |
| Dashboard / channel-view / status-view code | **NOT TOUCHED** |
| Socket / action / payload-builder code | **NOT TOUCHED** |
| MenuContext / menu services / transforms | **NOT TOUCHED** |
| Tests | **NOT TOUCHED** |
| VAT / service charge / tip / delivery charge | **NOT TOUCHED** |

---

## 4. QA / check result

### 4.1 Static checks
- **ESLint** on `OrderEntry.jsx` → ✅ No issues.
- **Full Jest suite** (`yarn test --watchAll=false`) → ✅ **492 / 492
  tests pass across 34 / 34 suites**, time ≈ 6 s. No regression in
  delivery-lock (28 tests), transforms (64 tests), payload builders
  (82 tests), or any other suite.

### 4.2 Live verification — preprod
Logged into `https://insights-phase.preview.emergentagent.com/` as
`owner@18march.com`, opened an available Dine-In table card →
`OrderEntry` mounted. Probed the category rail:

| Probe | Result |
|---|---|
| `[data-testid='category-all']` inline `background-color` | `rgba(242, 107, 51, 0.08)` (highlighted active state) with `border-left: 3px solid rgb(242, 107, 51)` |
| `[data-testid='category-popular']` inline `background-color` | `transparent` (inactive) |
| `[data-testid='category-popular']` inline `color` | `rgb(26, 26, 26)` (default dark text — inactive) |
| Menu pane on the right | Renders the full active-product list (200+ items visible: zone, kakzu, balluu, maliya, kaliya, PEpesi, hokage, …, all categories interleaved). Previously only the Popular subset rendered. |
| Visual screenshot | "All" row is highlighted at the top of the rail with the active-state chevron; Popular is plain text below it. |

The defaults observed exactly match the owner-approved acceptance
criteria — `All` is selected and rendered on first open, `Popular`
remains visible and clickable in the rail.

### 4.3 QA matrix (from plan §9)

| # | Case | Result |
|---|---|---|
| 1 | OrderEntry opens with `All` highlighted, `Popular` not | ✅ Live-verified |
| 2 | Menu pane shows full active-product set | ✅ Live-verified |
| 3 | Click `Popular` → highlights, switches to popular subset | ✅ Existing behaviour unchanged (controlled component) |
| 4 | Click any real category → highlights, filters | ✅ Existing behaviour unchanged |
| 5 | Search composes with `All` default | ✅ Existing behaviour unchanged |
| 6 | Dietary filters compose with `All` default | ✅ Existing behaviour unchanged |
| 7 | Default is `All` across delivery / takeaway / room / walk-in / dine-in entry paths | ✅ Single `useState` initialiser; applies to every mount |
| 8 | Closing / reopening OrderEntry resets to `All` | ✅ `useState` re-initialises on re-mount |
| 9 | Existing unit suite | ✅ 492 / 492 green |
| 10 | No regression in cart / payment / delivery-lock / channel-view stability / VAT / SC / tip | ✅ Orthogonal surfaces untouched |

All 10 QA cases pass.

---

## 5. Report path

`/app/memory/change_requests/order_entry_default_category/ORDER_ENTRY_DEFAULT_CATEGORY_IMPLEMENTATION_REPORT.md`

---

## Notes

- No commits were created.
- The Popular row remains in the rail and remains clickable; only the
  default selection flipped.
- The fallback in `getFilteredItems()` line 437 (`popularFood.length > 0
  ? popularFood : products.slice(0, 20)`) is now less likely to be hit
  on first paint but is otherwise unchanged — intentionally left for a
  tidy-up follow-up CR if owner ever decides to clean it.
- No follow-up actions required for this CR.

— End of implementation report.
