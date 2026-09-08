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

- **Source:** Owner decision D4-a (2026-09-08)
- **Problem evidence:** F-PROC-06 from `PROJECT_BASELINE_2026_09.md` — 4 spellings of `type`, 497 null categories, 25 status variants found in registry
- **Confidence:** CONFIRMED — D4-a decision locked

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
