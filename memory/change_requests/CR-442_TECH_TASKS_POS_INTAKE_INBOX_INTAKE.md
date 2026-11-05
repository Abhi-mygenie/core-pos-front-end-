# CR-442 — Tech Tasks Sheet: POS Intake Inbox (Drift only)

**ID:** CR-442
**Type:** CR
**Registered:** 2026-10-22
**Registered by:** INTAKE agent
**Sprint:** tooling_oct1
**Severity:** P2
**Risk:** LOW
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The owner wants to fold the **Tech Tasks sheet** (the CEO's task inbox) into the existing
drift/push tooling as a second source. Today `SHEET DRIFT` only compares the POS
`registry.json` ↔ the Registry-Export sheet.

The new capability adds a **Part B** to the drift run: read the `POS` tab of the
Tech Tasks sheet, surface all rows where `Status = Intake`, and present them to the
owner as "incoming items awaiting a decision". The owner then decides per item:
register as CR/BUG, answer it, or reject it. After owner decision, a separate
**Part C** step writes the outcome back to the `Tasks` tab (cols K, L, M, O only).

**Two owner rules locked in intake:**
1. Agent NEVER auto-registers a task — always surface to owner, wait for instruction.
2. Drift / Part B is READ-ONLY — no `registry.json` writes until owner explicitly approves.

---

## 2. Source / Evidence

- **Primary spec:** `memory/control/tech-tasks-sheet-contract.md` (contract v1.0 / agent addendum v1.2, 2026-10-21)
- **Build spec handover:** `memory/handover/SESSION_HANDOVER_2026_10_22_TECH_TASKS_DRIFT_SOURCE.md`
- **Owner conversation:** 2026-10-22 session — owner confirmed the two rules above and requested CR registration
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED

---

## 3. Sheets involved

| Sheet | ID | Purpose |
|---|---|---|
| Registry-Export (existing) | `18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY` | Existing — unchanged |
| **Tech Tasks (new)** | `1_H4vG9Ti4VuFfDcg5CXvGHIKtpPJkmttKow2xTxgq0U` | CEO task inbox |
| NeoSapien Dispatch (read-only upstream) | `1NOR17bV_UrJKK7BqvS9YCXQWzmXtqtGrvUKknEEj_vk` tab `Tech` | Never touch |

---

## 4. Scope (two phases)

### Phase 1 — Part B: Read-only POS Intake listing inside drift
- Read `POS` tab of Tech Tasks sheet
- Filter rows where `Status = Intake` (exact definition TBD via OD-442-01)
- Print as a separate section in `--pull --dry-run` output
- No writes to any sheet, no registry changes
- Presentation format TBD via OD-442-02

### Phase 2 — Part C: Write-back
**OUT OF SCOPE — REMOVED.**
Owner will call roles manually after reviewing drift output. No automated write-back step.

### Env change
- Add `TECH_TASKS_SHEET_ID=1_H4vG9Ti4VuFfDcg5CXvGHIKtpPJkmttKow2xTxgq0U` to `frontend/.env`

### Prompt change (AGENT_PROMPT_ALPHA.md)
- New Role 15: TECH TASKS DRIFT — surfaces all POS Intake rows to owner (read-only)
- Update Role 1 (INTAKE): note agent never auto-registers from Tech Tasks; always shows to owner first

---

## 5. Open Decisions — ALL LOCKED

| ID | Question | Decision |
|---|---|---|
| OD-442-01 | "Unhandled" filter — blank L+M only, or all Intake rows? | **ALL Intake rows shown always** — owner calls roles to act; no auto-filtering by agent note |
| OD-442-02 | Part B output — list only, or also propose action per task? | **Plain list only** — owner reviews drift then calls the relevant role themselves |
| OD-442-03 | Part C write-back — new role or CLI flag? | **OUT OF SCOPE** — owner will call roles manually; no automated write-back step |
| OD-442-04 | Access probe — can OAuth token read Tech Tasks sheet? | **CONFIRMED** — token OK, sheet "Tech Tasks" accessible, 9 tabs visible, 28 rows in Tasks, 14 POS Intake rows |

---

## 6. Risk Classification

- **Risk:** LOW
- **Reason:** New Python script / new mode in existing tooling. Zero `frontend/src/` changes.
  No financial, order, report, print, auth, or customer data logic touched.
- **Fast Lane eligible:** NO — touches 3+ files (sheets_sync.py + frontend/.env + AGENT_PROMPT_ALPHA.md)
- **Hotspot files touched:** NONE

---

## 7. Duplicate Check

- **Result:** DISTINCT
- **Check:** Searched registry.json (925 items), CR_REGISTRY.md, BUG_TRACKER.md for
  "tech task", "TT-", "NeoSapien", "tech_tasks_sync" — 0 hits
- **Related:** CR-406 (Google Sheets sync foundation), CR-416 (SHEET PUSH/DRIFT roles),
  CR-419 (contract v1.5 rewrite), CR-420 (status classifier fixes)

---

## 8. Blast Radius

- **Scope:** SMALL
- **Files WILL change:**
  - `memory/reports/sheets_sync.py` (add Part B to cmd_diff_log — read POS tab, print Intake rows)
  - `frontend/.env` (add TECH_TASKS_SHEET_ID)
  - `memory/control/AGENT_PROMPT_ALPHA.md` (add Role 15, update Role 1 intake rule)
  - `memory/control/tech-tasks-sheet-contract.md` (new file — save contract into repo)
- **Files WILL NOT touch:** Any file under `frontend/src/`, `backend/`, `Tasks`/derived tabs on sheet, `registry.json` (during build)
- **Hotspot files:** NONE

---

## 9. Code Reality

- **Status:** NONE
- No existing `tech_tasks_sync` code in `frontend/src/` or `memory/reports/`
- `sheets_sync.py` has zero Tech Tasks sheet references

---

## Next

Intake complete — all ODs locked. Ready for Planning Gate 2 (Impact Analysis).
Owner to give "Gate 2 GO" to proceed.
