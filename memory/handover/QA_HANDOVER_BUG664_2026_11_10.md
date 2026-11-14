# QA HANDOVER — BUG-664 → QA (Gate 5B)

**Date:** 2026-11-10 · **From:** IMPLEMENTATION (Gate 5A) · **To:** QA
**Item:** BUG-664 — Tile turns green on Place Order with no bill printed
**Severity:** P1 · **Risk:** HIGH · **Sprint:** nov_cr_batch

## 1. What was changed — 1 line + test update

| File | Change |
|---|---|
| `src/api/transforms/orderTransform.js` L313 | `billPrinted: api.bill_print === 'Yes'` — removed `\|\| api.print_bill_status === 'Yes'` |
| `src/__tests__/api/transforms/orderTransform.bug583.test.js` | 2 tests updated: `print_bill_status` alone now expects `false`. 6/6 PASS. |

## 2. Self-test: 6/6 unit tests PASS. Webpack 0 new warnings.

## 3. QA verification

| # | Test | Expected |
|---|---|---|
| V1 | Place a prepaid order on restaurant with auto-bill=Yes → check tile immediately | Tile should **NOT** go green (no bill printed yet) |
| V2 | Place same order, then actually print the bill | Tile **does** turn green after print |
| V3 | Postpaid order placed (no auto-bill) | Tile white until bill printed |
| V4 | Unit tests 6/6 | All PASS |
| V5 | Webpack | 0 new warnings |

## 4. Still open (non-blocking — separate decisions needed)
- **OD-INV-01:** Should green require a restaurant setting? Currently applies to all.
- **H3:** Should "queued in temp store" = "printed"? Needs owner + backend decision.
- **F-B:** Postpaid green background from screenshot — backend investigation ongoing.

## 5. Registry: GATE_5A — EXIT GATE 5/5 PASS

## 6. Credentials
- POS: https://c4220e7e-e76a-4ba7-b323-bd65e8947f74.preview.emergentagent.com
- cafe103: owner@cafe103.com / Qplazm@10
- Ruby: owner@ruby.com / Qplazm@10
