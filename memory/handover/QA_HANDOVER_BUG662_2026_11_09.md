# QA HANDOVER — BUG-662 → QA (Gate 5B)

**Date:** 2026-11-09 · **From:** IMPLEMENTATION (Gate 5A) · **To:** QA
**Item:** BUG-662 — Prepaid manual SC missing from place-order payload
**Severity:** P0 · **Risk:** CRITICAL (financial) · **Sprint:** nov_cr_batch

## 1. What was changed

One file: `src/components/order-entry/OrderEntry.jsx` — 2 edits.

| Edit | Line | Change |
|---|---|---|
| E1 | L1679–1682 | `scApplicable` now `&& (!!restaurant?.autoServiceCharge \|\| paymentData?.serviceCharge > 0)` |
| E2 | L2465–2466 | Same OR in inline prepaid ternary + `// BUG-662` marker |

**Not touched:** `CollectPaymentPanel.jsx`, `orderTransform.js`, `collectBillExisting`, any report/print/settlement code.

## 2. Self-test results (code-verified)

| Check | Result |
|---|---|
| V4 — regression safe (autoSC=Yes unchanged) | PASS |
| V5 — postpaid collectBillExisting untouched | PASS |
| V8 — webpack 0 new warnings | PASS |
| V9 — E1 marker present | PASS |
| V10 — E2 marker present | PASS |
| Logic trace V1 — `(false \|\| 12.38 > 0) = true → service_tax > 0` | PASS |

## 3. QA verification matrix (live preprod tests needed)

| # | Test | Steps | Expected |
|---|---|---|---|
| V1 | autoSC=No + cashier ticks SC ON → prepaid | Place prepaid order, intercept `place-order` network request | `service_tax > 0` in payload |
| V2 | autoSC=No + cashier leaves SC OFF → prepaid | Same flow, SC unticked | `service_tax = 0` in payload |
| V3 | autoSC=Yes + SC ON (default) → prepaid | Regression — normal flow | `service_tax > 0` |
| V4 | autoSC=Yes + cashier unticks SC → prepaid | Regression | `service_tax = 0` |
| V5 | Postpaid collect-bill (autoSC=No, manual ON) | Settle postpaid order | Still works, `service_tax > 0` |
| V6 | `order_amount` includes SC | Inspect payload | `order_amount` = items + tax + SC + SC-GST |
| V7 | `payment_amount` ≈ `order_amount` | Inspect payload | No inconsistency |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: BUG-662
Gate: GATE_5A
EXIT GATE: 5/5 PASS (registry ✓, BUG_TRACKER ✓, FILE_OWNERSHIP ✓, code markers ✓, compile ✓)

## 5. Credentials + Environment
- POS preprod: `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
- Login: owner@cafe103.com / Qplazm@10
- Need a restaurant with `autoServiceCharge = No` and SC% configured
- V1 test: open a dine-in/walk-in prepaid order, go to Collect Bill, manually tick SC ON, intercept `place-order` request in browser DevTools Network tab
