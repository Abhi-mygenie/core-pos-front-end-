# BUG-672 — Credit (TAB) on prepaid orders broken — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: PARTIAL — TAB handling exists in `collectBillExisting`; missing in `placeOrderWithPayment`; prepaid/postpaid flags dropped in transform.
Risk: CRITICAL (money: credit ledger not created). Backend-blocked: NO for the fix; owner must enable TAB `prepaid` for test restaurant.
Conflict Pre-Check: `orderTransform.js` (R5) and `CollectPaymentPanel.jsx` (R5) — Batch A CR-492 (comp in payment) + CR-494 (PIN) plan edits in CPP. Execute BUG-672 in its own commit, rebase on Batch A Gate 3 lines. `profileTransform.js` — no open edit.

## Owner decisions (locked)
- OD-672-A: Credit button cannot be used on prepaid orders today — fix.
- OD-672-B: whether Credit is allowed on a prepaid order = **per restaurant**, from backend `payment_types` TAB `prepaid` flag (admin decides). No extra user right.

## Root cause (probes 2026-11-14)
1. `profileTransform.paymentTypes` (L276-283) maps only `id/name/display_name` → **drops `prepaid`/`postpaid`** (probe 02: TAB `prepaid:0, postpaid:1`). CPP therefore always shows Credit.
2. QSR / Place+Pay fresh order → `orderTransform.placeOrderWithPayment` (L1294; payment fields L1391-1396): `payment_method:'credit'`, `payment_status:'paid'`, `payment_type:'prepaid'`, no `name/mobile/crm_customer_id` → order saved paid/credit, **NO credit ledger entry** (probe 20_D / 27_D). Compare `collectBillExisting` L1539 `isTab`, L1665 `success`, L1754-1757 TAB contact fields → works (probe 21_B / 24: ledger +420).
3. Existing prepaid order + Collect Bill → TAB: backend accepts even though TAB `prepaid:0` (probe 21_B) → enforcement only in FE today.

## Impact
| File | Change |
|---|---|
| `api/transforms/profileTransform.js` L276-283 | Keep `prepaid` / `postpaid` flags on each payment type |
| `config/paymentMethods.js` `filterLayoutByApiTypes` L188 | Optional arg `isPrepaid` → hide a method whose type has `prepaid:0` (Credit) |
| `components/order-entry/CollectPaymentPanel.jsx` L106-113 | Pass `isPrepaid` into the filter (prop already exists, L53) |
| `api/transforms/orderTransform.js` `placeOrderWithPayment` L1296 + L1391-1396 | Destructure `tabContact` from paymentData; mirror `collectBillExisting` TAB branch: `isTab` detect, status `success`, TAB contact fields (`name`,`mobile`,`crm_customer_id`) |
| `components/order-entry/OrderEntry.jsx` L1684 / L2462 | **No change** — CPP already puts `tabContact` in paymentData (CPP L1259) and OrderEntry forwards paymentData as-is |

Downstream: Credit Management list/detail (new ledger rows appear), Order Beta payment column shows TAB, settlement TAB bucket (`tips_by_mode.TAB`).

## Not touched
`collectBillExisting` (works), credit services, reports transforms.

## Backend asks
- BB-01 (soft): enforce TAB `prepaid` flag on `order-bill-payment` + `place-order` (today accepted) — defence in depth.
- Owner housekeeping: enable TAB `prepaid:1` on cafe103 to QA the "allowed" path; leave another restaurant at `prepaid:0` for the "hidden" path.

## Open
None.

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M2 approved. OD-672-C: when TAB `prepaid:0`, Credit button is **HIDDEN** on prepaid orders (not greyed).

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-B_BUG-672_API_CONTRACT_2026_11_15.md`
