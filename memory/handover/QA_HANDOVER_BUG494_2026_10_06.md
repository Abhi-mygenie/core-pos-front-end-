# QA Handover — BUG-494
**Date:** 2026-10-06
**Implemented by:** IMPLEMENTATION agent (E1)
**Risk:** CRITICAL
**Files changed:** FolioCheckoutPanel.jsx (1 file, 8 edit sites)

---

## 1. Inherited Verification Matrix (Self-Test Results)

| Edit | Location | Verification | Self-Test Result |
|------|----------|-------------|:---:|
| E-494-1 | L16 | `computeRoomGst` import present | ✅ grep confirmed |
| E-494-2 | L40 | RoomSection signature has `baseBalance = null` | ✅ grep confirmed |
| E-494-3 | L165-169 | `displaySgst ?? c.sgst`, `displayCgst ?? c.cgst`, `baseBalance ?? Number(c.balance_due)` | ✅ grep confirmed |
| E-494-4 | L176 | Statement signature has `baseBalance, displaySgst, displayCgst` | ✅ grep confirmed |
| E-494-5 | L191 | RoomSection call has `baseBalance={baseBalance}` | ✅ grep confirmed |
| E-494-6 | L254 | `// BUG-494: folio-based balance` useMemo present | ✅ grep confirmed |
| E-494-7 | L350 | Statement JSX call has `baseBalance={baseBalance}` | ✅ grep confirmed |
| E-494-8 | L372 | `// BUG-494 Sub-C` roomInfo override present | ✅ grep confirmed |
| COMPILE | All | webpack 0 new warnings | ✅ PASS (1 pre-existing only) |

---

## 2. Functional Test Cases

**Primary test order:** #000325 (RID 69, 89% discount, `balancePayment=0`)

| # | Test Case | Steps | Expected | Severity if FAIL |
|---|-----------|-------|----------|-----------------|
| TC-494-01 | Room balance = ₹0 for 89% discount order | Open Bill panel → In-House → "Bill" on order #000325 | `bill-room-balance` shows ₹0 (not ₹1,716) | BLOCKER |
| TC-494-02 | SGST = ₹0 for 89% discount order | Same panel | `bill-room-sgst` shows ₹0 (not ₹48) | BLOCKER |
| TC-494-03 | CGST = ₹0 for 89% discount order | Same panel | `bill-room-cgst` shows ₹0 (not ₹48) | BLOCKER |
| TC-494-04 | Checkout button total = ₹0 | Same panel, CollectPaymentPanel right side | Checkout shows ₹0 due (not ₹1,716) | BLOCKER |
| TC-494-05 | Partial discount (bp>0) — balance correct | Open Bill for order #000324 or any with partial discount | `bill-room-balance` = discounted price + GST (not stale LR value) | MAJOR |
| TC-494-06 | No discount — values unchanged | Open Bill for order with no check-in discount | SGST/CGST/balance identical to before (null-coalescing fallback) | MAJOR |
| TC-494-07 | folio loading state — no flash | Open Bill panel, observe SGST/CGST while folio loads | Shows stale LR values briefly (bp=null → fallback), then updates correctly | MINOR |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| REG-1 | BUG-492 Sub-B maxPct alert still fires at correct % | discountOverMax useMemo untouched |
| REG-2 | BUG-492 Sub-A Checkout total still subtracts room discount | roomInfo override now uses baseBalance instead of charge.balance_due, but still subtracts roomDiscountInfoRs |
| REG-3 | BUG-493 GST waived on BALANCE column (bp=0) | pmsService.js untouched |
| REG-4 | BUG-495 maxPct GST-aware formula | RoomSection signature change is additive — maxPct useMemo unchanged |
| REG-5 | Non-room Bill panel | isRoom guard — non-room orders never reach Statement/RoomSection |

---

## 4. Registry Sync Confirmation

| Field | Value |
|-------|-------|
| Registry synced | YES |
| BUG-494 status | GATE_5A_IMPLEMENTED |
| Sprint key | oct_bug_batch |
| BUG_TRACKER updated | YES |
| FILE_OWNERSHIP updated | YES |
| Code markers | 8 × `// BUG-494` in FolioCheckoutPanel.jsx |
| EXIT GATE | 5/5 PASS |

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL (preview) | `https://core-pos-react-6.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Key orders | #000325 (89% discount, bp=0) · #000324 (100% intent, bp=0) · #000965 or any with no discount (fallback regression) |
| In-house tab | `/pms/front-desk-v2?tab=inhouse` |
| Bill panel | Click "Bill" on any in-house row |
