#!/usr/bin/env python3
# CR-406: Google Sheets Two-Way Sync
# Push: registry.json → Google Sheet (9 tabs)
# Pull: Sheet All Items edits → registry.json (editable fields only)
# Auth: OAuth2 with stored refresh token (no service account key)
#
# Usage:
#   python3 sheets_sync.py --dry-run          # validate credentials + sheet, no writes
#   python3 sheets_sync.py --push             # registry.json → all 9 Sheet tabs
#   python3 sheets_sync.py --pull             # Sheet All Items edits → registry.json
#   python3 sheets_sync.py --push --pull      # push then pull

import json, os, sys, argparse, time
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
ENV_PATH      = SCRIPT_DIR / '.env'
REGISTRY_PATH = SCRIPT_DIR.parent / 'control' / 'registry.json'

load_dotenv(ENV_PATH)

CLIENT_ID     = os.getenv('GOOGLE_OAUTH_CLIENT_ID',    '').strip().strip('"').strip("'")
CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET','').strip().strip('"').strip("'")
REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN',      '').strip().strip('"').strip("'")
_raw_id       = os.getenv('GOOGLE_SHEET_ID',           '').strip().strip('"').strip("'")
SHEET_ID      = _raw_id.split('/')[0]   # strip any trailing /edit?gid=... fragment

# ── Export columns (push direction) — 20 cols, matches registry_export.py ──
COLS = [
    'id', 'type', 'title', 'status', 'priority', 'severity',
    'sprint_key', 'area', 'category', 'risk', 'phase', 'current_gate',
    'blast_radius', 'files', 'notes', 'blocked_by', 'depends_on',
    'intake_doc', 'qa_report', 'qa_result',
]

# OD-406-01: fields editable via Sheet pull (owner-locked defaults)
PULL_EDITABLE = ['status', 'priority', 'notes', 'sprint_key']

# ── Tab definitions (owner-locked 2026-10-05, OD-406-03 v2) ──────────────
TABS = [
    'All Items',
    'Intake',
    'Planning',
    'Implementation',
    "QA'd",
    'Smoke Test',
    'Closed',
    'Blockers',
    'Summary',
]

# ── Status → tab classifier ────────────────────────────────────────────────
def classify_tab(status):
    """Map a registry status string to its workflow tab. Returns None = All Items only."""
    s = str(status).upper()
    # Closed: includes Parked + Deferred (owner decision OD-406-03 v2)
    if any(k in s for k in ['CLOSED', 'OWNER VERIFIED', 'SUBSUMED', 'RETIRED',
                              'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN',
                              'PARKED', 'DEFERRED', 'BACKEND-BLOCKED', 'CRM-BLOCKED']):
        return 'Closed'
    if any(k in s for k in ['GATE_1', 'INTAKE', 'REGISTERED', 'NOT STARTED']):
        return 'Intake'
    # Planning = Gate 2 + Gate 3 combined (owner decision OD-406-03 v2)
    if any(k in s for k in ['GATE_2', 'GATE_3', 'IMPACT_ANALYSIS', 'PLAN_COMPLETE']):
        return 'Planning'
    if any(k in s for k in ['GATE_4', 'GATE_5A', 'IMPLEMENTED']):
        return 'Implementation'
    # Smoke Test first (catches "QA PASS — AWAITING OWNER SMOKE" correctly)
    if any(k in s for k in ['AWAITING OWNER SMOKE', 'GATE_6', 'OWNER SMOKE']):
        return 'Smoke Test'
    # QA'd: Gate 5B passed, not yet in smoke
    if any(k in s for k in ['GATE_5B', 'QA PASS', 'QA_PASS']):
        return "QA'd"
    return None   # item appears in All Items only

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

# ── Tab management ─────────────────────────────────────────────────────────
# v1 tabs replaced in v2 redesign (OD-406-03 v2)
_OBSOLETE_TABS = ['Open Only', 'QA / Smoke', 'Blocked / Parked']

def sync_tabs(token, meta, dry_run=False):
    """Delete obsolete v1 tabs; create any missing v2 required tabs."""
    existing = {s['properties']['title']: s['properties']['sheetId']
                for s in meta.get('sheets', [])}
    reqs = []

    # Delete obsolete v1 tabs if still present
    for old_tab in _OBSOLETE_TABS:
        if old_tab in existing:
            reqs.append({'deleteSheet': {'sheetId': existing[old_tab]}})
            print(f"  🗑  Queued delete: {old_tab}")

    # Create any missing v2 tabs
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

# ── Row builders ───────────────────────────────────────────────────────────
def _flatten(v):
    if isinstance(v, list):
        return ', '.join(str(x) for x in v)
    if isinstance(v, dict):
        return str(v)
    return str(v) if v is not None else ''

def build_tab_rows(items, tab_name):
    if tab_name == 'Summary':
        return _build_summary(items)
    if tab_name == 'Blockers':
        return build_blockers_tab(items)
    subset = items if tab_name == 'All Items' else [
        i for i in items if classify_tab(i.get('status', '')) == tab_name
    ]
    rows = [COLS]
    for item in subset:
        rows.append([_flatten(item.get(col, '')) for col in COLS])
    return rows

def _build_summary(items):
    tc = Counter(str(i.get('type', '')).upper() for i in items)
    sc = Counter(str(i.get('sprint_key', 'unknown')) for i in items)
    bc = Counter()
    for i in items:
        t = classify_tab(i.get('status', '')) or 'Uncategorized'
        bc[t] += 1
    rows = [
        ['MyGenie POS — Registry Summary',
         f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'],
        [],
        ['BY TYPE', 'Count'],
        *[[k, v] for k, v in sorted(tc.items(), key=lambda x: -x[1])],
        [],
        ['BY STATUS TAB', 'Count'],
        *[[k, v] for k, v in sorted(bc.items(), key=lambda x: -x[1])],
        [],
        ['BY SPRINT (top 15)', 'Count'],
        *[[k, v] for k, v in sorted(sc.items(), key=lambda x: -x[1])[:15]],
    ]
    return rows

def _range_url(tab_name, cell_range):
    """URL-encode a Sheets A1 range for use in URL path (handles / and spaces)."""
    raw = f"'{tab_name}'!{cell_range}"
    return urllib.parse.quote(raw, safe='')


def build_blockers_tab(items):
    """Build the Blockers relationship tab.

    Shows both sides of every dependency:
      BLOCKED BY  — item has a blocker or blocked_by field
      DEPENDS ON  — item has a depends_on list of IDs
      BLOCKING    — item has a blocks list of IDs

    The same item can appear in multiple rows (once per relationship).
    Items also appear in their workflow tab — no exclusion here.
    """
    BLOCKER_COLS = [
        'id', 'type', 'title', 'status', 'sprint_key',
        'relationship', 'related_id', 'related_context',
    ]
    rows = [BLOCKER_COLS]

    for item in items:
        i_id     = _flatten(item.get('id', ''))
        i_type   = _flatten(item.get('type', ''))
        i_title  = _flatten(item.get('title', ''))
        i_status = _flatten(item.get('status', ''))
        i_sprint = _flatten(item.get('sprint_key', ''))

        def _row(rel, rel_id, ctx):
            return [i_id, i_type, i_title, i_status, i_sprint, rel, rel_id, ctx]

        # 1. blocker field (free-text) → BLOCKED BY
        blocker = item.get('blocker', '')
        if blocker and str(blocker).strip().upper() not in ('', 'NONE', '[]'):
            rows.append(_row('BLOCKED BY', '', str(blocker)[:200]))

        # 2. blocked_by field (structured ID) → BLOCKED BY
        blocked_by = item.get('blocked_by', '')
        if blocked_by and str(blocked_by).strip():
            rows.append(_row('BLOCKED BY', str(blocked_by), ''))

        # 3. depends_on (list or comma-string of IDs) → DEPENDS ON
        depends = item.get('depends_on', [])
        if isinstance(depends, str):
            depends = [d.strip() for d in depends.split(',') if d.strip()]
        for dep_id in (depends if isinstance(depends, list) else []):
            dep_id = str(dep_id).strip()
            if dep_id:
                rows.append(_row('DEPENDS ON', dep_id, ''))

        # 4. blocks field (list of IDs) → BLOCKING
        blocks = item.get('blocks', [])
        if isinstance(blocks, str):
            blocks = [b.strip() for b in blocks.split(',') if b.strip()]
        for blockee_id in (blocks if isinstance(blocks, list) else []):
            blockee_id = str(blockee_id).strip()
            if blockee_id:
                rows.append(_row('BLOCKING', blockee_id, ''))

    return rows

# ── Tab writer ─────────────────────────────────────────────────────────────
def write_tab(token, tab_name, rows, dry_run=False):
    """Clear a tab then write rows to it."""
    enc_clear = _range_url(tab_name, 'A1:Z10000')
    enc_write = _range_url(tab_name, 'A1')

    if dry_run:
        data_rows = len(rows) - 1 if rows else 0
        print(f"  [dry-run] {tab_name}: would write {data_rows} data row(s)")
        return

    # Clear existing content
    r = sheets_post(token, f'/values/{enc_clear}:clear', {})
    if r.status_code not in (200, 204):
        print(f"  ⚠  Clear warning for '{tab_name}': {r.status_code}")
    time.sleep(0.3)   # respect 100 req/100s rate limit

    # Write rows
    r = sheets_put(
        token, f'/values/{enc_write}',
        {'values': rows},
        valueInputOption='RAW',
    )
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

# ── PUSH command ───────────────────────────────────────────────────────────
def cmd_push(dry_run=False):
    print("\n── PUSH: registry.json → Google Sheets " + "─" * 30)

    registry = json.load(open(REGISTRY_PATH))
    items    = registry['items']
    print(f"  Loaded {len(items)} items from registry.json")

    token = get_access_token()
    print("  ✅ Access token refreshed")

    meta = get_sheet_meta(token)
    print(f"  Sheet title : {meta['properties']['title']}")
    existing_tabs = [s['properties']['title'] for s in meta.get('sheets', [])]
    print(f"  Existing tabs: {existing_tabs}")

    sync_tabs(token, meta, dry_run)

    # Re-fresh token after batchUpdate (may take a moment)
    if not dry_run:
        time.sleep(1)
        token = get_access_token()

    for tab in TABS:
        rows = build_tab_rows(items, tab)
        write_tab(token, tab, rows, dry_run)

    label = "(dry-run) " if dry_run else ""
    print(f"\n  PUSH {label}COMPLETE. {len(items)} items → 9 tabs.")

# ── PULL command ───────────────────────────────────────────────────────────
def cmd_pull(dry_run=False):
    print("\n── PULL: Google Sheet → registry.json " + "─" * 31)

    token = get_access_token()
    print("  ✅ Access token refreshed")

    r = sheets_get(token, f"/values/{_range_url('All Items', 'A1:Z10000')}")
    if r.status_code != 200:
        sys.exit(f"❌ Could not read 'All Items' tab: "
                 f"{r.json().get('error', {}).get('message', r.text)}")

    data = r.json().get('values', [])
    if not data:
        sys.exit("❌ 'All Items' tab is empty — run --push first")

    headers   = data[0]
    sheet_rows = data[1:]
    print(f"  Read {len(sheet_rows)} data row(s) from All Items tab")

    col_idx = {h: i for i, h in enumerate(headers)}
    if 'id' not in col_idx:
        sys.exit("❌ 'id' column not found in sheet headers — sheet structure may be wrong")

    # Load registry
    registry    = json.load(open(REGISTRY_PATH))
    items_by_id = {i['id']: i for i in registry['items']}

    changes = []
    for row in sheet_rows:
        id_col = col_idx.get('id', 0)
        if len(row) <= id_col:
            continue
        item_id = row[id_col].strip()
        if not item_id or item_id not in items_by_id:
            continue
        item = items_by_id[item_id]
        for field in PULL_EDITABLE:
            if field not in col_idx:
                continue
            idx       = col_idx[field]
            sheet_val = row[idx].strip() if idx < len(row) else ''
            reg_val   = str(item.get(field, '') or '').strip()
            if sheet_val and sheet_val != reg_val:
                changes.append((item_id, field, reg_val, sheet_val))
                if not dry_run:
                    item[field] = sheet_val

    if not changes:
        print("  ✅ No changes detected — registry.json is already in sync with Sheet")
        return

    print(f"\n  Changes detected ({len(changes)}):")
    for item_id, field, old_val, new_val in changes:
        print(f"    {item_id}.{field}: '{old_val[:45]}' → '{new_val[:45]}'")

    if dry_run:
        print("\n  [dry-run] No writes made.")
        return

    # OD-406-02: atomic write — temp file → os.replace (never partial)
    tmp = REGISTRY_PATH.with_suffix('.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(registry, f, indent=2)
    tmp.replace(REGISTRY_PATH)
    print(f"\n  ✅ PULL COMPLETE. {len(changes)} field(s) updated in registry.json")

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='CR-406: MyGenie POS — Google Sheets Two-Way Sync',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            'Examples:\n'
            '  python3 sheets_sync.py --dry-run          # validate only\n'
            '  python3 sheets_sync.py --push             # registry → Sheet\n'
            '  python3 sheets_sync.py --pull             # Sheet edits → registry\n'
            '  python3 sheets_sync.py --push --pull      # push then pull\n'
        ),
    )
    parser.add_argument('--push',    action='store_true', help='Push registry.json → Sheet')
    parser.add_argument('--pull',    action='store_true', help='Pull Sheet edits → registry.json')
    parser.add_argument('--dry-run', action='store_true', dest='dry_run',
                        help='Validate credentials + sheet access — no writes')
    args = parser.parse_args()

    if not any([args.push, args.pull, args.dry_run]):
        parser.print_help()
        sys.exit(0)

    # Validate all required env vars present
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

    # --dry-run: validate credentials + sheet only, no writes
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
