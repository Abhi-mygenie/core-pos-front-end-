# CR-419 — Implementation Plan (Gate 3)

**Item:** CR-419 — sheets_sync.py: Contract v1.5 Compliance Rewrite
**Date:** 2026-10-14
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Stage:** GATE_3_PLAN_COMPLETE
**Author:** PLANNING agent
**Depends on:** `impact/CR-419_IMPACT_ANALYSIS_2026_10_14.md`

---

## Amendment A1 — 2026-10-14 (post-Gate-3, pre-Gate-4-GO)

**OD-419-04 LOCKED:** `--pull` without `--dry-run` is removed as a standalone flag.
Change Log diff+append is folded into `--push` (SHEET PUSH role) as its final step.
Only two agent-callable paths exist:

| CLI | Agent role | What it does |
|---|---|---|
| `--push` | SHEET PUSH | Push all tabs + diff sheet + append Change Log |
| `--pull --dry-run` | SHEET DRIFT | Read-only drift, no writes, no append |

**Impact on Section 14 (`cmd_push`):** add `cmd_diff_log(dry_run=dry_run)` as final call.
**Impact on Section 16 (`main`):** `--pull` without `--dry-run` exits with guidance message.
**No other section changes.**

---

## Scope Lock

### Files WILL change
```
memory/reports/sheets_sync.py   (complete rewrite via create_file overwrite=True)
```

### Files WILL NOT touch
```
memory/reports/.env
memory/control/registry.json          (read-only during push)
memory/control/AGENT_PROMPT_ALPHA.md
frontend/src/   backend/   *.jsx  *.js  *.py (app files)
```

---

## Entry Verification (run before writing)

```bash
python3 -c "
lines = open('/app/memory/reports/sheets_sync.py').readlines()
assert len(lines) == 465, f'Expected 465 lines, got {len(lines)}'
assert 'COLS = [' in lines[38], 'L39 anchor failed'
assert 'PULL_EDITABLE' in lines[46], 'L47 anchor failed'
assert 'def classify_tab' in lines[62], 'L63 anchor failed'
assert 'def cmd_pull' in lines[339], 'L340 anchor failed'
print('Entry verification PASS — file unchanged, safe to rewrite')
"
# Also confirm no contract v1.5 logic exists yet
grep -c 'CONTRACT_COLS\|to_contract_status\|update_all_items_inplace\|cmd_diff_log' \
  /app/memory/reports/sheets_sync.py
# Expected: 0
```

---

## Implementation Approach

**Single operation:** `create_file(path, overwrite=True)` — full file replacement.
Do NOT use `search_replace` on the old file; the scope of change (15 functions,
all logic replaced) makes incremental patching higher-risk than a clean rewrite.

The complete new script is specified section-by-section below.
Implementation agent assembles and writes it as one file.

---

## Complete New Script

### Section 1 — Header + imports (keep from old file, update description)

```python
#!/usr/bin/env python3
# CR-419: sheets_sync.py rewritten for contract v1.5 compliance
# Push: registry.json → Google Sheet (10 tabs, 22-col contract format)
# Diff: sheet human edits → Change Log tab (no direct registry write)
# Auth: OAuth2 with stored refresh token
#
# Usage:
#   python3 sheets_sync.py --dry-run          # validate credentials + sheet
#   python3 sheets_sync.py --push             # registry.json → all tabs
#   python3 sheets_sync.py --pull --dry-run   # show drift (no writes)
#   python3 sheets_sync.py --pull             # append human edits → Change Log

import json, os, sys, re, argparse, time, subprocess
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    sys.exit("Run: pip install requests python-dotenv")
```

---

### Section 2 — Paths + credentials (keep from old file)

```python
SCRIPT_DIR    = Path(__file__).parent
ENV_PATH      = SCRIPT_DIR / '.env'
REGISTRY_PATH = SCRIPT_DIR.parent / 'control' / 'registry.json'

load_dotenv(ENV_PATH)

CLIENT_ID     = os.getenv('GOOGLE_OAUTH_CLIENT_ID',    '').strip().strip('"').strip("'")
CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET','').strip().strip('"').strip("'")
REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN',      '').strip().strip('"').strip("'")
_raw_id       = os.getenv('GOOGLE_SHEET_ID',           '').strip().strip('"').strip("'")
SHEET_ID      = _raw_id.split('/')[0]
```

---

### Section 3 — Contract constants (P1 — replaces COLS, PULL_EDITABLE, TABS, _OBSOLETE_TABS)

```python
# ── Contract v1.5 columns — 22 cols (A–V), col W = Release week (owner-only) ──
CONTRACT_COLS = [
    'Project', 'ID', 'Type', 'Title', 'Status', 'Status note',
    'Priority', 'Risk', 'Area', 'Sprint', 'Blocked on', 'Owner action',
    'Assignee', 'Registered', 'Last updated', 'Closed',
    'Related', 'Artefacts', 'Code markers', 'Files', 'Notes', 'Money path',
]

# ── Tabs — contract §2 order, exact names ──
TABS = [
    'All Items', 'Intake', 'Planning', 'Implemented', 'QA',
    'Smoke', 'Closed', 'Blockers', 'Change Log', 'Summary',
]

# ── Tabs to delete if present (wrong names from pre-contract push) ──
_OBSOLETE_TABS = [
    'Implementation', "QA'd", 'Smoke Test',   # created by today's bad push
    'Open Only', 'QA / Smoke', 'Blocked / Parked',  # legacy v1 names
]

# ── POS area list (brief §3) ──
POS_AREAS = {
    'Printing', 'Reports', 'Inventory', 'Menu Management', 'Payments',
    'PMS Check-In', 'PMS Bookings', 'PMS Folio', 'CRM', 'Settings',
    'Auth / Permissions', 'Smart Purchase', 'Sidebar / Nav', 'Sockets',
    'Order Entry', 'Dashboard', 'Expense', 'Tooling',
}

# ── Change Log columns ──
CL_COLS = [
    'Logged at', 'ID', 'Column', 'Old value (registry)',
    'New value (sheet)', 'Decision', 'Decided at', 'Note',
]

# ── Money path keywords (title / area heuristic) ──
_MONEY_KEYWORDS = {
    'payment', 'billing', 'folio', 'settlement', 'tax', 'gst', 'vat',
    'discount', 'coupon', 'wallet', 'invoice', 'charge', 'receipt',
}
_MONEY_AREAS = {'Payments', 'PMS Folio', 'Smart Purchase'}

# ── Phase 1 columns accepted from sheet → Change Log (contract §5) ──
_PHASE1_ACCEPTED = {'Status', 'Registered', 'Closed'}
```

---

### Section 4 — Status normalisation (P2 — replaces classify_tab)

```python
# ── Contract status enum → stage tab name ──
_STATUS_TO_TAB = {
    'INTAKE': 'Intake', 'PLANNING': 'Planning', 'IMPLEMENTED': 'Implemented',
    'QA': 'QA', 'SMOKE': 'Smoke',
    'CLOSED': 'Closed', 'PARKED': 'Closed', 'DUPLICATE': 'Closed',
}

def to_contract_status(raw):
    """Map raw registry status string → (contract_status, blocked_party).

    blocked_party is non-empty only when the raw string indicates a blocker,
    e.g. 'GATE_3_PLAN_COMPLETE — BACKEND-BLOCKED' → ('PLANNING', 'BACKEND').
    """
    s = str(raw).upper()

    # Detect blocker suffix first (does not change the stage)
    blocked = ''
    if 'BACKEND-BLOCKED' in s or 'BACKEND_BLOCKED' in s:
        blocked = 'BACKEND'
    elif 'CRM-BLOCKED' in s or 'CRM_BLOCKED' in s:
        blocked = 'CRM'
    elif 'OWNER-BLOCKED' in s:
        blocked = 'OWNER'

    # DUPLICATE
    if 'DUPLICATE' in s or 'CLOSED_DUPLICATE' in s:
        return 'DUPLICATE', ''

    # CLOSED (must come before PARKED/DEFERRED to catch "CLOSED — PARKED" variants)
    if any(k in s for k in [
        'CLOSED', 'OWNER VERIFIED', 'OWNER_VERIFIED', 'SUBSUMED', 'RETIRED',
        'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN', 'BACKEND_FIXED',
        'COULD NOT REPRODUCE', 'CANNOT REPRODUCE', 'NOT REPRODUCIBLE',
    ]):
        return 'CLOSED', ''

    # PARKED — deliberate stop, not a blocker
    if 'PARKED' in s or 'DEFERRED' in s:
        return 'PARKED', ''

    # SMOKE — awaiting owner smoke test
    if any(k in s for k in [
        'AWAITING OWNER SMOKE', 'AWAITING_OWNER_SMOKE',
        'GATE_6', 'OWNER SMOKE', 'OWNER_SMOKE',
        'OWNER VERIFIED PENDING', 'GATE 6',
    ]):
        return 'SMOKE', blocked

    # QA — gate 5b passed, not yet smoke
    if any(k in s for k in [
        'GATE_5B', 'GATE 5B', 'QA PASS', 'QA_PASS',
        'GATE_5B_QA', 'CONDITIONAL_PASS',
    ]):
        return 'QA', blocked

    # IMPLEMENTED — gate 4 / gate 5a
    if any(k in s for k in [
        'GATE_4', 'GATE 4', 'GATE_5A', 'GATE 5A',
        'IMPLEMENTED', 'GATE_4_GO',
    ]):
        return 'IMPLEMENTED', blocked

    # PLANNING — gate 2 / gate 3
    if any(k in s for k in [
        'GATE_2', 'GATE 2', 'GATE_3', 'GATE 3',
        'IMPACT_ANALYSIS', 'PLAN_COMPLETE', 'PLAN COMPLETE',
        'GATE_2_CLOSED', 'GATE_3_PLAN',
    ]):
        return 'PLANNING', blocked

    # INTAKE — gate 1 / not started
    if any(k in s for k in [
        'GATE_1', 'GATE 1', 'INTAKE', 'NOT STARTED', 'NOT_STARTED',
        'REGISTERED',
    ]):
        return 'INTAKE', blocked

    # Blank / unrouted (back-catalogue interim — contract §4)
    if not s.strip():
        return '', ''

    # Unclassifiable → INTAKE + flag for Status note
    return 'UNCLASSIFIED', blocked


def stage_tab(contract_status):
    """Map contract Status to its stage tab name. Returns None for All Items only."""
    return _STATUS_TO_TAB.get(contract_status)
```

---

### Section 5 — Field helpers (P2 + P5)

```python
def normalise_area(raw):
    """Map free-text area to POS area list. Returns blank if unrecognised."""
    if not raw:
        return ''
    r = str(raw).strip()
    # Exact match first
    if r in POS_AREAS:
        return r
    # Case-insensitive
    rl = r.lower()
    for area in POS_AREAS:
        if area.lower() == rl:
            return area
    # Common aliases
    _aliases = {
        'order entry': 'Order Entry', 'order-entry': 'Order Entry',
        'dashboard': 'Dashboard', 'pms': 'PMS Check-In',
        'pms folio': 'PMS Folio', 'pms checkin': 'PMS Check-In',
        'pms bookings': 'PMS Bookings', 'pms check in': 'PMS Check-In',
        'auth': 'Auth / Permissions', 'permissions': 'Auth / Permissions',
        'auth/permissions': 'Auth / Permissions',
        'sidebar': 'Sidebar / Nav', 'nav': 'Sidebar / Nav',
        'menu': 'Menu Management', 'menu management': 'Menu Management',
        'smart purchase': 'Smart Purchase', 'inventory': 'Inventory',
        'reports': 'Reports', 'printing': 'Printing', 'print': 'Printing',
        'sockets': 'Sockets', 'socket': 'Sockets',
        'settings': 'Settings', 'crm': 'CRM', 'expense': 'Expense',
        'tooling': 'Tooling', 'payments': 'Payments', 'payment': 'Payments',
    }
    return _aliases.get(rl, '')


def compute_artefacts(item):
    """Return comma-joined artefact names for present doc fields."""
    parts = []
    if item.get('intake_doc'):
        parts.append('INTAKE')
    if item.get('impact_doc') or item.get('impact_analysis') or item.get('impact_analysis_doc'):
        parts.append('IMPACT_ANALYSIS')
    if item.get('plan_doc') or item.get('implementation_plan') or item.get('implementation_plan_doc'):
        parts.append('IMPLEMENTATION_PLAN')
    if item.get('qa_report') or item.get('qa_handover_doc') or item.get('qa_handover'):
        parts.append('QA_HANDOVER')
    if item.get('qa_report') and 'QA_REPORT' not in parts:
        parts.append('QA_REPORT')
    return ', '.join(parts)


def compute_money_path(item):
    """YES if item touches payment/billing/folio/settlement areas or keywords."""
    area = normalise_area(item.get('area', ''))
    if area in _MONEY_AREAS:
        return 'YES'
    title = str(item.get('title', '')).lower()
    if any(kw in title for kw in _MONEY_KEYWORDS):
        return 'YES'
    files = str(item.get('files', '')).lower()
    if any(kw in files for kw in ['collectpayment', 'folio', 'ordertransform', 'pmsservice']):
        return 'YES'
    return 'no'


def compute_code_markers(item_id):
    """YES if a CR-/BUG- ID marker for this item exists in frontend/src/ or backend/."""
    try:
        src_dir = SCRIPT_DIR.parent.parent / 'frontend' / 'src'
        be_dir  = SCRIPT_DIR.parent.parent / 'backend'
        pattern = item_id  # e.g. "CR-419" or "BUG-540"
        for search_dir in [src_dir, be_dir]:
            if not search_dir.exists():
                continue
            result = subprocess.run(
                ['grep', '-rl', pattern, str(search_dir)],
                capture_output=True, text=True, timeout=10,
            )
            if result.stdout.strip():
                return 'YES'
    except Exception:
        pass
    return 'no'


def compute_registered(item):
    """Return first non-blank date from common date fields. YYYY-MM-DD or blank."""
    for field in ('registered', 'created', 'created_at', 'intake_date', 'date',
                  'registered_at', 'created_date', 'registered_date'):
        val = str(item.get(field, '') or '').strip()
        if val:
            # Normalise to YYYY-MM-DD if possible
            val = val[:10]  # take first 10 chars (handles ISO datetime)
            if re.match(r'\d{4}-\d{2}-\d{2}', val):
                return val
    return ''


def _flatten(v):
    if isinstance(v, list):
        return ', '.join(str(x) for x in v if x)
    if isinstance(v, dict):
        return ''
    return str(v).strip() if v is not None else ''
```

---

### Section 6 — Row builder (P1 + P2 + P5)

```python
def to_contract_row(item):
    """Build a 22-element list for one registry item. Never includes col W."""
    # Status + blocked
    raw_status = str(item.get('status', '') or '')
    contract_status, blocked_party = to_contract_status(raw_status)

    # Status note = full raw status + gate detail
    status_note_parts = [raw_status]
    for extra in ('current_gate', 'phase', 'qa_result'):
        val = item.get(extra, '')
        if val:
            status_note_parts.append(str(val))
    status_note = ' | '.join(p for p in status_note_parts if p)
    if contract_status == 'UNCLASSIFIED':
        status_note = f'UNCLASSIFIED: {raw_status}'
        contract_status = 'INTAKE'

    # Priority
    notes_append = ''
    priority = str(item.get('priority', '') or '').strip().upper()
    if priority not in ('P0', 'P1', 'P2', 'P3'):
        # Try severity
        severity = str(item.get('severity', '') or '').strip().upper()
        _sev_map = {'CRITICAL': 'P0', 'HIGH': 'P1', 'MEDIUM': 'P2', 'LOW': 'P3',
                    'P0': 'P0', 'P1': 'P1', 'P2': 'P2', 'P3': 'P3'}
        priority = _sev_map.get(severity, '')
        if not priority:
            priority = 'P2'
            notes_append = 'PRIORITY DEFAULTED'

    # Risk
    risk = str(item.get('risk', '') or '').strip().upper()
    if risk not in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'):
        risk = ''

    # Area
    area = normalise_area(item.get('area', ''))

    # Blocked on (from registry field; cleared for CLOSED items)
    blocked_on = ''
    if contract_status not in ('CLOSED', 'PARKED', 'DUPLICATE'):
        blocked_on = (
            item.get('blocked_by', '')
            or blocked_party
            or ''
        )
        blocked_on = str(blocked_on).strip()

    # Owner action
    owner_action = ''
    if contract_status == 'SMOKE':
        owner_action = f"Smoke test: {item.get('title','')}"[:100]
    elif blocked_on == 'OWNER':
        owner_action = 'Decision needed'

    # Dates
    registered   = compute_registered(item)
    last_updated = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    closed       = ''
    if contract_status in ('CLOSED', 'PARKED', 'DUPLICATE'):
        closed = str(
            item.get('closed_at') or item.get('implemented_date') or
            item.get('closed_date') or item.get('implemented_at') or ''
        ).strip()[:10]

    # Related
    related_ids = []
    rel = item.get('related')
    if rel:
        related_ids += [str(x).strip() for x in (rel if isinstance(rel, list) else [rel])]
    dep = item.get('depends_on')
    if dep:
        related_ids += [str(x).strip() for x in (dep if isinstance(dep, list) else [dep])]
    related = ', '.join(r for r in related_ids if r)

    # Artefacts
    artefacts = compute_artefacts(item)

    # Code markers
    code_markers = compute_code_markers(item['id'])

    # Files
    files = _flatten(item.get('files', ''))

    # Notes
    notes_base = str(item.get('notes', '') or '').strip()
    notes = (notes_base + (' | ' if notes_base and notes_append else '') + notes_append).strip()

    # Money path
    money_path = compute_money_path(item)

    return [
        'POS',                          # 1  Project
        item['id'],                     # 2  ID
        str(item.get('type', '') or '').upper() or '',  # 3 Type
        str(item.get('title', '') or '')[:500],         # 4 Title
        contract_status,                # 5  Status
        status_note[:500],              # 6  Status note
        priority,                       # 7  Priority
        risk,                           # 8  Risk
        area,                           # 9  Area
        str(item.get('sprint_key', '') or ''),          # 10 Sprint
        blocked_on[:200],               # 11 Blocked on
        owner_action,                   # 12 Owner action
        '',                             # 13 Assignee — NEVER written by agent
        registered,                     # 14 Registered
        last_updated,                   # 15 Last updated
        closed,                         # 16 Closed
        related[:200],                  # 17 Related
        artefacts,                      # 18 Artefacts
        code_markers,                   # 19 Code markers
        files[:300],                    # 20 Files
        notes[:500],                    # 21 Notes
        money_path,                     # 22 Money path
    ]
```

---

### Section 7 — Tab row builders

```python
def build_all_items_rows(items):
    """Header + 22-col row per item. Used by update_all_items_inplace."""
    rows = [CONTRACT_COLS]
    for item in items:
        rows.append(to_contract_row(item))
    return rows


def build_stage_tab_rows(items, tab_name):
    """Filter by stage tab. Assignee always blank on stage tabs (already blank from to_contract_row)."""
    subset = [i for i in items
              if stage_tab(to_contract_status(i.get('status', ''))[0]) == tab_name]
    rows = [CONTRACT_COLS]
    for item in subset:
        rows.append(to_contract_row(item))
    return rows


def build_blockers_rows(items):
    """Filtered view: items where Blocked on is non-blank, any Status."""
    rows = [CONTRACT_COLS]
    for item in items:
        row = to_contract_row(item)
        blocked_on_val = row[10]  # col index 10 = Blocked on
        if blocked_on_val.strip():
            rows.append(row)
    return rows
```

---

### Section 8 — Summary builder (P5 — contract §6)

```python
def build_summary_rows(items, pending_cl_count=0):
    """Contract §6: Status×count + Priority×count (open only) + Blocked on×count."""
    STATUS_ENUM = ['INTAKE','PLANNING','IMPLEMENTED','QA','SMOKE',
                   'CLOSED','PARKED','DUPLICATE']

    status_counts  = {s: 0 for s in STATUS_ENUM}
    status_counts['Unrouted'] = 0
    priority_counts = {'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0}
    blocked_counts  = Counter()
    open_statuses   = {'INTAKE','PLANNING','IMPLEMENTED','QA','SMOKE'}

    for item in items:
        cs, blocked_party = to_contract_status(item.get('status', ''))
        if cs == 'UNCLASSIFIED':
            cs = 'INTAKE'
        if cs in status_counts:
            status_counts[cs] += 1
        elif cs == '':
            status_counts['Unrouted'] += 1
        else:
            status_counts['Unrouted'] += 1

        if cs in open_statuses:
            row = to_contract_row(item)
            p = row[6]  # Priority col
            if p in priority_counts:
                priority_counts[p] += 1

        row = to_contract_row(item)
        b = row[10].strip()  # Blocked on
        if b:
            blocked_counts[b] += 1

    rows = [
        ['Status', 'Count'],
        *[[s, status_counts.get(s, 0)] for s in STATUS_ENUM],
        ['Unrouted', status_counts['Unrouted']],
        [],
        ['Priority (open items)', 'Count'],
        *[[p, priority_counts[p]] for p in ['P0','P1','P2','P3']],
        [],
        ['Blocked on', 'Count'],
        *[[b, c] for b, c in sorted(blocked_counts.items(), key=lambda x: -x[1])],
        [],
        [f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}', ''],
        [f'Pending change-log rows: {pending_cl_count}', ''],
    ]
    return rows
```

---

### Section 9 — OAuth2 + API helpers (unchanged from old file — copy verbatim)

Copy the following functions exactly from the current file (no changes):
- `get_access_token()` (L87–101)
- `_headers()` (L104–106)
- `sheets_get()` (L107–112)
- `sheets_post()` (L113–118)
- `sheets_put()` (L119–124)
- `get_sheet_meta()` (L125–132)
- `_range_url()` (L212–215)

---

### Section 10 — Tab management (P4 — updates sync_tabs)

```python
def sync_tabs(token, meta, dry_run=False):
    """Delete obsolete tabs; create any missing contract tabs."""
    existing = {s['properties']['title']: s['properties']['sheetId']
                for s in meta.get('sheets', [])}
    reqs = []

    for old_tab in _OBSOLETE_TABS:
        if old_tab in existing:
            reqs.append({'deleteSheet': {'sheetId': existing[old_tab]}})
            print(f"  🗑  Queued delete: {old_tab}")

    for tab in TABS:
        if tab not in existing:
            reqs.append({'addSheet': {'properties': {'title': tab}}})
            print(f"  ➕ Queued create: {tab}")

    if not reqs:
        print("  ✅ Tabs already in correct state")
        return

    if dry_run:
        print(f"  [dry-run] Would apply {len(reqs)} tab operation(s)")
        return

    r = sheets_post(token, ':batchUpdate', {'requests': reqs})
    if r.status_code != 200:
        sys.exit(f"❌ Tab management failed: {r.json()}")
    print(f"  ✅ Tab management done ({len(reqs)} operation(s))")
```

---

### Section 11 — Tab writer for stage tabs (unchanged logic, keep for non-All-Items tabs)

```python
def write_tab(token, tab_name, rows, dry_run=False):
    """Clear a stage/summary tab then write rows (A–V range only)."""
    # For stage tabs, clear only A:V (not W+) to be safe
    enc_clear = _range_url(tab_name, 'A1:V10000')
    enc_write = _range_url(tab_name, 'A1')

    if dry_run:
        data_rows = len(rows) - 1 if rows else 0
        print(f"  [dry-run] {tab_name}: would write {data_rows} data row(s)")
        return

    r = sheets_post(token, f'/values/{enc_clear}:clear', {})
    if r.status_code not in (200, 204):
        print(f"  ⚠  Clear warning for '{tab_name}': {r.status_code}")
    time.sleep(0.3)

    r = sheets_put(token, f'/values/{enc_write}',
                   {'values': rows}, valueInputOption='RAW')
    if r.status_code != 200:
        try:
            msg = r.json().get('error', {}).get('message', r.text[:120])
        except Exception:
            msg = r.text[:120]
        print(f"  ⚠  Write failed for '{tab_name}': {msg}")
    else:
        data_rows = len(rows) - 1 if len(rows) > 1 else 0
        print(f"  ✅ {tab_name:<22} {data_rows:>4} data row(s)")
    time.sleep(0.3)
```

---

### Section 12 — All Items in-place updater (P3 — new function, highest-risk)

```python
def update_all_items_inplace(token, items, dry_run=False):
    """Update All Items tab in-place by ID. Never clears. Never writes col W+.

    Strategy:
    1. Read current A1:V (22 cols — skip W entirely)
    2. Build id → row_number map (ID is col B = index 1)
    3. For each registry item: update matched row OR queue as append
    4. Batch-update matched rows; batch-append new rows
    """
    enc_read = _range_url('All Items', 'A1:V10000')
    r = sheets_get(token, f'/values/{enc_read}')
    if r.status_code != 200:
        print(f"  ⚠  Could not read All Items for in-place update: {r.status_code}")
        return

    existing_data = r.json().get('values', [])

    # Build ID → sheet row index map (1-indexed for Sheets API)
    # ID is CONTRACT_COLS[1] = col B = index 1 in the row
    id_to_row = {}
    for row_idx, row in enumerate(existing_data):
        if row_idx == 0:
            continue  # skip header
        if len(row) > 1 and row[1]:
            id_to_row[row[1].strip()] = row_idx + 1  # 1-indexed

    update_data = []   # batchUpdate valueRanges
    append_rows = []   # rows not found in sheet → append

    for item in items:
        contract_row = to_contract_row(item)
        item_id = item['id']
        if item_id in id_to_row:
            sheet_row_num = id_to_row[item_id]
            enc_range = _range_url('All Items', f'A{sheet_row_num}:V{sheet_row_num}')
            update_data.append({
                'range': f"'All Items'!A{sheet_row_num}:V{sheet_row_num}",
                'values': [contract_row],
            })
        else:
            append_rows.append(contract_row)

    if dry_run:
        print(f"  [dry-run] All Items: {len(update_data)} in-place updates, "
              f"{len(append_rows)} new rows to append")
        return

    # Write header if sheet is empty
    if not existing_data:
        enc_header = _range_url('All Items', 'A1')
        sheets_put(token, f'/values/{enc_header}',
                   {'values': [CONTRACT_COLS]}, valueInputOption='RAW')
        print("  ✅ All Items header written (was empty)")
        time.sleep(0.3)

    # Batch update existing rows (max 1000 per request)
    BATCH = 500
    updated_count = 0
    for i in range(0, len(update_data), BATCH):
        chunk = update_data[i:i+BATCH]
        r = sheets_put(token, '/values:batchUpdate',
                       {'valueInputOption': 'RAW', 'data': chunk})
        if r.status_code != 200:
            print(f"  ⚠  Batch update error: {r.json().get('error',{}).get('message','')}")
        else:
            updated_count += len(chunk)
        time.sleep(0.5)

    # Append new rows
    if append_rows:
        enc_append = _range_url('All Items', 'A1')
        r = requests.post(
            f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}'
            f'/values/{enc_append}:append',
            headers=_headers(token),
            json={'values': append_rows},
            params={'valueInputOption': 'RAW', 'insertDataOption': 'INSERT_ROWS'},
            timeout=30,
        )
        if r.status_code != 200:
            print(f"  ⚠  Append error: {r.json().get('error',{}).get('message','')}")
        else:
            print(f"  ✅ All Items  {updated_count:>4} updated + {len(append_rows)} appended")
        time.sleep(0.3)
    else:
        print(f"  ✅ All Items  {updated_count:>4} updated, 0 appended")
```

---

### Section 13 — Change Log helpers (P4 — new)

```python
def get_pending_cl_count(token):
    """Count rows in Change Log with Decision = PENDING."""
    enc = _range_url('Change Log', 'A1:H2000')
    r = sheets_get(token, f'/values/{enc}')
    if r.status_code != 200:
        return 0
    rows = r.json().get('values', [])
    if not rows:
        return 0
    # Decision is col F (index 5)
    return sum(1 for row in rows[1:] if len(row) > 5 and row[5].strip() == 'PENDING')


def ensure_change_log_header(token, dry_run=False):
    """Write Change Log header if the tab is empty."""
    enc = _range_url('Change Log', 'A1:H1')
    r = sheets_get(token, f'/values/{enc}')
    existing = r.json().get('values', []) if r.status_code == 200 else []
    if not existing or not existing[0]:
        if not dry_run:
            enc_write = _range_url('Change Log', 'A1')
            sheets_put(token, f'/values/{enc_write}',
                       {'values': [CL_COLS]}, valueInputOption='RAW')
            print("  ✅ Change Log header written")


def append_to_change_log(token, cl_rows, dry_run=False):
    """Append rows to Change Log. Never clears existing rows."""
    if not cl_rows:
        return
    enc = _range_url('Change Log', 'A1')
    if dry_run:
        print(f"  [dry-run] Change Log: would append {len(cl_rows)} row(s)")
        return
    r = requests.post(
        f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}'
        f'/values/{enc}:append',
        headers=_headers(token),
        json={'values': cl_rows},
        params={'valueInputOption': 'RAW', 'insertDataOption': 'INSERT_ROWS'},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"  ⚠  Change Log append error: {r.json().get('error',{}).get('message','')}")
    else:
        print(f"  ✅ Change Log  {len(cl_rows):>4} row(s) appended")
    time.sleep(0.3)
```

---

### Section 14 — cmd_push (P1–P5 updated)

```python
def cmd_push(dry_run=False):
    print("\n── PUSH: registry.json → Google Sheets (contract v1.5) " + "─" * 20)

    registry = json.load(open(REGISTRY_PATH))
    items    = registry['items']
    print(f"  Loaded {len(items)} items from registry.json")

    token = get_access_token()
    print("  ✅ Access token refreshed")

    meta = get_sheet_meta(token)
    print(f"  Sheet: {meta['properties']['title']}")
    sync_tabs(token, meta, dry_run)

    if not dry_run:
        time.sleep(1)
        token = get_access_token()

    # All Items — in-place (never clear, never touch col W)
    update_all_items_inplace(token, items, dry_run)

    # Stage tabs — clear + write (derived views, no owner data)
    for tab in ('Intake', 'Planning', 'Implemented', 'QA', 'Smoke', 'Closed'):
        rows = build_stage_tab_rows(items, tab)
        write_tab(token, tab, rows, dry_run)

    # Blockers tab — filtered view
    write_tab(token, 'Blockers', build_blockers_rows(items), dry_run)

    # Change Log — NEVER written by push. Ensure header exists only.
    ensure_change_log_header(token, dry_run)

    # Summary
    pending = get_pending_cl_count(token) if not dry_run else 0
    write_tab(token, 'Summary', build_summary_rows(items, pending), dry_run)

    # Run report
    _print_run_report(items, dry_run)

    # ── Amendment A1 (OD-419-04): diff + Change Log append runs here ──
    # Contract §5 REGISTRAR: push and diff happen in the same step.
    # --push always ends with a diff so any CTO edits since the last push
    # are captured before the owner sees the session summary.
    print("\n── POST-PUSH DIFF (contract §5 REGISTRAR) " + "─" * 30)
    cmd_diff_log(dry_run=dry_run)


def _print_run_report(items, dry_run):
    label = "(dry-run) " if dry_run else ""
    status_counts = Counter()
    unclassified_ids = []
    defaulted_ids    = []
    no_registered    = []

    for item in items:
        cs, _ = to_contract_status(item.get('status', ''))
        if cs == 'UNCLASSIFIED':
            status_counts['INTAKE'] += 1
            unclassified_ids.append(item['id'])
        elif cs:
            status_counts[cs] += 1
        else:
            status_counts['Unrouted'] += 1

        p = str(item.get('priority', '') or '').strip().upper()
        sev = str(item.get('severity', '') or '').strip().upper()
        _sev_map = {'CRITICAL':'P0','HIGH':'P1','MEDIUM':'P2','LOW':'P3',
                    'P0':'P0','P1':'P1','P2':'P2','P3':'P3'}
        if p not in ('P0','P1','P2','P3') and _sev_map.get(sev,'') == '':
            defaulted_ids.append(item['id'])

        if not compute_registered(item):
            no_registered.append(item['id'])

    print(f"\n  ── Run report {label}──")
    print(f"  Total rows:       {len(items)}")
    print(f"  Status distribution:")
    for s in ['INTAKE','PLANNING','IMPLEMENTED','QA','SMOKE','CLOSED','PARKED','DUPLICATE','Unrouted']:
        c = status_counts.get(s, 0)
        if c:
            print(f"    {s:<14} {c:>4}")
    print(f"  UNCLASSIFIED:     {len(unclassified_ids)} (target: 0)"
          + (f"  → {unclassified_ids[:5]}{'…' if len(unclassified_ids)>5 else ''}"
             if unclassified_ids else ""))
    print(f"  PRIORITY DEFAULT: {len(defaulted_ids)}")
    print(f"  No Registered:    {len(no_registered)}")
```

---

### Section 15 — cmd_diff_log — replaces cmd_pull (P4)

```python
def cmd_diff_log(dry_run=False):
    """Read sheet, diff against registry, append human edits to Change Log.
    Never writes to registry.json. --pull --dry-run shows diff only.
    """
    print("\n── DIFF + LOG: sheet → Change Log " + "─" * 38)

    token = get_access_token()
    print("  ✅ Access token refreshed")

    # Read All Items A:V (skip W — excluded from diff §5.6)
    enc = _range_url('All Items', 'A1:V10000')
    r = sheets_get(token, f'/values/{enc}')
    if r.status_code != 200:
        sys.exit(f"❌ Could not read All Items: "
                 f"{r.json().get('error',{}).get('message', r.text)}")

    data = r.json().get('values', [])
    if not data:
        sys.exit("❌ All Items is empty — run --push first")

    headers    = data[0]
    sheet_rows = data[1:]
    col_idx    = {h: i for i, h in enumerate(headers)}
    print(f"  Read {len(sheet_rows)} data row(s) from All Items (cols A–V)")

    id_col = col_idx.get('ID', 1)

    # Load registry
    registry    = json.load(open(REGISTRY_PATH))
    items_by_id = {i['id']: i for i in registry['items']}

    now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    cl_rows = []

    for row in sheet_rows:
        if len(row) <= id_col:
            continue
        item_id = row[id_col].strip() if id_col < len(row) else ''
        if not item_id:
            continue
        if item_id not in items_by_id:
            # Owner-added row not in registry — skip, do not log
            continue

        item = items_by_id[item_id]
        contract_row = to_contract_row(item)

        for col_name in _PHASE1_ACCEPTED:
            if col_name not in col_idx:
                continue
            sheet_col_idx = col_idx[col_name]
            sheet_val = row[sheet_col_idx].strip() if sheet_col_idx < len(row) else ''
            reg_val   = contract_row[CONTRACT_COLS.index(col_name)]

            if sheet_val and sheet_val != str(reg_val).strip():
                cl_rows.append([
                    now_str,           # Logged at
                    item_id,           # ID
                    col_name,          # Column
                    str(reg_val),      # Old value (registry)
                    sheet_val,         # New value (sheet)
                    'PENDING',         # Decision
                    '',                # Decided at
                    '',                # Note
                ])

    if not cl_rows:
        print("  ✅ No drift detected — sheet matches registry for Phase 1 columns")
        return

    print(f"\n  Changes detected ({len(cl_rows)}):")
    for row in cl_rows[:10]:
        print(f"    {row[1]}.{row[2]}: '{str(row[3])[:30]}' → '{str(row[4])[:30]}'")
    if len(cl_rows) > 10:
        print(f"    … and {len(cl_rows)-10} more")

    ensure_change_log_header(token, dry_run)
    append_to_change_log(token, cl_rows, dry_run)

    if dry_run:
        print(f"\n  [dry-run] {len(cl_rows)} change(s) found. No writes made.")
    else:
        print(f"\n  ✅ DIFF COMPLETE. {len(cl_rows)} change(s) logged to Change Log.")
        print("     Present to owner for approval before applying to registry.")
```

---

### Section 16 — main() (updated)

```python
def main():
    parser = argparse.ArgumentParser(
        description='CR-419: MyGenie POS — Google Sheets Contract v1.5 Sync',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            'Examples:\n'
            '  python3 sheets_sync.py --dry-run            # validate only\n'
            '  python3 sheets_sync.py --push               # registry → Sheet\n'
            '  python3 sheets_sync.py --pull --dry-run     # show drift (SHEET DRIFT role)\n'
            '  python3 sheets_sync.py --pull               # append drift → Change Log\n'
        ),
    )
    parser.add_argument('--push',    action='store_true', help='Push registry → Sheet')
    parser.add_argument('--pull',    action='store_true', help='Diff sheet → Change Log')
    parser.add_argument('--dry-run', action='store_true', dest='dry_run',
                        help='Validate / show diff only — no writes')
    args = parser.parse_args()

    if not any([args.push, args.pull, args.dry_run]):
        parser.print_help()
        sys.exit(0)

    missing = [name for name, val in [
        ('GOOGLE_OAUTH_CLIENT_ID',     CLIENT_ID),
        ('GOOGLE_OAUTH_CLIENT_SECRET', CLIENT_SECRET),
        ('GOOGLE_REFRESH_TOKEN',       REFRESH_TOKEN),
        ('GOOGLE_SHEET_ID',            SHEET_ID),
    ] if not val]
    if missing:
        sys.exit(f"❌ Missing env var(s) in {ENV_PATH}: {', '.join(missing)}")

    print(f"Sheet ID : {SHEET_ID}")
    print(f"Registry : {REGISTRY_PATH}")
    print(f"Dry-run  : {args.dry_run}")

    if args.dry_run and not args.push and not args.pull:
        print("\n── DRY-RUN: validating credentials + sheet ──────────────────────")
        token = get_access_token()
        print("✅ Access token refreshed")
        meta = get_sheet_meta(token)
        print(f"✅ Sheet: '{meta['properties']['title']}'")
        tabs = [s['properties']['title'] for s in meta.get('sheets', [])]
        print(f"   Tabs ({len(tabs)}): {tabs}")
        registry = json.load(open(REGISTRY_PATH))
        print(f"✅ registry.json: {len(registry['items'])} items")
        print("\n✅ Dry-run PASS")
        return

    if args.push:
        cmd_push(dry_run=args.dry_run)

    if args.pull:
        if not args.dry_run:
            # Amendment A1 (OD-419-04): --pull alone is not an agent role.
            # Change Log append runs automatically inside --push (SHEET PUSH role).
            # SHEET DRIFT role always uses --pull --dry-run.
            sys.exit(
                "❌ --pull requires --dry-run (SHEET DRIFT role: read-only drift).\n"
                "   Change Log append runs automatically at the end of --push (SHEET PUSH role)."
            )
        cmd_diff_log(dry_run=True)


if __name__ == '__main__':
    main()
```

---

## Execution Sequence

1. Run Entry Verification (4 greps above) — confirm PASS
2. Write the complete new file using `create_file(overwrite=True)`
   - Assemble all 16 sections in order
   - Total estimated size: ~450 lines
3. `python3 -m py_compile memory/reports/sheets_sync.py` → must exit 0
4. `cd /app && python3 memory/reports/sheets_sync.py --dry-run` → must print "Dry-run PASS"
5. Run Verification Matrix (V1–V6)
6. Execute EXIT GATE (4 checkboxes)

---

## Verification Matrix

| # | What | Command | Expected |
|---|---|---|---|
| V1 | CONTRACT_COLS present, 22 values | `python3 -c "from sheets_sync import CONTRACT_COLS; assert len(CONTRACT_COLS)==22; print('V1 PASS')"` | `V1 PASS` |
| V2 | TABS correct names + count | `python3 -c "from sheets_sync import TABS; assert 'Implemented' in TABS and 'Change Log' in TABS and len(TABS)==10; print('V2 PASS')"` | `V2 PASS` |
| V3 | to_contract_status covers all 8 enums | `python3 -c "from sheets_sync import to_contract_status; cases=[('GATE_5A_IMPLEMENTED','IMPLEMENTED'),('GATE_1_INTAKE','INTAKE'),('QA PASS — AWAITING OWNER SMOKE','SMOKE'),('CLOSED — OWNER VERIFIED','CLOSED')]; [(__import__('sys').exit(f'FAIL {raw}') if got[0]!=exp else None) for raw,exp in cases for got in [to_contract_status(raw)]]; print('V3 PASS')"` | `V3 PASS` |
| V4 | PULL_EDITABLE removed | `grep -c 'PULL_EDITABLE' /app/memory/reports/sheets_sync.py` | `0` |
| V5 | cmd_diff_log present, cmd_pull absent | `python3 -c "import ast,sys; tree=ast.parse(open('/app/memory/reports/sheets_sync.py').read()); fns={n.name for n in ast.walk(tree) if isinstance(n,ast.FunctionDef)}; assert 'cmd_diff_log' in fns,'cmd_diff_log missing'; assert 'cmd_pull' not in fns,'cmd_pull still present'; print('V5 PASS')"` | `V5 PASS` |
| V6 | update_all_items_inplace present | `grep -c 'def update_all_items_inplace' /app/memory/reports/sheets_sync.py` | `1` |

---

## EXIT GATE (4 checkboxes, compile check mandatory)

```
□ 1. COMPILE CHECK:
     python3 -m py_compile /app/memory/reports/sheets_sync.py
     # Must exit 0

□ 2. DRY-RUN PASS:
     cd /app && python3 memory/reports/sheets_sync.py --dry-run
     # Must print "Dry-run PASS" and exit 0

□ 3. REGISTRY SYNC:
     python3 -c "import json; d=json.load(open('/app/memory/control/registry.json'));
     items={i['id']:i for i in d['items']};
     assert 'IMPLEMENTED' in items['CR-419']['status'], 'CR-419 not IMPLEMENTED';
     print('Registry PASS')"

□ 4. FILE OWNERSHIP + CR_REGISTRY.MD updated
```

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-419 → status: GATE_5A_IMPLEMENTED, sprint_key: tooling_oct1
- [ ] CR_REGISTRY.md: row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: sheets_sync.py CR-419 IMPL row added
- [ ] Code marker: # CR-419 in file header comment
```
