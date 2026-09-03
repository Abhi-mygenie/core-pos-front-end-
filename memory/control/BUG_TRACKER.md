**Last Updated:** 2026-09-03 (CR-360 GATE 3 — S6 In-House KPI tiles + View Bill; OG-PMS-001 through OG-PMS-004 filed in PMS Phase 1 gaps section.) — root fix: aiosellTransform.js roomCode→room_id, roomName→room_name, areaName→title; ChannelManagerPage Table# prefix removed. Testing agent verification pending.) 2026-09-03 (BUG-377 IMPLEMENTED — fallback option added to Room Mapping dropdown for when aiosellRooms is empty. 1 file, 4 lines. webpack clean.) 2026-09-03 (BUG-378 OD-1 RESOLVED — probe confirmed: use local-reservations view=all + op_status=in_house filter + order_id join. view=in_house returns 0. Phone from user.phone for all guests.) 2026-09-02 (BUG-377: PMS Room Mapping Unassigned — INTAKE P2 LOW. BUG-378: PMS In-House Guests incomplete data — INTAKE P1 MEDIUM, owner decision OD-1 pending.) 2026-09-01 (BUG-374, BUG-369, BUG-372, BUG-371 IMPLEMENTED — QA PENDING) (BUG-370: OrderCard.jsx + TableCard.jsx; BUG-373: profileTransform.js + CollectPaymentPanel.jsx; BUG-375: ProductForm.jsx) 2026-09-01 (BUG-367 G4 Print Style snap INTAKE — CLOSURE Phase B) 2026-08-31 (BUG-366 IMPLEMENTED — restaurantFor added to profileTransform.settings(); 1 file, 1 line; planning skip owner-approved; compile clean) 2026-08-31 (BUG-365 IMPLEMENTED — PUT→POST fix in stationConfigService.js:22; 1 file, 1 line; planning skip owner-approved; compile clean) 2026-08-30 (BUG-364 INTAKE — Printer Type routing gate stale mid-wizard; profile not re-fetched on intermediate step saves; RELATED: BUG-337; P3 LOW; Fast Lane eligible.) 2026-08-30 (BUG-362 INTAKE — CR-133 Gap G1: copies snap back; CODE EXISTS (CLOSURE Phase B); `shared.jsx` NumberInput fix present. BUG-363 INTAKE — CR-133 Gap G5+G6: Android style mismatch; CODE EXISTS (CLOSURE Phase B); `PrintStyleTab.jsx` RowEditor fix present.) 2026-08-26 (BUG-361 IMPLEMENTED — Sidebar Phase 2 Sweep: 68 files. Python script. webpack clean.) 2026-08-26 (CR-348 IMPLEMENTED — Custom item GST % + Tax Calc fields wired: AddCustomItemModal.jsx + orderTransform.js + OrderEntry.jsx. CR-350 IMPLEMENTED — Room check-in ID upload mandatory toggle: StatusConfigPage.jsx + RoomCheckInModal.jsx. BUG-358 IMPLEMENTED — Sidebar state persisted via localStorage: DashboardPage.jsx. BUG-360 IMPLEMENTED — Room checkout live balance: CollectPaymentPanel.jsx + RoomRowCard.jsx.)

---

### 2026-09-02 — BUG-377, BUG-378 (INTAKE — CR-358-P1 post-implementation bugs)

| Bug ID | Title | Priority | Risk | Status | Notes |
|---|---|---|---|---|---|
| **BUG-377** | PMS Room Mapping: dropdown shows "— Unassigned —" despite "Mapped" status | P2 | LOW | **IMPLEMENTED — QA PASS** | Fallback `<option>` added for saved mapping code when `aiosellRooms` catalogue empty. `ChannelManagerPage.jsx` +4 lines. Testing agent: 5/5 rooms show correct codes. Fix report: `handover/BUG-377_BUG_FIX_REPORT_2026_09_03.md` |
| **BUG-378** | PMS In-House Guests: Room/Phone/Dates/Balance all show "—" | P1 | MEDIUM | **IMPLEMENTED — Gate 5a** | 4 files. roomListTransform (+phone), aiosellService (+getLocalReservations), pmsService (two-call join), InHouseGuestsPage (4 field renames). webpack clean. QA: `handover/QA_HANDOVER_BUG378_2026_09_03.md` |

---

### 2026-09-01 — BUG-374, BUG-369, BUG-372, BUG-371 (IMPLEMENTED — QA PENDING)

| Bug ID | Title | Priority | Risk | Status | Notes |
|---|---|---|---|---|---|
| **BUG-374** | Cart: variation qty change mirrors to all variations of same item | P0 | CRITICAL | **IMPLEMENTED — QA PENDING** | Fix: `_cartKey` UUID assigned per cart slot; `updateQuantity` matches by `_cartKey` not `item.id`. Files: `OrderEntry.jsx`, `CartPanel.jsx`. Testing agent timed out 2x. |
| **BUG-369** | Print Customer Copy flag not passed to Printer Agent | P1 | MEDIUM | **IMPLEMENTED — QA PENDING** | Fix: `printBillCustomerCopy` added to `profileTransform.settings()`; passed in overrides from `CollectPaymentPanel`; included in `buildBillPrintPayload`. Files: `profileTransform.js`, `CollectPaymentPanel.jsx`, `orderTransform.js`. |
| **BUG-372** | Transfer + Merge from order card not working | P1 | HIGH | **IMPLEMENTED — QA PENDING** | Fix: Merge handler replaced `console.log` with real `initialShowMerge` flow; Transfer timing fixed (state set before navigation). Files: `DashboardPage.jsx`, `OrderEntry.jsx`. |
| **BUG-371** | Bulk Editor variation price not editable | P2 | MEDIUM | **IMPLEMENTED — QA PENDING** | Fix: `VariationExpandPanel` gets price inputs + `onPriceChange` prop; BulkEditor tracks dirty variations; `buildPayload` includes variation data. Files: `VariationExpandPanel.jsx`, `BulkEditor.jsx`. |

---

### 2026-09-01 — BUG-368 through BUG-375 (INTAKE — Owner Batch)

| Bug ID | Title | Priority | Risk | Severity | Status | Path |
|---|---|---|---|---|---|---|
| **BUG-368** | Split Bill Reprint fails after settlement | P1 | MEDIUM | MAJOR | **IMPLEMENTED — Awaiting QA** | `impact/BUG-368_IMPACT_ANALYSIS.md` + `plans/BUG-368_IMPLEMENTATION_PLAN.md` |
| **BUG-369** | Print Customer Copy setting has no effect | P1 | MEDIUM | MAJOR | INTAKE | Gate 2 — owner decision OD-1 needed |
| **BUG-370** | Delivery reassign missing in Waiting for Rider state | P2 | LOW | MINOR | INTAKE | Fast Lane eligible |
| **BUG-371** | Bulk Editor variation price not editable | P2 | MEDIUM | MAJOR | INTAKE | Gate 2 — new UI needed |
| **BUG-372** | Transfer + Merge buttons not working from order card | P1 | HIGH | MAJOR | INTAKE | Gate 2 — Merge is console.log only |
| **BUG-373** | Service Charge label hardcoded — custom label ignored | P2 | MEDIUM | MINOR | INTAKE | Fast Lane partial eligible |
| **BUG-374** | Variation qty change affects all variations of same item | P0 | CRITICAL | BLOCKER | INTAKE | Gate 2 — hotspot, full analysis needed |
| **BUG-375** | Zomato Image shown in Normal Menu Management | P3 | LOW | MINOR | INTAKE | Fast Lane eligible |

---

### 2026-09-01 — BUG-367, BUG-362 (CLOSED — OWNER VERIFIED retroactive)

| Bug ID | Title | Priority | Risk | Status | Notes |
|---|---|---|---|---|---|
| **BUG-367** | Printer Agent Print Style — value snaps to 0 (G4) | P2 | LOW | **CLOSED — OWNER VERIFIED (retroactive 2026-09-01)** | QA PASS: clear-and-retype works, blur clamps to valid min. QA report: QA_REPORT_CR353_CR355_CLOSURE_2026_09_01.md |
| **BUG-362** | CR-133 Gap G1: Bill/KOT Copies inputs snap back to 1 (AutoPrintTab) | P2 | LOW | **CLOSED — OWNER VERIFIED (retroactive 2026-09-01)** | QA PASS: copies field allows editing without snap-back, persists after save. QA report: QA_REPORT_CR353_CR355_CLOSURE_2026_09_01.md |

---

### 2026-08-31 — BUG-366 (IMPLEMENTED)

| Bug ID | Title | Priority | Risk | Status | Notes |
|---|---|---|---|---|---|
| **BUG-366** | Station GST field never renders — `restaurantFor` missing from `profileTransform.settings()` | P1 | MEDIUM | **IMPLEMENTED** | 1 file, 1 line. Added `restaurantFor: apiSettings.restaurant_for \|\| 'Normal'` to `profileTransform.js settings()` after `printerType`. Root: `restaurant.settings.restaurantFor` was always `undefined` → coerced to `''` → `'' !== 'food_court'` → guard never passed. Confirmed API field is root-level `restaurant_for` (same as `restaurantSettingsTransform.js:38`). Owner decision: food_court = show field. Compile clean 2026-08-31. |

---

### 2026-08-31 — BUG-365 (IMPLEMENTED)

| Bug ID | Title | Priority | Risk | Status | Notes |
|---|---|---|---|---|---|
| **BUG-365** | Station Config `updateStation` uses `api.put()` — backend rejects 405 (only POST supported) | P1 | MEDIUM | **IMPLEMENTED** | 1 file, 1 line. `stationConfigService.js:22` `api.put()` → `api.post()`. `id` already in body via `toAPI.station(form, false, ...)`. Planning skip — owner approved. Compile clean. Source: INV-PRINTER-UPDATE-GST investigation 2026-08-31. |

---

### 2026-08-30 — BUG-362, BUG-363 (INTAKE — CODE EXISTS, CLOSURE Phase B)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-362** | CR-133 Gap G1: Bill/KOT Copies inputs snap back to 1 (AutoPrintTab NumberInput) | P2 | LOW | **INTAKE — CODE EXISTS (CLOSURE Phase B)** | 1 ✅ | Code reality: FULL. Fix in `shared.jsx` `NumberInput` (localVal+blur clamp, line 5). Shipped under CR-133-GAP label. Never got a BUG ID. Handover 2026-08-27 said NOT FIXED (stale — code is truth). CLOSURE Phase B: QA verify copies persist, then mark CLOSED retroactively. Related: BUG-315. Intake: `change_requests/BUG-362_CR133_GAP_G1_COPIES_SNAP_BACK_INTAKE.md` |
| **BUG-363** | CR-133 Gap G5+G6: Android bill/KOT style saves incorrectly — API shape flat→windows/android split mismatch | P1 | MEDIUM | **INTAKE — CODE EXISTS (CLOSURE Phase B)** | 1 ✅ | Code reality: FULL. Fix in `PrintStyleTab.jsx` RowEditor (patches `row[platform]` sub-object, lines 41-67). Shipped under CR-133-GAP label. Never got a BUG ID. Handover said NOT FIXED CRITICAL (stale — code is truth). CLOSURE Phase B: QA verify Android style round-trip + confirm transform toAPI emits split shape. Related: BUG-315, BUG-317. Intake: `change_requests/BUG-363_CR133_GAP_G5G6_ANDROID_STYLE_MISMATCH_INTAKE.md` |

---

### 2026-08-26 — CR-348, CR-350, BUG-358, BUG-360 (IMPLEMENTED)

| ID | Title | Priority | Risk | Status | Files |
|---|---|---|---|---|---|
| **BUG-361** | Sidebar state not persisted: Phase 2 — 68 remaining pages | P2 | LOW | **IMPLEMENTED** | 5 ✅ | 68 files. Python script applied localStorage init + setIsExpanded wrapper. Same key as BUG-358. 0 new warnings. 2026-08-26. |

| ID | Title | Status | Files |
|---|---|---|---|
| **CR-348** | Custom item GST % + Tax Calc wired | **IMPLEMENTED** | `AddCustomItemModal.jsx` · `orderTransform.js` · `OrderEntry.jsx` |
| **CR-350** | Room check-in ID upload mandatory toggle (localStorage Phase 1) | **IMPLEMENTED** | `StatusConfigPage.jsx` · `RoomCheckInModal.jsx` |
| **BUG-358** | Sidebar state persisted across reloads | **IMPLEMENTED** | `DashboardPage.jsx` |
| **BUG-360** | Room checkout reads live `remainingRoomBalance` instead of stale `balancePayment` | **IMPLEMENTED** | `CollectPaymentPanel.jsx` · `RoomRowCard.jsx` |

---

### 2026-08-26 — Batch Intake (BUG-351 → BUG-359) from INVESTIGATION_REPORT_BATCH_2026_08_26

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-351** | Room Check-In: Doc upload required even for CRM-verified guests | P1 | HIGH | **IMPLEMENTED** | 5 ✅ | `RoomCheckInModal.jsx:611-616,1051-1052` — `crmDocuments.length===0` guard on validation + JSX render. Upload row hidden + validation skipped when CRM docs on file. CR-350 idUploadRequired gate also applied. 2026-08-26. |
| **BUG-352** | OrderTable: Amount column `w-24` too narrow — overlaps Change button | P2 | LOW | **IMPLEMENTED** | 5 ✅ | `OrderTable.jsx:143,157` — `w-24`→`w-32` both column sets. `// BUG-352` markers. 2026-08-26. |
| **BUG-353** | OrderReportBetaPage: Date range capped at 1 month | P2 | MEDIUM | **INTAKE — BACKEND-BLOCKED** | 1 ✅ | No FE limit found; hypothesis: backend cap on ORDER_REPORT_BETA_COMBINED. Needs backend confirm. Intake: `change_requests/BUG-353_ORDER_REPORT_BETA_DATE_RANGE_LIMIT_INTAKE.md` |
| **BUG-354** | OrderReportBetaPage: Status column null for some order types | P2 | MEDIUM | **INTAKE** | 1 ✅ | `deriveStatus()` returns null for edge-case fOrderStatus values. Needs live test. Intake: `change_requests/BUG-354_ORDER_REPORT_BETA_STATUS_COLUMN_MISSING_INTAKE.md` |
| **BUG-355** | PurchaseReportPage: Payment_Type `'paid'` legacy records show ₹0 on cards | P1 | MEDIUM | **PARKED — owner decision** | 1 ✅ | Owner 2026-08-26: no change to display-side mapping. Submit-side fix (SmartPurchasePanel paymentType now sends method name) already shipped. Historical records with `'paid'` accepted as-is. |
| **BUG-356** | Customer name/phone not saved on order | P1 | HIGH | **INTAKE — NEEDS LIVE TEST** | 1 ✅ | `CartPanel.jsx:846-847` — `customer` prop may be stale when `placeOrder` fires for manual entry vs CRM lookup. Intake: `change_requests/BUG-356_CUSTOMER_DATA_NOT_SAVED_ON_ORDER_INTAKE.md` |
| **BUG-357** | Room check-in: Advance > room price blocked FE-only | P2 | LOW | **IMPLEMENTED** | 5 ✅ | `RoomCheckInModal.jsx:632-633` — advance>roomPrice guard removed. `// BUG-357` comment. Backend allows advance > room price. 2026-08-26. |
| **BUG-358** | Sidebar collapsed state lost on every reload | P2 | LOW | **IMPLEMENTED** | 5 ✅ | `DashboardPage.jsx:451` — localStorage-backed `useState` init + `setIsExpanded` wrapper writes on toggle. `mygenie_sidebar_expanded` key. 2026-08-26. |
| **BUG-359** | Settings Tax Cleanup (misdiagnosis resolved — settings UI dead fields) | P2 | **MEDIUM** | **IMPLEMENTED** | 5 ✅ | `RestaurantSettingsPage.jsx` + `ProductForm.jsx` + `BulkEditor.jsx`. Removed GST Mode + GST Tax% + Tax% from Step 4. Removed Inclusive from ProductForm taxCalc. Removed taxCalc column + renderer from BulkEditor. Save payloads send safe Exclusive/0 defaults. No order calc changes. 2026-08-26. |

---

### 2026-08-22 — BUG-340 (Popular Tab Empty Chips)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-340** | Popular tab items render as empty chips — `adaptProduct()` receives raw API format (id/name/price) instead of transformed MenuContext format (productId/productName/basePrice) | P1 | HIGH | **IMPLEMENTED — QA PASS** | 5b ✅ | Fix: load popular items at boot (LoadingPage→productFromAPI.product()→MenuContext.popularProducts[]→OrderEntry.useMenu(). getFilteredItems popular branch: `popularProducts.map(adaptProduct)`. 4 files: constants.js + LoadingPage.jsx + MenuContext.jsx + OrderEntry.jsx. // BUG-340. QA: iteration_5.json 100% PASS. |

---



| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-323** | BulkEditor: False dirty state — categoryId=0 falsy coercion | P1 | MEDIUM | **IMPLEMENTED** | 5a ✅ | `BulkEditor.jsx:324` — `o.categoryId !== Number(row.categoryId)` — when `categoryId=0`, `0\|\|null=null`, `null !== 0 = TRUE` → perpetual false dirty. Fix: `Number(o.categoryId ?? 0) !== Number(row.categoryId ?? 0)`. DATA_EDGE. 37/108 Aggregator foods affected. Source: INVESTIGATION_COMPLETE (session handover 2026-08-15). // BUG-323 |
| **BUG-324** | BulkEditor: `isRowDirty` stale closure — menuType always "Normal" | P2 | MEDIUM | **IMPLEMENTED** | 5a ✅ | `BulkEditor.jsx:372` — `useCallback` deps missing `menuType`. Created once at mount with menuType="Normal". In Aggregator mode swiggy/zomato/clientId dirty checks silently skipped. Fix: add `menuType` to deps array `[isDirty, menuType]`. CODE_ERROR (pre-existing ESLint warning). Source: INVESTIGATION_COMPLETE (session handover 2026-08-15). // BUG-324 |

---

**Last Updated (prev):** 2026-08-14 (BUG-322 INTAKE — Recipe Form SearchableSelect ingredient dropdown clipped by overflow-hidden table container; P1 LOW; 1 file; Fast Lane eligible; Related: BUG-236, BUG-238)

---

### 2026-08-14 — BUG-322 (Recipe Form Ingredient Dropdown Clipped)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-322** | Recipe Form — SearchableSelect ingredient dropdown clipped by `overflow-hidden` table container | P1 | LOW | **IMPLEMENTED** | 5a ✅ | `SearchableSelect` (local, `RecipeFormPanel.jsx:12-82`) uses `position:absolute` (L46). Ingredient table container (L305) has `overflow-hidden` → clips dropdown. ALL recipe types broken (sub/standard/addon ingredient rows). X clear-search button also inaccessible. Working: Addon Item + Menu Item dropdowns (top card L227, no overflow-hidden). Code reality: NONE. Fix: position:fixed + getBoundingClientRect on trigger button (identical to BUG-311 L1). 1 file, ~12 lines. DISTINCT. Related: BUG-236 (same pattern Smart Purchase), BUG-238 (introduced SearchableSelect). Intake: `change_requests/BUG-322_RECIPE_SEARCHABLESELECT_OVERFLOW_INTAKE.md`. Investigation: `BUG-322_SEARCHABLESELECT_OVERFLOW_INVESTIGATION.md`. Fast Lane eligible (owner GO needed). |

---

**Last Updated (prev):** 2026-08-13 (BUG-314 INTAKE — Inventory Setup categories/units not loading: Promise.all atomic failure when get-inventory-master 404. P1 MEDIUM. 1 file fix. BUG-315 INTAKE — Printer Config numeric inputs can't be cleared to retype. P2 LOW. 2 files. BUG-316 INTAKE — Font dropdown empty (available_fonts null from API). P1 LOW. Fast Lane eligible. BUG-317 INTAKE — Android size fields reject values > 8; OD-D override by owner. P2 LOW. Fast Lane eligible. BUG-318 INTAKE — Aggregator auto-print keys missing from printer agent UI + saves to wrong API; OD-B reversed. P1 MEDIUM. Full Gate 2-3 needed. BUG-319 INTAKE — Footer text hardcoded in print agent; backend-only fix. P2 LOW.) 


---


### 2026-08-14 — BUG-321 (Sub-Recipe Stock Semantic Fix)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-321** | Sub-Recipe Stock Panel — Produce/Recount mode (IMPLEMENTED 2026-08-14) (every save adds qty; drift is UI lie; physical_qty gate needed) | P1 | MEDIUM | **GATE 3 COMPLETE — Awaiting Gate 4 GO** | 3 ✅ | Two issues: A) SubRecipeStockPanel sends quantity=ADD but shows drift/wastage UI (wrong). B) StockAuditPanel.jsx:71 physicalQty=qty → spurious wastage on sub-recipe branch once transform fixed. Fix: mode toggle (Produce/Recount) in SubRecipeStockPanel + conditional physical_qty in transform + StockAuditPanel fix. 3 files. Impact: BUG-SRSTOCK_IMPACT_ANALYSIS.md. Plan: BUG-SRSTOCK_IMPLEMENTATION_PLAN.md. Evidence: 6 curl probes in probe_results.json. DISTINCT from BUG-308/320/CR-139. |


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
| BUG-236 | Smart Purchase — Ad-hoc Typeahead Dropdown Clipped by overflow-hidden | P1 | LOW | **IMPLEMENTED** | 5a ✅ | E1: removed `overflow-hidden` from Section 1 card (L130). E2+E3: `z-10`→`z-50` on both dropdown divs (L42, L47) inside `AdHocTypeahead`. 1 file. Impact: `impact/BUG-236_ADHOC_DROPDOWN_IMPACT_ANALYSIS.md`. Plan: `plans/BUG-236_ADHOC_DROPDOWN_IMPLEMENTATION_PLAN.md`. // BUG-236 2026-08-14 |


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



### 2026-08-13 Implementation — Inventory Batch (BUG-309 to BUG-320)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-309 | Bulk Edit: Min Unit type=number drops unit string | P1 | HIGH | **IMPLEMENTED** | 5a ✅ | `IngredientBulkEditor.jsx:442` input→span. // BUG-309 |
| BUG-310 | Bulk Edit: Conversion field invisible styling | P2 | LOW | **IMPLEMENTED** | 5a ✅ | `IngredientBulkEditor.jsx:296` numCls Option A. // BUG-310 |
| BUG-311 | No duplicate detection (All layers: L1 typeahead + L2 add-guard + L3 bulk-save-guard + L1B edit-form + L4 bulk-typeahead + **L5 bulk-Save-disable + L5b handleSave-edited-guard**) | P1 | MEDIUM | **IMPLEMENTED** | 5a ✅ | L1: `IngredientNameCombobox` typeahead in `InventorySetupPanel.jsx`. L2: `isDuplicate` guard. L3: dup skip `IngredientBulkEditor.jsx:192`. L1B: Edit form typeahead + Save disable. L4: BulkEditor name cell combobox. **L5: `hasDuplicateInDirty` useMemo (L103) + both Save buttons disabled (L346, L519). L5b: handleSave EDITED-row guard (L220). `IngredientBulkEditor.jsx`. 2026-08-15** |
| BUG-314 | Inventory Setup Promise.allSettled | P1 | MEDIUM | **IMPLEMENTED** | 5a ✅ | `InventorySetupPanel.jsx:42`. Backend 404→200 also fixed. // BUG-314 |
| BUG-320 | Sub-Recipe Stock physical_qty extra key | P2 | LOW | **IMPLEMENTED** | 5a ✅ | `SubRecipeStockPanel.jsx:94` + `inventoryTransform.js:227`. // BUG-320 |



### 2026-08-13 Implementation — Printer Batch (BUG-315 to BUG-318)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-315 | Printer Config: Numeric inputs snap-back fixed (local display state) | P2 | LOW | **IMPLEMENTED** | 5a ✅ | `shared.jsx` NumberInput + `PrintStyleTab.jsx` StyleInput → stateful with localVal+useEffect. // BUG-315 |
| BUG-316 | Printer Config: Font dropdown populated (FALLBACK_FONTS) | P1 | LOW | **IMPLEMENTED** | 5a ✅ | `printerAgentConfigTransform.js` FALLBACK_FONTS constant + conditional fonts line. // BUG-316 |
| BUG-317 | Printer Config: Android size fields uncapped (max removed) | P2 | LOW | **IMPLEMENTED** | 5a ✅ | `PrintStyleTab.jsx` subtitle "Min: 1" + `max={maxScale}` removed from 3 android fields. // BUG-317 |
| BUG-318 | Printer Config: Aggregator auto-print section restored in AutoPrintTab | P1 | MEDIUM | **IMPLEMENTED** | 5a ✅ | `AutoPrintTab.jsx` full rewrite — banner removed, useNavigate removed, Aggregator Orders section added (2 toggles + conditional SelectInput). `printerAgentConfigTransform.js` FALLBACK_AGGREGATOR_STAGES. // BUG-318 |
| BUG-319 | Footer text hardcoded in print agent | P2 | LOW | BACKEND-BLOCKED | — | No FE change — backend brief needed |


### 2026-08-13 Intake — Inventory + Printer + Sub-Recipe Batch (BUG-314 → BUG-320)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| BUG-314 | Inventory Setup: Categories (0) + Unit dropdown empty — Promise.all atomic failure when get-inventory-master 404 | P1 | MEDIUM | **INTAKE** | 0-1 ✅ | `InventorySetupPanel.jsx:42` Promise.all rejects on getIngredients() 404 → cats+units never set. Fix: Promise.allSettled. Backend ask: return 200+[] not 404. 1 file. Fast-lane eligible with owner approval. Investigation: `BUG-314_INV_SETUP_DROPDOWN_INVESTIGATION_REPORT.md`. Evidence: owner@thegoankitchen.com screenshot + curl. |
| BUG-315 | Printer Config: Numeric inputs snap back — can't clear "1" to retype | P2 | LOW | **INTAKE** | 0-1 ✅ | `StyleInput` (PrintStyleTab) + `NumberInput` (shared.jsx): `if (raw==='') return` on controlled input → state unchanged → React reverts. Fix: local display state. 2 files, ~15 lines each. Related to CR-133 Gap G4 (incomplete fix). |
| BUG-316 | Printer Config: Font Family dropdown empty (available_fonts: null from API) | P1 | LOW | **INTAKE** | 0-1 ✅ | `printerAgentConfigTransform.js:253` — `gs.available_fonts \|\| []` → empty array. Fix: hardcode 11-font fallback list per owner spec. 1 file, 3 lines. Fast-lane eligible. |
| BUG-317 | Printer Config: Android size fields reject values >8 (max constraint from [1,8] default) | P2 | LOW | **INTAKE** | 0-1 ✅ | `PrintStyleTab.jsx:116` maxScale=8 → `max={8}` on Logo/UPI/FdbkQR inputs. Owner now accepts 44/46/23. Override of CR-133 Gap OD-D. 1 file, 5 lines. Fast-lane eligible. |
| BUG-318 | Aggregator auto-print keys (auto_kot/bill/stage) missing from printer UI + save to wrong API | P1 | MEDIUM | **INTAKE** | 0-1 ✅ | CR-133 OD-B moved these to AggregatorSetup. AggregatorSetup→update-settings; printer agent reads printer-agent-config (auto_print={}). Transform correct. Fix: re-add 3 fields to AutoPrintTab. Owner reversing OD-B. Full Gate 2-3. Open Q: keep in both UIs? |
| BUG-319 | Printer Config: Footer text hardcoded "Powered by MyGenie" in print agent firmware | P2 | LOW | **INTAKE — BACKEND-BLOCKED** | 0-1 ✅ | API returns bill_footer.footer_text correctly. Physical print agent ignores it. Backend brief needed. Owner Q: hide FE field until fixed? |
| BUG-320 | Sub-Recipe Stock: physical_qty incorrectly sent in add-sub-recipe-stock payload | P2 | LOW | **INTAKE** | 0-1 ✅ | `SubRecipeStockPanel.jsx:94` physicalQty=qty → `inventoryTransform.js:232` physical_qty in payload. physical_qty is ingredient audit concept, not applicable to sub-recipe produced-qty. Always mirrors quantity (redundant). Fix: remove 2 lines (1 per file). DISTINCT. |


### 2026-08-11 P&L Report + Item Discount GST + Aggregator Setup (BUG-303 to BUG-307)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-303** | P&L Report — "Paid Revenue" KPI always shows ₹0 (field mismatch: `s.paid_revenue` vs `s.total_paid_revenue`) | **P2** | **LOW** | **IMPLEMENTED — QA PASS** | 1-5b ✅ | 1 file `PLReportPage.jsx`. 4 issues fixed: DollarSign→IndianRupee, paid_revenue field, date sort. |
| **BUG-304** | Item-Level Discount — `discountRatio` uses `itemTotal` (not `discountableTotal`), GST/VAT wrong for non-discountable items | **P1** | **HIGH** | **IMPLEMENTED — QA PASS (Gate 5b)** | 1-5b ✅ | `CollectPaymentPanel.jsx` + `CartPanel.jsx`. taxTotals split into dSgst/dCgst/dVat. CGST/SGST drop ₹4→₹3.60 on 10% discount verified. Plan: `plans/BUG-304_IMPLEMENTATION_PLAN.md`. |
| **BUG-305** | `orderTransform.js` — `discountRatio` uses full subtotal in `calcOrderTotals` + `buildBillPrintPayload`: wrong GST in backend payload and bill print | **P1** | **CRITICAL** | **IMPLEMENTED — QA PASS (Gate 5b)** | 1-5b ✅ | 1 file, 3 edits. `buildCartItem` `_giveDiscount` marker + `calcOrderTotals` discountableRatio split + `buildBillPrintPayload` split. iteration_12+13. Plan: `plans/BUG-305_IMPLEMENTATION_PLAN.md`. |
| **BUG-306** | Aggregator Setup shows "Network Error" / blank when GET /aggregator-config ERR_NETWORK | **P1** | **MEDIUM** | **IMPLEMENTED — QA PASS (Gate 5b)** | 1-5b ✅ | `AggregatorSetupView.jsx`: `isNoConfig = err?.response?.status===404 \|\| !err?.response`. iteration_15 100% PASS. |
| **BUG-307** | Aggregator Setup: `tone_timing` (notification duration seconds) not mapped in UI | **P1** | **LOW** | **IMPLEMENTED — QA PASS (Gate 5b)** | 1-5b ✅ | `aggregatorConfigTransform.js` fromAPI+toAPI + `ConfigTab.jsx` "Notification Settings" card. iteration_15 100% PASS. |

---

### 2026-08-06 Food Court vs Item Sales Revenue Mismatch (BUG-296)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-296** | Food Court Report vs Item-Wise Report — Data Mismatch (rid=598, Shimla QoH Food Court, June 2026) | **P1** | **HIGH** | **QA PASS — Gate 5b 2026-08-12 (Round 3)** | 0-INV ✅, Gate 2 ✅, Gate 3 ✅, Gate 4 GO ✅, 5a ✅ | 1 file `foodCourtService.js`, 3 edits: E1 L105 cache key `created_at`→`collect_bill` // BUG-296, E2 L108 `sort_by` `created_at`→`collect_bill` // BUG-296, E3 L129 `itemTotal` add `.filter(foodStatus!==3)` // BUG-296. E1+E2 atomic. Self-test V1-V10 ALL PASS. Revenue verified: ZORKO ₹5,74,715 / Total ₹18,37,701.34 / Orders 6,152. Compile: 1 pre-existing warning, 0 new. EXIT GATE 5/5. QA: `handover/QA_HANDOVER_BUG296_2026_08_06.md`. Plan: `plans/BUG-296_IMPLEMENTATION_PLAN.md`. | RC1 (by design): 1,739/6,152 orders (28%) cross-station → order count 8,306 vs 6,152 — intentional food court model, no fix. RC2a (FIX): sort_by created_at→collect_bill in `foodCourtService.js:fetchChunk`. RC2b (FIX): exclude foodStatus=3 from itemTotal in `foodCourtService.js:toStationRow`. Live validated: TAB=0, service_charge=0, unassigned_items=0, comp=0. After both fixes gap=₹0.00 per station (CREAMBELLPARLOUR ₹2,42,458 / GUPTAJEE ₹7,18,535 / MSB ₹3,01,993 / ZORKO ₹5,74,715 / TOTAL ₹18,37,701). 1 file, 2 edits. Credentials: `owner@shimlaqohfoodcourt.com` / `Qplazm@10`. Report: `investigation/BUG-296_INVESTIGATION_REPORT.md`. Evidence: `evidence/BUG-296/live_validation_2026_08_06.json`. Handover: `handover/SESSION_HANDOVER_2026_08_06_BUG296_DEEP_INVESTIGATION.md` |

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
| **BUG-273** | Auto Settle Local Settings Removal — Now Server-Side | **P2** | MEDIUM | **IMPLEMENTED 2026-08-22** | 5a ✅ | 12 edits across 4 files + 1 deleted: StatusConfigPage (constants+state+localStorage+toggle UI removed), DashboardPage (R5 — full queue processor+enqueue useEffect+cleanup removed, ~90 lines), OrderCard + TableCard (inline localStorage condition removed, Settle button always visible), autoSettlePrefs.js (deleted). Compile PASS. EXIT GATE 5/5. // BUG-273 |

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


---

### 2026-08-13 Inventory Module Investigation Session (BUG-308 → BUG-313)

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-308** | Sub-Recipe Stock: `addStock()` called instead of `addSubRecipeStock()` in StockAuditPanel | **P1** | MEDIUM | **IMPLEMENTED** | 5a ✅ | 4 files: `constants.js` (+ADD_SUB_RECIPE_STOCK), `inventoryTransform.js` (+toAPI.addSubRecipeStock), `inventoryService.js` (+addSubRecipeStock fn), `StockAuditPanel.jsx` (routing guard). Testing iteration_1: 5/5 PASS. Sub-gap: condition requires `subrecipeId != null` — see BUG-315 if needed. |
| **BUG-309** | Ingredient Bulk Edit: Min Unit `<input type="number">` drops unit string — data loss on save | **P1** | **HIGH** | **INTAKE** | 1 | 1 file: `IngredientBulkEditor.jsx:430-433`. Fix: change to read-only span locked to smallUnit (matches BUG-269-C card view pattern). Planning skip eligible. |
| **BUG-310** | Ingredient Bulk Edit: Conversion field transparent styling looks like static text | **P2** | LOW | **INTAKE** | 1 | 1 file: `IngredientBulkEditor.jsx:286-288`. `numCls(false)` = `border-transparent bg-transparent`. Visual only. Planning skip eligible. |
| **BUG-311** | Ingredient Add/Bulk Edit: No duplicate detection (missing typeahead + pre-save check + bulk editor guard) | **P1** | MEDIUM | **INTAKE** | 1 | 2 files: `InventorySetupPanel.jsx` (addIngredient — no isDuplicate), `IngredientBulkEditor.jsx` (handleSave — no dupe check). Layer 3 (typeahead) needs full Gate 2-3. Layers 1+2 fast-lane eligible. |
| **BUG-312** | `fromAPI.ingredients()` missing `isSubRecipe`/`subrecipeId` — root cause for all sub-recipe misrouting | **P1** | **HIGH** | **SUBSUMED into CR-139** | — | Absorbed as CR-139 Phase A. Will be implemented as part of CR-139 bundle. Owner decision: 2026-08-13. |
| **BUG-313** | Sub-recipe appears in Stock Update auto-plan + `addPurchase()` called for all rows (no sub-recipe routing) | **P1** | **HIGH** | **SUBSUMED into CR-139** | — | Absorbed as CR-139 Phase B. Will be implemented as part of CR-139 bundle. Owner decision: 2026-08-13. |


### CR-139 Implementation (2026-08-13)
| ID | Status | Notes |
|---|---|---|
| **BUG-312** | **IMPLEMENTED** via CR-139 Phase A | `inventoryTransform.js`: +`isSubRecipe`+`subrecipeId` to `fromAPI.ingredients()` |
| **BUG-313** | **IMPLEMENTED** via CR-139 Phases B1-B4 | `purchasePlanner.js` dual G9, `AutoShoppingList.jsx` filter, `PurchaseEntryPanel.jsx` dropdown filter, `SmartPurchasePanel.jsx` comment marker |

### GAP-BULK-DEFAULTS CellRenderer Fix (2026-08-15)
| ID | Status | Notes |
|---|---|---|
| **GAP-BULK-DEFAULTS** | **IMPLEMENTED** | `BulkEditor.jsx`: `addon_expand`/`var_expand`/`image` CellRenderer handlers moved to top-level from inside `dropdown` block (were structurally unreachable). Cells now render chips/thumbnails instead of `—`. |

### New Bugs Registered 2026-08-17
| ID | Title | Severity | Risk | Status | Sprint |
|---|---|---|---|---|---|
| **BUG-325** | Variation Stock tab: `val.available` from API not rendered — enable/disable status invisible | P2 | LOW | INVESTIGATION COMPLETE | pos_5_0 |
| **BUG-326** | Aggregator food: transform reads `packed_food` (null/legacy) not `is_packaged_good`; `swiggy_packing_chrg` absent | P1 | MEDIUM | INVESTIGATION COMPLETE | pos_5_0 |

### BUG-325 + BUG-326 Planning Complete 2026-08-17
| ID | Status | Gate | Notes |
|---|---|---|---|
| **BUG-325** | GATE 3 COMPLETE — AWAITING GATE 4 GO | 3 | Impact: `impact/BUG-325_IMPACT_ANALYSIS.md` · Plan: `plans/BUG-325_IMPLEMENTATION_PLAN.md` |
| **BUG-326** | GATE 3 COMPLETE — AWAITING GATE 4 GO | 3 | Impact: `impact/BUG-326_IMPACT_ANALYSIS.md` · Plan: `plans/BUG-326_IMPLEMENTATION_PLAN.md` |

### IMPLEMENTED 2026-08-17
| ID | Status | Notes |
|---|---|---|
| **BUG-325** | **IMPLEMENTED** | `VariationStockTab.jsx`: `val.available` badge (Active/Inactive, green/red) inserted between label and En button — additive only |
| **BUG-326** | **IMPLEMENTED** | `menuManagementTransform.js`: read `is_packaged_good??packed_food` + `swiggyPackingChrg`; write `is_packaged_good`+`swiggy_packing_chrg` in Aggregator spread. `BulkEditor.jsx`: +column, +buildRow, +buildPayload keys, +isDirty. `ProductForm.jsx`: +state, +Platform Sync toggle. `ProductCard.jsx`: +state, +conditional select |

### BUG-327 Registered 2026-08-17 (P0 — Preprod Broken)
| ID | Title | Severity | Risk | Status |
|---|---|---|---|---|
| **BUG-327** | Aggregator image gaps (swiggy_image not wired) + **PREPROD foods-list BROKEN** (backend cleanBindings TypeError from orphaned aggregator_food records 13312–13315) | P0 | HIGH | INVESTIGATION COMPLETE — BACKEND FIX NEEDED FIRST |

### BUG-327 Planning Complete 2026-08-17
| ID | Status | Gate | Notes |
|---|---|---|---|
| **BUG-327** | GATE 3 COMPLETE — AWAITING GATE 4 GO (BACKEND FIX FIRST) | 3 | Impact: `impact/BUG-327_IMPACT_ANALYSIS.md` · Plan: `plans/BUG-327_IMPLEMENTATION_PLAN.md` · Backend brief: `backend_briefs/BACKEND_BRIEF_BUG-327_2026-08-17.md` |

### BUG-327 IMPLEMENTED 2026-08-17
| ID | Status | Notes |
|---|---|---|
| **BUG-327** | **IMPLEMENTED** | `menuManagementTransform.js`: +`swiggyImage`. `menuManagementService.js`: +`addFoodAggregatorMultipart()` +`editFoodAggregator()` (flat multipart, skip variations/addon_ids). `ProductForm.jsx`: +`swiggyImageFile`/`swiggyImagePreview` state, +Swiggy image upload UI (aggregator only), save path → new services. `ProductList.jsx`: `handleQuickSave` aggregator → `editFoodAggregator`. `BulkEditor.jsx`: `processOne` aggregator new/edit → new services. NOTE: QA blocked until backend fixes orphaned `aggregator_food` records 13312–13315 to restore preprod. |

---

### 2026-08-18 Multi-Issue Intake Batch (from Investigation INV-AUG18-2026)

**Last Updated:** 2026-08-18 — 6 bugs + 1 CR registered from investigation session. Source: INV-AUG18-2026_INVESTIGATION_REPORT.md

| Bug ID | Title | Priority | Risk | Status | Gate | Notes |
|---|---|---|---|---|---|---|
| **BUG-328** | Phone on Bill: Wrong Number Prints on Receipt | P1 | HIGH | **INTAKE** | 1 ✅ | Two separate phone fields: `basic.phone_number_on_bill` (settings API) ≠ `restaurant_information.phone_number` (printer config API). Printer agent reads wrong field. BACKEND_BUG. Backend brief needed. 0 FE files. `BUG-328_PHONE_ON_BILL_WRONG_NUMBER_INTAKE.md` |
| **BUG-329** | Discount Report: Discount Reason/Type Missing | P2 | MEDIUM | **INTAKE** | 1 ✅ | `insights-discounts` API has no `by_reason[]`. Report has no reason column. `discountFor=null` in QSR flow. FEATURE_GAP. RELATED: CR-137. Backend brief + FE column needed. `BUG-329_DISCOUNT_REPORT_REASON_MISSING_INTAKE.md` |
| **BUG-330** | Cancel After Serve Setting Not Gated in FE | P1 | HIGH | **INTAKE** | 1 ✅ | `allowPostServeCancel` mapped in profileTransform ✓ but `OrderEntry.jsx:307` gates cancel on `hasPermission('food')` only — never reads `cancellation.allowPostServeCancel`. 1 file ~3 lines. Planning skip eligible (owner GO needed). `BUG-330_CANCEL_AFTER_SERVE_NOT_GATED_INTAKE.md` |
| **BUG-331** | Schedule Order Setting Not Gated in FE | P1 | MEDIUM | **INTAKE** | 1 ✅ | `schedule_order` NOT in profileTransform → not in context. CartPanel schedule toggle always renders. 2 files ~5 lines. Gate 2-3 required. RELATED: CR-018. `BUG-331_SCHEDULE_ORDER_NOT_GATED_INTAKE.md` |
| **BUG-332** | Search By Setting Not Consumed in FE | P2 | MEDIUM | **INTAKE** | 1 ✅ | `searchOptions` correctly mapped in profileTransform but ZERO UI consumers. Search options always show all. Search UI component TBD. Gate 2-3. `BUG-332_SEARCH_BY_SETTING_NOT_CONSUMED_INTAKE.md` |
| **BUG-333** | Printer Style Tab: Row Labels Generic (Row 1/2/3/4) | P2 | LOW | **INTAKE — BLOCKED (owner mapping needed)** | 1 ✅ | `humanize(rowKey)` renders `row_1`→"Row 1" instead of "Restaurant Name" etc. 1 file `PrintStyleTab.jsx`, add `LABEL_MAP`. Fast Lane eligible once owner provides mapping (OQ-1/2/3). `BUG-333_PRINTER_STYLE_TAB_ROW_LABELS_INTAKE.md` |

| **BUG-336** | GST Applied on Bills Even When Disabled in Restaurant Settings | P0 | CRITICAL | **QA PASS — Gate 5b** | 5b ✅ | `taxTotals` useMemo in `CollectPaymentPanel.jsx` lacked `gstStatus` gate. Added per-item `taxType === 'GST' && gstStatus === false` guard + updated deps. 2026-08-18. `BATCH-01_IMPACT_ANALYSIS.md`, `BATCH-01_IMPLEMENTATION_PLAN.md` |
| **BUG-337** | Profile Not Refreshed After Restaurant Settings Save | P1 | HIGH | **QA PASS — Gate 5b** | 5b ✅ | `RestaurantSettingsPage.jsx` never called `getProfile()+setRestaurant()` after save. Added await getProfile() + setRestaurant(fresh.restaurant) in try/catch before navigate. 2026-08-18. `BATCH-01_IMPACT_ANALYSIS.md`, `BATCH-01_IMPLEMENTATION_PLAN.md` |
| **BUG-338** | Room GST Applied When roomGstApplicable = false | P1 | HIGH | **QA PASS — Gate 5b** | 5b ✅ | Same `taxTotals` block as BUG-336. Added `isRoom && roomGstApplicable === false` guard on GST items. 2026-08-18. `BATCH-01_IMPACT_ANALYSIS.md`, `BATCH-01_IMPLEMENTATION_PLAN.md` |
| **BUG-339** | Restaurant Type Select Missing "Food Court" Option | P1 | LOW | **IMPLEMENTED** | 5a ✅ | `RestaurantSettingsPage.jsx:386` — added `{ value: 'food_court', label: 'Food Court' }` to options array. 2026-08-19. `BATCH-02_IMPL_PLAN.md` |
| **BUG-329** | Discount Report: Discount Reason/Type Missing | P2 | MEDIUM | **IMPLEMENTED** | 5a ✅ | `DiscountReportMockup.jsx` — parse `rawData.orders_table`, render Discount Orders table with `discount_for` column. 2026-08-19. `BATCH-02_IMPL_PLAN.md` |
| **BUG-331** | Schedule Order Setting Not Gated in Frontend | P1 | MEDIUM | **IMPLEMENTED** | 5a ✅ | `profileTransform.js` +`scheduleOrderEnabled`. `CartPanel.jsx` +`useRestaurant` import + `features?.scheduleOrderEnabled !== false` gate. 2026-08-19. |
| **BUG-330** | Cancel After Serve Setting Not Gated in Frontend | P1 | HIGH | **IMPLEMENTED** | 5a ✅ | `OrderEntry.jsx:322-324` — `isItemCancelAllowed` now gates on `item.status !== 'preparing' && allowPostServeCancel === false`. 2026-08-19. |
| **BUG-332** | Search By Setting Not Consumed in Frontend | P2 | MEDIUM | **IMPLEMENTED** | 5a ✅ | `DashboardPage.jsx` — `searchOptions` from `useRestaurant`, `opts` filter in `searchResults` useMemo, deps updated. 2026-08-19. |

---

### 2026-09-02 — BUG-376 (Role Add/Update Contract Gaps)

| Field | Value |
|---|---|
| **ID** | BUG-376 |
| **Title** | Role Add/Update: 5 API Contract Gaps — `modules` missing role type prefix · `role_master_id` always null · `role_type` IDs vs strings |
| **Priority** | P1 |
| **Risk** | HIGH |
| **Status** | **IMPLEMENTED — 2026-09-02** |
| **Related** | CR-069 (original build) · BUG-235 (partial fix) · CR-096 (partial fix) · BUG-231 (UI hide) |
| **Source** | AGENT-DISCOVERED via dev team backend spec (add-update.md) + live API probe |
| **Sub-A** | `modules` missing role type string as `modules[0]` — `toAPI.createRole/updateRole` sends permissions only | CRITICAL |
| **Sub-B** | `role_master_id` hardcoded `null` in `handleSave` — template ID never stored in state | HIGH |
| **Sub-C** | `role_type` sends numeric IDs `[1,2,3,4,5,6]`; backend expects string values `["Manager"]` | HIGH |
| **Sub-D** | `fromAPI.role` never reads `modules[0]` to derive role type; BUG-235 fills with all IDs instead | HIGH |
| **Sub-E** | "Clear All" on edit drops role type from `modules` | MEDIUM |
| **Blast radius** | SMALL (2 files: `roleTransform.js` + `RoleFormView.jsx`, ~25 lines) |
| **Intake doc** | `change_requests/BUG-376_ROLE_ADD_UPDATE_CONTRACT_GAPS_INTAKE.md` |
| **Investigation** | `handover/INVESTIGATION_EMPLOYEE_ROLE_ADDUPDATE_2026_09_02.md` |
| **OD-1** | Sub-E: Should "Clear All" always preserve role type? (**Recommended: YES**) |

**BUG-376 OD-1 Update (2026-09-02):** OD-1 ANSWERED — Yes, "Clear All" always preserves role type. Role type is structural, not a permission. Gate 3 unblocked.
