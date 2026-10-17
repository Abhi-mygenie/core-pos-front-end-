#!/usr/bin/env python3
# CR-419: sheets_sync.py rewritten for contract v1.5 compliance
# Push: registry.json → Google Sheet (10 tabs, 22-col contract format)
# Diff: sheet human edits → Change Log tab (no direct registry write)
# Auth: OAuth2 with stored refresh token
#
# Usage:
#   python3 sheets_sync.py --dry-run            # validate credentials + sheet
#   python3 sheets_sync.py --push               # registry.json → all tabs  (SHEET PUSH role)
#   python3 sheets_sync.py --pull --dry-run     # show drift, no writes      (SHEET DRIFT role)

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

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR    = Path(__file__).parent
ENV_PATH      = SCRIPT_DIR / '.env'
REGISTRY_PATH = SCRIPT_DIR.parent / 'control' / 'registry.json'

load_dotenv(ENV_PATH)

CLIENT_ID     = os.getenv('GOOGLE_OAUTH_CLIENT_ID',    '').strip().strip('"').strip("'")
CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET','').strip().strip('"').strip("'")
REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN',      '').strip().strip('"').strip("'")
_raw_id       = os.getenv('GOOGLE_SHEET_ID',           '').strip().strip('"').strip("'")
SHEET_ID      = _raw_id.split('/')[0]

# ── Contract v1.5 columns — 22 cols A–V on every tab ──────────────────────
CONTRACT_COLS = [
    'Project', 'ID', 'Type', 'Title', 'Status', 'Status note',
    'Priority', 'Risk', 'Area', 'Sprint', 'Blocked on', 'Owner action',
    'Assignee', 'Registered', 'Last updated', 'Closed',
    'Related', 'Artefacts', 'Code markers', 'Files', 'Notes', 'Money path',
]
# Col W = Release week — owner/dashboard only; agents never read/write/clear it

# ── Tabs — contract §2, exact names, exact order ──────────────────────────
TABS = [
    'All Items', 'Intake', 'Planning', 'Implemented', 'QA',
    'Smoke', 'Closed', 'Blockers', 'Change Log', 'Summary',
]

# ── Obsolete tabs to delete ────────────────────────────────────────────────
_OBSOLETE_TABS = [
    'Implementation', "QA'd", 'Smoke Test',          # created by pre-contract push
    'Open Only', 'QA / Smoke', 'Blocked / Parked',   # legacy v1 names
]

# ── POS area list (brief §3) ───────────────────────────────────────────────
# CR-428: 13-module taxonomy (replaces 18-value list)
POS_AREAS = {
    'Printing / Printer Agent', 'Reports / Analytics', 'PMS / Rooms',
    'Inventory / Stock',        'Payments / Coupons / Credit',
    'Settings / Configuration', 'Permissions / Security',
    'Menu / Order Entry',       'Aggregator / Sockets', 'Delivery',
    'CRM / Customer Intelligence', 'Tooling / Control Layer', 'Other',
}

# ── Change Log columns (contract §5) ──────────────────────────────────────
CL_COLS = [
    'Logged at', 'ID', 'Column', 'Old value (registry)',
    'New value (sheet)', 'Decision', 'Decided at', 'Note',
]

# ── Money path heuristics ──────────────────────────────────────────────────
_MONEY_KEYWORDS = {
    'payment', 'billing', 'folio', 'settlement', 'tax', 'gst', 'vat',
    'discount', 'coupon', 'wallet', 'invoice', 'charge', 'receipt',
}
_MONEY_AREAS = {  # CR-428: updated to 13-module names
    'Payments / Coupons / Credit',
    'PMS / Rooms',
    'Inventory / Stock',
}

# ── Phase 1 columns accepted from sheet (contract §5 + §8.1) ──────────────
# PENDING → owner approves → applied to registry
# All other agent-owned cols diffed too but logged as REJECTED (not editable in Phase 1)
# Excluded from diff entirely (§5.6): Assignee, Release week
_PHASE1_ACCEPTED  = {'Status', 'Registered', 'Closed', 'Priority', 'Blocked on'}  # BUG-541
_EXCLUDED_FROM_DIFF = {'Assignee', 'Release week', 'Last updated'}                  # BUG-541 — Last updated is agent-computed-only (§5)

# ── Status → stage tab ────────────────────────────────────────────────────
_STATUS_TO_TAB = {
    'INTAKE': 'Intake', 'PLANNING': 'Planning', 'IMPLEMENTED': 'Implemented',
    'QA': 'QA', 'SMOKE': 'Smoke',
    'CLOSED': 'Closed', 'PARKED': 'Closed', 'DUPLICATE': 'Closed',
}

# ── Code marker cache (built once per run) ────────────────────────────────
_code_marker_cache = None


# ── Status normalisation ───────────────────────────────────────────────────
def to_contract_status(raw):
    """Map raw registry status → (contract_status, blocked_party).

    Returns ('UNCLASSIFIED', ...) for strings that match nothing —
    caller sets Status=INTAKE and prepends 'UNCLASSIFIED: ' to Status note.
    Returns ('', '') for blank/None — treated as Unrouted in Summary.
    """
    s = str(raw or '').upper().strip()
    if not s:
        return '', ''

    blocked = ''
    if any(k in s for k in [                              # CR-420 G3d
        'BACKEND-BLOCKED', 'BACKEND_BLOCKED',
        'HOLD — BACKEND', 'HOLD - BACKEND',
        'FE-VERIFIED, BE-FOLLOWUP',
        'INVESTIGATED_ROOT_CAUSE',
        'BACKEND_BRIEF_FILED', 'BACKEND PENDING',
    ]):
        blocked = 'BACKEND'
    elif 'CRM-BLOCKED' in s or 'CRM_BLOCKED' in s:
        blocked = 'CRM'
    elif 'OWNER-BLOCKED' in s:
        blocked = 'OWNER'

    if 'DUPLICATE' in s or 'CLOSED_DUPLICATE' in s:
        return 'DUPLICATE', ''

    # Early PARKED check — must run before CLOSED because DEFERRED-TO-* strings
    # often contain "CLOSED" in their prose notes (e.g. "Gate 5 CLOSED 2026-09-24")
    # CR-420 G2 fix: startswith catches this regardless of prose content
    if s.startswith('PARKED') or s.startswith('DEFERRED-TO-'):
        return 'PARKED', ''

    # OD-420-01: INVESTIGATION COMPLETE + BACKEND suffix → PLANNING (blocked overrides)
    if 'INVESTIGATION COMPLETE' in s and blocked == 'BACKEND':  # CR-420 OD-420-01
        return 'PLANNING', 'BACKEND'

    if any(k in s for k in [
        'CLOSED', 'OWNER VERIFIED', 'OWNER_VERIFIED', 'SUBSUMED', 'RETIRED',
        'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN', 'BACKEND_FIXED',
        'COULD NOT REPRODUCE', 'CANNOT REPRODUCE', 'NOT REPRODUCIBLE',
        'CLOSED — ', 'CLOSED_',
        'SHIPPED',              # OD-419-05
        'INVESTIGATION COMPLETE', 'SUPERSEDED', 'SPLIT →', 'SPLIT_',  # CR-420 G3a
        'MAIN VERIFIED',        # CR-420 G3a + OD-420-02
    ]):
        return 'CLOSED', ''

    if 'PARKED' in s or ('DEFERRED' in s and not re.match(r'^GATE[_\s]?\d', s)):
        return 'PARKED', ''  # CR-420 G2 secondary (catches PARKED anywhere in string)

    if any(k in s for k in [
        'AWAITING OWNER SMOKE', 'AWAITING_OWNER_SMOKE',
        'GATE_6', 'GATE 6', 'OWNER SMOKE', 'OWNER_SMOKE',
    ]):
        return 'SMOKE', blocked

    if any(k in s for k in [
        'GATE_5B', 'GATE 5B', 'QA PASS', 'QA_PASS',
        'GATE_5B_QA', 'CONDITIONAL_PASS',
    ]):
        # "QA PASS — AWAITING OWNER SMOKE" must route to SMOKE — already caught above
        return 'QA', blocked

    if any(k in s for k in [
        'GATE_4', 'GATE 4', 'GATE_5A', 'GATE 5A', 'GATE_5A_IMPLEMENTED',
        'IMPLEMENTED', 'GATE_4_GO',
    ]):
        return 'IMPLEMENTED', blocked

    if any(k in s for k in [
        'GATE_2', 'GATE 2', 'GATE_3', 'GATE 3',
        'IMPACT_ANALYSIS', 'PLAN_COMPLETE', 'GATE_2_CLOSED', 'GATE_3_PLAN',
    ]):
        return 'PLANNING', blocked

    if any(k in s for k in [
        'GATE_1', 'GATE 1', 'GATE_1_INTAKE', 'INTAKE', 'NOT STARTED',
        'NOT_STARTED', 'REGISTERED',
    ]):
        return 'INTAKE', blocked

    # CR-420 G3b: extended QA patterns
    if any(k in s for k in [
        'QA-VERIFIED', 'QA_VERIFIED', 'FIXED + QA-VERIFIED',
        'FIXED-BY-CONSTRUCTION + QA-VERIFIED', 'UNIT-VERIFIED',
        'GATE_5_PENDING_QA',
    ]):
        return 'QA', blocked

    # CR-420 G3c: extended IMPLEMENTED patterns
    if 'IMPLEMENTATION IN PROGRESS' in s:
        return 'IMPLEMENTED', blocked
    if re.search(r'PHASE\s*\d+\s*COMPLETE', s):
        return 'IMPLEMENTED', blocked

    # CR-420 G3d: BACKEND-blocked with no other stage → INTAKE + blocked set
    if blocked:
        return 'INTAKE', blocked

    return 'UNCLASSIFIED', blocked


def stage_tab(contract_status):
    """Contract Status → tab name. None = All Items only (Unrouted)."""
    return _STATUS_TO_TAB.get(contract_status)


# ── Field helpers ──────────────────────────────────────────────────────────
# CR-428: old-18 → new-13 mapping
_OLD_TO_NEW = {
    'Printing':           'Printing / Printer Agent',
    'Reports':            'Reports / Analytics',
    'Inventory':          'Inventory / Stock',
    'Menu Management':    'Menu / Order Entry',
    'Payments':           'Payments / Coupons / Credit',
    'PMS Check-In':       'PMS / Rooms',
    'PMS Bookings':       'PMS / Rooms',
    'PMS Folio':          'PMS / Rooms',
    'CRM':                'CRM / Customer Intelligence',
    'Settings':           'Settings / Configuration',
    'Auth / Permissions': 'Permissions / Security',
    'Smart Purchase':     'Inventory / Stock',
    'Sidebar / Nav':      'Other',
    'Sockets':            'Aggregator / Sockets',
    'Order Entry':        'Menu / Order Entry',
    'Dashboard':          'Reports / Analytics',
    'Expense':            'Reports / Analytics',
    'Tooling':            'Tooling / Control Layer',
    'Old POS':            '',   # title prefix only — not a module
}


def normalise_area(raw):  # CR-428: 13-module normalisation
    if not raw:
        return ''
    r = str(raw).strip()
    # 1. Already a valid 13-module value
    if r in POS_AREAS:
        return r
    # 2. Old-18 exact match
    if r in _OLD_TO_NEW:
        return _OLD_TO_NEW[r]
    rl = r.lower()
    # 3. Case-insensitive old-18 match
    for old, new in _OLD_TO_NEW.items():
        if old.lower() == rl:
            return new
    # 4. Keyword triage for 150+ custom legacy strings
    if any(k in rl for k in ['pms', 'room module', 'folio', 'checkin', 'check-in',
                               'booking', 'housekeep', 'laundry', 'night audit',
                               'channel manager', 'front desk', 'tape chart',
                               'guest folio', 'checkout drawer']):
        return 'PMS / Rooms'
    if any(k in rl for k in ['print', 'printer', 'kot', 'bill print', 'receipt',
                               'direct print', 'print style', 'bill content',
                               'bill/kot', 'auto print']):
        return 'Printing / Printer Agent'
    if any(k in rl for k in ['report', 'insight', 'daily summary', 'cancellation report',
                               'pl report', 'wastage report', 'food court report',
                               'order report', 'purchase report', 'analytics',
                               'stock audit', 'reports /', '/reports', 'insights /',
                               'expense report', 'settlement report']):
        return 'Reports / Analytics'
    if any(k in rl for k in ['inventory', 'stock', 'ingredient', 'recipe',
                               'smart purchase', 'sub-recipe', 'auto.*shopping',
                               'stock update', 'purchase entry']):
        return 'Inventory / Stock'
    if any(k in rl for k in ['payment', 'discount', 'coupon', 'credit',
                               'collect bill', 'collect payment', 'tax',
                               'wallet', 'razorpay', 'billing', 'qsr.*payment',
                               'collect.*pay', 'order.*amount']):
        return 'Payments / Coupons / Credit'
    if any(k in rl for k in ['settings', 'config', 'restaurant setup', 'wizard',
                               'onboarding', 'aggregator setup', 'table management',
                               'restaurant settings', 'statusconfig',
                               'restaurant type', 'setup.*step', 'channels']):
        return 'Settings / Configuration'
    if any(k in rl for k in ['permission', 'auth', 'login', 'security',
                               'protected', 'role', '401']):
        return 'Permissions / Security'
    if any(k in rl for k in ['menu', 'order entry', 'order-entry', 'cart',
                               'variation', 'addon', 'product', 'popular',
                               'category', 'qsr', 'walk.*in', 'place.*order',
                               'cancel.*item', 'schedule.*toggle', 'bulk editor',
                               'product.*form', 'order.*card', 'table.*card']):
        return 'Menu / Order Entry'
    if any(k in rl for k in ['aggregator', 'socket', 'swiggy', 'zomato',
                               'scan.*order', 'notif', 'buzzer', 'fcm',
                               'sound.*manager', 'scan.*pop']):
        return 'Aggregator / Sockets'
    if 'delivery' in rl:
        return 'Delivery'
    if any(k in rl for k in ['crm', 'customer intel', 'customer note',
                               'loyalty', 'historical note']):
        return 'CRM / Customer Intelligence'
    if any(k in rl for k in ['tooling', 'control layer', 'dev tool',
                               'documentation', 'testing infra',
                               'agent.*control', 'control.*layer', 'shared.*control']):
        return 'Tooling / Control Layer'
    # 5. Unrecognised → blank
    return ''


def compute_artefacts(item):
    parts = []
    if item.get('intake_doc'):
        parts.append('INTAKE')
    if item.get('impact_doc') or item.get('impact_analysis') or item.get('impact_analysis_doc'):
        parts.append('IMPACT_ANALYSIS')
    if (item.get('plan_doc') or item.get('implementation_plan')
            or item.get('implementation_plan_doc')):
        parts.append('IMPLEMENTATION_PLAN')
    if item.get('qa_handover_doc') or item.get('qa_handover'):
        parts.append('QA_HANDOVER')
    if item.get('qa_report'):
        parts.append('QA_REPORT')
    return ', '.join(parts)


def compute_money_path(item):
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


def _build_code_marker_cache():
    global _code_marker_cache
    if _code_marker_cache is not None:
        return _code_marker_cache
    _code_marker_cache = set()
    try:
        src_dir = SCRIPT_DIR.parent.parent / 'frontend' / 'src'
        be_dir  = SCRIPT_DIR.parent.parent / 'backend'
        for search_dir in [src_dir, be_dir]:
            if not search_dir.exists():
                continue
            result = subprocess.run(
                ['grep', '-roh', r'CR-[0-9A-Z-]*\|BUG-[0-9A-Z-]*',
                 str(search_dir)],
                capture_output=True, text=True, timeout=30,
            )
            for match in result.stdout.splitlines():
                m = match.strip()
                if m:
                    _code_marker_cache.add(m)
    except Exception:
        pass
    return _code_marker_cache


def compute_code_markers(item_id):
    cache = _build_code_marker_cache()
    return 'YES' if item_id in cache else 'no'


def compute_registered(item):  # CR-420 G9
    for field in ('registered', 'created', 'created_at', 'intake_date',
                  'date', 'registered_at', 'created_date', 'registered_date'):
        val = str(item.get(field, '') or '').strip()
        if val:
            val = val[:10]
            if re.match(r'\d{4}-\d{2}-\d{2}', val):
                return val
    # G9: try reading **Date:** from intake_doc file (OD-420-07)
    intake_path = str(item.get('intake_doc', '') or '').strip()
    if intake_path:
        full = SCRIPT_DIR.parent / intake_path
        if full.exists():
            try:
                with open(full) as f:
                    for line in f.readlines()[:15]:
                        ll = line.lower()
                        if '**date**' in ll or '**registered**' in ll:
                            m = re.search(r'(\d{4}-\d{2}-\d{2})', line)
                            if m:
                                return m.group(1)
            except Exception:
                pass
    return ''


def compute_last_updated(item):  # CR-420 G6
    """Return last meaningful change date; fall back to push date."""
    for field in ('last_updated', 'updated', 'updated_at',
                  'implemented_date', 'qa_date', 'qa_smoke_date',
                  'closed_at', 'implemented_at'):
        val = str(item.get(field, '') or '').strip()
        if val and re.match(r'\d{4}-\d{2}-\d{2}', val[:10]):
            return val[:10]
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def _flatten(v):
    if isinstance(v, list):
        return ', '.join(str(x) for x in v if x)
    if isinstance(v, dict):
        return ''
    return str(v).strip() if v is not None else ''


# ── Row builder ────────────────────────────────────────────────────────────
_ID_PREFIX_TO_TYPE = {'BUG': 'BUG', 'CR': 'CR', 'INV': 'INV',
                      'PROD': 'INCIDENT', 'GAP': 'GAP'}

def _type_raw(item):  # CR-420 G4
    t = str(item.get('type', '') or '').strip().upper()
    if t == 'INVESTIGATION':
        return 'INV'
    if t in ('BUG', 'CR', 'INV', 'INCIDENT', 'GAP'):
        return t
    if not t:
        for prefix, mapped in _ID_PREFIX_TO_TYPE.items():
            if str(item.get('id', '')).startswith(prefix + '-'):
                return mapped
    return t


def to_contract_row(item):
    """Build a 22-element list for one registry item. Never includes col W."""
    raw_status = str(item.get('status', '') or '')
    contract_status, blocked_party = to_contract_status(raw_status)

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
        severity = str(item.get('severity', '') or '').strip().upper()
        _sev_map = {
            'CRITICAL': 'P0', 'HIGH': 'P1', 'MEDIUM': 'P2', 'LOW': 'P3',
            'P0': 'P0', 'P1': 'P1', 'P2': 'P2', 'P3': 'P3',
        }
        priority = _sev_map.get(severity, '')
        if not priority:
            priority = 'P2'
            notes_append = 'PRIORITY DEFAULTED'

    risk = str(item.get('risk', '') or '').strip().upper()
    if risk not in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'):
        risk = ''

    area = normalise_area(item.get('area', ''))

    # Build related_ids first — needed by G5 blocked_on ID check  # CR-420
    related_ids = []
    rel = item.get('related')
    if rel:
        related_ids += [str(x).strip()
                        for x in (rel if isinstance(rel, list) else [rel])]
    dep = item.get('depends_on')
    if dep:
        related_ids += [str(x).strip()
                        for x in (dep if isinstance(dep, list) else [dep])]

    _ID_RE = re.compile(r'^(CR|BUG|PROD|INV|PROD-HOTFIX)-\d')  # CR-420 G5
    blocked_on = ''
    if contract_status not in ('CLOSED', 'PARKED', 'DUPLICATE'):
        _raw_bo = str(item.get('blocked_by', '') or blocked_party or '').strip()
        if _raw_bo and _ID_RE.match(_raw_bo):
            # Item ID in Blocked on → move to Related, leave Blocked on blank
            if _raw_bo not in related_ids:
                related_ids.append(_raw_bo)
        else:
            blocked_on = _raw_bo

    owner_action = ''
    if contract_status == 'SMOKE':
        owner_action = f"Smoke test: {str(item.get('title',''))}"[:100]
    elif blocked_on == 'OWNER':
        owner_action = 'Decision needed'

    registered   = compute_registered(item)
    last_updated = compute_last_updated(item)   # CR-420 G6

    closed = ''
    if contract_status in ('CLOSED', 'PARKED', 'DUPLICATE'):
        closed = str(
            item.get('closed_at') or item.get('implemented_date') or
            item.get('closed_date') or item.get('implemented_at') or ''
        ).strip()[:10]

    related = ', '.join(r for r in related_ids if r)

    artefacts    = compute_artefacts(item)
    code_markers = compute_code_markers(item['id'])
    files        = _flatten(item.get('files', ''))

    notes_base = str(item.get('notes', '') or '').strip()
    notes = (notes_base + (' | ' if notes_base and notes_append else '')
             + notes_append).strip()

    money_path = compute_money_path(item)

    return [
        'POS',
        item['id'],
        _type_raw(item),                                   # CR-420 G4
        str(item.get('title', '') or '')[:500],
        contract_status,
        status_note[:500],
        priority,
        risk,
        area,
        str(item.get('sprint_key', '') or ''),
        blocked_on[:200],
        owner_action,
        '',                    # Assignee — NEVER written by agent
        registered,
        last_updated,
        closed,
        related[:200],
        artefacts,
        code_markers,
        files[:300],
        notes[:500],
        money_path,
    ]


# ── Tab row builders ───────────────────────────────────────────────────────
def build_stage_tab_rows(items, tab_name):
    """Filter by stage tab using the normalised Status from to_contract_row
    (consistent with what is written in All Items — UNCLASSIFIED → INTAKE)."""
    rows = [CONTRACT_COLS]
    for item in items:
        row = to_contract_row(item)
        row_status = row[4]   # col 4 = Status (already normalised)
        if stage_tab(row_status) == tab_name:
            rows.append(row)
    return rows


def build_blockers_rows(items):
    rows = [CONTRACT_COLS]
    for item in items:
        row = to_contract_row(item)
        if row[10].strip():      # col 10 = Blocked on
            rows.append(row)
    return rows


def build_summary_rows(items, pending_cl_count=0):
    """Contract §6: Status×count + Priority×count (open) + Blocked on×count."""
    STATUS_ENUM  = ['INTAKE', 'PLANNING', 'IMPLEMENTED', 'QA', 'SMOKE',
                    'CLOSED', 'PARKED', 'DUPLICATE']
    status_counts  = {s: 0 for s in STATUS_ENUM}
    status_counts['Unrouted'] = 0
    priority_counts = {'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0}
    blocked_counts  = Counter()
    open_statuses   = {'INTAKE', 'PLANNING', 'IMPLEMENTED', 'QA', 'SMOKE'}

    for item in items:
        cs, _ = to_contract_status(item.get('status', ''))
        if cs == 'UNCLASSIFIED':
            cs = 'INTAKE'
        if cs in status_counts:
            status_counts[cs] += 1
        else:
            status_counts['Unrouted'] += 1

        row = to_contract_row(item)
        if cs in open_statuses:
            p = row[6]
            if p in priority_counts:
                priority_counts[p] += 1

        b = row[10].strip()
        if b:
            blocked_counts[b] += 1

    rows = [
        ['Status', 'Count'],
        *[[s, status_counts.get(s, 0)] for s in STATUS_ENUM],
        ['Unrouted', status_counts['Unrouted']],
        [],
        ['Priority (open items)', 'Count'],
        *[[p, priority_counts[p]] for p in ['P0', 'P1', 'P2', 'P3']],
        [],
        ['Blocked on', 'Count'],                          # CR-420 G7
        *[[p, blocked_counts.get(p, 0)]
          for p in ['BACKEND', 'POS', 'CRM', 'SO', 'INV',
                    'INFRA', 'OWNER', 'OPS', 'INTERNAL']],
        *[[b, c] for b, c in sorted(blocked_counts.items(), key=lambda x: -x[1])
          if b not in {'BACKEND', 'POS', 'CRM', 'SO', 'INV',
                       'INFRA', 'OWNER', 'OPS', 'INTERNAL'}],
        [],
        [datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), ''],
        [f'Pending change-log rows: {pending_cl_count}', ''],
    ]
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


# ── Stage / summary tab writer (clear A:V then write) ─────────────────────
def write_tab(token, tab_name, rows, dry_run=False):
    """Clear cols A–V of a stage/summary tab then write. Never touches W+."""
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


# ── All Items in-place updater ─────────────────────────────────────────────
def update_all_items_inplace(token, items, dry_run=False):
    """Update All Items in-place by ID. Never clears. Never writes col W+.

    1. Read current A1:V  (22 cols — skip W entirely)
    2. id → sheet row number map  (ID = col B = index 1)
    3. For each registry item: update matched row OR queue append
    4. Batch-POST existing rows; append new rows
    """
    enc_read = _range_url('All Items', 'A1:V10000')
    r = sheets_get(token, f'/values/{enc_read}')
    if r.status_code != 200:
        print(f"  ⚠  Could not read All Items ({r.status_code}) — skipping in-place update")
        return

    existing_data = r.json().get('values', [])

    # Build id → 1-indexed row number
    # Check header first — if col B ≠ 'ID', sheet is in wrong format (one-time migration)
    if not existing_data or len(existing_data[0]) < 2 or existing_data[0][1].strip() != 'ID':
        print("  ⚠  All Items header is not in contract format "
              f"(col B = '{existing_data[0][1] if existing_data and len(existing_data[0])>1 else 'empty'}' "
              "instead of 'ID'). Performing one-time clear + fresh write.")
        if dry_run:
            print(f"  [dry-run] All Items: would clear + write {len(items)} rows fresh")
            return
        # Clear A1:Z10000 (one-time only — sheet is in broken state)
        enc_clear = _range_url('All Items', 'A1:Z10000')
        r = sheets_post(token, f'/values/{enc_clear}:clear', {})
        if r.status_code not in (200, 204):
            print(f"  ⚠  Clear warning: {r.status_code}")
        time.sleep(0.5)
        # Write header + all rows from scratch
        all_rows = [CONTRACT_COLS] + [to_contract_row(i) for i in items]
        enc_write = _range_url('All Items', 'A1')
        r = sheets_put(token, f'/values/{enc_write}',
                       {'values': all_rows}, valueInputOption='RAW')
        if r.status_code != 200:
            try:
                msg = r.json().get('error', {}).get('message', r.text[:80])
            except Exception:
                msg = r.text[:80]
            print(f"  ⚠  Fresh write failed: {msg}")
        else:
            print(f"  ✅ All Items  {len(items):>4} rows written fresh "
                  "(one-time format migration)")
        time.sleep(0.3)
        return

    # Normal path — sheet is in contract format, update in-place
    id_to_row = {}
    for i, row in enumerate(existing_data):
        if i == 0:
            continue   # header
        if len(row) > 1 and row[1]:
            id_to_row[row[1].strip()] = i + 1  # 1-indexed for Sheets API

    update_data  = []   # value ranges for batchUpdate
    append_rows  = []   # new items not yet in sheet

    for item in items:
        contract_row = to_contract_row(item)
        item_id = item['id']
        if item_id in id_to_row:
            n = id_to_row[item_id]
            # CR-420 G1: skip col M (Assignee). Write A:L then N:V.
            update_data.append({
                'range':  f"'All Items'!A{n}:L{n}",
                'values': [contract_row[:12]],
            })
            update_data.append({
                'range':  f"'All Items'!N{n}:V{n}",
                'values': [contract_row[13:]],
            })
        else:
            # New row — same split for append
            append_rows.append((contract_row[:12], contract_row[13:]))

    if dry_run:
        print(f"  [dry-run] All Items: {len(update_data)} in-place updates, "
              f"{len(append_rows)} new rows to append")
        return

    # Write header if sheet was empty
    if not existing_data:
        enc_h = _range_url('All Items', 'A1')
        sheets_put(token, f'/values/{enc_h}',
                   {'values': [CONTRACT_COLS]}, valueInputOption='RAW')
        print("  ✅ All Items header written (was empty)")
        time.sleep(0.3)

    # Batch update existing rows (POST /values:batchUpdate)
    BATCH = 500
    updated_count = 0
    for i in range(0, len(update_data), BATCH):
        chunk = update_data[i:i + BATCH]
        r = sheets_post(token, '/values:batchUpdate',
                        {'valueInputOption': 'RAW', 'data': chunk})
        if r.status_code != 200:
            try:
                msg = r.json().get('error', {}).get('message', r.text[:80])
            except Exception:
                msg = r.text[:80]
            print(f"  ⚠  Batch update error: {msg}")
        else:
            updated_count += len(chunk)
        time.sleep(0.5)

    # Append new rows — batchUpdate with A:L + N:V per row (CR-420 G1: skip col M)
    if append_rows:
        next_row = len(existing_data) + 1
        append_data = []
        for idx, (row_al, row_nv) in enumerate(append_rows):
            n = next_row + idx
            append_data.append({'range': f"'All Items'!A{n}:L{n}", 'values': [row_al]})
            append_data.append({'range': f"'All Items'!N{n}:V{n}", 'values': [row_nv]})
        for i in range(0, len(append_data), BATCH):
            chunk = append_data[i:i + BATCH]
            r = sheets_post(token, '/values:batchUpdate',
                            {'valueInputOption': 'RAW', 'data': chunk})
            if r.status_code != 200:
                try:
                    msg = r.json().get('error', {}).get('message', r.text[:80])
                except Exception:
                    msg = r.text[:80]
                print(f"  ⚠  Append error: {msg}")
            time.sleep(0.5)
        print(f"  ✅ All Items  {updated_count:>4} updated "
              f"+ {len(append_rows)} appended")
    else:
        print(f"  ✅ All Items  {updated_count:>4} updated, 0 appended")


# ── Change Log helpers ─────────────────────────────────────────────────────
def get_pending_cl_count(token):
    enc = _range_url('Change Log', 'A1:H2000')
    r = sheets_get(token, f'/values/{enc}')
    if r.status_code != 200:
        return 0
    rows = r.json().get('values', [])
    return sum(1 for row in rows[1:] if len(row) > 5 and row[5].strip() == 'PENDING')


def ensure_change_log_header(token, dry_run=False):
    enc = _range_url('Change Log', 'A1:H1')
    r = sheets_get(token, f'/values/{enc}')
    existing = r.json().get('values', []) if r.status_code == 200 else []
    if not existing or not existing[0]:
        if not dry_run:
            enc_w = _range_url('Change Log', 'A1')
            sheets_put(token, f'/values/{enc_w}',
                       {'values': [CL_COLS]}, valueInputOption='RAW')
            print("  ✅ Change Log header written")


def append_to_change_log(token, cl_rows, dry_run=False):
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
        try:
            msg = r.json().get('error', {}).get('message', r.text[:80])
        except Exception:
            msg = r.text[:80]
        print(f"  ⚠  Change Log append error: {msg}")
    else:
        print(f"  ✅ Change Log  {len(cl_rows):>4} row(s) appended")
    time.sleep(0.3)


# ── Run report ─────────────────────────────────────────────────────────────
def _print_run_report(items, dry_run):
    label = "(dry-run) " if dry_run else ""
    sc = Counter()
    unclassified = []
    defaulted    = []
    no_reg       = []

    _sev_map = {'CRITICAL':'P0','HIGH':'P1','MEDIUM':'P2','LOW':'P3',
                'P0':'P0','P1':'P1','P2':'P2','P3':'P3'}

    for item in items:
        cs, _ = to_contract_status(item.get('status', ''))
        if cs == 'UNCLASSIFIED':
            sc['INTAKE'] += 1
            unclassified.append(item['id'])
        elif cs:
            sc[cs] += 1
        else:
            sc['Unrouted'] += 1

        p   = str(item.get('priority','') or '').strip().upper()
        sev = str(item.get('severity','') or '').strip().upper()
        if p not in ('P0','P1','P2','P3') and _sev_map.get(sev,'') == '':
            defaulted.append(item['id'])

        if not compute_registered(item):
            no_reg.append(item['id'])

    order = ['INTAKE','PLANNING','IMPLEMENTED','QA','SMOKE',
             'CLOSED','PARKED','DUPLICATE','Unrouted']
    print(f"\n  ── Run report {label}──")
    print(f"  Total rows     : {len(items)}")
    print(f"  Status distribution:")
    for s in order:
        c = sc.get(s, 0)
        if c:
            print(f"    {s:<14} {c:>4}")
    unc_str = (f"  → {unclassified[:5]}{'…' if len(unclassified)>5 else ''}"
               if unclassified else "")
    print(f"  UNCLASSIFIED   : {len(unclassified)} (target: 0){unc_str}")
    print(f"  PRIO DEFAULTED : {len(defaulted)}")
    print(f"  No Registered  : {len(no_reg)}")


# ── Freeze row 1 on all contract tabs ─────────────────────────────────────
def freeze_tab_headers(token, meta, dry_run=False):  # CR-420 G8
    """Freeze row 1 on all 10 contract tabs in one batchUpdate."""
    existing = {s['properties']['title']: s['properties']['sheetId']
                for s in meta.get('sheets', [])}
    reqs = []
    for tab in TABS:
        sid = existing.get(tab)
        if sid is not None:
            reqs.append({'updateSheetProperties': {
                'properties': {
                    'sheetId': sid,
                    'gridProperties': {'frozenRowCount': 1},
                },
                'fields': 'gridProperties.frozenRowCount',
            }})
    if not reqs:
        return
    if dry_run:
        print(f"  [dry-run] Would freeze row 1 on {len(reqs)} tab(s)")
        return
    r = sheets_post(token, ':batchUpdate', {'requests': reqs})
    if r.status_code == 200:
        print(f"  ✅ Frozen row 1 on {len(reqs)} tab(s)")
    else:
        print(f"  ⚠  Freeze failed: {r.json().get('error',{}).get('message','')}")


# ── PUSH command ───────────────────────────────────────────────────────────
def cmd_push(dry_run=False):
    print("\n── PUSH: registry.json → Google Sheets (contract v1.5) " + "─" * 18)

    registry = json.load(open(REGISTRY_PATH))
    items    = registry['items']
    print(f"  Loaded {len(items)} items from registry.json")

    # Build code marker cache once before processing all rows
    print("  Building code marker cache…", end=' ', flush=True)
    _build_code_marker_cache()
    print(f"done ({len(_code_marker_cache)} IDs found)")

    token = get_access_token()
    print("  ✅ Access token refreshed")

    meta = get_sheet_meta(token)
    print(f"  Sheet: {meta['properties']['title']}")
    sync_tabs(token, meta, dry_run)

    if not dry_run:
        time.sleep(1)
        token = get_access_token()

    # All Items — in-place by ID, cols A–V only, col W preserved
    update_all_items_inplace(token, items, dry_run)

    # Stage tabs — clear A:V + write (derived views, safe to clear)
    for tab in ('Intake', 'Planning', 'Implemented', 'QA', 'Smoke', 'Closed'):
        rows = build_stage_tab_rows(items, tab)
        write_tab(token, tab, rows, dry_run)

    # Blockers — filtered view of All Items where Blocked on is non-blank
    write_tab(token, 'Blockers', build_blockers_rows(items), dry_run)

    # Change Log — NEVER cleared or overwritten by push
    ensure_change_log_header(token, dry_run)

    # Summary
    pending = get_pending_cl_count(token) if not dry_run else 0
    write_tab(token, 'Summary', build_summary_rows(items, pending), dry_run)

    _print_run_report(items, dry_run)

    # CR-420 G8: freeze row 1 on all tabs
    fresh_meta = get_sheet_meta(token)
    freeze_tab_headers(token, fresh_meta, dry_run)

    # ── OD-419-04: diff + Change Log append runs as final step of push ──
    # Contract §5 REGISTRAR: push and diff happen in the same step.
    print("\n── POST-PUSH DIFF (contract §5 REGISTRAR) " + "─" * 28)
    cmd_diff_log(dry_run=dry_run)


# ── DIFF + LOG command (SHEET DRIFT backend / post-push diff) ──────────────
def cmd_diff_log(dry_run=False):
    """Read All Items A:V, diff Phase-1 cols against registry, append to Change Log.
    Never writes registry.json. Used by: --pull --dry-run (SHEET DRIFT role)
    and as the final step of --push (SHEET PUSH role).
    """
    token = get_access_token()

    enc = _range_url('All Items', 'A1:V10000')
    r = sheets_get(token, f'/values/{enc}')
    if r.status_code != 200:
        print(f"  ⚠  Could not read All Items for diff: {r.status_code}")
        return

    data = r.json().get('values', [])
    if not data:
        print("  ℹ  All Items is empty — nothing to diff")
        return

    headers    = data[0]
    sheet_rows = data[1:]
    col_idx    = {h: i for i, h in enumerate(headers)}
    id_col     = col_idx.get('ID', 1)

    registry    = json.load(open(REGISTRY_PATH))
    items_by_id = {i['id']: i for i in registry['items']}

    now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    cl_rows = []

    for row in sheet_rows:
        item_id = row[id_col].strip() if id_col < len(row) else ''
        if not item_id or item_id not in items_by_id:
            continue   # owner-added rows survive; not logged as drift

        item         = items_by_id[item_id]
        contract_row = to_contract_row(item)

        for col_name in CONTRACT_COLS:                          # BUG-541: diff all cols
            if col_name in _EXCLUDED_FROM_DIFF:                # skip Assignee + Release week
                continue
            if col_name not in col_idx:
                continue
            sheet_col_i = col_idx[col_name]
            sheet_val   = row[sheet_col_i].strip() if sheet_col_i < len(row) else ''
            reg_val     = str(contract_row[CONTRACT_COLS.index(col_name)]).strip()

            if sheet_val and sheet_val != reg_val:
                decision = 'PENDING' if col_name in _PHASE1_ACCEPTED \
                           else 'REJECTED'
                note     = '' if col_name in _PHASE1_ACCEPTED \
                           else 'Column not editable in Phase 1 — revert or request owner approval'
                cl_rows.append([
                    now_str, item_id, col_name,
                    reg_val, sheet_val,
                    decision, '', note,
                ])

    if not cl_rows:
        print("  ✅ No drift — sheet matches registry across all 20 tracked columns")
        return

    print(f"  Changes detected ({len(cl_rows)}):")
    for row in cl_rows[:8]:
        print(f"    {row[1]}.{row[2]}: '{str(row[3])[:35]}' → '{str(row[4])[:35]}'")
    if len(cl_rows) > 8:
        print(f"    … and {len(cl_rows)-8} more")

    ensure_change_log_header(token, dry_run)
    append_to_change_log(token, cl_rows, dry_run)

    if dry_run:
        print(f"\n  [dry-run] {len(cl_rows)} change(s) found. No writes made.")
    else:
        print(f"\n  ✅ {len(cl_rows)} change(s) logged to Change Log (PENDING).")
        print("     Present to owner for approval before applying to registry.")


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='CR-419: MyGenie POS — Google Sheets Contract v1.5 Sync',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            'Agent roles:\n'
            '  SHEET PUSH  → python3 sheets_sync.py --push\n'
            '  SHEET DRIFT → python3 sheets_sync.py --pull --dry-run\n'
            '\n'
            'Other:\n'
            '  --dry-run alone  → validate credentials + sheet access only\n'
        ),
    )
    parser.add_argument('--push',    action='store_true',
                        help='SHEET PUSH: registry → sheet + diff → Change Log')
    parser.add_argument('--pull',    action='store_true',
                        help='SHEET DRIFT: requires --dry-run (read-only diff)')
    parser.add_argument('--dry-run', action='store_true', dest='dry_run',
                        help='Validate or show diff only — no writes')
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

    # --dry-run alone = credential + sheet validation
    if args.dry_run and not args.push and not args.pull:
        print("\n── DRY-RUN: validating credentials + sheet ─────────────────────")
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
        # OD-419-04: --pull is only valid with --dry-run (SHEET DRIFT role).
        # Change Log append runs automatically inside --push (SHEET PUSH role).
        if not args.dry_run:
            sys.exit(
                "❌ --pull requires --dry-run (SHEET DRIFT role: read-only drift).\n"
                "   Change Log append runs automatically at the end of --push."
            )
        cmd_diff_log(dry_run=True)


if __name__ == '__main__':
    main()
