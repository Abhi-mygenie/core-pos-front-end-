# SESSION HANDOVER — PMS Module CR-358: Gap Verification + Impact Analysis Closure
**Date:** 2026-08-28
**Written by:** Planning agent (Gate 2) + Intake agent (GAP-01 fix)
**For:** Next agent
**Focus:** PMS module ONLY — ignore printer CRs (CR-351/CR-352), ignore all other sprints
**Status:** GATE 2 COMPLETE — Impact Analysis written, gaps documented, registry fixed
**First action for next agent:** Read §1 fully. Present §5 (owner decisions) to owner one by one. Then verify §3 (curl probes). Only after ALL verified → close impact analysis and proceed to Gate 3.

---

## 1. What This Session Covered

1. **Memory sync** — `git fetch origin main` + `git checkout FETCH_HEAD -- memory/` — full memory pulled from remote. `AGENT_PROMPT_ALPHA.md` v0.7 now present at `/app/memory/control/AGENT_PROMPT_ALPHA.md`
2. **API handover read** — `handover_1.md` (AIOSELL MyGenie backend spec, 13 sections, full curl examples). Shared by owner at session start.
3. **PLANNING role → Gate 2 Impact Analysis** — written for CR-358 (PMS module). 17 gaps found, 8 owner decisions documented, 5 missing backend endpoints identified.
4. **INTAKE role → GAP-01 fixed** — CR-351 ID collision resolved. PMS CR renumbered to **CR-358**. Files renamed.
5. **Backend brief written** — `/app/memory/backend_briefs/BACKEND_BRIEF_CR358_2026_08_28.md` — 10 backend action items, with curl probes and expected response shapes for backend team.

---

## 2. The Only CR You Care About This Session

**CR-358** — PMS Module + Channel Manager Integration (AIOSELL)

Everything else (CR-351 Printer, CR-352 Printer Routing Gate, BUG-362/363/364) is **not your concern**. Do not read those. Do not touch those files.

| Artifact | Path |
|---|---|
| Intake doc | `change_requests/CR-358_PMS_CHANNEL_MANAGER_CHECKIN_REDESIGN_INTAKE.md` |
| Design spec (10 screens) | `plans/CR-358_DESIGN_SPEC_2026_08_27.md` |
| Impact Analysis (Gate 2) | `impact/CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` |
| Backend brief | `backend_briefs/BACKEND_BRIEF_CR358_2026_08_28.md` |
| HTML mockups | `/app/frontend/public/pms/*.html` (10 files) |

---

## 3. Gaps to Verify Before Closing Impact Analysis

These are the **critical P1 gaps** that require curl probing against preprod. Do not assume anything. Run each curl, record the actual response, and update the status in the impact doc.

**Preprod base URL:** `https://preprod.mygenie.online`
**Token:** Owner's Bearer token (obtain fresh token by logging in at start of session)

---

### VERIFY-01 — Does the local reservations endpoint exist?

This is the single biggest gap. The tape chart, arrivals, departures, and front desk all depend on it.

```bash
# Test: does this endpoint exist?
curl -s -X GET "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/local-reservations?start_date=2026-09-01&end_date=2026-09-07" \
  -H "Authorization: Bearer {TOKEN}" | head -50
```

**If 200 + reservation data** → GAP-02 CLOSED. Record response shape.
**If 404/422/500** → GAP-02 CONFIRMED OPEN. Backend must build it. Update impact doc: `GAP-02: CONFIRMED MISSING — backend action B-01 required`.

Save response to: `/app/memory/evidence/CR-358/verify01_local_reservations.json`

---

### VERIFY-02 — Does ROOM_CHECK_IN link Online bookings to aiosell_reservations?

```bash
# Step 1: Create a test OTA reservation via webhook
curl -s -X POST "https://preprod.mygenie.online/api/v2/aiosell/reservations" \
  -u "aiosell:AIOsell@123" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "book",
    "hotelCode": "sandbox-pms",
    "channel": "booking.com",
    "bookingId": "VERIFY-LINK-001",
    "checkin": "2026-09-15",
    "checkout": "2026-09-17",
    "guest": {"firstName":"VerifyLink","lastName":"Test","phone":"9000000001"},
    "rooms": [{"roomCode":"executive","occupancy":{"adults":1,"children":0},
              "prices":[{"date":"2026-09-15","sellRate":2500}]}],
    "amount": {"amountAfterTax":5000,"amountBeforeTax":5000,"tax":0,"currency":"INR"}
  }'

# Step 2: Check local reservations DB for this booking
# (Use VERIFY-01 endpoint if it exists, or ask owner to check DB directly)

# Step 3: Do a walk-in check-in using booking_type=Online and a mapped room
# (Use an available room from GET /aiosell/rooms)
curl -s -X POST "https://preprod.mygenie.online/api/v1/vendoremployee/pos/user-group-check-in" \
  -H "Authorization: Bearer {TOKEN}" \
  -F "name=VerifyLink Test" \
  -F "phone=9000000001" \
  -F "room_id[0]={A_MAPPED_ROOM_TABLE_ID}" \
  -F "booking_type=Online" \
  -F "booking_for=individual" \
  -F "checkin_date=2026-09-15 00:00:00" \
  -F "checkout_date=2026-09-17 00:00:00" \
  -F "order_amount=5000.00" \
  -F "advance_payment=0.00" \
  -F "balance_payment=5000.00" \
  -F "total_adult=1" \
  -F "total_children=0" \
  -F "id_type=Select document type"
```

**Check after check-in:** Does `aiosell_reservations` row for VERIFY-LINK-001 now show `status=checked_in`?

- **YES** → GAP-03 CLOSED. OTA check-in auto-links. No FE field needed.
- **NO** → GAP-03 CONFIRMED OPEN. FE must pass `aiosell_reservation_id`. Backend action B-02 required.

Save responses to: `/app/memory/evidence/CR-358/verify02_ota_checkin_link.json`

---

### VERIFY-03 — Does checkout release AIOSELL inventory?

```bash
# Step 1: Note current inventory BEFORE checkout
curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/fetch-inventory" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"start_date":"2026-09-15","end_date":"2026-09-17"}'

# Step 2: Check out an existing in-house guest via CollectPaymentPanel
# (Do this via the actual UI — click Pay/Checkout on an in-house room)

# Step 3: Fetch inventory again AFTER checkout
curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/fetch-inventory" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"start_date":"2026-09-15","end_date":"2026-09-17"}'

# Step 4: Check sync logs for outbound inventory push
# Ask owner to check: SELECT * FROM aiosell_sync_logs WHERE sync_type='inventory' AND direction='outbound' ORDER BY created_at DESC LIMIT 5;
```

- **Available goes UP by 1 after checkout + sync log shows outbound** → GAP-09 CLOSED. Backend handles it.
- **Available unchanged + no sync log** → GAP-09 CONFIRMED OPEN. Backend must add inventory push on checkout. Backend action B-07 required.

Save responses to: `/app/memory/evidence/CR-358/verify03_checkout_inventory.json`

---

### VERIFY-04 — Does AIOSELL status endpoint return config?

```bash
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/status" \
  -H "Authorization: Bearer {TOKEN}"
```

**Record:** `service_status`, `is_running`, `hotel_code`, `pms_slug` from response.

- **`is_running: true` + config present** → AIOSELL is already configured on this restaurant. Channel Manager panel (S8) can show live data.
- **`is_running: false` or 404** → Setup not done. GAP-04 (no setup UI) becomes P0 for this restaurant.

Save to: `/app/memory/evidence/CR-358/verify04_aiosell_status.json`

---

### VERIFY-05 — Does room mapping exist?

```bash
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/rooms" \
  -H "Authorization: Bearer {TOKEN}"
```

**Check:** `data.mapping.mapping_complete`, `data.mapping.can_push_inventory`, `data.mappings[]`

- **`mapping_complete: true`** → Rooms already mapped. Inventory push will work.
- **`mapping_complete: false` or `can_push_inventory: false`** → Mappings missing. GAP-05 (no room mapping UI) is P1 blocker for this restaurant.

Save to: `/app/memory/evidence/CR-358/verify05_room_mapping.json`

---

## 4. Evidence Folder

Create this folder and save ALL curl outputs here:

```bash
mkdir -p /app/memory/evidence/CR-358/
```

Each verify step above has a target filename. Use:
```bash
curl ... | python3 -c "import sys,json; json.dump(json.load(sys.stdin), open('/app/memory/evidence/CR-358/<filename>.json','w'), indent=2)"
```

---

## 5. Owner Decisions Needed (OD-01 to OD-08)

Present these ONE AT A TIME to the owner. Do not assume any answer. Record verbatim response.

**IMPORTANT:** Gate 3 (Implementation Plan) is FULLY BLOCKED until ALL 8 are answered.

| # | Question | Why it matters |
|---|---|---|
| **OD-01** | New PMS check-in page (S4) vs existing `RoomCheckInModal.jsx` — which approach? **(a) REPLACE:** PMS page replaces modal, Dashboard room cards → navigate to `/pms/check-in`. **(b) CO-EXIST:** Both exist, two paths to same endpoint. **(c) WRAPPER:** Modal becomes a route. | Determines whether `DashboardPage.jsx` (hotspot R5) is touched |
| **OD-02** | When staff checks in an OTA guest (`booking_type=Online`), does backend automatically link `user_id_documents` to `aiosell_reservations`? YES / NO (or confirm via VERIFY-02 above) | If NO, FE must pass `aiosell_reservation_id` — changes endpoint contract |
| **OD-03** | Where does AIOSELL initial setup (hotel_code, api_key, webhook_secret) live? **(a)** New section in S8 Channel Manager panel. **(b)** New step in Restaurant Settings wizard. **(c)** Separate admin screen. | Required before any AIOSELL feature works — critical prerequisite |
| **OD-04** | Where does room mapping UI live (mapping physical rooms to AIOSELL room types)? **(a)** S8 Channel Manager (new tab). **(b)** Room Status Board setup section. **(c)** Separate setup screen. | Required before inventory push works — critical prerequisite |
| **OD-05** | Is self check-in (S5 — guest checks in from WhatsApp link) **in this release** or Phase 2? | YES = backend must build 3 public endpoints (weeks of work). NO = remove from CR-358 scope. |
| **OD-06** | "Save as Booking (check-in later)" in New Booking form — what should it do? **(a)** Remove button entirely — walk-in = same-day only. **(b)** Backend builds advance direct booking API. **(c)** Handle outside MyGenie (phone bookings logged manually). | Affects New Booking form scope and backend API requirements |
| **OD-07** | Housekeeping (HK) and Out-of-Order (OOO) room states — stored where? **(a)** FE localStorage only (resets on refresh, single device). **(b)** Backend field on `restaurant_table` (persists across sessions, all devices). | If (b), backend must add a room status endpoint |
| **OD-08** | Should Rate Plan badge decode the meal plan from AIOSELL code? E.g., `executive-s-ep` → show "Room Only" badge, `executive-d-cp` → show "Breakfast Included" badge. YES / NO | Guest-facing UX improvement — small scope |

---

## 6. How to Close the Impact Analysis

Only when ALL of the following are done:

```
□ VERIFY-01 complete — result recorded in impact doc (GAP-02: OPEN or CLOSED)
□ VERIFY-02 complete — result recorded in impact doc (GAP-03: OPEN or CLOSED)
□ VERIFY-03 complete — result recorded in impact doc (GAP-09: OPEN or CLOSED)
□ VERIFY-04 complete — AIOSELL status known for this restaurant
□ VERIFY-05 complete — room mapping status known
□ OD-01 to OD-08 answered by owner — recorded verbatim in impact doc §6
□ Update impact doc §4 (each gap): add "VERIFIED: OPEN/CLOSED" status line
□ Update registry.json: CR-358 status → "GATE 2 CLOSED — READY FOR GATE 3"
□ Update CR_REGISTRY.md: CR-358 row updated
```

Then and ONLY then: write the Gate 3 Implementation Plan.

---

## 7. What NOT to Do

- **Do NOT** read or touch anything about CR-351 (Printer), CR-352 (Printer Routing), BUG-362, BUG-363, BUG-364 — not your concern this session
- **Do NOT** open OrderEntry.jsx, CollectPaymentPanel.jsx, orderTransform.js — D3 decision: these are untouched
- **Do NOT** write any implementation code — Gate 3 cannot start until all gaps verified and ODs answered
- **Do NOT** curl AIOSELL directly (`live.aiosell.com`) for these verification steps — use MyGenie endpoints only
- **Do NOT** rename any more files without owner confirmation

---

## 8. Files Created / Changed This Session

| File | Status | Notes |
|---|---|---|
| `change_requests/CR-358_PMS_CHANNEL_MANAGER_CHECKIN_REDESIGN_INTAKE.md` | **RENAMED** from CR-351 | GAP-01 fix |
| `plans/CR-358_DESIGN_SPEC_2026_08_27.md` | **RENAMED** from CR-351 | GAP-01 fix |
| `impact/CR-351_IMPACT_ANALYSIS.md` | **DELETED** | Was stale placeholder |
| `impact/CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` | **NEW** (444 lines) | Full Gate 2 analysis — 17 gaps, 8 ODs |
| `backend_briefs/BACKEND_BRIEF_CR358_2026_08_28.md` | **NEW** (405 lines) | 10 backend action items with curl examples |
| `control/registry.json` | **UPDATED** | CR-358 registered, Gate 2 status |
| `control/CR_REGISTRY.md` | **UPDATED** | CR-358 section appended |
| `PRD.md` | **UPDATED** | Gate 2 milestone added |
| `handover/SESSION_HANDOVER_2026_08_28_CR353_GATE2.md` | NEW | Previous partial handover (superseded by this one) |
| `handover/SESSION_HANDOVER_2026_08_28_FINAL.md` | **THIS FILE** | Use this as authoritative handover |

**HTML mockups (read-only reference — do not modify):**
`/app/frontend/public/pms/` — 10 static HTML files. These are the design source of truth.

---

## 9. Current State of CR-358 in Registry

```
CR-358 | GATE 2 IMPACT ANALYSIS COMPLETE | PMS Module — Property Management + Channel Manager
Gate: 2 ✅ | Gate 3: BLOCKED on 8 ODs + 5 gap verifications
Risk: HIGH | Code Reality: NONE (greenfield)
```

---

## 10. After This Session — What Gate 3 Will Look Like

Once ODs answered + gaps verified, Gate 3 Implementation Plan will cover:

```
New files (~9 React pages + 4 services/transforms):
  pages/pms/FrontDeskPage.jsx
  pages/pms/ReservationsPage.jsx       ← tape chart (complex Gantt grid)
  pages/pms/NewBookingPage.jsx
  pages/pms/CheckInPage.jsx            ← reuses roomService.checkIn()
  pages/pms/InHouseGuestsPage.jsx
  pages/pms/RoomStatusPage.jsx
  pages/pms/ChannelManagerPage.jsx
  pages/pms/ArrivalsPage.jsx
  pages/pms/DeparturesPage.jsx
  api/services/aiosellService.js (NEW)
  api/services/pmsService.js (NEW)
  api/transforms/aiosellTransform.js (NEW)
  api/transforms/roomStatusTransform.js (NEW)

Modified files (conditional):
  App.js              — add 8+ PMS routes
  Sidebar.jsx         — add "Rooms & Reservations" section (5 sub-items)
  api/constants.js    — add AIOSELL endpoint constants
  DashboardPage.jsx   — CONDITIONAL on OD-01
  RoomCheckInModal.jsx — CONDITIONAL on OD-01
```

---

## 11. Quick Reference — Key Documents

| What | Where |
|---|---|
| Full impact analysis (17 gaps, 8 ODs) | `/app/memory/impact/CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` |
| Backend brief (10 action items) | `/app/memory/backend_briefs/BACKEND_BRIEF_CR358_2026_08_28.md` |
| Design spec (10 screens, 5 flows) | `/app/memory/plans/CR-358_DESIGN_SPEC_2026_08_27.md` |
| Intake doc | `/app/memory/change_requests/CR-358_PMS_CHANNEL_MANAGER_CHECKIN_REDESIGN_INTAKE.md` |
| AIOSELL API spec (handover) | `handover_1.md` (shared by owner this session) |
| HTML mockups | `/app/frontend/public/pms/` |
| Agent prompt (roles + gates) | `/app/memory/control/AGENT_PROMPT_ALPHA.md` |

---

*Session: 2026-08-28 | Roles used: PLANNING (Gate 2) + INTAKE (GAP-01 fix)*
*Next role: PLANNING (Gap verification) → PLANNING (Gate 3) after all ODs answered*
*Do not start Gate 3 until §3 verified + §5 answered*
