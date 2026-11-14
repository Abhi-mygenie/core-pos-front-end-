# BUG-621 — Investigation Review (second opinion on BUG-621_INVESTIGATION_REPORT_2026_11_09.md)

**Date:** 2026-11-09 · **Role:** INVESTIGATION (review; no code changed) · **Steps used:** 6/10
**Reviewed:** `investigations/BUG-621_INVESTIGATION_REPORT_2026_11_09.md` + `handover/SESSION_HANDOVER_2026_11_09_BUG621_INVESTIGATION.md` (owner-uploaded zip)
**Registry state:** BUG-621 = GATE_5B_QA_PASS (2026-10-26) · BUG-622 (loop regression) = GATE_5B_QA_PASS · BUG-597 = GATE_5A_IMPLEMENTED → owner reports banner still never shows ⇒ BUG-621 is effectively **REOPENED**.

## 1. Summary
- Attached report's H1 (auto `skipWaiting`) ELIMINATED — **agree** (SW L79-83: skipWaiting only via `postMessage`).
- Attached report's root cause H2 (auth gate L214) — **partially agree, downgraded to CONTRIBUTORY**. Its premise "PWA users land on the login page after a deploy" is not supported: token is read from `localStorage` at mount (`AuthContext.jsx:9` → `authService.getToken()` L106-107), so a logged-in PWA user has `isAuthenticated=true` on first render and the detection code DOES run.
- **New primary hypothesis H5 (HIGH, code/spec):** the banner can only appear when the **service-worker file itself changes**. `public/firebase-messaging-sw.js` is a static file with no build/version stamp, registered at a constant URL (`firebase.js:82`, query = fixed Firebase config). Browsers fire `updatefound` / create `reg.waiting` only if the SW script bytes differ. Normal deploys change only the React bundle → SW identical → no `waiting` worker → `swUpdatePending` never true → banner never shows, logged-in or not.
- Classification: FE_BUG (design gap from BUG-597) · Confidence: MEDIUM-HIGH (traced + spec; not yet empirically reproduced on a real deploy)
- Consequence: the attached report's proposed fix (move detection to an un-gated `useEffect`) is **necessary-but-not-sufficient** — it would still never fire on a normal deploy.

## 2. Hypotheses
| # | Hypothesis | Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Auto skipWaiting in install | code `firebase-messaging-sw.js` L79-89 | ELIMINATED (agree) | message-based skipWaiting + clients.claim |
| H2 | Detection gated by `isAuthenticated` | code `NotificationContext.jsx` L213-277 | CONFIRMED in code, but impacts only logged-out users | L214 guard |
| H2a | PWA users are logged out after deploy | code `AuthContext.jsx:9`, `authService.js:106` | NOT SUPPORTED — token persists in localStorage | |
| H3 | SW registered only after notification permission | code `firebase.js:82` | CONFIRMED (agree, secondary) | |
| H5 | SW bytes never change between deploys → no `waiting` | code: SW static, no version, constant URL; grep craco/package for SW stamping → none | **CONFIRMED by code/spec, needs deploy test** | `public/firebase-messaging-sw.js` (90 lines, no version), no build step touching it |
| H6 | `controllerchange` reload has no `hadController` guard + no cleanup | code L265-267 | CONFIRMED (side issue) | first-time notification grant → `clients.claim()` → controllerchange → unexpected page reload; listener duplicates on re-login |

## 3. Data Flow Trace
```
Deploy (new JS bundle, SAME firebase-messaging-sw.js)
→ browser SW update check (navigation / 24h) → byte-compare → IDENTICAL → no install, no updatefound
→ NotificationContext L248 ready.then: reg.waiting = null
→ swUpdatePending=false → App.js SwUpdateBanner L127 returns null
BREAK POINT: update signal is tied to SW version, but SW version never changes on app deploys.
```
Note: SW has no `fetch` handler / caches (only notificationclick/message/activate), so the SW is NOT what keeps users on old code; stale versions come from long-lived open PWA sessions / HTTP-cached `index.html`.

## 4. Evidence
Code refs above. Uploaded docs saved: `investigations/BUG-621_INVESTIGATION_REPORT_2026_11_09.md`, `handover/SESSION_HANDOVER_2026_11_09_BUG621_INVESTIGATION.md`.

## 5. Recommendations
- **Validation step before planning (owner/QA, ~10 min):** on preprod PWA (logged in, notifications granted): deploy a FE-only change → reopen app → DevTools › Application › Service Workers: is there a "waiting" worker? Expected per H5: NO.
- **Fix direction for Planning (OWNER_DECISION):**
  - **Option 1 — App-version check (recommended):** build writes `version.json` (build id); app polls it on load + `visibilitychange` + every N min; mismatch → show existing `SwUpdateBanner` → reload. Independent of SW/notifications/auth.
  - **Option 2 — Stamp SW per build:** inject build id into SW (or registration URL `?v=<build>`) so every deploy creates a `waiting` worker; keep current banner flow. Still requires SW registered (H3) and the un-gated effect (H2 fix).
  - Either option should include H2 (un-gated detection) + H6 (`hadController` guard, named handler + cleanup) from the attached report.
- Planning-skip: **NOT eligible** — touches 2-4 files (NotificationContext + build/SW/App), owner design choice needed. Risk MEDIUM (deployment safety; not financial).
- Registry: BUG-621 currently GATE_5B_QA_PASS → recommend status **REOPENED** via INTAKE update (owner approval).

## 6. Retroactive Candidates
BUG-597 status GATE_5A_IMPLEMENTED while BUG-621/622 (its follow-ups) are QA-passed — flag for CLOSURE review after BUG-621 is resolved.

## 7. White-screen root cause (owner follow-up, 2026-11-09)
- Cached/stale `index.html` references hashed bundles (`main.<oldhash>.js`) deleted by the new deploy → 404 → React never boots → white screen.
- `ErrorBoundary.jsx` ChunkLoadError auto-reload (BUG-597) cannot help: it lives inside the bundle that failed to load. It only covers lazy chunks (3 in app). `?retry=1` guard is sticky for the session.
- SW (`firebase-messaging-sw.js`) has no fetch/cache handler → not the cause, cannot fix it.
- Not verified on production yet (need prod URL: check `Cache-Control` on `index.html` and whether old `static/` files are deleted on deploy).

## 8. Owner Decisions (2026-11-09)
| ID | Decision |
|---|---|
| OD-661-01 (keep 10 s auto-reload timer) | **NO** — remove auto-reload. **Manual update only.** |
| OD-661-04 (NEW) update mode | **MANUAL** — update banner stays **always visible** (persistent, not dismissible) until the user taps "Update now"; no forced/automatic reload (protects in-progress orders/payments). |
| OD-661-05 (NEW) keep previous release files on server | **NOT NEEDED** — skipped. |
| OD-661-06 (NEW) detection mechanism | **App-version check (Option 1)** — build id in `version.json`; check on load + `visibilitychange` + interval; mismatch → show banner. Independent of SW / notifications / auth. |
| OD-661-02 (visibilitychange re-check) | **YES** — part of Option 1. |
| OD-661-03 (register SW at startup) | **NOT NEEDED** — moot with Option 1 (detection no longer depends on SW). |

### Locked fix scope (for Planning)
1. **Hosting (DevOps/backend ask):** `index.html` served `Cache-Control: no-cache`; `static/*` `max-age=31536000, immutable`.
2. **FE — inline boot fallback in `public/index.html`:** if the main bundle fails to load, reload once with cache-buster (runs before React → prevents white screen).
3. **FE — app-version check (Option 1):** build writes `version.json`; app compares on load / foreground / interval → sets `swUpdatePending`-equivalent flag.
4. **FE — `SwUpdateBanner` (App.js):** remove 10 s auto-timer (BUG-621/622 code); banner persistent + "Update now" button → reload (and `triggerSwUpdate` if SW waiting).
5. **FE — NotificationContext hygiene:** un-gate detection from `isAuthenticated` (H2), `hadController` guard + named `controllerchange` handler with cleanup (H6).
- Affected files (est.): `public/index.html`, `src/App.js`, `src/contexts/NotificationContext.jsx`, build script (`package.json`/`craco.config.js`) for `version.json`. 3-4 files, no R5 hotspots, no financial logic. Risk: MEDIUM-HIGH (every release / all clients). Planning skip: NOT eligible.
- Related: BUG-597 (white screen on deploy), BUG-622 (loop fix — auto-timer to be removed).

## 9. Investigation Closure
- **Status: CLOSED 2026-11-09.** Root causes: (a) banner never triggers — SW never changes per release (H5); (b) white screen — stale `index.html` → deleted bundles → 404 before React boots. Secondary: H2 auth gate, H6 controllerchange guard.
- Pending validation (QA/owner, non-blocking for planning): prod `Cache-Control` headers on `index.html`.
- Next: **INTAKE update** BUG-621 → status REOPENED with revised root cause + decisions → **PLANNING Gate 2/3**.
