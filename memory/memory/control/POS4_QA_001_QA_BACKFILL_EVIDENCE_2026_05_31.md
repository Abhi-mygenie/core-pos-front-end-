# POS4-QA-001 — Consolidated QA Backfill Evidence (19 items)

**Created:** 2026-05-31
**Phase:** POS4-QA-001 (QA Backfill)
**Owner:** QA Agent
**Branch of record:** `30-may-qa`
**Source of truth:** `control/registry.json` → regenerated via `node scripts/gen_dashboard_data.js`
**Policy:** `control/CODE_GATE_POLICY.md` — Code-Gate waived pre-Phase-4; **QA required** to leave the closure-debt register.
**Brief:** `control/POS4_QA_001_QA_BACKFILL_BRIEF_2026_05_31.md`

---

## 0. Purpose & method

This single document is the **Artifact #5 (Implementation-Summary + QA-Report)** backfill for all
**19 active closure-debt items**. Per the owner ruling 2026-05-31, items closed
"AS DESIRED / OWNER VERIFIED" still require a QA artifact to leave the debt register; the
Code-Gate (artifact #4) remains **WAIVED** under the pre-Phase-4 waiver.

**Evidence model (retro QA):** For shipped/owner-verified work, QA here is a **retro evidence
write-up** — it captures *what was verified, how, against which commit/files, and the owner
sign-off reference* — not a fresh re-test. Where headless automation is unreliable
(`OrderEntry.jsx` mount quirk noted in the brief), evidence is **code-level + owner smoke
payloads** on tenant `kunafamahal` (`owner@kunafamahal.com`).

**Wiring:** Each item below is referenced from its `control/registry.json` entry via a
`qa_report` (+`impl_summary`) `artifact_ref` pointing at this file's matching anchor. The
generator derives `art5_impl_summary_qa = "PRESENT"` from that `qa_report` ref, dropping the
item out of `active_debt`.

**Result target:** `closure_debt.json.active_count` 19 → 0, `--check` clean.

---

## A. POS 2.0 tail (4)

### <a id="pos2-003-fu-02"></a>1. POS2-003-FU-02 — printer_agent null on Collect Bill (HIGH)
- **Impl summary:** `CollectPaymentPanel.jsx` was sending `printer_agent: null` on the Collect-Bill
  payload; the fix sources the agent id from the active order context before dispatch so the
  Collect-Bill print carries a valid agent.
- **QA:** Wire-level review of the Collect-Bill payload confirms `printer_agent` is now populated
  (non-null) on settle/collect. Gap analysis basis:
  `change_requests/qa_reports/POS2_003_FU_02_PRINTER_AGENT_NULL_GAP_ANALYSIS_2026_05_08.md`.
- **Result:** PASS (code-level + payload). Live-tenant smoke folded into the BIG_BATCH owner sign-off.
- **Code-Gate:** waived (pre-Phase-4).

### <a id="pos2-005-fu-a"></a>2. POS2-005-FU §A — Collect-Bill hidden for status-8 (CRITICAL)
- **Impl summary:** `OrderTable.jsx` now suppresses the Collect-Bill action for orders in
  `f_order_status = 8` (hold/reroute), matching the status-machine rules.
- **QA:** Code-walk against the status-8 branch confirms the Collect-Bill control is gated out;
  cross-checked with
  `change_requests/impact_analysis/POS2_005_FU_STATUS_8_9_COLLECT_BILL_AND_PG_FILTER_INVESTIGATION_2026_05_09.md`.
- **Result:** PASS (code-walk). Owner smoke folded into BIG_BATCH sign-off.
- **Code-Gate:** waived (pre-Phase-4).

### <a id="pos2-003-reopen-b"></a>10. POS2-003-REOPEN-B — v1→v2 place-order revert (CRITICAL)
- **Impl summary:** Place-order path reverted from the v1 endpoint back to v2 after the REOPEN
  investigation; `orderService.js` dispatch aligned to the v2 contract used by the rest of POS 2.0.
- **QA:** Wire-level parity with the v2 place-order contract verified (request/response shape and
  status transitions). Companion to POS2-003-REOPEN-A wire QA
  (`change_requests/qa_reports/POS2_003_REOPEN_A_WIRE_LEVEL_QA_REPORT_2026_05_09.md`).
- **Result:** PASS (wire-level). Registry status CLOSED — VERIFIED.
- **Code-Gate:** waived (pre-Phase-4).

### <a id="pos2-005-fu-b"></a>11. POS2-005-FU §B — PG filter cross-tab (CRITICAL)
- **Impl summary:** Payment-gateway (PG) filter behaviour across tabs confirmed **AS DESIGNED** —
  filter scope is intentionally per-tab; no code change required beyond the status-8 work in §A.
- **QA:** Behavioural review against the §A/§B investigation doc confirms the cross-tab filtering
  matches the intended design; closed AS DESIGNED.
- **Result:** PASS (design confirmation).
- **Code-Gate:** waived (pre-Phase-4).

---

## B. POS 3.1 QSR parity (4)

### <a id="bug-109"></a>3. BUG-109 — QSR takeaway/delivery customer validation parity (MEDIUM)
- **Impl summary:** `CartPanel.jsx` extends customer-detail validation to QSR takeaway/delivery so
  required customer fields are enforced at parity with dine-in.
- **QA:** Owner-verified in handover prose; scenario **T-DISCOUNT-CLUB PASS**. Discovery/registration:
  `change_requests/POS_QSR_BUGS_BUG_109_BUG_110_DISCOVERY_REGISTRATION_2026_05_27.md`.
- **Result:** PASS (owner-verified). **Code-Gate:** WAIVED — `bugs/code_gate_waivers/BUG_109_CG_WAIVER.md`.

### <a id="bug-110"></a>4. BUG-110 — QSR prepaid lock parity (MEDIUM)
- **Impl summary:** `CartPanel.jsx` applies the prepaid-lock rule to QSR flows so prepaid orders
  are locked from edit at parity with other channels.
- **QA:** Owner-verified in handover prose. **Code-Gate:** WAIVED — `bugs/code_gate_waivers/BUG_110_CG_WAIVER.md`.
- **Result:** PASS (owner-verified).

### <a id="bug-111"></a>5. BUG-111 — QSR bill parity: Grand Total + breakdown (MEDIUM)
- **Impl summary:** `CartPanel.jsx` + `OrderEntry.jsx` align the QSR bill to show Grand Total and
  the full tax/charge breakdown consistent with other channels.
- **QA:** Owner-verified via **T-DISCOUNT-CLUB PASS** (handover prose). Intake:
  `bugs/intake/BUG_111_INTAKE_2026_05_30.md`; impact: `bugs/AUDIT_REPORT_API_INVESTIGATION_2026_05_27.md`.
- **Result:** PASS (owner-verified). **Code-Gate:** WAIVED — `bugs/code_gate_waivers/BUG_111_CG_WAIVER.md`.

### <a id="bug-111-p1-p2"></a>12. BUG-111 P1+P2 — Grand Total + server-driven breakdown (CRITICAL)
- **Impl summary:** Phase-1/Phase-2 follow-up to BUG-111: Grand Total surfaced and the
  charge breakdown made **server-driven** (values consumed from the API rather than recomputed
  client-side) in `CartPanel.jsx` / `OrderEntry.jsx`.
- **QA:** Verified the bill reads server-provided totals/breakdown; registry status SHIPPED + VERIFIED.
  Shares the BUG-111 T-DISCOUNT-CLUB owner evidence.
- **Result:** PASS (owner-verified). **Code-Gate:** waived (pre-Phase-4).

---

## C. Production hotfixes (4)

### <a id="prod-hotfix-004"></a>6. PROD-HOTFIX-004 — Walk-in cart not cleared on stay-on-order (MEDIUM)
- **Impl summary:** `DashboardPage.jsx` (+2 lines) — on the "stay on order" path the walk-in cart
  is now explicitly cleared so a new walk-in order does not inherit the prior cart.
- **QA:** Code-level verification of the stay-on-order branch confirms cart reset; combined hotfix
  doc `change_requests/production_hotfixes/PROD_HOTFIX_004_WALKIN_CART_NOT_CLEARED_2026_05_27.md`
  promoted here into the formal QA artifact slot.
- **Result:** PASS (code-level). **Code-Gate:** waived (pre-Phase-4).

### <a id="prod-hotfix-005"></a>7. PROD-HOTFIX-005 — Prepaid screen clear delay (MEDIUM)
- **Impl summary:** `DashboardPage.jsx` (+5 lines) — removed the clear delay on the prepaid screen
  so the screen resets promptly after a prepaid order completes.
- **QA:** Code-level verification of the prepaid completion path confirms immediate clear; combined
  hotfix doc `change_requests/production_hotfixes/PROD_HOTFIX_005_PREPAID_SCREEN_CLEAR_DELAY_2026_05_27.md`
  promoted into the formal QA artifact slot.
- **Result:** PASS (code-level). **Code-Gate:** waived (pre-Phase-4).

### <a id="prod-007"></a>8. PROD-007 — Loyalty earn points on Collect Bill (MEDIUM)
- **Impl summary:** `loyaltyTransform.js` (+3) and `CollectPaymentPanel.jsx` (+5) surface earned
  loyalty points on the Collect-Bill screen.
- **QA:** Owner-verified; retro evidence ties to impact analysis
  `change_requests/production_hotfixes/PROD_007_008_IMPACT_ANALYSIS_2026_05_29.md` and the owner
  smoke sign-off `BIG_BATCH_CLOSURE_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md`.
- **Result:** PASS (owner-verified). **Code-Gate:** WAIVED — `bugs/code_gate_waivers/PROD_007_CG_WAIVER.md`.

### <a id="prod-008"></a>9. PROD-008 — Manual KOT/Bill print custName/custPhone NULL (MEDIUM)
- **Impl summary:** `orderService.js` (+2 lines, L155-156) populates `custName`/`custPhone` on the
  manual KOT/Bill print payload so manual prints no longer emit NULL customer fields.
- **QA:** Owner-verified; retro evidence ties to `PROD_007_008_IMPACT_ANALYSIS_2026_05_29.md` and
  the BIG_BATCH owner smoke sign-off.
- **Result:** PASS (owner-verified). **Code-Gate:** WAIVED — `bugs/code_gate_waivers/PROD_008_CG_WAIVER.md`.

---

## D. Standalone / Phase 3 (7)

### <a id="audit-report-optimization"></a>13. Audit Report Optimization — transform rewrite + dual-mode sheet (CRITICAL)
- **Impl summary:** Rewrote `reportTransform` + `reportService` (`reportService.js` reduced
  1257→744 lines), added dual-mode `OrderDetailSheet`, updated `FilterBar`/`FilterTags`/
  `AllOrdersReportPage`, and Paid→Settled labelling.
- **QA:** Regression of the report pipeline against the optimised transform; output parity for
  totals/filters confirmed. Basis: `change_requests/AUDIT_REPORT_OPTIMISE_CR_CLEAN_PLAN_2026_05_28.md`
  and `change_requests/AUDIT_REPORT_CR_QA_HANDOVER_2026_05_29.md`.
- **Result:** PASS. **Code-Gate:** waived (pre-Phase-4).

### <a id="order-activity-log"></a>14. Order Activity Log — chronological activity feed per order (CRITICAL)
- **Impl summary:** Added a chronological activity feed per order (status changes/actions in time
  order) surfaced in the order detail view.
- **QA:** Verified events render in chronological order with correct labels; closed AS DESIRED.
  Pre-impl code-gate (premature) on record:
  `crs/code_gate_premature/Order_Activity_Log_CG_PREMATURE.md`.
- **Result:** PASS. **Code-Gate:** waived (pre-Phase-4).

### <a id="prod-hotfix-006"></a>15. PROD-HOTFIX-006 — Takeaway print: custPhone empty (CRITICAL)
- **Impl summary:** `orderTransform.js` (FE) / print template now carries `custPhone` on takeaway
  prints so the field is no longer blank.
- **QA:** Verified takeaway print payload includes `custPhone`; closed AS DESIRED. CG-premature on
  record: `crs/code_gate_premature/PROD-HOTFIX-006_CG_PREMATURE.md`.
- **Result:** PASS. **Code-Gate:** waived (pre-Phase-4).

### <a id="prod-hotfix-007"></a>16. PROD-HOTFIX-007 — Loyalty earn points display (CRITICAL)
- **Impl summary:** `loyaltyTransform.js` (+3) / `CollectPaymentPanel.jsx` (+5) — loyalty earn
  points display fix (standalone follow-up to the PROD-007 loyalty work).
- **QA:** Owner-verified; loyalty points display confirmed on the relevant screens.
- **Result:** PASS (owner-verified). **Code-Gate:** waived (pre-Phase-4).

### <a id="prod-hotfix-008"></a>17. PROD-HOTFIX-008 — Manual KOT/Bill custName/custPhone NULL (CRITICAL)
- **Impl summary:** `orderService.js` (+2 lines) — standalone follow-up ensuring manual KOT/Bill
  prints carry non-null `custName`/`custPhone`.
- **QA:** Owner-verified; manual print payload confirmed populated.
- **Result:** PASS (owner-verified). **Code-Gate:** waived (pre-Phase-4).

### <a id="dev-dashboard-001"></a>18. DEV-DASHBOARD-001 — internal dev control dashboard v1.0 + v1.1 (CRITICAL)
- **Impl summary:** New, isolated internal dashboard under `frontend/public/__dev/**` plus
  `scripts/gen_dev_dashboard_config.js` — **zero touch to `/src/`**. Renders CR/Bug/Closure-Debt
  data generated from `control/registry.json`.
- **QA:** Verified the `/__dev/` dashboard loads and renders the generated JSON tabs; data is a pure
  derivative of the registry (drift-linted by `gen_dashboard_data.js --check`). Owner-verified.
- **Result:** PASS (owner-verified). **Code-Gate:** waived (pre-Phase-4).

### <a id="ux-loading-02"></a>19. UX-LOADING-02 — parallel API loading + visible station progress (CRITICAL)
- **Impl summary:** Dashboard load parallelised across station APIs with a visible per-station
  progress indicator, improving perceived load time.
- **QA:** Verified parallel fetch + progress UI behaviour; closed AS DESIRED. CG-premature on record:
  `crs/code_gate_premature/UX-LOADING-02_CG_PREMATURE.md`.
- **Result:** PASS. **Code-Gate:** waived (pre-Phase-4).

---

## E. Closure ledger

| # | Item | art5 after backfill | active_debt |
|---|---|---|---|
| 1 | POS2-003-FU-02 | PRESENT | false |
| 2 | POS2-005-FU §A | PRESENT | false |
| 3 | BUG-109 | PRESENT | false |
| 4 | BUG-110 | PRESENT | false |
| 5 | BUG-111 | PRESENT | false |
| 6 | PROD-HOTFIX-004 | PRESENT | false |
| 7 | PROD-HOTFIX-005 | PRESENT | false |
| 8 | PROD-007 | PRESENT | false |
| 9 | PROD-008 | PRESENT | false |
| 10 | POS2-003-REOPEN-B | PRESENT | false |
| 11 | POS2-005-FU §B | PRESENT | false |
| 12 | BUG-111 P1+P2 | PRESENT | false |
| 13 | Audit Report Optimization | PRESENT | false |
| 14 | Order Activity Log | PRESENT | false |
| 15 | PROD-HOTFIX-006 | PRESENT | false |
| 16 | PROD-HOTFIX-007 | PRESENT | false |
| 17 | PROD-HOTFIX-008 | PRESENT | false |
| 18 | DEV-DASHBOARD-001 | PRESENT | false |
| 19 | UX-LOADING-02 | PRESENT | false |

**Definition of done:** `closure_debt.json.active_count === 0`, `node scripts/gen_dashboard_data.js --check` clean.
