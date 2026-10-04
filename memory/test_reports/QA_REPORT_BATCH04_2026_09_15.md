# QA Report — BATCH-04: P3 Menu Management & UX Items
**Date:** 2026-09-15
**Role:** QA Agent (ALPHA v0.7 — Role 4)
**Items:** BUG-390 · BUG-391 · BUG-392 · CR-373 · CR-374
**Sprint:** pos_7_0
**QA Handovers:** `QA_HANDOVER_BATCH_A_2026_09_10.md` · `QA_HANDOVER_BUG391_2026_09_10.md`

---

## BUG-390 (P3) — Normal Menu Image Upload Hidden (Aggregator Gate Regression)

**Fix:** `ProductForm.jsx:348` — Aggregator gate removed; image upload section now rendered for ALL menu types with label "Item Image".

| # | Test | Code Evidence | Result |
|---|---|---|---|
| T1 | Normal → Add Item: image upload visible | `ProductForm.jsx:348` — `{/* BUG-390: Item image upload — shown for all menu types */}` — no gate condition wrapping | ✅ PASS |
| T2 | Aggregator → Add Item: image upload still visible | Same line — gate was removed entirely, both paths share the section | ✅ PASS |
| T3 | Label reads "Item Image" | `ProductForm.jsx:350` — `<label>Item Image</label>` | ✅ PASS |
| T4 | `data-testid="image-upload-btn"` present | `ProductForm.jsx:361` — `data-testid="image-upload-btn"` confirmed | ✅ PASS |

**BUG-390 Result: 4/4 PASS ✅**

---

## BUG-391 (P3) — Aggregator GST Not Enforced

**Fix:** Three-layer enforcement: `ProductForm.jsx` (read-only fields + init defaults) + `menuManagementTransform.js` (safety net) + `BulkEditor.jsx` (validation).

| # | Test | Code Evidence | Result |
|---|---|---|---|
| T1 | Aggregator Add Item: tax fields locked to "GST (mandatory)" / "5% (mandatory)" | `ProductForm.jsx:440-446` — `{/* BUG-391: Aggregator — tax fields locked read-only */}` + `GST (mandatory)` label | ✅ PASS |
| T2 | Aggregator save payload: `tax_type:"GST"`, `tax:"5"` | `menuManagementTransform.js:268-269` — `// BUG-391` safety net, always overrides for Aggregator | ✅ PASS |
| T3 | Edit existing Aggregator item with `tax=0`: opens with GST 5% | `ProductForm.jsx:240-241` — init: `taxPercentage: menuType==='Aggregator' ? 5 : ...` | ✅ PASS |
| T4 | Normal menu: tax fields remain editable | Conditional at L440: `{menuType === 'Aggregator' ? (<read-only>) : (<editable>)}` | ✅ PASS |
| T5 | BulkEditor Aggregator row with Tax%=0 → Save → red cell | `BulkEditor.jsx:567` — unconditional Aggregator block: `taxType!=='GST'` or `taxPercent!==5` → validation error | ✅ PASS |
| T6 | BulkEditor Aggregator row with correct GST 5% → saves cleanly | Same block passes for correct values | ✅ PASS |
| T7 | `menuType` dep in useEffect ensures re-init on tab switch | `ProductForm.jsx:303` — `}, [product, categories, menuType]); // BUG-391` | ✅ PASS |
| R1 | Normal menu save unaffected (transform safety net bypassed) | `menuManagementTransform.js:268`: `form.foodFor === 'Aggregator'` condition — Normal items use their own values | ✅ PASS |

**BUG-391 Result: 8/8 PASS ✅**

---

## BUG-392 (P3) — All Number Inputs Respond to Scroll Wheel

**Fix:** `onWheel={e => e.target.blur()}` added to 13 number inputs across 5 files.

| # | File | Count | Code Evidence | Result |
|---|---|---|---|---|
| E1-E5 | `ProductForm.jsx` | 5 | `grep -c "onWheel"` → 5 hits | ✅ PASS |
| E6 | `BulkEditor.jsx` | 1 | L1403: `onWheel={e => e.target.blur()}` on renderCell number input | ✅ PASS |
| E7-E10 | `AddonManagementPanel.jsx` | 4 | `grep -c "onWheel"` → 4 hits (add price, add weight, edit price, edit weight) | ✅ PASS |
| E11 | `VariationExpandPanel.jsx` | 1 | `grep -c "onWheel"` → 1 hit | ✅ PASS |
| E12-E13 | `ProductCard.jsx` | 2 | `grep -c "onWheel"` → 2 hits | ✅ PASS |
| R1 | Keyboard ↑/↓ still works | `blur()` only fires on wheel event, not keyboard — keyboard type default preserved | ✅ PASS |

**Total: 13/13 onWheel guards confirmed · BUG-392 Result: 6/6 PASS ✅**

---

## CR-373 (P3) — Aggregator ProductForm: Use Item Image for Swiggy Toggle

**Fix:** `ProductForm.jsx` — `useItemImageForSwiggy` state + two-button toggle + `effectiveSwiggyFile` in save.

| # | Test | Code Evidence | Result |
|---|---|---|---|
| T4 | Aggregator Add Item: toggle visible with "Use same as Item Image" / "Upload different image" | `ProductForm.jsx:371` — `{/* CR-373: Swiggy image — toggle */}` + L383-384 | ✅ PASS |
| T5 | New item: toggle pre-selects "Use same as Item Image" | `ProductForm.jsx:301` — `setUseItemImageForSwiggy(true)` for new items | ✅ PASS |
| T6 | Edit item with existing Swiggy image: toggle pre-selects "Upload different" | `ProductForm.jsx:280` — `setUseItemImageForSwiggy(!product.swiggyImage)` — false when image exists | ✅ PASS |
| T7 | Click "Upload different" → upload section appears | `ProductForm.jsx:388` — `{!useItemImageForSwiggy && (<upload section>)}` | ✅ PASS |
| T8 | Click "Use same as Item Image" → upload section hidden | Same conditional: section hidden when `useItemImageForSwiggy===true` | ✅ PASS |
| T9 | Normal menu: NO Swiggy toggle | CR-373 section inside Aggregator-only block — not rendered for Normal | ✅ PASS |
| T10 | Save: `effectiveSwiggyFile` uses item image when toggle=true | `ProductForm.jsx:642` — `effectiveSwiggyFile = useItemImageForSwiggy ? form.imageFile : form.swiggyImageFile` | ✅ PASS |
| T11 | Both service calls use `effectiveSwiggyFile` | `ProductForm.jsx:646,653` — `addFoodAggregatorMultipart` + `editFoodAggregator` both use it | ✅ PASS |

**CR-373 Result: 8/8 PASS ✅**

---

## CR-374 (P3) — BulkEditor Filter Panel — Status / Type / Category

**Fix:** `BulkEditor.jsx` — 3 filter states + filter passes in groupedRows memoization + filter strip JSX with all data-testids.

| # | Test | Code Evidence | Result |
|---|---|---|---|
| T16 | Filter strip visible between toolbar and column chips | `BulkEditor.jsx:988-1002` — `{/* CR-374: Always-visible filter strip */}` + `data-testid="bulk-filter-strip"` | ✅ PASS |
| T17 | "Active" pill shows only active items | `BulkEditor.jsx:437-440` — `filterStatus==='active'` → `want=1` filter pass | ✅ PASS |
| T18 | "Inactive" pill shows only inactive items | Same: `filterStatus==='inactive'` → `want=0` | ✅ PASS |
| T19 | "Veg" pill shows only Veg items | `BulkEditor.jsx:441-443` — `filterType!=='all'` → `itemType === typeMap[filterType]` | ✅ PASS |
| T20 | Category dropdown filters by category | `BulkEditor.jsx:445-446` — `filterCategoryId!==null` → `categoryId === filterCategoryId` | ✅ PASS |
| T21 | Combined Active + Veg filter | Both passes applied sequentially in same memoization | ✅ PASS |
| T22 | "Select All" with filter: only visible rows selected | New rows always pass (`r._isNew` guard) — filter is pre-selection pass | ✅ PASS |
| T23 | "Clear Filters" button | `BulkEditor.jsx:1035-1036` — `data-testid="filter-clear-btn"` + "Clear Filters" label | ✅ PASS |
| T24 | Menu type switch resets filters | `BulkEditor.jsx:280` — `useEffect(() => { ... reset all 3 filters ... })` on menuType change | ✅ PASS |
| T25 | New row visible regardless of filter | `r._isNew` guard in all 3 filter passes (L437, 441, 445) | ✅ PASS |
| T26 | `useMemo` deps include all 3 filter states | `BulkEditor.jsx:492` — `[rows, search, sortCol, sortDir, filterStatus, filterType, filterCategoryId]` | ✅ PASS |
| R3 | Save N Changes unaffected by filter (UI-only) | Filter is in memoized display layer only; save path reads from `rows` state directly | ✅ PASS |

**CR-374 Result: 12/12 PASS ✅**

---

## Coverage

| Item | Files Changed | Tests |
|---|---|---|
| BUG-390 | ProductForm.jsx | T1-T4 ✅ |
| BUG-391 | ProductForm.jsx, BulkEditor.jsx, menuManagementTransform.js | T1-T7 + R1 ✅ |
| BUG-392 | ProductForm.jsx, BulkEditor.jsx, AddonManagementPanel.jsx, VariationExpandPanel.jsx, ProductCard.jsx | E1-E13 + R1 ✅ |
| CR-373 | ProductForm.jsx | T4-T11 ✅ |
| CR-374 | BulkEditor.jsx | T16-T26 + R3 ✅ |

**Coverage: 6/6 distinct changed files ✅** *(ProductForm.jsx shared by BUG-390, BUG-391, BUG-392, CR-373 — all confirmed)*

---

## Registry Spot-Check

```
BUG-390: IMPLEMENTED, pos_7_0 ✅
BUG-391: gate:5, IMPLEMENTED, pos_7_0 ✅
BUG-392: IMPLEMENTED, pos_7_0 ✅
CR-373:  IMPLEMENTED, pos_7_0 ✅
CR-374:  IMPLEMENTED, pos_7_0 ✅
Registry: SYNCED ✅
```

---

## Findings Summary

**BLOCKER: 0 · MAJOR: 0 · MINOR: 0 · NOTE: 0**

All 38 tests PASS. No findings.

---

## QA Summary

```
Verification complete: BATCH-04 — BUG-390, BUG-391, BUG-392, CR-373, CR-374
Result: PASS
Tests: 38 total — 38 PASS · 0 FAIL · 0 DEFERRED
Blockers: NONE
Coverage: 6/6 changed files
Registry: SYNCED
Report: test_reports/QA_REPORT_BATCH04_2026_09_15.md
Next: Proceed to BATCH-05 (Older Backlog P0+P1) or Gate 6 Owner Smoke for Batches 01–04
```
