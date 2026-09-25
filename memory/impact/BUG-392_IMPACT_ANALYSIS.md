# Gate 2 — Impact Analysis: BUG-392
## Scroll Wheel Changes Number Input Values Across All Menu Tabs

**Date:** 2026-09-11  
**Agent Role:** PLANNING (Role 2 — AGENT_PROMPT_ALPHA v0.7)  
**Stage:** Impact Analysis (Gate 2)  
**Sprint:** pos_7_0  
**Batch:** A (item 3 of 3)

---

## Header

| Field | Value |
|-------|-------|
| **Code Reality** | NONE — zero `onWheel` handlers across all 5 files. Confirmed by grep. |
| **Conflict Pre-Check** | `ProductForm.jsx` — same file as BUG-390 and CR-373. BUG-392 touches only `InputField` component (line 15) and 3 raw inputs (lines 168, 173, 539). No overlap with BUG-390 (lines 336–360) or CR-373 (lines 361–387). Can be implemented in the SAME session as BUG-390 + CR-373. |
| **Risk Classification** | **LOW** — additive prop only. No state, no API, no business logic, no hotspot files. |

---

## 1. Full Edit Map (12 touches, 5 files)

### FILE 1: `ProductForm.jsx` — 4 touches

| Edit | Line | Current code | Change |
|------|:----:|--------------|--------|
| E1 | 15 | `<input type={type} value=...` | Add `onWheel={type === 'number' ? (e => e.target.blur()) : undefined}` |
| E2 | 168 | `<input type="number" value={variation.min ...` | Add `onWheel={e => e.target.blur()}` |
| E3 | 173 | `<input type="number" value={variation.max ...` | Add `onWheel={e => e.target.blur()}` |
| E4 | 539 | `<input type="number" value={newAddonPrice ...` | Add `onWheel={e => e.target.blur()}` |

> **Note E1:** `InputField` is used for 10 number fields. Adding the handler inside `InputField` (guarded by `type === 'number'`) fixes all 10 in one touch. The `{...props}` spread comes after, so this will NOT be overridden by call-site props.

---

### FILE 2: `ProductCard.jsx` — 2 touches

| Edit | Line | Current code | Change |
|------|:----:|--------------|--------|
| E5 | 150 | `<input type="number" value={form.basePrice...` | Add `onWheel={e => e.target.blur()}` |
| E6 | 208 | `<input type="number" value={form.taxPercentage...` | Add `onWheel={e => e.target.blur()}` |

---

### FILE 3: `BulkEditor.jsx` — 1 touch

| Edit | Line | Current code | Change |
|------|:----:|--------------|--------|
| E7 | 1318 | `return <input type="number" value={row[col.key]...` | Add `onWheel={e => e.target.blur()}` |

> **Note E7:** This single line covers ALL numeric columns in ALL rows of the BulkEditor grid. Most impactful single fix in the batch.

---

### FILE 4: `AddonManagementPanel.jsx` — 4 touches

| Edit | Line | Current code | Change |
|------|:----:|--------------|--------|
| E8 | 156 | `<input type="number" value={addForm.price...` | Add `onWheel={e => e.target.blur()}` |
| E9 | 158 | `<input type="number" value={addForm.weight...` | Add `onWheel={e => e.target.blur()}` |
| E10 | 237 | `<input type="number" value={editForm.price...` | Add `onWheel={e => e.target.blur()}` |
| E11 | 239 | `<input type="number" value={editForm.weight...` | Add `onWheel={e => e.target.blur()}` |

---

### FILE 5: `VariationExpandPanel.jsx` — 1 touch

| Edit | Line | Current code | Change |
|------|:----:|--------------|--------|
| E12 | 49 | `<input type="number" min="0" step="0.01"...` | Add `onWheel={e => e.target.blur()}` |

---

## 2. Inputs Fixed Per File

| File | Inputs fixed | Columns/fields |
|------|:-----------:|----------------|
| `ProductForm.jsx` (InputField) | 10 | Price, Tax%, Discount, Kcal, Prep Time, Serve Time, Pack Charges, Takeaway Charge, Delivery Charge, Comp. Price |
| `ProductForm.jsx` (raw) | 3 | Variation Min, Variation Max, New Addon Price |
| `ProductCard.jsx` | 2 | Price, Tax% |
| `BulkEditor.jsx` | 11 columns × N rows | All numeric grid columns |
| `AddonManagementPanel.jsx` | 4 | Add Price, Add Weight, Edit Price, Edit Weight |
| `VariationExpandPanel.jsx` | 1 | Variation option Price |
| **TOTAL** | **31** | |

---

## 3. Downstream Consumers

None. `onWheel={e => e.target.blur()}` is a pure browser-event handler. It:
- Does NOT change `value`
- Does NOT trigger `onChange`
- Does NOT affect form state
- Does NOT affect API calls
- Keyboard arrow-key increment still works (focus must be active for keyboard)

---

## 4. Blast Radius

| Metric | Value |
|--------|-------|
| Files to modify | 5 |
| Line touches | 12 |
| New files | 0 |
| New state | NONE |
| API changes | NONE |
| Risk | LOW |
| Hotspot | NO |
| Financial / Tax | NO |
| Rule R6 | NO |

---

## 5. Execution Order Within Batch A

Since `ProductForm.jsx` is touched by all 3 items:
1. ✅ BUG-390 (lines 336–360) — no overlap with BUG-392
2. ✅ CR-373 (lines 361–387) — no overlap with BUG-392
3. ✅ BUG-392 (lines 15, 168, 173, 539) — no overlap with BUG-390 or CR-373

**All 3 can be coded in the same session. No merge conflict risk.**

---

## 6. Verification Matrix

| # | Check | Method |
|---|-------|--------|
| V1 | Price field in ProductForm — scroll = no change | Focus price → scroll → value unchanged |
| V2 | Tax% field in ProductForm — scroll = no change | Focus tax% → scroll → value unchanged |
| V3 | BulkEditor Price cell — scroll grid = no price change | Click price cell → scroll grid → price unchanged |
| V4 | ProductCard quick-edit Price — scroll = no change | Focus price in card → scroll → unchanged |
| V5 | Addon Price (add form) — scroll = no change | Focus addon price → scroll → unchanged |
| V6 | Variation option price — scroll = no change | Focus var price → scroll → unchanged |
| V7 | Keyboard up/down still works (not broken) | Focus price → press ↑ → value increments |
| V8 | Page/grid still scrolls after scroll-on-input | Focus price → scroll → grid scrolls |

---

## 7. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-392 → status: IMPLEMENTED, sprint_key: pos_7_0
- [ ] BUG_TRACKER.md: BUG-392 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 5 files → BUG-392 E1–E12
- [ ] Code marker: // BUG-392 on each edited line
```

---

*Gate 2 complete. Code Reality: NONE. Risk: LOW. 5 files, 12 line touches. Same-session safe with BUG-390 + CR-373. Awaiting Gate 4 GO.*
