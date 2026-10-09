#!/usr/bin/env python3
# CR-418: Google Sheets — Contract v1.4 Compliance + REGISTRAR Role
# Push: registry.json → Google Sheet (10 tabs, 22-column contract §3)
# Pull: read-only diff — prints pending Change Log rows, writes nothing
# Auth: OAuth2 with stored refresh token (no service account key)
#
# Usage:
#   python3 sheets_sync.py --dry-run          # validate credentials + sheet, no writes
#   python3 sheets_sync.py --push             # registry → Sheet (10 tabs + Track C cleanup)
#   python3 sheets_sync.py --pull             # read-only diff: show pending Change Log rows
#   python3 sheets_sync.py --push --pull      # push then show diff

import json, os, sys, argparse, time, shutil
import urllib.parse
from pathlib import Path
from datetime import datetime
from collections import Counter

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    sys.exit("Run: pip install requests python-dotenv")

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR    = Path(__file__).parent
ENV_PATH      = Path('/app/frontend/.env')   # CR-418: credentials in frontend env
REGISTRY_PATH = SCRIPT_DIR.parent / 'control' / 'registry.json'

load_dotenv(ENV_PATH)

CLIENT_ID     = os.getenv('GOOGLE_OAUTH_CLIENT_ID',    '').strip().strip('"').strip("'")
CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET','').strip().strip('"').strip("'")
REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN',      '').strip().strip('"').strip("'")
_raw_id       = os.getenv('GOOGLE_SHEET_ID',           '').strip().strip('"').strip("'")
SHEET_ID      = _raw_id.split('/')[0]

# ── 22-column contract §3 header (exact names, exact order) ───────────────
CONTRACT_COLS = [
    'Project', 'ID', 'Type', 'Title', 'Status', 'Status note',
    'Priority', 'Risk', 'Area', 'Sprint', 'Blocked on', 'Owner action',
    'Assignee', 'Registered', 'Last updated', 'Closed',
    'Related', 'Artefacts', 'Code markers', 'Files', 'Notes', 'Money path',
]

# ── Phase 1 accepted columns from sheet (contract §5.5) ───────────────────
PHASE1_ACCEPTED = ['Status', 'Registered', 'Closed']

# ── 10 tabs, contract §2 exact names and order ────────────────────────────
TABS = [
    'All Items', 'Intake', 'Planning', 'Implemented',
    'QA', 'Smoke', 'Closed', 'Blockers', 'Change Log', 'Summary',
]

# ── Obsolete tabs from all prior versions ─────────────────────────────────
_OBSOLETE_TABS = [
    'Open Only',        # v1
    'QA / Smoke',       # v2
    'Blocked / Parked', # v2
    "QA'd",            # v2
    'Smoke Test',       # v2
    'Implementation',   # v2
]

# ── Change Log column headers (contract §5) ───────────────────────────────
CL_COLS = [
    'Logged at', 'ID', 'Column', 'Old value (registry)',
    'New value (sheet)', 'Decision', 'Decided at', 'Note',
]

# ── Status classifier — 8-value contract enum (contract §4) ───────────────
def classify_status(item):
    """Map registry item → one of 8 contract Status enum values (or blank = Unrouted).
    Uses _contract_status override if owner-patched directly on the registry item."""
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
    # SHIPPED / VERIFIED → IMPLEMENTED (OD-418-03 owner decision)
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
        return 'INTAKE'
    if 'CRM-BLOCKED' in s:
        return 'INTAKE'
    return ''   # blank = Unrouted (contract §4 back-catalogue interim)

# ── Status → tab name (contract §2) ───────────────────────────────────────
_STATUS_TO_TAB = {
    'INTAKE': 'Intake', 'PLANNING': 'Planning', 'IMPLEMENTED': 'Implemented',
    'QA': 'QA', 'SMOKE': 'Smoke',
    'CLOSED': 'Closed', 'PARKED': 'Closed', 'DUPLICATE': 'Closed',
}

def _status_to_tab(contract_status):
    return _STATUS_TO_TAB.get(contract_status)  # None = All Items only

# ── POS area normaliser (contract §3 col 9) ────────────────────────────────
_CANONICAL_AREAS = {
    'Printing', 'Reports', 'Inventory', 'Menu Management', 'Payments',
    'PMS Check-In', 'PMS Bookings', 'PMS Folio', 'CRM', 'Settings',
    'Auth / Permissions', 'Smart Purchase', 'Sidebar / Nav', 'Sockets',
    'Order Entry', 'Dashboard', 'Expense', 'Tooling',
}
_AREA_MAP = {
    'printing': 'Printing', 'printer': 'Printing', 'kot': 'Printing', 'print': 'Printing',
    'report': 'Reports', 'reports': 'Reports',
    'inventory': 'Inventory', 'inv': 'Inventory', 'stock': 'Inventory',
    'menu': 'Menu Management', 'product': 'Menu Management',
    'payment': 'Payments', 'billing': 'Payments', 'pay': 'Payments',
    'check-in': 'PMS Check-In', 'checkin': 'PMS Check-In', 'check in': 'PMS Check-In',
    'pms booking': 'PMS Bookings', 'booking': 'PMS Bookings', 'reservation': 'PMS Bookings',
    'folio': 'PMS Folio', 'pms folio': 'PMS Folio',
    'crm': 'CRM', 'customer': 'CRM',
    'settings': 'Settings', 'config': 'Settings',
    'auth': 'Auth / Permissions', 'permission': 'Auth / Permissions',
    'role': 'Auth / Permissions',
    'smart purchase': 'Smart Purchase', 'purchase': 'Smart Purchase',
    'sidebar': 'Sidebar / Nav', 'nav': 'Sidebar / Nav', 'navigation': 'Sidebar / Nav',
    'socket': 'Sockets', 'websocket': 'Sockets', 'realtime': 'Sockets',
    'order': 'Order Entry', 'order entry': 'Order Entry',
    'dashboard': 'Dashboard', 'insights': 'Dashboard',
    'expense': 'Expense',
    'tooling': 'Tooling', 'tool': 'Tooling', 'script': 'Tooling', 'control': 'Tooling',
    'room': 'PMS Bookings', 'pms': 'PMS Bookings',
}

def _classify_area(raw):
    if raw in _CANONICAL_AREAS:
        return raw
    k = str(raw).lower().strip()
    return _AREA_MAP.get(k, '')

# ── Blocked on party enum (contract §3 col 11) ────────────────────────────
_PARTY_MAP = {
    'backend': 'BACKEND', 'server': 'BACKEND',
    'crm': 'CRM', 'owner': 'OWNER', 'ops': 'OPS',
    'infra': 'INFRA', 'so': 'SO', 'inv': 'INV', 'pos': 'POS', 'internal': 'INTERNAL',
}

def _build_blocked_on(item, contract_status):
    """Derive Blocked on party. Closed items → blank (contract §3 col 11)."""
    if contract_status in ('CLOSED', 'PARKED', 'DUPLICATE'):
        return ''
    raw_status = str(item.get('status', '')).upper()
    if 'BACKEND-BLOCKED' in raw_status or 'BACKEND_BLOCKED' in raw_status:
        return 'BACKEND'
    if 'CRM-BLOCKED' in raw_status:
        return 'CRM'
    bk = str(item.get('blocked_by', '') or item.get('blocker', '') or '')
    if not bk.strip():
        return ''
    bk_lower = bk.lower()
    for kw, party in _PARTY_MAP.items():
        if kw in bk_lower:
            return party
    return ''

# ── Contract row helper builders ───────────────────────────────────────────
def _flatten(v):
    if isinstance(v, list):
        return ', '.join(str(x) for x in v)
    if isinstance(v, dict):
        return str(v)
    return str(v) if v is not None else ''

def _build_type(item):
    t = str(item.get('type', '')).upper().strip()
    if not t:
        id_ = str(item.get('id', ''))
        if id_.startswith('CR-'):    t = 'CR'
        elif id_.startswith('BUG-'): t = 'BUG'
    if t == 'CR' and str(item.get('title', '')).upper().startswith('BUG'):
        t = 'BUG'
    return t

def _build_priority(item):
    p = str(item.get('priority') or item.get('severity') or '').upper().strip()
    if p in ('P0', 'P1', 'P2', 'P3'):
        return p
    item['_priority_defaulted'] = True
    return 'P2'

def _build_notes(item):
    n = _flatten(item.get('notes', ''))
    if item.get('_priority_defaulted'):
        n = ('PRIORITY DEFAULTED. ' + n).strip()
    return n

def _build_owner_action(item, contract_status):
    if contract_status == 'SMOKE':
        return f"Smoke test {_flatten(item.get('title',''))}"[:200]
    bk = str(item.get('blocked_by', '') or item.get('blocker', '') or '')
    if 'OWNER' in bk.upper():
        notes = str(item.get('notes', ''))
        return (notes or 'Owner decision required')[:200]
    return ''

def _build_related(item):
    dep = item.get('depends_on', [])
    if isinstance(dep, str): dep = [d.strip() for d in dep.split(',') if d.strip()]
    rel = item.get('related', [])
    if isinstance(rel, str): rel = [r.strip() for r in rel.split(',') if r.strip()]
    parts = list(dep or []) + list(rel or [])
    return ', '.join(str(p) for p in parts if p)

def _build_artefacts(item):
    raw  = item.get('artifact_refs', {})
    refs = raw if isinstance(raw, dict) else {}   # guard: some items store a list
    found = []
    if item.get('intake_doc') or refs.get('intake'):         found.append('INTAKE')
    if refs.get('impact_analysis'):                           found.append('IMPACT_ANALYSIS')
    if refs.get('implementation_plan'):                       found.append('IMPLEMENTATION_PLAN')
    if refs.get('qa_handover'):                               found.append('QA_HANDOVER')
    if item.get('qa_report') or refs.get('qa_report'):       found.append('QA_REPORT')
    return ', '.join(found)

_MONEY_AREAS = {'Payments', 'PMS Folio', 'Smart Purchase'}
_MONEY_KW = ('payment', 'billing', 'folio', 'smart purchase', 'invoice', 'checkout',
             'gst', 'tax', 'settle', 'collect', 'discount', 'wallet', 'coupon')

def _build_money_path(item):
    area = str(item.get('area', '') or '')
    if area in _MONEY_AREAS:
        return 'YES'
    combined = (str(item.get('title', '')) + str(item.get('files', '')) + area).lower()
    if any(k in combined for k in _MONEY_KW):
        return 'YES'
    return 'no'

def _build_contract_row(item):
    """Build one 22-column contract row from a registry item."""
    cs    = classify_status(item)
    today = datetime.now().strftime('%Y-%m-%d')
    return [
        'POS',                                                           # 1  Project
        _flatten(item.get('id', '')),                                    # 2  ID
        _build_type(item),                                               # 3  Type
        _flatten(item.get('title', '')),                                 # 4  Title
        cs,                                                              # 5  Status
        _flatten(item.get('status', '')),                                # 6  Status note
        _build_priority(item),                                           # 7  Priority
        _flatten(item.get('risk', '')),                                  # 8  Risk
        _classify_area(_flatten(item.get('area', ''))),                  # 9  Area
        _flatten(item.get('sprint_key', '')),                            # 10 Sprint
        _build_blocked_on(item, cs),                                     # 11 Blocked on
        _build_owner_action(item, cs),                                   # 12 Owner action
        '',                                                              # 13 Assignee — NEVER written
        _flatten(item.get('registered') or item.get('created') or
                 item.get('created_at', '')),                            # 14 Registered
        today,                                                           # 15 Last updated (agent-computed)
        _flatten(item.get('closed', '')) if cs in
            ('CLOSED', 'PARKED', 'DUPLICATE') else '',                   # 16 Closed
        _build_related(item),                                            # 17 Related
        _build_artefacts(item),                                          # 18 Artefacts
        'no',                                                            # 19 Code markers (OD-418-04)
        _flatten(item.get('files', '')),                                 # 20 Files
        _build_notes(item),                                              # 21 Notes
        _build_money_path(item),                                         # 22 Money path
    ]

# ── Tab row builders ───────────────────────────────────────────────────────
def build_tab_rows(items, tab_name):
    if tab_name == 'Summary':
        return _build_summary(items)
    if tab_name == 'Blockers':
        return _build_blockers_tab(items)
    if tab_name == 'Change Log':
        return None  # Change Log is append-only — built separately
    subset = items if tab_name == 'All Items' else [
        i for i in items if _status_to_tab(classify_status(i)) == tab_name
    ]
    rows = [CONTRACT_COLS]
    for item in subset:
        rows.append(_build_contract_row(item))
    return rows

def _build_summary(items):
    """Summary tab — contract §6: 3 blocks + 2 trailing lines."""
    STATUS_ENUM = ['INTAKE', 'PLANNING', 'IMPLEMENTED', 'QA', 'SMOKE',
                   'CLOSED', 'PARKED', 'DUPLICATE']
    OPEN_SET    = {'INTAKE', 'PLANNING', 'IMPLEMENTED', 'QA', 'SMOKE'}

    status_counts   = Counter()
    priority_counts = Counter()
    blocked_counts  = Counter()

    for item in items:
        cs = classify_status(item)
        if cs in STATUS_ENUM:
            status_counts[cs] += 1
        else:
            status_counts['Unrouted'] += 1
        if cs in OPEN_SET:
            p = str(item.get('priority') or item.get('severity') or 'P2').upper().strip()
            priority_counts[p if p in ('P0', 'P1', 'P2', 'P3') else 'P2'] += 1
        bo = _build_blocked_on(item, cs)
        if bo:
            blocked_counts[bo] += 1

    rows = [['Status', 'Count']]
    for s in STATUS_ENUM:
        rows.append([s, status_counts.get(s, 0)])
    rows.append(['Unrouted', status_counts.get('Unrouted', 0)])
    rows.append([])
    rows.append(['Priority (open items)', 'Count'])
    for p in ('P0', 'P1', 'P2', 'P3'):
        if priority_counts.get(p, 0):
            rows.append([p, priority_counts[p]])
    rows.append([])
    rows.append(['Blocked on', 'Count'])
    for bo, cnt in blocked_counts.most_common():
        rows.append([bo, cnt])
    rows.append([])
    rows.append([f'Generated: {datetime.now().strftime("%Y-%m-%dT%H:%M")}'])
    rows.append(['Pending change-log rows: 0'])   # updated in cmd_push after CL diff
    return rows

def _build_blockers_tab(items):
    """Blockers tab — live items only (closed items dropped per CR-418 brief §5)."""
    BCOLS = ['id', 'type', 'title', 'status', 'sprint_key',
             'relationship', 'related_id', 'related_context']
    rows = [BCOLS]
    for item in items:
        cs = classify_status(item)
        if cs in ('CLOSED', 'PARKED', 'DUPLICATE'):
            continue   # CR-418: drop stale closed-item blocker rows
        i_id     = _flatten(item.get('id', ''))
        i_type   = _flatten(item.get('type', ''))
        i_title  = _flatten(item.get('title', ''))
        i_status = _flatten(item.get('status', ''))
        i_sprint = _flatten(item.get('sprint_key', ''))

        def _row(rel, rel_id, ctx):
            return [i_id, i_type, i_title, i_status, i_sprint, rel, rel_id, ctx]

        blocker = item.get('blocker', '')
        if blocker and str(blocker).strip().upper() not in ('', 'NONE', '[]'):
            rows.append(_row('BLOCKED BY', '', str(blocker)[:200]))

        blocked_by = item.get('blocked_by', '')
        if blocked_by and str(blocked_by).strip():
            rows.append(_row('BLOCKED BY', str(blocked_by), ''))

        depends = item.get('depends_on', [])
        if isinstance(depends, str):
            depends = [d.strip() for d in depends.split(',') if d.strip()]
        for dep_id in (depends if isinstance(depends, list) else []):
            if str(dep_id).strip():
                rows.append(_row('DEPENDS ON', str(dep_id).strip(), ''))

        blocks = item.get('blocks', [])
        if isinstance(blocks, str):
            blocks = [b.strip() for b in blocks.split(',') if b.strip()]
        for blockee_id in (blocks if isinstance(blocks, list) else []):
            if str(blockee_id).strip():
                rows.append(_row('BLOCKING', str(blockee_id).strip(), ''))

    return rows

# ── OAuth2 token refresh ───────────────────────────────────────────────────
def get_access_token():
    r = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'client_id':     CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'refresh_token': REFRESH_TOKEN,
            'grant_type':    'refresh_token',
        },
        timeout=15,
    )
    data = r.json()
    if 'access_token' not in data:
        sys.exit(f"❌ Token refresh failed: {data.get('error_description', data)}")
    return data['access_token']

# ── Sheets API helpers ─────────────────────────────────────────────────────
def _headers(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def sheets_get(token, path, **params):
    return requests.get(
        f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}{path}',
        headers=_headers(token), params=params, timeout=30,
    )

def sheets_post(token, path, body):
    return requests.post(
        f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}{path}',
        headers=_headers(token), json=body, timeout=30,
    )

def sheets_put(token, path, body, **params):
    return requests.put(
        f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}{path}',
        headers=_headers(token), json=body, params=params, timeout=30,
    )

def get_sheet_meta(token):
    r = sheets_get(token, '')
    if r.status_code != 200:
        sys.exit(
            f"❌ Sheet access failed ({r.status_code}): "
            f"{r.json().get('error', {}).get('message', r.text)}"
        )
    return r.json()

def _range_url(tab_name, cell_range):
    raw = f"'{tab_name}'!{cell_range}"
    return urllib.parse.quote(raw, safe='')

# ── Tab management ─────────────────────────────────────────────────────────
def sync_tabs(token, meta, dry_run=False):
    """Delete all obsolete tabs; create any missing contract tabs."""
    existing = {s['properties']['title']: s['properties']['sheetId']
                for s in meta.get('sheets', [])}
    reqs = []
    for old in _OBSOLETE_TABS:
        if old in existing:
            reqs.append({'deleteSheet': {'sheetId': existing[old]}})
            print(f"  🗑  Queued delete: {old}")
    for tab in TABS:
        if tab not in existing:
            reqs.append({'addSheet': {'properties': {'title': tab}}})
            print(f"  ➕ Queued create: {tab}")
    if not reqs:
        print("  ✅ All tabs already in correct state")
        return
    if dry_run:
        print(f"  [dry-run] Would apply {len(reqs)} tab operation(s)")
        return
    r = sheets_post(token, ':batchUpdate', {'requests': reqs})
    if r.status_code != 200:
        sys.exit(f"❌ Tab management failed: {r.json()}")
    print(f"  ✅ Tab management done ({len(reqs)} operation(s))")

# ── Tab writer ─────────────────────────────────────────────────────────────
def write_tab(token, tab_name, rows, dry_run=False):
    enc_clear = _range_url(tab_name, 'A1:Z10000')
    enc_write = _range_url(tab_name, 'A1')
    if dry_run:
        data_rows = len(rows) - 1 if rows else 0
        print(f"  [dry-run] {tab_name}: would write {data_rows} data row(s)")
        return
    r = sheets_post(token, f'/values/{enc_clear}:clear', {})
    if r.status_code not in (200, 204):
        print(f"  ⚠  Clear warning for '{tab_name}': {r.status_code}")
    time.sleep(0.3)
    r = sheets_put(token, f'/values/{enc_write}', {'values': rows},
                   valueInputOption='RAW')
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

# ── Track C — one-off registry cleanup (OD-418-01: runs inside --push) ────
def _run_track_c(registry):
    """Idempotent cleanup: type casing, timestamp fields, category hygiene.
    Items already processed are skipped via _cr418_cleaned flag."""
    items   = registry['items']
    today   = datetime.now().strftime('%Y-%m-%d')
    changed = 0
    LIFECYCLE = ('NOT_STARTED', 'SHIPPED', 'SUBSUMED', 'ACTIVE', 'DONE',
                 'RESOLVED', 'CLOSED', 'IMPLEMENTED')
    for item in items:
        if item.get('_cr418_cleaned'):
            continue
        t = item.get('type', '')
        if t and t != t.upper():
            item['type'] = t.upper()
            changed += 1
        if 'registered' not in item:
            item['registered'] = item.get('created', item.get('created_at', ''))
        if 'last_updated' not in item:
            item['last_updated'] = today
        if 'closed' not in item:
            item['closed'] = ''
        cat = str(item.get('category', '') or '')
        if any(k in cat.upper() for k in LIFECYCLE):
            item['category'] = ''
        item['_cr418_cleaned'] = True
    if changed:
        print(f"  Track C: normalised {changed} type value(s)")
    else:
        print("  Track C: nothing to normalise (all items already clean)")
    return registry

def _save_registry(registry):
    """Atomic write to registry.json via tmp file."""
    tmp = REGISTRY_PATH.with_suffix('.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(registry, f, indent=2)
    shutil.move(str(tmp), str(REGISTRY_PATH))

# ── Change Log — diff sheet vs registry, append PENDING rows ──────────────
def build_change_log_tab(token, items_by_id, dry_run=False):
    """Read sheet All Items, diff against registry, append new PENDING rows.
    Returns count of newly appended rows."""
    r = sheets_get(token, f"/values/{_range_url('All Items', 'A1:Z10000')}")
    if r.status_code != 200:
        print(f"  ⚠  Change Log diff skipped: could not read All Items ({r.status_code})")
        return 0
    data = r.json().get('values', [])
    if not data or len(data) < 2:
        return 0
    headers    = data[0]
    sheet_rows = data[1:]
    col_idx    = {h: i for i, h in enumerate(headers)}
    if 'ID' not in col_idx:
        return 0

    # Read existing Change Log to avoid duplicate rows
    r2 = sheets_get(token, f"/values/{_range_url('Change Log', 'A1:H10000')}")
    cl_existing = set()
    if r2.status_code == 200:
        cl_data = r2.json().get('values', [])
        for row in cl_data[1:]:
            if len(row) >= 5:
                cl_existing.add((row[1], row[2], row[4]))  # (ID, Column, new value)

    now = datetime.now().strftime('%Y-%m-%dT%H:%M')
    new_rows = []
    field_map = {'Status': 'status', 'Registered': 'registered', 'Closed': 'closed'}

    for row in sheet_rows:
        id_col = col_idx.get('ID', 0)
        if len(row) <= id_col:
            continue
        item_id = row[id_col].strip()
        if not item_id or item_id not in items_by_id:
            continue
        item = items_by_id[item_id]
        for col_name in PHASE1_ACCEPTED:
            if col_name not in col_idx:
                continue
            idx       = col_idx[col_name]
            sheet_val = row[idx].strip() if idx < len(row) else ''
            # For Status: compare against contract enum (not raw registry string)
            if col_name == 'Status':
                reg_val = classify_status(item)
            else:
                reg_field = field_map.get(col_name, col_name.lower())
                reg_val   = str(item.get(reg_field, '') or '').strip()
            if sheet_val and sheet_val != reg_val:
                key = (item_id, col_name, sheet_val)
                if key not in cl_existing:
                    new_rows.append([
                        now, item_id, col_name, reg_val, sheet_val,
                        'PENDING', '', '',
                    ])

    if not new_rows:
        print("  Change Log: no new human edits detected")
        return 0

    if dry_run:
        print(f"  [dry-run] Change Log: would append {len(new_rows)} PENDING row(s)")
        return len(new_rows)

    # Write or append
    r3 = sheets_get(token, f"/values/{_range_url('Change Log', 'A1:A2')}")
    has_data = bool(r3.status_code == 200 and r3.json().get('values'))
    if not has_data:
        write_tab(token, 'Change Log', [CL_COLS] + new_rows)
    else:
        enc_append = _range_url('Change Log', 'A1')
        r4 = sheets_post(
            token,
            f'/values/{enc_append}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
            {'values': new_rows},
        )
        if r4.status_code not in (200, 201):
            print(f"  ⚠  Change Log append failed: {r4.status_code}")
        else:
            print(f"  ✅ Change Log: appended {len(new_rows)} PENDING row(s)")
    return len(new_rows)

# ── Run report (printed to console after every --push) ────────────────────
def _print_run_report(items, cl_appended, live_blockers):
    STATUS_ENUM = ['INTAKE', 'PLANNING', 'IMPLEMENTED', 'QA', 'SMOKE',
                   'CLOSED', 'PARKED', 'DUPLICATE']
    sc = Counter()
    prio_defaulted = 0
    no_registered  = 0
    for item in items:
        cs = classify_status(item)
        sc[cs if cs else 'Unrouted'] += 1
        if item.get('_priority_defaulted'):
            prio_defaulted += 1
        if not (item.get('registered') or item.get('created') or item.get('created_at')):
            no_registered += 1

    print("\n" + "═" * 55)
    print(f"  POS REGISTRAR RUN — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("═" * 55)
    print(f"  Total rows pushed:        {sum(sc.values())}")
    print("  " + "─" * 47)
    print("  Status distribution:")
    for s in STATUS_ENUM:
        c = sc.get(s, 0)
        print(f"    {s:<18} {c:>4}")
    unrouted = sc.get('Unrouted', 0)
    flag = "  ← target zero" if unrouted else ""
    print(f"    {'Unrouted':<18} {unrouted:>4}{flag}")
    print("  " + "─" * 47)
    print(f"  PRIORITY DEFAULTED rows:   {prio_defaulted}")
    print(f"  Items with no Registered:  {no_registered}")
    print(f"  Live blockers (open):      {live_blockers}")
    print(f"  Change Log rows appended:  {cl_appended}  (PENDING)")
    print("═" * 55 + "\n")

# ── PUSH command (REGISTRAR run) ───────────────────────────────────────────
def cmd_push(dry_run=False):
    print("\n── PUSH: registry.json → Google Sheets (CR-418 contract v1.4) " + "─" * 10)

    registry = json.load(open(REGISTRY_PATH))
    items    = registry['items']
    print(f"  Loaded {len(items)} items from registry.json")

    # Track C cleanup (OD-418-01: runs in same step as push)
    registry = _run_track_c(registry)
    if not dry_run:
        _save_registry(registry)
        items = registry['items']

    token = get_access_token()
    print("  ✅ Access token refreshed")

    meta = get_sheet_meta(token)
    print(f"  Sheet: {meta['properties']['title']}")
    existing_tabs = [s['properties']['title'] for s in meta.get('sheets', [])]
    print(f"  Existing tabs ({len(existing_tabs)}): {existing_tabs}")

    sync_tabs(token, meta, dry_run)

    if not dry_run:
        time.sleep(1)
        token = get_access_token()

    # Write 9 tabs (all except Change Log — that's append-only)
    for tab in TABS:
        if tab == 'Change Log':
            continue
        rows = build_tab_rows(items, tab)
        if rows is not None:
            write_tab(token, tab, rows, dry_run)

    # Change Log diff + append
    items_by_id = {i['id']: i for i in items}
    cl_appended = build_change_log_tab(token, items_by_id, dry_run)

    # Update Summary with real pending CL count
    if not dry_run and cl_appended:
        summary_rows = _build_summary(items)
        summary_rows[-1] = [f'Pending change-log rows: {cl_appended}']
        write_tab(token, 'Summary', summary_rows, dry_run=False)

    live_blockers = sum(
        1 for i in items
        if classify_status(i) not in ('CLOSED', 'PARKED', 'DUPLICATE')
        and _build_blocked_on(i, classify_status(i))
    )

    label = "(dry-run) " if dry_run else ""
    print(f"\n  PUSH {label}COMPLETE. {len(items)} items → 10 tabs.")

    if not dry_run:
        _print_run_report(items, cl_appended, live_blockers)

# ── PULL command — read-only diff (OD-418-02 C) ───────────────────────────
def cmd_pull(dry_run=False):
    """Read-only diff: reads sheet All Items, prints pending Change Log rows.
    Writes nothing to registry.json or the sheet."""
    print("\n── READ-ONLY DIFF: Sheet → registry " + "─" * 38)

    token = get_access_token()
    print("  ✅ Access token refreshed")

    r = sheets_get(token, f"/values/{_range_url('All Items', 'A1:Z10000')}")
    if r.status_code != 200:
        sys.exit(f"❌ Could not read All Items tab: "
                 f"{r.json().get('error', {}).get('message', r.text)}")

    data = r.json().get('values', [])
    if not data:
        sys.exit("❌ All Items tab is empty — run --push first")

    headers    = data[0]
    sheet_rows = data[1:]
    col_idx    = {h: i for i, h in enumerate(headers)}
    if 'ID' not in col_idx:
        sys.exit("❌ 'ID' column not found — sheet may be in old format. Run --push first.")

    registry    = json.load(open(REGISTRY_PATH))
    items_by_id = {i['id']: i for i in registry['items']}
    print(f"  Comparing {len(sheet_rows)} sheet rows against {len(items_by_id)} registry items...")

    pending = []
    field_map = {'Status': 'status', 'Registered': 'registered', 'Closed': 'closed'}
    for row in sheet_rows:
        id_col = col_idx.get('ID', 0)
        if len(row) <= id_col:
            continue
        item_id = row[id_col].strip()
        if not item_id or item_id not in items_by_id:
            continue
        item = items_by_id[item_id]
        for col_name in PHASE1_ACCEPTED:
            if col_name not in col_idx:
                continue
            idx       = col_idx[col_name]
            sheet_val = row[idx].strip() if idx < len(row) else ''
            # For Status: compare against contract enum (not raw registry string)
            if col_name == 'Status':
                reg_val = classify_status(item)
            else:
                reg_field = field_map.get(col_name, col_name.lower())
                reg_val   = str(item.get(reg_field, '') or '').strip()
            if sheet_val and sheet_val != reg_val:
                pending.append((item_id, col_name, reg_val, sheet_val))

    if not pending:
        print("  ✅ No pending edits — sheet and registry are in sync")
    else:
        print(f"\n  Pending Change Log rows ({len(pending)}):")
        for item_id, col, old, new in pending:
            print(f"    {item_id:<12} {col}: '{old[:40]}' → '{new[:40]}'")
        print(f"\n  No writes made. Run --push to log these to the Change Log tab.")

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='CR-418: MyGenie POS — Google Sheets Contract v1.4 REGISTRAR',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            'Examples:\n'
            '  python3 sheets_sync.py --dry-run    # validate only, no writes\n'
            '  python3 sheets_sync.py --push        # registry → Sheet (10 tabs)\n'
            '  python3 sheets_sync.py --pull        # read-only diff (no writes)\n'
            '  python3 sheets_sync.py --push --pull # push then show diff\n'
        ),
    )
    parser.add_argument('--push',    action='store_true',
                        help='Push registry.json → Sheet (22-col, 10-tab contract)')
    parser.add_argument('--pull',    action='store_true',
                        help='Read-only diff: show pending Change Log rows (no writes)')
    parser.add_argument('--dry-run', action='store_true', dest='dry_run',
                        help='Validate credentials + sheet access — no writes')
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

    if args.dry_run:
        print("\n── DRY-RUN: validating credentials + sheet access ──────────────────")
        token = get_access_token()
        print("✅ Access token refreshed")
        meta = get_sheet_meta(token)
        print(f"✅ Sheet accessible: '{meta['properties']['title']}'")
        tabs = [s['properties']['title'] for s in meta.get('sheets', [])]
        print(f"   Current tabs ({len(tabs)}): {tabs}")
        registry = json.load(open(REGISTRY_PATH))
        print(f"✅ registry.json readable: {len(registry['items'])} items")
        print("\n✅ Dry-run PASS — all systems ready.")
        return

    if args.push:
        cmd_push(dry_run=False)

    if args.pull:
        cmd_pull(dry_run=False)


if __name__ == '__main__':
    main()
