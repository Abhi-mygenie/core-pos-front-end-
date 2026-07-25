# Investigation Report — 3 Items (2026-07-25)

**Role:** INVESTIGATION
**Date:** 2026-07-25
**Items:** 3 (Table/Channel view, Customization merge, Smart Purchase ad-hoc blocking)

---

# ITEM 1: Table + Channel View — Cards Not Moving, Tables Not Showing

**Steps Used:** 4/10
**Confidence:** MEDIUM (code traced, but cannot reproduce without live restaurant data)
**Classification:** Needs owner clarification — may be INTENTIONAL + separate BACKEND/DATA issue

## Previous Investigation

A full investigation exists at:
`/app/memory/.../status_vs_channel_view_movement_investigation/`

**Previous fix (applied):**
- `ChannelColumn.jsx`: Added `groupingMode` prop — in `'channel'` mode, sort is **stable** (FIFO/label-numeric), cards do NOT re-sort on status change. In `'status'` mode, sort is status-priority (cards move between columns).
- `DashboardPage.jsx`: `statusMatchesFilter` was removed from channel view.

**BUT — CR-018 G8 (Jun-2026) RE-ENABLED `statusMatchesFilter` in channel view:**
```js
// DashboardPage.jsx:846-847
// CR-018 G8 (Jun-2026): Re-enabled `statusMatchesFilter` in channel view
// so status pills (YTC/Preparing/Ready/Served) filter cards within channels.
// Previously disconnected (May-2026 stability CR) — owner decision to re-enable.
```

This was an **owner decision** to re-enable status filtering in channel view.

## Hypotheses for Current Report

### H1: "Cards will not move" — Intentional by design
In channel view (`groupingMode='channel'`), the stable sort from the previous fix means cards **intentionally** do NOT re-sort when status changes. They stay in FIFO/label position. Status change only affects badge/color, not position.

**If the owner expects cards to re-sort by status in channel view** → this is a design conflict with the previous fix. Need owner clarification.

### H2: "Tables will not come" — Possible data/filter issue
If no tables appear in table view, possible causes:
1. `useTables()` hook returns empty (backend `/get-tables` API returns no data)
2. `allTablesList` is empty after filtering
3. `statusMatchesFilter` filtering OUT all tables (if active status pills don't include "available")
4. `features.dineIn === false` → entire Dine-In column disabled

**Cannot confirm without:**
- Curl-probing the table config API for this restaurant
- Checking which status pills are active in the user's session
- Checking `features.dineIn` value

## Owner Questions (BLOCKING)

| # | Question |
|---|----------|
| Q1 | "Cards not moving" — do you WANT cards to re-sort by status in channel view? (This was intentionally removed by the previous fix, then status filtering was re-enabled by CR-018 G8.) |
| Q2 | "Tables not come" — which restaurant/account? Is this Kunafa Mahal or another? Do tables appear in the Settings → Table Management screen? |
| Q3 | Is this issue persistent (always) or intermittent (sometimes tables show, sometimes don't)? |

---

# ITEM 2: Customized Items Not Merging — Identical Variations Added as Separate Lines

**Steps Used:** 3/10
**Confidence:** HIGH (root cause confirmed in code)
**Classification:** FE_BUG

## Root Cause — CONFIRMED

**Two separate code paths handle cart insertion:**

| Path | Function | Merge Logic |
|------|----------|-------------|
| Non-customized items | `addToCart()` L565 | ✅ Finds existing by `id` match + `!customizations` → increments qty |
| **Customized items** | `addCustomizedItemToCart()` L676 | ❌ **ALWAYS appends new line. ZERO merge logic.** |

### `addToCart()` — L596-602 (has merge, but excludes customized):
```js
const existingIndex = cartItems.findIndex(ci => ci.id === item.id && !ci.customizations && !ci.placed);
if (existingIndex >= 0 && !item.customizations) {
    updated[existingIndex].qty += 1;  // merge ✅
}
```

The condition `!ci.customizations && !item.customizations` explicitly **skips** any item with customizations.

### `addCustomizedItemToCart()` — L676-689 (NO merge):
```js
const addCustomizedItemToCart = (item) => {
    setCartItems([...cartItems, {
        ...item,
        qty: item.quantity || 1,
        status: "preparing",
        placed: false,
        addedAt: new Date().toISOString()
    }]);  // ALWAYS appends — never checks for existing identical item
};
```

### What Makes Two Customized Items "Identical"

From `ItemCustomizationModal.jsx:220-256`, a customized item has:

| Field | Example |
|-------|---------|
| `id` | Product ID (e.g., Organic Espresso) |
| `selectedSize` | `{ name: "Half Cup", price: 80 }` |
| `selectedVariants` | `{ groupId: { name: "Extra Shot" } }` |
| `selectedAddons` | `[{ name: "Sugar", quantity: 1 }]` |
| `notes` | Free text |
| `customizations.size` | `"Half Cup"` |
| `customizations.variants` | `["Milk: Oat"]` |
| `customizations.addons` | `["Sugar x1"]` |

**Two items are identical if:** same `id` + same `customizations.size` + same `customizations.variants` (sorted) + same `customizations.addons` (sorted) + same `notes`.

## Impact

- **Cart display:** Same item shown 3× at qty=1 instead of 1× at qty=3
- **Bill/KOT printing:** 3 separate line items printed instead of 1 line with qty=3
- **Order payload:** 3 separate items sent to backend

## Fix Direction (no code edit per investigation role)

Add merge logic to `addCustomizedItemToCart()`:
1. Build a "customization key" from `id + customizations.size + sorted(customizations.variants) + sorted(customizations.addons) + notes`
2. `findIndex` existing cart items with matching key + `!placed`
3. If found → increment qty
4. If not found → append new line (current behavior)

**Files:** `OrderEntry.jsx` — ~8-10 lines added to `addCustomizedItemToCart`
**Risk:** MEDIUM — touches R5 hotspot file (OrderEntry.jsx). Needs full gate flow.

---

# ITEM 3: Smart Purchase Ad-Hoc Search Blocking UI

**Steps Used:** 3/10
**Confidence:** HIGH (code structure confirms re-render cascade)
**Classification:** FE_BUG (performance)

## Root Cause — Re-render Cascade

The ad-hoc typeahead input is inside `AutoShoppingList`. Every keystroke:
1. `setTypeaheadQuery(value)` → triggers re-render of **entire** `AutoShoppingList`
2. This re-renders the **full table** (all rows)
3. Each row contains a `VendorSuggestionCell` — a **heavy component** (120 lines, Popover + Command + CommandInput + useMemo)
4. With 50+ rows, each keystroke triggers 50+ heavy component re-renders

**Evidence:**
- `typeaheadQuery` is local state (L37) — every change re-renders the whole component
- `filteredMaster` is computed inline (L39-44) — NOT memoized, runs every render
- Table renders all `rows.map()` (L117) — no virtualization, no React.memo on rows
- Each row has `<VendorSuggestionCell>` (L163) — Popover/Command component (120 lines, imports Radix primitives)
- No `React.memo` wrapper on row or VendorSuggestionCell

**Scale:**
- Kunafa Mahal: ~50 plan rows × 1 VendorSuggestionCell each = 50 heavy re-renders per keystroke
- Larger restaurants: could be 100+ rows

## Fix Direction (no code edit per investigation role)

**Option A (Minimal):** Wrap `VendorSuggestionCell` in `React.memo` — prevents re-render when props haven't changed. Typeahead state doesn't affect row props, so all rows would skip re-render.

**Option B (Better):** Extract typeahead into a separate component with its own state. Parent rows never re-render on typeahead keystrokes.

**Option C (Complete):** Option B + `useMemo` on `filteredMaster` + debounce the filter (150ms).

**Files:** `AutoShoppingList.jsx` (~5 lines for Option A) or `AutoShoppingList.jsx` + new `AdHocTypeahead.jsx` (~20 lines for Option B)
**Risk:** LOW — no hotspot, no financial logic.

---

# Summary

| # | Item | Root Cause | Confidence | Fix Scope | Risk |
|---|------|-----------|-----------|-----------|------|
| 1 | Table/Channel view | **Needs owner clarification** — "not moving" may be intentional (previous fix); "tables not come" needs more data | MEDIUM | TBD | TBD |
| 2 | Customized items not merging | `addCustomizedItemToCart()` has ZERO merge logic — always appends | HIGH | ~10 lines in OrderEntry.jsx (R5 hotspot) | MEDIUM |
| 3 | Ad-hoc search blocking UI | Typeahead keystroke re-renders entire table including 50+ heavy VendorSuggestionCells | HIGH | ~5-20 lines in AutoShoppingList.jsx | LOW |
