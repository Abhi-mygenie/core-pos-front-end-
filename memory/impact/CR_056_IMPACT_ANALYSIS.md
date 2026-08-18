# CR-056 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** NONE — no `show_scan_popup` field anywhere in codebase
**Conflict Pre-Check:** DashboardPage is R5 hotspot but change is a single JSX conditional wrap. No active CR touches ScanOrderPopOut render.
**Risk:** MEDIUM (R5 hotspot DashboardPage, but 1-line gate)
**Status:** UNBLOCKED — `show_scan_popup` field confirmed in backend response (2026-07-24). Value: integer `1` at `restaurants[0].settings.show_scan_popup`.

---

## Data Flow Trace

```
Backend: GET /settings-list → response.settings.show_scan_popup (NOT YET — need backend)
  → Transform: profileTransform.js:126+ features{} or L370+ settings
    → Context: useRestaurant() → features.showScanPopup (or settings.showScanPopup)
      → Component: DashboardPage.jsx:1613 → <ScanOrderPopOut ...>
        → UI: Popup renders unconditionally (gap — needs gate)
```

**Break point:** Backend doesn't return the field yet. Once it does, FE needs 3 touch points.

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `api/transforms/profileTransform.js` | L126+ (features) or L370+ (settings) | Map `show_scan_popup` → `showScanPopup` boolean | LOW — 1 line |
| 2 | `pages/RestaurantSettingsPage.jsx` | ~L513 (Step 4 "Order & Kitchen") | Add Toggle: label="Show Scan Pop up", field=`showScanPopup` | LOW — ~5 lines, follows existing pattern |
| 3 | `api/transforms/restaurantSettingsTransform.js` | toAPI section | Map `showScanPopup` → `show_scan_popup` for POST update-settings | LOW — 1 line |
| 4 | `pages/DashboardPage.jsx` | L1613 (`<ScanOrderPopOut>` render) | Wrap in `{features.showScanPopup !== false && <ScanOrderPopOut ...>}` | LOW — 1-line gate |

**Files WILL NOT touch:** ScanOrderPopOut.jsx (no changes to popup itself), socketHandlers.js, OrderCard.jsx.

## Owner Decisions (Resolved)

| # | Question | Answer |
|---|----------|--------|
| 1 | Default ON or OFF? | **ON** (default `true`) |
| 2 | Toggle label? | **"Show Scan Pop up"** |
| 3 | Per-restaurant or per-user? | **Restaurant-level** (backend API) |
| 4 | Storage strategy? | **Backend** (need backend brief — filed) |

## Scope Lock

- **4 files, ~8 lines total**
- No API call changes, no financial impact
- R5 hotspot (DashboardPage) — 1-line conditional wrap only
- **BLOCKED until backend delivers `show_scan_popup` field in settings API**

---

**Next:** Backend delivers field → Gate 3 (Implementation Plan) → Gate 4 GO
