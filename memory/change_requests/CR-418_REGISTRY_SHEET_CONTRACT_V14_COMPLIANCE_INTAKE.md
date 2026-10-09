# CR-418 — Registry Sheet: Contract v1.4 Compliance + REGISTRAR Role

**Type:** CR (Change Request)
**ID:** CR-418
**Date:** 2026-10-09
**Sprint:** oct_release
**Gate:** 1 — INTAKE
**Status:** GATE_1_INTAKE — ALL ODs LOCKED (2026-10-09)
**Registered by:** E1 (Emergent Agent) — owner-directed
**Source documents:**
- Brief: `memory/design_briefs/brief-pos-agent.md` (FROZEN 2026-10-09)
- Contract: `memory/reports/registry-sheet-contract-v1.4.md` (FROZEN 2026-10-07)

## Open Decisions — ALL LOCKED

| # | Question | Decision | Locked |
|---|---|---|---|
| OD-418-01 | Cleanup timing? | **A — Same step as `--push`** (dry-run printed first, then live in same command) | ✅ LOCKED |
| OD-418-02 | `--pull` behaviour after disable? | **C — Read-only diff** (`--pull` reads sheet, prints pending Change Log rows, writes nothing) | ✅ LOCKED |
| OD-418-03 | Unrouted status strings? | **Best-guess + blank remainder** — SHIPPED/VERIFIED/CARRY-FORWARD → IMPLEMENTED; BACKEND_BLOCKED → real stage + Blocked on = BACKEND; genuinely ambiguous → blank (Unrouted) | ✅ LOCKED |
| OD-418-04 | Code markers scan? | **Skip** — write `no` for all items on first push. Future CR can add scan. | ✅ LOCKED |
| OD-418-05 | CR-417 Session Log tab? | **Defer** — CR-418 delivers exactly 10 tabs per contract. CR-417 lands after Gate 5A. | ✅ LOCKED |

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

### 3.3 Status classifier — LOCKED (OD-418-03)

Full best-guess mapping before falling back to blank (Unrouted):

```python
def classify_status(raw):
    s = str(raw).upper()
    # Explicit duplicates first
    if any(k in s for k in ['DUPLICATE', 'DUPE']):
        return 'DUPLICATE'
    # Parked — deliberate owner decision only
    if any(k in s for k in ['PARKED', 'DEFERRED']):
        return 'PARKED'
    # Closed / fully done
    if any(k in s for k in ['CLOSED', 'OWNER VERIFIED', 'SUBSUMED', 'RETIRED',
                              'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN']):
        return 'CLOSED'
    # Shipped/Verified → IMPLEMENTED (OD-418-03 owner decision)
    if any(k in s for k in ['SHIPPED', 'VERIFIED', 'CARRY-FORWARD',
                              'RE-INVESTIGATE', 'NEEDS_MORE_DATA',
                              'INVESTIGATION COMPLETE']):
        return 'IMPLEMENTED'
    # Awaiting owner smoke test
    if any(k in s for k in ['AWAITING OWNER SMOKE', 'GATE_6', 'OWNER SMOKE',
                              'AWAITING SMOKE']):
        return 'SMOKE'
    # QA passed
    if any(k in s for k in ['GATE_5B', 'QA PASS', 'QA_PASS', 'GATE 5B']):
        return 'QA'
    # Implemented / in progress
    if any(k in s for k in ['GATE_5A', 'GATE_4', 'GATE 5A', 'GATE 4',
                              'IMPLEMENTED', 'GATE_5A_IMPLEMENTED',
                              'IN PROGRESS', 'IN_PROGRESS']):
        return 'IMPLEMENTED'
    # Planning
    if any(k in s for k in ['GATE_2', 'GATE_3', 'GATE 2', 'GATE 3',
                              'IMPACT_ANALYSIS', 'PLAN_COMPLETE',
                              'GATE_2_READY', 'GATE_3_PLAN_COMPLETE']):
        return 'PLANNING'
    # Intake
    if any(k in s for k in ['GATE_1', 'INTAKE', 'REGISTERED', 'NOT STARTED',
                              'GATE 1', 'GATE_1_INTAKE']):
        return 'INTAKE'
    # Backend/CRM blocked → keep blank Status; Blocked on set separately
    # (BACKEND_BLOCKED is not a Status per contract §4)
    return ''   # blank = Unrouted (back-catalogue interim, contract §4)
```

**Blocked on derivation for BACKEND/CRM-blocked items (OD-418-03):**
- Status contains `BACKEND-BLOCKED` or `BACKEND_BLOCKED` → `Blocked on = BACKEND`, Status derived from rest of string (or INTAKE if unclear)
- Status contains `CRM-BLOCKED` → `Blocked on = CRM`, Status from rest

**Pre-push distribution estimate (771 items with new classifier):**

| Status | Count |
|---|---|
| CLOSED | ~259 |
| SMOKE | ~170 |
| QA | ~156 |
| IMPLEMENTED | ~64 (was 24 + ~40 SHIPPED/VERIFIED mapped here) |
| INTAKE | ~86 |
| PARKED | ~28 |
| PLANNING | ~6 |
| DUPLICATE | ~0 |
| Unrouted (blank) | ~2 (genuinely ambiguous) |
| **Total** | **771** |

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

### 4.1 Disable `--pull` write-back — replace with read-only diff (OD-418-02: C)

The current `cmd_pull()` writes sheet edits directly to `registry.json`. **This is replaced.**

New `--pull` behaviour (read-only diff, no writes):
```
python3 sheets_sync.py --pull

── READ-ONLY DIFF: Sheet → registry ─────────────────────
  Reading All Items tab from sheet...
  Comparing 771 rows against registry.json...

  Pending Change Log rows (3):
    CR-405  status:  'GATE_5B_QA_PASS' → 'CLOSED'          [PENDING]
    BUG-412 registered: '' → '2026-09-15'                   [PENDING]
    CR-380  closed: '' → '2026-09-20'                       [PENDING]

  No writes made. Run --push to log these to the Change Log tab.
──────────────────────────────────────────────────────────
```

`--pull` never writes to `registry.json` or the sheet. It only prints what it finds.

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

## 12. Open Decisions — ALL LOCKED (2026-10-09)

| # | Question | Decision | Source |
|---|---|---|---|
| OD-418-01 | Cleanup timing | **A — same step as `--push`** (dry-run output first, then live) | Owner |
| OD-418-02 | `--pull` after disable | **C — read-only diff** (prints pending Change Log rows, writes nothing) | Owner |
| OD-418-03 | Unrouted status strings | **Best-guess + blank** (SHIPPED/VERIFIED/CARRY-FORWARD → IMPLEMENTED; BACKEND_BLOCKED → stage + Blocked on; ambiguous → blank) | Owner |
| OD-418-04 | Code markers scan | **Skip** — write `no` for all items on first push | Owner |
| OD-418-05 | CR-417 Session Log | **Defer** — CR-418 = exactly 10 tabs per contract; CR-417 after Gate 5A | Owner |

No open decisions remain. Ready for Gate 2 GO.

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
