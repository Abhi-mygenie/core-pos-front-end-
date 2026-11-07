# BACKEND_BRIEF — Dashboard Tile / InHouse Balance: SC Gap + Discount Fallback
## Date: 2026-10-10 | Priority: P1 / MEDIUM

---

## Summary

Two related backend data gaps affecting balance and total display across:
- Dashboard room tile (`computeRoomCardAmount`)
- In-House / Departures balance column (fallback when folio call fails)

---

## Gap 1 — `order.amount` excludes Service Charge (Issue D)

### Endpoint
- **Context:** Order list / socket events → `orders[].amount` field
- The FE reads `order.amount` for the dashboard room tile total

### Problem
`order.amount` returns the food subtotal **without** service charge. The POS checkout panel (`CollectPaymentPanel`) uses a separate server-authoritative total that **includes** SC. This creates a ₹21 gap (10% SC on food ≈ ₹20-21) between:
- Dashboard tile: food(₹227) + room(₹600) = ₹827
- CPP/Checkout: food+SC(₹248) + room(₹600) = ₹848

### Ask
**Option A (preferred):** Include service charge in `order.amount` so it matches the POS grand total.
**Option B:** Add a new field `amount_with_sc` (food total including service charge) to the order object in the room order list/socket response, so the FE can display a consistent total.

The field used: `api.amount` in `orderTransform.fromAPI.order()` which maps to `order.amount` in the FE order context.

---

## Gap 2 — LR `charge` snapshot missing `room_discount_amount` (Issue C)

### Endpoint
- `GET /api/v1/vendoremployee/local-reservations` (or equivalent in-house listing)
- The `charge` object in each reservation row

### Problem
The FE in-house balance calculation has a 2-step process:
1. **Step 2 (fast):** Uses `LR.charge.balance_due` as initial fallback = pre-discount balance (e.g., ₹1,650 = booking₹3,150 - advance₹1,500)
2. **Step 3 (slow, per-order):** Calls `getSingleOrder` for each in-house guest to get `room_info.room_discount_amount` and compute the discounted balance

When Step 3 fails (timeout, load, CORS) the FE falls back to ₹1,650 (pre-discount). This causes intermittent inconsistency:
- Step 3 success: balance column = ₹827 (food ₹227 + room ₹600 post-discount) ✓
- Step 3 failure: balance column = ₹1,650 (pre-discount) ✗

### Ask
Add `room_discount_amount` to the `charge` object in the local reservations listing API response. The FE already reads `charge.booking_charge`, `charge.advance_payment`, `charge.sgst`, `charge.cgst`, `charge.balance_due` from this response.

With `charge.room_discount_amount` available:
```
discounted_balance = booking_charge + gst - room_discount_amount - advance
                   = 3000 + 150 - 1000 - 1500 = 650
```

This eliminates the need for per-order `getSingleOrder` folio calls just for balance display, removes the intermittent ₹1,650 fallback, and makes the balance column consistent.

**Impact:** In-house and departures balance column would always show the discounted balance even during network delays.

---

## Frontend Impact (for each fix)

### Gap 1
- `DashboardPage.jsx:computeRoomCardAmount` — change `order?.amount` to `order?.amountWithSC` (or simply ensure `order.amount` includes SC)
- No logic change, just field reference

### Gap 2
- `pmsService.js:Step 3` — once `charge.room_discount_amount` is available in LR response, Step 3 folio calls become optional (only needed for room order totals, not balance)
- `FrontDeskWorkstationPage.jsx:useRowBalances` — can use LR charge data directly as fallback

---

## Evidence
- Dashboard tile screenshot: ₹827 (order.amount=227 + roomBal=600)
- CPP checkout: ₹848 (finalTotal=248 + roomBal=600)
- InHouse balance: ₹1,650 (LR charge.balance_due, no discount) or ₹827 when Step 3 succeeds
- File: `src/pages/DashboardPage.jsx:48-57` (`computeRoomCardAmount`)
- File: `src/api/services/pmsService.js:78-173` (Step 2/Step 3 balance pipeline)
- File: `src/pages/pms/FrontDeskWorkstationPage.jsx:31-41` (`useRowBalances`)
