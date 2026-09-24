# INV — Caching in the POS, end to end — Investigation Report

**Date:** 2026-09-24 · **Role:** INVESTIGATION (ALPHA v0.7) · **Steps used:** 9/10 · **Risk label:** HIGH (customer data isolation + report freshness) · **Registered ID:** none (owner: investigate only)
**Scope:** every layer between the browser and `preprod.mygenie.online`: CDN/HTTP, service worker/PWA, browser storage, module-level JS caches, React context state, refresh/logout paths. Code at `21implement` @ `a4c9196f`. No code changed, no registry changed.

## 1. Summary
Yes — caching exists at **5 layers**. 3 are intentional and mostly safe (boot-data contexts, Insights response cache, customer-intel RAM cache); **2 are gaps**:
- **GAP-C1 (HIGH, data isolation):** `crmReportService.js` 5-min in-memory cache has **no restaurant id in its key** and its `clearCrmReportCache()` has **zero callers** (not on logout, not on 401). Logout for a regular employee is an SPA `navigate('/')` (`Sidebar.jsx:~480`), so module memory survives → a second restaurant logging in on the same tab within 5 min can be served the first restaurant's CRM summary / top customers on Customer Intelligence (Beta) and Guest-vs-Registered (Beta).
- **GAP-C2 (MEDIUM, deployment freshness):** `https://pos-uat.mygenie.online/` serves `index.html` with **no `Cache-Control` header** (only `last-modified`, `cf-cache-status: DYNAMIC`). Browsers apply heuristic freshness (~10 % of the file's age), so after a deploy users can keep an old `index.html` → old `main.<hash>.js` until the heuristic expires or they hard-reload. Hashed bundles and `firebase-messaging-sw.js` are `max-age=14400` (4 h).
Other observations (not defects, but behaviours the owner should know) are in §4.

## 2. Hypotheses Tested
| # | Hypothesis | Method | Result |
|---|---|---|---|
| H1 | An HTTP/CDN layer caches API responses | curl headers on `get-categories`, `settings-list`, `daily-sales-revenue-report` | **ELIMINATED** — all `cache-control: no-cache, private`, `cf-cache-status: DYNAMIC` |
| H2 | Service worker / PWA (CR-386) caches assets or API | read `public/firebase-messaging-sw.js`, `index.html`, `config/firebase.js` | **ELIMINATED** — SW has only `notificationclick`; no `fetch` handler, no Workbox, no `caches.*`; CR-386 adds manifest only |
| H3 | A query library caches (react-query / swr are in package.json) | grep `useQuery|useSWR|QueryClient` | **ELIMINATED** — both deps installed but **unused** (dead dependencies) |
| H4 | App-level in-memory caches exist and may leak across tenants or go stale | grep module-level `Map()`/TTL, trace logout & refresh | **CONFIRMED** — see §3 |
| H5 | Browser storage persists data across sessions | enumerate `localStorage`/`sessionStorage` keys | **CONFIRMED** — preferences + tokens; no business data (products/orders) persisted |
| H6 | Static hosting caches `index.html` | curl `-I` on pos-uat | **CONFIRMED** (GAP-C2) |

## 3. Cache inventory (what, where, TTL, cleared when, tenant-safe?)
| # | Layer | Location | Scope / TTL | Cleared on | Tenant-safe? |
|---|---|---|---|---|---|
| 1 | **Insights response cache** (CR-044) | `api/services/insightsCache.js` — `responseCache` Map, max 5 entries, skip if >3000 orders | key `rid:endpoint:sort:from:to`; TTL 60 s if range includes today, 5 min historical; in-flight dedup | logout (`Sidebar.jsx:455`), `InsightsCacheContext.clear` | YES (rid in key) |
| 2 | **CRM report cache** (CR-078/131) | `api/services/crmReportService.js:10-22` — `_cache` Map | keys `crm-summary`, `crm-top-customers-{sort}-{limit}`; TTL 5 min | **never** (`clearCrmReportCache` has 0 callers) | **NO — GAP-C1** |
| 3 | **Customer-intel RAM cache** | `hooks/useCustomerIntel.js:39-84` — `useRef`, 5 min | per mounted component (cart fingerprint key) | unmount | YES (component-scoped) |
| 4 | **Boot-data contexts** | `MenuContext` (categories/products), `TableContext`, `OrderContext`, `RestaurantContext` (profile + settings), `SettingsContext`, `StationContext` | in-memory for the session | logout (`clearMenu/clearTables/clearOrders/clearRestaurant`), F5 (re-boots via `/loading`) | YES |
| 4a | Delta refresh sources for #4 | socket `food_update_{rid}` / delete-food (BUG-116/096), order polling 60 s (`useOrderPollingReconciliation`), sidebar **Refresh** (`useRefreshAllData`: tables → categories+products → running orders) | — | — | Refresh does **not** reload settings/profile/permissions (see §4-O1) |
| 5 | **localStorage** | `auth_token`, `common_auth_token`, `crm_token`, `remember_me`, `user_email`, `mygenie_channel_visibility`, `mygenie_sidebar_expanded`, `mygenie_enabled_statuses` (CR-376), `mygenie_order_taking_enabled`, `mygenie_*_name/phone_required`, `mygenie_room_id_upload_required`, `mygenie_printer_type`, `mygenie_default_pos_view`, `mygenie_default_dashboard_view`, `mygenie_station_view_config`, `mygenie_view_mode_*`, QSR keys, `recipe_bulk_cols`, debug flags | persistent | tokens + channel visibility cleared on logout/401; **preference keys never cleared and not RID-scoped** | device-level by design (CR-376 D-A) — see §4-O2 |
| 6 | **sessionStorage** | `permissions`, `auth_redirect`, `intentional_logout` | tab lifetime | `permissions` overwritten at next login, **not removed on logout** | low risk (overwritten before use) |
| 7 | **HTTP / CDN** | preprod API | `no-cache, private` | — | n/a |
| 8 | **Static hosting** | pos-uat `index.html` no `Cache-Control`; `main.<hash>.js` + `firebase-messaging-sw.js` `max-age=14400` | heuristic / 4 h | hard reload | **GAP-C2** |
| 9 | **Service worker** | `firebase-messaging-sw.js` | push only, no fetch interception | — | n/a |

## 4. Observations for the owner (not bugs by themselves)
- **O1 — Sidebar "Refresh" is partial / inert on 68 pages.** `useRefreshAllData` refreshes tables, categories, products and running orders only; restaurant settings, profile and permissions need a re-login/F5 (matches BUG-130 history). 14 pages pass `onRefresh={() => {}}` (Daily Report `OrderSummaryPage`, `SettlementPage`, `DeliveryManagementPage`, `RoomOrdersReportPage`, `AllOrdersReportPage`, `FoodCourtBetaPage`, 8 mockups) and 54 more pages render `<Sidebar>` without `onRefresh` at all → the button spins/does nothing there. Report pages instead rely on cache #1 TTL (60 s today / 5 min historical) — a user re-applying the same range inside that window gets cached numbers.
- **O2 — Device-level preferences follow the browser, not the restaurant.** All `mygenie_*` preference keys are unscoped; the same laptop used for two outlets shares status config, order-taking toggle, mandatory-phone flags, printer type. This was owner-approved as "pure local setting" for CR-376 but has never been stated for the other keys.
- **O3 — `@tanstack/react-query` 5.56.2 and `swr` 2.3.8 are dead dependencies** (0 imports) — bundle/audit noise only (candidate for the pos_audit_1 track).
- **O4 — 401 path** (`axios.js:46-57`) clears tokens + CRM token + channel visibility, but not caches #1/#2 (same module-memory concern as GAP-C1, lower likelihood).

## 5. Recommendations
| Gap | Classification | Proposed fix (for INTAKE/PLANNING, not applied) | Planning-skip? |
|---|---|---|---|
| GAP-C1 | FE_FIX, HIGH | (a) include `rid` in `crmReportService` keys **and** (b) call `clearCrmReportCache()` next to `clearInsightsCache()` in `Sidebar.handleLogout` and in the axios 401 handler | NO — 2–3 files, customer-data → full Gate 2/3 + R6-style regression (Pre-Release Audit §B "cache data isolation" test) |
| GAP-C2 | CONFIG_CHANGE (hosting/nginx or Cloudflare rule) | `Cache-Control: no-cache` (or `no-store`) on `/index.html` and `/firebase-messaging-sw.js`; keep long `max-age, immutable` for `/static/*` | Not FE code — DEPLOYMENT/backend-ops brief |
| O1 | OWNER_DECISION | decide whether Refresh should also bust cache #1 and reload settings, or be hidden on pages where it is a no-op | — |
| O2 | OWNER_DECISION | confirm device-level scope is intended for all `mygenie_*` keys, or scope by RID | — |

## 6. Evidence
`/app/memory/evidence/INV-CACHING-2026-09-24/` — `uat_index_headers.txt`, `uat_js_headers.txt`, `api_headers.txt` (tokens never written). Code references above are line-accurate at `a4c9196f`.

## 7. Retroactive Candidates
NONE.
