# Layer 1 — Control Dashboard

**Status:** POPULATED
**Last Updated:** 2026-06-07 — **CR-013-AUDIT Gate ④ wired + proportional distribution implemented**. Food Court Audit: per-order station pivot, 5 metrics (Item Total/Discount/Sub Total/Tax/Total), drift column, proportional discount/subtotal/total distribution. All 174 orders ₹0 drift on Jun 1. 3 backend gaps flagged (BE-ADDON-001, BE-CANCELLED-TAX-001, FE-PROPORTIONAL-001). S-FC-AUDIT at Gate ④ (awaiting owner data validation).
**Deployment Reconciliation:** 2026-06-07 — branch `5-june`; preview URL: https://106387a4-113a-472d-8a75-c96e251cbec0.preview.emergentagent.com

---

## Current Deployment

| Field | Value |
|---|---|
| Branch | `5-june` (S5+S6+S7+S8+S9+S-ROOM FROZEN, S10 Gate ① 2026-06-06) |
| Preview URL | https://ebe49383-b2a3-45b2-8354-5fff6939ac6a.preview.emergentagent.com |
| Last Deploy | 2026-06-06 |
| Node.js | v20.20.2 |
| Yarn | 1.22.22 |
| React | 19.0.0 |
| CRACO | 7.1.0 |

---

## Active Sprints

| Sprint | Status | Progress | Top Blocker |
|---|---|---|---|
| **POS 4.0 (Consolidated Backlog)** | **ACTIVE** | Bucket B: 9 deferred · Bucket C: 13 blocked · Bucket D: 4 intake | **S5 PARKED** (3-block drift shipped, 15 actionable orders, 42 REVIEW pending). **S6 Gate ⑤ in-flight** — cross-ref badges (Over Taxed / Tax Not Computed / Critical) shipped. 51 Ledger Audit flags, 38 unique orders, 13 Critical. Handovers: `NEXT_AGENT_HANDOVER_2026_06_04_NIGHT_S5_SESSION_CLOSE.md` + `NEXT_AGENT_HANDOVER_2026_06_04_NIGHT_S6_SESSION_CLOSE.md`. |
| POS 3.1 | CLOSED → consolidated into POS 4.0 | 3/3 QSR bugs shipped | — |
| CRM 2.0 | CLOSED → backlog into POS 4.0 | CR-002 CLOSED (T-28/T-29 live PASS); 5 CRs → POS 4.0 | — |
| Audit Report CR | SHIPPED | Complete | None |
| PROD Hotfixes (this session) | SHIPPED | PROD-007 + PROD-008 closed | None |
| Dev Tooling (DEV-DASHBOARD-001) | CLOSED — OWNER VERIFIED | v1.0 + v1.1 delivered, 6/6 artifacts present | None |
| Audit Reconciliation (AUDIT-CLOSURE-DRIFT-001) | CLOSED — OWNER VERIFIED | v1.2 dashboard + 44 bugs reconciled; G-2 owner smoke PASSED 2026-05-31 | None |
| Closure Debt Re-Audit (CLOSURE-DEBT-REAUDIT-001) | CLOSED — OWNER VERIFIED | v2.1 — CRITICAL 17→4; reproducible scanner committed; 108 bugs got artifact_refs | None |
| Intake Backfill + CG Waiver (INTAKE-BACKFILL-001) | CLOSED — OWNER VERIFIED | v2.2 — 38 intake stubs + 10 CG waivers; 9 bugs RESOLVED; WAIVED state in UI/CSV/JSONs | None |
| Dashboard Active-vs-Resolved counter fix (v2.3)   | CLOSED — OWNER VERIFIED | Headline strip + RESOLVED card + "19/28" tab badge + Active-only default filter | None |
| Big Batch Closure 001 (v2.6)                       | CLOSED — OWNER VERIFIED | 26 bugs archived (active 19→18, archived 19→45); 6 G2 reclassified NCN→IMPL→OV; CG Waiver Batch-3 (30 bugs); 24 intake stubs auto-gen | None |
| CR Registry Refs Sync 001 (v2.7)                   | CLOSED — OWNER VERIFIED | 54/54 CRs got artifact_refs + category; +35 CSV rows; CR Registry tab gets Active/Shipped/Tracked headline + clickable categories; row-detail shows linkable artifact panel | None |
| Active CR Compliance 001 (v2.8)                    | CLOSED — OWNER VERIFIED | 16 active-CR Intake stubs + 22 CG Premature waivers; 2 CRs auto-promoted; RESOLVED 49→65 | None |
| Subsumed Backlog Owner Attestation 001 (v2.9 + v2.9.1) | CLOSED — OWNER VERIFIED | v2.9: 8 INTAKE bugs → SUBSUMED. v2.9.1: 4 more bugs subsumed (BUG-018, 104, 106, 108); BUG-106 carries owner-attested CRM Coupon/Loyalty subsumption note. `active_recent_bugs` 25 → 22 | None |
| Subsumed CR + Status Pill Fix (v2.10) | CLOSED — OWNER VERIFIED | SUBSUMED renders green everywhere; CR_STATUS_CATEGORY maps SUBSUMED→SHIPPED; 5 CRs subsumed (CR-003/004/005/008/009); scanner over-match flagged; CR active 26→20 | None |
| Auto-promotion + Active-only register (v2.4)      | CLOSED — OWNER VERIFIED | 23 bugs auto-promoted IMPLEMENTED→OWNER VERIFIED; 9 fully-closed items archived from active register; CSV preserves history | None |
| Smoke Backfill Batch 001 (v2.5)                    | CLOSED — OWNER VERIFIED | 10 more bugs promoted to OWNER VERIFIED (6 smoke-only + 4 mid-effort with intake/CG-waiver); CSV grew 28→38 rows | None |

---

## Service Health (as of 2026-05-31)

| Service | Status |
|---|---|
| Frontend | RUNNING (webpack compiled with 1 warning — pre-existing ESLint warning in OrderEntry.jsx:1311) |
| Backend (supervisor) | RUNNING (default Emergent — not used by app) |
| Backend API (preprod.mygenie.online) | External — not monitored from pod |
| Socket (presocket.mygenie.online) | External — not monitored from pod |
| CRM | External — endpoint varies per deploy |
| Firebase | External — mygenie-restaurant.firebaseapp.com |
| MongoDB | RUNNING (not used by this frontend-only app) |

---

## Quick Links

| Layer | Doc |
|---|---|
| Baseline | [BASELINE_INDEX.md](./BASELINE_INDEX.md) |
| Handover | [AGENT_HANDOVER_PROTOCOL.md](./AGENT_HANDOVER_PROTOCOL.md) |
| CR Registry | [CR_REGISTRY.md](./CR_REGISTRY.md) |
| Bug Tracker | [BUG_TRACKER.md](./BUG_TRACKER.md) |
| Env & Config | [ENV_REGISTRY.md](./ENV_REGISTRY.md) |
| Sprint Status | [SPRINT_STATUS.md](./SPRINT_STATUS.md) |
| File Ownership | [FILE_OWNERSHIP.md](./FILE_OWNERSHIP.md) |
| Access | [ACCESS_REGISTRY.md](./ACCESS_REGISTRY.md) |
| Open Gaps | [OPEN_GAPS_REGISTER.md](./OPEN_GAPS_REGISTER.md) |
| Agent Prompt | [AGENT_PROMPT_ALPHA.md](./AGENT_PROMPT_ALPHA.md) |
| **Intake Workflow** | [INTAKE_WORKFLOW.md](./INTAKE_WORKFLOW.md) |
| Code Gate Policy | [CODE_GATE_POLICY.md](./CODE_GATE_POLICY.md) |
| **Registration Gate** | [REGISTRATION_GATE_POLICY.md](./REGISTRATION_GATE_POLICY.md) |
| **CR-011 Screen Freeze Protocol** | [CR_011_SCREEN_FREEZE_PROTOCOL.md](./CR_011_SCREEN_FREEZE_PROTOCOL.md) (BINDING — Gate 2.5) |
| **CR-011 Screen Freeze Log** | [CR_011_SCREEN_FREEZE_LOG.md](./CR_011_SCREEN_FREEZE_LOG.md) |
| **CR-011 Loading & Interaction Spec** | [../memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md](../memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md) (Gate 4 Code Gate contract; planning-only during Gate 2.5) |
ng-only during Gate 2.5) |
