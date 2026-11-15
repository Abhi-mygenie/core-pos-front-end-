# BATCH-B — Impact Analysis Summary (Gate 2) — 2026-11-14

Role: PLANNING (Gate 2 only). Owner GO: "all P0 items only, one batch at a time, rest as suggested, gate 2 go".
Scope: 9 P0 items + CR-542 (owner R1: P0). Zero source code changes. Gate 3 NOT started.
Order: 671/672 → 526/542 → 514 → 522 (after Batch A PIN) → 536/527 → 607/394.
Probe account: cafe103 (RID 644), credentials session-only via secure card, NOT stored. Write probes allowed on test orders only (owner R1).

## Code reality (Step 0) — HEAD 3858f26
| Item | Code reality | Key code fact |
|---|---|---|
| BUG-671 | PARTIAL | Audit: `OrderTable.jsx` L248/L256-259 `PAID_ACTIONS_ALLOWED_METHODS=['cash','card','upi']` → Unpaid + Change hidden for `partial`. Order Beta L718 shows Unpaid for any status-6 non-PG row (no right gate) |
| BUG-605 (in CR-526) | ROOT CAUSE FOUND | `OrderReportBetaPage.jsx` L853-858 renders `MarkUnpaidConfirmDialog` WITHOUT `open` prop and with `onClose` (dialog expects `open` + `onCancel`) → dialog never opens → "Unpaid does nothing" |
| BUG-672 | TBD (probe) | `collectBillExisting` (orderTransform L1657-1665) sends `payment_status:'success'` for TAB, no `payment_type` override on prepaid orders. CPP `isPrepaid` only locks delivery charge (L1932) |
| CR-514 | PARTIAL | Card-only 4-digit `transaction_id` exists (BUG-240: CPP L554, L1256, L3272, split L3083); reports read `transection_id/transaction_id` → `transactionRef` (reportTransform L190/230/425/1080). No per-method config |
| CR-522 | NONE | ±3% hardcoded CPP L893-894, text L3487/L3492, block L3511; toggle `reconcile_amount` only |
| CR-526 | PARTIAL | `make-order-unpaid` endpoint exists (paymentMutationService). Credit Management (`CreditManagementPanel`, `CreditCustomerDetailSheet`) has no unpaid/remove action |
| CR-527 | NONE | Credit list is per customer record `{id,name,mobile}` (creditTransform L77-79); no phone grouping |
| CR-536 | PARTIAL | CPP "B2B Invoice (Optional)" GST no. + name (CR-116), sent as `custGST/custGSTName` in bill payment + print; customer record has `gst_number` (customerTransform). No address / UPI fields |
| BUG-607 | PARTIAL | FE computes tax per item from product `tax/tax_type/tax_calc` (productTransform L71-76, CPP L279-310); GST skipped if `gst_status` false (L288) |
| CR-394 | FULL? (CR-348) | AddCustomItemModal already has GST % + Inclusive/Exclusive (default Exclusive) → `tax_calc` sent (orderTransform L1042-1049). Owner said "always exclusive" — to clarify |

## Mutation window (owner asked)
`utils/businessDay.js` L124-132 `isMutationAllowedForSelectedDate` — hardcoded today/yesterday by DEVICE date. No settlement lock in FE (Cash Settlement = `settlement`, `self-settlement` endpoints).

## Owner decisions log
| OD | Round | Decision |
|---|---|---|
| Probes | R1 | Read + write probes on test orders allowed |
| CR-542 | R1 | P0 — analysed with CR-526 |
| OD-671-A | R1 | Split/partly-paid orders in Audit: Unpaid only. Change Method → PHASE 2 |
| OD-672-A | R1 | Owner: Credit button can't be used on prepaid orders; probe to confirm cause |
| OD-526-A | R2 | Day limit: Audit + Order Beta keep today/yesterday hardcoded; Credit Management NO day limit |
| OD-526-B | R2 | After waiter settlement done → Unpaid / Change Method BLOCKED (message "Day already settled"); needs backend settled-day signal/enforcement |
| OD-PROBE | R3 | Re-check preprod before continuing → done, writes working |
| OD-672-B | R3 | Prepaid→Credit allowed per restaurant (admin decides) via `payment_types` TAB `prepaid` flag; owner to enable for cafe103 (still `prepaid:0` at probe time) |
| OD-607-A | R3 | `restaurant_gst = category` means ITEM-level GST, always; no restaurant-level fallback for now |
| OD-526-C | R4 | Credit Management: per-order "Remove from credit" in customer detail; reuse existing `make-order-unpaid` (backend reverses credit, probe 26) — FE button only, no new backend |
| OD-542-A | R4 | Mandatory reason = dropdown of backend-configured reasons (like cancellation reasons: `cancellation-reasons` list has `item_type` Order/Food → add `Unpaid`) + "Other" free text. Backend: `make-order-unpaid` must accept + store `reason` (today only `order_id`) |
| OD-514-A | R4 | Which methods get a reference box AND whether mandatory = restaurant-level backend config (not hardcoded). Card 4-digit stays until config exists. Overlaps CR-541 |
| OD-536-A | R4 | B2B invoice: add CUSTOMER billing address (with existing GST no. + name) |
| OD-536-B | R4 | No UPI ID on B2B invoice — dropped from scope |
| OD-527-A | R3 | Credit can be given to a different person than the diner (Abhishek eats, credited to Saurav) → Saurav's credit portfolio shows multiple diner names |

## Probe results (R11) — `evidence/BATCH-B-IA/probes_2026_11_14/` (masked)
| File | Finding |
|---|---|
| 02_profile.json | `payment_types`: TAB `prepaid:0, postpaid:1`; cash/card/upi/partial/zomato_gold `prepaid:1`. FE `profileTransform.paymentTypes` (L276-283) DROPS `prepaid/postpaid` flags → CPP shows Credit on prepaid orders though backend config says TAB not allowed for prepaid → **likely BUG-672 cause** (write probe blocked, see below) |
| 03_settings_list.json | `restaurant_gst`/`restaurent_gst: "category"`, `gst_tax: "5.00"`, `gst.status: 1` → **BUG-607 key exists** (category-level GST mode). FE never reads it (grep 0 hits); FE always uses per-item `product.tax`. `reconcile_amount: "No"` (no tolerance key). `prepaid_auto_sattle: "No"`. `settelment_report: "Yes"` |
| 04_credit_customer_list.json | 58 credit customers, 58 distinct phones → no same-phone/different-name at LIST level; CR-527 case must be inside a customer's records (detail probe timed out) |
| 05_order_beta_combined.json | Nov 1–14: 583 rows; 14 `partial` rows are `f_order_status 6`, `payment_status paid`, no razorpay → Order Beta DOES render Unpaid for them (L718); Audit hides it (OrderTable L256-259). `transaction_id` returned per row ("0000" for card) → CR-514 display source exists |
| 20_place_A_split.json (1st try) | Preprod 500 `prod_dump.orders doesn't exist` — transient; recovered on owner-requested re-check |
| 20–23 *_A_split | Split (cash 220 + upi 200) → `partial` paid → `make-order-unpaid` 200: `partial_payments_deleted:2, waiter_collections_deleted:2`, order → status 5 unpaid/pending → **BUG-671 backend OK, FE-only fix**. Note: `transaction_id` UPIREF671 stays on the unpaid row (25_orderbeta_test_rows) |
| 21/23 *_B_prepaid_tab, 24 | Prepaid order + BILL_PAYMENT `payment_mode:TAB` → 200 "Bill cleared via TAB", credit ledger +420 → backend ACCEPTS prepaid→TAB on collect path even though TAB `prepaid:0` |
| 20/27 *_D_prepaid_credit_place | Mirrors FE `placeOrderWithPayment` (prepaid Place+Pay): `payment_method:'credit'`, `payment_status:'paid'`, no name/mobile → order saved `paid / credit / prepaid`, **NO credit ledger entry** (customer count unchanged) → **BUG-672 ROOT CAUSE = FE**: `orderTransform.placeOrderWithPayment` L1296/L1391-1396 has no TAB handling (no `credit→TAB` map, no `success` status, no `name/mobile/crm_customer_id`) vs `collectBillExisting` L1539/L1665/L1755-1757 |
| 26_credit_after_unpaid_cancel | `make-order-unpaid` on a TAB order reverses credit (420 → 0) → **CR-526 can reuse existing endpoint** |
| 21/25 *_C_upiref | UPI single pay with `transaction_id:TESTREF514` → stored + returned in Order Beta row → **CR-514 UPI ref: backend OK** |
| 22_unpaid_* (all) | `make-order-unpaid` succeeds with no settlement check (returns `report_updated_for`) → **OD-526-B needs backend lock** (no settled flag in `get-settlement-report` waiter rows) |
| Cleanup | Test orders 1578752/53/54/55 made unpaid + cancelled (200). Credit customer `TEST_BATCHB_CREDIT` (id 3118) remains with ₹0.00 — no delete API; owner to remove |
| settlement / credit detail | Read timeouts (>60 s) during 1st window — preprod unstable 2026-11-14 |

## Item status after this session
| Item | Root cause / scope | Owner | Backend need | Open |
|---|---|---|---|---|
| BUG-671 | Audit `OrderTable` L256-259 allow-list excludes `partial` | FE | None (probe 22 OK) | — (Change Method for split = Phase 2) |
| BUG-672 | `placeOrderWithPayment` no TAB handling | FE | Respect/serve TAB `prepaid` flag (exists); owner to enable for cafe103 | FE must read `payment_types.prepaid/postpaid` (profileTransform L276) |
| CR-526 (+BUG-605) | Beta dialog missing `open`/`onCancel`; Credit Mgmt no action | FE | Settlement lock (OD-526-B) | — |
| CR-542 | Reason dropdown on every Unpaid (Audit, Beta, Credit Mgmt) | FE+BE | `Unpaid` reason type + `reason` param | — |
| CR-514 | Config-driven reference box per method | FE+BE | Per-method config (Q18) | Q18 |
| CR-522 | ±3% hardcoded | FE+BE | Tolerance key (Q17) | Q17; waits Batch A PIN (CR-494) |
| CR-527 | Diner ≠ credit holder; show diners in holder portfolio | FE+BE? | Diner name per credit entry (TBD — detail probe timed out) | Q15 |
| CR-536 | Add customer billing address to B2B invoice + print | FE+BE | Address field on bill payment / print payload | — |
| BUG-607 | FE ignores `restaurant_gst=category`; per-item `product.tax` already used | FE+BE (Gyan) | Confirm products carry item GST when mode=category | Product tax probe not done |
| CR-394 | CR-348 already has GST % + Incl/Excl | FE | — | Q16 |

## Pending (next session)
- Owner R5: Q15 (CR-527 display), Q16 (CR-394 scope), Q17 (CR-522 tolerance source), Q18 (CR-514 config location) — asked, NOT answered.
- Probes not yet done: credit customer detail (`tap-customer-record-list`) fields for CR-527; product list tax fields for BUG-607 when `restaurant_gst=category`; settlement lock behaviour.
- Write per-item docs `impact/<ID>_IMPACT_ANALYSIS.md` (10), backend brief, registry → `GATE_2_IA_CLOSED`.
- Owner housekeeping: delete credit customer `TEST_BATCHB_CREDIT` (id 3118, ₹0) on cafe103; enable TAB prepaid for cafe103 (OD-672-B).
