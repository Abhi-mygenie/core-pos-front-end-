**BUG-333 + CR-434 — PARKED (owner decision 2026-10-18)**
## Add Button Defaults to Walk-In + Delivery/Takeaway Quick-Launch Tiles

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Planned together:** Both touch DashboardPage.jsx (R5), functionally coupled
**Code Reality:** BUG-333 confirmed at L1514-1517 · CR-434 scope confirmed in DashboardPage
**Conflict Pre-Check:**
- CR-411 IMPL (2026-10-12): touched `handleTableClick` L1487-1492 + `handleOrderTypeChange` L1513-1518
- BUG-527 F1 (2026-10-10): touched L53-56 (`computeRoomCardAmount`)
- BUG-453 IMPL (2026-09-24): touched L24 + L1281 (`toggleSnooze`)
- Our changes: `handleAddOrder` L1514-1517 + new Delivery/Takeaway tile section. **CR-411 edited L1513-1518** — `handleOrderTypeChange` which is immediately before `handleAddOrder`. Close proximity but different functions. **Must verify anchors carefully before coding.**

---

## BUG-333 — `handleAddOrder` hardcoded to Walk-In

### Current code (L1514-1517):
```js
const handleAddOrder = () => {
  setOrderEntryTable(null);
  setOrderEntryType("walkIn");   // ← hardcoded
};
```

### Fix options:

**(a) Type-picker modal** — clicking `+ Add` shows a small picker: Dine-In / Walk-In / Takeaway / Delivery. Staff picks, then Order Entry opens.
- Best UX, most flexible
- ~20 lines (modal state + JSX + handler update)

**(b) Default to Dine-In** — change `"walkIn"` to `"dineIn"`. Simpler.
- Only correct if restaurant primarily uses Dine-In
- 1 line change

**Owner must decide: (a) type-picker or (b) default to Dine-In**

---

## CR-434 — Delivery + Takeaway Quick-Launch Tiles

### Current behaviour:
Delivery and Takeaway sections on the dashboard only show order cards AFTER an order exists. There's no "start a new Delivery/Takeaway" entry point visible from those sections.

`handleOrderTypeChange('delivery')` and `handleOrderTypeChange('takeAway')` already exist (L1519+).

### Fix:
Add a persistent "New Delivery" and "New Takeaway" quick-action tile/button in their respective sections, calling `handleOrderTypeChange('delivery')` or `handleOrderTypeChange('takeAway')` + `setOrderEntryTable(null)`.

**Owner must decide:** Button in section header OR a tile styled like an empty table card?

---

## Why BUG-333 and CR-434 must be planned together

- Both are in `DashboardPage.jsx` (R5)
- If BUG-333 is resolved with option (a) (type-picker), CR-434 tiles become the SAME UX — clicking + Add shows picker including Delivery/Takeaway. The two features merge.
- If BUG-333 is option (b) (default Dine-In), CR-434 tiles are still needed as the separate entry point for Delivery/Takeaway.
- Planning separately risks duplicate scope or conflicting edits to the same file.

---

## Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO — order type selection only |
| R5 hotspot? | YES — `DashboardPage.jsx` |
| Lines changed | ~10-30 depending on option |
| Risk | MEDIUM (R5, new UI flow, multiple order type paths) |

**Risk: MEDIUM** — R5 file, but additive changes only (no existing logic removed).

---

## Owner Decisions Needed (GATE-BLOCKING)

| # | Decision | Options |
|---|---|---|
| OD-333-01 | `+ Add` button behaviour | **(a) Show type-picker** (recommended) / (b) Default to Dine-In |
| OD-434-01 | Quick-launch tile design | (a) Button in Delivery/Takeaway section header / (b) Tile like empty table card |

**Note:** If OD-333-01 = (a), then OD-434-01 may be redundant (type-picker handles all). Owner to confirm.

---

Planning complete: BUG-333 + CR-434 (joint) | Gate 2 | Risk: MEDIUM
Owner decisions: OD-333-01 + OD-434-01 (gate-blocking)
Must plan and implement together — same R5 file
