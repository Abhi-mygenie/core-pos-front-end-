# BUG-242 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** NONE — no default vendor, no null-vendor validation
**Conflict Pre-Check:** CR-100 targets SmartPurchasePanel (BACKEND-BLOCKED, partial payment fields). Different area. No conflict.
**Risk:** LOW

---

## Data Flow Trace

```
SmartPurchasePanel.jsx fetchPlan():
  L53: ranking = rankVendors(vil, r.ingredient_id, masterList)
  L56: vendor_id: ranking.winner?.vendor_id ?? null    ← NULL when no history!

  → Row has vendor_id=null → VendorSuggestionCell shows "Select vendor..."
  → User enters rate but doesn't select vendor
  → validate() L135-143: checks activeRows.length, qty, paymentMethod per vendor group
    → Does NOT check for null vendor_id on individual rows
  → groupedByVendor groups null rows under key 'null'
  → Submit sends vendor_id: null → backend records as unassigned

BUG-227 context:
  L98: vendorNamesById['system'] = 'System Vendor'
  L158: vendorId: vid === 'null' ? null : (vid === 'system' ? null : vid)
  → 'system' vendor_id exists in the system but is display-only (never submitted)

Owner ruling: System Vendor should be DEFAULT when no ranking winner
```

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `SmartPurchasePanel.jsx` | L56 | Default: `vendor_id: ranking.winner?.vendor_id ?? 'system'` (System Vendor as fallback) | LOW |
| 2 | `SmartPurchasePanel.jsx` | L135-143 (validate) | Add: check `activeRows.find(r => !r.vendor_id || r.vendor_id === 'null')` → error "Select vendor for {name}" | LOW |
| 3 | `SmartPurchasePanel.jsx` | L158 | Ensure System Vendor submit path sends actual vendor or null with name='System Vendor' (already handled by BUG-227 L158) | LOW — verify only |

**Files WILL NOT touch:** AutoShoppingList.jsx, vendorRanking.js, VendorSuggestionCell.jsx, inventoryService.js

## Downstream Impact
- All rows now have a vendor by default (System Vendor) — no "(unassigned)" group
- Validate blocks submit if user somehow clears vendor to null
- System Vendor is already in vendorNamesById (BUG-227 L98) — dropdown already shows it

## Scope Lock
- **1 file, ~10 lines**
- No API change, no transform change

---

**Next:** Awaiting owner review of IA. If no blockers → Gate 3 Plan.
