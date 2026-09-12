# BACKEND_BRIEF_CR362_CR365_2026_09_11
## PMS — Booking Cancel/Modify/Extend (CR-362) + Housekeeping Task Model (CR-365)

**From:** MyGenie POS frontend team
**To:** Backend / Dev team
**Date:** 2026-09-11
**Related items:** CR-362, CR-365
**Priority:** CR-362 = P1 CRITICAL | CR-365 = P2 MEDIUM

---

## CR-362 — 3 New Write Endpoints Needed

### Endpoint 1: Cancel Booking
```
POST /api/v2/vendoremployee/aiosell/local-reservations/{id}/cancel
Body: { reason, cancelled_by, notify_cm: bool }
Expected: { status: "cancelled", cancelled_at, cancel_reason }
409 if any line is checked_in
Side effects: release allocation, push inventory (if notify_cm=true)
```

### Endpoint 2: Modify Booking (pending only)
```
PATCH /api/v2/vendoremployee/aiosell/local-reservations/{id}
Body: { checkin?, checkout?, rooms?: [{id, room_code?, restaurant_table_id?, adults?, children?}], amount_after_tax?, reason }
Side effects: re-push inventory for old/new nights
```

### Endpoint 3: Extend/Shorten In-House Stay
```
POST /api/v2/vendoremployee/pos/room-extend-stay
Body: { order_id, new_checkout_date, new_room_price?, reason }
Side effects: update user_id_documents.checkout_date + orders.room_info + aiosell_reservations.checkout + inventory push
```

### Contract Change
- local-reservations must support cancelled rows: either `?status=cancelled` filter, or `status` field always present so FE can filter client-side.
- Currently `view=cancelled` → 422. Fix needed.

### Clarification
- B-362-06: For Direct-channel bookings — should cancel/modify push to Aiosell, or Aiosell push is OTA-only?

---

## CR-365 — HK Task Model

### Prerequisite
- Fix OG-PMS-010: auto-HK not firing correctly when room is occupied. `display_status` stays "occupied" even with `manual_status: hk`. Must be fixed first.

### New Endpoints Needed
```
GET  /aiosell/hk-tasks?date=&status=&assignee_id=
POST /aiosell/hk-tasks  { restaurant_table_id, task_type, priority, note }
PATCH /aiosell/hk-tasks/{id}  { assignee_id, status, checklist: {}, started_at, completed_at, note }
```

### Auto-Task Creation (server hook)
When room → `hk` or `ooo` status: auto-create task (checkout_clean / stayover / deep_clean / maintenance). Priority = high if arrival today for that room.

### Questions
- B-365-04: Correct endpoint path for employee list with housekeeper role filter? (all variants probed → 404)
- B-365-07: On task completion — should FE call PATCH room-status available separately, or is this handled server-side atomically?

### Optional
- B-365-05: GET/POST /aiosell/hk-checklists for per-task-type templates. If too complex, FE uses static checklist.
- B-365-06: FCM push to assignee on assignment. Socket event `room_status_update` on status change.
