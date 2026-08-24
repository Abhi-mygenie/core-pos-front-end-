# CR-163 — Impact Analysis (Gate 2)
## Move Food Items from Room Order to Table (Room-to-Table Transfer)

**Date:** 2026-08-24
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Based on intake:** `/app/memory/change_requests/CR-163_ROOM_TO_TABLE_FOOD_TRANSFER_INTAKE.md`

---

## Header

| Field | Value |
|---|---|
| Code Reality | PARTIAL — `TRANSFER_FOOD` + `TransferFoodModal` exist but are table-to-table only; no split-room-order constant, service, or UI |
| Conflict Pre-Check | MEDIUM — `CartPanel.jsx` and `OrderEntry.jsx` are active files with recent modifications (see §3) |
| Risk | **HIGH** — item-level transfer affects order totals, billing, inventory. R5 hotspot files touched. |
| Blast Radius | MEDIUM (5 files: 1 new constant, 1 service fn, 1 new modal, 1 CartPanel addition, 1 OrderEntry handler) |
| Gate 2 Status | **COMPLETE — all blockers resolved by curl evidence** |

---

## 1. Curl Validation — Blocker B-1 RESOLVED

**Endpoint confirmed deployed on preprod. Full validation map probed 2026-08-24:**

```
POST https://preprod.mygenie.online/api/v2/vendoremployee/order/split-room-order
Authorization: Bearer <token>
Content-Type: application/json
X-localization: en

{
  "order_id": 1232008,                       ← REQUIRED
  "order_detail_ids": [3112276, 3112277],    ← REQUIRED (or use "items: [{id}]")
  "customer_name": "Room 101",               ← optional, accepted, see §OQ-6 decision below
  "room_id": 6182,                           ← optional (backend derives from order_id)
  "remark": "Customer pays selected room items separately"  ← optional
}
```

**Validated field map:**

| Field | Required? | Notes |
|---|---|---|
| `order_id` | YES | Room order to split from |
| `order_detail_ids: [id, id]` | YES (or `items`) | **Preferred** — flat array, simpler |
| `items: [{id: N}]` | YES (or `order_detail_ids`) | Alternative object format |
| `customer_name` | NO | Accepted without error — see OQ-6 decision |
| `room_id` | NO | Optional — backend derives from `order_id` |
| `remark` | NO | Optional note |

**Key error responses confirmed:**
- Missing `order_id` + items → HTTP 403 validation errors (required fields listed)
- Order already paid/completed → HTTP 200 `{"status":false,"message":"This order is already completed and paid. Room split is not allowed."}`
- `customer_name` never appears in any validation error (not rejected)

**OQ-1 resolved:** No destination field → backend auto-creates output order.
**OQ-2 resolved:** Socket `update-order` fires after split → room total reduces automatically.
**OQ-3 resolved:** Min items on room = backend responsibility.

---

## 1b. OQ-6 — `customer_name` Decision LOCKED (2026-08-24)

**Decision: FE always sends `customer_name: "Room {roomNo}"`. Display degrades gracefully.**

```
FE sends:  customer_name: `Room ${orderData.roomInfo.roomNo}`   (e.g. "Room 101")

Backend uses it    → split order appears as "Room 101" on Dashboard  ✅
Backend ignores it → split order appears as "Walk-In" on Dashboard   ✅ (graceful fallback)
```

**Why this is safe:**
- `customer_name` was never rejected by validation in any probe — backend accepts the field
- DashboardPage line 602: `label: order.customer || 'Walk-In'` — if `user_name` not set, "Walk-In" is the natural fallback
- `orderData.roomInfo.roomNo` is already mapped at `orderTransform.js:402` — no new transform needed
- Zero risk: sending an extra field that backend ignores costs nothing

**FE payload (final):**
```js
{
  order_id: orderId,
  order_detail_ids: selectedItemIds,   // flat array — simpler than items:[{id}]
  customer_name: `Room ${roomNo}`,     // e.g. "Room 101"
  remark: remark || '',
  // room_id omitted — optional, backend derives it
}
```

---

## 2. Why `TRANSFER_FOOD` / `TransferFoodModal` are NOT reused

| | Existing `TRANSFER_FOOD` | New `split-room-order` |
|---|---|---|
| Endpoint | `/api/v2/vendoremployee/order/transfer-food-item` | `/api/v2/vendoremployee/order/split-room-order` |
| Direction | Table → Table | Room → auto-created order |
| Items | Single item | Multi-item selection |
| Destination | Staff picks destination table | Backend handles — no table picker |
| Rooms as destination | Blocked (BUG-066, intentional) | N/A |
| Remark | Not supported | `remark` field in payload |

`TransferFoodModal.jsx` is single-item with a table picker — wrong UX and wrong payload shape. A **new `SplitRoomItemsModal`** is needed. `TransferFoodModal.jsx` is NOT changed.

---

## 3. Conflict Pre-Check

| File | Last Modified By | Conflict Risk |
|---|---|---|
| `api/constants.js` | CR-062, CR-037 (additive) | LOW — additive constant only |
| `api/services/roomService.js` | BUG-092 agent | LOW — additive function |
| `SplitRoomItemsModal.jsx` | Does not exist | NEW — no conflict |
| `components/order-entry/CartPanel.jsx` | BUG-304 (2026-08-11), CR-018, BUG-195 | **MEDIUM** — active file, recent changes. Must read at target lines before editing. Additive prop + button only. |
| `components/order-entry/OrderEntry.jsx` | BUG-281, CR-098 (R5 hotspot) | **HIGH — R5** — read full cancel handler section before editing. Additive state + handler + CartPanel prop only. |

---

## 4. Data Flow Trace

```
Staff opens room order in OrderEntry (isRoom=true)
  ↓
CartPanel renders placed items
  ↓  [NEW] "Move Items" button — visible only when isRoom=true AND hasPlacedItems
  ↓
SplitRoomItemsModal opens
  → shows placed items with checkboxes (multi-select)
  → remark text input
  → Confirm button (disabled until ≥1 item selected)
  ↓
handleSplitRoomItems(selectedItemIds, remark) in OrderEntry
  → roomService.splitRoomOrder({ orderId, roomId, items:[{id}], remark })
      → api.post(SPLIT_ROOM_ORDER, payload)
          SUCCESS → toast "Items moved successfully"
                  → socket update-order fires → room order total reduces (automatic)
                  → close modal
          FAILURE → show inline error in modal
```

**Room ID source:** `orderData?.roomInfo?.roomId` — already in the order object via `orderTransform.js` line 389-400 (`roomInfo` block maps `room_info.id`). Confirm field name at planning time.

---

## 5. Affected Files — Scope Declaration

### Files WILL change (5):

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `src/api/constants.js` | Add `SPLIT_ROOM_ORDER: '/api/v2/vendoremployee/order/split-room-order'` to `API_ENDPOINTS` | LOW |
| 2 | `src/api/services/roomService.js` | Add `splitRoomOrder({ orderId, roomId, items, remark })` function | LOW |
| 3 | `src/components/order-entry/SplitRoomItemsModal.jsx` | **NEW FILE** — multi-item checkbox list + remark input + confirm | MEDIUM |
| 4 | `src/components/order-entry/CartPanel.jsx` | Add `setSplitItems` prop + "Move Items" action button — visible only when `isRoom && hasPlacedItems` | MEDIUM |
| 5 | `src/components/order-entry/OrderEntry.jsx` | Add `showSplitModal` state + `handleSplitRoomItems` handler + pass new prop to CartPanel | HIGH (R5) |

### Files will NOT touch:
- `TransferFoodModal.jsx` — table-to-table transfer, unaffected
- `DashboardPage.jsx` — split is only triggered from within OrderEntry (room order view)
- `orderTransform.js` — `roomInfo.roomId` already mapped
- `socketHandlers.js` — socket auto-handles order update after split
- `CollectPaymentPanel.jsx`, `AppProviders.jsx`

---

## 6. roomInfo.roomId Verification

Check that `room_info.id` (the room ID) is mapped in `orderTransform.js`:

```
orderTransform.js ~line 389:
  roomInfo: api.room_info ? {
    roomId: api.room_info.id,           ← confirm this key
    ...
  } : null
```

Implementation agent must verify exact field name before building the service payload.

---

## 7. SplitRoomItemsModal — Design Spec

```
Title: "Move Items to Table"
Subtitle: "Select items to split out from this room order"

Content:
  [x] Paneer Tikka         ₹320    ← checkbox per placed item (non-marker, non-cancelled)
  [x] Butter Naan × 2     ₹120
  [ ] Room Rent marker     —        ← disabled / always excluded (isCheckInMarker)

Remark field (optional):
  "Reason / note for the move"

Footer:
  [Move X Items]  ← disabled until ≥1 item selected; shows count of selected
```

Items excluded from selection:
- `item.isCheckInMarker === true`
- `item.status === 'cancelled'`
- Unplaced items (`item.placed === false`)

---

## 8. Risk Register

| Risk | Mitigation |
|---|---|
| Room ID not available | Verify `orderData?.roomInfo?.roomId` at entry verification. Fallback: `table?.roomId`. |
| Staff sends 0 items | Disable confirm button until ≥1 selected. Validate on submit. |
| Token/room mismatch on backend | Error surfaced via `err.readableMessage` in modal inline error |
| CartPanel change regression | Additive prop only — `setSplitItems` defaults to `null`; conditional render on `isRoom && setSplitItems` |
| OrderEntry R5 regression | Only adds state + handler + one CartPanel prop. No existing logic touched. |
| Socket doesn't update room total | OQ-2 resolved — socket fires `update-order` after backend split. No extra FE work. |

---

## 9. Verification Matrix

| Edit | File | Change | How to Verify |
|---|---|---|---|
| 1 | `constants.js` | `SPLIT_ROOM_ORDER` key | `grep 'SPLIT_ROOM_ORDER' src/api/constants.js` → 1 hit |
| 2 | `roomService.js` | `splitRoomOrder` exported | Import check, no compile error |
| 3 | `SplitRoomItemsModal` | Multi-select + remark renders | Open modal: checkboxes for placed items, remark field visible |
| 4 | `SplitRoomItemsModal` | Check-in markers excluded | Room order with marker: marker row NOT shown or disabled in list |
| 5 | `CartPanel.jsx` | "Move Items" button visible when isRoom | Room order in OrderEntry: button appears in placed items header |
| 6 | `CartPanel.jsx` | Button NOT visible for table orders | Regular table order: no "Move Items" button |
| 7 | `OrderEntry.jsx` | `handleSplitRoomItems` calls service | Network tab: confirm `split-room-order` POST fired with correct payload |
| 8 | Full flow | Room total reduces after split | Room order: select 2 items → move → room total decreases by those items' value |
| 9 | **Regression** | Table order transfer unchanged | Regular table → Transfer item → TransferFoodModal works as before |
| 10 | **Regression** | Room checkout unaffected | Room checkout flow: no impact from new button/state |

---

## 10. Post-Code Registry Checklist

```
- [ ] registry.json: CR-163 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: 5 files listed with CR-163 + date
- [ ] Code markers: // CR-163 in every modified file
- [ ] Compile: webpack 0 new errors
```

---

## 11. Open Questions

**All resolved — Gate 4 GO can proceed.**

| OQ | Question | Status |
|---|---|---|
| B-1 | Does backend support room-as-source? | ✅ Dedicated `split-room-order` confirmed deployed |
| OQ-1 | Pick existing table or auto-create? | ✅ Backend auto-creates — no destination in payload |
| OQ-2 | Real-time balance update? | ✅ Socket `update-order` handles automatically |
| OQ-3 | Minimum items on room? | ✅ Backend responsibility |
| OQ-6 | Room number as walk-in label? | ✅ **LOCKED** — FE always sends `customer_name: "Room {roomNo}"`. If backend uses it → "Room 101" on dashboard. If not → graceful "Walk-In" fallback. No blocking dependency. |

**Gate 4 GO required from owner before implementation.**

---

## Credentials

- Test account: `owner@18march.com / ***` (or any restaurant with active room orders)
- Preview URL: `https://core-pos-deploy-12.preview.emergentagent.com`
