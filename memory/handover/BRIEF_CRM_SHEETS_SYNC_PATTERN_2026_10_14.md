# Brief — CRM Agent: Google Sheets Sync Pattern
**Date:** 2026-10-14
**Prepared by:** MyGenie POS agent
**Purpose:** Reference for CRM agent intake — establishes the sync pattern already proven on the POS registry

---

## What We Did (POS Registry → Google Sheet)

We connected the POS change-control registry (`registry.json`, 835 items) to a shared Google Sheet
so the CTO can read, comment, and edit status fields without touching the codebase.
The implementation has three operations and lives entirely outside `frontend/src/` and `backend/`.

### The Three Operations

**PUSH (one-way write: local → sheet)**
A Python script reads the source data file and writes it into the Google Sheet, one named tab per
logical grouping. The sheet is fully overwritten on each push — no merge, no delta. The owner
triggers this manually when they want the sheet refreshed.

**DRIFT (read-only diff: sheet → local)**
The same script reads the sheet back and compares it against the local source. It prints a diff
(what changed, which fields) and stops. Nothing is written. The owner decides what to do next.
This is how the CTO's edits become visible without auto-applying them.

**SYNC / PULL (write-back: sheet edits → local)**
An optional third mode applies selected sheet edits back to the local source file. Only
owner-approved fields are writable (e.g., status, priority, notes). Done atomically via
a temp-file swap to prevent partial writes.

---

## How the Auth Works

Google OAuth2 with a **refresh token** — no service account key file required.

| Credential | Where it lives | How it was obtained |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | `.env` file alongside the script | Google Cloud Console — OAuth 2.0 client |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `.env` file | same client |
| `GOOGLE_REFRESH_TOKEN` | `.env` file | one-time browser auth flow (owner opens URL, pastes redirect back) |
| `GOOGLE_SHEET_ID` | `.env` file | taken from the sheet URL |

The refresh token is long-lived. Once stored it does not need to be re-obtained unless revoked.
The script calls Google's token endpoint at runtime to get a short-lived access token before
each API call.

The one-time auth flow:
1. Agent generates an authorization URL (client_id + scope + `redirect_uri=http://localhost` + `access_type=offline` + `prompt=consent`)
2. Owner opens it in their browser, grants Sheets access
3. Google redirects to `http://localhost/?code=...` — owner copies the full URL and pastes it back
4. Agent exchanges the code for tokens, extracts the `refresh_token`, writes it to `.env`

---

## What the CTO Agent / Tech Dashboard Provides

For the POS registry, the column list and tab structure were defined by owner decisions (OD-406-01 through OD-406-04).
For the CRM agent, the equivalent input is:

- **Sheet ID** — the target Google Sheet (owner provides)
- **Column spec** — which fields map to which sheet columns (CTO agent / tech dashboard provides)
- **Tab structure** — how items are grouped into tabs (CTO agent / tech dashboard provides)
- **Editable fields for pull/sync** — which columns the CTO is allowed to edit back (owner decision)

The script structure, auth pattern, and push/drift/sync operations are the same.
Only the data source file, column list, and tab names change.

---

## Key Design Decisions Already Locked (carry forward)

| Decision | Rule |
|---|---|
| Hard code-file gate | PUSH and DRIFT MUST NOT touch `frontend/src/`, `backend/`, any `*.jsx/.js/.py`, any `.env`, or any application `*.json` |
| DRIFT is read-only | No writes to source data under any circumstance — prints diff only, owner decides |
| Owner-triggered only | No automatic scheduled push or auto-apply of sheet edits |
| Atomic pull write | Temp file → `os.replace()` — never a partial write to the source data file |
| Credentials in `.env` | Stored in a `.env` file beside the script — never hardcoded, never printed |

---

## Existing Reference

| Artifact | Path |
|---|---|
| Working script (POS) | `memory/reports/sheets_sync.py` |
| POS credentials | `memory/reports/.env` |
| CR intake (roles in prompt) | `change_requests/CR-416_AGENT_PROMPT_ALPHA_SHEET_PUSH_SHEET_DRIFT_ROLES_INTAKE.md` |
| CR implementation plan | `plans/CR-416_IMPLEMENTATION_PLAN_2026_10_14.md` |

The CRM agent can use `sheets_sync.py` as a structural reference for the Python pattern,
OAuth2 flow, tab management, and row builder design.

---

*This brief describes the proven pattern only. Column spec, tab structure, source data path,
and editable field list are to be defined by the CTO agent / tech dashboard before implementation.*
