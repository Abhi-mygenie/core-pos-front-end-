# CR-417 — Session Activity Log: Google Sheets "Session Log" Tab

**Type:** CR (Change Request)
**ID:** CR-417
**Date:** 2026-10-09
**Sprint:** oct_release
**Gate:** 1 — INTAKE
**Status:** GATE_1_INTAKE
**Registered by:** E1 (Emergent Agent) — owner-directed

---

## 1. Summary

Add a **"Session Log" tab** to the existing Google Sheet (`REGISTRY_EXPORT_2026_09_27`,
ID `18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY`) that mirrors the format the Emergent
dashboard agent generates after every session — the "Created (X) / Updated (Y)" commit
summary showing what was added and modified in `/app/memory/`.

Each row = one agent session. Columns: Date · Session ID/Commit · Created Count · Updated
Count · Created Files · Updated Files · Summary.

Data source (priority order):
1. **Primary** — `/app/memory/session_log.json` written by the agent at end of session
2. **Fallback** — `git diff HEAD~1 HEAD --name-status -- memory/` when JSON is absent

Triggered by: `python3 sheets_sync.py --push` (writes Session Log tab alongside the 9
existing registry tabs — no new flag needed).

Scope: extend existing `memory/reports/sheets_sync.py` only. Zero frontend/backend/src.

---

## 2. Owner Request (verbatim context)

> "This is requirement for new CR which we take from branch 09_oct — attached is brief
> from dashboard agent — google sheet need to be generated in this format — validate and
> ask if any questions or clarity needed."

Clarification session confirmed:
- Data source: session_log.json (primary) + git diff fallback
- Location: Session Log tab in existing REGISTRY_EXPORT_2026_09_27 sheet
- Structure: one row per session
- Trigger: `--push` (same as CR-406)
- Scope: extend sheets_sync.py

---

## 3. session_log.json Schema (agent contract)

Every agent that modifies `/app/memory/` MUST write or append to
`/app/memory/session_log.json` before committing. Format:

```json
{
  "sessions": [
    {
      "date": "2026-10-09",
      "session_id": "abc1234",
      "commit_hash": "22e02bdc",
      "summary": "BUG-466 investigation + 30-item batch intake registered",
      "created": [
        {
          "path": "memory/INV-TABLE-EXPORT-2026-06_INVESTIGATION_REPORT.md",
          "description": "investigation report (BUG-466)"
        },
        {
          "path": "memory/evidence/INV-TABLE-EXPORT-2026-06/export_list_resp.txt",
          "description": "live curl evidence"
        }
      ],
      "updated": [
        {
          "path": "memory/control/registry.json",
          "description": "added BUG-466, 30 batch items, 7 integration/voice CRs"
        }
      ]
    }
  ]
}
```

### Schema rules
| Field | Type | Required | Notes |
|---|---|---|---|
| `date` | string | YES | ISO date YYYY-MM-DD |
| `session_id` | string | YES | Short slug or Emergent job ID |
| `commit_hash` | string | NO | Short 8-char git hash; "" if not committed yet |
| `summary` | string | YES | One line — what the session accomplished |
| `created` | array | YES | Files newly added this session (can be empty `[]`) |
| `created[].path` | string | YES | Relative path from repo root |
| `created[].description` | string | YES | One-line human description |
| `updated` | array | YES | Files modified this session (can be empty `[]`) |
| `updated[].path` | string | YES | Relative path from repo root |
| `updated[].description` | string | YES | One-line human description |

**Append rule:** If `session_log.json` already exists, append to the `sessions` array.
Never overwrite the full file — preserve prior sessions.

---

## 4. Git Diff Fallback

When `session_log.json` is absent or the latest entry's `commit_hash` does not match
`HEAD`, the script falls back to:

```bash
git -C /app diff HEAD~1 HEAD --name-status -- memory/
```

Output parsing:
- Lines starting with `A\t` → Created files
- Lines starting with `M\t` → Updated files
- Lines starting with `D\t` → Deleted files (logged but not shown as Created/Updated)
- `commit_hash` = `git rev-parse --short HEAD`
- `summary` = first line of `git log -1 --format=%s`
- `date` = `git log -1 --format=%ci` (date part only)
- `description` = empty string `""` (not available from git diff alone)

Fallback row is clearly labelled in the sheet with `[git-diff]` prefix in Session ID cell.

---

## 5. Session Log Tab — Column Specification

| # | Column | Source (JSON) | Source (git fallback) | Notes |
|---|--------|---------------|----------------------|-------|
| A | **Date** | `session.date` | `git log -1 --format=%ci` (date) | YYYY-MM-DD |
| B | **Session ID** | `session.session_id` | `[git-diff] <commit_hash>` | Short slug or job ID |
| C | **Commit** | `session.commit_hash` | `git rev-parse --short HEAD` | 8-char hash; "" if absent |
| D | **Created Count** | `len(session.created)` | Count of `A\t` lines in diff | Integer |
| E | **Updated Count** | `len(session.updated)` | Count of `M\t` lines in diff | Integer |
| F | **Created Files** | `path — description` per entry, newline-joined | File paths newline-joined | Multi-line cell |
| G | **Updated Files** | `path — description` per entry, newline-joined | File paths newline-joined | Multi-line cell |
| H | **Summary** | `session.summary` | First line of `git log -1 --format=%s` | One-line summary |

**Row ordering:** Newest session at the top (reverse chronological). Row 1 = header,
Row 2 = most recent session, Row 3 = previous session, etc.

On every `--push`, the full Session Log tab is rebuilt from the complete
`session_log.json` history (all sessions array entries) + any git diff fallback for the
current HEAD if it is not already in the JSON.

---

## 6. Expected Behaviour (Push)

```
sheets_sync.py --push
  ↓
Existing behaviour: write All Items, Intake, Planning, Implementation, QA'd,
                    Smoke Test, Closed, Blockers, Summary  (9 tabs — CR-406)
  ↓
NEW (CR-417): also write Session Log tab (10th tab)
  Step 1: Load /app/memory/session_log.json  (if exists)
  Step 2: Check HEAD commit hash vs last session entry
          → if mismatch or JSON absent: run git diff fallback, prepend row
  Step 3: Build Session Log rows (header + one row per session, newest first)
  Step 4: Clear + write "Session Log" tab
  ↓
--push COMPLETE. <N> items → 9 registry tabs + 1 session log tab.
```

---

## 7. Code Reality Check

```
grep -rn "Session Log\|session_log\|build_session" /app/memory/reports/sheets_sync.py → 0 hits
/app/memory/session_log.json → does not exist yet
```

**Result: NONE** — neither the tab function nor the JSON schema file exist.
Scope: add ~80 lines to `sheets_sync.py` + define schema (this doc).

---

## 8. Duplicate Check

| CR | Title | Verdict |
|---|---|---|
| CR-406 | Google Sheets Two-Way Sync (9 registry tabs) | RELATED — extends this script; Session Log is a 10th tab |
| CR-389 | Registry Excel Export | RELATED — same data, different format; no overlap |
| CR-046 | Dev Control Dashboard | NOT RELATED — in-browser HTML dashboard, not Google Sheets |
| DEV-DASHBOARD-001 | Dev Dashboard | NOT RELATED — different tool |

**Verdict: DISTINCT** — no existing CR adds a session-activity log to Google Sheets.

---

## 9. Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Control Layer / Tooling |
| Priority | P2 / MEDIUM |
| Severity | P2 |
| Risk | LOW |
| Risk Reason | Standalone addition to Python script. Zero frontend/src impact. No financial logic. No hotspot files. |
| Fast Lane Eligible | YES — extends 1 existing file + 0 hotspot files, LOW risk. Owner approval required. |
| Sprint | oct_release |
| Depends On | CR-406 (GATE_5A_IMPLEMENTED — script exists and works) |

---

## 10. Blast Radius

| Metric | Value |
|---|---|
| Files to change (app src) | **0** |
| Files to change (scripts) | `memory/reports/sheets_sync.py` — add `build_session_log_tab()`, `_load_session_log()`, `_git_diff_fallback()` functions (~80 lines); update `TABS` list + `sync_tabs()` + `cmd_push()` |
| New files | `memory/session_log.json` — created by agents per schema; script reads it |
| Hotspot files (R5) | NONE |
| Google Sheet mutations | Add "Session Log" tab (10th tab); cleared + rewritten on every `--push` |

---

## 11. Open Decisions

| # | Question | Recommended Default | Status |
|---|---|---|---|
| OD-417-01 | Row ordering in Session Log tab? | Newest session first (row 2 = latest) | **PROPOSED — owner confirm** |
| OD-417-02 | Cap on rows? (max N sessions shown) | No cap — accumulate all sessions indefinitely | **PROPOSED — owner confirm** |
| OD-417-03 | Files cell format in col F/G? | `path — description` newline-joined; wrap text on in sheet | **PROPOSED — owner confirm** |
| OD-417-04 | Should deleted files (git `D\t` lines) appear? | Log in Summary only, not in Created/Updated columns | **PROPOSED — owner confirm** |
| OD-417-05 | session_log.json location — `/app/memory/` root or `memory/reports/`? | `/app/memory/session_log.json` (visible in repo memory dir) | **PROPOSED — owner confirm** |

> All 5 ODs have recommended defaults. If owner says "GO" without answering, defaults apply.

---

## 12. Related Items

- **CR-406** (GATE_5A_IMPLEMENTED) — Google Sheets Two-Way Sync; this CR extends it
- **CR-389** (IMPLEMENTED) — Registry Excel Export; different format, no conflict

---

## 13. Scope Lock

**WILL touch:**
- `memory/reports/sheets_sync.py` — add 3 new functions + update TABS, sync_tabs, cmd_push

**WILL NOT touch:**
- Any file under `frontend/src/`
- `backend/`
- `memory/control/registry.json` (only written at runtime by --pull, unchanged)
- Any R5 hotspot file
- `memory/reports/.env` (credentials already present, no new keys needed)

---

*Intake agent: E1 — 2026-10-09*
