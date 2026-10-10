# QA Handover — BUG-490 + BUG-491
**Date:** 2026-10-05
**Prepared by:** Implementation agent
**Items:** BUG-490 (MEDIUM, P1) + BUG-491 (HIGH, P1)
**Sprint:** oct_bug_batch
**EXIT GATE:** ALL 5 PASSED

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Change | How to Verify | Self-Test |
|------|------|--------|---------------|:---:|
| BUG-490 E1 | CheckInForm.jsx L57-67 | roomDiscountRs useMemo caps at `c.balance_due` | Code-verified: `Math.min(…, cap)` present | ✅ |
| BUG-490 E2 | CheckInForm.jsx L188 | `max` = `Number(c.balance_due\|\|0) \|\| undefined` | Code-verified | ✅ |
| BUG-491 Sub-B | CheckInForm.jsx L165-166 | `Math.max(0, balance_due − roomDiscountRs)` | Code-verified | ✅ |
| BUG-490 E3+E4 | CheckInPage.jsx L253-270 | `effectiveBalanceDue` useMemo + capped `roomDiscountRs` | Code-verified | ✅ |
| BUG-490 E5 | CheckInPage.jsx L889 | `max` = `effectiveBalanceDue \|\| undefined` | Code-verified | ✅ |
| BUG-491 E0 | FolioCheckoutPanel.jsx L5 | `useMemo` added to React import | Code-verified | ✅ |
| BUG-491 Sub-C useMemo | FolioCheckoutPanel.jsx L42-50 | `roomDiscountRs` useMemo in RoomSection | Code-verified | ✅ |
| BUG-491 Sub-C badge | FolioCheckoutPanel.jsx L66 | badge uses `roomDiscountRs` not raw state | Code-verified | ✅ |
| BUG-490 E6 | FolioCheckoutPanel.jsx L89 | `max` = `Number(c.balance_due\|\|0) \|\| undefined` | Code-verified | ✅ |
| BUG-490 E7 | FolioCheckoutPanel.jsx L92 | `onChange` clamps at `balance_due` | Code-verified | ✅ |
| BUG-491 Sub-B | FolioCheckoutPanel.jsx L146 | `Math.max(0, balance_due − roomDiscountRs)` | Code-verified | ✅ |
| BUG-491 Sub-A | pmsService.js L103-114 | `bp + chargeGst` formula with fallback | Code-verified | ✅ |
| BUG-491 Sub-D useMemo | FolioCheckoutPanel.jsx L196-204 | `roomDiscountInfoRs` useMemo in main component | Code-verified | ✅ |
| BUG-491 Sub-D JSX | FolioCheckoutPanel.jsx L291-296 | info note `data-testid="bill-room-discount-info"` | Code-verified | ✅ |

**Self-test result: 14/14 edits verified ✅ | Compile: PASS, 0 new warnings ✅**

---

## 2. Test Cases for QA

### BUG-490 — Discount cap

**Account:** `welcome_resort_rooms_settlement` (RID 474) or any in-house guest with advance payment  
**Path:** `/pms/front-desk-v2` → In-House → expand guest row → Bill

**TC-490-01: CheckInPage — Amount discount capped at effectiveBalanceDue**
1. Navigate to `/pms/check-in`, select an arrival with advance payment (e.g. advance ₹700, room ₹6,700, GST ₹335 → effectiveBalanceDue = ₹6,335)
2. In Room Discount row, select Amount mode
3. Type 9999
4. **Expected:** Input value is blocked/clamped at ₹6,335. Badge shows −₹6,335. Room discount cannot exceed outstanding balance.

**TC-490-02: CheckInPage — Percent discount capped**
1. Same setup as TC-490-01
2. Select Percent mode, type 100%
3. **Expected:** Badge shows −₹6,335 (not −₹6,700). Capped at effectiveBalanceDue.

**TC-490-03: CheckInForm (FD v2) — Amount discount capped at c.balance_due**
1. FD v2 → open a check-in drawer for an arrival with advance paid
2. Amount mode, type an amount exceeding balance_due
3. **Expected:** Input blocked at balance_due. Badge shows capped value.

**TC-490-04: FolioCheckoutPanel — Amount discount capped**
1. FD v2 → In-House → expand guest → Bill → Room Section
2. Amount mode, enter value exceeding balance_due
3. **Expected:** `onChange` clamps state at balance_due. `max` HTML attr blocks input above balance_due.

**TC-490-05: No-advance regression — cap at full booking_charge (no discount clamp)**
1. Open check-in for an arrival with NO advance payment (advance = 0)
2. effectiveBalanceDue = orderAmount + gstTotal (full amount)
3. Enter discount up to that amount
4. **Expected:** Discount allowed up to full balance. No spurious cap at 0.

---

### BUG-491 — Display corrections

**Account:** `welcome_resort_rooms_settlement` (RID 474)  
**Probe order:** 1232970 (parth r1 suite, RID 69) — confirmed `balance_payment: 2665, room_discount_amount: 2680`

**TC-491-01: Sub-A — In-House BALANCE column corrected**
1. Navigate to `/pms/front-desk-v2` → In-House tab
2. Find guest with a room discount applied (order 1232970 or equivalent)
3. **Expected:** BALANCE column shows ₹3,000 (= bp 2665 + chargeGst 335). Was ₹5,345 before fix.

**TC-491-02: Sub-A — Regression: no-discount guest BALANCE unchanged**
1. Find an in-house guest WITHOUT a room discount
2. **Expected:** BALANCE column correct (no regression from bp formula; fallback path used when `balance_payment` absent)

**TC-491-03: Sub-B CheckInForm — Balance due updates live**
1. FD v2 → check-in drawer for a guest with advance
2. Enter 40% discount
3. **Expected:** "Balance due" row in bill summary updates live (decreases as discount is typed). Was static before.

**TC-491-04: Sub-B FolioCheckoutPanel — Room balance updates live**
1. FD v2 → In-House → expand guest → Bill
2. Enter 10% room discount
3. **Expected:** "Room balance" line in left panel updates live. Was static before.

**TC-491-05: Sub-C — Checkout badge shows ₹ in Percent mode**
1. FD v2 → Bill → Room Section → Percent mode
2. Enter 10% (balance_due ≈ ₹5,680)
3. **Expected:** Badge shows −₹568 (not −₹10). `data-testid="bill-room-discount-applied"`.

**TC-491-06: Sub-C — Checkout badge Amount mode unchanged**
1. FD v2 → Bill → Room Section → Amount mode
2. Enter ₹500
3. **Expected:** Badge shows −₹500. No regression.

**TC-491-07: Sub-D — Info note appears in right panel**
1. FD v2 → Bill → Enter any room discount (room or both mode)
2. **Expected:** Green info note "Room discount applied: −₹XXX" appears at top of right panel (`data-testid="bill-room-discount-info"`). CollectPaymentPanel total (Checkout button) UNCHANGED.

**TC-491-08: Sub-D — Info note hidden when apply_to = food**
1. FD v2 → Bill → Room Section → select "F&B only" apply_to
2. **Expected:** Info note NOT visible. F&B discount only affects F&B panel.

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | CheckInForm: existing check-in with no discount flows normally | E1 cap logic must not affect no-discount path (cap = balance_due, raw = 0 → returns 0) |
| R2 | CheckInPage: `handleConfirm` payload sends correct `roomDiscountRs` (unchanged logic) | effectiveBalanceDue cap in useMemo must not affect the submit payload |
| R3 | FolioCheckoutPanel: `handlePaid` local `roomDiscountRs` (inside function) still correct | FolioCheckoutPanel's `handlePaid` has its own local `roomDiscountRs` — verify it still executes independently and sends correct payload |
| R4 | pmsService `getInHouseGuests`: non-discounted orders — BALANCE = roomBalance + transferredFnb + roomOrdersBalance | bp fallback path preserves original formula (minus discount) for non-discounted orders |
| R5 | Non-GST restaurant: chargeGst = 0, bp = balance_payment | Sub-A: `bp + 0 = bp` — balance unaffected for non-GST restaurants |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-490, BUG-491
Sprint: oct_bug_batch
Status: GATE_5A_IMPLEMENTED
EXIT GATE: ALL 5 PASSED
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | `https://mygenie-pos-frontend.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Login endpoint | `POST /api/v1/auth/vendoremployee/common-login` |
| Test login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Probe order (in-house, discount) | `order_id: 1232970` (parth r1 suite, room_discount_amount=2680, balance_payment=2665) |
| Rooms account (for advance) | `welcome_resort_rooms_settlement` alias → RID 474 |
| FD v2 path | `/pms/front-desk-v2` |
| Check-in path | `/pms/check-in` |
