# CR-419 — Intake (Gate 1)
## sheets_sync.py: Contract v1.5 Compliance Rewrite

**ID:** CR-419
**Type:** CR
**Date:** 2026-10-14
**Registered by:** INTAKE agent (owner session 2026-10-14)
**Sprint:** tooling_oct1
**Area:** Control Layer / Tooling
**Priority:** P1
**Risk:** MEDIUM
**Related:** CR-406 (RELATED — wrote the script, GATE_5A), CR-416 (RELATED — SHEET PUSH / SHEET DRIFT roles, GATE_5A)

---

## 1. Duplicate Check

**DISTINCT.**

| ID | Status | Conflict? |
|---|---|---|
| CR-406 | GATE_5A_IMPLEMENTED | NONE — wrote `sheets_sync.py` in pre-contract format. That work is complete. CR-419 brings it up to contract v1.5. |
| CR-416 | GATE_5A_IMPLEMENTED | NONE — added SHEET PUSH + SHEET DRIFT roles to AGENT_PROMPT_ALPHA.md. Those role invocations (`--push`, `--pull --dry-run`) remain unchanged; only the script they call changes. |
| CR-417, CR-418 | NOT IN REGISTRY | Unknown — existed on the sheet before the 2026-10-14 push, destroyed by G-10. Reserved. Do not assign. |

---

## 2. What This CR Does

Full compliance rewrite of `memory/reports/sheets_sync.py` to match contract v1.5
(`registry-sheet-contract-v1.5.md`) and the POS agent brief (`brief-pos-agent_2.md`).

**Root cause of today's data loss:** `sheets_sync.py` was built for a pre-contract internal
format (CR-406, Sep/Oct). It ran correctly against that old format and destroyed the sheet:
wiped 22-column contract headers, raw-wrote 20 registry columns, cleared column W (Release week),
erased owner-added rows CR-417/CR-418, wiped the Change Log, created 3 wrong tab names.
Investigation report: 21 gaps across 6 categories. Full detail in `investigations/` (this session).

**Five implementation phases:**

| Phase | Gaps | Description |
|---|---|---|
| P1 — Column contract | G-01–G-04, G-06 | 22 contract cols A–V; add Project=POS; remove 9 raw registry cols |
| P2 — Status + Priority | G-07, G-08, G-09 | Status → 8 enum values; Priority default P2; Type upper-case |
| P3 — All Items write strategy | G-05, G-10, G-12 | In-place update by ID, A–V only; never clear; protect col W; Assignee placeholder |
| P4 — Tabs + Change Log | G-13–G-18 | Correct tab names; Change Log tab + diff logic; disable pull-back; Blockers as filtered view |
| P5 — Computed fields + Summary | G-19–G-21 | Contract §6 Summary; Artefacts; Code markers; Money path |

---

## 3. Owner Decisions

| OD | Decision | Status |
|---|---|---|
| OD-419-01 | **REGISTRAR role = through existing agent roles only** (SHEET PUSH in AGENT_PROMPT_ALPHA.md). No automatic hook on `registry.json` mutation, no `--registrar` flag. The agent manually triggers a push via the SHEET PUSH role after registry changes. | **LOCKED 2026-10-14** |
| OD-419-02 | **Scope = `sheets_sync.py` only.** Registry schema additions (`registered`, `last_updated`, `closed` timestamp fields on items) are deferred — a separate brief deliverable, not part of this CR. | **LOCKED 2026-10-14** |
| OD-419-03 | **CR-417 / CR-418 recovery** = owner restores sheet from version history in the browser (pre-14:37 today) BEFORE the re-push from this CR. Out of scope for code. | **LOCKED 2026-10-14** |
| OD-419-04 | **`--pull` standalone removed.** Change Log diff+append is folded into `--push` as its final step (contract §5 REGISTRAR). Only two agent-callable paths exist: `--push` = SHEET PUSH (push all tabs + diff + append Change Log); `--pull --dry-run` = SHEET DRIFT (read-only, no writes). `--pull` without `--dry-run` exits with an error message. | **LOCKED 2026-10-14** |

**Zero open owner decisions.**

---

## 4. Evidence

- **Source:** INVESTIGATION-CONFIRMED (session 2026-10-14) + OWNER-REPORTED (Abhishek, 2026-10-14 ~20:10 IST)
- **Confidence:** HIGH — 21 gaps verified live against the sheet API, raw contract text, and script source
- **Contracts read:** `registry-sheet-contract-v1.5.md` + `brief-pos-agent_2.md`
- **Live sheet state confirmed:** 836 rows, 20-col header, 352 blank priorities, col W empty, Change Log header-only, 3 wrong tabs present
- **Investigation session:** 2026-10-14 (this session) — 7/10 steps, all gaps documented

---

## 5. Code Reality Check

**NONE — no contract v1.5 logic exists in the file today.**

```bash
grep -c "Status note\|Owner action\|Registered\|Money path\|Code markers" \
  /app/memory/reports/sheets_sync.py
# Returns: 0 — confirmed 2026-10-14

grep -c "Change Log\|change_log\|in.place\|update.*by.*ID" \
  /app/memory/reports/sheets_sync.py
# Returns: 0 — confirmed 2026-10-14
```

The 5 INTAKE/PLANNING/IMPLEMENTED keyword hits in the file are from the old
`classify_tab()` routing function — pre-contract internal logic, not enum values.

---

## 6. Blast Radius

| File | Change | R5 hotspot? |
|---|---|---|
| `memory/reports/sheets_sync.py` | Complete rewrite — all push/tab/summary/pull logic | NO |

**Total:** 1 file · LARGE scope within that file · No `frontend/src/` · No `backend/` · No `registry.json` schema change (OD-419-02)

- **Hotspot files:** NO
- **Estimated scope:** SMALL file count, LARGE internal complexity

---

## 7. Risk Classification

| Field | Value |
|---|---|
| **Risk** | MEDIUM |
| **Reason** | Script-only, no app code. But `sheets_sync.py` feeds the Tech Dashboard for all 5 projects. A bug in the push corrupts the shared sheet. In-place update strategy (P3) is the highest-risk change — a logic error could orphan rows or leave stale data. |
| **Fast Lane** | NO — LARGE scope, 21 gaps, 5 phases, critical shared infrastructure |
| **Compile check** | `python3 -m py_compile memory/reports/sheets_sync.py` + `--dry-run` against live sheet |

---

## 8. Severity Rubric

**P1 — HIGH.** The Tech Dashboard cannot read POS today (wrong column structure, raw status values). POS editing is switched off. A workaround exists (version history restore + manual push of old script) but the root cause recurs on every future push until this CR is implemented.

---

## 9. Gate Status

| Gate | Status |
|---|---|
| Gate 1 (Intake) | **COMPLETE** (this document) |
| Gate 2 (Impact Analysis) | **COMPLETE** — `impact/CR-419_IMPACT_ANALYSIS_2026_10_14.md` |
| Gate 3 (Implementation Plan) | **COMPLETE** — `plans/CR-419_IMPLEMENTATION_PLAN_2026_10_14.md` (incl. Amendment A1 / OD-419-04) |
| Gate 4 GO | NOT given |

---

## 10. Pre-condition for Gate 2

Owner restores the sheet from version history (pre-14:37 2026-10-14) **before** Gate 2 planning begins. This recovers CR-417, CR-418, Change Log rows, and column W data. Gate 2 planning must read the restored sheet as the baseline anchor.

---

## 11. Next

Awaiting owner: **"Gate 2 GO CR-419"**
→ PLANNING agent writes Impact Analysis
→ Verifies all 21 anchor lines in `sheets_sync.py` at HEAD
→ Documents exact old→new for each of the 5 phases
