# CR-168 — Guest Self Check-In: Public Form → POS Review & Approval (Phase 1)

**ID:** CR-168
**Type:** CR (New Feature)
**Priority:** P1
**Risk:** MEDIUM
**Area:** Room Module → Self Check-In → Dashboard Review
**Sprint:** POS 5.x
**Created:** 2026-08-18
**Source:** OWNER-REQUEST + INVESTIGATION (INV-SELF-CHECKIN-2026-08-18)
**Duplicate check:** DISTINCT
**Code reality:** NONE — complete new feature, frontend + backend

---

## Description

Currently room check-in is 100% staff-operated. Owner wants guests to self check-in via a public page/QR code. POS staff then reviews the submission and approves or rejects it.

**Guest flow:** QR code in room/lobby → public page → fill name, phone, ID photo, dates, guest count → submit → "Awaiting confirmation"

**Staff flow:** Dashboard notification badge → slide-in drawer → view guest photo + info → [Approve] (enter room price/advance) or [Reject]

---

## Investigation Reference
Full architecture: `/app/memory/INV-SELF-CHECKIN-2026-08-18_INVESTIGATION_REPORT.md`

---

## Backend Endpoints Needed (all NEW — Backend Brief included in investigation report)

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/v2/public/room/self-check-in-request` | NONE (public) | Guest submits |
| `GET /api/v2/vendoremployee/pos/self-checkin-requests` | Bearer | Staff lists pending |
| `POST /api/v2/vendoremployee/pos/self-checkin-requests/{id}/approve` | Bearer | Approve → creates check-in |
| `POST /api/v2/vendoremployee/pos/self-checkin-requests/{id}/reject` | Bearer | Reject |
| Socket: `new_self_checkin_request` | — | Push to POS on guest submit |

---

## Frontend Files

**New:** `SelfCheckInPage.jsx`, `PendingCheckInDrawer.jsx`, `selfCheckInService.js`
**Modified:** `App.js` (+public route), `constants.js` (+3 endpoints), `socketHandlers.js` (+1 event), `DashboardPage.jsx` (+badge + drawer)

---

## Owner Decisions — ALL DEFERRED TO GATE 2

| # | Question |
|---|---|
| OQ-1 | Guest page inside existing POS app or separate lightweight page? |
| OQ-2 | On approval: pre-filled RoomCheckInModal or simple price input? |
| OQ-3 | Confirm guest vs staff field split |
| OQ-4 | Notify guest on rejection? |

---

## Blast Radius
- 3 new files + 4 modified files
- No hotspot files touched
- New public unauthenticated route
- New socket event handler
- Risk: MEDIUM — no financial logic

**Backend:** NOT READY — 4 new endpoints needed
**Next:** Gate 2 (owner answers OQ-1 to OQ-4 at planning)
