# Backend Field Confirmation + Unpark Decision — 2026-05-06

**Type:** Read-only decision document. NO code, NO QA, NO tracker rewrite, NO `/app/memory/final/` edit, NO CR completion claim.
**Agent:** Backend Field Confirmation + Unpark Decision Agent
**Date:** 2026-05-06
**Branch:** `6-may` (cloned to `/app` 2026-05-05; FE source-of-truth equivalent to `5may` HEAD `5b85c2c`)
**Source curl:** `POST https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report` — body `{ "sort_by":"created_at", "from_date":"06-05-2026", "to_date":"06-05-2026" }`
**Tenant under test:** `restaurant_id = 675`
**Rows in cohort:** 13 (`f_order_status` mix: 5 paid, 5 settled-non-paid, 3 cancelled)
**Response captured at:** `/tmp/olr.json` (147,807 bytes, HTTP 200, 2026-05-06 10:20 UTC)

---

## 1. Executive summary

> **Verdict: 1 CR safe to move to `ready_to_plan`; 1 CR ready for `ready_for_fe_impact_analysis`; 7 still parked; 1 owner-decision-pending. The Bean Me Up customer-visible double-count remains the only burning issue.**

- **CR-009 Operations Audit Timeline** is now data-ready on the wire. The `operations[]` block exists per row with 13 distinct operation enums and 50 sub-keys. It is **entirely unmapped on FE** today — zero references in `/app/frontend/src/api/`. Recommend `ready_to_plan`.
- **CR-008 Sub-CR #3 (Delivery dispatch / assign)** has its persistence groundwork on `orders_table` (`order_dispatch_status` populated on 13/13 rows; companion fields documented). No new endpoints visible; need backend contract on dispatch/assign POST endpoints. Recommend `ready_for_fe_impact_analysis` for the schema half; `keep_parked_backend_confirmation_needed` for the endpoint half. Net = **owner_decision_required** (prioritisation) before planning starts.
- **CR-013 BE-G7 / BE-G8 / BE-G9 / BE-G10 / BE-G11** all remain `keep_parked_backend_missing` or `keep_parked_backend_confirmation_needed`. **`payload_total_gst_tax_amount` is in schema but null on every row** in this cohort — it is a **strong candidate** for the BE-G7/G8 reconciliation column (FE-supplied vs BE-stored), but until BE confirms semantics + populates it, FE cannot plan against it. **`delivery_charge_gst_amount` is still NOT present** anywhere on the response (only the rate `delivery_charge_gst = "0.00"` exists, and it's a different concept — a per-order rate echo, not the persisted ₹ column BE-G9 asks for).
- **B2 Phase 2 PG Status auto-reveal / BE-W2** stays parked. The full snapshot block (`snapshot_razorpay_status` + 6 companions) is in schema but **null on all 13 rows** — same posture as before. Auto-reveal will fire the moment any tenant populates a row; waiting on backend rollout. `keep_parked_backend_missing`.
- **BE-1 order-level attribution** got a partial bump: `canceled_by` (numeric ID) is populated on 4/13 rows, but **order-level `cancel_by_name` is still missing**. FE continues to fall back to `order_details_table[0].cancel_by_name`. Item-level path is fine; order-level name pair is the open ask.
- **BE-V item-level attribution** — `cancel_by_name` at item level was already shipping (per the 2026-05-01 BE-1 P2 partial wire) and is mapped. New item-level fields like `cancel_reason_text`, `paid_status`, `ready_by`, `serve_by` are documented in field analysis but **not present in this 13-row sample** (no cancelled-with-text or paid-with-attribution rows in cohort). `present_in_schema_not_in_sample`.
- **Bean Me Up backend print double-count** still owner-decision-pending. No new evidence on backend side. The owner Options A/B/C/D handover remains unactioned.

---

## 2. Files / docs inspected (read-only)

| Source | Read |
|---|---|
| `/app/memory/change_requests/BACKEND_BLOCKER_VERIFICATION_2026_05_05.md` | ✅ |
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | ✅ |
| `/app/memory/change_requests/CR_013_STATUS_AUDIT_2026_05_05.md` | ✅ |
| `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md` | ✅ |
| `/app/memory/change_requests/phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` | ✅ |
| `/app/memory/change_requests/REPORTS_FIELD_MAPPING_TRACKER.md` | ✅ |
| `/app/memory/change_requests/implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` | ✅ |
| `/tmp/olr.json` (live preprod curl 2026-05-06) | ✅ |
| `/app/frontend/src/api/services/reportService.js` (BE-1 INVARIANT block + transforms) | ✅ |
| `/app/frontend/src/api/transforms/reportTransform.js` (FE field consumers) | ✅ |
| `/app/frontend/src/api/transforms/orderTransform.js` (order-side parsers) | ✅ |
| `/app/frontend/src/components/reports/OrderTable.jsx` (PG auto-reveal) | ✅ |
| `/app/memory/final/*` | ❌ NOT opened — strict-rule scope |

---

## 3. Evidence classification

For each new / target field observed in the curl response.

### 3.1 `operations[]` block

| Aspect | Evidence | Classification |
|---|---|---|
| Block presence | All 13 rows have `operations` key (type list); 9/13 rows have at least one entry | **`confirmed_present_non_null`** |
| Operation enums observed | 13 distinct: `order_status_update`, `item_cancel`, `order_edit`, `item_serve`, `order_cancel`, `waiter_dinein_order_status_update`, `transfer_order_in`, `transfer_order_out`, `table_room_switch`, `item_ready`, `make_unpaid`, `payment_method_change`, `order_bill_payment` | **`confirmed_present_non_null`** for the 13 enums; full enum list **`unknown_needs_backend_confirmation`** |
| Sub-keys | 50 keys observed across all operations entries | **`confirmed_present_non_null`** |
| FE mapping | Zero references to `operations` in `/app/frontend/src/api/` | **Unmapped** |

### 3.2 CR-013 GST reconciliation candidates

| Field | Sample non-null | Classification | Notes |
|---|---|---|---|
| `service_gst_tax_amount` (orders_table) | 6/13 | `confirmed_present_non_null` | Already mapped via alias `total_service_tax_amount` on `orderTransform.js:187`; **report path does not consume it directly** |
| `tip_tax_amount` (orders_table) | 0/13 (all 0) | `confirmed_present_null_only` | Mapped on order path (`orderTransform.js:189`); not on report path. Cohort has no tipped orders, so `confirmed_present_null_only` is a sample-cohort artefact, not absence |
| `total_gst_tax_amount` | 11/13 | `confirmed_present_non_null` | NEW order-level aggregate; not consumed on FE report path |
| `total_tax_amount` | 8/13 | `confirmed_present_non_null` | NEW order-level total tax; not consumed on FE report path |
| `total_vat_tax_amount` | 0/13 (all 0) | `confirmed_present_null_only` | Cohort has no VAT-bearing orders |
| `payload_total_gst_tax_amount` | 0/13 (all `null`) | `confirmed_present_null_only` | **Strong candidate for BE-G7/G8 reconciliation column.** Schema present; population trigger unknown |
| `delivery_charge_gst` (rate %) | 13/13 (all `"0.00"`) | `confirmed_present_null_only` | **Per-order rate echo** — DIFFERENT from BE-G9 (`delivery_charge_gst_amount` ₹). Cohort has no delivery orders so all show `0.00` |
| `delivery_charge_gst_amount` (₹) | **NOT IN SCHEMA** | **`missing`** | BE-G9 still not shipped |

### 3.3 PG snapshot block — BE-W2

| Field | Sample non-null | Classification |
|---|---|---|
| `snapshot_razorpay_status` | 0/13 (all `null`) | `confirmed_present_null_only` |
| `snapshot_razorpay_amount` | 0/13 (all `null`) | `confirmed_present_null_only` |
| `snapshot_razorpay_method` | 0/13 (all `null`) | `confirmed_present_null_only` |
| `snapshot_amount_match` | 0/13 (all `null`) | `confirmed_present_null_only` |
| `snapshot_status_match` | 0/13 (all `null`) | `confirmed_present_null_only` |
| `snapshot_mismatch_flag` | 0/13 (all `null`) | `confirmed_present_null_only` |
| `snapshot_fetched_at` | 0/13 (all `null`) | `confirmed_present_null_only` |

> Schema is present (all 7 keys exist on every row); population trigger is the missing piece. Cohort has no Razorpay-paid orders.

### 3.4 BE-1 order-level cancel attribution

| Field | Sample non-null | Classification |
|---|---|---|
| `canceled_by` (ID) | 4/13 (`3741`) | **`confirmed_present_non_null`** |
| `cancellation_note` | 0/13 (all `null`) | `confirmed_present_null_only` |
| `cancel_at` | 3/13 (`2026-05-06 14:25:56` etc.) | `confirmed_present_non_null` |
| `canceled` (boolean) | 0/13 (all `null`) | `confirmed_present_null_only` |
| **`cancel_by_name`** at order level | **NOT IN SCHEMA** at order level | **`missing`** — FE still falls back to `order_details_table[0].cancel_by_name` |

### 3.5 CR-008 Sub-CR #3 delivery dispatch fields

| Field | Sample | Classification |
|---|---|---|
| `order_dispatch_status` | 13/13 (all `"No"`) | **`confirmed_present_null_only`** (schema present; cohort has no dispatched delivery) |
| `delivery_man_id` | not in this cohort | `present_in_schema_not_in_sample` |
| `delivery_man_status` | not in this cohort | `present_in_schema_not_in_sample` |
| `picked_up` | not in this cohort | `present_in_schema_not_in_sample` |
| `vehicle_id` | not in this cohort | `present_in_schema_not_in_sample` |
| `zone_id` | not in this cohort | `present_in_schema_not_in_sample` |
| `dm_tips` | not in this cohort | `present_in_schema_not_in_sample` |
| `original_delivery_charge` | not in this cohort | `present_in_schema_not_in_sample` |
| `free_delivery_by` | not in this cohort | `present_in_schema_not_in_sample` |
| `distance` | 13/13 (some non-zero) | `confirmed_present_non_null` (already used elsewhere) |

### 3.6 Other new fields

| Field | Sample | Classification |
|---|---|---|
| `station_order_status` | 13/13 (`{"KDS":5}`, `{"KDS":2}` …) | **`confirmed_present_non_null`** |
| `order_edit_count` | 11/13 (`3`, `4`, `7` …) | `confirmed_present_non_null` |
| `transaction_reference` | 13/13 (`"194"`, `"94"` …) | `confirmed_present_non_null` |
| `loyalty_info` | 8/13 (`{"enabled": false}`) | `confirmed_present_non_null` |
| `wallet_info` | 8/13 (`{"amount": 0, "applied": false}`) | `confirmed_present_non_null` |
| `coupon_info` | 0/13 | `confirmed_present_null_only` |
| `comunity_discount` (typo preserved) | 0/13 (all `0`) | `confirmed_present_null_only` |
| `adjusment` (typo preserved) | not in this cohort | `present_in_schema_not_in_sample` |
| `audio_file` | not in this cohort | `present_in_schema_not_in_sample` |

### 3.7 Item-level fields (BE-V / BE-W candidates)

| Field | Sample | Classification |
|---|---|---|
| `cancel_by_name` (item-level, on `order_details_table[i]`) | shipping per 2026-05-01 partial wire | `confirmed_present_non_null` (already mapped) |
| `cancel_reason_text` | not in this cohort | `present_in_schema_not_in_sample` |
| `paid_status` | not in this cohort | `present_in_schema_not_in_sample` |
| `ready_by` | not in this cohort | `present_in_schema_not_in_sample` |
| `serve_by` | not in this cohort | `present_in_schema_not_in_sample` |

---

## 4. CR unblock decision table

| CR / Backend ask | Backend evidence | FE consumer status | Decision | Rationale |
|---|---|---|---|---|
| **CR-009 Operations Audit Timeline** | `operations[]` block + 13 enums + 50 sub-keys all `confirmed_present_non_null` | Zero FE references — entirely unmapped | **`ready_to_plan`** | Schema is delivered with non-null payload across multiple operation types. FE planning agent can author transform + UI surfaces against the live wire. Recommend a brief BE confirmation on the canonical enum list before implementation begins. |
| **CR-013 BE-G7** (printed Total formula) | `payload_total_gst_tax_amount` exists in schema but null; print template formula not directly observable from this curl | Print payload truth doc + double-count handover already mapped this | **`keep_parked_backend_confirmation_needed`** | Need BE to confirm whether `payload_total_gst_tax_amount` is the FE-payload echo column (= reconciliation key) and to confirm exact printed-Total formula. |
| **CR-013 BE-G8** (Tip GST symmetry) | Same as BE-G7 + `tip_tax_amount` cohort all-zero | Same | **`keep_parked_backend_confirmation_needed`** | Symmetric to BE-G7. |
| **CR-013 BE-G9** (`delivery_charge_gst_amount` persistence) | **Field NOT in schema** on this response (`delivery_charge_gst` rate ≠ `_amount`) | FE has no parser today (intentional — gated on BE) | **`keep_parked_backend_missing`** | Owner promise on disk (`CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md` L207) — BE will add the column. Not yet shipped. |
| **CR-013 BE-G10** (template auto-render) | No template visibility from this curl. Print double-count handover §3.4 inference still stands | FE-supplied `cgst_amount` / `sgst_amount` are sent but apparently ignored | **`keep_parked_backend_confirmation_needed`** | Backend triage call required (≤5-min). |
| **CR-013 BE-G11** (per-component template slots) | Not visible from `order-logs-report` (template-side concern) | n/a | **`keep_parked_backend_confirmation_needed`** | Same backend triage call as BE-G10. |
| **CR-013 Bean Me Up double-count** | No fix evidence; D-GST-3 still in effect → bug still reproducible | Owner Options A/B/C/D not chosen | **`owner_decision_required`** + `keep_parked_backend_missing` | Until owner picks, no FE roll-back; until BE-G7..G11 ship, no BE fix. |
| **CR-008 Sub-CR #3** (delivery dispatch / assign) | Schema groundwork present (`order_dispatch_status` populated; companion fields documented). New POST/PATCH endpoints **not visible** from this curl | No FE consumer wired | Schema half: **`ready_for_fe_impact_analysis`**. Endpoint half: **`keep_parked_backend_confirmation_needed`**. Combined: **`owner_decision_required`** | Owner prioritisation needed before planning agent picks it up; even with that, endpoint contract must come from BE. |
| **B2 Phase 2 PG Status auto-reveal / BE-W2** | All 7 `snapshot_*` keys `confirmed_present_null_only`. No cohort row populated | FE auto-reveal already wired (`OrderTable.jsx:110`) — fires the moment any row goes non-null | **`keep_parked_backend_missing`** | Wait for any tenant to populate `snapshot_razorpay_status` non-null. No FE work needed in advance — auto-reveal is dormant. |
| **BE-1 order-level attribution** (`cancel_by_name`, `merge_by_name`) | `canceled_by` ID populated; order-level name **`missing`**. `merge_by_name` not in cohort | FE falls back to `order_details_table[0].cancel_by_name` for cancelled rows; merged actioned-by shows `Employee #<id>` | **`keep_parked_backend_missing`** for full BE-1 P2 closure. **PARTIAL** otherwise (item-level cancel, paid-collected-by `employee_name` already wired). | Bundle into a single backend ask: "ship `cancel_by_name` and `merge_by_name` at order level". |
| **BE-V item-level attribution** | `cancel_by_name` at item level already mapped per 2026-05-01 wire. `ready_by` / `serve_by` not in cohort. | Item-level cancel name: mapped. Other action attribution: unmapped | **`keep_parked_backend_confirmation_needed`** | Need a different cohort (paid order with item-level paid stage; ready/serve actor populated) to confirm BE-V/BE-W are actually shipping. |
| **BE-W per-item paid-stage** (`paid_status` etc.) | `paid_status` not in this cohort (no paid-with-item-attribution rows) | n/a | **`keep_parked_backend_confirmation_needed`** | Re-run audit on a paid-cohort-rich tenant. |
| **CR-005 Phase A web-order attribution / BE-U** | Not observable from this curl | n/a | **`keep_parked_backend_confirmation_needed`** | Out of `order-logs-report` scope; needs separate endpoint check. |
| **CR-004 / room report backend asks (BE-2 / BE-T)** | Not in this 13-row tenant cohort (no RM/SRM rows). Per `[BE-2 INVARIANT]` block in `reportService.js`, `room_info.discount_amount` / `discount_reason` still absent | FE math-derived for the happy path | **`keep_parked_backend_missing`** | Wait for BE-2 explicit `discount_amount` / `discount_reason` ship. |

---

## 5. Field-by-field mapping table

| Field | API block | Sample status | FE mapping proposed | Related CR | Unpark impact | Remaining question |
|---|---|---|---|---|---|---|
| `operations[]` (block) | top-level wrapper | `confirmed_present_non_null` | New `operationsTransform.fromAPI(arr)` → array of `OperationEvent` | CR-009 | **Unblocks CR-009 schema half** | Confirm canonical enum list; pagination cap; chronological-order guarantee |
| `operation` | `operations[i]` | non-null on every entry | `event.type` | CR-009 | Drives timeline-row icon + label | Confirm the 13 observed enums are exhaustive |
| `vendor_employee_id` | `operations[i]` | non-null | `event.actorId` | CR-009 / BE-V | Pair with `employee_name` lookup for actor name | Will BE add `vendor_employee_name`, or expect FE to look up via `employee_name` already on `orders_table`? |
| `previous_*` / `current_*` (12 pairs: payment_method, payment_status, order_status, f_order_status, b_order_status, k_order_status, order_amount, table_id, collect_bill, item_quantity, item_amount, item_tax_amount, item_food_status) | `operations[i]` | non-null on relevant ops | `event.from.*` / `event.to.*` delta object | CR-009 | Drives "X → Y" delta strings on timeline | Confirm `b_order_status` / `k_order_status` enum mapping |
| `order_detail_id` | `operations[i]` | non-null on item-level ops | `event.targetItemRowId` (= `cartItem.id`) | CR-009 | Joins operation to item line | None |
| `food_id` | `operations[i]` | non-null on item-level ops | `event.targetFoodId` (= `cartItem.foodId`) | CR-009 | Catalog join for item name | None |
| `cancel_qty` / `cancel_type` / `cancellation_reason` / `reason` / `reason_type` | `operations[i]` | non-null on cancel ops | `event.cancelDetails.{qty, type, reason, note, reasonTypeId}` | CR-009 / BE-V | Cancellation detail surfaces in timeline | Confirm `reason_type` numeric → label registry |
| `source_order_id` / `source_table_id` / `received_order_id` / `received_table_id` | `operations[i]` | non-null on transfer ops | `event.transfer.{from, to}` | CR-009 | Drives "transferred from / to" label | None |
| `service_gst_tax_amount` | `orders_table` | `confirmed_present_non_null` (6/13) | Already mapped via `total_service_tax_amount` alias on `orderTransform.js:187`. **Wire on `reportTransform` if exposing on report** | CR-013 | None — already reaches order path | None |
| `tip_tax_amount` | `orders_table` | `confirmed_present_null_only` (cohort) | Mapped on `orderTransform.js:189`. **Not on report path** | CR-013 | None | None — wait for tipped cohort |
| `delivery_charge_gst` (rate %) | `orders_table` | `confirmed_present_null_only` (`"0.00"`) | Map to `delivery.gstPct` on report path | CR-013 | None directly — informational rate echo | Is this a per-order rate snapshot (vs profile-API rate)? Confirm precedence |
| `delivery_charge_gst_amount` (₹) | `orders_table` | **`missing`** | n/a — gated on BE-G9 ship | CR-013 BE-G9 | None — keep parked | When will BE-G9 ship? |
| `payload_total_gst_tax_amount` | `orders_table` | `confirmed_present_null_only` (all `null`) | Map to `gst.payloadTotal` (FE-supplied echo, reconciliation column) — but only after BE confirms semantic | CR-013 BE-G7/G8 | None — confirmation needed | What populates this and when? Is it the FE-supplied `gst_tax`? Or is it the BE-recomputed total? |
| `total_gst_tax_amount` | `orders_table` | `confirmed_present_non_null` (11/13) | Map to `gst.total` on report path | CR-013 | Could enable "total tax" column on Audit | Confirm whether this is item-only or includes SC/Tip/Delivery |
| `total_tax_amount` | `orders_table` | `confirmed_present_non_null` (8/13) | Map to `tax.total` (gst + vat) | CR-013 | Same as above | Confirm composition |
| `snapshot_razorpay_status` | `orders_table` | `confirmed_present_null_only` | **Already mapped** for FE auto-reveal at `OrderTable.jsx:110` | B2 Phase 2 / BE-W2 | None until populated | When does any tenant populate this? Test tenant? |
| `snapshot_razorpay_amount` | `orders_table` | `confirmed_present_null_only` | Map to `pg.snapshotAmount` | B2 Phase 2 | None until populated | Same as above |
| `snapshot_razorpay_method` | `orders_table` | `confirmed_present_null_only` | Map to `pg.snapshotMethod` | B2 Phase 2 | None until populated | Same |
| `snapshot_amount_match` | `orders_table` | `confirmed_present_null_only` | Map to `pg.amountMatch` (boolean) | B2 Phase 2 | None until populated | Same |
| `snapshot_status_match` | `orders_table` | `confirmed_present_null_only` | Map to `pg.statusMatch` (boolean) | B2 Phase 2 | None until populated | Same |
| `snapshot_mismatch_flag` | `orders_table` | `confirmed_present_null_only` | Map to `pg.mismatch` (boolean) | B2 Phase 2 | None until populated | Same |
| `snapshot_fetched_at` | `orders_table` | `confirmed_present_null_only` | Map to `pg.fetchedAt` (ISO) | B2 Phase 2 | None until populated | Same |
| `canceled_by` | `orders_table` | `confirmed_present_non_null` (4/13) | Map to `cancelledById` | BE-1 P2 | Partial — pair-name still needed | Will BE add order-level `cancel_by_name`? |
| `cancel_by_name` (order level) | `orders_table` | **`missing`** | n/a — FE keeps current `order_details_table[0].cancel_by_name` fallback | BE-1 P2 | None — keep parked | Same backend ask as above |
| `cancel_reason_text` | `order_details_table[i]` | `present_in_schema_not_in_sample` | Map to `item.cancellationReasonText` | BE-V | None until non-null observed | Confirm on a cancelled-with-text cohort |
| `order_dispatch_status` | `orders_table` | `confirmed_present_null_only` (`"No"` 13/13) | Map to `dispatch.status` | CR-008 Sub-CR #3 | Schema half ready | Enum values? `Yes` / `No` only, or richer (`Assigned` / `Picked-up` / `Delivered`)? |
| `delivery_man_id` | `orders_table` | `present_in_schema_not_in_sample` | Map to `dispatch.riderId` | CR-008 Sub-CR #3 | Same | Confirm on delivery cohort |
| `delivery_man_status` | `orders_table` | `present_in_schema_not_in_sample` | Map to `dispatch.riderStatus` | CR-008 Sub-CR #3 | Same | Enum values? |
| `picked_up` | `orders_table` | `present_in_schema_not_in_sample` | Map to `dispatch.pickedUpAt` | CR-008 Sub-CR #3 | Same | Bool or timestamp? |
| `station_order_status` | `orders_table` | `confirmed_present_non_null` (13/13 JSON) | Map to `stationStatus: { stationName: numeric }` | CR-009 / dashboard | Could power UX-LOADING-02 | Confirm numeric enum (== `food_status`?) |
| `paid_status` | `order_details_table[i]` | `present_in_schema_not_in_sample` | Map to `item.paidStatus` | BE-W | None until non-null | Confirm on paid cohort |
| `ready_by` | `order_details_table[i]` | `present_in_schema_not_in_sample` | Map to `item.readyById` | BE-V | None until non-null | Confirm; will pair-name `ready_by_name` ship? |
| `serve_by` | `order_details_table[i]` | `present_in_schema_not_in_sample` | Map to `item.serveById` | BE-V | None until non-null | Same |

---

## 6. Backend questions (priority-grouped)

### P0 — urgent (customer-visible / decision-blocking)

1. **CR-013 BE-G10 + BE-G11 + BE-G7 + BE-G8** — backend triage on `order-temp-store` print template:
   - Does template auto-render any payload tax key (e.g. `cgst_amount` / `sgst_amount`)?
   - What is the exact `payment_amount` formula on `BILL_PAYMENT`-paid orders? Is the asymmetric `subtotal + (gst_tax − service_gst_tax_amount)` formula confirmed?
   - Is the same asymmetry applied to `tip_tax_amount`?
   - Timeline + slot names for per-component tax line rendering (`cgst_on_sc_amount` / `sgst_on_sc_amount` / etc.)?
2. **`payload_total_gst_tax_amount` (orders_table)** — what populates this? Is it the FE-supplied `gst_tax` echoed back for reconciliation (closes BE-G7/G8 elegantly)? When does it go non-null?
3. **`delivery_charge_gst_amount` (BE-G9)** — when will the persisted ₹ column be added? `delivery_charge_gst` rate is shipping but is not the same key.
4. **CR-009 `operations[]` contract** — confirm canonical enum list (the 13 we observed, plus any others we haven't hit), authoritative sub-key dictionary, chronological order, pagination cap, sub-key shape stability guarantee.
5. **Bean Me Up double-count** — has the asymmetric template formula been patched after 2026-05-05?

### P1 — significant unblock leverage

6. **CR-008 Sub-CR #3 endpoints** — do dispatch / assign / picked-up POST or PATCH endpoints exist? URL contracts? Required payload? Socket events on state transition?
7. **BE-W2 snapshot rollout** — what triggers backend to populate `snapshot_razorpay_*` keys? Is it live in production but only on Razorpay-paid orders, or still gated on a future rollout? Test tenant?
8. **`order_dispatch_status` enum** — `"Yes"`/`"No"` only, or richer (`Assigned` / `Picked-up` / `Delivered`)?

### P2 — closes existing partial wires

9. **Order-level `cancel_by_name`** — pair the existing `canceled_by` ID with a name. Or confirm FE keeps falling back to `order_details_table[0].cancel_by_name`.
10. **`merge_by_name`** at order level — Merged tab actioned-by label.
11. **`ready_by_name` / `serve_by_name` at item level** — same action attribution, but for KOT and serve.
12. **`station_order_status` enum** — confirm numeric values match item-level `food_status` enum (or define).
13. **`payload_total_gst_tax_amount` semantics** — re-listed at P2 as well in case P0 timing slips; this drives whether CR-013 gets a clean reconciliation column.
14. **CR-005 Phase A web-order attribution** — fields and population status (separate endpoint from `order-logs-report`).
15. **BE-2 `room_info.discount_amount` / `discount_reason`** — when shipping?
16. **Typo fields** — `comunity_discount` (single `m`) and `adjusment` — confirm BE will not rename, so FE can hard-code the parser key strings.

---

## 7. Recommended next frontend planning agents

In execution order:

1. **CR-009 Operations Audit Timeline planning agent** — `ready_to_plan`. Author transform + UI surface for the new `operations[]` block. Frontend planning can start before backend confirms the enum list (use the 13 observed enums as v1; new enums become a parser additive change).
2. **CR-013 backend print / GST reconciliation confirmation agent (read-only, owner-decision-supporting)** — package the P0 backend questions above + cross-link to print double-count handover Options A/B/C/D so the owner can act.
3. **CR-008 Sub-CR #3 delivery dispatch contract discovery agent** — `ready_for_fe_impact_analysis` only on the schema half. Document the field map; defer endpoint contract to a backend-coordination cycle. Owner prioritisation gate stands.
4. **B2 Phase 2 PG Status auto-reveal impact analysis agent** — `keep_parked_backend_missing` today. Recommend a small monitoring task: every QA cycle, grep curl dumps for the first non-null `snapshot_razorpay_status` row. The moment one appears, this CR becomes `ready_to_plan` automatically (no FE work needed pre-flight beyond the existing auto-reveal column).
5. **BE-1 / BE-V attribution mapping impact analysis agent** — `keep_parked_backend_confirmation_needed`. Bundle with backend-question list P2.

---

## 8. Final recommendation

> **Single concrete unpark today: CR-009 → `ready_to_plan`.**

The `operations[]` block is the only data-ready new surface in this cohort, and it cleanly maps to the long-parked CR-009 scope. Everything else either (a) needs a backend triage call (CR-013 print, BE-G7/G8/G10/G11), (b) needs an explicit owner prioritisation call (CR-008 Sub-CR #3, CR-009 priority within the queue, Bean Me Up Options A/B/C/D), or (c) needs a different cohort to surface (BE-W2 snapshot block, BE-V item-level attribution). **Do not unpark anything else until those gates clear.**

The Bean Me Up customer-visible printed-bill double-count remains the **only burning issue** (impacts every dineIn-with-SC bill on tenants with `service_charge_tax > 0` post-Phase-1.5). It is independent of CR-009 unpark and should be triaged in parallel. No FE rollback should ship until owner picks A/B/C/D.

### What this document is NOT
- Not an implementation plan.
- Not a tracker rewrite. Pending Task Register and BACKEND_BLOCKER_VERIFICATION are unchanged on disk.
- Not a CR completion / unparking write — only a **decision recommendation** for the next agent to consume when owner approves.

### What this document explicitly does NOT touch
- `/app/memory/final/*` — untouched.
- Frontend code — untouched.
- Backend code — untouched.
- Test suites — not run.

### Strict-rules compliance certification

| Rule | Status |
|---|---|
| Read-only — no code change | ✅ |
| No tracker rewrite / CR marked complete | ✅ |
| No `/app/memory/final/*` touched | ✅ |
| No QA / tests run | ✅ |
| Null-only fields NOT treated as fully delivered | ✅ — all 7 `snapshot_*` keys + `payload_total_gst_tax_amount` classified `confirmed_present_null_only`, never `confirmed_present_non_null` |
| Missing fields not treated as present | ✅ — `delivery_charge_gst_amount` + order-level `cancel_by_name` flagged `missing` |
| Stop after document creation | ✅ |

---

— End of Backend Field Confirmation + Unpark Decision 2026-05-06 —
