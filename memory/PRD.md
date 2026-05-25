# PRD — MyGenie POS Frontend Deployment

## Original Problem Statement
Deploy the frontend project from Git repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `26-may`) into the Emergent environment.

## Architecture
- **Frontend**: React 19.0.0 + CRACO v7.1.0 (port 3000)
- **Backend**: FastAPI (port 8001) — basic template, not the primary service
- **Database**: MongoDB (Emergent-managed)
- **External Services**: Firebase (auth/notifications), Socket.IO (real-time), CRM API (preprod)

## What's Been Implemented (2026-05-25)
- Cloned repo from `26-may` branch
- Copied all frontend source files, memory/handover docs, backend files
- Configured `.env` with all 14 environment variables (Firebase, Socket, CRM, etc.)
- Installed dependencies via `yarn install`
- Frontend compiles and runs successfully — Login page renders
- Deployment health check PASSED

### BUG-108 Coupon V1B Step 2 Fixes (2026-05-25, same day)
- **Fix A:** Dropdown closes immediately on row click (was staying open during async validate)
- **Fix B:** Debounce race guard — `!couponLoading` prevents auto-apply from overriding manual click
- **Fix C:** Reactive `displayedCoupons` useMemo — non-stackable coupons instantly hidden when loyalty toggled ON (was stale cache)
- Handover: `POS3_0_BUG_108_COUPON_V1B_STEP2_DROPDOWN_AND_STALE_CACHE_FIX_REPORT_2026_05_25.md`

### V1 Closure — Step 4 (2026-05-25)
- Removed `BUG108_FLAGS.couponLive` constant from `BUG108_FLAGS.js`
- Removed `BUG108_COPY.couponDisabledHelper` ("Coming soon" path)
- Removed all `couponLive` ternaries from `orderTransform.js` (Flows 3/4/Print — now unconditional)
- Removed all `couponLive` guards from `CollectPaymentPanel.jsx`
- Coupon module now gated only by `restaurantSettings.isCoupon` (backend profile flag)

## Environment Variables Configured
| Variable | Status |
|----------|--------|
| REACT_APP_BACKEND_URL | Set to Emergent preview URL |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_* (7 vars) | All configured |
| REACT_APP_CRM_BASE_URL | https://crm-deploy-may.preview.emergentagent.com/api |

## Prioritized Backlog
- P0: Frontend is deployed and running — DONE
- P1: Login/auth flow depends on external backend (preprod.mygenie.online)
- P2: Socket.IO real-time features depend on presocket.mygenie.online
- P2: CRM integration depends on crm-deploy-may.preview.emergentagent.com

## Next Tasks
- V2: implement `posCartItem` mapper + `categoryId` in orderItem + items[] (unblocked — POS BE + CRM confirmed items[] mapping working)
- V3-B+C: BOGO/BXG/Nth UI + 12 error codes + benefit_items display (blocked on V2)
