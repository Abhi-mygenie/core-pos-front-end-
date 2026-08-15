# QA Handover — BUG-269 (Ingredient Form 3 UX Bugs)

**Date:** 2026-07-28
**Items:** BUG-269
**Self-test:** 9/9 edits verified
**Registry synced:** YES
**EXIT GATE:** 5/5 PASS

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|:---:|------|-------------|:---:|
| 1 | inventoryTransform.js:130-131 | hasConversion guard (unit≠smallUnit) | ✅ PASS |
| 2 | InventorySetupPanel.jsx:16 | UNIT_SMALL_MAP defined | ✅ PASS |
| 3 | InventorySetupPanel.jsx:309 | ADD: kg→gm, ltr→ml auto-select | ✅ PASS |
| 4 | InventorySetupPanel.jsx:321 | ADD: smallUnit syncs alert | ✅ PASS |
| 5 | InventorySetupPanel.jsx:330-334 | ADD: alert is read-only span | ✅ PASS |
| 6 | InventorySetupPanel.jsx:365 | EDIT: kg→gm, ltr→ml auto-select | ✅ PASS |
| 7 | InventorySetupPanel.jsx:377 | EDIT: smallUnit syncs alert | ✅ PASS |
| 8 | InventorySetupPanel.jsx:386-390 | EDIT: alert is read-only span | ✅ PASS |
| 9 | InventorySetupPanel.jsx:153-157 | startEdit syncs minUnitAlert=smallUnit | ✅ PASS |

## 2. Additional test cases
None — all cases covered by plan matrix.

## 3. Regression tests
| # | What to verify | Why |
|---|---|---|
| 1 | Existing ingredient edit/save still works | startEdit changed minUnitAlert logic |
| 2 | Add ingredient with no conversion (piece/piece) | hasConversion guard must not break non-conversion adds |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: BUG-269
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED

## 5. Credentials + Environment
Account: owner@kunafamahal.com / Qplazm@10
URL: https://pos-frontend-dev-5.preview.emergentagent.com
API: https://preprod.mygenie.online
