# BUG-227 — Smart Purchase Vendor Combobox + System Vendor — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/impact/BUG-227_IMPACT_ANALYSIS.md` (approved; Q1 searchable combobox, Q2 System Vendor bucketing + brief filed) | **Risk:** HIGH (vendor+rate feed add-purchase)
**Entry verification:** PASS 2026-07-23 — Promise.all (:35-41, no getVendors), vendorNamesById (:84-88), rankVendors drops null vid (:31-32), VendorSuggestionCell "No history" (:34-36), validation `rate>0` (:109). shadcn `command.jsx` + `popover.jsx` present for combobox.

## Dependencies / Wave
WAVE 4 — AFTER BUG-224 (same SmartPurchasePanel.jsx; 224 changes row build, 227 changes vendor layer).

## Scope Lock
WILL change: `SmartPurchasePanel.jsx` (~12 lines), `utils/vendorRanking.js` (~15 lines), `components/inventory/smart/VendorSuggestionCell.jsx` (~35 lines — combobox rewrite). WILL NOT touch: purchasePlanner.js, AutoShoppingList/GroupedVendorPreview (verify-only), services/constants (getVendors exists, CR-084), locked B3/B5 math, submit validation.

## Edits (exact)
1. **SmartPurchasePanel.jsx**
   a. Promise.all (:35-41): add `inventoryService.getVendors()` → `vendorMaster` state. `// BUG-227`
   b. rankVendors calls (:49): `rankVendors(vil, r.ingredient_id, vendorMaster)`.
   c. vendorNamesById (:84-88): seed from master first, overlay history names; add `'system': 'System Vendor'` entry.
   d. **Submit guard (Q2 mandate):** where vendor grouping/submit builds payload, map `vendor_id === 'system'` → null/absent exactly as today (add explicit line + comment `// BUG-227: System Vendor is display-only — NEVER submit`).
2. **vendorRanking.js:20** — signature `rankVendors(vendorItemList, ingredientId, vendorMaster = [])`:
   a. Null-vid rows: instead of `if (!vid) return;` → bucket under `vid = 'system'`, `vendor_name: 'System Vendor'` (participates in latest-per-vendor collapse + ranking math unchanged).
   b. After candidates built: append master vendors not already present as `{ vendor_id, vendor_name, unit_price: null, last_purchase_date: '', fromMaster: true }` — appended AFTER ranked candidates, NOT sorted into price ranking (null price).
   c. Winner selection unchanged (B3/B5) — winner only from priced candidates; if zero priced candidates, `winner: null, reason: 'No vendor history'` but candidates array still carries master list.
3. **VendorSuggestionCell.jsx** — replace plain select + "No history" literal with searchable combobox (shadcn `Popover` + `Command`):
   - List order: winner ("Recommended" badge + ₹price) → priced alternatives (₹price) → System Vendor (if present) → master-only vendors (no price).
   - Search input filters by name. Selecting calls existing `onChange(vendor_id)`.
   - Guard `isMateriallyMoreExpensive`/`getReason` for null-price selections (skip warning when either price is null).
   - Empty-history ingredient now shows combobox with all 12 master vendors instead of "No history".
   - data-testids: `vendor-combobox-{ingredientId}`, `vendor-option-{vendorId}`.

3 files, ~60 lines (combobox dominates).

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | rankVendors: null-vid rows → System Vendor candidate with price history | Unit test | YES |
| 2 | rankVendors: master vendors appended unranked; winner math unchanged for priced set | Unit test | YES |
| 3 | Ingredient WITHOUT history → combobox lists all master vendors, no "No history" literal | Browser | NO |
| 4 | Ingredient WITH history → Recommended winner first, B3 override warning intact for priced picks | Browser | NO |
| 5 | Pick master-only vendor → rate '' → validation forces manual rate | Browser | NO |
| **6 CRITICAL** | Submit payload NEVER contains vendor_id 'system' (Network tab / code trace) | Browser + code | NO |
| 7 | GroupedVendorPreview shows correct names for master-only + System Vendor rows | Browser | NO |

## Risk Register
Financial-adjacent (vendor+rate → add-purchase). Mitigations: submit guard is an explicit edit (1d), CRITICAL test #6 mandatory; B3/B5 rulings untouched; combobox is presentation-layer only.

## Registry Checklist
- [ ] registry.json BUG-227 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP (3 files)  - [ ] `// BUG-227` markers  - [ ] webpack clean + unit tests pass

*Gate 3 complete. Awaiting Gate 4 GO.*
