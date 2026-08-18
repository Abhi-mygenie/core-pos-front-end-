# Employee Management & Role-Based Access — Master Roadmap

**Document:** EMPLOYEE_ROLE_ROADMAP.md
**Created:** 2026-07-17
**Author:** PLANNING Agent
**Status:** ACTIVE
**Scope:** All CRs and BUGs in the Employee Management → Role Gating → Permission Wiring track
**Last Updated:** 2026-07-17

---

## Executive Summary

The Employee & Role track spans 5 phases — from fixing CR-069's broken CRUD (BUG-198) to full app-wide role-based access control (CR-071) and cancellation gating (CR-068). The critical path runs through 3 blockers (CR-069, CR-057, CR-058) before the big permission rollout (CR-071, ~30 files) can begin.

**Estimated total effort:** ~10-13 sessions across all phases.

---

## Dependency Graph

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    PHASE 1                          │
                    │  BUG-198 (fix 4 CRUD bugs)                         │
                    │  → CR-069 Owner Verify                             │
                    │  → BUG-196 Owner Verify (sidebar)                  │
                    └──────────────────────┬──────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │                    PHASE 2                          │
                    │  CR-057 (No Tax) ──sequential──▶ CR-058 (Compli.)  │
                    │  Both touch R5 hotspots — must be sequential       │
                    └──────────────────────┬──────────────────────────────┘
                                           │
                              CR-069 ✅ + CR-057 ✅ + CR-058 ✅
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │                    PHASE 3                          │
                    │  CR-071 — App-Wide Permission Wiring (~30 files)   │
                    │  Batch A: Non-hotspot (Sidebar, Reports, Settings) │
                    │  Batch B: R5 hotspots (Order flow, Menu Mgmt)      │
                    └──────────────────────┬──────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │                    PHASE 4                          │
                    │  CR-068 — Cancellation Role-Gating                 │
                    │  + BUG-201 — Expense Deletion Role-Gating          │
                    └──────────────────────┬──────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │                    PHASE 5 (Future)                 │
                    │  CR-069 Phase 2 — Attendance, Shifts, Payroll      │
                    │  (Not yet registered — needs backend + intake)     │
                    └─────────────────────────────────────────────────────┘
```

---

## Phase 1: Close Out CR-069 — Fix Employee CRUD

**Goal:** Make all 4 employee CRUD operations work. Get CR-069 owner-verified.
**Effort:** ~1 session
**Sprint:** POS 5.0

### Items

| ID | Title | Current Status | Risk | Action Needed |
|---|---|---|---|---|
| **BUG-198** | CR-069 Employee Post-Delivery — 4 issues | **GATE 3 COMPLETE** | HIGH | Gate 4 GO → Implementation → QA → Owner Smoke |
| **CR-069** | Employee + Role Management (Wave 1) | **IMPLEMENTED** | CRITICAL | Owner Smoke after BUG-198 ships |
| **BUG-196** | Sidebar missing on employee pages | **IMPLEMENTED** | LOW | Owner Smoke (can bundle with CR-069 smoke) |

### BUG-198 Sub-Issues (Planned — Ready for Gate 4 GO)

| # | Issue | Root Cause | Fix | Files |
|---|---|---|---|---|
| A | Employee Update fails silently | `api.post()` → needs `api.put()` | 1-line method change | `employeeService.js` |
| B | Reset Password broken (3 stacked bugs) | Wrong method + incomplete payload + unnecessary popup | Remove popup, add inline password field, use PUT update | `employeeService.js`, `EmployeeListView.jsx`, DELETE `ResetPasswordDialog.jsx` |
| C | Eye icon missing (show/hide password) | Never built | Add `Eye`/`EyeOff` toggle + `showPassword` state | `EmployeeListView.jsx` |
| D | Add Employee fails | Missing `status: 1` in create payload | 1-line field addition | `employeeTransform.js` |

### Owner Decisions (Recorded 2026-07-17)

| # | Decision | Owner Answer |
|---|---|---|
| OQ-1 | Reset password endpoint? | No dedicated endpoint. Use PUT update. Inline in row, no popup. |
| OQ-2 | `password_confirmation` on create? | NOT required. |
| OQ-3 | `password_confirmation` on update? | NOT required. Backend uses upsert. |

### Artifacts

| Doc | Path | Status |
|---|---|---|
| Intake | `change_requests/BUG_198_CR069_EMPLOYEE_POST_DELIVERY.md` | ✅ Done |
| Impact Analysis | `impact/BUG-198_IMPACT_ANALYSIS.md` | ✅ Done |
| Implementation Plan | `plans/BUG_198_IMPLEMENTATION_PLAN.md` | ✅ Done |
| QA Report | TBD | Pending |

### Exit Criteria (Phase 1 Complete When)

- [ ] BUG-198: All 4 sub-issues implemented + QA passed
- [ ] CR-069: Owner smoke PASSED — employee add/edit/delete, role CRUD, permission editor all working
- [ ] BUG-196: Owner smoke PASSED — sidebar visible on all employee/inventory pages
- [ ] Registry: CR-069 → OWNER VERIFIED, BUG-196 → OWNER VERIFIED, BUG-198 → CLOSED

---

## Phase 2: Unblock CR-071's Hotspot Dependencies

**Goal:** Ship CR-057 and CR-058 so they stop blocking CR-071 from touching R5 hotspot files.
**Effort:** ~2-3 sessions each (~4-6 total)
**Sprint:** POS 5.0
**Sequencing:** CR-057 FIRST, then CR-058 (both touch `OrderEntry.jsx` — cannot be parallel)

### Items

| ID | Title | Current Status | Risk | Depends On | Blocks |
|---|---|---|---|---|---|
| **CR-057** | Menu Management — "No Tax" option + tax rules | **INTAKE** | CRITICAL | None | CR-071 |
| **CR-058** | Order-level "Mark Complimentary" + mandatory discount note | **INTAKE** | HIGH | None | CR-071 |

### Why Sequential (Not Parallel)

Both CR-057 and CR-058 touch the same R5 hotspot files:
- `OrderEntry.jsx` (2,493 lines) — both modify order creation logic
- `CollectPaymentPanel.jsx` (3,050 lines) — CR-058 modifies payment/discount logic
- `orderTransform.js` (1,916 lines) — both modify financial payload

Per Rule R16 (multi-agent conflict protocol), these must be done one at a time to avoid merge conflicts in the most dangerous files in the codebase.

### CR-057: Menu No-Tax — Estimated Scope

- Add "No Tax" toggle to menu item configuration
- Thread `no_tax` flag through order creation pipeline
- Ensure tax calculation skips items marked no-tax
- Document tax rules (GST/VAT behavior per item flag)
- **Files likely:** `OrderEntry.jsx`, `orderTransform.js`, `MenuManagementPanel.jsx`, `productTransform.js`
- **R5 + R6 applies** (hotspot files + financial/tax logic)

### CR-058: Order Complimentary — Estimated Scope

- Add "Mark Order Complimentary" action on order card/entry
- Apply 100% discount with mandatory note
- Ensure settlement/reports reflect complimentary correctly
- **Files likely:** `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `OrderCard.jsx`
- **R5 + R6 applies** (hotspot files + financial/discount logic)

### Gate Cycle Per Item

```
Intake (clarify scope with owner)
  → Gate 2 (Impact Analysis)
    → Gate 3 (Implementation Plan)
      → Gate 4 GO (owner approval)
        → Implementation
          → QA
            → Owner Smoke
              → VERIFIED ✅
```

### Owner Action Required (Phase 2)

- **CR-057:** Needs intake clarification — which tax types, which items, how does no-tax interact with existing GST/VAT settings?
- **CR-058:** Needs intake clarification — what triggers complimentary (button on order card? on collect bill?), is the note field mandatory or optional, how does it appear in reports?

### Exit Criteria (Phase 2 Complete When)

- [ ] CR-057: OWNER VERIFIED — no-tax items correctly skip tax in orders + settlement + reports
- [ ] CR-058: OWNER VERIFIED — complimentary orders work end-to-end with mandatory note
- [ ] No R5 hotspot files have unresolved conflicts
- [ ] CR-071 dependency chain fully unblocked

---

## Phase 3: CR-071 — App-Wide Permission Wiring

**Goal:** Wire `hasPermission()` checks across ~30 consumer files. Make the role/permission system actually enforce access.
**Effort:** ~3-4 sessions
**Sprint:** POS 5.0 Wave 2
**Risk:** CRITICAL
**Blast Radius:** LARGE (~30 files, ~80-120 gate insertions)

### Dependencies (All Must Be VERIFIED Before Starting)

| Dependency | Why | Expected Status |
|---|---|---|
| CR-069 | Permission model + `PermissionGate.jsx` must work | ✅ After Phase 1 |
| CR-057 | Must land first — same R5 hotspot files | ✅ After Phase 2a |
| CR-058 | Must land first — same R5 hotspot files | ✅ After Phase 2b |

### Existing Infrastructure (Built in CR-069, Ready to Use)

| Component | File | Purpose |
|---|---|---|
| `PermissionGate.jsx` | `components/guards/PermissionGate.jsx` | JSX wrapper — hides children if user lacks permission |
| `hasPermission()` | `AuthContext` | Function — returns boolean for a permission key |
| `usePermission()` hook | `AuthContext` | Hook — reactive permission check |
| `permissionCatalog.js` | `constants/permissionCatalog.js` | 52 permissions across 8 business groups |
| Role CRUD UI | `RoleListView.jsx` + `RoleFormView.jsx` | Owner configures which role gets which permissions |

### Recommended Sub-Batches

**Batch A — Non-Hotspot Files (Lower Risk, Do First)**

| # | Area | Files | Gate Type | Permissions |
|---|---|---|---|---|
| 1 | Sidebar | `Sidebar.jsx` | Show/hide menu items | `reports.view`, `menu.view`, `inventory.view`, `expenses.view`, `settings.view` |
| 2 | Reports | All report pages (~8 files) | Page-level access gate | `reports.daily`, `reports.settlement`, `reports.expenses`, etc. |
| 3 | Settings | `RestaurantSettingsPage.jsx`, tiles | Tile-level access | `settings.edit` |
| 4 | Expense | Expense CRUD pages (~4 files) | Create/edit/delete gates | `expenses.create`, `expenses.edit`, `expenses.delete` |
| 5 | Credit | Credit module (~2 files) | CRUD gates | `credit.view`, `credit.edit` |
| 6 | Settlement | Settlement panel (~2 files) | Action gates | `settlement.view`, `settlement.settle` |
| 7 | Inventory | Inventory pages (~5 files) | CRUD gates | `inventory.view`, `inventory.edit`, `inventory.purchase` |

**Batch B — R5 Hotspot Files (Higher Risk, Do Second, Full Regression)**

| # | Area | Files | Gate Type | Permissions |
|---|---|---|---|---|
| 8 | Order Entry | `OrderEntry.jsx` | Place order, apply discount | `orders.create`, `orders.discount` |
| 9 | Cart | `CartPanel.jsx` | Modify cart, schedule | `orders.edit` |
| 10 | Collect Bill | `CollectPaymentPanel.jsx` | Collect payment, split | `orders.collect`, `orders.split_payment` |
| 11 | Order Card | `OrderCard.jsx` | Cancel, transfer, WhatsApp | `orders.cancel`, `orders.transfer` |
| 12 | Table Card | `TableCard.jsx` | Table actions | `tables.manage` |
| 13 | Menu Mgmt | `MenuManagementPanel.jsx`, `BulkEditor.jsx` | Edit/delete/price | `menu.edit`, `menu.delete`, `menu.price` |

### Implementation Pattern (Consistent Across All Files)

```jsx
// Pattern 1: Hide entire section
<PermissionGate permission="reports.view">
  <ReportsDashboard />
</PermissionGate>

// Pattern 2: Disable specific button
<Button 
  disabled={!hasPermission('orders.cancel')}
  onClick={cancelOrder}
>
  Cancel
</Button>

// Pattern 3: Sidebar item visibility
{hasPermission('expenses.view') && (
  <SidebarItem label="Expenses" href="/expenses" />
)}
```

### Regression Testing Plan

After Batch A:
- Login as Owner role → see everything
- Login as Waiter role → restricted sidebar, no reports/settings access
- Login as Cashier role → different restrictions per configured permissions

After Batch B:
- Full critical path: Login → Place Order → Collect Bill → Settlement → Report
- Verify no feature is accidentally hidden for Owner role
- Verify restricted roles correctly blocked from gated actions
- Cross-role testing with at least 3 different role configurations

### Exit Criteria (Phase 3 Complete When)

- [ ] All ~30 consumer files have permission gates
- [ ] Owner role: zero features hidden (full access confirmed)
- [ ] Waiter role: correctly restricted per configured permissions
- [ ] Cashier role: correctly restricted per configured permissions
- [ ] No R5 hotspot regressions (order flow, billing, settlement all work)
- [ ] Regression: full critical path passes for authorized roles
- [ ] Registry: CR-071 → OWNER VERIFIED

---

## Phase 4: CR-068 + BUG-201 — Specific Permission Features

**Goal:** Add cancellation role-gating and expense deletion role-gating as specific permission-controlled features.
**Effort:** ~1-2 sessions
**Sprint:** POS 5.0 Wave 2
**Risk:** HIGH (CR-068 touches R5 hotspots, but gating infrastructure already exists from CR-071)

### Items

| ID | Title | Current Status | Risk | Depends On |
|---|---|---|---|---|
| **CR-068** | Cancellation role-gating | **INTAKE** | HIGH | CR-071 |
| **BUG-201** | Expense Deletion Safety — cascade warning + role gating | **INTAKE** | HIGH | CR-071 |

### CR-068: Cancellation Role-Gating — Scope

With CR-071 in place, CR-068 becomes a focused feature:
1. Add `orders.cancel_order` and `orders.cancel_item` to `permissionCatalog.js`
2. Gate cancel buttons in `OrderCard.jsx`, `CartPanel.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx`
3. Configure default: Owner + Manager = can cancel, Waiter/Cashier = cannot

### CR-068: Open Questions (Owner Must Answer Before Planning)

| # | Question | Status |
|---|---|---|
| OQ-1 | Which roles get cancel rights by default? (Owner + Manager only?) | **UNANSWERED** |
| OQ-2 | Per restaurant or system-wide configuration? | **UNANSWERED** |
| OQ-3 | Separate permissions for item-level vs order-level cancel? | **UNANSWERED** |
| OQ-4 | Does backend already have a permission field for cancellation? | **UNANSWERED** |

### BUG-201: Expense Deletion Safety — Scope

1. Add confirmation dialog before deleting expense items with transaction history
2. Show cascade warning: "This item has X transactions. Deleting will..."
3. Gate delete action behind `expenses.delete` permission (from CR-071)

### BUG-201: Open Questions

| # | Question | Status |
|---|---|---|
| OQ-1 | Does backend have a pre-delete check endpoint (transaction count)? | **UNANSWERED** |
| OQ-2 | Does backend cascade-adjust aggregation totals on delete? | **UNANSWERED** |

### Exit Criteria (Phase 4 Complete When)

- [ ] CR-068: Cancel buttons gated by role — unauthorized roles see disabled/hidden cancel
- [ ] CR-068: Default permissions configured (Owner/Manager = can cancel)
- [ ] BUG-201: Deletion confirmation with cascade warning
- [ ] BUG-201: Delete action gated by `expenses.delete` permission
- [ ] Registry: CR-068 → OWNER VERIFIED, BUG-201 → CLOSED

---

## Phase 5: CR-069 Phase 2 — Attendance, Shifts, Payroll, Leaves (Future)

**Goal:** Extend employee management with HR operational features.
**Effort:** Multi-sprint (large scope, likely needs backend work)
**Sprint:** Future (not yet registered)
**Risk:** Unknown until intake

### Planned Modules (From CR-069 Future Phases)

| Module | Description | Backend Ready? |
|---|---|---|
| Attendance / Check-in | Clock in/out, daily attendance tracking | **Unknown** |
| Shifts / Roster | Shift scheduling, roster management | **Unknown** |
| Payroll | Salary calculation, pay slips, deductions | **Unknown** |
| Leaves | Leave requests, approval workflow, balance tracking | **Unknown** |

### Prerequisites

- CR-069 Wave 1 fully verified (employee + role CRUD working)
- CR-071 shipped (permissions enforced — payroll/attendance need role-gating)
- Backend endpoints for attendance, shifts, payroll, leaves (likely don't exist yet)
- Owner intake workshop to define scope, priorities, and which module first

### Owner Action Required

- Decide if this is needed this quarter or can be deferred
- Identify which module is highest priority (Attendance is usually first)
- Confirm backend team can deliver the required endpoints
- Schedule intake workshop

### Exit Criteria (Phase 5 Scope TBD After Intake)

- [ ] Intake registered for each module
- [ ] Backend endpoints confirmed available
- [ ] Full gate cycle per module

---

## Summary Timeline

```
Phase   │ Items              │ Effort      │ Status          │ Blocker
────────┼────────────────────┼─────────────┼─────────────────┼──────────────────────
  1     │ BUG-198 + CR-069   │ ~1 session  │ GATE 3 COMPLETE │ Gate 4 GO needed
        │ verify + BUG-196   │             │                 │
────────┼────────────────────┼─────────────┼─────────────────┼──────────────────────
  2a    │ CR-057 (No Tax)    │ ~2-3 sess.  │ INTAKE          │ Owner intake answers
────────┼────────────────────┼─────────────┼─────────────────┼──────────────────────
  2b    │ CR-058 (Complim.)  │ ~2-3 sess.  │ INTAKE          │ Owner intake answers
────────┼────────────────────┼─────────────┼─────────────────┼──────────────────────
  3     │ CR-071 (Perm Wire) │ ~3-4 sess.  │ DEFERRED        │ Ph1 + Ph2 must close
────────┼────────────────────┼─────────────┼─────────────────┼──────────────────────
  4     │ CR-068 + BUG-201   │ ~1-2 sess.  │ INTAKE          │ CR-071 must ship
────────┼────────────────────┼─────────────┼─────────────────┼──────────────────────
  5     │ CR-069 Phase 2     │ Multi-sprint│ NOT REGISTERED  │ Backend + intake
        │ (Attend/Payroll)   │             │                 │
────────┴────────────────────┴─────────────┴─────────────────┴──────────────────────
                                ~10-13 sessions total (Phases 1-4)
```

---

## Open Questions Tracker (All Phases)

| Phase | ID | Question | Status | Owner Action |
|---|---|---|---|---|
| 1 | BUG-198 OQ-1 | Reset password endpoint? | ✅ ANSWERED — use PUT update, inline | — |
| 1 | BUG-198 OQ-2 | password_confirmation on create? | ✅ ANSWERED — not required | — |
| 1 | BUG-198 OQ-3 | password_confirmation on update? | ✅ ANSWERED — not required, upsert | — |
| 2a | CR-057 | Tax types, no-tax interaction with GST/VAT settings? | ❌ UNANSWERED | Intake session needed |
| 2b | CR-058 | Complimentary trigger, note mandatory?, report display? | ❌ UNANSWERED | Intake session needed |
| 4 | CR-068 OQ-1 | Default cancel roles? | ❌ UNANSWERED | Answer anytime |
| 4 | CR-068 OQ-2 | Per restaurant or system-wide? | ❌ UNANSWERED | Answer anytime |
| 4 | CR-068 OQ-3 | Item-level vs order-level separate permissions? | ❌ UNANSWERED | Answer anytime |
| 4 | CR-068 OQ-4 | Backend permission field for cancellation? | ❌ UNANSWERED | Answer anytime |
| 4 | BUG-201 OQ-1 | Pre-delete check endpoint? | ❌ UNANSWERED | Answer anytime |
| 4 | BUG-201 OQ-2 | Backend cascade-adjust on delete? | ❌ UNANSWERED | Answer anytime |
| 5 | CR-069 Ph2 | Which module first? Backend ready? This quarter? | ❌ UNANSWERED | Intake workshop needed |

---

## Related Documents

| Document | Path |
|---|---|
| BUG-198 Intake | `change_requests/BUG_198_CR069_EMPLOYEE_POST_DELIVERY.md` |
| BUG-198 Impact Analysis | `impact/BUG-198_IMPACT_ANALYSIS.md` |
| BUG-198 Implementation Plan | `plans/BUG_198_IMPLEMENTATION_PLAN.md` |
| CR-069 Intake | `change_requests/CR-069_EMPLOYEE_MANAGEMENT_INTAKE.md` |
| CR-069 Impact Analysis | `impact/CR-069_IMPACT_ANALYSIS.md` |
| CR-069 Implementation Plan | `plans/CR_069_IMPLEMENTATION_PLAN.md` |
| CR-068 Intake | `change_requests/CR_068_CANCELLATION_ROLE_GATING.md` |
| Permission Catalog | `frontend/src/constants/permissionCatalog.js` |
| PermissionGate Component | `frontend/src/components/guards/PermissionGate.jsx` |

---

## Revision History

| Date | Change | Author |
|---|---|---|
| 2026-07-17 | Initial roadmap created — 5 phases documented | PLANNING Agent |
