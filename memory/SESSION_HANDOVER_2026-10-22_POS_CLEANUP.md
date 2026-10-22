# Session Handover — 2026-10-22 (POS Registry Cleanup + Old-POS CR Intake)

**Agent:** E1 · **Language:** English · **Sheet:** REGISTRY_EXPORT (CTO), ID `18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY`
**End state:** Registry 937 → **956 items** · Push OK · **0 drift** across all 20 tracked columns.

---

## What was done this session

### A. 9-point POS cleanup (`pos-fixes-2026-10-22.csv`) — COMPLETE & verified
1. **TT provenance** — `from TT-NNN` appended to Notes for CR-443→449 & BUG-605→608.
2. **Tech Tasks write-back** — TT-006 & TT-030 reverted Done → In Progress via new `--tech-writeback` CLI.
3. **BUG-600/BUG-579/BUG-598-B status** — fixed so they show **PLANNING** (were mis-shown CLOSED; mapper now guards exact `GATE_N_CLOSED` token). Raw statuses set to `GATE_2_COMPLETE` / `GATE_2_PLANNING`.
4. **13 blank Areas** filled with real modules.
5. **Priorities = owner's sheet values (law)** — 9 items → P0 (CR-043, BUG-598-B, BUG-602/603/604, CR-447, BUG-606, CR-448, CR-449); 10 items → Blocked on BACKEND.
6. **Summary tab** — `build_summary_rows()` now counts from the **All Items** tab (owner rows included); 92-vs-93 mismatch gone.
7. **"Neo " tab** — kept (owner created it).
8. **62 open `Other`** → 53 reclassified into modules, **9 kept Other** (sidebar/nav/training).
9. **money_path** — left as-is for old items per owner instruction.

### B. 17-item external-team walk-through (Printer Agent / New POS)
- **Moved INTAKE → SMOKE (6):** BUG-468 (awaiting iOS release), BUG-558 (testing pending), BUG-550 (rare edge case), BUG-577 & BUG-466 & BUG-478 (resolved in latest Printer Agent). Each carries a dated note.
- **Kept in INTAKE (11):** done→BUG-551, BUG-542, BUG-548, BUG-553, CR-398, CR-395, CR-396; not-done→BUG-578, BUG-476, BUG-554, BUG-543.

### C. 19 new Old-POS CRs registered — CR-450 → CR-468 (all SMOKE)
External **Old POS** team work (separate codebase, not this app), team status DONE, status `GATE_6_AWAITING_OWNER_SMOKE`.
**P1 (money/permission/tax):** CR-459 (Room payment), CR-461 (Catalog/Modifiers/Master-Reset owner-gated), CR-463 (Settlement employee gate), CR-464 (prepaid w/o Clear-Payment role), CR-465 (Room GST). Rest P2/P3. Light duplicate check only (owner-declared new).

### D. Process hardening
- `AGENT_PROMPT_ALPHA.md` v0.9 — added 7-item **REGISTRAR EXIT CHECKLIST** (TT provenance, priority rationale + owner-priority-is-law, no blank Area + Other ≤8%, clean status mapping/no bare stage-word collisions, Summary from All Items, TT write-back loop).
- `sheets_sync.py` — new `--tech-writeback FILE`, `GATE_N_CLOSED` exact-token mapper guard, `build_summary_rows(sheet_rows=)` + `_summary_layout` helper.
- Dashboard brief: `/app/memory/handover/DASHBOARD_BRIEF_2026-10-22_PUSH.md`.

---

## Current status distribution (All Items, 956)
INTAKE 85 · PLANNING 13 · IMPLEMENTED 111 · QA 162 · **SMOKE 247** · CLOSED 309 · PARKED 26 · DUPLICATE 3 · Unrouted 0

## Open / next for the following session
- **Owner SMOKE batch pending** for the 6 (BUG-*) + 19 (CR-450→468) items. Suggest smoking the 5 P1s (CR-459/461/463/464/465 — money/GST/permission/reset) first/carefully.
- **BUG-468** can only be smoked after the **iOS release** ships; **BUG-558** is team "testing pending".
- **Not-done items staying in INTAKE:** BUG-578 (P0), BUG-476, BUG-554, BUG-543 — need Gate-2 planning.
- **Gate flow backlog:** BUG-600 → Gate 3 plan; BUG-601 awaiting OD-601-02 backend confirm; new CR-443→449/BUG-605→608 need Gate-2 once BACKEND blocks clear.

## Critical reminders (unchanged)
- Frontend uses **craco** (not react-scripts); supervisor already correct. **Do NOT overwrite `frontend/.env` / `backend/.env`.**
- Google Sheets auth via permanent `GOOGLE_REFRESH_TOKEN` in `frontend/.env` — no browser auth.
- **Never commit `.emergent/emergent.yml`** (pod-specific `job_id` breaks re-pulls).
- Tech Tasks rule: never auto-register; show drift → owner instruction → register → write-back to K/L/M.

## Key files
- `/app/memory/control/registry.json` (956 items, source of truth)
- `/app/memory/reports/sheets_sync.py` (`--push` / `--pull` / `--dry-run` / `--tech-writeback`)
- `/app/memory/control/AGENT_PROMPT_ALPHA.md` (v0.9 + Registrar Exit Checklist)
- `/app/memory/control/tech-tasks-sheet-contract.md`
- Backups this session: `/tmp/registry.backup.json`, `/tmp/sheets_sync.backup.py` (ephemeral — re-copy to /app if needed).
