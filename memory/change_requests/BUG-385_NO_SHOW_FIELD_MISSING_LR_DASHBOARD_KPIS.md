# BUG-385 — no_show Field Absent from local-reservations and dashboard-kpis

**ID:** BUG-385
**Type:** BUG (BACKEND-BLOCKED)
**Date:** 2026-09-08
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (Investigation session 2026-09-08, OG-PMS-015 fresh probe)
**Sprint:** pos_pms_1
**Related:** CR-363 (Night Audit Report — no-show count line), CR-358-P5 (Mark No-Show action), OG-PMS-015

---

## Summary

Neither `GET /api/v2/vendoremployee/aiosell/local-reservations` nor `GET /api/v2/vendoremployee/aiosell/dashboard-kpis` exposes a `no_show` field or count. The CR-363 Night Audit report requires a no-show line (bookings where the guest never arrived). Without a backend field, the frontend must either:

**(a) Derive FE-side** — treat `operational_status === 'pending'` AND `checkin < today` as a no-show proxy (approximate, not official)
**(b) Wait for CR-358-P5** — the Mark No-Show action will set an explicit backend status; that status can then feed the Night Audit count
**(c) Request backend to add `no_show_count` to `dashboard-kpis`**

This is a backend delivery gap, not a frontend bug. No FE code currently reads a `no_show` field (the field doesn't exist to read).

---

## Evidence

```
GET /api/v2/vendoremployee/aiosell/local-reservations?start_date=2026-09-01&end_date=2026-09-30
→ 17 reservations
→ Reservation keys: id, booking_id, cm_booking_id, channel, hotel_code, checkin, checkout,
   status, pah, operational_status, booked_on, amount_before_tax, amount_after_tax,
   currency, special_requests, user_id_document_id, guest, rooms
→ 'no_show': KEY MISSING

GET /api/v2/vendoremployee/aiosell/dashboard-kpis?start_date=2026-09-01&end_date=2026-09-08
→ today block keys: arrivals_count, departures_count, in_house_count, occupancy_percent_physical
→ Recursive search for 'no_show' across full response: 0 hits
```

- **First observed:** 2026-09-06 (INV-PMS-CRs-363-364-366)
- **Re-confirmed:** 2026-09-08 (investigation probes 13 + 14) — NOT resolved by backend

---

## Classification

| Field | Value |
|---|---|
| Type | BUG (backend — missing field) |
| Area | PMS > Night Audit (CR-363) / local-reservations contract |
| Priority | **P2** — Night Audit is an important but non-blocking report; workaround (FE-derived) exists |
| Risk | **LOW** — no FE code reads a non-existent field; no production breakage |
| Fast Lane eligible | **NO** — backend fix required |
| Backend blocked | **YES** — backend must add field or owner approves FE-derived workaround |
| Sprint | pos_pms_1 |

---

## Frontend code status

No FE code exists to read `no_show` from LR or kpis. `MARK_NO_SHOW` endpoint constant (`src/api/constants.js:593`) exists for the CR-358-P5 action (different — it sets no-show, doesn't read a status flag).

---

## Owner decision needed

| OD | Question | Options |
|---|---|---|
| OD-385-01 | How should CR-363 Night Audit derive no-shows? | (a) FE-derive: pending + checkin < today (approximate) · (b) Wait for CR-358-P5 Mark No-Show to set explicit status · (c) Request backend add `no_show_count` to dashboard-kpis |

This decision gates CR-363 planning.

---

## Duplicate Check

- Searched: "no_show", "noShow", "no-show", "OG-PMS-015" in BUG_TRACKER + registry
- OG-PMS-015 references this issue in OPEN_GAPS_REGISTER but no BUG was registered
- **Result: DISTINCT** (registering formally from OG-PMS-015)

---

## Blast Radius

- FE files affected: **0** (no FE code reads this field)
- Hotspot files: NO
- Estimated scope: NONE (FE); SMALL (backend needs to add 1 field)

---

*Intake: 2026-09-08 | INTAKE agent | Code reality: NONE (field doesn't exist) | Risk: LOW | P2 | Blast radius: NONE (FE) | BACKEND-BLOCKED*
