# QA Handover — Wave 2 (Inventory Setup Cluster)
**Date:** 2026-07-23 | **Items:** BUG-226, BUG-219, BUG-220, BUG-218
**Files changed:** `inventoryTransform.js`, `InventorySetupPanel.jsx` (2 files)

## 1. Verification Matrix Results

| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| BUG-226 E1 | inventoryTransform.js:136 | `converion_factor` in addIngredient payload | ✅ Code verified |
| BUG-226 E2 | inventoryTransform.js:147 | updateIngredient marker comment | ✅ Code verified |
| BUG-219 E1-2 | inventoryTransform.js:27,72 | fromAPI keeps unit string | ✅ Code verified |
| BUG-219 E3-5 | inventoryTransform.js:135,149,183 | toAPI passes unit string | ✅ Code verified |
| BUG-219 E6 | InventorySetupPanel.jsx:345 | Add form: min unit → select dropdown | ✅ Code verified |
| BUG-219 E7 | InventorySetupPanel.jsx:~355 | Edit form: min unit → select dropdown | ✅ Code verified |
| BUG-219 E8-9 | InventorySetupPanel.jsx:~271,~323 | Dynamic conversion placeholders | ✅ Code verified |
| BUG-219 E10 | InventorySetupPanel.jsx:250 | Header "Min Alert (Qty · Unit)" | ✅ Code verified |
| BUG-219 E11 | InventorySetupPanel.jsx:381 | Display uses alert unit | ✅ Code verified |
| BUG-220 E1 | InventorySetupPanel.jsx:78 | Pre-call duplicate guard | ✅ Code verified |
| BUG-218 E1-4 | InventorySetupPanel.jsx:11,30,92-101,408-424 | Dialog import, state, catch parse, JSX | ✅ Code verified |

## 2. Test Cases

| # | Item | Test | Steps | Expected |
|---|------|------|-------|----------|
| T1 | BUG-226 | ADD CF=500 | Add ZZ_TEST ingredient with CF=500 → curl get-inventory-master → check `converion_factor` | `converion_factor: '500'` in response |
| T2 | BUG-226 | ADD blank CF | Add ingredient without CF → check | `converion_factor: '1'` (default) |
| T3 | BUG-219 | Min unit dropdown visible | Open add/edit ingredient form | Unit dropdown for min alert, NOT number input |
| T4 | BUG-219 | Edit preserves unit | Edit existing ingredient with min_unit_alert='gm' → pre-selects 'gm' in dropdown | Dropdown shows 'gm' selected |
| **T5 CRITICAL** | BUG-219 | No corruption on edit-save | Edit ingredient WITHOUT touching alert fields → save → curl get-inventory-master → `min_unit_alert` unchanged | Alert unit NOT corrupted to '0' or empty |
| T6 | BUG-219 | Display shows alert unit | Ingredient with minQtyAlert=5, minUnitAlert='gm' | Shows "5 gm" not "5 kg" |
| T7 | BUG-220 | Duplicate category toast | Type existing category name (case variant) → Add | Instant toast "already exists", no POST in Network |
| T8 | BUG-220 | New category OK | Genuinely new name → Add | 201, appears in sidebar |
| T9 | BUG-218 | Delete blocked ingredient | Delete "Base Cream" (used in recipes) → Delete | Dialog listing recipes, not generic toast |
| T10 | BUG-218 | Dialog Close | Click Close button | Dialog closes, state resets |
| T11 | BUG-218 | Delete unused ingredient | Delete ZZ_TEST ingredient (not in recipes) | Normal confirm + success toast |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Add ingredient full flow | All 7 fields save correctly |
| R2 | Edit ingredient full flow | Update saves correctly |
| R3 | Smart Purchase threshold | minQtyAlert (numeric) unchanged for BUG-224 |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: BUG-218, BUG-219, BUG-220, BUG-226
Sprint: pos_5_0
EXIT GATE: 5/5 PASSED

## 5. Credentials & Environment
- Frontend: https://react-app-preview-6.preview.emergentagent.com
- Backend API: https://preprod.mygenie.online/
- Test data: use ZZ_TEST names, delete after
