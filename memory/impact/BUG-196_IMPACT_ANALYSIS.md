# BUG-196 Impact Analysis — Sidebar Navigation Missing

**ID:** BUG-196
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-16
**Code Reality:** NONE (fix not implemented)
**Conflict Pre-Check:** No conflicts — no other active item touches these 7 page files
**Risk:** MEDIUM (layout-only, no API/financial/state/localStorage)

---

## 1. Summary

Seven page wrapper files render their content full-width without the app's `<Sidebar>` navigation component. All other routed pages (Menu, Expense, Reports, Insights, etc.) include `<Sidebar>` following a consistent pattern. The missing sidebar breaks navigation continuity — users must use browser back or manually type URLs to navigate away from these pages.

---

## 2. Root Cause

CR-072 (Inventory, 5 pages) and CR-069 (Employee, 1 page) were implemented with standalone page wrappers that render `<div className="min-h-screen">` without importing or rendering `<Sidebar>`. CR-019 (Restaurant Settings, 1 page) has its own internal left-rail wizard navigation but no app Sidebar.

This is a **PLAN_GAP** — the implementation plans for CR-072/069/019 did not specify Sidebar integration in the page wrapper files.

---

## 3. Reference Pattern (Working)

Two reference implementations exist. All working pages follow one of these:

### Pattern A — Panel accepts `sidebarWidth` prop (MenuManagementPage)
```jsx
import Sidebar from "../components/layout/Sidebar";
const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
return (
  <div className="flex h-screen">
    <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
    <ContentPanel sidebarWidth={isSidebarExpanded ? 280 : 70} />
  </div>
);
```

### Pattern B — Main wrapper with `marginLeft` (ExpenseEntryPage, ExpenseSetupPage)
```jsx
import Sidebar from "../components/layout/Sidebar";
const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
return (
  <div className="flex h-screen">
    <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
    <main className="flex-1 overflow-auto bg-[#F7F7F7]"
          style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
      <ContentPanel />
    </main>
  </div>
);
```

**Pattern B** is the appropriate pattern for BUG-196 pages because the inventory/employee panels do not accept a `sidebarWidth` prop. Each page header (icon + title) should move inside the `<main>` wrapper.

---

## 4. Affected Pages — Detailed Analysis

### Group A: Straightforward Fix (6 pages)

These pages have simple structure: outer div → padding div → page header → panel. All follow the same broken pattern and need the same mechanical fix.

| # | File | Current Outer | Panel Component | data-testid |
|---|---|---|---|---|
| 1 | `pages/InventoryDashboardPage.jsx` | `<div className="min-h-screen bg-slate-50">` | `<InventoryDashboardPanel />` | `inventory-dashboard-page` |
| 2 | `pages/InventorySetupPage.jsx` | `<div className="min-h-screen bg-slate-50">` | `<InventorySetupPanel />` | `inventory-setup-page` |
| 3 | `pages/PhysicalCountPage.jsx` | `<div className="min-h-screen bg-slate-50">` | `<PhysicalCountPanel />` | `physical-count-page` |
| 4 | `pages/PurchaseEntryPage.jsx` | `<div className="min-h-screen bg-slate-50">` | `<PurchaseEntryPanel />` | `purchase-entry-page` |
| 5 | `pages/RecipeManagementPage.jsx` | `<div className="min-h-screen bg-slate-50">` | `<RecipeManagementPanel />` | `recipe-management-page` |
| 6 | `pages/EmployeeManagementPage.jsx` | `<div className="min-h-screen bg-slate-50">` | Tabs: `<EmployeeListView />` / `<RoleListView />` / `<RoleFormView />` | `employee-management-page` |

**Fix per page (Pattern B):**
1. Add `import { useState } from 'react';` (or add `useState` to existing import)
2. Add `import Sidebar from "../components/layout/Sidebar";` (or `@/components/layout/Sidebar` for alias imports)
3. Add `const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);`
4. Change outer div to `<div className="flex h-screen" data-testid="...">`
5. Add `<Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />`
6. Wrap remaining content in `<main className="flex-1 overflow-auto bg-slate-50" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>`
7. Keep inner padding div and page header as-is inside `<main>`

**Lines changed per file:** ~8-12 (imports + state + wrapper restructure)

### Group B: Owner Decision Required (1 page)

| # | File | Current Outer | Special Concern |
|---|---|---|---|
| 7 | `pages/RestaurantSettingsPage.jsx` | `<div className="flex min-h-screen">` + own 280px left rail | **Has internal wizard step navigation as left panel** |

**RestaurantSettingsPage** already renders a 280px left rail with 6 wizard steps (step indicator, progress, click-to-navigate). Adding the app Sidebar would create a **double left-panel** layout:
- Option A: Add Sidebar (user sees Sidebar 70px + Wizard Rail 280px = 350px left panels)
- Option B: Leave as-is (wizard is intentionally full-screen during setup)
- Option C: Replace wizard rail with Sidebar, move step nav to top/horizontal

**Recommendation:** Defer RestaurantSettingsPage (Option B) — it's a one-time setup wizard, not a daily-use page. The internal step navigation IS the left panel for this context. **Owner decision needed.**

---

## 5. Sidebar Component API

```jsx
const Sidebar = ({
  isExpanded,          // boolean — required
  setIsExpanded,       // function — required
  onRefresh,           // function — optional
  isRefreshing,        // boolean — optional
  isOrderEntryOpen,    // boolean — optional
  activeView,          // string — optional (dashboard-specific)
  setActiveView,       // function — optional (dashboard-specific)
  dashboardView,       // string — optional (dashboard-specific)
  setDashboardView,    // function — optional (dashboard-specific)
  lockTableOrder,      // boolean — optional (default false)
  lockChannelStatus,   // boolean — optional (default false)
}) => { ... }
```

For inventory/employee pages, only `isExpanded` + `setIsExpanded` are needed (same as Expense pages).

---

## 6. Downstream Consumers

No downstream impact. The fix is purely additive — wrapping existing content in a Sidebar + main layout. No props, state, or API contracts change.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Content squeezed by sidebar on smaller screens | LOW | LOW | Sidebar collapses to 70px by default; panels already responsive |
| Page header duplication (Sidebar shows page name + page has own header) | LOW | LOW | Sidebar shows nav section names, page headers show specific titles — no conflict |
| EmployeeManagementPage tabs interaction with sidebar | LOW | LOW | Tabs are inside main content, no overlap with sidebar |

---

## 8. Open Questions

| # | Question | Status | Recommendation |
|---|---|---|---|
| OQ-1 | Should RestaurantSettingsPage get the app Sidebar? (Has own 280px wizard left rail) | PENDING — OWNER DECISION | Defer (Option B) — wizard is intentionally full-screen |

---

## 9. Scope Declaration

**Files WILL change (6):**
- `pages/InventoryDashboardPage.jsx`
- `pages/InventorySetupPage.jsx`
- `pages/PhysicalCountPage.jsx`
- `pages/PurchaseEntryPage.jsx`
- `pages/RecipeManagementPage.jsx`
- `pages/EmployeeManagementPage.jsx`

**Files will NOT touch:**
- `pages/RestaurantSettingsPage.jsx` (deferred — OQ-1)
- `components/layout/Sidebar.jsx` (no changes needed)
- All panel components (`InventoryDashboardPanel`, etc.) — no prop changes needed
- `App.js` — routes unchanged

---

## 10. Estimation

- 6 files × ~10 lines each = ~60 lines total
- Mechanical identical fix across all 6 files
- No tests needed beyond visual verification (layout change only)
- Risk: MEDIUM → implementation can proceed after Gate 3 plan

---

**Next:** Gate 3 (Implementation Plan) after owner reviews and resolves OQ-1.
