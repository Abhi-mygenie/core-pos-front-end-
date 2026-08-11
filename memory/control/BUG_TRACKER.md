# Layer 4 — Bug Tracker

**Last Updated:** 2026-08-06 (CR-131 IMPLEMENTED — Customer Intelligence Beta + Guest vs Registered Beta. 6 files: crmReportService.js (NEW), CustomerIntelligenceBeta.jsx (NEW), GuestVsRegisteredBeta.jsx (NEW), constants.js, Sidebar.jsx, App.js. CR-078 Phase 1 endpoints. Compile PASS. EXIT GATE 5/5.) 2026-08-06 (BUG-296 INVESTIGATION COMPLETE — Food Court vs Item Sales mismatch. RC1: order count discrepancy by design (cross-station orders). RC2a: sort_by created_at→collect_bill. RC2b: cancelled item prices in itemTotal. Live API validated: TAB=0, service_charge=0. After 2 fixes gap=₹0.00 per station. 1 file fix: foodCourtService.js. Awaiting Gate 2 Planning.) 2026-08-06 (BUG-301 IMPLEMENTED — Aggregator status toggle: `toggleFoodStatus` now sends `{food_for:'Aggregator'}` for aggregator, `{status}` for normal. 3 files, 3 edits. Compile PASS. EXIT GATE 5/5.) 2026-08-06 (BUG-302 IMPLEMENTED — Recipe PDF `doc.autoTable is not a function`. Changed side-effect import to named `import autoTable from 'jspdf-autotable'` + `autoTable(doc,{})` call. 1 file, 2 edits. Compile PASS.) 2026-08-06 (BUG-302 INTAKE — Recipe PDF Download crashes: `doc.autoTable is not a function`. CR-089 used wrong jspdf-autotable v3/v4 pattern, v5.0.8 installed. 1 file, Fast Lane eligible.) 2026-08-06 (BUG-301 INTAKE — Aggregator Menu Status Toggle Wrong Payload. `toggleFoodStatus` sends `{status}` but aggregator endpoint needs `{food_for:'Aggregator'}`. Silent HTTP-200 failure. 3 files. Investigation confirmed.) 2026-08-06 (BUG-300 IMPLEMENTED — crm_token sessionStorage→localStorage. 4 edits, 3 files. Compile PASS. EXIT GATE 5/5.) 2026-08-05 (BUG-295 IMPLEMENTED — Room Check-In docs not shown on return visit. INV-003 two root causes: RC2 setCrmCustomerId missing in handleSubmit + RC1 uploadDocument to CRM never called. 4 edits, 2 files. Compile PASS.) 2026-08-02 (BUG-293 IMPLEMENTED — OrderCard served items default expanded via lazy useState + useEffect. 1 file, 2 edits. Compile PASS.) 2026-08-02 (BUG-292 IMPLEMENTED — TableCard aggrId truncation: hide amount pill for isAggregator. 1 file, 2 lines. Fast Lane. Compile PASS.) 2026-07-31 (INTAKE: BUG-291 registered — Aggregator Rider Details Not Displayed. Prior draft BUG_250_INTAKE_2026_07_31.md superseded; BUG-250 was already taken by Polling Reconciliation bug.) 2026-07-24 (INTAKE Code Reality Check: BUG-214–222 + BUG-226 status corrected from "Gate 3 awaiting Gate 4" → IMPLEMENTED. All 10 have code markers in repo. BUG-221/222 already QA PASS per registry.json.) 2026-07-23 (Session C) — Gate 2 Impact Analysis now COMPLETE for ALL 14 bugs. Batches 1–6 OWNER APPROVED. ALL 14 bugs Gate 2 approved. 2026-07-23 Session E: GATE 3 Implementation Plans COMPLETE for ALL 13 code items (BUG-225 subsumed) — awaiting Gate 4 GO. Execution order: /app/memory/plans/POS5_EXECUTION_ORDER.md. Key findings: BUG-217 re-scoped (Unit, not Serves, blocks save); BUG-219 upgraded to HIGH (live data corruption on min_unit_alert); BUG-220 largely self-resolved (backend 409 already surfaced).

---

## POS 5.0 — Session 2026-07-22 Registrations (Inventory Module Batch)

### BUG Registrations (BUG-214 → BUG-227)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-214 | Addon Recipe Dropdown Shows Menu Items Instead of Addon Items | P1 | HIGH | **IMPLEMENTED** | 0-5 ✅ | 3 code markers in `RecipeFormPanel.jsx`. `getActiveAddons()` fix + `foods` fallback removed. Status updated 2026-07-24 (code reality check — was stale at Gate 3). |
| BUG-215 | Recipe Forms — Validation Errors Not Shown on Save Failure | P1 | MEDIUM | **IMPLEMENTED** | 0-5 ✅ | 2 code markers in `RecipeFormPanel.jsx`. Inline error state + validation on save catch. Status updated 2026-07-24 (code reality check). |
| BUG-216 | Recipe Ingredient Row Shows Base Unit, Should Show Small Unit | P2 | HIGH ⬆ | **IMPLEMENTED** | 0-5 ✅ | 3 code markers in `RecipeFormPanel.jsx` + `RecipeBulkEditor.jsx`. smallUnit fallback on ingredient select + dropdown. 2 files. Status updated 2026-07-24 (code reality check). |
| BUG-217 | Sub-Recipe Unit Field Required (re-scoped: blank Unit → backend 500) | P2 | MEDIUM | **IMPLEMENTED** | 0-5 ✅ | 2 code markers in `RecipeFormPanel.jsx` (L95 unit required, L178 indicator). Status updated 2026-07-24 (code reality check). |
| BUG-218 | Delete Ingredient — No Blocking Error When Used in Recipe | P1 | LOW (post-fix) | **IMPLEMENTED** | 0-5 ✅ | 4 code markers in `InventorySetupPanel.jsx`. Dialog + deleteBlocker state + `used_in_recipes[]` parse. Status updated 2026-07-24 (code reality check). |
| BUG-219 | Ingredient Form — Min Unit Text Input (data corruption fix) | P2 | **HIGH⬆** | **IMPLEMENTED** | 0-5 ✅ | 8 code markers in `inventoryTransform.js` (5) + `InventorySetupPanel.jsx` (3). min_unit_alert as unit string, dropdown. Status updated 2026-07-24 (code reality check). |
| BUG-220 | Ingredient Category — No Duplicate Alert | P2 | **LOW⬇ (owner-approved)** | **IMPLEMENTED** | 0-5 ✅ | 1 code marker in `InventorySetupPanel.jsx` (L78 pre-call guard). Backend 409 safety net. Status updated 2026-07-24 (code reality check). |
| BUG-221 | Bulk Ingredient Upload & Excel Download Not Working | P1 | HIGH | **IMPLEMENTED + QA PASS (2026-07-22)** | 0-5 ✅ | 7 code markers in `inventoryService.js` + `IngredientBulkEditor.jsx` + `constants.js`. Export JSON download_url, import UI wired, template endpoint. Status updated 2026-07-24 (code reality check). |
| BUG-222 | Bulk Recipe Excel — No Template/Export Split; File Won't Open | P2 | HIGH ⬆ | **IMPLEMENTED + QA PASS (2026-07-22)** | 0-5 ✅ | 7 code markers in `recipeService.js` + `RecipeBulkEditor.jsx` + `constants.js`. Export/import/template all wired for standard+sub. Status updated 2026-07-24 (code reality check). |
| BUG-223 | Wastage & Recipe Deduction Auto-Trigger Without Explicit Save | P1 | LOW (post-fix) | **IMPLEMENTED** | 0-5 ✅ | StockAuditPanel.jsx: amber preview badge + unsaved banner. 1 file ~18 lines. |
| BUG-224 | Smart Purchase — Ingredients Without Recipes Never Appear | P2 | HIGH ⬆ | **IMPLEMENTED** | 0-5 ✅ | purchasePlanner.js B2 Rule 2 low-stock rows + SmartPurchasePanel origin pass-through + AutoShoppingList amber badge. 3 files ~26 lines. |
| BUG-225 | Same Name as Ingredient + Recipe; Unit Mismatch Across Screens | P2 | LOW ⬇ (owner-approved) | **GATE 2 COMPLETE ✅ APPROVED — SUBSUMED by BUG-216** | 0-2 ✅ | No code under this ID. Live symptom self-resolved (ghee dosa no longer in any recipe, re-curl 2026-07-23). Residuals: conversion→BUG-226, negative stock→owner data fix. Closes with BUG-216 QA. |
| BUG-226 | Conversion Factor Not Saved on Add or Edit Ingredient | P1 | LOW (post-fix) | **IMPLEMENTED** | 0-5 ✅ | 2 code markers in `inventoryTransform.js`. `converion_factor` (R9 typo preserved) in ADD + EDIT payloads, default=1. Status updated 2026-07-24 (code reality check). |
| BUG-227 | Smart Purchase — Vendor Column Shows No History Though Vendors Exist | P1 | HIGH ⬆ | **IMPLEMENTED** | 0-5 ✅ | vendorRanking.js System Vendor + master append + SmartPurchasePanel getVendors + VendorSuggestionCell searchable combobox. 3 files ~60 lines. |

### CR Registrations (CR-088 → CR-094) — see CR_REGISTRY.md for full rows

---

## POS 5.0 — Session 2026-07-22 Registrations (Prior Entries)

| CR ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| CR-087 | New Expense Payment Fields — `payment_made_to` + `payment_ref_id` | P2 | MEDIUM | **IMPLEMENTED + QA PASS (2026-07-22) — iteration_3.json: 9/9 PASS. Gate 6 (owner smoke) PENDING.** | 0-5 ✅ | Form Row 2: Notes+Paid To+Ref ID side-by-side. Transaction table: 12 cols. Expense Report: 11 cols. Edit mode: 2 new inputs. Search extended. 3 files: `expenseTransform.js`, `ExpenseEntryPanel.jsx`, `ExpenseReportPage.jsx`. Plan: `CR-087_IMPLEMENTATION_PLAN_2026_07_22.md`. |

---

## POS 5.0 — Session 2026-07-16 Registrations

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-196 | Sidebar missing on 6 inventory/employee pages | P1 | LOW | **IMPLEMENTED** | 0-5 ✅ | 6 page wrappers + Sidebar component. Session handover. |
| BUG-197 | CR-072 Inventory Post-Delivery (10 gaps: recipe store/update/edit, purchase Amount, vendor save, wastage CRUD, add ingredient) | P1 | HIGH | **IMPLEMENTED** | 0-5 ✅ | 7 files, ~265 lines. Includes 4 NEW gaps found during audit (fromAPI foodId, form validation, sub/addon PUT, addon dropdown). **Addendum A2-A7 applied 2026-07-17:** recipe field renames (recipe_qty/recipe_unit, sub_recipe_name/subunit/prepration_time, thershold_qty/unit, serves_people/serve_time for addon). |
| BUG-198 | CR-069 Employee Post-Delivery — POST→PUT, inline password+eye toggle, status:1, email omit-if-empty, role_type wired, X-localization header, ResetPasswordDialog deleted, role PUT fix | P1 | HIGH | **IMPLEMENTED (2026-07-17).** 12 edits, 6 files + 1 deleted. | 0-5a ✅ | `employeeService.js`, `employeeTransform.js`, `EmployeeListView.jsx`, `roleService.js`, `RoleFormView.jsx`, `axios.js` |
| BUG-199 | Expense Entry: new item always goes to "misc" category — category_id never serialized to API payload | P1 | MEDIUM | **GATE 3 — IMPL IN PROGRESS** | 0-3 ✅ | Curl-verified 2026-07-16: key = `category_id` at line level. Extended to editExpenseEntry per Q-1. |
| BUG-200 | Expense Report: category filter returns 0 results | P1 | MEDIUM | **CLOSED — DUPLICATE-OF-BUG-199** | 0-6 ✅ | Curl 2026-07-16 proved filter mechanics correct (`category_id=<int>` works). Empty result was downstream of BUG-199 stuffing everything into misc. Auto-resolves once BUG-199 ships. Zero code change. |
| BUG-201 | Expense Deletion Safety — item + category cascade | P1 | HIGH | **PHASE 1 — IMPLEMENTED (2026-07-22).** Impact-aware modal: fetches `GET /expense/item/{id}/impact` on trash click, shows real transaction count + amount in confirm dialog. Delete now sends `delete_reason: 'Deleted by owner'`. 3 files: `constants.js` (+ITEM_IMPACT), `expenseService.js` (+getItemImpact + updated deleteExpenseItem), `ExpenseSetupPanel.jsx` (+handleDeleteItemClick, updated modal). Phase 2 (backend 409 enforcement) still pending backend delivery. | 0-5 | `constants.js`, `expenseService.js`, `ExpenseSetupPanel.jsx` |
| BUG-202 | Expense Setup — no Edit Item (rename + change category) capability | P1 | HIGH | **IMPLEMENTED (2026-07-17).** Backend PUT `/expenses/{id}` confirmed working (rename + category move). FE inline edit already coded (`BUG-202-fwd-compat`). Awaiting owner smoke. | 0-5a ✅ | `ExpenseSetupPanel.jsx`, `expenseService.js` |

---

## POS 5.0 — Session 2026-07-16 Consolidation (retirements / bundling)

Owner ruling 2026-07-16: retire the following 5 items and bundle 2 items into CR-074-B (see `/app/memory/EXPENSE_MODULE_CONSOLIDATED_BACKLOG_2026_07_16.md`).

| Bug ID | Title | Status | Reason |
|---|---|---|---|
| BUG-163 | CR-059 Setup — Export fails: missing type field in POST body | **RESOLVED — feature removed post-fix by CR-074-A** | Fix shipped previously but export button was fully removed in CR-074-A. Kept as historical record. |
| BUG-172 | ExpenseBulkEditor: "+ Add Row" vs "+ Add Item" design inconsistency | **RETIRED — SUPERSEDED-BY-CR-074-B** | Redesign resolves button placement/label. |
| BUG-173 | ExpenseBulkEditor: Unit column collected but never sent | **RETIRED — SUPERSEDED-BY-CR-074-B** | Redesign decides column set + payload wiring. |
| BUG-174 | ExpenseBulkEditor: Download Template button missing + STOCK_SAMPLE 404 | **RETIRED — OBSOLETE-BY-CR-074-A** | Template feeds an Import feature that no longer exists. |
| BUG-162 | CR-059 Setup — Expense Setup panel flickers on every mutation | **IMPLEMENTED (bundled into CR-074-B Phase 1, 2026-07-17)** | Optimistic-update pattern replaces fetchAll(). Testing iteration_26: 100% pass. |

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
| BUG-162 | CR-059 Setup — Expense Setup panel flickers on every mutation. `fetchAll()` re-fetches 3 endpoints + `setLoading(true)` after Add/Delete/Rename/Bulk operations → full table re-mount. POST/PUT/DELETE responses already return needed fields for local state updates. Fix: replace `fetchAll()` with optimistic local state updates in addItem/deleteItem/renameCategory/deleteCategory/handleBulkSave; keep `fetchAll` for initial mount, manual refresh button, import, and error revert paths. | P2 | MEDIUM | **IMPLEMENTED (bundled CR-074-B Phase 1, 2026-07-17)** | 0-5a ✅ | ExpenseSetupPanel.jsx — optimistic updates in 5 handlers. Testing iteration_26: 100% pass. |
| BUG-163 | CR-059 Setup — Export button fails: "The type field is required." `exportStockMaster()` calls `POST /expense/bulk-export-expense` with empty body. Backend requires `{ type: 'all' }`. Evidence confirmed via `bulk_export.json` (CR-059 discovery). Same pattern as CR-014 menu bulk export. | P1 | LOW | **IMPLEMENTED (2026-07-11). `expenseService.js` L65: added `{ type: 'all' }` POST body. // BUG-163 fix** | 0-5a ✅ | `expenseService.js` L65 |
| BUG-164 | Add Category: duplicate name showed "Category added" success toast. Backend now returns HTTP 409 for duplicates. | P1 | LOW | **IMPLEMENTED (2026-07-24). Removed res.data.errors body-inspection workaround. HTTP 409 triggers Axios catch block naturally. // BUG-164** | 0-5a ✅ | `components/expense/ExpenseSetupPanel.jsx` `addCategory()` |
| BUG-165 | Add Item: duplicate item name. Backend now returns HTTP 422. FE client-side guard retained for UX; 422 catch surfaces backend message. | P1 | LOW | **IMPLEMENTED (2026-07-24). Client guard retained; backend 422 surfaced via catch as safety net. // BUG-165** | 0-5a ✅ | `ExpenseSetupPanel.jsx` `addItem()` |
| BUG-VQTY | Order/bill payloads — `variation_amount` not multiplied by item qty. `buildCartItem` L703 and `collectBillExisting` L1492 computed `variationAmount` without `× qty`. Caused incorrect billing line totals for items with variations and qty > 1. | P0 | MEDIUM | **IMPLEMENTED (2026-07-11). `orderTransform.js` L703: `variationAmount * (item.qty \|\| 1)`. L1492: `variationAmount * qty`. // BUG-VQTY fix** | 0-5a ✅ | `api/transforms/orderTransform.js` L703 + L1492 |
| BUG-166 | Order Entry / Collect Bill — `addon_amount` sent as raw per-unit value without multiplying by item qty. Identical pattern to BUG-VQTY (`variation_amount`, now fixed). At L704 (`buildCartItem`) and L1493 (`collectBillExisting`) in `orderTransform.js`. Every item with addon + qty > 1 sends understated addon total to backend. | P0 | MEDIUM | **IMPLEMENTED + OWNER CONFIRMED KEEP (2026-07-11).** 2-line fix: L704: `addonAmount * (item.qty \|\| 1)`. L1493: `addonAmount * qty`. 13/13 unit tests + 18/18 regression PASS. Revert plan `BUG_166_168_ADDON_REVERT_PLAN.md` **CANCELLED** — owner decision to keep the fix permanently. | 0-5 ✅ | `api/transforms/orderTransform.js` L704 + L1493 |
| BUG-167 | Menu socket (`food_update_644`) lost on all non-dashboard routes. `useSocketEvents()` was only called in `DashboardPage.jsx` L186. Navigating to `/menu`, `/expense-setup`, etc. unmounted `DashboardPage`, tearing down the subscription. Backend emits correctly (3/3 live probes confirmed). Owner confirmed: zero console logs on `/menu` page. | P1 | LOW | **IMPLEMENTED (2026-07-11). Created `AppSocketManager.jsx` — calls `useSocketEvents()`, returns null. Mounted at app level in `App.js` inside `<BrowserRouter>` before `<Routes>`. Removed redundant call from `DashboardPage.jsx`. Testing 7/7 PASS.** | 0-5a ✅ | `components/AppSocketManager.jsx` (NEW), `App.js` L5+L79, `DashboardPage.jsx` L20+L186 |
| BUG-168 | **[v2 — 2026-07-08 — OWNER DISPUTES SCOPE, INVESTIGATION REOPENED]** Bill print item_total mismatch. My BUG-168 v2 fix at `orderTransform.js:1808-1826` was applied and is proven working for the addon case via backend-sourced (fallback) paths (order #002384: 69→219 ✅, order #002386: 292 ✅). **Owner clarification (late 2026-07-08):** in production, `Collect Bill auto-print (B3/B4/B5, live-UI-override branch)` emits WRONG values while `dashboard/order-card/order-entry Bill-Print button (B1/B2/B6/B7, fallback branch)` emits CORRECT values — OPPOSITE of the model used this session. Owner emphasized: for the WRONG path, all data comes from backend → no FE math change should be needed. Investigation direction reversed. See handover `/app/memory/handover/SESSION_HANDOVER_2026_07_08_BUG168_PRINT_INVESTIGATION.md`. | P0 | CRITICAL | **IMPLEMENTED (v2) but scope disputed.** L1808-1826 fix stays (defends fallback branch for addon case). Next-session ask: capture Collect Bill auto-print AND Bill-Print-button payloads for the same order, diff every field, trace divergent code path (suspected `paymentData` override construction, NOT the fallback loop). Do NOT extend the L1808 fix further until owner path-divergence is resolved. | 5 ✅ (for fallback-branch addon case) | `orderTransform.js` L1808-1826 (still holds) |
| BUG-ROOM-PAIDROOM | Bill collection — `paid_room` field always sent as `''` even for room orders. `collectBillExisting` L1632 hardcoded empty string. Backend needs `paid_room: 'yes'` to close room booking on checkout. | P1 | MEDIUM | **IMPLEMENTED (2026-07-11). `orderTransform.js` L1632: `table?.isRoom ? 'yes' : ''`. // BUG-ROOM-PAIDROOM fix** | 0-5a ✅ | `api/transforms/orderTransform.js` L1632 |

| BUG-175 | Expense Entry Form Case A: qty input shown when item has unit price — should be hidden. `handleQtyChange` called on qty input inside `unitPrice > 0` block. Amount auto-calc used `price * qty` instead of `price` directly. | P2 | LOW | **IMPLEMENTED (2026-07-11). `ExpenseEntryPanel.jsx`: removed qty input from Case A block, removed `handleQtyChange`, amount set to `String(price)` directly. // BUG-175** | 0-5a ✅ | `components/expense/ExpenseEntryPanel.jsx` |
| BUG-176 | Expense Entry Form Case B: optional qty/unit/physical_qty hidden when no unit price; physical_quantity hard-coded 0 with wrong "deprecated" comment — field is live on backend. | P2 | LOW | **IMPLEMENTED (2026-07-11). `ExpenseEntryPanel.jsx`: added Case B block showing qty+unit+physical_qty when no unit price; wired physical_quantity through handleSave, startEdit. `expenseService.js`: both addExpenseEntry + editExpenseEntry now pass user-provided physical_quantity. // BUG-176** | 0-5a ✅ | `components/expense/ExpenseEntryPanel.jsx`, `api/services/expenseService.js` |
| BUG-177 | Expense Entry: `notes` field missing from Add Expense form. Backend accepts `notes` in `POST /store-expense-details` (curl-confirmed) and returns it in reports, but FE form has no notes input and save payload omits the field. | P2 | LOW | **IMPLEMENTED (retroactive 2026-07-17).** Code exists: notes input L354-362, save payload wired, table column L713, edit mode L745-749. Registry was stale. | 0-5a ✅ | `ExpenseEntryPanel.jsx`, `expenseTransform.js`, `expenseService.js` |
| BUG-178 | Expense Entry: item name editable via `ItemCombobox` dropdown in transaction edit mode. Owner directive: item name must be read-only after creation. | P2 | LOW | **IMPLEMENTED (retroactive 2026-07-17).** Code exists: L729-730 renders `{editRow.expense}` as plain text. | 0-5a ✅ | `ExpenseEntryPanel.jsx` |
| BUG-179 | Expense Report: Excel export produces file with no transaction data. `exportReportAsExcel` called with raw API array instead of expected `{ title, sheets: [{ columns, rows }] }`. Only Summary metadata sheet generated. | P1 | MEDIUM | **IMPLEMENTED (retroactive 2026-07-17).** Code exists: `buildExportPayload()` L196-224 builds proper structure, `exportReportAsExcel(payload)` at L236. | 0-5a ✅ | `ExpenseReportPage.jsx` |
| BUG-180 | Expense Report: PDF export throws error. `exportReportAsPDF` called with 1 string arg instead of `(Window, params)`. Missing `openReportWindow()` call. | P1 | MEDIUM | **IMPLEMENTED (retroactive 2026-07-17).** Code exists: `openReportWindow()` + `exportReportAsPDF(pdfWin, payload)` at L228-241. | 0-5a ✅ | `ExpenseReportPage.jsx` |
| BUG-181 | Expense Entry: "Added By" column missing from daily transaction table. API returns `employee_name`, transform maps to `employeeName`, but table has no column for it. | P2 | LOW | **IMPLEMENTED (retroactive 2026-07-17).** Code exists: header L712, display cell L777-778, edit read-only L743-744. | 0-5a ✅ | `ExpenseEntryPanel.jsx` |
| BUG-182 | Expense Report: wrong employee name in "Added By" column. | P1 | MEDIUM | **CLOSED — INVESTIGATION (2026-07-17).** Backend returns correct names. Curl confirmed employee_id=3081 → f_name="Counter" consistently across employees-list + expenses-report. Original report was misdiagnosis (different employees, not inconsistent names for same employee). | CLOSED | N/A |


---

## CR-074-B Post-Delivery Bugs (registered 2026-07-17)

Source: Owner smoke observations during CR-074-B Phase 6 closeout.

| Bug ID | Description | Severity | Risk | Status | Gate | Scope |
|--------|-------------|----------|------|--------|------|-------|
| BUG-203 | Inline edit unit price: was 2-call workaround (PUT rename + POST set-unit-price). Backend now accepts unit_price on PUT. Simplified to single PUT call. | P2 | MEDIUM | **IMPLEMENTED (2026-07-24). Single PUT with unit_price. 2-call workaround removed from inline edit. // BUG-203** | 0-5a ✅ | `ExpenseSetupPanel.jsx`, `expenseService.js` |
| BUG-204 | Add Expense: priced items (Case A) hide qty input — amount locked to unitPrice×1. Cannot enter quantity for multi-unit purchases (e.g., 3× pav at ₹26 should auto-calc ₹78). Reversal of BUG-175 design decision. Related: BUG-154, BUG-175, BUG-176. | P1 | MEDIUM | **IMPLEMENTED (2026-07-17). Qty input visible, auto-calc live, breakdown text shown.** | 0-5a ✅ | `ExpenseEntryPanel.jsx` (~35 lines) |

BUG-203 intake: registered 2026-07-17 · source OWNER-REPORTED · confidence CONFIRMED · duplicate check DISTINCT · blast radius SMALL · fast lane NO · intake doc `change_requests/BUG_203_INLINE_EDIT_MISSING_UNIT_PRICE.md` · BACKEND-BLOCKED (§3.4 not delivered).

BUG-204 intake: registered 2026-07-17 · source OWNER-REPORTED · confidence CONFIRMED · duplicate check RELATED to BUG-175 (reversal) · blast radius SMALL · fast lane NO · intake doc `change_requests/BUG_204_EXPENSE_ENTRY_QTY_TIMES_UNITPRICE.md` · next role PLANNING (Gate 2).

| BUG-205 | Expense: Qty/Unit columns missing from transaction table + report. API returns `quantity` and `unit`, transform maps them, but neither ExpenseEntryPanel nor ExpenseReportPage renders them. ~20 lines, 2 files. | P2 | LOW | **IMPLEMENTED (2026-07-17).** Qty + Unit columns added to both tables + export payload. | 0-5a ✅ | `ExpenseEntryPanel.jsx`, `ExpenseReportPage.jsx` |

BUG-205 intake: registered 2026-07-17 · source AGENT-DISCOVERED (Finding B) · confidence CONFIRMED (code trace + API verified) · duplicate check DISTINCT (BUG-173 RETIRED/different surface, BUG-181 RELATED/different column) · blast radius SMALL · fast lane NO (2 files) · intake doc `change_requests/BUG_205_EXPENSE_QTY_UNIT_COLUMNS_MISSING.md` · next role PLANNING (Gate 2).
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

### 2026-07-19 QA Intake Batch (CR-073 Recipe Bulk Editor)

| ID | Description | Priority | Risk | Status | Gates | Blast Radius |
|---|---|---|---|---|---|---|
| **BUG-206** | RecipeBulkEditor Batch Save fails — sends `name: null` for existing standard recipes. BUG-197 #7 foodId reverse-lookup not ported from RecipeFormPanel to RecipeBulkEditor. PUT returns 422 "name required". Card View works. | **P0** | HIGH | **INTAKE — DIRECT BUG FIX ELIGIBLE** | 0-1 ✅ | 1 file (RecipeBulkEditor.jsx), ~10-15 lines. Pattern exists in RecipeFormPanel.jsx L50-53. |
| **BUG-207** | RecipeBulkEditor Cost=₹0 and Margin=100% for ALL recipes. API `get-recipe` does not return ingredient `cost` field. Mockup shows real values (₹78, ₹42 etc.). Needs investigation: does `get-inventory-master` return cost? If yes → FE cross-join fix. If no → backend brief. | **P1** | MEDIUM | **INTAKE — NEEDS INVESTIGATION** | 0-1 ✅ | 1 file + possibly backend brief. |

**BUG-206 UPDATE (2026-07-19):** IMPLEMENTED — v2 fix merged foodId reverse-lookup into normaliseRecipe(r, foods). Hydration useEffect deps [recipes, recipeType, foodsMaster]. Testing iteration_6: V9 PASS (PUT 200, name=168408), RT-1 PASS (persistence confirmed), Regression PASS. Preprod cleaned.

**BUG-207 UPDATE (2026-07-19):** QA PASS — v2 fix. Cross-joins vendor-item-list last purchase rate → recipe ingredient cost. 22/92 recipes show real ₹ cost, 70 show '—' (missing purchase data). No ₹0 anywhere. Margin color bands working. Save regression clean. iteration_8: 7/7 PASS.

### 2026-07-20 Current Stock + Ingredients Session

| BUG-211 | Current Stock — No default sort (low stock buried in raw API order) + KPI cards not clickable as filters (static divs). Owner chose Option A: KPI cards replace chip row. | P1 | MEDIUM | **QA PASS** (2026-07-21, iteration_1) — Sort Out→Low→In verified. KPI click filters verified. Chip row removed confirmed. | 0-6 ✅ | 1 file (CurrentStockPanel.jsx) + inventoryTransform.js (de-dupe). |
| BUG-212 | Ingredients — (A) Edit: pencil icon + inline edit row + PUT /update-inventory/{id}. (B) Add form expanded 3→7 fields. (C) Export calls real exportIngredients() API. | P1 | HIGH | **QA PASS** (2026-07-21, iteration_1) — Edit inline row (blue border) verified. 7-field add form verified. Export downloads real .xlsx. | 0-6 ✅ | 4 files: InventorySetupPanel.jsx, inventoryService.js, inventoryTransform.js, constants.js. |
| BUG-213 | IngredientBulkEditor — Bulk Edit toolbar has no page title (G8 gap from CR-086 F4). User cannot tell they are in bulk edit mode from the toolbar. | P3 | LOW | **QA PASS** (2026-07-21, iteration_1) — bulk-editor-title element present, text "Bulk Edit Ingredients" confirmed. | 0-6 ✅ | 1 file (IngredientBulkEditor.jsx). |


### 2026-07-22 Expense + Employee + Roles Session (BUG-228 → BUG-231)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-228 | Expense Split Bill: Item Appears as 2 Rows in Transaction List | P1 | MEDIUM | **DEFERRED TO BACKEND** — Owner ruling: no FE change | 0-2 ✅ | Backend handles split bill storage model. |
| BUG-229 | Employee: Auto-Populate Email (User ID) as firstname@restaurantname.com | P2 | LOW | **QA PASS** (2026-07-22, iteration_7) — auto-gen on fname, manual override, email mandatory | 0-5 ✅ | 1 file (EmployeeListView.jsx). |
| BUG-230 | Employee: Name Change → Email Auto-Sync (if auto-generated) | P2 | LOW | **QA PASS** (2026-07-22, iteration_7) — sync confirmed, custom email preserved | 0-5 ✅ | 1 file (EmployeeListView.jsx). |
| BUG-231 | Role Form: Hide role_type Field + Add Save Error Toasts | P1 | LOW | **QA PASS** (2026-07-22, iteration_7) — role_type hidden, validation + error indicators working | 0-5 ✅ | 1 file (RoleFormView.jsx). |
| BUG-232 | By Ingredient tab: empty combobox / no data on fast navigation (loading race) | P2 | LOW | **IMPLEMENTED** (2026-07-23) — loading spinner guard added; awaiting QA | 0-5 ✅ | 1 file (RecipeManagementPanel.jsx). |

### 2026-07-24 Employee + Role Management Session (BUG-234 → BUG-235)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-234 | Employee Role Dropdown Shows System Roles + Silent ID Mismatch | P1 | LOW | **QA PASS** (2026-07-24) — 9/9 tests pass. R3+R4 employee dropdown: system roles excluded, custom roles only. Awaiting Gate 6 (Owner Smoke). | 0-5b ✅ | 1 file (EmployeeListView.jsx). QA Report: `/app/memory/test_reports/CR-096_QA_REPORT_2026_07_24.md` |
| BUG-235 | Role Permissions Save Fails with 422 — role_type Empty on Create/Toggle | P1 | MEDIUM | **QA PASS** (2026-07-24) — 9/9 tests pass. R1 (new role no template), R2 (toggle), T4 (scratch build) all pass. No 422 errors. Awaiting Gate 6 (Owner Smoke). | 0-5b ✅ | 3 files (roleTransform.js + RoleFormView.jsx + RoleListView.jsx). QA Report: `/app/memory/test_reports/CR-096_QA_REPORT_2026_07_24.md` |
| BUG-236 | Smart Purchase — Ad-hoc Typeahead Dropdown Clipped by overflow-hidden | P1 | LOW | **INVESTIGATION COMPLETE — ready for BUG FIX.** Root cause: `overflow-hidden` on AutoShoppingList card container (L67) clips absolute-positioned dropdown. 3 edits in 1 file. | Investigation ✅ | `AutoShoppingList.jsx` (L67, L85, L164). Report: `/app/memory/reports/INVESTIGATION_ADHOC_DROPDOWN_BLOCKED_2026_07_24.md` |


### 2026-07-24 Recipe Form — Name Field Visibility (BUG-237)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-237 | Recipe Form — Recipe Name Field Should Be Hidden for Standard & Addon Types (Auto-Derived from Item Selection) | P2 | LOW | **IMPLEMENTED** (2026-07-24) — 6/6 QA PASS. Standard: name hidden, auto-derived from Menu Item. Addon: name hidden, auto-derived from Addon Item. Sub-recipe: name visible (user input). Awaiting Gate 6 (Owner Smoke). | 0-5 ✅ | 1 file (`RecipeFormPanel.jsx`). 3 edits: validation L93, auto-derive L110-115, JSX conditional L157-163. Intake doc: `change_requests/BUG_237_RECIPE_NAME_HIDDEN_FOR_STANDARD_ADDON.md` |

### 2026-07-24 Recipe Form UX (BUG-238 → BUG-239)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-238 | Recipe Form — Replace Plain `<select>` Dropdowns with Searchable Combobox | P2 | LOW | **IMPLEMENTED** (2026-07-24) — 6/6 QA PASS. Menu Item (280 foods), Addon Item, Ingredient rows (246 items) all replaced with SearchableSelect. | 0-5 ✅ | 1 file (`RecipeFormPanel.jsx`). New `SearchableSelect` component (L11-82). Test report: `iteration_9.json`. |
| BUG-239 | Recipe Form — Hide Serves Field for Sub-Recipe & Addon (Default 1) | P2 | LOW | **IMPLEMENTED** (2026-07-24) — 5/5 QA PASS. Serves visible only for Standard. Sub/Addon hidden, default 1 sent. No regression on BUG-237/238. | 0-5 ✅ | 1 file (`RecipeFormPanel.jsx`), 3 lines. Conditional `recipeType === 'standard'` wrap at L295. Intake doc: `change_requests/BUG_239_SERVES_HIDDEN_SUBRECIPE_ADDON.md` |

### 2026-07-24 Smart Purchase Investigation Bugs (BUG-240 → BUG-243)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-240 | Smart Purchase: On-Hand Shows Small Unit (gm) Instead of Display Unit (kg) | P1 | LOW | **INTAKE — Q1 APPROVED** | 0-1 ✅ | purchasePlanner uses calQuantity(gm), CurrentStock uses displayQty(kg). Fix: add display_on_hand conversion. ~5 lines. |
| BUG-241 | Smart Purchase: Rate Auto-Fills From Vendor History Making Items Active | P1 | LOW | **INTAKE — Q3 APPROVED** | 0-1 ✅ | vendor ranking pre-fills rate, defeating CR-103 activeRows filter. Fix: rate='' + suggestedRate hint. ~8 lines. CR-103 gap. |
| BUG-242 | Smart Purchase: No Default Vendor + Allows Null Vendor Submit | P1 | LOW | **INTAKE — Q4 APPROVED** | 0-1 ✅ | Submit goes through with vendor_id=null as "(unassigned)". Fix: default System Vendor + validate. ~10 lines. |
| BUG-243 | Backend: Stock Not Credited After add-purchase | **P0** | CRITICAL | **INTAKE — BACKEND-BLOCKED** | 0-1 ✅ | Purchase recorded in vendor-item-list but quantity/cal_quantity/display_qty never updated. Brief filed at BACKEND_BLOCKERS_BRIEF_2026_07_22.html. NO FE workaround. |

BUG-240 updated: **IMPLEMENTED (2026-07-24). display_on_hand from displayQty. purchasePlanner.js + AutoShoppingList.jsx. // BUG-240**
BUG-241 updated: **IMPLEMENTED (2026-07-24). rate='' + suggestedRate hint. SmartPurchasePanel.jsx + AutoShoppingList.jsx. // BUG-241**
BUG-242 updated: **IMPLEMENTED (2026-07-24). vendor_id defaults to 'system' + validate blocks null. SmartPurchasePanel.jsx. // BUG-242**

| **BUG-244** | add-purchase payload: `payment_method` wrong key (should be `payment_type`), missing `tot_amount`/`item_total` (default to 1), `converion_factor` removed (omit per contract). Affects ALL purchases via `addPurchase`. RELATED to BUG-243 (same endpoint, different root cause). | **P0** | MEDIUM | **IMPLEMENTED** | 5a | 1 file: `inventoryTransform.js`. Plan: `/app/memory/plans/BUG-244_IMPLEMENTATION_PLAN.md`. |

| **BUG-245** | Table card moves to top when order placed. Removed occupied-first bucketing in channel mode. Single `.sort(compare)` — tables stay in label position. | **P1** | LOW | **IMPLEMENTED** | 5a | `ChannelColumn.jsx`. Plan: `/app/memory/plans/BUG-245_IMPACT_AND_PLAN.md` |
| **BUG-246** | Customized items not merging in cart. Added `customizationKey()` merge logic to `addCustomizedItemToCart()`. Identical items (id+size+variants+addons+notes) now merge qty. Cascades to all print paths. | **P1** | MEDIUM | **IMPLEMENTED** | 5a | `OrderEntry.jsx` (R5). Plan: `/app/memory/plans/BUG-246_IMPACT_AND_PLAN.md` |
| **BUG-247** | Smart Purchase ad-hoc typeahead blocks UI. Wrapped `VendorSuggestionCell` in `React.memo()`. 50+ cells now skip re-render on typeahead keystrokes. | **P2** | LOW | **IMPLEMENTED** | 5a | `VendorSuggestionCell.jsx`. Plan: `/app/memory/plans/BUG-247_IMPACT_AND_PLAN.md` |

| **BUG-248** | Bulk Editor: 9 columns missing from `isDirty()` + `portionSize` missing from `buildPayload`. Part B (backend drops 4 fields) BACKEND-BLOCKED. | **P1** | LOW | **IMPLEMENTED — isDirty 9 checks + portionSize payload. Part B BACKEND-BLOCKED.** | 5a | `BulkEditor.jsx`: 9 isDirty checks + 1 buildPayload line. Impact: `/app/memory/impact/BUG-248_IMPACT_ANALYSIS.md`. Plan: `/app/memory/plans/BUG-248_IMPLEMENTATION_PLAN.md` |
| **BUG-249** | Current Stock: Negative qty shows "In Stock" — effectiveQty helper fixes 10 sites. | **P1** | LOW | **IMPLEMENTED** | 5a | `CurrentStockPanel.jsx` — effectiveQty(item) replaces Number(item.quantity). |

### 2026-08-06 Food Court vs Item Sales Revenue Mismatch (BUG-296)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-296** | Food Court Report vs Item-Wise Report — Data Mismatch (rid=598, Shimla QoH Food Court, June 2026) | **P1** | **HIGH** | **IMPLEMENTED — Gate 5a 2026-08-06** | 0-INV ✅, Gate 2 ✅, Gate 3 ✅, Gate 4 GO ✅, 5a ✅ | 1 file `foodCourtService.js`, 3 edits: E1 L105 cache key `created_at`→`collect_bill` // BUG-296, E2 L108 `sort_by` `created_at`→`collect_bill` // BUG-296, E3 L129 `itemTotal` add `.filter(foodStatus!==3)` // BUG-296. E1+E2 atomic. Self-test V1-V10 ALL PASS. Revenue verified: ZORKO ₹5,74,715 / Total ₹18,37,701.34 / Orders 6,152. Compile: 1 pre-existing warning, 0 new. EXIT GATE 5/5. QA: `handover/QA_HANDOVER_BUG296_2026_08_06.md`. Plan: `plans/BUG-296_IMPLEMENTATION_PLAN.md`. | RC1 (by design): 1,739/6,152 orders (28%) cross-station → order count 8,306 vs 6,152 — intentional food court model, no fix. RC2a (FIX): sort_by created_at→collect_bill in `foodCourtService.js:fetchChunk`. RC2b (FIX): exclude foodStatus=3 from itemTotal in `foodCourtService.js:toStationRow`. Live validated: TAB=0, service_charge=0, unassigned_items=0, comp=0. After both fixes gap=₹0.00 per station (CREAMBELLPARLOUR ₹2,42,458 / GUPTAJEE ₹7,18,535 / MSB ₹3,01,993 / ZORKO ₹5,74,715 / TOTAL ₹18,37,701). 1 file, 2 edits. Credentials: `owner@shimlaqohfoodcourt.com` / `Qplazm@10`. Report: `investigation/BUG-296_INVESTIGATION_REPORT.md`. Evidence: `evidence/BUG-296/live_validation_2026_08_06.json`. Handover: `handover/SESSION_HANDOVER_2026_08_06_BUG296_DEEP_INVESTIGATION.md` |

---

### 2026-08-06 Recipe PDF Download Crash (BUG-302)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-302** | Recipe PDF Download — `doc.autoTable is not a function` — CR-089 implementation used old jspdf-autotable v3/v4 side-effect import pattern; v5.0.8 installed removes prototype patching. Crash on click, no PDF produced. | **P1** | **MEDIUM** | **IMPLEMENTED — Gate 5a 2026-08-06** | 0-5a ✅ | CODE_ERROR. Fix: L6 `import autoTable from 'jspdf-autotable'` (was side-effect only). L437 `autoTable(doc,{})` (was `doc.autoTable({})`). `doc.lastAutoTable.finalY` L454 unchanged — v5 still sets it. 1 file, 2 edits. Compile PASS. EXIT GATE 5/5. Fix report: `handover/BUG_FIX_REPORT_BUG302_2026_08_06.md`. QA: `handover/QA_HANDOVER_BUG302_2026_08_06.md` |

---

### 2026-08-06 Aggregator Status Toggle Wrong Payload (BUG-301)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-301** | Aggregator Menu Status Toggle — `toggleFoodStatus` sends `{ status }` but aggregator endpoint requires `{ food_for: 'Aggregator' }`. HTTP 200 returned with error body — FE `try/catch` misses it. Success toast fires but status unchanged. | **P1** | **HIGH** | **IMPLEMENTED — Gate 5a 2026-08-06** | 0-5a ✅ | PLAN_GAP. Fix: `menuManagementService.js` — `toggleFoodStatus(foodId,status,foodFor='Normal')` sends `{food_for:'Aggregator'}` when aggregator, `{status}` otherwise. `ProductList.jsx:109` — passes `menuType` to call + dep array. `BulkEditor.jsx:510` — passes `menuType`. OQ-1 confirmed: Normal `{status}` still works. All `// BUG-301` markers. Compile PASS. EXIT GATE 5/5. QA: `handover/QA_HANDOVER_BUG301_2026_08_06.md` |

---

### 2026-08-06 CRM Token Storage Fix (BUG-300)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-300** | Customer Name/Phone Search Stops Working After Long Session (CRM Token) | **P1** | **MEDIUM** | **IMPLEMENTED Tier 2 — Gate 5a 2026-08-06** | 0-5a ✅ | Tier 1 (localStorage) + Tier 2 (silent refresh). `crmAxios.js`: E1 `import api from './axios'`, E2 `_crmTokenRefreshing` guard flag, E3 `async (error)` + 401 branch → `GET /restaurant-crm-token` → `setCrmToken` → retry. 1 file, ~25 lines. Compile PASS. EXIT GATE 5/5. QA: `handover/QA_HANDOVER_BUG300_T2_2026_08_06.md` |

---

### 2026-08-05 INV-003 — Room Check-In Docs Not Shown on Return (BUG-295)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-295** | Room Check-In: Documents on File not shown on return visit | **P1** | **MEDIUM** | **IMPLEMENTED — Gate 5a 2026-08-05** | 0-5a ✅ | INV-003 two root causes. RC2 (CODE_ERROR): `setCrmCustomerId` never called in `handleSubmit` BUG-092 block — fixed `if (customerId) setCrmCustomerId(customerId)` (L675-676). RC1 (PLAN_GAP): `uploadDocument()` added to `documentService.js`; called non-blocking after `roomService.checkIn()` succeeds with `CRM_DOC_TYPE` map (L728-735). Import updated. 4 edits, 2 files. Compile PASS. EXIT GATE 5/5. Fix report: `handover/BUG_FIX_REPORT_INV003_2026_08_05.md` |

---

### 2026-08-05 CustomerModal CRM Blocking (BUG-294)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-294** | CustomerModal — CRM Calls Block Order Flow on 401 | **P1** | **HIGH** | **IMPLEMENTED — Gate 5a PASS 2026-08-05** | 0-5a ✅ | 4 edits in `CustomerModal.jsx`: E1 Branch-1 updateCustomer try/catch, E2 throw→warn, E3 Branch-2 updateCustomer try/catch, E4 createCustomer try/catch + `CUST-{ts}` fallback. All `// BUG-294` markers. Compile PASS. EXIT GATE 5/5. QA handover: `handover/QA_HANDOVER_BUG294_2026_08_05.md` |

---

### 2026-08-02 Aggregator TableCard ID Truncation Fix (BUG-292)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-292** | TableCard: Aggregator AggrId Truncated by Amount Pill — `flex-shrink-0` amount competes with aggrId label in `justify-between` header pill. For aggregator orders, `table.label` contains 8-char ID (e.g. `#3H5H9488`) which gets clipped. | **P2** | LOW | **IMPLEMENTED — Compile PASS. Fast Lane.** | 5a ✅ | 1 file: `TableCard.jsx` L365. Wrap `table.amount` in `(!isAggregator && ...)` guard. 2-line change. Code marker `// BUG-292` at L366. Price still visible on OrderCard (by design). |

### 2026-07-26 Aggregator Module Investigation Bugs (BUG-250 → BUG-255)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-250** | Polling Reconciliation Removes Aggregator Orders (~60s) — `useOrderPollingReconciliation` treats aggregator orders as orphans after 1 poll cycle. CRITICAL: orders vanish from dashboard. | **P0** | HIGH | **CLOSED — OWNER VERIFIED (retroactive 2026-07-31)** | 0-6 ✅ | Fix: `isAggregator` exemption in `useOrderPollingReconciliation.js:204-206` (skip orphan removal), `OrderContext.jsx:51-55` (preserve aggregator orders on merge), `socketHandlers.js:952` (remove only on terminal fOS 3/6). Code markers `// BUG-250` confirmed in all 3 files. Registry synced retroactively 2026-07-31. |
| **BUG-251** | OrderCard Cancel + WhatsApp Buttons Shown for Aggregator — Normal flow (L946-996) has no `isAggregator` guard. Design says no Cancel (uses reject popup). | **P1** | LOW | **INTAKE** | 0-1 ✅ | 1 file: `OrderCard.jsx`, 2 lines. |
| **BUG-252** | TableCard Missing Items/Customer/Rider for Aggregator per Design Mockup — Design Section 3 shows items, customer+phone, rider status. TableCard only shows compact header. | **P2** | MEDIUM | **INTAKE** | 0-1 ✅ | 1 file: `TableCard.jsx`, ~40 lines. Needs Gate 2-3 planning. |
| **BUG-253** | Platform Dropdown Missing "Aggregator" Filter — Only has All/POS/Web. Aggregator orders wrongly bucket under POS. | **P1** | LOW | **INTAKE** | 0-1 ✅ | 2 files: `PlatformDropdown.jsx`, `DashboardPage.jsx`, ~10 lines. |
| **BUG-254** | Aggregator Handlers Fail Silently (No Toast) — All 4 handlers (accept/reject/ready/dispatch) catch errors with `console.error` only. No user feedback. | **P1** | LOW | **INTAKE** | 0-1 ✅ | 1 file: `DashboardPage.jsx`, ~40 lines across 4 handlers. |
| **BUG-255** | Item-Level Ready/Serve Dots Shown for Aggregator — Owner confirmed: "no item level ready and serve in aggregator order". No `isAggregator` guard on item toggles. | **P1** | LOW | **INTAKE** | 0-1 ✅ | 1 file: `OrderCard.jsx`, ~3 lines. |

### 2026-07-27 Aggregator TableCard Revert + OrderCard Qty Fix (BUG-256, BUG-257)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-256** | Revert BUG-252: TableCard aggregator body makes cards 2× height. Owner: keep same height as regular cards. Delete ~30 lines. | **P1** | LOW | **INTAKE — OWNER APPROVED REVERT** | 0-1 ✅ | 1 file: `TableCard.jsx`. Remove BUG-252 body block (~L412-443). |
| **BUG-257** | OrderCard `item.qty` undefined for aggregator — empty parens `()`. Root: aggregatorTransform uses `quantity`, OrderCard reads `qty`. | **P1** | LOW | **INTAKE — OWNER APPROVED FIX** | 0-1 ✅ | 1 file: `aggregatorTransform.js`. Add `qty:` alias. 1 line. |

### 2026-07-27 Reports + Inventory Investigation Batch (BUG-258 → BUG-266)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-258** | P&L Report Calendar Broken / Different UI — No Presets, No Max Date, No Calendar Component | **P1** | MEDIUM | **QA PASS (Gate 5b — 2026-07-31)** | | 0-1 ✅ | 1 file (`PLReportPage.jsx`), ~60 lines. Rewrite date bar to match ExpenseReport pattern. Intake: `change_requests/BUG-258_PL_REPORT_CALENDAR_BROKEN_INTAKE.md` |
| **BUG-259** | P&L Report Charts Hidden When ≤1 Data Point — `chartData.length > 1` too strict | **P2** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file, 1 line. Fast lane eligible. Intake: `change_requests/BUG-259_PL_REPORT_CHARTS_HIDDEN_INTAKE.md` |
| **BUG-260** | Future Dates Allowed in 5 Report Calendars (PLReport, Consumption, EdgeStates, ItemSalesHybrid, Dashboard) | **P1** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 5 files, ~2 lines each. Fast lane eligible. Intake: `change_requests/BUG-260_FUTURE_DATES_ALLOWED_5_REPORTS_INTAKE.md` |
| **BUG-261** | Missing Preset Pills in P&L + Consumption Reports — should be [Today, 7D, 30D, MTD] | **P1** | MEDIUM | **QA PASS (Gate 5b — 2026-07-31)** | | 0-1 ✅ | 2 files, ~50 lines each. Owner confirmed standard pattern. Intake: `change_requests/BUG-261_MISSING_PRESET_PILLS_PL_CONSUMPTION_INTAKE.md` |
| **BUG-262** | "Coming Soon" Placeholders Visible in Production (6 Locations: Intelligence, Setup, Sidebar, Login) | **P0** | MEDIUM | **QA PASS (Gate 5b — 2026-07-31)** | | 0-1 ✅ | 4 files with user-visible text. Multi-file audit+removal. Intake: `change_requests/BUG-262_COMING_SOON_IN_PRODUCTION_INTAKE.md` |
| **BUG-263** | Smart Purchase — No Sticky Toolbar (long scroll with 100+ items) | **P2** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file, CSS only. Fast lane eligible. Intake: `change_requests/BUG-263_SMART_PURCHASE_NO_STICKY_TOOLBAR_INTAKE.md` |
| **BUG-264** | System Vendor — No Explanation/Tooltip (confusing UX) | **P2** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1-2 files, ~10 lines. Fast lane eligible. Intake: `change_requests/BUG-264_SYSTEM_VENDOR_NO_EXPLANATION_INTAKE.md` |
| **BUG-265** | Conversion Factor — No Help Text (users don't understand concept) | **P3** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file, ~10 lines. Fast lane eligible. Intake: `change_requests/BUG-265_CONVERSION_FACTOR_NO_HELP_TEXT_INTAKE.md` |
| **BUG-266** | Wastage Report / Top Wasted Items — BACKEND-BLOCKED (no endpoint exists) | **P1** | N/A | **INTAKE — BACKEND-BLOCKED** | 0-1 ✅ | Frontend placeholder ready. Backend brief needed. Intake: `change_requests/BUG-266_WASTAGE_REPORT_BACKEND_BLOCKED_INTAKE.md` |
| **BUG-267** | Inventory Setup — Category Not Selecting When Adding Ingredient | **P2** | LOW | **INVESTIGATION — NEEDS_MORE_DATA** | N/A | Cannot reproduce. Dropdown has 72 options, selection works in automation. Need owner repro steps. |
| **BUG-268** | Inventory Edit — 500 SQL Error: inventory_audit_logs.id Missing AUTO_INCREMENT | **P0** | CRITICAL | **INVESTIGATION — BACKEND-BLOCKED** | N/A | ALL ingredient edits fail with HTTP 500. Backend fix required: `ALTER TABLE inventory_audit_logs MODIFY id AUTO_INCREMENT`. Brief: `backend_briefs/BACKEND_BRIEF_BUG-268_2026_07_28.md` |
| **BUG-269** | Ingredient Form 3 UX Bugs: Conversion Sent Incorrectly + No Small Unit Auto-Select + Alert Unit Not Read-Only | **P1** | MEDIUM | **QA PASS (Gate 5b — 2026-07-31)** | 0-5 ✅ | 2 files: `inventoryTransform.js` (hasConversion guard ×2) + `InventorySetupPanel.jsx` (UNIT_SMALL_MAP, unit onChange auto-select, smallUnit sync, alert read-only ×2, startEdit sync). // BUG-269-A/B/C |

### 2026-07-28 Investigation Batch — Order Flow + Reports + Config (BUG-270 → BUG-273)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-270** | Update Order Missing cust_mobile / cust_membership_id in update-place-order | **P1** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file: `orderTransform.js`. updateOrder L1131 only sends cust_name. placeOrder sends all 3. Fix: +2 lines. Intake: `change_requests/BUG-270_UPDATE_ORDER_MISSING_CUSTOMER_FIELDS_INTAKE.md` |
| **BUG-271** | GST/VAT Wrong on Print — food_details.tax fallback added to manual print path | **P1** | CRITICAL | **QA PASS (Gate 5b — 2026-07-31)** | 0-5 ✅ | Fixed `orderTransform.js` L1879-1910: added `lineTotal` + `food_details.tax` fallback to manual print path. Same logic as Collect Bill path (L1821-1830). Backend returns `gst_tax_amount: null` — fallback now computes `lineTotal × taxPct / 100`. Code marker: BUG-271 FIX-COMPLETE (2026-07-30). Self-test: PASS. Compile: 0 new warnings. Awaiting QA. |
| **BUG-272** | Partial Payment Breakdown Missing in Order Report | **P2** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 2 files: `reportTransform.js` + `OrderLedgerMockup.jsx`. `partial_payments` array from API never parsed. Column exists but data not populated. Intake: `change_requests/BUG-272_PARTIAL_PAYMENT_BREAKDOWN_MISSING_INTAKE.md` |
| **BUG-273** | Auto Settle Local Settings Removal — Now Server-Side | **P2** | MEDIUM | **INTAKE** | 0-1 ✅ | 5 files: StatusConfigPage, DashboardPage (R5), OrderCard, TableCard, autoSettlePrefs.js. ~100 lines to remove. Owner: server handles auto-settle now. Intake: `change_requests/BUG-273_AUTO_SETTLE_LOCAL_REMOVAL_INTAKE.md` |

### 2026-07-29 Inventory Bugs (BUG-274 → BUG-275)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-274** | Bulk Delete in Ingredient Bulk Editor Not Working — handleSave early return blocks delete processing | **P1** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file: `IngredientBulkEditor.jsx`. `deleteSelected()` marks `_deleted` but `handleSave()` L147-148 filters out deleted rows → "No changes to save" → deletes never reach API. Fix: include `toDelete.length` in early-return check. Q: BUG-268 audit_logs 500 may also block delete API. Intake: `change_requests/BUG-274_BULK_DELETE_INGREDIENT_NOT_WORKING_INTAKE.md` |
| **BUG-275** | Edit Ingredient: Conversion Factor Pre-Fills to 1 When No Conversion Exists | **P2** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file: `inventoryTransform.js` L18+L62. `Number(converion_factor) \|\| 1` defaults to 1 for items without conversion. Should use `has_unit_conversion` flag to decide. Related: BUG-226, BUG-265. Intake: `change_requests/BUG-275_CONVERSION_FACTOR_PREFILL_1_INTAKE.md` |
| **BUG-276** | Bulk Editor UX: Category move causes item to jump/disappear + inconsistent delete between Expense/Ingredient editors | **P2** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 2 files: `ExpenseBulkEditor.jsx` + `IngredientBulkEditor.jsx`. After "Move to Category", `groupedRows` re-sorts instantly → item teleports. No scroll/highlight. Delete behavior inconsistent (expense=immediate API, ingredient=mark+save broken). Intake: `change_requests/BUG-276_BULK_EDITOR_UX_CONSISTENCY_INTAKE.md` |

### 2026-07-29 Ingredient Bulk Editor Bugs (BUG-277 → BUG-279)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-277** | Ingredient Bulk Editor: Multi-Select Checkbox Resets on 2nd Row Click | **P1** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file: `IngredientBulkEditor.jsx` L65-67. `useEffect([allItems])` wipes `selected` on every prop reference change. Parent creates new array each render → selection lost. Fix: stable ID comparison guard. ~5 lines. Intake: `change_requests/BUG-277_MULTI_SELECT_RESETS_INTAKE.md` |
| **BUG-278** | Ingredient Bulk Editor: DELETE API Called Twice Per Ingredient (400 Bad Request) | **P1** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file: `IngredientBulkEditor.jsx`. Two Save buttons (toolbar+footer) can fire `handleSave` before async `setSaving(true)` disables them. Fix: `useRef` re-entry guard. ~3 lines. Intake: `change_requests/BUG-278_DELETE_DOUBLE_FIRE_INTAKE.md` |
| **BUG-279** | Ingredient Bulk Editor: Header Not Sticky on Scroll | **P2** | LOW | **QA PASS (Gate 5b — 2026-07-31)** | 0-1 ✅ | 1 file: `IngredientBulkEditor.jsx` L336. `<thead>` has no `sticky` class. 426 items scroll header away. Fix: add `sticky top-0 z-10`. ~1 line. Intake: `change_requests/BUG-279_HEADER_NOT_STICKY_INTAKE.md` |

### 2026-07-30 Collect Bill + Auto-Print Investigation Batch (BUG-280, BUG-281)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-280** | Customer Details (name/phone/membership_id) Not Sent in Collect Bill Settle API | **P1** | HIGH | **QA PASS — AWAITING OWNER SMOKE** | 0-6 ✅ | LIVE: `[CollectBill] payload` shows `cust_name/cust_mobile/cust_membership_id`. No email (OD-BUG280-1). 2026-07-31. |
| **BUG-281** | custGST/custGSTName Not Forwarded to Auto-Bill Print — 6 sites | **P1** | HIGH | **QA PASS — AWAITING OWNER SMOKE** | 0-6 ✅ | LIVE: `order-temp-store` has `custGST/custGSTName`. `[CollectBill] payload` has both. All 6 sites verified. 2026-07-31. |


### 2026-07-31 Aggregator Investigation Batch (BUG-282 → BUG-285)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-282** | Aggregator Popup: Addons + Variations Not Displayed | **P1** | LOW | **INTAKE** | 0-1 ✅ | `AggregatorOrderPopOut.jsx` has zero addon/variation render code. Transform maps data correctly. Live: orders #002407, #002401 have add_ons. Fix: ~30 lines, copy pattern from ScanOrderPopOut. |
| **BUG-283** | Aggregator: "Order Instructions :::" Prefix Not Stripped | **P2** | LOW | **INTAKE** | 0-1 ✅ | Zomato sends `"Order Instructions ::: <text>"`, Swiggy sends clean text. Fix: 1-line strip in `aggregatorTransform.js`. |
| **BUG-284** | Aggregator: Address Duplicate City ("Bangalore, Bangalore") | **P2** | LOW | **INTAKE** | 0-1 ✅ | Swiggy sets line_1=city=sub_locality="Bangalore". Fix: deduplicate + add sub_locality/landmark in `formatAddress()`. |
| **BUG-285** | Aggregator OrderCard: "Ready to Dispatch" Should Be Text, Not Button | **P2** | LOW | **INTAKE** | 0-1 ✅ | fOS=2: renders as clickable `<button>`. Owner says no dispatch action → convert to text label. Fix: ~5 lines in `OrderCard.jsx`. |

### 2026-07-31 Batch A Implementation (BUG-282, BUG-283, BUG-284, BUG-285)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-282 | Aggregator Popup: Addons + Variations Not Displayed | P1 | LOW | **IMPLEMENTED** | 0-5a ✅ | `AggregatorOrderPopOut.jsx`: +addon/variation render block (~25 lines). |
| BUG-283 | "Order Instructions :::" Prefix Not Stripped | P2 | LOW | **IMPLEMENTED** | 0-5a ✅ | `aggregatorTransform.js` L23: regex strip of Zomato prefix. 1 line. |
| BUG-284 | Address Duplicate City "Bangalore, Bangalore" | P2 | LOW | **IMPLEMENTED** | 0-5a ✅ | `AggregatorOrderPopOut.jsx` L27-34: dedup filter + sub_locality + landmark. |
| BUG-285 | "Ready to Dispatch" Button → Text Label | P2 | LOW | **IMPLEMENTED** | 0-5a ✅ | `OrderCard.jsx` L1071-1079 + `TableCard.jsx` L490-517: button→span. |

### 2026-07-31 Intake — BUG-286, BUG-287

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-286 | Aggregator KOT/Bill Hidden on OrderCard — `canPrintBill` gate | P1 | LOW | **INTAKE** | 0-1 ✅ | `OrderCard.jsx` L1013+L1082: `canPrintBill` blocks aggregator print buttons. TableCard has no gate → shows correctly. Owner directive: always show for aggregator. 1 file, 2 lines. |
| BUG-287 | "This is order level instructions" Placeholder Not Stripped | P2 | LOW | **INTAKE** | 0-1 ✅ | UrbanPiper default placeholder text not filtered. Shows on OrderCard+PopOut. Related: BUG-283 (prefix strip). Fix: 1 line in `aggregatorTransform.js`. UI auto-hides when null. |

### 2026-07-31 Intake — BUG-288, BUG-289

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-288** | Menu Management: Station Dropdown Only Shows "KDS" — Other Stations Missing | **P1** | MEDIUM | **INTAKE** | 0-1 ✅ | `CategoryList.jsx:24` fallback `[{ id:0, name:'KDS' }]` fires when `stations` prop is empty. `MenuManagementPanel.jsx:74` fetches via `getStationPrinterList()` → `stationPrinterList` transform. Root cause unknown — investigation needed (API shape mismatch, silent failure, or empty response). Intake: `change_requests/BUG-288_MENU_MGMT_STATION_DROPDOWN_ONLY_KDS_INTAKE.md` |
| **BUG-289** | Restaurant Settings: "Default Order Status" Dropdown Labels Wrong (5 options incorrect, 1 to remove) | **P2** | LOW | **IMPLEMENTED ✅** | 0-5a ✅ | `RestaurantSettingsPage.jsx:510-511`. Fast Lane. New labels: 1→"Ready (Send To kitchen)", 2→"Serve (Send to waiter)", 4→"Accept (Send to Kot Manager)", 5→"Bill (Send to Cashier)". Value 3 removed. Hint → "Order flow configuration". |


### 2026-07-31 Intake — BUG-291

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-291** | Aggregator Rider Details Not Displayed — `riderName`/`riderStatus`/`deliveryManId` mapping gaps in `aggregatorTransform.js` + socket bypass in `socketHandlers.js`. 5 gaps: R1 `riderName` emitted but UI reads `rider`; R2 `riderStatus` never computed; R3 `deliveryManId` not mapped; R4 `riderInfo` nested object orphaned; R5 socket `delivery-assign-order` routes aggregator orders through POS transform. Rider section always shows "Awaiting Runner". | **P1** | **HIGH** | **QA PASS (Gate 5b, 2026-08-01) — Awaiting Gate 6 Owner Smoke** | 0-5b ✅ | Code-verified QA PASS (2/2 code + 2/2 regression — 4/6 UI tests not executable without live aggregator orders). Owner to verify on preprod restaurant 749 (order 45334, rider "VEERJINDER SINGH") during Gate 6. Files: `aggregatorTransform.js` (R1 rider key, R2 riderStatus, R4 riderInfo dropped). Plan: `plans/BUG-291_IMPLEMENTATION_PLAN.md`. QA: `test_reports/QA_REPORT_CR124_BUG291_2026_08_01.md`. |
### 2026-07-31 Owner Decisions Locked — BUG-291 (REVISED)

**Decisions locked after owner Q&A session + API response shape review:**

| Decision | Outcome |
|---|---|
| riderStatus derivation (Q-291-1) | `rider_info.id` + `fOrderStatus < 5` → `'riderAssigned'`; `rider_info.id` + `fOrderStatus === 5` → `'dispatched'`; no id → `null`. APPROVED. |
| deliveryManId mapping (Q-291-2) | DROPPED — all footer action buttons behind `!isAggregator` guard (OrderCard:1111). No UI path reads `deliveryManId` for aggregator. |
| Socket fix (Q-291-3) | GAP-R5 was a **false alarm**. `delivery-assign-order` does NOT fire for aggregator. Aggregator has own channel (`aggrigator_order_${rid}`) → `handleAggregatorOrderUpdate` already uses `aggregatorTransform`. No socketHandlers.js change needed. |
| riderInfo block (Q-291-4) | DROP entirely — no UI consumer confirmed. |
| AggregatorDispatchModal (Q-291-5) | Out of scope — local state, not order model. |

**Risk revised: HIGH → LOW.** Only 1 non-hotspot file changes: `aggregatorTransform.js`. Fast Lane eligible.
**Real changes: 3** — add `rider:`, add `riderStatus:`, remove `riderInfo:` block.
**Gate 3 (Implementation Plan) ready to write.**

### 2026-07-31 Gate 3 Complete — BUG-291

Implementation Plan written. Gate 3 COMPLETE. Awaiting Gate 4 GO.

| Artifact | Path | Status |
|---|---|---|
| Intake | `change_requests/BUG-291_AGGREGATOR_RIDER_DETAILS_NOT_DISPLAYED_INTAKE.md` | ✅ |
| Gate 2 | WAIVED (owner instruction) | ✅ |
| Gate 3 Plan | `plans/BUG-291_IMPLEMENTATION_PLAN.md` | ✅ |
| Gate 4 GO | Owner approval required | ⏳ |

**What the plan says — exact change:**
File: `aggregatorTransform.js` lines 84–94 (rider block)
- ADD `rider:` key (GAP-R1, OrderCard:912 reads `order.rider`)
- ADD `riderStatus:` derivation — `rider.id + fOS<5 → 'riderAssigned'`; `fOS===5 → 'dispatched'`; else null (GAP-R2, Q-291-1 approved)
- REMOVE `riderInfo:` block — 8 lines dropped, no UI consumer (GAP-R4, Q-291-4 approved)
- KEEP `riderName:` and `riderPhone:` unchanged
Net: −4 lines. 1 file. No hotspot touched.

### 2026-07-31 Gate 5a — BUG-291 IMPLEMENTED

Code applied. Self-test passed. Awaiting QA.

| Exit Gate | Check | Result |
|---|---|---|
| □1 Registry Sync | BUG-291 → `IMPLEMENTED` in registry.json | ✅ PASS |
| □2 BUG_TRACKER.md | This row | ✅ PASS |
| □3 FILE_OWNERSHIP.md | aggregatorTransform.js entry added | ✅ PASS |
| □4 Code Markers | `// BUG-291 R1`, `// BUG-291 R2`, `// BUG-291 R4` at lines 85/89/94 | ✅ PASS |
| □5 Compile | webpack compiled successfully (hot reload) | ✅ PASS |

Self-Test VS-1: `rider:` ✅ `riderStatus:` ✅ `riderInfo:` absent ✅
Self-Test VS-2: OrderCard reads (`order.rider`, `order.riderStatus`) — untouched ✅
**EXIT GATE: 5/5 PASS**

### 2026-07-31 Intake — CR-124

| ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **CR-124** | Call PaaS Logout API on User Logout — `authService.logout()` is local-only; token not invalidated server-side (GAP-C1); FCM device token not deregistered (GAP-C2). Fix: fire-and-forget `api.post(API_ENDPOINTS.LOGOUT)` in `logout()` + add `LOGOUT:` to `API_ENDPOINTS` in `constants.js`. AuthContext.jsx NOT touched (fire-and-forget keeps sync signature). | **P1** | **MEDIUM-HIGH** | **INTAKE — BACKEND-BLOCKED** | 1 ✅, Gate 2 blocked | 2 files, ~4 lines. Blocked on Q-124-1 (logout endpoint path), Q-124-2 (FCM same endpoint?), Q-124-3 (fail-silent?). Prior investigation: INVESTIGATION_LOG.md:152. Security Audit: SECURITY_AUDIT_REPORT.md:634. Intake: `change_requests/CR-124_LOGOUT_API_CALL_INTAKE.md`. |

### 2026-07-31 Owner Decisions Locked — CR-124 Intake Closed

| Decision | Answer |
|---|---|
| Q-124-1 (endpoint path) | Owner to provide at Gate 2 — no longer a blocker for intake |
| Q-124-2 (FCM same endpoint?) | ✅ **Yes** — backend handles FCM deregistration. No separate FE call needed. |
| Q-124-3 (fail silent?) | ✅ **Show error to user** — `logout()` becomes async; AuthContext surfaces error toast |

**Blast radius revised:** 3 files (was 2). `AuthContext.jsx` now in scope due to Q-124-3 (async + error surfacing).
**Status: INTAKE COMPLETE — Gate 2 ready. Q-124-1 endpoint path to be provided by owner at Gate 2.**

### 2026-07-31 Gate 2 Complete — CR-124 Impact Analysis

Gate 2 (Impact Analysis) written. Artifact: `impact/CR-124_IMPACT_ANALYSIS.md`

**Deep localStorage audit findings:**

| Finding | Type | Action |
|---|---|---|
| 29 localStorage keys catalogued | Audit | ✅ Done |
| Category B (19 POS settings keys) — correctly NOT cleared | Confirmed intentional | No change |
| Category C (6 UI pref keys) — correctly NOT cleared | Confirmed harmless | No change |
| **IMP-124-GAP-1**: `remember_me` cleared in Sidebar only, not in `authService.logout()` | Bug | **IN SCOPE — fix in CR-124** |
| **IMP-124-GAP-2**: `axios.js` 401 auto-logout misses `crm_token` + `channel_visibility` | Minor gap | Owner decision — in CR-124 or separate |
| **IMP-124-GAP-3**: `Sidebar.jsx:410-411` duplicate `localStorage.removeItem` (dead code) | Cleanup | **IN SCOPE — remove in CR-124** |
| Sequencing risk: Option C (try/finally) recommended | Architecture | Q-124-4 owner answer needed |
| Blast radius revised: 4 files (was 3), ~17 lines net | Scope | — |

**Open questions (Gate 3 blocked on):**
- Q-124-1: Backend logout endpoint path
- Q-124-4: "Show error" = always complete local logout + toast, OR block logout entirely?
- IMP-124-GAP-2: Fix axios.js 401 cleanup in this CR or separate?

### 2026-07-31 GAP-2 Decision Locked — CR-124 Impact Analysis Finalised

| Update | Detail |
|---|---|
| GAP-2 | ✅ **IN SCOPE** — `axios.js` 401 auto-logout will also clear `crm_token` + `channel_visibility` as part of CR-124. ~2 lines in `axios.js`. |
| Blast radius revised | **5 files** (was 4): `constants.js`, `authService.js`, `AuthContext.jsx`, `Sidebar.jsx`, `axios.js`. ~15 lines net. |
| Backend endpoint | 🔴 **BLOCKED** — tested `/api/v1/auth/vendoremployee/logout`, `/api/v2/auth/vendoremployee/logout` + 4 variations on preprod. All return 404. Gate 3 parked until backend ships endpoint. |
| All other decisions | ✅ LOCKED — Q-124-1 to Q-124-4 + GAP-2 all resolved. |

**CR-124 status: GATE 2 COMPLETE — BACKEND-BLOCKED on Q-124-1 (endpoint path). Resume when backend ships `/logout` endpoint.**

### 2026-07-31 Q-124-1 LOCKED — CR-124 All Decisions Final

| Update | Detail |
|---|---|
| Q-124-1 | ✅ **LOCKED** — `POST /api/v2/vendoremployee/employee-logout`. HTTP 200, `{"message":"success"}`. No request body needed. Auth: `Bearer <token>`. Tested on preprod 2026-07-31. |
| Status | **GATE 2 COMPLETE — ALL DECISIONS LOCKED — Gate 3 ready** |
| No open questions | All 5 decisions (Q-124-1 through Q-124-4 + GAP-2) locked. Proceed to Gate 3. |

### 2026-07-31 Gate 3 Complete — CR-124 Implementation Plan

Gate 3 (Implementation Plan) written. Artifact: `plans/CR-124_IMPLEMENTATION_PLAN.md`

| Artifact | Path | Status |
|---|---|---|
| Intake | `change_requests/CR-124_LOGOUT_API_CALL_INTAKE.md` | ✅ |
| Impact Analysis | `impact/CR-124_IMPACT_ANALYSIS.md` | ✅ |
| Gate 3 Plan | `plans/CR-124_IMPLEMENTATION_PLAN.md` | ✅ |

**5 edits across 5 files (+15 lines net):**

| Edit # | File | Summary | Net Lines |
|---|---|---|---|
| 1 | `api/constants.js:9` | Add `LOGOUT:` to `API_ENDPOINTS` | +1 |
| 2 | `api/services/authService.js:49` | Make `logout()` async; `await api.post(LOGOUT)` first; clear storage only on success; add `REMEMBER_ME` removal (IMP-124-GAP-1) | +5 |
| 3 | `contexts/AuthContext.jsx:34` | Make `logout` callback async; `await authService.logout()` | +1 |
| 4 | `components/layout/Sidebar.jsx:232,400,752` | Add `isLoggingOut` state; async `handleLogout` with try/catch + toast on error; remove duplicate L410-411 removes (IMP-124-GAP-3); disable button during call | +6 |
| 5 | `api/axios.js:44` | Add `crm_token` + `channel_visibility` cleanup to 401 auto-logout block (IMP-124-GAP-2) | +2 |

**Files NOT touched:** `firebase.js`, `LoginPage.jsx`, `crmAxios.js`
**Verification matrix:** 15 checks (13 automated grep/compile, 2 manual browser)

**CR-124 status: GATE 3 COMPLETE — awaiting Gate 4 GO from owner**

### 2026-07-31 Gate 4 GO + Gate 5a IMPLEMENTED — CR-124

Owner issued Gate 4 GO (explicit "choose implementation role for CR-124"). Implementation complete.

**Self-Test Results (Verification Matrix):**

| Edit # | File | Check | Result |
|---|---|---|---|
| 1 | `constants.js:9` | `LOGOUT` key present → `/api/v2/vendoremployee/employee-logout` | ✅ PASS |
| 2 | `authService.js:51` | `logout` is `async` | ✅ PASS |
| 2 | `authService.js:53` | `await api.post(API_ENDPOINTS.LOGOUT)` is first operation | ✅ PASS |
| 2 | `authService.js` | `localStorage.removeItem(AUTH_TOKEN)` at line 55 — AFTER the await | ✅ PASS |
| 2 | `authService.js:67` | `REMEMBER_ME` removed (IMP-124-GAP-1) | ✅ PASS |
| 3 | `AuthContext.jsx:34` | `logout` callback is `async` | ✅ PASS |
| 3 | `AuthContext.jsx:35` | `await authService.logout()` present | ✅ PASS |
| 4 | `Sidebar.jsx:234` | `isLoggingOut` state declared | ✅ PASS |
| 4 | `Sidebar.jsx:401` | `handleLogout` is `async` with `try/catch` | ✅ PASS |
| 4 | `Sidebar.jsx` | No duplicate `removeItem('auth_token'/'remember_me')` lines | ✅ PASS |
| 4 | `Sidebar.jsx:767` | `disabled={isLoggingOut}` on logout button | ✅ PASS |
| 5 | `axios.js:47-48` | `crm_token` + `channel_visibility` cleared in 401 block (IMP-124-GAP-2) | ✅ PASS |
| ALL | webpack | `Compiled successfully!` — 0 new warnings | ✅ PASS |

**EXIT GATE:**

| □ | Check | Result |
|---|---|---|
| □1 | registry.json: CR-124 → `GATE 5a — IMPLEMENTED`, sprint_key `pos_5_0` (moved from pos_6_0) | ✅ PASS |
| □2 | BUG_TRACKER.md: this section | ✅ PASS |
| □3 | FILE_OWNERSHIP.md: 5 files listed (see QA handover) | ✅ PASS |
| □4 | Code markers: `// CR-124` in all 5 modified files (10 occurrences) | ✅ PASS |
| □5 | Compile check: `Compiled successfully!` 0 new warnings | ✅ PASS |

**EXIT GATE: 5/5 PASS**

**CR-124 status: GATE 5a — IMPLEMENTED — QA next**
