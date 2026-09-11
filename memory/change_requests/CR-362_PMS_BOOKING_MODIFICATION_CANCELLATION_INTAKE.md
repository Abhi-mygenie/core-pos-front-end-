# CR-362 — INTAKE
## PMS — Booking Modification & Cancellation (cancel · modify dates/room · extend stay · no-show)

**ID:** CR-362
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (post-CR-358 enhancement list) — owner-selected 2026-09-04
**Related:** CR-358-P5 (Mark No-Show S8-D — registered same day; CR-362 **consumes** it, does not re-implement), CR-358-P3 (Arrivals/Departures lists host the actions), CR-358-P4 (tape popover), CR-357 (room advance rules — refund interplay), CR-165 (Razorpay cancel-and-refund, online only)
**Type:** CR (new capability)
**Scope decision (owner 2026-09-04):** FULL feature, no v1 workaround

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → Arrivals (S9) / Departures (S10) / Tape Chart (S2) / In-House (S6) |
| Priority | **P1** (owner-confirmed 2026-09-04) |
| Risk | **CRITICAL** — money (refunds, re-pricing), inventory push to OTAs, reservation status contract, room_info re-computation |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **RELATED** to CR-358-P5 (mark-no-show is one sub-action); otherwise DISTINCT — no cancel/modify/extend item exists in registry or trackers |
| Code reality | **NONE** — only `AIOSELL_ENDPOINTS.MARK_NO_SHOW` constant declared (inert). No cancel/modify/extend code |
| Blast radius | LARGE — 5–6 files (pmsService.js, aiosellTransform.js, ArrivalsPage.jsx, DeparturesPage.jsx, ReservationsPage.jsx popover, InHouseGuestsPage.jsx) + 2 new dialogs. Hotspots: NO (CollectPaymentPanel/OrderEntry not touched) |
| Backend blocked | **YES** — 0 of 3 required write endpoints exist |

---

## Description

Today staff cannot change or cancel a booking from the PMS: no extend stay, no date change, no room-type change, no cancellation. For OTA bookings they must use the OTA extranet; for Direct/phone bookings there is **no path at all** (the booking stays `pending` forever and shows as a late arrival).

### Expected behaviour
| Action | Applies to | Effect |
|---|---|---|
| **Cancel booking** | `pending` (Direct, WalkIn-advance, OTA*) | status → `cancelled`, block removed from tape chart, soft-allocation released, inventory pushed (+1 availability), reason captured, optional refund note |
| **Modify dates** | `pending` | checkin/checkout updated, re-priced (see OD-362-03), inventory re-pushed for old/new nights, tape block resized |
| **Modify room type / room** | `pending` | room_code and/or restaurant_table_id changed (assignment part depends on CR-361) |
| **Extend / shorten stay** | `in_house` | `checkout` (aiosell_reservations) + `user_id_documents.checkout_date` + `orders.room_info.room_price/balance_payment` updated; tape block extended; inventory re-pushed |
| **Mark No-Show** | `pending` booking.com / gommt only | via CR-358-P5 `POST aiosell/mark-no-show`; room released |
| **Cancelled tab** | Arrivals (S9) | 5th tab listing cancelled/no-show with reason + timestamp |

\* OTA cancel: OTA is source of truth; local cancel must either be forbidden or explicitly marked "local only, extranet still active" (OD-362-02).

### Current behaviour
No actions exist. `local-reservations` returns only `status: confirmed` rows; `view=cancelled` → 422 invalid view.

---

## Evidence

- Screenshot: not provided
- Steps: Arrivals → any pending row → no Cancel/Modify action; Departures → in-house row → only Check Out
- Curl: `probe_07_discovery_routes.txt` + `probe_14_discovery_pos_side.txt` — `cancel-reservation`, `modify-reservation`, `update-reservation`, `local-reservations/{id}/cancel`, `pos/extend-stay`, `pos/room-extend`, `pos/update-room-checkin`, `pos/room-checkout-date-update` … all **404**; `mark-no-show` → 405/422 (exists); `probe_15_mark_no_show_direct.json` → 422 *"Mark no-show only supports booking.com and gommt. Got: direct"*
- Data: sandbox has **zero** `cancelled` / `modified` / `no_show` samples (X-03) — FE cannot verify rendering until seeded
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E2
- Source: AGENT-DISCOVERED · Confidence: CONFIRMED (endpoint absence live-verified)

---

## Backend Dependency (blocks Gate 4)

| # | Ask | Type |
|---|---|---|
| B-362-01 | `POST /aiosell/local-reservations/{id}/cancel` `{ reason, cancelled_by, notify_cm: bool }` → status `cancelled`, `cancelled_at`, release allocation, push inventory. 409 if any line `checked_in` | NEW ENDPOINT |
| B-362-02 | `PATCH /aiosell/local-reservations/{id}` `{ checkin?, checkout?, rooms?: [{id, room_code?, restaurant_table_id?, adults?, children?}], amount_after_tax?, reason }` for `pending` only; re-push inventory for affected nights | NEW ENDPOINT |
| B-362-03 | `POST /pos/room-extend-stay` `{ order_id, new_checkout_date, new_room_price?, reason }` → updates `user_id_documents.checkout_date`, `orders.room_info` (room_price, balance_payment), `aiosell_reservations.checkout`, pushes inventory | NEW ENDPOINT (money) |
| B-362-04 | `local-reservations` must return `status` ∈ {confirmed, cancelled, no_show, modified} + `cancelled_at`, `cancel_reason`, and accept `view=cancelled` (or FE filters `status`) | CONTRACT |
| B-362-05 | Seed sandbox with webhook `action=cancel` and `action=modify` samples so FE can verify | DATA |
| B-362-06 | State whether Direct-channel changes are pushed to AIOSELL as direct-booking updates (intake rate table says direct → YES) | CLARIFICATION |

---

## Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-362-01 | Refund policy on cancel: advance received (cash/UPI) — no refund API exists except Razorpay online | a) Display "refund manually" note only · b) Record refund via `pos/room-payment` negative? (needs backend) · c) No refunds in v1 |
| OD-362-02 | Allow local cancel of OTA bookings? | a) No — show "cancel in OTA extranet" · b) Yes, marked local-only · c) Yes + notify CM (needs B-362-01 notify_cm) |
| OD-362-03 | Extend-stay pricing | a) Existing nightly rate × extra nights (from `amount_after_tax / nights`) · b) Live `fetch-rates` for the new dates · c) Manual entry with reason |
| OD-362-04 | Who may cancel/modify — permission key? | owner/manager only vs all POS users |
| OD-362-05 | Cancellation reasons — reuse `CANCELLATION_REASONS` endpoint list or PMS-specific list? | reuse / new |
| OD-362-06 | Modify dates on `in_house` (shorten stay = early checkout) → is that just Checkout via PmsCheckoutDrawer? | yes / needs refund logic (ties to enhancement 13 in handover list) |

---

## Files (expected — Gate 2 to confirm)

| File | Change |
|---|---|
| `api/constants.js` | +3 endpoints |
| `api/services/pmsService.js` | +`cancelReservation`, `modifyReservation`, `extendStay`; bucket `cancelled` in `bucketReservationOps` |
| `api/transforms/aiosellTransform.js` | `fromReservationOps` +`cancelledAt`, `cancelReason`, status mapping |
| `pages/pms/ArrivalsPage.jsx` | row actions (Cancel / Modify / No-Show), Cancelled tab |
| `pages/pms/DeparturesPage.jsx` + `InHouseGuestsPage.jsx` | Extend Stay action |
| `pages/pms/ReservationsPage.jsx` | popover actions |
| `components/pms/CancelBookingDialog.jsx`, `ModifyBookingDialog.jsx`, `ExtendStayDialog.jsx` (NEW) | dialogs |

Files NOT touched: CollectPaymentPanel.jsx, OrderEntry.jsx, orderTransform.js, RoomCheckInModal.jsx.

---

## Gate status
- [x] Gate 0/1 — Intake
- [ ] Gate 2 — Impact Analysis (blocked on B-362-01..04 contract)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Intake agent | Code reality: NONE | Duplicate: RELATED (CR-358-P5) | Blast radius: LARGE | Risk: CRITICAL | BACKEND-BLOCKED | Owner approval required at Gate 4 (money)*
