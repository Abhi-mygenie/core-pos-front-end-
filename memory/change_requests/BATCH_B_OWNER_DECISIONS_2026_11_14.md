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

---

## Contracts round — R1a (2026-11-15)

Source: owner answers to Round 1a questions on DRAFT v1 contracts.

| OD | Decision |
|---|---|
| OD-B-NAMES | **Owner locks proposed field names now** (like Batch A R19). Names in DRAFT contracts are locked immediately; backend can only reply OK / ETA / Not feasible. |
| OD-B-BB01-A | **BUG-672 BB-01 behaviour confirmed:** credit/TAB payment on a prepaid order is ALLOWED when the restaurant admin has set TAB `prepaid: 1`; REJECTED when `prepaid: 0`. Backend enforces the flag server-side (soft defence). Error code: TBD — owner answer gave behaviour context, error code carried to R1b. |
| OD-B-BB02-A | **CR-526 BB-02 settlement signal:** `day_settled` key needed; covers BOTH (a) manual cashier day-closure and (b) auto 6 AM settlement. Owner: "every day at 6 am auto settlement happens, we should have a key for that." Signal shape (settlement-report field vs order-row field) carried to R1b. |
| OD-B-BB03 | **CR-526 BB-03 error LOCKED:** 422 `DAY_ALREADY_SETTLED`, message "Day already settled". |
| OD-B-BB0405-A | **CR-542 BB-04/05:** owner asked to detail each part separately → answered in R1b. |

## Contracts round — R2 (2026-11-15)

| OD | Decision |
|---|---|
| OD-B-BB06 | **CR-514 BB-06 LOCKED:** `ref_enabled` (int 0/1) · `ref_required` (int 0/1) · `ref_label` (string or null) · `ref_max_len` (int or null, **default 50 when blank**). All four fields added to `payment_types[]` in profile. |
| OD-B-BB08 | **CR-522 BB-08 LOCKED:** `reconcile_tolerance_pct`, decimal, 0/blank = off. **No maximum cap** — any positive decimal value accepted. |
| OD-B-BB09 | **CR-527 BB-09 LOCKED:** `diner_name` (string or null) **and** `diner_mobile` (string or null) — both on credit rows. Owner note: "if diner mobile is right it becomes a customer — not sure if CRM API allows that" → backend note for Gyan (see contract). |
| OD-B-BB10 | **CR-536 BB-10/BB-10b LOCKED:** `custGSTAddress` (max 255) on order payload · `cust_gst_address` (max 255) in reports · `gst_address` (max 255) on customer profile. All three confirmed as drafted. |
| OD-B-BB1213 | **BUG-607 BB-12 / CR-394 BB-13:** owner asked for explanation — sent in R2b mini-round. |

## Contracts round — R2b final (2026-11-15)

| OD | Decision |
|---|---|
| OD-B-BB12 | **BUG-607 BB-12 CONFIRMED:** data request only — Gyan to share one order ID with wrong GST applied. No API field, no contract. |
| OD-B-BB13 | **CR-394 BB-13 CONFIRMED:** one-time backend data fix only (Inclusive → Exclusive for GST-ON outlets). No API change. **FE QA note (owner):** after data fix, FE team validates reports for inconsistencies — "we always had exclusive so reports need to be validated". |

## ALL 8 BATCH B CONTRACTS APPROVED — 2026-11-15

Owner: "approved" — all 8 contracts approved simultaneously 2026-11-15.

| Contract | File | Status |
|---|---|---|
| BUG-672 | `contracts/BATCH-B_BUG-672_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |
| CR-526 | `contracts/BATCH-B_CR-526_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |
| CR-542 | `contracts/BATCH-B_CR-542_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |
| CR-514 | `contracts/BATCH-B_CR-514_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |
| CR-522 | `contracts/BATCH-B_CR-522_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |
| CR-527 | `contracts/BATCH-B_CR-527_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |
| CR-536 | `contracts/BATCH-B_CR-536_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |
| BUG-607 | `contracts/BATCH-B_BUG-607_API_CONTRACT_2026_11_15.md` | **FINAL v1 — LOCKED 2026-11-15** |

| OD | Decision |
|---|---|
| OD-B-BB01-FINAL | **BUG-672 BB-01 DROPPED:** owner decided FE hiding the Credit button is sufficient. No backend enforcement needed. BB-01 = FE-only. BUG-672 contract updated to reflect no backend action required. |
| OD-B-BB02-FINAL | **CR-526 BB-02 CONFIRMED:** proactive greying (`day_settled` on order rows) — **but only when restaurant has settlement enabled** (`settelment_report: "Yes"` in settings-list). When settlement is OFF, `day_settled` is always false / ignored. Backend to implement accordingly. |
| OD-B-BB04-FINAL | **CR-542 BB-04 LOCKED:** endpoint `GET /api/v2/vendoremployee/unpaid-reasons`. Owner note: "backend might change endpoint if there is already a structure with them" → per R19, if backend has an existing endpoint, they confirm the existing name and FE uses it as-is; a new endpoint is added only if none exists, using exactly this name. |

| OD | Decision |
|---|---|
| OD-B-BB01-B | **BUG-672 BB-01:** owner asked for clarification — "credit can be allowed". Explanation sent (R1c): when admin sets `prepaid:1` credit IS allowed; BB-01 only asks backend to enforce when `prepaid:0`. Re-asked in R1c. |
| OD-B-BB02-B | **CR-526 BB-02:** owner asked why signal needed. Explanation sent (R1c): proactive UI disable vs error-on-attempt. Re-asked in R1c. |
| OD-B-BB04 | **CR-542 BB-04 CHANGED:** reasons NOT added to `cancellation-reasons` list. Owner: "it will be a different list of reasons" → separate endpoint. Name TBD — asked in R1c. |
| OD-B-BB05-REASON | **CR-542 BB-05 LOCKED:** `make-order-unpaid` accepts `reason` (text string only) — **no `reason_id`**. |
| OD-B-BB05-SCOPE | **CR-542 BB-05 LOCKED:** reason required on **all three actions** — Make Unpaid (Audit + Order Beta) + Remove from Credit + Remove from Room. |
