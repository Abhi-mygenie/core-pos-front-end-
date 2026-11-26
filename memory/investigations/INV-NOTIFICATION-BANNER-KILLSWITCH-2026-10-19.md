# INV-NOTIFICATION-BANNER-KILLSWITCH-2026-10-19

## Title: FCM NotificationBanner Kill Switch Investigation

**Date:** 2026-10-19
**Role:** INVESTIGATION
**Steps used:** 10/10
**Confidence:** HIGH
**Triggered by:** CR-440 (User Option to Enable/Disable Sound and Notifications)
**Owner directive:** Kill switch needed for FCM banner (NotificationBanner) ONLY — action toasts (Shadcn + Sonner) must remain untouched.

---

## 1. Summary

- **Root cause / finding:** Three distinct notification systems exist in the app. Only one (NotificationBanner) originates from Firebase. The other two (Shadcn toast, Sonner toast) are pure FE action feedback and should NOT be suppressed.
- **Classification:** ARCHITECTURE_ANALYSIS — no bug, feature implementation path
- **Confidence:** HIGH — code traced + architecture confirmed

---

## 2. Three Notification Systems Confirmed

### System 1 — FCM NotificationBanner (Firebase-driven) ← KILL SWITCH TARGET

```
Firebase FCM push
  ↓
NotificationContext.processNotification()
  → soundManager.play(resolvedSound)
  → setNotifications([notification, ...prev])   ← stores in array, NO toast() call
  ↓
NotificationBanner.jsx
  → reads notifications[] from context
  → renders full-width coloured bar at screen top
  → auto-dismisses after 6 seconds
  ↓
DashboardPage.jsx L1678:
  <NotificationBanner />   ← ONLY rendered here
```

**Key facts:**
- `processNotification` in `NotificationContext` never calls `toast()` — confirmed by code trace
- `NotificationBanner` renders ONLY in `DashboardPage.jsx:1678` — no other render site
- The banner is the only visually intrusive element that fires without staff action
- Already has a per-order mute path (BUG-453): `soundManager.isOrderMuted(orderId)` suppresses both sound + banner for a specific order

### System 2 — Shadcn action toast (pure frontend) ← DO NOT TOUCH

```
Staff action (place order, enter name, etc.)
  ↓
const { toast } = useToast();
toast({ title: "Order Failed", description: "..." })
  ↓
<Toaster /> in App.js L275
  → bottom-right corner small card
```

- ~670 call sites, mostly in `OrderEntry.jsx` (70), `ExpenseSetupPanel.jsx` (38), `InventorySetupPanel.jsx` (34)
- Examples: "Name Required", "Order Failed", "Table Occupied", "Cannot Edit"
- **Killing these removes critical error feedback for staff**

### System 3 — Sonner action toast (pure frontend) ← DO NOT TOUCH

```
Staff action (check-in, save booking, apply discount, etc.)
  ↓
import { toast } from 'sonner';
toast.success('Booking saved'); / toast.error('Check-in failed');
  ↓
<SonnerToaster position="top-right" richColors closeButton /> in App.js L276
  → top-right pill notification
```

- Used in PMS pages, CollectPaymentPanel, FrontDesk pages
- Examples: "Booking saved", "Failed to apply discount", "Room status updated"
- **Killing these removes critical success/error feedback for staff**

---

## 3. Confirmed Kill Switch Implementation — FCM Banner Only

### Option A — Conditional render in DashboardPage (simplest)

```jsx
// DashboardPage.jsx L1678
// Current:
<NotificationBanner />

// With kill switch:
{notificationsEnabled && <NotificationBanner />}
```

Where `notificationsEnabled` comes from `NotificationContext` (alongside existing `soundEnabled`).

### Option B — Source suppression in NotificationContext (more complete)

Prevents the notification from entering `notifications[]` at the source:

```js
// NotificationContext.processNotification() — after sound plays, before setNotifications:
if (!notificationsEnabled) return; // BUG-XXX: skip banner when notifications disabled
setNotifications((prev) => [notification, ...prev].slice(0, 50));
```

**Option B is recommended** — it also suppresses the bell icon unread count and the notification list, not just the banner.

### Storage — localStorage (per-device, not per-employee backend)

```js
// NotificationContext:
const [notificationsEnabled, setNotificationsEnabled] = useState(
  () => localStorage.getItem('mygenie_notifications_enabled') !== 'false'
  // default ON — matches current behaviour
);
useEffect(() => {
  localStorage.setItem('mygenie_notifications_enabled', String(notificationsEnabled));
}, [notificationsEnabled]);
```

No backend change required. No FCM token un-registration needed — we simply suppress the visual + audio rendering on the receiving device.

---

## 4. What Does NOT Change

| Element | Changed? | Reason |
|---|---|---|
| `<Toaster />` (Shadcn) | NO | Critical action feedback — validation, order failure, payment errors |
| `<SonnerToaster />` | NO | Critical action feedback — booking saved, check-in result, discount errors |
| Firebase FCM registration | NO | Token still registered — notifications still received by device |
| `soundManager` / sound | NO | Controlled separately by existing `soundEnabled` flag |
| Per-order snooze (BUG-453) | NO | Already works independently |

---

## 5. Files to Change for Kill Switch (Gate 2 fodder for CR-440)

| File | Change | ~Lines |
|---|---|---|
| `src/contexts/NotificationContext.jsx` | Add `notificationsEnabled` state + localStorage read/write + suppress banner entry when disabled | ~10 |
| `src/pages/DashboardPage.jsx` (R5) | Conditional render `{notificationsEnabled && <NotificationBanner />}` OR rely on Option B | 1 |
| Sidebar / Settings UI | Toggle button to expose `setNotificationsEnabled` to the user | ~5 (new UI element) |

**Total: ~15 lines, 2-3 files (1 R5)**

---

## 6. Locked Decisions (from owner 2026-10-19)

| Decision | Answer |
|---|---|
| OD-440-02: Granularity | **LOCKED = FCM banner only.** Sound toggle (existing sidebar button) stays separate. Action toasts (Shadcn + Sonner) untouched. |
| OD-440-04: FCM token unregistration | **LOCKED = NOT NEEDED.** Kill switch suppresses FE rendering only. Token remains registered. |
| OD-440-01: Storage | **LOCKED = localStorage (per-device).** `localStorage('mygenie_notifications_enabled')`. Default ON. No backend. |
| OD-440-03: Toggle location | **LOCKED = StatusConfigPage.** Existing settings screen — not sidebar. |

---

## 7. Investigation Status: CLOSED

All decisions locked. CR-440 Gate 1 complete. Ready for Gate 2.
Next: "CR-440 Gate 2 GO" → Impact Analysis.
