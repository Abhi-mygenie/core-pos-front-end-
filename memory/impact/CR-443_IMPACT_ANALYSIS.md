# CR-443 (+CR-496) — Cancel / Unpaid / Payment-Change Alerts — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: NONE for these alerts. NotificationContext.jsx handles FCM by `data.type` (confirm_order etc.) + sound; no cancel/unpaid/payment-change types.
Risk: HIGH (FCM, sockets, permissions). Backend-blocked: YES.

## Owner decision (locked)
Alerts: cancel before serve, cancel after serve, unpaid, payment method changed (more at impact). Content: order, item, table/room, who, reason. POS + phone push. A right decides who can receive; employee can mute per device. Phase 2: read tick + tap opens order.

## Findings
- Probe 30: no notification-preference endpoint. Catalogue (probe 07): no alert-receiver right.
- Known constraint (BUG-454): one `fcm_token` per employee, last login overwrites → an employee logged in on POS + phone gets push on one device only.
- Serve stage is server-derived (probe 24) → backend must decide before/after serve.
- Mute per device = FE localStorage (new key — R8 note).

## Open owner decisions
- OD-443-A: "more at impact" — add other events now (e.g. discount above ₹X, comp, reprint, cancel after bill)? OPEN.
- OD-443-B: POS + phone both — accept BUG-454 single-token limit, or backend to support multiple tokens? OPEN.

## Backend asks
- B-443-1: new right key (e.g. receive alerts) in catalogue.
- B-443-2: FCM/socket event per trigger with order, item, table/room, who, reason, serve stage.
- B-443-3: multi-device FCM tokens (if OD-443-B).
