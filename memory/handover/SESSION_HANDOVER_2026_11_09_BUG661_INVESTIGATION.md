# Session Handover — 2026-11-09 — BUG-621 Investigation

**Agent role this session:** INVESTIGATION  
**Date:** 2026-11-09  
**Duration:** ~30 min  
**Items worked:** BUG-621 (PWA Update Banner Never Shows)

---

## Summary

Investigated BUG-621. Root cause confirmed with HIGH confidence in 4/10 steps. The SW update detection code in `NotificationContext.jsx` (lines 247-269) is trapped inside a `useEffect` gated by `isAuthenticated` (line 214). Since PWA users land on the login page after a deploy, `isAuthenticated = false` → the entire detection block is skipped → `swUpdatePending` never becomes `true` → `SwUpdateBanner` never renders.

The original BUG-621 intake (2026-10-26) diagnosed the root cause as `self.skipWaiting()` in the SW install handler. That was the ORIGINAL issue (from BUG-597's first implementation) but it was ALREADY FIXED in the current codebase — `skipWaiting()` is now message-triggered, not automatic. The REMAINING defect is the auth gate, which the intake doc did not identify.

**No code was changed.** Investigation report written. Code is at the same state as the repo clone.

---

## Artifacts Produced

| Artifact | Path |
|----------|------|
| Investigation Report | `/app/memory/investigations/BUG-621_INVESTIGATION_REPORT_2026_11_09.md` |
| Session Handover | `/app/memory/handover/SESSION_HANDOVER_2026_11_09_BUG621_INVESTIGATION.md` |

---

## Root Cause (1-liner)

SW update detection is inside `useEffect([isAuthenticated])` with an `if (!isAuthenticated) return` guard → never runs on the login page → PWA users never see the update banner.

---

## Recommended Next Steps for INTAKE → PLANNING → IMPLEMENTATION Agent

### Step 1: INTAKE agent updates BUG-621 intake doc

Update `/app/memory/change_requests/BUG-621_PWA_UPDATE_BANNER_NEVER_SHOWS_INTAKE.md`:
- Revise "Root Cause" section — the `skipWaiting()` diagnosis is STALE (already fixed). The real remaining root cause is the `isAuthenticated` gate.
- Reference this investigation report.
- Gate status → Gate 2 ready.

### Step 2: PLANNING agent writes Impact Analysis + Implementation Plan

The investigation report (`/app/memory/investigations/BUG-621_INVESTIGATION_REPORT_2026_11_09.md`) §5 contains the complete proposed fix with code. The planning agent should:
1. Verify the line numbers are still accurate at HEAD
2. Write formal Impact Analysis + Implementation Plan
3. Include the 3 design decisions (getRegistration, hadController, named handlers)
4. Address OD-661-01, OD-661-02, OD-661-03

### Step 3: IMPLEMENTATION agent (after Gate 4 GO)

Single file change: `src/contexts/NotificationContext.jsx`
- Add new unconditional `useEffect([], [])` for SW detection
- Remove SW detection from auth-gated useEffect
- ~40 lines, MEDIUM risk, no hotspot files

---

## Environment State

- Frontend: RUNNING (webpack compiled with 1 pre-existing warning)
- Preview URL: from `frontend/.env` → `REACT_APP_BACKEND_URL`
- Backend: RUNNING (platform template — not used by this frontend)
- Code state: CLEAN — matches repo clone, no modifications applied
- Memory: Fully synced from remote branch (2728 files)

---

## Files the Next Agent Should Read

1. `/app/memory/investigations/BUG-621_INVESTIGATION_REPORT_2026_11_09.md` — this investigation
2. `/app/memory/change_requests/BUG-621_PWA_UPDATE_BANNER_NEVER_SHOWS_INTAKE.md` — original intake (needs revision)
3. `/app/frontend/src/contexts/NotificationContext.jsx` — the file to fix (lines 210-278)
4. `/app/frontend/src/App.js` — SwUpdateBanner component (lines 117-152)
5. `/app/frontend/public/firebase-messaging-sw.js` — service worker (lines 80-89)
