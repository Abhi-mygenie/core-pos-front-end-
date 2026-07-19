# Backend Brief · Stock Inventory Unit Contract Inconsistency

**Filed:** 2026-07-19
**Filed by:** Implementation agent (during CR-078 Smart Purchase build)
**Priority:** MEDIUM (blocking new math consumers; existing display consumers unaffected)
**Component:** `/api/v2/vendoremployee/inventory/stock-inventory` (`current_stocks[]`)
**FE workaround in place:** `computePlan` uses `cal_quantity` + `small_unit` (Path X)
**Ideal fix:** normalize the `(unit, quantity)` pair so it's consistently interpretable

---

## Problem

The `current_stocks[]` array in the stock-inventory response is internally inconsistent about what `quantity` is measured in. Some ingredients report `quantity` in `unit`, others report it in `display_unit`, with no rule callers can apply.

### Evidence (Kunafa Mahal · restaurant #689 · 2026-07-19)

| Ingredient | `unit` | `quantity` | `cal_quantity` | `display_qty` | `display_unit` | What `quantity` really is |
|---|---|---|---|---|---|---|
| Base Cream | `gm` | `4.654` | `4654.00` | `4.65` | `kg` | 4.654 **kg** (not gm) |
| Butter | `kg` | `-73.408` | `-73408.00` | `-80.00` | `kg` | -73.408 **kg** (matches unit) |
| Coffee Beans | `gm` | `0.490` | `490.00` | `0.49` | `kg` | 0.49 **kg** (not gm) |
| Milk | `ml` | `0.920` | `920.00` | `0.92` | `ltr` | 0.92 **ltr** (not ml) |
| Kunafa Cream | `gm` | `-3.080` | `-3080.00` | `-3.08` | `kg` | -3.08 **kg** (not gm) |

For most ingredients whose `unit` = `small_unit` (weight in gm · volume in ml), `quantity` is actually expressed in the `display_unit` (kg · ltr). For Butter and a few others where `unit` matches `display_unit`, the pair is internally consistent.

## Impact

- **Existing UI:** unaffected. `CurrentStockPanel.jsx` renders `displayQty + displayUnit` which is always human-consistent.
- **Any new consumer that does math with `(quantity, unit)`:** off by a factor of 1000 for ~90% of ingredients.
- **CR-078 Smart Purchase gap calculation:** would ship a broken planner (buy 10 gm when reality needs 10 kg) if the pair were trusted.

## Root cause (hypothesis)

- `cal_quantity` seems to be the actual value in `small_unit` (base unit). Consistent across all sampled rows.
- `quantity` appears to be a legacy field pre-populated with the "display representation" for ingredients whose stored unit differs from display unit. For ingredients where they match, it happens to also match `unit`.
- The `unit` field appears to be `small_unit` mislabelled as "unit" for some rows, or the true storage unit for others.

## Recommended backend fix (pick one, document, communicate)

### Option 1 · Rename to reveal the contract (least code churn, most explicit)
- Rename `quantity` → `display_qty_raw` (or similar) — clarifies it's a display representation, not a base-unit quantity
- Keep `cal_quantity` as-is · document it as "always in `small_unit`"
- FE consumers migrate off `quantity` for math over 1-2 sprints

### Option 2 · Normalize `quantity` to always match `unit`
- Rewrite the stock-inventory serializer to compute `quantity = cal_quantity / conversion_factor` where conversion_factor is 1000 for kg/gm and ltr/ml
- Result: `(unit, quantity)` becomes a valid math pair for every row
- Requires touching every consumer that reads `quantity` and confirming no visual regressions

### Option 3 · Document current behavior + deprecate `quantity` field
- Add a schema note: "`quantity` is a legacy display representation. Use `cal_quantity` + `small_unit` for math and `display_qty` + `display_unit` for UI."
- Mark `quantity` as deprecated in Swagger/API docs
- Long-term remove once no consumer reads it

## FE workaround shipped in CR-078 (2026-07-19)

`utils/purchasePlanner.js` `computePlan`:
- Reads `Number(item.calQuantity)` as on-hand (in `smallUnit`)
- Returns rows with `unit = item.smallUnit || item.unit`
- Adds `display_unit` field for UI-side conversion (kg/ltr display of gm/ml values)

`computeVelocity` uses `stockItem.smallUnit` as target base for DCR unit reconciliation.

## Sample curl to reproduce

```
curl -X GET 'https://preprod.mygenie.online/api/v2/vendoremployee/inventory/stock-inventory' \
     -H 'Authorization: Bearer <TOKEN>'
```

Compare `current_stocks[]` rows: rows where `unit === small_unit === "gm"` typically report `quantity` in kg-magnitude.

## Suggested acceptance test (once backend fix ships)

For every row in `current_stocks[]`:
```
assert(cal_quantity / conversion_factor(unit → base_unit) === quantity)   // or a stable, documented rule
```

Where `conversion_factor(gm → g) = 1`, `conversion_factor(kg → g) = 1000`, `conversion_factor(ml → ml) = 1`, `conversion_factor(ltr → ml) = 1000`, `conversion_factor(piece → piece) = 1`.

## Once backend ships the fix

Remove `Path X` workaround from `computePlan`:
- Revert `item.calQuantity` → `item.quantity`
- Revert `item.smallUnit` → `item.unit`
- Delete `display_unit` field from planner rows (or keep it for UI convenience — no harm)

## Related

- CR-078 Smart Purchase — Gate 3 Amendment 2026-07-19 (locks Path X workaround)
- CR-075-A (Stock Dashboard polish) — unaffected (displays `displayQty` + `displayUnit`)
- Any future report/dashboard doing on_hand arithmetic will hit the same issue until backend fixes
