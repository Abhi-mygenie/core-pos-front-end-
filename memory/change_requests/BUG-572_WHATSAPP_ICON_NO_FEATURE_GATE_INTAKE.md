# BUG-572 — Intake (Gate 1)
## WhatsApp Payment Icon — Shown to ALL restaurants with no feature gate

**ID:** BUG-572 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Payments / Coupons / Credit
**Duplicate check:** RELATED to CR-017 (introduced WhatsApp payment link). BUG-572 is the missing gate — DISTINCT fix.
**Source:** OWNER-REPORTED (smoke test 2026-10-16)
**Fast Lane eligible:** YES (after OD-572-01 is answered)

## Description
The WhatsApp payment link icon (green WhatsApp button) shows on ALL order cards for ALL restaurants. It should only appear for restaurants that have the WhatsApp payment link feature enabled/configured.

## Code Reality: CONFIRMED GAP
`OrderCard.jsx:L137` — `showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus)` — no restaurant feature flag. `L1077` — `{!isAggregator && showWhatsAppPayment && ...}` — only hidden for aggregator orders. No `restaurant.features.*` check exists.

## Evidence
Screenshots (second screenshot) show WhatsApp icon on multiple order cards.

## Blast Radius: SMALL
- `OrderCard.jsx` — 1 condition addition (L137 or L1077)
- Possibly `profileTransform.js` — confirm feature flag key

## Open Decisions
**OD-572-01:** What is the correct feature flag / profile setting key that gates WhatsApp payment link? (e.g., `restaurant.features.whatsappPaymentLink`, or a CRM-linked setting?) → needs backend/profile API check.
