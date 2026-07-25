# BUG-248 — Impact Analysis (Part A: FE isDirty Fix)

**ID:** BUG-248
**Stage:** Gate 2 — Impact Analysis
**Date:** 2026-07-25
**Risk:** LOW
**Code Reality:** PARTIAL — `BulkEditor.jsx` exists with 33 editable columns; `isDirty()` only checks 24. The 9 missing checks are the bug.
**Conflict Pre-Check:** NO CONFLICT — no other active registry item targets `BulkEditor.jsx isDirty` function. Last modification: BUG-135-C + BUG-147 (2026-07-11, error visibility — different area of the file).

---

## 1. Summary

`BulkEditor.jsx:258-290` — the `isDirty(row, field)` function contains a `checks` object that maps column keys to comparison functions. It has 24 entries covering columns like `productName`, `basePrice`, `status`, etc. However, 9 of the 33 `ALL_COLUMNS` keys have **no corresponding entry** in `checks`. When `isDirty` is called for these 9 keys, line 289 returns `false`:

```js
return checks[field] ? checks[field]() : false;
//                                         ^^^^^ always false for 9 columns
```

**Consequence:** Editing these 9 columns never makes `isDirty` return `true` → `isRowDirty` stays `false` → `dirtyCount` stays 0 → **"Save X Changes" button never enables** → **edits silently lost**.

---

## 2. Missing Fields (9 columns)

| # | Column Key | Label | Type | Tier | `buildRow` maps it (L) | `buildPayload` sends it (L) | `isDirty` checks it | Backend persists? |
|---|-----------|-------|------|------|------------------------|----------------------------|:---:|:---:|
| 1 | `packedFood` | Packaged Item | yesno | 1 | L98: `f.packedFood ? "Yes" : "No"` | L161: `packed_food` | ❌ NO | ❌ Part B |
| 2 | `isInventory` | Inventory | yesno | 1 | L99: `f.isInventory ? "Yes" : "No"` | L160: `is_inventory` | ❌ NO | ❌ Part B |
| 3 | `stockOut` | Out of Stock | yesno | 2 | L100: `f.isOutOfStock ? "Yes" : "No"` | L162: `stock_out` | ❌ NO | ❌ Part B |
| 4 | `isDisabled` | Hidden from POS | yesno | 2 | L101: `f.isDisabled ? "Yes" : "No"` | L163: `is_disable` | ❌ NO | ✅ YES |
| 5 | `taxCalc` | Tax Calc | dropdown | 2 | L102: `f.taxCalc \|\| "Exclusive"` | L164: `tax_calc` | ❌ NO | ❌ Part B |
| 6 | `itemUnit` | Sold By (Unit) | dropdown | 1 | L124: `f.itemUnit \|\| ""` | L166-167: `item_unit` + `item_unit_price` | ❌ NO | ✅ YES |
| 7 | `availableTimeStart` | Avail. Start | time | 3 | L117: `f.availableTimeStart \|\| "00:00:00"` | L142: `available_time_starts` | ❌ NO | ✅ YES |
| 8 | `availableTimeEnd` | Avail. End | time | 3 | L118: `f.availableTimeEnd \|\| "23:59:59"` | L143: `available_time_ends` | ❌ NO | ✅ YES |
| 9 | `portionSize` | Portion Size | text | 4 | L123: `f.portionSize \|\| ""` | NOT IN buildPayload | ❌ NO | N/A |

### Key observations:
- **5 fields (#4, #6, #7, #8, #9)** are fully FE-fixable — backend already persists them.
- **4 fields (#1, #2, #3, #5)** will trigger Save after the FE fix, but the backend silently drops them (Part B — BACKEND-BLOCKED). User sees "saved" but values revert on reload. Still better than current behavior where edits are silently lost with no feedback.
- **`portionSize`** (#9) is mapped in `buildRow` but NOT sent in `buildPayload`. After adding isDirty, the save will fire but `portionSize` won't reach the API. May need a `buildPayload` addition too (owner decision — see §5).

---

## 3. Data Flow Trace

```
User edits cell in BulkEditor grid
    → updateCell(rowId, colKey, value) updates rows state
    → isRowDirty(row) calls isDirty(row, col.key) for ALL_COLUMNS
        → checks[field] exists? → YES: run comparison → true/false
                                → NO: return false  ← BUG: 9 columns hit this path
    → dirtyCount = rows.filter(isRowDirty).length
    → dirtyCount > 0 enables "Save N Changes" button
    → handleSave() filters dirty rows → buildPayload(row) → POST /api/v2/vendoremployee/product/foods/{id}
```

**Break point:** `isDirty` returns `false` for 9 column keys because `checks` object has no entry for them.

---

## 4. Affected Files

### Files WILL change:
| File | Lines | Change |
|------|-------|--------|
| `components/panels/menu/BulkEditor.jsx` | ~258-288 (isDirty `checks` object) | Add 9 entries |

### Files will NOT touch:
- `MenuManagementPanel.jsx` — parent; no change needed
- `buildRow` function (L85-127) — already maps all 9 fields correctly
- `buildPayload` function (L130-168) — already sends 8 of 9 fields (portionSize TBD)
- `ALL_COLUMNS` definition — already includes all 9
- `CellRenderer` — already renders all columns; dirty highlight works via `isDirty` return value

---

## 5. Owner Decisions Needed

| # | Question | Options | Impact |
|---|----------|---------|--------|
| OQ-1 | `portionSize`: `buildPayload` does not include `portion_size`. After isDirty fix, editing portion size will trigger Save but the field won't be sent to API. Add `portion_size: row.portionSize \|\| ""` to `buildPayload`? | A) Add it (1 line). B) Leave as-is (harmless — save fires but field ignored by API). | If A: +1 line in buildPayload (~L157). If B: no extra change. |

---

## 6. isDirty Check Patterns (reference for Implementation Plan)

Each missing check follows the same pattern as existing entries. The `_original` is `{ ...f }` (the raw food object from MenuContext), so the original field names must match `buildRow`'s source:

| # | Key | isDirty check (to add) | Notes |
|---|-----|----------------------|-------|
| 1 | `packedFood` | `(o.packedFood ? "Yes" : "No") !== row.packedFood` | Boolean → "Yes"/"No" (mirrors L98) |
| 2 | `isInventory` | `(o.isInventory ? "Yes" : "No") !== row.isInventory` | Boolean → "Yes"/"No" (mirrors L99) |
| 3 | `stockOut` | `(o.isOutOfStock ? "Yes" : "No") !== row.stockOut` | ⚠ Original field is `isOutOfStock`, row key is `stockOut` (mirrors L100) |
| 4 | `isDisabled` | `(o.isDisabled ? "Yes" : "No") !== row.isDisabled` | Boolean → "Yes"/"No" (mirrors L101) |
| 5 | `taxCalc` | `(o.taxCalc \|\| "Exclusive") !== row.taxCalc` | String with default (mirrors L102) |
| 6 | `itemUnit` | `(o.itemUnit \|\| "") !== (row.itemUnit \|\| "")` | String with default (mirrors L124) |
| 7 | `availableTimeStart` | `(o.availableTimeStart \|\| "00:00:00") !== row.availableTimeStart` | Time string (mirrors L117) |
| 8 | `availableTimeEnd` | `(o.availableTimeEnd \|\| "23:59:59") !== row.availableTimeEnd` | Time string (mirrors L118) |
| 9 | `portionSize` | `(o.portionSize \|\| "") !== (row.portionSize \|\| "")` | String with default (mirrors L123) |

---

## 7. Risk Assessment

| Factor | Assessment |
|--------|-----------|
| Change scope | 1 file, ~9-10 lines (isDirty checks), +1 optional (buildPayload portionSize) |
| Financial logic | NO — none of these 9 fields are financial |
| API contract | NO change — buildPayload already sends these fields |
| State management | NO change — same `rows` state, same `isDirty` function, just more entries |
| Hotspot file? | YES — `BulkEditor.jsx` is listed in FILE_OWNERSHIP Cross-Sprint Conflict Zones. However, the change is purely additive inside a single function and doesn't alter existing logic. |
| Downstream consumers | `isRowDirty` and `dirtyCount` will now correctly detect more dirty rows. `handleSave` already handles all fields via `buildPayload`. No downstream breakage. |
| Interaction risk | NONE — Part B (backend) is independent. FE fix is correct regardless of backend fix timeline. |

**Risk: LOW** — purely additive, no logic changes to existing code, single function.

---

## 8. Part B Status (BACKEND-BLOCKED)

For reference — not in scope of this FE fix:
- Endpoint: `POST /api/v2/vendoremployee/product/foods/{id}`
- Fields dropped: `packed_food`, `is_inventory`, `stock_out`, `tax_calc`
- Backend returns `"food updated successfully"` but doesn't persist these 4 fields
- Curl-verified against preprod (food 116799, restaurant cafe103)
- Backend brief filed at `BACKEND_BLOCKERS_BRIEF_2026_07_22.html`
- After FE isDirty fix: user will see Save trigger, but these 4 values will revert on reload until backend is fixed

---

## Next

Part A (FE): Ready for **Gate 3 — Implementation Plan**.
Part B (Backend): Remains **BACKEND-BLOCKED**.
