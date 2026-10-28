# BUG-532 — Impact Analysis (Gate 2)

## Dashboard Room Tile SC Gap: order.amount Excludes Service Charge → Tile ₹827 vs CPP ₹848

**Date:** 2026-10-10
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE — fix not applied
**Conflict Pre-check:** NONE
**Risk:** MEDIUM (R5 file, display-only discrepancy, no money movement)

---

## Key Finding — NOT Backend-Blocked

**Previous classification in intake doc was incorrect.** Investigation assumed `order.finalTotal` doesn't exist on the order shape (correct) and that the fix required a backend change (incorrect).

**`order.serviceTax` IS present on the order shape:**
```
orderTransform.js fromOrder output (L224):
  serviceTax: parseFloat(api.total_service_tax_amount) || 0
```

For the bonk scenario:
- `order.amount` = ₹227 (food subtotal, no SC — `api.order_amount`)
- `order.serviceTax` = ₹21 (SC — `api.total_service_tax_amount`)
- `order.amount + order.serviceTax` = ₹248 = CPP `finalTotal` ✓

**Revised status: FE-only fix. No backend change required.**

---

## Code Reality Check

```bash
grep -n "serviceTax\|order\.serviceTax" /app/frontend/src/pages/DashboardPage.jsx
# → 0 results — order.serviceTax never read in DashboardPage
# → BUG-532 not applied

grep -n "total_service_tax_amount\|serviceTax" /app/frontend/src/api/transforms/orderTransform.js | head -5
# → L224: serviceTax: parseFloat(api.total_service_tax_amount) || 0  ← confirmed present
```

---

## Conflict Pre-check

Last modifier of `DashboardPage.jsx` (R5): BUG-527 F1 IMPL 2026-10-10 (L53-56, `computeRoomCardAmount` roomBal formula).  
F1 changed L53-56. This fix changes L49 (`food` formula). **Adjacent but non-overlapping — no conflict.**  
No other open item targets `computeRoomCardAmount`.  
**No conflict.**

---

## Data Flow Trace

### Current (broken):

```
computeRoomCardAmount(order):
  food      = Number(order?.amount) || 0           = ₹227  ← api.order_amount, no SC
  transfers = associatedOrders.reduce(...)          = ₹0
  roomBal   = max(0, remainingRoomBalance - discountAmount) = max(0, 1600-1000) = ₹600
  return    = 227 + 0 + 600                         = ₹827  ← tile shows ₹827

CPP effectiveTotal:
  finalTotal (food + SC = ₹248) + 0 transfers + roomBalance(₹600) = ₹848
  CPP total → ₹848  ← CPP shows ₹848

Gap = ₹848 − ₹827 = ₹21 = SC (order.serviceTax)
```

### Fixed:

```
computeRoomCardAmount(order):
  food      = (Number(order?.amount) || 0) + (Number(order?.serviceTax) || 0)
            = 227 + 21                              = ₹248
  transfers = associatedOrders.reduce(...)          = ₹0
  roomBal   = 600 (unchanged)
  return    = 248 + 0 + 600                         = ₹848  ✓ matches CPP
```

### Non-room orders: unaffected

`computeRoomCardAmount` is called **only for room order tiles** (DashboardPage L724: `amount: computeRoomCardAmount(order)` in room card context). Non-room tiles use `order.amount` directly at separate call sites (L590, L632, L664, L782, L806, L946, L1128). These are untouched.

### Associated orders (transfers): OD-532-02

Each associated order in `transfers`:
```js
const transfers = (order?.associatedOrders || [])
  .reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);
```
Uses `o.amount` without `o.serviceTax`. If associated room orders also carry SC in `o.serviceTax`, the transfers total would also be understated.

**Scope decision needed (OD-532-02):** fix `transfers` in the same pass, or defer?  
For the bonk scenario: associatedOrders = [] (no transfers) → transfers = 0. Gap is only in `food`.  
Recommended: defer `transfers` fix (out of scope for this bug — no transfer in test case).

---

## Affected Files

| File | Lines | R5? | Change |
|------|-------|-----|--------|
| `src/pages/DashboardPage.jsx` | L49 only | **YES (R5)** | `food` formula: add `+ (Number(order?.serviceTax) || 0)` |

**Files WILL NOT touch:**
- `orderTransform.js` (R5) — `serviceTax` already produced correctly
- `CartPanel.jsx` — no change
- `CollectPaymentPanel.jsx` (R5) — no change
- Any test file — no change

---

## Exact Edit

### E1 — `DashboardPage.jsx:L49` — add `serviceTax` to food

**Current (L49):**
```js
const food = Number(order?.amount) || 0;
```

**New (L49):**
```js
const food = (Number(order?.amount) || 0) + (Number(order?.serviceTax) || 0); // BUG-532: include SC (serviceTax = api.total_service_tax_amount) to match CPP finalTotal
```

**Lines changed:** 1 line

---

## ODs

### OD-532-01 — REVISED: FE fix approved?

Previous OD-532-01 asked "FE fix now (R5) vs wait backend?". Revised after finding `order.serviceTax` is already present:

**Revised OD-532-01:** "Approve FE fix using `order.serviceTax`? (1 line, R5 file, display-only)"
- Risk: LOW (display only, no payment payload touched, non-room tiles unaffected)
- Fast Lane: NO (R5 file)
- Recommended: YES — proceed with Gate 3

### OD-532-02 (NEW): Fix `transfers` in same pass?

`transfers` summing `o.amount` also excludes SC on each associated room order.  
For the bonk scenario: no associated orders → not relevant.  
**Recommended: DEFER** — fix `food` only in this pass, raise `transfers` as a follow-up if owner encounters a case with room transfers.

---

## Risk Classification

| Dimension | Assessment |
|---|---|
| Risk | **MEDIUM** — R5 file, display-only discrepancy, no money movement |
| Financial payload? | NO — `computeRoomCardAmount` is used only for tile display |
| R5? | YES — full gate flow required |
| Fast Lane eligible | NO |
| Regression risk | LOW — `order.serviceTax` is `0` for non-SC restaurants → no-op for them |
| Non-room orders | UNAFFECTED — separate call sites |

### Edge cases

| Scenario | Outcome after fix |
|---|---|
| Restaurant with SC=0 | `order.serviceTax = 0` → food unchanged → no visual change |
| Non-room order tile | Unchanged — uses separate `order.amount` path |
| Room order with transfer (associated orders) | `food` now correct; `transfers` still uses `o.amount` only (OD-532-02 defer) |

---

## Verification Matrix

| # | Test | How | Auto? |
|---|------|-----|:---:|
| V1 | Room tile shows ₹848 (was ₹827) | Browser: bonk → Dashboard Room tab | NO |
| V2 | Non-room tiles unchanged | Browser: regular orders on dashboard | NO |
| V3 | Restaurant with SC=0: tile unchanged | Browser: restaurant without SC | NO |
| V4 | `computeRoomCardAmount` result = CPP effectiveTotal | Code review | YES |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-532 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated (remove "backend-blocked" note)
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx + date + BUG-532
- [ ] Code marker: // BUG-532 on the modified line
- [ ] webpack: 0 new warnings (R5 — verify carefully)
```
