#!/usr/bin/env python3
# CR-418: Google Sheets — Contract v1.4 REGISTRAR (push-only + Change Log diff)
# Push: registry.json → Google Sheet (10 tabs, 22-column contract §3)
# Sheet → registry: NEVER direct. Human edits are diffed into Change Log (§5);
# only owner-APPROVED rows are applied on the next push.
#
# Usage:
#   python3 sheets_sync.py --dry-run   # full run in memory: diff + run report, no writes
#   python3 sheets_sync.py --push      # REGISTRAR run: Change Log diff → registry → sheet
#   python3 sheets_sync.py --diff      # read-only: print sheet edits vs last push

import json, os, re, sys, argparse, time, shutil, hashlib
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
SNAPSHOT_PATH = SCRIPT_DIR / 'sheet_push_snapshot.json'   # last values pushed per ID

load_dotenv(ENV_PATH)

CLIENT_ID     = os.getenv('GOOGLE_OAUTH_CLIENT_ID',    '').strip().strip('"').strip("'")
CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET','').strip().strip('"').strip("'")
REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN',      '').strip().strip('"').strip("'")
_raw_id       = os.getenv('GOOGLE_SHEET_ID',           '').strip().strip('"').strip("'")
SHEET_ID      = _raw_id.split('/')[0]

TODAY = datetime.now().strftime('%Y-%m-%d')

# ── 22-column contract §3 header (exact names, exact order) ───────────────
CONTRACT_COLS = [
    'Project', 'ID', 'Type', 'Title', 'Status', 'Status note',
    'Priority', 'Risk', 'Area', 'Sprint', 'Blocked on', 'Owner action',
    'Assignee', 'Registered', 'Last updated', 'Closed',
    'Related', 'Artefacts', 'Code markers', 'Files', 'Notes', 'Money path',
]
COL = {c: i for i, c in enumerate(CONTRACT_COLS)}

PHASE1_ACCEPTED = ('Status', 'Registered', 'Closed')   # contract §5.5
DASHBOARD_COLS  = ('Priority',)                         # contract §8 / §5.6

TABS = [
    'All Items', 'Intake', 'Planning', 'Implemented',
    'QA', 'Smoke', 'Closed', 'Blockers', 'Change Log', 'Summary',
]
_OBSOLETE_TABS = ['Open Only', 'QA / Smoke', 'Blocked / Parked', "QA'd",
                  'Smoke Test', 'Implementation']

CL_COLS = ['Logged at', 'ID', 'Column', 'Old value (registry)',
           'New value (sheet)', 'Decision', 'Decided at', 'Note']

STATUS_ENUM = ['INTAKE', 'PLANNING', 'IMPLEMENTED', 'QA', 'SMOKE',
               'CLOSED', 'PARKED', 'DUPLICATE']
CLOSED_SET  = {'CLOSED', 'PARKED', 'DUPLICATE'}

_DATE_RE = re.compile(r'\d{4}-\d{2}-\d{2}')
_ITEMS_BY_ID = {}   # set per run; used for dependency-blocker resolution

def _norm(s):
    return re.sub(r'[_\-]+', ' ', str(s or '').upper())

def _head(n):
    # leading clause of a status string: stops at '(', '. ', '·' or a date
    return re.split(r'\(|\. |·|\d{4} \d{2} \d{2}', n, maxsplit=1)[0]

# ── Status classifier — 8-value contract enum (contract §4) ───────────────
_SMOKE_KW = ('AWAITING OWNER SMOKE', 'OWNER SMOKE PENDING', 'AWAITING SMOKE',
             'AWAITING GATE 6', 'GATE 6 PENDING', 'AWAITING OWNER SIGN OFF')

def classify_status(item):
    if item.get('_contract_status'):
        return item['_contract_status']
    n = _norm(item.get('status', ''))
    if n.strip() in STATUS_ENUM:
        return n.strip()
    h = _head(n).strip()
    if 'DUPLICATE' in h or 'DUPE' in h:
        return 'DUPLICATE'
    if h.startswith(('CLOSED', 'RESOLVED', 'RETIRED', 'SUBSUMED', 'ABSORBED', 'FOLDED', 'OWNER VERIFIED')) \
            or 'SUBSUMED' in h or 'ABSORBED' in h or 'SMOKE PASS' in n[:60] \
            or 'SUBSUMED BY' in n[:80] or 'ABSORBED INTO' in n[:80]:
        return 'CLOSED'
    if 'PARKED' in h or 'DEFERRED' in h:
        return 'PARKED'
    stage = ''
    if 'QA PASS' in n[:60] or any(k in h for k in ('GATE 5B', 'QA VERIFIED', 'REGRESSION PASS')):
        stage = 'QA'
    elif any(k in h for k in ('GATE 5A', 'GATE 4', 'IMPLEMENTED', 'SHIPPED', 'FIXED',
                              'VERIFIED', 'IN PROGRESS', 'CARRY FORWARD', 'HYGIENE',
                              'INVESTIGATION COMPLETE')):
        stage = 'IMPLEMENTED'   # SHIPPED / VERIFIED → IMPLEMENTED (OD-418-03)
    if stage == 'IMPLEMENTED' and 'QA PASS' in n and not any(k in n for k in ('QA PENDING', 'AWAITING QA')):
        stage = 'QA'
    if stage:
        return 'SMOKE' if any(k in n for k in _SMOKE_KW) else stage
    if any(k in h for k in ('GATE 2', 'GATE 3', 'IMPACT ANALYSIS', 'PLAN COMPLETE', 'PLANNING')):
        return 'PLANNING'
    if any(k in h for k in ('GATE 1', 'INTAKE', 'REGISTERED', 'NOT STARTED', 'RE INVESTIGATE',
                            'BACKEND BLOCKED', 'CRM BLOCKED', 'HOLD')):
        return 'INTAKE'
    g = re.fullmatch(r'\s*(?:GATE\s*)?(\d)([AB]?)\s*', str(item.get('gate') or '').upper())
    if g:
        return {'1': 'INTAKE', '2': 'PLANNING', '3': 'PLANNING', '4': 'IMPLEMENTED',
                '5': 'QA' if g.group(2) == 'B' else 'IMPLEMENTED', '6': 'SMOKE'}.get(g.group(1), '')
    if 'DEFERRED TO' in n:
        return 'PARKED'
    if any(k in n for k in ('VERIFIED', 'SHIPPED')):
        return 'IMPLEMENTED'
    return ''   # blank = Unrouted (contract §4 back-catalogue interim)

_STATUS_TO_TAB = {
    'INTAKE': 'Intake', 'PLANNING': 'Planning', 'IMPLEMENTED': 'Implemented',
    'QA': 'QA', 'SMOKE': 'Smoke',
    'CLOSED': 'Closed', 'PARKED': 'Closed', 'DUPLICATE': 'Closed',
}

# ── POS area normaliser (brief §3.4 / contract §3 col 9) ───────────────────
_CANONICAL_AREAS = [
    'Printing', 'Reports', 'Inventory', 'Menu Management', 'Payments',
    'PMS Check-In', 'PMS Bookings', 'PMS Folio', 'CRM', 'Settings',
    'Auth / Permissions', 'Smart Purchase', 'Sidebar / Nav', 'Sockets',
    'Order Entry', 'Dashboard', 'Expense', 'Tooling',
]
_AREA_MAP = {
    'printing': 'Printing', 'printer': 'Printing', 'kot': 'Printing', 'print': 'Printing',
    'report': 'Reports', 'reports': 'Reports', 'reports module': 'Reports',
    'inventory': 'Inventory', 'inv': 'Inventory', 'stock': 'Inventory',
    'menu': 'Menu Management', 'menu mgmt': 'Menu Management', 'product': 'Menu Management',
    'payment': 'Payments', 'payments': 'Payments', 'billing': 'Payments', 'pay': 'Payments',
    'settlement': 'Payments',
    'check-in': 'PMS Check-In', 'checkin': 'PMS Check-In', 'check in': 'PMS Check-In',
    'pms booking': 'PMS Bookings', 'booking': 'PMS Bookings', 'reservation': 'PMS Bookings',
    'folio': 'PMS Folio', 'pms folio': 'PMS Folio',
    'crm': 'CRM', 'customer': 'CRM',
    'settings': 'Settings', 'config': 'Settings',
    'auth': 'Auth / Permissions', 'permission': 'Auth / Permissions',
    'permissions': 'Auth / Permissions', 'role': 'Auth / Permissions',
    'smart purchase': 'Smart Purchase', 'purchase': 'Smart Purchase',
    'sidebar': 'Sidebar / Nav', 'nav': 'Sidebar / Nav', 'navigation': 'Sidebar / Nav',
    'socket': 'Sockets', 'sockets': 'Sockets', 'websocket': 'Sockets', 'realtime': 'Sockets',
    'order': 'Order Entry', 'order entry': 'Order Entry', 'order management': 'Order Entry',
    'dashboard': 'Dashboard', 'insights': 'Dashboard',
    'expense': 'Expense',
    'tooling': 'Tooling', 'tool': 'Tooling', 'script': 'Tooling', 'control': 'Tooling',
    'room': 'PMS Bookings', 'pms': 'PMS Bookings',
}
_AREA_KEYS = sorted(_AREA_MAP, key=len, reverse=True)
_PMS_SUB = ('folio', 'check-in', 'checkin', 'check in', 'booking')

def _match_area(seg):
    for c in _CANONICAL_AREAS:
        if seg == c.lower():
            return c
    if seg in _AREA_MAP:
        return _AREA_MAP[seg]
    for k in _AREA_KEYS:
        if re.search(r'\b' + re.escape(k) + r'\b', seg):
            return _AREA_MAP[k]
    return ''

def _classify_area(raw):
    low = str(raw or '').strip().lower()
    if not low:
        return ''
    first = re.split(r'\s*(?:/|→|>|—|\+|,|\|)\s*', low)[0].strip()
    if first in ('pms', 'room'):   # PMS sub-type if named, else PMS Bookings
        for k in _PMS_SUB:
            if k in low:
                return _AREA_MAP[k]
    return _match_area(first) or _match_area(low)

# ── Blocked on party (contract §3 col 11) — live blockers only ─────────────
_PARTY_ENUM  = {'BACKEND', 'POS', 'CRM', 'SO', 'INV', 'INFRA', 'OWNER', 'OPS', 'INTERNAL'}
_PARTY_TEXT  = re.compile(r'\b(BACKEND|SERVER|CRM|OWNER|OPS|INFRA)\b')
_ITEM_ID_RE  = re.compile(r'\b(?:CR|BUG|INV|GAP|PROD|INC)-\d[\w-]*', re.I)

def _raw_blockers(item):
    out = []
    for f in ('blocked_by', 'blocker'):
        txt = re.sub(r'\(origin:[^)]*\)', '', str(item.get(f) or '')).strip()
        if txt and not txt.upper().startswith(('NONE', '[]')):
            out.append((f, txt))
    return out

def _build_blocked_on(item, cs):
    if cs in CLOSED_SET:
        return ''   # stale: blockers on closed items dropped (brief §5)
    n = _norm(item.get('status', ''))
    if 'BACKEND BLOCKED' in n or 'HOLD BACKEND' in n:
        return 'BACKEND'
    if 'CRM BLOCKED' in n:
        return 'CRM'
    for field, txt in _raw_blockers(item):
        up = txt.upper()
        if field == 'blocked_by' and up in _PARTY_ENUM:
            return up
        ids = [i.upper() for i in _ITEM_ID_RE.findall(txt)]
        if ids:
            # dependency is live only while this item is pre-implementation and dep is open
            if cs in ('INTAKE', 'PLANNING') and any(
                    i in _ITEMS_BY_ID and classify_status(_ITEMS_BY_ID[i]) not in CLOSED_SET
                    for i in ids):
                return 'INTERNAL'
            continue
        m = _PARTY_TEXT.search(up)
        if m:
            return 'BACKEND' if m.group(1) == 'SERVER' else m.group(1)
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

_PRIO_MAP = {'P0': 'P0', 'P1': 'P1', 'P2': 'P2', 'P3': 'P3',
             'BLOCKER': 'P0', 'CRITICAL': 'P0', 'MAJOR': 'P1', 'HIGH': 'P1',
             'MEDIUM': 'P2', 'MINOR': 'P3', 'LOW': 'P3'}

def _build_priority(item):
    # priority + severity → P0-P3; higher urgency wins (contract §4)
    vals = [_PRIO_MAP.get(str(item.get(f) or '').upper().strip()) for f in ('priority', 'severity')]
    vals = [v for v in vals if v]
    if vals:
        item.pop('_priority_defaulted', None)
        return min(vals)
    item['_priority_defaulted'] = True
    return 'P2'

def _build_notes(item):
    n = _flatten(item.get('notes', ''))
    if item.get('_priority_defaulted'):
        n = ('PRIORITY DEFAULTED. ' + n).strip()
    return n

def _build_owner_action(item, cs, blocked_on):
    if cs == 'SMOKE':
        return f"Smoke test {_flatten(item.get('title',''))}"[:200]
    if blocked_on == 'OWNER':
        return (str(item.get('notes', '')) or 'Owner decision required')[:200]
    return ''

def _build_related(item):
    parts = []
    for f in ('depends_on', 'related'):
        v = item.get(f, [])
        if isinstance(v, str):
            v = [x.strip() for x in v.split(',') if x.strip()]
        parts += list(v or [])
    return ', '.join(str(p) for p in parts if p)

def _build_artefacts(item):
    raw  = item.get('artifact_refs', {})
    refs = raw if isinstance(raw, dict) else {}
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

def _build_money_path(item, area):
    if area in _MONEY_AREAS:
        return 'YES'
    combined = (str(item.get('title', '')) + str(item.get('files', '')) +
                str(item.get('area', '') or '')).lower()
    return 'YES' if any(k in combined for k in _MONEY_KW) else 'no'

def _build_contract_row(item, assignee=''):
    cs   = classify_status(item)
    area = _classify_area(item.get('area', ''))
    bo   = _build_blocked_on(item, cs)
    return [
        'POS',                                                  # 1  Project
        _flatten(item.get('id', '')),                           # 2  ID
        _build_type(item),                                      # 3  Type
        _flatten(item.get('title', '')),                        # 4  Title
        cs,                                                     # 5  Status
        _flatten(item.get('status', '')),                       # 6  Status note
        _build_priority(item),                                  # 7  Priority
        _flatten(item.get('risk', '')),                         # 8  Risk
        area,                                                   # 9  Area
        _flatten(item.get('sprint_key', '')),                   # 10 Sprint
        bo,                                                     # 11 Blocked on
        _build_owner_action(item, cs, bo),                      # 12 Owner action
        assignee,                                               # 13 Assignee (preserved, never agent-written)
        _flatten(item.get('registered', '')),                   # 14 Registered
        _flatten(item.get('last_updated', '')),                 # 15 Last updated (agent-computed)
        _flatten(item.get('closed', '')) if cs in CLOSED_SET else '',  # 16 Closed
        _build_related(item),                                   # 17 Related
        _build_artefacts(item),                                 # 18 Artefacts
        'no',                                                   # 19 Code markers (OD-418-04)
        _flatten(item.get('files', '')),                        # 20 Files
        _build_notes(item),                                     # 21 Notes
        _build_money_path(item, area),                          # 22 Money path
    ]

# ── Tab row builders ───────────────────────────────────────────────────────
def build_all_rows(items, assignees):
    return {i['id']: _build_contract_row(i, assignees.get(i['id'], '')) for i in items}

def build_tab_rows(rows_by_id, tab_name):
    rows = list(rows_by_id.values())
    if tab_name == 'All Items':
        subset = rows
    elif tab_name == 'Blockers':
        subset = [r for r in rows if r[COL['Blocked on']]]
    else:
        subset = [r for r in rows if _STATUS_TO_TAB.get(r[COL['Status']]) == tab_name]
    if tab_name != 'All Items':   # Assignee always blank on stage tabs
        subset = [r[:COL['Assignee']] + [''] + r[COL['Assignee'] + 1:] for r in subset]
    return [CONTRACT_COLS] + subset

def _build_summary(rows_by_id, pending_cl):
    status_c, prio_c, block_c = Counter(), Counter(), Counter()
    for r in rows_by_id.values():
        cs = r[COL['Status']]
        status_c[cs if cs in STATUS_ENUM else 'Unrouted'] += 1
        if cs and cs not in CLOSED_SET:
            prio_c[r[COL['Priority']]] += 1
        if r[COL['Blocked on']]:
            block_c[r[COL['Blocked on']]] += 1
    rows = [['Status', 'Count']]
    rows += [[s, status_c.get(s, 0)] for s in STATUS_ENUM]
    rows.append(['Unrouted', status_c.get('Unrouted', 0)])
    rows += [[], ['Priority (open items)', 'Count']]
    rows += [[p, prio_c.get(p, 0)] for p in ('P0', 'P1', 'P2', 'P3')]
    rows += [[], ['Blocked on', 'Count']]
    rows += [[b, c] for b, c in block_c.most_common()]
    rows += [[], [f'Generated: {datetime.now().isoformat(timespec="seconds")}'],
             [f'Pending change-log rows: {pending_cl}']]
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
    return urllib.parse.quote(f"'{tab_name}'!{cell_range}", safe='')

def read_tab(token, tab_name, cols='A1:Z20000'):
    r = sheets_get(token, f"/values/{_range_url(tab_name, cols)}")
    return r.json().get('values', []) if r.status_code == 200 else []

# ── Tab management ─────────────────────────────────────────────────────────
def sync_tabs(token, meta, dry_run=False):
    existing = {s['properties']['title']: s['properties']['sheetId']
                for s in meta.get('sheets', [])}
    reqs = [{'deleteSheet': {'sheetId': existing[o]}} for o in _OBSOLETE_TABS if o in existing]
    reqs += [{'addSheet': {'properties': {'title': t}}} for t in TABS if t not in existing]
    if reqs and not dry_run:
        r = sheets_post(token, ':batchUpdate', {'requests': reqs})
        if r.status_code != 200:
            sys.exit(f"❌ Tab management failed: {r.json()}")
        meta = get_sheet_meta(token)
    order = [s['properties']['title'] for s in sorted(meta.get('sheets', []),
                                                      key=lambda s: s['properties']['index'])]
    if [t for t in order if t in TABS] != TABS:   # contract §2: exact tab order
        ids = {s['properties']['title']: s['properties']['sheetId'] for s in meta.get('sheets', [])}
        moves = [{'updateSheetProperties': {'properties': {'sheetId': ids[t], 'index': n},
                                            'fields': 'index'}} for n, t in enumerate(TABS) if t in ids]
        reqs += moves
        if not dry_run:
            sheets_post(token, ':batchUpdate', {'requests': moves})
    if not reqs:
        print("  ✅ All tabs already in correct state")
        return
    print(f"  {'[dry-run] Would apply' if dry_run else '✅ Applied'} {len(reqs)} tab operation(s)")

def write_tab(token, tab_name, rows, dry_run=False):
    data_rows = max(len(rows) - 1, 0)
    if dry_run:
        print(f"  [dry-run] {tab_name:<14} would write {data_rows:>4} data row(s)")
        return
    sheets_post(token, f"/values/{_range_url(tab_name, 'A1:Z20000')}:clear", {})
    time.sleep(0.3)
    r = sheets_put(token, f"/values/{_range_url(tab_name, 'A1')}", {'values': rows},
                   valueInputOption='RAW')
    if r.status_code != 200:
        sys.exit(f"❌ Write failed for '{tab_name}': {r.text[:200]}")
    print(f"  ✅ {tab_name:<14} {data_rows:>4} data row(s)")
    time.sleep(0.3)

# ── Registry schema: registered / last_updated / closed ───────────────────
_CREATED_FIELDS = ('registered', 'created', 'created_at', 'created_date', 'registered_at', 'intake_date')
_ACTIVITY_FIELDS = ('updated', 'qa_date', 'implemented_date', 'closed')
_CLOSE_KW = ('CLOSED', 'SUBSUMED', 'DUPLICATE', 'PARKED', 'DEFERRED', 'RESOLVED', 'RETIRED')

def _dates(v):
    return [d for d in _DATE_RE.findall(str(v or '')) if d <= TODAY]

def _history(item):
    h = item.get('status_history') or []
    return [e for e in h if isinstance(e, dict)] if isinstance(h, list) else []

def _content_hash(item):
    body = {k: v for k, v in item.items()
            if not k.startswith('_') and k not in ('registered', 'closed', 'last_updated')}
    return hashlib.sha1(json.dumps(body, sort_keys=True, default=str).encode()).hexdigest()

def _backfill_dates(item):
    """Populate registered / closed / last_updated from existing data; blank if none."""
    hist = _history(item)
    hist_dates = [d for e in hist for d in _dates(e.get('date'))]
    created = [d for f in _CREATED_FIELDS for d in _dates(item.get(f))[:1]]
    if not item.get('registered'):
        cand = created or hist_dates
        item['registered'] = min(cand) if cand else ''
    if classify_status(item) in CLOSED_SET and not item.get('closed'):
        cd = [d for f in ('closed_date', 'closed_at', 'closed_on') for d in _dates(item.get(f))]
        for e in hist:
            if any(k in _norm(f"{e.get('to','')} {e.get('event','')}") for k in _CLOSE_KW):
                cd += _dates(e.get('date'))
        cd = cd or _dates(item.get('status'))
        item['closed'] = max(cd) if cd else ''
    pool = hist_dates + created + [d for f in _ACTIVITY_FIELDS for d in _dates(item.get(f))] \
        + _dates(item.get('status'))
    item['last_updated'] = max(pool) if pool else item.get('registered', '')

def prepare_registry(registry, snapshot_hashes):
    """Schema upkeep: one-off backfill per item, then bump last_updated on content change."""
    for item in registry['items']:
        t = item.get('type', '')
        if t and t != t.upper():
            item['type'] = t.upper()
        for f in ('registered', 'last_updated', 'closed'):
            item.setdefault(f, '')
        if not item.get('_dates_v2'):
            _backfill_dates(item)
            item['_dates_v2'] = True
        elif item['id'] not in snapshot_hashes or snapshot_hashes[item['id']] != _content_hash(item):
            item['last_updated'] = TODAY
        if not item.get('closed') and classify_status(item) in CLOSED_SET \
                and item['id'] in snapshot_hashes and snapshot_hashes[item['id']] != _content_hash(item):
            item['closed'] = TODAY   # newly closed since last push

def _save_registry(registry):
    tmp = REGISTRY_PATH.with_suffix('.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(registry, f, indent=2)
    shutil.move(str(tmp), str(REGISTRY_PATH))

def _load_snapshot():
    if SNAPSHOT_PATH.exists():
        return json.load(open(SNAPSHOT_PATH))
    return {'rows': {}, 'hashes': {}}

# ── Change Log (contract §5) ───────────────────────────────────────────────
def _pad(row, n):
    return list(row) + [''] * (n - len(row))

def diff_sheet(sheet_all, snapshot_rows, existing_keys):
    """Compare live sheet All Items to what we last pushed. Returns (new CL rows, assignees)."""
    if not sheet_all or 'ID' not in sheet_all[0]:
        return [], {}
    hdr = sheet_all[0]
    idx = {h: i for i, h in enumerate(hdr)}
    now = datetime.now().strftime('%Y-%m-%dT%H:%M')
    new_rows, assignees = [], {}
    for raw in sheet_all[1:]:
        row = _pad(raw, len(hdr))
        item_id = row[idx['ID']].strip()
        if not item_id:
            continue
        if 'Assignee' in idx and row[idx['Assignee']].strip():
            assignees[item_id] = row[idx['Assignee']].strip()
        pushed = snapshot_rows.get(item_id)
        if pushed is None:
            continue
        for col in CONTRACT_COLS:
            if col in ('Assignee', 'ID') or col not in idx:
                continue
            old = str(pushed[COL[col]]).strip()
            new = row[idx[col]].strip()
            if new == old or (item_id, col, new) in existing_keys:
                continue
            if col in PHASE1_ACCEPTED:
                ok = new in STATUS_ENUM if col == 'Status' else bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', new))
                decision, note = ('PENDING', '') if ok else ('REJECTED', 'invalid value for column')
            elif col in DASHBOARD_COLS and new in ('P0', 'P1', 'P2', 'P3'):
                decision, note = 'APPLIED', 'SOURCE=DASHBOARD'
            else:
                decision, note = 'REJECTED', 'column not accepted from sheet (contract §5.5); reverted'
            new_rows.append([now, item_id, col, old, new, decision,
                             now if decision != 'PENDING' else '', note])
            existing_keys.add((item_id, col, new))
    return new_rows, assignees

def apply_change_log(cl_rows, items_by_id):
    """Apply owner-APPROVED rows and fresh DASHBOARD Priority rows to registry."""
    now, applied = datetime.now().strftime('%Y-%m-%dT%H:%M'), 0
    for r in cl_rows:
        is_dash = r[5] == 'APPLIED' and r[7] == 'SOURCE=DASHBOARD' and not r[7].endswith('done')
        if r[5] != 'APPROVED' and not is_dash:
            continue
        item = items_by_id.get(r[1])
        if not item:
            r[5], r[6], r[7] = 'REJECTED', now, 'ID not in registry'
            continue
        col, val = r[2], r[4]
        if col == 'Status':
            item.setdefault('status_history', []).append(
                {'date': TODAY, 'from': item.get('status', ''), 'to': val,
                 'event': 'Status set via sheet Change Log (owner approved)'})
            item['status'] = val
            item.pop('_contract_status', None)
        elif col == 'Registered':
            item['registered'] = val
        elif col == 'Closed':
            item['closed'] = val
        elif col == 'Priority':
            item['priority'] = val
        if r[5] == 'APPROVED':
            r[5], r[6] = 'APPLIED', now
        else:
            r[7] = 'SOURCE=DASHBOARD; done'
        applied += 1
    return applied

# ── Run report ─────────────────────────────────────────────────────────────
def _print_run_report(items, rows_by_id, stats):
    sc = Counter(r[COL['Status']] or 'Unrouted' for r in rows_by_id.values())
    print("\n" + "═" * 60)
    print(f"  POS REGISTRAR RUN — {datetime.now().strftime('%Y-%m-%d %H:%M')}"
          f"{'  (DRY-RUN)' if stats['dry_run'] else ''}")
    print("═" * 60)
    print(f"  Rows pushed (All Items):     {len(rows_by_id)}")
    print("  Status distribution:")
    for s in STATUS_ENUM:
        print(f"    {s:<16} {sc.get(s, 0):>4}")
    print(f"    {'Unclassified':<16} {sc.get('Unrouted', 0):>4}   (target 0)")
    print(f"  PRIORITY DEFAULTED rows:     {sum(1 for i in items if i.get('_priority_defaulted'))}")
    print(f"  Missing Registered date:     {sum(1 for r in rows_by_id.values() if not r[COL['Registered']])}")
    print(f"  Missing Last updated:        {sum(1 for r in rows_by_id.values() if not r[COL['Last updated']])}")
    print(f"  Closed-type missing Closed:  {sum(1 for r in rows_by_id.values() if r[COL['Status']] in CLOSED_SET and not r[COL['Closed']])}")
    print(f"  Area recognised:             {sum(1 for r in rows_by_id.values() if r[COL['Area']])}"
          f"  (raw values dropped to blank: {stats['area_dropped']})")
    print(f"  Live blockers (Blocked on):  {stats['live_blockers']}")
    print(f"  Stale blockers dropped:      {stats['stale_blockers']} items"
          f"  (old Blockers tab rows: {stats['old_blocker_rows']})")
    print(f"  Change Log: new {stats['cl_new']} · applied {stats['cl_applied']} · pending {stats['cl_pending']}")
    print("═" * 60 + "\n")

# ── PUSH (REGISTRAR run) ───────────────────────────────────────────────────
def cmd_push(dry_run=False):
    print(f"\n── {'DRY-RUN' if dry_run else 'PUSH'}: registry.json → Google Sheets (contract v1.4) ──")
    registry = json.load(open(REGISTRY_PATH))
    items    = registry['items']
    items_by_id = {i['id']: i for i in items}
    _ITEMS_BY_ID.clear()
    _ITEMS_BY_ID.update({k.upper(): v for k, v in items_by_id.items()})
    snapshot = _load_snapshot()
    print(f"  Loaded {len(items)} items · snapshot rows: {len(snapshot['rows'])}")

    token = get_access_token()
    meta  = get_sheet_meta(token)
    print(f"  Sheet: {meta['properties']['title']}")
    tabs  = [s['properties']['title'] for s in meta.get('sheets', [])]

    # 1. Change Log diff BEFORE overwriting the sheet
    sheet_all = read_tab(token, 'All Items') if 'All Items' in tabs else []
    old_blk   = read_tab(token, 'Blockers') if 'Blockers' in tabs else []
    cl_rows   = [_pad(r, 8)[:8] for r in (read_tab(token, 'Change Log', 'A1:H20000')
                                          if 'Change Log' in tabs else [])[1:]]
    keys      = {(r[1], r[2], r[4]) for r in cl_rows}
    new_cl, assignees = diff_sheet(sheet_all, snapshot['rows'], keys)
    cl_rows  += new_cl
    cl_applied = apply_change_log(cl_rows, items_by_id)

    # 2. Registry schema upkeep + rows
    prepare_registry(registry, snapshot.get('hashes', {}))
    rows_by_id = build_all_rows(items, assignees)
    pending = sum(1 for r in cl_rows if r[5] == 'PENDING')

    # 3. Write sheet
    sync_tabs(token, meta, dry_run)
    for tab in TABS:
        if tab == 'Change Log':
            write_tab(token, tab, [CL_COLS] + cl_rows, dry_run)
        elif tab == 'Summary':
            write_tab(token, tab, _build_summary(rows_by_id, pending), dry_run)
        else:
            write_tab(token, tab, build_tab_rows(rows_by_id, tab), dry_run)

    # 4. Persist registry + snapshot of exactly what was pushed
    if not dry_run:
        _save_registry(registry)
        json.dump({'generated': datetime.now().isoformat(timespec='seconds'),
                   'rows': rows_by_id,
                   'hashes': {i['id']: _content_hash(i) for i in items}},
                  open(SNAPSHOT_PATH, 'w'), indent=0)

    with_raw = [i for i in items if _raw_blockers(i) or 'BLOCKED' in _norm(i.get('status'))]
    live = sum(1 for r in rows_by_id.values() if r[COL['Blocked on']])
    _print_run_report(items, rows_by_id, {
        'dry_run': dry_run, 'live_blockers': live,
        'stale_blockers': sum(1 for i in with_raw if not rows_by_id[i['id']][COL['Blocked on']]),
        'old_blocker_rows': max(len(old_blk) - 1, 0),
        'area_dropped': sum(1 for i in items if str(i.get('area') or '').strip()
                            and not rows_by_id[i['id']][COL['Area']]),
        'cl_new': len(new_cl), 'cl_applied': cl_applied, 'cl_pending': pending,
    })

# ── DIFF (read-only) ───────────────────────────────────────────────────────
def cmd_diff():
    token = get_access_token()
    sheet_all = read_tab(token, 'All Items')
    new_cl, _ = diff_sheet(sheet_all, _load_snapshot()['rows'], set())
    if not new_cl:
        print("  ✅ No sheet edits since last push")
    for r in new_cl:
        print(f"  {r[1]:<12} {r[2]:<12} '{r[3][:30]}' → '{r[4][:30]}'  [{r[5]}] {r[7]}")
    print("  No writes made. Run --push to log these to the Change Log tab.")

def main():
    p = argparse.ArgumentParser(description='MyGenie POS — Google Sheets REGISTRAR (contract v1.4)')
    p.add_argument('--push', action='store_true', help='REGISTRAR run: Change Log diff + push')
    p.add_argument('--dry-run', action='store_true', dest='dry_run', help='Full run, no writes')
    p.add_argument('--diff', action='store_true', help='Read-only: list sheet edits since last push')
    p.add_argument('--pull', action='store_true', help=argparse.SUPPRESS)
    args = p.parse_args()

    if args.pull:
        sys.exit("⛔ --pull is disabled (contract §5): sheet → registry only via Change Log + "
                 "owner approval. Use --diff to preview edits, --push to log them.")
    if not (args.push or args.dry_run or args.diff):
        p.print_help()
        sys.exit(0)
    missing = [n for n, v in [('GOOGLE_OAUTH_CLIENT_ID', CLIENT_ID),
                              ('GOOGLE_OAUTH_CLIENT_SECRET', CLIENT_SECRET),
                              ('GOOGLE_REFRESH_TOKEN', REFRESH_TOKEN),
                              ('GOOGLE_SHEET_ID', SHEET_ID)] if not v]
    if missing:
        sys.exit(f"❌ Missing env var(s) in {ENV_PATH}: {', '.join(missing)}")
    if args.diff:
        cmd_diff()
    else:
        cmd_push(dry_run=args.dry_run)

if __name__ == '__main__':
    main()
