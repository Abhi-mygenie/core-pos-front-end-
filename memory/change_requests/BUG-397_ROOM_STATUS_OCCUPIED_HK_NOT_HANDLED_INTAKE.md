# BUG-397 Intake — Room Status Board: `occupied_hk` display_status not handled — falls to `available`

**ID:** BUG-397
**Date:** 2026-09-13
**Sprint:** pos_pms_1
**Registered by:** INTAKE agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (backend reply 2026-09-13 introduced new `occupied_hk` value)

---

## Classification

| Field | Value |
|---|---|
| **Type** | BUG |
| **Severity** | **P1 — HIGH** |
| **Risk** | **HIGH** — operational display (occupied stayover HK room renders as Available to staff) |
| **Area** | PMS → Room Status Board (S7) |
| **Source** | AGENT-DISCOVERED — BE reply 2026-09-13 added `occupied_hk` to `display_status` enum |
| **Confidence** | CONFIRMED — code trace shows silent fallback to `available` |
| **Duplicate check** | **DISTINCT** — RELATED to BUG-383 (that fixed HK count logic). BUG-397 is a new display_status value not present when BUG-383 was implemented. |
| **Fast Lane** | NO — 2 files, HIGH risk |

---

## Severity Rationale

> **P1:** When backend returns `display_status: occupied_hk` for a room with a stayover guest being cleaned, the FE silently maps it to `available` (the fallback in the transform). Front desk staff see an occupied room as free — they could assign it to a new guest while a stayover is in progress. Operationally dangerous.

---

## Description

Backend reply (2026-09-13) confirmed a new `display_status` value: **`occupied_hk`** — used when a room is occupied AND staff set it to HK (stayover cleaning). Previous values were `available | occupied | booked | hk | ooo`. `occupied_hk` is NOT in any of these lists.

**Symptom:**
```
Backend sends: display_status = "occupied_hk"

roomStatusTransform.js L16:
  DISPLAY_STATUSES.includes('occupied_hk')  →  false
  → displayStatus mapped to: 'available'    ← WRONG — shows as free room
```

**RoomStatusPage.jsx** also missing:
- `STATUS_BAR['occupied_hk']` → undefined → no status bar color
- `STATUS_LABELS['occupied_hk']` → undefined → blank label on tile
- Filter tabs have no `occupied_hk` chip → stayover HK rooms invisible in HK filter

---

## Evidence

- **Code trace:**
  - `roomStatusTransform.js:4` — `DISPLAY_STATUSES = ['available', 'occupied', 'booked', 'hk', 'ooo']` — `occupied_hk` absent
  - `roomStatusTransform.js:16` — fallback: `DISPLAY_STATUSES.includes(x.display_status) ? x.display_status : 'available'`
  - `RoomStatusPage.jsx:21` — `STATUS_BAR` has no `occupied_hk` key
  - `RoomStatusPage.jsx:26` — `STATUS_LABELS` has no `occupied_hk` key
- **Backend reply source:** `evidence/INV-BE-REPLY-2026-09-13/be_reply_raw_2026_09_13.md`
  > *"`display_status`: `available` | `occupied` | `occupied_hk` | `booked` | `hk` | `ooo`"*
  > *"Occupied + PATCH `hk` → `display_status=occupied_hk`. Vacant HK → `hk`."*
- **Confidence:** CONFIRMED

---

## Blast Radius

| File | Change needed | Lines |
|---|---|---|
| `src/api/transforms/roomStatusTransform.js` | Add `occupied_hk` to `DISPLAY_STATUSES` array; update `canToggle` guard | ~3 lines |
| `src/pages/pms/RoomStatusPage.jsx` | Add `occupied_hk` to `STATUS_BAR` + `STATUS_LABELS`; add filter chip; handle in tile | ~8 lines |

- **Blast radius:** SMALL (2 files, ~11 lines)
- **Hotspot files (R5):** Neither file is in R5 hotspot list
- **Conflict:** BUG-383 modified same files (L28-34 manualStatus logic) — **parallel-safe** (different lines). CR-365 planning will also touch RoomStatusPage — BUG-397 must be implemented BEFORE or alongside CR-365.

---

## Expected Behaviour After Fix

| display_status | Label | Bar colour | Tile behaviour | canToggle |
|---|---|---|---|---|
| `occupied_hk` | Occupied · HK | Orange + amber overlay | Shows guest name + HK badge | false (cannot toggle occupied room) |

**`canToggle`:** Backend says `occupied_hk` rooms can accept `PATCH status: hk|ooo|available`. But direct `PATCH available` on occupied-HK should NOT be allowed from tile (task completion does it atomically). Set `canToggle: false` for `occupied_hk`.

---

## Open Questions

| OD | Question |
|---|---|
| OD-397-01 | Tile colour for `occupied_hk` — use existing occupied orange (#F26B33) with amber HK badge overlay, or new colour? Owner to confirm at Gate 2. | **LOCKED: Option A — `#F26B33` orange bar + amber "Housekeeping in progress" pill. Owner approved 2026-09-13 via design comparison page.** |

---

## Dependency Note

- **Must be fixed before CR-365 Gate 2** — CR-365 planning involves RoomStatusPage.jsx; `occupied_hk` handling is a prerequisite to avoid conflicts.
- OR can be planned in same Gate 2 batch as CR-365 if owner chooses.

---

*Gate status:*
- [x] Gate 0/1 — Intake
- [x] Gate 2 — Impact Analysis (inline, Bug Fix agent)
- [x] Gate 3 — Implementation Plan (7 edits, 2 files)
- [x] Gate 4 — **GO received 2026-09-13. OD-397-01 LOCKED: Option A (#F26B33)**
