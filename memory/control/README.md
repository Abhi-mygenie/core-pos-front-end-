# Control Layer — Directory Index

**Created:** 2026-05-29
**Status:** STRUCTURE READY — Content to be populated

---

## Files in this directory

| # | Layer | File | Purpose | Status |
|---|---|---|---|---|
| 0 | Baseline | `BASELINE_INDEX.md` | Frozen truth index — architecture, business rules, contracts, modules | STRUCTURE |
| 1 | Dashboard | `CONTROL_DASHBOARD.md` | Single-page project status for owner/agent visibility | STRUCTURE |
| 2 | Handover | `AGENT_HANDOVER_PROTOCOL.md` | Mandatory onboarding for any new agent | STRUCTURE |
| 3 | CR Registry | `CR_REGISTRY.md` | Master table of all change requests across all sprints | STRUCTURE |
| 4 | Bug Tracker | `BUG_TRACKER.md` | Master bug list with priority, status, carryover tracking | STRUCTURE |
| 5 | Env & Config | `ENV_REGISTRY.md` | All env vars, URLs, config history, feature flags | STRUCTURE |
| 6 | Sprint Status | `SPRINT_STATUS.md` | Active and closed sprint status board | STRUCTURE |
| 7 | File Ownership | `FILE_OWNERSHIP.md` | Frozen vs active files, dependencies, conflict zones | STRUCTURE |
| 8 | Access | `ACCESS_REGISTRY.md` | Test accounts, API keys, credentials | STRUCTURE |
| 9 | Open Gaps | `OPEN_GAPS_REGISTER.md` | Consolidated open gaps across all sprints | STRUCTURE |
| — | Agent Prompt | `AGENT_PROMPT_ALPHA.md` | Alpha system prompt given to every new agent | v0.3 |
| — | Sessions | `sessions/` | Session start files — agent audit trail | ACTIVE |

---

## Maintenance Rules

1. **Dashboard** — updated every deploy or sprint status change
2. **Handover Protocol** — updated every branch change or credential rotation
3. **CR Registry + Bug Tracker** — updated when any item changes status
4. **Env Registry** — updated on any env variable change
5. **Sprint Status** — updated weekly or on milestone
6. **File Ownership** — updated after every implementation
7. **Open Gaps** — updated every QA pass or sprint reconciliation
8. **Baseline Index** — updated ONLY on owner-approved rule promotion

---

## Read Order

**Owner:** Layer 1 → Layer 6 → Layer 9
**New Agent:** AGENT_PROMPT_ALPHA.md → Create Session Start (Artifact #0) → Layer 2 → Layer 0 → Layer 7
**Any Agent doing work:** Layer 3 → Layer 4 → Layer 5 → Layer 8
