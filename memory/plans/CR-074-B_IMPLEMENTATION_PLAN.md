# CR-074-B — Implementation Plan (Gate 3)

**Date:** 2026-07-17
**Role:** PLANNING
**Gate:** 3 (Implementation Plan)
**Sprint:** POS 5.0
**Alpha version:** v0.8
**Preceding docs:**
- Impact Analysis: `/app/memory/impact/CR-074-B_IMPACT_ANALYSIS.md` (CLOSED — 0 open questions)
- Design blueprint + mockups: `/app/design_guidelines.json`, `/app/memory/design/CR-074-B_mockups/*.html` (final revision, 6 files)
- Curl verification: `/app/memory/evidence/BATCH_A/CR-064_CURL_VERIFY_FINDINGS.md`
- Backend briefs: `BACKEND_BRIEF_BUG201_*.md` (cascade rules), `BACKEND_BRIEF_BUG202_*.md` (item update endpoint + §3.4 optional inline unit_price)

---

## 0. Preconditions — all satisfied (2026-07-17)

| Precondition | Status |
|---|---|
| Impact Analysis (Gate 2) closed | ✅ |
| Owner rulings locked (Q-CR064-1/2/3, plus prior B-1..B-8) | ✅ |
| Design mockups final (6 files) with owner corrections applied | ✅ |
| Backend contracts curl-verified for CR-064 | ✅ (two-call sequence works; cascade confirmed) |
| Registry aligned (CR-074-B expanded scope, absorbed CR-064 + BUG-162 + BUG-202 fwd-compat, superseded 5 items) | ✅ |
| Ship-now Batch A already implemented + QA-passed | ✅ (Phase 4 closeout may or may not have run first; independent of this plan) |
| Alpha R25 relevance | ✅ Reviewed — Phase 3 forward-compat wraps `PUT` (not `POST`) for update path |

---

## 1. Scope-Lock

### What ships in this plan
1. **CR-074-B core** — visual + interaction refresh of Expense Setup panel matching Menu Management pattern.
2. **CR-064** — unit-price input on the quick-add row; two-call sequence (`create item → set price`); graceful mid-sequence error handling.
3. **BUG-162** — kill the panel-wide flicker by replacing `fetchAll()` after every mutation with optimistic local state updates + rollback on error.
4. **BUG-202 forward-compat** — inline row Edit Item UI (rename + category change) behind a feature flag `EXPENSE_INLINE_EDIT_ENABLED` (default false). Service wrapper `updateExpenseItem(id, {title, category_id})` stubbed against the pending `PUT /expense/stock-items/{id}` endpoint. **UI ships hidden**; flips to visible when backend delivers per BACKEND_BRIEF_BUG202.
5. **Bulk-select delete** — checkbox column + selection banner with `[Delete Selected]` + `[Clear]`. Bulk `[Move to Category]` explicitly DEFERRED per Q-CR064-2 with a small "coming soon" note as designed.
6. **DnD affordance visibility** — GripVertical icon on hover (Menu-Mgmt CategoryList pattern), drop-target hover styling on category rows.
7. **ExpenseBulkEditor redesign** — status column with save-state icons (+/spinner/check/alert), category grouping with sticky sub-headers, per-cell dirty highlighting, per-row Undo/Reset (`RotateCcw`), full-row background tint by state, footer bar (dirty count + Reset All + Save), checkbox column + selection banner (Delete + Clear only).
8. **Testids** — all 22 existing preserved, 12 new introduced per design blueprint.

### What is explicitly NOT in this plan
- **Bulk Move to Category** action — deferred per Q-CR064-2. `bulk-move-deferred-note` shown instead.
- **Inline Edit as user-visible feature** — hidden behind flag until BUG-202 backend delivery.
- **`ExpenseEntryPanel.jsx`** — separate concern (transaction entry), out of CR-074-B scope.
- **`ExpenseReportPage.jsx`** — Insights untouched per prior owner ruling (Narrow scope).
- **`MenuManagementPanel.jsx` and menu/*.jsx** — reference only, do not modify.
- **`utils/reportExporter.js`** — shared across other modules, do not touch.
- **Splitting ExpenseSetupPanel into subcomponents (CategoryList.jsx + ItemList.jsx)** — design agent recommended this refactor; leaving it as Phase 6 OPTIONAL / follow-up cleanup (see §7 Deferred).

### Files that WILL change

| File | Phase | Purpose |
|---|---|---|
| `src/components/expense/ExpenseSetupPanel.jsx` | 1, 2, 3, 4 | Flicker fix; quick-add unit price; DnD affordance; checkbox selection banner; inline-edit UI (flagged) |
| `src/components/expense/ExpenseBulkEditor.jsx` | 5 | Full redesign matching mockup 03 |
| `src/api/services/expenseService.js` | 2, 3 | +`addUnitPrice`-on-create wrapper (or reuse); +`updateExpenseItem` stub for BUG-202 |
| `src/api/constants.js` | 3 | +`STOCK_ITEM_UPDATE` endpoint constant |
| `src/api/transforms/expenseTransform.js` | 3 | +`fromAPI.updatedItem` transform for `PUT` response |
| `src/constants.js` | 3 | +`FEATURES.EXPENSE_INLINE_EDIT_ENABLED = false` (or environment-derived flag) |

**No new files** (subcomponent split deferred).

---

## 2. Phase-by-Phase Execution Plan

Each phase ends with a smoke-test ask so the owner can validate incrementally.

---

### 🟢 Phase 1 — BUG-162 Kill the Flicker (isolated, low risk)

**Goal:** replace `fetchAll()` after every mutation with optimistic local state updates.

**File:** `src/components/expense/ExpenseSetupPanel.jsx`

**Changes:**
1. Category CRUD (`addCategory`, `renameCategory`, `deleteCategory`) — remove trailing `fetchAll()` calls; instead:
   - `addCategory`: push new category into local `categories` state with returned `id`; on error, revert via `fetchAll()`.
   - `renameCategory`: update local state directly with new name; revert on error.
   - `deleteCategory`: filter local `categories` + `allItems` (items whose `categoryId` matched are moved to "uncategorized" in local state to match backend behavior); revert on error.
2. Item CRUD (`addItem`, `deleteItem`, `handleDragEnd` cross-category move) — same pattern. Optimistic local update; refetch only on error.
3. Add a per-row loading indicator (`Loader2` on trailing side) shown during in-flight API calls. Testid: `item-row-loading-{id}` / `category-row-loading-{id}`.
4. Keep the initial `fetchAll()` on mount unchanged. Keep the explicit `setup-refresh-btn` handler as an explicit user refresh.

**Data-testid additions:** `item-row-loading-{id}`, `category-row-loading-{id}`

**Smoke test after Phase 1:**
```
1. Open Expense Setup → Stock Master.
2. Add a new category "SMOKE_P1_cat" → observe: NO panel-wide flicker; the new category appears smoothly.
3. Rename it inline → NO flicker.
4. Add an item under it → NO flicker.
5. Delete the item → NO flicker.
6. Delete the category → NO flicker.
7. Click the refresh button (top-right refresh icon) → this SHOULD show the panel-wide loading state (explicit user refresh).
```

**Rollback trigger:** if any mutation shows stale data after 5s that a manual refresh corrects, revert Phase 1 and re-plan the optimistic pattern per-mutation.

---

### 🟢 Phase 2 — CR-064 Unit Price on Quick-Add + DnD Affordance

**Goal:** enhance Stock Master view per Mockup 01: unit-price input in the quick-add row; visible drag handles on hover; drop-target hover state on category rows.

**File:** `src/components/expense/ExpenseSetupPanel.jsx`

**Changes:**
1. Quick-add row (currently `new-item-input` + `new-item-save`):
   - Add a `[Unit Price]` numeric input between the item-name input and the Add button. Testid: `new-item-price-input`. Placeholder: `"$0.00"`.
   - Add: on save, if price is provided (numeric > 0), execute two-call sequence:
     1. `createCategoryWithItems(cat.name, [itemName])` → get new item id from response
     2. `addUnitPrice(newId, 1, priceValue)` → set price
   - Mid-sequence error handling: if step 1 succeeds but step 2 fails, show toast `"Item created but price could not be saved. Set the price in the Unit Prices tab."` and do NOT rollback the item.
   - Local state update follows the Phase 1 optimistic pattern (item + price appear immediately in the row).
2. DnD grip icon per item row (leftmost cell):
   - Replace the current invisible span drag handle with `<i data-lucide="grip-vertical">` at `opacity-30 group-hover:opacity-100 transition-opacity cursor-grab`. Color `#6B7280`.
   - Testid: `item-drag-handle-{id}`.
   - Mirror the `menu/CategoryList.jsx` pattern (already vetted with the owner: "same as menu management").
3. Category-row drop-target hover state (already in code, needs styling polish):
   - Preserve current `snapshot.isDraggingOver` → apply the mockup's orange outline + tinted bg + small "Drop here" text below.
4. "All Items" pseudo-category — add a `<i data-lucide="list">` icon prefix to visually distinguish it from real drop-target categories (mockup 01 pattern).

**Smoke test after Phase 2:**
```
1. Open Expense Setup → Stock Master.
2. Type "SMOKE_P2_item" in item name, "12.50" in unit price, "grocery" category, click Add.
   → Item appears in the list with $12.50 chip.
3. Switch to Unit Prices tab → SMOKE_P2_item shows in Priced Items with $12.50.
4. Delete the item (from Stock Master trash) → item + price both gone.
5. Hover an item row → verify the vertical grip icon appears on the left.
6. Drag an item from one category and drop into another → verify the drop target highlights orange with "Drop here" text.
```

---

### 🟡 Phase 3 — BUG-202 Forward-Compat Inline Edit UI (behind flag)

**Goal:** ship the inline row Edit UI matching Mockup 02, wire the service call, but keep it hidden by default until backend delivers.

**Files:**
- `src/components/expense/ExpenseSetupPanel.jsx` — Edit button + edit-mode row rendering
- `src/api/services/expenseService.js` — `updateExpenseItem(id, {title, category_id})` wrapper (uses `PUT` per R25)
- `src/api/constants.js` — `STOCK_ITEM_UPDATE: '/api/v2/vendoremployee/expense/stock-items'`
- `src/api/transforms/expenseTransform.js` — `fromAPI.updatedItem` optional (echo verification)
- `src/constants.js` — export `FEATURES.EXPENSE_INLINE_EDIT_ENABLED = false` (feature flag)

**Changes:**
1. Add feature flag import + gate: `import { FEATURES } from '../../constants';` and render the edit UI only when `FEATURES.EXPENSE_INLINE_EDIT_ENABLED === true`.
2. Per item row: add `[Pencil]` icon action (visible on hover, before trash) when flag is on. Testid: `item-edit-btn-{id}`.
3. Edit mode: when `editingId === item.id`:
   - Name cell → text input, `data-testid="item-edit-name-input-{id}"`
   - Category cell → `<select>` populated from categories, `data-testid="item-edit-cat-select-{id}"`
   - Actions cell → [✓ Save] `data-testid="item-edit-save-btn-{id}"` + [✕ Cancel] `data-testid="item-edit-cancel-btn-{id}"`
4. Save handler:
   - Optimistic local update (rename + category re-bucketing)
   - Call `expenseService.updateExpenseItem(id, {title, category_id})`
   - On 404 → toast "Item not found; refreshing..." + `fetchAll()`
   - On 409 (duplicate name in target category) → parse error, show inline row error message, revert local change
   - On 422 → show validation errors inline
   - On 200 → keep the optimistic state, no refetch
5. Duplicate-name guard: pre-flight check within the target category BEFORE calling API (avoids round-trip for obvious conflicts).

**Ship state:** flag defaults to `false`. Edit button + edit-mode UI is present in DOM only when flag is true (short-circuit render). No user-visible change on this phase alone.

**Smoke test after Phase 3:**
```
1. Open Expense Setup → verify NO pencil-edit icon appears on hover (flag off — expected).
2. Open DevTools console: run `window.__FEATURES = { EXPENSE_INLINE_EDIT_ENABLED: true }` (or similar override).
   ⚠ NOTE: this requires a small test-only override hook — for smoke test only, main use is via env var later.
3. Toggle the flag → refresh → hover a row → pencil icon appears.
4. Click pencil → row switches to edit mode (name input + category dropdown + save/cancel).
5. Try save → expect network error (backend endpoint 302s currently) → error displayed inline, row reverts.
   (This is expected behavior until backend delivers.)
6. Toggle flag off → smoke test complete.
```

**Note to main agent for implementation:** since we don't have runtime-toggleable flags today, the simplest way is a hardcoded `false` in `src/constants.js` with a code marker `// BUG-202 fwd-compat: flip to true when backend delivers PUT /expense/stock-items/{id}`. Owner will flip it manually when unblock arrives.

---

### 🟡 Phase 4 — Bulk-Select Delete + Selection Banner

**Goal:** implement Mockup 06 — checkbox column + selection banner with Delete Selected + Clear + deferred-note.

**File:** `src/components/expense/ExpenseSetupPanel.jsx`

**Changes:**
1. Add local state: `const [selectedIds, setSelectedIds] = useState(new Set());`
2. Add checkbox column to items table:
   - Header: master checkbox. When clicked, if any row selected → clear; else → select all filtered items. Testid: `bulk-select-all`.
   - Rows: per-item checkbox. Testid: `bulk-select-row-{id}`.
3. Selection banner (rendered above items table, below search):
   - Visible only when `selectedIds.size > 0`
   - Layout matches Mockup 06: red bg `rgba(239, 68, 68, 0.10)` + red 4px left border, `{N} items selected` bold red, `[Delete Selected]` red button (testid `bulk-delete-selected-btn`), `[Clear]` gray button (testid `bulk-clear-selection-btn`)
   - Below banner: right-aligned italic gray note "Bulk Move-to-Category is coming soon (backend delivery pending)." (testid `bulk-move-deferred-note`)
4. `[Delete Selected]` handler:
   - Open a batch-delete confirmation modal reusing the current delete-item modal wording:
     > *"Delete N items? Each may have linked expense transactions. Deleting will permanently remove the items and all related expense records. This cannot be undone."*
   - `[Cancel]` / `[Delete N Items]` (red)
   - On confirm: call `expenseService.deleteExpenseItem(id)` for each in parallel (up to 3 concurrent), track failures per-item, show partial-success toast if any failed. Optimistic local removal for successes; revert failures.
   - On success: clear selection.
5. `[Clear]` handler: `setSelectedIds(new Set())`.
6. DnD interaction while selection active: disable draggable prop when `selectedIds.size > 0` (add visual dim on grip icons via a `data-selection-active` state class). Mockup 06 shows opacity-15 on grip icons in this state.

**Data-testid additions:** `bulk-select-all`, `bulk-select-row-{id}`, `bulk-delete-selected-btn`, `bulk-clear-selection-btn`, `bulk-move-deferred-note`, `bulk-delete-confirm`, `bulk-delete-confirm-btn`

**Smoke test after Phase 4:**
```
1. Open Expense Setup → check 3 items.
2. Red selection banner appears with "3 items selected" + [Delete Selected] + [Clear].
3. Below banner: "Bulk Move-to-Category is coming soon (backend delivery pending)." (small gray italic).
4. Click Clear → selection cleared, banner disappears.
5. Check 2 items → click [Delete Selected] → confirmation modal appears with the "Delete 2 items?" wording.
6. Cancel → items stay.
7. Confirm → items animate out; toast "2 items deleted" appears.
8. During checkbox mode, verify drag grip icons are visibly dimmed (DnD disabled).
```

---

### 🟠 Phase 5 — ExpenseBulkEditor Full Redesign (Mockup 03)

**Goal:** rework the Bulk Editor to match Menu Management BulkEditor pattern (per Mockup 03).

**File:** `src/components/expense/ExpenseBulkEditor.jsx`

**Changes:**
1. **Toolbar:** add `Table2` icon + "Bulk Editor" title + item-count chip on the left; keep Search + Add Item (green) + Save Changes (dynamic label "Save N Changes" when dirty, "No Changes" grey when clean) + Close (X) on the right. NO import/export (already removed by CR-074-A).
2. **Selection banner** (same pattern as Phase 4): visible when any checkbox checked. Delete Selected + Clear + deferred note.
3. **`#` column** (leftmost data column, after checkbox column):
   - Width `w-10`.
   - Content:
     - `+` icon (green) for new unsaved rows
     - Row number (gray) for clean rows
     - `Loader2` spinner for saving state
     - Green `Check` for just-saved
     - Red `AlertCircle` (with tooltip showing `_saveError`) for error rows
   - Testid: `row-status-{id}`
4. **Checkbox column** (leftmost): master + per-row (same pattern as Phase 4). Testids: `bulk-select-all`, `bulk-select-row-{id}`.
5. **Sortable headers:** click any column header to sort ASC/DESC with `ArrowUpDown` icon. Active-sort column shows orange icon variant.
6. **Category grouping:** rows visually grouped by category with sticky sub-header row (light gray band with orange 4px left accent bar + category name + count pill).
7. **Row background tint by state:**
   - Red bg + red left border → validation error
   - Amber bg → dirty
   - Green bg → new or just-saved
   - White → clean (hover:bg-gray-50)
8. **Per-cell dirty highlighting:** individual edited cell gets darker amber bg (`bg-amber-100/60`).
9. **Per-row Undo/Reset button** in Actions column:
   - `RotateCcw` for dirty existing rows (undoes changes to `_original` snapshot). Testid: `row-undo-{id}`
   - `Trash2` (red) for new unsaved rows (removes the row from the grid). Testid: `row-delete-{id}` (same testid works for both; new-row delete vs existing-row delete via context)
10. **Per-row Delete** for clean/saved existing rows: `Trash2` icon on hover. Testid: `row-delete-{id}`. Uses same delete-item-modal flow as Phase 4.
11. **Footer bar** (renders when `dirtyCount > 0`):
    - Gradient bg `linear-gradient(to right, #FFF7ED, #FFFFFF)`, 1px top border.
    - Left: "N items modified" (N bold orange).
    - Right: `[Reset All]` (testid `footer-reset-all-btn`) + `[Save N Changes]` orange (testid `footer-save-btn`).
12. **Preserve** the existing OQ-1 rename-block and OQ-2 category-move-block guards (from `ExpenseBulkEditor.jsx:174-190`) until BUG-202 delivers. These continue to protect priced items from unintended price loss.

**Smoke test after Phase 5:**
```
1. Open Expense Setup → click Bulk Edit.
2. Verify toolbar: [Table2] Bulk Editor · 34 items | Search | Add Item (green) | Save 0 Changes (grey) | X close
3. Row 1 clean → hover shows delete icon.
4. Edit row 1's category (leaving unit_price unset) → row bg turns amber; save-changes label changes to "Save 1 Changes" (orange); footer bar appears at bottom.
5. Click Undo (RotateCcw) on that row → row reverts to clean.
6. Add a new item via [Add Item] → new row appears at top with `+` in # column, green bg. Trash icon on undo slot (removes the new row).
7. Enter validation-invalid data (e.g., blank name) → row goes red bg + red left border + AlertCircle in # column.
8. Check 2 rows → red selection banner with "2 items selected" + [Delete Selected] + [Clear] + deferred note.
9. Delete Selected → confirmation modal → confirm → rows removed.
10. Attempt to move a priced item's category → blocked with the existing OQ-2 error message (this stays until BUG-202 lands).
```

---

### 🔵 Phase 6 — Closeout

**No user-visible changes.** Admin-only work.

**Actions:**
1. Update `registry.json`: CR-074 → `-B: IMPLEMENTED — awaits BUG-202 to fully unlock inline edit`.
2. Update `CR_REGISTRY.md` CR-074 row.
3. Update `BUG_TRACKER.md`: BUG-162 → IMPLEMENTED (bundled), CR-064 → IMPLEMENTED (bundled).
4. Update `FILE_OWNERSHIP.md`: add 6 modified files under `CR-074-B` heading.
5. Verify all code markers present: `// CR-074-B`, `// CR-064`, `// BUG-162`, `// BUG-202-fwd-compat`.
6. Call `testing_agent_v3` with:
   - The 6-mockup design as visual reference
   - Feature flag on for testing all UI paths
   - Regression: BUG-175/176/177/178/151 patterns still pass
   - CR-064 two-call sequence: including mid-sequence-failure recovery
   - Phase 4/5 bulk-delete cascade: confirms correct DELETE endpoint used per item
7. Write session handover doc: `/app/memory/handover/CR-074-B_IMPLEMENTATION_HANDOVER_2026_07_17.md`.

---

## 3. Verification Matrix (seeds QA regression)

| # | Check | Layer | Method | Automated? |
|---|---|---|---|---|
| V1 | Panel doesn't flicker on any mutation | UI | Playwright: add category → measure no full re-paint | Manual + optional |
| V2 | CR-064 two-call: happy path | UI | Add item with $ → verify item + price both persist | Manual |
| V3 | CR-064 two-call: step-B failure | Curl | Simulate `POST /stock-unit-price` failure; verify graceful toast; item persists sans price | Manual curl |
| V4 | DnD grip icon visible on hover | UI | Screenshot | Playwright |
| V5 | DnD drop-target styling active | UI | Simulate drag; screenshot mid-drop | Playwright |
| V6 | Bulk-select: N selected banner correct count | UI | Check 3 boxes → banner reads "3 items selected" | Playwright |
| V7 | Bulk delete confirms + succeeds + updates state | UI | 2-item bulk delete → modal → confirm → rows gone | Playwright |
| V8 | Deferred note visible in selection banner | UI/DOM | grep for "coming soon" text | Playwright |
| V9 | Inline edit UI hidden by default | UI | No pencil icon visible on rows (flag off) | Playwright |
| V10 | Inline edit UI shows when flag on | UI | Manual flag toggle; pencil appears | Manual |
| V11 | BulkEditor `#` column shows correct status icon | UI | Edit row → # shows number, save → shows loader → shows check | Playwright |
| V12 | BulkEditor category grouping visible | UI | Sub-header rows present with category name + count pill | Playwright |
| V13 | BulkEditor footer bar visible only when dirty | UI | Clean state = no footer; edit 1 row = footer with "1 items modified" | Playwright |
| V14 | OQ-1 rename block still active | UI | Try to rename existing item in bulk editor → "Rename not available — backend support pending" | Playwright |
| V15 | OQ-2 priced-item category-move block still active | UI | Try to move priced item to different category in bulk editor → "Cannot move — unit price is set." | Playwright |
| V16 | Regression: existing BUG-175/176/177/178/151 flows unchanged | UI | Adjacent QA sweep | testing_agent_v3 |
| V17 | Data-testids preserved | grep | 22 existing testids grep-verified present | Automated |
| V18 | New data-testids added | grep | 12 new testids grep-verified present | Automated |
| V19 | No `fetchAll()` after non-error mutations | grep | Scan for `fetchAll()` calls; verify only in error paths + initial mount + explicit refresh button | Automated |
| V20 | Curl regression: no unintended change to existing API contracts | Backend | Batch A curl smoke suite re-run | Manual curl |

---

## 4. Execution Sequence

```
Phase 1 (BUG-162 flicker fix)
  ↓
Owner smoke → Approve
  ↓
Phase 2 (CR-064 quick-add unit price + DnD grip + drop styling)
  ↓
Owner smoke → Approve
  ↓
Phase 3 (BUG-202 forward-compat inline edit, flag off)
  ↓
Owner smoke → Approve (flag toggle test)
  ↓
Phase 4 (Bulk-select delete + banner)
  ↓
Owner smoke → Approve
  ↓
Phase 5 (BulkEditor full redesign)
  ↓
Owner smoke → Approve
  ↓
Phase 6 (Closeout — testing_agent + registry sync + handover doc)
```

**Total estimated effort:** 5 code phases + 1 closeout. Roughly one working day of code + smoke cycles.

**Alternative packaging:** if owner prefers a single smoke session at the end (like Batch A ship-now), Phases 1-5 can be executed back-to-back with a single combined smoke at the end. This trades incremental confidence for speed.

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 1 optimistic-update misses an edge case (race, backend rejection) | MEDIUM | Stale UI until manual refresh | Keep `fetchAll()` as error-path fallback; add refresh button always accessible; per-row loading indicators |
| CR-064 mid-sequence failure produces orphan item | LOW-MED | User sees an item without price; recoverable in Unit Prices tab | Explicit toast on step-B failure; no auto-rollback of step-A (deleting the item would be worse UX) |
| BUG-202 backend doesn't deliver → inline-edit code stays dead | LOW (backend brief filed) | Dead code + tests behind flag; minor tech debt | Flag defaults to false; code marker in constants; behind-flag components can be no-op'd cleanly |
| Phase 5 BulkEditor rework breaks OQ-1/OQ-2 restrictions | MEDIUM | Users lose data (priced items destroyed on move) | Verification #14 and #15 gate this explicitly; keep the exact restriction messages until BUG-202 lands |
| Selection state persists across search/filter → invisible-selected items | MEDIUM | User deletes rows they can't see | Add "N selected (X not visible in current filter)" hint in banner when applicable; or auto-clear filter on delete confirm |
| Sortable headers + drag-and-drop interaction confusion | LOW | UX confusion | Sortable headers only in bulk editor grid; DnD only in main list view — different components, no overlap |
| Feature flag pattern doesn't exist in codebase | LOW | New pattern to introduce | Simple boolean export from `src/constants.js`, one import per consumer; safe pattern |
| Registry contamination with cross-phase changes causing bad regressions | LOW | Rollback ambiguity | Each phase is a clean commit with a code marker; per-phase git log makes rollback surgical |

---

## 6. Post-Code Registry Checklist (R17)

```
- [ ] registry.json: CR-074 → -B IMPLEMENTED — awaits BUG-202 to fully unlock inline edit
- [ ] registry.json: CR-064 → IMPLEMENTED (bundled into CR-074-B, delivered as quick-add unit-price)
- [ ] registry.json: BUG-162 → IMPLEMENTED (bundled into CR-074-B, delivered as optimistic-update pattern)
- [ ] BUG_TRACKER.md: BUG-162 + CR-064 status rows added under 2026-07-17 section
- [ ] CR_REGISTRY.md: CR-074-B row status flipped
- [ ] FILE_OWNERSHIP.md: 6 modified files listed under CR-074-B heading
- [ ] Code markers present in every modified file:
    - ExpenseSetupPanel.jsx       → // CR-074-B, // CR-064, // BUG-162, // BUG-202-fwd-compat
    - ExpenseBulkEditor.jsx       → // CR-074-B
    - expenseService.js           → // BUG-202-fwd-compat (updateExpenseItem stub)
    - constants.js (api)          → // BUG-202-fwd-compat (STOCK_ITEM_UPDATE)
    - expenseTransform.js         → // BUG-202-fwd-compat (updatedItem)
    - constants.js (app)          → // BUG-202-fwd-compat (feature flag)
- [ ] Verification Matrix: 20 checks executed
- [ ] testing_agent_v3 called with regression scope + feature-flag test
- [ ] Session handover written
```

---

## 7. Deferred / Follow-up (not in this plan)

- **Subcomponent split:** design agent recommended splitting `ExpenseSetupPanel.jsx` (944 lines) into `CategoryList.jsx` + `ItemList.jsx`. Deferred to a cleanup CR after CR-074-B ships and BUG-202 unlocks inline edit.
- **BUG-202 backend delivery:** flag flip + OQ-1/OQ-2 restriction removal + full inline edit user-visibility. Separate mini-plan.
- **`[Move to Category ▼]` bulk action:** wait for BUG-202. Add to Phase 4/5 banners as `[Move to Category ▼]` next to `[Delete Selected]` (design blueprint already reserves the slot conceptually).
- **BACKEND_BRIEF_BUG202 §3.4 (optional inline unit_price on POST /store_expense):** if backend delivers, the CR-064 quick-add can be simplified from 2 calls to 1. Zero-cost optimization when it lands.

---

## 8. Handover to Owner (→ Gate 4)

```
Plan ready at /app/memory/plans/CR-074-B_IMPLEMENTATION_PLAN.md.
5 code phases + 1 closeout across 6 files.
6 mockups (final revision, owner-approved) drive the visuals.
Verification matrix: 20 checks (7 automated grep/curl, 13 UI).
Scope-lock: 6 files WILL change / hotspots + ExpenseEntryPanel + ExpenseReportPage + Menu Mgmt untouched.
Feature-flag pattern isolates BUG-202-dependent UI.
Owner decisions needed: NONE — all blockers resolved 2026-07-17.
Awaiting Gate 4 GO.
```
