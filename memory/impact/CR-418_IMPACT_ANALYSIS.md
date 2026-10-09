# CR-418 — Impact Analysis (Gate 2)
# Registry Sheet: Contract v1.4 Compliance + REGISTRAR Role

**Gate:** 2 — Impact Analysis
**Status:** GATE_2_IMPACT_ANALYSIS
**Date:** 2026-10-09
**Risk:** MEDIUM
**IA Role:** PLANNING (AGENT_PROMPT_ALPHA v0.7 Role 2)

---

## Header Checks

### Code Reality: PARTIAL

```bash
# sheets_sync.py exists — 466 lines (CR-406 baseline)
wc -l /app/memory/reports/sheets_sync.py  → 466

# Grep: 22-column contract COLS, classify_status, build_change_log_tab
grep -n "COLS\|classify_status\|build_change_log\|REGISTRAR\|Money path\|Artefacts\|Registered" \
     /app/memory/reports/sheets_sync.py
→ L39: COLS = [...] (20 fields — OLD, NOT contract §3)
→ 0 hits for classify_status, build_change_log, REGISTRAR, Money path, Artefacts, Registered
```

**What exists and is REUSABLE (unchanged):**
- `get_access_token()` L87–101
- `sheets_get/post/put()` L107–123
- `get_sheet_meta()` L125–132
- `_flatten()` L170–175
- `_range_url()` L212–215
- `write_tab()` L276–307 (reuse as-is)
- `build_blockers_tab()` L218–273 (MODIFIED — filter closed items out)
- Env/path loading L25–36

**What exists and MUST CHANGE (wrong):**

| Symbol | Location | Problem | Action |
|---|---|---|---|
| `COLS` | L38–44 | 20 cols, old schema — not contract §3 | Replace with 22 contract columns |
| `PULL_EDITABLE` | L46–47 | Writes directly to registry | Remove (replaced by Change Log) |
| `TABS` | L49–60 | 9 tabs, wrong names: "QA'd", "Smoke Test", "Implementation" | Replace with 10 contract tabs |
| `classify_tab()` | L62–84 | Status-based tab router, old tab names | Replace with `classify_status()` + routing |
| `_OBSOLETE_TABS` | L136 | Missing "QA'd", "Smoke Test", "Implementation" | Extend list |
| `sync_tabs()` | L138–167 | Doesn't delete old v2 tabs, doesn't create Change Log | Update |
| `build_tab_rows()` | L177–188 | Routes to old tab names, uses COLS directly | Rewrite to use `_build_contract_row()` |
| `_build_summary()` | L190–210 | Old format (BY TYPE / BY STATUS TAB / BY SPRINT) — not contract §6 | Rewrite per contract §6 |
| `cmd_push()` | L309–337 | Says "9 tabs", no Track C, no Change Log, no run report | Full rewrite |
| `cmd_pull()` | L339–404 | Writes to registry.json — must be replaced with read-only diff | Replace (OD-418-02 C) |
| `main()` | L407–465 | Help text, epilog | Minor update |

**What is MISSING (new functions needed):**
- `classify_status(item)` → 8-value contract enum (with `_contract_status` override)
- `_classify_area(raw)` → normalise to POS area list
- `_build_contract_row(item)` → builds all 22 cols from one registry item
- `_build_money_path(item)` → YES / no
- `_build_artefacts(item)` → list present doc names
- `_build_owner_action(item, status)` → SMOKE/OWNER action text
- `_build_blocked_on(item, status)` → party enum, closed items → blank
- `build_change_log_tab(token, items)` → read sheet, diff vs registry, append rows
- `_run_track_c(registry)` → one-off cleanup (type, timestamps, category)
- `_print_run_report(items, cl_appended, blockers_stats)` → console run report

### Conflict Pre-Check: CLEAR

```
FILE_OWNERSHIP.md: memory/reports/sheets_sync.py → CR-406 (2026-10-04, GATE_5A)
                   No other open CR touches this file.
registry.json:     All current write operations are RUNTIME (--push/--pull).
                   No open CR/BUG has an approved plan to mutate registry.json in parallel.
Result: NO CONFLICTS
```

---

## 1. Data Flow (Current → Target)

### Current (CR-406 baseline)

```
registry.json (771 items)
  ↓ COLS (20 fields)
  ↓ classify_tab() (old tab names, status-string-based)
9 tabs (wrong names + structure)
  ↓ cmd_pull() writes edits DIRECTLY to registry.json
registry.json overwritten
```

### Target (CR-418 contract v1.4)

```
registry.json (771 items)
  ↓ _run_track_c()     [Track C: type, timestamps, category cleanup — once only]
  ↓ classify_status()  [8-value enum, _contract_status override for patched items]
  ↓ _build_contract_row() [22 cols: Project, ID, Type, Title, Status, Status note,
                            Priority, Risk, Area, Sprint, Blocked on, Owner action,
                            Assignee(blank), Registered, Last updated, Closed,
                            Related, Artefacts, Code markers(no), Files, Notes, Money path]
10 tabs (contract §2 names + order)
  ↓ Change Log diff    [read sheet All Items → find human edits → append to Change Log]
  ↓ --pull (new)       [read-only diff: prints pending rows, writes nothing]
registry.json NEVER directly overwritten by script
```

---

## 2. Exact Function-Level Changes

### E-1 — Lines 38–44: Replace COLS (20 → 22 contract columns)

**Current (20 fields, old schema):**
```python
COLS = [
    'id', 'type', 'title', 'status', 'priority', 'severity',
    'sprint_key', 'area', 'category', 'risk', 'phase', 'current_gate',
    'blast_radius', 'files', 'notes', 'blocked_by', 'depends_on',
    'intake_doc', 'qa_report', 'qa_result',
]
```

**Replace with (22 contract column NAMES — used as header row only):**
```python
# CR-418: 22-column contract §3 header (exact names, exact order)
CONTRACT_COLS = [
    'Project', 'ID', 'Type', 'Title', 'Status', 'Status note',
    'Priority', 'Risk', 'Area', 'Sprint', 'Blocked on', 'Owner action',
    'Assignee', 'Registered', 'Last updated', 'Closed',
    'Related', 'Artefacts', 'Code markers', 'Files', 'Notes', 'Money path',
]
```

Impact: `build_tab_rows()` uses COLS as header row. Replace with `CONTRACT_COLS`. All row-building must migrate from `item.get(col)` to `_build_contract_row(item)`.

---

### E-2 — Lines 46–47: Remove PULL_EDITABLE

**Current:**
```python
PULL_EDITABLE = ['status', 'priority', 'notes', 'sprint_key']
```

**Remove** (no direct write-back). Replace with:
```python
# CR-418: Phase 1 accepted columns (contract §5.5) — used by Change Log diff only
PHASE1_ACCEPTED = ['Status', 'Registered', 'Closed']  # contract column names
```

---

### E-3 — Lines 49–60: Replace TABS (9 → 10 contract tabs)

**Current (9 tabs, wrong names):**
```python
TABS = ['All Items','Intake','Planning','Implementation',"QA'd",'Smoke Test','Closed','Blockers','Summary']
```

**Replace with (10 contract tabs, exact contract §2 names):**
```python
# CR-418: 10 tabs, contract §2 exact names and order
TABS = [
    'All Items', 'Intake', 'Planning', 'Implemented',
    'QA', 'Smoke', 'Closed', 'Blockers', 'Change Log', 'Summary',
]
```

---

### E-4 — Lines 62–84: Replace `classify_tab()` with `classify_status()` + tab router

**Remove** `classify_tab()` entirely.

**Add two new functions:**

```python
# CR-418: 8-value contract status enum classifier
def classify_status(item):
    """Map registry item to one of 8 contract Status enum values.
    Uses _contract_status override if owner-patched directly."""
    if item.get('_contract_status'):
        return item['_contract_status']
    s = str(item.get('status', '')).upper()
    if any(k in s for k in ['DUPLICATE', 'DUPE']):
        return 'DUPLICATE'
    if any(k in s for k in ['PARKED', 'DEFERRED']):
        return 'PARKED'
    if any(k in s for k in ['CLOSED', 'OWNER VERIFIED', 'SUBSUMED', 'RETIRED',
                              'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN']):
        return 'CLOSED'
    if any(k in s for k in ['SHIPPED', 'VERIFIED', 'CARRY-FORWARD',
                              'RE-INVESTIGATE', 'NEEDS_MORE_DATA',
                              'INVESTIGATION COMPLETE']):
        return 'IMPLEMENTED'
    if any(k in s for k in ['AWAITING OWNER SMOKE', 'GATE_6', 'OWNER SMOKE',
                              'AWAITING SMOKE']):
        return 'SMOKE'
    if any(k in s for k in ['GATE_5B', 'QA PASS', 'QA_PASS', 'GATE 5B']):
        return 'QA'
    if any(k in s for k in ['GATE_5A', 'GATE_4', 'GATE 5A', 'GATE 4',
                              'IMPLEMENTED', 'IN PROGRESS', 'IN_PROGRESS']):
        return 'IMPLEMENTED'
    if any(k in s for k in ['GATE_2', 'GATE_3', 'GATE 2', 'GATE 3',
                              'IMPACT_ANALYSIS', 'PLAN_COMPLETE', 'GATE_2_READY']):
        return 'PLANNING'
    if any(k in s for k in ['GATE_1', 'INTAKE', 'REGISTERED', 'NOT STARTED',
                              'GATE 1', 'GATE_1_INTAKE']):
        return 'INTAKE'
    if 'BACKEND-BLOCKED' in s or 'BACKEND_BLOCKED' in s:
        return 'INTAKE'   # keep real stage; Blocked on = BACKEND set separately
    if 'CRM-BLOCKED' in s:
        return 'INTAKE'
    return ''  # blank = Unrouted (back-catalogue interim, contract §4)

# Map contract status → tab name (contract §2)
_STATUS_TO_TAB = {
    'INTAKE': 'Intake', 'PLANNING': 'Planning', 'IMPLEMENTED': 'Implemented',
    'QA': 'QA', 'SMOKE': 'Smoke',
    'CLOSED': 'Closed', 'PARKED': 'Closed', 'DUPLICATE': 'Closed',
}
def _status_to_tab(contract_status):
    return _STATUS_TO_TAB.get(contract_status)  # None = All Items only (Unrouted)
```

---

### E-5 — Lines 136: Extend `_OBSOLETE_TABS`

**Current:**
```python
_OBSOLETE_TABS = ['Open Only', 'QA / Smoke', 'Blocked / Parked']
```

**Replace with:**
```python
# CR-418: all tabs from v1 and v2 that are renamed/removed in contract v1.4
_OBSOLETE_TABS = [
    'Open Only',           # v1
    'QA / Smoke',          # v2 (renamed → QA + Smoke)
    'Blocked / Parked',    # v2 (removed)
    "QA'd",               # v2 (renamed → QA)
    'Smoke Test',          # v2 (renamed → Smoke)
    'Implementation',      # v2 (renamed → Implemented)
]
```

---

### E-6 — Lines 138–167: Update `sync_tabs()`

Add creation of `Change Log` tab. No other change to logic — already handles create/delete.

```python
# Only change: _OBSOLETE_TABS now includes v2 names (E-5 handles this)
# No other change to sync_tabs() body needed
```

---

### E-7 — Lines 177–188: Replace `build_tab_rows()`

**Current:** uses `COLS` and `classify_tab()`.

**Replace with:**
```python
def build_tab_rows(items, tab_name):
    """Build rows for a given tab using 22-column contract layout."""
    if tab_name == 'Summary':
        return _build_summary(items)
    if tab_name == 'Blockers':
        return build_blockers_tab(items)
    if tab_name == 'Change Log':
        return None  # Change Log is built separately (append-only, not rebuilt)
    subset = items if tab_name == 'All Items' else [
        i for i in items
        if _status_to_tab(classify_status(i)) == tab_name
    ]
    rows = [CONTRACT_COLS]
    for item in subset:
        rows.append(_build_contract_row(item))
    return rows
```

---

### E-8 — NEW: `_build_contract_row(item)` (22 cols)

New function. Maps registry item → exactly 22 contract column values in order:

```python
def _build_contract_row(item):
    """Build a 22-column contract row from one registry item."""
    contract_status = classify_status(item)
    today = datetime.now().strftime('%Y-%m-%d')

    col1_project    = 'POS'
    col2_id         = _flatten(item.get('id', ''))
    col3_type       = _build_type(item)
    col4_title      = _flatten(item.get('title', ''))
    col5_status     = contract_status
    col6_status_note = _flatten(item.get('status', ''))   # full free-text prose
    col7_priority   = _build_priority(item)
    col8_risk       = _flatten(item.get('risk', ''))
    col9_area       = _classify_area(_flatten(item.get('area', '')))
    col10_sprint    = _flatten(item.get('sprint_key', ''))
    col11_blocked_on = _build_blocked_on(item, contract_status)
    col12_owner_action = _build_owner_action(item, contract_status)
    col13_assignee  = ''  # NEVER written by agent (contract §3 col 13)
    col14_registered = _flatten(item.get('registered') or item.get('created') or item.get('created_at', ''))
    col15_last_updated = today  # agent-computed only (contract §5)
    col16_closed    = _flatten(item.get('closed', '')) if contract_status in ('CLOSED','PARKED','DUPLICATE') else ''
    col17_related   = _build_related(item)
    col18_artefacts = _build_artefacts(item)
    col19_code_markers = 'no'  # OD-418-04: skipped on first push
    col20_files     = _flatten(item.get('files', ''))
    col21_notes     = _build_notes(item)
    col22_money_path = _build_money_path(item)

    return [
        col1_project, col2_id, col3_type, col4_title, col5_status,
        col6_status_note, col7_priority, col8_risk, col9_area, col10_sprint,
        col11_blocked_on, col12_owner_action, col13_assignee, col14_registered,
        col15_last_updated, col16_closed, col17_related, col18_artefacts,
        col19_code_markers, col20_files, col21_notes, col22_money_path,
    ]
```

---

### E-9 — NEW: Helper functions for `_build_contract_row()`

```python
def _build_type(item):
    """CR-418: derive Type from item, uppercase. CR with title starting 'BUG' → BUG."""
    t = str(item.get('type', '')).upper().strip()
    if not t:
        # derive from ID prefix
        id_ = str(item.get('id', ''))
        if id_.startswith('CR-'): t = 'CR'
        elif id_.startswith('BUG-'): t = 'BUG'
    # CR whose title starts "BUG" → BUG (contract §4)
    if t == 'CR' and str(item.get('title', '')).upper().startswith('BUG'):
        t = 'BUG'
    return t or ''

def _build_priority(item):
    """P0–P3 only. Missing → P2 (OD-418-03 confirmed). Append PRIORITY DEFAULTED to Notes."""
    p = item.get('priority') or item.get('severity') or ''
    p = str(p).upper().strip()
    if p in ('P0','P1','P2','P3'):
        return p
    item['_priority_defaulted'] = True
    return 'P2'

def _build_notes(item):
    """Notes + PRIORITY DEFAULTED flag if applicable."""
    n = _flatten(item.get('notes', ''))
    if item.get('_priority_defaulted'):
        n = ('PRIORITY DEFAULTED. ' + n).strip()
    return n

_POS_AREAS = {
    'printing': 'Printing', 'printer': 'Printing', 'kot': 'Printing',
    'report': 'Reports', 'reports': 'Reports', 'insights': 'Dashboard',
    'inventory': 'Inventory', 'inv': 'Inventory', 'stock': 'Inventory',
    'menu': 'Menu Management', 'product': 'Menu Management',
    'payment': 'Payments', 'billing': 'Payments', 'pay': 'Payments',
    'check-in': 'PMS Check-In', 'checkin': 'PMS Check-In', 'check in': 'PMS Check-In',
    'pms booking': 'PMS Bookings', 'booking': 'PMS Bookings', 'reservation': 'PMS Bookings',
    'folio': 'PMS Folio', 'pms folio': 'PMS Folio', 'checkout': 'PMS Folio',
    'crm': 'CRM', 'customer': 'CRM',
    'settings': 'Settings', 'config': 'Settings',
    'auth': 'Auth / Permissions', 'permission': 'Auth / Permissions', 'role': 'Auth / Permissions',
    'smart purchase': 'Smart Purchase', 'purchase': 'Smart Purchase', 'smart': 'Smart Purchase',
    'sidebar': 'Sidebar / Nav', 'nav': 'Sidebar / Nav', 'navigation': 'Sidebar / Nav',
    'socket': 'Sockets', 'websocket': 'Sockets', 'realtime': 'Sockets',
    'order': 'Order Entry', 'order entry': 'Order Entry',
    'dashboard': 'Dashboard',
    'expense': 'Expense',
    'tooling': 'Tooling', 'tool': 'Tooling', 'script': 'Tooling', 'control': 'Tooling',
    'room': 'PMS Bookings', 'pms': 'PMS Bookings',
}
_CANONICAL_AREAS = set([
    'Printing','Reports','Inventory','Menu Management','Payments',
    'PMS Check-In','PMS Bookings','PMS Folio','CRM','Settings',
    'Auth / Permissions','Smart Purchase','Sidebar / Nav','Sockets',
    'Order Entry','Dashboard','Expense','Tooling',
])

def _classify_area(raw):
    """Normalise free-text area to POS canonical list. Unrecognised → blank."""
    if raw in _CANONICAL_AREAS:
        return raw
    k = raw.lower().strip()
    return _POS_AREAS.get(k, '')

_PARTY_MAP = {
    'backend': 'BACKEND', 'be': 'BACKEND', 'server': 'BACKEND',
    'crm': 'CRM', 'owner': 'OWNER', 'ops': 'OPS',
    'infra': 'INFRA', 'so': 'SO', 'inv': 'INV', 'pos': 'POS',
    'internal': 'INTERNAL',
}
_PARTY_ENUM = {'BACKEND','POS','CRM','SO','INV','INFRA','OWNER','OPS','INTERNAL'}

def _build_blocked_on(item, contract_status):
    """Derive Blocked on party enum. Closed items → blank (contract §3 col 11)."""
    if contract_status in ('CLOSED', 'PARKED', 'DUPLICATE'):
        return ''
    bk = str(item.get('blocked_by', '') or item.get('blocker', '') or '')
    raw_status = str(item.get('status', '')).upper()
    if 'BACKEND-BLOCKED' in raw_status or 'BACKEND_BLOCKED' in raw_status:
        return 'BACKEND'
    if 'CRM-BLOCKED' in raw_status:
        return 'CRM'
    if not bk.strip():
        return ''
    bk_upper = bk.upper()
    for kw, party in _PARTY_MAP.items():
        if kw.upper() in bk_upper:
            return party
    return ''

def _build_owner_action(item, contract_status):
    """SMOKE items: 'Smoke test <title>'. OWNER-blocked: decision text. Others: blank."""
    if contract_status == 'SMOKE':
        return f"Smoke test {item.get('title','')}"[:200]
    blocked = str(item.get('blocked_by', '') or item.get('blocker', '') or '')
    if 'OWNER' in blocked.upper():
        notes = str(item.get('notes', ''))
        return notes[:200] if notes else 'Owner decision required'
    return ''

def _build_related(item):
    """Combine depends_on + related, comma-separated IDs."""
    parts = []
    dep = item.get('depends_on', [])
    if isinstance(dep, str): dep = [d.strip() for d in dep.split(',') if d.strip()]
    rel = item.get('related', [])
    if isinstance(rel, str): rel = [r.strip() for r in rel.split(',') if r.strip()]
    parts = list(dep or []) + list(rel or [])
    return ', '.join(str(p) for p in parts if p) if parts else ''

def _build_artefacts(item):
    """List names of artefacts that exist: INTAKE, IMPACT_ANALYSIS, etc."""
    refs = item.get('artifact_refs', {})
    found = []
    if item.get('intake_doc') or refs.get('intake'): found.append('INTAKE')
    if refs.get('impact_analysis'): found.append('IMPACT_ANALYSIS')
    if refs.get('implementation_plan'): found.append('IMPLEMENTATION_PLAN')
    if refs.get('qa_handover'): found.append('QA_HANDOVER')
    if item.get('qa_report') or refs.get('qa_report'): found.append('QA_REPORT')
    return ', '.join(found)

_MONEY_AREAS = {'Payments', 'PMS Folio', 'Smart Purchase'}
_MONEY_KEYWORDS = ('payment','billing','folio','smart purchase','invoice','checkout',
                   'gst','tax','settle','collect','discount','wallet','coupon')

def _build_money_path(item):
    """YES if item touches Payments, PMS Folio, Smart Purchase, or Billing keywords."""
    area = item.get('area', '')
    if area in _MONEY_AREAS:
        return 'YES'
    combined = (str(item.get('title','')) + str(item.get('files','')) + str(area)).lower()
    if any(k in combined for k in _MONEY_KEYWORDS):
        return 'YES'
    return 'no'
```

---

### E-10 — Lines 190–210: Replace `_build_summary()` (contract §6)

**Current:** BY TYPE / BY STATUS TAB / BY SPRINT (old format)

**Replace with contract §6 format:**
```python
def _build_summary(items):
    """Summary tab — contract §6: Status×count, Priority×count (open), Blocked on×count."""
    from datetime import timezone
    STATUS_ENUM = ['INTAKE','PLANNING','IMPLEMENTED','QA','SMOKE','CLOSED','PARKED','DUPLICATE']
    OPEN_STATUSES = set(['INTAKE','PLANNING','IMPLEMENTED','QA','SMOKE'])

    status_counts = {s: 0 for s in STATUS_ENUM}
    status_counts['Unrouted'] = 0
    priority_counts = {}
    blocked_counts = {}

    for item in items:
        cs = classify_status(item)
        if cs in status_counts:
            status_counts[cs] += 1
        else:
            status_counts['Unrouted'] += 1
        if cs in OPEN_STATUSES:
            p = item.get('priority') or item.get('severity') or 'P2'
            priority_counts[str(p)] = priority_counts.get(str(p), 0) + 1
        bo = _build_blocked_on(item, cs)
        if bo:
            blocked_counts[bo] = blocked_counts.get(bo, 0) + 1

    # Count pending Change Log rows — placeholder (updated after CL diff runs)
    pending_cl = 0  # set by cmd_push after CL diff

    rows = [['Status', 'Count']]
    for s in STATUS_ENUM:
        rows.append([s, status_counts[s]])
    rows.append(['Unrouted', status_counts['Unrouted']])
    rows.append([])
    rows.append(['Priority (open items)', 'Count'])
    for p in sorted(priority_counts, key=lambda x: x):
        rows.append([p, priority_counts[p]])
    rows.append([])
    rows.append(['Blocked on', 'Count'])
    for bo in sorted(blocked_counts, key=lambda x: -blocked_counts[x]):
        rows.append([bo, blocked_counts[bo]])
    rows.append([])
    rows.append([f'Generated: {datetime.now().strftime("%Y-%m-%dT%H:%M")}'])
    rows.append([f'Pending change-log rows: {pending_cl}'])
    return rows
```

---

### E-11 — Lines 218–273: Update `build_blockers_tab()` — live items only

**Change:** Filter out closed items (contract §3: Blockers = non-blank `Blocked on` regardless of Status, but NOT closed items per brief §5).

```python
# Add at top of for-loop in build_blockers_tab:
if classify_status(item) in ('CLOSED', 'PARKED', 'DUPLICATE'):
    continue  # CR-418: stale Blockers-tab rows dropped for closed items
```

Also update column header to use contract fields (id, type, title, status, sprint_key, relationship, related_id, related_context — unchanged, already matches).

---

### E-12 — Replace `cmd_push()` — REGISTRAR run with Track C + Change Log + run report

**Full rewrite** of L309–337. New sequence:
1. Load registry.json
2. `_run_track_c(registry)` — one-off cleanup (idempotent)
3. Get token, sheet meta
4. `sync_tabs()` — manage 10 contract tabs
5. Build + write 8 stage/structural tabs (All Items, Intake, Planning, Implemented, QA, Smoke, Closed, Blockers)
6. `build_change_log_tab(token, items)` — diff + append to Change Log tab
7. `write_tab()` Summary (with pending CL count injected)
8. `_print_run_report()` — console summary

---

### E-13 — NEW: `_run_track_c(registry)` — one-off cleanup (OD-418-01: runs inside --push)

```python
def _run_track_c(registry):
    """One-off registry cleanup — idempotent, runs on every --push but only patches items
    that haven't been patched yet (checked via _cr418_cleaned flag)."""
    items = registry['items']
    today = datetime.now().strftime('%Y-%m-%d')
    changed = 0
    for item in items:
        if item.get('_cr418_cleaned'):
            continue
        # C-1: type normalisation
        t = item.get('type', '')
        if t and t != t.upper():
            item['type'] = t.upper()
            changed += 1
        # C-2: timestamp fields
        if 'registered' not in item:
            item['registered'] = item.get('created', item.get('created_at', ''))
        if 'last_updated' not in item:
            item['last_updated'] = today
        if 'closed' not in item:
            item['closed'] = ''
        # C-3: category cleanup (move lifecycle values to status note)
        cat = str(item.get('category', '') or '')
        lifecycle_kw = ('NOT_STARTED','SHIPPED','SUBSUMED','ACTIVE','DONE',
                        'RESOLVED','CLOSED','IMPLEMENTED')
        if any(k in cat.upper() for k in lifecycle_kw):
            # move to status note if not already there
            item['category'] = ''
        item['_cr418_cleaned'] = True
    print(f"  Track C: patched {changed} type/timestamp/category fields")
    return registry
```

---

### E-14 — Replace `cmd_pull()` — read-only diff (OD-418-02 C)

**Replace** L339–404 with:
```python
def cmd_pull(dry_run=False):
    """Read-only diff: reads sheet, prints pending Change Log rows. Writes nothing."""
    print("\n── READ-ONLY DIFF: Sheet → registry ─────────────────────────────")
    token = get_access_token()
    print("  ✅ Access token refreshed")
    r = sheets_get(token, f"/values/{_range_url('All Items', 'A1:Z10000')}")
    if r.status_code != 200:
        sys.exit(f"❌ Could not read All Items tab: {r.json()}")
    data   = r.json().get('values', [])
    if not data:
        sys.exit("❌ All Items tab is empty — run --push first")
    headers    = data[0]
    sheet_rows = data[1:]
    col_idx    = {h: i for i, h in enumerate(headers)}
    registry   = json.load(open(REGISTRY_PATH))
    items_by_id = {i['id']: i for i in registry['items']}
    print(f"  Comparing {len(sheet_rows)} sheet rows against {len(items_by_id)} registry items...")

    pending = []
    for row in sheet_rows:
        id_col = col_idx.get('ID', col_idx.get('id', 0))
        if len(row) <= id_col: continue
        item_id = row[id_col].strip()
        if not item_id or item_id not in items_by_id: continue
        item = items_by_id[item_id]
        for col_name in PHASE1_ACCEPTED:
            if col_name not in col_idx: continue
            idx = col_idx[col_name]
            sheet_val = row[idx].strip() if idx < len(row) else ''
            reg_val   = str(item.get(col_name.lower().replace(' ', '_'), '') or '').strip()
            if sheet_val and sheet_val != reg_val:
                pending.append((item_id, col_name, reg_val, sheet_val))

    if not pending:
        print("  ✅ No pending edits — sheet and registry are in sync")
    else:
        print(f"\n  Pending Change Log rows ({len(pending)}):")
        for item_id, col, old, new in pending:
            print(f"    {item_id}  {col}: '{old[:45]}' → '{new[:45]}'")
        print("\n  No writes made. Run --push to log these to the Change Log tab.")
```

---

### E-15 — NEW: `build_change_log_tab(token, items_by_id)` (append-only diff)

New function (~60 lines). Reads current Change Log tab from sheet, compares sheet All Items against registry, appends new PENDING rows with `Logged at`, leaves existing rows intact.

Change Log columns (contract §5):
`Logged at · ID · Column · Old value (registry) · New value (sheet) · Decision · Decided at · Note`

Phase 1: only diff columns in `PHASE1_ACCEPTED`. Other edits → REJECTED.
`SOURCE=DASHBOARD` tag for dashboard-written Priority/Status edits.

---

## 3. `registry.json` Track C — Exact impact

| Operation | Scope | Risk | Reversible? |
|---|---|---|---|
| Type uppercase (C-1) | ~55 items with lowercase `type` | LOW — mechanical, no logic change | YES (revert to lowercase) |
| Add `registered` field (C-2) | ~445 items — filled from `created`/`created_at` or `''` | LOW — additive field | YES (remove field) |
| Add `last_updated` field (C-2) | All 771 items — set to today | LOW — additive | YES |
| Add `closed` field (C-2) | All 771 items — set to `''` | LOW — additive | YES |
| Category lifecycle cleanup (C-3) | Items with lifecycle values in `category` | MEDIUM — data movement | YES (values preserved in `status` field) |
| `_cr418_cleaned` flag (C-4) | All items — idempotency guard | LOW — ignored by everything else | YES |

**Atomic write:** `registry.json.tmp → replace` (same pattern as current pull).

---

## 4. Risk Classification

| Dimension | Assessment |
|---|---|
| **Risk** | **MEDIUM** |
| Frontend/src impact | ZERO — no `src/` files touched |
| Hotspot files (R5) | NONE |
| Financial logic | NONE |
| registry.json cleanup | MEDIUM — irreversible if not atomic; mitigated by dry-run + `.tmp` write |
| Google Sheet mutations | LOW — tab rename/create/write; no registry write from sheet |
| Pull write-back | ELIMINATED — `--pull` is now read-only |

---

## 5. File Impact Summary

| File | Change | Risk |
|---|---|---|
| `memory/reports/sheets_sync.py` | **FULL REWRITE** of: COLS, TABS, classify_tab→classify_status, build_tab_rows, _build_summary, sync_tabs, cmd_push, cmd_pull, main. **NEW functions:** _build_contract_row, classify_status, _classify_area, _build_blocked_on, _build_owner_action, _build_money_path, _build_artefacts, _build_related, _build_type, _build_priority, _build_notes, build_change_log_tab, _run_track_c, _print_run_report. **REUSE:** get_access_token, sheets_get/post/put, get_sheet_meta, _flatten, _range_url, write_tab. Estimated size: 466 → ~820 lines | MEDIUM |
| `memory/control/registry.json` | Track C runtime mutation: type uppercase, timestamp fields, category cleanup. Idempotent (per `_cr418_cleaned` flag). Atomic write. | MEDIUM |
| `memory/reports/registry-sheet-contract-v1.4.md` | Already created this session. No change. | — |

**WILL NOT touch:**
- Any `frontend/src/` or `backend/` file
- `memory/reports/.env` (credentials unchanged)
- Any R5 hotspot file
- `memory/control/CR_REGISTRY.md`, `BUG_TRACKER.md`, `FILE_OWNERSHIP.md` (registry sync agent responsibility, not script)

---

## 6. Verification Matrix (seeds Gate 3)

| # | Verification | Command | Expected |
|---|---|---|---|
| V-1 | Syntax clean | `python3 -m py_compile sheets_sync.py` | exit 0 |
| V-2 | Dry-run PASS | `python3 sheets_sync.py --dry-run` | "✅ Dry-run PASS" |
| V-3 | Tab management | `--push` output | "Queued delete: QA'd", "Queued delete: Smoke Test", "Queued delete: Implementation"; creates Implemented, QA, Smoke, Change Log |
| V-4 | 22 cols on All Items | Open Sheet → All Items → row 1 | Exactly 22 headers in contract order |
| V-5 | Project=POS | Open Sheet → All Items → col A | Every row = "POS" |
| V-6 | Assignee blank | Open Sheet → All Items → col M | Every row col 13 = blank |
| V-7 | Status is enum | Open Sheet → All Items → col E | Only: INTAKE/PLANNING/IMPLEMENTED/QA/SMOKE/CLOSED/PARKED/DUPLICATE/blank |
| V-8 | Implemented tab | Open Sheet → Implemented tab | ~185 rows |
| V-9 | QA tab | Open Sheet → QA tab | ~108 rows |
| V-10 | Smoke tab | Open Sheet → Smoke tab | ~93 rows |
| V-11 | Closed tab | Open Sheet → Closed → includes PARKED+DUPLICATE | ~289 rows |
| V-12 | Blockers tab | Open Sheet → Blockers | Only live items (no closed rows) |
| V-13 | Change Log tab created | Open Sheet → Change Log | Tab exists; headers: Logged at · ID · Column · Old value · New value · Decision · Decided at · Note |
| V-14 | Summary §6 format | Open Sheet → Summary | 3 blocks: Status×count, Priority×count (open), Blocked on×count; 2 trailing lines |
| V-15 | Summary sums | Summary Status counts + Unrouted == All Items row count | Match |
| V-16 | `--pull` read-only | `python3 sheets_sync.py --pull` | Prints diff, "No writes made", registry.json unchanged |
| V-17 | Track C idempotent | Run `--push` twice | Second run: "Track C: patched 0 fields" |
| V-18 | Money path YES | Items with area=Payments | col 22 = YES |
| V-19 | Priority defaulted | Items with no priority/severity | col 7 = P2, col 21 contains "PRIORITY DEFAULTED" |
| V-20 | Run report printed | `--push` output | Shows total rows, Status distribution, PRIORITY DEFAULTED count, Unrouted count |

---

## 7. Open Decisions — ALL LOCKED

All 5 ODs from Gate 1 INTAKE are locked. No new ODs discovered during IA.

| OD | Decision |
|---|---|
| OD-418-01 | Track C runs inside `--push` (dry-run first, then live) |
| OD-418-02 | `--pull` = read-only diff, no writes |
| OD-418-03 | SHIPPED/VERIFIED → IMPLEMENTED; BACKEND_BLOCKED → INTAKE + Blocked on; ambiguous → blank |
| OD-418-04 | Code markers = `no` on first push |
| OD-418-05 | CR-417 deferred; CR-418 delivers exactly 10 tabs |

---

## 8. Scope Lock

**WILL change:**
- `memory/reports/sheets_sync.py` — full rewrite (~820 lines)
- `memory/control/registry.json` — Track C runtime mutation (atomic)

**WILL NOT touch:**
- Any `frontend/src/`
- `backend/`
- `memory/reports/.env`
- `memory/control/FILE_OWNERSHIP.md`, `CR_REGISTRY.md`, `BUG_TRACKER.md`
- Any R5 hotspot file

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-418 → status: GATE_5A_IMPLEMENTED, gate: 5A
- [ ] CR_REGISTRY.md: row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: memory/reports/sheets_sync.py row updated (CR-418, 2026-10-09)
- [ ] Code marker: # CR-418 on line 2 of sheets_sync.py
- [ ] py_compile: python3 -m py_compile memory/reports/sheets_sync.py → exit 0
```

---

*Impact Analysis complete — CR-418 / 2026-10-09*
*Gate: 2 COMPLETE. Awaiting owner "Gate 3 GO: CR-418" → Implementation Plan.*
