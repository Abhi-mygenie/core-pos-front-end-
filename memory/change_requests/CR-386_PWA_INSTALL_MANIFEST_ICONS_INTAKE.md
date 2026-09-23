# CR-386 — PWA install support: `manifest.json` + PNG icons + `index.html` links (desktop icon, standalone window; fixes push-notification icon) — INTAKE 2026-09-23

Source: **OWNER-REPORTED** ("We are making a desktop icon so the app can open as an app instead of Chrome browser. The logo is not coming on the icon — shows 'C' instead." + "Is PWA the right approach?") → investigated 2026-09-18 as `INV-PWA-ICON-001` (`investigations/INVESTIGATION_2026_09_18_PWA_ICON_MISSING.md`) and `INV-PWA-APPROACH-001` (`investigations/INVESTIGATION_2026_09_18_PWA_APPROACH.md`) → validated + registered 2026-09-23 (INTAKE role, ALPHA v0.7).
Sprint: **`sep_bug_closure`** (owner 2026-09-23). Gate: **1 (INTAKE)**.

## Classification
| Field | Value |
|---|---|
| Type | **CR** (new capability — installable app; the "C" icon is Chrome's fallback, not a defect in existing code) |
| Priority | **P2 — MEDIUM** (works in browser today; owner-wanted UX for cashier stations) |
| Risk | **LOW** — new static files + 2–3 `<link>`/`<meta>` lines in `public/index.html`; zero React logic, no API, no state, no hotspot |
| Classification | CONFIG_ISSUE |
| Confidence | **CONFIRMED** (owner screenshot of "C" shortcut; agent confirmed all files absent) |
| Code reality | **NONE** at HEAD `1be4055` |
| Fast Lane eligible | NO (2 files + binary assets) |
| Planning skip eligible | Not by the strict rule (2 files) — LOW risk; owner may approve a skip exception at Gate 4 |

## Expected behaviour
Chrome/Edge show the **Install app** icon in the address bar; installed app opens in a **standalone window** (no address bar/tabs) with the **MyGenie logo** on desktop/taskbar/Alt-Tab. Push notifications show the MyGenie icon instead of a broken/default icon.

## Reference
INV-PWA-APPROACH-001 evaluated PWA vs Electron/Tauri/Chrome Apps → **PWA is the right approach** (no new framework). Note: its claim that Chrome *requires* a service worker is **outdated** — Chrome dropped the SW/fetch-handler install requirement (Chrome 108 mobile / 112 desktop). Current criteria: HTTPS + valid manifest (`name`/`short_name`, `icons` 192 + 512, `start_url`, `display`). Existing `firebase-messaging-sw.js` (registered `src/config/firebase.js:68`) is a bonus, not a prerequisite.

## Current state (confirmed against HEAD 2026-09-23 — `evidence/CR-386/CR-386_code_reality_2026_09_23.txt`)
| Item | Status |
|---|---|
| `public/manifest.json` | ABSENT |
| `public/logo192.png`, `public/logo512.png`, `public/favicon.ico` | ABSENT |
| `public/index.html` | no `<link rel="manifest">`, no `<link rel="apple-touch-icon">`; `theme-color` = `#000000` (:6); favicon = external CDN SVG (:8) |
| `public/firebase-messaging-sw.js:40–41` | `icon`/`badge: '/logo192.png'` → **404 today** (push icons broken; fixed for free by this CR) |
| `src/App.js:133` | `path="/"` → `<LoginPage />` — `start_url: "/"` lands installed app on Login (auth redirect behaviour to be confirmed in IA) |

## Scope (proposed — Planning to lock)
| Change | File |
|---|---|
| NEW manifest (`short_name`, `name`, `icons` 192/512, `start_url`, `display`, `theme_color #329937`, `background_color`) | `public/manifest.json` |
| NEW icons (PNG 192×192, 512×512; optional `favicon.ico`) | `public/` |
| `<link rel="manifest" href="%PUBLIC_URL%/manifest.json">`, `<link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png">`, `theme-color` → `#329937` | `public/index.html` |
| **NOT touched** | any `src/` file, `firebase-messaging-sw.js` |

## Duplicate check
**DISTINCT.** Searched `manifest`, `pwa`, `desktop icon`, `logo192` in registry/tracker/CR registry/gaps — none. Related: CR-011-AUDIT-01 "manifest" hit is `auditManifest.js` (unrelated).

## Blast radius
- Code files: 1 (`index.html`, +2–3 lines) + 1 new JSON + 2–3 binary assets — **SMALL**
- Hotspots: NO

## Owner decisions (OPEN — carried from INV-PWA-ICON-001)
| # | Decision | Status |
|---|---|---|
| OD-386-01 | Icon source: owner provides `logo192.png` + `logo512.png`, **or** agent converts the CDN SVG (`…/dwikbb41_logo111.svg`) to PNG | **OPEN — blocks implementation** |
| OD-386-02 | `short_name` shown under the icon: "MyGenie POS" or shorter | OPEN |
| OD-386-03 | `display`: `standalone` (recommended) vs `minimal-ui` | OPEN |
| OD-386-04 | `start_url`: `/` (Login) vs `/dashboard` (relies on auth redirect) | OPEN (new, from validation) |

## Post-deploy owner step
Delete the existing "Create shortcut" icon; open the app; click **Install** in the address bar (old shortcut cannot be updated in place).

## Investigation-doc validation notes (2026-09-23)
ICON doc VALID (line drift: SW icon refs at :40–41, doc says 38–39). APPROACH doc conclusion VALID; SW-requirement claim stale. Docs **not modified** (owner instruction).

## Next
Planning Gate 2 → Gate 3 (tiny) → Gate 4 GO. Blocked on OD-386-01 for assets.
