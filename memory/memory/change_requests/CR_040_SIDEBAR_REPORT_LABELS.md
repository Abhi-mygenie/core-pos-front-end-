# CR-040 — Sidebar Navigation: Rename Report Labels + Remove X/Y/Z Reports

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Sidebar Navigation (Order Reports section)
**Priority:** P3 (cosmetic — label renames + dead link removal, no data/money impact)
**Sprint:** POS 4.0

---

## 1. Requirement

Under the **Order Reports** section in the left-hand sidebar navigation, make the following changes:

### Renames
| Current Label | New Label |
|---------------|-----------|
| Audit Report | Daily Report |
| Order Summary | Daily Summary |
| Room Orders | Daily Room Report |

### Removals
| Label | Action |
|-------|--------|
| X Report | **REMOVE** — not used |
| Y Report | **REMOVE** — not used |
| Z Report | **REMOVE** — not used |

---

## 2. Scope (preliminary)

- **Sidebar.jsx** — label strings + removal of X/Y/Z nav items
- **App.js** — if X/Y/Z have registered routes, remove those too
- Possibly page headers inside the report pages themselves (if they echo the sidebar label)
- Investigation needed: do X/Y/Z Report have actual page components? If so, those files can be deleted or left orphaned (no route = no access)

---

## 3. Impact

- **Files:** 1–3 files (Sidebar.jsx primary, App.js if routes exist, report page headers if they echo sidebar labels)
- **Regression risk:** LOW — label-only changes + link removal
- **Money/payload impact:** NONE
- **Downstream:** None — purely cosmetic / navigation cleanup

---

## 4. Screenshot Evidence

Owner-provided screenshot shows current sidebar under "Order Reports":
1. Audit Report
2. Order Summary
3. Room Orders
4. X Report ← remove
5. Y Report ← remove
6. Z Report ← remove

---

## 5. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-040 Intake — 2026-06-12*
