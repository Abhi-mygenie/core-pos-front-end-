# CR-048-REBUILD — Impact Analysis: Dashboard Sync Script Rebuild

**ID:** CR-048-REBUILD
**Stage:** Gate 2 — Impact Analysis
**Date:** 2026-07-25
**Risk:** LOW (script generates static JSON files read by dashboard — no runtime impact on POS app)
**Code Reality:** NONE — script never existed in any git branch (46 branches searched). Was built in a previous agent pod session, never committed.

---

## 1. Problem

The Control Dashboard (`/__dev/index.html`) reads two JSON files:
- `public/__dev/data/cr_registry.json` — CR items grouped by sprint
- `public/__dev/data/bug_tracker.json` — BUG items grouped by status sections

Both are **stale from 2026-06-15** with **empty sprint arrays**. Source of truth `registry.json` has **388 items** (129 CRs, 255 BUGs). Dashboard shows **0 current items**.

Root cause: The generator script (`gen_dashboard_sync.js` from CR-048) was never committed to git. It existed only in a pod working directory that no longer exists.

---

## 2. What the Sync Script Must Do

```
INPUT:  /app/memory/control/registry.json  (388 items, source of truth)
OUTPUT: /app/frontend/public/__dev/data/cr_registry.json
        /app/frontend/public/__dev/data/bug_tracker.json
```

### 2a. cr_registry.json Schema (consumed by dashboard.js)

```json
{
  "generated_at": "ISO timestamp",
  "source": "gen_dashboard_sync.py",
  "schema_version": "2.0",
  "sprints": {
    "<sprint_key>": {
      "status": "IN_PROGRESS | CLOSED",
      "crs": [
        {
          "id": "CR-XXX",
          "title": "...",
          "status": "...",
          "priority": "P0-P3 | ''",
          "category": "NOT_STARTED | IN_PROGRESS | SHIPPED | BLOCKED | SUBSUMED",
          "artifact_refs": [ { "label": "...", "path": "...", "type": "..." } ]
        }
      ]
    }
  },
  "category_counts": { "NOT_STARTED": N, "IN_PROGRESS": N, "SHIPPED": N, ... },
  "active_count": N,
  "shipped_count": N,
  "closed_count": N,
  "tracked_total": N,
  "cross_sprint_dependency_flags": []
}
```

**Dashboard reads:** `data.sprints[key].crs[]` — iterates all sprints, flattens CRs, uses `id`, `title`, `status`, `priority`, `category`, `artifact_refs`, `sprint_key`, `sprint_status`.

### 2b. bug_tracker.json Schema (consumed by dashboard.js)

```json
{
  "generated_at": "ISO timestamp",
  "schema_version": "2.0",
  "source": "gen_dashboard_sync.py",
  "summary": { "total_tracked": N, "closed_verified": N, "open_intake": N, "backend_blocked": N },
  "active_recent_bugs": [ { bug item } ],
  "older_closed_or_partial": [ { bug item } ],
  "true_intake_or_blocked": [ { bug item } ],
  "production_hotfixes": [ { bug item } ],
  "intake_only_bugs": [ { bug item } ],
  "pos_2_0_closed_consolidated_2026_05_18": [],
  "pos_final_1_0_closed_consolidated_2026_05_12": [],
  "normalized_at": "ISO timestamp"
}
```

**Each bug item:**
```json
{
  "id": "BUG-XXX",
  "title": "...",
  "priority": "P0-P3 | ''",
  "status": "...",
  "sprint": "<sprint_key>",
  "blocker": "" | "Backend" | "CRM",
  "artifact_refs": { "intake": "path", "impact_analysis": "path", ... } | [ array format ],
  "completeness": "N/7"
}
```

**Dashboard reads:** Merges all section arrays, uses `id`, `title`, `priority`, `status`, `sprint`, `blocker`, `artifact_refs`, `_section`.

### 2c. Classification Logic (registry → dashboard categories)

**CR category mapping:**
| registry.json status contains | → dashboard `category` |
|---|----|
| `NOT STARTED` | `NOT_STARTED` |
| `CLOSED` or `SUBSUMED` or `CANNOT REPRODUCE` or `DUPLICATE` | `SHIPPED` |
| `QA PASS` or `OWNER VERIFIED` or `IMPLEMENTED` | `SHIPPED` |
| `BACKEND-BLOCKED` or `CRM-BLOCKED` | `BLOCKED` |
| `ABSORBED` or `HALTED` or `DEFERRED` | `SUBSUMED` |
| everything else (INTAKE, GATE, IN PROGRESS, etc.) | `IN_PROGRESS` |

**BUG section mapping:**
| registry.json status contains | → dashboard section |
|---|----|
| `PROD-` prefix in ID | `production_hotfixes` |
| `INTAKE` or `BACKEND-BLOCKED` or `CRM-BLOCKED` | `true_intake_or_blocked` |
| `CLOSED` or `VERIFIED` or `SUBSUMED` or `CANNOT REPRODUCE` | `older_closed_or_partial` |
| everything else (active work) | `active_recent_bugs` |

---

## 3. Source Data: registry.json Item Fields

Each item in `registry.json` has:
```
id, title, type, severity, risk, status, sprint_key, module, related,
files_to_change[], created, updated, artifact_refs{}, gate
```

**Mapping needed:**
| registry field | → cr_registry field | → bug_tracker field |
|---|---|---|
| `id` | `id` | `id` |
| `title` | `title` | `title` |
| `status` | `status` | `status` |
| `severity` | `priority` | `priority` |
| `sprint_key` | (grouped by sprint) | `sprint` |
| `artifact_refs` | `artifact_refs` (normalize) | `artifact_refs` (normalize) |
| `status` (classified) | `category` | (section assignment) |
| (derived) | — | `blocker` (extract from status) |
| (derived) | — | `completeness` (count artifacts) |

---

## 4. Files WILL Change

| File | Change |
|------|--------|
| `frontend/scripts/gen_dashboard_sync.py` | **NEW** — Python sync script (~120 lines) |
| `frontend/public/__dev/data/cr_registry.json` | **REGENERATED** by script |
| `frontend/public/__dev/data/bug_tracker.json` | **REGENERATED** by script |

## Files will NOT touch

- `frontend/public/__dev/dashboard.js` — reads the JSONs, no change needed
- `frontend/public/__dev/index.html` — no change
- `frontend/public/__dev/auth.js` — no change
- `memory/control/registry.json` — source of truth, read-only
- Any `/app/frontend/src/` file — dashboard is static HTML, not React app

---

## 5. Implementation Approach

**Python** (not JS) because:
- No node dependency needed — runs standalone
- `registry.json` is simple JSON → JSON transform
- Can be run as `python3 frontend/scripts/gen_dashboard_sync.py`

**Steps:**
1. Read `/app/memory/control/registry.json`
2. Split items by type: CRs vs BUGs (+ handle mixed types like `cr`, `bug`, `BUG`, `CR`)
3. For CRs: group by `sprint_key`, classify `category`, normalize `artifact_refs`
4. For BUGs: classify into sections, normalize fields
5. Write both output JSONs atomically
6. Print summary: "Generated N CRs across M sprints, N BUGs across K sections"

---

## 6. Artifact_refs Normalization

Registry has two formats:
- **Old format (array):** `[ { label, path, type } ]` — pass through as-is
- **New format (dict):** `{ intake: "path", impact_analysis: "path", implementation_plan: "path" }` — convert to array format for CR dashboard, keep as dict for BUG dashboard (dashboard.js handles both)

---

## 7. Risk Assessment

| Factor | Assessment |
|--------|-----------|
| Runtime impact | ZERO — script generates static files, not imported by React app |
| Data loss | NONE — only writes to `__dev/data/` (dashboard display files) |
| Regression | NONE — no existing code changes |
| Reversibility | Full — just delete generated files and restore from git |

**Risk: LOW**

---

## 8. Verification

| Check | Method |
|-------|--------|
| Script runs without error | `python3 frontend/scripts/gen_dashboard_sync.py` exits 0 |
| cr_registry.json has all CRs | Count items matches registry CR count (129) |
| bug_tracker.json has all BUGs | Count items matches registry BUG count (255) |
| Dashboard loads with data | Screenshot `/__dev/index.html` → items visible |
| Schema matches dashboard.js expectations | Dashboard tabs render without JS errors |

---

## Next

Ready for **Gate 3 — Implementation Plan** → then Gate 4 GO → Implementation.
