# CR-162 — Mid-Stay Partial Payment for Room Orders

**Type:** Change Request (New Feature — Backend Confirmation Needed)
**ID:** CR-162
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-ROOM-001

---

## Description

Guests staying in a room sometimes want to make a **partial payment during their stay** — not at check-in (advance) and not at checkout, but somewhere in between. Example: a 7-day stay, guest pays ₹2k extra on Day 3 against the ₹5k outstanding balance.

The backend already tracks this via the `receive_balance` field in `room_info`, and the Reports page already reads it — but **there is no frontend flow to record such a payment on an active room order**.

Note: **Case 1A (pay balance at checkout) already works** — this CR is specifically for mid-stay partial payments only.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Room Module → Active Room Card / Room Order Entry |
| Priority | P1 |
| Severity | HIGH — hotel/resort restaurants with multi-day stays currently have no way to record partial payments through the POS |
| Risk | HIGH (payment recording; financial data) |
| Fast Lane | NO — needs backend endpoint confirmation, new UI flow |

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-ROOM-001)
- Backend field confirmed: `room_info.receive_balance` read by `RoomOrdersReportPage.jsx` (line 550) and `roomOrdersService.js` (line 41)
- No frontend trigger for updating `receive_balance` exists

## Code Reality

```bash
# receive_balance field EXISTS in backend + transform:
  api/transforms/orderTransform.js line 398:
    receiveBalance: parseFloat(api.room_info.receive_balance) || 0
  api/services/roomOrdersService.js line 41:
    receiveBalance: parseFloat(roomInfo.receive_balance) || 0
  pages/RoomOrdersReportPage.jsx line 550: uses receiveBalance in paid calc

# No "Record Payment" UI on active room:
  api/services/roomService.js → no mid-stay payment function
  api/constants.js → no mid-stay payment endpoint
  DashboardPage.jsx / RoomOrdersReportPage.jsx → no "Collect Partial" button
```

- **Code reality: PARTIAL** — backend field + read logic exists; frontend trigger is NONE

## Blast Radius

- New UI: "Record Payment" button on active room card or room order entry
- New service function in `roomService.js`
- New endpoint constant in `api/constants.js`
- Estimated scope: MEDIUM (3-4 files, ~50-80 lines)

## Expected Behavior

1. **"Record Payment" button** on an active room order card (DashboardPage room view or RoomOrdersReportPage)
2. Staff enter: amount + payment method
3. POST to backend → `receive_balance` updated
4. Room card immediately reflects updated outstanding balance
5. Reports and checkout flow automatically use the updated `receive_balance`

## Owner Decisions Needed

1. Where should the "Record Payment" button appear: (a) Dashboard room card, (b) Room order entry view, or (c) Room Orders Report?
2. What is the backend endpoint for updating `receive_balance`? (Confirm with backend team — likely exists since field is already populated)

## Dependency

- **Blocked on backend endpoint confirmation** — `receive_balance` is read but the write endpoint is unconfirmed from the frontend

## Duplicate Check

DISTINCT — no prior CR for mid-stay partial payment.

---

**Backend Brief Needed:** Confirm endpoint for updating `receive_balance` on active room order.
**Next:** Planning Gate 2 (after backend endpoint confirmed)
