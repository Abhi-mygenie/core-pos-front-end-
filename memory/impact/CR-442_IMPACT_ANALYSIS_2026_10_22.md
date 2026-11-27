# CR-442 — Impact Analysis

**ID:** CR-442
**Title:** Tech Tasks Sheet: POS Intake Inbox (Drift only)
**Gate:** 2 — Impact Analysis
**Date:** 2026-10-22
**Risk:** LOW
**Code Reality:** NONE
**Conflict Pre-Check:** CLEAR

---

## 1. Header Checks

### Code Reality
```bash
grep -r "tech_tasks\|TT_SHEET\|tech-tasks" /app/frontend/src/ /app/memory/reports/ → 0 hits
```
**NONE** — nothing to retrofit.

### Conflict Pre-Check
| File | Last touched by | Status | Conflict? |
|---|---|---|---|
| `memory/reports/sheets_sync.py` | CR-428 (2026-10-15) | GATE_5A_IMPLEMENTED | **CLEAR** |
| `memory/control/AGENT_PROMPT_ALPHA.md` | CR-416 (2026-10-14) | GATE_5A_IMPLEMENTED | **CLEAR** |
| `frontend/.env` | This session (env vars) | No open CR | **CLEAR** |

---

## 2. Data Flow Trace

### Existing SHEET DRIFT path (unchanged)
```
python3 sheets_sync.py --pull --dry-run
  → main() L1172-1180
  → cmd_diff_log(dry_run=True) L1039
      → get_access_token() L616     ← same token reused for Part B
      → sheets_get(REGISTRY_EXPORT, 'All Items') L1046
      → diff registry.json vs sheet
      → print drift or "No drift"   ← Part B appended here
```

### New Part B path (additive)
```
cmd_diff_log(dry_run=True)              ← existing entry point, unchanged
  ...existing Part A drift logic...
  → cmd_tech_tasks_drift(token)         ← NEW call appended at end
      → requests.get(TT_SHEET_ID, POS!A1:O200)   ← Tech Tasks sheet, POS tab
      → filter rows where col K (Status) == "Intake"
      → print formatted table to stdout
      → zero writes to any sheet
      → zero writes to registry.json
```

---

## 3. Affected Files & Exact Edit Locations

### E1 — `frontend/.env`
**What:** Add one line
```
TECH_TASKS_SHEET_ID=1_H4vG9Ti4VuFfDcg5CXvGHIKtpPJkmttKow2xTxgq0U
```
**Where:** Append after `GOOGLE_SHEET_ID` line
**Risk:** Zero — additive env var, not read by React app

---

### E2 — `memory/reports/sheets_sync.py` — load TT_SHEET_ID
**Where:** Lines 34-35 (after `SHEET_ID` assignment)
**Current:**
```python
_raw_id  = os.getenv('GOOGLE_SHEET_ID', '').strip().strip('"').strip("'")
SHEET_ID = _raw_id.split('/')[0]
```
**New (additive):**
```python
_raw_id   = os.getenv('GOOGLE_SHEET_ID', '').strip().strip('"').strip("'")
SHEET_ID  = _raw_id.split('/')[0]
TT_SHEET_ID = os.getenv('TECH_TASKS_SHEET_ID', '').strip().strip('"').strip("'")
```
**Risk:** Zero — new constant, nothing else changes

---

### E3 — `memory/reports/sheets_sync.py` — new `tt_sheets_get()` helper
**Where:** After `_range_url()` at line 667 (before tab management section)
**New function:**
```python
def tt_sheets_get(token, tab, cell_range):
    """Read-only GET against the Tech Tasks sheet (TT_SHEET_ID)."""
    enc = urllib.parse.quote(f"'{tab}'!{cell_range}", safe='')
    return requests.get(
        f'https://sheets.googleapis.com/v4/spreadsheets/{TT_SHEET_ID}/values/{enc}',
        headers=_headers(token), timeout=30,
    )
```
**Risk:** Zero — new function, does not touch `SHEET_ID` or any existing function

---

### E4 — `memory/reports/sheets_sync.py` — new `cmd_tech_tasks_drift()` function
**Where:** New function added before `cmd_diff_log()` (before line 1039)
**Logic:**
- Call `tt_sheets_get(token, 'POS', 'A1:O200')`
- If 403/404 → print warning, return (soft fail — never blocks Part A)
- Parse header row, find col K index (Status)
- Filter rows where Status == "Intake"
- Print section:
  ```
  ── TECH TASKS — POS Inbox (14 Intake items) ──────────────────
  TT-004  High    Finalize and create the sales report format…
  TT-006  High    Inform the tech team about the PWA refresh…
  …
  ```
- Zero writes to any sheet or file
**Risk:** LOW — pure read; soft-fail on any API error (Part A drift unaffected)

---

### E5 — `memory/reports/sheets_sync.py` — call Part B at end of `cmd_diff_log()`
**Where:** Line 1113 (after final print in `cmd_diff_log`) — append call
**Current last lines of cmd_diff_log:**
```python
    if dry_run:
        print(f"\n  [dry-run] {len(cl_rows)} change(s) found. No writes made.")
    else:
        print(f"\n  ✅ {len(cl_rows)} change(s) logged to Change Log (PENDING).")
        print("     Present to owner for approval before applying to registry.")
```
**Add after:**
```python
    # CR-442: Part B — Tech Tasks POS Inbox
    if TT_SHEET_ID:
        cmd_tech_tasks_drift(token)
```
**Risk:** LOW — guarded by `if TT_SHEET_ID` so it silently skips if env var missing

---

### E6 — `memory/reports/sheets_sync.py` — soft-warn for missing TT_SHEET_ID in `main()`
**Where:** Lines 1142-1149 (missing-vars check in main)
**Current:** Hard exits on missing `GOOGLE_SHEET_ID`
**Change:** Do NOT add `TECH_TASKS_SHEET_ID` to the hard-exit list. Instead add a soft warning:
```python
if not TT_SHEET_ID:
    print("⚠  TECH_TASKS_SHEET_ID not set — Tech Tasks Inbox (Part B) will be skipped")
```
**Where:** After the hard-exit check (line ~1149), before the Sheet ID print
**Risk:** Zero — Part A (registry drift) still runs fully even if TT_SHEET_ID is absent

---

### E7 — `memory/control/AGENT_PROMPT_ALPHA.md` — add Role 15
**Three additive inserts, zero deletions:**

**E7a** — Role Decision Tree table (after Role 14 SHEET DRIFT row ~line 49):
```
|| Owner wants to see POS tasks routed from Tech Tasks sheet | **TECH TASKS DRIFT** |
```

**E7b** — Step 1 role table (after row 14 ~line 253):
```
|| **15** | **TECH TASKS DRIFT** | Owner wants to see POS inbox | Read POS tab of Tech Tasks sheet. Show all Intake rows. No writes, no auto-register. |
```

**E7c** — New ROLE 15 section (after ROLE 14 section ~line 1490):
```markdown
## ROLE 15: TECH TASKS DRIFT AGENT <!-- CR-442 -->

**When to call:** Owner says "show tech tasks" / "tech tasks drift" / "what's in my POS inbox"

### Do
1. Run: `cd /app && python3 memory/reports/sheets_sync.py --pull --dry-run`
2. The output includes Part A (registry drift) followed by Part B (POS Inbox).
3. Print output as-is. STOP.

### Hard rules (MANDATORY)
- NEVER auto-register any TT row as a CR or BUG.
- NEVER write to any sheet tab.
- NEVER write to registry.json.
- Show the list to the owner. Owner calls the next role.

### Output
Read-only output printed as-is. Owner decides what to do next.
```

**Risk:** LOW — additive only; ROLE 14 and all prior roles unmodified

---

### E8 — `memory/control/tech-tasks-sheet-contract.md` (new file)
**What:** Save the contract artifact into the repo so it's version-controlled
**Source:** Public artifact URL from handover
**Risk:** Zero — new file, documentation only

---

## 4. Downstream Consumers

| Component | Impact |
|---|---|
| `--push` (SHEET PUSH role) | **None** — calls `cmd_diff_log()` internally, Part B appended, read-only, no effect on push output |
| `--dry-run` alone (credential check) | **None** — takes early return at line 1156, never reaches `cmd_diff_log()` |
| `registry.json` | **Never touched** — Part B is read-only |
| Tech Tasks `Tasks` tab | **Never written** — read `POS` tab only |
| Tech Tasks derived tabs (SO, CRM, INV, INFRA) | **Never read or written** |
| NeoSapien Dispatch sheet | **Never touched** |
| `frontend/src/` | **Zero impact** |

---

## 5. Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | OAuth token lacks permission to read Tech Tasks sheet | Low (confirmed in OD-442-04 access probe) | E4 soft-fails with warning, Part A unaffected |
| R2 | POS tab column layout differs from contract | Low (verified live: 15 cols A–O) | E4 reads by header name, not index |
| R3 | `TECH_TASKS_SHEET_ID` missing after re-pull | Low (stored in `frontend/.env` which is preserved on re-pulls) | E6 soft-warn, Part B silently skips |
| R4 | Part B output breaks Part A readability | Low | Clear separator header printed before Part B |

---

## 6. Verification Matrix (seeds QA handover)

| Edit | File | How to verify |
|---|---|---|
| E1 | `frontend/.env` | `grep TECH_TASKS_SHEET_ID /app/frontend/.env` → value present |
| E2 | `sheets_sync.py` | `python3 -c "from memory.reports import sheets_sync; print(sheets_sync.TT_SHEET_ID)"` |
| E3+E4 | `sheets_sync.py` | `python3 -c "import py_compile; py_compile.compile('memory/reports/sheets_sync.py')"` exit 0 |
| E5 | `sheets_sync.py` | `python3 memory/reports/sheets_sync.py --pull --dry-run` → output contains "TECH TASKS" section |
| E6 | `sheets_sync.py` | Temporarily unset TECH_TASKS_SHEET_ID → script warns but continues |
| E7 | `AGENT_PROMPT_ALPHA.md` | `grep "TECH TASKS DRIFT" memory/control/AGENT_PROMPT_ALPHA.md` → 3 hits |
| E8 | `tech-tasks-sheet-contract.md` | File exists at `memory/control/tech-tasks-sheet-contract.md` |

---

## 7. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-442 → status: GATE_5A_IMPLEMENTED, sprint_key: tooling_oct1
- [ ] CR_REGISTRY.md: row updated with GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add sheets_sync.py + AGENT_PROMPT_ALPHA.md + frontend/.env with CR-442 + date
- [ ] Code markers: # CR-442 in every modified section of sheets_sync.py
                   <!-- CR-442 --> in AGENT_PROMPT_ALPHA.md additions
```

---

## 8. Scope Lock

**Files WILL change:**
- `frontend/.env`
- `memory/reports/sheets_sync.py`
- `memory/control/AGENT_PROMPT_ALPHA.md`

**Files WILL NOT touch:**
- Anything under `frontend/src/`
- `backend/`
- `memory/control/registry.json` (during implementation)
- Tech Tasks sheet `Tasks` tab or any derived tab
- NeoSapien Dispatch sheet
