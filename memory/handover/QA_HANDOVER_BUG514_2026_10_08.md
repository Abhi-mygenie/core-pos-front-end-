# QA HANDOVER — BUG-514
# Check-In API: gst_tax + room_discount fields fixed

**Date:** 2026-10-08
**Items:** BUG-514 (3 sub-issues: A gst_tax, B room_discount, C gstTax near-max)
**Implementation agent:** IMPLEMENTATION (2026-10-08)
**Files changed:**
- `src/api/services/frontDeskService.js` L104 (E-1)
- `src/components/pms/frontdesk/CheckInForm.jsx` L133, L136, L138 (E-2a+b)
- `src/pages/pms/CheckInPage.jsx` L312-325 (E-3) + L384-390 (E-4)

---

## 1. Verification Matrix (self-test results)

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E-1 | frontDeskService.js L104 | `gst_tax` wired to `String(to2(p.gstTax??0))` | ✅ grep: `104: fd.append('gst_tax', String(to2(p.gstTax ?? 0)))` |
| E-2a | CheckInForm.jsx L133 | `gstTax: displayGstTotal` added to checkIn() call | ✅ grep: `133: gstTax: displayGstTotal` |
| E-2b | CheckInForm.jsx L136+138 | `roomDiscount`/`roomDiscountValue` inline bc−adv expression | ✅ grep: `136: roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor` |
| E-3 | CheckInPage.jsx L312-325 | `computeBase_514` with BUG-511 near-max correction | ✅ grep: `316: computeBase_514 = extraRoom_514 < gstOnAdvFloor_ci` |
| E-4 | CheckInPage.jsx L384-390 | `roomDiscount`/`roomDiscountValue` inline `gstOnAdvFloor_ci` expression | ✅ grep: `386: roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor_ci` |
| compile | all | webpack 0 new warnings | ✅ "Compiled successfully!" |

---

## 2. Test Cases

### TC-514-1 — CRITICAL: gst_tax=35 in multipart (CheckInForm / front-desk-v2 path)

**Pre-condition:** A Direct booking in RID 69, max discount entered (88.34% or ₹5965-area)

**Steps:**
1. Open front-desk-v2 arrivals → expand a pending booking → click "Check In"
2. In the check-in form, set room discount to max (88.34% or enter ₹5965 in Amount mode)
3. Leave Collect Now = 0
4. Click Confirm — open Network tab BEFORE clicking
5. Inspect the multipart form payload of the `user-group-check-in` request

**Expected:**
- `gst_tax = 35` (post-discount GST — NOT 0, NOT 335)
- `room_discount = 6000` (= bc − advance = 6700 − 700)
- `room_discount_value = 6000`

**Pass criteria:** Network payload shows `gst_tax=35` and `room_discount=6000`.

---

### TC-514-2 — CRITICAL: gst_tax=35 in multipart (CheckInPage / legacy path)

**Steps:**
1. Open `/pms/check-in` (legacy CheckInPage)
2. Select a booking, apply max discount
3. Click Confirm — inspect Network tab
4. Check multipart payload

**Expected:** Same as TC-514-1 — `gst_tax=35`, `room_discount=6000`

---

### TC-514-3 — CRITICAL: Backend stores gst_tax=35

**Steps:**
1. Complete a check-in via front-desk-v2 with max discount
2. Check the API response body: `data.orders[0].gst_tax`
3. After check-in, open the folio or in-house guests and verify balance reflects GST=35 not 335

**Expected:**
- Response: `"gst_tax": 35` (not 335)
- Balance due = 35 (GST only)

---

### TC-514-4 — Regression: partial discount unaffected (room_discount = user value)

**Steps:**
1. front-desk-v2 check-in, apply ~60% discount (partial, NOT max)
2. Inspect Network tab multipart

**Expected:**
- `room_discount = roomDiscountRs` (e.g., if 60% of 6700 = 4020, send 4020 — NOT 4020 + gstOnAdv)
- Confirm inline expression `roomDiscountRs >= maxFlat` = FALSE at partial discount → unchanged

---

### TC-514-5 — Regression: no discount, gst_tax=0

**Steps:**
1. front-desk-v2 check-in with NO discount applied
2. Inspect Network tab

**Expected:**
- `gst_tax = 0` (no discount → displayGstTotal = 0 or full rack → but Sub-A only sends when > 0)
- Actually: `displayGstTotal` at no-discount = rack GST amount. So `gst_tax = <rack_gst>` is sent, which the backend receives but since `room_discount = 0`, the BE additive deploy condition is `room_discount > 0 AND gst_tax > 0` = FALSE → backend uses own rack GST. No change in stored value.
- **Verify**: no regression in the no-discount check-in flow — check-in completes normally

---

### TC-514-6 — CheckInPage gstTax submit matches display (Sub-C)

**Steps:**
1. CheckInPage, apply max discount
2. Observe display strip GST = ₹35
3. In Network tab, check multipart `gst_tax` value from pmsService path

**Expected:** `gst_tax = 35` = same as display. (Was 36.75 before fix.)

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R-1 | CheckInForm normal check-in (no discount) completes | E-2a adds `gstTax` prop — must not break normal path |
| R-2 | CheckInPage normal check-in completes | E-3 changes gstBase variable names — must compile and function |
| R-3 | BUG-513 guard still active | L124: `if (!ready \|\| busy \|\| collectBlockedAtMax)` — unchanged |
| R-4 | BUG-512 hint/error messages display correctly | L307-315: unchanged |
| R-5 | BUG-511 GST formula in display strip unchanged | L103-112 useMemo: unchanged |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-514
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
  ✅ 1. REGISTRY SYNC
  ✅ 2. BUG_TRACKER.MD
  ✅ 3. FILE_OWNERSHIP.MD (3 files)
  ✅ 4. CODE MARKERS (// BUG-514 in all 3 files)
  ✅ 5. COMPILE (0 new warnings)
```

---

## 5. Credentials + Environment

| Item | Value |
|---|---|
| App URL | `https://core-pos-front-5.preview.emergentagent.com` |
| Front Desk v2 | `…/pms/front-desk-v2?tab=arrivals` |
| Legacy CheckIn | `…/pms/check-in` |
| Preprod API | `https://preprod.mygenie.online/` |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |

**Note:** TC-514-1 through TC-514-3 require a Direct booking with max discount available.
QA for these cases can be combined with the BUG-511/512/513 check-in discount sweep.

---

## 6. Combine with

This QA can be run as part of the combined check-in discount sweep:
- BUG-511 QA (GST formula correctness at various discount levels)
- BUG-512 QA (hint/error/disabled at max)
- BUG-513 QA (confirm() guard at max)
- **BUG-514 QA** (gst_tax + room_discount API fields) ← this handover

Suggested order: TC-514-1 first (most critical — verifies BE stores correct GST), then TC-514-4/5 regressions, then BUG-513 TC, then BUG-511/512 display tests.
