# INVESTIGATION REPORT — Stale Cart Items After Order Placement / Navigation

**ID:** INV-CART-PERSIST-001  
**Date:** 2026-09-18  
**Role:** INVESTIGATION (ALPHA v0.7)  
**Triggered by:** Owner — "after placing an order and clicking Add button again, cart still shows previous items. Deep investigation needed — does cart ever remain after order placement or navigating back?"  
**Steps used:** 8 / 10  

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | After a successful `placeOrder`, `cartsByTable[key]` in `DashboardPage` is **never cleared**. The `table.id` prop change on close triggers `onCartChange(oldKey, cartItems)` in OrderEntry — which **writes the stale pre-placed cart back into `cartsByTable`** right before unmount. On next open of the same table/walk-in, `savedCart.length > 0` → stale items restored. |
| Classification | **FE_BUG** |
| Confidence | **HIGH** — full data flow traced end-to-end |
| Risk | **MEDIUM** — affects every successful order placement, walk-in, and delivery order |
| Planning skip eligible | **NO** — fix is inside `OrderEntry.jsx` (R5 hotspot) |
| Steps used | 8 / 10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result |
|---|---|---|---|---|
| H1 | Cart state not cleared after `placeOrder` success → stale items persist in `cartsByTable` | Code trace: `handlePlaceOrder` → `navigateAfterOrderAction` → `handleCloseOrderEntry` | 4–7 | **CONFIRMED — PRIMARY ROOT CAUSE** |
| H2 | Cart persisted in `localStorage` | grep `localStorage.*cart` across entire src | 2 | **ELIMINATED** — no localStorage usage for cart anywhere |
| H3 | Cart lives in a parent that doesn't unmount → survives navigation | Code trace: `cartsByTable` in DashboardPage, `savedCart` prop to OrderEntry | 3–5 | **CONFIRMED (mechanism)** — `cartsByTable` in DashboardPage is the persistence layer |
| H4 | `placeOrder` clears cart on HTTP path but NOT on socket ack path — race condition | Trace `handlePlaceOrder` both paths | 6–7 | **PARTIAL** — neither path calls `setCartItems([])` or `onCartChange(key, [])` |

---

## 3. Full Data Flow Trace — The Bug

```
Step 1: User adds items → cartItems state updated in OrderEntry.jsx:104
        Every item add calls setCartItems() internally.
        onCartChange NOT called on every add — only on table/orderType switch.

Step 2: User clicks Place Order
        handlePlaceOrder (OrderEntry.jsx:978) fires
        → HTTP POST fires (fire-and-forget, line 1141)
        → await waitForTableEngaged(tableId) OR 500ms delay
        → setIsPlacingOrder(false)
        → navigateAfterOrderAction() called                    ← cartItems NEVER cleared

Step 3: navigateAfterOrderAction()
        → onClose() is called
        → DashboardPage: handleCloseOrderEntry() fires (line 1513)
            setOrderEntryTable(null)      ← table prop changes to null
            setOrderEntryType(null)       ← orderType prop changes to null
        ⚠️ NO setCartsByTable clearing here

Step 4: table prop change triggers useEffect in OrderEntry (line 379)
        newKey = null (table is null now)
        oldKey = previous table id (e.g., "5" or "walkIn")
        ──────────────────────────────────────────────────────────────────
        Line 384–386: onCartChange?.(oldKey, cartItems)
        ← cartItems still has ALL the pre-placed items (NEVER cleared)
        ← DashboardPage: setCartsByTable(prev => ({ ...prev, ["5"]: cartItems }))
        ← cartsByTable["5"] = stale unplaced items          ← BUG WRITTEN HERE
        ──────────────────────────────────────────────────────────────────

Step 5: OrderEntry unmounts. cartsByTable["5"] has stale items.

Step 6: User clicks Add or clicks the same table again
        DashboardPage: setOrderEntryTable(tableEntry) or setOrderEntryType("walkIn")
        OrderEntry remounts with:
          savedCart = cartsByTable["5"]   ← stale items from Step 4!
                                          (DashboardPage line 2069)

Step 7: useEffect in OrderEntry fires (line 379)
        savedCart.length > 0 → TRUE
        → setCartItems(savedCart)         ← stale items RESTORED
        → Old items appear in cart        ← BUG VISIBLE TO USER

        Note: savedCart takes PRIORITY over orderData (API items):
          if (savedCart && savedCart.length > 0) {
            setCartItems(savedCart);    ← savedCart wins
          } else if (orderData?.items?.length > 0) { ... }
```

---

## 4. Why `handleCollectBillStayOnOrder` does NOT have this bug

`DashboardPage.jsx:1536–1545` (the "Stay on Order" flow after collecting bill) **explicitly clears the cart** before closing:

```javascript
const handleCollectBillStayOnOrder = () => {
  const cartKey = orderEntryTable?.id || orderEntryType;
  if (cartKey) setCartsByTable(prev => ({ ...prev, [cartKey]: [] })); // ← CART CLEARED ✅
  setOrderEntryTable(null);
  setOrderEntryType('walkIn');
  setOrderEntryResetNonce(n => n + 1);
};
```

But the regular close path `handleCloseOrderEntry` (line 1513) has **no such clearing**:

```javascript
const handleCloseOrderEntry = () => {
  setOrderEntryTable(null);   // ← no cart clear before this
  setOrderEntryType(null);    // ← table change triggers onCartChange(oldKey, staleCart)
  setInitialShowPayment(false);
  setInitialTransferItem(null);
  // ...
};
```

The `onCartChange(oldKey, cartItems)` in the useEffect then writes the stale cart because `cartItems` was never cleared.

---

## 5. Affected Scenarios

| Scenario | Affected? | Why |
|---|---|---|
| New order placed on dine-in table → click same table | ✅ YES | `cartsByTable[tableId]` not cleared |
| New walk-in order placed → click Add | ✅ YES | `cartsByTable["walkIn"]` not cleared |
| TakeAway/Delivery placed → click Add | ✅ YES | `cartsByTable["takeAway"/"delivery"]` not cleared |
| User adds items, navigates away WITHOUT placing | ✅ YES — BY DESIGN | Resume mid-build feature (intentional) |
| Collect Bill → Stay on Order flow | ✅ NO BUG | `handleCollectBillStayOnOrder` clears explicitly |
| Update Order (existing placed order) | LOW RISK | `orderData.items` restored after savedCart; socket sync overrides anyway |

---

## 6. Evidence

All traced via source code — no live API curl needed (pure FE state management bug).

```
Key files:
  OrderEntry.jsx:379–391   — useEffect that saves + restores per-table cart
  OrderEntry.jsx:1139–1168 — handlePlaceOrder success path (no cart clear)
  DashboardPage.jsx:453    — cartsByTable useState
  DashboardPage.jsx:1513   — handleCloseOrderEntry (missing cart clear)
  DashboardPage.jsx:1536   — handleCollectBillStayOnOrder (HAS cart clear — correct)
  DashboardPage.jsx:2069   — savedCart prop passed to OrderEntry
  DashboardPage.jsx:2070   — onCartChange callback that writes to cartsByTable
```

---

## 7. Recommendations

### Fix location
The cleanest fix is in `OrderEntry.jsx` — `handlePlaceOrder` success path — to clear the cart **before** calling `navigateAfterOrderAction()`. This way only a **successful placement** clears the saved cart (preserving the mid-build resume feature for navigating away without placing).

```
File:   src/components/order-entry/OrderEntry.jsx   (R5 hotspot)
Where:  handlePlaceOrder success path, just before navigateAfterOrderAction()
What:   onCartChange?.(cartKeyRef.current, [])   ← clear cartsByTable entry
Risk:   LOW for the change itself; MEDIUM overall due to R5 hotspot
```

An alternative secondary fix in `handleCloseOrderEntry` (DashboardPage) would clear ALL closes, losing the mid-build resume feature — **NOT recommended**.

### Planning skip eligibility
| Criterion | Status |
|---|---|
| ≤ 10 lines | YES — ~1–2 lines |
| 1 file | YES — OrderEntry.jsx only |
| Not hotspot (R5) | **NO — OrderEntry.jsx is R5** |
| Not financial | YES |

**Planning skip: NOT eligible.** Requires full Gate 2 Impact Analysis → Gate 3 Implementation Plan → Gate 4 GO.

---

## 8. Retroactive Candidates

NONE — no registry drift found relating to this.

---

```
Root cause:  FE_BUG — cartsByTable[key] not cleared in placeOrder success path.
             onCartChange(oldKey, cartItems) writes stale items to cartsByTable
             right before OrderEntry unmounts, because cartItems is never cleared
             before navigateAfterOrderAction() is called.
Classification: FE_BUG
Confidence:  HIGH — full trace complete (8/10 steps)
Fix scope:   OrderEntry.jsx (R5 hotspot) — ~1-2 lines before navigateAfterOrderAction()
             DashboardPage.jsx reference only (no change)
Planning skip:  NOT eligible (R5 hotspot)
Recommended path:  Gate 2 Impact Analysis → Gate 3 Plan → Gate 4 GO → Implementation
Owner decision needed:
  OD-1: Should the fix clear ONLY on successful placeOrder, OR on ALL closes?
         Recommended: placeOrder only — preserve mid-build resume feature.
  OD-2: Should updateOrder / collectBill also clear cartsByTable?
         (These have socket-driven setCartItems, so they may be less affected.)
Report: /app/memory/investigations/INVESTIGATION_2026_09_18_CART_PERSIST_AFTER_ORDER.md
```
