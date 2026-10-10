# BUG-514 — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-514
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 2)
**Code Reality:** PARTIAL — room_discount IS sent but wrong value; gst_tax IS sent but hardcoded 0; gstTax IS computed in CheckInPage submit but without BUG-511 near-max correction
**Conflict Pre-Check:**

| File | Last modifier | Open items on same function? | Conflict? |
|---|---|---|---|
| `frontDeskService.js` | CR-385 M0 (2026-09-21, NEW) | None | NONE |
| `CheckInForm.jsx` | BUG-513 (2026-10-08, L124) | BUG-512/511 (different lines) | NONE — parallel-safe |
| `CheckInPage.jsx` | BUG-511+512 (2026-10-07, L956-960+L290-295) | L314 (submit gstBase) untouched since BUG-496 | NONE — L314 is separate from BUG-511/512 edit sites |

**Risk:** CRITICAL (R6 — tax/financial, stored to backend, affects checkout balance)
**ODs locked:** OD-514-01=a (at-max only) · OD-514-02=a (both flows) · OD-514-03=a (apply BUG-511 to submit path)

---

## 1. Summary Table

| # | Sub-issue | Break point | Impact | Fix files |
|---|---|---|---|---|
| A | `gst_tax='0'` hardcoded | `frontDeskService.js L104` + CheckInForm missing `gstTax` pass | Wrong GST stored (rack 335 vs post-discount 35) | frontDeskService.js + CheckInForm.jsx |
| B | `room_discount` wrong value (both flows) | CheckInForm L141 + CheckInPage L381 send `roomDiscountRs` | API receives 5965 not 6000 | CheckInForm.jsx + CheckInPage.jsx |
| C | `CheckInPage handleConfirm` gstTax without BUG-511 correction | CheckInPage L314-322 (submit path) | Sends 36.75 at max discount, display shows 35 | CheckInPage.jsx |

---

## 2. Data Flow Traces

### Sub-issue A — `gst_tax = '0'` hardcoded (CheckInForm flow)

```
CheckInForm.jsx confirm() [L124-144]:
  computations in scope → displayGstTotal = 35 (BUG-511 useMemo L103-112)  ✅ correct value available
  BUT: checkIn({
    ...
    // gstTax: NEVER PASSED ← gap
    roomDiscount: roomDiscountRs,  ...
  })
    ↓
  frontDeskService.buildCheckInFormData(p) [L70-120]:
    p.gstTax = undefined
    L104: fd.append('gst_tax', '0')  ← HARDCODED '0', p.gstTax never read
    ↓
  POST user-group-check-in:
    gst_tax = 0
    ↓
  Backend (post additive deploy):
    gst_tax = 0 → condition (gst_tax > 0 AND room_discount > 0) = FALSE
    → stores rack GST from charge: 335   ← WRONG (should be 35)
```

**CheckInPage flow (gst_tax is correct — no gap here):**
```
CheckInPage.jsx handleConfirm() [L314-322]:
  gstBase = orderAmount - roomDiscountRs = 6700 - 5965 = 735
  gstTax = computeRoomGst(..., 735, ...) = 36.75   ← near-max error (Sub-C)
  BUT: gstTax IS passed to pmsCheckIn() L367  → pmsService sends it ✅
  (gst_tax > 0 condition met, but value is 36.75 not 35 — Sub-C handles this)
```

---

### Sub-issue B — `room_discount` wrong value

#### CheckInForm flow (frontDeskService path)
```
CheckInForm.jsx confirm() [L135-141]:
  roomDiscountRs = Math.min(Math.floor(raw), maxFlat) = 5965  (capped at maxFlat)
  isAtMax: roomDiscountRs = maxFlat = 5965  ← should send 6000 = maxFlat + gstOnAdvFloor
  checkIn({
    roomDiscount:      5965,        ← wrong (should be 6000 = 5965 + 35)
    roomDiscountValue: 5965,        ← wrong (should be 6000)
  })
    ↓
  frontDeskService.buildCheckInFormData(p) [L109-111]:
    fd.append('room_discount',       String(5965))  ← wrong
    fd.append('room_discount_value', String(5965))  ← wrong
    ↓
  POST user-group-check-in: room_discount = 5965 (should be 6000)
```

#### CheckInPage flow (pmsService path)
```
CheckInPage.jsx handleConfirm() [L380-384]:
  ...(roomDiscountRs > 0 ? {
    roomDiscount:      roomDiscountRs,             ← 5965, should be 6000
    roomDiscountValue: parseFloat(ciRoomDiscountAmt) || 0,  ← 5965, should be 6000
  } : {})
    ↓
  pmsService.pmsCheckIn(p) [L293-295]:
    fd.append('room_discount',       String(5965))  ← wrong
    fd.append('room_discount_value', String(5965))  ← wrong
    ↓
  POST user-group-check-in: room_discount = 5965 (should be 6000)
```

**Correction formula (OD-514-01=a: at-max only):**
```js
// In both callers (confirm + handleConfirm):
const roomDiscountToApi = (roomDiscountRs > 0 && roomDiscountRs >= maxFlat)
    ? roomDiscountRs + gstOnAdvFloor   // at max: add the GST floor (= bc − advance − maxFlat)
    : roomDiscountRs;                  // partial: send as-is
```
- CheckInForm.jsx: `gstOnAdvFloor` available at L94
- CheckInPage.jsx: `gstOnAdvFloor_ci` available at L291

---

### Sub-issue C — CheckInPage handleConfirm gstTax without BUG-511 correction

```
CheckInPage.jsx handleConfirm() [L314-322]:

CURRENT (submit path):
  gstBase = bc − roomDiscountRs = 6700 − 5965 = 735
  gstTax  = computeRoomGst(..., 735, ...) → 36.75   ← no near-max correction

DISPLAY path [L956-960]:
  extraRoom509  = maxFlat − roomDiscountRs = 0
  computeBase509 = (0 < 35) ? 735 − 35 : 735 → 700  ← BUG-511 applied
  display gstTax = computeRoomGst(..., 700, ...) → 35  ✓

Submit sends 36.75, display shows 35 → MISMATCH
```

**Fix (OD-514-03=a):** Apply BUG-511 formula to submit path — same pattern as L956-960:
```js
// Replace L314-322:
const gstBase_submit     = Math.max(0, Number(form.orderAmount) - roomDiscountRs);
const extraRoom_submit   = maxFlat - roomDiscountRs;                                // BUG-514
const computeBase_submit = extraRoom_submit < gstOnAdvFloor_ci                      // BUG-514
    ? gstBase_submit - gstOnAdvFloor_ci
    : gstBase_submit;
const { gstTotal: gstTax } = computeRoomGst(
    roomGstApplicable, roomGstSlabs, computeBase_submit, formNights ?? 1, 1);
```
`gstOnAdvFloor_ci` is already computed at L291 — in scope of handleConfirm.

---

## 3. Affected Files, Lines, and Edit Description

| Edit | File | Current Lines | Change | Sub-issue |
|---|---|---|---|---|
| E-1 | `src/api/services/frontDeskService.js` | L104 | Replace `'0'` with `String(to2(p.gstTax ?? 0))` | A |
| E-2 | `src/components/pms/frontdesk/CheckInForm.jsx` | L127-142 (confirm body) | Add `gstTax: displayGstTotal` + compute `roomDiscountToApi` + pass it as `roomDiscount` + `roomDiscountValue` | A + B |
| E-3 | `src/pages/pms/CheckInPage.jsx` | L314-322 (handleConfirm gstBase block) | Apply BUG-511 near-max correction to submit gstBase | C |
| E-4 | `src/pages/pms/CheckInPage.jsx` | L380-384 (pmsCheckIn roomDiscount spread) | Compute `roomDiscountToApi_ci` + use it as `roomDiscount` + `roomDiscountValue` | B |

**Files WILL change (4 edits, 3 files):**
- `src/api/services/frontDeskService.js` — E-1 (1 line)
- `src/components/pms/frontdesk/CheckInForm.jsx` — E-2 (~5 lines)
- `src/pages/pms/CheckInPage.jsx` — E-3 (~5 lines) + E-4 (~4 lines)

**Files will NOT touch:**
- `src/api/services/pmsService.js` — roomDiscount fix is in the caller (E-4); pmsService uses `p.roomDiscount` which will be correct after E-4
- `GuestTable.jsx`, `ArrivalsPanel.jsx` — display gap (Issue B from investigation) is out of scope for this intake; separate item if needed
- Any other file

---

## 4. Risk Classification

- **Risk: CRITICAL** (R6 — tax/financial, wrong GST stored at check-in, affects checkout balance and tax records)
- **Hotspot files touched:** NONE (none of the 3 files are in the R5 hotspot list)
- **Financial test required:** YES — verify backend stores `gst_tax=35` (not 335) after fix

---

## 5. Downstream Consumers

| Downstream | Impact |
|---|---|
| Checkout (`FolioCheckoutPanel.jsx`) | Reads `room_info.gst_tax` from order — currently 335 (wrong); after fix will be 35 ✓ |
| Checkout balance computation | `pmsService.js L113`: `bp + chargeGst` formula uses `charge.sgst + charge.cgst` (BUG-493 Option B) — independent of `room_info.gst_tax`. Not directly affected but fix removes ambiguity. |
| Tax reporting | Any report showing GST on room orders will show 335 instead of 35 until fix |
| `RowExpansionStub` display | Shows `row.charge.sgst/cgst` (rack values) — separate Issue B from investigation, not in this scope |

---

## 6. Verification Matrix (seeds Gate 3 plan)

| Edit | File | How to verify | Automated? |
|---|---|---|---|
| E-1 | frontDeskService.js L104 | grep: `fd.append('gst_tax', String(to2(p.gstTax` | YES |
| E-2 gstTax | CheckInForm.jsx confirm() | grep: `gstTax: displayGstTotal` in confirm block | YES |
| E-2 roomDiscountToApi | CheckInForm.jsx confirm() | grep: `roomDiscountToApi` computed before checkIn | YES |
| E-3 | CheckInPage.jsx L314-322 | grep: `computeBase_submit` in handleConfirm | YES |
| E-4 | CheckInPage.jsx L380-384 | grep: `roomDiscountToApi_ci` in handleConfirm spread | YES |
| API payload A | frontDeskService | Network tab: `gst_tax=35` in multipart at max discount | NO (browser) |
| API payload B | both flows | Network tab: `room_discount=6000` at max discount | NO (browser) |
| gstTax match | CheckInPage | Verify: submit gstTax == display gstTotal at max discount | NO (browser) |
| Normal discount regression | CheckInForm + CheckInPage | 60% discount: `room_discount=roomDiscountRs` unchanged (not at max) | NO (browser) |
| webpack compile | all files | `tail /var/log/supervisor/frontend.out.log` → "compiled" | YES |

---

## 7. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-514 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: BUG-514 row updated
- [ ] FILE_OWNERSHIP.md: 3 files listed — frontDeskService.js · CheckInForm.jsx · CheckInPage.jsx — BUG-514, 2026-10-08
- [ ] Code markers: // BUG-514 in every modified line/block
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## 8. Risk Register

| Risk | Probability | Mitigation |
|---|---|---|
| `roomDiscountToApi` wrong for partial discounts | LOW — OD-514-01=a: partial sends `roomDiscountRs` unchanged (same as today) | Regression test: partial discount (60%) must still send correct value |
| `gstTax=0` sent when no discount | NONE — Sub-A fix: `to2(p.gstTax ?? 0) = 0` when no discount; identical to current | No behavior change at no-discount |
| BUG-511 formula reused in submit path — different variable names | LOW — uses existing `gstOnAdvFloor_ci` (L291) and `maxFlat` (L275), already in scope | Verify `computeBase_submit` matches display `computeBase509` at max discount |
| Line drift in CheckInPage.jsx since plan written | LOW — L314 just verified this session | Implementation agent: re-verify L314 reads `const gstBase = Math.max(...)` before editing |

---

## 9. Open Questions

None. All ODs resolved by owner (OD-514-01=a · OD-514-02=a · OD-514-03=a).

