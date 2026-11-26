# BUG-493 — Impact Analysis (Gate 2)

**ID:** BUG-493
**Date:** 2026-10-06
**Author:** Planning agent
**Code Reality:** PARTIAL — buggy formula is live; fix is 1 line in Step 2 + 2-line guard in Step 3
**Conflict Pre-check:** pmsService.js last modified BUG-490/491 (2026-10-05) — parallel-safe (different line ranges in Step 2/3)

---

## 1. Root Cause (confirmed by probe + code trace)

`getInHouseGuests()` Step 3 computes BALANCE using:
```javascript
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
```
`row.charge` is **never set** — `roomListTransform` produces no `charge` field, and Step 2 only sets `checkinDate`, `bookingCheckin`, `checkoutDate`, `balance`, `channel`. Result: `chargeGst = 0` for ALL in-house orders.

The fix is to add ONE line at the end of the Step 2 `rows.forEach`:
```javascript
row.charge = match.res.charge ?? null;  // BUG-493
```

The local-reservations API (`/api/v2/vendoremployee/aiosell/local-reservations`) **already returns** `charge.sgst` and `charge.cgst` at reservation level (confirmed by probe 2026-10-06, evidence/INV-492-CHECKOUT-DISPLAY/BUG493_probe_summary.json).

---

## 2. OD-493-01 (LOCKED = Option B)

When `balance_payment = 0` (discount zeroed out the room balance), show BALANCE = ₹0. GST is considered waived. Formula guard:
```javascript
const roomBalance = bp != null
  ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst))   // OD-493-01 Option B
  : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0));
```

---

## 3. Affected Files

| File | Lines | Change |
|------|-------|--------|
| `src/api/services/pmsService.js` | L67 (after `row.channel`) | +1 line: `row.charge = match.res.charge ?? null;` |
| `src/api/services/pmsService.js` | L112-114 (roomBalance formula) | +bp===0 guard (OD-493-01 Option B) |

**NOT touched:** All other files. Not a hotspot file. Risk: MEDIUM.

---

## 4. Downstream impact

- `row.charge` is read ONLY in Step 3 `chargeGst` formula — no other consumer in codebase
- Step 3 fallback formula (`rp + gt - ap - rb - discount`) is untouched (null-charge path)
- Transfered F&B and room-orders calculations remain unchanged
- `row.balance` (final field) may change for non-fully-discounted orders (+GST amount)
- Zero impact on FolioCheckoutPanel, CollectPaymentPanel, CheckInPage, CheckInForm

---

## 5. Risk Classification

**MEDIUM** — financial display field (BALANCE column), 1 file, not R5 hotspot, owner-approved OD. No API contract change.

---

## 6. Verification

| # | Check | Method |
|---|-------|--------|
| V-493-1 | `row.charge` set = `match.res.charge` after Step 2 | Code grep + unit test |
| V-493-2 | BALANCE for order 1232903: ₹1,002.50 (was ₹950) | Browser + probe |
| V-493-3 | BALANCE for order 1232965 (₹200 discount): ₹802.50 (was ₹750) | Browser |
| V-493-4 | BALANCE for order 1232972 (bp=0): ₹0 (OD-493-01 Option B) | Browser |
| V-493-5 | chargeGst=0 when `match.res.charge` is null — graceful | Code review |

Gate 2 complete. Gate 3 ready.
