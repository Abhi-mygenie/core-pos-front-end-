# CR-367 — INTAKE
## PMS — WhatsApp / SMS Guest Notifications (booking confirmation · check-in instructions · checkout reminder · balance link)

**ID:** CR-367
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (post-CR-358 enhancement list; templates pre-approved in CR-358 intake §9) — owner-selected 2026-09-04
**Related:** CR-017 (WhatsApp Payment Link — only existing outbound WhatsApp path, order-bound), CR-358 intake §9 (message templates), BACKEND_BRIEF_CR358 §3 (self check-in link APIs B-03/04/05 — backend replied "Omit, Phase 2"), BUG-092 (phone format E.164 vs 10-digit), CR-078 CRM (guest phone source), `REACT_APP_CRM_API_KEYS` truncated (P1 config)
**Type:** CR (new capability)
**Scope decision (owner 2026-09-04):** FULL feature — automated sends (no manual `wa.me` share workaround)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → Arrivals / New Booking / Departures / Folio → notifications |
| Priority | **P2** (owner-confirmed 2026-09-04) |
| Risk | **HIGH** — customer data leaves the system; per-message provider cost; consent (DLT/WhatsApp Business template approval); no money |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **RELATED** — CR-017 (payment-link WhatsApp, shipped) and CR-358 S5 self-check-in link (deferred by backend). DISTINCT scope: templated stay notifications |
| Code reality | **NONE** for guest stay notifications — only `paymentLinkService.sendPaymentLink()` + `WhatsAppPaymentModal.jsx` (Razorpay template, requires existing order) |
| Blast radius | MEDIUM — 1 NEW service + 1 NEW dialog + 3 page hooks (NewBookingPage success, ArrivalsPage row action, DeparturesPage/Folio reminder) + Channel Manager settings tab for templates/toggles. Hotspots: NO |
| Backend blocked | **YES** — no generic guest-messaging endpoint; no scheduler; no template store |

---

## Description

Guests should automatically receive: (1) booking confirmation when a Direct/phone booking is saved, (2) check-in instructions / room-ready message when a room is assigned (CR-361) or on arrival day, (3) checkout reminder on departure day, (4) balance-due payment link (existing CR-017 flow reused). Reduces no-shows and front-desk calls.

### Expected behaviour
| Trigger | Message (CR-358 intake §9 templates) | Channel | Mode |
|---|---|---|---|
| `createDirectReservation()` success | Booking confirmation (name, hotel, dates, nights, room type, balance due, self-CI link *if* S5 ever ships) | WhatsApp → SMS fallback | automatic (toggle) |
| Room assigned (CR-361) / arrival day 09:00 | "Your room is ready — Room N" / check-in instructions (address, timings, ID required) | WhatsApp/SMS | automatic (scheduler) or manual "Send" |
| Departure day 08:00 (in-house, checkout = today) | Checkout reminder + balance | WhatsApp/SMS | scheduler |
| Balance due (in-house, unpaid) | Payment link | existing `razor-pay/payment-link` | manual (already exists on OrderCard; expose in Folio) |
| Any | Manual resend from Arrivals / Folio with preview | WhatsApp/SMS | manual |
| Settings (Channel Manager → Notifications tab) | per-trigger on/off, hotel address/wifi/reception fields, template preview, delivery log | FE + backend config | — |
| Delivery log | per reservation: sent_at, channel, status (queued/sent/delivered/failed) | backend | — |

### Current behaviour
Nothing is sent to guests except the manual Razorpay payment link (needs an order → not possible for pending bookings).

---

## Evidence

- Curl: `probe_10_pos_side_routes.txt` — `send-whatsapp`, `whatsapp/send`, `send-sms`, `notification/send`, `guest-notification`, `aiosell/send-notification`, `aiosell/notify-guest` → **404**; `razor-pay/payment-link` → 405 GET / POST 404 *"No query results for model Order"* (order-bound)
- Backend position: `backend_replies/ques3_reply_2026_09_03.md` OD-P3-08 — "Omit. S5 / GAP-06 is Phase 2. No public token APIs."
- Data: `local-reservations.guest.phone/email` present for OTA rows, **null** for several sandbox Direct rows → needs phone required at New Booking (currently optional?) — Gate 2 to verify `NewBookingPage` validation
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E7
- Source: AGENT-DISCOVERED · Confidence: CONFIRMED (backend absence live-verified)

---

## Backend Dependency (blocks Gate 4)

| # | Ask | Type |
|---|---|---|
| B-367-01 | `POST /aiosell/notifications/send` `{ reservation_id, template: booking_confirmation\|room_ready\|checkin_instructions\|checkout_reminder, channel: whatsapp\|sms\|auto, override_phone? }` → `{notification_id, status}`; renders templates server-side from reservation + property config | NEW ENDPOINT |
| B-367-02 | Scheduler: auto-send `checkin_instructions` (arrival day) and `checkout_reminder` (departure day) per restaurant toggles | BACKEND JOB |
| B-367-03 | `GET/POST /aiosell/notification-settings` (toggles, send times, hotel address, wifi, reception number) | NEW ENDPOINT |
| B-367-04 | `GET /aiosell/notifications?reservation_id=` delivery log | NEW ENDPOINT |
| B-367-05 | Provider: reuse existing WhatsApp BSP used by CR-017 (`razoar_payment_with_url` template) — new templates need WhatsApp Business approval; SMS needs DLT-registered templates (India) | VENDOR / COMPLIANCE |
| B-367-06 | Self check-in public token APIs (B-03/04/05 from CR-358 brief) if confirmation message should carry a self-CI link | NEW ENDPOINTS (optional) |
| B-367-07 | Auto-send on `direct-reservation` create (server hook) vs FE-triggered send after 201 | CLARIFICATION |

---

## Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-367-01 | Consent: capture opt-in at New Booking? OTA guests — rely on OTA consent? | opt-in field / assume |
| OD-367-02 | Provider & budget owner for WhatsApp/SMS per message | existing BSP / new |
| OD-367-03 | Which triggers are on by default? | confirmation only / all |
| OD-367-04 | Include self check-in link (requires S5 backend) or plain instructions in v1? | plain / wait for S5 |
| OD-367-05 | Language(s) of templates | EN / EN+HI / per-restaurant |
| OD-367-06 | Phone normalisation rule (10-digit → +91) — reuse BUG-092 decision? | yes / configurable country code |

---

## Files (expected)

| File | Change |
|---|---|
| `api/services/notificationService.js` (NEW) | send / settings / log |
| `api/transforms/notificationTransform.js` (NEW) | |
| `api/constants.js` | +endpoints |
| `components/pms/SendGuestMessageDialog.jsx` (NEW) | preview + send + log |
| `pages/pms/NewBookingPage.jsx` | post-save auto-send hook (if FE-triggered) + phone required |
| `pages/pms/ArrivalsPage.jsx`, `DeparturesPage.jsx`, `GuestFolioPage.jsx` (CR-364) | "Message guest" action |
| `pages/pms/ChannelManagerPage.jsx` | Notifications settings tab |

Files NOT touched: paymentLinkService.js (reused), WhatsAppPaymentModal.jsx, OrderCard.jsx, CollectPaymentPanel.jsx.

---

## Gate status
- [x] Gate 0/1 — Intake
- [ ] Gate 2 — Impact Analysis (blocked on B-367-01/03/05)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Intake agent | Code reality: NONE | Duplicate: RELATED (CR-017, CR-358 S5) | Blast radius: MEDIUM | Risk: HIGH | BACKEND-BLOCKED*
