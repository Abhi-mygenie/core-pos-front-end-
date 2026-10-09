# CR-418 — Registry Sheet: Contract v1.4 Compliance + REGISTRAR Role

**Type:** CR (Change Request)
**ID:** CR-418
**Date:** 2026-10-09
**Sprint:** oct_release
**Gate:** 1 — INTAKE
**Status:** GATE_1_INTAKE
**Registered by:** E1 (Emergent Agent) — owner-directed
**Source documents:**
- Brief: `memory/design_briefs/brief-pos-agent.md` (FROZEN 2026-10-09)
- Contract: `memory/reports/registry-sheet-contract-v1.4.md` (FROZEN 2026-10-07)

---

## 1. Summary

Bring `sheets_sync.py` and the POS Google Sheet fully into compliance with the shared
**Registry → Google Sheet Contract v1.4** so the Tech Dashboard can read all five project
sheets the same way.

Three parallel tracks:

| Track | What | Files |
|---|---|---|
| A | Rewrite `sheets_sync.py` push to 22-column / 10-tab contract format | `memory/reports/sheets_sync.py` |
| B | Add REGISTRAR role + Change Log diff (disable direct pull-back) | `memory/reports/sheets_sync.py` |
| C | One-off registry cleanup (type casing, timestamps, category, blockers) | `memory/control/registry.json` |

Zero frontend/src changes. Zero hotspot files.

**Supersedes:** CR-406 push behavior (GATE_5A_IMPLEMENTED). The CR-406 script becomes the
baseline to rewrite. CR-406 is not closed — its Change Log / pull infrastructure becomes
the foundation for Track B.

---

## 2. Why (from brief)

Five project sheets feed one Tech Dashboard. POS sheet today (~770 rows) has shape the
dashboard cannot read:
- `status` is free-text (needs 8-value enum)
- `priority` blank on ~150 rows
- No date columns (`registered`, `last_updated`, `closed`)
- `area` is 65%+ blank and free-form (535/770 rows)
- Blockers tab lists already-closed items
- Direct pull-back overwrites registry without owner approval

Fix at source (`sheets_sync.py` + registry fields) — not in the dashboard.

---

## 3. Track A — Push rewrite: 22 columns, 10 tabs

### 3.1 Tab structure (contract §2, exact order)

| # | Tab | Filter |
|---|---|---|
| 1 | All Items | every item |
| 2 | Intake | Status = INTAKE |
| 3 | Planning | Status = PLANNING |
| 4 | Implemented | Status = IMPLEMENTED |
| 5 | QA | Status = QA |
| 6 | Smoke | Status = SMOKE |
| 7 | Closed | Status = CLOSED / PARKED / DUPLICATE |
| 8 | Blockers | non-blank `Blocked on`, regardless of Status |
| 9 | Change Log | append-only (Track B) |
| 10 | Summary | counts (contract §6) |

Old tabs deleted on push: "Open Only", "QA / Smoke", "Blocked / Parked", "QA'd", "Smoke Test", "Implementation"

### 3.2 Columns (contract §3, fixed at 22, in this exact order)

| # | Column | Source in registry.json | Rule |
|---|---|---|---|
| 1 | Project | hardcoded | Always `POS` |
| 2 | ID | `id` | Direct |
| 3 | Type | `type` | Uppercase; CR with title starting "BUG" → BUG |
| 4 | Title | `title` | Direct |
| 5 | Status | `status` (parsed) | Map to 8-value enum (see §3.3). Unrouted → blank |
| 6 | Status note | `status`, `current_gate`, `phase`, `qa_result` | Original full prose detail |
| 7 | Priority | `priority` else `severity` | P0–P3. Missing → default P2 + "PRIORITY DEFAULTED" in Notes |
| 8 | Risk | `risk` | LOW/MEDIUM/HIGH/CRITICAL. Direct if present |
| 9 | Area | `area` (normalised) | Map to POS area list (see §3.4). Unrecognised → blank |
| 10 | Sprint | `sprint_key` | Direct |
| 11 | Blocked on | `blocked_by`, `blocker`, `notes` | Contract party enum (see §3.5). Closed items: blank |
| 12 | Owner action | `status`, `notes` | SMOKE items: `"Smoke test <title>"`. OWNER-blocked: decision text |
| 13 | Assignee | — | **NEVER written by agent on All Items. Always blank on stage tabs.** |
| 14 | Registered | `registered` else `created` | YYYY-MM-DD. Missing → blank (owner fills via sheet → Change Log) |
| 15 | Last updated | computed | Today's date on every push (agent-only, never accepted from sheet) |
| 16 | Closed | `closed` | YYYY-MM-DD. Missing → blank for CLOSED/PARKED/DUPLICATE items |
| 17 | Related | `depends_on`, `related` | Comma-separated IDs |
| 18 | Artefacts | `intake_doc`, `qa_report`, `artifact_refs` keys | List present docs: INTAKE, IMPACT_ANALYSIS, IMPLEMENTATION_PLAN, QA_HANDOVER, QA_REPORT |
| 19 | Code markers | codebase scan | `YES` if `# CR-XXX` or `# BUG-XXX` marker found in `frontend/src/`; `no` otherwise |
| 20 | Files | `files` | Comma-separated |
| 21 | Notes | `notes` | Direct. Append "PRIORITY DEFAULTED" if col 7 was defaulted |
| 22 | Money path | computed from area/title/files | `YES` if area in {Payments, PMS Folio, Smart Purchase} or title/files mention billing/invoice/folio/checkout; `no` otherwise |

### 3.3 Status classifier (8 enum values, contract §4)

```python
def classify_status(raw):
    s = str(raw).upper()
    if any(k in s for k in ['DUPLICATE','DUPE']):                                  return 'DUPLICATE'
    if any(k in s for k in ['PARKED','DEFERRED']):                                 return 'PARKED'
    if any(k in s for k in ['CLOSED','OWNER VERIFIED','SUBSUMED','RETIRED',
                              'RESOLVED','ABSORBED','FOLDED','FROZEN','SHIPPED',
                              'VERIFIED']):                                          return 'CLOSED'
    if any(k in s for k in ['AWAITING OWNER SMOKE','GATE_6','OWNER SMOKE',
                              'AWAITING SMOKE']):                                   return 'SMOKE'
    if any(k in s for k in ['GATE_5B','QA PASS','QA_PASS','GATE 5B']):             return 'QA'
    if any(k in s for k in ['GATE_5A','GATE_4','GATE 5A','GATE 4',
                              'IMPLEMENTED','GATE_5A_IMPLEMENTED',
                              'IN PROGRESS','IN_PROGRESS']):                        return 'IMPLEMENTED'
    if any(k in s for k in ['GATE_2','GATE_3','GATE 2','GATE 3',
                              'IMPACT_ANALYSIS','PLAN_COMPLETE',
                              'GATE_2_READY','GATE_3_PLAN_COMPLETE']):              return 'PLANNING'
    if any(k in s for k in ['GATE_1','INTAKE','REGISTERED','NOT STARTED',
                              'GATE 1','GATE_1_INTAKE']):                           return 'INTAKE'
    return ''   # blank = Unrouted (back-catalogue interim, contract §4)
```

**Current distribution (pre-push estimate from 770-item registry):**

| Status | Count |
|---|---|
| CLOSED | ~259 |
| SMOKE | ~170 |
| QA | ~156 |
| INTAKE | ~86 |
| UNROUTED (blank) | ~40 |
| PARKED | ~28 |
| IMPLEMENTED | ~24 |
| PLANNING | ~6 |
| DUPLICATE | ~0 |
| **Total** | **770** |

Target: zero unrouted. Unrouted count reported in run summary.

### 3.4 POS Area list (normalisation map)

Canonical values (owner may extend via brief amendment):
```
Printing · Reports · Inventory · Menu Management · Payments · PMS Check-In ·
PMS Bookings · PMS Folio · CRM · Settings · Auth / Permissions · Smart Purchase ·
Sidebar / Nav · Sockets · Order Entry · Dashboard · Expense · Tooling
```

Free-text variants to normalise (examples):
- "printing", "Printer", "KOT" → Printing
- "report", "Reports Module" → Reports
- "inventory", "INV", "stock" → Inventory
- "menu", "Menu Mgmt" → Menu Management
- "payment", "pay", "billing" → Payments
- "check-in", "checkin", "check in" → PMS Check-In
- "pms", "room" → PMS Bookings (default if no sub-type)
- "folio", "pms folio" → PMS Folio
- "crm", "customer" → CRM
- "settings", "config" → Settings
- "auth", "permission", "role" → Auth / Permissions
- "smart purchase", "purchase" → Smart Purchase
- "sidebar", "nav", "navigation" → Sidebar / Nav
- "socket", "websocket", "realtime" → Sockets
- "order", "order entry", "order management" → Order Entry
- "dashboard", "insights" → Dashboard
- "expense" → Expense
- "tooling", "tool", "script" → Tooling
- Unrecognised → blank

### 3.5 Blocked on party enum

Valid values (contract §3 col 11):
`blank · BACKEND · POS · CRM · SO · INV · INFRA · OWNER · OPS · INTERNAL`

Derivation logic:
- `blocked_by` field: parse for known party names
- `blocker` field: keyword-match (backend → BACKEND, owner → OWNER, etc.)
- Status contains "BACKEND-BLOCKED" → BACKEND
- Status contains "CRM-BLOCKED" → CRM
- Closed items: always blank (stale blockers dropped per brief §5)

---

## 4. Track B — REGISTRAR role + Change Log (disable pull-back)

### 4.1 Disable `--pull` mode

The current `cmd_pull()` function writes sheet edits (status, priority, notes, sprint_key)
directly to `registry.json`. **This is disabled.** New behavior:

- `--pull` flag is removed (or prints deprecation message: "Pull-back disabled. Use Change Log approval flow.")
- Sheet → registry only via Change Log with owner approval

### 4.2 Change Log tab (contract §5)

**Columns (8, in this order):**
`Logged at · ID · Column · Old value (registry) · New value (sheet) · Decision · Decided at · Note`

**Decision enum:** PENDING / APPROVED / APPLIED / REJECTED

**Phase 1 accepted columns from sheet:** Status, Registered, Closed only.
All other column edits → logged with Decision=REJECTED, Note="column not editable in Phase 1".

**Assignee:** excluded from diff entirely (agent neither reads nor writes it).

**SOURCE=DASHBOARD:** Priority and Status edits tagged in Change Log. Applied to registry without owner approval.

### 4.3 REGISTRAR run sequence (every `--push`)

```
1. Load registry.json (770 items)
2. Run one-off cleanup if not yet done (Track C)
3. Build 22-column rows for all 10 tabs
4. Manage tab structure (rename/create/delete obsolete tabs)
5. Write All Items + 8 stage/structural tabs
6. Diff sheet All Items (before overwrite) vs registry → append to Change Log
7. Write Change Log tab (append-only — preserve prior rows)
8. Write Summary tab
9. Print run report (see §7)
```

---

## 5. Track C — One-off registry cleanup

Run once, before first push. Mutations to `registry.json`:

### C-1 — Type normalisation (~55 rows)
```python
for item in items:
    if isinstance(item.get('type'), str):
        item['type'] = item['type'].upper()
```

### C-2 — Add 3 timestamp fields to schema
```python
for item in items:
    if 'registered' not in item:
        item['registered'] = item.get('created', item.get('created_at', ''))
    if 'last_updated' not in item:
        item['last_updated'] = ''   # agent will fill on first push
    if 'closed' not in item:
        item['closed'] = ''         # owner fills via sheet for CLOSED items
```

### C-3 — Category field cleanup
- Values like NOT_STARTED, SHIPPED, SUBSUMED, ACTIVE, DONE → move to Status note or drop (Status field carries this)
- Values like area names → copy to `area` field if `area` is blank

### C-4 — Blockers reconciliation
- Walk ~23 "BLOCKED BY" relationships in current Blockers tab
- For each: if item Status = CLOSED → remove `blocked_by`/`blocker` field (stale)
- For live blockers: express as `blocked_by` field + derive `Blocked on` party

---

## 6. Code Reality Check

```
# sheets_sync.py — current state
grep -n "TABS\|COLS\|classify_tab\|cmd_pull\|cmd_push" /app/memory/reports/sheets_sync.py
→ TABS = 9 tabs (wrong names)
→ COLS = 20 fields (old schema, no Project/Risk/Registered/LastUpdated/Closed/Artefacts/CodeMarkers/MoneyPath)
→ classify_tab() exists (maps status → old tab names)
→ cmd_pull() exists and writes to registry.json (must be disabled)
→ cmd_push() exists (must be rewritten)

# registry.json — current state
Total items: 770
Lowercase type rows: ~55
No priority/severity: ~150
No area: ~535
No registered/created: ~445
Category field with lifecycle values: present
```

**Result: PARTIAL** — script exists and connects to the sheet; everything else needs rewriting.

---

## 7. Run Report (deliverable, printed after every `--push`)

```
═══════════════════════════════════════════════════
  POS REGISTRAR RUN — <YYYY-MM-DD HH:MM>
═══════════════════════════════════════════════════
  Total rows pushed:        770
  ─────────────────────────────
  Status distribution:
    CLOSED:       259
    SMOKE:        170
    QA:           156
    INTAKE:        86
    PARKED:        28
    IMPLEMENTED:   24
    PLANNING:       6
    DUPLICATE:      0
    Unrouted:      40  ← target zero
  ─────────────────────────────
  UNCLASSIFIED status strings:  0  (target zero)
  PRIORITY DEFAULTED rows:    150
  Items with no Registered:   445
  Live blockers kept:          XX
  Stale blockers dropped:      XX
  Change Log rows appended:    XX  (PENDING)
═══════════════════════════════════════════════════
```

---

## 8. Acceptance Criteria (from brief)

- [ ] Header row 1 on all 10 tabs. No banner line.
- [ ] 22 contract columns, exact order, on every tab.
- [ ] `Project = POS` on every row.
- [ ] Every row has: ID, Type, Title, Status (enum), Priority (enum), Last updated.
- [ ] Summary Status counts + Unrouted sum to All Items row count.
- [ ] `Assignee` column present and never written by agent on All Items.
- [ ] `Assignee` always blank on all stage tabs.
- [ ] Change Log tab present; human edits logged as PENDING.
- [ ] Direct `--pull` write-back disabled.
- [ ] Run report printed to console after every push.

---

## 9. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| CR-406 | Google Sheets Two-Way Sync (9-tab push + pull) | **SUPERSEDES push behavior** — CR-406 script is the baseline for this rewrite. CR-406 not closed. |
| CR-417 | Session Log tab | COMPATIBLE — Session Log tab can be added after this CR lands. CR-417 deferred until this CR reaches Gate 5A. |
| CR-389 | Registry Excel Export | NOT RELATED — different output format |

---

## 10. Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Control Layer / Tooling |
| Priority | P1 / HIGH |
| Risk | MEDIUM |
| Risk Reason | registry.json one-off cleanup is irreversible; must test in dry-run before first live push. Script rewrite is standalone Python with no frontend impact. |
| Fast Lane | NO — multiple tracks, significant scope, registry schema changes |
| Sprint | oct_release |
| Depends on | CR-406 (GATE_5A_IMPLEMENTED — script baseline exists) |
| Blocks | CR-417 (Session Log tab — deferred until this lands) |

---

## 11. Blast Radius

| Metric | Value |
|---|---|
| Files to change (app src) | **0** |
| `memory/reports/sheets_sync.py` | Full rewrite (~465 lines → ~650 lines) |
| `memory/control/registry.json` | One-off cleanup: type casing, timestamp fields, category cleanup (runtime mutation) |
| `memory/reports/registry-sheet-contract-v1.4.md` | NEW (saved this session) |
| Google Sheet mutations | Tab rename/create/delete; full re-write of all 10 tabs on push |
| Hotspot files (R5) | NONE |
| Frontend/src | NONE |

---

## 12. Open Decisions

| # | Question | Recommended Default | Status |
|---|---|---|---|
| OD-418-01 | Run Track C cleanup before first push, or as a separate session? | Run in same step as first push (dry-run first, live on owner GO) | **PROPOSED** |
| OD-418-02 | Should `--pull` flag be removed entirely or print a deprecation message? | Print deprecation: "Pull disabled — use Change Log" | **PROPOSED** |
| OD-418-03 | Unrouted items (~40): leave blank Status or default to INTAKE? | Leave blank (contract back-catalogue interim rule) | **LOCKED** (contract §4) |
| OD-418-04 | Code markers scan: scan full codebase or `frontend/src/` only? | `frontend/src/` only (that's where all markers live) | **PROPOSED** |
| OD-418-05 | CR-417 (Session Log tab): add as tab 11 after this CR or wait? | Defer — CR-417 lands after CR-418 Gate 5A | **PROPOSED** |

> All ODs have recommended defaults. Owner can GO without answering; defaults apply.

---

## 13. Scope Lock

**WILL touch:**
- `memory/reports/sheets_sync.py` — full rewrite (Tracks A + B)
- `memory/control/registry.json` — runtime one-off cleanup (Track C; atomic write)

**WILL NOT touch:**
- Any file under `frontend/src/` or `backend/`
- `memory/reports/.env` (credentials unchanged)
- Any R5 hotspot file

---

*Intake agent: E1 — 2026-10-09*
*Brief source: brief-pos-agent.md (FROZEN) · Contract: registry-sheet-contract-v1.4.md (FROZEN)*
