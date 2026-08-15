# BUG-196 Implementation Plan — Sidebar Navigation Fix

**ID:** BUG-196
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-16
**Risk:** MEDIUM
**Depends on:** Impact Analysis `impact/BUG-196_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change (6):**
1. `pages/InventoryDashboardPage.jsx`
2. `pages/InventorySetupPage.jsx`
3. `pages/PhysicalCountPage.jsx`
4. `pages/PurchaseEntryPage.jsx`
5. `pages/RecipeManagementPage.jsx`
6. `pages/EmployeeManagementPage.jsx`

**Files will NOT touch:**
- `pages/RestaurantSettingsPage.jsx` (deferred — OQ-1, has own wizard rail)
- `components/layout/Sidebar.jsx`
- All panel components
- `App.js`

---

## Pattern Reference

Follow **Pattern B** from Impact Analysis (ExpenseEntryPage/ExpenseSetupPage):

```jsx
import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import ContentPanel from '@/components/...';

export default function XxxPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="xxx-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main
        className="flex-1 overflow-auto bg-slate-50"
        style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}
      >
        {/* existing page header + panel content moves here */}
      </main>
    </div>
  );
}
```

---

## Edit-by-Edit Plan

### Edit 1 — `pages/InventoryDashboardPage.jsx`

**Current (full file):**
```jsx
// CR-072: Inventory Dashboard Page
import { Package } from 'lucide-react';
import InventoryDashboardPanel from '@/components/inventory/InventoryDashboardPanel';

export default function InventoryDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="inventory-dashboard-page">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Stock Dashboard
            </h1>
          </div>
        </div>
        <InventoryDashboardPanel />
      </div>
    </div>
  );
}
```

**New:**
```jsx
// CR-072: Inventory Dashboard Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { Package } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import InventoryDashboardPanel from '@/components/inventory/InventoryDashboardPanel';

export default function InventoryDashboardPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="inventory-dashboard-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Stock Dashboard
              </h1>
            </div>
          </div>
          <InventoryDashboardPanel />
        </div>
      </main>
    </div>
  );
}
```

---

### Edit 2 — `pages/InventorySetupPage.jsx`

**Current (full file):**
```jsx
// CR-072: Inventory Setup Page
import { Settings } from 'lucide-react';
import InventorySetupPanel from '@/components/inventory/InventorySetupPanel';

export default function InventorySetupPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="inventory-setup-page">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Inventory Setup
          </h1>
        </div>
        <InventorySetupPanel />
      </div>
    </div>
  );
}
```

**New:**
```jsx
// CR-072: Inventory Setup Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { Settings } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import InventorySetupPanel from '@/components/inventory/InventorySetupPanel';

export default function InventorySetupPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="inventory-setup-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Inventory Setup
            </h1>
          </div>
          <InventorySetupPanel />
        </div>
      </main>
    </div>
  );
}
```

---

### Edit 3 — `pages/PhysicalCountPage.jsx`

**Current (full file):**
```jsx
// CR-072: Physical Count Page
import { ClipboardCheck } from 'lucide-react';
import PhysicalCountPanel from '@/components/inventory/PhysicalCountPanel';

export default function PhysicalCountPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="physical-count-page">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Physical Stock Count
            </h1>
          </div>
        </div>
        <PhysicalCountPanel />
      </div>
    </div>
  );
}
```

**New:**
```jsx
// CR-072: Physical Count Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import PhysicalCountPanel from '@/components/inventory/PhysicalCountPanel';

export default function PhysicalCountPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="physical-count-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Physical Stock Count
              </h1>
            </div>
          </div>
          <PhysicalCountPanel />
        </div>
      </main>
    </div>
  );
}
```

---

### Edit 4 — `pages/PurchaseEntryPage.jsx`

**Current (full file):**
```jsx
// CR-072: Purchase Entry Page
import { ShoppingCart } from 'lucide-react';
import PurchaseEntryPanel from '@/components/inventory/PurchaseEntryPanel';

export default function PurchaseEntryPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="purchase-entry-page">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Add Purchase Entry
          </h1>
        </div>
        <PurchaseEntryPanel />
      </div>
    </div>
  );
}
```

**New:**
```jsx
// CR-072: Purchase Entry Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import PurchaseEntryPanel from '@/components/inventory/PurchaseEntryPanel';

export default function PurchaseEntryPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="purchase-entry-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Add Purchase Entry
            </h1>
          </div>
          <PurchaseEntryPanel />
        </div>
      </main>
    </div>
  );
}
```

---

### Edit 5 — `pages/RecipeManagementPage.jsx`

**Current (full file):**
```jsx
// CR-072: Recipe Management Page
import { ChefHat } from 'lucide-react';
import RecipeManagementPanel from '@/components/inventory/RecipeManagementPanel';

export default function RecipeManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="recipe-management-page">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Recipes Management
          </h1>
        </div>
        <RecipeManagementPanel />
      </div>
    </div>
  );
}
```

**New:**
```jsx
// CR-072: Recipe Management Page
// BUG-196: Added Sidebar navigation
import { useState } from 'react';
import { ChefHat } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import RecipeManagementPanel from '@/components/inventory/RecipeManagementPanel';

export default function RecipeManagementPage() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="recipe-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Recipes Management
            </h1>
          </div>
          <RecipeManagementPanel />
        </div>
      </main>
    </div>
  );
}
```

---

### Edit 6 — `pages/EmployeeManagementPage.jsx`

**Current imports (line 2):** `import { useState } from 'react';` — already has useState.

**Changes:**
- Add `import Sidebar from '@/components/layout/Sidebar';` after line 3
- Add `const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);` inside component
- Change outer `<div className="min-h-screen bg-slate-50">` → `<div className="flex h-screen">`
- Add `<Sidebar>` + wrap content in `<main>` with marginLeft

**Current outer (line 25-26):**
```jsx
    <div className="min-h-screen bg-slate-50" data-testid="employee-management-page">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
```

**New outer:**
```jsx
    <div className="flex h-screen" data-testid="employee-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-slate-50" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
```

**Current closing (last 3 lines):**
```jsx
      </div>
    </div>
  );
```

**New closing:**
```jsx
        </div>
      </main>
    </div>
  );
```

---

## Execution Sequence

1. Edits 1-5 (Inventory pages) — independent, parallel safe
2. Edit 6 (EmployeeManagementPage) — independent
3. Compile check: `webpack compiled` with 0 new warnings
4. Visual verification: screenshot each route

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| 1 | InventoryDashboardPage.jsx | Sidebar added | Browser: `/inventory` — sidebar visible, content offset | NO |
| 2 | InventorySetupPage.jsx | Sidebar added | Browser: `/inventory-setup` — sidebar visible | NO |
| 3 | PhysicalCountPage.jsx | Sidebar added | Browser: `/inventory-physical` — sidebar visible | NO |
| 4 | PurchaseEntryPage.jsx | Sidebar added | Browser: `/inventory-purchase` — sidebar visible | NO |
| 5 | RecipeManagementPage.jsx | Sidebar added | Browser: `/recipes` — sidebar visible | NO |
| 6 | EmployeeManagementPage.jsx | Sidebar added | Browser: `/employees` — sidebar visible, tabs still work | NO |
| ALL | — | Compile check | `tail /var/log/supervisor/frontend.out.log` → "webpack compiled" | YES |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-196 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add 6 files with BUG-196 + date
- [ ] Code markers: `// BUG-196` comment in every modified file

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Content squeeze on small screens | Sidebar defaults to collapsed (70px); panels already responsive |
| Sidebar scroll position lost on nav | BUG-136 scroll persistence already handles this via InsightsCacheContext |

---

**Next:** Gate 4 GO (owner approval) → Implementation
