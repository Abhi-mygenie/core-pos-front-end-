# QA HANDOVER — BUG-661 → QA (Gate 5B)

**Date:** 2026-11-09 · **From:** IMPLEMENTATION (Gate 5A) · **To:** QA
**Item:** BUG-661 — PWA manual update banner + no white screen on release (supersedes BUG-621)
**Severity:** P0 · **Risk:** HIGH · **Sprint:** nov_cr_batch

## 1. What was changed (8 files)

| # | File | Change |
|---|---|---|
| F1 | `craco.config.js` | `REACT_APP_BUILD_ID` baked at build; `BuildVersion` plugin emits `build/version.json` in prod |
| F2 | `public/version.json` (NEW) | Stub `{"buildId":"dev"}` — change to `dev2` to test banner |
| F3 | `src/hooks/useAppVersionCheck.js` (NEW) | Polls `/version.json` every 5 min + on load + on tab focus; returns `updateAvailable` bool |
| F4 | `src/App.js` | `SwUpdateBanner`: removed 10s auto-reload, added `versionUpdatePending`, text→"New version available", button→"Update now" |
| F5 | `src/contexts/NotificationContext.jsx` | SW detection moved out of `isAuthenticated` gate; new `hadController` guard prevents reload on first install |
| F6 | `public/index.html` | Inline boot guard: session-scoped one-shot reload on `/static/js/` 404 |
| F7 | `src/index.js` | Sets `window.__APP_BOOTED__=true`, clears `mg_boot_retry` after React mounts |
| F8 | `src/components/guards/ErrorBoundary.jsx` | 60s sessionStorage-based chunk retry (replaces sticky `?retry=1`) |

## 2. Self-test results

| Check | Result |
|---|---|
| V1 — no banner on load (`dev` == `dev`) | PASS |
| V2 — banner appears after `version.json` → `dev2` | PASS |
| V3 — text: "New version available" | PASS |
| V4 — button: "Update now" | PASS |
| V5 — banner shows on login page (no auth required) | PASS |
| V7 — `yarn build` → `build/version.json` = timestamp | PASS |
| Webpack compile | 0 new warnings |

## 3. QA verification matrix

| # | How to test | Expected | Auto? |
|---|---|---|:---:|
| V1 | Load preview URL with `version.json`=`dev` | No `sw-update-banner` in DOM | YES |
| V2 | Edit `public/version.json` → `dev2`, reload tab | Banner appears: "New version available" + "Update now" | YES |
| V3 | With banner showing, wait 35 s | Banner still visible (no auto-reload) | YES |
| V4 | Click "Update now" | Page reloads; revert file → no banner; no loop | YES |
| V5 | With `dev2` set, visit login page (logged out) | Banner visible at bottom | YES |
| V7 | Bash: check `build/version.json` after `yarn build` | `buildId` is a 13-digit timestamp ≠ `dev` | YES |
| V8 | Playwright: abort `/static/js/main*.js` on load | Exactly 1 reload with `?v=`; 2nd failure = no further reload | YES |
| V9 | Normal load | `window.__APP_BOOTED__===true`, `mg_boot_retry` absent | YES |
| V11 | Playwright: throw ChunkLoadError (abort lazy chunk) | 1 reload, URL has no `?retry=1`; 2nd within 60s → error screen | YES |
| V12 | Screenshot at 1920 width with banner showing | Banner does not cover main login form | YES |
| V13 | With `dev2` set: login → dashboard → check banner | Banner visible on every page (z-index 9999) | YES |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: BUG-661
Gate: GATE_5A
EXIT GATE: 5/5 PASS (registry ✓, BUG_TRACKER ✓, FILE_OWNERSHIP ✓, code markers ✓, compile ✓)

## 5. Credentials + Environment
- POS URL: https://c4220e7e-e76a-4ba7-b323-bd65e8947f74.preview.emergentagent.com
- Login: owner@cafe103.com / Qplazm@10 (see `/app/memory/control/test_credentials.md`)
- **Preview test method:** `echo '{"buildId":"dev2"}' > /app/frontend/public/version.json` → reload tab → banner appears. Revert: `echo '{"buildId":"dev"}' > /app/frontend/public/version.json`
- No backend/API credentials needed for most tests

## 6. Nginx snippet for DevOps (OD-661-10 — owner's own deployment)
```nginx
location = /index.html            { add_header Cache-Control "no-cache" always; }
location = /version.json          { add_header Cache-Control "no-store" always; }
location = /firebase-messaging-sw.js { add_header Cache-Control "no-cache" always; }
location /static/                 { add_header Cache-Control "public, max-age=31536000, immutable" always; }
location /                        { try_files $uri /index.html; add_header Cache-Control "no-cache" always; }
```
Verify after deploy: `curl -sI https://<prod>/version.json | grep -i cache-control` → `no-store`

## 7. Not touched
`firebase-messaging-sw.js`, `firebase.js`, `package.json`, notification sounds, logout logic, any order/payment/API/transform code, any route.

## 8. BUG-597 / BUG-621 / BUG-622 note
BUG-661 supersedes BUG-621 (v1). The 10s auto-reload timer from BUG-622 is now removed (OD-661-01). BUG-597 original behaviour preserved (`triggerSwUpdate` still called on "Update now"). Flag BUG-597 for closure review — its original SW detection path is now superseded by BUG-661 F5.
