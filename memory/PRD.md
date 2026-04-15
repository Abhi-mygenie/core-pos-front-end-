# MyGenie POS Frontend — PRD & Session Log

**Project:** MyGenie Restaurant POS Frontend
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
**Branch:** `bugs-v1-15-april-`
**Stack:** React 19, Tailwind CSS, CRACO, Socket.io, Firebase
**Backend API:** `https://preprod.mygenie.online/`
**Socket:** `https://presocket.mygenie.online`

---

## Architecture

- **Frontend-only** React SPA (no local backend)
- Connects to external preprod backend API + socket server
- Firebase for auth/notifications
- CRM integration for customer management
- Google Maps for delivery addresses

## User Personas

- **Restaurant Owner/Manager** — Full access, can cancel orders, manage settings
- **Waiter/Staff** — Place/update orders, limited permissions based on profile API
- **Cashier** — Collect payments, print bills

## Core Features

- Login/Auth (Firebase)
- Dashboard with Table View / Order View / Channel / Status grouping
- Order Entry: Place, Update, Cancel, Split Bill
- Payment: Collect Bill, Prepaid, Partial Payments
- Table Management: Shift Table, Merge Table, Transfer Food
- Socket-first architecture (v2) — real-time multi-device sync
- KOT/Bill printing
- CRM customer search
- Delivery address management

---

## Session Log — April 15, 2026

### Setup
- Cloned repo (branch `bugs-v1-15-april-`), installed dependencies, configured 16 env variables
- Frontend running on port 3000

### Changes Made

#### 1. Prepaid Place+Pay — Redirect Fix (Issue 1)
**File:** `OrderEntry.jsx`
**What:** Scenario 2 (fresh order + pay) was awaiting HTTP response and staying on screen. Now follows fire-and-forget + `waitForTableEngaged` + `onClose()` redirect pattern (same as Place Order and Collect Bill).
**Endpoint:** Uses `PLACE_ORDER` (`/api/v2/vendoremployee/order/place-order`) — NOT `PREPAID_ORDER`.

#### 2. PREPAID_ORDER Endpoint Clarification (Issue 2)
**No code change** — analysis only.
`/api/v2/vendoremployee/order/paid-prepaid-order` is exclusively for `DashboardPage.handleMarkServed` (completing existing prepaid orders). Was previously misrouted for Place+Pay in commit `0e4870a` — now corrected by Issue 1 fix.

#### 3. Sidebar Toggle Simplification
**File:** `Sidebar.jsx`
**What:** Reduced 4 confusing buttons to 2 toggle buttons:
- Button 1: Table View ↔ Order View
- Button 2: By Channel ↔ By Status

#### 4. TakeAway/Delivery Validation (BUG-234)
**Files:** `OrderEntry.jsx`, `CartPanel.jsx`
**Rules:**
- TakeAway: Customer name required
- Delivery: Customer name + phone + address all required
**Implementation:**
- Validation guard in `handlePlaceOrder` + `onPaymentComplete` with toast messages
- Place Order / Collect Bill buttons disabled when required fields missing
- Visual indicators: red border, red icon, red bg, asterisk on required fields
**Backend:** ❌ OPEN — needs server-side validation (filed as BUG-234)

#### 5. Shift Table — Rooms Excluded (BUG-235)
**File:** `ShiftTableModal.jsx`
**What:** Added `!t.isRoom` filter to exclude rooms from Shift Table modal. `getTables()` doesn't accept params — the `tablesOnly=true` comment was wrong.

### Documents Updated
- `API_DOCUMENT_V2.md` — Redirect behavior table, PREPAID_ORDER clarification, Switch Table room exclusion note
- `SOCKET_V2_FEATURE.md` — Flow 1 (Place+Pay redirect), Flow 4 (room exclusion), Flow 13 (exclusive endpoint note), Endpoints Reference table
- `BUGS.md` — Added BUG-234 (validation) and BUG-235 (shift table rooms)

---

## Open Backend Bugs (Action Required)

| Bug | Title | Priority |
|-----|-------|----------|
| BUG-204 | `order_sub_total_without_tax` returns 0 | P1 |
| BUG-212 | Addon names mismatch between APIs | P0 |
| BUG-224 | Manual Bill: `gst_tax` always 0 | P1 |
| BUG-225 | Manual Bill: `custName` sends label instead of real name | P2 |
| BUG-227 | Order-level Ready/Serve does not update item-level `food_status` | P0 |
| BUG-228 | `update-order-target` not sent when source is walk-in in merge | P0 |
| BUG-230 | `F_ORDER_STATUS` vs `F_ORDER_STATUS_API` mismatch | P2 |
| BUG-231 | Split Bill allows assigning 100% items to one person | P2 |
| BUG-232 | Prepaid: `service_tax` hardcoded 0 | P2 |
| BUG-233 | Prepaid orders have no visual indicator on dashboard | P3 |
| **BUG-234** | **No server-side validation for TakeAway/Delivery required fields** | **P1** |

## Backlog / Next Tasks

- P0: BUG-227 backend fix (item-level food_status on order-level Ready/Serve)
- P0: BUG-228 backend fix (walk-in→table merge missing update-order-target)
- P1: BUG-234 backend validation for TakeAway/Delivery required fields
- P1: Partial payments (split pay) — `partial_payments` array not yet implemented
- P2: Service tax from restaurant config (not hardcoded 0)
- P2: Prepaid visual indicator on dashboard
- P3: Scheduled orders support
