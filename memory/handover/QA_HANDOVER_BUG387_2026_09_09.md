# QA Handover — BUG-387 (Retroactive)
## PMS Picker: HK and OOO Rooms Appear Selectable

**Date:** 2026-09-09
**Note:** This QA Handover was missing from EXIT GATE checklist — created retroactively by QA agent from implementation code.
**Item:** BUG-387
**Risk:** HIGH
**Sprint:** pos_pms_1

---

## 1. Implementation Summary (derived from code — no original handover)

Code confirmed in 3 files:

| File | Change | Code marker |
|---|---|---|
| `src/api/services/pmsService.js:85-97` | `getBookableRooms()` now calls `getRoomStatusBoard()` in parallel; builds `statusById` map; exposes `isOoo` + `isHk` per room | `// BUG-387` |
| `src/pages/pms/CheckInPage.jsx:349-351` | `const unavail = r.isOccupied \| \| r.isOoo \| \| r.isHk` — disabled if OOO or HK; label suffix appended | `// BUG-387` |
| `src/pages/pms/NewBookingPage.jsx:183-184` | `const unavail = r.isOccupied \| \| r.isOoo \| \| r.isHk` — oooBadge renders amber/blue badge overlay | `// BUG-387` |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| TC-387-01 | OOO rooms greyed in Check-In dropdown | /pms/check-in → room picker dropdown | OOO rooms show "Out of Order" suffix, disabled |
| TC-387-02 | HK rooms greyed in Check-In dropdown | Same dropdown | HK rooms show "Needs Cleaning" suffix, disabled |
| TC-387-03 | OOO badge in New Booking room grid | /pms/new-booking → room grid | OOO rooms show amber "Out of Order" badge; not selectable |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Available rooms still selectable in picker | `statusById` miss should default to selectable |
| R2 | Occupied rooms still show Occupied badge | BUG-380 must not regress |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES** (confirmed in registry.json)
- BUG-387 → `IMPLEMENTED — Gate 5a`
- Sprint: `pos_pms_1`
- Note: EXIT GATE checklist was incomplete (QA handover not written). Retroactive handover created by QA agent.

---

## 5. Credentials + Environment

- App URL: https://pos-front-preview-3.preview.emergentagent.com
- Account: owner@thegoankitchen.com (***)
- Preprod API: https://preprod.mygenie.online/
- Navigate to /pms/check-in and /pms/new-booking after login
