# Gate 3 — Implementation Plan: BUG-394
## Number Inputs — Special Chars + Zero-Clear on Focus (4 Files)

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 3)
**Protocol:** AGENT_PROMPT_ALPHA v0.7
**IA verified:** All target lines confirmed — no drift.
**Scope extension (entry check):** 3 additional onChange sites found in same files during entry verification: ProductForm VariationOptionRow L100 (raw string, P3 pattern) + variation min L170 + variation max L175 (parseInt||0, P1 pattern). Same 4 files, no new hotspots, risk unchanged — included below.

---

## Standard Patterns (applied across all edits)

### Pattern A — Special char block (`onChange` fix, Option A)
```js
// REPLACE broken handler with:
const n = parseFloat(e.target.value);
if (!isNaN(n) && n >= 0) setter(n); // BUG-394: block special chars — silent reject (Option A)
```
- `parseFloat("")` = NaN → guard rejects (user cleared field — onBlur restores 0 where needed)
- `parseFloat("-")` = NaN → guard rejects (silently blocked)
- `parseFloat("abc")` = NaN → guard rejects
- `parseFloat("5.5")` = 5.5 → `!isNaN(5.5) && 5.5 >= 0` → propagated ✅

### Pattern B — Zero-clear (`onFocus` addition)
```js
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} // BUG-394
```
Matches the existing `InputField` onFocus pattern at L19. Direct DOM mutation — no onChange fired.

---

## FILE 1 — `src/components/panels/menu/ProductForm.jsx`

### E1 — InputField component `onChange` (L18)

**Current:**
```jsx
onChange={(e) => onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
```

**New:**
```jsx
onChange={(e) => { // BUG-394
  if (type !== "number") { onChange(e.target.value); return; }
  const n = parseFloat(e.target.value);
  if (!isNaN(n) && n >= 0) onChange(n);
}}
```

> Covers all 10 `InputField` number fields in one touch (Price, Tax%, Discount, Kcal, Prep/Serve Time, Pack/Takeaway/Delivery Charge, Complementary Price).
> Existing `onFocus` (L19) and `onBlur` (L20) remain **unchanged** — they handle zero-clear and empty→0 restore.

---

### E3c — VariationOptionRow `optionPrice` onChange (L99) ← scope extension
<!-- LINE UPDATED 2026-09-11: was L100 — BUG-392 addendum inserted onWheel at L100, shifting onChange to L99 -->

**Current (L99):**
```jsx
onChange={(e) => onChange({ ...option, optionPrice: e.target.value })}
```

**New:**
```jsx
onChange={(e) => { // BUG-394: block special chars + keep optionPrice as numeric string
  const n = parseFloat(e.target.value);
  if (!isNaN(n) && n >= 0) onChange({ ...option, optionPrice: String(n) });
}}
```

> `optionPrice` stored as numeric string (e.g. `"5"`) to preserve existing type contract with downstream transforms.

---

### E6e — VariationOptionRow `onFocus` zero-clear (L99 area — same `<input>` as E3c)

**Add to the same `<input>` as E3c:**
```jsx
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} // BUG-394
```

---

### E1b — Variation Min `onChange` (L170) ← scope extension

**Current (L170):**
```jsx
onChange={(e) => updateField('min', parseInt(e.target.value) || 0)} // BUG-392
```

**New:**
```jsx
onChange={(e) => { const n = parseInt(e.target.value); if (!isNaN(n) && n >= 0) updateField('min', n); }} // BUG-392 // BUG-394
```

---

### E6f — Variation Min `onFocus` zero-clear (L170, same `<input>`)

**Add:**
```jsx
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} // BUG-394
```

---

### E1c — Variation Max `onChange` (L175) ← scope extension

**Current (L175):**
```jsx
onChange={(e) => updateField('max', parseInt(e.target.value) || 0)} // BUG-392
```

**New:**
```jsx
onChange={(e) => { const n = parseInt(e.target.value); if (!isNaN(n) && n >= 0) updateField('max', n); }} // BUG-392 // BUG-394
```

---

### E6g — Variation Max `onFocus` zero-clear (L175, same `<input>`)

**Add:**
```jsx
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} // BUG-394
```

---

## FILE 2 — `src/components/panels/menu/BulkEditor.jsx`

### E2 + E6a — renderCell number input (L1403) — onChange + onFocus on same line

**Current (L1403):**
```jsx
return <input type="number" value={row[col.key] ?? 0} onWheel={e => e.target.blur()} onChange={e => updateCell(row._id, col.key, Number(e.target.value))} // BUG-392
```

**New:**
```jsx
return <input type="number" value={row[col.key] ?? 0} onWheel={e => e.target.blur()} onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) updateCell(row._id, col.key, n); }} // BUG-392 // BUG-394
```

> Both E2 (onChange) and E6a (onFocus) applied to the same `<input>`. One edit site.
> `onWheel` from BUG-392 preserved.

---

## FILE 3 — `src/components/panels/menu/AddonManagementPanel.jsx`

### E3a + (no onFocus for add price — starts as `''` not `0`) — addForm price onChange (L156)

**Current (L156):**
```jsx
<input type="number" value={addForm.price} onWheel={e => e.target.blur()} onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))} // BUG-392}
```

**New:**
```jsx
<input type="number" value={addForm.price} onWheel={e => e.target.blur()} onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) setAddForm(p => ({ ...p, price: n })); }} // BUG-392 // BUG-394
```

> `addForm.price` changes type: `''` (initial) stays `''` until first valid keystroke, then becomes a number.
> No `onFocus` here — `EMPTY_ADD.price = ''`, the input shows placeholder text (not `0`), so zero-clear not needed.

---

### E4a + E6b — addForm weight onChange + onFocus (L158)

**Current (L158):**
```jsx
<input type="number" value={addForm.weight} onWheel={e => e.target.blur()} onChange={e => setAddForm(p => ({ ...p, weight: Number(e.target.value) }))} // BUG-392
```

**New:**
```jsx
<input type="number" value={addForm.weight} onWheel={e => e.target.blur()} onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) setAddForm(p => ({ ...p, weight: n })); }} // BUG-392 // BUG-394
```

---

### E3b + E6c — editForm price onChange + onFocus (L237)

**Current (L237):**
```jsx
<input type="number" value={editForm.price} onWheel={e => e.target.blur()} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} // BUG-392
```

**New:**
```jsx
<input type="number" value={editForm.price} onWheel={e => e.target.blur()} onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) setEditForm(p => ({ ...p, price: n })); }} // BUG-392 // BUG-394
```

> `editForm.price` changes type: previously string (from `a.price`), now number. Downstream save at L69 sends `price: editForm.price` directly — backend gets a number, which is correct.

---

### E4b + E6d — editForm weight onChange + onFocus (L239)

**Current (L239):**
```jsx
<input type="number" value={editForm.weight} onWheel={e => e.target.blur()} onChange={e => setEditForm(p => ({ ...p, weight: Number(e.target.value) }))} // BUG-392
```

**New:**
```jsx
<input type="number" value={editForm.weight} onWheel={e => e.target.blur()} onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) setEditForm(p => ({ ...p, weight: n })); }} // BUG-392 // BUG-394
```

---

## FILE 4 — `src/components/panels/menu/VariationExpandPanel.jsx`

### E5 + E6h — variation option price onChange + onFocus (L54 onChange, add onFocus after)

**Current (L54):**
```jsx
onChange={e => onPriceChange(gIdx, vIdx, parseFloat(e.target.value) || 0)}
```

**New (L54):**
```jsx
onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) onPriceChange(gIdx, vIdx, n); }} // BUG-394
```

**Add after `onWheel` (L56 area) — new line:**
```jsx
onFocus={e => { if (e.target.value === '0' || e.target.value === 0) e.target.value = ''; }} // BUG-394
```

> `onWheel` at L56 (BUG-392 addendum) remains untouched.

---

## Summary Table

| Edit | File | Line | Pattern fixed | Type |
|------|------|:----:|--------------|------|
| E1 | `ProductForm.jsx` | 18 | `parseFloat(x)\|\|0` → guard (10 InputField fields) | onChange |
| E1b ← new | `ProductForm.jsx` | 170 | `parseInt(x)\|\|0` → guard (variation min) | onChange |
| E1c ← new | `ProductForm.jsx` | 175 | `parseInt(x)\|\|0` → guard (variation max) | onChange |
| E3a | `AddonManagementPanel.jsx` | 156 | raw string → number guard (add price) **BLOCKER** | onChange |
| E3b | `AddonManagementPanel.jsx` | 237 | raw string → number guard (edit price) **BLOCKER** | onChange |
| E3c ← new | `ProductForm.jsx` | 99 ~~100~~ | raw string → numeric string guard (option upcharge) | onChange |
| E4a | `AddonManagementPanel.jsx` | 158 | `Number(x)` → guard (add weight) | onChange |
| E4b | `AddonManagementPanel.jsx` | 239 | `Number(x)` → guard (edit weight) | onChange |
| E2 | `BulkEditor.jsx` | 1403 | `Number(x)` → guard (all grid cells) | onChange |
| E5 | `VariationExpandPanel.jsx` | 54 | `parseFloat(x)\|\|0` → guard (expand price) | onChange |
| E6a | `BulkEditor.jsx` | 1403 | add onFocus zero-clear | onFocus |
| E6b | `AddonManagementPanel.jsx` | 158 | add onFocus zero-clear (add weight) | onFocus |
| E6c | `AddonManagementPanel.jsx` | 237 | add onFocus zero-clear (edit price) | onFocus |
| E6d | `AddonManagementPanel.jsx` | 239 | add onFocus zero-clear (edit weight) | onFocus |
| E6e | `ProductForm.jsx` | 100 area | add onFocus zero-clear (option upcharge) | onFocus |
| E6f | `ProductForm.jsx` | 170 | add onFocus zero-clear (variation min) | onFocus |
| E6g | `ProductForm.jsx` | 175 | add onFocus zero-clear (variation max) | onFocus |
| E6h | `VariationExpandPanel.jsx` | 54 area | add onFocus zero-clear (expand price) | onFocus |

**Total: 18 edit sites across 4 files. All in same files declared in IA. No new files.**

---

## Execution Order

```
1. ProductForm.jsx   → E1, E1b, E1c, E3c, E6e, E6f, E6g  (5 onChange + 3 onFocus = 6 <input> touches)
2. BulkEditor.jsx    → E2 + E6a                            (1 line: onChange + onFocus together)
3. AddonManagementPanel.jsx → E3a, E3b, E4a, E4b, E6b, E6c, E6d  (4 lines × onChange + 3 × onFocus)
4. VariationExpandPanel.jsx → E5 + E6h                    (1 onChange + 1 onFocus)
```

Compile check after each file. No merge conflict risk — all edits are on different lines or clearly scoped props within the same `<input>` element.

---

## Verification Matrix

| # | Edit | Verify | Method |
|---|------|--------|--------|
| V1 | E1 | Type `-` in ProductForm base Price → field blocked | Menu Mgmt → Edit item → price |
| V2 | E1 | Type `abc` in Tax% → field blocked | same |
| V3 | E1 | Type `5.5` → saves correctly | save + network tab |
| V4 | E1 | Focus on `0` price → clears (existing onFocus untouched) | focus price field |
| V5 | E2+E6a | BulkEditor price cell: focus on `0` → clears → type `250` → shows `250` | Bulk Editor |
| V6 | E2+E6a | BulkEditor price cell: type `-` → blocked | same |
| V7 | E3a | Addon add price: type `-` → blocked | Addons → Add Addon |
| V8 | E3b+E6c | Addon edit price: focus 0 → clears; type `-` → blocked | Addons → edit row |
| V9 | E3a | Addon add price: type `5.5` → save → Network shows `price: 5.5` (number not string) | Network tab |
| V10 | E4a+E6b | Addon add weight: focus `0` → clears → type `250` → shows `250` | same |
| V11 | E5+E6h | VariationExpandPanel: focus `0` → clears; type `-` → blocked | BulkEditor → expand |
| V12 | E3c+E6e | VariationOptionRow `+` field: focus `0` → clears; type `-` → blocked | ProductForm → variations |
| V13 | E1b+E6f | Variation min: focus `0` → clears; type `-` → blocked | ProductForm → variations |
| V14 | E1c+E6g | Variation max: focus `0` → clears; type `-` → blocked | same |
| V15 | Regression | BUG-392 onWheel still works on all 4 files — scroll doesn't change value | scroll on focused price |
| V16 | Regression | Valid decimal `1.5` accepted correctly everywhere | type `1.5`, check state |
| V17 | Regression | onBlur in InputField still restores `0` when field left empty | focus price → clear → blur |
| V18 | Compile | webpack `0` new warnings | `tail frontend.out.log` |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-394 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
- [ ] BUG_TRACKER.md: BUG-394 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 4 files listed → BUG-394 E1–E6 + date
- [ ] Code markers: // BUG-394 on every modified line
- [ ] Compile: webpack 0 new warnings
```

---

## Scope Lock

**Files WILL change:**
- `src/components/panels/menu/ProductForm.jsx` — E1, E1b, E1c, E3c, E6e, E6f, E6g (7 edit sites)
- `src/components/panels/menu/BulkEditor.jsx` — E2 + E6a (1 line, combined)
- `src/components/panels/menu/AddonManagementPanel.jsx` — E3a, E3b, E4a, E4b, E6b, E6c, E6d (4 lines)
- `src/components/panels/menu/VariationExpandPanel.jsx` — E5 + E6h (1 `<input>` block)

**Files will NOT touch:**
- `menuManagementTransform.js`, `addonService.js`, any API service, context, or state file

---

*Gate 3 complete. 4 files, 18 edit sites (10 onChange + 8 onFocus). Scope extension declared: E1b, E1c, E3c (same files, same patterns, no new hotspots). Awaiting Gate 4 GO → Implementation.*
*PLANNING Agent — ALPHA v0.7 — 2026-09-10*

---
**PLAN VALIDATION — 2026-09-11 (PLANNING agent re-run)**
All 18 edit sites verified against live code.
- 17/18 exact match ✅
- E3c: L100 corrected to L99 (BUG-392 addendum inserted onWheel at L100 post-plan) ⚠️ UPDATED
- Conflict check: BUG-391 (ProductForm tax lines), BUG-392 addendum (L100 onWheel), BUG-374/371 (BulkEditor/VariationExpandPanel) — ALL parallel-safe, no new conflicts
- Plan is CURRENT and IMPLEMENTATION-READY
