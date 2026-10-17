# BUG-587 — Channel view search filter uses matchingTableIds only — rooms never highlight

**ID:** BUG-587
**Type:** BUG
**Registered:** 2026-10-17
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE
**Priority:** P1
**Risk:** LOW
**Area:** Dashboard — Search / Channel View

---

## Description

Searching for a room number (e.g. "110") correctly shows the room in the dropdown under **ROOM - EXACT MATCH**. But the room grid / channel column immediately shows **"No orders"** — the room is never highlighted or isolated in the view.

---

## Root Cause

`DashboardPage.jsx L1832`:
```jsx
<ChannelColumnsLayout
  matchingIds={matchingTableIds}   // ← ONLY dine-in table IDs passed
  ...
/>
```

`ChannelColumn.jsx L72` filters each column's items by `matchingIds`:
```javascript
channel.items.filter(item => matchingIds.has(item.id))
```

`matchingTableIds` only contains dine-in table IDs. Rooms, delivery, and takeaway IDs are never in this set. So every room column filters to 0 items → "No orders".

`matchingGridIds` already exists — it is the union of ALL matching IDs (tables + rooms + delivery + takeaway):
```javascript
const matchingGridIds = useMemo(() => {
  const ids = new Set();
  [matchingTableIds, matchingRoomIds, matchingDeliveryIds, matchingTakeAwayIds]
    .forEach(set => { if (set) set.forEach(id => ids.add(id)); });
  return ids;
}, [...]);
```

**Fix:** Change `matchingIds={matchingTableIds}` → `matchingIds={matchingGridIds}` at L1832.

---

## Evidence

- **Source:** OWNER-REPORTED screenshot (2026-10-17) — Room 110 in EXACT MATCH, grid "No orders"
- **Confidence:** CONFIRMED — code traced to DashboardPage.jsx L1832
- **Steps:** Dashboard → Room tab → type "110" → dropdown shows Room 110 → grid shows "No orders"

---

## Blast Radius

- **File:** `src/pages/DashboardPage.jsx` — L1832 only (1 prop, 1 word change)
- **Scope:** SMALL
- **Hotspot:** DashboardPage.jsx is R5 — Fast Lane needs owner approval
- **Fast Lane eligible:** YES

---

## Duplicate Check

- DISTINCT — no prior bug on matchingIds prop
