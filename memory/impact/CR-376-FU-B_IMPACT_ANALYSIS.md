# Impact Analysis — CR-376-FU-B
## CategoryPanel: Hide Empty Categories for Active Menu + Item Counts + Default "All" + Popular Scoping

**Date:** 2026-09-25
**Planning agent:** ALPHA v0.7 Role 2 (Gate 2 only — owner instructed "stop after Gate 2")
**Sprint:** `sep_bug_closure` (proposed — was TBD at intake)
**Risk:** MEDIUM (intake) → **MEDIUM confirmed** (touches R5 hotspot `OrderEntry.jsx`, see §Risk)
**Parent CR:** CR-376 (GATE_5B_QA_PASS rounds 1–3 with QA_HYATT — precondition MET)
**Owner Gate 2 GO:** 2026-09-25

---

## Code Reality

**NONE** — no menu-aware filtering, counts, or Popular scoping exists.
- `CategoryPanel.jsx` L12: `categories.map(c => ({ id: c.categoryId, name: c.categoryName }))` — renders every category from boot, unconditionally.
- `CategoryPanel.jsx` L57: `<span className="truncate">{category.name}</span>` — name only, no count.
- `OrderEntry.jsx` L102: `useState(() => showPopularCategory ? "popular" : "all")` — default tab is **Popular** when the restaurant setting `showPopularCategory` is ON (owner observation confirmed: "by default we select popular").
- `OrderEntry.jsx` L556: `items = popularProducts.map(adaptProduct)` — Popular tab is **NOT** scoped to `activeMenuProducts` (CR-376 only re-pointed the `all` and per-category branches at L558/L560).
- Code marker `CR-376-FU-B` → 0 hits.

---

## Conflict Pre-Check

| File | Last modifier (FILE_OWNERSHIP) | Open items touching it | Conflict? |
|---|---|---|---|
| `CategoryPanel.jsx` | BUG-134 (min-h-0 scroll) — old | none open | **NONE** |
| `OrderEntry.jsx` | BUG-462 FIX 2026-09-25 (L57, L1801-1804) · BUG-464 FIX (L1723/L1730) · CR-376 IMPL (L57, L558/560, L1722, L1800, L2867) | CR-376 / BUG-462 / BUG-464 all GATE_5A/5B — code frozen, no further edits planned | **NONE** — FU-B target lines (L102, L556, L1670-1676) do not overlap any of the above |

**CLEAR.** Execution order: after CR-376 + BUG-462/464 (already in tree).

---

## Owner Question Resolution (blocker cleared this session)

**Original blocker:** Should bracket counts be computed by product `categoryId` (single primary) or `categoryIds` (array)?

**Validation performed (code + evidence, no assumptions):**

| Check | Finding |
|---|---|
| `productTransform.js` L62-63 | Both fields exist on every product: `categoryId: api.category_id` and `categoryIds: fromAPI.categoryIds(api.category_ids)`. |
| `OrderEntry.jsx` L561 (item grid) | Grid filters **only** by `p.categoryId === activeCategory`. `categoryIds` is never used for display. |
| Evidence — `evidence/CR-376/CR-376_hyatt_probe_2026_09_25.json` sample, `evidence/BUG-412/*.json`, `evidence/CR-364/probe_single_order_1232245_2026_09_14.json` | Every captured product has `category_ids` with **exactly 1 entry**, identical to `category_id`. No multi-category product observed. |
| Owner statement | Category names unique; product names unique within one menu. The "7 same-name items" in the category matrix are cross-menu Normal↔Premium copies (separate product IDs), not duplicates within a menu. Consistent. |

**Verdict: question dissolved.** Counts MUST use `categoryId` — the same field the grid uses — so bracket number = tiles shown on click by construction. `categoryIds` is irrelevant to this CR. **No open owner decision remains.**

---

## Data Flow Trace

```
Boot  →  productTransform.productList  →  MenuContext.products  (all non-Aggregator menus, foodFor kept)
                                       →  MenuContext.activeMenuProducts = products.filter(p.foodFor === activeMenuType)
                                       →  MenuContext.categories        (ALL categories, no menu tag on category)
                                       →  MenuContext.popularProducts   (boot, BUG-340 — ALL menus, unscoped)
                                               ↓
OrderEntry.jsx L57   destructures categories / popularProducts / activeMenuProducts
OrderEntry.jsx L102  activeCategory default = showPopularCategory ? "popular" : "all"
OrderEntry.jsx L1670 <CategoryPanel categories={categories} showPopularCategory=… />   ← no products passed
OrderEntry.jsx L553  getFilteredItems():
                       popular → popularProducts (UNSCOPED)           ← GAP 2
                       all     → activeMenuProducts (active, !disabled)
                       <id>    → activeMenuProducts where categoryId === id

═══ GAP (pre-fix) ═══════════════════════════════════════════════════════
GAP 1  CategoryPanel lists every category from boot → categories with 0 active-menu
       items are clickable and produce an empty grid (25 Premium-only cats on a
       Normal station / 18 Normal-only cats on a Premium station — QA_OWNER matrix).
GAP 2  Popular tab shows popularProducts from all menus → off-menu popular tiles
       render; tapping adds an item from another menu (inconsistent with CR-376).
GAP 3  Default tab is Popular when setting ON → owner wants All always.
GAP 4  No item count on category rows.
═════════════════════════════════════════════════════════════════════════

═══ FIX (post-fix) ══════════════════════════════════════════════════════
CategoryPanel receives activeMenuProducts (+ popularProducts):
  visibleItems  = activeMenuProducts.filter(isActive && !isDisabled)
  count(cat)    = visibleItems.filter(p => p.categoryId === cat.categoryId).length
  real cats     = categories.filter(count > 0) → label "Name (count)"
  All           = always shown, label "All (visibleItems.length)"
  Popular       = popularProducts ∩ visibleItems by productId; hidden when 0; label "Popular (n)"
OrderEntry:
  L102 default → "all"
  L556 popular → popularProducts filtered to ids present in visibleItems
═════════════════════════════════════════════════════════════════════════
```

---

## Locked Behaviour Rules (owner-confirmed 2026-09-25)

| # | Rule | Status |
|---|---|---|
| B1 | Hide a real category when it has 0 active, non-disabled items in `activeMenuProducts` (by `categoryId`). | LOCKED |
| B2 | Show item count in brackets next to every visible row: `Starters (12)`. Truncation of long names accepted by owner. | LOCKED |
| B3 | "All" always visible, **always the default tab on entry**, regardless of `showPopularCategory`. Count = total visible active-menu items. | LOCKED (owner: "default tab should be always all") |
| B4 | Popular tab: items scoped to active menu (`popularProducts ∩ activeMenuProducts`). Hidden when intersection is 0. Still gated by `showPopularCategory` setting. | LOCKED |
| B5 | Count source = `categoryId` (single primary), identical to grid filter at L561. `categoryIds` NOT used. | LOCKED (validated above) |

---

## Affected Files

| File | Change (scope for Gate 3) | Hotspot | Est. lines |
|---|---|---|---|
| `src/components/order-entry/CategoryPanel.jsx` | +2 props (`activeMenuProducts`, `popularProducts`) · rewrite `allCategories` useMemo to compute counts, drop 0-count cats, conditionally include Popular · label `${name} (${count})` | NO | ~15 |
| `src/components/order-entry/OrderEntry.jsx` | L102: default `"all"` · L556: scope Popular branch to active menu · L1670-1676: pass 2 new props | **YES (R5)** | ~4 (additive, no financial logic) |

**Files NOT touched:** `MenuContext.jsx`, `productTransform.js`, `categoryTransform.js`, `activeMenuPrefs.js`, `StatusConfigPage.jsx`, `CustomerModal.jsx`, any API/transform/localStorage.

---

## Downstream Consumers / Edge Cases

| Case | Behaviour post-fix | Risk |
|---|---|---|
| `activeCategory` currently points at a category that becomes hidden (e.g. station menu changed in Settings, app remounts) | Default resets to `"all"` on mount (B3), so stale selection cannot survive a remount. Within a single mount `activeMenuProducts` is static (localStorage read once at context init — CR-376 design), so a visible category cannot disappear mid-session. | LOW |
| Empty active menu (0 items) | All (0) shown alone; grid already renders BUG-462 empty state. Popular hidden. | LOW |
| `showPopularCategory` OFF | Popular row never rendered (unchanged gate). Default already "all". | NONE |
| Single-menu restaurant (Normal-only, e.g. cafe103) | `activeMenuProducts === all products` → no category hidden unless it genuinely has 0 active items (was already an empty click pre-fix — now hidden, mild improvement). Counts appear. | LOW |
| Search / dietary filters | Applied after category branch in `getFilteredItems` — counts are pre-filter and intentionally so (owner accepted bracket = category size, not filtered size). | NONE |
| Custom item add (`handleAddCustomItem` L1371) uses `categoryId` from a picker | Unaffected — separate component, uses raw `categories`. | NONE |
| Scroll indicator `hasMoreCategories > 8` | Recomputed on the reduced list — correct. | NONE |
| `index.js` re-export of CategoryPanel | Only import site is `OrderEntry.jsx` L23/L1670 — no other consumer to update. | NONE |

---

## Risk Classification

- **Risk: MEDIUM** (unchanged from intake)
- Trigger: `OrderEntry.jsx` is an R5 hotspot — 3 small edits (1 default value, 1 filter, 2 props). None touch cart, payment, tax, or order placement paths.
- `CategoryPanel.jsx` is non-hotspot, display-only, derives everything from props via `useMemo`.
- Regression vector: an incorrect count predicate could hide a category that has items. Mitigation: the predicate is **identical** to the grid's L561 filter — if the grid shows items, the row shows; if the grid is empty, the row is hidden. Gate 3 verification matrix will assert this equality per category via browser check.
- **Fast Lane: NOT ELIGIBLE** — 2 files, one hotspot. Full Gate 3 → Gate 4 GO required.

---

## Owner Decisions

| # | Question | Answer |
|---|---|---|
| OQ-B1 (intake) | Should "All" always show or hide at 0? | **Always show; always default.** (2026-09-25) |
| OQ-B2 (intake) | Count source after E6/E7 dropped in CR-376? | **Derive in CategoryPanel from `activeMenuProducts` by `categoryId`.** (validated 2026-09-25) |
| OQ-B3 | Show counts in brackets? | **YES**, truncation accepted. |
| OQ-B4 | Popular tab scope? | **Scope to active menu; hide when empty.** |

**Zero open owner decisions. Gate 3 can proceed on owner GO.**

---

```
Impact Analysis complete: CR-376-FU-B
Code Reality: NONE
Conflict pre-check: CLEAR (CR-376 / BUG-462 / BUG-464 lines do not overlap)
Blocker (categoryId vs categoryIds): RESOLVED — use categoryId, same as grid L561
Risk: MEDIUM (OrderEntry.jsx R5 hotspot, ~4 additive lines)
Files: 2 (CategoryPanel.jsx ~15 lines · OrderEntry.jsx ~4 lines)
Fast Lane: NOT ELIGIBLE
Next: Gate 3 Implementation Plan — awaiting owner "Gate 3 GO"
```
