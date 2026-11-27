# BACKEND_BRIEF — BUG-598 V1 Contract — Three Unanswered Gaps

**Date:** 2026-11-27
**Filed by:** Abhishek (frontend)
**To:** Gyan (backend)
**Re:** Response to BUG-598_V1_ORDER_LOGS_PROPOSED_CONTRACT_2026_11_27.md
**Priority:** P1 — blocks frontend acceptance of V1 contract and all Sub-batch B planning
**Classification:** CONTRACT_GAP × 3

---

## Context

The V1 proposed contract (`order-logs-report`) was reviewed against the live frontend
codebase today. Three gaps were found that the contract does not address. Frontend
cannot accept or implement the V1 migration until all three are answered.

None of these are requests for new features — they are clarification questions on
whether the existing proposed contract is complete enough to implement against.

---

## Gap 1 — Room Orders: how does the frontend find room orders across pages?

### The problem

Room Orders page (`/reports-module/room-orders`) works today by downloading **all
orders** in the date range in a single call and then scanning every row on the
device to find the room ones. The filter logic (`roomOrdersService.js` lines 96–130)
looks for rows where `order_in === 'RM'` or `order_in === 'SRM'`, not by
`payment_method`. It also reads `room_info` metadata from RM parent rows and links
SRM child rows to their parent.

With the V1 endpoint, orders come back in pages of up to 500 per call. If 1,000
orders exist and room orders happen to be orders #501–520, they will never appear
on page 1. The frontend has no way to know they exist without fetching every page
first.

### The ask

**Please answer ONE of these two options:**

**Option A — Server-side filter (preferred):**
Add an optional `order_in` filter to the V1 request:
```json
{ "from_date": "...", "to_date": "...", "sort_by": "collect_bill",
  "order_in": "RM" }
```
This lets the Room Orders page request only room orders directly.
Confirm: will `order_in` filter work in V1? Will it support `"RM"` and `"SRM"`?
Will `payment_summary` and `total_orders` reflect only the filtered subset?

**Option B — Confirm fetch-all is acceptable:**
Confirm that for the Room Orders use case, the frontend must fetch ALL pages
sequentially until `pagination.total_pages` is exhausted, scan every row for
`order_in === 'RM'`, and then render the results. If this is the intended approach,
confirm the per-page response is fast enough for a 730-day range where
`total_orders` could be 5,000+.

---

## Gap 2 — Snapshot consistency across page fetches

### The problem

The contract states: *"The API does not provide a cross-request snapshot guarantee
due to the live nature of the data."*

For a financial report used by restaurant owners to close their books, this creates
a real accuracy problem. Here is a concrete example:

1. Owner opens Order Ledger for the last 30 days at 11:58pm.
2. Frontend fetches page 1 of 10 → gets orders 1–100.
3. While fetching page 2, a cashier settles a bill → a new order appears.
4. The backend shifts all order positions by 1.
5. Order #100 (last row of page 1) now appears again as the first row of page 2.
   OR order #101 (first row of page 2) is skipped entirely.
6. The grand total at the bottom of the report is wrong.

This matters because restaurant owners use the Order Ledger total to verify their
cash drawer at end of day.

### The ask

Please answer ONE of these:

**Option A — Request timestamp / cursor:**
Support a `snapshot_at` timestamp in the request (ISO 8601). Backend freezes the
result set to orders that existed at that timestamp. All pages of the same report
session use the same snapshot. Frontend sends the same `snapshot_at` on every
page request within the same session.

**Option B — Cursor-based pagination:**
Instead of `page` number, use a `cursor` field (e.g. last order ID seen). Backend
returns orders created before/after that cursor. Immune to new orders shifting
positions.

**Option C — Acknowledge and document the limitation:**
If neither A nor B is feasible, explicitly confirm: "V1 does not guarantee
consistency across pages. Frontend should warn users that the report may have
minor discrepancies if viewed during peak order activity." Frontend will add an
info notice on the Order Ledger page and document this as a known limitation.

We need a written answer to plan the frontend correctly — we cannot leave this
as an implicit gap.

---

## Gap 3 — Room Orders page needs room-only financial totals

### The problem

The contract's `payment_summary` covers the entire filtered date range — all
orders, all payment methods. The Room Orders page shows a header KPI row:
**Total Room Revenue**, **Room Orders Count**, **Average Room Bill**. These are
room-only figures, not all-orders figures.

Today these totals are computed on the device by filtering RM rows from the full
dump and summing their amounts. With pagination, the frontend cannot compute these
accurately unless it fetches all pages first (see Gap 1).

The contract explicitly says: *"The shared endpoint's full-range summary is not
automatically a room-only subtotal. Specific room-only KPI totals require a
separate contract agreement."*

### The ask

**Please confirm which path you intend:**

**Option A — Add room-only summary to V1 response (when `order_in=RM` filter is
used):**
When the request includes `"order_in": "RM"`, the `payment_summary` returned
reflects room orders only. This is the natural behaviour if Gap 1 Option A is
implemented — the filtered summary would automatically be room-only.

**Option B — Separate room summary field in every V1 response:**
Add a `room_payment_summary` object alongside `payment_summary` that covers only
RM rows, regardless of what filter is applied. Frontend uses this for the Room
Orders header KPIs.

**Option C — Defer to a follow-up contract:**
Room-only totals are out of scope for V1. Frontend will show a "—" placeholder
for Room Revenue KPIs until a dedicated room-orders aggregation endpoint is
delivered (the original ask from `BACKEND_BRIEF_ROOM_ORDERS_AGGREGATION_2026_08_26.md`,
which has been open since August 2026).

---

## Summary of Questions

| # | Gap | Question | Blocks |
|---|-----|----------|--------|
| 1 | Room order detection | Does V1 support `order_in` filter param? Or must FE fetch all pages? | Room Orders V1 migration |
| 2 | Snapshot consistency | Will V1 support `snapshot_at` / cursor? Or acknowledge+document limitation? | Order Ledger V1 migration |
| 3 | Room-only totals | Will `payment_summary` be room-scoped when filtered, or separate field, or deferred? | Room Orders header KPIs |

---

## What is NOT being asked

- No request to change the pagination design
- No request to change the 730-day limit
- No request to change the `payment_summary` / `page_payment_summary` split
- No request to change any field names inside the `order[]` wrappers
- No request for an export endpoint

The V1 contract as proposed is accepted for Order Ledger and All Orders once
Gap 2 is answered. Only Room Orders is blocked on Gaps 1 and 3.

---

## Urgency

Frontend acceptance of the V1 contract is a gate before backend implementation
starts. The sooner these three questions are answered, the sooner backend can build
and frontend can plan. Gaps 1+3 are related — if Option A is chosen for Gap 1,
Gap 3 resolves automatically for the Room Orders use case.

**Recommended fast path:** Confirm Gap 1 Option A (add `order_in` filter) and Gap 2
Option C (acknowledge limitation, frontend adds a notice). This unblocks both Order
Ledger and Room Orders in one round-trip.
