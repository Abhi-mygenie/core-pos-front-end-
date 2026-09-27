# INVESTIGATION — Suggested Qty should round UP to the next whole DISPLAY unit
**Date:** 2026-09-25 · **Role:** 6 INVESTIGATION (owner-reported, investigation only — ZERO code) · **Confidence:** HIGH (reproduced + traced)
**Provisional ID:** BUG-460 · **Related:** CR-387 (just shipped, same files), BUG-459, CR-348
**Risk (proposed):** HIGH — financial-adjacent (changes the *suggested purchase quantity*; can over-suggest by up to <1 display unit)

## 1. Summary
Owner observation: **Suggested Qty shows "641 bottle 330 ml"**. Since beer is purchased in whole **bottles**, the suggestion should round **up to the next whole display unit → "642 bottle"**. Same applies to every converted row (e.g. "688 tin 665 ml" → "689 tin", "745 bottle 120 ml" → "746 bottle"). No-conversion rows (piece/kg) and "7 box 4 piece", "10 pkt 4 piece" — same rule: box/pkt are the purchasable display units, so round up to whole box/pkt.

Classification: **FE_BUG / semantics** (frontend planner rounding granularity). Not a backend issue.

## 2. Data-flow trace (base unit → display)
`purchasePlanner.js`
- velocity rows **L126**: `const suggest = gap < 0 ? Math.ceil(-gap) : 0;` — `gap` is in **BASE units** (ml/gm/piece). So `suggest_qty` is ceil'd to the nearest **whole BASE unit** (e.g. 416 980 ml).
- alert rows **L173**: `suggest_qty: Math.ceil(threshold - onHand)` — also base-unit ceil.

`AutoShoppingList.jsx`
- Table 2 Suggested Qty **L344**: `fmtBreak(r.suggest_qty, r)` → `toBreakdown(416980, 650, 'bottle', 'ml')` = **"641 bottle 330 ml"** (641×650 = 416 650, remainder 330).
- Qty-to-Buy "suggest:" hint **L235**: same `fmtBreak(r.suggest_qty, r)`.

`SmartPurchasePanel.jsx`
- two-box seed **L66**: `toBreakdown(r.suggest_qty, …)` → seeds `qty_major=641`, `qty_minor=330`.

**BREAK POINT:** `suggest_qty` is rounded to the nearest whole **base** unit (ml), then merely *displayed* as a breakdown — leaving a partial display unit (330 ml of a bottle) that a buyer cannot actually purchase. Rounding granularity should be the **display unit** (bottle), not the base unit.

## 3. Reproduction (live preprod, read-only)
Smart Purchase → All Ingredients → UAT BAR BEER (factor 650 ml/bottle): Suggested Qty renders "641 bottle 330 ml". Confirmed on-screen in owner screenshot for 6 rows.

## 4. Recommendation (for PLANNING — do NOT implement without Gate 4)
Preferred single-source fix (DRY): round the suggestion **up to a whole display unit** at the planner for `has_conversion` rows, so display + hint + two-box seed + rate calc all stay consistent:
- velocity: `suggestBase = hasConv ? Math.ceil((-gap)/factor)*factor : Math.ceil(-gap)`
- alert: analogous with `(threshold - onHand)`.
Result: `suggest_qty` base becomes a whole-bottle multiple → "642 bottle", seed `[642][0]`, hint "642 bottle".
- **No-conversion rows unchanged** (factor 0 → keep base ceil; piece/kg already purchasable).
- **Leave Projected Need + Gap as-is** — informational, partial is correct; owner asked only about Suggested Qty.

Alternative (display-only): add a `fmtSuggest` that ceils to whole display unit for the Suggested column only — rejected: would drift from the two-box seed (still 641/330) and the rate hint. Single-source in planner is cleaner.

## 5. Scope estimate (for the plan)
- `src/utils/purchasePlanner.js` — velocity L126 + alert L173 (2 edits). Consider a shared `ceilToDisplayUnit(base, factor)` helper in `quantityBreakdown.js`.
- Verify inheritance (no change needed): `AutoShoppingList.jsx` L235/L344, `SmartPurchasePanel.jsx` L66 seed, rate hint L240/L242.
- Tests: extend `purchasePlanner.cr387.test.js` — converted suggest is a whole-display-unit multiple; no-conversion unchanged; exact-multiple no-op.
- Risk HIGH (alters suggested amounts) → owner Gate 4 + one live smoke (suggested vs actual purchasable).

## 6. Edge cases to decide in planning
- Fractional factor (e.g. 2.5) — ceil to whole display unit still valid.
- suggest already an exact multiple → no change (no spurious +1).
- Ad-hoc rows seed empty (unaffected).
- Confirm owner wants **ceil** (over-buy to whole unit), not round-to-nearest.

## 7. Gate status
Owner said **investigation only**. NO code written. Registered via INTAKE as **BUG-460** (2026-09-25). Next: PLANNING Gate 2/3, then owner "Gate 4 GO".
