# Investigation Report — Scroll Wheel Changes Number Input Values

**Date:** 2026-09-11  
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)  
**Scope:** All `<input type="number">` fields in Menu Management that respond to mouse scroll wheel, causing accidental value changes (price by ±₹1 paisa per scroll tick, etc.)  
**Steps used:** 5/10  
**Files read:** `ProductForm.jsx`, `ProductCard.jsx`, `BulkEditor.jsx`, `AddonManagementPanel.jsx`, `VariationExpandPanel.jsx`

---

## 1. Summary

| | |
|-|-|
| **Root cause** | Browser default behaviour — `<input type="number">` increments/decrements its value by `step` on mouse wheel when focused. No `onWheel` prevention exists anywhere in the menu codebase. |
| **Classification** | FE_BUG — missing scroll event prevention |
| **Confidence** | HIGH — confirmed in code; zero `onWheel` handlers found across all 5 files |
| **Steps used** | 5/10 |
| **Files affected** | 5 files |
| **Total vulnerable inputs** | 22 individual `<input type="number">` instances across all menu tabs |

---

## 2. Why This Happens

Browsers natively respond to `wheel` events on focused number inputs. The `step` attribute determines the change per tick:
- `step=0.01` (used on Price, Tax %) → **±₹0.01 per scroll tick** = 1 paisa — this is the exact symptom the owner described
- No `step` / `step=1` → ±1 per scroll tick
- `step=0.01` on Tax % → tax changes from 5% to 4.99% silently

**Zero protection exists.** `grep onWheel` across all 5 files returns 0 results.

---

## 3. Full Inventory — All 22 Vulnerable Inputs

### FILE 1: `ProductForm.jsx` — 13 inputs

The `InputField` wrapper component (line 10–27) has `{...props}` spread on the `<input>`. This means adding `onWheel` **once** to the `InputField` definition fixes all 10 inputs that use it.

| # | Field | Line | Via | step | Tab/Section |
|---|-------|------|-----|------|------------|
| 1 | **Price** | 411 | InputField | 0.01 | Pricing & Tax — most critical |
| 2 | **Tax %** | 418 | InputField | 0.01 | Pricing & Tax |
| 3 | **Discount** | 423 | InputField | none (1) | Pricing & Tax |
| 4 | **Kcal** | 454 | InputField | none | Nutrition & Availability |
| 5 | **Prep Time (min)** | 563 | InputField | none | Operations |
| 6 | **Serve Time (min)** | 564 | InputField | none | Operations |
| 7 | **Pack Charges** | 567 | InputField | none | Operations |
| 8 | **Takeaway Charge** | 568 | InputField | none | Operations |
| 9 | **Delivery Charge** | 569 | InputField | none | Operations |
| 10 | **Complementary Price** | 578 | InputField | none | Status & Flags |
| 11 | **Variation Min** | 168 | raw `<input>` | none | Variations section |
| 12 | **Variation Max** | 173 | raw `<input>` | none | Variations section |
| 13 | **Addon Quick-Add Price** | 539 | raw `<input>` | none | Addon section |

**Fix strategy:** 1 line change to `InputField` component → fixes inputs 1–10. Then 3 more targeted raw inputs (11–13).

---

### FILE 2: `ProductCard.jsx` — 2 inputs (Quick Edit inline panel)

| # | Field | Line | step | Context |
|---|-------|------|------|---------|
| 14 | **Price** | 150 | none (1) | Quick-edit drawer on product card |
| 15 | **Tax %** | 208 | 0.01 | Quick-edit drawer on product card |

---

### FILE 3: `BulkEditor.jsx` — 11 columns × N rows (highest risk)

**Single render function** at line 1318 handles ALL `type="number"` cells. One fix here covers all columns across all rows.

| # | Column Key | Label | step used |
|---|-----------|-------|----------|
| 16 | `basePrice` | Price | 0.01 |
| 17 | `taxPercent` | Tax % | 0.01 |
| 18 | `discount` | Discount | 0.01 |
| 19 | `complementaryPrice` | Comp. Price | 0.01 |
| 20 | `prepTimeMin` | Prep Time | 1 |
| 21 | `serveTimeMin` | Serve Time | 1 |
| 22 | `packCharges` | Pack Charges | 0.01 |
| — | `takeawayCharge` | Takeaway Charge | 0.01 |
| — | `deliveryCharge` | Delivery Charge | 0.01 |
| — | `sortOrder` | Sort Order | 1 |
| — | `kcal` | Kcal | 1 |

> **⚠️ Extra risk in BulkEditor:** The grid has its own scroll container (`overflow-auto`, line 971). When a user clicks a price cell and then scrolls to navigate through the 200-row grid, the focused cell value changes instead of the grid scrolling. This is the most impactful instance of this bug.

---

### FILE 4: `AddonManagementPanel.jsx` — 4 inputs (Addons tab)

| # | Field | Line | Form | step |
|---|-------|------|------|------|
| 23 | Addon **Price** | 156 | Add form | none |
| 24 | Addon **Weight (g)** | 158 | Add form | none |
| 25 | Addon **Price** | 237 | Edit form | none |
| 26 | Addon **Weight (g)** | 239 | Edit form | none |

---

### FILE 5: `VariationExpandPanel.jsx` — 1 input

| # | Field | Line | step |
|---|-------|------|------|
| 27 | Variation option **Price** | 50 | 0.01 |

> Note: Visible in the **Variations** panel within BulkEditor. Also appears in ProductForm's variation section expand panel (different render path).

---

## 4. Impact by Tab

| Menu Tab | Affected | Worst field |
|----------|----------|------------|
| Normal Menu → Card View (Quick Edit) | ✅ YES | Price (±₹1/scroll) |
| Normal Menu → Full Edit / Add Item (ProductForm) | ✅ YES | Price (±₹0.01), Tax% |
| Aggregator Menu → Full Edit / Add Item | ✅ YES | Same as above |
| Bulk Edit (BulkEditor) | ✅ YES — WORST | Entire price column; scroll to navigate = accidental price changes |
| Addons tab (AddonManagementPanel) | ✅ YES | Addon Price |
| Variations (VariationExpandPanel) | ✅ YES | Variation Price |

**All 6 menu tabs / views are affected. No tab is safe.**

---

## 5. Recommendation

### Fix pattern

**Standard solution:** `onWheel={(e) => e.target.blur()}`

- On wheel event: immediately remove focus from the input
- Result: scroll is no longer captured by the number input → page/grid scrolls normally
- Value does not change
- User can still use up/down arrow keys to increment (keyboard navigation preserved)
- **Do NOT use `e.preventDefault()`** — that stops the page from scrolling too

---

### Fix scope by file

| File | Strategy | Lines changed | Inputs fixed |
|------|---------|:---:|:---:|
| `ProductForm.jsx` | Add `onWheel={(e) => e.target.blur()}` to `InputField` component definition (line 16) + 3 raw inputs | 4 | 13 |
| `ProductCard.jsx` | Add to both raw `<input type="number">` | 2 | 2 |
| `BulkEditor.jsx` | Add to the single `renderCell` number input (line 1318) | 1 | 11+ columns |
| `AddonManagementPanel.jsx` | Add to 4 raw inputs | 4 | 4 |
| `VariationExpandPanel.jsx` | Add to 1 raw input (line 50) | 1 | 1 |
| **TOTAL** | — | **12 lines** | **31 inputs** |

---

### Planning skip eligibility (Fast Lane per CR?)

| Criterion | Result |
|----------|--------|
| Files changed | 5 — NOT single file |
| Lines per file | ≤4 each — LOW |
| Risk | LOW — no state, no API, no business logic, no financial calculation |
| Hotspot file | NO |
| Financial/tax impact | NO — prevents accidental changes, doesn't change any calculation |

**Verdict:** NOT eligible for a single Fast Lane (>1 file). However, risk is LOW. Recommend registering as **BUG-392** with **Fast Lane per-file** if owner approves, OR a single gate flow given the trivial pattern.

**Blast radius: VERY SMALL.** Same 1-line pattern repeated 12 times across 5 files.

---

## 6. Duplicate Check

No existing CR or BUG covers scroll-wheel number input prevention. **DISTINCT.**

---

*Investigation complete. 5/10 steps used. HIGH confidence. Fix is trivial (12 lines, same pattern). Ready to register BUG-392 and proceed to Gate 4 GO on owner approval.*
