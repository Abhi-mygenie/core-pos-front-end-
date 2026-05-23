# POS 3.0 — PRD & Sprint Status

## Project Overview
- **App**: MyGenie Core POS Frontend (Restaurant/Hospitality POS system)
- **Tech Stack**: React 19.0.0, CRACO v7.1.0, Yarn 1.22.22, Node v20.20.2

## What's Been Implemented

### BUG-108 P1 — UI Shell (2026-05-22)
**Status:** `bug_108_p1_ui_shell_implemented_waiting_owner_smoke`
- Removed FLAT50/SAVE10, BUG108_FLAGS, force-zero payload safety, disabled sections

### BUG-108 Loyalty Phase B — Read-Only Preview (2026-05-23)
**Status:** `bug_108_loyalty_phase_b_readonly_preview_implemented_waiting_owner_smoke`
- Fixed CartPanel data pipeline (GAP-L2) — CRM loyalty data now flows to CollectPaymentPanel
- Fixed field name reconciliation (GAP-L3) — reads `loyalty.total_points`/`points_value` from blob
- Loyalty blob consumption (GAP-L4) — synthetic blob in customerLookup, raw blob in customerDetail
- `loyaltyPreviewLive=true` flag shows real CRM data (tier badge, points, "₹X available")
- `loyalty_enabled` gate (GAP-L6) — respects CRM kill-switch
- Checkbox remains disabled, payload stays zero, no total/tax impact
- Standard + room-service mirror parity

### Build: PASS (0 errors, +395 bytes)

## Key Documents
- CR Playbook: `POS3_0_BUG_108_LOYALTY_PHASE_B_CR_PLAYBOOK_HANDOFF_2026_05_23.md`
- Implementation Report: `POS3_0_BUG_108_LOYALTY_PHASE_B_IMPLEMENTATION_REPORT_2026_05_23.md`
- QA Handoff: `POS3_0_BUG_108_LOYALTY_PHASE_B_QA_HANDOFF_2026_05_23.md`

## Backlog
- P0: Owner smoke test (8 steps)
- P1: Loyalty Phase C (real redemption — blocked by `POST /pos/loyalty/redeem`)
- P2: Coupon (CR-001C-C), Wallet (CR-001C-W)
