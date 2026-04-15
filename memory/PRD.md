# Core POS Frontend - PRD

## Original Problem Statement
- Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git (main branch)
- React frontend only — connected to external MyGenie preprod API + Socket server
- Run as-is, no modifications
- Documentation, architecture analysis, refactor planning, and task creation

## Project Overview
**MyGenie Restaurant POS System** — Point of Sale frontend for restaurant management.

## Tech Stack
- React 19, CRACO, Tailwind CSS, Radix UI, Socket.IO, Axios, React Router v7

## What's Been Implemented (Jan 2026)

### Session 1: Setup + Run
- Pulled code from GitHub, configured env, frontend running on port 3000

### Session 2-3: Discovery + Validated Architecture
- 5 discovery docs + VALIDATED_ARCHITECTURE.md (840 lines, 8 sections)

### Session 4: Refactor Backlog
- REFACTOR_BACKLOG.md — 18 items, 6 phases, full traceability

### Session 5: Execution-Ready Task Documents
- Created 3 task documents (797 lines total):
  1. TASK_RV1_FINANCIAL_TRUST.md (258 lines) — Validation: does backend trust frontend totals?
     - 3 progressive tests (simple order, deliberately wrong value, complex item)
     - Monkey-patch FormData approach for the "wrong value" test
     - 4 possible outcomes (TRUSTS/RECALCULATES/VALIDATES/MIXED)
     - Exact next prompts for each outcome
  2. TASK_P0_3_SOCKET_DEDUP.md (298 lines) — Implementation: per-orderId dedup
     - 5 implementation steps with exact code snippets
     - ABORTED sentinel pattern for distinguishing abort from API-not-found
     - handleNewOrder special handling (sync part unaffected)
     - handleUpdateOrderStatus special handling (removeOrder distinction)
     - Full rollback procedure
  3. TASK_RV4_MULTI_ORDER_PER_TABLE.md (241 lines) — Validation: multi-order per table
     - Console script, curl alternative, and real-time monitor
     - 3 possible outcomes with escalation rules
- Created /app/memory/v2/evidence/ directory for test artifacts

## Memory Folder Contents (v2/)
| File | Lines | Purpose |
|------|-------|---------|
| PROJECT_INVENTORY.md | 207 | Structure, technologies |
| ARCHITECTURE_CURRENT_STATE.md | 375 | System overview, flows |
| MODULE_MAP.md | 248 | 8 modules mapped |
| RISK_REGISTER.md | 199 | 17 risks |
| OPEN_QUESTIONS_FROM_CODE.md | 205 | 20 open questions |
| VALIDATED_ARCHITECTURE.md | 840 | Decision-making doc (8 sections) |
| REFACTOR_BACKLOG.md | 769 | Prioritized 18-item backlog |
| TASK_RV1_FINANCIAL_TRUST.md | 258 | Executable: financial validation |
| TASK_P0_3_SOCKET_DEDUP.md | 298 | Executable: socket dedup impl |
| TASK_RV4_MULTI_ORDER_PER_TABLE.md | 241 | Executable: table order validation |
| evidence/ | dir | Test artifacts directory |

## Immediate Next Actions (pick any — they're independent)
1. **Execute TASK_RV1** — Validate financial trust (30 min, blocks P0-1/P0-2/P0-5)
2. **Execute TASK_P0_3** — Implement socket dedup (45 min, no blockers)
3. **Execute TASK_RV4** — Validate multi-order per table (15 min, blocks P1-2)
