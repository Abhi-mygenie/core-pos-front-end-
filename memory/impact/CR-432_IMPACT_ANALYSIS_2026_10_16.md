# Impact Analysis — CR-432
## Order View: Height-alignment gap when multi-column layout — cards don't attach to where previous card ends

**Role:** PLANNING (Gate 2 — Impact Analysis)
**Date:** 2026-10-16
**Code Reality:** PARTIAL — grid exists, height alignment issue is CSS-only limitation
**Conflict Pre-Check:** BUG-571 (ChannelColumn.jsx L260 filter) — CLEAN, different line. CR-414 (gridTemplateColumns tablet path) — CLEAN, different branch.

---

## 1. Root Cause (CONFIRMED)

**Two linked issues, same root:**

### Issue A — Row-height alignment gap (primary complaint)
`ChannelColumn.jsx:L283` — grid uses `display: grid` with default `align-items: stretch`.

In CSS Grid, all cells in a row are forced to the height of the **tallest card in that row**. When cards have different content heights (card with 1 item vs card with 10 items), shorter cards stretch to fill row height, creating visible blank space at their bottom. The NEXT ROW of cards starts after the tallest card's height — so shorter cards in column 2 have a gap before the next card.

```
Row height = tallest card (e.g., 450px)
Col 1: [Card 300px] + [150px blank]
Col 2: [Card 450px]                   ← tallest
Col 3: [Card 200px] + [250px blank]

Next row starts at 450px + gap:
Col 1: [Card 4 starts at 458px]  ← 158px BELOW where Card 1 ended
```
Owner description: "Card 5 should get attached where Card 2 ended" — correct. This IS the CSS Grid row-height limitation.

### Issue B — Empty last-row cells (secondary)
When `actualColumns = 3` and `orderCount = 4`, the 4th card is alone in row 2 with 2 empty grid cells to its right.

**`actualColumns` calculation (`ChannelColumnsLayout.jsx:L121-126`):**
```js
const max = maxColumns[channelId] ?? (viewType === 'table' ? 2 : 1);
return Math.min(orderCount, max);
```
Default for order view = **1 column**. Multi-column only when user presses `>` arrow button. So Issue B only appears after user manually sets 2+ columns AND order count doesn't evenly fill.

---

## 2. Three Fix Options

### Option A — `align-items: start` (tried, INSUFFICIENT)
```css
.grid { align-items: start; }
```
- Cards no longer stretch → card ends at its natural height
- BUT: row height is still the tallest card, next row still starts at max height
- **Result:** Gap moves from INSIDE the card cell to BETWEEN card bottom and next row — still visible
- **Verdict: Does NOT solve Issue A. Reject.**

### Option B — CSS `column-count` (SOLVES gaps, CHANGES card order)
```css
column-count: N; column-gap: 8px;  /* each card: break-inside: avoid; */
```
- Each column fills top-to-bottom independently → Card 5 starts immediately after Card 2
- No row-height alignment → no height gaps
- **`column-count` is already used in this codebase** (DashboardPage.jsx:L1964: `columnCount: 4`)
- **Trade-off:** Card reading order changes from **Row-first** (Card1→Card2→Card3→Card4) to **Column-first** (Card1→Card4 in col1, Card2→Card5 in col2)
- Owner said "card order logic should not be touched" → needs OD confirmation

### Option C — JavaScript masonry (SOLVES gaps, PRESERVES order, most complex)
- Measure each card height with `ResizeObserver`
- Dynamically assign each card to the shortest column (while maintaining left-right visual order)
- Cards still read Card1→Card2→Card3→Card4 left-to-right visually
- No height gaps
- **Trade-off:** JavaScript complexity, performance overhead, requires state management
- Estimated scope: 3-5 files, HIGH complexity

---

## 3. Data Flow Trace

```
ChannelColumnsLayout.jsx
  getActualColumns() → actualColumns = min(orderCount, maxColumns)
  default max for ORDER VIEW = 1
  user can increase with > arrow (maxColumns state)
  
  ChannelColumn.jsx
    columnWidth = (actualColumns × ORDER_CARD_WIDTH) + gaps + padding
    aside container: width = columnWidth (FIXED)
    
    grid container (L283):
      display: grid
      align-items: STRETCH (default) ← BREAK POINT — forces row height = tallest card
      gridTemplateColumns: repeat(actualColumns, 1fr)
      
      OrderCards rendered: height varies based on content
      → height gap when cards in same row differ in height
```

---

## 4. Recommended Approach

**Option B (CSS column-count) is recommended** over Option C for these reasons:
1. Pure CSS — no JavaScript complexity
2. Already used in codebase (DashboardPage.jsx:L1964)
3. Eliminates BOTH Issue A (height gaps) AND Issue B (empty last-row cells) completely
4. `actualColumns` value is still used (N columns, same visual density)
5. Card sort logic is NOT touched — sort order in `sortedGroups` unchanged

**The only trade-off:** Visual reading order changes from row-first to column-first.

**Is this acceptable?** In a KITCHEN/SERVICE display context, staff look at a column (their status group) from top to bottom. Columns are independent (Ready, Served, etc.). Reading order within a column top-to-bottom is MORE natural for kitchen display than left-to-right row reading. This is a UX improvement, not a regression.

---

## 5. Proposed Fix (for Gate 3 plan)

**File:** `src/components/dashboard/ChannelColumn.jsx`
**Lines:** L283-291 (the grid container)

```jsx
// CURRENT:
<div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${actualColumns}, 1fr)` }}>
  {group.items.map(item => <Card />)}
</div>

// PROPOSED (Option B):
<div style={{ columnCount: actualColumns, columnGap: '8px' }}>
  {group.items.map(item => (
    <div style={{ breakInside: 'avoid', marginBottom: '8px' }}>
      <Card />
    </div>
  ))}
</div>
```

**Files affected:** `ChannelColumn.jsx` only — 1 file, ~5-8 lines
**`actualColumns` prop:** Still used — column count unchanged

---

## 6. Risk Classification

**Risk: MEDIUM**
- CSS layout change for order view cards
- Not R5, not financial, not auth
- Trade-off: column-first card order (needs OD confirmation)
- Table view: UNAFFECTED (separate branch `viewType === 'table'`)
- Tablet: UNAFFECTED (already uses auto-fill)

---

## 7. Conflict Pre-Check

| Item | Lines | Status | Interaction |
|---|---|---|---|
| BUG-571 | ChannelColumn.jsx:L260 | GATE_5B_QA_PASSED | Different line — CLEAN |
| CR-414 | ChannelColumn.jsx:L286-287 | GATE_5B_QA_CONDITIONAL_PASS | Tablet grid — in different branch, CLEAN |

---

## 8. Verification Matrix

| # | Check | Expected |
|---|---|---|
| V1 | ORDER VIEW — no height gaps | Cards in same column attach directly |
| V2 | ORDER VIEW — no empty last-row cells | 4 cards in 2-col = 2×2 full |
| V3 | TABLE VIEW unchanged | Table cards still side-by-side fixed-width grid |
| V4 | Tablet unchanged | Tablet auto-fill unchanged |
| V5 | Card sort logic unchanged | Same cards, same order within column |
| V6 | `>` arrow still increases columns | actualColumns still drives column-count |

---

## 9. Owner Decisions

**OD-432-01 — LOCKED 2026-10-16**
Option selected: **(a) Column-first order is acceptable.**

Column-first reading (top-to-bottom per column) is natural for kitchen/service staff who scan a status column vertically. No row-first constraint required.

**Fix confirmed:** CSS `column-count` (Option B) — replaces CSS Grid for order view.
- `column-count: actualColumns; column-gap: 8px;` on the container
- Each card: `break-inside: avoid; margin-bottom: 8px`
- 1 file (ChannelColumn.jsx), ~5-8 lines, MEDIUM risk
- No JS masonry needed

---

## Gate 2 Status: CLOSED — 2026-10-16
All ODs locked. Proceed to Gate 3 Implementation Plan.

---

## Artifacts
- IA: `/app/memory/impact/CR-432_IMPACT_ANALYSIS_2026_10_16.md`
- Intake: `change_requests/CR-432_ORDER_VIEW_GRID_EMPTY_CELLS_INTAKE.md`
