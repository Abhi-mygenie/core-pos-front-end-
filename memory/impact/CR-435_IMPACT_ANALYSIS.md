# CR-435 — Impact Analysis (REVISED)
## Remove Redundant Inventory Sidebar Links

**Date:** 2026-10-18 (revised — active state regression identified)
**Stage:** Gate 2 — Impact Analysis
**Agent role:** PLANNING
**Code Reality:** FULL — 7-child inventory section confirmed at L123–137

---

## 1. What Was Missed in the Previous IA

The previous IA confirmed the children removal as safe. But it missed a **sidebar active state regression** that occurs when children are removed.

---

## 2. Current Behaviour (with children)

`Sidebar.jsx` active state detection (L307–328) walks all items:
```
1. Check children first → finds /inventory-current-stock → sets activeItem = 'inventory-current-stock'
   + expands the inventory section
2. Active styling (L659–661): applied when activeItem === item.id AND !hasChildren
```

When the user navigates to any inventory sub-page (`/inventory-dashboard`, `/inventory-current-stock`, `/inventory-smart-purchase`, etc.) — the matching child is highlighted and the Inventory section stays expanded.

---

## 3. Regression After Naive Removal (Option A)

If children are removed and `path: "/inventory-dashboard"` is added:

```js
// Active detection fallback (L322–327):
if (item.path && (path === item.path || path.startsWith(item.path + "/"))) {
  setActiveItem(item.id);  // only matches /inventory-dashboard exactly
}
```

| Current URL | With children | After simple removal |
|---|---|---|
| `/inventory-dashboard` | `inventory-dashboard` highlighted | `inventory` highlighted ✅ |
| `/inventory-current-stock` | `inventory-current-stock` highlighted | **NO highlight** ❌ |
| `/inventory-smart-purchase` | `inventory-smart-purchase` highlighted | **NO highlight** ❌ |
| `/inventory-audit` | `inventory-audit` highlighted | **NO highlight** ❌ |

When navigating to sub-pages via `InventoryTabBar`, the Inventory sidebar item loses its highlight entirely. This is a **visual regression** — not a functional one (navigation still works via InventoryTabBar), but the sidebar no longer reflects "you are in Inventory."

---

## 4. Two Options

### Option A — Simple removal, accept active state gap
Remove children, add `path: "/inventory-dashboard"`. Inventory sidebar item highlights only when on `/inventory-dashboard` itself. On sub-pages (Current Stock, Stock Audit, etc.) the sidebar shows no active highlight.

- **1 file, ~8 line delta** — Fast Lane eligible on line count
- **Acceptable if:** owner agrees the InventoryTabBar makes sidebar highlighting redundant on sub-pages
- **Risk:** LOW — visual only, no functional regression

---

### Option B — Correct removal with active state fix (recommended)
Remove children, add `path: "/inventory-dashboard"`. Also add a 3-line guard in the active detection loop to match all `/inventory-*` paths.

**Additional change in active detection (L319–328 area):**
```js
// AFTER the children loop, BEFORE the existing fallback loop — add:
for (const item of sidebarMenuItems) {
  if (item.id === 'inventory' && location.pathname.startsWith('/inventory')) {
    setActiveItem('inventory');  // CR-435: match all /inventory-* sub-pages
    return;
  }
}
// existing fallback loop continues...
```

- **1 file, ~11 line delta** — slightly over Fast Lane 10-line limit
- Inventory sidebar item stays highlighted on ALL inventory sub-pages
- `/recipes` (which is also under inventory) would NOT match — acceptable (Recipes is a separate concern)
- **Risk:** LOW — additive, isolated to `inventory` id only

---

## 5. Files and Lines

| File | Option A | Option B |
|---|---|---|
| `src/components/layout/Sidebar.jsx` | L124–136: remove children (−8 lines) + add `path` (1 line) | Same + 3 lines active detection |
| Other files | None | None |

Both options: **1 file only**.

---

## 6. Downstream Verification

- **InventoryTabBar.jsx** — completely unaffected (owns its own active tab detection)
- **App.js routes** — unaffected (all `/inventory-*` routes remain as-is)
- **`featureGate: "restaurantTypeFlagged"`** on `inventory-receive` child — this feature gate in the sidebar is removed. The `InventoryTabBar.jsx` has its own `franchiseOnly: true` guard for the Receive tab → franchise-only behaviour is fully preserved there.

---

## 7. Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO |
| API contract change? | NO |
| State management? | NO |
| Hotspot file (R5)? | NO |
| Files touched | 1 (Sidebar.jsx) |
| Risk | LOW |

**Fast Lane: Option A = ELIGIBLE. Option B = borderline (11 lines, 1 file). Owner can approve either.**

---

## 8. Owner Decision Needed

| # | Decision | Options |
|---|---|---|
| OD-435-01 | Active state on inventory sub-pages | **(a) Option B — fix it (recommended):** Inventory stays highlighted when on any sub-page. Adds 3 lines. / (b) Option A — accept gap: Inventory only highlights on /inventory-dashboard. 8 lines. |

---

## 9. Verification Matrix (seeds QA)

| # | Change | How to Verify |
|---|--------|--------------|
| 1 | Children removed | Click "Inventory" in sidebar — no dropdown, navigates directly to /inventory-dashboard |
| 2 | Direct navigation works | Inventory Dashboard page loads correctly |
| 3 | InventoryTabBar intact | All 7 sub-tabs visible and functional within inventory pages |
| 4 | Option B only: active state | Navigate to Current Stock / Stock Audit — Inventory item in sidebar is still highlighted |
| REG | Franchise gate | Receive tab still hidden for non-franchise restaurants (via InventoryTabBar) |

---

## 10. Post-Code Registry Checklist

```
- [ ] registry.json: CR-435 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add CR-435 entry for Sidebar.jsx
- [ ] Code marker: // CR-435 on modified lines
```

---

Planning complete: CR-435
Stage: Impact Analysis (Gate 2) — REVISED
Code reality: FULL (children confirmed at L123–137)
Risk: LOW
Files WILL change: `src/components/layout/Sidebar.jsx` only
Files WILL NOT touch: App.js · InventoryTabBar.jsx · any inventory page · any route
Owner decisions: OD-435-01 (Option A or B — active state handling)
Next: Owner answers OD-435-01 → Gate 3 GO → Implementation
