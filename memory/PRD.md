# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy React frontend repo (branch `17-july`), run as-is. Then execute expense module improvements: CR-074-B closeout, BUG-203 (unit price editing), BUG-204 (qty × unitPrice auto-calc).

## Architecture
- **Tech Stack**: React 19, CRACO, Tailwind CSS, Radix UI, Firebase, Axios, Socket.io
- **Process Manager**: Supervisor (`yarn start` → `craco start` on port 3000)
- **Backend**: Laravel at preprod.mygenie.online (external)
- **Socket**: presocket.mygenie.online

## What's Been Implemented (2026-07-17)

| Item | Status | Test |
|---|---|---|
| Deployment (branch 17-july) | ✅ Running | HTTP 200 |
| CR-074-B Phase 6 Closeout | ✅ EXIT GATE 5/5 | iteration_29 |
| BUG-204 — Qty × unitPrice auto-calc | ✅ IMPLEMENTED | iteration_30 |
| BUG-203 Sub-A — Stock Master inline edit price | ✅ IMPLEMENTED | iteration_30 |
| BUG-203 Sub-A — Label fixes (Unit Price column) | ✅ IMPLEMENTED | Compile clean |

## Planned (Gate 3 ready, awaiting Gate 4 GO)

| Item | Plan | Files |
|---|---|---|
| BUG-203 Sub-B — Bulk Editor new row price | `plans/BUG-203_SUBBCD_IMPLEMENTATION_PLAN.md` | BulkEditor |
| BUG-203 Sub-C — Bulk Editor edit price fix | Same plan | BulkEditor + SetupPanel |
| BUG-203 Sub-D — Edit expense qty/amount for priced items | Same plan | EntryPanel |

## Unregistered Findings

| Finding | Description | Action needed |
|---|---|---|
| Qty/Unit display gap | Backend returns quantity+unit per transaction but neither transaction table nor report shows them | Register as bug → implement (~20 lines, 2 files) |
| physical_quantity dead feature | Collected in form, stored in DB, displayed nowhere. Transform says "deprecated" | Owner decision: keep/remove/display? |

## Prioritized Backlog
- **P0**: Gate 4 GO → BUG-203 Sub-B/C/D implementation
- **P0**: Register qty/unit display gap bug
- **P1**: Owner Smoke for shipped items (CR-074-B, BUG-204, BUG-203 Sub-A)
- **P1**: BUG-199 (category_id not sent in expense payload)
- **P2**: Owner decision on physical_quantity
- **P2**: Backend briefs: §3.4 (PUT unit_price), bulk endpoints, cascade rules

## Next Session Tasks
1. BUG-203 Sub-B/C/D implementation (plan ready)
2. Register + implement qty/unit display columns
3. BUG-199 intake → implement
4. Owner Smoke batch
