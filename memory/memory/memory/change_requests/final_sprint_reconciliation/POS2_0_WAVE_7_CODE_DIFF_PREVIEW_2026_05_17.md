# POS2.0 Wave 7 Code Diff Preview — 2026-05-17

## 1. Purpose

This document is **Gate 7** — the exact code diff preview for Wave 7 bugs (BUG-058, BUG-060, BUG-061). **No code changes are applied until the owner approves (Gate 8).**

---

## 2. Repo / Commit

| Field | Value |
|---|---|
| Branch | `17-may` |
| Gate 6 doc | `POS2_0_WAVE_7_OWNER_APPROVAL_PLAN_2026_05_17.md` |

---

## 3. Implementation Order

Per Owner Approval Plan §6:

1. **BUG-060** — Room transfer source table clearing (most actionable; clear root cause)
2. **BUG-061** — Room check-in time data binding (partially actionable; may need runtime confirmation)
3. **BUG-058** — Prepaid hold settlement payload (needs runtime evidence for full validation)

---

## 4. BUG-060 — Source Table Not Clearing After Room Transfer

### Root Cause

After `api.post(ORDER_SHIFTED_ROOM)` succeeds in `OrderEntry.jsx` (L1457-1475), the code navigates away without performing **optimistic context clearing** of the source table/order. The backend emits socket events, but the frontend `handleOrderDataEvent` handler does not recognise the "shifted-to-room" status as a terminal state, so the source table remains "occupied" on the dashboard.

### Fix Strategy

Add optimistic FE context clearing **after** the POST succeeds and **before** `navigateAfterOrderAction()`:
1. `removeOrder(sourceOrderId)` — remove the source order from OrderContext
2. `updateTableStatus(sourceTableId, 'available')` — free the source table in TableContext
3. `setTableEngaged(sourceTableId, false)` — clear engage lock

This mirrors the pattern used by paid/cancel socket handlers when they call `syncTableStatus(order, updateTableStatus, 'available')` + `removeOrder()`.

### File 1: `OrderEntry.jsx`

**Location:** Lines 1457-1475 (inside `handlePaymentComplete` → Scenario 3 block)

```diff
 // Scenario 3 — Transfer to Room (Phase 2B)
 if (paymentData.isTransferToRoom && paymentData.roomId) {
   const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
   const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
   toast({ title: "Transferred to Room", description: res.data?.message || "Order transferred successfully" });
+  // BUG-060 (Wave 7): Optimistic FE context clearing — free the source
+  // table immediately after a successful room-transfer POST. Without
+  // this, the dashboard shows the source table as "occupied" until the
+  // next poll/refresh because the socket handler does not treat the
+  // "shifted" status as terminal. Same pattern as paid/cancel flows.
+  const sourceOrderId = effectiveTable?.orderId;
+  const sourceTableId = Number(effectiveTable?.tableId || 0);
+  if (sourceOrderId) {
+    removeOrder(sourceOrderId);
+  }
+  if (sourceTableId) {
+    updateTableStatus(sourceTableId, 'available');
+    if (setTableEngaged) setTableEngaged(sourceTableId, false);
+  }
   // CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026): replaced ...
   navigateAfterOrderAction();
 }
```

### Exact before/after

**BEFORE** (current code, L1456-1475):
```javascript
                  // Scenario 3 — Transfer to Room (Phase 2B)
                  if (paymentData.isTransferToRoom && paymentData.roomId) {
                    const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
                    const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
                    toast({ title: "Transferred to Room", description: res.data?.message || "Order transferred successfully" });
                    // CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026): replaced
```

**AFTER** (proposed):
```javascript
                  // Scenario 3 — Transfer to Room (Phase 2B)
                  if (paymentData.isTransferToRoom && paymentData.roomId) {
                    const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
                    const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
                    toast({ title: "Transferred to Room", description: res.data?.message || "Order transferred successfully" });
                    // BUG-060 (Wave 7): Optimistic FE context clearing — free the source
                    // table immediately after a successful room-transfer POST. Without
                    // this, the dashboard shows the source table as "occupied" until the
                    // next poll/refresh because the socket handler does not treat the
                    // "shifted" status as terminal. Same pattern as paid/cancel flows.
                    const sourceOrderId = effectiveTable?.orderId;
                    const sourceTableId = Number(effectiveTable?.tableId || 0);
                    if (sourceOrderId) {
                      removeOrder(sourceOrderId);
                    }
                    if (sourceTableId) {
                      updateTableStatus(sourceTableId, 'available');
                      if (setTableEngaged) setTableEngaged(sourceTableId, false);
                    }
                    // CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026): replaced
```

### Files NOT touched
- `socketHandlers.js` — not modifying socket handler for this fix (optimistic approach sufficient; socket handler for cross-client consistency can be a follow-up if needed)
- `orderTransform.js` — transfer-to-room payload unchanged
- `TableContext.jsx` / `OrderContext.jsx` — only calling existing functions

### Risk: Low
- Only executes after `await api.post()` succeeds — no optimistic pre-POST risk
- Uses existing context functions (`removeOrder`, `updateTableStatus`, `setTableEngaged`)
- Walk-in transfers (no physical table, `tableId=0`) are safely skipped by the `if (sourceTableId)` guard

---

## 5. BUG-061 — Room Check-In Time Not Showing for In-House Rooms

### Root Cause

For **in-house rooms** (live source via `/get-room-list`):
- `roomListTransform.transformRoomListToRows()` sets `checkInDateTime: null` because the `/get-room-list` endpoint returns only `{ table, order_id, user }` — no date fields.
- The display relies on `displayCheckInIso = detail?.roomInfo?.checkInDate || row.checkInDateTime` (RoomRowCard L430-431).
- After the per-row detail fetch (`getSingleOrderRoom`), `detail.roomInfo.checkInDate` SHOULD be populated from `room_info.checkin_date` in the backend response (orderTransform L362).

For **checked-out rooms** (logs source via `getOrderLogsReport`):
- `orderLogsRowToRoomRowSeed()` sets `checkInDateTime: o.createdAt` — an immediate value is available before any detail fetch.

### Investigation Finding

The display code path is correct. The gap is:
1. **Initial seed has no date** for live rooms → shows "—" during loading
2. **If backend returns `room_info.checkin_date` for in-house rooms** → the detail fetch will populate it → date appears after loading
3. **If backend does NOT return `checkin_date` for in-house rooms** → the date stays "—" forever → **backend gap**

### Proposed Fix

Since we cannot modify the backend, we apply a **fallback enhancement** in the `roomListTransform.js` to extract any available date from the raw response, AND we add a `createdAt`-based fallback in `RoomRowCard.jsx` from the detail fetch.

### File 1: `RoomRowCard.jsx`

**Location:** Lines 430-431 (displayCheckInIso derivation)

```diff
   // Prefer roomInfo-sourced fields when available (Phase 4.1 extension).
   const displayGuestName =
     detail?.roomInfo?.guestName || row.guestName || 'Guest';
-  const displayCheckInIso =
-    detail?.roomInfo?.checkInDate || row.checkInDateTime;
+  // BUG-061 (Wave 7): Room check-in time for in-house rooms. Primary source
+  // is roomInfo.checkInDate (from detail fetch → room_info.checkin_date).
+  // Fallback chain: row.checkInDateTime (logs source uses o.createdAt),
+  // then detail.createdAt (order creation time as proxy for check-in).
+  const displayCheckInIso =
+    detail?.roomInfo?.checkInDate || row.checkInDateTime || detail?.createdAt || null;
```

### Exact before/after

**BEFORE** (current code, L427-431):
```javascript
  // Prefer roomInfo-sourced fields when available (Phase 4.1 extension).
  const displayGuestName =
    detail?.roomInfo?.guestName || row.guestName || 'Guest';
  const displayCheckInIso =
    detail?.roomInfo?.checkInDate || row.checkInDateTime;
```

**AFTER** (proposed):
```javascript
  // Prefer roomInfo-sourced fields when available (Phase 4.1 extension).
  const displayGuestName =
    detail?.roomInfo?.guestName || row.guestName || 'Guest';
  // BUG-061 (Wave 7): Room check-in time for in-house rooms. Primary source
  // is roomInfo.checkInDate (from detail fetch → room_info.checkin_date).
  // Fallback chain: row.checkInDateTime (logs source uses o.createdAt),
  // then detail.createdAt (order creation time as proxy for check-in).
  const displayCheckInIso =
    detail?.roomInfo?.checkInDate || row.checkInDateTime || detail?.createdAt || null;
```

### Verification of `detail.createdAt` availability

`orderTransform.fromAPI.order` (L189-221 area) produces `createdAt` from `api.created_at` — this is a standard field in every order response. The `getSingleOrderRoom` detail fetch calls this transform, so `detail.createdAt` will be available.

Let me confirm:

```
// orderTransform.js fromAPI.order (around L209):
createdAt: api.created_at || null,
```

This means for in-house rooms where `room_info.checkin_date` is null/absent, the order's `createdAt` provides a reliable proxy for check-in time (the room parent order is created at check-in time).

### Files NOT touched
- `roomListTransform.js` — no date available in `/get-room-list` raw response to extract
- `reportService.js` — logs-source path already has `checkInDateTime: o.createdAt`
- `formatCheckInDateTime` — format helper is correct per owner ("same format needs to be used")

### Risk: Low
- Display-only change — no payload, no socket, no financial logic affected
- Fallback chain preserves existing behavior: `roomInfo.checkInDate` still takes priority when available
- `detail.createdAt` is a widely available field on all transformed orders

### Runtime confirmation needed
- After implementation, verify on a live in-house room that the check-in time column shows a date/time value
- If `room_info.checkin_date` IS returned by backend for in-house rooms → the primary path works, `detail.createdAt` fallback is never reached
- If `room_info.checkin_date` is NOT returned → `detail.createdAt` (order creation time) serves as the display value

---

## 6. BUG-058 — Prepaid Hold Settlement Payload

### Root Cause (from code inspection)

`collectBillExisting()` in `orderTransform.js` (L1162-1334) builds the `order-bill-payment` payload. It does **not** include `payment_type` at all. For postpaid-hold orders, this works because the backend can infer `payment_type: 'postpaid'` when absent. For **prepaid-hold** orders, the backend may reject the payload because it expects `payment_type: 'prepaid'`.

The order's `paymentType` is available in the transformed detail:
- `orderTransform.fromAPI.order` (L221): `paymentType: api.payment_type || ''`
- In `CollectBillPanelDrawer.jsx`, `detail.paymentType` carries this value after the detail fetch

### Fix Strategy

1. **CollectBillPanelDrawer.jsx**: Pass `detail.paymentType` through to the payload builder via the `options` parameter
2. **orderTransform.js** `collectBillExisting`: Accept `paymentType` in options and include `payment_type` in the payload

### File 1: `CollectBillPanelDrawer.jsx`

**Location:** Lines 171-181 (handlePaymentComplete → collectBillExisting call)

```diff
       const payload = orderToAPI.collectBillExisting(
         effectiveTable,
         cartItems,
         customer,
         paymentData,
         {
           autoBill:       settings?.autoBill || false,
           waiterId:       user?.employeeId || '',
           restaurantName: restaurant?.name || '',
+          // BUG-058 (Wave 7): Pass the order's original payment type so the
+          // backend can distinguish prepaid-hold settle from postpaid-hold.
+          paymentType:    detail?.paymentType || '',
         }
       );
```

### Exact before/after

**BEFORE** (current code, L171-181):
```javascript
      const payload = orderToAPI.collectBillExisting(
        effectiveTable,
        cartItems,
        customer,
        paymentData,
        {
          autoBill:       settings?.autoBill || false,
          waiterId:       user?.employeeId || '',
          restaurantName: restaurant?.name || '',
        }
      );
```

**AFTER** (proposed):
```javascript
      const payload = orderToAPI.collectBillExisting(
        effectiveTable,
        cartItems,
        customer,
        paymentData,
        {
          autoBill:       settings?.autoBill || false,
          waiterId:       user?.employeeId || '',
          restaurantName: restaurant?.name || '',
          // BUG-058 (Wave 7): Pass the order's original payment type so the
          // backend can distinguish prepaid-hold settle from postpaid-hold.
          paymentType:    detail?.paymentType || '',
        }
      );
```

### File 2: `orderTransform.js` — `collectBillExisting`

**Location:** Line 1162-1163 (function signature / options destructure)

```diff
-  collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
-    const { autoBill = false, waiterId = '', restaurantName = '' } = options;
+  collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
+    const { autoBill = false, waiterId = '', restaurantName = '', paymentType = '' } = options;
```

**Location:** Line 1262-1264 (payload object, after `order_id`)

```diff
     const payload = {
       order_id:                     String(table.orderId),
+      // BUG-058 (Wave 7): Include the order's original payment_type so the
+      // backend can handle prepaid-hold settle correctly. Postpaid orders
+      // send 'postpaid' (or empty, which backend treats as postpaid).
+      // Prepaid-hold orders send 'prepaid'.
+      ...(paymentType ? { payment_type: paymentType } : {}),
       payment_mode:                 method,
```

### Exact before/after (signature)

**BEFORE** (L1162-1163):
```javascript
  collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
    const { autoBill = false, waiterId = '', restaurantName = '' } = options;
```

**AFTER** (proposed):
```javascript
  collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
    const { autoBill = false, waiterId = '', restaurantName = '', paymentType = '' } = options;
```

### Exact before/after (payload)

**BEFORE** (L1262-1264):
```javascript
    const payload = {
      order_id:                     String(table.orderId),
      payment_mode:                 method,
```

**AFTER** (proposed):
```javascript
    const payload = {
      order_id:                     String(table.orderId),
      // BUG-058 (Wave 7): Include the order's original payment_type so the
      // backend can handle prepaid-hold settle correctly. Postpaid orders
      // send 'postpaid' (or empty, which backend treats as postpaid).
      // Prepaid-hold orders send 'prepaid'.
      ...(paymentType ? { payment_type: paymentType } : {}),
      payment_mode:                 method,
```

### Also verify: OrderEntry.jsx Scenario 1 (collect-bill on existing order)

The same `collectBillExisting` is called in OrderEntry.jsx (L1596). Currently:

```javascript
const payload = orderToAPI.collectBillExisting(effectiveTable, cartItems, customer, paymentData, {
  autoBill: printAllBill,
  waiterId: user?.employeeId || '',
  restaurantName: restaurant?.name || '',
});
```

This path already has access to the order's data via `orderData` prop. However, the payment type for dashboard collect-bill flows may be derived differently. Since BUG-058 is specifically about the **Audit Hold tab** flow (CollectBillPanelDrawer), we only modify the drawer's call. The OrderEntry.jsx Scenario 1 call is **unchanged** — if it also needs `paymentType`, that's a separate investigation.

### Files NOT touched
- `CollectPaymentPanel.jsx` — shared panel component, unchanged
- `OrderEntry.jsx` Scenario 1 — dashboard collect-bill, unchanged (BUG-058 scope is Audit Hold tab only)
- Financial calculation logic — unchanged

### Risk: Medium
- Additive field (`payment_type`) — uses spread operator so it's only included when paymentType is non-empty
- Postpaid-hold flows: `paymentType` will be `'postpaid'` or `''` → `payment_type` is either `'postpaid'` (matching current behavior) or omitted (matching current behavior)
- Prepaid-hold flows: `paymentType` will be `'prepaid'` → `payment_type: 'prepaid'` is now included

### Runtime validation required
- After implementation, test: create prepaid order → hold → settle from Audit Hold tab → verify the backend accepts the payload
- If the backend still rejects: the error response will reveal what additional field(s) are needed (e.g., a different endpoint, or additional transaction reference)
- Postpaid-hold regression test: create postpaid order → hold → settle → verify still works

---

## 7. Summary of All Changes

| Bug | File | Change | Lines Affected |
|---|---|---|---|
| BUG-060 | `OrderEntry.jsx` | Add optimistic `removeOrder` + `updateTableStatus` + `setTableEngaged` after room transfer POST | ~L1460-1475 (6 new lines + 5 comment lines) |
| BUG-061 | `RoomRowCard.jsx` | Extend `displayCheckInIso` fallback chain to include `detail.createdAt` | L430-431 (2 lines changed + 3 comment lines) |
| BUG-058 | `CollectBillPanelDrawer.jsx` | Pass `detail.paymentType` in options to `collectBillExisting` | L171-181 (2 new lines) |
| BUG-058 | `orderTransform.js` | Accept `paymentType` in options; emit `payment_type` in payload | L1163 (1 line changed) + L1264 (3 new lines + comment) |

**Total files modified: 4**
**Total lines added: ~20**
**Total lines modified: ~3**

---

## 8. What is NOT Touched

- `socketHandlers.js` — not modifying socket handler (optimistic approach sufficient for BUG-060)
- `roomListTransform.js` — no date available in `/get-room-list` raw response
- `CollectPaymentPanel.jsx` — shared panel, no changes
- `OrderEntry.jsx` Scenario 1 — dashboard collect-bill path, out of BUG-058 scope
- `TableContext.jsx` / `OrderContext.jsx` — only calling existing functions
- All financial calculation logic — untouched
- All print/auto-print logic — untouched

---

## 9. QA Checks After Implementation

### BUG-060
1. Table order → Pay → To Room → confirm → **source table immediately shows "Available"** (fix)
2. Table order → Pay → Cash → **table correctly freed** (regression)
3. Table order → Cancel → **table correctly freed** (regression)
4. Walk-in → To Room → **no table status change** (tableId=0, skip logic applies)

### BUG-061
1. Rooms Report → Unpaid filter → in-house room → **check-in time column shows date/time** (fix)
2. Rooms Report → Paid filter → checked-out room → **check-in time still shows** (regression)
3. Rooms Report → All filter → both types → **check-in time shows for both** (fix + regression)

### BUG-058
1. Prepaid order → hold → settle from Audit Hold tab → **now works** (fix — runtime validation)
2. Postpaid order → hold → settle from Audit Hold tab → **still works** (regression)
3. Dashboard collect-bill flow → **unchanged** (regression)
4. PayLater hold settle → **unchanged** (regression)

---

## 10. Approval

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-060 | Approve exact diff above for implementation | pending |
| BUG-061 | Approve exact diff above for implementation | pending |
| BUG-058 | Approve exact diff above for implementation (runtime validation after) | pending |

**Options:**
- **A.** Approve all three diffs — proceed to Gate 8 (implementation)
- **B.** Approve selectively (specify which bugs)
- **C.** Request modifications to specific diffs
- **D.** Need clarification before approving

---

*— End of POS2.0 Wave 7 Code Diff Preview — 2026-05-17 —*
