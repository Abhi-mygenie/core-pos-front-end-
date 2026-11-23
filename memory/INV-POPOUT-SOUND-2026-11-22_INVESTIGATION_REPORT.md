# INVESTIGATION REPORT — Web-Order Pop-out Not Opening After Reload/Login + Random No-Sound

**ID:** INV-POPOUT-SOUND-2026-11-22
**Role:** INVESTIGATION (Role 6) — in-gate, NO code edited
**Date:** 2026-11-22
**Account context:** pms@macha.com (owner offered to place a live order for inspection — see §5)
**Evidence:** `evidence/INV-POPOUT-SOUND-2026-11-22/pipeline_trace.md` + full FE code trace.

> Scope note: prior INV items (TAB holder / credit) are owner-confirmed backend-fixed — not revisited. This report covers only the pop-out + sound inconsistency. No live authenticated probe was run this session (no creds); findings are from code trace + owner's described symptom. HIGH confidence on the FE mechanism; backend echo consistency needs one live capture to lock (owner offered a live order).

---

## 1. Summary

Two decoupled pipelines cause the inconsistency:

- **Pop-out (SOCKET + OrderContext driven)** — opens iff an order in `orders` satisfies `isWebOrder === true` AND (`fOrderStatus === 7` for a new web order, or an item with `food_status === 7`/`isNotConfirmed` for a web edit). On a **cold reload/login**, orders are rehydrated from GET `employee-orders-list`, which **may omit `order_from`** (documented in code at `useOrderPollingReconciliation.js` L170-177, BUG-082). The mid-session guard that re-applies web-origin only works when a prior socket order exists locally — on a cold boot there is none, so `isWebOrder` falls to `false` and **the pop-out does not open**. When the GET happens to echo `order_from='web'`, it opens → "sometimes / randomly".
  - **Classification: BACKEND_BUG (inconsistent `order_from` / item `food_status` echo on `employee-orders-list`) + FE resilience gap (no cold-boot web-origin recovery). Confidence: HIGH.**

- **Sound (FCM push driven, SEPARATE from the socket/pop-out)** — `soundManager.play()` fires only from an incoming FCM notification. It is independent of the socket order arrival, so it desyncs from the pop-out. Random no-ring is explained by: browser **autoplay policy** rejecting `audio.play()` before any user gesture (common right after reload/login); FCM foreground delivery being best-effort and dependent on Notification permission + a valid `REACT_APP_FIREBASE_VAPID_KEY`; a 2s dedup window; and a preload/decode race.
  - **Classification: FE_BUG (autoplay/decoupling/dedup) + CONFIG (FCM permission/VAPID) + BACKEND (notification emission consistency). Confidence: HIGH on mechanism; which factor dominates needs the live capture.**

**Steps used: 9/10.**

---

## 2. Hypotheses Tested

| # | Hypothesis | Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Pop-out uses a transient event, so it can't re-open after reload | Code trace of ScanOrderPopOut queue | **ELIMINATED** — queue is pure derivation from `orders` (L204-213); it WILL re-open if data matches | ScanOrderPopOut L204-213 |
| H2 | Pop-out fails because `isWebOrder` is false after GET rehydration | Trace predicate → isWebOrder source → boot GET | **CONFIRMED** — predicate needs `isWebOrder`; GET `employee-orders-list` may omit `order_from`; cold boot has no guard | orderTransform L268-269; reconciliation L170-177 (BUG-082); ScanOrderPopOut L62/L65-68 |
| H3 | Web-EDIT pop-out needs item `food_status===7` to survive the GET | Trace isNotConfirmed + edit predicate | **CONFIRMED (contributing)** — edit predicate needs an item `food_status===7`; if GET normalizes it, no pop | orderTransform L162-163; ScanOrderPopOut L65-68 |
| H4 | Sound is driven by the same socket/pop-out path | Trace soundManager callers | **ELIMINATED** — sound fires only from FCM `processNotification`; fully decoupled | NotificationContext L180-182; ScanOrderPopOut anti-rule L22-32 (no play) |
| H5 | Random no-sound = browser autoplay block / FCM variability | Trace soundManager.play + FCM init | **CONFIRMED (primary FE)** — `audio.play().catch()` logs "Play blocked"; FCM needs permission+VAPID; 2s dedup | soundManager L81-84; NotificationContext L109-116, L213-246 |

---

## 3. Data Flow Trace

### Pop-out
```
Cold reload/login → getRunningOrders() GET /employee-orders-list
   → orderTransform.order(api): isWebOrder = (normaliseOrderFrom(api.order_from) === 'web')   [L268-269]
       if api.order_from omitted → isWebOrder = FALSE
   → OrderContext.orders
   → DashboardPage passes orders → ScanOrderPopOut
   → queue = orders.filter(isUnconfirmedScanOrder || hasUnconfirmedWebEditItems)   [L204-213]
         isUnconfirmedScanOrder   needs isWebOrder && fOrderStatus===7            [L62]
         hasUnconfirmedWebEditItems needs isWebOrder && item.food_status===7      [L65-68]
BREAK POINT: isWebOrder=false (order_from omitted on GET) → queue empty → NO POP-OUT.
Mid-session guard (reconciliation L170-177) can't help on a cold boot (no local socket order to copy from).
```

### Sound
```
Backend FCM push → onForegroundMessage / SW 'BACKGROUND_NOTIFICATION'
   → NotificationContext.processNotification
       dedup 2s window                                   [L109-116]  (may suppress)
       resolve sound from data.sound | title/body text   [L119-120]
       per-order mute check                              [L174-177]  (may suppress)
       soundManager.play(resolvedSound)                  [L182]
   → soundManager.play: audio.play().catch("Play blocked")  [L81-84]
BREAK POINTS: (a) autoplay policy rejects before user gesture (post reload/login);
             (b) no FCM message arrives (permission/VAPID/best-effort);
             (c) dedup or mute suppression.
Independent of the socket pop-out → silent pops / desync.
```

---

## 4. Evidence Artifacts
Saved to `/app/memory/evidence/INV-POPOUT-SOUND-2026-11-22/pipeline_trace.md` (full line map, no secrets).

---

## 5. Recommendations

**Pop-out — Classification: BACKEND_ASK (primary) + FE resilience (secondary).**
- **Backend ask:** make `employee-orders-list` (and single-order) **always** echo `order_from` for web/scan orders, and preserve item-level `food_status=7` on appended web-edit lines. One live capture (owner to place a live web order + a web-edit, then reload) comparing the GET payload's `order_from` / item `food_status` vs the socket payload will lock this.
- **FE resilience (for PLANNING, not this gate):** on cold boot, recover web-origin without a prior socket order — e.g., derive `isWebOrder` from an additional backend signal (channel/order_in) or persist the socket-confirmed web-origin set across reload. Extends the BUG-082 guard (reconciliation L170-177) to the single-order transform + socket handlers (exactly the gap BUG-701 flagged).

**Sound — Classification: FE_FIX + CONFIG + BACKEND_ASK.**
- **FE:** unlock audio with a one-time user-gesture primer (play+immediately-pause a silent clip on first interaction post-login) so later `play()` is not autoplay-blocked; consider decoupling a chime from the socket new-web-order/pop-out path so a ring does not depend solely on FCM; re-check the 2s dedup fingerprint for web orders.
- **CONFIG:** confirm Notification permission is granted on each device and `REACT_APP_FIREBASE_VAPID_KEY` is set (it was empty until recently) — without it, foreground FCM (and thus sound) is unreliable.
- **BACKEND:** ensure a notification is emitted for every new web order / web edit with stable title/body text (so `inferSoundFromContent` resolves `new_order`).

**Planning-skip eligibility:** NOT eligible — touches sockets/order flow + notifications (hotspots) and spans FE+backend. Route to PLANNING Gate 2 with a BACKEND_BRIEF; the cheapest confirming step is the owner's offered **live order capture**.

**Confidence:** HIGH on both FE mechanisms; the backend echo-consistency (pop-out) and dominant sound factor need the one live capture. I can drive that inspection live if the owner places the order and authorises a credentialled probe via the secure secrets card.

---

## 6. Retroactive / Duplicate Candidates
- Pop-out → **RELATED to BUG-701** (isWebOrder recomputed false; guard missing in socket handlers + single-order transform) and **BUG-082** (web-origin preservation). This cold-boot-reload facet is a **DISTINCT** new case (BUG-701 is item-cancel on a room edit; this is cold reload/login of any web/web-edit order). Recommend INTAKE as a new bug cross-referencing BUG-701/BUG-082.
- Sound → **RELATED to BUG-600** (aggregator buzzer tone not read) and **BUG-453** (per-order mute). The autoplay-block + FCM-decoupling facet appears **DISTINCT** (not previously filed). Recommend INTAKE.

---

## Handover
Root cause: (1) Pop-out opens only when `isWebOrder===true`; GET `employee-orders-list` may omit `order_from` on cold reload/login (documented BUG-082), and the web-origin guard only works mid-session, so the pop-out intermittently fails to open — backend echo inconsistency + FE cold-boot resilience gap. (2) Sound is a separate FCM pipeline; `audio.play()` is autoplay-blocked before a user gesture and depends on FCM permission/VAPID, so it rings randomly and desyncs from the pop-out — FE + config + backend. Confidence: HIGH (FE mechanism). Steps: 9/10. FE fix: pop-out = resilience extension (PLANNING); sound = autoplay primer + optional socket-driven chime. Backend ask: YES (both). Planning-skip: NO (hotspots + FE/backend). Retroactive/duplicate: pop-out = new facet of BUG-701/BUG-082; sound = new, related BUG-600/BUG-453. Next: owner live-order capture (offered) to lock backend echo + dominant sound factor. Report at `/app/memory/INV-POPOUT-SOUND-2026-11-22_INVESTIGATION_REPORT.md`.
