# Req 3 — Room Order Bill Print — V3 Doc Notes (Standalone)

> **Per user instruction (Apr-2026):** keep these notes in a *separate* summary doc.
> Do NOT update existing V3 docs (`/app/v3/*`) or `/app/memory/V3_DOC_UPDATES_PENDING.md`.
> Decision-set source: `/app/memory/REQ3_ROOM_BILL_PRINT_DEEPDIVE.md` §10.

---

## AD-302A — Room Auto-Print Suppression (NEW, supersedes AD-302 for room orders)

**Decision.** Auto-bill print (`settings.autoBill === true` path) is **suppressed** for any order where `effectiveTable.isRoom === true`, regardless of the autoBill flag. This applies to BOTH:

- **Scenario 1** — Postpaid Collect-Bill on existing order (`OrderEntry.jsx:1310`).
- **Scenario 2** — Prepaid Place + Pay on a fresh order (`OrderEntry.jsx:1103`, inside `autoPrintNewOrderIfEnabled`).

**Manual `Print Bill`** button in `CollectPaymentPanel` (line 458 `handlePrintBill`) **remains enabled** for rooms with the enriched payload — gives cashier an explicit print path.

**Rationale.** Room orders accumulate transferred bills + room-booking balance over time. Printing on every collect-bill / pre-payment in a room flow produces premature/incomplete receipts. Owner directive: suppress unconditionally; keep manual escape hatch.

**Code anchors.**
- `frontend/src/components/order-entry/OrderEntry.jsx:1103-1110` (Path A guard).
- `frontend/src/components/order-entry/OrderEntry.jsx:1313` (Path B inline gate `&& !effectiveTable?.isRoom`).

**Supersedes.** AD-302 (collect-bill ↔ print parity, postpaid auto-print) — for ROOM orders only. AD-302 remains authoritative for non-room flows.

---

## AD-Room-Print-Payload — Room Bill Print Payload Enrichment (NEW)

**Decision.** When `order.isRoom === true`, `buildBillPrintPayload` populates room-specific fields from in-memory `order.roomInfo` and `order.associatedOrders`, mirroring the cashier-visible totals in `CollectPaymentPanel`.

### Conservative key contract (Q-3C answer = `c`)
Only keys the backend already understands are populated. Unknown keys (`roomPrice`, `associatedOrdersTotal`, `finalPayable`, top-level `paid_room`, top-level `room_id`) are deferred until backend confirms.

| Key (top-level) | Type | Source | Behavior |
|---|---|---|---|
| `roomRemainingPay` | number | `order.roomInfo.balancePayment` (clamped ≥0) | Was hardcoded `0`; now real value when isRoom, else `0`. |
| `roomAdvancePay` | number | `order.roomInfo.advancePayment` | Was hardcoded `0`; now real value when isRoom, else `0`. |
| `roomGst` | number | — | Stays `0` per Q-3E; room balance is tax-free pass-through. |
| `associated_orders` | array | `order.associatedOrders[]._raw` | NEW. Empty array for non-room. Snake_case schema (see below). |
| `payment_amount` / `grant_amount` | number | overrides.paymentAmount + assoc + balance | When override path supplies food-only `paymentAmount` AND isRoom, adds `associatedTotal + roomBalance` so printed total matches cashier-visible total. Default branch trusts `order.amount` (already room-inclusive per Task 4). |
| `tablename` | string | unchanged | Already carries the room number for room orders (`order.tableNumber`). User confirmed sufficient — Q-3G. |

### `associated_orders[]` item schema (matches user-supplied curl sample)

```json
{
  "id":                  3755,                    // association record ID
  "room_id":             7486,
  "restaurant_id":       618,
  "user_id":             null,
  "order_id":            731402,                  // actual transferred order ID
  "restaurant_order_id": "000125",
  "order_amount":        71,
  "order_status":        0,
  "created_at":          "2026-04-25T05:50:18.000000Z",
  "updated_at":          "2026-04-25T05:50:18.000000Z"
}
```

Sourced from `_raw` preserved in `fromAPI.order` (see `orderTransform.js:249-272`). When `_raw` is missing for any reason, falls back to known camelCase fields (`orderId`, `orderNumber`, `amount`).

### Architectural rule preserved (Q-3F)

- Service charge, discount, tip, GST, VAT apply **only** to the food-subtotal of THIS room order.
- They do **NOT** apply to `roomBalance` (`roomInfo.balancePayment`).
- They do **NOT** apply to `associatedTotal` (Σ `associated_orders[].order_amount`).
- This is enforced by:
  - `CollectPaymentPanel.jsx:320` — `scApplicable` includes `dineIn` / `walkIn` / `isRoom` (food applicability).
  - `orderTransform.js:1127-1128` — `scApplicable` mirror inside `buildBillPrintPayload`.
  - `roomBalanceForPrint` and `associatedTotalForPrint` are added flat (post-tax) to `payment_amount` only.

### Code anchors

- `frontend/src/api/transforms/orderTransform.js:249-272` — `_raw` preservation in `fromAPI.order.associatedOrders`.
- `frontend/src/api/transforms/orderTransform.js:1199-1252` — REQ3 enrichment block in `buildBillPrintPayload`.

### Out of scope (explicitly deferred)

- Adding `roomPrice`, `associatedOrdersTotal`, `finalPayable`, top-level `paid_room`, top-level `room_id` to print payload — pending backend confirmation. Cashier total is preserved via `payment_amount`/`grant_amount`.
- Aggregator (Swiggy/Zomato) order print behavior — out of scope (never room).
- Backend printer template changes — none assumed; new keys are additive and backend should ignore unknowns.

---

## Decision Snapshot

| Q | Answer | Notes |
|---|---|---|
| Q-3A | strict (any room order, both scenarios) | suppression universal |
| Q-3B | a — keep manual Print Bill enabled | enriched payload |
| Q-3C | c — conservative; only existing keys + `associated_orders[]` | curl sample provided, schema confirmed for `associated_orders` |
| Q-3D | confirm defaults | mapped above |
| Q-3E | a — `roomGst = 0` | preserves architectural rule |
| Q-3F | a — food-only SC/discount/tip/GST/VAT | enforced by code anchors |
| Q-3G | check existing — `tablename` already carries room number | no new top-level `room_id`/`paid_room` |
| Q-3H | a — trust live overrides | no extra refetch |
| Q-3I | a — no print on Transfer to Room | unchanged |
| Q-3J | a — no special ₹0 receipt | covered by Q-3A=strict |
| Q-3K | separate doc (this file) | NOT applied to existing V3 docs |
| Q-3L | a — hard-coded; no feature flag | universal across tenants |

---

## Test Coverage (verified by main agent / next QA pass)

- T-1 dine-in autoBill → fires (regression). 
- T-2 fresh ROOM order autoBill (Path A) → SKIPPED with `[AutoPrintBill] SKIPPED — isRoom` log.
- T-3 collect-bill on existing room (Path B) → SKIPPED.
- T-4 manual `Print Bill` on room with food + transfers + balance → payload contains `roomRemainingPay > 0`, `roomAdvancePay > 0`, `associated_orders[]` non-empty, `payment_amount = food + assoc + balance`.
- T-5 manual `Print Bill` on food-only room → `associated_orders=[]`, `roomRemainingPay=0`.
- T-6 dashboard printer icon (default branch) → room fields populated from `order.roomInfo` automatically.
- T-7 discount on room collect-bill → `discount_amount` reflects food-only discount.
- T-8 tip on room → `Tip` field food-only.
- T-9 empty room (₹0 marker-only) place-order → SKIPPED via Q-3A=strict.
- T-12 Transfer-to-Room → no print (unchanged).

(Test plan source: `/app/memory/REQ3_ROOM_BILL_PRINT_DEEPDIVE.md` §6.3.)

---

_End of REQ3 standalone V3 notes. Existing V3 docs untouched per owner directive._
