# BUG-620 — Intake: List View Shows Stale Order Ordering After Socket Update

**Date:** 2026-10-26  
**Reported by:** Owner  
**Source:** OWNER-REPORTED  
**Duplicate check:** DISTINCT — no prior registration. Not related to any open item.  
**Code Reality:** FULL — `allTablesList` in list view renders without `sortByActiveFirst` (DashboardPage L1966); card view applies sort (L1916).

---

## Description

On the dashboard, switching between **card view** and **list view** after a socket update shows stale ordering in list view. The list view shows orders in the original API-call insertion order, ignoring status changes that arrived via socket. The card view always shows the correct, up-to-date ordering. After a full API refresh, the list view corrects itself.

**Reproduction:**
1. Open dashboard — several dine-in tables visible (card view)
2. An order's status changes via socket (e.g., "placed" → "billReady")
3. Card view: order moves to top ✅
4. Switch to list view: same order stays at its original position ← WRONG
5. After manual page refresh or API poll: list view shows correct ordering ✅

**User description:** "food order dependent on api menu api — socket receiving — it stays on order — but when shifts card view — list view returns — list view gets in old ordering — after api call (refresh) it gets fixed"

---

## Severity & Risk

- **Severity:** P2 — MEDIUM (UX; workaround = wait for API refresh; no data loss)
- **Risk:** LOW — non-hotspot, additive sort call
- **Fast Lane eligible:** YES (1 file, additive wrapper, no logic change) — owner must approve
- **SLA:** Next sprint unless quick-win

---

## Root Cause (from investigation INV-3ISSUES-2026-10-26.md)

**Card view (DashboardPage L1916)** applies `sortByActiveFirst` on every render:
```js
{sortByActiveFirst(
  filteredGridItems.filter(...),
  TABLE_STATUS_PRIORITY   // ← re-sorts by status on every render
).map((item) => <TableCard ... />)}
```

**List view (DashboardPage L1966)** renders `allTablesList` in raw insertion order — **no sort**:
```js
{allTablesList
  .filter(t => !["available", "reserved"].includes(t.status))
  .filter(t => matchingTableIds === null || matchingTableIds.has(t.id))
  .map((table) => { ... })}   // ← NO sortByActiveFirst → API insertion order
```

`allTablesList` useMemo (L679) depends on `tables` useMemo (L545), which calls `getOrdersByTableId` from OrderContext. When socket `updateOrder` fires:
- `orders` array changes → `getOrdersByTableId` returns new results → `tables` useMemo recalculates → `allTablesList` updates **status values** of entries
- BUT the **POSITION** of entries is fixed by `apiTables` iteration order (initial API call)
- Card view re-sorts on each render → position reflects updated status
- List view maintains original position → status change is invisible in ordering

---

## Evidence

- `DashboardPage.jsx` L1916: `sortByActiveFirst(filteredGridItems, TABLE_STATUS_PRIORITY)` — applied in card view
- `DashboardPage.jsx` L1966: `allTablesList.filter(...).map(...)` — NO sort in list view
- `DashboardPage.jsx` L545-591: `tables` useMemo uses `getOrdersByTableId` — status IS updated on socket
- `DashboardPage.jsx` L679-681: `allTablesList` useMemo deps = `[tables, flatTables, hasAreas]`
- `utils/statusHelpers.js` L148-164: `sortByActiveFirst` sorts by `TABLE_STATUS_PRIORITY` + secondary by number

---

## Blast Radius

- **Primary file:** `src/pages/DashboardPage.jsx` (non-hotspot)
- **Other render blocks in list view:** delivery orders (L2010+), takeAway orders — same fix needed for consistency
- **Scope:** SMALL (1 file, 3 filter+map blocks)
- **Hotspot files touched:** NO

---

## Proposed Fix (Gate 3 — pending Gate 4 GO)

Wrap the list view dine-in render with `sortByActiveFirst`:

```js
// DashboardPage L1966 — wrap with sort:
{activeChannels.includes("dineIn") && sortByActiveFirst(
  allTablesList
    .filter(t => !["available", "reserved"].includes(t.status))
    .filter(t => matchingTableIds === null || matchingTableIds.has(t.id)),
  TABLE_STATUS_PRIORITY
).map((table) => { ... })}
```

Apply same pattern to delivery and takeAway sections in the list view for full consistency.

---

## Open Questions

- **OD-620-01:** Should list view maintain a stable secondary sort (e.g., by table number) or purely by status priority? (Recommendation: same as card view — status first, table number second — already handled by `sortByActiveFirst` secondary sort)

## Gate Status

- Gate 0 (Intake): **COMPLETE** (this document)
- Gate 2 (Impact Analysis): Not started
- Gate 4 GO: Pending (Fast Lane eligible — owner approve)
