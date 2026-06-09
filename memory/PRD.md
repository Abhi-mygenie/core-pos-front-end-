# PRD — MyGenie Core POS Frontend

## Problem Statement
Deploy and maintain the MyGenie Core POS Frontend — a React-based restaurant POS system connecting to external APIs (preprod.mygenie.online, presocket.mygenie.online, crm.mygenie.online).

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS + Radix UI + Firebase
- **Backend APIs:** External (preprod.mygenie.online)
- **Socket:** External (presocket.mygenie.online)
- **CRM:** External (crm.mygenie.online)
- **Branch:** 9-june

## Session Log (2026-06-09)

### CR-016 Settlement Report (Insights) — CLOSED, OWNER VERIFIED
- 7/7 gates complete in single session
- 3 new files + 2 modified. 20/20 QA. Active-only days + waiters (post-smoke fix)

### CR-015 Settlement Module — CLOSED, OWNER VERIFIED
- Owner smoke passed (was pending from previous session)

### BUG-120 CR-014 Menu Mgmt Post-Delivery (5 sub-bugs) — ALL CLOSED
- **A:** Input focus loss — moved InputField/SelectField/ToggleField to module scope
- **B:** Image upload — documented (preprod.mygenie.online/storage/restaurant_panel/aggregater_img/)
- **C:** Variation CRUD UI + 8-section form redesign — ProductForm.jsx rewritten
- **D:** 6 API fields wired — is_inventory, packed_food, stock_out, is_disable, tax_calc, portion_size
- **E:** Socket→MenuContext — validated. Edit emits `update-food`, handler works. Status toggle/delete/reorder socket pending backend (FE handler ready)
- **Bonus:** Number input zero-clear on focus

### BUG-121 Category Count + Post-Save Refresh — CLOSED, OWNER VERIFIED
- **A:** Category count derived from foods array via useMemo (API has no count field)
- **B:** 500ms delay on post-save refresh to avoid race condition

## All CRs Status

| CR/Bug | Title | Status |
|--------|-------|--------|
| CR-015 | Settlement Module | CLOSED — OWNER VERIFIED |
| CR-016 | Settlement Report (Insights) | CLOSED — OWNER VERIFIED |
| BUG-120 | Menu Mgmt Post-Delivery (5 sub-bugs) | ALL CLOSED |
| BUG-121 | Category Count + Refresh | CLOSED — OWNER VERIFIED |
| BUG-120-E (backend) | Socket for status/delete/reorder | Pending backend — FE ready |
| BUG-117 | Tax Key Interpretation | BLOCKED — backend clarification |

## Open / Backlog
| Priority | Item | Status |
|----------|------|--------|
| P2 | BUG-117 Tax key interpretation | BLOCKED on backend |
| P2 | BUG-120-E socket for status/delete/reorder | Backend to add emit |
| P3 | CR-014 Phase 2B Excel import/export | Deferred |
| P3 | station_name at food level | Backend to add in future phase |
