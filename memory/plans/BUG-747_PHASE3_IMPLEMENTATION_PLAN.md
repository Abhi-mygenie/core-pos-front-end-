# BUG-747 — Phase 3 — Gate-3 Implementation Plan (autoplay re-unlock + Sidebar tri-state + banner)

**Item:** BUG-747 (P1, Risk MEDIUM) · **Sprint:** nov_cr_batch · **Assignee:** Abhishek
**Design source (verified):** branch `notification-fix` (owner-implemented pack) + handover `SESSION_HANDOVER_2026-11-24_FCM_RELOAD_TWO_FE_FIXES.md`.
**Depends on:** CR-562 Phase 1 (listener re-attach — IN on main). Complements BUG-749 Phase 2 (register — IN on main).
**Written:** 2026-11-24 · PLANNING role, no app code changed. **Awaiting Gate-4 GO.**

---

## 1. Problem (BREAK-3)
After a reload there is no user gesture, so the browser autoplay policy blocks `audio.play()`; the block is swallowed in `soundManager.play().catch` (L81-84) and nothing re-unlocks → a delivered push stays **silent**. Sidebar ringer is binary Silent/On — no way to see or fix the locked state.

## 2. Scope lock (this phase ports ONLY the autoplay-unlock slice)
**IN:** `soundManager` unlock primitives; `NotificationContext` unlock state + boot/blocked effect + play-gate + banner mount; NEW `SoundUnlockBanner.jsx`; `Sidebar.jsx` tri-state.
**OUT (other slices on the branch — NOT ported here):** `fcmDiagLog`, `ytcFcmPending`/`YtcFcmHydrator`, the branch's combined auth effect, and the branch's removal of the BUG-453 `isOrderMuted` gate. Main already has CR-562 P1 + BUG-749 P2 as separate effects — **those stay untouched**; the BUG-453 mute gate is **retained**.
**Branch defect to fix on port:** `soundManager.setBlockedHandler` is defined **twice** on the branch — port a **single** copy (ESLint `no-dupe-class-members` / CI build risk).

## 3. Edits (anchored to main @ HEAD)

### Edit 1 — `frontend/src/utils/soundManager.js`
- **E1a (constructor, after L27):** add `this.isUnlocked = false;` and `this.onBlocked = null; // BUG-747`.
- **E1b (play success/fail, L81-84):** change `audio.play().catch(...)` to `.then(() => { this.isUnlocked = true; }).catch((err) => { ...existing BUG-453 Fix A null... ; try { this.onBlocked?.(soundKey, err.message); } catch {} })`.
- **E1c (new methods, after `stop()` ~L96):**
  ```js
  // BUG-747: unlock autoplay with a user gesture (muted silent clip)
  unlock() {
    const audio = this.audioCache.silent ? this.audioCache.silent.cloneNode() : new Audio(SOUND_FILES.silent);
    audio.muted = true;
    return audio.play()
      .then(() => { this.isUnlocked = true; audio.pause(); return true; })
      .catch(() => false);
  }
  setBlockedHandler(fn) { this.onBlocked = fn; }   // SINGLE definition
  getState() { return { isEnabled: this.isEnabled, isUnlocked: this.isUnlocked }; }
  ```
  (No `_record`/`lastResults`/`playTest` — those are diagnostics from the diag slice, OUT of scope.)

### Edit 2 — `frontend/src/contexts/NotificationContext.jsx`
- **E2a (imports):** add `import SoundUnlockBanner from '../components/notifications/SoundUnlockBanner';`. (`requestFCMToken` already imported via BUG-749; do not touch the CR-562 attach effect or the BUG-749 register effect.)
- **E2b (state, near `DEDUP_WINDOW_MS`):**
  ```js
  const [audioUnlocked, setAudioUnlocked] = useState(() => soundManager.getState().isUnlocked);
  const [audioBlockedAt, setAudioBlockedAt] = useState(0);
  const audioUnlockedRef = useRef(audioUnlocked); audioUnlockedRef.current = audioUnlocked;
  const soundEnabledRef = useRef(soundEnabled);   soundEnabledRef.current = soundEnabled;
  ```
- **E2c (play gate — replace L180-184 only; keep the BUG-453 mute check at L172-178 above it):**
  ```js
  if (resolvedSound) {
    if (resolvedSound === 'silent') {
      soundManager.play('silent');
    } else if (!audioUnlockedRef.current) {
      console.log('[Notification] Sound suppressed — Tap to enable ringer first:', resolvedSound);
      setAudioBlockedAt(Date.now());            // show unlock banner
    } else if (!soundEnabledRef.current) {
      console.log('[Notification] Sound suppressed — Silent Mode:', resolvedSound); // no banner (intentional)
    } else {
      console.log('[Notification] Playing sound:', resolvedSound);
      soundManager.play(resolvedSound);
    }
  }
  ```
- **E2d (new effect — place right after the "Sync sound enabled state" effect ~L309):**
  ```js
  // BUG-747: unlock autoplay (sidebar "Tap to enable" / banner only)
  const unlockAudioNow = useCallback(async () => {
    const ok = await soundManager.unlock();
    if (ok) { setAudioUnlocked(true); setAudioBlockedAt(0); }
    return ok;
  }, []);
  // Lock on boot if not unlocked; re-lock when a real play is blocked. No auto-unlock on random gestures.
  useEffect(() => {
    if (!soundManager.getState().isUnlocked) { setAudioUnlocked(false); setAudioBlockedAt(Date.now()); }
    soundManager.setBlockedHandler(() => { setAudioUnlocked(false); setAudioBlockedAt(Date.now()); });
    return () => { soundManager.setBlockedHandler(null); };
  }, []);
  ```
- **E2e (context value + deps):** add `audioUnlocked`, `audioBlockedAt`, `unlockAudioNow` to the `value` object **and** its dependency array.
- **E2f (render):** add `<SoundUnlockBanner />` after `{children}` inside the provider.

### Edit 3 — `frontend/src/components/notifications/SoundUnlockBanner.jsx` (NEW)
Port branch file verbatim (fixed bottom-center red button; renders only when `audioBlockedAt && !audioUnlocked`; tap → `unlockAudioNow()`; `data-testid="sound-unlock-banner"`; `VolumeX` icon). No diag deps.

### Edit 4 — `frontend/src/components/layout/Sidebar.jsx`
- **E4a (L266 destructure):** `const { soundEnabled, setSoundEnabled, audioUnlocked, unlockAudioNow } = useNotifications();`
- **E4b (ringer button L815-837):** tri-state:
  - `onClick`: if `soundEnabled && !audioUnlocked` → `unlockAudioNow()` (return); else `setSoundEnabled(!soundEnabled)`.
  - add `animate-pulse` when `soundEnabled && !audioUnlocked`.
  - bg/color: `!soundEnabled` → gray; else `!audioUnlocked` → `COLORS.errorBg`/`COLORS.errorText`; else green. (both tokens confirmed to exist.)
  - icon: `!soundEnabled || !audioUnlocked` → `BellOff`, else `Bell`.
  - label/title: `!soundEnabled` → "Silent Mode"; `!audioUnlocked` → "Tap to enable"; else "Ringer On".

### Edit 5 — `frontend/src/__tests__/utils/soundManager.unlock.test.js` (NEW)
Unit: `getState().isUnlocked` default false; `setBlockedHandler(fn)` → `onBlocked` invoked when `play()` rejects (mock `Audio.play` → rejected); `unlock()` resolves `true` and flips `isUnlocked` on resolved play, `false` on rejected.

## 4. Files WILL NOT touch
`config/firebase.js`, the CR-562 attach effect + BUG-749 register effect in `NotificationContext.jsx` (only add alongside), `LoginPage.jsx`, `OrderEntry.jsx` (that's Phase 5/BUG-750), `AppProviders.jsx`, BUG-453 mute registry behavior.

## 5. Verification Matrix (seeds QA)
| # | Check | How | Auto? |
|:--:|---|---|:--:|
| 1 | `getState().isUnlocked` default false; `unlock()` flips it | unit | YES |
| 2 | blocked play → `onBlocked` fires (handler) | unit (mock play reject) | YES |
| 3 | single `setBlockedHandler` (no dupe) + webpack/ESLint clean (`CI=true` build) | `yarn build` | YES |
| 4 | reload (granted) → order before unlock → **no ring + red banner**; sidebar shows "Tap to enable" (pulse) | browser rid69 | NO |
| 5 | tap banner / sidebar → unlock → next order **rings** | browser | NO |
| 6 | Silent Mode → order → **no banner**, stays silent | browser | NO |
| 7 | no regression: already-unlocked + enabled still rings as today | browser | NO |

**Browser rows need:** granted-permission Goan Kitchen (rid 69) device (CR-562 P1 + BUG-749 P2 already in).

## 6. Post-Code Registry Checklist (Implementation runs)
- [ ] registry.json: BUG-747 → GATE_5A_IMPLEMENTED, current_gate 4, sprint_key nov_cr_batch
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: soundManager.js, NotificationContext.jsx, Sidebar.jsx, SoundUnlockBanner.jsx (NEW), test
- [ ] `// BUG-747` markers in every modified/new file

## 7. Risk & approval
MEDIUM — `soundManager.js` (playback core, BUG-453 owner), `NotificationContext.jsx` + `Sidebar.jsx` (hotspots). Mitigations: additive (CR-562/BUG-749 effects untouched, BUG-453 mute retained), single `setBlockedHandler`, diag/YTC slices excluded. **Needs Gate-4 GO before coding.**
