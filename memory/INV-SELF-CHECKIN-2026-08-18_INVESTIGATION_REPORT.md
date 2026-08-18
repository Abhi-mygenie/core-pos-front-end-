# INVESTIGATION REPORT — Self Check-In + WhatsApp Confirmation
**ID:** INV-SELF-CHECKIN-2026-08-18
**Date:** 2026-08-18
**Role:** INVESTIGATION
**Steps used:** 9/10
**Account probed:** owner@18march.com (preprod)
**Artifacts:** /app/memory/evidence/INV-SELF-CHECKIN-2026/

---

## 1. Summary

| # | Feature | Root Status | Classification | Confidence |
|---|---------|-------------|----------------|:---:|
| Phase 1 | Guest self check-in → POS review & approval | **NO backend endpoint exists. NO frontend page exists.** Complete new feature. Architecture recommended below. | NEW_FEATURE | HIGH |
| Phase 2 | WhatsApp confirmation template on approval | **CRM has no template-send endpoint (all 404).** Backend already sends WhatsApp for payment links — same pattern available. | NEW_FEATURE (backend) | MEDIUM |

---

## 2. Current State — What Exists Today

### Check-In Flow (staff-only today)

```
Room card on Dashboard
  → Staff taps "Check In" button (DashboardPage.jsx:1446)
  → RoomCheckInModal.jsx opens (POS-internal, authenticated)
  → Staff fills: name, phone, email, room IDs, ID type, front/back
    ID photos, extra adults, children, booking type, dates, room
    price, advance payment, payment method, firm name/GST
  → Submit → roomService.checkIn() (multipart FormData)
  → POST /api/v1/vendoremployee/pos/user-group-check-in
  → Success → modal closes → room card updates
```

### What Does NOT Exist
| Item | Status |
|------|--------|
| Public / unauthenticated check-in page | NONE |
| Backend `self-check-in-request` endpoint | NONE — 404 probed |
| Pending check-in queue endpoint | NONE — 404 probed |
| POS approval/review UI for guest requests | NONE |
| CRM WhatsApp template-send endpoint | NONE — all variations 404/404/404 |
| Socket event for new pending check-in | NONE |

### What CAN Be Reused
| Existing asset | Reuse in |
|---|---|
| `RoomCheckInModal.jsx` field structure (15 fields) | Guest form template |
| `roomService.checkIn()` (multipart FormData) | Approval flow triggers this |
| `documentService.uploadDocument()` | Store guest ID photos to CRM |
| `printerAgentConfigService.getEmployeeList()` | Not needed here |
| `crmAxios` + `customerService.createCustomer()` | CRM customer creation on approval |
| Socket infrastructure (`useSocketEvents.js`) | Pending check-in push event |
| `AggregatorOrderPopOut.jsx` pattern | POS review drawer pattern to copy |
| `ScanOrderPopOut.jsx` pattern | Notification badge pattern to copy |
| `orderOrigin.js` already handles `kiosk` value | Order tagging |
| Backend WhatsApp via `/api/v1/razor-pay/payment-link` | Confirms backend CAN send WA |

---

## 3. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|-----------|------|--------|
| H1 | Backend has a pending/self-checkin endpoint | Probed 4 URL variants | ELIMINATED — all 404 |
| H2 | CRM has a WhatsApp template-send endpoint | Probed 6 CRM URL variants | ELIMINATED — all 404 (pos/send = 405 → exists, wrong method) |
| H3 | kiosk orderFrom is already handled in FE | grep orderTransform.js | CONFIRMED — passthrough normalised |
| H4 | WhatsApp CAN be sent from backend | CR-017 payment link uses `razoar_payment_with_url` WA template | CONFIRMED — backend infra exists |
| H5 | Existing POS check-in form can be adapted for guest use | Read field structure | CONFIRMED — subset of fields appropriate for guest |

---

## 4. Recommended Architecture — Phase 1: Self Check-In

### Overview

```
┌─────────────────────────────────────────────────────────┐
│  GUEST SIDE                                             │
│                                                         │
│  QR Code in room / lobby                                │
│       ↓                                                 │
│  Public page: /self-checkin?hotel=478&room=101          │
│  (unauthenticated React route)                          │
│                                                         │
│  Simplified form:                                       │
│   • Name, Phone, Email                                  │
│   • ID Type + front photo upload                        │
│   • Adults count, children count                        │
│   • Confirm check-in / checkout dates (pre-filled)      │
│   • Submit → "Awaiting staff confirmation"              │
└─────────────────────────────────────────────────────────┘
          ↓ POST (new public endpoint)
┌─────────────────────────────────────────────────────────┐
│  BACKEND — NEW ENDPOINTS NEEDED                         │
│                                                         │
│  POST /api/v2/public/room/self-check-in-request         │
│    → stores as "pending" record                         │
│    → emits socket event: 'new_self_checkin_request'     │
│    → returns: { request_id, status: 'pending' }         │
│                                                         │
│  GET  /api/v2/vendoremployee/pos/self-checkin-requests  │
│    → returns pending requests for this hotel            │
│                                                         │
│  POST /api/v2/vendoremployee/pos/self-checkin-requests  │
│             /{id}/approve                               │
│    → runs the actual check-in (user-group-check-in)     │
│    → creates room order, assigns room                   │
│    → fires socket: order appears on dashboard           │
│                                                         │
│  POST /api/v2/vendoremployee/pos/self-checkin-requests  │
│             /{id}/reject                                │
│    → marks request as rejected, removes from queue      │
└─────────────────────────────────────────────────────────┘
          ↓ socket 'new_self_checkin_request'
┌─────────────────────────────────────────────────────────┐
│  POS SIDE                                               │
│                                                         │
│  Dashboard header badge: "2 pending check-ins"          │
│  (same pattern as AggregatorOrderPopOut.jsx)            │
│       ↓                                                 │
│  Slide-in drawer (PendingCheckInDrawer.jsx):            │
│   • Guest card: Name, Phone, ID photo (view)            │
│   • Room assigned (from QR URL param)                   │
│   • Check-in / check-out dates                          │
│   • [Approve] → staff fills room price + advance        │
│     → triggers existing RoomCheckInModal pre-filled     │
│       OR calls approve endpoint directly                │
│   • [Reject] → removes from queue                       │
└─────────────────────────────────────────────────────────┘
```

### Guest Form — Field Split

| Field | Guest fills | Staff fills on approval |
|---|---|---|
| Name | ✓ | — |
| Phone | ✓ | — |
| Email | ✓ | — |
| ID Type + front photo | ✓ | — |
| Room number | Pre-filled from QR URL | — |
| Check-in date | Confirm (pre-filled today) | — |
| Check-out date | Select | — |
| Adults count | ✓ | — |
| Children count | ✓ | — |
| Room price | ✗ | Staff enters on approval |
| Advance payment | ✗ | Staff enters on approval |
| Payment method | ✗ | Staff enters on approval |
| Firm name / GST | Optional | — |

### Frontend Implementation Plan (4 new items)

```
1. New public route in App.js:
   <Route path="/self-checkin" element={<SelfCheckInPage />} />
   (no AuthGuard wrapper)

2. SelfCheckInPage.jsx (new, ~200 lines)
   - Reads ?hotel=<id>&room=<tableId> from URL params
   - Form: name / phone / email / ID upload / dates / guest count
   - POST to new public backend endpoint
   - Success screen: "Submitted — await confirmation"

3. PendingCheckInDrawer.jsx (new, ~150 lines)
   - Notification badge in DashboardPage header
   - Slide-in drawer listing pending requests
   - Each card: view guest photo, basic info, Approve / Reject

4. selfCheckInService.js (new, ~40 lines)
   - getPendingRequests()  → GET /api/v2/vendoremployee/pos/self-checkin-requests
   - approveRequest(id, extraData) → POST .../approve
   - rejectRequest(id) → POST .../reject

5. constants.js: +3 endpoint constants
6. socketHandlers.js: handle 'new_self_checkin_request' event
```

### Estimated Files
- **New:** `SelfCheckInPage.jsx`, `PendingCheckInDrawer.jsx`, `selfCheckInService.js`
- **Modified:** `App.js` (+1 public route), `constants.js` (+3 endpoints), `socketHandlers.js` (+1 event), `DashboardPage.jsx` (+badge + drawer mount)
- Total: 3 new + 4 modified
- Risk: **MEDIUM** (public route, new service, socket handler — no financial logic)

### QR Code Generation
- QR encodes: `https://<pos-url>/self-checkin?room=<tableId>&hotel=<restaurantId>`
- QR can be generated server-side or via a simple QR library (`qrcode` npm — already likely in deps)
- Print QR per room from Printer Settings or Restaurant Settings

---

## 5. Recommended Architecture — Phase 2: WhatsApp Confirmation

### Finding
CRM has NO WhatsApp template-send endpoint (`/pos/send` → HTTP 405 method not allowed — endpoint path exists but rejects the method).

Backend DOES send WhatsApp today via `razoar_payment_with_url` template (CR-017, `paymentLinkService.js`). This confirms the backend has WhatsApp infrastructure.

### Two Options

#### Option A — Backend endpoint (recommended, matches existing pattern)
```
After POS staff approves check-in:
  → POS calls POST /api/v1/vendoremployee/room/send-checkin-confirmation
    Payload: { order_id, phone, room_no, checkin_date, checkout_date, guest_name }
  → Backend sends WhatsApp using hotel's registered template
    e.g. "Welcome [name]! Your check-in for Room [X] is confirmed.
         Check-in: [date]. Check-out: [date]. Enjoy your stay! — [Hotel Name]"
  → Returns: { status: "sent" | "queued" }

Pattern: identical to paymentLinkService.sendPaymentLink()
No CRM change needed.
```

#### Option B — CRM endpoint (future, more flexible)
```
After approval:
  → POS calls POST /crm/pos/send-whatsapp-template
    Payload: { customer_id, template_name, variables: { room_no, dates } }
  → CRM fires template via WhatsApp Business API
  → Returns: { message_id, status }

Requires: CRM to implement this endpoint first.
Current state: /pos/send exists as a path (405) → backend team must implement.
```

**Recommendation: Option A for Phase 2** — uses proven existing pattern, no CRM dependency, fastest to ship.

### Template Content (suggested)
```
Template name: room_checkin_confirmation
Content: "Hello {guest_name}! Your check-in at {hotel_name} is confirmed.
         Room: {room_no} | Check-in: {checkin_date} | Check-out: {checkout_date}
         Welcome! 🏨"
```

### Frontend Change for Phase 2 (minimal)
After `approveRequest()` succeeds in `selfCheckInService.js`:
```js
// After approval
await sendCheckinConfirmation({ orderId, phone, roomNo, checkinDate, checkoutDate });
```
Add 1 function in `selfCheckInService.js`, 1 endpoint in `constants.js`. Everything else backend.

---

## 6. Data Flow Summary

```
Phase 1 — Self Check-In:

Guest → /self-checkin?room=101 (React public route, no login)
         ↓
     [Name, Phone, Email, ID Photo, Dates, Guest Count]
         ↓
     POST /api/v2/public/room/self-check-in-request   ← NEW backend
         ↓
     Backend stores pending + emits socket
         ↓
     POS Dashboard badge "1 pending check-in"
         ↓
     Staff clicks → PendingCheckInDrawer
     Staff reviews photos, info
         ↓ [Approve]
     POST /api/v2/vendoremployee/pos/self-checkin-requests/{id}/approve
         ↓
     Backend: create room order, assign room, normal check-in flow
         ↓
     Room card appears on Dashboard (existing socket flow)

Phase 2 — WhatsApp Confirmation:

After approve:
     POST /api/v1/vendoremployee/room/send-checkin-confirmation  ← NEW backend
         ↓
     Backend: send WhatsApp via existing template infra
         ↓
     Guest phone: "Welcome! Room 101 confirmed. Check-in: Aug 18. Check-out: Aug 20."
```

---

## 7. Backend Brief Required

### BACKEND_BRIEF — Self Check-In Endpoints (Phase 1)
```
5 new endpoints needed:

1. POST /api/v2/public/room/self-check-in-request
   Auth: NONE (public)
   Body (multipart): name, phone, email, id_type, front_image_file,
                     total_adult, total_children, room_id, checkin_date,
                     checkout_date, hotel_id (from URL param)
   Response: { request_id, status: "pending" }
   Side-effect: emit socket event 'new_self_checkin_request' to hotel

2. GET /api/v2/vendoremployee/pos/self-checkin-requests?status=pending
   Auth: Bearer token (staff)
   Response: [{ id, guest_name, phone, email, id_type, front_image_url,
                room_id, checkin_date, checkout_date, total_adult,
                total_children, created_at }]

3. POST /api/v2/vendoremployee/pos/self-checkin-requests/{id}/approve
   Auth: Bearer token (staff)
   Body: { room_price, advance_payment, payment_method, notes? }
   Side-effect: run existing check-in logic → create room order
   Response: { order_id, status: "checked_in" }

4. POST /api/v2/vendoremployee/pos/self-checkin-requests/{id}/reject
   Auth: Bearer token (staff)
   Body: { reason? }
   Response: { status: "rejected" }

5. Socket event:
   Event name: 'new_self_checkin_request'
   Payload: { request_id, guest_name, room_id, created_at }
   Emitted to: hotel's socket room on new pending request
```

### BACKEND_BRIEF — WhatsApp Confirmation (Phase 2)
```
1. POST /api/v1/vendoremployee/room/send-checkin-confirmation
   Auth: Bearer token (staff)
   Body: { order_id, phone, guest_name, room_no, checkin_date, checkout_date }
   Side-effect: send WhatsApp message using hotel's registered template
   Response: { status: "sent" | "queued" | "failed", message_id? }
   Pattern: identical to /api/v1/razor-pay/payment-link (WhatsApp infrastructure exists)

   OR (if CRM approach):
   CRM to implement: POST /pos/send-whatsapp-template
   (endpoint /pos/send returns 405 — path exists, implement POST handler)
   Body: { customer_id, template_name, variables: {} }
```

---

## 8. Owner Decisions Needed

| # | Question | Impact |
|---|----------|--------|
| OQ-1 | Should the guest page be a route inside the existing POS React app (same URL) or a completely separate lightweight page? | Architecture choice |
| OQ-2 | When staff approves, should they see a pre-filled `RoomCheckInModal` to add room price/advance, OR should the approval be done with just a simple price input? | UX scope |
| OQ-3 | Which fields should the guest fill vs. staff fill? (Suggested split above — confirm) | Form scope |
| OQ-4 | Should rejected check-in requests notify the guest (e.g., "Your check-in was declined, please visit reception")? | Phase 1 scope |
| OQ-5 | For Phase 2 WhatsApp — should the template fire automatically on approval, or should staff click a button to send it? | Phase 2 UX |
| OQ-6 | Which WhatsApp template name/ID should be used? (Backend team needs to register it if it doesn't exist) | Phase 2 backend |

---

## 9. Recommendations

| Item | Recommendation | Why |
|---|---|---|
| Guest page placement | Route inside existing React app (`/self-checkin`) | Reuses components (FileField, PhoneInput), no separate deployment |
| Review UI placement | Header notification badge + slide-in drawer | Matches existing aggregator pattern (`AggregatorOrderPopOut`) |
| Approval flow | Simple price input on approve (not full modal) | Faster for staff; guest already provided all guest details |
| Phase 2 WhatsApp | Option A — backend endpoint (not CRM) | CRM has no template-send endpoint; backend already sends WA (CR-017 proven) |
| Priority | Phase 1 first, Phase 2 after backend ships check-in endpoints | Cannot do Phase 2 without Phase 1 |
| FE risk | MEDIUM — new public route, new socket event, no financial logic | Safe to implement with full Gate 2-3 |

---

## 10. Next Steps

```
Root cause: FEATURE_NOT_BUILT (backend + frontend both)
Confidence: HIGH (Phase 1 architecture) / MEDIUM (Phase 2 — CRM endpoint unknown)
Steps used: 9/10

Recommended path:
  1. Register as CR (Phase 1) + CR (Phase 2 — mark backend-blocked until endpoint confirmed)
  2. Gate 2: Impact Analysis — confirm OQ-1 through OQ-6 with owner
  3. Gate 3: Implementation Plan
  4. Gate 4: Owner GO
  5. Backend brief delivered to backend team (above)

Planning skip: NO — new feature, multi-file, new route, socket changes
Full Gate 2-3 required.

Retroactive candidates: None (clean new feature)
```

---

*Saved: /app/memory/evidence/INV-SELF-CHECKIN-2026/*
