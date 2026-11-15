# MyGenie POS — PRD

## Product
Point-of-Sale web application (React + FastAPI + MongoDB) for restaurant management.

## Repository
`https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main`

## Deployment Sync (2026-11-14)
- Re-pulled `main` @ `3858f26` ("Auto-generated changes"): `/app/frontend` + `/app/memory` replaced from remote; `.env` files and `/app/.emergent` preserved; webpack compiled, preview login page renders.

---

## Current Status (2026-11-15)

### Batch A — Cancellation, Complimentary & Permissions (13 items)
- **Gate 1 Intake:** CLOSED
- **Gate 2 Impact Analysis:** CLOSED 2026-11-14 (rounds R1–R12)
- **Gate 2.5 Design Approval:** CLOSED 2026-11-14 (M1–M10 all approved)
- **Gate 3 Implementation Plan:** NOT STARTED
- **Gate 4 GO:** Pending (owner, after Gate 3)
- Backend briefs sent (Gyan BA-01..22, Parth B-495-1..7). Reply not received.
- Handover: `handover/HANDOVER_BATCH_A_GATE3_IMPLEMENTATION_AGENT.md`

### Batch B — Payments, Credit & GST (9 P0 + CR-542 → P0)
- **Gate 1 Intake:** CLOSED (P0 only)
- **Gate 2 Impact Analysis:** IN PROGRESS 2026-11-15 (code reality + live probes done, owner R1–R4 answered, R5 Q15–Q18 open)
- Summary: `impact/BATCH-B_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md`
- Handover: `handover/SESSION_HANDOVER_2026_11_15_BATCH_B_GATE2_IA_PARTIAL.md`

### Batch C — Order Beta Report & Reports (4 P0 items + 2 investigations)
- **Gate 1 Intake:** CLOSED (P0 only)
- **Gate 2:** NOT STARTED
- Handover: `handover/HANDOVER_BATCH_BCD_IMPACT_ANALYSIS_AGENT.md`

### Batch D — Dashboard, Order Entry & Order Cards (6 P0 items)
- **Gate 1 Intake:** CLOSED (P0 only)
- **Gate 2:** NOT STARTED
- Handover: `handover/HANDOVER_BATCH_BCD_IMPACT_ANALYSIS_AGENT.md`

### Batches E–J
- **Gate 0:** Intake questions not asked yet. Briefs in `change_requests/INTAKE_REQUIREMENT_BRIEFS_2026_11_14.md`.

---

## What was done this session (2026-11-14 → 2026-11-15)

1. Synced local `/app` with remote `main` branch (commit 9b1fc198), preserving `.env` and `.emergent`.
2. Imported Batch A IA docs from v1 zip (impact, evidence, handover, change_requests).
3. Imported v2 zip (added backend briefs + updated summary/decisions).
4. Imported planning merge kit (Gate 2.5 mockups, Gate 3 handover, Gate 2 closed handover).
5. Updated CR_REGISTRY.md: Batch A summary table at top, all 13 items → GATE_2_IA_CLOSED, priorities synced, CR-496 → SUBSUMED.
6. Updated registry.json: all 13 Batch A items synced + priorities.
7. Deleted nested duplicate `evidence/BATCH-A-IA/BATCH-A-IA/`.
8. Wrote 2 handover docs (Batch A Gate 3 + Batch B/C/D IA agents).
9. Imported Batch B IA session zip (32 new files + 3 file edits): probes, summary, handover, registry updates for 10 items.

---

## Key files

| Purpose | Path |
|---|---|
| Batch A summary | `impact/BATCH-A_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md` |
| Batch A decisions | `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md` |
| Batch B summary | `impact/BATCH-B_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md` |
| Backend brief (Gyan) | `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_14.md` |
| Backend brief (Parth) | `backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md` |
| Backend tracker | `backend_briefs/BACKEND_BRIEF_TRACKER.html` |
| Design mockups | `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html` |
| Gate 3 handover (detailed) | `handover/SESSION_HANDOVER_2026_11_14_BATCH_A_GATE3_PLANNING.md` |
| Gate 2 close summary | `handover/SESSION_HANDOVER_2026_11_14_BATCH_A_GATE2_CLOSED.md` |
| Batch B handover | `handover/SESSION_HANDOVER_2026_11_15_BATCH_B_GATE2_IA_PARTIAL.md` |
| Registry (markdown) | `control/CR_REGISTRY.md` |
| Registry (JSON) | `control/registry.json` |
| All intake briefs | `change_requests/INTAKE_REQUIREMENT_BRIEFS_2026_11_14.md` |
| Batch B/C/D decisions | `change_requests/BATCH_{B,C,D}_OWNER_DECISIONS_2026_11_14.md` |

---

## Zero code changes this session. All work was documentation merge and registry sync.

## 2026-11-15 — Batch A Gate 3 planning (partial)
- G6 (CR-372-B routes): PLAN READY — FE only, no backend dependency.
- G1 (cancel: BUG-674, BUG-670, CR-493): PARTIAL — modal note + transform fix ready; reports/Order Beta + BA-01 field name blocked on backend.
- G2 (rights: CR-492, CR-515): PARTIAL — item comp gating + comp reason (M5b Option B) ready; pay-later BA-09 blocked.
- G3/G4/G5 (PIN, room comp, alerts): NOT PLANNED — wait for backend reply.
- M5b Option B approved (comp reason box under every comp line; Pay blocked until filled).
- BA-23, BA-24 added to Gyan's brief (auto-cancel reason + refund-cancel note key).
- Owner decisions R13–R15 recorded.
- Build blocked on QA of BUG-660/661/662/665/666/656, CR-512 (same files).
