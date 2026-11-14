# Batch B — Owner Decisions (FINAL for intake) — 2026-11-14

Source: owner Q&A rounds 1–3 (2026-11-14). Detail in `BATCH_B_OWNER_ANSWERS_DRAFT_2026_11_14.md`.
Scope rule: only P0 items discussed; P1/P2 parked. Client = **ALL**. Assignee rule: Abhishek FE, "waiting on Gyan" where backend needed; BUG-607 → Gyan.

## P0 items → impact analysis
| Item | Decision |
|---|---|
| BUG-671 | Partly-paid orders: Unpaid button missing → show it. Whole bill becomes unpaid; backend handles already-paid amount. |
| BUG-672 | Prepaid (scan/online + cashier-marked) → Credit via Credit payment method in Collect Bill is broken. No extra right. (No TAB option exists in Collect Bill.) |
| CR-514 | Reference box per payment method; backend admin sets show/hide AND required/optional per method; required → Pay locked until filled. Split: one box per part. Where shown after → impact. |
| CR-522 | Free-typed tolerance %, same both ways, outside range blocked. Phase 1 backend admin, phase 2 POS Settings. |
| CR-526 | Make-unpaid/remove button in Audit report, Order Beta, Credit Management; "make unpaid" right; no PIN; same behaviour as existing unpaid; backend handles money. |
| CR-527 | Same phone / different names in Credit — detail at impact. |
| CR-536 | GST no., address, UPI ID for credit/B2B, shown in report + print if saved. All restaurants, one CR, "Prana" removed from title. Entry point/UPI owner → impact. Code: Collect Payment has "Credit Customer Details" (name+phone, Credit only) + "B2B Invoice (Optional)" (GST no.+name, all methods); no address/UPI fields. |
| BUG-607 | GST enabled → tax at item/category level per restaurant (today restaurant-level). Backend (Gyan). POS key exists — detail at impact. |
| CR-394 | Inclusive vs exclusive on open items unclear — discuss at impact. |

## New CRs
| ID | Title | Priority |
|---|---|---|
| CR-541 | Payment reference-box settings (CR-514) editable in POS Settings | P1 |
| CR-542 | Reason mandatory on every Make Unpaid (new backend unpaid-reasons list) | TBD (owner) |

## Priority changes
P1: CR-517, BUG-475, BUG-118, CR-425, CR-520 · P2: CR-126, CR-438 · CR-447 unchanged (P1, parked).

## Still open with owner
- CR-542 priority (P0/P1?)
- Merge CR-522 phase 2 into CR-541? (not answered — kept separate)
- Confirm impact order: 671/672 → 526/542 → 514 then 522 (after Batch A PIN) → 536/527 → 607/394
