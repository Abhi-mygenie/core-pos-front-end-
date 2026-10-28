# CR-440 — User Option to Enable / Disable Sound and Notifications

**Registered:** 2026-10-18
**Type:** CR
**Priority:** P2
**Risk:** MEDIUM
**Area:** Notifications / Sound / Settings
**Sprint:** backlog
**Status:** GATE_1_INTAKE_COMPLETE
**Investigation:** `investigations/INV-NOTIFICATION-BANNER-KILLSWITCH-2026-10-19.md`

---

## Description

Staff members need the ability to individually enable or disable:
1. **Notification sounds** (buzzer/ringer on new orders) — sidebar toggle already exists, needs localStorage persistence
2. **FCM notification banner** (the coloured full-width bar at top of screen from Firebase) — kill switch needed

**Scope locked by owner (2026-10-19):** Kill switch is for the **FCM NotificationBanner only**. Shadcn and Sonner action toasts (error/success feedback for staff actions) must NOT be affected.

---

## Duplicate Check

**RELATED to BUG-454** (`INVESTIGATED_ROOT_CAUSE_UPSTREAM`) — BUG-454 investigated intermittent silent buzzer (FCM token overwrite issue, backend-blocked). CR-440 is a deliberate USER-FACING toggle, not a fix for unintended silence.

**RELATED to BUG-064** (`DEFERRED`) — Room transfer notification sound mismatch. CR-440 is broader (all notifications, not room-specific).

**DISTINCT** as a new feature CR.

---

## Locked Decisions — ALL ODs CLOSED (2026-10-19)

**OD-440-02: LOCKED = FCM banner only**
Kill switch targets ONLY `NotificationBanner` (Firebase-driven full-width coloured banner at screen top).
Shadcn `useToast()` and Sonner `toast.*` action toasts are pure FE action feedback — NOT from Firebase — untouched.

**OD-440-04: LOCKED = FCM token unregistration NOT needed**
Kill switch suppresses FE rendering only. Firebase token remains registered on the device.

**OD-440-01: LOCKED = localStorage (per-device)**
Preference stored in `localStorage('mygenie_notifications_enabled')`. No backend call. Per-device, instant. Default ON (matches current behaviour).

**OD-440-03: LOCKED = StatusConfigPage**
Toggle lives in the existing `StatusConfigPage` settings screen — same place as other restaurant/staff configuration.

---

## Open Decisions (still pending)

- **OD-440-01:** Per-device preference (localStorage) or per-employee on backend?
  *Agent recommendation: localStorage — no backend change, instant, per-device*
- **OD-440-03:** Where does the toggle live — alongside existing Sidebar "Silent Mode" button, or in StatusConfigPage?
  *Agent recommendation: Sidebar, next to the existing "Ringer On / Silent Mode" button*

---

## Implementation Path (from investigation)

Two flags needed in `NotificationContext`:
1. `soundEnabled` — already exists, controls `soundManager`
2. `notificationsEnabled` (NEW) — controls FCM banner display

**Option B (recommended):** Suppress in `NotificationContext.processNotification()` before `setNotifications()` — prevents entry into the notification list entirely, including bell unread count.

**Files to change:**
- `src/contexts/NotificationContext.jsx` — add `notificationsEnabled` state + localStorage + suppress
- `src/pages/DashboardPage.jsx` (R5) — conditional render `{notificationsEnabled && <NotificationBanner />}` (fallback)
- Sidebar / Settings UI — expose toggle button

**Files NOT to touch:**
- `App.js` Toaster hosts — action toasts untouched
- `soundManager.js` — sound controlled separately
- Any Firebase config — no FCM token change

---

## Blast Radius (updated)

- `src/contexts/NotificationContext.jsx` — ~10 lines
- `src/pages/DashboardPage.jsx` (R5) — 1 line
- Sidebar or StatusConfigPage — ~5 lines (new UI element)
- Estimated scope: SMALL (2-3 files, 1 R5)

---

## Gate Status

- Gate 1: **COMPLETE — ALL ODs LOCKED** (this document)
- Gate 2: **READY** — "CR-440 Gate 2 GO"
- Investigation: `investigations/INV-NOTIFICATION-BANNER-KILLSWITCH-2026-10-19.md` (CLOSED)
