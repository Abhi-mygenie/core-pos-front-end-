# CR-041 — Amended Impact Analysis (Gate 2)

**ID:** CR-041
**Role:** PLANNING agent (Gate 2 only)
**Date:** 2026-06-17
**Code Reality:** NONE — no migration code exists
**Conflict Pre-Check:** CLEAR — no open item touches Sidebar structure or DashboardPage panel mounts
**Risk:** MEDIUM

---

## 1. Current Sidebar Structure (as-is)

```
VISIBLE_SECTIONS: dashboard, reports, insights, credit, settlement, restaurant-setup, menu-management, visibility-settings

sidebarMenuItems[] order:
  1. Dashboard              → /dashboard (route)
  2. Orders                 → hidden (not in VISIBLE_SECTIONS, children=[])
  3. Order Reports          → parent with 3 children (routes)
       ├── Daily Report     → /reports/audit
       ├── Daily Summary    → /reports/summary
       └── Daily Room Report → /reports/rooms
  4. Insights               → parent with 26+ children (routes)
       ├── Dashboard, Settlement, Sales group, Items group, ...
  5. Credit Management      → panel overlay (onOpenCredit)
  6. Settlement             → panel overlay (onOpenSettlement), has path="/settlement" but handler overrides
  7. Restaurant Setup       → /restaurant-settings (route)
  8. Menu Management        → panel overlay (onOpenMenu), has fake children (categories/items/modifiers/pricing/images)
  9. Visibility Settings    → parent, child: Status Configuration → /visibility/status-config
  10. Employees             → Coming Soon (hidden)
  11. Expenses              → Coming Soon (hidden)
  12. Inventory             → Coming Soon (hidden)
  13. Settings              → hidden (not in VISIBLE_SECTIONS), has 6 children (none wired)
```

### Panel overlays (mounted in DashboardPage.jsx):
| Panel | State var | Sidebar handler | Mount line |
|---|---|---|---|
| SettingsPanel | isSettingsOpen | onOpenSettings | L1605-1609 |
| MenuManagementPanel | isMenuOpen | onOpenMenu | L1611-1615 |
| CreditManagementPanel | isCreditOpen | onOpenCredit | L1617-1621 |
| SettlementPanel | isSettlementOpen | onOpenSettlement | L1623-1627 |

---

## 2. Target Sidebar Structure (owner-confirmed)

```
  1. Dashboard              → /dashboard (route, unchanged)
  2. Day Closure            → /day-closure (NEW route, RENAMED from "Settlement")
  3. Menu Management        → /menu (panel → route)
  4. Credit Management      → /credit (panel → route)
  5. Daily Report           → parent (RENAMED from "Order Reports")
       ├── Sales Summary    → /reports/summary (RENAMED from "Daily Summary")
       ├── Order Report     → /reports/audit (RENAMED from "Daily Report")
       ├── Item Report      → TBD (NEW — owner to specify)
       └── Settlement Report → /reports-module/settlement (MOVED from Insights)
  6. Settings               → /settings (NEW parent, panel → route)
       ├── Restaurant Setup → /restaurant-settings (MOVED from top-level)
       ├── Table Management → Settings Panel tile
       ├── Printers         → Settings Panel tile
       ├── Operating Hours  → Settings Panel tile
       ├── Cancellation Reasons → Settings Panel tile
       ├── Employee Management → TBD (NEW — owner to provide endpoint)
       ├── Dashboard Display → /visibility/status-config (MOVED from "Visibility Settings")
       └── All Settings     → Settings Panel (12 tiles)
  7. Insights               → parent with 26 children (LAST, unchanged internally)
```

---

## 3. Investigation Results

### 3a. Operating Hours
- **Read API:** YES — `restaurant.schedules` from profile API (`profileTransform.js:208`). Fields: `opening_time`, `closing_time` per day.
- **Write API:** NOT in Restaurant Settings API (`settings-list`/`update-settings` — covers basic/advanced/vendor only, no schedules). **Owner confirms a separate endpoint exists in the restaurant settings API family** — needs to be identified and wired.
- **Settings Panel tile:** OperatingHoursView reads `restaurant.schedules` from context. **Edit form is a DUMMY** — `onSave={handleBack}` does nothing. No save API call wired.
- **Restaurant Setup wizard:** Does NOT include operating hours in its 6 steps.
- **Verdict:** Read works. Write endpoint needs to be identified from backend. Settings Panel edit UI exists but save is not functional. This is a **gap to be wired** — not a new screen build, but an API integration task.

### 3b. Cancellation Reasons
- **API exists:** YES — `CANCELLATION_REASONS: '/api/v1/vendoremployee/cancellation-reasons'` (constants.js:82)
- **Loaded by:** Settings context (`useSettings().cancellationReasons`) at boot (constants.js:298)
- **Settings Panel tile:** CancellationReasonsView — full CRUD list (view/add/edit with reasonText, applicableTo, isActive)
- **Also used by:** insightsService.js for cancellation report reason lookups
- **Verdict:** Endpoint exists and is already wired. Can be exposed as direct sidebar shortcut under Settings. No new endpoint needed.

### 3c. Settlement Report Route
- **Current route:** `/reports-module/settlement` → `SettlementReportMockup` (inside InsightsCacheProvider)
- **Current sidebar location:** Insights → first child after Dashboard (`insights-settlement`)
- **Move target:** Under "Daily Report" children
- **Impact:** Route stays the same (`/reports-module/settlement`). Only sidebar placement changes. The page still needs InsightsCacheProvider wrapping — verify it's available outside `/reports-module/*` route or keep the route path as-is.
- **Verdict:** Safest approach — keep route at `/reports-module/settlement`, just change sidebar entry from Insights children to Daily Report children. Zero route changes needed.

### 3d. Menu Management Children
- **Current:** Has fake children (categories/items/modifiers/pricing/images) but handler overrides with `onOpenMenu()` → opens panel
- **Target:** Direct `navigate('/menu')` opens full-page route. Remove fake children.
- **MenuManagementPanel** internally manages its own tab navigation (categories, items, etc.)

### 3e. Settings Panel 12 Tiles — All Have APIs
All 12 tiles in the Settings Panel are backed by existing APIs loaded at boot via the Settings context. No new endpoints needed for any shortcut.

---

## 4. Affected Files

### Core changes (3 files MODIFIED):

| File | Lines | Change | Risk |
|---|---|---|---|
| **Sidebar.jsx** | ~700 | Rewrite `sidebarMenuItems[]` array (new order, renames, new children structure). Remove `onOpenMenu/Credit/Settlement/Settings` props and special-case handlers. Update `VISIBLE_SECTIONS`. Update `COMING_SOON_ITEMS`. | MEDIUM |
| **DashboardPage.jsx** | ~1630 | Remove 4 panel imports, 4 state vars, 4 `onOpen*` props to Sidebar, 4 panel mounts. ~40 lines removed. | LOW (subtractive) |
| **App.js** | ~140 | Add 3 new routes: `/menu`, `/credit`, `/day-closure`. Update `/settings` route. | LOW |

### New files (4 page wrappers, ~30 lines each):

| File | Purpose |
|---|---|
| **pages/MenuManagementPage.jsx** | Full-page wrapper: Sidebar + MenuManagementPanel with `isOpen={true}` |
| **pages/CreditManagementPage.jsx** | Full-page wrapper: Sidebar + CreditManagementPanel |
| **pages/DayClosurePage.jsx** | Full-page wrapper: Sidebar + SettlementPanel (renamed "Day Closure") |
| **pages/SettingsPage.jsx** | Full-page wrapper: Sidebar + SettingsPanel (12 tiles) |

### Files NOT changed:
- 40+ report screens (import Sidebar but `onOpen*` props become unused/ignored)
- All Insights screens (no change)
- Settings Panel component (no change — just wrapped differently)
- MenuManagementPanel, CreditManagementPanel, SettlementPanel (no change)
- StatusConfigPage (no change — route stays `/visibility/status-config`)
- RestaurantSettingsPage (no change — route stays `/restaurant-settings`)
- All API services, transforms, contexts (no change)

---

## 5. Sidebar Data Changes Detail

### sidebarMenuItems[] — BEFORE → AFTER

| # | BEFORE (id / label) | AFTER (id / label) | Change Type |
|---|---|---|---|
| 1 | dashboard / "Dashboard" | dashboard / "Dashboard" | unchanged |
| 2 | orders / "Orders" (hidden) | **REMOVED** | remove |
| 3 | — | **day-closure / "Day Closure"** | NEW (was settlement) |
| 4 | — | **menu-management / "Menu Management"** | MOVED up, panel→route |
| 5 | — | **credit / "Credit Management"** | MOVED up, panel→route |
| 6 | reports / "Order Reports" | **reports / "Daily Report"** | RENAMED |
| 6a | audit / "Daily Report" | **audit / "Order Report"** | RENAMED |
| 6b | summary / "Daily Summary" | **summary / "Sales Summary"** | RENAMED |
| 6c | rooms / "Daily Room Report" | **REMOVED from here** | remove (or keep — owner to confirm) |
| 6d | — | **item-report / "Item Report"** | NEW (TBD) |
| 6e | — | **insights-settlement / "Settlement Report"** | MOVED from Insights |
| 7 | insights (position 4) | **MOVED to position 8 (LAST)** | reorder |
| 8 | credit (position 5) | **MOVED to position 5** | reorder + panel→route |
| 9 | settlement (position 6) | **→ day-closure at position 2** | rename + reorder + panel→route |
| 10 | restaurant-setup (position 7) | **MOVED under Settings children** | move |
| 11 | menu-management (position 8) | **MOVED to position 4** | reorder + panel→route |
| 12 | visibility-settings (position 9) | **MOVED under Settings as "Dashboard Display"** | move + rename |
| 13 | employees/expenses/inventory | **REMOVED** | remove (Coming Soon items gone) |
| 14 | settings (position 13, hidden) | **settings / "Settings" at position 7 (visible)** | unhide + restructure children |

### VISIBLE_SECTIONS — BEFORE → AFTER

```
BEFORE: dashboard, reports, insights, credit, settlement, restaurant-setup, menu-management, visibility-settings
AFTER:  dashboard, day-closure, menu-management, credit, reports, settings, insights
```

### COMING_SOON_ITEMS — BEFORE → AFTER

```
BEFORE: employees, expenses, inventory
AFTER:  (empty — or keep if employee-management is placeholder)
```

---

## 6. Downstream Impact

| Consumer | Impact | Risk |
|---|---|---|
| **40+ report screens** | Pass `onOpen*` props to Sidebar — those props will no longer exist. Sidebar ignores unknown props. **BUT:** Some screens explicitly destructure/pass these. Need to verify. | LOW — props become no-ops |
| **BUG-136 scroll restore** | `useSidebarScroll` hook + `saveScroll()` before navigate. New `navigate()` calls in Day Closure/Menu/Credit/Settings handlers MUST also call `saveScroll()`. | LOW — wire same pattern |
| **Socket reconnect** | Dashboard unmounts when navigating to `/menu`, `/credit`, `/day-closure`, `/settings`. Sockets reconnect on return. Same pattern as Insights pages (proven working). | LOW |
| **Browser back button** | IMPROVES — all items become real routes with URL history | POSITIVE |
| **Deep links** | IMPROVES — `/menu`, `/credit`, `/day-closure`, `/settings` become bookmarkable | POSITIVE |
| **Permissions** | `SIDEBAR_PERMISSIONS` map needs updating for new IDs (day-closure, settings) | LOW |
| **InsightsCacheProvider** | Settlement Report at `/reports-module/settlement` stays inside InsightsCacheProvider routes in App.js. No wrapping issue. | NONE |

---

## 7. Risks

| Risk | Level | Mitigation |
|---|---|---|
| `onOpen*` props passed by 40+ report screens | LOW | Sidebar ignores unknown props. Verify no screen destructures them. |
| Settings Panel expects `isOpen` + `onClose` + `sidebarWidth` | LOW | New SettingsPage wrapper provides these as constants |
| Settlement Report needs InsightsCacheProvider | NONE | Route stays at `/reports-module/settlement` — already inside provider |
| New page wrappers need Sidebar with correct active state | LOW | Each wrapper renders `<Sidebar />` — active item derived from URL (already works this way) |
| Permissions for new IDs | LOW | Add to SIDEBAR_PERMISSIONS map |
| Daily Room Report — keep or remove from Daily Report? | TBD | Owner to confirm |

---

## 8. Open Questions (for owner)

- **Q-041-1:** Item Report — what content/route?
- **Q-041-2:** Employee Management — endpoint?
- **Q-041-3:** Daily Room Report — keep under "Daily Report" children, or remove?
- **Q-041-4:** Settings children shortcuts (Table Mgmt, Printers, Operating Hours, Cancellation Reasons) — should these navigate to individual Settings Panel tiles (deep-link into SettingsPanel with `?tile=table-management`), or open as separate pages?
- **Q-041-5:** Operating Hours write endpoint — which backend API to call for saving schedule changes? Current UI has the form but save is not wired.

---

## 9. Summary

| Dimension | Value |
|---|---|
| **Files WILL change** | Sidebar.jsx, DashboardPage.jsx, App.js |
| **Files WILL create** | MenuManagementPage.jsx, CreditManagementPage.jsx, DayClosurePage.jsx, SettingsPage.jsx |
| **Files will NOT change** | 40+ report screens, all panels, all services, all transforms, all contexts |
| **Estimated scope** | ~150 lines new (4 wrappers + sidebar rewrite) + ~60 lines removed (DashboardPage panel cleanup) |
| **Risk** | MEDIUM |
| **Blockers** | None for core work. Q-041-1/2 are additive (can be added later). |
| **New endpoints needed** | Operating Hours write API needs identification. All other APIs exist. |

---

*Impact Analysis complete for CR-041 (amended). Awaiting owner review → Gate 3.*
