# POS3.0 CR Wave 1 — Owner Approval Plan — 2026-05-18

## 1. Purpose

This document is created **before implementation** and requires **owner approval** before any code changes are made. It covers the 3 bugs in CR Wave 1 — Ready CRs.

No code was changed. No QA was run. No `/app/memory/final/` was updated.

---

## 2. Repo / Commit

| Field | Value |
|---|---|
| Repo URL | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `18-may-pos3.0` |
| Commit Hash | `3cff824` |
| Working Tree Status | Clean (fresh clone, Mode A) |

---

## 3. Inputs Read

### Final Baseline Docs
1. `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
2. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
3. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
4. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
5. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
6. `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
7. `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### POS3.0 Planning Docs
8. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md`
9. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_PLANNING_CLEARANCE_ADDENDUM_2026_05_18.md`
10. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md`
11. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md`
12. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md`

### Bucket A Reference
13. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUCKET_A_IMPLEMENTATION_REPORT_2026_05_18.md`
14. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUCKET_A_QA_HANDOFF_2026_05_18.md`

### Code Files Inspected
15. `/app/frontend/src/api/crmAxios.js` (82 lines) — BUG-098
16. `/app/frontend/src/api/transforms/authTransform.js` (39 lines) — BUG-098
17. `/app/frontend/src/api/services/authService.js` (79 lines) — BUG-098
18. `/app/frontend/src/contexts/AuthContext.jsx` (117 lines) — BUG-098
19. `/app/frontend/src/pages/LoginPage.jsx` (275 lines) — BUG-098
20. `/app/frontend/src/pages/LoadingPage.jsx` (845 lines) — BUG-098
21. `/app/frontend/src/api/services/customerService.js` (188 lines) — BUG-106
22. `/app/frontend/src/api/transforms/customerTransform.js` (205 lines) — BUG-106
23. `/app/frontend/src/components/order-entry/OrderEntry.jsx` (2244 lines) — BUG-099, BUG-106
24. `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (2514 lines) — BUG-099
25. `/app/frontend/src/components/order-entry/CartPanel.jsx` (904 lines) — BUG-099
26. `/app/frontend/src/components/modals/RoomCheckInModal.jsx` — BUG-106
27. `/app/frontend/src/api/transforms/orderTransform.js` — BUG-099
28. `/app/frontend/src/contexts/RestaurantContext.jsx` — BUG-099
29. `/app/frontend/src/api/transforms/profileTransform.js` — BUG-099

---

## 4. Bugs Proposed For Implementation

| Bug | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| BUG-098 | CRM API keys hardcoded in env variables with per-restaurant JSON map. Owner confirmed `crm_token` comes from login response. | Read `crm_token` from login API response; store in crmAxios module; delete env-based `REACT_APP_CRM_API_KEYS` usage entirely. | `authTransform.js`, `crmAxios.js`, `LoadingPage.jsx` | Low | pending_owner_approval |
| BUG-106 | CRM customer notes not displayed in POS. Owner confirmed notes are in existing customer detail/lookup response. | Read note fields defensively from existing customer data; display order-level notes in order entry customer section; item-level notes in item context. Read-only. | `customerTransform.js`, `OrderEntry.jsx`, `RoomCheckInModal.jsx` | Low-Medium | pending_owner_approval |
| BUG-099 | QSR billing too slow (3 steps). Owner: QSR mode = profile toggle; billing at order screen; use Collect Bill API; no loyalty/discounts in QSR. | Add QSR quick billing flow: after Place Order, show inline payment method picker on cart screen; call collectBillExisting API; order settled in 2 steps instead of 3. Compact CollectPaymentPanel layout for non-QSR flows. | `OrderEntry.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `RestaurantContext.jsx`/`profileTransform.js` | Medium-High | pending_owner_approval |

---

## 5. Per-Bug Approval Details

---

### BUG-098 — Use Login Response `crm_token` Instead of Env Keys

#### What is wrong in plain English
CRM API keys are currently stored in a frontend environment variable (`REACT_APP_CRM_API_KEYS`) as a JSON map of `{ restaurantId: apiKey }`. This is hardcoded, fragile, and doesn't scale. The owner confirmed that the login API response already includes a `crm_token` field that should be used instead.

#### What I will change

1. **`authTransform.js`** — Add `crmToken: api.crm_token || null` to the `loginResponse` transform so the CRM token is extracted from the login API response and passed through to the auth flow.

2. **`crmAxios.js`** — Refactor to accept a token directly:
   - Remove `CRM_API_KEYS` parsing from env variable (`REACT_APP_CRM_API_KEYS`)
   - Remove the restaurant-key map lookup in `getCrmApiKey()`
   - Add a new `setCrmToken(token)` export that stores the token at module level
   - Modify the request interceptor to use the stored token directly
   - Keep `setCrmRestaurantId()` for restaurant context but remove key lookup logic

3. **`LoadingPage.jsx`** — After login, the CRM token is available from the auth response. Currently `setCrmRestaurantId(data.profile.restaurant.id)` is called in LoadingPage. I will change this to also pass the CRM token. However, since the token comes from the **login** response (not the profile), I need to thread it. Two options:
   - **Option A (Recommended):** Store `crmToken` in AuthContext state during `login()`. LoadingPage reads it from `useAuth()` and passes to `setCrmToken()`.
   - **Option B:** Store `crmToken` in localStorage during login. LoadingPage reads from localStorage.

   I recommend **Option A** — keep it in memory, no localStorage for CRM token.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `api/transforms/authTransform.js` | Add `crmToken` to `loginResponse` | Extract crm_token from login response |
| `api/crmAxios.js` | Remove env-based keys; add `setCrmToken()` | Core CRM configuration file |
| `contexts/AuthContext.jsx` | Store `crmToken` from login response | Thread crm_token to downstream |
| `pages/LoadingPage.jsx` | Call `setCrmToken()` with auth-provided token | Initialize CRM after login |

#### Code area / function / component
- `fromAPI.loginResponse()` in `authTransform.js`
- `setCrmRestaurantId()`, `getCrmApiKey()`, request interceptor in `crmAxios.js`
- `login()` in `AuthContext.jsx`
- Profile loader in `LoadingPage.jsx`

#### What I will NOT touch
- `REACT_APP_CRM_BASE_URL` — base URL stays in env (separate concern)
- CRM service functions (`customerService.js`) — they already use `crmApi` instance
- CRM request/response data structures
- CRM timeout handling (BUG-078 pattern)
- Any financial/payment/order code

#### Business rule protected
- MODULE_DECISIONS_FINAL.md §6: CRM module — CRM required by default
- ARCHITECTURE_DECISIONS_FINAL.md Rule EP-01: env contract; note: we are removing one env variable per owner instruction

#### Risk
**Low** — Straightforward refactor. `crmAxios.js` is 82 lines and self-contained. All CRM API calls flow through the single `crmApi` interceptor, so changing the key source propagates automatically.

**Rollback:** If `crm_token` is missing from the login response, CRM calls will fail (no key attached). The console warning `[CRM] No API key` will fire. This is the owner's intended behavior (clean removal, no fallback).

#### QA check after implementation
1. CRM customer search works in Order Entry
2. CRM customer lookup works
3. CRM address lookup works
4. Room check-in CRM flow works
5. Console shows `[CRM Config] Token set from login response` (new log)
6. No `REACT_APP_CRM_API_KEYS` references remain in code

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for code-diff preview
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-106 — CRM Notes Display (Read-Only, from existing customer data)

#### What is wrong in plain English
When a customer is selected from CRM during order entry or room check-in, the POS does not display any notes associated with that customer. The owner confirmed that notes are already included in the existing customer detail/lookup response — no new API endpoint is needed. Notes should be read-only and displayed in their respective modals (order notes in order context, item notes in item context).

#### What I will change

1. **`customerTransform.js`** — Add defensive note field extraction to `customerLookup` and `customerDetail` transforms:
   - `notes: api.notes || []` (general/order-level notes)
   - `itemNotes: api.item_notes || api.item_preferences || []` (item-level notes like "no onion")
   - Field names validated at runtime (defensive — `api.notes` may be `null`, `undefined`, or a different key)

2. **`OrderEntry.jsx`** — After customer selection, if `customer.notes` exists and is non-empty, display a small notes indicator/section in the customer info area. Clicking shows full notes. Keep it lightweight — a small badge or collapsible section.

3. **`RoomCheckInModal.jsx`** — After CRM customer selection (`selectCrmCustomer`), if the selected customer has notes, display them in the room check-in form area. Read-only display.

4. **No new component needed** — the notes display can be a simple conditional render inline. If the owner wants a dedicated panel later, it can be extracted.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `api/transforms/customerTransform.js` | Add `notes`, `itemNotes` to `customerLookup` and `customerDetail` | Extract note fields from CRM response |
| `components/order-entry/OrderEntry.jsx` | Add notes display after customer selection (lightweight inline section) | Primary customer interaction surface |
| `components/modals/RoomCheckInModal.jsx` | Add notes display after CRM customer selection | Secondary customer interaction surface |

#### Code area / function / component
- `fromAPI.customerLookup()`, `fromAPI.customerDetail()` in `customerTransform.js`
- Customer info section in `OrderEntry.jsx` (near L292-340 where customer is set)
- `selectCrmCustomer()` area in `RoomCheckInModal.jsx` (L431-439)

#### What I will NOT touch
- Customer search/selection flow (no behavior change)
- CRM timeout handling
- Customer create/update flows
- Any financial/payment code
- Cart, payment, or print flows

#### Business rule protected
- MODULE_DECISIONS_FINAL.md §6: CRM module — CRM required by default; this adds a display feature
- Owner instruction: read-only from POS (no write-back)

#### Risk
**Low-Medium** — Adds a display feature. Risk is in field name uncertainty: the exact key names for notes in the CRM response are unknown until runtime. Defensive coding (check for multiple possible field names, default to empty array) mitigates this.

The main risk is UI real estate in OrderEntry (2244 lines) — notes display must not crowd existing elements. A small collapsible section or badge approach keeps it minimal.

#### QA check after implementation
1. Customer with notes selected → notes visible in order entry
2. Customer with notes selected in room check-in → notes visible
3. Customer without notes → no notes section shown (clean empty state)
4. CRM API failure → customer selection still works (notes just missing)
5. Notes display is read-only (no edit controls)

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for code-diff preview
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-099 — QSR / Cafe Quick Billing UX Optimization

#### What is wrong in plain English
For QSR/cafe outlets, the billing flow is too slow — staff must: (1) Place Order, (2) click Collect Bill to open the full payment panel, (3) scroll down to select payment method and complete payment. The owner wants:
- QSR mode gated by restaurant profile toggle
- In QSR mode, after Place Order, the "Collect Bill" button calls the Collect Bill API **inline** (at the order screen itself) with a simple payment method picker — no navigation to the full CollectPaymentPanel
- No loyalty/coupon/wallet/special discounts in QSR mode
- Existing full Collect Payment flow preserved for dine-in/room/split/tab/complex payments

#### What I will change

**Part 1 — QSR Quick Billing (CartPanel / OrderEntry):**

1. **`profileTransform.js`** — Add `qsrMode: api.qsr_mode === true || api.qsr_mode === 'Yes'` to the restaurant transform. This reads the QSR mode toggle from the profile. If the backend doesn't have this field yet, it defaults to `false`.

2. **`RestaurantContext.jsx`** — No change needed; `restaurant.qsrMode` will be available automatically through the existing `setRestaurant` flow.

3. **`CartPanel.jsx`** — For QSR mode (when `restaurant.qsrMode === true`):
   - After Place Order succeeds and order is placed (has `placedOrderId`), instead of showing just "Collect Bill" button that navigates to full payment panel, show an **inline QSR payment section** below the cart:
     - Payment method pills (Cash / Card / UPI — from restaurant's enabled payment types)
     - A "Pay & Complete" button that calls the Collect Bill API directly
   - The "Collect Bill" button text changes to show the flow is inline
   - Fresh orders (no placed items yet): Place Order button works normally; QSR quick billing activates AFTER the order is placed

4. **`OrderEntry.jsx`** — Add the QSR collect bill handler:
   - When QSR payment is triggered: build `collectBillExisting` payload with selected payment method, call `BILL_PAYMENT` API endpoint, handle success/failure
   - Reuse existing `collectBillExisting` transform (no new payload builder needed)
   - On success: auto-print if enabled, redirect to dashboard or stay (per existing toggle)
   - No loyalty/coupon/wallet in QSR mode — stripped from payment data

**Part 2 — Compact Collect Payment (CollectPaymentPanel):**

5. **`CollectPaymentPanel.jsx`** — CSS/spacing compactness:
   - Reduce font sizes in bill summary rows
   - Tighter padding/margins on adjustment controls
   - More compact payment method layout
   - Goal: payment methods visible without scrolling
   - **No functional changes** — only visual compactness

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `api/transforms/profileTransform.js` | Add `qsrMode` field extraction | Read QSR toggle from profile |
| `components/order-entry/CartPanel.jsx` | Add inline QSR payment method picker section | QSR quick billing UI |
| `components/order-entry/OrderEntry.jsx` | Add QSR collect bill handler function | QSR payment API call |
| `components/order-entry/CollectPaymentPanel.jsx` | CSS/spacing compactness (Part 2) | Compact layout for non-QSR |

#### Code area / function / component
- `fromAPI.restaurant()` in `profileTransform.js` (~L105)
- Bottom action buttons section in `CartPanel.jsx` (~L843-898)
- Payment handler section in `OrderEntry.jsx` (~L1599-1700)
- Layout/spacing throughout `CollectPaymentPanel.jsx`

#### What I will NOT touch
- Existing full Collect Payment functionality (dine-in, room, split, tab, partial)
- Financial calculation accuracy (totals, tax, SC, round-off)
- Print payload builders
- Payment status semantics (`'paid'`, `'sucess'`, `'success'`)
- `placeOrderWithPayment` transform (not used for QSR — we use 2-step: Place → Collect Bill)
- Room billing/print behavior
- Socket handlers

#### Business rule protected
- PAY-001: Place unpaid order payload shape — preserved (QSR first places unpaid, then collects)
- PAY-004: Settle postpaid flow — QSR reuses `collectBillExisting` which follows same rules
- PAY-007: PayLater misspelled `'sucess'` — not relevant (QSR is immediate payment)
- ARCHITECTURE Rule API-03: OrderEntry for composition, CollectPaymentPanel for settlement — QSR extends OrderEntry for quick settlement but full flow still uses CollectPaymentPanel
- MODULE_DECISIONS Rule FA-03: Don't expand hotspot files casually — QSR adds minimal code to CartPanel (not a hotspot); compact CSS changes to CollectPaymentPanel

#### Risk
**Medium-High** — Touches 3 architecture hotspot files (OrderEntry, CollectPaymentPanel, CartPanel). However:
- Part 2 (compact layout) is CSS-only → low functional risk
- Part 1 (QSR billing) reuses existing `collectBillExisting` payload and `BILL_PAYMENT` endpoint → no new financial logic
- QSR mode is gated behind a profile toggle → disabled by default, no impact on existing restaurants
- The 2-step flow (Place → Collect inline) is safer than 1-step because it reuses proven paths

**Key risk mitigation:** QSR mode defaults to `false`. Existing restaurants see zero change. Only restaurants that explicitly enable QSR mode get the new flow.

#### QA check after implementation
1. Non-QSR restaurant: full Collect Payment flow works unchanged
2. QSR mode enabled: after Place Order, inline payment picker appears
3. QSR: select Cash → Pay & Complete → order settled, dashboard updated
4. QSR: select Card → Pay & Complete → order settled
5. QSR: select UPI → Pay & Complete → order settled
6. QSR: financial totals match between quick billing and full flow
7. QSR: auto-print bill works if enabled
8. QSR: split bill / partial payment routes to full flow (not QSR)
9. Compact layout: payment methods visible without scrolling in full flow
10. Room / dine-in / tab flows unaffected

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for code-diff preview
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

## 6. Recommended Implementation Order

1. **BUG-098** (Small) — foundational; changes CRM key sourcing that BUG-106's CRM data depends on
2. **BUG-106** (Medium) — builds on CRM layer after BUG-098
3. **BUG-099** (Large) — independent, can run in parallel but recommended last due to size/risk

---

## 7. Approval Summary

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-098 | Yes — approach + diff preview | pending |
| BUG-106 | Yes — approach + diff preview | pending |
| BUG-099 | Yes — approach + diff preview | pending |

---

## 8. Final Status

**owner_approval_plan_created_pending_approval**

| Metric | Value |
|---|---|
| Bugs in scope | 3 |
| Files to modify | 8 |
| Code changed | **NO** |
| `/app/memory/final/` updated | **NO** |
| Baseline docs updated | **NO** |
| QA run | **NO** |

---

*— POS3.0 CR Wave 1 Owner Approval Plan — 2026-05-18 —*
