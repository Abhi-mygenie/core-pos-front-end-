# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy frontend from Git repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `24-may`) into Emergent environment. Then investigate and fix BUG-108 Loyalty Phase C all-payload-paths gap where prepaid/place-and-pay path hardcoded `used_loyalty_point: 0`.

## Architecture
- **Frontend:** React 19.0.0 + CRACO v7.1.0 + Tailwind CSS
- **Package Manager:** Yarn 1.22.22
- **POS Backend:** `https://preprod.mygenie.online/` (external)
- **CRM Backend:** `https://loyalty-trigger-fix.preview.emergentagent.com/api`
- **Socket:** `https://presocket.mygenie.online`
- **Firebase:** Configured for push notifications and auth

## User Personas
- **Restaurant Owner/Manager:** Configures loyalty, views reports, manages orders
- **Cashier:** Places orders, collects bills, applies loyalty discounts
- **CRM Team:** Manages loyalty rules, redemption caps, tier-aware ratios

## Core Requirements
- Loyalty discount calculation via CRM `/pos/max-redeemable` (non-mutating)
- POS Frontend passes CRM-calculated values in payment payload
- POS Backend handles actual CRM redemption (no direct POS→CRM redeem call)
- Both `used_loyalty_point` and `loyalty_points_used` emitted for backward + CRM compatibility
- Loyalty gated on: customer selected, `restaurantSettings.isLoyalty`, `BUG108_FLAGS.loyaltyRatioLive`

## What's Been Implemented

### 2026-05-24: Deployment
- Cloned `24-may` branch into `/app/frontend`
- Configured all 14 environment variables
- Installed dependencies, app compiled successfully

### 2026-05-24: BUG-108 Loyalty Phase C Investigation
- Investigated all 9 payload paths (Flow 1-8 + QSR variants)
- Identified Flow 3 (prepaid) hardcoded `used_loyalty_point: 0` as root cause
- Created all-paths gap plan, flow decision reconciliation
- Verified CRM alignment (5 inputs: field rename, loyalty_discount, idempotency_key, customer gate, ratio)
- Confirmed customer gate is triple-gated, ratio reads from CRM (no hardcoding)

### 2026-05-24: BUG-108 All-Paths Fix Implementation
- **Flow 3 (prepaid/place+pay):** Fixed `used_loyalty_point` from hardcoded 0 → CRM-gated value
- **Flow 4 (bill payment):** Added `loyalty_points_used` field
- **Flow 1 & 2 (unpaid):** Added `loyalty_points_used: 0` for schema consistency
- **QSR:** Added `loyaltyPointsRedeemed`, `loyaltyRedemptionId` to paymentData
- **Files changed:** `orderTransform.js` (~9 lines), `CartPanel.jsx` (~2 lines)

### 2026-05-24: Owner Payload Verification — PASS
- **Postpaid (order 868926):** `used_loyalty_point: 663`, `loyalty_points_used: 663` ✅
- **Prepaid (restaurant 689):** `used_loyalty_point: 1052`, `loyalty_points_used: 1052` ✅
- Both flows coherent: `order_amount: 0` now explained by loyalty signal

## Prioritized Backlog

### P1 — Pending CRM Decisions
- `loyalty_idempotency_key`: CRM to decide who generates (POS Frontend builder exists as dead code)
- `loyalty_discount` ₹ field: CRM to confirm if derivable from `points × ratio`

### P2 — POS Backend Mapper
- POS Backend mapper team: audit stripped fields on `/api/pos/orders` bridge
- Ensure `used_loyalty_point` / `loyalty_points_used` pass through to CRM

### P3 — Future Enhancements
- QSR inline loyalty UI (if owner requests — currently QSR uses Full View → Flow 4)
- Coupon CRM integration (`couponLive` flag — currently `false`)
- Wallet CRM integration (`walletDebitLive` flag — currently `false`)

## Key Documents
| Document | Status | Role |
|----------|--------|------|
| `POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md` | FROZEN | Authoritative architecture |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PAYLOAD_PATHS_GAP_PLAN_2026_05_24.md` | CLOSED | 9-flow investigation |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_FLOW_DECISION_RECONCILIATION_2026_05_24.md` | CLOSED | Owner answers reconciliation |
| `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PATHS_PAYLOAD_FIX_IMPLEMENTATION_REPORT_2026_05_24.md` | VERIFIED | Final implementation + payload verification |
