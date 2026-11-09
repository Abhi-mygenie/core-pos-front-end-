# QA Handover — BUG-489
**Date:** 2026-10-05
**Item:** BUG-489 — CR-407 check-in discount missing on front-desk-v2 (mirror rule)
**Risk:** MEDIUM
**Files changed:**
- `src/components/pms/frontdesk/CheckInForm.jsx` (E-1..E-4)
- `src/api/services/frontDeskService.js` (E-5)

---

## 1. Verification Matrix Results

| # | Edit | Check | Result |
|---|------|-------|:---:|
| V-1 | E-1 | `ciRoomDiscountAmt` + `ciRoomDiscountType` state at line 41–42 | ✅ PASS |
| V-2 | E-2 | `roomDiscountRs` useMemo at line 58 | ✅ PASS |
| V-3 | E-2 | useMemo uses `c.booking_charge` as percent base | ✅ PASS |
| V-4 | E-3 | `roomDiscountRs > 0` guard in confirm() spread | ✅ PASS |
| V-5 | E-3 | Spread inside `checkIn({...})` call | ✅ PASS |
| V-6 | E-4 | `ci-room-discount-input` testid present | ✅ PASS |
| V-7 | E-4 | `ci-room-discount-rs` testid present | ✅ PASS |
| V-8 | E-4 | `ci-discount-type-amount` + `ci-discount-type-percent` testids | ✅ PASS |
| V-9 | E-5 | `fd.append('room_discount', ...)` in conditional block | ✅ PASS |
| V-10 | E-5 | Block guarded: `if ((p.roomDiscount ?? 0) > 0)` | ✅ PASS |
| V-11 | E-5 | Block between `firm_gst` (line 106) and `upgrade_type` (line 114) | ✅ PASS |
| V-12 | All | webpack 0 new warnings | ✅ PASS |

**Self-test: 12/12 PASS**

---

## 2. QA Test Cases

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-1 | Discount field visible on front-desk-v2 | 1. Login `owner@thegoankitchen.com` / `Qplazm@10` 2. Go to `/pms/front-desk-v2?tab=arrivals` 3. Click any arrival row → expand check-in panel | "Room Discount (optional)" label + ₹/% toggle + number input visible ABOVE "Collect now" section |
| TC-2 | ₹ discount — badge shows | Enter `500` in Amount mode | Badge `−₹500` appears immediately |
| TC-3 | % discount — badge computes from booking_charge | Switch to Percent, enter `10` (booking_charge = ₹5,700) | Badge shows `−₹570` (= floor(5700 × 10/100)) |
| TC-4 | Toggling type clears amount | Enter `500` in Amount, switch to Percent | Input clears to empty |
| TC-5 | No discount — field not sent to backend | Leave discount empty, confirm check-in | Network tab: no `room_discount` in FormData payload |
| TC-6 | With discount — field sent | Enter `500`, confirm check-in | Network tab: `room_discount=500`, `room_discount_type=Amount`, `room_discount_value=500` in FormData |
| TC-7 | Buttons disabled when busy | Observe during check-in submit | ₹/% toggle + input have `disabled` attribute while `busy=true` |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R-1 | CheckInPage `/pms/check-in` discount still works | Same pattern, different file — verify no interference |
| R-2 | Collect now section still present below discount | E-4 inserts before, not replaces |
| R-3 | Upgrade flow unaffected | E-5 inserts between firm_gst and upgrade_type, not inside upgrade block |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-489
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
  □1 registry.json: PASS
  □2 BUG_TRACKER.md: PASS
  □3 FILE_OWNERSHIP.md: PASS (both files)
  □4 Code markers — CheckInForm.jsx: 4, frontDeskService.js: 1
  □5 Compile (0 new warnings): PASS
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | `https://core-pos-deploy-32.preview.emergentagent.com` |
| Test login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Route to test | `/pms/front-desk-v2?tab=arrivals` → click any arrival row |

---

## 6. Scope Lock

- **Files changed:** `CheckInForm.jsx` + `frontDeskService.js`
- **Files NOT touched:** `CheckInPage.jsx` · `pmsService.js` · any other file
- **Scope expansion:** NONE
