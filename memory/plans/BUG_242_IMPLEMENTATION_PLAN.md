# BUG-242 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/BUG_242_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE
**Risk:** LOW
**Scope Lock:** 1 file WILL change

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Auto? |
|--------|------|--------|---------------|:---:|
| 1 | `SmartPurchasePanel.jsx:56` | Default vendor_id to 'system' | Code inspection: no null vendor_id in initialRows | NO |
| 2 | `SmartPurchasePanel.jsx:~140` | Validate blocks null/unassigned vendor | Browser: submit with no vendor → error toast | NO |

---

## Edits

### Edit 1: `SmartPurchasePanel.jsx` — Default vendor to System Vendor

**Line:** L56
**Current:**
```js
          vendor_id: ranking.winner?.vendor_id ?? null,
```
**New:**
```js
          vendor_id: ranking.winner?.vendor_id ?? 'system',            // BUG-242: default System Vendor when no history
```

### Edit 2: `SmartPurchasePanel.jsx` — Validate vendor on active rows

**Line:** Inside validate(), after the badQty check (~L138), before the missingPm check
**Current:**
```js
    const badQty = activeRows.find(r => !(Number(r.qty ?? r.suggest_qty) > 0));
    if (badQty) return `Quantity must be > 0 for ${badQty.name}`;
    // B1 · PM per vendor group
    const missingPm = Object.keys(groupedByVendor).find(vid => !pmByVendor[vid]);
```
**New:**
```js
    const badQty = activeRows.find(r => !(Number(r.qty ?? r.suggest_qty) > 0));
    if (badQty) return `Quantity must be > 0 for ${badQty.name}`;
    // BUG-242: Block submit for rows with no vendor selected
    const noVendor = activeRows.find(r => !r.vendor_id || r.vendor_id === 'null');
    if (noVendor) return `Select a vendor for ${noVendor.name}`;
    // B1 · PM per vendor group
    const missingPm = Object.keys(groupedByVendor).find(vid => !pmByVendor[vid]);
```

---

## Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Default vendor | `'system'` (System Vendor) | Already in vendorNamesById (BUG-227 L98). Already has submit handling (L158). |
| 2 | Validate blocks null | YES | Owner ruling: "don't allow if no vendor selected" |
| 3 | System Vendor submit behavior | Sends `vendorId: null` + `vendorName: 'System Vendor'` | BUG-227 L158 already handles: `vid === 'system' ? null : vid`. Backend accepts null vendor_id with name. |

## Scope Lock
**WILL change:** `SmartPurchasePanel.jsx` (2 edits, ~4 lines)
**WILL NOT touch:** AutoShoppingList.jsx, vendorRanking.js, VendorSuggestionCell.jsx, inventoryService.js

## Post-Code Registry Checklist
- [ ] registry.json: BUG-242 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add SmartPurchasePanel.jsx
- [ ] Code markers: // BUG-242

---

**Next:** Gate 4 GO → Implementation
