# Layer 4 — Bug Tracker

**Last Updated:** 2026-06-13 — **ALL SMOKE PASSED.** BUG-112/113/114 CLOSED — OWNER VERIFIED. BUG-116 CLOSED — OWNER VERIFIED. BUG-122 post-delivery CLOSED — OWNER VERIFIED. BUG-125/126/127/128 CLOSED — OWNER VERIFIED. BUG-131/132/133 CLOSED — OWNER VERIFIED. DEBUG-B11 logs removed.

---

## Insights Cross-Report Audit Batch (registered 2026-06-11, Gates 0-2 complete)

Source: `INSIGHTS_REPORTS_AUDIT.md` (cafe103) + `INSIGHTS_REPORTS_AUDIT_PALMHOUSE.md` (palmhouse). Replication harness: `/app/audit_data/`.

| Bug ID | Title | Priority | Status | Gate | Blocker |
|---|---|---|---|---|---|
| BUG-125 | Cancellations Order-Level scope never matches ('Cancel' vs 'cancelled') | P1 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-126 | insightsService reads non-existent round_off (API: round_up) | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-127 | Dashboard Unsettled-TAB tile → Credit Outstanding (credit API, option a) | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-128 | Dashboard double-fetches identical order-logs payload | P2 | **CLOSED — OWNER VERIFIED (2026-06-13)** | ✅ | — |
| BUG-129 | Backend stamps TAB orders f_order_status=6 before collection | P1→P3 (downgraded; FE gates by pm) | PLANNED (BACKEND-BLOCKED) | Brief sent via owner | Backend reply (brief #3) |
| BUG-125-B | Food Type (item_type) not persisting on Edit — **imported from `discount-menu` branch 2026-06-11, renumbered per owner ruling** (original branch ID "BUG-125" collided with Insights BUG-125 above). Doc: `memory/change_requests/BUG_125_B_FOOD_TYPE_NOT_PERSISTING.md` (planning complete on that branch; NO code on this branch) | P1 | IMPORTED — PLANNING COMPLETE (other branch), not started here | — | Workstream lives on `discount-menu` |
**Source:** Canonical sprint summaries + `/memory/bugs/` artifact docs + `BUG_TEMPLATE.md`
**Reconciliation report:** `change_requests/AUDIT_CLOSURE_DRIFT_001_PHASE_A_RECONCILIATION_2026_05_30.md`

> **Drift reconciliation 2026-05-30:** Pre-reconciliation, this tracker showed 37 bugs (BUG-038..074) as `Intake Only`. AUDIT-CLOSURE-DRIFT-001 found 40 of these were actually closed per sprint final summaries. Sections below now reflect the canonical truth, with Artifact References cited per bug.

---

## Summary (post-reconciliation 2026-05-30)

| Category | Count | Source |
|---|---|---|
| Total bugs tracked | 118 (BUG-001..086 + BUG-087..111 + 8 PROD hotfixes) | Reconciled |
| Closed / Verified | 80 | Canonical sprint summaries + smoke sign-off docs |
| Open Intake / True Blocked | 11 | Items without canonical closure |
| Backend-Blocked (POS 3.0) | 6 | BUG-090,091,092,093,094,101 |
| CRM-Blocked | 1 | BUG-106 (BUG-107 subsumed, BUG-108 partial) |
| Owner Scope Needed | 2 | BUG-104,105 |
| Drift reconciled this pass | 44 | Was "Not Started" → now correctly tagged |

---

## Active / Recent Bugs (POS 3.0 + 3.1)

| Bug ID | Title | Priority | Status | Sprint | Blocker |
|---|---|---|---|---|---|
| BUG-087 | PayLater PAID badge on dashboard | P0 | CLOSED | POS 3.0 | — |
| BUG-088 | Room Transfer v2 endpoint + socket | P1 | CLOSED | POS 3.0 | — |
| BUG-089 | Eliminate redundant API calls on update-food-status | P1 | CLOSED | POS 3.0 | — |
| BUG-090 | CRM customer_id not stored on room orders | P2 | BACKEND-BLOCKED | POS 3.0 | Q-090-B-1 |
| BUG-091 | CRM search API duplicates | P2 | BACKEND-BLOCKED | POS 3.0 | CRM team |
| BUG-092 | Phone format contract undefined for room check-in | P2 | BACKEND-BLOCKED | POS 3.0 | Q-092-1 |
| BUG-093 | Room check-in date missing in API response | P3 | BACKEND-BLOCKED | POS 3.0 | Backend |
| BUG-094 | Delivery-assign-order socket missing payload | P3 | BACKEND-BLOCKED | POS 3.0 | Q-094-1 |
| BUG-095 | Socket handler + dead code cleanup | P2 | PLANNING COMPLETE | POS 3.0 | — |
| BUG-096 | Realtime FE updates for menu + hold/unpaid | P1 | PARTIAL | POS 3.0 | BQ-CR-01/02/03 |
| BUG-097 | Delivery dispatch + assign rider | P1 | SMOKE PENDING | POS 3.0 | 25-row QA + CartPanel gate + Bucket 5 |
| BUG-098 | Use restaurant profile CRM key | P1 | CLOSED | POS 3.0 | — |
| BUG-099 | QSR / Cafe Quick Billing UX | P1 | CLOSED | POS 3.0 | — |
| BUG-100 | Remove duplicate local toast notifications | P1 | CLOSED | POS 3.0 | — |
| BUG-101 | Print template GST display slot | P3 | BACKEND-BLOCKED | POS 3.0 | Q-101-1 |
| BUG-102 | Mark Served/Ready button 20-30s delay | P0 | CLOSED | POS 3.0 | — |
| BUG-103 | Remove number input arrows | P2 | CLOSED | POS 3.0 | — |
| BUG-104 | Credit/Tab Management module | P1 | OWNER SCOPE NEEDED | POS 3.0 | OQ-CR-04/05 |
| BUG-105 | Settlement Module | P1 | OWNER SCOPE NEEDED | POS 3.0 | OQ-CR-06/07/08 |
| BUG-106 | CRM Notes API integration | P2 | CRM-BLOCKED | POS 3.0 | CQ-CR-01/02 |
| BUG-107 | CRM Cross-Sell/Upsell insights | P2 | CRM-BLOCKED → SUBSUMED | POS 3.0 → CRM 2.0 | Absorbed into CR-002 |
| BUG-108 | CRM Coupon/Loyalty/Wallet | P1 | PARTIAL (shipped) | POS 3.0 → CRM 2.0 | P1 backend defect open |
| BUG-109 | QSR takeaway/delivery validation parity | — | CLOSED | POS 3.1 | — |
| BUG-110 | QSR prepaid lock parity | — | CLOSED | POS 3.1 | — |
| BUG-111 | QSR bill parity (Grand Total + breakdown) | — | CLOSED | POS 3.1 | — |
| **BUG-112** | **Auto-print (order-temp-store) blocked by Place Order API response — should fire in parallel** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **waitForOrderReady 3000→500ms + early HTTP check at redirect point. Phase 2 (table-matching for socket-first) deferred.** |
| **BUG-113** | **Partial payment UI stuck — auto-fill locks Cash/Card/UPI amount fields, cannot re-enter** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **FE fix: removed real-time capping + auto-fill from onChange. Moved to onBlur — clamp + auto-fill only when other row is empty.** |
| **BUG-114** | **discount_type, discount_member_category_id/name sent as empty/0 when category discount applied** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **FE fix: threaded selectedDiscountType (id, name) through paymentData.discounts → transform builders read from discounts instead of hardcoded 0. Covers placeOrderWithPayment + collectBillExisting.** |
| **BUG-115** | **Audit Report — cancelled item/order not rendering correctly in some cases; full production validation needed** | **P1** | **CLOSED — OWNER VERIFIED** | **POS 4.0** | **FE fix: aligned TAB_FILTERS.cancelled with Order Ledger — added lowercase 'cancelled' check to cancelled filter (L84), paid exclusion (L70), running exclusion (L107). 3 lines in AllOrdersReportPage.jsx.** |
| **BUG-116** | **Out-of-kitchen/out-of-menu item Add — backend already emits `food_update_${rid}` socket; FE had no listener → menu didn't refresh in realtime** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **Runtime validated 2026-06-08 via temp socket.onAny tap. 4-file additive fix: socketEvents.js (channel generator + payload-type const + envelope doc), socketHandlers.js (handleFoodUpdate), MenuContext.jsx (addOrUpdateProduct delta upsert), useSocketEvents.js (subscribe to food_update_${rid}, wire to actionsRef). No existing handlers touched. Webpack + lint clean.** |
| **BUG-117** | **Audit Report side-sheet — GST line renders negative (₹-44, ₹-26, ₹-168) on VAT-only & mixed-tax orders; same defect in Order Ledger GST columns + false FE-86 audit flag** | **P1** | **CLOSED — OWNER VERIFIED** | **POS 4.0** | **FE fix: corrected per-tax field interpretation in reportTransform.js L957-963 — total_gst_tax_amount is PURE GST (not combined). Removed subtraction. Verified live on Lafetta orders 012553/012554/012555 (2026-06-08). rawGstAmount kept numerically identical for FE-88 compat. Owner approved 2026-06-08.** |
| **BUG-118** | **Nth-item coupon code and BOGO coupon code — some features not working, needs testing** | **P1** | **INTAKE** | **POS 4.0** | **FE investigation needed** |
| **BUG-119** | **Backend stores negative `round_up` (e.g. −0.40) violating FE ceiling-only contract; side-sheet renders "₹-0"** | **P2** | **CLOSED — BACKEND FIXED (2026-06-08)** | **POS 4.0** | **Backend fixed the negative round_up. No FE changes needed.** |
| **BUG-123** *(renumbered from BUG-120 on 2026-06-11 — collision with closed CR-014 post-delivery BUG-120)* | **Place Order on 401 silently redirects to dashboard; cashier mistakes failure for success → missed orders** | **P1** | **INTAKE** | **POS 4.0** | **Fire-and-forget HTTP + socket-wait timeout + `window.location.href` bounce. Toast missable, cart lost, order not actually placed. Affects Place Order, Collect Bill, Transfer, Update Order — same pattern. Intake doc: BUG_123_PLACE_ORDER_401_SILENT_REDIRECT_INTAKE.md** |
| **BUG-124** *(renumbered from BUG-121 on 2026-06-11 — collision with closed category-count BUG-121)* | **Backend `food_update_${rid}` socket payload missing critical fields (status, is_disable, stock_out, food_status, live_web)** | **P2** | **INTAKE — FE DEFENDED** | **POS 4.0** | **FE has SOCKET_FOOD_DEFAULTS backfill in socketHandlers.js. Backend needs to enrich socket payload. Intake doc: BUG_124_BACKEND_FOOD_UPDATE_SOCKET_PAYLOAD_INCOMPLETE_INTAKE.md** |
| **BUG-122** | **POS orders with fOrderStatus 7 incorrectly trigger ScanOrderPopOut popup — popup gated to `isWebOrder === true`** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-10)** | **POS 4.0** | **`ScanOrderPopOut.jsx:56` predicate + POS YTC tick flow on OrderCard.** |
| **BUG-122 post-delivery** | **3 FE fixes: POS YTC Cancel(✗)+Confirm(✓) on OrderCard; TableCard snooze gated web-only; CR-018 schedule_at trailing-space + time-component guard** | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **OrderCard.jsx:871-893, TableCard.jsx:326, CartPanel.jsx:1443/1469. Handover: memory/handover/CR018_BUG122_FE_FIXES_HANDOVER_2026_06_10.md** |
| **BUG-130** | **Channel Visibility: Restaurant Settings channels not reflected in POS dashboard.** Channels enabled/disabled via Restaurant Settings API (master config) are not properly gating what appears on POS dashboard and local visibility toggles. Two-layer model: (1) Restaurant-level from `settings-list` API, (2) Per-user localStorage override on StatusConfig. Related: CR-024, CR-020 B11. Deep investigation deferred per owner. | **P1** | **REGISTERED — INTAKE COMPLETE 2026-06-12. Investigation deferred. NOT STARTED.** | **POS 4.0** | **Trace needed: settings API → profileTransform → StatusConfigPage → DashboardPage → OrderEntry → localStorage interaction** |
| **BUG-131** | **Sidebar bottom section (Ringer/Refresh/User/Logout) scrolls up — should be sticky at bottom.** Bottom actions disappear when sidebar nav content is long. Fix: `flex-shrink-0` on bottom section, `min-h-0` on nav, `overflow-hidden` on aside. | **P2** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **3 CSS edits in `Sidebar.jsx`** |
| **BUG-132** | **Settlement Report business logic broken (formulas).** Expected = TotalFunds − Settled (was subtracting pilferage — circular). Pilferage column showed ₹0 (was ignoring backend value). Missing Total Funds KPI card. 5 micro-phases (A→E), 13 edits, 1 file. | **P1** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **`SettlementPanel.jsx` — 13 formula fixes + 1 KPI card added** |
| **BUG-133** | **"Check In" item appearing in reports — backend-only room marker with room tariff prices (₹1,100–₹3,600) inflating food revenue.** Validated: Welcome Resort 118 items in 15 days = ~₹1.5L phantom revenue. Filter: `(fd.name || '').trim().toLowerCase() === 'check in'`. 5 filter points across 3 files. Covers all 8 affected report surfaces. | **P1 (upgraded from P2 — money)** | **CLOSED — OWNER VERIFIED (2026-06-13)** | **POS 4.0** | **`insightsService.js` (3 filters), `reportTransform.js` (1 filter), `CancellationsMockup.jsx` (1 filter)** |

---

## POS 2.0 — Closed (consolidated 2026-05-18)

> Canonical source: `change_requests/final_sprint_reconciliation/POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md`

| Bug ID | Title | Status | Artifact Reference |
|---|---|---|---|
| BUG-050 | Printed bill mismatch after item cancellation | ✅ Implemented (W4) | POS2_0_WAVE_4_QA_HANDOFF_BUG_050_2026_05_17.md |
| BUG-051 | Round-off → Math.ceil | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-052 | Profile boolean gate for round-off | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-053 | GST split label percentage hardcode | ✅ Closed (no code) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-054 | VAT discount proration | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-055 | Prepaid order_discount_type payload | ✅ Implemented (W2) | POS2_0_WAVE_2_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-056 | Preset discount dropdown | ✅ Implemented (W3) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-057 | Print Bill for prepaid | ✅ Implemented (W4) | POS2_0_PRINT_PATH_UNIFICATION_CORRECTIVE_CODE_DIFF_PREVIEW_2026_05_17.md |
| BUG-058 | PayLater PAID badge + prepaid hold | 🔴 Carry-forward → BUG-087 | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-059 | Audit Report Print Bill | ✅ Implemented (W4) | POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_REVISED_2026_05_17.md |
| BUG-060 | Room transfer table clear | ✅ Implemented (W7) — temp FE fix | POS2_0_WAVE_7_IMPLEMENTATION_REPORT_2026_05_18.md |
| BUG-061 | Room check-in time createdAt fallback | ✅ Implemented (W7) | POS2_0_WAVE_7_IMPLEMENTATION_REPORT_2026_05_18.md |
| BUG-062 | Hide To Room for takeaway/delivery | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-063 | Room bill print fields | ✅ Closed (no code) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-064 | Room transfer notification message | 📋 Future sprint → POS3.0 | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-065 | Corporate room check-in CRM lookup | ✅ Implemented (Post) | POS2_0_BUG_065_IMPLEMENTATION_REPORT_2026_05_18.md |
| BUG-066 | Food transfer exclude rooms | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-067 | Station toggle when no stations | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-068 | Socket reconnect rehydration | ✅ Implemented (W6) | POS2_0_WAVE_6_IMPLEMENTATION_REPORT_2026_05_17.md |
| BUG-069 | Notification sequencing | 📋 Future sprint → POS3.0 | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-070 | Room area grouping | ✅ Implemented (W5) | POS2_0_WAVE_5_CODE_DIFF_PREVIEW_BUG_070_2026_05_17.md |
| BUG-071 | Restaurant order ID on surfaces | ✅ Implemented (W5) | POS2_0_WAVE_5_CODE_DIFF_PREVIEW_BUG_071_2026_05_17.md |
| BUG-072 | Notes visible on order card | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-073 | Empty customization wrapper | ✅ Implemented (W1) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-074 | Remember Me checkbox | ✅ Implemented (Post) | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |
| BUG-075..086 | Wave 2-7 misc | ✅ Various — see canonical doc | POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md |

---

## pos_final_1.0 — Closed (consolidated 2026-05-12)

> Canonical source: `bugs/BUG_CODE_VALIDATED_CONSOLIDATION_REPORT_2026_05_12.md` + per-bug `bugs/BUG_0XX_SMOKE_SIGNOFF.md`

| Bug ID | Title | Status | Artifact Reference |
|---|---|---|---|
| BUG-037..049 (drift-set) | Various pos_final_1.0 items | ✅ CLOSED — smoke signoff verified | bugs/BUG_0XX_SMOKE_SIGNOFF.md |
| BUG-038 | Credit payment customer details | Smoke signoff exists | bugs/BUG_038_SMOKE_SIGNOFF.md (if exists) — verified via TAB_CREDIT_CUSTOMER_CRM_* docs |
| BUG-039,040,041 | Audit report exports | Smoke signoff + impact docs | bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md + per-bug docs |
| BUG-042 | Hold + UPI payment | ✅ Smoke-passed | bugs/BUG_042_B_SMOKE_SIGNOFF.md |
| BUG-043 | Room orders discount column | ✅ Smoke-passed | bugs/BUG_043_SMOKE_SIGNOFF.md |
| BUG-044 | Old order items on free table | 🟡 Parked — runtime repro pending | bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md |
| BUG-045,046,047,048,049 | Various | ✅ Closed — smoke signoffs exist | bugs/BUG_0XX_SMOKE_SIGNOFF.md |

---

## True Intake / Unverified (no canonical closure proof)

> These remain as INTAKE per rulebook because no canonical doc proves closure.

| Bug ID | Title | Status |
|---|---|---|
| BUG-038..041 | Pos_final_1.0 items lacking authoritative closure doc | Awaiting reconciliation audit |

---

## Production Hotfixes

| ID | Title | Status | Date | Notes |
|---|---|---|---|---|
| PROD-001 | Auto-settle toggle | CLOSED | 2026-05-20 | 10/10 QA PASS, owner verified |
| PROD-002 | Settle print guard | RUNTIME-QA-PENDING | 2026-05-21 | 25-row checklist, no code fix needed |
| PROD-003 | PayLater table clear | FE-VERIFIED, BE-FOLLOWUP | 2026-05-21 | Backend should emit on `update-order-paid` |
| PROD-004 | Walk-in cart not cleared on stay-on-order | SHIPPED | 2026-05-27 | +2 lines in DashboardPage.jsx |
| PROD-005 | Prepaid screen clear delay | SHIPPED | 2026-05-27 | DashboardPage.jsx |
| PROD-006 | Takeaway print: custPhone empty when no phone entered | INTAKE | 2026-05-29 | Investigating — likely backend print template issue |
| PROD-007 | Loyalty points earned not displayed on Collect Bill | CLOSED — OWNER VERIFIED | 2026-05-29 | +3 lines loyaltyTransform.js, +5 lines CollectPaymentPanel.jsx |
| PROD-008 | Manual KOT/Bill print: custName & custPhone NULL | CLOSED — OWNER VERIFIED | 2026-05-29 | +2 lines in orderService.js L155-156 |

---

## Carryover Summary

| From Sprint | To Sprint | Items | Reason |
|---|---|---|---|
| POS 3.0 | Backlog | 6 backend-blocked bugs (090-094,101) | Backend hasn't delivered |
| POS 3.0 | CRM 2.0 | BUG-106,107,108 | CRM APIs needed |
| POS 3.0 | Backlog | BUG-104,105 | Owner scope sessions needed |
| POS 3.0 | Backlog | BUG-095,096 | Ready but not prioritized |
| POS 3.0 | Backlog | 12 unfrozen business rules | Each needs fix + verification + re-approval (TIP-003, ROUND-001 + 10 Part B promoted 2026-05-31) |
| BUG-108 | CRM 2.0 CR-009 | Coupon reversal, wallet, admin UI, multi-coupon, variant matching | Deferred items from BUG-108 |

---

## Closure Rule

Per `IMPLEMENTATION_AGENT_RULES.md` — 6-Artifact Rule (added 2026-05-12):
1. Intake document
2. Impact Analysis
3. Implementation Plan
4. Pre-Implementation Code Gate
5. Implementation Summary + QA Report
6. Owner Smoke Sign-off
