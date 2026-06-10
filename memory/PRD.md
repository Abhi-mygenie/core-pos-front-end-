# MyGenie POS — Project State

## Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `10-june`
- Cloned directly into `/app` (platform `.git` and `.emergent` preserved).

## Architecture
- Frontend: React 19 (CRA + CRACO), Tailwind, Radix UI, Firebase, Socket.IO client.
- Backend: STOPPED in this sandbox (per owner instruction — repo backend stub not in use).
- External services consumed by the frontend:
  - POS API: https://preprod.mygenie.online/ (`REACT_APP_API_BASE_URL`)
  - Socket: https://presocket.mygenie.online
  - CRM: https://crm.mygenie.online/api
  - Firebase project: mygenie-restaurant

## Test access
- Credentials: see `/app/memory/test_credentials.md` (cafe103 owner — preprod).
- Frontend served on supervisor `frontend` (port 3000), exposed via preview URL in `frontend/.env`.

## Done (2026-06-10)
- Repo cloned into `/app`, scaffold removed, deps installed (`yarn install` ✓).
- `frontend/.env` configured with all 14 required env vars.
- `backend` supervisor service stopped; frontend running on port 3000 — login page renders.
- Baseline read of project (CRs, BUGs, sprint reconstruction) — see chat log; no canonical sprint board file exists in repo.
- **CR-020 registered** (see `memory/change_requests/CR_020_COLLECT_BILL_SPLIT_PAYMENT_CR.md`) — 4 defects in the Collect Bill / split-payment rail. Currently at Gate 5 (Owner Decisions, partial).

## Active CRs / Backlog

### CR-018 — Schedule Order (pos_4_0)
- Doc: `memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md`
- Status: OPEN — GATE 3 (Plan). Phase 1 G1–G4 done in code; G5–G10 pending implementation.
- Priority: P1.

### CR-020 — Collect Bill Split-Payment defects (pos_4_0) — P0
- Doc: `memory/change_requests/CR_020_COLLECT_BILL_SPLIT_PAYMENT_CR.md`
- Status: OPEN — GATE 5 (Owner Decisions, partial — 2 of 5 picks recorded).
- 4 defects bundled (B1 payload-drop, B2 stale-on-bill-change, B3 Card-Txn-ID-exploit, B4 no sum-check). Combined effect = silent under-collection of cash (confirmed by owner screenshots).
- Owner picks so far: **B2 → clear-all on bill drop**, **B3 → fix both halves (validator gate + B4 sum-check ship together)**.
- Blocking next gate (Gate 6 Code): owner picks for OD-020-1 (B1 style), OD-020-3 (B2 on bill rise), OD-020-4 (B4 strictness), OD-020-5 (Card Txn ID visual).
- Files to touch when unblocked: `components/order-entry/CollectPaymentPanel.jsx`, `api/transforms/orderTransform.js`. No backend changes.

## Implementation-agent handoff checklist (when picking up CR-020)
1. Read `memory/change_requests/CR_020_COLLECT_BILL_SPLIT_PAYMENT_CR.md` end-to-end — §2 has root-cause file:line refs, §4 has the patch recipe, §7A has the live screenshot evidence and QA repro recipe.
2. Confirm all 5 picks in §6 are filled (any OPEN row means STOP — do not code yet).
3. Implement in the order in §4.2 (B3 → B4 → B2 → B1).
4. Use `memory/test_credentials.md` (cafe103 owner) for preprod smoke.
5. Update §7 Artifact Tracker as gates flip (Gate 6 → Gate 7 → Gate 8 → Gate 9).
6. On Gate 8 (QA), run the QA repro recipe in §7A end-to-end and attach a network-tab screenshot showing `partial_payments[]` in the BILL_PAYMENT request body.

## Future / Deferred
- BUG-037 experimental flip (`F_ORDER_STATUS_API[5] = 'serve'`, `api/constants.js` L188) — pending live-test outcome on rest 523.
- CHG-037 (Sprint 3 — Place Order categoryId+tax threading) — pending backend endpoint.
- CHG-040 (`EDIT_ORDER_ITEM = 'TBD'`) — endpoint not exposed yet.
- BUG-108 Wallet (`walletDebitLive=false`) — separate CR not started.
- FE-89 (delivery_charge_gst backfill) — backend-side, self-heals when shipped.
