# CR-432 — Intake (Gate 1)
## Order View: cards flow one after another — no empty grid cells between cards

**ID:** CR-432 · **Type:** CR · **Date:** 2026-10-16
**Severity:** P0 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** RELATED to BUG-571 (section group gaps — different issue). BUG-571 fixed empty section group headers; CR-432 fixes empty CSS grid cells in the last row. DISTINCT fix.
**Source:** OWNER-REPORTED + screenshot (dashboard order view 2026-10-16)

---

## Description

In **order view** (status columns — Ready / Served / etc.), cards are placed in a CSS grid with a fixed column count (`repeat(${actualColumns}, 1fr)` at `ChannelColumn.jsx:L290`). When the number of orders doesn't evenly fill the grid rows, the last row has **empty grid cells** that render as large blank white spaces.

**Example from screenshot:**
- "Ready" column has 4 orders, `actualColumns = 3` → grid is 3 columns
- Row 1: Card 1 | Card 2 | Card 3 ← full
- Row 2: Card 4 | **[EMPTY]** | **[EMPTY]** ← 2 blank cells visible as white gaps

**Owner expectation:** Cards should flow one after another with no empty gaps — the 4th card should visually appear directly below the 1st card's column with no blank space.

---

## Code Reality: PARTIAL

`ChannelColumn.jsx:L289-290` (desktop order view):
```js
// Table view:
? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)`
// Order view:
: `repeat(${actualColumns}, 1fr)`   ← FIXED column count → empty last row cells
```

Tablet path already uses auto-fill:
```js
isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))'
```

**Fix direction:** Change desktop order view from `repeat(${actualColumns}, 1fr)` to `repeat(auto-fill, minmax(${ORDER_CARD_WIDTH}px, 1fr))` — cards fill the available width and wrap naturally. The last row is left-aligned with no empty cells (CSS grid auto-fill behaviour with varying item count). `ORDER_CARD_WIDTH = 300` is already defined at L10.

---

## Evidence
- Screenshot confirmed on `genie-pos-app.preview.emergentagent.com`
- URL: `/dashboard` → Status View → Order View
- Visible: 4 orders in "Ready" column with 3-column grid → 2 blank cells in row 2

---

## Blast Radius: SMALL
- `ChannelColumn.jsx:L290` — 1 line (change grid template for desktop order view)
- Table view completely unaffected (separate branch at L289)
- Tablet path unaffected (already auto-fill)

## Open Decisions
**OD-432-01:** Should the fix use `minmax(${ORDER_CARD_WIDTH}px, 1fr)` (responsive, may show fewer or more columns depending on container width) OR keep a fixed column count but use `grid-auto-flow: dense` (fills gaps but can reorder cards)? Recommended: `auto-fill minmax` — cards fill naturally, no reordering.
