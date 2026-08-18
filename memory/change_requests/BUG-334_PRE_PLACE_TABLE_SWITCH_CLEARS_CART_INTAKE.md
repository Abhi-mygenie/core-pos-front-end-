# BUG-334 — Pre-Place Table Switch Clears Food Cart

**Type:** Bug
**ID:** BUG-334
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-OE-001

---

## Description

When a waiter is building a new order (items added to cart, **not yet placed**) and changes the table — e.g., from Table 1 to Table 2 — the cart is **wiped**. All added items are lost. Only the table label changes; the food disappears.

The waiter must re-add all items from scratch for the new table.

**Expected:** When switching tables on an unplaced new order, the cart items should follow the table change. Only the table destination should update — not the cart contents.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Order Entry → Pre-Place Table Switch |
| Priority | P1 |
| Severity | HIGH — data loss (re-entry required); causes order errors and slows down service |
| Risk | MEDIUM (cart state logic; must not break existing placed-order table switch behavior) |
| Fast Lane | ELIGIBLE — ~3-5 lines change, 1 file, no API change |

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-OE-001)
- Steps to reproduce:
  1. Open new order on Table 1
  2. Add 3-4 food items to cart
  3. Change table to Table 2 (via order type dropdown table picker)
  4. Cart empties — all items gone
- Confirmed in code:
  ```js
  // OrderEntry.jsx — cart save/restore effect (lines 353-430):
  const newKey = table?.id || orderType;
  if (oldKey !== newKey) onCartChange?.(oldKey, cartItems); // saves to Table 1
  cartKeyRef.current = newKey;
  if (savedCart?.length > 0) {
    setCartItems(savedCart);          // Table 2 has no savedCart
  } else if (orderData) {
    // restore from placed order
  } else {
    setCartItems([]);                 // ← TABLE 2 IS NEW → CART WIPED
  }
  ```
- Confidence: CONFIRMED

## Code Reality

```bash
# Bug location:
  OrderEntry.jsx lines 353-430 — cart save/restore useEffect

# The distinguishing signal already available in scope:
  orderData → null for new unplaced orders
  orderData → non-null for tables with existing placed orders

# Fix pattern:
  Add guard: if (!orderData && savedCart.length === 0) → keep cartItems
  (only clear cart when switching to a table that HAS a placed order)
```

- **Code reality: FULL** — bug confirmed, fix is a guard condition addition

## Blast Radius

- Primary: `OrderEntry.jsx` (cart save/restore effect, ~3-5 lines)
- `handleShift` (post-place table switch via `ORDER_TABLE_SWITCH` API) is on a **completely separate code path** — unaffected
- Estimated scope: SMALL (1 file, ~5 lines)

## Expected Behavior

| Scenario | Current | Expected |
|----------|---------|----------|
| Switch table on NEW unplaced order (Table 2 empty) | Cart clears ❌ | Cart items carry over ✅ |
| Switch table on NEW order (Table 2 has prior saved cart) | Load Table 2's cart ✅ | Owner decision: merge or keep in-hand cart |
| Open table with existing PLACED order | Load that order's items ✅ | No change |
| Post-place shift via Shift Table button | API call, redirect ✅ | No change |

## Owner Decisions Needed

1. When switching to a table that already has a **prior saved cart** (staff was building an order for it earlier) — should the carts **merge**, or should the in-hand cart take priority?

## Duplicate Check

DISTINCT

---

**Next:** Planning Gate 2 — Fast Lane eligible (say `FAST LANE APPROVED for BUG-334`)
