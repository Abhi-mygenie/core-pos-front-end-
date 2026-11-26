# CR-482 — Impact Analysis (Phase A)
## Keyboard navigation — Dashboard + Order Entry (fixed keys)

**ID:** CR-482  **Gate:** 2 — Impact Analysis (COMPLETE — all ODs closed, held at Gate 2)  **Date:** 2026-11-05 (rev 3)  **Role:** PLANNING
**Phase:** A (Dashboard + Order Entry, FIXED keys). Phase B (Collect Bill keys + configurable key map) is OUT of scope.
**Code Reality:** NONE — zero `keydown` shortcut layer in POS. Only: dynamic-price input Enter (`OrderEntry.jsx` L2765), Sidebar drawer Esc (`Sidebar.jsx` L298, tablet only), OrderDetailSheet Esc (reports, untouched). No hotkey library in `package.json`.
**Risk:** HIGH (order flow; 2 R5 hotspots: `DashboardPage.jsx`, `OrderEntry.jsx`). Not CRITICAL: no tax/total/settle/print-semantics change — F4/F7/F8/F9 only *trigger existing buttons*.
**Priority:** P0 (owner directive 2026-11-05).
**Evidence:** Live preview, cafe103 owner account (creds: `memory/control/test_credentials.md`, pwd `***`). Dashboard renders Channel layout (`USE_CHANNEL_LAYOUT = true`), 40+ table cards, labels are **alphanumeric** (`C1`, `C2`, `C3`) and numeric (`101`...`401`).

---

## 0. Locked Owner Decisions (from intake)

| OD | Decision |
|---|---|
| Scope | Phase A = Dashboard + Order Entry; Phase B = Collect Bill + configurable keys |
| Table pick | Option A — type table label directly, `Enter` opens; arrows also move between cards |
| Busy table + Enter | Same as click — Order Entry with running order loaded |
| Qty | `+`/`-` adjusts LAST ADDED item (search box empty) |
| Keys | F2 search . F4 Print Bill . F7 Re-Print KOT . F8 Place Order . F9 open Collect Bill . T Takeaway . D Delivery . Esc back/cancel |
| Universal | Tab/Shift+Tab, Enter, Esc, Space, arrows; orange focus ring; suppressed while typing in inputs |
| Phase-B prep | All keys in ONE action-to-key map constant from day one |

---

## 1. Conflict Pre-Check

| File | Open items touching it | Verdict |
|---|---|---|
| `CartPanel.jsx` | BUG-609 (L879 `isCustomerSelected`, not started) | PARALLEL-SAFE — different region; do BUG-609 first or rebase |
| `TableCard.jsx` / `OrderCard.jsx` | BUG-583 (BACKEND_BLOCKED, border on bill print) | PARALLEL-SAFE — CR-482 adds focus ring; must not override BUG-583 border style. Coordinate if BUG-583 unblocks |
| `OrderEntry.jsx` | CR-489 (FROZEN, lock after bill print) | PARALLEL-SAFE while frozen; F4/F7/F8 trigger buttons, so any future lock gating flows through automatically |
| `DashboardPage.jsx` / `Header.jsx` | none open (BUG-584..590 search fixes QA-passed) | SAFE — CR-482 does NOT modify header search |

---

## 2. Data / Control Flow Trace

### 2a. Dashboard to Order Entry (today)
```
TableCard div onClick (TableCard.jsx L303-306, not focusable, no tabIndex)
  -> handleCardClick -> onClick/onOpenModal(table)            (both = handleTableClick)
    -> DashboardPage.handleTableClick (L1458-1498)
       guards: !orderTakingEnabled -> no-op | engaged -> no-op | available room -> RoomCheckInModal
       -> setOrderEntryTable + setOrderEntryType(dineIn/takeAway/delivery/walkIn)
         -> <OrderEntry> overlay mounts (L2075, fixed inset-0 z-50)
Add button -> handleAddOrder (L1500) -> walkIn
Order type switch -> handleOrderTypeChange (L1505) — gated in OE by features.delivery / features.takeaway (OE L2475-2478)
```
Render paths for cards (all must get keyboard support):
- `ChannelColumnsLayout` -> `ChannelColumn.jsx` L320 `<TableCard>` (Table View) / L347+L377 `<OrderCard>` (Order View) — **ACTIVE path**
- Legacy (flag off): `TableSection.jsx` L47, DashboardPage L1920 `<TableCard>`, L1975/2012/2042 `<OrderCard>`

Table identity: `label = t.tableNumber` (L558); multi-order table has `label = "5 (1/2)"`, `id = tableId-orderId` (L571). Rooms: same pattern (L692-704). One typed number can map to 2+ cards (see OD-482-A1).

Order View hides available tables (`ChannelColumn` L314: `viewType==='order' && !item.orderId -> null`) so typing a free table number in Order View has no visible card (see OD-482-A2).

### 2b. Order Entry item add (today)
```
menu-search-input (OE L1701) — NOT auto-focused
getFilteredItems (L558): category-scoped (default "all", L105) + name/itemCode includes()
Menu grid (L1829): flex-wrap pill <button>s, variable width, data-testid menu-item-{id}
  click -> item.customizable ? setCustomizationItem : addToCart(item)
addToCart (L605): weight -> WeightEntryModal | price==1 -> inline dynamic-price box | else merge into existing unplaced line or append
confirmDynamicPriceAndAdd (L658), confirmWeightAndAdd (L704), addCustomizedItemToCart (~L821)
```
No "last added item" concept exists today — must be introduced (ref holding `_cartKey`; merge case = existing line's key).

### 2c. Action buttons the F-keys will trigger (no logic duplication)
| Key | Existing button | Location | Enabled/visible gate (reused as-is) |
|---|---|---|---|
| F8 | `place-order-btn` | CartPanel L1572 | `newItemCount===0 || isPlacingOrder || hasValidationErrors || schedule invalid`; hidden for prepaid w/ placed items |
| F9 | `collect-bill-btn` | CartPanel L1593 | `canBill`; disabled if unplaced items, **not served**, validation errors |
| F9 (QSR) | `qsr-collect-bill-btn` | CartPanel L719 | QSR mode only (`qsrMode`) |
| F7 | `reprint-kot-btn` | RePrintButton L70/L202, used CartPanel L1262/L1298 | needs orderId; multi-station -> `StationPickerModal` |
| F4 | `order-entry-print-bill-btn-{orderId}` | OE L2580 (`PrintBillButton`) | `canPrintBill && hasPlacedItems && orderId` |
| Esc | `category-back-btn` -> `onClose` | CategoryPanel L42 | **today: no unsaved-items confirm**; `handleCloseOrderEntry` (DP L1519) clears saved cart |

**Design principle:** F-keys call `.click()` on the existing button (queried by data-testid) only if present and not `disabled`. Permissions, served-state, prepaid/print semantics stay 100% in current code — R6 untouched.

### 2d. Modals in the Phase A flow (all custom `fixed inset-0` divs, none Radix, none handle keys)
| Modal | File | Keyboard today |
|---|---|---|
| ItemCustomizationModal | order-entry/ItemCustomizationModal.jsx (734 L) | options are `<button>`s (Tab/Space/Enter native); `add-to-order-btn` L724; autoFocus L369/646; **no Esc** |
| WeightEntryModal | order-entry/WeightEntryModal.jsx | `weight-input` autoFocus L176; **no Enter-to-add, no Esc** |
| Dynamic price box | OrderEntry L2736-2795 | Enter works (L2765); **no Esc** |
| StationPickerModal | modals/StationPickerModal.jsx (z-300) | checkboxes + confirm/cancel buttons; **no Esc/Enter** |
| CustomerModal | order-entry/CustomerModal.jsx | **no Esc** |
| OrderPlacedModal | auto-closes 2s | n/a |
| AddCustomItemModal / OrderNotesModal / ItemNotesModal | order-entry/* | autoFocus only; **no Esc** |

---

## 3. Affected Files

### Files WILL change (proposed)
| # | File | Hotspot | Change |
|---|---|:---:|---|
| 1 | **NEW** `src/constants/keyboardShortcuts.js` | — | Single action-to-key map (Phase B swap point) |
| 2 | **NEW** `src/hooks/useKeyboardShortcuts.js` | — | One `keydown` listener; `isTypingTarget` guard (input/textarea/select/contentEditable); `isModalOpen` guard (`[data-kbd-modal]` present); preventDefault on handled F-keys |
| 3 | **NEW** `src/hooks/useArrowGridNav.js` | — | Spatial arrow nav over `[data-kbd-card]` via `getBoundingClientRect` (layout-agnostic: channel columns, masonry, flex-wrap pills) |
| 4 | **NEW** `src/components/dashboard/TableJumpChip.jsx` | — | Floating "Table: C1" chip (match / no-match states) |
| 4b | **NEW** `src/components/order-entry/KeyboardCheatSheet.jsx` | — | `?` icon + popover showing key map; only rendered when `kbdEnabled` (G8) |
| 5 | `pages/DashboardPage.jsx` | **R5** | Mount dashboard layer (active only when `orderEntryType===null` and no dashboard modal open): type-buffer, label match over `allTablesList`+`allRoomsList`, Enter->`handleTableClick`, T/D->`handleOrderTypeChange` (feature-gated), pass `kbdHighlightId` down |
| 6 | `components/dashboard/ChannelColumn.jsx` | — | Pass highlight prop to TableCard/OrderCard |
| 7 | `components/cards/TableCard.jsx` | — | `tabIndex=0`, `data-kbd-card`, Enter->`handleCardClick`, focus-visible + highlight ring (must not clash with BUG-583/CR-433 border) |
| 8 | `components/cards/OrderCard.jsx` | — | Same as #7 for Order View (Enter->`onEdit`) |
| 9 | `components/order-entry/OrderEntry.jsx` | **R5** | Autofocus search on mount; `highlightIndex` over `getFilteredItems()`; Enter->same branch as click (L1837); `lastAddedKeyRef` set in addToCart/confirmDynamic/confirmWeight/addCustomized; `+`/`-` on last added; F2/F4/F7/F8/F9 triggers; Esc chain (modal -> clear search -> confirm-leave); Esc on inline dynamic-price box; suspend layer while `showPaymentPanel` (Phase B) |
| 10 | `components/order-entry/CartPanel.jsx` | — | Ctrl+Down focus into cart lines; row-level `+`/`-`/Delete/Esc in `NewItemRow`/`PlacedItemRow` (placed rows keep min=originalQty rule) |
| 11 | `components/order-entry/ItemCustomizationModal.jsx` | — | `data-kbd-modal`; Esc->onClose; Ctrl+Enter->Add (see OD-482-A5) |
| 12 | `components/order-entry/WeightEntryModal.jsx` | — | `data-kbd-modal`; Enter->confirm; Esc->onClose |
| 13 | `components/modals/StationPickerModal.jsx` | — | `data-kbd-modal`; Enter->confirm; Esc->cancel; arrows/Space on checkboxes |
| 14 | `components/order-entry/CustomerModal.jsx`, `AddCustomItemModal.jsx`, `OrderNotesModal.jsx`, `ItemNotesModal.jsx` | — | `data-kbd-modal` + Esc->onClose only |
| 15 | `index.css` (or Tailwind util) | — | One shared `.kbd-focus` ring class (orange) |
| 16 | `api/transforms/profileTransform.js` | — | One line: `keyboardShortcuts: toBoolean(apiSettings.settings?.keyboard_shortcuts)` — settings gate (G3) |

**Blast radius:** LARGE — 5 new + ~14 modified files, 2 R5 hotspots. OWNER APPROVAL MATRIX applies at Gate 4 (3+ hotspot rule not hit; 2 hotspots).
**All changes gated behind `kbdEnabled = (!!settings?.keyboardShortcuts || localStorage.__cr482_kbd_dev==='true') && HAS_POINTER_DEVICE()`. When false = zero change.**
**Dev override: `localStorage.__cr482_kbd_dev = 'true'` for testing. Production: backend key + Settings page toggle (General Settings section).**

### Files will NOT touch
`CollectPaymentPanel.jsx` (Phase B) . `orderTransform.js` . `orderService.js` / `printOrder` . `RePrintButton.jsx` logic (only clicked) . `Header.jsx` search . `AppProviders.jsx` . any localStorage key (R8) . backend . `LoadingPage.jsx` . reports / PMS / Sidebar.

---

## 4. Implementation Considerations and Risks

| # | Risk | Severity | Mitigation |
|---|---|:---:|---|
| R1 | T/D hotkeys collide with alphanumeric table labels | RESOLVED | OD-482-A3: Alt+T / Alt+D (verify Alt+D does not focus browser address bar — preventDefault; QA check) |
| R2 | Same number maps to multiple cards (multi-order table `5 (1/2)`, table vs room same number) | HIGH | OD-482-A1 |
| R3 | Shortcuts firing while typing (header search, CRM phone, notes, price/weight inputs) | HIGH | `isTypingTarget` guard; F-keys still allowed from search box only (F2/F8/F9) — see OD-482-A6 |
| R4 | Dashboard layer firing while OrderEntry overlay / RoomCheckIn / CancelOrder / Aggregator modals open | HIGH | Gate on `orderEntryType===null` + no `[data-kbd-modal]` |
| R5 | Browser-reserved keys: **F7 = Caret Browsing prompt in Chrome/Edge/Firefox**, F4 harmless, F5/F6/F11 avoided | MEDIUM | `preventDefault` on keydown; QA must verify F7 prompt is suppressed on target browser; fallback key if not |
| R6 | `+`/`-` conflicts with numpad typing in search / qty inputs | MEDIUM | Only when search empty and focus not in an input |
| R7 | Search is **category-scoped** — if cashier changed category, typed item not found | MEDIUM | OD-482-A4 = keep scoped; add keyboard category switch (e.g. Tab into category list + Up/Down + Enter) |
| R8 | `includes()` match: "1" matches 10,11,101 etc — wrong first highlight | MEDIUM | Highlight exact itemCode match first (no grid reorder) |
| R9 | Esc-to-dashboard loses unsaved cart (handleCloseOrderEntry clears it) | HIGH | Confirm dialog when unplaced items exist (keyboard path only — mouse Back unchanged unless owner wants both, OD-482-A7) |
| R10 | Double-fire F8 during `isPlacingOrder` | HIGH | Trigger respects `disabled` attribute — no-op |
| R11 | Focus ring vs CR-433 orange border / BUG-583 future border | LOW | Use outline (not border) with offset |
| R12 | Arrow nav in masonry/channel carousel (paged columns) | MEDIUM | Spatial nearest-in-direction over rendered cards; off-screen paged columns not reachable (accept) |
| R13 | Tablet/touch devices | LOW | Layer inert without physical keyboard — `HAS_POINTER_DEVICE()` = `(hover: hover) and (pointer: fine)` media query (G4) |
| R14 | `orderTakingEnabled=false`, engaged tables | LOW | Already guarded inside `handleTableClick` |
| **R15** | **No feature gate — all outlets impacted on deploy** | **CRITICAL** | **Backend settings key `keyboard_shortcuts` off by default; master `kbdEnabled` gate; zero listeners when false (G3)** |
| **R16** | **Tab escapes OE overlay to dashboard behind** | **HIGH** | **Focus trap with sentinel divs in OE root (G5)** |
| **R17** | **F2 = Find in Firefox** | **MEDIUM** | **preventDefault in capture; QA verify; STOP + fallback-key OD (G6)** |
| **R18** | **Post-print-dialog focus lost** | **LOW** | **setTimeout refocus search after F4 print (G7)** |
| **R19** | **No discoverability of shortcuts** | **LOW** | **`?` icon + popover cheat sheet gated by `kbdEnabled` (G8)** |

---

## 5. Owner Decisions (Phase A) — ALL CLOSED

| OD | Question | Answer |
|---|---|---|
| **OD-482-A1** | Typed number matches 2+ cards — what happens? | Typing = focus/highlight only; 1st match focused, chip shows "1 of 2", arrows cycle matches, Enter opens focused card |
| **OD-482-A2** | In **Order View**, free tables have no card. Typing a free table number + Enter should...? | **No** — only tables with a visible card; chip shows "not in this view" |
| **OD-482-A3** | Table labels can contain letters (`C1` live). `T`/`D` would clash with labels like `T1`/`D2`. | **Alt+T = Takeaway, Alt+D = Delivery** (feature-gated); plain letters always go to table typing |
| **OD-482-A4** | Item search only looks inside the selected category. While typing via keyboard, search all categories? | **No** — stays category-scoped (today). Gate 3 must add keyboard category switching |
| **OD-482-A5** | Item options popup: Enter on a focused option selects it. How to "Add to order"? | **Both** — `Ctrl+Enter` adds from anywhere; Tab to Add button + Enter; plain Enter selects focused option |
| **OD-482-A6** | Should F8/F9/F4/F7 work while the cursor is in the item search box? | **Yes** (search box only; never in customer/notes/price inputs) |
| **OD-482-A7** | Unsaved-items confirm on leaving: keyboard Esc only, or also the mouse Back button? | **Esc only** (mouse Back unchanged) |
| **OD-482-A8** | Typed-table chip clears after how long without a key? | **2 seconds** |

---

## 6. Verification Seeds (for Gate 3 matrix)
1. Dashboard: type `C1` -> chip + ring on C1 -> Enter -> OE opens dineIn C1, cursor in search.
2. Busy table -> Enter -> OE with placed items; add 1 item; F8 -> "Update Order (1)" fires once; KOT only new item.
3. Type in header search box -> no table chip, no T/D action.
4. OE: type code -> first exact-code item highlighted -> Enter adds -> search cleared + focused -> `+` x2 -> qty 3.
5. Customizable / weight / price=1 items via Enter -> correct modal -> keyboard confirm/Esc.
6. F9 disabled when not served -> no-op; F4/F7 hidden without permission/orderId -> no-op.
7. F7 multi-station -> StationPicker -> Enter prints; Chrome caret prompt does NOT appear.
8. Esc with unplaced items -> confirm; Esc with none -> dashboard.
9. Collect Bill panel open -> Phase A keys inert (except existing behaviour).
10. Regression: mouse flows unchanged (click card, add item, place, collect bill, print) — R5 cross-flow: place -> collect -> settle.

---

## 7. Execution Sequence (for Gate 3)
1. Constants + `useKeyboardShortcuts` + `useArrowGridNav` + focus CSS (no UI change).
2. Modals: `data-kbd-modal` + Esc/Enter (isolated, low risk).
3. OrderEntry + CartPanel layer (R5) — search focus, highlight, add, qty, F-keys, Esc chain.
4. Dashboard layer (R5) — buffer, chip, match, Enter, T/D, arrows; TableCard/OrderCard/ChannelColumn focus.
5. QA: frontend testing agent with cafe103 account.

---

## 8. Summary
- Code reality NONE; pure frontend; no API, transform, financial or localStorage change.
- All business actions reuse existing buttons — existing permission/served/prepaid/print rules apply unchanged.
- **Settings gate: `keyboard_shortcuts` key off by default. No outlet impacted until explicitly enabled.** Backend brief filed.
- **Physical keyboard detection: no tablet on-screen keyboard popup.** `(hover: hover) and (pointer: fine)` media query.
- **Focus trap in OE overlay: Tab cannot escape to dashboard.**
- **Cheat sheet: `?` icon shows available shortcuts.**
- ODs: A1-A5 ANSWERED, A6-A8 DEFAULTED — **all Phase A ODs closed**. Item held at Gate 3; awaiting Gate 4 GO.

---

## 9. Owner Answers (2026-11-05, round 1)
- OD-482-A2 — ANSWERED: **No** — typed table opens only if its card is visible (Order View hides free tables -> no-op, chip shows "not in view").
- OD-482-A4 — ANSWERED: **No** — search stays scoped to the open category (today's behaviour). Category switch via keyboard needed instead (Tab to category list / arrows) — add to Gate 3.
- OD-482-A5 — Owner asked for suggestion -> agent recommends **Ctrl+Enter adds from anywhere + Tab to Add button + Enter** (both). Pending confirm.
- OD-482-A1 — Owner clarified intent: typing = FOCUS/HIGHLIGHT only, Enter opens the focused card. Agent proposal: first match focused, arrows move among matches while chip active. Pending confirm.
- OD-482-A3 — Owner asked if F-keys were assigned for Takeaway/Delivery: NO — only order-screen F-keys (F2/F4/F7/F8/F9) were assigned; T/D were plain letters. Pending choice.
- OD-482-A6/A7/A8 — defaulted to recommendation (no owner objection).

## 10. Owner Answers (round 2) — ALL Phase A ODs CLOSED
- A1: Highlight first match, arrows switch between matches, Enter opens.
- A3: Alt+T Takeaway, Alt+D Delivery (letters reserved for table typing). Note: Alt+D is Chrome/Edge "focus address bar" -> must preventDefault; QA to verify.
- A5: Both — Ctrl+Enter anywhere, or Tab to Add + Enter.

### Final Phase A key map (supersedes intake T/D)
Dashboard: type label (letters+digits) -> highlight . arrows -> move / cycle matches . Enter -> open . Backspace/Esc -> edit/clear . Alt+T / Alt+D -> Takeaway / Delivery.
Order Entry: auto-focus search . arrows -> highlight . Enter -> add . +/- last added . Ctrl+Down cart lines . keyboard category switch . F2 search . F4 Print Bill . F7 Re-Print KOT . F8 Place Order . F9 Collect Bill . Esc chain (confirm if unsaved).
Popups: Esc close . Enter confirm . item options: Ctrl+Enter add.
