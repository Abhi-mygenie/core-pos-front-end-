# MyGenie POS Frontend — PRD

## Problem Statement
Deploy and maintain the MyGenie POS frontend from GitHub repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `27-may`) on the Emergent platform.

## Architecture
- **Frontend**: React 19 + CRA + craco (port 3000, supervisor-managed)
- **External APIs**: `https://preprod.mygenie.online/` (backend), `https://presocket.mygenie.online` (socket)
- **Firebase**: Web SDK configured for `mygenie-restaurant` project
- **CRM**: `https://coupon-roi-preview.preview.emergentagent.com/api`
- **Backend**: Placeholder FastAPI server (not part of app logic)

## Environment Variables (14 total)
- REACT_APP_BACKEND_URL (Emergent preview URL)
- WDS_SOCKET_PORT=443
- ENABLE_HEALTH_CHECK=false
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- Firebase config (7 vars): API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, MEASUREMENT_ID, VAPID_KEY
- REACT_APP_CRM_BASE_URL=https://coupon-roi-preview.preview.emergentagent.com/api

## What's Been Implemented

### Deployment — 2026-05-27
- Cloned repo (branch 27-may) into /app
- Created /app/frontend/.env with all 14 supplied environment variables
- Frontend compiles and runs successfully (1 pre-existing ESLint warning only)
- Login page verified: MyGenie logo, email/password fields, Remember me, Forgot Password, LOG IN button

### POS3.1 Sprint — BUG-109/110/111 — 2026-05-27
- **BUG-109** ✅ SHIPPED — QSR takeaway/delivery customer validation parity (+5 lines CartPanel.jsx)
- **BUG-110** ✅ SHIPPED — QSR prepaid lock parity (CartPanel.jsx)
- **BUG-111 Phase 1** ✅ SHIPPED — Grand Total uses server-authoritative `total` prop on placed QSR orders
- **BUG-111 Phase 2** ✅ SHIPPED & OWNER-VERIFIED — Server-driven QSR breakdown:
  - Item Total, Discount (aggregated), Subtotal, Tax rows from server data
  - 3-state gate: paid (server breakdown) / unpaid (hidden) / unplaced (local compute)
  - No orderTransform.js changes — all values derived from existing fields
  - Live test PASSED: Discount ₹999 + Loyalty ₹244 = -₹1,243 single row
  - Files: OrderEntry.jsx (+1 line), CartPanel.jsx (+25 lines)

### ENV Update — 2026-05-27
- REACT_APP_CRM_BASE_URL changed to https://coupon-roi-preview.preview.emergentagent.com/api

## Current Sprint Status

### POS3.1 — ✅ COMPLETE
| Bug | Status | Owner Verified |
|---|---|---|
| BUG-109 | ✅ SHIPPED | Yes |
| BUG-110 | ✅ SHIPPED | Yes |
| BUG-111 P1+P2 | ✅ SHIPPED | Yes (T-DISCOUNT-CLUB passed) |

### CRM 2.0 — IN PROGRESS
| CR | Status |
|---|---|
| CR-002 Cross-Sell | CODE-COMPLETE — regression QA + handoff pending |
| CR-001 Customer Notes | SUBSUMED into CR-002 |
| CR-003 Tab | NOT STARTED |
| CR-004 Upsell | NOT STARTED (blocked on CRM engine) |
| CR-005 Wallet | NOT STARTED |
| CR-008 Integrations | NOT STARTED |

### BUG-108 Carryover
| Item | Priority | Status |
|---|---|---|
| BC-01 POS BE items[] forwarding | P0 | UNVERIFIED |
| BC-02 loyalty_idempotency_key null | P1 | OPEN |
| BC-05 Wallet (re-scoped CR-005) | P1 | DEFERRED |

## Backlog / Next Action Items
- P0: CRM 2.0 CR-002 regression QA (T-28/T-29) → Stage 8 handoff
- P0: BUG-108 BC-01 backend verification
- P1: CR-005 Wallet discovery
- P2: CR-003 Tab, CR-008 Integrations
- P2: Pre-existing ESLint warning in OrderEntry.jsx (useCallback dependency)
