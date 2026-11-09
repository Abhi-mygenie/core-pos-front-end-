# CR-442 — Implementation Plan

**ID:** CR-442
**Title:** Tech Tasks Sheet: POS Intake Inbox (Drift only)
**Gate:** 3 — Implementation Plan
**Date:** 2026-10-22
**Risk:** LOW
**IA doc:** `impact/CR-442_IMPACT_ANALYSIS_2026_10_22.md`

---

## Entry Verification (Implementation agent MUST confirm before coding)

For each edit below, confirm the anchor line still reads as shown.

| Edit | File | Line | Must read |
|---|---|---|---|
| E2 | `sheets_sync.py` | 35 | `SHEET_ID      = _raw_id.split('/')[0]` |
| E3 | `sheets_sync.py` | 667 | `    return urllib.parse.quote(raw, safe='')` |
| E5 | `sheets_sync.py` | 1096 | `    if not cl_rows:` |
| E6 | `sheets_sync.py` | ~1149 | `    if missing:` |
| E7a | `AGENT_PROMPT_ALPHA.md` | 49 | `\| Owner wants to see what CTO changed in the Google Sheet \| **SHEET DRIFT** \|` |
| E7b | `AGENT_PROMPT_ALPHA.md` | 253 | `\| **14** \| **SHEET DRIFT** \|` |
| E7c | `AGENT_PROMPT_ALPHA.md` | 1491 | `---` (blank line after ROLE 14 Skip section) |

If any anchor differs → STOP, return to Planning.

---

## Execution Sequence

### E1 — `frontend/.env` — add TECH_TASKS_SHEET_ID

**search_replace:**
```
old: GOOGLE_SHEET_ID=18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY
new: GOOGLE_SHEET_ID=18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY
     TECH_TASKS_SHEET_ID=1_H4vG9Ti4VuFfDcg5CXvGHIKtpPJkmttKow2xTxgq0U
```
Lines changed: 1 (additive)

---

### E2 — `sheets_sync.py` line 35 — load TT_SHEET_ID

**search_replace:**
```
old: SHEET_ID      = _raw_id.split('/')[0]
new: SHEET_ID      = _raw_id.split('/')[0]
     TT_SHEET_ID   = os.getenv('TECH_TASKS_SHEET_ID', '').strip().strip('"').strip("'")
```
Lines changed: 1 (additive)

---

### E3 — `sheets_sync.py` line 667-668 — new `tt_sheets_get()` helper

**search_replace** — insert after `_range_url` closes, before tab management:
```
old:     return urllib.parse.quote(raw, safe='')


# ── Tab management

new:     return urllib.parse.quote(raw, safe='')


def tt_sheets_get(token, tab, cell_range):
    """CR-442: Read-only GET against the Tech Tasks sheet (TT_SHEET_ID). Never touches SHEET_ID."""
    enc = urllib.parse.quote(f"'{tab}'!{cell_range}", safe='')
    return requests.get(
        f'https://sheets.googleapis.com/v4/spreadsheets/{TT_SHEET_ID}/values/{enc}',
        headers=_headers(token), timeout=30,
    )


# ── Tab management
```
Lines changed: 7 (additive)

---

### E4 — `sheets_sync.py` before `cmd_diff_log` — new `cmd_tech_tasks_drift()` function

**search_replace** — insert the new function immediately before `def cmd_diff_log`:
```
old: def cmd_diff_log(dry_run=False):

new: def cmd_tech_tasks_drift(token):
     """CR-442: Part B — Read POS tab of Tech Tasks sheet, print all Intake rows.
     Pure read-only. Never writes to any sheet or file. Never auto-registers anything."""
     r = tt_sheets_get(token, 'POS', 'A1:O200')
     if r.status_code != 200:
         print(f"\n  ⚠  Tech Tasks POS tab unreadable ({r.status_code}) — skipping Part B")
         return

     rows = r.json().get('values', [])
     if not rows or len(rows) < 2:
         print("\n── TECH TASKS — POS Inbox ──────────────────────────────────────\n"
               "  (no rows)")
         return

     header   = rows[0]
     data     = rows[1:]
     col      = {h: i for i, h in enumerate(header)}
     k_idx    = col.get('Status', 10)
     h_idx    = col.get('Priority', 7)
     e_idx    = col.get('Task', 4)
     a_idx    = col.get('ID', 0)

     intake = [r for r in data if (r[k_idx] if k_idx < len(r) else '') == 'Intake']

     print(f"\n── TECH TASKS — POS Inbox ({len(intake)} Intake item{'s' if len(intake)!=1 else ''}) "
           f"────────────────────────────────")
     if not intake:
         print("  No Intake items in POS tab.")
         return

     for row in intake:
         def c(i): return row[i] if i < len(row) else ''
         pri  = c(h_idx) or 'Medium'
         task = c(e_idx)[:80]
         tid  = c(a_idx)
         flag = ' ●' if pri == 'High' else ''
         print(f"  {tid:<8}  {pri:<8}{flag}  {task}")

     print(f"\n  Owner: review above, then call the relevant role to act on each item.")
     print(f"  Agent: NEVER auto-register. NEVER write to any sheet tab.")


def cmd_diff_log(dry_run=False):
```
Lines changed: ~35 (additive new function)

---

### E5 — `sheets_sync.py` line 1095 — call Part B BEFORE early return in `cmd_diff_log`

**search_replace:**
```
old:
    if not cl_rows:
        print("  ✅ No drift — sheet matches registry across all 20 tracked columns")
        return

new:
    # CR-442: Part B — always runs regardless of registry drift result
    if TT_SHEET_ID:
        cmd_tech_tasks_drift(token)

    if not cl_rows:
        print("  ✅ No drift — sheet matches registry across all 20 tracked columns")
        return
```
Lines changed: 3 (additive)

---

### E6 — `sheets_sync.py` `main()` — soft-warn if TT_SHEET_ID missing

**search_replace:**
```
old:
    if missing:
        sys.exit(f"❌ Missing env var(s) in {ENV_PATH}: {', '.join(missing)}")

    print(f"Sheet ID : {SHEET_ID}")

new:
    if missing:
        sys.exit(f"❌ Missing env var(s) in {ENV_PATH}: {', '.join(missing)}")
    if not TT_SHEET_ID:
        print(f"⚠  TECH_TASKS_SHEET_ID not set — Tech Tasks POS Inbox (Part B) will be skipped")

    print(f"Sheet ID : {SHEET_ID}")
```
Lines changed: 2 (additive)

---

### E7a — `AGENT_PROMPT_ALPHA.md` line 49 — Role Decision Tree

**search_replace:**
```
old: | Owner wants to see what CTO changed in the Google Sheet | **SHEET DRIFT** |

new: | Owner wants to see what CTO changed in the Google Sheet | **SHEET DRIFT** |
     | Owner wants to see POS tasks from Tech Tasks sheet | **TECH TASKS DRIFT** |
```
Lines changed: 1 (additive)

---

### E7b — `AGENT_PROMPT_ALPHA.md` line 253 — Step 1 role table

**search_replace:**
```
old: | **14** | **SHEET DRIFT** | Owner wants to see CTO Sheet changes | Run --pull --dry-run. Show diff only. No registry writes. |

new: | **14** | **SHEET DRIFT** | Owner wants to see CTO Sheet changes | Run --pull --dry-run. Show diff only. No registry writes. |
     | **15** | **TECH TASKS DRIFT** | Owner wants to see POS inbox | Run --pull --dry-run (includes Part B). Print Intake rows. No writes. No auto-register. |
```
Lines changed: 1 (additive)

---

### E7c — `AGENT_PROMPT_ALPHA.md` line 1491 — new ROLE 15 section

**search_replace** — insert after ROLE 14's closing `---`, before DISTRIBUTED ARTIFACT OWNERSHIP:
```
old: ---

## DISTRIBUTED ARTIFACT OWNERSHIP (v0.7)

new: ---

## ROLE 15: TECH TASKS DRIFT AGENT <!-- CR-442 -->

**When to call:** Owner says "tech tasks drift" / "show tech tasks" / "what's in my POS inbox" / "tech tasks"

### Boot
None — no file reading required.

### Do
1. Run: `cd /app && python3 memory/reports/sheets_sync.py --pull --dry-run`
2. Output has two parts — print both as-is. STOP.
   - **Part A:** Registry drift (registry.json vs Registry-Export sheet)
   - **Part B:** Tech Tasks POS Inbox (all Intake rows from Tech Tasks `POS` tab)
3. Owner reviews and calls the relevant next role for each item.

### Hard rules (MANDATORY — same weight as Role 14)
- **NEVER** auto-register any TT row as a CR or BUG — show to owner, wait for instruction.
- **NEVER** write to any sheet tab (Tasks, POS, or any derived tab).
- **NEVER** write to `registry.json` or any file.
- The list is read-only output. Owner calls the next role.

### Output
Read-only output printed as-is. Owner decides what to do next.
If Part B skipped: `"⚠ TECH_TASKS_SHEET_ID not set — Part B skipped."`

### Skip
Everything else — no planning, no code, no registry writes of any kind.

---

## DISTRIBUTED ARTIFACT OWNERSHIP (v0.7)
```
Lines changed: ~25 (additive)

---

### E8 — `memory/control/tech-tasks-sheet-contract.md` (new file)

**create_file** — fetch content from the artifact URL in the handover and save to repo path.
Source: `https://customer-assets-m6fa6gv7.emergentagent.net/job_domain-check-help/artifacts/47ed4f9fee6acaad_tech-tasks-sheet-contract.md`
Target: `/app/memory/control/tech-tasks-sheet-contract.md`

---

## Verification Matrix

| # | Edit | File | Self-test |
|---|---|---|---|
| V1 | E1 | `frontend/.env` | `grep TECH_TASKS_SHEET_ID /app/frontend/.env` → value present |
| V2 | E2 | `sheets_sync.py` | `grep TT_SHEET_ID /app/memory/reports/sheets_sync.py` → 2+ hits |
| V3 | E3 | `sheets_sync.py` | `grep tt_sheets_get /app/memory/reports/sheets_sync.py` → definition + call in E4 |
| V4 | E4 | `sheets_sync.py` | `grep cmd_tech_tasks_drift /app/memory/reports/sheets_sync.py` → definition + call in E5 |
| V5 | E5 | `sheets_sync.py` | `grep "CR-442" /app/memory/reports/sheets_sync.py` → 2 markers present |
| V6 | E3+E4 | `sheets_sync.py` | `python3 -c "import py_compile; py_compile.compile('memory/reports/sheets_sync.py')" ` → exit 0 |
| V7 | E5+E6 | `sheets_sync.py` | `python3 memory/reports/sheets_sync.py --pull --dry-run` → output contains "TECH TASKS" section |
| V8 | E7 | `AGENT_PROMPT_ALPHA.md` | `grep "TECH TASKS DRIFT" /app/memory/control/AGENT_PROMPT_ALPHA.md` → 3 hits |
| V9 | E8 | `tech-tasks-sheet-contract.md` | `ls /app/memory/control/tech-tasks-sheet-contract.md` → file exists |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-442 → status: GATE_5A_IMPLEMENTED, sprint_key: tooling_oct1
- [ ] CR_REGISTRY.md: row updated with GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add entry for CR-442 covering all 4 files + date 2026-10-22
- [ ] Code markers:
        sheets_sync.py  → # CR-442 comment in E2, E3, E4, E5 sections
        AGENT_PROMPT_ALPHA.md → <!-- CR-442 --> on all 3 new blocks
- [ ] Compile check: py_compile exit 0, --pull --dry-run exit 0
```

---

## Scope Lock

**Files WILL change:** `frontend/.env` · `memory/reports/sheets_sync.py` · `memory/control/AGENT_PROMPT_ALPHA.md`
**Files WILL create:** `memory/control/tech-tasks-sheet-contract.md`
**Files WILL NOT touch:** `frontend/src/` · `backend/` · `registry.json` · Tech Tasks sheet · NeoSapien Dispatch sheet
