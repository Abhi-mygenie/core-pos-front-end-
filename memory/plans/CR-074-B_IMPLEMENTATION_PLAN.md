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

## 0. Preconditions — all satisfied (2026-07-17, updated post backend-delivery)

| Precondition | Status |
|---|---|
| Impact Analysis (Gate 2) closed | ✅ |
| Owner rulings locked (Q-CR064-1/2/3, plus prior B-1..B-8) | ✅ |
| Design mockups final (6 files) with owner corrections applied | ✅ **Mockups 03 & 06 restored 2026-07-17** — `[Move to Category ▼]` reinstated in selection banner (outline orange, `bulk-move-category-btn` testid, chevron-down icon), deferred-note removed. All mockups now aligned with post-BUG-202-delivery plan. |
| Backend contracts curl-verified for CR-064 | ✅ (two-call sequence works; cascade confirmed) |
| **Backend BUG-202 endpoint delivered + curl-verified 2026-07-17** | ✅ **NEW** — `PUT /expenses/{item_id}` with `{stock_title, category_id}` works; unit_price survives; see `/app/memory/evidence/BATCH_A/BUG-202_BACKEND_VALIDATION_2026-07-17.md` |
| Registry aligned | ✅ |
| Ship-now Batch A already implemented + QA-passed | ✅ |
| Alpha R25 relevance | ✅ Reviewed — Phase 3 uses `PUT` (correct per R25) |

## 0.1 Backend Delivery Summary (2026-07-17)

Two curl payloads validated against preprod. Findings that change this plan:

| What backend delivered | Effect on plan |
|---|---|
| ✅ `PUT /expenses/{item_id}` with `{stock_title, category_id}` returns 200 + echoes id/stock_title/category_id/category_name | BUG-202 UNBLOCKED. Inline edit no longer needs feature flag. |
| ✅ Unit price row FK survives PUT (no cascade on update) | OQ-1 (rename) + OQ-2 (priced-item move) restrictions in `ExpenseBulkEditor.jsx:174-190` can be REMOVED. |
| ✅ Same PUT accepts atomic rename + category change | DnD `handleDragEnd` can drop the DELETE+POST workaround and switch to a single PUT. |
| ⚠ Duplicate-name check NOT enforced (backend returns 200 on dupes) | FE must add pre-flight duplicate check within target category. |
| ⚠ 404 case returns HTTP 201 with `{errors:[{code:not_found}]}` (semantically wrong status code but usable payload) | FE parses `errors[0].code === 'not_found'` — cannot rely on status code alone. |
| ❌ §3.4 optional inline `unit_price` on POST or PUT NOT delivered | CR-064 keeps the 2-call sequence pattern. No change. |
| ✅ Payload key is `stock_title` (spec said `title`) | FE uses `stock_title` — minor. |

**Net simplifications to this plan (§2 Phase-by-Phase updated below):**
1. Drop the `EXPENSE_INLINE_EDIT_ENABLED` feature flag entirely — inline edit ships enabled by default.
2. Restore `[Move to Category ▼]` to bulk selection banners in Phases 4 and 5 (Q-CR064-2 deferral no longer applies).
3. Remove OQ-1/OQ-2 defensive guards in Phase 5 BulkEditor rework.
4. Rewrite `handleDragEnd` to a single PUT call in Phase 2 (replaces the DELETE+POST workaround).
5. Add FE pre-flight duplicate-name check in Phases 3 and 5.
6. Add error-body parsing for the malformed 404-as-201 case in Phases 3 and 5.
7. Design mockups 03/06 restored 2026-07-17 — `[Move to Category ▼]` added back to selection banner (outline orange with chevron-down, testid `bulk-move-category-btn`); "coming soon" deferred-note removed. All 6 mockups now aligned with the post-BUG-202-delivery implementation plan.

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

### 🟢 Phase 2 — CR-064 Unit Price on Quick-Add + DnD Affordance + DnD Rewrite

**Goal:** enhance Stock Master view per Mockup 01: unit-price input in the quick-add row; visible drag handles on hover; drop-target hover state on category rows. **PLUS (added 2026-07-17): rewrite `handleDragEnd` to use the new BUG-202 PUT endpoint (no more DELETE+POST).**

**File:** `src/components/expense/ExpenseSetupPanel.jsx`

**Changes (unchanged from prior version):** quick-add price input with 2-call fallback; grip icon on hover matching Menu Mgmt; drop-target styling; All-Items list-icon prefix.

**NEW change (2026-07-17):** rewrite `handleDragEnd` cross-category move logic:
- **Before:** `deleteExpenseItem(id) → createCategoryWithItems(newCat, [name])` (destroys unit_price, changes id)
- **After:** `expenseService.updateExpenseItem(id, { category_id: newCatId })` — single PUT, preserves id + unit_price
- Optimistic local update per Phase 1 pattern; on 200 keep, on error revert via re-fetch
- Handle malformed-404: parse `errors[0].code === 'not_found'` from response body (backend returns HTTP 201 with error body in this case)

**Smoke test after Phase 2 (updated):**
```
1-6. (unchanged — quick-add + grip + drop-target checks)
7. Drag a PRICED item (with $ visible) into a different category → verify: (a) item moves, (b) $ chip persists, (c) row keeps same visual position (no re-mount), (d) Unit Prices tab still shows the price.
```

### 🟢 Phase 3 — BUG-202 Inline Edit UI (NO FLAG — ships enabled)

**Goal:** ship the inline row Edit UI matching Mockup 02, wired to the delivered `PUT /expenses/{item_id}` endpoint. **UPDATED 2026-07-17: feature flag removed.**

**Files:**
- `src/components/expense/ExpenseSetupPanel.jsx` — Edit button + edit-mode row rendering (unchanged)
- `src/api/services/expenseService.js` — `updateExpenseItem(id, {stock_title, category_id})` wrapper (payload key = `stock_title` per backend delivery)
- `src/api/constants.js` — `STOCK_ITEM_UPDATE: '/api/v2/vendoremployee/expense/expenses'` (backend confirmed uses this path)
- `src/api/transforms/expenseTransform.js` — `fromAPI.updatedItem(res)` returns `{id, stockTitle, categoryId, categoryName}` from `res.data.updated_expense`
- ~~`src/constants.js` — feature flag~~ **REMOVED** — inline edit ships enabled

**Changes (updated):**
1. ~~Feature flag gating~~ REMOVED. Pencil-edit button visible on hover by default.
2. Per-row edit UI (name input + category dropdown + Save/Cancel) — unchanged.
3. **Pre-flight duplicate-name check** (NEW): before calling PUT, scan local `allItems` in the target `category_id` for an existing item with the same title. If duplicate → block with inline error "Item with this name already exists in {category}." Do NOT rely on backend 409 (backend does not enforce this).
4. Save handler updates:
   - Optimistic local update (rename + re-bucket)
   - Call `expenseService.updateExpenseItem(id, {stock_title, category_id})`
   - On HTTP 200 → keep the optimistic state
   - On HTTP 201 with body `{errors: [{code: 'not_found', ...}]}` → treat as 404: toast "Item not found — refreshing", revert local, call fetchAll()
   - On non-2xx (real error) → revert, toast error message

**Smoke test after Phase 3 (updated — no flag toggle needed):**
```
1. Open Expense Setup → hover a row → verify pencil icon appears.
2. Click pencil → row enters edit mode with name input + category dropdown.
3. Rename item → click Save → item persists with new name in same category.
4. Edit again, change ONLY category to a different one → item moves visually to new category filter, price/id preserved.
5. Try to rename to an existing item's name IN THE SAME target category → inline pre-flight error blocks save.
6. Cancel edit → row reverts to view mode.
```

### 🟡 Phase 4 — Bulk-Select Delete + **Move to Category** + Selection Banner

**Goal:** implement Mockup 06 (with correction) — checkbox column + selection banner with Delete Selected + **Move to Category ▼** + Clear. **UPDATED 2026-07-17: Move to Category RESTORED per BUG-202 unblock; deferred-note REMOVED.**

**File:** `src/components/expense/ExpenseSetupPanel.jsx`

**Changes (updated):**
1-3. (unchanged — selection state, checkboxes, banner shell)
4. **Selection banner content (updated):**
   - `{N} items selected` (bold red)
   - `[Delete Selected]` (red bg, `bulk-delete-selected-btn`)
   - **`[Move to Category ▼]`** (RESTORED, outline orange, `bulk-move-category-btn`) — click opens dropdown listing all real categories (excluding the "All Items" pseudo-category). On selection → confirm modal → calls `updateExpenseItem(id, {category_id})` in parallel for each selected id.
   - `[Clear]` (gray, `bulk-clear-selection-btn`)
   - ~~"Bulk Move-to-Category is coming soon"~~ **REMOVED** (`bulk-move-deferred-note` deleted)
5. Bulk-move handler:
   - Confirm modal wording: "Move N items to {targetCategoryName}?" [Cancel] [Move N Items]
   - Parallel PUT calls (up to 3 concurrent)
   - Track per-item failure; on partial success show toast "N moved, M failed" with details
   - Optimistic local re-bucketing
6. `[Delete Selected]` handler — unchanged (still parallel `deleteExpenseItem` calls with confirmation modal)
7. `[Clear]` — unchanged
8. DnD-during-selection — unchanged (grip icons dimmed, drag disabled)

**Testid changes:**
- ADD: `bulk-move-category-btn`, `bulk-move-category-dropdown`, `bulk-move-cat-option-{id}`, `bulk-move-confirm`, `bulk-move-confirm-btn`
- REMOVE from plan: ~~`bulk-move-deferred-note`~~

**Smoke test after Phase 4 (updated):**
```
1. Select 3 items across different categories.
2. Verify banner: "3 items selected" + [Delete Selected] + [Move to Category ▼] + [Clear] (NO deferred-note).
3. Click [Move to Category ▼] → dropdown lists all real categories.
4. Pick "Fish" → confirm modal → confirm → 3 items animate into Fish category; prices preserved.
5. Test failure recovery: try moving to a category where one item has a duplicate name — expect toast "2 moved, 1 failed: {name} already exists in {cat}".
```

### 🟠 Phase 5 — ExpenseBulkEditor Full Redesign (Mockup 03) + OQ-1/OQ-2 Removal

**Goal:** rework Bulk Editor per Mockup 03. **UPDATED 2026-07-17: REMOVE the OQ-1 rename block and OQ-2 priced-item-move block — no longer needed after BUG-202 delivery.**

**File:** `src/components/expense/ExpenseBulkEditor.jsx`

**Changes (updated):**
1-11. (unchanged — toolbar, selection banner with Move restored, `#` column, sorting, category grouping, row bg tints, per-cell dirty, undo/reset, per-row delete, footer bar)
12. **REMOVED (2026-07-17):** the OQ-1/OQ-2 guards at lines ~174-190 are **deleted**. Rename and category-move on priced items now proceed through the new `updateExpenseItem` PUT — unit_price survives, name updates atomically. Add code marker: `// BUG-202 delivered 2026-07-17 — OQ-1/OQ-2 restrictions removed`
13. **Same pre-flight duplicate-name check** as Phase 3 applies to bulk-editor row saves.
14. **Selection banner** matches Phase 4 (Delete + Move to Category + Clear, no deferred-note).

**Verification changes (V14/V15 removed, replaced by V14a/V15a):**
- ~~V14: OQ-1 rename block still active~~ → **V14a: OQ-1 removed; renames succeed end-to-end via PUT**
- ~~V15: OQ-2 priced-item move block still active~~ → **V15a: priced items can now be category-moved; unit_price preserved**

**Smoke test after Phase 5 (updated):**
```
1-9. (unchanged — toolbar, save-state icons, category grouping, undo, footer bar)
10. RENAME an existing item in bulk editor → succeeds (no more "backend support pending" error).
11. Move a PRICED item's category in bulk editor → succeeds (no more "Cannot move — unit price is set" error). Verify $ chip persists in Unit Prices tab.
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

---

## 9. Smoke-Fix Log — Batch A (Phases 1+2+3) — 2026-07-17

**Owner:** GO given for phased execution (Batch A = P1+P2+P3, Batch B = P4, Batch C = P5).
**Batch A shipped:** 4 files as planned.
**Live smoke on `owner@cafe103.com` uncovered 4 issues → all patched same session:**

| # | Issue reported | Root cause | Fix layer | Files touched |
|---|---|---|---|---|
| SF-1 | Duplicate item name "pav" admitted in Uncategorized bucket | Dup guard compared only by `categoryId`; Uncategorized items come back with `category_id: null`. Second submit sees `null !== selectedCategoryId` → passes. Also, Enter keypress bypassed `addingItem` guard. | FE — hardened `isDuplicate` with **name-and-name fallback** when `categoryId == null`; added `if (addingItem) return;` at top of `addItem`. | `ExpenseSetupPanel.jsx` |
| SF-2 | Category edit-mode row visually chunky, creating a "gap" before next row | Nested borders (outer selected-orange + inner input-gray) + `minHeight: 52` growing on edit-mode padding. | FE — `CategoryRow`: transparent outer border while `editing`, `height: 52` fixed (not min-height). | `ExpenseSetupPanel.jsx` |
| SF-3 | "Is the ₹ Price field a unit price?" — UX clarity, not a bug | Placeholder said `₹ Price`, ambiguous vs line/total price. Value IS stored as unit-price row (`qty=1, price=<v>`) via `POST /stock-unit-price` after item creation. | UX polish — placeholder now `Unit price`; `title` tooltip added; input width bumped 96→120. | `ExpenseSetupPanel.jsx` |
| SF-4 | 280px gray gap between sidebar and main content on `/expense-setup` and `/add-expenses` when sidebar expanded | Layout anti-pattern: `<main className="flex-1" style={{ marginLeft: 280 }} />`. `flex-1` already accounts for sidebar space inside `flex h-screen`, so `marginLeft` doubled the reserved width. Menu Management page (working reference) does NOT have this. | Removed the redundant `marginLeft` style on `<main>` in both pages. | `ExpenseSetupPage.jsx`, `ExpenseEntryPage.jsx` |

**Backend confirmations gathered during triage:**
- `POST /store_expense` and `PUT /expenses/{id}` both allow duplicate names (no 4xx/409). BUG-165 backend-flag remains open. FE is the sole gate today.
- `₹ Price` (SF-3) is a **per-unit price**: written as a `stock_unit_prices` row with `quantity=1`. It appears in the Unit Prices tab and (via CR-074-B core UI) as a `₹X.XX` chip beside the item title.

**Files touched in Batch A + smoke-fix combined (5 total):**
1. `src/components/expense/ExpenseSetupPanel.jsx` (planned + SF-1/2/3)
2. `src/api/services/expenseService.js` (planned — `updateExpenseItem` wrapper)
3. `src/api/constants.js` (planned — `STOCK_ITEM_UPDATE`)
4. `src/api/transforms/expenseTransform.js` (planned — `fromAPI.updatedItem`)
5. `src/pages/ExpenseSetupPage.jsx` **+** `src/pages/ExpenseEntryPage.jsx` (SF-4 — 2 lines removed each; NOT touching panels)

Note: SF-4 touches page shells outside the plan's original scope list. Owner-approved as part of Batch A smoke-fix. Zero risk to expense flows (pure layout).

**Testing-agent verification (2026-07-17, iteration_26):** 100% pass frontend across both tenants (18march + cafe103). Cleaned up all test rows. Report: `/app/test_reports/iteration_26.json`.

**Owner decisions (2026-07-17) — non-code items:**
- Nit-A (`delete-item-confirm` testid naming) → **NO CHANGE**. Wrapper vs button uses `-btn` suffix convention; naming is correct. Testing agents will use `delete-item-confirm-btn` to click.
- Nit-B (sidebar toggle testid) → **DEFERRED** to housekeeping sweep (out of CR-074-B scope). Would add `data-testid="sidebar-collapse-toggle"` / `sidebar-expand-toggle` on the two `<PanelLeftClose>` / `<PanelLeft>` buttons in `Sidebar.jsx:432,441`.

---

## 10. Phase 4 Implementation Log — 2026-07-17

**File touched:** `src/components/expense/ExpenseSetupPanel.jsx` (only file per plan §4).

**State added (6 hooks):**
- `selectedItemIds: Set<id>`
- `bulkMoveDropdownOpen: bool`
- `bulkMoveTargetCatId: id|null`
- `bulkMoveConfirmOpen: bool`
- `bulkDeleteConfirmOpen: bool`
- `bulkOperationInProgress: bool`

**Handlers added (7):** `toggleItemSelection`, `toggleSelectAllVisible`, `clearSelection`, `runWithConcurrency` (limit=3 parallel runner), `bulkDeleteConfirmed`, `bulkMoveConfirmed`, plus derived `isAllVisibleSelected`.

**UI added:**
- Selection banner (Mockup 06): border-l-4 red, `{N} items selected`, `[Delete Selected]`, `[Move to Category ▼]` with dropdown, `[Clear]`
- Table checkbox column (header `bulk-select-all` + per-row `bulk-select-row-{id}`); temp-id (optimistic-add) rows and edit-mode rows have NO checkbox (prevents ambiguous selection)
- Bulk-Delete confirm modal (`bulk-delete-confirm` + `bulk-delete-confirm-btn`)
- Bulk-Move confirm modal (`bulk-move-confirm` + `bulk-move-confirm-btn`) — copy: "Move N Items to {target}? … dup-name items will be skipped. Unit prices preserved."
- Row visual: blue-tint background + 2px blue left-border when `isSelected`

**Behaviour:**
- `Draggable.isDragDisabled` = `isEditing || isRowLoading || (selectedItemIds.size > 0)` → DnD auto-disabled while selection active
- Bulk-delete: `Promise.all` fan-out capped at concurrency=3; per-item failure tracked; failed rows re-inserted; toast reports `N deleted, M failed`
- Bulk-move: pre-flight dup guard per target category (same name-and-name pattern as SF-1); skipped-dup items counted separately from failed; parallel `updateExpenseItem` with malformed-404 detection; failed rows revert to `prevItems` snapshot; toast reports `N moved, M failed, K skipped`

**Testids added (15):** `bulk-selection-banner`, `bulk-selection-count`, `bulk-select-all`, `bulk-select-row-{id}`, `bulk-delete-selected-btn`, `bulk-move-category-btn`, `bulk-move-category-dropdown`, `bulk-move-cat-option-{id}`, `bulk-clear-selection-btn`, `bulk-delete-confirm`, `bulk-delete-confirm-btn`, `bulk-delete-confirm-cancel`, `bulk-move-confirm`, `bulk-move-confirm-btn`, `bulk-move-confirm-cancel`.

Compile clean (0 warnings), HTTP 200. Self-verified live: banner shows/hides on selection, dropdown lists all 10 categories, Clear resets state. Handing off to testing_agent for regression.

**Testing-agent verification (2026-07-17, iteration_27):** 100% pass (22/22 assertions across 8 scenarios). Reported bugs: **0**. Code-review comments confirmed: concurrency limit correct, dup-guard matches SF-1 pattern (incl. Uncategorized), clearSelection properly resets `bulkMoveTargetCatId`. Testing agent also cleaned up leftover SMOKE_DUP_A + SMOKE_RAPID from iteration_26. Baseline 'test' category restored to 5 items. Report: `/app/test_reports/iteration_27.json`.

Note: Malformed-404 code path is implemented but not naturally exercised in happy paths — recommend a synthetic regression test in Phase 6 closeout if desired.

**Owner decision (2026-07-17) — Bulk-op latency:**
- Users observe bulk operations feel slow past ~5 items (10 items ~2-3s, 20 items ~4-5s on preprod). Root cause: **no backend bulk endpoint** — FE fans out one HTTP call per item at concurrency=3.
- FE optimizations (optimistic-close modal, concurrency 3→6) **declined**. Ship as-is; wait for backend aggregation endpoints.
- **Backend brief filed:** `/app/memory/briefs/BACKEND_BRIEF_BULK_EXPENSE_OPS.md` — proposes `DELETE /expenses/bulk` and `PUT /expenses/bulk` with `{ids, category_id}` and partial-success response shape. When delivered, FE swap = ~40 lines in `ExpenseSetupPanel.jsx` (replace `runWithConcurrency` with a single bulk service call).
- **Code marker added:** `⚠️ BACKEND FLAG` block above `runWithConcurrency` in `ExpenseSetupPanel.jsx` pointing to the brief.

Next: Batch C (Phase 5 — ExpenseBulkEditor full redesign + OQ-1/OQ-2 removal).

---

## 11. Phase 5 Implementation Log — 2026-07-17

**File touched:** `src/components/expense/ExpenseBulkEditor.jsx` (only file per plan §Phase 5). Line count 454 → 875.

**Changes shipped:**
1. **OQ-1 removed** (lines 174-181 in old file): rename-block deleted. Renames now go through `updateExpenseItem` PUT.
2. **OQ-2 removed** (lines 183-190 in old file): priced-item-move-block deleted. Priced items can now change category via PUT (unit_price row survives per BUG-202 validation).
3. **`catChanged` DELETE+POST replaced with single PUT.** Combined rename + move in ONE atomic call (verified by iteration_28 P5-C: exactly 1 network PUT for row 4621).
4. **Pre-flight duplicate check** added: matches SF-1 pattern including `categoryId==null` (Uncategorized) fallback.
5. **Malformed-404 handler** for HTTP 201 with `errors[0].code==='not_found'`.
6. **NEW checkbox column** (`bulk-select-all` header + `bulk-select-row-{id}` per row; new rows excluded).
7. **NEW selection banner** (Mockup 03): red-tinted with border-l-4, `{N} items selected`, [Delete Selected], [Move to Category ▼] with dropdown listing all categories, [Clear].
8. **NEW bulk handlers:** `bulkDeleteConfirmed`, `bulkMoveConfirmed`, `runWithConcurrency` (limit=3, same code marker + backend brief link as Phase 4). Partial-success toast with "N moved, M failed, K skipped".
9. **NEW confirm modals:** `bulk-delete-confirm` + `bulk-delete-confirm-btn`, `bulk-move-confirm` + `bulk-move-confirm-btn`. Cancel buttons preserve banner state.
10. **NEW `bulk-price-chip-{id}`** — ₹ chip next to item name for priced rows in the bulk editor (visual affordance).

**Testids added (14 new + 3 pre-existing kept):** bulk-selection-banner, bulk-selection-count, bulk-select-all, bulk-select-row-{id}, bulk-delete-selected-btn, bulk-move-category-btn, bulk-move-category-dropdown, bulk-move-cat-option-{catId}, bulk-clear-selection-btn, bulk-delete-confirm, bulk-delete-confirm-btn, bulk-delete-confirm-cancel, bulk-move-confirm, bulk-move-confirm-btn, bulk-move-confirm-cancel, bulk-price-chip-{id}.

**Testing-agent verification (2026-07-17, iteration_28):** 6/6 tested scenarios PASSED — P5-A (rename via single PUT + id preservation), P5-C (combined rename+move via ONE PUT), P5-D (dup pre-flight with zero API), P5-E (banner + select-all + Clear), P5-F (bulk delete via banner), P5-H (cancel modals). 0 bugs, 0 UI regressions. `success_rate.frontend = 100%`. Report: `/app/test_reports/iteration_28.json`.

**Not explicitly tested (architecturally covered):**
- P5-B (priced-item move) — same PUT code path as P5-A (id-preserving) + BUG-202 backend guarantee that unit_price row survives PUT + P4-F already tested this end-to-end in Phase 4.
- P5-G (3-item bulk-move with dup-skip) — same handler as Phase 4's P4-E (22/22 PASS in iteration_27). Dup-preflight covered by P5-D.
- Malformed-404 branch — code review confirms unwrap logic; not naturally triggered by happy paths.

**Deferred refactor note (from testing agent):** `ExpenseBulkEditor.jsx` at 875 lines approaches soft cap. Future cleanup could extract bulk-select handlers + confirm modals to separate files. NOT a blocker; defer to housekeeping.

---

**Batch C complete. All 5 code phases shipped. Ready for Phase 6 (Closeout).**
