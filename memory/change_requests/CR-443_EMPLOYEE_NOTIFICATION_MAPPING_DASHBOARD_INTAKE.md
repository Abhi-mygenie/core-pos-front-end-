# CR-443 — Employee-Level Notification Mapping Dashboard

**ID:** CR-443  **Type:** CR  **Registered:** 2026-10-22  **Sprint:** tooling_oct1  
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-001 (TT-003 = duplicate of this)

## Description
New feature: employee-level notification preference dashboard. Staff can choose which real-time events they want to be notified about. Three trigger events in scope: (1) order cancellation, (2) order made unpaid, (3) payment method changed on an order. This is NOT in Local Settings (restaurant-wide) — it is per-employee, each staff member manages their own notification subscriptions.

## Owner input (verbatim)
"need notification for cancellation, if order is made unpaid or payment method is change we will need a dashboard where person can manage which notifications he wants, it will not be local settings but employee level notification mapping"

## Evidence
- Source: OWNER-REPORTED via TT-001 (Tech Tasks sheet)
- Confidence: CONFIRMED
- Screenshot: not provided

## Duplicate check
DISTINCT. Related: BUG-454 (FCM buzzer backend issue), BUG-453 (mute ringer), BUG-600 (aggregator buzzer). None cover employee-level preference management UI.

## Code Reality
PARTIAL — 1 hit for notification preference concept but no employee-level mapping UI exists. FCM token handling exists in NotificationContext.jsx.

## Blast radius
MEDIUM — new settings screen/panel + backend endpoint for per-employee prefs + NotificationContext read of prefs at play time. ~4–6 files.

## Open decisions for Gate 2
- OD-443-01: Where does the employee dashboard live? (Profile page section / dedicated Settings tab / modal on employee profile)
- OD-443-02: Scope of notification types — just the 3 listed (cancellation, unpaid, payment change) or more?
- OD-443-03: Is preference stored FE-only (localStorage per device) or backend (per employee account)?
- OD-443-04: Should this gate the FCM subscription topic (don't subscribe to topic if pref=off) or just suppress the UI alert?
