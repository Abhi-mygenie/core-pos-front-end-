# MyGenie POS Frontend - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git main branch. React frontend only. Run as is with provided env variables.

## Architecture
- **Type**: React Frontend (CRA with CRACO)
- **Stack**: React 19, Tailwind CSS, Radix UI, Firebase, Socket.io, Recharts
- **API Backend**: https://preprod.mygenie.online/ (external)
- **Socket**: https://presocket.mygenie.online (external)
- **Port**: 3000 (supervisor managed)

## What's Been Implemented (April 13, 2026)

### Session 12 — Socket v2 Architecture Planning & Verification
- Verified ALL 10 order mutation flows via console logs
- All 10 flows confirmed v2 CLEAN (lock → payload → process → release)
- 3 new socket events discovered: `update-order-target`, `update-order-source`, `update-order-paid`
- 5 endpoints upgraded: Switch Table, Merge, Transfer Food, Collect Bill, Cancel Food
- Complete implementation spec created: `/app/memory/SOCKET_V2_FEATURE.md`
- All memory docs updated (API_DOCUMENT_V2, ARCHITECTURE, BUGS, CLARIFICATIONS, ROADMAP, CHANGELOG)
- `food_details: null` blocker identified and parked for backend

### Endpoints Changed (5 total)
| Constant | Old → New |
|----------|----------|
| ORDER_TABLE_SWITCH | v1 pos/order-table-room-switch → v2 order/order-table-room-switch |
| MERGE_ORDER | v1 order/transfer-order → v2 order/transfer-order |
| TRANSFER_FOOD | v1 order/transfer-food-item → v2 order/transfer-food-item |
| BILL_PAYMENT | v2 order-bill-payment → v2 order/order-bill-payment |
| CANCEL_ITEM | v1 order/cancel-food-item → v2 order/cancel-food-item |

## Prioritized Backlog

### P0 — Blockers
- Backend: Fix `food_details: null` in ALL socket payloads (items show "Unknown Item")
- Frontend: Implement socket v2 handlers (SOCKET_V2_FEATURE.md Steps 1-5)

### P1 — Important
- Remove BUG-216 workaround (free→engage)
- Update OrderEntry wait logic (6 handlers)
- Add waitForOrderEngaged to OrderContext

### P2 — Nice to Have
- Backend: rename `update-order-paid` event (misleading — used for ready/served/cancelled too)
- Backend: stop sending `update-table free` for cancel order (v1 artifact)
- Clean up handleUpdateFoodStatus local table engage workaround

## Next Tasks
1. Backend fixes food_details → frontend implements v2 handlers
2. 26 test cases in SOCKET_V2_FEATURE.md
3. Regression testing for all 10 flows
