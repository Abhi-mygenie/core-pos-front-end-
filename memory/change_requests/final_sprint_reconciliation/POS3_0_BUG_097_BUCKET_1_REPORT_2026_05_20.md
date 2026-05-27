# POS3.0 BUG-097 Bucket 1 — Implementation Report — 2026-05-20

## 1. Purpose

This document reports the Bucket 1 (Transform + Foundation) implementation for BUG-097.

No `/app/memory/final/` updated. No baseline docs updated.

---

## 2. What Was Changed

### File 1: `api/transforms/orderTransform.js`
**Change:** Added 10 lines after the existing `deliveryCharge` mapping (after L287).

**New fields mapped from backend order data:**

| Frontend Field | Source | Type | Notes |
|---|---|---|---|
| `deliveryMan` | `api.delivery_man` | object/null | Full delivery person object |
| `deliveryManId` | `api.delivery_man_id` | number/null | Delivery person ID |
| `deliveryManStatus` | `api.delivery_man_status` | string | "Yes"/"No" — rider accepted? |
| `orderDispatchStatus` | `api.order_dispatch_status` | string | "Yes"/"No" — dispatched? |
| `rider` | `api.delivery_man.f_name + l_name` | string/null | Constructed display name |
| `riderPhone` | `api.delivery_man.phone` | string/null | Phone from nested object |
| `riderStatus` | Computed | string/null | Derived from business rules below |

**`riderStatus` business rules (owner-approved):**

| Priority | Condition | Result | Meaning |
|---|---|---|---|
| 1 | `delivery_man_id` exists + `delivery_man_status === "Yes"` | `riderReached` | Rider accepted/active |
| 2 | `delivery_man_id` exists + `delivery_man_status === "No"` | `riderAssigned` | Rider assigned, pending accept |
| 3 | No `delivery_man_id` + `order_dispatch_status === "Yes"` | `dispatched` | Self-dispatched, no rider |
| 4 | No `delivery_man_id` + `order_dispatch_status !== "Yes"` | `null` | Awaiting action |

---

### File 2: `api/constants.js`
**Change:** Added 3 delivery endpoint constants inside `API_ENDPOINTS`.

| Constant | Value |
|---|---|
| `DELIVERY_EMPLOYEE_LIST` | `/api/v1/vendoremployee/delivery-employee-list` |
| `DELIVERY_ORDER_ASSIGN` | `/api/v1/vendoremployee/delivery-order-assign` |
| `DELIVERY_ORDER_CANCEL` | `/api/v1/vendoremployee/delivery-order-cancel` |

---

### File 3: `utils/statusHelpers.js`
**Change:** Added 1 entry to `RIDER_STATUS_CONFIG`.

| Key | Label | Color |
|---|---|---|
| `dispatched` | "Dispatched" | `COLORS.primaryGreen` |

---

### File 4: `components/cards/DeliveryCard.jsx`
**Change:** Replaced single button block (L190-198) with two conditional buttons.

**Before:** Single button showing `"Assign Rider"` for own / `"Dispatch"` for non-own (labels were SWAPPED).

**After:**
- **Dispatch button** shows ONLY when: `status === "ready"` AND `!deliveryManId` AND `source === "own"`
- **Assign Rider button** shows ONLY when: `status === "ready"` AND `!deliveryManId` AND `source !== "own"`
- **Neither shows** when a rider is already assigned (`deliveryManId` exists)

Both buttons retain `console.log` placeholders — actual API wiring is Bucket 2.

Added `data-testid` attributes: `dispatch-btn-{orderId}`, `assign-rider-btn-{orderId}`.

---

## 3. Build Verification

| Check | Result |
|---|---|
| `yarn build` | **Success** — 0 new warnings. Only pre-existing `OrderEntry.jsx` eslint warning. |
| Build output size | 439.13 kB JS (gzipped), 16.68 kB CSS |
| Dev server (`yarn start`) | **Compiled successfully** |
| New warnings introduced | **None** |
| New errors introduced | **None** |

---

## 4. What Was NOT Changed

- No API calls wired (Bucket 2)
- No socket handlers modified (Bucket 5)
- No new components created (Bucket 4)
- No `CollectPaymentPanel.jsx` touched (Bucket 3)
- No `/app/memory/final/` updated
- No baseline docs updated
- No service functions created (deferred to when API calls are wired)

---

## 5. QA Handoff — Bucket 1 Verification Points

### 5.1 Transform Verification (requires delivery order with assigned rider)
- [ ] Delivery order with `delivery_man` populated → `order.rider` shows rider name
- [ ] Delivery order with `delivery_man` populated → `order.riderPhone` shows phone
- [ ] Delivery order with `delivery_man_id` + `delivery_man_status: "Yes"` → `order.riderStatus === "riderReached"`
- [ ] Delivery order with `delivery_man_id` + `delivery_man_status: "No"` → `order.riderStatus === "riderAssigned"`
- [ ] Delivery order with no `delivery_man_id` + `order_dispatch_status: "Yes"` → `order.riderStatus === "dispatched"`
- [ ] Delivery order with no `delivery_man_id` + `order_dispatch_status: "No"` → `order.riderStatus === null`
- [ ] Non-delivery order → all new fields are null/default (no regression)

### 5.2 Button Logic Verification (requires delivery order on dashboard)
- [ ] `source === "own"` + `status === "ready"` + no rider → **Dispatch** button visible
- [ ] `source !== "own"` + `status === "ready"` + no rider → **Assign Rider** button visible
- [ ] Rider already assigned (`deliveryManId` exists) → **No Dispatch/Assign button** visible
- [ ] Non-ready status → **No Dispatch/Assign button** visible

### 5.3 Status Pill Verification
- [ ] `riderStatus === "riderAssigned"` → orange "Rider Assigned" pill
- [ ] `riderStatus === "riderReached"` → green "Rider Reached" pill
- [ ] `riderStatus === "dispatched"` → green "Dispatched" pill
- [ ] `riderStatus === null` → no pill shown

### 5.4 Regression Check
- [ ] Dine-in orders render correctly (no new fields interfere)
- [ ] Takeaway orders render correctly
- [ ] Room orders render correctly
- [ ] Walk-in orders render correctly
- [ ] Payment/settlement flow unaffected

**Note:** Most transform/button verifications require a **live delivery order on preprod**. If no delivery orders exist, verification is deferred to Bucket 2 runtime testing.

---

## 6. Confirmation

- **Code changed:** 4 files (additive changes only)
- **Build:** Passed
- **Dev server:** Running
- **`/app/memory/final/`:** NOT updated
- **Baseline docs:** NOT updated
- **API calls wired:** NO (Bucket 2)
- **Socket handlers touched:** NO

---

*— POS3.0 BUG-097 Bucket 1 Implementation Report — 2026-05-20 —*
