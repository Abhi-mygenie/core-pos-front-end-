# MyGenie POS Frontend — PRD & Session Record

## Original Problem Statement
Deploy MyGenie Core POS Frontend from GitHub repo `core-pos-front-end-` (branch: `8-june`) and implement CR-014 (Menu Management API Migration).

## Architecture
- **Type**: Frontend-only React SPA
- **Build Tool**: craco
- **UI Framework**: Radix UI + Tailwind CSS + shadcn/ui
- **External APIs**: preprod.mygenie.online, presocket.mygenie.online, crm.mygenie.online

## What's Been Implemented

### Session 1 (2026-06-08) — Deployment
- Cloned repo, configured 14 env variables, frontend running

### Session 2 (2026-06-08) — BUG-116 Patch
- New items via socket prepend to top of menu list (MenuContext.jsx)

### Session 3 (2026-06-08) — CR-014 Menu Management API Migration
- **Gate 0-1**: Registration + Intake (pre-existing)
- **Gate 2**: Impact Analysis — full API shape comparison, gap analysis, 20 API endpoints documented
- **Gate 5**: Implementation complete — all food, category, addon, station APIs wired

#### Files Created (NEW)
- `src/api/services/menuManagementService.js` — 17 API service functions (20 endpoints)
- `src/api/transforms/menuManagementTransform.js` — fromAPI + toAPI transforms

#### Files Modified
- `MenuManagementPanel.jsx` — data orchestrator, fetches all data
- `CategoryList.jsx` — real CRUD + station dropdown + DnD reorder
- `ProductList.jsx` — foods from API, status toggle, delete, reorder
- `ProductCard.jsx` — quick edit save, delete with reasons, status toggle
- `ProductForm.jsx` — add/edit via API, image upload, addon management

#### API Coverage (20 endpoints)
| # | Action | Status |
|---|--------|--------|
| 1-7,11 | Food CRUD + reorder + menu master + delete reasons + status | ✅ Wired |
| 12-15 | Category CRUD | ✅ Wired |
| 16 | Station printer list | ✅ Wired |
| 17-20 | Addon CRUD | ✅ Wired |
| 8-10 | Bulk import/export/template | Phase 2 |

#### Testing: 100% pass (iteration_2.json)

### Bug Fixes Applied
- BUG-119: Closed (backend fixed)
- BUG-121: FE defended (SOCKET_FOOD_DEFAULTS), backend pending
- allergens field type fix (array → string)
- item_type mapping fix (0=NonVeg, 1=Veg, 2=Egg, 3=Jain)
- Removed unused fields per backend: stock_out, is_disable, tax_calc, is_inventory, packed_food, station (food-level)
- Fixed duplicate Price field in ProductForm

## Backlog
- P1: BUG-120 — Place Order 401 silent redirect
- P1: BUG-118 — Nth-item / BOGO coupon testing
- P2: BUG-121 — Backend socket payload enrichment
- P2: CR-014 Phase 2 — Bulk import/export/template
- P2: CR-015 — Settlement Module

## Test Credentials
- owner@kunafamahal.com / Qplazm@10
- owner@lafetta.com / Qplazm@10 (rid=78, VAT items)
