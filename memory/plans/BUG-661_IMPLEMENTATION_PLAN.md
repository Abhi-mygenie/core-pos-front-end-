# BUG-661 (supersedes BUG-621) — Implementation Plan (Gate 3, line-by-line)

**Item:** Manual app update — persistent banner + version check + no white screen on release
**Date:** 2026-11-09 · **Role:** PLANNING (Implementation Plan) · **Severity:** P0 · **Risk:** HIGH (all clients, every release; no financial logic)
**Code Reality:** PARTIAL (re-verified 2026-11-09 — line refs below match current code)
**Impact:** `impact/BUG-661_IMPACT_ANALYSIS.md` (Gate 2 COMPLETE, all ODs resolved) · **Intake:** `change_requests/BUG-621_PWA_UPDATE_BANNER_NEVER_SHOWS_INTAKE.md` (v2)
**Owner decisions applied:** OD-661-01 no auto-reload · 02 foreground re-check · 04 manual persistent banner · 06 version.json check · 07 ErrorBoundary retry guard · 08 every 5 min · 09 keep existing banner design · 10 own deployment (nginx) · P0

## 1. Scope Lock
**WILL change (8 files: 6 modified, 2 new):**
| # | File | Type |
|---|---|---|
| F1 | `craco.config.js` | MODIFY — build id + emit `version.json` |
| F2 | `public/version.json` | NEW — dev/preview stub |
| F3 | `src/hooks/useAppVersionCheck.js` | NEW — polling hook |
| F4 | `src/App.js` | MODIFY — `SwUpdateBanner` L115-153 |
| F5 | `src/contexts/NotificationContext.jsx` | MODIFY — L236-245, L247-268, L273 + new effect |
| F6 | `public/index.html` | MODIFY — inline boot guard in `<head>` |
| F7 | `src/index.js` | MODIFY — boot flag after render |
| F8 | `src/components/guards/ErrorBoundary.jsx` | MODIFY — L14-24 retry guard |

**WILL NOT touch:** `public/firebase-messaging-sw.js`, `src/config/firebase.js`, `package.json` (no script change — version step lives in craco so `yarn build` runs it automatically), notification sound/mute/logout logic (BUG-453/600, L280-287), training SDK script in index.html (CR-053), any route/guard in App.js, any order/payment/API/transform code.

## 2. Exact Edits

### F1 — `craco.config.js`
**E1.1** after L3 `require("dotenv").config();` add:
```js
// BUG-661: build id baked into bundle + written to version.json (prod) — 'dev' in craco start
process.env.REACT_APP_BUILD_ID = process.env.NODE_ENV === 'production' ? String(Date.now()) : 'dev';
```
(craco build sets `NODE_ENV=production` before loading this file — verified `@craco/craco/dist/scripts/build.js` L3.)

**E1.2** inside `configure: (webpackConfig) => {` after the existing `webpackConfig.plugins.push(...)` block (Compat fix, ends ~L75) add:
```js
      // BUG-661: emit build/version.json with the same build id (overwrites public/version.json stub)
      if (process.env.NODE_ENV === 'production') {
        webpackConfig.plugins.push({
          apply: (compiler) => compiler.hooks.thisCompilation.tap('BuildVersion', (compilation) => {
            compilation.hooks.processAssets.tap(
              { name: 'BuildVersion', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
              () => compilation.emitAsset('version.json', new webpack.sources.RawSource(JSON.stringify({ buildId: process.env.REACT_APP_BUILD_ID })))
            );
          }),
        });
      }
```
Note: CRA copies `public/` to `build/` before webpack runs → emitted asset overwrites the stub.

### F2 — NEW `public/version.json`
```json
{"buildId":"dev"}
```
Preview QA: change to `{"buildId":"dev2"}` to simulate a release; revert after test.

### F3 — NEW `src/hooks/useAppVersionCheck.js`
```js
// BUG-661: detects a new release by comparing baked build id with /version.json (OD-661-06/08)
import { useEffect, useState } from 'react';

const BUILD_ID = process.env.REACT_APP_BUILD_ID;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // OD-661-08

export const useAppVersionCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    if (!BUILD_ID) return undefined;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      fetch(`${process.env.PUBLIC_URL}/version.json?t=${Date.now()}`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((v) => { if (v?.buildId && String(v.buildId) !== BUILD_ID) setUpdateAvailable(true); })
        .catch(() => {});
    };
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check); // OD-661-02
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);
  return updateAvailable;
};
```
Not gated by auth (works on login page). Network failure → silent, retried next tick.

### F4 — `src/App.js`
**E4.1** imports: after L84 add
```js
import { useAppVersionCheck } from "./hooks/useAppVersionCheck"; // BUG-661
```
**E4.2** replace L115-153 (`// BUG-597: shows when…` comment through closing `}` of `SwUpdateBanner`) with — **same styles/testids (OD-661-09), timer removed (OD-661-01), text changed**:
```js
// BUG-597 / BUG-661: manual update banner — persistent until "Update now" is tapped (OD-661-04)
function SwUpdateBanner() {
  const { swUpdatePending, triggerSwUpdate } = useNotifications();
  const versionUpdatePending = useAppVersionCheck(); // BUG-661
  if (!swUpdatePending && !versionUpdatePending) return null;
  return (
    <div
      data-testid="sw-update-banner"
      style={{ /* UNCHANGED — copy existing style object L130-136 verbatim */ }}
    >
      New version available
      <button
        data-testid="sw-update-reload-btn"
        onClick={() => { triggerSwUpdate(); window.location.reload(); }}
        style={{ /* UNCHANGED — copy existing button style L142-146 verbatim */ }}
      >
        Update now
      </button>
    </div>
  );
}
```
`useEffect` import on L1 stays (used by `AppTitleSync`). Removes BUG-621/622 10 s `setTimeout(triggerSwUpdate)`.

### F5 — `src/contexts/NotificationContext.jsx`
**E5.1** DELETE from the auth-gated effect: L236-245 (`handleVisibilityChange` + its comment), L247-268 (`if (navigator.serviceWorker) { … ready.then … controllerchange … visibilitychange }`), and cleanup line L273 (`document.removeEventListener('visibilitychange', handleVisibilityChange); // BUG-621`). Keep L213-235 (sounds, foreground, SW `message` listener) and L270-276 rest of cleanup unchanged.

**E5.2** ADD a new effect directly after that auth effect's closing `}, [isAuthenticated]);` (before `// Reset on logout`):
```js
  // BUG-661: SW update detection — NOT gated by auth (H2); reload only after user-triggered skipWaiting (H6)
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return undefined;
    const hadController = !!sw.controller; // first-time install claim must not reload the page
    const markIfWaiting = (reg) => { regRef.current = reg; if (reg.waiting) setSwUpdatePending(true); };
    const onVisible = () => { if (document.visibilityState === 'visible') sw.ready.then(markIfWaiting); };
    const onControllerChange = () => { if (hadController) window.location.reload(); };
    sw.ready.then((reg) => {
      markIfWaiting(reg);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && reg.waiting) setSwUpdatePending(true); });
      });
    });
    sw.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      sw.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
```
`triggerSwUpdate` (L317-322), state L85-86, context value L340-354 UNCHANGED.

### F6 — `public/index.html`
ADD inside `<head>` directly after the existing DataCloneError `<script>` (L15) — before CRA-injected bundle tags:
```html
        <!-- BUG-661: boot guard — stale index.html after a release → bundle 404 → reload once with cache-buster -->
        <script>
          (function () {
            var KEY = 'mg_boot_retry';
            function retry() {
              try {
                if (window.__APP_BOOTED__ || sessionStorage.getItem(KEY)) return;
                sessionStorage.setItem(KEY, '1');
              } catch (e) { return; }
              var u = new URL(window.location.href);
              u.searchParams.set('v', Date.now());
              window.location.replace(u.toString());
            }
            window.addEventListener('error', function (e) {
              var t = e.target;
              if (t && t.tagName === 'SCRIPT' && t.src && t.src.indexOf('/static/js/') !== -1) retry();
            }, true);
            window.addEventListener('load', function () { setTimeout(function () { if (!window.__APP_BOOTED__) retry(); }, 5000); });
          })();
        </script>
```
Ignores `/training/` SDK errors (path filter). One reload max per failure; flag cleared on successful boot (F7).

### F7 — `src/index.js`
after L11 (`);` closing `root.render`) add:
```js
window.__APP_BOOTED__ = true; // BUG-661: boot guard (public/index.html)
try { sessionStorage.removeItem('mg_boot_retry'); } catch (e) { /* storage unavailable */ }
```

### F8 — `src/components/guards/ErrorBoundary.jsx`
Replace L20-24:
```js
    if (isChunkError && !window.location.search.includes('retry=1')) {
      const sep = window.location.search ? '&' : '?';
      window.location.replace(window.location.href + sep + 'retry=1');
      return { hasError: false, error: null }; // reload in progress — suppress red screen
    }
```
with:
```js
    // BUG-661 OD-661-07: session-scoped, time-boxed retry (max once per 60 s) instead of sticky ?retry=1
    let last = 0;
    try { last = Number(sessionStorage.getItem('mg_chunk_retry_at')) || 0; } catch (e) { /* storage unavailable */ }
    if (isChunkError && Date.now() - last > 60000) {
      try { sessionStorage.setItem('mg_chunk_retry_at', String(Date.now())); } catch (e) { /* storage unavailable */ }
      window.location.reload();
      return { hasError: false, error: null }; // reload in progress — suppress red screen
    }
```
Update L14-15 comment to reference BUG-661.

## 3. Hosting — nginx snippet for owner's DevOps (outside repo, OD-661-10)
```nginx
# MyGenie POS frontend — BUG-661
location = /index.html            { add_header Cache-Control "no-cache" always; }
location = /version.json          { add_header Cache-Control "no-store" always; }
location = /firebase-messaging-sw.js { add_header Cache-Control "no-cache" always; }
location /static/                 { add_header Cache-Control "public, max-age=31536000, immutable" always; }
location /                        { try_files $uri /index.html; add_header Cache-Control "no-cache" always; }
```
Deploy step must run `yarn build` (version.json is produced automatically). Verify after deploy: `curl -sI https://<prod>/ | grep -i cache-control` → `no-cache`; `curl -s https://<prod>/version.json` → new `buildId`.

## 4. Execution Sequence
1. Entry verification — confirm anchors: craco L3 & plugin block; App.js L84, L115-153; NotificationContext L213-277; index.html L15; index.js L6-11; ErrorBoundary L14-24.
2. F2, F3 (new files) → F1 → F4 → F5 → F6 → F7 → F8.
3. Restart frontend (craco.config change) → compile: 0 new errors/warnings.
4. `yarn build` locally once → check `build/version.json` buildId ≠ `dev`, `build/index.html` contains boot guard before bundle `<script>`; then delete `build/`.
5. Self-test V1-V12; registry checklist.

## 5. Verification Matrix
| # | Edit | How to verify | Auto? |
|---|---|---|:---:|
| V1 | F2/F3/F4 | Preview: no banner on load (`sw-update-banner` count 0) | YES |
| V2 | F3/F4 | Edit `public/version.json` → `dev2`, switch tab away/back → banner appears with "New version available" + "Update now" | YES |
| V3 | F4 | Banner stays > 30 s, no auto reload (OD-661-01) | YES |
| V4 | F4 | Tap Update now → page reloads; revert file → no banner; no loop | YES |
| V5 | F3 | Banner appears on login page (logged out) | YES |
| V6 | F3 | Interval: with `dev2` set while tab visible and no focus change → banner within 5 min (or temporarily inspect timer) | NO |
| V7 | F1 | `yarn build` → `build/version.json` = `{"buildId":"<timestamp>"}` | YES (bash) |
| V8 | F6/F7 | Block `/static/js/main.*.js` (Playwright route abort) → exactly 1 reload with `?v=`; 2nd failure → no further reload | YES |
| V9 | F6/F7 | Normal load → `window.__APP_BOOTED__===true`, `mg_boot_retry` absent, no reload | YES |
| V10 | F5 | No page reload on first notification permission grant (hadController guard); notifications/sounds still work (BUG-453/600) | NO |
| V11 | F8 | Throw ChunkLoadError (route abort on lazy chunk — Folio checkout) → one reload, no `retry=1` in URL; second within 60 s → error screen | YES |
| V13 | F4 | **Banner visible on EVERY page** (owner req 2026-11-09): with `dev2` set, check login `/`, restaurant picker, dashboard, order entry/cart, Collect Bill, reports, PMS front desk, settings + with an open modal/dialog. Basis: `SwUpdateBanner` rendered at App root (App.js L160) outside `<Routes>`, `zIndex: 9999` (no app element ≥ 10000 — grep verified). Exception: ErrorBoundary crash screen (banner hidden by design). | YES (Playwright per route) |
| V12 | F4 | Banner does not cover Pay / Collect Bill / cart footer (desktop 1920 + mobile 390) — OD-661-09 verify only | YES (screenshot) |

## 6. Risk Register
| # | Risk | Mitigation | Verified by |
|---|---|---|---|
| R1 | Boot-guard reload loop | sessionStorage one-shot; cleared only after successful boot | V8, V9 |
| R2 | `version.json` cached → banner forever / never | `cache:'no-store'` + `?t=`; nginx `no-store` | V2, §3 curl |
| R3 | BUG-622 loop (SW waiting re-detected) | Update now still posts skipWaiting before reload; version path SW-independent | V4 |
| R4 | Banner overlaps Pay | verify only (owner keeps design) | V12 |
| R5 | Prod pipeline skips craco | version step inside `craco build` = `yarn build`; hook no-ops if file missing | V7, §3 |
| R6 | Unexpected reload on first SW claim | `hadController` guard | V10 |
| R7 | Old index.html still cached → Update now reloads old bundle | nginx no-cache (§3); boot guard | §3 curl |
| R8 | ChunkLoadError loop | 60 s time-box | V11 |

## 7. Post-Code Registry Checklist (Implementation agent)
- [ ] `registry.json` BUG-621 → `GATE_5A_IMPLEMENTED (v2)`, files list F1-F8
- [ ] `BUG_TRACKER.md` row updated
- [ ] `FILE_OWNERSHIP.md` rows for all 8 files
- [ ] `// BUG-661` markers on every edit
- [ ] BUG-597 + BUG-622 notes: superseded behaviour (timer removed) → flag BUG-597 for closure
- [ ] QA handover `handover/QA_HANDOVER_BUG621_V2_<date>.md` from §5 + nginx snippet §3 for DevOps

## 8. Owner Gate
Gate 4 GO required (P0, HIGH). Fast Lane: NOT eligible.
