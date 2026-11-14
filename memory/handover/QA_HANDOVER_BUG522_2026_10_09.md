# QA HANDOVER — BUG-522
**Date:** 2026-10-09
**Files changed:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
**Registry:** GATE_5A_IMPLEMENTED | **EXIT GATE:** 5/5 PASS

---

## 1. What Changed

Room Discount in the Bill panel is now **independent** of CollectPaymentPanel's food discount:

- **Three-button selector (Room/Both/F&B only) removed** — Room Discount input always visible, always applies to room rent only
- **`roomApplyTo` state removed** — no more 'room'/'both'/'food' coupling
- **`foodDiscountRs` useMemo removed** — FolioCheckoutPanel no longer computes or sends food discount
- **`handlePaid` simplified** — dynamic `room_discount_apply_to`: `'room'` when room discount only, `'both'` when room + CPP food discount simultaneously
- **CollectPaymentPanel's ADJUSTMENTS > Discount** handles all F&B discount independently (unchanged)

---

## 2. Self-Test Results (Auto-Verified)

| Check | Result |
|---|---|
| `grep -c "roomApplyTo" $F` (live code) | 0 hits in live code ✅ (3 in comments only) |
| `grep -c "foodDiscountRs" $F` | 0 hits in live code ✅ (1 in comment only) |
| `grep -c "bill-apply-to-" $F` | 0 ✅ |
| `order_discount > 0` dynamic apply_to | L294 ✅ |
| webpack compile | 0 warnings ✅ |

---

## 3. Test Cases

**Test account:** `owner@thegoankitchen.com` / `Qplazm@10` (RID 69)
**URL:** `https://core-pos-front-6.preview.emergentagent.com/pms/front-desk-v2?tab=inhouse`
**Test booking:** bonk — MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D

### TC-522-1 — Three buttons gone (VISUAL)
- Open Bill panel for bonk
- **Expected:** ROOM DISCOUNT section shows only % / ₹ toggle + amount input + reason. No Room/Both/F&B only buttons
- **Severity:** BLOCKER if buttons still present

### TC-522-2 — Room discount: Amount mode
- Enter ₹200 flat room discount
- **Expected:** Left panel "Room discount: −₹200"; "Room discount applied: −₹200" green note on right; Room Balance updates to ₹400 in CPP grand total
- **Severity:** BLOCKER

### TC-522-3 — Room discount: Percent mode
- Switch to %, enter 17%
- **Expected:** roomDiscountInfoRs = floor(3000 × 17/100) = 510, capped at maxCheckoutDiscount=525 → ₹510; Left panel "Room discount: −₹510"
- **Severity:** BLOCKER

### TC-522-4 — maxCheckoutDiscount cap still works (BUG-517 regression)
- Enter ₹600 or more in Amount mode
- **Expected:** input clamps at 525 (maxCheckoutDiscount for bonk). Alert shown when % > 17%
- **Severity:** MAJOR

### TC-522-5 — CPP food discount independent (Scenario B)
- No room discount entered. Apply CPP ADJUSTMENTS > Discount (e.g. 10%)
- **Expected:** Food Total decreases in Grand Total. Room Balance unchanged.
- Network tab: `order_discount > 0`, `discount_value = 10`. No `room_discount_apply_to` in payload.
- **Severity:** BLOCKER

### TC-522-6 — Both simultaneously (Scenario C)
- Enter room discount ₹200 AND apply CPP ADJUSTMENTS > Discount 10%
- **Expected:** Network tab: `room_discount = 200`, `room_discount_apply_to = "both"`, `order_discount > 0`
- **Severity:** BLOCKER

### TC-522-7 — Room discount only payload (Scenario A)
- Enter room discount ₹200, no CPP discount
- **Expected:** Network tab: `room_discount = 200`, `room_discount_apply_to = "room"`, `order_discount = 0`
- **Severity:** BLOCKER

### TC-522-8 — Checkout without any discount
- No room discount, no CPP discount → Checkout
- **Expected:** No `room_discount` / `room_discount_apply_to` in payload
- **Severity:** MAJOR

### TC-522-9 — Split room payment still works
- Toggle "Split room payment" → On
- **Expected:** Split legs visible on right panel. Two payment mode rows available
- **Severity:** MAJOR

### TC-522-10 — Left panel read-only (regression BUG-519)
- Open Bill panel
- **Expected:** Left panel shows summary (booking amount, check-in discount, SGST/CGST etc). No inputs on left.
- **Severity:** MAJOR

---

## 4. Regression Tests

| # | What | Why |
|---|---|---|
| REG-1 | Checkout without discount completes | Room block guard must not fire when roomDiscount=0 |
| REG-2 | BUG-516: VAT label in room orders | folioTransform.js unchanged |
| REG-3 | BUG-517: maxCheckoutDiscount cap | roomDiscountInfoRs formula preserved |
| REG-4 | BUG-515: In-House expanded row | pmsService.js unchanged |

---

## 5. Registry Sync Confirmation

- Registry synced: YES
- Item: BUG-522
- Status: GATE_5A_IMPLEMENTED
- Sprint: oct_bug_batch
- EXIT GATE: 5/5 PASS

## 6. Credentials

| Account | Email | Password |
|---|---|---|
| Owner (The Goan Kitchen) | owner@thegoankitchen.com | Qplazm@10 |

- URL: https://core-pos-front-6.preview.emergentagent.com/pms/front-desk-v2?tab=inhouse
- Test booking: bonk — MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D (order 1233012, RID 69)
- bonk: booking_charge=₹3,000 · advance=₹1,500 · baseBalance=₹600 · maxCheckoutDiscount=₹525 · maxPct=17%
