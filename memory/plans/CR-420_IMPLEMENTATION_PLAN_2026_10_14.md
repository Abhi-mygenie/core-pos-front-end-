# CR-420 — Implementation Plan (Gate 3)

**Item:** CR-420 — sheets_sync.py: Post-Push QA Gap Fixes (9 gaps)
**Date:** 2026-10-14
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Stage:** GATE_3_PLAN_COMPLETE
**Author:** PLANNING agent
**Depends on:** `impact/CR-420_IMPACT_ANALYSIS_2026_10_14.md`

---

## Scope Lock

### Files WILL change
```
memory/reports/sheets_sync.py   (13 search_replace edits + 2 new functions)
```

### Files WILL NOT touch
```
memory/reports/.env · memory/control/registry.json
memory/control/AGENT_PROMPT_ALPHA.md · frontend/src/ · backend/
```

---

## Entry Verification

```bash
python3 -c "
lines = open('/app/memory/reports/sheets_sync.py').readlines()
assert len(lines) == 974, f'Expected 974, got {len(lines)}'
assert 'GATE' not in lines[94+30], 'already modified'
assert 'QA-VERIFIED' not in open('/app/memory/reports/sheets_sync.py').read()
assert 'compute_last_updated' not in open('/app/memory/reports/sheets_sync.py').read()
print('Entry verification PASS')
"
```

---

## Edit E1 — G2: Fix DEFERRED check (L125)

**search_replace old_str:**
```
    if 'PARKED' in s or ('DEFERRED' in s and 'GATE' not in s):
        return 'PARKED', ''
```

**search_replace new_str:**
```
    if 'PARKED' in s or ('DEFERRED' in s and not re.match(r'^GATE[_\s]?\d', s)):
        return 'PARKED', ''  # CR-420 G2
```

---

## Edit E2 — G3a: Extend blocked-party detection + add CLOSED patterns + OD-420-01 special-case

**search_replace old_str:**
```
    blocked = ''
    if 'BACKEND-BLOCKED' in s or 'BACKEND_BLOCKED' in s:
        blocked = 'BACKEND'
    elif 'CRM-BLOCKED' in s or 'CRM_BLOCKED' in s:
        blocked = 'CRM'
    elif 'OWNER-BLOCKED' in s:
        blocked = 'OWNER'

    if 'DUPLICATE' in s or 'CLOSED_DUPLICATE' in s:
        return 'DUPLICATE', ''

    if any(k in s for k in [
        'CLOSED', 'OWNER VERIFIED', 'OWNER_VERIFIED', 'SUBSUMED', 'RETIRED',
        'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN', 'BACKEND_FIXED',
        'COULD NOT REPRODUCE', 'CANNOT REPRODUCE', 'NOT REPRODUCIBLE',
        'CLOSED — ', 'CLOSED_',
        'SHIPPED',   # SHIPPED, SHIPPED + VERIFIED → CLOSED (OD-419-05)
    ]):
        return 'CLOSED', ''
```

**search_replace new_str:**
```
    blocked = ''
    if any(k in s for k in [                          # CR-420 G3d
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

    # OD-420-01: INVESTIGATION COMPLETE + BACKEND suffix → PLANNING (backend overrides)
    if 'INVESTIGATION COMPLETE' in s and blocked == 'BACKEND':  # CR-420 OD-420-01
        return 'PLANNING', 'BACKEND'

    if any(k in s for k in [
        'CLOSED', 'OWNER VERIFIED', 'OWNER_VERIFIED', 'SUBSUMED', 'RETIRED',
        'RESOLVED', 'ABSORBED', 'FOLDED', 'FROZEN', 'BACKEND_FIXED',
        'COULD NOT REPRODUCE', 'CANNOT REPRODUCE', 'NOT REPRODUCIBLE',
        'CLOSED — ', 'CLOSED_',
        'SHIPPED',           # OD-419-05
        'INVESTIGATION COMPLETE', 'SUPERSEDED', 'SPLIT →', 'SPLIT_',  # CR-420 G3a
        'MAIN VERIFIED',     # CR-420 G3a + OD-420-02
    ]):
        return 'CLOSED', ''
```

---

## Edit E3 — G3b+G3c+G3d: Add QA, IMPLEMENTED, PLANNING patterns after existing INTAKE check

**search_replace old_str:**
```
    if any(k in s for k in [
        'GATE_1', 'GATE 1', 'GATE_1_INTAKE', 'INTAKE', 'NOT STARTED',
        'NOT_STARTED', 'REGISTERED',
    ]):
        return 'INTAKE', blocked

    return 'UNCLASSIFIED', blocked
```

**search_replace new_str:**
```
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

    # CR-420 G3d: BACKEND-blocked items with no other stage → INTAKE + blocked set
    if blocked:
        return 'INTAKE', blocked

    return 'UNCLASSIFIED', blocked
```

---

## Edit E4 — G9: Extend compute_registered with intake_doc file lookup

**search_replace old_str:**
```
def compute_registered(item):
    for field in ('registered', 'created', 'created_at', 'intake_date',
                  'date', 'registered_at', 'created_date', 'registered_date'):
        val = str(item.get(field, '') or '').strip()
        if val:
            val = val[:10]
            if re.match(r'\d{4}-\d{2}-\d{2}', val):
                return val
    return ''
```

**search_replace new_str:**
```
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
    """Return last meaningful change date, falling back to push date."""
    for field in ('last_updated', 'updated', 'updated_at',
                  'implemented_date', 'qa_date', 'qa_smoke_date',
                  'closed_at', 'implemented_at'):
        val = str(item.get(field, '') or '').strip()
        if val and re.match(r'\d{4}-\d{2}-\d{2}', val[:10]):
            return val[:10]
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')
```

---

## Edit E5 — G4: Type normalisation in to_contract_row (L357)

**search_replace old_str:**
```
        str(item.get('type', '') or '').upper(),
```

**search_replace new_str:**
```
        _type_raw(item),             # CR-420 G4
```

Add `_type_raw` as a standalone function (insert before `to_contract_row`):

**search_replace old_str:**
```
# ── Row builder ────────────────────────────────────────────────────────────
def to_contract_row(item):
```

**search_replace new_str:**
```
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
    return t   # leave as-is if not recognised


def to_contract_row(item):
```

---

## Edit E6 — G5: Blocked on = item ID → move to Related, clear blocked_on

**search_replace old_str:**
```
    blocked_on = ''
    if contract_status not in ('CLOSED', 'PARKED', 'DUPLICATE'):
        blocked_on = str(
            item.get('blocked_by', '') or blocked_party or ''
        ).strip()
```

**search_replace new_str:**
```
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
```

**Note:** This edit references `related_ids` which is built AFTER blocked_on in current code.
The implementation agent must move the `related_ids` construction ABOVE the `blocked_on` block.
See execution note in §Execution Sequence.

---

## Edit E7 — G6: Replace hardcoded last_updated with compute_last_updated

**search_replace old_str:**
```
    registered   = compute_registered(item)
    last_updated = datetime.now(timezone.utc).strftime('%Y-%m-%d')
```

**search_replace new_str:**
```
    registered   = compute_registered(item)
    last_updated = compute_last_updated(item)    # CR-420 G6
```

---

## Edit E8 — G7: Summary ISO timestamp + standard Blocked on parties

**search_replace old_str:**
```
        [],
        ['Blocked on', 'Count'],
        *[[b, c] for b, c in sorted(blocked_counts.items(), key=lambda x: -x[1])],
        [],
        [f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}', ''],
        [f'Pending change-log rows: {pending_cl_count}', ''],
```

**search_replace new_str:**
```
        [],
        ['Blocked on', 'Count'],                   # CR-420 G7
        *[[p, blocked_counts.get(p, 0)]
          for p in ['BACKEND','POS','CRM','SO','INV','INFRA','OWNER','OPS','INTERNAL']],
        *[[b, c] for b, c in sorted(blocked_counts.items(), key=lambda x: -x[1])
          if b not in {'BACKEND','POS','CRM','SO','INV','INFRA','OWNER','OPS','INTERNAL'}],
        [],
        [datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), ''],
        [f'Pending change-log rows: {pending_cl_count}', ''],
```

---

## Edit E9 — G8: New freeze_tab_headers function (insert before cmd_push)

**search_replace old_str:**
```
# ── PUSH command ───────────────────────────────────────────────────────────
def cmd_push(dry_run=False):
```

**search_replace new_str:**
```
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
```

---

## Edit E10 — G8: Call freeze_tab_headers at end of cmd_push

**search_replace old_str:**
```
    # ── OD-419-04: diff + Change Log append runs as final step of push ──
```

**search_replace new_str:**
```
    # CR-420 G8: freeze row 1 on all tabs (get fresh meta after sync)
    fresh_meta = get_sheet_meta(token)
    freeze_tab_headers(token, fresh_meta, dry_run)

    # ── OD-419-04: diff + Change Log append runs as final step of push ──
```

---

## Edit E11 — G1: Skip col M in update_all_items_inplace — batchUpdate section

**search_replace old_str:**
```
    for item in items:
        contract_row = to_contract_row(item)
        item_id = item['id']
        if item_id in id_to_row:
            n = id_to_row[item_id]
            update_data.append({
                'range':  f"'All Items'!A{n}:V{n}",
                'values': [contract_row],
            })
        else:
            append_rows.append(contract_row)
```

**search_replace new_str:**
```
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
            # New row — split same way for consistency
            append_rows.append((contract_row[:12], contract_row[13:]))
```

---

## Edit E12 — G1: Update append_rows handling for col M skip

**search_replace old_str:**
```
    # Append new rows (POST /values:append with INSERT_ROWS)
    if append_rows:
        enc_a = _range_url('All Items', 'A1')
        r = requests.post(
            f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}'
            f'/values/{enc_a}:append',
            headers=_headers(token),
            json={'values': append_rows},
            params={'valueInputOption': 'RAW', 'insertDataOption': 'INSERT_ROWS'},
            timeout=60,
        )
        if r.status_code != 200:
            try:
                msg = r.json().get('error', {}).get('message', r.text[:80])
            except Exception:
                msg = r.text[:80]
            print(f"  ⚠  Append error: {msg}")
        else:
            print(f"  ✅ All Items  {updated_count:>4} updated "
                  f"+ {len(append_rows)} appended")
        time.sleep(0.3)
    else:
        print(f"  ✅ All Items  {updated_count:>4} updated, 0 appended")
```

**search_replace new_str:**
```
    # Append new rows — use batchUpdate with two ranges per row (CR-420 G1: skip col M)
    if append_rows:
        # Find next empty row number
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
```

---

## Execution Sequence

**Important: E5 (G4 + G5) requires reordering inside to_contract_row.**
The current code builds `blocked_on` AFTER `related_ids` in `to_contract_row`. E6 (G5) moves an item ID from `blocked_by` into `related_ids`, so `related_ids` must be built BEFORE `blocked_on`. The implementation agent must:
1. Apply E5 (insert `_type_raw` + `_ID_PREFIX_TO_TYPE` before `to_contract_row`)
2. Apply E4 (`_type_raw` call inside `to_contract_row` return)
3. In `to_contract_row`, move the `related_ids` block ABOVE the `blocked_on` block (lines 333–342 move to before line 311)
4. Apply E6 (`blocked_on` + `_ID_RE` check, now with access to `related_ids`)
5. Apply E7 (`compute_last_updated`)

Recommended order: E1 → E2 → E3 → E4 → E5 → (reorder) → E6 → E7 → E8 → E9 → E10 → E11 → E12

---

## Verification Matrix

| # | Edit | Verification | Expected |
|---|---|---|---|
| V1 | E1 G2 | `python3 -c "from sheets_sync import to_contract_status; print(to_contract_status('DEFERRED-TO-FU-385-C (Gate 5 note)')[0])"` | `PARKED` |
| V2 | E2 G3a | `to_contract_status('INVESTIGATION COMPLETE')[0]` | `CLOSED` |
| V3 | E2 OD-420-01 | `to_contract_status('INVESTIGATION COMPLETE — BACKEND-BLOCKED')[0]` | `PLANNING` |
| V4 | E3 G3b | `to_contract_status('QA-VERIFIED (P0.5)')[0]` | `QA` |
| V5 | E3 G3b | `to_contract_status('FIXED + QA-VERIFIED 2026-09-21')[0]` | `QA` |
| V6 | E3 G3c | `to_contract_status('IMPLEMENTATION IN PROGRESS')[0]` | `IMPLEMENTED` |
| V7 | E4 G4 | `_type_raw({'id':'INV-ROOM-001','type':'INVESTIGATION'})` | `INV` |
| V8 | E4 G4 | `_type_raw({'id':'BUG-169','type':''})` | `BUG` |
| V9 | E6 G5 | `to_contract_row({'id':'CR-062','title':'t','status':'GATE_1','blocked_by':'CR-061'})[10]` | `''` (Blocked on blank) |
| V9b | E6 G5 | Same row — check Related (index 16) | contains `CR-061` |
| V10 | E8 G7 | `build_summary_rows([])[-1][0]` | ends with `Z` (ISO format) |
| V11 | E8 G7 | `build_summary_rows([])[7][0]` | `BACKEND` (standard party at zero) |
| V12 | All | `--dry-run` exit 0; UNCLASSIFIED count ≤ 5 | pass |

---

## EXIT GATE (doc-only: 4 checkboxes + compile check mandatory)

```
□ 1. COMPILE: python3 -m py_compile /app/memory/reports/sheets_sync.py
□ 2. DRY-RUN: --push --dry-run exits 0; UNCLASSIFIED ≤ 5 in run report
□ 3. REGISTRY SYNC: CR-420 → GATE_5A_IMPLEMENTED
□ 4. CR_REGISTRY.md + FILE_OWNERSHIP.md updated
```

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-420 → GATE_5A_IMPLEMENTED, sprint_key: tooling_oct1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: sheets_sync.py CR-420 IMPL row added
- [ ] Code markers: # CR-420 in each edited function
```
