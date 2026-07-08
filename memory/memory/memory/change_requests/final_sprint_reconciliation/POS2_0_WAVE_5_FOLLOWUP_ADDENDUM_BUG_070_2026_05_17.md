# POS2.0 Wave 5 — BUG-070 Follow-up Addendum — 2026-05-17

## 1. Status
**APPLIED** — two follow-up fixes to `ChannelColumn.jsx` per owner directive 2026-05-17.

---

## 2. Fixes applied

### Fix 1 — Status-View scope regression
**Gap**: Original BUG-070 diff bucketed by `sectionName` for ALL `groupingMode` values, including `'status'`. Status View was unintentionally segregating by area, violating Wave 5 scope ("Status View stays flat" — confirmed by owner).

**Patch**: Early-return in `sortedGroups` for `groupingMode === 'status'` — emits one no-header bucket sorted by status priority, byte-identical to legacy Status-View behavior.

```js
if (groupingMode === 'status') {
  return [{
    key: '__no_section__',
    name: null,
    items: sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY),
  }];
}
```

**Net delta**: +8 lines.

### Fix 2 — P4 section header chip style (visibility upgrade)
**Gap**: Owner felt the previous header (text-sm uppercase + bottom border) was not prominent enough. Owner selected P4 — gray pill chip matching the existing T1/T3/101 chips at card tops (consistent visual language).

**Patch**: Replace header `<div>` with a pill chip:

```jsx
<div className="mb-2">
  <span
    data-testid={`channel-column-section-header-${channel.id}-${group.key}`}
    className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider"
    style={{
      backgroundColor: COLORS.lightBg || '#F5F5F5',
      color: COLORS.darkText,
      border: `1px solid ${COLORS.borderGray}`,
    }}
  >
    {group.name}
  </span>
</div>
```

**Net delta**: +5 / -3 lines.

---

## 3. File modified

| File | Insertions | Deletions |
|------|-----------:|----------:|
| `frontend/src/components/dashboard/ChannelColumn.jsx` | +13 | -3 |

---

## 4. Validation

| Gate | Result |
|------|--------|
| ESLint | ✅ No issues found |
| `yarn test --watchAll=false` | ✅ **498/498 passed**, 34 suites, 5.734 s |
| Webpack hot-reload | ✅ green |

---

## 5. Owner smoke (now ready)

| Surface | Expected |
|---------|----------|
| Channel View — Dine-In column | Bold gray pill chip headers like `[ A1 ]`, `[ MAIN ]`, `[ WALK-IN ]` — chip-style matching T1/T3 card chips |
| Channel View — Room column | Pill chips like `[ FIRST FLOOR ]`, `[ SECOND FLOOR ]` between room cards |
| Status View ("Served / Preparing / Ready / etc." tabs) | Flat list — NO area dividers (was incorrectly segregating before this fix) |
| Order View | Flat (unchanged) |
| List View | Flat (unchanged) |
| Table View | Section headers unchanged (uses `TableSection.jsx`, separate component) |

---

## 6. Note on Table View consistency
`TableSection.jsx` headers in Table View are currently styled as `text-sm font-medium` plain text (the pre-existing style). They're visually less prominent than the new Channel-View pill chips. Owner can request a sync to P4 pill style if cross-view consistency is desired — flagged as P2 follow-up.

---

*— End of Wave 5 BUG-070 Follow-up Addendum —*
