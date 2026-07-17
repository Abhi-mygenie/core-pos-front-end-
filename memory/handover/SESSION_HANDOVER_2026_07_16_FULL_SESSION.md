# Session Handover — 2026-07-16 (Deployment + BUG-197 Implementation + Investigation Batch + Intake Batch)

**Date:** 2026-07-16
**Roles:** DEPLOYMENT → PLANNING (BUG-197) → IMPLEMENTATION (BUG-197) → INVESTIGATION (6 issues) → INTAKE (BUG-198/199/200/201)
**Branch:** `16-july-` deployed locally
**Sprint:** POS 5.0

---

## 1. What shipped this session (code changes)

### BUG-197 — CR-072 Inventory Post-Delivery (10 gaps, 7 files, ~265 lines)

Full module audit found 4 additional gaps beyond the original 6 from investigation. All 10 implemented:

| # | Gap | Fix | File(s) |
|---|---|---|---|
| 1 | Add Ingredient — no UI | Added button + inline form in IngredientsTab | `InventorySetupPanel.jsx` |
| 2 | Add Vendor — no-op save | Added endpoint + service + transform + wired handleSave | `constants.js`, `inventoryService.js`, `inventoryTransform.js`, `InventorySetupPanel.jsx` |
| 3 | Wastage CRUD — was backend-blocked, now unblocked | Added 5 endpoints + 5 service functions + transforms + full CRUD UI | `constants.js`, `inventoryService.js`, `inventoryTransform.js`, `InventorySetupPanel.jsx` |
| 4 | Recipe Create — wrong fields | `name: data.foodId` (int), `serves_people` (with 's') | `recipeTransform.js` |
| 5 | Recipe Update — POST→PUT + wrong ingredient fields | `api.put()` + new `updateRecipe` transform with `id`/`qty` | `recipeService.js`, `recipeTransform.js` |
| 6 | Purchase — lowercase `amount` | `amount:` → `Amount:` | `inventoryTransform.js` |
| **7** | **fromAPI.recipes() missing foodId** — edit mode broken | Added `foodId: r.food_id` mapping + reverse-lookup from foods list | `recipeTransform.js`, `RecipeFormPanel.jsx` |
| **8** | **No foodId validation for standard recipes** | Added validation: require foodId for standard, addonId for addon | `RecipeFormPanel.jsx` |
| **9** | **Sub/Addon recipe update also POST** | Changed to `api.put()` + separate update transforms for both | `recipeService.js`, `recipeTransform.js` |
| **10** | **Addon dropdown sets foodId instead of addonId** | Separate dropdown for addon type → sets addonId | `RecipeFormPanel.jsx` |

**Compile:** PASS (1 pre-existing warning, 0 new)
**Self-test:** 13/13 grep verifications PASS

### Curl Verification Results (V1-V4)
- **V1 (GET /recipe/get-recipe):** Response has NO `food_id` field — only `name` (string) and `food_name`. Implemented reverse-lookup from active foods list by name match.
- **V4 (GET /wastage-reasons/list):** Response shape: `{ data: { reasons: [...], is_master, can_edit } }`. Each reason has `id`, `reason`, `status`. Transform updated to handle nested `data.reasons`.
- **V2/V3 (sub/addon update):** Token expired — applied same PUT pattern as standard recipe (same Laravel backend).

---

## 2. Investigations completed this session (no code — findings only)

### 6 issues investigated across 3 modules:

| # | Module | Issue | Root Cause | Confidence | Fix Size |
|---|---|---|---|---|---|
| A | Employee | Update name/phone/email doesn't save | `api.post()` → should be `api.put()` | HIGH | 1 line |
| B | Employee | Reset password fails (3 bugs stacked) | POST→PUT + partial payload + missing `password_confirmation` | HIGH | ~8 lines |
| C | Employee | Eye icon (show/hide password) missing | Never built — no toggle, no icons | HIGH | ~20 lines |
| D | Employee | Add employee fails | Missing `password_confirmation` + `status` in create payload | HIGH | 2 lines |
| E | Expense Report | Category filter returns 0 | Wrong query param name (needs curl verify) | MEDIUM | ~2 lines |
| F | Expense Entry | New item always goes to "misc" | `categoryId` never serialized to API payload | HIGH | 2 lines |

### Key Pattern: Laravel PUT for Updates
This codebase's Laravel backend **consistently uses PUT for all update endpoints**. Every CR that used POST for updates is broken:
- CR-072 recipes: POST → 405 (fixed in BUG-197)
- CR-069 employees: POST → silently fails (BUG-198, not yet fixed)

---

## 3. Bugs registered this session (intake)

| ID | Title | Severity | Risk | Status | Source |
|---|---|---|---|---|---|
| BUG-196 | Sidebar missing on 6 pages | P1 | LOW | IMPLEMENTED | Prior session |
| BUG-197 | CR-072 Inventory Post-Delivery (10 gaps) | P1 | HIGH | IMPLEMENTED | This session |
| **BUG-198** | **CR-069 Employee Post-Delivery (4 issues)** | **P1** | **HIGH** | **INTAKE** | This session |
| **BUG-199** | **Expense Entry: new item → misc category** | **P1** | **MEDIUM** | **INTAKE** | This session |
| **BUG-200** | **Expense Report: category filter broken** | **P1** | **MEDIUM** | **INTAKE** | This session |
| **BUG-201** | **Expense Deletion Safety: cascade warning + role gate** | **P1** | **HIGH** | **INTAKE** | This session |

---

## 4. Open Questions for Next Agent (owner to answer)

### BUG-198 (Employee)
- **OQ-1:** Does backend have a dedicated `/employee/reset-password/{id}` endpoint? If yes, use that for password reset instead of the generic update endpoint.
- **OQ-2:** Does backend require `password_confirmation` on employee create? (curl verify: `POST /employees-add` with and without `password_confirmation`)

### BUG-199 (Expense Entry)
- **OQ-1:** Does backend `/store-expense-details` accept `category_id` at the detail-line level? (curl verify with fresh token)

### BUG-200 (Expense Report)
- **OQ-1:** What query parameter does backend `/expenses-report` accept for category filtering? (`category_id`? `category`? `category_name`?) — curl verify needed

### BUG-201 (Expense Deletion)
- **OQ-1:** Does backend have a pre-delete check endpoint that returns transaction count for an item?
- **OQ-2:** Does backend cascade-adjust aggregation totals when transactions are deleted?

---

## 5. Next session priorities (recommended order)

1. **P0 — BUG-198 (Employee CRUD fixes)** — All 4 operations broken. ~30 lines, 4 files. Needs curl verification for OQ-1/OQ-2 first. Planning → Implementation.
2. **P0 — BUG-199 (Expense category serialization)** — Fast Lane eligible (2 lines, 2 files). Needs curl verify OQ-1. If confirmed → direct fix.
3. **P1 — BUG-200 (Expense Report filter)** — Needs curl verify to find correct param name. ~2 lines once confirmed.
4. **P1 — BUG-201 Phase 1 (Deletion safety dialog)** — ~40 lines. Needs OQ-1 answer (pre-delete check endpoint?).
5. **P2 — BUG-197 QA** — Inventory module fixes need formal QA on preprod with real credentials.
6. **P2 — CR-073 (Recipe Bulk Editor)** — Gate 3 complete, awaiting Gate 4 GO.

---

## 6. Registry/doc updates this session

| Artifact | Path | Status |
|---|---|---|
| BUG-197 impact | `impact/BUG-197_IMPACT_ANALYSIS.md` | Created (v3) |
| BUG-197 plan | `plans/BUG-197_IMPLEMENTATION_PLAN.md` | Created (v3) |
| BUG-198 intake | `change_requests/BUG_198_CR069_EMPLOYEE_POST_DELIVERY.md` | Created |
| BUG-199 intake | `change_requests/BUG_199_EXPENSE_ENTRY_CATEGORY_MISC.md` | Created |
| BUG-200 intake | `change_requests/BUG_200_EXPENSE_REPORT_CATEGORY_FILTER.md` | Created |
| BUG-201 intake | `change_requests/BUG_201_EXPENSE_DELETION_SAFETY.md` | Created |
| BUG_TRACKER.md | `control/BUG_TRACKER.md` | Updated (+6 rows: BUG-196→201) |
| registry.json | `control/registry.json` | Updated (+6 items, total: 308) |

---

## 7. Environment

| Service | Status | Notes |
|---|---|---|
| Frontend | RUNNING (port 3000) | `16-july-` branch, webpack compiled with 1 pre-existing warning |
| Backend | RUNNING (port 8001) | Default server.py (not used by this app) |
| MongoDB | RUNNING | Not used by this app |
| Preview URL | https://react-pos-frontend-3.preview.emergentagent.com | Live |
| API | https://preprod.mygenie.online | External |
| Socket | https://presocket.mygenie.online | External |

---

## 8. Credentials

See `/app/memory/control/test_credentials.md` — owner@18march.com / *** verified working.
API Bearer token used this session expired during investigation (auth-001 on some endpoints). Next agent needs fresh login.

---

## 9. Critical context for next agent

- **BUG-197 code is deployed but NOT QA-tested on preprod** — webpack compiles, grep verifications pass, but no live API testing was done (token expired). Priority: smoke-test recipe create/edit, purchase entry, vendor add, wastage CRUD, ingredient add.
- **Laravel PUT pattern is systemic** — any future CR that ships POST for update endpoints will hit the same bug. Consider adding to AGENT_PROMPT_ALPHA as a rule: "R-NEW: Backend uses PUT for all update endpoints. Never use api.post() for update operations."
- **`food_id` field missing from recipe GET response** — implemented reverse-lookup by name. If backend ever adds `food_id` to the GET response, update `fromAPI.recipes()` to use it directly (more reliable than name match).
