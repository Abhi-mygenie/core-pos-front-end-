# BUG-427 — Impact Analysis (Gate 2)

**ID:** BUG-427  
**Date:** 2026-09-16  
**Planning session:** 2026-09-16  
**Code Reality:** PARTIAL — BUG-424 added `roomOrders` to folioTransform + Room Orders section in GuestFolioPage. Gap: `gstAmount` never totalled; roomOrders not in F&B tile or Total Balance Due.  
**Conflict Pre-Check:** NONE — `GuestFolioPage.jsx` last touched BUG-423/BUG-424 (IMPLEMENTED/closed). `folioTransform.js` last touched BUG-424 (IMPLEMENTED/closed). Both safe to extend.

---

## Risk Classification

- **Risk:** CRITICAL  
- **Reason:** Total Balance Due on the primary billing document is wrong (₹1,368 vs ₹1,624). Directly drives checkout collection amount. Under-collection by ₹256.  
- **Fast Lane:** NOT eligible (CRITICAL financial)

---

## Owner Decisions Applied

| ID | Decision | Source |
|----|----------|--------|
| OD-427-01 | Total Balance Due = room + transferred F&B + room orders (post-GST) = ₹1,624 | Intake |
| OD-427-02 | Room Orders section total uses post-GST; per-row display stays pre-tax with GST expand | Intake |
| OD-427-03 | F&B Posted tile includes room orders total | Intake |
| OD-427-04 | **"2 different"** — F&B Posted tile splits into 2 SEPARATE tiles: "Transferred F&B" + "Room Orders" | Owner 2026-09-16 |
| OD-427-05 | `roomGstApplicable` flag is required — guards whether food item GST is included in `roomOrdersTotal` | Owner 2026-09-16 ("yes will be required") |
| OD-427-06 | Flag bound via `useRestaurant()` same pattern as `CheckInPage.jsx` → `restaurant?.checkInFlags?.roomGstApplicable` | Owner 2026-09-16 |
| OD-427-07 | GST slab info from `restaurant?.checkInFlags` — food item GST rate comes from `food_details.tax` per-item in API; no need to re-derive from slab | Owner note 2026-09-16 |

---

## Data Flow Trace

```
API:        POST SINGLE_ORDER_NEW → raw.orderDetails[] per item has:
              .quantity, .unit_price, .price, .food_details.tax (GST %),
              .food_status, .food_details.name

Transform:  folioTransform.js fromAPI() (L105-129, BUG-424)
              Per item: amt = unit * qty
                        gstAmt = amt * food_details.tax / 100    ← computed
                        amount = amt                              ← pre-tax only
              MISSING: totalAmount = amt + gstAmt               ← gap

State:      folio.roomOrders[] in GuestFolioPage (L122: setFolio(fromAPI(raw)))

Component:  GuestFolioPage.jsx
  L133:     fnbTotal = associatedOrders.reduce(a.amount)        ← transferred only, correct
  L350:     Room Orders Total = roomOrders.reduce(r.amount)     ← pre-tax, WRONG
  L383:     F&B Posted tile = fnbTotal                          ← missing room orders, WRONG
  L390:     Total Balance Due = roomBalance + fnbTotal           ← missing room orders, WRONG

UI:         Balance Breakdown section shows wrong amounts
            F&B Posted: ₹418 (should be 2 tiles: ₹418 + ₹256)
            Total Balance Due: ₹1,368 (should be ₹1,624)

BREAK POINTS:
  1. folioTransform.js: no `totalAmount` field
  2. GuestFolioPage.jsx L350: uses `r.amount` not post-GST
  3. GuestFolioPage.jsx L383/L390: roomOrders absent from totals
  4. GuestFolioPage.jsx: no roomGstApplicable flag (no useRestaurant import)
```

---

## roomGstApplicable Binding Analysis

`GuestFolioPage.jsx` currently does NOT import `useRestaurant` or access restaurant context.

Pattern to match (CheckInPage.jsx L64-65):
```js
const { restaurant } = useRestaurant();
const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};
```

For food item GST: rate comes from `food_details.tax` per-item in the API response. The `roomGstSlabs` is for room booking GST — not needed here. Only `roomGstApplicable` boolean is needed to decide whether to add food item GST to the total.

---

## "2 Different Tiles" Layout Change

Current Balance Breakdown (L371-393):
```
[grid-cols-2]
  [Room Balance]   [F&B Posted]
[Total Balance Due row]
```

New layout (OD-427-04):
```
[grid-cols-3 OR 2+1 stacked]
  [Room Balance]   [Transferred F&B]   [Room Orders]
[Total Balance Due row]
```

Implementation: Change `grid-cols-2` to `grid-cols-3`. Rename existing F&B Posted tile to "Transferred F&B". Add third tile "Room Orders" showing `roomOrdersTotal`.

---

## Affected Files

| File | Change | Risk |
|------|--------|------|
| `src/api/transforms/folioTransform.js` | Add `totalAmount: amt + gstAmt` per roomOrder item | LOW (additive field) |
| `src/pages/pms/GuestFolioPage.jsx` | Import useRestaurant, read flag, 2 tile layout, fix Room Orders total + Total Balance Due | CRITICAL (financial) |

**Files NOT touched:** `pmsService.js`, `CheckInPage.jsx`, `RoomCheckInModal.jsx`, `PmsCheckoutDrawer.jsx`, `CollectPaymentPanel.jsx`

---

## Downstream Consumers of folioTransform

- Only `GuestFolioPage.jsx` imports `fromAPI` from `folioTransform.js`. Adding a new `totalAmount` field is purely additive — no other consumer is affected.

---

## Conflict Pre-Check Result

PASS — no open items on either file. BUG-424 (last author) is IMPLEMENTED/CLOSED.
