# QA HANDOVER — BUG-211 + BUG-212 (2026-07-21)

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| BUG-211-1: Sort | CurrentStockPanel.jsx:84-100 | Table shows Out of Stock → Low Stock → In Stock | ✅ Verified — 49 out, 8 low, 59 ok |
| BUG-211-2: KPI click | CurrentStockPanel.jsx:149-207 | Click "Low Stock" card → table filters, ring highlight appears | ✅ Verified — toggle on/off works |
| BUG-211-3: Chip removal | CurrentStockPanel.jsx:251 | `[data-testid='status-chips']` absent from DOM | ✅ Verified — element gone |
| BUG-212-A: Edit | InventorySetupPanel.jsx + 3 API files | Pencil icon → inline edit row → PUT call | ✅ Verified — 105 pencil icons render |
| BUG-212-B: Add form | InventorySetupPanel.jsx:20-22 | 7 fields in add row (name, unit, conversion, smallUnit, minQty, minUnit, category) | ✅ Verified |
| BUG-212-C: Export | InventorySetupPanel.jsx:138-160 | Click Export → GET /export-inventory-master → 200 | ✅ Verified |

## 2. Additional test cases (discovered during implementation)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | KPI toggle-off | Click "Low Stock" KPI → click again | Filter clears, all items shown, ring moves to "Total" |
| T2 | Clear all with KPI active | Click "Low Stock" KPI → click "Clear all" button | All filters cleared |
| T3 | Edit cancel | Click pencil → click Cancel | Edit row disappears, original row returns |
| T4 | Edit validation | Click pencil → clear name → click Save | Toast error "Name, category, and unit are required" |
| T5 | Duplicate stock de-dupe | Load Current Stock | No React duplicate-key warnings in console |

## 3. Regression tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Category sidebar filter still works on Ingredients tab | BUG-212 restructured table rows |
| R2 | Search on Current Stock still works | BUG-211 modified filtered useMemo |
| R3 | Category dropdown on Current Stock still works | Same useMemo modified |
| R4 | Vendor tab unaffected | InventorySetupPanel.jsx modified but VendorsTab is separate |
| R5 | Wastage tab unaffected | Same file, separate component |

## 4. Registry Sync Confirmation

Registry synced: YES
Items: BUG-211, BUG-212
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED
- ☑ registry.json updated
- ☑ BUG_TRACKER.md updated
- ☑ FILE_OWNERSHIP.md updated
- ☑ Code markers in all 5 files
- ☑ Compile: 0 new warnings

## 5. Credentials + Environment

- Account: owner@kunafamahal.com / Qplazm@10
- URL: https://core-pos-preview-11.preview.emergentagent.com
- Login takes 25-30s (use 40s timeout)
- Navigation: Sidebar → Inventory → Current Stock pill (BUG-211) or Ingredients pill under Setup (BUG-212)
