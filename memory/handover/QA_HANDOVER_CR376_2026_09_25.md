# QA Handover — CR-376
## POS Order Entry: Menu Switch

**Date:** 2026-09-25
**Implementation agent:** IMPLEMENTATION (ALPHA v0.7 Role 3)
**Sprint:** `sep_bug_closure`
**Risk:** MEDIUM

---

## 1. Inherited from Plan — Verification Matrix Results

| V# | Edit | File | Verification | Self-Test |
|---|---|---|---|---|
| V1 | E1 | `productTransform.js` | `=== 'Normal'` gone → `!== 'Aggregator'` at L47 | ✅ grep confirms |
| V2 | E2 | `activeMenuPrefs.js` | File exists, exports `getActiveMenuType`, `setActiveMenuType`, `ACTIVE_MENU_TYPE_KEY` | ✅ grep confirms 3 exports |
| V3 | E3 | `MenuContext.jsx` | `activeMenuProducts`, `availableMenuTypes`, `activeMenuType` in value + deps | ✅ grep: 10 hits |
| V4 | E4a | `OrderEntry.jsx` | L57 destructures `activeMenuProducts` and `activeMenuType` | ✅ confirmed |
| V5 | E4b | `OrderEntry.jsx` | "all" + category branches use `activeMenuProducts` | ✅ L558+L560 |
| V6 | E4b | `OrderEntry.jsx` | `AddCustomItemModal` at L2851 still `products={products}` (intentional) | ✅ confirmed |
| V7 | E4c | `OrderEntry.jsx` | `data-testid="active-menu-type-chip"` at L1725 | ✅ confirmed |
| V8 | E5 | `StatusConfigPage.jsx` | `ACTIVE_MENU_TYPE_KEY` constant, `activeMenuTypeSetting` state, `setActiveMenuType()` in save | ✅ 8 hits |
| V9 | E5h | `StatusConfigPage.jsx` | `availableMenuTypes.length > 1 &&` gates UI section at L1015 | ✅ confirmed |
| V10 | ~~E6~~ | ~~`LoadingPage.jsx`~~ | DROPPED — OD-376-09=(a) | N/A |
| V11 | ~~E7~~ | ~~`useRefreshAllData.js`~~ | DROPPED — OD-376-09=(a) | N/A |
| V12 | ALL | webpack | `webpack compiled with 1 warning` (pre-existing `isScheduled` — not CR-376) | ✅ 0 new warnings |
| V13 | E4d | `OrderEntry.jsx` | `data-testid="active-menu-empty-state"` at L1801 | ✅ confirmed |
| V14 | E4e | `OrderEntry.jsx` | L2867 `menuItems=` uses `activeMenuProducts` (OD-376-07=a) | ✅ confirmed |

---

## 2. Browser Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | **Normal-only restaurant — zero change** | Login as cafe103 (Normal-only). Open Order Entry. Check Local Settings. | Active Menu section NOT visible (V16). Item grid identical to before. |
| T2 | **Multi-menu: Active Menu section visible** | Login as QA_OWNER (Normal + Premium). Go to Local Settings (StatusConfigPage). | Active Menu card-row visible with Normal + Premium pills. Normal selected by default. |
| T3 | **Switch to Premium** | T2 → click Premium pill → Save. | `localStorage.getItem('mygenie_active_menu_type')` === `'Premium'`. |
| T4 | **Order Entry shows Premium items** | After T3, open any order. | Item grid shows only Premium items. Header chip "Premium Menu" visible. |
| T5 | **Switch back to Normal** | T3 → click Normal pill → Save → open order. | Item grid shows Normal items. No chip. |
| T6 | **Empty-state** | Set active menu to a type with 0 items → open order. | Empty-state message shows: "X menu has no items configured. Please update in Local Settings." |
| T7 | **Aggregator excluded** | If restaurant has Aggregator items — never appear in POS regardless of active menu. | No Aggregator items in any menu pill grid. |
| T8 | **CustomerModal Smart Suggestions** | T3 (Premium station). Open order. Open customer modal. | CRM suggestions resolve only against Premium items; Normal-item suggestions are silently skipped. |
| T9 | **QA_HYATT multi-menu** | Login as QA_HYATT. Go to Local Settings. | 10 pills rendered (FOOD MENU, Bar & Drinks, Breakfast, etc.), Normal first then alphabetical. |
| T10 | **QA_HYATT first boot empty-state** | QA_HYATT with no `mygenie_active_menu_type` in localStorage. Open order. | Empty-state shown (no 'Normal' products). Expected Design A behaviour. |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Place order end-to-end on Normal station (cafe103) | E1 changed the product filter — must not break Normal-only flow |
| R2 | Popular tab still works | `popularProducts` branch untouched — confirm items still appear |
| R3 | AddCustomItemModal opens, correct categories | `products={products}` at L2851 intentionally unchanged — all non-Aggregator categories available |
| R4 | Local Settings saves/resets other toggles (QSR, room ID, weight prompt) | E5 added lines around existing save/reset — confirm no side effects |
| R5 | Settle a Normal-station order end-to-end | productTransform change must not affect cart/order payload |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-376
Status: GATE_5A_IMPLEMENTED (2026-09-25)
Sprint: sep_bug_closure
EXIT GATE: ALL 5 PASSED
  □1 Registry: UPDATED ✅
  □2 CR_REGISTRY.md: UPDATED ✅
  □3 FILE_OWNERSHIP.md: UPDATED ✅ (5 files)
  □4 Code markers: ✅ (2+1+10+6+8 = 27 CR-376 hits across 5 files)
  □5 Compile: ✅ (webpack compiled with 1 warning — pre-existing, not CR-376)
```

---

## 5. Credentials + Environment

| | Value |
|---|---|
| QA account (Normal+Premium) | QA_OWNER alias — `memory/test_credentials.md` |
| QA account (multi-menu hotel) | QA_HYATT alias — owner@hyatt.com (see `evidence/CR-376/CR-376_hyatt_probe_2026_09_25.json`) |
| Normal-only account | cafe103 — `memory/test_credentials.md` |
| Preview URL | https://react-pos-frontend-34.preview.emergentagent.com |
| API | https://preprod.mygenie.online |

**Special Gate 6 smoke step:** QA_HYATT on first boot (clear `mygenie_active_menu_type` from localStorage) → verify OD-376-06 empty-state shows correctly.
