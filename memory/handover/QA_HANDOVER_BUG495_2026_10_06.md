# QA Handover — BUG-495
**Date:** 2026-10-06
**Implemented by:** IMPLEMENTATION agent (E1)
**Risk:** HIGH
**Files changed:** CheckInForm.jsx · CheckInPage.jsx · FolioCheckoutPanel.jsx (3 files, 4 edit sites)

---

## 1. Inherited Verification Matrix (Self-Test Results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E-495-1 | CheckInForm.jsx L68 | `// BUG-495` marker + GST-aware formula | ✅ grep confirmed |
| E-495-2 | CheckInPage.jsx L271 | `// BUG-495` marker + computeRoomGst on advance | ✅ grep confirmed |
| E-495-3 | FolioCheckoutPanel.jsx L53 | `// BUG-495` marker + LR-derived gstRate | ✅ grep confirmed |
| E-495-4 | FolioCheckoutPanel.jsx L229 | `// BUG-492 Sub-B + BUG-495` + maxPctParent formula | ✅ grep confirmed |
| COMPILE | All 3 files | webpack 0 new warnings | ✅ PASS (1 pre-existing only) |

---

## 2. Functional Test Cases

**Test scenario:** Room ₹1,500, advance ₹300, GST 5%
- gstRate = (sgst+cgst)/booking_charge = 0.05
- gstOnAdvance = 300 × 0.05 = ₹15
- maxDiscount = 1500 − 300 − 15 = ₹1,185
- maxPct = floor(1185/1500×100) = **79%** ✅ (was 80% with BUG-492 formula)

| # | Test Case | Location | Steps | Expected | Notes |
|---|-----------|----------|-------|----------|-------|
| TC-495-01 | GST hotel maxPct = 79% | CheckInForm Bill panel | Open Bill for in-house guest (RID 69, #000325 or any GST hotel order with advance). Enter % discount. Note the alert threshold | Alert fires at 80%, not at 79% | Confirm alert: "…over 79%…" |
| TC-495-02 | GST hotel maxPct = 79% | CheckInPage | On Check-In page with GST hotel booking, set discount type=Percent, enter 80% | Alert appears: over max | — |
| TC-495-03 | GST hotel maxPct = 79% | FolioCheckoutPanel | Open Bill panel from In-House tab, set Percent discount=80% | Alert fires + LOG IN button disabled | — |
| TC-495-04 | handlePaid blocked at 80% | FolioCheckoutPanel | Same as TC-495-03 — try to click Pay button at 80% | Button disabled / handlePaid does NOT proceed | — |
| TC-495-05 | Non-GST hotel unchanged | Any | Booking ₹1,500, advance ₹300, GST NOT applicable (roomGstApplicable=false) | maxPct = floor((1500−300−0)/1500×100) = 80% (unchanged from BUG-492) | Regression: non-GST behaviour intact |
| TC-495-06 | Amount mode unaffected | Any | Switch discount type to Amount | max cap = balance_due (unchanged); no GST formula involved | Regression |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| REG-1 | BUG-492 Sub-B alert JSX still renders | Alert logic unchanged — only the threshold (maxPct) is different |
| REG-2 | BUG-490 Amount cap unchanged | max attr on Amount input not touched |
| REG-3 | BUG-493 GST in Bill panel (sgst/cgst lines) | pmsService.js untouched |
| REG-4 | Check-In form submit still works at ≤79% | formValid guard intact — discountOverMax=false → submit allowed |

---

## 4. Registry Sync Confirmation

| Field | Value |
|-------|-------|
| Registry synced | YES |
| BUG-495 status | GATE_5A_IMPLEMENTED |
| Sprint key | oct_bug_batch |
| BUG_TRACKER updated | YES |
| FILE_OWNERSHIP updated | YES |
| Code markers | 4 × `// BUG-495` (3 files) |
| EXIT GATE | 5/5 PASS |

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL (preview) | `https://core-pos-react-6.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Key orders | #000325 (89% discount, bp=0) · #000324 (100% intent, bp=0) |
| In-house tab | `/pms/front-desk-v2?tab=inhouse` |
| Bill panel | Click "Bill" on any in-house row |
