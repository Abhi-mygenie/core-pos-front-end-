# Intake — CR-374
## BulkEditor: Filter Panel (Status / Type / Category) — Both Normal and Aggregator Menus

**Date:** 2026-09-11  
**Registered by:** Investigation Agent (ALPHA v0.7)  
**Source:** OWNER-REPORTED UX gap + AGENT-CONFIRMED-IN-CODE  
**Sprint:** pos_7_0 (suggested)  
**Related investigation:** `/app/memory/investigations/INV-MENU-BULK-FILTER-GAP_INVESTIGATION_REPORT_2026_09_11.md`

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | CR (Enhancement / Missing Feature) |
| **Severity** | P2 — MEDIUM |
| **Risk** | MEDIUM |
| **Area** | Menu Management > BulkEditor.jsx |
| **Fast Lane** | NOT ELIGIBLE — adds new state (~4 state fields), filter logic in `groupedRows`, filter UI bar (~30–50 lines) |

**Severity rationale:** Bulk edit with 100+ items is impractical without filters. The card view has these filters; the bulk edit mode is a significant productivity tool that is currently filter-blind. No data is at risk, but the UX gap forces manual work at scale.

**Risk rationale:** Adds UI state + computed filter logic inside BulkEditor. No API contract changes, no financial logic, no hotspot files. MEDIUM because BulkEditor is a complex, frequently-modified component.

---

## Owner Requirement (verbatim)

> "In normal menu there is no option to filter in bulk edit — for example someone wants to only active or maybe particular category. Suggests even for bulk delete, for example someone wants to delete deactivated items."

---

## Description

`BulkEditor.jsx` currently provides only a text search box. It has no way to filter rows by:

1. **Status** — Active / Inactive (available in card view via `STATUS_FILTERS` in `ProductList.jsx`)
2. **Food type** — Veg / Non-Veg / Egg / Jain (available in card view via `FOOD_FILTERS`)
3. **Category** — Show only items from a selected category (the sidebar category selection is NOT wired to BulkEditor — `selectedCategoryId` is passed only to `ProductList`)

**Key consequence for bulk delete:** The "Select All" checkbox in BulkEditor selects ALL currently visible rows. Without a status filter, there is no way to "Select all inactive items and delete them" — the user must manually identify and check each inactive item in a table of potentially 200+ rows.

---

## Root Cause (confirmed in code)

```jsx
// BulkEditor.jsx:425–471 — groupedRows useMemo
const groupedRows = useMemo(() => {
  let result = rows;
  if (search) {
    result = result.filter(r =>
      r._isNew ||
      r.productName.toLowerCase().includes(s) ||
      r.categoryName?.toLowerCase().includes(s) ||
      r.itemCode?.toLowerCase().includes(s)
    );
  }
  // ← No statusFilter, no foodTypeFilter, no categoryFilter
  // ...groups by category alphabetically
}, [rows, search, sortCol, sortDir]);
```

`ProductList.jsx` (card view) has `STATUS_FILTERS` and `FOOD_FILTERS` defined at lines 12–25 and properly wired into `filteredProducts`. BulkEditor was never updated to mirror these.

---

## Desired State (after CR-374)

```
BulkEditor toolbar bar (below text search):
  Status:  [ All ]  [ Active ]  [ Inactive ]
  Type:    [ All ]  [ Veg ]  [ Non-Veg ]  [ Egg ]  [ Jain ]
  Category: [ All ]  [ Starters ▼ ] (dropdown or chips)

→ groupedRows filters by active status + type + category
→ "Select All" checkbox selects all VISIBLE (filtered) rows
→ User flow: filter to "Inactive" → Select All → Delete Selected
→ User flow: filter to "Starters" + "Non-Veg" → update prices in batch
```

---

## Implementation Scope

| Item | Detail |
|------|--------|
| **File** | `BulkEditor.jsx` (1 file only) |
| **New state** | `filterStatus: 'all'|'active'|'inactive'`, `filterType: 'all'|'veg'|'nonveg'|'egg'|'jain'`, `filterCategoryId: null|number` |
| **New state mapping** | `row.status === 1` = active; `row.itemType` 0=NV,1=Veg,2=Egg,3=Jain; `row.categoryId` |
| **groupedRows** | Add 3 filter passes before the existing search pass |
| **UI** | Filter chips below toolbar. Collapsible row (same as card view pattern) or always-visible. Owner to decide. |
| **Props change** | No new props needed. `categories` already passed for category filter dropdown. |
| **Select All** | No change needed — already selects visible rows. Gains "select all inactive" for free once filter works. |
| **Lines estimate** | ~35–55 lines added |

---

## Evidence

- **Source:** Owner-reported (2026-09-11 session)
- **Confidence:** CONFIRMED (agent verified in code)
- **Code evidence:** `BulkEditor.jsx:425–471` — `groupedRows` has no status/type/category filter
- **Contrast evidence:** `ProductList.jsx:12–66` — STATUS_FILTERS + FOOD_FILTERS fully working in card view

---

## Duplicate Check

| Check | Result |
|-------|--------|
| CR-036 / CR-036-FU-01/02/03 | RELATED — BulkEditor UX series, but none added filter panel |
| CR-159 (bulk delete) | RELATED — implemented the delete capability, but did not add filters |
| Any existing filter CR for BulkEditor | DISTINCT — no registered item |

**Verdict: DISTINCT. Related: CR-036 (BulkEditor UX), CR-159 (bulk delete foundation)**

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files to change | 1 (`BulkEditor.jsx`) |
| New state fields | 3 |
| Lines to add | ~35–55 |
| Hotspot files | NO |
| Financial / billing / GST | NO |
| API / service change | NO |

**Blast radius: SMALL**

---

## Owner Decisions (LOCKED — 2026-09-11)

| OD | Question | Decision | Locked by |
|----|----------|----------|----------|
| OD-374-01 | Filter bar always visible, or behind a toggle? | **OPTION A — Always-visible filter strip** sits permanently between toolbar and grid. No toggle required. | Owner (2026-09-11) |
| OD-374-02 | Category filter style (chips vs dropdown)? | **Searchable dropdown** — owner confirmed 20+ categories, chips impractical at that scale. Type-to-filter. | Owner (2026-09-11) |
| OD-374-03 | Reset filter state on menu type switch (Normal ↔ Aggregator)? | **YES — reset on menu type change** (safe default, avoids stale cross-type filters). | Agent default — owner can override |

All owner decisions locked. **Ready for Gate 3 (Implementation Plan).**

---

## Design Spec (frozen — Option A)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Search…] [Columns▼] [Excel▼] [Import] [+Add Item] [ValidateTax] [Save N] [×] │  ← Toolbar (unchanged)
├─────────────────────────────────────────────────────────────────────┤
│ Status: [All●] [Active] [Inactive]   Type: [All●] [Veg] [Non-Veg] [Egg] [Jain]   Category: [All Categories ▼🔍]  │  ← NEW always-visible filter strip
├─────────────────────────────────────────────────────────────────────┤
│ Editing: [Name] [Category] [Price] … column chips …               │  ← Existing column chips bar (unchanged)
├─────────────────────────────────────────────────────────────────────┤
│  □  #  │ Name │ Category │ Price │ Status │ Type │ …              │  ← Grid (unchanged)
│ ─────────────────────────────────────────────────────────────────── │
│  □     │ …    │ …        │ …     │        │      │                │
└─────────────────────────────────────────────────────────────────────┘
```

- Filter strip background: `COLORS.sectionBg` (matches column chips bar tone)
- Active filter pill: orange fill + white text (same as column chip active state)
- Category dropdown: searchable, shows "All Categories" when unfiltered, shows category name when filtered
- "Clear Filters" link appears only when at least one filter is non-default

---

*Intake frozen. All ODs locked. Next: Gate 3 Implementation Plan → Gate 4 GO → Implementation.*
