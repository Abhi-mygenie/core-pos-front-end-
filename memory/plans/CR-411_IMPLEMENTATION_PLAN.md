# CR-411 — Implementation Plan (Gate 3)
**Date:** 2026-10-12
**Stage:** GATE_3_PLAN_COMPLETE
**Depends on:** `impact/CR-411_IMPACT_ANALYSIS.md`

---

## Entry Verification (MANDATORY before any code)

```bash
# E-1/E-2 anchors
grep -n "setOrderEntryResetNonce(n => n + 1)" /app/frontend/src/pages/DashboardPage.jsx
# Expected: 3 hits — L1491 (handleTableClick), L1517 (handleOrderTypeChange), L1560 (handleCollectBillStayOnOrder)

# E-3 anchor
grep -n "const handleCloseOrderEntry" /app/frontend/src/pages/DashboardPage.jsx
# Expected: line ~1528 — body has no cartsByTable clear currently

# E-4 anchor
sed -n '382,386p' /app/frontend/src/components/order-entry/OrderEntry.jsx
# Expected: onCartChange?.(oldKey, cartItems)

# E-5 anchor
grep -n "BUG-334 carry-forward REVERSED" /app/frontend/src/components/order-entry/OrderEntry.jsx
# Expected: 1 hit

# E-6 anchor
grep -n "setOrderEntryResetNonce(n => n + 1)" /app/frontend/src/__tests__/pages/DashboardPage.bug452.test.jsx
# Expected: 0 hits (test uses string constant BUMP, not direct call)
grep -n "BUMP\|remounts OrderEntry" /app/frontend/src/__tests__/pages/DashboardPage.bug452.test.jsx | head -5
# Expected: D-1 and D-2 describes assert nonce bump — will fail after E-1/E-2
```

If `DashboardPage.jsx` has fewer than 3 nonce-bump hits, or E-4 anchor differs → **STOP. Return to Planning.**

---

## Scope Lock

| | |
|---|---|
| **Files WILL change** | `src/pages/DashboardPage.jsx` · `src/components/order-entry/OrderEntry.jsx` · `src/__tests__/pages/DashboardPage.bug452.test.jsx` |
| **Files WILL NOT touch** | `CartPanel.jsx` · `CollectPaymentPanel.jsx` · `orderTransform.js` · `socketHandlers.js` · any other file |

---

## Edits

### E-1 — `DashboardPage.jsx` — `handleTableClick`: Remove nonce bump

**Current (~L1488–1494):**
```javascript
    // BUG-452 (OD-452-01 Option B, S1): switching table while OrderEntry is open remounts it → unplaced draft cleared, no cartsByTable write. Reverses BUG-334.
    // BUG-452 VD-8 Option C (owner 2026-09-24): drop Merge/Shift/Payment entry flags so a dismissed modal does not re-open on remount
    if (orderEntryType !== null) {
      setOrderEntryResetNonce(n => n + 1);
      setInitialShowMerge(false); setInitialShowShift(false); setInitialShowPayment(false); setInitialTransferItem(null);
    }
    setOrderEntryTable(tableEntry);
```

**New:**
```javascript
    // CR-411: cart carries forward on table switch — no remount (reverses BUG-452 OD-452-01=B).
    // Modal flag resets kept: belt-and-braces even without remount.
    if (orderEntryType !== null) {
      setInitialShowMerge(false); setInitialShowShift(false); setInitialShowPayment(false); setInitialTransferItem(null);
    }
    setOrderEntryTable(tableEntry);
```

**Net:** −2 lines (remove 2 comment lines + remove nonce-bump line). Guard and modal resets stay.

---

### E-2 — `DashboardPage.jsx` — `handleOrderTypeChange`: Remove nonce bump

**Current (~L1513–1521):**
```javascript
  const handleOrderTypeChange = (newType) => {
    // BUG-452 (OD-452-01 Option B, S1): type switch mid-build → remount → clean slate (silent, OD-452-04)
    // BUG-452 VD-8 Option C (owner 2026-09-24): drop Merge/Shift/Payment entry flags so a dismissed modal does not re-open on remount
    if (orderEntryType !== null) {
      setOrderEntryResetNonce(n => n + 1);
      setInitialShowMerge(false); setInitialShowShift(false); setInitialShowPayment(false); setInitialTransferItem(null);
    }
```

**New:**
```javascript
  const handleOrderTypeChange = (newType) => {
    // CR-411: cart carries forward on type switch — no remount (reverses BUG-452 OD-452-01=B).
    // Modal flag resets kept: belt-and-braces even without remount.
    if (orderEntryType !== null) {
      setInitialShowMerge(false); setInitialShowShift(false); setInitialShowPayment(false); setInitialTransferItem(null);
    }
```

**Net:** −2 lines.

---

### E-3 — `DashboardPage.jsx` — `handleCloseOrderEntry`: Add cart clear

**Current (~L1528–1536):**
```javascript
  const handleCloseOrderEntry = () => {
    setOrderEntryTable(null);
    setOrderEntryType(null);
    setInitialShowPayment(false);
    setInitialTransferItem(null);
    setInitialShowMerge(false); // BUG-372
    setInitialShowShift(false); // BUG-372 Transfer
  };
```

**New:**
```javascript
  const handleCloseOrderEntry = () => {
    // CR-411: clear saved cart for current context so re-open always starts fresh (OD-411-01=A).
    const cartKey = orderEntryTable?.id || orderEntryType;
    if (cartKey) setCartsByTable(prev => ({ ...prev, [cartKey]: [] }));
    setOrderEntryTable(null);
    setOrderEntryType(null);
    setInitialShowPayment(false);
    setInitialTransferItem(null);
    setInitialShowMerge(false); // BUG-372
    setInitialShowShift(false); // BUG-372 Transfer
  };
```

**Net:** +3 lines.

---

### E-4 — `OrderEntry.jsx` — `useEffect[table?.id, orderType]`: Clear oldKey on switch

**Current (~L382–385):**
```javascript
    // Save previous table's cart before switching
    if (oldKey && oldKey !== newKey) {
      onCartChange?.(oldKey, cartItems);
    }
```

**New:**
```javascript
    // CR-411: clear oldKey slot instead of saving (OD-411-01=A — prevents stale restore).
    if (oldKey && oldKey !== newKey) {
      onCartChange?.(oldKey, []);
    }
```

**Net:** 0 lines (1 line changed + comment updated).

---

### E-5 — `OrderEntry.jsx` — carry-forward branch: Update comment

**Current (~L505–509):**
```javascript
    } else if (oldKey !== null) {
      // BUG-334 carry-forward REVERSED by BUG-452 (owner 2026-09-23, OD-452-01 Option B, S1 remount).
      // After BUG-452 every type/table switch remounts OrderEntry from DashboardPage (key = orderEntryResetNonce),
      // so cartKeyRef is null on entry and this branch is unreachable in the switch path. Kept as a no-op guard.
    } else {
```

**New:**
```javascript
    } else if (oldKey !== null) {
      // CR-411: cart carries forward — items stay in state (reverses BUG-452 OD-452-01=B).
      // No remount on type/table switch; this branch IS reachable. No setCartItems call → items preserved.
    } else {
```

**Net:** −2 lines (3 comment lines → 2).

---

### E-6 — `DashboardPage.bug452.test.jsx`: Update tests that assert nonce-bump

**Tests that will FAIL without update:**
- D-1: asserts `BUMP` exists in `handleTableClick` body → will fail (bump removed by E-1)
- D-2: asserts `BUMP` exists in `handleOrderTypeChange` body → will fail (bump removed by E-2)
- D-3: asserts `BUG-334 carry-forward REVERSED by BUG-452` comment → will fail (comment changed by E-5)

**Tests that remain VALID (no change):**
- Wiring: `<OrderEntry key={orderEntryResetNonce}>` → still true
- Wiring: `handleCollectBillStayOnOrder` body → untouched

**New test assertions:**

D-1 rewrite — assert NO nonce bump + has CR-411 marker + modal resets kept:
```javascript
describe('CR-411 D-1 — handleTableClick carries cart forward on table switch', () => {
  const body = sliceBetween(dashboardSrc, /const handleTableClick = \(tableEntry\) => \{/, /\n  const handleAddOrder/);

  test('nonce bump removed — no setOrderEntryResetNonce in switch path', () => {
    expect(body).not.toContain(BUMP);
  });

  test('CR-411 marker present (R18)', () => {
    expect(body).toMatch(/\/\/ CR-411/);
  });

  test('VD-8 modal flag resets still present inside guard', () => {
    const guarded = sliceBetween(body, /if \(orderEntryType !== null\) \{/, /\n    \}/);
    FLAG_RESETS.forEach((call) => expect(guarded).toContain(call));
  });
});
```

D-2 rewrite — same pattern:
```javascript
describe('CR-411 D-2 — handleOrderTypeChange carries cart forward on type switch', () => {
  const body = sliceBetween(dashboardSrc, /const handleOrderTypeChange = \(newType\) => \{/, /\n  const handleCloseOrderEntry/);

  test('nonce bump removed', () => {
    expect(body).not.toContain(BUMP);
  });

  test('CR-411 marker present', () => {
    expect(body).toMatch(/\/\/ CR-411/);
  });

  test('modal flag resets still present inside guard', () => {
    const guarded = sliceBetween(body, /if \(orderEntryType !== null\) \{/, /\n    \}/);
    FLAG_RESETS.forEach((call) => expect(guarded).toContain(call));
  });
});
```

D-3 rewrite:
```javascript
describe('CR-411 D-3 — OrderEntry.jsx carry-forward branch restored', () => {
  const branch = sliceBetween(orderEntrySrc, /\} else if \(oldKey !== null\) \{/, /\n    \} else \{/);

  test('CR-411 carry-forward comment present (R18)', () => {
    expect(branch).toMatch(/CR-411.*cart carries forward/i);
  });

  test('branch is still a no-op — no setCartItems call', () => {
    expect(branch).not.toMatch(/setCartItems\(/);
  });
});
```

---

## Verification Matrix

| # | Edit | File | How to Verify | Auto? |
|---|------|------|---------------|:-----:|
| V-1 | E-1 | `DashboardPage.jsx` | `grep -c "setOrderEntryResetNonce" DashboardPage.jsx` → 1 (only L1560 stays) | YES |
| V-2 | E-1/E-2 | `DashboardPage.jsx` | `grep -c "// CR-411" DashboardPage.jsx` → ≥2 | YES |
| V-3 | E-3 | `DashboardPage.jsx` | `grep -c "cartKey.*orderEntryTable\|orderEntryType" DashboardPage.jsx` → ≥2 (L1554 existing + E-3) | YES |
| V-4 | E-4 | `OrderEntry.jsx` | `grep -c "onCartChange.*oldKey.*\[\]" OrderEntry.jsx` → 1 | YES |
| V-5 | E-5 | `OrderEntry.jsx` | `grep -c "CR-411" OrderEntry.jsx` → 1 | YES |
| V-6 | E-6 | Test file | `npx craco test --watchAll=false --testPathPattern=DashboardPage.bug452` → all PASS | YES |
| V-7 | Build | All | `yarn build` exit 0 | YES |
| V-8 | Browser | Switch type | Open Walk-In, add items, switch to TakeAway → items stay | NO |
| V-9 | Browser | Switch table | Open Walk-In, add items, click different table → items stay | NO |
| V-10 | Browser | Close → re-open | Open Walk-In, add items, Cancel → open Walk-In again → empty cart | NO |
| V-11 | Browser | Stay-on-order | Collect bill with stay-on-order → new session starts empty | NO |
| V-12 | R13 Walk-in | Re-engage placed | Click occupied table → placed items restored from orderData | NO |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| E-6 test rewrite introduces false positives | LOW | Tests are structural (source-file grep) — verified against anchors above |
| E-3 uses `orderEntryTable?.id \|\| orderEntryType` before they are null — timing | NONE | E-3 runs BEFORE the null sets |
| Stay-on-order path accidentally touched | NONE | L1560 bump verified untouched by V-1 (only 1 hit remaining) |
| `onCartChange?.(oldKey, [])` breaks placed-order re-engage | NONE | Placed order re-engage sets new key, E-4 only fires when `oldKey !== newKey` |

---

## Execution Sequence

1. Entry Verification (all anchors) — confirm 3 nonce hits pre-change
2. E-1 → E-2 → E-3 in DashboardPage.jsx (3 `search_replace` calls)
3. E-4 → E-5 in OrderEntry.jsx (2 `search_replace` calls)
4. E-6 — rewrite DashboardPage.bug452.test.jsx
5. `yarn build` → 0 new warnings
6. `npx craco test --watchAll=false --testPathPattern=DashboardPage.bug452` → all PASS
7. Grep checks V-1 to V-5
8. Post-Code Registry Checklist

---

## Post-Code Registry Checklist (Step 5)

```
□ 1. registry.json: CR-411 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
□ 2. CR_REGISTRY.md: CR-411 row updated to GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: entries for DashboardPage.jsx + OrderEntry.jsx + test file
□ 4. Code markers: // CR-411 in DashboardPage.jsx (≥2) + OrderEntry.jsx (≥1)
□ 5. Compile: yarn build exit 0, 0 new warnings
```

---

## Summary

| Field | Value |
|---|---|
| Edits | 6 (E-1..E-5 source + E-6 test rewrite) |
| Files | `DashboardPage.jsx` · `OrderEntry.jsx` · `DashboardPage.bug452.test.jsx` |
| Lines | ~−4 source lines net (deletions dominate) |
| Owner decisions | NONE (all locked) |
| Gate 4 GO needed | YES |
