# CR-019 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-10
**CR:** CR-019 — Restaurant Settings Self-Onboarding Wizard

---

## 1. Module Mapping

### New Files (3)

| File | Purpose | Size Estimate |
|---|---|---|
| `frontend/src/pages/RestaurantSettingsPage.jsx` | Main wizard page — 6-step form, left-rail stepper, per-step validation, save logic | ~600-800 lines |
| `frontend/src/api/services/restaurantSettingsService.js` | GET `settings-list` + POST `update-settings` (multipart/form-data) | ~40-60 lines |
| `frontend/src/api/transforms/restaurantSettingsTransform.js` | API ↔ form data transform. Handle `"Yes"/"No"` ↔ `bool`, mixed types (`take_away` is bool, `dine_in` is "Yes"/"No"), multipart `data` JSON string construction | ~150-200 lines |

### Modified Files (3)

| File | Change | Lines Changed | Risk |
|---|---|---|---|
| `frontend/src/App.js` | Add `import RestaurantSettingsPage` + `<Route path="/restaurant-settings">` | +3 lines | **LOW** — additive, no existing routes affected |
| `frontend/src/components/layout/Sidebar.jsx` | Add `'restaurant-setup'` to `VISIBLE_SECTIONS` + new sidebar item entry + handle navigation | +5-8 lines | **LOW** — additive, existing items untouched |
| `frontend/src/api/constants.js` | Add 2 endpoint constants (`RESTAURANT_SETTINGS_LIST`, `RESTAURANT_SETTINGS_UPDATE`) | +2 lines | **ZERO** — additive only |

### Files NOT Changed (critical — no-touch list)

| File | Reason |
|---|---|
| `SettingsPanel.jsx` | Existing slide-over panel stays as-is for day-to-day settings |
| `SettingsContext.jsx` | No state overlap — wizard uses its own local state |
| `settingsService.js` | Different API endpoints (cancellation reasons vs restaurant config) |
| `settingsTransform.js` | Different data shape |
| `RestaurantContext.jsx` | Read-only consumer — wizard doesn't write to restaurant context |
| `DashboardPage.jsx` | Not touched |
| `OrderEntry.jsx` / `CartPanel.jsx` | Not touched |
| Any report page | Not touched |

---

## 2. API Integration Analysis

### GET settings-list
```
Endpoint: /api/v2/vendoremployee/restaurant-settings/settings-list
Auth: Bearer token (same as existing — axios interceptor handles it)
Response: { success: true, data: { basic, advanced, vendor } }
```
- **Already tested** with CAFE 103 (restaurant 644) — returns full data
- Uses existing `api` axios instance (auto-attaches Bearer token)
- No new auth requirement

### POST update-settings
```
Endpoint: /api/v2/vendoremployee/restaurant-settings/update-settings
Content-Type: multipart/form-data
Body:
  - data: JSON.stringify({ basic, advanced, vendor }) — all 3 sections
  - logo: File (optional)
  - pdf: File (optional)
```
- **Multipart/form-data** — different from most existing API calls (which are JSON)
- Need to use `FormData` + override `Content-Type` header
- Existing axios instance supports this (just set `Content-Type: multipart/form-data` per-request)

### Type Inconsistencies in API (TRANSFORM MUST HANDLE)

| Field | GET returns | POST expects | Transform needed |
|---|---|---|---|
| `advanced.dine_in` | `"Yes"` | `"Yes"` | None |
| `advanced.take_away` | `true` (boolean) | `true` (boolean) | None — but inconsistent with `dine_in` |
| `advanced.delivery` | `true` (boolean) | `true` (boolean) | Same as above |
| `basic.gst.status` | `1` (number) | `1` (number) | Form uses boolean → transform to 0/1 |
| `advanced.service_charge_percentage` | `"0.00"` (string) | `"0.00"` (string) | Form uses number → transform to string |
| `advanced.def_ord_status` | `2` (number) | `5` (number) | Direct pass-through |
| `advanced.search_by` | `["table no", "user id"]` (array) | `["table no", "user id"]` (array) | Direct pass-through |

**Key rule:** Transform layer must preserve exact types for POST — don't normalize `"Yes"/"No"` to booleans and back; keep them as strings.

---

## 3. State Impact

### Local State Only (no context pollution)
The wizard page manages all form state internally via `useState`. It does NOT write to:
- `RestaurantContext` — existing restaurant data stays untouched during editing
- `SettingsContext` — cancellation reasons / payment layout unaffected
- `AuthContext` — no auth changes
- `MenuContext` / `TablesContext` / `OrdersContext` — completely isolated

### Post-Save Behavior
After final "Save & Launch":
1. POST `update-settings` with full payload
2. On success: navigate to `/dashboard`
3. Restaurant data will refresh on next page load (existing `LoadingPage` flow re-fetches profile)
4. **No manual context refresh needed** — the existing flow handles it

### localStorage / sessionStorage
- **No new storage keys** — wizard does not persist partial progress
- If user navigates away mid-wizard, they lose unsaved changes (acceptable for v1)

---

## 4. Sidebar Integration

### Current State
- `settings` item exists in `sidebarMenuItems` (line 137) with children
- `settings` is **NOT** in `VISIBLE_SECTIONS` (line 221) — it's hidden
- Clicking `settings` triggers `onOpenSettings?.()` (opens SettingsPanel slide-over)

### Approach: New Top-Level Item
Add a new standalone sidebar item (like `settlement`) that navigates to `/restaurant-settings`:

```js
{
  id: "restaurant-setup",
  label: "Restaurant Setup",
  icon: Settings,  // or Building2 from lucide-react
  path: "/restaurant-settings",
}
```

- Add `'restaurant-setup'` to `VISIBLE_SECTIONS`
- Add `'restaurant_setup'` to `SIDEBAR_PERMISSIONS` (permission already exists in role array)
- `handleItemClick` falls through to default path navigation — no special handler needed

**Why not under existing Settings?** — Settings opens a panel, not a route. Mixing panel-open + route-navigation under one parent would require refactoring the click handler. Separate top-level item is cleaner and zero-regression.

---

## 5. Regression Risk Assessment

| Area | Risk | Justification |
|---|---|---|
| **Existing Settings panel** | **ZERO** | Not modified — separate panel, separate service, separate context |
| **Dashboard / Order flow** | **ZERO** | No shared files, no shared state |
| **Reports** | **ZERO** | No shared files |
| **Login / Auth** | **ZERO** | Uses existing auth token, no auth changes |
| **Sidebar** | **LOW** | Additive — new item in array + new ID in VISIBLE_SECTIONS |
| **Routes (App.js)** | **LOW** | Additive — new Route, no existing routes changed |
| **API layer** | **LOW** | New service file, new constants — no existing services modified |

**Overall regression risk: LOW.** CR-019 is a fully additive module with no modifications to existing business logic.

---

## 6. Cross-CR Conflicts

| CR | Conflict? | Detail |
|---|---|---|
| CR-014 (Menu Management) | **NONE** | Different panel, different APIs |
| CR-015 (Settlement) | **NONE** | Different panel, different APIs |
| CR-017 (WhatsApp Payment) | **NONE** | Different feature, no file overlap |
| CR-018 (Schedule Order) | **NONE** | Different feature, no file overlap |
| BUG-120 (Menu Bugs) | **NONE** | Different files |

**Sidebar.jsx** is the only file touched by multiple CRs, but CR-019 changes are purely additive (new array entry + new Set member). No merge conflict risk.

---

## 7. Testing Strategy

| Test Type | Scope |
|---|---|
| **API wiring** | GET returns data → form pre-populates correctly |
| **Per-step validation** | Step 1: name/phone/address/GST required. Step 2: 1+ channel + 1+ payment. Step 6: vendor fields required. |
| **Save flow** | POST sends correct multipart payload with all sections |
| **File uploads** | Logo + PDF attach to FormData correctly |
| **Skip flow** | Steps 3/4/5 can be skipped; defaults preserved |
| **Navigation** | Sidebar link works. Back/Next buttons work. Step clicks in rail work. |
| **Regression** | Existing Settings panel still opens. Dashboard still loads. Login unaffected. |

---

## 8. Open Questions (0 blockers)

All questions resolved during brainstorm:
- ~~Auto-redirect~~ → DEFERRED (BQ-019-1, manual navigation only)
- ~~Operating hours / tables / printers~~ → OUT OF SCOPE (separate APIs)
- ~~Relationship to SettingsPanel~~ → Separate (wizard is additive)

**No blockers. Gate 2 complete. Ready for Gate 3 (Implementation Plan).**

---

*CR-019 Impact Analysis — 2026-06-10. 3 new files, 3 modified files. Zero regression risk. No blockers.*
