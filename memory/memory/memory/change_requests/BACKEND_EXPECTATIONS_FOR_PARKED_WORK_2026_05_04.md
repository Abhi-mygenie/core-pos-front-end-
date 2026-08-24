# Backend Expectations for Parked Work — 2026-05-04

**Audience:** Backend team (and the Backend Contract Agent who will intake this).
**Frontend branch state:** `5may` — sprint-accepted; 12 CRs `accepted` or `accepted_with_deferred_backend_dependency`. Test suite green (19/19 suites · 199/199 tests). `/app/memory/final/` baseline untouched.
**Author:** Backend Expectations Documentation Agent · 2026-05-04
**Mode:** Read-only planning document. **No code edits. No QA runs. No item unparked. No endpoint or field name invented beyond what source documents record — unknowns are marked `needs_backend_contract_definition`.**

---

## 0. Field-level summary (4-column glance table)

> One row per missing/undefined backend field or behaviour. Scan this table first to size the work. Detailed contracts for each row are in §3 (by ask) and §6 (sample payloads).
>
> **Status codes:** `additive` = new field on existing endpoint, no breaking change · `behaviour-change` = existing endpoint response semantics change · `new-endpoint` = endpoint does not exist today · `verify-only` = confirm data is already flowing correctly on preprod · `inferred` = name/shape drafted by FE, needs backend confirmation before implementation.

### 0.1 P0 — ship first (biggest unblock-per-day ratio)

| Field name | Page / Module | API endpoint | Impact if not given |
|---|---|---|---|
| `waiter_name` — `additive` (BE-1 P1) | Audit Report · `OrderTable.jsx` PUNCHED BY column | `POST /api/v2/vendoremployee/report/order-logs-report` | PUNCHED BY cell shows `Employee #<waiter_id>` on every row instead of the staff name |
| `collect_by_id` + `collect_by_name` — `additive` (BE-1 P2) | Audit Report · Paid tab · ACTIONED BY column | same | ACTIONED BY renders `Collected by —` (label only, no name) on every paid row |
| `cancel_by_id` + `cancel_by_name` — `additive` (BE-1 P2) | Audit Report · Cancelled tab · ACTIONED BY column | same | `Cancelled by —` shown instead of the canceller's name |
| `merge_by_id` + `merge_by_name` — `additive` (BE-1 P2) | Audit Report · Merged tab · ACTIONED BY column | same | `Merged by —` shown instead of the merger's name |
| `cancel_reason` — `additive` (BE-1 P3) | Audit Report · Cancelled tab · Reason column | same | Reason column is stuck at `—` for every cancelled row |
| `cancel_type` — `additive` (BE-1 P4; literal TBD — see Q-BE-1-P4) | Audit Report · Cancelled tab · new Cancellation Status column | same | Scoped Cancellation Status column (`Before cooking` / `Before serving` / `After serving`) cannot be rendered at all |
| `table_no` — `additive` (BE-1 P5) | Audit Report · TABLE NO column | same | TABLE NO falls back to generic `Dine-in` / `Delivery` / `Takeaway` / `Walk-in` on every row with a table |
| `room_info` (on RM parent rows) — `additive` (BE-1 P6) | Audit Report · RM rows + Room Orders Report cross-aggregation | same | Future cross-report aggregation blocked; N+1 detail-call pattern cannot be collapsed |
| `latest_order_id` — `additive` (BE-1 LOI) | Room Orders Report · `RoomOrdersReportPage.jsx` (cross-day in-house view) | `GET /api/v2/vendoremployee/get-room-list` | FE keeps the 3-call kludge (1 `/get-room-list` + 1 `/order-logs-report` lookback + N `/get-single-order-new`); Phase-2 FE-1 cannot ship clean; Unpaid pill defeats the defensive network AC |
| `/get-room-list` behaviour — `behaviour-change` (BE-1 G2 — exclude checked-out rooms; optional `?in_house_only=true` flag) | Room Orders Report · Unpaid / All pill | same | Checked-out rooms leak into the in-house list (observed: room `r1` lingered post-checkout with stale outstanding ₹17,120); FE defensive client filter stays in place |
| `associated_order_list[].payment_status` refresh — `behaviour-change` (BE-1 G3) | Room Orders Report · Outstanding amount | `POST /api/v2/vendoremployee/get-single-order-new` (RM parent id) | Outstanding stays inflated after room checkout (child SRM orders return stale `unpaid` even after settlement) |
| `room_info.lodging_collected` — `additive` (BE-2 §4.1) | Room Orders Report · SummaryBar Paid pill + new Paid column | same | Paid metric stays approximate (shows billed amount, not money-in-till); operator cannot reconcile end-of-day cash |
| `room_info.discount_amount` — `additive` (BE-2 §4.1) | Room Orders Report · new Discount column | same | Discounts are invisible; Owner cannot audit rogue write-offs or partial-collect scenarios |
| `room_info.discount_reason` — `additive` (BE-2 §4.1) | Room Orders Report · OrderDetailSheet room view | same | No record of approver/reason for a discount |

### 0.2 P1 — high-value quick wins

| Field name | Page / Module | API endpoint | Impact if not given |
|---|---|---|---|
| `snapshot_razorpay_status` (+ 6 sibling snapshot keys: `snapshot_razorpay_amount`, `snapshot_razorpay_method`, `snapshot_amount_match`, `snapshot_status_match`, `snapshot_mismatch_flag`, `snapshot_fetched_at`) — `additive` (BE-W2) | Audit Report · PG Status column (auto-reveal; **zero FE code change at ship**) | `POST /api/v2/vendoremployee/report/order-logs-report` | PG Status column stays hidden (auto-reveal guard waits for any row to return a non-null value); B2 Phase 2 blocked |
| `merged_at` + `transferred_at` + `credited_at` **OR** single unified `action_at` — `additive` (BE-T — option a/b) | Audit Report · new ACTION TIME + TIME DIFF (min) columns | `POST /api/v2/vendoremployee/report/order-logs-report` | A3 bucket blocked; `updated_at` fallback lies on merged/transferred/credited rows if row is edited after the terminal action |
| `orderDetails[i].cancel_by_name` — `additive` (BE-V) | OrderDetailSheet · item card "Cancelled By" line | `POST /api/v2/vendoremployee/get-single-order-new` | Item card renders `Employee #<cancel_by>` synthesis instead of the real staff name; B3 bucket blocked |
| `is_auto_confirmed` (0/1) + `order_from === 'web'` — `verify-only` (BE-U Phase A) | Audit Report · PUNCHED BY / ACTIONED BY on web/scan rows | `POST /api/v2/vendoremployee/report/order-logs-report` | A4 Phase A blocked; FE will not ship `'Customer'`/`'Auto'` literals without a reproducible preprod trace (risk of rendering labels on empty data) |
| POS confirmer name field (name TBD — `needs_backend_contract_definition`) — `additive` (BE-U Phase B) | Audit Report · ACTIONED BY on manually-confirmed web rows | same | A4 Phase B blocked; ACTIONED BY stays `—` on non-auto-confirmed web rows |

### 0.3 P2 — depends on backend scheduling or moderate FE work

| Field name | Page / Module | API endpoint | Impact if not given |
|---|---|---|---|
| `orderDetails[i].order_serve_at` — `additive` (BE-W) | OrderDetailSheet · Order Timeline Served stage | `POST /api/v2/vendoremployee/get-single-order-new` | Served stage keeps being derived by fragile item-array reduction (SM-03-compliant but not authoritative) |
| `orderDetails[i].paid_at` — `additive` (BE-W) | OrderDetailSheet · Item Timeline Paid stage | same | Per-item Paid stage missing; 4-stage lifecycle cannot show completion per item |
| `orderDetails[i].ready_by_name` — `additive` (BE-W) | OrderDetailSheet · Item Timeline Ready By line | same | No actor name on Ready stage; operator cannot identify who marked ready |
| `orderDetails[i].served_by_name` — `additive` (BE-W) | OrderDetailSheet · Item Timeline Served By line | same | No actor name on Served stage |
| `default_landing_screen` (enum: `'dashboard' \| 'order_entry' \| 'table_view'` — **literals `needs_backend_contract_definition`**) — `additive` (BE-F) | Settings toggle + post-Collect-Bill navigation | `GET /restaurant/profile` + `PUT` path TBD (`needs_backend_contract_definition`) | Phase B persistence blocked; toggle stays browser-local and does not follow the user across devices |
| Rider list endpoint — `new-endpoint` + `inferred` (CR-008 #3 — likely `GET /api/v1/vendoremployee/riders?status=available`) | DeliveryCard · Assign Rider picker | endpoint path TBD | Picker cannot list available riders; rider assignment feature is entirely absent from POS |
| Assign-rider endpoint — `new-endpoint` + `inferred` (CR-008 #3 — likely `POST /api/v1/vendoremployee/order/assign-rider` with `{order_id, rider_id}`) | DeliveryCard · Assign Rider action | endpoint path TBD | POS cannot assign a rider to an order (only receives inbound `DELIVERY_ASSIGN_ORDER` socket events from elsewhere) |
| Mark-dispatched endpoint — `new-endpoint` + `inferred` (CR-008 #3 — likely `POST /api/v1/vendoremployee/order/dispatch-order` with `{order_id}`, or fold into assign with `auto_dispatch: true`) | DeliveryCard · Mark Dispatched button | endpoint path TBD | Orders cannot be moved from assigned → dispatched from POS |
| `operations[].operation` enum confirmation (~13 literals — `mark_unpaid`, `payment_method_change`, `item_quantity_edit`, `item_cancel`, `order_cancel`, `order_edit`, `transfer_food_item`, `merge_table`, `transfer_order_in`, `ready_serve`, `collect_bill`, `split_bill`, `tab_out`) — `needs_backend_contract_definition` (CR-009 Q-OP1) | OrderDetailSheet · new Operations timeline section | `POST /api/v2/vendoremployee/report/order-logs-report` (backend already ships `operations[]` — contract undefined) | Full audit trail not rendered; only the 4-stage canonical lifecycle stays visible; "who did what to this order" question unanswered |
| `operations[].vendor_employee_name` + canonical per-op timestamp field — `additive` (CR-009) | same | same | Each operation entry attributes to `Employee #<id>` only; timeline sort order ambiguous until timestamp field name confirmed |

### 0.4 P3 — owner / product decision required first

| Field name | Page / Module | API endpoint | Impact if not given |
|---|---|---|---|
| `permissions[0]` contract guarantee (or new `roleTier` field) — `verify-only` + possible `additive` (CR-010 Q-RP-01) | All 4 A0b wire consumers (running-orders GET, order-confirm PUT, order-status-update PUT×3) | `GET /restaurant/profile` (or equivalent) | Undocumented assumption that `permissions[0]` is always the role-tier; silent wire-value flip risk if backend ever returns the array unsorted |
| Server-side enforcement of `'Manager'` as canonical tier — `verify-only` (CR-010 Q-RP-02) | same | — (server rules) | Unknown whether any action is gated on a finer tier (e.g. `Manager`-only but not `Captain`); potential silent privilege drift |
| `permissions-changed` socket event — `new-endpoint` (CR-010 Q-RP-09) | All RBAC surfaces session-wide | socket | Stale `permissions` mid-session (requires re-login after a manager promotes a waiter) |

### 0.5 Upstream-investigation (not yet a scheduled backend ask — see §10)

| Field / Behaviour | Page / Module | API endpoint | Impact if not fixed |
|---|---|---|---|
| `/get-single-order-new` returns stale `payment_status: "paid"` after a successful `/make-order-unpaid` — `behaviour-change` (investigation) | Audit Report · side panel badge after Mark-Unpaid | `POST /api/v2/vendoremployee/get-single-order-new` | Operator flips paid→unpaid, list row moves to Unpaid tab, but side panel still badges Paid. FE-side investigation exhausted; likely read-replica lag or divergent view. CR-004 FE-2 cannot cleanly ship until confirmed. |

### 0.6 Not backend-related (listed so the backend team can skip)

| Item | Why skipped |
|---|---|
| CR-002 (status/tab classifier unification) | Pure frontend refactor (AC #6: "No API/socket/payload change") |
| CR-013 (GST config correction) | Profile keys `deliver_charge_gst` + `service_charge_tax` already exposed; FE math fix only |
| CR-012 (Big Buddha filling max-label mismatch) | Menu-config data cleanup for Palm House tenant; restaurant-ops task |
| CR-011 / BE-A (PG scan-paid lingers post-serve) | Closed — not reproduced on 2026-05-03 |
| UX-LOADING-02 (station-loader visibility) | Frontend UX Phase-3 CR; owner option-pick pending |

---

## 1. Executive summary

The frontend has completed all sprint-accepted work it can ship without backend cooperation. 14 parked items now block further progress, falling into **three clean buckets**:

| Bucket | Count | Nature |
|---|---|---|
| **Backend contract asks** (fields, endpoints, payload changes) | 9 — BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-F, plus CR-008 Sub-CR #3 new endpoints | Deliver these and FE unblocks the corresponding CR/bucket. |
| **Backend-gated FE phases** (waiting on one of the 9 above) | 5 — B2 Phase 2, B3, A3, A4, B4, CR-008 #4 Phase B, CR-011 (if it reproduces) | Ship-gated by the contract asks. No independent backend work needed. |
| **Not backend-related** (frontend refactor / owner decision / menu ops) | 4 — CR-002, CR-013, CR-012, CR-010 | Listed here only because the intake brief named them; no backend ask is open. |

**Headline ask:** five of the nine contract asks (**BE-1, BE-2, BE-W2, BE-F, BE-T**) together unblock 8 of the 14 parked items. They are strongly recommended as the first backend sprint. See §5 for the full priority stack.

**Additivity:** every FE-blocking contract change in this document is **purely additive** — no field renames, no type changes, no removed fields, no existing consumer impact. Frontend already reads every new field defensively via optional chaining.

---

## 2. Files inspected

### 2.1 Planning / state docs
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md`
- `qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md`
- `qa_reports/QA_REPORT_INDEX.md`

### 2.2 Root-level CR / backend-ask docs
- `BE_1_BACKEND_ASKS_CONSOLIDATED.md` (the canonical BE-1 contract — CR-001 + CR-004)
- `BE_2_LODGING_PAYMENT_BREAKDOWN.md` (BE-2 contract)
- `CR_001_all_orders_status_derivation.md` (context; shipped)
- `CR_001_AUDIT_SRM_BADGE_FIX.md` (FE-3; shipped)
- `CR_002_unify_status_and_tab_logic.md`
- `CR_003_paid_hold_order_actions.md` (context; shipped)
- `CR_004_BACKEND_EXT_sub_cr.md` (parent sub-CR that BE-1 replaces)
- `CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md` (FE-1 — depends on BE-1 `latest_order_id` + G2)
- `CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md` (FE-2 — upstream backend investigation §0 about stale-paid `/get-single-order-new`)
- `CR_004_room_orders_pms_view.md` (CR-004 master)
- `CR_005_AUDIT_REPORT_PG_LIFECYCLE_AND_USER_ATTRIBUTION.md` (CR-005; names BE-9/BE-3/BE-10 etc.)
- `CR_006_VARIATION_MODAL_OPTIONAL_AND_MULTISELECT.md` (shipped)
- `CR_007_ORDERID_VISIBILITY_AND_PRINT_BILL_IN_ORDER_ENTRY.md` (shipped)
- `CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md` (Phase A shipped; Phase B = BE-F)
- `CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` (Sub-CR #1..#4; #3 = new endpoints)
- `CR_009_OPERATIONS_AUDIT_TIMELINE.md` (needs `operations[]` list contract confirmation)
- `CR_010_ROLES_AND_PERMISSIONS_CONSOLIDATION.md` (mostly frontend; 3 small backend asks)
- `CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` (marked **CLOSED — NOT REPRODUCED** 2026-05-03; BE-A listed in tracker as LOW)
- `CR_012_BIG_BUDDHA_FILLING_MAX_LABEL_MISMATCH.md` (menu-config, `not_backend_related`)
- `CR_013_GST_CONFIG_CORRECTION.md` (frontend-only; profile keys already exposed)

### 2.3 Implementation handovers
- `implementation_handover/CR_BUCKETS_A3_A4_PARKED_HANDOVER.md` (A3 + A4 + B3 + B4 parking; BE-T, BE-U, BE-V, BE-W, BE-W2 scope)
- `implementation_handover/CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` (B2 Phase 1 shipped; Phase 2 gated on BE-W2)
- `implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` (§10.A3..A4..B3..B4; §12)
- `implementation_handover/CR_BUCKET_A0b_ROLE_NAME_WIRE_FIX_HANDOVER.md` (A0b — informs CR-010 Q-RP items)

### 2.4 Baseline (read-only, untouched by this cycle)
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` (SM-03 status priority; API-02 transform contract; MC-06 backend-aggregation ownership)
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

### 2.5 Impact analysis / summaries
- `impact_analysis/CR_001_IMPACT_ANALYSIS.md`, `CR_003_IMPACT_ANALYSIS.md`, `CR_004_IMPACT_ANALYSIS.md`
- `implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md`, `CR_004_IMPLEMENTATION_SUMMARY.md`

---

## 3. Backend expectation table (master)

Legend: FE-ready `yes` = unblock is a 1-line wire change or zero frontend code; `partial` = frontend has a defensive fallback; `no` = FE work remains post-contract.

### 3.1 BE-1 — `/order-logs-report` + `/get-room-list` + `/get-single-order-new` enrichment (CR-001 + CR-004)

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-001 P1–P6 + CR-004 Phase 2 (FE-1) + BE-1 G2, G3, `latest_order_id` |
| **Business reason** | Audit Report columns (PUNCHED BY / ACTIONED BY / TABLE NO / Cancel Reason / Cancel Type) today show `Employee #<id>` / `—` labels because names/reasons are missing. Room Orders Report cannot cross-day list in-house rooms without `latest_order_id`; Outstanding amount stays inflated after checkout because `associated_order_list[].payment_status` is stale. |
| **Current blocker** | Backend team scheduling. Contract is fully drafted (`BE_1_BACKEND_ASKS_CONSOLIDATED.md`). |
| **Required backend change** | **Additive** fields on three existing endpoints (no renames, no type changes). See §6.1 for full payload samples. |
| **Existing endpoints** | `POST /api/v2/vendoremployee/report/order-logs-report`; `GET /api/v2/vendoremployee/get-room-list`; `POST /api/v2/vendoremployee/get-single-order-new` |
| **New endpoints** | None |
| **Request payload** | Unchanged on all three |
| **Response payload** | See §6.1 for additive fields |
| **Required fields added** | On `/order-logs-report` rows: `waiter_name`, `collect_by_id`, `collect_by_name`, `cancel_by_id`, `cancel_by_name`, `merge_by_id`, `merge_by_name`, `cancel_reason`, `cancel_type`, `table_no`, `room_info` (RM rows only). On `/get-room-list` items: `latest_order_id`. On `/get-single-order-new` RM-parent response: refreshed `associated_order_list[].payment_status`. |
| **Field types** | All names/labels/reasons = `string \| null`. `*_by_id` = `integer \| null`. `cancel_type` = `string \| null` (enum: see §6.1.P4). `table_no` = `string \| null`. `room_info` = object with three numeric-string fields. `latest_order_id` = `string \| null`. |
| **Null/default** | Null when not applicable (e.g. `cancel_by_name` null on paid rows; `latest_order_id` null on rooms between bookings). Frontend already reads with optional chaining. |
| **Validation rules** | `cancel_type` literal MUST match one of the agreed values (§6.1.P4). |
| **Error cases** | None new — endpoints keep existing 4xx/5xx behaviour. |
| **FE screens/modules affected** | Audit Report table (`OrderTable.jsx`); Room Orders Report (`RoomOrdersReportPage.jsx`, `RoomRowCard.jsx`); OrderDetailSheet drill-down. |
| **FE already wired?** | **Yes (defensive)** — all 9 asks have 1-line consumer changes queued in `BE_1_BACKEND_ASKS_CONSOLIDATED.md` §7. Diagnostic logs live today to verify delivery. |
| **QA acceptance** | See §8.1 (9 ACs rolled up from P1..P6 + G2 + G3 + LOI). |
| **Priority** | **P0** — unblocks the single largest parked surface (Audit Report polish + Room Orders cross-day view). |
| **Dependencies** | None upstream |
| **Open questions** | `cancel_type` literal mapping (see §10 Q-BE-1-P4); backward-compat if `/get-room-list` legacy consumers need the pre-G2 behaviour (propose `?in_house_only=true` flag per §6.1.G2). |

### 3.2 BE-2 — Lodging payment breakdown (room_info shape extension)

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-004 Phase 2 (accurate Paid-column calculation); subsumes BE-1 P6 once delivered |
| **Business reason** | Today frontend cannot distinguish *discount* from *unpaid* from *backend bug* on a checked-out room with non-zero `balance_payment`. All three look identical. Operator cannot reconcile end-of-day cash; Owner cannot audit rogue discounts. |
| **Current blocker** | Backend scheduling. Full contract drafted (`BE_2_LODGING_PAYMENT_BREAKDOWN.md`). |
| **Required backend change** | Additive — 3 mandatory fields + 1 optional array on `room_info`. |
| **Existing endpoints** | `POST /api/v2/vendoremployee/get-single-order-new` (RM-parent response); ideally also `POST /api/v2/vendoremployee/report/order-logs-report` RM rows (subsumes BE-1 P6). |
| **New endpoints** | None |
| **Request payload** | Unchanged |
| **Response payload** | See §6.2 |
| **Required fields added (mandatory §4.1)** | `room_info.lodging_collected` (string decimal), `room_info.discount_amount` (string decimal), `room_info.discount_reason` (string \| null) |
| **Field types** | All three are string-decimal (matches existing `room_price` / `balance_payment` / `advance_payment` shape). |
| **Invariant** | `lodging_collected + discount_amount + balance_payment === room_price`. `discount_amount === 0` while in-house. `balance_payment === 0` on a cleanly-settled room. |
| **Null/default** | `discount_reason` null when `discount_amount === 0`. |
| **Validation rules** | Invariant above. FE will log a warning if it fails; backend should enforce. |
| **Error cases** | None new. |
| **FE screens affected** | Room Orders Report (SummaryBar Paid pill, per-room Paid / Discount columns, OrderDetailSheet room view). |
| **FE already wired?** | **Partial** — FE ships an approximation today (fos===6 ⇒ paid ≈ billed). Post-BE-2 switches to the exact formula in ~10 lines. |
| **QA acceptance** | See §8.2. |
| **Priority** | **P0** — unblocks accurate money-in-till reporting; high business value. |
| **Dependencies** | None upstream |
| **Open questions** | Whether optional `payment_breakdown[]` (§4.2 of BE-2 doc) ships in same batch (recommended: defer to phase 2). |

### 3.3 BE-T — Audit Report action-time dedicated timestamps (A3)

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-008 Sub-CR #2 (Action Time + Time Diff columns) |
| **Business reason** | Ops wants visible `ACTION TIME` and `TIME DIFF (min)` columns to spot-check slow/cancelled orders. Today `api.updated_at` is used as fallback for merged / transferred / credited — lies when an unrelated edit occurs after the terminal action. |
| **Current blocker** | Dedicated terminal-action timestamps do not exist in the audit row payload for `merged_at`, `transferred_at`, `credited_at` (grep-confirmed per `CR_BUCKETS_A3_A4_PARKED_HANDOVER.md` §2.3). |
| **Required backend change** | Either (a) add dedicated `merged_at`, `transferred_at`, `credited_at` fields to the audit row response, OR (b) add a single `action_at` field computed server-side per row's terminal status (cleaner). |
| **Existing endpoint** | `POST /api/v2/vendoremployee/report/order-logs-report` |
| **New endpoints** | None |
| **Fields added** | Option (a): `merged_at`, `transferred_at`, `credited_at` — ISO timestamp strings. Option (b): `action_at` — ISO timestamp string, null for running rows. |
| **Field types** | string (ISO `YYYY-MM-DD HH:MM:SS`) \| null |
| **Null/default** | null for running/hold/audit rows with no terminal action. |
| **FE already wired?** | **No** — A3 bucket parked pending this field. ~5-minute implementation once delivered. |
| **QA acceptance** | Per terminal status (cancelled / merged / paid / transferred / credit), ACTION TIME cell matches the operator-visible action time (not an unrelated edit). Running rows show `—`. |
| **Priority** | **P1** |
| **Dependencies** | None |
| **Open questions** | Option (a) vs (b) — owner/backend call. |

### 3.4 BE-U — Web order attribution data live-verify (A4 Phase A)

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-005 Phase A (PUNCHED BY = `Customer`, ACTIONED BY = `Auto` for web orders) |
| **Business reason** | Audit Report should attribute scan/web orders to the customer and their auto-confirm flag instead of an empty waiter cell. |
| **Current blocker** | Two fields the FE wants to read — `api.is_auto_confirmed` (0/1) and `api.order_from === 'web'` — have not been **live-verified** on preprod web orders. Owner refused to ship without a reproducible trace lest FE render `'Customer'`/`'Auto'` on empty data. |
| **Required backend change** | **No new code ideally — verification only.** Confirm (via preprod trace / response sample) that both fields are populated correctly on every web row. If missing, ship them. |
| **Existing endpoint** | `POST /api/v2/vendoremployee/report/order-logs-report` |
| **Fields touched** | `is_auto_confirmed` (integer 0/1), `order_from` (string; must be exactly `'web'` on customer-scan orders) |
| **Null/default** | `is_auto_confirmed` must be `0` for not-yet-confirmed / non-auto-confirmed rows (not null). |
| **FE already wired?** | **No** — A4 parked. 5-minute implementation once verified. |
| **QA acceptance** | Place a scan order, verify payload carries `is_auto_confirmed: 1` + `order_from: 'web'`. Manually-confirmed scan order carries `is_auto_confirmed: 0` + `order_from: 'web'`. |
| **Priority** | **P1** (verification-only ask; cheap) |
| **Dependencies** | None |
| **Open questions** | Phase B (POS confirmer name for non-auto-confirmed web rows) is a separate ask — see BE-U-P2 below. |

### 3.5 BE-V — Item-level `cancel_by_name` on `/get-single-order-new`

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | B3 (drop `Employee #<id>` synthesis on side-panel item-card "Cancelled By" line) |
| **Business reason** | Side panel "Cancelled By" on item cards currently shows `Employee #<id>`; operator cannot identify the canceller by name. The per-item `cancel_by` (id) is present; the name is not. A0b already covered the **wire**-side role name consistency; B3 covers the **display** of the per-item cancelling user. |
| **Current blocker** | Backend has not shipped `orderDetails[i].cancel_by_name`. A0b did NOT client-synthesise this; the `Employee #<cancel_by>` fallback at `reportTransform.js:625-626` is the documented stop-gap. |
| **Required backend change** | Add `cancel_by_name` (string \| null) to each `orderDetails[i]` in the `/get-single-order-new` response (item-level). |
| **Existing endpoint** | `POST /api/v2/vendoremployee/get-single-order-new` |
| **Field** | `orderDetails[i].cancel_by_name` — string (full name), null on non-cancelled items. |
| **Null/default** | null when `orderDetails[i].cancel_by` is null. |
| **FE already wired?** | **Partial** — fallback-in-place. 1-line consumer change (remove the `Employee #` synthesis fallback). |
| **QA acceptance** | Cancel an item on a live order → reload side panel → item card "Cancelled By" shows the real staff name, not `Employee #N`. |
| **Priority** | **P1** |
| **Dependencies** | None |
| **Open questions** | Should the same contract also cover `ready_by_name` and `served_by_name` (CR-005 Req #5 partial)? Currently bundled into BE-W — see §3.7. |

### 3.6 BE-W2 — `snapshot_razorpay_status` reliably populated (B2 Phase 2 PG Status auto-reveal)

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-005 #1 Phase 2 — the 3-column PG block (PG Order Id / PG Amount / **PG Status**) on Audit Report |
| **Business reason** | Frontend already ships the auto-reveal guard for the PG Status column — the column self-unhides as soon as any Audit row returns a non-null `snapshot_razorpay_status`. Today all live PG rows return `null` for the snapshot (see sample payload in `CR_005_AUDIT_REPORT_PG_LIFECYCLE_AND_USER_ATTRIBUTION.md` §2.1). Column therefore stays hidden. |
| **Current blocker** | Backend snapshot job / webhook handler does not populate `snapshot_razorpay_status` (and sibling snapshot keys) on PG rows. |
| **Required backend change** | Populate `snapshot_razorpay_status` (and ideally also `snapshot_razorpay_amount`, `snapshot_razorpay_method`, `snapshot_amount_match`, `snapshot_status_match`, `snapshot_mismatch_flag`, `snapshot_fetched_at`) post-webhook, on PG-checked rows only. |
| **Existing endpoint** | `POST /api/v2/vendoremployee/report/order-logs-report` |
| **Fields touched** | `snapshot_razorpay_status` (string — Razorpay-native status literals: `captured` / `authorized` / `failed` / `refunded` / etc.) |
| **Null/default** | null until first snapshot fetch. **FE will not derive**, per owner lock Q-A3. |
| **FE already wired?** | **Yes (zero-code-change when backend ships)** — the auto-reveal guard inspects rows and unhides the column the moment any value is non-null. |
| **QA acceptance** | On a tenant with completed Razorpay orders, Audit Report PG Status column auto-appears showing the canonical Razorpay status per row. FE renders the literal verbatim (`'captured'` etc.), no transformation. |
| **Priority** | **P1** |
| **Dependencies** | None FE-side |
| **Open questions** | Whether backend should also surface the other 6 snapshot fields in the same batch (FE will read them opportunistically if provided). |

### 3.7 BE-W — `order_serve_at`, per-item paid-stage, and lifecycle actor names

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | B4 (item-level "Order Taken" stage + order-level timeline refinement); CR-005 Req #4 (4-stage lifecycle); CR-005 Req #5 partial (actor names beyond cancel) |
| **Business reason** | Side-panel Item Timeline and Order Timeline should reflect a full 4-stage lifecycle (Order Taken → Ready → Served → Paid) and name the actor at each stage. Today, order-level Served is derived from item-array reductions (fragile; SM-03 baseline-compliant but not authoritative). |
| **Current blocker** | Backend has not shipped (a) `order_serve_at` replicated on each `orderDetails[i]` (the proxy FE will use for order-level Served until true order-level keys ship), (b) per-item paid-stage fields, (c) `ready_by_name` / `served_by_name` per item. |
| **Required backend change** | Multiple additive fields on `/get-single-order-new`. |
| **Fields added** | Per-item (on `orderDetails[i]`): `order_serve_at`, `paid_at` (nullable until payment), `ready_by_name`, `served_by_name`. Order-level (top of response): `ready_at`, `served_at`, `paid_at` are welcome but not required — FE will proxy from `orderDetails[0].order_serve_at` + `order.updated_at` while PS==paid. |
| **Field types** | All timestamps = string ISO `YYYY-MM-DD HH:MM:SS` \| null. Names = string \| null. |
| **Null/default** | null when stage not reached or actor unknown. |
| **FE already wired?** | **No** — B4 bucket parked; transform changes scoped in `CR_005_AUDIT_REPORT_PG_LIFECYCLE_AND_USER_ATTRIBUTION.md` §3.3 / §3.4. |
| **QA acceptance** | Serve an item; reload side panel; Item Timeline shows a **Served** entry with the correct staff name and timestamp. Same for Ready. Pay the order; Paid stage fills per item. |
| **Priority** | **P2** |
| **Dependencies** | Can ship independently of BE-V. Same endpoint; backend may batch all actor-name fields together. |
| **Open questions** | Whether backend prefers to group all `*_by_name` fields (cancel + ready + served) in one ship (recommended). |

### 3.8 BE-F — Default landing-screen persistence (CR-008 #4 Phase B)

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-008 Sub-CR #4 Phase B (server-side persistence of the "default landing after Collect Bill" toggle) |
| **Business reason** | Phase A shipped with browser-local storage (`mygenie_default_landing_screen`). Phase B moves the setting to restaurant profile so it follows the user across devices and is auditable. |
| **Current blocker** | Backend profile API does not expose a `default_landing_screen` field. |
| **Required backend change** | Add `default_landing_screen` (string enum: `'dashboard' \| 'order_entry' \| 'table_view'` — exact literals `needs_backend_contract_definition`) to the restaurant profile API, with a PUT endpoint to update. |
| **Existing endpoint** | `GET /api/v1/vendoremployee/restaurant/profile` (or equivalent — `needs_backend_contract_definition`) — add the new field. Update path: `needs_backend_contract_definition` (likely `PUT /restaurant/settings` or similar). |
| **Field added** | `default_landing_screen` — string (enum), nullable (default `null` = use app default `'dashboard'`). |
| **FE already wired?** | **Partial** — Phase A shipped with browser-local stub; migration to profile-backed is a 1-file change (swap storage read/write from localStorage → profile API). |
| **QA acceptance** | Change the toggle on Device A → log in on Device B → same setting applies. |
| **Priority** | **P2** (Phase A serves 95% of the value; Phase B is a quality upgrade) |
| **Dependencies** | None |
| **Open questions** | Exact endpoint URL + enum literals (`needs_backend_contract_definition`); per-user vs per-restaurant scope (Owner already accepted per-restaurant/browser-global — but Phase B changes this — need owner reconfirm). |

### 3.9 CR-008 Sub-CR #3 — Delivery dispatch / assign-rider endpoints

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-008 Sub-CR #3 (delivery rider assignment + dispatch) |
| **Business reason** | POS cannot assign a rider or mark an order dispatched today. Only inbound socket event exists (`DELIVERY_ASSIGN_ORDER` receives pushes from elsewhere). No outbound path from POS. |
| **Current blocker** | Frontend grep: zero `assignRider` / `dispatchOrder` / `assign-rider` / `dispatch-order` / `ASSIGN_RIDER` references exist. The feature has **no endpoint contract** on either side. |
| **Required backend change** | **`needs_backend_contract_definition`** — three endpoints needed: (1) list available riders, (2) assign rider to order, (3) mark dispatched (or combine with assign). Names, paths, and payload shapes all undefined. |
| **Existing endpoints** | None |
| **Proposed new endpoints** (all **inferred; names and paths `needs_backend_contract_definition`**) | (1) `GET /api/v1/vendoremployee/riders?status=available` — returns `[{ id, name, phone, status }]`. (2) `POST /api/v1/vendoremployee/order/assign-rider` — `{ order_id, rider_id }`. (3) `POST /api/v1/vendoremployee/order/dispatch-order` — `{ order_id }` (or fold into assign). |
| **Request / response payloads** | Inferred — see §6.3. All samples labeled `INFERRED`. |
| **FE already wired?** | **No** — no service file exists. Medium-size FE work after backend ships. |
| **QA acceptance** | From DeliveryCard, pressing "Assign Rider" opens a picker; selecting a rider + confirm triggers `POST` → socket emits `DELIVERY_ASSIGN_ORDER` → card updates to show rider name/phone. "Mark Dispatched" flips the state and card advances. |
| **Priority** | **P2** |
| **Dependencies** | Backend roadmap |
| **Open questions** | See §10 Q-D3-1..Q-D3-6 (rider-listing model, auto-dispatch toggle semantics, socket echo fields). |

### 3.10 BE-1-CR-009 — Operations timeline list contract

| Aspect | Detail |
|---|---|
| **Related CR / bucket** | CR-009 (Operations Audit Timeline) |
| **Business reason** | Backend already ships `operations[]` on `/order-logs-report` rows. Frontend ignores it. Once FE consumes it, operator sees a full "who did what to this order" audit trail beyond the 4-stage canonical lifecycle. |
| **Current blocker** | Exact string set of `operation` values (~13 operation types expected — see §3 of `CR_009_OPERATIONS_AUDIT_TIMELINE.md`) and the per-operation timestamp field name (`created_at` vs `updated_at` vs `operation_time`) **not confirmed** by backend. |
| **Required backend change** | **Mostly documentation** — confirm the enum of `operation` string values + the timestamp field. If any of the 13 listed operations are not currently logged, add them. |
| **Existing endpoint** | `POST /api/v2/vendoremployee/report/order-logs-report` (and ideally also `/get-single-order-new` for side-panel consistency) |
| **Fields already present** | `operations[]` — confirmed from earlier payload screenshot; per-operation fields include `operation`, `vendor_employee_id`, `id`, `restaurant_id`, `order_id`, `restaurant_order_id`, `source_order_id`, `source_table_id`, `order_type`, `payment_type`, `previous_payment_method`, `current_payment_method`, `previous_payment_status`, `current_payment_status`. |
| **Fields that may need adding** | Per-operation: actor name (`vendor_employee_name`) to avoid client-side `Employee #<id>` synthesis; a clear timestamp (`created_at` recommended). |
| **FE already wired?** | **No** — CR-009 parked pending contract confirmation; transform layer + OrderDetailSheet section scoped in CR-009 §4. |
| **QA acceptance** | For each of the 13 operation types (mark_unpaid, payment_method_change, item_quantity_edit, item_cancel, order_cancel, order_edit, transfer_food_item, merge_table, transfer_order_in, ready_serve, collect_bill, split_bill, tab_out), a live preprod trace shows the entry with the expected fields. |
| **Priority** | **P2** |
| **Dependencies** | None |
| **Open questions** | Q-OP1 (exact enum + timestamp name — see §10). |

### 3.11 Items marked `not_backend_related` or `needs_backend_contract_definition`

| Item | Verdict | Justification |
|---|---|---|
| **A3** | `backend_gated_on_BE-T` (not a new backend ask) | Parked bucket waiting on BE-T. Covered in §3.3. |
| **A4** | `backend_gated_on_BE-U` | Covered in §3.4. |
| **B3** | `backend_gated_on_BE-V` | Covered in §3.5. |
| **B4** | `backend_gated_on_BE-W` | Covered in §3.7. |
| **B2 Phase 2** | `backend_gated_on_BE-W2` | Covered in §3.6. |
| **CR-008 #4 Phase B** | `backend_gated_on_BE-F` | Covered in §3.8. |
| **CR-008 Sub-CR #3** | `needs_backend_contract_definition` | Covered in §3.9. |
| **CR-009** | `needs_backend_contract_definition` (partial — enum confirmation) | Covered in §3.10. |
| **CR-010** | **mostly `not_backend_related`**; carries 3 small backend-involving questions — see §3.12. |
| **CR-002** | `not_backend_related` — frontend refactor only (unify status classifier); AC #6 explicitly "No API/socket/payload change". |
| **CR-013** | `not_backend_related` — reads already-exposed profile keys (`deliver_charge_gst`, `service_charge_tax`); frontend-only GST math fix. Backend exposure confirmed per `CR_013_GST_CONFIG_CORRECTION.md` §2. |
| **CR-012** | `not_backend_related` — menu-config data cleanup for Palm House; restaurant-ops ticket, not a frontend/backend code change. |
| **CR-011 / BE-A** | **CLOSED — NOT REPRODUCED** 2026-05-03. Tracker row retains BE-A at LOW priority in case it reappears. No active backend ask. |

### 3.12 CR-010 — backend-side questions (only 3 of 9; rest are FE/product)

Three of the nine Q-RP questions are backend-facing:

| Q-ID | Question | What backend should confirm/ship |
|---|---|---|
| **Q-RP-01** | Is `permissions[0]` guaranteed to be the role-tier across all restaurants and all user types (Owner/Manager/Waiter/Captain/Cashier/…)? | Either (a) document that position 0 is always the tier, or (b) add a dedicated `roleTier` field on the profile API. |
| **Q-RP-02** | Is the wire value `'Manager'` the canonical "manager-or-above" tier for the 4 A0b endpoints? Are any server-side rules gated by a finer tier (e.g. only `Manager` not `Captain`)? | Document what the server enforces; frontend canonicalises to `'Manager'` today and relies on backend parity. |
| **Q-RP-09** | How should the frontend pick up stale `permissions` mid-session (e.g. a manager promotes a waiter)? Today requires re-login. Is a `permissions-changed` socket event feasible? | Confirm current behaviour; flag future socket event if needed. |

The other 6 questions (Q-RP-03/04/05/06/07/08) are FE or product calls.

---

## 4. Grouped by backend domain

### Domain 1 — Room / lodging reports
- **BE-1** `/get-room-list` enrichment (`latest_order_id`, G2 filter) + `/get-single-order-new` RM refresh (G3) + `/order-logs-report` `room_info` on RM rows (P6)
- **BE-2** Lodging payment breakdown (`lodging_collected`, `discount_amount`, `discount_reason`)
- Backend-gated follow-ups: CR-004 Phase 2 FE-1 (cross-day in-house view) + CR-004 Phase 2 FE-2 (Remove-from-Room + Paid column + Rent→Total relabel)
- Known upstream bug: CR-004 FE-2 §0 — `/get-single-order-new` returns stale `payment_status: 'paid'` after a successful `/make-order-unpaid`. Likely read-replica lag or denormalised view. See §11.

### Domain 2 — Audit report / lifecycle timestamps
- **BE-1 Bucket A** — `/order-logs-report` row display fields (P1–P5: `waiter_name`, `*_by_*`, `cancel_reason`, `cancel_type`, `table_no`)
- **BE-T** — dedicated terminal-action timestamps (A3)
- **BE-W** — order-level lifecycle timestamps + per-item paid-stage + per-stage actor names (B4)
- **BE-1-CR-009** — `operations[]` enum + timestamp confirmation (CR-009)

### Domain 3 — Payment / PG status
- **BE-W2** — populate `snapshot_razorpay_status` (+ 6 sibling snapshot keys) on PG-checked audit rows

### Domain 4 — Default settings / landing persistence
- **BE-F** — `default_landing_screen` field on profile API + PUT path (CR-008 #4 Phase B)

### Domain 5 — Delivery dispatch / assign flow
- **CR-008 Sub-CR #3** — 3 new endpoints (list riders, assign rider, mark dispatched)

### Domain 6 — Role / user attribution
- **BE-U** — live-verify `is_auto_confirmed` + `order_from === 'web'` on preprod web rows (A4 Phase A)
- **BE-U Phase B** — POS confirmer name field for non-auto-confirmed web rows (future; `needs_backend_contract_definition`)
- **BE-V** — `orderDetails[i].cancel_by_name` (B3)
- **CR-010 Q-RP-01 / Q-RP-02 / Q-RP-09** — role-tier contract confirmation

### Domain 7 — GST / config
- **None.** CR-013 consumes existing profile keys (`deliver_charge_gst`, `service_charge_tax`) — no backend ask.

### Domain 8 — Operations audit timeline
- **BE-1-CR-009** (see Domain 2)

### Domain 9 — Roles & permissions
- See Domain 6 / CR-010 items

### Domain 10 — Other / unclear
- None beyond the `not_backend_related` items listed in §3.11.

---

## 5. Backend delivery priority

### P0 — must define/ship first
| ID | Domain | Why P0 |
|---|---|---|
| **BE-1** | Rooms + Audit display | Largest unblock surface — unpicks 9 ACs covering CR-001 P1..P6 + CR-004 G2/G3 + FE-1 cleanup PR. FE already wired defensively; ship → 4-line consumer cleanup. |
| **BE-2** | Rooms (money-in-till) | Unblocks the accurate Paid-column on Room Orders Report; high business value (end-of-day reconciliation, discount audit). |

### P1 — high-value unblockers
| ID | Domain | Why P1 |
|---|---|---|
| **BE-W2** | PG Status | Zero frontend code change needed — column auto-reveals. Owner-visible improvement on Audit Report for PG tenants. |
| **BE-F** | Settings persistence | Small additive profile field + PUT path. Phase A shipped; Phase B is the cross-device upgrade. |
| **BE-T** | Audit action time | Unblocks CR-008 Sub-CR #2 (A3) with ~5 min of FE work once field lands. |
| **BE-V** | Item cancel-by-name | Unblocks B3 (cleans `Employee #<id>` synthesis) with ~1 line of FE work. |
| **BE-U** | Web attribution (verify-only) | Pure verification ask — cheapest backend work; unblocks A4 Phase A with ~5 min FE work. |

### P2 — depends on prior backend work or moderate FE work after delivery
| ID | Domain | Why P2 |
|---|---|---|
| **BE-W** | Lifecycle actor names + per-item paid-stage | Unblocks B4; moderate FE transform changes. Can bundle with BE-V to ship all `*_by_name` fields together. |
| **CR-008 Sub-CR #3** | Dispatch/Assign endpoints | Net-new feature; needs contract drafting before implementation. |
| **BE-1-CR-009** | Operations timeline | Backend mostly already ships `operations[]`; confirmation + any missing ops + actor-name field. Moderate FE work (new side-panel section). |

### P3 — owner/product decision needed
| ID | Why P3 |
|---|---|
| **CR-010 Q-RP-01 / Q-RP-02 / Q-RP-09** | Role-tier contract questions — backend needs to decide whether to document/enforce `permissions[0]` or introduce a dedicated `roleTier` field. Affects future FE work only; A0b has already locked the wire contract that works today. |
| **BE-U Phase B** | POS confirmer name for non-auto-confirmed web rows — field name TBD by backend. Owner gate: who is the canonical confirmer and when is the name captured. |

### Not scheduled
- **CR-011 / BE-A** — closed/not-reproduced. Keep on tracker at LOW.
- **CR-002, CR-012, CR-013** — not backend work; owner/ops/FE to action.

---

## 6. Detailed backend contracts — sample payloads where known

### 6.1 BE-1 sample payloads

**`/get-room-list` item (post-BE-1):**
```json
{
  "table": { "id": 3237, "table_no": "r1", "title": "Floor1" },
  "user":  { "id": 8421, "f_name": "Jane", "l_name": "Doe", "phone": "+91..." },
  "latest_order_id": "002914"
}
```
Backward-compat flag (optional): `?in_house_only=true`. When absent, legacy behaviour preserved if backend wants.

**`/order-logs-report` row (post-BE-1 — additive fields marked //NEW):**
```json
{
  // …existing fields (id, restaurant_order_id, payment_method, etc.)…
  "waiter_id": 1478,
  "waiter_name": "Owner",                     // NEW P1
  "collect_by_id": 1478,                      // NEW P2 (paid rows)
  "collect_by_name": "Owner",                 // NEW P2
  "cancel_by_id": null,                       // NEW P2 (cancelled rows only)
  "cancel_by_name": null,                     // NEW P2
  "merge_by_id": null,                        // NEW P2 (merged rows only)
  "merge_by_name": null,                      // NEW P2
  "cancel_reason": null,                      // NEW P3
  "cancel_type": null,                        // NEW P4
  "table_id": 3237,
  "table_no": "T-7",                          // NEW P5
  "room_info": {                              // NEW P6 (RM parent rows only)
    "room_price": "6000.00",
    "advance_payment": "1000.00",
    "balance_payment": "5000.00"
  }
}
```

**P4 `cancel_type` accepted literals** (frontend will normalise, but please ship one of):
- `"before_cooking"` / `"Before cooking"`
- `"before_serving"` / `"Before serving"`
- `"after_serving"` / `"After serving"`

**`/get-single-order-new(RM_parent_id)` `associated_order_list[]` post-settlement (G3):**
```json
"associated_order_list": [
  { "id": 731928, "order_amount": 981, "payment_status": "paid" }  // was "unpaid" pre-G3
]
```

### 6.2 BE-2 sample payload

**`room_info` after BE-2 (§4.1 of BE_2 doc):**
```json
"room_info": {
  "room_price":        "5000.00",
  "advance_payment":   "2000.00",
  "balance_payment":   "0.00",
  "lodging_collected": "2000.00",      // NEW — mandatory
  "discount_amount":   "3000.00",      // NEW — mandatory
  "discount_reason":   "front-desk write-off"  // NEW — nullable
}
```
Invariant: `lodging_collected + discount_amount + balance_payment === room_price`.

### 6.3 CR-008 Sub-CR #3 — INFERRED contract (all names `needs_backend_contract_definition`)

> ⚠️ Everything in this section is **inferred** from the CR and frontend socket event names. Backend must confirm or replace.

**INFERRED 1 — List available riders:**
```
GET /api/v1/vendoremployee/riders?status=available
→ [
  { "id": 42, "name": "Arjun", "phone": "+91...", "status": "available" },
  { "id": 43, "name": "Meera", "phone": "+91...", "status": "available" }
]
```

**INFERRED 2 — Assign rider to order:**
```
POST /api/v1/vendoremployee/order/assign-rider
body: { "order_id": 570229, "rider_id": 42 }
→ { "success": true, "order": { "id": 570229, "rider_id": 42, "rider_status": "assigned" } }
// backend should also emit socket event DELIVERY_ASSIGN_ORDER to sync other clients
```

**INFERRED 3 — Mark dispatched (or fold into assign with `auto_dispatch: true`):**
```
POST /api/v1/vendoremployee/order/dispatch-order
body: { "order_id": 570229 }
→ { "success": true, "order": { "id": 570229, "order_dispatch_status": "Yes" } }
```

### 6.4 BE-W sample additive fields

On each `orderDetails[i]` in `/get-single-order-new`:
```json
{
  // …existing fields…
  "order_serve_at": "2026-05-04 13:02:51",    // NEW — order-level serve timestamp replicated per item
  "paid_at": null,                            // NEW — null until order is paid
  "ready_by_name": "Arjun",                   // NEW
  "served_by_name": "Meera",                  // NEW
  "cancel_by_name": null                      // NEW (also covered by BE-V)
}
```

### 6.5 BE-W2 sample

On each PG-checked row in `/order-logs-report`:
```json
{
  "razorpay_order_id": "order_SjLnc3knK8IOgM",
  "razorpay_payment_id": "pay_SjLnhpF6lz8GKV",
  "payment_amount": "30.00",
  "payment_created_at": "2026-04-29 20:31:40",
  "snapshot_razorpay_status": "captured",    // NEW — was null
  "snapshot_razorpay_amount": "30.00",       // NEW
  "snapshot_razorpay_method": "upi",         // NEW
  "snapshot_amount_match": true,             // NEW
  "snapshot_status_match": true,             // NEW
  "snapshot_mismatch_flag": false,           // NEW
  "snapshot_fetched_at": "2026-04-29 20:32:10"  // NEW
}
```

### 6.6 BE-F sample (INFERRED names)

```json
// GET /restaurant/profile response — NEW field:
{
  // …existing fields…
  "default_landing_screen": "dashboard"    // NEW — enum: 'dashboard' | 'order_entry' | 'table_view' | null
}

// PUT /restaurant/settings body (INFERRED endpoint):
{ "default_landing_screen": "order_entry" }
```

---

## 7. QA acceptance criteria by ask

### 7.1 BE-1
| ID | Criterion |
|---|---|
| P1 | Every row from `/order-logs-report` returns `waiter_name`. |
| P2 | Every paid / cancelled / merged row returns the corresponding `*_by_id` + `*_by_name`. |
| P3 | Cancelled rows return `cancel_reason`. |
| P4 | Cancelled rows return `cancel_type` with one of the agreed literals. |
| P5 | Rows with a table assignment return `table_no`. |
| P6 | RM parent rows return `room_info`. |
| G2 | `/get-room-list` excludes checked-out rooms. |
| G3 | `/get-single-order-new(RM_parent_id)` refreshes `associated_order_list[].payment_status` post-settlement. |
| LOI | Every in-house room in `/get-room-list` returns `latest_order_id`. |

### 7.2 BE-2
Given `room_price=5000`, `advance=2000`, `discount=3000 at checkout`, nothing else collected → `/get-single-order-new(roomOrderId).room_info` returns `{room_price:"5000.00", advance_payment:"2000.00", balance_payment:"0.00", lodging_collected:"2000.00", discount_amount:"3000.00", discount_reason:<approver_note_or_null>}`. Invariant `2000+3000+0===5000` holds.

### 7.3 BE-T
For each terminal status (paid/cancelled/merged/transferred/credited): the ACTION TIME cell matches the true action time (not an unrelated `updated_at`). Running rows show `—`.

### 7.4 BE-U
Preprod traces confirm: scan order auto-confirmed → `is_auto_confirmed: 1`, `order_from: "web"`. Scan order manually confirmed → `is_auto_confirmed: 0`, `order_from: "web"`.

### 7.5 BE-V
Cancel an item on a live order → reload side panel → item card "Cancelled By" shows real staff name, not `Employee #N`.

### 7.6 BE-W2
Audit Report PG Status column auto-appears (no FE redeploy). Each PG row renders the Razorpay native status literal verbatim.

### 7.7 BE-W
Side-panel Item Timeline shows **Order Taken → Ready → Served → Paid** stages with correct actor names. Per-item `paid_at` populates when order is paid.

### 7.8 BE-F
Change toggle on Device A → log out → log in on Device B → same setting persists.

### 7.9 CR-008 Sub-CR #3
From DeliveryCard: "Assign Rider" picker lists available riders → select + confirm → backend 200 → socket `DELIVERY_ASSIGN_ORDER` arrives → card shows rider name/phone. "Mark Dispatched" advances the card to `order_dispatch_status: "Yes"`.

### 7.10 CR-009
Trace each of the 13 operation types on preprod: each `operations[]` entry carries `operation`, `vendor_employee_id`, `vendor_employee_name` (if added), and a timestamp FE can sort by.

---

## 8. Frontend-unblock mapping

| Backend ask | FE work post-delivery | Files (expected touchpoints) |
|---|---|---|
| BE-1 P1 | 1-line consumer flip in `reportService.js::punchedBy` | `api/services/reportService.js` |
| BE-1 P2 | 1-line consumer flip in `reportService.js::actionedBy` | `api/services/reportService.js` |
| BE-1 P3 | 1-line consumer wire in Cancelled-tab `Reason` cell | `components/reports/OrderTable.jsx` |
| BE-1 P4 | ~10 lines — new column config + renderer + CSV column | `components/reports/OrderTable.jsx`, `components/reports/ExportButtons.jsx` |
| BE-1 P5 | already wired — becomes correct | — |
| BE-1 P6 | Optional cross-report aggregation — TBD | — |
| BE-1 G2 | 5-line deletion of defensive client filter in `roomListTransform.js` | `api/transforms/roomListTransform.js` |
| BE-1 G3 | already correct — formula starts producing 0 | — |
| BE-1 `latest_order_id` | 10-line deletion of lookback in `reportService.js::getRoomsForReport` | `api/services/reportService.js` |
| BE-2 §4.1 | ~10 lines — exact Paid/Discount formula + new Discount column | `components/reports/RoomRowCard.numbers`, `components/reports/OrderTable.jsx` |
| BE-2 §4.2 (optional) | Per-method paid breakdown on OrderDetailSheet room view | `components/reports/OrderDetailSheet.jsx` |
| BE-T | ~5 min — field wire in `reportService.js` + 2 new columns | `api/services/reportService.js`, `components/reports/OrderTable.jsx`, `components/reports/ExportButtons.jsx` |
| BE-U | ~5 min — web-order branch in `reportService.js::punchedBy`/`actionedBy` | `api/services/reportService.js` |
| BE-V | 1 line — remove `Employee #<id>` fallback in `reportTransform.js:625-626` | `api/transforms/reportTransform.js` |
| BE-W2 | **zero FE code change** — auto-reveal guard already shipped | — |
| BE-W | Transform + OrderDetailSheet section edits per `CR_005_AUDIT_REPORT_PG_LIFECYCLE_AND_USER_ATTRIBUTION.md` §3.3/§3.4 | `api/transforms/reportTransform.js`, `components/reports/OrderDetailSheet.jsx` |
| BE-F | Small — swap localStorage read/write for profile read + PUT | `contexts/SettingsContext.jsx` (or wherever Phase A landed), profile service |
| CR-008 Sub-CR #3 | Medium — new `api/services/deliveryService.js`, rider-picker UI, DeliveryCard buttons | multiple |
| CR-009 | Transform layer + new OrderDetailSheet section per CR-009 §5 | multiple |

---

## 9. Open questions (inbox)

### 9.1 For backend team

| ID | Question | Blocks |
|---|---|---|
| **Q-BE-1-P4** | Which literal do you emit for `cancel_type`? (`before_cooking` / `Before cooking` / `pre_cook` / other?) | BE-1 P4 |
| **Q-BE-1-G2** | Behind a query flag (`?in_house_only=true`) or unconditional? Other consumers of `/get-room-list`? | BE-1 G2 |
| **Q-BE-T-form** | Option (a) three dedicated `*_at` fields, or (b) one unified `action_at`? | BE-T |
| **Q-BE-U-1** | Current preprod sample of `is_auto_confirmed` + `order_from` on a web row — please paste/attach. | BE-U |
| **Q-BE-U-2** | Field name for POS confirmer name on non-auto web rows (BE-U Phase B) | BE-U Phase B |
| **Q-BE-W2-1** | Does the snapshot job currently run? On what trigger (webhook/cron)? What's the lag? | BE-W2 |
| **Q-BE-F-1** | Exact endpoint URL for profile update; exact enum literals for `default_landing_screen`. | BE-F |
| **Q-D3-1** | Does the rider model already exist server-side? Provide schema. | CR-008 #3 |
| **Q-D3-2** | Is "assign rider" atomic with "dispatch" or two separate operations? | CR-008 #3 |
| **Q-D3-3** | Response shape on assign — full order echo, or just the delta? | CR-008 #3 |
| **Q-D3-4** | Does `auto_dispatch` field already exist on the order? Currently FE hardcodes `'No'` at placement. | CR-008 #3 |
| **Q-D3-5** | Socket event echo — will backend emit `DELIVERY_ASSIGN_ORDER` on the same assign mutation? | CR-008 #3 |
| **Q-D3-6** | Error codes for assign-rider (rider unavailable / order not deliverable / etc.) | CR-008 #3 |
| **Q-OP1** | Exact string set of `operation` values (13+ types per CR-009 §3) + timestamp field name + actor-name field name | CR-009 |
| **Q-RP-01** | Is `permissions[0]` guaranteed role-tier across all user types? | CR-010 |
| **Q-RP-02** | Is `'Manager'` the canonical "manager-or-above" tier for all 4 A0b endpoints? | CR-010 |
| **Q-RP-09** | Mechanism for mid-session permission refresh (socket event feasibility)? | CR-010 |

### 9.2 For owner / product

| ID | Question | Blocks |
|---|---|---|
| **Q-OWN-1** | BE-2 §4.2 optional `payment_breakdown[]` — ship in phase 1 with §4.1 or defer? | BE-2 shape |
| **Q-OWN-2** | BE-F Phase B — previously accepted as browser-global per-restaurant. Phase B changes this (per-device follow-the-user). Reconfirm scope. | BE-F |
| **Q-OWN-3** | CR-008 Sub-CR #3 — who lists available riders, and is rider master managed in POS or elsewhere? | CR-008 #3 |
| **Q-OWN-4** | UX-LOADING-02 option A/B/C pick (Phase-3 CR; not strictly backend) | UX-LOADING-02 |

---

## 10. Backend-contract upstream investigation (non-parked)

One known production-grade backend behaviour that the FE cannot work around and that is not yet on any backend's scheduled work:

### 10.1 `/get-single-order-new` stale `payment_status` after `/make-order-unpaid`

- **Symptom:** CR-004 FE-2 §0 — operator flips a paid order via Mark-Unpaid → list row correctly moves from Paid tab to Unpaid tab → opening the side panel for the same order still shows badge "Paid".
- **Root cause (traced in FE):** frontend refetches `/get-single-order-new` on every sheet open, reads `payment_status` directly from the response, no client cache. Therefore the stale value is coming back from the backend.
- **Two plausible backend explanations:** read-replica lag; OR `/get-single-order-new` reads from a different table/view than `/order-logs-report`.
- **Evidence:** curl proof protocol drafted at `CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md` §0 Step 1.
- **Status:** **owner-confirmed FE-side investigation exhausted**; needs backend reproduction + fix. If it must be deferred, FE can add a 10-line defensive post-mutation refetch delay as a stop-gap (per the same doc §0 Step 2) — but the authoritative fix is backend.

---

## 11. Items excluded — `not_backend_related`

| Item | Why excluded |
|---|---|
| **CR-002** | Pure frontend refactor to centralise status classification. AC #6 explicitly "No API/socket/payload change". |
| **CR-010** | Mostly frontend/product/ops questions — 3 backend-involving questions pulled forward into §3.12 and §9.1 (Q-RP-01/02/09). The rest stays with product. |
| **CR-012** | Menu-config data inconsistency for Palm House tenant. Restaurant-ops team, not backend code. |
| **CR-013** | GST-config consumes already-exposed profile keys (`deliver_charge_gst`, `service_charge_tax`). No backend ask; pure frontend math fix. |
| **CR-011 / BE-A** | Closed as not-reproduced (2026-05-03). No active backend ask. Tracker retains a LOW-priority placeholder in case regression reappears. |
| **UX-LOADING-02** (Phase-3 CR) | Frontend UX pattern (station-loader visibility); owner option-pick pending. |

---

## 12. Items tagged `needs_backend_contract_definition`

| Item | Specific gap |
|---|---|
| **CR-008 Sub-CR #3** | Three entire endpoints (list riders / assign rider / mark dispatched). Names, paths, payloads all undefined. See §6.3 INFERRED samples as a starting point. |
| **BE-F** | Exact endpoint URL for PUT-ting `default_landing_screen`, and exact enum literals. See §6.6 INFERRED sample. |
| **CR-009 operations enum** | 13 operation types need backend-confirmed string literals + timestamp field name. Backend already ships the array; the contract is undefined. |
| **BE-U Phase B** | POS confirmer name field name on non-auto-confirmed web rows. |
| **BE-T** | Choice between option (a) three `*_at` fields and option (b) one `action_at` field. |

---

## 13. Final recommendation — first backend sprint

### 13.1 Recommended intake order

1. **BE-1** (the whole P1..P6 + G2 + G3 + `latest_order_id` bundle). Ship in one PR or three sub-PRs (A display fields / C room correctness / LOI). Highest single-shot unblock.
2. **BE-2 §4.1** (mandatory 3 fields). Bundle with BE-1 if schema overlap on `/get-single-order-new`. Enables money-in-till reporting.
3. **BE-W2** (snapshot job / webhook completion). Independent; cheap once scheduled.
4. **BE-T** (one of the two options). Cheap; 5-minute FE follow-up.
5. **BE-V + BE-W actor-name bundle** (all `*_by_name` in one ship). Cheap; large UX win on side panel.
6. **BE-U** (preprod verification). Cheapest — effectively free ("confirm what's already there").
7. **BE-F** (Phase B persistence). Small but requires Q-OWN-2 reconfirmation first.
8. **CR-009 operations enum confirmation** (documentation). Cheap; independent.
9. **CR-008 Sub-CR #3** (delivery endpoints). Medium effort; schedule separately.

### 13.2 Why BE-1 + BE-2 first

Together they close the largest cluster of frontend-parked work with the least backend surface disturbance:

- **BE-1** is purely additive across 3 endpoints the FE already consumes defensively. Frontend has diagnostic logs live today for verification. 9 frontend follow-ups (7 of them ≤5 LoC each) queue up behind it.
- **BE-2** is 3 fields on one existing object (`room_info`). High business value (end-of-day reconciliation, discount audit). Frontend ships with exact formula immediately after.

Between them, these two asks retire:
- CR-001 Bucket A display polish (P1..P6)
- CR-004 Phase 2 FE-1 (cross-day in-house view — drops the 2-call kludge + defensive filter)
- CR-004 Phase 2 FE-2 Paid column (exact formula)
- BE-1 P6 subsumed into BE-2 §4.3

That's the largest unblock per backend-day ratio in the current tracker.

### 13.3 What the backend team will need from us

- Stable preprod test tenant with representative data (Palm House — restaurant_id 541 — has been the canonical test tenant this sprint and carries live COD + PG + web + room rows).
- Frontend diagnostic logs cited in §9 of `BE_1_BACKEND_ASKS_CONSOLIDATED.md` are live today and will help the backend team verify each ship byte-for-byte.
- A single Backend Contract Agent intake session to walk this document end-to-end is recommended before sprint planning.

---

## 14. Strict-rules compliance certification (this run)

| Rule | Status |
|---|---|
| Read-only documentation | ✅ |
| No code implemented | ✅ |
| No frontend / backend source edits | ✅ |
| No tests run | ✅ |
| No QA agent invoked | ✅ |
| No `/app/memory/final/*` edits | ✅ |
| No parked item unparked | ✅ |
| No new CRs started | ✅ |
| Single new doc created (this file) | ✅ |
| No endpoint or field invented beyond source docs — unknowns marked `needs_backend_contract_definition` and samples labeled `INFERRED` | ✅ |
| Stopped after document creation | ✅ |

— End of Backend Expectations for Parked Work —
