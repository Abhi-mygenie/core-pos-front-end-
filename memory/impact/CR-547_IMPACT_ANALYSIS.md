# Impact Analysis — CR-547: Selective KOT in ScanOrderPopOut

**Gate:** 2 — Impact Analysis · **Role:** PLANNING
**Date:** 2026-11-18 · **Status:** GATE_2_5_DESIGN_APPROVED (pattern approved)
**Priority:** P0 (was P2) · **Risk:** HIGH (was LOW) · **Assignee:** Abhishek · **Release:** 2026-11-17
**Source:** INV-POS-3BUGS (Issue 3, 2026-11-18) + original CR-547 intake — CONFIRMED (code-traced)
**Design:** `design/POS_INVEST_GATE2_5_MOCKUPS_2026_11_18.html` + `public/gate25_cr547.html` (approved)

---

## Code Reality: CONFIRMED
- KOT footer button `ScanOrderPopOut.jsx:738-751` → `onClick={() => onPrintKOT(activeOrder)}` — passes the **whole order**, no item selection.
- `DashboardPage.jsx:1737-1747` `handleScanPrintKOT(order)`:
  - `items = order?.items || []`
  - `stations = getStationsFromOrderItems(items, getProductById)` — derives ALL stations from ALL items
  - `printOrder(order.orderId || order.id, 'kot', stationKot, order, 0, {}, printerAgents)` — prints all stations/items.
- Per-item **cancel** already exists (`ScanOrderPopOut.jsx:486-496` collapsed, `L596-606` expanded) — proves per-item row affordances fit, but there is **no per-item KOT selection state**.

## Conflict Pre-Check
- **ScanOrderPopOut.jsx** — same file as **BUG-702** (variation render) + CR-552 (two-section) + CR-545 (cancel/KOT). **Batch CR-547 + BUG-702 edits together** (one branch) to avoid same-file churn. Parallel-safe with CR-552 structure (we add selection state + checkboxes, not restructure).
- **DashboardPage.jsx** — `handleScanPrintKOT` (CR-545) is the function we extend; also touched by CR-552 (GATE_5A). Additive change to the handler signature/body. Watch same-file batching.

## ⚠ Open verification — print-payload subset (BLOCKS Gate 3 sign-off)
`printOrder(orderId, 'kot', stationKot, order, ...)` builds the KOT payload downstream (orderService → `orderTransform` KOT builder). **Must confirm the KOT payload is derived from `order.items` (so passing a filtered-order clone limits the print to selected items) OR whether the backend KOT endpoint prints by station regardless of the passed item set.** If the latter, selective-by-item needs a backend change (new brief). Trace `buildKotPrintPayload`/`printOrder` before coding. This is the primary reason risk = HIGH.

## Data Flow Trace
```
Staff tick items in popup → (no state today)
  ↓
KOT button → onPrintKOT(activeOrder)  (ScanOrderPopOut:742)
  ↓
handleScanPrintKOT(order)  (DashboardPage:1737)
  ↓ ← GAP: items = ALL order.items; stations = ALL; payload = whole order
printOrder(orderId,'kot', allStations, order, ...)
  ↓
UI/printer: every station/item printed, not the selected subset
```

## Risk Classification: HIGH
- **Print payload** change (kitchen tickets). Wrong routing → kitchen makes wrong/extra items. Same-file as BUG-702/CR-552/CR-545. Planning-skip NOT eligible; needs the print-payload verification above + print-path test.

## Gate 3 Blocker — ✅ RESOLVED (2026-11-19)

**Curl probe executed** against live Order #1578881 (thegoankitchen, `owner@thegoankitchen.com`):

| Probe | billFoodList sent | bill_food_list stored | station_kot | Conclusion |
|-------|-------------------|----------------------|-------------|------------|
| A | ALL 14 items | 14 items (temp id 222755) | "" | Backend stores what FE sends |
| B | Only 2 items | 2 items (temp id 222755, overwritten) | "" | ✅ Partial billFoodList = partial KOT |
| C | 2 items | 2 items | "BAR" | Station header works independently |

**Verdict**: Backend `order-temp-store` is a **pass-through**. `billFoodList` drives the KOT.
**CR-547 is 100% frontend-only. No backend change required.**

## Affected Files + Lines (Gate 3 Plan — COMPLETE)

Full plan: `plans/CR-547_IMPLEMENTATION_PLAN.md` (9 edits, 2 files, ~50 net lines).

| File | Edit | Change |
|---|---|---|
| `ScanOrderPopOut.jsx` | E-1 | `selectedItemIds` state (Set of item row IDs) |
| `ScanOrderPopOut.jsx` | E-2 | Reset effect — defaults: edit mode → new items only; normal → all non-cancelled |
| `ScanOrderPopOut.jsx` | E-3 | `toggleKotItem` callback |
| `ScanOrderPopOut.jsx` | E-4 | Select-all row in edit mode (above newItems list) |
| `ScanOrderPopOut.jsx` | E-5 | Per-item checkbox in edit mode newItems |
| `ScanOrderPopOut.jsx` | E-6 | Select-all row in normal mode (above items list) |
| `ScanOrderPopOut.jsx` | E-7 | Per-item checkbox in normal mode (wraps existing content in flex div) |
| `ScanOrderPopOut.jsx` | E-8 | KOT button — count badge `KOT (3)`, disabled when 0, passes filtered items |
| `DashboardPage.jsx` | E-9 | `handleScanPrintKOT(order, selectedItems=null)` — filters rawOrderDetails |

**ID Mapping**: `item.id` ↔ `rawOrderDetails[].id` (order_details row ID, unique per line).

## Owner Decisions — RESOLVED
- **CR-547 pattern → APPROVED**: checkboxes per item → **one KOT** that prints **only selected items to just their stations**; unticked items' stations print nothing; KOT disabled when none ticked.
- **Backend blocker → RESOLVED**: `order-temp-store` is pass-through (curl-verified). FE-only fix.

## Test Plan (incl. print-path)
- 3 items across 3 stations, tick 2 → KOT prints only those 2 to their 2 stations; 3rd station gets nothing.
- Select-all → same as today (all stations).
- None selected → KOT disabled.
- Print-path integration test (printerAgents) confirms payload item set == selection.

## Rollback
Revert selection state + checkbox markup in ScanOrderPopOut and the `handleScanPrintKOT` subset branch; button falls back to whole-order KOT. No data change.
