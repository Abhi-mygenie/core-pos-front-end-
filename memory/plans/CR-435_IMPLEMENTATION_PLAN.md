# CR-435 — Implementation Plan
## Remove Redundant Inventory Sidebar Links

**Date:** 2026-10-18
**Stage:** Gate 3 — Implementation Plan
**Agent role:** PLANNING
**Based on:** Gate 2 IA `/app/memory/impact/CR-435_IMPACT_ANALYSIS.md` (revised)
**Approach:** Option B — removes children + fixes active state for all /inventory-* paths

---

## Architectural Decision: Why Option B

The sidebar `useEffect` at L307–328 enforces a **route→active-item contract**: every URL must resolve to exactly one highlighted sidebar item.

Option A (remove children + path only) breaks this — 6 of 7 inventory sub-pages produce no match in either detection pass, leaving the sidebar in a stale/indeterminate state. This violates the sidebar's core design invariant.

Option B adds a single check between the two existing passes (L320→L321 gap), ensuring every `/inventory-*` URL correctly resolves to the `inventory` item. Same 1 file. 3 additional lines. Contract preserved.

---

## Scope Lock

**Files WILL change:** `src/components/layout/Sidebar.jsx`
**Files WILL NOT touch:** `App.js` · `InventoryTabBar.jsx` · any inventory page · any route · any service · any other file

---

## Entry Verification (Implementation agent must confirm before coding)

| # | File | Plan says | Must verify |
|---|---|---|---|
| V-A | `Sidebar.jsx:123` | `// CR-072/CR-078/CR-079 — Inventory Management` | Line reads exactly this comment |
| V-B | `Sidebar.jsx:125` | `id: "inventory",` | Line reads exactly this |
| V-C | `Sidebar.jsx:128` | `children: [` | Line reads exactly this (start of children array) |
| V-D | `Sidebar.jsx:136` | `],` | Line reads exactly `    ],` (close of children array) |
| V-E | `Sidebar.jsx:137` | `},` | Line reads exactly `  },` (close of inventory object) |
| V-F | `Sidebar.jsx:320` | `}` | Close of children-loop `for` block |
| V-G | `Sidebar.jsx:321` | `// Fallback: top-level item path match` | Exactly this comment — insertion point |

If any verification fails → STOP. Return to Planning agent. Do not improvise.

---

## Edit 1 — E-1: Replace inventory children with direct path

**File:** `src/components/layout/Sidebar.jsx`
**Lines:** 123–137 (the full inventory section object)

**BEFORE (L123–137):**
```js
  // CR-072/CR-078/CR-079 — Inventory Management
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    children: [
      { id: "inventory-dashboard", label: "Dashboard", path: "/inventory-dashboard" },                                  // CR-079 · Intelligence view (default)
      { id: "inventory-current-stock", label: "Current Stock", path: "/inventory-current-stock" },                      // CR-079 · was "Stock Dashboard"
      { id: "inventory-smart-purchase", label: "Stock Update", path: "/inventory-smart-purchase" },                     // CR-078 · was "Purchase Entry" · CR-122 · renamed to "Stock Update"
      { id: "inventory-receive", label: "Receive", path: "/inventory-receive", featureGate: "restaurantTypeFlagged" },  // CR-077 · conditional B13 (franchise + master)
      { id: "inventory-audit", label: "Stock Audit", path: "/inventory-audit" },                                        // CR-079 · absorbs CR-075-B · was "Physical Count"
      { id: "inventory-setup", label: "Ingredients & Setup", path: "/inventory-setup" },
      { id: "inventory-recipes", label: "Recipes", path: "/recipes" },
    ],
  },
```

**AFTER:**
```js
  // CR-072/CR-078/CR-079 — Inventory Management
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    path: "/inventory-dashboard", // CR-435: direct nav — InventoryTabBar handles all sub-navigation
  },
```

**Lines removed:** 9 (children array + 7 child objects)
**Lines kept:** 5 (comment + object open + id/label/icon/path + object close)
**Net change:** −8 lines

---

## Edit 2 — E-2: Add /inventory-* active state match between the two detection passes

**File:** `src/components/layout/Sidebar.jsx`
**Insert after:** L320 (the closing `}` of the children detection loop)
**Before:** L321 `// Fallback: top-level item path match`

**INSERT (3 lines):**
```js
    // CR-435: inventory section — no children after CR-435; match all /inventory-* sub-pages
    if (path.startsWith('/inventory')) { setActiveItem('inventory'); return; }
```

(2 lines inserted — the comment + the guard — shown as 2 lines)

**Why here:** This runs AFTER the children pass (which now finds no inventory children) and BEFORE the fallback pass. It slots cleanly into the existing two-pass detection without changing any other logic.

**Why `startsWith('/inventory')`:**
- Matches: `/inventory-dashboard`, `/inventory-current-stock`, `/inventory-smart-purchase`, `/inventory-receive`, `/inventory-audit`, `/inventory-setup`
- Does NOT match: `/recipes` (moved out of inventory nav by CR-435 — it is its own sidebar item anyway), `/insights-dashboard`, `/inventory-orders` (hypothetical), or any other section
- Zero false positives against current routes

---

## Full Diff Summary

```
Sidebar.jsx:
  E-1 L123–137: replace 15-line children block → 6-line flat object   (−9 net)
  E-2 L320+: insert 2-line /inventory-* guard                          (+2 net)
  Total delta: ~11 lines across 1 file
```

---

## Verification Matrix

| # | Edit | Verify | Method |
|---|---|---|---|
| V-1 | E-1 | Inventory sidebar shows NO dropdown / flyout on click | Browser: click Inventory → navigates directly, no expand |
| V-2 | E-1 | Clicking Inventory lands on /inventory-dashboard | Browser: verify URL + page renders |
| V-3 | E-1 | No `children` reference for inventory in rendered DOM | DevTools: no `.inventory-dashboard` list item in sidebar DOM |
| V-4 | E-2 | Inventory item highlighted on /inventory-dashboard | Browser: navigate to /inventory-dashboard → Inventory sidebar green |
| V-5 | E-2 | Inventory item highlighted on /inventory-current-stock | Browser: click Current Stock tab in InventoryTabBar → Inventory sidebar green |
| V-6 | E-2 | Inventory item highlighted on /inventory-audit | Browser: click Stock Audit tab → Inventory sidebar green |
| V-7 | E-2 | Other sections unaffected | Browser: navigate to Reports → Insights → Reports still highlights correctly |
| V-8 | E-1 | InventoryTabBar still renders all 7 sub-tabs | Browser: on any inventory page → all tabs present |
| V-9 | E-1 | Receive tab franchise-gated via InventoryTabBar | Browser: non-franchise account → no Receive tab in InventoryTabBar |
| REG | Both | No webpack compile errors | `yarn start` compiles with 0 new warnings |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `/recipes` path no longer under inventory → sidebar shows no active item for Recipes | LOW — Recipes is a separate sidebar item (`inventory-recipes` was child, but `/recipes` route has its own sidebar entry) | Verify Recipes item still exists in `sidebarMenuItems` independently |
| Line drift from concurrent edits | LOW — only CR-415 and BUG-555 touched Sidebar.jsx (Oct 12/15) | Entry Verify step V-A through V-G must all pass before coding |

---

## Post-Code Registry Checklist (EXIT GATE — Implementation agent)

```
- [ ] registry.json: CR-435 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] CR_REGISTRY.md: row updated with IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add CR-435 row for Sidebar.jsx with date 2026-10-18
- [ ] Code markers: // CR-435 on E-1 path line + E-2 guard comment
- [ ] Compile: yarn start — 0 new webpack warnings
```

---

Planning complete: CR-435
Stage: Gate 3 — Implementation Plan
Code reality: FULL
Risk: LOW
Files WILL change: `src/components/layout/Sidebar.jsx`
Files WILL NOT touch: any other file
Owner decisions: Option B selected (architecturally correct)
Verification matrix: 9 checks (all browser + 1 compile)
Awaiting Gate 4 GO: owner says "CR-435 Gate 4 GO"
