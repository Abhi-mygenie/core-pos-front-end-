# CRM 2.0 — Open Status Register

**Date:** 2026-05-26
**Type:** OPEN_STATUS_REGISTER
**Sprint:** CRM 2.0
**Last updated by:** Reconciliation Agent (read-only pass)

---

## Active Open Items

| ID | CR | Area | Status | Evidence | Owner | Next Action | Priority |
|---|---|---|---|---|---|---|---|
| OSR-001 | CR-002 | Stage 5 Planning | NOT_STARTED | No `IMPL_PLAN` doc exists | Planning Agent | Produce `CRM2_0_CR_002_CROSS_SELL_IMPL_PLAN_2026_05_26.md` with two-phase structure + UI preview gate | **P0** |
| OSR-002 | CR-001 | Supersedure disposition | PENDING_DECISION | CR-002 discovery §3 S-01/S-02 supersedes CR-001 legacy GET path | Planning Agent | Decide: merge CR-001 notes into CR-002 impl plan, or keep as separate fallback CR | **P1** |
| OSR-003 | CR-002 | OG-Q02: `available_coupons_count` deploy | OPEN | Contract §9 OG-Q02 — observed value (24) may not match per-customer intent on current preview host | CRM Ops | POS hides field (F-01); no UX impact. Track until CRM confirms deploy. | **P2 (non-blocking)** |
| OSR-004 | CR-002 | OG-T1: Production co-located deploy timeline | OPEN | Contract §9 OG-T1 — preview latency 1.7-2.7s vs <500ms production target | CRM Ops | POS ships with 3s timeout + skeleton. Wait for CRM ops update. | **P2 (non-blocking)** |
| OSR-005 | CR-002 | OG-T2: `usual_time_of_day` timezone | OPEN | Contract §9 OG-T2 — POS doesn't know restaurant IANA timezone; v1 shows chip only, no comparison | Backlog | Future enhancement | **P3** |
| OSR-006 | CR-002 | OG-OA1: Legacy GET endpoint zero-call verification | OPEN | Contract §9 OG-OA1 — after CR-002 lands, QA must verify POS makes zero calls to legacy `/notes/items` + `/notes/orders` | QA Agent (Stage 7) | Verify during QA | **P1 (QA-time)** |
| OSR-007 | CR-002 | OG-OA2: Forward-compat for `upsell_items[]` | OPEN | Contract §9 OG-OA2 — when `feature_flags.upsell` flips true, POS must not crash | Implementation Agent (Stage 6) | Include forward-compat gate in impl | **P1** |
| OSR-008 | CR-001 | OF-01: Populated `/notes/orders` shape | OPEN | Contract §14 OF-01 — no live populated order-notes response captured | Owner (manual seed on preprod) | Owner places order with `order_note != ''` on R689 | **P2 (non-blocking for CR-002 — CR-002 gets notes from POST)** |
| OSR-009 | CR-001 | OF-02: `food_id` per item-notes entry | BACKLOG | Contract §14 OF-02 — CRM `/notes/items` keys by `item_name` not `food_id` | CRM Team | **RESOLVED by CR-002** — POST endpoint uses `item_id` (= `food_id`). Only relevant if legacy GET is ever revisited. | **P3 (resolved by CR-002)** |
| OSR-010 | CR-001 | OF-03: `is_alert` per item-notes entry | BACKLOG | Contract §14 OF-03 — CRM doesn't ship `is_alert` flag yet | CRM Team | Future CRM `_v2` | **P3** |
| OSR-011 | Sprint | BUG-108 Carryover gap doc | NOT_STARTED | README §5 lists 8 carryover items; no dedicated `open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_*.md` created | Sprint Admin | Create carryover gap doc per README §5 instruction | **P1** |
| OSR-012 | Sprint | CR numbering conflict (README vs actual docs) | INFORMATIONAL | README §7 suggests CR_002=WALLET; actual docs show CR_002=CROSS_SELL | None | Actual docs are ground truth. README is scaffold placeholder. No action needed unless README update is desired. | **P3 (informational)** |
| OSR-013 | Sprint | `owner_decisions/` folder empty | INFORMATIONAL | All owner decisions are inline in contract/requirements docs (27 decisions in CR-002 contract §11) | None | Acceptable — no separate owner-decision doc needed unless owner wants one | **P3 (informational)** |
| OSR-014 | Sprint | 3 BUG-108 carryover files not found on disk | INFORMATIONAL | `ORDER_869016_ADDENDUM`, `BACKEND_MAPPER_AUDIT_REPORT_LIVE_UPDATE`, `COUPON_V2_V3_QA_REPORT_LIVE_UPDATE` — referenced in reconciliation prompt but not found | Sprint Admin | Verify if these files exist in another session/branch; may have been created with different naming | **P2** |

---

## Closed / Resolved Items

| ID | CR | Area | Resolution | Date |
|---|---|---|---|---|
| OSR-015 | CR-002 | Customer icon intermittent invisibility (P0 HOTFIX) | Permission gate `{canCustomerManage && (...)}` removed from OrderEntry.jsx L1382. Icon now unconditional. Owner smoke-tested + confirmed. Doc: `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md` | 2026-05-27 |

---

## Summary Counts

| Metric | Count |
|---|---|
| Total open items | 14 |
| P0 (blocking) | 1 (OSR-001: Planning) |
| P1 (high) | 4 (OSR-002, OSR-006, OSR-007, OSR-011) |
| P2 (medium / non-blocking) | 4 (OSR-003, OSR-004, OSR-008, OSR-014) |
| P3 (backlog / informational) | 5 (OSR-005, OSR-009, OSR-010, OSR-012, OSR-013) |
| Closed | 1 (OSR-015: Customer icon hotfix) |

---

**End of CRM 2.0 Open Status Register.**
