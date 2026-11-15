# BUG-673: Enter Re-Adds the Default Item After Search. Impact Analysis (Gate 2), 2026-11-15

Code Reality: NONE. No fix exists yet. The behaviour comes from the CR-482 keyboard layer (P2/P4).
Conflict pre-check: `components/order-entry/OrderEntry.jsx` (3316 lines) is the **highest-conflict file** (R5).
- Open items on this file: BUG-656 (GATE_5A, L820, L962, L1611, L2085, L2919), CR-512 (GATE_5A), BUG-662 (GATE_5A, ~L167), CR-492 / CR-493 (Batch A GATE_3 plans: cancel/comp gates ~L353-383, CancelFood flow), CR-515 (Batch A: L353 `canCancelItem`), BUG-646/647 (investigation, ODs open), BUG-593/595 (GATE_5A).
- Batch D overlap: CR-523 (customer save path, L2919 / L3149-3163) is in the same file.
- **BUG-673 lines (L119-121, L636-647, L761-781, L2075-2095) don't overlap any of those ranges.** The sequence is still: Gate 3 must re-anchor at HEAD, and BUG-673 + CR-523 should be implemented by one agent, one after the other.

Risk: MEDIUM (keyboard/selection state in order entry, no API, no money). Upgraded rule: HIGH-RISK FILE TRAP R5, so the full gate flow applies.
Backend-blocked: NO.

## Owner decisions (locked)
- Intake: after search + add, the selection jumps back to the search box. Short-code highlight + Enter stays as today.
- OD-673-A (R3, 2026-11-15): empty search box → **no item highlighted**. Enter does nothing until the user types something or uses the arrow keys.
- OD-673-B (R3): after a **mouse-click add** → the search clears and the cursor goes back to the search box (same as Enter).

## When it happens
Only when keyboard mode is ON: `kbdEnabled` L72 = setting `keyboardShortcuts` OR localStorage `mygenie_keyboard_shortcuts_enabled === 'true'`, AND a pointer device. Tablets and keyboard-off users never see the highlight.

## Root cause (data flow)
1. L121 `highlightIndex` starts at `0`.
2. L636 `filteredItems` = category items → search filter L613-617 (name OR `itemCode`, CR-098).
3. L638-647 effect: on search/category/length change → if a query exists: exact `itemCode` match index, else **0**. With no query: **0**. So the first item of the current list is ALWAYS highlighted (L2079 `isHighlighted = kbdEnabled && idx === highlightIndex`, CSS `.kbd-highlight` in index.css L2).
4. L762-781 Enter (focus in search or on a grid item): adds `filteredItems[highlightIndex]`, then L779 `setSearchQuery('')`.
5. After step 4 the query is empty → step 3 sets the highlight to item 0 of the full menu → **the next Enter (e.g. a double-tap, or Enter to "confirm") adds item 0. This is BUG-673.**
6. Same after customization/weight/price popups close: L650-654 refocus the search box with the highlight still at 0.
7. Mouse path: L2085 `onClick` adds the clicked item but doesn't clear the search or refocus. Focus stays on the clicked `<button data-kbd-item>`. Enter then goes to L766 `isOnGridItem` → adds `filteredItems[highlightIndex]` (the highlighted item, **not necessarily the clicked one**), and L771 `preventDefault` blocks the native button click.

## Proposed change (Gate 3 detail)
| # | Line | Current → Proposed |
|---|---|---|
| E1 | L121 | `useState(0)` → `useState(-1)` (-1 = nothing highlighted) |
| E2 | L638-647 | empty query → `-1`. Query → exact itemCode match, else 0 (unchanged, keeps "short-code highlight + Enter stays as today") |
| E3 | L768-770 | `if (highlightIndex < 0) return;` before reading the item → Enter on an empty search does nothing |
| E4 | L784-803 arrows | from `-1`, the first arrow press highlights item 0 (`moveFocus` currentEl undefined → start at first item) |
| E5 | L2085 onClick | after a successful add: `setSearchQuery('')` + `searchInputRef.current?.focus()` when `kbdEnabled` (OD-673-B). Not when `isEditLocked` (toast path) |
| E6 | L795 | guard `querySelectorAll(...)[highlightIndex]` for -1 |

Not touched: Esc chain L728-742, +/- L744-759 (they use `lastAddedKeyRef`, not the highlight), F-keys, Ctrl+↓ cart jump, CategoryPanel, CartPanel.

## Open question for Gate 3 (non-blocking, recommendation given)
- Search typed but no exact short-code match: today item 0 of the results is highlighted and Enter adds it ("name search"). The owner said short-code behaviour stays. Recommendation: keep the name-search highlight on the first result as today. Confirm at Gate 3 review if needed.

## Side finding (not in scope, log only)
- Enter path L773-777 calls `addToCart` / `setCustomizationItem` without the `isEditLocked` pre-check that the click path has (L2085). `addToCart` L820 guards itself, but `setCustomizationItem` opens the popup on a locked order. Report to owner; not part of BUG-673.

## Verification seeds
V1 Keyboard on: open OE → no orange ring on any item; Enter does nothing.
V2 Type a short code (exact) → that item is ringed → Enter adds it → search clears → no ring → Enter adds nothing.
V3 Type a name → first result ringed → Enter adds it → same as V2.
V4 Arrow ↓ from an empty search → first item ringed → Enter adds it.
V5 Mouse: type a search → click item B → search clears, cursor in search, no ring → Enter adds nothing.
V6 Customizable item via Enter → popup → close → no ring, Enter adds nothing.
V7 Keyboard off / tablet: no change.
Regression: CR-482 P1-P16, BUG-649 (+/- in empty search), BUG-650 (Ctrl+↓), weight/dynamic-price popups.
