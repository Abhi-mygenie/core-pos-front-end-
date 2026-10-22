# SESSION HANDOVER — Tech Tasks as a 2nd Drift Source (POS intake inbox)

Date: 2026-10-22 · Prepared by: outgoing agent · For: next agent who will BUILD this
Owner: Abhishek Jain · Preferred language: English (respond in English only)

---

## 0. One-paragraph objective

Today `SHEET DRIFT` compares only the POS **registry** ↔ the **Registry-Export sheet**.
The owner wants a **second source** folded into the drift step: the **Tech Tasks sheet**
(the CEO's task list). Specifically, read **our `POS` tab**, surface the rows the owner has
routed to POS that sit at **Status = `Intake`**, and show them **separately** in the drift
output as "incoming items awaiting an intake decision". The owner then decides per item:
**register** it (CR/BUG into our registry), **answer** it, or **reject** it. After the owner
decides, the agent writes the outcome back onto the Tech Tasks **`Tasks` tab** (not the POS tab).

This handover is the build spec. Build it as a **gated** change (it touches the control
tooling `sheets_sync.py`); do Impact Analysis + a tiny plan before coding, per
`memory/control/AGENT_PROMPT_ALPHA.md`.

---

## 1. The contract (source of truth)

Full contract the owner provided: **`tech-tasks-sheet-contract.md`** — "Tech Tasks sheet —
contract v1.0 and agent addendum" (v1.2, 2026-10-21). Read it in full before building.
Public copy URL (artifact):
`https://customer-assets-7cd3h4nn.emergentagent.net/job_core-pos-app-6/artifacts/a2d64ba67ab68ccd_tech-tasks-sheet-contract.md`
**Save a copy into the repo** (e.g. `memory/control/tech-tasks-sheet-contract.md`) on your
first step so it is version-controlled and not just an ephemeral artifact URL.

### The two sheets are DIFFERENT (do not confuse them)
| | Registry-Export sheet (existing) | Tech Tasks sheet (NEW source) |
|---|---|---|
| Sheet ID | `18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY` (env `GOOGLE_SHEET_ID`) | `1_H4vG9Ti4VuFfDcg5CXvGHIKtpPJkmttKow2xTxgq0U` |
| Drive folder | n/a | `1fWp4BahzJ0YqENdhvVG6iyLfyKMyWL_J` |
| What it is | Mirror of what our registry already tracks | CEO's inbox of tasks routed TO agents |
| We do | push registry→sheet, report drift | read `POS` tab, act, write back on `Tasks` tab |
| Dispatch upstream (DO NOT touch) | — | `1NOR17bV_UrJKK7BqvS9YCXQWzmXtqtGrvUKknEEj_vk` tab `Tech` |

### Tech Tasks tabs
- `Tasks` = the single source of truth (15 cols A–O). **Agents write back here, by ID in col A.**
- `POS` / `SO` / `CRM` / `INV` / `INFRA` = per-agent filtered copies (Status Intake/In Progress/Blocked).
  The dashboard **rewrites these whole after every Save**, so **nothing written on them survives.**
  → We **READ our `POS` tab** to find work, but **WRITE only on `Tasks`**.
- `Discuss`, `Dropped`, `Done` = owner tabs. **Never read as work, never write.**

### Columns on `Tasks` (A–O) and who writes
A ID (`TT-NNN`) · B Source · C Source ID · D Date · E Task · F Context · G Type ·
H Priority(High/Med/Low) · I Owner · J Project · **K Status** · **L Agent note** ·
**M Registry ID** · N Intake date · **O Last updated**.
- **Agent may write ONLY K, L, M, O** — and only on `Tasks`, matched by the `TT` ID in **col A**.
- **Never** edit A–J or N. **Never** add / delete / re-sort rows on any tab.
- Status values the agent sets: `In Progress`, `Done`, `Blocked`, `Rejected`.
  (`Open`/`Intake` are owner-set; set `Done` when the registered item is CLOSED or the task
  needed no registry item and is finished.)
- A bare `Rejected`/`Blocked` with no note in L "comes back as a question" — always write L.
- Priority (H) is the owner's call; if wrong, note it in L (do not edit H).

---

## 2. What to build

### Part A — Registry drift (UNCHANGED)
Keep `--pull --dry-run` exactly as is (registry ↔ Registry-Export sheet). Do not regress it.

### Part B — Incoming POS intake (NEW, read-only in the drift step)
During the drift run, ALSO:
1. Read `'POS'!A2:O` of the Tech Tasks sheet.
2. Select rows where **Status (col K) = `Intake`** AND the agent hasn't handled them yet
   (proposed "unhandled" test: **col L Agent note is blank AND col M Registry ID is blank**).
   Confirm this definition with the owner — see Open Questions.
3. Print them in a **separate, clearly-labelled section** of the drift output, e.g.:
   ```
   ── PART B: INCOMING POS TASKS AWAITING INTAKE (Tech Tasks sheet) ──
     TT-071 [High]  "<task>"  — ctx: <context>   (Type: Fix/Issue, Owner: …)
     TT-074 [Med ]  "<task>"  — ctx: <context>
     N task(s) awaiting your decision. No writes made.
   ```
4. Stop. Part B is **read-only** — the owner decides the next step per task.

### Part C — Write-back (SEPARATE, explicit, WRITE action — NOT inside drift)
Because `SHEET DRIFT` (Role 14) is strictly read-only, the actual registering / answering /
rejecting + writing to `Tasks` must be a **separate step/role** the owner triggers after
deciding (propose a new role, e.g. `TECH INTAKE`, or a flag like `--tech-writeback`).
For each decided task:
- **Register** → create the CR/BUG in `registry.json` via the normal gated intake, then on
  `Tasks` set K=`In Progress`, L=short note, M=`<new registry ID>`, O=today.
- **Answer** (no registry item) → K=`Done`, L=the answer/note, O=today.
- **Reject** → K=`Rejected`, L=reason (never blank), O=today.
- Keep K/L updated as the registry item advances; set `Done` when it reaches CLOSED.
- Match the row by the `TT` ID in `'Tasks'!A:A` (read col A, find the row index). **Never by row number.**
- Report in the run summary: TT IDs picked up, status set for each, and registry ID if any.

---

## 3. Technical notes / gotchas (read before coding)

1. **Helpers are hardcoded to the Registry-Export sheet.** `sheets_get` / `sheets_post` /
   `sheets_put` (lines ~637–653 in `memory/reports/sheets_sync.py`) build the URL with the
   module-level `SHEET_ID`. To touch Tech Tasks you MUST generalize them to accept a
   `sheet_id` argument (or add parallel `tt_get/tt_put` helpers). Do NOT just reassign the
   global `SHEET_ID` — Part A still needs the registry sheet in the same run.
2. **Auth is OAuth USER-based, not a service account.** Creds in `memory/reports/.env`:
   `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
   `GOOGLE_SHEET_ID`. `get_access_token()` refreshes against these. So sheet access =
   whatever the **authorizing Google user (Abhishek)** can open, and whatever **scope** the
   refresh token carries. There is NO service-account email to share a sheet with.
   → First verify the SAME token can read the Tech Tasks sheet (see Access check below). If it
     returns 403, either the token's scope is file-restricted or the user lacks access — stop
     and ask the owner (do not try to mint new creds yourself; that's an integration step).
3. **Add the Tech Tasks ID as config**, don't scatter literals. Suggest a new env key
   `TECH_TASKS_SHEET_ID` in `memory/reports/.env` (use `search_replace`, never rewrite the
   file; never add comments in .env). Fail fast if missing.
4. **Reuse** `get_access_token()`, `_range_url()`, and the PUT pattern from `sheets_put` /
   the `values/{range}?valueInputOption=RAW` update used by `cmd_push` for write-back.
5. The POS tab is **rewritten by the dashboard on every Save**, so treat it as a volatile
   read snapshot; your source of truth for "already handled" must come from `Tasks` L/M (or
   from your own registry having an item whose note references the TT ID), NOT from the POS tab.

### Quick ACCESS CHECK the next agent should run first (read-only, proves feasibility)
```python
import sys; sys.path.insert(0,'/app/memory/reports')
import sheets_sync as s, requests
TT='1_H4vG9Ti4VuFfDcg5CXvGHIKtpPJkmttKow2xTxgq0U'
tok=s.get_access_token()
import urllib.parse
rng=urllib.parse.quote("'POS'!A1:O5", safe='')
r=requests.get(f'https://sheets.googleapis.com/v4/spreadsheets/{TT}/values/{rng}',
               headers={'Authorization':f'Bearer {tok}'}, timeout=30)
print(r.status_code, r.text[:400])
```
- `200` + rows → access OK, proceed to build.
- `403` / `404` → STOP, report to owner (scope or sharing issue). Do not work around it.

---

## 4. Open questions to confirm with the owner BEFORE building

1. **"Unhandled" definition** — is "Status=`Intake` AND cols L & M both blank" the right filter
   for what should appear in Part B? Or should every `Intake` row show until it is `Done`/`Rejected`?
2. **Part B presentation** — pure listing only, or should the agent also *propose* an action
   (register / answer / reject) per task for the owner to approve?
3. **Trigger shape for Part C** — new role name `TECH INTAKE`, or a new CLI flag? Confirm the
   owner wants write-back wired now, or just Part B (read-only surfacing) first.
4. **Access** — confirm the current OAuth user can open the Tech Tasks sheet (run the access
   check above); if 403, owner must grant access / re-scope the token.

---

## 5. Guardrails (hard rules — violating these corrupts the owner's sheet)

- Part B inside drift is **READ-ONLY**. All writes live in the separate Part C step.
- Write ONLY to the **`Tasks`** tab, ONLY cols **K, L, M, O**, matched by **TT ID in col A**.
- NEVER write/modify `POS` / `Discuss` / `Dropped` / `Done` derived tabs (they get overwritten).
- NEVER edit cols A–J or N; never add / delete / re-sort rows on any tab.
- NEVER touch the dispatch sheet `1NOR17bV…`.
- Keep Part A (registry drift / push) behaviour byte-identical.
- This is control tooling → gated change: Impact Analysis + short plan + owner approval first.
- `registry.json` edits (when registering a TT as CR/BUG) go through the normal gated intake;
  JSON round-trips byte-identically with `json.dumps(data, indent=2, ensure_ascii=True)` and
  the file has **no trailing newline** — preserve that to keep diffs clean.

---

## 6. Key files & references
- Tooling: `memory/reports/sheets_sync.py`
  - `get_access_token()` L616 · `sheets_get/post/put` L637–653 · `_range_url()` L665
  - `to_contract_row()` L430 · `cmd_push()` L985 · `cmd_diff_log()` L1039
  - `main()` L1150+ (`--push`, `--pull --dry-run`; `--pull` without `--dry-run` is hard-blocked)
- Creds: `memory/reports/.env` (OAuth user creds; add `TECH_TASKS_SHEET_ID` here)
- Registry: `memory/control/registry.json` (925 items as of 2026-10-22)
- Roles/gating: `memory/control/AGENT_PROMPT_ALPHA.md` (Role 13 SHEET PUSH, Role 14 SHEET DRIFT)
- Contract: `tech-tasks-sheet-contract.md` (save into `memory/control/`)
- Read-only drift helper used this session: `/root/drift_full.py` (ephemeral — `/root`/`/tmp`
  are wiped on pod restart; re-create if needed, or fold into `sheets_sync.py` as a `--verbose`
  option so it persists).

---

## 7. Current repo state (context)
- HEAD `dab3c4c` (pulled from `origin/main`, branch `main` — NOT default; force-pushes handled
  by backup-3-files → `git reset --hard origin/main` → restore). Preserved always:
  `frontend/.env`, `backend/.env`, `.emergent/emergent.yml` (pod job_id
  `246a1427-f482-4442-88a3-bdeb67f03dcf`).
- Preview URL: `https://core-pos-app-6.preview.emergentagent.com`
- Last registry work this session (LOCAL ONLY — not yet on GitHub `main`; use "Save to GitHub"
  to persist, else a future force-push overwrites it):
  - Adopted CTO Sheet triage into registry: `blocked_by:"BACKEND"` on CR-043, BUG-190, BUG-467,
    BUG-470, CR-394, CR-410, CR-424; priority BUG-319→P1, CR-358→P0.
  - Resolved a **BUG-598 ID collision**: `BUG-598-A` = "Reports Date Range Caps" (kept its real
    `GATE_5A_IMPLEMENTED` status); `BUG-598-B` = "assign_food_menu …". No duplicate IDs remain.
  - Pushed to Registry-Export sheet: 925 items, 9 tabs, post-push diff "No drift".
  - KNOWN minor flag: push reports `UNCLASSIFIED: 1 → ['BUG-598-B']` because its status string
    `INVESTIGATION_COMPLETE` (underscore) isn't in the classifier's match list (which has
    `INVESTIGATION COMPLETE` with a space). Harmless; owner was offered a normalise, not yet done.

---

## 8. First moves for the next agent
1. Read the contract in full; save it into `memory/control/`.
2. Run the ACCESS CHECK (section 3) — prove the token can read Tech Tasks `POS`. If 403 → stop, ask owner.
3. Confirm the 4 Open Questions (section 4) with the owner via one `ask_human`.
4. Do Impact Analysis + short plan (gated), get approval.
5. Build Part B (read-only listing inside the drift run) first; demo it; THEN build Part C
   (write-back) as a separate role/flag.
6. Test against the live sheet read-only before any write; for write-back, test on ONE TT row
   and verify only K/L/M/O changed on `Tasks` and nothing else moved.
