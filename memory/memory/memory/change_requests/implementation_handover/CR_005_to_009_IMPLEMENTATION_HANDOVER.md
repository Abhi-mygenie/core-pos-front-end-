# Implementation Handover — CR-005 to CR-009 + 2 Standalone Tickets

**Author:** Senior Implementation Planning Agent
**Date:** 2026-05-02 (revised same day to add 2 standalone tickets)
**Scope:** Planning & handover only. **No code changes performed.**
**Repo / Branch:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` @ `1-may`
**Commit at planning time:** `cdafd2c56d047827233a7376853255338a385090` (clean working tree)

**Standalone tickets included** (each is fully self-contained, ready to apply):
- **UI-COD-MASK** (May-2026) — `/app/memory/UI_COD_MASK_HANDOVER.md`
- **ROLE-NAME-WIRE-FIX** (May-2026) — `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md`

---

## 0. Documents read

### 0.1 User-shared CR docs (in user-specified order)
1. `/app/memory/change_requests/CR_005_AUDIT_REPORT_PG_LIFECYCLE_AND_USER_ATTRIBUTION.md`
2. `/app/memory/change_requests/CR_006_VARIATION_MODAL_OPTIONAL_AND_MULTISELECT.md`
3. `/app/memory/change_requests/CR_007_ORDERID_VISIBILITY_AND_PRINT_BILL_IN_ORDER_ENTRY.md`
4. `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`
5. `/app/memory/change_requests/CR_009_OPERATIONS_AUDIT_TIMELINE.md`

### 0.2 Baseline / approved guideline docs (`memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md` — approval baseline + mandatory reading order
- `ARCHITECTURE_DECISIONS_FINAL.md` — architecture rules, hotspots, guardrails
- `MODULE_DECISIONS_FINAL.md` — module boundaries (Reports, Order Entry, Realtime, etc.)
- `CHANGE_REQUEST_PLAYBOOK.md` — analysis workflow
- `IMPLEMENTATION_AGENT_RULES.md` — pre-coding/planning/testing rules + Approval Gate format
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — frozen / deferred owner decisions
- `FINAL_DOCS_SUMMARY.md` — summary

### 0.3 Recent handovers (`memory/handover/`)
- `IMPLEMENTATION_SEQUENCE_INDEX.md` — CR-001 → CR-004 → CR-003 sequencing
- `REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` — **no-fallback policy** for reports
- `REPORTS_BACKEND_NOTE_2026-05-01.md` — open BE asks (`cancel_by_name`, `discount_amount`, etc.)
- `REPORTS_QA_HANDOVER_2026-05-01.md` — verified shipped fields: `waiter_name`, `table_name`, item-level `cancel_type`, `employee_name` (paid), `room_info` on RM rows
- `CR_001_IMPLEMENTATION_HANDOVER.md` — Audit Report foundation (filters, badges)
- `CR_003_IMPLEMENTATION_HANDOVER.md` — paymentMutationService + paid/hold actions
- `CR_004_IMPLEMENTATION_HANDOVER.md` — Room Orders report

### 0.3.1 Standalone tickets (`memory/`)
- `UI_COD_MASK_HANDOVER.md` — single-file display fix in `OrderTable.jsx::renderCell('paymentMethod')`. Self-contained, +5 LOC, low risk.
- `ROLE_NAME_WIRE_FIX_HANDOVER.md` — switch `role_name` wire value to `permissions?.[0] || 'Manager'` across 4 endpoints. 14 edits across 5 files. Low risk (current `owner@18march.com` already sends `Manager` on the fetch path).

### 0.4 Missing documents
None. All user-requested CR docs and all baseline / handover docs are present.

---

## 1. Requirement understanding (per CR)

### CR-005 — Audit Report PG, Lifecycle, User Attribution
**Five sub-requirements:**

| # | Title | FE/BE | Status in CR doc |
|---|---|---|---|
| 1 | 3 PG columns on Audit table (PG Order Id / PG Amount / PG Status) | FE + BE-10 | Locked |
| 2 | Web order attribution: `Customer` punched / `Auto`-confirm / POS confirmer in PUNCHED BY + ACTIONED BY | FE + BE-2 | Locked |
| 3 | PG fields in `/get-single-order-new` side panel | — | **PARKED** |
| 4 | Item + order-level lifecycle: Order Taken → Ready → Served → Paid (+ Cancelled) | FE + BE-3, BE-4, BE-9 | Locked |
| 5 | Cancelled-by / Ready-by / Served-by name (item + order level) | FE + BE-5, BE-6, BE-7 | Locked |

**Frontend scope:** transform pass-through + table column conditional render + side-panel timeline expansion + name lookups.
**Backend dependency:** BE-2 (POS confirmer name), BE-3 (per-item paid_at), BE-5/6/7 (name fields), BE-9 (order-level lifecycle keys), BE-10 (PG snapshot). BE-1 already shipped.

### CR-006 — Variation Modal Optional + Multi-select
**Two bugs (frontend-only):**
1. Optional variation auto-pre-selects first option (wrong order data).
2. Multi-select variation groups not supported (UI single-select only).

Backend already ships `type` (`single`/`multi`), `required`, `min`, `max` per group. No backend dependency.

### CR-007 — Order ID visibility + Print Bill in Order Entry
**Three issues (frontend-only):**
1. Order ID missing on dashboard order card header.
2. Order ID missing on Order Entry right panel header (mirror `#<orderNumber>` chip from CollectPaymentPanel L579).
3. Print Bill button missing in Order Entry — must reuse `OrderCard.handlePrintBill` (L120-138) verbatim. **No live overrides.**

Zero backend dependency.

### CR-008 — Delivery, Audit time, Dispatch, Navigation (4 sub-CRs)
| Sub-CR | Title | FE-only? | Backend dep |
|---|---|---|---|
| #1 | Delivery charges at order placement | Partially | BE: delivery-fee formula + restaurant origin coords |
| #2 | Audit Report ACTION TIME + TIME DIFF columns | **Yes** | None |
| #3 | Delivery dispatch + assign-rider integration | No | **Blocked** — 5 endpoints + schemas |
| #4 | Default landing screen + post-action navigation matrix | Partially | BE: `default_landing_screen` setting key |

### CR-009 — Operations Audit Timeline (additive)
Backend already ships `operations[]` array on `/order-logs-report`; frontend consumes none of it. Goal: render an Operations timeline section in Audit Report side panel covering ~13 operation types (mark unpaid, payment-method-change, item-cancel, order-cancel, transfer, merge, ready/serve, collect-bill, split-bill, tab-out, etc.).

**Blocked on backend contract** — BE-11/12/13/14 (canonical operation string set, name field, timestamp field name, split-bill child IDs).

---

## 2. Current code findings (validated against `/app` @ `1-may`)

> All file/line references below were re-verified against the current branch.

### 2.1 `frontend/src/api/services/reportService.js` (1244 LOC)
- **L759-760:** `razorpay_order_id` and `isPaymentGateway` already extracted.
- **L824:** `punchedBy = api.waiter_name || ''` — **does NOT** yet have web/`Customer` rule for CR-005 Req #2.
- **L843-880:** `actionedBy` resolver branches by status — does NOT consume `is_auto_confirmed` or POS confirmer name.
- **L897-933:** transformed row already exposes `channel`, `platform`, `razorpayOrderId`, `isPaymentGateway`, `cancellationReason`, `cancellationType`. Missing: PG amount, PG status, lifecycle ts, `cancelByName` (order-level).
- **L1127:** comment mentions "operations" — **no real consumer of `operations[]` exists.**

### 2.2 `frontend/src/api/transforms/reportTransform.js` (728 LOC)
- **L453-638 `singleOrderNew`:**
  - L466-481 derives `firstReadyAt`, `lastServeAt`, `firstCancelAt` from item array — CR-005 Req #4 D3 says "no frontend derivation". Plan: keep as graceful fallback until BE-9 lands; consume API order-level keys when present.
  - L562-569 timeline shape: `created`, `ready`, `served`, `paid`, `cancelled`, `merged` — already 4-stage. Item-level paid timestamp NOT present.
  - L620-628 item-level: `readyAt`, `serveAt`, `cancelAt`, `cancelBy`, `cancelByName` — `cancelByName` still falls back to `Employee #<id>` (must drop per `REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` §0 no-fallback policy).
  - Missing fields to add: `readyByName`, `servedByName`, item-level `paidAt`, top-level `cancelledByName`, top-level `operations[]`.

### 2.3 `frontend/src/api/transforms/productTransform.js`
- **L155-166:** `variations` transform already exposes `type`, `required`, `min`, `max`. **No change needed.**

### 2.4 `frontend/src/api/transforms/orderTransform.js` (1432 LOC)
- **L680, L753:** `delivery_charge: 0` hardcoded in `placeOrder` and `updateOrder` payload builders. CR-008 #1 needs to thread real value.
- **L1219-1220, L1406:** `deliveryCharge` already flows correctly through bill-print and payment paths.

### 2.5 `frontend/src/components/order-entry/ItemCustomizationModal.jsx` (555 LOC)
- **L7:** `selectedVariants = {}` shape `{ groupId: option }` — single-only.
- **L32-40:** initializer pre-selects `group.options[0]` for **every** group regardless of `required`. **Confirmed bug.**
- **L86-88, L100-102, L162-167, L339-367:** all assume single-option-per-group; no multi/checkbox path; no `(Optional)` header label.

### 2.6 `frontend/src/components/reports/OrderTable.jsx` (792 LOC)
- **L113-135:** column definitions — no `pgOrderId`/`pgAmount`/`pgStatus`, no `actionTime`/`timeDiffMin`.
- Cancelled tab (L162-169) already has `cancellationReason` + `cancellationType` columns (CR-001 Phase 2 wired).

### 2.7 `frontend/src/components/reports/OrderDetailSheet.jsx` (779 LOC)
- **L248-319 `ItemTimeline`:** 4 stages — Created → Ready → Served → Cancelled. CR-005 wants Order Taken → Ready → Served → Paid (+ Cancelled).
- **L355-362:** item-level "Cancelled By: <cancelByName || '—'>" already wired.
- **L403-417 `CancellationAlert`:** shows time only — needs `Cancelled By: <name>` line.
- No "Operations" section anywhere — CR-009 net-new.

### 2.8 `frontend/src/components/reports/FilterBar.jsx` (406 LOC)
- **L131-145:** `paymentGateway` filter already wired as 2-checkbox (`null` / `'gateway'`). PG checkbox state IS the signal CR-005 Req #1 needs to toggle the 3 new columns. **No change to filter — only OrderTable consumes it.**

### 2.9 `frontend/src/components/cards/OrderCard.jsx` (763 LOC)
- **L74:** `orderId = order.orderId || order.id` — already resolved.
- **L120-138 `handlePrintBill`:** exact pattern CR-007 wants Order Entry to copy verbatim.
- **L278-320 header:** no order-id text rendered. CR-007 Issue #1 surface.

### 2.10 `frontend/src/components/order-entry/CartPanel.jsx` (829 LOC)
- **L271 `orderId` prop** is received but only passed to `<RePrintOnlyButton orderId={orderId} />` (L649, L685).
- **No top header row** with `#<orderId>` chip — CR-007 Issue #2 needs new chip.
- **L683:** `RePrintOnlyButton` is gated by `canPrintBill` — same gate to be reused for new `PrintBillButton`.

### 2.11 `frontend/src/components/order-entry/RePrintButton.jsx` (179 LOC)
- Exports `RePrintOnlyButton` (KOT only) + `KotBillCheckboxes`. CR-007 will add a new export `PrintBillButton`.

### 2.12 `frontend/src/components/order-entry/AddressFormModal.jsx` / `AddressPickerModal.jsx`
- Google Places Autocomplete loaded (`AddressFormModal.jsx:17-32`); **no Distance Matrix call**. No delivery-charge field surfaced anywhere on Order Entry.

### 2.13 `frontend/src/components/order-entry/OrderEntry.jsx` (1963 LOC)
- 8 hardcoded `onClose()` redirect points confirmed: L797, 802, 838, 864, 887, 913, 937, 1371, 1478. **Direct callsites — CR-008 #4 must replace destination, NOT timing.**

### 2.14 `frontend/src/components/cards/DeliveryCard.jsx` (223 LOC)
- L188-196: "Assign Rider" / "Dispatch" buttons exist but are `console.log`-only stubs. CR-008 #3 surface.

### 2.15 Sockets & dispatch
- `api/socket/socketEvents.js:62`: `DELIVERY_ASSIGN_ORDER` (inbound) — handler at `socketHandlers.js:631` already wired.
- **No outbound** assign/dispatch service exists. `api/services/deliveryService.js` and `components/modals/AssignRiderModal.jsx` confirmed **MISSING**.

### 2.16 `frontend/src/contexts/RestaurantContext.jsx` (127 LOC)
- L54-59: `settings` only exposes `autoKot`, `autoBill`. No `defaultLandingScreen` key. CR-008 #4 needs new key.

### 2.17 Already-merged work on `1-may` (validated)
- `paymentMutationService.js` ✅ (CR-003)
- `RoomOrdersReportPage.jsx`, `RoomRowCard.jsx` ✅ (CR-004)
- FilterBar PG 2-checkbox toggle ✅ (CR-001 Phase 2)
- Cancelled tab Reason + Status columns ✅ (BE-1 P3, P4 wired)
- Reports `[BE-1 INVARIANT]` / `[BE-1 PENDING]` / `[BE-2 INVARIANT]` diagnostics ✅

---

## 3. Gaps / risks / conflicts

### 3.1 Backend dependencies (blocking or partially-blocking)
| Dep | CR | Required for | Status |
|---|---|---|---|
| BE-2 — POS confirmer name on `/order-logs-report` | CR-005 #2 (Phase B) | POS-confirmed web orders ACTIONED BY | Pending |
| BE-3 — per-item `paid_at` | CR-005 #4 | Item-level Paid stage timestamp | Pending |
| BE-5/6/7 — `cancel_by_name`, `ready_by_name`, `served_by_name` (item + order level) | CR-005 #5 | Replace `Employee #<id>` fallbacks | Pending (item-level `cancel_by_name` partly there per QA handover) |
| BE-9 — order-level `ready_at`/`served_at`/`paid_at` | CR-005 #4 | Eliminate frontend derivation | Pending |
| BE-10 — reliable `snapshot_razorpay_status`, `snapshot_mismatch_flag` | CR-005 #1 | PG Status column literal | Pending |
| BE-A — delivery-fee formula + restaurant origin coords | CR-008 #1 | Distance-based fee compute | Pending |
| BE-B/C/D/E — list-riders / assign-rider / dispatch / rider-status | CR-008 #3 | **HARD-BLOCKING** | **Not yet defined** |
| BE-F — `default_landing_screen` setting key | CR-008 #4 | Persistence (Phase A can stub via localStorage) | Pending |
| BE-11/12/13/14 — operations canonical string set, actor name, timestamp, split-bill children | CR-009 | **HARD-BLOCKING** | Not yet defined |

### 3.2 Conflicts / risks
1. **CR-005 Req #4 D3 vs current code:** "No frontend derivation" but `reportTransform.js:469-481` derives `firstReadyAt`/`lastServeAt` today. **Risk:** removing derivation regresses orders that predate BE-9. **Mitigation:** keep derivation as graceful-degrade fallback; prefer API order-level keys when present (CR explicitly allows `orderDetails[0].order_serve_at` proxy).
2. **No-fallback policy (Reports module, 2026-05-01):** explicitly drops `Employee #<id>` chains in transforms. CR-005 #5 must follow this — render blank, not a synthetic fallback. Conflicts with the existing `cancelByName` line at `reportTransform.js:625-627` that still constructs `Employee #${item.cancel_by}`. **Action:** drop the synthesis when wiring `cancel_by_name` per BE-5.
3. **CR-007 vs Architecture Rule FA-03 (hotspot files):** `OrderEntry.jsx` and `CollectPaymentPanel.jsx` are explicit hotspots. CR-007 only adds tiny chips/buttons in CartPanel and OrderCard — **acceptable**, but follow Approval Gate template before expanding logic.
4. **CR-008 #4 vs Architecture Rule MC-04:** OrderEntry owns transactional workflow. Replacing 8+ `onClose()` callsites is tractable IF we **only swap destination** via a `navigateAfterAction(action)` helper and preserve socket-engage timing. Risk if blanket `onClose` rewrite alters `await waitForOrderEngaged(...)` ordering.
5. **CR-005 + CR-008 #2 column-width risk:** PG columns (3) + Action Time + Time Diff = 5 new columns. Audit table would balloon to 14 columns at peak. CR-005 mitigates via PG-checkbox-bound visibility (3 hidden by default). CR-008 #2 has no toggle — accept extra width; consider compact formatting (`m`).
6. **CR-009 vs CR-005 Req #4:** CR-009 explicitly additive (operations section is layered on top of the 4-stage lifecycle). Both can coexist. Sequencing matters — CR-005 #4 lands first, then CR-009 layers on.
7. **Memory deferred items (`OPEN_QUESTIONS_FINAL_RESOLUTION.md` OD-02 — room billing/print):** none of CR-005..009 touches room billing/print, but verify when implementing CR-008 #1 (delivery is non-room).

### 3.3 Code-vs-doc check (per CHANGE_REQUEST_PLAYBOOK §H)
- All five CRs were validated against current code with line-number anchors. **Code matches doc claims** with one minor delta: `cancellationType` is already wired in OrderTable (CR-005 narrative still describes it as needing to be added — already done by BE-1 P4). **Action:** Implementation Agent must NOT re-add the column.

---

## 4. Clarification questions for user

> All questions grouped per CR. Defaults from the CR docs are noted; user only needs to answer where the default does not match expectation.

### CR-005
- **Q5-A** Phase A only ship today? (Web→`Customer` punched + `is_auto_confirmed`→`Auto` actioned, with confirmer name displayed `—` until BE-2 lands?) Default: **Yes — Phase A only**.
- **Q5-B** Order Taken stage source: keep `created_at`, or wait for `kot_at` from BE-4? Default per CR D4 lock: **`created_at` until `kot_at` ships**.

### CR-006
- **Q6-V1** Single-select **optional** group: clicking the same selected pill toggles it OFF? Default: **Yes**.
- **Q6-V2** Multi-select UI: checkbox rows (matches old POS), or outlined pills with checkmark? Default: **Checkbox rows** (fidelity).
- **Q6-V3** Multi-select with `min=0, max=0` → "no constraints" or "force single"? Default: **No constraints**.
- **Q6-V4** Existing cart-saved single selections — auto-upgrade to array shape on re-edit? Default: **Yes — normalize on read**.
- **Q6-V5** Confirm `orderTransform.js::placeOrder` outbound payload accepts a `labels[]` per group? Default: **Verify with one preprod placement before B-phase ship.**

### CR-007
- **Q7-O1** Order ID display format: `#001285` / `#1285` / `Order 001285`? Default per CR: **`#<restaurantOrderId>`** (matches CollectPaymentPanel).
- **Q7-O2** Order Entry right panel chip lives in CartPanel header (new) or OrderEntry top header? Default: **CartPanel new header chip**.
- **Q7-O3** Print Bill visibility — always (when placed + permission) or only when no unplaced items? Default: **`orderId && canPrintBill && hasPlacedItems`**.

### CR-008 — Sub-CR #1 (Delivery charges)
- **Q8-D1** Fee formula: per-km × distance, rate from restaurant settings (TBD key with backend)? Default: **per-km from restaurant settings**.
- **Q8-D2** Distance Matrix vs haversine? Default: **Distance Matrix (driving)**.
- **Q8-D3** Fallback when Google fails / no coords: editable empty field, manual entry? Default: **Yes**.
- **Q8-D4** Restaurant origin coords — confirm key on restaurant context? Default: **Pending backend confirmation**.
- **Q8-D5** Free-delivery threshold from backend flag? Default: **Yes if backend ships; otherwise off**.

### CR-008 — Sub-CR #2 (Action time)
- **Q8-T1** Time-diff format: `m` / `h:mm` / `1h 23m`? Default per CR: **minutes integer**.
- **Q8-T2** Running rows show `—` or "In progress"? Default: **`—`**.
- **Q8-T3** Column position? Default: **after ACTIONED BY, before PAYMENT**.

### CR-008 — Sub-CR #3 (Dispatch/Assign) — **5 backend questions, blocking**
- Q8-R1..R5: **endpoint URLs, payloads, dispatch vs assign coupling, rider status model, socket vs refetch.** All require backend conversation.

### CR-008 — Sub-CR #4 (Navigation)
- **Q8-N1** Setting scope: per-restaurant / per-user / per-role? Default: **per-restaurant**.
- **Q8-N2** When `orderPage` default and user cancels/transfers, land on fresh order entry or previous table? Default: **Fresh / table picker**.
- **Q8-N3** Post-payment with `orderPage` default — same table or new blank? Default: **New blank**.
- **Q8-N4** Backend settings key name? Default: **`default_landing_screen`**.
- **Q8-N5** Add a third "Stay on screen" option? Default: **No — two states only**.

### CR-009
- **Q9-OP1** Confirm canonical `operation` string set + timestamp field name (`created_at` / `updated_at` / `operation_time`).
- **Q9-OP2** Each op carries `vendor_employee_name`? If only id, BE-12 needed.
- **Q9-OP3** Granularity (`item_cancel` per-item or per-batch?). Default: **Per-item**.
- **Q9-OP4** Surface = side panel only (Phase A) or also dedicated Activity Log page? Default: **Side panel only**.
- **Q9-OP5** Visual: vertical timeline vs table? Default: **Vertical timeline**.
- **Q9-OP6/7/8/9** Export, filtering, retention, perf cap. Defaults per CR §7.

---

## 5. Suggested implementation buckets

> Sized for one-bucket-per-PR. CR-001/003/004 sequencing already shipped on `1-may`. New buckets layer on top.

### Bucket A0 — Standalone tickets (fully self-contained — ship FIRST)

These two tickets are NOT part of CR-005..009. Each handover doc IS its own implementation contract (exact diff, tests, rollback). Implementation Agent must apply them verbatim as documented.

| Item | Source doc | Files | LOC | Risk |
|---|---|---|---|---|
| **A0a — UI-COD-MASK** | `/app/memory/UI_COD_MASK_HANDOVER.md` §5.2 | `OrderTable.jsx` (1 case branch) + new test file | +5 prod / +40 test | **Very low** |
| **A0b — ROLE-NAME-WIRE-FIX** | `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` §4 | `DashboardPage.jsx` (8 edits), `OrderEntry.jsx` (2), `LoadingPage.jsx` (1), `useRefreshAllData.js` (2), `orderService.js` (1) | ~30 net | **Low** |

**Sequencing notes — A0 tickets must land before any CR bucket that touches the same files:**
- `OrderTable.jsx` is touched by **A0a, A3, B2** in that order. Each ticket's diff must be applied to the latest tip; do not parallelise PRs on this file.
- `OrderEntry.jsx` is touched by **A0b** (line 920 `cancelOrder`) and **D1** (8+ `onClose()` callsites). A0b is one-line-per-call; D1 swaps redirect destinations only. **Apply A0b first** so D1's diff stays minimal.
- `LoadingPage.jsx` is touched only by A0b. CR-005..009 do NOT touch LoadingPage.

### Bucket A — Safe frontend-only (zero backend dep) — Ship after A0
| Item | CR | Files | Risk |
|---|---|---|---|
| A1 | CR-006 Phase A (Bug #1: optional auto-select fix) | `ItemCustomizationModal.jsx` (initializer + header label) | **Low** |
| A2 | CR-007 (Issues #1, #2, #3 — order-id chips + Print Bill button) | `OrderCard.jsx`, `CartPanel.jsx`, `RePrintButton.jsx` (new export `PrintBillButton`) | **Low** |
| A3 | CR-008 Sub-CR #2 (Action Time + Time Diff columns) | `reportService.js` (derive fields), `OrderTable.jsx` (cols + renderers), `ExportButtons.jsx` | **Low-Medium** |
| A4 | CR-005 Phase A (Req #2 web attribution Phase A — `Customer` + `Auto`/`—`) | `reportService.js` punchedBy/actionedBy block | **Low** |

**Validation:** manual QA on `/reports/audit` (welcomeresort + 18march), Order Entry screen, dashboard cards.

### Bucket B — Frontend changes leaning on already-shipped backend keys
| Item | CR | Files | Backend key required | Risk |
|---|---|---|---|---|
| B1 | CR-006 Phase B (Bug #2: multi-select support) | `ItemCustomizationModal.jsx` (state shape, render branch, payload), `orderTransform.js` (verify outbound) | None (already shipped: `type`, `min`, `max`) | **Medium** |
| B2 | CR-005 Req #1 (3 PG columns, conditional render) | `reportService.js` (extract `payment_amount`, `snapshot_razorpay_status`), `OrderTable.jsx` (cond cols), `FilterBar.jsx` (signal) | BE-10 ideal but column renders `—` when null | **Low-Medium** |
| B3 | CR-005 Req #5 partial — drop `Employee #<id>` synthesis on item-level `cancelByName`; consume `cancel_by_name` directly | `reportTransform.js:625-627` | Item-level `cancel_by_name` confirmed shipped | **Low** |
| B4 | CR-005 Req #4 — Add Order Taken stage on item card; use `created_at`; consume `order_serve_at` proxy | `OrderDetailSheet.jsx::ItemTimeline`, `reportTransform.js::singleOrderNew` | Uses `created_at` + `order_serve_at` (already in payload) | **Medium** |

### Bucket C — Backend-dependent (NOT safe to start until BE confirms)
| Item | CR | Blocked-on |
|---|---|---|
| C1 | CR-005 Req #2 Phase B — POS confirmer name | BE-2 |
| C2 | CR-005 Req #4 — per-item Paid stage timestamp | BE-3 |
| C3 | CR-005 Req #5 — order-level `cancelled_by_name`, `ready_by_name`, `served_by_name` on side panel | BE-5, BE-6, BE-7 |
| C4 | CR-005 Req #4 — order-level lifecycle keys | BE-9 |
| C5 | CR-005 Req #1 — reliable PG snapshot status | BE-10 |
| C6 | CR-008 Sub-CR #1 — delivery fee compute + restaurant origin | BE-A |
| C7 | CR-008 Sub-CR #3 — dispatch + assign-rider integration | BE-B/C/D/E (HARD-BLOCKING) |
| C8 | CR-008 Sub-CR #4 — `default_landing_screen` persistence | BE-F (Phase A can stub via localStorage) |
| C9 | CR-009 — operations timeline | BE-11..14 (HARD-BLOCKING) |

### Bucket D — Frontend with backend stub allowed
| Item | CR | Notes |
|---|---|---|
| D1 | CR-008 Sub-CR #4 Phase A — wire `defaultLandingScreen` from localStorage; admin toggle in `SettingsPanel` (general-settings) | Replace 8+ `OrderEntry::onClose()` with `navigateAfterAction()` helper; **preserve `await waitForOrderEngaged(...)` timing** |

---

## 6. Final implementation direction

### 6.1 Recommended order
1. **Bucket A0a** — UI-COD-MASK (display fix in `OrderTable.jsx`).
2. **Bucket A0b** — ROLE-NAME-WIRE-FIX (`role_name` wire value across 4 endpoints).
3. **Bucket A1** — CR-006 Phase A (smallest diff, ships in <30 min) → instant customer-facing fix.
4. **Bucket A2** — CR-007 (3 small visual additions, low risk).
5. **Bucket A3** — CR-008 Sub-CR #2 (action time columns).
6. **Bucket A4** — CR-005 Phase A (web attribution Phase A — `Customer` / `Auto` / `—`).
7. **Bucket B1** — CR-006 Phase B (multi-select; verify `orderTransform.js` outbound on preprod first).
8. **Bucket B2** — CR-005 Req #1 (PG columns, render `—` until BE-10).
9. **Bucket B3** — CR-005 #5 partial (drop `Employee #` synthesis on item-level cancelByName).
10. **Bucket B4** — CR-005 #4 partial (item-level Order Taken + `order_serve_at` proxy).
11. **Bucket D1** — CR-008 #4 Phase A (localStorage stub) — only if user approves stub.
12. **Buckets C1..C9** — wait for backend.

### 6.2 What the Implementation Agent SHOULD change
- `frontend/src/components/order-entry/ItemCustomizationModal.jsx` — Bucket A1 + B1.
- `frontend/src/components/cards/OrderCard.jsx` — Bucket A2 (Issue #1).
- `frontend/src/components/order-entry/CartPanel.jsx` — Bucket A2 (Issues #2 + #3 wiring).
- `frontend/src/components/order-entry/RePrintButton.jsx` — Bucket A2 (new `PrintBillButton` export).
- `frontend/src/api/services/reportService.js` — Buckets A3, A4, B2 (additive only — extract new fields, expose new derived fields; **DO NOT refactor existing resolver chains**).
- `frontend/src/components/reports/OrderTable.jsx` — Buckets A3, B2 (new columns + cell renderers; gate PG cols by `filters.paymentGateway === 'gateway'`).
- `frontend/src/components/reports/ExportButtons.jsx` — Bucket A3 (new column in CSV).
- `frontend/src/components/reports/FilterBar.jsx` — Bucket B2 (signal column visibility — no filter behaviour change).
- `frontend/src/api/transforms/reportTransform.js` — Buckets B3, B4 (additive — keep existing fallbacks; drop `Employee #` synthesis only on the explicit cancelByName line).
- `frontend/src/components/reports/OrderDetailSheet.jsx` — Bucket B4 (`ItemTimeline` only; do NOT touch order-level `Timeline` component until BE-9).

### 6.3 What the Implementation Agent MUST NOT touch
- `frontend/src/components/order-entry/OrderEntry.jsx` — except for Bucket D1, and only swapping redirect destinations via a `navigateAfterAction()` helper. **Preserve all `await waitForOrderEngaged(...)` / `waitForTableEngaged(...)` calls.**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — leave header chip pattern (L579) intact; Bucket A2 only mirrors it, does not modify.
- `frontend/src/api/transforms/orderTransform.js` — only Bucket B1 verification + CR-008 #1 (which is in Bucket C). For Bucket B1: confirm outbound `placeOrder` payload by reading `placeOrder` builder; only adjust if the test fails.
- `frontend/src/api/socket/socketHandlers.js` / `useSocketEvents.js` — out of scope for all approved buckets.
- `frontend/src/components/reports/RoomRowCard.jsx`, `RoomOrdersReportPage.jsx` — out of scope.
- `frontend/src/api/services/paymentMutationService.js` — out of scope.
- Provider order in `AppProviders.jsx` — out of scope.
- Bootstrap sequencing in `LoadingPage.jsx` — out of scope.
- localStorage key names already in runtime use — out of scope (Bucket D1 may add ONE new key `defaultLandingScreen`).
- ENV variables in `frontend/.env` — out of scope.

### 6.4 What goes to backend / documentation agents (NOT this Implementation Agent)
- BE-2/3/5/6/7/9/10 (CR-005), BE-A through BE-F (CR-008), BE-11..14 (CR-009).
- Update `memory/change_requests/SESSION_TRACKER.md` after each bucket lands (responsibility of Implementation Agent's handover doc).
- Update `memory/handover/REPORTS_FIELD_MAPPING_TRACKER.md` after Bucket B2/B3/B4 ships (per existing playbook §8).

---

## 7. Validation / QA expectations per bucket

### Bucket A0a — UI-COD-MASK
1. Per source doc §6.1: `OrderTable-paymentCol.test.jsx` (new) must pass.
2. Per source doc §11.2: live preprod (`owner@18march.com`), `/reports/audit`, every tab — rows previously showing `cash_on_delivery` in Payment column now show `—`. Other payment methods unchanged.
3. **Negative check** — row click still opens detail sheet; row-action pills (Mark-as-Unpaid / Change-Payment-Method) still appear on eligible `cash_on_delivery` rows (logic uses raw `order.paymentMethod`, not the rendered cell).

### Bucket A0b — ROLE-NAME-WIRE-FIX
Per source doc §7:
1. `cd /app/frontend && CI=true yarn test --watchAll=false` — full suite green.
2. `tail -f /var/log/supervisor/frontend.out.log` — `webpack compiled successfully` (ignore pre-existing LoadingPage exhaustive-deps warning).
3. Live preprod (`owner@18march.com`): in DevTools Network filter `role_name`. Verify on all 4 endpoints (running-orders fetch, order-confirm, order-status-update for ready/served, cancel) that the wire value is `"Manager"`.
4. **Regression** — Sidebar still shows raw `roleName` (`"Owner (Owner)"`). Diagnostic logs unchanged.
5. After deletion of `getOrderRoleParam`, run `grep -rn "getOrderRoleParam" /app/frontend/src` — must return zero hits.

### Bucket A1 — CR-006 Phase A
1. WAFFLES item: open customisation modal → ICECREAM (Optional) group must NOT have any pre-selected pill.
2. ICECREAM header reads `ICECREAM (Optional)` (not `*`).
3. `Add to Order` enabled with zero ICECREAM picks.
4. `(Optional)` pills click-to-toggle works (click selected pill clears it).
5. Required group (`ADDONS *`) still pre-selects first option — regression check.

### Bucket A2 — CR-007
1. Dashboard order card header shows `#<orderId>` after the order-type icon / name.
2. Order Entry right panel shows `#<orderId>` chip when order placed (mirrors Collect Bill style).
3. Print Bill button visible in CartPanel when `orderId && canPrintBill && hasPlacedItems`; disabled otherwise.
4. Click → `printOrder(orderId, 'bill', null, order, scPctForPrint)` → toast "Bill request sent".
5. Re-Print KOT (existing) still works — regression check.
6. `canPrintBill` permission gates the new button.

### Bucket A3 — CR-008 #2
1. Audit Report cancelled row → ACTION TIME = `cancelledAt`, TIME DIFF = `(cancelledAt - createdAt) / 60000`.
2. Merged row → ACTION TIME = `mergedAt`. Paid row → `collectedAt`. Running row → `—`.
3. CSV export contains the two new columns.

### Bucket A4 — CR-005 Phase A
1. Web order (`order_from === 'web'`): PUNCHED BY = `Customer`.
2. Auto-confirmed web order (`is_auto_confirmed === 1`): ACTIONED BY = `Auto`.
3. POS-confirmed web order (no confirmer name yet): ACTIONED BY = `—` (do NOT show false `Auto`).
4. Non-web rows: PUNCHED BY/ACTIONED BY unchanged — regression check.

### Bucket B1 — CR-006 Phase B
1. Multi-select group renders as checkbox rows.
2. Multiple options can be checked simultaneously.
3. `min` / `max` enforced; "Add to Order" disabled until `min` reached.
4. Cart total reflects sum of all selected option prices.
5. Submitted payload preserves all selected labels.
6. Re-edit a placed multi-select item from cart → previous selections restored.

### Bucket B2 — CR-005 #1
1. PG checkbox unchecked → 3 PG columns hidden.
2. PG checkbox checked → 3 columns appear; PG-row populated, non-PG row shows `—`.
3. CSV export honours visible columns.

### Bucket B3 — CR-005 #5 partial
1. Item with backend `cancel_by_name = "p"` shows "Cancelled By: p" — not `Employee #3631`.
2. Item missing `cancel_by_name` shows `—` (no synthesis).

### Bucket B4 — CR-005 #4 partial
1. Side-panel item card shows 4 stages: Order Taken (`created_at`) → Ready (`ready_at`) → Served (`serve_at`) → Cancelled (terminal). Paid stage hidden until BE-3.
2. Cancelled-only items stop at Cancelled stage — regression check.

### Bucket D1 — CR-008 #4 Phase A (if approved)
1. SettingsPanel → general-settings tile shows new "Default screen" toggle (`Dashboard` / `Order page`).
2. Setting persists to localStorage.
3. Post-action redirects (place / update / cancel / transfer / merge / shift / collect) honour setting.
4. **Socket-engage timing unchanged** — regression check on dashboard live updates after place-order.

---

## 8. Architecture compliance checklist (per `IMPLEMENTATION_AGENT_RULES.md`)

For every bucket the Implementation Agent must produce:
- [ ] Approval Gate (Request Summary / Change Type / Affected Modules / Primary Files / Related APIs / State Impact / UI Impact / Regression Risks / Open Decisions / Safe-to-Implement-Without-Owner-Clarification?)
- [ ] File-Level Change Plan (per file: Why / Intended change / Risk / Downstream files to verify)
- [ ] Testing Checklist (Happy / Error / Permission-gated / Socket-reload / Print-payment-room / Regression / Docs-updated)
- [ ] Handover Summary (Modules touched / Files changed / Functional change / Intentionally-not-changed / Known limitations / Tests executed / Docs updated)

Hotspot extra caution required for: `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `reportService.js`, `socketHandlers.js`. These appear in the protected list — Bucket D1 is the only one that grazes a hotspot (`OrderEntry.jsx`), and **must use the helper-only swap pattern**.

---

## 9. Open backend asks (for Backend / Doc Agents)

| Ask | CR | Priority |
|---|---|---|
| BE-2 — POS confirmer name on `/order-logs-report` | CR-005 | High |
| BE-3 — per-item `paid_at` | CR-005 | Medium |
| BE-5 — `cancel_by_name` (order-level + already shipped item-level) | CR-005 | High |
| BE-6 — `ready_by_name`, `served_by_name` | CR-005 | Medium |
| BE-7 — `canceled_by_name` (order-level) | CR-005 | High |
| BE-9 — order-level `ready_at`, `served_at`, `paid_at` | CR-005 | Medium |
| BE-10 — reliable Razorpay snapshot fields | CR-005 | Low (column degrades to `—`) |
| BE-A — delivery-fee formula + restaurant origin coords | CR-008 #1 | Medium |
| BE-B/C/D/E — list/assign/dispatch/rider status endpoints | CR-008 #3 | **High (blocking)** |
| BE-F — `default_landing_screen` setting key | CR-008 #4 | Low (Phase A stub) |
| BE-11 — operations canonical string set | CR-009 | **High (blocking)** |
| BE-12 — `vendor_employee_name` per operation entry | CR-009 | High |
| BE-13 — operation timestamp field name | CR-009 | High |
| BE-14 — split-bill child order ids inside split_bill entry | CR-009 | Medium |

---

## 10. Pre-filled bucket contracts (Approval Gate + File-Level Change Plan + Testing Checklist)

> The next agent must still print the Approval Gate per bucket and obtain explicit human approval before coding. The contracts below are drafted to the IMPLEMENTATION_AGENT_RULES.md template so the agent only has to confirm, not author from scratch.

---

### 10.A0a — UI-COD-MASK (Mask `cash_on_delivery` in Audit Report)

**Source contract:** `/app/memory/UI_COD_MASK_HANDOVER.md` (apply diff verbatim from §5.2).

**Approval Gate**
- Request Summary: render `—` instead of literal `cash_on_delivery` in OrderTable Payment column on every tab.
- Change Type: local UI fix (display-only).
- Affected Module(s): Reports / Audit / Summary Module.
- Primary Files to Change: `frontend/src/components/reports/OrderTable.jsx` (lines 467-484); new test file `frontend/src/__tests__/components/reports/OrderTable-paymentCol.test.jsx`.
- Related APIs: none.
- State Impact: none — `order.paymentMethod` unchanged.
- UI Impact: Audit Report Payment column — single cell renderer.
- Regression Risks: very low. Row-action eligibility (`OrderTable.jsx:231, 289`), filters, classification, OrderDetailSheet `formatPaymentMethod` all unaffected.
- Open Decision Dependencies: none. Source doc §8 lists 3 follow-ups (filter dropdown cosmetic, OrderDetailSheet `CASH` mapping, CSV export) — all deferred and explicitly out of scope.
- Safe to Implement Without Owner Clarification? **Yes.**

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `OrderTable.jsx` | Payment cell renderer at L467-484 echoes raw enum | Wrap case in `{}`, hoist `pmLower`, add 4-line short-circuit `if pmLower === 'cash_on_delivery'` → `—`; preserve all other branches | Very low | Audit + Paid + Cancelled + Hold + Running tabs; row-click → detail sheet still opens; row-action pills still appear on `cash_on_delivery` rows |
| `OrderTable-paymentCol.test.jsx` (new) | Lock the contract per source doc §6.1 | New `@testing-library/react` test file with 6 cases (8 tabs × cod-mask + 4 happy-path) | Low | None |

**Testing Checklist**
- Happy path: `cash_on_delivery` row → cell shows `—` on Audit/Paid/Cancelled/Hold/Running/Aggregator tabs.
- Error path: row with `null`/`undefined` paymentMethod still renders `—` (existing behaviour).
- Permission-gated path: N/A.
- Socket/reload/re-entry: N/A — display-only.
- Related print/payment/room: print receipts and CSV exports still contain `cash_on_delivery` (out of scope per source doc §8.3).
- Regression surfaces: row click opens detail sheet; Mark-as-Unpaid / Change-Payment-Method pills still appear on eligible rows; filters unchanged.
- Docs updated: tick off `UI-COD-MASK` in `/app/memory/UI_COD_MASK_HANDOVER.md` §11 manual checklist.

---

### 10.A0b — ROLE-NAME-WIRE-FIX

**Source contract:** `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` (apply 14 edits verbatim from §4).

**Approval Gate**
- Request Summary: switch `role_name` wire value from heuristic / raw `user.roleName` to `permissions?.[0] || 'Manager'` across 4 endpoints.
- Change Type: API integration fix.
- Affected Module(s): Authentication & Session (consumer); Loading & Initial Data Bootstrap (LoadingPage); Dashboard / POS Workspace (mutation callsites); Order Entry / Cart / Payment (cancel callsite); Tables & Orders Runtime State (refresh hook).
- Primary Files to Change: `pages/DashboardPage.jsx` (8 edits), `components/order-entry/OrderEntry.jsx` (2), `pages/LoadingPage.jsx` (1), `hooks/useRefreshAllData.js` (2), `api/services/orderService.js` (1 — delete `getOrderRoleParam` helper). New test `__tests__/api/role-name-wire-contract.test.js`.
- Related APIs: `GET /api/v2/.../orders/running-orders`, `PUT /api/v2/.../order-status-update` (ready/served/cancel), `PUT /api/v2/.../order-confirm`.
- State Impact: AuthContext `permissions` array now drives wire value. No new state.
- UI Impact: none (wire-only).
- Regression Risks: low — current login already sends `Manager` on fetch path; mutation paths previously sent raw `roleName` (e.g. `Owner`), now will send `Manager`. Backend already accepts `Manager` from fetch path.
- Open Decision Dependencies: none. Source doc §10 lists 3 non-blocking follow-ups (stationService, OrderContext.refreshOrders default, full-repo grep for helper deletion).
- Safe to Implement Without Owner Clarification? **Yes** — handover doc is the impact analysis.

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `pages/DashboardPage.jsx` | 8 callsites use `user?.roleName` heuristic for confirm/cancel/ready/serve | 8 in-place replacements (A.1-A.8 in source doc §4) — switch to `permissions?.[0]` and update useCallback deps | Medium (hotspot) | Confirm flow; Cancel flow; Mark Ready / Mark Served on running orders |
| `components/order-entry/OrderEntry.jsx` | Cancel-order payload at L920 uses raw `user.roleName` | Add `permissions` to `useAuth()` destructure (L44); replace at L920 | Medium (hotspot) | OrderEntry cancel-order action |
| `pages/LoadingPage.jsx` | Initial running-orders fetch uses heuristic via `getOrderRoleParam` | Replace 3 lines (C.1) — read `data.profile?.permissions?.[0]` directly | Medium (hotspot — bootstrap) | LoadingPage initial fetch; verify running orders load on first login |
| `hooks/useRefreshAllData.js` | Drop heuristic helper; pull `permissions` from useAuth | Add `useAuth` import; switch hook body per D.2 | Low | Any caller of `refreshAllData()` (DashboardPage L483) |
| `api/services/orderService.js` | `getOrderRoleParam` helper now obsolete | Delete L19-29 entirely | Low | Run `grep -rn "getOrderRoleParam" /app/frontend/src` — must return zero hits after edits |
| `__tests__/api/role-name-wire-contract.test.js` (new) | Lock the wire contract | 4 Jest test cases per source doc §6 | Low | None |

**Testing Checklist**
- Happy path: 4 endpoints each carry `role_name=Manager` for `owner@18march.com`. Verified via DevTools Network filter.
- Error path: `permissions === undefined` → fallback `Manager` (covered by test case 4).
- Permission-gated path: Sidebar still shows `Owner (Owner)` (raw display unchanged).
- Socket/reload/re-entry: dashboard live update post-confirm/cancel still works (socket flow unchanged).
- Related print/payment/room: none affected.
- Regression surfaces: full Jest suite green; `webpack compiled successfully`; `grep -rn "getOrderRoleParam"` returns zero; diagnostic logs in LoadingPage/DashboardPage/AllOrdersReportPage still log raw `roleName` for debugging.
- Docs updated: source doc §11 manual checklist; cross-reference in any new bug entry.

---

### 10.A1 — CR-006 Phase A (Optional auto-select fix)

**Approval Gate**
- Request Summary: stop pre-selecting first option in optional variation groups; show `(Optional)` label.
- Change Type: local UI fix (state-flow fix).
- Affected Module(s): Order Entry / Cart / Payment Workflow (Menu module, item customization surface).
- Primary Files to Change: `frontend/src/components/order-entry/ItemCustomizationModal.jsx` (initializer L32-40, header L339, single-select toggle-off at L100-102 if Q-V1 = Yes).
- Related APIs: none. Backend already ships `required`, `type`, `min`, `max`.
- State Impact: `selectedVariants` shape stays `{groupId: option}` for Phase A (multi extension is Phase B / Bucket B1).
- UI Impact: ICECREAM (Optional) header wording; no pre-selected pill on optional groups; toggle-off behaviour for optional single-select.
- Regression Risks: low — required groups unchanged; addons unchanged; dynamic-price (₹1) path unchanged.
- Open Decision Dependencies: Q-V1 (toggle-off behaviour for optional single-select) — default Yes. Q-V5 (cart re-edit normalisation) — Phase A leaves shape as-is; relevant only in Phase B.
- Safe to Implement Without Owner Clarification? **Yes** if Q-V1 default `Yes` accepted.

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `ItemCustomizationModal.jsx` (L32-40) | Initializer pre-selects first option for every group | Add `if (group.required && group.type !== 'multi')` guard around `initialVariants[group.id] = group.options[0]` | Low | re-edit-from-cart path (item.selectedVariants restore) |
| `ItemCustomizationModal.jsx` (L339) | Header lacks `(Optional)` label | Replace `{group.required && '*'}` with `{group.required ? '*' : <span class="...">(Optional)</span>}` | Very low | None |
| `ItemCustomizationModal.jsx` (L100-102) | `selectVariant` always replaces; optional pill cannot be cleared | If `!group.required && group.type !== 'multi'` and same option clicked → remove key from state | Low | calculateTotal (L86-88) handles `undefined` group key (returns 0) |

**Testing Checklist**
- Happy path: WAFFLES item → ICECREAM (Optional) opens with no pre-selected pill; ADDONS * stays pre-selected; clicking ICECREAM Vanilla once selects, click again clears. Add to Order enabled with 0 ICECREAM picks.
- Error path: required group with no pick → Add to Order disabled (existing).
- Permission-gated: N/A.
- Socket/reload/re-entry: cart re-edit of placed item still restores saved selections.
- Related print/payment/room: KOT/print of item with no optional variant must omit that line group; existing `customizations.variants` array filter for empty groups should already skip.
- Regression: dynamic-price (₹1) customisable item path; addons; sizes — unchanged.
- Docs: append entry to `memory/handover/` (new doc) summarising bucket A1 outcome.

---

### 10.A2 — CR-007 (Order ID chip + Print Bill button)

**Approval Gate**
- Request Summary: 3 frontend additions — order-id text on dashboard order card, order-id chip on Order Entry right panel header, Print Bill button on Order Entry reusing OrderCard.handlePrintBill verbatim.
- Change Type: local UI fix (additive).
- Affected Module(s): Dashboard / POS Workspace (OrderCard); Order Entry / Cart / Payment Workflow (CartPanel + new button); Printing / Bill / KOT (reuse `printOrder('bill', ...)`).
- Primary Files to Change: `components/cards/OrderCard.jsx` (header), `components/order-entry/CartPanel.jsx` (header chip + new button placement), `components/order-entry/RePrintButton.jsx` (new export `PrintBillButton`).
- Related APIs: `POST /api/v1/vendoremployee/order-temp-store` (existing `printOrder` service).
- State Impact: none — reads `orderId` already in props.
- UI Impact: 3 visual additions; no layout breaks. Permission gate `canPrintBill` reused.
- Regression Risks: low — Re-Print KOT button untouched; no live-override path used.
- Open Decision Dependencies: Q-O1/O2/O3 — defaults specified in §4. **Confirm Q-O2 = CartPanel** before coding.
- Safe to Implement Without Owner Clarification? **Yes** if defaults accepted.

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `OrderCard.jsx` (L278-308 header) | No order-id rendered today | Add `<span class="text-xs ...">#{orderId}</span>` after order-type icon, before display name | Low | All order types (dineIn/walkIn/takeAway/delivery/room); narrow-card overflow via truncate |
| `CartPanel.jsx` (header section, around L438+) | No header chip today | Add chip mirroring `CollectPaymentPanel.jsx:579` style; render only when `orderId` set | Low | brand-new unplaced cart hides chip; placed cart shows it |
| `RePrintButton.jsx` (new export) | Need new button alongside `RePrintOnlyButton` | Add `export const PrintBillButton = ({ orderId, order }) => { ... }` mirroring `OrderCard.handlePrintBill` (L120-138) verbatim — `printOrder(orderId, 'bill', null, order, scPctForPrint)` + toast | Low | Use `useRestaurant()` for `scPctForPrint` |
| `CartPanel.jsx` (L645-687 footer) | Wire new button next to `RePrintOnlyButton` | Render `<PrintBillButton orderId={orderId} order={order} />` gated by `canPrintBill && orderId && hasPlacedItems` | Low | Same gate as Re-Print at L683 |

**Testing Checklist**
- Happy path: dashboard card shows `#001285`; Order Entry right panel shows `#001285` chip; Print Bill button visible when placed; click → toast "Bill request sent".
- Error path: `canPrintBill === false` → button hidden; brand-new cart (no orderId) → chip + button hidden.
- Permission-gated: `canPrintBill` honoured.
- Socket/reload/re-entry: re-open same order → chip + button reappear.
- Related print/payment/room: bill print parity with OrderCard's bill button (no live overrides).
- Regression: Re-Print KOT (existing) unchanged; CollectPaymentPanel header chip unchanged.
- Docs: handover doc summarising A2.

---

### 10.A3 — CR-008 Sub-CR #2 (Action time + time diff columns)

**Approval Gate**
- Request Summary: add ACTION TIME and TIME DIFF (minutes) columns to Audit Report.
- Change Type: local UI fix (additive — reuses existing transform timestamps).
- Affected Module(s): Reports / Audit / Summary Module.
- Primary Files to Change: `api/services/reportService.js` (derive `actionTime` + `timeDiffMin`), `components/reports/OrderTable.jsx` (col defs + cell renderers), `components/reports/ExportButtons.jsx` (CSV columns).
- Related APIs: none — pure derivation from existing `cancelledAt`/`mergedAt`/`collectedAt`/`updatedAt`/`createdAt`.
- State Impact: row shape gains 2 new fields.
- UI Impact: 2 new columns inserted after ACTIONED BY (per Q-T3 default), before PAYMENT.
- Regression Risks: low-medium — total cols become 11 by default. Test horizontal scroll on smaller screens.
- Open Decision Dependencies: Q-T1/T2/T3 — defaults applied (`m`, `—`, after ACTIONED BY).
- Safe to Implement Without Owner Clarification? **Yes** if defaults accepted.

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `reportService.js` (transform output ~L897-933) | Add derived fields per row | Add `actionTime` (per status: cancelled→cancelledAt / merged→mergedAt / paid→collectedAt / transferred→updatedAt / else null) and `timeDiffMin = actionTime ? Math.round((actionTime - createdAt)/60000) : null` | Low | All Audit Report tabs |
| `OrderTable.jsx` (L113-135 col defs) | Need 2 new cols | Insert `{ id: 'actionTime', label: 'Action Time', sortable: true, width: 'w-24' }` and `{ id: 'timeDiffMin', label: 'Time Diff', sortable: true, width: 'w-20', align: 'right' }` after `actionedBy` in `baseColumns` and `columnsWithPayment` | Low-Medium | Width budget across viewports |
| `OrderTable.jsx` (cell renderer ~L440-520) | New case branches | Add `case 'actionTime'` → formatted time or `—`; `case 'timeDiffMin'` → `${val}m` or `—` | Low | None |
| `ExportButtons.jsx` | CSV needs new columns | Add to columns array | Very low | CSV opens cleanly |

**Testing Checklist**
- Happy path: cancelled row → ACTION TIME = cancelledAt timestamp, TIME DIFF = `(cancelledAt - createdAt)/60000` rounded; merged → mergedAt; paid → collectedAt.
- Error path: running row → both `—`.
- Permission-gated: N/A.
- Socket/reload/re-entry: refetch report → values recomputed.
- Related print/payment/room: N/A.
- Regression: existing ACTIONED BY column position; sort by ACTION TIME works.
- Docs: handover doc.

---

### 10.A4 — CR-005 Phase A (Web order attribution)

**Approval Gate**
- Request Summary: web order rows show PUNCHED BY = `Customer`; auto-confirmed web rows show ACTIONED BY = `Auto`; otherwise `—`.
- Change Type: API integration fix (consumer-side normalization).
- Affected Module(s): Reports / Audit / Summary Module.
- Primary Files to Change: `api/services/reportService.js` (punchedBy block ~L824, actionedBy block ~L843-880).
- Related APIs: none — `is_auto_confirmed` (BE-1 already shipped per CR-005 Q-B4 lock); `order_from === 'web'` already normalised to `platform`.
- State Impact: 2 transformed fields change for web rows.
- UI Impact: PUNCHED BY + ACTIONED BY column literal text on web rows.
- Regression Risks: low — non-web rows unchanged; Phase B (POS confirmer name) deferred to Bucket C1 (BE-2).
- Open Decision Dependencies: Q5-A — confirm Phase A only ships now; Q-B4 already locked.
- Safe to Implement Without Owner Clarification? **Yes** if Phase-A-only scope confirmed.

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `reportService.js` (L824) | `punchedBy` always returns `waiter_name` | Branch: if `platform === 'web'` → `'Customer'`; else `api.waiter_name || ''` | Low | Audit table all tabs |
| `reportService.js` (L843-880) | actionedBy does not consume `is_auto_confirmed` | Add web-order branch: if `platform === 'web'` and `api.is_auto_confirmed === 1` → `actionedBy = 'Auto'` (label suppressed); else if web and POS confirmer name exists → use it (key TBD per BE-2 — leave commented stub); else `—` | Low | Auto-confirmed web rows; POS-confirmed web rows blank until BE-2 |

**Testing Checklist**
- Happy path: web order with `is_auto_confirmed === 1` → PUNCHED BY=`Customer`, ACTIONED BY=`Auto`. Web order without auto-confirm → ACTIONED BY=`—`.
- Error path: missing `order_from` → falls through to non-web behaviour.
- Permission-gated: N/A.
- Socket/reload/re-entry: live report refetch → values stable.
- Related print/payment/room: none.
- Regression: non-web (POS) rows unchanged across all tabs.
- Docs: handover doc.

---

### 10.B1 — CR-006 Phase B (Multi-select variations)

**Approval Gate**
- Request Summary: support `type === 'multi'` variation groups (checkbox UI), enforce `min`/`max`, multi-label payload submission.
- Change Type: state-flow fix + UI fix.
- Affected Module(s): Order Entry / Cart / Payment Workflow.
- Primary Files to Change: `components/order-entry/ItemCustomizationModal.jsx` (state shape, render branch, payload). Verify `api/transforms/orderTransform.js::placeOrder` outbound shape.
- Related APIs: `POST /api/v2/vendoremployee/order-place`, `PUT /api/v2/vendoremployee/order-update`.
- State Impact: `selectedVariants` shape extended — `{groupId: option}` for single, `{groupId: [option, ...]}` for multi.
- UI Impact: checkbox rows for multi groups; min/max validation hint; total-price recompute.
- Regression Risks: medium — outbound payload shape verification critical. Cart re-edit migration helper required.
- Open Decision Dependencies: Q-V1 (toggle-off optional single — default Yes), Q-V2 (checkbox rows — default Yes), Q-V3 (`min=0,max=0` no-constraints — default Yes), Q-V4 (verify outbound shape on preprod), Q-V5 (auto-upgrade saved selections — default Yes).
- Safe to Implement Without Owner Clarification? **Yes** if Q-V1..V5 defaults accepted AND Q-V4 outbound verification done first.

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `ItemCustomizationModal.jsx` (L7) | State shape only single | Allow array per groupId | Medium | All consumers of selectedVariants |
| `ItemCustomizationModal.jsx` (L18-71) | useEffect normalises restored cart selections | If saved value is non-array on `multi` group → wrap as `[option]` (Q-V5) | Low | Cart re-edit |
| `ItemCustomizationModal.jsx` (L86-97) | `calculateTotal` assumes single | Walk both single + array — `Array.isArray(sel) ? sum array : sel.price` | Medium | Total displayed; cart price |
| `ItemCustomizationModal.jsx` (L100-102) | `selectVariant` replaces always | Branch by `group.type`: multi → push/remove; single optional → toggle-off; single required → replace | Medium | All variant interactions |
| `ItemCustomizationModal.jsx` (L132-138 `allRequiredSelected`) | Doesn't enforce min/max | Add min check for multi groups; max greys out unselected | Medium | Add to Order disable state |
| `ItemCustomizationModal.jsx` (L162-170 payload) | Single label per group | For multi: `${group.name}: ${labels.join(', ')}`; for single: unchanged | Medium | Outbound `customizations.variants` array; KOT/bill print preview |
| `ItemCustomizationModal.jsx` (L333-367 render) | Single render branch | If `group.type === 'multi'` → render checkbox rows (price right-aligned per old POS); else existing pills | Medium | Visual fidelity |
| `orderTransform.js::placeOrder` (L376-410) | Verify accepts multi labels | Read code; if `variations` builder collapses by group already, no change. Add unit test if absent | Low | Live preprod placement of multi-group item |
| `__tests__/components/ItemCustomizationModal.test.jsx` | Lock new contract | Cases: optional+empty, multi+min-violated, multi+max-clamp, single-required, single-optional toggle-off | — | — |

**Testing Checklist**
- Happy path: multi group with `min=1,max=3` → must pick 1; can pick up to 3; 4th pick disabled.
- Error path: `min=2` and only 1 picked → Add to Order disabled with hint "Pick at least 2".
- Permission-gated: N/A.
- Socket/reload/re-entry: cart re-edit of placed multi-select item restores all checked options.
- Related print/payment/room: KOT/bill preview shows all selected labels; live preprod placement succeeds.
- Regression: single-select groups unchanged; required groups still pre-selected; addons unchanged.
- Docs: handover doc.

---

### 10.B2 — CR-005 Req #1 (PG columns, conditional)

**Approval Gate**
- Request Summary: 3 PG columns (PG Order Id / PG Amount / PG Status) on Audit table, visible only when PG checkbox checked.
- Change Type: API integration fix + UI fix (additive).
- Affected Module(s): Reports / Audit / Summary Module.
- Primary Files to Change: `api/services/reportService.js` (extract `payment_amount`, `snapshot_razorpay_status`, `payment_created_at`), `components/reports/OrderTable.jsx` (3 conditional col defs + cell renderers), `components/reports/FilterBar.jsx` (no change — emits `filters.paymentGateway`).
- Related APIs: `/order-logs-report` PG fields confirmed in CR doc §2.1.
- State Impact: row shape gains 3 fields (`pgOrderId`, `pgAmount`, `pgStatus`).
- UI Impact: 3 conditional columns; only visible when `filters.paymentGateway === 'gateway'`.
- Regression Risks: low — render `—` when `snapshot_razorpay_status` null (BE-10 will populate later).
- Open Decision Dependencies: Q-A3 / Q-A4 already locked. BE-10 ideal but not blocking.
- Safe to Implement Without Owner Clarification? **Yes.**

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `reportService.js` (~L897-933) | Extract PG fields | Pass through literal: `pgOrderId = api.razorpay_order_id`, `pgAmount = parseFloat(api.payment_amount) \|\| null`, `pgStatus = api.snapshot_razorpay_status \|\| null` | Low | Existing `isPaymentGateway` field unchanged |
| `OrderTable.jsx` (col defs) | Conditional columns | Build list dynamically: spread `[pgOrderId, pgAmount, pgStatus]` cols only when `filters.paymentGateway === 'gateway'` | Medium | `filters` prop wiring from page |
| `OrderTable.jsx` (cell renderer) | New case branches | Add 3 cases; `pgAmount` → currency format; `pgStatus` → literal; null → `—` | Low | None |
| `OrderTable.jsx` (props) | Need `filters` to know visibility | Accept `filters` prop from `AllOrdersReportPage` | Low | Page already manages this state |

**Testing Checklist**
- Happy path: PG checkbox unchecked → 3 cols hidden; check → 3 cols appear; PG row populated; non-PG row shows 3× `—`.
- Error path: row with `razorpay_order_id` but null `snapshot_razorpay_status` → PG Status = `—`.
- Permission-gated: N/A.
- Socket/reload/re-entry: filter toggle re-renders columns instantly.
- Related print/payment/room: N/A.
- Regression: existing PG checkbox filter behaviour (filter rows) unchanged.
- Docs: update REPORTS_FIELD_MAPPING_TRACKER.md noting BE-10 still pending (Status column may show `—` until BE ships).

---

### 10.B3 — CR-005 #5 partial (Drop `Employee #<id>` synthesis)

**Approval Gate**
- Request Summary: drop `Employee #${item.cancel_by}` synthesis at `reportTransform.js:625-627`; consume backend `cancel_by_name` directly; render `—` when absent.
- Change Type: API integration fix.
- Affected Module(s): Reports / Audit / Summary Module (side panel item card).
- Primary Files to Change: `api/transforms/reportTransform.js` (L620-628 in `singleOrderNew`).
- Related APIs: `/get-single-order-new` — item-level `cancel_by_name` already shipped per QA handover.
- State Impact: `item.cancelByName` field returns name or null instead of synthesised string.
- UI Impact: side panel item-cancelled card no longer shows `Employee #3631`; shows real name or `—`.
- Regression Risks: very low — aligns with no-fallback policy locked 2026-05-01.
- Open Decision Dependencies: none — frozen by REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER §0.
- Safe to Implement Without Owner Clarification? **Yes.**

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `reportTransform.js` (L623-627) | Synthesises `Employee #<id>` | Replace with `cancelByName: item.cancel_by_name \|\| null` | Very low | Side panel `OrderDetailSheet.jsx:359` already renders `cancelByName \|\| '—'` |

**Testing Checklist**
- Happy path: cancelled item with backend `cancel_by_name = "p"` → side panel shows "Cancelled By: **p**".
- Error path: missing `cancel_by_name` → "Cancelled By: **—**".
- Permission-gated: N/A.
- Socket/reload/re-entry: refetch detail → consistent.
- Related print/payment/room: N/A.
- Regression: `formatPaymentMethod` and other transforms unchanged.
- Docs: update REPORTS_FIELD_MAPPING_TRACKER (remove `Employee #` fallback note).

---

### 10.B4 — CR-005 #4 partial (Item-level Order Taken stage)

**Approval Gate**
- Request Summary: add Order Taken stage to `OrderDetailSheet.ItemTimeline`; consume `created_at` until BE-4 ships `kot_at`. Optionally consume `orderDetails[0].order_serve_at` as order-level Served proxy.
- Change Type: local UI fix + transform additive.
- Affected Module(s): Reports / Audit / Summary Module.
- Primary Files to Change: `components/reports/OrderDetailSheet.jsx::ItemTimeline` (L248-319), optionally `api/transforms/reportTransform.js::singleOrderNew`.
- Related APIs: `/get-single-order-new` — `created_at`, `serve_at`, `order_serve_at` already in payload.
- State Impact: timeline event list extended; per-item paid stage hidden until BE-3.
- UI Impact: 4-stage item timeline (Order Taken → Ready → Served → Cancelled). Paid stage placeholder for future BE-3.
- Regression Risks: medium — verify cancelled-only items still terminate at Cancelled.
- Open Decision Dependencies: Q-D4 already locked (use `created_at`); BE-3 future for per-item Paid; BE-9 future for true order-level keys.
- Safe to Implement Without Owner Clarification? **Yes.**

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `OrderDetailSheet.jsx::ItemTimeline` (L248-319) | Currently Created → Ready → Served → Cancelled (4 stages but Created icon = generic Circle) | Rename "Created" event to "Order Taken" with appropriate icon (e.g., `ClipboardList`); leave Paid stage stub commented for BE-3 | Medium | All items render correctly |
| `reportTransform.js::singleOrderNew` (L562-569 timeline) | Order-level Served proxy could read `orderDetails[0].order_serve_at` | Optional: prefer `items[0].order_serve_at` over `lastServeAt` derivation when present (graceful fallback) | Medium | Order-level `Timeline` component (L146-208) consumes this |

**Testing Checklist**
- Happy path: item card timeline shows 4 stages with timestamps and durations.
- Error path: cancelled item → terminates at Cancelled stage (existing).
- Permission-gated: N/A.
- Socket/reload/re-entry: refetch → consistent.
- Related print/payment/room: N/A.
- Regression: existing item-level Cancelled flow unchanged; order-level `Timeline` component still renders correctly.
- Docs: handover doc; backend ask BE-3/BE-4/BE-9 reaffirmed.

---

### 10.D1 — CR-008 Sub-CR #4 Phase A (Default landing screen — localStorage stub)

**Approval Gate**
- Request Summary: add `defaultLandingScreen` setting (Dashboard / Order page); persist to localStorage; replace 8+ hardcoded `onClose()` callsites with `navigateAfterAction(action)` helper that honours setting.
- Change Type: configuration/governance change + state-flow fix.
- Affected Module(s): Order Entry / Cart / Payment Workflow (callsites); Dashboard / POS Workspace (target); Visibility Settings / Device Configuration (admin toggle).
- Primary Files to Change: `components/order-entry/OrderEntry.jsx` (8+ callsites), `components/order-entry/CollectPaymentPanel.jsx` (payment-complete path), `pages/LoadingPage.jsx` (post-bootstrap route — confirm with user first), `components/panels/SettingsPanel.jsx` general-settings tile, new `hooks/useDefaultLandingScreen.js` or context extension.
- Related APIs: none in Phase A. BE-F deferred.
- State Impact: new localStorage key `defaultLandingScreen` ∈ `{'dashboard', 'orderPage'}`.
- UI Impact: post-action redirect destination depends on setting; admin toggle in SettingsPanel.
- Regression Risks: **MEDIUM-HIGH** — OrderEntry.jsx is a hotspot. Must preserve `await waitForOrderEngaged(...)` / `waitForTableEngaged(...)` calls; only swap final `onClose()` destination.
- Open Decision Dependencies: Q8-N1..N5; user explicit approval for Phase A localStorage stub vs waiting for BE-F.
- Safe to Implement Without Owner Clarification? **No — explicit go-ahead required.**

**File-Level Change Plan**
| File | Why | Intended change | Risk | Downstream verify |
|---|---|---|---|---|
| `hooks/useDefaultLandingScreen.js` (new) | Centralise read/write | `useDefaultLandingScreen()` returns `{value, setValue}` reading/writing localStorage; exposes `navigateAfterAction(navigate, currentTable)` | Low | All callers |
| `OrderEntry.jsx` (L797, 802, 838, 864, 887, 913, 937, 1371, 1478) | 8+ hardcoded `onClose()` after action | Replace last line `onClose()` with `navigateAfterAction(...)` helper. **DO NOT** modify any `await waitForOrderEngaged(...)` / `waitForTableEngaged(...)` lines that precede them. | **High** (hotspot) | Live socket flow on dashboard after place/update/cancel/transfer/merge/shift |
| `CollectPaymentPanel.jsx` (~L1164+) | Payment-complete path | Same helper swap | High (hotspot) | Bill print + auto-print regression |
| `SettingsPanel.jsx` (general-settings tile) | Add toggle | Two radio options Dashboard/Order page; persist via hook | Low | Setting persists across reload |
| `LoadingPage.jsx` (post-bootstrap route) | Honour setting on first load | If setting === orderPage and no engaged table, route to `/order-entry` (table-picker variant) | High (bootstrap hotspot) | First-login flow, retry behaviour |

**Testing Checklist**
- Happy path: setting=Dashboard → all post-action redirects to dashboard (current behaviour). Setting=Order Page → place-order completes → cart cleared, stay on Order Entry.
- Error path: place-order fails → toast shown, no redirect (current behaviour preserved).
- Permission-gated: setting toggle visible to admin only (gate in SettingsPanel).
- Socket/reload/re-entry: post-place-order, dashboard live update via socket still fires (engage timing unchanged).
- Related print/payment/room: bill auto-print still triggers; collect-payment flow unchanged.
- Regression: **CRITICAL** — verify no engage-timing changes; reuse existing `waitForOrderEngaged` / `waitForTableEngaged` calls verbatim.
- Docs: new memory/handover doc; flag backend ask BE-F (`default_landing_screen` settings key).

---

### 10.C1..C9 — Backend-blocked buckets (NOT for this iteration)

| Bucket | CR | Blocked-on |
|---|---|---|
| C1 | CR-005 #2 Phase B (POS confirmer name) | BE-2 |
| C2 | CR-005 #4 (per-item paid_at) | BE-3 |
| C3 | CR-005 #5 (order-level cancelled_by_name + ready_by_name + served_by_name) | BE-5/6/7 |
| C4 | CR-005 #4 (order-level lifecycle keys) | BE-9 |
| C5 | CR-005 #1 reliable PG snapshot | BE-10 |
| C6 | CR-008 #1 (delivery fee compute + restaurant origin) | BE-A |
| C7 | CR-008 #3 (dispatch + assign-rider integration) | BE-B/C/D/E (HARD-BLOCKING) |
| C8 | CR-008 #4 backend persistence | BE-F |
| C9 | CR-009 (operations timeline) | BE-11..14 (HARD-BLOCKING) |

For each: Implementation Agent must NOT start frontend work. When backend lands, this handover's backend-asks (§9) becomes the input for a new planning pass.

---

## 11. Cross-bucket regression checklist (run after every bucket lands)

- [ ] `/reports/audit` loads on welcomeresort + 18march; all 4 tabs (All / Paid / Cancelled / Hold + Running) populate.
- [ ] Filter date / search / PG checkbox / channel filter / platform filter all behave unchanged.
- [ ] CSV export for each tab opens cleanly with the expected column set.
- [ ] OrderDetailSheet drill-down opens for any row.
- [ ] Dashboard live socket update after place-order / cancel / transfer / merge.
- [ ] OrderEntry → CollectPaymentPanel → bill print round-trip.
- [ ] Re-Print KOT button still works on placed orders.
- [ ] Browser console: only documented `[BE-1 *]` / `[BE-2 *]` / `[BILL-PRINT]` informational lines; no new errors.
- [ ] `cd /app/frontend && CI=true yarn test --watchAll=false` — full suite green.
- [ ] `tail -50 /var/log/supervisor/frontend.out.log` — `webpack compiled successfully`.

---

## 12. Locked / Open question register (consolidated)

### Locked (no clarification needed)
| ID | Decision | Source |
|---|---|---|
| Q-A3 | PG Status = `snapshot_razorpay_status` literal; no FE derivation | CR-005 §10 |
| Q-A4 | PG cols visible only when PG checkbox checked | CR-005 §10 |
| Q-B4 | Web order with no auto/confirmer → ACTIONED BY blank `—` | CR-005 §10 |
| Q-D4 | Order Taken uses `created_at`; `order_serve_at` as Served proxy until BE-9 | CR-005 §10 |
| Reports no-fallback | Drop `Employee #<id>`, render blank | REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER §0 |
| CR-007 logic source | Reuse `OrderCard.handlePrintBill` verbatim, no live overrides | CR-007 §10 + user quote |

### Open (need user confirm before respective bucket)
| ID | Question | Default | Required for bucket |
|---|---|---|---|
| Q5-A | Phase A only (web attribution) ship now? | Yes | A4 |
| Q-V1 | Optional single-select toggle-off | Yes | A1, B1 |
| Q-V2 | Multi-select UI = checkbox rows | Yes | B1 |
| Q-V3 | `min=0,max=0` no-constraints | Yes | B1 |
| Q-V4 | Verify outbound `placeOrder` shape on preprod first | Mandatory | B1 (before merge) |
| Q-V5 | Auto-upgrade saved single → array on re-edit | Yes | B1 |
| Q-O1/O2/O3 | Format `#{orderId}`, chip in CartPanel, show when `orderId && canPrintBill && hasPlacedItems` | Yes | A2 |
| Q-T1/T2/T3 | Minutes integer, `—` for running, after ACTIONED BY | Yes | A3 |
| Q-D1..D5 | Delivery-fee formula source, Distance Matrix, fallback | TBD | C6 (blocked) |
| Q-N1..N5 | Setting scope, transfer/cancel landing, post-payment landing, key name, third option | Per-restaurant / Fresh / New blank / `default_landing_screen` / No | D1 |
| Q-OP1..9 | Operations canonical strings, naming, granularity, surface, visual, export, filter, retention, perf | TBD | C9 (blocked) |

---

## 13. Sign-off

This handover is final-input for the next Implementation Agent. The agent must:
1. Read `memory/final/FINAL_DOCS_APPROVAL_STATUS.md` and the four other final docs first.
2. Read this handover end-to-end. The pre-filled Approval Gates / File-Level Change Plans / Testing Checklists in §10 are drafts — print them as the actual Approval Gate per bucket and obtain explicit human approval before coding.
3. Confirm the open clarifications in §12 (or accept defaults).
4. Start with **Bucket A0a** (UI-COD-MASK), then **A0b** (ROLE-NAME-WIRE-FIX), then A1 → A2 → A3 → A4 → B1 → B2 → B3 → B4. D1 only on explicit user approval.
5. After each bucket: run §11 cross-bucket regression checklist.
6. After each bucket: write a per-bucket handover at `memory/handover/CR_BUCKET_<id>_HANDOVER.md` summarising what changed, files touched, tests run, residual gaps.
7. Wait for backend on Bucket C items.

**End of handover.**
