# CR-406 — Impact Analysis v2 (Gate 2 Redo)
# Google Sheets Two-Way Sync — Revised Tab Structure

**Gate:** 2 — Impact Analysis (REVISION — supersedes v1 dated 2026-10-04)
**Status:** GATE_2_IMPACT_ANALYSIS
**Date:** 2026-10-05
**Risk:** LOW
**Reason for redo:** Tab structure redesigned after owner brainstorm session.

---

## Header Checks

**Code Reality Check:**
```
/app/memory/reports/sheets_sync.py  EXISTS (16 KB, 290 lines)
Implements OLD 8-tab structure → needs full rewrite
```
Result: **PARTIAL** — script exists but implements wrong structure.
Scope: full rewrite of `TABS`, `classify_tab()`, `build_tab_rows()`, `sync_tabs()` + new `build_blockers_tab()`.

**Conflict Pre-Check:**
- No other CR/BUG touches `memory/reports/sheets_sync.py`
- Zero `frontend/src/` changes — no interaction with any active PMS/POS sprint
- Result: **NO CONFLICTS**

---

## 1. Locked Owner Decisions (from brainstorm 2026-10-05)

| Decision | Choice |
|---|---|
| Planning tab | Gate 2 + Gate 3 **combined into one tab** |
| Blockers tab | Show **both sides**: items that are blocked AND items that are blocking |
| Badge/indicator | **Both columns**: `Blocked_By` + `Blocks` visible in Blockers tab |
| Parked / Deferred | **Fold into Closed** tab (no separate tab) |

---

## 2. New 9-Tab Structure

| # | Tab | Filter Logic | ~Rows |
|---|---|---|---|
| 1 | All Items | No filter — all CRs + BUGs | 766 |
| 2 | Intake | GATE_1 / INTAKE / REGISTERED / NOT STARTED | 82 |
| 3 | Planning | GATE_2 / GATE_3 / IMPACT_ANALYSIS / PLAN_COMPLETE | 0* |
| 4 | Implementation | GATE_4 / GATE_5A / IMPLEMENTED | 62 |
| 5 | QA'd | GATE_5B / QA PASS — **no** SMOKE/OWNER mention | 113 |
| 6 | Smoke Test | AWAITING OWNER SMOKE / GATE_6 | 157 |
| 7 | Closed | CLOSED / OWNER VERIFIED / SUBSUMED / RETIRED / **PARKED / DEFERRED** | 297 |
| 8 | **Blockers** | Relationship view — items **repeat** across workflow tabs | ~30 |
| 9 | Summary | Pivot: by type, sprint, status tab | — |

> *Planning currently 0 — will populate as new CRs enter Gate 2/3.
> 55 items remain in All Items only (unusual status strings not matching any pattern).

---

## 3. Classifier Changes (vs v1)

### Old → New

| Old Bucket | New Bucket | Change |
|---|---|---|
| QA / Smoke | QA'd | Narrowed: only Gate 5B / QA PASS with no "smoke/owner" in status |
| QA / Smoke | Smoke Test | New: AWAITING OWNER SMOKE / GATE_6 |
| Blocked / Parked | Closed | Merged: PARKED + DEFERRED now in Closed |
| Blocked / Parked | Blockers | **Replaced**: Blockers is no longer a status-based tab |

### New `classify_tab()` logic

```python
def classify_tab(status):
    s = str(status).upper()
    if any(k in s for k in ['CLOSED','OWNER VERIFIED','SUBSUMED','RETIRED',
                              'RESOLVED','ABSORBED','FOLDED','FROZEN',
                              'PARKED','DEFERRED','BACKEND-BLOCKED','CRM-BLOCKED']):
        return 'Closed'
    if any(k in s for k in ['GATE_1','INTAKE','REGISTERED','NOT STARTED']):
        return 'Intake'
    if any(k in s for k in ['GATE_2','GATE_3','IMPACT_ANALYSIS','PLAN_COMPLETE']):
        return 'Planning'
    if any(k in s for k in ['GATE_4','GATE_5A','IMPLEMENTED']):
        return 'Implementation'
    if any(k in s for k in ['GATE_5B','QA PASS','QA_PASS']) \
            and 'SMOKE' not in s and 'OWNER' not in s:
        return "QA'd"
    if any(k in s for k in ['AWAITING OWNER SMOKE','GATE_6','OWNER SMOKE']):
        return 'Smoke Test'
    return None   # All Items only
```

---

## 4. Blockers Tab — Design

### Nature
This tab is **fundamentally different** from the other 8:
- It is a **relationship view**, not a status filter
- The **same item can appear in multiple tabs** — e.g. CR-380 appears in Closed AND in Blockers (it was blocked by CR-379)
- Rows represent **dependency pairs**, not individual items

### Data Sources in registry.json

| Field | Items with data | Type |
|---|---|---|
| `blocker` | 22 | Free-text description of what's blocking the item |
| `depends_on` | 4 | Structured list of IDs this item depends on |
| `blocks` | 2 | Structured list of IDs this item is blocking |
| `blocked_by` | 1 | Structured ID of blocker |
| `blocked` | 4 | Boolean or text — item is blocked |

### Blockers Tab Columns

| Column | Description |
|---|---|
| ID | The item with a blocking relationship |
| Type | CR / BUG |
| Title | Item title |
| Status | Current gate/status |
| Sprint | Sprint key |
| **Relationship** | `BLOCKED BY` or `BLOCKING` |
| **Related_ID** | The other party's ID (blocker or blockee) |
| **Related_Context** | Free-text: what the blocker is / what is being blocked |

### Row Generation Logic

```
For each item in registry:
    if item.blocker is set and non-empty:
        → emit row: Relationship=BLOCKED BY, Related_ID=parsed from blocker text,
                    Related_Context=item.blocker
    if item.depends_on is list with IDs:
        → emit one row per dependency ID:
           Relationship=DEPENDS ON, Related_ID=dep_id, Related_Context=''
    if item.blocks is list with IDs:
        → emit one row per blockee ID:
           Relationship=BLOCKING, Related_ID=blockee_id, Related_Context=''
    if item.blocked_by is set:
        → emit row: Relationship=BLOCKED BY, Related_ID=item.blocked_by
```

### Example rows

| ID | Type | Title | Status | Relationship | Related_ID | Related_Context |
|---|---|---|---|---|---|---|
| CR-380 | CR | Guest ID Documents | Closed | BLOCKED BY | CR-379 | DEPENDS ON CR-379 — cannot plan until CR-379 Gate 4 GO |
| CR-070 | CR | ... | Closed | BLOCKING | CR-071 | — |
| CR-071 | CR | ... | Closed | DEPENDS ON | CR-069 | — |
| BUG-233 | BUG | Addon Recipe List | Closed | BLOCKED BY | — | Backend must populate ingredients... |

---

## 5. Tab Management Changes

Current sheet tabs: `['All Items', 'Summary', 'Intake', 'Planning', 'Implementation', 'QA / Smoke', 'Closed', 'Blocked / Parked']`

| Action | Tab | Reason |
|---|---|---|
| KEEP | All Items | Unchanged |
| KEEP | Summary | Unchanged |
| KEEP | Intake | Unchanged |
| KEEP | Planning | Unchanged |
| KEEP | Implementation | Unchanged |
| KEEP | Closed | Unchanged (now includes Parked/Deferred rows) |
| DELETE | QA / Smoke | Replaced by QA'd + Smoke Test |
| DELETE | Blocked / Parked | Replaced by Blockers (different concept) |
| CREATE | QA'd | New status tab (113 rows) |
| CREATE | Smoke Test | New status tab (157 rows) |
| CREATE | Blockers | New relationship tab (~30 rows) |

---

## 6. sheets_sync.py — Scope of Changes

Full rewrite of the following sections (no new file — edit existing):

| Section | Change |
|---|---|
| `TABS` list | 8 → 9 tabs, new names |
| `classify_tab()` | Split QA/Smoke, add Parked→Closed, remove Blocked/Parked bucket |
| `build_tab_rows()` | Route 'Blockers' tab to new `build_blockers_tab()` |
| `build_blockers_tab()` | NEW function — relationship view builder |
| `sync_tabs()` | Delete QA/Smoke + Blocked/Parked; create QA'd + Smoke Test + Blockers |
| docstring line 3 | Update tab count: 8 → 9 |

All other functions unchanged: `get_access_token()`, `write_tab()`, `_range_url()`, `cmd_pull()`, `main()`.

---

## 7. Risk Classification

| Field | Value |
|---|---|
| Risk | **LOW** |
| Reason | Standalone Python script. Zero `frontend/src/` impact. No hotspot files. No financial logic. |
| Blast radius | SMALL — 1 existing file, targeted section edits |
| Frontend impact | NONE |

---

## 8. Files

**WILL change:**
- `memory/reports/sheets_sync.py` — REWRITE of TABS, classify_tab, build_tab_rows, sync_tabs + new build_blockers_tab function

**WILL NOT touch:**
- Any `frontend/src/` or `backend/` file
- `memory/control/registry.json` (read at push time, written at pull time by runtime — not planning)
- Any R5 hotspot file

---

## 9. Verification Matrix (v2 — seeds Gate 3 + QA)

| # | Verification | Expected |
|---|---|---|
| V-1 | `--dry-run` | Sheet accessible, 766 items, credentials valid |
| V-2 | `--push` tab management | QA/Smoke + Blocked/Parked deleted; QA'd + Smoke Test + Blockers created |
| V-3 | `--push` QA'd tab | ~113 rows — only Gate 5B / QA PASS without smoke mention |
| V-4 | `--push` Smoke Test tab | ~157 rows — AWAITING OWNER SMOKE / GATE_6 items |
| V-5 | `--push` Closed tab | ~297 rows — includes PARKED and DEFERRED items |
| V-6 | `--push` Blockers tab | ~30 rows — BLOCKED BY / BLOCKING / DEPENDS ON rows |
| V-7 | Blockers tab repeats | Item CR-380 appears in Closed AND Blockers |
| V-8 | Blockers columns | ID, Type, Title, Status, Sprint, Relationship, Related_ID, Related_Context all populated |
| V-9 | `--pull` after push | No changes detected (in-sync) |
| V-10 | py_compile | exit 0 |

---

## 10. Open Decisions (none — all resolved)

All ODs from v1 carry forward unchanged:
- OD-406-01: editable pull fields = status, priority, notes, sprint_key ✅
- OD-406-02: push-first protocol (registry.json source of truth) ✅
- OD-406-03: tab structure = new 9-tab (this doc) ✅
- OD-406-04: registry.json only on pull ✅

No new open decisions.

---

*Impact Analysis v2 — CR-406 / 2026-10-05*
*Supersedes: impact/CR-406_IMPACT_ANALYSIS.md (v1, 2026-10-04)*
