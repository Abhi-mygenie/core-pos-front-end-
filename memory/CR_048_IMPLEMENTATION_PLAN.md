# CR-048 — Implementation Plan (Gate 3)

**ID:** CR-048
**Title:** Auto-Sync Registry → Dashboard JSON (File Watcher)
**Priority:** P1
**Sprint:** POS 5.0
**Date:** 2026-06-15
**Owner Decisions:**
- OQ-1: **Option A** — File watcher (chokidar)
- OQ-2: **No** — closure_debt.json stays manual
- **Constraint:** Env-gated via `ENABLE_DASHBOARD_SYNC` — disabled in production

---

## Scope Lock

**Files WILL change:**
1. `scripts/gen_dashboard_sync.js` — **NEW** — generator that reads registry.json → writes bug_tracker.json + cr_registry.json
2. `scripts/watch_registry.js` — **NEW** — chokidar watcher that triggers generator on registry.json change
3. `frontend/.env` — **ADD** `ENABLE_DASHBOARD_SYNC=true` (preview only)

**Files will NOT touch:**
- `frontend/src/**` — zero app code changes
- `frontend/public/__dev/dashboard.js` — no change
- `__dev/data/config.json`, `workflow_queue.json`, `access.json`, `closure_debt.json` — untouched

---

## Edits

### Edit 1: `scripts/gen_dashboard_sync.js` — NEW

Generator script that:
1. Reads `/app/memory/control/registry.json`
2. Classifies items into bug_tracker sections (matching existing schema):
   - `active_recent_bugs` — bugs with active statuses in recent sprints
   - `older_closed_or_partial` — CLOSED/SUBSUMED/DUPLICATE bugs
   - `true_intake_or_blocked` — INTAKE or BACKEND-BLOCKED bugs
   - `production_hotfixes` — PROD-* items
   - Sprint-specific closed sections (pos_2_0, pos_final_1_0, etc.)
   - `summary` counters (total_tracked, closed_verified, open_intake, backend_blocked, crm_blocked)
3. Classifies CR items into cr_registry sprints (matching existing schema):
   - Group by `sprint_key`
   - Derive `category`: SHIPPED / IN_PROGRESS / BLOCKED / NOT_STARTED / SUBSUMED / PARKED
   - Compute `active_count`, `shipped_count`, `subsumed_count`, `tracked_total`
4. Writes `__dev/data/bug_tracker.json` + `__dev/data/cr_registry.json`
5. Logs: `[DashboardSync] Regenerated: X bugs, Y CRs`

**Per-bug output fields** (match existing schema):
```json
{ "id", "title", "priority", "status", "sprint", "blocker", "artifact_refs", "completeness" }
```

**Per-CR output fields:**
```json
{ "id", "title", "status", "priority", "category", "artifact_refs" }
```

~150 lines.

### Edit 2: `scripts/watch_registry.js` — NEW

Watcher script that:
1. Checks `process.env.ENABLE_DASHBOARD_SYNC` — exits immediately if not `'true'`
2. Uses `chokidar` to watch `/app/memory/control/registry.json`
3. On change: debounce 500ms → runs `gen_dashboard_sync.js`
4. On startup: runs generator once (initial sync)
5. Logs: `[DashboardSync] Watcher started` / `[DashboardSync] Registry changed, regenerating...`

~25 lines.

### Edit 3: `frontend/.env` — ADD env variable

```
ENABLE_DASHBOARD_SYNC=true
```

In production: this variable is NOT set or set to `false` → watcher exits immediately → zero impact.

### Edit 4: Start watcher process

Add to package.json scripts or run via a simple node invocation from supervisor. Since this is dev-only tooling, a `node scripts/watch_registry.js &` in the frontend start sequence or a separate supervisor entry.

Simplest: add to `scripts` in package.json:
```json
"dashboard-sync": "node ../scripts/watch_registry.js"
```

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | gen_dashboard_sync.js | Generator produces correct JSON | Run script → diff output vs existing bug_tracker.json structure | YES |
| 2 | watch_registry.js | Watcher triggers on change | Modify registry.json → check bug_tracker.json updated within 2s | NO |
| 3 | .env | Env gate works | Set ENABLE_DASHBOARD_SYNC=false → watcher exits immediately | YES |
| 4 | — | Bug counts match | `python3 -c "compare registry item count vs generated json count"` | YES |
| 5 | — | CR categories correct | Spot-check 5 CRs: registry status → correct category in generated JSON | YES |
| 6 | — | Existing dashboard loads | Open dashboard → no errors, data renders | NO |

---

## Post-Code Registry Checklist

- [ ] registry.json: CR-048 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add gen_dashboard_sync.js, watch_registry.js
- [ ] Code markers: `// CR-048` in every new file

---

## Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| Watcher runs in prod | ZERO | Env-gated: exits if ENABLE_DASHBOARD_SYNC !== 'true' |
| Generator produces wrong schema | LOW | Verify against existing JSON shape before overwriting |
| Concurrent registry writes corrupt JSON | LOW | chokidar debounce 500ms; JSON.parse with try/catch |
| chokidar dependency | LOW | Already used by react-scripts/webpack dev server |

---

## Execution Sequence

1. Install chokidar if not already available → `yarn add chokidar` (check if already in node_modules via react-scripts)
2. Create `scripts/gen_dashboard_sync.js`
3. Create `scripts/watch_registry.js`
4. Add env var to `.env`
5. Test: run generator manually → verify output matches existing schema
6. Test: start watcher → modify registry → verify auto-regeneration
7. Compile check (no webpack impact — scripts are outside src/)
