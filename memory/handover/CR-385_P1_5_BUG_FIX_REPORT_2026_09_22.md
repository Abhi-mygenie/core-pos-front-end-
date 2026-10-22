# BUG FIX REPORT — 2026-09-22 — CR-385 Phase 1.5 · BUG-441 + BUG-442 (Bug Fix role, ALPHA v0.7)

```
Trigger:   owner "OWNER ROUTING + PHASE 1.5 GO — CR-385" (2026-09-22): BUG-441 → P1.5 · BUG-442 → P1.5 · BQ-385-23/24 → OPEN_GAP (no FE workaround, "known, ignore" in the smoke)
Boot:      AGENT_PROMPT_ALPHA Role 5 · phased plan §0-bis + §0.7 (mirrored as §1.7) · QA_REPORT_2026_09_22_CR385_P1_ROLE4.md · BUG-441/442 intakes
Plan note: plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md §1.7 + plans/CR-385_PHASE_1_5_BUGFIX_PLAN.md (Entry Verification all anchors ✓, grep BUG-441|442 = 0 before)
Step 0:    failing tests written first — tests/cr385/phase1_5.cr385.test.jsx: 4 red / 1 green before the fix (58 existing green)
```

| Bug | Severity | RCA class | Root cause | Fix | Files changed | Verified |
|---|---|---|---|---|---|---|
| BUG-441 | BLOCKER (legacy) | **CODE_ERROR** (CR-362) | `reservationId: row.bookingId` / `res.bookingId` — public `MG-69-…` string sent as the LR `{id}` → backend 500 TypeError | `reservationId: row.id` (ArrivalsPage L272–273) · `res.id` (ReservationsPage L372/L377) | `pages/pms/ArrivalsPage.jsx`, `pages/pms/ReservationsPage.jsx` | unit (a) + source guard · live it.15: 6 cancels + 1 modify on numeric ids, 200 |
| BUG-442 | MINOR | **CODE_ERROR** (CR-362, inherited by CR-385 M2 via the plan's "copy that mapping") | `restaurant?.profile?.fullName` does not exist on `RestaurantContext` → fallback `'staff'` always | `useAuth().user?.fullName \|\| 'staff'` — ArrivalsPage (import L11, hook L55, L273) · ReservationsPage (`useAuth` L6/L42, `cancelledBy` prop → `BlockPopover` L232/L319/L377) · FrontDeskWorkstationPage (`cancelledBy={user?.fullName \|\| 'staff'}`, `useRestaurant` import + hook removed — sole consumer) | same 2 + `pages/pms/FrontDeskWorkstationPage.jsx` | unit (b)(b2)(c) · live it.15: `cancelled_by:"Owner"` on 6 cancels (legacy + new panel) |

Tests: before **58** green (cr385) → after **63** green (5 new: (a) numeric id, (b) fullName, (b2) FD `cancelTargetOf`, (c) `'staff'` fallback, source guards). One P1 guard relaxed: the "legacy ArrivalsPage carries no CR-385 marker" assertion now allows only the owner-mandated `// CR-385 M2 BUG-441/442` markers (dialog-usage snapshot itself unchanged). Guards/grep (X-01/X-06 forbidden words, `bookingId as reservationId`, `restaurant?.profile?.fullName`) empty. `yarn build` exit 0.

Summary: 2/2 fixed. Root cause pattern: CODE_ERROR ×2 (legacy CR-362 code). Scope expansion: **NONE** (3 files + tests + docs exactly as routed). Hotspots: none touched. Escalated: **BUG-443** (legacy `ModifyBookingDialog` still sends `amount_after_tax:0` + empty reason — MAJOR, not patched per the owner's hard rule "another 500/defect on the legacy page → STOP and file an intake") · **BUG-444** (tape chart hides pending Direct bookings → legacy Reservations Cancel not live-testable).

EXIT GATE: ☑ registry.json (BUG-441/442 FIXED + QA-VERIFIED; CR-385 GATE_5B_QA_PASSED (P1+P1.5)) ☑ BUG_TRACKER rows ☑ FILE_OWNERSHIP section ☑ `// CR-385 M2 BUG-441` ×4 / `BUG-442` ×7 markers ☑ compile clean → **5/5**.
Handover: "Fixed 2/2 issues. Root causes: 2 CODE_ERROR. Fix report at handover/CR-385_P1_5_BUG_FIX_REPORT_2026_09_22.md. Registry synced: YES. EXIT GATE: 5/5. Scope expansion: NONE. Escalated: BUG-443 (MAJOR), BUG-444 (MINOR) — intakes filed. QA re-test: iteration_15 rounds 1+2 → QA_REPORT_2026_09_22_CR385_P1_5_ROLE4.md."
