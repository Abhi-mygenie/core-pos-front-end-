# Layer 5 — Env & Config Registry

**Status:** POPULATED
**Last Updated:** 2026-06-11 (pod reconciliation — fresh pod on branch `main` @ `1f05d05`; repo's gitignored `.env` restored from this registry; CRM reverted to production-stable; `REACT_APP_SHOW_AUDIT_TAB=true` restored)

---

## Current Frontend Env (`/app/frontend/.env`)

| Variable | Value | Description |
|---|---|---|
| `REACT_APP_BACKEND_URL` | `https://pos-front-pull.preview.emergentagent.com` | Emergent preview URL (this pod) |
| `WDS_SOCKET_PORT` | `443` | WebSocket dev server port |
| `ENABLE_HEALTH_CHECK` | `false` | Webpack health check plugin |
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/` | Main backend API |
| `REACT_APP_SOCKET_URL` | `https://presocket.mygenie.online` | Socket.io server |
| `REACT_APP_FIREBASE_API_KEY` | `AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY` | Firebase |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | `mygenie-restaurant.firebaseapp.com` | Firebase |
| `REACT_APP_FIREBASE_PROJECT_ID` | `mygenie-restaurant` | Firebase |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | `mygenie-restaurant.firebasestorage.app` | Firebase |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `969625631640` | Firebase |
| `REACT_APP_FIREBASE_APP_ID` | `1:969625631640:web:2f2a2987f740b6fc8e09ed` | Firebase |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | `G-WFK75QN54E` | Firebase |
| `REACT_APP_FIREBASE_VAPID_KEY` | `BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI` | Firebase push |
| `REACT_APP_CRM_BASE_URL` | `https://crm.mygenie.online/api` | CRM API (production-stable, per 2026-06-11 handover) |
| `REACT_APP_SHOW_AUDIT_TAB` | `true` | S5/S6/S7/S9 audit tabs (preprod=true, production=false) |
| `REACT_APP_GOOGLE_MAPS_KEY` | **MISSING** | Delivery address autocomplete — Owner Decision Queue E2 |

---

## Env Change History

| Date | Variable | Old Value | New Value | Reason |
|---|---|---|---|---|
| 2026-05-26 | `REACT_APP_CRM_BASE_URL` | `https://crm.mygenie.online/api` | `https://insights-phase.preview.emergentagent.com/api` | CRM 2.0 preview deploy |
| 2026-05-28 | `REACT_APP_CRM_BASE_URL` | `...coupon-roi-preview...` | `https://insights-phase.preview.emergentagent.com/api` | CRM deploy change |
| 2026-05-29 | `REACT_APP_CRM_BASE_URL` | `...mygenie-crm-deploy...` | `https://insights-phase.preview.emergentagent.com/api` | Fresh deploy (29-may branch) |
| 2026-05-29 | `REACT_APP_BACKEND_URL` | (various per deploy) | `https://5ce677c9-...preview.emergentagent.com` | Fresh Emergent pod |
| 2026-06-02 | `REACT_APP_BACKEND_URL` | `https://insights-phase.preview.emergentagent.com` | `https://insights-phase.preview.emergentagent.com` | Re-clone of `2-jiune-v2` into fresh pod |
| 2026-06-02 | `REACT_APP_CRM_BASE_URL` | `https://insights-phase.preview.emergentagent.com/api` | `https://crm.mygenie.online/api` | Branch `2-jiune-v2` ships with production CRM endpoint |
| 2026-06-05 | `REACT_APP_BACKEND_URL` | (previous pod) | `https://insights-phase.preview.emergentagent.com` | Fresh Emergent pod — branch `5-june` |
| 2026-06-05 | `REACT_APP_CRM_BASE_URL` | `https://crm.mygenie.online/api` | `https://insights-phase.preview.emergentagent.com/api` | Owner directive — CRM staging build 6 |
| 2026-06-05 | `REACT_APP_SHOW_AUDIT_TAB` | (not set) | `true` | S5+S6 audit tabs env-gated; preprod=true, production=false |

---

## URL Map

| Purpose | URL |
|---|---|
| Main API | `https://preprod.mygenie.online/` |
| Socket | `https://presocket.mygenie.online` |
| CRM | `https://crm.mygenie.online/api` |
| Firebase | `mygenie-restaurant.firebaseapp.com` |
| Preview | `https://insights-phase.preview.emergentagent.com` |

---

## Feature Flags

| Flag | Current Value | Notes |
|---|---|---|
| `ENABLE_HEALTH_CHECK` | `false` | Webpack health check plugin disabled |
| `feature_flags.upsell` | `false` (server-side) | Blocks CR-004 Up-sell |
| `restaurant.features.deliveryAssign` | Per-restaurant profile | Determines Dispatch vs Assign Rider flow |

---

## localStorage Keys in Active Use

| Key | Purpose | Module |
|---|---|---|
| `auth_token` | Authentication token | Auth |
| `mygenie_auto_settle_enabled` | Auto-settle toggle | Dashboard (PROD-HOTFIX-001) |
| `mygenie_channel_visibility` | Channel view visibility settings | Dashboard/Settings |
| `mygenie_default_dashboard_view` | Default dashboard view mode | Dashboard/Settings |
| `mygenie_default_pos_view` | Default POS view mode | Dashboard/Settings |
| `mygenie_enabled_statuses` | Status visibility configuration | StatusConfigPage |
| `mygenie_order_taking_enabled` | Order-taking toggle | Dashboard/Settings |
| `mygenie_view_mode_channel_status` | Channel-status view mode | Dashboard/Settings |
| `mygenie_view_mode_table_order` | Table-order view mode | Dashboard/Settings |
| `SOCKET_DEBUG` | Socket debug logging | Debug |
| `STATION_DEBUG` | Station debug logging | Debug |

**Note:** QSR mode prefs and stay-on-order-after-bill prefs also use localStorage via `qsrModePrefs.js` and `orderEntryPrefs.js` — keys prefixed with `mygenie_`.
