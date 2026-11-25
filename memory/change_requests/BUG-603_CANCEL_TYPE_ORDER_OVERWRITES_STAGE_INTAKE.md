# BUG-603 — Intake (Gate 1)
## cancel_type="Order" overwrites real item kitchen stage

**ID:** BUG-603
**Type:** BUG
**Date:** 2026-10-21
**Sprint:** nov_cr_batch
**Area:** Reports / Analytics
**Priority:** P1
**Risk:** MEDIUM
**Source:** INVESTIGATION (BUG-579 6-month probe)
**Duplicate check:** DISTINCT (related BUG-579)
**Status:** GATE_1_INTAKE_BACKEND_BLOCKED

---

## Description
When a full order is cancelled, the backend sets `cancel_type: "Order"` on every item in the order — losing the item's actual kitchen stage (preparing/serve/ready). The `scope: "order"` field already tells us it was a full-order cancel; `cancel_type` should record where each item was in the kitchen pipeline.

## Evidence (6 months, Apr–Oct 2026)
- Palm House: 39 items with `cancel_type: "Order"`, all `scope: "order"`
- Pav2: 18 items with `cancel_type: "Order"`, all `scope: "order"`

## Impact
Cancellation report "Before Cooking" / "Before Serving" / "After Serving" stage breakdown is inaccurate — these items fall into an "Order" bucket that provides no waste-level insight.

## Next
Backend should record each item's actual kitchen stage from `food_status` at cancellation time, regardless of order-level vs item-level cancel.
