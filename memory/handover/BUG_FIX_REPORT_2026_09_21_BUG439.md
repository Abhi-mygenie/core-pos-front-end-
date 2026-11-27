# BUG FIX REPORT — 2026-09-21 — BUG-439 (Bug Fix role, ALPHA v0.7)

```
Trigger:   owner "choose bug fix role to fix this issue, follow gates and rules" (Gate 4 GO) · plan LOCKED Option A (D73) · execution BEFORE CR-385 Phase 1 GO
Boot:      QA report iteration_9.json REG-1 (MINOR) · plans/BUG-439_IMPLEMENTATION_PLAN.md · impact/BUG-439_IMPACT_ANALYSIS.md · FILE_OWNERSHIP (last modifiers CR-385 P0/P0.5) · source at the failing lines
Entry:     grep BUG-439 = 0 · ArrivalsPanel L41 `const actions = (r)`, L57 · DeparturesPanel L7 `stayActions = (r)`, L35 · InHousePanel L20 — all matched the plan
```

| Test # | Severity | RCA class | Root cause | Fix | Files changed | Verified |
|---|---|---|---|---|---|---|
| it.9 REG-1 duplicate testids (expanded row) | MINOR | **CODE_ERROR** | `ArrivalsPanel.jsx:57`, `DeparturesPanel.jsx:35`, `InHousePanel.jsx:20` hand `RowExpansionStub` the same `actions(row)` element `commonColumns` (GuestTable L123) already renders in the row cell → every `fd-row-<id>-<action>` id twice while that row is open (frozen unique-testid rule / X-10) | action factories take `variant` (`''` row · `'exp-'` drawer) → drawer ids `fd-row-<id>-exp-checkin-btn/-exp-kebab/-exp-bill-btn/-exp-hk-btn/-exp-extend-btn`; row ids byte-identical; no visual change | `ArrivalsPanel.jsx` L41–46, L57 · `DeparturesPanel.jsx` L7–12, L35 · `InHousePanel.jsx` L20 · NEW `__tests__/bug439.cr385.test.jsx` (`// BUG-439` ×10) | **Reproduced: YES** — test written first failed 3/6 (dupes `fd-row-15-checkin-btn/-kebab`, `fd-row-174-bill/hk/extend-btn`, `fd-row-155-…`). After fix 6/6; cr385 suite 44/44; QA `/app/test_reports/iteration_10.json` **7/7** (B439-1…5 + 2 adjacent: one-expansion, keyboard), 0 duplicates expanded/collapsed on 3 tabs + Rooms detail, 0 console errors |

Summary: 1/1 fixed. Root cause pattern: CODE_ERROR (plan/frozen rule was right, P0 code deviated). Scope expansion: **NONE** (`GuestTable.jsx` not touched). Escalated: none. Hotspots: none. Compile: webpack 0 new warnings; `yarn build` exit 0.

EXIT GATE: ☑ registry.json (BUG-439 FIXED + QA-VERIFIED) ☑ BUG_TRACKER row ☑ FILE_OWNERSHIP section ☑ `// BUG-439` markers ×10 ☑ compile clean → **5/5**.
Handover: "Fixed 1/1 issues. Root causes: 1 CODE_ERROR. Fix report at handover/BUG_FIX_REPORT_2026_09_21_BUG439.md. Registry synced: YES. EXIT GATE: 5/5. Scope expansion: NONE. Escalated: none. QA re-test round 1 done (iteration_10.json 7/7) → ready for owner smoke."
