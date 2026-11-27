# PUBLIC_ROUTES.md — Intentionally Unauthenticated Routes

**Status:** ACTIVE  
**Created:** 2026-09-08  
**Owner decisions:** OD-CR372-01 (locked 2026-09-08)  
**Enforced by:** CR-372 F-SEC-03 · Rule R26 (v0.8) · Pre-Release Audit §B  

---

## Policy

Every `<Route>` in `App.js` that does NOT use `<ProtectedRoute>` MUST appear in this file with a written justification. Any route not listed here and not wrapped in `ProtectedRoute` is a **release blocker** (Pre-Release Audit §B finding).

---

## Approved Public Routes

| Route | Component | Justification | Owner decision | Revisit |
|---|---|---|---|---|
| `/` | `LoginPage` | Entry point — user must log in here. Cannot be protected. | OD-CR372-01 | Never |
| `/local-printer-setup` | `LocalPrinterSetupView` | Local printer agent accesses this from the local network without a browser session. Protecting it would break printer registration flow. | OD-CR372-01 | When printer auth model is redesigned (CR-161 follow-up) |

---

## Temporary Carve-Outs (PMS track in progress)

The following PMS static HTML files remain in `public/` and are accessible without auth. These are design reference documents, not app routes. They will be moved to `/app/memory/design_briefs/` when PMS sprint `pos_pms_1` closes.

| File | Purpose |
|---|---|
| `public/cr358-p2-v3-mockup.html` | PMS Phase 2 design mockup |
| `public/cr358-p3-design-comparison.html` | PMS Phase 3 design comparison |
| `public/cr358-p4-pms-mockup.html` | PMS Phase 4 design mockup |
| `public/comparison_room_ui.html` | Room UI comparison reference |
| `public/MyGenie_PMS_Screen_Reference.pdf` | PMS screen reference PDF |

**Trigger to move:** PMS Gate 6 owner smoke complete for CR-358 P1–P4 + CR-360.

---

## How to Add a New Public Route

1. Add it to this file with justification + owner decision reference.
2. Add `ProtectedRoute` skip rationale as a comment in `App.js` next to the route: `{/* PUBLIC: see PUBLIC_ROUTES.md */}`
3. Pre-Release Audit §B checks this file against App.js at every release.
