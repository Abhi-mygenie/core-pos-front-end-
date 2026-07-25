# CR-059: Expense Module — Migration from Old POS to New POS

**ID:** CR-059
**Type:** CR (Change Request)
**Created:** 2026-07-06
**Status:** INTAKE → DISCOVERY
**Priority:** TBD (pending discovery)
**Risk:** MEDIUM (estimated — money-adjacent module, needs R6 review post-discovery)
**Sprint:** POS 5.0
**Source:** OWNER-REPORTED

---

## Summary

Integrate the Expense Module from the old POS system into the new POS. The module already exists and runs in production on the old POS. Goal: understand the current expense data model, API contracts, and user flows — then design and implement the equivalent in the new React POS frontend.

---

## Discovery Plan

1. **API Probing** — Owner provides curl commands for existing expense endpoints
2. **Data Model Mapping** — Extract request/response shapes, field names, types, relationships
3. **Flow Mapping** — Identify CRUD operations, list/detail views, filters, reports tie-in
4. **Role/Permission Check** — Which roles can create/view/edit/delete expenses
5. **Settlement Tie-In** — Does expense data flow into day closure / settlement reports?
6. **Design Decision** — Sidebar placement, route structure, page layout pattern

---

## Pre-Registration Checks

| Check | Result |
|---|---|
| Code Reality | **NONE** — zero expense references in `/app/frontend/src/` |
| Duplicate Check | **DISTINCT** — no existing CR/BUG for expense |
| Blast Radius | **TBD** — pending API discovery |

---

## Evidence

- Screenshots: not provided (old POS reference to come)
- API curls: pending — owner will provide during discovery session
- Steps to reproduce: N/A (new module)
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (module exists in old POS)

---

## Open Questions (to resolve during Discovery)

1. What are the expense API endpoints? (list, create, update, delete, categories)
2. What fields does an expense record contain? (amount, category, date, payee, notes, receipt?)
3. Are there expense categories/types managed separately?
4. Which user roles have access? (owner-only? manager? cashier?)
5. Does expense data appear in settlement/day-closure reports?
6. Is there an approval workflow or is it direct entry?
7. Are there recurring expenses or only one-time entries?
8. Date range filtering / reporting needs?
9. Receipt/attachment upload support?
10. Where should this live in the new POS sidebar?

---

## Next

- **DISCOVERY SESSION** — Owner provides API curls, agent maps data model and brainstorms module design.
- After discovery → Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan)
