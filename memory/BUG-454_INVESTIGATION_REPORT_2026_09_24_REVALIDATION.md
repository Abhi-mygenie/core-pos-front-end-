# BUG-454 — INVESTIGATION REPORT (REVALIDATION): "buzzer never rang" vs "rang once, not again"
## Role 6 — INVESTIGATION (ALPHA v0.7)

```
Date:           2026-09-24
Trigger:        Owner shared Firefox console (user for whom sound NEVER rang) and asked to
                revalidate the earlier claim that the 1.9 MB forty_five_sec_buzzer.wav load
                failure is the root cause.
Env probed:     https://pos-uat.mygenie.online (Cloudflare-fronted static host)
Tools:          curl header/timing probes + real Firefox 155 (Playwright) + Chrome, headless
Steps used:     9 / 10
Code changed:   NONE (investigation only)
Evidence dir:   /app/memory/evidence/BUG-454/
```

---

## 1. Summary

> **⚠ FINAL CONCLUSION (supersedes the table below — see §11 Addendum 2, §12 Addendum 3, 2026-09-24):**
> **"Never rang" = FCM push never reached the browser. Root cause is UPSTREAM of the frontend.**
> Owner reproduced with fresh Firefox login + token obtained + permission Allowed + Ringer On: socket `scan-new-order` drew the pop-up instantly, **zero FCM arrived**, no `play()` was attempted. Socket and FCM are independent by design (owner-confirmed): socket = pop-up, FCM = buzzer; `soundManager.play` is called only from `NotificationContext` (grep-verified). Nothing in `soundManager.js`, autoplay, or the sound files sits before the break point.
> **Owner-confirmed backend model:** one `fcm_token` per employee, most-recent login overwrites (H-B2 = design behaviour) → explains shared-account "this browser never rings". The fresh-login reproduction still needs the backend send log (brief Q2) + Firefox-token-intact check (Q4).
> **Classification:** BACKEND_BUG (token storage/targeting) · alternate ENVIRONMENT (Firefox push transport) pending owner test T1. **Confidence HIGH** that it is delivery, not playback.
> **F5 (ring from socket) WITHDRAWN** by owner. **Next:** `backend_briefs/BACKEND_BRIEF_BUG-454_2026_09_24.md` Q1–Q5 + owner T1/T2. Registry: `INVESTIGATED_ROOT_CAUSE_UPSTREAM`.
> Layer (A) below (per-play re-download → "rang late / rang once, not again") remains a valid, separate, secondary frontend/hosting finding (F2/F3).

Original revalidation table (kept for history; (B) sub-cause rows superseded by the box above):

| Field | Value |
|---|---|
| Root cause | **Two different failures were being treated as one bug.** (A) "Rang once, then not" = playback-layer: every `play()` re-downloads the sound from origin through Cloudflare (no edge cache); origin latency is highly variable (0.4 s → 9 s+, one run stalled >20 s), so the buzzer can start late or fail with `NotSupportedError … not suitable` (Firefox's wording for an HTTP/network load failure). (B) "Never rang" (this screenshot) = **delivery-layer**: **no FCM message ever reached the page** — no `[Notification]` log, no `play()` attempt, no `Play blocked`, no `Playback error`. Nothing in `soundManager.js` could have fixed user B. |
| Classification | (A) CONFIG_ISSUE (hosting: no CDN cache, wrong MIME, misnamed MP3s) + FE_BUG (per-play re-fetch via `cloneNode()`) · (B) ENVIRONMENT / BACKEND_ASK (FCM permission/token state on that Firefox profile) |
| Confidence | (A) MEDIUM-HIGH — stall reproduced in real Firefox against UAT; the exact `not suitable` error was not reproduced (it needs an origin/CDN error response) · (B) HIGH that it is not a playback bug; MEDIUM on which delivery sub-cause (needs 1 console command from the user, see §6) |
| Previous claim status | **"1.9 MB WAV is the sole root cause" — PARTIALLY CORRECT, OVERSTATED.** Size is an amplifier, not the mechanism. The file is not a WAV (it is MP3) and Firefox decodes it fine; the fragile part is the per-play origin fetch. And it does not explain user B at all. |
| Autoplay claim (RC-1 from BUG-453 report) | **Still valid for Firefox cold loads** (Firefox has no media-engagement heuristic, so a persisted-session reload with zero clicks blocks `play()` until first click). It was "debunked" earlier based on Chrome behaviour. **Not the cause for user B** (no play attempt happened), but it will bite Firefox users once delivery is fixed. |

---

## 2. What the console screenshot proves (user B — sound never rang, Firefox)

| Line in screenshot | Meaning |
|---|---|
| `[Firebase] Initialized successfully` | SDK init OK (config present). |
| `[SoundManager] Preloaded 14 sounds` — appears immediately at boot, before any login log | `NotificationContext` only preloads when `isAuthenticated` is already true → **persisted session / page reload**. `requestFCMToken()` lives only in `LoginPage.handleLogin` → **in this session no permission check, no SW registration, no token refresh happened**. Whatever FCM state this Firefox profile has comes from an earlier login. |
| No `[Firebase] Current notification permission…`, no `[Login] FCM result…` | Confirms the above. |
| No `[Notification] ====== INCOMING NOTIFICATION ======`, no `Foreground message`, no `SW forwarded message` | **No FCM payload reached the page** in the visible window. |
| No `[SoundManager] Play blocked…` / `Playback error…` | **No `play()` was attempted** → autoplay and media-load hypotheses are irrelevant for this user. |
| `Firefox can't establish a connection to wss://presocket…` then `Connected successfully` | Socket reconnected fine. Sockets drive order lists, not the buzzer (soundManager is called only from `NotificationContext`, grep-verified). Not related. |
| `Cookie "__cf_bm" has been rejected for invalid domain` ×7, `/cdn-cgi/challenge-platform/…/main.js` | Cloudflare **Bot Management / JS Detections is active** on the POS host and its bot cookie is being rejected by Firefox. Harmless for the app, but it means Cloudflare cannot persist a bot score for this browser — a possible source of sporadic 403/challenge responses on sub-resource fetches (incl. `/sounds/*`) — see H-A3. |
| `11 errors` badge, 9 visible | **2 errors are below the fold** — needed (§6). |

---

## 3. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H-A1 | Firefox cannot decode `forty_five_sec_buzzer.wav` (too large / bad format) | Byte-inspect all 14 files; load+play each in real Firefox & Chrome against UAT | **ELIMINATED as a decode problem.** 13/14 "wav" files are not WAV: 11 are MP3 (ID3), `swiggy_new_order` raw MP3 frames, `order_rejected` raw **AAC/ADTS**; only `order_accepted` is RIFF/WAV. Firefox sniffs and plays the MP3s (45-s file: 48.1 s duration, PLAY_OK). **`order_rejected.wav` fails in Firefox** (`MEDIA_ERR_SRC_NOT_SUPPORTED`, "Failed to init decoder") — separate P2 defect. | `BUG-454_ff_vs_chrome_media_probe.json` |
| H-A2 | Every play re-fetches from origin; origin latency varies → late/failed buzzer | curl headers; 3 fresh-context Firefox runs replicating `preload → cloneNode → play` with network timing | **CONFIRMED.** `cf-cache-status: DYNAMIC` on every sound (Cloudflare never caches `.wav` by default and origin sends no `Cache-Control`), `content-type: application/octet-stream` + `nosniff`. Time-to-headers for the 1.9 MB file ranged 0.43 s → **8.9 s** across runs; one earlier run had **3 consecutive clones stuck at readyState 0 for >20 s** while curl fetched the same file in 2.2 s. `cloneNode()` always starts a new resource load. | `BUG-454_uat_sound_headers.txt`, `BUG-454_uat_full_headers.txt`, `BUG-454_ff_clone_replay_probe.json`, `BUG-454_ff_repeat_probe.json` |
| H-A3 | The earlier user's `NotSupportedError: …not suitable` was a transient HTTP/network failure on the sound fetch (Cloudflare 403/5xx, dropped connection), not a decode failure | Code path of Firefox `NotifyLoadError` + curl with Firefox UA | **CONSISTENT, NOT REPRODUCED.** Firefox emits exactly this message when the media channel returns non-2xx or aborts before metadata; a decode failure would say "Failed to init decoder" (as seen for `order_rejected`). curl with Firefox UA → 200. Cloudflare Bot Management active (see §2) is the most plausible sporadic non-2xx source but unproven. | §2, `BUG-454_ff_vs_chrome_media_probe.json` |
| H-B1 | User B never delivered an FCM token: Notification permission on that Firefox profile is `default`/`denied` (Firefox "Not now" leaves `default`; code treats it as denied, shows one toast, logs in without token, never re-asks) | Code trace `firebase.js:41-57`, `LoginPage.jsx:56-78`; nothing else in `src/` ever calls `requestFCMToken` (grep) | **PRIMARY CANDIDATE — NEEDS 1 CONSOLE VALUE.** Fits: persisted session, zero `[Notification]` logs, zero play attempts. | grep `requestFCMToken` → only LoginPage |
| H-B2 | Token superseded: same account later logged in elsewhere; backend keeps one `fcm_token` per employee → this browser silently stops receiving | Code trace `authTransform.js:51` (`fcm_token` sent on login), `constants.js:9` (deregistered on logout) | **OPEN — BACKEND_ASK.** Frontend cannot tell how many tokens/devices the backend stores. | — |
| H-B3 | Firefox push transport unavailable (private window → no ServiceWorker; corporate firewall blocking `wss://push.services.mozilla.com`) | Reasoning + Firefox behaviour | **OPEN.** Would surface as `[Firebase] Token error` at original login, not visible in a later persisted session. | — |
| H-B4 | Autoplay blocked on cold load (BUG-453 RC-1) | Console inspection | **ELIMINATED for user B** — no `Play blocked` warning, no play attempt. **Still valid in general for Firefox** (no MEI heuristic; per-document activation). | §2 |

---

## 4. Data Flow Trace — where each user's chain breaks

```
Backend → FCM → [Firefox push service] → SW (firebase-messaging-sw.js) → page (onMessage / postMessage)
   → NotificationContext.processNotification            ← USER B: chain never reaches here (no log)
   → soundManager.play(key)
   → audioCache[key].cloneNode()                        ← new element = new HTTP fetch, every time
   → GET /sounds/<key>.wav  (Cloudflare DYNAMIC → origin, 0.4–9 s+, occasionally fails)
   → play() waits for HAVE_FUTURE_DATA                  ← USER A: late start, or load error →
                                                          NotSupportedError "…not suitable" → silent
```

---

## 5. Root-cause table (revised)

| # | Cause | Layer | Affects | Confidence |
|---|---|---|---|---|
| RC-A1 | Sounds are fetched from origin on every play (`cloneNode()` + no CDN cache + no `Cache-Control`); variable origin latency; 1.9 MB file amplifies | Hosting config + FE | "rang once, then not", late buzzer | MEDIUM-HIGH (stall reproduced) |
| RC-A2 | Wrong MIME (`application/octet-stream` + `nosniff`) and 13 MP3/AAC files named `.wav`; `order_rejected.wav` is AAC → Firefox cannot decode at all | Assets/hosting | Firefox: `order_rejected` always silent; general fragility | HIGH (reproduced) |
| RC-B1 | FCM never delivered to this browser: permission not granted / token never sent / token superseded / push transport blocked. App never re-checks or re-registers after the first login | FE + backend contract | "never rang" | HIGH that it's delivery; MEDIUM on sub-cause |
| RC-C | Firefox autoplay block on persisted-session cold load (no click yet) | Browser policy | Firefox users, first alert after reload | HIGH (browser-documented), not user B's case |

**What the earlier "1.9 MB WAV" claim got right:** the per-play network fetch of a large, uncached asset is real and intermittent.
**What it got wrong:** it is not a WAV, Firefox decodes it fine, the size is not the mechanism, and it says nothing about users for whom nothing ever rings.

---

## 6. Owner / user actions needed (cheap, decisive)

> **SUPERSEDED 2026-09-24** — the permission snippet below was answered (permission = Allowed, §10) and the fresh-login reproduction (§11) eliminated all browser-side causes. **Current owner actions:** T1 (Firebase Console test push to the Firefox token) and T2 (`pushManager.getSubscription()` endpoint) — see §11 and `backend_briefs/BACKEND_BRIEF_BUG-454_2026_09_24.md`. Backend question answered by owner: **one token per employee, last login wins** (§12).

Historical (answered):
On user B's Firefox, in the console, paste and share the output (no secrets involved):
```js
({ perm: Notification.permission,
   sw: await navigator.serviceWorker.getRegistrations().then(r => r.map(x => x.active?.scriptURL)),
   private: !('serviceWorker' in navigator) })
```
- `perm !== "granted"` → RC-B1/H-B1 confirmed (user dismissed/blocked Firefox's prompt at first login).
- `sw` empty → SW never registered on this profile → H-B3.
- Also: scroll the console to the **2 hidden errors** and filter by `Firebase` / `Notification`.

Backend question (BACKEND_ASK): does `employee-login` store **one `fcm_token` per employee** (last device wins) or one per device? If one-per-employee, any second login of the same account anywhere silences the first device (H-B2).

---

## 7. Recommendations (for PLANNING — no code in this role)

| # | Fix | Files | Risk | Planning-skip eligible |
|---|---|---|---|---|
| F1 | Re-check `Notification.permission` and (re)register FCM token on every authenticated boot, not only in `handleLogin`; surface a persistent "Alerts disabled — click to enable" banner when not `granted` (Firefox needs a click to show the prompt) | `LoadingPage.jsx` or `NotificationContext.jsx`, `firebase.js` | MEDIUM (hotspot `LoadingPage.jsx` if placed there) | NO → Gate 2-3 |
| F2 | Stop re-fetching per play: decode once into memory (Web Audio `AudioBuffer`) or keep one `Audio` element per key and reuse it (`currentTime = 0; play()`) instead of `cloneNode()` | `soundManager.js` | LOW | borderline (>10 lines) → Gate 2-3 recommended |
| F3 | Hosting: serve `/sounds/*` with `Cache-Control: public, max-age=31536000, immutable`, correct `Content-Type`, and a Cloudflare cache rule; rename files to `.mp3` / re-encode `order_rejected` (AAC) to MP3 | build/public assets + hosting config | LOW (config) | owner/devops action |
| F4 | Firefox autoplay unlock on first user gesture (BUG-453 RC-1) | `soundManager.js` | LOW | YES (owner approve) |
| — | Do **not** replace the 45-s file with the 5-s file as a "fix" — it only shortens the download; RC-B1 and RC-C remain untouched | | | |

---

## 8. Evidence Artifacts (`/app/memory/evidence/BUG-454/`)
- `BUG-454_uat_sound_headers.txt`, `BUG-454_uat_full_headers.txt` — Cloudflare/MIME/cache headers
- `BUG-454_ff_media_probe.py` → `BUG-454_ff_vs_chrome_media_probe.json` — Firefox vs Chrome per-file load/play
- `BUG-454_ff_clone_replay_probe.py` → `BUG-454_ff_clone_replay_probe.json` — the >20 s stall run
- `BUG-454_ff_event_timeline.py` → `BUG-454_ff_event_timeline.json` — media event timeline (fast run)
- `BUG-454_ff_repeat_probe.py` → `BUG-454_ff_repeat_probe.json` — 3 fresh-context runs with network timing (0.4 s → 8.9 s TTFB)
- Owner screenshot (Firefox console, user B) — described in §2; not stored (contains profile data)

## 9. Retroactive Candidates
NONE.

## 10. Addendum — owner clarification (2026-09-24, later same day)

Owner: user B was on **this pod's preview URL** (`pos-front-staging-3.preview.emergentagent.com`), and the Firefox
site-permission panel shows **"Send notifications: Allowed"**; sidebar shows **"Ringer On"**.

| Re-check | Result |
|---|---|
| H-B1 (permission not granted) | **ELIMINATED** — permission is Allowed for the preview origin. |
| Sidebar Silent Mode | **ELIMINATED** — "Ringer On" → `soundManager.isEnabled = true`. |
| Playback layer on the *preview* host | Re-probed in real Firefox + Chrome against the preview: all sounds load and play (45-s buzzer 48.1 s PLAY_OK; `order_rejected` still fails in Firefox). Preview serves `content-type: audio/wav`, **`cache-control: no-store, no-cache, must-revalidate`**, `cf-cache-status: DYNAMIC` → the browser is *forbidden* from caching → every play is a full 1.9 MB re-download from this pod. Same RC-A1 mechanism, stricter than UAT. Evidence: `BUG-454_preview_headers.txt`, `BUG-454_PREVIEW_ff_vs_chrome_media_probe.json`. |
| `__cf_bm` cookie rejection | Explained: Cloudflare sets `Domain=preview.emergentagent.com`, which Firefox treats as a public-suffix-like parent → rejects. Harmless noise. |
| Conclusion for user B | Unchanged: **no FCM ever reached the page.** With permission granted and the ringer on, the remaining candidates are all about the **token on the server side**, not the browser: |

Remaining ranked hypotheses for "never rang" (user B):

| # | Hypothesis | Why it fits | How to confirm |
|---|---|---|---|
| H-B2 | **Token superseded** — the same `saurav (super owner)` account was logged in on another browser/device (Chrome, UAT, phone) *after* the Firefox login, and the backend keeps **one `fcm_token` per employee** (last login wins) | Owner uses one account across several browsers while testing; Firefox login was older → its token was replaced | BACKEND_ASK to Laravel team; or controlled probe: log in twice via curl with two dummy `fcm_token` values on a **throw-away test account** and compare `firebase_token` in each response (login response echoes `firebase_token` — `authTransform.js:20`). **Must NOT be run on the owner's real account** — it would overwrite the live token. |
| H-B2b | **Deregistered by a logout elsewhere** — `employee-logout` (CR-124) deregisters "the" FCM token; if the owner logged out of the same account on another device, the shared token was removed | Same one-token-per-employee assumption | Same backend question |
| H-B5 | Token never obtained on this Firefox at the original login (`getToken` failed — e.g. Firefox push-service subscription error) — login proceeds silently without a token | Code logs in anyway (`LoginPage.jsx:76-80`), only a console warn at that time | User B console: `indexedDB.databases().then(d => d.map(x => x.name))` → `firebase-messaging-database` present means a token was issued on this profile; absent → H-B5 |
| H-B6 | The 2 still-hidden console errors name the cause directly | 11 errors, 9 visible | Scroll / filter `Firebase` |

Design gap common to all of these (frontend, in scope for Planning): **the app has no way to notice it has lost its registration.** Token is requested once at login, never re-validated on boot, never refreshed, and there is no server round-trip to confirm "this device is currently registered."

## 11. Addendum 2 — DECISIVE reproduction by owner (2026-09-24, fresh login, Firefox, preview)

Owner logged out → logged in again in Firefox on the preview URL → console showed the FCM token being obtained →
placed a real Scan & Order → **order pop-up appeared, no ringer**. Console at that moment:

```
[Socket] Event received: new_order_506  ["scan-new-order", 1232776, 506, 7, {…}, "web"]
[SocketHandler] scan-new-order received: orderId=1232776 … hasFullPayload=true
[OrderContext] addOrder: Adding new order 1232776
(no [Notification] … INCOMING NOTIFICATION, no Foreground message, no SW forwarded message, no play attempt)
```

| Fact | Consequence |
|---|---|
| Fresh login, token obtained, permission Allowed, Ringer On | Every browser-side precondition for sound is satisfied. H-B1, H-B5, Silent-Mode, autoplay, media-load — **all eliminated for this reproduction.** |
| The pop-up came from the **socket** (`scan-new-order`), within the same second | Socket channel is healthy and instantaneous. It carries the full order. |
| **No FCM message arrived at the browser at all** | The buzzer is triggered **only** by FCM (`NotificationContext.processNotification → soundManager.play`); `handleScanNewOrder` never plays sound. **No FCM = no sound, by design.** |

**Root cause for "never rang" — HIGH confidence:** the FCM push for this order was **not delivered to this browser**. The failure is upstream of the frontend: either the backend did not send / sent to another token (token targeting/storage), or the push did not traverse Firefox's push service. It is **not** a `soundManager.js` problem and cannot be fixed there.

**Architecture note (owner-confirmed design):** socket drives the UI, FCM drives the buzzer; the two are intentionally independent. Therefore the socket's success only proves the order existed — the buzzer failure must be resolved on the FCM path (backend send / push transport). Historic FCM evidence (B0, Feb-2026) was captured in **Chrome**; every Firefox observation so far shows FCM absent or flaky.

### Split the remaining cause (2 cheap tests, owner-side)
| Test | Outcome A | Outcome B |
|---|---|---|
| T1 — Firebase Console → Cloud Messaging → *Send test message* → paste this Firefox's token (mask it afterwards) | Notification shows in Firefox → **push transport OK → backend is not sending to this token** → BACKEND_BUG (token storage/targeting: one-per-employee, wrong restaurant/zone topic, Firefox token rejected on save, etc.) | Nothing arrives → Firefox push transport blocked (network / `push.services.mozilla.com` / profile) → ENVIRONMENT |
| T2 — Firefox console: `(await navigator.serviceWorker.getRegistrations())[0]?.pushManager.getSubscription().then(s => s?.endpoint.split('/').slice(0,3).join('/'))` | `https://updates.push.services.mozilla.com` → subscription exists | `null` → token orphaned from its push subscription |

### Backend brief (to send now)
- Endpoint: `POST /api/v1/auth/vendoremployee/login` with `fcm_token`; `POST /api/v2/vendoremployee/employee-logout` deregisters.
- Questions: (1) one `fcm_token` per employee or per device? (2) On `scan-new-order` for restaurant 506 / order 1232776 at 19:49:11 local — was an FCM send attempted, to which token(s), and what did FCM return (`NotRegistered` / `InvalidRegistration` / success)? (3) Is the send per-token or via `zone_wise_topic`? If topic-based, is the Firefox token subscribed server-side at login?

### Frontend recommendation (Planning, owner decision)
| # | Option | Effect | Risk |
|---|---|---|---|
| ~~F5~~ **WITHDRAWN (owner 2026-09-24: socket and FCM are independent by design; buzzer stays FCM-only)** | ~~Trigger the confirm-order buzzer from the **socket** `scan-new-order` event (fOrderStatus = awaiting-confirmation), routed through the same `processNotification` path so BUG-034 dedup (by order id), POS2-007 tone override, and BUG-453 mute all still apply; FCM becomes the fallback instead of the only trigger | Buzzer rings whenever the pop-up appears — the channel that already works 100 % of the time | MEDIUM — touches `socketHandlers.js` + `NotificationContext.jsx`; must dedup against FCM so Chrome users don't get a double ring; aggregator path untouched (already socket-driven) |
| F1 | Boot-time FCM re-check / re-register + "alerts disabled" banner | Fixes stale-token sessions, not this reproduction (token was fresh) | MEDIUM |
| F2 | Stop per-play re-download of sounds | Fixes "rang late / rang once, not again" | LOW |
| F4 | Autoplay unlock on first gesture | Firefox cold-load first ring | LOW |

## 12. Addendum 3 — owner confirms backend token model (2026-09-24, revalidation session)

Owner: backend stores **one `fcm_token` per employee — the most recent login overwrites it** (Model A).

| Consequence | Status |
|---|---|
| H-B2 (token superseded by a later login of the same account elsewhere) | **CONFIRMED as design behaviour.** Explains the recurring "this browser never rings" pattern for shared accounts. |
| H-B2b (logout elsewhere deregisters the shared token) | Consistent with Model A; exact semantics asked in brief Q5. |
| Addendum 2 reproduction (fresh Firefox login → order seconds later → no FCM) | **Not fully explained** — Firefox token should have been the most recent. Brief Q2 (send log + FCM return code) and Q4 (Firefox token stored intact?) remain decisive. |

Backend brief written: `backend_briefs/BACKEND_BRIEF_BUG-454_2026_09_24.md` (Q1–Q5, owner tests T1/T2).
Code re-verified at HEAD this session: `soundManager.play` called only from `NotificationContext.jsx:142`; `src/api/socket/*` has zero `soundManager` / `Audio` / `.play(` references; `requestFCMToken` called only from `LoginPage.jsx:56`; `zone_wise_topic` mapped at `authTransform.js:22` but never subscribed.

### Owner decisions recorded (BUG-454)
| # | Decision | Owner verdict | Date |
|---|---|---|---|
| OD-454-01 | RC-2 (SW sleeping-tab IDB recovery) in scope? | **OPEN** — secondary; re-derive at Gate 2 | — |
| OD-454-02 | Share one real YTC FCM `data.type` payload | **OPEN** — moot until FCM delivery is restored | — |
| OD-454-03 | F5: trigger buzzer from socket `scan-new-order` | **WITHDRAWN / REJECTED** — socket and FCM independent by design; buzzer stays FCM-only | 2026-09-24 |
| OD-454-04 | Backend token model | **CONFIRMED: one `fcm_token` per employee, most-recent login overwrites** | 2026-09-24 |
| OD-454-05 | Move to multi-device token storage (per browser/device)? | **PENDING backend reply Q1** (feasibility + contract change) | — |

---

## Handover Summary (FINAL — 2026-09-24)
```
Root cause: FCM push not delivered to the POS browser → buzzer silent. UPSTREAM of frontend.
  Owner repro (fresh Firefox login, token obtained, permission Allowed, Ringer On): socket drew pop-up,
  ZERO FCM reached the page, no play() attempted. Socket = pop-up, FCM = buzzer, independent by design.
  Owner-confirmed backend: one fcm_token per employee, last login wins (H-B2 = design) → shared-account
  browsers get silently orphaned. Fresh-login repro still needs backend send log (Q2) + token-intact (Q4).
Classification: BACKEND_BUG (token storage/targeting) · alt ENVIRONMENT (Firefox push transport) pending T1.
Confidence: HIGH (delivery, not playback). Steps: 9/10 + revalidation.
Secondary FE findings (valid, do NOT fix "never rang"): F2 per-play sound re-download (LOW), F4 Firefox
  autoplay unlock (Fast Lane), F1 boot-time token re-check (MEDIUM), F3 hosting cache/MIME (devops).
F5 (ring from socket): WITHDRAWN by owner.
Backend brief: backend_briefs/BACKEND_BRIEF_BUG-454_2026_09_24.md (Q1–Q5) — SENT to backend by owner.
Owner action: T1 Firebase Console test push to Firefox token; T2 pushManager endpoint check.
Planning skip eligible: F4 only (owner approve). Registry: INVESTIGATED_ROOT_CAUSE_UPSTREAM.
Report: /app/memory/BUG-454_INVESTIGATION_REPORT_2026_09_24_REVALIDATION.md
```
