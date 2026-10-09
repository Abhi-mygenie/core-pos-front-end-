# CR-406 — Impact Analysis (Gate 2)
# Google Sheets Two-Way Sync — Registry Export/Import via OAuth2

**Gate:** 2 — Impact Analysis
**Status:** GATE_2_IMPACT_ANALYSIS
**Date:** 2026-10-04
**Risk:** LOW
**Code Reality:** PARTIAL (OAuth2 live, sync script absent)

---

## Header Checks

**Code Reality Check:**
```
grep -rn "sheets_sync\|GOOGLE_SHEET\|google.*oauth" /app/frontend/src/ → 0 hits
```
Result: **NONE** — `memory/reports/sheets_sync.py` does not exist. OAuth2 credentials present and validated.

**Conflict Pre-Check:**
- No other open CR/BUG touches `memory/reports/`
- No R5 hotspot files involved
- No `frontend/src/` changes — zero interaction risk with CR-405, BUG-484, or any active sprint
- Result: **NO CONFLICTS**

---

## 1. Data Flow

### Push Direction (registry.json → Google Sheet)

```
registry.json (766 items)
  ↓ Python: load + classify by status
sheets_sync.py
  ↓ OAuth2 token refresh (REFRESH_TOKEN → access_token)
Google OAuth2 API
  ↓ GET spreadsheets/{SHEET_ID} → verify sheet + existing tabs
Google Sheets API v4
  ↓ batchUpdate → create missing tabs + delete Open Only
  ↓ values/{tab}!A1:clear → clear each tab
  ↓ values/{tab}!A1 PUT (valueInputOption=RAW) → write header + rows
8 tabs written in Google Sheet
```

### Pull Direction (Google Sheet → registry.json)

```
Google Sheet → All Items tab
  ↓ GET values/All Items!A1:Z10000
sheets_sync.py
  ↓ Parse header row → map columns
  ↓ For each row: match by `id` field to registry item
  ↓ For editable fields only: compare sheet value vs registry value
  ↓ Log any change: "CR-405: status GATE_5B → OWNER_VERIFIED"
  ↓ Write updated registry to temp file (registry.json.tmp)
  ↓ os.replace(tmp, registry.json)  ← atomic
registry.json updated
```

---

## 2. Resolved Open Decisions

| OD | Question | Decision (default applied) |
|---|---|---|
| OD-406-01 | Pull: editable fields? | `status`, `priority`, `notes`, `sprint_key` — all others read-only |
| OD-406-02 | Conflict resolution? | **Push-first protocol**: always `--push` before allowing sheet edits. Pull overwrites registry with sheet values for editable fields only. No timestamp comparison needed. |
| OD-406-03 | Tab structure? | **LOCKED** — 8 tabs, Open Only dropped (2026-10-04) |
| OD-406-04 | Update CR_REGISTRY.md on pull? | **registry.json only** — CR_REGISTRY.md is a narrative log; agent updates it at gate transitions, not on every pull |

> All ODs resolved with recommended defaults. Owner can override at Gate 6 smoke.

---

## 3. Columns Exported (Push)

Matches existing `registry_export.py` format:

```
id, type, title, status, priority, severity, sprint_key, area, category,
risk, phase, current_gate, blast_radius, files, notes, blocked_by,
depends_on, intake_doc, qa_report, qa_result
```
— 20 columns total

---

## 4. Tab Row Counts (live from registry, 2026-10-04)

| Tab | Rows | Filter Logic |
|---|---|---|
| All Items | 766 | No filter |
| Intake | 93 | GATE_1 / INTAKE / REGISTERED / NOT STARTED |
| Planning | 1 | GATE_2 / GATE_3 / IMPACT_ANALYSIS / PLAN_COMPLETE |
| Implementation | 64 | GATE_4 / GATE_5A / IMPLEMENTED |
| QA / Smoke | 290 | GATE_5B / QA PASS / AWAITING OWNER SMOKE |
| Closed | 259 | CLOSED / OWNER VERIFIED / SUBSUMED / RETIRED |
| Blocked / Parked | 18 | BACKEND-BLOCKED / PARKED / DEFERRED |
| Summary | — | Pivot: by type, sprint, status tab |
| **Uncategorized** | 41 | Appear in All Items only (no matching pattern) |

---

## 5. Sheet Mutation Plan (tab management)

Existing sheet has: `['All Items', 'Open Only', 'Summary']`

| Action | Tab | Reason |
|---|---|---|
| REUSE | All Items | Matches required tab |
| REUSE | Summary | Matches required tab |
| DELETE | Open Only | Owner decision OD-406-03 |
| CREATE | Intake | New status tab |
| CREATE | Planning | New status tab |
| CREATE | Implementation | New status tab |
| CREATE | QA / Smoke | New status tab |
| CREATE | Closed | New status tab |
| CREATE | Blocked / Parked | New status tab |

---

## 6. Risk Classification

| Field | Value |
|---|---|
| Risk | **LOW** |
| Reason | Standalone Python script. Zero `frontend/src/` impact. No financial logic. No hotspot files. No localStorage. |
| Fast Lane | YES — 1 new file, no app code. **Owner approval required.** |
| Blast radius | SMALL — 1 new file only |

---

## 7. Files

**WILL change:**
- `memory/reports/sheets_sync.py` — NEW (~280 lines)

**WILL NOT touch:**
- Any file under `frontend/src/`
- `memory/control/registry.json` (read at push time; written at pull time by the script at runtime — not a planning edit)
- `memory/control/CR_REGISTRY.md`
- Any R5 hotspot file
- `memory/reports/.env` (credentials already present)

---

## 8. External Dependencies

| Dependency | Status |
|---|---|
| `requests` library | ✅ Already installed (`pip install requests`) |
| `python-dotenv` | ✅ Already installed |
| `google-auth-oauthlib` | ✅ Already installed |
| Google Sheets API v4 | ✅ Enabled (confirmed 2026-10-04) |
| Google Drive API | ✅ Enabled (confirmed 2026-10-04) |
| OAuth2 credentials | ✅ In `memory/reports/.env` |
| Sheet ID | ✅ `18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY` |

No new pip installs required.

---

## 9. Verification Matrix (seeds Gate 3 + QA)

| # | Edit | File | How to Verify |
|---|---|---|---|
| V-1 | Script loads .env, reads SHEET_ID | sheets_sync.py | `python3 sheets_sync.py --dry-run` → prints Sheet ID |
| V-2 | Token refresh works | sheets_sync.py | `python3 sheets_sync.py --dry-run` → "Access token refreshed ✅" |
| V-3 | Sheet accessible | sheets_sync.py | `python3 sheets_sync.py --dry-run` → sheet title printed |
| V-4 | Push writes All Items tab (766 rows) | Google Sheet | Open Sheet → All Items → row count = 766 + header |
| V-5 | Push writes Intake tab (93 rows) | Google Sheet | Open Sheet → Intake tab → row count = 93 + header |
| V-6 | Push writes Closed tab (259 rows) | Google Sheet | Open Sheet → Closed tab → row count ~259 + header |
| V-7 | Open Only tab deleted | Google Sheet | Open Sheet → no "Open Only" tab visible |
| V-8 | Summary tab has pivot data | Google Sheet | Open Sheet → Summary → "BY TYPE" + "BY STATUS TAB" sections |
| V-9 | Pull reads All Items and updates a status | registry.json | Edit one cell in Sheet → `--pull` → verify registry.json updated |
| V-10 | Pull is atomic (no partial write) | registry.json | Kill script mid-pull → registry.json unchanged (temp file only) |
| V-11 | Pull ignores non-editable fields | registry.json | Edit `title` in sheet → `--pull` → registry.json title unchanged |
| V-12 | Dry-run flag makes no API writes | Google Sheet | `--dry-run` → sheet unchanged after run |

---

*Impact Analysis complete — CR-406 / 2026-10-04*
