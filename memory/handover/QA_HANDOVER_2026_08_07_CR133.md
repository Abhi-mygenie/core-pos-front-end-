# QA Handover — 2026-08-07 — CR-133 Printer Agent Config

**Item:** CR-133 — Printer Agent Config Full Settings Screen (PrintersView rewrite)
**Implementation agent → QA.** Note: a full QA pass was ALREADY executed by the testing agent this session (report: `/app/test_reports/iteration_1.json`). This handover records results + the one remaining open item.

## 1. Inherited from Plan (Verification Matrix results)

| # | Check | How | Self-Test Result |
|---|-------|-----|:---:|
| V1 | Endpoint key exists | grep constants.js | PASS ✅ |
| V2 | fromAPI maps all editable fields | unit (5 tests) | PASS ✅ |
| V3 | Round-trip integrity (zero data loss) | unit (2 tests) | PASS ✅ HARD GATE |
| V4 | Decimal font sizes survive as float | unit | PASS ✅ |
| V5 | Edited fields → right path/type | unit (4 tests) | PASS ✅ |
| V6 | printer_configuration absent from POST | unit | PASS ✅ |
| V7 | Printer CRUD semantics | unit (3 tests) | PASS ✅ |
| V8 | GET renders: cards + 4 tabs populate | browser (testing agent) | PASS ✅ |
| V9 | Add printer wizard → Save → persists | browser+network (testing agent) | PASS ✅ (add persists; see §2 for delete) |
| V10 | Edit toggles/footer → Save → fresh GET reflects; hidden fields intact | browser+curl (testing agent) | PASS ✅ |
| V11 | Bill-printer delete warning; no-bill banner logic | browser (testing agent) | PASS ✅ |
| V12 | Regression: other settings tiles render | browser (testing agent) | PASS ✅ |
| V13 | Webpack compiles, 0 new warnings | log | PASS ✅ |

Unit suite: `printerAgentConfigTransform.test.js` — **20/20 pass** (16 plan tests + 4 reinjection-helper tests).
Pre-existing failures: 13 suites / 45 tests fail on baseline WITHOUT CR-133 changes (verified via git stash A/B) — unrelated paths, not CR-133 regressions.

## 2. Open item discovered during QA (CRITICAL — backend)

Preprod deep-merges `printers[]` by id: printer DELETE is silently ignored (add works). Confirmed via UI network capture + direct curl. Frontend mitigation shipped: post-save reconciliation toast ("Printer deletion not applied") via `findReinjectedPrinters()` — unit-tested, not yet browser-verified against live (verifying would create more residue on 478). Backend follow-up CR needed for true deletion.

## 3. Regression tests

| # | What to verify | Why |
|---|----------------|-----|
| 1 | Place order → KOT/bill print flow | orderTransform/printerAgentSelector untouched (V12 adjacent) |
| 2 | Other settings tiles (Operating Hours, Payment Methods, Discounts, Cancellation Reasons) | ListFormViews.jsx edited — PASS per testing agent |

## 4. Registry Sync Confirmation

Registry synced: YES
Items: CR-133 (status IMPLEMENTED, gate 5)
Sprint: pos_5_1
EXIT GATE: ALL 5 PASSED (registry.json ✅, CR_REGISTRY.md ✅, FILE_OWNERSHIP.md ✅, // CR-133 markers in 9 files ✅, webpack clean ✅)

## 5. Credentials + Environment

Account: owner@18march.com (password in /app/memory/test_credentials.md), restaurant 478
Preview URL: https://react-app-preview-9.preview.emergentagent.com → /settings → Printers tile
API: https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/printer-agent-config
Pre-test config snapshot: /app/memory/evidence/CR-133/get_response_pre_impl_selftest.json
Live residue on 478 (backend cleanup needed): printer_new_1786121623349 "QA Test Printer" + OD-6 leftover keys
