# CR-060: Table/Room Management — Wire CRUD APIs to Existing UI

**ID:** CR-060
**Type:** CR (Change Request)
**Created:** 2026-07-06
**Status:** INTAKE
**Priority:** P1
**Risk:** MEDIUM (no financial logic, but touches table context used by order flow)
**Sprint:** POS 5.0
**Source:** OWNER-REPORTED

---

## Summary

The Table Management section under Settings currently shows "Coming Soon" in the sidebar and has a fully built UI shell (`TableManagementView.jsx`, 272 lines) with **all CRUD operations mocked** (toast-only, zero API calls). The goal is to wire this existing UI to real backend APIs for table/room CRUD (add, edit, delete sections and tables), activate the sidebar entry, and make the feature fully functional within the existing Settings framework.

---

## Current State

| Aspect | Status |
|---|---|
| UI component | `TableManagementView.jsx` — 272 lines, master-detail layout (sections left, tables right) |
| Add section | UI exists — **MOCKED** (toast only) |
| Edit section | UI exists — **MOCKED** (toast only) |
| Delete section | UI exists — **MOCKED** (toast only) |
| Add table | UI exists — **MOCKED** (toast only) |
| Edit table | UI exists — **MOCKED** (toast only) |
| Delete table | UI exists — **MOCKED** (toast only) |
| Sidebar entry | `comingSoon: true` — greyed out |
| Route | Lives inside Settings panel (sub-view), NOT a standalone route |
| Data source | `useTables()` context — read-only boot data from `/all-table-list` |
| API integration | ZERO — no service file, no API calls |

## Related Items

- **BUG-148:** "Table Management — cannot add new table" (P1, INTAKE) — **SUBSUMED by this CR**. BUG-148 is the symptom; CR-060 is the root fix.

---

## Scope

1. Wire existing `TableManagementView.jsx` UI to real backend table/room CRUD APIs
2. Create `tableManagementService.js` (API call layer)
3. Create `tableManagementTransform.js` (if needed for field mapping)
4. Remove `comingSoon: true` from sidebar entry for Table Management
5. Update `useTables()` context or `TableContext` to support mutations (add/edit/delete) not just read
6. Keep within existing Settings framework (NOT a standalone route — owner confirmed stays under Settings)

## Architecture Decision

- **Stays under Settings** — NOT a standalone route migration (unlike Menu Management CR-041)
- Accessed via: Settings → Table Management (already in sidebar, just needs `comingSoon` removed)
- Also accessible via: Dashboard → All Settings → Table Management (SettingsPanel routing)

---

## Discovery Plan

1. Owner provides API curls for table/room CRUD endpoints
2. Map request/response shapes
3. Wire to existing UI
4. Activate sidebar entry

---

## Pre-Registration Checks

| Check | Result |
|---|---|
| Code Reality | **PARTIAL** — UI exists, CRUD mocked, zero API wiring |
| Duplicate Check | **RELATED to BUG-148** (subsumed) |
| Blast Radius | SMALL — 1 existing component + 1 new service file + sidebar flag change |

---

## Evidence

- Screenshots: not provided (owner described verbally)
- API curls: pending — owner will provide during discovery
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (mocked UI verified in code)

---

## Next

- **DISCOVERY SESSION** — Owner provides table/room CRUD API curls
- After discovery → Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan)
