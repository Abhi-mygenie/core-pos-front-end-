# BUG-747 — INTAKE — Buzzer silent after reload: audio autoplay not re-unlocked + ringer UI tri-state

**Type:** BUG · **Severity:** P1 · **Risk:** HIGH
**Sprint:** nov_cr_batch · **Client:** ALL (reproduced: The Goan Kitchen, rid 69) · **Assignee:** Abhishek
**Registered:** 2026-11-24 · **Source:** OWNER-REPORTED + AGENT-TRACED
**Intake role — no app code changed.**

## Classification
After a reload, even when a push arrives the browser blocks `audio.play()` (no user gesture since load) and nothing
re-unlocks it → silent. Secondary driver of the "no ring after reload" complaint (primary = BUG-749).

## Code Reality — NONE (main @ HEAD)
- `utils/soundManager.js`: has `play/stop/setEnabled/mute` only — **no `unlock()`, `isUnlocked`, `getState()`,
  `setBlockedHandler`/`onBlocked`**. Play block is swallowed in `.catch` (L81-84).
- `contexts/NotificationContext.jsx`: no autoplay-unlock effect, no banner; provider renders `{children}` only.
- `components/layout/Sidebar.jsx`: ringer is binary Silent/On (L816-834) — no "Tap to enable" state.

## Duplicate check
**DISTINCT** (not in main registry). RELATED: CR-562 (depends on), BUG-749, BUG-750. Implementation exists only on
`notification-fix` (not merged) — design source.

## Severity rationale
P1 — missed order alerts after reload; workaround is relogin. Not P0 (BUG-749 is the dominant missed-order cause).

## Evidence
- `impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md` §2 (BREAK-3), §4 (edits 6-9).
- Prior branch: `notification-fix` `impact/BUG-747_IMPACT_ANALYSIS.md`.
- Confidence: CONFIRMED (code-traced).

## Blast radius
MEDIUM — `soundManager.js`, `NotificationContext.jsx` (ungated unlock effect + banner), NEW `SoundUnlockBanner.jsx`,
`Sidebar.jsx` tri-state. Depends on CR-562 (Phase 1).

## Open decisions
- OD-747-01: silent auto-unlock on first gesture AND "Tap to enable" banner (rec: both).
- OD-747-02: re-assert unlock on `visibilitychange` (rec: yes).
- OD-747-03: listener/unlock home = ungated effect in `NotificationContext` (rec) vs `App.js`.
- Distinguish intentional Silent Mode (no banner) vs autoplay-locked (banner).

## Next
PLANNING Gate 3 (Phase 3 of the IA ladder, after Phase 1).
