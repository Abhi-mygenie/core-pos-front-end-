# CR-074-B — Impact Analysis (Gate 2) — Expanded Scope

**Date:** 2026-07-16
**Role:** PLANNING
**Gate:** 2 (Impact Analysis)
**Sprint:** POS 5.0
**Alpha version:** v0.8
**Doc set:** `EXPENSE_MODULE_CONSOLIDATED_BACKLOG_2026_07_16.md` + `BATCH_A_EXPENSE_BUGS_IMPACT_ANALYSIS.md`

---

## 1. Scope (as absorbed 2026-07-16)

CR-074-B ships a unified Expense Setup UI refresh matching Menu Management, absorbing 3 formerly-independent items:

| Absorbed | What it brings |
|---|---|
| **CR-074-B core** | Design consistency refresh (inline edit / dropdowns / column parity with Menu Management BulkEditor) |
| **CR-064** | Unit-price input on the quick-add row (create item + price in one step) |
| **BUG-162** | Kill the `fetchAll()` full-refresh flicker via optimistic local updates |
| **BUG-202 fwd-compat** | Row-level Edit Item UI slot (rename + change category) — consumes BUG-202 backend endpoint when it lands |

Also supersedes UI patterns from **CR-067** (existing bulk-editor).

---

## 2. Code Reality (verified against current source)

### 2.1 Existing Menu Management pattern (design reference — `MenuManagementPanel.jsx`)
- **Layout:** 30% CategoryList | 70% ProductList; `Bulk Edit ↔ Card View` toggle in header.
- **Category list:** rich rows with edit/delete inline, item counts, station badge, DnD not used (uses order controls in a menu).
- **Product list:** card grid (default) OR bulk editor table (toggle).
- **Bulk editor:** search + Add Item in **header**, save/dirty count, no import/export, per-row inline edit including category dropdown, no drag-and-drop, per-row Save/Delete.
- **State:** categoriesWithCounts derived via `useMemo`, foods refreshed via `fetchFoods` only on menu-type change or explicit refresh — NOT after every mutation. Optimistic updates in item CRUD.

### 2.2 Expense Setup current shape (`ExpenseSetupPanel.jsx`, 944 lines)
- Two-tab header: Stock Master | Unit Prices (+ Bulk Edit button on Stock Master tab).
- Stock Master tab: 30% category list (with DnD droppable + item count + inline rename + delete) | 70% item list (search + quick-add row + table with trash-only actions + DnD draggable rows).
- **BUG-162 root cause:** `fetchAll()` is called after **every** category and item mutation (L198, L211, L225, L256, L271, L308, L311). Each call sets `loading=true`, empties `categories`+`allItems`, then re-populates — causes visible flicker/re-render of the whole panel.
- **CR-064 target:** L577-597 — quick-add row currently accepts only `newItemName`. No `unit_price` field.
- **BUG-202 target:** L640-654 — item row only has trash icon. No pencil / inline-edit / category dropdown per row.
- **Import/Export:** already removed by CR-074-A (this session, `ExpenseBulkEditor.jsx`).
- **DnD move flow** (L281–313): `DELETE item → POST re-create in new category` — will be **replaced** by BUG-202 PUT `/expense/stock-items/{id}` once backend delivers.

### 2.3 Expense Bulk Editor current shape (`ExpenseBulkEditor.jsx`, ~440 lines post CR-074-A)
- Header: Search + Add Item + Save Changes + Close (already Menu-Management-parity in shell).
- Table: per-row Name + Category dropdown + Save + Delete + Reset-all.
- Gaps vs Menu Management: exact styling, empty-state polish, column widths, dirty-row indicator style may differ. Design agent should reconcile.

---

## 3. Files to be changed (planned scope-lock — subject to design mockup)

| File | Reason |
|---|---|
| `frontend/src/components/expense/ExpenseSetupPanel.jsx` | Main container. Add inline row edit; add unit-price field on quick-add; refactor `fetchAll` calls to optimistic-update pattern; wire `updateExpenseItem` (BUG-202) when endpoint lands. |
| `frontend/src/components/expense/ExpenseBulkEditor.jsx` | Style + column parity with Menu Management BulkEditor; potentially absorb quick-add UX. |
| `frontend/src/api/services/expenseService.js` | +new `updateExpenseItem(id, {title, category_id})` wrapper (BUG-202 forward-compat, wired but not called until backend delivers). +extend `createCategoryWithItems` OR add new `createExpenseItemWithPrice` to accept unit_price. |
| `frontend/src/api/constants.js` | +`STOCK_ITEM_UPDATE: '/api/v2/vendoremployee/expense/stock-items'` (BUG-202 endpoint). |
| `frontend/src/api/transforms/expenseTransform.js` | +transform for updated item response echo. |
| Possibly new: `frontend/src/components/expense/CategoryList.jsx` + `ItemList.jsx` | Split ExpenseSetupPanel.jsx (944 lines, above the R5 ≥400-line hotspot marker for future work) into subcomponents matching Menu Management's `menu/CategoryList.jsx` + `menu/ProductList.jsx` structure — design agent to advise. |

**Files NOT to touch:**
- `ExpenseEntryPanel.jsx` (transaction entry — separate concern, out of scope)
- `ExpenseReportPage.jsx` (Insights report — untouched per B-5 Narrow ruling)
- `utils/reportExporter.js` (report exports preserved)
- `MenuManagementPanel.jsx` and its subtree (reference only, do not modify)

---

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| BUG-162 flicker fix breaks add/edit/delete flows in edge cases (backend errors need refetch, race conditions) | MEDIUM | User sees stale data on failure | Keep `fetchAll()` as **fallback on error** but not on success; add optimistic + rollback pattern with per-row loading indicators. |
| CR-064 unit-price on quick-add — backend `create` endpoint may or may not accept `unit_price` in the same request | MEDIUM | Feature ships broken | Curl-verify `/store_expense` accepts an inline `unit_price` field before wiring, OR chain two calls (create item → set price) with error rollback. |
| BUG-202 endpoint doesn't ship in time — inline edit UI ready but non-functional | HIGH | Design work wasted | Deliver UI behind a feature flag `EXPENSE_INLINE_EDIT_ENABLED`; ship redesign without inline edit if endpoint slips. |
| ExpenseSetupPanel is 944 lines — refactor into subcomponents may introduce regressions | MEDIUM | 20+ existing bug tests fail | Two-step: **step 1** design refresh in-place; **step 2** (optional) subcomponent extraction as separate cleanup. |
| Category delete cascade UX (BUG-201 partly-shipped) still uses generic wording — design should reserve slot for 409 count display when backend lands | LOW | UI copy churn | Design agent to leave placeholder text slot with `{count}` param. |
| Preserving all 20+ existing testids under redesigned DOM (see `data-testid` list below) | HIGH | Existing regression tests break | Design agent instructed to preserve every testid; testing_agent regression at implementation. |

---

## 5. Blockers / Preconditions

| # | Status | Item |
|---|---|---|
| B-1 | ✅ RESOLVED | Confirmed with owner: CR-074-B replaces CR-067 UI patterns. |
| B-2 | ✅ RESOLVED | CR-064 + BUG-162 + BUG-202 fwd-compat bundled into scope. |
| B-3 | ⏳ EXTERNAL | BUG-202 backend delivery (BACKEND_BRIEF_BUG202) — needed for full inline-edit functionality. FE can build UI now and gate behind flag. |
| B-4 | ⏳ EXTERNAL | Curl-verify: does `POST /store_expense` accept inline `unit_price` in create body? (needed for CR-064 clean implementation.) Not blocking design mockup. |
| B-5 | 🔵 NOW | `design_agent_full_stack` mockup — will be invoked immediately after this Impact Analysis. |

**No owner decisions outstanding.** Green light to invoke design agent.

---

## 6. Preserved testids (design agent must keep all of these)

`expense-setup-panel`, `expense-setup-loading`, `expense-setup-bulk`, `setup-bulk-btn`, `setup-refresh-btn`, `setup-tab-strip`, `tab-stock-master`, `tab-unit-prices`, `add-category-btn`, `new-category-input`, `new-category-save`, `category-all`, `category-row-{id}`, `category-edit-{id}`, `category-save-{id}`, `category-delete-{id}`, `items-search`, `new-item-input`, `new-item-save`, `item-row-{id}`, `item-delete-btn-{id}`, `delete-category-confirm`, `delete-category-confirm-btn`, `delete-item-confirm`, `delete-item-confirm-btn`, `up-*` (all unit-price testids), plus new: `item-edit-btn-{id}` (BUG-202), `new-item-price-input` (CR-064).

---

## 7. Deliverables from `design_agent_full_stack`

Design agent will produce a mockup covering:

1. Redesigned Expense Setup panel (Stock Master tab) — unified with Menu Management aesthetic.
2. Per-row inline Edit Item mode (rename + category dropdown) — BUG-202 forward-compat.
3. Enhanced quick-add row with unit-price field — CR-064.
4. Redesigned ExpenseBulkEditor — column parity with MenuManagement/BulkEditor.
5. Loading states — per-row loading indicators (not full-panel), enabling BUG-162 fix.
6. Retention of existing testids; naming of new testids per §6.

Design agent output → owner approval → Gate 3 Implementation Plan → Gate 4 GO → Implementation.

---

## 8. Handover

Impact Analysis complete for CR-074-B expanded scope.
No unresolved owner questions.
Invoking `design_agent_full_stack` next (this turn).
Gate 3 Implementation Plan blocked on: (a) design mockup + owner approval; (b) optional curl-verify on `POST /store_expense` unit_price acceptance.
