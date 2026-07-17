# CR-009 — Operations Audit Timeline (per-order action log rendering)

**Status:** Requirements gathering & impact analysis (no code changes yet).
**Author:** Requirement Gathering Agent · 2026-05-01
**Source:** User follow-up 2026-05-01: "operation block added in log report - with made unpaid, payment method change, item quantity edit, item cancel, order cancel, order edit, transfer food item, merge table, transfer table, ready-serve, collect bill, split bill, TAB out, collect bill — is this recorded".
**Related:** CR-005 (PG + lifecycle + cancelled-by), CR-008 (action time column).

---

## 1. Problem

The backend `/order-logs-report` endpoint ships a complete **`operations[]` array** on each order — a chronological log of every significant action taken on that order. The frontend currently **ignores this array entirely**. As a result:

- The Audit Report "Action Time" / "Time Diff" columns (CR-008 Sub-CR #2) can only show the *terminal* action — not the full history.
- The Side Panel lifecycle (CR-005 Req #4) shows only 4-5 canonical stages, not the operator-visible audit trail.
- There is no place in the UI to answer the question "who did what to this order, and when?" for non-terminal actions (payment-method change, mark-unpaid, item quantity edit, etc.).

## 2. Backend signal (confirmed from earlier payload sample)

Sample from `/order-logs-report` (abbreviated — seen in the earlier Postman screenshot):
```json
"operations": [
  {
    "operation": "transfer_order_in",
    "vendor_employee_id": 3741,
    "id": 88,
    "restaurant_id": 675,
    "order_id": 825067,
    "restaurant_order_id": "000940",
    "source_order_id": 825068,
    "source_table_id": 0,
    "order_type": "pos",
    "payment_type": "postpaid",
    "previous_payment_method": "pending",
    "current_payment_method": "pending",
    "previous_payment_status": "unpaid",
    ...
  },
  ...
]
```

Per-operation fields observed: `operation`, `vendor_employee_id`, `id`, timestamps (likely `created_at` / `updated_at`), plus operation-specific context (`previous_*` / `current_*` for diffs, `source_*` for transfers).

## 3. Expected operation set (from user, 2026-05-01)

| User wording | Likely backend `operation` value | Notes |
|---|---|---|
| Made Unpaid | `mark_unpaid` | Reverts a paid order |
| Payment method change | `payment_method_change` | Stores `previous_payment_method` + `current_payment_method` |
| Item quantity edit | `item_quantity_edit` | Per-item; likely carries `food_id` + `previous_qty` + `current_qty` |
| Item cancel | `item_cancel` | Per-item; carries `food_id` + `cancel_type` + `cancel_reason` |
| Order cancel | `order_cancel` | Whole-order; carries `cancel_reason` |
| Order edit | `order_edit` | Generic update; may overlap with item edits |
| Transfer food item | `transfer_food_item` | Carries source_food_id + source/dest order ids |
| Merge table | `merge_table` | Carries source + target order ids |
| Transfer table | `transfer_order_in` (seen) / `transfer_table` | Source + target |
| Ready - Serve | `ready_serve` / `ready` / `serve` | Per-item or per-order |
| Collect bill | `collect_bill` | Payment collection |
| Split bill | `split_bill` | Splits into N sub-orders; carries child order ids |
| TAB out | `tab_out` | Settles tab-added order later |
| Collect bill (duplicated in user list) | same as above | Treat as single |

**The exact string list must be confirmed with backend** — see Q-OP1.

## 4. Required behaviour

### 4.1 Data plumbing
1. Transform layer (`api/services/reportService.js::getOrderLogsReport`) must read `api.operations` and expose it as `order.operations` on every transformed row.
2. A new transform helper (`reportTransform.js::operationEntry`) normalizes each entry into:
   ```js
   {
     id,
     type: api.operation,
     actor: api.vendor_employee_name ?? `Employee #${api.vendor_employee_id}`,  // cancel_by_name-style resolution
     at: api.created_at,
     diffFromCreate: (at - order.createdAt) / 60000,  // minutes
     before: {...},
     after: {...},
     raw: entry
   }
   ```

### 4.2 UI surface — Side Panel (`components/reports/OrderDetailSheet.jsx`)
Add a new collapsible **"Operations" section** below the existing `Order Details` section. Render as a vertical timeline:
- Each entry: icon for operation type, label, actor name, absolute time, +Xm from order punch.
- For entries with `before`/`after` diffs (e.g., `payment_method_change`), show "₹CASH → ₹UPI".
- Sortable: chronological ascending by default; toggle to descending.

### 4.3 UI surface — Audit Report row (optional Phase B)
- A small `<ops>` pill indicator showing operation count (e.g., "3 ops") clickable to open the side panel's Operations section.

## 5. File-by-file impact

| File | Change |
|---|---|
| `api/services/reportService.js` ~L860-935 | Read `api.operations` array on each wrapper; expose as `order.operations` field |
| `api/transforms/reportTransform.js` (new export) | `operationFromAPI(raw, order)` normalizer + `operationsListFromAPI(list, order)` |
| `api/transforms/reportTransform.js::singleOrderNew` (L515-637) | Add `operations` to returned shape |
| `components/reports/OrderDetailSheet.jsx` (new section) | Render operations timeline inside side panel |
| `components/reports/OrderDetailSheet.jsx` (lifecycle Timeline) | Keep existing 4-stage timeline; operations section is additive |
| `components/reports/OrderTable.jsx` (optional Phase B) | Optional "ops count" cell in a new column |
| `constants/` (new) | Icon + label map for each operation type |
| `__tests__/` | Unit tests for each operation type renderer + chronological sort |

## 6. Reconciliation with existing CRs

| Existing CR | What it covers | What CR-009 adds |
|---|---|---|
| CR-005 Req #4 (lifecycle) | Fixed 4-stage timeline (Order Taken → Ready → Served → Paid) | Full operations history (13+ types) — superset |
| CR-005 Req #5 (cancelled_by name) | Per-stage actor name on lifecycle | Same actor pattern but for all operations |
| CR-008 Sub-CR #2 (action time column) | Terminal action time on row | Per-operation timestamp inside detail panel |

CR-009 does **not** replace any of these; it layers an additional audit surface on top.

## 7. Open questions

| ID | Question | Owner | Default |
|---|---|---|---|
| Q-OP1 | Confirm the exact string set of `operation` values + the timestamp field name on each entry (`created_at` / `updated_at` / `operation_time`?) | Backend | — |
| Q-OP2 | Does each operation entry carry the actor's **name**, or only `vendor_employee_id`? If only id, CR-005 BE-2 name resolution applies here too | Backend | Ship `vendor_employee_name` per entry |
| Q-OP3 | Granularity: is `item_cancel` one entry per cancelled item, or one entry per batch cancel? | Backend | Per-item |
| Q-OP4 | Surface: Audit Report side-panel only, or also a dedicated "Activity Log" page accessible from the Reports tab? | Product | Side panel only (Phase A) |
| Q-OP5 | Visual: vertical timeline vs simple table? | Product/UX | Vertical timeline (matches existing lifecycle visual language) |
| Q-OP6 | Export: include operations in PDF/CSV exports? | Product | Not in Phase A; add in Phase B if requested |
| Q-OP7 | Filtering: can operator filter the operations list by type? | Product | Not in Phase A |
| Q-OP8 | Do cancelled/deleted orders still keep their operations array, or is it purged? | Backend | Keep forever |
| Q-OP9 | Performance: how many operations are typical per order? Any hard cap (last N)? | Backend | — |

## 8. Backend asks (new)

| # | Ask | Notes |
|---|---|---|
| BE-11 | Document the canonical `operations[i].operation` string set (13+ values from user's list) | Must match existing backend emission |
| BE-12 | Ensure each operation entry carries `vendor_employee_name` (actor display name), or confirm we can resolve via shared roster | Aligns with CR-005 BE-2, BE-5..BE-7 |
| BE-13 | Confirm timestamp field name on each operation entry | |
| BE-14 | Confirm whether split-bill child order-ids are listed inside the split_bill entry | Needed for cross-linking in UI |

## 9. Risks

| ID | Risk | Severity |
|---|---|---|
| R-1 | Operation string set varies across tenants or legacy orders may not have the array | Medium — graceful degrade: hide "Operations" section when array is empty |
| R-2 | Long operation lists could make side panel scroll excessive | Low — show latest N with "Show all" expand |
| R-3 | `vendor_employee_id` without name produces yet another "Employee #<id>" fallback | High if BE-12 not delivered — tied to CR-005 BE-2 |
| R-4 | Operation types not in CR-009's documented set (new types added later) fall through to a generic "Unknown operation" renderer | Low — log unknown types for telemetry |

## 10. Hand-off note

Primary blocker: **BE-11 through BE-14 (backend contract for the operations array).** Until this is documented, frontend can only do a partial pass-through render.

Phase A (after BE confirms): operations timeline inside Audit Report side panel. Approx 3-4 hours of work.
Phase B (optional): row-level ops-count indicator + export + filter.

---

## 11. Decision log

| Date | Decision | Source |
|---|---|---|
| 2026-05-01 | Confirmed `operations[]` array is shipped by backend but ignored by frontend | Code inspection (zero references) |
| 2026-05-01 | CR-009 logged as additive layer on top of CR-005 and CR-008, not a replacement | Requirement scoping |
