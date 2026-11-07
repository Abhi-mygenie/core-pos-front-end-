# CR-490 — Implementation Plan (Gate 3)

**ID:** CR-490
**Gate:** 3 — Implementation Plan
**Date:** 2026-11-07
**Risk:** HIGH (permissions/security)
**IA:** `impact/CR-490_IMPACT_ANALYSIS_REFRESHED_2026_11_07.md`

---

## Scope Lock

**Files WILL change:**
1. `src/components/layout/Sidebar.jsx` (3 edits: E-1, E-2, E-3)
2. `src/components/guards/PermissionRoute.jsx` (NEW — E-4a)
3. `src/components/guards/index.js` (1 edit — E-4b export)
4. `src/App.js` (1 edit — E-4c import + route wrapping)
5. `src/constants/permissionCatalog.js` (1 edit — E-5)

**Files will NOT touch:**
`profileTransform.js`, `AuthContext.jsx`, `employeeService.js`, `reportService.js`, `AllOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, any report page component.

---

## Execution Sequence

### E-1: `Sidebar.jsx` L47 — SIDEBAR_PERMISSIONS array support

**Current (L47):**
```javascript
  reports: 'report',
```

**Change to:**
```javascript
  reports: ['report', 'show_daily_report'],  // CR-490: either permission grants section access
```

**Why:** Allows users with EITHER `report` OR `show_daily_report` to see the "Daily Report" sidebar section. Currently only `report` works.

---

### E-2a: `Sidebar.jsx` L263 — Destructure `hasAnyPermission`

**Current (L263):**
```javascript
  const { user, logout: authLogout, hasPermission } = useAuth();
```

**Change to:**
```javascript
  const { user, logout: authLogout, hasPermission, hasAnyPermission } = useAuth(); // CR-490: array permission support
```

**Why:** `hasAnyPermission` already exists in AuthContext.jsx:63. We need it for the array check in E-2b.

---

### E-2b: `Sidebar.jsx` L364-366 — Array-aware filter

**Current (L364-366):**
```javascript
    const perm = SIDEBAR_PERMISSIONS[item.id];
    if (!perm) return true;
    return hasPermission(perm);
```

**Change to:**
```javascript
    const perm = SIDEBAR_PERMISSIONS[item.id];
    if (!perm) return true;
    if (Array.isArray(perm)) return hasAnyPermission(perm); // CR-490
    return hasPermission(perm);
```

**Why:** When `perm` is an array (like `['report', 'show_daily_report']`), check if user has ANY of them. Falls through to existing string check for all other sections.

---

### E-3: `Sidebar.jsx` L704 — Filter children for daily-report-only users

**Current (L704):**
```javascript
                  {item.children.map((child) => {
```

**Change to:**
```javascript
                  {(item.id === 'reports' && !hasPermission('report') && hasPermission('show_daily_report')
                    ? item.children.filter(c => c.id === 'audit') // CR-490: daily-report-only users see Order Report only
                    : item.children
                  ).map((child) => {
```

**Why:** When the user has `show_daily_report` but NOT `report`, only the Order Report child (`id: 'audit'`, path: `/reports/audit`) is shown. Users with `report` see all children unchanged.

---

### E-4a: NEW `src/components/guards/PermissionRoute.jsx`

**Create new file:**
```javascript
// CR-490: PermissionRoute — extends ProtectedRoute with permission check
// Wraps routes that require specific permissions beyond authentication.
// If user lacks the required permission, redirects to /dashboard.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const PermissionRoute = ({ children, requiredAny }) => {
  const { hasAnyPermission } = useAuth();

  // Wrap in ProtectedRoute first (handles auth + context hydration)
  return (
    <ProtectedRoute>
      <PermissionGate requiredAny={requiredAny} hasAnyPermission={hasAnyPermission}>
        {children}
      </PermissionGate>
    </ProtectedRoute>
  );
};

// Separate inner component — only renders after ProtectedRoute confirms auth + hydration
const PermissionGate = ({ children, requiredAny, hasAnyPermission }) => {
  if (requiredAny && !hasAnyPermission(requiredAny)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default PermissionRoute;
```

**Why:** `ProtectedRoute` only checks authentication, not permissions. We need a reusable guard that also checks permissions. The inner `PermissionGate` component ensures permission check runs AFTER auth + context hydration (otherwise `permissions` array would be empty during loading).

---

### E-4b: `src/components/guards/index.js` — Export PermissionRoute

**Current:**
```javascript
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as ErrorBoundary } from './ErrorBoundary';
```

**Change to:**
```javascript
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as PermissionRoute } from './PermissionRoute'; // CR-490
export { default as ErrorBoundary } from './ErrorBoundary';
```

---

### E-4c: `App.js` — Import PermissionRoute + wrap report routes

**E-4c-i: Import (L86)**

**Current (L86):**
```javascript
import { ProtectedRoute, ErrorBoundary } from "./components/guards";
```

**Change to:**
```javascript
import { ProtectedRoute, PermissionRoute, ErrorBoundary } from "./components/guards"; // CR-490
```

**E-4c-ii: Route for `/reports/audit` (L171)**

**Current (L171):**
```javascript
              <Route path="/reports/audit" element={<ProtectedRoute><AllOrdersReportPage /></ProtectedRoute>} />
```

**Change to:**
```javascript
              <Route path="/reports/audit" element={<PermissionRoute requiredAny={['report', 'show_daily_report']}><AllOrdersReportPage /></PermissionRoute>} /> {/* CR-490 */}
```

**Why:** Order Report is accessible to users with EITHER `report` OR `show_daily_report`.

**E-4c-iii: Route for `/reports/summary` (L173)**

**Current (L173):**
```javascript
              <Route path="/reports/summary" element={<ProtectedRoute><OrderSummaryPage /></ProtectedRoute>} />
```

**Change to:**
```javascript
              <Route path="/reports/summary" element={<PermissionRoute requiredAny={['report']}><OrderSummaryPage /></PermissionRoute>} /> {/* CR-490: report only */}
```

**Why:** Sales Summary requires full `report` permission — `show_daily_report` alone cannot access it.

**E-4c-iv: Route for `/reports/rooms` (L175)**

**Current (L175):**
```javascript
              <Route path="/reports/rooms" element={<ProtectedRoute><RoomOrdersReportPage /></ProtectedRoute>} />
```

**Change to:**
```javascript
              <Route path="/reports/rooms" element={<PermissionRoute requiredAny={['report']}><RoomOrdersReportPage /></PermissionRoute>} /> {/* CR-490: report only */}
```

**E-4c-v: All `/reports-module/*` routes (L177)**

**Current (L177):**
```javascript
              <Route path="/reports-module/*" element={<InsightsCacheProvider><Routes>
```

**Change to:**
```javascript
              <Route path="/reports-module/*" element={<PermissionRoute requiredAny={['report']}><InsightsCacheProvider><Routes> {/* CR-490: all insights/report-module require report */}
```

And the closing tag at L247:

**Current (L247):**
```javascript
              </Routes></InsightsCacheProvider>} />
```

**Change to:**
```javascript
              </Routes></InsightsCacheProvider></PermissionRoute>} />
```

**Why:** The entire `/reports-module/*` block (Insights, P&L, Consumption, etc.) requires full `report` permission. Wrapping the outer element guards ALL nested routes at once — no need to touch each individual route.

---

### E-5: `permissionCatalog.js` L103 — Add `show_daily_report`

**Current (L103):**
```javascript
      { key: 'wastage_report', label: 'Wastage Report', desc: 'Food wastage tracking' },
    ],
```

**Change to:**
```javascript
      { key: 'wastage_report', label: 'Wastage Report', desc: 'Food wastage tracking' },
      { key: 'show_daily_report', label: 'Daily Report Only', desc: 'Access only the Order Report screen (no other reports or insights)' }, // CR-490
    ],
```

**Why:** Makes `show_daily_report` visible and toggleable in Employee Management → Create/Edit Role form. Backend already has this key (module ID 106).

---

## Verification Matrix

| # | Check | Steps | Expected | Auto? |
|---|-------|-------|----------|:---:|
| V-1 | `show_daily_report` visible in role form | Employee Mgmt → Create Role → Reports group | New checkbox "Daily Report Only" | NO |
| V-2 | `show_daily_report`-only user → sidebar shows "Daily Report" with only "Order Report" child | Login as test user | 1 child item only | NO |
| V-3 | `show_daily_report`-only user → Insights hidden | Check sidebar | No Insights section | NO |
| V-4 | `show_daily_report`-only user → `/reports-module/profit-loss` redirects to `/dashboard` | Type URL | Redirect | NO |
| V-5 | `show_daily_report`-only user → `/reports/summary` redirects to `/dashboard` | Type URL | Redirect | NO |
| V-6 | `show_daily_report`-only user → `/reports/audit` loads OK | Navigate | Page renders | NO |
| V-7 | `report` user → full access unchanged | Login as manager | All reports + insights | NO |
| V-8 | User with both → full access | Login | All reports + insights | NO |
| V-9 | Compile clean | `webpack` | 0 new errors/warnings | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-490 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: Sidebar.jsx, App.js, PermissionRoute.jsx, permissionCatalog.js, guards/index.js
- [ ] Code markers: // CR-490 in every modified file
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| R-1: Array SIDEBAR_PERMISSIONS breaks other sections | Only `reports` is changed to array. `Array.isArray` check falls through for all other string entries. |
| R-2: PermissionRoute blocks during hydration | Inner PermissionGate runs AFTER ProtectedRoute confirms auth + isLoaded. |
| R-3: `/reports-module/*` wrapper breaks nested routes | Wrapping at the outer `<Route>` element level, inside the existing `<InsightsCacheProvider>`. Each inner route still uses individual `<ProtectedRoute>` for auth (now redundant but harmless). |
| R-4: Flyout sidebar (collapsed) also shows all children | L764 flyout render also uses `item.children.map` — needs same filter. |

### R-4 Fix: `Sidebar.jsx` L764 — Flyout children filter

**Current (L764):**
```javascript
            {flyoutItem.children.map((child) => {
```

**Change to:**
```javascript
            {(flyoutItem.id === 'reports' && !hasPermission('report') && hasPermission('show_daily_report')
              ? flyoutItem.children.filter(c => c.id === 'audit') // CR-490
              : flyoutItem.children
            ).map((child) => {
```

**This adds E-3b (1 additional edit, same file).**
