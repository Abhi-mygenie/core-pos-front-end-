# CR-412 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** CR-412 — Loyalty Pre-tick when `loyalty_info.redeemed = true` (Scan & Order)
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Intake doc:** `change_requests/CR-412_LOYALTY_PRETICK_SCAN_ORDER_REDEEMED_INTAKE.md`
**Investigation:** `INV-LOYALTY-COUPON-SCAN-OCT12_INVESTIGATION_REPORT.md`

---

## Header

**Code Reality:** NONE — `loyaltyRedeemed` field absent from `fromAPI.order`; no `initialLoyalty` prop in CPP; `useLoyalty` always starts `false`.
**Conflict Pre-Check:** BUG-538 (same CPP + OE files, different concern) — PARALLEL-SAFE, CR-412 before BUG-538. Old-sprint items (CR-116, CR-137) at QA PASS — not active conflicts.
**Open Owner Decisions:** NONE — OD-INV-02=B and OD-GAP3 both locked.
**Backend Note:** Socket path (`update-order`) is blocked until backend ships `loyalty_info` (OD-GAP3 = B, backend to fix, no FE guard). LIST API path works today and can be implemented and tested now. Socket path self-heals automatically once backend delivers.
**Gate 2 Status:** COMPLETE.

---

## 1. Root Cause — 2-Layer Gap

**Layer A — `orderTransform.js`:** `fromAPI.order` does not read `loyalty_info`. The `loyalty_info.redeemed = true` field exists on the employee-orders-list API response (confirmed live on orders 1233149 and 1233147) but is silently dropped during transform:

```javascript
// Current (absent):
couponCode:     api.coupon_code     || '',  // CR-409 E-1 — added ✓
// loyaltyRedeemed: ???                    // ← NOT READ ✗
```

**Layer B — `CollectPaymentPanel.jsx`:** CPP has no `initialLoyalty` prop. `useLoyalty` state is hardcoded to `false` on every mount:
```javascript
const [useLoyalty, setUseLoyalty] = useState(false);  // L308 — always false on open
```
Even if Layer A were fixed, the pre-ticked value would never reach CPP without the prop.

---

## 2. Live Evidence (from investigation, RID 689)

| Order | `loyalty_info.redeemed` | `redeemed_amount` | Current CPP | Expected (OD-INV-02=B) |
|-------|------------------------|------------------|-------------|----------------------|
| 1233149 | `true` | `7` | `useLoyalty = false` ✗ | `useLoyalty = true` ✓ |
| 1233147 | `true` | `0` | `useLoyalty = false` ✗ | `useLoyalty = true` ✓ |
| 1233148 | `false` | `0` | `useLoyalty = false` ✓ | `useLoyalty = false` ✓ |

---

## 3. Scope — 3 Edits across 3 R5 Files

### E-CR412-1 — `orderTransform.js`: add `loyaltyRedeemed` to `fromAPI.order`

| Field | Value |
|-------|-------|
| File | `src/api/transforms/orderTransform.js` |
| Insertion | After L453 (`couponType: api.coupon_type \|\| 'order',`) |
| Change | +1 line |

```javascript
// AFTER L453 — insert:
loyaltyRedeemed: api.loyalty_info?.redeemed === true,    // CR-412: pre-tick loyalty checkbox when scan & order redeemed
```

**Why `=== true`:** Guards against truthy strings or `1`. Only booleans `true` pre-tick.
**Why here:** Alongside the CR-409 coupon fields block (L447–453) — same data source, consistent grouping.
**Socket path:** Once backend ships `loyalty_info` in `update-order` socket, `handleOrderDataEvent` calls `fromAPI.order(socketPayload)` → this field is read automatically. No other code change needed for socket path.

---

### E-CR412-2 — `CollectPaymentPanel.jsx`: add `initialLoyalty` prop + mount `useEffect`

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/CollectPaymentPanel.jsx` |
| Change A | +1 line at L77 (after `allowedMethods,`) — prop declaration |
| Change B | +5 lines after CR-413 marker at L332 — mount `useEffect` |
| Net delta | +6 lines |

**Change A — prop declaration (L77, after `allowedMethods,`):**
```jsx
  allowedMethods,
  // CR-412: pre-ticked loyalty from scan & order. Null for regular POS orders → no-op.
  initialLoyalty = null,
```

**Change B — mount `useEffect` (after L332 CR-413 marker):**
```jsx
  // CR-412: seed useLoyalty from scan & order pre-tick on mount.
  // Fires once at panel open. initialLoyalty = null for regular POS orders → no-op.
  // OD-INV-02=B: pre-tick when redeemed=true regardless of redeemed_amount.
  useEffect(() => {
    if (initialLoyalty?.redeemed === true) setUseLoyalty(true);
  }, []); // mount-only
```

**Why useEffect and not `useState(initialLoyalty?.redeemed === true)`:** Keeps the pattern explicit and auditable (consistent with how initialCoupon was structured in CR-409, easier to trace and revert if needed). Mount-only effect is idiomatic for seeding state from stable props.

**Why `=== true`:** Matches the guard in E-CR412-1. Prevents pre-ticking on `redeemed: 0` or `redeemed: "false"`.

---

### E-CR412-3 — `OrderEntry.jsx`: pass `initialLoyalty` prop to CPP

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/OrderEntry.jsx` |
| Insertion | After L1935 (CR-413 marker `// CR-413: initialCoupon prop removed…`) |
| Change | +3 lines |

```jsx
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
              // CR-412: pre-tick loyalty from scan & order when redeemed=true.
              initialLoyalty={
                orderData?.loyaltyRedeemed ? { redeemed: true } : null
              }
```

**Why `{ redeemed: true }` object and not just the boolean:** Keeps the prop shape extensible (future: `{ redeemed, amount }`). CPP checks `initialLoyalty?.redeemed === true` — consistent.

**Guard:** `orderData?.loyaltyRedeemed` is `false` for all regular POS orders (transform returns `false` not `undefined` from `=== true` check). Prop evaluates to `null` → CPP mount effect is a no-op. Zero regression on non-scan orders.

---

## 4. Data Flow Trace — After Fix

```
LIST API boot → employee-orders-list
  → fromAPI.order() → orderData.loyaltyRedeemed = true         [E-CR412-1]
  → OrderEntry renders CPP with initialLoyalty={redeemed:true} [E-CR412-3]
  → CPP mount useEffect → setUseLoyalty(true)                  [E-CR412-2]
  → Cashier opens CPP: loyalty checkbox ✅ pre-ticked

ORDER EDIT → update-order socket (backend not yet shipping loyalty_info)
  → fromAPI.order(socketPayload) → loyaltyRedeemed = false (loyalty_info absent)
  → GAP-3: currently wipes pre-tick                            [BACKEND BLOCKED]
  → OD-GAP3=B: backend to add loyalty_info → auto-fixed when shipped

REGULAR POS ORDER (no scan & order)
  → orderData.loyaltyRedeemed = false
  → initialLoyalty = null → mount useEffect no-op              [ZERO REGRESSION]
```

---

## 5. Conflict Pre-Check

| Item | Status | Overlap | Assessment |
|------|--------|---------|------------|
| **BUG-538** | GATE_1_INTAKE | CPP + OE (discount permission) | PARALLEL-SAFE — different props/logic. Recommend CR-412 → BUG-538 execution order. BUG-538's OE target (L334) far from CR-412's OE target (L1935+). |
| CR-137 | QA_PASS | CPP + orderTransform | Old sprint, shipped. Not active. |
| CR-116 | QA PASS Gate 5b | CPP + orderTransform | Old sprint, shipped. Not active. |

**Execution order recommendation:** CR-412 (this) → BUG-538 → CR-413 already done.

---

## 6. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **CRITICAL** |
| Trigger | 3 R5 hotspot files + loyalty/financial logic |
| R5 hotspots | YES — `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx` |
| R6 financial | YES — loyalty discount affects `effectiveTotal` in CPP. Pre-ticking `useLoyalty` triggers `loyaltyDiscount` computation. Regression testing mandatory. |
| Planning-skip eligible | NO — R5 + CRITICAL |
| Files WILL change | `orderTransform.js` · `CollectPaymentPanel.jsx` · `OrderEntry.jsx` |
| Files WILL NOT touch | `socketHandlers.js` (OD-GAP3 = backend fix, no FE change) · `DashboardPage.jsx` (R5) · `CartPanel.jsx` |

---

## 7. Edit Summary

| # | File | Lines | Net Δ |
|---|------|-------|-------|
| E-CR412-1 | `orderTransform.js` | After L453 | +1 |
| E-CR412-2a | `CollectPaymentPanel.jsx` | After L77 | +2 (comment + prop) |
| E-CR412-2b | `CollectPaymentPanel.jsx` | After L332 | +4 (comment + useEffect) |
| E-CR412-3 | `OrderEntry.jsx` | After L1935 | +3 (comment + JSX prop) |

**Total: 3 files · ~10 lines added · 0 deleted**

---

## 8. Verification Matrix

| # | What to verify | Method | Automated? |
|---|---|---|:---:|
| V1 | Scan & order with `redeemed=true` → CPP opens with loyalty pre-ticked | Browser: open scan & order (RID 689, order 1233149) → CPP → loyalty checkbox ✅ | NO |
| V2 | Scan & order with `redeemed=true, amount=0` → still pre-ticked | Browser: order 1233147 → CPP → loyalty checkbox ✅ | NO |
| V3 | Regular POS dine-in → loyalty NOT pre-ticked | Browser: regular order → CPP → loyalty ☐ unchecked (unchanged) | NO |
| V4 | `loyaltyRedeemed` in fromAPI.order transform | `grep -n "loyaltyRedeemed" orderTransform.js` → 1 hit at L454 | YES |
| V5 | `initialLoyalty` prop and useEffect in CPP | `grep -n "initialLoyalty" CollectPaymentPanel.jsx` → 2+ hits | YES |
| V6 | `initialLoyalty` prop pass in OE | `grep -n "initialLoyalty" OrderEntry.jsx` → 1 hit | YES |
| V7 | `orderTransform.cr409.test.js` still passes | `npx craco test --watchAll=false --testPathPattern=orderTransform.cr409` | YES |
| V8 | Loyalty discount math correct when pre-ticked | CPP: `useLoyalty=true` → `loyaltyDiscount` computed correctly from `maxRedeemable` | NO |
| V9 | webpack 0 new warnings | `yarn build` exit 0 | YES |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
□ 1. registry.json: CR-412 → GATE_5A_IMPLEMENTED · sprint_key: oct_cr_batch
□ 2. CR_REGISTRY.md: CR-412 row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: 3 files listed with CR-412 IMPL + date
□ 4. Code markers: // CR-412 on all added lines (3 files)
□ 5. yarn build exit 0, 0 new warnings + orderTransform.cr409 4/4 PASS
```

---

## 10. Open Owner Decisions

**NONE.** OD-INV-02=B and OD-GAP3 both locked. Implementation agent has everything needed for the LIST API path.

**Partial backend note:** Socket path (order edits wiping loyalty state) will remain broken until backend ships `loyalty_info` in `update-order` socket (OD-GAP3=B). This is acceptable — the fix is still a net improvement (pre-tick works on page load and persists unless order is edited mid-session).

---

## 11. Summary

- **3 R5 files · 10 lines added · LIST API path fully implementable now**
- `orderTransform.js` reads `loyalty_info.redeemed` → `loyaltyRedeemed`
- CPP gets `initialLoyalty` prop + mount useEffect → seeds `useLoyalty = true`
- `OrderEntry` passes `initialLoyalty` from `orderData.loyaltyRedeemed`
- Socket path auto-heals when backend ships `loyalty_info` (OD-GAP3=B)
- No `socketHandlers.js` change needed

**Next:** "Gate 3 GO" → Implementation Plan → Gate 4 GO → Implementation.
