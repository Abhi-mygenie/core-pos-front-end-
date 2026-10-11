# Intake — BUG-392
## All Number Inputs Respond to Scroll Wheel — Accidental Value Changes in Menu Management

**Date:** 2026-09-11  
**Registered by:** Investigation Agent (ALPHA v0.7)  
**Source:** OWNER-REPORTED + AGENT-CONFIRMED-IN-CODE  
**Sprint:** pos_7_0 (suggested)  
**Related investigation:** `/app/memory/investigations/INV-SCROLL-WHEEL-NUMBER-INPUTS_INVESTIGATION_REPORT_2026_09_11.md`

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | BUG — UX defect (browser default not overridden) |
| **Severity** | P1 — HIGH (data integrity risk: price changed by ±₹0.01 per scroll tick without user noticing) |
| **Risk** | LOW — pure UX fix, no API/state/business logic changes |
| **Area** | Menu Management — All tabs (ProductForm, ProductCard, BulkEditor, Addons, Variations) |
| **Fast Lane** | ELIGIBLE per file — 5 files, ≤4 line changes each, same pattern, LOW risk |

**Severity rationale:** Price field has `step=0.01`. One accidental scroll tick on a focused price input = ₹0.01 change. 10 ticks = ₹0.10. In BulkEditor with a scrollable grid, scrolling through 200 rows while a price cell is focused silently corrupts the price. Saved changes go to backend without the user realising.

---

## Owner Requirement (verbatim)

> "There's a scroll working which changes the price of the menu by one paisa, two paisa. So we don't want any scroll in any of the tabs."

---

## Root Cause

Browser default behaviour: `<input type="number">` increments/decrements its value by `step` on the wheel event when focused. No `onWheel` prevention exists anywhere in the codebase.

**`grep onWheel` across all 5 menu files → 0 results.**

---

## Full List of Affected Inputs (31 total)

### ProductForm.jsx — 13 inputs

| Field | Line | Via | step |
|-------|------|-----|------|
| Price | 411 | InputField | 0.01 |
| Tax % | 418 | InputField | 0.01 |
| Discount | 423 | InputField | 1 |
| Kcal | 454 | InputField | 1 |
| Prep Time (min) | 563 | InputField | 1 |
| Serve Time (min) | 564 | InputField | 1 |
| Pack Charges | 567 | InputField | 1 |
| Takeaway Charge | 568 | InputField | 1 |
| Delivery Charge | 569 | InputField | 1 |
| Complementary Price | 578 | InputField | 1 |
| Variation Min | 168 | raw `<input>` | 1 |
| Variation Max | 173 | raw `<input>` | 1 |
| Addon Quick-Add Price | 539 | raw `<input>` | 1 |

### ProductCard.jsx — 2 inputs

| Field | Line | step |
|-------|------|------|
| Price | 150 | 1 |
| Tax % | 208 | 0.01 |

### BulkEditor.jsx — 11+ columns (single render function)

All `type="number"` cells rendered via `renderCell()` at line 1318. One fix covers all columns × all rows.

Columns: Price (0.01), Tax% (0.01), Discount (0.01), Comp. Price (0.01), Prep Time, Serve Time, Pack Charges (0.01), Takeaway Charge (0.01), Delivery Charge (0.01), Sort Order, Kcal

> **WORST CASE:** BulkEditor has its own scroll container. Scrolling the grid while a price cell is focused silently changes the price.

### AddonManagementPanel.jsx — 4 inputs

Price and Weight inputs in Add and Edit inline forms.

### VariationExpandPanel.jsx — 1 input

Variation option price (step=0.01).

---

## Fix

**Pattern:** `onWheel={(e) => e.target.blur()}`

Removes focus from input on scroll → value does not change → page/grid scrolls normally.

| File | Strategy | Lines |
|------|---------|:-----:|
| `ProductForm.jsx` | Add to `InputField` component (line 16) → fixes 10 at once. Add to 3 raw inputs. | 4 |
| `ProductCard.jsx` | Add to 2 raw `<input type="number">` | 2 |
| `BulkEditor.jsx` | Add to single `renderCell` number input (line 1318) | 1 |
| `AddonManagementPanel.jsx` | Add to 4 raw inputs | 4 |
| `VariationExpandPanel.jsx` | Add to 1 raw input (line 50) | 1 |
| **TOTAL** | | **12** |

---

## Owner Decisions

No open decisions required. Fix is unambiguous. Owner requirement is clear: no scroll on any number input in any tab.

**Ready for Gate 4 GO → Implementation on owner approval.**

---

*Intake complete. No open decisions. Fast Lane eligible per file. Ready for Gate 4 GO.*
