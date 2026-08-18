# INVESTIGATION REPORT — Order Entry: Default Walk-In + Pre-Place Table Switch Cart Reset

**ID:** INV-OE-001
**Date:** 2026-08-17
**Role:** INVESTIGATION
**Status:** COMPLETE — root cause confirmed for both issues
**No code written this session.**

---

## Scope

Two owner-raised UX issues in Order Entry:
1. New order always opens as Walk-In — extra click needed to switch to Table or Delivery
2. Changing table on a new (pre-place) order clears the food cart — items should follow the table change

---

## Issue 1 — Default Walk-In on New Order

### Trace

**`DashboardPage.jsx` line 1463:**
```js
const handleAddOrder = () => {
  setOrderEntryTable(null);
  setOrderEntryType("walkIn");   // ← hardcoded Walk-In every time
};
```

When any staff clicks the new-order FAB / "Add Order" button, the type is **always set to `"walkIn"`** regardless of:
- What the restaurant primarily does (table service, delivery-only, QSR)
- What the staff member was last doing
- What tab/view they're currently on

**`handleTableClick` by contrast** correctly infers type from context:
```js
if (tableEntry.orderType === 'takeAway') setOrderEntryType('takeAway');
else if (tableEntry.orderType === 'delivery') setOrderEntryType('delivery');
else if (tableEntry.orderType === 'dineIn') setOrderEntryType('dineIn');
else setOrderEntryType('walkIn');   // ← walk-ins only
```
This is correct — but only fires when clicking an existing order/table card.

**QSR mode precedent:** `utils/qsrModePrefs.js` already uses `localStorage` to persist a user-mode preference. No equivalent exists for default order type.

### Root Cause

`handleAddOrder()` is hardcoded to `"walkIn"`. There is no:
- Persistent user preference for default order type
- Restaurant-level configuration for default type
- Context-awareness (e.g., if dine-in view is active, default to dineIn)

### Recommendations — Issue 1

**Option A (Recommended): Remember last-used order type (localStorage)**
- When staff changes order type inside OrderEntry, persist to `localStorage` key `mygenie_default_order_type`
- `handleAddOrder()` reads this key; defaults to `"walkIn"` only if no preference set
- Pattern already exists: `qsrModePrefs.js`, `autoSettlePrefs.js`, `weightEntryPrefs.js`
- Cost: ~5 lines. Zero risk to existing flows.

**Option B: Restaurant-level default order type (General Settings)**
- Add a "Default Order Type" selector in General Settings (walkIn / dineIn / takeAway / delivery)
- Pulled from restaurant profile on load
- Larger change but owner-configurable per outlet

**Option C: Context-aware default (tab-based)**
- If Dashboard is on the Table View tab → default to `dineIn`
- If on Delivery tab → default to `delivery`
- Medium complexity; requires Dashboard view state to be readable by `handleAddOrder`

**Option D: Multi-button FAB (visual picker)**
- Replace single "+ New Order" with a small icon-menu: Table | Walk-In | Takeaway | Delivery
- One tap goes directly to the right type
- Zero confusion; no extra click

**Verdict:** Option A is the fastest, safest fix. Option D is the best long-term UX. Both can coexist.

---

## Issue 2 — Table Change Clears Cart (Pre-Place)

### Trace

**`OrderEntry.jsx` — cart save/restore effect (lines 353–430):**
```js
// Key = table ID for table orders, orderType for walk-in/delivery
const newKey = table?.id || orderType;
const oldKey = cartKeyRef.current;

// Step 1: Save OLD table's cart
if (oldKey && oldKey !== newKey) {
  onCartChange?.(oldKey, cartItems);   // Table 1's cart is saved
}
cartKeyRef.current = newKey;

// Step 2: Restore NEW table's cart
if (savedCart && savedCart.length > 0) {
  setCartItems(savedCart);             // Uses Table 2's savedCart
} else if (orderData) {
  // ... restore from API orderData
} else {
  setCartItems([]);                    // ← Table 2 has no savedCart → EMPTY CART
}
```

**When a waiter on Table 1 (new unplaced order) switches to Table 2:**
1. Table 1's cart is saved → food stays with `key = tableId_of_Table_1`
2. Table 2 has no `savedCart` and no `orderData` (new, empty table)
3. `setCartItems([])` fires → **cart is wiped**
4. Waiter has to re-add all items for Table 2

### Root Cause

The cart save/restore logic treats **all table switches identically** — whether switching between two *placed orders* (correct: load that table's existing order) or switching the table assignment on a *new unplaced order* (wrong: food should follow, not be cleared).

The distinguishing signal is already available: `orderData` is `null` on a new order (no placed order exists yet) and non-null when opening an existing placed order.

### Current Behavior vs Expected

| Scenario | Current | Expected |
|----------|---------|----------|
| Open Table 2 (has existing placed order) | Load Table 2's items from `orderData` | ✅ Correct |
| Switch Table 1→2 (new unplaced order, Table 2 empty) | Clear cart (Table 2 has no items) | ❌ Wrong — carry cart items over |
| Switch Table 1→2 (Table 2 already has a placed order) | Load Table 2's placed items | ✅ Correct |

### Recommendation — Issue 2

**Fix: In the save/restore effect, check if it's a new order before clearing:**

```js
// Current (buggy for new orders):
} else {
  setCartItems([]);
}

// Fixed: only clear if switching to a table that HAS a placed order
// (orderData present), OR if there's an explicit savedCart.
// For new orders switching table — keep current cartItems.
} else if (!orderData) {
  // New unplaced order — keep current cartItems; only table destination changes
  // setCartItems([]);  ← remove this
} else {
  setCartItems([]);   // Placed order on new table with no items — correct to clear
}
```

**Additional consideration:** When carrying items to Table 2 and Table 2 already has a `savedCart` (staff was building an order for it earlier), should the carts merge or should Table 2's cart take priority? **Owner decision needed.**

**Risk:** LOW-MEDIUM — only affects pre-place table switch. Post-place table shift via `handleShift` / `ORDER_TABLE_SWITCH` API is completely separate code path and is unaffected.

---

## Summary Table

| Issue | Root Cause | File | Fix Complexity | Risk |
|-------|-----------|------|----------------|------|
| Walk-In default | `handleAddOrder()` hardcoded to `"walkIn"` | `DashboardPage.jsx` | LOW (localStorage pref ~5 lines + Option D) | LOW |
| Cart clears on table switch | Save/restore effect clears cart when new table has no savedCart, regardless of whether it's a new order | `OrderEntry.jsx` | LOW-MEDIUM (~3 lines + condition check) | LOW-MEDIUM |

---

## Open Questions for Owner

| # | Question | Issue |
|---|----------|-------|
| OQ-1 | For default order type: Option A (remember last used) or Option D (multi-button FAB), or both? | Issue 1 |
| OQ-2 | Should a restaurant-level default be configurable in General Settings? | Issue 1 |
| OQ-3 | When carrying cart items to a new table that already had a partial saved cart — merge both, or keep the in-hand cart? | Issue 2 |

---

## Recommended Next Steps

- Register **BUG-333**: Default Walk-In on new order (`handleAddOrder` hardcoded)
- Register **BUG-334**: Pre-place table switch clears cart (`OrderEntry` save/restore logic)
- Both are LOW-MEDIUM risk, small code changes — **Fast Lane eligible** (owner approval needed)

---

*Investigation complete. No code written.*
