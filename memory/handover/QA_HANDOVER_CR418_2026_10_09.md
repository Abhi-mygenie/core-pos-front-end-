# QA Handover — CR-418
## Registry Sheet: Contract v1.4 Compliance + REGISTRAR Role
### Gate 5b QA Handover

**Date:** 2026-10-09
**Implementation agent:** E1 (Emergent)
**File changed:** `memory/reports/sheets_sync.py` (rewritten, 810 lines)

---

## §1. Verification Matrix (from Implementation Plan — self-test results)

| # | Verification | Method | Self-Test Result |
|---|---|---|---|
| V-1 | Syntax clean | `python3 -m py_compile sheets_sync.py` | ✅ PASS — exit 0 |
| V-2 | CONTRACT_COLS = 22 | `len(CONTRACT_COLS)` | ✅ PASS — 22 cols, col1=Project, col13=Assignee, col22=Money path |
| V-3 | TABS = 10 | `len(TABS)` | ✅ PASS — ['All Items','Intake','Planning','Implemented','QA','Smoke','Closed','Blockers','Change Log','Summary'] |
| V-4 | PULL_EDITABLE removed | grep | ✅ PASS — 0 hits |
| V-5 | _OBSOLETE_TABS has v2 names | code check | ✅ PASS — includes "QA'd", "Smoke Test", "Implementation" |
| V-6 | classify_status() callable | import check | ✅ PASS |
| V-7 | _build_contract_row() → 22 cols | 100-item sample | ✅ PASS — all 100 items return exactly 22 |
| V-8 | Assignee col13 always blank | 200-item sample | ✅ PASS — col[12] == '' on all items |
| V-9 | cmd_pull() read-only | inspect source | ✅ PASS — no _save_registry, no open() write |
| V-10 | Track C idempotent | inspect source | ✅ PASS — _cr418_cleaned guard present |

**Exit Gate: 5/5 PASS**
- □1 Registry sync: CR-418 → GATE_5A_IMPLEMENTED ✅
- □2 CONTROL_DASHBOARD.md updated ✅
- □3 FILE_OWNERSHIP.md updated ✅
- □4 This QA handover ✅
- □5 py_compile PASS ✅

---

## §2. Live test cases for QA agent (requires `memory/reports/.env` with valid credentials)

| # | Test | Steps | Expected |
|---|---|---|---|
| V-11 | Dry-run PASS | `cd /app/memory/reports && python3 sheets_sync.py --dry-run` | Prints "✅ Dry-run PASS — all systems ready." |
| V-12 | Tab management output | `python3 sheets_sync.py --push` (first run) | Output includes "Queued delete: QA'd", "Queued delete: Smoke Test", "Queued delete: Implementation"; creates Implemented, QA, Smoke, Change Log |
| V-13 | 22 cols row 1 | Open Sheet → All Items → row 1 | Exactly: Project, ID, Type, Title, Status, Status note, Priority, Risk, Area, Sprint, Blocked on, Owner action, Assignee, Registered, Last updated, Closed, Related, Artefacts, Code markers, Files, Notes, Money path |
| V-14 | Project=POS | Open Sheet → All Items → col A | Every data row = "POS" |
| V-15 | Assignee col M blank | Open Sheet → All Items → col M (13th) | All rows blank |
| V-16 | Status enum only | Open Sheet → All Items → col E | Only: INTAKE/PLANNING/IMPLEMENTED/QA/SMOKE/CLOSED/PARKED/DUPLICATE/blank |
| V-17 | Blockers live only | Open Sheet → Blockers | Zero rows with CLOSED/PARKED/DUPLICATE status |
| V-18 | Change Log tab exists | Open Sheet tabs | "Change Log" tab with headers: Logged at · ID · Column · Old value (registry) · New value (sheet) · Decision · Decided at · Note |
| V-19 | Summary §6 format | Open Sheet → Summary | Block 1: Status×count (8 values + Unrouted); Block 2: Priority×count (open items); Block 3: Blocked on×count; Line 1: "Generated: …"; Line 2: "Pending change-log rows: N" |
| V-20 | Run report + Track C | `--push` console output | Prints REGISTRAR RUN report with Status distribution, PRIORITY DEFAULTED count, Live blockers, Change Log rows appended |

---

## §3. Regression tests

| # | What to verify | Why |
|---|---|---|
| R-1 | `--dry-run` makes zero writes to sheet | Core contract — no accidental mutations |
| R-2 | `--pull` makes zero writes to registry.json | OD-418-02 C — read-only diff |
| R-3 | Second `--push` shows "Track C: nothing to normalise" | OD-418-01 — idempotent cleanup |
| R-4 | All Items row count == sum of (stage tab counts + Unrouted) | Contract §6 Summary consistency |
| R-5 | No row in any stage tab has empty ID or empty Status | Every row has ID, Type, Title, Status, Priority, Last updated |

---

## §4. Registry Sync Confirmation

```
Registry synced: YES
CR-418 status: GATE_5A_IMPLEMENTED
Gate: 5
Sprint: oct_release
EXIT GATE: 5/5 PASS
```

---

## §5. Credentials + Environment

- Credentials: `memory/reports/.env` — must have GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_SHEET_ID
- Sheet: https://docs.google.com/spreadsheets/d/18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY
- Script: `cd /app/memory/reports && python3 sheets_sync.py --dry-run`
- **Preprod is LIVE** — never run `--push` on production registry without owner awareness
- V-11..V-20 require valid OAuth credentials. If `.env` is missing, only V-1..V-10 (code checks) can be verified.

---

## §6. Files changed

| File | Change |
|---|---|
| `memory/reports/sheets_sync.py` | Full rewrite (465 → 810 lines) — see FILE_OWNERSHIP.md |

NOT changed: frontend/src/, backend/, registry.json (Track C runs at `--push` time, not at implementation time), .env

---

*QA Handover — CR-418 / 2026-10-09*
*Next: Gate 5b QA → Gate 6 Owner Smoke (run `--push` on the live sheet and verify all 10 tabs)*
