# CR-046 — Control Dashboard v2.0: Interactive Workflow Controller

**ID:** CR-046
**Type:** CR (Feature)
**Priority:** P1
**Sprint:** POS 5.0
**Area:** Dev Tooling / Dashboard
**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-14
**Code Reality:** NONE — greenfield

---

## 1. Description

Transform the Control Dashboard (`/__dev/`) from a read-only status board into an interactive workflow controller where the owner can:
- View all items with gate-by-gate progress
- Select multiple items and send them as a batch to a specific stage
- Approve gates (Gate 4 GO) via button clicks
- Execute smoke tests with guided cards (summary + steps + PASS/FAIL)
- Use Express Lane (auto-chained batches with stop triggers)

## 2. Classification

**Feature** — new functionality on existing dashboard infrastructure.
No POS app code touched. All changes confined to `public/__dev/`.

## 3. Security Requirements

| Layer | Requirement |
|-------|-------------|
| **ENV Gate** | `REACT_APP_SHOW_DEV_DASHBOARD=true` required to load |
| **Login** | Simple password gate (SHA-256 hash in `access.json`), sessionStorage (dies on tab close). NOT Firebase — separate dev tool auth. |
| **Build Exclusion** | `craco.config.js` must exclude `__dev/` from `yarn build` production output. Files must not exist in production bundle. |

## 4. Batch Processing Rules

| Rule | Detail |
|------|--------|
| One batch = one stage | Cannot mix planning + implementation in same batch |
| Stage eligibility | Dashboard only shows items eligible for selected stage |
| No sprint mixing | All batch items must be same sprint |
| Eject, don't wait | If item can't proceed mid-batch → eject, don't block others |
| Express = chained batches | Auto-creates next-stage batch on completion. All gates still followed internally. |
| Smoke always stops | Even Express Lane stops at smoke — owner must verify |
| Triage always first | Agent triages batch before working — reports ejections |

## 5. Stage Definitions

| Stage | Agent Role | What Happens | Eligible Items |
|-------|-----------|--------------|----------------|
| Intake | Role 1 | Register items | Unregistered |
| Planning | Role 2 | Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan) | REGISTERED / INTAKE |
| Gate 4 | Owner | Approve plans (click) | GATE 3 COMPLETE |
| Implementation | Role 3 | Code + self-test + EXIT GATE (Gate 5a) | GATE 4 GO |
| QA | Role 4 | Execute test cases (Gate 5b) | IMPLEMENTED |
| Smoke | Owner | Verify on preprod (Gate 6) | QA PASSED |

## 6. Phased Delivery

### Phase 1 — Security + Foundation
- Build exclusion in craco.config.js
- Login screen + auth.js + access.json
- Gate progress bar per item (✅⬜🟡🔴)
- Stage filter dropdown
- **Verify:** dashboard loads in preview, 404 in production build

### Phase 2 — Batch Workflow
- Multi-select checkboxes
- Batch queue (select → send to stage)
- Queue panel display
- workflow_queue.json read/write
- Gate 4 approval buttons
- **Verify:** can create batch, see queue, approve gates

### Phase 3 — Smoke + Express
- Smoke test cards (summary + steps + PASS/FAIL)
- Express Lane chain (auto-advance with stop triggers)
- Batch checkpoint display
- Ejection notifications
- **Verify:** full flow from queue → smoke → close

## 7. File Structure (planned)

```
/app/frontend/public/__dev/
  ├── index.html              (modify — add login gate)
  ├── dashboard.js            (modify — v2.0 features)
  ├── styles.css              (modify — extend)
  ├── auth.js                 (NEW — login/session logic)
  ├── workflow.js             (NEW — batch queue + approvals)
  ├── data/
  │   ├── access.json         (NEW — hashed password)
  │   └── workflow_queue.json (NEW — batch queue)
  └── README.md               (modify — update)
```

## 8. Agent Integration

New Step -1 in ALL agent boot sequences (v0.5):
```
Read: /__dev/data/workflow_queue.json
If batch exists matching my role + status=QUEUED → process it
If no batch → proceed with normal interactive session
```

## 9. Queue File Contract

```json
{
  "batches": [
    {
      "batch_id": "BATCH-YYYY-MM-DD-NNN",
      "stage": "planning|implementation|qa",
      "sprint": "pos_5_0",
      "items": ["CR-XXX", "BUG-YYY"],
      "status": "QUEUED|IN_PROGRESS|DONE|FAILED",
      "created_at": "ISO timestamp",
      "owner_notes": "optional"
    }
  ],
  "approvals": [
    { "item_id": "CR-XXX", "gate": "gate_4", "verdict": "GO|NO", "notes": "", "at": "ISO" }
  ],
  "smoke_results": [
    { "item_id": "CR-XXX", "verdict": "PASS|FAIL", "notes": "", "at": "ISO" }
  ],
  "express_chains": [
    {
      "chain_id": "EXPRESS-YYYY-MM-DD-NNN",
      "items": ["CR-XXX"],
      "stages": ["planning","implementation","qa"],
      "current_stage": "planning",
      "auto_gate4": true,
      "stop_triggers_fired": []
    }
  ]
}
```

## 10. Open Questions

| # | Question | Status |
|---|----------|--------|
| OQ-1 | What password for dashboard login? | **OWNER TO DECIDE** |
| OQ-2 | Should Express Lane auto-approve Gate 4 or always stop? | Brainstorm says: auto-approve unless stop trigger fires |
| OQ-3 | Should batch history be persisted across sessions? | Suggest YES — append-only log |

## 11. Dependencies

- No POS app code dependencies
- No external API dependencies
- No backend dependencies
- Depends only on existing `registry.json` + `__dev/data/*.json` structure

## 12. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dashboard files leak to production | MEDIUM | Layer 3: craco build exclusion |
| Password in access.json committed to git | LOW | SHA-256 hash only, no plaintext |
| workflow_queue.json grows unbounded | LOW | Batch history pruning (keep last 50) |
| Agent misreads queue | LOW | Strict JSON schema + validation |

---

*Intake complete — 2026-06-14. Ready for Planning (Gates 2+3).*
