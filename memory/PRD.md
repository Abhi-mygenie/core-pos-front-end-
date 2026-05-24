# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy frontend from Git repo (branch 24-may) + BUG-108 Loyalty Phase C all-paths payload fix.

## Architecture
- React 19 + CRACO + Tailwind CSS
- External backend: preprod.mygenie.online
- CRM: loyalty-trigger-fix.preview.emergentagent.com/api

## What's Been Implemented
- **2026-05-24:** Deployed 24-may branch, all env vars configured
- **2026-05-24:** BUG-108 Loyalty Phase C all-paths fix:
  - Flow 3 (prepaid): fixed hardcoded `used_loyalty_point: 0` → CRM-gated values
  - Flow 4 (bill payment): added `loyalty_points_used` field
  - Flow 1 & 2 (unpaid): added `loyalty_points_used: 0` for schema consistency
  - QSR: added missing `loyaltyPointsRedeemed` key to paymentData
  - All flows now emit both `used_loyalty_point` and `loyalty_points_used`

## Backlog
- P1: `loyalty_idempotency_key` — pending CRM decision
- P1: `loyalty_discount` ₹ field — pending CRM answer
- P2: POS Backend mapper audit (stripped fields)
