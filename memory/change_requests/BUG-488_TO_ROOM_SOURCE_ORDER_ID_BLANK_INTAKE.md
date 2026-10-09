# BUG-488 — "To Room" transfer always fails: source_order_id blank because tableTransform drops orderId

**ID:** BUG-488
**Type:** BUG
**Date:** 2026-10-05
**Registered by:** Investigation agent (session 2026-10-05)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** HIGH
**Severity:** P0

---

## Description

Clicking the "To Room" payment method and selecting a room always fails with:
- HTTP **404** on `POST /api/v1/vendoremployee/order/order-shifted-room`
- Error: **"Payment Failed — Active room order not found"**
- Network tab shows: `{ "source_order_id": "", "target_order_id": "1232966", "transfer_note": "Yes" }`

`source_order_id` is always `""` for every room, every session. The entire "To Room" feature is non-functional.

---

## Root Cause (confirmed by investigation)

**Three-step chain:**

**Step 1 — Backend now sends `orderId` on `all-table-list`**
```
GET /api/v1/vendoremployee/all-table-list
→ occupied RM table response includes: "orderId": 1232956
```
Field name is camelCase `orderId` (not `order_id`). Confirmed by live curl probe 2026-10-05.

**Step 2 — tableTransform.fromAPI.table() does NOT map it**
```javascript
// tableTransform.js — fromAPI.table() return object
return {
  tableId: api.id,
  tableNumber: api.table_no,
  // ... all other fields mapped ...
  updatedAt: api.updated_at,
  // api.orderId ← NEVER READ — silently dropped
};
```
`api.orderId` is not in the return object. The transform is the single gatekeeper for ALL table data loaded into `TableContext`. After the transform, no table object anywhere in the app has `orderId`.

**Step 3 — CollectPaymentPanel reads the dropped field**
```javascript
// CollectPaymentPanel.jsx:1190 (CR-405-B)
paymentData.roomOrderId = selectedRoom.orderId;  // undefined
```
```javascript
// orderTransform.js:1761 (CR-405-B)
source_order_id: String(paymentData.roomOrderId || ''),  // String('') = ''
```

`source_order_id: ""` → BE cannot find the room order → 404.

**Why this was not caught:** CR-405-B unit tests mock `paymentData.roomOrderId` directly and never exercise the real picker → table → orderId flow.

---

## Duplicate Check

- Registry search: "tableTransform", "source_order_id", "orderId transfer", "shift room blank" — no existing entry
- CR-405-B (GATE_5B_QA_PASSED) introduced `selectedRoom.orderId` at CollectPaymentPanel:1190 — related but distinct (CR-405-B is the feature; this bug is its broken dependency)
- **Duplicate check: DISTINCT — Related: CR-405-B**

---

## Code Reality

**NONE** — fix not applied.

Current state at HEAD (`tableTransform.js:47–78`):
```javascript
return {
  tableId:         api.id,
  tableNumber:     api.table_no,
  displayName:     fromAPI.getDisplayName(api),
  sectionName:     api.title || null,
  tableType:       api.rtype === 'RM' ? TABLE_TYPES.RM : TABLE_TYPES.TB,
  isRoom:          api.rtype === 'RM',
  isActive:        isActive,
  isOccupied:      isOccupied,
  status:          fromAPI.getTableStatus(isActive, isOccupied),
  assignedWaiterId: api.waiter_id,
  qrCode:          api.qr_code,
  restaurantId:    api.restaurant_id,
  createdAt:       api.created_at,
  updatedAt:       api.updated_at,
  // api.orderId ← MISSING
};
```

---

## Severity

**P0 — CRITICAL**
- The "To Room" feature is **completely broken** — every single transfer attempt fails with 404
- No workaround (the blank `source_order_id` is deterministic for all rooms, all sessions)
- Affects any cashier trying to bill a dine-in order to a guest room
- Fix is 1 line — unblocks the feature immediately

---

## Risk Classification

**HIGH**
- `tableTransform.js` is used for ALL table loading (LoadingPage, useRefreshAllData, tableService.getTables)
- The change adds a new field to the return object — purely additive, no existing field altered
- No formula change, no financial logic
- Not in the R5 hotspot list
- FAST LANE ELIGIBLE: 1 file, 1 line, purely additive — pending owner "FAST LANE APPROVED"

---

## Evidence

- **Screenshot:** owner-provided — network tab shows `source_order_id: ""` + `payment_failed` + "Active room order not found"
- **Curl probe (2026-10-05):** `all-table-list` for room r3 (id 8524) returns `orderId: 1232956` — field confirmed present
- **Static trace:** `tableTransform.fromAPI.table()` return object — `api.orderId` not mapped — confirmed
- **Impact trace:** `CollectPaymentPanel:1190` reads `selectedRoom.orderId` → `undefined` → `source_order_id: ""`
- **Investigation report:** `investigations/INV_DASHBOARD_DOWNLOAD_PAYMENT_LABELS_2026_10_05.md` (inline session)
- **Source:** Owner-reported (screenshot in session 2026-10-05)
- **Confidence:** CONFIRMED (curl + static trace)

---

## Blast Radius

| File | Line | Change | Impact |
|------|------|--------|--------|
| `api/transforms/tableTransform.js` | ~78 (inside `fromAPI.table()` return) | Add `orderId: api.orderId \|\| null` | Populated in all table objects loaded via TableContext |

- **Consumers that auto-benefit (no changes needed):**
  - `CollectPaymentPanel.jsx:1190` — `selectedRoom.orderId` now defined ✅
  - `orderTransform.transferToRoom` — `source_order_id` now populated ✅
- **1 file, 1 line, no hotspot**
- **Blast radius: SMALL**

---

## Fix Sketch

In `tableTransform.js` `fromAPI.table()` return object, add after `updatedAt`:
```javascript
    // BUG-488: backend sends camelCase orderId for occupied rooms — pass through for room transfer
    orderId: api.orderId || null,
```

---

## Next

Planning Gate 2 → Implementation (FAST LANE candidate — 1 file, 1 line, owner approval needed).
P0 — recommend prioritising ahead of BUG-485 / BUG-487.
