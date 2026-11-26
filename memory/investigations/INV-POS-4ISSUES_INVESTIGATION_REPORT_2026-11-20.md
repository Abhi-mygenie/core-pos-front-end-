# Investigation Report — 4 POS issues (APS price, popup cancel wording, aggregator expand in Table mode, open-item KOT)
**Role:** INVESTIGATION (Role 6) — read-only, no code written
**Date:** 2026-11-20
**Reporter:** Owner
**Confidence:** HIGH on all 4 (end-to-end code traces)

---

## Issue 1 — APS item: cannot enter price from the Accept pop-up (or for a web-order item in Order Entry)

| Field | Value |
|---|---|
| **Classification** | FE_GAP (feature not wired for web/scan path) |
| **Confidence** | HIGH |
| **Risk** | HIGH (touches order capture / pricing) — **not** Planning-skip |

**What exists today**
- "APS" = a menu product whose catalog unit price is exactly **₹1** (`PopoutItemRow.jsx:73` `isAps = unit === 1 && !isComp`, CR-545).
- In **Order Entry**, tapping a ₹1 item opens the existing **"Enter Price"** modal and the cashier-typed price becomes the line's unit price — `OrderEntry.jsx:850` (`if (Number(item.price) === 1) setDynamicPriceItem(item)`) → modal at `OrderEntry.jsx:3038-3101` → `confirmDynamicPriceAndAdd` (`OrderEntry.jsx:880-928`). This is the "existing model" the owner refers to and it works.

**Break point**
- The **Accept pop-up** (`ScanOrderPopOut.jsx` → `PopoutItemRow.jsx`) is **presentation-only** (file header L3). For an APS item it renders a **read-only "Price TBD" badge** (`PopoutItemRow.jsx:116-118`) with **no price-entry affordance**. So an APS item that arrives on a web/scan order cannot be priced before Accept.
- Same gap when such an order is opened in **Order Entry via Edit**: the APS line is already in the cart (not a fresh tap), so the ₹1→`setDynamicPriceItem` trigger at `OrderEntry.jsx:850` never fires → no "Enter Price" prompt for it.

**Recommendation:** Reuse the existing `dynamicPriceItem` "Enter Price" model for APS rows in the Accept pop-up and/or the Order-Entry edit view. This is a **CR** (order-capture + pricing, HIGH risk) → full gate flow (Intake → Planning). Owner decision needed: where price is entered (pop-up before Accept, or forced in Order-Entry edit), and whether an unpriced APS item may be accepted at all.

---

## Issue 2 — From the pop-up, "cancel" shows a single **item** (not the whole order) — misleading

| Field | Value |
|---|---|
| **Classification** | FE_UX / wording |
| **Confidence** | HIGH |
| **Risk** | MEDIUM |

**Finding** — the pop-up has **two different cancel affordances**, which is the source of confusion:
1. **Per-item ✕** on each row → `PopoutItemRow onCancel` → `ScanOrderPopOut.jsx:571/653` `onCancelItem(activeOrder, item)` → opens **`CancelFoodModal`** (item-level). This is the modal in the owner's screenshot: title **"Cancel melo fish"** (`CancelFoodModal.jsx:72`), footer **"Cancelling: 1 melo fish"** (`:237-239`), button **"Cancel Item"** (`:262`). Behaviour is correct (CR-545 per-item cancel) but the labelling reads like it is the *order* cancel.
2. **"Reject" button** (bottom) → `ScanOrderPopOut.jsx:746` → `handleRejectClick` → `onReject(order)` → `handleCancelOrderFromCard` → **`CancelOrderModal`** (order-level). Tooltip says *"Reject / Cancel order — opens cancel modal"* (`:750`).

So the "item loop" the owner sees is the **per-item ✕ → CancelFoodModal**, which is per design but visually indistinguishable from an order-level cancel.

**Recommendation:** UX clarification only — e.g. relabel/retitle the per-item modal so it clearly reads as a single-item action, and make the order-level "Reject/Cancel order" affordance distinct. No backend. **Owner decision:** confirm intended behaviour (keep per-item cancel + clearer wording, vs. make the pop-up cancel order-wise). → Intake as BUG/CR, LOW–MEDIUM risk.

---

## Issue 3 — CR to expand an aggregator order in **Table mode** is not working (BUG-703)

| Field | Value |
|---|---|
| **Classification** | FE_BUG — fix wired into the **wrong (inactive) layout** |
| **Confidence** | HIGH |
| **Risk** | MEDIUM |
| **Test acct** | poki@macha.com |

**Root cause (single line):** BUG-703 threaded `onAggregatorView` through the **old area layout** (`TableSection.jsx:52`) + old grid `TableCard` (`DashboardPage.jsx:2191`) — both rendered only when `USE_CHANNEL_LAYOUT === false`. But the live flag is **`USE_CHANNEL_LAYOUT = true`** (`constants/featureFlags.js:20`), so the active render path is **`ChannelColumnsLayout` → `ChannelColumn` → `TableCard`**, and that path is **never passed `onAggregatorView`**.

**Trace**
- Live layout: `DashboardPage.jsx:2047-2101` renders `<ChannelColumnsLayout … />` — it passes `onItemClick`, `onAggregatorReady`, `onAggregatorDispatch`, **but NOT `onAggregatorView`**.
- `ChannelColumn.jsx:321-325` renders `<TableCard onClick={onItemClick} onOpenModal={onItemClick} … />` — **no `onAggregatorView` prop**.
- `TableCard.jsx:317`: for an aggregator tile, `onClick = isEngaged ? undefined : (isAggregator ? (table.order ? () => onAggregatorView?.(table.order) : undefined) : handleCardClick)`. With `onAggregatorView` undefined, `onAggregatorView?.(…)` resolves to **undefined → tap is a no-op**.
- The handler + state + read-only view mode themselves are all present and correct: `handleAggregatorView` (`DashboardPage.jsx:1479`), `aggregatorViewOrder` state (`:485`), render `<AggregatorOrderPopOut viewOrder={aggregatorViewOrder} … />` (`:1950-1958`), view-only mode (`AggregatorOrderPopOut.jsx:165-167, 208, 418`). They just can't be reached from the live layout.

**Why registry says IMPLEMENTED:** the 2026-11-19 BUG-703 impl note lists `TableSection.jsx` (old layout) as the prop-thread file; `ChannelColumnsLayout.jsx` / `ChannelColumn.jsx` were missed.

**Recommendation (FE fix, ~3 files, few lines):** thread `onAggregatorView` through `ChannelColumnsLayout` (destructure + forward to `ChannelColumn`) and `ChannelColumn` (forward to `TableCard`), and pass `onAggregatorView={handleAggregatorView}` on the `<ChannelColumnsLayout>` instance in `DashboardPage.jsx:2048`. MEDIUM risk (dashboard interaction) — recommend a short Planning pass rather than Planning-skip because it touches shared dashboard wiring.

---

## Issue 4 — Open / custom (out-of-menu) item KOT not printing on first placement

Pre-existing HIGH-confidence report provided by owner, persisted to `memory/investigations/INV-KOT-CUSTOM-ITEM-2026-11-20.md`.

| Field | Value |
|---|---|
| **Classification** | FE_BUG |
| **Confidence** | HIGH |
| **Risk** | LOW (1 file, 1 line) |

**Root cause:** `customItemFromAPI` (`orderTransform.js:2320-2331`) does not map `data.station` onto the cart item → `station` undefined → `cartStationsToSet` skips it → `selectAgentsForKot` returns `[]` → place-order payload carries `printer_agent: []` and per-item `station: null` → backend cannot route the KOT. Reprint works because the socket response enriches the placed item with `station: detail.station || 'KDS'`.
**Recommendation:** add `station: data.station || null` to `customItemFromAPI`. Planning-skip eligible per the report (owner approval). (Relationship note: this is the *custom/out-of-menu* item path; Issue 1 is the *APS ₹1 menu* path — related symptom family, different lines.)

---

## Summary table

| # | Issue | Class | Root cause | Files | Risk | Next |
|---|---|---|---|---|---|---|
| 1 | APS price not enterable from pop-up / web-order edit | FE_GAP | "Enter Price" model only wired to fresh ₹1 taps in Order Entry; pop-up row is read-only "Price TBD" | ScanOrderPopOut / PopoutItemRow / OrderEntry | HIGH | Intake→Planning (CR) |
| 2 | Pop-up cancel shows single item, not order-wise | FE_UX | Per-item ✕ opens CancelFoodModal (item-level); order-level cancel is the separate "Reject" button | ScanOrderPopOut / CancelFoodModal / CancelOrderModal | MEDIUM | Owner decision → Intake |
| 3 | Aggregator expand in Table mode not working | FE_BUG | `onAggregatorView` not threaded through live `ChannelColumnsLayout`→`ChannelColumn`→`TableCard` (BUG-703 wired only to inactive area layout) | DashboardPage / ChannelColumnsLayout / ChannelColumn | MEDIUM | FE fix (short Planning) |
| 4 | Open/custom item KOT not printing | FE_BUG | `customItemFromAPI` omits `station` | orderTransform.js:2320 | LOW | Planning-skip (owner approve) |

**No application code changed. Awaiting owner decision on which to progress and via which gate.**
