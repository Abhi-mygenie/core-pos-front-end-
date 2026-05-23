# POS 3.0 — PRD & Sprint Status

## Project Overview
- **App**: MyGenie Core POS Frontend (Restaurant/Hospitality POS system)
- **Source Repo**: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch**: 23-may
- **Tech Stack**: React 19.0.0, CRACO v7.1.0, Yarn 1.22.22, Node v20.20.2, Tailwind CSS 3.4.17

## What's Been Implemented

### BUG-108 P1 — Coupon/Loyalty/Wallet UI Shell (2026-05-22, verified 2026-05-23)
**Status:** `bug_108_p1_ui_shell_implemented_waiting_owner_smoke`

- Removed hardcoded FLAT50/SAVE10 mock coupons
- Created `BUG108_FLAGS.js` with all flags `false`
- Force-zero payload safety in `orderTransform.js`
- Coupon/Loyalty/Wallet sections disabled with helper texts
- Q10 mutual exclusivity gating
- Standard + room-service inline mirror synced

### BUG-108 Loyalty Contract Verification (2026-05-23)
**Status:** `bug_108_loyalty_contract_partially_verified_waiting_api_gaps`

- CRM loyalty API contract GREEN-LIGHT (3 endpoints, 6-key blob, 63/63 QA)
- Owner directed: Loyalty FIRST (coupon and wallet deferred)
- 9 gaps identified (2 P0 blockers, 4 P1 required, 1 P2 clarification, 1 future CR, 1 verify)
- 5 owner/CRM questions raised (Q-L1 through Q-L5)
- Recommended phase: B (read-only + calculated preview)

## P0 Blockers for Loyalty Implementation
1. **GAP-L1**: CRM test pod API key — current POS keys don't authenticate against `crm-integration-test-3`
2. **GAP-L2**: Customer data pipeline broken — CartPanel drops CRM loyalty data
3. **GAP-L3**: Field name mismatch — `loyaltyPoints` vs `totalPoints`

## Prioritized Backlog

### P0 — Immediate
- Owner answers Q-L1 through Q-L5
- CRM team provides valid API key for test pod (GAP-L1)
- Owner runs P1 UI shell smoke test (10 steps)

### P1 — Loyalty Implementation (after P0 resolved)
- Fix customer data pipeline (GAP-L2)
- Fix field name mismatch (GAP-L3)
- Consume loyalty blob fields in customerTransform (GAP-L4)
- Update loyalty math to use points_value/ratio_per_point (GAP-L5)
- Add loyalty_enabled gate (GAP-L6)
- Verify no code reads removed CRM keys (GAP-L9)

### P2 — Deferred
- Max usable points/amount cap clarification (GAP-L7)
- Coupon APIs (CR-001C-C)
- Wallet APIs (CR-001C-W)
- Loyalty redemption API (future CR) (GAP-L8)

## Key Documents
- Loyalty Contract Verification: `POS3_0_BUG_108_LOYALTY_CONTRACT_VERIFICATION_2026_05_23.md`
- CRM Handoff: `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`
- P1 Implementation Report: `POS3_0_BUG_108_P1_UI_SHELL_IMPLEMENTATION_REPORT_2026_05_22.md`
- P1 QA Handoff: `POS3_0_BUG_108_P1_UI_SHELL_QA_HANDOFF_2026_05_22.md`
