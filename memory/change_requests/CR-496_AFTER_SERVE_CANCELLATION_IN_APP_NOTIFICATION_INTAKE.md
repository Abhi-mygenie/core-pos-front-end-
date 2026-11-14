# CR-496 — After-Serve Cancellation: In-App Notification

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (awareness: managers need to know when served items are cancelled)
**Risk:** MEDIUM (notification/UI layer, no billing logic change)
**Process required:** Full gate flow. FAST LANE eligible? **NO** (socket + notification system)
**Sprint:** TBD

---

## Description

When a food item is cancelled AFTER it has been served (`status: served` → cancelled), an in-app notification should be triggered to alert the manager/owner. This is critical for loss prevention — served items being cancelled means food was already prepared and potentially consumed.

**Expected behavior:**
- Item cancelled after serve → in-app notification sent to configured recipients (manager/owner)
- Notification should include: order ID, item name, table/room, who cancelled, reason
- Notification appears in the POS notification panel/bell icon (existing notification UI)

**Current behavior:** No special notification for after-serve cancellations. The cancellation happens silently — only visible in reports after the fact.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Serve an item → cancel the served item → no notification appears for managers
- **Confidence:** CONFIRMED (code-traced: no special notification logic for post-serve cancellations)

---

## Code Reality Check

**Code reality: NONE** — Socket notifications exist for new orders (`new_order` events). FCM/Firebase messaging is wired for push. But there is NO specific notification for after-serve cancellations. The cancel flow in `DashboardPage.jsx` calls the cancel API but does not trigger any notification.

---

## Duplicate Check

**RELATED** to:
- BUG-033 (Cancellation notification says "Order Updated" — CLOSED): fixed notification text, different scope
- CR-443 (Employee-Level Notification Mapping — INTAKE): notification config, this is a specific trigger
- CR-440 (User Sound Notification Toggle — INTAKE): sound config, tangential

**Verdict: DISTINCT** — no existing item covers in-app notification specifically for after-serve cancellations.

---

## Blast Radius

- Cancel handler: `DashboardPage.jsx` L1359 (needs to detect post-serve cancel)
- Notification system: socket emit or FCM trigger
- Notification UI: existing bell icon / notification panel
- Estimated scope: MEDIUM (3-4 files, ~25-35 lines)
- **BACKEND DEPENDENCY:** Backend needs to emit a socket event or FCM push for after-serve cancellations

---

## Open Questions

- **OD-496-01:** Should this be a SOCKET notification (real-time in POS) or FCM push notification (also reaches mobile)?
- **OD-496-02:** Who receives the notification — all managers, the owner only, or configurable per employee (ties to CR-443)?
- **OD-496-03:** BACKEND DEPENDENCY — Does the backend currently differentiate "after-serve cancel" from "before-serve cancel" in the API/socket event?
