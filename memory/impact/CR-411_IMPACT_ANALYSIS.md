# CR-411 — Impact Analysis (Gate 2)
**Date:** 2026-10-12
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent

---

## Code Reality

**FULL** — BUG-452 nonce-bump fix is active at HEAD in both switch handlers:
- `DashboardPage.jsx` L1491: `setOrderEntryResetNonce(n => n + 1)` inside `handleTableClick`
- `DashboardPage.jsx` L1517: `setOrderEntryResetNonce(n => n + 1)` inside `handleOrderTypeChange`
- `OrderEntry.jsx` L507–509: carry-forward branch explicitly marked unreachable (no-op guard comment)

All three must be changed. No new logic is invented — it is a targeted partial revert of BUG-452.

---

## Conflict Pre-Check

| File | Last modifier | Lines affected by CR-411 | Conflict? |
|------|---------------|--------------------------|-----------|
| `DashboardPage.jsx` | BUG-527 F1 (2026-10-10) L53-56 | L1491, L1517, L1528-1535 | **NONE** |
| `OrderEntry.jsx` | CR-409 (2026-10-11) L1936-1953 | L381-382, L507-509 | **NONE** |

---

## Full Data Flow Trace

### Current (broken) path — BUG-452 in effect

```
Cashier adds items [A, B] to Walk-In cart
  ↓
Switches to TakeAway via header dropdown
  ↓
DashboardPage.handleOrderTypeChange('takeAway')
  → setOrderEntryResetNonce(n => n + 1)        ← WIPES CART (full remount)
  → OrderEntry remounts: cartItems = []          ← items gone
  → savedCart = cartsByTable['takeAway'] = []   ← fresh
  → Cart is empty — items A, B LOST ✗
```

### Fixed path (after CR-411)

```
Cashier adds items [A, B] to Walk-In cart
  ↓
Switches to TakeAway via header dropdown
  ↓
DashboardPage.handleOrderTypeChange('takeAway')
  → NO nonce bump                               ← E-1/E-2: removed
  → setOrderEntryType('takeAway')               ← prop change, NOT remount
  ↓
OrderEntry.useEffect[table?.id, orderType] fires
  → newKey = 'takeAway', oldKey = 'walkIn'
  → onCartChange?.('walkIn', [])               ← E-4: clear old slot (OD-411-01=A)
  → cartKeyRef = 'takeAway'
  → savedCart = cartsByTable['takeAway'] = []  ← new key is empty
  → orderData = null                           ← no placed order
  → else if (oldKey !== null): no-op           ← E-5: items STAY in state ✓
  → cartItems = [A, B] preserved ✓
  ↓
Cashier presses Cancel → dashboard
  ↓
DashboardPage.handleCloseOrderEntry()
  → cartKey = 'takeAway' (current context)
  → setCartsByTable({..., 'takeAway': []})     ← E-3: explicit clear
  → setOrderEntryType(null)
  ↓
Next time cashier opens Walk-In or TakeAway → savedCart = [] → empty cart ✓
```

---

## Affected File Analysis

### File 1: `DashboardPage.jsx` (R5)

#### E-1 — `handleTableClick` (~L1488–1492): Remove nonce bump

**What:** Delete `setOrderEntryResetNonce(n => n + 1)` and replace the BUG-452 comment.

**VD-8 modal flag resets (keep):** `setInitialShowMerge(false)`, `setInitialShowShift(false)`, `setInitialShowPayment(false)`, `setInitialTransferItem(null)` — harmless without remount, provide belt-and-braces safety. Keep unchanged.

#### E-2 — `handleOrderTypeChange` (~L1513–1518): Remove nonce bump

Same as E-1 pattern — remove nonce bump + update comment. Keep modal resets.

#### E-3 — `handleCloseOrderEntry` (~L1527–1535): Add explicit cart clear

**Why needed:** When `setOrderEntryType(null)` is called, OrderEntry unmounts — the `useEffect` cleanup runs but the effect BODY does NOT fire for the null value (unmount happens before effect body runs with null). So E-4 alone does NOT clear the key on close. E-3 must do it explicitly.

**What to add** (before the state resets):
```javascript
// CR-411: clear saved cart for current context so re-open starts fresh (OD-411-01=A)
const cartKey = orderEntryTable?.id || orderEntryType;
if (cartKey) setCartsByTable(prev => ({ ...prev, [cartKey]: [] }));
```

---

### File 2: `OrderEntry.jsx` (R5)

#### E-4 — `useEffect[table?.id, orderType]` (~L381–382): Clear oldKey instead of saving

**Current:**
```javascript
if (oldKey && oldKey !== newKey) {
  onCartChange?.(oldKey, cartItems);   // saves items to oldKey → causes stale restore
}
```
**Fixed:**
```javascript
if (oldKey && oldKey !== newKey) {
  onCartChange?.(oldKey, []);          // CR-411: clear oldKey slot (OD-411-01=A), never save
}
```

**Effect:** Every time the switch useEffect fires (type or table change), the old key is wiped rather than saved. Items carry forward in live state.

#### E-5 — `else if (oldKey !== null)` branch (~L507–509): Update comment only

The no-op IS the correct carry-forward behavior — by NOT calling `setCartItems`, items remain in state. Just remove the "unreachable in the switch path" label.

```javascript
} else if (oldKey !== null) {
  // CR-411: cart carries forward on type/table switch — items stay in state (OD-411-01=A, reverses BUG-452).
}
```

---

## Files That WILL Change

| File | Edits | Lines |
|------|-------|-------|
| `src/pages/DashboardPage.jsx` | E-1, E-2, E-3 | ~8 lines deleted, ~5 lines added |
| `src/components/order-entry/OrderEntry.jsx` | E-4, E-5 | ~3 lines changed |

## Files That WILL NOT Touch

`CartPanel.jsx` · `CollectPaymentPanel.jsx` · `orderTransform.js` · `socketHandlers.js` · any other file

---

## Regression Risk Assessment

| Scenario | Expected behavior | Safe? |
|---|---|---|
| Placed order re-engage (click occupied table) | `orderData` present → `else if (orderData)` branch → restores placed items | ✓ E-4 only fires when `oldKey !== newKey`; re-engage uses different key |
| Walk-in fresh open after close | E-3 clears key on close → `savedCart = []` → `setCartItems([])` | ✓ |
| Stay-on-order after collect bill | L1560 nonce bump unchanged (OD-411-02=A) → full remount → `handleCollectBillStayOnOrder` clears key at L1555 | ✓ |
| Switch same type (Walk-In → Walk-In) | `oldKey === newKey` → E-4 guard skips write → items stay | ✓ |
| R13: Walk-in special | Key is string `'walkIn'` — E-3 clears it on close | ✓ |
| VD-8 modal flags | Kept in handlers — harmless no-ops without remount | ✓ |

---

## Risk Classification

**CRITICAL** — 2 R5 hotspot files + core order-entry flow.
Change complexity: LOW (~11 lines across 5 edits, no new algorithms).

---

## Tests Needed

Two unit tests (seeds QA handover):
- T-1: `handleCloseOrderEntry` clears `cartsByTable[key]` before resetting type
- T-2: On type switch, `cartsByTable[oldKey]` is set to `[]` not `cartItems`

The existing BUG-452 test (`src/__tests__/api/socket/...` or `DashboardPage.bug452.test.jsx`) may need updating — it likely asserts nonce-bump behavior. Check at implementation time.

---

## Owner Decisions

All locked — OD-411-01=A, OD-411-02=A. No open questions.

---

## Summary

| Field | Value |
|---|---|
| Code Reality | FULL (BUG-452 nonce-bump active at HEAD) |
| Conflict Pre-Check | NONE |
| Risk | CRITICAL (2 R5 hotspots) |
| Change complexity | LOW (~11 lines, 5 edits, 2 files) |
| Files WILL change | `DashboardPage.jsx` · `OrderEntry.jsx` |
| Files WILL NOT touch | All others |
| Existing tests to check | `DashboardPage.bug452.test.jsx` — may assert nonce bump, needs update |
| New tests needed | T-1, T-2 (seeds QA handover) |
| Owner decisions | NONE (all locked) |
| Fast Lane eligible | NO (R5 + order flow) |
| Planning skip eligible | NO |
