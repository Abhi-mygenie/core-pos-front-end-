# CR-163 — Move Food Items from Room Order to Table (Room-to-Table Transfer)

**Type:** Change Request (New Feature — Backend Confirmation Needed)
**ID:** CR-163
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-ROOM-001

---

## Description

When food items are punched against a room order but a guest wants to pay for a specific order separately (not at room checkout), staff need to **move those items from the room to a table** — either an existing free table or a dynamically created one — so the table bill can be settled independently.

Example: Room 101 has ₹3k food + ₹7k room rent. A group of friends who joined for dinner want to settle the ₹3k food bill right now. Staff move those items to Table 5, guest at Table 5 pays, and Room 101 now only owes room rent.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Room Module → Room Order Entry → Item Transfer |
| Priority | P1 |
| Severity | HIGH — common hospitality scenario with no current workaround |
| Risk | HIGH (item-level transfer affects order totals, billing, inventory tracking) |
| Fast Lane | NO — new UI action + backend confirmation needed |

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-ROOM-001)
- Screenshot: not provided

## Code Reality

```bash
# TRANSFER_FOOD endpoint EXISTS:
  api/constants.js line 22:
    TRANSFER_FOOD: '/api/v2/vendoremployee/order/transfer-food-item'
  Used in: OrderEntry.jsx line 1141, TransferFoodModal.jsx

# TransferFoodModal currently BLOCKS rooms as destinations (BUG-066):
  TransferFoodModal.jsx line 22:
    !o.isRoom   ← rooms excluded as DESTINATIONS for transfer
  # This blocks rooms as destinations but DOES NOT block rooms as source

# Room orders as SOURCE — current status:
  TransferFoodModal.jsx is opened from CartPanel for any order type
  The destination filter (!o.isRoom) only blocks transfers TO rooms
  Whether backend /transfer-food-item accepts room order as from_order_id: UNCONFIRMED

# ORDER_SHIFTED_ROOM (table → room): EXISTS but direction is wrong (table→room only)
# ORDER_TABLE_SWITCH (full order shift): EXISTS but moves entire order, not individual items
```

- **Code reality: PARTIAL** — `TRANSFER_FOOD` endpoint and `TransferFoodModal` exist; room-as-source is unblocked on frontend but backend acceptance is unconfirmed; no "Move to Table" action visible on room order items

## Blast Radius

- `TransferFoodModal.jsx`: add room orders as valid destinations for this specific flow (or create a separate "Move to Table" modal for room context)
- `components/order-entry/CartPanel.jsx`: expose "Move to Table" action on room order items
- No new endpoint likely needed — `TRANSFER_FOOD` may already support this
- Estimated scope: MEDIUM (2-3 files, ~30-50 lines)

## Expected Behavior

1. Staff opens a room order in Order Entry
2. Per-item action: "Move to Table" button (alongside existing cancel/transfer options)
3. Staff picks destination: an existing free table from the table list
4. Items transfer from room order to selected table order
5. Room order total reduces accordingly; table order shows the transferred items
6. Staff collects table bill normally; room balance updates

## Owner Decisions Needed

1. Should staff pick an **existing free table**, or should a **temporary/dynamic table** be auto-created?
2. When items move out of room, should the room's outstanding balance auto-reduce in real time?
3. Should a minimum set of items always stay on the room order (e.g., room rent marker)?

## Open Blockers

| # | Blocker | Resolution |
|---|---------|------------|
| B-1 | Does `/transfer-food-item` backend accept room order as `from_order_id`? | Backend confirmation needed before Gate 3 |
| B-2 | If backend doesn't support it: new endpoint or workaround required | Backend team input |

## Dependency

- **Blocked on backend confirmation** — B-1 must be resolved before implementation plan
- Related to INV-ROOM-001 (investigation confirmed this is the right approach)

## Duplicate Check

DISTINCT — no prior CR for room-to-table food transfer.
RELATED to BUG-066 (rooms excluded from TransferFoodModal destinations — the inverse direction).

---

**Backend Brief Needed:** Confirm whether `POST /transfer-food-item` accepts a room order ID as `from_order_id`.
**Next:** Planning Gate 2 (after backend confirms B-1)
