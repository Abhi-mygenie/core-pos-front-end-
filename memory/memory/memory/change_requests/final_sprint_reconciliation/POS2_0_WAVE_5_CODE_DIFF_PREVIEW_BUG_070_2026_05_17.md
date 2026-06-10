# POS2.0 Wave 5 Code Diff Preview — BUG-070 — 2026-05-17

## 1. Purpose

Exact code-change preview for **BUG-070** — Area-wise segregation in Table View + Channel View. Per owner directives 2026-05-17:

- **Table View**: tables AND rooms segregate by `sectionName` whenever `hasAreas` (drop `isDineInOnly` narrow gate per Cx1)
- **Channel View**: Dine-In + Room columns segregate by `sectionName` within their column; TakeAway / Delivery stay flat (no `sectionName` on those orders)
- **Order View / List View / Status View**: untouched
- Section order = API insertion order (Q3)
- Items without `sectionName` render at top of view/column with NO header band (Q4)
- Empty sections hidden per column

**No source files modified yet.**

---

## 2. Touch map

| # | File | Insertions | Deletions |
|---|------|-----------:|----------:|
| 1 | `frontend/src/pages/DashboardPage.jsx` | ~50 | ~8 |
| 2 | `frontend/src/components/dashboard/ChannelColumn.jsx` | ~85 | ~70 |
| **Total** | | **~135** | **~78** |

`ChannelColumnsLayout.jsx` is **NOT touched** — grouping happens entirely inside `ChannelColumn`.

---

## 3. File 1 — `frontend/src/pages/DashboardPage.jsx`

### Change 3.1 — Propagate `sectionName` onto adapted dine-in / walk-in items

Inside the `tables` memo (L509-625), the existing `adaptTable` helper produces items without `sectionName`. Add the field so downstream consumers (Channel View) can group on it.

**Current (`adaptTable` at L514-548 + walk-in adapter at L570-590):** items spread from `tableOrders.map(...)` — no `sectionName` field anywhere.

**Proposed:** add `sectionName: t.sectionName || null` to the object returned by both branches of `adaptTable`, and `sectionName: 'Walk-In'` to walk-in items inside the `walk_in` section.

### Change 3.2 — Propagate `sectionName` onto adapted room items

**Current (`allRoomsList` memo at L635-675):**
```javascript
        return roomOrders.map((order, idx) => ({
          id: roomOrders.length > 1 ? `${t.tableId}-${order.orderId}` : String(t.tableId),
          label: roomOrders.length > 1 ? `${t.tableNumber} (${idx + 1}/${roomOrders.length})` : t.tableNumber,
          status: order.tableStatus,
          tableId: t.tableId,
          orderType: 'room',
          isRoom: true,
          // ROOM_CARD_TOTAL (Task 4) ...
          amount: computeRoomCardAmount(order),
          ...
        }));
```

**Proposed:** add `sectionName: t.sectionName || null` to BOTH the "no orders" branch (L642-649) and the "with orders" branch (L651-673).

### Change 3.3 — Drop `isDineInOnly &&` narrow gate at L1585 (Cx1=a)

**Current:**
```javascript
            {showGridView && (
              isDineInOnly && hasAreas ? (
                <div className="flex gap-8 overflow-x-auto">
                  {Object.entries(tables).map(([key, section], index) => (
                    ...
```

**Proposed:**
```javascript
            {showGridView && (
              // BUG-070 (Wave 5, May-2026): drop the `isDineInOnly &&` gate so
              // table sections render whenever `hasAreas`, regardless of which
              // channels are active (Cx1 owner directive 2026-05-17).
              hasAreas ? (
                <div className="flex gap-8 overflow-x-auto">
                  {Object.entries(tables).map(([key, section], index) => (
                    ...
```

### Change 3.4 — Add sectioned-rooms render path in Table View

Today rooms only render in the flat `filteredGridItems` branch. After BUG-070, rooms with `sectionName` need their own sectioned render below tables.

**Insert** a new conditional block immediately after the sectioned-tables block at ~L1611:

```javascript
              {/* BUG-070 (Wave 5, May-2026): sectioned rooms render block.
                  Renders below the sectioned tables block when:
                    1. `hasAreas` (so we're already in sectioned view mode)
                    2. At least one room in `allRoomsList` has a `sectionName`
                  Rooms without `sectionName` render at top of the rooms block
                  with no header band (Q4 owner directive).
                  Falls back to the existing flat `filteredGridItems` branch
                  when no room sections exist. */}
              {hasAreas && roomsBySection.length > 0 && (
                <div className="mt-6 flex gap-8 overflow-x-auto">
                  {roomsBySection.map((section, index) => (
                    <div key={section.key} className="contents">
                      {index > 0 && (
                        <div className="w-px self-stretch" style={{ backgroundColor: COLORS.borderGray }} />
                      )}
                      <TableSection
                        section={section}
                        onTableClick={handleTableClick}
                        onOpenModal={handleTableClick}
                        onUpdateStatus={handleUpdateTableStatus}
                        onBillClick={handleBillClick}
                        onConfirmOrder={handleConfirmOrder}
                        onCancelOrder={handleCancelOrder}
                        searchQuery={searchQuery}
                        matchingTableIds={matchingTableIds}
                        snoozedOrders={snoozedOrders}
                        onToggleSnooze={toggleSnooze}
                        currencySymbol={currencySymbol}
                        activeStatuses={activeStatuses}
                        tableFilter={tableFilter}
                      />
                    </div>
                  ))}
                </div>
              )}
```

### Change 3.5 — Add `roomsBySection` useMemo (parallel to `tables`)

**Insert** immediately after `allRoomsList` useMemo (L675):

```javascript
  // BUG-070 (Wave 5, May-2026): group rooms by `sectionName` for Table View
  // sectioned render. Mirrors the `tables` memo's grouped object shape so
  // <TableSection> can be reused without changes. Section order = API
  // insertion order (Q3 owner directive); rooms without `sectionName` go
  // into a `__no_section__` bucket rendered at the top with no header band
  // (Q4 owner directive).
  const roomsBySection = useMemo(() => {
    if (!allRoomsList.length) return [];
    const buckets = new Map();
    allRoomsList.forEach(room => {
      const key = room.sectionName || '__no_section__';
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          name: room.sectionName || null, // null → render no header
          prefix: 'R',
          tables: [],
        });
      }
      buckets.get(key).tables.push(room);
    });
    // Hoist `__no_section__` to top (Q4)
    const arr = Array.from(buckets.values());
    const noSecIdx = arr.findIndex(s => s.key === '__no_section__');
    if (noSecIdx > 0) {
      const [ns] = arr.splice(noSecIdx, 1);
      arr.unshift(ns);
    }
    return arr;
  }, [allRoomsList]);
```

**Note**: `<TableSection>` currently renders `section.name` as a header. For the `__no_section__` bucket where `name` is `null`, TableSection MUST gracefully render no header. This will be verified during Gate 8; if TableSection always renders a header, a tiny conditional inside it (`section.name && <header>`) is needed — flagged as a sub-change to confirm before applying.

### Change 3.6 — Channel View: ensure dineIn + room channel items carry `sectionName`

The dineIn channel feeds from `allTablesList` (L799). `allTablesList` already preserves the items from `tables`/`flatTables` — once Change 3.1 adds `sectionName` to the source, it flows through automatically. **No additional code change needed** here.

The room channel feeds from `allRoomsList` (L820). Once Change 3.2 adds `sectionName` to room items, it flows through. **No additional code change needed** here.

The takeAway and delivery channels feed from `takeAwayOrders` / `deliveryOrders` (L807, L813) — these have no `sectionName` and stay flat by data nature. **No code change**.

---

## 4. File 2 — `frontend/src/components/dashboard/ChannelColumn.jsx`

### Change 4.1 — Refactor `sortedItems` into `sortedGroups`

Replace the `sortedItems` useMemo at L94-139 with a new `sortedGroups` useMemo that buckets items by `sectionName` first, then sorts within each bucket using the existing comparator.

**Current (L94-139):**
```javascript
  const sortedItems = useMemo(() => {
    if (groupingMode === 'status') {
      return sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY);
    }
    // ... isAvailable, labelNumeric, labelString, tableCompare, orderCompare helpers ...
    const compare = viewType === 'table' ? tableCompare : orderCompare;
    const occupied = [];
    const available = [];
    filteredItems.forEach((it) => {
      if (isAvailable(it)) available.push(it);
      else occupied.push(it);
    });
    occupied.sort(compare);
    available.sort(compare);
    return [...occupied, ...available];
  }, [filteredItems, groupingMode, viewType]);
```

**Proposed (replaces L94-139):**
```javascript
  // BUG-070 (Wave 5, May-2026): group items by `sectionName` and emit an
  // array of { key, name, items } groups. Section order = API insertion
  // order (Q3 owner directive). Items without `sectionName` go into a
  // `__no_section__` bucket rendered at the top with no header (Q4).
  //
  // Sort behavior within each section is identical to the legacy
  // `sortedItems` logic — occupied first then available, with the
  // status-priority or channel-stable comparator based on `groupingMode`.
  const sortedGroups = useMemo(() => {
    if (filteredItems.length === 0) return [];

    // Step 1: bucket by `sectionName` preserving API insertion order
    const buckets = new Map();
    filteredItems.forEach(it => {
      const key = it.sectionName ?? '__no_section__';
      if (!buckets.has(key)) {
        buckets.set(key, { key, name: it.sectionName ?? null, items: [] });
      }
      buckets.get(key).items.push(it);
    });

    // Step 2: prep comparators (same as legacy sortedItems)
    const isAvailable = (it) => it?.status === 'available' || it?.status === 'disabled';
    const labelNumeric = (it) => {
      const str = String(it?.label ?? it?.tableNumber ?? it?.id ?? '');
      const num = parseInt(str.replace(/\D/g, ''), 10);
      return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
    };
    const labelString = (it) => String(it?.label ?? it?.tableNumber ?? it?.id ?? '');
    const tableCompare = (a, b) => {
      const an = labelNumeric(a);
      const bn = labelNumeric(b);
      if (an !== bn) return an - bn;
      return labelString(a).localeCompare(labelString(b));
    };
    const orderCompare = (a, b) => {
      const at = a?.createdAt ?? a?.order?.createdAt ?? '';
      const bt = b?.createdAt ?? b?.order?.createdAt ?? '';
      if (at && bt && at !== bt) return at < bt ? -1 : 1;
      if (at && !bt) return -1;
      if (!at && bt) return 1;
      const an = Number(a?.orderNumber);
      const bn = Number(b?.orderNumber);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return tableCompare(a, b);
    };
    const compare = viewType === 'table' ? tableCompare : orderCompare;

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

    // Step 4: hoist `__no_section__` to top (Q4)
    const arr = Array.from(buckets.values());
    const noSecIdx = arr.findIndex(b => b.key === '__no_section__');
    if (noSecIdx > 0) {
      const [ns] = arr.splice(noSecIdx, 1);
      arr.unshift(ns);
    }
    return arr;
  }, [filteredItems, groupingMode, viewType]);
```

### Change 4.2 — Render section headers + group cards

Replace the existing flat-grid render (L209-282) with a grouped render. Each non-`__no_section__` bucket gets a plain text header band above its cards. `__no_section__` bucket renders without any header (Q4).

**Current (L208-283):**
```javascript
      <div className="flex-1 overflow-y-auto p-2">
        {sortedItems.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: COLORS.grayText }}>
            No orders
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: ... }}>
            {sortedItems.map((item) => {
              const key = item.id || `${channel.id}-${item.orderId}`;
              if (viewType === 'order' && !item.orderId) return null;
              if (viewType === 'table') {
                return <TableCard ... />;
              }
              const order = item.order || item;
              return <OrderCard ... />;
            })}
          </div>
        )}
      </div>
```

**Proposed:**
```javascript
      <div className="flex-1 overflow-y-auto p-2">
        {sortedGroups.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: COLORS.grayText }}>
            No orders
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedGroups.map(group => (
              <div key={group.key}>
                {/* BUG-070 (Wave 5): plain section header band. Hidden when
                    `group.name` is null (i.e., `__no_section__` bucket — Q4
                    owner directive: un-sectioned items render at top with
                    no header). Empty sections are auto-hidden because they
                    never appear in `sortedGroups` (a section only exists
                    when ≥1 item carries its `sectionName`). */}
                {group.name && (
                  <div
                    data-testid={`channel-column-section-header-${channel.id}-${group.key}`}
                    className="px-1 pt-2 pb-1 text-xs uppercase tracking-wide font-medium"
                    style={{ color: COLORS.grayText }}
                  >
                    {group.name}
                  </div>
                )}
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: viewType === 'table'
                      ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)`
                      : `repeat(${actualColumns}, 1fr)`,
                  }}
                >
                  {group.items.map(item => {
                    const key = item.id || `${channel.id}-${item.orderId}`;
                    // BUG-279: Available / reserved rows (no orderId) are Table-View-only.
                    if (viewType === 'order' && !item.orderId) return null;

                    if (viewType === 'table') {
                      return (
                        <TableCard
                          key={key}
                          table={item}
                          onClick={onItemClick}
                          onOpenModal={onItemClick}
                          onUpdateStatus={onUpdateStatus}
                          onBillClick={onBillClick}
                          onConfirmOrder={onConfirmOrder}
                          onCancelOrder={onCancelOrder}
                          onMarkReady={onMarkReady}
                          onMarkServed={onMarkServed}
                          isSnoozed={snoozedOrders?.has(item.id)}
                          onToggleSnooze={onToggleSnooze}
                          currencySymbol={currencySymbol}
                          isEngaged={isOrderEngaged?.(item.orderId) || isTableEngaged?.(item.tableId)}
                        />
                      );
                    }

                    const order = item.order || item;
                    return (
                      <OrderCard
                        key={key}
                        order={order}
                        orderType={item.orderType || channel.id}
                        tableLabel={item.label || item.tableNumber}
                        isSnoozed={snoozedOrders?.has(item.id)}
                        isEngaged={isOrderEngaged?.(order.orderId) || isTableEngaged?.(item.tableId)}
                        canCancelOrder={hasPermission?.('order_cancel')}
                        canMergeOrder={channel.id === 'dineIn' && hasPermission?.('merge_table')}
                        canShiftTable={channel.id === 'dineIn' && hasPermission?.('transfer_table')}
                        canFoodTransfer={channel.id === 'dineIn' && hasPermission?.('food_transfer')}
                        canPrintBill={hasPermission?.('print_icon')}
                        canBill={hasPermission?.('bill')}
                        onToggleSnooze={onToggleSnooze}
                        onEdit={() => onItemClick?.(item)}
                        onMarkReady={() => onMarkReady?.(item)}
                        onMarkServed={() => onMarkServed?.(item)}
                        onBillClick={() => onBillClick?.(item)}
                        onAccept={(order) => onConfirmOrder?.(item)}
                        onCancelOrder={onCancelOrder}
                        onItemStatusChange={onItemStatusChange}
                        onFoodTransfer={onFoodTransfer ? (order, foodItem) => onFoodTransfer(order, foodItem, item) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
```

---

## 5. Files NOT touched

- `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` — grouping logic lives inside `ChannelColumn`, so the layout component needs no changes
- `frontend/src/components/dashboard/TableSection.jsx` — reused as-is for sectioned Table-View rooms render; if it does not gracefully handle `section.name === null`, a tiny conditional patch (`{section.name && <header>}`) will be flagged at Gate 8
- `frontend/src/api/transforms/tableTransform.js` — `sectionName: api.title || null` is already emitted on every table/room (verified)
- `frontend/src/contexts/TableContext.jsx` — no shape changes needed
- All Order View, List View, Status View render paths — unchanged

---

## 6. Section order semantics (Q3)

Per owner directive Q3 "as they come in API":
- **Channel View**: section order inside a column reflects the order in which sections first appear in the column's `items` array. The `items` array comes from `allTablesList` (which inherits order from `apiTables`) or `allRoomsList` (same). So section order in each column = API insertion order.
- **Table View**: section order inside the `tables` object (which already drives the sectioned render) reflects API insertion order — the `tables` memo at L552-592 inserts sections via `forEach`, which preserves insertion. Same applies to the new `roomsBySection` memo.

No alphabetical sort, no manual reorder.

---

## 7. Empty sections (Q4)

Per owner directive Q4 "show as today without segregation":
- A section only appears in `sortedGroups` (Channel View) or `roomsBySection` (Table View) if at least one item carries its `sectionName`. So empty sections are auto-hidden.
- Items WITHOUT `sectionName` go to a `__no_section__` bucket which renders at the **top** of its view/column WITHOUT a header band.

---

## 8. Render gates summary

| View | Gate today | Gate after BUG-070 |
|------|-----------|---------------------|
| Table View — tables sectioned render | `isDineInOnly && hasAreas` | **`hasAreas`** (Cx1) |
| Table View — rooms sectioned render | N/A (always flat) | **`hasAreas && roomsBySection.length > 0`** |
| Table View — flat fallback | shown when sectioned gate false | shown when `!hasAreas` (unchanged otherwise) |
| Channel View — Dine-In column | flat | sectioned via `sortedGroups` |
| Channel View — Room column | flat | sectioned via `sortedGroups` |
| Channel View — TakeAway / Delivery | flat | flat (no `sectionName` on those orders — unchanged) |
| List View / Order View / Status View | flat | flat (unchanged) |

---

## 9. Tests impact

| Test | Will it break? | Why |
|------|---------------|-----|
| All 498 currently passing tests | **No** | No render snapshot tests on `ChannelColumn` items / DashboardPage grid layouts. Sort behavior within a section is byte-identical to legacy. |

Expected post-apply: **498/498 passed** (unchanged count).

Recommended **P2 follow-up** (not in this diff): one render-level test asserting (a) section header visible when `sectionName` present, (b) no header when items lack `sectionName`, (c) section order = API insertion order.

---

## 10. Validation plan

1. ESLint clean on both files
2. `yarn test --watchAll=false` → 498/498
3. Webpack hot-reload green
4. **Owner smoke** (10 scenarios):
   1. Table View default (all channels active) → tables sectioned by area
   2. Table View — rooms section visible whenever room `sectionName` exists in API
   3. Table View — un-sectioned rooms render at top with no header (Q4 parity)
   4. Channel View — Dine-In column sectioned by area (matching screenshot expectation: "Main / Walk-In" headers)
   5. Channel View — Room column sectioned by area ("First Floor / Second Floor / Top Floor")
   6. Channel View — TakeAway / Delivery columns remain flat (unchanged)
   7. Channel View — section order matches API insertion order, not alphabetical
   8. Channel View — empty sections hidden per column (e.g., "Patio" header doesn't appear in Dine-In column if no Patio tables exist)
   9. List View / Order View / Status View — flat (unchanged)
   10. Search / filter / status chip click → cards re-render with sections intact

---

## 11. Risks / open items

| Risk | Mitigation |
|------|-----------|
| `<TableSection>` may render a header even when `section.name === null`. | I'll inspect TableSection at Gate 8; if it always shows a header, a tiny `{section.name && <header>}` patch is needed. Will surface this as a sub-change before applying. |
| Removing the `isDineInOnly` gate may surprise operators who'd only seen sectioned view in dine-in-only filter mode. | Owner already approved Cx1=a. Document in closure report. |
| If `apiTables` does not actually carry `sectionName` on rooms (`api.title` is null for rooms in some restaurants), rooms fall back to `__no_section__` bucket and render flat — same as today. | Safe default. No regression. |
| Channel View `dineIn` column already includes walk-in items spread via `allTablesList`; walk-ins carry `sectionName: 'Walk-In'` (Change 3.1) so they end up in their own "Walk-In" sub-section. | Matches existing Table View behavior. |

---

## 12. Approval required

- **A.** Approve this exact diff → apply all 2 file edits (Gate 8), `yarn test`, smoke, file Implementation Report. **Closes Wave 5 pending owner smoke.**
- **B.** Modify (tell me what — e.g., flip section order to alphabetical, distinct visual style for rooms vs tables, defer Table-View rooms render to a later wave)
- **C.** Stop

Reply **A / B / C**.

---

*— End of Wave 5 Code Diff Preview — BUG-070 —*
