# OPEN_QUESTIONS_FROM_CODE

## 1. What is the canonical frontend environment contract?
- **Why it matters:** Deployment and local setup instructions mention `REACT_APP_BACKEND_URL`, but code requires `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL` separately, plus CRM/Firebase/maps keys.
- **Code evidence:** `/app/frontend/src/api/axios.js:5-8`, `/app/frontend/src/api/socket/socketEvents.js:8-12`, `/app/frontend/src/api/crmAxios.js:8-20`, `/app/frontend/src/config/firebase.js:5-15`, `/app/frontend/src/components/order-entry/AddressFormModal.jsx:5`
- **Possible options:**
  - Keep separate envs for API/socket/CRM/Firebase/maps and document them
  - Introduce a unified config layer that derives them safely
  - Re-align code to a single backend base where appropriate and keep socket separate
- **Recommended owner for decision:** Tech / API

## 2. What is the intended source of truth for table status: socket table channel or derived order state?
- **Why it matters:** Current comments and implementation disagree, which creates ambiguity for bug fixing and future refactors.
- **Code evidence:** `/app/frontend/src/api/socket/useSocketEvents.js:4-6,125-127,143-179`
- **Possible options:**
  - Keep table channel as authoritative
  - Remove table channel and derive from order events only
  - Support both but define exact precedence and conflict rules
- **Recommended owner for decision:** Tech / API

## 3. Which local settings should remain device-local versus move to user-level or restaurant-level persistence?
- **Why it matters:** View modes, channel visibility, status visibility, order-taking, and station settings currently live in localStorage, which may not scale operationally across many devices/users.
- **Code evidence:** `/app/frontend/src/pages/StatusConfigPage.jsx:10-53,158-259,403-417`, `/app/frontend/src/pages/DashboardPage.jsx:48-63,221-301`, `/app/frontend/src/components/layout/Header.jsx:89-110`
- **Possible options:**
  - Keep all device-local
  - Move some settings to user profile scope
  - Move some settings to restaurant/admin scope and keep a smaller device-local subset
- **Recommended owner for decision:** Product / Tech / Business

## 4. Is the backend scaffold in this repo meant to be used, ignored, or replaced?
- **Why it matters:** Architecture and setup decisions differ significantly depending on whether `/app/backend` is real product infrastructure or only a template artifact.
- **Code evidence:** `/app/backend/server.py:1-89`, `/app/backend/requirements.txt:1-28`
- **Possible options:**
  - Treat backend folder as irrelevant scaffold and exclude from future architecture work
  - Evolve it into a real supporting service
  - Remove/archive it from this repo to avoid confusion
- **Recommended owner for decision:** Tech / Business

## 5. What is the official payment integration surface in the frontend?
- **Why it matters:** There is a stale `paymentService.collectPayment()` path referencing a missing constant, while active collection logic appears elsewhere.
- **Code evidence:** `/app/frontend/src/api/services/paymentService.js:12-14`, `/app/frontend/src/api/constants.js:44-46`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`, `/app/frontend/src/api/transforms/orderTransform.js:813-968`
- **Possible options:**
  - Standardize on `BILL_PAYMENT` through order-entry action layer
  - Revive a separate payment service abstraction
  - Deprecate/remove stale paymentService surface
- **Recommended owner for decision:** Tech / API

## 6. Should CRM be considered required, optional, or per-restaurant capability?
- **Why it matters:** Current behavior allows CRM config to be missing and fail soft, but order flows may still expose customer/address UX.
- **Code evidence:** `/app/frontend/src/api/crmAxios.js:18-20,55-60`, `/app/frontend/src/api/services/customerService.js`, `/app/frontend/src/components/order-entry/OrderEntry.jsx:128-169`
- **Possible options:**
  - Make CRM mandatory for all restaurants
  - Keep it optional and hide dependent UX when unconfigured
  - Support multiple CRM capability tiers per restaurant
- **Recommended owner for decision:** Product / API / Business

## 7. What is the long-term strategy for reporting logic: frontend-composed or backend-aggregated?
- **Why it matters:** Report service currently performs significant reconciliation and business-day logic client-side, which may not scale cleanly.
- **Code evidence:** `/app/frontend/src/api/services/reportService.js:60-76,88-144,194-220,389-491,505-567`
- **Possible options:**
  - Keep rich client-side composition
  - Move most report aggregation and business-day semantics to backend
  - Use hybrid approach: backend aggregates, frontend filters/presents
- **Recommended owner for decision:** Tech / API / Business

## 8. Are station fetch failures acceptable as empty-state UX, or should they be explicit operational failures?
- **Why it matters:** Kitchen/station panels are operationally important, but current service returns empty-looking data on failure.
- **Code evidence:** `/app/frontend/src/api/services/stationService.js:201-209`
- **Possible options:**
  - Keep silent fallback to empty
  - Surface explicit station-error state in UI
  - Retry automatically with telemetry and degraded-state banner
- **Recommended owner for decision:** Product / Tech

## 9. Is Firebase push intended to remain on mixed SDK versions?
- **Why it matters:** App runtime uses `firebase ^12.12.0`, while service worker imports compat CDN scripts from `10.14.1`.
- **Code evidence:** `/app/frontend/package.json:47`, `/app/frontend/public/firebase-messaging-sw.js:7-8`
- **Possible options:**
  - Keep current split if proven stable
  - Align both to a single approved Firebase version strategy
  - Replace current push implementation pattern entirely
- **Recommended owner for decision:** Tech

## 10. Which sidebar sections are real near-term modules versus placeholders?
- **Why it matters:** Navigation, permissions, and architecture planning depend on whether these sections are product roadmap, panel utilities, or dead concepts.
- **Code evidence:** `/app/frontend/src/components/layout/Sidebar.jsx:31-109,151-160,206-231`, `/app/frontend/src/App.js:31-41`
- **Possible options:**
  - Keep placeholders in nav intentionally
  - Remove placeholders until modules exist
  - Separate roadmap/experimental/admin navigation from production nav
- **Recommended owner for decision:** Product / Business / Tech

## 11. Should view-mode/order-taking/status-config settings be auditable administrative controls?
- **Why it matters:** Current settings affect cashier capabilities and workflow, but are stored locally without audit or role-governed persistence.
- **Code evidence:** `/app/frontend/src/pages/StatusConfigPage.jsx:47-53,147-157,403-417`, `/app/frontend/src/pages/DashboardPage.jsx:63,427`, `/app/frontend/src/components/layout/Header.jsx:89-110`
- **Possible options:**
  - Keep as unmanaged local terminal settings
  - Move to authenticated admin-managed settings with audit
  - Hybrid: local defaults + centrally locked overrides
- **Recommended owner for decision:** Product / Business / Tech

## 12. What is the intended lifecycle of room billing rules and print semantics?
- **Why it matters:** Room-specific financial and print behavior is spread across transforms and order flow code, making future changes high risk without a clear policy owner.
- **Code evidence:** `/app/frontend/src/api/transforms/orderTransform.js`, `/app/frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`
- **Possible options:**
  - Preserve current behavior as locked business policy
  - Redesign room billing semantics in backend/API and simplify frontend
  - Formalize a separate room-billing domain module
- **Recommended owner for decision:** Product / API / Business
