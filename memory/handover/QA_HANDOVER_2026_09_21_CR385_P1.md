# QA HANDOVER — CR-385 Phase 1 (M7 + M2) + BUG-440 — 2026-09-21

## 1. Inherited from plan (§1.3 tests + owner Phase 1 GO mandates) — self-test results
| Edit | File | Verification | Self-test |
|---|---|---|---|
| E8 | `ChannelManagerPage.jsx` L22/L27/L469–472 | 5th tab renders `FrontDeskRulesTab`; tabs 0–3 untouched | PASS (screenshot + it.11 M7-1) |
| E10 | `restaurantSettingsService.js` L34–53 | multipart `data` snapshot + explicit header (D75) | PASS (unit; it.11 wire capture) |
| NEW | `FrontDeskRulesTab.jsx` | load → toggle/radio → Save → re-read; ends at defaults | PASS (it.11 M7-2/3) |
| E4/E5 | `CancelBookingDialog.jsx` / `NoShowDialog.jsx` `inline` | no `fixed` inline; overlay when not | PASS (unit; it.11/12) |
| NEW | `frontDeskService.js` L34–42 | cancel/noShow re-export, `modifyReservation` PATCH, `previewModifyReservation` adds `preview:true` | PASS (unit) |
| NEW | `ModifyBookingForm.jsx` | preview body `preview:true`; confirm body no `preview`/`amount_after_tax`; 500 ms debounce serialised; AC-11 guard; figures from `charge` | PASS (unit 4 cases; live 17:11–17:12) |
| M2 wiring | `ArrivalsPanel.jsx` | XOR by `nsOrCancel`; expansion kinds; OutcomeCard + Phase 2 ribbon; target shapes copied from ArrivalsPage L273–274 | PASS (unit 3; it.11 M2-1/M2-7; it.12 C-1/2/5) |
| M2 wiring | `FrontDeskWorkstationPage.jsx` | `expanded.kind`, `openExpansion`, `afterAction` toast→close→refetch; alert `kind` | PASS (it.12: LR refetch after cancel/modify) |
| Mandate | legacy `ArrivalsPage` snapshot | source snapshot, no `inline` | PASS (unit) |
| BUG-440 | `CancelBookingDialog.jsx` L19–21/L28/L84 | reasons `{reasons:[{reasonId,reasonText}]}` → option renders, Confirm enables, reason text posted | PASS (unit 2; it.12 C-1/C-2/C-3 dropdown) |

Self-test: 10/10 edits verified · unit 58/58 (`yarn test --testPathPattern=cr385`) · `yarn build` exit 0, 0 new warnings · grep guards (X-01/X-06) empty.

## 2. Additional cases discovered during implementation
| # | Test | Expected |
|---|---|---|
| A1 | Preview persistence: 3+ previews then LR re-read | row unchanged (PASS, evidence `phase1_qa/m2_lr_reread_after_previews.json`) |
| A2 | Legacy `/pms/arrivals` Cancel Confirm | **500** — BUG-441 (not P1 code) |
| A3 | Modify → row shows `SR ●` afterwards | backend appends `"| MODIFY: …"` to `special_requests` (BQ-385-23) |

## 3. Regression
Phase 0 matrix (tiles/chips/tabs/Esc/↑↓/search) · legacy `/pms/arrivals` overlay dialogs · POS untouched (no hotspot file changed: `git log -1 -- CollectPaymentPanel.jsx orderTransform.js pmsService.js` unchanged).

## 4. Registry sync confirmation
Registry synced: YES · Items: CR-385 (GATE_5B_QA_PASSED P0+P0.5+P1), BUG-440 (FIXED + QA-VERIFIED), BUG-441 (INTAKE) · Sprint: pos_pms_2 · EXIT GATE: 5/5 (registry ✓ · CR_REGISTRY/BUG_TRACKER ✓ · FILE_OWNERSHIP ✓ · code markers `// CR-385 M7|M2`, `// CR-385 M2 BUG-440` ✓ · compile ✓).

## 5. Credentials + environment
OWNER_TGK — `memory/test_credentials.md` (never paste values) · preprod RID 69 sandbox-pms · preview URL = `frontend/.env` REACT_APP_BACKEND_URL · rooms r4/r5/r1 only · settings must end at defaults · sandbox left clean (222/223/224 cancelled).
