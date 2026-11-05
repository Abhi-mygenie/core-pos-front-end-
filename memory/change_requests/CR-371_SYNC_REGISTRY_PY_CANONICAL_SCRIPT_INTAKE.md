# CR-371 — Build sync_registry.py — Canonical Registry Sync Script

**ID:** CR-371  
**Type:** CR  
**Date:** 2026-09-08  
**Registered by:** INTAKE agent (AUDIT track)  
**Sprint:** pos_audit_1  

---

## 1. Summary

Write `control/sync_registry.py` — a Python script that atomically updates all 4 registry files (`registry.json`, `CR_REGISTRY.md`, `BUG_TRACKER.md`, `CONTROL_DASHBOARD.md`) from a single command. After this CR is CLOSED, manual edits to registry files are **forbidden** per owner decision D4-a. All agent registry changes must go through this script.

---

## 2. Scope

### CLI interface
```bash
python3 control/sync_registry.py \
  --id CR-xxx \
  --status QA-PASS \
  --gate 5 \
  [--sprint pos_audit_1] \
  [--note "short note"]
```

### What the script does
1. Reads `registry.json` — finds item by ID
2. Updates `status`, `gate`, `sprint_key`, `status_history[]` (appends entry with date + note)
3. Writes back `registry.json` (pretty-printed, sorted by ID)
4. Regenerates the relevant section in `CR_REGISTRY.md` (status + gate column)
5. Regenerates the relevant row in `BUG_TRACKER.md` if item is a BUG
6. Updates `CONTROL_DASHBOARD.md` last-updated line
7. Prints: `✅ <ID> → <status> (gate <N>) — 4 files updated`

### Validation rules
- Rejects unknown IDs (must be in registry.json)
- Rejects invalid status strings (canonical enum list from v0.8 R27)
- Rejects downgrade without `--force-downgrade` flag
- Dry-run mode: `--dry-run` prints what would change without writing

---

## 3. Classification

- **Type:** CR
- **Area:** Control Layer / Tooling
- **Priority:** P1
- **Risk:** LOW
- **Risk reason:** Script touches memory/control docs only. Zero `frontend/src/` changes.
- **Fast Lane eligible:** NO (new file, logic work)

---

## 4. Evidence

- **Screenshot:** not provided (tooling CR — no UI screenshot applicable)
- **Steps to reproduce:** `python3 -c "import json; d=json.load(open('/app/memory/control/registry.json')); statuses=set(i.get('status','') for i in d['items']); print(len(statuses), 'status variants:', statuses)"` → returns 25+ variants confirming data integrity problem
- **Curl output:** not applicable
- **Source:** OWNER-REPORTED — owner decision D4-a (2026-09-08): "registry changes must go through a canonical script"; F-PROC-06 in `control/PROJECT_BASELINE_2026_09.md` confirms 4 type spellings + 497 null categories + 25 status variants
- **Confidence:** CONFIRMED — D4-a decision locked; registry integrity problem reproducible via grep

---

## 5. Duplicate Check

- Registry search: no existing script or CR for registry automation.
- **Result: DISTINCT**

---

## 6. Code Reality Check

```
find /app/memory /app/frontend/src -name "sync_registry.py" → NOT EXISTS
```

- **Code reality: NONE**

---

## 7. Blast Radius

- New file: `control/sync_registry.py`
- Files it WRITES (at runtime, not at build): `registry.json`, `CR_REGISTRY.md`, `BUG_TRACKER.md`, `CONTROL_DASHBOARD.md`
- Hotspot files: NO
- Scope: SMALL (1 new Python file)

---

## 8. Owner Decisions

- **OD-CR371-01:** Canonical status enum list — agent will propose list at Planning; owner approves before script is written.
- **OD-CR371-02:** Should the script also regenerate `__dev/data/*.json` dashboard files? (Suggested: YES, to keep dev dashboard in sync)

---

## 9. Related

- **Owner decision:** D4-a — `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md` §5
- **Enforced by:** R27 in CR-369 (v0.8 prompt)
- **After CLOSED:** Manual edits to all 4 registry files forbidden
---
## INTAKE HANDOVER

```
Item CR-371 registered. Intake doc at change_requests/CR-371_SYNC_REGISTRY_PY_CANONICAL_SCRIPT_INTAKE.md.
Code reality: NONE.
Duplicate check: DISTINCT.
Severity: P1 (agent-classified).
Blast radius: SMALL (1 new Python file; NO hotspots).
Evidence: CONFIRMED — D4-a locked; 25 status variants in registry reproduced.
Owner decisions needed: OD-CR371-01: approve canonical enum. OD-CR371-02: regenerate __dev/data/*.json YES/NO.
Next: Planning agent for Gates 2-3.
```
