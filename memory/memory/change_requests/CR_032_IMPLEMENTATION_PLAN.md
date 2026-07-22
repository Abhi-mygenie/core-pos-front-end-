# CR-032 — Implementation Plan (Gate 3) — One payment classifier

**Date:** 2026-06-11 · Workstream B · Decisions: Q2 (3 API groups verified), H25 (zero-bill orders stay counted, flagged via discount), 'pending' = unpaid (auto-excluded by fs-6 gate, live-verified fs 2/5)

## Scope (LOCKED)
Single classifier module; three consumers swap to it. Display-only — revenue gates unchanged.

## Changes
1. NEW `frontend/src/utils/paymentClassifier.js` (promote PaymentsMockup's `classifyPaymentMethod`, extend):
   - Buckets: `Cash · Card · UPI · Room Bill (pm='ROOM') · Partial · Zomato Gold · Other(+console.warn unknown enum)`
   - `cash_on_delivery` → Cash (explicit rule, not substring luck)
   - `pending` → null (unpaid marker; never in paid mix — fs gate already excludes, defense-in-depth)
   - `TAB` → handled by CR-030 (excluded from mix; settlements appear as Credit Cash/Card/UPI group)
   - `transferToRoom` → pre-checkout state, not revenue (Running) — classifier returns null for mix
2. Consumers: `SalesMockup.jsx` (replace inline chain), `PaymentsMockup.jsx` (import swap), `insightsService.js` Dashboard chain
3. Chart structure = 3 groups (Q2): order_payment-style buckets / Credit settlements / Room Bill

## Expected number shifts
Bucket re-labels only; group totals = revenue totals per CR-030 spec. Mar Palm House: Room Bill group surfaces (₹18,351-class May), partial unified across screens (was ₹2,268 vs ₹9,858 due to room scope — converges after CR-029).

## QA
Harness: `sales.pm` ≡ `dashboard.pm` bucket sets post-change (same scope), both restaurants; zero-bill orders still counted in order counts (H25); 'pending' never in any paid bucket.

## Freeze-log
S7/S8 amendments at Gate 4 (combined with CR-029/030 entries).

## Rollback
Import swap back to local chains.
