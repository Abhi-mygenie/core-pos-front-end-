# CRM 2.0 — Sprint Consolidation Report

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**Type:** SPRINT_CONSOLIDATION
**Agent:** Sprint Consolidation Agent (read-only)
**Predecessors:**
- `reconciliation/CRM2_0_CONTINUATION_RECONCILIATION_2026_05_26.md` (sprint state at Stage 4 close — now stale)
- `reconciliation/CRM2_0_CR_002_PHASE_2_DOCS_RECONCILIATION_2026_05_26.md` (Phase 2 docs reconciliation)
- `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md` (authoritative Phase 2 QA)
- `open_gaps/CRM2_0_CR_002_OPEN_GAPS_2026_05_26.md` (authoritative CR-002 open gaps)
- `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md`

---

## 1. Executive Summary

```
SPRINT:                CRM 2.0
ACTIVE CR:             CR-002 Cross-Sell + Customer Intelligence
CR-002 CODE STATUS:    Phase 1 + Phase 2 COMPLETE (build green)
CR-002 LIVE QA:        10/11 PASS + 1 PARTIAL; 2 regression tests NOT_TESTED (mutating)
CR-002 HOTFIX:         P0 customer-icon visibility shipped + owner-confirmed
CR-001:                SUBSUMED into CR-002 (legacy GET path never wired in POS)
CR-003 / 004 / 005 / 008 / 009:  NOT_STARTED
STALE DOCS:            5 identified (older Phase 1 / preview / open-status docs)
MISSING DOCS:          3 BUG-108 carryover files + 1 CRM 2.0 carryover open-gaps doc
NEXT RECOMMENDED:      Live Regression QA Agent (T-28/T-29) → then CR-002 Stage 8 POS Handoff Agent
```

Code is the final truth. Where older docs claim "Phase 2 BLOCKED" they are STALE; the live code already contains all Phase 2 UI + the customer-icon hotfix.

---

## 2. Current Sprint Status

| Dimension | State |
|---|---|
| Sprint | CRM 2.0 — IN_PROGRESS |
| Active CR | CR-002 (only active CR) |
| Active stage per docs | Stage 7 QA (partial) → Stage 8 Handoff (not started) |
| Active stage per code | Phase 1 + Phase 2 implemented; build green; 1 hotfix shipped |
| Documentation health | 1 authoritative QA + 1 authoritative open-gaps doc; 5 stale docs annotated but not edited |
| Backend / `/app/memory/final/` / `/app/memory/crm/crm_1_0/` | UNTOUCHED throughout sprint |

---

## 3. CR-by-CR Status Matrix

| CR | Topic | Discovery | Contract | Reqs Freeze | Plan | Impl | QA | Handoff | Code-Verified | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| **CR-001** | Customer Notes Suggestion (item + order) | DONE | FROZEN v1 | FROZEN | n/a | n/a (subsumed) | n/a | n/a | Legacy GETs not called from any production modal | **SUBSUMED into CR-002** (Impl Plan PD-7). Historical record only. |
| **CR-002** | Cross-Sell + Customer Intelligence | DONE | FROZEN v1.1 (27 decisions) | FROZEN (30 ACs, 30 tests) | DONE (789-line plan) | **COMPLETE Phase 1 + Phase 2** | **PARTIAL** (10/11 live PASS, 1 PARTIAL, 2 NOT_TESTED) | NOT_STARTED | 4 NEW files + 4 MODIFIED files all verified | **CODE-COMPLETE — REGRESSION + HANDOFF PENDING** |
| CR-003 | Tab | NOT_STARTED | — | — | — | — | — | — | — | NOT_STARTED |
| CR-004 | Up-sell | NOT_STARTED | — | — | — | Forward-compat verified safe in CR-002 transform | — | — | Server flag `feature_flags.upsell=false` | **NOT_STARTED** — blocked until CRM ships upsell engine |
| CR-005 | Wallet | NOT_STARTED | — | — | — | — | — | — | `walletBalance` only displayed in CR-002 profile banner | **NOT_STARTED** (deferred from BUG-108 Q11) |
| CR-006 | Item-level Notes (standalone) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Covered by CR-002 `item_notes_by_id` | **SUBSUMED into CR-002** |
| CR-007 | Order-level Notes (standalone) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Covered by CR-002 `customer_notes` | **SUBSUMED into CR-002** |
| CR-008 | Integrations | NOT_STARTED | — | — | — | — | — | — | — | NOT_STARTED |
| CR-009 | BUG-108 Carryover (formal) | NOT_STARTED | — | — | — | — | — | — | Items listed in README §5; no dedicated doc | NOT_FORMALIZED |

---

## 4. CR-002 Final Status (code-verified)

### 4.1 Stage map

| Stage | Status | Authoritative artifact |
|---|---|---|
| 1 Discovery | DONE | `discovery/CRM2_0_CR_002_POS_FEEDBACK_TO_CRM_HANDOFF_2026_05_26.md` |
| 2 Owner Decisions (27 decisions, inline) | DONE | Contract §11 |
| 3 Contract Freeze v1.1 | DONE | `contract/CRM2_0_CR_002_CROSS_SELL_CONTRACT_FREEZE_2026_05_26.md` |
| 4 Requirements Freeze (30 ACs, 30 tests) | DONE | `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` |
| 5 Implementation Plan (two-phase + preview gate) | DONE | `implementation/CRM2_0_CR_002_CROSS_SELL_IMPLEMENTATION_PLAN_2026_05_26.md` (789L) |
| 6a Phase 1 (API/service/transform/cache/hook) | **DONE in code** | `implementation/CRM2_0_CR_002_CROSS_SELL_PHASE_1_IMPLEMENTATION_REPORT_2026_05_26.md` (claim accurate) |
| 6b UI Preview Approval Gate | **BYPASSED (process gap OG-10)** | No owner-approval record on file |
| 6c Phase 2 (UI in CustomerModal / ItemNotesModal / OrderNotesModal) | **DONE in code** | Verified via Phase 2 QA report |
| 7 QA | **PARTIAL** | `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md` |
| 8 POS-facing Handoff | **NOT_STARTED** | None — no `HANDOFF_TO_POS` doc produced |
| Hotfix (in-sprint) | **DONE + OWNER-CONFIRMED** | `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md` |

### 4.2 Code-truth file inventory

| Kind | File | LOC | Confirmed |
|---|---|---|---|
| NEW | `frontend/src/utils/relativeTime.js` | 25 | ✅ |
| NEW | `frontend/src/api/services/customerIntelService.js` | 35 | ✅ |
| NEW | `frontend/src/api/transforms/customerIntelTransform.js` | 155 | ✅ |
| NEW | `frontend/src/hooks/useCustomerIntel.js` | 155 | ✅ |
| MODIFIED | `frontend/src/api/constants.js` | +1 line (`CUSTOMER_ORDER_SUGGESTIONS`) | ✅ |
| MODIFIED | `frontend/src/components/order-entry/OrderEntry.jsx` | 2485 (hook + 3 modal prop wires + hotfix) | ✅ |
| MODIFIED | `frontend/src/components/order-entry/CustomerModal.jsx` | 803 (profile banner / favourites / suggestions / skeletons / testids) | ✅ |
| MODIFIED | `frontend/src/components/order-entry/ItemNotesModal.jsx` | 235 (consumes `customerIntel.itemNotesByItemId`) | ✅ |
| MODIFIED | `frontend/src/components/order-entry/OrderNotesModal.jsx` | 230 (consumes `customerIntel.customerNotes`) | ✅ |
| UNTOUCHED (verified) | `frontend/src/data/notePresets.js` | Mock still present but 0 calls from production modals (grep confirms) |
| UNTOUCHED | `/app/backend/server.py` | — |
| UNTOUCHED | `/app/memory/final/` | 8 files |
| UNTOUCHED | `/app/memory/crm/crm_1_0/` | — |

Build: `yarn build` exit 0, only the pre-existing `printOrder` ESLint warning in `OrderEntry.jsx` (line shifted by hook insert; not new).

### 4.3 Live QA result (2026-05-27, owner creds: owner@kunafamahal.com / Kunafa Mahal R689)

| Test | Result |
|---|---|
| T-01 Profile Banner | PASS |
| T-02 Past Favourites (5 chips) | PASS |
| T-03 Smart Suggestions (3 cards) | PASS |
| T-04 Cart exclusion (server) | PASS |
| T-05 First-time customer badge | **PARTIAL** (UX timing — see OG-11) |
| T-06 Walk-in (no customer) | PASS |
| T-08 Loading skeletons (DOM) | PASS |
| T-10 Favourite chip click → addToCart | PASS |
| T-11 Suggestion "+ Add" click → addToCart | PASS |
| T-27 data-testid audit | PASS |
| AC-26 / T-28 / T-29 regression on order commit | **NOT_TESTED** (mutating call — out of read-only scope) |
| T-07 OrderNotesModal populated history | **BLOCKED_BY_DATA** (no order_note seeded on R689) |
| Structural AC audit (28/30) | PASS |

---

## 5. QA Gaps Remaining

| ID | Sev | Status | Item | Resolution path |
|---|---|---|---|---|
| **OG-02** | P1 | NOT_TESTED | AC-26 / T-28 / T-29 — commit-payload regression after CR-002 lands | Live QA agent runs a real order commit on R689 with customer attached; diff payload vs pre-CR-002 baseline |
| **OG-06** | P1 (QA-time) | OPEN | Runtime-verify POS makes zero calls to legacy `GET /notes/items` + `GET /notes/orders` after CR-002 | Live network capture during full customer flow; expected 0 |
| OG-04 | P2 | OPEN | CRM `/order-suggestions` latency 1.7–2.7s on preview host | Defended by 3s timeout + skeleton + silent-hide; track until co-located production deploy |
| OG-08 | P2 | OPEN | OF-01 — no live populated `customer_notes` array on R689 | Owner seeds an order with `order_note != ''` on R689 |
| OG-11 | P2 | KNOWN_UX_GAP | T-05 "New Customer" badge not visible at first modal open until Save | Acceptable for v1; long-term fix = pre-fetch intel inside CustomerModal on search pick |
| OG-09 | P3 | STRUCTURAL_PASS | `filteredCrossSell` defensive filter is passthrough; relies on server-side filter | Monitor; tighten if server filter regresses |
| OG-05 | P3 | OPEN | `usual_time_of_day` no timezone comparison logic | Future enhancement |
| OG-10 | INFO | NOTED | Phase 2 Preview Approval Gate was bypassed (process gap) | Document retroactive owner sign-off, or accept |

Investigation-only gap (not formally tracked in OG list):
- **Notes "No customer linked" when customer attached via CartPanel manual typing (Path B) or while order-restore enrichment is in flight (Path C).** Pre-existing architectural gap. Recommended (NOT implemented) Option A: trigger `lookupCustomer(phone)` on CartPanel phone blur to fill `customer.id`. Source: `reconciliation/CRM2_0_CR_002_CUSTOMER_NOTES_NOT_SHOWN_INVESTIGATION_2026_05_27.md`.

---

## 6. Stale Docs Inventory

The following docs were written before Phase 2 / hotfix landed. They are NOT updated in place — this consolidation + the earlier Phase 2 reconciliation + Phase 2 QA report are the correction layer.

| # | Stale doc | Stale claim | Code truth |
|---|---|---|---|
| ST-1 | `implementation/CRM2_0_CR_002_CROSS_SELL_PHASE_1_IMPLEMENTATION_REPORT_2026_05_26.md` | §1 status string `..._preview_checkpoint_ready`; §5 "Phase 2 only after approval"; §6 "CustomerModal/ItemNotesModal/OrderNotesModal not modified" | Phase 2 fully implemented in all 3 modals |
| ST-2 | `handoff/CRM2_0_CR_002_CROSS_SELL_PREVIEW_CHECKPOINT_HANDOFF_2026_05_26.md` | All P-1..P-9 = PENDING; footer "Phase 2 BLOCKED" | All P-1..P-9 live in code |
| ST-3 | `qa/CRM2_0_CR_002_CROSS_SELL_PREVIEW_CHECKPOINT_QA_2026_05_26.md` | §5 UI ready=NO; §8 "Phase 2 BLOCKED pending preview approval" | Phase 2 live; preview gate bypassed (OG-10) |
| ST-4 | `reconciliation/CRM2_0_CONTINUATION_RECONCILIATION_2026_05_26.md` | "Stage 5 Planning NOT_STARTED"; "zero CR-002 implementation exists in codebase" | Plan written; Stages 5–7 done in code; hotfix shipped |
| ST-5 | `open_gaps/CRM2_0_OPEN_STATUS_REGISTER_2026_05_26.md` | OSR-001 P0 "Planning NOT_STARTED" | Plan written; impl + QA done; hotfix shipped |

Authoritative chain (read in this order):
1. `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` (ACs/tests truth)
2. `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md`
3. `reconciliation/CRM2_0_CR_002_PHASE_2_DOCS_RECONCILIATION_2026_05_26.md`
4. `open_gaps/CRM2_0_CR_002_OPEN_GAPS_2026_05_26.md`
5. `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md`
6. **THIS consolidation** (`reconciliation/CRM2_0_SPRINT_CONSOLIDATION_2026_05_27.md`)
7. **NEW open gaps** (`open_gaps/CRM2_0_CONSOLIDATED_OPEN_GAPS_2026_05_27.md`)

---

## 7. Missing BUG-108 Carryover Docs

Baseline referenced four BUG-108 carryover files. Disk audit:

| # | File path | On disk? |
|---|---|---|
| 1 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_2026_05_26.md` | YES |
| 2 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_OPEN_GAPS_REGISTER_2026_05_26.md` | YES |
| 3 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_ORDER_869016_ADDENDUM_2026_05_26.md` | **MISSING** |
| 4 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_LIVE_UPDATE_2026_05_26.md` | **MISSING** |
| 5 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_LIVE_UPDATE_2026_05_26.md` | **MISSING** |

Plus the CRM 2.0-side carryover doc per README §5:

| 6 | `crm/crm_2_0/open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_*.md` | **NOT_CREATED** |

Carryover items inherited at sprint open (from README §5) — none formally tracked in a CRM 2.0 open-gaps doc:

- P1 backend defect `loyalty_idempotency_key = null` on order 869016 (owner: POS Backend / Laravel team)
- Bill-print template `coupon_discount` line render (mapper I-3) — needs printed-bill artifact
- V2/V3 commit-time explicit evidence (mapper I-4 partial)
- Coupon reversal/refund (deferred to CRM Phase 2)
- Wallet CRM integration (deferred → re-scoped to CR-005)
- CRM admin UI for V3-B / V3-C coupon creation (deferred)
- Multi-coupon per order (not implemented)
- Variant / add-on coupon matching (engine limit)

---

## 8. Next Recommended Agent

**Primary:** `CRM 2.0 — CR-002 Live Regression QA Agent`
- Scope: execute T-28 + T-29 with a real order commit on R689 (must be allowed to mutate during this specific test only), capture commit-payload diff against pre-CR-002 baseline, runtime-verify zero calls to legacy `/notes/items` + `/notes/orders` (OG-06), close OG-02.

**Immediately after:** `CRM 2.0 — CR-002 Stage 8 POS-Facing Handoff Agent`
- Scope: produce `handoff/CRM2_0_CR_002_CROSS_SELL_HANDOFF_TO_POS_<date>.md` summarizing API contract, request/response shape, error semantics, click behaviour, testids, rollback, and feature-flag kill switch.

**Backlog candidates (owner prioritization needed):**
- CR-005 Wallet — Discovery Agent
- CR-003 Tab — Discovery Agent
- CR-008 Integrations — Discovery Agent (scope TBD)
- CR-009 BUG-108 Carryover — Sprint Admin to formalize carryover open-gaps doc

---

## 9. Exact Next Actions

1. **Run regression live QA** for AC-26 / T-28 / T-29 with a single sanctioned order commit on R689; capture network trace.
2. **Runtime-verify** zero legacy GET calls (`/notes/items`, `/notes/orders`) during full customer flow → close OG-06.
3. **Author Stage 8 handoff** `handoff/CRM2_0_CR_002_CROSS_SELL_HANDOFF_TO_POS_<date>.md`.
4. **Seed an order with `order_note != ''`** on R689 (owner action) → re-run T-07 → close OG-08.
5. **Decide on OG-11** (first-time badge timing): accept for v1 or schedule a follow-up CR.
6. **Document retroactive owner sign-off** for the bypassed preview gate (OG-10) OR record acceptance.
7. **Create CRM 2.0 carryover open-gaps doc** `open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_<date>.md` per README §5 (Sprint Admin).
8. **Track / locate** the three missing BUG-108 carryover files; if truly absent, mark them as never-produced in a follow-up note (no fabrication).
9. **Plan CR-005 Wallet discovery** kickoff (next sprint candidate).

---

## 10. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed by this consolidation pass | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Stale docs NOT edited in place | CONFIRMED (correction layer used) |
| 7 | Code is treated as final truth | CONFIRMED |
| 8 | Only two new docs created (this + consolidated open-gaps register) | CONFIRMED |

---

**End of CRM 2.0 Sprint Consolidation Report.**
