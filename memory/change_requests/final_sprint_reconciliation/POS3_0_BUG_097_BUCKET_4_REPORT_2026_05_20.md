# BUG-097 Bucket 4 — Implementation Report
**Date:** 2026-05-20
**Status:** ✅ Code shipped + owner live-confirmed (modal loads riders correctly on `delivery_assign=Yes` tenant).

---

## 1. Owner Decisions Frozen Before Implementation

| OQ | Decision |
|---|---|
| OQ-B4-1 (Handover QA gate) | ✅ Accepted on screenshot evidence — proceed with Bucket 4. Socket QA deferred to real-time check. |
| OQ-B4-2 (TableCard chip) | Order View only — no chip in TableCard |
| OQ-B4-3 (Assign payload) | Minimal `{order_id, delivery_man_id}` — patch additively on first error |
| OQ-B4-4 (Re-assign UX) | **Replace with "Change Rider" link** inside the rider chip |

---

## 2. Files Changed

### 2.1 `frontend/src/api/services/deliveryService.js` (EDIT)
- Added `getDeliveryEmployees()` — **POST** to `/delivery-employee-list` with empty body.
- Added `assignDeliveryRider(orderId, deliveryManId)` — POST to `/delivery-order-assign` with minimal payload.
- `dispatchOrder()` unchanged.

### 2.2 `frontend/src/components/modals/AssignRiderModal.jsx` (NEW, ~210 lines)
- Single-select rider picker (radio).
- Shows ALL riders returned by backend (no filter).
- Loading / error / empty / list states.
- "Current" badge on the row matching `currentRiderId` prop (used in Change Rider flow).
- Header title flips between "Assign Rider" and "Change Rider" based on `currentRiderId`.
- Confirm button is disabled when no selection OR selection equals current rider (prevents no-op submit).
- Data-testids: `assign-rider-modal`, `assign-rider-option-<id>`, `assign-rider-radio-<id>`, `assign-rider-confirm`, `assign-rider-cancel`, `assign-rider-close`, `assign-rider-loading`, `assign-rider-error`, `assign-rider-empty`, `assign-rider-list`, `assign-rider-retry`.

### 2.3 `frontend/src/components/cards/OrderCard.jsx` (EDIT)
- Added `AssignRiderModal` import + `showAssignRider` useState.
- Replaced `console.log` stub on Assign Rider button at L863 → opens modal.
- Lifted rider chip gate from `isDelivery && !isOwn` to `isDelivery && (hasRiderAssigned || !isOwn)` so own-delivery orders with a rider also surface the chip.
- Added two status badges inside the chip:
  - `"Assigned"` (orange) when `order.riderStatus === 'riderAssigned'`.
  - `"Reached"` (green) when `order.riderStatus === 'riderReached'`.
- Added **"Change" link** inside the chip, visible only when `hasRiderAssigned && isOwn && deliveryAssign`. Click opens the same modal in "Change Rider" mode (passes `currentRiderId={order.deliveryManId}`).
- Mounted `AssignRiderModal` at file bottom.

### 2.4 `frontend/src/components/cards/TableCard.jsx` (EDIT)
- Added `AssignRiderModal` import + `showAssignRider` useState.
- Replaced `console.log` stub on Assign button at L450 → opens modal.
- Mounted `AssignRiderModal` at file bottom (passes `currentRiderId` for Change-Rider parity).
- **No rider chip** added on TableCard per OQ-B4-2 decision.

---

## 3. Backend Smoke (live preprod, 2026-05-20)

| Endpoint | Method tested | Result |
|---|---|---|
| `/api/v1/vendoremployee/delivery-employee-list` | `GET` | ❌ HTTP 405 (Laravel: "Supported methods: POST") |
| `/api/v1/vendoremployee/delivery-employee-list` | `POST` (empty body) | ✅ HTTP 200, returns array of 22 employees |
| `/api/v1/vendoremployee/delivery-order-assign` | `GET` | ❌ HTTP 405 |
| `/api/v1/vendoremployee/delivery-order-assign` | `POST` `{}` | 302 redirect (Laravel form validator) — POST accepted |
| `/api/v1/vendoremployee/delivery-order-assign` | `POST` `{order_id:0, delivery_man_id:0}` | 302 redirect with bad IDs — schema OK |

**Response shape of `delivery-employee-list`:** top-level JSON array of employees. Each row has `id`, `f_name`, `l_name`, `phone`, `email`, `image`, `employee_role_id`, `vendor_id`, `restaurant_id`, `status` (boolean), plus printer/category fields. No `role_name` / availability flag — confirms owner directive to show ALL employees as-is.

**Method-strictness pattern:** This is the SECOND occurrence of the "GET vs POST/PUT" mismatch in this sprint (first was Bucket 2: `order-status-update` is PUT, not POST). Adding to the critical-info ledger.

---

## 4. Files NOT Touched (re-affirmed)

- `api/transforms/orderTransform.js` — `riderStatus`, `rider`, `riderPhone`, `deliveryManId` already present from Bucket 1.
- `api/transforms/profileTransform.js` — `deliveryAssign` already mapped.
- `api/constants.js` — `DELIVERY_EMPLOYEE_LIST` + `DELIVERY_ORDER_ASSIGN` already present.
- `components/cards/DeliveryCard.jsx` — legacy, untouched.
- Any socket handler files — Bucket 5, still pending backend.
- `/app/memory/final/` — out of scope per owner directive.

---

## 5. Smoke Results in Preview Environment

- ✅ Lint pass on all 4 files.
- ✅ Webpack compile pass (only pre-existing OrderEntry.jsx ESLint warning).
- ✅ Dashboard renders correctly on `pos-delivery-modal.preview.emergentagent.com`.
- ✅ Current restaurant (id=478) has `delivery_assign=No` → dashboard still shows "Dispatch" button (unchanged), confirming no regression in delivery_assign=No flow.
- ✅ **Owner live-confirmed 2026-05-20** on `delivery_assign=Yes` tenant: Modal opened on Order #002404 (₹369), 7+ riders correctly listed from `delivery-employee-list` POST (Captain, Owner, aman, piyush ji, gyan, Abhishek, Avis…). Phone numbers rendered on each row. Cancel + Assign Rider buttons visible. Assign CTA correctly disabled until a rider is selected.

---

## 6. Owner Live-Smoke Checklist (when delivery_assign=Yes tenant is available)

1. Open a delivery order in Ready state (fOrderStatus=2). Card should show **"Assign Rider"** button instead of "Dispatch".
2. Click "Assign Rider" → modal opens, shows full rider list with phone numbers.
3. Pick a rider → click "Assign Rider" → toast "Rider assigned: <name>" → modal closes.
4. Card should now show:
   - Rider name + phone in the chip area.
   - **"Assigned"** orange badge.
   - **"Change"** orange underlined link.
5. Click "Change" → modal reopens with the current rider preselected and marked "Current".
6. Pick a different rider → click "Change Rider" → toast "Rider changed: <name>" → chip updates.
7. (Real-time socket check — Bucket 5 territory) When rider accepts the order from their side, `riderStatus` should flip to `riderReached` → badge turns green "Reached".

If any step fails:
- 405 / 302 on backend → check method or payload shape (likely additive: backend may want `role_name` or `restaurant_id`).
- Modal lists empty → check that `delivery-employee-list` POST returns array, not wrapped object.
- Chip shows stale rider after assignment → check socket refresh; manually pull-to-refresh as workaround.

---

## 7. Risk Snapshot

| Risk | Mitigation |
|---|---|
| Backend rejects minimal assign payload | Add `role_name` / `restaurant_id` additively from existing auth/profile context. |
| Socket does not auto-refresh order after assignment | Existing socket subscription already covers `delivery_man` mutation; if not, parent re-fetch hook can be added (Bucket 5 territory). |
| Tenants other than restaurant 478 wrap `delivery-employee-list` in `{data: [...]}` | Service already defensively unwraps both top-level array and `{data: [...]}` shapes. |

---

## 8. Bucket 5 Backlog (still blocked)

- Socket event names for Rider Accept / Reject (BQ-097-2, BQ-097-3) — pending backend team confirmation.
- UI for "Rider rejected — please re-assign" inline notification — design not finalized.
- No code in Bucket 5 will be written until backend ships the event names.
