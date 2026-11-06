# BUG-426 — Impact Analysis (Gate 2)

**ID:** BUG-426  
**Date:** 2026-09-16  
**Planning agent session:** 2026-09-16  
**Code Reality:** PARTIAL — BUG-421 Step 3 already fetches SINGLE_ORDER_NEW. Fix point exists. Only extraction logic is missing.  
**Conflict Pre-Check:** NONE — pmsService.js last touched by BUG-421 (IMPLEMENTED/CLOSED). InHouseGuestsPage.jsx last touched by CR-360 (CLOSED). No open items on these files.

---

## Risk Classification

- **Risk:** HIGH  
- **Reason:** Financial display. Balance column directly informs front-desk collection decisions. Wrong balance = wrong checkout amount presented to staff.  
- **Fast Lane:** NOT eligible (HIGH, financial, new extraction logic, 2 files)

---

## Owner Decisions Applied

| ID | Decision | Source |
|----|----------|--------|
| OD-426-01 | Include transferred F&B + room orders with item GST in In-House balance | Intake |
| OD-426-02 (OVERRIDDEN) | roomGstApplicable flag MUST be included and bound — not just a known limitation | Owner 2026-09-16 |
| OD-426-03 | Transferred F&B and room orders are 2 different computations — store as separate row sub-fields | Owner 2026-09-16 ("2 different") |
| OD-426-04 | Flag wired via `useRestaurant()` in `InHouseGuestsPage.jsx`, passed as parameter to `getInHouseGuests()` | Owner 2026-09-16 ("bound to both old and new screens") |

---

## Data Flow Trace

```
API:       POST API_ENDPOINTS.SINGLE_ORDER_NEW → { room_info, associated_order_list[], orderDetails[] }
           (same call already made in Step 3 — no new API needed)

Transform: pmsService.js Step 3 (L99-109)
           READS:   raw.room_info → rp + gt - ap - rb = roomBalance ✅
           MISSES:  raw.associated_order_list[]  ← transferredFnb ❌
           MISSES:  raw.orderDetails[]           ← roomOrdersTotal ❌
           MISSES:  roomGstApplicable parameter  ← GST conditional ❌

State:     rows[] in InHouseGuestsPage.jsx (line 16)
           Populated by getInHouseGuests() call at line 26

Component: InHouseGuestsPage.jsx
           Renders row.balance in Balance column
           totalBalance KPI sums row.balance values

UI:        Balance column + Outstanding Balance KPI both show wrong (too low) values
           Example: ₹950 shown, ₹1,624 expected

BREAK POINT: pmsService.js Step 3 L99-109 — only room_info read, other fields ignored
```

---

## roomGstApplicable Binding Analysis

Pattern used by existing screens:
- `CheckInPage.jsx` L64-65: `const { restaurant } = useRestaurant()` → `restaurant?.checkInFlags?.roomGstApplicable`
- `RoomCheckInModal.jsx` L295: same pattern

InHouseGuestsPage.jsx currently does NOT import `useRestaurant`. It calls `getInHouseGuests()` with no arguments (L26).

Fix:
1. `InHouseGuestsPage.jsx`: import `useRestaurant`, read flag, pass to service
2. `pmsService.js`: `getInHouseGuests({ roomGstApplicable = false } = {})` — optional param, safe default

This is the same binding pattern used across CheckInPage and RoomCheckInModal — consistent with "both old and new screens".

---

## Affected Files

| File | Change | Risk |
|------|--------|------|
| `src/api/services/pmsService.js` | Step 3: add transferred F&B + room orders computation, accept `roomGstApplicable` param | HIGH (financial) |
| `src/pages/pms/InHouseGuestsPage.jsx` | Import `useRestaurant`, read flag, pass to service | LOW (UI wire-up only) |

**Files NOT touched:** `GuestFolioPage.jsx`, `folioTransform.js`, `CheckInPage.jsx`, `RoomCheckInModal.jsx`, `PmsCheckoutDrawer.jsx`, `CollectPaymentPanel.jsx`

---

## Downstream Consumers

- `InHouseGuestsPage.jsx` → `row.balance` → Balance column cell
- `InHouseGuestsPage.jsx` → `totalBalance` KPI (line 40) — will auto-correct once rows have correct balance
- No other consumers of `getInHouseGuests()` found in codebase

---

## Data Shape Verified

From `folioTransform.js` (BUG-424, lines 90-129) — same SINGLE_ORDER_NEW response:
- `raw.associated_order_list[i].order_amount` — F&B order total (already-aggregated amount)
- `raw.orderDetails[i].quantity`, `.unit_price`, `.price`, `.food_details.tax`, `.food_status`, `.food_details.name`

Filtering rules (consistent with BUG-424 folioTransform):
- Skip if `food_details.name.toLowerCase() === 'check in'` (marker item)
- Skip if `food_status === 'cancelled'`

GST calculation (consistent with BUG-424):
- Pre-GST: `qty × unit_price`
- GST: `amount × food_details.tax / 100`
- Post-GST total per item: `amount + gstAmount`
- Only add GST when `roomGstApplicable === true`

---

## Conflict Pre-Check Result

PASS — No open items on `pmsService.js` or `InHouseGuestsPage.jsx`. BUG-421 (the Step 3 author) is IMPLEMENTED/CLOSED. Safe to extend.
