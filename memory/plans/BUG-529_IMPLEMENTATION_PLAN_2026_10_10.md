# BUG-529 — Intake + Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
## Folio CPP Shows Food-Only (₹248) — Double-Discount Regression from BUG-527 E1

**Date:** 2026-10-10
**Priority:** P0
**Risk:** HIGH
**Sprint:** oct_bug_batch
**Related:** BUG-527 (E1 introduced this regression)
**Evidence:** Owner screenshot — dashboard CPP correct (Food ₹248 + Room ₹600 = ₹848); folio CPP broken (₹248 only)

---

## Intake (Gate 1)

**Duplicate check:** DISTINCT (BUG-526 = folio split gray; BUG-527 = dashboard; BUG-529 = folio CPP double-discount)
**Code reality:** NONE — fix not yet applied
**Blast radius:** SMALL — 1 file (`frontDeskService.js`), 1 line, NOT R5
**Fast Lane eligible:** YES (1 file, ≤10 lines, not R5, not financial payload) — owner must approve

---

## Impact Analysis (Gate 2)

### Data flow

```
Dashboard path (CORRECT):
  OrderEntry → CPP: roomInfo.remainingRoomBalance=1600, roomInfo.discountAmount=1000
  CPP E1: Max(0, 1600−1000) = 600 → effectiveTotal = 248+600 = 848 ✓

Folio path (BROKEN):
  FolioCheckoutPanel → roomInfoFromCharge(order.roomInfo, {balance_due: 600})
  roomInfoFromCharge L169-175:
    ...(roomInfo)           → discountAmount=1000 preserved from spread  ← BREAK POINT
    remainingRoomBalance=600 (already post-discount from FolioCheckoutPanel)
  CPP E1: Max(0, 600−1000) = 0 → effectiveTotal = 248+0 = 248 ✗
```

### Risk classification
- File: `frontDeskService.js` — NOT R5, not financial payload
- Change: sets `discountAmount: 0` in the roomInfo override
- CPP E2 (check-in discount line): `(roomInfo.discountAmount || 0) > 0 && (...)` → with fix, discountAmount=0 in folio path → discount line NOT shown in folio CPP (correct — discount already shown in folio left panel)
- No backend payload change — `payment_amount` computed from `fbOnlyTotal` which uses CPP's `effectiveTotal`, not `discountAmount` directly
- Non-folio orders: unaffected — `roomInfoFromCharge` only called from `FolioCheckoutPanel.jsx:411`

### Conflict pre-check
Last modifier of `frontDeskService.js`: BUG-515 (L141-153) and CR-385 M0. Neither touches L169-175. **NONE.**

---

## Implementation Plan (Gate 3)

### Scope lock
**Files WILL change:** `src/api/services/frontDeskService.js` — 1 line
**Files WILL NOT touch:** `CollectPaymentPanel.jsx` (R5), `FolioCheckoutPanel.jsx`, `orderTransform.js` (R5), any test files

### Edit E1 — `frontDeskService.js:174` — add `discountAmount: 0`

**Current (L169-175):**
```js
export const roomInfoFromCharge = (roomInfo, charge) => ({
  ...(roomInfo ?? {}),
  roomPrice: Number(charge?.booking_charge ?? 0),
  gstTax: Number(charge?.sgst ?? 0) + Number(charge?.cgst ?? 0),
  advancePayment: Number(charge?.advance_payment ?? 0),
  roomPaymentSummary: { ...(roomInfo?.roomPaymentSummary ?? {}), remainingRoomBalance: Number(charge?.balance_due ?? 0) },
});
```

**New (L169-176):**
```js
export const roomInfoFromCharge = (roomInfo, charge) => ({
  ...(roomInfo ?? {}),
  roomPrice: Number(charge?.booking_charge ?? 0),
  gstTax: Number(charge?.sgst ?? 0) + Number(charge?.cgst ?? 0),
  advancePayment: Number(charge?.advance_payment ?? 0),
  roomPaymentSummary: { ...(roomInfo?.roomPaymentSummary ?? {}), remainingRoomBalance: Number(charge?.balance_due ?? 0) },
  discountAmount: 0, // BUG-529: balance_due is already post-check-in-discount; prevent CPP E1 double-subtraction
});
```

### Why this is correct
- `balance_due` passed into `roomInfoFromCharge` = `baseBalance − roomDiscountInfoRs` = already post-discount (600)
- CPP E1 reads `remainingRoomBalance(600) − discountAmount(0) = 600` ✓
- `effectiveTotal = food(248) + room(600) = 848` ✓ — matches dashboard
- Check-in discount line (CPP E2): `discountAmount=0` → line NOT shown in folio CPP (discount already shown in folio left panel — correct per design)
- Dashboard path: unaffected — uses `orderData.roomInfo` directly (not via `roomInfoFromCharge`)

### Verification matrix

| Check | Method | Expected |
|---|---|---|
| E1 code marker | `grep -n "BUG-529" frontDeskService.js` | hit at L175 |
| folio CPP roomBalance | Browser: folio path → Checkout → CPP | Food Total ₹248 + Room Balance ₹600 = Grand Total ₹848 |
| dashboard CPP unaffected | Browser: dashboard → Checkout → CPP | Same ₹848 |
| compile | webpack | 0 new warnings |

### Post-code registry checklist
```
□ 1. registry.json: BUG-529 → GATE_5A_IMPLEMENTED
□ 2. BUG_TRACKER.md: BUG-529 row added
□ 3. FILE_OWNERSHIP.md: frontDeskService.js → BUG-529
□ 4. Code marker: // BUG-529 at edit location
□ 5. Compile: 0 new warnings
```

---

## QA handover seed

| # | Test | Steps | Expected |
|---|------|-------|----------|
| TC-1 | Folio CPP shows ₹848 | /pms/front-desk-v2?tab=inhouse → bonk → Bill → CPP | Food ₹248 + Room Balance ₹600 = Grand Total **₹848** |
| TC-2 | Checkout button ₹848 | Same | Checkout ₹848 green |
| TC-3 | Dashboard CPP regression | Dashboard → bonk r4 → Checkout | Still ₹848 (unaffected) |
| TC-R1 | Check-in discount line absent from folio CPP | TC-1 path → expand Room section | No "Check-in Discount" line (shown in left panel instead — correct) |
| TC-R2 | Check-in discount line present in dashboard CPP | TC-3 path → expand Room section | "Check-in Discount −₹1,000" visible |

**Credentials:** owner@thegoankitchen.com / Qplazm@10 · bonk r4 order #000361
