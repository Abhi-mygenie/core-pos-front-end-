# QA Handover — BUG-359
**Date:** 2026-08-26
**Files:** `RestaurantSettingsPage.jsx` · `ProductForm.jsx` · `BulkEditor.jsx`

---

## 1. Self-Verification Results

| Edit | File | Change | Result |
|---|---|---|---|
| E1 | RestaurantSettingsPage.jsx:540-547 | Replaced 4-field grid with GST Number only | ✅ Line 541 shows `mt-4` wrapper, BUG-359 comment |
| E2 | ProductForm.jsx:412-418 | grid-cols-3→2, Tax Calculation removed | ✅ Line 412 shows `grid-cols-2`, no Inclusive option |
| E3 | BulkEditor.jsx:54 | taxCalc column removed from ALL_COLUMNS | ✅ Line 54 is BUG-359 comment, no column definition |
| E4 | BulkEditor.jsx:1344-1350 | taxCalc renderer removed | ✅ Line 1344 is BUG-359 comment, no if-block |
| Compile | — | webpack compiled successfully | ✅ 0 warnings |
| Code markers | — | BUG-359 in all 3 files | ✅ 4 markers |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Step 4 GST section | Open Restaurant Settings → Step 4 → enable GST | Only GST Number input shown. No GST Mode, no GST Tax %, no Tax % |
| T2 | Step 4 save | Enter GST number → Save & Launch | Network payload: `restaurent_gst:"category"`, `gst_tax:"0.00"`, `tax:"0"` sent as safe defaults |
| T3 | GST Enabled toggle off | Disable GST Enabled | GST Number hides (same as before) |
| T4 | Show GST to Customers toggle | Toggle it | Still functional, unchanged |
| T5 | VAT Configuration section | Verify VAT Enabled + VAT Code | Untouched and functional |
| T6 | ProductForm — Add item | Open Add menu item form | Tax section shows: Tax Type + Tax % only. No Tax Calculation field |
| T7 | ProductForm — save | Save new item | Network: `tax_calc:"Exclusive"` in payload |
| T8 | ProductForm — edit existing | Open existing item | Loads correctly; no Tax Calculation field visible |
| T9 | BulkEditor column chooser | Open Bulk Editor → click Columns button | `Tax Calc` absent from Tier 2 list |
| T10 | BulkEditor save | Edit a row and save | Network: `tax_calc:"Exclusive"` in payload |
| T11 | Regression: order tax | Place an order | Item-level tax applied correctly — unchanged behaviour |
| T12 | Regression: taxType + taxPercent | ProductForm Tax Type + Tax % fields | Still functional (Tier 1 in BulkEditor) |

---

## 3. Regression

| # | What | Why |
|---|---|---|
| R1 | Place order and verify tax on bill | Tax was always item-level; confirms no regression |
| R2 | BulkEditor Tax Type + Tax % columns (Tier 1) | These were NOT touched; must still be visible and save correctly |
| R3 | ProductForm Tax Type + Tax % | These were NOT touched; must still work |

---

## 4. Registry Sync

- registry.json: BUG-359 → IMPLEMENTED ✅
- BUG_TRACKER.md: updated ✅
- FILE_OWNERSHIP.md: 3 files listed ✅
- Code markers: 4 × BUG-359 ✅
- Compile: 0 warnings ✅
- EXIT GATE: 5/5 PASS ✅

## 5. Environment

- App: https://core-frontend-dev.preview.emergentagent.com
- Routes: /restaurant-settings (Step 4) · /menu (ProductForm/BulkEditor)
