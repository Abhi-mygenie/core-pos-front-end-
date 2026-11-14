# Batch B — Owner Answers (DRAFT, round 1) — 2026-11-14

Status: DRAFT — pending owner confirmation. Not yet written to registry.
Owner rule: only P0 items discussed now; P1/P2 parked.

## Priority changes (owner)
| Item | New priority |
|---|---|
| CR-517 (advance payment at collection) | P1 — idea: "Advance" option during payment collection |
| BUG-475 | P1 |
| BUG-118 | P1 |
| CR-126 | P2 |
| CR-425 | P1 |
| CR-520 | P1 |
| CR-438 | P2 |
| CR-447 | not answered (P1 already — out of P0 scope) |

## P0 answers
| Q | Answer |
|---|---|
| 671-01 | Unpaid button does not show for partly-paid orders. |
| 671-02 | Whole bill becomes unpaid. |
| 672-01 | Scan/online paid AND cashier-marked prepaid. |
| 672-02 | Option exists in Collect Bill but does not work (screenshot referenced — NOT received). |
| 514-01 | Backend configures per payment method whether reference field is needed. |
| 514-02 | Backend admin (phase 1). NEW CR: CR-514 settings in POS Settings, P1. |
| 514-03 | Yes — each split part gets its own reference box. |
| 522-01 | Unclear ("4 522-01") — re-asked. |
| 522-02 | Phase 1 backend admin; phase 2 POS Settings. |
| 522-03 | Same limit both ways. |
| 522-04 | Outside range → blocked. |
| 526-01 | Uses the "make unpaid" right. |
| 526-02 | Reason required from dropdown — and owner adds: every "make unpaid" must require a reason (today it does not). |
| 526-03 | No PIN. |
| 526-04 | On dashboard same behaviour as unpaid; other behaviour = same as existing unpaid order, no new code. |
| 526-05/06 | Same as existing unpaid behaviour. |
| 526 buttons | Button needed in Order Report, Order Beta and Credit Management (screenshot referenced — NOT received). |
| 527 | Decide at impact. |
| 536-01 | B2B fields (GST no., address, UPI ID) shown in report and on print if saved (screenshot referenced — NOT received). |
| 536-02 | Owner believes customer record already holds them — verify at impact. |
| 536-03 | All restaurants. |
| 536-04 | One CR. |
| BUG-607 | If GST enabled, tax must be at item/category level per restaurant; backend work (today restaurant-level setting). Assign Gyan. |
| CR-394 | "Always has to be exclusive" (screenshot referenced — NOT received) — re-asked, conflicts with CR-394 inclusive request. |

## Round 2 answers (2026-11-14)
| Q | Answer |
|---|---|
| 671-03 | Backend handles already-paid amount when bill made unpaid. |
| 672-04 | Credit (no TAB option in Collect Bill). |
| 672-03 | No extra right — prepaid→credit is done by choosing Credit payment method in Collect Bill. |
| 514-04 | (re-asked, answered b) Backend sets per method: show/hide AND required/optional; required → Pay locked until filled. |
| 514-05 | Decide at impact. |
| 522-01 | Free-typed %. |
| 526-07 | Backend handles credit/money side. |
| 526-08 | New separate unpaid-reasons list from backend. |
| 526-09 | Reason required on every make-unpaid, everywhere. |
| 526-10 | Order Report (Audit) and Order Beta are different screens — button in Audit, Order Beta and Credit Management. |
| 526-11 | Reason-on-unpaid = its own new CR. |
| 536-05 | Owner asked for detailed re-explanation — re-asked. |
| 536-06 | Drop "Prana" from title. |
| 607-04 | POS already has the key — detail at impact. |
| CR-394 | Not sure — discuss at impact. |
| B-client | ALL. |
| B-assign | Yes — Abhishek FE, waiting on Gyan; BUG-607 → Gyan. |

Code note (536): Collect Payment today has "Credit Customer Details" (name + phone, shown only for Credit) and a separate "B2B Invoice (Optional)" section (GST Number + GST Registered Name, shown for all methods) — CollectPaymentPanel.jsx L3292-3404. No address or UPI ID fields exist.

