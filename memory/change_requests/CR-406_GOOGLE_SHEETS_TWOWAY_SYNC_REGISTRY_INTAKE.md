# CR-406 — Google Sheets Two-Way Sync: Registry Export/Import via OAuth2

**Type:** CR (Change Request)
**ID:** CR-406
**Date:** 2026-10-04
**Sprint:** tooling_oct1
**Gate:** 1 — INTAKE
**Status:** GATE_1_INTAKE

---

## 1. Summary

Build a standalone Python sync script (`memory/reports/sheets_sync.py`) that provides two-way synchronisation between `registry.json` (765 CR/BUG items) and a designated Google Sheet. Push direction exports all registry items as structured rows to the Sheet; pull direction reads owner edits from the Sheet back into `registry.json`.

This replaces the current manual workflow: run `registry_export.py` → download `.xlsx` → manually upload to Google Sheets.

---

## 2. Owner Request (verbatim context)

> "Two-way sync" with Google Sheets for CR and CR tracker. Both CRs and BUGs. They already have the format.

---

## 3. Expected Behaviour

### Push (registry.json → Google Sheet)
- Export all 766+ items from `registry.json` to the Google Sheet
- Columns match existing `registry_export.py` format (id, type, title, status, priority, severity, sprint_key, area, category, risk, phase, current_gate, blast_radius, files, notes, blocked_by, depends_on, intake_doc, qa_report, qa_result)
- Overwrite entire sheet on push (header row + data rows)
- **8 tabs (owner-locked 2026-10-04):**

| Tab | ~Items | Filter Logic |
|---|---|---|
| All Items | 766 | No filter — all CRs + BUGs |
| Intake | 92 | Gate 1 / INTAKE / REGISTERED / NOT STARTED |
| Planning | 1 | Gate 2–3 / IMPACT_ANALYSIS / PLAN_COMPLETE |
| Implementation | 63 | Gate 4–5A / IMPLEMENTED |
| QA / Smoke | 287 | Gate 5B / QA PASS / AWAITING OWNER SMOKE |
| Closed | 274 | CLOSED / OWNER VERIFIED / SUBSUMED / RETIRED |
| Blocked / Parked | 15 | BACKEND-BLOCKED / PARKED / DEFERRED |
| Summary | — | Pivot stats: by type, sprint, area, status |

- `Open Only` tab **dropped** (owner decision 2026-10-04 — covered by status tabs)

### Pull (Google Sheet → registry.json)
- Read `All Items` tab from Sheet
- For each row, match by `id` field
- Updateable fields (owner may edit in Sheet): `status`, `priority`, `notes`, `sprint_key`
- Non-updateable fields (ignored during pull): `title`, `type`, `files`, `artifact_refs` (these are code-generated)
- Write updated values back to `registry.json` atomically (write to temp, then rename)
- Log every change: `CR-405: status GATE_5B → OWNER_VERIFIED`

### Auth
- OAuth2 with stored refresh token (no service account key)
- Credentials in `/app/memory/reports/.env`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_SHEET_ID`

---

## 4. Evidence

- **OAuth2 auth**: CONFIRMED — refresh token obtained and stored 2026-10-04
- **Sheet access**: CONFIRMED — HTTP 200, title `REGISTRY_EXPORT_2026_09_27`, 3 tabs (All Items / Open Only / Summary)
- **Sheet ID**: `18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY` (native Google Sheet, confirmed readable)
- **Data in Sheet**: 765 rows confirmed, headers: S.No, ID, Type, Title, Description, ...
- **Source**: OWNER-REQUESTED (chat session 2026-10-04)
- **Confidence**: CONFIRMED (sheet connection live-verified)
- **Screenshot/curl**: Session validated in chat — sheet metadata + first 3 rows read successfully

---

## 5. Duplicate Check

- **CR-371** — "Build sync_registry.py — Canonical Registry Sync Script" → RELATED (internal registry sync only, no Google Sheets, INTAKE never progressed). Different scope.
- **CR-389** — "Registry Excel Export" → RELATED (one-way push to .xlsx only). Different scope.
- **CR-073** — "Recipe Bulk Editor — Inline Spreadsheet UX" → NOT RELATED (spreadsheet UX in app, not Google Sheets API)
- **Verdict: DISTINCT** — no existing CR covers Google Sheets two-way sync.

---

## 6. Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Control Layer / Tooling |
| Priority | P2 / MEDIUM |
| Risk | LOW |
| Risk Reason | No app code touched. Standalone Python script in `memory/reports/`. Zero blast radius on frontend. |
| Fast Lane Eligible | YES — new file only, no app code, no hotspots, LOW risk (owner approval required) |
| Sprint | tooling_oct1 |
| Code Reality | PARTIAL — OAuth2 + sheet connection already working. Sync script not yet written. |

---

## 7. Blast Radius

- **New files**: `memory/reports/sheets_sync.py` (new)
- **Modified files**: `memory/reports/.env` (GOOGLE_SHEET_ID already added)
- **Frontend src touched**: NONE
- **Hotspot files touched**: NONE (R5 list: OrderEntry.jsx, CollectPaymentPanel.jsx, orderTransform.js, DashboardPage.jsx, LoadingPage.jsx — all clear)
- **Estimated scope**: SMALL (1 new file)

---

## 8. Open Decisions (ODs)

| # | Question | Decision | Locked |
|---|---|---|---|
| OD-406-01 | Pull: which fields owner-editable from Sheet? | `status`, `priority`, `notes`, `sprint_key` | OPEN |
| OD-406-02 | Conflict resolution: registry.json vs Sheet — who wins? | registry.json wins (push first, pull second) | OPEN |
| OD-406-03 | Tab structure — drop Open Only, split Planning + Implementation? | **DROP Open Only. SPLIT Planning + Implementation. 8 tabs total.** | **LOCKED 2026-10-04** |
| OD-406-04 | Auto-update CR_REGISTRY.md + BUG_TRACKER.md on pull, or registry.json only? | registry.json only | OPEN |

---

## 9. Related Items

- CR-371 (RELATED — internal sync, never progressed)
- CR-389 (RELATED — one-way Excel export, IMPLEMENTED)

---

## 10. Scope Lock

**WILL touch:**
- `memory/reports/sheets_sync.py` (NEW — sync script)

**WILL NOT touch:**
- Any file under `frontend/src/`
- `memory/control/registry.json` (only modified by the running script, not by the plan itself)
- `memory/control/CR_REGISTRY.md` (auto-updated by script on pull)
- Any hotspot file

---

*Intake agent: E1 — 2026-10-04*
