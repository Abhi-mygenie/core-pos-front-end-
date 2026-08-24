# QA Handover — CR-170 Conditional Grand Total Round-Off

**Date:** 2026-08-20
**Implementation agent:** IMPLEMENTATION role (same session)
**QA agent:** QA role (this session)

---

## 1. Inherited from Plan (Verification Matrix)

| # | Edit | File | Verification | Self-Test Result |
|---|---|---|---|---|
| 1 | Helper `applyGrandTotalRoundOff` created | `roundOffUtils.js` | 11 unit tests cover all paise ranges + edge cases | PASS ✅ |
| 2 | `calcOrderTotals` uses helper, `roundUpAbs` clamp removed | `orderTransform.js` L870/L872 | 6 integration tests: order_amount + round_up string | PASS ✅ |
| 3 | `collectBillExisting` `Math.max(0,...)` clamp removed | `orderTransform.js` L1630 | Covered by integration test (roundOff negative passthrough) | PASS ✅ |
| 4 | `CollectPaymentPanel` uses helper | `CollectPaymentPanel.jsx` L680 | Browser: Collect Bill total display | PENDING — manual |
| 5 | `CartPanel` uses helper | `CartPanel.jsx` L451 | Browser: Cart preview total | PENDING — manual |
| 6 | Test spec rewritten for new rule | `round001.alwaysCeil.test.js` | 17/17 PASS | PASS ✅ |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Helper floor: 100.04 → 100 | Unit test | order_amount=100, round_up="-0.04" |
| T2 | Helper floor boundary: 100.09 → 100 | Unit test | order_amount=100, round_up="-0.09" |
| T3 | Helper ceil boundary: 100.10 → 101 | Unit test | order_amount=101, round_up="0.90" |
| T4 | Helper ceil: 100.50 → 101 | Unit test | order_amount=101, round_up="0.50" |
| T5 | No change: 100.00 → 100 | Unit test | round_up="0.00" |
| T6 | Toggle off: 100.04 → 100.04 | Unit test | raw value unchanged |
| T7 | Float-drift: 100.10 must ceil | Unit test | paise=10 → ceil → 101 |
| T8 | Paise sweep 01–09 all floor | Unit test | all → floor integer |
| T9 | Paise sweep 10–99 all ceil | Unit test | all → ceil integer |
| T10 | CollectPaymentPanel shows "Round Off −₹0.04" | Browser: order with X.04 total | Negative round-off visible on bill screen |
| T11 | CollectPaymentPanel shows "+₹0.90" for X.10 | Browser: order with X.10 total | Positive round-off visible on bill screen |
| T12 | Cart preview shows "Round-off ₹-0.04" | Browser: cart with X.04 total | Negative visible in cart |
| T13 | Toggle off → no Round Off line shown | Browser: disable totalRound | Round Off row hidden |

---

## 3. Regression Tests

CR-170 touches **R5 hotspots (3 files) + R6 financial** → **full critical-path smoke required**

| # | Test | Why |
|---|---|---|
| R1 | Place order with exact total (no paise) | Verify no regression on clean totals |
| R2 | Place order with paise ≥ 10 → still ceils | Old ceil behaviour preserved for ≥ 10 paise |
| R3 | Login → place order → settle → receipt flow | Full critical path unbroken |
| R4 | QSR Place+Pay flow | CartPanel rounding change must not break QSR |
| R5 | Split bill total | SplitBillModal uses CollectPaymentPanel data |
| R6 | Discount applied → rounded correctly | Discount changes rawTotal, rounding must still apply |
| R7 | Toggle OFF in settings → raw totals everywhere | `totalRound=false` path unchanged |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-170
Status: IMPLEMENTED
Sprint: pos_5_0
EXIT GATE: 5/5 PASSED
  □1 Registry: ✅  □2 CR_REGISTRY: ✅  □3 FILE_OWNERSHIP: ✅  □4 Markers: ✅  □5 Compile: ✅
```

---

## 5. Credentials + Environment

| Field | Value |
|---|---|
| Preview URL | https://react-app-live.preview.emergentagent.com |
| Preprod API | https://preprod.mygenie.online |
| Test account | owner@18march.com / Qplazm@10 (rid=478) |
| Frontend | webpack compiled, 1 pre-existing warning (unrelated) |
