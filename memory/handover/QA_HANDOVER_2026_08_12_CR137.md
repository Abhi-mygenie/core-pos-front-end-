# QA HANDOVER — CR-137 Optional `discount_for` Field
**Date:** 2026-08-12
**From:** Implementation agent
**To:** QA agent
**Item:** CR-137 — optional `discount_for` in order payload + CollectPaymentPanel UI

---

## §1 — Verification Matrix (self-test results)

| # | Check | Result |
|---|---|---|
| V1 | `grep -c "discount_for" orderTransform.js` = **4** | ✅ PASS — L1066, L1190, L1369, L1645 |
| V2 | `discountFor` useState in CollectPaymentPanel L306 | ✅ PASS |
| V3 | `discountFor: discountFor` in discounts object L1115 | ✅ PASS |
| V4 | `setDiscountFor` calls = 4 (state decl + clear + 2× onChange) | ✅ PASS |
| V5 | `data-testid="discount-for-input"` in main drawer L1380 | ✅ PASS |
| V6 | `data-testid="discount-for-input-inline"` in inline path L2013 | ✅ PASS |
| V7 | `discountFor: null // CR-137` in CartPanel L513 | ✅ PASS |
| V8 | `o.discount_for \|\|` in orderLedgerService L85 | ✅ PASS |
| V9 | `webpack compiled with 1 warning` — 0 new warnings | ✅ PASS |
| V10–V14 | Browser/network checks — require live QA | ⬜ QA to run |

**Self-test: 9/9 automated checks PASS. 5 browser/network checks for QA.**

---

## §2 — Regression Test List

**MANDATORY — 77 tests across 10 sections:**
```
/app/memory/plans/CR-137_REGRESSION_TEST_LIST.md
```

| Section | Tests | P0 | Description |
|---|---|---|---|
| **I — Critical path smoke** | 8 | **8** | Login → Order → Pay → Ledger → Logout (R6 mandatory) |
| **B — BUG-304 interaction** | 6 | 3 | discountableRatio + dSgst/dCgst/dVat must not regress |
| **C — BUG-305 interaction** | 5 | 3 | backend payload gst_tax + print must not regress |
| **A — Feature tests** | 18 | 6 | Reason input: appear/hide/clear/payload/both paths |
| D — Discount interlock | 6 | 2 | Coupon/loyalty/wallet coexistence |
| E — Payment methods | 7 | 3 | All 7 payment paths carry discount_for |
| F — Order types | 7 | 2 | All order types: dine-in/walk-in/takeaway/delivery/room/QSR |
| G — Adjacent state | 6 | 2 | SC/round-off/tip/delivery/B2B GST unchanged |
| H — Print flow | 5 | 2 | KOT + bill print + reprint unchanged |
| J — Non-regression | 9 | 4 | self_discount/discount_type/coupon_code all intact |
| **TOTAL** | **77** | **35** | |

**Run order: Section I first → B → C → A → D → E → F → G → H → J**

⚠ **BUG-304 (CollectPaymentPanel discountableRatio) + BUG-305 (orderTransform GST ratio) shipped 2026-08-11 (yesterday).** Sections B and C are the highest-interaction-risk — run them immediately after the critical path smoke.

---

## §3 — What Changed (for QA scope awareness)

| File | Edit | Lines |
|---|---|---|
| `orderTransform.js` | +`discount_for: null` in Flow 1 placeOrder | L1066 |
| `orderTransform.js` | +`discount_for: null` in Flow 2 updateOrder | L1190 |
| `orderTransform.js` | +`discount_for: discounts.discountFor \|\| null` in Flow 3 placeOrderWithPayment | L1369 |
| `orderTransform.js` | +`discount_for: discounts.discountFor \|\| null` in Flow 4 collectBillExisting | L1645 |
| `CollectPaymentPanel.jsx` | +`discountFor` useState | L306 |
| `CollectPaymentPanel.jsx` | +`discountFor` in discounts object | L1115 |
| `CollectPaymentPanel.jsx` | +`setDiscountFor('')` in "None" clear | L1310 |
| `CollectPaymentPanel.jsx` | +Reason text input in main drawer | L1373 |
| `CollectPaymentPanel.jsx` | +Reason text input in inline Room Service path | L2006 |
| `CartPanel.jsx` | +`discountFor: null` in QSR handleCollectBill | L513 |
| `orderLedgerService.js` | `o.discount_for \|\|` fallback replacing hardcoded 'Customer' | L85 |

**What was NOT changed (QA need not test these):**
- Discount amount computation
- GST/VAT/SC/round-off/tip calculations
- Coupon/loyalty/wallet logic
- All other payload fields
- Any report pages
- Any context providers

---

## §4 — Registry Sync Confirmation

```
Registry synced:    YES
Item:               CR-137
Status:             IMPLEMENTED
Sprint:             pos_5_1
EXIT GATE:          5/5 PASS
```

---

## §5 — Test Credentials & Environment

```
Account:  owner@shimlaqohfoodcourt.com  (credentials masked per R20)
Password: see /app/memory/test_credentials.md
Restaurant: Shimla Food Court (RID 598) — has preset discount types configured
URL: https://pos-printer-1.preview.emergentagent.com

Recommended test flow:
  1. Login → open any dine-in table
  2. Add 2 items
  3. Collect Bill → select % discount → enter reason "Staff discount"
  4. Check Network tab → POST payload contains discount_for: "Staff discount"
  5. Complete payment
  6. Navigate to Order Ledger → find order → Discount For column = "Staff discount"
```

---

*QA handover complete. EXIT GATE 5/5. Ready for QA Gate 5b.*
