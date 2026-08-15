# Security Audit Report — MyGenie POS Frontend

**Date:** 2026-07-XX (Pre-Production)  
**Branch:** `main` (commit `0515186`)  
**Scope:** Full React frontend security audit  
**Auditor:** Pre-Production Security Audit Agent  
**Code Changes Made:** NONE

---

## Executive Summary

The MyGenie POS frontend is a React 19 SPA handling restaurant order management, payments, room bookings, and reporting. This audit identified **3 Critical**, **5 High**, **8 Medium**, and **4 Low** severity issues.

### Production Readiness Verdict: **🚫 BLOCKED**

Production deployment MUST NOT proceed until Critical issues are resolved and High issues are addressed or explicitly risk-accepted by stakeholders.

---

## Critical Blockers (3)

| # | Finding ID | Title |
|---|---|---|
| 1 | SEC-001 | Test/Preprod credentials committed to repository |
| 2 | SEC-002 | CRM API keys baked into client-side JavaScript bundle |
| 3 | SEC-003 | Socket connection has NO authentication |

---

## Findings Summary

| Severity | Count | Categories |
|---|---|---|
| Critical | 3 | Secrets exposure, Socket auth, Credential leakage |
| High | 5 | Payment manipulation, CSRF, .env in git history, Production logging, Frontend-only authorization |
| Medium | 8 | Token storage, Debug facilities, Hardcoded coupons, Firebase SW params, Input validation, Permission client-side only, Source maps, Dependency risks |
| Low | 4 | No token expiry, No CSP headers, Console noise, Logout incomplete cleanup |

---

## Security Surface Map

### Auth/Session Flow
- Login: Email/password → `POST /api/v1/auth/vendoremployee/login` → JWT token
- Token stored in `localStorage.auth_token`
- Token attached via Axios interceptor (`Authorization: Bearer <token>`)
- 401 response → clear token → redirect to `/`
- Route guard: `ProtectedRoute` checks `isAuthenticated` (token existence)
- No token expiry/refresh mechanism visible
- Permissions stored in React state (memory only), checked client-side

### API Service Layer
- Main API: Axios instance → `REACT_APP_API_BASE_URL`
- CRM API: Separate Axios instance → `REACT_APP_CRM_BASE_URL` with `X-API-Key` header
- All state-changing endpoints use Bearer token
- No CSRF token mechanism
- Payment amounts, discounts, service charges computed client-side and sent to backend

### Socket Connection/Events
- URL: `REACT_APP_SOCKET_URL`
- **NO authentication token sent on connection**
- Channel names: `new_order_{restaurantId}`, `update_table_{restaurantId}`, `order-engage_{restaurantId}`
- Channel subscription driven by `restaurant.id` from profile API
- Events trusted without cross-validation of `restaurantId` in payload

### Payment/Billing Flow
- `CollectPaymentPanel` computes all financial values client-side:
  - Item total, discounts, service charge, GST, tip, round-off, final total
- `collectBillExisting` sends these as API payload:
  - `payment_amount`, `grand_amount`, `gst_tax`, `service_tax`, `discount_value`, `tip_amount`
- Backend verification of these amounts is NOT visible from frontend code

### Report Flows
- Reports call various endpoints with `search_date` parameter
- Business day filtering done client-side
- Report data includes order amounts, customer names, payment methods
- Diagnostic console logs in production code leak order details

### Room Flows
- Room check-in sends multipart/form-data with guest details, ID images, payment info
- Room price, advance payment, balance computed client-side
- `transferToRoom` sends full financial payload client-side

### LocalStorage Usage
- `auth_token` — JWT
- `remember_me` — boolean flag
- `user_email` — email when remember-me active
- `SOCKET_DEBUG` — debug toggle
- Station config, layout preferences (non-sensitive)

---

## Detailed Findings

### SEC-001 — CRITICAL: Test/Preprod Credentials Committed to Repository

**Affected Files:**
- `/app/memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md` (lines 14-16)
- `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` (line 25)
- `/app/memory/handover/REPORTS_BACKEND_NOTE_2026-05-01.md` (line 182)
- `/app/memory/change_requests/qa_reports/CR_001_QA_REPORT.md`
- `/app/memory/change_requests/qa_handover/QA_HANDOVER_INDEX.md`
- `/app/archived/ROOM_CHECKIN_UPDATE_ORDER_FIX.md`
- Multiple other files in `memory/` and `archived/`

**Evidence:**
```
owner@welcomeresort.com / Qplazm@10
owner@18march.com / Qplazm@10
owner@mantri.com / Qplazm#10
```

**Exploit Scenario:** Anyone with access to the GitHub repository (or any fork/clone) can use these credentials to log into the preprod system and:
- View all restaurant data (orders, customers, revenue)
- Create/modify orders
- Access room booking data with guest personal information
- Potentially escalate to production if credentials are shared

**Business Impact:** Full data access to partner restaurants' order history, customer data, revenue reports, and room guest information.

**Recommended Fix:**
1. IMMEDIATELY rotate all exposed passwords
2. Remove credentials from git history (use `git filter-branch` or BFG Repo Cleaner)
3. Never commit credentials to code repositories — use vault/secrets management
4. Add pre-commit hooks to detect credential patterns

**Fix Owner:** Security + DevOps + Product
**Blocks Production:** YES — credentials in public/shared repository is an active vulnerability

---

### SEC-002 — CRITICAL: CRM API Keys Baked into Client-Side Bundle

**Affected Files:**
- `/app/frontend/src/api/crmAxios.js` (lines 8-16)

**Evidence:**
```javascript
const CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL;
let CRM_API_KEYS = {};
try {
  CRM_API_KEYS = JSON.parse(process.env.REACT_APP_CRM_API_KEYS || '{}');
} catch (e) { ... }
```

All `REACT_APP_*` environment variables are embedded into the compiled JavaScript bundle at build time (CRA behavior). This means:
- The CRM API keys for ALL restaurants are visible in the browser DevTools / bundle source
- Any user can extract keys and directly call the CRM API
- Keys are a JSON map `{ restaurantId: apiKey }` — ALL restaurants' keys in one bundle

**Exploit Scenario:** A waiter or any authenticated user (or anyone who can access the deployed JS bundle) extracts CRM API keys and:
- Queries customer data for ANY restaurant in the map
- Creates/modifies customer records across restaurants
- Performs address lookups across all restaurants

**Business Impact:** Cross-restaurant customer data breach, GDPR/privacy violation, unauthorized customer manipulation.

**Recommended Fix:**
1. Move CRM API calls to a backend proxy layer
2. Backend resolves the correct API key server-side based on the authenticated user's restaurant
3. Frontend calls the backend proxy, never touches CRM keys directly
4. Alternatively: use short-lived tokens issued per session

**Fix Owner:** Backend + Frontend (architectural change)
**Blocks Production:** YES — this is a cross-tenant data access vulnerability

---

### SEC-003 — CRITICAL: Socket Connection Has No Authentication

**Affected Files:**
- `/app/frontend/src/api/socket/socketService.js` (lines 43-66)
- `/app/frontend/src/api/socket/socketEvents.js` (lines 7-18)

**Evidence:**
```javascript
// Socket.IO connection — NO auth token passed
this.socket = io(SOCKET_CONFIG.URL, connectionOptions);
// connectionOptions only has reconnection, timeout, transports
// NO auth: { token }, NO query: { token }
```

**Exploit Scenario:**
1. Attacker discovers socket URL (was in git history, or from bundle)
2. Connects to socket without any authentication
3. Subscribes to `new_order_{restaurantId}` for any guessable restaurant ID
4. Receives real-time order data including: customer names, order amounts, table assignments, payment statuses
5. Could potentially emit events to corrupt other clients' UI state (depending on server-side validation)

**Business Impact:** Real-time unauthorized surveillance of any restaurant's order activity. If server doesn't validate emits, could corrupt live dashboard state for all connected terminals.

**Recommended Fix:**
1. Pass JWT token as socket handshake auth: `io(URL, { auth: { token } })`
2. Server must validate token on connection and reject unauthorized connections
3. Server must validate restaurant ID matches the authenticated user's restaurant
4. Consider namespace/room-based isolation on the server

**Fix Owner:** Backend (socket server) + Frontend
**Blocks Production:** YES — real-time data of all restaurants is accessible without auth

---

### SEC-004 — HIGH: Frontend Controls Payment Amounts Sent to Backend

**Affected Files:**
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 468-519)
- `/app/frontend/src/api/transforms/orderTransform.js` (lines 885-1040)

**Evidence:**
```javascript
// Payment payload entirely computed client-side:
const paymentData = {
  method: paymentMethod,
  finalTotal: effectiveTotal, // client-computed
  sgst, cgst,                 // client-computed
  tip,                        // client-entered
  serviceCharge,              // client-toggled
  discounts: { manual, preset, total, ... }, // client-set
};

// Sent to API as-is:
payload.payment_amount = finalTotal || 0;
payload.grand_amount = finalTotal || 0;
payload.gst_tax = gstTax;
payload.discount_value = discounts.total || 0;
```

**Exploit Scenario:** User modifies the JavaScript or intercepts the API call:
- Sets `payment_amount` to 0 while order has items worth ₹5000
- Sets `discount_value` to full order amount (100% unauthorized discount)
- Sets `tip_amount` to negative value
- Modifies `service_tax` to 0 when it should be charged

**Business Impact:** Direct financial loss — orders marked as paid with zero or manipulated amounts.

**Recommended Fix:**
- Backend MUST recalculate all financial totals server-side based on order items, restaurant settings, and applied discounts
- Frontend-sent amounts should be treated as "display suggestions" only
- Backend should reject payments where `payment_amount` doesn't match server-calculated total (within rounding tolerance)

**Fix Owner:** Backend (validation) — Frontend changes optional
**Needs Backend Confirmation:** Whether backend already validates these amounts
**Blocks Production:** Conditional — if backend validates, this is informational only

---

### SEC-005 — HIGH: No CSRF Protection for State-Changing Operations

**Affected Files:**
- `/app/frontend/src/api/axios.js` (entire file)
- All service files making POST/PUT/DELETE calls

**Evidence:** The Axios instance uses only Bearer token authentication. No CSRF token is:
- Fetched from server
- Attached to state-changing requests
- Validated via custom headers or double-submit pattern

**Exploit Scenario:** If a user is logged in and visits a malicious site, that site could:
- Craft a form that auto-submits to the API endpoint
- The browser attaches cookies (if any session cookies exist)
- API processes the request as the authenticated user

**Mitigation Note:** Since auth is Bearer-token-only (localStorage, not cookies), traditional CSRF via cookie-based session is NOT directly exploitable. However, if the API ever adds cookie-based auth or if the Bearer token is leaked via XSS, CSRF becomes a vector.

**Business Impact:** Low immediate risk due to Bearer-only auth, but defense-in-depth is missing.

**Recommended Fix:**
- Add `SameSite` cookie policy if any cookies are used
- Consider adding custom header requirement (`X-Requested-With`) that prevents simple CORS requests
- Maintain Bearer-token-only auth pattern (current mitigation)

**Fix Owner:** Backend + Deployment
**Blocks Production:** No (mitigated by Bearer-only auth), but should be addressed

---

### SEC-006 — HIGH: .env File With Secrets Committed to Git History

**Affected Files:** Git history — multiple branches contain `frontend/.env`

**Evidence:**
```
# From git show 0220dc6:frontend/.env
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
REACT_APP_FIREBASE_API_KEY=AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY
REACT_APP_FIREBASE_VAPID_KEY=BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG...
```

**Note:** Firebase client-side keys are considered semi-public by Google's design, but:
- VAPID key exposure enables anyone to send push notifications on behalf of the app
- Socket URL reveals infrastructure
- Combined with SEC-003, an attacker has everything needed to connect

**Business Impact:** Infrastructure discovery, potential push notification abuse, enables SEC-003 exploitation.

**Recommended Fix:**
1. Purge `.env` from git history using BFG Repo Cleaner
2. Rotate VAPID key if possible
3. Ensure `.env` is in `.gitignore` (root gitignore has it but enforcement is weak — multiple duplicate entries suggest automation issues)

**Fix Owner:** DevOps + Security
**Blocks Production:** No (already removed from HEAD), but git history purge recommended

---

### SEC-007 — HIGH: Extensive Diagnostic Logging in Production Code

**Affected Files:**
- `/app/frontend/src/api/services/reportService.js` (lines 946-1048) — `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[G5 DIAG]`
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (line 61)
- `/app/frontend/src/api/services/orderService.js` (lines 114, 148)
- 263+ total console statements across the codebase

**Evidence:**
```javascript
// reportService.js line 946 — ALWAYS executes (not dev-only gated):
console.log('[CR-001 DIAG] getOrderLogsReport', {
  requestDate, bdStart, bdEnd,
  apiOrdersRaw: orders.length,
  sampleOriginal: orders[0] ? {
    created_at, order_in, payment_method, f_order_status,
  } : null,
});

// line 973 — Hardcoded WATCH_ORDER_IDS:
const WATCH_ORDER_IDS = [
  '002913', '002912', ... // Real production order IDs
];
```

**Exploit Scenario:** Any user opening browser DevTools sees:
- Full order metadata
- Payment methods
- Restaurant IDs
- Order creation timestamps
- Raw API response structures (aids reverse engineering)

**Business Impact:** Information disclosure, aids attacker reconnaissance, reveals business data patterns to any user.

**Recommended Fix:**
1. Remove ALL diagnostic `console.log` statements not gated by `NODE_ENV === 'development'`
2. Remove hardcoded `WATCH_ORDER_IDS`
3. Remove `[CollectPaymentPanel] Payment Debug` log
4. Remove `[SplitOrder] payload` and `[PrintOrder] payload` logs from orderService
5. Gate remaining logs behind `NODE_ENV` check

**Fix Owner:** Frontend
**Blocks Production:** Conditional — does not break functionality but leaks sensitive data

---

### SEC-008 — HIGH: Frontend-Only Permission/Authorization Checks

**Affected Files:**
- `/app/frontend/src/contexts/AuthContext.jsx` (lines 48-60)
- `/app/frontend/src/components/guards/ProtectedRoute.jsx`

**Evidence:**
```javascript
// Permissions are stored in React state only:
const hasPermission = useCallback((permission) => {
  return permissions.includes(permission);
}, [permissions]);
```

There is NO evidence of:
- Backend endpoint-level permission checks for specific operations
- Role-based access control beyond `role_name: 'Manager'|'Waiter'` parameter
- Server-side prevention of a waiter performing owner-only operations

**Exploit Scenario:** A waiter user can:
- Modify localStorage/React state to gain "owner" permissions
- Directly call API endpoints that should be restricted (e.g., `make-order-unpaid`, `change-order-payment-method`)
- Access reports URLs directly (no server-side report access control visible)

**Business Impact:** Privilege escalation — unauthorized financial operations by lower-privilege users.

**Recommended Fix:**
- Backend MUST enforce role-based access on EVERY sensitive endpoint
- `make-order-unpaid`, `change-order-payment-method` should require owner/manager role server-side
- Report endpoints should validate role permissions

**Fix Owner:** Backend
**Needs Backend Confirmation:** Whether backend already enforces role-based access per endpoint

---

### SEC-009 — MEDIUM: Auth Token Stored in localStorage (XSS Vulnerable)

**Affected Files:**
- `/app/frontend/src/api/services/authService.js` (line 20)
- `/app/frontend/src/api/axios.js` (line 23)

**Evidence:**
```javascript
localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
// ...
const token = localStorage.getItem('auth_token');
```

**Risk:** localStorage is accessible to any JavaScript on the page. If XSS is achieved (via 3rd party library, injected content, or future vulnerability), the token can be exfiltrated.

**Mitigating Factors:**
- No `dangerouslySetInnerHTML` usage found
- No user-controlled HTML rendering
- Input sanitization appears adequate for current codebase

**Recommended Fix:**
- Consider httpOnly cookie-based token storage for production
- Alternatively, maintain current approach but ensure XSS prevention is robust
- Add Content-Security-Policy headers

**Fix Owner:** Backend + Deployment
**Blocks Production:** No (industry-standard SPA pattern, XSS vectors not found)

---

### SEC-010 — MEDIUM: Debug Mode Accessible via localStorage

**Affected Files:**
- `/app/frontend/src/api/socket/socketService.js` (line 31, 334)

**Evidence:**
```javascript
this.debugMode = process.env.NODE_ENV === 'development' || localStorage.getItem('SOCKET_DEBUG') === 'true';
```

**Risk:** Any user can set `localStorage.SOCKET_DEBUG = 'true'` and see detailed socket event logs including order data, restaurant IDs, and event payloads.

**Recommended Fix:**
- Remove the `localStorage.getItem('SOCKET_DEBUG')` fallback for production builds
- Only allow debug mode in development

**Fix Owner:** Frontend
**Blocks Production:** No

---

### SEC-011 — MEDIUM: Hardcoded Mock Coupon Data in Production Code

**Affected Files:**
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 418-421)

**Evidence:**
```javascript
const generalCoupons = [
  { code: "FLAT50", description: "₹50 off", discount: 50, minOrder: 500, type: "flat" },
  { code: "SAVE10", description: "10% off (max ₹100)", discount: 10, type: "percent", maxDiscount: 100 },
];
```

**Risk:** These appear to be hardcoded test coupons. If they work in production (backend doesn't validate coupons server-side), any user could apply "FLAT50" or "SAVE10" for unauthorized discounts.

**Needs Backend Confirmation:** Whether backend validates coupon codes or accepts whatever frontend sends.

**Recommended Fix:**
- Remove hardcoded coupons
- All coupon validation must happen server-side
- Frontend should only display coupons returned by a validated API call

**Fix Owner:** Frontend + Backend
**Blocks Production:** Conditional — depends on backend validation

---

### SEC-012 — MEDIUM: Firebase Config Passed as Service Worker URL Parameters

**Affected Files:**
- `/app/frontend/src/config/firebase.js` (lines 60-69)

**Evidence:**
```javascript
const swParams = new URLSearchParams({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  // ...
});
const registration = await navigator.serviceWorker.register(
  `/firebase-messaging-sw.js?${swParams.toString()}`
);
```

**Risk:** Firebase config appears in URL parameters which can be logged by:
- Browser history
- Server access logs
- Proxy logs
- Browser extensions

**Mitigating Factor:** Firebase client config is considered public by Google's design.

**Recommended Fix:** Low priority — consider alternative SW config injection methods if concerned about log exposure.

**Fix Owner:** Frontend
**Blocks Production:** No

---

### SEC-013 — MEDIUM: No Input Validation on Financial Fields

**Affected Files:**
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (multiple locations)
- `/app/frontend/src/api/transforms/orderTransform.js`

**Evidence:**
- Discount percentage accepts any float value (could be > 100%)
- Tip amount has no upper bound
- Delivery charge has no max limit
- Service charge can be toggled off by any user
- Room price / advance / balance are user-entered with no server-side enforcement visible

**Exploit Scenario:** User enters 9999% discount or negative values, or manipulates room balance fields.

**Recommended Fix:**
- Frontend: Add boundary validation (0-100% for discounts, non-negative for amounts)
- Backend: MUST validate all financial values server-side regardless of frontend guards

**Fix Owner:** Frontend (UX) + Backend (enforcement)
**Blocks Production:** Conditional — if backend validates, frontend is advisory only

---

### SEC-014 — MEDIUM: No Rate Limiting Visible for Sensitive Operations

**Affected Files:** All API service files

**Evidence:** No client-side rate limiting, debouncing, or retry limits on:
- Payment submission (`collectPayment`)
- Order creation (`placeOrder`)
- Payment method changes (`changeOrderPaymentMethod`)
- Make-order-unpaid calls

**Risk:** Malicious user could rapidly fire payment modifications or order status changes.

**Recommended Fix:**
- Backend MUST implement rate limiting on financial endpoints
- Frontend: Add submit-once guards (partially exists via `isProcessingPayment` flag)

**Fix Owner:** Backend + Deployment (API gateway)
**Blocks Production:** No (backend responsibility)

---

### SEC-015 — MEDIUM: `window.__SOCKET_SERVICE__` Exposed (Dev-Only Gated)

**Affected Files:**
- `/app/frontend/src/api/socket/socketService.js` (lines 360-362)

**Evidence:**
```javascript
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__SOCKET_SERVICE__ = socketService;
}
```

**Mitigating Factor:** Correctly gated behind `NODE_ENV === 'development'`. In production builds, CRA replaces this with `'production'` at compile time, so this code is dead-code-eliminated.

**Risk:** Negligible in production. But if build misconfiguration occurs, full socket service access is exposed.

**Blocks Production:** No

---

### SEC-016 — MEDIUM: Source Maps May Be Generated for Production Build

**Affected Files:**
- `/app/frontend/package.json` — uses `react-scripts` / CRACO
- No explicit `GENERATE_SOURCEMAP=false` configuration found

**Evidence:** CRA generates source maps by default. Without explicit `GENERATE_SOURCEMAP=false` in the build environment, the production bundle will include `.map` files exposing full source code.

**Recommended Fix:**
- Set `GENERATE_SOURCEMAP=false` in production build environment
- Verify deployment doesn't serve `.map` files

**Fix Owner:** Deployment + DevOps
**Needs Deployment Confirmation:** Whether source maps are disabled in production

---

### SEC-017 — LOW: No Token Expiry/Refresh Mechanism

**Affected Files:**
- `/app/frontend/src/api/services/authService.js`
- `/app/frontend/src/api/axios.js`

**Evidence:** Token is stored with no TTL check. The only "expiry" is reactive — when the server returns 401, the client clears the token. No proactive refresh or sliding window.

**Recommended Fix:**
- Implement token refresh before expiry
- Or: set appropriate short-lived tokens and handle 401 gracefully (current behavior)

**Fix Owner:** Backend + Frontend
**Blocks Production:** No (current 401 handling is functional)

---

### SEC-018 — LOW: No CSP/HSTS/X-Frame-Options Configuration in Frontend

**Affected Files:** None (deployment concern)

**Evidence:** No `meta` CSP tags in `public/index.html`. These headers must be set at the deployment/reverse-proxy layer.

**Recommended Fix:**
- Configure CSP, HSTS, X-Frame-Options at the reverse proxy / CDN level
- At minimum: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`

**Fix Owner:** Deployment / DevOps
**Needs Deployment Confirmation:** Whether these headers are configured at infrastructure level

---

### SEC-019 — LOW: Logout Does Not Invalidate Server-Side Session

**Affected Files:**
- `/app/frontend/src/contexts/AuthContext.jsx` (line 32-37)
- `/app/frontend/src/api/services/authService.js` (lines 37-42)

**Evidence:**
```javascript
const logout = useCallback(() => {
  authService.logout(); // only removes localStorage
  sessionStorage.clear();
  setToken(null);
  // NO server-side token invalidation call
});
```

**Risk:** After logout, the JWT remains valid until server-side expiry. A stolen token can be used even after user logs out.

**Recommended Fix:**
- Add server-side logout endpoint to invalidate/blacklist the token
- Or: use short-lived tokens (< 15 min) with refresh rotation

**Fix Owner:** Backend
**Blocks Production:** No (standard JWT limitation, but should be addressed)

---

### SEC-020 — LOW: Excessive Dependencies Without Lockfile Audit

**Affected Files:**
- `/app/frontend/package.json`

**Evidence:** 66+ dependencies (including `firebase`, `axios`, `socket.io-client`, `react-scripts`). No evidence of:
- Regular `yarn audit` runs
- Dependency vulnerability scanning
- Known-vulnerability policy

**Recommended Fix:**
- Run `yarn audit` before production deployment
- Add CI step for dependency vulnerability scanning
- Pin critical dependencies

**Fix Owner:** DevOps / CI pipeline
**Blocks Production:** No (but recommended pre-deployment check)

---

## Files Reviewed

### Core Security Files
- `src/api/axios.js` — HTTP client, auth interceptor
- `src/api/crmAxios.js` — CRM client, API key handling
- `src/api/constants.js` — Endpoints, storage keys
- `src/api/socket/socketService.js` — Socket connection
- `src/api/socket/socketEvents.js` — Socket config, channels
- `src/api/socket/socketHandlers.js` — Event handling
- `src/api/socket/useSocketEvents.js` — React hook for socket
- `src/api/services/authService.js` — Login/logout
- `src/api/services/paymentService.js` — Payment API
- `src/api/services/paymentMutationService.js` — Payment mutations
- `src/api/services/orderService.js` — Order operations
- `src/api/services/reportService.js` — Report queries
- `src/api/services/roomService.js` — Room operations
- `src/api/services/customerService.js` — CRM calls
- `src/api/transforms/orderTransform.js` — Payment payload construction
- `src/api/transforms/authTransform.js` — Auth data mapping
- `src/config/firebase.js` — Firebase/FCM setup
- `src/config/paymentMethods.js` — Payment method registry
- `src/contexts/AuthContext.jsx` — Auth state management
- `src/contexts/SocketContext.jsx` — Socket state
- `src/contexts/RestaurantContext.jsx` — Restaurant data
- `src/components/guards/ProtectedRoute.jsx` — Route protection
- `src/components/order-entry/CollectPaymentPanel.jsx` — Payment UI
- `src/components/reports/ExportButtons.jsx` — Print/export
- `src/App.js` — Routing

### Repository/Config Files
- `package.json` — Dependencies
- `.gitignore` (root + frontend)
- Git history for `.env` files
- `memory/` directory for credential exposure

### Baseline Docs Reviewed
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

### Handover Docs Reviewed
- `/app/memory/handover/CR_001_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/CR_003_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/CR_004_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md`
- `/app/memory/handover/REPORTS_BACKEND_NOTE_2026-05-01.md`
- `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md`

---

## Clarification Questions (Pending)

These must be answered before production go-ahead:

### Backend Confirmations Needed

1. **Payment Amount Validation (SEC-004):** Does the backend recalculate and validate `payment_amount`, `grand_amount`, `gst_tax`, `discount_value`, `service_tax`, and `tip_amount` before processing payment, or does it trust frontend-sent values?

2. **Role-Based Access Control (SEC-008):** Does the backend enforce role-based permissions on sensitive endpoints (`make-order-unpaid`, `change-order-payment-method`, `place-order`, room check-in)? Can a waiter call owner-only endpoints?

3. **Coupon Validation (SEC-011):** Does the backend validate coupon codes and discount amounts, or does it trust frontend-calculated discount values?

4. **Socket Server Auth (SEC-003):** Does the socket server validate any form of authentication on connection? Can an unauthenticated client subscribe to any restaurant's channel?

5. **Restaurant Isolation on API (SEC-004/008):** Does the backend validate that the authenticated user's restaurant matches the `restaurant_id` in requests? Can user from Restaurant A access Restaurant B's data?

### Deployment Confirmations Needed

6. **Source Maps (SEC-016):** Is `GENERATE_SOURCEMAP=false` set in the production build pipeline?

7. **Security Headers (SEC-018):** Are CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers configured at the reverse proxy / CDN level?

8. **CRM Key Deployment (SEC-002):** How are CRM API keys currently provisioned? Are they truly in the frontend bundle or managed differently in production?

9. **Socket URL (SEC-003/006):** Is the production socket URL different from preprod? Is it behind any authentication gateway?

---

## Recommended Implementation Order

1. **[IMMEDIATE]** SEC-001 — Rotate exposed credentials
2. **[IMMEDIATE]** SEC-003 — Add socket authentication (backend + frontend)
3. **[PRE-PROD]** SEC-002 — Move CRM API calls behind backend proxy
4. **[PRE-PROD]** SEC-007 — Remove production diagnostic logs
5. **[PRE-PROD]** SEC-004 — Backend payment validation confirmation
6. **[PRE-PROD]** SEC-008 — Backend role enforcement confirmation
7. **[DEPLOYMENT]** SEC-006 — Purge .env from git history
8. **[DEPLOYMENT]** SEC-016 — Disable source maps
9. **[DEPLOYMENT]** SEC-018 — Security headers
10. **[HARDENING]** SEC-009 through SEC-020 — Progressive improvements

---

## Final Go/No-Go Checklist

| # | Item | Status |
|---|---|---|
| 1 | No committed credentials in accessible code | ❌ FAIL (SEC-001) |
| 2 | No API keys in client bundle | ❌ FAIL (SEC-002) |
| 3 | Socket connections authenticated | ❌ FAIL (SEC-003) |
| 4 | Payment amounts validated server-side | ⚠️ NEEDS CONFIRMATION |
| 5 | Role-based access enforced server-side | ⚠️ NEEDS CONFIRMATION |
| 6 | Production logs sanitized | ❌ FAIL (SEC-007) |
| 7 | Source maps disabled | ⚠️ NEEDS CONFIRMATION |
| 8 | Security headers configured | ⚠️ NEEDS CONFIRMATION |
| 9 | No XSS vectors (dangerouslySetInnerHTML) | ✅ PASS |
| 10 | Token handling functional | ✅ PASS |
| 11 | Route protection implemented | ✅ PASS |
| 12 | Logout clears client state | ✅ PASS |
| 13 | No open redirects | ✅ PASS |

**VERDICT: 🚫 BLOCKED — 3 Critical + 2 High issues must be resolved before production.**
