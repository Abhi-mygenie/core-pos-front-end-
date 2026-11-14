# CR-405-B — Bug Investigation Report (source_order_id blank)
**ID:** CR-405-B-BUG-1
**Date:** 2026-10-01
**Role:** INVESTIGATION (Role 6)
**Source:** OWNER-REPORTED (screenshot, 2026-10-01)
**Steps used:** 8/10

---

## 1. Summary

**Root cause:** `source_order_id: ""` in the `order-shifted-room` v1 payload.
`selectedRoom.orderId` is always `undefined` when the room list comes from a fresh fetch via `fetchOccupiedRooms()` → `tableService.getTables()` → `all-table-list` API. The `all-table-list` API never returns `order_id` on table objects.

**Classification:** CODE_ERROR (CR-405-B implementation assumed `orderId` on fresh-fetched rooms — but the API doesn't provide it)
**Confidence:** HIGH (API probe confirmed, data flow traced end-to-end)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps Used | Result | Evidence |
|---|---|---|---|---|---|
| H1 | `selectedRoom.orderId` is undefined (freshRooms path) | Code trace + API probe | 3 | **CONFIRMED** | tableTransform.js + API probe |
| H2 | `all-table-list` API omits `order_id` on table objects | Curl probe (`/api/v1/…/all-table-list`) | 2 | **CONFIRMED** | api_probe_all_table_list_2026_10_01.json |
| H3 | Cached `tables` prop (from DashboardPage) DOES have `orderId` | Code trace DashboardPage.jsx:593 | 2 | **CONFIRMED** | DashboardPage.jsx:593 `orderId: order.orderId` |
| H4 | `occupiedRoomsCached` (memoized from `tables` prop) available in scope | Code trace CollectPaymentPanel:214-215 | 1 | **CONFIRMED** | CollectPaymentPanel.jsx:214-215 |

---

## 3. Data Flow Trace — Break Point

```
User clicks "To Room"
  → fetchOccupiedRooms() called (CollectPaymentPanel:396)
      → tableService.getTables()
          → GET /api/v1/vendoremployee/all-table-list
              → Response: { id, table_no, rtype, engage, ... }
              → NO order_id in response ← API DOES NOT RETURN IT
          → fromAPI.tableList() → tableTransform.table()
              → maps: tableId, tableNumber, isRoom, isOccupied, ...
              → orderId: NEVER SET (not in API response)
      → freshRooms = rooms (all have orderId=undefined)

User selects room chip → setSelectedRoom(room)
  → selectedRoom.orderId = undefined  ← BREAK POINT

handlePayment() → paymentData.roomOrderId = selectedRoom.orderId
  → paymentData.roomOrderId = undefined

orderTransform.transferToRoom(table, paymentData, _roomId)
  → source_order_id: String(undefined || '') = ""  ← RESULT
  → target_order_id: String(table.orderId) = "1232936" ✅ (correct, from the current dine-in table)
```

**Correct data IS available** in `occupiedRoomsCached` (memoized from `tables` prop):
```
DashboardPage.jsx:593 builds tables with orderId: order.orderId (from running orders)
→ passed as `tables` prop to CollectPaymentPanel
→ CollectPaymentPanel:214-215: occupiedRoomsCached = tables.filter(t.isRoom && t.isOccupied)
→ occupiedRoomsCached rooms DO have orderId ✅
```

The problem: when `freshRooms !== null`, `occupiedRooms = freshRooms` (not cached). The Refresh button and the "To Room" auto-trigger both populate `freshRooms`, replacing the cached rooms that have `orderId`.

---

## 4. Evidence Artifacts

- API probe: `evidence/CR-405-B-BUG/api_probe_all_table_list_2026_10_01.json`
- Screenshot from owner: `source_order_id: ""` in network panel (provided 2026-10-01)

---

## 5. Fix

**Minimal fix — CollectPaymentPanel.jsx:1190 (2 lines added)**

```javascript
// before:
    if (paymentMethod === 'transferToRoom' && selectedRoom) {
      paymentData.isTransferToRoom = true;
      paymentData.roomId      = selectedRoom.tableId;
      paymentData.roomOrderId = selectedRoom.orderId;   // ← undefined from fresh fetch
    }

// after:
    if (paymentMethod === 'transferToRoom' && selectedRoom) {
      paymentData.isTransferToRoom = true;
      paymentData.roomId      = selectedRoom.tableId;
      // selectedRoom.orderId is undefined when from fresh fetch (all-table-list API has no order_id).
      // Fall back to occupiedRoomsCached which is enriched with orderId from running orders.
      // CR-405-B fix: use cached room as fallback for orderId
      const _cachedRoom = occupiedRoomsCached.find(t => t.tableId === selectedRoom.tableId);
      paymentData.roomOrderId = selectedRoom.orderId ?? _cachedRoom?.orderId;
    }
```

`occupiedRoomsCached` is already in scope (defined at CollectPaymentPanel:214).

---

## 6. Planning Skip Assessment

| Criterion | Value |
|---|---|
| ≤10 lines | YES (2 lines) |
| 1 file | YES (`CollectPaymentPanel.jsx`) |
| Not hotspot (R5) | **NO** — CollectPaymentPanel IS R5 |
| Not financial | YES (order routing) |

**Planning skip: NOT eligible** (hotspot file, R5).

However, since this is a bug WITHIN the already-approved CR-405-B (GATE_5B_QA_PASSED), and the root cause + fix are fully traced, owner may approve a direct fix exception.

---

## 7. Recommendations

**Option A (recommended — owner approves direct fix):**
- Apply the 2-line fix to `CollectPaymentPanel.jsx:1190`
- Re-run unit tests + add 1 regression test
- No planning gate needed (within existing CR-405-B scope)

**Option B (full gate cycle):**
- Register as BUG-485 or CR-405-B-P1
- Gate 2 → Gate 3 → Implementation → QA
- Use if owner wants formal audit trail

---
```
Root cause: CODE_ERROR — selectedRoom.orderId undefined from fresh table fetch
Classification: CODE_ERROR
Confidence: HIGH
Steps used: 8/10
FE fix: YES — 2 lines, CollectPaymentPanel.jsx:1190
Backend ask: NO
Planning skip eligible: NO (R5 hotspot)
Direct fix: YES — with owner approval (within CR-405-B scope)
Investigation report: investigations/CR-405-B-BUG_INVESTIGATION_2026_10_01.md
```
