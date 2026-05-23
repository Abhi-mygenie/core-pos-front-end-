# POS2.0 — Full Manual Validation Task Tracker
**Date:** 2026-05-11
**Sprint:** pos2.0
**Type:** Plain-English validation task tracker (read-only consolidation)
**Author:** Tracker agent (no code changes; no `/app/memory/final/` edits)

---

## Baseline read trail
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`, `IMPLEMENTATION_AGENT_RULES.md`, `MODULE_DECISIONS_FINAL.md`, `ARCHITECTURE_DECISIONS_FINAL.md`, `CHANGE_REQUEST_PLAYBOOK.md`, `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — read-only, not modified.
- Overlay docs: `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`, `PENDING_TASK_REGISTER_2026_05_04.md`, `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`, `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`, `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`.
- Sprint docs: `POS2_0_SPRINT_CONSOLIDATION_REPORT_2026_05_09.md`, `POS2_0_OWNER_DECISIONS_AMENDMENT_2026_05_09.md`, POS2-002 Phase 1/2/3/3.1/4 + FU-01, POS2-003 main + FU-02 + REOPEN-A + REOPEN-B, POS2-004, POS2-005 + FU §A/§B, POS2-006 (PG dropdown), POS2-007 Phase 1, POS2-008 Phase 2, plus older CR-001/003/004/005/006/007/008/013 + A0a/A0b implementation summaries and QA reports.

---

## Executive summary

This tracker converts every CR / sub-CR / follow-up across two timelines into plain-English validation tasks. The owner can use it as a single sheet, mark Pass / Fail / Pending, and write notes inline.

| Bucket | Count |
|---|---:|
| Section A — May 3–6 older sprint tasks | **20** |
| Section B — May 9–11 current POS2 sprint tasks | **27** |
| Section C — Parked / backend / owner-decision items | **15** |
| **Total validation rows** | **62** |

**Top headlines:**
1. Older May 3–6 sprint work — 12 CRs sprint-accepted, plus tax (CR-013 Phase 1.5) `qa_passed_with_known_print_backend_finding`. **Bean Me Up SC-GST print double-count is the only live customer-visible defect carried into this sprint.**
2. May 9–11 POS2 sprint — Phase 1/2/3/3.1 of POS2-002 plus POS2-003 (incl. FU-02 + REOPEN-A + REOPEN-B), POS2-005, POS2-006 PG dropdown, POS2-007 Phase 1 are all implementation-complete with QA pass. **POS2-002 Phase 4 (Web/Scan YTC pop-out) shipped + automated QA pass, but a live runtime defect (FU-01) was found and a minimal fix has been applied — still needs live retest.**
3. Parked: POS2-003 PROFILE endpoint flip (owner: keep as-is); POS2-008 Phase 2 backend-owned tone (waiting on backend); A-1 channel eligibility (device validation pending); A-2 kill-switch (not started; backend confirmation needed).

---

## SECTION A — Older sprint work (May 3 → May 6)
> Sprint window already accepted (FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04 + LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06). Listed here purely so the owner can re-validate manually on preprod if desired.

| # | Plain-English task | Source CR / item | Current status | Manual validation steps | Priority | Result (Pending/Pass/Fail) | Notes |
|---|---|---|---|---|---|---|---|
| A1 | All Orders / Audit report shows orders under correct tab — Paid, Running, Hold, Cancelled, Merged, Credit, Aggregator, Transfer-to-Room, Audit, All — regardless of how the payment method was set. | CR-001 | Done + QA Passed | Open Audit report → switch through each tab pill → verify orders appear under the correct tab. Settled orders should appear under Paid; unpaid running orders under Running. | P1 |  |  |
| A2 | SRM (sub-room) orders display the SRM badge and route to the Audit Paid tab once settled. | CR-001 SRM badge / Bucket D1 | Done + QA Passed | Find an SRM row in Audit → verify badge appears → settle parent room → verify SRM now appears under Paid tab. | P1 |  |  |
| A3 | On a Hold order, a "Collect Bill" action is available; on a Paid order, "Change Payment Method" and "Mark Unpaid" actions are available with confirm dialogs. | CR-003 | Done + QA Passed | Audit → Hold tab → click Collect Bill on a row → drawer opens. Paid tab → Change Method + Mark Unpaid → confirm dialogs appear → action completes. | P1 |  |  |
| A4 | Room Orders report shows 3 filter pills — All / Paid / Unpaid — with All as default, and a new "Paid" column between Total and Outstanding. | CR-004 P0 + P2 | Done + QA Passed | Open Room Orders report → confirm default pill = All → switch pills → confirm rows filter accordingly → verify Paid column visible. | P1 |  |  |
| A5 | Room report math: Outstanding = ₹0 on checked-out rooms, "Total" replaces "Rent" in expanded card, food + room totals add correctly. | CR-004 P0 math | Done + QA Passed | Expand a paid room → verify card label says "Total" → verify Outstanding = ₹0 → verify Total = room_price + food. | P1 |  |  |
| A6 | "Remove from Room" action present on settled SRM rows; reuses Mark Unpaid permission. | CR-004 P2 / Bucket C | Done + QA Passed | Expand a settled room → SRM row → verify "Remove from Room" button visible → click → confirm dialog → SRM removes from room. | P1 |  |  |
| A7 | Cross-day in-house view + Paid column work correctly. | CR-004 P2 | Done + QA Passed | Room Orders → date picker spanning multiple days → verify in-house rooms visible across days → Paid column populates correctly. | P2 |  |  |
| A8 | Razorpay-paid orders show new "PG Order Id" and "PG Amount" columns in Audit report. | CR-005 #1 / B2-split P1 | Done + QA Passed | Audit → Paid tab → pick a Razorpay order → verify PG Order Id + PG Amount columns visible and populated. | P2 |  |  |
| A9 | Item variations: optional groups don't block Add-to-Cart; required single + required multi-select with min/max block correctly; cart price reflects all selected variants. | CR-006 A1 + B1 + FO-B1-01 | Done + QA Passed | Order Entry → pick an item with both optional and required variations → confirm Add-to-Cart enabled only when required min met → use qty +/- and verify price updates. | P1 |  |  |
| A10 | Order ID chip visible on order cards; Print Bill button visible on dashboard cards and on Order Entry header. | CR-007 | Done + QA Passed | Dashboard → look for chip on each running card → click Print Bill → bill prints. Order Entry header → Print Bill works. | P1 |  |  |
| A11 | On a prepaid order, Merge and Table-Shift options are hidden. | CR-007 prepaid defense | Done + QA Passed | Open a prepaid order on dashboard → confirm Merge + Table-Shift options NOT shown. | P2 |  |  |
| A12 | Delivery charge captured + applied once in totals + payload + print; delivery field locked for prepaid orders; cart total no longer double-counts delivery. | CR-008 Sub-CR #1 + Round-3 hotfix | Done + QA Passed | Place a delivery order → set delivery charge → verify cart total = items + tax + delivery (once) → verify field readonly for prepaid orders. | P1 |  |  |
| A13 | "Stay on Order Entry after Bill" preference works locally — screen does not auto-reset after Collect Bill if the preference is on. | CR-008 #4 Phase A | Done + QA Passed | Settings → enable "stay on order entry" → place + collect a bill → verify Order Entry stays open. | P2 |  |  |
| A14 | "cash_on_delivery" payment method shows as "—" everywhere — Audit table, OrderDetailSheet, CSV/PDF export, filter dropdown. | A0a UI-COD-MASK | Done + QA Passed | Audit → find a COD order → verify payment column shows "—" → export CSV → verify same in CSV. Filter dropdown should not list COD. | P2 |  |  |
| A15 | Running-orders fetch uses canonical `role_name='Manager'`; user/waiter name fallback safely renders when missing. | A0b ROLE-NAME-WIRE-FIX | Done + QA Passed | Log in → dashboard loads running orders without error → orders missing names show "—" gracefully. | P2 |  |  |
| A16 | Tax math correct end-to-end: profile reads `service_charge_tax` + `deliver_charge_gst` (incl. Bean Me Up nested config); Service-GST and Tip-GST flow on payloads; per-component CGST/SGST breakdown visible on Collect Bill; round-off applies only to Grand Total. | CR-013 Phase 1.5 (D-GST-1/2/3/4 + Fix-1/2 + parity) | Done + QA Passed (with known print finding — see A17) | Order Entry → add items, SC, tip, delivery → open Collect Bill → verify Tax section shows per-component CGST/SGST → verify Grand Total round-off applied only at the very end. | P1 |  |  |
| A17 | **Bean Me Up print receipt — Service Charge GST is being printed twice on the bill.** | CR-013 Bean Me Up print double-count | **Implemented + live issue found** (backend print-template defect; FE Phase 1.5 OK) | Bean Me Up tenant → place a dineIn order with Service Charge → Collect Bill → print bill → check printed GST values vs Collect Bill values. Expect mismatch on SC GST line until owner picks Option A/B/C/D. | **P0** |  |  |
| A18 | Test infra cleanup is healthy — test libraries + setup file + RAW-FIELD prod fallback fix + prepaid-merge-shift bug closed. | NS-3C-1..9 / TEST-INFRA-001 / BUG-PREPAID-MERGE-SHIFT | Done + QA Passed | (Engineering hygiene — owner-facing validation not required.) Run `yarn test` if curious; 199/199 pass. | P3 |  |  |
| A19 | Optional cosmetic carry-overs: CR-001 CSV column count off-by-one; LoadingPage ESLint warning suppressed inline. | Final Accept §7 rows 17 + 21 (backlog) | Manual validation pending (cosmetic) | Open Audit → export CSV → check column count vs displayed columns. Both flagged as backlog; not customer-visible. | P3 |  |  |
| A20 | CR-001 CSV/PDF export of date-ranged tab data continues to work. | CR-001 export | Done + QA Passed | Audit → set date range → click Export CSV + Export PDF → confirm files download with correct rows. | P2 |  |  |

---

## SECTION B — Current / latest POS2 sprint (May 9 → May 11)

| # | Plain-English task | Source CR / item | Current status | Manual validation steps | Priority | Result (Pending/Pass/Fail) | Notes |
|---|---|---|---|---|---|---|---|
| B1 | When a Scan & Order (web) YTC order arrives, an auto pop-out should appear on the dashboard for the operator to accept / reject / view / snooze. | POS2-002 Phase 4 (Web/Scan YTC pop-out) | **Implemented + automated QA passed, live issue found — minimal fix applied; needs live retest** (POS2-002-P4-FU-01) | Wake preprod backend → log into a tenant with active Scan & Order traffic → trigger a scan order → expect pop-out to render (full-screen on tablet, centered on desktop) and Web platform counter to increment by 1 (was previously showing "Web 0"). | **P0** |  | Root cause: `single-order-new` backend payload was omitting `order_from`. FE enrichment fix added in `socketHandlers.handleScanNewOrder` — guard does not overwrite when BE later ships the field. |
| B2 | Order source/origin (`order_from`) is mapped correctly throughout the dashboard, cards, reports, and downstream payloads. | POS2-002 Phase 1 | Implemented + QA-ready | Open dashboard → web orders should be tagged as web everywhere (cards, lists, downstream views) → POS orders should not be tagged web. | P1 |  |  |
| B3 | On a web order with a non-zero delivery charge already applied, the delivery charge field is locked on Order Entry / Collect Bill. | POS2-002 Phase 2 (web delivery lock) | Implemented + QA-ready | Open a web order with delivery charge > 0 → open Order Entry / Collect Bill → confirm delivery charge field is read-only. | P1 |  |  |
| B4 | On a web order with delivery charge = 0, the delivery charge field is editable. | POS2-002 Phase 2 | Implemented + QA-ready | Open a web order with delivery charge = 0 → confirm field is editable → save → value persists. | P1 |  |  |
| B5 | POS / manual delivery charge behaviour is unchanged — operator can still edit unless prepaid (CR-008 D1-Gate). | POS2-002 Phase 2 (regression check) | Implemented + QA-ready | Open a POS delivery order → confirm field editable when not prepaid; readonly when prepaid. | P1 |  |  |
| B6 | Dashboard header shows a "Platform" dropdown (All / POS / Web / Scan) — default All. | POS2-002 Phase 3 | Implemented + QA-ready | Dashboard → header → confirm dropdown visible after status chips and before search → default reads "Platform: All". | P1 |  |  |
| B7 | Platform dropdown filters orders correctly across channel + status views; AND-composes with status chips and search; persists across tab switches. | POS2-002 Phase 3 | Implemented + QA-ready | Pick POS → web orders disappear → switch to status view → filter still applied. Pick Web → only web orders visible. Reload → resets to All. | P1 |  |  |
| B8 | Platform counter chip near header shows live counts ("POS N · Web M") and increments correctly when a new order arrives. | POS2-002 Phase 3.1 | Implemented + QA-ready | Dashboard → note current counts → trigger a new POS order → POS count +1. Trigger a scan order → Web count +1. | P2 |  |  |
| B9 | Status-8 orders (`f_order_status === 8`) are excluded from the running dashboard column and appear under the Hold tab with a HOLD label and no Collect Bill button. | POS2-005 main + FU §A | Implemented + QA passed (Jungle Trail negative-path; positive-path test data dependent) | Dashboard → confirm no status-8 cards visible in running column → Audit Hold tab → confirm status-8 rows show with HOLD label → confirm Collect Bill action is NOT present on status-8 rows. | P1 |  | Per `POS2_005_F_STATUS_8_HOLD_REROUTE_QA_REPORT.md` — confirmed implemented + QA-passed (NOT unclear). |
| B10 | Status-9 / paylater Hold orders continue to behave as Hold and still allow Collect Bill (unlike status-8). | POS2-005 FU §A (status-8 vs status-9 differentiator) | Implemented + QA passed | Audit Hold tab → status-9 row → confirm HOLD label and Collect Bill button BOTH present. | P1 |  |  |
| B11 | Prepaid orders correctly show "PAID" badge / state in reports and on cards. | POS2-005 + POS2-006 cross-tab | Implemented + QA-ready | Audit → Paid tab → prepaid order → verify PAID indicator. Dashboard card → prepaid → verify PAID badge. | P1 |  |  |
| B12 | A single "Payment Gateway" dropdown (ALL / Non-PG / PG) is visible across all report tabs, persists when switching tabs, defaults to ALL. | POS2-006 PG filter dropdown | Implemented + QA-ready | Audit report → confirm dropdown rendered (replaces old checkbox pair) → default reads ALL → switch to Non-PG → PG orders disappear → switch tabs → selection persists. | P1 |  |  |
| B13 | Payment Gateway filter correctly narrows results across all tabs (ALL = no filter; Non-PG = orders without PG; PG = PG-only). | POS2-006 PG filter | Implemented + QA-ready | Apply Non-PG → verify only non-Razorpay orders shown. Apply PG → verify only Razorpay-paid orders shown (PG Order Id + PG Amount columns also surface). | P1 |  |  |
| B14 | Default confirm-order tone (when profile does NOT specify a tone) plays the default doorbell tone for new YTC arrivals. | POS2-007 Phase 1 | Implemented + QA passed (Jungle Trail default-tone override verified) | On a tenant with `confirm_order_tone` undefined → trigger YTC → expect default doorbell sound. | P2 |  |  |
| B15 | When profile sets `confirm_order_tone = 'silent'`, no audio plays on YTC arrival. | POS2-007 Phase 1 | Implemented + QA-ready (live admin-flip pending) | Admin flip tenant `confirm_order_tone = 'silent'` → trigger YTC → expect no sound. | P2 |  | Profile-flip needs admin tooling — opportunistic. |
| B16 | When profile sets `confirm_order_tone = 'buzzer'`, the buzzer audio plays on YTC arrival. | POS2-007 Phase 1 | Implemented + QA-ready (live admin-flip pending) | Admin flip tenant `confirm_order_tone = 'buzzer'` → trigger YTC → expect buzzer sound. | P2 |  | Same admin-flip dependency as B15. |
| B17 | Sidebar Silent Mode toggle kills all tones regardless of profile setting. | POS2-007 Phase 1 Silent Mode kill-switch | Implemented + QA passed (Jungle Trail) | Open sidebar → toggle Silent Mode ON → trigger any new-order event → expect zero sound. Toggle OFF → sounds resume. | P2 |  |  |
| B18 | Place Order action carries the correct `printer_agent` (KOT agents) on the wire — based on station mapping for the order's items. | POS2-003 main + REOPEN-B (v2 place-order endpoint shipped) | Implemented + QA passed; **live tenant validation pending on a tenant with non-empty `print_agent`** | Tenant with configured `print_agent` → place order → DevTools network tab → inspect `place-order` payload → confirm `printer_agent` contains expected KOT stations. | **P0 (after live tenant)** |  | Needs non-empty `print_agent` tenant. |
| B19 | Manual "Print Bill" from Order Entry header carries the BILL agent on the wire. | POS2-003 FU-02 | Implemented + QA-ready; **live tenant validation pending on a tenant with non-empty `print_agent`** | Same tenant → Order Entry → header → Print Bill → inspect `order-temp-store` payload → confirm BILL agent present. | **P0 (after live tenant)** |  | Needs non-empty `print_agent` tenant. |
| B20 | Postpaid auto-print after Collect Bill carries the BILL agent on the wire. | POS2-003 FU-02 | Implemented + QA-ready; **live tenant validation pending on a tenant with non-empty `print_agent`** | Same tenant → place postpaid order → Collect Bill → confirm auto-print fires with BILL agent on payload. | **P0 (after live tenant)** |  | Needs non-empty `print_agent` tenant. |
| B21 | Update / edit-order action carries `printer_agent` for affected KOT stations. | POS2-003 REOPEN-A | Implemented + QA passed (wire-level 29/29; **live tenant validation pending on non-empty `print_agent`**) | Same tenant → edit an existing order → add/remove items → inspect `update-place-order` payload → confirm `printer_agent` matches station changes. | **P0 (after live tenant)** |  | Needs non-empty `print_agent` tenant. |
| B22 | Cancel item action carries `printer_agent` for the impacted station(s). | POS2-003 REOPEN-A | Implemented + QA passed (wire-level); live tenant validation pending | Same tenant → cancel one item → inspect `cancel-food-item` payload → confirm `printer_agent` set to that item's station. | **P0 (after live tenant)** |  | Needs non-empty `print_agent` tenant. |
| B23 | Cancel order action carries `printer_agent` for the impacted stations; BILL agent is excluded. | POS2-003 REOPEN-A | Implemented + QA passed (wire-level); live tenant validation pending | Same tenant → cancel an entire order → inspect `order-status-update` payload → confirm `printer_agent` covers KOT stations but excludes BILL. | **P0 (after live tenant)** |  | Needs non-empty `print_agent` tenant. |
| B24 | Place-order endpoint flipped from v1 → v2 — smoke test confirms socket emit + FCM YTC tone + audit log still fire. | POS2-003 REOPEN-B | Implemented + QA-ready (1-order live smoke recommended) | Place one test order → confirm dashboard updates (socket), FCM tone fires, and the order is recorded in audit. | P1 |  | PROFILE endpoint stays as-is per owner (no flip). |
| B25 | Channel-based menu visibility — items show in Order Entry only for the channel they're enabled on (dineIn / takeaway / delivery / web). | A-1 channel eligibility | **Manual device validation pending** (not started; backend confirmation needed on field map) | Per channel: open Order Entry → confirm only items configured for that channel are shown in menu. | P2 |  | Track may belong to a parallel product-API sprint; owner triage required before any FE work. |
| B26 | Cart channel-switch prompt — when operator changes the channel mid-order, a confirm prompt appears to discard / keep cart. | A-1 channel eligibility | Manual device validation pending | Start an order on dineIn → add items → switch channel to delivery → confirm prompt appears (discard cart vs keep). | P2 |  |  |
| B27 | POS2-002 Phase 3.1 platform counter chip + per-status sub-breakdown (POS / Web counts visible per status group). | POS2-002 Phase 3.1 | Implemented + QA-ready | Header → platform chip → verify "POS N · Web M" and the per-status sub-breakdown matches the visible cards. | P2 |  |  |

---

## SECTION C — Parked / backend / owner-decision items

| # | Plain-English task | Source CR / item | Current status | Manual validation steps | Priority | Result | Notes |
|---|---|---|---|---|---|---|---|
| C1 | Bean Me Up SC-GST print double-count — owner to pick fix option (A backend-only, B FE targeted rollback, C FE full rollback, D not recommended). | CR-013 Bean Me Up | **Owner decision pending** + backend BE-G7/G8/G10/G11 triage pending | (No manual step until owner picks option.) | P0 (parked) |  | Customer-visible. |
| C2 | Delivery charge GST persisted as a separate amount (`delivery_charge_gst_amount`) so the printer template can print it accurately. | CR-013 Phase 3 / BE-G9 | **Backend dependency** — column missing on the wire | (No manual step until backend adds field.) | Parked |  |  |
| C3 | Operations Audit Timeline — new screen showing every operation performed on an order. | CR-009 | **Ready to plan** (backend data confirmed on wire 2026-05-06; FE planning not started) | (No manual step yet.) | P1 (parked) |  |  |
| C4 | Unify status & tab logic across reports. | CR-002 | **Owner decision pending** | (No manual step.) | Parked |  |  |
| C5 | Roles & Permissions consolidation. | CR-010 | **Owner decision pending** | (No manual step.) | Parked |  |  |
| C6 | PG scan / Serve / paymentType case canonicalisation. | CR-011 | **Backend dependency** (BE-A) | (No manual step.) | Parked |  |  |
| C7 | Big Buddha filling MAX label mismatch. | CR-012 | **Owner decision pending** | (No manual step.) | Parked |  |  |
| C8 | Faster login + visible station-load progress (parallelised API loads). | UX-LOADING-02 Phase 3 | **Owner decision pending** (plan ready; option pick required) | (No manual step until option picked + shipped.) | Parked |  |  |
| C9 | Server-side persistence of "Stay on Order Entry after Bill" preference. | CR-008 #4 Phase B | **Backend dependency** (BE-F server-side `default_landing_screen` missing) | (No manual step.) | Parked |  |  |
| C10 | Delivery dispatch / assign / picked-up actions + screen. | CR-008 Sub-CR #3 | **Backend endpoint contract pending** | (No manual step until BE ships endpoints.) | Parked |  |  |
| C11 | Auto-reveal "PG Status" column when Razorpay status starts coming through. | CR-005 B2 Phase 2 / BE-W2 | **Backend dependency** (column wired but BE returning null) | Audit Paid tab → no manual step until BE populates `snapshot_razorpay_status`. Column will auto-appear. | Parked |  |  |
| C12 | POS2-003 PROFILE endpoint v1 → v2 flip. | POS2-003 REOPEN-B PROFILE half | **Parked — owner: keep PROFILE as-is** | (No validation; owner declined the flip.) | Parked |  | Place-order half shipped; PROFILE half NOT shipped. |
| C13 | POS2-008 Phase 2 — backend-owned canonical tone token; FE override layer auto-cleanup once BE ships. | POS2-008 Phase 2 | **Future / Backend** (planning complete; backend ask formally raised) | (No manual step until BE ships tone contract.) | Parked |  | NOT implemented today (Phase 1 FE override is what's live and validated as B14–B17). |
| C14 | A-1 — Product API field mapping for channel eligibility (Order Entry menu by channel). | A-1 | **Manual device validation pending** (not started; backend confirmation needed) | Listed for traceability — same as B25 / B26 manual steps when work begins. | Parked |  |  |
| C15 | A-2 — Item `is_disable` + `status` kill-switch (hide/disable items globally per tenant). | A-2 | **Not started / backend confirmation needed** | (No manual step; sprint placement to be confirmed.) | Parked |  | Likely belongs to a parallel product-API sprint. |

---

## SECTION D — Recommended validation order

> Use this order so the highest-impact / customer-visible items get attention first.

1. **B1 — Web/Scan YTC pop-out live retest** (only customer-visible defect with a fix applied this sprint).
2. **A17 — Bean Me Up print SC-GST double-count** (still open; manual confirm of the defect on a fresh receipt while owner picks Option A/B/C/D).
3. **B9 + B10 — Status-8 / Status-9 Hold behaviour** (recently rerouted; quick visual check).
4. **B18 → B23 — Print-agent wire-level smoke** on a single tenant with a non-empty `print_agent` configured. Cover Place, Update, Cancel item, Cancel order, Manual Print Bill, Postpaid auto-print in one session.
5. **B12 + B13 — PG dropdown** across all report tabs (single pass).
6. **B6 + B7 + B8 + B27 — Platform dropdown + counter chip** (single pass).
7. **B2 + B3 + B4 + B5 — Web delivery-charge lock** (single pass with one web order + one POS order).
8. **B14–B17 — Confirm-order tone** (default + Silent Mode now; admin-flip silent/buzzer when tooling is available).
9. **B24 — Place-order v2 endpoint** one-order smoke.
10. **B25 + B26 — Channel-based menu visibility + cart channel-switch prompt** when devices are available.
11. **A1 → A16 + A18 → A20 — Older sprint regression sweep** on preprod whenever time permits (already accepted; light revalidation).
12. **Section C** — review owner-decision and backend-dependency items in a single planning meeting.

---

## SECTION E — Closure notes

- This document does **not** close any item on its own. Owner sign-off in the Result column is what marks an item closed.
- Aggregate engineering posture remains healthy: full unit suite green (latest count 427/427 on Phase 4 enrichment fix; 373/373 on Phase 3); ESLint clean on touched files; production build clean.
- No code was changed, no tests were re-run, no `/app/memory/final/*` was edited, and no new CR was opened to produce this tracker.
- Two timelines are intentionally **not mixed**: Section A (May 3–6) reflects the previously accepted sprint; Section B (May 9–11) reflects POS2.0 sprint work in progress.
- Special status rules honoured:
  - **B1 (Web/Scan YTC pop-out)** → marked *implemented + automated QA passed, live issue found / minimal fix applied — needs live retest* per `POS2_002_PHASE_4_WEB_YTC_POPOUT_QA_REPORT_ADDENDUM_FU_01_2026_05_10.md`.
  - **B9 (Status-8 Hold)** → marked *implemented + QA passed*, not unclear, per `POS2_005_F_STATUS_8_HOLD_REROUTE_QA_REPORT.md`.
  - **B18 → B23 (Print agent flows)** → each row flags the need for a non-empty `print_agent` tenant for live validation.
  - **C12 (POS2-003 PROFILE flip)** → parked, not listed as implemented.
  - **C13 (POS2-008 backend-owned tone)** → future / backend, not listed as implemented today (Phase 1 FE override is what's live — see B14–B17).
  - **C14 (A-1 channel eligibility)** → manual device validation pending.
  - **C15 (A-2 kill-switch)** → not started; backend confirmation needed.

---

— End of POS2.0 Full Manual Validation Task Tracker (2026-05-11) —
