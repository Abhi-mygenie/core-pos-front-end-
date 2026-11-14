# QA HANDOVER — BUG-660 → QA (Gate 5B)

**Date:** 2026-11-09 · **From:** IMPLEMENTATION (Gate 5A) · **To:** QA
**Item:** BUG-660 — Collect Bill → Credit: prefilled customer shows duplicate CRM suggestions
**Severity:** P0 (owner override of P2) · **Risk:** HIGH · **Sprint:** nov_cr_batch

## 1. What was fixed

One file: `src/components/order-entry/CollectPaymentPanel.jsx`
7 edits (~25 lines), TAB block state/effects/handlers only.

| Edit | Location | What |
|---|---|---|
| E1 | L541-549 | Seed `tabIsCustomerSelected=true` and `tabCrmId=customer.id` when order already has CRM-matched customer (`customer.id` + `customer.phone`). Added `tabAutoSelectedPhoneRef` and `tabPhoneWasUserTypedRef` refs. |
| E2 | L570-583 | Stale-cancel guard on phone search effect + user-typed ref guard (phone search only fires when user typed in phone field). |
| E3 | L601-607 | CRM lookup match auto-marks customer selected (once per phone, keeps typed name). |
| E4 | L628-640 | Stale-cancel guard on name search effect. |
| E5 | L663 | `selectTabCustomer` records phone in `tabAutoSelectedPhoneRef`, resets `tabPhoneWasUserTypedRef=false`. |
| E6 | L676-692 | Any-edit resets `tabIsCustomerSelected` (OD-660-03). Name blank → phone cleared. Phone blank → name cleared. Phone change → `tabCrmId` cleared + `tabPhoneWasUserTypedRef=true`. |

## 2. Self-test results (all PASS)

| Check | Result |
|---|---|
| V1 — #021115 Credit → 0 dropdowns | PASS |
| V3 — late CRM enrichment → dropdowns stay closed | PASS |
| V5 — name edit re-enables name search; phone dropdown stays closed | PASS |
| V6 — phone edit re-enables phone search | PASS |
| V7 — blank-out parity | PASS |
| Webpack compile | 0 new warnings |

## 3. QA verification matrix (from plan §5)

| # | Scenario | Expected | Automated? |
|---|---|---|:---:|
| V1 | #021115 Credit → open | 0 dropdowns, name='prashant', phone='9535004327' | YES |
| V2 | Same, Pay (owner-approved order) → payload | `crm_customer_id`=f917cc7a-… | NO (network tab) |
| V3 | Open Credit immediately (before enrichment lookup resolves) | dropdowns closed after lookup | YES |
| V4 | Type phone fast then pick | no re-open after pick | YES |
| V5 | After V1, append char to name | name suggestions appear; phone stays closed | YES |
| V6 | After V5, change last phone digit | phone search re-enables | YES |
| V7 | Clear name → phone cleared; clear phone → name cleared | parity | YES |
| V8 | New 10-digit number + name → not in CRM | no auto-select; CRM create fires | NO |
| V9 | Block crm.mygenie.online → open Credit | no crash, form usable | NO |
| V10 | Intl (+971) → 600 ms debounce, auto-select on match | — | NO |
| V11 | Cash/UPI/Card → no CRM calls from TAB effects | — | YES |
| V12 | Jest CR-385 regression test | NOTE: pre-existing CSS fail (failing before BUG-660; unrelated to this fix) | pre-existing |

## 4. Credentials
- Login: owner@cafe103.com / Qplazm@10 (see `/app/memory/control/test_credentials.md`)
- Order #021115 (id 1537930): open via dashboard → Dine-In first card → Bill → Collect Bill → Credit
- CRM customer id: f917cc7a-4713-44e8-9ddd-24efa238f326
- Do NOT submit Pay without owner permission (real preprod order)

## 5. Not touched
`orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `customerService.js`, `crmAxios.js`, sockets, contexts, JSX markup/testids, payload builder, validation, Pay-disable, discount/loyalty/coupon/print.

## 6. Known pre-existing issue (not BUG-660)
`src/tests/cr385/hideSectionRows.cr385.test.js` — 1 CSS rule format check failing. Confirmed pre-existing before this change. Unrelated to BUG-660. Register separately if owner wants it fixed.
