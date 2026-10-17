# BACKEND_BRIEF_BUG-385_2026_09_09
## PMS — `no_show` Field Absent from local-reservations and dashboard-kpis

**From:** MyGenie POS frontend team
**To:** Backend / Dev team
**Date:** 2026-09-09
**Bug ID:** BUG-385
**Priority:** P2 · LOW
**Status:** OPEN — awaiting backend decision / field delivery
**Related:** CR-363 (Night Audit Report), CR-358-P5 (Mark No-Show action), OG-PMS-015

---

## Summary

- **Issue:** Neither `GET /aiosell/local-reservations` nor `GET /aiosell/dashboard-kpis` exposes a `no_show` field or count. The CR-363 Night Audit report requires a no-show line item. The FE has no data to read.
- **Classification:** BACKEND_BUG — missing field in API contract
- **Frontend impact:** CR-363 Night Audit cannot show no-show booking count or line until this is resolved.
- **First observed:** 2026-09-06 · **Re-confirmed:** 2026-09-08

---

## Endpoint

- **Method:** GET
- **URL 1:** `https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/local-reservations`
- **URL 2:** `https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/dashboard-kpis`
- **Auth:** Bearer *** (owner@thegoankitchen.com, restaurant_id: 69)

---

## Reproduction

```bash
# Probe 1 — local-reservations (17 items checked)
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/local-reservations?start_date=2026-09-01&end_date=2026-09-30" \
  -H "Authorization: Bearer <TOKEN>"
# Result: 17 reservations returned
# Keys present: id, booking_id, cm_booking_id, channel, hotel_code, checkin, checkout,
#   status, pah, operational_status, booked_on, amount_before_tax, amount_after_tax,
#   currency, special_requests, user_id_document_id, guest, rooms
# 'no_show': KEY MISSING

# Probe 2 — dashboard-kpis
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/dashboard-kpis?start_date=2026-09-01&end_date=2026-09-08" \
  -H "Authorization: Bearer <TOKEN>"
# Today block keys: arrivals_count, departures_count, in_house_count, occupancy_percent_physical
# Recursive search for 'no_show' across full response: 0 HITS
```

---

## Evidence

- Evidence saved: `/app/memory/evidence/CR-358-P3/probe_07_dashboard_kpis.json` (kpis), `/app/memory/evidence/INV-PMS-ENH/probe_01_local_reservations.json` (LR)
- `operational_status` field exists on LR records — values seen: `pending`, `in_house`, `departed`. No `no_show` value observed in any of the 17 records.
- CR-358-P5 `MARK_NO_SHOW` constant (`src/api/constants.js:593`) exists for the Mark No-Show POST action — but there is no corresponding read-back field that the FE can use for Night Audit counts.

---

## Frontend status

No FE code currently reads a `no_show` field (the field doesn't exist to read). The Night Audit report (CR-363) is blocked on this data.

---

## Ask — choose one option and confirm

| Option | What backend does | FE impact |
|---|---|---|
| **A — Add to dashboard-kpis** | Add `no_show_count` to the `today` (and/or date-range) block in `dashboard-kpis` response | FE reads `no_show_count` in Night Audit. **Preferred — cleanest.** |
| **B — Add to local-reservations** | Add `no_show: true/false` or `operational_status` value `'no_show'` per-record in `local-reservations` | FE counts client-side. Workable but adds payload. |
| **C — FE-derives (no backend change)** | No backend change | FE treats `operational_status === 'pending'` + `checkin < today` as proxy. Approximate, not official. |

**Our recommendation:** Option A (`no_show_count` in `dashboard-kpis`) — one integer field, minimal change, accurate.

---

## Frontend Workaround

- **Available:** YES (partial) — Option C (FE-derive from pending + overdue) unblocks CR-363 with an approximate count if backend cannot deliver Options A or B quickly.
- Owner has been informed — OD-385-01 pending their preference between A/B/C.
