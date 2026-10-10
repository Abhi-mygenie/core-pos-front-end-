# BUG-499 — Intake

**ID:** BUG-499
**Date:** 2026-10-06
**Source:** OWNER-REPORTED (INV-497 Point 4 + handover_5.md §4.4)
**Severity:** P1 — CRITICAL
**Risk:** CRITICAL (financial settlement — wrong amounts sent to backend for Both discount)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT (CR-407-B introduced the Both selector; this fixes its implementation)
**Blast radius:** MEDIUM (FolioCheckoutPanel.jsx handlePaid + display)
**Fast Lane eligible:** NO (CRITICAL, financial settlement)

---

## Description

When "Both" (room + F&B) is selected for checkout discount, the frontend currently:
1. Sends `room_discount = full_room_discount_₹` (e.g. 30% of room)
2. Sends `payment_amount = full F&B total` (no food discount subtracted)
3. Does NOT display the F&B discount preview on the left panel

**Backend contract (handover_5.md §4.4):**
> "Both UI tip: UI may show 30%; send **15% food** in F&B fields + **15% room ₹** in room_discount (not 30% on each). Unequal splits OK."

Proved on order 1232889: Both 30% → 15+15 split → `payment_amount=89.25`, `room_discount=₹112.50` (15% of ₹750 room).

**Current code sends wrong amounts:**
- `room_discount = floor(bookingCharge × 30% / 100)` = full room discount (not half)
- `payment_amount = order.amount` = full F&B (no discount)

**Backend 422 risk:** If `room_discount_apply_to=both` but `room_discount` > remaining room balance → backend 422.

---

## Owner Decisions — ALL LOCKED

**OD-499-01:** "Both" = split the % 50/50: food half deducted from `payment_amount`; room half sent as `room_discount`. Unequal splits allowed.
→ **LOCKED** from handover_5.md §4.4 + owner "OD-497-03 - for this check the handover shared"

**OD-499-02:** F&B discount preview must be shown in the Left panel before user clicks Pay (informational display of discounted F&B amounts).
→ **LOCKED** (owner said "why the f&b not getting applied" — implies visible feedback expected)

**Split formula:**
```
food_half  = pct / 2
room_half  = pct / 2
payment_amount = F&B_total × (1 − food_half/100)
room_discount  = baseBalance × (room_half/100)    ← baseBalance from BUG-494/BUG-498
```

---

## Evidence

- **Screenshot:** "Both" selected at 50% — F&B ₹112.35 shown unchanged; no indication food was discounted
- **Code trace:**
  - `FolioCheckoutPanel.jsx` L294-305 handlePaid: `roomDiscountRs = floor(bookingCharge × pct/100)` (full %), `payment_amount` from `collectBillExisting` (no food reduction)
  - Display: `orders.map(o => fmtINR(o.totalAmount))` — raw folio amounts, no discount applied
- **Backend proof (handover_5 §10):** Order 1232889: Both 30% → `payment_amount=89.25` (food after 15%), room cut ₹112.50 (15% of ₹750)
- **Confidence:** HIGH

---

## Fix Scope

| # | File | Site | Change |
|---|------|------|--------|
| E1 | FolioCheckoutPanel.jsx | handlePaid L294-305 | When `roomApplyTo=both`: split pct/2; `room_discount = baseBalance × (pct/2)/100`; reduce `payment_amount` by `F&B_total × (pct/2)/100` |
| E2 | FolioCheckoutPanel.jsx | Statement JSX (F&B sections) | When `roomApplyTo=both`, show "F&B discount: −₹X" line below F&B total |
| E3 | FolioCheckoutPanel.jsx | CollectPaymentPanel `total` prop | Pass `F&B_total_after_food_discount` not raw `order.amount` |

**Note:** F&B total available from `folio.associatedOrders + room orders` — both already rendered. `baseBalance` from BUG-494 already in scope.

---

## Related

- CR-407-B: introduced Both selector (this bug is in its implementation)
- handover_5.md: §4.4 for full backend contract
- Proof orders: 1232889, 1232890, 1232892 (handover_5 §10)

Next: **Gate 2 GO → PLANNING (Impact Analysis)**
