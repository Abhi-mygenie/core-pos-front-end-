# MyGenie POS — Architecture Bible

**Document:** ARCHITECTURE_BIBLE.md
**Purpose:** End-to-end architecture gap analysis and improvement roadmap to scale from a single-restaurant deployment to thousands of tenants.
**Audience:** Engineering leadership, backend team, frontend team, DevOps/SRE, security, product.
**Basis:** Static analysis of `/app` codebase (frontend `React 19 + CRACO`, local proxy `FastAPI :8001`, `training-backend :8002`), plus repo docs at `/app/memory/current-state/*`, `/app/memory/analysis/*`, `/app/memory/final/*`.
**Status:** Baseline v1.0 — living document. Update every sprint.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Current End-to-End Architecture](#2-current-end-to-end-architecture)
3. [How to Read the Findings](#3-how-to-read-the-findings)
4. [Security Findings](#4-security-findings)
5. [Scalability Findings](#5-scalability-findings)
6. [Reliability & Resilience Findings](#6-reliability--resilience-findings)
7. [Performance Findings](#7-performance-findings)
8. [Data Model & Persistence Findings](#8-data-model--persistence-findings)
9. [Maintainability & Code-Health Findings](#9-maintainability--code-health-findings)
10. [Deployment, Build & Release Findings](#10-deployment-build--release-findings)
11. [Observability & Monitoring Findings](#11-observability--monitoring-findings)
12. [Multi-Tenancy & Data-Isolation Findings](#12-multi-tenancy--data-isolation-findings)
13. [Compliance & Privacy Findings](#13-compliance--privacy-findings)
14. [Cross-Cutting Architectural Weaknesses](#14-cross-cutting-architectural-weaknesses)
15. [Priority Matrix & Roadmap](#15-priority-matrix--roadmap)
16. [Target Architecture for 1,000+ Tenants](#16-target-architecture-for-1000-tenants)
17. [Appendix — Evidence Index](#17-appendix--evidence-index)
18. [Capacity Analysis — How Many Tenants Before It Breaks](#18-capacity-analysis--how-many-tenants-before-it-breaks)

---

## 1. Executive Summary

MyGenie POS is a **single-tenant-styled React 19 SPA** talking to a **Laravel monolith** (`preprod.mygenie.online`), a **Socket.io server**, a **CRM service**, and **Firebase**. The application is functional at the current scale (tens of restaurants) but has **structural, security, and operational gaps** that will surface hard as it grows toward thousands of tenants.

**Top 10 risks that must be fixed before scaling past ~200 concurrent restaurants:**

| # | Risk | Category | Priority |
|---|------|----------|:---:|
| 1 | All CRM tenant API keys shipped to the browser bundle via `REACT_APP_CRM_API_KEYS` | Security | **HIGH** |
| 2 | Firebase config, Google Maps key, Firebase VAPID key exposed client-side | Security | **HIGH** |
| 3 | JWT stored in `localStorage` — XSS steals sessions permanently | Security | **HIGH** |
| 4 | Sequential 7-call bootstrap on every login → 3–8 s cold-start | Performance | **HIGH** |
| 5 | Socket channels are `${event}_${restaurantId}` on a shared server; no room isolation guarantees, no fan-out strategy | Scalability | **HIGH** |
| 6 | Two orchestration hotspots (`DashboardPage.jsx` ~1975 loc, `OrderEntry.jsx` ~2500 loc) concentrate 60 % of business logic | Maintainability | **HIGH** |
| 7 | No frontend error tracking (Sentry/Datadog), no RUM, no structured logs | Observability | **HIGH** |
| 8 | Heavy localStorage state → no cross-device sync, no audit, no server-side truth | Data model | **HIGH** |
| 9 | No CI/CD pipeline visible; deploy = manual `git clone + yarn install` | Deployment | **HIGH** |
| 10 | Local FastAPI `server.py` uses MongoDB for a "workflow queue" that writes to `/app/frontend/public/__dev/data/workflow_queue.json` — a dev artifact bundled with prod | Release hygiene | **HIGH** |

**Bottom line:** The app is a well-organised SPA on top of a traditional LAMP-style backend. To reach thousands of tenants, the roadmap must invest in **backend-for-frontend (BFF), per-tenant secret isolation, socket sharding, CDN + edge caching, observability, and a proper CI/CD + IaC pipeline**.

---

## 2. Current End-to-End Architecture

### 2.1 Component map

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                              │
│                                                                            │
│  React 19 SPA (CRACO, Tailwind, Radix, Chakra, shadcn, Framer Motion)      │
│   ├─ ErrorBoundary                                                         │
│   ├─ AppProviders (9 contexts in fixed order)                              │
│   │    Auth → Socket → Notification → Restaurant → Menu →                  │
│   │    Table → Settings → Order → Station                                  │
│   ├─ BrowserRouter                                                         │
│   │    / (Login) · /loading · /dashboard · /reports/* · /visibility/*      │
│   ├─ localStorage (auth_token, view flags, walkIn cart, station config)   │
│   └─ Firebase SW (public/firebase-messaging-sw.js, FCM compat v10)         │
└───────────────────────────────────────────────────────────────────────────┘
        │                    │                    │                     │
        ▼                    ▼                    ▼                     ▼
┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐
│ preprod.mygenie│  │ presocket.mygenie│  │ crm.mygenie.online│ │ Firebase    │
│  .online       │  │  .online         │  │                  │  │ FCM + Auth  │
│ Laravel REST   │  │ Socket.IO        │  │ Customer intel   │  │             │
│ (external)     │  │ (external)       │  │ (external)       │  │             │
└────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                     In-Emergent Deployment Only                            │
│                                                                            │
│  /app/backend/server.py         (FastAPI :8001)                            │
│    • /api/*         → local endpoints (status-checks, workflow-queue)      │
│    • /api/training/*→ proxied to :8002                                     │
│    • Depends on local MongoDB                                              │
│                                                                            │
│  /app/training-backend/server.py (FastAPI :8002)                           │
│    • Standalone training module — separate DB `mygenie_training`           │
│    • Auth via preprod `vendoremployee/profile`                             │
│                                                                            │
│  /app/frontend/public/__dev/data/*.json                                    │
│    • Dashboard + workflow queue data written by /api/workflow-queue        │
│    • ⚠ Bundled into production build unless excluded                       │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data flow — order lifecycle (happy path)

```
User (Cashier)
   │
   ▼ Login (email/pw + optional FCM token)
LoginPage → authService.login()  ── POST /auth/vendoremployee/login ─► Laravel
   │                                                                     │
   │◄─────────────── {token, role, permissions, firebase_token} ─────────┘
   │  auth_token → localStorage
   ▼
/loading → LoadingPage
   │  SEQUENTIAL fetch (not parallel):
   │   1) profile          2) categories       3) products
   │   4) tables           5) cancellation     6) popular food
   │   7) running orders   8) station data
   ▼
Contexts hydrated → /dashboard
   │
   ▼ Cashier picks a table / creates walk-in
OrderEntry.jsx (~2500 loc)  ── POST /order/place ─► Laravel
   │◄──────────── {order_id, invoice_no, …} ───────┘
   │
   ▼ Kitchen printer + station display updated
Socket.io "new_order_${restaurantId}"  ◄── presocket.mygenie.online
   │
   ▼ Order status changes broadcast on same channel
socketHandlers.js → mutates OrderContext / TableContext directly
   │
   ▼ Payment
CollectPaymentPanel.jsx (~3050 loc) ── POST /payment/collect ─► Laravel
   │
   ▼ Settle + close day
SettlementPage / DayClosurePage → report endpoints
```

### 2.3 Trust boundaries
| Boundary | Trust level | Concern |
|---|---|---|
| Browser ↔ Laravel | Bearer JWT (HTTPS) | Token in localStorage; no refresh token |
| Browser ↔ Socket.IO | Auth via query param / handshake (unverified in code) | No end-to-end verification found |
| Browser ↔ CRM | `X-API-Key` per-restaurant (JSON shipped in bundle) | **Key material in client bundle** |
| Browser ↔ Firebase | Public config + VAPID key | Standard Firebase practice, but scope must be limited |
| Local FastAPI ↔ MongoDB | No auth (`mongodb://localhost:27017`) | Fine inside a pod, but no defense-in-depth |
| Training backend ↔ Preprod profile API | Bearer JWT relayed | OK as design, but no rate limiting |

---

## 3. How to Read the Findings

Every finding uses this shape:

```
## F<Category>-<Number>  <Short title>                              [PRIORITY]
- What        : one-sentence factual description of the current state
- Evidence    : file / line / config that proves it
- Why it's a risk
- Impact at scale (>1,000 tenants)
- Recommended fix
- Effort      : S (≤1 sprint) · M (1–3 sprints) · L (>3 sprints)
- Owner (proposed)
```

**Priority definitions**

| Priority | Definition | SLA |
|---|---|---|
| **HIGH** | Ships blocker for scale-up; produces incidents, security exposure, or revenue loss under load | Fix before scaling past ~200 tenants |
| **MEDIUM** | Erodes velocity, causes intermittent user pain, or increases blast radius of future changes | Fix in the next 2 quarters |
| **LOW** | Housekeeping; improves developer experience or cleanliness | Backlog, group into cleanup sprints |

---

## 4. Security Findings

### FSEC-01  CRM API keys embedded in client bundle          [HIGH]
- **What:** `REACT_APP_CRM_API_KEYS` is a JSON object of all 15 tenants → `dp_live_*` keys, shipped inside the compiled JS bundle. Any user of any restaurant can read every other restaurant's key from DevTools.
- **Evidence:** `/app/frontend/src/api/crmAxios.js:11-16, 29-41`; `DEPLOYMENT_HANDOVER_2026-05-04.md` line 85.
- **Why it's a risk:** A tenant can call the CRM as any other tenant → cross-tenant customer data disclosure.
- **Impact at scale:** With 1,000 tenants, the bundle would carry 1,000 secrets; a single compromised viewer key breaches customer PII across the fleet.
- **Fix:** Move all CRM traffic behind a **backend-for-frontend (BFF)** that resolves the correct tenant key server-side. Rotate all leaked keys.
- **Effort:** M · **Owner:** Backend + Frontend

### FSEC-02  JWT stored in `localStorage`                    [HIGH]
- **What:** `auth_token` is persisted in `localStorage`; every XSS payload trivially exfiltrates it.
- **Evidence:** `/app/frontend/src/api/axios.js:21-27`; `/app/frontend/src/api/services/authService.js:19-29`.
- **Why it's a risk:** No httpOnly protection; token has no observable rotation. A single XSS in any dependency (recharts, framer, third-party ad script) grants long-lived account takeover.
- **Impact at scale:** One XSS in a dependency → mass compromise across every tenant that loaded that version.
- **Fix:** Move to **httpOnly, Secure, SameSite=Strict cookie**; issue short-lived (5–15 min) access tokens + refresh via BFF; add CSP (default-src 'self') and Trusted Types.
- **Effort:** M · **Owner:** Backend + Frontend

### FSEC-03  No Content Security Policy or SRI               [HIGH]
- **What:** `public/index.html` has no CSP, no `integrity=`/`crossorigin=` on external scripts.
- **Evidence:** `/app/frontend/public/index.html`.
- **Why it's a risk:** Zero mitigation against XSS or a compromised CDN.
- **Impact at scale:** A single supply-chain incident (any npm dep) turns into an org-wide breach.
- **Fix:** Add CSP header (start report-only, tighten iteratively); enable SRI for all `<script>` and `<link>` tags; enable `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **Effort:** S · **Owner:** Frontend + DevOps

### FSEC-04  Firebase & Google Maps keys in `.env` shipped client-side   [MEDIUM]
- **What:** `REACT_APP_FIREBASE_*` and `REACT_APP_GOOGLE_MAPS_KEY` are public-by-nature but currently **unrestricted** (no HTTP referrer / package restrictions verified).
- **Evidence:** `/app/frontend/.env`; `/app/frontend/src/config/firebase.js:5-27`.
- **Why it's a risk:** Unrestricted Google Maps key → billing fraud. Firebase project without domain restrictions → abuse from other origins.
- **Impact at scale:** Uncapped billing exposure; Firebase abuse; brand-domain spoofing.
- **Fix:** Restrict Maps key to production domain + iOS/Android bundle IDs; restrict Firebase to authorised domains list; monitor billing anomalies.
- **Effort:** S · **Owner:** DevOps

### FSEC-05  CORS wildcard on local proxy backend            [MEDIUM]
- **What:** `allow_origins=os.environ.get('CORS_ORIGINS', '*').split(',')` defaults to `*`; `.env` currently has `CORS_ORIGINS="*"`.
- **Evidence:** `/app/backend/server.py:122-128`; `/app/backend/.env`.
- **Why it's a risk:** Any origin can hit `/api/*` with credentials disabled by default, but the settings are not tightened per environment.
- **Impact at scale:** In production, backend endpoints should be restricted to the actual preview / production domains.
- **Fix:** Set `CORS_ORIGINS` to explicit allowlist per environment; disallow `*` in prod build validation.
- **Effort:** S · **Owner:** Backend

### FSEC-06  Backend-known misspelling `'sucess'` is a fragile protocol contract   [MEDIUM]
- **What:** Frontend must send `'sucess'` (not `'success'`) for PayLater; documented as a hard rule (R9 in Agent Prompt).
- **Evidence:** `AGENT_PROMPT_ALPHA.md` R9; `HIGH-RISK FILE TRAPS` table.
- **Why it's a risk:** Any well-meaning developer will "fix the typo" and break payments.
- **Impact at scale:** Silent payment status corruption; hard to audit.
- **Fix:** Fix backend contract (add both spellings, deprecate misspelling with dual-write for 1 release cycle, then remove).
- **Effort:** S (backend) · **Owner:** Backend team

### FSEC-07  No rate limiting on preprod login / OTP-less brute force   [HIGH]
- **What:** Login is `POST /auth/vendoremployee/login` with email+password. No CAPTCHA, no lockout logic visible.
- **Evidence:** `/app/frontend/src/api/services/authService.js`.
- **Why it's a risk:** Trivial credential stuffing at scale; leaked password lists can enumerate valid accounts.
- **Impact at scale:** Account takeovers grow linearly with tenant count; support cost balloons.
- **Fix:** Backend WAF + per-IP + per-account rate limiting; hCaptcha/Turnstile after N failures; passwordless / MFA for owners.
- **Effort:** M · **Owner:** Backend + Security

### FSEC-08  No E2E encryption of print payloads / receipts   [LOW-MEDIUM]
- **What:** Bill/print payloads flow through HTTPS but there's no application-level integrity signature.
- **Why it's a risk:** Tampered browser extensions could inject items into a print flow.
- **Impact at scale:** Rare, but a class of insider fraud opens up.
- **Fix:** Server-signed receipt payloads (HMAC) verified at printer bridge.
- **Effort:** M · **Owner:** Backend

### FSEC-09  Service Worker for Firebase FCM uses old compat SDK (10.14.1)   [LOW]
- **What:** App uses `firebase ^12.x`, SW imports compat v10 from CDN.
- **Evidence:** `SCALING_RISK_REGISTER.md §11`; `public/firebase-messaging-sw.js:7-8`.
- **Why it's a risk:** Divergent SDKs → subtle push failures; upgrade blocked by drift.
- **Fix:** Align SW with app SDK version; version pin.
- **Effort:** S · **Owner:** Frontend

### FSEC-10  Secrets committed via `.env` handover doc         [MEDIUM]
- **What:** `/app/memory/memory/memory/DEPLOYMENT_HANDOVER_2026-05-04.md` documents production-ish keys (Firebase, Maps, CRM) in plain markdown inside the repo.
- **Why it's a risk:** Any repo leak = full key disclosure. This has already happened at least once (repo is public on GitHub if unchanged).
- **Impact at scale:** Blast radius grows with fleet size.
- **Fix:** Rotate all keys documented in memory/*.md; move secrets into a vault (AWS Secrets Manager / HashiCorp Vault / Doppler); enforce pre-commit scanning (gitleaks, trufflehog).
- **Effort:** S (rotate) + M (vault) · **Owner:** DevOps + Security

---

## 5. Scalability Findings

### FSCA-01  Sequential bootstrap on every login                [HIGH]
- **What:** `LoadingPage` fires 7 API calls in strict sequence before user can act.
- **Evidence:** `CURRENT_ARCHITECTURE.md §3`; `LoadingPage.jsx:174-304`.
- **Why it's a risk:** Time-to-interactive = sum(all latencies). Any slow endpoint stalls every user.
- **Impact at scale:** With p95 backend latency 200 ms → 1.4 s just for bootstrap; under load p95 climbs to 800 ms → **5.6 s login-to-usable**. Peak lunch/dinner hours amplify this.
- **Fix:**
  1. Parallelise independent calls (`Promise.all`) — profile, categories, products, tables, cancel reasons are independent.
  2. Add server-side "bootstrap aggregation" endpoint returning all bootstrap payload in one round trip (BFF pattern).
  3. Cache-Control: `stale-while-revalidate` for menu/products at the edge.
- **Effort:** S (parallelise) + M (aggregation endpoint) · **Owner:** Frontend + Backend

### FSCA-02  Socket.IO shared server without sharding strategy   [HIGH]
- **What:** All tenants connect to the same `presocket.mygenie.online` host. Channels are `event_${restaurantId}`.
- **Evidence:** `useSocketEvents.js:129-180`.
- **Why it's a risk:** Single Node process capacity ≈ 10k–20k concurrent sockets. With avg 5 users/restaurant × 1,000 restaurants = **50k+ sockets**, plus mobile PWA/kitchen displays.
- **Impact at scale:** Connection storms, memory pressure, event fan-out amplification, single-point outage.
- **Fix:**
  - Move to **Redis pub/sub or NATS** as the message bus.
  - **Sticky-session load balance** across N Socket.IO nodes (Redis adapter).
  - Or migrate to **AWS AppSync / Ably / Pusher / Supabase Realtime** for managed scale.
  - Introduce per-tenant "namespaces" (`/tenant-<id>`) for real isolation.
- **Effort:** L · **Owner:** Backend + Infra

### FSCA-03  No CDN / edge cache for static assets              [MEDIUM]
- **What:** CRA build served from single origin; no evidence of Cloudflare / CloudFront in front.
- **Why it's a risk:** Global latency; origin overload during releases.
- **Impact at scale:** Users in geographically distant regions see slow FCP.
- **Fix:** Put CDN (Cloudflare / CloudFront) in front of static bundle; enable Brotli; set immutable cache headers on hashed asset filenames.
- **Effort:** S · **Owner:** DevOps

### FSCA-04  Client-side reporting logic will not scale to enterprise chains   [HIGH]
- **What:** `reportService.js` does business-day arithmetic, multi-endpoint merges, dedupes, and report-row generation client-side.
- **Evidence:** `SCALING_RISK_REGISTER.md §9`.
- **Why it's a risk:** A chain with 100 outlets pulling 30 days of data will download megabytes of raw orders and process them in the browser.
- **Impact at scale:** Chrome OOM on low-end tablets; UI jank; slow reports.
- **Fix:** Move aggregation to backend; return pre-computed report rows. Introduce a **read-only reporting service** (Postgres read replica + materialised views, or ClickHouse for OLAP).
- **Effort:** L · **Owner:** Backend

### FSCA-05  Monolithic Laravel backend implied — no service seams   [HIGH]
- **What:** All backend traffic hits `preprod.mygenie.online` — single origin, single database implied.
- **Why it's a risk:** A hot spot in "reports" can starve "orders". Deploying a report fix requires deploying the whole monolith.
- **Impact at scale:** Blast radius grows with feature count; feature velocity drops.
- **Fix:** Introduce module seams:
  - **auth-service** (login, permissions)
  - **catalog-service** (menu, products)
  - **orders-service** (place / update / cancel)
  - **payments-service**
  - **reports-service** (OLAP / read-replica)
  - **crm-service** (already separate)
  Keep the monolith for now, but enforce module boundaries + event-driven integration.
- **Effort:** L · **Owner:** Backend + Architecture

### FSCA-06  Firebase FCM used for realtime instead of Socket.IO where possible   [LOW]
- **What:** Notifications go over FCM; live order updates via socket. Two channels to maintain.
- **Why it's a risk:** Duplicate infra to scale, monitor, and pay for.
- **Impact at scale:** Slightly complicated ops; each channel needs SLOs.
- **Fix:** Long-term, unify around one realtime layer (managed provider) and use FCM only for actual OS-level push.
- **Effort:** M · **Owner:** Backend

### FSCA-07  No horizontal-scale story for the local `/app/backend/server.py`   [LOW]
- **What:** The local FastAPI proxy is a single process; MongoDB is local; the `workflow-queue` writes to a shared filesystem file.
- **Why it's a risk:** This service is currently dev-only, but if promoted to prod without work, it will not scale (file-based state, single writer).
- **Impact at scale:** Only if this becomes a production dependency.
- **Fix:** Keep it dev-only. If promoted, move state to a proper store (Postgres / Mongo) and remove file-based queue.
- **Effort:** M · **Owner:** Backend

---

## 6. Reliability & Resilience Findings

### FREL-01  No retry/backoff strategy on API calls              [HIGH]
- **What:** `axios.js` interceptor only translates 401 → redirect; no automatic retry with jitter for 5xx / network errors.
- **Evidence:** `/app/frontend/src/api/axios.js`.
- **Why it's a risk:** Transient network hiccups (very common on café Wi-Fi) surface as full errors to cashiers.
- **Impact at scale:** Order loss during transient failures; cashier anxiety.
- **Fix:** Add axios-retry for idempotent GETs; add explicit **idempotency-key** header for POST /order, POST /payment to make retries safe; write a client-side outbox for critical writes when offline.
- **Effort:** M · **Owner:** Frontend + Backend

### FREL-02  Soft-failure pattern hides real failures            [HIGH]
- **What:** `stationService.fetchStationData()` and parts of `customerService`, `reportService` return empty arrays / fallback objects on error instead of surfacing the failure.
- **Evidence:** `SCALING_RISK_REGISTER.md §7, §13`; `stationService.js:131,201-209`.
- **Why it's a risk:** Operators see "no data" and don't know it's a fetch failure. Silent data loss.
- **Impact at scale:** Support cost balloons; incident MTTR grows because monitors can't detect failure.
- **Fix:** Standardise a response envelope `{status: 'ok'|'empty'|'error', data, error}` across services; separate "empty" from "failed" in the UI.
- **Effort:** M · **Owner:** Frontend

### FREL-03  No offline mode / PWA offline queue                 [HIGH]
- **What:** No Service Worker beyond FCM; no offline order queue.
- **Why it's a risk:** Cafés lose internet — cashiers can't take orders → direct revenue loss.
- **Impact at scale:** Every hour of outage across the fleet = measurable revenue impact.
- **Fix:** Implement offline-first order capture: Service Worker + IndexedDB outbox + idempotent replay on reconnect.
- **Effort:** L · **Owner:** Frontend + Backend

### FREL-04  No circuit breakers between browser and external services   [MEDIUM]
- **What:** If CRM is slow, the browser waits `crmAxios timeout: 60000` (60 s implied default).
- **Evidence:** `/app/frontend/src/api/crmAxios.js`.
- **Why it's a risk:** One slow dependency locks up the entire UI thread's request queue.
- **Impact at scale:** CRM incident → whole app feels down.
- **Fix:** Set tight per-service timeouts (2–5 s), add a client-side circuit breaker (opossum-js or equivalent), gracefully degrade CRM widgets.
- **Effort:** S · **Owner:** Frontend

### FREL-05  Socket reconnect logic not fully proven              [MEDIUM]
- **What:** `SocketContext` reconnects on visibility/online events, but no evidence of exponential backoff, snapshot-catchup on reconnect, or out-of-order event handling.
- **Evidence:** `SocketContext.jsx:70-113`; `socketService.js:21-364`.
- **Why it's a risk:** After a disconnect, missed events = stale UI state until next hydration.
- **Impact at scale:** During network blips, UI drifts; kitchen displays show wrong statuses.
- **Fix:** On reconnect, refetch orders since `last_event_id`; add server-side event sequence numbers.
- **Effort:** M · **Owner:** Backend + Frontend

### FREL-06  Single point of failure: preprod is one host        [HIGH]
- **What:** All prod-ish traffic goes to one hostname; no evidence of multi-AZ, failover, or graceful-degradation plan.
- **Why it's a risk:** Any preprod outage = every restaurant down.
- **Impact at scale:** SLA obligations get harder as customer count grows.
- **Fix:** Multi-AZ deploy for backend; health checks + failover; documented DR runbook; RTO/RPO targets published.
- **Effort:** L · **Owner:** Infra

### FREL-07  No graceful shutdown / drain in local FastAPI proxy   [LOW]
- **What:** Uvicorn `--reload` is used in supervisor; only a shutdown handler that closes Mongo.
- **Evidence:** `/etc/supervisor/conf.d/*.conf`; `/app/backend/server.py:137-139`.
- **Why it's a risk:** In-flight requests dropped on restart.
- **Impact at scale:** Only if this becomes production.
- **Fix:** Remove `--reload` in prod; enable Uvicorn workers with proper drain.
- **Effort:** S · **Owner:** DevOps

---

## 7. Performance Findings

### FPRF-01  Two orchestration hotspots dominate render cost      [HIGH]
- **What:** `DashboardPage.jsx` (~1975 loc) and `OrderEntry.jsx` (~2500 loc) render huge subtrees; likely many re-renders per state change.
- **Evidence:** `SCALING_RISK_REGISTER.md §1, §2`; `HIGH-RISK FILE TRAPS`.
- **Why it's a risk:** Each context write triggers wide re-renders. On busy nights, cashiers report "sticky" UI.
- **Impact at scale:** Low-end tablets (2 GB RAM Android) become unusable during peak.
- **Fix:**
  - Split contexts into read/action pairs (or use Zustand with selector subscriptions).
  - Memoise cards with `React.memo` + stable prop references.
  - Virtualise long lists (react-virtual / TanStack Virtual).
  - Move filter logic into worker threads for heavy report screens.
- **Effort:** L · **Owner:** Frontend

### FPRF-02  Bundle size — many heavy deps                        [MEDIUM]
- **What:** `package.json` contains Chakra + Radix + Tailwind + shadcn + Framer Motion + Chart.js + Recharts + Firebase + Socket.io + Zod + lodash + libphonenumber. Multiple UI kits and multiple chart libs.
- **Why it's a risk:** Redundant dependencies inflate the bundle.
- **Impact at scale:** Slower first-load on tablets, higher bandwidth bill.
- **Fix:**
  - Pick one chart lib (Recharts OR Chart.js) — deprecate the other.
  - Consider dropping Chakra if shadcn+Radix covers the same needs.
  - Route-based code splitting + `React.lazy` for reports, settings, day closure.
  - Analyse with `source-map-explorer` and set a **CI bundle-size budget**.
- **Effort:** M · **Owner:** Frontend

### FPRF-03  No image optimisation / CDN                          [MEDIUM]
- **What:** Product images (likely served from Laravel storage) unoptimised, no responsive variants.
- **Why it's a risk:** Menu with 200 products × 300 KB image = 60 MB load.
- **Fix:** Image service (imgproxy / Cloudinary) with WebP/AVIF + responsive srcset; lazy load.
- **Effort:** M · **Owner:** Backend + Frontend

### FPRF-04  React 19 concurrent features not leveraged          [LOW]
- **What:** No `useTransition`, `useDeferredValue`, Suspense boundaries around slow lists.
- **Why it's a risk:** Missed opportunity to keep UI responsive.
- **Fix:** Wrap heavy report tables with `useDeferredValue`; Suspense for lazy routes.
- **Effort:** S · **Owner:** Frontend

### FPRF-05  Chart libraries render synchronously                 [LOW]
- **What:** Chart.js/Recharts synchronous render on main thread.
- **Fix:** Consider `<Suspense>` around charts; render skeletons; offload heavy summarisation to Web Worker.
- **Effort:** S · **Owner:** Frontend

### FPRF-06  No React DevTools Profiler baseline captured        [LOW]
- **Fix:** Record and store perf baselines (render count, TTI, LCP) per sprint in `/app/memory/perf-baselines/`.
- **Effort:** S · **Owner:** Frontend

---

## 8. Data Model & Persistence Findings

### FDAT-01  localStorage is a de-facto database                 [HIGH]
- **What:** Channel/status visibility, view mode locks, order-taking enablement, station config, `walkIn` cart, dynamic-tables flag — all in localStorage.
- **Evidence:** `CURRENT_ARCHITECTURE.md §6 (persistence)`; `SCALING_RISK_REGISTER.md §6`.
- **Why it's a risk:** No cross-device sync, no audit trail, no restore-on-loss, no per-user policy enforcement.
- **Impact at scale:** Owners setting policies on one device don't propagate; support can't reproduce state; enterprise customers can't audit changes.
- **Fix:**
  - Classify each key as **device-local**, **user-level**, or **restaurant-level**.
  - Move restaurant-level to backend `POST /settings/restaurant`.
  - Move user-level to backend `POST /settings/user`.
  - Keep only truly device-local settings client-side (e.g., last-used printer name).
- **Effort:** L · **Owner:** Backend + Frontend

### FDAT-02  Backend expects `'sucess'` misspelling as canonical status  [MEDIUM]
- **What:** Duplicate of FSEC-06 but from data-model angle: an enum has a misspelled canonical value.
- **Fix:** Migration path documented above.
- **Effort:** S · **Owner:** Backend

### FDAT-03  Two payment status fields with conflicting semantics   [HIGH]
- **What:** `payment_status` returns `null` from list endpoint; must use `fOrderStatus` for rooms.
- **Evidence:** `AGENT_PROMPT_ALPHA.md — KNOWN BACKEND QUIRKS`.
- **Why it's a risk:** Business rules split across two fields → constant source of subtle bugs.
- **Impact at scale:** Finance/settlement bugs correlate with revenue; hard to audit.
- **Fix:** Normalise on backend to a single derived `payment_state` (`unpaid / partial / paid / voided`) with a consistent enum. Migrate reports and dashboards.
- **Effort:** M · **Owner:** Backend

### FDAT-04  Socket payload has two shapes (4-element old, 6-element new)  [MEDIUM]
- **What:** `scan-new-order` socket event ships two payload formats simultaneously.
- **Evidence:** `AGENT_PROMPT_ALPHA.md — KNOWN BACKEND QUIRKS`.
- **Why it's a risk:** Every consumer must branch on payload length.
- **Fix:** Version the socket protocol (`v1`, `v2` events); deprecate v1 after 1 release.
- **Effort:** S · **Owner:** Backend

### FDAT-05  Business-day boundary computed client-side          [MEDIUM]
- **What:** `reportService.js` computes business-day windows.
- **Why it's a risk:** Client timezone drift → mismatched reports; time-zone bugs are the #1 finance-report cause of tickets.
- **Fix:** Backend authoritative business-day; expose `POST /reports/x?business_date=YYYY-MM-DD`.
- **Effort:** M · **Owner:** Backend

### FDAT-06  No event log / append-only journal for orders       [HIGH]
- **What:** Orders are mutated in place server-side; no immutable event stream visible.
- **Why it's a risk:** Reconstructing "what happened" during disputes is difficult.
- **Impact at scale:** Legal / audit compliance harder; forensic support cost high.
- **Fix:** Emit domain events (`OrderPlaced`, `OrderModified`, `PaymentCollected`) into an event store (Kafka / Postgres event table). Reports read from a projection.
- **Effort:** L · **Owner:** Backend

### FDAT-07  Menu / product model versioning                     [MEDIUM]
- **What:** No indication that menu items track version / effective-from dates.
- **Why it's a risk:** Historical bills reprinted with today's prices produce wrong totals.
- **Fix:** Track `menu_version_id` on each order line item; freeze pricing at time of order.
- **Effort:** M · **Owner:** Backend

### FDAT-08  Two MongoDB databases in local backend without formal ownership   [LOW]
- **What:** `test_database` for main + `mygenie_training` for training. Only in dev pod.
- **Fix:** Not a prod concern; keep them separate; document.
- **Effort:** S · **Owner:** Backend

---

## 9. Maintainability & Code-Health Findings

### FMNT-01  Two 2,000-loc orchestration files                   [HIGH]
- **What:** `DashboardPage.jsx` and `OrderEntry.jsx` mix UI, business, transport.
- **Evidence:** `SCALING_RISK_REGISTER.md §1, §2`; `REFACTOR_OPPORTUNITY_MAP.md §1, §2`.
- **Why it's a risk:** Regressions in revenue-critical paths; onboarding time > 2 weeks.
- **Fix:** Follow the repo's own P0 refactor plan (extract selectors → action hooks → modal orchestration).
- **Effort:** L · **Owner:** Frontend

### FMNT-02  Mixed API access — direct axios vs service layer   [MEDIUM]
- **Evidence:** `SCALING_RISK_REGISTER.md §4`; direct calls in `DashboardPage.jsx:1131-1134, 1260-1269`; `OrderEntry.jsx:626-681, 729-805, 831-850`.
- **Fix:** Ban direct `api.*` calls in components (ESLint rule `no-restricted-imports`); go through a domain-action layer.
- **Effort:** M · **Owner:** Frontend

### FMNT-03  `orderTransform.js` is a business-rule sink (~1900 loc)   [HIGH]
- **Evidence:** `SCALING_RISK_REGISTER.md §12`; `REFACTOR_OPPORTUNITY_MAP.md §7`.
- **Why it's a risk:** Financial correctness debt in one file.
- **Fix:** Split into `read/`, `write/`, `payments/`, `print/`, `room/` transforms with unit tests.
- **Effort:** L · **Owner:** Frontend

### FMNT-04  Two UI kits (Chakra + shadcn/Radix) coexist          [MEDIUM]
- **What:** `package.json` includes both; the AGENT prompt says "Tailwind + Radix + shadcn" but Chakra remains.
- **Fix:** Pick one. Migrate the other's usages over 2 sprints.
- **Effort:** M · **Owner:** Frontend

### FMNT-05  No TypeScript                                        [MEDIUM]
- **What:** All source in JS; some Zod schemas, but no compile-time typing.
- **Why it's a risk:** Refactors in 2,000-loc files without types are dangerous.
- **Fix:** Incrementally introduce TypeScript at API boundary + transform layer (start with `.d.ts` files, then convert critical files).
- **Effort:** L · **Owner:** Frontend

### FMNT-06  ESLint warnings tolerated                           [LOW]
- **What:** Multiple `react-hooks/exhaustive-deps` warnings exist per `frontend.out.log`.
- **Fix:** Zero-warning policy on PRs; migrate to `eslint --max-warnings=0` in CI.
- **Effort:** S · **Owner:** Frontend

### FMNT-07  Provider order is architecture-significant but not enforced   [LOW]
- **Evidence:** `AppProviders.jsx:13-34`; guarded only by rule R7 in Agent Prompt.
- **Fix:** Add a test that asserts provider order at boot; unit test the shape.
- **Effort:** S · **Owner:** Frontend

### FMNT-08  `firebase-messaging-sw.js` version drift             [LOW]
- Covered in FSEC-09.

### FMNT-09  Sidebar exposes routes that don't exist              [LOW]
- **Evidence:** `SCALING_RISK_REGISTER.md §14`.
- **Fix:** Feature-flag "coming soon" entries or move them to a roadmap page.
- **Effort:** S · **Owner:** Frontend + Product

### FMNT-10  Handwritten memory/*.md docs (700+ files) risk drifting from code   [MEDIUM]
- **What:** The `/app/memory/` folder is a governance system, but code-vs-doc drift is called out repeatedly.
- **Fix:** Automate doc regeneration for architecture/API maps from source (jsdoc/tsdoc + a nightly job to update `MODULE_MAP.md`).
- **Effort:** M · **Owner:** Platform / DX

---

## 10. Deployment, Build & Release Findings

### FDEP-01  No CI/CD pipeline visible                             [HIGH]
- **What:** No `.github/workflows`, `.gitlab-ci.yml`, or equivalent found; deploy is manual (`git clone + yarn install + supervisorctl restart`).
- **Evidence:** Repo root; deployment handover doc.
- **Why it's a risk:** No automated tests on PRs, no environment promotion, human error on releases.
- **Fix:** GitHub Actions or GitLab CI:
  - `install → lint → test → build → snapshot bundle size → deploy to preview`
  - `main → auto-deploy to staging; tag → prod deploy with manual approval`
- **Effort:** M · **Owner:** DevOps

### FDEP-02  `__dev/data/*.json` bundled in production build      [HIGH]
- **What:** `workflow-queue.json` and other `__dev/data/*.json` sit in `public/` — CRA copies everything in `public/` to `build/`.
- **Evidence:** `/app/backend/server.py:70-86`.
- **Why it's a risk:** Internal governance data (control-plane state) shipped to browsers of every restaurant.
- **Impact at scale:** Data leakage, cache pollution, bundle bloat.
- **Fix:**
  - Move `__dev/` outside `public/`.
  - Guard build with a check that fails if `__dev/` exists.
  - Serve dashboard data via authenticated API only.
- **Effort:** S · **Owner:** DevOps + Frontend

### FDEP-03  No environment segregation (dev / stage / prod)      [HIGH]
- **What:** Only one preprod exists; frontend `.env` points to same host for all builds.
- **Fix:** Formal envs — `dev`, `stage`, `prod` — each with own DNS, DB, keys; enforce with 12-factor style config.
- **Effort:** M · **Owner:** DevOps

### FDEP-04  Frontend served by `craco start` in prod supervisor   [HIGH]
- **What:** Supervisor runs `yarn start` → dev server. Not fit for production.
- **Fix:** Build once (`yarn build`) → serve static via CDN or nginx; add health check.
- **Effort:** S · **Owner:** DevOps

### FDEP-05  No Infrastructure-as-Code                            [MEDIUM]
- **What:** No Terraform / Pulumi / CloudFormation in repo.
- **Fix:** Codify infra (DNS, LB, K8s manifests, Redis, DBs) in IaC. One-command bring-up.
- **Effort:** L · **Owner:** DevOps

### FDEP-06  Docker not present / not standard                   [MEDIUM]
- **What:** No `Dockerfile`. Emergent supplies a runtime, but for scale each service should have a reproducible image.
- **Fix:** Multi-stage Dockerfile for frontend (build → nginx) and backend; publish to a container registry.
- **Effort:** M · **Owner:** DevOps

### FDEP-07  No feature-flag system                                [MEDIUM]
- **What:** Feature flags are hardcoded in `constants/featureFlags.js`.
- **Why it's a risk:** Every flag flip = deploy; no per-tenant rollout.
- **Fix:** Runtime flags (LaunchDarkly / Unleash / GrowthBook) evaluated per user/restaurant.
- **Effort:** M · **Owner:** Platform

### FDEP-08  No blue/green or canary                              [MEDIUM]
- **Fix:** Add canary route (5 %) with automatic rollback on error-rate spike.
- **Effort:** M · **Owner:** DevOps

### FDEP-09  Yarn 1.x (Classic) — end-of-life posture             [LOW]
- **What:** `packageManager: yarn@1.22.22`.
- **Fix:** Plan migration to Yarn Berry (PnP or node-modules) or `pnpm` for reproducibility.
- **Effort:** M · **Owner:** Frontend

### FDEP-10  Emergent-specific `.emergent/` folder tied to preview only   [LOW]
- **Fix:** Ensure prod deployment does not depend on Emergent-only assets.

---

## 11. Observability & Monitoring Findings

### FOBS-01  No frontend error tracking                            [HIGH]
- **What:** No Sentry / Rollbar / Bugsnag / Datadog RUM.
- **Why it's a risk:** All frontend errors invisible to engineering.
- **Impact at scale:** Bugs found by customer complaints, not telemetry.
- **Fix:** Add Sentry with source-map upload in CI; alert on new/regression errors; PII scrubbing.
- **Effort:** S · **Owner:** Frontend + DevOps

### FOBS-02  No RUM / performance monitoring                     [HIGH]
- **Fix:** Web-Vitals reporting (LCP, INP, CLS) → RUM tool; per-page dashboards.
- **Effort:** S · **Owner:** Frontend

### FOBS-03  No structured logs on backend                        [HIGH]
- **What:** FastAPI logs are default text; no correlation IDs, no JSON.
- **Fix:** JSON logger (`loguru` / `structlog`), `X-Request-ID` propagation from client → backend → downstream.
- **Effort:** S · **Owner:** Backend

### FOBS-04  No metrics (Prometheus / OpenTelemetry)              [HIGH]
- **Fix:** Instrument backend with OpenTelemetry; export to Prometheus/Grafana or a hosted APM (Datadog, New Relic, Grafana Cloud).
- **Effort:** M · **Owner:** Backend + DevOps

### FOBS-05  No distributed tracing                                [MEDIUM]
- **Fix:** W3C `traceparent` propagation client → backend → Laravel → CRM.
- **Effort:** M · **Owner:** Full stack

### FOBS-06  No health / readiness endpoints on all services      [MEDIUM]
- **What:** `ENABLE_HEALTH_CHECK=false` in `.env`.
- **Fix:** Standard `/healthz`, `/readyz` on every backend service; wired to LB probes.
- **Effort:** S · **Owner:** Backend

### FOBS-07  No SLO / SLA definition                              [MEDIUM]
- **Fix:** Define SLOs: login success ≥ 99.9 %, order-place p95 ≤ 500 ms, socket-connect p95 ≤ 1 s. Track with error budgets.
- **Effort:** S · **Owner:** SRE

### FOBS-08  No log aggregation / retention policy                [MEDIUM]
- **Fix:** ELK / Loki / Datadog Logs; 30-day hot / 1-year cold retention aligned with compliance.
- **Effort:** M · **Owner:** DevOps

### FOBS-09  No synthetic / uptime monitoring                     [MEDIUM]
- **Fix:** Blackbox monitors (Pingdom / UptimeRobot / Grafana Synthetics) on login, socket, key APIs.
- **Effort:** S · **Owner:** SRE

### FOBS-10  No user-session replay for support                   [LOW]
- **Fix:** LogRocket / FullStory (PII-safe config) — dramatically shortens support cycles.
- **Effort:** S · **Owner:** Support + Frontend

---

## 12. Multi-Tenancy & Data-Isolation Findings

### FMT-01  No proven per-tenant data isolation at DB layer        [HIGH]
- **What:** Not verifiable from client code; every backend call is `restaurant_id`-scoped, but no evidence of row-level security or per-tenant DB partitioning.
- **Why it's a risk:** A single missed `WHERE restaurant_id = ?` = catastrophic cross-tenant leak.
- **Fix:** Enable Postgres row-level security (RLS) with policies keyed on `restaurant_id`; enforce at query builder layer; automated tests that attempt cross-tenant reads and expect 403.
- **Effort:** L · **Owner:** Backend

### FMT-02  Restaurant ID sourced from client-side context        [HIGH]
- **What:** Frontend sends `restaurant_id` alongside requests; if backend trusts client-provided IDs, cross-tenant escalation is possible.
- **Fix:** Backend must **derive** `restaurant_id` from the JWT/session claim, never from request body.
- **Effort:** S · **Owner:** Backend

### FMT-03  Tenant provisioning is manual                          [MEDIUM]
- **What:** No self-service tenant onboarding visible.
- **Fix:** Signup + provisioning API + welcome email + first-run wizard.
- **Effort:** L · **Owner:** Product + Backend

### FMT-04  Noisy neighbour risk                                   [MEDIUM]
- **What:** No per-tenant rate limit or quota.
- **Fix:** Per-tenant token bucket in the API gateway.
- **Effort:** M · **Owner:** Backend

### FMT-05  Per-tenant feature flags absent                        [MEDIUM]
- Covered in FDEP-07.

### FMT-06  Global CRM keys map ships to every tenant             [HIGH]
- Covered in FSEC-01.

### FMT-07  Firebase project is shared                            [MEDIUM]
- **What:** Single Firebase project across all tenants → single blast radius for FCM abuse.
- **Fix:** For enterprise plans, offer dedicated Firebase projects; otherwise carefully scope topics + validate `restaurant_id` on send.
- **Effort:** M · **Owner:** Backend

---

## 13. Compliance & Privacy Findings

### FCMP-01  No documented data-retention policy                   [MEDIUM]
- **Fix:** Publish retention windows per data type (orders 7 years, PII 3 years post-inactivity, logs 1 year); automate purge.
- **Effort:** M · **Owner:** Legal + Backend

### FCMP-02  No data subject request (DSR) workflow               [MEDIUM]
- **Fix:** Export + erase endpoints per user; runbook.
- **Effort:** M · **Owner:** Backend + Support

### FCMP-03  PCI scope — payment data flowing through frontend    [HIGH]
- **What:** `CollectPaymentPanel.jsx` handles payment details; scope of PCI exposure unclear.
- **Fix:** If any card data touches frontend, use a **tokenised** integration (Stripe Elements / Razorpay Checkout / hosted fields). Ensure app is PCI-DSS SAQ-A scope only.
- **Effort:** M · **Owner:** Payments + Security

### FCMP-04  GST/VAT invoicing correctness                        [HIGH]
- **What:** Tax logic partly in `orderTransform.js`; the AGENT prompt rule R6 flags financial logic as sacred.
- **Fix:** Move tax calculation to backend as single source of truth; canonical invoice generator; audit trail for every tax change.
- **Effort:** M · **Owner:** Backend

### FCMP-05  Cookie / consent banner absent                        [LOW]
- **Fix:** If serving EU users, add consent management (Cookiebot / OneTrust) for analytics.
- **Effort:** S · **Owner:** Frontend + Legal

---

## 14. Cross-Cutting Architectural Weaknesses

### FARC-01  No Backend-For-Frontend (BFF) layer                   [HIGH]
- **What:** Frontend talks directly to Laravel, CRM, Socket, and Firebase. Every integration = frontend knowledge.
- **Why it's a risk:** Every new backend endpoint requires a frontend deploy; keys leak into browser; auth logic duplicated.
- **Fix:** Introduce a BFF (Node/FastAPI) between the SPA and backends. Aggregates bootstrap, hides CRM keys, injects tenant identity, terminates auth cookie, translates payload shapes.
- **Effort:** L · **Owner:** Full stack

### FARC-02  No API contract / typed schema                       [HIGH]
- **What:** No OpenAPI spec, no shared TS types with backend.
- **Fix:** Backend publishes OpenAPI 3.1; codegen client SDK for frontend; enforce in CI.
- **Effort:** M · **Owner:** Backend + Frontend

### FARC-03  No event-driven decoupling between services         [MEDIUM]
- **Fix:** Long term: introduce Kafka / Redis Streams for order/payment events → reports/CRM/loyalty consume asynchronously.
- **Effort:** L · **Owner:** Backend

### FARC-04  No service mesh / API gateway                        [MEDIUM]
- **Fix:** Kong / Envoy / AWS API Gateway in front — centralise auth, rate limit, retries, tracing.
- **Effort:** M · **Owner:** DevOps

### FARC-05  No caching layer (Redis)                              [HIGH]
- **What:** Menu, restaurant profile, permissions read from DB every request.
- **Fix:** Redis with per-tenant keyspace; cache-aside pattern; short TTL + explicit invalidation on writes.
- **Effort:** M · **Owner:** Backend

### FARC-06  Testing pyramid inverted                              [MEDIUM]
- **What:** Repo has `__tests__/` folders but no evidence of high coverage on transforms/business logic.
- **Fix:** Enforce ≥ 70 % coverage on `api/transforms/*` and `utils/*`; add smoke E2E via Playwright.
- **Effort:** M · **Owner:** Frontend

### FARC-07  Frontend routing has narrower coverage than sidebar   [LOW]
- Covered in FMNT-09.

### FARC-08  Provider stack is 9 deep — re-render blast radius    [MEDIUM]
- **Fix:** Introduce a "state atom" library (Jotai / Zustand) for cross-cutting slices; keep contexts only for identity/config; reduces re-render count materially.
- **Effort:** L · **Owner:** Frontend

### FARC-09  No documented capacity model                          [MEDIUM]
- **Fix:** Publish "1 tenant costs X CPU / Y RAM / Z requests-per-second"; use for capacity planning.
- **Effort:** S · **Owner:** SRE

### FARC-10  No architecture-decision-record (ADR) process        [LOW]
- **Fix:** Add `docs/adr/NNNN-title.md` template; require ADR for every HIGH-risk decision.
- **Effort:** S · **Owner:** Architecture

---

## 15. Priority Matrix & Roadmap

### 15.1 HIGH-priority items (fix before scaling past ~200 tenants)

| # | Finding | Effort | Owner |
|---|---------|:------:|:------|
| FSEC-01 | CRM keys in browser bundle | M | Backend + FE |
| FSEC-02 | JWT in localStorage | M | Backend + FE |
| FSEC-03 | No CSP / SRI | S | FE + DevOps |
| FSEC-07 | No login rate limit | M | Backend |
| FSCA-01 | Sequential bootstrap | S+M | Backend + FE |
| FSCA-02 | Socket sharding | L | Backend + Infra |
| FSCA-04 | Client-side report aggregation | L | Backend |
| FSCA-05 | Monolithic Laravel | L | Backend |
| FREL-01 | No retry / idempotency | M | FE + Backend |
| FREL-02 | Soft-failure hides errors | M | FE |
| FREL-03 | No offline mode | L | FE + Backend |
| FREL-06 | Single-host SPOF | L | Infra |
| FPRF-01 | 2,000-loc hotspots | L | FE |
| FDAT-01 | localStorage as DB | L | Backend + FE |
| FDAT-03 | Payment status split fields | M | Backend |
| FDAT-06 | No event log | L | Backend |
| FMNT-01 | Same as FPRF-01 | L | FE |
| FMNT-03 | orderTransform sink | L | FE |
| FDEP-01 | No CI/CD | M | DevOps |
| FDEP-02 | `__dev/data` in prod build | S | DevOps + FE |
| FDEP-03 | No env segregation | M | DevOps |
| FDEP-04 | craco start in prod | S | DevOps |
| FOBS-01 | No error tracking | S | FE + DevOps |
| FOBS-02 | No RUM | S | FE |
| FOBS-03 | No structured logs | S | Backend |
| FOBS-04 | No metrics | M | Backend + DevOps |
| FMT-01 | No RLS proof | L | Backend |
| FMT-02 | Client-provided restaurant_id | S | Backend |
| FCMP-03 | Payment PCI scope | M | Payments |
| FCMP-04 | GST correctness | M | Backend |
| FARC-01 | No BFF | L | Full stack |
| FARC-02 | No OpenAPI contract | M | Backend + FE |
| FARC-05 | No Redis cache | M | Backend |

### 15.2 Suggested 3-quarter roadmap

**Q1 — "Stop the bleeding" (foundations)**
- FSEC-01, FSEC-02, FSEC-03, FSEC-07, FSEC-10 → **security baseline**
- FDEP-01, FDEP-02, FDEP-03, FDEP-04 → **prod-worthy deploy**
- FOBS-01, FOBS-02, FOBS-03, FOBS-04, FOBS-06 → **observability MVP**
- FMT-02 → server-derived tenant ID

**Q2 — "Reliability + Scale"**
- FSCA-01 (bootstrap parallel + aggregation)
- FREL-01 (retry + idempotency)
- FREL-02 (error envelope)
- FARC-01 (BFF)
- FARC-05 (Redis cache)
- FMT-01 (RLS)
- FSCA-02 (socket sharding — start)

**Q3 — "Refactor + Enterprise readiness"**
- FMNT-01/03 (hotspot decomposition — hand-in-hand with Order team's own P0 refactor plan)
- FDAT-01 (localStorage → server settings)
- FDAT-06 (event log)
- FREL-03 (offline mode)
- FCMP-01/02/03 (compliance rollout)
- FARC-02 (OpenAPI contract)

### 15.3 Effort legend
- **S** = ≤ 1 sprint (2 weeks)
- **M** = 1–3 sprints
- **L** = > 3 sprints (may span multiple quarters)

---

## 16. Target Architecture for 1,000+ Tenants

```
                         ┌─────────────────────────────────────────┐
                         │        CDN (Cloudflare/CloudFront)       │
                         │   Static SPA, images, WebP, cache SWR    │
                         └───────────────┬─────────────────────────┘
                                         │
                                         ▼
                         ┌─────────────────────────────────────────┐
                         │    Web / API Gateway (Kong / Envoy)     │
                         │  TLS, WAF, per-tenant rate limit,       │
                         │  auth cookie termination, tracing       │
                         └───────────────┬─────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
        ┌─────────────────┐   ┌───────────────────┐   ┌───────────────────┐
        │      BFF        │   │ Realtime Gateway  │   │  Auth Service     │
        │ (FastAPI/Node)  │   │ (Socket.IO nodes  │   │  short-lived JWT  │
        │ Aggregates      │   │  + Redis adapter) │   │  + refresh cookie │
        │ bootstrap,      │   │  sticky sessions  │   │                   │
        │ hides CRM keys  │   └────────┬──────────┘   └───────┬───────────┘
        └────────┬────────┘            │                      │
                 │                     │                      │
   ┌─────────────┼─────────────────────┼──────────────────────┤
   ▼             ▼                     ▼                      ▼
┌────────┐  ┌──────────┐   ┌─────────────────┐    ┌────────────────────┐
│Catalog │  │ Orders   │   │  Payments       │    │  Reports (OLAP)    │
│Service │  │ Service  │   │  Service        │    │  read-replica /    │
│        │  │(events)  │   │(idempotent)     │    │  ClickHouse        │
└───┬────┘  └────┬─────┘   └────────┬────────┘    └──────────┬─────────┘
    │            │                  │                        │
    └─────► Message bus (Kafka / Redis Streams) ─────────────┤
    │            │                                            │
    ▼            ▼                                            ▼
 Postgres    Postgres                                    Postgres RO
 (RLS)       (RLS, event    ┌───────────────────┐        + ClickHouse
             journal)       │  Redis (cache,    │
                            │  session, rate    │
                            │  limiting)        │
                            └───────────────────┘

Cross-cutting: OpenTelemetry traces + JSON logs + Prometheus metrics + Sentry
```

**Principles**
1. **BFF owns tenant secrets** — no CRM/Firebase/Maps keys with tenant scope in the browser.
2. **JWT in httpOnly cookie**, short TTL, refresh via BFF.
3. **Row-level security on every table**, enforced by DB.
4. **All writes idempotent** via `Idempotency-Key`.
5. **Domain events on Kafka** — every mutation produces an event.
6. **Reports isolated** on a read replica / OLAP store.
7. **Realtime on managed layer** (Ably / Pusher / self-hosted Socket.IO cluster with Redis adapter).
8. **CI/CD every commit** — lint, test, build, bundle-budget, deploy to preview.
9. **Observability = default** — every service ships logs + metrics + traces + Sentry.
10. **Feature flags per tenant** — LaunchDarkly or Unleash.

---

## 17. Appendix — Evidence Index

| Ref | File / Doc |
|---|---|
| Architecture summary | `/app/memory/memory/memory/current-state/CURRENT_ARCHITECTURE.md` |
| Module map | `/app/memory/memory/memory/current-state/MODULE_MAP.md` |
| API usage | `/app/memory/memory/memory/current-state/API_USAGE_MAP.md` |
| Repo's own risk register | `/app/memory/memory/memory/analysis/SCALING_RISK_REGISTER.md` |
| Refactor opportunities | `/app/memory/memory/memory/analysis/REFACTOR_OPPORTUNITY_MAP.md` |
| Final architecture decisions | `/app/memory/memory/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` |
| Agent operating manual | `/app/memory/control/AGENT_PROMPT_ALPHA.md` |
| Backend proxy | `/app/backend/server.py` |
| Training backend | `/app/training-backend/server.py` |
| Main axios client | `/app/frontend/src/api/axios.js` |
| CRM axios client | `/app/frontend/src/api/crmAxios.js` |
| Provider stack | `/app/frontend/src/contexts/AppProviders.jsx` |
| Dashboard hotspot | `/app/frontend/src/pages/DashboardPage.jsx` |
| Order-entry hotspot | `/app/frontend/src/components/order-entry/OrderEntry.jsx` |
| Order transforms | `/app/frontend/src/api/transforms/orderTransform.js` |
| Socket wiring | `/app/frontend/src/api/socket/useSocketEvents.js`, `socketHandlers.js`, `socketService.js` |
| Env handover | `/app/memory/memory/memory/DEPLOYMENT_HANDOVER_2026-05-04.md` |

---

**Owner of this document:** Architecture team.
**Cadence:** Reviewed at the start of every sprint; findings closed only when a linked ADR + tests + monitoring exist.
**How to add a new finding:** Append under the correct category with the standard template. Update the Priority Matrix. Open a corresponding CR in `/app/memory/change_requests/`.

---

## 18. Capacity Analysis — How Many Tenants Before It Breaks

This section answers the practical question: **with the architecture as it exists today, how many restaurants can we serve before real problems appear?**

### 18.1 TL;DR

| Tier | Restaurant count | State | What you feel |
|---|:-:|---|---|
| **Safe zone** | **1 – 50** | Works fine | No noticeable issues |
| **First cracks** | **50 – 150** | Strain begins | Slow reports, login lag, occasional socket drops |
| **Breaking point** | **150 – 300** | Frequent incidents | Peak-hour outages, support drowning, deploys scary |
| **Structurally broken** | **300 – 500** | Won't hold | Weekly incidents, SPOF failures, security posture untenable |
| **Impossible** | **500+** | Architecture unfit | Cannot scale without redesign |

The **hard ceiling** of the current architecture is roughly **200–300 concurrent-during-peak restaurants**. Beyond that, no amount of tuning saves it — the design itself has to change.

### 18.2 Assumptions used

Per restaurant during peak lunch / dinner hours:
- **~4 concurrent users** (1 owner + 2 cashiers + 1 kitchen display / waiter tablet)
- **20 – 50 orders/hour** — roughly one order every 1–3 minutes
- **5 – 10 API calls per order** (place, modify, KOT, payment, print, settle)
- **3 – 5 socket messages per order** (`new_order`, status, engage/disengage)
- **Peak windows:** 12–2 PM and 7–10 PM (about 5 hours/day)
- **Login storms** at shift changes (9 AM, 5 PM)

### 18.3 Component-by-component ceiling

| # | Component | Theoretical max | Real-world break-point | First symptom |
|---|---|:-:|:-:|---|
| 1 | `craco start` dev server (currently used in prod supervisor) | ~100 concurrent conns | **~30–50 restaurants** | Page load timeouts, 502s |
| 2 | Laravel monolith + single DB | 500–2,000 restaurants | **~150–300** | Slow reports, 500s during peak |
| 3 | Socket.IO single node | 10k–15k sockets | **~500–800 peak / cracks at ~200** | Socket reconnect storms |
| 4 | Sequential 7-call bootstrap | — | **~50–100 concurrent logins** | Login takes 5–8 s at 5 PM shift change |
| 5 | Client-side report aggregation | — | **Any chain with 10+ outlets** | Chrome OOM on tablets |
| 6 | CRM keys shipped in bundle (security wall) | — | **~20–50 tenants** | Key rotation becomes impossible |
| 7 | No CI/CD, manual deploys | — | **~20 restaurants** | "Deploy fear", changes slow to a crawl |
| 8 | No error tracking / no RUM | — | **~30–50** | Bugs invisible; support tickets are the only signal |
| 9 | localStorage as a database | — | **~200–300** | Support cost per restaurant explodes |
| 10 | Single AZ / single host SPOF | — | Any scale | One outage = 100% of fleet down |

### 18.4 What breaks first — in order

**Restaurants #1 – #30 — everything fine.**
Backend is idle, DB is warm, sockets are quiet. Support handles complaints directly.

**Around #30 – #50 — static hosting cracks first.**
If the production supervisor still runs `craco start` (FDEP-04), you hit the dev-server connection cap. Fix: build once, serve via nginx or CDN. This is the cheapest single win in the entire roadmap.

**Around #50 — deploy velocity collapses.**
Every change touches the 2,000-loc hotspots (`DashboardPage`, `OrderEntry`). Manual deploys become risky. Bug fixes get deferred because "we can't risk it during dinner service."

**Around #50 – #80 — login storms.**
At shift changes (5 PM / 9 AM), 100+ users login within 5 minutes. Each user does 7 sequential API calls. Backend CPU spikes → p95 latency doubles → bootstrap goes from 1.5 s to 5–8 s → cashiers complain the app "hangs on login".

**Around #80 – #150 — report queries start timing out.**
Reports pull raw orders and aggregate client-side. A chain with 30 outlets running month-end reports pulls hundreds of megabytes of order rows. Chrome runs out of memory on 2 GB Android tablets. Backend DB CPU sits at 80 % during business hours. The slow-query log fills up.

**Around #100 – #200 — socket reconnect storms.**
Café Wi-Fi drops for 3 seconds → 500+ sockets reconnect simultaneously → Socket.IO server thrashes → cascading disconnects → kitchen displays show wrong statuses → cashiers panic-refresh → more load.

**Around #150 – #250 — CRM key rotation becomes impossible.**
A tenant leaves and demands their key be rotated. To do that, you must rebuild and redeploy the bundle for **every** tenant. This is when it becomes clear that `REACT_APP_CRM_API_KEYS` was a foundational mistake.

**Around #200 – #300 — support cost outpaces revenue per tenant.**
localStorage state means every "my dashboard looks different on the other tablet" ticket is a manual investigation. Multi-device drift, "coming soon" sidebar entries, `walkIn` cart persistence — each is 15–30 minutes of support time.

**Around #300 – #500 — incidents become weekly.**
- Single-AZ preprod host goes down → 100 % of the fleet is offline
- Payment PCI-scope audit fails
- A CVE in any of the 40+ npm dependencies triggers a bundle rebuild across the whole fleet
- Hot-fixes take a day because there is no CI/CD

**Around #500+ — architecture is structurally unfit.**
The single Laravel monolith + single Socket.IO node + browser-side reports + localStorage state model simply cannot serve this many tenants safely.

### 18.5 What buys the most headroom per week of effort

Ranked by capacity gained per engineer-week:

| Fix | Effort | Ceiling raised to |
|---|:-:|:-:|
| Serve built bundle from nginx / CDN (kill `craco start`) | 2 days | **~200** |
| Parallelise the 7-call bootstrap | 3 days | **~250** |
| Add error tracking (Sentry) + basic RUM | 3 days | Visibility to diagnose > 200 |
| Add Redis + cache menu / profile / permissions | 1 sprint | **~400** |
| Backend aggregation endpoint (single bootstrap payload) | 1 sprint | **~500** |
| Move CRM traffic through a BFF (kill client-side keys) | 2 sprints | Removes the security wall entirely |
| Socket.IO Redis-adapter cluster | 3 sprints | **~5,000** |
| Move reports to backend + OLAP (ClickHouse / read replica) | 3–4 sprints | **~10,000** |
| Full BFF + event bus + RLS | 2 quarters | **~50,000+** |

A pragmatic 1-quarter push (Sentry + CDN + bootstrap fix + Redis + moving CRM keys out of the bundle) realistically takes the ceiling from **~150 tenants to ~500–800**. That is the near-term runway.

### 18.6 Recommendation

- **Safe today up to ~50 restaurants.** No panic.
- **Between 50 and 150** the team will spend most of its time firefighting instead of shipping features. Fix the six items in §18.5 first.
- **Do not onboard the 200th restaurant** without at minimum: CDN + built assets, Sentry, Redis cache, and a backend bootstrap aggregation endpoint.
- **Do not onboard the 500th restaurant** without completing the Q2 roadmap from §15.2: BFF, socket sharding, reports on OLAP, event log.

*End of Architecture Bible v1.1.*
