# BUG-619 — Impact Analysis

**Item:** BUG-619 — Double Discount on Role-Based Preset Apply  
**Stage:** Gate 2 — Impact Analysis  
**Code Reality:** FULL — bug exists at CPP L369-376 (missing `setSelectedDiscountType(null)`)  
**Risk:** HIGH — CPP is R5 hotspot; change touches financial discount path  
**Conflict Pre-Check:** CPP has many open items (BUG-527/530/CR-408/409/412/413 — all GATE_5A). Fix is 1 additive line at L374, a different line from all those items. **Parallel-safe.** No execution-order dependency.

---

## Owner Decisions — LOCKED

| OD | Decision |
|---|---|
| **OD-619-01** | Fix: add `setSelectedDiscountType(null)` to seeding useEffect. Same session as BUG-614/BUG-595 regression — no new OD required. |

---

## Data Flow Trace (bug path)

```
User selects "Family — 50%" preset
  → onChange (CPP L1424): setSelectedDiscountType({discountPercent:50, name:'Family'})
                           setDiscountType(null), setDiscountValue('')
User clicks Apply
  → handleApplyDiscount (CPP L381):
      selectedDiscountType is set → preset path
      applyOrderDiscount({ discountAmount: 50, discountType:'percent' })
      setIsDiscountApplied(true)
      ← selectedDiscountType STILL = {discountPercent:50}

Socket fires (BUG-595 reactive useEffect L369-376):
  initialDiscount = { discount:50, discountType:'percent', discountNote:'Family' }
  setDiscountType('percent')    ← discountType = 'percent'
  setDiscountValue('50')        ← discountValue = '50'
  setIsDiscountApplied(true)
  ← setSelectedDiscountType(null) MISSING

Render (CPP L681-709):
  presetDiscount  = Math.round(discountableTotal * 50) / 100  [selectedDiscountType.discountPercent=50]
  manualDiscount  = Math.round(discountableTotal * 50) / 100  [discountType='percent', discountValue='50']
  totalDiscount   = presetDiscount + manualDiscount = 100% ← DOUBLE

Payment payload (CPP L1197-1198):
  discounts.manual = 50%
  discounts.preset = 50%
  → orderTransform.collectBillExisting L1403: self_discount = manual + preset = 100%
```

---

## Affected Files

### Files WILL change (1 file)

| # | File | Change | Line | Risk |
|---|---|---|---|---|
| **E1** | `src/components/order-entry/CollectPaymentPanel.jsx` | Add `setSelectedDiscountType(null)` to seeding useEffect after `setIsDiscountApplied(true)` at L374 | +1 line at L374 | HIGH (CPP R5, but change is additive guard in useEffect, non-financial by itself) |

### Files WILL NOT change
- `orderTransform.js` — `collectBillExisting` math is correct; upstream `discounts.manual` and `discounts.preset` will be correct after fix
- `orderService.js` — `applyOrderDiscount` contract unchanged
- `OrderEntry.jsx` — `initialDiscount` prop construction unchanged
- Any other file

---

## E1: CPP useEffect — Add `setSelectedDiscountType(null)` (BUG-619)

**Current L369-376:**
```js
useEffect(() => {
  if (!initialDiscount) return;
  setDiscountType(initialDiscount.discountType);
  setDiscountValue(String(initialDiscount.discount));
  setDiscountFor(initialDiscount.discountNote || '');
  setIsDiscountApplied(true);
}, [initialDiscount?.discount, initialDiscount?.discountType]);
```

**After E1 (+1 line):**
```js
useEffect(() => {
  if (!initialDiscount) return;
  setDiscountType(initialDiscount.discountType);
  setDiscountValue(String(initialDiscount.discount));
  setDiscountFor(initialDiscount.discountNote || '');
  setIsDiscountApplied(true);
  setSelectedDiscountType(null); // BUG-619: clear preset so socket re-seed only populates manualDiscount, preventing double-count
}, [initialDiscount?.discount, initialDiscount?.discountType]);
```

**Why safe:**
- `setSelectedDiscountType(null)` only fires when `initialDiscount` is truthy (i.e., an existing backend discount is being seeded)
- When null is set, `presetDiscount = 0` and `manualDiscount = 50%` → correct single 50% total
- The preset dropdown still works for NEW selections (user can re-select preset; this effect only fires on socket re-seeds)
- All restaurants without `roleBaseDiscount` never reach this effect (initialDiscount is null) → zero behavior change

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Clears preset during normal re-seed | LOW | MEDIUM | Effect fires only when `initialDiscount` is truthy (backend discount exists). User can re-select preset from dropdown after socket re-seed. |
| Deps array stale | NONE | — | `selectedDiscountType` is NOT in the deps array (correct — mount-once + socket-reactive behavior preserved) |
| Regression on manual % path | NONE | — | Manual path never sets `selectedDiscountType` (dropdown onChange sets one OR the other, never both) |
| Payment payload manualDiscount correct | LOW | HIGH | After fix: `discounts.manual = 50%`, `discounts.preset = 0` → `self_discount = 50%` ✅ |

---

## Downstream Consumers

`collectBillExisting` at `orderTransform.js L1403`: `self_discount = (discounts.manual || 0) + (discounts.preset || 0)`. After fix: `manual=50%, preset=0` → correct.

---

## Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|---|
| V1 | E1 | CPP L374 | Code: `setSelectedDiscountType(null)` is present in useEffect | YES (grep) |
| V2 | E1 | CPP | Browser (Mantri): Select "Family 50%" → Apply → grand total = 50% (NOT 0%) | NO |
| V3 | E1 | CPP | Browser: After Apply, bill shows -₹X (50% of total), NOT -₹2X | NO |
| V4 | E1 | CPP | Browser: Unapply → discount removed, grand total restored | NO |
| V5 | E1 | CPP | Manual ₹ / % regression: select '%', type 10, Apply → 10% discount, NOT 0% | NO |
| V6 | E1 | CPP | Network: `order-discount-manage` payload has `discount_amount: 50`, NOT `0` | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-619 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: CPP entry updated with BUG-619 date
- [ ] Code marker: // BUG-619 in useEffect
- [ ] Compile: webpack 0 new warnings
```

## Gate Status
- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting Implementation Plan → Gate 4 GO
