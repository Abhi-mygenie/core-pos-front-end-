# API Contract — CR-493 BA-23 Auto-Cancel Behaviour — REVISED v2 — 2026-11-16

Backend: Gyan · ID: BA-23 · IA doc: `impact/BA-23_AUTO_CANCEL_AUDIT_IMPACT_ANALYSIS_v2_2026_11_16.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED.**
**Status: v2 — REVISED 2026-11-16. Supersedes BA-23 section in v1 contract. Owner LOCKED all decisions.**

> **v2 CHANGES (2026-11-16):** (1) Reason on auto-cancelled order changed from "last item's reason" to "comma-separated ALL items' reasons". (2) New audit event `all_items_cancelled` in `insights-dashboard`. (3) Backfill requirement added. (4) Option C display rule formalized.

---

## 1. `cancel_source` field on orders (UNCHANGED from v1)

| Endpoint | Field | Type | Values | Status |
|---|---|---|---|---|
| `cancel-order-list` → each order | `cancel_source` | string | `"manual"` / `"auto_last_item"` / `"merge"` | NEW |
| `insights-cancellations` → each item (scope=order) | `cancel_source` | string | same | NEW |
| `combined` (Order Beta) → each order | `cancel_source` | string | same | NEW |

**Rule:** Every cancelled order MUST have `cancel_source`. No null, no absent.
- `manual` = cashier explicitly hit Cancel Order
- `auto_last_item` = backend auto-cancelled because all items were cancelled individually
- `merge` = order was merged into another order

---

## 2. Reason + employee on auto-cancelled orders (CHANGED in v2)

| Field | v1 contract | v2 contract (LOCKED) |
|---|---|---|
| `cancellation_reason` | Last item's reason text | **Comma-separated ALL items' reasons** (deduplicated) |
| `cancellation_note` | `""` | `""` (unchanged) |
| `canceled_by` | Last item's employee | Last item's employee (unchanged) |

**Example:**
Order has 3 items cancelled with reasons "Wrong item punched", "Late preparation", "Wrong item punched".
→ `cancellation_reason: "Wrong item punched, Late preparation"` (deduplicated, comma+space separated)

**Deduplication rule:** If the same reason appears multiple times, include it only once.
**Max length:** Same as existing `cancellation_reason` field max. If too long, truncate with "..." at the end.

---

## 3. Insights counting (UNCHANGED — formalized)

**`insights-cancellations` summary:**
- `cancelled_order_count` / `order_scope_count` MUST **exclude** `auto_last_item` and `merge` orders
- `item_scope_count` MUST count items from auto-cancelled orders (they ARE real item cancels)
- `total_qty` = item_scope_count + (manual-only order_scope_count)

**`insights-cancellations` items array:**
- Items from auto-cancelled orders appear with `scope: "item"` (their actual scope) — NOT `scope: "order"`
- Items from manually cancelled orders appear with `scope: "order"` as today

**Effect:** The phantom "order-scope" rows for auto-cancelled orders disappear. Each item is counted exactly once.

---

## 4. New audit event: `all_items_cancelled` (NEW in v2)

**Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits.orders[]`

When an order is auto-cancelled (all items cancelled individually), emit:

```json
{
  "type": "all_items_cancelled",
  "order_id": "021537",
  "amount": 210.00,
  "by": "<last employee who cancelled an item>",
  "item_count": 3,
  "reasons": "Wrong item punched, Late preparation, Duplicate punched",
  "cancel_time": "2026-11-15T14:35:00",
  "items": [
    { "food_name": "Paneer Tikka", "reason": "Wrong item punched", "amount": 350, "by": "Counter", "cancel_time": "14:20" },
    { "food_name": "Dal Makhani", "reason": "Late preparation", "amount": 250, "by": "Counter", "cancel_time": "14:30" },
    { "food_name": "Naan", "reason": "Duplicate punched", "amount": 60, "by": "Counter", "cancel_time": "14:35" }
  ]
}
```

**New KPI count in `audits`:**

| Field | Type | Description |
|---|---|---|
| `all_items_cancelled_count` | integer | Count of orders where all items were cancelled one by one |

**Detection rule:** Order has `cancel_source: "auto_last_item"` → emit audit event.

---

## 5. Backfill historical data (NEW in v2)

Backend must run a one-time backfill on existing data:

| What | How |
|---|---|
| **Find auto-cancelled orders** | Orders where `cancellation_reason IS NULL` AND `canceled_by IS NULL` AND order has items with individual cancel reasons |
| **Set `cancel_source`** | `"auto_last_item"` for item-by-item cancels; `"merge"` for merge cancels (`cancel_state: Merge`) |
| **Set `cancellation_reason`** | Comma-separated (deduplicated) from all items' `cancel_reason_text` |
| **Set `canceled_by`** | Last item's `cancel_by_name` (by cancel timestamp) |
| **Recalculate Insights counts** | After backfill, `cancelled_order_count` in Insights must exclude `auto_last_item` and `merge` for all date ranges |

**Backfill scope:** All historical cancelled orders, all restaurants. One-time migration script.

**Verification after backfill:** Run `insights-cancellations` for a historical month → "No reason provided" rows should be zero (or near-zero — only legitimate cases where no reason was actually selected).

---

## 6. Error handling

No new errors. `cancel_source` is set server-side; FE never sends it.

---

## 7. Backward compatibility

| Concern | Resolution |
|---|---|
| FE deployed before backend | FE treats absent/null `cancel_source` as `"manual"` — no crash, counts unchanged |
| Backend deployed before FE | Backend fixes counts; old FE shows correct totals but doesn't filter client-side — still an improvement |
| Backfill not run yet | Old data still has nulls; FE treats as `"manual"` — same as today, no regression |

---

## 8. Backend sign-off

| ID | Item | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|---|
| BA-23a | `cancel_source` field on 3 endpoints | | | |
| BA-23b | Comma-separated reason on auto-cancel | | | |
| BA-23c | Insights counting fix (exclude auto/merge) | | | |
| BA-23d | `all_items_cancelled` audit event in insights-dashboard | | | |
| BA-23e | Backfill historical data | | | |

---

## 9. Supersedes

This contract **supersedes** BA-23 section in `contracts/BATCH-A_CR-493_API_CONTRACT_2026_11_15.md` §3. The v1 contract specified "last item's reason" — v2 changes to "comma-separated ALL items' reasons" per owner 2026-11-16 decision.
