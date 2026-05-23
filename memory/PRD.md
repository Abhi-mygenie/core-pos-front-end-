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
- Created `BUG108_FLAGS.js` with all flags `false` (couponLive, loyaltyRatioLive, walletDebitLive)
- Force-zero payload safety in `orderTransform.js` for coupon/loyalty/wallet fields
- Coupon section disabled with "Coming soon" helper text
- Loyalty section read-only with disabled checkbox
- Wallet section read-only with disabled checkbox + hidden amount input
- Q10 mutual exclusivity gating (manual discount vs coupon)
- CRM unavailable banner copy stored (render deferred to P2)
- Inline error styling only (no toast)
- Standard + room-service inline mirror synced

**Build:** PASS (0 errors, 1 pre-existing unrelated warning)
**Files changed:** `BUG108_FLAGS.js` (new), `CollectPaymentPanel.jsx` (modified), `orderTransform.js` (modified)

## Prioritized Backlog

### P0 — Pending Owner Smoke
- Owner must run 10-step smoke test from QA handoff doc

### P1 — CRM API Integration (BUG-108 P2)
- Wire `GET /pos/coupons/available` when CRM endpoint live
- Wire `POST /pos/coupons/validate` when confirmed
- Loyalty tier→ratio from CRM team
- Flip BUG108_FLAGS to true per endpoint

### P2 — Deferred CRs
- Wallet debit/credit lifecycle (separate Wallet CR)
- Coupon redemption/mark-used (separate Coupon CR)
- Per-coupon ROI report (ticket 108-ROI)
- Credit ↔ Wallet linkage (Q11 deferred)

## Key Documents
- Implementation Report: `POS3_0_BUG_108_P1_UI_SHELL_IMPLEMENTATION_REPORT_2026_05_22.md`
- QA Handoff: `POS3_0_BUG_108_P1_UI_SHELL_QA_HANDOFF_2026_05_22.md`
- BUG-099 Hotspot Check: `POS3_0_BUG_108_P1_BUG_099_HOTSPOT_CHECK_AND_CR_PLAYBOOK_HANDOFF_2026_05_22.md`
- Owner Approvals: `POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md`
