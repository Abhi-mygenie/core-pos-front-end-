# BUG-196: Sidebar Navigation Missing on Inventory, Employee Management & Restaurant Settings Pages

**ID:** BUG-196
**Type:** BUG
**Priority:** P1 (HIGH — feature broken, navigation missing on 7 pages, no workaround)
**Risk:** MEDIUM (layout-only, no API/financial/state/localStorage change)
**Sprint:** POS 5.0
**Reported by:** Owner
**Date:** 2026-07-16
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (agent reproduced via investigation)

---

## Description

The left-hand side (LHS) navigation sidebar is not visible on Inventory pages, Employee Management page, and Restaurant Settings page. These pages take full screen width. The sidebar should always be visible (same as Insights, Reports, Menu Management, Expense pages).

---

## Code Reality: NONE (fix not implemented)

The Sidebar component (`components/layout/Sidebar.jsx`) exists and works correctly on other pages. The issue is that 7 page wrapper files do not import or render `<Sidebar>`.

---

## Duplicate Check: DISTINCT

No existing BUG or CR covers sidebar missing on these pages.

---

## Evidence

### Steps to Reproduce
1. Login to POS
2. Navigate to `/inventory` (or any inventory route, `/employees`, `/restaurant-settings`)
3. Observe: page content fills the entire viewport width with no sidebar visible
4. Compare: navigate to `/menu` or any `/reports-module/*` page — sidebar is visible on the left

### Root Cause (from Investigation)

**Working pattern** (MenuManagementPage, ExpenseEntryPage, all Reports):
```jsx
import Sidebar from "../components/layout/Sidebar";
const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
// ...
<div className="flex h-screen">
  <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
  <ContentPanel style={{ marginLeft: isSidebarExpanded ? 280 : 70 }} />
</div>
```

**Broken pattern** (all 7 affected pages):
```jsx
// NO Sidebar import, NO Sidebar render
<div className="min-h-screen bg-slate-50">
  <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
    <ContentPanel />
  </div>
</div>
```

### Affected Pages (7)

| # | Page | File | Route |
|---|---|---|---|
| 1 | Inventory Dashboard | `pages/InventoryDashboardPage.jsx` | `/inventory` |
| 2 | Inventory Setup | `pages/InventorySetupPage.jsx` | `/inventory-setup` |
| 3 | Physical Count | `pages/PhysicalCountPage.jsx` | `/inventory-physical` |
| 4 | Purchase Entry | `pages/PurchaseEntryPage.jsx` | `/inventory-purchase` |
| 5 | Recipe Management | `pages/RecipeManagementPage.jsx` | `/recipes` |
| 6 | Employee Management | `pages/EmployeeManagementPage.jsx` | `/employees` |
| 7 | Restaurant Settings | `pages/RestaurantSettingsPage.jsx` | `/restaurant-settings` |

### Reference Implementation
`pages/MenuManagementPage.jsx` — correct sidebar pattern.

---

## Blast Radius

- ~7 files, ~10-15 lines added per file (mechanical, identical change)
- Hotspot files touched: **NO** (page wrappers only, not R5 hotspots)
- Estimated scope: **MEDIUM** (7 files, but identical mechanical fix)
- No API, transform, state management, localStorage, provider order, socket, or env change
- No financial/order/report/print/auth/permission logic

---

## Open Questions

| # | Question | Status |
|---|---|---|
| OQ-1 | Should Restaurant Settings sidebar behave differently (it's a wizard with step navigation)? | PENDING — owner decision needed |

---

## Fast Lane Eligibility: NO
- Touches 7 files (Fast Lane requires 1 file only)
- Full gate flow required

---

## Next: Planning Gate 2
