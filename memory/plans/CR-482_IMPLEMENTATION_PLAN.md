# CR-482 — Implementation Plan (Gate 3, Phase A)
## Keyboard navigation — Dashboard + Order Entry (fixed keys)


**ID:** CR-482  **Gate:** 3 — Implementation Plan (COMPLETE, rev 2 — safety amendments, awaiting Gate 4 GO)  **Date:** 2026-11-05 (rev 2)  **Role:** PLANNING
**Input:** `memory/impact/CR-482_IMPACT_ANALYSIS.md` (rev 3, all Phase A ODs closed — supersedes intake "deferred/OPEN" notes)
**Code Reality (re-verified at Gate 3):** NONE — no CR-482 marker, no POS shortcut layer. Existing `keydown` listeners only in PMS (`GlobalSearch`, `FrontDeskWorkstationPage`, `PmsCheckoutDrawer`), `Sidebar.jsx` L298, `OrderDetailSheet.jsx` L570 — all out of scope, untouched.
**IA line refs re-verified (unchanged):** OE `activeCategory` L105, `showPaymentPanel` L171, `getFilteredItems` L558, `addToCart` L605, `confirmDynamicPriceAndAdd` L658, `confirmWeightAndAdd` L704, `addCustomizedItemToCart` L733, `menu-search-input` L1702, menu item button L1836-1837, `PrintBillButton` L2581, dynamic-price input Enter L2765, `WeightEntryModal` mount L2797. CartPanel `PlacedItemRow` L65, `NewItemRow` L226, qty -/+ L298/L300, `qsr-collect-bill-btn` L719, `place-order-btn` L1572, `collect-bill-btn` L1593. RePrintButton `reprint-kot-btn` L70/L202. DashboardPage `orderEntryType` L439, `allTablesList` L679, `allRoomsList` L683, `handleTableClick` L1458, `handleOrderTypeChange` L1505, `handleCloseOrderEntry` L1519, `<OrderEntry>` L2076. TableCard `handleCardClick` L294 / root L304-305. OrderCard root L454-457. ChannelColumn `<TableCard>` L320, `<OrderCard>` L347/L377. CategoryPanel back L42-49, category buttons L58-61.
**Risk:** HIGH (2 R5 hotspots). **Priority:** P0.


---


## 0. Planning rule (owner directive, Gate 3)
**Every keystroke = its own phase.** Each phase is implemented alone, smoke-tested alone, and must PASS before the next phase starts. If a phase fails its smoke test, STOP — fix within that phase only; do not proceed. Mouse regression check (MR) is part of every phase's smoke test.


**Standard smoke test (applies to every phase, "SMOKE-STD"):**
1. Frontend compiles (`webpack compiled successfully`, no new errors).
2. Login with cafe103 owner (`memory/control/test_credentials.md`), dashboard renders, zero new console errors.
3. MR: mouse click a table -> Order Entry opens -> click an item -> item in cart -> Back returns to dashboard.
4. Phase-specific check(s) listed in the phase.


**Code marker:** every touched block carries `// CR-482` (Step 5 checklist).


---


## 1. Scope Lock


### Files WILL change
| # | File | Phases |
|---|---|---|
| N1 | NEW `src/constants/keyboardShortcuts.js` | P0 |
| N2 | NEW `src/hooks/useKeyboardShortcuts.js` | P0 |
| N3 | NEW `src/hooks/useArrowGridNav.js` | P0 |
| N4 | NEW `src/components/dashboard/TableJumpChip.jsx` | P19 |
| N5 | NEW `src/components/order-entry/KeyboardCheatSheet.jsx` | P26 |
| M1 | `src/index.css` | P0 |
| M2 | `src/components/order-entry/OrderEntry.jsx` (R5) | P1-P4, P6-P8, P10-P16, P26 |
| M3 | `src/components/order-entry/CategoryPanel.jsx` | P9 |
| M4 | `src/components/order-entry/CartPanel.jsx` | P10 |
| M5 | `src/components/order-entry/ItemCustomizationModal.jsx` | P5 |
| M6 | `src/components/order-entry/WeightEntryModal.jsx` | P6 |
| M7 | `src/components/modals/StationPickerModal.jsx` | P13 |
| M8 | `src/components/order-entry/CustomerModal.jsx`, `AddCustomItemModal.jsx`, `OrderNotesModal.jsx`, `ItemNotesModal.jsx` | P17 |
| M9 | `src/pages/DashboardPage.jsx` (R5) | P19-P23 |
| M10 | `src/components/dashboard/ChannelColumn.jsx` | P18, P19 |
| M11 | `src/components/cards/TableCard.jsx` | P18 |
| M12 | `src/components/cards/OrderCard.jsx` | P18 |
| M13 | `src/hooks/index.js` (barrel export, if pattern used) | P0 |
| M14 | `src/api/transforms/profileTransform.js` | P0 (settings gate) |


### Files will NOT touch
`CollectPaymentPanel.jsx` (Phase B) . `RePrintButton.jsx` (only clicked) . `orderTransform.js` . `orderService.js` / `printOrder` . `Header.jsx` . `AppProviders.jsx` . `Sidebar.jsx` . any localStorage key (R8) . backend . reports / PMS . legacy `TableSection.jsx` path (flag `USE_CHANNEL_LAYOUT=true`; legacy cards still gain focus via TableCard/OrderCard changes, no extra edit).


---


## 2. Phase Breakdown (one key per phase)


Execution order follows IA S7: foundation -> Order Entry (item flow, in the order a cashier uses it) -> modals -> F-keys -> Esc -> Dashboard -> full regression.


---


### P0 — Foundation (no visible behaviour) + Settings Gate + Physical Keyboard Detection
**M14 `api/transforms/profileTransform.js`** — one new line inside `settings:` transform (after existing `autoKot`/`autoBill` block):
```js
keyboardShortcuts: toBoolean(apiSettings.settings?.keyboard_shortcuts), // CR-482: off by default
```
When backend has not added the key yet: `toBoolean(undefined)` = `false` = off = zero change for any outlet.
Backend brief filed: `memory/backend_briefs/BACKEND_BRIEF_CR-482_SETTINGS_KEY.md`.

**N1 `constants/keyboardShortcuts.js`** — single action-to-key map (Phase B swap point) + physical keyboard media query:
```js
// CR-482: single action-to-key map (Phase B will make this configurable)
export const KBD = {
  FOCUS_SEARCH: 'F2', PRINT_BILL: 'F4', REPRINT_KOT: 'F7', PLACE_ORDER: 'F8', COLLECT_BILL: 'F9',
  BACK: 'Escape', CONFIRM: 'Enter', QTY_UP: '+', QTY_DOWN: '-',
  TAKEAWAY: { key: 't', alt: true }, DELIVERY: { key: 'd', alt: true },
  TO_CART: { key: 'ArrowDown', ctrl: true }, MODAL_ADD: { key: 'Enter', ctrl: true },
};
export const KBD_TARGET_TESTIDS = {
  PRINT_BILL_PREFIX: 'order-entry-print-bill-btn-', REPRINT_KOT: 'reprint-kot-btn',
  PLACE_ORDER: 'place-order-btn', COLLECT_BILL: 'collect-bill-btn', QSR_COLLECT_BILL: 'qsr-collect-bill-btn',
};
export const TABLE_JUMP_TIMEOUT_MS = 2000; // OD-482-A8
// CR-482 G4: physical keyboard detection — matches desktop/laptop, not tablet/phone
export const HAS_POINTER_DEVICE = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
```

**Master gate** (used by every phase):
```js
const { settings } = useRestaurant();
// CR-482: production gate = backend settings key; dev gate = localStorage override
const kbdEnabled = (!!settings?.keyboardShortcuts || localStorage.getItem('__cr482_kbd_dev') === 'true')
  && HAS_POINTER_DEVICE();
```
When `kbdEnabled === false`: zero listeners, zero tabIndex, zero focus rings, zero auto-focus = byte-identical to today.
Dev override: `localStorage.setItem('__cr482_kbd_dev', 'true')` in browser console to test. Remove override before shipping.
Production: backend adds `keyboard_shortcuts` key → Settings page toggle in General Settings section → owner self-serves.

**N2 `hooks/useKeyboardShortcuts.js`** — `useKeyboardShortcuts(handler, { enabled })`: one `window` `keydown` listener (capture phase), attached only when `enabled`; exports helpers:
- `isTypingTarget(el)` -> input/textarea/select/contentEditable.
- `isKbdModalOpen()` -> `!!document.querySelector('[data-kbd-modal]')`.
- `clickIfEnabled(selector)` -> finds element, returns false if missing or `disabled`, else `.click()` and returns true (R10 no double-fire).

**N3 `hooks/useArrowGridNav.js`** — `moveFocus(containerEl, currentEl, direction)` -> spatial nearest element in direction over `[data-kbd-card]` (or `[data-kbd-item]`) using `getBoundingClientRect`; returns next element (no wrap).

**M1 `index.css`** — `.kbd-focus:focus-visible, .kbd-highlight { outline: 3px solid #F97316; outline-offset: 2px; }` (outline, not border — R11).

**Smoke:** SMOKE-STD only. Grep confirms no component imports the new files yet. Settings key absent from preprod -> `kbdEnabled=false` -> **Visible change: none.** Verify: `restaurant.settings.keyboardShortcuts` is `undefined` or `false`.


---


### P1 — (no key) Search auto-focus on Order Entry open + Focus Trap
**M2 OE:** add `searchInputRef = useRef(null)`; `ref={searchInputRef}` on `menu-search-input` (L1702); auto-focus guarded:
```js
useEffect(() => {
  if (kbdEnabled) searchInputRef.current?.focus(); // CR-482 P1 + G4 guard
}, []);
```
When `kbdEnabled=false` (setting off OR tablet): no auto-focus, no on-screen keyboard popup. Cashier taps search manually (same as today).

**Focus trap (G5):** OE root overlay div (L~2076, `fixed inset-0 z-50`) gets a focus-trap: first Tab from last focusable element wraps to first; Shift+Tab from first wraps to last. Prevents keyboard user from Tabbing into dashboard behind the overlay. Implementation: sentinel `<div tabIndex=0 onFocus={()=>firstEl.focus()}>` at end of OE; reverse sentinel at start.

**Smoke:** SMOKE-STD + (with setting ON) click any table -> caret is blinking in item search without clicking. Open walk-in (Add) -> same. Re-open busy table -> same. (With setting OFF) -> no auto-focus, manual tap required. Tab at end of OE -> wraps to first element (not dashboard). **Tablet:** no auto-focus, no on-screen keyboard.


---


### P2 — Typing letters/digits in search (verify only + exact-code highlight)
**M2 OE:** add `highlightIndex` state (default 0, reset to 0 whenever `searchQuery` or `activeCategory` changes). Compute `filtered = getFilteredItems()` once per render (reuse in grid map at L1829). Initial highlight = index of first item whose `itemCode` equals query exactly (case-insensitive), else 0 (R8 — no reorder). Add `data-kbd-item` + `className` `kbd-highlight` on the highlighted menu button (L1836) only when search input focused or grid nav active.
**Smoke:** type item code (e.g. `1`) -> item with code exactly `1` has orange ring even if `10`/`101` appear first; type a name fragment -> first result ringed; clear -> ring on first item.


---


### P3 — Arrow keys (up/down/left/right) in item grid
**M2 OE:** OE-level `useKeyboardShortcuts` handler (enabled when `!showPaymentPanel && !isKbdModalOpen()`). When focus is in `menu-search-input` or on a `[data-kbd-item]`: arrow key -> `useArrowGridNav.moveFocus` over menu grid container (add `ref` to grid div at L1828) -> set `highlightIndex` to new item, `scrollIntoView({block:'nearest'})`. `preventDefault` (stops caret move/page scroll). Left/Right inside a non-empty search keep native caret behaviour **only if** `e.shiftKey`; otherwise grid move (decision recorded: grid nav wins; Home/End still edit text).
**Smoke:** type nothing -> down arrow moves ring to the pill visually below; right moves right; at edge no wrap, no crash; ring scrolls into view on long menus. Mouse click on any item still adds it.


---


### P4 — Enter: add highlighted item (plain item)
**M2 OE:** Enter while search focused/grid nav -> run exactly the click branch of L1837: `item.customizable ? setCustomizationItem(item) : addToCart(item)`. After add: `setSearchQuery('')`, keep focus in search. Introduce `lastAddedKeyRef = useRef(null)`; set it inside `addToCart` (new line `_cartKey`, or `updated[existingIndex]._cartKey` on merge) — 2 assignments in L605-652 plus the weight-default branch L615-625.
**Smoke:** type item -> Enter -> item in cart qty 1, search cleared, caret still in search. Enter again same item -> qty 2 (merge). Empty grid (no match) + Enter -> no-op, no error. Prepaid placed order -> existing behaviour unchanged.


---


### P5 — Enter on customizable item -> popup: Enter / Ctrl+Enter / Esc
**M5 ItemCustomizationModal:** root overlay gets `data-kbd-modal`; local `keydown` on modal root: `Escape` -> `onClose()`; `Ctrl+Enter` -> `addToOrderBtnRef.current?.click()` (respects its disabled/validation — required variants not chosen = no-op, existing toast/inline msg). Plain Enter on focused option = native button click (select) — no code. Tab reaches Add button (`add-to-order-btn` L724), Enter clicks natively.
**M2 OE:** `addCustomizedItemToCart` (L733) sets `lastAddedKeyRef` (merge -> existing key, new -> new key); on modal close (both paths) refocus `searchInputRef`.
**Smoke:** customizable item + Enter -> popup opens; Tab to a variant, Enter selects it; Ctrl+Enter adds -> cart line with variant, popup closes, caret in search. Reopen -> Esc -> closes, nothing added, caret in search. Required variant missing + Ctrl+Enter -> same block as mouse. Dashboard/OE shortcuts do NOT fire while popup open.


---


### P6 — Enter on weight item -> weight popup: Enter confirm / Esc
**M6 WeightEntryModal:** `data-kbd-modal` on root; `weight-input` (L175) `onKeyDown`: Enter -> existing confirm handler (same validation as Add button, L114); root `keydown` Escape -> `onClose()`.
**M2 OE:** `confirmWeightAndAdd` (L704) sets `lastAddedKeyRef`; refocus search after close.
**Smoke:** weight item + Enter -> popup with caret in weight; type `0.5` Enter -> line added 0.5; reopen, Esc -> closes. Invalid/empty weight + Enter -> same error as button. (If weight prompt disabled in settings -> P4 path adds default weight; verify ref set.)


---


### P7 — Enter on price=1 item -> price box: Enter (exists) / Esc
**M2 OE:** dynamic-price overlay (L2736) gets `data-kbd-modal`; price input `onKeyDown` (L2765) extend: `Escape` -> `setDynamicPriceItem(null); setDynamicPriceError('')` + refocus search. Ensure input has `autoFocus`. `confirmDynamicPriceAndAdd` (L658) sets `lastAddedKeyRef`.
**Smoke:** price=1 item + Enter -> box, caret in price; `120` Enter -> line at Rs.120; reopen -> Esc -> closed, nothing added. Empty/0 + Enter -> existing error.


---


### P8 — `+` / `-`: quantity of last added item
**M2 OE:** in OE handler: key `+` (also `=` with Shift, numpad `Add`) / `-` (numpad `Subtract`) **only when** search box focused AND `searchQuery===''`, or focus on body/grid (never other inputs — R6). Find cart line by `lastAddedKeyRef`; skip if missing or `placed`. `+` -> `updateQuantity(key, qty+1)`; `-` -> only if qty>1 -> `updateQuantity(key, qty-1)` (mirrors CartPanel L298 — never deletes). Weight lines: skip (qty is weight) — no-op. `preventDefault` so `+` is not typed.
**Smoke:** add item -> `+` `+` -> qty 3; `-` -> 2; `-` at 1 -> stays 1. Type `-` with text in search -> character typed, qty unchanged. Weight line last -> `+` no-op. Mouse qty buttons unchanged.


---


### P9 — Category switch: Tab into list, up/down, Enter (OD-482-A4)
**M3 CategoryPanel:** category list container `onKeyDown`: ArrowUp/ArrowDown -> move focus to prev/next `category-*` button (`preventDefault`); Enter/Space = native click -> `onCategoryChange`. Add `kbd-focus` class to category buttons and back button. New optional prop `onCategoryPicked` called after Enter -> OE refocuses search.
**M2 OE:** pass `onCategoryPicked={() => searchInputRef.current?.focus()}` at L1683. Shift+Tab from search lands in category list (verify DOM order; if not, add `Alt+C` is NOT introduced — plain Tab/Shift+Tab only per IA).
**Smoke:** from search Shift+Tab (or Tab per DOM order) -> category button ringed; down down -> ring moves; Enter -> category selected (green), grid filters, caret back in search, highlight reset to first item. Mouse category click unchanged.


---


### P10 — Ctrl+Down: jump into cart lines (+ row keys)
**M4 CartPanel:** each `NewItemRow` (L226) / `PlacedItemRow` (L65) root gets `tabIndex=0`, `data-kbd-cart-row`, `kbd-focus`; row `onKeyDown`: up/down -> prev/next row; `+` -> same as qty-plus (L300); `-` -> same as qty-minus (L298, min 1; placed rows keep `min=originalQty`, BUG-374 rule); `Delete` on NewItemRow -> `onDeleteItem` (same as `delete-item-btn` L233); Delete on PlacedItemRow -> no-op (cancel needs permission modal — mouse only); `Escape` -> back to search (callback prop `onExitCart`).
**M2 OE:** OE handler `Ctrl+ArrowDown` (from search) -> focus the newest (bottom) unplaced `[data-kbd-cart-row="new"]`, else the first row (BUG-650). Pass `onExitCart` to CartPanel.
**Smoke:** add 2 items -> Ctrl+Down -> newest new row ringed; up -> previous row; `+` -> qty up; `-` -> down (stops at 1); Delete -> unplaced row removed; Esc -> caret in search. Busy table placed row: `-` cannot go below placed qty; Delete no-op.


---


### P11 — F2: focus search
**M2 OE:** F2 -> `preventDefault`; `searchInputRef.current.focus(); select()`. Allowed from anywhere in OE except inside a `[data-kbd-modal]`.
**Smoke:** click into cart/customer area -> F2 -> caret in search with text selected. In customer phone input -> F2 -> still focuses search (F2 is navigational, allowed; documented). Popup open -> F2 inert. **Firefox: F2 does NOT open browser Find bar** (if it does -> STOP, raise fallback-key OD).


---


### P12 — F8: Place / Update Order
**M2 OE:** F8 -> `preventDefault`; `clickIfEnabled('[data-testid="place-order-btn"]')`. Allowed when focus is body/grid/cart row **or search box** (OD-482-A6); blocked in any other input. Missing/disabled/hidden (prepaid) -> no-op.
**Smoke:** new table, add 1 item -> F8 -> order placed once (Network: single place-order call), OrderPlacedModal shows. Busy table, add 1 -> F8 -> "Update Order (1)" once, KOT only new item. Press F8 3x fast -> one call (R10). No new items -> F8 no-op. Prepaid placed -> no-op.


---


### P13 — F7: Re-Print KOT (+ Station Picker Enter / Esc)
**M2 OE:** F7 -> `preventDefault` (R5 — suppress Chrome/Edge Caret Browsing prompt); `clickIfEnabled('[data-testid="reprint-kot-btn"]')`.
**M7 StationPickerModal:** root (L64) `data-kbd-modal`; `keydown`: Escape -> `onClose()`; Enter -> confirm (same handler as confirm button L51, respects "none selected" disable); Space on focused checkbox = native.
**Smoke:** placed order -> F7 -> KOT reprint fires (single station) **and no Caret Browsing dialog in Chrome**. Multi-station -> picker opens; Tab/Space toggle; Enter prints selected; reopen -> Esc closes, nothing printed. No orderId / button absent -> no-op. If Caret prompt still appears on target browser -> STOP, raise fallback-key OD (do not change key unilaterally).


---


### P14 — F4: Print Bill
**M2 OE:** F4 -> `preventDefault`; `clickIfEnabled('[data-testid^="order-entry-print-bill-btn-"]')` (rendered L2581 only when `canPrintBill && hasPlacedItems && orderId`). After click: `setTimeout(() => searchInputRef.current?.focus(), 300)` — refocus search after browser print dialog closes (G7).
**Smoke:** placed order, permission ON -> F4 -> bill print fires once; after print dialog closes, cursor returns to search. New table/no placed items -> no-op. User without print permission -> no-op (button absent).


---


### P15 — F9: Collect Bill (normal + QSR)
**M2 OE:** F9 -> `preventDefault`; `clickIfEnabled('[data-testid="collect-bill-btn"]') || clickIfEnabled('[data-testid="qsr-collect-bill-btn"]')`. While `showPaymentPanel === true` the whole OE layer is disabled (Phase B) — only P16 Esc rule below applies (and Esc in payment panel = existing behaviour, none added).
**Smoke:** served order -> F9 -> Collect Bill panel opens. Not served / unplaced items -> button disabled -> no-op. QSR mode -> qsr button clicked. With panel open: F2/F8/arrows/+/- do nothing; mouse payment flow and settle unchanged.


---


### P16 — Esc chain in Order Entry (OD-482-A7)
**M2 OE:** Escape (when no `[data-kbd-modal]` open, payment panel closed), ordered:
1. Focus in cart row -> handled by P10 (return to search).
2. `searchQuery !== ''` -> clear search.
3. Unplaced items exist (`cartItems.some(i => !i.placed)`) -> open new inline confirm `kbd-leave-confirm` (`data-kbd-modal`; "Unsaved items will be lost. Leave?" — buttons `kbd-leave-confirm-stay` (default focus) / `kbd-leave-confirm-leave`; Enter on focused button, Esc = Stay).
4. Else -> `onClose()` (same as `category-back-btn`).
Mouse Back button (CategoryPanel L42) **unchanged** — no confirm (A7).
**Smoke:** text in search -> Esc -> cleared. Empty search + no new items -> Esc -> dashboard. Add item -> Esc -> confirm; Enter (Stay) -> stays, cart intact; Esc -> confirm -> Tab -> Leave Enter -> dashboard. Mouse Back with unsaved items -> leaves without confirm (as today).


---


### P17 — Esc on remaining OE popups
**M8:** `CustomerModal`, `AddCustomItemModal`, `OrderNotesModal`, `ItemNotesModal`: root `data-kbd-modal` + `keydown` Escape -> `onClose()`. No Enter change (forms keep native submit behaviour).
**Smoke:** open each popup by mouse -> Esc closes it, nothing saved; OE shortcuts did not fire while open (type `+` in notes -> typed, qty unchanged).


---


### P18 — Dashboard: Tab + Enter on cards (focusable cards)
**M11 TableCard:** root (L304) add `tabIndex={kbdEnabled && !isEngaged && !isAggregator ? 0 : undefined}`, `data-kbd-card`, `data-kbd-label={table.label}`, `kbd-focus`, `onKeyDown` Enter/Space -> `handleCardClick()` (same guard as onClick L305). New prop `kbdHighlight` -> adds `kbd-highlight` class. **When `kbdEnabled=false`: no tabIndex, no data attrs, no focus ring = unchanged.**
**M12 OrderCard:** root (L454) same pattern, Enter -> `onEdit?.()` (guard as L457).
**M10 ChannelColumn:** pass `kbdHighlight={kbdHighlightId === item.id}` to L320/L347/L377 (prop plumbed from DashboardPage in P19; default undefined = no change).
**Smoke:** (setting ON) dashboard -> Tab repeatedly -> orange ring moves card to card (outline does not replace BUG-583/CR-433 border); Enter on available table -> OE opens dineIn; on busy -> running order loaded; engaged/aggregator cards skipped. Mouse click unchanged. (Setting OFF) -> no Tab stops on cards, no rings.


---


### P19 — Dashboard: type table label -> highlight chip (letters + digits, Backspace, 2s timeout)
**N4 TableJumpChip.jsx** — fixed bottom-centre chip: `data-testid="table-jump-chip"`, states: match ("Table: C1"), multi ("Table: 5 . 1 of 2"), no match ("C9 — not found"), not visible ("401 — not in this view").
**M9 DashboardPage:** dashboard `useKeyboardShortcuts` enabled when `orderEntryType === null && !isKbdModalOpen()` and RoomCheckIn/Cancel/Aggregator modals closed (R4); skip if `isTypingTarget` (R3 — header search). Handler: `[A-Za-z0-9]` (no Ctrl/Alt/Meta) -> append to `jumpBuffer`; Backspace -> pop; reset 2s timer (`TABLE_JUMP_TIMEOUT_MS`). Match = rendered `[data-kbd-card]` whose `data-kbd-label` base (strip ` (1/2)`) equals buffer case-insensitively; first match -> `kbdHighlightId` + `focus()` + `scrollIntoView`. Labels in `allTablesList`/`allRoomsList` but not rendered (Order View free table — A2) -> "not in this view". Pass `kbdHighlightId` to `ChannelColumnsLayout` -> ChannelColumn.
**Smoke:** type `c` `1` -> chip "Table: C1", C1 ringed; wait 2s -> chip gone, ring stays as focus. Type `1` `0` `1`, Backspace -> buffer `10`. Order View -> type a free table -> "not in this view", nothing opens. Typing in header search -> no chip.


---


### P20 — Dashboard: Enter opens highlighted card
**M9 DP:** Enter while chip/highlight active -> `handleTableClick(tableEntry)` for table/room (OrderCard path -> same `onEdit` mapping used at L1815/L1819). All guards inside `handleTableClick` apply (orderTakingEnabled, engaged, room check-in modal). Clear buffer after open.
**Smoke:** type `C1` Enter -> OE dineIn C1, caret in search (P1). Busy table Enter -> running order. Available room -> RoomCheckInModal (existing). `orderTakingEnabled=false` -> no-op.


---


### P21 — Dashboard: arrows (move between cards / cycle multi-matches)
**M9 DP:** chip active with 2+ matches (A1: `5 (1/2)`, `5 (2/2)`, table vs room same number) -> left/right/up/down cycle matches, chip "2 of 2". No buffer -> arrows -> `useArrowGridNav.moveFocus` from focused card (or first card) over `[data-kbd-card]`; `preventDefault`. Off-screen paged channel columns not reachable (R12 accepted).
**Smoke:** multi-order table `5` -> chip "1 of 2" -> right -> "2 of 2", second card ringed -> Enter opens that order. No typing -> down/right move ring spatially across Channel columns; page does not scroll-jump.


---


### P22 — Dashboard: Esc clears jump
**M9 DP:** Escape with buffer -> clear buffer + chip + highlight (no navigation). No buffer -> no-op.
**Smoke:** type `C1` -> Esc -> chip gone, no ring; dashboard state unchanged.


---


### P23 — Alt+T: Takeaway
**M9 DP:** `Alt+T` -> `preventDefault`; if takeaway feature enabled (same gate as OE L2475-2478 / existing Takeaway entry) -> `handleOrderTypeChange('takeAway')` (open OE takeaway as current Takeaway button does). Else no-op. Plain `t` stays table typing (A3).
**Smoke:** Alt+T -> OE opens Takeaway, caret in search. Feature off -> no-op. Typing `T1` -> table jump, not takeaway.


---


### P24 — Alt+D: Delivery
**M9 DP:** `Alt+D` -> `preventDefault` (suppress Chrome/Edge address-bar focus); delivery feature-gated -> `handleOrderTypeChange('delivery')`.
**Smoke:** Alt+D -> OE Delivery, **browser address bar NOT focused**; feature off -> no-op. If address bar still grabs focus on target browser -> STOP, raise fallback-key OD.


---


### P25 — Guards and full regression (no new key)
Verification of cross-cutting guards + IA seed #10 R5 cross-flow.
**Smoke:** (a) OE open -> typing `C1` on OE does NOT trigger dashboard jump. (b) Any `[data-kbd-modal]` open -> no OE/DP key fires. (c) Header search typing -> no shortcuts. (d) Tablet/touch (no keyboard) -> nothing changes. (e) Full keyboard-only flow: `C1` Enter -> item Enter -> `+` -> F8 -> (mark served) -> F9 -> panel opens (pay via mouse — Phase B). (f) Full mouse flow: click card -> add -> place -> collect bill -> settle -> print — identical to baseline. **(g) Setting OFF -> zero keyboard behaviour anywhere, identical to pre-CR-482.** **(h) Tablet device -> no auto-focus, no Tab stops on cards, no shortcuts = identical to today.**


---


### P26 — Keyboard cheat sheet (discoverability)
**N5 `components/order-entry/KeyboardCheatSheet.jsx`** — small `?` icon button next to the search input. On click/hover: popover showing Phase A key map in two columns (Dashboard keys + Order Entry keys). Reads from `KBD` constant (N1) so Phase B configurability auto-updates it. Only rendered when `kbdEnabled`. Dismisses on Esc or click-outside.
**M2 OE:** render `<KeyboardCheatSheet />` next to `menu-search-input` (after L1716), gated by `kbdEnabled`.
**Smoke:** (setting ON) OE -> `?` icon visible next to search -> click -> popover shows all shortcuts -> Esc closes. (Setting OFF) -> no `?` icon. Mouse flows unchanged.


---


## 3. Risk Register (carried from IA + Gate 3 additions + rev 2 safety amendments)
| # | Risk | Sev | Phase | Mitigation |
|---|---|:---:|---|---|
| R1 | Alt+D focuses address bar | MED | P24 | preventDefault; QA verify; STOP + OD if fails |
| R2 | One label maps to many cards | HIGH | P21 | cycle matches, chip "n of m" |
| R3 | Shortcuts while typing | HIGH | all | `isTypingTarget`; only F2/F8/F9/F4/F7 from search box |
| R4 | DP layer fires under OE/modals | HIGH | P19 | gate `orderEntryType===null` + no `[data-kbd-modal]` |
| R5 | F7 Caret Browsing | MED | P13 | preventDefault capture phase; STOP + OD if fails |
| R6 | `+`/`-` vs typing | MED | P8 | only empty search / non-input focus |
| R7 | Category-scoped search | MED | P9 | keyboard category switch |
| R8 | `includes()` wrong first hit | MED | P2 | exact itemCode first |
| R9 | Esc loses cart | HIGH | P16 | confirm when unplaced items |
| R10 | F8 double-fire | HIGH | P12 | `clickIfEnabled` honours `disabled` |
| R11 | Ring vs BUG-583/CR-433 border | LOW | P18 | outline + offset |
| R12 | Paged columns unreachable | MED | P21 | accepted |
| G1 | OE keydown listener stale closures (R5 file) | MED | P3+ | handler reads latest state via refs (`cartItemsRef`, `searchQueryRef`) or `useCallback` deps; verify after each phase |
| G2 | Arrow-key in search loses caret Left/Right | LOW | P3 | grid nav wins; Shift+Arrow keeps text selection |
| **G3** | **No feature gate — every restaurant gets keyboard on deploy** | **CRIT** | **P0** | **Settings key `keyboard_shortcuts` off by default; master `kbdEnabled` gate; zero listeners when false (owner safety req)** |
| **G4** | **P1 auto-focus triggers tablet on-screen keyboard** | **CRIT** | **P0-P1** | **`(hover: hover) and (pointer: fine)` media query in `HAS_POINTER_DEVICE()`; no auto-focus on touch devices (owner safety req)** |
| **G5** | **Tab escapes OE overlay to dashboard behind** | **HIGH** | **P1** | **Focus trap with sentinel divs at start/end of OE root** |
| **G6** | **F2 = Find in Firefox** | **MED** | **P11** | **preventDefault in capture; QA verify Firefox; STOP + fallback-key OD if fails** |
| **G7** | **Post-print-dialog focus lost** | **LOW** | **P14** | **setTimeout refocus search after print** |
| **G8** | **No discoverability — cashier doesn't know shortcuts exist** | **LOW** | **P26** | **`?` icon + popover cheat sheet next to search, gated by `kbdEnabled`** |


---


## 4. Verification Matrix (Step 4)
| Edit/Phase | File | Change | How to Verify | Automated? |
|---|---|---|---|:---:|
| P0 | N1-N3, M14, index.css | constants, hooks, ring CSS, settings gate | Unit: `__tests__/cr482_kbd.test.js` — `isTypingTarget`, `clickIfEnabled` (disabled -> false), `moveFocus` nearest pick, `HAS_POINTER_DEVICE` returns bool; verify `kbdEnabled=false` when settings key absent | YES |
| P1 | OrderEntry L1702 | autofocus search + focus trap | Browser: (setting ON + desktop) open table -> `document.activeElement` = menu-search-input; (setting OFF) no autofocus; (tablet) no autofocus; Tab at OE end wraps to first element | YES (Playwright) |
| P2 | OrderEntry L558/L1836 | exact-code highlight | Browser: type `1` -> ring on code-1 item | YES |
| P3 | OrderEntry grid | arrow nav | Browser: down -> highlighted testid changes | YES |
| P4 | OrderEntry L605 | Enter add + lastAdded | Browser: Enter -> cart line qty 1, search empty | YES |
| P5 | ItemCustomizationModal | Esc / Ctrl+Enter | Browser: Ctrl+Enter adds, Esc closes | YES |
| P6 | WeightEntryModal | Enter / Esc | Browser: weight Enter adds | YES |
| P7 | OrderEntry L2765 | Esc price box | Browser: Esc closes | YES |
| P8 | OrderEntry | +/- last added | Browser: qty 1->3->2, min 1 | YES |
| P9 | CategoryPanel | up/down/Enter | Browser: category switch, focus returns | YES |
| P10 | CartPanel L65/L226 | Ctrl+Down rows | Browser: row focus, +/-/Delete/Esc | YES |
| P11 | OrderEntry | F2 | Browser: focus search; **Firefox: Find bar NOT opened** | YES + PARTIAL (Firefox manual) |
| P12 | OrderEntry | F8 | Network: exactly 1 place call on triple press | YES |
| P13 | OrderEntry + StationPicker | F7 | Browser + **manual Chrome check: no Caret dialog** | PARTIAL |
| P14 | OrderEntry | F4 | Browser: print call fires; no-op w/o permission; **focus returns to search after print dialog** | YES |
| P15 | OrderEntry | F9 | Browser: panel opens; disabled -> no-op; panel open -> keys inert | YES |
| P16 | OrderEntry | Esc chain + confirm | Browser: clear -> confirm -> leave | YES |
| P17 | 4 modals | Esc | Browser: each closes | YES |
| P18 | TableCard/OrderCard/ChannelColumn | Tab/Enter, ring | Browser: Tab focus, Enter opens; manual visual vs BUG-583 border | PARTIAL |
| P19 | DashboardPage + TableJumpChip | type-to-jump | Browser: chip text + ring; 2s timeout; Order View "not in view" | YES |
| P20 | DashboardPage | Enter opens | Browser: OE opens correct table | YES |
| P21 | DashboardPage | arrows / cycle | Browser: "1 of 2" -> "2 of 2" | YES |
| P22 | DashboardPage | Esc clear | Browser: chip gone | YES |
| P23 | DashboardPage | Alt+T | Browser: takeaway OE | YES |
| P24 | DashboardPage | Alt+D | Browser + **manual Chrome check: address bar not focused** | PARTIAL |
| P25 | all | guards + regression | Testing agent full keyboard + mouse flows (IA seeds 1-10); **setting OFF = zero keyboard behaviour; tablet = zero keyboard behaviour** | YES |
| P26 | OrderEntry + KeyboardCheatSheet | `?` icon + popover | Browser: (setting ON) `?` visible, click shows key map, Esc closes; (setting OFF) no icon | YES |


**Totals:** 28 checks — 24 automated, 4 partial/manual (F7 caret, F2 Firefox Find, Alt+D address bar, ring vs border visual).


---


## 5. Post-Code Registry Checklist (Step 5 — IMPLEMENTATION agent)
```
- [ ] registry.json: CR-482 -> status: IMPLEMENTED (Phase A), sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: CR-482 row -> IMPLEMENTED (Phase A) + plan/QA links
- [ ] FILE_OWNERSHIP.md: add N1-N5, M1-M14 with CR-482 + date
- [ ] Code markers: // CR-482 in every modified file/block
- [ ] Per-phase smoke results logged in handover (P0-P26 PASS/FAIL)
- [ ] Phase B (Collect Bill keys + configurable map) remains separate, not started
- [ ] Backend brief filed for settings key: memory/backend_briefs/BACKEND_BRIEF_CR-482_SETTINGS_KEY.md
```


---


## 6. Owner Decisions
None open for Phase A. G8 cheat sheet: **owner approved — included as P26.** Two **conditional** ODs only if QA fails on target browser: F7 fallback key (P13), F2 fallback key (P11 — Firefox), Alt+D fallback key (P24).


## 7. Handover
Plan ready at `memory/plans/CR-482_IMPLEMENTATION_PLAN.md` (rev 2 — safety amendments). 27 phases (P0-P26; one key per phase) across 5 new + 14 modified files. Code reality: NONE. Scope: see S1. Verification matrix: 28 checks (24 automated, 4 partial). Owner decisions needed: none (3 conditional). Backend brief filed for settings key. **Awaiting Gate 4 GO.**


---


## Appendix A: Rev 2 Safety Amendments (2026-11-05)

Owner-requested safety measures added to all phases:

### A1. On/off switch — off by default (G3)
- New backend settings key `keyboard_shortcuts` (default `"No"`) — backend brief at `memory/backend_briefs/BACKEND_BRIEF_CR-482_SETTINGS_KEY.md`
- Frontend reads via `profileTransform.js` -> `settings.keyboardShortcuts`
- **Dev override:** `localStorage.getItem('__cr482_kbd_dev') === 'true'` as fallback when API key absent (Option A — strip before shipping)
- **Production:** backend adds key → toggle in Settings page (General Settings section) → owner self-serves
- Master gate: `kbdEnabled = (!!settings?.keyboardShortcuts || localStorage.__cr482_kbd_dev==='true') && HAS_POINTER_DEVICE()`
- When `false`: zero keydown listeners, zero tabIndex, zero focus rings, zero auto-focus
- **Net result: flag off = byte-identical runtime behaviour to pre-CR-482**

### A2. Physical keyboard detection — no tablet on-screen keyboard (G4)
- `HAS_POINTER_DEVICE()` = `window.matchMedia('(hover: hover) and (pointer: fine)').matches`
- Desktop/laptop with mouse: `true` (keyboard features active)
- Tablet/phone touch-only: `false` (no auto-focus, no shortcuts, no Tab stops on cards)
- Laptop with touchscreen: `true` (has mouse too — correct)

### A3. Focus trap in Order Entry overlay (G5)
- Prevents Tab from escaping to dashboard behind the z-50 overlay
- Sentinel divs at start/end of OE root

### A4. F2 Firefox verification (G6)
- F2 opens Find bar in Firefox; preventDefault in capture should suppress
- QA must verify; STOP + fallback-key OD if not suppressible

### A5. Post-print focus return (G7)
- After F4 Print Bill + browser print dialog close, refocus search via setTimeout

### A6. Keyboard cheat sheet (G8)
- `?` icon next to search with popover showing all shortcuts
- Only rendered when `kbdEnabled` = true
- Reads from KBD constant — Phase B configurability auto-updates it

### Additivity guarantee
Every change gated behind `kbdEnabled`. When `false`:
- Zero `window.addEventListener('keydown', ...)` calls
- Zero `tabIndex` attributes added to cards
- Zero `.kbd-focus` / `.kbd-highlight` classes rendered
- Zero auto-focus on search
- Zero `?` cheat sheet icon
- `data-kbd-modal` attributes are static strings with no consumer = harmless
- **No existing outlet sees any change until backend enables the key for them.**
