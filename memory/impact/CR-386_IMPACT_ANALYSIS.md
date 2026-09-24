# CR-386 — IMPACT ANALYSIS (Gate 2) — PWA install support: manifest + icons + index.html links

**Date:** 2026-09-23 · **Role:** PLANNING (ALPHA v0.7) — Stage: Impact Analysis ONLY · **Sprint:** `sep_bug_closure`
**Code Reality:** NONE — `public/manifest.json`, `logo192.png`, `logo512.png` absent; `index.html` has no manifest/apple-touch-icon link (HEAD `1be4055`, `evidence/CR-386/CR-386_code_reality_2026_09_23.txt`)
**Conflict Pre-Check:** `public/index.html` — last modifier CR-053-ENV-01 (training SDK loader, `%REACT_APP_TRAINING_ENABLED%`); no open item touches `index.html` or `public/` root assets in `registry.json`. **No conflict.** `firebase-messaging-sw.js` NOT touched (last CR-385 P5 guards ran on it read-only).
**Risk:** LOW (static assets + 3 head tags; no `src/`, no state, no API)
**Intake:** `change_requests/CR-386_PWA_INSTALL_MANIFEST_ICONS_INTAKE.md` · ODs all LOCKED (01 Option A icon · 02 "MyGenie POS" · 03 `standalone` · 04 `/`)

---

## 1. Data / behaviour flow (today → after)

```
TODAY
Chrome → GET / → index.html (no manifest) → "Create shortcut" only
  → letter icon from document.title (AppTitleSync sets restaurant name → "C" for Chai Chabutra)
  → opens WITH browser UI
firebase-messaging-sw.js showNotification({ icon:'/logo192.png' }) → 404 → default bell icon

AFTER
Chrome → GET / → index.html <link rel="manifest"> → GET /manifest.json (200)
  → installability: HTTPS ✅ + name/short_name ✅ + icons 192+512 ✅ + start_url ✅ + display standalone ✅
  → "Install MyGenie POS" in address bar → standalone window, logo icon, own taskbar entry
  → start_url "/" → LoginPage → isAuthenticated ⇒ navigate (LoginPage.jsx:32) → /loading → /dashboard
SW showNotification icon '/logo192.png' → 200 → logo in push toasts (no SW change)
```

## 2. Files affected

| # | File | Change | Lines | Risk |
|---|---|---|---|---|
| 1 | `public/manifest.json` | **NEW** — `short_name "MyGenie POS"`, `name "MyGenie Restaurant POS"`, `icons[192, 512, 512 maskable]`, `start_url "/"`, `display "standalone"`, `theme_color "#329937"`, `background_color "#ffffff"`, `scope "/"` | ~20 (new) | LOW |
| 2 | `public/logo192.png` | **NEW** — `evidence/CR-386/approved_A_logo192.png` (Option A, owner-approved) | binary | LOW |
| 3 | `public/logo512.png` | **NEW** — `approved_A_logo512.png` | binary | LOW |
| 4 | `public/logo512-maskable.png` | **NEW** — `approved_A_maskable_logo512.png` (`purpose: "maskable"`) | binary | LOW |
| 5 | `public/index.html` | `theme-color` `#000000` → `#329937` (L6); **+** `<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />`; **+** `<link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />` | 1 mod + 2 add | LOW |

**Files NOT touched:** every `src/**` file · `firebase-messaging-sw.js` · `craco.config.js` · `package.json` · `.env`.

## 3. Downstream consumers / interactions

| Consumer | Effect |
|---|---|
| `firebase-messaging-sw.js:40–41` (`/logo192.png`) | Push icon becomes valid — positive side effect, zero code change |
| `src/config/firebase.js:68` SW registration with query params | Unchanged; SW scope `/` already satisfies "has SW" (not required since Chrome 112 anyway) |
| `AppTitleSync` (dynamic `document.title` = restaurant name) | Installed window title still follows `document.title`; manifest `name` is only used for the icon label / install prompt — acceptable (owner locked "MyGenie POS") |
| CRA/CRACO build | `public/` copied verbatim to `build/`; `%PUBLIC_URL%` substituted — same mechanism as existing `/training/training-sdk.js` |
| Existing users' "Create shortcut" icons | Not auto-updated — owner must delete and re-install (documented in intake) |
| Cache / offline | None — no caching SW added; app still requires network (no change) |
| `theme-color` change | Android Chrome address-bar tint turns green in browser mode too — cosmetic, brand-consistent |

## 4. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Emergent preview / preprod ingress serves `manifest.json` with wrong MIME or 404 | LOW | Verification step: `curl -I <host>/manifest.json` → 200 `application/json` (or `application/manifest+json`) |
| `%PUBLIC_URL%` vs absolute `/` | LOW | App is served from root on all envs (`homepage` not set in `package.json`); `%PUBLIC_URL%` resolves to `""` → `/manifest.json`. Either form works; use `%PUBLIC_URL%` for CRA convention |
| Wordmark icon small on 192 px taskbar | Accepted by owner (Option A) | Designer brief issued for square mascot mark — drop-in, same filenames |
| Maskable icon crops star/letters on Android | LOW | Dedicated maskable variant with 22 % padding (`approved_A_maskable_logo512.png`) |
| iOS Safari: no install prompt, "Add to Home Screen" manual | Known platform behaviour | `apple-touch-icon` covers the icon; out of scope otherwise |

## 5. Owner decisions — all LOCKED at Gate 1 (no new ones)
OD-386-01 Option A ✅ · OD-386-02 "MyGenie POS" ✅ · OD-386-03 `standalone` ✅ · OD-386-04 `/` ✅ (redirect confirmed at `LoginPage.jsx:32–36`).

## 6. Verification approach (seeds Gate 3 matrix)
1. `curl -sI <preview>/manifest.json` → 200 · `curl -sI <preview>/logo192.png` → 200 `image/png`
2. Chrome DevTools → Application → Manifest: no errors, 3 icons listed, installability "✓"
3. Address-bar Install icon appears after ~30 s engagement; installed window has no browser UI
4. Push notification (or SW `showNotification` from DevTools) shows the logo
5. `yarn build` exit 0; `build/manifest.json` + PNGs present
6. Regression: login → loading → dashboard unchanged (only head tags changed)

## 7. Scope lock (for Gate 3)
WILL change: `public/index.html`, `public/manifest.json` (new), 3 PNGs (new).
WILL NOT touch: any `src/**`, `firebase-messaging-sw.js`, build config, env.

## 8. Planning-skip / Fast Lane
Not Fast Lane (2 files + assets). Gate 3 plan will be ≤ 1 page; owner may collapse Gate 3 into Gate 4 GO if desired (LOW risk, no code).

---
```
Impact Analysis complete: CR-386
Code reality: NONE · Conflict: NONE · Risk: LOW
Files WILL change: public/index.html, public/manifest.json (NEW), public/logo192.png, public/logo512.png, public/logo512-maskable.png (NEW)
Files WILL NOT touch: src/**, firebase-messaging-sw.js, craco.config.js, package.json, .env
Owner decisions: none open
Next: Gate 3 Implementation Plan (owner GO)
```
