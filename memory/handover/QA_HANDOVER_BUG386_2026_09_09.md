# QA Handover — BUG-386
## PMS Check-In: Room Accommodation GST (CGST + SGST)

**Date:** 2026-09-09
**Role:** IMPLEMENTATION agent (ALPHA v0.7)
**Item:** BUG-386
**Risk:** CRITICAL (financial — GST tax, room billing, balance)
**Sprint:** pos_pms_1

---

## 1. Inherited from Plan — Verification Matrix Results

| V# | Edit | File | Verification | Self-Test Result |
|---|---|---|---|---|
| V1 | E2 | roomGstCalculator.js | `computeRoomGst(true, slabs, 8000, 1, 2)` = {gstTotal:400, cgst:200, sgst:200} | ✅ PASS (node ESM test) |
| V2 | E2 | roomGstCalculator.js | `computeRoomGst(true, slabs, 8000, 1, 1)` = {gstTotal:1440, cgst:720, sgst:720} | ✅ PASS |
| V3 | E2 | roomGstCalculator.js | `computeRoomGst(false, slabs, 8000, 1, 1)` = {gstTotal:0, cgst:0, sgst:0} | ✅ PASS |
| V4 | E2 | roomGstCalculator.js | `computeRoomGst(true, null, 8000, 1, 1)` = {gstTotal:0, cgst:0, sgst:0} | ✅ PASS |
| V5 | E1 | profileTransform.js | `roomGstSlabs` key present at L247 in `checkInFlags` | ✅ grep verified |
| V6 | E1 | profileTransform.js | `roomGstSlabs` returns null on missing `room_gst` (try/catch guard) | ✅ code-verified |
| V7 | E4 | CheckInPage.jsx | GST strip `data-testid="ci-gst-strip"` present, green when applicable | ✅ code-verified |
| V8 | E4 | CheckInPage.jsx | Grey "Not Applicable" state when flag=false / slabs null | ✅ code-verified |
| V9 | E5 | pmsService.js | `gst_tax` = `to2dp(p.gstTax ?? 0)` (not hardcoded '0.00') | ✅ grep L162 |
| V10 | E5 | pmsService.js | `balance_payment` = `to2dp(orderAmount + (p.gstTax ?? 0) - advance)` | ✅ grep L159 |
| V11 | E6 | orderTransform.js | `gstTax` field at L432 in `roomPaymentSummary` block | ✅ grep verified |
| V12 | E7 | PmsCheckoutDrawer.jsx | `room_gst_tax` conditionally injected in BILL_PAYMENT payload | ✅ grep verified |

**Self-test: 12/12 PASS**

---

## 2. Browser Test Cases (QA agent to execute on preprod)

### TC-386-01: GST Strip renders with correct values
**URL:** `/pms/check-in`
**Steps:**
1. Login as restaurant with `room_gst_applicable = Yes` and `room_gst` slabs configured (palmhouse or kunafamahal)
2. Click "Walk-in" or select an arrival
3. Enter Room Amount = ₹8000, Checkin today, Checkout tomorrow (1 night)
4. Inspect the GST strip between the amount grid and the Note field

**Expected:**
- Green strip visible with header "GST (Accommodation)" + slab badge (e.g. "18% Slab")
- CGST (9%) = ₹720.00
- SGST (9%) = ₹720.00
- Total GST = ₹1,440.00
- Total incl. GST = ₹9,440.00

---

### TC-386-02: pmsCheckIn payload has correct gst_tax
**Steps:**
1. Same setup as TC-386-01
2. Open browser DevTools → Network tab
3. Fill form fully and click "Confirm Check-In"
4. Inspect the POST to `/api/v1/vendoremployee/pos/user-group-check-in`

**Expected payload:**
- `gst_tax` = `1440` (or computed value matching strip) — **NOT `"0.00"`**
- `balance_payment` = `8000 + 1440 - advance` (not just `8000 - advance`)

---

### TC-386-03: GST strip — Not Applicable state
**Steps:**
1. Login as restaurant with `room_gst_applicable = No` OR no `room_gst` config
2. Open check-in form, enter any room amount

**Expected:**
- Grey strip appears with "Not Applicable" badge
- Text: "GST not configured for this property. Sending gst_tax: 0.00"

---

### TC-386-04: Checkout injects room_gst_tax
**Steps:**
1. Check in a guest (post TC-386-02 — a new check-in with correct gst_tax stored)
2. Go to In-House Guests, find the checked-in guest
3. Click View Bill / Checkout
4. In DevTools Network, capture the BILL_PAYMENT POST

**Expected:**
- Payload contains `room_gst_tax` field matching the `gst_tax` stored at check-in
- **TODO (Q-GST-01):** Confirm field name `room_gst_tax` is accepted by backend — if rejected, try additive to `gst_tax`

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Non-room order check-in (table order) — no GST strip shows | `computeRoomGst` only called from CheckInPage (PMS only) |
| R2 | `profileTransform` existing consumers (`CollectPaymentPanel.jsx:275`, `RestaurantSettingsPage.jsx:86`) still work | `checkInFlags` is additive — verify existing rooms settings page renders |
| R3 | F&B GST on room orders NOT affected | `CollectPaymentPanel` food GST path untouched — verify food order settle |
| R4 | Historical check-ins with `gst_tax=0` checkout correctly | OD-386-03: fix forward only — old bookings with 0 should still checkout (roomGstTax=0, field omitted from payload) |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- Item: BUG-386 → status: `IMPLEMENTED — Gate 5a (2026-09-09)`
- Sprint: `pos_pms_1`
- EXIT GATE: **ALL 5 PASSED**
  - □1 registry.json ✅
  - □2 BUG_TRACKER.md ✅
  - □3 FILE_OWNERSHIP.md ✅
  - □4 Code markers (all 6 files) ✅
  - □5 webpack 0 new errors ✅

---

## 5. Credentials + Environment

- App URL: `https://pos-frontend-deploy-30.preview.emergentagent.com`
- Test accounts: see `/app/memory/test_credentials.md` (currently empty — use preprod accounts)
- Preprod API: `https://preprod.mygenie.online/`
- **Key account for PMS:** palmhouse or kunafamahal (restaurants with `room_gst_applicable = Yes`)

---

## 6. Open Item

**Q-GST-01 (E7 field name):** `room_gst_tax` field assumed in BILL_PAYMENT payload. Must be confirmed via curl probe against `POST /api/v2/vendoremployee/order/order-bill-payment` with a live token. If backend rejects `room_gst_tax`, switch to additive `gst_tax` (add room GST to food GST). Backend brief at `backend_briefs/BACKEND_BRIEF_INV-PMS-GST-001_2026_09_08.md`.
