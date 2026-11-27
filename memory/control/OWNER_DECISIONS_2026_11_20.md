# OWNER DECISIONS — 2026-11-20

## CR-559 — Web/Scan Accept: send printer_agent on confirm (imported; was CR-554 on external branch)
**Context:** Imported from `CR-554-investigation-to-impact.zip`. ID collided with this branch's CR-554
(cancellation-detail columns), so registered here as **CR-559**. Full investigation→Gate-2 bundle:
`change_requests/CR-559_ACCEPT_PRINTER_PARITY_import/`.

**Problem:** Accepting a web/scan "Awaiting Confirmation" order sent no `printer_agent`, so KOT/BILL
printing never fired on Accept (unlike Place/Update Order).

**Backend-locked decisions (from the bundle, OD-1/2/3):**
- OD-1 = **Option A (payload parity)** — confirm endpoint `waiter-dinein-order-status-update` accepts `printer_agent`.
- OD-2 = KOT station set: new web order = ALL items; web edit = ONLY food_status-7 items.
- OD-3 = append BILL agent unconditionally (CR-130 parity).
- Do NOT send `print_kot` (backend decides). Do NOT call `printOrder` after accept (double print). Web orders only.

**NEW owner decision — OD-4 (2026-11-20) = OPTION 1 (gate on the Scan-Order Auto-print setting):**
Accept must build/send `printer_agent` **only when the restaurant's "Scan Order Auto-print" toggle is ON**
(frontend `scanOrderAutoPrint`, backend `scan_order_auto_print`, under `settings_config.auto_printing`;
UI: Settings → Printer Config → Auto-print tab, testId `scan-order-auto-print-toggle`).
This mirrors how Place/Update Order gate on `printAllKOT` (= `settings.autoKot`). When the toggle is OFF,
Accept sends no printer details and nothing auto-prints (staff can still use the manual KOT button, CR-545/547).

**Implication / NEW sub-task (blocks build):** `scan_order_auto_print` is currently transformed only in the
printer-config settings screen (`printerAgentConfigTransform.js` → `scanOrderAutoPrint`), NOT in the runtime
restaurant object that the dashboard reads. So `profileTransform.js` must be extended to surface this flag
into `restaurant.settings` so `DashboardPage.handleConfirmOrder` can read it.

**Status:** CR-559 = GATE_2_IA_COMPLETE. **Gate-3 Implementation Plan must be REVISED** to (a) add the
`scanOrderAutoPrint` gate on the Accept path and (b) add the profileTransform exposure sub-task — before Gate-4 build.

---

## CR-559 — OD-5 (2026-11-20): Scan-Order Auto-print flag SOURCE (PROBE-1 result)
**Probe (live, owner@thegoankitchen.com):**
- `GET /api/v1/vendoremployee/profile` → `scan_order_auto_print` **ABSENT** (no `auto_printing`, no `settings_config`). Evidence: `evidence/CR-559/profile_response.json`.
- `GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config` → `settings_config.auto_printing.scan_order_auto_print = "Yes"` (present). Evidence: `evidence/CR-559/printer_agent_config_response.json`.

**Decision needed before Gate-4 build:**
- **Option A (recommended):** backend surfaces `scan_order_auto_print` at `restaurants[0]` root of the profile payload (parity with `print_kot`/`billing_auto_bill_print`); frontend maps it one line in `profileTransform`. Needs BACKEND_BRIEF_CR-559.
- **Option B (no-backend fallback):** frontend calls `printer-agent-config` once at load and merges `scanOrderAutoPrint` into `restaurant.settings`.

**Status:** CR-559 Gate-3 plan REVISED v2 at `plans/CR-559_IMPLEMENTATION_PLAN.md`. Blocked on OD-5 only.

---

## CR-559 — FINAL direction + GATE-3 GO (2026-11-20)
- **OD-1 SUPERSEDED:** no `printer_agent` on the confirm payload; confirm endpoint untouched.
- **OD-2 KEPT:** KOT stations = new web order → ALL items; web edit → food_status-7 (`isNotConfirmed`) items only.
- **OD-3 SUPERSEDED:** **KOT only** on Accept, **no BILL**.
- **OD-4 KEPT:** Accept KOT auto-print gated by `scanOrderAutoPrint` toggle.
- **OD-5 = Option A:** backend adds `scan_order_auto_print` at profile `restaurants[0]` root (brief: `backend_briefs/BACKEND_BRIEF_CR-559_2026-11-20.md`).
- **Mechanism:** Accept reuses the manual-KOT process (`printOrder('kot', ...)` → order-temp-store + update-print-status `kot_print:'Yes'`). Prior "no printOrder after accept" rule reversed (safe: backend auto-print suppressed + web-only + gated).
- **GATE-3 GO** given by owner. **Implementation deferred** until PRE-IMPL VALIDATION (profile probe shows `scan_order_auto_print`) passes. Plan: `plans/CR-559_IMPLEMENTATION_PLAN.md` (FINAL v3).

---

## CR-527 / BB-09 — Backend delivered + Gate-3 GO path (2026-11-20)
- **Backend handoff validated** (`backend_replies/CR-527_BB-09_FRONTEND_HANDOFF_2026-11-20.md`): `GET /api/v2/vendoremployee/pos/tap-customer-record-list` credit rows now return `diner_name` + `diner_mobile` (LOCKED contract names honoured).
- **OD-B-BB09 resolved:** `diner_mobile` is stored **plain text only** — NO customer creation, NO CRM link/sync side-effect. Owner's "diner mobile becomes a customer" concern does not occur.
- **Constraints:** historical rows return `null` (no backfill) → UI shows `—`; **production** requires the migration `2026_11_20_000001_add_diner_snapshot...` deployed to `manage.mygenie.online` before fields appear live.
- **FE plan (2 files):** `plans/CR-527_IMPLEMENTATION_PLAN.md` — map fields (E1/E2), Diner column (E3/E4), diner filter OD-527-C (E5). Awaiting Gate-4 GO.
- **SEPARATE OPEN ITEM (not CR-527):** prepaid amount discrepancy observed on preprod — restaurant **672**, order **1578984** (bill 000823): placement ₹127 but order **saved & credited ₹132.71**; postpaid order 1578985 correct at ₹127. Money-correctness issue → needs its own P1 bug intake.

---

## P0 UNBLOCK SEQUENCE — BUG-711 → BUG-671 → BUG-733 (2026-11-20) — STATUS: PROPOSED (awaiting owner approval)
**Decision:** before Cluster C, clear the two P0s + the shared-file blocker. Next agent verifies the findings, then works in this exact order once approved. Handover: `handover/SESSION_HANDOVER_2026-11-20_P0_UNBLOCK_SEQUENCE.md`.

**Verified findings (re-confirm at Step 0):**
- **BUG-711 (P0/CRITICAL)** — visible Reprint is ALREADY gated (`OrderReportBetaPage.jsx:780`). Real remaining gap = Collect-drawer print path (`handlePrintBillFromBeta` L423 → `CollectBillPanelDrawer` L929, no `print_icon` check) = CR-553. → verify + likely 1-line gate.
- **BUG-733 (P3)** — native `type="date"` exists in **~65 files**, not just Credit + Order Beta. Blanket swap = cross-cutting refactor. → build ONE reusable `<DateRangePicker>`, migrate ONLY the 2 flagged screens now.
- **BUG-671 (P0/HIGH)** — financial, Fast-Lane ineligible, needs a **backend answer** (can a partial/split order be reversed-to-unpaid; effect on the paid leg?). Longest lead time → start first/in parallel.

**Order:** (1) BUG-711 quick P0 win → (2) BUG-671 Gate-2 IA + backend brief in parallel → (3) BUG-733 shared picker + 2 screens. Then BUG-735 becomes a trivial split-row gating tweak, and Cluster C ships as the clean FE batch; Cluster G references the new picker.

**OD-P0-1 (BUG-733 scope) — RESOLVED 2026-11-20 = (a).** Migrate ONLY Credit + Order Beta now; full ~65-screen standardisation tracked as a SEPARATE UI-consistency effort. **No new component needed** — reuse the EXISTING `components/reports/DatePicker.jsx` (shadcn Calendar; already used by AllOrdersReportPage/RoomOrdersReportPage/OrderSummaryPage). Scope = swap native `<input type="date">` on OrderReportBetaPage (L553/556) + Credit screen for `<DatePicker>`. Note: the other ~63 screens use a 3rd style (native input + CalendarIcon dress-up) — out of scope here.
**OD-P0-2 (BUG-671 backend) — RESOLVED 2026-11-20 (reconfirmed by PLANNING):**
- **Q:** Is marking a partial/split order unpaid supported server-side, and what happens to the already-paid leg?
- **A: YES, supported — no new endpoint needed.** The existing `POST /api/v2/vendoremployee/make-order-unpaid {order_id}` handles split orders. Verified by **live probe 2026-11-14 (cafe103)** on split orders (cash 220 + upi 200 → `partial`): response **200**, `partial_payments_deleted: 2`, `waiter_collections_deleted: 2`, order → **status 5 (unpaid/running)**. Evidence cited in `impact/BUG-671_IMPACT_ANALYSIS.md` §Probe.
- **Effect on the already-paid leg:** the **whole bill reverts to unpaid** — the backend **deletes/reverses every paid leg** (both partial-payment records + both waiter-collection entries); settlement/report numbers adjust server-side (same as single-method unpaid). Harmless residue: a stale `transaction_id` stays on the now-unpaid row and is overwritten on re-pay.
- **Backend-blocked: NO.** BUG-671 needs no backend change (Backend Brief BATCH-B confirms "FE can ship without backend? YES / Backend IDs: —"). The BB-02/BB-03 settled-day block is a SEPARATE scope under **CR-526**, not BUG-671.
- **Implementation status: DONE in FE** — `components/reports/OrderTable.jsx` L249 `UNPAID_ALLOWED_METHODS=['cash','card','upi','partial']`; Change Method still excludes `partial` (Phase 2, per OD-671-A).
- **⚠ Caveat (not fully "tested"):** Nov-sprint QA was **BLOCKED by BUG-685** (place-order crash prevented creating a self-made split order), so the split→Unpaid click was **never executed**. Status = **RETEST pending**. So: backend-confirmed + FE-implemented, but end-to-end QA on a real split order is still outstanding.
- **Net:** Step 2 is **unblocked** — no backend wait. Remaining work for BUG-671 = QA retest only.
**Shared-file lock:** `OrderReportBetaPage.jsx` is touched by BUG-711/671/733/735 + all of Cluster C → one owner-session/PR at a time (line-ranges are disjoint).

---

## Cluster C — OD-728-01 PARKED 2026-11-20 (owner)
**Decision:** Owner parked **BUG-728** (Cancelled KPI whole-range vs Cancelled-tab row count; day-header Revenue/Sales/Discount whole-day vs active-tab filtered). OD-728-01 (A/B/C) left **unanswered — deferred**. No code for BUG-728 until un-parked.
**Not blocking the rest:** Cluster C **Gate 3 is CLOSED** for BUG-724/725/726/727/737 — those proceed to Gate 4 GO independently. Analysis + provisional edits for BUG-728 are preserved in `plans/CLUSTER_C_IMPLEMENTATION_PLAN_2026_11_20.md` (marked PARKED) and the IA. Registry: BUG-728 gate=PARKED, parked=true.

---

## BUG-733 — OD-733-01 RESOLVED 2026-11-20 = (a) (date-input swap to shadcn DatePicker)
**Context:** PLANNING Gate 2 + Gate 3 done (`impact/BUG-733_IMPACT_ANALYSIS.md`, `plans/BUG-733_IMPLEMENTATION_PLAN.md`). Reuse existing `components/reports/DatePicker.jsx`; swap native `<input type="date">` on `OrderReportBetaPage` (L553/556) + `CreditCustomerDetailSheet` (L448/457). Format-identical `YYYY-MM-DD` → no report-fetch / client-filter change.

**How other reports manage the date (code-checked):** the 3 existing DatePicker consumers — `AllOrdersReportPage` (L158), `RoomOrdersReportPage` (L331), `OrderSummaryPage` (L27) — all use a SINGLE date seeded to `today()`, never empty, with NO Clear button and NO range. So the empty-value edge never arises there; chevrons are always safe. Order Beta already matches that (from/to seeded `today()`). The **Credit sheet is the only screen with an optional/clearable range** (`dateFrom/dateTo=''` = unbounded + Clear button), which no existing report models — the reason OD-733-01 was raised.

**OD-733-01 = (a) — owner approved:** keep the Credit **Clear** button (empty = unbounded, renders as "Select date"); add a 2-line guard to `DatePicker` prev/next-day handlers so clicking a chevron on an empty value is a no-op (prevents `NaN-NaN-NaN`). Backward-compatible for the 3 seeded consumers (never empty). 

**Status:** BUG-733 = GATE_3_PLAN_COMPLETE. **OD-733-01 closed = (a).** Only **Gate 4 GO** remains before IMPLEMENTATION. Shared-file lock on `OrderReportBetaPage.jsx` (711/671/735/Cluster C) — land in the single locked session; edits L553-557 are line-disjoint.
