# Gate 2 — Impact Analysis: BUG-394
## Number Inputs — Special Chars Silent Corruption + Zero Not Cleared on Focus (4 Files)

**Date:** 2026-09-10 (P6 added 2026-09-10 — owner-observed zero-append issue)
**Agent Role:** PLANNING (Role 2 — AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis ONLY (stop here, no implementation plan)
**Sprint:** pos_7_0

---

## Header

| Field | Value |
|-------|-------|
| **Code Reality** | **NONE** — zero sanitisation guards (`isNaN`, `isFinite`, regex) found across all 4 files. All 6 broken patterns confirmed in code. |
| **Conflict Pre-Check** | **CONFLICT** with BUG-392 on 5 lines in 2 files (see §3 below). BUG-392 code already in place — BUG-394 edits the `onChange` handler on lines that carry `// BUG-392` `onWheel` comment. Parallel-safe (different props). BUG-394 MUST be implemented after BUG-392 QA passes (or in same session with full awareness of the cohabiting code). |
| **Risk Classification** | **HIGH** — price/financial fields, API contract violation (AddonManagementPanel sends raw string), hotspot file BulkEditor.jsx (R5) |
| **P6 added** | Owner observed: typing `1` into a zero-defaulted field produces `01` instead of `1`. Root cause: raw `<input type="number">` elements have no `onFocus` zero-clear handler. Same 4 files. Folded into BUG-394. |

---

## 1. Data Flow Trace — Two Root Causes

### Root Cause A — Special character accepted (P1–P5)
```
User types "-" into a price <input type="number">
  ↓
e.target.value = "-"
  ↓
onChange handler fires — NO validation
  ↓
  ┌─ P1/P5: parseFloat("-") = NaN → NaN || 0 = 0  → parent state = 0  (silent)
  ├─ P2/P4: Number("-") = NaN                      → NaN stored in state (silent)
  └─ P3:    e.target.value stored as-is             → state = "-" → API receives "-" (BLOCKER)
  ↓
User sees "0" or no change — no error, no block
Staff saves → backend receives corrupt data
```

### Root Cause B — Zero not cleared on focus (P6)
```
Field renders with default value 0
  ↓
User clicks into the field — NO onFocus handler on raw <input>
  ↓
Zero stays selected / cursor placed after the 0
  ↓
User types "1" → field shows "01" (appended, not replaced)
  ↓
onChange fires with "01" → parseFloat("01") = 1 ✅ (happens to be fine for valid digits)
  BUT:
  → Confusing UX — user must manually delete the 0 first
  → If user types "0.5" → shows "00.5" → value may be misread
  → Inconsistent: InputField DOES clear zero on focus; raw inputs DON'T
```

`InputField` (the reusable component) already has the correct `onFocus` at L19:
```js
onFocus={(e) => { if (type === "number" && (e.target.value === "0" || e.target.value === 0)) e.target.value = ""; }}
```
Every **raw `<input type="number">`** bypassing `InputField` is missing this.

---

## 2. Full Edit Map (4 files — P1–P5 onChange fixes + P6 onFocus additions)

**P1–P5 (special char block) — 7 onChange line-touches**
**P6 (zero-clear on focus) — 7 additional onFocus line-touches (most overlap with P1–P5 sites)**

### FILE 1 — `src/components/panels/menu/ProductForm.jsx`

| Edit | Line | Current code | Severity | What changes |
|------|:----:|--------------|:--------:|--------------|
| **E1** | 18 | `onChange={(e) => onChange(type === "number" ? (parseFloat(e.target.value) \|\| 0) : e.target.value)}` | MAJOR | Replace `parseFloat(x) \|\| 0` with `!isNaN(n) && n >= 0` guard — reject invalid input silently |

> **E1 scope:** `InputField` is a generic reusable component. This single line fix covers **all 10 InputField number fields** in ProductForm:
> Price, Tax%, Discount, Kcal, Prep Time, Serve Time, Pack Charges, Takeaway Charge, Delivery Charge, Complementary Price.
> The existing `onFocus` (clears "0") and `onBlur` (restores 0 if empty) handlers remain unchanged.

---

### FILE 2 — `src/components/panels/menu/BulkEditor.jsx`

| Edit | Line | Current code | Severity | What changes |
|------|:----:|--------------|:--------:|--------------|
| **E2** | 1403 | `onChange={e => updateCell(row._id, col.key, Number(e.target.value))} // BUG-392` | MAJOR | Replace `Number(x)` with guard — `NaN` no longer stored in grid cell state |

> **E2 scope:** This one line covers ALL numeric columns (Price, Tax%, Discount, Pack/Takeaway/Delivery Charge, Prep/Serve Time) across ALL rows of the BulkEditor grid.
>
> ⚠️ **CONFLICT NOTE:** BUG-392 `onWheel` is on this SAME line. Implementation agent must modify the `onChange` handler while preserving the `onWheel` prop already present. The two props are independent — parallel-safe.

---

### FILE 3 — `src/components/panels/menu/AddonManagementPanel.jsx`

| Edit | Line | Current code | Severity | What changes |
|------|:----:|--------------|:--------:|--------------|
| **E3a** | 156 | `onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))} // BUG-392}` | **BLOCKER** | Replace raw string storage with numeric guard — price stored as number, not raw string |
| **E3b** | 237 | `onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} // BUG-392` | **BLOCKER** | Same as E3a — edit mode |
| **E4a** | 158 | `onChange={e => setAddForm(p => ({ ...p, weight: Number(e.target.value) }))} // BUG-392` | MAJOR | Replace `Number(x)` with guard |
| **E4b** | 239 | `onChange={e => setEditForm(p => ({ ...p, weight: Number(e.target.value) }))} // BUG-392` | MAJOR | Same as E4a — edit mode |

> ⚠️ **CONFLICT NOTE (E3a, E3b, E4a, E4b):** ALL 4 lines carry `// BUG-392` `onWheel` prop. Implementation agent modifies the `onChange` prop only. The `onWheel` prop stays intact.
>
> **Type change alert (E3):** `addForm.price` and `editForm.price` currently store raw strings (e.g. `"5.5"`, `"-"`). After fix they store numbers. Downstream save at L52 sends `price: addForm.price` directly — this changes from `"5.5"` (string) to `5.5` (number) in the API payload. **This is correct and desired** — the API expects a number, not a string.

---

### FILE 4 — `src/components/panels/menu/VariationExpandPanel.jsx`

| Edit | Line | Current code | Severity | What changes |
|------|:----:|--------------|:--------:|--------------|
| **E5** | 54 | `onChange={e => onPriceChange(gIdx, vIdx, parseFloat(e.target.value) \|\| 0)}` | MAJOR | Replace `parseFloat(x) \|\| 0` with guard |

> `onWheel` is at line 56 (BUG-392 addendum) — different line, no conflict.

---

### P6 — Zero-Clear `onFocus` — All Raw Number Inputs

| Edit | File | Line | Default value | Fix |
|------|------|:----:|:-------------:|-----|
| **E6a** | `BulkEditor.jsx` | 1403 | `row[col.key] ?? 0` | Add `onFocus={(e) => { if(e.target.value==='0'\|\|e.target.value===0) e.target.value=''; }}` |
| **E6b** | `AddonManagementPanel.jsx` | 158 (add weight) | `0` | Same onFocus |
| **E6c** | `AddonManagementPanel.jsx` | 237 (edit price) | `a.price` (may be 0) | Same onFocus |
| **E6d** | `AddonManagementPanel.jsx` | 239 (edit weight) | `a.weight \|\| 0` | Same onFocus |
| **E6e** | `ProductForm.jsx` | 97 (VariationOptionRow price) | `'0'` | Same onFocus |
| **E6f** | `ProductForm.jsx` | 170 (variation min) | `variation.min \|\| 0` | Same onFocus |
| **E6g** | `ProductForm.jsx` | 175 (variation max) | `variation.max \|\| 0` | Same onFocus |
| **E6h** | `VariationExpandPanel.jsx` | 54 | `val.price ?? 0` | Same onFocus |

> **Note:** `InputField` (ProductForm L19) ✅ already clears zero on focus — no change needed there.
> `AddonManagementPanel` add-mode **price** (L156) starts as `''` (empty string from `EMPTY_ADD`) — placeholder shows, not `0` — **not affected**, skip.

**Scope impact of P6:** Adds `onFocus` props to 8 edit sites across the SAME 4 files. Most overlap with existing E1–E5 sites. No new files introduced.

---

| File | BUG-394 line(s) | Conflict with | Type | Safe? |
|------|:---------------:|--------------|------|:-----:|
| `ProductForm.jsx` | L18 | BUG-391 (L231-450), BUG-392 (L100), BUG-390 (L336-387) | Different lines | ✅ |
| `BulkEditor.jsx` | L1403 | BUG-392 (L1403) — **SAME LINE** | Same line, different prop | ⚠️ Sequential required |
| `AddonManagementPanel.jsx` | L156,158,237,239 | BUG-392 (same lines) — **SAME LINES** | Same lines, different prop | ⚠️ Sequential required |
| `VariationExpandPanel.jsx` | L54 | BUG-392 addendum (L56) | Adjacent lines | ✅ |

**Execution order:** BUG-392 code is already implemented and in place. BUG-394 can be implemented now — it modifies the `onChange` prop on lines where BUG-392 already added the `onWheel` prop. The two props coexist on the same `<input>` element.

---

## 4. Owner Decision Required

### OD-394-01 — UX Approach for Blocking Invalid Input ✅ LOCKED

**Decision: Option A — Silent block on keypress**
**Locked by:** Owner (2026-09-10)

When a user types `-` or letters into a price field:
- The keystroke has **no effect** — field stays at last valid value
- No toast, no red border, no error message
- User tries to type `-`, nothing happens

| Option | UX Behaviour | Complexity | Status |
|--------|-------------|:----------:|--------|
| **Option A — Silent block on keypress** ✅ | Keystroke produces no effect — field does not change | LOW | **CHOSEN** |
| ~~Option B — Show then reset on blur~~ | `-` appears briefly, resets on blur, shows toast | MEDIUM | Rejected |

**Implementation note:** No new UI components, no toast infrastructure, no `onBlur` additions needed.
Scope stays exactly as declared in §8 — 4 files, 7 line-touches only.

---

## 5. Blast Radius

| Metric | Value |
|--------|-------|
| Files to modify | 4 |
| Edit sites (P1–P5 onChange) | 7 line-touches (E1–E5) |
| Edit sites (P6 onFocus) | 8 line-touches (E6a–E6h) |
| **Total edit sites** | **~15 (some overlap — same `<input>` gets both onChange fix + onFocus fix)** |
| New files | 0 |
| New state | NONE |
| API changes | NONE |
| Hotspot files | **YES** — `BulkEditor.jsx` (R5) |
| Financial / Tax logic | YES (price fields) — R6 applies |
| Data type change | YES — `AddonManagementPanel` price state: string → number |
| New npm packages | NONE |

---

## 6. Downstream Consumer Check

| Pattern | State flows to | API impact |
|---------|---------------|-----------|
| P1 `InputField` → `form.basePrice`, `form.taxPercentage`, etc. | `menuManagementTransform.js` `toAPI` | Number already expected — no change |
| P2 `BulkEditor` grid cell | `buildPayload(row)` at L154+ | Number expected — guards NaN from reaching payload |
| P3 `AddonManagementPanel.price` | `addAddon()` / `editAddon()` at L52 | **Was sending string** `"-"` → now sends number ✅ |
| P4 `AddonManagementPanel.weight` | same save handlers | Number expected — guards NaN |
| P5 `VariationExpandPanel.price` | `onPriceChange` → `BulkEditor` dirty state | Number expected — guards silent 0 |

No downstream files outside these 4 are affected.

---

## 7. Verification Matrix (seeds Gate 3 QA handover)

| # | Check | Method | Files |
|---|-------|--------|-------|
| V1 | Type `-` in ProductForm Price field → field does not change | Browser: Menu Mgmt → Edit item → price input | `ProductForm.jsx` |
| V2 | Type `abc` in ProductForm Tax% field → field does not change | Browser: same | `ProductForm.jsx` |
| V3 | Type `-` in BulkEditor price cell → cell does not change | Browser: Menu Mgmt → Bulk Edit → price column | `BulkEditor.jsx` |
| V4 | Type `-` in Addon add-form price → field does not change | Browser: Menu Mgmt → Addons → Add Addon | `AddonManagementPanel.jsx` |
| V5 | Type `-` in Addon edit-form price → save → Network tab shows numeric price | Browser + Network tab | `AddonManagementPanel.jsx` |
| V6 | Type `-` in Variation upcharge → field does not change | Browser: BulkEditor → expand variations | `VariationExpandPanel.jsx` |
| V7 | Valid price `5.5` still saves correctly across all 4 files | Browser: enter valid price, save | All 4 files |
| V8 | `0` entry clears on focus and restores on blur — `InputField` unchanged | Browser: focus on `0` price → type nothing → blur | `ProductForm.jsx` |
| V9 | BulkEditor cell: focus on `0` → field clears → type `1` → shows `1` not `01` | Browser: BulkEditor price cell default | `BulkEditor.jsx` |
| V10 | Addon weight: focus on `0` → clears → type `250` → shows `250` | Browser: Menu Mgmt → Addons | `AddonManagementPanel.jsx` |
| V11 | Variation option price: focus on `0` → clears → type `5` → shows `5` | Browser: ProductForm → Food Variations | `ProductForm.jsx` |
| V12 | VariationExpandPanel: focus on `0` → clears → type `10` → shows `10` | Browser: BulkEditor → expand variations | `VariationExpandPanel.jsx` |
| V13 | BUG-392 `onWheel` still works after BUG-394 edits (scroll does not change value) | Browser: focus price → scroll | `BulkEditor.jsx`, `AddonManagementPanel.jsx` |

---

## 8. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-394 → status: IMPLEMENTED, sprint_key: pos_7_0
- [ ] BUG_TRACKER.md: BUG-394 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 4 files → BUG-394 E1–E5 (date)
- [ ] Code markers: // BUG-394 on each edited line (alongside existing // BUG-392)
- [ ] Compile: webpack 0 new warnings
```

---

## 9. Scope Lock

**Files WILL change:**
- `src/components/panels/menu/ProductForm.jsx` — E1 (line 18 only)
- `src/components/panels/menu/BulkEditor.jsx` — E2 (line 1403 only)
- `src/components/panels/menu/AddonManagementPanel.jsx` — E3a, E3b, E4a, E4b (lines 156, 158, 237, 239)
- `src/components/panels/menu/VariationExpandPanel.jsx` — E5 (line 54 only)

**Files will NOT touch:**
- `menuManagementTransform.js` — no transform change needed
- `addonService.js` — no service change needed
- Any API service, context, or state file

**Scope expansion trigger:** If owner chooses Option B (UX with toast/error on blur) → immediately re-declare scope (adds `onBlur` handlers + toast logic to AddonManagementPanel + VariationExpandPanel).

---

*Gate 2 complete. Code Reality: NONE. Risk: HIGH. 4 files. P1–P5: 7 onChange edits (special char block). P6 added: 8 onFocus edits (zero-clear on focus). OD-394-01 LOCKED — Option A. All owner decisions resolved. Ready for Gate 3 GO.*
*PLANNING Agent — ALPHA v0.7 — 2026-09-10*
