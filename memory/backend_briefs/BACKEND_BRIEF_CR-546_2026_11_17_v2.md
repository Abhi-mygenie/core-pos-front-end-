# BACKEND_BRIEF_CR-546 — v2 (Revised after Backend Feedback)

**Supersedes:** `BACKEND_BRIEF_CR-546_2026_11_17.md` (v1)
**Revision reason:** Backend feedback — discount flow definitions, replace semantics, discount_type terminology mismatch
**Date:** 2026-11-17
**Priority:** P0 / HIGH
**Assigned to:** Gyan

---

## Changes from v1

| # | What Changed | v1 | v2 |
|---|---|---|---|
| C1 | Discount flows covered | "apply" and "remove" (replace not addressed) | **3 flows: apply, remove, replace** |
| C2 | Replace semantics | Not specified | **Replace = 2 events** (remove old + apply new) with `operation` linking field |
| C3 | `discount_type` values | `"percent"` / `"flat"` / `"preset"` | **`"percent"` / `"fixed"`** only (matches existing backend terminology) |
| C4 | `operation` field | Did not exist | **NEW** — `"apply"` / `"remove"` / `"replace"` per event |
| C5 | Preset handling | Listed as third `discount_type` | **Deferred to V2** — presets resolve to percent/fixed when applied |

---

## Summary

- **Issue:** No audit events for discount applied/removed after bill print
- **Classification:** NEW_FEATURE (fraud detection — post-print bill manipulation)
- **Frontend impact:** Order Edit Audit page needs discount-after-print event types
- **Priority/Risk:** P0 / HIGH

---

## Endpoint

- **Method:** POST
- **URL:** `/api/v2/vendoremployee/report/insights-dashboard`
- **Auth:** Bearer token
- **Response section:** `audits.orders[]` (2 new event types) + `audits` (2 new KPI counts)

---

## Three Discount Flows (FINAL — v2)

All 3 flows are auditable when they happen AFTER `bill_printed_at`:

| # | Flow | What Happens | Events Emitted |
|---|------|-------------|----------------|
| 1 | **Apply** | No discount → discount added | 1× `discount_apply_after_print` with `operation: "apply"` |
| 2 | **Remove** | Discount → no discount | 1× `discount_remove_after_print` with `operation: "remove"` |
| 3 | **Replace** | Discount A → Discount B | 2× events: `discount_remove_after_print` (old, `operation: "replace"`) + `discount_apply_after_print` (new, `operation: "replace"`) |

### Why Replace = 2 Events:

- Audit needs to show BOTH old and new values
- Timeline is clear: "Manager removed 10% at 14:15, then applied ₹50 flat at 14:15"
- KPI counts stay simple: both counters increment by 1 for a replace
- Matches internal DB operations (replace IS remove + apply)
- The `operation: "replace"` field on BOTH events links them together

---

## Detection Rule (FINAL — v2)

```
For each order in the requested date range:

  1. Check: does this order have bill_printed_at IS NOT NULL?
     → If NO: skip this order
     → If YES: proceed

  2. Scan discount operations on this order:

     CASE: Discount applied (no prior discount):
       IF discount_applied_at > bill_printed_at:
         → Emit discount_apply_after_print with operation="apply"

     CASE: Discount removed (discount → no discount):
       IF discount_removed_at > bill_printed_at:
         → Emit discount_remove_after_print with operation="remove"

     CASE: Discount replaced (discount A → discount B):
       IF replace_at > bill_printed_at:
         → Emit discount_remove_after_print with OLD discount values, operation="replace"
         → Emit discount_apply_after_print with NEW discount values, operation="replace"
         → Both events share same order_id + close timestamps
```

---

## Event Schemas (FINAL — v2)

### Event type: `discount_apply_after_print`

```json
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "fixed",
  "discount_value": 50,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00",
  "operation": "apply"
}
```

### Event type: `discount_remove_after_print`

```json
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "fixed",
  "discount_value": 50,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:20:00",
  "operation": "remove"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | YES | `"discount_apply_after_print"` or `"discount_remove_after_print"` |
| `order_id` | string | YES | Order ID (preserve leading zeros) |
| `amount` | number | YES | Order total amount at time of event (₹) |
| `discount_amount` | number | YES | Discount value in ₹ (the actual rupee discount applied/removed) |
| `discount_type` | string | YES | **`"percent"` or `"fixed"`** — the actual discount type (see §below) |
| `discount_value` | number | YES | Raw input value: `10` for 10%, `50` for ₹50 fixed |
| `by` | string | YES | Employee who applied/removed the discount |
| `bill_printed_at` | datetime | YES | When bill was last printed before this change |
| `discount_time` | datetime | YES | When the discount was applied/removed |
| `operation` | string | YES | **NEW v2** — `"apply"` / `"remove"` / `"replace"` |

---

## `discount_type` Values (FINAL — v2)

**Use existing backend terminology. Only 2 values:**

| Value | Meaning | Example |
|-------|---------|--------|
| `"percent"` | Percentage discount | 10% off → `discount_value: 10`, `discount_amount: 35.00` |
| `"fixed"` | Flat rupee amount | ₹50 off → `discount_value: 50`, `discount_amount: 50.00` |

### ~~`"flat"`~~ — REMOVED
v1 used `"flat"` — this was a mistake. The existing discount endpoint uses `"fixed"`. Use `"fixed"` for consistency.

### ~~`"preset"`~~ — DEFERRED to V2
A preset discount is a saved template (e.g., "Staff Meal 20%", "Manager Comp ₹100"). When applied, it resolves to either `"percent"` or `"fixed"`. The underlying type is always one of two.

**V2 (future):** Add optional fields for preset tracking:
- `discount_source`: `"manual"` or `"preset"`
- `discount_preset_name`: Name of preset template (e.g., "Staff Meal 20%")

**V1 (now):** Just use `"percent"` / `"fixed"`. Do not send `"preset"`.

---

## `operation` Field (NEW — v2)

| Value | When | Meaning |
|-------|------|--------|
| `"apply"` | Standalone apply (no prior discount) | New discount added after print |
| `"remove"` | Standalone remove (discount → none) | Existing discount removed after print |
| `"replace"` | Replace (discount A → discount B) | Used on BOTH the remove and apply events of a replace pair |

### How FE uses `operation`:
- `"apply"` / `"remove"` → standalone badge in audit table
- `"replace"` → FE can optionally group the two events (same `order_id` + both `operation: "replace"` + close timestamps) and show a "Replaced" badge instead of separate "Applied"/"Removed"

---

## Examples

### Example 1 — Standalone apply (most common)

```
Timeline:
  14:00 — Order placed, no discount
  14:10 — Bill printed
  14:15 — Manager applies 10% discount
```

→ 1 event:

```json
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 35.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00",
  "operation": "apply"
}
```

### Example 2 — Standalone remove

```
Timeline:
  14:00 — Order placed with 10% discount
  14:10 — Bill printed (with discount)
  14:20 — Manager removes the discount
```

→ 1 event:

```json
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 35.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:20:00",
  "operation": "remove"
}
```

### Example 3 — Replace (10% → ₹50 fixed)

```
Timeline:
  14:00 — Order placed with 10% discount
  14:10 — Bill printed (with 10% discount)
  14:15 — Manager changes discount to ₹50 fixed
```

→ 2 events:

```json
// Event 1: Remove old discount
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 35.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00",
  "operation": "replace"
}

// Event 2: Apply new discount
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "fixed",
  "discount_value": 50,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00",
  "operation": "replace"
}
```

---

## KPI Counts

Return in `audits` object:

| Field | Type | Description |
|-------|------|-------------|
| `discount_apply_after_print_count` | integer | Total `discount_apply_after_print` events (includes replace-apply) |
| `discount_remove_after_print_count` | integer | Total `discount_remove_after_print` events (includes replace-remove) |

**Note:** A replace operation increments BOTH counts by 1. This is intentional — it's both a remove AND an apply.

### `total` update:

`total` should sum all event counts across all types:
`make_unpaid_count + payment_method_change_count + item_cancel_after_print_count + order_cancel_after_print_count + order_edit_after_print_count + discount_apply_after_print_count + discount_remove_after_print_count`

---

## Backward Compatibility

- Additive only — no breaking changes
- Existing 5 event types unchanged
- `total` computation update (additive — adds 2 new counts)
- Same endpoint, same filters
- `discount_type` uses existing backend values (`"percent"` / `"fixed"`) — no new enum values needed

---

## Validation Checklist for Gyan

```
□ All 3 discount flows detected: apply, remove, replace
□ Replace emits 2 events (remove old + apply new)
□ Both replace events have operation="replace"
□ Standalone apply has operation="apply"
□ Standalone remove has operation="remove"
□ discount_type is "percent" or "fixed" only (never "flat" or "preset")
□ discount_amount is the actual ₹ value (not the percentage/input)
□ discount_value is the raw input (10 for 10%, 50 for ₹50)
□ bill_printed_at is the LAST print time before the discount change
□ Detection: discount_time > bill_printed_at
□ KPI counts: replace increments BOTH apply and remove counts
□ total includes all event type counts
□ Existing audit events unchanged
```

---

*End of CR-546 v2 contract. Ref: INV-BATCH-C-BACKEND-FEEDBACK-2026-11-17.md*
