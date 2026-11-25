# BACKEND_BRIEF_CR-544 — v3 Addendum: Discount After Unpaid + Re-pay Gap

**Extends:** `BACKEND_BRIEF_CR-544_2026_11_17_v2.md` (cancel_after_unpaid — DELIVERED ✅)
**Date:** 2026-11-17
**Priority:** NEW-1 = P0 / NEW-2 = P1 (design now, implement when ready)
**Assigned to:** Gyan
**Scope:** CR-544 expanded (owner directive — no new CR number)

---

## Why This Addendum

CR-544 v2 tracked only **cancellations** after unpaid. Owner review expanded the "Leakage After Unpaid" card to cover **all edits** after unpaid — including discounts and the money gap when re-paid. This addendum adds 2 new asks to the same endpoint, same `audits` section.

**What already exists (v2 — no changes):**
- `cancel_after_unpaid` events ✅ DELIVERED
- `cancel_after_unpaid_count` KPI ✅ DELIVERED
- Detection rule, schema, examples — all unchanged

**What this addendum adds:**
- **NEW-1:** `discount_apply_after_unpaid` + `discount_remove_after_unpaid` events (P0)
- **NEW-2:** `repay_gap` event per order with cancellation vs discount breakdown (P1)

---

## NEW-1: Discount After Unpaid Events

### Summary

Track when staff applies, removes, or replaces a discount on an order **after that order was marked unpaid**. Same fraud logic as CR-546 (discount after print), but triggered by unpaid status instead of print timestamp.

---

### Three Discount Flows (same as CR-546)

All 3 flows are auditable when they happen AFTER `first_make_unpaid_at`:

| # | Flow | What Happens | Events Emitted |
|---|------|-------------|----------------|
| 1 | **Apply** | No discount → discount added | 1× `discount_apply_after_unpaid` with `operation: "apply"` |
| 2 | **Remove** | Discount → no discount | 1× `discount_remove_after_unpaid` with `operation: "remove"` |
| 3 | **Replace** | Discount A → Discount B | 2× events: `discount_remove_after_unpaid` (old, `operation: "replace"`) + `discount_apply_after_unpaid` (new, `operation: "replace"`) |

Replace = 2 events — same pattern and reasoning as CR-546 v2 §"Why Replace = 2 Events".

---

### Detection Rule

```
For each order in the requested date range:

  1. Check: does this order have at least one make_unpaid operation?
     → If NO: skip this order
     → If YES: get first_make_unpaid_at = timestamp of the EARLIEST make_unpaid event

  2. Count: unpaid_count = total number of make_unpaid operations on this order

  3. Scan discount operations on this order:

     CASE: Discount applied (no prior discount):
       IF discount_applied_at > first_make_unpaid_at:
         → Emit discount_apply_after_unpaid with operation="apply"

     CASE: Discount removed (discount → no discount):
       IF discount_removed_at > first_make_unpaid_at:
         → Emit discount_remove_after_unpaid with operation="remove"

     CASE: Discount replaced (discount A → discount B):
       IF replace_at > first_make_unpaid_at:
         → Emit discount_remove_after_unpaid with OLD discount values, operation="replace"
         → Emit discount_apply_after_unpaid with NEW discount values, operation="replace"
         → Both events share same order_id + close timestamps

  IMPORTANT (same rules as cancel_after_unpaid):
  - Re-payment between make_unpaid and discount change does NOT prevent event emission
  - Use the FIRST make_unpaid_at (not the most recent)
  - No time limit — discount change can be minutes or days after make_unpaid
```

---

### Event Schemas

#### Event type: `discount_apply_after_unpaid`

```json
{
  "type": "discount_apply_after_unpaid",
  "order_id": "000680",
  "amount": 680.00,
  "discount_amount": 68.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "made_unpaid_at": "2026-11-10T21:08:00",
  "discount_time": "2026-11-11T09:15:00",
  "gap_minutes": 727,
  "unpaid_count": 3,
  "order_status_at_discount": "unpaid",
  "operation": "apply"
}
```

#### Event type: `discount_remove_after_unpaid`

```json
{
  "type": "discount_remove_after_unpaid",
  "order_id": "000680",
  "amount": 680.00,
  "discount_amount": 68.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "made_unpaid_at": "2026-11-10T21:08:00",
  "discount_time": "2026-11-11T10:30:00",
  "gap_minutes": 802,
  "unpaid_count": 3,
  "order_status_at_discount": "unpaid",
  "operation": "remove"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | YES | `"discount_apply_after_unpaid"` or `"discount_remove_after_unpaid"` |
| `order_id` | string | YES | Order ID (preserve leading zeros) |
| `amount` | number | YES | Order total amount at time of event (₹) |
| `discount_amount` | number | YES | Discount value in ₹ (the actual rupee discount applied/removed) |
| `discount_type` | string | YES | `"percent"` or `"fixed"` (same as CR-546 — no `"flat"`, no `"preset"`) |
| `discount_value` | number | YES | Raw input value: `10` for 10%, `50` for ₹50 fixed |
| `by` | string | YES | Employee who applied/removed the discount |
| `made_unpaid_at` | datetime | YES | Timestamp of the **FIRST** `make_unpaid` event on this order |
| `discount_time` | datetime | YES | When the discount was applied/removed |
| `gap_minutes` | integer | YES | `floor((discount_time - made_unpaid_at) / 60)` — gap in whole minutes |
| `unpaid_count` | integer | YES | Total number of times this order was made unpaid |
| `order_status_at_discount` | string | YES | Payment status at moment of discount change: `"paid"` or `"unpaid"` |
| `operation` | string | YES | `"apply"` / `"remove"` / `"replace"` |

### `order_status_at_discount` allowed values

| Value | Meaning |
|-------|---------|
| `"unpaid"` | Order was still unpaid when discount was changed |
| `"paid"` | Order was re-paid before discount was changed |

---

### Examples

#### Example 1 — Discount applied while order is still unpaid

```
Timeline:
  21:00 — Order #000680 placed, ₹680, paid
  21:08 — make_unpaid (1st time)
  09:15 (+1 day) — Manager applies 10% discount (order still unpaid)
```

→ 1 event:

```json
{
  "type": "discount_apply_after_unpaid",
  "order_id": "000680",
  "amount": 680.00,
  "discount_amount": 68.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "made_unpaid_at": "2026-11-10T21:08:00",
  "discount_time": "2026-11-11T09:15:00",
  "gap_minutes": 727,
  "unpaid_count": 1,
  "order_status_at_discount": "unpaid",
  "operation": "apply"
}
```

#### Example 2 — Discount replaced after unpaid + re-pay (laundering)

```
Timeline:
  14:00 — Order #000715 placed, ₹500, with 5% discount, paid
  14:30 — make_unpaid (1st time)
  14:35 — Re-paid (does NOT close the window)
  14:40 — make_unpaid (2nd time)
  14:50 — Manager replaces 5% discount with ₹100 fixed discount (order still unpaid)
```

→ 2 events (replace = remove old + apply new):

```json
// Event 1: Remove old discount
{
  "type": "discount_remove_after_unpaid",
  "order_id": "000715",
  "amount": 500.00,
  "discount_amount": 25.00,
  "discount_type": "percent",
  "discount_value": 5,
  "by": "Manager",
  "made_unpaid_at": "2026-11-12T14:30:00",
  "discount_time": "2026-11-12T14:50:00",
  "gap_minutes": 20,
  "unpaid_count": 2,
  "order_status_at_discount": "unpaid",
  "operation": "replace"
}

// Event 2: Apply new discount
{
  "type": "discount_apply_after_unpaid",
  "order_id": "000715",
  "amount": 500.00,
  "discount_amount": 100.00,
  "discount_type": "fixed",
  "discount_value": 100,
  "by": "Manager",
  "made_unpaid_at": "2026-11-12T14:30:00",
  "discount_time": "2026-11-12T14:50:00",
  "gap_minutes": 20,
  "unpaid_count": 2,
  "order_status_at_discount": "unpaid",
  "operation": "replace"
}
```

#### Example 3 — Discount removed after unpaid, order was re-paid

```
Timeline:
  14:00 — Order #000730 placed, ₹400, with 10% discount (₹40), paid
  14:30 — make_unpaid
  14:45 — Re-paid
  15:00 — Counter removes the 10% discount (order is paid at this moment)
```

→ 1 event:

```json
{
  "type": "discount_remove_after_unpaid",
  "order_id": "000730",
  "amount": 400.00,
  "discount_amount": 40.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Counter",
  "made_unpaid_at": "2026-11-12T14:30:00",
  "discount_time": "2026-11-12T15:00:00",
  "gap_minutes": 30,
  "unpaid_count": 1,
  "order_status_at_discount": "paid",
  "operation": "remove"
}
```

---

### KPI Counts (NEW-1)

Return in `audits` object alongside existing counts:

| Field | Type | Description |
|-------|------|-------------|
| `discount_apply_after_unpaid_count` | integer | Total `discount_apply_after_unpaid` events (includes replace-apply) |
| `discount_remove_after_unpaid_count` | integer | Total `discount_remove_after_unpaid` events (includes replace-remove) |

**Note:** A replace operation increments BOTH counts by 1 (same as CR-546).

---

### Relationship to Existing CR-546 (Discount After Print)

A single discount event can trigger BOTH `discount_*_after_print` (CR-546) AND `discount_*_after_unpaid` (this ask) if the order was unpaid AND the bill was printed. This is intentional — Approach C overlap. Frontend handles the multi-category display.

**Backend does NOT need to deduplicate.** Emit both event types independently. Each has its own trigger condition:
- CR-546: `discount_time > bill_printed_at`
- NEW-1: `discount_time > first_make_unpaid_at`

---

---

## NEW-2: Re-pay Gap Event

### Summary

When an order was paid → made unpaid → items cancelled and/or discounts changed → then re-collected at a lower amount, the **gap = stolen money**. This event shows the ₹ difference and breaks it down by cause (cancellation vs discount).

**Priority:** P1 — design and plan now, implement when ready. Frontend will show the card structure with a placeholder until this ships.

---

### Detection Rule

```
For each order in the requested date range:

  1. Check: does this order have make_unpaid history AND was subsequently re-paid?
     → If NO: skip
     → If YES: proceed

  2. Compute:
     original_amount = order total at the time of FIRST make_unpaid
                       (what the customer originally paid)
     
     repaid_amount = order total at the time of re-payment
                     (what was collected the second time)
     
     gap_amount = original_amount - repaid_amount
     
     IF gap_amount <= 0: skip (no leakage — order total same or higher)

  3. Break down the gap:
     gap_from_cancellations = sum of cancelled item amounts 
                              WHERE cancel_time > first_make_unpaid_at
                              AND cancel_time <= repaid_at
     
     gap_from_discounts = sum of net discount changes (applied - removed in ₹)
                          WHERE discount_time > first_make_unpaid_at
                          AND discount_time <= repaid_at

  4. Emit repay_gap event

  NOTES:
  - If order was made unpaid multiple times, use FIRST make_unpaid_at and 
    LAST repaid_at for the window
  - gap_from_cancellations + gap_from_discounts should equal gap_amount
    (there are no other reasons for the gap)
  - If rounding causes a small mismatch, attribute the remainder to cancellations
  - Only emit if gap_amount > 0 (re-paid at a lower amount)
```

---

### Event Schema

#### Event type: `repay_gap`

```json
{
  "type": "repay_gap",
  "order_id": "000680",
  "original_amount": 680.00,
  "repaid_amount": 463.00,
  "gap_amount": 217.00,
  "gap_from_cancellations": 149.00,
  "gap_from_discounts": 68.00,
  "made_unpaid_at": "2026-11-10T21:08:00",
  "repaid_at": "2026-11-13T10:00:00",
  "unpaid_count": 3
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | YES | Always `"repay_gap"` |
| `order_id` | string | YES | Order ID (preserve leading zeros) |
| `original_amount` | number | YES | Order total at time of first `make_unpaid` (₹) — what customer originally paid |
| `repaid_amount` | number | YES | Order total at time of re-payment (₹) — what was re-collected |
| `gap_amount` | number | YES | `original_amount - repaid_amount` (₹) — the leaked money |
| `gap_from_cancellations` | number | YES | ₹ portion of gap caused by item cancellations between unpaid and re-pay |
| `gap_from_discounts` | number | YES | ₹ portion of gap caused by discount changes between unpaid and re-pay |
| `made_unpaid_at` | datetime | YES | Timestamp of FIRST `make_unpaid` event |
| `repaid_at` | datetime | YES | Timestamp of re-payment |
| `unpaid_count` | integer | YES | Total number of times this order was made unpaid |

### Invariant

```
gap_amount = gap_from_cancellations + gap_from_discounts
```

There are no other possible reasons for the gap. If order total changed, it was because items were cancelled or discounts were changed. No other operation changes the total between unpaid and re-pay.

---

### Examples

#### Example 1 — Gap from cancellation only

```
Timeline:
  21:00 — Order #000680 placed: Paneer Tikka ₹350 + Naan ₹60 + Gulab Jamun ₹149 = ₹559
  21:05 — Customer pays ₹559
  21:08 — Cashier marks unpaid
  21:23 (+2 days) — Cashier cancels Gulab Jamun (₹149)
  10:00 (+3 days) — Manager re-collects payment: ₹410
```

```json
{
  "type": "repay_gap",
  "order_id": "000680",
  "original_amount": 559.00,
  "repaid_amount": 410.00,
  "gap_amount": 149.00,
  "gap_from_cancellations": 149.00,
  "gap_from_discounts": 0.00,
  "made_unpaid_at": "2026-11-10T21:08:00",
  "repaid_at": "2026-11-13T10:00:00",
  "unpaid_count": 1
}
```

#### Example 2 — Gap from both cancellation and discount

```
Timeline:
  14:00 — Order #000715 placed: ₹500, no discount, paid
  14:30 — make_unpaid (1st)
  14:40 — make_unpaid (2nd)
  14:45 — Cashier cancels 1 item (₹80)
  14:50 — Manager applies 10% discount (₹42 on remaining ₹420)
  15:30 — Re-collects: ₹378 (₹420 - ₹42 discount)
```

```json
{
  "type": "repay_gap",
  "order_id": "000715",
  "original_amount": 500.00,
  "repaid_amount": 378.00,
  "gap_amount": 122.00,
  "gap_from_cancellations": 80.00,
  "gap_from_discounts": 42.00,
  "made_unpaid_at": "2026-11-12T14:30:00",
  "repaid_at": "2026-11-12T15:30:00",
  "unpaid_count": 2
}
```

#### Example 3 — Gap from discount only (no cancellation)

```
Timeline:
  18:00 — Order #000730 placed: ₹400, no discount, paid
  18:15 — make_unpaid
  18:20 — Manager applies ₹100 fixed discount
  19:00 — Re-collects: ₹300
```

```json
{
  "type": "repay_gap",
  "order_id": "000730",
  "original_amount": 400.00,
  "repaid_amount": 300.00,
  "gap_amount": 100.00,
  "gap_from_cancellations": 0.00,
  "gap_from_discounts": 100.00,
  "made_unpaid_at": "2026-11-12T18:15:00",
  "repaid_at": "2026-11-12T19:00:00",
  "unpaid_count": 1
}
```

---

### KPI Count (NEW-2)

| Field | Type | Description |
|-------|------|-------------|
| `repay_gap_count` | integer | Number of orders with a positive re-pay gap |
| `repay_gap_total` | number | Sum of all `gap_amount` values (₹ — total leaked money) |

---

### Edge Cases

| Scenario | Handling |
|----------|---------|
| Order made unpaid but never re-paid | No `repay_gap` event (re-pay didn't happen) |
| Order re-paid at same or higher amount | No event (`gap_amount ≤ 0`) |
| Multiple unpaid/re-pay cycles on same order | Use FIRST `make_unpaid_at` and LAST `repaid_at`; compute gap across the full window |
| Cancellation + discount applied, but then discount removed before re-pay | Net discount change may be 0 → `gap_from_discounts: 0`, gap is only from cancellation |
| Order cancelled entirely and never re-paid | No `repay_gap` event (covered by `cancel_after_unpaid` already) |

---

---

## Combined KPI Counts — Full CR-544 Scope (v2 + v3)

Return in `audits` object:

| Field | Source | Status |
|-------|--------|--------|
| `cancel_after_unpaid_count` | v2 (original) | ✅ DELIVERED |
| `discount_apply_after_unpaid_count` | v3 NEW-1 | ⭐ NEW |
| `discount_remove_after_unpaid_count` | v3 NEW-1 | ⭐ NEW |
| `repay_gap_count` | v3 NEW-2 | ⭐ NEW |
| `repay_gap_total` | v3 NEW-2 | ⭐ NEW |

---

## Backward Compatibility

- Additive only — no breaking changes to v2 events
- Existing `cancel_after_unpaid` events unchanged
- Existing CR-543 and CR-546 events unchanged
- Same endpoint, same response structure
- New fields appear ONLY in new event types

---

## Data Availability

All data sources already used by existing CR-544 and CR-546 logic:

| Data | Source | Already Used By |
|------|--------|----------------|
| `make_unpaid` operations + timestamps | `operations` log | CR-544 v2 |
| Discount apply/remove operations + timestamps | `operations` log or discount history | CR-546 v2 |
| Payment status at point in time | Payment history | CR-544 v2 (`order_status_at_cancel`) |
| Order total at point in time | Order history / snapshots | Existing |
| `discount_type`, `discount_value`, `discount_amount` | Discount records | CR-546 v2 |

**No new data sources required** — everything is a cross-reference of data already accessed by delivered CRs.

---

## Validation Checklist for Gyan

### NEW-1: Discount After Unpaid
```
□ Detection uses FIRST make_unpaid_at (same rule as cancel_after_unpaid)
□ Re-payment does NOT close the window (same rule as cancel_after_unpaid)
□ No time limit on gap
□ All 3 discount flows detected: apply, remove, replace
□ Replace emits 2 events (remove old + apply new), both with operation="replace"
□ Standalone apply has operation="apply", standalone remove has operation="remove"
□ discount_type is "percent" or "fixed" only (same as CR-546)
□ discount_amount is actual ₹ value, discount_value is raw input
□ gap_minutes = floor((discount_time - made_unpaid_at) / 60)
□ unpaid_count counts all make_unpaid operations on the order
□ order_status_at_discount reflects payment status at moment of discount change
□ KPI counts: replace increments BOTH apply and remove counts
□ Overlap with CR-546 is OK — emit both event types independently
□ Existing cancel_after_unpaid events unchanged
```

### NEW-2: Re-pay Gap
```
□ Only emitted when gap_amount > 0 (re-paid at lower amount)
□ original_amount = order total at time of FIRST make_unpaid
□ repaid_amount = order total at time of re-payment
□ gap_amount = original_amount - repaid_amount
□ gap_from_cancellations + gap_from_discounts = gap_amount (invariant)
□ Only counts cancellations/discounts in the window (after unpaid, before re-pay)
□ No event if order never re-paid
□ No event if re-paid at same or higher amount
□ Multiple unpaid/re-pay cycles: use FIRST unpaid, LAST re-pay
□ repay_gap_count and repay_gap_total KPIs returned
```

---

*End of CR-544 v3 addendum. Ref: AUDIT_REPORT_DESIGN_DECISIONS_LOCKED_2026_11_17.md, D14–D19.*
