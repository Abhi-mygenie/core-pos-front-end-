# CRM 2.0 — Consolidated Open Gaps Register

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**Type:** OPEN_GAPS (consolidated)
**Agent:** Sprint Consolidation Agent (read-only)
**Supersedes (as the current authoritative open-gaps view):**
- `open_gaps/CRM2_0_OPEN_STATUS_REGISTER_2026_05_26.md` (sprint-level — partially stale)
- `open_gaps/CRM2_0_CR_002_OPEN_GAPS_2026_05_26.md` (CR-002 — still authoritative for items rolled forward unchanged)

This register merges sprint-level and CR-002-level open items into a single current view, layered on the latest code-truth from 2026-05-27.

---

## 1. Active Open Items

| ID | CR | Area | Severity | Status | Description | Owner | Next Action |
|---|---|---|---|---|---|---|---|
| **CG-01** | CR-002 | Regression QA | **P1** | NOT_TESTED | AC-26 / T-28 / T-29 — order-commit payload regression after CR-002 lands. Requires a single sanctioned mutating order commit on R689. | Live Regression QA Agent | Execute regression on R689 with customer attached; diff payload vs pre-CR-002 baseline |
| **CG-02** | CR-002 | Legacy GET verification | **P1** (QA-time) | OPEN | OG-06 — runtime-verify POS makes zero calls to legacy `GET /notes/items` and `GET /notes/orders` after CR-002. Static audit confirms zero call sites; live network trace pending. | Live Regression QA Agent | Capture network log during full customer flow → 0 calls expected |
| **CG-03** | CR-002 | Stage 8 Handoff | **P1** | NOT_STARTED | No POS-facing handoff doc produced yet. Required to close the CR. | Stage 8 Handoff Agent | Author `handoff/CRM2_0_CR_002_CROSS_SELL_HANDOFF_TO_POS_<date>.md` |
| **CG-04** | CR-002 | Notes attachment gap | **P1** | OPEN (investigation only) | Notes show "No customer linked" when customer attached via CartPanel manual typing (Path B) or while order-restore enrichment is in flight (Path C). Pre-existing architectural gap, surfaced by CR-002 reliance on `customer.id`. | Owner decision | Decide whether to ship recommended Option A (trigger `lookupCustomer(phone)` on CartPanel phone blur) as a follow-up CR |
| **CG-05** | CR-002 | CRM Latency | P2 (non-blocking) | OPEN | OG-04 — CRM `/order-suggestions` 1.7–2.7s on preview host vs <500ms prod target. POS defends with 3s timeout + skeleton + silent-hide. | CRM Ops | Track until co-located production deploy |
| **CG-06** | CR-002 | Order-notes seed data | P2 | OPEN | OG-08 — no live populated `customer_notes` on R689; T-07 cannot be validated against real data | Owner | Place an order with `order_note != ''` on R689 → re-run T-07 |
| **CG-07** | CR-002 | First-time customer badge UX | P2 | KNOWN_UX_GAP | OG-11 — "New Customer" badge not visible at first modal open until Save. Hook keyed on `OrderEntry.customer.id` (centralized for 3 modals). Acceptable for v1. | Product Owner | Accept for v1, or schedule a follow-up CR (pre-fetch intel inside CustomerModal on search pick) |
| **CG-08** | CR-002 | Defensive cross-sell filter | P3 | STRUCTURAL_PASS | OG-09 — `filteredCrossSell` is structural passthrough; relies on server-side filter | — | Monitor; tighten if server filter regresses |
| **CG-09** | CR-002 | Timezone for `usual_time_of_day` | P3 | OPEN | OG-05 — chip only, no comparison logic; POS lacks restaurant IANA timezone | Backlog | Future enhancement |
| **CG-10** | CR-002 | Process — Preview Approval Gate | INFO | NOTED | OG-10 — Phase 2 UI Preview Approval Gate bypassed. Code is committed and functional. Process gap, not a code gap. | Sprint Admin | Record retroactive owner sign-off or accept |
| **CG-11** | CR-002 | Upsell forward-compat | P3 | VERIFIED_SAFE | OG-07 — `upsell_items[]` is silently ignored by transform; UI never references. `featureFlags.upsell` parsed but not consumed. | — | No action needed until CR-004 |
| **CG-12** | CR-001 | Disposition formalization | P3 | NOTED | CR-001 is SUBSUMED into CR-002 (Impl Plan PD-7). Legacy CRM `/notes/*` endpoints remain live server-side (Owner S-01) but POS does not call them. | — | No further action unless a fallback path is ever desired |
| **CG-13** | CR-001 | OF-02 `food_id` per item-notes | P3 | RESOLVED_BY_CR_002 | CR-002 POST returns `item_notes_by_id` keyed by `item_id` (= POS `food.id`). Relevant only if legacy GET is ever revisited. | — | Closed in CR-002 scope |
| **CG-14** | CR-001 | OF-03 `is_alert` flag per item note | P3 | BACKLOG | CRM does not ship `is_alert` yet | CRM Team | Future CRM `_v2` |
| **CG-15** | Sprint | BUG-108 carryover open-gaps doc | **P1** | NOT_CREATED | README §5 mandates `open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_<date>.md`; never authored | Sprint Admin | Create the doc seeded from README §5 |
| **CG-16** | Sprint | Missing BUG-108 carryover files | P2 | INFORMATIONAL | Three baseline-referenced files not present on disk: `..._ORDER_869016_ADDENDUM_...`, `..._BACKEND_MAPPER_AUDIT_REPORT_LIVE_UPDATE_...`, `..._COUPON_V2_V3_QA_REPORT_LIVE_UPDATE_...` | Sprint Admin | Locate in other sessions/branches OR formally record as never-produced (no fabrication) |
| **CG-17** | Sprint | CR-005 Wallet — Discovery | P2 | NOT_STARTED | Deferred from BUG-108 Q11; in CRM 2.0 scope per README | Owner / Discovery Agent | Discovery wave |
| **CG-18** | Sprint | CR-003 Tab — Discovery | P2 | NOT_STARTED | In CRM 2.0 themes (README §1) | Owner / Discovery Agent | Discovery wave |
| **CG-19** | Sprint | CR-008 Integrations — Discovery | P3 | NOT_STARTED | Scope TBD | Owner | Owner prioritization |
| **CG-20** | Sprint | CR-004 Up-sell — Implementation | P3 | BLOCKED | Server `feature_flags.upsell=false`; CRM has not shipped upsell engine | CRM Team | Wait for CRM Phase 2 |
| **CG-21** | Sprint | CR-009 BUG-108 Carryover — Formalization | P2 | NOT_STARTED | No discovery/plan; tracked only via README §5 | Sprint Admin | Create CR-009 scaffolding once carryover gap doc (CG-15) lands |

---

## 2. Resolved / Closed Items (since last register)

| ID | Item | Resolution |
|---|---|---|
| OSR-001 | CR-002 Stage 5 Planning NOT_STARTED | RESOLVED — `IMPLEMENTATION_PLAN_2026_05_26.md` written (789 lines) and executed |
| OG-01 | Live QA blocked by credentials | RESOLVED — owner creds provided 2026-05-27; 10/11 tests PASS + 1 PARTIAL |
| OG-03 | AC-30 customer-attach from CartPanel | RESOLVED — live verified |
| OG-07 | Upsell forward-compat | VERIFIED_SAFE → tracked at CG-11 |
| OSR-009 / OF-02 | `food_id` per item-notes entry | RESOLVED_BY_CR_002 → tracked at CG-13 |
| OG-12 / OSR-015 | **P0 HOTFIX:** customer icon intermittent invisibility | RESOLVED 2026-05-27 — permission gate `{canCustomerManage && (...)}` removed from `OrderEntry.jsx` L1382; icon now unconditional. Owner smoke-tested + confirmed. Doc: `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md` |

---

## 3. Summary Counts

| Metric | Count |
|---|---|
| Total open items | 21 |
| P0 (blocking) | 0 |
| P1 (high) | 4 (CG-01, CG-02, CG-03, CG-04, CG-15) — **5** |
| P2 (medium / non-blocking) | 7 (CG-05, CG-06, CG-07, CG-16, CG-17, CG-18, CG-21) |
| P3 (backlog / informational) | 8 (CG-08, CG-09, CG-11, CG-12, CG-13, CG-14, CG-19, CG-20) |
| INFO (process) | 1 (CG-10) |
| Resolved since prior register | 6 (incl. P0 hotfix) |

(Note: CG-15 is bucketed as P1 due to README mandate, raising the P1 count to 5.)

---

## 4. Unblocking Path

Top-priority unblock sequence for closing CR-002:

1. Sanctioned **single mutating order commit** on R689 with customer attached → captures CG-01 + CG-02 evidence in one pass.
2. Author **Stage 8 POS handoff** doc → closes CG-03.
3. Owner places order with `order_note != ''` on R689 → closes CG-06.
4. Owner decision on CG-04 (notes attachment gap) and CG-07 (first-time badge UX): accept-for-v1 or schedule follow-up CR.
5. Sprint Admin authors `open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_<date>.md` → closes CG-15; clarifies CG-16.

Estimated effort: ~2-3 hours for items 1–3 once a live QA + handoff agent are dispatched.

---

## 5. Reading Order for Next Agent

1. `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` (ACs / tests truth)
2. `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md` (current QA truth)
3. `reconciliation/CRM2_0_CR_002_PHASE_2_DOCS_RECONCILIATION_2026_05_26.md` (stale-docs map)
4. `reconciliation/CRM2_0_SPRINT_CONSOLIDATION_2026_05_27.md` (sprint roll-up — current)
5. `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md`
6. **THIS register** — `open_gaps/CRM2_0_CONSOLIDATED_OPEN_GAPS_2026_05_27.md`
7. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` + `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` (read-only baseline)

---

## 6. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Older open-gaps docs NOT edited in place | CONFIRMED (this is the additive consolidation layer) |
| 7 | Code treated as final truth | CONFIRMED |

---

**End of CRM 2.0 Consolidated Open Gaps Register.**
