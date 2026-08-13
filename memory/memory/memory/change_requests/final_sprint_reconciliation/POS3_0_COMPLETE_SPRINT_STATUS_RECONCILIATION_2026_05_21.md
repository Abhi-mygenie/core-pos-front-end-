# POS3.0 Complete Sprint Status Reconciliation — 2026-05-21

## 1. Purpose

This document reconciles the full POS3.0 sprint status after multiple planning, implementation, hotfix, and QA sessions spanning 2026-05-18 through 2026-05-21. It covers all 22 POS3.0 items (13 bug fixes + 9 CRs), 3 production hotfixes, and provides the current ground truth for each item so the next agent can pick up cleanly.

**This is status reconciliation and documentation only.** No code changed. No `/app/memory/final/` updated. No baseline docs updated. No QA executed.

---

## 2. Inputs Read

### Baseline Docs (`/app/memory/final/`) — 8 files, all present
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `BUSINESS_RULES_BASELINE_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `FINAL_DOCS_SUMMARY.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `MODULE_DECISIONS_FINAL.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`

### Accepted Overlay Docs — 5 files
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

### POS3.0 Master / Planning Docs
- `POS3_0_BUG_IMPACT_ANALYSIS.md` (under `/app/memory/bugs/`)
- `POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md` (under `/app/memory/bugs/`)
- `POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md`
- `POS3_0_BUG_FIX_PLANNING_OWNER_BACKEND_QUESTION_CAPTURE_2026_05_18.md`
- `POS3_0_BUG_FIX_PLANNING_CLOSURE_ADDENDUM_2026_05_18.md`
- `POS3_0_CR_MASTER_PLANNING_2026_05_18.md`
- `POS3_0_CR_PLANNING_CLEARANCE_ADDENDUM_2026_05_18.md`
- `POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md`
- `POS3_0_COMPLETE_SPRINT_IMPLEMENTATION_REPORT_2026_05_19.md`
- `POS3_0_SESSION_SUMMARY_2026_05_19_20.md`
- `POS3_0_CARRY_FORWARD_2026_05_18.md`
- `POS3_0_BUCKET_A_IMPLEMENTATION_REPORT_2026_05_18.md`
- `POS3_0_BUCKET_A_QA_HANDOFF_2026_05_18.md`
- `POS3_0_CR_WAVE_1_BUG_098_IMPLEMENTATION_REPORT_2026_05_18.md`

### BUG-097 Docs — 20+ docs read (key ones)
- `POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md`
- `POS3_0_BUG_097_FINAL_PLANNING_COMPLETION_2026_05_21.md`
- `POS3_0_BUG_097_3_ITEM_IMPLEMENTATION_REPORT_2026_05_21.md`
- `POS3_0_BUG_097_3_ITEM_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md`
- `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_IMPLEMENTATION_REPORT_2026_05_21.md`
- `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md`
- `POS3_0_BUG_097_CARTPANEL_COLLECT_BILL_DELIVERY_POSTPAID_GATE_PARKED_2026_05_21.md`
- `POS3_0_BUG_097_IMPLEMENTATION_AGENT_HANDOVER_2026_05_20.md`
- `POS3_0_BUG_097_DELIVERY_BUTTON_LABELS_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_4_5_IMPLEMENTATION_REPORT_2026_05_20.md`
- `POS3_0_BUG_097_OWNER_SMOKE_QA_REPORT_2026_05_20.md`
- `POS3_0_BUG_097_BUCKET_5_PLANNING_NOTES_2026_05_20.md`
- `POS3_0_BUG_097_SESSION_SUMMARY_2026_05_20.md`

### BUG-099 Docs
- `POS3_0_BUG_099_QSR_QUICK_BILLING_UX_DECISION_PLAN_2026_05_19.md`
- `POS3_0_BUG_099_REVISED_IMPLEMENTATION_REPORT_2026_05_19.md`
- `POS3_0_BUG_099_REVISED_QA_HANDOFF_2026_05_19.md`

### BUG-104 Docs
- `POS3_0_BUG_104_ANALYSIS_2026_05_20.md`
- `POS3_0_BUG_097_104_CONTINUATION_PLANNING_2026_05_20.md`
- `POS3_0_BUG_097_104_QUESTION_CLEARANCE_2026_05_20.md`

### Production Hotfix Docs
- `PROD_BUG_001_AUTO_SETTLE_SMOKE_QA_REPORT_2026_05_20.md`
- `PROD_BUG_002_AUTO_KOT_AUTO_BILL_TRIGGER_INVESTIGATION_2026_05_21.md`
- `PROD_BUG_002_SETTLE_PRINT_GUARD_RUNTIME_QA_CHECKLIST_2026_05_21.md`
- `PROD_BUG_003_PAYLATER_TABLE_CLEAR_IMPLEMENTATION_REPORT_2026_05_21.md`
- `PROD_BUG_003_PAYLATER_TABLE_CLEAR_QA_HANDOFF_2026_05_21.md`
- `PROD_BUG_003_BACKEND_ACTION_ITEMS_2026_05_21.md`
- `PROD_HOTFIX_001_CONSOLIDATED_PLANNING_AND_QUESTION_CLEARANCE_2026_05_20.md`

### Code Inspected
No code directly inspected in this reconciliation pass. All code evidence is carried forward from the detailed reconciliation docs listed above.

---

## 3. Executive Summary

| Metric | Count | Items |
|---|---|---|
| Total POS3.0 items | **22** | 13 bugs + 9 CRs |
| Implemented + owner-confirmed | **8** | BUG-087, 088, 089, 098, 099, 100, 102, 103 |
| Implemented, owner-smoke pending | **1** | BUG-097 |
| Partially implemented | **1** | BUG-096 |
| Planning complete, ready for implementation | **1** | BUG-095 |
| Backend-blocked | **6** | BUG-090, 091, 092, 093, 094, 101 |
| CRM-blocked | **3** | BUG-106, 107, 108 |
| Owner scope needed (XL modules) | **2** | BUG-104, 105 |
| Production hotfixes (separate) | **3** | 1 closed, 1 runtime-QA-pending, 1 FE-verified/BE-followup-open |

**Headline:** The POS3.0 sprint has shipped the 4 FE quick-win bugs (Bucket A), 2 critical joint bugs (BUG-087 PayLater, BUG-088 Room Transfer v2), BUG-098 (CRM token), and BUG-099 (QSR Quick Billing). BUG-097 (delivery lifecycle) is the most advanced CR — mostly implemented with 3 patches shipped on 2026-05-21, but has one parked gate (CartPanel Collect Bill disabled rule) awaiting owner reconciliation and Bucket 5 backend-blocked. The remaining bugs and CRs are backend/CRM/owner-gated.

---

## 4. POS3.0 Full Item Inventory

### Bug Fixes (BUG-087 → BUG-095, BUG-100 → BUG-103)

| Item | Type | Current Status | Evidence | Remaining Work | Next Gate |
|---|---|---|---|---|---|
| BUG-087 | Bug (P0) | `implemented_owner_confirmed` | Complete Sprint Impl Report §4; PayLater field mapping, serve path, settle button, context clearing all shipped. Payload validated against production. | None (FE side) | Closed for FE |
| BUG-088 | Bug (P1) | `implemented_owner_confirmed` | Complete Sprint Impl Report §4; v2 endpoint live, socket confirmed by owner (console: `update-order` with fOS=6 and full payload). Optimistic clearing redundant but not yet removed (BUG-095 scope). | Optimistic clearing removal deferred to BUG-095 | BUG-095 dependency |
| BUG-089 | Bug (P1) | `implemented_owner_confirmed` | Bucket A implementation; dedup guard in `socketHandlers.js` for v2 events. | None | Closed |
| BUG-090 | Bug (P2) | `backend_blocked` | Master Plan §5 Bucket C; backend must accept `customer_id` in room check-in API. Q-090-1 sent, Q-090-B-1 open. | Backend ships `customer_id` acceptance → FE adds field to payload | Backend answers Q-090-B-1 |
| BUG-091 | Bug (P2) | `backend_blocked` | Master Plan §5 Bucket C; CRM team must deduplicate search results. | Backend CRM dedup | Backend ships fix |
| BUG-092 | Bug (P2) | `backend_blocked` | Master Plan §5 Bucket C; phone format contract undefined. | Backend clarifies `+91` vs raw 10 digits | Backend answers Q-092-1 |
| BUG-093 | Bug (P3) | `backend_blocked` | Master Plan §5 Bucket C; `room_info.checkin_date` not in API response. | Backend adds field | Backend ships field |
| BUG-094 | Bug (P3) | `backend_blocked` | Master Plan §5 Bucket C; `delivery-assign-order` socket needs full payload. | Backend adds payload to socket event | Backend answers Q-094-1 |
| BUG-095 | Bug (P2) | `planning_complete_ready_for_implementation` | Master Plan §5 Bucket D; sequential cleanup after BUG-088+089. Both prerequisites are now green. | Delete `handleUpdateFoodStatus`, `fetchSingleOrderForSocket`, `UPDATE_FOOD_STATUS` event | Grep verification then implement |
| BUG-100 | Bug (P1) | `implemented_owner_confirmed` | Bucket A; 11 duplicate toasts removed, toast position unified to top-right. | None | Closed |
| BUG-101 | Bug (P3) | `backend_blocked` | Master Plan §5 Bucket C; confirmed missing by owner on 2026-05-18 — print template has no `delivery_charge_gst_amount` slot. Q-101-1 open. | Backend adds print template slot | Backend ships template update |
| BUG-102 | Bug (P0) | `implemented_owner_confirmed` | Bucket A + corrective; 8s timeout replaced with immediate reset + 2s fallback on both OrderCard and TableCard. Spinner replaces text. | None | Closed |
| BUG-103 | Bug (P2) | `implemented_owner_confirmed` | Bucket A; global CSS rule in `index.css` hiding `input[type=number]` spinners. | None | Closed |

### Change Requests (BUG-096 → BUG-099, BUG-104 → BUG-108)

| Item | Type | Current Status | Evidence | Remaining Work | Next Gate |
|---|---|---|---|---|---|
| BUG-096 | CR (P1) | `partially_implemented` | Session Summary: `ADD_CUSTOM_ITEM` v1→v2 endpoint done. Socket event names for menu updates still unknown. | FE subscribes to menu update + hold/unpaid order socket events | Owner provides socket event names (BQ-CR-01/02/03) |
| BUG-097 | CR (P1) | `implemented_owner_smoke_pending` | 3-Item patch + Rider-on-the-Way fOS=5 patch both implemented. CartPanel Collect Bill gate PARKED (owner reconciliation needed — Options A/B/C/D). Bucket 5 backend-blocked. | Owner smoke QA (25-row checklist); CartPanel gate reconciliation; Bucket 5 after backend | Owner smoke → CartPanel gate decision → Bucket 5 after backend |
| BUG-098 | CR (P1) | `implemented_owner_confirmed` | Complete Sprint Impl Report §4; CRM token from login response via `authTransform.js` + `crmAxios.js` rewrite. Clean removal of env-based keys. | None | Closed for FE |
| BUG-099 | CR (P1) | `implemented_owner_confirmed` | Session Summary 2026-05-19/20; QSR toggles, QsrBillingSection, handleQsrCollectBill with `placeOrderWithPayment`, Hold(PayLater) pill, no tip in QSR, empty cart clean state. Owner smoke tested — PASS. | None | Closed |
| BUG-104 | CR (P1) | `owner_scope_needed` | `POS3_0_BUG_104_ANALYSIS_2026_05_20.md` — analysis with 4 owner screenshots, scope clarified, 5 open questions. Sidebar placeholder exists. | Full module scope session + API catalog | Owner scope session (OQ-CR-04/05) |
| BUG-105 | CR (P1) | `owner_scope_needed` | CR Master Planning §10; no route, no sidebar entry, no APIs. FilterBar L302 "TAB Settlement - Removed as per user request". | Full module scope session + API catalog | Owner scope session (OQ-CR-06/07/08) |
| BUG-106 | CR (P2) | `CRM_blocked` | CR Master Planning §10; CRM Notes API endpoint and response shape unknown. | CRM API docs → FE implementation | CRM team provides API docs (CQ-CR-01/02) |
| BUG-107 | CR (P2) | `CRM_blocked` | CR Master Planning §10; CRM insights/favorites API endpoints unknown. | CRM API docs → FE implementation | CRM team provides API docs (CQ-CR-03/04) |
| BUG-108 | CR (P1) | `CRM_blocked` | CR Master Planning §10; 6+ CRM endpoints unknown. Existing UI scaffolding in CollectPaymentPanel (local/mock data). | CRM API docs → replace mock data with real APIs | CRM team provides API docs (CQ-CR-05 through CQ-CR-13) |

---

## 5. Production Hotfix Status

| Hotfix | Status | Evidence | Remaining Work | Next Gate |
|---|---|---|---|---|
| PROD-BUG-001 Auto Settle | `closed` | `PROD_BUG_001_AUTO_SETTLE_SMOKE_QA_REPORT_2026_05_20.md` — all 10 test cases PASS (static + live). Owner live-verified 2026-05-20. New `autoSettlePrefs.js`, StatusConfigPage toggle, DashboardPage useEffect with idempotency guard, button hide on OrderCard/TableCard. | None | Closed |
| PROD-BUG-002 Settle Print Guard | `investigated_no_code_fix_needed_runtime_QA_pending` | `PROD_BUG_002_AUTO_KOT_AUTO_BILL_TRIGGER_INVESTIGATION_2026_05_21.md` — investigation confirmed `paid-prepaid-order` endpoint does NOT trigger server-side print. `PROD_BUG_002_SETTLE_PRINT_GUARD_RUNTIME_QA_CHECKLIST_2026_05_21.md` created with 25 runtime test rows across 6 groups (A-F). No code fix was needed. | Runtime QA execution (25-row checklist needs live orders + printer/DevTools). | Owner/QA executes runtime checklist |
| PROD-BUG-003 PayLater Table Clear | `frontend_hotfix_owner_verified_backend_followup_open` | `PROD_BUG_003_PAYLATER_TABLE_CLEAR_IMPLEMENTATION_REPORT_2026_05_21.md` — root cause: backend emits PayLater settle on `update-order` channel (not `update-order-paid`). FE fix: `isPayLaterViaHold` check in `socketHandlers.js` (~7 lines). Owner live-verified. | Backend should emit on `update-order-paid` channel (P1 backend follow-up). Polling reconciliation PayLater distinction (P2 FE follow-up). | Backend ships channel fix |

---

## 6. BUG-097 Detailed Status

### 6.1 What was BUG-097?
BUG-097 covers the **delivery order lifecycle inside the cashier POS app** — what the cashier sees and clicks from the moment food is ready through rider assignment, dispatch, rider pickup, and bill collection. The core problem was that delivery orders had placeholder `console.log` buttons for Dispatch/Assign Rider with no API integration, and the order card showed incorrect actions (e.g., "Serve" instead of rider-aware states).

### 6.2 What has been implemented?
- **Profile-driven branching**: `delivery_assign` from restaurant profile determines Dispatch vs Assign Rider (not `source`/`isOwn`/`order_in`).
- **Dispatch button + API**: PUT `order-status-update` on OrderCard and TableCard for `delivery_assign=No` restaurants.
- **Assign Rider modal + API**: `AssignRiderModal.jsx` (232 lines) with POST `delivery-employee-list` and POST `delivery-order-assign` (v2 URLs). Mounted on both cards.
- **Socket payload handling**: `delivery-assign-order` uses payload directly (no redundant GET).
- **Optimistic update**: Immediate context merge after assign API success.
- **Waiting for Rider state**: Disabled "Waiting for Rider"/"Waiting.." when `riderStatus === 'riderAssigned'`.
- **Reassign branching**: When `riderStatus !== 'riderAssigned'` (e.g., rider accepted), button becomes clickable "Reassign" opening the modal. (3-item patch, 2026-05-21)
- **Rider pill rename**: "Reached" → "Order Accepted" on OrderCard rider chip. (3-item patch, 2026-05-21)
- **CartPanel label**: "Delivered" → "Collect Bill" for delivery orders. (3-item patch, 2026-05-21)
- **Card fOS=5 label**: Reverted from "Handover" to "Bill" for all order types. (2026-05-21)
- **`riderReached` → `dispatched` rename**: Transform semantic unification — rider-pickup and manual-dispatch both map to `'dispatched'`. (Rider-on-the-Way patch, 2026-05-21)
- **fOS=5 + dispatched carve-out**: OrderCard shows "Rider is on the way" (disabled); TableCard shows "On the way.." (disabled) when delivery order at fOS=5 has `riderStatus === 'dispatched'`. (Rider-on-the-Way patch, 2026-05-21)
- **KOT hidden**: For delivery action states at fOS=2 and fOS=5.
- **DeliveryCard.jsx**: Kept as legacy/untouched per owner directive.

### 6.3 What the latest Rider On The Way patch changed
The fOS=5 + `'riderReached'`→`'dispatched'` rename patch (2026-05-21):
1. `orderTransform.js`: Rule 1 now maps `delivery_man_id + delivery_man_status === 'Yes'` → `'dispatched'` (was `'riderReached'`). Both rider-pickup and manual-dispatch share the same value.
2. `OrderCard.jsx`: Pill condition updated to `=== 'dispatched'`; testid renamed; new fOS=5 outer ternary shows "Rider is on the way" (disabled) when `isDelivery && riderStatus === 'dispatched'`.
3. `TableCard.jsx`: Matching fOS=5 outer ternary shows "On the way.." (disabled).
4. Build: PASS (0 errors, 452.25 kB).

### 6.4 What owner smoke QA is pending
- **25-row Rider-on-the-Way smoke checklist** (`POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md`) — covers net-new behaviors (rows 1-4), fOS=2 regressions (rows 5-10), CartPanel + non-delivery regressions (rows 11-17), KOT/permission regressions (rows 18-21), optimistic+socket regressions (rows 22-24), and build (row 25).
- **Dispatch flow smoke** for a `delivery_assign=No` tenant — flagged as `not_tested` in QA v5.
- **CartPanel Collect Bill delivery+postpaid gate** — PARKED (`parked_awaiting_owner_reconciliation_decision`). Owner must pick Option A/B/C/D to resolve conflict between the fOS=5 dashboard card carve-out and the new CartPanel disable rule. See `POS3_0_BUG_097_CARTPANEL_COLLECT_BILL_DELIVERY_POSTPAID_GATE_PARKED_2026_05_21.md`.

### 6.5 What remains backend-blocked (Bucket 5)
- **BQ-097-2**: Rider accept socket event name + payload.
- **BQ-097-3**: Rider reject socket event name + payload.
- **BQ-097-4**: `rejected_delivery_man_ids` in socket payload for grey-out in modal.
- **BQ-097-5**: Whether `delivery_man` is cleared/preserved on reject.
- **Customer-received/final handover-complete exit signal**: Backend has not stated how the transition out of "Rider is on the way" is signalled (fOS advancement, new `delivery_man_status` value, or new socket event).

### 6.6 What should not be touched
- `DeliveryCard.jsx` — owner directive: do not delete, do not switch to.
- `/app/memory/final/` — owner directive: do not update for BUG-097 work.
- Bucket 5 items — do not implement until backend supplies event names/payloads.
- Residual `'riderReached'` in `mockOrders.js` and `statusHelpers.js` — hygiene follow-up CR, not part of active work.

---

## 7. Open QA / Smoke Gates

| # | Item | Type | Checklist Doc | Status |
|---|---|---|---|---|
| 1 | BUG-097 Rider-on-the-Way fOS=5 + rename | Owner smoke (25 rows) | `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md` | **NOT EXECUTED** — pending owner |
| 2 | BUG-097 Dispatch flow (`delivery_assign=No` tenant) | Owner smoke | Covered by checklist row 10 above | **NOT TESTED** (per QA v5) |
| 3 | PROD-BUG-002 Settle Print Guard | Runtime QA (25 rows, 6 groups) | `PROD_BUG_002_SETTLE_PRINT_GUARD_RUNTIME_QA_CHECKLIST_2026_05_21.md` | **NOT EXECUTED** — needs live orders + printer |
| 4 | BUG-097 CartPanel Collect Bill gate | Owner reconciliation decision (A/B/C/D) | `POS3_0_BUG_097_CARTPANEL_COLLECT_BILL_DELIVERY_POSTPAID_GATE_PARKED_2026_05_21.md` | **PARKED** — owner must pick option |

---

## 8. Backend / API / CRM Blockers

### Backend Blockers

| # | Blocker ID | Bug/CR | Question | Status |
|---|---|---|---|---|
| 1 | Q-090-B-1 | BUG-090 | Does check-in API accept `customer_id`? Field name? | Open |
| 2 | Q-092-1 | BUG-092 | Phone format: `+91` or raw 10 digits? | Open |
| 3 | Q-094-1 | BUG-094 | Can backend add full payload to `delivery-assign-order` socket? | Open |
| 4 | Q-101-1 | BUG-101 | Add `delivery_charge_gst_amount` slot to print template | Owner-confirmed missing; backend must add |
| 5 | BQ-097-2 | BUG-097 Bucket 5 | Rider accept socket event name + payload | Open |
| 6 | BQ-097-3 | BUG-097 Bucket 5 | Rider reject socket event name + payload | Open |
| 7 | BQ-097-4 | BUG-097 Bucket 5 | `rejected_delivery_man_ids` in payload | Open |
| 8 | BQ-097-5 | BUG-097 Bucket 5 | `delivery_man` cleared/preserved on reject? | Open |
| 9 | BQ-CR-01/02/03 | BUG-096 | Socket event names + payload for menu updates + hold/unpaid orders | Open |
| 10 | BQ-CR-04-08 | BUG-097 (pre-existing) | Delivery dispatch/assign API docs (partially resolved — APIs working, deeper docs for Bucket 5 needed) | Partially resolved |
| 11 | BQ-CR-09/10/11 | BUG-098 (pre-existing) | Profile CRM key field | **RESOLVED** — `crm_token` from login response |
| 12 | PROD-BUG-003 BE | PROD-BUG-003 | Backend should emit PayLater settle on `update-order-paid` channel | Open (P1 backend follow-up) |

### Backend-Only Items (BUG-091, BUG-093)

| # | Bug | Description | FE Impact |
|---|---|---|---|
| 1 | BUG-091 | CRM search API dedup | Optional FE client-side dedup after backend ships |
| 2 | BUG-093 | `room_info.checkin_date` in API response | FE prefers field over `createdAt` fallback |

### CRM Blockers

| # | Bug | Questions | Status |
|---|---|---|---|
| 1 | BUG-106 | CRM Notes API (CQ-CR-01/02) | Open — CRM team |
| 2 | BUG-107 | CRM Insights API (CQ-CR-03/04) | Open — CRM team |
| 3 | BUG-108 | CRM Coupon/Loyalty/Wallet APIs (CQ-CR-05 through CQ-CR-13) | Open — CRM team |

### Owner Scope Required

| # | Bug | What's Needed |
|---|---|---|
| 1 | BUG-104 | Credit/Tab Management module — screens, flows, APIs (OQ-CR-04/05) |
| 2 | BUG-105 | Settlement module — screens, flows, APIs, permissions (OQ-CR-06/07/08) |

---

## 9. Parked / Deferred Items

| # | Item | Reason | Resume Condition |
|---|---|---|---|
| 1 | BUG-097 Bucket 5 (rider accept/reject/grey-out) | Backend has not supplied socket event names or payloads | Backend answers BQ-097-2/3/4/5 |
| 2 | BUG-097 CartPanel Collect Bill gate | Owner reconciliation needed (Options A/B/C/D conflict) | Owner picks option in sign-off block |
| 3 | BUG-095 (socket handler cleanup) | Sequential dependency on BUG-088+089 (both now green) | Can be picked up now — grep verification needed |
| 4 | BUG-097 `'riderReached'` hygiene cleanup | Residual references in `mockOrders.js` + `statusHelpers.js` | Separate hygiene CR |
| 5 | BUG-097 rider-name-disappears observation | No reproducer captured | Live console debug session |

---

## 10. Conflicts / Doc Drift

| # | Conflict | Latest Truth | Stale Doc |
|---|---|---|---|
| 1 | Owner Smoke QA Report v5 references "Handover" label for delivery fOS=5 | Code shows "Bill" (reverted 2026-05-21) | `POS3_0_BUG_097_OWNER_SMOKE_QA_REPORT_2026_05_20.md` v5 §4D |
| 2 | Session Summary §3 Item 2 describes fOS=5 as "Handover" for delivery | Code shows "Bill" | `POS3_0_BUG_097_SESSION_SUMMARY_2026_05_20.md` §3 |
| 3 | Handover §3 Bucket 3 row uses strikethrough for "Handover"→"Bill" revert | Code is "Bill". Strikethrough easily missed | `POS3_0_BUG_097_IMPLEMENTATION_AGENT_HANDOVER_2026_05_20.md` §3 |
| 4 | 3-Item checklist rows 11+16 reference `'riderReached'` token | Transform now uses `'dispatched'` | `POS3_0_BUG_097_3_ITEM_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md` — superseded by Rider-on-the-Way checklist |
| 5 | CartPanel gate parked doc conflicts with fOS=5 card carve-out | Both patches live in code, but UX is contradictory at fOS=5 — card hides Bill when dispatched, CartPanel enables Bill when dispatched | `POS3_0_BUG_097_CARTPANEL_COLLECT_BILL_DELIVERY_POSTPAID_GATE_PARKED_2026_05_21.md` §3 |
| 6 | Older BUG-097 planning docs mention `riderReached` / `Handover` / `Delivered` semantics | All replaced: `riderReached`→`dispatched`, `Handover`→`Bill`, `Delivered`→`Collect Bill` | Various pre-2026-05-21 BUG-097 docs |

**Code is the implementation truth in all cases.** Doc drift is cosmetic except for conflict #5 which is a live UX inconsistency requiring owner decision.

---

## 11. Recommended Next Sequence

### Immediate QA Gates (no implementation needed)

1. **Owner smoke BUG-097 Rider-on-the-Way patch** — execute the 25-row checklist. If PASS → BUG-097 advances to `bug_097_implemented_owner_smoke_passed_bucket_5_blocked`.
2. **Runtime QA PROD-BUG-002 Settle Print Guard** — execute the 25-row runtime checklist with live orders. If PASS → `prod_bug_002_no_code_fix_needed_runtime_QA_passed`.
3. **Owner decision: BUG-097 CartPanel Collect Bill gate** — pick Option A/B/C/D from the parked approval plan §8 sign-off block.

### Implementation Gates (ready now)

4. **BUG-095 socket handler cleanup** — both prerequisites (BUG-088 + BUG-089) are now green. Grep-verify `fetchSingleOrderForSocket` has no live consumers, then delete dead code. ~0.5 day.
5. **After CartPanel gate decision** — implement chosen option (A/B/C/D) for CartPanel Collect Bill disabled rule. ~0.5 day.

### Backend / API Follow-ups

6. **Backend: PROD-BUG-003 channel fix** — emit PayLater settle on `update-order-paid` (P1).
7. **Backend: BUG-097 Bucket 5 event contracts** — supply BQ-097-2/3/4/5 answers to unblock rider accept/reject sockets.
8. **Backend: BUG-090 Q-090-B-1** — confirm `customer_id` acceptance in check-in API.
9. **Backend: BUG-096 BQ-CR-01/02/03** — supply socket event names for menu + hold/unpaid order updates.
10. **CRM team: BUG-106/107/108** — supply all CRM API documentation.
11. **Owner: BUG-104 + BUG-105 scope sessions** — define module screens, flows, APIs.

### Parked Items

12. Keep Bucket 5 (BUG-097) blocked until backend supplies socket contracts.
13. Keep BUG-090/091/092/093/094/101 blocked until backend answers.
14. Keep BUG-104/105 parked until owner scope sessions.
15. Keep BUG-106/107/108 parked until CRM API docs arrive.

---

## 12. Final Status

**`pos3_complete_status_reconciled_with_open_smoke_gates`**

Justification: The sprint has clear forward progress — 8 items fully implemented and owner-confirmed, BUG-097 substantially built with 2 smoke gates open, 3 production hotfixes triaged. Two smoke gates (BUG-097 Rider-on-the-Way, PROD-BUG-002 runtime) are ready for execution. One owner decision (CartPanel gate) is required. No conflicting owner decisions found — only documentation-version drift and one UX inconsistency requiring reconciliation.

---

### Output Document

`/app/memory/change_requests/final_sprint_reconciliation/POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md`

### Confirmations

- No code was changed in this pass.
- `/app/memory/final/` was NOT updated.
- Baseline docs were NOT updated.
- No QA was executed.
- No implementation was performed.

*— POS3.0 Complete Sprint Status Reconciliation — 2026-05-21 —*
