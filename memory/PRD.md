# MyGenie POS Frontend — PRD

## Current Session: 2026-06-15

### Completed This Session
1. **CR-047 AGENT_PROMPT_ALPHA v0.6 — CLOSED — OWNER VERIFIED**
   - Full gate cycle: Intake → Impact Analysis → Implementation Plan → Owner GO → Implementation → Owner Smoke → CLOSED
   - 8 edits to `AGENT_PROMPT_ALPHA.md` (1149 → 1482 lines)
   - STEP -1 rewrite (+handover reading, +stale batch 48h, +multi-batch, +owner fallback)
   - NEW STEP -1.5 conditional env check (execution roles only)
   - PLANNING +stage dispatch (Gate 2 only / Gate 3 only / ask)
   - INTAKE hardened (+severity rubric P0-P3, +duplicate detection, +evidence storage, +blast radius)
   - QA hardened (+4-tier finding severity, +evidence format, +regression calibration, +coverage check, +re-test protocol)
   - BUG FIX full rewrite (+reproduce-first, +5 RCA classifications, +fix report, +5 escalation paths)
   - INVESTIGATION hardened (+10-step time-box, +hypothesis method, +data persistence, +exit criteria)
   - Zero application code changes

### Architecture
- **Frontend:** React 19, CRACO, Tailwind CSS, Radix UI, shadcn components
- **Backend API:** Laravel at preprod.mygenie.online (external)
- **Socket:** presocket.mygenie.online (external)
- **Auth:** Firebase
- **CRM:** Customer intelligence service (external)
- **Agent Control:** 12-role prompt system (AGENT_PROMPT_ALPHA v0.6), registry.json, gate-based workflow

### POS 5.0 Sprint
- **CLOSED this session:** CR-047 (Agent Prompt v0.6)
- **Active:** CR-041 (Navigation — owner decisions pending), CR-043 (Credit — Gate 1 only)
- **Queued:** BATCH-2026-06-15-001 (BUG-096, BUG-118, BUG-123, BUG-040, BUG-041, BUG-085)
- **Deferred from POS 4.0:** 16 bugs (backend-blocked, CRM-blocked, owner-scope-needed)

### Prioritized Backlog
| Priority | Items |
|----------|-------|
| **P0** | BUG-123 (401 redirect), CR-028 (item-level discount) |
| **P1** | BUG-118 (coupons), BUG-130 (channel visibility), CR-036 family (merge from menu-bug branch) |
| **P2** | CR-027 (unified toast), CR-043 (credit totals), CR-041 (navigation) |
| **Future CRs** | Role 7/8/12 hardening (DEPLOYMENT, SMOKE, RELEASE — rated 2-3/5) |

### Key Files
| File | Purpose |
|------|---------|
| `/app/memory/control/AGENT_PROMPT_ALPHA.md` | v0.6 agent system prompt (1482 lines) |
| `/app/memory/control/registry.json` | Single source of truth (214 items) |
| `/app/memory/control/CR_REGISTRY.md` | CR tracking |
| `/app/memory/control/BUG_TRACKER.md` | Bug tracking |
| `/app/memory/control/SPRINT_STATUS.md` | Sprint progress |
| `/app/memory/control/POS5_0_SPRINT_PLANNING_2026_06_13.md` | Current sprint plan |

### Next Steps
1. Process workflow queue BATCH-2026-06-15-001 (6 items for impact analysis)
2. POS 5.0 Phase 1: Merge menu-bug branch (CR-036 family + CR-029-QSR)
3. POS 5.0 Phase 2: BUG-123 (401 redirect) + BUG-118 (coupons) + BUG-130 (channel visibility)
4. POS 5.0 Phase 3: CR-028 (item-level discount) + CR-043 (credit totals)
