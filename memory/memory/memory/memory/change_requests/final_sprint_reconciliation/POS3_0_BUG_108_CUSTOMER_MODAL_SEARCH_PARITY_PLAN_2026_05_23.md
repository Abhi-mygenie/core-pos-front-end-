# POS 3.0 BUG-108 — CustomerModal Customer-Search Parity Plan

**Date:** 2026-05-23
**Status:** `bug_108_customer_modal_search_parity_planned_waiting_owner_approval`
**Parent CR:** BUG-108 Loyalty Customer Pipeline Fix (2026-05-23)
**Pairs with:** Customer Pipeline Fix Implementation Report + Owner Approval (2026-05-23)

---

## 1. Status

```
bug_108_customer_modal_search_parity_planned_waiting_owner_approval
```

Sprint context: BUG-108 Loyalty Phase B re-smoke is in progress. This sub-CR closes the last customer-entry path inconsistency surfaced during owner re-smoke (CustomerModal Name/Phone fields don't auto-suggest like CartPanel does).

---

## 2. Owner Correction Captured

> **"Member ID is NOT the intended customer lookup flow. CustomerModal Name and Phone fields should support customer search/typeahead like CartPanel. If Member ID search exists, leave it alone or ignore it."**

Recorded verbatim from owner correction (2026-05-23). The previous investigation note recommending "use Member ID search" is **superseded**. This plan treats Member ID as a vestigial control to be left untouched (not promoted, not removed in this CR).

---

## 3. Docs Read

1. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_PLAN_2026_05_23.md`
2. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_OWNER_APPROVAL_2026_05_23.md`
3. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_IMPLEMENTATION_REPORT_2026_05_23.md`
4. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_QA_HANDOFF_2026_05_23.md`
5. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_AGENT_RESMOKE_REPORT_2026_05_23.md`
6. Latest CustomerModal investigation chat note (Name/Phone lack typeahead; only Member ID has it).

---

## 4. Code Areas Inspected

| File | Lines | What was verified |
|------|-------|-------------------|
| `src/components/order-entry/CustomerModal.jsx` | 1-60, 200-310 | State, refs, search effect, `selectMember`, `handleSave`; Name input (L220-228), Phone input (L234-244), Member ID input (L297-309) |
| `src/components/order-entry/CartPanel.jsx` | 4, 609-820, 870-940 | `searchCustomers` import; name/phone state + dual `useEffect` typeahead triggers (L718, L736); `selectCustomer` (L765-773); suggestion buttons with `onMouseDown + e.preventDefault()` (L880, L927); outside-click closer (L747-762); `handleFieldBlur` merge fix (L801-816) |
| `src/api/services/customerService.js` | 20-32, 40-58 | `searchCustomers` and `lookupCustomer` already in shared use; both safe and graceful-failure |
| `src/api/transforms/customerTransform.js` | 22-30, 49-65, 81-105 | `buildSyntheticLoyalty` helper + enriched `searchResult` (Phase B Pipeline Fix) — search results already carry full loyalty shape |

---

## 5. Current CustomerModal Behavior

### Name field (L220-228)
```jsx
<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  ...
/>
```
**No** typeahead, **no** `searchCustomers` call, **no** dropdown. Plain free-text entry.

### Phone field (L234-244)
```jsx
<input
  type="tel"
  value={phone}
  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
  ...
/>
```
**No** typeahead. Plain phone entry with 10-digit validation.

### Member ID field (L297-309) — current sole entry point for existing-customer lookup
```jsx
<input
  type="text"
  value={memberSearch || memberId}
  onChange={(e) => { setMemberSearch(e.target.value); setMemberId(""); }}
  onFocus={() => memberSearch && setShowMemberSuggestions(filteredMembers.length > 0)}
  ...
/>
```
Wired via `useEffect` at L22-32 → `searchCustomers(memberSearch)` → suggestion list → `selectMember(c)` (L46-52) sets name/phone/memberId/memberSearch.

### Save behavior (`handleSave`, L58-167)
- Validation: `name.trim() && phone.trim()` (Save disabled otherwise)
- Branch A: `customerId` truthy and not synthetic (`!startsWith('CUST-')`) → existing CRM customer → `updateCustomer` → captures loyalty from `initialData` ONLY (post Phase B Pipeline Fix L85-92)
- Branch B: New entry → `lookupCustomer(phone)` → if `existing` matches → captures loyalty from `existing` (L118-124) → `updateCustomer`
- Branch C: No CRM match → `createCustomer` → no loyalty (correct — brand-new customer)
- Final `customerData` spreads `crmLoyaltyFields` (L160). Working.

### Loyalty propagation today (post Pipeline Fix)
Works only when **(a)** the modal was opened with `initialData` already carrying loyalty (e.g. from CartPanel typeahead), **or (b)** the typed phone matches an existing CRM record via `lookupCustomer`. **Does NOT work** when owner types only Name without phone — Save stays disabled, and there's no in-modal typeahead to resolve the customer.

---

## 6. CartPanel Search Behavior Reference

What the modal needs to mirror (from `CartPanel.jsx`):

| Concern | CartPanel implementation |
|---------|--------------------------|
| State | `customerName`, `customerPhone`, `isCustomerSelected`, `filteredCustomers` (phone), `filteredByName` (name), `showPhoneSuggestions`, `showNameSuggestions` |
| Refs | `nameInputRef`, `phoneInputRef` (anchors for outside-click) |
| Phone typeahead trigger | `useEffect` on `customerPhone` (L718) — `searchCustomers(customerPhone)` when `phone.length ≥ 3` AND `!isCustomerSelected` |
| Name typeahead trigger | `useEffect` on `customerName` (L736) — `searchCustomers(customerName)` when `name.length ≥ 2` AND `!isCustomerSelected` |
| Suggestion render | Floating `<div>` below input with `<button data-suggestion="true" onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}>` |
| `preventDefault` rationale | Stops the input's `onBlur` from firing before the click handler so `selectCustomer` runs cleanly |
| Outside-click | `mousedown` listener checks `e.target.closest('[data-suggestion="true"]')` first, then refs, then closes both dropdowns |
| Selection action | `selectCustomer(c)` sets name + phone + `isCustomerSelected=true`, then `onCustomerChange({ id, name, phone, tier, totalPoints, pointsValue, walletBalance, loyalty })` (Phase B Pipeline Fix already populates this via `searchResult` transform) |
| Clear behavior | `handleNameChange` / `handlePhoneChange` reset `isCustomerSelected=false` and clear the other field when wiped |

---

## 7. Gap Analysis

| Aspect | CartPanel | CustomerModal | Gap |
|--------|-----------|---------------|-----|
| Name field typeahead | ✅ | ❌ | **MISSING** |
| Phone field typeahead | ✅ | ❌ | **MISSING** |
| Member-ID typeahead | n/a | ✅ | Modal-only, keep untouched |
| Selection captures loyalty fields | ✅ (via Phase B Pipeline Fix) | Partial — only via `initialData` (open-time) or `existing` (phone-match in `handleSave`) | Need an in-modal "selectedCRMCustomer" capture so all three typeahead paths feed loyalty uniformly |
| Outside-click closes suggestions | ✅ | ✅ (Member ID only) | Extend handler to cover two new dropdowns |
| `data-suggestion` markers | ✅ | n/a | Need own marker (`data-suggestion-modal="true"`) to avoid clashing with CartPanel's marker if both ever co-render |
| Auto-fill birthday/anniversary on pick | n/a | n/a | Search result transform doesn't return these — leave them empty for owner to fill |

---

## 8. Recommended Fix Plan

### 8.1 Files to touch

**Only one file:** `src/components/order-entry/CustomerModal.jsx`

No other file is needed. The `searchCustomers` service and the `searchResult` transform (which already produces the synthetic loyalty blob via Phase B Pipeline Fix) are already correct.

### 8.2 Functions / blocks to change

| Block | Change |
|-------|--------|
| State (L9-19) | Add `filteredByName`, `filteredByPhone`, `showNameSuggestions`, `showPhoneSuggestions`, `isCustomerSelected` (mirror CartPanel pattern). Add `selectedCRMCustomer` to hold the picked CRM record's loyalty fields. Add `nameInputRef` and `phoneInputRef`. |
| Search effects (insert after L32) | Two new `useEffect`s: one on `name` (threshold ≥2), one on `phone` (threshold ≥3). Both call `searchCustomers(query)` and update the respective `filtered*` / `show*Suggestions`. Both gated by `!isCustomerSelected`. |
| Outside-click effect (L35-43) | Extend the existing handler to also close `showNameSuggestions` and `showPhoneSuggestions` when click lands outside `nameInputRef` / `phoneInputRef`. Skip when click lands on `data-suggestion-modal="true"`. |
| New helper (after L52) | `selectModalCustomer(c)` — sets `name`, `phone`, `memberId` (sync), `isCustomerSelected=true`, hides both new dropdowns, and stores `setSelectedCRMCustomer(c)` for `handleSave` consumption. |
| `handleNameChange` / `handlePhoneChange` (new) | Mirror CartPanel: clearing either field resets `isCustomerSelected=false` and clears `selectedCRMCustomer`. |
| Name input JSX (L220-228) | Add `ref={nameInputRef}`, `onChange={handleNameChange}`, `onFocus`/dropdown render below — anchored absolutely inside a `relative` parent. Suggestion buttons use `onMouseDown={(e) => { e.preventDefault(); selectModalCustomer(c); }}`. |
| Phone input JSX (L234-244) | Same pattern as Name. |
| `handleSave` (L58-167) | One new branch ahead of the existing `initialData` capture: if `selectedCRMCustomer` is non-null, use it as the loyalty source (highest priority — represents the user's intent inside the modal). Falls back to current `initialData` (open-time) and `existing` (phone-lookup) paths unchanged. |
| `selectMember` (L46-52) | Tiny addition: also call `setSelectedCRMCustomer(member)` so Member-ID picks feed the same loyalty capture path. Behavior of the Member ID dropdown otherwise unchanged. |

### 8.3 Typeahead behavior contract

- Name input: trigger `searchCustomers(name)` when `name.length ≥ 2` and `!isCustomerSelected`. Drop suggestions below the input.
- Phone input: trigger `searchCustomers(phone)` when `phone.length ≥ 3` and `!isCustomerSelected`.
- Both share the same `searchCustomers` service call as CartPanel — no new API, no new transform.
- Both close on outside click, both shielded from blur via `onMouseDown + e.preventDefault()` on suggestion buttons.

### 8.4 Selected customer payload mapping (what fills when a suggestion is picked)

| Field on the modal | Source from search result | Notes |
|--------------------|---------------------------|-------|
| `name` | `c.name` | direct |
| `phone` | `c.phone` | direct |
| `memberId` | `c.id` | keeps Member ID display in sync so the existing branch in `handleSave` still works |
| `memberSearch` | `c.id` | matches existing `selectMember` behavior |
| `birthday` | NOT auto-filled | search result transform does not return it; owner can edit |
| `anniversary` | NOT auto-filled | same |
| `selectedCRMCustomer` (new state) | full `c` object | used by `handleSave` to derive `crmLoyaltyFields` |

### 8.5 Loyalty field preservation contract

When `handleSave` runs after an in-modal typeahead pick:

```
crmLoyaltyFields = {
  tier:          selectedCRMCustomer.tier,
  totalPoints:   selectedCRMCustomer.totalPoints,
  pointsValue:   selectedCRMCustomer.pointsValue,
  walletBalance: selectedCRMCustomer.walletBalance,
  loyalty:       selectedCRMCustomer.loyalty,   // synthetic blob from searchResult (Phase B Pipeline Fix)
}
```

The synthetic `loyalty` blob includes `loyalty_enabled: true` by default (same as `customerLookup`). `CollectPaymentPanel` will read it and render `tier` badge + points + `₹X available` immediately on Collect Bill, without any follow-up CRM round-trip.

### 8.6 Member ID handling (per owner correction)

**Leave it as-is.** No UI change. No removal. The only code touch is one extra line inside `selectMember` to also set `selectedCRMCustomer(member)` so Member-ID picks share the same loyalty capture path. This is invisible to the user and additive — does not alter the Member ID field's appearance or interaction.

If owner later requests hide/rename/remove, that lives in a separate P3 cleanup CR.

---

## 9. Non-Scope (Hard Boundary)

- No `orderTransform.js` changes — force-zero guards remain.
- No `CollectPaymentPanel.jsx` changes.
- No `customerTransform.js` changes (search result already enriched by Phase B Pipeline Fix).
- No `CartPanel.jsx` changes.
- No new feature flag, no flag flips. `loyaltyPreviewLive=true`, `loyaltyRatioLive=false` unchanged.
- No loyalty redemption, no reverse.
- No coupon, no wallet, no payment, no total/tax/payable/print/socket/settlement.
- No backend changes.
- No dead-code cleanup (Member ID field + `mockCustomers.js` mock — both parked as before).
- No `/app/memory/final/` updates.
- No baseline doc updates.

---

## 10. QA Plan

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Open Add Customer modal, type ≥2 letters in **Name** field | Dropdown appears below Name input with matching `name + phone` rows |
| 2 | Open Add Customer modal, type ≥3 digits in **Phone** field | Dropdown appears below Phone input with matching `name + phone` rows |
| 3 | Click a suggestion in Name dropdown | Name + Phone fields auto-fill; Member ID shown; `isCustomerSelected=true`; dropdowns close |
| 4 | Click a suggestion in Phone dropdown | Same as #3 |
| 5 | After picking a suggestion, click outside the modal area | Dropdowns close cleanly (no stale dropdown) |
| 6 | After picking, click Save | Modal closes; on Collect Bill, loyalty section shows tier + points + `₹X available` immediately (no extra lookup wait) |
| 7 | Type a NEW name + NEW phone with no CRM match → Save | `createCustomer` runs as before; loyalty section correctly shows "No points" / "Loyalty program unavailable" for the new record |
| 8 | Type a name with no CRM match → no suggestions appear | Dropdown does not render; manual entry proceeds |
| 9 | Type and clear Name field | `isCustomerSelected` resets; suggestions can re-trigger from blank typing |
| 10 | Member ID search still works (regression) | Typing in Member ID still shows its dropdown and selecting a row still auto-fills Name+Phone — unchanged |
| 11 | CartPanel typeahead unaffected | CartPanel name/phone fields still typeahead-search exactly as before — no shared state, no DOM clash |
| 12 | Payload safety — Place Order / Pay after save with selected customer | `used_loyalty_point: 0`, `loyalty_dicount_amount: 0` unchanged |
| 13 | Loyalty checkbox state | Disabled — `loyaltyRatioLive=false` unchanged |
| 14 | Coupon section | Still disabled — `couponLive=false` unchanged |
| 15 | Wallet section | Still disabled — `walletDebitLive=false` unchanged |
| 16 | Customer with `loyalty_enabled=false` (rare; lookup-defaults to true) | Modal still saves; section shows "Loyalty program unavailable" as before |
| 17 | Build | `CI=false yarn build` PASS, 0 errors, same pre-existing `OrderEntry.jsx:1297` warning |
| 18 | Room-service inline mirror | Inherits the enriched customer state from OrderEntry — no separate fix needed |

---

## 11. Owner Approval Questions

**Q1. Member ID field handling:**
- **A. Leave as-is for now** ← **recommended** (matches owner correction)
- B. Hide in this modal
- C. Rename later
- D. Remove in separate CR

**Q2. CustomerModal Name/Phone suggestions should:**
- **A. Match CartPanel behavior exactly** (≥2 chars for name, ≥3 digits for phone, same dropdown style, same `onMouseDown + preventDefault` pattern, same outside-click handling) ← **recommended**
- B. Use a smaller dropdown
- C. Search only by phone
- D. Search only by name

(Owner can answer "all recommended" to accept the defaults.)

---

## 12. Implementation Readiness Verdict

**READY.** Pending owner answers to Q1–Q2. No external blockers.

- Single-file change: `src/components/order-entry/CustomerModal.jsx`
- Reuses existing `searchCustomers` service and enriched `searchResult` transform — no new API, no new transform, no new flag.
- Pattern is a near-1:1 mirror of CartPanel's typeahead, which is already battle-tested.
- Net additional bundle weight: ~50-70 lines of state + JSX + comments.
- Risk profile: Low — additive UI, no math/payload/total/tax/print changes.
- Compatible with the Phase B Pipeline Fix already in main — uses the same `searchResult` synthetic loyalty blob.

Estimated implementation effort: ~30 minutes including build + lint.

---

## 13. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed by this plan | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No loyalty redemption / reverse API invoked | Confirmed |
| 5 | `/app/memory/final/` untouched | Confirmed |
| 6 | Baseline docs untouched | Confirmed |
| 7 | Sprint status not advanced — BUG-108 Phase B re-smoke still pending owner sign-off on the 7-row template | Confirmed |
| 8 | Member ID flow left intact per owner correction | Confirmed |

---

**End of BUG-108 CustomerModal Customer-Search Parity Plan.**
