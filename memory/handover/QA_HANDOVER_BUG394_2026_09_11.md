# QA Handover — BUG-394
**Date:** 2026-09-11
**Item:** BUG-394 — Number inputs: special chars corrupt data + zero not cleared on focus
**Sprint:** pos_7_0
**Risk:** HIGH (4 files, number input data path across menu management)

---

## 1. What Was Changed

| Edit | File | Line | Change |
|---|---|:---:|---|
| E1 | `ProductForm.jsx` | 18 | InputField `onChange` — `parseFloat\|\|0` → NaN guard (covers all 10 number fields) |
| E3c | `ProductForm.jsx` | 103 | VariationOptionRow `optionPrice` `onChange` — raw string → numeric string guard |
| E6e | `ProductForm.jsx` | 107 | VariationOptionRow `optionPrice` `onFocus` — zero-clear |
| E1b | `ProductForm.jsx` | 178 | Variation `min` `onChange` — `parseInt\|\|0` → NaN guard |
| E6f | `ProductForm.jsx` | 178 | Variation `min` `onFocus` — zero-clear |
| E1c | `ProductForm.jsx` | 183 | Variation `max` `onChange` — `parseInt\|\|0` → NaN guard |
| E6g | `ProductForm.jsx` | 183 | Variation `max` `onFocus` — zero-clear |
| E2+E6a | `BulkEditor.jsx` | 1403 | renderCell number `onChange` guard + `onFocus` zero-clear |
| E3a | `AddonManagementPanel.jsx` | 156 | `addForm.price` `onChange` — raw string → number guard (**BLOCKER fixed**) |
| E4a+E6b | `AddonManagementPanel.jsx` | 158 | `addForm.weight` `onChange` guard + `onFocus` zero-clear |
| E3b+E6c | `AddonManagementPanel.jsx` | 237 | `editForm.price` `onChange` guard + `onFocus` zero-clear |
| E4b+E6d | `AddonManagementPanel.jsx` | 239 | `editForm.weight` `onChange` guard + `onFocus` zero-clear |
| E5 | `VariationExpandPanel.jsx` | 54 | expand price `onChange` — `parseFloat\|\|0` → NaN guard |
| E6h | `VariationExpandPanel.jsx` | 56 | expand price `onFocus` — zero-clear |

**Special char block pattern (Option A — silent reject):**
```js
const n = parseFloat(e.target.value);
if (!isNaN(n) && n >= 0) setter(n);
```

**Zero-clear pattern:**
```js
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }}
```

---

## 2. Test Cases

| # | ID | Description | Steps | Expected |
|---|---|---|---|---|
| 1 | V1 | ProductForm base Price — type `-` | Menu Mgmt → Edit item → price field → type `-` | Field stays unchanged (silent block) |
| 2 | V2 | ProductForm Tax% — type `abc` | Menu Mgmt → Edit item → tax% → type `abc` | Field stays unchanged |
| 3 | V3 | ProductForm Price — type `5.5` → save | Menu Mgmt → Edit item → price `5.5` → save | Saves correctly, network shows `price: 5.5` |
| 4 | V4 | ProductForm Price — focus on `0` → clears | Edit item → click price field showing `0` | Field clears to empty |
| 5 | V5 | BulkEditor price cell — focus `0` → clear → type `250` | Bulk Edit → click cell with `0` | Clears, then `250` shows correctly |
| 6 | V6 | BulkEditor price cell — type `-` | Bulk Edit → focused cell → type `-` | Cell value unchanged |
| 7 | V7 | Addon add price — type `-` | Addons → Add Addon row → price field → type `-` | Field unchanged |
| 8 | V8 | Addon edit price — focus `0` → clears; type `-` blocked | Addons → edit row → click price `0` | Clears; `-` blocked |
| 9 | V9 | Addon add price — type `5.5` → save → Network check | Addons → add price `5.5` → save | Network shows `price: 5.5` (number, not string `"5.5"`) |
| 10 | V10 | Addon add weight — focus `0` → clears → `250` | Addons → add → click weight | Clears, `250` accepted |
| 11 | V11 | VariationExpandPanel — focus `0` → clears; `-` blocked | BulkEditor → expand variation → price | Clears on focus; `-` blocked |
| 12 | V12 | VariationOptionRow `+` upcharge — `-` blocked | ProductForm → variations → option price | Silent block |
| 13 | V13 | Variation min — focus `0` → clears; `-` blocked | ProductForm → variation → Min field | Clears; `-` blocked |
| 14 | V14 | Variation max — focus `0` → clears; `-` blocked | ProductForm → variation → Max field | Clears; `-` blocked |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | BUG-392 onWheel still blocks scroll-change on all 4 files | onWheel preserved — verify scroll on focused price doesn't change value |
| R2 | Valid decimal `1.5` accepted everywhere | NaN guard allows valid floats |
| R3 | InputField `onBlur` restores `0` when field left empty (ProductForm) | `onBlur` at L22 unchanged — clears field → blur → `onChange(0)` fires |
| R4 | BUG-391: Aggregator tax field still read-only | ProductForm tax section untouched by BUG-394 |
| R5 | Menu save still completes without API errors | Financial values sent as numbers — backend expects numbers |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- Item: BUG-394
- Sprint: pos_7_0
- Gate: 5 (IMPLEMENTED)
- EXIT GATE: **5/5 PASS**
  - ☑ 1. registry.json: BUG-394 → gate 5, IMPLEMENTED, pos_7_0
  - ☑ 2. BUG_TRACKER.md: Last Updated 2026-09-11 prepended
  - ☑ 3. FILE_OWNERSHIP.md: all 4 files listed
  - ☑ 4. Code markers: `// BUG-394` on every modified line (18 markers confirmed)
  - ☑ 5. Compile: `webpack compiled successfully` — 0 new warnings

---

## 5. Credentials + Environment

| Account | URL | Use for |
|---|---|---|
| `owner@cafe103.com` / `***` | `https://preprod.mygenie.online` | All V1–R5 (Menu Management → Addons → BulkEditor) |

---

*QA handover by IMPLEMENTATION agent — 2026-09-11*
