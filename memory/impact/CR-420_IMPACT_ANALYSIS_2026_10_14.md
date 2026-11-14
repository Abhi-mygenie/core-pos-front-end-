# CR-420 — Impact Analysis (Gate 2)

**Item:** CR-420 — sheets_sync.py: Post-Push QA Gap Fixes (9 gaps)
**Date:** 2026-10-14
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent
**Depends on:** `change_requests/CR-420_SHEETS_SYNC_POST_PUSH_QA_GAP_FIXES_INTAKE.md`

---

## Code Reality

**NONE** — confirmed. Zero fix code exists for any of the 9 gaps.

---

## Conflict Pre-Check

| Item | File | Status | Conflict? |
|---|---|---|---|
| CR-419 | `sheets_sync.py` | GATE_5A_IMPLEMENTED | NONE — parent; this CR patches its output |
| CR-416 | `AGENT_PROMPT_ALPHA.md` | GATE_5A | NONE — different file |

**No conflicts. CR-420 proceeds independently.**

---

## 1. Affected file + current anchors

File: `memory/reports/sheets_sync.py` — 974 lines as of 2026-10-14.

| Function | Lines | Gaps touched |
|---|---|---|
| `to_contract_status()` | L94–159 | G2, G3 (status map + DEFERRED fix) |
| `compute_registered()` | L255–263 | G6, G9 (last_updated + intake_doc date) |
| `to_contract_row()` | L275–377 | G4, G5, G6 (type, blocked_on, last_updated) |
| `build_summary_rows()` | L402–445 | G7 (ISO timestamp + standard parties) |
| `write_tab()` | L534–560 | G8 (freeze row 1) |
| `update_all_items_inplace()` | L564–700 | G1 (skip col M in batchUpdate) |

**New function:** `compute_last_updated(item)` — extracted helper for G6.
**New function:** `freeze_tab_headers(token, meta)` — batch-freeze all tabs for G8.

---

## 2. Gap-by-gap analysis

### G1 — Assignee (col M) overwritten (L628–631)

Current batchUpdate entry:
```python
update_data.append({
    'range':  f"'All Items'!A{n}:V{n}",
    'values': [contract_row],
})
```
Writes all 22 cols including M (index 12 = Assignee = blank). Destroys dashboard Assignee.

**Fix:** Split every row into two ranges: `A{n}:L{n}` (indices 0–11) + `N{n}:V{n}` (indices 13–21).
Same split for append_rows: use batchUpdate with two valueRanges per new row.
Fresh-write path (one-time migration): header writes M1 = "Assignee" header text (acceptable — no data); data rows use same A:L + N:V split.

CONTRACT_COLS column positions:
- A–L (indices 0–11): Project, ID, Type, Title, Status, Status note, Priority, Risk, Area, Sprint, Blocked on, Owner action
- M (index 12): Assignee ← **SKIP**
- N–V (indices 13–21): Registered, Last updated, Closed, Related, Artefacts, Code markers, Files, Notes, Money path

---

### G2 — DEFERRED items UNCLASSIFIED (L125)

Current: `if 'PARKED' in s or ('DEFERRED' in s and 'GATE' not in s):`

BUG-443, BUG-444, BUG-449 have `DEFERRED-TO-FU-385-C (... Gate 5 CLOSED 2026-09-24 ...)` as their full status. `'GATE' not in s` fails because "Gate 5" appears in the prose notes.

**Fix:** Check if string *starts with* a gate number pattern instead:
```python
if 'PARKED' in s or ('DEFERRED' in s and not re.match(r'^GATE[_\s]?\d', s)):
```

---

### G3 — 35 items UNCLASSIFIED — missing status patterns

#### G3a — New CLOSED patterns (add to existing CLOSED check, L116–123)
Add to the `any(k in s ...)` keyword list:
- `'INVESTIGATION COMPLETE'` — 5x INV-* items + BUG-268 (but BUG-268 also has BACKEND suffix → blocked detection catches BACKEND first, so PLANNING+BACKEND takes priority via E5 below)
- `'SUPERSEDED'` — BUG-139, BUG-520, BUG-521
- `'SPLIT →'` and `'SPLIT_'` — CR-372
- `'MAIN VERIFIED'` — BUG-097 (OD-420-02: CLOSED)

**Ordering concern:** `'INVESTIGATION COMPLETE — BACKEND-BLOCKED'` (BUG-268):
- CLOSED check runs before the extended PLANNING check
- But: the blocked-party detection at L105–111 already runs first and sets `blocked='BACKEND'`
- The function returns `('CLOSED', '')` — blocked is dropped
- OD-420-01 says: PLANNING+Blocked on=BACKEND takes priority for BUG-268
- Fix: in the CLOSED check, skip items that have `BACKEND-BLOCKED` suffix

Add a special-case before the CLOSED check:
```python
# OD-420-01: INVESTIGATION COMPLETE + BACKEND-BLOCKED → PLANNING (blocked overrides)
if 'INVESTIGATION COMPLETE' in s and blocked == 'BACKEND':
    return 'PLANNING', 'BACKEND'
```

#### G3b — New QA patterns (new block after existing QA check, L139)
```python
if any(k in s for k in [
    'QA-VERIFIED', 'QA_VERIFIED', 'FIXED + QA-VERIFIED',
    'FIXED-BY-CONSTRUCTION + QA-VERIFIED', 'UNIT-VERIFIED',
    'GATE_5_PENDING_QA',
]):
    return 'QA', blocked
```
Covers: BUG-097 (MAIN VERIFIED → CLOSED, caught by G3a), BUG-431, BUG-432 (FIXED-BY-CONSTRUCTION), BUG-434–438 (QA-VERIFIED P0.5), BUG-439–442 (FIXED + QA-VERIFIED), BUG-445, BUG-447, BUG-448, CR-117 (GATE_5_PENDING_QA). Total: 16 items → QA.

#### G3c — New IMPLEMENTED patterns (new block after existing IMPLEMENTED check, L145)
```python
if 'IMPLEMENTATION IN PROGRESS' in s:
    return 'IMPLEMENTED', blocked
if re.search(r'PHASE\s*\d+\s*COMPLETE', s):
    return 'IMPLEMENTED', blocked
```
Covers: CR-053 (IMPLEMENTATION IN PROGRESS), CR-011 (OPEN — Phase 3 COMPLETE). ~2 items → IMPLEMENTED.

#### G3d — Extend PLANNING+BACKEND patterns (L105–111 + new check near L157)
Extend blocked-party detection (L105–111) to also catch:
```python
if any(k in s for k in ['BACKEND-BLOCKED', 'BACKEND_BLOCKED',
                         'HOLD — BACKEND', 'HOLD - BACKEND',
                         'FE-VERIFIED, BE-FOLLOWUP',
                         'INVESTIGATED_ROOT_CAUSE',
                         'BACKEND_BRIEF_FILED', 'BACKEND PENDING']):
    blocked = 'BACKEND'
```
These items will naturally fall to the existing PLANNING check (GATE_2/GATE_3) or to the new fallback:
Add after existing PLANNING check (L157):
```python
if blocked == 'BACKEND' and not contract_status:
    # Items whose status text only indicates BACKEND blockage → PLANNING+BACKEND
    return 'PLANNING', 'BACKEND'
```
Actually simpler: add explicit check before UNCLASSIFIED return:
```python
if blocked:   # has a blocked party but no stage match → INTAKE with blocked set
    return 'INTAKE', blocked
```
Wait, that's too broad. Better: items like BACKEND_BLOCKED with no other stage → PLANNING seems too presumptuous. Keep as INTAKE + Blocked on = BACKEND. The contract says BLOCKED is not a status — item keeps its real stage. If we can't determine the stage, INTAKE + Blocked on is the safe default.

Revised: BUG-183 (BACKEND_BLOCKED), CR-134 (HOLD — BACKEND PENDING), PROD-003 (FE-VERIFIED, BE-FOLLOWUP), BUG-454 (INVESTIGATED_ROOT_CAUSE_UPSTREAM), BUG-463 (BACKEND_BRIEF_FILED) → INTAKE + Blocked on = BACKEND. The current code returns UNCLASSIFIED for these, which then becomes INTAKE anyway. The only gap is that blocked_party isn't being set. The fix is in the blocked-party detection (extend L105–111).

---

### G4 — Type normalisation (L357 in to_contract_row)

Current: `str(item.get('type', '') or '').upper()`

Fix:
- `INVESTIGATION` → `INV` (7 items: INV-*)
- Blank → derive from ID prefix: `BUG-` → `BUG`, `CR-` → `CR`, `INV-` → `INV`
- Other blank (CR-035, BUG-169/170/171, BUG-506/507/508, BUG-528/529) → derive from prefix

---

### G5 — Blocked on = item ID (L311–315 in to_contract_row)

Current: `blocked_on = str(item.get('blocked_by', '') or blocked_party or '').strip()`

CR-062 has `blocked_by = 'CR-061'`. This writes `CR-061` into Blocked on.

Fix: after computing `blocked_on`, if it matches `^(CR|BUG|PROD|INV)-\d`, move value to `related_ids` and clear `blocked_on`.

---

### G6 — last_updated hardcoded (L324 in to_contract_row)

Current: `last_updated = datetime.now(timezone.utc).strftime('%Y-%m-%d')`

Fix: new `compute_last_updated(item)` helper:
- Checks fields: `last_updated`, `updated`, `updated_at`, `implemented_date`, `qa_date`
- Falls back to push date only if none present
- Coverage: 85/837 items have a date field → 85 get real date; 752 fall back to push date

---

### G7 — Summary format (L431–444 in build_summary_rows)

Two fixes:
1. L442: `strftime("%Y-%m-%d %H:%M UTC")` → `strftime('%Y-%m-%dT%H:%M:%SZ')`
2. L439–440: Counter-only Blocked on → add all 8 standard parties at zero:
   `STANDARD_PARTIES = ['BACKEND','POS','CRM','SO','INV','INFRA','OWNER','OPS','INTERNAL']`

---

### G8 — Stage tab row 1 freeze (after write_tab)

New function `freeze_tab_headers(token, meta)`: reads sheetIds from meta, sends one batchUpdate `updateSheetProperties` request with `frozenRowCount: 1` for all 10 contract tabs.
Called once in `cmd_push()` after all tabs are written.

---

### G9 — Registered date from intake_doc file (extends compute_registered)

Extend `compute_registered(item)`: after registry field fallback chain, if still blank and `intake_doc` field present, open the file, read first 15 lines, find `**Date:**` or `**Registered:**`, extract YYYY-MM-DD.
Coverage gain: 87 more items → total 164 + 87 = **251 items** with Registered date.

---

## 3. Files WILL change

```
memory/reports/sheets_sync.py   (13 targeted edits, 2 new functions)
```

## Files WILL NOT touch

```
memory/control/registry.json · memory/reports/.env · AGENT_PROMPT_ALPHA.md
frontend/src/ · backend/
```

---

## 4. Risk

| Field | Value |
|---|---|
| **Risk** | MEDIUM — same as CR-419 |
| **Highest-risk edit** | G1 (split batchUpdate range) — range math must be exact; off-by-one shifts all cols |
| **Second highest** | G3 ordering — CLOSED check must not swallow PLANNING+BACKEND items (BUG-268 special-case) |
| **Safe edits** | G4, G5, G7, G8, G9 — additive, non-destructive |

---

## 5. Gate Status

| Gate | Status |
|---|---|
| Gate 1 | COMPLETE |
| Gate 2 | **COMPLETE** (this document) |
| Gate 3 | PENDING |
| Gate 4 GO | NOT given |
