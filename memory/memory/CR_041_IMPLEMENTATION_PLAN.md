# CR-041 — Implementation Plan (Gate 3)

**ID:** CR-041
**Role:** PLANNING agent (Gate 3)
**Date:** 2026-06-17
**Risk:** MEDIUM
**Depends on:** Impact Analysis (Gate 2, same date)

---

## Scope (LOCKED)

**Files WILL change:** Sidebar.jsx, DashboardPage.jsx, App.js
**Files WILL create:** MenuManagementPage.jsx, CreditManagementPage.jsx, DayClosurePage.jsx, SettingsPage.jsx
**Files WILL NOT change:** All 40+ report screens, all panel components, all services, all transforms, all contexts

---

## Execution Sequence

Implement in this order to avoid broken intermediate states:

1. Create 4 new page wrappers (no dependencies)
2. Add new routes in App.js (pages exist now)
3. Rewrite Sidebar.jsx (menu data + handlers + visibility)
4. Remove panel mounts from DashboardPage.jsx (Sidebar no longer triggers them)

---

## Edit 1: Create MenuManagementPage.jsx

**File:** `pages/MenuManagementPage.jsx` — **NEW**
**Pattern:** Same as AllOrdersReportPage / SettlementPage (Sidebar + content)

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import MenuManagementPanel from "../components/panels/MenuManagementPanel";

// CR-041: Menu Management as full-page route (was panel overlay)
const MenuManagementPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="menu-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <MenuManagementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default MenuManagementPage;
```

---

## Edit 2: Create CreditManagementPage.jsx

**File:** `pages/CreditManagementPage.jsx` — **NEW**

```jsx
import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import CreditManagementPanel from "../components/panels/CreditManagementPanel";

// CR-041: Credit Management as full-page route (was panel overlay)
const CreditManagementPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="credit-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <CreditManagementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default CreditManagementPage;
```

---

## Edit 3: Create DayClosurePage.jsx

**File:** `pages/DayClosurePage.jsx` — **NEW**

```jsx
import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import SettlementPanel from "../components/panels/SettlementPanel";

// CR-041: Day Closure (renamed from Settlement) as full-page route
const DayClosurePage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="day-closure-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <SettlementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default DayClosurePage;
```

---

## Edit 4: Create SettingsPage.jsx

**File:** `pages/SettingsPage.jsx` — **NEW**

```jsx
import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import SettingsPanel from "../components/panels/SettingsPanel";

// CR-041: Settings as full-page route (was hidden panel overlay)
const SettingsPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="settings-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <SettingsPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default SettingsPage;
```

---

## Edit 5: App.js — Add new routes

**File:** `App.js`
**Lines affected:** After line 139 (before `</Routes>`)
**Imports to add:** 4 new page imports (after line 47)

**Add imports:**
```js
import MenuManagementPage from "./pages/MenuManagementPage";       // CR-041
import CreditManagementPage from "./pages/CreditManagementPage";   // CR-041
import DayClosurePage from "./pages/DayClosurePage";               // CR-041
import SettingsPage from "./pages/SettingsPage";                   // CR-041
```

**Add routes** (after restaurant-settings route, before `</Routes>`):
```jsx
{/* CR-041: Panel → Route migrations */}
<Route path="/menu" element={<ProtectedRoute><MenuManagementPage /></ProtectedRoute>} />
<Route path="/credit" element={<ProtectedRoute><CreditManagementPage /></ProtectedRoute>} />
<Route path="/day-closure" element={<ProtectedRoute><DayClosurePage /></ProtectedRoute>} />
<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
```

---

## Edit 6: Sidebar.jsx — Rewrite menu data + handlers

**File:** `components/layout/Sidebar.jsx`

### 6a. SIDEBAR_PERMISSIONS (line 39-49) — update:
```js
const SIDEBAR_PERMISSIONS = {
  dashboard: 'pos',
  'day-closure': 'pos',               // CR-041: renamed from settlement
  'menu-management': 'menu',
  credit: 'pos',                       // CR-041: was missing
  reports: 'report',
  settings: 'restaurant_settings',     // CR-041: now visible
  insights: 'report',                  // CR-041: added
};
```

### 6b. COMING_SOON_ITEMS (line 52) — update:
```js
const COMING_SOON_ITEMS = new Set([]);  // CR-041: employees/expenses/inventory removed
```

### 6c. sidebarMenuItems[] (lines 55-216) — FULL REWRITE:
```js
const sidebarMenuItems = [
  // CR-041: Full sidebar restructure
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HomeIcon,
    path: "/dashboard",
  },
  {
    id: "day-closure",
    label: "Day Closure",
    icon: Banknote,
    path: "/day-closure",
  },
  {
    id: "menu-management",
    label: "Menu Management",
    icon: UtensilsCrossed,
    path: "/menu",
  },
  {
    id: "credit",
    label: "Credit Management",
    icon: Wallet,
    path: "/credit",
  },
  {
    id: "reports",
    label: "Daily Report",
    icon: BarChart3,
    children: [
      { id: "summary", label: "Sales Summary", path: "/reports/summary" },
      { id: "audit", label: "Order Report", path: "/reports/audit" },
      { id: "item-report", label: "Item Report", comingSoon: true },
      { id: "insights-settlement", label: "Settlement Report", path: "/reports-module/settlement" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      { id: "restaurant-setup", label: "Restaurant Setup", path: "/restaurant-settings" },
      { id: "table-management", label: "Table Management", comingSoon: true },
      { id: "printers", label: "Printers", comingSoon: true },
      { id: "operating-hours", label: "Operating Hours", comingSoon: true },
      { id: "cancellation-reasons", label: "Cancellation Reasons", comingSoon: true },
      { id: "employee-management", label: "Employee Management", comingSoon: true },
      { id: "dashboard-display", label: "Dashboard Display", path: "/visibility/status-config" },
      { id: "all-settings", label: "All Settings", path: "/settings" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: LineChart,
    children: [
      // ... (UNCHANGED — keep existing 26+ children exactly as-is)
    ],
  },
];
```

**NOTE on Settings children with `comingSoon: true`:** These are placeholders. Table Management, Printers, Operating Hours, Cancellation Reasons, Employee Management — the tiles exist in the Settings Panel but don't have individual routes yet. Clicking them will show "Coming Soon" toast until we wire deep-linking into SettingsPanel (e.g., `/settings?tile=table-management`). This is flagged as **OPEN GAP: OG-CR041-SETTINGS-DEEPLINK**.

**NOTE on `item-report`:** Placeholder with `comingSoon: true` until owner specifies content. Flagged as **OPEN GAP: OG-CR041-ITEM-REPORT**.

### 6d. VISIBLE_SECTIONS (line 289) — update:
```js
const VISIBLE_SECTIONS = new Set(['dashboard', 'day-closure', 'menu-management', 'credit', 'reports', 'settings', 'insights']);
```

### 6e. Remove onOpen props from component declaration (lines 222-225):
Remove `onOpenSettings`, `onOpenMenu`, `onOpenCredit`, `onOpenSettlement` from the destructured props.

### 6f. Remove special-case handlers in handleItemClick (lines 318-341):
Remove the 4 `if (item.id === 'settings/menu-management/credit/settlement')` blocks that call `onOpen*()`. These items now have `path` properties and will use the standard `navigate(item.path)` flow.

### 6g. Add handleChildClick support for 'reports' children update:
The `handleChildClick` for `parentId === 'reports'` needs to whitelist the new children:
```js
if (parentId === 'reports') {
  if (child.comingSoon) {
    showComingSoon(child.label);
    return;
  }
  setActiveItem(child.id);
  saveScroll(); // BUG-136
  navigate(child.path);
  return;
}
```

### 6h. Add handleChildClick support for 'settings' parent:
```js
if (parentId === 'settings') {
  if (child.comingSoon) {
    showComingSoon(child.label);
    return;
  }
  setActiveItem(child.id);
  saveScroll(); // BUG-136
  navigate(child.path);
  return;
}
```

---

## Edit 7: DashboardPage.jsx — Remove panel mounts

**File:** `pages/DashboardPage.jsx`

### 7a. Remove imports (lines 12-15):
```
- import SettingsPanel from "../components/panels/SettingsPanel";
- import MenuManagementPanel from "../components/panels/MenuManagementPanel";
- import CreditManagementPanel from "../components/panels/CreditManagementPanel";
- import SettlementPanel from "../components/panels/SettlementPanel";
```

### 7b. Remove state variables (lines 436-439):
```
- const [isSettingsOpen, setIsSettingsOpen] = useState(false);
- const [isMenuOpen, setIsMenuOpen] = useState(false);
- const [isCreditOpen, setIsCreditOpen] = useState(false);
- const [isSettlementOpen, setIsSettlementOpen] = useState(false);
```

### 7c. Remove onOpen props from Sidebar (lines 1586-1589):
```
- onOpenSettings={() => setIsSettingsOpen(true)}
- onOpenMenu={() => setIsMenuOpen(true)}
- onOpenCredit={() => setIsCreditOpen(true)}
- onOpenSettlement={() => setIsSettlementOpen(true)}
```

### 7d. Remove panel mounts (lines 1605-1627):
```
- <SettingsPanel isOpen={isSettingsOpen} onClose={...} sidebarWidth={...} />
- <MenuManagementPanel isOpen={isMenuOpen} onClose={...} sidebarWidth={...} />
- <CreditManagementPanel isOpen={isCreditOpen} onClose={...} sidebarWidth={...} />
- <SettlementPanel isOpen={isSettlementOpen} onClose={...} sidebarWidth={...} />
```

---

## Open Gaps (flagged per owner instruction)

| Gap ID | Description | Blocker? |
|---|---|---|
| **OG-CR041-SETTINGS-DEEPLINK** | Settings children (Table Mgmt, Printers, Operating Hours, Cancellation Reasons, Employee Mgmt) show "Coming Soon" instead of deep-linking into SettingsPanel tiles. Needs `/settings?tile=X` routing or separate page wrappers per tile. | NO — All Settings link opens full panel |
| **OG-CR041-ITEM-REPORT** | Item Report under Daily Report — owner to specify content/screen | NO — placeholder with Coming Soon |
| **OG-CR041-EMPLOYEE-MGMT** | Employee Management — owner to provide endpoint | NO — placeholder with Coming Soon |
| **OG-CR041-OPERATING-HOURS-WRITE** | Operating Hours edit form in Settings Panel has no save API wired. Write endpoint needs identification. | NO — read works, edit is cosmetic |
| **OG-CR041-DAILY-ROOM-REPORT** | Daily Room Report (`/reports/rooms`) — removed from sidebar in restructure. Owner to confirm if needed elsewhere. | LOW — route still works if navigated directly |
| **OG-CR041-SCREEN-MOCKUPS** | New page wrappers (MenuManagementPage, CreditManagementPage, DayClosurePage, SettingsPage) may need design review for layout/back-navigation UX. | NO — functional first, polish later |

---

## Verification Matrix

| # | Check | How to Verify | Automated? |
|---|---|---|---|
| V1 | Dashboard loads | Login → dashboard renders | NO (screenshot) |
| V2 | Day Closure opens at `/day-closure` | Click "Day Closure" in sidebar → SettlementPanel renders as full page | NO |
| V3 | Menu Management opens at `/menu` | Click "Menu Management" → MenuManagementPanel renders as full page | NO |
| V4 | Credit Management opens at `/credit` | Click "Credit Management" → CreditManagementPanel renders as full page | NO |
| V5 | Settings opens at `/settings` | Click "All Settings" under Settings → SettingsPanel 12 tiles render | NO |
| V6 | Daily Report children work | Sales Summary → `/reports/summary`, Order Report → `/reports/audit`, Settlement Report → `/reports-module/settlement` | NO |
| V7 | Settings children: Restaurant Setup | Click → `/restaurant-settings` → 6-step wizard loads | NO |
| V8 | Settings children: Dashboard Display | Click → `/visibility/status-config` → StatusConfigPage loads | NO |
| V9 | Settings children: Coming Soon items | Click Table Mgmt/Printers/etc. → toast "Coming Soon" | NO |
| V10 | Item Report shows Coming Soon | Click Item Report → toast | NO |
| V11 | Sidebar scroll preserved (BUG-136) | Navigate between items → scroll position maintained | NO |
| V12 | Browser back button | Navigate to `/menu` → back → returns to previous page | NO |
| V13 | Deep link works | Direct URL `/credit` → loads Credit Management page | NO |
| V14 | Sidebar order correct | Visual check — Dashboard, Day Closure, Menu, Credit, Daily Report, Settings, Insights | NO (screenshot) |
| V15 | Labels renamed correctly | "Day Closure", "Daily Report", "Sales Summary", "Order Report" | NO (screenshot) |
| V16 | DashboardPage no panel overlays | Click sidebar items → no panels open on dashboard | NO |
| V17 | Insights still last | Scroll sidebar → Insights at bottom | NO |
| V18 | Webpack compiles | 0 new warnings | YES |
| V19 | No console errors | Navigate all new routes → 0 errors | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-041 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: 7 files listed (3 modified + 4 new)
- [ ] Code markers: // CR-041 in every modified/new file
- [ ] OPEN_GAPS_REGISTER.md: 6 gaps filed (OG-CR041-*)
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| 40+ report screens pass `onOpen*` props to Sidebar | LOW | LOW | Sidebar ignores unknown props (React standard). Verify no destructure errors. |
| Panel components expect `onClose` to set state | LOW | LOW | Wrappers provide `onClose={() => window.history.back()}` — navigates back instead |
| Dashboard sockets when navigating away | LOW | MEDIUM | Same pattern as Insights (proven). Dashboard re-mounts on return → sockets reconnect. |
| Settlement Report outside InsightsCacheProvider | NONE | — | Route stays at `/reports-module/settlement` — inside provider in App.js |
| Settings Panel tile shortcuts non-functional | NONE | LOW | "Coming Soon" toast — full panel available via "All Settings" |

---

## Handover

Plan ready. 7 files (3 modified + 4 new). ~150 lines new + ~60 lines removed.
- Code Reality: NONE
- Scope: Sidebar.jsx, DashboardPage.jsx, App.js + 4 new page wrappers
- Verification: 19 checks (1 automated, 18 manual)
- Open Gaps: 6 filed (non-blocking)
- Owner decisions: Q-041-1 (Item Report), Q-041-2 (Employee endpoint), Q-041-5 (Operating Hours write)
- **Awaiting Gate 4 GO.**

---

*Planning complete for CR-041. "Reorder, rename, route, restructure."*
