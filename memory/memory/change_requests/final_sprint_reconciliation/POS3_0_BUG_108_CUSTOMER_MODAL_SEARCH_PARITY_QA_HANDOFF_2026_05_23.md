# POS 3.0 BUG-108 — CustomerModal Customer-Search Parity QA Handoff

**Date:** 2026-05-23
**Pairs with:** `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_IMPLEMENTATION_REPORT_2026_05_23.md`
**Status:** `bug_108_customer_modal_search_parity_waiting_agent_smoke`

---

## 1. QA Status

```
bug_108_customer_modal_search_parity_waiting_agent_smoke
```

After agent smoke PASS → `bug_108_customer_modal_search_parity_agent_smoke_passed_waiting_owner_smoke`
After owner smoke PASS → folds back into BUG-108 Phase B owner re-smoke approval.

---

## 2. Scope

CustomerModal Name + Phone typeahead parity with CartPanel. Single file: `src/components/order-entry/CustomerModal.jsx`.

Out of scope: redemption, coupon, wallet, totals/tax/payable, payment, settlement, print, socket, backend, dead-code cleanup.

---

## 3. Test Access

- Preview URL: per `/app/frontend/.env` (`REACT_APP_BACKEND_URL`)
- Owner login: `owner@jehsnest.com` / `Qplazm@10` (live CRM data — required for Sapna/Tushar scenarios)
- DevTools required for payload safety inspection

---

## 4. QA Checklist (24 rows)

### Build & Lint

| # | Check | Expected |
|---|-------|----------|
| 1 | `CI=false yarn build` | Exit 0, 0 errors, 1 pre-existing `OrderEntry.jsx:1297` warning |
| 2 | `CustomerModal.jsx` ESLint | Clean |

### Name typeahead

| # | Check | Expected |
|---|-------|----------|
| 3 | Open CustomerModal, type `tu` in Name (2 chars) | Dropdown appears below Name input with matching `name + phone` rows |
| 4 | Continue to `tus` then `tush` | Dropdown updates with refined matches (e.g., `tushar`, `Tusharika`) |
| 5 | Type only `t` (1 char) | No dropdown (below 2-char threshold) |
| 6 | Type a name that matches nothing (e.g., `zzzzzz`) | No dropdown |
| 7 | Click a name suggestion (e.g., `tushar 7906029250`) | Name auto-fills, Phone auto-fills, Member ID badge appears (CRM record); dropdowns close; `isCustomerSelected=true` |

### Phone typeahead

| # | Check | Expected |
|---|-------|----------|
| 8 | Open CustomerModal, type `790` in Phone (3 digits) | Dropdown appears below Phone input with matching customers |
| 9 | Type `79` (2 digits) | No dropdown (below 3-char threshold) |
| 10 | Click a phone suggestion | Name auto-fills, Phone auto-fills, Member ID badge appears; dropdowns close |

### Selection + loyalty preservation

| # | Check | Expected |
|---|-------|----------|
| 11 | After #7 or #10, click Save | Modal closes; on Collect Bill, loyalty section shows tier + points + `₹X available` immediately (no follow-up CRM round-trip) |
| 12 | Pick Sapna `9004020412` via Phone typeahead → Save | Loyalty section shows `Bronze` + `86 pts` + `₹X available` (from CRM data) |
| 13 | Loyalty helper copy | `"Redemption will be enabled in a future update."` |

### Member ID regression (per Q1=A — must remain functional)

| # | Check | Expected |
|---|-------|----------|
| 14 | Type into Member ID field | Existing dropdown still appears |
| 15 | Click a Member ID suggestion | Name + Phone still auto-fill (existing behavior unchanged) |
| 16 | After #15, click Save | Loyalty also propagates (via new `selectedCRMCustomer` shared capture) |

### Manual new-customer entry

| # | Check | Expected |
|---|-------|----------|
| 17 | Type a fully new Name + Phone with no CRM match → Save | `createCustomer` runs as before; Collect Bill loyalty shows "Loyalty program unavailable" (correct — brand-new record) |
| 18 | Type new name + matching CRM phone → Save | `lookupCustomer(phone)` resolves; loyalty propagates (existing P6 path B unchanged) |

### CartPanel regression (must NOT be affected)

| # | Check | Expected |
|---|-------|----------|
| 19 | CartPanel Name typeahead | Still works identically (file unchanged) |
| 20 | CartPanel Phone typeahead | Still works identically |
| 21 | Order-restore enrichment (P2/P3 from Pipeline Fix) | Still fires `lookupCustomer(phone)` after table re-engage |

### Payload safety & flags

| # | Check | Expected | Where |
|---|-------|----------|-------|
| 22 | `used_loyalty_point` in place-order / bill-payment payload | `0` | DevTools → Network |
| 23 | `loyalty_dicount_amount` in payload | `0` | DevTools → Network |
| 24 | Loyalty checkbox state | Disabled (`loyaltyRatioLive=false` unchanged) | Collect Bill |

### Regression — coupon / wallet / manual discount / totals

| # | Check | Expected |
|---|-------|----------|
| 25 | Coupon section | Still "Coming soon" / disabled |
| 26 | Wallet section | Still read-only / disabled |
| 27 | Manual discount | Still works; `₹ available` recalculates to capped amount |
| 28 | Grand total + tax | Unchanged regardless of loyalty preview visibility |

### Optional — Room-service inline mirror

| # | Check | Expected |
|---|-------|----------|
| 29 | Room-service Collect Payment inline | Inherits same enriched `customer` state; loyalty section matches standard view |

---

## 5. Agent Smoke Steps

1. `cd /app/frontend && CI=false yarn build` → confirm 0 errors and only the pre-existing `OrderEntry.jsx:1297` warning.
2. ESLint on `CustomerModal.jsx` → clean.
3. Code-level verify:
   - State: `filteredByName`, `filteredByPhone`, `showNameSuggestions`, `showPhoneSuggestions`, `isCustomerSelected`, `selectedCRMCustomer` exist.
   - Refs: `nameInputRef`, `phoneInputRef` exist.
   - Two new `useEffect`s on `name` (≥2) and `phone` (≥3), both gated by `!isCustomerSelected`.
   - Outside-click handler covers all three dropdowns and skips `data-suggestion-modal="true"`.
   - `selectModalCustomer` populates name/phone/memberId/memberSearch + sets `isCustomerSelected=true` + `selectedCRMCustomer=c` + closes all dropdowns.
   - `selectMember` additionally sets `isCustomerSelected=true` and `selectedCRMCustomer=member`.
   - `handleSave` reads `selectedCRMCustomer` first; falls back to `initialData` and `existing`.
   - Name input has `ref={nameInputRef}`, `className` includes `relative`, `onChange={handleNameChange}`, dropdown rendered conditionally with `data-suggestion-modal="true"` buttons using `onMouseDown + e.preventDefault()`.
   - Phone input has equivalent wiring with `handlePhoneChange`.
4. Grep verify hard-boundary files untouched: `orderTransform.js`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `customerTransform.js`, `BUG108_FLAGS.js`.
5. Write agent smoke report at:
   `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_AGENT_SMOKE_REPORT_2026_05_23.md`

---

## 6. Owner Smoke Steps

1. Login → restaurant `jehsnest`.
2. Open Add Customer modal (the `+` / pencil icon).
3. **Step A — Name typeahead:** type `tus` in the Name field → expect dropdown with `tushar 7906029250`, `tushar 7706001175`, `Tusharika 9453002085` (same suggestions you saw in CartPanel earlier).
4. **Step B — Pick from Name dropdown:** click `tushar 7906029250` → Name and Phone auto-fill, Member ID badge shows.
5. **Step C — Save:** click Save → expect Collect Bill loyalty section to show tier + points + ₹ available for that customer.
6. **Step D — Phone typeahead:** open modal again, type `790` in Phone → expect dropdown.
7. **Step E — Sapna scenario:** type Sapna's phone `9004020412` in Phone, pick from dropdown → Save → Collect Bill loyalty section shows `Bronze` + `86 pts` + `₹X available`.
8. **Step F — Manual new customer:** type a new name + new phone (no CRM match) → Save → modal closes, Collect Bill loyalty section shows "Loyalty program unavailable" (correct — brand-new customer).
9. **Step G — Member ID still works:** type in Member ID field → dropdown appears as before; pick a row → Name/Phone auto-fill; Save → loyalty also propagates.
10. **Step H — Regression:** verify coupon still "Coming soon", wallet still disabled, manual discount still works, totals/tax unchanged.

Owner records verdict in the standard PASS/FAIL template (8 steps + defects + final verdict).

---

## 7. Pass / Fail Template (owner copy-paste)

```
=== BUG-108 CUSTOMERMODAL SEARCH PARITY — OWNER SMOKE ===
Date          : ___
Tester (owner): ___
Restaurant    : jehsnest

Step A — Name typeahead (≥2 chars) shows dropdown            : P / F  (___)
Step B — Pick from Name dropdown auto-fills fields           : P / F  (___)
Step C — Save → Collect Bill shows loyalty preview           : P / F  (___)
Step D — Phone typeahead (≥3 digits) shows dropdown          : P / F  (___)
Step E — Sapna 9004020412 → 86 pts on Collect Bill           : P / F  (___)
Step F — Manual new customer save still works                : P / F  (___)
Step G — Member ID search regression                         : P / F  (___)
Step H — Coupon/wallet/manual discount/totals unchanged      : P / F  (___)

Defects found  : ___
Final verdict  : APPROVED  /  NEEDS FIX
```

---

## 8. Final Gate

```
WAITING_AGENT_SMOKE_THEN_OWNER_SMOKE
```

After agent smoke PASS → `WAITING_OWNER_BUG_108_CUSTOMER_MODAL_SMOKE_APPROVAL`
After owner smoke PASS → resumes BUG-108 Phase B owner re-smoke (combined verdict).

---

**End of BUG-108 CustomerModal Customer-Search Parity QA Handoff.**
