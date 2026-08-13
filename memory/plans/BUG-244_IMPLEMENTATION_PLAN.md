# BUG-244 — Implementation Plan (Gate 3)

**ID:** BUG-244
**Title:** add-purchase payload: wrong payment key + missing header totals
**Date:** 2026-07-25
**Risk:** MEDIUM
**Scope:** Fix `toAPI.addPurchase()` — 1 file, ~8 lines
**Impact Analysis:** `/app/memory/impact/BUG-244_IMPACT_ANALYSIS.md`

---

## Owner Decisions Applied

- **OQ-1:** Non-issue — PurchaseEntryPanel is dead code. System Vendor `null` fine for now.
- **OQ-2 = B:** Do NOT send `converion_factor`. Omit entirely. Backend stores `null` when absent.
- **OQ-3 = A:** Keep ignored keys (vendor_name, notes, invoice_number, rate, origin).

---

## Scope Lock

### File WILL change:
- `api/transforms/inventoryTransform.js` — lines 167-186 (`toAPI.addPurchase`)

### Files will NOT touch:
- `SmartPurchasePanel.jsx` — no change needed (caller passes same data)
- `PurchaseEntryPanel.jsx` — dead code (route redirects)
- `inventoryService.js` — no change needed
- Any other transform, report, or hotspot file

---

## Edit: `api/transforms/inventoryTransform.js` — `toAPI.addPurchase()`

### Current (L164-187):
```js
  // B5: add-purchase — multi-line
  // CR-075-A P6 (folded): batch + expiry_date passthrough (backend accepts, previously silently dropped)
  // CR-078: origin field (planner|ad_hoc|legacy) — future backend brief Q7-b
  addPurchase(data) {
    return {
      vendor_name: data.vendorName || '',
      vendor_id: data.vendorId || null,
      purchase_date: data.purchaseDate, // "DD-MM-YYYY" format per R9
      payment_method: data.paymentMethod || '',
      invoice_number: data.invoiceNumber || '',
      notes: data.notes || '',
      purchase_items: (data.items || []).map(item => ({
        Ingredient: item.ingredientId, // R9: capital I
        Unit: item.unit,               // R9: capital U
        quantity: item.quantity,
        rate: item.rate,
        Amount: item.amount,           // BUG-197 #6: capital A per backend contract
        converion_factor: item.conversionFactor || 1, // R9 typo
        batch: item.batch || '',                                                          // CR-075-A P6
        expiry_date: item.expiry ? formatDateForAPI(item.expiry) : '',                    // CR-075-A P6 (DD-MM-YYYY)
        origin: item.origin || 'legacy',                                                  // CR-078
      })),
    };
  },
```

### New:
```js
  // B5: add-purchase — multi-line
  // CR-075-A P6 (folded): batch + expiry_date passthrough (backend accepts, previously silently dropped)
  // CR-078: origin field (planner|ad_hoc|legacy) — future backend brief Q7-b
  // BUG-244: payment_method→payment_type, +tot_amount/item_total/tot_fair/tot_tax, remove converion_factor
  addPurchase(data) {
    const items = data.items || [];
    const totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0); // BUG-244
    return {
      vendor_name: data.vendorName || '',
      vendor_id: data.vendorId || null,
      purchase_date: data.purchaseDate, // "DD-MM-YYYY" format per R9
      payment_type: data.paymentMethod || '',     // BUG-244: was payment_method (backend ignored wrong key)
      invoice_number: data.invoiceNumber || '',
      notes: data.notes || '',
      tot_amount: totalAmount,                     // BUG-244: required — was missing, defaulted to 1
      item_total: totalAmount,                     // BUG-244: required — was missing, defaulted to 1
      tot_fair: 0,                                 // BUG-244: was missing, defaulted to 1
      tot_tax: 0,                                  // BUG-244: was missing, defaulted to 1
      purchase_items: items.map(item => ({
        Ingredient: item.ingredientId, // R9: capital I
        Unit: item.unit,               // R9: capital U
        quantity: item.quantity,
        rate: item.rate,
        Amount: item.amount,           // BUG-197 #6: capital A per backend contract
        batch: item.batch || '',                                                          // CR-075-A P6
        expiry_date: item.expiry ? formatDateForAPI(item.expiry) : '',                    // CR-075-A P6 (DD-MM-YYYY)
        origin: item.origin || 'legacy',                                                  // CR-078
      })),
    };
  },
```

### Change Summary (line-by-line):

| Line | Change | Reason |
|------|--------|--------|
| L166 | +comment: BUG-244 summary | Code marker (R18) |
| L168 | +`const items = data.items \|\| []` | Pre-extract for totalAmount |
| L169 | +`const totalAmount = items.reduce(...)` | Compute sum for header |
| L172 | `payment_method` → `payment_type` | Backend contract: correct key |
| L174+ | +`tot_amount: totalAmount` | Backend contract: required field |
| L175+ | +`item_total: totalAmount` | Backend contract: required field |
| L176+ | +`tot_fair: 0` | Backend contract: defaults to 1 if omitted |
| L177+ | +`tot_tax: 0` | Backend contract: defaults to 1 if omitted |
| L181 | Remove `converion_factor: item.conversionFactor \|\| 1` | Backend contract: omit unless G-020 |

---

## Verification Matrix

| # | Check | How to Verify | Automated? |
|---|-------|--------------|:---:|
| V1 | `payment_type` key present, `payment_method` absent | `grep -n payment_type inventoryTransform.js` | YES |
| V2 | `tot_amount` computed correctly | Curl: submit purchase → response `tot_amount` matches sum of line Amount | NO |
| V3 | `item_total` matches `tot_amount` | Same curl response | NO |
| V4 | `tot_fair: 0` and `tot_tax: 0` in payload | Curl response check | NO |
| V5 | `converion_factor` NOT in payload | Network tab: inspect request body | NO |
| V6 | Webpack compiles clean | `tail /var/log/supervisor/frontend.out.log` | YES |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-244 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add `inventoryTransform.js` with BUG-244 + date
- [ ] Code markers: `// BUG-244` comment in modified function

---

## Execution

Single `search_replace` operation on `inventoryTransform.js`. No dependencies. No other files.
