# BUG-660 — Impact Analysis (Gate 2)

**Item:** Collect Bill → Credit: prefilled customer shows duplicate CRM suggestions (name + phone dropdowns both auto-open)
**Date:** 2026-11-09 · **Role:** PLANNING (stage: Impact Analysis only) · **Risk:** HIGH (customer data on billing surface, R5 hotspot) · **Severity:** P0 (owner override of agent P2, 2026-11-09)
**Code Reality:** NONE — no `BUG-660` marker in `src/`.
**Intake:** `change_requests/BUG-660_CPP_CREDIT_PREFILLED_CUSTOMER_DOUBLE_SUGGESTIONS_INTAKE.md` · **Investigation:** `INV-021115_INVESTIGATION_REPORT.md`
**Owner decision on record:** Option (c) — a prefilled customer that matches a CRM record is treated as already selected.

## 1. Conflict Pre-Check
| Item | Status | Touches same region? | Verdict |
|---|---|---|---|
| BUG-183 | GATE_5A_IMPLEMENTED | YES — `tabCrmId` state L542, lookup/create effect L577-605, payload L1229 | Build ON TOP; must not regress crmId capture |
| BUG-636 | GATE_5B_QA_PASS | YES — debounce in lookup effect L581-604 | Build ON TOP; keep 600 ms intl debounce + cleanup |
| BUG-631 | GATE_5B_QA_PASS | Phone input `compact` (L3307) | No overlap |
| BUG-038 | CLOSED | GAP-A seed `false` L533-541 | Intent must be preserved (cashier can still change/search) |
| CR-385 / BUG-448 | QA/regression | `tab-customer-section` hidden under `.frontdesk-bill.fd-bill-tab-prefilled` | No overlap (testid unchanged) |
| Others on CPP (BUG-595/614/615/619/623, CR-483 …) | various | Discount / loyalty / print regions | Parallel-safe — different line ranges |

No blocking conflict. Sequence: apply after BUG-636 (already in code).

## 2. Data Flow Trace
```
POS API employee-orders-list / socket v2 payload
  user_name="prashant", user.phone="9535004327"
→ orderTransform.js L176 customerName, L218 phone
→ OrderEntry.jsx L425-447 / L473-480 setCustomer({name, phone})
  + enrichCustomerLoyaltyFromCRM (L258-278) → async lookupCustomer → customer.id = CRM id (may or may not be ready when CPP mounts)
→ CollectPaymentPanel props.customer
  L517-518 tabName/tabPhone seeded from customer
  L541 tabIsCustomerSelected = false (always)          ← BREAK POINT
  L542 tabCrmId = null (customer.id NOT used as seed)
→ cashier selects Credit → isTabPayment=true
  L559-575 phone effect: searchCustomers(phone) → setTabShowPhoneSuggestions(true)
  L607-623 name  effect: searchCustomers(name)  → setTabShowNameSuggestions(true)
  L582-605 lookup effect: lookupCustomer → setTabCrmId(found.id) (does NOT mark selected)
→ UI L3285 name dropdown + L3317 phone dropdown both rendered → same record shown twice
```
CRM verified: 1 record (`evidence/BUG-660/crm_*.json`).

## 3. Affected Code (single file)
`src/components/order-entry/CollectPaymentPanel.jsx` (R5 hotspot)
| Lines | Element | Impact |
|---|---|---|
| L541 | `tabIsCustomerSelected` seed | Candidate change point (seed from CRM match) |
| L542 | `tabCrmId` seed | Candidate: seed from `customer?.id` when phone present |
| L559-575 | phone search effect | `.then` sets show=true without re-checking selection → race (see R2) |
| L582-605 | lookup/create effect | Candidate: on `found.id` also mark selected |
| L607-623 | name search effect | same race as phone |
| L645-652 | `selectTabCustomer` | reference behaviour for "selected" |
| L657-677 | blank-out handlers | only reset selection when a field is emptied |
| L1229 | `tabContact` payload → orderTransform L1755-1757 `crm_customer_id` | Downstream — must receive correct crmId |
| L3271-3340 | TAB block render | No markup change expected |

Blast radius: 1 file, ~9 refs to `tabIsCustomerSelected`. Scope SMALL. No API / transform / context / localStorage / provider change.

## 4. Downstream Consumers
- `orderTransform.js` collect-bill builder L1755-1757: `name`, `mobile`, `crm_customer_id` — unchanged contract; benefits from crmId being set earlier.
- Daily Report Credit tab (BUG-183) depends on `crm_customer_id` — must still be populated.
- CRM create path (L596-599): with option (c), create still fires only when lookup returns not-found → unchanged.
- Validation L3339-3350 / Pay disable L3478: unaffected (depends on tabName/tabPhone only).
- `fd-bill-tab-prefilled` frontdesk mode (CR-385/BUG-448): section hidden; behaviour irrelevant there.

## 5. Approach Options (for Gate 3)
| Opt | Mechanism | Pros | Cons |
|---|---|---|---|
| A | In lookup effect L594: if `found.id` and found phone == current `tabPhone`, `setTabCrmId` **and** `setTabIsCustomerSelected(true)` | Uses existing CRM call; works even if `customer.id` not yet enriched | Search effects fire first → dropdowns can flash open until lookup resolves (~CRM latency) |
| B | Seed `tabIsCustomerSelected` / `tabCrmId` from `customer?.id && customer?.phone` | Instant, no flash | Depends on async enrichment timing; alone doesn't cover un-enriched customers; partially reverses BUG-038 GAP-A |
| **A+B (recommended)** | B as instant seed + A as fallback, plus stale-response guard in both search effects | No flash when enriched; covers late enrichment | ~8-12 lines, still 1 file |

## 6. Risk Register
| # | Risk | Mitigation |
|---|---|---|
| R1 | BUG-038 GAP-A regression: cashier can no longer search a different credit customer | Keep blank-out reset; Gate 3 to decide whether ANY edit (not just blank) resets selection (OD-660-03) |
| R2 | Race: `searchCustomers().then` sets show=true after selection flipped true | Guard `.then` with current selection state (cancel flag in effect cleanup) |
| R3 | Wrong customer linked if prefilled phone matches a different CRM name | Match on phone (+country code) only → CRM is mobile-unique; keep prefilled name (OD-660-01) |
| R4 | BUG-636 debounce/cleanup broken | Change only the `.then` body; keep timer logic |
| R5 | crmId lost → Daily Report Credit tab empty (BUG-183) | Verify `crm_customer_id` in collect-bill payload |
| R6 | Intl numbers (CR-479) | Same `isValidPhone` rule; verify with non-+91 |

## 7. Owner Decision Queue
- **OD-660-01** ✅ RESOLVED 2026-11-09 — YES: phone (+country code) match via CRM lookup = selected; keep prefilled name.
- **OD-660-02** ✅ RESOLVED 2026-11-09 — YES: on CRM lookup failure/timeout keep current behaviour (search lists still work as fallback).
- **OD-660-03** ✅ RESOLVED 2026-11-09 — YES: after auto-select, editing either field (not only blanking) re-enables search.
- **Severity** ✅ RESOLVED 2026-11-09 — Owner set **P0** (override of agent-classified P2).

## 8. Verification Seeds (for Gate 3 matrix)
1. Order #021115 → Collect Bill → Credit: no suggestion dropdowns; name/phone prefilled; payload `crm_customer_id` = f917cc7a…
2. Prefilled phone NOT in CRM → no auto-select; create path still creates CRM profile.
3. Clear name → search works again; pick another customer → crmId switches.
4. Walk-in with no customer → typing still shows suggestions (single field at a time).
5. Intl number (+971 …) → 600 ms debounce intact; auto-select works.
6. Cash/UPI/Card unaffected (effects no-op).

## 9. Gate 2 Closure
- Status: **CLOSED 2026-11-09** — all owner decisions resolved (OD-660-01/02/03 = YES, severity P0).
- Approach locked for Gate 3: **A+B** (seed selected/crmId from `customer.id`+phone; lookup-found marks selected; stale-response guard in both search effects; any field edit resets selection per OD-660-03; lookup failure → current behaviour per OD-660-02).
- Risk remains HIGH. Note: R1 mitigation now fixed by OD-660-03.
- Next: PLANNING Gate 3 — Implementation Plan at `plans/BUG-660_IMPLEMENTATION_PLAN.md`.
