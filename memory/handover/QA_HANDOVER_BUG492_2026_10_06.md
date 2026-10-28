# QA Handover — BUG-492

**Date:** 2026-10-06
**Implementation:** GATE_5A_IMPLEMENTED
**Files changed:**
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
  - `src/pages/pms/CheckInPage.jsx`
  - `src/components/pms/frontdesk/CheckInForm.jsx`
**Sprint:** oct_bug_batch
**Credentials:** `owner@thegoankitchen.com` / `Qplazm@10` — RID 69 (The Goan Kitchen)
**URLs:**
  - In-House Bill: `https://mygenie-pos-frontend.preview.emergentagent.com/pms/front-desk-v2?tab=inhouse` → click Bill on any in-house guest
  - Check-In (new): `/pms/front-desk-v2?tab=arrivals` → Confirm Check-In on any arrival
  - Check-In (form): `/pms/check-in` (direct form, CheckInForm component)

---

## 1. Verification Matrix Self-Test

| Edit | File | Change | Self-Test |
|------|------|--------|:---:|
| E-492-1 | FolioCheckoutPanel RoomSection L53-59 | maxPct useMemo + discountOverMax | ✅ grep confirms 5× BUG-492 in file |
| E-492-2 | FolioCheckoutPanel L99 | max → maxPct | ✅ grep: `max={roomDiscountType === 'Percent' ? maxPct` |
| E-492-3 | FolioCheckoutPanel L86/114-121 | Fragment + alert JSX | ✅ grep: `bill-discount-over-max-alert` |
| E-492-4 | FolioCheckoutPanel L225-234 | discountOverMax parent useMemo | ✅ grep: `discountOverMax at parent scope` |
| E-492-5 | FolioCheckoutPanel L254 | handlePaid guard | ✅ grep: `block checkout when %` |
| E-492-6 | FolioCheckoutPanel L339-342 | roomInfo balance_due override Sub-A | ✅ grep: `Sub-A: reflect discount` |
| E-492-7 | CheckInPage L271-278 | maxPct useMemo + discountOverMax | ✅ grep confirms 3× BUG-492 |
| E-492-8 | CheckInPage L279 | formValid +!discountOverMax | ✅ grep: `BUG-411 + BUG-492` |
| E-492-9 | CheckInPage L896 | max → maxPct | ✅ grep: `ciRoomDiscountType === 'Percent' ? maxPct` |
| E-492-10 | CheckInPage L910-917 | alert JSX | ✅ grep: `ci-discount-over-max-alert` |
| E-492-11 | CheckInForm L68-74 | maxPct useMemo + discountOverMax | ✅ grep confirms 2× BUG-492 |
| E-492-12 | CheckInForm L196 | max → maxPct | ✅ grep: `ciRoomDiscountType === 'Percent' ? maxPct` |
| E-492-13 | CheckInForm L211-217 | alert JSX | ✅ grep: `checkin-form-discount-over-max-alert` |
| E-492-14 | CheckInForm L236 | confirm disabled +discountOverMax | ✅ grep: `!ready \|\| busy \|\| discountOverMax` |
| Compile | — | webpack 0 new warnings | ✅ PASS |

---

## 2. Sub-A Test Cases (Checkout total reflects discount)

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-492-A1 | Checkout total updates with discount | Open Bill for any in-house guest → enter ₹500 in Amount discount → check right panel Checkout button | Checkout button shows `charge.balance_due − ₹500` |
| TC-492-A2 | No discount → unchanged | Open Bill → leave discount at 0 | Checkout button shows `charge.balance_due` unchanged |
| TC-492-A3 | Discount equals full balance | Enter discount = `charge.balance_due` | Checkout shows ₹0 (Math.max guard) |
| TC-492-A4 | Payment completes | Enter ₹500 discount → proceed to checkout → confirm | Payment accepted by backend, guest checked out |

---

## 3. Sub-B Test Cases (% cap alert + disable)

### FolioCheckoutPanel (Bill panel, in-house)

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-492-B1 | Red alert above maxPct | Open Bill → switch to % → enter value above maxPct (e.g., 80% when max is 71%) | Red alert shown: "Maximum discount: 71% (₹X). Entering above 71%..." |
| TC-492-B2 | Checkout blocked | Same → click Checkout button | Error msg shown, no API call made |
| TC-492-B3 | At or below maxPct | Enter 71% or less | No alert, Checkout button proceeds normally |
| TC-492-B4 | Amount mode — no restriction | Switch to Amount, enter any value up to balance_due | No alert shown, Checkout enabled |
| TC-492-B5 | Alert disappears on mode switch | Enter 80% (alert shown) → switch to Amount | Alert gone |

### CheckInPage (Arrivals confirm check-in)

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-492-B6 | Red alert above maxPct | Open arrival check-in → switch % → enter above maxPct | Red alert: `ci-discount-over-max-alert` shown |
| TC-492-B7 | Confirm button disabled | Same state | `ci-confirm-btn` disabled |
| TC-492-B8 | Valid % → no alert, enabled | Enter ≤ maxPct | No alert, button enabled |

### CheckInForm (direct form)

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-492-B9 | Red alert above maxPct | Open check-in form → % → enter above maxPct | `checkin-form-discount-over-max-alert` shown |
| TC-492-B10 | Confirm disabled | Same state | `checkin-confirm-btn` disabled |

---

## 4. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | Amount mode cap (BUG-490) still works | BUG-490 onChange clamp unchanged |
| R2 | Balance due display (BUG-491 Sub-B) still live | `Math.max(0, balance_due − roomDiscountRs)` unchanged |
| R3 | room_discount payload still sent in handlePaid | Payload logic unchanged; discountOverMax only short-circuits the call |
| R4 | Checkout with no room discount | roomDiscountInfoRs=0 → balance_due override = balance_due (no change) |

---

## 5. Registry Sync Confirmation

```
Registry synced:   YES
Item:              BUG-492
Status:            GATE_5A_IMPLEMENTED
Sprint:            oct_bug_batch
EXIT GATE:         5/5 PASS
  □1 registry.json  PASS — GATE_5A_IMPLEMENTED, oct_bug_batch
  □2 BUG_TRACKER.md PASS — GATE_5A_IMPLEMENTED row
  □3 FILE_OWNERSHIP PASS — 3 files listed
  □4 Code markers   PASS — BUG-492 ×5 / ×3 / ×2 across 3 files
  □5 Compile        PASS — 0 new warnings (1 pre-existing)
```

---

## 6. Environment

```
App URL:   https://mygenie-pos-frontend.preview.emergentagent.com
Login:     owner@thegoankitchen.com / Qplazm@10 (RID 69)
Inhouse:   /pms/front-desk-v2?tab=inhouse  → click Bill
Arrivals:  /pms/front-desk-v2?tab=arrivals → confirm check-in
maxPct example (RID 69): booking_charge=₹1,050, balance_due=₹1,002.50 → maxPct = floor(1002.5/1050×100) = 95
```
