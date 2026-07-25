# Closure Debt v2.4 — Auto-Promotion + Active-Only Register

**Date:** 2026-05-30
**Audit revision:** v2.4_2026_05_30
**Trigger:** Owner directive — "since all artifacts are there it shd be auto promoted to closed owner verified; as well refrence from debt register shd also be not there"

---

## 1. What changed

### 1.1 Status auto-promotion (scanner)
Inside `patch_bug_tracker()`, every bug that satisfies BOTH:
1. `completeness == "7/7"` (all 7 slots filled; WAIVED counts as filled), **AND**
2. `smoke_signoff` slot is present in `artifact_refs`

...is auto-promoted from `CLOSED — IMPLEMENTED` to `CLOSED — OWNER VERIFIED`, with a `status_history[]` entry capturing the timestamp + reason.

**Result:** 23 bugs migrated this run.

```
Before: CLOSED — IMPLEMENTED   = 36   |   CLOSED — OWNER VERIFIED = 41
After:  CLOSED — IMPLEMENTED   = 13   |   CLOSED — OWNER VERIFIED = 64
```

Affected bugs (POS 2.0 + POS 3.0 mostly):
BUG-050, 051, 052, 054, 055, 056, 062, 066, 067, 072, 073, 075, 079, 080, 083 (POS 2.0)
BUG-087, 088, 089, 098, 099, 100, 102, 103 (POS 3.0)

### 1.2 Active debt register cleanup
Inside `update_csv_and_closure_debt()`:
- CSV row gets new column `archived` set to `"Y"` when `missing_count == 0`.
- Dashboard snapshot `closure_debt.json` excludes archived rows from `items[]`.
- Snapshot gains `archived_count` (= 9) and `tracked_total` (= 28) fields so the UI can show the headline.

**Result:** Closure Debt tab shows **19 active items** (was 28). The 9 fully closed items are removed from view but preserved in CSV for audit history.

### 1.3 Dashboard UI updates
- Tab badge: `Closure Debt 19` (was `19 / 28`, was `28`).
- Headline strip:
  - `ACTIVE DEBT 19` items still need work
  - `ARCHIVED (FULLY CLOSED) 9`
  - `ALL-TIME TRACKED 28`
- Stat cards: All Active · CRITICAL · HIGH · MEDIUM · LOW · Filtered Effort (RESOLVED card removed — nothing to show in active view).
- Severity filter dropdown: removed RESOLVED / Active options (only CRITICAL/HIGH/MEDIUM/LOW).

## 2. Auditability guarantees

| Concern | How it's preserved |
|---|---|
| Did the agent really verify the 23 bugs were owner-confirmed? | Each promotion writes a `status_history[]` entry with date + reason. Scanner re-run is idempotent. |
| Where can owner see the archived rows? | `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv` retains all 28 rows; archived ones have `archived=Y`. |
| Can the register grow back if a doc is deleted? | Yes. If any artifact md file is removed, scanner re-run will set `missing_count > 0` and the bug re-appears in active register. |
| Can a status promotion be undone? | Yes. Delete the smoke_signoff artifact OR manually edit bug_tracker.json; scanner respects manual status changes (only promotes from `CLOSED — IMPLEMENTED` to `CLOSED — OWNER VERIFIED`, never the reverse). |

## 3. Files modified

```
MOD  /app/scripts/reaudit_closure_debt.py
       - patch_bug_tracker(): added auto-promotion logic
       - update_csv_and_closure_debt(): added archived column + filtered snapshot
       - main(): logs `promoted` count
MOD  /app/frontend/public/__dev/dashboard.js
       - Closure tab badge uses items.length (active only)
       - Headline strip: Archived / All-time tracked
       - Severity cards: removed RESOLVED
       - Severity dropdown: removed RESOLVED/Active options
       - Default severity filter: ALL (since RESOLVED is no longer in items[])
MOD  /app/frontend/public/__dev/data/closure_debt.json   (regenerated — 19 active items + meta)
MOD  /app/frontend/public/__dev/data/bug_tracker.json    (23 bugs promoted)
MOD  /app/memory/control/CLOSURE_DEBT_BURNDOWN.csv       (archived column added)
```

## 4. Promoted bugs — sample status_history entry

```json
{
  "from": "CLOSED — IMPLEMENTED",
  "to": "CLOSED — OWNER VERIFIED",
  "date": "2026-05-30",
  "reason": "Auto-promoted: 7/7 artifacts present incl. smoke_signoff (owner directive 2026-05-30)"
}
```

---
*— End of v2.4 patch report —*
