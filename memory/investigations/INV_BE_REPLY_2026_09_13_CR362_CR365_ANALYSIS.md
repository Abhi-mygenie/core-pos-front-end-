# Investigation Report — Backend Reply Analysis (2026-09-13)
## CR-362 + CR-365 Blocker Resolution + New Findings

**Investigation ID:** INV-BE-REPLY-2026-09-13
**Date:** 2026-09-13
**Role:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7)
**Source:** `be_reply_raw_2026_09_13.md` (filed by backend team)
**Steps used:** 3/10
**Confidence:** HIGH — endpoints and contracts fully specified with curl examples

---

## 1. Summary

| Item | Was | Now | Verdict |
|---|---|---|---|
| **CR-362** Booking Cancel/Modify/Extend | BACKEND-BLOCKED | All 3 endpoints shipped | ✅ **FULLY UNBLOCKED** |
| **CR-365** Housekeeping Workflow | BACKEND-BLOCKED | Full task model + checklist + laundry shipped | ✅ **FULLY UNBLOCKED** |
| **CR-361** Room Assignment on Tape Chart | BACKEND-BLOCKED | Not mentioned in reply | 🔴 **STILL BLOCKED** |
| **CR-367** WhatsApp/SMS Notifications | BACKEND-BLOCKED | Not mentioned in reply | 🔴 **STILL BLOCKED** |
| **BUG-389** GST slab2.min=7500.01 | BACKEND-BLOCKED | Not mentioned in reply | 🔴 **STILL BLOCKED** |
| **NEW** `occupied_hk` display_status | Not previously tracked | New status in room-status-board response | ⚠️ **NEW FE WORK NEEDED** |
| **NEW** Laundry module | Not in CR-365 brief scope | Full model shipped (settings/queue/stock/process) | ⚠️ **SCOPE EXPANSION** |
| **Sockets/FCM** (`new_reservation`, HK assign) | Awaited | Explicitly deferred | ℹ️ DEFERRED — poll/refresh for now |
| **Self check-in** public token flow | Awaited | Explicitly deferred | ℹ️ DEFERRED |

---

## 2. CR-362 — Booking Modification & Cancellation — FULLY UNBLOCKED ✅

All 3 endpoints from the backend brief are now live:

### Endpoint 1 — Cancel booking
```
POST /api/v2/vendoremployee/aiosell/local-reservations/{id}/cancel
Body: { reason, cancelled_by, notify_cm: bool }
409 if any room line is already checked in
notify_cm = inventory push only (default true)
```

### Endpoint 2 — Modify pending booking
```
PATCH /api/v2/vendoremployee/aiosell/local-reservations/{id}
Body: { checkin?, checkout?, amount_after_tax?, reason, rooms?: [{id, room_code?, restaurant_table_id?, adults?, children?}] }
409 if any room checked in (pending-only guard)
```

### Endpoint 3 — Extend in-house stay
```
POST /api/v2/vendoremployee/pos/room-extend-stay
Body: { order_id, new_checkout_date, new_room_price?, reason }
Updates: user_id_documents.checkout_date + orders.room_info + aiosell_reservations.checkout + inventory
```

### Cancelled bucket — also resolved
```
GET /aiosell/local-reservations?status=cancelled  ← works
GET /aiosell/local-reservations?view=cancelled    ← works
(previous 422 on view=cancelled is now fixed)
```

### B-362-06 — OD LOCKED
Direct cancel/modify = local DB update + optional inventory push (`notify_cm`).
**No Aiosell/OTA API push** — OTA sync is inbound/webhook only.
OD-E2-02 (should FE cancel push to OTA?) → **NO** — local only.

**CR-362 blockers: 0 remaining. Ready for Gate 2 → Gate 3 → Implementation.**

---

## 3. CR-365 — Housekeeping Workflow — FULLY UNBLOCKED ✅

All requested endpoints shipped. Full model summary:

### HK Tasks
```
GET    /aiosell/hk-tasks?date=&status=&assignee_id=   list tasks
POST   /aiosell/hk-tasks                               create task
PATCH  /aiosell/hk-tasks/{id}                         update / complete
POST   /aiosell/hk-assign/{restaurantTableId}          assign room to staff
```
`task_type`: `checkout_clean | stayover | deep_clean | maintenance`
`status`: `pending | assigned | in_progress | completed | cancelled`

**Server auto-creates an HK task when room → `hk` or `ooo` via PATCH room-status.**

### HK Checklist
```
GET    /aiosell/hk-checklist/template                  get default template
PUT    /aiosell/hk-checklist/template                  save template
GET    /aiosell/hk-checklist/{restaurantTableId}        room-specific checklist
POST   /aiosell/hk-checklist/{restaurantTableId}/complete  complete + clear room
```
`action` types on checklist lines: `consume | verify | laundry_issue | laundry_collect`
`POST complete`: clears room status server-side atomically — **do NOT PATCH available separately** (B-365-07 resolved).

### Employee Assignees (B-365-04 resolved)
```
GET /employee/employees-list   → filter by HK role client-side
```
No server-side role filter needed.

### Laundry (new — not in original brief)
```
GET    /aiosell/laundry/settings           laundry config
PUT    /aiosell/laundry/settings           update (e.g. default_assignee_id)
GET    /aiosell/laundry/queue?status=      dirty items pending processing
GET    /aiosell/laundry/stock              clean stock levels
POST   /aiosell/laundry/process            mark dirty → clean (supply queue_item_ids or omit for all)
```

### Deferred (NOT a blocker)
- **Sockets/FCM** (`room_status_update` on HK assign, `new_reservation`) — deferred. FE must poll or use manual refresh. No blocker for core HK workflow.
- **Static checklist** acceptable if no template configured — backend handles empty lines gracefully.

**CR-365 blockers: 0 remaining. Ready for Gate 2 → Gate 3 → Implementation.**

---

## 4. New Findings (not previously tracked)

### FINDING 1 — `occupied_hk` new display_status ⚠️

Backend reply states room-status-board now returns:
```
display_status: available | occupied | occupied_hk | booked | hk | ooo
```
`occupied_hk` = occupied room where staff set HK status (stayover clean in progress).

**Current FE code (`roomStatusTransform.js`)** only handles `available | occupied | booked | hk | ooo`.
`occupied_hk` will fall through to unknown/unmapped → likely renders wrong tile color or label.

**Classification:** FE_BUG — new status not handled.
**Scope:** Small — 1 file (`roomStatusTransform.js`), ~5 lines.
**Recommendation:** Register as new BUG via INTAKE before planning.

### FINDING 2 — Laundry module scope expansion ⚠️

Original CR-365 scope was: HK tasks + checklist + assignment. Backend has shipped a full laundry sub-module (settings, queue, stock, process). This is NEW scope not in the original CR-365 intake.

**Recommendation:** Owner decides whether to include laundry in CR-365 scope or register as CR-365-B (separate CR). **Owner decision needed before planning.**

---

## 5. Items Still Backend-Blocked

### CR-361 — Room Assignment on Tape Chart
Not mentioned in this reply. All `assign-room` variants probed previously → 404.
**Status: STILL BLOCKED.** Separate backend ask needed.

### CR-367 — WhatsApp / SMS Guest Notifications
Not mentioned in this reply. All 7 candidate routes → 404 from prior probe.
**Status: STILL BLOCKED.** Backend brief not yet filed.

### BUG-389 — GST slab2.min=7500.01
Not mentioned in this reply.
**Status: STILL BLOCKED.** Backend config fix needed.

---

## 6. Evidence

- Raw backend reply: `/app/memory/evidence/INV-BE-REPLY-2026-09-13/be_reply_raw_2026_09_13.md`

---

## 7. Recommendations

| Action | Item | Priority |
|---|---|---|
| Update registry CR-362 → UNBLOCKED, ready Gate 2 | CR-362 | Now |
| Update registry CR-365 → UNBLOCKED, ready Gate 2 | CR-365 | Now |
| Register `occupied_hk` handling as new BUG via INTAKE | New finding | Before CR-365 planning |
| Owner decision: include laundry in CR-365 or new CR-365-B | Laundry scope | Before CR-365 planning |
| File backend brief for CR-361 (room assignment endpoint) | CR-361 | Next backend round |
| File backend brief for CR-367 (WhatsApp/SMS) | CR-367 | Next backend round |
| File backend brief for BUG-389 (slab2.min config) | BUG-389 | Next backend round |

---

*Investigation complete: 2026-09-13. Steps: 3/10.*
