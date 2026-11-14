# BUG-388 Implementation Plan — Gate 3

**ID:** BUG-388
**Date:** 2026-09-09
**Role:** PLANNING agent (ALPHA v0.7)
**Stage:** Gate 3 — Implementation Plan
**Prerequisite:** Gate 2 Impact Analysis complete (`impact/BUG-388_IMPACT_ANALYSIS.md`)
**Awaiting:** Gate 4 GO from owner (R6 financial — mandatory)

---

## Scope Lock

**Files WILL change:**
- `src/pages/pms/CheckInPage.jsx` — 3 targeted line edits (E1a, E1b, E2)
- `src/api/services/pmsService.js` — 1 line edit (E3)

**Files will NOT touch:**
- `roomGstCalculator.js`, `profileTransform.js`, `orderTransform.js`, `PmsCheckoutDrawer.jsx`, `aiosellService.js`, any test files

---

## Execution Sequence

```
E2 first (handleConfirm — logic) → E1a/E1b together (GST strip — display) → E3 (pmsService — payload)
Verify webpack compiles after each file.
```

---

## Edit E1a — `CheckInPage.jsx` GST strip: include advance in gstBase

**File:** `src/pages/pms/CheckInPage.jsx`
**Lines:** 384–392

**Current code (verified 2026-09-09):**
```javascript
                    {/* BUG-386: GST Accommodation strip */}
                    {(() => {
                      const amt = Number(form.orderAmount) || 0;
                      const nights = formNights ?? 1;
                      const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, amt, nights, 1);
                      const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const rate = roomGstSlabs?.slabs?.find(s => (amt / nights) >= (s.min ?? 0) && (s.max == null || (amt / nights) <= s.max))?.gst_percent ?? 0;
                      const hasGst = roomGstApplicable && roomGstSlabs && gstTotal > 0;
                      const notApplicable = !roomGstApplicable || !roomGstSlabs;
                      if (!amt || (!hasGst && !notApplicable)) return null;
```

**Replace with:**
```javascript
                    {/* BUG-386: GST Accommodation strip */}
                    {(() => {
                      const amt = Number(form.orderAmount) || 0;
                      const advAmt = Number(form.advancePayment) || 0;
                      const gstBase = amt + advAmt; // BUG-388: advance is additional charge — include in GST base
                      const nights = formNights ?? 1;
                      const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, nights, 1);
                      const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const rate = roomGstSlabs?.slabs?.find(s => (gstBase / nights) >= (s.min ?? 0) && (s.max == null || (gstBase / nights) <= s.max))?.gst_percent ?? 0;
                      const hasGst = roomGstApplicable && roomGstSlabs && gstTotal > 0;
                      const notApplicable = !roomGstApplicable || !roomGstSlabs;
                      if (!amt || (!hasGst && !notApplicable)) return null;
```

**Lines changed:** +2 (advAmt + gstBase), modified 2 (computeRoomGst arg + slab rate lookup)

---

## Edit E1b — `CheckInPage.jsx` GST strip: fix "Total incl. GST" display

**File:** `src/pages/pms/CheckInPage.jsx`
**Line:** 419

**Current code (verified 2026-09-09):**
```javascript
                                <span className="text-[#15803D] text-[13px]">₹{fmt(amt + gstTotal)}</span>
```

**Replace with:**
```javascript
                                <span className="text-[#15803D] text-[13px]">₹{fmt(gstBase + gstTotal)}</span>
```

**Rationale:** Total incl. GST = GST base (room + advance) + GST tax. Was showing room-only + GST (undercounting by advance amount).

**Lines changed:** 1

---

## Edit E2 — `CheckInPage.jsx` handleConfirm: include advance in GST base at submit

**File:** `src/pages/pms/CheckInPage.jsx`
**Lines:** 168–175

**Current code (verified 2026-09-09):**
```javascript
      // BUG-386: compute GST before submit
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        Number(form.orderAmount),
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
```

**Replace with:**
```javascript
      // BUG-386: compute GST before submit — BUG-388: gstBase includes advance (advance is additional charge)
      const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0); // BUG-388
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase, // BUG-388: was Number(form.orderAmount) only
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
```

**Lines changed:** +1 (gstBase declaration), modified 1 (arg: `Number(form.orderAmount)` → `gstBase`)

---

## Edit E3 — `pmsService.js` balance_payment: remove advance deduction

**File:** `src/api/services/pmsService.js`
**Line:** 159

**Current code (verified 2026-09-09):**
```javascript
    balance_payment: to2dp(orderAmount + (p.gstTax ?? 0) - advance), // BUG-386: include GST
```

**Replace with:**
```javascript
    balance_payment: to2dp(orderAmount + (p.gstTax ?? 0)), // BUG-388: advance is in GST base → (orderAmount+advance+gstTax)−advance = orderAmount+gstTax
```

**Rationale:**
```
total_invoice  = (orderAmount + advance) + gstTax   [advance is additional charge]
balance_payment = total_invoice − advance_already_paid
               = (orderAmount + advance + gstTax) − advance
               = orderAmount + gstTax
```
The `- advance` term disappears because advance is now both IN the GST base (taxable) and the prepayment amount.

**Lines changed:** 1

---

## Verification Matrix (Implementation agent must execute all)

| Edit | File | Verification Step | Expected Result |
|---|---|---|---|
| E1a | CheckInPage.jsx | Browser: Enter room ₹7,500 + advance ₹100, 1 night | GST strip: 18% Slab, CGST ₹684, SGST ₹684, Total GST ₹1,368 |
| E1b | CheckInPage.jsx | Same session as E1a | Total incl. GST: ₹8,968 (was ₹7,875) |
| E2 | CheckInPage.jsx | Network tab on "Log In" confirm | `gst_tax: 1368` in LOCAL_CHECKIN payload |
| E3 | pmsService.js | Network tab on "Log In" confirm | `balance_payment: 8868` in LOCAL_CHECKIN payload |
| R1 | Both files | Enter room ₹8,000, advance ₹0 | 18% slab (8000 >= 7500.01), GST ₹1,440, balance ₹9,440 |
| R2 | Both files | Enter room ₹5,000, advance ₹0 | 5% slab (5000 < 7500), GST ₹250, balance ₹5,250 |
| R3 | Both files | Enter room ₹7,400, advance ₹0 | 5% slab (7400 < 7500.01), GST ₹370, balance ₹7,770 |
| R4 | Both files | Enter room ₹7,400, advance ₹200 | gstBase=7600 → 18% slab, GST ₹1,368, balance ₹8,768 |
| R5 | CheckInPage.jsx | Advance = 0, room ₹7,500 | gstBase=7500 → (note: still 5% due to BUG-389 slab config — expected until backend fix) |
| R6 | pmsService.js | Non-WalkIn (Direct booking) | Same formula applies, payload correct |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-388 → status: "IMPLEMENTED", sprint_key: "pos_pms_1"
□ 2. BUG_TRACKER.md: BUG-388 row updated → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: add BUG-388 rows for CheckInPage.jsx + pmsService.js
□ 4. Code markers present:
     - CheckInPage.jsx: at least one // BUG-388 comment
     - pmsService.js: at least one // BUG-388 comment
□ 5. webpack compiles with 0 new warnings
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| E1/E2 `gstBase` variable scoped to GST strip IIFE — not accessible in handleConfirm | HIGH if copy-pasted | MEDIUM | Each location declares its own `gstBase` independently (IIFE + handleConfirm are separate scopes) |
| pmsService.js `advance` var still declared (L140) — now unused in balance_payment | LOW | LOW | `advance` var is still used in `advance_payment: advance` at L158. Not unused. |
| Regression: advance = 0 → gstBase = orderAmount (same as before) | N/A | N/A | R1-R3 verification steps confirm no regression at advance=0 |

---

## QA Handover Template

```markdown
## QA Handover — BUG-388

### §1 Items covered: BUG-388
### §2 Test cases: V1 matrix above (8 test cases + 2 regressions)
### §3 Test account: owner@thegoankitchen.com / Qplazm@10
### §4 URL: https://core-pos-preview-15.preview.emergentagent.com
### §5 Route: /pms/check-in
### §6 Registry: YES — EXIT GATE 5/5 PASS confirmed

Key TC:
- TC-388-01: Room ₹7,500 + advance ₹100 → 18% slab → GST ₹1,368 → balance ₹8,868
- TC-388-02: Network tab payload: gst_tax=1368, balance_payment=8868
- R-388-01: Room ₹8,000 + advance ₹0 → no regression (18% at 8000, balance ₹9,440)
- R-388-02: Room ₹5,000 + advance ₹0 → no regression (5% at 5000, balance ₹5,250)
```

---

*Gate 3 complete: BUG-388 | 4 edits across 2 files | 10 verification steps | 0 owner decisions pending*
*Awaiting Gate 4 GO from owner before implementation (R6 financial — mandatory per approval matrix)*
