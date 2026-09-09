# BUG-383 — HK Filter Count Always 0 (manual_status vs displayStatus mismatch)

**ID:** BUG-383
**Type:** BUG
**Date:** 2026-09-08
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (Investigation session 2026-09-08, OG-PMS-010 fresh probe)
**Sprint:** pos_pms_1
**Related:** CR-358-P4 (introduced the code), OG-PMS-010

---

## Summary

The Room Status Board HK filter tab always shows **"HK 0"** and the **"Mark All Clean"** button is always disabled, even when rooms are in housekeeping state. Two rooms (r2/8526, r1/8528) confirmed to have `manual_status: hk` on live preprod. Auto-HK is firing correctly on the backend — the bug is in the frontend count/filter logic.

---

## Root Cause

### File 1: `src/api/transforms/roomStatusTransform.js` line 28

```javascript
// CURRENT (wrong):
const counts = DISPLAY_STATUSES.reduce((acc, s) => ({
  ...acc,
  [s]: rooms.filter(r => r.displayStatus === s).length
}), { all: rooms.length });
// → counts.hk counts rooms where displayStatus === 'hk'
```

**Backend behaviour (confirmed by probe):**
- Setting `manual_status: hk` on an **occupied** room does NOT change `display_status`. It stays `occupied`.
- `display_status` only becomes `hk` for **available** rooms.
- Auto-HK fires after checkout: sets `manual_status: hk`, but room may be re-occupied shortly after → `display_status` stays/returns to `occupied`.

**Result:** `counts.hk` = 0 even when rooms have `manual_status: hk`.

### File 2: `src/pages/pms/RoomStatusPage.jsx` line 78

```javascript
// CURRENT (wrong — same issue, for Mark All Clean):
const hkIds = board.rooms.filter(r => r.displayStatus === 'hk').map(r => r.id);
if (hkIds.length === 0) return;  // → always returns early
```

`Mark All Clean` button is disabled (`board.counts.hk === 0`) and handler exits immediately.

---

## Fix Required

```javascript
// roomStatusTransform.js line 28 — fix HK count:
hk: rooms.filter(r => r.manualStatus === 'hk').length,

// RoomStatusPage.jsx line 78 — fix Mark All Clean IDs:
const hkIds = board.rooms.filter(r => r.manualStatus === 'hk').map(r => r.id);
```

Note: `canToggle` logic (transform line 21) is correct as-is — PATCH is blocked by backend for occupied rooms (HTTP 422). `bulkMarkClean` should only send `available` for rooms where the underlying issue is resolved (non-occupied). Consider whether Mark All Clean should skip occupied rooms or alert — design decision for planning.

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | PMS > Room Status Board (S7) |
| Priority | **P1** — HK visibility is core to front desk/housekeeping workflow; "Mark All Clean" fully non-functional |
| Risk | **MEDIUM** — Component state, filter logic, non-financial |
| Fast Lane eligible | **NO** — transform change excluded per rule |
| Sprint | pos_pms_1 |

---

## Evidence

- **Screenshot:** owner-provided Room Status Board — "HK 0" filter tab visible
- **Steps to reproduce:** Load `/pms/room-status` → Filter tab "HK" shows 0 rooms. "Mark All Clean" button disabled.
- **Curl proof:** `GET /api/v2/vendoremployee/aiosell/room-status-board` returns r2(8526) `manual_status:hk, display_status:occupied` + r1(8528) `manual_status:hk, display_status:occupied`
- **Source:** AGENT-DISCOVERED — 2026-09-08 investigation probe 1/3 + code inspection
- **Confidence:** CONFIRMED — API evidence + code read-path traced

---

## Duplicate Check

- Searched BUG_TRACKER + CR_REGISTRY + registry for "HK", "housekeep", "manual_status", "displayStatus" — no prior registration
- CR-358-P4 introduced this code (QA at time passed because auto-HK state may not have existed in sandbox then)
- **Result: DISTINCT**

---

## Blast Radius

| File | Lines affected | Role |
|---|---|---|
| `src/api/transforms/roomStatusTransform.js` | L28 (1 line) | `counts.hk` fix |
| `src/pages/pms/RoomStatusPage.jsx` | L78 (1 line) | `hkIds` filter fix |

- Hotspot files: NO (neither file is in HIGH-RISK hotspot list)
- Estimated scope: SMALL (2 files, 2 lines)
- Consumers of `counts.hk`: RoomStatusPage filter tab + button disabled state (L147, L150)

---

## Open Questions (Owner Decisions)

| OD | Question |
|---|---|
| OD-383-01 | When an occupied room has `manual_status:hk` (auto-HK fired, room since re-occupied) — should "Mark All Clean" skip it (requires PATCH on occupied = 422) or show a warning? |

---

*Intake: 2026-09-08 | INTAKE agent | Code reality: PARTIAL (code exists, bug confirmed) | Risk: MEDIUM | P1 | Blast radius: SMALL*
