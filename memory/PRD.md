# PRD — MyGenie POS (core-pos-front-end)

## Original Problem Statement
Clone and deploy React-based POS frontend from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `6-july`). Then operate as Investigation agent per AGENT_PROMPT_ALPHA v0.7 for BUG-168 print subtotal issue.

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS + Radix UI + Socket.io
- **Backend:** FastAPI (minimal local), Laravel backend at `preprod.mygenie.online`
- **External APIs:** preprod.mygenie.online (main), presocket.mygenie.online (websocket), crm.mygenie.online (CRM)
- **Database:** MongoDB (local backend only)

## What's Been Done

### Session 1 — Deployment (July 8, 2026)
- Cloned repo from GitHub branch `6-july`, installed dependencies, configured env
- Frontend + backend running via supervisor
- All tests passing (10/10 backend, frontend verified)

### Session 2 — BUG-168 Re-Investigation (July 8, 2026)
- Full re-investigation of print subtotal drift issue
- Root cause: 3-layer data loss (missing API field → polling overwrite → FE fallback)
- Backend fix deployed: `employee-orders-list` now returns `order_sub_total_amount`
- Identified 4 FE simplifications needed in `buildBillPrintPayload`
- No code changes — investigation only
- 3 artifacts produced: Investigation Report, Audit, Exact Changes Required

## Prioritized Backlog
- **P0:** BUG-168 FE implementation — remove wrong FE computations, use backend values (4 changes in `orderTransform.js`)
- **P1:** Owner decision on GST/VAT tax split for print payload
- **P2:** BUG-169 candidate — double-SC in `finalOrderSubtotal` fallback (will be resolved by Change 4)
- **P2:** BUG-170 candidate — variation upcharge miss (will be resolved by Change 3 — backend value includes it)
- **P3:** BUG-171 candidate — receipt total ≠ sum of line items (may be backend/template issue)

## Next Tasks
1. Owner decision on Change 6 (tax split): Option A, B, or C
2. PLANNING Gate 2-3 for BUG-168 FE implementation
3. IMPLEMENTATION of 4 changes in `orderTransform.js`
4. QA verification on manual print path
