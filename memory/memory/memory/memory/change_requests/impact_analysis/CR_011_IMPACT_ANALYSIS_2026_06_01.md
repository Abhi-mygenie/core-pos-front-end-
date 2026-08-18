# CR-011 — Impact Analysis (Gate 2, Artifact #2)

**CR:** CR-011 — Complete Reports Module (new, role-based, separate tab)
**Sprint:** POS 4.0
**Priority:** P1
**Date:** 2026-06-01
**Author:** Implementation agent (E1)
**Status:** OPEN — DISCOVERY REQUIRED before Gate 3 (Plan)

---

## 0. TL;DR

CR-011 is a **discovery-heavy** CR. The build-side technical impact is **moderate and isolated** (additive new module, no edits to existing reports), but the **scope** (catalog of reports, columns per report, role matrix, API contracts) is **owner-decision-bound** and must be locked before any plan or code can begin.

This document:

1. Maps the current reports infrastructure (already shipped, reusable).
2. Defines the boundary between "existing (untouched)" and "new (this CR)".
3. Enumerates the **8 open owner decisions** needed before Gate 3.
4. Lists the technical surface area, regression risks, and reusability inventory.
5. Recommends a **sub-CR split strategy** for Gate 3 (Plan).

No code-level decisions are made here — that is Gate 3 (Plan) + Gate 4 (Code Gate).

---

## 1. Current state (what exists today, what we keep)

### 1.1 Existing report pages (REMAIN UNCHANGED per owner instruction)

| Page | Route | File |
|---|---|---|
| Audit Report (all orders) | `/reports/audit` | `frontend/src/pages/AllOrdersReportPage.jsx` |
| Order Summary | `/reports/summary` | `frontend/src/pages/OrderSummaryPage.jsx` |
| Room Orders Report | `/reports/rooms` | `frontend/src/pages/RoomOrdersReportPage.jsx` |

Owner-confirmed boundary: **none of the three are touched by CR-011**. The new module lives alongside them.

### 1.2 Existing report components (REUSABLE for the new module)

Located at `frontend/src/components/reports/`:

- `FilterBar.jsx` — date + filter pills
- `FilterTags.jsx` — active filter chips
- `OrderTable.jsx` — generic table with sort + virtualisation hooks
- `OrderDetailSheet.jsx` — side-sheet drill-down
- `ExportButtons.jsx` — CSV / XLSX / PDF export
- `SummaryBar.jsx` — totals strip
- `ReportTabs.jsx` — tab switcher
- `DatePicker.jsx`, `PaymentMethodPicker.jsx`

**Reuse decision (recommended, locked in Gate 3):** the new module **reuses** these components rather than forking them. Any new report-specific component is a new file. Any deltas to the shared components must be additive (new props with safe defaults) — verified at Code Gate.

### 1.3 Existing API service / transforms (REUSABLE)

- `frontend/src/api/services/reportService.js`
- `frontend/src/api/transforms/reportTransform.js`

Existing endpoints (from `frontend/src/api/constants.js`):

| Endpoint | Use today |
|---|---|
| `/api/v2/vendoremployee/paid-order-list` | Paid orders |
| `/api/v2/vendoremployee/cancel-order-list` | Cancelled orders |
| `/api/v2/vendoremployee/paid-in-tab-order-list` | Credit / TAB orders |
| `/api/v2/vendoremployee/paid-paylater-order-list` | Hold / PayLater orders |
| `/api/v1/vendoremployee/urbanpiper/get-complete-order-list` | Aggregator orders |
| `/api/v2/vendoremployee/employee-order-details` | Order detail drill-down |
| `/api/v2/vendoremployee/daily-sales-revenue-report` | Daily sales (Order Summary) |
| `/api/v2/vendoremployee/report/order-logs-report` | Order logs (Audit) |
| `/api/v2/vendoremployee/get-single-order-new` | Single-order detail |

**Reuse decision:** the new module reuses any endpoint that already returns the data it needs. Net-new endpoints required for each new report type must be supplied by backend (see §3, Owner Decision OD-4).

### 1.4 Auth / permission model

- `frontend/src/contexts/AuthContext.jsx` — exposes `hasPermission(perm)`, `hasAnyPermission([])`, `hasAllPermissions([])`.
- Permissions are an array of strings stored in `sessionStorage.permissions`, hydrated at login.
- Sidebar already permission-gates each top-level item via `SIDEBAR_PERMISSIONS` in `Sidebar.jsx`. Existing report key: `'report'`.

**Implication for CR-011:** the existing `'report'` permission is bound to the existing report screens. The new module needs a **distinct permission key** (e.g., `'reports_module'` — final name in OD-3) so owner can hand it out independently of existing report access.

### 1.5 Routing + Layout

- `App.js` uses `BrowserRouter` + `ProtectedRoute`. Adding a top-level `/reports-module/*` route is mechanical.
- `Sidebar.jsx` already supports nested children with permission gating. Adding a new top-level entry is a 1-block edit.

---

## 2. Scope boundary (what CR-011 builds vs. doesn't)

### CR-011 IS

- A **new top-level Reports module** (new sidebar entry, new top-level route prefix).
- **Role-gated** via a new permission key, distinct from the existing `'report'` key.
- A **catalog of N report types**, each with filters / columns / export (catalog locked in OD-1).
- **Reuses** the existing `components/reports/*` building blocks and `reportService.js` endpoints where applicable.

### CR-011 IS NOT

- Not a refactor of the existing Audit / Order Summary / Room Orders pages.
- Not a parity reproduction of the old POS layout — owner explicitly said "not necessary to reproduce in similar way".
- Not a backend deliverable (backend supplies any new endpoints needed per OD-4; FE consumes them).
- Not a single monolithic implementation — likely **N sub-CRs at Gate 3**, one per report type or per group (recommendation in §5).

---

## 3. Open Owner Decisions (must be answered before Gate 3)

> These are blockers. Gate 3 (Plan) cannot start until OD-1..OD-3 are answered. OD-4..OD-8 can be answered in parallel during the planning sprint, but block specific sub-CRs.

| ID | Decision | Why it blocks |
|---|---|---|
| **OD-1** | **Final report catalog.** Owner picks which reports go in. Old POS had ~17 (Sales 7 + PLN 7 + Other 3). Owner already said 1:1 parity is NOT required. | Drives sub-CR split, file inventory, backend dependency list. |
| **OD-2** | **Per-report column / filter spec.** For each report in OD-1: column list, default filters, drill-down behaviour, export columns. | Drives transforms + table column configs. |
| **OD-3** | **Role matrix + permission key.** Which roles can see the new module? Is it a single permission or per-report sub-permissions? Final permission string(s). | Drives sidebar gate + route guard + per-report visibility. |
| **OD-4** | **Backend API contract per report.** For each report in OD-1 that isn't already covered by existing endpoints, backend supplies endpoint + sample payload. | Each missing contract blocks the corresponding sub-CR. |
| **OD-5** | **Export formats.** CSV-only? CSV + PDF? CSV + PDF + XLSX? Same export columns or a separate "report-friendly" export? | Drives `ExportButtons` extension (or fork) per report. |
| **OD-6** | **Information architecture.** One page with a left rail of reports (like old POS), or a Reports tab → list page → drill into individual report page? | Drives route shape, sidebar layout, header. |
| **OD-7** | **Performance constraints.** Date-range cap (single day, ≤7 days, ≤30 days)? Server-side pagination cutoff? Row cap per export? | Drives table virtualisation + pagination contract. |
| **OD-8** | **Cutover / rollout.** Behind a feature flag for early roles, or live for everyone with the new permission? Coexistence period with old reports — indefinite or sunset date? | Drives feature flag wiring + sunset comms. |

---

## 4. Technical surface area (what code moves)

### 4.1 New files (representative, locked in Gate 3)

```
frontend/src/pages/reports-module/
  ReportsModulePage.jsx          # shell + nested router
  reports/
    {ReportType1}Page.jsx        # one per report in OD-1
    ...
frontend/src/components/reports-module/
  ReportsModuleSidebar.jsx       # left rail (if IA is single-page per OD-6)
  ReportColumnConfig.js          # per-report column maps
  ...
frontend/src/api/services/
  reportsModuleService.js        # OR extend reportService.js (decided Gate 3)
frontend/src/api/transforms/
  reportsModuleTransform.js      # OR extend reportTransform.js
```

### 4.2 Existing files touched (additive only)

| File | Change | Risk |
|---|---|---|
| `App.js` | Add `/reports-module/*` route block | LOW — purely additive |
| `components/layout/Sidebar.jsx` | Add new top-level entry; add new permission key to `SIDEBAR_PERMISSIONS` | LOW — additive map entry + array push; existing Order Reports entry untouched |
| `api/constants.js` | Add new `API_ENDPOINTS.REPORTS_MODULE_*` keys | LOW — additive |
| `frontend/src/pages/index.js` | Barrel re-export | LOW |

### 4.3 Existing files NOT touched (verified at Code Gate)

- `AllOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, `RoomOrdersReportPage.jsx` — **NO edits**.
- `components/reports/*` — **only additive props**, no behaviour changes.
- `services/reportService.js`, `transforms/reportTransform.js` — **only additive exports**, no signature changes to existing functions.
- `contexts/AuthContext.jsx` — **no edits** (permission key is consumed, not defined here).

---

## 5. Sub-CR split recommendation (for Gate 3)

CR-011 is too large to ship as one CR with a single Code Gate. Recommended split:

| Sub-CR | Title | Order | Notes |
|---|---|---|---|
| **CR-011-A** | Module shell + sidebar entry + role gate + empty list page | 1st | Lands the route, the permission gate, the IA. Owner can verify role visibility before any data wiring. |
| **CR-011-B..N** | One sub-CR per report (or per OD-1 group) | After A | Each sub-CR: own backend contract, own filters/columns spec, own QA. Bigger reports (e.g., Profit/Loss) get their own; lighter ones may share. |
| **CR-011-Z** | Export hardening (PDF / XLSX parity, large-dataset perf) | Last | Only if OD-5 / OD-7 require beyond CSV. |

Split is **mandatory** to keep each Code Gate scoped to a reviewable diff.

---

## 6. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Permission rollout breaks existing report access | LOW | HIGH | Net-new permission key — existing `'report'` key untouched. Verified at Code Gate. |
| Date-range queries hammer backend | MED | MED | OD-7 caps + server-side pagination contract. |
| Reusing `components/reports/*` causes regression on existing pages | LOW | HIGH | Strict rule: additive props with safe defaults only. Code Gate verifies. Existing snapshot/render tests stay green. |
| Catalog scope creep mid-implementation | HIGH | MED | Lock catalog in OD-1 before Gate 3. Any addition = new sub-CR, not in-flight scope change. |
| Backend can't supply contracts in time | MED | MED | Each sub-CR is independently scheduled; sub-CRs without contracts park in Bucket C (backend-blocked). |
| Cross-CR collision with CR-012 (menu API migration) | LOW | LOW | CR-011 reads orders/payment data, not menu CRUD. No overlap. |

---

## 7. Cross-CR dependencies

| Other CR | Relationship | Action |
|---|---|---|
| **CR-010** (weight items) | Item-wise / sales reports must render `weight × item_unit_price` correctly when CR-010 ships. | Add to OD-2 column spec for any report that aggregates by item or by amount. |
| **CR-012** (menu API migration) | Affects menu management, not reports. No overlap. | None. |
| **Existing Audit Report Optimization CR** (SHIPPED) | Pattern + transform reuse. | Mirror the architectural style (transform → service → page). |
| **DEV-DASHBOARD-001** (SHIPPED) | Isolated read-only dashboard — same isolation pattern is applicable here (new top-level folder, no edits to existing). | Use as architectural reference. |

---

## 8. Compliance with POS 4.0 policies

| Policy | Compliance |
|---|---|
| `REGISTRATION_GATE_POLICY.md` | ✅ CR-011 registered (1/7). |
| `CODE_GATE_POLICY.md` | Required at Gate 4 per sub-CR — non-waivable. |
| `INTAKE_WORKFLOW.md` | ✅ Followed (5-step conversational intake). |
| 6-Artifact Rule | This doc = Artifact #2 (Impact Analysis). |
| `OPEN_GAPS_REGISTER.md` | No new open gaps created by this analysis. |

---

## 9. Exit criteria (this Gate 2 is complete when)

- [x] Current-state map produced (§1).
- [x] Scope boundary locked with owner-confirmed exclusions (§2).
- [x] Open owner decisions enumerated (§3) — **8 items, OD-1..OD-8**.
- [x] Technical surface area + reusability inventory (§4).
- [x] Sub-CR split recommendation (§5).
- [x] Risk assessment (§6).
- [x] Cross-CR dependency review (§7).
- [ ] **Owner answers OD-1, OD-2, OD-3 (minimum) → Gate 3 (Plan) starts.**

---

## 10. Next gate

**Gate 3 — Implementation Plan** for **CR-011-A** (module shell + sidebar + role gate + empty list page), produced as soon as OD-1, OD-2 (for the placeholder list page), and OD-3 are answered.

OD-4..OD-8 unblock subsequent sub-CRs but are NOT prerequisites for CR-011-A.

---

*Generated 2026-06-01 — CR-011 Gate 2 (Impact Analysis), Artifact #2 of the 6-Artifact closure rule.*
