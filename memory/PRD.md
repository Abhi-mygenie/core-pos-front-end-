# Core POS Front-End (MyGenie) - PRD

## Problem Statement
Deploy the Core POS Front-End from GitHub repo (branch: 9-june) into /app with proper environment configuration.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + shadcn/ui components
- **Backend**: Minimal FastAPI stub (no business logic - all APIs are external)
- **External APIs**: preprod.mygenie.online (main API), presocket.mygenie.online (WebSocket), crm.mygenie.online (CRM)
- **Firebase**: Push notifications and analytics configured

## Tech Stack
- React 19, CRACO, Tailwind CSS 3, Radix UI, Recharts, Socket.io, Firebase 12, React Router DOM 7
- FastAPI (stub only), MongoDB (not used by frontend)

## What's Been Implemented (June 9, 2026)
- ✅ Cloned repo from GitHub (branch: 9-june) into /app
- ✅ Configured all environment variables (14 env vars including Firebase, API URLs, Socket, CRM)
- ✅ Installed frontend dependencies via yarn
- ✅ Frontend compiles and serves successfully (only lint warnings)
- ✅ Login page renders correctly with MyGenie branding
- ✅ Backend FastAPI stub running on port 8001
- ✅ All tests passed (100% backend, 100% frontend)

## Environment Variables
- REACT_APP_BACKEND_URL (preview URL)
- REACT_APP_API_BASE_URL (preprod.mygenie.online)
- REACT_APP_SOCKET_URL (presocket.mygenie.online)
- REACT_APP_CRM_BASE_URL (crm.mygenie.online/api)
- Firebase config (API key, Auth domain, Project ID, Storage bucket, Messaging sender ID, App ID, Measurement ID, VAPID key)

---

## CR-017: WhatsApp Payment Link — Send Razorpay Payment Link via WhatsApp

**Status:** Gate 0 — Registered  
**Date Registered:** June 9, 2026  
**Priority:** P1  
**Owner:** Product (pending gate answers)

### Summary
Enable POS cashiers to send a Razorpay payment link to customers via WhatsApp directly from the POS interface. A single API call from the POS frontend triggers the backend to:
1. Create (or reuse) a Razorpay payment link for the order
2. Send the link to the customer via WhatsApp (or SMS as fallback)

### Backend API (Confirmed)
```
POST /api/v1/razor-pay/payment-link
Authorization: Bearer {auth_token}
Content-Type: application/json
X-localization: en
```

**Request Payload:**
| Field             | Required | Notes                                      |
|-------------------|----------|--------------------------------------------|
| `order_id`        | Yes      | Must exist in orders table                 |
| `payment_amount`  | Yes      | Amount shown in WhatsApp message           |
| `customer_phone`  | Yes      | 10-digit mobile number                     |
| `customer_name`   | Optional | Defaults to "Customer"                     |
| `restaurant_name` | Optional | Falls back to restaurant name from DB      |

**Response (Success):**
```json
// New link created
{
  "order_id": "850317",
  "payment_link": "https://rzp.io/i/xxxxx",
  "source": "razorpay"
}

// Existing pending link reused
{
  "order_id": "850317",
  "payment_link": "https://rzp.io/i/xxxxx",
  "source": "db"
}
```

**Backend Behavior:**
- **New link:** Creates Razorpay payment link → saves to `order_online_payments` → sends WhatsApp via `razoar_payment_with_url` template
- **Existing pending link:** Reuses stored link → sends SMS via `sendPaymentLinkSms()` (WhatsApp resend currently commented out on backend)

### Implementation Gates

#### Gate 0 — CR Registered ✅
- API contract documented
- Backend behavior documented
- Brainstorm complete

#### Gate 1 — UI Placement & Visibility (PENDING — needs owner answers)
Open questions:
1. **Button placement:** CollectPaymentPanel? OrderCard? Both?
2. **Order type scope:** All channels (Dine-In, TakeAway, Delivery, Room) or specific?
3. **Order state scope:** Only unpaid orders? Hide for paid/prepaid?
4. **Permission gating:** New permission key or reuse existing (`pos`, `order`)?
5. **Feature flag:** Restaurant-level toggle or always visible?
6. **Amount source:** Always full order total, or editable by cashier?
7. **Missing phone:** Block button + "Add customer first" vs inline phone prompt?

#### Gate 2 — UX Flow & States (PENDING — needs owner answers)
Open questions:
1. Button label: "Send Payment Link" / "WhatsApp Payment" / other?
2. Post-send button state: "Link Sent ✓" → "Resend Link"?
3. Toast differentiation: new link vs resend?
4. Loading state: inline spinner on button or overlay?

#### Gate 3 — Implementation
- Add API endpoint constant to `api/constants.js`
- Create `paymentLinkService.js` in `api/services/`
- Build UI component(s) per Gate 1 decisions
- Wire up with order context data
- Error handling (no phone, API failure, network timeout)

#### Gate 4 — Testing & Edge Cases
- Happy path: new link + WhatsApp sent
- Resend path: existing link reused
- Missing customer phone
- Already-paid order
- Network failure / timeout
- Permission denied scenario

### Files Expected to Change
- `frontend/src/api/constants.js` — new endpoint
- `frontend/src/api/services/paymentLinkService.js` — new service (create)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — button placement (TBD)
- `frontend/src/components/cards/OrderCard.jsx` — button placement (TBD)
- Possibly: `frontend/src/constants/featureFlags.js` — new flag

### Dependencies
- Backend API at `preprod.mygenie.online` must be live and accepting requests
- Razorpay integration configured on backend
- WhatsApp Business template `razoar_payment_with_url` approved on backend's WhatsApp provider

---

## Prioritized Backlog
- **P0:** None (deployment complete)
- **P1:** CR-017 WhatsApp Payment Link (Gate 1 pending owner input)
- **P2:** Custom domain configuration
- **P3:** Production build optimization
