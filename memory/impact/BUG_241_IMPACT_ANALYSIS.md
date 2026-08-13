# BUG-241 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** NONE — rate is auto-filled, no suggestedRate field exists
**Conflict Pre-Check:** No active conflict. BUG-236 on AutoShoppingList is different area (overflow).
**Risk:** LOW

---

## Data Flow Trace

```
SmartPurchasePanel.jsx fetchPlan():
  L53: ranking = rankVendors(vil, r.ingredient_id, masterList)
  L57: rate: ranking.winner?.unit_price ?? ''    ← AUTO-FILLS from history!
  
  → Row created with rate=80 (from vendor history)
  → CR-103 activeRows filter (L104):
    activeRows = rows.filter(r => Number(r.rate) > 0)
    → rate=80 > 0 → ROW IS ACTIVE (user never opted in)
  → groupedByVendor includes it → Review shows it → submit would purchase it

BREAK POINT: L57 auto-fills rate, defeating CR-103's intent
```

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `SmartPurchasePanel.jsx` | L57 | Change `rate: ''` (empty). Add `suggestedRate: ranking.winner?.unit_price ?? null` | LOW |
| 2 | `AutoShoppingList.jsx` | L153-155 (rate input) | Show `suggestedRate` as hint below input, same pattern as `suggest_qty` | LOW |

**Files WILL NOT touch:** purchasePlanner.js, vendorRanking.js, inventoryTransform.js, VendorSuggestionCell.jsx

## Downstream Impact
- `activeRows` filter now correctly excludes auto-suggested items — only user-entered rates count
- Vendor ranking result preserved in `suggestedRate` — user can see "last: ₹40" and manually enter it
- Submit handler unchanged — still reads `r.rate`

## Scope Lock
- **2 files, ~8 lines**
- No API change, no transform change

---

**Next:** Awaiting owner review of IA. If no blockers → Gate 3 Plan.
