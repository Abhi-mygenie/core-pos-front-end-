# CR-406 — Implementation Plan (Gate 3)
# Google Sheets Two-Way Sync — Registry Export/Import via OAuth2

**Gate:** 3 — Implementation Plan
**Status:** GATE_3_PLAN_COMPLETE
**Date:** 2026-10-04
**Risk:** LOW
**Files WILL change:** `memory/reports/sheets_sync.py` (NEW)
**Files WILL NOT touch:** Any `frontend/src/`, backend, registry.json (planning-time), hotspots

---

## Scope Lock

| | Files |
|---|---|
| **WILL create** | `memory/reports/sheets_sync.py` |
| **WILL NOT touch** | `frontend/src/**`, `backend/**`, `memory/control/registry.json`, `memory/control/CR_REGISTRY.md`, R5 hotspots |

---

## E-1 — Create `memory/reports/sheets_sync.py` (NEW, ~280 lines)

### CLI Interface
```
python3 sheets_sync.py --push          # registry.json → all 8 Sheet tabs
python3 sheets_sync.py --pull          # Sheet All Items edits → registry.json
python3 sheets_sync.py --push --pull   # push then pull
python3 sheets_sync.py --dry-run       # validate credentials + sheet access, no writes
```

### Full Script

```python
#!/usr/bin/env python3
# CR-406: Google Sheets Two-Way Sync
# Push: registry.json → Google Sheet (8 tabs)
# Pull: Sheet All Items edits → registry.json (editable fields only)
# Auth: OAuth2 with stored refresh token

import json, os, sys, argparse, time
from pathlib import Path
from datetime import datetime
from collections import Counter

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    sys.exit("Run: pip install requests python-dotenv")

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
ENV_PATH     = SCRIPT_DIR / '.env'
REGISTRY_PATH = SCRIPT_DIR.parent / 'control' / 'registry.json'

load_dotenv(ENV_PATH)

CLIENT_ID     = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '').strip().strip('"')
CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', '').strip().strip('"')
REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN', '').strip().strip('"')
_raw_id       = os.getenv('GOOGLE_SHEET_ID', '').strip().strip('"').strip("'")
SHEET_ID      = _raw_id.split('/')[0]   # strip any trailing /edit?gid=... fragment

# ── Export columns (push direction) ───────────────────────────────────────
COLS = [
    'id', 'type', 'title', 'status', 'priority', 'severity',
    'sprint_key', 'area', 'category', 'risk', 'phase', 'current_gate',
    'blast_radius', 'files', 'notes', 'blocked_by', 'depends_on',
    'intake_doc', 'qa_report', 'qa_result',
]

# OD-406-01: fields editable via sheet pull
PULL_EDITABLE = ['status', 'priority', 'notes', 'sprint_key']

# ── Tab definitions (owner-locked 2026-10-04) ─────────────────────────────
TABS = [
    'All Items',
    'Intake',
    'Planning',
    'Implementation',
    'QA / Smoke',
    'Closed',
    'Blocked / Parked',
    'Summary',
]

# ── Status → tab classifier ────────────────────────────────────────────────
def classify_tab(status):
    s = str(status).upper()
    if any(k in s for k in ['CLOSED', 'OWNER VERIFIED', 'SUBSUMED', 'RETIRED',
                              'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN']):
        return 'Closed'
    if any(k in s for k in ['GATE_1', 'INTAKE', 'REGISTERED', 'NOT STARTED']):
        return 'Intake'
    if any(k in s for k in ['GATE_2', 'GATE_3', 'IMPACT_ANALYSIS', 'PLAN_COMPLETE']):
        return 'Planning'
    if any(k in s for k in ['GATE_4', 'GATE_5A', 'IMPLEMENTED']):
        return 'Implementation'
    if any(k in s for k in ['GATE_5B', 'QA PASS', 'QA_PASS',
                              'AWAITING OWNER SMOKE', 'GATE_6']):
        return 'QA / Smoke'
    if any(k in s for k in ['BLOCKED', 'PARKED', 'DEFERRED',
                              'BACKEND-BLOCKED', 'CRM-BLOCKED', 'PARK']):
        return 'Blocked / Parked'
    return None   # item appears in All Items only

# ── Auth ───────────────────────────────────────────────────────────────────
def get_access_token():
    r = requests.post('https://oauth2.googleapis.com/token', data={
        'client_id':     CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'refresh_token': REFRESH_TOKEN,
        'grant_type':    'refresh_token',
    }, timeout=15)
    data = r.json()
    if 'access_token' not in data:
        sys.exit(f"❌ Token refresh failed: {data}")
    return data['access_token']

# ── Sheet helpers ──────────────────────────────────────────────────────────
def api_get(token, path, **params):
    r = requests.get(
        f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}{path}',
        headers={'Authorization': f'Bearer {token}'},
        params=params, timeout=30
    )
    return r

def api_post(token, path, body):
    r = requests.post(
        f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}{path}',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json=body, timeout=30
    )
    return r

def api_put(token, path, body, **params):
    r = requests.put(
        f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}{path}',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json=body, params=params, timeout=30
    )
    return r

def get_sheet_meta(token):
    r = api_get(token, '')
    if r.status_code != 200:
        sys.exit(f"❌ Sheet access failed ({r.status_code}): {r.json().get('error',{}).get('message')}")
    return r.json()

def flatten(v):
    if isinstance(v, list):
        return ', '.join(str(x) for x in v)
    if isinstance(v, dict):
        return str(v)
    return str(v) if v is not None else ''

# ── Tab management ──────────────────────────────────────────────────────────
def sync_tabs(token, existing_titles, dry_run=False):
    """Create missing tabs and delete Open Only."""
    reqs = []
    # Delete Open Only if present
    meta = get_sheet_meta(token)
    for sheet in meta.get('sheets', []):
        if sheet['properties']['title'] == 'Open Only':
            reqs.append({'deleteSheet': {'sheetId': sheet['properties']['sheetId']}})
            print("  🗑  Queued delete: Open Only")
    # Create missing tabs
    for tab in TABS:
        if tab not in existing_titles:
            reqs.append({'addSheet': {'properties': {'title': tab}}})
            print(f"  ➕ Queued create: {tab}")
    if reqs and not dry_run:
        r = api_post(token, ':batchUpdate', {'requests': reqs})
        if r.status_code != 200:
            sys.exit(f"❌ Tab management failed: {r.json()}")
        print(f"  ✅ Tab management done ({len(reqs)} operations)")

# ── Push ────────────────────────────────────────────────────────────────────
def build_tab_rows(items, tab_name):
    if tab_name == 'Summary':
        return build_summary(items)
    subset = items if tab_name == 'All Items' else [
        i for i in items if classify_tab(i.get('status', '')) == tab_name
    ]
    rows = [COLS]
    for item in subset:
        rows.append([flatten(item.get(col, '')) for col in COLS])
    return rows

def build_summary(items):
    tc = Counter(str(i.get('type', '')).upper() for i in items)
    sc = Counter(str(i.get('sprint_key', 'unknown')) for i in items)
    bc = Counter()
    for i in items:
        t = classify_tab(i.get('status', '')) or 'Uncategorized'
        bc[t] += 1
    rows = [
        ['MyGenie POS — Registry Summary', f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'],
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

def write_tab(token, tab_name, rows, dry_run=False):
    rng = f"'{tab_name}'!A1"
    if dry_run:
        print(f"  [dry-run] Would write {len(rows)-1} rows to {tab_name}")
        return
    # Clear
    api_post(token, f'/values/\'{tab_name}\'!A1:Z10000:clear', {})
    time.sleep(0.3)   # respect API rate limit (100 req/100s)
    # Write
    r = api_put(token, f'/values/\'{tab_name}\'!A1',
                {'values': rows}, valueInputOption='RAW')
    if r.status_code != 200:
        print(f"  ⚠  Write failed for {tab_name}: {r.json().get('error',{}).get('message')}")
    else:
        print(f"  ✅ {tab_name}: {len(rows)-1} rows")
    time.sleep(0.3)

def cmd_push(dry_run=False):
    print("\n── PUSH: registry.json → Google Sheets ──────────────────────────────")
    registry = json.load(open(REGISTRY_PATH))
    items = registry['items']
    print(f"  Loaded {len(items)} items from registry.json")

    token = get_access_token()
    print("  ✅ Access token refreshed")

    meta = get_sheet_meta(token)
    print(f"  Sheet: {meta['properties']['title']}")
    existing = [s['properties']['title'] for s in meta.get('sheets', [])]

    sync_tabs(token, existing, dry_run)
    if not dry_run:
        token = get_access_token()   # refresh after batch update

    for tab in TABS:
        rows = build_tab_rows(items, tab)
        write_tab(token, tab, rows, dry_run)

    print(f"\n  PUSH {'(dry-run) ' if dry_run else ''}COMPLETE. {len(items)} items → 8 tabs.")

# ── Pull ────────────────────────────────────────────────────────────────────
def cmd_pull(dry_run=False):
    print("\n── PULL: Google Sheet → registry.json ───────────────────────────────")

    token = get_access_token()
    print("  ✅ Access token refreshed")

    r = api_get(token, "/values/'All Items'!A1:Z10000")
    if r.status_code != 200:
        sys.exit(f"❌ Could not read All Items tab: {r.json()}")

    data = r.json().get('values', [])
    if not data:
        sys.exit("❌ All Items tab is empty — run --push first")

    headers = data[0]
    sheet_rows = data[1:]
    print(f"  Read {len(sheet_rows)} rows from All Items tab")

    # Index columns
    col_idx = {h: i for i, h in enumerate(headers)}
    if 'id' not in col_idx:
        sys.exit("❌ 'id' column not found in sheet headers")

    # Load registry
    registry = json.load(open(REGISTRY_PATH))
    items_by_id = {i['id']: i for i in registry['items']}

    changes = []
    for row in sheet_rows:
        if len(row) <= col_idx.get('id', 0):
            continue
        item_id = row[col_idx['id']].strip()
        if not item_id or item_id not in items_by_id:
            continue
        item = items_by_id[item_id]
        for field in PULL_EDITABLE:
            if field not in col_idx:
                continue
            idx = col_idx[field]
            sheet_val = row[idx].strip() if idx < len(row) else ''
            reg_val   = str(item.get(field, '') or '')
            if sheet_val != reg_val and sheet_val:
                changes.append((item_id, field, reg_val, sheet_val))
                if not dry_run:
                    item[field] = sheet_val

    if not changes:
        print("  ✅ No changes detected — registry.json is already in sync")
        return

    print(f"\n  Changes detected ({len(changes)}):")
    for item_id, field, old, new in changes:
        print(f"    {item_id}.{field}: '{old[:40]}' → '{new[:40]}'")

    if dry_run:
        print("\n  [dry-run] No writes made.")
        return

    # Atomic write: temp file → rename
    tmp = REGISTRY_PATH.with_suffix('.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(registry, f, indent=2)
    tmp.replace(REGISTRY_PATH)
    print(f"\n  ✅ PULL COMPLETE. {len(changes)} field(s) updated in registry.json")

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='CR-406: Google Sheets Two-Way Sync')
    parser.add_argument('--push',    action='store_true', help='Push registry.json → Sheet')
    parser.add_argument('--pull',    action='store_true', help='Pull Sheet edits → registry.json')
    parser.add_argument('--dry-run', action='store_true', help='Validate only — no writes')
    args = parser.parse_args()

    if not any([args.push, args.pull, args.dry_run]):
        parser.print_help()
        sys.exit(0)

    # Validate env
    for var, val in [('CLIENT_ID', CLIENT_ID), ('CLIENT_SECRET', CLIENT_SECRET),
                     ('REFRESH_TOKEN', REFRESH_TOKEN), ('SHEET_ID', SHEET_ID)]:
        if not val:
            sys.exit(f"❌ {var} missing from {ENV_PATH}")

    print(f"Sheet ID : {SHEET_ID}")
    print(f"Registry : {REGISTRY_PATH}")
    print(f"Dry-run  : {args.dry_run}")

    if args.dry_run:
        # Validate only
        token = get_access_token()
        print("✅ Access token refreshed")
        meta = get_sheet_meta(token)
        print(f"✅ Sheet accessible: {meta['properties']['title']}")
        tabs = [s['properties']['title'] for s in meta.get('sheets', [])]
        print(f"   Tabs: {tabs}")
        registry = json.load(open(REGISTRY_PATH))
        print(f"✅ registry.json readable: {len(registry['items'])} items")
        return

    if args.push:
        cmd_push(dry_run=False)

    if args.pull:
        cmd_pull(dry_run=False)

if __name__ == '__main__':
    main()
```

---

## Verification Matrix

| # | Verification | Command | Expected |
|---|---|---|---|
| V-1 | Credentials load from .env | `python3 sheets_sync.py --dry-run` | Prints Sheet ID (non-empty) |
| V-2 | Token refresh | `python3 sheets_sync.py --dry-run` | "✅ Access token refreshed" |
| V-3 | Sheet accessible | `python3 sheets_sync.py --dry-run` | "✅ Sheet accessible: REGISTRY_EXPORT_2026_09_27" |
| V-4 | Registry readable | `python3 sheets_sync.py --dry-run` | "✅ registry.json readable: 766 items" |
| V-5 | Push writes All Items | `--push` → open Sheet | All Items tab: 767 rows (header + 766) |
| V-6 | Push writes Intake tab | `--push` → open Sheet | Intake tab: ~94 rows |
| V-7 | Open Only tab deleted | `--push` → open Sheet | No "Open Only" tab |
| V-8 | Summary tab has pivots | `--push` → open Sheet | Summary tab: BY TYPE, BY STATUS TAB, BY SPRINT sections |
| V-9 | Pull detects no-op | `--push` then `--pull` | "No changes detected" |
| V-10 | Pull applies editable field | Edit status in Sheet → `--pull` | registry.json status updated |
| V-11 | Pull ignores non-editable | Edit title in Sheet → `--pull` | registry.json title unchanged |
| V-12 | Atomic write safety | Check registry.json.tmp absent after `--pull` | No leftover tmp file |

---

## Post-Code Registry Checklist (Implementation agent must run)

```
- [ ] registry.json: CR-406 → status: GATE_5A_IMPLEMENTED, gate: 5A
- [ ] CR_REGISTRY.md: row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: memory/reports/sheets_sync.py added (CR-406, 2026-10-04)
- [ ] Code marker: # CR-406 comment on line 1 of sheets_sync.py (already in plan)
- [ ] Compile check: python3 -m py_compile memory/reports/sheets_sync.py → exit 0
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google API rate limit (100 req/100s) | LOW | LOW | 0.3s sleep between tab writes |
| Refresh token expires | VERY LOW | LOW | Re-run OAuth flow (one-time) |
| Sheet tab name conflict | LOW | LOW | `sync_tabs()` checks existing tabs before create |
| Partial pull corrupts registry | LOW | HIGH | Atomic write via tmp → rename |
| SHEET_ID has trailing path | ALREADY MITIGATED | — | `_raw_id.split('/')[0]` strips fragment |

---

*Implementation Plan complete — CR-406 / 2026-10-04*
*Awaiting Gate 4 GO → Implementation agent creates sheets_sync.py*
