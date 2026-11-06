# QA HANDOVER — CR-513 + BUG-592 (2026-11-06)

**Items:** CR-513 (discount_percentage + roundoff on bill print; absorbs CR-487, CR-502) · BUG-592 FE fix (no raw-% fallback)
**Plan:** `plans/CR-513_BUG-592_IMPLEMENTATION_PLAN.md` · **IA:** `impact/CR-513_IMPACT_ANALYSIS.md`
**Risk:** CRITICAL · 3 R5 hotspot files → regression + 2 cross-flow tests required

## 1. Inherited from Plan (Verification Matrix results)
| Edit | File | Verification | Self-Test Result |
|---|---|---|:---:|
| E1 | orderTransform.js L234-235 | U6 (630 ₹ read), U7 (no % fallback) | PASS ✅ |
| E2 | orderTransform.js ~L2167-2170 | U1-U5, U8 | PASS ✅ |
| E3 | CollectPaymentPanel.jsx ~L1310-1314 | Browser Network — Print Bill | NOT RUN (QA) |
| E4a-c | OrderEntry.jsx L1724/1769/1848 (QSR; paymentData from CartPanel L520-570) | Browser Network | NOT RUN (QA) |
| E4d | OrderEntry.jsx L2299 (prepaid auto-print) | Browser Network | NOT RUN (QA) |
| E4e | OrderEntry.jsx L2587 (postpaid collect auto-print) | Browser Network | NOT RUN (QA) |

Unit: `orderTransform.cr513.test.js` 8/8 PASS. Related suites: 105/106. The 1 failure is pre-existing and unrelated: `orderTransform.roomInfo.test.js` "order_amount PRESENT when roomBalance > 0" fails identically on the unmodified code (stash-verified).

## 2. Test cases (browser — DevTools Network, request `order-temp-store`)
| # | Test | Expected |
|---|---|---|
| T1 | Collect Payment, manual 30% → Print Bill | `discount_percentage: 30`; `roundoff` = UI round-off (signed); `discount_amount` = ₹ value |
| T2 | Manual flat ₹ discount → Print Bill | `discount_percentage` absent |
| T3 | Preset category % → Print Bill | `discount_percentage` = preset % |
| T4 | No discount, total with paise ≥ 10 → Print Bill | `discount_percentage` absent; `roundoff` > 0 |
| T5 | Total with paise < 10 (e.g. ₹x.04) | `roundoff` negative |
| T6 | Exact-rupee total | `roundoff` absent |
| T7 | Prepaid Place+Pay with % discount (auto-bill ON) | both keys present |
| T8 | Postpaid Collect Bill with % discount (auto-bill ON) | both keys present |
| T9 | QSR quick bill with % discount | both keys present |
| T10 | Dashboard card reprint of a discounted order (#021113 / #021114) | neither new key; `discount_amount` = 630 / 135 (not 30) |

## 3. Regression
| # | Verify | Why |
|---|---|---|
| R1 | All other `order-temp-store` keys/values unchanged vs before (tip, coupon, SC, GST, cgst/sgst, totals) | additive-only change |
| R2 | Runtime complimentary item prints at ₹0 (BUG-641/BUG-021) | same builder |
| R3 | Place order → Collect Bill → settle → Audit report shows the order | cross-flow |
| R4 | Dashboard loads with no error boundary (BUG-652) | recent hotfix |

## 4. Registry Sync Confirmation
Registry synced: YES · Items: CR-513, BUG-592 · Sprint: nov_cr_batch · EXIT GATE: 5/5 PASSED

## 5. Credentials + Environment
Account: cafe103 manager alias (see `control/test_credentials.md`) · Preview URL: `REACT_APP_BACKEND_URL` in `/app/frontend/.env` · Backend: preprod.mygenie.online
