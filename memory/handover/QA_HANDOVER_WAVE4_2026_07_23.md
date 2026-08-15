# QA Handover — BUG-223/224/227 (Wave 4 Implementation)
**Date:** 2026-07-23 | **Items:** BUG-223, BUG-224, BUG-227
**Files changed:** StockAuditPanel.jsx, purchasePlanner.js, SmartPurchasePanel.jsx, AutoShoppingList.jsx, vendorRanking.js, VendorSuggestionCell.jsx (6 files)

## 1. Inherited from Plan (Verification Matrix results)

### BUG-223 — Stock Audit Drift Preview
| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| E1 | StockAuditPanel.jsx:4 | AlertCircle import added | ✅ Compile pass |
| E2 | StockAuditPanel.jsx:170 | Negative drift → amber badge + "preview" sub-label | ✅ Code verified |
| E3 | StockAuditPanel.jsx:103 | Unsaved adjustments banner (hasEntries gated) | ✅ Code verified |

### BUG-224 — Smart Purchase Low-Stock Rows
| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| E1 | purchasePlanner.js:140-166 | B2 Rule 2: alert rows added, threshold = minQtyAlert × conversionFactor | ✅ Code verified |
| E2 | SmartPurchasePanel.jsx:60 | origin passthrough from planner | ✅ Code verified |
| E3 | AutoShoppingList.jsx:107 | Low stock amber badge for stock_alert origin | ✅ Code verified |

### BUG-227 — Vendor Combobox + System Vendor
| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| E1a | SmartPurchasePanel.jsx:36-42 | +getVendors() in Promise.all | ✅ Compile pass |
| E1b | SmartPurchasePanel.jsx:52 | rankVendors passes vendorMaster | ✅ Code verified |
| E1c | SmartPurchasePanel.jsx:88-99 | vendorNamesById seeded from master + 'system' entry | ✅ Code verified |
| E1d | SmartPurchasePanel.jsx:144 | Submit guard: vendor_id 'system' → null | ✅ Code verified |
| E2 | vendorRanking.js:20-86 | +vendorMaster param, null-vid→'system', master append | ✅ Code verified |
| E3 | VendorSuggestionCell.jsx | Searchable combobox (Popover+Command), null-price guards | ✅ Compile pass |

## 2. Test Cases

### BUG-223
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Amber preview badge | Enter physical qty with negative drift | Amber badge with "preview" sub-label, NOT red |
| T2 | Unsaved banner appears | Enter any physical qty | Yellow banner: "Unsaved adjustments — drift badges are previews until you save." |
| T3 | Banner disappears on save | Click Save Adjustments → confirm save → re-check | Banner gone, entries cleared |
| T4 | Match/positive badges unchanged | Enter physical qty = system qty; enter higher qty | Green "Match" and green positive badges |

### BUG-224
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T5 | Low-stock item appears | On preprod, find ingredient with minQtyAlert>0, onHand<threshold, zero velocity | Row appears with "Low stock" amber badge |
| T6 | Above-threshold item hidden | Ingredient with onHand ≥ threshold | NOT in the list |
| T7 | Sub-recipe excluded | Sub-recipe below threshold | NOT in the list (G9) |
| T8 | Velocity rows unchanged | Velocity-based items | Same as before (origin='planner', no badge) |
| T9 | Dedup: item in both sets | Item with velocity gap<0 AND below threshold | Appears once as planner row (not duplicated) |

### BUG-227
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T10 | Combobox replaces select | Any ingredient with vendor history | Searchable combobox, NOT plain dropdown |
| T11 | Recommended badge | Winner vendor | Shows "Recommended" badge in green |
| T12 | No-history ingredient | Ingredient with zero purchase history | Combobox shows all master vendors (no "No history" text) |
| T13 | Master-only vendor | Vendor from master with no history for this ingredient | Shows "(no history)" tag, no price |
| T14 | System Vendor | Null-vid rows | Bucketed as "System Vendor" with "(system)" tag |
| T15 CRITICAL | Submit guard | Select System Vendor → submit | vendor_id sent as null, NOT 'system' |
| T16 | Override warning intact | Pick more expensive priced vendor | Amber warning + percentage still shows |
| T17 | Search works | Type vendor name in combobox search | Filters to matching vendors |

## 3. Regression tests
| # | What to verify | Why |
|---|----------------|-----|
| R1 | Velocity-only plan output unchanged for same input | BUG-224 amends B2 but Rule 1 output must be bit-identical |
| R2 | B3 override warning fires for priced vendors | BUG-227 adds null-price guard — priced path must still work |
| R3 | GroupedVendorPreview shows names correctly | vendorNamesById changed in BUG-227 |
| R4 | Stock Audit save flow unchanged | BUG-223 only adds preview UX, no API changes |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: BUG-223, BUG-224, BUG-227
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED

## 5. Credentials + Environment
Account: owner@cafe103.com / Qplazm@10
URL: https://core-pos-react.preview.emergentagent.com
Backend: preprod.mygenie.online (external)
