# CR-406 — Implementation Plan v2 (Gate 3)
# Google Sheets Two-Way Sync — 9-Tab Redesign

**Gate:** 3 — Implementation Plan (v2)
**Status:** GATE_3_PLAN_COMPLETE
**Date:** 2026-10-05
**Risk:** LOW
**IA Reference:** memory/impact/CR-406_IMPACT_ANALYSIS_V2.md

---

## Scope Lock

**WILL change:**
- `memory/reports/sheets_sync.py` — 8 targeted edits (E-1 to E-8)

**WILL NOT touch:**
- Any `frontend/src/` or `backend/` file
- `memory/control/registry.json` (runtime write only)
- Any R5 hotspot file

---

## Entry Verification (Implementation agent runs before any edit)

For each edit, verify the anchor line still matches before changing.

| Edit | File | Line | Must currently read |
|---|---|---|---|
| E-1 | sheets_sync.py | 3 | `# Push: registry.json → Google Sheet (8 tabs)` |
| E-2 | sheets_sync.py | 9 | `#   python3 sheets_sync.py --push             # registry.json → all 8 Sheet tabs` |
| E-3 | sheets_sync.py | 50-59 | `TABS = [` … `'Blocked / Parked',` … `]` |
| E-4 | sheets_sync.py | 62-80 | `def classify_tab(status):` … `return 'Blocked / Parked'` |
| E-5 | sheets_sync.py | 131-159 | `def sync_tabs(…):` … `Delete 'Open Only'` |
| E-6 | sheets_sync.py | 169-178 | `def build_tab_rows(items, tab_name):` |
| E-7 | sheets_sync.py | 200 | After `_build_summary` ends — insert new function |
| E-8 | sheets_sync.py | 269 | `print(f"\n  PUSH {label}COMPLETE. {len(items)} items → 8 tabs.")` |

---

## E-1 — Line 3: Update docstring tab count

**Current:**
```python
# Push: registry.json → Google Sheet (8 tabs)
```
**Replace with:**
```python
# Push: registry.json → Google Sheet (9 tabs)
```

---

## E-2 — Line 9: Update usage comment

**Current:**
```
#   python3 sheets_sync.py --push             # registry.json → all 8 Sheet tabs
```
**Replace with:**
```
#   python3 sheets_sync.py --push             # registry.json → all 9 Sheet tabs
```

---

## E-3 — Lines 50-59: Replace TABS list (8 → 9 tabs)

**Current (lines 50-59):**
```python
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
```
**Replace with:**
```python
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
```

---

## E-4 — Lines 62-80: Replace classify_tab() function

**Current (lines 62-80):**
```python
def classify_tab(status):
    """Map a registry status string to its sheet tab. Returns None for All Items only."""
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
    return None   # item appears in All Items only, no status tab
```
**Replace with:**
```python
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
```

---

## E-5 — Lines 131-159: Replace sync_tabs() function

**Current (lines 131-159):**
```python
def sync_tabs(token, meta, dry_run=False):
    """Delete 'Open Only' if present; create any missing required tabs."""
    existing = {s['properties']['title']: s['properties']['sheetId']
                for s in meta.get('sheets', [])}
    reqs = []

    # Delete Open Only (OD-406-03)
    if 'Open Only' in existing:
        reqs.append({'deleteSheet': {'sheetId': existing['Open Only']}})
        print("  🗑  Queued delete: Open Only")

    # Create missing tabs
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
```
**Replace with:**
```python
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
```

---

## E-6 — Lines 169-178: Update build_tab_rows() to route Blockers tab

**Current (lines 169-178):**
```python
def build_tab_rows(items, tab_name):
    if tab_name == 'Summary':
        return _build_summary(items)
    subset = items if tab_name == 'All Items' else [
        i for i in items if classify_tab(i.get('status', '')) == tab_name
    ]
    rows = [COLS]
    for item in subset:
        rows.append([_flatten(item.get(col, '')) for col in COLS])
    return rows
```
**Replace with:**
```python
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
```

---

## E-7 — After line 200: Insert build_blockers_tab() function

Insert immediately after `_build_summary` ends (line 200, the closing `]`).

**Insert (new function, ~50 lines):**
```python

def build_blockers_tab(items):
    """Build the Blockers relationship tab.

    Shows both sides of every dependency:
      BLOCKED BY  — item has a blocker field or blocked_by field
      DEPENDS ON  — item has a depends_on list of IDs
      BLOCKING    — item has a blocks list of IDs

    The same item can appear in multiple rows (once per relationship).
    Items also appear in their workflow tab (Intake/Planning/etc.) — no exclusion.
    """
    BLOCKER_COLS = [
        'id', 'type', 'title', 'status', 'sprint_key',
        'relationship', 'related_id', 'related_context',
    ]
    rows = [BLOCKER_COLS]

    for item in items:
        item_id  = _flatten(item.get('id', ''))
        i_type   = _flatten(item.get('type', ''))
        i_title  = _flatten(item.get('title', ''))
        i_status = _flatten(item.get('status', ''))
        i_sprint = _flatten(item.get('sprint_key', ''))

        def _row(rel, rel_id, ctx):
            return [item_id, i_type, i_title, i_status, i_sprint, rel, rel_id, ctx]

        # 1. blocker field (free-text) → BLOCKED BY
        blocker = item.get('blocker', '')
        if blocker and str(blocker).strip().upper() not in ('', 'NONE', '[]'):
            rows.append(_row('BLOCKED BY', '', str(blocker)[:200]))

        # 2. blocked_by field (structured ID) → BLOCKED BY
        blocked_by = item.get('blocked_by', '')
        if blocked_by and str(blocked_by).strip():
            rows.append(_row('BLOCKED BY', str(blocked_by), ''))

        # 3. depends_on field (list or string of IDs) → DEPENDS ON
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
```

---

## E-8 — Line 269: Update PUSH COMPLETE message

**Current (line 269):**
```python
    print(f"\n  PUSH {label}COMPLETE. {len(items)} items → 8 tabs.")
```
**Replace with:**
```python
    print(f"\n  PUSH {label}COMPLETE. {len(items)} items → 9 tabs.")
```

---

## Verification Matrix

| # | Verification | Command | Expected |
|---|---|---|---|
| V-1 | Syntax clean | `python3 -m py_compile sheets_sync.py` | exit 0 |
| V-2 | Dry-run passes | `--dry-run` | "✅ Dry-run PASS" |
| V-3 | Tab management | `--push` output | "Queued delete: QA / Smoke", "Queued delete: Blocked / Parked", "Queued create: QA'd", "Queued create: Smoke Test", "Queued create: Blockers" |
| V-4 | QA'd tab row count | `--push` output | `QA'd` ≥ 100 rows |
| V-5 | Smoke Test tab row count | `--push` output | `Smoke Test` ≥ 100 rows |
| V-6 | Closed includes Parked | `--push` output | `Closed` ≥ 280 rows (was 259 before, now includes Parked) |
| V-7 | Blockers tab has rows | `--push` output | `Blockers` ≥ 20 rows |
| V-8 | Blockers columns | Open Sheet → Blockers tab | Headers: id, type, title, status, sprint_key, relationship, related_id, related_context |
| V-9 | BLOCKED BY rows present | Open Sheet → Blockers tab | At least one row with relationship=BLOCKED BY |
| V-10 | Item repeats | Open Sheet | CR-380 in Closed tab AND in Blockers tab |
| V-11 | PUSH COMPLETE msg | `--push` output | "items → 9 tabs" |
| V-12 | Pull no-op after push | `--pull` after `--push` | "No changes detected" |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-406 → status: GATE_5A_IMPLEMENTED, gate: 5A
- [ ] CR_REGISTRY.md: row updated to GATE_5A_IMPLEMENTED (v2)
- [ ] FILE_OWNERSHIP.md: row updated — note v2 redesign date
- [ ] Code marker: # CR-406 already on line 2 — verify still present
- [ ] py_compile: python3 -m py_compile memory/reports/sheets_sync.py → exit 0
```

---

*Implementation Plan v2 — CR-406 / 2026-10-05*
*Awaiting owner verbatim "Gate 4 GO" → Implementation agent applies E-1 through E-8*
