# CR-365 — INTAKE
## PMS — Housekeeping Workflow (HK task queue, checklist, assignment, time tracking, staff notifications)

**ID:** CR-365
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (post-CR-358 enhancement list; CR-358 intake §10 lists "HK checklist" as Phase 2) — owner-selected 2026-09-04
**Related:** CR-358-P4 (Room Status Board S7 + `PATCH room-status`), OG-PMS-010 (auto-HK not firing / booked precedence — **must be fixed first**), CR-124 (FCM device registration), CR-354 (employee dropdown API — candidate employee list source)
**Type:** CR (new capability)
**Scope decision (owner 2026-09-04):** FULL feature (no v1 "HK board view only")

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → Room Status (S7) → new Housekeeping module |
| Priority | **P2** (owner-confirmed 2026-09-04) |
| Risk | **MEDIUM** — room status + new data model + push/socket; no money |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **DISTINCT** — CR-358-P4 delivered status-only (intake §10 "Room Status Board ✅ (status only) / Phase 2: HK checklist"). No HK task item registered |
| Code reality | **PARTIAL** — `RoomStatusPage.jsx` (filter chips hk/ooo, Mark Clean, bulk Mark All Clean, Auto-HK pill), `pmsService.getRoomStatusBoard/patchRoomStatus/bulkMarkClean`, `roomStatusTransform` (`ROOM_MANUAL_STATUSES`). No tasks, checklist, assignment, timers, notifications |
| Blast radius | LARGE — 4–5 NEW files (HK page, task card, checklist dialog, hkService/transform) + RoomStatusPage.jsx link + Sidebar child + App.js route. Hotspots: NO. Socket handler file if live updates (`socketHandlers.js` — HIGH-risk area R5-adjacent) |
| Backend blocked | **YES** — no task/checklist/notification model exists |

---

## Description

After checkout a room flips to `hk` (auto-HK setting) but nothing tells housekeeping staff *what* to do, *who* should do it, *in what order*, or *how long it took*. Managers cannot see HK productivity. Staff currently clear the state with a single "Mark Clean" click.

### Expected behaviour
| Capability | Detail |
|---|---|
| HK task auto-creation | When a room enters `hk` (checkout or manual), a task is created: room, type (checkout-clean / stayover / deep-clean / maintenance for `ooo`), priority (arrival today = high), created_at |
| HK queue page `/pms/housekeeping` | tablet-first list sorted by priority; filter by assignee/status; counts (pending / in progress / done today) |
| Assignment | assign task to housekeeper (employee list), reassign |
| Checklist | per task type, configurable template (bed, bathroom, minibar, amenities…); all-required-before-complete toggle |
| Time tracking | Start → In Progress (timer) → Complete; duration stored; avg time per room type KPI |
| Completion → room state | Complete → `PATCH room-status available` (existing) with `inventory_push_warning` handling (existing) |
| Inspection (optional) | supervisor approve step before `available` |
| Notifications | push to assigned housekeeper on assignment (FCM — device tokens already registered per CR-124); socket event `room_status_update` to refresh boards live (replaces polling) |
| Reporting | HK log per day: rooms cleaned, by whom, durations |

### Current behaviour
Status-only board; no tasks; polling refetch after PATCH only.

---

## Evidence

- Curl: `probe_02_board.json` (5 rooms; r2 `manual_status: hk` but `display_status: occupied` — OG-PMS-010 still visible), `probe_07_discovery_routes.txt` — `aiosell/housekeeping`, `hk-tasks` → **404**; `probe_14` — `employees`, `get-employee-list`, `employee-list` → **404** (employee list path unknown to PMS; CR-133 G3b claims an employee API exists — path to be supplied)
- `get-room-list` exposes `room_operational_status_by` (who set HK) — not surfaced in FE transforms
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E5
- Source: AGENT-DISCOVERED · Confidence: CONFIRMED (backend absence live-verified)

---

## Backend Dependency (blocks Gate 4)

| # | Ask | Type |
|---|---|---|
| B-365-01 | Fix OG-PMS-010 (auto-HK not applied / `booked` precedence over `hk`) — prerequisite | BACKEND BUG |
| B-365-02 | `hk_tasks` table + `GET /aiosell/hk-tasks?date=&status=&assignee=` · `POST /aiosell/hk-tasks` · `PATCH /aiosell/hk-tasks/{id}` `{assignee_id, status: pending\|in_progress\|done\|inspected, checklist: json, started_at, completed_at, note}` | NEW ENDPOINTS |
| B-365-03 | Auto-create task when `room_operational_status` → `hk` / `ooo` (server hook) | BACKEND LOGIC |
| B-365-04 | Employee list endpoint path + role filter (housekeeper) for assignment dropdown | CONTRACT (existing?) |
| B-365-05 | Checklist templates: `GET/POST /aiosell/hk-checklists` (per restaurant, per task type) | NEW ENDPOINT |
| B-365-06 | Push (FCM) to assignee on assignment; socket event `room_status_update {table_id, manual_status, display_status}` on any status change | NOTIFICATION |
| B-365-07 | Task completion should call room-status transition server-side (atomic) or FE chains `PATCH room-status available`? | CLARIFICATION |

---

## Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-365-01 | Do housekeepers have their own POS login/role (permission key) or share the front-desk device? | own role / shared |
| OD-365-02 | Checklist mandatory before Complete? | yes / optional |
| OD-365-03 | Supervisor inspection step? | yes / no |
| OD-365-04 | Stayover cleaning tasks (daily for in-house rooms) auto-created? | yes / no |
| OD-365-05 | Priority rule: rooms with an arrival today first? | yes / manual |
| OD-365-06 | Live updates via socket vs 30s polling until backend socket exists | socket / poll |

---

## Files (expected)

| File | Change |
|---|---|
| `pages/pms/HousekeepingPage.jsx` (NEW), `components/pms/HkTaskCard.jsx` (NEW), `components/pms/HkChecklistDialog.jsx` (NEW) | UI |
| `api/services/hkService.js` (NEW) or `pmsService.js` +CRUD | service |
| `api/transforms/hkTransform.js` (NEW) | transform |
| `api/constants.js` | +endpoints |
| `pages/pms/RoomStatusPage.jsx` | tile → open task; show assignee/timer |
| `App.js`, `Sidebar.jsx` | +route, +child (SC ack) |
| `api/socket/socketHandlers.js` | +1 handler (if B-365-06) — R5-adjacent, explicit plan required |

Files NOT touched: CollectPaymentPanel.jsx, OrderEntry.jsx, roomStatusTransform.js (extend only via new file if possible).

---

## Gate status
- [x] Gate 0/1 — Intake
- [ ] Gate 2 — Impact Analysis (blocked on B-365-01 fix + B-365-02 contract)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Intake agent | Code reality: PARTIAL | Duplicate: DISTINCT | Blast radius: LARGE | Risk: MEDIUM | BACKEND-BLOCKED*
