# QA HANDOVER — BUG-665 → QA (Gate 5B)

**Date:** 2026-11-10 · **From:** IMPLEMENTATION (Gate 5A) · **To:** QA
**Item:** BUG-665 — Prepaid split SC GST 1-paisa rounding mismatch
**Severity:** P0 · **Risk:** CRITICAL (financial) · **Sprint:** nov_cr_batch

## 1. What was changed — 1 file, 3 edit sites

| Edit | Line | Change |
|---|---|---|
| E1a | L852–860 | Added `splitGst` / `rawSplitBase` / `finalSplitBase` block (+4 lines) using whole-GST rounding |
| E1b | L3044 | `splitCap = finalSplitBase` (was `isRoom ? effectiveTotal-roomBalance : effectiveTotal`) |
| E2 | L3104 | Remaining display uses `finalSplitBase` (was `finalTotal`) |

`orderTransform.js` NOT touched (Option A). `effectiveTotal`, `finalTotal`, `sgst`, `cgst` unchanged.

## 2. Registry Sync
Registry: GATE_5A — EXIT GATE 1-5 PASS (registry ✓, BUG_TRACKER ✓, FILE_OWNERSHIP ✓, 7 markers ✓, compile 0 new warnings ✓)

## 3. Verification matrix

| # | Test | Expected | Auto? |
|---|---|---|:---:|
| V1 | Ruby RID 672: SC=10%, split cash=3000+UPI, intercept `place-order` | `partial_payments` sum = `order_amount` (no backend error) | YES |
| V2 | Same flow: check Remaining display after typing 3000 | Shows ₹0.00 (not ₹0.01) | YES |
| V3 | SC=0 order, split payment | No error — `splitGst = splitGst_rounded = effectiveTotal` path, no regression | YES |
| V4 | Postpaid collect-bill split with SC | Same fix covers it — single splitCap | YES |
| V5 | Compile | 0 new warnings | YES |
| V6 | onChange NOT clamped | Typing freely in split amount works (BUG-113 parity) | YES |
| V7 | BUG-660 TAB credit block untouched | Credit split payment still works | YES |
| V8 | Code markers | `// BUG-665` at E1a/E1b/E2 | YES (grep) |

## 4. Credentials
- Ruby ZAP: owner@ruby.com / Qplazm@10
- POS URL: https://c4220e7e-e76a-4ba7-b323-bd65e8947f74.preview.emergentagent.com
- API base: https://preprod.mygenie.online/
- SC setup: RID 672 has SC=10%, SC-GST=5% confirmed from investigation
