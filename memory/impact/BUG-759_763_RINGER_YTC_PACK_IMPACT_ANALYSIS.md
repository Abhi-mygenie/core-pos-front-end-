# Ringer / YTC UX Pack — Combined Impact Analysis (Gate 2)

**Document:** `impact/BUG-759_763_RINGER_YTC_PACK_IMPACT_ANALYSIS.md`  
**Stage:** Impact Analysis (Gate 2) — PLANNING role (**NO code**, **NO Implementation Plan**)  
**Created:** 2026-11-28  
**Branch:** `ultimate-fix` @ `784aedf0` (five-fix commit) on base `430edce9`  
**Sprint:** `dec_sprint` · **Client:** ALL · **Assignee:** Abhishek  
**Risk (pack):** MEDIUM  
**Code Reality:** **FULL (owner-directed Gate 2 backfill)** — fixes already landed; this IA documents as-shipped data flow / blast radius for gate compliance (AGENT_PROMPT normally routes FULL → CLOSURE Phase B; owner waived for backfill IA).

**Covers (one symptom family — post-BUG-747 ringer / YTC polish):**

| ID | Severity | Title |
|----|----------|-------|
| **BUG-759** | P1 | Accept popup flash — ScanOrderPopOut reappears then vanishes after Accept |
| **BUG-760** | P2 | Mute button stays orange while next order correctly rings |
| **BUG-761** | P2 | Compact SoundUnlockBanner — Turn on ringer + Keep it silent |
| **BUG-762** | P2 | Sidebar double-tap after Keep it silent — stuck on Tap to enable |
| **BUG-763** | P3 | Mute button should look grey when Silent Mode is on |

**Intake docs:** `change_requests/BUG-759_*` … `BUG-763_*_INTAKE.md`  
**Related (shipped):** BUG-453, BUG-747, BUG-751, BUG-752

---

## 0. Header — Code Reality + Conflict Pre-Check

### Code Reality: FULL

Verified on `ultimate-fix` HEAD parent `784aedf0` (grep + file read 2026-11-28):

| Marker | Location |
|--------|----------|
| Accept flash guard | `YtcFcmHydrator.jsx` L41–46 |
| Tightened YTC text match | `NotificationContext.jsx` L20–22, L189–194 |
| `mygenie:order-alert-played` | `NotificationContext.jsx` L222–227; `DashboardPage.jsx` L519–544 |
| Compact banner + Keep it silent | `SoundUnlockBanner.jsx` (entire file) |
| Leave Silent + unlock one gesture | `Sidebar.jsx` L818–830 |
| Mute grey via `soundEnabled` | `ScanOrderPopOut.jsx` L204, L748–772; `DashboardPage.jsx` L205, L1982 |

### Conflict Pre-Check

- **FILE_OWNERSHIP:** Same files last heavily touched by **BUG-747 / BUG-751 / BUG-752** Phase-3 pack (IMPLEMENTED). This pack is **additive** on those foundations — not a rewrite of autoplay unlock, YTC queue, or Accept stop-buzzer.
- **Registry open overlap:** No other OPEN Gate-1/2 item owns these exact symptoms. Historical implementers (BUG-453 Mute stop, BUG-747 banner/tri-state) are GATE_5A_IMPLEMENTED — **RELATED, not blocking**.
- **Hotspots:** `DashboardPage.jsx` (R5), `NotificationContext.jsx`, `Sidebar.jsx`, `ScanOrderPopOut.jsx` — pack risk stays **MEDIUM** (UI/state; no money/print/auth contract).
- **WILL NOT touch (locked for Gate 3 / future):** `firebase.js`, `soundManager.js` play/mute registry, `OrderEntry.jsx`, sockets, transforms, BE APIs.

**Conflict verdict:** Parallel-safe vs CLOSED/IMPLEMENTED FCM pack. Sequence for any future edit: after BUG-747/751/752 semantics; do not reintroduce bare `/confirm/i` YTC match or persistent Mute registry.

---

## 1. Problem (operator / owner reported)

Five UX gaps on the FCM → YTC → ringer surface after the Phase-3 unlock/banner work:

1. **Accept flash** — popup blinks after Accept.  
2. **Mute color stuck** — next order rings but Mute stays orange.  
3. **Banner size / choice** — large single CTA; need compact enable + Keep it silent.  
4. **Double-tap** — after Keep it silent, sidebar needs two clicks to reach Ringer On.  
5. **Mute grey** — Silent Mode should grey Mute on the pop.

---

## 2. Shared data flow (as shipped)

```
FCM foreground
  → NotificationContext.processNotification
       ├─ looksLikeYtcConfirm? → enqueueYtcFcm + mygenie:ytc-fcm
       │     → YtcFcmHydrator.hydrateOne
       │           → (guard) skip if existing && !YTC && !web-edit   [BUG-759]
       │           → else optimistic fos=7 + fetchSingleOrderForSocket
       │                 → ScanOrderPopOut queue
       ├─ play gate: unlocked? Silent? → soundManager.play
       │     → dispatch mygenie:order-alert-played                  [BUG-760]
       │           → DashboardPage clears snoozedOrders (Mute color)
       └─ if locked → audioBlockedAt → SoundUnlockBanner             [BUG-761]
              Turn on ringer → unlockAudioNow
              Keep it silent → setSoundEnabled(false) (hide banner)
                    → Sidebar leave Silent: setSoundEnabled(true)+unlock [BUG-762]
Dashboard ScanOrderPopOut
  soundEnabled prop → Mute grey styling                             [BUG-763]
```

---

## 3. Per-bug break → fix (line anchors)

### BUG-759 — Accept popup flash (P1)

**Break:** Accept ACK title/body containing `confirm` / `confirmed` matched `/confirm/i` → re-enqueue YTC → hydrator `addOrder(buildMinimalYtcOrder)` re-injected fos=7 for an already-accepted order → ScanOrderPopOut flashed.

**As-shipped fix:**
- `NotificationContext.jsx` L20–22, L189–194 — only yet-to-confirm / `confirm_order` / `to confirm` patterns; `confirmed` → `order_accepted`.
- `YtcFcmHydrator.jsx` L41–46 — if order exists and is no longer YTC / web-edit eligible → `removeYtcFcm` and return (no re-inject).

**Classification:** FE_BUG / CODE_ERROR (over-broad string match + missing hydrate guard).

---

### BUG-760 — Mute color stuck (P2)

**Break:** Instance-only Mute correctly called `soundManager.stop()` and set `snoozedOrders`, but nothing cleared that Set when a **new** alert played → orange Mute UI stuck while audio rang.

**As-shipped fix:**
- On successful play: `NotificationContext.jsx` L222–227 dispatches `mygenie:order-alert-played`.
- `DashboardPage.jsx` L519–544 listens and clears / updates `snoozedOrders`.
- `toggleSnooze` L1341–1357 stays instance-only (stop + string id Set); no `toggleOrderMute` restore.

**Classification:** FE_BUG (UI state desync). Preserves BUG-453 instance-mute contract.

---

### BUG-761 — Compact banner + Keep it silent (P2)

**Break:** `SoundUnlockBanner` was a large single pill; no path to dismiss into Silent without sidebar.

**As-shipped fix:** `SoundUnlockBanner.jsx` — compact bar; **Turn on ringer** → `unlockAudioNow()`; **Keep it silent** → `setSoundEnabled(false)`; hide when `!soundEnabled` (L17).

**Classification:** FE_BUG / UX gap on BUG-747 surface.

---

### BUG-762 — Sidebar double-tap (P2)

**Break:** After Keep it silent, `soundEnabled=false` and often still `audioUnlocked=false`. Old sidebar handler only unlocked when `soundEnabled && !audioUnlocked`, else toggled — leaving Silent required a second click for Tap to enable → unlock.

**As-shipped fix:** `Sidebar.jsx` L818–830 — if `!soundEnabled`: `setSoundEnabled(true)` and `unlockAudioNow()` when still locked; else if locked unlock; else enter Silent.

**Classification:** FE_BUG (state machine incomplete for banner Keep it silent path).

---

### BUG-763 — Mute grey in Silent (P3)

**Break:** Mute button ignored Silent Mode visually.

**As-shipped fix:** read-only `soundEnabled` prop on `ScanOrderPopOut` (L204, L748–772); Dashboard passes `useNotifications().soundEnabled` (L205, L1982). No NotificationContext import inside popout (anti-test A-1 preserved).

**Classification:** FE_BUG (presentation).

---

## 4. Blast radius — locked file set

### Already changed (pack) — Gate 3 will only document, not redesign

| File | Bugs |
|------|------|
| `frontend/src/components/notifications/YtcFcmHydrator.jsx` | 759 |
| `frontend/src/contexts/NotificationContext.jsx` | 759, 760 |
| `frontend/src/pages/DashboardPage.jsx` | 760, 763 |
| `frontend/src/components/notifications/SoundUnlockBanner.jsx` | 761 |
| `frontend/src/components/layout/Sidebar.jsx` | 762 |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | 763 |
| `frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | 763 fixtures / A-1–A-2 |

### WILL NOT touch

- `config/firebase.js`, `firebase-messaging-sw.js`
- `utils/soundManager.js` (beyond existing stop() from pop Mute)
- `OrderEntry.jsx`, order transforms, sockets, BE
- Multi-browser FCM token last-write-wins (out of pack scope)

**Estimated scope:** MEDIUM (7 files, one commit `784aedf0`).

---

## 5. Risk register

| Risk | Mitigation (as shipped) |
|------|-------------------------|
| True YTC FCM with odd wording no longer opens pop | Match still covers yet-to-confirm / to confirm / confirm_order + `isConfirmOrderNotification` types |
| Mute color clears too aggressively | Clear only on actual `play` path; Silent/locked do not dispatch |
| Keep it silent confuses with CR-440 kill switch | Uses `soundEnabled` (sidebar Silent), not `notificationsEnabled` |
| Grey Mute hides real Mute when ringer on | Grey only when `!soundEnabled` |

Fast Lane: **NO** (multi-file + hotspot Dashboard / NotificationContext).

---

## 6. Owner decisions

**None open** — behaviors confirmed in owner session before coding.  
OD backlog: none for this pack.

---

## 7. Verification already run (informational for Gate 3 / QA)

- Unit: `ScanOrderPopOut` suite **29/29 PASS** after cherry-pick onto `430edce9`
- Manual smoke still pending owner: Accept no flash; Mute resets on next ring; compact banner; one-click leave Silent; Mute grey in Silent

---

## 8. Gate 2 exit

```
Impact Analysis complete for 5 items (BUG-759..763) — pack doc:
  memory/impact/BUG-759_763_RINGER_YTC_PACK_IMPACT_ANALYSIS.md
Code Reality: FULL (owner-directed backfill).
Conflict: none blocking (additive on BUG-747/751/752).
Owner decisions: none.
Next: Gate 3 thin retroactive Implementation Plan (when owner asks)
      then status → GATE_5A_IMPLEMENTED + push + QA smoke.
```
