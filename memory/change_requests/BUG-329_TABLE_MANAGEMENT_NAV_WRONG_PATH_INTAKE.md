# BUG-329 — Table Management Sidebar Click Redirects to All Settings

**Type:** Bug
**ID:** BUG-329
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

When a user clicks "Table Management" in the sidebar navigation, they are taken to `/settings` (All Settings view) instead of the Table Management dashboard. The sidebar item has the wrong `path` assigned.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Sidebar Navigation → Table Management |
| Priority | P1 |
| Severity | HIGH — table layout management is completely inaccessible via navigation |
| Risk | MEDIUM (navigation change; no financial/billing logic) |
| Fast Lane | POSSIBLE (1 line in Sidebar.jsx) — needs owner FAST LANE APPROVED and correct path confirmed |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce: Click "Table Management" in the sidebar → lands on All Settings page instead of Table Management dashboard
- Code evidence confirmed:
  ```
  # Sidebar.jsx line 111:
  { id: "table-management", label: "Table Management", path: "/settings" }  // ← WRONG
  # Should navigate to table management dashboard, not /settings
  ```
- Confidence: CONFIRMED (code inspection)

## Code Reality Check

```bash
# Sidebar.jsx line 111:
  { id: "table-management", label: "Table Management", path: "/settings" }
# Sidebar.jsx line 117:
  { id: "all-settings", label: "All Settings", path: "/settings" }
# Both point to same path — Table Management has wrong route
# TableManagementView.jsx exists at: components/panels/settings/TableManagementView.jsx
```

- **Code reality: FULL** — bug is confirmed, `path` value is `/settings` for both Table Management and All Settings
- Relevant files:
  - `src/components/layout/Sidebar.jsx` (line 111 — wrong path)
  - `src/App.js` or router config (need to confirm correct route for table management)
  - `src/components/panels/settings/TableManagementView.jsx` (component exists)

## Blast Radius

- 1 line in `Sidebar.jsx`
- Estimated scope: SMALL (1 file, but need to verify the correct target path in the router)

## Expected Behavior

- Clicking "Table Management" in the sidebar opens the Table Management dashboard/panel
- The path should point to the proper table management route or open the settings panel with the `table-management` tile pre-selected

## Owner Decisions Needed

1. Should Table Management open as:
   a. A full page route (e.g., `/table-management`)
   b. The Settings panel with table-management pre-selected (opens `TableManagementView` inside SettingsPanel)

## Duplicate Check

DISTINCT — no prior BUG references this specific navigation mismatch.

---

**Next:** Planning Gate 2 (check correct route → 1-line fix)
