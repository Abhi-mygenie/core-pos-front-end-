# BACKEND_BRIEF_BUG482_DUPLICATE_SETTLEMENT_2026_09_27

## Summary
- **Issue:** Settling a previously-settled order a second time (via Unpaid → Re-settle) appends a second payment allocation row instead of replacing the first. A ₹160 order ends up with ₹320 worth of payment entries.
- **Classification:** BACKEND_BUG
- **Frontend impact:** Financial reports double-count revenue. Settlement totals are incorrect. Day closure figures are wrong.
- **Priority/Risk:** P0 / CRITICAL — active financial data corruption

## Expected Rule (Owner-confirmed)
> "Making an order Unpaid must reverse/invalidate the previous settlement allocation; re-settlement must not append another active payment allocation to the same order."
> Previous settlement entries should be **reversed/replaced**, not accumulated.

## Endpoints Involved

### Endpoint 1 — Make Order Unpaid
- **Method:** POST
- **URL:** `/api/v2/vendoremployee/make-order-unpaid`
- **Payload:** `{ order_id: <numeric DB id> }`
- **Current behaviour:** Flips `payment_status` to `unpaid` ONLY
- **Required behaviour:** Also void/reverse all existing `payment_allocations` for this order

### Endpoint 2 — Re-settle (Old POS or New POS)
- **Method:** POST (collect-bill / settle-order endpoint)
- **Current behaviour:** Appends NEW payment allocation row
- **Required behaviour:** No change needed here IF Endpoint 1 properly voids previous allocations first

## Reproduction
1. Place a ₹160 order and settle it (Cash)
2. From Audit Report → click "Make Unpaid" on that order
3. Re-settle the same order (Cash again)
4. Check payment allocations → expect: 1 row of ₹160. Actual: 2 rows totalling ₹320

## Impact
- Settlement Report totals inflated
- Day Closure cash balance wrong
- Audit Report shows incorrect payment breakup
- Financial reporting unreliable for any order settled more than once

## Frontend Workaround
- **Available:** NO — this is a pure backend data integrity issue
- FE correctly calls `make-order-unpaid` endpoint; no client-side payment ledger management is possible

## Recommended Backend Fix
1. In `make-order-unpaid` handler: before flipping status, insert a reversal/void record for all existing payment allocations on that order_id (or soft-delete them)
2. Ensure settlement endpoint checks for existing active allocations before inserting (idempotency guard)
3. Add a unique constraint or status check: only 1 active allocation per order at a time
