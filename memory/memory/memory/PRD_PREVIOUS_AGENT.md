# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy core-pos-front-end React app from GitHub (branch: 27-may). Then investigate Audit Report API performance, data gaps, and plan optimizations.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + shadcn
- **Backend APIs**: preprod.mygenie.online (main), presocket.mygenie.online (socket), Firebase, CRM
- **Preview URL**: https://insights-phase.preview.emergentagent.com

## What's Been Done

### Deployment (2026-05-27)
- [x] Cloned repo, configured 14 env vars, installed deps, frontend running

### Audit Report Investigation (2026-05-28) — NO CODE CHANGES
- [x] Traced complete API call chain (3+N calls on page load)
- [x] Confirmed `get-single-order-new` on row click is fully eliminable
- [x] Identified `order_details_table[]` has 47 fields per item, only 2 read
- [x] Discovered `operations[]` lifecycle audit trail (unused by frontend)
- [x] Identified 6 backend gaps with exact order IDs across 3 restaurants
- [x] Created backend gaps report with verification order IDs
- [x] Created contract freeze document (pending both-party sign-off)
- [x] Created frozen implementation plan (4 diffs, 4 files, 15 tests)

## Documents Created
- `/app/memory/bugs/AUDIT_REPORT_API_INVESTIGATION_2026_05_27.md`
- `/app/memory/bugs/AUDIT_REPORT_BACKEND_GAPS_2026_05_28.md`
- `/app/memory/bugs/AUDIT_REPORT_CONTRACT_FREEZE_2026_05_28.md`
- `/app/memory/change_requests/AUDIT_REPORT_OPTIMISE_CR_PLAN_2026_05_28.md`

## Prioritized Backlog
- P0: Backend fixes (GAP 1-5) — pending backend team
- P0: Owner sign-off on CR plan
- P1: Implement CR (4 diffs) after sign-off
- P2: Backend GAP-6 (serve_at) + GAP-7 (subtotal) + GAP-8 (SRM payment_method)

## Test Credentials
- owner@cafe103.com / Qplazm@10 (rid=644, no rooms, postpaid)
- vishal@pav.com / Qplazm@10 (rid=383, prepaid, has ready_at)
- owner@palmhouse.com / Qplazm@10 (rid=541, rooms, mixed)
