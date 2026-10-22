# CR-420 — Intake (Gate 1)
## sheets_sync.py: Post-Push QA Gap Fixes (8 gaps from Abhishek review 2026-10-14)

**ID:** CR-420
**Type:** CR
**Date:** 2026-10-14
**Registered by:** INTAKE agent (owner session 2026-10-14)
**Sprint:** tooling_oct1
**Area:** Control Layer / Tooling
**Priority:** P1
**Risk:** MEDIUM
**Related:** CR-419 (direct parent — this CR fixes post-implementation gaps found in QA review)

---

## 1. Duplicate Check

**DISTINCT.**

| ID | Status | Conflict? |
|---|---|---|
| CR-419 | GATE_5A_IMPLEMENTED | NONE — CR-419 is the parent. CR-420 fixes gaps discovered in its first push. |
| CR-416 | GATE_5A_IMPLEMENTED | NONE — agent roles unchanged; CLI flags unchanged. |
| CR-406 | GATE_5A_IMPLEMENTED | NONE — closed. |

---

## 2. What This CR Does

Fixes 8 gaps identified during Abhishek's post-push review (2026-10-14 16:16 UTC push),
validated in investigation session 2026-10-14.
All fixes are in `memory/reports/sheets_sync.py` only.

### P0 — Data integrity (must fix before next push)

**G1 — Assignee column (col M) overwritten on every push**
`update_all_items_inplace()` writes all 22 contract columns including col M (Assignee = blank).
This destroys any Assignee values the dashboard set between pushes.
Fix: split the batchUpdate range into A–L and N–V, skipping col M entirely.

**G2 — DEFERRED items wrongly UNCLASSIFIED**
`to_contract_status()` checks `'DEFERRED' in s and 'GATE' not in s`.
Long status strings (e.g. BUG-443, BUG-444, BUG-449) contain "GATE" deep in prose notes
("Gate 5 CLOSED 2026-09-24"). The check incorrectly fires, routing DEFERRED items
to UNCLASSIFIED instead of PARKED. 7 items affected.
Fix: check if string *starts with* a gate pattern (`re.match(r'^GATE[_\s]?\d', s)`)
instead of `'GATE' not in s`.

### P1 — Status + Type mapping (35 items still UNCLASSIFIED)

**G3 — Status map missing 8 patterns (35 items wrongly INTAKE)**
Patterns not yet handled in `to_contract_status()`:

| Pattern | Contract Status | Items |
|---|---|---|
| `QA-VERIFIED`, `FIXED + QA-VERIFIED`, `FIXED-BY-CONSTRUCTION + QA-VERIFIED`, `GATE_5_PENDING_QA` | QA | 16 |
| `INVESTIGATION COMPLETE`, `SUPERSEDED by/BY_`, `SPLIT →` | CLOSED | 10 |
| `REVIEW-AFTER-`, `DEFERRED-TO-FU` (with GATE in prose) | PARKED | +fixes G2 |
| `INVESTIGATED_ROOT_CAUSE_UPSTREAM`, `BACKEND_BRIEF_FILED`, `BACKEND_BLOCKED`, `HOLD — BACKEND` | PLANNING + Blocked on = BACKEND | 5 |
| `IMPLEMENTATION IN PROGRESS`, `Phase N COMPLETE` (verified) | IMPLEMENTED | ~2 |

One conflict to resolve: `BUG-268` matches both "INVESTIGATION COMPLETE" (→ CLOSED) and
"BACKEND-BLOCKED" suffix (→ PLANNING+Blocked). Contract §4: BLOCKED is not a Status — item
keeps its real stage. BUG-268 = PLANNING + Blocked on = BACKEND.
Rule: BACKEND-BLOCKED suffix takes priority over INVESTIGATION COMPLETE.

**G4 — Type: "INVESTIGATION" → "INV", 9 blank types left as-is**
`to_contract_row()` does `.upper()` on the `type` field but doesn't normalise:
- `INVESTIGATION` → `INV` (7 items: INV-ROOM-001 through INV-LOYALTY-COUPON-SCAN-OCT12)
- Blank type (9 items: CR-035, BUG-169/170/171, BUG-506/507/508, BUG-528/529)
  → derive from ID prefix if possible; if truly unknown leave blank (not an error per contract).

**G5 — Blocked on = item ID (CR-061) should go to Related**
CR-062's registry `blocked_by = CR-061`. An item ID is not a valid Blocked on party.
Fix: in `to_contract_row()`, if `blocked_by` matches `CR-/BUG-/PROD-` pattern,
move the value to Related and leave Blocked on blank.

**G6 — Last updated = push date for all 836 rows**
`last_updated = datetime.now(timezone.utc).strftime('%Y-%m-%d')` is hardcoded to today for
every item regardless of when it actually changed. Contract §3: "date of the last registry
change; agent-computed only."
Fix: use the item's own date field if present (`last_updated`, `updated`, `updated_at`,
`implemented_date`, `qa_date`); fall back to push date only when truly absent.
Coverage of any date field: 85/836 (10%). Remaining 751 correctly fall back to push date.

**G9 — Registered date: recover from intake doc file (OD-420-07)**
164/837 items have a `registered` field. 161 more have an `intake_doc` but no `registered`.
87 of those intake doc files contain a parseable `**Date:**` line within the first 15 lines.
Fix: extend `compute_registered()` — if `registered` is blank and `intake_doc` path exists,
open the file, read first 15 lines, extract the `**Date:**` value.
Recovery: 164 (registry) + 87 (intake doc) = **251 items** will have a Registered date.
Remaining ~586 left blank (owner fills in sheet; Change Log carries back to registry).

### P2 — Summary format + stage tab freeze

**G7 — Summary: ISO timestamp + show all 8 Blocked on parties including zeros**
- `Generated:` line uses `%Y-%m-%d %H:%M UTC`. Contract §6 example: `2026-10-14T16:16:00Z`.
  Fix: use `.isoformat()` or `strftime('%Y-%m-%dT%H:%M:%SZ')`.
- Blocked on block uses Counter (parties with zero count not shown). All 8 standard parties
  (`BACKEND / POS / CRM / SO / INV / INFRA / OWNER / OPS / INTERNAL`) must appear even at 0.

**G8 — Stage tabs: freeze row 1**
Abhishek's 9 Oct sheet had row 1 frozen on all tabs. Currently `write_tab()` does not call
`setGridProperties`. Fix: after writing each tab, call batchUpdate to freeze row 1
(`frozenRowCount: 1`).

---

## 3. Owner Decisions

| OD | Decision | Status |
|---|---|---|
| OD-420-01 | For `BUG-268` (INVESTIGATION COMPLETE + BACKEND-BLOCKED suffix): PLANNING + Blocked on = BACKEND takes priority | **LOCKED 2026-10-14** |
| OD-420-02 | `MAIN VERIFIED (smoke PASSED)` → **CLOSED** (owner confirmed 2026-10-14). Smoke PASSED = Gate 6 complete = CLOSED. | **LOCKED 2026-10-14** |
| OD-420-03 | `IMPLEMENTATION IN PROGRESS` and `Phase N COMPLETE`: map to IMPLEMENTED (best-effort; ~2 items) | **LOCKED 2026-10-14** |
| OD-420-04 | Blank Type (9 items): derive from ID prefix (BUG-xxx→BUG, CR-xxx→CR) where unambiguous; leave blank otherwise | **LOCKED 2026-10-14** |
| OD-420-05 | CR-417 and CR-418 are **SUPERSEDED** (CLOSED). Added to registry.json as `CLOSED — SUPERSEDED` with a note that exact scope is unknown (were sheet-only items). | **LOCKED 2026-10-14** |
| OD-420-06 | Missing dates out of scope for code recovery (sheet cleared). Registered date: see OD-420-07. Closed date: owner to fill in sheet on next push, Change Log will carry back. | **LOCKED 2026-10-14** |
| OD-420-07 | **Registered date recovery from intake doc.** For items missing `registered` field: (1) read the item's `intake_doc` file, parse the first `**Date:**` line → use as Registered. (2) Covers ~87 additional items. (3) Fallback chain: registered → created → created_at → intake_doc file date → blank. | **LOCKED 2026-10-14** |

**Open:** OD-420-02 (MAIN VERIFIED → QA vs CLOSED). **Awaiting Abhishek.**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (Abhishek reply, 2026-10-14 ~20:10 IST) +
  INVESTIGATION-CONFIRMED (this session, 2026-10-14)
- **Validation:** 8 gaps confirmed via grep, code trace, and live registry scan
- **Confidence:** HIGH — all gaps reproduced from code + data
- **Investigation session:** `memory/handover/BRIEF_CRM_SHEETS_SYNC_PATTERN_2026_10_14.md`
  (cross-ref context); gap analysis run live this session

---

## 5. Code Reality Check

**NONE** — no fix code exists for any of the 8 gaps today.

```bash
grep -c "col.*M\|startswith.*GATE\|QA-VERIFIED\|INVESTIGATION COMPLETE\|REVIEW-AFTER" \
  /app/memory/reports/sheets_sync.py
# Returns: 0 — confirmed 2026-10-14
```

---

## 6. Blast Radius

| File | Change | R5? |
|---|---|---|
| `memory/reports/sheets_sync.py` | 8 targeted edits across `to_contract_status()`, `to_contract_row()`, `update_all_items_inplace()`, `build_summary_rows()`, `write_tab()` | NO |

**Total:** 1 file · MEDIUM scope (targeted edits to existing functions, not full rewrite)
**Hotspot files:** NO · No `frontend/src/` · No `backend/`

---

## 7. Risk Classification

| Field | Value |
|---|---|
| **Risk** | MEDIUM |
| **Reason** | Same file and risk profile as CR-419. G1 (Assignee col M) is the highest-risk edit — splitting the batchUpdate write range must be exact. G2 regex change to DEFERRED check must not break the 14 correctly-classified PARKED items. |
| **Fast Lane** | NO — 8 gaps, multiple functions, one open OD |
| **Compile check** | `python3 -m py_compile` + `--dry-run` + status count verification |

---

## 8. Severity Rubric

**P1 — HIGH.**
- G1 destroys dashboard Assignee data on every push until fixed.
- G2+G3 leave 35 items in wrong status, breaking Intake/QA/Closed tab counts for the dashboard.
- G4 breaks Type filtering for 16 INV items.
All are wrong-data issues affecting the live dashboard. Not financial/order flow. Workaround: don't push until fixed.

---

## 9. Gate Status

| Gate | Status |
|---|---|
| Gate 1 (Intake) | **COMPLETE** (this document) |
| Gate 2 (Impact Analysis) | PENDING |
| Gate 3 (Implementation Plan) | PENDING |
| Gate 4 GO | NOT given |

---

## 10. Pre-condition for Gate 2

OD-420-02 (MAIN VERIFIED → QA or CLOSED) should be resolved by Abhishek before Gate 2,
but is not blocking — Gate 2 can proceed with the default (CLOSED) and amend if needed.
