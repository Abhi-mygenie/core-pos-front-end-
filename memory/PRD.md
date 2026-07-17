# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy existing React frontend repo (core-pos-front-end-, branch 17-july) into /app and run as-is. Subsequently implement expense module bug fixes.

## Architecture
- Frontend: React 19 + CRACO + Tailwind + Radix/shadcn on port 3000
- Backend: External Laravel API at preprod.mygenie.online
- Socket: presocket.mygenie.online
- Auth: Firebase

## Implemented (2026-07-17)
- Deployed branch 17-july, frontend running
- BUG-205: Qty/Unit columns in expense tables + export
- BUG-203 Sub-A: Stock Master inline price edit (prior session)
- BUG-203 Sub-B: Bulk Editor new row price input + save chain
- BUG-203 Sub-C: pricedItems edit-vs-add in Bulk Editor save
- BUG-203 Sub-D: Edit expense row qty auto-calc for priced items
- BUG-177/178/179/180/181: Retroactively registered as IMPLEMENTED
- BUG-182: CLOSED (investigation — names consistent)
- BUG-202: IMPLEMENTED (backend confirmed working, FE already coded)

## Prioritized Backlog
- P0: Owner smoke batch for all shipped items
- P1: BUG-201 full (backend-blocked), CR-062 (backend-blocked)
- P2: Finding C (physical_quantity decision)
