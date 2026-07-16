# MyGenie POS — CR-069 + CR-072 PRD

## Original Problem Statement
Deploy existing React frontend repo and implement CR-069 (Employee Management) + CR-072 (Inventory Management) modules — migration from old POS.

## Architecture
- **Stack**: React 19, CRA + CRACO, Tailwind CSS, Radix UI/shadcn, React Router
- **Backend**: External Laravel API at preprod.mygenie.online
- **Process**: Supervisor (yarn start on port 3000)

## What's Been Implemented (Jul 15, 2026)

### CR-069 Wave 1 — Employee Management (14 files, ~1,500 lines, 23/23 tests)
- Employee CRUD: inline editable grid, add/edit/search/toggle/reset password
- Role Management: rich 6-column table, 8-group permission editor (52 permissions)
- PermissionGate component for Wave 2 consumer wiring

### CR-072 Phase 1 — Inventory Management (19 files, ~2,935 lines, 21/21 tests)
- Stock Dashboard: 4 KPIs, 427 stock items table with filters/search/status badges
- Purchase Entry: multi-line form with ingredient picker, auto-calc amounts
- Physical Count: system vs physical qty with drift indicators + wastage reasons
- Inventory Setup: 3 tabs (429 ingredients with 31 categories, 5 vendor types, 4 wastage reasons)
- Recipes: 3 tabs (64 standard, 11 sub-recipes, 7 addon) with card grid + create/edit form
- Sidebar: Inventory section with 5 sub-items

## Backlog
- **P0**: CR-072 Phase 2 — Intelligence features (6 backend endpoints needed — backend brief filed)
- **P0**: CR-071 — Permission consumer wiring (Wave 2, ~30 files)
- **P1**: CR-068 — Cancellation Role-Gating
- **P2**: Employee Phase 2 — attendance/shifts/payroll
