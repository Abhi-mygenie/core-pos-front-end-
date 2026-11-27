# BUG-628 — Impact Analysis
## Delivery Dispatch Button Stays "Dispatch" After Manual Dispatch (No Rider)

**Date:** 2026-10-29
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL — riderStatus='dispatched' computed correctly, gate conditions wrong
**Conflict Pre-Check:** TableCard.jsx last touched CR-433/BUG-557 (2026-10-16). OrderCard.jsx last touched BUG-573 (2026-10-21). No conflict — different lines.

---

## 1. Root Cause

**Two files, same bug pattern:**

### TableCard.jsx
- **L579:** `!hasRiderAssigned` → shows Dispatch button. Doesn't check if already dispatched.
- **L691:** `(!isDelivery || hasRiderAssigned)` → gates "On The Way" behind rider. Manual dispatch (no rider) blocked.

### OrderCard.jsx
- **L1147:** `!hasRiderAssigned` → same gap as TableCard
- **L1237:** `(!isDelivery || hasRiderAssigned)` → same gate blocks "On The Way" for manual dispatch

## 2. Data Flow After Dispatch (confirmed)

```
dispatch API → socket: order_dispatch_status='Yes', delivery_man_id=null
  → transform: riderStatus = 'dispatched' ✅, deliveryManId = null ✅
    → TableCard/OrderCard: hasRiderAssigned = false (no rider)
      → L579: !hasRiderAssigned = true → Dispatch button re-renders ❌
      → L691: gate fails → "On The Way" blocked ❌
```

## 3. Fix Scope — Manual Dispatch Only (No Rider)

| File | Fix A (hide Dispatch after dispatch) | Fix B (show clickable "On The Way") |
|---|---|---|
| **TableCard.jsx** | L579: `!hasRiderAssigned` → `!hasRiderAssigned && table.order?.riderStatus !== 'dispatched'` | L691: add `!hasRiderAssigned && riderStatus === 'dispatched'` branch → `onClick={handlePrintBill}`, label "On The Way" |
| **TableCard.jsx** | L669: same fix (second rendering branch) | L691: same fix |
| **OrderCard.jsx** | L1147: `!hasRiderAssigned` → `!hasRiderAssigned && order.riderStatus !== 'dispatched'` | L1237: add same branch → `onClick={handlePrintBill}`, label "On The Way" |
| **OrderCard.jsx** | L1215: same fix (fOS=5 branch) | L1237: same fix |

**Rider-assigned flow: UNTOUCHED.** `hasRiderAssigned=true` branches remain exactly as today.

## 4. Risk: MEDIUM
- Touches delivery button logic (not financial, but order flow)
- 2 files, ~8 line changes across 4 conditions
- Only affects `!hasRiderAssigned` branch — rider flow excluded

## 5. Verification Matrix

| # | Check | How |
|---|---|---|
| V1 | Dispatch button hides after manual dispatch | Place delivery order → Dispatch → verify button changes |
| V2 | "On The Way" button appears (clickable) | After dispatch → button shows "On The Way" |
| V3 | Click "On The Way" → prints bill | Click button → bill print triggered |
| V4 | Rider-assigned flow unchanged | Assign rider → verify existing Waiting/Reassign/disabled flow |
| V5 | Compile clean | webpack 0 new warnings |
| REG | Dine-in Serve button unaffected | Place dine-in → Ready → Serve → still works |

---

```
Planning complete: BUG-628
Stage: Gate 2 — Impact Analysis
Risk: MEDIUM
Files WILL change: TableCard.jsx, OrderCard.jsx (~8 lines total)
Files WILL NOT touch: any other file, any rider-assigned branch
Owner decisions: NONE
Next: Gate 3 (Implementation Plan) or Gate 4 GO
```
