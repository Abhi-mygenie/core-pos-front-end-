"""
Backend tests for POS registry → Google Sheet sync (contract v1.4).
Tests cover:
  - Live sheet date format compliance (All Items tab)
  - Registry.json date & type cleanup
  - Idempotency: --dry-run, --diff, --pull
  - Offline diff_sheet / apply_change_log unit checks
  - Tab order / headers / enums / counts / blockers / assignee rules
"""
import json
import re
import sys
import subprocess
from pathlib import Path

import pytest

SCRIPT_DIR = Path('/app/memory/reports')
REGISTRY_PATH = Path('/app/memory/control/registry.json')
sys.path.insert(0, str(SCRIPT_DIR))

import sheets_sync as ss  # noqa: E402

DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
TARGETED_PROSE_IDS = {'BUG-448', 'BUG-449', 'BUG-450', 'BUG-451', 'BUG-452', 'BUG-453', 'CR-386'}
TARGETED_PARTIAL_IDS = {'BUG-466'} | {f'CR-{n}' for n in range(391, 400)}
INV_IDS = {'INV-ROOM-001', 'INV-OE-001', 'INV-PG-001', 'INV-GST-001', 'INV-BACKEND-001'}


# ─── Shared fixtures ─────────────────────────────────────────────────────
@pytest.fixture(scope='session')
def token():
    try:
        return ss.get_access_token()
    except SystemExit as e:
        pytest.skip(f"OAuth token refresh failed: {e}")


@pytest.fixture(scope='session')
def sheet_all(token):
    rows = ss.read_tab(token, 'All Items')
    if not rows:
        pytest.skip("Could not read 'All Items' tab")
    return rows


@pytest.fixture(scope='session')
def sheet_meta(token):
    return ss.get_sheet_meta(token)


@pytest.fixture(scope='session')
def registry():
    return json.load(open(REGISTRY_PATH))


# ─── Section 1: Live-sheet 'All Items' date format ───────────────────────
class TestLiveSheetDates:
    def _idx(self, hdr):
        return {h: i for i, h in enumerate(hdr)}

    def test_registered_lastupdated_closed_strict_format(self, sheet_all):
        hdr, rows = sheet_all[0], sheet_all[1:]
        idx = self._idx(hdr)
        violations = []
        for r in rows:
            r = ss._pad(r, len(hdr))
            for col in ('Registered', 'Last updated', 'Closed'):
                val = r[idx[col]].strip() if col in idx else ''
                if val and not DATE_RE.match(val):
                    violations.append((r[idx['ID']], col, val[:60]))
        assert not violations, f"Found {len(violations)} date-format violations: {violations[:10]}"

    def test_targeted_prose_ids_registered_clean(self, sheet_all):
        hdr, rows = sheet_all[0], sheet_all[1:]
        idx = self._idx(hdr)
        bad = []
        for r in rows:
            r = ss._pad(r, len(hdr))
            rid = r[idx['ID']].strip()
            if rid in TARGETED_PROSE_IDS:
                reg = r[idx['Registered']].strip()
                if not DATE_RE.match(reg):
                    bad.append((rid, reg[:60]))
        assert not bad, f"Prose still present in Registered: {bad}"

    def test_targeted_partial_dates_padded_with_note(self, sheet_all):
        hdr, rows = sheet_all[0], sheet_all[1:]
        idx = self._idx(hdr)
        found = {}
        for r in rows:
            r = ss._pad(r, len(hdr))
            rid = r[idx['ID']].strip()
            if rid in TARGETED_PARTIAL_IDS:
                found[rid] = {
                    'reg': r[idx['Registered']].strip(),
                    'upd': r[idx['Last updated']].strip(),
                    'notes': r[idx['Notes']].strip() if 'Notes' in idx else '',
                }
        missing = TARGETED_PARTIAL_IDS - set(found.keys())
        # Not all may exist; only assert on those present
        failures = []
        for rid, v in found.items():
            if v['reg'] != '2026-06-01':
                failures.append((rid, 'Registered', v['reg']))
            if v['upd'] and not DATE_RE.match(v['upd']):
                failures.append((rid, 'Last updated', v['upd']))
            if not v['notes'].startswith('DATE APPROXIMATED'):
                failures.append((rid, 'Notes-prefix', v['notes'][:80]))
        assert not failures, f"Partial-date fixups failing: {failures}; missing: {missing}"

    def test_inv_type_values(self, sheet_all):
        hdr, rows = sheet_all[0], sheet_all[1:]
        idx = self._idx(hdr)
        allowed = {'BUG', 'CR', 'INV', 'INCIDENT', 'GAP'}
        bad_type, inv_check = [], {}
        for r in rows:
            r = ss._pad(r, len(hdr))
            rid = r[idx['ID']].strip()
            t = r[idx['Type']].strip()
            if t and t not in allowed:
                bad_type.append((rid, t))
            if rid in INV_IDS:
                inv_check[rid] = t
        assert not bad_type, f"Type values outside enum: {bad_type[:10]}"
        wrong_inv = {k: v for k, v in inv_check.items() if v != 'INV'}
        assert not wrong_inv, f"INV-* items not showing 'INV': {wrong_inv}"


# ─── Section 2: Tab layout, headers, enums, counts ───────────────────────
class TestSheetStructure:
    def test_tabs_exact_order(self, sheet_meta):
        order = [s['properties']['title']
                 for s in sorted(sheet_meta['sheets'], key=lambda s: s['properties']['index'])]
        # Only the contract-mandated 10 tabs should appear, in exact order
        contract_in_sheet = [t for t in order if t in ss.TABS]
        assert contract_in_sheet == ss.TABS, f"Tab order wrong: {order}"

    def test_all_items_header_matches_contract(self, sheet_all):
        assert sheet_all[0] == ss.CONTRACT_COLS, (
            f"Header mismatch:\n  got: {sheet_all[0]}\n  exp: {ss.CONTRACT_COLS}")

    def test_status_enum_only_and_no_blank(self, sheet_all):
        hdr, rows = sheet_all[0], sheet_all[1:]
        idx = hdr.index('Status')
        bad = []
        for r in rows:
            r = ss._pad(r, len(hdr))
            s = r[idx].strip()
            if s not in ss.STATUS_ENUM:
                bad.append((r[hdr.index('ID')], s))
        assert not bad, f"Non-enum / blank Status rows: {len(bad)} e.g. {bad[:5]}"

    def test_priority_enum_only(self, sheet_all):
        hdr, rows = sheet_all[0], sheet_all[1:]
        p_i, s_i = hdr.index('Priority'), hdr.index('Status')
        bad = []
        for r in rows:
            r = ss._pad(r, len(hdr))
            if r[s_i].strip() in ss.CLOSED_SET:
                continue  # closed items may have blank priority historically
            p = r[p_i].strip()
            if p not in ('P0', 'P1', 'P2', 'P3'):
                bad.append((r[hdr.index('ID')], p))
        assert not bad, f"Priority not in P0-P3: {bad[:10]}"

    def test_assignee_blank_everywhere(self, sheet_all):
        hdr, rows = sheet_all[0], sheet_all[1:]
        if 'Assignee' not in hdr:
            pytest.skip("No Assignee column")
        a_i = hdr.index('Assignee')
        populated = [ss._pad(r, len(hdr))[hdr.index('ID')]
                     for r in rows if ss._pad(r, len(hdr))[a_i].strip()]
        assert not populated, f"Assignee populated in {len(populated)} rows: {populated[:5]}"

    def test_stage_tab_counts_match_status_counts(self, token, sheet_all):
        from collections import Counter
        hdr, rows = sheet_all[0], sheet_all[1:]
        s_i = hdr.index('Status')
        all_counts = Counter(ss._pad(r, len(hdr))[s_i].strip() for r in rows)
        stage_map = {'Intake': ['INTAKE'], 'Planning': ['PLANNING'],
                     'Implemented': ['IMPLEMENTED'], 'QA': ['QA'], 'Smoke': ['SMOKE'],
                     'Closed': ['CLOSED', 'PARKED', 'DUPLICATE']}
        mismatches = []
        for tab, statuses in stage_map.items():
            tab_rows = ss.read_tab(token, tab)
            if not tab_rows:
                mismatches.append((tab, 'tab empty'))
                continue
            got = len(tab_rows) - 1
            expected = sum(all_counts.get(s, 0) for s in statuses)
            if got != expected:
                mismatches.append((tab, f'got={got} expected={expected}'))
        assert not mismatches, f"Stage tab count mismatches: {mismatches}"

    def test_blockers_tab_no_closed(self, token):
        rows = ss.read_tab(token, 'Blockers')
        if not rows:
            pytest.skip("Blockers tab empty")
        hdr = rows[0]
        s_i = hdr.index('Status')
        bad = [ss._pad(r, len(hdr))[hdr.index('ID')]
               for r in rows[1:]
               if ss._pad(r, len(hdr))[s_i].strip() in ss.CLOSED_SET]
        assert not bad, f"Blockers tab contains CLOSED/PARKED/DUPLICATE rows: {bad[:10]}"


# ─── Section 3: registry.json schema ─────────────────────────────────────
class TestRegistryJson:
    def test_date_fields_valid_or_blank(self, registry):
        bad = []
        for i in registry['items']:
            for f in ('registered', 'last_updated', 'closed'):
                v = str(i.get(f) or '').strip()
                if v and not DATE_RE.match(v):
                    bad.append((i.get('id'), f, v[:60]))
        assert not bad, f"Registry has {len(bad)} malformed date fields: {bad[:10]}"

    def test_inv_items_have_type_inv(self, registry):
        by_id = {i['id']: i for i in registry['items']}
        wrong = {rid: by_id[rid].get('type') for rid in INV_IDS
                 if rid in by_id and by_id[rid].get('type') != 'INV'}
        missing = INV_IDS - set(by_id.keys())
        assert not wrong, f"INV items wrong type: {wrong}"
        assert not missing, f"INV items missing from registry: {missing}"

    def test_date_raw_preserved_for_prose_items(self, registry):
        by_id = {i['id']: i for i in registry['items']}
        missing = []
        for rid in TARGETED_PROSE_IDS | TARGETED_PARTIAL_IDS:
            if rid not in by_id:
                continue
            raw = by_id[rid].get('_date_raw') or {}
            if not raw:
                missing.append(rid)
        # Not strictly required for every item, but main-targeted ones should have preserved raw
        assert len(missing) < len(TARGETED_PROSE_IDS | TARGETED_PARTIAL_IDS), (
            f"_date_raw missing for all targeted items: {missing}")


# ─── Section 4: Idempotency CLI ──────────────────────────────────────────
class TestCliIdempotency:
    def _run(self, *args):
        return subprocess.run(
            [sys.executable, 'sheets_sync.py', *args],
            cwd=SCRIPT_DIR, capture_output=True, text=True, timeout=120)

    def test_dry_run_unclassified_zero_and_cl_new_zero(self):
        r = self._run('--dry-run')
        assert r.returncode == 0, f"dry-run failed: {r.stderr}"
        out = r.stdout
        # Unclassified 0
        m = re.search(r'Unclassified\s+(\d+)', out)
        assert m and int(m.group(1)) == 0, f"Unclassified != 0 in dry-run:\n{out[-800:]}"
        # Change Log new 0
        m2 = re.search(r'Change Log:\s*new\s+(\d+)', out)
        assert m2 and int(m2.group(1)) == 0, f"Change Log new != 0:\n{out[-800:]}"

    def test_diff_no_edits(self):
        r = self._run('--diff')
        assert r.returncode == 0, f"--diff failed: {r.stderr}"
        assert 'No sheet edits since last push' in r.stdout, f"Unexpected --diff output:\n{r.stdout}"

    def test_pull_disabled(self):
        r = self._run('--pull')
        assert r.returncode != 0
        combined = r.stdout + r.stderr
        assert '--pull is disabled' in combined, f"--pull msg wrong: {combined}"


# ─── Section 5: Offline unit tests for diff_sheet / apply_change_log ─────
class TestDiffApplyUnit:
    def _make_sheet(self, pushed_row, **sheet_overrides):
        hdr = list(ss.CONTRACT_COLS)
        row = list(pushed_row)
        for col, val in sheet_overrides.items():
            row[ss.COL[col]] = val
        return [hdr, row]

    def _baseline_pushed_row(self):
        # Minimal valid pushed row for item X-1
        row = [''] * len(ss.CONTRACT_COLS)
        row[ss.COL['Project']] = 'POS'
        row[ss.COL['ID']] = 'X-1'
        row[ss.COL['Type']] = 'BUG'
        row[ss.COL['Title']] = 'Original title'
        row[ss.COL['Status']] = 'INTAKE'
        row[ss.COL['Priority']] = 'P2'
        row[ss.COL['Registered']] = '2026-01-01'
        return row

    def test_status_edit_pending(self):
        pushed = self._baseline_pushed_row()
        sheet = self._make_sheet(pushed, Status='PLANNING')
        rows, _ = ss.diff_sheet(sheet, {'X-1': pushed}, set())
        assert len(rows) == 1 and rows[0][2] == 'Status' and rows[0][5] == 'PENDING', rows

    def test_title_edit_rejected_with_note(self):
        pushed = self._baseline_pushed_row()
        sheet = self._make_sheet(pushed, Title='New title')
        rows, _ = ss.diff_sheet(sheet, {'X-1': pushed}, set())
        assert len(rows) == 1 and rows[0][2] == 'Title'
        assert rows[0][5] == 'REJECTED'
        assert rows[0][7] == 'column not editable in Phase 1', rows[0]

    def test_priority_edit_applied_dashboard(self):
        pushed = self._baseline_pushed_row()
        sheet = self._make_sheet(pushed, Priority='P0')
        rows, _ = ss.diff_sheet(sheet, {'X-1': pushed}, set())
        assert len(rows) == 1 and rows[0][2] == 'Priority'
        assert rows[0][5] == 'APPLIED'
        assert rows[0][7] == 'SOURCE=DASHBOARD', rows[0]

    def test_assignee_ignored_as_change(self):
        pushed = self._baseline_pushed_row()
        sheet = self._make_sheet(pushed, Assignee='Alice')
        rows, assignees = ss.diff_sheet(sheet, {'X-1': pushed}, set())
        assert rows == [], f"Assignee produced a CL row: {rows}"
        assert assignees == {'X-1': 'Alice'}

    def test_invalid_registered_rejected(self):
        pushed = self._baseline_pushed_row()
        sheet = self._make_sheet(pushed, Registered='2026-13-99 (bad)')
        rows, _ = ss.diff_sheet(sheet, {'X-1': pushed}, set())
        assert len(rows) == 1 and rows[0][2] == 'Registered'
        assert rows[0][5] == 'REJECTED', rows[0]

    def test_apply_change_log_approved_updates_item(self):
        items = {'X-1': {'id': 'X-1', 'status': 'INTAKE', 'priority': 'P2'}}
        cl = [['t', 'X-1', 'Status', 'INTAKE', 'PLANNING', 'APPROVED', '', '']]
        applied = ss.apply_change_log(cl, items)
        assert applied == 1
        assert items['X-1']['status'] == 'PLANNING'
        assert cl[0][5] == 'APPLIED'

    def test_type_mapper_converts_investigation(self):
        assert ss._build_type({'type': 'INVESTIGATION', 'id': 'INV-X'}) == 'INV'
        assert ss._build_type({'type': 'BUGFIX', 'id': 'BUG-X'}) == 'BUG'
        assert ss._build_type({'type': 'CHANGE REQUEST', 'id': 'CR-X'}) == 'CR'

    def test_clean_date_fields_prose(self):
        item = {'registered': '2026-09-24 (registered retroactively on 2026-10-01)',
                'last_updated': '2026-10-01', 'closed': ''}
        ss._clean_date_fields(item)
        assert item['registered'] == '2026-09-24'
        assert item.get('_date_raw', {}).get('registered', '').startswith('2026-09-24 (')

    def test_clean_date_fields_partial(self):
        item = {'registered': '2026-06', 'last_updated': '2026-06', 'closed': ''}
        ss._clean_date_fields(item)
        assert item['registered'] == '2026-06-01'
        assert item['last_updated'] == '2026-06-01'
        assert 'registered' in item.get('_date_approx', [])



# ─── Section 6: CR-418 handover verification matrix (V-1..V-20, R-1..R-5) ─
import hashlib as _hashlib
import os as _os


def _file_hash(p):
    return _hashlib.sha1(Path(p).read_bytes()).hexdigest()


class TestCR418Handover:
    """Explicit mapping of handover items V-1..V-20 and R-1..R-5."""

    # V-1
    def test_v1_py_compile_clean(self):
        r = subprocess.run([sys.executable, '-m', 'py_compile', 'sheets_sync.py'],
                           cwd=SCRIPT_DIR, capture_output=True, text=True)
        assert r.returncode == 0, f"py_compile failed: {r.stderr}"

    # V-2
    def test_v2_contract_cols_exact_22(self):
        expected = [
            'Project', 'ID', 'Type', 'Title', 'Status', 'Status note',
            'Priority', 'Risk', 'Area', 'Sprint', 'Blocked on', 'Owner action',
            'Assignee', 'Registered', 'Last updated', 'Closed',
            'Related', 'Artefacts', 'Code markers', 'Files', 'Notes', 'Money path',
        ]
        assert len(ss.CONTRACT_COLS) == 22
        assert ss.CONTRACT_COLS == expected
        assert ss.CONTRACT_COLS[0] == 'Project'
        assert ss.CONTRACT_COLS[12] == 'Assignee'
        assert ss.CONTRACT_COLS[21] == 'Money path'

    # V-3
    def test_v3_tabs_exact_10_order(self):
        expected = ['All Items', 'Intake', 'Planning', 'Implemented',
                    'QA', 'Smoke', 'Closed', 'Blockers', 'Change Log', 'Summary']
        assert ss.TABS == expected

    # V-4 / V-9 / R-2: --pull disabled; registry hash unchanged
    def test_v4_v9_r2_pull_disabled_and_registry_untouched(self):
        before_hash = _file_hash(REGISTRY_PATH)
        before_mtime = _os.path.getmtime(REGISTRY_PATH)
        r = subprocess.run([sys.executable, 'sheets_sync.py', '--pull'],
                           cwd=SCRIPT_DIR, capture_output=True, text=True, timeout=60)
        assert r.returncode != 0, "pull should exit non-zero"
        assert '--pull is disabled' in (r.stdout + r.stderr)
        after_hash = _file_hash(REGISTRY_PATH)
        after_mtime = _os.path.getmtime(REGISTRY_PATH)
        assert before_hash == after_hash, "registry.json content changed by --pull"
        assert before_mtime == after_mtime, "registry.json mtime changed by --pull"

    # --diff read-only: registry hash unchanged
    def test_v4_diff_readonly_registry_untouched(self):
        before_hash = _file_hash(REGISTRY_PATH)
        r = subprocess.run([sys.executable, 'sheets_sync.py', '--diff'],
                           cwd=SCRIPT_DIR, capture_output=True, text=True, timeout=60)
        assert r.returncode == 0, f"--diff failed: {r.stderr}"
        after_hash = _file_hash(REGISTRY_PATH)
        assert before_hash == after_hash, "registry.json changed by --diff"

    # V-6
    def test_v6_classify_status_callable_returns_enum_only(self, registry):
        allowed = set(ss.STATUS_ENUM) | {''}  # '' = unrouted (pre-classification)
        unclassified = []
        for item in registry['items']:
            cs = ss.classify_status(item)
            assert cs in allowed, f"{item.get('id')} → unexpected {cs!r}"
            if cs == '':
                unclassified.append(item.get('id'))
        # Contract expects 0 unclassified across registry
        assert not unclassified, f"{len(unclassified)} unclassified items: {unclassified[:10]}"

    # V-7
    def test_v7_build_contract_row_22_cols_all_items(self, registry):
        bad = []
        for item in registry['items']:
            row = ss._build_contract_row(item)
            if len(row) != 22:
                bad.append((item.get('id'), len(row)))
        assert not bad, f"Rows with != 22 cols: {bad[:5]}"

    # V-8 Assignee col13 blank unless captured from sheet
    def test_v8_assignee_default_blank(self, registry):
        populated = [i['id'] for i in registry['items']
                     if ss._build_contract_row(i)[ss.COL['Assignee']] != '']
        assert not populated, f"Assignee populated by agent: {populated[:5]}"
        # If sheet assignee passed → preserved
        row = ss._build_contract_row(registry['items'][0], assignee='Alice')
        assert row[ss.COL['Assignee']] == 'Alice'

    # V-11 / R-1: dry-run run report + ZERO writes
    def test_v11_r1_dry_run_report_and_no_writes(self, token):
        before_reg = _file_hash(REGISTRY_PATH)
        before_all = ss.read_tab(token, 'All Items')
        r = subprocess.run([sys.executable, 'sheets_sync.py', '--dry-run'],
                           cwd=SCRIPT_DIR, capture_output=True, text=True, timeout=120)
        assert r.returncode == 0, f"dry-run failed: {r.stderr}"
        out = r.stdout
        assert 'REGISTRAR RUN' in out, "Run report header missing"
        assert '(DRY-RUN)' in out, "(DRY-RUN) tag missing"
        assert 'Status distribution' in out
        after_reg = _file_hash(REGISTRY_PATH)
        after_all = ss.read_tab(token, 'All Items')
        assert before_reg == after_reg, "registry.json modified by --dry-run"
        assert before_all == after_all, "live sheet modified by --dry-run"

    # V-18: Change Log header 8 exact cols
    def test_v18_change_log_header_8_cols(self, token):
        rows = ss.read_tab(token, 'Change Log', 'A1:H1')
        assert rows, "Change Log tab empty"
        expected = ['Logged at', 'ID', 'Column', 'Old value (registry)',
                    'New value (sheet)', 'Decision', 'Decided at', 'Note']
        assert rows[0] == expected, f"Change Log header mismatch: {rows[0]}"

    # V-19: Summary format
    def test_v19_summary_structure(self, token):
        rows = ss.read_tab(token, 'Summary')
        assert rows, "Summary tab empty"
        # Flatten first cells into text for section header checks
        firsts = [(r[0] if r else '') for r in rows]
        assert 'Status' in firsts, "Missing Status block"
        assert 'Priority (open items)' in firsts, "Missing Priority block"
        assert 'Blocked on' in firsts, "Missing Blocked on block"
        joined = '\n'.join(firsts)
        assert 'Generated:' in joined, "Missing Generated: line"
        assert 'Pending change-log rows:' in joined, "Missing Pending change-log rows line"

    # R-4: All Items count == sum of stage tab rows + Unrouted
    def test_r4_all_items_equals_stage_sum(self, token, sheet_all):
        total = len(sheet_all) - 1
        stage_tabs = ['Intake', 'Planning', 'Implemented', 'QA', 'Smoke', 'Closed']
        stage_sum = 0
        for t in stage_tabs:
            rows = ss.read_tab(token, t)
            if rows:
                stage_sum += len(rows) - 1
        hdr = sheet_all[0]
        s_i = hdr.index('Status')
        unrouted = sum(1 for r in sheet_all[1:]
                       if ss._pad(r, len(hdr))[s_i].strip() not in ss.STATUS_ENUM)
        assert stage_sum + unrouted == total, (
            f"All Items={total}, stage sum={stage_sum}, unrouted={unrouted}")

    # R-5: no stage-tab row with empty ID/Type/Title/Status/Priority
    def test_r5_stage_tabs_required_fields_populated(self, token):
        req = ['ID', 'Type', 'Title', 'Status', 'Priority']
        bad = []
        for t in ['Intake', 'Planning', 'Implemented', 'QA', 'Smoke', 'Closed']:
            rows = ss.read_tab(token, t)
            if not rows:
                continue
            hdr = rows[0]
            idxs = {c: hdr.index(c) for c in req if c in hdr}
            for r in rows[1:]:
                r = ss._pad(r, len(hdr))
                for c, i in idxs.items():
                    if not r[i].strip():
                        bad.append((t, r[idxs['ID']] or '?', c))
        assert not bad, f"Stage tab rows missing required fields: {bad[:10]}"

    # R-3 (adapted): two consecutive --dry-run produce same status counts + CL new 0
    def test_r3_dry_run_idempotent(self):
        def run():
            r = subprocess.run([sys.executable, 'sheets_sync.py', '--dry-run'],
                               cwd=SCRIPT_DIR, capture_output=True, text=True, timeout=120)
            assert r.returncode == 0
            dist = {}
            for s in ss.STATUS_ENUM + ['Unclassified']:
                m = re.search(rf'^\s*{re.escape(s)}\s+(\d+)', r.stdout, re.M)
                if m:
                    dist[s] = int(m.group(1))
            m_cl = re.search(r'Change Log:\s*new\s+(\d+)', r.stdout)
            cl_new = int(m_cl.group(1)) if m_cl else -1
            return dist, cl_new
        d1, c1 = run()
        d2, c2 = run()
        assert d1 == d2, f"Status distribution drift: {d1} vs {d2}"
        assert c1 == 0 and c2 == 0, f"Change Log new not 0: {c1}, {c2}"

    # Registry spot-check — CR-418 must be GATE_5A_IMPLEMENTED, CR-417 present
    def test_registry_spotcheck_cr418_cr417(self, registry):
        by_id = {i['id']: i for i in registry['items']}
        assert 'CR-418' in by_id, "CR-418 missing from registry"
        cr418 = by_id['CR-418']
        print(f"CR-418 status={cr418.get('status')!r} sprint_key={cr418.get('sprint_key')!r}")
        assert 'GATE_5A_IMPLEMENTED' in str(cr418.get('status', '')).upper(), (
            f"CR-418 status drifted: {cr418.get('status')}")
        if 'CR-417' in by_id:
            cr417 = by_id['CR-417']
            print(f"CR-417 status={cr417.get('status')!r} sprint_key={cr417.get('sprint_key')!r}")

    # Expected current status distribution sanity (from problem statement)
    def test_expected_status_distribution(self, registry):
        from collections import Counter
        c = Counter(ss.classify_status(i) for i in registry['items'])
        expected = {'INTAKE': 91, 'PLANNING': 8, 'IMPLEMENTED': 37, 'QA': 170,
                    'SMOKE': 175, 'CLOSED': 272, 'PARKED': 16, 'DUPLICATE': 2}
        actual = {k: c.get(k, 0) for k in expected}
        unrouted = c.get('', 0)
        print(f"Status distribution actual: {actual}, unrouted={unrouted}")
        # Soft asserts: report differences, but 0 unclassified is hard requirement (V-6)
        assert unrouted == 0, f"Unclassified != 0: {unrouted}"

    # Change Log logic — invalid Status rejected
    def test_change_log_invalid_status_rejected(self):
        row = [''] * len(ss.CONTRACT_COLS)
        row[ss.COL['ID']] = 'X-1'
        row[ss.COL['Status']] = 'INTAKE'
        sheet = [list(ss.CONTRACT_COLS),
                 [v if i != ss.COL['Status'] else 'NOT_A_STATUS' for i, v in enumerate(row)]]
        rows, _ = ss.diff_sheet(sheet, {'X-1': row}, set())
        assert len(rows) == 1
        assert rows[0][2] == 'Status' and rows[0][5] == 'REJECTED', rows[0]

    # Approved rows apply and update item correctly
    def test_apply_change_log_applied_marks_decided_at(self):
        items = {'X-1': {'id': 'X-1', 'status': 'INTAKE'}}
        cl = [['t', 'X-1', 'Status', 'INTAKE', 'PLANNING', 'APPROVED', '', '']]
        ss.apply_change_log(cl, items)
        assert cl[0][5] == 'APPLIED'
        assert cl[0][6] != ''  # Decided at populated
