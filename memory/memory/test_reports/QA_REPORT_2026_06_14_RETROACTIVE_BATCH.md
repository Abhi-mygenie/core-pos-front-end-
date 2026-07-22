# QA Report — POS 4.0 Retroactive Batch (7 Missed CRs)

**Date:** 2026-06-14
**Tester:** QA Agent (automated Playwright + code review + unit tests)
**Scope:** 7 CRs implemented but missed in POS 4.0 closure
**Test Account:** owner@welcomeresort.com (RID 474)
**Preview URL:** https://mygenie-pos-ui-3.preview.emergentagent.com

---

## SUMMARY

| Metric | Result |
|--------|--------|
| **Items tested** | 7/7 |
| **Unit tests** | **66/66 PASS** (CR-027: 24, CR-036: 31, CR-029: 11) |
| **Browser tests** | **15/15 PASS** |
| **Code review** | **All 7 verified** |
| **Regression** | **5/5 PASS** |
| **Overall** | **✅ ALL PASS** |

---

## PER-ITEM RESULTS

### CR-027 — Unified Toast Phase 1 ✅ PASS
- **27.1** Interceptor code review: 6-branch chain at axios.js:54-96 ✅
- **27.2** Wrong password → toast "Login Failed - Unauthorized." (readable, not JSON) ✅
- **27.3** ECONNABORTED branch present ✅
- **27.4** Unit tests: 24/24 PASS ✅

### CR-028 — Item-Level Discount ✅ PASS
- **28.1** productTransform.js:136 — giveDiscount mapped ✅
- **28.2** orderTransform.js:476-547 — distributeItemDiscounts() with largest-remainder ✅
- **28.3** orderTransform.js:1202-1234 — Place Order per-item injection ✅
- **28.4** orderTransform.js:1508-1542 — Collect Bill per-item injection ✅
- **28.5** CollectPaymentPanel.jsx:515-518 — discountableTotal excludes give_discount='No' ✅
- **28.6** CartPanel.jsx:360-394 — same exclusion ✅
- **28.7** CollectPaymentPanel.jsx:885-896 — coupon rejection ✅
- *(Write-operation browser test skipped per policy — code review substituted)*

### CR-036 — Bulk Editor Add Item Row ✅ PASS
- **36.1** + Add Item → new row at TOP ✅
- **36.2** Auto-focus on Name input ✅
- **36.3** Search filter bypass ✅
- **36.4** Unit tests: 31/31 PASS (covers CR-036 + FU-01/02/03) ✅

### CR-036-FU-01 — Validation UX ✅ PASS
- **FU01.1** Toast: "Row 1 — Name is required. +2 more on this row." ✅
- **FU01.2** Red border: border-l-4 border-l-red-500 ✅
- **FU01.3** Cell tint: bg-red-100/60 on failing cells ✅

### CR-036-FU-02 — Column Reorder ✅ PASS
- **FU02.1** Tax Type (index 6) before Tax % (index 7) ✅
- **FU02.2** "Sold By (Unit)" visible in default Tier 1 view ✅

### CR-036-FU-03 — Tax Validation + Backdrop ✅ PASS
- **FU03.1** gstRequired validation present ✅
- **FU03.2** Packed item exemption (packedFood === "Yes") ✅
- **FU03.4** profileTransform.js:175-176 — gstStatus exposed ✅

### CR-029-QSR — QSR Payload Parity ✅ PASS
- **QSR.1** CartPanel.jsx:421-423 — roundOff computation ✅
- **QSR.2** CartPanel.jsx:450 — roundOff threaded to payload ✅
- **QSR.3** orderTransform.js:1580 — round_up persistence ✅
- **QSR.4** Unit tests: 11/11 PASS ✅

---

## REGRESSION

| # | Test | Result |
|---|------|--------|
| R-1 | Dashboard loads (Dine-In + Room orders) | ✅ PASS |
| R-2 | Menu Management opens (772 products) | ✅ PASS |
| R-3 | Insights panel loads | ✅ PASS |
| R-4 | Settlement panel KPIs | ✅ PASS |
| R-5 | No blocking console errors | ✅ PASS |

---

*QA Report — 2026-06-14. Retroactive batch: 7/7 PASS. 66/66 unit tests. 15/15 browser tests. Ready for POS 4.0 closure.*
