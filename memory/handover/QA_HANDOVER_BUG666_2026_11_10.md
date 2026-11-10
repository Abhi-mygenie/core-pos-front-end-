# QA HANDOVER — BUG-666 → QA (Gate 5B)

**Date:** 2026-11-10 · **From:** IMPLEMENTATION (Gate 5A) · **To:** QA
**Item:** BUG-666 — CPP taxTotals item-level GST source mismatch (split payment still fails after BUG-665)
**Severity:** P0 · **Risk:** CRITICAL (financial) · **Sprint:** nov_cr_batch

## 1. What was changed — 1 file, 2 edit sites (4 sub-edits)

| Edit | Lines | Change |
|---|---|---|
| E1a | L282 | `let gstAcc = 0, dGstAcc = 0;` added after `dSgst/dCgst/dVat` declarations |
| E1b | L302 | `gstAcc += taxAmt; if (isDiscountable) dGstAcc += taxAmt;` added in GST branch |
| E1c | L318-319 | `gstTotal` + `dGstTotal` added to taxTotals return |
| E2 | L784-787 | `itemGstPostDiscount` formula uses `taxTotals.gstTotal/dGstTotal` instead of `dSgst+dCgst` |

`orderTransform.js` NOT touched. `taxTotals.sgst`, `.cgst`, `.dSgst`, `.dCgst` UNCHANGED.

## 2. Self-test: 7 BUG-666 markers. Webpack 0 new warnings.

## 3. QA verification matrix

| # | Test | Expected |
|---|---|---|
| V1 | Ruby RID 672: ₹114.29 item + SC 10%, prepaid split cash=100 → intercept `place-order` | `partial_payments` sum = `order_amount` (132) — NO backend error |
| V2 | Same flow: displayed SGST+CGST on bill | 3.14 + 3.14 = ₹6.28 (was 3.15 + 3.15 = ₹6.30) |
| V3 | Round-price order (₹149, ₹420, ₹2790) + SC + split | No regression — split still works |
| V4 | Discounted order + SC + split | No regression — discount ratio applied correctly via dGstTotal |
| V5 | Compile | 0 new warnings |
| V6 | taxTotals.sgst/cgst unchanged | Existing display code reading `.sgst`/`.cgst` sees no change |

## 4. Registry Sync
Registry: GATE_5A — EXIT GATE 5/5 PASS (registry ✓, BUG_TRACKER ✓, FILE_OWNERSHIP ✓, 7 markers ✓, compile 0 warnings ✓)

## 5. Credentials
- Ruby ZAP: owner@ruby.com / Qplazm@10
- POS URL: https://c4220e7e-e76a-4ba7-b323-bd65e8947f74.preview.emergentagent.com
- API base: https://preprod.mygenie.online/

## 6. Works together with BUG-665
BUG-665 `finalSplitBase` block (L857+) reads `totalGst`. After BUG-666: `totalGst = 6.2815` → `splitGst = 6.28` → `rawSplitBase = 132.00` = `order_amount` ✓. Both fixes must be deployed together.
