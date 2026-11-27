# QA Handover — CR-527 (capture phase)

**Item:** CR-527 — diner capture in Collect-Payment credit flow + running-order display
**Implemented:** 2026-11-21 (IMPLEMENTATION role, GATE_5A)
**Plan:** `plans/CR-527_DINER_CAPTURE_IMPLEMENTATION_PLAN.md` · **Backend:** `handover/CR-527_BUG-680_BACKEND_HANDOVER.md` (DONE)
**Decision:** Option A (additive) — holder mapping unchanged; only `diner_name`/`diner_mobile` added.

## 1. Verification Matrix (self-test results)

| Edit | File | Expected | Self-Test |
|---|---|---|:--:|
| 1-2 | CollectPaymentPanel.jsx | `dinerName`/`dinerPhone` state + handlers; gated **Diner (who ate)** field (renders only when holder name + valid phone) | ✅ compiles |
| 3 | CollectPaymentPanel.jsx | `dinerContact` in paymentData (TAB only) | ✅ compiles |
| 4 | orderTransform.js `placeOrderWithPayment` | emits `diner_name`/`diner_mobile` in TAB block (credit); absent on cash | ✅ unit 2/2 |
| 5 | orderTransform.js `collectBillExisting` | emits diner_* when entered; OMITS when blank | ✅ unit 2/2 |
| 6 | orderTransform.js `fromAPI.order` | reads `diner`/`dinerMobile`; null when absent | ✅ unit 2/2 |
| 7 | reportTransform.js `singleOrderNew` + OrderDetailSheet.jsx | diner row shown when ≠ holder | ✅ compiles |
| 8 | OrderCard.jsx | diner chip shown when distinct from holder | ✅ compiles |
| 9 | orderTransform.cr527.test.js | 6 cases | ✅ 6/6 PASS |

**Self-test: 12/12 edits verified · 6/6 unit tests pass · webpack compiled clean (0 new warnings).**

## 2. Browser test cases (testing_agent)
1. **Diner field gating:** open Collect Payment → select **Credit/TAB**. Diner field is HIDDEN until holder Name + valid phone entered; then it appears (`data-testid=tab-diner-section`).
2. **Capture distinct diner:** holder = Saurav/9800000001, diner = Abhishek/9800000002 → place credit order.
3. **Leave diner blank** (same as holder) → order places; running card shows NO diner chip; detail sheet shows no diner row (holder == diner → "—").
4. **Running order card** (`data-testid=order-card-diner`) shows "Diner: Abhishek" ONLY for case 2.
5. **Order detail sheet** (`data-testid=order-detail-diner`) shows the diner row for case 2.
6. **Credit detail sheet** (already shipped) Diner column populated for case 2's settled credit row.

## 3. Live write-probe (MANDATORY before close — preprod rest 69)
Follow backend Part A checklist:
1. Place dine-in credit order, holder ≠ diner → `GET employee-orders-list` (Manager + Owner roles) + `POST get-single-order-new` return `diner_name`=Abhishek, `user_name`=Saurav.
2. Settle to credit → `GET tap-customer-record-list?customer_id=` shows diner on the row.
3. Diner == holder mobile OR blank → `diner_name` returns `null` → UI "—".

## 4. Regression
- TAB/credit holder CRM typeahead (BUG-660) still works — diner state is fully separate from `tabIsCustomerSelected`/`tabPhoneWasUserTypedRef`.
- Non-credit (cash/UPI/card/split) payloads carry NO diner fields (unit-verified).
- Settling an already-placed order with blank diner does NOT wipe a place-time diner (diner_* omitted).

## 5. Registry Sync
Registry synced: YES · Item: CR-527 · Gate: GATE_5A · EXIT GATE: 5/5 PASS (registry, CR_REGISTRY, FILE_OWNERSHIP, code markers `// CR-527`, webpack clean).

## 6. Credentials + Environment
- URL: `https://preprod.mygenie.online` · Account: `pms@macha.com` / `Qplazm@10` (rest 69). Alt: `owner@cafe103.com`. (`owner@mealbreak.com` → 401, avoid.) See `test_credentials.md`.
