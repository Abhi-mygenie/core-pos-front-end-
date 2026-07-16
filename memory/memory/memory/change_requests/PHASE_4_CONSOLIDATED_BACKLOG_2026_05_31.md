# PHASE 4 — POS 4.0 Consolidated Backlog

**Date opened:** 2026-05-31
**Owner attestation:** `control/POS_4_0_DEFERRAL_OWNER_ATTESTATION_2026_05_31.md`
**Replaces:** the open tails of POS 2.0 / POS 3.0 / POS 3.1 / CRM 2.0 (all now CLOSED/archived)

This is the single backlog for all not-yet-shipped work. Each row keeps its
**original ID**, its **blocker**, and a **reactivation trigger** so nothing dies silently.
Closed/shipped work remains archived in its original sprint (history preserved).

---

## Bucket B — Deferred / Not Started (actionable when prioritized)
| ID | Title | Priority | Reactivation trigger |
|---|---|---|---|
| POS2-001 | Delivery charge / GST / web delivery lock | P2 | Owner prioritization (verify not already absorbed) |
| POS2-006 | confirmOrderTone | P3 | Owner answers OW-Q1 / OQ-2 / OQ-4 |
| BUG-097-R1 | CartPanel Collect-Bill gate (BUG-097 residual) | P1 | Owner picks Option A/B/C/D |

## Bucket C — Blocked (reactivation-gated — DO NOT mark resolved)
| ID | Title | Priority | Blocker | Reactivation trigger |
|---|---|---|---|---|
| BUG-090 | CRM customer_id on room orders | P2 | Backend | Q-090-B-1 answered |
| BUG-091 | CRM search API duplicates | P2 | Backend | CRM dedups |
| BUG-092 | Phone format contract | P2 | Backend | +91 vs raw-10 decided |
| BUG-093 | Room check-in date missing | P3 | Backend | Backend adds field |
| BUG-094 | Delivery socket missing payload | P3 | Backend | Q-094-1 answered |
| BUG-101 | (backend-blocked) | P2 | Backend | Backend delivers |
| BUG-096 | Realtime FE menu updates | P1 | Backend | Socket event names supplied |
| BUG-097-R2 | Rider socket events (BUG-097 Bucket 5) | P1 | Backend | Rider socket events supplied |
| BUG-106 | (CRM-blocked) | P2 | CRM | CRM delivers |
| BUG-107 | (CRM-blocked) | P2 | CRM | CRM delivers |
| BUG-108-D | BUG-108 P1 backend defect | P1 | CRM | CRM fixes defect |
| BUG-104 | Credit/Tab module | P1 | Owner scope | Owner scope session |
| BUG-105 | Settlement module | P1 | Owner scope | Owner scope session |
| POS2-008 | Backend-owned tone delivery | P3 | Backend | Backend implements |
| BUG-085 | Print Bill shows full GST breakdown | P2 | Backend | Backend delivers (origin: POS 2.0) |

## Bucket D — Intake Only
| ID | Title | Priority | Next step |
|---|---|---|---|
| BUG-040 | Audit Report Excel/CSV export must follow provided format | P2 | Schedule in POS 4.0 (origin: pos_final_1.0) |
| BUG-041 | Audit Report PDF download — misaligned rows, logic review | P2 | Schedule in POS 4.0 (origin: pos_final_1.0) |

## Tooling — SHIPPED
| ID | Title | Status | Notes |
|---|---|---|---|
| POS4-TOOL-001 | Dashboard data generator + drift linter | **SHIPPED 2026-05-31** | `registry.json` single source of truth; `gen_dashboard_data.js` (+ `--check`); de-duped BUG-* out of CR Registry (54→29). See `scripts/DASHBOARD_DATA_WORKFLOW.md` |

---

## Closed this consolidation (for reference — not in backlog)
BUG-097 (main, smoke PASS) · AUDIT-CLOSURE-DRIFT-001 (G-2 PASS) · CR-002 (T-28/T-29 PASS) ·
POS2-002 (working/closed) · POS2-005-FU §B (as-designed) · POS2-006-PG-PAID-ONLY (dropped) ·
BUG-095 (reconciled SHIPPED+VERIFIED) · **BUG-044 (reconciled CLOSED — OWNER VERIFIED; owner smoke pass, was stale PARKED/BLOCKED)** ·
**POS2-003-REOPEN-B (CLOSED — VERIFIED; code on v2 place-order, owner-confirmed)** ·
**UX-LOADING-02 · PROD-HOTFIX-006 · Order Activity Log (all CLOSED — AS DESIRED; owner: current code state desired, no changes needed)**.

## Separate track (NOT in POS 4.0)
- 24 unfrozen business rules → own 5-step promotion gate (`BASELINE_CONSOLIDATION_REPORT_2026_05_31.md`).

## CRM CRs — SUBSUMED (done, owner-attested — NOT backlog)
CR-003 (Tab) · CR-004 (Up-sell) · CR-005 (Wallet) · CR-008 (Integrations) · CR-009 (BUG-108 carryover) — all CLOSED — SUBSUMED. Tracked green in CR Registry; removed from POS 4.0 backlog 2026-05-31.
