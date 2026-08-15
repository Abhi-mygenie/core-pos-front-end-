# BUG-245 — Impact Analysis + Implementation Plan (Gate 2 + Gate 3)

**ID:** BUG-245
**Title:** Table card moves to top when order placed
**Date:** 2026-07-25
**Risk:** LOW
**Code Reality:** Bug confirmed at `ChannelColumn.jsx:159-167`
**Conflict Pre-Check:** `ChannelColumn.jsx` not in FILE_OWNERSHIP recent modifiers. No other item touching this file in current sprint. SAFE.

---

## Impact Analysis (Gate 2)

### Data Flow
```
Table 105 gets order → status: "available" → "preparing"
  → ChannelColumn sortedGroups memo recalculates
  → L159-167: items split into occupied[] vs available[]
  → L167: [...occupied, ...available] → 105 jumps to top of occupied bucket
```

### Affected: `ChannelColumn.jsx:159-167` only
- Sort logic is isolated in a `useMemo` inside `sortedGroups`
- No downstream consumers of the sort order (render-only)
- `status` view path (L157-158) is UNTOUCHED — it uses `sortByActiveFirst` separately

### Risk Register
| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Order view (non-table) loses occupied-first | LOW | Fix is gated to `viewType === 'table'` only |
| Status view affected | NONE | Status path has separate `if (groupingMode === 'status')` branch |

---

## Implementation Plan (Gate 3)

### Scope Lock
- **File WILL change:** `components/dashboard/ChannelColumn.jsx` (L159-167)
- **Files WILL NOT touch:** DashboardPage.jsx, ChannelColumnsLayout.jsx, TableSection.jsx, TableCard.jsx, OrderCard.jsx

### Edit

**Current (L155-168):**
```js
    // Step 3: within each bucket, sort occupied then available
    for (const bucket of buckets.values()) {
      if (groupingMode === 'status') {
        bucket.items = sortByActiveFirst(bucket.items, TABLE_STATUS_PRIORITY);
      } else {
        const occupied = [];
        const available = [];
        bucket.items.forEach(it => {
          if (isAvailable(it)) available.push(it);
          else occupied.push(it);
        });
        occupied.sort(compare);
        available.sort(compare);
        bucket.items = [...occupied, ...available];
      }
    }
```

**New:**
```js
    // Step 3: within each bucket, sort by groupingMode
    for (const bucket of buckets.values()) {
      if (groupingMode === 'status') {
        bucket.items = sortByActiveFirst(bucket.items, TABLE_STATUS_PRIORITY);
      } else {
        // BUG-245: channel mode — sort ALL items by stable comparator (label-numeric / FIFO).
        // No occupied-first bucketing — tables stay in their label position regardless of order status.
        bucket.items.sort(compare);
      }
    }
```

**Change:** Replace 8 lines (occupied/available split + concatenation) with 3 lines (single `.sort(compare)`).

### Verification Matrix

| # | Check | How to Verify |
|---|-------|--------------|
| V1 | Table 105 stays at position after order placed | Browser: place order on table 105 → verify it stays between 104 and 106 |
| V2 | Order view (non-table) still sorts by FIFO | Browser: switch to order view → verify order cards sorted by createdAt |
| V3 | Status view unaffected | Browser: switch to status view → verify status-priority sort still works |
| V4 | Webpack compiles | Logs check |

### Post-Code Registry Checklist
- [ ] registry.json: BUG-245 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add ChannelColumn.jsx with BUG-245
- [ ] Code markers: `// BUG-245` comment
