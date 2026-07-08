# PRD — MyGenie POS (core-pos-front-end)

## Original Problem Statement
Clone and deploy React-based POS frontend from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `6-july`). Then operate per AGENT_PROMPT_ALPHA v0.7 for BUG-168 print subtotal investigation and planning.

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS + Radix UI + Socket.io
- **Backend:** FastAPI (minimal local), Laravel backend at `preprod.mygenie.online`
- **External APIs:** preprod.mygenie.online (main), presocket.mygenie.online (websocket), crm.mygenie.online (CRM)

## What's Been Done

### Session 1 — Deployment (July 8, 2026)
- Cloned repo, installed deps, configured env, services running

### Session 2 — BUG-168 Re-Investigation (July 8, 2026)
- Root cause: 3-layer data loss (missing API field → polling overwrite → FE fallback)
- Backend fix deployed: `employee-orders-list` now returns `order_sub_total_amount`
- Identified 4 FE simplifications needed
- No code changes

### Session 3 — BUG-168 Planning Gate 2+3 (July 8, 2026)
- Impact Analysis complete: 1 file, manual print path only, Collect Bill untouched
- Implementation Plan complete: 5 edits in `orderTransform.js`
- Core change: gate FE computation behind `hasFinancialOverrides`, manual print uses backend values
- Verification matrix: 8 checks (all manual)
- Awaiting Gate 4 GO

## Prioritized Backlog
- **P0:** BUG-168 IMPLEMENTATION — 5 edits in `orderTransform.js` (Gate 4 GO pending)
- **P2:** BUG-168 Phase 2 — addon display qty in CartPanel/CollectPaymentPanel (separate scope)
- **P3:** BUG-171 candidate — receipt total ≠ sum of line items (may be backend/template issue)

## Next Tasks
1. Owner Gate 4 GO
2. IMPLEMENTATION of 5 edits per plan
3. QA verification (8 test cases)
4. Owner smoke on preprod
