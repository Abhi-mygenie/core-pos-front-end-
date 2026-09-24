# sep_bug_closure — CONSOLIDATED GATE 3 IMPLEMENTATION PLAN (CR-386 · BUG-453 · BUG-451 · BUG-452)

**Date:** 2026-09-24 · **Role:** PLANNING (ALPHA v0.7) — Stage: Implementation Plan ONLY · **Sprint:** `sep_bug_closure`
**Owner words:** "Gate 3 GO follow agent prompt, gates and rules" (2026-09-24) · Gate 2 CLOSED 2026-09-24 · plan shape = ONE doc, FOUR independently closable sections (owner 2026-09-24)
**Code Reality (re-checked at HEAD `27fca43` / remote `e499e13b`, 2026-09-24):** NONE for all four — every current→new line below verified by grep this session (line numbers current as of this HEAD).
**Conflict Pre-Check (FILE_OWNERSHIP + registry, 2026-09-24):** `DashboardPage.jsx` is touched by §B (BUG-453, `toggleSnooze` L1280–1290) and §D (BUG-452, `handleTableClick` L1462–1497 + `handleOrderTypeChange` L1504–1511) — **different regions, parallel-safe; execute §B before §D**. `api/constants.js` §C vs CR-385 (AIOSELL block, open) — different block, parallel-safe. No other open item on any file below. `AppProviders.jsx` (R7) not involved.
**Risk (R21):** CR-386 LOW · BUG-453 MEDIUM · BUG-451 HIGH (class) / LOW (edit) · BUG-452 HIGH. None financial (R6).
**Hotspots (R5):** `DashboardPage.jsx` (§B +2 additive, §D +4 additive) · `OrderEntry.jsx` (§D comment-only) · `LoadingPage.jsx` (§C literal→constant). Regression checklists in each section.
**Order / waves (owner-locked):** §A CR-386 → §B BUG-453 → §C BUG-451 → §D BUG-452 · **Wave 1** = A+B+C (one Gate 4 GO, one Gate 5 QA run, one owner smoke) · **Wave 2** = D (own Gate 4 GO, QA, smoke).
**Inputs:** IAs `impact/{CR-386,BUG-453,BUG-451,BUG-452}_IMPACT_ANALYSIS.md` · intakes `change_requests/*_INTAKE.md` · evidence dirs `evidence/{CR-386,BUG-451,BUG-452,BUG-453}/`.

> Gate status lines are at the end of each section. Owner may close / GO sections individually by ID.

---

## §A — CR-386 · PWA install support (manifest + icons + head links) · LOW

### A1. Exact edits
| # | File | Current | New |
|---|---|---|---|
| A-1 | `public/manifest.json` | absent | **NEW** — `{ "short_name": "MyGenie POS", "name": "MyGenie Restaurant POS", "icons": [ {"src":"logo192.png","type":"image/png","sizes":"192x192"}, {"src":"logo512.png","type":"image/png","sizes":"512x512"}, {"src":"logo512-maskable.png","type":"image/png","sizes":"512x512","purpose":"maskable"} ], "start_url": "/", "scope": "/", "display": "standalone", "theme_color": "#329937", "background_color": "#ffffff" }` (relative icon `src` — CRA convention; resolves against manifest URL at `/`) |
| A-2 | `public/logo192.png` | absent | **NEW** — byte copy of `memory/evidence/CR-386/approved_A_logo192.png` |
| A-3 | `public/logo512.png` | absent | **NEW** — copy of `approved_A_logo512.png` |
| A-4 | `public/logo512-maskable.png` | absent | **NEW** — copy of `approved_A_maskable_logo512.png` |
| A-5 | `public/index.html` L6 | `<meta name="theme-color" content="#000000" />` | `<meta name="theme-color" content="#329937" /> <!-- CR-386 -->` |
| A-6 | `public/index.html` after L8 (`<link rel="icon" …svg>` stays) | — | `+ <link rel="manifest" href="%PUBLIC_URL%/manifest.json" /> <!-- CR-386 -->` · `+ <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" /> <!-- CR-386 -->` |

Not changed: existing external SVG favicon (L8) — keep; `<title>` (L12, `AppTitleSync` owns it at runtime); `firebase-messaging-sw.js` (its `/logo192.png` refs at L40–41 become valid for free).

### A2. Execution sequence
1. Copy PNGs (A-2..A-4) → 2. write `manifest.json` (A-1) → 3. edit `index.html` (A-5, A-6) → 4. `yarn build` → 5. verify matrix A.

### A3. Verification Matrix — A
| # | Check | How | Auto? |
|---|---|---|---|
| VA-1 | Manifest served | `curl -sI <preview>/manifest.json` → 200, JSON content-type | YES (curl) |
| VA-2 | Icons served | `curl -sI <preview>/logo192.png`, `/logo512.png`, `/logo512-maskable.png` → 200 `image/png` | YES |
| VA-3 | Installability | Chrome DevTools → Application → Manifest: 0 errors/warnings, 3 icons listed, "installable" | NO |
| VA-4 | Install flow | Address-bar Install → standalone window (no browser UI), taskbar shows wordmark icon; `start_url /` → LoginPage → authenticated redirect to `/loading` → `/dashboard` (`LoginPage.jsx:32–36`) | NO |
| VA-5 | Push icon | DevTools → Application → Service Workers → Push (or real FCM) → notification shows logo instead of default bell | NO |
| VA-6 | Head tags | `curl -s <preview>/ \| grep -c 'rel="manifest"\|apple-touch-icon\|#329937'` → 3 | YES |
| VA-7 | Build | `yarn build` exit 0, `build/manifest.json` + 3 PNGs present, 0 new warnings | YES |
| VA-8 | Regression | login → loading → dashboard → OrderEntry open/close unchanged (only head tags changed) | NO |
| VA-9 | R25 | no API calls in this item — N/A | — |

### A4. Scope lock (R14)
WILL change: `public/index.html` (3 lines), `public/manifest.json` (NEW), `public/logo192.png`, `public/logo512.png`, `public/logo512-maskable.png` (NEW).
WILL NOT touch: any `src/**`, `public/firebase-messaging-sw.js`, `craco.config.js`, `package.json`, `.env`.

### A5. Risks
| Risk | L | Mitigation |
|---|---|---|
| Ingress serves `manifest.json` with wrong MIME/404 | LOW | VA-1; fall back to absolute `/manifest.json` if `%PUBLIC_URL%` misbehaves |
| Old "Create shortcut" icons don't refresh | Known | Post-deploy owner step: delete old shortcut, re-install (intake) |
| Maskable icon crop on Android | LOW | dedicated maskable variant (22 % padding) |

### A6. Post-Code Registry Checklist — A
```
- [ ] registry.json CR-386 → status GATE_5A_IMPLEMENTED, gate 5, files[] = 5 files above
- [ ] CR_REGISTRY.md CR-386 row → IMPLEMENTED (date), then QA PASS, then CLOSED on owner word
- [ ] FILE_OWNERSHIP.md: public/index.html (+3 lines // CR-386), public/manifest.json NEW, 3 PNGs NEW — "CR-386 IMPL <date>"
- [ ] Code markers: <!-- CR-386 --> on each index.html line (manifest.json/PNGs cannot carry markers — noted in FILE_OWNERSHIP)
- [ ] Owner post-deploy note in handover: re-install shortcut
```
**Gate 3 closed ☑ 2026-09-24 (owner "close gate 3") · Gate 4 GO ☑ 2026-09-24 (owner verbatim "Gate 4 GO") · IMPLEMENTED ☑ commit `3783ee8` · testing_agent ☑ iteration_1 PASS · Gate 5 owner smoke ☐**

---

## §B — BUG-453 · Mute does not stop ringer — Fix A (race guards) + Fix B (per-order mute registry, sound + toast) · MEDIUM

### B0. Gate 3 entry validation (mandatory, from IA §5 — do BEFORE B-1)
Capture one real YTC FCM payload on preprod (console log at `NotificationContext.jsx:72` prints the full payload). Confirm the FCM order-id field equals the `order.orderId` used by `OrderListSection`/`ScanOrderPopOut` (`String(order.orderId)`). Save masked JSON to `evidence/BUG-453/fcm_payload_<date>.json`. If the key differs → STOP, re-declare mapping to owner before coding.

**B0 STATUS: ✅ PASS (Feb 2026)** — evidence: `memory/evidence/BUG-453/B0_fcm_payload_mapping_2026_02.md`.
- Real key is **`payload.data.orderid`** (lowercase, no underscore) — NOT `data.order_id` as originally assumed.
- Value is a **string** (`"1232751"`); card `order.orderId` is a number. Both sides MUST be coerced with `String(...)`.
- Display sequence `notification.body → "Order ID: 000021"` is NOT the mute key.
- No alternate id keys are present in `data`. Plan edits below updated accordingly.

### B1. Exact edits
| # | File:line | Current | New |
|---|---|---|---|
| B-1 | `src/utils/soundManager.js` L74–77 (`error` listener) | `console.error(...); this.currentAudio = null;` | `console.error(...); if (this.currentAudio === audio) this.currentAudio = null; // BUG-453 Fix A: don't wipe a newer audio's reference` |
| B-2 | `src/utils/soundManager.js` L80–83 (`play().catch`) | `console.warn(...); this.currentAudio = null;` | `console.warn(...); if (this.currentAudio === audio) this.currentAudio = null; // BUG-453 Fix A` |
| B-3 | `src/utils/soundManager.js` constructor (after L26 `this.isEnabled = true;`) | — | `+ this.mutedOrders = new Set(); // BUG-453 Fix B: per-order manual mute (OD-453-03)` |
| B-4 | `src/utils/soundManager.js` after `stop()` (after L95) | — | `+ // BUG-453 Fix B — per-order mute registry (OD-453-03/04). Keys are String(orderId).` `muteOrder(id) { this.mutedOrders.add(String(id)); }` · `unmuteOrder(id) { this.mutedOrders.delete(String(id)); }` · `toggleOrderMute(id) { const k = String(id); if (this.mutedOrders.has(k)) this.mutedOrders.delete(k); else this.mutedOrders.add(k); return this.mutedOrders.has(k); }` · `isOrderMuted(id) { return this.mutedOrders.has(String(id)); }` · `clearMutes() { this.mutedOrders.clear(); }` (~18 lines) |
| B-5 | `src/contexts/NotificationContext.jsx` before L131 comment `// Play sound …` (i.e. after POS2-007 block, after the two `console.log` at L128–129) | — | `+ // BUG-453 Fix B (OD-453-04): muted order → no sound, no banner/list entry. Placed AFTER BUG-034 dedup so dedup refs still update. Real FCM key is data.orderid (B0 evidence 2026-02).` `const notifOrderId = String(data.orderid \|\| data.order_id \|\| data.orderId \|\| '');` `if (notifOrderId && soundManager.isOrderMuted(notifOrderId)) { console.log('[Notification] BUG-453 muted order', notifOrderId, '— sound + toast suppressed'); return; }` |
| B-6 | `src/contexts/NotificationContext.jsx` L196 logout effect | `soundManager.stop();` | `soundManager.stop(); soundManager.clearMutes(); // BUG-453: fresh mute state on next login` |
| B-7 | `src/pages/DashboardPage.jsx` imports (after L23) | — | `+ import soundManager from "../utils/soundManager"; // BUG-453` |
| B-8 | `src/pages/DashboardPage.jsx` `toggleSnooze` L1280 body, first line inside | `setSnoozedOrders(prev => {…})` | `+ soundManager.toggleOrderMute(String(orderId)); // BUG-453 Fix B: audio mute follows the visual snooze toggle (OD-453-03)` before the existing `setSnoozedOrders(...)` — **no existing line changed** |
| B-9 | `src/components/dashboard/ScanOrderPopOut.jsx` L22–27 + L46–49 header comments | "NO per-order mute. NO future-sound suppression." / "no global / per-order mute." | rewrite: "Per-order mute EXISTS since BUG-453 (owner override 2026-09-23, OD-453-02/03/04) but lives in `soundManager` via `DashboardPage.toggleSnooze` — this file still calls ONLY `soundManager.stop()` + `onToggleSnooze`. Still NO `play()`, NO `setEnabled()`, NO global mute here." **No logic change** (`handleSnoozeClick` L191–207 already does `stop()` + `onToggleSnooze(String(orderId))`). |
| B-10 | `src/__tests__/utils/soundManager.bug453.test.js` | absent | **NEW** (~60 lines, jest + jsdom): (1) race — mock `HTMLMediaElement.prototype.play` to reject on call 1, resolve on call 2; `play('a'); play('b'); await tick` → `currentAudio` is audio-2 → `stop()` pauses it (spy `pause` called). (2) `toggleOrderMute('123')` → `isOrderMuted(123)` true (number key) → toggle again → false. (3) `clearMutes()` empties. (4) `error` event on audio-1 after audio-2 started → `currentAudio` still audio-2. |

Sidebar Silent Mode precedence unchanged: `play()` L46 `if (!this.isEnabled) return;` still runs first for non-muted orders; for muted orders we never reach `play()`.
FCM without any order id field → `notifOrderId === ''` → never muted (unchanged path).
2-minute local re-pop hide-set in ScanOrderPopOut (R-SNOOZE-9) untouched — visual re-pop with silence is intended.

### B2. Execution sequence
B0 validation → B-1..B-4 (soundManager) → B-10 test red→green for Fix A/B units → B-5, B-6 (context) → B-7, B-8 (Dashboard) → B-9 (comments) → `yarn test soundManager.bug453` → `yarn build` → matrix B.

### B3. Verification Matrix — B
| # | Check | How | Auto? |
|---|---|---|---|
| VB-0 | FCM key mapping | B0 evidence file: `data.orderid` == card `orderId` (Feb 2026 PASS) | NO (curl/console) |
| VB-1 | Fix A race | unit test (1),(4) | YES |
| VB-2 | Mute registry | unit test (2),(3) | YES |
| VB-3 | Mute stops current chime | preprod: 2 YTC FCMs within ~100 ms (or `simulateNotification` ×2 from `NotificationTester`) → press Mute on pop-out → sound stops immediately | NO |
| VB-4 | Retry suppressed (sound + toast) | with order X muted, dispatch another notification for X → no sound, **no NotificationBanner**, console shows the BUG-453 log line | NO |
| VB-5 | Other orders unaffected | notification for order Y while X muted → rings + banner | NO |
| VB-6 | Unmute | press Mute again on X → next X notification rings + banner | NO |
| VB-7 | Silent Mode wins | Sidebar Silent Mode ON → no sound for any order; banner still shows for non-muted | NO |
| VB-8 | Logout clears | mute X → logout → login → notification for X rings | NO |
| VB-9 | Visual snooze regression | OrderCard/TableCard bell dims/undims with the same press; pop-out re-pops after 2 min silently | NO |
| VB-10 | Dedup regression (BUG-034) | duplicate FG+SW delivery of one message → one banner (non-muted) | NO |
| VB-11 | POS2-007 tone override | confirm-order tone profile still applied for non-muted orders | NO |
| VB-12 | Existing tests | `yarn test src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` still green | YES |
| VB-13 | Build | `yarn build` exit 0, 0 new warnings; `grep -rn "BUG-453" src/` hits in 4 files + test | YES |
| VB-14 | R25 | no API calls — N/A | — |

### B4. Scope lock (R14)
WILL change: `src/utils/soundManager.js`, `src/contexts/NotificationContext.jsx`, `src/pages/DashboardPage.jsx` (+2 additive lines, R5), `src/components/dashboard/ScanOrderPopOut.jsx` (comments only), NEW `src/__tests__/utils/soundManager.bug453.test.js`.
WILL NOT touch: `AppProviders.jsx` (R7), `public/firebase-messaging-sw.js`, `components/layout/NotificationBanner.jsx`, `OrderCard.jsx`, `TableCard.jsx`, `utils/toneMapper.js`, socket hooks, any service/transform.

### B5. R5 regression checklist — `DashboardPage.jsx`
Snooze toggle dims card (OrderListSection L146, TableCard, OrderCard) · walk-in Add → order → place (R13) unchanged · stay-on-order (PROD-004) unchanged · no new console errors on dashboard mount/unmount.

### B6. Risks
| Risk | L | Mitigation |
|---|---|---|
| FCM order-id field name / shape differs from card `orderId` | MEDIUM (RESOLVED B0) | Real key is `data.orderid`; value is string → `String()` both sides; fallback chain in B-5 covers alt keys |
| Backend sends a different id per retry | LOW | B0 capture of two retries of one order |
| Guard hides a genuine error for current audio | LOW | guard only skips when audio is not current |
| `soundManager` singleton state leaks across tests | LOW | `clearMutes()` + fresh instance in `beforeEach` |

### B7. Post-Code Registry Checklist — B
```
- [ ] registry.json BUG-453 → status GATE_5A_IMPLEMENTED, gate 5, files[] (5), evidence fcm_payload file ref
- [ ] BUG_TRACKER.md BUG-453 row → IMPLEMENTED / QA PASS / CLOSED on owner word
- [ ] FILE_OWNERSHIP.md rows for the 4 edited files + new test, marker // BUG-453
- [ ] Code markers // BUG-453 on every edited line/block (R18)
- [ ] OPEN_GAPS: none new (anti-rule header rewritten in place)
```
**Gate 3 closed ☑ 2026-09-24 (owner "close gate 3") · Gate 4 GO ☑ 2026-09-24 (owner verbatim "Gate 4 GO") · IMPLEMENTED ☑ commit `3783ee8` · testing_agent ☑ iteration_1 PASS · Gate 5 owner smoke ☐**

---

## §C — BUG-451 · Product list `limit: 500` cap → `PAGINATION.DEFAULT_LIMIT = 2000` · HIGH (class) / LOW (edit)

Probe (R11) DONE 2026-09-24 — `evidence/BUG-451/probe_limit_{500,1000,2000,5000}.json`: yabyum (561 products) `limit=500` → 500 (bug) · `2000` → 561/561, HTTP 200, no cap. No re-probe needed unless backend changes.

### C1. Exact edits
| # | File:line | Current | New |
|---|---|---|---|
| C-1 | `src/api/constants.js` L464 | `DEFAULT_LIMIT: 100, // Load all for caching` | `DEFAULT_LIMIT: 2000, // BUG-451: single-page full menu load; backend probed OK up to 5000 (2026-09-24)` |
| C-2 | `src/pages/LoadingPage.jsx` L6 | `import { API_LOADING_ORDER, LOADING_STATES } from "../api/constants";` | `import { API_LOADING_ORDER, LOADING_STATES, PAGINATION } from "../api/constants"; // BUG-451` |
| C-3 | `src/pages/LoadingPage.jsx` L422 | `productService.getProducts({ limit: 500, offset: 1, type: 'all' })` | `productService.getProducts({ limit: PAGINATION.DEFAULT_LIMIT, offset: 1, type: 'all' }) // BUG-451` |
| C-4 | `src/hooks/useRefreshAllData.js` imports (after L13, last `import`) | — | `+ import { PAGINATION } from '../api/constants'; // BUG-451` |
| C-5 | `src/hooks/useRefreshAllData.js` L29 | `productService.getProducts({ limit: 500, offset: 1, type: 'all' }),` | `productService.getProducts({ limit: PAGINATION.DEFAULT_LIMIT, offset: 1, type: 'all' }), // BUG-451` |
| C-6 | `src/api/services/productService.js` L23–30 (`getAllProducts`, 0 callers) | JSDoc + function | **DELETE** the block; leave `// BUG-451: dead getAllProducts() removed (0 callers)` one-liner in its place |
| C-7 | `src/api/services/__tests__/productService.bug451.test.js` | absent | **NEW** (~25 lines, optional but recommended): mock `api.get` → `getProducts()` with no args calls `API_ENDPOINTS.PRODUCTS` with `params {limit: 2000, offset: 1, type: 'all'}`; `getAllProducts` is not exported |

`settingsService.getCancellationReasons` inherits the new default only when called without `limit` — no live caller does (LoadingPage L491, settingsService L27, insightsService L64 all pass 100). `insightsService.js:62` (10000) untouched.

### C2. Execution sequence
C-1 → C-2/C-3 → C-4/C-5 → C-6 → C-7 → `grep -rn "limit: 500" src/` = 0 → `yarn test productService` → `yarn build` → matrix C.

### C3. Verification Matrix — C
| # | Check | How | Auto? |
|---|---|---|---|
| VC-1 | No literal left | `grep -rn "limit: 500" src/` → 0 hits; `grep -n "DEFAULT_LIMIT: 2000" src/api/constants.js` → 1 | YES |
| VC-2 | Default params | unit test C-7 | YES |
| VC-3 | Boot loads full menu | preprod login as the 561-product restaurant → LoadingPage products station SUCCESS, counter `561 / 561` (was `500 / 561`); Network tab request has `limit=2000` | NO |
| VC-4 | Grid/search see items 501+ | OrderEntry search for a product known to be beyond position 500 (pick from probe JSON) → found | NO |
| VC-5 | Category counts | category chips count == products in that category (vs backend) | NO |
| VC-6 | Sidebar Refresh | ↻ → products count unchanged (561), request `limit=2000` | NO |
| VC-7 | Small-menu regression | cafe103 alias boot → `loaded == total` (< 500), no behaviour change | NO |
| VC-8 | R5 `LoadingPage` sequencing | Tier-2 parallel batch order unchanged; per-station retry (CR-038) still works (offline one call) | NO |
| VC-9 | Build | `yarn build` exit 0, 0 new warnings | YES |
| VC-10 | R25 | GET only — N/A | — |

### C4. Scope lock (R14)
WILL change: `src/api/constants.js` (L464), `src/pages/LoadingPage.jsx` (L6 import + L422, R5), `src/hooks/useRefreshAllData.js` (import + L29), `src/api/services/productService.js` (delete L23–30), NEW test.
WILL NOT touch: `productTransform.js`, `MenuContext`, `insightsService.js`, `settingsService.js`, LoadingPage tier/sequencing logic, any UI.

### C5. Risks
| Risk | L | Mitigation |
|---|---|---|
| Menus > 2000 items in future | LOW | LoadingPage counter exposes truncation; self-healing re-fetch → later intake (Q8) |
| Larger payload on slow links | LOW | +12 % on yabyum; per-station retry exists |
| `DEFAULT_LIMIT` inherited by an unexpected caller | LOW | grep confirmed all live callers pass explicit `limit` |

### C6. Post-Code Registry Checklist — C
```
- [ ] registry.json BUG-451 → GATE_5A_IMPLEMENTED, files[] (4 + test)
- [ ] BUG_TRACKER.md row → IMPLEMENTED / QA PASS / CLOSED on owner word
- [ ] FILE_OWNERSHIP.md rows (constants.js PAGINATION block, LoadingPage L6/L422, useRefreshAllData, productService deletion), marker // BUG-451
- [ ] Code markers // BUG-451 (R18)
- [ ] Intake follow-up: register "self-healing re-fetch when total_size > loaded" as a later CR (owner to confirm at intake)
```
**Gate 3 closed ☑ 2026-09-24 (owner "close gate 3") · Gate 4 GO ☑ 2026-09-24 (owner verbatim "Gate 4 GO") · IMPLEMENTED ☑ commit `3783ee8` · testing_agent ☑ iteration_1 PASS · Gate 5 owner smoke ☐**

---

## §D — BUG-452 · Stale cart after type/table switch → Option B always-clear, shape S1 (remount) · HIGH · Wave 2

Reverses **BUG-334** (owner OD-452-01 + OD-452-05). Silent clear (OD-452-04). Placed items never touched (OD-452-03, by construction — no API call).

### D1. Exact edits
| # | File:line | Current | New |
|---|---|---|---|
| D-1 | `src/pages/DashboardPage.jsx` `handleTableClick` L1462–1497 — insert immediately before `setOrderEntryTable(tableEntry);` (L1485) | — | `+ // BUG-452 (OD-452-01 Option B, S1): switching table while OrderEntry is open remounts it → unplaced draft cleared, no cartsByTable write. Reverses BUG-334.` `if (orderEntryType !== null) setOrderEntryResetNonce(n => n + 1);` |
| D-2 | `src/pages/DashboardPage.jsx` `handleOrderTypeChange` L1504–1511 — insert as first statement | — | `+ // BUG-452 (OD-452-01 Option B, S1): type switch mid-build → remount → clean slate (silent, OD-452-04)` `if (orderEntryType !== null) setOrderEntryResetNonce(n => n + 1);` |
| D-3 | `src/components/order-entry/OrderEntry.jsx` L504–508 (`else if (oldKey !== null)` BUG-334 branch) | 3-line BUG-334 comment, empty branch | keep the branch shape, replace comment: `// BUG-334 carry-forward REVERSED by BUG-452 (owner 2026-09-23, OD-452-01 Option B, S1 remount).` `// After BUG-452 every type/table switch remounts OrderEntry from DashboardPage (key = orderEntryResetNonce),` `// so cartKeyRef is null on entry and this branch is unreachable in the switch path. Kept as a no-op guard.` — **no logic change** |
| D-4 | `src/__tests__/pages/DashboardPage.bug452.test.jsx` | absent | **NEW** (~80 lines, RTL). Because `DashboardPage` is heavy, test the two handlers through a minimal harness: mock `OrderEntry` with a stub that exposes `onOrderTypeChange`/`onSelectTable` buttons and renders `key`-visible marker (e.g. `data-testid="oe-instance"` with a fresh id per mount). Cases: (1) open walk-in → click type "takeAway" → stub remounted (new instance id), `cartsByTable` has no non-empty key (assert via `onCartChange` never called with items) · (2) open table A → select table B → remounted · (3) OrderEntry closed (`orderEntryType === null`) → grid click → **no** nonce bump beyond the normal open · (4) `handleTableClick(null)` (post-prepaid) → returns early, no remount. If the harness proves impractical (DashboardPage provider fan-in), fall back to a pure unit test of the extracted decision `shouldRemountOnSwitch(orderEntryType)` — decision recorded at Gate 5 with owner note. |

**Why S1 works (from IA §2):** remount → `cartKeyRef` starts `null` → `oldKey && oldKey !== newKey` false → W1 write (`OrderEntry.jsx:384–386`) never fires → `savedCart` for the new key is `[]` → occupied table → `orderData` branch (L455–500) loads placed items from the server → else `setCartItems([])`. Every `useState` (customer, notes, address, delivery charge, financials) resets by construction.
**Declaration order note:** `orderEntryResetNonce` `useState` is declared at L1535, after both handlers (L1462, L1504). Safe — handlers are closures invoked on click after render; `no-use-before-define` (react-app preset, `variables: false`) does not flag it. Optional tidy: move the `useState` + CR-008 comment block (L1530–1535) above `handleTableClick` — **not in scope unless Gate 4 says so**.

### D2. Behaviour table (seeds QA)
| Scenario | Today | After |
|---|---|---|
| Walk-in, 3 items, switch to TakeAway | items carried (BUG-334) + copied to `walkIn` key | **cart empty**, `walkIn` key untouched (empty) |
| Table 5, 2 unplaced items, switch to Table 7 (available) | items carried + saved under 5; reopen 5 → stale | **empty draft on 7**; reopen 5 → empty |
| Occupied Table A (placed items) → Table B (occupied) | placed A items written to `cartsByTable[A]`; reopen A → stale snapshot (latent defect) | B shows B's placed items from server; reopen A → fresh from server |
| Occupied A → available B | mixed | B empty draft |
| Add → walk-in → place → close → Add | empty | empty (unchanged) |
| Stay-on-order ON → Collect Bill | fresh walk-in via same nonce (PROD-004) | unchanged |
| `handleTableClick(null)` after prepaid | clears table, no remount | unchanged (returns before D-1) |
| Grid click with OrderEntry closed | opens | unchanged (`orderEntryType === null` → no bump) |
| Merge / Shift entry from dashboard | opens with `initialShowMerge/Shift` | unchanged (type was null) |
| In-OrderEntry table pick while Merge/Shift/Payment modal open | modal stays | **remount closes modal**; `initialShow*` props persist → re-opens on remount — **verify VD-8**, if broken → guard bump with `!initialShowMerge && !initialShowShift && !initialShowPayment` (Gate 5 decision, recorded) |

### D3. Execution sequence
D-3 comment first (truthful registry) → D-2 → D-1 → D-4 test → `yarn test bug452` + existing `src/__tests__/components/order-entry/*` green → `yarn build` → matrix D → BUG-334 code↔registry check.

### D4. Verification Matrix — D
| # | Check | How | Auto? |
|---|---|---|---|
| VD-1 | Type switch clears | unit (1) + preprod: walk-in 3 items → TakeAway → cart empty, no toast/dialog | YES + NO |
| VD-2 | Table switch clears | unit (2) + preprod: T5 items → T7 → empty | YES + NO |
| VD-3 | Old key stays empty | preprod: after VD-2 reopen T5 → empty (INV Trigger 1+2 EXPECTED) | NO |
| VD-4 | Occupied A → occupied B | B's placed items shown; reopen A → A's placed items, financials fresh | NO |
| VD-5 | Placed items never lost (OD-452-03) | server order A unchanged after VD-4 (re-fetch/list) | NO |
| VD-6 | No remount when closed | unit (3): grid click from dashboard → single mount | YES |
| VD-7 | Prepaid null path | unit (4) + preprod: prepaid settle → `onSelectTable(null)` → no remount, OrderEntry state intact | YES + NO |
| VD-8 | Merge/Shift/Payment modal across in-OrderEntry table pick | modal re-opens (or bump guarded — decision recorded) — **DEFERRED to Wave 2 Gate 4 (owner 2026-02)**; final decision recorded there | NO |
| VD-9 | R13 walk-in full flow | Add → items → place → Collect Bill → close → Add → empty | NO |
| VD-10 | PROD-004 stay-on-order | toggle ON → place → Collect Bill → fresh walk-in, no stale items | NO |
| VD-11 | Sidebar Refresh with OrderEntry closed | `cartsByTable` cleared (L545) — unchanged | NO |
| VD-12 | BUG-334 bookkeeping | `grep -n "BUG-334" src/components/order-entry/OrderEntry.jsx` → reversed comment only; registry BUG-334 `reversed_by: BUG-452` present | YES |
| VD-13 | Existing OE tests | `src/__tests__/components/order-entry/*` green | YES |
| VD-14 | Build | `yarn build` exit 0, 0 new warnings | YES |
| VD-15 | R25 | no API calls — N/A | — |

### D5. Scope lock (R14)
WILL change: `src/pages/DashboardPage.jsx` (2 handlers, +4 additive lines, R5), `src/components/order-entry/OrderEntry.jsx` (comment at L504–508 only, R5), NEW `src/__tests__/pages/DashboardPage.bug452.test.jsx`.
WILL NOT touch: `OrderEntry.jsx` effect logic (L378–503, L509–512), `cartsByTable`/`savedCart`/`onCartChange` plumbing (dead after fix — cleanup CR later), `handleCollectBillStayOnOrder`, `AppProviders.jsx`, `CartPanel`, `orderTransform.js`.

### D6. R5 regression checklist — `DashboardPage.jsx` + `OrderEntry.jsx`
Walk-in (R13) end-to-end · dine-in table open/edit/place/bill · takeaway + delivery open/place · occupied room via dineIn flow · merge + shift flows from dashboard · prepaid settle path · stay-on-order · sidebar refresh · search (BUG-332) unaffected · snooze (BUG-453, same file) unaffected.

### D7. Risks
| Risk | L | Mitigation |
|---|---|---|
| Accidental type click wipes a half-built cart | Accepted (owner Option B + silent, OD-452-04) | none by decision |
| Remount closes in-OrderEntry modal | LOW–MED | VD-8; guarded bump fallback |
| Remount re-runs mount effects (CRM enrich, etc.) | LOW | identical to any fresh open |
| R5 ×2 | — | D6 checklist mandatory; Wave 2 alone |
| §F drift on BUG-334 | LOW | D-3 + VD-12 |

### D8. Post-Code Registry Checklist — D
```
- [ ] registry.json BUG-452 → GATE_5A_IMPLEMENTED, files[] (2 + test); BUG-334 reversed_by already set — add "code comment rewritten <date>"
- [ ] BUG_TRACKER.md BUG-452 row → IMPLEMENTED / QA PASS / CLOSED on owner word; BUG-334 note in same section
- [ ] FILE_OWNERSHIP.md rows: DashboardPage.jsx L1485/L1505 (+4 // BUG-452), OrderEntry.jsx L504–508 comment
- [ ] Code markers // BUG-452 (R18)
- [ ] OPEN_GAPS_REGISTER: "cartsByTable / savedCart / onCartChange / R1 branch / L545 / L1540 dead after BUG-452 — cleanup CR" (owner OK needed to file)
```
**Gate 3 closed ☑ 2026-09-24 (owner "close gate 3") · Gate 4 GO ☐ (Wave 2)**

---

## Cross-section
- **Handover after Gate 5 per wave:** QA handover inherits VA/VB/VC (Wave 1) then VD (Wave 2). Hotspot touched in both waves → QA regression scope = handover regression + 2 cross-flow tests (walk-in place, occupied table edit).
- **Owner post-deploy notes:** CR-386 re-install shortcut · BUG-452 staff note "switching order type/table clears the unplaced cart".
- **Not in this plan (owner OK pending):** OPEN_GAPS entries for the stale 2026-09-18 INV docs; INV CART doc §11 raw credential masking (R20).

```
Implementation Plan complete: CR-386 · BUG-453 · BUG-451 · BUG-452 (one consolidated doc, 4 sections)
Code reality: NONE ×4 (re-verified HEAD 27fca43)
Edits: A 6 (5 files) · B 10 (4 files + 1 test) · C 7 (4 files + 1 test) · D 4 (2 files + 1 test) = 27 edits / 15 files (3 new tests, 4 new static assets)
Verification matrix: A 9 · B 15 · C 10 · D 15 = 49 checks (automated 14, manual 32, N/A 3)
Owner decisions needed: none — all locked. Gate-5 recorded decisions: D-4 harness fallback. **VD-8 (modal on remount) DEFERRED to Wave 2 Gate 4 (owner 2026-02).**
Scope: see §A4/§B4/§C4/§D5.

Gate 3: CLOSED per section (reconfirmed 2026-02 by owner "close gate 3"). Gate 4: OPEN.
B0 (BUG-453 FCM mapping): PASS 2026-02 — real key `payload.data.orderid`; evidence `memory/evidence/BUG-453/B0_fcm_payload_mapping_2026_02.md`.
Wave 1 diff preview format (owner 2026-02): ONE consolidated message (CR-386 + BUG-453 + BUG-451).
Wave 1 (A+B+C): Gate 4 GO 2026-09-24 → IMPLEMENTED commit `3783ee8` (zero line drift vs plan at HEAD `7aa95c4`; only deviation: B-10 test uses sound key `new_order` and dir `src/__tests__/utils/` created) → yarn build exit 0 → testing_agent `/app/test_reports/iteration_1.json` PASS, 0 findings → Gate 5A.
Known pre-existing (NOT regression, stash-verified at clean HEAD): VB-12 `ScanOrderPopOut.test.jsx` 22/29 red upstream — out of scope, not touched.
Next: owner manual smoke (VA-3..5, VB-3..11, VC-3..8) → QA PASS → CLOSED per item → Wave 2 Gate 4 (BUG-452 diff + VD-8 A/B/C decision).
```

