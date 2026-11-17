# BATCH-C CR-544 API Contract v2 — Cancel After Making Unpaid: Audit Event

**CR:** CR-544
**Batch:** C — ASK 4
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`
**Assigned to:** Gyan
**Priority:** P0
**Date:** 2026-11-17 (v2 — owner decisions locked)
**Status:** BLOCKING
**Supersedes:** `BATCH-C_CR-544_API_CONTRACT_2026_11_17.md` (v1)

---

## Owner Decisions (LOCKED 2026-11-17)

| # | Decision | Answer |
|---|----------|--------|
| OD-544-01 | Time window? | **No time limit** — flag ANY cancel after unpaid on the same order, even days/weeks later |
| OD-544-02 | Re-paid then cancelled? | **YES, still flag** — even if order was re-paid between unpaid and cancel. Additionally, show **how many times** the order was made unpaid (`unpaid_count`) |

---

## Detection Logic (Updated)

For each order in the date range:
1. Count ALL `make_unpaid` events on that order → `unpaid_count`
2. Get the **earliest** `made_unpaid_at` timestamp
3. For each cancellation (item or order) on that order WHERE `cancel_at > earliest made_unpaid_at`:
   - Emit `cancel_after_unpaid` audit event
   - **NO time limit** — flag regardless of gap duration
   - **Flag even if order was re-paid** between the unpaid and cancel events
   - Include `unpaid_count` (how many times this order was made unpaid)
   - Include `order_status_at_cancel` (was order still unpaid or re-paid when cancel happened)

---

## New Event Type: `cancel_after_unpaid`

```json
{
  "type": "cancel_after_unpaid",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 200.00,
  "by": "Counter",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:35:00",
  "scope": "item",
  "gap_minutes": 5,
  "unpaid_count": 2,
  "order_status_at_cancel": "unpaid"
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | `"cancel_after_unpaid"` LOCKED |
| `order_id` | string | Order ID (preserve leading zeros) |
| `food_name` | string | Cancelled item name (null/absent for full-order cancel) |
| `amount` | number | ₹ value of cancelled item/order |
| `by` | string | Employee who cancelled |
| `made_unpaid_at` | datetime | Earliest unpaid timestamp on this order |
| `cancel_time` | datetime | When the cancel happened |
| `scope` | string | `"item"` or `"order"` |
| `gap_minutes` | integer | Minutes between earliest unpaid and cancel |
| `unpaid_count` | integer | **NEW** — how many times this order was made unpaid (≥1) |
| `order_status_at_cancel` | string | **NEW** — `"unpaid"` or `"paid"` — payment status at time of cancel |

---

## New KPI Count

| Field | Type |
|---|---|
| `cancel_after_unpaid_count` | integer |

---

## Rules (Explicit for Backend)

1. **NO time limit:** `gap_minutes` can be any value (5 mins or 5 days). Always flag.
2. **Re-paid orders included:** If order was made unpaid → then re-paid → then cancelled, STILL emit the event. Set `order_status_at_cancel = "paid"` so frontend can show the distinction.
3. **Multiple unpaid events:** If order was made unpaid 3 times, use the **earliest** `made_unpaid_at` for detection. Set `unpaid_count = 3`. Each cancel after that earliest timestamp = 1 event.
4. **Same cancel can appear in BOTH cancel_after_print AND cancel_after_unpaid:** If a cancel happened after both bill print AND unpaid, it should appear as BOTH event types (they detect different fraud patterns).

---

## Data Availability

- `operations[].operation = 'make_unpaid'` with `created_at` → derives `made_unpaid_at`
- Count of `make_unpaid` operations per order → `unpaid_count`
- `f_payment_status` at cancel time → `order_status_at_cancel`
- All data exists in `order-logs-report` operations log

---

## Fraud Patterns Covered

**Pattern A — Classic (still unpaid at cancel):**
1. Customer pays ₹500 cash
2. Cashier marks order "unpaid" (`unpaid_count: 1`)
3. Cashier cancels ₹200 → `order_status_at_cancel: "unpaid"` → ₹200 stolen

**Pattern B — Re-paid cover-up:**
1. Customer pays ₹500 cash
2. Cashier marks order "unpaid"
3. Manager re-collects ₹500 (order re-paid)
4. Cashier cancels ₹200 → `order_status_at_cancel: "paid"` — still flagged! Audit trail shows the unpaid→repaid→cancel chain

**Pattern C — Repeated unpaid (escalation):**
1. Order made unpaid 3 times (`unpaid_count: 3`) — high-risk signal
2. Items cancelled after → audit shows the repeated pattern

---

## Backward Compatibility

- Additive only — no breaking changes
- 2 new fields (`unpaid_count`, `order_status_at_cancel`) are additions to the event shape
- Same endpoint, same response structure
- No migration needed
