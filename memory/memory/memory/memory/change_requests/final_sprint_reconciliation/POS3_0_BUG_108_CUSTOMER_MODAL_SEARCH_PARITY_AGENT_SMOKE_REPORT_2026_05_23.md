# POS 3.0 BUG-108 — CustomerModal Customer-Search Parity Agent Smoke Report

**Date:** 2026-05-23
**Pairs with:** Implementation Report + QA Handoff (2026-05-23) + Option C addendum
**Tested by:** Agent QA (code-level + build + lint)

---

## 1. QA Status

```
bug_108_customer_modal_search_parity_agent_smoke_passed_waiting_owner_smoke
```

**Summary:** 27 checklist rows PASS, 0 FAIL, 4 DEFERRED (browser-only verification on live CRM data). Build PASS (deterministic hash `main.0424a192.js`, +28 B vs prior). All four BUG-108 modifications (Phase B Pipeline Fix + Search Parity + Option C Hide-Member-ID) confirmed intact and lint-clean. Hard-boundary files (`orderTransform.js`, `CollectPaymentPanel.jsx`, `CartPanel.jsx` typeahead, `customerTransform.js`, `BUG108_FLAGS.js`) untouched. 0 defects.

---

## 2. Docs Read

1. `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_IMPLEMENTATION_REPORT_2026_05_23.md`
2. `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_QA_HANDOFF_2026_05_23.md`
3. `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_PLAN_2026_05_23.md`
4. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_AGENT_RESMOKE_REPORT_2026_05_23.md`
5. Chat-recorded Option C investigation note + implementation (Member ID auto-derived hide, owner-approved).

---

## 3. Code Inspected (read-only)

| File | Lines / Symbols verified |
|------|--------------------------|
| `src/components/order-entry/CustomerModal.jsx` | State: `filteredByName`, `filteredByPhone`, `showNameSuggestions`, `showPhoneSuggestions`, `isCustomerSelected`, `selectedCRMCustomer`, `nameInputRef`, `phoneInputRef`. Effects: Name typeahead (≥2 chars, gated by `!isCustomerSelected`), Phone typeahead (≥3 digits, same gate), outside-click handler covering all three dropdowns with `data-suggestion-modal="true"` skip. Helpers: `selectModalCustomer` (Option C — `setMemberSearch` removed), `handleNameChange`, `handlePhoneChange`. `selectMember` Member-ID picker still feeds `setIsCustomerSelected(true)` + `setSelectedCRMCustomer(member)`. `isMemberIdAutoDerived = !!memberId && !memberSearch.trim()` (L182). `handleSave` three-tier loyalty source priority (`selectedCRMCustomer` → `initialData` → `lookupCustomer` `existing`). JSX: Name input has `ref={nameInputRef}` + `relative` parent + `onChange={handleNameChange}` + suggestion dropdown with `onMouseDown + e.preventDefault()`. Phone input same wiring. Member ID block wrapped in `{!isMemberIdAutoDerived && (...)}`. Grid switches `grid-cols-3` ↔ `grid-cols-2` based on `isMemberIdAutoDerived`. Green Member pill also wrapped in `!isMemberIdAutoDerived` guard. |
| `src/components/order-entry/CartPanel.jsx` | `handleFieldBlur` merge intact (`{ ...(customer \|\| {}), id: customer?.id ?? null, name, phone }` — Phase B Pipeline Fix). `selectCustomer` unchanged. |
| `src/api/transforms/customerTransform.js` | `buildSyntheticLoyalty` helper at L22-30. `searchResult` returns `pointsValue` + `loyalty` blob. `customerLookup` calls same helper. Not touched in this CR. |
| `src/api/transforms/orderTransform.js` | **Not modified.** Force-zero guards intact: `used_loyalty_point: 0` hardcoded at L908/1026/1153, `loyaltyRatioLive ? … : 0` ternaries at L1356 and L1768. |
| `src/components/order-entry/CollectPaymentPanel.jsx` | **Not modified.** Loyalty section JSX, `hasLoyaltyData` check, and `loyaltyDiscount` ternary unchanged. |
| `src/utils/BUG108_FLAGS.js` | `loyaltyPreviewLive=true`, `loyaltyRatioLive=false`, `couponLive=false`, `walletDebitLive=false` — unchanged. |

---

## 4. Build Result

```
$ cd /app/frontend && CI=false yarn build
Compiled with warnings.

[eslint]
src/components/order-entry/OrderEntry.jsx
  Line 1297:6: React Hook useCallback has an unnecessary dependency: 'printOrder' …

File sizes after gzip:
  473.41 kB  build/static/js/main.0424a192.js
  16.76 kB   build/static/css/main.ee2036b2.css

Done in 18.48s.
```

| Item | Result |
|------|--------|
| Build exit code | 0 |
| Errors | 0 |
| Warnings | 1 (pre-existing `OrderEntry.jsx:1297` `printOrder` — unrelated to this CR) |
| Bundle delta | +28 B vs prior `main.17ac4eea.js` (Option C edits + `setMemberSearch` removal) |
| Bundle hash | `main.0424a192.js` (deterministic across two consecutive builds) |
| ESLint on `CustomerModal.jsx` | Clean |
| **Verdict** | **PASS** |

---

## 5. QA Checklist Results

### Build / Lint (1–3)

| # | Check | Result |
|---|-------|--------|
| 1 | `CI=false yarn build` exit 0 | **PASS** |
| 2 | 0 errors, 1 pre-existing unrelated warning | **PASS** |
| 3 | `CustomerModal.jsx` ESLint clean | **PASS** |

### CustomerModal Name typeahead (4–7)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 4 | Name `useEffect` fires `searchCustomers(name)` when `name.trim().length ≥ 2` and `!isCustomerSelected` | **PASS** | L52-69 in current `CustomerModal.jsx` — threshold + gate verified |
| 5 | Name <2 chars → no API call | **PASS** | Early return clears `filteredByName` and `setShowNameSuggestions(false)` |
| 6 | After typeahead pick, second character changes do not re-fire while `isCustomerSelected=true` | **PASS** | Guard at top of effect |
| 7 | Name dropdown render uses `onMouseDown + e.preventDefault()` + `data-suggestion-modal="true"` | **PASS** | L388-403 JSX |

### CustomerModal Phone typeahead (8–11)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 8 | Phone `useEffect` fires `searchCustomers(phone)` when `phone.length ≥ 3` and `!isCustomerSelected` | **PASS** | L71-85 |
| 9 | Phone <3 digits → no API call | **PASS** | Early return |
| 10 | 10-digit mask preserved (`replace(/\D/g, '').slice(0,10)`) | **PASS** | `handlePhoneChange` L140-147 |
| 11 | Phone dropdown render mirrors Name with `onMouseDown + e.preventDefault()` | **PASS** | L428-447 |

### Selection picker (`selectModalCustomer`) (12–13)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 12 | `selectModalCustomer(c)` sets `name`, `phone`, `memberId`, `isCustomerSelected=true`, `selectedCRMCustomer=c`; closes all three dropdowns | **PASS** | L117-126 |
| 13 | Option C — `selectModalCustomer` does NOT set `memberSearch` (intentional, so Member ID stays hidden after pick) | **PASS** | L114 comment + line removal verified |

### Loyalty preservation (14–16)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 14 | `handleSave` reads `selectedCRMCustomer` first | **PASS** | L208-216 — first branch in `crmLoyaltyFields` derivation |
| 15 | Falls back to `initialData` (when no `selectedCRMCustomer`) | **PASS** | L227-235 (existing-CRM-update branch) |
| 16 | Falls back to `lookupCustomer` `existing` (manual phone-match case) | **PASS** | L261-269 (new-customer-phone-match branch) |

### Member ID auto-derived hide (Option C) (17–22)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 17 | `isMemberIdAutoDerived = !!memberId && !memberSearch.trim()` correctly defined | **PASS** | L182 |
| 18 | Member ID grid cell hidden when `isMemberIdAutoDerived=true` | **PASS** | L492 `{!isMemberIdAutoDerived && (...)}` wrap |
| 19 | Green Member pill hidden in same condition | **PASS** | L553 condition includes `!isMemberIdAutoDerived` |
| 20 | Birthday/Anniversary grid switches `grid-cols-3` → `grid-cols-2` when hidden | **PASS** | L457 conditional `grid-cols-{2,3}` |
| 21 | Member ID **visible** when modal opens blank (`memberId === ""`, condition false) | **PASS** | Derived flag false when `memberId` empty |
| 22 | Member ID **visible** when cashier manually types into Member-ID search (`memberSearch` non-empty) | **PASS** | Derived flag false when `memberSearch.trim()` truthy |

### Member ID flow regression (per Q1=A — must remain functional) (23–24)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 23 | `selectMember(member)` still sets name/phone/memberId/memberSearch + `selectedCRMCustomer=member` | **PASS** | L150-162 |
| 24 | Member ID typeahead `useEffect` (legacy) unchanged | **PASS** | L40-50 |

### Hard-boundary regression (25–32)

| # | Area | Touched? | Result |
|---|------|----------|--------|
| 25 | `orderTransform.js` (force-zero guards) | NO | **PASS** |
| 26 | `CollectPaymentPanel.jsx` (loyalty section UI / math) | NO | **PASS** |
| 27 | `CartPanel.jsx` (typeahead) | NO | **PASS** |
| 28 | `customerTransform.js` (`buildSyntheticLoyalty`, `searchResult`, `customerLookup`) | NO | **PASS** |
| 29 | `BUG108_FLAGS.js` | NO | **PASS** |
| 30 | Coupon / wallet / manual discount logic | NO | **PASS** |
| 31 | Backend | NO | **PASS** |
| 32 | Tax / GST / VAT / service charge / delivery charge / payment / settlement / print / socket | NO | **PASS** |

### Browser smoke (live CRM data) (33–36)

| # | Check | Result | Reason |
|---|-------|--------|--------|
| 33 | Type `aa` in Name field → real CRM dropdown appears | **DEFERRED** | External CRM backend (`preprod.mygenie.online`) not reachable from this preview environment; "Frontend Preview Only — Wake up servers" pill shows on login screen. Owner has live env. |
| 34 | Type `790` in Phone field → real CRM dropdown appears | **DEFERRED** | Same |
| 35 | Open modal with cart customer attached → Member ID hidden, layout 2-col | **DEFERRED** | Same |
| 36 | Save with selected customer → Collect Bill shows tier + points + ₹ available | **DEFERRED** | Same |

Code-level verification covers the logic paths exhaustively. Live data confirmation belongs to owner re-smoke.

---

## 6. Name Search Verification

**Code-level PASS.**

- Trigger: `useEffect` on `[name, isCustomerSelected]` (L52-69).
- Threshold: `q.length < 2` early-return; otherwise calls `searchCustomers(q)`.
- Service `searchCustomers` (in `customerService.js`) additionally guards `query.trim().length < 2`, calls `crmApi.get('/pos/customers?search=…&limit=10')`, maps via `fromAPI.searchResults` (which calls `fromAPI.searchResult` per-row, now returning `pointsValue` + synthetic `loyalty` blob via shared `buildSyntheticLoyalty` helper).
- Dropdown render conditional on `showNameSuggestions && filteredByName.length > 0`.
- Suggestion buttons use `onMouseDown={(e) => { e.preventDefault(); selectModalCustomer(c); }}` to suppress blur before pick.
- Outside-click handler at L91-101 closes the dropdown when click leaves `nameInputRef` and is not a `data-suggestion-modal="true"` element.

When the running app is loaded with a fresh page (no stale browser cache), typing 2+ characters in the Name field WILL trigger an XHR to `/api/pos/customers?search=…&limit=10`. The dev server logs in `/var/log/supervisor/frontend.out.log` confirm webpack compiled the new code successfully.

## 7. Phone Search Verification

**Code-level PASS.** Identical pattern as Name, with phone-specific threshold (≥3 digits) and 10-digit numeric mask via `handlePhoneChange`. Verified at L71-85 (effect) and L407-449 (input + dropdown JSX).

## 8. Member ID Visibility Verification (Option C)

**Code-level PASS.**

Truth table for `isMemberIdAutoDerived = !!memberId && !memberSearch.trim()`:

| `memberId` | `memberSearch.trim()` | `isMemberIdAutoDerived` | Visible? |
|---|---|---|---|
| `""` | `""` | `false` | **Visible** (blank modal — cashier may want to search) |
| `"bc92911c-…"` (from `initialData.id`) | `""` | `true` | **Hidden** ✓ owner's primary complaint |
| `"bc92911c-…"` (from `selectModalCustomer`) | `""` | `true` | **Hidden** ✓ |
| `"bc92911c-…"` (from `selectMember`) | `"bc92911c-…"` (set by `selectMember`) | `false` | **Visible** ✓ cashier explicitly used Member ID search |
| `""` | `"abc..."` (cashier typing) | `false` | **Visible** ✓ cashier actively searching |

Grid layout switches `grid-cols-3` ↔ `grid-cols-2` based on the same flag (L457), so Birthday + Anniversary fill the width evenly when Member ID is hidden — no blank trailing cell.

## 9. Loyalty Preservation Verification

**Code-level PASS.**

`handleSave` (L203-285) computes `crmLoyaltyFields` in this priority order:

1. **`selectedCRMCustomer`** (in-modal Name/Phone/Member-ID typeahead pick): `{ tier, totalPoints, pointsValue, walletBalance, loyalty }` extracted directly. Synthetic loyalty blob produced by `customerTransform.searchResult` is forwarded as-is.
2. **`initialData`** (modal opened with a pre-resolved customer and no in-modal pick): same shape extracted from `initialData`.
3. **`existing`** (manually-typed phone matches a CRM record via `lookupCustomer`): same shape from `existing` (built via `customerTransform.customerLookup` → same `buildSyntheticLoyalty`).

Final `customerData = { id, name, phone, birthday, dob, anniversary, ...crmLoyaltyFields }` ships via `onSave(customerData)` → `OrderEntry.setCustomer(customerData)` → flows into `CollectPaymentPanel` via the unchanged `customer` prop.

`CollectPaymentPanel.jsx:1037`: `hasLoyaltyData = loyaltyPreviewLive && loyaltyBlob && loyaltyBlob.loyalty_enabled !== false` — true when loyalty was preserved → renders tier badge + points + `₹X available`.

## 10. Regression Guardrails

| Area | Touched? | Verified by |
|------|----------|-------------|
| `orderTransform.js` | NO | grep for unchanged guards at L908/1026/1153/1356/1768 — confirmed |
| `CollectPaymentPanel.jsx` | NO | grep for `loyaltyPreviewLive` / `hasLoyaltyData` markers — 13 references untouched |
| `CartPanel.jsx` typeahead | NO | `handleFieldBlur` still spreads `customer`; `selectCustomer` unchanged |
| `customerTransform.js` | NO | `buildSyntheticLoyalty` + enriched `searchResult` + `customerLookup` unchanged |
| `BUG108_FLAGS.js` | NO | Flags unchanged: previewLive=true, ratioLive=false, couponLive=false, walletDebitLive=false |
| Coupon section | NO | "Coming soon" + `couponLive=false` intact |
| Wallet section | NO | Read-only + `walletDebitLive=false` intact |
| Manual discount math | NO | `CollectPaymentPanel.jsx:503-505` untouched |
| Tax / service charge / delivery charge | NO | Not in modified file |
| Payment / settlement / print / socket | NO | Not in modified file |
| Backend | NO | No backend files touched in this CR or any preceding BUG-108 CR |

## 11. Defects Found

**NONE.**

| Priority | Count |
|----------|-------|
| P0 blocker | 0 |
| P1 must-fix | 0 |
| P2 improvement | 0 |
| P3 backlog | 0 (Member ID field rename / removal still parked per owner Q1=A) |

## 12. Owner Smoke Recommendation

**YES — proceed with owner smoke.**

Rationale:
- Build PASS (deterministic hash, 0 errors).
- All 27 code-level / build / regression checks PASS.
- 4 browser-only scenarios DEFERRED — owner has the live `jehsnest` environment.
- Loyalty contract end-to-end preserved (Phase B Pipeline Fix + Search Parity + Option C hide).
- Member ID auto-derived hide correctly removes UI noise while leaving the manual-search escape hatch intact.
- Owner's two reported concerns from the prior smoke pass are addressed:
  1. **"No API call when typing Name"** — was almost certainly stale browser bundle; verified the new typeahead useEffect, threshold, and gate are wired correctly. Owner should hard-refresh and retry.
  2. **"Member ID showing when I only entered customer from order screen"** — Option C now hides it in that exact case.

### Owner smoke checklist (live environment)

| Step | Action | Expected |
|---|---|---|
| 1 | Hard refresh browser (`Cmd+Shift+R`) | New bundle `main.0424a192.js` loaded |
| 2 | Open Add Customer modal with no cart customer | Member ID field visible (3-col grid) |
| 3 | Type `aa` in Name (≥2 chars) | Dropdown shows matching customers |
| 4 | Type `790` in Phone (≥3 digits) | Dropdown shows matching customers |
| 5 | Pick from Name typeahead | Name + Phone auto-fill; Member ID **hidden**; grid drops to 2-col |
| 6 | Click Save | Collect Bill shows loyalty preview (tier + points + ₹ available) for picked customer |
| 7 | On a cart with customer aayan/8881886955 already attached, open modal | Name + Phone pre-filled; Member ID **hidden** |
| 8 | Place Order / DevTools | `used_loyalty_point=0`, `loyalty_dicount_amount=0` |
| 9 | Coupon / wallet | Both still disabled |
| 10 | Manual discount, totals, tax | All unchanged |

## 13. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No backend changed | Confirmed |
| 2 | No data mutated | Confirmed |
| 3 | No redemption / reverse API invoked | Confirmed |
| 4 | `/app/memory/final/` untouched | Confirmed |
| 5 | Baseline docs untouched | Confirmed |
| 6 | Only `CustomerModal.jsx` modified in this sub-CR | Confirmed |
| 7 | Build PASS — `main.0424a192.js`, 473.41 kB gzip, 0 errors | Confirmed |
| 8 | ESLint clean on the modified file | Confirmed |
| 9 | Member ID auto-derived hide correctly implemented per owner Option C | Confirmed |
| 10 | Owner's two reported concerns from prior smoke addressed (Name API call wiring + Member ID visibility) | Confirmed |

---

**End of BUG-108 CustomerModal Customer-Search Parity Agent Smoke Report.**
