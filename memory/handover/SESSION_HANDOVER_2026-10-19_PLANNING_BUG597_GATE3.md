# Session Handover — 2026-10-19 — PLANNING: Gate 3 Implementation Plan COMPLETE for BUG-597

**Role this session:** PLANNING (Role 2 — Gate 3)
**Date:** 2026-10-19
**Next agent role:** IMPLEMENTATION — needs owner "BUG-597 Gate 4 GO"
**Code changed:** NO

---

## Gate 3 Deliverable

**Plan doc:** `plans/BUG-597_IMPLEMENTATION_PLAN_2026_10_19.md`

### 4 Edits, ~62 Lines — Exact Anchors

| Edit | File | Anchor line(s) | Lines |
|------|------|---------------|:-----:|
| E1 | `public/firebase-messaging-sw.js` | After L77 (closing `});` of notificationclick) | +9 |
| E2a | `src/contexts/NotificationContext.jsx` | After L68 (`lastNotifTimeRef`) | +1 |
| E2b | `src/contexts/NotificationContext.jsx` | After L199 (inside init effect, before return) | +10 |
| E2c | `src/contexts/NotificationContext.jsx` | L250-272 (value useMemo + deps) | +2 |
| E3a | `src/App.js` | L93 (import line) | +1 word |
| E3b | `src/App.js` | After L122 (new SwUpdateBanner fn) + L128 (`<SwUpdateBanner />`) | +29 |
| E4 | `src/components/guards/ErrorBoundary.jsx` | L13-15 (getDerivedStateFromError) | +10 |

### Key Implementation Notes
- `SwUpdateBanner` MUST be inside `<AppProviders>` (already is, after `<AppTitleSync />`)
- `controllerchange` listener registered on `navigator.serviceWorker` directly (not inside `.ready`)
- E4 uses `window.location.replace` (not `href =`) to avoid history entry
- Zero new npm packages

---

## Registry State

| ID | Status |
|----|--------|
| BUG-597 | `GATE_3_PLAN_COMPLETE` |

---

## For Implementation Agent

1. Read `plans/BUG-597_IMPLEMENTATION_PLAN_2026_10_19.md` — all exact edits are there
2. Entry verification: confirm anchors (L77 SW file · L68 + L199-201 + L250 NotificationContext · L93+L122+L128 App.js · L13-15 ErrorBoundary) match plan before coding
3. Apply E1-E4 in any order (all independent)
4. `yarn build` — expect 0 new errors
5. Run grep-based V1-V12 before browser tests V13-V15
6. EXIT GATE 5/5 before writing handover
