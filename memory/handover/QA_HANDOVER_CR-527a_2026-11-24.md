# QA HANDOVER — CR-527a (TAB holder → `cust_*` + CRM-create holder)

**Item:** CR-527 slice "a"  **Gate:** 5A → QA  **Risk:** HIGH  **Date:** 2026-11-24
**Plan:** `plans/CR-527_CUST_HOLDER_REMAP_IMPLEMENTATION_PLAN.md` (v2)

## 1. Inherited from Plan — Verification Matrix results
| # | Scope | Verify | Result |
|---|------|--------|:--:|
| 1 | orderTransform placeOrder | holder-first cust_*; membership blank-not-diner | PASS ✅ (unit) |
| 2 | orderTransform collectBill | holder-first cust_*; membership blank-not-diner | PASS ✅ (unit) |
| 3 | non-TAB unchanged | cash carries no diner / cust_* = customer | PASS ✅ (unit) |
| 4 | Part B resolve | isTab + no crmId + holder name/phone → lookup→create → tabContact.crmId set | **QA (browser)** |
| 5 | Part B failure | CRM offline → bill completes, membership blank, non-blocking toast | **QA (browser)** |
| 6 | live write-probe | holder≠diner credit order → request cust_*=holder, diner_*=diner → Report CUSTOMER + Credit Mgmt = holder | **QA (browser)** |
| 7 | BUG-672 regress | prepaid move-to-credit still captures holder in cust_* | **QA (browser)** |

Unit: `npx craco test --watchAll=false --testPathPattern=orderTransform.cr527` → **10/10 PASS**. Webpack: 0 new warnings.

## 2. Files changed
- `frontend/src/api/transforms/orderTransform.js` — `placeOrderWithPayment` L1414-1421, `collectBillExisting` L1793-1796 (cust_* holder-first; membership blank-not-diner).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — `handlePayment` resolve block (~L1297-1316) + `tabContact.crmId` L1341.
- `frontend/src/api/transforms/__tests__/orderTransform.cr527.test.js` — +5 tests.

## 3. Browser test steps (preprod)
Account: `pms@macha` (see `memory/test_credentials.md`), restaurant 69.
1. **#6 (core):** Order-entry, outer customer = a diner (e.g. "oele"). Collect Bill → Credit, set holder = different person "koji". Submit. In DevTools Network, inspect `order-bill-payment` (or `place-order` for prepaid TAB): expect `cust_name="koji"`, `cust_membership_id`=koji's CRM id, `diner_name="oele"`, `name="koji"`. Then open Order Report (Credit) + Credit Management → CUSTOMER should read **koji** (holder), diner shown separately.
2. **#4:** Type a brand-new holder (name+phone, not from dropdown) and submit quickly → request `cust_membership_id` carries a freshly-created CRM id (holder created in CRM).
3. **#5:** With CRM blocked/offline, submit a credit bill → bill completes, `cust_membership_id` blank, toast "Credit saved — holder not linked to CRM (offline)". Never the diner id.
4. **#7:** Prepaid order → move to credit (BUG-672) → holder still lands in `cust_*`.

## 4. Registry Sync
Registered: YES · Item: CR-527 (slice a) · Sprint: nov_cr_batch · EXIT GATE 5/5.

## 5. Notes
- OD-527a-2 = FE workaround only; backend still derives `user_name` from `cust_name` (no backend change this pass). A backend durability brief is optional/deferred per owner.
- Out of scope: Issue-2 (resettle/prepaid order shows credit but no Credit-Mgmt ledger row) = separate backend bug.
