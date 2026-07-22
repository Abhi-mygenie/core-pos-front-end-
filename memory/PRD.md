# MyGenie POS Frontend — Project PRD

## Original Problem Statement
Deploy the existing React frontend repo (`https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch `main`) into `/app`, connected to live pre-prod backend (`preprod.mygenie.online`). Ongoing active development with strict gate-based change-control protocol.

## Architecture
- **Frontend:** React (CRA + CRACO), Tailwind CSS, Axios, Socket.io-client, Firebase, jsPDF, xlsx, recharts
- **Backend:** Laravel at `preprod.mygenie.online` (pre-prod)
- **Auth:** Firebase
- **Gate System:** AGENT_PROMPT_ALPHA.md (`/app/memory/control/`) — strict 7-gate flow per bug/CR
- **Control Docs:** `/app/memory/control/registry.json`, `BUG_TRACKER.md`, `FILE_OWNERSHIP.md`

## What's Been Implemented (Chronological)

### 2026-07-21 (Session 1 - Fork origin)
- Repo deployed and running on port 3000
- BUG-213: IngredientBulkEditor page title fix (DONE)
- QA Batch: 27/27 tests PASS (Inventory module — BUG-211, BUG-212, CR-086, CR-085 Ph1, BUG-213)
- Gate 2 Impact Analysis: Complete for all open Expense, Inventory, Employee items

### 2026-07-22 (Session 2 - This fork)
- OQ answers processed for CR-062 and new payment fields
- CR-087 registered (payment_made_to + payment_ref_id new fields)
- CR-062 backend contract document written
- BUG-201 Phase 1: IMPLEMENTED — impact-aware delete modal on expense items

## Current Sprint Status (POS 5.0)

### Ready to Implement
- CR-087 (New Payment Fields) — Gate 2 complete, Gate 3 plan ready
- BUG-201 Phase 1 — ✅ IMPLEMENTED (2026-07-22)

### Planning Phase (OQs Open)
- CR-086 F5 (Ingredient Import) — 4 OQs open
- CR-078 (Smart Purchase Redesign) — 6 OQs open
- CR-077 Ph2 (Hierarchy Stock Transfer) — 6 OQs open + master creds needed
- CR-062 (Report Aggregation) — Contract written, backend-blocked

### Hard Blocked
- CR-076 (S3 Upload) — backend must deliver upload endpoint first
- BUG-124 (Socket payload) — backend-only fix
- CR-071 / CR-068 (Role Gating) — blocked on CR-057 + CR-058 (INTAKE, not started)

## P0/P1/P2 Backlog

### P0 (Critical Path)
- [ ] CR-087 — New expense payment fields (Gate 3 implementation)
- [ ] Owner smoke on BUG-201 Phase 1

### P1 (Next Sprint)
- [ ] CR-086 F5 — Ingredient Import wiring (4 OQs to clear)
- [ ] CR-078 — Smart Purchase Redesign (6 OQs to clear)
- [ ] CR-077 Ph2 — Hierarchy Stock Transfer (needs master-outlet creds)
- [ ] CR-057 + CR-058 — INTAKE needed (prerequisite for CR-071)

### P2 (Future)
- [ ] CR-076 — S3 File Upload (backend-blocked)
- [ ] CR-071 — App-Wide Role Gating (blocked on CR-057 + CR-058)
- [ ] CR-068 — Cancellation Role Gating (blocked on CR-071)
- [ ] CR-062 FE implementation (backend must deliver aggregation endpoint)

## Test Credentials
See `/app/memory/test_credentials.md`
