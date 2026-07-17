# Layer 4 — Bug Tracker

**Last Updated:** 2026-07-16 — Batch A execution start. BUG-199 (expense entry category, GATE 3 → IMPL). BUG-200 (auto-resolved by BUG-199, CLOSED — DUPLICATE). BUG-201 Phase 1 interim (wording only, GATE 3 → IMPL; full flow BACKEND-BLOCKED). BUG-202 (edit item — new, BACKEND-BLOCKED).

---

## POS 5.0 — Session 2026-07-16 Registrations

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-196 | Sidebar missing on 6 inventory/employee pages | P1 | LOW | **IMPLEMENTED** | 0-5 ✅ | 6 page wrappers + Sidebar component. Session handover. |
| BUG-197 | CR-072 Inventory Post-Delivery (10 gaps: recipe store/update/edit, purchase Amount, vendor save, wastage CRUD, add ingredient) | P1 | HIGH | **IMPLEMENTED** | 0-5 ✅ | 7 files, ~265 lines. Includes 4 NEW gaps found during audit (fromAPI foodId, form validation, sub/addon PUT, addon dropdown). |
| BUG-198 | CR-069 Employee Post-Delivery (4 issues: update POST→PUT, add missing status, reset password inline, eye icon missing) | P1 | HIGH | **GATE 2 COMPLETE** | 0-2 ✅ | Impact Analysis done 2026-07-17. Owner decisions: no popup (inline reset), no password_confirmation needed, upsert. 4 files, ~30 lines. Awaiting Gate 3. |
| BUG-199 | Expense Entry: new item always goes to "misc" category — category_id never serialized to API payload | P1 | MEDIUM | **GATE 3 — IMPL IN PROGRESS** | 0-3 ✅ | Curl-verified 2026-07-16: key = `category_id` at line level. Extended to editExpenseEntry per Q-1. |
| BUG-200 | Expense Report: category filter returns 0 results | P1 | MEDIUM | **CLOSED — DUPLICATE-OF-BUG-199** | 0-6 ✅ | Curl 2026-07-16 proved filter mechanics correct (`category_id=<int>` works). Empty result was downstream of BUG-199 stuffing everything into misc. Auto-resolves once BUG-199 ships. Zero code change. |
| BUG-201 | Expense Deletion Safety — item + category cascade | P1 | HIGH | **PHASE 1 INTERIM — IMPL IN PROGRESS** (wording); Phase 1 FULL: **BACKEND-BLOCKED** | 0-3 ✅ | BACKEND_BRIEF_BUG201 sent to backend team (owner ruling: new rules R-201-A item→txns first, R-201-B category→items first, backend returns 409). FE interim: modal wording update only. |
| BUG-202 | Expense Setup — no Edit Item (rename + change category) capability | P1 | HIGH | **GATE 2 COMPLETE — BACKEND-BLOCKED** | 0-2 ✅ | Curl 2026-07-16 confirmed no PUT item-update endpoint. BACKEND_BRIEF_BUG202 sent. Semantics: name = retroactive, category = snapshot. |

---

## POS 5.0 — Session 2026-07-16 Consolidation (retirements / bundling)

Owner ruling 2026-07-16: retire the following 5 items and bundle 2 items into CR-074-B (see `/app/memory/EXPENSE_MODULE_CONSOLIDATED_BACKLOG_2026_07_16.md`).

| Bug ID | Title | Status | Reason |
|---|---|---|---|
| BUG-163 | CR-059 Setup — Export fails: missing type field in POST body | **RESOLVED — feature removed post-fix by CR-074-A** | Fix shipped previously but export button was fully removed in CR-074-A. Kept as historical record. |
| BUG-172 | ExpenseBulkEditor: "+ Add Row" vs "+ Add Item" design inconsistency | **RETIRED — SUPERSEDED-BY-CR-074-B** | Redesign resolves button placement/label. |
| BUG-173 | ExpenseBulkEditor: Unit column collected but never sent | **RETIRED — SUPERSEDED-BY-CR-074-B** | Redesign decides column set + payload wiring. |
| BUG-174 | ExpenseBulkEditor: Download Template button missing + STOCK_SAMPLE 404 | **RETIRED — OBSOLETE-BY-CR-074-A** | Template feeds an Import feature that no longer exists. |
| BUG-162 | CR-059 Setup — Expense Setup panel flickers on every mutation | **BUNDLED — SCOPE-MERGED-INTO-CR-074-B** | Optimistic-update fix ships alongside redesign to avoid a shiny UI that still flickers. |

---

## POS 5.0 Active Bugs (registered 2026-06-18)

| Bug ID | Title | Priority | Risk | Status | Gate | Blocker |
|---|---|---|---|---|---|---|
| BUG-137 | KOT Re-Print from Inside View — `getOrderById` undefined in RePrintOnlyButton | P1 | MEDIUM | **CLOSED — OWNER VERIFIED** | 0-6 ✅ | — |
| BUG-138 | Discount Payload — `order_discount` and `self_discount` wrong values (self=0, order=total incl coupon/loyalty/wallet) | P0 | CRITICAL | **IMPLEMENTED** | 0-5 ✅ | — |
| BUG-139 | Collapsed Sidebar — nested items inaccessible (auto-expand fix) | P2 | LOW | **SUPERSEDED by CR-052** | — | — |

## POS 5.0 Batch Intake 2026-07-04 (owner batch report)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-140 | Bulk Editor — changing "Type" field doesn't save | P1 | MEDIUM | **CLOSED — SUBSUMED by BUG-125-B (2026-07-10). Code verified: `buildPayload` sends both `item_type` and `veg` (BulkEditor.jsx:157-159). Read-back correct via `menuManagementTransform.js:60`. BUG-125-B explicitly covers Bulk Editor.** | 0-6 ✅ | BulkEditor.jsx — buildPayload (write) + menuManagementTransform.js:60 (read) |
| BUG-141 | Excel Import — "Type" column not captured on menu update | P1 | MEDIUM | **CLOSED — SUBSUMED by BUG-125-B (2026-07-10). FE read/write path uses same transform as BUG-140 fix. After import, `onRefresh()` re-fetches menu — `menuManagementTransform.js` correctly reads `api.item_type`. Backend Excel parser concern is separate.** | 0-6 ✅ | menuManagementTransform.js:60 (read-back after import refresh) |
| BUG-142 | POS Qty input — with NumLock ON qty becomes negative | **P0** | **HIGH** | **CLOSED — FE GUARD EXISTS (2026-07-11). CartPanel.jsx has min={1} + val>=1 guard on both placed/unplaced qty inputs. Negative values rejected.** | 0-5a ✅ | CartPanel.jsx |
| BUG-143 | Short Code toggle ON but not printing / not effective | P1 | MEDIUM | **CLOSED — FE COMPLETE, BACKEND-OWNED (2026-07-11). shortCode toggle wired + saved via RestaurantSettings. Print output controlled by backend print agent, not FE.** | 0-5a ✅ | restaurantSettingsTransform.js, RestaurantSettingsPage.jsx |
| BUG-144 | Token Number not on order tickets / not shown on OrderCard | P1 | MEDIUM | **IMPLEMENTED (2026-07-11). 5 edits, 4 files: profileTransform (+useToken), orderTransform (+dailyToken in fromAPI.order + daily_token in buildBillPrintPayload), orderService (+daily_token in KOT payload), OrderCard (+token display gated by useToken). Compiled 0 new warnings.** | 5a | profileTransform.js, orderTransform.js, OrderCard.jsx, orderService.js |
| BUG-145 | Discount Type dropdown — "Complimentary" option missing | P1 | **HIGH** | **CLOSED — SUBSUMED by CR-058** | — | Owner ruling 2026-07-04: replaced by order-level Mark-Order-Complimentary action |
| BUG-146 | Item-level scheduled time missing on OrderCard | P2 | LOW | **CLOSED — CODE VERIFIED (schedule badge implemented via CR-018, OrderCard.jsx:456-467). Owner directed close 2026-07-09.** | 0-6 ✅ | OrderCard.jsx:456-467 |
| BUG-147 | Duplicate-item error toast doesn't include item name | P2 | LOW | **INTAKE** | 0-1 ✅ | AddCustomItemModal.jsx:274 |
| BUG-148 | Table Management — cannot add new table | P1 | MEDIUM | **CLOSED — SUBSUMED by CR-060** | — | Root cause: CRUD was mocked (toast-only). CR-060 wires real APIs. |
| BUG-149 | Order ID not visible on Scan & Delivery order cards | P1 | MEDIUM | **CLOSED — COULD NOT REPRODUCE (owner directive 2026-07-09). Code shows orderNumber chip renders for non-Room non-DineIn (OrderCard.jsx:426-432).** | 0-6 ✅ | OrderCard.jsx:426-432 |
| BUG-150 | CR-059 DnD — item bounces back (categoryId null in expenses-list API; hidden DnD placeholder) | P1 | MEDIUM | **IMPLEMENTED (2026-07-07)** | 0-5a ✅ | ExpenseSetupPanel.jsx — placeholder display:none→height:0; stronger hover (solid border + "Drop here" label) |
| BUG-DND-CR059 | CR-059 DnD — cross-category move silently ignored by backend (PUT /expenses/{id} ignores stock_title). Fix: DELETE + POST workflow. Within-list drag handles removed (BUG-P2). | P0 | MEDIUM | **IMPLEMENTED + SELF-TEST PASS (2026-07-08)** | 0-5a ✅ | ExpenseSetupPanel.jsx — handleDragEnd rewritten; GripVertical removed |
| BUG-158 | CR-059 Setup — Add Item to category silently fails. `addItem()` calls `updateCategory` (PUT) which ignores `stock_title`. Toast fires "Item added" but nothing is persisted. Same root cause as BUG-DND-CR059. Fix: replace with `createCategoryWithItems(cat.name, [newItemName])`. | P0 | LOW | **IMPLEMENTED + SELF-TEST PASS (2026-07-08)** | 0-5a ✅ | ExpenseSetupPanel.jsx — `addItem()` line ~203 |
| BUG-159 | CR-059 Setup — Add Category silently fails. `addCategory()` sends `stock_title: []` (empty). Backend returned HTML redirect instead of JSON 422. Toast fires "Category added" but nothing is created. | P0 | LOW | **IMPLEMENTED (2026-07-11). `addCategory()` now calls `createEmptyCategory()` → `POST /expense/category`. // BUG-159 fix** | 0-5a ✅ | `constants.js` + `expenseService.js` + `ExpenseSetupPanel.jsx` `addCategory()` |
| BUG-160 | CR-059 Setup — Rename Category broken. `renameCategory()` returned "Category not found". Backend fix shipped 2026-07-10: `PUT /expense/category/{id}`. Also covers deleteCategory (was per-item loop). | P1 | MEDIUM | **IMPLEMENTED (2026-07-11). `renameCategory()` → `renameExpenseCategory()` (`PUT /expense/category/{id}`). `deleteCategory()` → `deleteExpenseCategory()` (atomic). // BUG-160 fix** | 0-5a ✅ | `expenseService.js` + `ExpenseSetupPanel.jsx` `renameCategory()` + `deleteCategory()` |
| BUG-161 | CR-059 Setup — Bulk Save new items silently fails. `handleBulkSave()` calls `updateCategory` (PUT) for each row → same root cause as BUG-158. Items typed in bulk editor are not persisted. Fix: use `createCategoryWithItems` per row. | P1 | LOW | **IMPLEMENTED + SELF-TEST PASS (2026-07-08)** | 0-5a ✅ | ExpenseSetupPanel.jsx — `handleBulkSave()` line ~271 |
| BUG-151 | CR-059 Edit — fails silently (editRow.expense ≠ data.exp_name key in expenseService) | P1 | HIGH | **IMPLEMENTED (2026-07-07)** | 0-5a ✅ | expenseService.js L127 — exp_name: data.expense ?? data.exp_name |
| BUG-152 | CR-059 Delete — HTTP 405 (DELETE /edit-expense not supported; correct: /delete-expense) | P1 | HIGH | **IMPLEMENTED (2026-07-07)** | 0-5a ✅ | constants.js: DELETE_EXPENSE added; expenseService.js: deleteExpenseEntry uses DELETE_EXPENSE |
| BUG-153 | CR-059 Add UX — category required blocks free-text; no cross-category item suggestions | P2 | MEDIUM | **IMPLEMENTED (2026-07-07)** | 0-5a ✅ | ExpenseEntryPanel.jsx — category optional; handleItemSelect auto-fills categoryId; dropdown shows category badge hints |
| BUG-154 | CR-059 Add UX — qty/price conditional: unitPrice → show qty+read-only amount; no unitPrice → hide qty/unit | P1 | MEDIUM | **IMPLEMENTED + QA PASS (2026-07-07)** | 0-5b ✅ | ExpenseEntryPanel.jsx — EMPTY_LINE.unitPrice, handleItemSelect, handleQtyChange, conditional EntryLine JSX |
| BUG-155 | CR-059 Add UX — category dropdown only for free-text items; hidden + auto-fill for master items | P1 | LOW | **IMPLEMENTED + QA PASS (2026-07-07)** | 0-5b ✅ | ExpenseEntryPanel.jsx — isCustomItem flag, category select removed from default position |
| BUG-156 | CR-059 Add UX — default payment empty; should be Cash Draw | P2 | LOW | **IMPLEMENTED + QA PASS (2026-07-07)** | 0-5b ✅ | ExpenseEntryPanel.jsx — EMPTY_LINE.paymentMethod = "Cash Draw" |
| BUG-157 | CR-059 Expense Setup — category pills too small for 6-8 cat usability | P2 | LOW | **IMPLEMENTED + QA PASS (2026-07-07)** | 0-5b ✅ | ExpenseSetupPanel.jsx — w-72, py-3.5 px-4, minHeight:52, font-semibold |
| BUG-162 | CR-059 Setup — Expense Setup panel flickers on every mutation. `fetchAll()` re-fetches 3 endpoints + `setLoading(true)` after Add/Delete/Rename/Bulk operations → full table re-mount. POST/PUT/DELETE responses already return needed fields for local state updates. Fix: replace `fetchAll()` with optimistic local state updates in addItem/deleteItem/renameCategory/deleteCategory/handleBulkSave; keep `fetchAll` for initial mount, manual refresh button, import, and error revert paths. | P2 | MEDIUM | **INTAKE (2026-07-09)** | 0-1 ✅ | ExpenseSetupPanel.jsx — 5 handlers, ~50 lines |
| BUG-163 | CR-059 Setup — Export button fails: "The type field is required." `exportStockMaster()` calls `POST /expense/bulk-export-expense` with empty body. Backend requires `{ type: 'all' }`. Evidence confirmed via `bulk_export.json` (CR-059 discovery). Same pattern as CR-014 menu bulk export. | P1 | LOW | **IMPLEMENTED (2026-07-11). `expenseService.js` L65: added `{ type: 'all' }` POST body. // BUG-163 fix** | 0-5a ✅ | `expenseService.js` L65 |
| BUG-164 | Add Category: duplicate name showed "Category added" success toast. Backend returns HTTP 201 (not 409) with `{ errors: [{ code: "duplicate" }] }` body. Axios 2xx path never triggers catch — FE must inspect res.data.errors manually. | P1 | LOW | **IMPLEMENTED (2026-07-11). `addCategory()` captures `res`, checks `res.data?.errors?.[0]` — shows destructive toast + early return on duplicate. // BUG-164 fix** | 0-5a ✅ | `components/expense/ExpenseSetupPanel.jsx` `addCategory()` |
| BUG-165 | Add Item: duplicate item name silently allowed. Backend has no uniqueness constraint — POST store_expense returns 200 and creates a new item regardless. FE guard added; backend fix pending. | P1 | LOW | **FE GUARD IMPLEMENTED (2026-07-11). `addItem()` pre-checks `allItems` state (case-insensitive, same categoryId). Destructive toast + early return if duplicate. ⚠️ BACKEND FIX PENDING: POST /store_expense should return 4xx for duplicate stock_title.** | 0-5a-partial | `ExpenseSetupPanel.jsx` `addItem()` + `⚠️ BACKEND FLAG` comment L207 |
| BUG-VQTY | Order/bill payloads — `variation_amount` not multiplied by item qty. `buildCartItem` L703 and `collectBillExisting` L1492 computed `variationAmount` without `× qty`. Caused incorrect billing line totals for items with variations and qty > 1. | P0 | MEDIUM | **IMPLEMENTED (2026-07-11). `orderTransform.js` L703: `variationAmount * (item.qty \|\| 1)`. L1492: `variationAmount * qty`. // BUG-VQTY fix** | 0-5a ✅ | `api/transforms/orderTransform.js` L703 + L1492 |
| BUG-166 | Order Entry / Collect Bill — `addon_amount` sent as raw per-unit value without multiplying by item qty. Identical pattern to BUG-VQTY (`variation_amount`, now fixed). At L704 (`buildCartItem`) and L1493 (`collectBillExisting`) in `orderTransform.js`. Every item with addon + qty > 1 sends understated addon total to backend. | P0 | MEDIUM | **IMPLEMENTED + OWNER CONFIRMED KEEP (2026-07-11).** 2-line fix: L704: `addonAmount * (item.qty \|\| 1)`. L1493: `addonAmount * qty`. 13/13 unit tests + 18/18 regression PASS. Revert plan `BUG_166_168_ADDON_REVERT_PLAN.md` **CANCELLED** — owner decision to keep the fix permanently. | 0-5 ✅ | `api/transforms/orderTransform.js` L704 + L1493 |
| BUG-167 | Menu socket (`food_update_644`) lost on all non-dashboard routes. `useSocketEvents()` was only called in `DashboardPage.jsx` L186. Navigating to `/menu`, `/expense-setup`, etc. unmounted `DashboardPage`, tearing down the subscription. Backend emits correctly (3/3 live probes confirmed). Owner confirmed: zero console logs on `/menu` page. | P1 | LOW | **IMPLEMENTED (2026-07-11). Created `AppSocketManager.jsx` — calls `useSocketEvents()`, returns null. Mounted at app level in `App.js` inside `<BrowserRouter>` before `<Routes>`. Removed redundant call from `DashboardPage.jsx`. Testing 7/7 PASS.** | 0-5a ✅ | `components/AppSocketManager.jsx` (NEW), `App.js` L5+L79, `DashboardPage.jsx` L20+L186 |
| BUG-168 | **[v2 — 2026-07-08 — OWNER DISPUTES SCOPE, INVESTIGATION REOPENED]** Bill print item_total mismatch. My BUG-168 v2 fix at `orderTransform.js:1808-1826` was applied and is proven working for the addon case via backend-sourced (fallback) paths (order #002384: 69→219 ✅, order #002386: 292 ✅). **Owner clarification (late 2026-07-08):** in production, `Collect Bill auto-print (B3/B4/B5, live-UI-override branch)` emits WRONG values while `dashboard/order-card/order-entry Bill-Print button (B1/B2/B6/B7, fallback branch)` emits CORRECT values — OPPOSITE of the model used this session. Owner emphasized: for the WRONG path, all data comes from backend → no FE math change should be needed. Investigation direction reversed. See handover `/app/memory/handover/SESSION_HANDOVER_2026_07_08_BUG168_PRINT_INVESTIGATION.md`. | P0 | CRITICAL | **IMPLEMENTED (v2) but scope disputed.** L1808-1826 fix stays (defends fallback branch for addon case). Next-session ask: capture Collect Bill auto-print AND Bill-Print-button payloads for the same order, diff every field, trace divergent code path (suspected `paymentData` override construction, NOT the fallback loop). Do NOT extend the L1808 fix further until owner path-divergence is resolved. | 5 ✅ (for fallback-branch addon case) | `orderTransform.js` L1808-1826 (still holds) |
| BUG-ROOM-PAIDROOM | Bill collection — `paid_room` field always sent as `''` even for room orders. `collectBillExisting` L1632 hardcoded empty string. Backend needs `paid_room: 'yes'` to close room booking on checkout. | P1 | MEDIUM | **IMPLEMENTED (2026-07-11). `orderTransform.js` L1632: `table?.isRoom ? 'yes' : ''`. // BUG-ROOM-PAIDROOM fix** | 0-5a ✅ | `api/transforms/orderTransform.js` L1632 |

| BUG-175 | Expense Entry Form Case A: qty input shown when item has unit price — should be hidden. `handleQtyChange` called on qty input inside `unitPrice > 0` block. Amount auto-calc used `price * qty` instead of `price` directly. | P2 | LOW | **IMPLEMENTED (2026-07-11). `ExpenseEntryPanel.jsx`: removed qty input from Case A block, removed `handleQtyChange`, amount set to `String(price)` directly. // BUG-175** | 0-5a ✅ | `components/expense/ExpenseEntryPanel.jsx` |
| BUG-176 | Expense Entry Form Case B: optional qty/unit/physical_qty hidden when no unit price; physical_quantity hard-coded 0 with wrong "deprecated" comment — field is live on backend. | P2 | LOW | **IMPLEMENTED (2026-07-11). `ExpenseEntryPanel.jsx`: added Case B block showing qty+unit+physical_qty when no unit price; wired physical_quantity through handleSave, startEdit. `expenseService.js`: both addExpenseEntry + editExpenseEntry now pass user-provided physical_quantity. // BUG-176** | 0-5a ✅ | `components/expense/ExpenseEntryPanel.jsx`, `api/services/expenseService.js` |
| BUG-177 | Expense Entry: `notes` field missing from Add Expense form. Backend accepts `notes` in `POST /store-expense-details` (curl-confirmed) and returns it in reports, but FE form has no notes input and save payload omits the field. | P2 | LOW | **INTAKE (2026-07-11). Fast Lane eligible. ~15 lines, 2 files.** | 0-1 | `ExpenseEntryPanel.jsx`, `expenseTransform.js` |
| BUG-178 | Expense Entry: item name editable via `ItemCombobox` dropdown in transaction edit mode. Owner directive: item name must be read-only after creation. Backend brief filed for `PUT /edit-expense/{id}` to also reject `exp_name` changes. | P2 | LOW | **INTAKE (2026-07-11). Fast Lane eligible. ~5 lines, 1 file. Backend brief: `BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11_B.md`.** | 0-1 | `ExpenseEntryPanel.jsx` |
| BUG-179 | Expense Report: Excel export produces file with no transaction data. `exportReportAsExcel` called with raw API array instead of expected `{ title, sheets: [{ columns, rows }] }`. Only Summary metadata sheet generated. | P1 | MEDIUM | **INTAKE (2026-07-11). Related: BUG-180 (fix together). ~25 lines, 1 file.** | 0-1 | `ExpenseReportPage.jsx` |
| BUG-180 | Expense Report: PDF export throws error. `exportReportAsPDF` called with 1 string arg instead of `(Window, params)`. Missing `openReportWindow()` call. Error: "Report window was closed before generation completed." | P1 | MEDIUM | **INTAKE (2026-07-11). Related: BUG-179 (fix together). ~25 lines, 1 file.** | 0-1 | `ExpenseReportPage.jsx` |
| BUG-181 | Expense Entry: "Added By" column missing from daily transaction table. API returns `employee_name`, transform maps to `employeeName`, but table has no column for it. | P2 | LOW | **INTAKE (2026-07-11). Fast Lane eligible. ~8 lines, 1 file.** | 0-1 | `ExpenseEntryPanel.jsx` |
| BUG-182 | Expense Report: wrong employee name in "Added By" column. Backend returns inconsistent `employee_name` across endpoints: profile=Pranav Dogra, create=Owner, report=rowan. Same employee_id resolves to different names. **BACKEND-BLOCKED.** | P1 | MEDIUM | **INTAKE — BACKEND-BLOCKED (2026-07-11). Zero FE fix needed. Backend brief: `BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11_B.md`.** | 0-1 | BACKEND |

BUG-162 intake: registered 2026-07-09 · source OWNER-REPORTED · confidence CONFIRMED (owner observed live during BUG-158 verification; agent reproduced via Playwright) · duplicate check DISTINCT · blast radius SMALL · fast lane NO · intake doc `/app/memory/change_requests/BUG_162_EXPENSE_SETUP_FLICKER.md` · next role PLANNING (Gate 2 Impact Analysis).

---

## Insights Cross-Report Audit Batch (registered 2026-06-11, Gates 0-2 complete)

Source: `INSIGHTS_REPORTS_AUDIT.md` (cafe103) + `INSIGHTS_REPORTS_AUDIT_PALMHOUSE.md` (palmhouse). Replication harness: `/app/audit_data/`.

| Bug ID | Title | Priority | Status | Gate | Blocker |
|---|---|---|---|---|---|
| BUG-125 | Cancellations Order-Level scope never matches ('Cancel' vs 'cancelled') | P1 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-126 | insightsService reads non-existent round_off (API: round_up) | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-127 | Dashboard Unsettled-TAB tile → Credit Outstanding (credit API, option a) | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-128 | Dashboard double-fetches identical order-logs payload | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-129 | Backend stamps TAB orders f_order_status=6 before collection | P1→P3 (downgraded; FE gates by pm) | PLANNED (BACKEND-BLOCKED) | Brief sent via owner | Backend reply (brief #3) |
| BUG-125-B | Food Type (item_type) not persisting on Edit — backend reads `veg` field, FE was sending `item_type` (ignored). Fix: +1 line `veg:` in `menuManagementTransform.js:251` + `BulkEditor.jsx:159`. Covers Quick Edit, Full Edit, Bulk Editor, and Add Food. | P1 | **CLOSED — SHIPPED (retroactive, verified 2026-06-17)** | **POS 5.0** | **2 files, 2 lines added. Code confirmed on `16-june` branch.** |
**Source:** Canonical sprint summaries + `/memory/bugs/` artifact docs + `BUG_TEMPLATE.md`
**Reconciliation report:** `change_requests/AUDIT_CLOSURE_DRIFT_001_PHASE_A_RECONCILIATION_2026_05_30.md`

> **Drift reconciliation 2026-05-30:** Pre-reconciliation, this tracker showed 37 bugs (BUG-038..074) as `Intake Only`. AUDIT-CLOSURE-DRIFT-001 found 40 of these were actually closed per sprint final summaries. Sections below now reflect the canonical truth, with Artifact References cited per bug.

---

## Summary (post-reconciliation 2026-05-30)

| Category | Count | Source |
|---|---|---|
| Total bugs tracked | 118 (BUG-001..086 + BUG-087..111 + 8 PROD hotfixes) | Reconciled |
| Closed / Verified | 80 | Canonical sprint summaries + smoke sign-off docs |
| Open Intake / True Blocked | 11 | Items without canonical closure |
| Backend-Blocked (POS 3.0) | 6 | BUG-090,091,092,093,094,101 |
| CRM-Blocked | 1 | BUG-106 (BUG-107 subsumed, BUG-108 partial) |
| Owner Scope Needed | 2 | BUG-104,105 |
| Drift reconciled this pass | 44 | Was "Not Started" → now correctly tagged |

---

## Active / Recent Bugs (POS 3.0 + 3.1)

| Bug ID | Title | Priority | Status | Sprint | Blocker |
|---|---|---|---|---|---|
| BUG-087 | PayLater PAID badge on dashboard | P0 | CLOSED | POS 3.0 | — |
| BUG-088 | Room Transfer v2 endpoint + socket | P1 | CLOSED | POS 3.0 | — |
| BUG-089 | Eliminate redundant API calls on update-food-status | P1 | CLOSED | POS 3.0 | — |
| BUG-090 | CRM customer_id not stored on room orders | P2 | BACKEND-BLOCKED | POS 3.0 | Q-090-B-1 |
| BUG-091 | CRM search API duplicates | P2 | **CLOSED — DUPLICATE (no evidence, intake stub mismatched, owner-directed 2026-06-15)** | POS 3.0 | — |
| BUG-092 | Phone format contract undefined for room check-in | P2 | BACKEND-BLOCKED | POS 3.0 | Q-092-1: Room Check-In sends E.164 (+91...), Order screen sends raw 10-digit. Backend contract undefined. |
| BUG-093 | Room check-in date missing in API response | P3 | **CLOSED — IMPLEMENTED via CR-004 Phase 4.1 (owner-confirmed 2026-06-15)** | POS 3.0 | **`checkin_date` mapped in orderTransform.js:406 + 7 more files. Fully working.** |
| BUG-094 | Delivery-assign-order socket missing payload | P3 | BACKEND-BLOCKED | POS 3.0 | Q-094-1 |
| BUG-095 | Socket handler + dead code cleanup | P2→**P3** | **PREREQUISITES DONE (BUG-088+089 shipped). Dead code removal only (~47 lines). Intake: `memory/change_requests/BUG_095_SOCKET_DEAD_CODE_CLEANUP.md`** | POS 5.0 | — |
| BUG-096 | Realtime FE updates for menu + hold/unpaid | P1 | **PARTIAL — FE-ACTIONABLE. Food edit ✅ (BUG-116). Reorder ✅. Category socket not needed. Delete-food ❌ — backend emits `type: "delete-food"`, FE doesn't handle. ~20 lines fix. Intake: `memory/change_requests/BUG_096_REALTIME_MENU_SOCKET_HANDLERS.md`** | POS 5.0 | **FE gap — ready to implement** |
| BUG-097 | Delivery dispatch + assign rider | P1 | SMOKE PENDING | POS 3.0 | 25-row QA + CartPanel gate + Bucket 5 |
| BUG-098 | Use restaurant profile CRM key | P1 | CLOSED | POS 3.0 | — |
| BUG-099 | QSR / Cafe Quick Billing UX | P1 | CLOSED | POS 3.0 | — |
| BUG-100 | Remove duplicate local toast notifications | P1 | CLOSED | POS 3.0 | — |
| BUG-101 | Print template GST display slot | P3 | BACKEND-BLOCKED | POS 3.0 | Q-101-1 |
| BUG-102 | Mark Served/Ready button 20-30s delay | P0 | CLOSED | POS 3.0 | — |
| BUG-103 | Remove number input arrows | P2 | CLOSED | POS 3.0 | — |
| BUG-104 | Credit/Tab Management module | P1 | **CLOSED — SUBSUMED by CR-039 + CreditManagementPanel (owner-attested 2026-06-15)** | POS 3.0 → POS 4.0 | **CreditManagementPanel.jsx (376 lines) + creditService.js + 3 sub-components. CR-039 wired KPI totals.** |
| BUG-105 | Settlement Module | P1 | **CLOSED — SUBSUMED by CR-015 + CR-016 (owner-attested 2026-06-15)** | POS 3.0 → POS 4.0 | **SettlementPanel.jsx (497 lines) + settlementService.js + settlementTransform.js. Both CRs OWNER VERIFIED.** |
| BUG-106 | CRM Notes API integration | P2 | **CLOSED — SUBSUMED by CR-002 (owner-attested 2026-06-15)** | POS 3.0 → CRM 2.0 | **Order notes + food_level_notes via orderService.js. Customer intelligence via CR-002.** |
| BUG-107 | CRM Cross-Sell/Upsell insights | P2 | CRM-BLOCKED → SUBSUMED | POS 3.0 → CRM 2.0 | Absorbed into CR-002 |
| BUG-108 | CRM Coupon/Loyalty/Wallet | P1 | **CLOSED — SUBSUMED (owner-attested 2026-06-15). Coupon V1B/V1C + Loyalty shipped.** | POS 3.0 → CRM 2.0 | **couponService.js + loyaltyService.js wired in CollectPaymentPanel. Wallet backend pending.** |
| BUG-109 | QSR takeaway/delivery validation parity | — | CLOSED | POS 3.1 | — |
| BUG-110 | QSR prepaid lock parity | — | CLOSED | POS 3.1 | — |
| BUG-111 | QSR bill parity (Grand Total + breakdown) | — | CLOSED | POS 3.1 | — |
| **BUG-112** | **Auto-print (order-temp-store) blocked by Place Order API response — should fire in parallel** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **waitForOrderReady 3000→500ms + early HTTP check at redirect point. Phase 2 (table-matching for socket-first) deferred.** |
| **BUG-113** | **Partial payment UI stuck — auto-fill locks Cash/Card/UPI amount fields, cannot re-enter** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **FE fix: removed real-time capping + auto-fill from onChange. Moved to onBlur — clamp + auto-fill only when other row is empty.** |
| **BUG-114** | **discount_type, discount_member_category_id/name sent as empty/0 when category discount applied** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **FE fix: threaded selectedDiscountType (id, name) through paymentData.discounts → transform builders read from discounts instead of hardcoded 0. Covers placeOrderWithPayment + collectBillExisting.** |
| **BUG-115** | **Audit Report — cancelled item/order not rendering correctly in some cases; full production validation needed** | **P1** | **CLOSED — OWNER VERIFIED** | **POS 4.0** | **FE fix: aligned TAB_FILTERS.cancelled with Order Ledger — added lowercase 'cancelled' check to cancelled filter (L84), paid exclusion (L70), running exclusion (L107). 3 lines in AllOrdersReportPage.jsx.** |
| **BUG-116** | **Out-of-kitchen/out-of-menu item Add — backend already emits `food_update_${rid}` socket; FE had no listener → menu didn't refresh in realtime** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **Runtime validated 2026-06-08 via temp socket.onAny tap. 4-file additive fix: socketEvents.js (channel generator + payload-type const + envelope doc), socketHandlers.js (handleFoodUpdate), MenuContext.jsx (addOrUpdateProduct delta upsert), useSocketEvents.js (subscribe to food_update_${rid}, wire to actionsRef). No existing handlers touched. Webpack + lint clean.** |
| **BUG-117** | **Audit Report side-sheet — GST line renders negative (₹-44, ₹-26, ₹-168) on VAT-only & mixed-tax orders; same defect in Order Ledger GST columns + false FE-86 audit flag** | **P1** | **CLOSED — OWNER VERIFIED** | **POS 4.0** | **FE fix: corrected per-tax field interpretation in reportTransform.js L957-963 — total_gst_tax_amount is PURE GST (not combined). Removed subtraction. Verified live on Lafetta orders 012553/012554/012555 (2026-06-08). rawGstAmount kept numerically identical for FE-88 compat. Owner approved 2026-06-08.** |
| **BUG-118** | **Nth-item coupon code and BOGO coupon code — some features not working, needs testing** | **P1** | **INTAKE** | **POS 4.0** | **FE investigation needed** |
| **BUG-119** | **Backend stores negative `round_up` (e.g. −0.40) violating FE ceiling-only contract; side-sheet renders "₹-0"** | **P2** | **CLOSED — BACKEND FIXED (2026-06-08)** | **POS 4.0** | **Backend fixed the negative round_up. No FE changes needed.** |
| **BUG-123** *(renumbered from BUG-120 on 2026-06-11 — collision with closed CR-014 post-delivery BUG-120)* | **Place Order on 401 silently redirects to dashboard; cashier mistakes failure for success → missed orders** | **P1** | **INTAKE** | **POS 4.0** | **Fire-and-forget HTTP + socket-wait timeout + `window.location.href` bounce. Toast missable, cart lost, order not actually placed. Affects Place Order, Collect Bill, Transfer, Update Order — same pattern. Intake doc: BUG_123_PLACE_ORDER_401_SILENT_REDIRECT_INTAKE.md** |
| **BUG-124** *(renumbered from BUG-121 on 2026-06-11 — collision with closed category-count BUG-121)* | **Backend `food_update_${rid}` socket payload missing critical fields (status, is_disable, stock_out, food_status, live_web)** | **P2** | **INTAKE — FE DEFENDED** | **POS 4.0** | **FE has SOCKET_FOOD_DEFAULTS backfill in socketHandlers.js. Backend needs to enrich socket payload. Intake doc: BUG_124_BACKEND_FOOD_UPDATE_SOCKET_PAYLOAD_INCOMPLETE_INTAKE.md** |
| **BUG-122** | **POS orders with fOrderStatus 7 incorrectly trigger ScanOrderPopOut popup — popup gated to `isWebOrder === true`** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-10)** | **POS 4.0** | **`ScanOrderPopOut.jsx:56` predicate + POS YTC tick flow on OrderCard.** |
| **BUG-122 post-delivery** | **3 FE fixes: POS YTC Cancel(✗)+Confirm(✓) on OrderCard; TableCard snooze gated web-only; CR-018 schedule_at trailing-space + time-component guard** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **OrderCard.jsx:871-893, TableCard.jsx:326, CartPanel.jsx:1443/1469. Handover: memory/handover/CR018_BUG122_FE_FIXES_HANDOVER_2026_06_10.md** |
| **BUG-130** | **Channel Visibility: Restaurant Settings channels not reflected in POS dashboard.** Channels enabled/disabled via Restaurant Settings API (master config) are not properly gating what appears on POS dashboard and local visibility toggles. Two-layer model: (1) Restaurant-level from `settings-list` API, (2) Per-user localStorage override on StatusConfig. Related: CR-024, CR-020 B11. Deep investigation deferred per owner. | **P1** | **REGISTERED — INTAKE COMPLETE 2026-06-12. Investigation deferred. NOT STARTED.** | **POS 4.0** | **Trace needed: settings API → profileTransform → StatusConfigPage → DashboardPage → OrderEntry → localStorage interaction** |
| **BUG-131** | **Sidebar bottom section (Ringer/Refresh/User/Logout) scrolls up — should be sticky at bottom.** Bottom actions disappear when sidebar nav content is long. Fix: `flex-shrink-0` on bottom section, `min-h-0` on nav, `overflow-hidden` on aside. | **P2** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **3 CSS edits in `Sidebar.jsx`** |
| **BUG-132** | **Settlement Report business logic broken (formulas).** Expected = TotalFunds − Settled (was subtracting pilferage — circular). Pilferage column showed ₹0 (was ignoring backend value). Missing Total Funds KPI card. 5 micro-phases (A→E), 13 edits, 1 file. | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **`SettlementPanel.jsx` — 13 formula fixes + 1 KPI card added** |
| **BUG-133** | **"Check In" item appearing in reports — backend-only room marker with room tariff prices (₹1,100–₹3,600) inflating food revenue.** Validated: Welcome Resort 118 items in 15 days = ~₹1.5L phantom revenue. Filter: `(fd.name || '').trim().toLowerCase() === 'check in'`. 5 filter points across 3 files. Covers all 8 affected report surfaces. | **P1 (upgraded from P2 — money)** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **`insightsService.js` (3 filters), `reportTransform.js` (1 filter), `CancellationsMockup.jsx` (1 filter)** |
|| **BUG-134** | **Scroll not working on multiple screens (Place Order, QSR) — Windows-specific, intermittent.** Root cause: missing `min-h-0` on 3 flex-column parents (`OrderEntry.jsx:1455`, `:1608`, `CategoryPanel.jsx:20`) + QSR Billing section squeezing cart items to zero height. Fix: 3× `min-h-0`, `overflow-y-auto` on right panel, `min-h-[200px]` on cart items area, scrollbar 6→8px. | **P1** | **CLOSED — OWNER VERIFIED (2026-06-15)** | **POS 5.0** | **5 CSS edits across 3 files + App.css. Zero logic changes. Owner smoke PASSED on Windows.** |
|| **BUG-135** | **Bulk Editor — Save errors: inactive status not persisting + error messages not surfacing backend description.** 3 sub-items: A: Status→Off save fails (Partial Save 0/6). B: Import shows "Import failed" instead of backend error (e.g., "Duplicate row in file: Fish Amritsari..."). C: Duplicate item 422 shows raw Axios error instead of backend message. All in `BulkEditor.jsx` save/import error handlers. | **P1** | **IMPLEMENTED (2026-07-10 code-verified). A: toggleFoodStatus(id, status) called on status change (BulkEditor.jsx:497-499). B+C: err.readableMessage surfaced in import toast (L600) and save error per-row (L508, L559). All 3 sub-items confirmed in code.** | **POS 5.0** | **1 file (BulkEditor.jsx), 3 error handling paths. Owner screenshots with backend error visible in Network tab.** |
|| **BUG-136** | **Sidebar scroll jumps to top on navigation.** Root cause: each page renders own `<Sidebar />` instance — React Router unmounts/remounts, losing scroll. Fix: scroll position saved to `InsightsCacheContext` before `navigate()`, restored via `useLayoutEffect` on mount. 2 files changed (~15 lines), zero screen modifications. | **P2** | **IMPLEMENTED (2026-06-17)** | **POS 5.0** | **2 files: `Sidebar.jsx` (hook + 4 saveScroll calls + nav ref) + `InsightsCacheContext.jsx` (state). QA pending.** |

---

## POS 2.0 — Closed (consolidated 2026-05-18)

> Canonical source: `change_requests/final_sprint_reconciliation/POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md`

| Bug ID | Title | Status | Artifact Reference |
|---|---|---|---|
| BUG-050 | Printed bill mismatch after item cancellation | ✅ Implemented (W4) | POS2_0_WAVE_4_QA_HANDOFF_BUG_050_2026_05_17.md |
| BUG-051 | Round-off → Math.ceil | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-052 | Profile boolean gate for round-off | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-053 | GST split label percentage hardcode | ✅ Closed (no code) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-054 | VAT discount proration | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-055 | Prepaid order_discount_type payload | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-056 | Preset discount dropdown | ✅ Implemented (W3) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-057 | Print Bill for prepaid | ✅ Implemented (W4) | POS2_0_PRINT_PATH_UNIFICATION_CORRECTIVE_CODE_DIFF_PREVIEW_2026_05_17.md |
| BUG-058 | PayLater PAID badge + prepaid hold | 🔴 Carry-forward → BUG-087 | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-059 | Audit Report Print Bill | ✅ Implemented (W4) | POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_REVISED_2026_05_17.md |
| BUG-060 | Room transfer table clear | ✅ Implemented (W7) — temp FE fix | POS2_0_WAVE_7_IMPLEMENTATION_REPORT_2026_05_18.md |
| BUG-061 | Room check-in time createdAt fallback | ✅ Implemented (W7) | POS2_0_WAVE_7_IMPLEMENTATION_REPORT_2026_05_18.md |
| BUG-062 | Hide To Room for takeaway/delivery | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-063 | Room bill print fields | ✅ Closed (no code) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-064 | Room transfer notification message | 📋 Future sprint → POS3.0 | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-065 | Corporate room check-in CRM lookup | ✅ Implemented (Post) | POS2_0_BUG_065_IMPLEMENTATION_REPORT_2026_05_18.md |
| BUG-066 | Food transfer exclude rooms | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-067 | Station toggle when no stations | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-068 | Socket reconnect rehydration | ✅ Implemented (W6) | POS2_0_WAVE_6_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-069 | Notification sequencing | 📋 Future sprint → POS3.0 | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-070 | Room area grouping | ✅ Implemented (W5) | POS2_0_WAVE_5_CODE_DIFF_PREVIEW_BUG_070_2026_05_17.md |
| BUG-071 | Restaurant order ID on surfaces | ✅ Implemented (W5) | POS2_0_WAVE_5_CODE_DIFF_PREVIEW_BUG_071_2026_05_17.md |
| BUG-072 | Notes visible on order card | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-073 | Empty customization wrapper | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-074 | Remember Me checkbox | ✅ Implemented (Post) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-075..086 | Wave 2-7 misc | ✅ Various — see canonical doc | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |

---

## pos_final_1.0 — Closed (consolidated 2026-05-12)

> Canonical source: `bugs/BUG_CODE_VALIDATED_CONSOLIDATION_REPORT_2026_05_12.md` + per-bug `bugs/BUG_0XX_SMOKE_SIGNOFF.md`

| Bug ID | Title | Status | Artifact Reference |
|---|---|---|---|
| BUG-037..049 (drift-set) | Various pos_final_1.0 items | ✅ CLOSED — smoke signoff verified | bugs/BUG_0XX_SMOKE_SIGNOFF.md |
| BUG-038 | Credit payment customer details | Smoke signoff exists | bugs/BUG_038_SMOKE_SIGNOFF.md (if exists) — verified via TAB_CREDIT_CUSTOMER_CRM_* docs |
| BUG-039,040,041 | Audit report exports | Smoke signoff + impact docs | bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md + per-bug docs |
| BUG-042 | Hold + UPI payment | ✅ Smoke-passed | bugs/BUG_042_B_SMOKE_SIGNOFF.md |
| BUG-043 | Room orders discount column | ✅ Smoke-passed | bugs/BUG_043_SMOKE_SIGNOFF.md |
| BUG-044 | Old order items on free table | 🟡 Parked — runtime repro pending | bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md |
| BUG-045,046,047,048,049 | Various | ✅ Closed — smoke signoffs exist | bugs/BUG_0XX_SMOKE_SIGNOFF.md |

---

## True Intake / Unverified (no canonical closure proof)

> These remain as INTAKE per rulebook because no canonical doc proves closure.

| Bug ID | Title | Status |
|---|---|---|
| BUG-038..041 | Pos_final_1.0 items lacking authoritative closure doc | Awaiting reconciliation audit |

---

## Production Hotfixes

| ID | Title | Status | Date | Notes |
|---|---|---|---|---|
| PROD-001 | Auto-settle toggle | CLOSED | 2026-05-20 | 10/10 QA PASS, owner verified |
| PROD-002 | Settle print guard | RUNTIME-QA-PENDING | 2026-05-21 | 25-row checklist, no code fix needed |
| PROD-003 | PayLater table clear | FE-VERIFIED, BE-FOLLOWUP | 2026-05-21 | Backend should emit on `update-order-paid` |
| PROD-004 | Walk-in cart not cleared on stay-on-order | SHIPPED | 2026-05-27 | +2 lines in DashboardPage.jsx |
| PROD-005 | Prepaid screen clear delay | SHIPPED | 2026-05-27 | DashboardPage.jsx |
| PROD-006 | Takeaway print: custPhone empty when no phone entered | INTAKE | 2026-05-29 | Investigating — likely backend print template issue |
| PROD-007 | Loyalty points earned not displayed on Collect Bill | CLOSED — OWNER VERIFIED | 2026-05-29 | +3 lines loyaltyTransform.js, +5 lines CollectPaymentPanel.jsx |
| PROD-008 | Manual KOT/Bill print: custName & custPhone NULL | CLOSED — OWNER VERIFIED | 2026-05-29 | +2 lines in orderService.js L155-156 |

---

## Carryover Summary

| From Sprint | To Sprint | Items | Reason |
|---|---|---|---|
| POS 3.0 | Backlog | 6 backend-blocked bugs (090-094,101) | Backend hasn't delivered |
| POS 3.0 | CRM 2.0 | BUG-106,107,108 | CRM APIs needed |
| POS 3.0 | Backlog | BUG-104,105 | Owner scope sessions needed |
| POS 3.0 | Backlog | BUG-095,096 | Ready but not prioritized |
| POS 3.0 | Backlog | 12 unfrozen business rules | Each needs fix + verification + re-approval (TIP-003, ROUND-001 + 10 Part B promoted 2026-05-31) |
| BUG-108 | CRM 2.0 CR-009 | Coupon reversal, wallet, admin UI, multi-coupon, variant matching | Deferred items from BUG-108 |

---

## Closure Rule

Per `IMPLEMENTATION_AGENT_RULES.md` — 6-Artifact Rule (added 2026-05-12):
1. Intake document
2. Impact Analysis
3. Implementation Plan
4. Pre-Implementation Code Gate
5. Implementation Summary + QA Report
6. Owner Smoke Sign-off
