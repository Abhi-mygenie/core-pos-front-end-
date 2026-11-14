# BUG-661 (supersedes BUG-621) — Impact Analysis (Gate 2)

**Item:** PWA manual update — banner never shows + white screen on release
**Date:** 2026-11-09 · **Role:** PLANNING (stage: Impact Analysis only) · **Severity:** P1 (owner to confirm) · **Risk:** HIGH (every release, all clients; no financial logic)
**Code Reality:** PARTIAL — `SwUpdateBanner` (App.js L115-153), `swUpdatePending` / `triggerSwUpdate` / SW `waiting` detection (NotificationContext.jsx L213-277, L317-322), SW message-based `skipWaiting` + `clients.claim` (firebase-messaging-sw.js L79-89), ErrorBoundary ChunkLoadError reload (ErrorBoundary.jsx L13-26). MISSING: app-version check, persistent manual banner, boot fallback, un-gated detection, controllerchange guard.
**Intake:** `change_requests/BUG-621_PWA_UPDATE_BANNER_NEVER_SHOWS_INTAKE.md` (v2 section) · **Investigation:** `investigations/BUG-621_INVESTIGATION_REVIEW_2026_11_09.md` (CLOSED)
**Owner decisions on record:** OD-661-01 NO auto-reload · 02 YES foreground re-check · 03 NOT NEEDED · 04 MANUAL, banner always visible · 05 NOT NEEDED (old files) · 06 app-version check

## 1. Conflict Pre-Check
| Item | Status | Overlap | Verdict |
|---|---|---|---|
| BUG-597 | GATE_5A_IMPLEMENTED | Same banner / NotificationContext SW block / ErrorBoundary | Supersede its banner + timer behaviour; keep ChunkLoadError path. Flag BUG-597 for closure after BUG-621 |
| BUG-622 | GATE_5B_QA_PASS | 10 s `triggerSwUpdate` timer in `SwUpdateBanner` (App.js L119-125) | Timer REMOVED per OD-661-01 — loop risk must be re-verified (see R3) |
| BUG-453 / BUG-600 | 5A / 5B | NotificationContext sound/mute + logout reset (L280-287) | Different block — parallel-safe; do not touch |
| CR-386 | 5A | `public/index.html` manifest / icons | Different lines — parallel-safe |
| CR-053 | — | `index.html` training SDK script | Keep untouched |
| CR-490 + ~15 CRs | 5B | `App.js` routes / guards | Different region (routes) — parallel-safe |

No blocker.

## 2. Data Flow Trace (current vs target)
**Current (broken):**
```
Release (new bundle, SAME firebase-messaging-sw.js) → browser SW byte-compare = identical → no updatefound
→ NotificationContext L247 ready.then: reg.waiting=null (and only runs if isAuthenticated, L214)
→ swUpdatePending=false → SwUpdateBanner returns null
Stale index.html → <script src=/static/js/main.OLD.js> → 404 → React never mounts → white screen
  (ErrorBoundary inside the failed bundle → cannot run)
```
**Target:**
```
Build → REACT_APP_BUILD_ID baked into bundle + build/version.json {buildId}
App load / visibilitychange(visible) / every N min (no auth gate)
  → fetch('/version.json?t=now', {cache:'no-store'}) → buildId ≠ baked id → updatePending=true
  (SW reg.waiting also sets updatePending — kept as secondary trigger)
→ Persistent banner "New version available — Update now" (no timer, not dismissible)
→ tap → triggerSwUpdate() if SW waiting → window.location.reload()
index.html inline boot guard: main bundle <script> error OR app not booted in X s
  → reload once with ?v=<ts> (sessionStorage guard) → fresh index.html → new bundles
Hosting: index.html + version.json no-cache; static/* immutable
```

## 3. Affected Code
| File | Lines | Change type | Notes |
|---|---|---|---|
| `src/App.js` | L115-153 `SwUpdateBanner` | MODIFY | remove 10 s timer (BUG-621/622), text → "New version available", button "Update now", persistent; placement (OD-661-09) |
| `src/contexts/NotificationContext.jsx` | L236-268 SW block, L317-322 `triggerSwUpdate`, context value L354 | MODIFY | `controllerchange` → named handler + `hadController` guard + cleanup; SW detection moved out of `isAuthenticated` effect (H2) |
| NEW `src/hooks/useAppVersionCheck.js` (or inside NotificationContext) | — | ADD | version.json poll on load / visibilitychange / interval; no-op when `NODE_ENV!=='production'` or 404 |
| `src/index.js` | render call | MODIFY (1 line) | set `window.__APP_BOOTED__=true` for boot guard |
| `public/index.html` | `<head>` | ADD inline script | boot fallback (resource-error capture on `/static/js/` + boot timeout), sessionStorage single-retry guard |
| `package.json` `build` script and/or `craco.config.js` webpack configure | L78 / L60-90 | MODIFY | inject `REACT_APP_BUILD_ID`; emit `build/version.json` |
| `src/components/guards/ErrorBoundary.jsx` | L20-24 | OPTIONAL (OD-661-07) | sticky `?retry=1` → sessionStorage guard |
| `public/firebase-messaging-sw.js` | — | NO CHANGE | message-based skipWaiting stays |
| Hosting config (outside repo) | — | ASK | `Cache-Control` rules |

Blast radius: 4-6 files (1 new), no R5 hotspot, no API/transform/financial code. Scope: MEDIUM.

## 4. Downstream Consumers
- `useNotifications().swUpdatePending / triggerSwUpdate` — only `SwUpdateBanner` (App.js) consumes (grep verified). Renaming/adding `updatePending` is contained.
- Logout reset effect (L280-287) — must not clear update flag on logout (banner should show on login page too).
- `ErrorBoundary` wraps `AppProviders` → banner lives inside providers; if a render crash shows the fallback, banner is hidden (acceptable).
- Training SDK (CR-053) script in index.html — boot guard must ignore `/training/` resource errors.
- Firebase messaging registration (`firebase.js:82`) — unchanged.
- Dev server (`craco start`) — no `version.json` → check must silently no-op (avoid banner in preview).

## 5. Approach Options (for Gate 3)
| Area | Option A (recommended) | Option B |
|---|---|---|
| Build id | `package.json`: `"build": "REACT_APP_BUILD_ID=$(date +%s) craco build && node scripts/write-version.js"` | craco webpack plugin emitting `version.json` via `DefinePlugin` + `compilation.emitAsset` (no package.json change, more code) |
| Version check location | New hook `useAppVersionCheck` used by `SwUpdateBanner` | Inside NotificationContext (already a large provider) |
| Boot guard | Inline script: capture `error` on `<script src*="/static/js/">` + 15 s boot timeout → reload once | Timeout only (simpler, slower recovery) |

## 6. Risk Register
| # | Risk | Mitigation |
|---|---|---|
| R1 | Reload loop (boot guard) | sessionStorage one-shot flag + `?v=` cache-buster; clear flag after successful boot |
| R2 | Banner shown forever if `version.json` cached by CDN | `cache:'no-store'` + `?t=` query; hosting no-cache rule |
| R3 | BUG-622 loop returns (SW waiting re-detected after reload) | Update now posts `skipWaiting` before reload (kept); version path doesn't depend on SW |
| R4 | Persistent banner overlaps Pay / cart footer buttons on order screens | Placement decision OD-661-09 (top bar recommended) + verify on Collect Bill, Cart, Dashboard, mobile |
| R5 | Build pipeline doesn't run the new script (prod uses different build command) | OD-661-10: confirm prod build command; check must no-op gracefully if `version.json` missing |
| R6 | First notification grant reloads page (`controllerchange` w/o guard) | `hadController` guard |
| R7 | Interval polling cost | 5 min + only when `visible` |
| R8 | User ignores banner indefinitely (manual) — runs stale version against new backend | Accepted by owner (OD-661-04); banner non-dismissible keeps reminder visible |

## 7. Owner Decision Queue
- **OD-661-07** ErrorBoundary sticky `?retry=1` → switch to sessionStorage guard in this fix? (Recommended: YES, 2-line change)
- **OD-661-08** Version re-check interval while app is open? (Recommended: every 5 minutes + on foreground)
- **OD-661-09** Banner placement: slim **top bar** across the screen (recommended — never covers Pay/cart buttons) vs current bottom-centre pill
- **OD-661-10** Who/what builds & hosts production frontend (Emergent deploy, own server/nginx, S3/CloudFront, Docker)? Needed for the `Cache-Control` ask and to confirm the build command runs the version step.
- **Severity confirm:** P1.

## 8. Verification Seeds (for Gate 3)
1. Build twice with different build ids → app on old build → foreground/interval → banner appears, stays, no auto reload.
2. Tap Update now → reload → new build id → banner gone; no loop.
3. Logged-out (login page) → banner still appears.
4. Simulate stale index.html (block `/static/js/main.*.js` → 404) → single auto-reload with `?v=` → app boots; second failure → no loop.
5. Dev/preview (`craco start`) → no banner, no console errors.
6. First-time notification grant → no unexpected page reload.
7. Banner doesn't cover Pay / Collect Bill / cart footer (desktop + mobile).
8. Notifications/sounds (BUG-453/600) unaffected.

## 9. Owner Decisions Resolved (2026-11-09)
| ID | Decision |
|---|---|
| OD-661-07 | ✅ YES — ErrorBoundary sticky `?retry=1` → sessionStorage one-shot guard |
| OD-661-08 | ✅ (b) — version check on load + `visibilitychange` (visible) + **every 5 minutes** while visible. Load accepted: ~50-byte static `version.json` from web server, no API/DB (≈0.3 req/s per 100 devices). Socket push (no polling) noted as future alternative, not in scope. |
| OD-661-09 | ✅ KEEP EXISTING banner design (`SwUpdateBanner`, dark bottom-centre pill + green button). Change only: text → "New version available — Update now", button "Update now", remove 10 s auto-timer, persistent/non-dismissible. QA verifies no overlap with Pay / Collect Bill / cart footer (R4 → verification only, no redesign). |
| OD-661-10 | ✅ OWN DEPLOYMENT (owner-managed server). Gate 3 to include ready nginx snippet: `index.html` + `version.json` → `Cache-Control: no-cache`; `/static/` → `max-age=31536000, immutable`. Version step must be inside `yarn build` script so own pipeline runs it automatically. |
| Severity | ✅ **P0** (owner upgrade from P1) |
| Preview testability (owner query) | ✅ Testable in preview: add dev `public/version.json` (`{"buildId":"dev"}`) + dev baked id `dev`; QA edits file value to simulate a release → banner → Update now. Production build overwrites `version.json`. Replaces "no-op in dev" note in §4 / §8-5. |

## 10. Gate 2 Status
- All ODs resolved. **Gate 2 COMPLETE — HOLD at gate (owner instruction 2026-11-09: stay at gate).** Do NOT start Gate 3 until owner says proceed.
