# MyGenie POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/POs-9-th-april-.git branch `10-april-gyan-`. Build and run as-is. No changes. Summarize pending work.

## Environment Configuration
```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
REACT_APP_FIREBASE_API_KEY=<in .env>
REACT_APP_FIREBASE_AUTH_DOMAIN=mygenie-restaurant.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mygenie-restaurant
REACT_APP_FIREBASE_STORAGE_BUCKET=mygenie-restaurant.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<in .env>
REACT_APP_FIREBASE_APP_ID=<in .env>
REACT_APP_FIREBASE_MEASUREMENT_ID=<in .env>
REACT_APP_FIREBASE_VAPID_KEY=<in .env>
```

## Tech Stack
- React 19 with CRACO
- Tailwind CSS
- Radix UI components
- Socket.io client
- React Router DOM 7.x
- React Hook Form + Zod
- Firebase SDK 12.x (FCM push notifications)

---

## What's Been Implemented (up to April 11, 2026)

### Core Features
1. **Login + Firebase FCM** - Login page with FCM token sent in payload, push notification support
2. **Dashboard Dual-View** - Channel View (by channel) and Status View (by status) with filter swap
3. **Order Entry** - Place, Update, Cancel (full/partial), Collect Bill, Split Bill
4. **KOT & Bill Manual Printing** - Print KOT/Bill via API with station picker for multi-station
5. **Socket-First Architecture** - New Order and Update Order use socket-first (v2 API payloads)
6. **Status Configuration Page** - Enable/disable statuses visible on dashboard
7. **Order Timeline** - Dot visualization showing Placed -> Ready -> Served with durations
8. **Header UX** - Labeled dropdowns, filter pills, compact layout
9. **Sidebar Toggles** - View (Table/Order) and Group (Channel/Status) toggles
10. **Auto Print Checkboxes** - KOT/Bill checkboxes in cart panel

### Socket-First Migration Status
| Flow | Status |
|------|--------|
| New Order | Socket-first complete (v2) |
| Update Order | Socket-first complete (v2) |
| Transfer Order | HTTP GET fallback (v1, no socket payload) |
| Transfer Food Item | HTTP GET fallback (v1, no socket payload) |
| Cancel Food Item | HTTP GET fallback (v1, no socket payload) |

---

## Pending Work (Priority Order)

### P0 - Must Fix Now

#### TASK-A: Remove ALL Local Locking (BUG-223)
- **10 locations** across 4 files with local `setTableEngaged`/`waitForTableEngaged` calls
- Files: `OrderEntry.jsx`, `socketHandlers.js`, `DashboardPage.jsx`, `TableContext.jsx`
- Principle: ALL locking must come from socket events only

#### TASK-B: Implement Flow-Specific Wait Logic
- Replace blanket `waitForTableEngaged` with correct wait per flow
- New Order (table): wait for `update-table engage`
- New Order (walk-in): no wait
- Update Order: wait for `order-engage`
- Transfer/Cancel: fire & close (no wait)

#### BUG-216 Workaround Removal
- Backend fix confirmed deployed
- Remove `free->engage` workaround in `handleUpdateTable`
- Let `free` genuinely free the table
- Also fixes BUG-221 (Merge Order source table locked)

#### BUG-210: Multi-Device Race Condition
- No pre-check if table is free before placing order
- Need `GET /api/v1/vendoremployee/all-table-list` check before place-order

#### BUG-212: Addon Names Mismatch (Backend)
- Same addon ID returns different names from Product API vs Order API
- Backend must normalize

### P1 - Important

#### FCM Phase 2
- Color mapping per notification type
- Actionable UI (Accept/Reject buttons)
- Deep linking to specific order
- Table highlighting on notification
- Buzzer loop logic

#### Backend Payload Fix for FCM
- Backend missing `webpush.data` section (no `sound` field)
- Frontend uses fragile `inferSoundFromContent()` fallback
- Backend needs to add `'data' => ['sound' => 'new_order']` in webpush payload

#### Fix `handleTableClick` Type Mismatch (GAP 4)
- String vs Number comparison prevents engaged table click detection

### P2 - Future/Backlog
- Drag-to-Resize columns
- Wire `onMergeOrder`/`onTableShift` in Channel Layout
- Clean up deprecated code (TableSection.jsx, old area-grouping)
- Implement `clear_payment` functionality
- Implement `serve` button API integration
- Station API context investigation
- Dynamic table search (blocked on data structure clarification)
- Bill collection during Preparing stage (awaiting product decision)

## Test Credentials
- Email: `owner@pav2.com`
- Password: `Qplazm@10`

## Session Log
- **Jan 2026**: Pulled `10-april-gyan-` branch, built and ran application, summarized pending work
