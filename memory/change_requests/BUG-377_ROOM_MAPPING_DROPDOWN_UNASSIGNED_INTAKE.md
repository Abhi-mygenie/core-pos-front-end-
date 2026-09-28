# BUG-377 — INTAKE
## PMS Room Mapping: Dropdown shows "— Unassigned —" despite "Mapped" status

**ID:** BUG-377
**Date:** 2026-09-02
**Registered by:** Intake agent
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (owner screenshot provided, root cause traced in code)
**Related:** CR-358-P1 (Phase 1 implementation — bug introduced in ChannelManagerPage.jsx)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | PMS → Channel Manager → Room Mapping tab |
| Priority | **P2** |
| Risk | **LOW** |
| Severity (QA) | MAJOR |
| Sprint | pos_pms_1 |
| Fast Lane eligible | YES — 1 file, ≤15 lines, no hotspot, no financial logic |
| Duplicate check | **DISTINCT** — no prior registration for this pattern |
| Code reality | **PARTIAL** — ChannelManagerPage.jsx exists, fix needed |
| Blast radius | SMALL — 1 file |

---

## Symptom

On the Room Mapping tab of Channel Manager, the STATUS column correctly shows **"Mapped"** for all rooms (5/5 mapped, "Ready to push"), but the AIOSELL ROOM TYPE column dropdown shows **"— Unassigned —"** for every room. The dropdown is open-able but contains only the "— Unassigned —" option — no AIOSELL room types are listed.

**Owner screenshot:** SS1 (provided 2026-09-02) — all 5 rooms show "Mapped" in STATUS column, all 5 dropdowns show "— Unassigned —".

---

## Root Cause

**`aiosellRooms` array is empty when the AIOSELL service hasn't synced room type definitions.**

`GET /aiosell/rooms` returns two sets of data:
1. `mappings[]` — the saved local→AIOSELL room assignments → **populated** (5 mappings)
2. `aiosell.body.rooms[]` — the AIOSELL channel manager's room type catalogue → **empty** on this account

`ChannelManagerPage.jsx` seeds `pendingMappings` from `mappings[]` (correct — hence STATUS shows "Mapped"). But the `<select>` dropdown options are built only from `aiosellRooms` (derived from `aiosell.body.rooms`). When that array is empty, the dropdown has no `<option>` matching the saved room code. The browser renders the first available option ("— Unassigned —") regardless of the `value=` prop.

**Specific gap:** No fallback option is added for saved mapping values that aren't in `aiosellRooms`.

---

## Evidence

| # | Item | Path / Detail |
|---|---|---|
| E1 | Owner screenshot SS1 | Provided 2026-09-02 — 5 rooms, all Mapped/Unassigned |
| E2 | Code trace | `ChannelManagerPage.jsx` lines 94–98 seed, lines 417–435 dropdown render |
| E3 | Transform check | `aiosellTransform.fromAPI.rooms()` → `aiosellRooms` from `d.aiosell?.body?.rooms` (empty on this account) |

---

## Expected Behavior

When rooms are mapped (STATUS = "Mapped"), the AIOSELL ROOM TYPE dropdown should show the saved room type (e.g., "executive") as the selected value. If the AIOSELL room catalogue is empty, the saved mapping code should still appear as an option and be selected.

---

## Files to Fix

| File | Change | Lines est. |
|---|---|---|
| `pages/pms/ChannelManagerPage.jsx` | When building `<select>` options, add any saved mapping code that isn't already in `aiosellRooms` as a fallback option | ~10–15 |

---

## Severity Rationale

**P2** — The rooms are correctly mapped on the backend ("Ready to push" confirms this). The issue is purely visual: staff cannot see which AIOSELL room type is assigned and cannot re-assign without AIOSELL room types loading. The sync itself still works. Not P1 because `push-inventory` is functional and the mapping data is not lost.

---

## Duplicate Check
- `grep "aiosellRooms\|Unassigned\|room-mapping"` in BUG_TRACKER.md → **0 matches**
- `grep "BUG-377"` in registry.json → **0 matches**
- **DISTINCT**

---

*Intake: 2026-09-02 | INTAKE agent | Code reality: PARTIAL | Risk: LOW | Fast Lane eligible*
