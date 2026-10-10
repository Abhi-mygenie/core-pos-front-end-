# INVESTIGATION REPORT — CR-358 Backend Handover 3 Gap Audit
**Date:** 2026-09-02
**Role:** INVESTIGATION agent
**Trigger:** Owner provided `handover_3.md` (backend) covering S7 Room Status Board — `GET room-status-board` + `PATCH room-status/{table_id}`. Asked to audit what gaps/blockers are now fixed vs still open, and whether new scope is introduced.
**Docs read:** `handover_3.md` (attached), `CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md`, `CR-358_EXECUTION_PLAN_PHASED.md`, `BACKEND_BRIEF_CR358_2026_08_28.md`, `CR-358-P1_IMPLEMENTATION_PLAN.md`, `SESSION_HANDOVER_2026_09_02_CR358_READY_FOR_IMPL.md`
**Steps used:** 6/10
**Code written:** NONE (investigation role — no code edits)

---

## 1. Summary

`handover_3.md` delivers the two Phase 4 backend items that were previously open (MISSING-02 / B-09): `GET /aiosell/room-status-board` and `PATCH /aiosell/room-status/{table_id}`. This **unblocks Phase 4 entry gate** and **resolves GAP-08** (the all-rooms problem for S7). It also **partially addresses B-07** (auto-HK on checkout confirmed server-side). Two items remain open: `dashboard-kpis` (MISSING-01, non-blocking) and explicit inventory release on checkout (GAP-09, still unverified). Three items of **new scope** are introduced that require plan amendments before Phase 4 coding starts.

**Classification:** BACKEND_DELIVERY (not a bug — this is a backend handover providing new endpoints)
**Confidence:** HIGH — spec is self-contained, endpoints are fully described with request/response shapes, error codes, and side effects
**Steps used:** 6/10

---

## 2. Audit Matrix — All Known CR-358 Backend Gaps vs handover_3.md

### Blockers & Gaps from BACKEND_BRIEF_CR358_2026_08_28.md

| Item | Priority | Was (before handover_3) | Now (after handover_3) | Verdict |
|---|---|---|---|---|
| **B-01** — `GET /aiosell/local-reservations` | P1 BLOCKER | ✅ FIXED + agent-verified 2026-09-01 | Unchanged | ✅ STILL FIXED |
| **B-02** — OTA check-in linkage (BUG-BE-02) | P1 BLOCKER | ✅ FIXED + agent-verified 2026-09-01 | Unchanged | ✅ STILL FIXED |
| **B-03/04/05** — Self check-in public endpoints | P1, OD-05=Phase 2 | Out of scope for CR-358 | Not addressed | ➖ OUT OF SCOPE |
| **B-06** — `POST /aiosell/direct-reservation` (BUG-BE-03/04) | P1 BLOCKER | ✅ FIXED + agent-verified 2026-09-01 | Unchanged | ✅ STILL FIXED |
| **B-07** — Checkout → AIOSELL inventory release | P2 HIGH | ⚠ UNVERIFIED — GAP-09 | **PARTIALLY ADDRESSED** — see §4 | ⚠ PARTIAL (see below) |
| **B-08** — `GET /aiosell/dashboard-kpis` (MISSING-01) | P2 MEDIUM | ⏳ Not built | **Still not built** — only referenced as a cross-check in handover_3 verification step 2, not delivered | ⏳ STILL OPEN (non-blocking per NS-02) |
| **B-09** — `PATCH /aiosell/room-status/{table_id}` (MISSING-02) | P2, Phase 4 gate | ⏳ Not built | ✅ **DELIVERED** — full spec in handover_3 §2 | ✅ FIXED |
| **B-10** — Socket event for new OTA reservations (GAP-10) | P2 LOW, deferred | Deferred Phase 2 | Not addressed | ➖ STILL DEFERRED |

### Gaps from Impact Analysis §4

| Gap | Severity | Was | Now | Verdict |
|---|---|---|---|---|
| **GAP-08** — `GET_ROOM_LIST` returns occupied-only; S7 needs ALL rooms | P2 | Open — plan was to combine `GET_ROOM_LIST` + `GET /aiosell/rooms` | ✅ **RESOLVED** — new `GET /aiosell/room-status-board` returns ALL RM rooms with pre-computed `display_status` | ✅ FIXED |
| **GAP-09** — Inventory release after checkout unconfirmed | P2 | Unverified | ⚠ Auto-HK on checkout confirmed server-side; but explicit inventory push on checkout still not confirmed | ⚠ PARTIAL |
| **GAP-10** — No socket for new OTA reservations | P2 | Deferred | Not addressed | ➖ DEFERRED |

### Phase Execution Plan — MISSING items

| Item | Phase | Was | Now | Verdict |
|---|---|---|---|---|
| **MISSING-01** — `GET /aiosell/dashboard-kpis` | P3 (non-blocking skeleton) | Not built | Not in handover_3 | ⏳ STILL OPEN (non-blocking) |
| **MISSING-02** — `PATCH /aiosell/room-status/{table_id}` | P4 gate | Not built | ✅ **DELIVERED** — full spec confirmed | ✅ FIXED — **Phase 4 entry gate is now CLEARED** |

---

## 3. What handover_3.md Delivers (Detail)

### 3a — `GET /api/v2/vendoremployee/aiosell/room-status-board` (NEW — not previously known)

This endpoint is **brand new** — not in any prior doc. It does NOT exist in the current `AIOSELL_ENDPOINTS` constants block (P1 plan has `ROOM_STATUS` but not `ROOM_STATUS_BOARD`).

**What it returns:**
```
GET /api/v2/vendoremployee/aiosell/room-status-board
→ { auto_hk_on_rm_checkout: bool, rooms: [ per-room tile ] }
```

Per room tile:
| Field | Type | Notes |
|---|---|---|
| `restaurant_table_id` | int | Physical room ID |
| `table_no` | string | Room number |
| `title` | string | Floor/area name |
| `aiosell_room_code` | string \| null | Null if not mapped yet |
| `manual_status` | `"hk"` \| `"ooo"` \| `null` | Staff-set flag |
| `display_status` | `"available"` \| `"occupied"` \| `"booked"` \| `"hk"` \| `"ooo"` | Pre-computed by backend (highest wins) |
| `room_operational_status_at` | datetime \| null | When manual status was set |
| `guest` | object \| null | Populated when occupied: `{name, phone, email, booking_id, order_id}` |
| `reservation` | object \| null | Populated when booked: `{booking_id, channel, checkin, checkout, guest_name, room_code, reservation_room_id}` |

**Display precedence (server-side):** `ooo` → `occupied` → `hk` → `booked` → `available`

**Key difference from old approach:** The old Phase 4 plan was to combine `GET_ROOM_LIST` (occupied rooms) + `GET /aiosell/rooms` (all rooms with availability) to derive status in `roomStatusTransform.js`. This endpoint replaces BOTH — the backend does the merge and precedence logic server-side. Single call gives all 5 states.

### 3b — `PATCH /api/v2/vendoremployee/aiosell/room-status/{restaurant_table_id}`

Fully delivered. Staff action → backend persists → cross-device.

| `status` sent | Effect | Inventory impact |
|---|---|---|
| `"hk"` | Sets Housekeeping | **None** — display only |
| `"ooo"` | Sets Out of Order | **Reduces** sellable inventory for mapped room type (best-effort push) |
| `"available"` | Clears HK or OOO | Releases inventory if `ooo` was set (best-effort push) |

**New constraint:** Returns **422** if room is occupied (open order). FE must handle this.
**New field:** `data.inventory_push_warning` in response — set if OOO/available push to AIOSELL failed (status still saved; push failure is non-blocking).

### 3c — Auto-HK on RM checkout (server-side behavior — NEW)

When `auto_hk_on_rm_checkout = true` (default setting), the backend's **V2 `order-bill-payment`** endpoint automatically sets `room_operational_status = "hk"` when closing an RM stay — **unless the room is already `ooo`**.

**Implication for FE:**
- After guest checkout, the board auto-shows `hk` without any FE PATCH call
- Staff sees room as "Housekeeping" after checkout — correct workflow
- Staff clicks clear → PATCH `available` → inventory push to AIOSELL
- FE does NOT need to trigger HK on checkout — backend handles it

**Implication for GAP-09 (inventory release on checkout):**
- Checkout → auto-HK (no inventory push yet)
- Staff marks available → PATCH `available` → inventory push (manual trigger)
- This means inventory release is **semi-manual** (staff-triggered), not fully automatic
- GAP-09 is therefore still partially open: if staff forgets to clear HK, AIOSELL stays "blocked" for that room

### 3d — Database migration required for Phase 4

```
php artisan migrate --path=database/migrations/2026_09_02_140000_add_room_operational_status.php
```

Adds to `restaurant_table`:
- `room_operational_status` — `hk | ooo | null`
- `room_operational_status_at` — audit timestamp
- `room_operational_status_by` — audit user

Adds to `restaurant_settings`:
- `auto_hk_on_rm_checkout` — boolean, default `true`

**Gate:** This migration must be confirmed RUN on preprod before Phase 4 QA starts.

---

## 4. B-07 / GAP-09 — Inventory Release on Checkout: Detailed Status

The auto-HK behavior PARTIALLY addresses this gap but does not fully close it.

| Step | Mechanism | Automatic? | Inventory pushed? |
|---|---|---|---|
| Guest checks out (`order-bill-payment` V2) | Backend auto-sets room to `hk` | ✅ Yes (server-side) | ❌ No — HK does not affect inventory |
| Staff clears HK (`PATCH available`) | FE action | ❌ Manual | ✅ Yes — inventory push fires |
| Staff sets OOO (`PATCH ooo`) | FE action | ❌ Manual | ✅ Yes — inventory reduced |

**Conclusion:** Inventory release is NOT fully automatic. It requires the staff PATCH `available` step. If `auto_hk_on_rm_checkout=false`, there's no server-side action at all. **GAP-09 probe (Phase 5) must still verify whether `order-bill-payment` also fires a direct inventory push**, independent of the HK auto-flag. The `aiosell_sync_logs` check from Backend Brief §5 is still the correct verification.

**GAP-09 status: PARTIALLY ADDRESSED — still requires Phase 5 explicit probe.**

---

## 5. New Scope Introduced (Plan Amendment Required Before Phase 4)

These items are **NOT covered** in the existing Phase 4 plan (`CR-358_EXECUTION_PLAN_PHASED.md`) and require a Gate 3 amendment when writing `CR-358-P4_IMPLEMENTATION_PLAN.md`.

### NS-A: `ROOM_STATUS_BOARD` constant missing from P1 constants block

**Current P1 plan `AIOSELL_ENDPOINTS` (api/constants.js):**
```js
// P4 — wired in Phase 4
ROOM_STATUS: '/api/v2/vendoremployee/aiosell/room-status',  // MISSING-02: backend to build
```

`ROOM_STATUS` is present (correct URL for the PATCH). But `ROOM_STATUS_BOARD` is **absent**.

**Required addition to P1 constants block** (additive — no line changes, just append one entry):
```js
ROOM_STATUS_BOARD: '/api/v2/vendoremployee/aiosell/room-status-board',   // Delivered 2026-09-02
```

**Risk classification:** LOW — additive to constants block declared in Phase 1. The P1 plan already declares P4/P5 stubs in `AIOSELL_ENDPOINTS`. This is one more line at the same location.
**Gate impact:** This is a minor amendment. Can be added to Phase 4 `api/constants.js` edit without re-running P1. OR added as a tiny addendum to P1 implementation if P1 hasn't been coded yet (preferred — keeps all constants in one commit per the plan's design).

### NS-B: `roomStatusTransform.js` scope changes — two-source merge is SUPERSEDED

**Old Phase 4 plan:**
> `api/transforms/roomStatusTransform.js` — NEW — derive 5 states: Occupied (GET_ROOM_LIST) / Available (aiosell/rooms minus occupied) / HK / OOO (backend `room_status` field per OD-07)

**New reality:** `room-status-board` returns ALL rooms with `display_status` pre-computed server-side. The two-API merge is no longer needed.

**New `roomStatusTransform.js` scope:**
- `fromRoomStatusBoard(data)` → maps `rooms[]` array into S7 UI tile models
- Map `display_status` → UI status enum (5 states)
- Extract `guest` block for occupied tile tooltip/detail
- Extract `reservation` block for booked tile preview
- Expose `auto_hk_on_rm_checkout` as a board-level setting

**Impact on pmsService.js:** `getRoomStatusBoard()` replaces the old `getInHouseGuests()` + `getAiosellRooms()` two-call approach for S7. (Note: `getInHouseGuests()` stays for S6 — it still uses `GET_ROOM_LIST`.)

### NS-C: "booked" is a 5th display_status — not in any prior plan

**Old plan:** S7 had 4 states: Available / Occupied / Housekeeping / Out of Order
**New reality:** 5 states — add **Booked** (pending reservation, not yet checked in)

**UI impact for S7 Room Status Board:**
- Need a 5th tile state/color: "Booked" with `reservation` preview block
- `reservation.channel`, `reservation.checkin`, `reservation.checkout`, `reservation.guest_name` shown on tile
- Precedence: `occupied` overrides `hk` which overrides `booked` which overrides `available`

### NS-D: 422 handling for occupied rooms (PATCH constraint)

**New constraint from handover_3 §2 Errors table:**
> Room occupied (open order) → 422: "Cannot set HK/OOO while the room is occupied"

**FE impact:** S7 toggle buttons (HK/OOO) must handle this 422 gracefully — error toast: *"Cannot mark — room has an active order"*.

### NS-E: `inventory_push_warning` in PATCH response

**New field:** `data.inventory_push_warning` in PATCH room-status response — non-null if inventory push to AIOSELL failed (status still saved).

**FE impact:** After PATCH success (200), check `inventory_push_warning`:
- If null → success toast only
- If non-null → success toast + warning toast: *"Status saved. Inventory sync failed — will retry"*

---

## 6. Phase Impact Summary

| Phase | Was | After handover_3 |
|---|---|---|
| **Phase 1 (P1)** | Ready to implement (Gate 4 GO pending) | ✅ Unchanged. ONE minor addition recommended: add `ROOM_STATUS_BOARD` constant to P1 constants block (see NS-A). Low risk, additive. |
| **Phase 2 (P2)** | Zero backend blockers | ✅ Unchanged |
| **Phase 3 (P3)** | Zero backend blockers (hard gate cleared 2026-09-01) | ✅ Unchanged. MISSING-01 (dashboard-kpis) still open but non-blocking per NS-02. |
| **Phase 4 (P4)** | Entry gate BLOCKED on MISSING-02 | ✅ **Entry gate CLEARED** — both Phase 4 endpoints now delivered. Gate 3 (P4 implementation plan) can be written. Plan must incorporate NS-A through NS-E amendments. |
| **Phase 5 (P5)** | NS-01 endpoints unprobed | ✅ Unchanged. GAP-09 probe still needed in P5. |

---

## 7. Verification Checklist Impact

**Old V6 (from Gate 2 Impact Analysis §9):**
> `V6 | S7 Room Status | GET /aiosell/rooms + GET_ROOM_LIST combined | Board shows occupied rooms + available rooms`

**New V6 (superseded):**
> `V6 | S7 Room Status | GET /aiosell/room-status-board | Board shows all 5 display_status types per room; re-fetch after PATCH reflects updated status; same state on second device (cross-device persistence)`

**Migration verification (new — Phase 4 entry check):**
> `MIGRATION: php artisan migrate ...add_room_operational_status.php confirmed RUN on preprod before P4 QA starts`

---

## 8. Recommendations

| # | Recommendation | Priority | Who |
|---|---|---|---|
| R1 | **Add `ROOM_STATUS_BOARD` to P1 `api/constants.js` constants block.** Additive one-liner. If P1 not yet coded, include in P1. If P1 already shipped, add as a micro-fix in P4 with P1 comment reference. | LOW | Planning / Implementation |
| R2 | **Update Phase 4 plan** (`CR-358-P4_IMPLEMENTATION_PLAN.md` when written): replace two-source merge approach with single `room-status-board` call; include "booked" state tile (NS-B/C) | HIGH | Planning (Gate 3 for P4) |
| R3 | **Add 422 error handling and `inventory_push_warning` to S7 PATCH logic** (NS-D, NS-E) — include in Phase 4 plan | MEDIUM | Planning (Gate 3 for P4) |
| R4 | **Confirm migration is run on preprod** before Phase 4 QA. Add as gate check to P4 QA handover. | HIGH | Backend / Phase 4 QA agent |
| R5 | **GAP-09 explicit probe still needed in Phase 5** — auto-HK on checkout ≠ inventory push. Phase 5 must still curl-probe `aiosell_sync_logs` after checkout to verify/file BACKEND_BRIEF if inventory is never auto-released. | P2 | Phase 5 agent |
| R6 | **MISSING-01 (`dashboard-kpis`) still open** — skeleton state in P3 per NS-02 is correct. No action needed now. | LOW | Backend (before P3 QA) |

---

## 9. Retroactive Candidates
NONE — no CR-358 code exists in `src/` yet (Phase 1 not yet implemented). No registry drift to flag.

---

## 10. Evidence Artifacts
- Source doc: `handover_3.md` (owner-provided, 2026-09-02)
- Cross-referenced against: `CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md`, `CR-358_EXECUTION_PLAN_PHASED.md`, `BACKEND_BRIEF_CR358_2026_08_28.md`, `CR-358-P1_IMPLEMENTATION_PLAN.md`, `SESSION_HANDOVER_2026_09_02_CR358_READY_FOR_IMPL.md`
- No curl probes run this session (investigation is doc-level only — no live environment access needed for this audit)

---

## Final Status Line

```
Investigation complete: CR-358 handover_3 gap audit
Classification: BACKEND_DELIVERY
Confidence: HIGH | Steps: 6/10

Blockers FIXED:    MISSING-02 (PATCH room-status) ✅ | GAP-08 (all-rooms source) ✅
Still open:        MISSING-01 (dashboard-kpis, non-blocking) ⏳ | GAP-09 (inventory release, Phase 5 probe) ⚠
New scope (3 items): ROOM_STATUS_BOARD constant | roomStatusTransform approach changed | "booked" 5th state
Phase impact:      Phase 4 entry gate CLEARED | Phase 1 constants need +1 line (ROOM_STATUS_BOARD)

Planning skip eligible: NO (Phase 4 plan amendments are medium-scope, multi-file, HIGH risk UI)
Next: Owner GO → Planning agent writes CR-358-P4 Gate 3 plan incorporating NS-A through NS-E
```

*Investigation agent | CR-358 | 2026-09-02 | No code written*
