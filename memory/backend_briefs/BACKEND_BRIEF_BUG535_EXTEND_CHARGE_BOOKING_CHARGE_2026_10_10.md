# BACKEND_BRIEF — BUG-535: LR Snapshot `charge.booking_charge` Must Be Rack Value After Extension

**Date:** 2026-10-10
**Filed by:** INVESTIGATION agent (INV-EXTEND-STAY-POST-EXTENSION-BUGS_2026_10_10.md)
**Priority:** P1 / HIGH
**Classification:** CONTRACT_MISMATCH — `charge.booking_charge` semantics changed after extension
**FE impact:** FolioCheckoutPanel shows ₹14,504 (wrong) instead of ₹11,020 (correct) for checkout bill after extending a discounted booking

---

## Problem

After a guest extends their stay, the LR (local-reservations) snapshot `charge.booking_charge` contains the **discounted** total (₹12,400 = ₹13,400 − ₹1,000), not the **rack** total (₹13,400).

This breaks the FE `FolioCheckoutPanel.jsx` formula which expects `charge.booking_charge` to always be the **rack** (pre-discount) value — consistent with original check-in behavior.

### Original check-in behavior (correct):
```
charge.booking_charge = ₹6,700   ← rack rate for 1 night
room_info.room_discount_amount = ₹1,000   ← check-in discount separate
FE computes: discountedPrice = ₹6,700 − ₹1,000 = ₹5,700 ✓
```

### After extension (broken):
```
charge.booking_charge = ₹12,400   ← already discounted (₹13,400 − ₹1,000)
room_info.room_discount_amount = ₹1,000   ← still present
FE computes: discountedPrice = ₹12,400 − ₹1,000 = ₹11,400  ← DOUBLE DISCOUNT
```

---

## Impact on FE

| | Current (broken) | After fix |
|---|---|---|
| FolioCheckoutPanel GST | ₹4,104 (18% on ₹11,400) | ₹620 (5% on ₹6,200/night) |
| SGST / CGST shown | ₹2,052 / ₹2,052 | ₹310 / ₹310 |
| Room balance | ₹14,504 | ₹11,020 |

---

## Locked Contract (from `extend_stay_charge_fe.md`)

| Field | Required semantics |
|---|---|
| `charge.booking_charge` | **RACK** rent (pre-check-in-discount) — always, including after extend |
| `charge.room_discount_amount` | Check-in discount ₹ — NOT enlarged for added nights |
| `charge.sgst / cgst` | Tax on **effective** (post-discount) stay |
| `charge.balance_due` | Net after check-in discount (server authority — already correct) |

---

## Endpoint

- **POST** `/api/v2/vendoremployee/pos/room-extend-stay` (extend response charge)
- **GET** `/api/v2/vendoremployee/pos/local-reservations` (LR list / snapshot charge after refetch)

Both must return `charge.booking_charge` = rack value.

---

## Files to Fix (BE)

Per the contract doc:
- `app/Services/Aiosell/AiosellReservationChargeService.php`
- `app/Services/Aiosell/AiosellLocalReservationService.php`

Action: When overlaying `charge` for an extended booking that has a check-in discount, write `booking_charge` as the **rack total** (sum of nightly rack rates), and `room_discount_amount` as the check-in discount separately.

---

## Reproduction

1. Check in a guest with a check-in discount (e.g. bonk r4, booking ₹6,700, discount ₹1,000)
2. Extend by 1 night
3. After extension confirm + Done, open Bill
4. Observe `charge.booking_charge` in the LR snapshot (GET local-reservations)
5. **Expected:** ₹13,400 (2 × ₹6,700 rack)
6. **Actual:** ₹12,400 (₹13,400 − ₹1,000, discounted)

---

## Co-deploy Note

FE fix (BUG-535: remove `* nights` from `discountedPrice * nights` in `FolioCheckoutPanel.jsx`) must be deployed **simultaneously** with this BE fix. Deploying either alone produces a different wrong value:
- BE only: ₹14,864 (wrong, different)
- FE only: ~₹10,970 (wrong, close but off by ₹50)
- Both: ₹11,020 ✓

---

## Test Account

- Vendor: `owner@thegoankitchen.com` / `Qplazm@10` (RID 69, The Goan Kitchen)
- Booking: nobo r4, 2 nights post-extension, discount ₹1,000
- Expected `charge.booking_charge` after LR refresh: ₹13,400
