# CR-048 — Impact Analysis: Auto-Sync Registry → Dashboard JSON

**ID:** CR-048
**Gate:** 2 (Impact Analysis)
**Code Reality:** NONE — no existing auto-sync code
**Conflict Pre-Check:** No conflicts. Only touches `__dev/` files. CR-046 (Dashboard v2.0) is IMPLEMENTED — no active work in same files.

---

## 1. Problem

Dashboard reads static `__dev/data/*.json` snapshots. Registry.json is the source of truth but dashboard JSONs are manually regenerated. Every session misses the sync step → stale dashboard data.

Evidence from 2026-06-15 session: 3 separate sync misses, 12 bug statuses stale, 28 closed items still showing as active.

## 2. Data Flow Trace

### Current (broken):
```
Agent → updates registry.json ──────────────────── ✅ Source of truth updated
                                                    ❌ Dashboard still shows old data
Manual step (MISSED) → regenerate __dev/data/*.json  
Dashboard → reads __dev/data/bug_tracker.json ───── 🔴 STALE
Dashboard → reads __dev/data/cr_registry.json ───── 🔴 STALE
```

### Target (Option C — recommended):
```
Agent → updates registry.json ──────────────────── ✅ Source of truth updated
Symlink: __dev/data/registry.json → /app/memory/control/registry.json
Dashboard → loads registry.json ─────────────────── ✅ ALWAYS FRESH
Dashboard → transforms client-side to sections ──── ✅ No generator needed
Dashboard → falls back to static JSONs if error ─── ✅ Safety net
```

## 3. Affected Files

### Option C (recommended):

| # | File | Action | Impact |
|---|------|--------|--------|
| 1 | `/app/frontend/public/__dev/data/registry.json` | **NEW** (symlink to `/app/memory/control/registry.json`) | Dashboard can fetch source of truth directly |
| 2 | `/app/frontend/public/__dev/dashboard.js` | **MODIFY** — add `loadRegistry()` + `transformRegistryToBugs()` + `transformRegistryToCRs()` functions (~100 lines). Modify `loadAll()` to try registry first, fall back to static JSONs. | Dashboard renders from fresh registry data |

### Files NOT touched:
- `/app/frontend/src/**` — zero touch to application code
- `__dev/data/config.json` — unchanged
- `__dev/data/workflow_queue.json` — unchanged (separate API-driven flow)
- `__dev/data/closure_debt.json` — unchanged (separate data source)
- `__dev/data/access.json` — unchanged

## 4. Schema Transform Specification

### registry.json item → bug_tracker section mapping:

```
IF item.type === 'bug' OR item.id starts with 'BUG-' OR 'PROD':
  IF status contains CLOSED/SUBSUMED/DUPLICATE/VERIFIED:
    → older_closed_or_partial[]
  ELIF item.id starts with 'PROD':
    → production_hotfixes[]
  ELIF status contains BACKEND-BLOCKED/CRM-BLOCKED:
    → true_intake_or_blocked[]
  ELIF status contains INTAKE/REGISTERED/NOT STARTED:
    → active_recent_bugs[] (with _section = "Active / Recent")
  ELSE (PARTIAL, PLANNING, IMPLEMENTED, FE-ACTIONABLE, etc.):
    → active_recent_bugs[]
```

### registry.json item → cr_registry sprint mapping:

```
IF item.type === 'cr' OR item.id starts with 'CR-' or 'POS2-':
  Group by item.sprint_key → sprints[sprint_key].crs[]
  
  Category derivation:
    CLOSED/VERIFIED/FROZEN/SHIPPED → 'SHIPPED'
    IMPLEMENTED/QA → 'IN_PROGRESS'
    BACKEND-BLOCKED/CRM-BLOCKED → 'BLOCKED'
    SUBSUMED → 'SUBSUMED'
    INTAKE/REGISTERED/NOT STARTED → 'NOT_STARTED'
    PARKED/DEFERRED → 'PARKED'
```

### Summary counters (auto-derived):
```
bug_tracker.summary:
  total_tracked: count all bug items
  closed_verified: count CLOSED/SUBSUMED/DUPLICATE/VERIFIED
  open_intake: count INTAKE status
  backend_blocked: count BACKEND-BLOCKED
  crm_blocked: count CRM-BLOCKED

cr_registry counters:
  active_count: NOT_STARTED + IN_PROGRESS + BLOCKED
  shipped_count: SHIPPED
  subsumed_count: SUBSUMED
  tracked_total: sum of all
```

## 5. Downstream Consumers

| Consumer | Impact |
|----------|--------|
| Bug Tracker tab | Reads `allBugs` from sections → no change (transform produces same shape) |
| CR Registry tab | Reads `sprints.*.crs[]` → no change (transform produces same shape) |
| Closure Debt tab | Reads `closure_debt.json` → **NOT affected** (separate data source) |
| Workflow Queue | Reads `workflow_queue.json` → **NOT affected** (API-driven) |
| CSV Export | Reads from rendered `allBugs`/`filtered` → no change |
| `buildCrossRefIndex()` | Merges all 3 sources → works unchanged if shapes match |

## 6. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Symlink broken on deploy/clone | LOW | Fallback to static JSONs. Symlink created by deployment script. |
| registry.json format changes | LOW | Transform code validates shape, logs warnings on unknown fields |
| Large registry (216 items) → slow client parse | NEGLIGIBLE | 216 items is <50KB JSON, transforms in <10ms |
| Concurrent registry writes | N/A | Browser fetches a snapshot — no file locking needed |

## 7. Verification Matrix (seeds QA)

| # | Check | How to Verify | Automated? |
|---|-------|---------------|:---:|
| 1 | Symlink exists and resolves | `ls -la __dev/data/registry.json` → points to `/app/memory/control/registry.json` | YES (bash) |
| 2 | Dashboard loads without error | Open dashboard → no console errors | NO (browser) |
| 3 | Bug Tracker tab shows same items as registry | Compare dashboard bug count vs `registry.json` bug count | YES (script) |
| 4 | CR Registry tab shows same items as registry | Compare dashboard CR count vs `registry.json` CR count | YES (script) |
| 5 | Status change propagates immediately | Update registry.json status → refresh dashboard → new status visible | NO (browser) |
| 6 | Fallback works | Delete symlink → dashboard still loads from static JSONs | NO (browser) |
| 7 | closure_debt + workflow_queue unaffected | Both tabs still render correctly | NO (browser) |

## 8. Owner Decision Queue

| # | Question | Options |
|---|----------|---------|
| OQ-1 | Which approach? | **A** (file watcher, ~175 lines, new process) / **B** (backend endpoint, ~200 lines) / **C** (symlink + client transform, ~100 lines, recommended) |
| OQ-2 | Auto-generate `closure_debt.json` too? | YES (add to transform) / NO (keep manual) |
