# BUG-248 — Implementation Plan (Part A: FE isDirty + portionSize)

**ID:** BUG-248
**Stage:** Gate 3 — Implementation Plan
**Date:** 2026-07-25
**Risk:** LOW
**Impact Analysis:** `/app/memory/impact/BUG-248_IMPACT_ANALYSIS.md`
**Owner Decisions:** OQ-1 RESOLVED — add `portion_size` to `buildPayload` (Option A).

---

## 1. Scope Lock

### Files WILL change:
| File | Function | Change |
|------|----------|--------|
| `components/panels/menu/BulkEditor.jsx` | `isDirty` (L261-288) | Add 9 entries to `checks` object |
| `components/panels/menu/BulkEditor.jsx` | `buildPayload` (L155-167) | Add `portion_size` field |

### Files will NOT touch:
- `MenuManagementPanel.jsx`
- `buildRow` function
- `ALL_COLUMNS` definition
- `CellRenderer`
- `handleSave`
- Any other file

---

## 2. Edits (exact, line-level)

### Edit 1 — isDirty: add 9 missing checks (L287 → L288)

**Current state (line 287):**
```js
      kcal:        () => (o.kcal || 0) !== Number(row.kcal),
    };
```

**New state (insert 9 lines between L287 and L288):**
```js
      kcal:        () => (o.kcal || 0) !== Number(row.kcal),
      // BUG-248: 9 missing isDirty checks — edits to these columns were silently lost
      packedFood:  () => (o.packedFood ? "Yes" : "No") !== row.packedFood,
      isInventory: () => (o.isInventory ? "Yes" : "No") !== row.isInventory,
      stockOut:    () => (o.isOutOfStock ? "Yes" : "No") !== row.stockOut,
      isDisabled:  () => (o.isDisabled ? "Yes" : "No") !== row.isDisabled,
      taxCalc:     () => (o.taxCalc || "Exclusive") !== row.taxCalc,
      itemUnit:    () => (o.itemUnit || "") !== (row.itemUnit || ""),
      availableTimeStart: () => (o.availableTimeStart || "00:00:00") !== row.availableTimeStart,
      availableTimeEnd:   () => (o.availableTimeEnd || "23:59:59") !== row.availableTimeEnd,
      portionSize: () => (o.portionSize || "") !== (row.portionSize || ""),
    };
```

**Execution method:** `search_replace` — old_str = `kcal:` line + `};`, new_str = `kcal:` line + 9 new entries + `};`

**Notes:**
- `stockOut` references `o.isOutOfStock` (not `o.stockOut`) — mirrors `buildRow` L100 where the original food object field is `isOutOfStock`
- All 9 patterns mirror the corresponding `buildRow` mapping (L98-L124) for consistent comparison logic
- Comment with `// BUG-248` for traceability per R18

### Edit 2 — buildPayload: add `portion_size` (after L167)

**Current state (lines 166-168):**
```js
  item_unit: row.itemUnit || '',
  item_unit_price: ['Kg','gm','L','ml'].includes(row.itemUnit) ? String(Number(row.basePrice) || 0) : '',
});
```

**New state:**
```js
  item_unit: row.itemUnit || '',
  item_unit_price: ['Kg','gm','L','ml'].includes(row.itemUnit) ? String(Number(row.basePrice) || 0) : '',
  portion_size: row.portionSize || '', // BUG-248: was missing from payload
});
```

**Execution method:** `search_replace` — old_str ends `});`, new_str adds `portion_size` line before `});`

---

## 3. Execution Sequence

1. Edit 1 — isDirty checks (L287-288)
2. Edit 2 — buildPayload portionSize (L167-168)
3. Verify webpack compiles (0 new warnings)
4. Self-test (see §4)
5. EXIT GATE (see §5)

---

## 4. Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | BulkEditor.jsx:isDirty | 9 new checks | grep: 9 new keys exist in checks object | YES (grep) |
| 2 | BulkEditor.jsx:buildPayload | +portion_size | grep: `portion_size` in buildPayload | YES (grep) |
| — | BulkEditor.jsx | Compile | `tail /var/log/supervisor/frontend.out.log` → "webpack compiled" | YES |
| — | BulkEditor.jsx:isDirty | All 33 ALL_COLUMNS keys covered | Script: extract ALL_COLUMNS keys, extract checks keys, diff = 0 | YES (python) |
| — | Browser | Edit packedFood only → Save button enables | Preprod: open Bulk Editor, toggle Packaged Item, verify Save count | NO (manual/screenshot) |
| — | Browser | Edit portionSize → Save → reload → value persists | Preprod: edit portion size, save, refresh, verify | NO (manual/screenshot) |

---

## 5. Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: BUG-248 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add BulkEditor.jsx entry for BUG-248
- [ ] Code markers: // BUG-248 comment in BulkEditor.jsx (both edits)
- [ ] Compile check: webpack 0 new warnings
```

---

## 6. Risk Notes

- **No interaction risk:** All 9 new checks are independent arrow functions. Existing checks unchanged.
- **Hotspot caution:** `BulkEditor.jsx` is a conflict zone, but both edits are purely additive inside existing functions (no restructuring, no line shifts in logic).
- **Part B (backend):** After this fix, 4 fields (`packed_food`, `is_inventory`, `stock_out`, `tax_calc`) will correctly trigger Save but backend will drop them. User sees save succeed → values revert on reload. This is a known limitation until backend is fixed. No FE workaround needed.

---

## Next

Awaiting **Gate 4 GO** from owner to proceed to Implementation.
