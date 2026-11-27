# BUG-470 — Waiter Role Can Edit Orders Despite Missing Permission — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — permission bypass; waiter modifies orders they should not |
| Risk | HIGH — permission/access control |
| Area | Permissions / Order Entry / OrderEntry.jsx |
| Duplicate check | DISTINCT (related: CR-396 — separate scoped permission feature) |
| Code reality | **CONFIRMED FE_BUG** — no edit_order permission gate exists in OrderEntry.jsx |
| Fast Lane | ELIGIBLE (pending owner confirming permission key name) |

---

## Description

A waiter user **without edit order permission** is still able to **add/remove items and change quantities** in an existing order. The permission check for order editing is **missing** from `OrderEntry.jsx`.

---

## Code Evidence

```javascript
// OrderEntry.jsx L327-335 — ALL currently defined permission guards:
const canCancelOrder   = hasPermission('order_cancel');
const canCancelItem    = hasPermission('food');
const canShiftTable    = hasPermission('transfer_table');
const canMergeOrder    = hasPermission('merge_table');
const canFoodTransfer  = hasPermission('food_transfer');
const canCustomerManage= hasPermission('customer_management');
const canBill          = hasPermission('bill');
const canDiscount      = hasPermission('discount');
const canPrintBill     = hasPermission('print_icon');

// ❌ MISSING: no permission check for edit order / add item / change qty
// updateQuantity() and add-to-cart are ungated
```

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED + AGENT-DISCOVERED (code confirmed) |
| Screenshot | Not provided |
| Confidence | CONFIRMED — missing gate verified in code |

---

## Blast Radius

- Files: `OrderEntry.jsx` (R5 hotspot — HIGH caution required)
- Scope: SMALL (add permission guard to qty +/- and add-item handlers)
- Hotspot: YES — OrderEntry.jsx is R5

---

## Open Questions — OWNER WILL ANSWER LATER

- **OD-470-01 (BLOCKER for Planning):** What is the exact permission key name for edit order? Options: `edit_order`, `order_edit`, `update_order`, `modify_order`? Please confirm the backend/role permission key.
- OD-470-02: Should edit be blocked entirely for waiter, or only for specific order states (e.g. after KOT printed)?
- OD-470-03: Should quantity reduce (remove item) also be blocked, or only adding new items?

---

## Next Step

Owner answers OD-470-01 (permission key name) → **Planning skip eligible** (1 file, ~5 lines, LOW risk guard addition). Gate 4 GO after owner confirms.
