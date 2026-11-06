# Investigation Report — Menu Bulk Edit: Filter Gaps & Aggregator Delete Gap

**Date:** 2026-09-11  
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)  
**Scope:** Two owner-reported UX gaps in Menu Management:
1. Normal menu bulk edit — no filter capability (status, type, category)
2. Aggregator menu bulk edit — no bulk delete capability  

**Steps used:** 7/10  
**Files read:** `BulkEditor.jsx`, `ProductList.jsx`, `MenuManagementPanel.jsx`, `menuManagementService.js`, `BUG_TRACKER.md`, `CR_REGISTRY.md`, `registry.json`

---

## 1. Summary

| Gap | Root Cause | Classification | Confidence |
|-----|-----------|----------------|:---:|
| GAP-1: Normal + Aggregator Bulk Edit — no status/type/category filter | Feature was never built — BulkEditor only has text search. ProductList card view has filters; BulkEditor never received them. | FE_MISSING_FEATURE | HIGH |
| GAP-2: Normal Bulk Delete — can't "select all inactive" | Consequence of GAP-1: no filter → Select All = ALL rows, not filtered subset. | FE_MISSING_FEATURE | HIGH |
| GAP-3: Aggregator Bulk Edit — no bulk delete | FE hard-guard `showBulkDelete = menuType !== 'Aggregator'` (CR-159). Comment + service doc confirm backend `/delete-bulk` only accepts `food_for: Normal|Party|Premium`, not `Aggregator`. | BACKEND_LIMITATION + FE_GUARD | HIGH |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|------------|-------|--------|---------|
| H1 | BulkEditor has hidden/disabled filter UI for status/type | Code read `BulkEditor.jsx` state + `groupedRows` useMemo | 1 | ELIMINATED — no filter state exists at all | BulkEditor.jsx:242–471; only `search` string in groupedRows filter |
| H2 | ProductList (card view) has filters — BulkEditor should mirror | Code read `ProductList.jsx:12–66` | 1 | CONFIRMED — `STATUS_FILTERS` + `FOOD_FILTERS` defined, functional, used in card view | ProductList.jsx:12–25, 40–66 |
| H3 | Select All in BulkEditor works on filtered rows | Code read lines 980–984 | 1 | PARTIAL — Select All works on visible (search-filtered) rows. Since no status/type filter exists, it always selects ALL rows | BulkEditor.jsx:981–984 |
| H4 | Aggregator bulk delete is blocked by FE guard only (backend supports it) | Code read service comment + `deleteFoodBulk` signature | 1 | ELIMINATED — Service code + comment explicitly state `food_for: 'Normal'|'Party'|'Premium'`. Aggregator not listed. Backend limitation confirmed. | menuManagementService.js:106–112 |
| H5 | Aggregator bulk delete could use `deleteFood` (single-item API) in a loop | Code read service — `deleteFood` has no `food_for` param | 1 | POSSIBLE WORKAROUND — `deleteFood(foodId, deleteReason)` at `DELETE /v2/delete/{foodId}` has no food_for restriction stated. Could be used in a sequential loop for aggregator bulk delete without a backend endpoint change. Needs backend verification. | menuManagementService.js:101–104 |
| H6 | Duplicate check — any existing CR/BUG covers these gaps | Registry search for "bulk filter", "aggregator delete", "select all status" | 1 | CONFIRMED DISTINCT — No registered item covers filter panel in BulkEditor or Aggregator bulk delete. CR-159 (bulk delete for Normal) is related but does not cover these gaps. | BUG_TRACKER.md + CR_REGISTRY.md search |
| H7 | CategoryList sidebar selection passes into BulkEditor | Code read `MenuManagementPanel.jsx:331–344` | 1 | ELIMINATED — `selectedCategoryId` state is used in `ProductList` only. `BulkEditor` receives no `selectedCategoryId` prop — it shows ALL categories grouped alphabetically regardless of sidebar selection | MenuManagementPanel.jsx:331–344; BulkEditor props: `foods, categories, menuType, clients, addons, isLoading, onRefresh, onClose, deleteReasons` |

---

## 3. Data Flow Trace

### 3a. Filter Gap (GAP-1)

```
MenuManagementPanel.jsx
  └─ bulkEditMode=true → <BulkEditor foods={filteredFoods} menuType={menuType} ...>
       └─ groupedRows (useMemo) — filters by:
            ✅ search (text — productName, categoryName, itemCode)
            ❌ status (Active/Inactive) — MISSING
            ❌ itemType (Veg/Non-Veg/Egg/Jain) — MISSING
            ❌ selectedCategory — MISSING (sidebar selection not passed in)

vs.

MenuManagementPanel.jsx
  └─ card view → <ProductList selectedCategoryId={selectedCategoryId} ...>
       └─ filteredProducts (useMemo) — filters by:
            ✅ selectedCategoryId
            ✅ search
            ✅ statusFilter (STATUS_FILTERS array)
            ✅ foodFilter (FOOD_FILTERS array)
```

**Break point:** `groupedRows` in `BulkEditor.jsx:425–471` — only `search` text filter applied.

### 3b. Select-All Gap (GAP-2)

```
"Select All" checkbox → line 981–984
  checked = selectedIds.size > 0 &&
            groupedRows.filter(e => e._type === 'row').every(r => selectedIds.has(r._id))
  onChange → setSelectedIds(new Set(flat.map(r => r._id)))

  flat = ALL visible rows (search-filtered only)
  → Since no status filter exists, "Select All" = select all 200 items
  → No way to "Select All Inactive" without a status filter first
```

### 3c. Aggregator Bulk Delete Gap (GAP-3)

```
BulkEditor.jsx:396
  const showBulkDelete = menuType !== 'Aggregator';
  → checkboxes, Select All, Delete banner, Delete dialog: ALL hidden for Aggregator

menuManagementService.js:106–112
  deleteFoodBulk() → DELETE /v2/delete-bulk
  payload: { ids, delete_reason, food_for: 'Normal'|'Party'|'Premium' }
  → 'Aggregator' NOT in the accepted food_for values

deleteFood() → DELETE /v2/delete/{foodId}
  payload: { delete_reason }
  → No food_for restriction — may work for aggregator items (BACKEND UNVERIFIED)
```

---

## 4. Evidence Artifacts

All findings are code-trace based. No external API calls needed.

| Evidence | Location |
|---------|---------|
| BulkEditor groupedRows filter — text only | `BulkEditor.jsx:425–471` |
| ProductList card view STATUS_FILTERS + FOOD_FILTERS | `ProductList.jsx:12–25, 40–66` |
| showBulkDelete guard | `BulkEditor.jsx:396` |
| deleteFoodBulk service doc — no Aggregator | `menuManagementService.js:106–112` |
| deleteFood single-item — no food_for | `menuManagementService.js:101–104` |
| MenuManagementPanel props to BulkEditor | `MenuManagementPanel.jsx:333–344` |
| Select All checkbox logic | `BulkEditor.jsx:980–984` |

---

## 5. UX Gap Analysis (Investigation Findings)

### GAP-1: BulkEditor Has No Status / Type / Category Filter Panel

**Scope:** Both Normal menu and Aggregator menu.

**Current experience:**
- User opens Bulk Edit with 250 items across 12 categories
- Wants to quickly activate all inactive Veg items
- Only option: scroll through all 250 rows manually, spot inactive rows visually (amber-tinted row if dirty, no visual cue for inactive if not yet changed)
- Text search helps for name-based lookup only

**Missing filters vs. card view:**

| Filter | Card View (ProductList) | Bulk Edit (BulkEditor) |
|--------|------------------------|----------------------|
| Status (Active / Inactive) | ✅ Present | ❌ Missing |
| Food type (Veg / Non-Veg / Egg / Jain) | ✅ Present | ❌ Missing |
| Category (sidebar selection) | ✅ Present (via CategoryList sidebar) | ❌ Missing (sidebar selection not wired to BulkEditor) |
| Text search | ✅ Present | ✅ Present |

**Impact:**
- With 100+ items, finding and editing a subset (e.g., "all inactive items") is impractical
- "Price correction for Starters only" requires scrolling past all other categories
- No shortcut to identify which items need attention (e.g., missing tax setup)

**Recommended CR:** CR-374 — BulkEditor Filter Panel (Status + Type + Category)  
**Design decision LOCKED (2026-09-11):** Option A — Always-visible filter strip. Category = searchable dropdown (owner confirmed 20+ categories). All ODs locked.

---

### GAP-2: Normal Menu Bulk Delete — No "Select All by Status"

**Current experience:**
- User wants to delete all 30 deactivated items (out of 150 total)
- Must manually scroll through all 150 rows, identify the 30 inactive ones visually, check each checkbox individually
- If filters existed (GAP-1 fix), user could: filter to "Inactive" → Select All (now selects only inactive) → Delete

**This gap is a direct consequence of GAP-1.** Fixing GAP-1 (adding status filter) automatically fixes GAP-2.

**No separate CR needed** — absorbed into CR-374.

---

### GAP-3: Aggregator Menu — No Bulk Delete Capability

**Current experience:**
- User managing 180 aggregator menu items wants to delete discontinued items
- Card view: only individual item delete (one at a time via ProductCard menu)
- Bulk edit: checkboxes and delete banner are hidden (`showBulkDelete = false`)
- No batch delete path at all

**Root cause:**
- CR-159 implemented bulk delete for Normal menus only
- Service comment states `/delete-bulk` accepts `food_for: 'Normal'|'Party'|'Premium'` — excludes Aggregator
- This is a **backend limitation** that requires a backend decision first

**Workaround option (frontend-only, unverified):**
- `deleteFood(id, reason)` (`DELETE /v2/delete/{id}`) has no food_for restriction in the FE service code
- Could implement sequential loop of individual deletes for Aggregator bulk delete
- Risk: this endpoint may reject aggregator food IDs on the backend — needs verification

**Recommended next step:** Backend Brief to verify if `deleteFood` endpoint accepts aggregator food IDs, or if `/delete-bulk` can be extended to support `food_for: 'Aggregator'`.

**Recommended CR:** CR-375 — Aggregator Bulk Delete (backend verification required first)

---

### MINOR GAP: BulkEditor Category Sidebar Selection Not Wired

When user selects a category in the left sidebar panel, `selectedCategoryId` is passed to `ProductList` but NOT to `BulkEditor`. If user switches from card view to bulk edit while a category is selected, the bulk edit grid shows all items (ignores the category selection).

**Impact:** Mild confusion — category selection "disappears" when entering bulk edit mode.
**Recommended:** Absorb into CR-374 as a sub-item.

---

## 6. Recommendations

| Gap | Classification | Recommended Action | CRs to Register |
|-----|--------------|-------------------|----------------|
| GAP-1: No status/type/category filter in BulkEditor | FE_MISSING_FEATURE | Register CR-374 (MEDIUM risk, ~30–50 lines, 1 file `BulkEditor.jsx`) | **CR-374** |
| GAP-2: No "select all inactive" for bulk delete | FE_MISSING_FEATURE | Resolved by GAP-1 fix — absorbed into CR-374 | (no separate CR) |
| GAP-3: Aggregator bulk delete entirely absent | BACKEND_LIMITATION + FE_MISSING_FEATURE | (a) Issue backend brief to verify `deleteFood` for aggregator IDs; (b) Register CR-375 pending backend answer | **CR-375** + BACKEND BRIEF |
| MINOR: Category sidebar not wired to BulkEditor | FE_MISSING_FEATURE | Sub-item of CR-374 | (absorbed) |

### Planning skip eligibility:
- **CR-374:** NOT ELIGIBLE — ~30–50 lines, new state (filterStatus, filterType, filterCategory), filter logic in `groupedRows`, filter UI chips. Needs Gate 2–3.
- **CR-375:** NOT ELIGIBLE — depends on backend investigation first.

---

## 7. Retroactive Candidates

None found. All related registry items (CR-159 bulk delete, CR-036 BulkEditor UX) are correctly registered and closed.

---

*Investigation complete. 7/10 steps used. Confidence: HIGH on all 3 gaps. Next: Register CR-374 + CR-375 + Backend Brief per owner decision.*
