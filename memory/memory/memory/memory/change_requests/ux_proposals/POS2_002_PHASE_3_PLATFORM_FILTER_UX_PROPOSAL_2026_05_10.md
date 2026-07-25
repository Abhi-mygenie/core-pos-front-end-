# POS2-002 Phase 3 — Platform Dropdown UX Placement Proposal (REVISED)

> **Sprint:** pos2.0
> **CR ID:** POS2-002 (Phase 3 of 4)
> **Date:** 2026-05-10 (Revised same day per owner directive)
> **Type:** UX placement proposal only — NO code, NO implementation, NO `/app/memory/final/*` edits.
> **Predecessors:** Phase 1 (`orderFrom` / `isWebOrder` mapped) + Phase 2 (web delivery-charge lock) — both shipped 2026-05-09.
>
> **Revision note (2026-05-10):** Owner directive — **do not touch order cards or table cards in Phase 3.** All badge work has been removed from this proposal. Phase 3 scope is now header-dropdown-only. Card-level Web/Scan visual treatment is deferred to a later phase if/when owner re-opens it.

---

## 1. Attached screenshot references used

| File | Used for |
|---|---|
| `Screenshot 2026-05-10 at 5.20.59 PM.png` | Dashboard header — quick-filter chips (YTC / Preparing / Ready / Served), search bar, Add button. Used to place the Platform dropdown. |

Order-card and table-card screenshots are no longer relevant to Phase 3 (cards stay untouched).

---

## 2. Recommended dashboard header placement

**Slot:** Inline with the existing quick-filter chip row inside `Header.jsx`, **immediately after the last status chip ("Served")**, with a small vertical divider separator. Same horizontal line as the chips. No other control moves.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  [≡]  [YTC] [Preparing] [Ready] [Served]   │   [Platform: All ▾]      [🔍 Search…]   [+ Add]  │
│        └────── existing status chips ──────┘   └─── NEW (Phase 3) ───┘   └─── existing ───┘   │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                                  ▲
                                                  └─ inserted here, after the
                                                      "Served" chip and a 1px
                                                      vertical divider
```

### Why this slot

1. **Natural left-to-right grouping** — quick-status filters first, then the wider "scope" filter (Platform), then search, then create-action. Reads in increasing-action-cost order.
2. **No disturbance to existing controls** — search bar, Add button, status indicators, and all 4 status chips stay exactly where they are today.
3. **Already-empty horizontal space** between "Served" and the search bar.
4. **Visual divider (`│` 1px gray)** separates the orthogonal axes: "status" (YTC / Preparing / Ready / Served = order lifecycle) vs "platform" (POS / Web / Scan = origin axis). Without the divider, users may misread Platform as another status.
5. Future platforms (Kiosk / Aggregator / WhatsApp / QR Campaign) extend the dropdown vertically — the slot doesn't need to grow horizontally.

### Code anchor (for next agent)

In `frontend/src/components/layout/Header.jsx`, the four status pills are rendered inside the `<nav>` block at the `visibleStatusFilters.map(...)` loop (around L272–289 in current code). The new `<PlatformDropdown>` is inserted **immediately after the closing `</nav>`** with a thin `border-l` divider element preceding it, before the search container at L294 (`Center Section - Search`).

---

## 3. Dropdown label and options

### Trigger label (collapsed state)

| Selected value | Trigger reads |
|---|---|
| `null` (default — no narrowing) | **Platform: All** |
| `'pos'` | **Platform: POS** |
| `'web'` | **Platform: Web / Scan** |

When closed, the trigger always reads `Platform: <value>` so the operator can see at a glance what filter is active. Visual style: same shadcn `<Select>` shape as the POS2-006 PG dropdown (sprint consistency). Slightly darker background tint when value ≠ `null` to signal "filtering is active" — same pattern as the PG filter dropdown.

### Panel rows (open state)

```
┌───────────────────────────────┐
│ Platform: All                 │  ← default; equates to value === null
├───────────────────────────────┤
│ POS                           │  ← value: 'pos'
├───────────────────────────────┤
│ Web / Scan                    │  ← value: 'web'
└───────────────────────────────┘
```

### Default

`null` = **All Platforms** at every dashboard mount. Selection persists across tab navigation **within the dashboard session** (mirrors POS2-006 dropdown behaviour). Resets to `All` on full page reload — no localStorage in v1.

### Future extensibility

The 3-row panel above is the v1 set. When backend ships Kiosk / Aggregator / WhatsApp / QR Campaign as `order_from` values, the dropdown extends downward without any layout reflow:

```
┌───────────────────────────────┐
│ Platform: All                 │
├───────────────────────────────┤
│ POS                           │
│ Web / Scan                    │
│ Kiosk           ← future      │
│ Aggregator      ← future      │
│ WhatsApp        ← future      │
│ QR Campaign     ← future      │
└───────────────────────────────┘
```

Phase 1's permissive `normaliseOrderFrom` already preserves any future BE value verbatim, so adding new rows in v2 is a single-file change in the dropdown options array. Phase 3 ships the v1 set only.

---

## 4. Filter composition rule

The Platform dropdown **composes (AND)** with every existing dashboard filter:

```
Final visible orders = orders WHERE
    matches(quickFilter)         AND   ← YTC / Preparing / Ready / Served
    matches(searchQuery)         AND   ← search bar
    matches(channelColumn)       AND   ← Dine-In / Delivery / Room column
    matches(Platform dropdown)         ← NEW (Phase 3)
```

Worked example (owner-stated):

```
Platform = Web / Scan
+ Channel column = Delivery
+ Quick filter = YTC
= visible cards: only orders where
    isWebOrder === true
    AND orderType === 'delivery'
    AND status === 'yetToConfirm'
```

**Selecting `Platform: All` removes only the platform narrowing** — every other active filter (status / channel / search) keeps applying. No filter is implicitly cleared by the dropdown. Same idempotence as POS2-006's PG dropdown.

### Predicate (one-liner for impl)

```
visible = visible.filter(o => {
  if (platform === null)  return true;
  if (platform === 'pos') return o.orderFrom !== 'web';
  if (platform === 'web') return o.orderFrom === 'web';
  return true;
});
```

`'pos'` is `!== 'web'` (not `=== 'pos'`) so future BE values like `'aggregator'` / `'kiosk'` correctly classify as non-web (i.e. POS-side) until they get their own dropdown row in v2.

---

## 5. Order card / table card treatment — REMOVED FROM SCOPE

Per owner directive (2026-05-10), order cards and table cards are **not touched** in Phase 3. They keep their current rendering exactly as-is, regardless of `isWebOrder`. The Platform dropdown above is the only operator-visible affordance for distinguishing Web/Scan orders on the dashboard in Phase 3.

If at any future date the owner wants per-card visual treatment (badge, ribbon, color tint, etc.) for Web/Scan orders, that becomes a separate proposal/CR — it does not block or alter Phase 3.

---

## 6. Implementation notes for next agent

### Files likely to touch (Phase 3 scope, header-only)

| File | Change |
|---|---|
| `frontend/src/pages/DashboardPage.jsx` | Add `platform: null` to filter state; thread through to `<Header>` and into the channel filtering pipeline (see §4). |
| `frontend/src/components/layout/Header.jsx` | Insert the new `<PlatformDropdown>` immediately after the status-chip `<nav>` block, before the search container. Add a 1px `border-l` divider in front of it. Accept `platform` / `setPlatform` props from `DashboardPage`. |
| `frontend/src/components/layout/PlatformDropdown.jsx` (NEW) | Self-contained shadcn `<Select>` with the 3-row panel; `value` / `onChange` props. Mirrors the structure of the POS2-006 PG dropdown. `data-testid="dashboard-platform-filter"`. |
| `frontend/src/pages/DashboardPage.jsx` (filter pipeline) | Apply the `§4 predicate` to the order list before it is split into channel / status columns. Predicate runs after channel filter, before render. |
| Tests | (a) `PlatformDropdown` render + 3-option behaviour + persistence across tab navigation. (b) Predicate parity tests for ALL / POS / Web on a synthetic order list. (c) Filter-composition integration test (Platform AND quick-filter AND channel column AND search). |

### Things implementation must NOT do

- **Do NOT modify any order card** (`OrderCard.jsx`, `TableCard.jsx`, or any card-level component). Cards are explicitly out of scope per owner directive.
- Do NOT change the channel icon (`🍴` / `🛵` / `🏨`) — that's an orthogonal axis (orderType, not orderFrom).
- Do NOT add any badge, pill, ribbon, color tint, or any other per-card visual.
- Do NOT add any localStorage persistence in v1 (selection persists across navigation but resets on full reload).
- Do NOT mutate Phase 4 pop-out / snooze code — that's out of scope.
- Do NOT mutate delivery-charge logic — Phase 2 territory.

### Estimated effort (revised — card work removed)

| Step | Time |
|---|---|
| `PlatformDropdown` component + tests | ~30 min |
| `Header.jsx` slot + divider + prop wiring | ~20 min |
| `DashboardPage.jsx` state + predicate threading | ~25 min |
| Filter-composition integration test | ~20 min |
| Implementation summary doc | ~15 min |
| **Total** | **~1h 50min FE** |

Down from ~2.5 hr — card badge work (~55 min) removed.

### Owner gates remaining for implementation

| Gate | Status |
|---|---|
| OQ-3 (filter shape: pill / toggle / both) | **Closed** — owner picked dropdown |
| Backend echoes `order_from` on socket | Closed (Decision 4 in amendment doc) |
| UX placement | **This proposal (revised)** |
| Card visual treatment | **Removed from Phase 3 scope per owner directive** |

After this revised proposal is approved, Phase 3 has zero remaining gates and is ready for single-pass implementation.

---

## 7. Final verdict

> ## `ready_for_owner_approval` (revised — header-only scope)

All decisions explicit, screenshot referenced, no blocking dependencies, card layer untouched. Approve this proposal and Phase 3 goes from `ready_for_implementation_pending_ux_session` to `ready_for_implementation` — pickup is a single ~1h 50min FE pass.

If the owner wants any changes (label "Web" vs "Scan", divider vs no divider, dropdown order), this doc gets a one-line annotation and stays approve-ready without a re-proposal cycle.

---

## 8. Revision history

| Date | Change | Reason |
|---|---|---|
| 2026-05-10 | Initial proposal — header dropdown + order card badge + table card badge | Phase 3 UX session |
| 2026-05-10 | **Revised — removed all order-card and table-card badge work; scope is header-dropdown-only** | Owner directive: "do not touch order and table card" |

---

— End of POS2-002 Phase 3 Platform Filter UX Proposal (Revised) 2026-05-10 —
