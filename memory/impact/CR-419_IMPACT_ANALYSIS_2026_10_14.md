# CR-419 — Impact Analysis (Gate 2)

**Item:** CR-419 — sheets_sync.py: Contract v1.5 Compliance Rewrite
**Date:** 2026-10-14
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent

---

## Code Reality

**NONE** — no contract v1.5 logic exists in the file today.

```bash
grep -c "Status note\|Owner action\|Registered\|Money path\|Code markers" \
  /app/memory/reports/sheets_sync.py   # 0
grep -c "Change Log\|in.place\|update.*by.*ID" \
  /app/memory/reports/sheets_sync.py   # 0
```

The file is 465 lines, 15 functions. Every function is replaced or updated.

---

## Conflict Pre-Check

| Item | File | Status | Conflict? |
|---|---|---|---|
| CR-406 | `sheets_sync.py` | GATE_5A_IMPLEMENTED | NONE — wrote the file. This CR rewrites it. |
| CR-416 | `AGENT_PROMPT_ALPHA.md` | GATE_5A_IMPLEMENTED | NONE — agent roles call `--push` and `--pull --dry-run`. CLI flags stay identical; only the logic behind them changes. |

**No blocking conflicts.**

---

## 1. Registry field survey — data quality inputs

From live `registry.json` (836 items):

| Field | Coverage | IA note |
|---|---|---|
| `id`, `title`, `status` | 100% | always present |
| `type` | 98% (827) | 9 items blank → blank Type in sheet |
| `priority` | 57% (483) | direct copy |
| `severity` | 25% (214) | fallback when `priority` absent |
| neither priority nor severity | **18% (150)** | → default P2 + `PRIORITY DEFAULTED` in Notes |
| `risk` | 69% (582) | direct copy |
| `area` | 33% (281) | normalise to POS area list |
| `sprint_key` | 83% (701) | → Sprint |
| `registered` | 19% (163) | primary source for Registered date |
| `created` | 22% (190) | fallback for Registered |
| `last_updated` | 4% (31) | field exists but agent-computed anyway |
| `intake_doc` | 27% (227) | → Artefacts: INTAKE |
| `impact_doc` / `impact_analysis` | 6–5% | → Artefacts: IMPACT_ANALYSIS |
| `plan_doc` / `implementation_plan` | 7–3% | → Artefacts: IMPLEMENTATION_PLAN |
| `qa_report` | 8% (70) | → Artefacts: QA_REPORT |
| `files` | 39% (332) | → Files |
| `related` | 29% (247) | → Related |
| `depends_on` | <1% (5) | → Related (append) |
| `blocked_by` | <1% (1) | → Blocked on (deprecated field) |
| `notes` | 44% (376) | → Notes |

**Priority arithmetic (836 items):**
- 483 have `priority` → use directly
- 203 have `severity` only → map to Priority
- 11 have both → higher urgency wins
- 150 have neither → default P2 + PRIORITY DEFAULTED

---

## 2. Status normalisation map

Contract requires exactly one of 8 values. Full prose → Status note.

| Contract Status | Matches in raw registry `status` field |
|---|---|
| `INTAKE` | `GATE_1`, `GATE_1_INTAKE`, `INTAKE`, `NOT STARTED`, `REGISTERED`, `GATE_1_INTAKE_REVISED`, blank |
| `PLANNING` | `GATE_2`, `GATE_2_IMPACT_ANALYSIS`, `GATE_2_CLOSED`, `GATE_3`, `GATE_3_PLAN_COMPLETE`, `IMPACT_ANALYSIS`, `PLAN_COMPLETE` |
| `IMPLEMENTED` | `GATE_4_GO`, `GATE_5A`, `GATE_5A_IMPLEMENTED`, `IMPLEMENTED` |
| `QA` | `GATE_5B`, `GATE_5B_QA_PASS`, `QA PASS` (when NOT followed by `AWAITING OWNER SMOKE`), `QA_PASS`, `GATE_5B_QA_CONDITIONAL_PASS` |
| `SMOKE` | `AWAITING OWNER SMOKE`, `GATE_6`, `OWNER SMOKE`, `QA PASS — AWAITING OWNER SMOKE`, `OWNER_VERIFIED_PENDING_CLOSURE` |
| `CLOSED` | contains `CLOSED`, `OWNER VERIFIED`, `SUBSUMED`, `RETIRED`, `RESOLVED`, `ABSORBED`, `FOLDED`, `FROZEN` |
| `PARKED` | contains `PARKED`, `DEFERRED` — only when it is a deliberate stop with a re-open condition |
| `DUPLICATE` | contains `DUPLICATE`, `CLOSED_DUPLICATE` |
| **UNCLASSIFIED** | anything else → Status = `INTAKE`, Status note = `UNCLASSIFIED: <original string>` |

**BLOCKED items:** `BACKEND-BLOCKED`, `CRM-BLOCKED`, `BACKEND_BLOCKED` are NOT a status.
Determine real stage from surrounding context (usually PLANNING or INTAKE), set Status to real stage,
set `Blocked on` = `BACKEND` or `CRM`. Use `GATE_3_PLAN_COMPLETE` context → PLANNING + Blocked on = BACKEND.

---

## 3. Per-column derivation for `to_contract_row(item)`

| # | Column | Source logic |
|---|---|---|
| 1 | Project | Always `"POS"` |
| 2 | ID | `item['id']` |
| 3 | Type | `item.get('type','').upper()`. If title starts with "BUG" → `BUG` |
| 4 | Title | `item['title']` (truncated to 500 chars) |
| 5 | Status | `to_contract_status(item['status'])` (§2 map) |
| 6 | Status note | Full raw `item['status']` + `current_gate`/`phase`/`qa_result` if present |
| 7 | Priority | `item.get('priority')` → if valid P0–P3 use; else `item.get('severity')` → map; else `P2` + PRIORITY DEFAULTED in Notes |
| 8 | Risk | `item.get('risk','')` upper-cased; only LOW/MEDIUM/HIGH/CRITICAL kept |
| 9 | Area | `item.get('area','')` normalised to POS area list (unrecognised → blank) |
| 10 | Sprint | `item.get('sprint_key','')` |
| 11 | Blocked on | `item.get('blocked_by','')` for registry field; also detect from status string. Only for non-CLOSED items. |
| 12 | Owner action | For `SMOKE` items: `"Smoke test: " + title`. For `Blocked on = OWNER`: `"Decision needed"`. Else blank. |
| 13 | Assignee | **Always blank** — never written by agent |
| 14 | Registered | `item.get('registered') or item.get('created') or item.get('created_at','')` → YYYY-MM-DD format |
| 15 | Last updated | `datetime.now(timezone.utc).strftime('%Y-%m-%d')` — agent-computed only, today's date on each push |
| 16 | Closed | `item.get('closed_at') or item.get('implemented_date','')` if Status is CLOSED/PARKED/DUPLICATE, else blank |
| 17 | Related | comma-join of `item.get('related',[])` + `item.get('depends_on',[])` |
| 18 | Artefacts | Scan keys: `intake_doc`→INTAKE, `impact_doc`/`impact_analysis`→IMPACT_ANALYSIS, `plan_doc`/`implementation_plan`→IMPLEMENTATION_PLAN, `qa_report`→QA_REPORT. List only those present. |
| 19 | Code markers | `YES` if `grep -r "# <ID>\|// <ID>"` finds the item ID in `frontend/src/` or `backend/`; else `no` |
| 20 | Files | comma-join of `item.get('files',[])` |
| 21 | Notes | `item.get('notes','')`. Append `PRIORITY DEFAULTED` if triggered. |
| 22 | Money path | `YES` if `item.get('area','')` matches Payments/PMS Folio/Smart Purchase/Billing or if title contains "payment"/"billing"/"folio"/"settlement"/"tax"/"GST"/"VAT"/"discount"/"coupon"/"wallet". Else `no`. |

**Contract header (row 1, 22 values):**
```python
CONTRACT_COLS = [
    'Project','ID','Type','Title','Status','Status note','Priority','Risk',
    'Area','Sprint','Blocked on','Owner action','Assignee',
    'Registered','Last updated','Closed',
    'Related','Artefacts','Code markers','Files','Notes','Money path',
]
```

---

## 4. Function-by-function change map

`sheets_sync.py` is 465 lines. The table below maps every block to its disposition.

| Lines | Function / block | Current | Change |
|---|---|---|---|
| L1–24 | Header + imports | OK | Add `os.path`, `re`, `timezone` from datetime |
| L25–37 | Path + credentials loading | OK | Keep |
| **L38–44** | `COLS` (20 raw cols) | Wrong — raw registry columns | **REPLACE** with `CONTRACT_COLS` (22 values above) |
| **L47** | `PULL_EDITABLE` | Active pull-back list | **DELETE** — pull-back disabled (OD-419-01) |
| **L50–60** | `TABS` (9 tabs, wrong names) | Implementation/QA'd/Smoke Test | **REPLACE** — 10 tabs in contract order: All Items, Intake, Planning, Implemented, QA, Smoke, Closed, Blockers, Change Log, Summary |
| **L63–84** | `classify_tab()` | Maps raw status → old tab names | **REPLACE** with two functions: `to_contract_status(raw)` (§2 map) + `stage_tab(contract_status)` (contract status → tab name) |
| L87–101 | `get_access_token()` | OK | Keep unchanged |
| L104–132 | API helpers (`_headers`, `sheets_get`, `sheets_post`, `sheets_put`, `get_sheet_meta`) | OK | Keep unchanged |
| **L136** | `_OBSOLETE_TABS` | Wrong list | **REPLACE** — delete `Implementation`, `QA'd`, `Smoke Test` (today's mistakes) |
| **L138–167** | `sync_tabs()` | Creates/deletes tabs | **UPDATE** — add `Change Log` to required tabs; ensure correct names; delete the 3 wrong tabs our push created |
| L170–175 | `_flatten()` | Utility | Keep unchanged |
| **L177–188** | `build_tab_rows()` | Uses old COLS + classify_tab | **REPLACE** — dispatch: All Items → `build_all_items_rows(items)`, stage tabs → filter by `stage_tab(s)==tab_name`, Blockers → filtered view, Change Log → read-only pass-through, Summary → `build_summary()` |
| **L190–210** | `_build_summary()` | BY TYPE/BY STATUS TAB/BY SPRINT | **REPLACE** — contract §6: Status×count (8+Unrouted) + Priority×count (open only) + Blocked on×count + Generated + Pending change-log rows |
| L212–215 | `_range_url()` | OK | Keep unchanged |
| **L218–273** | `build_blockers_tab()` | Relationship rows (BLOCKED BY/DEPENDS ON/BLOCKING) | **REPLACE** — filtered view: items where Blocked on is non-blank (same 22 columns as All Items, one row per item, Assignee blank) |
| **L276–307** | `write_tab()` | Clear A1:Z10000 then write | **KEEP for stage/summary tabs** (clear+write is OK for derived tabs). **NEW** `update_all_items_inplace()` for All Items only |
| **L310–337** | `cmd_push()` | Loops TABS, calls write_tab for all | **UPDATE** — call `update_all_items_inplace()` for All Items; call `write_tab()` for stage tabs/Summary; skip Change Log (never overwrite); report run summary |
| **L340–404** | `cmd_pull()` | Writes registry.json directly | **REPLACE** with `cmd_diff_log()` — reads sheet, diffs against registry, appends to Change Log tab only (no registry write). `--pull --dry-run` shows diff without appending. |
| **L407–466** | `main()` | `--push`, `--pull`, `--dry-run` | **UPDATE** — `--pull` now calls `cmd_diff_log()`; update help text; keep `--push` and `--dry-run` |

---

## 5. New functions needed

| Function | Purpose |
|---|---|
| `to_contract_status(raw)` | Maps raw registry status string → one of 8 enum values. Handles BLOCKED detection. Returns `(contract_status, is_blocked, blocked_party)` |
| `stage_tab(contract_status)` | Maps contract Status → tab name (`INTAKE`→`Intake`, `PLANNING`→`Planning`, `IMPLEMENTED`→`Implemented`, `QA`→`QA`, `SMOKE`→`Smoke`, `CLOSED/PARKED/DUPLICATE`→`Closed`). Returns `None` for `None`/unrouted. |
| `to_contract_row(item)` | Builds a 22-element list for one registry item per §3 column derivation table. Applies status normalisation, priority defaulting, area normalisation, all computed fields. |
| `normalise_area(raw_area)` | Maps free-text area to POS area list. Returns blank if unrecognised. |
| `compute_artefacts(item)` | Returns comma-joined artefact names for present keys. |
| `compute_money_path(item)` | Returns `YES` or `no` based on area + title heuristic. |
| `compute_code_markers(item_id)` | Greps `frontend/src/` and `backend/` for the item ID. Returns `YES` or `no`. |
| `compute_registered(item)` | Returns first non-blank date from `registered`, `created`, `created_at`, `intake_date`, `date` fields. |
| `build_all_items_rows(items)` | Builds list-of-lists for All Items tab: header row (22 cols) + one row per item. |
| `update_all_items_inplace(token, items, dry_run)` | Reads current All Items A1:V (skips W). Matches rows by ID. Updates cols A–V in-place. Appends new items. **Never clears. Never writes past col V.** |
| `get_change_log_rows(token)` | Reads Change Log tab, returns existing rows. Used to count PENDING rows for Summary. |
| `append_to_change_log(token, rows, dry_run)` | Appends diff rows to Change Log tab. |
| `cmd_diff_log(dry_run)` | Reads All Items, diffs against registry, appends human edits to Change Log. No registry writes. |

---

## 6. `update_all_items_inplace()` — critical function design

This is the highest-risk new function (G-10, G-05, G-12). Design locked here:

```
1. Read current All Items A1:V{N} (columns A–V only, skip W)
2. Build id→row_number map from col B (ID column)
3. For each registry item:
   a. Build contract_row (22 values)
   b. If item ID found in sheet: update that row (batchUpdate valueRange A{n}:V{n})
   c. If item ID NOT found: queue as append
4. Append new items after last row (single batchUpdate)
5. Never clear any range. Never write col W or beyond.
6. Rate-limit: 0.3s between API calls
```

**Rows on sheet but NOT in registry** (e.g. CR-417, CR-418): left untouched — not in registry items loop, never deleted.

---

## 7. `cmd_diff_log()` — replaces `cmd_pull()` design

```
1. Read All Items A1:V{N} (skip col W — excluded from diff per §5.6)
2. Build sheet_data: {id: {col: value}} for contract columns only
3. Load registry.json → items_by_id
4. Phase 1 accepted columns (§5): Status, Registered, Closed. Blocked on if SOURCE=DASHBOARD.
5. Skip Assignee and Release week entirely (§5.6)
6. For each sheet row:
   - Skip if ID not in registry (owner-added rows — don't log as drift)
   - For each Phase 1 column: if sheet_val ≠ registry_val → queue change log row
   - For non-Phase-1 columns: if sheet_val ≠ registry_val → queue as REJECTED
7. Append to Change Log tab (never clear it)
8. Print summary: N changes detected, N appended
```

---

## 8. Change Log tab — append-only protection

**Never cleared.** `write_tab()` must NOT be called for Change Log.
`sync_tabs()` creates it if absent. `cmd_push()` skips it.
`append_to_change_log()` uses `sheets_post('values/append')` with `insertDataOption=INSERT_ROWS` (not overwrite).

Change Log 8 columns (from contract §5):
```python
CL_COLS = ['Logged at','ID','Column','Old value (registry)',
           'New value (sheet)','Decision','Decided at','Note']
```

---

## 9. Tab write strategy per tab

| Tab | Write strategy | Function |
|---|---|---|
| All Items | **In-place by ID (A–V only). Never clear.** | `update_all_items_inplace()` |
| Intake, Planning, Implemented, QA, Smoke, Closed | Clear A1:V{N} then write (derived/filtered — no owner data) | `write_tab()` (existing, safe) |
| Blockers | Clear A1:V{N} then write (filtered view) | `write_tab()` |
| Change Log | **Never clear. Append-only.** | `append_to_change_log()` (cmd_diff_log only) |
| Summary | Clear then write | `write_tab()` |

---

## 10. POS Area list (from brief)

```python
POS_AREAS = {
    'Printing', 'Reports', 'Inventory', 'Menu Management', 'Payments',
    'PMS Check-In', 'PMS Bookings', 'PMS Folio', 'CRM', 'Settings',
    'Auth / Permissions', 'Smart Purchase', 'Sidebar / Nav', 'Sockets',
    'Order Entry', 'Dashboard', 'Expense', 'Tooling',
}
```

Normalisation: case-insensitive match + common aliases (e.g. `order-entry`→`Order Entry`, `dashboard`→`Dashboard`). Unrecognised → blank.

---

## 11. Risk Classification

| Field | Value |
|---|---|
| **Risk** | MEDIUM |
| **Why not HIGH** | Script-only, no `frontend/src/`, no `backend/` app code. |
| **Why not LOW** | Feeds Tech Dashboard for 5 projects. `update_all_items_inplace()` is a complex in-place mutation — a row-numbering bug silently corrupts data. `to_contract_status()` mapping must be exhaustive; gaps create UNCLASSIFIED rows. |
| **Highest-risk function** | `update_all_items_inplace()` — must never corrupt col W, must not delete rows, must handle 836+ rows without partial writes |
| **Compile check** | `python3 -m py_compile sheets_sync.py` + `--dry-run` against live sheet |
| **Fast Lane** | NO — LARGE scope, new functions, critical infra |

---

## 12. Non-regression analysis

| Item | Impact |
|---|---|
| `--push` CLI flag | Kept — calls updated `cmd_push()`. SHEET PUSH agent role unchanged. |
| `--pull --dry-run` CLI flag | Kept — now calls `cmd_diff_log(dry_run=True)`. SHEET DRIFT agent role unchanged. |
| `--dry-run` alone | Kept — credential + sheet validation only |
| OAuth2 / token refresh | Unchanged |
| Sheets API helpers | Unchanged |
| `_range_url()` | Unchanged |
| `_flatten()` | Kept (still useful for flat-joining list fields) |
| `.env` credentials file | Unchanged |
| CR-406 ownership | Preserved — this is an in-place rewrite of the file it created |
| CR-416 agent roles | Unaffected — roles call `--push` and `--pull --dry-run`; CLI contract unchanged |

---

## 13. Files WILL change

```
memory/reports/sheets_sync.py   (complete rewrite in-place)
```

## Files WILL NOT touch

```
memory/control/registry.json          (read-only by script during push)
memory/reports/.env                   (credentials unchanged)
memory/control/AGENT_PROMPT_ALPHA.md  (CR-416 roles unchanged)
frontend/src/                         (not touched)
backend/                              (not touched)
```

---

## 14. Owner decisions — all locked

| OD | Decision | Status |
|---|---|---|
| OD-419-01 | REGISTRAR = existing agent roles only, no auto-hook | LOCKED |
| OD-419-02 | Registry schema timestamps deferred | LOCKED |
| OD-419-03 | CR-417/CR-418 recovery = browser version history, out of scope | LOCKED |

**Zero open decisions. Gate 3 may proceed.**

---

## 15. Gate Status

| Gate | Status |
|---|---|
| Gate 1 (Intake) | COMPLETE — `change_requests/CR-419_SHEETS_SYNC_CONTRACT_V1_5_COMPLIANCE_INTAKE.md` |
| Gate 2 (Impact Analysis) | **COMPLETE** (this document) |
| Gate 3 (Implementation Plan) | PENDING — awaiting owner "Gate 3 GO CR-419" |
| Gate 4 GO | NOT given |
