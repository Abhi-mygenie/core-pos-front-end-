# SESSION HANDOVER — CR-358-P1 Gate 3 Implementation Plan COMPLETE
**Date:** 2026-09-01
**Role:** PLANNING (Gate 3 — Implementation Plan only. Zero code written.)
**Registry synced:** YES — CR-358-P1 → Gate 3 COMPLETE
**Scope drift:** NONE

---

## What happened this session

1. Read `AGENT_PROMPT_ALPHA.md` (v0.7+R25). Chose PLANNING role → Stage Dispatch → `implementation_plan`.
2. Entry verification: confirmed App.js (253 lines, 101 routes), Sidebar.jsx (836 lines), constants.js (557 lines) all match Gate 2 IA claims exactly.
3. Verified AIOSELL API response shapes against `/app/memory/evidence/CR-358/` JSON files (status, rooms, inventory all confirmed).
4. Discovered `BedDouble` icon NOT yet in Sidebar.jsx lucide imports → added as E1 (5 Sidebar edits total, not 4 as IA said — IA stated E4, plan correctly has E1–E5).
5. Wrote full Gate 3 plan: 9 execution steps, exact code for all 6 new files, exact search/replace strings for 3 modified files, 20-item Verification Matrix, Post-Code Registry Checklist.

---

## Output

- `memory/plans/CR-358-P1_IMPLEMENTATION_PLAN.md` — full Gate 3 doc
- `registry.json` CR-358-P1 → Gate 3, implementation_plan artifact ref added

---

## Current State

`CR-358-P1` is at **Gate 3 — Awaiting Gate 4 GO** from owner.

---

## Next agent instructions

### Step 1 — IMPLEMENTATION AGENT

On owner Gate 4 GO, switch to **IMPLEMENTATION role**.

Boot sequence:
1. Read `plans/CR-358-P1_IMPLEMENTATION_PLAN.md` — this is the PRIMARY guide
2. Read `impact/CR-358-P1_IMPACT_ANALYSIS.md` — for context + scope lock
3. Check environment: `tail -5 /var/log/supervisor/frontend.out.log` → must show "compiled"
4. Entry verify: confirm App.js still 101 routes, Sidebar.jsx still 836 lines

Execute Steps 1→9 in order:
```
Step 1  pages/pms/PmsPlaceholderPage.jsx        (NEW)
Step 2  api/constants.js                         (MODIFY — append AIOSELL_ENDPOINTS)
Step 3  api/transforms/aiosellTransform.js       (NEW)
Step 4  api/services/aiosellService.js           (NEW)
Step 5  api/services/pmsService.js               (NEW)
Step 6  pages/pms/ChannelManagerPage.jsx         (NEW)
Step 7  pages/pms/InHouseGuestsPage.jsx          (NEW)
Step 8  Sidebar.jsx                              (MODIFY — 5 edits: E1 lucide import, E2 SIDEBAR_PERMISSIONS, E3 VISIBLE_SECTIONS, E4 visibleMenuItems filter, E5 sidebarMenuItems[])
Step 9  App.js                                   (MODIFY — 2 edits: imports + routes)
```

After every file, verify webpack is still building. Full compile check after Step 9.

Run Verification Matrix V1–V20. All must pass before writing QA handover.

Complete EXIT GATE (5 checkboxes) before any handover.

---

## Critical constraints (unchanged)
- `RoomCheckInModal.jsx`, `DashboardPage.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` — CONFIRMED NOT TOUCHED
- `roomService.js`, `roomListTransform.js`, `profileTransform.js` — NOT modified, only read
- `App.js` and `Sidebar.jsx` touched ONCE — no further edits in Phase 1 after implementation

---

*Planning agent | CR-358-P1 Gate 3 COMPLETE | 2026-09-01 | Next: Implementation agent on Gate 4 GO*
