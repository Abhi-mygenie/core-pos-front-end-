# CR-048: Auto-Sync Registry → Dashboard JSON

**ID:** CR-048
**Type:** CR (Dev Tooling)
**Status:** INTAKE COMPLETE + IMPACT ANALYSIS COMPLETE (Gate 2)
**Priority:** P1 (process reliability — #1 recurring gap in every session)
**Area:** Dev Tooling / Control Dashboard
**Sprint:** POS 5.0
**Created:** 2026-06-15
**Source:** AGENT-DISCOVERED (session 2026-06-15 — 3 separate sync misses in one day)
**Confidence:** CONFIRMED

---

## Problem Statement

The Control Dashboard (`/public/__dev/dashboard.js`) reads from **static JSON snapshots** (`__dev/data/bug_tracker.json`, `cr_registry.json`), NOT from the source-of-truth `registry.json`. Every time an agent updates `registry.json`, the dashboard JSONs become stale. This sync step is manual and **gets missed every session** — causing:

1. Owner sees stale statuses on dashboard (e.g., BACKEND-BLOCKED items that are actually FE-ACTIONABLE)
2. Sprint counts are wrong (closed items appear as open)
3. Agents waste time debugging "why dashboard doesn't match registry"
4. Session 2026-06-15 alone had **3 separate sync misses**, requiring 3 manual regenerations

---

## Impact Analysis (Gate 2)

### Option A: File Watcher (Quick Win — recommended for immediate fix)

**Approach:** A `chokidar` file watcher process runs via supervisor. Watches `registry.json`. On change → runs a generator script that rebuilds `bug_tracker.json` + `cr_registry.json` from registry.

**Data flow:**
```
Agent updates registry.json
  → chokidar detects file change
    → node gen_dashboard_sync.js executes
      → reads registry.json
      → transforms to bug_tracker.json schema (sections, sprints, summary counts)
      → transforms to cr_registry.json schema (sprints.*.crs[], category_counts)
      → writes __dev/data/bug_tracker.json + cr_registry.json
        → dashboard auto-refreshes on next page load
```

**Files affected:**
| # | File | Action | Lines |
|---|------|--------|-------|
| 1 | `scripts/gen_dashboard_sync.js` | **NEW** — generator script | ~150 |
| 2 | `scripts/watch_registry.js` | **NEW** — chokidar watcher | ~20 |
| 3 | supervisor config (or package.json script) | **MODIFY** — add watcher process | ~5 |

**Schema mapping needed (registry.json → dashboard JSONs):**

**Bug Tracker JSON:**
- `registry.json` items where `type === 'bug'` → classify into sections:
  - `active_recent_bugs`: status NOT closed/subsumed/duplicate AND sprint_key in recent sprints
  - `older_closed_or_partial`: status contains CLOSED/SUBSUMED/DUPLICATE
  - `true_intake_or_blocked`: status contains INTAKE or BACKEND-BLOCKED (no sprint-specific)
  - `production_hotfixes`: id starts with PROD
- Summary counters: derive from item statuses
- Per-bug fields: `{ id, title, priority, status, sprint, blocker, artifact_refs }`

**CR Registry JSON:**
- `registry.json` items where `type === 'cr'` or id starts with CR/POS2 → group by `sprint_key`
- Per-sprint: `{ status, crs: [{ id, title, status, priority, category }] }`
- Category mapping: CLOSED/VERIFIED/FROZEN → SHIPPED, INTAKE/REGISTERED → NOT_STARTED, etc.
- Top-level counters: `active_count`, `shipped_count`, `tracked_total`

**Risks:**
- LOW: generator runs in `__dev/` context only, zero touch to `/src/`
- Edge case: concurrent writes to registry.json (mitigated by debounce on watcher)
- Must preserve existing `closure_debt.json`, `config.json`, `workflow_queue.json`, `access.json` — generator only overwrites bug_tracker + cr_registry

**Estimated effort:** ~175 lines across 2 new files + 5 lines config. 2-3 hours.

---

### Option B: Dashboard Reads Registry Directly (Ideal — eliminates sync entirely)

**Approach:** Modify `dashboard.js` to fetch `/api/workflow-queue` style endpoint that returns registry.json data, or fetch `../../../memory/control/registry.json` directly (since dashboard is in `public/__dev/`).

**Problem:** `registry.json` is at `/app/memory/control/registry.json` — outside the `public/` directory. Can't be fetched from browser. Would need:
- A backend endpoint: `GET /api/registry` → reads and returns registry.json
- OR a symlink: `ln -s /app/memory/control/registry.json /app/frontend/public/__dev/data/registry.json`
- OR dashboard.js transforms registry.json client-side

**The symlink approach is simplest:**
```
ln -s /app/memory/control/registry.json /app/frontend/public/__dev/data/registry.json
```
Then `dashboard.js` fetches `./data/registry.json` and transforms in-browser. No watcher, no generator, no new process.

**But:** dashboard.js would need significant rewrite (~200 lines) to transform flat registry items into the sectioned bug_tracker/cr_registry schemas it currently expects. The `buildCrossRefIndex` function (line 69) merges 3 data sources — would need to derive all 3 from one.

**Estimated effort:** ~200 lines dashboard.js rewrite + symlink. 3-4 hours. Higher risk (touches active dashboard).

---

### Option C: Hybrid — Symlink + Thin Generator (Best of both)

**Approach:**
1. Symlink registry.json into `__dev/data/`
2. Dashboard loads `registry.json` as primary source
3. A thin `<script>` in dashboard.html or inline in dashboard.js transforms registry → the existing section structure at **load time** (no file watcher, no external process)
4. Existing `bug_tracker.json` / `cr_registry.json` become fallbacks (loaded if registry.json fails)

**This eliminates:** file watcher process, generator script, supervisor config. Just a symlink + ~100 lines of transform code in dashboard.js.

**Estimated effort:** ~100 lines in dashboard.js + 1 symlink. 1-2 hours. Lowest risk.

---

## Recommendation

**Option C (Hybrid)** for lowest effort + zero new processes + eliminates sync gap permanently.

Fallback: **Option A (File Watcher)** if dashboard.js changes are unwanted.

---

## Duplicate Check

- **RELATED to CR-046** (Dashboard v2.0 — Workflow Controller). CR-046 added batch queue, gate buttons, smoke cards. CR-048 fixes the data freshness problem underneath.
- **DISTINCT** — CR-046 is feature work, CR-048 is infrastructure/reliability.

## Blast Radius

- **Estimated scope:** SMALL for Option C (1 file + symlink), MEDIUM for Option A (2 new files + config)
- **Hotspot files touched:** NO (all in `__dev/`, zero touch to `/src/`)
- **Regression risk:** ZERO — dashboard is dev tooling, not customer-facing

## Open Questions

| # | Question | For |
|---|----------|-----|
| OQ-1 | Option A, B, or C? | Owner decision |
| OQ-2 | Should `closure_debt.json` also be auto-generated from registry? | Owner decision (currently hand-maintained) |

## Routing

→ **Owner picks option (A/B/C)** → PLANNING (Gate 3: implementation plan) → IMPLEMENTATION
