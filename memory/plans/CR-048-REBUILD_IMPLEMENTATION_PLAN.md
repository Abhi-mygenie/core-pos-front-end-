# CR-048-REBUILD — Implementation Plan

**ID:** CR-048-REBUILD
**Stage:** Gate 3 — Implementation Plan
**Date:** 2026-07-25
**Risk:** LOW
**Impact Analysis:** `/app/memory/impact/CR-048-REBUILD_IMPACT_ANALYSIS.md`

---

## 1. Scope Lock

### Files WILL change:
| File | Action |
|------|--------|
| `frontend/scripts/gen_dashboard_sync.py` | **NEW** — sync script |
| `frontend/public/__dev/data/cr_registry.json` | **REGENERATED** by script |
| `frontend/public/__dev/data/bug_tracker.json` | **REGENERATED** by script |

### Files will NOT touch:
- `dashboard.js`, `index.html`, `auth.js`, `styles.css`, `workflow.js`
- `memory/control/registry.json` (read-only source)
- Any `frontend/src/` file

---

## 2. Script Design: `gen_dashboard_sync.py`

### Input
```
/app/memory/control/registry.json
```

### Outputs
```
/app/frontend/public/__dev/data/cr_registry.json
/app/frontend/public/__dev/data/bug_tracker.json
```

### Pseudocode

```
1. Load registry.json

2. Split items:
   - CRs = items where type.upper() in ('CR',) OR id starts with 'CR-' or 'POS2-' or 'UX-' or 'DEV-'
   - BUGs = items where type.upper() in ('BUG',) OR id starts with 'BUG-' or 'PROD-'
   - Ambiguous → classify by id prefix

3. For each CR — classify category:
   status_upper = item.status.upper()
   if 'NOT STARTED' in status_upper                         → NOT_STARTED
   elif any(x in status_upper for x in CLOSED_KEYWORDS)     → SHIPPED
   elif any(x in status_upper for x in BLOCKED_KEYWORDS)    → BLOCKED
   elif any(x in status_upper for x in ABSORBED_KEYWORDS)   → SUBSUMED
   else                                                      → IN_PROGRESS

   CLOSED_KEYWORDS = ['CLOSED', 'QA PASS', 'OWNER VERIFIED', 'SHIPPED', 
                       'IMPLEMENTED', 'VERIFIED', 'SUBSUMED', 'CANNOT REPRODUCE',
                       'DUPLICATE', 'NOT A BUG', 'AS DESIGNED', 'AS DESIRED']
   BLOCKED_KEYWORDS = ['BACKEND-BLOCKED', 'CRM-BLOCKED']
   ABSORBED_KEYWORDS = ['ABSORBED', 'HALTED', 'DEFERRED', 'RETIRED']

4. For each CR — normalize artifact_refs:
   if dict → convert to array: [ {label: key_label, path: value, type: key} for k,v ]
   if array → pass through
   if missing → []

5. Group CRs by sprint_key → build sprints dict:
   sprints[sprint_key] = {
     status: "CLOSED" if all CRs shipped/closed else "IN_PROGRESS",
     crs: [ { id, title, status, priority, category, artifact_refs } ]
   }

6. Compute summary counts:
   category_counts = count per category across all CRs
   active_count = NOT_STARTED + IN_PROGRESS + BLOCKED
   shipped_count = SHIPPED
   closed_count = SHIPPED (same in this schema)
   tracked_total = len(all_crs)

7. Write cr_registry.json

8. For each BUG — classify into section:
   if id starts with 'PROD-'                                → production_hotfixes
   elif any(x in status_upper for x in INTAKE_KEYWORDS)     → true_intake_or_blocked
   elif any(x in status_upper for x in CLOSED_KEYWORDS)     → older_closed_or_partial
   else                                                      → active_recent_bugs

   INTAKE_KEYWORDS = ['INTAKE', 'BACKEND-BLOCKED', 'CRM-BLOCKED', 'NOT STARTED']

9. For each BUG — build item:
   {
     id, title,
     priority: item.severity or '',
     status: item.status,
     sprint: item.sprint_key or '',
     blocker: extract_blocker(status),
     artifact_refs: normalize(item.artifact_refs),
     completeness: count_completeness(item.artifact_refs)
   }

   extract_blocker:
     if 'BACKEND' in status → 'Backend'
     elif 'CRM' in status → 'CRM'
     else → ''

   count_completeness:
     possible = 7 (intake, impact, plan, code_gate, impl, qa, smoke)
     present = count non-empty values in artifact_refs
     return f"{present}/7"

10. Build bug_tracker.json:
    {
      generated_at, schema_version: "2.0", source,
      summary: { total_tracked, closed_verified, open_intake, backend_blocked },
      active_recent_bugs: [...],
      older_closed_or_partial: [...],
      true_intake_or_blocked: [...],
      production_hotfixes: [...],
      intake_only_bugs: [],
      pos_2_0_closed_consolidated_2026_05_18: [],
      pos_final_1_0_closed_consolidated_2026_05_12: [],
      normalized_at: timestamp
    }

11. Write bug_tracker.json

12. Print summary
```

---

## 3. Execution Sequence

1. Create `frontend/scripts/gen_dashboard_sync.py` (~120 lines)
2. Run: `python3 /app/frontend/scripts/gen_dashboard_sync.py`
3. Verify outputs (counts, schema, dashboard loads)

---

## 4. Verification Matrix

| # | Check | Method | Automated? |
|---|-------|--------|:---:|
| V1 | Script exits 0 | Run script | YES |
| V2 | cr_registry.json CR count = 129 | `python3 -c "..."` count check | YES |
| V3 | bug_tracker.json BUG count = 255 | `python3 -c "..."` count check | YES |
| V4 | All sprint_keys present | Compare registry sprints vs output sprints | YES |
| V5 | Schema matches dashboard.js | Dashboard loads without JS errors | YES (screenshot) |
| V6 | Items visible in dashboard | Screenshot `/__dev/index.html` after login | NO (manual) |

---

## 5. Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: CR-048-REBUILD registered (or note appended to CR-048)
- [ ] FILE_OWNERSHIP.md: gen_dashboard_sync.py listed
- [ ] Code markers: # CR-048-REBUILD in script header
- [ ] Compile check: N/A (standalone Python script, not part of webpack)
- [ ] Output verification: both JSONs generated with correct counts
```

---

## 6. Risk Notes

- Script is idempotent — can be re-run safely anytime
- Legacy empty arrays (`pos_2_0_closed_consolidated_2026_05_18`, etc.) kept for backward compat with dashboard.js
- `artifact_refs` format varies between old items (array) and new items (dict) — script handles both

---

## Next

Awaiting **Gate 4 GO** from owner to proceed to Implementation.
