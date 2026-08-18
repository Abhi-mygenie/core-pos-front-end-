# POS 3.0 BUG-108 — Loyalty Customer Pipeline Fix Plan

**Date:** 2026-05-23
**Status:** `bug_108_loyalty_customer_pipeline_fix_planned_waiting_owner_approval`
**Pairs with:** Owner Smoke Defect Investigation (2026-05-23) — refines and corrects it.

---

## 1. Status

```
bug_108_loyalty_customer_pipeline_fix_planned_waiting_owner_approval
```

Sprint gate still: `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL` (NEEDS FIX).

---

## 2. Defect Summary

Owner smoke at restaurant `jehsnest`. Customer **Sapna** · phone `9004020412` · CRM shows **86 points (Bronze)**.

Observed in Collect Bill: `Loyalty (0 pts)` · `No points` · *"Loyalty program unavailable"* (opacity 0.7, helper = `loyaltyDisabledHelper`).

Owner screenshots show the customer was entered via the CartPanel name/phone fields in a fresh Walk-In order (one item, ₹160) — NOT an existing-order re-engage as initially hypothesized. Refined root-cause analysis below.

---

## 3. Docs Read

1. `POS3_0_BUG_108_LOYALTY_PHASE_B_IMPLEMENTATION_REPORT_2026_05_23.md`
2. `POS3_0_BUG_108_LOYALTY_PHASE_B_QA_HANDOFF_2026_05_23.md`
3. `POS3_0_BUG_108_LOYALTY_PHASE_B_AGENT_SMOKE_REPORT_2026_05_23.md`
4. `POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_SMOKE_DEFECT_INVESTIGATION_2026_05_23.md`
5. `POS3_0_BUG_108_LOYALTY_CONTRACT_VERIFICATION_2026_05_23.md`
6. `POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md`

Sprint folder grep for `BUG_108`, `LOYALTY`, `OWNER_SMOKE`, `DEFECT`, `PIPELINE`, `CUSTOMER`, `CartPanel`, `OrderEntry`, `CollectPaymentPanel` — no additional in-scope docs found beyond the above.

---

## 4. Code Areas Inspected (read-only)

| File | What we looked at |
|------|-------------------|
| `src/api/transforms/customerTransform.js` | `fromAPI.searchResult` (L14-22), `fromAPI.customerLookup` (L39-65, synthetic loyalty blob), `fromAPI.customerDetail` (L71-91) |
| `src/api/services/customerService.js` | `searchCustomers`, `lookupCustomer`, `getCustomerDetail`, `createCustomer`, `updateCustomer` |
| `src/components/order-entry/CartPanel.jsx` | `searchCustomers` typeahead effects (L718, 736), `selectCustomer` (L765-773), `handleFieldBlur` (L802-809), `handleNameChange` / `handlePhoneChange` (L776-799), suggestion buttons (L880, 927 — `onMouseDown` + `e.preventDefault()` to suppress blur) |
| `src/components/order-entry/OrderEntry.jsx` | `setCustomer` declaration (L156), order-restore savedCart branch (L303-311), order-restore orderData branch (L344-350), `onCustomerChange={setCustomer}` (L2116), CustomerModal mount (L2304-2311) |
| `src/components/order-entry/CollectPaymentPanel.jsx` | `customer = passedCustomer` (L68), loyalty section JSX standard (L1030-1080) + mirror (L1544-1582), TAB/Credit typeahead (L383-471, isolated subsystem) |
| `src/components/order-entry/CustomerModal.jsx` | `selectMember` (L46-52), `handleSave` (L58-130) — uses `lookupCustomer` internally but **discards** the returned loyalty blob |
| `src/data/mockCustomers.js` | Local mock `searchCustomers` — not imported by any order-entry component (legacy/dead in this flow) |
| `src/components/modals/RoomCheckInModal.jsx` | Uses `searchCustomers` for room check-in — separate flow, **does not feed** the order-entry `customer` state |
| `src/api/transforms/orderTransform.js` | Force-zero guards intact (L908, 1026, 1153, 1356, 1768) — unchanged; this fix does not touch `orderTransform.js` |

---

## 5. Customer Path Inventory

| # | Path ID | File / Function | Trigger / User Journey | Live? | Fields passed to `setCustomer` | Loyalty preserved? | Risk |
|---|---------|----------------|------------------------|-------|--------------------------------|--------------------|------|
| P1 | CartPanel typeahead select | `CartPanel.jsx:765-773` (`selectCustomer`) | Owner types ≥3 digits / ≥2 chars, clicks a suggestion | LIVE | `{id, name, phone, tier, totalPoints, pointsValue, walletBalance, loyalty}` | **Partial** — `pointsValue` and `loyalty` are `undefined` because `fromAPI.searchResult` (L14-22) does not produce them | Medium — incomplete enrichment at source |
| P2 | Order restore — `savedCart` | `OrderEntry.jsx:303-311` | Re-open a table that has an in-progress (saved) cart with a customer attached | LIVE | `{name, phone}` only | **NO** — every loyalty field dropped | High — silently zeros loyalty for every saved-cart re-open |
| P3 | Order restore — `orderData` | `OrderEntry.jsx:344-350` | Re-open a table with an active placed order whose `orderData.customer` / `orderData.phone` exists | LIVE | `{name, phone}` only | **NO** — every loyalty field dropped | High — same as P2 for placed orders |
| P4 | CartPanel manual blur | `CartPanel.jsx:802-809` (`handleFieldBlur`) | Any blur on name/phone input when at least one is non-empty. **Also fires after P1** when the user later clicks elsewhere (suggestion click itself is shielded by `onMouseDown + preventDefault`, but subsequent focus loss is not) | LIVE | `{id: customer?.id \|\| null, name, phone}` only | **NO — and CLOBBERS P1** on the next blur | **HIGHEST** — this is the dominant cause of Sapna's screenshot |
| P5 | CartPanel clear-fields | `CartPanel.jsx:776-799` (`handleNameChange`/`handlePhoneChange`) | User wipes name or phone after selecting | LIVE | `null` (intentional clear) | N/A | Low — correct behavior |
| P6 | CustomerModal save | `CustomerModal.jsx:120-129` → `OrderEntry.jsx:2307` (`onSave={setCustomer}`) | "Add / edit customer" modal save flow (uses `lookupCustomer` internally but **discards** loyalty) | LIVE | `{id, name, phone, birthday, dob, anniversary}` | **NO** — `existing.loyalty` from `lookupCustomer` is not propagated | Medium |
| P7 | TAB/Credit typeahead | `CollectPaymentPanel.jsx:446-452` (`selectTabCustomer`) | TAB/Credit payment block customer pick | LIVE | Sets internal `tabName/tabPhone` only — does **not** touch the main `customer` state | N/A — loyalty section doesn't read tab state | Out of scope |
| P8 | Room-service inline mirror | `CollectPaymentPanel.jsx:68` (`customer = passedCustomer`) | Room-service order shows the same Collect Payment block inline | LIVE | Reads the same `customer` prop from OrderEntry | Inherits whatever the parent has — no separate enrichment site | Mitigated by fixing P1-P6 |
| P9 | Mock `searchCustomers` from `data/mockCustomers.js` | `data/mockCustomers.js:47` | None — not imported by any order-entry component | **DEAD** (only re-exported via `data/index.js`, no consumers found in `src/`) | n/a | n/a | None — safe to leave, document as P3 cleanup |
| P10 | RoomCheckInModal `searchCustomers` | `RoomCheckInModal.jsx:359, 375` | Room check-in flow only | LIVE but **OUT OF SCOPE** — does not feed POS `customer` state used by loyalty | n/a | n/a | None |

**Net live paths feeding the loyalty section's `customer`:** P1, P2, P3, P4, P6 (and P8 inherits from these).

---

## 6. Root Cause Verification

The earlier investigation correctly identified P1, P2, P3 — but **missed three nuances** that the new owner screenshots clarify:

### 6.1 P4 clobbers P1 (the actual dominant bug)
`selectCustomer` (P1) shields itself from blur via `onMouseDown + e.preventDefault()` on the suggestion button. However, **once the suggestion is picked, the input still holds focus.** The very next user action (clicking the menu, an item, the Place Order button — any focus shift) fires `onBlur` → `handleFieldBlur` → overwrites the rich customer object with the thin `{ id: customer?.id || null, name, phone }`.

Result: even when P1 *does* run correctly, the loyalty enrichment is alive only until the next blur — which in normal POS flow happens within a fraction of a second. This is the dominant reason owners see `Loyalty (0 pts)` immediately after picking a suggestion.

For Sapna's screenshots specifically, the path is either **P4 alone** (owner typed manually, never clicked the suggestion) or **P1 → P4 clobber** (owner clicked the suggestion, then blurred). Both end at the same broken state — `Loyalty (0 pts) / Loyalty program unavailable`.

### 6.2 P6 (CustomerModal) discards `lookupCustomer` loyalty
`CustomerModal.handleSave` (L78) calls `lookupCustomer(phone)` to detect duplicates and grabs `existing.id`, but does **not** copy `existing.tier / existing.totalPoints / existing.pointsValue / existing.loyalty` into the `customerData` it ships via `onSave`. The synthetic blob built in `customerLookup` is constructed and immediately discarded.

### 6.3 `customerLookup` IS used — but only inside `CustomerModal`, never from CartPanel
Earlier investigation said the order-entry flow "may never call `lookupCustomer`". Refinement: CartPanel never calls it; CustomerModal does (P6) but throws the result away. So in practice the synthetic blob fix is unreachable from the order-entry hot path.

### 6.4 Conclusion
The defect is **not** a one-path bug; it is the combination of:
- P4 clobbering the only enriched path (P1) on every blur
- P1's own `searchResult` source missing `pointsValue` + synthetic `loyalty` blob
- P2 / P3 / P6 each independently stripping loyalty fields at the boundary

Any single-path fix leaves the customer in a broken state for at least one common flow.

---

## 7. Dead Code / Branch Assessment

| Item | Location | Status | Recommendation |
|------|----------|--------|----------------|
| `searchCustomers` (mock) | `data/mockCustomers.js:47` | **Dead in order-entry** — no consumer found in `src/` (only re-exported via `data/index.js`) | Document as **P3 cleanup**, do NOT remove during this fix to keep diff minimal |
| `mockCustomers` array + `data/index.js` re-export | `data/mockCustomers.js`, `data/index.js:6` | Possibly used elsewhere — needs follow-up grep across full repo before removal | **P3 cleanup, separate CR** |
| `customer?.loyaltyPoints` (singular) read | `CollectPaymentPanel.jsx:507` | Legacy field name; guarded by `loyaltyRatioLive=false` (false in Phase B), so it is reachable only when Phase C ships | Already inconsistent with the new `customer.totalPoints` / `customer.loyalty.total_points` shape. **P3 cleanup, fold into Phase C** |
| `useEffect` re-fetch suggestions when `isCustomerSelected=true` | `CartPanel.jsx:718, 736` | Already correctly gated; not dead | Leave |

Verdict: dead-code cleanup should NOT happen in this CR. Park as P3.

---

## 8. Fix Options Compared

| Option | Scope | Files touched | Risk | Fixes | Does NOT fix |
|--------|-------|--------------|------|-------|--------------|
| **A — Transform-only** (enrich `fromAPI.searchResult`) | `customerTransform.js` only | 1 | Very low — additive fields | P1 source (typeahead now carries `pointsValue` + synthetic `loyalty` blob) | P2, P3 (order restore), P4 (clobber on blur), P6 (CustomerModal) — sees nothing |
| **B — CartPanel merge** (make `handleFieldBlur` MERGE not OVERRIDE; enrich `selectCustomer` too) | `CartPanel.jsx` only | 1 | Low — spread existing `customer` prop, then overlay `{id, name, phone}` | P1 (preserved through subsequent blur), P4 (no longer clobbers) | P2, P3, P6 |
| **C — OrderEntry restore enrichment** (after `setCustomer({name, phone})`, fire `lookupCustomer(phone)` and merge) | `OrderEntry.jsx` only | 1 | Low — fire-and-forget async, idempotent | P2, P3 | P1, P4, P6 |
| **D — Shared helper** (`enrichLoyaltyShape(rawCustomer)` used at every `setCustomer` callsite + inside `searchResult`) | `customerTransform.js`, `CartPanel.jsx`, `OrderEntry.jsx`, `CustomerModal.jsx` | 4 | Medium — touches more sites, but consolidates the contract | All paths | None |
| **E — CollectPaymentPanel fallback fetch** | `CollectPaymentPanel.jsx` | 1 | Medium-high — UI component starts doing data fetching; architecturally weaker | Display-only patch | Breaks single-source-of-truth; doesn't fix payload-side or future Phase C |

---

## 9. Recommended Fix Plan

**Recommendation: Hybrid A + B + C (+ light D), without dead-code cleanup.**

This is the smallest set of edits that closes all five live paths (P1, P2, P3, P4, P6) and does not regress payload safety, totals, tax, coupon, wallet, or print.

### 9.1 Files to touch (4 files, surgical edits)

| # | File | Function | Change |
|---|------|----------|--------|
| 1 | `src/api/transforms/customerTransform.js` | `fromAPI.searchResult` (L14-22) | Add `pointsValue` and synthetic `loyalty` blob mirroring the shape already produced by `fromAPI.customerLookup` (L57-64). Pull the synthetic-blob construction into a tiny local helper so `customerLookup` and `searchResult` share one source of truth. |
| 2 | `src/components/order-entry/CartPanel.jsx` | `handleFieldBlur` (L802-809) | Replace the override with a **merge**: spread the existing `customer` prop, then overlay `{ id: customer?.id ?? null, name: customerName.trim(), phone: customerPhone.trim() }`. This stops blur from clobbering P1's enrichment. |
| 3 | `src/components/order-entry/OrderEntry.jsx` | Order-restore branches (L303-311 and L344-350) | After `setCustomer({ name, phone })`, fire a fire-and-forget `lookupCustomer(phone)` and, on success, re-`setCustomer` with the existing fields **merged** with the looked-up `tier`, `totalPoints`, `pointsValue`, `loyalty`. Idempotent — safe if it fails or times out (CRM timeout already returns null silently). |
| 4 | `src/components/order-entry/CustomerModal.jsx` | `handleSave` (L93-117, L120-129) | When `existing = await lookupCustomer(phone)` returns a customer, copy `tier`, `totalPoints`, `pointsValue`, `walletBalance`, `loyalty` from `existing` into the `customerData` passed to `onSave`. New-customer path (no existing) still passes `{id, name, phone, birthday, dob, anniversary}` only — loyalty section will simply show "No points" for a brand-new customer, which is correct. |

### 9.2 Loyalty fields contract (the shape every `setCustomer` callsite must preserve)

```
{
  id, name, phone,                     // identity
  tier,                                // 'Bronze' | 'Silver' | 'Gold'
  totalPoints,                         // flat
  pointsValue,                         // flat ₹ equivalent
  walletBalance,                       // flat
  loyalty: {                           // synthetic blob, same shape as customerLookup
    tier, tier_label,
    total_points, points_value, ratio_per_point,
    loyalty_enabled: true              // defaults true; restaurant settings gate handles visibility
  }
}
```

### 9.3 Shared helper (small, optional)

Optionally extract a 5-line `buildSyntheticLoyalty({ tier, totalPoints, pointsValue })` inside `customerTransform.js`. Used by both `searchResult` and `customerLookup`. Light D — confined to the transform file, does not spread across components. **Recommended.**

### 9.4 Why this is the safest plan

- No changes to `orderTransform.js` — payload force-zero guards remain intact (verified §10 of agent smoke report).
- No changes to `CollectPaymentPanel.jsx` — UI contract unchanged.
- No new async calls in the steady-state hot path (the OrderEntry restore enrichment fires only on table re-engage, once per restore, fire-and-forget, idempotent).
- No new feature flag — `loyaltyPreviewLive` and `loyaltyRatioLive` remain untouched.
- All edits are **additive**; no removal of existing logic except replacing the override in `handleFieldBlur` with a merge.
- Net additional bundle weight: ~30-60 lines across 4 files.

---

## 10. Non-Scope (Hard Boundary)

- No loyalty redemption (`loyaltyRatioLive` stays `false`).
- No loyalty reversal.
- No coupon changes (`couponLive` stays `false`).
- No wallet changes (`walletDebitLive` stays `false`).
- No payment / total / tax / service charge / delivery charge / settlement / print code touched.
- No backend changes.
- No `orderTransform.js` changes — force-zero guards remain intact.
- No dead-code removal (`mockCustomers`, legacy `loyaltyPoints` field access) — parked as P3.
- No `/app/memory/final/` updates.
- No baseline doc updates.

---

## 11. QA Plan (Owner Smoke v2, post-fix)

| # | Scenario | Expected after fix |
|---|----------|---------------------|
| 1 | Open Sapna's active order/table re-engage (P2/P3) | Loyalty section shows `Bronze` badge + `86 pts` + `₹{X} available` (helper = `loyaltyPreviewHelper`) |
| 2 | Fresh order, type 3+ digits, click Sapna in typeahead suggestion (P1) | Same as #1 |
| 3 | After #2, click the menu or Place Order (P4 fires blur) | Loyalty section **remains** populated — no regression to `0 pts` |
| 4 | Fresh order, type Sapna manually and Tab/click away **without** picking suggestion (P4) | Either populated (if lookup succeeds via OrderEntry enrichment) or gracefully `Loyalty program unavailable` if the customer is unknown |
| 5 | Add new customer via CustomerModal whose phone matches existing CRM record (P6) | Loyalty section populated from `existing` payload |
| 6 | Customer with no CRM record / anonymous | `Loyalty program unavailable` (no crash) |
| 7 | Customer with `loyalty_enabled=false` | `Loyalty program unavailable` |
| 8 | Customer with 0 points | `No points` |
| 9 | Standard Collect Bill grand total | Unchanged (preview is display-only) |
| 10 | Tax / GST / VAT | Unchanged |
| 11 | Coupon section | Still disabled ("Coming soon") |
| 12 | Wallet section | Still disabled / read-only |
| 13 | Manual discount works, loyalty `₹ available` recalculates to capped value | Same as Phase B contract |
| 14 | Room-service inline mirror | Mirror picks up the same enriched `customer` — same visual as standard view |
| 15 | Place order / settle bill payload (DevTools) | `used_loyalty_point: 0`, `loyalty_dicount_amount: 0` unchanged |
| 16 | No new loyalty redemption / reverse API calls | None observed in Network tab |

---

## 12. Owner Approval Questions

**Q1. Dead/legacy customer branches (`mockCustomers.searchCustomers`, legacy `customer.loyaltyPoints` field read in `CollectPaymentPanel.jsx:507`):**
- A. Do not remove now; document as P3 cleanup ← **recommended**
- B. Remove dead branches during this fix
- C. Only remove if proven unreachable by grep/runtime
- D. Decide after implementation

**Q2. Fix strategy:**
- A. Minimal per-path fix (apply A + B + C exactly as §9, no shared helper)
- B. Shared helper normalization (A + B + C + light D — extract `buildSyntheticLoyalty` in transform file only) ← **recommended**
- C. Transform-only fix (Option A only — leaves P2, P3, P4, P6 broken)
- D. CollectPaymentPanel fallback (Option E only — architecturally weaker)

**Q3. Async enrichment in OrderEntry order-restore (Path 2/3):**
- A. Fire-and-forget `lookupCustomer(phone)`, re-`setCustomer` on success, swallow errors silently ← **recommended** (matches existing BUG-078 CRM-timeout pattern)
- B. Block restore until lookup completes
- C. Do not enrich on restore; require owner to re-pick customer

**Q4. CustomerModal `existing` loyalty propagation:**
- A. Copy `tier`, `totalPoints`, `pointsValue`, `walletBalance`, `loyalty` from `existing` into `onSave` payload ← **recommended**
- B. Leave CustomerModal untouched (loyalty will populate via subsequent CartPanel typeahead)

(Owner can answer "all recommended" to accept the defaults.)

---

## 13. Implementation Readiness Verdict

**READY.** Pending owner answers to Q1-Q4. No external blockers:

- All five live paths (P1, P2, P3, P4, P6) identified and mapped.
- Fix is fully scoped to four frontend files (`customerTransform.js`, `CartPanel.jsx`, `OrderEntry.jsx`, `CustomerModal.jsx`).
- No backend, no `orderTransform.js`, no new APIs, no new feature flags.
- Risk profile: low (all changes additive or merge-not-override; existing BUG-078 CRM-timeout pattern is reused for async enrichment).
- Dead code parked as P3 — keeps this diff minimal.

On owner approval, implementation agent can proceed; expected build PASS with the same 1 pre-existing unrelated `OrderEntry.jsx` ESLint warning.

---

## 14. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No frontend code changed by this plan | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No loyalty redemption / reverse API invoked | Confirmed |
| 5 | No payment / payload mutation | Confirmed |
| 6 | `/app/memory/final/` untouched | Confirmed |
| 7 | Baseline docs untouched | Confirmed |
| 8 | Sprint status not advanced — still `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL` until fix lands and re-smoke passes | Confirmed |

---

**End of BUG-108 Loyalty Customer Pipeline Fix Plan.**
