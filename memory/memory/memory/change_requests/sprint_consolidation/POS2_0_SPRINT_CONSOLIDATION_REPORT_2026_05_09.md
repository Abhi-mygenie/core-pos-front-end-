# POS2.0 Sprint Consolidation Report — 2026-05-09

> **Sprint:** pos2.0
> **Type:** Documentation / Reconciliation only — NO code, NO `/app/memory/final/*` edits, NO new CRs (other than backlog candidates flagged in §8).
> **Branch under review:** `Sunday-10-may` (cloned to `/app` 2026-05-09; FE source-of-truth for this consolidation).
> **Predecessor consolidations:** `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`, `PENDING_TASK_REGISTER_2026_05_04.md`, `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`, `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`.

---

## 1. Executive summary

> **Verdict: `ready_for_owner_closure_review`** with explicit per-item gating.

The POS2.0 sprint comprises **15** discoverable items (3 reopens / follow-ups inside POS2-003, plus a follow-up under POS2-005, plus a Phase 2 backend-side proposal under POS2-008). At the time of this report:

| Bucket | Count | Items |
|---|---:|---|
| **Implemented + QA passed (static/unit/wire)** | 4 | POS2-003 main, POS2-003-FU-02, POS2-003-REOPEN-A, POS2-005 main, POS2-007 Phase 1 *(see §3 row count = 4 distinct CRs; 5 separate verdicts)* |
| **Awaiting live tenant runtime validation** (with `print_agent` non-empty / status-8 row / profile-flip fixture) | 4 | POS2-003 main, POS2-003-FU-02, POS2-003-REOPEN-A, POS2-005 + POS2-007 Jungle Trail residual |
| **Investigation complete — needs owner / backend decision** | 4 | POS2-002, POS2-004 (rolled into POS2-005), POS2-005-FU §B, POS2-006 |
| **Planning complete — backend owns** | 1 | POS2-008 Phase 2 |
| **Parked — gated on owner reason + backend behavioural-parity** | 1 | POS2-003-REOPEN-B |
| **Not started / no on-disk record** | 2 | POS2-001, POS2-006-PG-PAID-ONLY (proposed only) |
| **Out-of-scope for this sprint (no on-disk record)** | 2 | A-1, A-2 (Product API field mapping / kill-switch — not produced in this sprint thread) |

**Burning issues:** None on the sprint surface. The CR-013 Bean Me Up double-count (independent track) remains the only customer-visible production issue, and it is unchanged by this sprint.

---

## 2. Docs read

### 2.1 Baseline (`/app/memory/final/`) — read-only, never modified
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `IMPLEMENTATION_AGENT_RULES.md`

### 2.2 Overlay (current accepted)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

### 2.3 Sprint CR docs
| CR / Item | Impact analysis | Plan | Handover | Implementation summary | QA report |
|---|---|---|---|---|---|
| **POS2-001** Delivery charge / GST / web delivery lock | — | — | — | — | — |
| **POS2-002** Order origin / Scan&Order web pipeline | `POS2_002_..._2026_05_07.md` | — | — | — | — |
| **POS2-003** Print Agent Mapping (main) | `POS2_003_PRINT_AGENT_MAPPING_CR_IMPACT_ANALYSIS_2026_05_08.md` | `POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_PLAN_2026_05_08.md` | `POS2_003_IMPLEMENTATION_AGENT_HANDOVER_2026_05_08.md` | `POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_SUMMARY_2026_05_08.md` | `POS2_003_PRINT_AGENT_MAPPING_QA_REPORT_2026_05_08.md` |
| **POS2-003-FU-02** printer_agent null on Collect Bill / postpaid auto-print | — | — | (inline in QA report addendum) | (inline addendum) | `POS2_003_FU_02_PRINTER_AGENT_NULL_GAP_ANALYSIS_2026_05_08.md` (with fix-applied addendum) |
| **POS2-003-REOPEN-A** update/cancel printer_agent | `POS2_003_REOPEN_CANCEL_UPDATE_PRINTER_AGENT_AND_V2_ENDPOINT_REVIEW_2026_05_09.md` | (inline plan §10) | — | `POS2_003_REOPEN_A_CANCEL_UPDATE_PRINTER_AGENT_IMPLEMENTATION_SUMMARY_2026_05_09.md` | `POS2_003_REOPEN_A_WIRE_LEVEL_QA_REPORT_2026_05_09.md` |
| **POS2-003-REOPEN-B** v1→v2 place-order revert / profile flip | (inline §A in REOPEN impact analysis) | — | — | — | — |
| **POS2-004** f_status=8 investigation | `POS2_004_F_STATUS_8_HOLD_PAID_DASHBOARD_INVESTIGATION_2026_05_08.md` | — | — | — | `POS2_004_F_ORDER_STATUS_8_VALIDATION_REPORT_2026_05_08.md` |
| **POS2-005** f_status=8 Hold/Audit reroute | `POS2_005_F_STATUS_8_HOLD_REROUTE_CR_IMPACT_ANALYSIS_2026_05_08.md` | (inline) | `POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_HANDOVER_2026_05_08.md` | `POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_SUMMARY.md` | `POS2_005_F_STATUS_8_HOLD_REROUTE_QA_REPORT.md` + `POS2_005_POS2_007_JUNGLE_TRAIL_QA_REPORT_2026_05_09.md` |
| **POS2-005-FU** Status 8/9 Collect-Bill + PG filter cross-tab | `POS2_005_FU_STATUS_8_9_COLLECT_BILL_AND_PG_FILTER_INVESTIGATION_2026_05_09.md` | — | — | (inline) | — |
| **POS2-006** confirmOrderTone investigation | `POS2_006_CONFIRM_ORDER_TONE_INVESTIGATION_2026_05_09.md` (incl. payload-capture addendum) | — | — | — | — |
| **POS2-006-PG-PAID-ONLY** PG filter scope-to-Paid-tab | (proposed in POS2-005-FU §10 row B) | — | — | — | — |
| **POS2-007 Phase 1** confirm-order tone FE override | (inline; rooted on POS2-006 addendum) | — | — | `POS2_007_PHASE1_CONFIRM_ORDER_TONE_OVERRIDE_IMPLEMENTATION_SUMMARY.md` | `POS2_007_PHASE1_CONFIRM_ORDER_TONE_OVERRIDE_QA_REPORT.md` + Jungle Trail QA |
| **POS2-008 Phase 2** backend-owned tone delivery | `POS2_008_PHASE2_BACKEND_OWNED_TONE_DELIVERY_CR_PLANNING_2026_05_09.md` | — | — | — | — |
| **A-1** Product API field mapping / channel eligibility | — | — | — | — | — |
| **A-2** `is_disable` + `status` kill-switch | — | — | — | — | — |

### 2.4 Code / repo verification
- Implementation source on `/app/frontend/src/` matches the per-CR implementation summaries (verified during REOPEN-A pass: 23 test suites · 291 tests pass; production build clean at 434.04 kB). No drift detected since the per-CR summaries were authored.

---

## 3. Sprint status dashboard

| # | Item | Type | Status | QA status | Pending blockers | Recommended next action | Final-doc update needed? |
|---:|---|---|---|---|---|---|---|
| 1 | **POS2-001** Delivery charge / GST / web delivery lock | CR (untracked on disk) | not started | no QA yet | none documented; possibly already covered under predecessor CR-013 / CR-008 D1-Cap. Owner clarification required: is POS2-001 still an open ask or absorbed by shipped CRs? | owner clarification | No (not yet implementable) |
| 2 | **POS2-002** Order origin / Scan&Order web pipeline | CR (planning) | investigation complete | no QA yet | backend payload confirmation (`order_from` field on dashboard sockets) + business confirmation (R-POPOUT scope OQ-1; OQ-3 filter design; OQ-6 confirm-order status code) | owner answers OQ list → freeze requirements → implementation plan | Possibly (if a new module is introduced) — defer |
| 3 | **POS2-003 (main)** Print Agent Mapping | CR | implemented + QA passed | static + unit + Addendum 2 (v1 vs v2 wire compatibility) | live tenant with non-empty `print_agent` configured (graceful path on tenant 478 already works) | owner smoke test on tenant with configured agents | Optional — `MODULE_DECISIONS_FINAL.md` may benefit from a `printerAgents` line under "RestaurantContext"; not blocking |
| 4 | **POS2-003-FU-02** printer_agent null on Collect Bill / postpaid auto-print | bug fix | implemented (`fix_applied_static_validation_pass`) | static + unit | live runtime gates 7-1 + 7-2 (BILL agent on wire) on a tenant with non-empty `print_agent` | owner smoke test on agent-configured tenant | No |
| 5 | **POS2-003-REOPEN-A** add `printer_agent` to update/cancel flows | CR | implemented + wire-level QA passed | static + unit + wire-level integration (29/29 cases; 23/23 suites; 291/291 tests) | live preprod browser QA on tenant with non-empty `print_agent` | owner smoke test on agent-configured tenant | No |
| 6 | **POS2-003-REOPEN-B** place-order v1→v2 revert + possible profile v2 flip | CR | parked | no QA yet | BC-5: owner reason for v1 choice (was R-OWNER-14 mechanical or behavioural?) + BC-6: backend behavioural-parity confirmation between v1 and v2 (socket events, FCM YTC tone, audit log) | keep parked; resume after backend confirmation | No |
| 7 | **POS2-004** f_order_status=8 dashboard investigation | investigation | investigation complete (`baseline_conflict_needs_owner_decision`) — owner accepted, rolled into POS2-005 | code-walk + live wire (`/order-logs-report`) | resolved by POS2-005 implementation | close (superseded by POS2-005) | No |
| 8 | **POS2-005** f_order_status=8 Hold/Audit reroute | CR | implemented + QA passed | static + lint/build + Jungle Trail runtime (negative path live; positive path `BLOCKED_BY_MISSING_TEST_DATA`) | live status-8 row on any tenant for visual screenshot record (non-blocking; structural evidence stands) | owner smoke test (when status-8 row available) | Yes — `STATUS_COLUMNS` now excludes `id:8`; recommend adding a one-line note under Module 11 / dashboard status hierarchy |
| 9 | **POS2-005-FU §A** Collect-Bill HIDDEN for status-8 in Hold tab | follow-up to POS2-005 | implemented (predicate add at `OrderTable.jsx:243-260` per Jungle Trail report TC-005-04) | code-walk PASS via Jungle Trail QA | owner verify on a live status-8 row | owner smoke test | No |
| 10 | **POS2-005-FU §B** PG filter cross-tab applicability | investigation | investigation complete (`behavior_as_expected`); owner-decision pending | n/a | owner decision: keep cross-tab vs scope to Paid tab only | owner decision; if Paid-only desired → spawn POS2-006-PG-PAID-ONLY | No |
| 11 | **POS2-006** confirmOrderTone profile mapping | investigation | investigation complete; transitioned to `needs_owner_decision` after 2026-05-09 payload addendum (B-Q1 closed; B-Q2 partial; B-Q3 with one assumption) | n/a | owner decisions OW-Q1 / OQ-2 / OQ-4 | owner decision → freeze requirements → CR planning | No |
| 12 | **POS2-006-PG-PAID-ONLY** PG filter scope-to-Paid-tab | proposed (no on-disk doc) | not started | n/a | owner decision (POS2-005-FU §B) | create CR if owner confirms | No |
| 13 | **POS2-007 Phase 1** confirm-order tone FE override | CR | implemented + QA passed | static + lint/build + Jungle Trail runtime (default-tone override, Silent Mode kill-switch, aggregator non-override, case variants verified) | live profile-flip to `silent` / `buzzer` requires admin tooling — pending opportunistic exercise | owner sign off; admin-flip exercise when fixtures land | No (Phase 1 is intentionally transient — see Phase 2 below) |
| 14 | **POS2-008 Phase 2** backend-owned tone delivery | CR (planning) | planning complete | n/a | backend bandwidth + backend ships canonical tone token in profile/socket; FE Phase-1 override removal then auto-cleanup of `toneMapper.js` + `restaurantRef.js` | resume after backend confirms timeline; FE Phase-1 cleanup follows backend ship | Yes (post-Phase-2) — once backend owns the tone, the override layer + the two helper modules will be deleted; document as a behaviour change |
| 15 | **A-1** Product API field mapping / channel eligibility | sprint backlog (no on-disk doc in this sprint) | not started | n/a | owner clarification — is this a separate sprint track or implicit POS2-002 dependency? | owner triage → docs → CR | n/a |
| 16 | **A-2** `is_disable` + `status` kill-switch | sprint backlog (no on-disk doc in this sprint) | not started | n/a | same as A-1 | owner triage → docs → CR | n/a |

> **Note on row counting:** rows 7 (POS2-004) and 9 (POS2-005-FU §A) are folded into the parent CR statuses (POS2-005 main / closure); they are reported separately for traceability but not counted as additional open work.

---

## 4. Completed / ready-to-close items

These items have implementation, static/unit/wire-level QA, and require **only** owner sign-off to be marked closed. No further FE work pending other than optional live screenshot capture.

| Item | Verdict | Sign-off action |
|---|---|---|
| **POS2-003 main** | `qa_pass_ready_for_acceptance` (Addendum 2 — v1 / v2 wire compatibility confirmed) | Owner reviews QA report Addendum 2 → close. Optional smoke on tenant with configured agents. |
| **POS2-003-FU-02** | `fix_applied_static_validation_pass — runtime_confirmation_pending_on_tenant_with_configured_agents` | Owner smokes Print Bill / postpaid auto-print on agent-configured tenant → if BILL agent appears on wire, mark `fu_02_resolved`. |
| **POS2-003-REOPEN-A** | `qa_pass_ready_for_manual_live_validation` | Owner smokes update / cancel-item / cancel-order on agent-configured tenant → if `printer_agent` carries correct stations, mark closed. |
| **POS2-005 main** | `PASS — ready for owner sign-off + manual smoke test` (per `POS2_005_F_STATUS_8_HOLD_REROUTE_QA_REPORT.md` §5) | Owner smokes on a tenant with a real status-8 order → confirm card hidden on dashboard, surfaced on Hold tab, no Collect Bill button → close. |
| **POS2-007 Phase 1** | `PASS — ready for owner sign-off + manual smoke test` (POS2_007_PHASE1_..._QA_REPORT.md §4) | Owner signs off on Phase 1 (FE override). Phase 2 cleanup later. |

**Aggregate test posture (sprint-wide):** 23/23 unit-test suites · 291/291 unit tests pass. Production build clean (434.04 kB main bundle). Lint clean. Zero new warnings.

---

## 5. Implemented but awaiting manual validation

| Item | What's awaited | Why awaited | Workaround |
|---|---|---|---|
| **POS2-003-FU-02** | Live wire on agent-configured tenant for gates 7-1 (manual Print Bill) + 7-2 (postpaid auto-print bill) | Tenant 478 returns `print_agent: []` so a graceful-path test cannot visually distinguish fix from defect | Owner has a tenant from which the bug screenshot was captured; same buttons + DevTools network tab on that tenant should show BILL agent |
| **POS2-003-REOPEN-A** | Live wire on agent-configured tenant for the 13 gates listed in `POS2_003_REOPEN_A_WIRE_LEVEL_QA_REPORT_2026_05_09.md` §7 | Same tenant constraint as FU-02 | Wire-level integration test (29/29 cases) covers all 13 gates with mocked non-empty `print_agent`; live capture is for owner record only |
| **POS2-005 main** | Live status-8 row inspection (Jungle Trail had none on QA day) | Test data dependent — needs an order in `f_order_status=8` state on some tenant | Code-walk + structural negative-path on Jungle Trail PASS; positive path verified via predicate inspection |
| **POS2-007 Phase 1** | Live profile-flip test for `silent` and `buzzer` values | Requires admin tooling to mutate `restaurants[0].settings.confirm_order_tone` | Pure-function `toneMapper` already proves the mapping; default-tone override + Silent Mode kill-switch are live-verified on Jungle Trail |

Manual validation pending is **non-blocking** for owner closure; each item has a documented workaround. When fixtures arrive, replay the gates listed in the per-item QA report.

---

## 6. QA passed but live tenant validation pending

(This list is identical to §5 — included separately per task brief structure.)

| Item | QA passed at | Pending live tenant | Acceptance criteria when validation runs |
|---|---|---|---|
| POS2-003 main | static + unit + wire-compatibility addendum | tenant with `print_agent` non-empty | Owner sees configured KOT agents on `place-order` wire; BILL agent on `order-temp-store` bill; `[]` when no station match |
| POS2-003-FU-02 | static + unit | tenant with `print_agent` non-empty | OrderEntry header "Print Bill" + postpaid auto-print both carry BILL agent on wire |
| POS2-003-REOPEN-A | static + unit + wire-level integration (29/29) | tenant with `print_agent` non-empty | `update-place-order`, `cancel-food-item`, `order-status-update` payloads carry expected `printer_agent` content; BILL excluded; `[]` fallback when applicable |
| POS2-005 main | static + lint/build + Jungle Trail (negative path) | tenant with a live `f_order_status = 8` order | Card NOT on running dashboard, surfaced on Hold tab with HOLD label, NO Collect Bill button |
| POS2-007 Phase 1 | static + lint/build + Jungle Trail (default-tone override + Silent Mode + aggregator) | admin-tool flip of `confirm_order_tone` to `silent` and `buzzer` | YTC fires correct tone (silent = no audio; buzzer = buzzer asset; default = doorbell when confirmOrderTone undefined) |

---

## 7. Parked / pending backend confirmation

| Item | Parked because | When to resume |
|---|---|---|
| **POS2-003-REOPEN-B** (place-order v1→v2 revert + possible PROFILE flip) | BC-5: owner reason for v1 choice in POS2-003 not on file (R-OWNER-14 was mechanical-only or behavioural?). BC-6: no on-file proof v1 and v2 are behaviourally identical (socket emissions, FCM YTC tone, audit log). 1-line revert is mechanically trivial; risk is residual behavioural drift. | After (a) owner re-confirms v1 was a symmetry-only choice, (b) backend provides wire-diff between v1 / v2 for the same input. |
| **POS2-008 Phase 2** | Backend owns the canonical tone token. FE plan documents the exact removal + cleanup sequence; pre-flight blocked on BE bandwidth and contract confirmation. | After backend ships the per-restaurant / per-event tone token in profile or socket. Phase 1 override is intentionally transient. |
| **POS2-002** | Backend payload confirmation needed (`order_from` field on dashboard sockets); owner business confirmation needed for OQ-1 (R-POPOUT scope), OQ-3 (filter pill vs badge), OQ-6 (confirm-order status code for web orders). | After owner answers OQ-1/3/4/6 and backend confirms field availability + socket echo. |
| **POS2-006** (confirmOrderTone) | Owner decisions OW-Q1 / OQ-2 / OQ-4 still open. B-Q1/B-Q2/B-Q3 mostly closed by 2026-05-09 payload addendum. | After owner decisions land. Path to `ready_for_planning` is hours per the addendum. |
| **POS2-005-FU §B** (PG filter cross-tab) | Behaviour is as expected; question is whether owner wants PG filter scoped to Paid tab only. | Owner decision; if "Paid-only" desired → spawn POS2-006-PG-PAID-ONLY. |

---

## 8. Backlog / future CRs

| Backlog item | Source | Priority signal | Owner trigger |
|---|---|---|---|
| **POS2-006-PG-PAID-ONLY** PG filter scope to Paid tab | POS2-005-FU §B recommendation | Low (cosmetic UX scoping; not a defect) | Owner picks "Paid-only" |
| **POS2-001** Delivery charge / GST / web delivery lock | User brief mentions item; no on-disk doc | Owner clarification — likely already covered by CR-013 / CR-008 D1-Cap; otherwise needs investigation | Owner confirms whether still open |
| **A-1** Product API field mapping / channel eligibility | User brief | Owner clarification — track may belong to a parallel sprint | Owner triage |
| **A-2** `is_disable` + `status` kill-switch | User brief | Same as A-1 | Owner triage |
| **POS2-008 Phase 2 FE cleanup** (post-backend-ship) | POS2-008 plan + Jungle Trail QA §refactor note | Low — once backend ships, delete `toneMapper.js`, `restaurantRef.js`, `NotificationContext.jsx:115-126` override block | Backend ships Phase 2 contract |
| **CR-013 Bean Me Up double-count** (independent track, NOT a POS2 sprint item) | Mentioned for completeness — see `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §4 | High — only customer-visible production bug; owner picks Option A/B/C/D | Owner picks Option |

> **A-1 / A-2 caveat:** these were not produced as on-disk artefacts during this sprint thread. If they belong to a parallel product-API track, recommend opening separate impact-analysis docs before adding them to a POS2.x consolidation.

---

## 9. Post-acceptance final-doc update candidates

These edits to `/app/memory/final/*` are **not required for closure** — they are hygiene additions to keep baseline truth aligned. Owner-gated per Final Acceptance §11.

| Candidate | Target file | Edit |
|---|---|---|
| Add `printerAgents` to `RestaurantContext` exposed-field list (POS2-003 introduced this) | `MODULE_DECISIONS_FINAL.md` Module 11 / 12 | One-line addition under "RestaurantContext exposed shape" |
| Note that `STATUS_COLUMNS` no longer includes `id:8` (POS2-005) and the corresponding routing rule (status-8 → Hold tab) | `ARCHITECTURE_DECISIONS_FINAL.md` dashboard hotspots / status hierarchy | Short note under "f_order_status enum mapping" |
| When POS2-008 Phase 2 ships, document the tone-token canonical contract owned by backend | `MODULE_DECISIONS_FINAL.md` notification module | Add tone-source-of-truth row + remove the implicit FE-default reference |
| If POS2-002 Phase 4 ships (R-POPOUT), document the YTC pop-out auto-redirect path | `ARCHITECTURE_DECISIONS_FINAL.md` socket / dashboard | New subsection under "Socket-driven dashboard navigation" |

> Per the playbook, none of the above is mandatory now. Owner can batch them at the next final-doc review window.

---

## 10. Recommended closure order

```
PHASE 1 — Today's owner closure batch (no fixtures required)
  1. POS2-007 Phase 1   → owner signs off on FE override
  2. POS2-003 main       → owner reviews Addendum 2 → close
  3. POS2-005 main       → owner accepts code-walk + structural runtime → close
  4. POS2-004            → close as superseded by POS2-005

PHASE 2 — Owner smoke on agent-configured tenant (single tenant fixture)
  5. POS2-003-FU-02      → smoke + close
  6. POS2-003-REOPEN-A   → smoke + close

PHASE 3 — Owner decision batch (no implementation gated)
  7. POS2-005-FU §B PG filter cross-tab          → keep as-is OR spawn POS2-006-PG-PAID-ONLY
  8. POS2-006 confirmOrderTone                   → answer OW-Q1 / OQ-2 / OQ-4
  9. POS2-002 Order origin / Scan&Order           → answer OQ-1 / OQ-3 / OQ-6
  10. POS2-001 Delivery charge / GST / web lock  → confirm whether still open

PHASE 4 — Backend dependency releases
  11. POS2-003-REOPEN-B   → resume after BC-5 + BC-6 close
  12. POS2-008 Phase 2    → resume after BE ships tone token contract

PHASE 5 — Out-of-sprint hygiene (when bandwidth allows)
  13. Final-doc updates per §9 (owner-gated)
  14. POS2-008 Phase 1 cleanup (after Phase 2 ships)
```

---

## 11. Owner action checklist

> Single-paste checklist for the owner. Each row is independent.

- [ ] **POS2-007 Phase 1** — sign off (FE override approved). Optional: schedule admin-flip exercise.
- [ ] **POS2-003 main** — review QA Addendum 2 (v1 vs v2 wire compatibility) → mark accepted.
- [ ] **POS2-005 main** — review code-walk + Jungle Trail negative-path → mark accepted. Optional: replay TC-005-01..06 when a status-8 row exists.
- [ ] **POS2-004** — confirm: close as superseded by POS2-005 (no separate CR).
- [ ] **POS2-003-FU-02** — smoke OrderEntry-header "Print Bill" + postpaid auto-print on a tenant with non-empty `print_agent`. If BILL agent on wire → mark `fu_02_resolved`.
- [ ] **POS2-003-REOPEN-A** — smoke update / cancel-item / cancel-order on the same agent-configured tenant. If `printer_agent` content matches §4 of the wire-level QA report → mark closed.
- [ ] **POS2-005-FU §B** — decide: keep PG filter cross-tab (current) OR scope to Paid tab only (spawn POS2-006-PG-PAID-ONLY).
- [ ] **POS2-006 confirmOrderTone** — answer OW-Q1 (override hierarchy), OQ-2 (default tone token mapping table), OQ-4 (additional tone keys).
- [ ] **POS2-002 Order origin** — answer OQ-1 (R-POPOUT scope), OQ-3 (filter pill vs badge vs both), OQ-6 (web confirm-order status code).
- [ ] **POS2-003-REOPEN-B** — clarify BC-5 (was v1 mechanical-only) + request backend wire-diff between v1 / v2 (BC-6).
- [ ] **POS2-001** — confirm whether still open as a separate item or absorbed by CR-013 / CR-008 D1-Cap.
- [ ] **A-1 / A-2** — confirm sprint placement: same POS2.0 sprint or separate product-API track.
- [ ] **CR-013 Bean Me Up** (independent of POS2 sprint) — pick Option A / B / C / D for the printed-bill double-count.

---

## 12. Agent action checklist

(Items the next agent should pick up post-owner-closure-batch.)

- [ ] After POS2-005 closure → optional: add the one-line note under `ARCHITECTURE_DECISIONS_FINAL.md` for status-8 routing (owner-gated; see §9).
- [ ] After POS2-008 backend ships → execute Phase 1 cleanup (delete `toneMapper.js`, `restaurantRef.js`, override block in `NotificationContext.jsx:115-126`, `useEffect` ref-bridge in `RestaurantContext.jsx:18-21`).
- [ ] After POS2-006 owner decisions land → produce `impact_analysis/POS2_006_CONFIRM_ORDER_TONE_PLAN.md` and proceed to implementation plan.
- [ ] After POS2-002 owner decisions land → produce `implementation_plans/POS2_002_ORDER_FROM_WEB_PIPELINE_PLAN.md` Phases 1–4.
- [ ] After REOPEN-B BC-5 + BC-6 close → 1-line endpoint flip at `constants.js:41` + regression suite + endpoint sanity test update.
- [ ] When test-data fixture is generated for status-8 → re-run TC-005-01..06 on Jungle Trail and append screenshots to `POS2_005_POS2_007_JUNGLE_TRAIL_QA_REPORT_2026_05_09.md`.

---

## 13. Risks / loose ends

| ID | Risk | Severity | Mitigation in place |
|---|---|---|---|
| R-1 | Owner closure of POS2-003-FU-02 / REOPEN-A blocked by no agent-configured tenant ever surfacing | Medium | Both items have wire-level integration evidence. Static guarantees stand; closure can be granted on integration QA alone if owner accepts the workaround. |
| R-2 | POS2-007 Phase 1 stays in production longer than intended (Phase 2 backend bandwidth uncertain) | Low | The override is documented as transient; cleanup steps are pre-written. No correctness risk. |
| R-3 | POS2-005 + POS2-005-FU §A predicate at `OrderTable.jsx:243-260` could regress if a future CR widens `tabId === 'hold'` selection | Low | Predicate is single-line, well-commented; Jungle Trail QA TC-005-04 / TC-005-05 protects the contract for status-8 vs status-9 difference. |
| R-4 | POS2-003-REOPEN-A regression baselines (`toEqual` strict shapes) may break on next additive payload change | Low | Pattern is now established; future agents should use `toMatchObject` for additive-tolerant assertions. |
| R-5 | A-1 / A-2 ambiguity — sprint inclusion vs separate track | Medium | Flagged in §3 row 15-16 + §11 owner checklist. No FE work blocked; only documentation alignment. |
| R-6 | Owner confusion between FU-02 (the original `printer_agent: []` bug from the OrderEntry-header Print Bill button) and REOPEN-A (new `printer_agent` injection on update / cancel) | Low | Distinct test files, distinct QA reports, distinct flows. This consolidation report calls them out separately in every table. |
| R-7 | CR-013 Bean Me Up double-count (independent track) is the only customer-visible bug; not in POS2 sprint scope | Out-of-scope but flagged | Bean Me Up Option A/B/C/D pending owner decision; owner action checklist row 13. |

---

## 14. Final recommendation

> ## **`ready_for_owner_closure_review`**

The POS2.0 sprint has reached a stable consolidation milestone:

- 4 CRs (POS2-003 main, POS2-003-FU-02, POS2-003-REOPEN-A, POS2-005, POS2-007 Phase 1) are implementation-complete with QA verdicts ranging from `PASS — ready for owner sign-off` to `qa_pass_ready_for_manual_live_validation`. Owner can close all 4 today (Phase 1 of §10).
- 2 CRs (POS2-003-REOPEN-B, POS2-008 Phase 2) are correctly parked behind explicit gates (owner reason / BE behavioural-parity / BE bandwidth).
- 4 items (POS2-002, POS2-006, POS2-005-FU §B, POS2-001) are blocked on owner decisions only — no FE work pending.
- 2 items (A-1, A-2) need sprint-placement clarification before any work begins.
- Aggregate test posture is healthy: 23/23 suites · 291/291 unit tests pass; production build clean.
- The Bean Me Up customer-visible double-count remains the only burning issue and is **outside** the POS2 sprint envelope.

This consolidation does NOT close any item on its own. Closure rests with the owner's sign-off batch (§11 checklist).

---

— End of POS2.0 Sprint Consolidation Report 2026-05-09 —
