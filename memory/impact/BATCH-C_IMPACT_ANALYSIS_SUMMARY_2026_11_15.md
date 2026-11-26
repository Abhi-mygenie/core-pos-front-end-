# BATCH-C — Impact Analysis Summary (Gate 2) — 2026-11-15

> **STATUS: GATE 2 IA COMPLETE 2026-11-15.** 4 P0 IA docs written + 2 investigations closed. Backend brief written for CR-524 (Gyan). Open ODs: OD-528-A/B/C (column spec, cancel scope, export) — ask in next round (≤5 questions). Registries synced. Next: OD-528 round → Gate 3.

> **REVISION 2026-11-15 (write probe + owner round 2):** CR-503 = Hold + Credit rows, no right check (CR-515 no longer blocks). CR-528 = fully BACKEND-BLOCKED (bill print not recorded); OD-528-A/B/C/D answered. CR-524 = per-item punch time, split-line + timezone rules added. Evidence: `evidence/BATCH-C-IA/probes_2026_11_15_write/WRITE_PROBE_FINDINGS_2026_11_15.md`. Remaining open: OD-503-06 (what Collect means on already-paid TAB rows).

> **STATUS 2026-11-15 (latest): GATE 2 PAUSED — NOT FROZEN.** Parked until main agent / owner decide next steps. Final: BUG-675 only. Waiting owner data: CR-503 (Credit Collect screenshots, Hold order), CR-505 (no-filter breakdown check), CR-510 (aggregator order). Waiting backend: CR-524, CR-528. Backend brief = DRAFT, send after freeze.

> **ROUND 3 2026-11-15:** see `BATCH-C_GATE2_OWNER_ROUND3_2026_11_15.md`. CR-510 "covered by BUG-601" claim CORRECTED (BUG-601 = menu save, not orders) → NEEDS VERIFY. CR-505 needs no-filter breakdown check. IA not frozen: waiting owner data (Hold/Credit orders, screenshots, aggregator order). Backend brief stays DRAFT until freeze.

> **ROUND 4 (contracts session, 2026-11-15): OD-503-06 RESOLVED — Collect button is for Pay Later rows only; Credit/TAB rows show Unpaid button (CR-526, Batch B); paid TAB rows do not appear in Order Beta. Hold status code (fos 8 vs 9) deferred to Gate 3. CR-510 investigation put on hold by owner. CR-505 preprod check pending owner confirmation. STATUS: NEAR-FROZEN — only CR-505 verify outstanding before IA can freeze.**

> **GATE 2 FROZEN 2026-11-15 (round 4).** CR-505 CLOSED from preprod screenshot: Pay Type dropdown All/cancel/card/cash/upi only; no per-mode breakdown without filter → confirmed covered by BUG-645. CR-510 investigation deferred by owner. Hold tab confirmed in Order Beta. Backend brief: send to Gyan now. DRAFT contracts: write for CR-524 and CR-528.

Role: PLANNING (Gate 2 only). Owner GO: "Task: Run Gate 2 Impact Analysis for Batch C" (2026-11-15).
Scope: 4 P0 items + 2 investigations. Zero source code changes. Gate 3 NOT started.
Probe account: CAFE 103 (RID 644), credentials via secure card, session-only. Read-only probes only.

---

## Probe evidence index — `/app/memory/evidence/BATCH-C-IA/probes_2026_11_15/`

| File | What it proves |
|------|---------------|
| 01c_cr524_items_full.txt | `created_at` MISSING from insights-cancellations API; `cancel_time` HH:MM only |
| 02f_cr528_ops_detail.txt | `order_edit` operation type exists; `print_bill_status` field exists |
| 02g_cr528_orders_table_full.txt | Full `orders_table` schema; no `bill_printed_at` timestamp |
| 03b_cr503_tab_full.txt | Full TAB row schema; fos=6 (settled); `payment_method_raw: tab` |

---

## Code reality (Step 0) — HEAD (current)

| Item | Code reality | Key code fact |
|------|-------------|--------------|
| BUG-675 | FULL | SettlementPanel.jsx L249 `sub={<span>Total sale: ₹X</span>}`; SettlementPage.jsx L224 same |
| CR-524 | PARTIAL | `createdAt: i.created_at \|\| ''` mapped in CancellationsMockup but API never sends `created_at` |
| CR-503 | NONE | No Collect/Print buttons for TAB rows in OrderReportBetaPage; CollectBillPanelDrawer exists in Audit page but not imported in Beta |
| CR-528 | NONE | No post-bill-print section in AllOrdersReportPage; `operations` and `print_bill_status` not mapped in reportTransform |

---

## Conflict pre-check

| Item | Conflict | Detail |
|------|---------|--------|
| BUG-675 | CLEAR | No open items on SettlementPanel or SettlementPage |
| CR-524 | CLEAR | No open items on CancellationsMockup.jsx |
| CR-503 | RELATED | CR-515 (Batch A, Gate 2 IA done): `order_unpaid` right gates Collect button. Option A: coordinate CR-503 + CR-515 in same Gate 3 plan |
| CR-528 | HIGH | AllOrdersReportPage open items: BUG-671, CR-526, CR-542 (Batch B, Gate 3 not started). Gate 3 for CR-528 must re-verify line anchors at HEAD after Batch B lands |

---

## Item docs

| Item | Doc | Risk | Backend-blocked? | Gate 3 ODs |
|------|-----|------|-----------------|-----------|
| BUG-675 | `BUG-675_IMPACT_ANALYSIS.md` | LOW | NO | None — ready now |
| CR-524 | `CR-524_IMPACT_ANALYSIS.md` | LOW (FE) | YES — `created_at` absent from API | None — waiting backend |
| CR-503 | `CR-503_IMPACT_ANALYSIS.md` | HIGH | NO | None — coordinate with CR-515 Gate 3 |
| CR-528 | `CR-528_IMPACT_ANALYSIS.md` | HIGH | PARTIAL — data exists; `bill_printed_at` missing | OD-528-A (columns), OD-528-B (cancel scope), OD-528-C (export) |

---

## Investigations closed

### CR-505 — Order Beta: Partial Payment Split + Totals

**Finding:** COVERED by BUG-645 (GATE_5B_QA_PASS 2026-11-08).

| Owner answer | BUG-645 coverage |
|---|---|
| 505-01 a: show order if has any cash part | Batch B B-1: filter includes partial rows where cash leg > 0 ✓ |
| 505-02 a: show cash part amount only | Batch B B-2/B-3/B-4: filtered row shows leg amount "(of ₹full)", totals sum leg amounts ✓ |

**Recommend:** CLOSE CR-505 as SUPERSEDED by BUG-645. Update registry.

---

### CR-510 — Aggregator Item Details (Variations/Add-ons in Drill-Down)

**Finding:** COVERED by existing code + BUG-601 (GATE_5B_QA_PASS).

Code check (`/app/frontend/src/components/reports/OrderDetailSheet.jsx` L337-405 `OrderItemCard`):
- `item.variations?.length > 0` → renders each variation with label + price ✓
- `item.addOns?.length > 0` → renders each add-on with name + price ✓
- Rendering code is universal (not aggregator-specific — applies to all order types) ✓
- BUG-601 (GATE_5B_QA_PASS): aggregator variations/addons no longer dropped on save → data now flows through to the detail view ✓

**Recommend:** CLOSE CR-510 as COVERED. One owner verification step: open an actual Swiggy/Zomato order on preprod → confirm variations and add-ons appear in the Order Details drill-down. If verified → CLOSED.

---

## Backend gaps (confirmed this session)

| Item | Gap | Endpoint | Assigned to |
|------|-----|----------|-------------|
| CR-524 | `created_at` (punch timestamp) missing from cancellation API | `insights-cancellations` | Gyan |
| CR-528 | `bill_printed_at` timestamp missing from order-logs-report | `order-logs-report` | Gyan |

Backend brief written: `backend_briefs/BACKEND_BRIEF_BATCH-C_2026_11_15.md`

---

## Owner decisions log (this session)

| OD | Decision |
|----|---------|
| ALL P0 items | Decisions already locked in BATCH_C_OWNER_DECISIONS_2026_11_14.md |
| OD-675 | Remove subtitle entirely; skip SettlementMockup (CR-372-B deletes it) |
| OD-503 | Collect = CollectBillPanelDrawer; Print Bill inside pop-up via `onPrintBill`; `order_unpaid` gate |
| OD-524 | Minutes integer; `created_at` = punch time; backend ask confirmed needed |
| OD-528 | Goes inside Audit report; columns/cancel-scope/export = OPEN (OD-528-A/B/C) |
| CR-505 | COVERED by BUG-645 → recommend CLOSE |
| CR-510 | COVERED by existing code + BUG-601 → recommend CLOSE (pending preprod verify) |

---

## Pending before Gate 3

**OD-528-A/B/C (3 questions, ask next round):**
1. Which columns in the post-print changes section? (Order ID, Table, Original amount, Modified amount, Editor name, Edit time — confirm or adjust)
2. Should post-print cancels include both order-level AND item-level cancels?
3. Date range filter and export (Excel/PDF) needed for this section?

**Backend reply needed:**
- CR-524: `created_at` in `insights-cancellations` items
- CR-528: `bill_printed_at` in `order-logs-report` orders_table

**Gate 3 sequencing:**
- BUG-675: Ready now — no open ODs, no backend dependency
- CR-503: Ready — coordinate with CR-515 Gate 3 (single combined plan)
- CR-524: Wait for backend reply
- CR-528: Wait for OD-528-A/B/C + backend reply on `bill_printed_at`

**Revised sequencing (round 2):** BUG-675 ready · CR-503 ready for Gate 3 (no CR-515 dependency; OD-503-06 in Gate 3 round) · CR-524 waits backend · CR-528 waits backend.

**GATE 2 CLOSED 2026-11-15** — all 4 P0 IAs written, 2 investigations closed, registries synced.
