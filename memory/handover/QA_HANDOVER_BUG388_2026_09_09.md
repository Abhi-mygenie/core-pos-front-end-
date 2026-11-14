# QA Handover — BUG-388

**Date:** 2026-09-09
**Role:** IMPLEMENTATION agent (ALPHA v0.7)
**Item:** BUG-388 — PMS Check-In: advance payment excluded from GST base
**Gate:** 5a → QA (Gate 5b)

---

## §1 Inherited from Plan (Verification Matrix results)

| Edit | File | Change | Self-Test Result |
|---|---|---|---|
| E2 | `CheckInPage.jsx:169` | `gstBase = orderAmount + advance`; passed to `computeRoomGst` | ✅ PASS — verified in code + simulation |
| E1a | `CheckInPage.jsx:388` | `gstBase = amt + advAmt`; `computeRoomGst(…, gstBase, …)`; slab lookup uses `gstBase` | ✅ PASS — verified in code |
| E1b | `CheckInPage.jsx:422` | Total incl. GST: `gstBase + gstTotal` (not `amt + gstTotal`) | ✅ PASS — verified in code |
| E3 | `pmsService.js:159` | `balance_payment = orderAmount + gstTax` (removed `- advance`) | ✅ PASS — verified in code |

**Self-test: 6/6 scenarios PASS. Webpack: 0 new warnings.**

---

## §2 Test Cases

| TC | Steps | Expected | Verify via |
|---|---|---|---|
| **TC-388-01** | Login → `/pms/check-in` → Walk-in → Room ₹7,500, Advance ₹100, 1 night | GST strip: **18% Slab**, CGST ₹684, SGST ₹684, Total GST ₹1,368, **Total incl. GST ₹8,968** | Browser UI |
| **TC-388-02** | Same as TC-388-01 → click LOG IN / confirm | Network: `gst_tax: 1368`, `balance_payment: 8868` in `LOCAL_CHECKIN` payload | DevTools Network tab |
| **TC-388-03** | Walk-in → Room ₹8,000, Advance ₹0, 1 night | 18% slab, GST ₹1,440, Total ₹9,440, balance ₹9,440 | Browser UI + Network |
| **TC-388-04** | Walk-in → Room ₹5,000, Advance ₹0 | 5% slab, GST ₹250, Total ₹5,250, balance ₹5,250 | Browser UI |
| **TC-388-05** | Walk-in → Room ₹7,400, Advance ₹200 | gstBase=7,600 → 18%, GST ₹1,368, Total incl. GST ₹8,968, balance ₹8,768 | Browser UI + Network |

---

## §3 Regression Tests

| R | What to verify | Why |
|---|---|---|
| R-388-01 | Room ₹7,400 + advance ₹0 → 5% slab, GST ₹370, balance ₹7,770 | advance=0 path: gstBase = orderAmount (no change vs before) |
| R-388-02 | BUG-386 regression: gst_tax field present in payload (not '0.00') | BUG-386 fix must still hold |
| R-388-03 | Non-WalkIn booking (Direct/Online): same formulas apply | Booking type guard in pmsCheckIn unchanged |

---

## §4 Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-388
Status: IMPLEMENTED — Gate 5a
Sprint: pos_pms_1
EXIT GATE: ALL 5 PASSED
  □1 registry.json UPDATED ✅
  □2 BUG_TRACKER.md UPDATED ✅
  □3 FILE_OWNERSHIP.md UPDATED ✅
  □4 Code markers: BUG-388 in CheckInPage.jsx (×4) + pmsService.js (×1) ✅
  □5 webpack 0 new warnings ✅
```

---

## §5 Credentials + Environment

```
Account: owner@thegoankitchen.com / Qplazm@10
URL: https://core-pos-preview-15.preview.emergentagent.com
Route: /pms/check-in
Restaurant ID: 69 (The Goan Kitchen)
```

---

## §6 Known Limitation (not a regression)

- **R5 (Room ₹7,500 + advance ₹0):** gstBase=7,500 → still hits 5% slab due to **BUG-389** (backend slab2.min=7500.01). This is expected and correct — BUG-388 fix only addresses the advance inclusion. BUG-389 (backend config) is a separate tracked item. Do NOT fail TC for this case.

---

*Implementation agent — 2026-09-09 | EXIT GATE: 5/5 PASS*
