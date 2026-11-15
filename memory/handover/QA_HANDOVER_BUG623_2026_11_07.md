# QA HANDOVER — BUG-623
**Date:** 2026-11-07
**Items:** BUG-623
**Agent:** IMPLEMENTATION
**Sprint:** nov_cr_batch

---

## 1. Verification Matrix (from revalidated plan — self-test results)

| Edit | File | Change | Self-Test Result |
|------|------|--------|:---:|
| E1 | orderTransform.js:L708 | `.filter(Boolean)` before variation `.map()` | ✅ grep confirmed |
| E2 | orderTransform.js:L724 | `.filter(Boolean)` before variation `.reduce()` (buildCartItem) | ✅ grep confirmed |
| E3 | orderTransform.js:L1558 | `.filter(Boolean)` before variation `.reduce()` (collectBill) | ✅ grep confirmed |
| E6 | orderTransform.js:L2007 | `.filter(Boolean)` before variation `.reduce()` (GST/tax) | ✅ grep confirmed |
| E4 | CollectPaymentPanel.jsx:L260 | `BUG-NEW` → `BUG-618` on addon null-guard comment | ✅ grep confirmed |
| E5 | CollectPaymentPanel.jsx:L262 | `BUG-NEW` → `BUG-618` on variation null-guard comment | ✅ grep confirmed |

---

## 2. Test Cases for QA

| # | Test | Steps | Expected | Crash Risk |
|---|------|-------|----------|:---:|
| TC-1 | buildCartItem path with null variation entry | Simulate order with `variation: [null, {name:'Size',values:[{label:'Large',optionPrice:20}]}]` through `fromAPI.order` → `buildCartItem` | No crash; `variationAmount` = 20 (null entry filtered) | HIGH |
| TC-2 | collectBillExisting path with null variation entry | Call `toAPI.collectBillExisting` with item containing `variation: [null]` | No crash; `variationAmount` = 0 | HIGH |
| TC-3 | GST/tax path (variationPerUnit) with null variation entry | Render OrderCard / TableCard with item having `variation: [null, {values:[{optionPrice:30}]}]` | No crash; `variationPerUnit` = 30 | HIGH |
| TC-4 | Normal variation entries unchanged | Order with `variation: [{name:'Size',values:[{label:'Large',optionPrice:20}]}]` through full flow | `variationAmount` = 20 (non-null entries unaffected) | MEDIUM |
| TC-5 | BUG-618 marker relabelling | Inspect CollectPaymentPanel.jsx L260 + L262 | Shows `// BUG-618:` not `// BUG-NEW:` | LOW |
| TC-6 | Webpack clean | Check frontend compile log | `webpack compiled with 1 warning` (pre-existing lint only, no new warnings) | LOW |
| TC-7 | Existing orderTransform tests | `npx craco test --watchAll=false --testPathPattern=orderTransform --forceExit` | 92/93 pass. 1 pre-existing failure (`orderTransform.roomInfo` — `order_amount PRESENT when roomBalance > 0`) confirmed pre-existing, unrelated to BUG-623. | LOW |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Regular order (no null variation) renders correctly on dashboard | Ensure `.filter(Boolean)` on non-null arrays is a no-op |
| R2 | Collect Payment panel opens without crash on a variation order | collectBillExisting path E3 must not change behaviour for valid data |
| R3 | Bill print total correct for variation order | variationPerUnit (E6) must still compute correctly |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-623 → GATE_5A_IMPLEMENTED, sprint: nov_cr_batch
EXIT GATE: ALL 5 PASSED
  □1 registry.json ✅  □2 BUG_TRACKER.md ✅  □3 FILE_OWNERSHIP.md ✅  □4 code markers ✅  □5 compile ✅
```

---

## 5. Pre-existing Failure Note (MUST NOT be counted as BUG-623 regression)

`orderTransform.roomInfo.test.js` — "order_amount PRESENT when roomBalance > 0" — **fails both before and after BUG-623 changes** (confirmed via git stash). Root cause: `order_amount = finalTotal - roomBalance` in `collectBillExisting`. This is a separate pre-existing defect, not introduced by BUG-623.

---

## 6. Credentials + Environment

- Preview URL: https://genie-pos-web-2--312lqkk9.preview.emergentagent.com
- Test account: see `/app/memory/control/test_credentials.md`
- Files changed: `src/api/transforms/orderTransform.js` · `src/components/order-entry/CollectPaymentPanel.jsx`
