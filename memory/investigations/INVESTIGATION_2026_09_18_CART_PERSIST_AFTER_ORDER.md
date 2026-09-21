# INVESTIGATION REPORT — Stale Cart Items (Intermittent) — REVISED

**ID:** INV-CART-PERSIST-001  
**Date:** 2026-09-18  
**Role:** INVESTIGATION (ALPHA v0.7)  
**Triggered by:** Owner — "sometimes after placing order and clicking Add again, old items still show in cart. Happens very rarely."  
**Steps used:** 10 / 10  
**Revised:** Yes — initial hypothesis H1 was too broad and corrected after owner challenge (see §7)

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | `cartsByTable[key]` in DashboardPage is written with stale items when the cashier **switches order type** (Walk-in → TakeAway/Delivery) OR **switches tables** (clicks Table B while Table A is open) mid-build. These two paths keep OrderEntry **mounted** — triggering `onCartChange(oldKey, cartItems)` with live (unplaced) cart items. On next open of the same key, `savedCart.length > 0` restores the stale items. |
| Classification | **FE_BUG** |
| Confidence | **HIGH** — exact triggers identified, mount/unmount behaviour confirmed |
| Why intermittent | Triggered only by order type switch or mid-session table switch — both are rare cashier actions. Straight-through order flow never triggers it (clean unmount path). |
| Risk | **MEDIUM** |
| Planning skip eligible | **NO** — fix is in `OrderEntry.jsx` (R5 hotspot) and `DashboardPage.jsx` |
| Steps used | 10 / 10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|---|---|---|
| H1 (initial) | `placeOrder` → close → `onCartChange` writes stale items on every unmount | Trace unmount path: `handleCloseOrderEntry` → `setOrderEntryType(null)` → `{orderEntryType &&}` = false → UNMOUNT | **ELIMINATED** — component unmounts; useEffect body does NOT run on unmount; `onCartChange` never called on normal close |
| H2 | Cart persisted in `localStorage` | grep `localStorage.*cart` entire src | **ELIMINATED** — no localStorage cart |
| H3 | Order type switch mid-build keeps component mounted and triggers `onCartChange` | Trace `handleOrderTypeChange` → `setOrderEntryType(newType)` (non-null) → mounted → useEffect fires | **CONFIRMED — TRIGGER 1** |
| H4 | Table switch mid-build keeps component mounted and triggers `onCartChange` | Trace `handleTableClick` → `setOrderEntryTable(tableB)` → mounted → useEffect fires | **CONFIRMED — TRIGGER 2** |

---

## 3. Why Normal Close Does NOT Cause the Bug (defending intermittency)

```
handleCloseOrderEntry()
  → setOrderEntryTable(null)  ┐ React batches these
  → setOrderEntryType(null)   ┘ into ONE render

DashboardPage re-renders:
  {orderEntryType && (<OrderEntry .../>)}
  ↑ orderEntryType = null → condition FALSE → OrderEntry UNMOUNTS

React unmount sequence:
  → runs useEffect CLEANUP functions only
  → useEffect BODY does NOT fire with new null prop values
  → onCartChange is NEVER called
  → cartsByTable NOT written
  → clean slate on next open ✅
```

---

## 4. Trigger 1 — Order Type Switch Mid-Build

```
1. Cashier clicks Add → orderEntryType = "walkIn" → OrderEntry MOUNTS
2. Cashier adds item1, item2 to cart
   (cartItems = [item1, item2], cartsByTable["walkIn"] = still empty)
3. Cashier switches type to TakeAway via OrderEntry dropdown
     → handleOrderTypeChange("takeAway") in DashboardPage
     → setOrderEntryType("takeAway")      ← NOT null
     → OrderEntry stays MOUNTED, orderType prop changes
4. useEffect([table?.id, orderType]) fires:
     oldKey = "walkIn"   newKey = "takeAway"
     oldKey !== newKey → onCartChange("walkIn", [item1, item2])
     → cartsByTable["walkIn"] = [item1, item2]   ← STALE WRITE
5. Component now in TakeAway mode with empty cart
6. Cashier exits (handleCloseOrderEntry → null → UNMOUNT)
   cartsByTable still has: { "walkIn": [item1, item2] }

7. Next cashier clicks Add:
   orderEntryType = null → "walkIn" → fresh MOUNT
   savedCart = cartsByTable["walkIn"] = [item1, item2]
   useEffect: savedCart.length > 0 → setCartItems([item1, item2])
   → BUG: stale items appear ❌
```

**Frequency:** Any cashier who changes order type mid-build without completing the order.

---

## 5. Trigger 2 — Table Switch Mid-Build (Dashboard grid click)

```
1. Cashier opens Table A → OrderEntry MOUNTS (orderType="dineIn", table=tableA)
2. Cashier adds item1 to cart
   (cartItems = [item1], cartsByTable["tableA_id"] = still empty)
3. Cashier clicks Table B on the dashboard grid while OrderEntry is open
     → handleTableClick(tableB) in DashboardPage
     → setOrderEntryTable(tableB)    ← component stays MOUNTED
     → setOrderEntryType("dineIn")   ← same type, but table changes
4. useEffect([table?.id, orderType]) fires:
     oldKey = "tableA_id"   newKey = "tableB_id"
     oldKey !== newKey → onCartChange("tableA_id", [item1])
     → cartsByTable["tableA_id"] = [item1]   ← STALE WRITE
5. Component now shows Table B
6. Cashier abandons, exits → UNMOUNT
   cartsByTable still has: { "tableA_id": [item1] }

7. Next open of Table A:
   savedCart = cartsByTable["tableA_id"] = [item1]
   → BUG: stale items appear ❌
```

**Frequency:** Any cashier who clicks a different table while already inside an order, without completing the first.

---

## 6. Data Flow — The Persistence Mechanism

```
DashboardPage (stays alive for full session):
  const [cartsByTable, setCartsByTable] = useState({})
                        ↑
                 NEVER cleared on close/remount
                 Only cleared by handleCollectBillStayOnOrder ← only one safe path

OrderEntry:
  savedCart prop = cartsByTable[key] || []     ← read on mount
  onCartChange callback = updates cartsByTable ← write on key change

Write triggers (component MOUNTED, key changes):
  1. handleOrderTypeChange(newType) — "walkIn"→"delivery" etc.
  2. handleTableClick(tableB) — table.id changes

Non-triggers (component UNMOUNTS — useEffect body skipped):
  3. handleCloseOrderEntry() — setOrderEntryType(null) → unmount ✅
  4. navigateAfterOrderAction() → onClose() → handleCloseOrderEntry ✅
```

---

## 7. Why Initial H1 Was Wrong and Owner Challenge Was Correct

Initial claim: "`placeOrder` writes stale items on every close."  
**Why wrong:** On successful `placeOrder`, `navigateAfterOrderAction()` → `onClose()` → `handleCloseOrderEntry()` → `setOrderEntryType(null)` → UNMOUNT. React does not re-run the useEffect body during unmount. `onCartChange` is never called. The initial H1 would have predicted the bug on every single order — contradicting owner's "very less" observation.

**Corrected root cause:** The stale write only happens during a KEY CHANGE while the component remains mounted. This is a rare but valid cashier workflow (type switch, table switch mid-build).

---

## 8. Evidence References

```
DashboardPage.jsx:2059      {orderEntryType && (<OrderEntry.../>)}  ← unmount gate
DashboardPage.jsx:1504-1511 handleOrderTypeChange — sets non-null type → stays mounted
DashboardPage.jsx:1462-1497 handleTableClick — sets new table → stays mounted
DashboardPage.jsx:1513-1520 handleCloseOrderEntry — sets null → UNMOUNTS
DashboardPage.jsx:2069-2070 savedCart + onCartChange props
OrderEntry.jsx:378-391      useEffect — saves oldKey cart when key changes, restores savedCart
OrderEntry.jsx:384-386      onCartChange(oldKey, cartItems) — THE WRITE
```

---

## 9. Recommendations

### Fix
The `cartsByTable` entry should be cleared when:
- Cashier **completes** a type switch (don't carry unplaced items to new type)
- Cashier **abandons** a partial build (clear on explicit close without placing)

**Option A (minimal — recommended):** In `handleOrderTypeChange`, explicitly clear the old key before switching:
```
File:   DashboardPage.jsx
Where:  handleOrderTypeChange (line 1504) — add clear before setOrderEntryType
What:   setCartsByTable(prev => { const {[oldKey]:_, ...rest} = prev; return rest; })
Risk:   LOW — DashboardPage, not R5
```

**Option B (comprehensive):** In `handleCloseOrderEntry`, clear `cartsByTable[key]` the same way `handleCollectBillStayOnOrder` does (line 1540). This covers all close paths including user pressing X mid-build. Trade-off: loses the "resume mid-build" feature entirely.

**Option C (selective — best UX):** Only clear `cartsByTable[key]` when close follows a successful order placement. Pass a `didPlaceOrder` flag from OrderEntry to the close handler.

### Planning skip eligibility
| Criterion | Option A | Option B | Option C |
|---|---|---|---|
| ≤ 10 lines | YES | YES | YES |
| 1 file | YES (DashboardPage only) | YES | NO (2 files) |
| Not hotspot R5 | YES (DashboardPage not R5) | YES | NO (OrderEntry = R5) |
| Not financial | YES | YES | YES |
| **Skip eligible** | **YES — owner must approve** | **YES — owner must approve** | **NO** |

**Option A is planning-skip-eligible.** Still requires owner approval per OWNER APPROVAL MATRIX.

---

## 10. Owner Decisions Needed

| # | Decision | Options |
|---|---|---|
| OD-1 | Fix scope: which trigger to fix? | A: type switch only · B: all closes · C: close after placement only |
| OD-2 | Should mid-build cart resume (carrying items when switching type) remain as a feature for dine-in table switches? | YES (keep for tables only) · NO (always clear) |

---

```
Root cause:    FE_BUG — cartsByTable[key] written with stale unplaced items
               during order-type switch or table switch (component stays mounted).
               Normal close (unmount path) does NOT trigger the write.
Classification: FE_BUG
Confidence:    HIGH
Why intermittent: Only Trigger 1 (type switch) or Trigger 2 (table switch mid-build) cause it.
                  Straight-through order flow never hits this path.
Fix scope:     DashboardPage.jsx (not R5) — Option A is planning-skip eligible
Planning skip: YES for Option A (owner approval required)
               NO for Option C (R5 touch)
Owner decisions: OD-1 (scope) + OD-2 (resume feature)
Report:        /app/memory/investigations/INVESTIGATION_2026_09_18_CART_PERSIST_AFTER_ORDER.md
```
