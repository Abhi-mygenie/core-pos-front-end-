# BUG-245 — Table Card Moves to Top When Order Placed (Occupied-First Bucketing)

**ID:** BUG-245
**Type:** BUG
**Created:** 2026-07-25
**Severity:** P1 (core UX — cashier loses table position on order placement)
**Risk:** LOW
**Module:** Dashboard — Channel/Table view (`ChannelColumn.jsx`)
**Duplicate Check:** DISTINCT. Previous investigation (status_vs_channel_view_movement) fixed status-priority sort but intentionally kept occupied-first bucketing. This bug targets the bucketing itself.
**Code Reality:** Bug confirmed at `ChannelColumn.jsx:159-167` — `[...occupied, ...available]` bucketing.
**Source:** OWNER-REPORTED (session 2026-07-25, screenshots provided)
**Confidence:** CONFIRMED (screenshot evidence: Table 105 jumps from row 2 to position 1 after order placed)

---

## Description

When a table gets an order (status changes from "Available" to "Preparing"), it jumps to the TOP of the grid. Tables should stay in their original label-numeric position regardless of order status.

### Evidence

**Screenshot 1 (Before):** Tables in order: C1, C2, C3, 101, 102, 103, 104, **105**, 106...
**Screenshot 2 (After order on 105):** **105** jumps to position 1: **105**, C1, C2, C3, 101, 102...

### Root Cause

`ChannelColumn.jsx:159-167` — in `channel` groupingMode, items are split into `occupied[]` and `available[]` buckets, then concatenated as `[...occupied, ...available]`. This puts ALL tables with orders before ALL empty tables.

```js
// L159-167: THE BUG
const occupied = [];
const available = [];
bucket.items.forEach(it => {
  if (isAvailable(it)) available.push(it);
  else occupied.push(it);
});
occupied.sort(compare);
available.sort(compare);
bucket.items = [...occupied, ...available]; // occupied FIRST → table moves to top
```

---

## Blast Radius

- 1 file: `ChannelColumn.jsx` (~3 lines change)
- Scope: SMALL
- Hotspot: NO (not in R5 list)
- Financial: NO

---

## Next
Planning Gate 2 → Gate 3 → Implementation
