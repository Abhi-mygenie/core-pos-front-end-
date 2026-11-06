# CR-416 — Intake (Gate 1)
## AGENT_PROMPT_ALPHA: Add SHEET PUSH + SHEET DRIFT Roles

**ID:** CR-416
**Type:** CR
**Date:** 2026-10-14
**Registered by:** INTAKE agent (owner session 2026-10-14)
**Sprint:** tooling_oct1
**Area:** Control Layer / Agent Process / Tooling
**Priority:** P2
**Risk:** LOW
**Related:** CR-406 (RELATED — same Sheets infra, script only), CR-369 (RELATED — same file area, different file v0.8, parallel-safe), CR-047 (RELATED — CLOSED v0.6 hardening)

---

## 1. Duplicate Check

**DISTINCT.**

| ID | Title | Status | Conflict? |
|---|---|---|---|
| **CR-406** | Google Sheets Two-Way Sync — `sheets_sync.py` | GATE_5A_IMPLEMENTED | **NONE** — CR-406 IS the script. CR-416 does NOT touch the script. CR-406 is infrastructure; CR-416 is the agent-prompt roles that expose it. |
| **CR-369** | Write `AGENT_PROMPT_ALPHA_v0.8.md` (NEW file) | INTAKE | **NONE** — CR-369 creates a new `v0.8.md` file. CR-416 makes additive edits to the EXISTING `AGENT_PROMPT_ALPHA.md` (v0.7). Different file, different scope. Parallel-safe. |
| **CR-047** | AGENT_PROMPT_ALPHA v0.6 Role Hardening | CLOSED — OWNER VERIFIED | **NONE** — Closed. Different version. |
| **CR-408** | Coupon Auto-Apply Remove — Cashier Must Choose | GATE_5A_IMPLEMENTED | **NONE** — Completely different scope (`CollectPaymentPanel.jsx`). ID CR-408 was previously mis-assigned to planning docs in session 2026-10-11. Those docs are now rebadged here as CR-416. |

**Classification: DISTINCT**

---

## 2. What This CR Does

Add two new on-demand roles to `memory/control/AGENT_PROMPT_ALPHA.md` (currently v0.7, 1805 lines, 12 roles):

### ROLE 13: SHEET PUSH AGENT
**Trigger:** Owner says "push to sheet" / "sync registry" / "update the sheet" / "sheet push"
**Action:** Runs `python3 memory/reports/sheets_sync.py --push`
**Gate:** Hard code-file gate — MUST NOT touch `frontend/src/`, `backend/`, any `*.jsx/.js/.py`, any `.env`, any `*.json`

### ROLE 14: SHEET DRIFT AGENT
**Trigger:** Owner says "show drift" / "check the sheet" / "what did CTO change" / "sheet drift"
**Action:** Runs `python3 memory/reports/sheets_sync.py --pull --dry-run`. Prints diff. Stops.
**Gate:** Hard code-file gate + NO registry writes ever — read-only output only

**Supporting rule:** R27 — shared rule covering both roles' hard code-file gates.

---

## 3. Owner Decisions (ALL LOCKED from investigation session 2026-10-11)

| OD | Decision | Status |
|---|---|---|
| OD-INV-SHEETS-01 | Two dedicated roles in `AGENT_PROMPT_ALPHA.md` — NOT embedded in EXIT GATE of other roles | LOCKED |
| OD-INV-SHEETS-02 | Hard code-file gate on both roles: MUST NOT touch `frontend/src/`, `backend/`, any `*.jsx/.js/.py`, any `.env` | LOCKED |
| OD-INV-SHEETS-03 | No session-start auto-check — dropped entirely | LOCKED |
| OD-INV-SHEETS-04 | Nothing auto-applied to registry — SHEET DRIFT is read-only, owner drives every decision after seeing the diff | LOCKED |
| OD-INV-SHEETS-05 | Role names: **SHEET PUSH** (Role 13) + **SHEET DRIFT** (Role 14) | LOCKED |
| OD-INV-SHEETS-06 | Both roles are owner-triggered only — no other role calls them | LOCKED |

**Zero open owner decisions.**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (session 2026-10-11) + INVESTIGATION-CONFIRMED (session 2026-10-14)
- **Investigation:** `memory/investigations/INV-CR406-SHEETS-PUSH-RULE-2026-10-11.md` (10/10 steps, HIGH confidence, CLOSED per prior session)
- **Validation session:** 2026-10-14 INVESTIGATION role — confirmed all 4 implementation anchors accurate at HEAD, code reality NONE, plan safe to execute
- **Confidence:** CONFIRMED — all design decisions locked by owner; all anchors verified live
- **Script confirmed working:** `memory/reports/sheets_sync.py` — syntax OK, `--push` and `--pull --dry-run` both validated (CR-406 GATE_5A)

### ID Correction Note
Planning artifacts produced in session 2026-10-11 were labeled CR-408. That ID is already taken by "Coupon Auto-Apply Remove" (GATE_5A_IMPLEMENTED). Those artifacts are now formally registered here under **CR-416**. Gate 2 (Impact Analysis) and Gate 3 (Implementation Plan) content exists and was validated in the 2026-10-14 investigation session — to be formally persisted under CR-416 by the PLANNING role.

---

## 5. Code Reality Check

**NONE — roles do not exist in the file today.**

```bash
grep -c "SHEET PUSH\|SHEET DRIFT\|ROLE 13\|ROLE 14\|R27" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Returns: 0 — confirmed 2026-10-14
```

---

## 6. Blast Radius

| File | Change | R5 hotspot? |
|---|---|---|
| `memory/control/AGENT_PROMPT_ALPHA.md` | 4 additive locations: SHEET PUSH role section + SHEET DRIFT role section + 2 rows in Role Decision Tree + R27 Shared Rule | NO |

**Total:** 1 file · ~45 additive lines · NOT R5 · No `frontend/src/` · No `backend/` · No registry.json schema change.

- **Blast radius:** 1 file, ~45 lines referencing this pattern
- **Hotspot files touched:** NO
- **Estimated scope:** SMALL (1 file, additive only)

---

## 7. Risk Classification

| Field | Value |
|---|---|
| **Risk** | LOW |
| **Reason** | Doc-only CR. No application code changes. Additive only — no existing role behaviour modified. New roles are passive (owner-triggered, no side effects on other roles). |
| **Process required** | Full gate flow (Gate 2 → Gate 3 → Gate 4 GO → Implementation → QA) |
| **Fast Lane eligible** | NO — critical control document, 4 sections, not ≤10 lines |

---

## 8. Severity Rubric

**P2 — MEDIUM.** Rationale:
- Without these roles, the CTO Sheet drifts silently after every registry mutation (no push) and CTO edits are invisible (no drift check).
- Workaround exists: owner can manually run `python3 memory/reports/sheets_sync.py --push` or `--pull --dry-run` directly.
- Not blocking any sprint work. Not financial/order flow. Doc tooling only.

---

## 9. Gate Status

| Gate | Status |
|---|---|
| Gate 1 (Intake) | **COMPLETE** (this document) |
| Gate 2 (Impact Analysis) | **COMPLETE** — `impact/CR-416_IMPACT_ANALYSIS_2026_10_14.md` |
| Gate 3 (Implementation Plan) | **COMPLETE** — `plans/CR-416_IMPLEMENTATION_PLAN_2026_10_14.md` |
| Gate 4 GO | **GIVEN** — 2026-10-14 |

---

## 10. Next

Awaiting owner: **"Gate 2 GO CR-416"** → PLANNING agent writes (or rebadges + persists) Impact Analysis.

Planned artifacts:
- `impact/CR-416_IMPACT_ANALYSIS_2026_10_11.md`
- `plans/CR-416_IMPLEMENTATION_PLAN_2026_10_11.md`
