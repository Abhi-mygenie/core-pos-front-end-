# QA HANDOVER — CR-389 Registry Excel Export
**Date:** 2026-09-27
**Written by:** IMPLEMENTATION agent (AGENT_PROMPT_ALPHA v0.7 Role 3)
**Item:** CR-389 · P2 · Risk LOW · sprint `sep_bug_closure`
**Plan:** `plans/CR-389_IMPLEMENTATION_PLAN.md` · **Impact:** `impact/CR-389_IMPACT_ANALYSIS.md`

## 0. Files changed
| File | Type |
|---|---|
| `memory/reports/registry_export.py` | NEW (script, marker `# CR-389` line 1) |
| `memory/reports/REGISTRY_EXPORT_2026_09_27.xlsx` | NEW (output, binary) |

Zero `frontend/src/**`, zero `backend/**`, `registry.json` read-only by script.

## 0a. Amendments vs plan (owner-approved in session, same file)
| # | Type | Change | Reason |
|---|---|---|---|
| A-1 | CODE_ERROR in plan | `notes[:250].rsplit(" ",1)[0]` → only rsplit when `len(notes) > 250` | Plan's code dropped the last word of every note |
| A-2 | PLAN_GAP | `norm_status()` extended to gate-based mapping for 66 legacy status strings | 66 items fell into generic "OPEN"; owner: "status will be as per gate" |

Gate mapping now applied by `norm_status()`:
`CLOSED` ← CLOSED / GATE_6 / OWNER VERIFIED / SHIPPED / RESOLVED / MAIN VERIFIED / *VERIFIED* · `QA PASS` ← GATE_5B / QA PASS / QA-VERIFIED · `IMPLEMENTED` ← GATE_5A / GATE_5_* / IMPLEMENTED / FIXED · `GATE 4 GO` ← GATE_4 / IN PROGRESS · `PLANNING` ← GATE_3 / GATE 3 / PLAN_COMPLETE / GATE_2 / GATE 2 / IMPACT · `INTAKE` ← INTAKE / GATE_1 / GATE 1 / REGISTERED / NOT STARTED · `DUPLICATE` ← DUPLICATE / SUBSUMED / SUPERSEDED / RETIRED / OBSOLETE / ABSORBED / SPLIT · `PARKED` ← PARKED / DEFERRED / CARRY-FORWARD · `WONT-FIX` ← WONT · `BLOCKED` ← BLOCKED / BACKEND · `OPEN` ← everything else (only 7 INVESTIGATION items remain)

## 1. Inherited from Plan (Verification Matrix results)
| # | Check | Method | Self-Test Result |
|---|---|---|---|
| V-1 | Script runs, exit 0 | `python3 /app/memory/reports/registry_export.py` | PASS ✅ |
| V-2 | All Items rows = 731 | openpyxl `max_row-1` | PASS ✅ 731 |
| V-3 | Open Only < All | row count | PASS ✅ 427 |
| V-4 | Summary has 4 sections | Type × Status · By Area · By Sprint · Blocked Items (24) | PASS ✅ |
| V-5 | OPEN items description 3–5 lines | intake-doc mined where doc exists (148); title+notes fallback otherwise (plan §5) | PASS ✅ (e.g. CR-389 row = 3 mined lines) |
| V-6 | CLOSED items 1 line ≤200 chars | spot-check 5 | PASS ✅ |
| V-7 | 21 header columns | `max_column` | PASS ✅ |
| V-8 | No None/null in ID | scan | PASS ✅ 0 |
| V-9 | Type normalised | distinct values: CR / BUG / GAP / INVESTIGATION / UNKNOWN(4 items with no `type`) | PASS ✅ |
| V-10 | Re-run creates/refreshes dated file | ran 3× | PASS ✅ |

**Self-test: 10/10 PASS.**

## 2. Additional test cases (discovered during implementation)
| # | Test | Steps | Expected |
|---|---|---|---|
| T-11 | Status distribution matches gates | `python3 -c "import json,sys;sys.path.insert(0,'/app/memory/reports');from registry_export import norm_status;from collections import Counter;d=json.load(open('/app/memory/control/registry.json'));print(Counter(norm_status(i.get('status','')) for i in d['items']))"` | INTAKE 33 · PLANNING 5 · GATE 4 GO 0 · IMPLEMENTED 30 · QA PASS 328 · CLOSED 253 · DUPLICATE 23 · PARKED 28 · BLOCKED 24 · OPEN 7 (all INVESTIGATION/INV-*) |
| T-12 | Notes not truncated | Find POS2-001 in All Items → Description | ends with "…shipped CRs" (not "…shipped") |
| T-13 | Status colour coding | Open xlsx in Excel/LibreOffice | CLOSED green · QA PASS blue · INTAKE yellow · PLANNING orange · BLOCKED red |
| T-14 | Freeze pane + filter | Open All Items / Open Only | row 1 frozen, auto-filter dropdowns on all 21 columns |
| T-15 | Open Only excludes closed set | filter Status column on Open Only | no CLOSED / WONT-FIX / DUPLICATE / PARKED rows |
| T-16 | Gate column | rows without registry `gate` field | derived from Status (INTAKE→1, PLANNING→2-3, IMPLEMENTED→5A, QA PASS→5B) |

## 3. Regression tests
| # | What to verify | Why |
|---|---|---|
| R-1 | `git status` shows no change under `frontend/` or `backend/` from this CR | scope lock |
| R-2 | `registry.json` still valid JSON, 731 items, only CR-389 row changed (`git diff --stat` = 1 file, ~12/6 lines) | agent EXIT GATE edit only |
| R-3 | Frontend still compiles (`tail -5 /var/log/supervisor/frontend.out.log`) | sanity — nothing should have moved |

## 4. Registry Sync Confirmation
Registry synced: **YES**
Items: CR-389
Sprint: sep_bug_closure
EXIT GATE: **ALL 5 PASSED**
1. registry.json CR-389 → `IMPLEMENTED — GATE_5A (2026-09-27) — pending QA`, gate 5A ✅
2. CR_REGISTRY.md row + Last Updated ✅
3. FILE_OWNERSHIP.md section added ✅
4. Code marker `# CR-389` line 1 ✅
5. Compile: N/A (Python tooling, no webpack); script exit 0 ✅

## 5. Credentials + Environment
No login required. Python 3 + `openpyxl` (`pip install openpyxl`). Run from anywhere:
```
python3 /app/memory/reports/registry_export.py
```
Output: `/app/memory/reports/REGISTRY_EXPORT_<YYYY_MM_DD>.xlsx`

## 6. Weekly recurring run (plan §8)
No new gate cycle. `pip install openpyxl` (once per pod) → run script → share dated xlsx. Keep last 4 files.
