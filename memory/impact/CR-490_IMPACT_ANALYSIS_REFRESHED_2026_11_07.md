# CR-490 — Impact Analysis (Gate 2) — REFRESHED 2026-11-07

**ID:** CR-490
**Type:** CR
**Gate:** 2 — Impact Analysis (REFRESH — previous IA stale due to extensive codebase changes)
**Role:** PLANNING
**Date:** 2026-11-07
**Risk:** HIGH (permissions/security)
**Code Reality:** NONE — no `show_daily_report` logic exists anywhere in FE codebase

---

## 1. Code Reality Check

```bash
grep -rn "daily_report\|show_daily_report\|dailyReport" /app/frontend/src/ --include="*.js" --include="*.jsx"
```
Result: Zero hits for permission logic. Only `daily_reports` (plural) appears in `reportService.js` and `OrderReportBetaPage.jsx` as API response field names — unrelated.

**Code Reality: NONE** — proceed with full plan.

---

## 2. Conflict Pre-Check (verified at HEAD 2026-11-07)

| File | Last Modified By | Our Change Area | Conflict? |
|------|-----------------|-----------------|-----------|
| `Sidebar.jsx` (928 lines) | CR-435 (L123 inventory), BUG-555 (tablet), BUG-568 (L525 h-100dvh), CR-415 (L101/117/205/217/236 comingSoon removal) | L41-50 (SIDEBAR_PERMISSIONS) + L358-366 (filter) + L93-109 (reports children) | **NO** — different line ranges |
| `App.js` | CR-385 (L272 PMS routes) | Report routes L170-241 | **NO** — different route blocks |
| `permissionCatalog.js` | Initial creation (CR-069) | Add entry to reports group (L94-107) | **NO** — no recent changes |
| `AuthContext.jsx` | No recent changes to hasPermission | No change needed — `hasAnyPermission` already exists at L63 | **NO** |

**No conflicts detected.**

---

## 3. Data Flow Trace (current state)

```
API: GET all-role-list → role_modules.frontend[] includes { role_pass_value: "show_daily_report" }
  ↓
Login: GET login → response.role = ["pos", "order", "show_daily_report", ...]
  ↓
profileTransform.js:80 → permissions: api.role || []   (pass-through, no mapping needed)
  ↓
AuthContext.jsx:59 → hasPermission('show_daily_report') = permissions.includes('show_daily_report')
AuthContext.jsx:63 → hasAnyPermission(['report', 'show_daily_report']) = .some(p => permissions.includes(p))
  ↓
Sidebar.jsx:364 → const perm = SIDEBAR_PERMISSIONS[item.id]   // currently returns STRING 'report'
Sidebar.jsx:366 → return hasPermission(perm)                   // fails for show_daily_report user
  ↓ ← BREAK POINT 1: perm is string, not array — can't check alternative permission
User with only 'show_daily_report' → hasPermission('report') = false → entire Reports section HIDDEN
  ↓
Sidebar.jsx:136 → insights section → SIDEBAR_PERMISSIONS.insights = 'report'
  ↓ ← BREAK POINT 2: Insights also gated by 'report' — correctly hidden for show_daily_report user ✓
  ↓
App.js routes → ProtectedRoute only checks isAuthenticated (L12-36) — NO permission check
  ↓ ← BREAK POINT 3: user can type /reports-module/profit-loss directly and access it
```

### Break Points Summary

| # | Location | Problem | Fix |
|---|----------|---------|-----|
| BP-1 | Sidebar.jsx L364-366 | `SIDEBAR_PERMISSIONS.reports` = string `'report'` — no alternative permission check | Change to array `['report', 'show_daily_report']` + update filter to handle arrays |
| BP-2 | Sidebar.jsx L93-109 | `reports` children — all 11 items visible to anyone with Reports access | Filter children: user with only `show_daily_report` sees only `audit` (Order Report) item |
| BP-3 | App.js L170-241 | `ProtectedRoute` is auth-only — no per-report permission guard | Add permission-aware wrapper for report routes |

---

## 4. Proposed Solution

### E-1: `Sidebar.jsx` L47 — SIDEBAR_PERMISSIONS.reports accepts alternative
```javascript
// BEFORE (L47):
reports: 'report',

// AFTER:
reports: ['report', 'show_daily_report'],  // CR-490: either grants section access
```

### E-2: `Sidebar.jsx` L364-366 — Filter supports array-of-permissions
```javascript
// BEFORE (L364-366):
const perm = SIDEBAR_PERMISSIONS[item.id];
if (!perm) return true;
return hasPermission(perm);

// AFTER:
const perm = SIDEBAR_PERMISSIONS[item.id];
if (!perm) return true;
if (Array.isArray(perm)) return hasAnyPermission(perm); // CR-490
return hasPermission(perm);
```
**NOTE:** `hasAnyPermission` already exists in `AuthContext.jsx:63` — no new utility needed. Just need to destructure it from `useAuth()` at L263.

### E-3: `Sidebar.jsx` L93-109 — Children filter for daily-report-only users
After the `visibleMenuItems` filter, when rendering `reports` section children, filter based on permission:
- User with `report` → all children visible (existing behaviour)
- User with only `show_daily_report` → only `{ id: "audit" }` (Order Report at `/reports/audit`) visible

Implementation: add a children filter function inside the render logic for sections with `children`.

### E-4: `App.js` — Route guards for report pages
Create a `PermissionRoute` wrapper (or inline guard) that checks:
- `/reports/audit` → requires `report` OR `show_daily_report`
- All other `/reports/*` and `/reports-module/*` routes → requires `report`
- Redirect unauthorized users to `/dashboard`

Two options:
- **Option A (recommended):** New small `PermissionRoute` component alongside `ProtectedRoute`
- **Option B:** Inline `Navigate` redirects using `usePermission` hook in each page

### E-5: `permissionCatalog.js` L94-107 — Add `show_daily_report` to reports group
```javascript
// Add to permissions array in the 'reports' group:
{ key: 'show_daily_report', label: 'Daily Report Only', desc: 'Access only the Sales Summary (Daily Report) screen' },
```
This makes the permission visible and toggleable in the Employee Management → Role form.

---

## 5. Affected Files + Lines

| # | File | Line(s) | Change Description | Risk |
|---|------|---------|-------------------|------|
| E-1 | `components/layout/Sidebar.jsx` | L47 | `reports: 'report'` → `reports: ['report', 'show_daily_report']` | LOW |
| E-2 | `components/layout/Sidebar.jsx` | L263 + L364-366 | Destructure `hasAnyPermission` + array-aware filter | MEDIUM |
| E-3 | `components/layout/Sidebar.jsx` | L93-109 area (render logic) | Children filter: `show_daily_report`-only users see only `summary` | MEDIUM |
| E-4a | `components/guards/PermissionRoute.jsx` | NEW FILE | Permission-checking route wrapper (extends ProtectedRoute pattern) | MEDIUM |
| E-4b | `App.js` | L170-241 | Wrap report routes with `PermissionRoute` (required: `report`, except `/reports/summary` which accepts either) | HIGH |
| E-5 | `constants/permissionCatalog.js` | L94-107 | Add `show_daily_report` entry to reports group | LOW |

**Total: 5 edits across 4 files (3 existing + 1 new)**

---

## 6. Downstream Consumers

- **profileTransform.js:80** — no change needed. `permissions: api.role || []` already passes through any backend permission key including `show_daily_report`.
- **AuthContext.jsx** — no change needed. `hasPermission` and `hasAnyPermission` both work as-is.
- **employeeService.js** — no change needed. Role create/update sends `modules: [...]` array which already includes whatever keys are checked in the UI.
- **Socket / real-time** — not affected. Permissions are login-time only.
- **No report API changes** — backend already accepts `show_daily_report` in role modules.

---

## 7. What We Do NOT Touch

- `profileTransform.js` — pass-through already works
- `AuthContext.jsx` — `hasAnyPermission` already exists
- `employeeService.js` — already handles dynamic permission keys
- `reportService.js` — API calls unchanged
- Any report page component — no page-level changes
- `OrderSummaryPage.jsx` (the Daily Report screen) — no changes
- Insights section — correctly hidden via `SIDEBAR_PERMISSIONS.insights = 'report'` (not `show_daily_report`)

---

## 8. Risk Classification

**HIGH** — permissions and route access are security-sensitive. Not financial but a wrong implementation could expose reports to unauthorized users or block authorized users.

Cannot Fast Lane — 4 files, array-to-permission pattern change, new guard component.

---

## 9. Owner Decisions (all previously closed — confirmed still valid)

| OD | Decision | Still Valid? |
|----|----------|:---:|
| OD-490-01 | One key: `show_daily_report` | ✅ |
| OD-490-02 | **REVISED:** Order Report screen only (= `/reports/audit` = `AllOrdersReportPage`). NOT Sales Summary. Day Closure out of scope. | ✅ UPDATED 2026-11-07 |
| OD-490-03 | Route guard blocks direct URL access | ✅ |
| OD-490-04 | Backend key = `show_daily_report` (module ID 106) | ✅ |
| All tabs visible + Excel/PDF export | ✅ |
| Insights section hidden | ✅ (inherits from `insights: 'report'` — no change needed) |

**No new owner decisions needed.**

---

## 9b. R11 Probe Results (2026-11-07)

**Probe DONE.** Evidence at `evidence/CR-490/R11_PROBE_2026_11_07.md`.

| Check | Result |
|-------|--------|
| Login `show_daily_report` in permissions | ✅ CONFIRMED (owner@cafe103.com, 51 perms) |
| `show_daily_report` in role module catalog | ✅ CONFIRMED (ID 106, role_for: `frontend`, created 2026-11-06) |
| `profileTransform.js` pass-through | ✅ Works — uses `api.permissions \|\| api.role \|\| []` |
| `hasPermission('show_daily_report')` | ✅ Would work — simple `permissions.includes()` |
| FE `permissionCatalog.js` entry | ❌ MISSING — needs E-5 |
| Backend blockers | ✅ NONE — fully ready |

**Key:** `show_daily_report` · **Module ID:** 106 · **Backend category:** `frontend`

---

## 10. Verification Matrix

| # | Check | Method | Automated? |
|---|-------|--------|:---:|
| V-1 | `show_daily_report` visible in role permission form | Browser: Employee Mgmt → Create Role | NO |
| V-2 | User with `show_daily_report` only → sees "Daily Report" section with only "Order Report" child | Browser: login as test user | NO |
| V-3 | User with `show_daily_report` only → Insights section hidden | Browser: check sidebar | NO |
| V-4 | User with `show_daily_report` only → typing `/reports-module/profit-loss` redirects to `/dashboard` | Browser: type URL directly | NO |
| V-5 | User with `show_daily_report` only → `/reports/audit` (Order Report) loads successfully | Browser: navigate | NO |
| V-6 | User with `report` → full access unchanged (all reports + insights visible) | Browser: login as manager | NO |
| V-7 | User with both `report` + `show_daily_report` → full access | Browser: login | NO |
| V-8 | Compile clean | `webpack` | YES |
| V-9 | Sidebar children count correct for `show_daily_report` user (1 item: Order Report only) | Code inspection | YES |

---

## 11. Post-Code Registry Checklist

```
- [ ] registry.json: CR-490 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: Sidebar.jsx, App.js, PermissionRoute.jsx, permissionCatalog.js listed
- [ ] Code markers: // CR-490 comment in every modified file
```
